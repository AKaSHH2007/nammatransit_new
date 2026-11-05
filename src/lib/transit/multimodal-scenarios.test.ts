import { describe, it, expect } from "vitest";
import { planMultimodalJourneys, calculateJourneyHighlights } from "./multimodal-planner";
import { extractModePreferences } from "./datetime-utils";
import { respond } from "./engine";

describe("GTFS-grounded journey planning scenarios", () => {
  it("returns scheduled Metro alternatives for Guindy to Chennai Airport", async () => {
    const options = await planMultimodalJourneys("Guindy", "Chennai Airport");
    expect(options.length).toBeGreaterThan(0);

    const metro = options.find((option) => option.modes.includes("metro"));
    expect(metro).toBeDefined();
    expect(metro?.legs[0]?.boardStation?.toLowerCase()).toContain("guindy");
    expect(metro?.legs[0]?.alightStation?.toLowerCase()).toContain("airport");
    expect(metro?.departureTime).toBeTruthy();
    expect(metro?.arrivalTime).toBeTruthy();
    expect(metro?.scheduleSource).toBe("Static GTFS schedule");
  });

  it("returns the Yellow Line route for Poonamallee Bypass to Vadapalani", async () => {
    const options = await planMultimodalJourneys("Poonamallee Bypass", "Vadapalani");
    const yellow = options.find((option) => option.legs.some((leg) => leg.lineName.includes("Yellow")));

    expect(yellow).toBeDefined();
    expect(yellow?.legs[0]?.boardStation).toBe("Poonamallee Bypass");
    expect(yellow?.legs[0]?.alightStation).toBe("Vadapalani");
    expect(yellow?.scheduleSource).toBe("Timetable unavailable");
    expect(yellow?.fare).toBe(0);
  });

  it("keeps Metro preference separate from a Metro-only constraint", async () => {
    const preferred = extractModePreferences("I have to travel by metro from Guindy to Airport");
    expect(preferred.preferredMode).toBe("metro");
    expect(preferred.modeConstraint).toBeUndefined();

    const metroOnly = extractModePreferences("Travel by metro only from Guindy to Airport");
    expect(metroOnly.modeConstraint).toBe("metro");

    const options = await planMultimodalJourneys(
      "Guindy",
      "Chennai Airport",
      undefined,
      undefined,
      metroOnly.preferredMode,
      metroOnly.modeConstraint,
    );
    expect(options.length).toBeGreaterThan(0);
    expect(options.every((option) => option.modes.every((mode) => mode === "metro" || mode === "walk"))).toBe(true);
  });

  it("does not invent a connecting bus or rail leg when no direct GTFS trip exists", async () => {
    const options = await planMultimodalJourneys("T. Nagar", "Chennai Airport");
    for (const option of options) {
      if (option.id.startsWith("gtfs-")) {
        expect(option.departureTime).toBeTruthy();
        expect(option.arrivalTime).toBeTruthy();
        expect(option.legs.length).toBe(1);
        expect(option.legs[0]?.intermediateStops.length).toBeGreaterThan(1);
      } else {
        expect(option.id).toBe("yellow-line-route-no-timetable");
      }
    }
  });

  it("does not rank unavailable fares as the cheapest option", () => {
    const options = [
      {
        id: "unknown", title: "Yellow route", description: "No fare", durationMinutes: 20,
        fare: 0, transferCount: 0, walkingDistanceMeters: 0, totalStops: 5,
        departureTime: "", arrivalTime: "", modes: ["metro" as const], legs: [],
        highlights: [], fareBreakdown: [], scheduleSource: "Timetable unavailable" as const,
        isLiveTracking: false as const,
      },
      {
        id: "verified", title: "Metro trip", description: "Verified fare", durationMinutes: 25,
        fare: 30, transferCount: 0, walkingDistanceMeters: 0, totalStops: 5,
        departureTime: "08:00:00", arrivalTime: "08:25:00", modes: ["metro" as const], legs: [],
        highlights: [], fareBreakdown: [], scheduleSource: "Static GTFS schedule" as const,
        isLiveTracking: false as const,
      },
    ];

    const ranked = calculateJourneyHighlights(options);
    expect(ranked.find((option) => option.id === "verified")?.highlights).toContain("cheapest");
    expect(ranked.find((option) => option.id === "unknown")?.highlights).not.toContain("cheapest");
  });

  it("rejects journeys where the origin and destination are identical", async () => {
    await expect(planMultimodalJourneys("Guindy", "Guindy")).resolves.toEqual([]);
    const result = respond("Travel from Guindy to Guindy");
    expect(result.reply).toContain("cannot be the same");
    expect(result.cards).toHaveLength(0);
  });

  it("does not claim a route between unsupported locations", async () => {
    await expect(planMultimodalJourneys("Atlantis", "Narnia")).resolves.toEqual([]);
    const result = respond("How do I go to Atlantis from Narnia?");
    expect(result.cards).toHaveLength(0);
  });
});

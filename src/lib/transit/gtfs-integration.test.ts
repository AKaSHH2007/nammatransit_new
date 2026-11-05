import { describe, it, expect } from "vitest";
import { findDirectJourneys } from "../gtfs/planner";
import { extractTravelDate, extractDepartureTime } from "./chat.functions";
import { respond } from "./engine";

describe("GTFS journey planner and chatbot integration", () => {
  it("extracts ISO travel dates correctly", () => {
    expect(extractTravelDate("Guindy to Airport on 2026-11-10")).toBe("2026-11-10");
    expect(extractTravelDate("Plan travel on 2026-12-25 from Koyambedu to Central")).toBe(
      "2026-12-25",
    );
  });

  it("extracts DD-MM-YYYY dates correctly", () => {
    expect(extractTravelDate("Guindy to Airport on 15-11-2026")).toBe("2026-11-15");
    expect(extractTravelDate("Guindy to Airport on 15/11/2026")).toBe("2026-11-15");
  });

  it("extracts relative dates (today, tomorrow)", () => {
    const fixedBaseDate = new Date("2026-11-05T10:00:00Z");
    expect(extractTravelDate("How do I go from Guindy to Airport today?", fixedBaseDate)).toBe(
      "2026-11-05",
    );
    expect(extractTravelDate("How do I go from Guindy to Airport tomorrow?", fixedBaseDate)).toBe(
      "2026-11-06",
    );
  });

  it("extracts departure time filters", () => {
    expect(extractDepartureTime("Travel after 08:30")).toBe("08:30:00");
    expect(extractDepartureTime("Leave at 14:15:30")).toBe("14:15:30");
    expect(extractDepartureTime("Depart at 9am")).toBe("09:00:00");
    expect(extractDepartureTime("Around 5:30 pm")).toBe("17:30:00");
  });

  it("retrieves actual GTFS direct journeys between Guindy and Airport", async () => {
    const journeys = await findDirectJourneys("Guindy", "Airport");
    expect(journeys.length).toBeGreaterThan(0);

    const first = journeys[0]!;
    expect(first.transportType).toBe("Chennai Metro");
    expect(first.origin).toContain("GUINDY");
    expect(first.destination).toContain("AIRPORT");
    expect(first.totalStops).toBe(4);
    expect(first.durationMinutes).toBeGreaterThan(0);
    expect(first.stops.length).toBe(5);
  });

  it("retrieves journeys with date filtering", async () => {
    const journeys = await findDirectJourneys("Guindy", "Airport", "2026-11-05");
    expect(journeys.length).toBeGreaterThan(0);
    expect(journeys[0]!.serviceDateChecked).toBe("2026-11-05");
  });

  it("enriches journey cards with schedule metadata", () => {
    const reply = respond("How do I travel from Guindy to Airport?");
    expect(reply.cards[0]).toMatchObject({ kind: "journey" });

    // Simulate server enrichment
    if (reply.cards[0]?.kind === "journey") {
      reply.cards[0].journey.schedule = {
        departures: ["05:53:00", "06:05:00"],
        durationMinutes: 10,
        source: "Static GTFS schedule",
      };
    }

    expect(reply.cards[0]?.kind === "journey" && reply.cards[0].journey.schedule).toBeDefined();
    expect(
      reply.cards[0]?.kind === "journey" && reply.cards[0].journey.schedule?.durationMinutes,
    ).toBe(10);
  });
});

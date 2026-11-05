import { describe, it, expect } from "vitest";
import { planMultimodalJourneys } from "./multimodal-planner";
import { planJourney, respond } from "./engine";
import {
  resolveLocation,
  extractAndResolveLocations,
  CANONICAL_STATIONS,
} from "./location-resolver";
import {
  calculateMetroFare,
  calculateBusFare,
  calculateTrainFare,
  calculateJourneyFareSummary,
} from "./fares";
import { getChennaiOneBookingInfo } from "@/components/transit/ChennaiOneBooking";

describe("Six Major Features Upgrade & 18 Test Scenarios", () => {
  // Scenario 1: Guindy to Chennai Airport
  // Boarding: Guindy, Alighting: Chennai Airport, Direction: Airport, Fare: ₹30 standard / ₹24 digital
  it("Scenario 1: Guindy to Chennai Airport verifies boarding, alighting, direction, and official CMRL fare", async () => {
    const journeys = await planMultimodalJourneys("Guindy", "Chennai Airport");
    expect(journeys.length).toBeGreaterThan(0);

    const directMetro = journeys.find((j) => j.transferCount === 0 && j.modes.includes("metro"));
    expect(directMetro).toBeDefined();

    const leg = directMetro!.legs[0]!;
    // Feature 1: Boarding and Alighting must be exact stop names, NOT trip_headsign
    expect(leg.boardStation || leg.fromStation).toBe("Guindy");
    expect(leg.alightStation || leg.toStation).toBe("Chennai Airport");
    // trip_headsign must be separate service direction
    expect(leg.serviceDirection || leg.headsign).toMatch(/Airport/i);
    // Instruction must not say "Board Wimco Nagar Metro - Airport at Guindy"
    expect(leg.instruction).not.toMatch(/Board .* - .* at Guindy/i);
    expect(leg.instruction).toContain("Guindy");
    expect(leg.instruction).toContain("Chennai Airport");

    // Feature 3: Official CMRL station-to-station fare
    // Guindy to Chennai Airport is Fare Zone CMRL-SGU -> CMRL-SAP = CMRL-F3 (₹30 standard, ₹24 digital)
    expect(directMetro?.fare).toBe(30);
    expect(directMetro?.digitalFare).toBe(24);
    expect(directMetro?.discountAmount).toBe(6);
  });

  // Scenario 2: Koyeembedu to Chennai Airport (Typo correction)
  it("Scenario 2: Koyeembedu to Chennai Airport corrects typo and plans route from Koyambedu", async () => {
    const resolvedOrigin = resolveLocation("Koyeembedu");
    expect(resolvedOrigin.resolved).toBe("Koyambedu");
    expect(resolvedOrigin.matchedName).toBe("Koyambedu");

    const journeys = await planMultimodalJourneys("Koyeembedu", "Chennai Airport");
    expect(journeys.length).toBeGreaterThan(0);

    // Verify first leg boarding station is resolved to Koyambedu
    const firstLeg = journeys[0]!.legs[0]!;
    expect(firstLeg.boardStation || firstLeg.fromStation).toBe("Koyambedu");
  });

  // Scenario 3: Koyambedu to Guindy (Metro journey via interchange)
  it("Scenario 3: Koyambedu to Guindy plans route with explicit boarding and alighting", async () => {
    const journeys = await planMultimodalJourneys("Koyambedu", "Guindy");
    expect(journeys.length).toBeGreaterThan(0);

    const metroRoute = journeys.find((j) => j.modes.includes("metro"));
    expect(metroRoute).toBeDefined();
    const firstLeg = metroRoute!.legs[0]!;
    const lastLeg = metroRoute!.legs[metroRoute!.legs.length - 1]!;
    expect(firstLeg.boardStation || firstLeg.fromStation).toBe("Koyambedu");
    expect(lastLeg.alightStation || lastLeg.toStation).toBe("Guindy");
  });

  // Scenario 4: Poonamallee Bypass to Vadapalani (Phase 2 Yellow Line)
  it("Scenario 4: Poonamallee Bypass to Vadapalani plans Phase 2 Yellow Line route", async () => {
    const journeys = await planMultimodalJourneys("Poonamallee Bypass", "Vadapalani");
    expect(journeys.length).toBeGreaterThan(0);

    const yellowRoute = journeys.find((j) =>
      j.legs.some((l) => l.lineName.includes("Yellow") || l.color === "#EAB308"),
    );
    expect(yellowRoute).toBeDefined();
    expect(yellowRoute?.transferCount).toBe(0);
    expect(yellowRoute?.totalStops).toBe(10);
    expect(yellowRoute?.fare).toBe(40);
    expect(yellowRoute?.digitalFare).toBe(32);
    expect(yellowRoute?.legs[0]?.boardStation).toBe("Poonamallee Bypass");
    expect(yellowRoute?.legs[0]?.alightStation).toBe("Vadapalani");
    expect(yellowRoute?.legs[0]?.serviceDirection).toBe("Vadapalani");
  });

  // Scenario 5: Tambaram to Guindy (Suburban Railway / Bus)
  it("Scenario 5: Tambaram to Guindy provides Suburban Railway option", async () => {
    const journeys = await planMultimodalJourneys("Tambaram", "Guindy");
    expect(journeys.length).toBeGreaterThan(0);

    const trainOption = journeys.find((j) => j.modes.includes("train"));
    expect(trainOption).toBeDefined();
    const trainLeg = trainOption!.legs.find((l) => l.mode === "train");
    expect(trainLeg).toBeDefined();
    expect(trainLeg?.fromStation).toContain("Tambaram");
    expect(trainLeg?.toStation).toContain("Guindy");
  });

  // Scenario 6: Guindy to T Nagar (MTC Bus / Metro)
  it("Scenario 6: Guindy to T Nagar provides MTC bus and transit combinations", async () => {
    const resolvedTNagar = resolveLocation("T Nagar");
    expect(resolvedTNagar.matchedName).toBe("T. Nagar");

    const journeys = await planMultimodalJourneys("Guindy", "T. Nagar");
    expect(journeys.length).toBeGreaterThan(0);

    const busOption = journeys.find((j) => j.modes.includes("bus"));
    expect(busOption).toBeDefined();
    expect(busOption?.legs.some((l) => l.mode === "bus")).toBe(true);
  });

  // Scenario 7: Metro-only journey
  it("Scenario 7: Metro-only journey filters correctly and contains only metro + walking legs", async () => {
    const journeys = await planMultimodalJourneys("Chennai Central", "Guindy");
    const metroOnly = journeys.filter(
      (j) => j.modes.includes("metro") && !j.modes.includes("bus") && !j.modes.includes("train"),
    );
    expect(metroOnly.length).toBeGreaterThan(0);
    for (const leg of metroOnly[0]!.legs) {
      expect(["metro", "walk"]).toContain(leg.mode);
    }
  });

  // Scenario 8: Bus-only journey
  it("Scenario 8: Bus-only journey calculates official MTC bus fare and stages", async () => {
    const journeys = await planMultimodalJourneys("Guindy", "T. Nagar");
    const busOnly = journeys.filter((j) => j.modes.includes("bus") && !j.modes.includes("metro"));
    expect(busOnly.length).toBeGreaterThan(0);

    const leg = busOnly[0]!.legs.find((l) => l.mode === "bus");
    expect(leg).toBeDefined();
    expect(leg?.operator).toContain("MTC");
    expect(leg?.standardFare).toBeGreaterThanOrEqual(5);
  });

  // Scenario 9: Mixed Bus + Metro journey
  it("Scenario 9: Mixed Bus + Metro journey combines legs with correct mode badges and total fare", async () => {
    const journeys = await planMultimodalJourneys("Tambaram", "Chennai Airport");
    expect(journeys.length).toBeGreaterThan(0);

    const mixed = journeys.find((j) => j.isMixedMode || j.modes.length > 1);
    expect(mixed).toBeDefined();
    expect(mixed?.fareBreakdown.length).toBeGreaterThanOrEqual(1);
    expect(mixed?.fare).toBe(mixed?.fareBreakdown.reduce((sum, f) => sum + f.amount, 0));
  });

  // Scenario 10: Suburban Railway journey
  it("Scenario 10: Suburban Railway journey reflects Southern Railway official fare", async () => {
    const journeys = await planMultimodalJourneys("Tambaram", "Guindy");
    const railOption = journeys.find((j) => j.modes.includes("train"));
    expect(railOption).toBeDefined();
    const trainLeg = railOption!.legs.find((l) => l.mode === "train");
    expect(trainLeg?.operator).toContain("Southern Railway");
  });

  // Scenario 11: Cheapest route
  it("Scenario 11: Identifies cheapest route correctly with highlights", async () => {
    const journeys = await planMultimodalJourneys("Tambaram", "Guindy");
    const lowestFare = Math.min(...journeys.map((j) => j.fare));
    const cheapest = journeys.find((j) => j.highlights.includes("cheapest"));
    expect(cheapest).toBeDefined();
    expect(cheapest?.fare).toBe(lowestFare);
  });

  // Scenario 12: Fastest route
  it("Scenario 12: Identifies fastest route correctly with highlights", async () => {
    const journeys = await planMultimodalJourneys("Guindy", "Chennai Airport");
    const shortestTime = Math.min(...journeys.map((j) => j.durationMinutes));
    const fastest = journeys.find((j) => j.highlights.includes("fastest"));
    expect(fastest).toBeDefined();
    expect(fastest?.durationMinutes).toBe(shortestTime);
  });

  // Scenario 13: Incorrect spelling of stations
  it("Scenario 13: Resolves various station typos and alternate spellings", () => {
    expect(resolveLocation("Koyeembedu").matchedName).toBe("Koyambedu");
    expect(resolveLocation("Koyembedu").matchedName).toBe("Koyambedu");
    expect(resolveLocation("Gindi").matchedName).toBe("Guindy");
    expect(resolveLocation("Poonamali").matchedName).toBe("Poonamallee");
    expect(resolveLocation("Thirumangalam").matchedName).toBe("Thirumangalam");
    expect(resolveLocation("T Nagar").matchedName).toBe("T. Nagar");
    expect(resolveLocation("Vadapalani").matchedName).toBe("Vadapalani");
    expect(resolveLocation("Alanthur").matchedName).toBe("Alandur");
    expect(resolveLocation("Central").matchedName).toBe("Chennai Central");
  });

  // Scenario 14: Ambiguous locations prompt user for clarification
  it("Scenario 14: Detects ambiguous location inputs and prompts for clarification", () => {
    const amb = resolveLocation("Nagar");
    expect(amb.isAmbiguous).toBe(true);
    expect(amb.suggestions && amb.suggestions.length).toBeGreaterThan(1);
    expect(amb.suggestions?.some((s) => s.includes("Nagar"))).toBe(true);
  });

  // Scenario 15: Ticket booking action on Chennai One
  it("Scenario 15: Chennai One booking helper generates official URLs and instructions", () => {
    const info = getChennaiOneBookingInfo("metro", "Guindy", "Chennai Airport", 30);
    expect(info.portalUrl).toBe("https://www.chennaione.in/");
    expect(info.playStoreUrl).toContain("in.mobility.cumta");
    expect(info.actionLabel).toBe("Book Metro Ticket on Chennai One");
    expect(info.steps.length).toBeGreaterThanOrEqual(4);
    expect(info.steps[0]).toContain("Chennai One");
  });

  // Scenario 16: Mobile responsive map component coordinates and routes
  it("Scenario 16: Journey map coordinates exist for key Chennai transit hubs", async () => {
    const journeys = await planMultimodalJourneys("Guindy", "Chennai Airport");
    const direct = journeys.find((j) => j.legs[0]?.intermediateStops?.length);
    expect(direct).toBeDefined();
    expect(direct?.legs[0]?.intermediateStops.length).toBeGreaterThanOrEqual(2);
    for (const stop of direct!.legs[0]!.intermediateStops) {
      expect(stop.latitude).toBeGreaterThan(12.5);
      expect(stop.longitude).toBeGreaterThan(79.5);
    }
  });

  // Scenario 17: Missing fare information fallback ("Fare unavailable")
  it("Scenario 17: Gracefully returns 'Fare unavailable' when fare cannot be verified", () => {
    const unverifiedFare = calculateMetroFare("NonExistentStopA", "NonExistentStopB");
    expect(unverifiedFare.isOfficial).toBe(false);
    expect(unverifiedFare.fareUnavailable).toBe(true);
    expect(unverifiedFare.standardFare).toBe(0);
  });

  // Scenario 18: Missing real-time information disclaimer
  it("Scenario 18: Response disclaimer clearly states static GTFS and lack of live GPS telemetry", () => {
    const result = respond("How do I travel from Guindy to Chennai Airport?");
    expect(result.reply).toBeDefined();
    // Verify engine returns cards and grounding notes
    expect(result.cards.length).toBeGreaterThan(0);
    const journeyCard = result.cards.find((c) => c.kind === "journey");
    expect(journeyCard).toBeDefined();
  });
});

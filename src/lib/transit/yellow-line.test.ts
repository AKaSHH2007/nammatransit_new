import { describe, it, expect } from "vitest";
import { planMultimodalJourneys } from "./multimodal-planner";
import { planJourney } from "./engine";
import {
  YELLOW_LINE_STATIONS,
  getYellowLineTripDetails,
  getYellowLineHeadwayMinutes,
} from "./yellow-line.data";

describe("Chennai Metro Phase 2 Yellow Line (Corridor 4) Integration", () => {
  it("validates Yellow Line supplemental dataset configuration", () => {
    expect(YELLOW_LINE_STATIONS.length).toBe(11);
    expect(YELLOW_LINE_STATIONS[0]!.name).toBe("Poonamallee Bypass");
    expect(YELLOW_LINE_STATIONS[10]!.name).toBe("Vadapalani");
    expect(YELLOW_LINE_STATIONS[10]!.interchange).toBe("Green Line");

    // Headway verification
    expect(getYellowLineHeadwayMinutes("08:30:00", false)).toBe(10); // Peak morning
    expect(getYellowLineHeadwayMinutes("18:15:00", false)).toBe(10); // Peak evening
    expect(getYellowLineHeadwayMinutes("14:00:00", false)).toBe(15); // Non-peak weekday
    expect(getYellowLineHeadwayMinutes("09:00:00", true)).toBe(15); // Sunday
  });

  // Test 1: Poonamallee Bypass to Vadapalani
  it("plans direct Yellow Line route: Poonamallee Bypass to Vadapalani", async () => {
    const journeys = await planMultimodalJourneys("Poonamallee Bypass", "Vadapalani");
    expect(journeys.length).toBeGreaterThan(0);

    const directYellow = journeys.find(
      (j) =>
        j.transferCount === 0 &&
        j.modes.includes("metro") &&
        j.legs.some((l) => l.lineName.includes("Yellow") || l.color === "#EAB308"),
    );

    expect(directYellow).toBeDefined();
    expect(directYellow?.totalStops).toBe(10);
    expect(directYellow?.durationMinutes).toBeGreaterThanOrEqual(18);
    expect(directYellow?.durationMinutes).toBeLessThanOrEqual(26);
    expect(directYellow?.fare).toBe(40);
    expect(directYellow?.legs[0]?.fromStation).toBe("Poonamallee Bypass");
    expect(directYellow?.legs[0]?.toStation).toBe("Vadapalani");
    expect(directYellow?.legs[0]?.color).toBe("#EAB308");
  });

  // Test 2: Poonamallee Bypass to Porur Junction
  it("plans direct Yellow Line route: Poonamallee Bypass to Porur Junction", async () => {
    const journeys = await planMultimodalJourneys("Poonamallee Bypass", "Porur Junction");
    expect(journeys.length).toBeGreaterThan(0);

    const yellowOption = journeys.find((j) =>
      j.legs.some((l) => l.lineName.includes("Yellow") || l.color === "#EAB308"),
    );

    expect(yellowOption).toBeDefined();
    expect(yellowOption?.transferCount).toBe(0);
    expect(yellowOption?.totalStops).toBe(9);
    expect(yellowOption?.durationMinutes).toBeGreaterThanOrEqual(16);
    expect(yellowOption?.durationMinutes).toBeLessThanOrEqual(24);
    expect(yellowOption?.fare).toBe(40);
  });

  // Test 3: Kattupakkam to Vadapalani
  it("plans direct Yellow Line route: Kattupakkam to Vadapalani", async () => {
    const journeys = await planMultimodalJourneys("Kattupakkam", "Vadapalani");
    expect(journeys.length).toBeGreaterThan(0);

    const yellowOption = journeys.find((j) =>
      j.legs.some((l) => l.lineName.includes("Yellow") || l.color === "#EAB308"),
    );

    expect(yellowOption).toBeDefined();
    expect(yellowOption?.transferCount).toBe(0);
    expect(yellowOption?.totalStops).toBe(5);
    expect(yellowOption?.durationMinutes).toBeGreaterThanOrEqual(10);
    expect(yellowOption?.durationMinutes).toBeLessThanOrEqual(14);
    expect(yellowOption?.fare).toBe(20);
  });

  // Test 4: Iyappanthangal to Vadapalani
  it("plans direct Yellow Line route: Iyappanthangal to Vadapalani", async () => {
    const journeys = await planMultimodalJourneys("Iyappanthangal", "Vadapalani");
    expect(journeys.length).toBeGreaterThan(0);

    const yellowOption = journeys.find((j) =>
      j.legs.some((l) => l.lineName.includes("Yellow") || l.color === "#EAB308"),
    );

    expect(yellowOption).toBeDefined();
    expect(yellowOption?.transferCount).toBe(0);
    expect(yellowOption?.totalStops).toBe(4);
    expect(yellowOption?.durationMinutes).toBeGreaterThanOrEqual(8);
    expect(yellowOption?.durationMinutes).toBeLessThanOrEqual(12);
    expect(yellowOption?.fare).toBe(20);
  });

  // Test 5: Poonamallee Bypass to Guindy
  it("plans multimodal and Metro routes from Poonamallee Bypass to Guindy via Vadapalani interchange", async () => {
    const journeys = await planMultimodalJourneys("Poonamallee Bypass", "Guindy");
    expect(journeys.length).toBeGreaterThanOrEqual(2);

    // Should include Metro route connecting Yellow -> Green -> Blue via Vadapalani & Alandur
    const metroChain = journeys.find((j) =>
      j.legs.some((l) => l.lineName.includes("Yellow") || l.color === "#EAB308"),
    );
    expect(metroChain).toBeDefined();

    // Check planJourney multi-interchange structure
    const enginePlan = planJourney("Poonamallee Bypass", "Guindy");
    expect(enginePlan).toBeDefined();
    expect(enginePlan?.legs.length).toBe(3);
    expect(enginePlan?.legs[0]?.lineId).toBe("yellow");
    expect(enginePlan?.legs[1]?.lineId).toBe("green");
    expect(enginePlan?.legs[2]?.lineId).toBe("blue");
    expect(enginePlan?.interchange).toContain("Vadapalani");
    expect(enginePlan?.interchange).toContain("Alandur");
  });

  // Test 6: Poonamallee Bypass to Chennai Airport
  it("plans full cross-network route from Poonamallee Bypass to Chennai Airport", async () => {
    const journeys = await planMultimodalJourneys("Poonamallee Bypass", "Chennai Airport");
    expect(journeys.length).toBeGreaterThan(0);

    const airportRoute = journeys.find((j) =>
      j.legs.some((l) => l.lineName.includes("Yellow") || l.color === "#EAB308"),
    );
    expect(airportRoute).toBeDefined();

    const enginePlan = planJourney("Poonamallee Bypass", "Chennai Airport");
    expect(enginePlan).toBeDefined();
    expect(enginePlan?.legs[0]?.lineId).toBe("yellow");
    expect(enginePlan?.legs[1]?.lineId).toBe("green");
    expect(enginePlan?.legs[2]?.lineId).toBe("blue");
    expect(enginePlan?.legs[2]?.to).toBe("Chennai Airport");
  });

  // Test 7: Vadapalani to Poonamallee Bypass (Reverse Direction)
  it("plans direct Yellow Line in reverse direction: Vadapalani to Poonamallee Bypass", async () => {
    const journeys = await planMultimodalJourneys("Vadapalani", "Poonamallee Bypass");
    expect(journeys.length).toBeGreaterThan(0);

    const reverseYellow = journeys.find((j) =>
      j.legs.some((l) => l.lineName.includes("Yellow") || l.color === "#EAB308"),
    );

    expect(reverseYellow).toBeDefined();
    expect(reverseYellow?.transferCount).toBe(0);
    expect(reverseYellow?.totalStops).toBe(10);
    expect(reverseYellow?.legs[0]?.fromStation).toBe("Vadapalani");
    expect(reverseYellow?.legs[0]?.toStation).toBe("Poonamallee Bypass");
    expect(reverseYellow?.fare).toBe(40);

    // Verify reverse trip details
    const tripDetails = getYellowLineTripDetails("Vadapalani", "Poonamallee Bypass");
    expect(tripDetails?.direction).toBe("Towards Poonamallee Bypass");
    expect(tripDetails?.stops[0]!.name).toBe("Vadapalani");
    expect(tripDetails?.stops[tripDetails.stops.length - 1]!.name).toBe("Poonamallee Bypass");
  });

  // Test 8: Verify existing Blue Line and Green Line journeys still function flawlessly
  it("preserves existing Blue Line and Green Line functionality without regression", async () => {
    // Blue Line direct
    const blueJourneys = await planMultimodalJourneys("Guindy", "Chennai Airport");
    expect(blueJourneys.length).toBeGreaterThan(0);
    const blueDirect = blueJourneys.find((j) => j.transferCount === 0 && j.modes.includes("metro"));
    expect(blueDirect).toBeDefined();
    expect(blueDirect?.legs[0]?.color).toBe("#2563EB");

    // Green Line direct
    const greenPlan = planJourney("Chennai Central", "Koyambedu");
    expect(greenPlan).toBeDefined();
    expect(greenPlan?.legs.length).toBe(1);
    expect(greenPlan?.legs[0]?.lineId).toBe("green");
    expect(greenPlan?.legs[0]?.stops.length).toBeGreaterThan(5);

    // Blue to Green transfer at Alandur
    const transferPlan = planJourney("Airport", "Koyambedu");
    expect(transferPlan).toBeDefined();
    expect(transferPlan?.interchange).toBe("Alandur");
  });
});

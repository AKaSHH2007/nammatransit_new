import { describe, it, expect } from "vitest";
import { planMultimodalJourneys } from "./multimodal-planner";
import { planJourney } from "./engine";
import {
  YELLOW_LINE_STATIONS,
  getYellowLineTripDetails,
  getYellowLineHeadwayMinutes,
  getYellowLineServiceInfo,
} from "./yellow-line.data";

describe("Chennai Metro Yellow Line supplemental route", () => {
  it("contains the 11 configured station positions in sequence", () => {
    expect(YELLOW_LINE_STATIONS).toHaveLength(11);
    expect(YELLOW_LINE_STATIONS[0]?.name).toBe("Poonamallee Bypass");
    expect(YELLOW_LINE_STATIONS[10]?.name).toBe("Vadapalani");
    expect(YELLOW_LINE_STATIONS.map((station) => station.sequence)).toEqual(
      Array.from({ length: 11 }, (_, index) => index + 1),
    );
  });

  it("returns the correct forward and reverse station sequences", () => {
    const forward = getYellowLineTripDetails("Poonamallee Bypass", "Vadapalani");
    expect(forward?.stops).toHaveLength(11);
    expect(forward?.stops[0]?.name).toBe("Poonamallee Bypass");
    expect(forward?.stops.at(-1)?.name).toBe("Vadapalani");
    expect(forward?.hopCount).toBe(10);

    const reverse = getYellowLineTripDetails("Vadapalani", "Poonamallee Bypass");
    expect(reverse?.stops[0]?.name).toBe("Vadapalani");
    expect(reverse?.stops.at(-1)?.name).toBe("Poonamallee Bypass");
    expect(reverse?.direction).toBe("Towards Poonamallee Bypass");
  });

  it("keeps published headways distinct from individual train departure times", () => {
    expect(getYellowLineHeadwayMinutes("08:30:00", false)).toBe(10);
    expect(getYellowLineHeadwayMinutes("14:00:00", false)).toBe(15);
    expect(getYellowLineHeadwayMinutes("09:00:00", true)).toBe(15);

    const weekday = getYellowLineServiceInfo("2026-11-06");
    expect(weekday.operatingWindow).toBe("06:00–21:00");
    expect(weekday.frequencyText).toContain("every 10 minutes");
    expect(weekday.frequencyText).toContain("every 15 minutes");
    expect(weekday.isOperatingAtRequestedTime).toBeNull();
    expect(weekday.notice).toContain("Exact station-level departure times");

    const sunday = getYellowLineServiceInfo("2026-11-08", "09:00");
    expect(sunday.isOperatingAtRequestedTime).toBe(true);
    expect(sunday.frequencyText).toContain("Every 15 minutes");
  });

  it("marks times outside the published service window", () => {
    expect(getYellowLineServiceInfo("2026-11-06", "05:45").isOperatingAtRequestedTime).toBe(false);
    expect(getYellowLineServiceInfo("2026-11-06", "21:10").isOperatingAtRequestedTime).toBe(false);
  });

  it("returns a Yellow Line route without inventing a fare or exact departure", async () => {
    const journeys = await planMultimodalJourneys("Poonamallee Bypass", "Vadapalani");
    const yellow = journeys.find((option) => option.legs.some((leg) => leg.lineName.includes("Yellow")));

    expect(yellow).toBeDefined();
    expect(yellow?.transferCount).toBe(0);
    expect(yellow?.totalStops).toBe(10);
    expect(yellow?.fare).toBe(0);
    expect(yellow?.standardFare).toBeNull();
    expect(yellow?.departureTime).toBe("");
    expect(yellow?.arrivalTime).toBe("");
    expect(yellow?.scheduleSource).toBe("Timetable unavailable");
    expect(yellow?.legs[0]?.boardStation).toBe("Poonamallee Bypass");
    expect(yellow?.legs[0]?.alightStation).toBe("Vadapalani");
    expect(yellow?.legs[0]?.serviceFrequency).toContain("every 10 minutes");
  });

  it("supports the static Metro route graph for Yellow Line station pairs", () => {
    const journey = planJourney("Poonamallee Bypass", "Vadapalani");
    expect(journey).toBeDefined();
    expect(journey?.legs).toHaveLength(1);
    expect(journey?.legs[0]?.lineId).toBe("yellow");
  });

  it("does not fabricate a route for locations outside the supported network", async () => {
    await expect(planMultimodalJourneys("Atlantis", "Narnia")).resolves.toEqual([]);
  });
});

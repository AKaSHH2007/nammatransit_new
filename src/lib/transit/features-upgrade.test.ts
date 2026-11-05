import { describe, it, expect } from "vitest";
import { planMultimodalJourneys } from "./multimodal-planner";
import { resolveLocation, extractAndResolveLocations } from "./location-resolver";
import {
  calculateMetroFare,
  calculateBusFare,
  calculateTrainFare,
} from "./fares";
import { getChennaiOneBookingInfo } from "@/components/transit/ChennaiOneBooking";
import { findDirectJourneys } from "../gtfs/planner";

describe("NammaTransit grounded transit features", () => {
  it("resolves common Chennai spelling variants to canonical station names", () => {
    expect(resolveLocation("Koyeembedu").resolved).toBe("Koyambedu");
    expect(resolveLocation("Koyembedu").resolved).toBe("Koyambedu");
    expect(resolveLocation("Gindi").resolved).toBe("Guindy");
    expect(resolveLocation("Poonamali").resolved).toBe("Poonamallee Bus Stand");
    expect(resolveLocation("T Nagar").resolved).toBe("T. Nagar");
    expect(resolveLocation("Airport").resolved).toBe("Chennai Airport");
  });

  it("extracts both endpoints from natural-language journey queries", () => {
    const pair = extractAndResolveLocations("Show route from Poonamali to Vadapalani on Yellow Line");
    expect(pair.origin?.resolved).toBe("Poonamallee Bus Stand");
    expect(pair.destination?.resolved).toBe("Vadapalani");

    const bare = extractAndResolveLocations("Koyeembedu to Chennai Airport");
    expect(bare.origin?.resolved).toBe("Koyambedu");
    expect(bare.destination?.resolved).toBe("Chennai Airport");
  });

  it("uses a station-pair CMRL fare only when a configured fare matrix entry exists", () => {
    const fare = calculateMetroFare("Guindy", "Chennai Airport");
    expect(fare.isAvailable).toBe(true);
    expect(fare.standardFare).toBe(30);
    expect(fare.digitalFare).toBe(24);
    expect(fare.source).toContain("cmrl");
  });

  it("does not invent MTC or suburban fares from stop counts", () => {
    const busFare = calculateBusFare("Guindy", "T. Nagar", "21G", 12);
    expect(busFare.isAvailable).toBe(false);
    expect(busFare.fareUnavailable).toBe(true);
    expect(busFare.standardFare).toBeNull();

    const railFare = calculateTrainFare("Tambaram", "Guindy", 8);
    expect(railFare.isAvailable).toBe(false);
    expect(railFare.fareUnavailable).toBe(true);
    expect(railFare.standardFare).toBeNull();
  });

  it("returns the Yellow Line station route while marking exact times and fare unavailable", async () => {
    const options = await planMultimodalJourneys("Poonamallee Bypass", "Vadapalani");
    const yellow = options.find((option) => option.legs.some((leg) => leg.lineName.includes("Yellow")));

    expect(yellow).toBeDefined();
    expect(yellow?.totalStops).toBe(10);
    expect(yellow?.fare).toBe(0);
    expect(yellow?.scheduleSource).toBe("Timetable unavailable");
    expect(yellow?.departureTime).toBe("");
    expect(yellow?.arrivalTime).toBe("");
    expect(yellow?.legs[0]?.boardStation).toBe("Poonamallee Bypass");
    expect(yellow?.legs[0]?.alightStation).toBe("Vadapalani");
  });

  it("uses actual GTFS trip stops and scheduled times for Guindy to Airport", async () => {
    const trips = await findDirectJourneys("Guindy", "Airport");
    expect(trips.length).toBeGreaterThan(0);

    const metroTrip = trips.find((trip) => trip.transportType === "Chennai Metro");
    expect(metroTrip).toBeDefined();
    expect(metroTrip?.origin?.toLowerCase()).toContain("guindy");
    expect(metroTrip?.destination?.toLowerCase()).toContain("airport");
    expect(metroTrip?.departure).toMatch(/^\d{1,2}:\d{2}:\d{2}$/);
    expect(metroTrip?.arrival).toMatch(/^\d{1,2}:\d{2}:\d{2}$/);
    expect(metroTrip?.stops[0]?.stopId).toBeTruthy();
    expect(metroTrip?.stops[0]?.name).toBe(metroTrip?.origin);
    expect(metroTrip?.stops.at(-1)?.name).toBe(metroTrip?.destination);
  });

  it("returns direct GTFS journey options with matching boarding and alighting stops", async () => {
    const options = await planMultimodalJourneys("Guindy", "Chennai Airport");
    const metro = options.find((option) => option.modes.includes("metro"));

    expect(metro).toBeDefined();
    expect(metro?.legs[0]?.boardStation?.toLowerCase()).toContain("guindy");
    expect(metro?.legs[0]?.alightStation?.toLowerCase()).toContain("airport");
    expect(metro?.legs[0]?.instruction).toContain(metro?.legs[0]?.boardStation);
    expect(metro?.legs[0]?.instruction).toContain(metro?.legs[0]?.alightStation);
    expect(metro?.scheduleSource).toBe("Static GTFS schedule");
    expect(metro?.isLiveTracking).toBe(false);
  });

  it("does not mark unknown station-pair fares as free", () => {
    const fare = calculateMetroFare("Atlantis", "Narnia");
    expect(fare.isAvailable).toBe(false);
    expect(fare.fareUnavailable).toBe(true);
    expect(fare.standardFare).toBe(0);
  });

  it("provides the official Chennai One portal and app listing URLs", () => {
    const info = getChennaiOneBookingInfo("metro", "Guindy", "Chennai Airport", 30);
    expect(info.portalUrl).toBe("https://www.chennaione.in/");
    expect(info.playStoreUrl).toContain("in.mobility.cumta");
    expect(info.actionLabel).toBe("Book Metro Ticket on Chennai One");
    expect(info.steps.length).toBeGreaterThanOrEqual(4);
  });

  it("returns no options rather than fabricating a route outside Chennai", async () => {
    await expect(planMultimodalJourneys("Coimbatore", "Madurai")).resolves.toEqual([]);
  });
});

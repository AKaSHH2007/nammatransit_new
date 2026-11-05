import fs from "node:fs/promises";
import path from "node:path";
import { createReadStream, existsSync } from "node:fs";
import { parse as parseStream } from "csv-parse";
import { readGTFSFile } from "./reader.ts";
const DATA_DIR = path.resolve(process.cwd(), "data");

type Row = Record<string, string>;

type TripStop = {
  stopId: string;
  sequence: number;
  arrival: string;
  departure: string;
};

type PlannerIndex = {
  stops: Map<string, Row>;
  routes: Map<string, Row>;
  trips: Map<string, Row>;
  tripStops: Map<string, TripStop[]>;
  calendars: Map<string, Row>;
  exceptions: Map<string, Row>;
};

let plannerPromise: Promise<PlannerIndex> | undefined;

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toSeconds(time: string) {
  const [hours, minutes, seconds] = time.split(":").map(Number);

  return hours * 3600 + minutes * 60 + seconds;
}

function isServiceActive(serviceId: string, date: string, index: PlannerIndex) {
  const formattedDate = date.replace(/-/g, "");
  const exception = index.exceptions.get(`${serviceId}:${formattedDate}`);

  if (exception) {
    return exception.exception_type === "1";
  }

  const calendar = index.calendars.get(serviceId);

  if (!calendar) return false;

  if (formattedDate < calendar.start_date || formattedDate > calendar.end_date) {
    return false;
  }

  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();

  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  return calendar[days[weekday]!] === "1";
}

async function buildPlannerIndex(): Promise<PlannerIndex> {
  const [stopRows, routeRows, tripRows, calendarRows, exceptionRows] = await Promise.all([
    readGTFSFile("stops.txt"),
    readGTFSFile("routes.txt"),
    readGTFSFile("trips.txt"),
    readGTFSFile("calendar.txt"),
    readGTFSFile("calendar_dates.txt"),
  ]);

  const stops = new Map<string, Row>();
  const routes = new Map<string, Row>();
  const trips = new Map<string, Row>();
  const calendars = new Map<string, Row>();
  const exceptions = new Map<string, Row>();

  for (const row of stopRows) {
    stops.set(row.stop_id, row);
  }

  for (const row of routeRows) {
    routes.set(row.route_id, row);
  }

  for (const row of tripRows) {
    trips.set(row.trip_id, row);
  }

  for (const row of calendarRows) {
    calendars.set(row.service_id, row);
  }

  for (const row of exceptionRows) {
    exceptions.set(`${row.service_id}:${row.date}`, row);
  }

  const tripStops = new Map<string, TripStop[]>();
  const stopTimesPath = path.join(DATA_DIR, "stop_times.txt");

  if (existsSync(stopTimesPath)) {
    const parser = createReadStream(stopTimesPath).pipe(
      parseStream({
        columns: true,
        skip_empty_lines: true,
        bom: true,
        relax_column_count: true,
        trim: true,
      }),
    );

    for await (const row of parser) {
      const tripId = row.trip_id;

      if (!tripStops.has(tripId)) {
        tripStops.set(tripId, []);
      }

      tripStops.get(tripId)!.push({
        stopId: row.stop_id,
        sequence: Number(row.stop_sequence),
        arrival: row.arrival_time,
        departure: row.departure_time,
      });
    }

    for (const sequence of tripStops.values()) {
      sequence.sort((a, b) => a.sequence - b.sequence);
    }
  }

  return {
    stops,
    routes,
    trips,
    tripStops,
    calendars,
    exceptions,
  };
}

async function getPlannerIndex() {
  if (!plannerPromise) {
    plannerPromise = buildPlannerIndex().catch((error) => {
      plannerPromise = undefined;
      throw error;
    });
  }

  return plannerPromise;
}

export async function searchPlannerStops(query: string) {
  const index = await getPlannerIndex();
  const search = normalize(query);

  if (!search) return [];

  return [...index.stops.values()]
    .filter((stop) => normalize(stop.stop_name || "").includes(search))
    .slice(0, 20)
    .map((stop) => ({
      stopId: stop.stop_id,
      name: stop.stop_name,
      latitude: stop.stop_lat,
      longitude: stop.stop_lon,
    }));
}

export async function findDirectJourneys(
  originQuery: string,
  destinationQuery: string,
  serviceDate?: string,
  departureAfter?: string,
) {
  const index = await getPlannerIndex();

  const origin = normalize(originQuery);
  const destination = normalize(destinationQuery);

  if (!origin || !destination) return [];

  function getSearchTerms(q: string): string[] {
    const terms = [q];
    if (q.includes("airport")) terms.push("airport");
    if (q.includes("central")) terms.push("central");
    if (q.includes("koyambedu") || q.includes("cmbt")) terms.push("koyambedu", "cmbt");
    if (q.includes("tambaram")) terms.push("tambaram");
    if (q.includes("guindy")) terms.push("guindy");
    if (q.includes("egmore")) terms.push("egmore");
    if (q.includes("alandur")) terms.push("alandur");
    return terms;
  }

  const originTerms = getSearchTerms(origin);
  const destTerms = getSearchTerms(destination);

  if (serviceDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) {
      throw new Error("Service date must use YYYY-MM-DD format.");
    }

    const [year, month, day] = serviceDate.split("-").map(Number);
    const parsedDate = new Date(Date.UTC(year, month - 1, day));

    if (
      parsedDate.getUTCFullYear() !== year ||
      parsedDate.getUTCMonth() !== month - 1 ||
      parsedDate.getUTCDate() !== day
    ) {
      throw new Error("Invalid service date.");
    }
  }
  const originIds = new Set(
    [...index.stops.values()]
      .filter((stop) => {
        const name = normalize(stop.stop_name || "");
        return originTerms.some((t) => name.includes(t));
      })
      .map((stop) => stop.stop_id),
  );

  const destinationIds = new Set(
    [...index.stops.values()]
      .filter((stop) => {
        const name = normalize(stop.stop_name || "");
        return destTerms.some((t) => name.includes(t));
      })
      .map((stop) => stop.stop_id),
  );

  if (!originIds.size || !destinationIds.size) return [];

  const results = [];

  for (const [tripId, sequence] of index.tripStops) {
    const trip = index.trips.get(tripId);

    if (!trip) continue;

    if (serviceDate && !isServiceActive(trip.service_id, serviceDate, index)) {
      continue;
    }

    const fromIndex = sequence.findIndex((stop) => originIds.has(stop.stopId));

    if (fromIndex === -1) continue;

    const toIndex = sequence.findIndex(
      (stop, position) => position > fromIndex && destinationIds.has(stop.stopId),
    );

    if (toIndex === -1) continue;

    const route = index.routes.get(trip.route_id);

    if (!route) continue;

    const selectedStops = sequence.slice(fromIndex, toIndex + 1);
    if (departureAfter && toSeconds(selectedStops[0]!.departure) < toSeconds(departureAfter)) {
      continue;
    }

    const startTime = selectedStops[0]!.departure;
    const endTime = selectedStops[selectedStops.length - 1]!.arrival;

    let durationSeconds = toSeconds(endTime) - toSeconds(startTime);

    if (durationSeconds < 0) {
      durationSeconds += 24 * 60 * 60;
    }

    let transportType = "Unknown";

    if (route.agency_id === "69") {
      transportType = "MTC Bus";
    } else if (route.agency_id === "CMRL" || route.route_id.startsWith("CMRL-")) {
      transportType = "Chennai Metro";
    } else if (route.agency_id === "SR") {
      transportType = "Suburban Train";
    }

    const originStopName = index.stops.get(selectedStops[0]!.stopId)?.stop_name || "Unknown";
    const destStopName =
      index.stops.get(selectedStops[selectedStops.length - 1]!.stopId)?.stop_name || "Unknown";

    const lastTripStopId = sequence[sequence.length - 1]?.stopId;
    const terminusStopName = lastTripStopId
      ? index.stops.get(lastTripStopId)?.stop_name
      : undefined;
    const serviceDirection =
      (trip.trip_headsign && trip.trip_headsign.trim()) || terminusStopName || destStopName;

    let lineName = route.route_long_name || "";
    if (transportType === "Chennai Metro") {
      const lower = (route.route_long_name || "").toLowerCase();
      if (lower.includes("airport") || lower.includes("wimco")) {
        lineName = "Blue Line";
      } else if (
        lower.includes("central") ||
        lower.includes("st.thomas mount") ||
        lower.includes("cmbt")
      ) {
        lineName = "Green Line";
      }
    }

    results.push({
      tripId,
      routeId: trip.route_id,
      routeNumber: route.route_short_name || "",
      routeName: route.route_long_name || "",
      lineName,
      tripHeadsign: trip.trip_headsign || "",
      serviceDirection,
      transportType,
      origin: originStopName,
      destination: destStopName,
      departure: startTime,
      arrival: endTime,
      durationMinutes: Math.round(durationSeconds / 60),
      totalStops: selectedStops.length - 1,
      serviceDateChecked: serviceDate ?? null,
      stops: selectedStops.map((stop) => {
        const stopRow = index.stops.get(stop.stopId);
        return {
          stopId: stop.stopId,
          name: stopRow?.stop_name || "Unknown",
          arrival: stop.arrival,
          departure: stop.departure,
          latitude: stopRow?.stop_lat ? Number(stopRow.stop_lat) : undefined,
          longitude: stopRow?.stop_lon ? Number(stopRow.stop_lon) : undefined,
        };
      }),
    });
  }

  return results.sort((a, b) => a.departure.localeCompare(b.departure)).slice(0, 5);
}

export async function getPlannerCounts() {
  const index = await getPlannerIndex();

  return {
    stops: index.stops.size,
    routes: index.routes.size,
    trips: index.trips.size,
    indexedTrips: index.tripStops.size,
    calendars: index.calendars.size,
  };
}

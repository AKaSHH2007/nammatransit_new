import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";

const DATA_DIR = path.resolve(process.cwd(), "data");

export type GTFSRow = Record<string, string>;

export async function readGTFSFile(filename: string): Promise<GTFSRow[]> {
  const filePath = path.join(DATA_DIR, filename);
  try {
    const content = await fs.readFile(filePath, "utf8");

    return parse(content, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      relax_column_count: true,
      trim: true,
    }) as GTFSRow[];
  } catch (error) {
    if (error != null && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function getGTFSOverview() {
  const [agencies, routes, stops, trips, stopTimes, calendars] = await Promise.all([
    readGTFSFile("agency.txt"),
    readGTFSFile("routes.txt"),
    readGTFSFile("stops.txt"),
    readGTFSFile("trips.txt"),
    readGTFSFile("stop_times.txt"),
    readGTFSFile("calendar.txt"),
  ]);

  return {
    agencies: agencies.length,
    routes: routes.length,
    stops: stops.length,
    trips: trips.length,
    stopTimes: stopTimes.length,
    calendars: calendars.length,
  };
}

export async function searchGTFSStops(query: string) {
  const stops = await readGTFSFile("stops.txt");
  const search = query.toLowerCase().trim();

  if (!search) return [];

  return stops.filter((stop) => stop.stop_name?.toLowerCase().includes(search)).slice(0, 20);
}
export async function getTransportRoutes() {
  const [routes, agencies] = await Promise.all([
    readGTFSFile("routes.txt"),
    readGTFSFile("agency.txt"),
  ]);

  const agencyMap = new Map(agencies.map((agency) => [agency.agency_id, agency.agency_name]));

  return routes.map((route) => {
    let transportType = "Unknown";

    if (route.agency_id === "69") {
      transportType = "MTC Bus";
    } else if (route.agency_id === "CMRL" || route.route_id.startsWith("CMRL-")) {
      transportType = "Chennai Metro";
    } else if (route.agency_id === "SR") {
      transportType = "Suburban Train";
    }

    return {
      routeId: route.route_id,
      routeNumber: route.route_short_name,
      routeName: route.route_long_name,
      transportType,
      agency: agencyMap.get(route.agency_id) || "Unknown",
    };
  });
}
export async function getRoutesForStop(stopId: string) {
  const [stopTimes, trips, routes] = await Promise.all([
    readGTFSFile("stop_times.txt"),
    readGTFSFile("trips.txt"),
    readGTFSFile("routes.txt"),
  ]);

  const tripIds = new Set(
    stopTimes.filter((row) => row.stop_id === stopId).map((row) => row.trip_id),
  );

  const routeIds = new Set(
    trips.filter((trip) => tripIds.has(trip.trip_id)).map((trip) => trip.route_id),
  );

  return routes.filter((route) => routeIds.has(route.route_id));
}

export async function getTripsBetweenStops(fromStopId: string, toStopId: string) {
  const [stopTimes, trips, routes] = await Promise.all([
    readGTFSFile("stop_times.txt"),
    readGTFSFile("trips.txt"),
    readGTFSFile("routes.txt"),
  ]);

  const tripStops = new Map<string, { stopId: string; sequence: number }[]>();

  for (const row of stopTimes) {
    if (!row.stop_id.startsWith("CMRL-")) continue;

    if (!tripStops.has(row.trip_id)) {
      tripStops.set(row.trip_id, []);
    }

    tripStops.get(row.trip_id)!.push({
      stopId: row.stop_id,
      sequence: Number(row.stop_sequence),
    });
  }

  const routeMap = new Map(routes.map((route) => [route.route_id, route]));

  const results = [];

  for (const trip of trips) {
    const stops = tripStops.get(trip.trip_id);
    if (!stops) continue;

    stops.sort((a, b) => a.sequence - b.sequence);

    const fromIndex = stops.findIndex((s) => s.stopId === fromStopId);

    const toIndex = stops.findIndex((s) => s.stopId === toStopId);

    if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
      continue;
    }

    results.push({
      tripId: trip.trip_id,
      route: routeMap.get(trip.route_id)?.route_long_name,
      stops: stops.slice(fromIndex, toIndex + 1),
    });
  }

  return results.slice(0, 10);
}

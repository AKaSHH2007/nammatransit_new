import fs from "node:fs/promises";
import path from "node:path";
import { createReadStream, existsSync } from "node:fs";
import { parse as parseStream } from "csv-parse";
import { parse as parseSync } from "csv-parse/sync";

const DATA_DIR = path.resolve(process.cwd(), "data");

export type GTFSRoute = {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_type: string;
  agency_id: string;
};

type GTFSRow = Record<string, string>;

type GTFSIndex = {
  routes: Map<string, GTFSRoute>;
  stops: Map<string, GTFSRow>;
  stopRoutes: Map<string, Set<string>>;
};

let indexPromise: Promise<GTFSIndex> | undefined;

async function readRows(filename: string): Promise<GTFSRow[]> {
  const content = await fs.readFile(path.join(DATA_DIR, filename), "utf8");

  return parseSync(content, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_column_count: true,
    trim: true,
  }) as GTFSRow[];
}

async function buildIndex(): Promise<GTFSIndex> {
  const [routeRows, stopRows, tripRows] = await Promise.all([
    readRows("routes.txt"),
    readRows("stops.txt"),
    readRows("trips.txt"),
  ]);

  const routes = new Map<string, GTFSRoute>();

  for (const row of routeRows) {
    routes.set(row.route_id, {
      route_id: row.route_id,
      route_short_name: row.route_short_name || "",
      route_long_name: row.route_long_name || "",
      route_type: row.route_type || "",
      agency_id: row.agency_id || "",
    });
  }

  const stops = new Map<string, GTFSRow>();

  for (const row of stopRows) {
    stops.set(row.stop_id, row);
  }

  const tripToRoute = new Map<string, string>();

  for (const trip of tripRows) {
    tripToRoute.set(trip.trip_id, trip.route_id);
  }

  const stopRoutes = new Map<string, Set<string>>();
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
      const routeId = tripToRoute.get(row.trip_id);

      if (!routeId) continue;

      if (!stopRoutes.has(row.stop_id)) {
        stopRoutes.set(row.stop_id, new Set());
      }

      stopRoutes.get(row.stop_id)!.add(routeId);
    }
  }

  return { routes, stops, stopRoutes };
}

export async function getGTFSIndex(): Promise<GTFSIndex> {
  if (!indexPromise) {
    indexPromise = buildIndex().catch((error) => {
      indexPromise = undefined;
      throw error;
    });
  }

  return indexPromise;
}

export async function findGTFSStops(query: string) {
  const index = await getGTFSIndex();
  const search = query.toLowerCase().trim();

  if (!search) return [];

  return [...index.stops.values()]
    .filter((stop) => stop.stop_name?.toLowerCase().includes(search))
    .slice(0, 20);
}

export async function findRoutesAtStop(stopId: string) {
  const index = await getGTFSIndex();
  const routeIds = index.stopRoutes.get(stopId);

  if (!routeIds) return [];

  return [...routeIds]
    .map((id) => index.routes.get(id))
    .filter((route): route is GTFSRoute => Boolean(route));
}

export async function getGTFSCounts() {
  const index = await getGTFSIndex();

  return {
    routes: index.routes.size,
    stops: index.stops.size,
    indexedStops: index.stopRoutes.size,
  };
}

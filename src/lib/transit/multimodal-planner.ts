import { planJourney, demoFare } from "./engine";
import { ALL_STATIONS, ALIASES } from "./data";
import {
  calculateMetroFare,
  calculateBusFare,
  calculateTrainFare,
  calculateJourneyFareSummary,
} from "./fares";
import { resolveLocation } from "./location-resolver";
import {
  YELLOW_LINE_STATIONS,
  YELLOW_LINE_INTERSTATION_MINUTES,
  getYellowLineServiceInfo,
} from "./yellow-line.data";
import type {
  JourneyHighlight,
  JourneyLeg,
  JourneyStop,
  ModeConstraint,
  ModePreference,
  MultimodalJourneyOption,
  TransportMode,
} from "./multimodal-types";

// Ground truth coordinates for Chennai transit stations (extracted from stops.txt)
export const CHENNAI_STATION_COORDS: Record<string, { lat: number; lon: number }> = {
  // Metro Blue Line
  "Wimco Nagar Depot": { lat: 13.18428, lon: 80.30911 },
  "Wimco Nagar": { lat: 13.17899, lon: 80.30716 },
  Tiruvottiyur: { lat: 13.17227, lon: 80.30536 },
  "Tiruvottiyur Theradi": { lat: 13.15983, lon: 80.30234 },
  Kaladipet: { lat: 13.15105, lon: 80.29941 },
  Tollgate: { lat: 13.14352, lon: 80.29632 },
  "New Washermenpet": { lat: 13.13477, lon: 80.29296 },
  Tondiarpet: { lat: 13.12381, lon: 80.2882 },
  "Thiyagaraya College": { lat: 13.1166, lon: 80.28513 },
  Washermenpet: { lat: 13.10722, lon: 80.28079 },
  Mannadi: { lat: 13.09542, lon: 80.28609 },
  "High Court": { lat: 13.08707, lon: 80.28503 },
  "Chennai Central": { lat: 13.08178, lon: 80.27355 },
  "Government Estate": { lat: 13.06956, lon: 80.27284 },
  LIC: { lat: 13.06455, lon: 80.2661 },
  "Thousand Lights": { lat: 13.05836, lon: 80.25852 },
  "AG-DMS": { lat: 13.04468, lon: 80.24803 },
  Teynampet: { lat: 13.03712, lon: 80.24646 },
  Nandanam: { lat: 13.03165, lon: 80.24104 },
  Saidapet: { lat: 13.0236, lon: 80.22836 },
  "Little Mount": { lat: 13.01448, lon: 80.22398 },
  Guindy: { lat: 13.00937, lon: 80.21344 },
  "Guindy Metro": { lat: 13.00937, lon: 80.21344 },
  Alandur: { lat: 13.00372, lon: 80.20154 },
  "Nanganallur Road": { lat: 12.99997, lon: 80.19416 },
  Meenambakkam: { lat: 12.98775, lon: 80.17659 },
  "Chennai Airport": { lat: 12.98159, lon: 80.1639 },
  Airport: { lat: 12.98159, lon: 80.1639 },

  // Metro Green Line
  Egmore: { lat: 13.07878, lon: 80.2611 },
  "Nehru Park": { lat: 13.07893, lon: 80.25087 },
  Kilpauk: { lat: 13.07734, lon: 80.24221 },
  "Pachaiyappa's College": { lat: 13.07597, lon: 80.23344 },
  Pachaiyappa: { lat: 13.07597, lon: 80.23344 },
  "Shenoy Nagar": { lat: 13.07971, lon: 80.22463 },
  "Anna Nagar East": { lat: 13.08473, lon: 80.22005 },
  "Anna Nagar Tower": { lat: 13.08518, lon: 80.20849 },
  Thirumangalam: { lat: 13.085, lon: 80.20221 },
  Koyambedu: { lat: 13.07533, lon: 80.19507 },
  CMBT: { lat: 13.06824, lon: 80.20412 },
  Arumbakkam: { lat: 13.06185, lon: 80.21192 },
  Vadapalani: { lat: 13.05106, lon: 80.21168 },
  "Ashok Nagar": { lat: 13.03534, lon: 80.21064 },
  Ekkattuthangal: { lat: 13.01711, lon: 80.20569 },
  "St. Thomas Mount": { lat: 12.99475, lon: 80.19755 },

  // Suburban Rail Stations (Southern Railway)
  "Chennai Beach": { lat: 13.0923, lon: 80.29189 },
  "Chennai Fort": { lat: 13.0841, lon: 80.2858 },
  "Chennai Park": { lat: 13.0805, lon: 80.2743 },
  "Chennai Egmore": { lat: 13.07825, lon: 80.26103 },
  Chetpet: { lat: 13.0722, lon: 80.2452 },
  Nungambakkam: { lat: 13.0645, lon: 80.2325 },
  Kodambakkam: { lat: 13.0512, lon: 80.2241 },
  Mambalam: { lat: 13.0368, lon: 80.2272 },
  Pazhavanthangal: { lat: 12.9901, lon: 80.1856 },
  Tirusulam: { lat: 12.9798, lon: 80.1665 },
  Pallavaram: { lat: 12.9685, lon: 80.1504 },
  Chromepet: { lat: 12.9515, lon: 80.1415 },
  "Tambaram Sanatorium": { lat: 12.9372, lon: 80.1284 },
  Tambaram: { lat: 12.9253, lon: 80.1189 },

  // Major MTC Bus Hubs & Commercial Nodes
  "Broadway Bus Terminus": { lat: 13.08762, lon: 80.28383 },
  "Koyambedu Bus Terminus (CMBT)": { lat: 13.06824, lon: 80.20412 },
  "Guindy Bus Terminus": { lat: 13.0078, lon: 80.2125 },
  "T. Nagar Bus Terminus": { lat: 13.0384, lon: 80.2312 },
  "T. Nagar": { lat: 13.0384, lon: 80.2312 },
  "T Nagar": { lat: 13.0384, lon: 80.2312 },
  "Adyar Bus Depot": { lat: 12.9978, lon: 80.25617 },
  "Tambaram Bus Stand": { lat: 12.926, lon: 80.12 },
  "Vadapalani Bus Terminus": { lat: 13.0516, lon: 80.2118 },
  "Anna Nagar West Depot": { lat: 13.0937, lon: 80.1984 },
  Poonamallee: { lat: 13.0489, lon: 80.0924 },
  Porur: { lat: 13.0359, lon: 80.1578 },
  Velachery: { lat: 12.9759, lon: 80.2205 },

  // Metro Yellow Line (Phase 2 – Corridor 4: Poonamallee Bypass ↔ Vadapalani)
  "Poonamallee Bypass": { lat: 13.0485, lon: 80.0812 },
  "Poonamallee Bus Stand": { lat: 13.05183, lon: 80.09491 },
  "Poonamallee Government Hospital": { lat: 13.05023, lon: 80.09929 },
  Karayanchavadi: { lat: 13.0482, lon: 80.1085 },
  Kumananchavadi: { lat: 13.0448, lon: 80.11589 },
  Kattupakkam: { lat: 13.0415, lon: 80.131 },
  Iyappanthangal: { lat: 13.0378, lon: 80.1415 },
  Thelliyaragaram: { lat: 13.0392, lon: 80.1472 },
  "Porur Bypass": { lat: 13.04562, lon: 80.14962 },
  "Porur Junction": { lat: 13.03465, lon: 80.15653 },
};

export function isRecognizedChennaiStation(name: string): boolean {
  if (!name || typeof name !== "string") return false;
  const raw = name.trim().toLowerCase();
  if (ALIASES[raw]) return true;

  // Use intelligent location resolution
  const resolved = resolveLocation(raw);
  if (resolved.resolved) return true;

  // Check against CHENNAI_STATION_COORDS keys
  for (const key of Object.keys(CHENNAI_STATION_COORDS)) {
    const k = key.toLowerCase();
    if (k === raw || k.includes(raw) || raw.includes(k)) return true;
  }

  // Check against ALL_STATIONS
  for (const st of ALL_STATIONS) {
    const s = st.toLowerCase();
    if (s === raw || s.includes(raw) || raw.includes(s)) return true;
  }

  // Clean common transit suffixes and re-check
  const clean = raw
    .replace(
      /\b(metro|station|railway|jn\.?|depot|bus|terminus|stand|platform|stop|junction)\b/g,
      "",
    )
    .trim();
  if (clean.length >= 3) {
    for (const key of Object.keys(CHENNAI_STATION_COORDS)) {
      const k = key
        .toLowerCase()
        .replace(
          /\b(metro|station|railway|jn\.?|depot|bus|terminus|stand|platform|stop|junction)\b/g,
          "",
        )
        .trim();
      if (k === clean || (clean.length >= 4 && (k.includes(clean) || clean.includes(k)))) {
        return true;
      }
    }
  }

  return false;
}

export function getStationCoordinates(name: string): { lat: number; lon: number } | undefined {
  if (CHENNAI_STATION_COORDS[name]) {
    return CHENNAI_STATION_COORDS[name];
  }
  const clean = name
    .toLowerCase()
    .replace(/metro|station|railway|jn\.?|depot|bus|terminus|stand/g, "")
    .trim();
  for (const [key, coords] of Object.entries(CHENNAI_STATION_COORDS)) {
    const keyClean = key
      .toLowerCase()
      .replace(/metro|station|railway|jn\.?|depot|bus|terminus|stand/g, "")
      .trim();
    if (keyClean === clean || key.toLowerCase().includes(clean) || clean.includes(keyClean)) {
      return coords;
    }
  }
  return undefined;
}

function addMinutesToTime(timeStr: string, minutes: number): string {
  const parts = timeStr.split(":").map(Number);
  const total = (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0) + minutes * 60;
  const h = Math.floor((total / 3600) % 24);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function toSeconds(timeStr: string): number {
  const parts = timeStr.split(":").map(Number);
  return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
}

/**
 * Calculates highlights (fastest, cheapest, fewest transfers, least walking, best overall)
 * and assigns them strictly based on comparing candidates against each other.
 */
export function calculateJourneyHighlights(
  options: MultimodalJourneyOption[],
  preferredMode?: ModePreference,
): MultimodalJourneyOption[] {
  if (options.length === 0) return options;

  const fareVerified = options.filter((option) =>
    Number.isFinite(option.fare) && option.fare > 0,
  );
  const durations = options.map((option) => option.durationMinutes).filter((value) => value > 0);
  const minDuration = durations.length ? Math.min(...durations) : Infinity;
  const minFare = fareVerified.length
    ? Math.min(...fareVerified.map((option) => option.fare))
    : Infinity;
  const minTransfers = Math.min(...options.map((option) => option.transferCount));
  const minWalking = Math.min(...options.map((option) => option.walkingDistanceMeters));

  const scored = options.map((option) => {
    // An unavailable fare is neutral, not zero-cost and never a "cheapest" result.
    let score = option.durationMinutes +
      (option.fare > 0 ? option.fare * 0.45 : 0) +
      option.transferCount * 12 +
      option.walkingDistanceMeters * 0.015;

    if (preferredMode && preferredMode !== "any" && option.modes.includes(preferredMode)) {
      score -= 15;
    }

    const highlights: JourneyHighlight[] = [];
    if (option.durationMinutes > 0 && option.durationMinutes === minDuration) highlights.push("fastest");
    if (option.fare > 0 && option.fare === minFare) highlights.push("cheapest");
    if (option.transferCount === minTransfers && option.transferCount === 0) highlights.push("fewest_transfers");
    if (option.walkingDistanceMeters === minWalking) highlights.push("least_walking");

    return {
      ...option,
      compositeScore: Math.round(score * 10) / 10,
      highlights,
    };
  });

  const minScore = Math.min(...scored.map((option) => option.compositeScore ?? Infinity));
  for (const option of scored) {
    if (option.compositeScore === minScore && !option.highlights.includes("best_overall")) {
      option.highlights.unshift("best_overall");
    }
  }

  scored.sort((a, b) => (a.compositeScore ?? Infinity) - (b.compositeScore ?? Infinity));
  return scored.map((option, index) => ({ ...option, optionNumber: index + 1 }));
}

/**
 * Plans multimodal journey alternatives across all valid transit modes and combinations:
 * 1. MTC Bus only
 * 2. Chennai Metro only
 * 3. Suburban Railway only
 * 4. Bus + Metro
 * 5. Bus + Suburban Railway
 * 6. Metro + Suburban Railway
 * 7. Bus + Metro + Suburban Railway
 * 8. Walking connections between modes
 */
function createYellowLineStationPath(
  fromName: string,
  toName: string,
  travelDate?: string,
  departureTime?: string,
): MultimodalJourneyOption | null {
  // This helper uses the station supplement, not generic place aliases.
  // It must never create exact departure timestamps or ticket fares.
  const yellowStations = [
    "Poonamallee Bypass",
    "Poonamallee Bus Stand",
    "Poonamallee Government Hospital",
    "Karayanchavadi",
    "Kumananchavadi",
    "Kattupakkam",
    "Iyappanthangal",
    "Thelliyaragaram",
    "Porur Bypass",
    "Porur Junction",
    "Vadapalani",
  ];
  const normalize = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const aliases: Record<string, string> = {
    poonamali: "Poonamallee Bypass",
    poonamallee: "Poonamallee Bypass",
    punamallee: "Poonamallee Bypass",
    punamali: "Poonamallee Bypass",
    poonamalleebypass: "Poonamallee Bypass",
    poonamaliibypass: "Poonamallee Bypass",
    poonamalleebusstand: "Poonamallee Bus Stand",
    vadapalani: "Vadapalani",
    vadapalany: "Vadapalani",
    vadaipalani: "Vadapalani",
    porurjunction: "Porur Junction",
    kattupakkam: "Kattupakkam",
    iyappanthangal: "Iyappanthangal",
  };
  const match = (value: string): string | undefined => {
    const key = normalize(value);
    if (aliases[key]) return aliases[key];
    return yellowStations.find((station) => normalize(station) === key);
  };
  const from = match(fromName);
  const to = match(toName);
  if (!from || !to || from === to) return null;
  const fromIndex = yellowStations.indexOf(from);
  const toIndex = yellowStations.indexOf(to);
  const forward = fromIndex < toIndex;
  const names = forward
    ? yellowStations.slice(fromIndex, toIndex + 1)
    : yellowStations.slice(toIndex, fromIndex + 1).reverse();
  const hops = names.length - 1;
  if (hops <= 0) return null;
  const service = getYellowLineServiceInfo(travelDate, departureTime);
  const stops = names.map((name) => {
    const station = YELLOW_LINE_STATIONS.find((item) => item.name === name);
    return {
      name,
      latitude: station?.latitude,
      longitude: station?.longitude,
    };
  });
  const leg: JourneyLeg = {
    id: "yellow-line-station-sequence",
    mode: "metro",
    lineName: "Chennai Metro Yellow Line",
    routeNumber: "Yellow Line (Corridor 4)",
    operator: "Chennai Metro Rail Limited",
    fromStation: from,
    toStation: to,
    boardStation: from,
    alightStation: to,
    serviceDirection: forward ? "Towards Vadapalani" : "Towards Poonamallee Bypass",
    durationMinutes: Math.round(hops * YELLOW_LINE_INTERSTATION_MINUTES),
    stopsCount: hops,
    intermediateStops: stops,
    color: "#EAB308",
    instruction: "Board at " + from + " and alight at " + to +
      ". Exact train departure timestamps and fare are not present in this dataset.",
    serviceWindow: service.operatingWindow,
    serviceFrequency: service.frequencyText,
    serviceNotice: service.notice,
  };
  return {
    id: "yellow-line-" + fromIndex + "-" + toIndex,
    title: "Chennai Metro Yellow Line (" + from + " → " + to + ")",
    description: "Station path from the Yellow Line supplement. Approximate in-vehicle time; exact departures and fares are unavailable. " + service.frequencyText,
    durationMinutes: leg.durationMinutes,
    fare: 0,
    standardFare: null,
    originStation: from,
    destinationStation: to,
    transferCount: 0,
    walkingDistanceMeters: 0,
    totalStops: hops,
    departureTime: "",
    arrivalTime: "",
    modes: ["metro"],
    legs: [leg],
    highlights: [],
    fareBreakdown: [],
    scheduleSource: "Timetable unavailable",
    isLiveTracking: false,
  };
}

export async function planMultimodalJourneys(
  origin: string,
  destination: string,
  travelDate?: string,
  departureTime?: string,
  preferredMode?: ModePreference,
  modeConstraint?: ModeConstraint,
): Promise<MultimodalJourneyOption[]> {
  const yellow = await import("./yellow-line.data");
  const originRaw = origin.trim();
  const destinationRaw = destination.trim();
  const originYellow = yellow.matchYellowLineStation(originRaw);
  const destinationYellow = yellow.matchYellowLineStation(destinationRaw);

  // Use original endpoint strings for station-level Yellow lookup. General
  // aliases strip words like "bypass", which can turn one platform into
  // another; the station-specific dataset must take precedence.
  const resolvedOrigin = resolveLocation(originRaw);
  const resolvedDestination = resolveLocation(destinationRaw);
  const oClean = originYellow?.name || resolvedOrigin.resolved || originRaw;
  const dClean = destinationYellow?.name || resolvedDestination.resolved || destinationRaw;
  if (!oClean || !dClean || oClean.toLowerCase() === dClean.toLowerCase()) return [];

  const options: MultimodalJourneyOption[] = [];

  if (!modeConstraint || modeConstraint === "none" || modeConstraint === "metro") {
    const yellowPath = createYellowLineStationPath(originRaw, destinationRaw, travelDate, departureTime);
    if (yellowPath) options.push(yellowPath);
  }

  // Search actual scheduled departures for endpoints that also exist in GTFS.
  try {
    const { resolvePlannerStop, findDirectJourneys } = await import("../gtfs/planner");
    const [fromMatch, toMatch] = await Promise.all([
      resolvePlannerStop(oClean),
      resolvePlannerStop(dClean),
    ]);
    if (fromMatch.name && toMatch.name) {
      const trips = await findDirectJourneys(fromMatch.name, toMatch.name, travelDate, departureTime);
      for (const trip of trips) {
        const mode: TransportMode =
          trip.transportType === "Chennai Metro" ? "metro" :
          trip.transportType === "MTC Bus" ? "bus" :
          trip.transportType === "Suburban Train" ? "train" : "walk";
        if (mode === "walk" || (modeConstraint && modeConstraint !== "none" && mode !== modeConstraint)) continue;

        const from = trip.origin || fromMatch.name;
        const to = trip.destination || toMatch.name;
        const line = trip.lineName || trip.routeName || trip.transportType;
        const routeNumber = trip.routeNumber || undefined;
        let fare = 0;
        let standardFare: number | null = null;
        let digitalFare: number | undefined;
        try {
          const fareData = mode === "metro"
            ? calculateMetroFare(from, to, trip.totalStops)
            : mode === "bus"
              ? calculateBusFare(from, to, routeNumber, trip.totalStops)
              : calculateTrainFare(from, to, trip.totalStops);
          if (fareData.isAvailable && !fareData.fareUnavailable && fareData.standardFare && fareData.standardFare > 0) {
            standardFare = fareData.standardFare;
            fare = standardFare;
            if (fareData.digitalFare && fareData.digitalFare > 0) digitalFare = fareData.digitalFare;
          }
        } catch (error) {
          console.warn("GTFS fare lookup failed:", error);
        }
        const colour = mode === "metro"
          ? line.toLowerCase().includes("green") ? "#16A34A" : "#2563EB"
          : mode === "bus" ? "#FFAA47" : "#A78BFA";
        const leg: JourneyLeg = {
          id: "gtfs-" + trip.tripId,
          mode,
          lineName: line,
          routeNumber,
          operator: mode === "metro" ? "Chennai Metro (CMRL)" :
            mode === "bus" ? "Metropolitan Transport Corporation (MTC)" : "Southern Railway",
          fromStation: from,
          toStation: to,
          boardStation: from,
          alightStation: to,
          serviceDirection: trip.serviceDirection || trip.tripHeadsign || to,
          headsign: trip.tripHeadsign || undefined,
          departureTime: trip.departure,
          arrivalTime: trip.arrival,
          durationMinutes: trip.durationMinutes,
          stopsCount: trip.totalStops,
          intermediateStops: trip.stops.map((stop) => ({
            name: stop.name,
            stopId: stop.stopId,
            arrival: stop.arrival,
            departure: stop.departure,
            latitude: stop.latitude ?? getStationCoordinates(stop.name)?.lat,
            longitude: stop.longitude ?? getStationCoordinates(stop.name)?.lon,
          })),
          ...(standardFare !== null ? { standardFare, fareRupees: standardFare } : {}),
          ...(digitalFare !== undefined ? { digitalFare } : {}),
          color: colour,
          instruction: "Board at " + from + " and alight at " + to + ".",
        };
        options.push({
          id: "gtfs-" + trip.tripId,
          title: line + " (" + from + " → " + to + ")",
          description: trip.routeName || trip.transportType + " trip in the loaded GTFS data.",
          durationMinutes: trip.durationMinutes,
          fare,
          ...(standardFare !== null ? { standardFare } : {}),
          ...(digitalFare !== undefined ? { digitalFare } : {}),
          originStation: from,
          destinationStation: to,
          transferCount: 0,
          walkingDistanceMeters: 0,
          totalStops: trip.totalStops,
          departureTime: trip.departure,
          arrivalTime: trip.arrival,
          modes: [mode],
          legs: [leg],
          highlights: [],
          fareBreakdown: standardFare !== null ? [{ mode, label: line + " fare", amount: standardFare }] : [],
          scheduleSource: "Static GTFS schedule",
          isLiveTracking: false,
        });
      }
    }
  } catch (error) {
    console.warn("GTFS journey lookup unavailable:", error);
  }

  let filtered = options;
  if (modeConstraint && modeConstraint !== "none") {
    filtered = filtered.filter((option) => option.modes.includes(modeConstraint));
  }
  if (preferredMode && preferredMode !== "any") {
    filtered = [...filtered].sort((a, b) =>
      Number(!a.modes.includes(preferredMode)) - Number(!b.modes.includes(preferredMode)),
    );
  }
  return calculateJourneyHighlights(filtered, preferredMode);
}
function filterUniqueCandidates(options: MultimodalJourneyOption[]): MultimodalJourneyOption[] {
  const seen = new Set<string>();
  const unique: MultimodalJourneyOption[] = [];

  for (const opt of options) {
    // Unique key combines title + modes + duration
    const key = `${opt.title}-${opt.modes.join("_")}-${Math.round(opt.durationMinutes / 3)}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(opt);
    }
  }

  return unique;
}

function isSuburbanCorridor(origin: string, destination: string): boolean {
  const suburbanSpine = [
    "central",
    "beach",
    "fort",
    "park",
    "egmore",
    "chetpet",
    "nungambakkam",
    "kodambakkam",
    "mambalam",
    "saidapet",
    "guindy",
    "st. thomas mount",
    "thomas",
    "pazhavanthangal",
    "meenambakkam",
    "tirusulam",
    "airport",
    "pallavaram",
    "chromepet",
    "tambaram",
  ];
  const o = origin.toLowerCase();
  const d = destination.toLowerCase();
  return suburbanSpine.some((s) => o.includes(s)) && suburbanSpine.some((s) => d.includes(s));
}

function getSuburbanStops(origin: string, destination: string): JourneyStop[] {
  const fullSuburbanList = [
    { name: "Chennai Beach", lat: 13.0923, lon: 80.29189 },
    { name: "Chennai Fort", lat: 13.0841, lon: 80.2858 },
    { name: "Chennai Park (Central)", lat: 13.0805, lon: 80.2743 },
    { name: "Chennai Egmore", lat: 13.07825, lon: 80.26103 },
    { name: "Chetpet", lat: 13.0722, lon: 80.2452 },
    { name: "Nungambakkam", lat: 13.0645, lon: 80.2325 },
    { name: "Kodambakkam", lat: 13.0512, lon: 80.2241 },
    { name: "Mambalam", lat: 13.0368, lon: 80.2272 },
    { name: "Saidapet", lat: 13.0232, lon: 80.2224 },
    { name: "Guindy", lat: 13.0075, lon: 80.2131 },
    { name: "St. Thomas Mount", lat: 12.9947, lon: 80.1975 },
    { name: "Pazhavanthangal", lat: 12.9901, lon: 80.1856 },
    { name: "Meenambakkam", lat: 12.9867, lon: 80.1782 },
    { name: "Tirusulam (Airport)", lat: 12.9798, lon: 80.1665 },
    { name: "Pallavaram", lat: 12.9685, lon: 80.1504 },
    { name: "Chromepet", lat: 12.9515, lon: 80.1415 },
    { name: "Tambaram", lat: 12.9253, lon: 80.1189 },
  ];

  const oClean = origin
    .toLowerCase()
    .replace(/metro|station|suburban/g, "")
    .trim();
  const dClean = destination
    .toLowerCase()
    .replace(/metro|station|suburban/g, "")
    .trim();

  let idx1 = fullSuburbanList.findIndex(
    (s) => s.name.toLowerCase().includes(oClean) || oClean.includes(s.name.toLowerCase()),
  );
  let idx2 = fullSuburbanList.findIndex(
    (s) => s.name.toLowerCase().includes(dClean) || dClean.includes(s.name.toLowerCase()),
  );

  if (idx1 === -1) idx1 = 9; // Guindy default
  if (idx2 === -1) idx2 = 13; // Tirusulam default
  if (idx1 === idx2) idx2 = Math.min(idx1 + 3, fullSuburbanList.length - 1);

  const stopsSlice =
    idx1 <= idx2
      ? fullSuburbanList.slice(idx1, idx2 + 1)
      : fullSuburbanList.slice(idx2, idx1 + 1).reverse();
  return stopsSlice.map((s) => ({
    name: s.name,
    latitude: s.lat,
    longitude: s.lon,
  }));
}

function getMTCBusRoute(origin: string, destination: string): string {
  const text = `${origin} ${destination}`.toLowerCase();
  if (text.includes("airport") || text.includes("tambaram") || text.includes("guindy")) {
    return "21G";
  }
  if (text.includes("koyambedu") || text.includes("cmbt") || text.includes("vadapalani")) {
    return "70";
  }
  if (text.includes("t. nagar") || text.includes("t nagar") || text.includes("mambalam")) {
    return "47A";
  }
  if (text.includes("central") && text.includes("anna nagar")) {
    return "29A";
  }
  if (text.includes("egmore") || text.includes("broadway")) {
    return "18A";
  }
  return "21G";
}

function getMTCIntermediateStops(origin: string, destination: string): JourneyStop[] {
  const oCoords = getStationCoordinates(origin) || { lat: 13.0093, lon: 80.2134 };
  const dCoords = getStationCoordinates(destination) || { lat: 12.9815, lon: 80.1639 };

  return [
    { name: `${origin} Bus Bay`, latitude: oCoords.lat, longitude: oCoords.lon },
    {
      name: "Kathipara Junction Highway Bay",
      latitude: oCoords.lat * 0.65 + dCoords.lat * 0.35,
      longitude: oCoords.lon * 0.65 + dCoords.lon * 0.35,
    },
    {
      name: "GST Road Transit Shelter",
      latitude: oCoords.lat * 0.35 + dCoords.lat * 0.65,
      longitude: oCoords.lon * 0.35 + dCoords.lon * 0.65,
    },
    { name: `${destination} Bus Stand`, latitude: dCoords.lat, longitude: dCoords.lon },
  ];
}

// -----------------------------------------------------------------------------------
// Helper Multimodal Generators: Bus+Metro, Metro+Suburban, Bus+Suburban, 3-Modes
// -----------------------------------------------------------------------------------

function generateBusAndMetroOption(
  origin: string,
  destination: string,
  baseTime: string,
): MultimodalJourneyOption | null {
  const text = `${origin} ${destination}`.toLowerCase();
  const isYellowOrigin = [
    "poonamallee",
    "karayanchavadi",
    "kumananchavadi",
    "kattupakkam",
    "iyappanthangal",
    "thelliyaragaram",
    "porur",
  ].some((s) => origin.toLowerCase().includes(s));

  const isYellowDest = [
    "poonamallee",
    "karayanchavadi",
    "kumananchavadi",
    "kattupakkam",
    "iyappanthangal",
    "thelliyaragaram",
    "porur",
  ].some((s) => destination.toLowerCase().includes(s));

  if (isYellowOrigin) {
    const hub = "Vadapalani";
    const hubCoords = getStationCoordinates(hub) || { lat: 13.05106, lon: 80.21168 };
    const oCoords = getStationCoordinates(origin) || { lat: 13.0485, lon: 80.0812 };
    const dCoords = getStationCoordinates(destination) || { lat: 13.0093, lon: 80.2134 };

    const metroDuration = 18;
    const walkDuration = 2;
    const busDuration = 16;
    const totalDuration = metroDuration + walkDuration + busDuration;

    const t1 = baseTime;
    const t2 = addMinutesToTime(t1, metroDuration);
    const t3 = addMinutesToTime(t2, walkDuration);
    const t4 = addMinutesToTime(t3, busDuration);

    const legs: JourneyLeg[] = [
      {
        id: "ym-leg-metro",
        mode: "metro",
        lineName: "Chennai Metro Yellow Line",
        routeNumber: "Yellow Line (Corridor 4)",
        operator: "Chennai Metro (CMRL)",
        fromStation: origin,
        toStation: `${hub} Metro Station`,
        boardStation: origin,
        alightStation: `${hub} Metro Station`,
        serviceDirection: `Towards ${hub}`,
        departureTime: t1,
        arrivalTime: t2,
        durationMinutes: metroDuration,
        stopsCount: 8,
        standardFare: 30,
        digitalFare: 24,
        fareRupees: 30,
        fareCategory: "CMRL Phase 2 Yellow Line",
        discountNote: "20% discount on Chennai One app",
        color: "#EAB308",
        instruction: `Board Phase 2 Yellow Line towards ${hub} at ${origin}. Alight at ${hub} Metro Station.`,
        intermediateStops: [
          { name: origin, latitude: oCoords.lat, longitude: oCoords.lon },
          { name: `${hub} Metro Station`, latitude: hubCoords.lat, longitude: hubCoords.lon },
        ],
      },
      {
        id: "ym-leg-walk",
        mode: "walk",
        lineName: "Transfer Walk to Bus Stand",
        operator: "Pedestrian Concourse",
        fromStation: `${hub} Metro Station`,
        toStation: `${hub} Bus Terminus`,
        boardStation: `${hub} Metro Station`,
        alightStation: `${hub} Bus Terminus`,
        serviceDirection: `Walk to ${hub} Bus Bay`,
        departureTime: t2,
        arrivalTime: t3,
        durationMinutes: walkDuration,
        stopsCount: 0,
        walkingDistanceMeters: 120,
        walkingDurationMinutes: walkDuration,
        waitingDurationMinutes: 4,
        color: "#64748B",
        instruction: `Walk ~120m from Metro exit directly into ${hub} bus bay.`,
        intermediateStops: [],
      },
      {
        id: "ym-leg-bus",
        mode: "bus",
        lineName: "MTC Bus 70 / 47",
        routeNumber: "70",
        operator: "MTC Bus",
        fromStation: `${hub} Bus Terminus`,
        toStation: destination,
        boardStation: `${hub} Bus Terminus`,
        alightStation: destination,
        serviceDirection: `Towards ${destination}`,
        departureTime: t3,
        arrivalTime: t4,
        durationMinutes: busDuration,
        stopsCount: 6,
        standardFare: 12,
        digitalFare: 12,
        fareRupees: 12,
        fareCategory: "MTC Regular Bus",
        color: "#FFAA47",
        instruction: `Board connecting MTC bus towards ${destination} at ${hub} bus terminus. Alight at ${destination}.`,
        intermediateStops: [
          { name: `${hub} Bus Terminus`, latitude: hubCoords.lat, longitude: hubCoords.lon },
          { name: destination, latitude: dCoords.lat, longitude: dCoords.lon },
        ],
      },
    ];

    return {
      id: "option-yellow-bus",
      title: `Chennai Metro Yellow Line + MTC Bus (via ${hub})`,
      description: `Combined Phase 2 Yellow Line rail with connecting MTC city bus at ${hub}.`,
      durationMinutes: totalDuration,
      fare: 42,
      standardFare: 42,
      digitalFare: 36,
      discountAmount: 6,
      originStation: origin,
      destinationStation: destination,
      transferCount: 1,
      walkingDistanceMeters: 120,
      totalStops: 14,
      departureTime: t1,
      arrivalTime: t4,
      modes: ["metro", "walk", "bus"],
      legs,
      highlights: [],
      isMixedMode: true,
      fareBreakdown: [
        { mode: "metro", label: "Yellow Line Metro (Token: ₹30 · Digital: ₹24)", amount: 30 },
        { mode: "bus", label: "MTC Bus", amount: 12 },
      ],
      scheduleSource: "Static GTFS schedule",
      isLiveTracking: false,
    };
  }

  if (isYellowDest) {
    const hub = "Vadapalani";
    const hubCoords = getStationCoordinates(hub) || { lat: 13.05106, lon: 80.21168 };
    const oCoords = getStationCoordinates(origin) || { lat: 13.0093, lon: 80.2134 };
    const dCoords = getStationCoordinates(destination) || { lat: 13.0485, lon: 80.0812 };

    const busDuration = 16;
    const walkDuration = 2;
    const metroDuration = 18;
    const totalDuration = busDuration + walkDuration + metroDuration;

    const t1 = baseTime;
    const t2 = addMinutesToTime(t1, busDuration);
    const t3 = addMinutesToTime(t2, walkDuration);
    const t4 = addMinutesToTime(t3, metroDuration);

    const legs: JourneyLeg[] = [
      {
        id: "my-leg-bus",
        mode: "bus",
        lineName: "MTC Bus 70 / 47",
        routeNumber: "70",
        operator: "MTC Bus",
        fromStation: origin,
        toStation: `${hub} Bus Terminus`,
        boardStation: origin,
        alightStation: `${hub} Bus Terminus`,
        serviceDirection: `Towards ${hub}`,
        departureTime: t1,
        arrivalTime: t2,
        durationMinutes: busDuration,
        stopsCount: 6,
        standardFare: 12,
        digitalFare: 12,
        fareRupees: 12,
        fareCategory: "MTC Regular Bus",
        color: "#FFAA47",
        instruction: `Board MTC Bus towards ${hub} at ${origin}. Alight at ${hub} Bus Terminus.`,
        intermediateStops: [
          { name: origin, latitude: oCoords.lat, longitude: oCoords.lon },
          { name: `${hub} Bus Terminus`, latitude: hubCoords.lat, longitude: hubCoords.lon },
        ],
      },
      {
        id: "my-leg-walk",
        mode: "walk",
        lineName: "Transfer Walk to Metro",
        operator: "Pedestrian Concourse",
        fromStation: `${hub} Bus Terminus`,
        toStation: `${hub} Metro Station`,
        boardStation: `${hub} Bus Terminus`,
        alightStation: `${hub} Metro Station`,
        serviceDirection: `Walk to ${hub} Metro Gate`,
        departureTime: t2,
        arrivalTime: t3,
        durationMinutes: walkDuration,
        stopsCount: 0,
        walkingDistanceMeters: 120,
        walkingDurationMinutes: walkDuration,
        waitingDurationMinutes: 4,
        color: "#64748B",
        instruction: `Walk ~120m into ${hub} Metro concourse.`,
        intermediateStops: [],
      },
      {
        id: "my-leg-metro",
        mode: "metro",
        lineName: "Chennai Metro Yellow Line",
        routeNumber: "Yellow Line (Corridor 4)",
        operator: "Chennai Metro (CMRL)",
        fromStation: `${hub} Metro Station`,
        toStation: destination,
        boardStation: `${hub} Metro Station`,
        alightStation: destination,
        serviceDirection: `Towards ${destination}`,
        departureTime: t3,
        arrivalTime: t4,
        durationMinutes: metroDuration,
        stopsCount: 8,
        standardFare: 30,
        digitalFare: 24,
        fareRupees: 30,
        fareCategory: "CMRL Phase 2 Yellow Line",
        discountNote: "20% discount on Chennai One app",
        color: "#EAB308",
        instruction: `Board Phase 2 Yellow Line towards ${destination} at ${hub} Metro Station. Alight at ${destination}.`,
        intermediateStops: [
          { name: `${hub} Metro Station`, latitude: hubCoords.lat, longitude: hubCoords.lon },
          { name: destination, latitude: dCoords.lat, longitude: dCoords.lon },
        ],
      },
    ];

    return {
      id: "option-bus-yellow",
      title: `MTC Bus + Chennai Metro Yellow Line (via ${hub})`,
      description: `Combined MTC bus feeder with fast Phase 2 Yellow Line transit at ${hub}.`,
      durationMinutes: totalDuration,
      fare: 42,
      standardFare: 42,
      digitalFare: 36,
      discountAmount: 6,
      originStation: origin,
      destinationStation: destination,
      transferCount: 1,
      walkingDistanceMeters: 120,
      totalStops: 14,
      departureTime: t1,
      arrivalTime: t4,
      modes: ["bus", "walk", "metro"],
      legs,
      highlights: [],
      isMixedMode: true,
      fareBreakdown: [
        { mode: "bus", label: "MTC Bus", amount: 12 },
        { mode: "metro", label: "Yellow Line Metro (Token: ₹30 · Digital: ₹24)", amount: 30 },
      ],
      scheduleSource: "Static GTFS schedule",
      isLiveTracking: false,
    };
  }

  const hub = text.includes("koyambedu")
    ? "Alandur"
    : text.includes("central")
      ? "Central"
      : "Guindy";

  const hubCoords = getStationCoordinates(hub) || { lat: 13.0093, lon: 80.2134 };
  const oCoords = getStationCoordinates(origin) || { lat: 13.0384, lon: 80.2312 };
  const dCoords = getStationCoordinates(destination) || { lat: 12.9815, lon: 80.1639 };

  const busDuration = 12;
  const walkDuration = 3;
  const metroDuration = 10;
  const totalDuration = busDuration + walkDuration + metroDuration;

  const t1 = baseTime;
  const t2 = addMinutesToTime(t1, busDuration);
  const t3 = addMinutesToTime(t2, walkDuration);
  const t4 = addMinutesToTime(t3, metroDuration);

  const legs: JourneyLeg[] = [
    {
      id: "bm-leg-1",
      mode: "bus",
      lineName: "MTC Bus 47A / 21G",
      routeNumber: "47A",
      operator: "MTC Bus",
      fromStation: `${origin} Bus Stop`,
      toStation: `${hub} Bus Terminus`,
      boardStation: `${origin} Bus Stop`,
      alightStation: `${hub} Bus Terminus`,
      serviceDirection: `Towards ${hub}`,
      departureTime: t1,
      arrivalTime: t2,
      durationMinutes: busDuration,
      stopsCount: 4,
      standardFare: 12,
      digitalFare: 12,
      fareRupees: 12,
      fareCategory: "MTC Regular Bus",
      color: "#FFAA47",
      instruction: `Board MTC Bus at ${origin} roadside stop towards ${hub}. Alight at ${hub} Bus Terminus.`,
      intermediateStops: [
        { name: `${origin} Bus Stop`, latitude: oCoords.lat, longitude: oCoords.lon },
        { name: `${hub} Bus Terminus`, latitude: hubCoords.lat, longitude: hubCoords.lon },
      ],
    },
    {
      id: "bm-leg-walk",
      mode: "walk",
      lineName: "Transfer Walk to Metro",
      operator: "Pedestrian Concourse",
      fromStation: `${hub} Bus Terminus`,
      toStation: `${hub} Metro Station`,
      boardStation: `${hub} Bus Terminus`,
      alightStation: `${hub} Metro Station`,
      serviceDirection: `Walk to ${hub} Metro Entrance`,
      departureTime: t2,
      arrivalTime: t3,
      durationMinutes: walkDuration,
      stopsCount: 0,
      walkingDistanceMeters: 160,
      walkingDurationMinutes: walkDuration,
      waitingDurationMinutes: 3,
      color: "#64748B",
      instruction: `Walk ~160m via pedestrian path from ${hub} bus bay into ${hub} Metro concourse entrance.`,
      intermediateStops: [],
    },
    {
      id: "bm-leg-metro",
      mode: "metro",
      lineName: "Chennai Metro Blue Line",
      routeNumber: "Blue Line",
      operator: "Chennai Metro (CMRL)",
      fromStation: `${hub} Metro Station`,
      toStation: destination,
      boardStation: `${hub} Metro Station`,
      alightStation: destination,
      serviceDirection: `Towards ${destination}`,
      departureTime: t3,
      arrivalTime: t4,
      durationMinutes: metroDuration,
      stopsCount: 4,
      standardFare: 20,
      digitalFare: 16,
      fareRupees: 20,
      fareCategory: "CMRL Blue Line",
      discountNote: "20% discount on Chennai One app",
      color: "#2563EB",
      instruction: `Board Metro Blue Line train towards ${destination} at ${hub} Metro Station. Alight at ${destination}.`,
      intermediateStops: [
        { name: `${hub} Metro Station`, latitude: hubCoords.lat, longitude: hubCoords.lon },
        { name: destination, latitude: dCoords.lat, longitude: dCoords.lon },
      ],
    },
  ];

  return {
    id: "option-bus-metro",
    title: `MTC Bus + Metro (via ${hub})`,
    description: `Combined MTC bus feeder with fast air-conditioned Chennai Metro line at ${hub}.`,
    durationMinutes: totalDuration,
    fare: 32,
    standardFare: 32,
    digitalFare: 28,
    discountAmount: 4,
    originStation: origin,
    destinationStation: destination,
    transferCount: 1,
    walkingDistanceMeters: 160,
    totalStops: 8,
    departureTime: t1,
    arrivalTime: t4,
    modes: ["bus", "walk", "metro"],
    legs,
    highlights: [],
    isMixedMode: true,
    fareBreakdown: [
      { mode: "bus", label: "MTC Bus", amount: 12 },
      { mode: "metro", label: "Chennai Metro (Token: ₹20 · Digital: ₹16)", amount: 20 },
    ],
    scheduleSource: "Static GTFS schedule",
    isLiveTracking: false,
  };
}

function generateMetroAndSuburbanOption(
  origin: string,
  destination: string,
  baseTime: string,
): MultimodalJourneyOption | null {
  const text = `${origin} ${destination}`.toLowerCase();
  // Valid integrated hubs: Guindy, St. Thomas Mount, Central / Park, Airport / Tirusulam
  const hub = text.includes("koyambedu")
    ? "St. Thomas Mount"
    : text.includes("central")
      ? "Chennai Central"
      : "Guindy";

  const hubCoords = getStationCoordinates(hub) || { lat: 13.0093, lon: 80.2134 };
  const oCoords = getStationCoordinates(origin) || { lat: 13.0753, lon: 80.195 };
  const dCoords = getStationCoordinates(destination) || { lat: 12.9253, lon: 80.1189 };

  const metroDuration = 14;
  const walkDuration = 2;
  const trainDuration = 16;
  const totalDuration = metroDuration + walkDuration + trainDuration;

  const t1 = baseTime;
  const t2 = addMinutesToTime(t1, metroDuration);
  const t3 = addMinutesToTime(t2, walkDuration);
  const t4 = addMinutesToTime(t3, trainDuration);

  const legs: JourneyLeg[] = [
    {
      id: "ms-leg-metro",
      mode: "metro",
      lineName: "Chennai Metro Line",
      routeNumber: "Metro",
      operator: "Chennai Metro (CMRL)",
      fromStation: origin,
      toStation: `${hub} Metro`,
      boardStation: origin,
      alightStation: `${hub} Metro`,
      serviceDirection: `Towards ${hub}`,
      departureTime: t1,
      arrivalTime: t2,
      durationMinutes: metroDuration,
      stopsCount: 5,
      standardFare: 20,
      digitalFare: 16,
      fareRupees: 20,
      fareCategory: "CMRL Standard Token",
      discountNote: "20% discount on Chennai One app",
      color: "#16A34A",
      instruction: `Board Metro towards ${hub} at ${origin}. Alight at ${hub} Metro Station.`,
      intermediateStops: [
        { name: origin, latitude: oCoords.lat, longitude: oCoords.lon },
        { name: `${hub} Metro`, latitude: hubCoords.lat, longitude: hubCoords.lon },
      ],
    },
    {
      id: "ms-leg-walk",
      mode: "walk",
      lineName: "Concourse Foot Overbridge Transfer",
      operator: "Integrated Concourse Walk",
      fromStation: `${hub} Metro`,
      toStation: `${hub} Suburban Platform`,
      boardStation: `${hub} Metro`,
      alightStation: `${hub} Suburban Platform`,
      serviceDirection: `Walk to ${hub} Railway Platform`,
      departureTime: t2,
      arrivalTime: t3,
      durationMinutes: walkDuration,
      stopsCount: 0,
      walkingDistanceMeters: 110,
      walkingDurationMinutes: walkDuration,
      waitingDurationMinutes: 4,
      color: "#64748B",
      instruction: `Cross the station foot overbridge (~110m) connecting Metro concourse directly to Southern Railway platform.`,
      intermediateStops: [],
    },
    {
      id: "ms-leg-train",
      mode: "train",
      lineName: "Southern Railway Suburban EMU",
      routeNumber: "SR-EMU",
      operator: "Southern Railway",
      fromStation: `${hub} Suburban Platform`,
      toStation: destination,
      boardStation: `${hub} Suburban Platform`,
      alightStation: destination,
      serviceDirection: `Towards ${destination}`,
      departureTime: t3,
      arrivalTime: t4,
      durationMinutes: trainDuration,
      stopsCount: 5,
      standardFare: 5,
      digitalFare: 5,
      fareRupees: 5,
      fareCategory: "Suburban EMU 2nd Class",
      color: "#A78BFA",
      instruction: `Board Southern Railway EMU suburban train towards ${destination} at ${hub} Suburban Platform. Alight at ${destination}.`,
      intermediateStops: [
        { name: `${hub} Suburban Platform`, latitude: hubCoords.lat, longitude: hubCoords.lon },
        { name: destination, latitude: dCoords.lat, longitude: dCoords.lon },
      ],
    },
  ];

  return {
    id: "option-metro-suburban",
    title: `Metro + Suburban Rail (via ${hub})`,
    description: `High-capacity rail interchange connecting Metro with Southern Railway EMU at ${hub}.`,
    durationMinutes: totalDuration,
    fare: 25,
    standardFare: 25,
    digitalFare: 21,
    discountAmount: 4,
    originStation: origin,
    destinationStation: destination,
    transferCount: 1,
    walkingDistanceMeters: 110,
    totalStops: 10,
    departureTime: t1,
    arrivalTime: t4,
    modes: ["metro", "walk", "train"],
    legs,
    highlights: [],
    isMixedMode: true,
    fareBreakdown: [
      { mode: "metro", label: "Chennai Metro (Token: ₹20 · Digital: ₹16)", amount: 20 },
      { mode: "train", label: "Southern Railway EMU (2nd Class)", amount: 5 },
    ],
    scheduleSource: "Static GTFS schedule",
    isLiveTracking: false,
  };
}

function generateBusAndSuburbanOption(
  origin: string,
  destination: string,
  baseTime: string,
): MultimodalJourneyOption | null {
  const oCoords = getStationCoordinates(origin) || { lat: 13.0384, lon: 80.2312 };
  const dCoords = getStationCoordinates(destination) || { lat: 12.9253, lon: 80.1189 };
  const hubCoords = getStationCoordinates("Guindy") || { lat: 13.0093, lon: 80.2134 };

  const busDuration = 15;
  const walkDuration = 3;
  const trainDuration = 18;
  const totalDuration = busDuration + walkDuration + trainDuration;

  const t1 = baseTime;
  const t2 = addMinutesToTime(t1, busDuration);
  const t3 = addMinutesToTime(t2, walkDuration);
  const t4 = addMinutesToTime(t3, trainDuration);

  const legs: JourneyLeg[] = [
    {
      id: "bs-leg-bus",
      mode: "bus",
      lineName: "MTC Bus 70 / 47",
      routeNumber: "70",
      operator: "MTC Bus",
      fromStation: `${origin} Bus Bay`,
      toStation: "Guindy Railway Station Bus Stop",
      boardStation: `${origin} Bus Bay`,
      alightStation: "Guindy Railway Station Bus Stop",
      serviceDirection: "Towards Guindy",
      departureTime: t1,
      arrivalTime: t2,
      durationMinutes: busDuration,
      stopsCount: 5,
      standardFare: 12,
      digitalFare: 12,
      fareRupees: 12,
      fareCategory: "MTC Regular Bus",
      color: "#FFAA47",
      instruction: `Board MTC Bus towards Guindy at ${origin} Bus Bay. Alight at Guindy Railway Station Bus Stop.`,
      intermediateStops: [
        { name: `${origin} Bus Bay`, latitude: oCoords.lat, longitude: oCoords.lon },
        {
          name: "Guindy Railway Station Bus Stop",
          latitude: hubCoords.lat,
          longitude: hubCoords.lon,
        },
      ],
    },
    {
      id: "bs-leg-walk",
      mode: "walk",
      lineName: "Subway Walk to Platform",
      operator: "Pedestrian Walk",
      fromStation: "Guindy Railway Station Bus Stop",
      toStation: "Guindy Platform 1",
      boardStation: "Guindy Railway Station Bus Stop",
      alightStation: "Guindy Platform 1",
      serviceDirection: "Walk to Guindy Suburban Platform",
      departureTime: t2,
      arrivalTime: t3,
      durationMinutes: walkDuration,
      stopsCount: 0,
      walkingDistanceMeters: 130,
      walkingDurationMinutes: walkDuration,
      waitingDurationMinutes: 4,
      color: "#64748B",
      instruction: "Walk through station underpass to Suburban platform ticket counter.",
      intermediateStops: [],
    },
    {
      id: "bs-leg-train",
      mode: "train",
      lineName: "Southern Railway EMU",
      routeNumber: "SR-EMU",
      operator: "Southern Railway",
      fromStation: "Guindy Platform 1",
      toStation: destination,
      boardStation: "Guindy Platform 1",
      alightStation: destination,
      serviceDirection: `Towards ${destination}`,
      departureTime: t3,
      arrivalTime: t4,
      durationMinutes: trainDuration,
      stopsCount: 6,
      standardFare: 5,
      digitalFare: 5,
      fareRupees: 5,
      fareCategory: "Southern Railway 2nd Class",
      color: "#A78BFA",
      instruction: `Board Southern Railway suburban train towards ${destination} at Guindy Platform 1. Alight at ${destination}.`,
      intermediateStops: [
        { name: "Guindy Platform 1", latitude: hubCoords.lat, longitude: hubCoords.lon },
        { name: destination, latitude: dCoords.lat, longitude: dCoords.lon },
      ],
    },
  ];

  return {
    id: "option-bus-suburban",
    title: "MTC Bus + Suburban Rail (via Guindy)",
    description:
      "Affordable intermodal connection combining MTC bus feeder with Southern Railway EMU.",
    durationMinutes: totalDuration,
    fare: 17,
    standardFare: 17,
    digitalFare: 17,
    originStation: origin,
    destinationStation: destination,
    transferCount: 1,
    walkingDistanceMeters: 130,
    totalStops: 11,
    departureTime: t1,
    arrivalTime: t4,
    modes: ["bus", "walk", "train"],
    legs,
    highlights: [],
    isMixedMode: true,
    fareBreakdown: [
      { mode: "bus", label: "MTC Bus", amount: 12 },
      { mode: "train", label: "Southern Railway EMU", amount: 5 },
    ],
    scheduleSource: "Static GTFS schedule",
    isLiveTracking: false,
  };
}

function generateThreeModeOption(
  origin: string,
  destination: string,
  baseTime: string,
): MultimodalJourneyOption | null {
  const oClean = origin.toLowerCase();
  const dClean = destination.toLowerCase();

  // Useful for long cross-network journeys (e.g., between Koyambedu/Anna Nagar and Tambaram/Airport)
  if (
    !oClean.includes("koyambedu") &&
    !oClean.includes("nagar") &&
    !dClean.includes("tambaram") &&
    !dClean.includes("airport")
  ) {
    return null;
  }

  const busDuration = 6;
  const metroDuration = 18;
  const trainDuration = 14;
  const totalDuration = busDuration + 2 + metroDuration + 2 + trainDuration;

  const t1 = baseTime;
  const t2 = addMinutesToTime(t1, busDuration);
  const t3 = addMinutesToTime(t2, 2);
  const t4 = addMinutesToTime(t3, metroDuration);
  const t5 = addMinutesToTime(t4, 2);
  const t6 = addMinutesToTime(t5, trainDuration);

  const legs: JourneyLeg[] = [
    {
      id: "3m-bus",
      mode: "bus",
      lineName: "MTC Feeder Bus",
      routeNumber: "Feeder",
      operator: "MTC Bus",
      fromStation: `${origin} Feeder Stop`,
      toStation: "Koyambedu Metro Entrance",
      departureTime: t1,
      arrivalTime: t2,
      durationMinutes: busDuration,
      stopsCount: 2,
      fareRupees: 5,
      color: "#EA580C",
      instruction: "Short bus feeder to Metro station.",
      intermediateStops: [],
    },
    {
      id: "3m-walk-1",
      mode: "walk",
      lineName: "Walk to Metro Gate",
      operator: "Station Walk",
      fromStation: "Koyambedu Metro Entrance",
      toStation: "Koyambedu Metro Platform",
      departureTime: t2,
      arrivalTime: t3,
      durationMinutes: 2,
      stopsCount: 0,
      walkingDistanceMeters: 60,
      walkingDurationMinutes: 2,
      waitingDurationMinutes: 2,
      color: "#64748B",
      instruction: "Enter Metro concourse via turnstiles.",
      intermediateStops: [],
    },
    {
      id: "3m-metro",
      mode: "metro",
      lineName: "Chennai Metro Green Line",
      routeNumber: "Green Line",
      operator: "Chennai Metro (CMRL)",
      fromStation: "Koyambedu Metro Platform",
      toStation: "St. Thomas Mount Metro",
      departureTime: t3,
      arrivalTime: t4,
      durationMinutes: metroDuration,
      stopsCount: 6,
      fareRupees: 25,
      color: "#16A34A",
      instruction: "Fast elevated Green Line transit.",
      intermediateStops: [],
    },
    {
      id: "3m-walk-2",
      mode: "walk",
      lineName: "Integrated Interchange Concourse",
      operator: "Concourse Walk",
      fromStation: "St. Thomas Mount Metro",
      toStation: "St. Thomas Mount Suburban Platform",
      departureTime: t4,
      arrivalTime: t5,
      durationMinutes: 2,
      stopsCount: 0,
      walkingDistanceMeters: 80,
      walkingDurationMinutes: 2,
      waitingDurationMinutes: 3,
      color: "#64748B",
      instruction: "Direct concourse escalator link to Suburban railway platform.",
      intermediateStops: [],
    },
    {
      id: "3m-train",
      mode: "train",
      lineName: "Southern Railway EMU",
      routeNumber: "SR-EMU",
      operator: "Southern Railway",
      fromStation: "St. Thomas Mount Suburban Platform",
      toStation: destination,
      departureTime: t5,
      arrivalTime: t6,
      durationMinutes: trainDuration,
      stopsCount: 4,
      fareRupees: 5,
      color: "#7C3AED",
      instruction: "Suburban EMU direct to destination.",
      intermediateStops: [],
    },
  ];

  return {
    id: "option-three-mode",
    title: "Bus Feeder + Metro + Suburban EMU",
    description: "Multimodal 3-mode transit combining road feeder with dual rail networks.",
    durationMinutes: totalDuration,
    fare: 35,
    transferCount: 2,
    walkingDistanceMeters: 140,
    totalStops: 12,
    departureTime: t1,
    arrivalTime: t6,
    modes: ["bus", "walk", "metro", "walk", "train"],
    legs,
    highlights: [],
    isMixedMode: true,
    fareBreakdown: [
      { mode: "bus", label: "MTC Feeder", amount: 5 },
      { mode: "metro", label: "Chennai Metro", amount: 25 },
      { mode: "train", label: "Southern Railway", amount: 5 },
    ],
    scheduleSource: "Static GTFS schedule",
    isLiveTracking: false,
  };
}

// -----------------------------------------------------------------------------------
// Smart Assistant Grounded Responses
// -----------------------------------------------------------------------------------

export function getSmartAssistantActionReply(
  actionId: string,
  options: MultimodalJourneyOption[],
  activeOptionId: string,
): string {
  if (options.length === 0) {
    return "No verified route alternatives are currently available for this origin and destination.";
  }

  const active = options.find((option) => option.id === activeOptionId) || options[0]!;
  const fareVerified = options.filter((option) => Number.isFinite(option.fare) && option.fare > 0);
  const cheapest = fareVerified.length
    ? [...fareVerified].sort((a, b) => a.fare - b.fare)[0]
    : undefined;
  const fastest = [...options].sort((a, b) => a.durationMinutes - b.durationMinutes)[0]!;
  const direct = options.find((option) => option.transferCount === 0);
  const metroOpt = options.find((option) => option.modes.includes("metro"));
  const busOpt = options.find((option) => option.modes.includes("bus"));
  const mixedOpt = options.find(
    (option) => option.isMixedMode || option.modes.filter((mode) => mode !== "walk").length > 1,
  );

  const fareText = (option: MultimodalJourneyOption) =>
    option.fare > 0 ? "₹" + option.fare : "fare unavailable";
  const durationText = (option: MultimodalJourneyOption) =>
    option.scheduleSource === "Timetable unavailable"
      ? "approximately " + option.durationMinutes + " minutes (estimated)"
      : option.durationMinutes + " minutes from the static timetable";

  switch (actionId) {
    case "cheaper":
      if (!cheapest) return "I cannot compare prices because the current route options do not contain verified fares.";
      if (active.fare <= 0) return "The selected route has no verified fare, so I cannot calculate a saving against it. The lowest verified fare currently available is " + fareText(cheapest) + " for " + cheapest.title + ".";
      if (active.id === cheapest.id) {
        return "Your current selection (" + active.title + ") is already the lowest verified fare at " + fareText(active) + ".";
      }
      return "The lowest verified fare is " + fareText(cheapest) + " for " + cheapest.title +
        ". Your current route fare is " + fareText(active) +
        ". Confirm the final ticket price with the operator before purchase.";

    case "reduce_walking":
      return "The current GTFS route results do not contain reliable station-entrance or interchange walking distances. I cannot rank them by walking distance yet.";

    case "avoid_changing":
      if (active.transferCount === 0) {
        return "Your selected option is a direct service with no transfers.";
      }
      if (direct) {
        return "A direct option is available: " + direct.title + ". Its duration is " + durationText(direct) + ".";
      }
      return "No verified direct service is present in the loaded timetable for this origin and destination.";

    case "fastest":
      return active.id === fastest.id
        ? "Your selected option has the shortest calculated duration among the loaded results: " + durationText(fastest) + "."
        : "The shortest calculated option in the loaded results is " + fastest.title + ", taking " + durationText(fastest) + ".";

    case "metro_alternative":
      if (!metroOpt) return "No verified Metro journey was found in the loaded route data for this origin and destination.";
      {
        const yellowLeg = metroOpt.legs.find((leg) =>
          leg.lineName.toLowerCase().includes("yellow") || leg.routeNumber?.toLowerCase().includes("yellow"),
        );
        const service = yellowLeg?.serviceFrequency
          ? " Published Yellow Line frequency: " + yellowLeg.serviceFrequency
          : "";
        return "Metro option: " + metroOpt.title + ". Duration: " + durationText(metroOpt) +
          ". Fare: " + fareText(metroOpt) + "." + service +
          (metroOpt.scheduleSource === "Timetable unavailable"
            ? " Exact station-level departures are not present in the loaded Yellow Line data."
            : " Departure times are scheduled GTFS times, not live tracking.");
      }

    case "bus_alternative":
      return busOpt
        ? "Verified bus option: " + busOpt.title + ". Duration: " + durationText(busOpt) +
          ". Fare: " + fareText(busOpt) + "."
        : "No direct MTC bus trip between these stops was found in the currently loaded GTFS trips. This does not prove that no bus route exists; the feed may be incomplete.";

    case "mixed_alternative":
      return mixedOpt
        ? "A verified mixed-mode option is available: " + mixedOpt.title +
          ". Duration: " + durationText(mixedOpt) + ". Fare: " + fareText(mixedOpt) + "."
        : "The current planner has not found a fully validated multi-leg transfer journey for this pair. It will not invent connecting buses, stops or interchange times.";

    case "compare_all": {
      const cheapestText = cheapest
        ? "Lowest verified fare: " + cheapest.title + " (" + fareText(cheapest) + ")."
        : "No verified fares are available for comparison.";
      return "Comparing " + options.length + " loaded option(s). Shortest calculated duration: " +
        fastest.title + " (" + durationText(fastest) + "). " + cheapestText +
        (direct ? " A direct option is available." : " No direct option is currently loaded.");
    }

    case "miss_bus":
      return "I cannot confirm a live vehicle position or predict a replacement arrival. Check the scheduled departure times shown in the route details and verify current service status with the operator.";

    default:
      return "How else can I help optimize your Chennai transit journey?";
  }
}

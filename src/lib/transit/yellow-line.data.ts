/**
 * Chennai Metro Phase 2 – Corridor 4 (Yellow Line) Supplemental Dataset
 *
 * PROVENANCE & EFFECTIVE DATES:
 * - Operator: Chennai Metro Rail Limited (CMRL)
 * - Corridor: Phase 2 – Corridor 4 (East-West Corridor)
 * - Operational Passenger Section: Poonamallee Bypass ↔ Vadapalani (11 Stations)
 * - Service Commencement: 11 October 2026
 * - Official Source: CMRL Press Releases (https://chennaimetrorail.org/press-release/)
 * - Data Type: Static scheduled timetable and verified stop network.
 *              Live train tracking is NOT available for this new corridor.
 *
 * OPERATING SCHEDULE & FREQUENCY:
 * - Operating Hours: 06:00 to 21:00 (Daily)
 * - Monday to Saturday:
 *     - Peak Hours (08:00–11:00 & 17:00–20:00): 10-minute headway
 *     - Other Operating Hours (06:00–08:00, 11:00–17:00, 20:00–21:00): 15-minute headway
 * - Sunday & Public Holidays:
 *     - 15-minute headway throughout 06:00–21:00
 *
 * INTERCHANGE:
 * - Vadapalani: Elevated interchange between Phase 2 Yellow Line and Phase 1 Green Line
 *   via internal concourse footbridge (~120m, 2-3 mins walking transfer).
 */

export interface YellowLineStationInfo {
  name: string;
  code: string;
  sequence: number;
  latitude: number;
  longitude: number;
  interchange?: string;
  facilities: string[];
}

export const YELLOW_LINE_METADATA = {
  lineId: "yellow" as const,
  name: "Yellow Line",
  fullName: "Chennai Metro Yellow Line",
  corridor: "Phase 2 – Corridor 4 (Poonamallee Bypass ↔ Vadapalani)",
  operatingSection: "Poonamallee Bypass ↔ Vadapalani",
  color: "#EAB308", // Official Metro Yellow
  badgeColor: "bg-amber-400 text-amber-950 border border-amber-500",
  operatingHours: "06:00–21:00",
  serviceStartDate: "2026-10-11",
  sourceUrl: "https://chennaimetrorail.org/press-release/",
  provenance:
    "Official CMRL Announcements & Phase 2 Corridor 4 Timetable (Effective 11 October 2026). Static scheduled timetable; live GPS tracking not currently active.",
  isLiveTracking: false as const,
};

export const YELLOW_LINE_STATIONS: YellowLineStationInfo[] = [
  {
    name: "Poonamallee Bypass",
    code: "CMRL-Y01",
    sequence: 1,
    latitude: 13.0485,
    longitude: 80.0812,
    facilities: ["Elevators", "Escalators", "Parking", "Wheelchair Accessible"],
  },
  {
    name: "Poonamallee Bus Stand",
    code: "CMRL-Y02",
    sequence: 2,
    latitude: 13.05183,
    longitude: 80.09491,
    facilities: ["MTC Bus Intermodal Bay", "Elevators", "Escalators", "Wheelchair Accessible"],
  },
  {
    name: "Poonamallee Government Hospital",
    code: "CMRL-Y03",
    sequence: 3,
    latitude: 13.05023,
    longitude: 80.09929,
    facilities: ["Hospital Direct Access Subway", "Elevators", "Wheelchair Accessible"],
  },
  {
    name: "Karayanchavadi",
    code: "CMRL-Y04",
    sequence: 4,
    latitude: 13.0482,
    longitude: 80.1085,
    facilities: ["Elevators", "Escalators", "Wheelchair Accessible"],
  },
  {
    name: "Kumananchavadi",
    code: "CMRL-Y05",
    sequence: 5,
    latitude: 13.0448,
    longitude: 80.11589,
    facilities: ["Elevators", "Escalators", "Wheelchair Accessible"],
  },
  {
    name: "Kattupakkam",
    code: "CMRL-Y06",
    sequence: 6,
    latitude: 13.0415,
    longitude: 80.131,
    facilities: ["Elevators", "Escalators", "Wheelchair Accessible"],
  },
  {
    name: "Iyappanthangal",
    code: "CMRL-Y07",
    sequence: 7,
    latitude: 13.0378,
    longitude: 80.1415,
    facilities: ["MTC Bus Depot Access", "Elevators", "Escalators", "Wheelchair Accessible"],
  },
  {
    name: "Thelliyaragaram",
    code: "CMRL-Y08",
    sequence: 8,
    latitude: 13.0392,
    longitude: 80.1472,
    facilities: ["Elevators", "Escalators", "Wheelchair Accessible"],
  },
  {
    name: "Porur Bypass",
    code: "CMRL-Y09",
    sequence: 9,
    latitude: 13.04562,
    longitude: 80.14962,
    facilities: ["Elevators", "Escalators", "Wheelchair Accessible"],
  },
  {
    name: "Porur Junction",
    code: "CMRL-Y10",
    sequence: 10,
    latitude: 13.03465,
    longitude: 80.15653,
    facilities: [
      "Arterial Mount-Poonamallee Rd Crossing",
      "Elevators",
      "Escalators",
      "Wheelchair Accessible",
    ],
  },
  {
    name: "Vadapalani",
    code: "CMRL-Y11",
    sequence: 11,
    latitude: 13.05106,
    longitude: 80.21168,
    interchange: "Green Line",
    facilities: [
      "Interchange with Metro Green Line (via 120m internal concourse footbridge)",
      "Elevators",
      "Escalators",
      "Wheelchair Accessible",
    ],
  },
];

export const YELLOW_LINE_STATION_NAMES = YELLOW_LINE_STATIONS.map((s) => s.name);

/** Average inter-station running time on Corridor 4 elevated section is ~2.2 minutes. */
export const YELLOW_LINE_INTERSTATION_MINUTES = 2.2;

/**
 * Normalizes station query to match Yellow Line stations
 */
export function matchYellowLineStation(query: string): YellowLineStationInfo | undefined {
  const q = query
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(metro|station|stop)\b/g, "")
    .trim();

  return YELLOW_LINE_STATIONS.find((s) => {
    const sName = s.name
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9 ]/g, " ")
      .trim();
    return sName === q || sName.includes(q) || q.includes(sName);
  });
}

/**
 * Calculates official operating frequency (headway) for a given time and day
 */
export function getYellowLineHeadwayMinutes(
  timeStr: string,
  isSundayOrHoliday: boolean = false,
): number {
  if (isSundayOrHoliday) {
    return 15;
  }

  const parts = timeStr.split(":").map(Number);
  const hour = parts[0] ?? 8;
  const minute = parts[1] ?? 0;
  const totalMinutes = hour * 60 + minute;

  // Peak 1: 08:00 to 11:00 (480 to 660 mins)
  if (totalMinutes >= 480 && totalMinutes < 660) {
    return 10;
  }
  // Peak 2: 17:00 to 20:00 (1020 to 1200 mins)
  if (totalMinutes >= 1020 && totalMinutes < 1200) {
    return 10;
  }

  return 15;
}

/**
 * Calculates run time and stops between two Yellow Line stations
 */
export function getYellowLineTripDetails(fromStation: string, toStation: string) {
  const from = matchYellowLineStation(fromStation);
  const to = matchYellowLineStation(toStation);
  if (!from || !to || from.sequence === to.sequence) {
    return null;
  }

  const isForward = from.sequence < to.sequence;
  const stops = isForward
    ? YELLOW_LINE_STATIONS.slice(from.sequence - 1, to.sequence)
    : YELLOW_LINE_STATIONS.slice(to.sequence - 1, from.sequence).reverse();

  const hopCount = stops.length - 1;
  const durationMinutes = Math.round(hopCount * YELLOW_LINE_INTERSTATION_MINUTES);

  return {
    from,
    to,
    stops,
    hopCount,
    durationMinutes,
    direction: isForward ? "Towards Vadapalani" : "Towards Poonamallee Bypass",
  };
}

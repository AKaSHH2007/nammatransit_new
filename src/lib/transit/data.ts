// Sample Chennai Metro dataset for the NammaTransit AI prototype.
// Station order follows the published CMRL Phase 1 lines. Fares, facilities
// and alerts are DEMO values and must always be labelled as such in the UI.

export type LineId = "blue" | "green" | "yellow";

export const LINES: Record<LineId, { name: string; stations: string[] }> = {
  blue: {
    name: "Blue Line",
    stations: [
      "Wimco Nagar Depot",
      "Wimco Nagar",
      "Tiruvottiyur",
      "Tiruvottiyur Theradi",
      "Kaladipet",
      "Tollgate",
      "New Washermenpet",
      "Tondiarpet",
      "Thiyagaraya College",
      "Washermenpet",
      "Mannadi",
      "High Court",
      "Chennai Central",
      "Government Estate",
      "LIC",
      "Thousand Lights",
      "AG-DMS",
      "Teynampet",
      "Nandanam",
      "Saidapet",
      "Little Mount",
      "Guindy",
      "Alandur",
      "Nanganallur Road",
      "Meenambakkam",
      "Chennai Airport",
    ],
  },
  green: {
    name: "Green Line",
    stations: [
      "Chennai Central",
      "Egmore",
      "Nehru Park",
      "Kilpauk",
      "Pachaiyappa's College",
      "Shenoy Nagar",
      "Anna Nagar East",
      "Anna Nagar Tower",
      "Thirumangalam",
      "Koyambedu",
      "CMBT",
      "Arumbakkam",
      "Vadapalani",
      "Ashok Nagar",
      "Ekkattuthangal",
      "Alandur",
      "St. Thomas Mount",
    ],
  },
  yellow: {
    name: "Yellow Line",
    stations: [
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
    ],
  },
};

export const ALL_STATIONS = Array.from(new Set(Object.values(LINES).flatMap((l) => l.stations)));

export const ALIASES: Record<string, string> = {
  airport: "Chennai Airport",
  "meenambakkam airport": "Chennai Airport",
  central: "Chennai Central",
  "mgr central": "Chennai Central",
  "anna nagar": "Anna Nagar Tower",
  "st thomas mount": "St. Thomas Mount",
  "st. thomas mount": "St. Thomas Mount",
  "thomas mount": "St. Thomas Mount",
  pachaiyappas: "Pachaiyappa's College",
  "pachaiyappas college": "Pachaiyappa's College",
  dms: "AG-DMS",
  "ag dms": "AG-DMS",
  "koyambedu bus stand": "CMBT",
  "cmbt bus stand": "CMBT",
  "poonamallee bypass": "Poonamallee Bypass",
  "poonamallee bus stand": "Poonamallee Bus Stand",
  "poonamallee gh": "Poonamallee Government Hospital",
  "poonamallee hospital": "Poonamallee Government Hospital",
  karayanchavadi: "Karayanchavadi",
  kumananchavadi: "Kumananchavadi",
  kattupakkam: "Kattupakkam",
  iyappanthangal: "Iyappanthangal",
  iyyappanthangal: "Iyappanthangal",
  thelliyaragaram: "Thelliyaragaram",
  telliyaragaram: "Thelliyaragaram",
  "porur bypass": "Porur Bypass",
  "porur junction": "Porur Junction",
  "porur jn": "Porur Junction",
  porur: "Porur Junction",
  vadapalani: "Vadapalani",
};

/** Illustrative fare slabs by number of stops travelled. NOT official fares. */
export const DEMO_FARE_SLABS = [
  { maxStops: 2, fare: 10 },
  { maxStops: 5, fare: 20 },
  { maxStops: 8, fare: 30 },
  { maxStops: 12, fare: 40 },
  { maxStops: 999, fare: 50 },
];

export const OFFICIAL_LINKS = {
  cmrlTickets: "https://chennaimetrorail.org/ticketing/",
  cmrl: "https://chennaimetrorail.org/",
  mtc: "https://mtcbus.tn.gov.in/",
  southernRailway: "https://sr.indianrailways.gov.in/",
  cmrlGrievance: "https://chennaimetrorail.org/contact-us/",
  mtcGrievance: "https://mtcbus.tn.gov.in/",
  railGrievance: "https://railmadad.indianrailways.gov.in/",
};

export const INTERCHANGES = ["Chennai Central", "Alandur", "Vadapalani"];

export type Alert = {
  id: string;
  affected: string;
  type: "Maintenance" | "Delay" | "Crowding" | "Facility";
  description: string;
  source: string;
  updatedAt: string;
  alternative?: string;
};

export const DEMO_ALERTS: Alert[] = [
  {
    id: "a1",
    affected: "Guindy (Blue Line)",
    type: "Facility",
    description: "Lift near Gate B under scheduled maintenance (simulated scenario).",
    source: "Demo dataset",
    updatedAt: "2026-11-05T07:30:00+05:30",
  },
  {
    id: "a2",
    affected: "Green Line — Koyambedu to Vadapalani",
    type: "Delay",
    description: "Trains running with 5–7 minute extra headway (simulated scenario).",
    source: "Demo dataset",
    updatedAt: "2026-11-05T08:15:00+05:30",
  },
  {
    id: "a3",
    affected: "Chennai Central",
    type: "Crowding",
    description: "Heavy footfall expected during evening peak (simulated scenario).",
    source: "Demo dataset",
    updatedAt: "2026-11-05T09:00:00+05:30",
  },
];

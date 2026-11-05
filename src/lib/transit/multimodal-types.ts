export type TransportMode = "metro" | "bus" | "train" | "walk";

export type JourneyStop = {
  name: string;
  stopId?: string;
  arrival?: string;
  departure?: string;
  latitude?: number;
  longitude?: number;
};

export type JourneyLeg = {
  id: string;
  mode: TransportMode;
  lineName: string;
  routeNumber?: string;
  operator: string;
  fromStation: string;
  toStation: string;
  boardStation?: string; // Guaranteed explicit boarding station
  alightStation?: string; // Guaranteed explicit alighting station
  serviceDirection?: string; // E.g. "Towards Airport", "Airport"
  headsign?: string;
  departureTime?: string;
  arrivalTime?: string;
  durationMinutes: number;
  stopsCount: number;
  intermediateStops: JourneyStop[];
  walkingDistanceMeters?: number;
  walkingDurationMinutes?: number;
  waitingDurationMinutes?: number;
  fareRupees?: number;
  standardFare?: number | null;
  digitalFare?: number | null;
  fareCategory?: string;
  discountNote?: string;
  color: string;
  instruction?: string;
  serviceWindow?: string;
  serviceFrequency?: string;
  serviceNotice?: string;
};

export type JourneyHighlight =
  "best_overall" | "fastest" | "cheapest" | "fewest_transfers" | "least_walking";

export type MultimodalJourneyOption = {
  id: string;
  optionNumber?: number;
  title: string;
  description: string;
  durationMinutes: number;
  fare: number;
  standardFare?: number | null;
  digitalFare?: number | null;
  discountAmount?: number | null;
  transferCount: number;
  walkingDistanceMeters: number;
  totalStops: number;
  departureTime: string;
  arrivalTime: string;
  originStation?: string;
  destinationStation?: string;
  modes: TransportMode[];
  legs: JourneyLeg[];
  highlights: JourneyHighlight[];
  compositeScore?: number;
  isMixedMode?: boolean;
  fareBreakdown?: Array<{ mode: TransportMode; label: string; amount: number }>;
  scheduleSource: "Static GTFS schedule" | "Estimated GTFS schedule" | "Timetable unavailable";
  isLiveTracking: false;
};

export type RouteFilter =
  | "all"
  | "fastest"
  | "metro"
  | "yellow_line"
  | "bus"
  | "train"
  | "mixed"
  | "cheapest"
  | "fewest_transfers"
  | "least_walking";

export type ModePreference = "metro" | "bus" | "train" | "any";
export type ModeConstraint = "metro" | "bus" | "train" | "none";

export type JourneySearchParams = {
  origin: string;
  destination: string;
  travelDate?: string;
  departureTime?: string;
  preferredMode?: ModePreference;
  modeConstraint?: ModeConstraint;
};

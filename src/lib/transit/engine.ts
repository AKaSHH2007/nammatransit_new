import {
  ALIASES,
  ALL_STATIONS,
  DEMO_ALERTS,
  DEMO_FARE_SLABS,
  INTERCHANGES,
  LINES,
  OFFICIAL_LINKS,
  type Alert,
  type LineId,
} from "./data";
import { resolveLocation, extractAndResolveLocations } from "./location-resolver";
import { calculateMetroFare } from "./fares";

export type Leg = {
  line: string;
  lineId: LineId;
  from: string;
  to: string;
  direction: string;
  stops: string[];
};

export type JourneySchedule = {
  departures: string[];
  durationMinutes: number;
  serviceDate?: string | undefined;
  source?: string | undefined;
};

import type { MultimodalJourneyOption } from "./multimodal-types";

export type Journey = {
  origin: string;
  destination: string;
  mode: string;
  legs: Leg[];
  totalStops: number;
  interchange?: string;
  schedule?: JourneySchedule | undefined;
  multimodalOptions?: MultimodalJourneyOption[] | undefined;
};

export type GrievanceDraft = {
  operator?: string | undefined;
  location?: string | undefined;
  category?: string | undefined;
  description?: string | undefined;
  datetime?: string | undefined;
};

export type Card =
  | { kind: "journey"; journey: Journey }
  | { kind: "fare"; journey: Journey; fare: number }
  | { kind: "facility"; station: string }
  | { kind: "alerts"; alerts: Alert[] }
  | { kind: "grievance"; draft: Record<keyof GrievanceDraft, string>; link: string };

export type Context = {
  origin?: string | undefined;
  destination?: string | undefined;
  lastStation?: string | undefined;
  travelDate?: string | undefined;
  grievance?: { step: keyof GrievanceDraft; data: GrievanceDraft } | undefined;
};

export type ChatReply = { reply: string; cards: Card[]; suggestions: string[]; context: Context };

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9. ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const NAME_INDEX: [string, string][] = [
  ...ALL_STATIONS.map((s) => [norm(s), s] as [string, string]),
  ...Object.entries(ALIASES).map(([k, v]) => [norm(k), v] as [string, string]),
].sort((a, b) => b[0].length - a[0].length);

/** Find stations mentioned in text, in order of appearance. */
export function findStations(text: string): { name: string; index: number }[] {
  let t = " " + norm(text).replace(/\bmetro\b|\bstation\b/g, " ") + " ";
  const hits: { name: string; index: number }[] = [];
  for (const [key, name] of NAME_INDEX) {
    const needle = " " + key + " ";
    let i = t.indexOf(needle);
    while (i !== -1) {
      hits.push({ name, index: i });
      t = t.slice(0, i) + " " + "#".repeat(key.length) + " " + t.slice(i + needle.length);
      i = t.indexOf(needle);
    }
  }
  return hits.sort((a, b) => a.index - b.index);
}

function legOn(lineId: LineId, from: string, to: string): Leg | null {
  const st = LINES[lineId].stations;
  const a = st.indexOf(from),
    b = st.indexOf(to);
  if (a < 0 || b < 0 || a === b) return null;
  const stops = a < b ? st.slice(a, b + 1) : st.slice(b, a + 1).reverse();
  return {
    line: LINES[lineId].name,
    lineId,
    from,
    to,
    direction: `Towards ${a < b ? st[st.length - 1] : st[0]}`,
    stops,
  };
}

export function planJourney(origin: string, destination: string): Journey | null {
  const oRes = resolveLocation(origin);
  const dRes = resolveLocation(destination);
  const o = oRes.resolved || ALIASES[origin.toLowerCase().trim()] || origin;
  const d = dRes.resolved || ALIASES[destination.toLowerCase().trim()] || destination;
  if (o.toLowerCase() === d.toLowerCase()) return null;
  for (const id of Object.keys(LINES) as LineId[]) {
    const leg = legOn(id, o, d);
    if (leg)
      return {
        origin: o,
        destination: d,
        mode: "Chennai Metro",
        legs: [leg],
        totalStops: leg.stops.length - 1,
      };
  }
  let best: Journey | null = null;
  for (const x of INTERCHANGES) {
    for (const l1 of Object.keys(LINES) as LineId[])
      for (const l2 of Object.keys(LINES) as LineId[]) {
        if (l1 === l2) continue;
        const a = legOn(l1, o, x),
          b = legOn(l2, x, d);
        if (!a || !b) continue;
        const total = a.stops.length - 1 + b.stops.length - 1;
        if (!best || total < best.totalStops)
          best = {
            origin,
            destination,
            mode: "Chennai Metro",
            legs: [a, b],
            totalStops: total,
            interchange: x,
          };
      }
  }
  if (best) return best;

  for (const x1 of INTERCHANGES) {
    for (const x2 of INTERCHANGES) {
      if (x1 === x2) continue;
      for (const l1 of Object.keys(LINES) as LineId[]) {
        for (const l2 of Object.keys(LINES) as LineId[]) {
          if (l1 === l2) continue;
          for (const l3 of Object.keys(LINES) as LineId[]) {
            if (l2 === l3) continue;
            const a = legOn(l1, o, x1);
            const b = legOn(l2, x1, x2);
            const c = legOn(l3, x2, d);
            if (!a || !b || !c) continue;
            const total = a.stops.length - 1 + b.stops.length - 1 + c.stops.length - 1;
            if (!best || total < best.totalStops) {
              best = {
                origin,
                destination,
                mode: "Chennai Metro",
                legs: [a, b, c],
                totalStops: total,
                interchange: `${x1} & ${x2}`,
              };
            }
          }
        }
      }
    }
  }

  return best;
}

export function demoFare(stops: number): number {
  return DEMO_FARE_SLABS.find((s) => stops <= s.maxStops)!.fare;
}

const OPERATORS: Record<string, string> = {
  metro: "CMRL (Chennai Metro)",
  cmrl: "CMRL (Chennai Metro)",
  bus: "MTC (Bus)",
  mtc: "MTC (Bus)",
  train: "Southern Railway (Suburban)",
  suburban: "Southern Railway (Suburban)",
  rail: "Southern Railway (Suburban)",
};

const GRIEVANCE_STEPS: { key: keyof GrievanceDraft; ask: string; chips: string[] }[] = [
  {
    key: "operator",
    ask: "Which transport operator is this about?",
    chips: ["Metro", "MTC Bus", "Suburban train"],
  },
  {
    key: "location",
    ask: "Which station or route did this happen at?",
    chips: ["Guindy", "Chennai Central", "Route 21G"],
  },
  {
    key: "category",
    ask: "What type of problem was it?",
    chips: ["Cleanliness", "Staff behaviour", "Lift / escalator", "Overcrowding", "Ticketing"],
  },
  { key: "description", ask: "Please describe what happened in a sentence or two.", chips: [] },
  {
    key: "datetime",
    ask: "When did it happen? (date and time)",
    chips: ["Today morning", "Yesterday evening"],
  },
];

function grievanceLink(op?: string) {
  if (op?.startsWith("MTC")) return OFFICIAL_LINKS.mtcGrievance;
  if (op?.startsWith("Southern")) return OFFICIAL_LINKS.railGrievance;
  return OFFICIAL_LINKS.cmrlGrievance;
}

function continueGrievance(msg: string, ctx: Context): ChatReply {
  const g = ctx.grievance!;
  let value = msg.trim();
  if (g.step === "operator") {
    const k = Object.keys(OPERATORS).find((o) => norm(msg).includes(o));
    value = k ? OPERATORS[k]! : value;
  }
  const data = { ...g.data, [g.step]: value };
  const idx = GRIEVANCE_STEPS.findIndex((s) => s.key === g.step);
  const next = GRIEVANCE_STEPS.slice(idx + 1).find((s) => !data[s.key]);
  if (next) {
    return {
      reply: next.ask,
      cards: [],
      suggestions: [...next.chips, "Cancel complaint"],
      context: { ...ctx, grievance: { step: next.key, data } },
    };
  }
  const draft = data as Record<keyof GrievanceDraft, string>;
  return {
    reply:
      "Here is your complaint draft. You can edit it, copy it, and submit it yourself on the official portal. Nothing has been submitted.",
    cards: [{ kind: "grievance", draft, link: grievanceLink(draft.operator) }],
    suggestions: ["Report another problem", "Show service updates"],
    context: { ...ctx, grievance: undefined },
  };
}

const has = (t: string, re: RegExp) => re.test(t);

export function respond(message: string, ctxIn: Context = {}): ChatReply {
  const ctx: Context = { ...ctxIn };
  const t = norm(message);
  const extracted = extractAndResolveLocations(message);
  const hasResolvedLocation = Boolean(extracted.origin?.resolved || extracted.destination?.resolved);
  const isJourneyIntent =
    /\b(?:from|to|travel|route|journey|metro|bus|train|fare|ticket|go|reach|how do i|show route)\b/i.test(message) &&
    hasResolvedLocation;

  // A new journey request interrupts complaint collection.
  if (ctx.grievance && /\bcancel\b/i.test(message)) {
    return {
      reply: "Complaint draft cancelled. How else can I help?",
      cards: [],
      suggestions: defaultChips(ctx),
      context: { ...ctx, grievance: undefined },
    };
  }
  if (ctx.grievance && !isJourneyIntent) return continueGrievance(message, ctx);
  if (ctx.grievance && isJourneyIntent) ctx.grievance = undefined;

  if (has(t, /complain|complaint|grievance|report (a )?problem|report an issue|report another/)) {
    const first = GRIEVANCE_STEPS[0]!;
    return {
      reply: "I'll help you prepare a complaint draft. " + first.ask,
      cards: [],
      suggestions: [...first.chips, "Cancel complaint"],
      context: { ...ctx, grievance: { step: "operator", data: {} } },
    };
  }

  if (has(t, /alert|disruption|delay|service update|status|closed|strike/)) {
    return {
      reply: "These are demonstration service alerts from the sample dataset — they are simulated and not live.",
      cards: [{ kind: "alerts", alerts: DEMO_ALERTS }],
      suggestions: defaultChips(ctx),
      context: ctx,
    };
  }

  if (extracted.disambiguationPrompt) {
    return {
      reply: extracted.disambiguationPrompt,
      cards: [],
      suggestions: extracted.origin?.ambiguousCandidates || extracted.destination?.ambiguousCandidates || defaultChips(ctx),
      context: ctx,
    };
  }

  const stations = findStations(message);
  const origin = extracted.origin?.resolved || ctx.origin;
  const destination = extracted.destination?.resolved || ctx.destination;
  const wantsFacility = has(t, /accessib|lift|elevator|wheelchair|ramp|facilit|disab/);
  const wantsFare = has(t, /fare|cost|price|how much|ticket|charge/);
  const journeyChanged = origin !== ctx.origin || destination !== ctx.destination;
  const nextContext: Context = { ...ctx, origin, destination, lastStation: origin || ctx.lastStation };

  if (wantsFacility) {
    const station = stations[0]?.name ||
      (has(t, /destination|end|arriv/) ? destination : has(t, /start|origin|board/) ? origin : ctx.lastStation ?? origin);
    if (!station) {
      return {
        reply: "Which station would you like accessibility information for?",
        cards: [],
        suggestions: ["Is Guindy accessible?", "Lifts at Chennai Central"],
        context: ctx,
      };
    }
    return {
      reply: "Here are the published facilities for " + station + ". Live lift operating status is not available.",
      cards: [{ kind: "facility", station }],
      suggestions: ["Any service alerts?", ...defaultChips({ ...ctx, lastStation: station })].slice(0, 4),
      context: { ...ctx, lastStation: station },
    };
  }

  const asksForJourney = journeyChanged || has(t, /how (do|can|to)|travel|route|go|reach|journey|way|show route/);
  if (asksForJourney) {
    if (origin && destination) {
      if (origin.toLowerCase() === destination.toLowerCase()) {
        return {
          reply: "Starting station and destination cannot be the same (" + origin + "). Please choose two different locations.",
          cards: [],
          suggestions: defaultChips({ ...ctx, destination: undefined }),
          context: { ...ctx, origin, destination: undefined, grievance: undefined },
        };
      }

      const journey = planJourney(origin, destination);
      const updatedContext: Context = { ...nextContext, grievance: undefined };
      if (!journey) {
        // A valid public-transport trip may not be a direct Metro trip.
        // The server-side multimodal planner also searches MTC and rail feeds.
        return {
          reply: "I have your journey as " + origin + " → " + destination + ". Checking Metro, MTC bus and suburban rail schedules.",
          cards: [],
          suggestions: ["Show all transport options", "Show scheduled departures"],
          context: updatedContext,
        };
      }

      const cards: Card[] = [{ kind: "journey", journey }];
      const fareDetail = calculateMetroFare(origin, destination, journey.totalStops);
      const fareIsAvailable = fareDetail.isAvailable && !fareDetail.fareUnavailable &&
        fareDetail.standardFare !== null && fareDetail.standardFare > 0;
      if (wantsFare && fareIsAvailable) {
        cards.push({ kind: "fare", journey, fare: fareDetail.standardFare! });
      }
      const via = journey.interchange ? " with a change at " + journey.interchange : " directly";
      const fareText = fareIsAvailable
        ? " Published fare shown in the fare card: ₹" + fareDetail.standardFare + "."
        : " An exact fare is not available for this station pair.";
      return {
        reply: "You can travel by Chennai Metro from " + origin + " to " + destination + via +
          " — " + journey.totalStops + " stops." + fareText,
        cards,
        suggestions: ["What is the fare?", "Show scheduled departures", "Is the starting station accessible?"],
        context: updatedContext,
      };
    }

    if (origin || destination) {
      const updatedContext: Context = { ...ctx, origin, destination, grievance: undefined };
      return {
        reply: origin ? "Got it, starting from " + origin + ". Where would you like to go?" :
          "Got it, heading to " + destination + ". Where are you starting from?",
        cards: [],
        suggestions: origin ? ["To Chennai Airport", "To Koyambedu"] : ["From Guindy", "From Chennai Central"],
        context: updatedContext,
      };
    }
  }

  if (wantsFare) {
    if (!origin || !destination) {
      return {
        reply: "Tell me your journey first — for example, “Fare from Guindy to Chennai Airport”.",
        cards: [],
        suggestions: ["Fare from Guindy to Chennai Airport"],
        context: ctx,
      };
    }
    const journey = planJourney(origin, destination);
    if (!journey) {
      return {
        reply: "I don't have a verified Metro fare for " + origin + " to " + destination + ".",
        cards: [],
        suggestions: ["Show all transport options"],
        context: nextContext,
      };
    }
    const fareDetail = calculateMetroFare(origin, destination, journey.totalStops);
    if (!fareDetail.isAvailable || fareDetail.fareUnavailable || !fareDetail.standardFare) {
      return {
        reply: "The exact published fare for " + origin + " to " + destination + " is not available in the configured fare table.",
        cards: [],
        suggestions: ["Show the journey route"],
        context: nextContext,
      };
    }
    return {
      reply: "For " + origin + " → " + destination + ", the published Metro fare is ₹" + fareDetail.standardFare + ".",
      cards: [{ kind: "fare", journey, fare: fareDetail.standardFare }],
      suggestions: ["Show scheduled departures", "How do I buy a ticket?"],
      context: nextContext,
    };
  }

  if (stations.length === 1) {
    const station = stations[0]!.name;
    return {
      reply: "What would you like to know about " + station + "?",
      cards: [],
      suggestions: ["From " + station + " to Chennai Airport", "Is " + station + " accessible?"],
      context: { ...ctx, lastStation: station },
    };
  }

  if (has(t, /^(hi|hello|hey|vanakkam)\b/)) {
    return {
      reply: "Vanakkam! I can help with Chennai Metro, MTC buses, suburban trains, fares, accessibility, service alerts and complaint drafts.",
      cards: [],
      suggestions: defaultChips(ctx),
      context: ctx,
    };
  }

  return {
    reply: "I'm not sure I understood. I can help plan Chennai Metro, MTC bus and suburban rail journeys, check available fares and schedules, explain accessibility, or draft a complaint.",
    cards: [],
    suggestions: defaultChips(ctx),
    context: ctx,
  };
}

function defaultChips(ctx: Context) {
  return ctx.origin && ctx.destination
    ? ["What is the fare?", "Is the starting station accessible?", "Any service alerts?"]
    : ["Guindy to Chennai Airport", "Fares and tickets", "Any service alerts?", "Report a problem"];
}

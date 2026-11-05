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

  if (ctx.grievance) {
    if (has(t, /\bcancel\b/))
      return {
        reply: "Complaint draft cancelled. How else can I help?",
        cards: [],
        suggestions: defaultChips(ctx),
        context: { ...ctx, grievance: undefined },
      };
    return continueGrievance(message, ctx);
  }

  if (has(t, /complain|complaint|grievance|report (a )?problem|report an issue|report another/)) {
    const first = GRIEVANCE_STEPS[0]!;
    return {
      reply: `I'll help you prepare a complaint draft. ${first.ask}`,
      cards: [],
      suggestions: [...first.chips, "Cancel complaint"],
      context: { ...ctx, grievance: { step: "operator", data: {} } },
    };
  }

  if (has(t, /alert|disruption|delay|service update|status|closed|strike/)) {
    return {
      reply:
        "These are demonstration service alerts from the sample dataset — they are simulated and not live.",
      cards: [{ kind: "alerts", alerts: DEMO_ALERTS }],
      suggestions: defaultChips(ctx),
      context: ctx,
    };
  }

  const extracted = extractAndResolveLocations(message);
  if (extracted.disambiguationPrompt) {
    return {
      reply: extracted.disambiguationPrompt,
      cards: [],
      suggestions:
        extracted.origin?.ambiguousCandidates ||
        extracted.destination?.ambiguousCandidates ||
        defaultChips(ctx),
      context: ctx,
    };
  }

  const stations = findStations(message);

  // Slot updates for journeys
  let origin = ctx.origin,
    destination = ctx.destination;
  let typoCorrectionMessage: string | undefined;

  if (extracted.origin?.resolved) {
    origin = extracted.origin.resolved;
    if (extracted.origin.isCorrected) {
      typoCorrectionMessage = `I understood your starting point as ${origin}.`;
    }
  }

  if (extracted.destination?.resolved) {
    destination = extracted.destination.resolved;
    if (extracted.destination.isCorrected && !typoCorrectionMessage) {
      typoCorrectionMessage = `I understood your destination as ${destination}.`;
    }
  }

  const fromM = t.match(
    /\b(?:from|starting from|start from|starting at|board at)\s+(.+?)(?:\s+(?:to|towards|till)\s+|$)/,
  );
  const toM = t.match(/\b(?:to|towards|till|going to|reach)\s+(.+)$/);
  const fromHit = fromM
    ? resolveLocation(fromM[1] ?? "").resolved || findStations(fromM[1] ?? "")[0]?.name
    : undefined;
  const toHit = toM
    ? resolveLocation(toM[1] ?? "").resolved || findStations(toM[1] ?? "")[0]?.name
    : undefined;
  if (fromHit) origin = fromHit;
  if (toHit) destination = toHit;
  if (toHit && !fromHit && stations.length >= 2 && stations[0]!.name !== toHit)
    origin = stations[0]!.name;
  if (!fromHit && !toHit && stations.length >= 2 && !origin && !destination) {
    origin = stations[0]!.name;
    destination = stations[1]!.name;
  }

  const wantsFacility = has(t, /accessib|lift|elevator|wheelchair|ramp|facilit|disab/);
  const wantsFare = has(t, /fare|cost|price|how much|ticket|charge/);
  const journeyChanged = origin !== ctx.origin || destination !== ctx.destination;

  if (wantsFacility) {
    let station = stations[0]?.name;
    if (!station)
      station = has(t, /destination|end|arriv/)
        ? ctx.destination
        : has(t, /start|origin|board/)
          ? ctx.origin
          : (ctx.lastStation ?? ctx.origin);
    if (!station)
      return {
        reply: "Which station would you like accessibility information for?",
        cards: [],
        suggestions: ["Is Guindy accessible?", "Lifts at Chennai Central"],
        context: ctx,
      };
    return {
      reply: `Here are the published facilities for ${station} (from the sample dataset). Live lift status is not available.`,
      cards: [{ kind: "facility", station }],
      suggestions: ["Any service alerts?", ...defaultChips({ ...ctx, lastStation: station })].slice(
        0,
        4,
      ),
      context: { ...ctx, lastStation: station },
    };
  }

  if (journeyChanged || has(t, /how (do|can|to)|travel|route|go|reach|journey|way/)) {
    if (origin && destination) {
      if (origin.toLowerCase() === destination.toLowerCase()) {
        return {
          reply: `Starting station and destination cannot be the same (${origin}). Please choose different start and destination locations.`,
          cards: [],
          suggestions: defaultChips({ ...ctx, origin, destination: undefined }),
          context: { ...ctx, origin, destination: undefined },
        };
      }
      const j = planJourney(origin, destination);
      const next = { ...ctx, origin, destination, lastStation: origin };
      if (!j)
        return {
          reply: `I couldn't find a supported Metro journey from ${origin} to ${destination} in the dataset.`,
          cards: [],
          suggestions: defaultChips(next),
          context: next,
        };
      const cards: Card[] = [{ kind: "journey", journey: j }];
      const officialMetroFare = calculateMetroFare(origin, destination, j.totalStops);
      const effectiveFare = officialMetroFare.standardFare ?? demoFare(j.totalStops);
      if (wantsFare) cards.push({ kind: "fare", journey: j, fare: effectiveFare });
      const via = j.interchange ? ` with a change at ${j.interchange}` : " directly";
      const prefix = typoCorrectionMessage ? `${typoCorrectionMessage}\n\n` : "";
      return {
        reply: `${prefix}You can take Chennai Metro from ${origin} to ${destination}${via} — ${j.totalStops} stops (Fare: ₹${effectiveFare}).`,
        cards,
        suggestions: [
          "What is the fare?",
          "Is the starting station accessible?",
          `What about starting from ${origin === "Alandur" ? "Guindy" : "Alandur"}?`,
        ],
        context: next,
      };
    }
    if (origin || destination) {
      const next = { ...ctx, origin, destination };
      return {
        reply: origin
          ? `Got it, starting from ${origin}. Where would you like to go?`
          : `Got it, heading to ${destination}. Where are you starting from?`,
        cards: [],
        suggestions: origin
          ? ["To Chennai Airport", "To Koyambedu"]
          : ["From Guindy", "From Chennai Central"],
        context: next,
      };
    }
  }

  if (wantsFare) {
    if (!ctx.origin || !ctx.destination)
      return {
        reply: "Tell me your journey first — for example, “Fare from Guindy to Chennai Airport”.",
        cards: [],
        suggestions: ["Fare from Guindy to Chennai Airport"],
        context: ctx,
      };
    const j = planJourney(ctx.origin, ctx.destination);
    if (!j)
      return {
        reply: "I couldn't find that journey in the dataset.",
        cards: [],
        suggestions: [],
        context: ctx,
      };
    return {
      reply: `For your journey ${j.origin} → ${j.destination}, here is the fare from the sample dataset (illustrative, not official).`,
      cards: [{ kind: "fare", journey: j, fare: demoFare(j.totalStops) }],
      suggestions: [
        "Is the starting station accessible?",
        "Any service alerts?",
        "How do I buy a ticket?",
      ],
      context: ctx,
    };
  }

  if (stations.length === 1) {
    const s = stations[0]!.name;
    return {
      reply: `What would you like to know about ${s}?`,
      cards: [],
      suggestions: [`From ${s} to Chennai Airport`, `Is ${s} accessible?`],
      context: { ...ctx, lastStation: s },
    };
  }

  if (has(t, /^(hi|hello|hey|vanakkam)\b/)) {
    return {
      reply:
        "Vanakkam! I can help with Chennai Metro journeys, fares, accessibility, service alerts and complaint drafts.",
      cards: [],
      suggestions: defaultChips(ctx),
      context: ctx,
    };
  }

  return {
    reply:
      "I'm not sure I understood. I can plan Metro journeys, show demo fares, station accessibility, service alerts, or draft a complaint.",
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

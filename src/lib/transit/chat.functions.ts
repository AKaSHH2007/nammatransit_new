import { GoogleGenAI } from "@google/genai";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { respond, type Context, type JourneySchedule, type Card } from "./engine";
import { planMultimodalJourneys } from "./multimodal-planner";
import { extractAndResolveLocations } from "./location-resolver";
import { extractTravelDate, extractDepartureTime, extractModePreferences } from "./datetime-utils";

export { extractTravelDate, extractDepartureTime, extractModePreferences };

const HistorySchema = z
  .array(
    z.object({
      role: z.enum(["user", "assistant"]),
      text: z.string().max(4000),
    }),
  )
  .max(16)
  .default([]);

export const sendChat = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        message: z.string().min(1).max(1000),
        context: z.record(z.any()).default({}),
        history: HistorySchema,
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const context = data.context as Context;
    // Resolve "today"/"tomorrow" and default departure filtering in Chennai local time.
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(now);
    const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
    const chennaiDate = part("year") + "-" + part("month") + "-" + part("day");
    const chennaiMidday = new Date(chennaiDate + "T12:00:00.000Z");
    const chennaiClockParts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(now);
    const clockPart = (type: string) => chennaiClockParts.find((item) => item.type === type)?.value || "00";
    const chennaiTime = clockPart("hour") + ":" + clockPart("minute") + ":" + clockPart("second");
    const detectedDate = extractTravelDate(data.message, chennaiMidday);
    const requestedTime = extractDepartureTime(data.message);
    const { preferredMode, modeConstraint } = extractModePreferences(data.message);

    const activeContext: Context = {
      ...context,
      // Use today's Chennai service calendar by default, rather than all trips in the feed.
      travelDate: detectedDate || context.travelDate || chennaiDate,
    };
    const departureAfter =
      requestedTime || (activeContext.travelDate === chennaiDate ? chennaiTime : undefined);

    let localReply = respond(data.message, activeContext);

    // If the curated alias resolver does not know a place, fall back to the
    // complete GTFS stops table. This allows valid stops outside the small
    // hand-maintained station list to be recognized without inventing names.
    const locationSlots = extractAndResolveLocations(data.message);
    let dynamicOrigin: string | undefined;
    let dynamicDestination: string | undefined;
    let originAlternatives: string[] = [];
    let destinationAlternatives: string[] = [];

    const resolveFromFeed = async (slot: typeof locationSlots.origin) => {
      if (!slot?.input) return undefined;
      if (slot.isAmbiguous && slot.ambiguousCandidates?.length) {
        return { candidates: slot.ambiguousCandidates };
      }
      if (slot.resolved) return { name: slot.resolved };
      const { resolvePlannerStop } = await import("../gtfs/planner");
      const match = await resolvePlannerStop(slot.input);
      if (!match.name && match.candidates.length > 1) return { candidates: match.candidates };
      return match.name ? { name: match.name } : undefined;
    };

    try {
      const [feedOrigin, feedDestination] = await Promise.all([
        resolveFromFeed(locationSlots.origin),
        resolveFromFeed(locationSlots.destination),
      ]);
      if (feedOrigin && "candidates" in feedOrigin) originAlternatives = feedOrigin.candidates;
      else if (feedOrigin?.name) dynamicOrigin = feedOrigin.name;
      if (feedDestination && "candidates" in feedDestination) destinationAlternatives = feedDestination.candidates;
      else if (feedDestination?.name) dynamicDestination = feedDestination.name;
    } catch (error) {
      console.warn("Dynamic GTFS stop resolution failed:", error);
    }

    if (originAlternatives.length || destinationAlternatives.length) {
      const candidates = originAlternatives.length ? originAlternatives : destinationAlternatives;
      localReply = {
        reply: "I found more than one matching stop. Please choose one: " + candidates.join(", ") + ".",
        cards: [],
        suggestions: candidates,
        context: { ...localReply.context, grievance: undefined },
      };
    } else if (dynamicOrigin || dynamicDestination) {
      const resolvedOrigin = dynamicOrigin || localReply.context.origin;
      const resolvedDestination = dynamicDestination || localReply.context.destination;
      localReply.context = {
        ...localReply.context,
        origin: resolvedOrigin,
        destination: resolvedDestination,
        grievance: undefined,
      };
      if (resolvedOrigin && resolvedDestination &&
          !localReply.cards.some((card) => card.kind === "journey")) {
        localReply.reply = "I matched " + resolvedOrigin + " → " + resolvedDestination +
          " against the Chennai GTFS stop list. Checking available scheduled services.";
      }
    }

    // Identify origin, destination, and travel date after dynamic resolution.
    const origin = localReply.context.origin;
    const destination = localReply.context.destination;
    const travelDate = localReply.context.travelDate;

    // Retrieve actual journey options from GTFS planner server-side
    let gtfsJourneys: Array<{
      routeId: string;
      routeName: string;
      routeNumber?: string;
      lineName?: string;
      serviceDirection?: string;
      tripHeadsign?: string;
      transportType?: string;
      origin?: string;
      destination?: string;
      tripId: string;
      departure: string;
      arrival: string;
      durationMinutes: number;
      totalStops: number;
      stops: Array<{
        name: string;
        stopId?: string;
        arrival?: string;
        departure?: string;
        latitude?: number;
        longitude?: number;
      }>;
    }> = [];
    if (origin && destination) {
      try {
        const { findDirectJourneys } = await import("../gtfs/planner");
        gtfsJourneys = await findDirectJourneys(origin, destination, travelDate, departureAfter);
      } catch (error) {
        console.warn("GTFS planner lookup error:", error);
      }
    }

    // Plan multimodal options (Metro, Bus, Suburban Train, walking transfers)
    let multimodalOptions: Awaited<ReturnType<typeof planMultimodalJourneys>> = [];
    if (origin && destination) {
      try {
        multimodalOptions = await planMultimodalJourneys(
          origin,
          destination,
          travelDate,
          departureAfter,
          preferredMode,
          modeConstraint,
        );
      } catch (err) {
        console.warn("Multimodal journey planner error:", err);
      }
    }

    if (gtfsJourneys.length > 0 || multimodalOptions.length > 0) {
      const firstJourney = gtfsJourneys[0];
      const scheduleInfo: JourneySchedule | undefined = gtfsJourneys.length > 0
        ? {
            departures: gtfsJourneys.map((journey) => journey.departure),
            durationMinutes: firstJourney!.durationMinutes,
            serviceDate: travelDate,
            source: "Static GTFS schedule",
          }
        : undefined;

      const journeyCardIndex = localReply.cards.findIndex((card) => card.kind === "journey");
      if (journeyCardIndex >= 0) {
        localReply.cards = localReply.cards.map((card) =>
          card.kind === "journey"
            ? {
                ...card,
                journey: {
                  ...card.journey,
                  schedule: scheduleInfo,
                  multimodalOptions: multimodalOptions.length > 0 ? multimodalOptions : undefined,
                },
              }
            : card,
        );
      } else if (multimodalOptions.length > 0 && origin && destination) {
        const firstOption = multimodalOptions[0]!;
        const newJourneyCard: Card = {
          kind: "journey",
          journey: {
            origin: firstOption.originStation || origin,
            destination: firstOption.destinationStation || destination,
            mode: firstOption.modes.join(" + "),
            legs: [],
            totalStops: firstOption.totalStops,
            schedule: scheduleInfo,
            multimodalOptions,
          },
        };
        localReply.cards.push(newJourneyCard);
      }

      if (gtfsJourneys.length > 0) {
        const departures = gtfsJourneys.slice(0, 3).map((journey) => journey.departure).join(", ");
        localReply.reply +=
          "\n\nScheduled departures for " + travelDate + ": " + departures +
          ". The next matching trip takes " + firstJourney!.durationMinutes +
          " minutes. These are static GTFS timetable times, not live vehicle tracking.";
      } else if (multimodalOptions.some((option) => option.scheduleSource === "Timetable unavailable")) {
        localReply.reply +=
          "\n\nThe Yellow Line station route is shown. The currently loaded timetable does not contain verified scheduled departures or an exact fare for this route.";
      }
    }

    // Do not let a generative response rewrite factual transport results,
    // grievance drafts, fares or timetable data.
    const hasStructuredTransitResult = localReply.cards.some((card) =>
      card.kind === "journey" || card.kind === "fare" || card.kind === "grievance" ||
      card.kind === "facility" || card.kind === "alerts",
    );
    const currentTurnIsTransitFollowUp =
      /\b(?:from|to|travel|route|journey|metro|bus|train|fare|ticket|departure|depart|arrival|timetable|schedule|transfer|platform|station|how long|how much|reach)\b/i.test(data.message);

    // Do not suppress Gemini for unrelated questions merely because this
    // conversation previously planned a journey.
    if (hasStructuredTransitResult || ((origin && destination) && currentTurnIsTransitFollowUp)) {
      return localReply;
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn(
        "GEMINI_API_KEY is missing from the server environment. Falling back to rule-based engine.",
      );

      return localReply;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });

      const conversationHistory = data.history.map((item) => ({
        role: item.role === "assistant" ? ("model" as const) : ("user" as const),
        parts: [{ text: item.text }],
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: [
          ...conversationHistory,
          {
            role: "user",
            parts: [
              {
                text: `
USER QUESTION:
${data.message}

CURRENT JOURNEY CONTEXT:
${JSON.stringify(localReply.context)}

EXISTING TRANSPORT ENGINE BASELINE:
${localReply.reply}

RETRIEVED GTFS JOURNEY OPTIONS (GROUND TRUTH FROM STATIC GTFS DATASET):
${
  gtfsJourneys.length > 0
    ? JSON.stringify(gtfsJourneys, null, 2)
    : "No direct GTFS journey found in dataset for this origin and destination."
}

INSTRUCTIONS FOR GENERATING YOUR RESPONSE:
1. If GTFS journey options are retrieved above, use them to explain the journey, departure times, travel duration (~${gtfsJourneys[0]?.durationMinutes ?? 0} mins), and stops accurately.
2. CRITICAL: Clearly state to the passenger that schedules are based on static GTFS data, not live tracking.
3. NEVER invent stops, routes, departure times, fares or service availability.
4. If no direct GTFS journey was found, explain that no direct schedule was matched in the static dataset, provide the route guidance from the baseline, and clarify that live tracking is unavailable.
`,
              },
            ],
          },
        ],
        config: {
          systemInstruction: `
You are NammaTransit AI, an intelligent and friendly conversational assistant for Chennai, India.

YOUR ABILITIES:
1. Understand normal human conversations in English and Tamil-English (Tanglish).
2. Answer general questions and transport questions.
3. Help plan Chennai public transport journeys using retrieved GTFS schedules.
4. Understand follow-up questions using conversation history.
5. Help draft transport complaints.

GROUNDING & ACCURACY:
- Ground all journey schedules strictly in the provided GTFS journey options.
- Clearly state to users that schedules are static GTFS data, not live tracking.
- Never invent bus numbers, train schedules, departure times, fares, delays or live vehicle locations.
- Never claim that a ticket or complaint has been submitted.

RESPONSE STYLE:
- Use clear, helpful English.
- Be concise and friendly.
- Format multi-step journeys with clear numbered steps.
- Explain departures and duration naturally based on the GTFS ground truth.
          `,
          temperature: 0.5,
          maxOutputTokens: 1000,
        },
      });

      return {
        ...localReply,
        reply: response.text?.trim() || "Sorry, I couldn't generate a response. Please try again.",
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error("GEMINI DEBUG ERROR:", errorMessage);

      return {
        ...localReply,
        reply: localReply.reply || `Gemini API error: ${errorMessage}`,
      };
    }
  });

export const getMultimodalJourneys = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        origin: z.string().min(1),
        destination: z.string().min(1),
        travelDate: z.string().optional(),
        departureTime: z.string().optional(),
        preferredMode: z.enum(["metro", "bus", "train", "any"]).optional(),
        modeConstraint: z.enum(["metro", "bus", "train", "none"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    return planMultimodalJourneys(
      data.origin,
      data.destination,
      data.travelDate,
      data.departureTime,
      data.preferredMode,
      data.modeConstraint,
    );
  });

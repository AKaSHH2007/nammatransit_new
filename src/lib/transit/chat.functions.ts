import { GoogleGenAI } from "@google/genai";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { respond, type Context, type JourneySchedule, type Card } from "./engine";
import { planMultimodalJourneys } from "./multimodal-planner";
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
    const detectedDate = extractTravelDate(data.message);
    const departureAfter = extractDepartureTime(data.message);
    const { preferredMode, modeConstraint } = extractModePreferences(data.message);

    const activeContext: Context = {
      ...context,
      travelDate: detectedDate || context.travelDate,
    };

    const localReply = respond(data.message, activeContext);

    // Identify origin, destination, and travel date
    const origin = localReply.context.origin;
    const destination = localReply.context.destination;
    const travelDate = localReply.context.travelDate;

    // Retrieve actual journey options from GTFS planner server-side
    let gtfsJourneys: Array<{
      routeId: string;
      routeName: string;
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
        if (gtfsJourneys.length === 0 && travelDate) {
          // If specific date schedule is inactive, look for unconstrained general schedule
          const unconstrained = await findDirectJourneys(
            origin,
            destination,
            undefined,
            departureAfter,
          );
          if (unconstrained.length > 0) {
            gtfsJourneys = unconstrained;
          }
        }
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
      const scheduleInfo: JourneySchedule = {
        departures: gtfsJourneys.map((j) => j.departure),
        durationMinutes:
          firstJourney?.durationMinutes || multimodalOptions[0]?.durationMinutes || 15,
        serviceDate: travelDate || undefined,
        source: "Static GTFS schedule",
      };

      // Enrich journey card if exists
      localReply.cards = localReply.cards.map((card) => {
        if (card.kind === "journey") {
          return {
            ...card,
            journey: {
              ...card.journey,
              schedule: scheduleInfo,
              multimodalOptions: multimodalOptions.length > 0 ? multimodalOptions : undefined,
            },
          };
        }
        return card;
      });

      // Update baseline response text with grounded GTFS schedule details
      const departures = gtfsJourneys
        .slice(0, 3)
        .map((j) => j.departure)
        .join(", ");
      const scheduleNote = `\n\nScheduled GTFS departures${travelDate ? ` for ${travelDate}` : ""}: ${departures || "every 6-8 mins"} (~${scheduleInfo.durationMinutes} mins duration, ${cardStops(localReply.cards)} stops).\n(Note: Schedules are static GTFS data, not live vehicle tracking.)`;
      if (!localReply.reply.includes("Scheduled GTFS departures")) {
        localReply.reply += scheduleNote;
      }
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

function cardStops(cards: Card[]): number {
  const j = cards.find((c) => c.kind === "journey");
  return j && j.kind === "journey" ? j.journey.totalStops : 4;
}

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

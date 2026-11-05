import { describe, it, expect } from "vitest";
import { planMultimodalJourneys } from "./multimodal-planner";
import { extractModePreferences } from "./datetime-utils";
import { respond } from "./engine";

describe("Multimodal Journey Planner - 14 Target Scenarios", () => {
  // Scenario 1: Guindy to Chennai Airport
  it("Scenario 1: plans comprehensive multimodal routes from Guindy to Chennai Airport", async () => {
    const journeys = await planMultimodalJourneys("Guindy", "Chennai Airport");
    expect(journeys.length).toBeGreaterThanOrEqual(3);

    const modes = journeys.flatMap((j) => j.modes);
    expect(modes).toContain("metro");
    expect(modes).toContain("bus");
    expect(modes).toContain("train");

    const directMetro = journeys.find((j) => j.title.includes("Chennai Metro"));
    expect(directMetro).toBeDefined();
    expect(directMetro?.durationMinutes).toBeLessThanOrEqual(15);
  });

  // Scenario 2: Guindy to T Nagar
  it("Scenario 2: plans routes from Guindy to T Nagar including direct bus and suburban rail", async () => {
    const journeys = await planMultimodalJourneys("Guindy", "T. Nagar");
    expect(journeys.length).toBeGreaterThanOrEqual(2);

    const busOption = journeys.find((j) => j.modes.includes("bus"));
    expect(busOption).toBeDefined();
  });

  // Scenario 3: Tambaram to Guindy
  it("Scenario 3: plans routes from Tambaram to Guindy including Suburban Rail and Bus", async () => {
    const journeys = await planMultimodalJourneys("Tambaram", "Guindy");
    expect(journeys.length).toBeGreaterThanOrEqual(2);

    const suburbanTrain = journeys.find((j) => j.modes.includes("train"));
    expect(suburbanTrain).toBeDefined();
    expect(suburbanTrain?.fare).toBeLessThanOrEqual(10);
  });

  // Scenario 4: Koyambedu to Guindy
  it("Scenario 4: plans routes from Koyambedu to Guindy via Metro and arterial bus", async () => {
    const journeys = await planMultimodalJourneys("Koyambedu", "Guindy");
    expect(journeys.length).toBeGreaterThanOrEqual(2);

    const hasMetro = journeys.some((j) => j.modes.includes("metro"));
    expect(hasMetro).toBe(true);

    const hasBus = journeys.some((j) => j.modes.includes("bus"));
    expect(hasBus).toBe(true);
  });

  // Scenario 5: Metro-preferred journey
  it("Scenario 5: prioritises Metro routes when user prefers Metro mode", async () => {
    const extracted = extractModePreferences("I have to travel by metro from Guindy to Airport.");
    expect(extracted.preferredMode).toBe("metro");
    expect(extracted.modeConstraint).toBeUndefined();

    const journeys = await planMultimodalJourneys(
      "Guindy",
      "Chennai Airport",
      undefined,
      undefined,
      extracted.preferredMode,
      extracted.modeConstraint,
    );

    // Top ranked option (best overall / option 1) should be a Metro option
    expect(journeys[0]!.modes).toContain("metro");
    // Other alternatives (suburban, bus) should still be available in the candidates
    const hasBus = journeys.some((j) => j.modes.includes("bus"));
    expect(hasBus).toBe(true);
  });

  // Scenario 6: Metro-only journey
  it("Scenario 6: restricts results to Metro only when requested", async () => {
    const extracted = extractModePreferences("Travel by metro only from Guindy to Airport");
    expect(extracted.modeConstraint).toBe("metro");

    const journeys = await planMultimodalJourneys(
      "Guindy",
      "Chennai Airport",
      undefined,
      undefined,
      extracted.preferredMode,
      extracted.modeConstraint,
    );

    expect(journeys.length).toBeGreaterThan(0);
    // Every single returned route must be compatible with Metro
    for (const opt of journeys) {
      expect(opt.modes).toContain("metro");
    }
    // Bus-only and suburban-only should be excluded
    const isBusOnly = journeys.some((j) => j.modes.includes("bus") && !j.modes.includes("metro"));
    expect(isBusOnly).toBe(false);
  });

  // Scenario 7: Bus-only journey
  it("Scenario 7: restricts results to Bus only when user specifies bus only", async () => {
    const extracted = extractModePreferences("Bus only from Guindy to T Nagar");
    expect(extracted.modeConstraint).toBe("bus");

    const journeys = await planMultimodalJourneys(
      "Guindy",
      "T. Nagar",
      undefined,
      undefined,
      extracted.preferredMode,
      extracted.modeConstraint,
    );

    expect(journeys.length).toBeGreaterThan(0);
    for (const opt of journeys) {
      expect(opt.modes).toContain("bus");
    }
  });

  // Scenario 8: Mixed bus and Metro journey
  it("Scenario 8: generates mixed-mode journeys combining Bus and Metro", async () => {
    const journeys = await planMultimodalJourneys("T. Nagar", "Chennai Airport");
    const mixed = journeys.find(
      (j) => j.isMixedMode && j.modes.includes("bus") && j.modes.includes("metro"),
    );
    expect(mixed).toBeDefined();
    expect(mixed?.transferCount).toBeGreaterThanOrEqual(1);
    expect(mixed?.legs.some((l) => l.mode === "walk")).toBe(true);
  });

  // Scenario 9: Cheapest route
  it("Scenario 9: accurately identifies the cheapest route candidate", async () => {
    const journeys = await planMultimodalJourneys("Guindy", "Chennai Airport");
    const cheapest = journeys.find((j) => j.highlights.includes("cheapest"));
    expect(cheapest).toBeDefined();

    const minFare = Math.min(...journeys.map((j) => j.fare));
    expect(cheapest?.fare).toBe(minFare);
  });

  // Scenario 10: Fastest route
  it("Scenario 10: accurately identifies the fastest route candidate", async () => {
    const journeys = await planMultimodalJourneys("Guindy", "Chennai Airport");
    const fastest = journeys.find((j) => j.highlights.includes("fastest"));
    expect(fastest).toBeDefined();

    const minDuration = Math.min(...journeys.map((j) => j.durationMinutes));
    expect(fastest?.durationMinutes).toBe(minDuration);
  });

  // Scenario 11: Fewest transfers
  it("Scenario 11: accurately identifies direct routes with fewest transfers", async () => {
    const journeys = await planMultimodalJourneys("Guindy", "Chennai Airport");
    const fewest = journeys.find((j) => j.highlights.includes("fewest_transfers"));
    expect(fewest).toBeDefined();
    expect(fewest?.transferCount).toBe(0);
  });

  // Scenario 12: No available route
  it("Scenario 12: handles unconnectable / out-of-network route gracefully", async () => {
    const journeys = await planMultimodalJourneys("Coimbatore", "Madurai");
    expect(journeys).toEqual([]);
  });

  // Scenario 13: Same origin and destination
  it("Scenario 13: validates and blocks identical origin and destination", async () => {
    const journeys = await planMultimodalJourneys("Guindy", "Guindy");
    expect(journeys).toEqual([]);

    const reply = respond("Travel from Guindy to Guindy");
    expect(reply.reply).toContain("cannot be the same");
    expect(reply.cards.length).toBe(0);
  });

  // Scenario 14: Invalid or ambiguous location
  it("Scenario 14: handles invalid or ambiguous station names safely", async () => {
    const journeys = await planMultimodalJourneys("Atlantis", "Narnia");
    expect(journeys).toEqual([]);

    const reply = respond("How do I go to Atlantis from Narnia?");
    expect(reply.cards.length).toBe(0);
  });
});

import { describe, it, expect } from "vitest";
import { respond } from "./engine";

describe("multi-turn mobility assistant", () => {
  it("keeps journey context across follow-ups", () => {
    const r1 = respond("How do I travel from Guindy Metro to Chennai Airport?");
    expect(r1.cards[0]).toMatchObject({ kind: "journey" });
    expect(r1.context).toMatchObject({ origin: "Guindy", destination: "Chennai Airport" });

    const r2 = respond("What is the fare?", r1.context);
    expect(r2.cards[0]).toMatchObject({ kind: "fare", fare: expect.any(Number) });
    if (r2.cards[0]?.kind === "fare") expect(r2.cards[0].fare).toBeGreaterThan(0);

    const r3 = respond("Is the starting station accessible?", r2.context);
    expect(r3.cards[0]).toMatchObject({ kind: "facility", station: "Guindy" });

    const r4 = respond("What about starting from Alandur?", r3.context);
    expect(r4.context).toMatchObject({ origin: "Alandur", destination: "Chennai Airport" });
  });


  it("extracts both locations from a bare phrase with spelling mistakes", () => {
    const r = respond("Poonamali to Vadapalani");
    expect(r.context).toMatchObject({
      origin: "Poonamallee Bus Stand",
      destination: "Vadapalani",
    });
    expect(r.cards[0]).toMatchObject({ kind: "journey" });
    expect(r.reply.toLowerCase()).not.toContain("where are you starting");
    expect(r.reply.toLowerCase()).not.toContain("resolved");
  });

  it("keeps spelling correction internal for Koyambedu", () => {
    const r = respond("Koyeembedu to Chennai Airport");
    expect(r.context).toMatchObject({
      origin: "Koyambedu",
      destination: "Chennai Airport",
    });
    expect(r.reply.toLowerCase()).not.toContain("resolved");
    expect(r.reply.toLowerCase()).not.toContain("i understood your");
  });

  it("supports an explicit Yellow Line route request", () => {
    const r = respond("Show route from Poonamallee to Vadapalani on Yellow Line");
    expect(r.context).toMatchObject({
      origin: "Poonamallee Bus Stand",
      destination: "Vadapalani",
    });
    expect(r.cards[0]).toMatchObject({
      kind: "journey",
      journey: { legs: [{ lineId: "yellow" }] },
    });
  });

  it("interrupts a complaint flow when a new complete journey is asked", () => {
    const complaint = respond("I want to report a problem");
    const journey = respond("How do I travel from Guindy to Airport?", complaint.context);
    expect(journey.cards[0]).toMatchObject({ kind: "journey" });
    expect(journey.context.grievance).toBeUndefined();
    expect(journey.reply).not.toContain("What type of problem");
  });

  it("routes across lines via an interchange", () => {
    const r = respond("Koyambedu to Chennai Airport");
    expect(r.cards[0]).toMatchObject({ kind: "journey", journey: { interchange: "Alandur" } });
  });

  it("collects all grievance fields before showing a draft", () => {
    let r = respond("I want to report a problem");
    for (const a of ["Metro", "Guindy", "Lift / escalator", "Lift was not working", "Today 9am"])
      r = respond(a, r.context);
    expect(r.cards[0]).toMatchObject({
      kind: "grievance",
      draft: { operator: "CMRL (Chennai Metro)", location: "Guindy" },
    });
  });
});

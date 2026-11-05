import { describe, it, expect } from "vitest";
import { respond, demoFare } from "./engine";

describe("multi-turn mobility assistant", () => {
  it("keeps journey context across follow-ups", () => {
    const r1 = respond("How do I travel from Guindy Metro to Chennai Airport?");
    expect(r1.cards[0]).toMatchObject({ kind: "journey" });
    expect(r1.context).toMatchObject({ origin: "Guindy", destination: "Chennai Airport" });

    const r2 = respond("What is the fare?", r1.context);
    expect(r2.cards[0]).toMatchObject({ kind: "fare", fare: demoFare(4) });

    const r3 = respond("Is the starting station accessible?", r2.context);
    expect(r3.cards[0]).toMatchObject({ kind: "facility", station: "Guindy" });

    const r4 = respond("What about starting from Alandur?", r3.context);
    expect(r4.context).toMatchObject({ origin: "Alandur", destination: "Chennai Airport" });
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

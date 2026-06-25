import { describe, it, expect } from "vitest";
import { buildSeed, DEMO_TODAY, HERO_PATIENT_ID } from "@/lib/mock/seed";
import { heroFlareCheckInAnswers } from "@/lib/mock/scenarios";
import { raMtxProtocol } from "@/lib/mock/protocols";
import { computeRapid3 } from "@/lib/clinical/rapid3";
import { evaluateCheckin } from "@/lib/engine/evaluateCheckin";
import { evaluateTime } from "@/lib/engine/evaluateTime";
import { dedupeDrafts } from "@/lib/flags";
import type { CheckIn, Measure } from "@/lib/types";

const seed = buildSeed();
const openFlagsFor = (patientId: string) =>
  seed.flags.filter((f) => f.patientId === patientId && f.status === "open");

describe("buildSeed shape", () => {
  it("has seven patients on one protocol", () => {
    expect(seed.patients).toHaveLength(7);
    expect(seed.protocols).toHaveLength(1);
  });

  it("is anchored to DEMO_TODAY", () => {
    expect(seed.asOf).toBe(DEMO_TODAY);
  });

  it("seeds ~9 open flags spread across severities", () => {
    const open = seed.flags.filter((f) => f.status === "open");
    expect(open).toHaveLength(9);
    const bySeverity = (s: string) => open.filter((f) => f.severity === s).length;
    expect(bySeverity("urgent")).toBe(2); // James (high), David (red flag)
    expect(bySeverity("warning")).toBe(6);
    expect(bySeverity("stable")).toBe(1); // Linda (silence)
  });
});

describe("per-patient seed flags match the intended narrative", () => {
  it("hero starts with only a labs-due flag", () => {
    const flags = openFlagsFor(HERO_PATIENT_ID);
    expect(flags.map((f) => f.triggerType)).toEqual(["lab_due"]);
  });

  it("James shows high disease activity + overdue labs", () => {
    const types = openFlagsFor("p-james").map((f) => f.triggerType).sort();
    expect(types).toEqual(["lab_due", "rapid3_threshold"]);
  });

  it("David shows a red-flag symptom on MTX + first labs due", () => {
    const types = openFlagsFor("p-david").map((f) => f.triggerType).sort();
    expect(types).toEqual(["lab_due", "red_flag_symptom"]);
  });

  it("Priya and Susan show flares; Linda shows silence", () => {
    expect(openFlagsFor("p-priya").map((f) => f.triggerType)).toEqual(["rapid3_rise"]);
    expect(openFlagsFor("p-susan").map((f) => f.triggerType)).toEqual(["rapid3_rise"]);
    expect(openFlagsFor("p-linda").map((f) => f.triggerType)).toEqual(["reengagement"]);
  });
});

describe("hero flare check-in surfaces the three-trigger moment", () => {
  it("adds a flare (rise) + red-flag (fever) on top of the existing labs-due flag", () => {
    const hero = seed.patients.find((p) => p.id === HERO_PATIENT_ID)!;
    const carePlan = seed.carePlans.find((c) => c.id === hero.carePlanId)!;
    const protocol = raMtxProtocol();

    // The hero's most recent seeded measure becomes the "previous" for rise detection.
    const heroCheckIns = seed.checkIns
      .filter((c) => c.patientId === hero.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const previousMeasure = heroCheckIns.at(-1)!.measures[0];

    const answers = heroFlareCheckInAnswers();
    const r = computeRapid3(answers.rapid3);
    expect(r.value).toBe(9);
    expect(r.bucket).toBe("moderate");

    const newCheckIn: CheckIn = {
      id: "ci-flare",
      patientId: hero.id,
      carePlanId: carePlan.id,
      channel: "sms",
      createdAt: `${DEMO_TODAY}T18:00:00.000Z`,
      answers,
      measures: [],
      status: "received",
    };
    const measure: Measure = {
      id: "m-flare",
      checkInId: "ci-flare",
      type: "RAPID3",
      value: r.value,
      components: r.components,
      bucket: r.bucket,
      createdAt: newCheckIn.createdAt,
    };

    const drafts = [
      ...evaluateCheckin({
        checkIn: newCheckIn,
        measure,
        previousMeasure,
        carePlan,
        protocol,
        patient: hero,
      }),
      ...evaluateTime({
        carePlan,
        protocol,
        patient: hero,
        asOf: DEMO_TODAY,
        lastCheckinAt: newCheckIn.createdAt,
        latestBucket: measure.bucket,
      }),
    ];

    // Dedupe against the hero's already-open flags (the labs-due flag must not re-stack).
    const fresh = dedupeDrafts(openFlagsFor(hero.id), drafts);
    const types = fresh.map((d) => d.triggerType).sort();
    expect(types).toEqual(["rapid3_rise", "red_flag_symptom"]);

    // Resulting open total for the hero would be three.
    expect(openFlagsFor(hero.id).length + fresh.length).toBe(3);
  });
});

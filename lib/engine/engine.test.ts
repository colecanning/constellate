import { describe, it, expect } from "vitest";
import { evaluateCheckin } from "@/lib/engine/evaluateCheckin";
import { evaluateTime } from "@/lib/engine/evaluateTime";
import { bucketRapid3 } from "@/lib/clinical/rapid3";
import { raMtxProtocol, TRIGGER_IDS } from "@/lib/mock/protocols";
import type {
  CarePlan,
  CheckIn,
  Measure,
  Patient,
  SymptomKey,
  ThresholdOverrides,
} from "@/lib/types";

const protocol = raMtxProtocol();

function makeCarePlan(overrides: Partial<CarePlan> = {}): CarePlan {
  return {
    id: "cp-hero",
    patientId: "p-hero",
    protocolId: protocol.id,
    target: "low",
    currentRung: {
      drug: "methotrexate",
      dose: "15 mg weekly",
      startDate: "2026-04-15", // ~week 10 by 2026-06-24
      lastDoseChangeDate: null,
    },
    cadenceDays: 14,
    thresholds: {},
    nextLabDueDate: null,
    lastLabDate: "2026-05-15",
    nextVisitDate: "2026-08-01",
    ...overrides,
  };
}

const patient: Patient = {
  id: "p-hero",
  name: "Maria Reyes",
  age: 47,
  sex: "F",
  phone: "+15555550123",
  conditions: ["RA"],
  enrollmentId: "en-hero",
  carePlanId: "cp-hero",
};

function makeMeasure(value: number, createdAt = "2026-06-24T12:00:00.000Z"): Measure {
  return {
    id: `m-${value}`,
    checkInId: "ci",
    type: "RAPID3",
    value,
    components: { function: 0, pain: 0, globalHealth: 0 },
    bucket: bucketRapid3(value),
    createdAt,
  };
}

function makeCheckIn(
  symptoms: SymptomKey[] = [],
  temperatureF?: number,
  createdAt = "2026-06-24T12:00:00.000Z",
): CheckIn {
  return {
    id: "ci",
    patientId: "p-hero",
    carePlanId: "cp-hero",
    channel: "portal",
    createdAt,
    answers: {
      rapid3: { functionItems: Array<number>(10).fill(0), pain: 0, globalHealth: 0 },
      symptoms: { symptoms, temperatureF },
    },
    measures: [],
    status: "received",
  };
}

describe("evaluateCheckin — RAPID3 rise (flare)", () => {
  it("fires the rise trigger when the bucket climbs low → moderate", () => {
    const drafts = evaluateCheckin({
      checkIn: makeCheckIn(),
      measure: makeMeasure(9), // moderate
      previousMeasure: makeMeasure(5.3), // low
      carePlan: makeCarePlan(),
      protocol,
      patient,
    });
    const rise = drafts.find((d) => d.triggerType === "rapid3_rise");
    expect(rise).toBeDefined();
    expect(rise!.severity).toBe("warning");
    // does NOT also trip the absolute ceiling (default 12)
    expect(drafts.some((d) => d.triggerType === "rapid3_threshold")).toBe(false);
  });

  it("does not fire on a stable bucket", () => {
    const drafts = evaluateCheckin({
      checkIn: makeCheckIn(),
      measure: makeMeasure(5),
      previousMeasure: makeMeasure(4.5), // both low
      carePlan: makeCarePlan(),
      protocol,
      patient,
    });
    expect(drafts.some((d) => d.triggerType === "rapid3_rise")).toBe(false);
  });
});

describe("evaluateCheckin — RAPID3 absolute threshold", () => {
  it("fires the ceiling trigger when score crosses 12 without a rise", () => {
    const drafts = evaluateCheckin({
      checkIn: makeCheckIn(),
      measure: makeMeasure(14), // high
      previousMeasure: makeMeasure(13), // already high → no rise
      carePlan: makeCarePlan(),
      protocol,
      patient,
    });
    const ceiling = drafts.find((d) => d.triggerType === "rapid3_threshold");
    expect(ceiling).toBeDefined();
    expect(ceiling!.severity).toBe("urgent");
    expect(drafts.some((d) => d.triggerType === "rapid3_rise")).toBe(false);
  });

  it("respects a per-Care-Plan threshold override", () => {
    const thresholds: ThresholdOverrides = {
      [TRIGGER_IDS.rapid3Threshold]: { rapid3Threshold: 8 },
    };
    const drafts = evaluateCheckin({
      checkIn: makeCheckIn(),
      measure: makeMeasure(9), // moderate, but > overridden 8
      previousMeasure: makeMeasure(8.5), // same bucket → no rise
      carePlan: makeCarePlan({ thresholds }),
      protocol,
      patient,
    });
    expect(drafts.some((d) => d.triggerType === "rapid3_threshold")).toBe(true);
  });
});

describe("evaluateCheckin — red-flag symptom", () => {
  it("fires urgent when fever is reported on MTX (immunosuppressant)", () => {
    const drafts = evaluateCheckin({
      checkIn: makeCheckIn(["fever", "fatigue"], 100.8),
      measure: makeMeasure(9),
      previousMeasure: makeMeasure(5.3),
      carePlan: makeCarePlan(),
      protocol,
      patient,
    });
    const flag = drafts.find((d) => d.triggerType === "red_flag_symptom");
    expect(flag).toBeDefined();
    expect(flag!.severity).toBe("urgent");
    expect(flag!.suggestedAction.type).toBe("schedule_call");
  });

  it("does NOT fire when the patient is not on an immunosuppressant", () => {
    const drafts = evaluateCheckin({
      checkIn: makeCheckIn(["fever"]),
      measure: makeMeasure(5),
      previousMeasure: makeMeasure(5),
      carePlan: makeCarePlan({
        currentRung: {
          drug: "hydroxychloroquine",
          dose: "200 mg daily",
          startDate: "2026-04-15",
          lastDoseChangeDate: null,
        },
      }),
      protocol,
      patient,
    });
    expect(drafts.some((d) => d.triggerType === "red_flag_symptom")).toBe(false);
  });

  it("does not fire when disabled via Care Plan override", () => {
    const thresholds: ThresholdOverrides = {
      [TRIGGER_IDS.redFlag]: { enabled: false },
    };
    const drafts = evaluateCheckin({
      checkIn: makeCheckIn(["fever"]),
      measure: makeMeasure(5),
      previousMeasure: makeMeasure(5),
      carePlan: makeCarePlan({ thresholds }),
      protocol,
      patient,
    });
    expect(drafts.some((d) => d.triggerType === "red_flag_symptom")).toBe(false);
  });
});

describe("evaluateTime — lab due", () => {
  it("fires within the look-ahead window", () => {
    const drafts = evaluateTime({
      carePlan: makeCarePlan({ nextLabDueDate: "2026-06-26" }), // 2 days out
      protocol,
      patient,
      asOf: "2026-06-24",
      lastCheckinAt: "2026-06-24T12:00:00.000Z",
    });
    const lab = drafts.find((d) => d.triggerType === "lab_due");
    expect(lab).toBeDefined();
    expect(lab!.severity).toBe("warning");
    expect(lab!.suggestedAction.type).toBe("order_labs");
  });

  it("does not fire when labs are beyond the window", () => {
    const drafts = evaluateTime({
      carePlan: makeCarePlan({ nextLabDueDate: "2026-07-30" }),
      protocol,
      patient,
      asOf: "2026-06-24",
      lastCheckinAt: "2026-06-24T12:00:00.000Z",
    });
    expect(drafts.some((d) => d.triggerType === "lab_due")).toBe(false);
  });
});

describe("evaluateTime — re-engagement", () => {
  it("fires (stable) after silence beyond cadence + grace", () => {
    const drafts = evaluateTime({
      carePlan: makeCarePlan(),
      protocol,
      patient,
      asOf: "2026-06-24",
      lastCheckinAt: "2026-05-20T12:00:00.000Z", // 35 days > 14 + 7
    });
    const re = drafts.find((d) => d.triggerType === "reengagement");
    expect(re).toBeDefined();
    expect(re!.severity).toBe("stable");
  });

  it("does not fire when the patient checked in recently", () => {
    const drafts = evaluateTime({
      carePlan: makeCarePlan(),
      protocol,
      patient,
      asOf: "2026-06-24",
      lastCheckinAt: "2026-06-20T12:00:00.000Z", // 4 days
    });
    expect(drafts.some((d) => d.triggerType === "reengagement")).toBe(false);
  });
});

describe("hero narrative — three trigger types from one moment", () => {
  it("flare + fever (check-in) and labs-due (time) all surface", () => {
    const carePlan = makeCarePlan({ nextLabDueDate: "2026-06-26" });
    const checkInDrafts = evaluateCheckin({
      checkIn: makeCheckIn(["joint_swelling", "fatigue", "fever"], 100.6),
      measure: makeMeasure(9), // moderate
      previousMeasure: makeMeasure(5.3), // low
      carePlan,
      protocol,
      patient,
    });
    const timeDrafts = evaluateTime({
      carePlan,
      protocol,
      patient,
      asOf: "2026-06-24",
      lastCheckinAt: "2026-06-24T12:00:00.000Z",
      latestBucket: "moderate",
    });

    const types = [...checkInDrafts, ...timeDrafts].map((d) => d.triggerType).sort();
    expect(types).toEqual(["lab_due", "rapid3_rise", "red_flag_symptom"]);

    const all = [...checkInDrafts, ...timeDrafts];
    expect(all.find((d) => d.triggerType === "red_flag_symptom")!.severity).toBe("urgent");
    expect(all.find((d) => d.triggerType === "rapid3_rise")!.severity).toBe("warning");
    expect(all.find((d) => d.triggerType === "lab_due")!.severity).toBe("warning");
  });
});

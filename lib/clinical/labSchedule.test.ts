import { describe, it, expect } from "vitest";
import {
  isLabDue,
  labsMonitored,
  nextLabDue,
} from "@/lib/clinical/labSchedule";

describe("labsMonitored", () => {
  it("flags MTX and other csDMARDs as monitored", () => {
    expect(labsMonitored("methotrexate")).toBe(true);
    expect(labsMonitored("leflunomide")).toBe(true);
  });
  it("does not schedule routine bloodwork for non-monitored drugs", () => {
    expect(labsMonitored("hydroxychloroquine")).toBe(false);
    expect(labsMonitored("folic acid")).toBe(false);
  });
});

describe("nextLabDue", () => {
  it("returns null for drugs without routine monitoring", () => {
    expect(
      nextLabDue({
        drug: "hydroxychloroquine",
        startDate: "2026-04-01",
        lastDoseChangeDate: null,
        lastLabDate: null,
      }),
    ).toBeNull();
  });

  it("schedules the first MTX draw ~1 month after start when no prior lab", () => {
    expect(
      nextLabDue({
        drug: "methotrexate",
        startDate: "2026-04-15",
        lastDoseChangeDate: null,
        lastLabDate: null,
      }),
    ).toBe("2026-05-15");
  });

  it("tightens to ~6 weeks after a dose increase since the last lab", () => {
    expect(
      nextLabDue({
        drug: "methotrexate",
        startDate: "2026-01-01",
        lastLabDate: "2026-03-01",
        lastDoseChangeDate: "2026-03-10", // dose ↑ after last lab
      }),
    ).toBe("2026-04-21"); // 2026-03-10 + 42d
  });

  it("uses monthly cadence while still early (first ~3 months)", () => {
    // last lab only ~5 weeks after start → still early phase → +30d
    expect(
      nextLabDue({
        drug: "methotrexate",
        startDate: "2026-04-01",
        lastLabDate: "2026-05-06",
        lastDoseChangeDate: null,
      }),
    ).toBe("2026-06-05");
  });

  it("uses quarterly cadence once stable (>~3 months in)", () => {
    // last lab ~6 months after start, no recent dose change → +90d
    expect(
      nextLabDue({
        drug: "methotrexate",
        startDate: "2026-01-01",
        lastLabDate: "2026-07-01",
        lastDoseChangeDate: "2026-01-01", // before last lab → not tightening
      }),
    ).toBe("2026-09-29"); // 2026-07-01 + 90d
  });
});

describe("isLabDue", () => {
  it("is false when no due date", () => {
    expect(isLabDue(null, "2026-06-24")).toBe(false);
  });
  it("is true when the due date is on/before today", () => {
    expect(isLabDue("2026-06-20", "2026-06-24")).toBe(true);
    expect(isLabDue("2026-06-24", "2026-06-24")).toBe(true);
  });
  it("is false when the due date is in the future beyond the window", () => {
    expect(isLabDue("2026-06-30", "2026-06-24")).toBe(false);
  });
  it("respects a look-ahead window (labs due this week)", () => {
    expect(isLabDue("2026-06-30", "2026-06-24", 7)).toBe(true);
    expect(isLabDue("2026-07-02", "2026-06-24", 7)).toBe(false);
  });
});

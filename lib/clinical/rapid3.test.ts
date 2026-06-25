import { describe, it, expect } from "vitest";
import {
  bucketRapid3,
  bucketRank,
  computeFunctionScore,
  computeRapid3,
} from "@/lib/clinical/rapid3";
import type { Rapid3Answers } from "@/lib/types";

const fn = (v: number) => Array<number>(10).fill(v); // 10 identical ADL items

describe("computeFunctionScore", () => {
  it("returns 0 when all items are 0", () => {
    expect(computeFunctionScore(fn(0))).toBe(0);
  });

  it("returns 10 when all 10 items are at max (3) — raw 30 ÷ 3", () => {
    expect(computeFunctionScore(fn(3))).toBe(10);
  });

  it("scales linearly (all items = 1 → raw 10 ÷ 3 ≈ 3.3)", () => {
    expect(computeFunctionScore(fn(1))).toBe(3.3);
  });

  it("clamps out-of-range item values to 0–3", () => {
    expect(computeFunctionScore([5, 5, 5, 5, 5, 5, 5, 5, 5, 5])).toBe(10);
    expect(computeFunctionScore([-2, -2, -2, -2, -2, -2, -2, -2, -2, -2])).toBe(0);
  });
});

describe("bucketRapid3 cutoffs (≤3 / >3–6 / >6–12 / >12)", () => {
  it.each([
    [0, "remission"],
    [3.0, "remission"],
    [3.1, "low"],
    [6.0, "low"],
    [6.1, "moderate"],
    [12.0, "moderate"],
    [12.1, "high"],
    [30, "high"],
  ] as const)("value %s → %s", (value, bucket) => {
    expect(bucketRapid3(value)).toBe(bucket);
  });
});

describe("bucketRank ordering", () => {
  it("orders remission < low < moderate < high", () => {
    expect(bucketRank("remission")).toBeLessThan(bucketRank("low"));
    expect(bucketRank("low")).toBeLessThan(bucketRank("moderate"));
    expect(bucketRank("moderate")).toBeLessThan(bucketRank("high"));
  });
});

describe("computeRapid3", () => {
  it("sums FN + PN + PtGl into a 0–30 value with bucket", () => {
    const answers: Rapid3Answers = { functionItems: fn(0), pain: 0, globalHealth: 0 };
    const r = computeRapid3(answers);
    expect(r.value).toBe(0);
    expect(r.bucket).toBe("remission");
    expect(r.components).toEqual({ function: 0, pain: 0, globalHealth: 0 });
  });

  it("clamps VAS inputs to 0–10", () => {
    const r = computeRapid3({ functionItems: fn(0), pain: 99, globalHealth: -5 });
    expect(r.components.pain).toBe(10);
    expect(r.components.globalHealth).toBe(0);
    expect(r.value).toBe(10);
  });

  it("models the hero low→moderate flare jump", () => {
    // Baseline (week 8): mild → low
    const baseline = computeRapid3({
      functionItems: fn(1), // raw 10 → FN 3.3
      pain: 1,
      globalHealth: 1,
    });
    expect(baseline.value).toBe(5.3);
    expect(baseline.bucket).toBe("low");

    // Week 10 flare: ↑swelling, fatigue → moderate
    const flare = computeRapid3({
      functionItems: [1, 1, 1, 1, 1, 1, 1, 1, 1, 0], // raw 9 → FN 3.0
      pain: 3,
      globalHealth: 3,
    });
    expect(flare.value).toBe(9);
    expect(flare.bucket).toBe("moderate");
    expect(flare.value).toBeGreaterThan(baseline.value);
  });
});

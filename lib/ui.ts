/**
 * Visual mapping from a Flag to DESIGN.md's clinical status palette.
 *
 * DESIGN rule: status colors are NEVER large background fills — only foreground text, icon
 * fills, and a left-border accent stripe. Every status pairs color + icon + label
 * (color-blind safe). Class strings are LITERAL so Tailwind's JIT can see them.
 */

import type { Flag } from "@/lib/types";

export type Tone = "urgent" | "warning" | "normal" | "follow-up" | "info";

/** Severity orders the queue; tone adds the violet "follow-up" hue for re-engagement. */
export function flagTone(flag: Flag): Tone {
  if (flag.severity === "urgent") return "urgent";
  if (flag.triggerType === "reengagement") return "follow-up";
  if (flag.severity === "warning") return "warning";
  return "normal";
}

export interface ToneStyle {
  /** foreground text + icon */
  fg: string;
  /** paired background tint (small badges only) */
  bg: string;
  /** left accent stripe color */
  stripe: string;
  /** solid dot color (queue grouping) */
  dot: string;
  label: string;
}

export const TONE_STYLES: Record<Tone, ToneStyle> = {
  urgent: {
    fg: "text-urgent",
    bg: "bg-urgent-bg",
    stripe: "border-l-urgent",
    dot: "bg-urgent",
    label: "Urgent",
  },
  warning: {
    fg: "text-warning",
    bg: "bg-warning-bg",
    stripe: "border-l-warning",
    dot: "bg-warning",
    label: "Warning",
  },
  normal: {
    fg: "text-normal",
    bg: "bg-normal-bg",
    stripe: "border-l-normal",
    dot: "bg-normal",
    label: "Stable",
  },
  "follow-up": {
    fg: "text-follow-up",
    bg: "bg-follow-up-bg",
    stripe: "border-l-follow-up",
    dot: "bg-follow-up",
    label: "Follow-up",
  },
  info: {
    fg: "text-info",
    bg: "bg-info-bg",
    stripe: "border-l-info",
    dot: "bg-info",
    label: "Info",
  },
};

/** Visual tone for a RAPID3 bucket (used by score pills / trends). */
export function bucketTone(
  bucket: "remission" | "low" | "moderate" | "high",
): Tone {
  return {
    remission: "normal",
    low: "info",
    moderate: "warning",
    high: "urgent",
  }[bucket] as Tone;
}

import type { Measure, Rapid3Bucket } from "@/lib/types";
import { RAPID3_MAX } from "@/lib/clinical/rapid3";

const BUCKET_VAR: Record<Rapid3Bucket, string> = {
  remission: "var(--normal)",
  low: "var(--info)",
  moderate: "var(--warning)",
  high: "var(--urgent)",
};

/**
 * Minimal dependency-free RAPID3 sparkline (0–30 scale). The polyline is muted; each point
 * is colored by its disease-activity bucket so the trend reads at a glance.
 */
export function ScoreTrend({
  measures,
  width = 168,
  height = 44,
  monochrome = false,
}: {
  measures: Measure[];
  width?: number;
  height?: number;
  /** Patient-facing: render every point in the brand color (no severity coloring). */
  monochrome?: boolean;
}) {
  if (measures.length === 0) {
    return <span className="text-ink-subtle text-label">No check-ins yet</span>;
  }

  const pad = 6;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const n = measures.length;
  const x = (i: number) => pad + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => pad + innerH - (v / RAPID3_MAX) * innerH;

  const points = measures.map((m, i) => `${x(i)},${y(m.value)}`).join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`RAPID3 trend: ${measures.map((m) => m.value).join(", ")}`}
      className="overflow-visible"
    >
      {n > 1 && (
        <polyline
          points={points}
          fill="none"
          stroke="var(--border-strong)"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {measures.map((m, i) => (
        <circle
          key={m.id}
          cx={x(i)}
          cy={y(m.value)}
          r={i === n - 1 ? 3.5 : 2.5}
          fill={monochrome ? "var(--primary)" : BUCKET_VAR[m.bucket]}
        />
      ))}
    </svg>
  );
}

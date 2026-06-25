import { cn } from "@/lib/utils";
import { bucketTone, TONE_STYLES } from "@/lib/ui";
import { BUCKET_LABELS } from "@/lib/labels";
import type { Rapid3Bucket } from "@/lib/types";

/**
 * RAPID3 score chip — the numeric value in monospace (DESIGN: machine-generated health
 * data is monospaced), colored by bucket, with the band label spelled out.
 */
export function Rapid3Pill({
  value,
  bucket,
  size = "md",
  className,
}: {
  value: number;
  bucket: Rapid3Bucket;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const tone = TONE_STYLES[bucketTone(bucket)];
  return (
    <span className={cn("inline-flex items-baseline gap-1.5", className)}>
      <span
        className={cn(
          "font-numeric font-semibold tabular-nums",
          tone.fg,
          size === "lg" ? "text-3xl" : size === "sm" ? "text-base" : "text-xl",
        )}
        aria-label={`RAPID3 ${value}, ${BUCKET_LABELS[bucket]}`}
      >
        {value}
      </span>
      <span className="text-ink-subtle text-label">/ 30 · {BUCKET_LABELS[bucket]}</span>
    </span>
  );
}

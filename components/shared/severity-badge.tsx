import {
  AlertTriangle,
  Check,
  CornerUpLeft,
  Info,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TONE_STYLES, type Tone } from "@/lib/ui";

const TONE_ICON: Record<Tone, LucideIcon> = {
  urgent: AlertTriangle,
  warning: AlertTriangle,
  normal: Check,
  "follow-up": CornerUpLeft,
  info: Info,
};

/**
 * Small status chip — color + icon + label together (DESIGN: status is never color-alone).
 * Uses the paired background tint, which DESIGN permits on small badges.
 */
export function SeverityBadge({
  tone,
  label,
  className,
}: {
  tone: Tone;
  label?: string;
  className?: string;
}) {
  const style = TONE_STYLES[tone];
  const Icon = TONE_ICON[tone];
  return (
    <span
      className={cn(
        "text-label inline-flex items-center gap-1 rounded-full px-2 py-0.5",
        style.bg,
        style.fg,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {label ?? style.label}
    </span>
  );
}

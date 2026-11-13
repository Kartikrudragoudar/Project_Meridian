"use client";

import { cn } from "@/lib/utils";
import type { SeatQuality } from "@/lib/cinema";

interface QualityBadgeProps {
  quality: SeatQuality;
  size?: "sm" | "md";
  withDot?: boolean;
  className?: string;
}

export function QualityBadge({
  quality,
  size = "sm",
  withDot = true,
  className,
}: QualityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium tracking-wide whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        quality.badgeClass,
        className
      )}
      style={withDot ? undefined : undefined}
    >
      {withDot && (
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: quality.hex }}
        />
      )}
      {quality.label}
    </span>
  );
}

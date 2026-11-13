"use client";

import { cn } from "@/lib/utils";

interface LegendItem {
  label: string;
  swatch: string;
  ring?: string;
  text?: string;
}

const ITEMS: LegendItem[] = [
  { label: "Available", swatch: "bg-[#2A2A32]", ring: "ring-1 ring-white/10" },
  {
    label: "Selected",
    swatch: "bg-[#F5A623]",
    ring: "ring-1 ring-[#F5A623]/60",
  },
  { label: "Occupied", swatch: "bg-[#18181D]", ring: "ring-1 ring-white/5" },
  {
    label: "Sweet Spot",
    swatch: "bg-[#F5A623]/25",
    ring: "ring-1 ring-[#F5A623]/40",
  },
];

export function Legend({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-[#9CA3AF]",
        className
      )}
    >
      {ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className={cn(
              "inline-block h-3 w-3 rounded-[3px]",
              item.swatch,
              item.ring
            )}
          />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

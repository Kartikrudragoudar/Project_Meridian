"use client";

import { Film, Calendar, Clapperboard, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMeridian, type ViewMode } from "@/store/meridian-store";

const MODE_TABS: { id: ViewMode; label: string }[] = [
  { id: "2d", label: "2D Map" },
  { id: "3d", label: "3D Seat View" },
];

export function Header() {
  const mode = useMeridian((s) => s.mode);
  const setMode = useMeridian((s) => s.setMode);

  return (
    <header className="sticky top-0 z-30 flex w-full flex-col gap-3 border-b border-white/[0.06] bg-[#0A0A0C]/85 px-4 py-3 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
      {/* Movie identity */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 ring-1 ring-amber-500/30">
          <Clapperboard className="h-5 w-5 text-[#F5A623]" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#F5A623] animate-meridian-pulse" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold tracking-tight text-white sm:text-lg">
              DUNE: MESSIAH
            </h1>
            <span className="hidden rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-400 sm:inline-block">
              IMAX
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#9CA3AF]">
            <span className="inline-flex items-center gap-1">
              <Film className="h-3 w-3" /> Hall 1
            </span>
            <span className="text-white/15">•</span>
            <span className="inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-cyan-400" /> IMAX Laser 3D
            </span>
            <span className="text-white/15">•</span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Tonight, 8:30 PM
            </span>
          </div>
        </div>
      </div>

      {/* View-mode switcher pill */}
      <div className="flex items-center gap-3 self-start sm:self-auto">
        <span className="hidden text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF] sm:inline">
          View
        </span>
        <div
          role="tablist"
          aria-label="View mode"
          className="relative flex items-center gap-1 rounded-full border border-white/[0.08] bg-[#141418]/80 p-1 backdrop-blur-xl"
        >
          {MODE_TABS.map((tab) => {
            const active = mode === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                onClick={() => setMode(tab.id)}
                className={cn(
                  "relative z-10 rounded-full px-3.5 py-1.5 text-[11px] font-medium transition-colors sm:text-xs",
                  active
                    ? "text-[#0A0A0C]"
                    : "text-[#9CA3AF] hover:text-white"
                )}
              >
                {active && (
                  <span className="absolute inset-0 -z-10 rounded-full bg-[#F5A623] shadow-[0_0_20px_rgba(245,166,35,0.35)]" />
                )}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}

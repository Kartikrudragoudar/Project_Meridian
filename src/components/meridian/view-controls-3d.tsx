"use client";

import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Crosshair,
  Compass,
} from "lucide-react";
import { AUDITORIUM, buildAllSeats, type SeatData } from "@/lib/cinema";
import { useMeridian } from "@/store/meridian-store";
import { cn } from "@/lib/utils";

const ALL_SEATS: SeatData[] = buildAllSeats();

/**
 * Floating 3D HUD overlay (NOT part of the canvas): quick-hop buttons to
 * glide to adjacent available seats, plus a "Recenter View" button.
 *
 * Positioned top-center of the 3D view so it never overlaps the bottom dock.
 */
export function ViewControls3D() {
  const rowIndex = useMeridian((s) => s.rowIndex);
  const colIndex = useMeridian((s) => s.colIndex);
  const selectSeat = useMeridian((s) => s.selectSeat);
  const recenter = useMeridian((s) => s.recenter);
  const setMode = useMeridian((s) => s.setMode);

  // Available seat lookups for each hop direction.
  const hops = (() => {
    const findAvail = (r: number, c: number) =>
      ALL_SEATS.find(
        (s) => s.rowIndex === r && s.colIndex === c && s.status === "available"
      );

    return {
      front: findAvail(Math.max(0, rowIndex - 1), colIndex), // closer to screen
      back: findAvail(Math.min(AUDITORIUM.rows - 1, rowIndex + 1), colIndex),
      left: findAvail(rowIndex, Math.max(0, colIndex - 1)),
      right: findAvail(rowIndex, Math.min(AUDITORIUM.cols - 1, colIndex + 1)),
    };
  })();

  const onHop = (seat: SeatData | undefined) => {
    if (!seat) return;
    selectSeat(seat.rowIndex, seat.colIndex);
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex flex-col items-center gap-2 px-3 sm:top-4">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/[0.08] bg-[#141418]/80 px-1.5 py-1 backdrop-blur-xl">
        <span className="px-2 text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF]">
          Hop
        </span>
        <HopButton
          label="Front (toward screen)"
          disabled={!hops.front}
          onClick={() => onHop(hops.front)}
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </HopButton>
        <HopButton
          label="Back (away from screen)"
          disabled={!hops.back}
          onClick={() => onHop(hops.back)}
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </HopButton>
        <HopButton
          label="Left seat"
          disabled={!hops.left}
          onClick={() => onHop(hops.left)}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </HopButton>
        <HopButton
          label="Right seat"
          disabled={!hops.right}
          onClick={() => onHop(hops.right)}
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </HopButton>

        <div className="mx-1 h-5 w-px bg-white/[0.08]" />

        <HopButton label="Recenter view" onClick={recenter}>
          <Crosshair className="h-3.5 w-3.5" />
        </HopButton>
      </div>

      <button
        type="button"
        onClick={() => setMode("2d")}
        className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#141418]/70 px-3 py-1 text-[10px] font-medium text-[#9CA3AF] backdrop-blur-xl transition hover:text-white"
      >
        <Compass className="h-3 w-3" /> Drag to look around · ESC to 2D map
      </button>
    </div>
  );
}

function HopButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full transition",
        disabled
          ? "cursor-not-allowed text-white/15"
          : "text-[#9CA3AF] hover:bg-white/[0.08] hover:text-[#F5A623]"
      )}
    >
      {children}
    </button>
  );
}

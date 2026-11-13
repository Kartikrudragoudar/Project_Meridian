"use client";

import { useMemo, useState } from "react";
import {
  AUDITORIUM,
  ROW_LETTERS,
  COL_NUMBERS,
  buildAllSeats,
  type SeatData,
} from "@/lib/cinema";
import { useMeridian } from "@/store/meridian-store";
import { cn } from "@/lib/utils";
import { QualityBadge } from "./quality-badge";
import { Legend } from "./legend";
import { Box, ArrowRight, X, Info } from "lucide-react";

// Build the seat catalogue once (deterministic).
const ALL_SEATS: SeatData[] = buildAllSeats();

/**
 * Interactive 2D seat map. Renders a curved IMAX screen at the top, a stadium
 * grid of A..J × 1..16 with side aisles, a legend, and a floating glass card
 * showing the currently selected seat + "Preview View in 3D" CTA.
 */
export function SeatMap2D() {
  const selectedRow = useMeridian((s) => s.rowIndex);
  const selectedCol = useMeridian((s) => s.colIndex);
  const selected = { rowIndex: selectedRow, colIndex: selectedCol };
  const selectSeat = useMeridian((s) => s.selectSeat);
  const setMode = useMeridian((s) => s.setMode);
  const [hovered, setHovered] = useState<{ row: number; col: number } | null>(
    null
  );

  // Pre-bucket seats by row for fast rendering.
  const rows = useMemo(() => {
    const map: SeatData[][] = Array.from(
      { length: AUDITORIUM.rows },
      () => []
    );
    for (const s of ALL_SEATS) map[s.rowIndex].push(s);
    return map;
  }, []);

  const hoveredSeat =
    hovered != null
      ? ALL_SEATS.find((s) => s.rowIndex === hovered.row && s.colIndex === hovered.col)
      : null;

  const selectedSeat = ALL_SEATS.find(
    (s) => s.rowIndex === selected.rowIndex && s.colIndex === selected.colIndex
  )!;

  return (
    <div className="relative flex h-full w-full flex-col">
      {/* Stage area (scrollable on small screens) */}
      <div className="relative flex-1 overflow-auto no-scrollbar">
        <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 py-6 sm:px-6 lg:py-8">
          {/* Curved IMAX Screen */}
          <ScreenGraphic />

          {/* Stadium grid */}
          <div className="mt-6 flex flex-col items-center gap-[6px] overflow-x-auto no-scrollbar">
            {rows.map((rowSeats, rowIndex) => (
              <div
                key={rowIndex}
                className="flex w-max items-center gap-2"
              >
                {/* Left row label */}
                <RowLabel letter={ROW_LETTERS[rowIndex]} />

                {/* Seats with aisles — never wraps */}
                <div className="flex flex-nowrap items-center gap-1">
                  {rowSeats.map((seat) => {
                    // Insert an aisle visual gap AFTER colIndex 2 and 12.
                    const beforeAisleLeft =
                      seat.colIndex === AUDITORIUM.aisleAfterColLeft + 1;
                    const beforeAisleRight =
                      seat.colIndex === AUDITORIUM.aisleAfterColRight + 1;
                    const isSelected =
                      seat.rowIndex === selected.rowIndex &&
                      seat.colIndex === selected.colIndex;
                    const isHovered =
                      hovered?.row === seat.rowIndex &&
                      hovered?.col === seat.colIndex;

                    return (
                      <div
                        key={`${seat.rowIndex}-${seat.colIndex}`}
                        className="flex items-center"
                      >
                        <SeatCell
                          seat={seat}
                          selected={isSelected}
                          hovered={isHovered}
                          onSelect={() =>
                            seat.status === "available" &&
                            selectSeat(seat.rowIndex, seat.colIndex)
                          }
                          onHover={(h) =>
                            setHovered(
                              h
                                ? { row: seat.rowIndex, col: seat.colIndex }
                                : null
                            )
                          }
                        />
                        {beforeAisleLeft && <AisleGap />}
                        {beforeAisleRight && <AisleGap />}
                      </div>
                    );
                  })}
                </div>

                {/* Right row label */}
                <RowLabel letter={ROW_LETTERS[rowIndex]} />
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <Legend />
            <p className="text-[10px] text-[#9CA3AF]/70">
              Aisles between Seats 3–4 and 13–14. Rows ascend in stadium tiers.
            </p>
          </div>

          {/* Column numbers (subtle) — horizontally scrollable on mobile so they line up with the grid */}
          <div className="mt-3 overflow-x-auto no-scrollbar">
            <div className="mx-auto flex w-max items-center gap-1 pl-9">
              {COL_NUMBERS.map((n) => (
                <span
                  key={n}
                  className="w-[26px] text-center text-[9px] text-[#9CA3AF]/40"
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hover micro-tip */}
      {hoveredSeat && !isSameSeat(hoveredSeat, selected) && (
        <HoverTip seat={hoveredSeat} />
      )}

      {/* Floating selection pill */}
      <FloatingSelectionCard
        seat={selectedSeat}
        onPreview3D={() => setMode("3d")}
      />
    </div>
  );
}

function isSameSeat(a: SeatData, b: { rowIndex: number; colIndex: number }) {
  return a.rowIndex === b.rowIndex && a.colIndex === b.colIndex;
}

/* ------------------------------------------------------------- *
 * Sub-components
 * ------------------------------------------------------------- */

function RowLabel({ letter }: { letter: string }) {
  return (
    <span className="w-4 text-center text-[10px] font-semibold uppercase text-[#9CA3AF]/70 tabular">
      {letter}
    </span>
  );
}

function AisleGap() {
  return (
    <span
      aria-hidden
      className="inline-block h-3 w-3"
      style={{
        background:
          "linear-gradient(180deg, rgba(245,166,35,0.18) 0%, rgba(245,166,35,0.04) 100%)",
        borderRadius: "2px",
      }}
    />
  );
}

interface SeatCellProps {
  seat: SeatData;
  selected: boolean;
  hovered: boolean;
  onSelect: () => void;
  onHover: (hovering: boolean) => void;
}

function SeatCell({ seat, selected, hovered, onSelect, onHover }: SeatCellProps) {
  const isSweetSpot =
    seat.quality.label === "Sweet Spot" && seat.status === "available";
  const disabled = seat.status === "occupied";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      aria-label={`Row ${seat.rowLetter} Seat ${seat.seatNumber} — ${seat.quality.label}, ${seat.quality.priceLabel}${
        disabled ? " (occupied)" : ""
      }`}
      aria-pressed={selected}
      className={cn(
        "relative flex h-[26px] w-[26px] items-center justify-center rounded-[6px] text-[9px] font-semibold transition-all duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623]/60",
        disabled && "cursor-not-allowed bg-[#18181D] text-white/0",
        !disabled && !selected && "bg-[#2A2A32] hover:bg-[#3F3F4A] hover:scale-110",
        !disabled && !selected && isSweetSpot && "ring-1 ring-[#F5A623]/30",
        selected &&
          "bg-[#F5A623] text-[#0A0A0C] shadow-[0_0_20px_rgba(245,166,35,0.35)] scale-110"
      )}
    >
      {/* Sweet spot under-glow dot */}
      {isSweetSpot && !selected && (
        <span className="absolute -bottom-1 left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-full bg-[#F5A623]/60" />
      )}
      {selected && <span className="text-[9px]">{seat.seatNumber}</span>}
    </button>
  );
}

function ScreenGraphic() {
  return (
    <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center">
      {/* Perspective radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-12 -top-12 bottom-0 -z-10 opacity-90"
        style={{
          background:
            "radial-gradient(60% 80% at 50% 0%, rgba(245,166,35,0.18) 0%, rgba(56,189,248,0.10) 35%, rgba(10,10,12,0) 70%)",
        }}
      />
      {/* Curved IMAX screen — using SVG for the curve */}
      <svg
        viewBox="0 0 800 90"
        className="w-full"
        style={{ filter: "drop-shadow(0 0 30px rgba(56,189,248,0.25))" }}
      >
        <defs>
          <linearGradient id="screenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#E2E8F0" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#94A3B8" stopOpacity="0.18" />
          </linearGradient>
          <linearGradient id="screenInner" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#F5A623" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        {/* The curved plane */}
        <path
          d="M 40 70 Q 400 8 760 70 L 760 78 Q 400 16 40 78 Z"
          fill="url(#screenGrad)"
          opacity="0.9"
        />
        {/* Inner glow strip */}
        <path
          d="M 80 70 Q 400 24 720 70"
          fill="none"
          stroke="url(#screenInner)"
          strokeWidth="2"
          opacity="0.7"
        />
      </svg>
      <div className="mt-1 flex flex-col items-center gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/60">
          Screen
        </span>
        <span className="text-[9px] uppercase tracking-[0.2em] text-[#9CA3AF]/60">
          IMAX Laser 3D
        </span>
      </div>
    </div>
  );
}

function HoverTip({ seat }: { seat: SeatData }) {
  return (
    <div className="pointer-events-none fixed bottom-28 left-1/2 z-30 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0">
      <div className="glass-panel rounded-xl px-3 py-2 shadow-2xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white">
            {seat.rowLetter} • {seat.seatNumber}
          </span>
          <QualityBadge quality={seat.quality} />
        </div>
        <div className="mt-1 flex items-center gap-3 font-mono text-[10px] text-[#9CA3AF] tabular">
          <span>{seat.telemetry.distanceLabel}</span>
          <span>{seat.telemetry.fovLabel} FOV</span>
          <span className="text-[#F5A623]">{seat.quality.priceLabel}</span>
        </div>
      </div>
    </div>
  );
}

function FloatingSelectionCard({
  seat,
  onPreview3D,
}: {
  seat: SeatData;
  onPreview3D: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-5">
      <div className="pointer-events-auto animate-meridian-rise glass-panel flex w-full max-w-md flex-col gap-3 rounded-2xl p-4 shadow-2xl sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
        {/* Seat identity */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F5A623]/15 ring-1 ring-[#F5A623]/40">
            <Box className="h-5 w-5 text-[#F5A623]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2 whitespace-nowrap">
              <span className="text-sm font-semibold text-white">
                Row {seat.rowLetter} • Seat {seat.seatNumber}
              </span>
              <QualityBadge quality={seat.quality} />
            </div>
            <div className="mt-0.5 flex items-center gap-2 font-mono text-[11px] text-[#9CA3AF] tabular">
              <span className="text-[#F5A623]">{seat.quality.priceLabel}</span>
              <span className="text-white/15">•</span>
              <span>{seat.telemetry.distanceLabel}</span>
              <span className="text-white/15">•</span>
              <span>{seat.telemetry.fovLabel}</span>
            </div>
          </div>
        </div>

        {/* Primary CTA */}
        <button
          type="button"
          onClick={onPreview3D}
          className="group flex items-center justify-center gap-2 rounded-xl bg-[#F5A623] px-4 py-2.5 text-xs font-semibold text-[#0A0A0C] shadow-[0_0_20px_rgba(245,166,35,0.35)] transition-all hover:shadow-[0_0_28px_rgba(245,166,35,0.55)] hover:brightness-110 active:scale-[0.98]"
        >
          Preview View in 3D
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}

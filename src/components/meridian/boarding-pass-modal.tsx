"use client";

import { useMemo } from "react";
import {
  Clapperboard,
  Calendar,
  Sparkles,
  X,
  Download,
  CheckCircle2,
  Film,
  Eye,
} from "lucide-react";
import { buildAllSeats } from "@/lib/cinema";
import { useMeridian } from "@/store/meridian-store";
import { cn } from "@/lib/utils";

const ALL_SEATS = buildAllSeats();

/** Deterministically generate an SVG QR code matrix from a string seed. */
function generateQRMatrix(seed: string, size = 21): boolean[][] {
  // Deterministic pseudo-random generator (mulberry32) — state MUST be mutable
  // so successive rng() calls produce different values.
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  const rng = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const matrix: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false)
  );

  // Place "finder" patterns at 3 corners (standard QR look).
  const placeFinder = (r: number, c: number) => {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        const edge =
          i === 0 || i === 6 || j === 0 || j === 6 ||
          (i >= 2 && i <= 4 && j >= 2 && j <= 4);
        if (r + i < size && c + j < size) matrix[r + i][c + j] = edge;
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Fill the rest with deterministic noise
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const inFinder =
        (i < 8 && j < 8) ||
        (i < 8 && j >= size - 8) ||
        (i >= size - 8 && j < 8);
      if (inFinder) continue;
      matrix[i][j] = rng() > 0.5;
    }
  }
  return matrix;
}

function QRCode({ seed }: { seed: string }) {
  const size = 21;
  const cell = 6; // px per cell
  const matrix = useMemo(() => generateQRMatrix(seed, size), [seed]);
  const totalPx = size * cell;
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${totalPx} ${totalPx}`}
      className="rounded-md"
      role="img"
      aria-label="Digital boarding pass QR code"
    >
      <rect width={totalPx} height={totalPx} fill="#ffffff" rx="2" />
      {matrix.flatMap((row, i) =>
        row.map((on, j) =>
          on ? (
            <rect
              key={`${i}-${j}`}
              x={j * cell}
              y={i * cell}
              width={cell}
              height={cell}
              fill="#0A0A0C"
            />
          ) : null
        )
      )}
    </svg>
  );
}

export function BoardingPassModal() {
  const open = useMeridian((s) => s.bookingOpen);
  const closeBooking = useMeridian((s) => s.closeBooking);
  const confirmBooking = useMeridian((s) => s.confirmBooking);
  const reset = useMeridian((s) => s.reset);
  const rowIndex = useMeridian((s) => s.rowIndex);
  const colIndex = useMeridian((s) => s.colIndex);
  const isConfirmed = useMeridian((s) => s.bookingConfirmed);

  const seat = useMemo(
    () =>
      ALL_SEATS.find((s) => s.rowIndex === rowIndex && s.colIndex === colIndex)!,
    [rowIndex, colIndex]
  );

  if (!open) return null;

  const orderSeed = `MERIDIAN-DUNE-F-${seat.rowLetter}-${seat.seatNumber}-${Date.now()
    .toString(36)
    .slice(-6)}`;

  const onConfirm = () => {
    confirmBooking();
    closeBooking();
  };

  const onDownload = () => {
    // Trigger a tiny client-side SVG download of the QR
    const svg = document.getElementById("meridian-qr-svg");
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meridian-pass-${seat.rowLetter}${seat.seatNumber}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    // Then reset for the next booking
    reset();
  };

  const isConfirmedLocal = isConfirmed;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="boarding-pass-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={closeBooking}
      />

      {/* Pass */}
      <div className="relative z-10 w-full max-w-lg animate-meridian-rise">
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141418] shadow-2xl">
          {/* Top accent strip */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-cyan-400" />

          {/* Close */}
          <button
            type="button"
            onClick={closeBooking}
            className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.05] text-[#9CA3AF] transition hover:text-white"
            aria-label="Close boarding pass"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 px-5 pt-6 sm:px-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 ring-1 ring-amber-500/40">
              <Clapperboard className="h-4.5 w-4.5 text-[#F5A623]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#9CA3AF]">
                Meridian Cinemas
              </span>
              <h3
                id="boarding-pass-title"
                className="text-base font-semibold text-white"
              >
                Digital Boarding Pass
              </h3>
            </div>
          </div>

          {/* Movie info row */}
          <div className="mt-4 grid grid-cols-2 gap-3 px-5 sm:px-6">
            <Field
              label="Movie"
              value="DUNE: MESSIAH"
              hint="IMAX Laser 3D"
              icon={<Film className="h-3 w-3" />}
            />
            <Field
              label="Showtime"
              value="Tonight, 8:30 PM"
              hint="Hall 1"
              icon={<Calendar className="h-3 w-3" />}
            />
          </div>

          {/* Seat + summary pill */}
          <div className="mt-3 px-5 sm:px-6">
            <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-wider text-[#9CA3AF]">
                    Row
                  </span>
                  <span className="font-mono text-xl font-bold text-[#F5A623] tabular">
                    {seat.rowLetter}
                  </span>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-wider text-[#9CA3AF]">
                    Seat
                  </span>
                  <span className="font-mono text-xl font-bold text-[#F5A623] tabular">
                    {seat.seatNumber}
                  </span>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-wider text-[#9CA3AF]">
                    Quality
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {seat.quality.label}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[9px] uppercase tracking-wider text-[#9CA3AF]">
                  Paid
                </span>
                <span className="font-mono text-lg font-bold text-white tabular">
                  {seat.quality.priceLabel}
                </span>
              </div>
            </div>

            {/* Summary pill of spatial specs */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Pill icon={<Sparkles className="h-3 w-3 text-cyan-400" />}>
                {seat.telemetry.distanceLabel}
              </Pill>
              <Pill>{seat.telemetry.fovLabel} FOV</Pill>
              <Pill>{seat.telemetry.pitchLabel} tilt</Pill>
              <Pill>{seat.quality.label}</Pill>
            </div>
          </div>

          {/* Perforation */}
          <Perforation />

          {/* Stub with QR */}
          <div className="flex items-center gap-4 px-5 pb-5 pt-3 sm:px-6">
            <div
              id="meridian-qr-svg"
              className="h-24 w-24 shrink-0 rounded-md bg-white p-1.5"
            >
              <QRCode seed={orderSeed} />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#9CA3AF]">
                Order {orderSeed.slice(-12)}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-white/80">
                <Eye className="h-3 w-3 text-[#F5A623]" />
                Show at the entrance — your seat is reserved for 15 min
                after showtime.
              </div>
              <span className="text-[10px] text-[#9CA3AF]">
                Scanning validates Hall 1 access. Non-transferable.
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] bg-black/30 px-5 py-3 sm:px-6">
            <button
              type="button"
              onClick={onConfirm}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition",
                isConfirmedLocal
                  ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                  : "border border-white/[0.1] bg-white/[0.03] text-[#9CA3AF] hover:text-white"
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isConfirmedLocal ? "Confirmed" : "Confirm booking"}
            </button>
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#F5A623] px-4 py-2 text-xs font-semibold text-[#0A0A0C] shadow-[0_0_20px_rgba(245,166,35,0.35)] transition hover:brightness-110 active:scale-[0.98]"
            >
              <Download className="h-3.5 w-3.5" />
              Download Pass / Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------- subcomponents ----------------------- */

function Field({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-[#9CA3AF]">
        <span className="text-[#F5A623]">{icon}</span>
        {label}
      </div>
      <span className="mt-0.5 text-sm font-semibold text-white">{value}</span>
      <span className="text-[10px] text-[#9CA3AF]">{hint}</span>
    </div>
  );
}

function Pill({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] text-[#9CA3AF] tabular">
      {icon}
      {children}
    </span>
  );
}

function Perforation() {
  // Render a row of small dots simulating the perforated stub tear line.
  return (
    <div className="relative my-1 h-4">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/[0.06]" />
      <div className="absolute inset-x-3 top-0 flex h-full justify-between">
        {Array.from({ length: 28 }).map((_, i) => (
          <span
            key={i}
            className="my-auto h-2 w-2 rounded-full bg-[#0A0A0C] ring-1 ring-white/[0.06]"
          />
        ))}
      </div>
      <span className="absolute -left-1 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-[#0A0A0C]" />
      <span className="absolute -right-1 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-[#0A0A0C]" />
    </div>
  );
}

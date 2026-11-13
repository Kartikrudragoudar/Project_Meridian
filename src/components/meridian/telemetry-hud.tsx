"use client";

import { Maximize, Ruler, Crosshair, Eye, ArrowLeft, Ticket } from "lucide-react";
import { useMemo } from "react";
import {
  buildAllSeats,
  THX_FOV_RANGE,
  type SeatData,
} from "@/lib/cinema";
import { useMeridian } from "@/store/meridian-store";
import { QualityBadge } from "./quality-badge";
import { cn } from "@/lib/utils";

const ALL_SEATS: SeatData[] = buildAllSeats();

/**
 * Bottom translucent dock shown in 3D mode. Renders the seat header, 4 live
 * telemetry cards (Distance, Horiz. FOV w/ arc bar, Center Offset, Eye Tilt),
 * and the "Back to 2D Map" + "Confirm & Book" action buttons.
 */
export function TelemetryHUD() {
  const rowIndex = useMeridian((s) => s.rowIndex);
  const colIndex = useMeridian((s) => s.colIndex);
  const setMode = useMeridian((s) => s.setMode);
  const openBooking = useMeridian((s) => s.openBooking);

  const seat = useMemo(
    () =>
      ALL_SEATS.find((s) => s.rowIndex === rowIndex && s.colIndex === colIndex)!,
    [rowIndex, colIndex]
  );
  const t = seat.telemetry;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-3 sm:pb-4">
      <div className="pointer-events-auto w-full max-w-5xl rounded-2xl border border-white/[0.08] bg-[#141418]/80 p-3 shadow-2xl backdrop-blur-xl sm:p-4">
        {/* Top row — seat identity + actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5A623]/15 ring-1 ring-[#F5A623]/40">
              <Ticket className="h-5 w-5 text-[#F5A623]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline gap-2">
                <h2 className="text-sm font-semibold text-white">
                  Row {seat.rowLetter} • Seat {seat.seatNumber}
                </h2>
                <QualityBadge quality={seat.quality} />
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-[#9CA3AF] tabular">
                <span className="text-[#F5A623]">{seat.quality.priceLabel}</span>
                <span className="mx-1.5 text-white/15">•</span>
                <span>{t.distanceLabel}</span>
                <span className="mx-1.5 text-white/15">•</span>
                <span>{t.fovLabel} FOV</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode("2d")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-xs font-medium text-[#9CA3AF] transition hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to 2D Map
            </button>
            <button
              type="button"
              onClick={openBooking}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#F5A623] px-4 py-2 text-xs font-semibold text-[#0A0A0C] shadow-[0_0_20px_rgba(245,166,35,0.35)] transition hover:brightness-110 active:scale-[0.98]"
            >
              Confirm &amp; Book (${seat.quality.price.toFixed(2)})
            </button>
          </div>
        </div>

        {/* Telemetry cards */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <TelemetryCard
            icon={<Ruler className="h-3.5 w-3.5" />}
            label="Distance"
            value={t.distanceLabel}
            sub="to screen center"
            accent="amber"
          />
          <TelemetryCard
            icon={<Maximize className="h-3.5 w-3.5" />}
            label="Horiz. FOV"
            value={t.fovLabel}
            sub={
              <FOVArcBar
                fov={t.horizontalFOV}
                min={THX_FOV_RANGE.min}
                max={THX_FOV_RANGE.max}
              />
            }
            accent="cyan"
          />
          <TelemetryCard
            icon={<Crosshair className="h-3.5 w-3.5" />}
            label="Center Offset"
            value={t.offsetLabel}
            sub={`${t.centerOffsetPct}% from center`}
            accent={
              t.offsetDirection === "Center"
                ? "amber"
                : t.offsetDirection === "Left"
                ? "cyan"
                : "cyan"
            }
          />
          <TelemetryCard
            icon={<Eye className="h-3.5 w-3.5" />}
            label="Eye Tilt"
            value={t.pitchLabel}
            sub={
              t.verticalPitch > 0
                ? "looking up"
                : t.verticalPitch < 0
                ? "looking down"
                : "level"
            }
            accent="amber"
          />
        </div>
      </div>
    </div>
  );
}

interface TelemetryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: React.ReactNode;
  accent: "amber" | "cyan";
}

function TelemetryCard({ icon, label, value, sub, accent }: TelemetryCardProps) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/30 p-2.5 sm:p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#9CA3AF]">
        <span
          className={cn(
            accent === "amber" ? "text-[#F5A623]" : "text-[#38BDF8]"
          )}
        >
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-1 font-mono text-base font-semibold text-white tabular sm:text-lg">
        {value}
      </div>
      <div className="mt-0.5 text-[10px] text-[#9CA3AF] tabular">{sub}</div>
    </div>
  );
}

/** Mini SVG arc showing how close the FOV is to the THX 55°–65° range. */
function FOVArcBar({
  fov,
  min,
  max,
}: {
  fov: number;
  min: number;
  max: number;
}) {
  // Map FOV (30°–90°) to an arc sweep angle (180° = full semicircle)
  const start = 30;
  const end = 90;
  const pct = Math.max(0, Math.min(1, (fov - start) / (end - start)));
  const inTHX = fov >= min && fov <= max;
  const rangeStartPct = (min - start) / (end - start);
  const rangeEndPct = (max - start) / (end - start);

  // Arc geometry — semicircle of radius 28 centered at (32, 32)
  const r = 28;
  const cx = 32;
  const cy = 32;
  const polar = (frac: number): [number, number] => {
    // 0 = left (180°), 1 = right (0°). Sweep across the top semicircle.
    const ang = Math.PI * (1 - frac);
    return [cx + Math.cos(ang) * r, cy - Math.sin(ang) * r];
  };
  const arcPath = (from: number, to: number) => {
    const [x1, y1] = polar(from);
    const [x2, y2] = polar(to);
    const large = Math.abs(to - from) > 0.5 ? 1 : 0;
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(
      2
    )} ${y2.toFixed(2)}`;
  };
  const [markerX, markerY] = polar(pct);

  return (
    <div className="mt-1 flex items-center gap-1.5">
      <svg viewBox="0 0 64 36" className="h-5 w-12 shrink-0">
        {/* Track */}
        <path
          d={arcPath(0, 1)}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={3}
          strokeLinecap="round"
        />
        {/* THX ideal range */}
        <path
          d={arcPath(rangeStartPct, rangeEndPct)}
          fill="none"
          stroke="rgba(245,166,35,0.45)"
          strokeWidth={3}
          strokeLinecap="round"
        />
        {/* Current value marker */}
        <circle
          cx={markerX}
          cy={markerY}
          r={3.2}
          fill={inTHX ? "#F5A623" : "#38BDF8"}
          style={{
            filter: `drop-shadow(0 0 4px ${inTHX ? "#F5A623" : "#38BDF8"})`,
          }}
        />
      </svg>
      <span
        className={cn(
          "font-mono text-[9px] tabular",
          inTHX ? "text-[#F5A623]" : "text-[#9CA3AF]"
        )}
      >
        THX {min}–{max}°
      </span>
    </div>
  );
}

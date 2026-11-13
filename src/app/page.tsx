"use client";

import { useEffect } from "react";
import { Header } from "@/components/meridian/header";
import { SeatMap2D } from "@/components/meridian/seat-map-2d";
import { Auditorium3D } from "@/components/meridian/auditorium-3d";
import { ViewControls3D } from "@/components/meridian/view-controls-3d";
import { TelemetryHUD } from "@/components/meridian/telemetry-hud";
import { BoardingPassModal } from "@/components/meridian/boarding-pass-modal";
import { useMeridian } from "@/store/meridian-store";
import type { SeatData } from "@/lib/cinema";

export default function Home() {
  const mode = useMeridian((s) => s.mode);
  const setMode = useMeridian((s) => s.setMode);
  const setYaw = useMeridian((s) => s.setYaw);
  const setPitch = useMeridian((s) => s.setPitch);
  const selectSeat = useMeridian((s) => s.selectSeat);

  // Keyboard shortcuts — ESC returns to 2D, R recenters look-around.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (mode !== "3d") return;
      if (e.key === "Escape") setMode("2d");
      else if (e.key === "r" || e.key === "R") {
        setYaw(0);
        setPitch(0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, setMode, setYaw, setPitch]);

  const onDragYaw = (delta: number) => setYaw(delta);
  const onDragPitch = (delta: number) => setPitch(delta);
  const onSelectSeat = (seat: SeatData) =>
    selectSeat(seat.rowIndex, seat.colIndex);

  return (
    <main className="relative flex h-screen flex-col overflow-hidden bg-[#0A0A0C] text-white">
      <Header />

      {/* Stage */}
      <section className="relative flex-1 overflow-hidden">
        {mode === "2d" ? (
          <SeatMap2D />
        ) : (
          <>
            {/* The Canvas fills its parent absolutely. */}
            <div className="absolute inset-0">
              <Auditorium3D
                onDragYaw={onDragYaw}
                onDragPitch={onDragPitch}
                onSelectSeat={onSelectSeat}
              />
            </div>
            <ViewControls3D />
            <TelemetryHUD />
            {/* Subtle vignette + scanline overlays for cinematic feel */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)",
              }}
            />
          </>
        )}
      </section>

      {/* Booking modal overlay */}
      <BoardingPassModal />
    </main>
  );
}

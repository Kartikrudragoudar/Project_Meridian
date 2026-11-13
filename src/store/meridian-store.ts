/**
 * Meridian — global UI state (Zustand)
 * Selected seat, current view mode, 3D look-around offsets, booking modal.
 */
import { create } from "zustand";
import {
  AUDITORIUM,
  DEFAULT_SELECTION,
  ROW_LETTERS,
} from "@/lib/cinema";

export type ViewMode = "2d" | "3d";

interface MeridianState {
  rowIndex: number;
  colIndex: number;
  mode: ViewMode;
  /** Camera transition state: 'overview' (high) or 'seat' (sitting in seat). */
  cameraPhase: "overview" | "seat";
  /** Yaw offset from seat-forward, in degrees (-45..45). */
  yaw: number;
  /** Pitch offset from seat-forward, in degrees (-25..25). */
  pitch: number;
  bookingOpen: boolean;
  bookingConfirmed: boolean;

  selectSeat: (rowIndex: number, colIndex: number) => void;
  setMode: (mode: ViewMode) => void;
  setCameraPhase: (phase: "overview" | "seat") => void;
  setYaw: (v: number) => void;
  setPitch: (v: number) => void;
  recenter: () => void;
  openBooking: () => void;
  closeBooking: () => void;
  confirmBooking: () => void;
  reset: () => void;
}

const YAW_LIMIT = 45;
const PITCH_LIMIT = 25;

const clamp = (v: number, limit: number) =>
  Math.max(-limit, Math.min(limit, v));

export const useMeridian = create<MeridianState>((set) => ({
  rowIndex: DEFAULT_SELECTION.rowIndex,
  colIndex: DEFAULT_SELECTION.colIndex,
  mode: "2d",
  cameraPhase: "overview",
  yaw: 0,
  pitch: 0,
  bookingOpen: false,
  bookingConfirmed: false,

  selectSeat: (rowIndex, colIndex) =>
    set({ rowIndex, colIndex, yaw: 0, pitch: 0 }),
  setMode: (mode) => {
    set({ mode });
    if (mode === "3d") {
      set({ cameraPhase: "overview" });
      setTimeout(() => set({ cameraPhase: "seat" }), 60);
    } else {
      set({ cameraPhase: "overview", yaw: 0, pitch: 0 });
    }
  },
  setCameraPhase: (cameraPhase) => set({ cameraPhase }),
  setYaw: (v) => set({ yaw: clamp(v, YAW_LIMIT) }),
  setPitch: (v) => set({ pitch: clamp(v, PITCH_LIMIT) }),
  recenter: () => set({ yaw: 0, pitch: 0 }),
  openBooking: () => set({ bookingOpen: true }),
  closeBooking: () => set({ bookingOpen: false }),
  confirmBooking: () => set({ bookingConfirmed: true }),
  reset: () =>
    set({
      rowIndex: DEFAULT_SELECTION.rowIndex,
      colIndex: DEFAULT_SELECTION.colIndex,
      mode: "2d",
      cameraPhase: "overview",
      yaw: 0,
      pitch: 0,
      bookingOpen: false,
      bookingConfirmed: false,
    }),
}));

/** Convenience hook: derive the row letter from the store. */
export function useRowLetter(): string {
  return ROW_LETTERS[useMeridian((s) => s.rowIndex)];
}

export function auditoriumBounds() {
  return {
    rows: AUDITORIUM.rows,
    cols: AUDITORIUM.cols,
  };
}

/**
 * Meridian Cinema — Mathematical & Spatial Engine (Single Source of Truth)
 * --------------------------------------------------------------
 * Every 2D grid coordinate and every 3D world coordinate is derived from
 * the exact configuration below. The 2D seat map and the 3D auditorium
 * scene both import these formulas so they stay 1:1 in sync.
 */

export interface AuditoriumConfig {
  screenWidth: number;
  screenHeight: number;
  screenCenterY: number;
  screenZ: number;
  rows: number;
  cols: number;
  firstRowZ: number;
  rowSpacing: number;
  rowElevationStep: number;
  seatSpacing: number;
  aisleGap: number;
  eyeHeightOffset: number;
  /** colIndex boundaries — aisles appear AFTER these columns */
  aisleAfterColLeft: number;
  aisleAfterColRight: number;
}

export const AUDITORIUM: AuditoriumConfig = {
  screenWidth: 16,
  screenHeight: 7,
  screenCenterY: 4.5,
  screenZ: 0,
  rows: 10,
  cols: 16,
  firstRowZ: 6.0,
  rowSpacing: 1.5,
  rowElevationStep: 0.35,
  seatSpacing: 0.85,
  aisleGap: 0.7,
  eyeHeightOffset: 1.1,
  aisleAfterColLeft: 2, // gap after Seat 3 (colIndex 2)
  aisleAfterColRight: 12, // gap after Seat 13 (colIndex 12)
};

/** Row letters A..J (rowIndex 0..9) */
export const ROW_LETTERS: string[] = Array.from({ length: AUDITORIUM.rows }, (_, i) =>
  String.fromCharCode(65 + i)
);

/** Seat numbers 1..16 (colIndex 0..15) */
export const COL_NUMBERS: number[] = Array.from(
  { length: AUDITORIUM.cols },
  (_, i) => i + 1
);

export interface SeatPosition {
  x: number;
  y: number;
  z: number;
  /** Maximum hall half-width — equals seatX of (rowIndex 0, colIndex 15) */
  maxHallHalfWidth: number;
}

/**
 * Compute the world-space position of a seat given its grid coordinate.
 * Formulas taken verbatim from the spec.
 */
export function getSeatPosition(rowIndex: number, colIndex: number): SeatPosition {
  const {
    cols,
    seatSpacing,
    aisleGap,
    aisleAfterColLeft,
    aisleAfterColRight,
    rowElevationStep,
    eyeHeightOffset,
    firstRowZ,
    rowSpacing,
  } = AUDITORIUM;

  const baseX = (colIndex - (cols - 1) / 2) * seatSpacing;
  const aisleOffset =
    colIndex <= aisleAfterColLeft ? -aisleGap : colIndex > aisleAfterColRight ? aisleGap : 0;
  const seatX = baseX + aisleOffset;
  const seatY = rowIndex * rowElevationStep + eyeHeightOffset;
  const seatZ = firstRowZ + rowIndex * rowSpacing;

  // Max hall half-width = seatX of the corner seat (0, 15)
  const cornerBaseX = (cols - 1 - (cols - 1) / 2) * seatSpacing;
  const cornerSeatX = cornerBaseX + aisleGap;
  const maxHallHalfWidth = cornerSeatX; // approx 7.075

  return { x: seatX, y: seatY, z: seatZ, maxHallHalfWidth };
}

export interface SeatTelemetry {
  distance: number; // meters, raw
  distanceLabel: string; // e.g. "13.6m"
  horizontalFOV: number; // degrees
  fovLabel: string; // e.g. "61°"
  verticalPitch: number; // degrees, signed
  pitchLabel: string; // e.g. "+7°"
  centerOffsetPct: number; // 0..100
  offsetDirection: "Center" | "Left" | "Right";
  offsetLabel: string; // e.g. "4% Left"
}

export function getTelemetry(rowIndex: number, colIndex: number): SeatTelemetry {
  const { screenWidth, screenCenterY } = AUDITORIUM;
  const { x: seatX, y: seatY, z: seatZ, maxHallHalfWidth } = getSeatPosition(rowIndex, colIndex);

  const distance = Math.sqrt(
    seatX * seatX + (seatY - screenCenterY) ** 2 + seatZ * seatZ
  );
  const horizontalFOV = Math.round(
    2 * Math.atan(screenWidth / 2 / distance) * (180 / Math.PI)
  );
  const verticalPitch = Math.round(
    Math.atan((screenCenterY - seatY) / seatZ) * (180 / Math.PI)
  );
  const centerOffsetPct = Math.round((Math.abs(seatX) / maxHallHalfWidth) * 100);
  const offsetDirection =
    centerOffsetPct <= 4 ? "Center" : seatX < 0 ? "Left" : "Right";

  const pitchSign = verticalPitch > 0 ? "+" : "";
  const offsetLabel =
    offsetDirection === "Center"
      ? `${centerOffsetPct}% Center`
      : `${centerOffsetPct}% ${offsetDirection}`;

  return {
    distance,
    distanceLabel: `${distance.toFixed(1)}m`,
    horizontalFOV,
    fovLabel: `${horizontalFOV}°`,
    verticalPitch,
    pitchLabel: `${pitchSign}${verticalPitch}°`,
    centerOffsetPct,
    offsetDirection,
    offsetLabel,
  };
}

export type SeatQualityLabel =
  | "Sweet Spot"
  | "Up Close"
  | "Full Picture"
  | "Side Angle"
  | "Balanced View";

export interface SeatQuality {
  label: SeatQualityLabel;
  /** Tailwind text color class (e.g. "text-amber-400") */
  color: string;
  /** Raw hex used for both 2D badge and 3D emissive highlight */
  hex: string;
  /** Tailwind badge background tint class */
  badgeClass: string;
  price: number;
  priceLabel: string;
}

const QUALITY_PRESETS: Record<
  SeatQualityLabel,
  Omit<SeatQuality, "label" | "price" | "priceLabel">
> = {
  "Sweet Spot": {
    color: "text-amber-400",
    hex: "#F5A623",
    badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  "Up Close": {
    color: "text-rose-400",
    hex: "#FB7185",
    badgeClass: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  },
  "Full Picture": {
    color: "text-cyan-400",
    hex: "#38BDF8",
    badgeClass: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  },
  "Side Angle": {
    color: "text-slate-400",
    hex: "#94A3B8",
    badgeClass: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  },
  "Balanced View": {
    color: "text-emerald-400",
    hex: "#34D399",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
};

const PRICE_MAP: Record<SeatQualityLabel, number> = {
  "Sweet Spot": 22.5,
  "Up Close": 16.0,
  "Full Picture": 19.5,
  "Side Angle": 16.0,
  "Balanced View": 19.5,
};

export function getSeatQuality(rowIndex: number, colIndex: number): SeatQuality {
  const { centerOffsetPct, offsetDirection } = getTelemetry(rowIndex, colIndex);
  const isCenter = offsetDirection === "Center";

  let label: SeatQualityLabel;
  if (rowIndex >= 3 && rowIndex <= 6 && centerOffsetPct <= 18) {
    label = "Sweet Spot";
  } else if (rowIndex >= 0 && rowIndex <= 2) {
    label = "Up Close";
  } else if (rowIndex >= 7 && rowIndex <= 9 && centerOffsetPct <= 25) {
    label = "Full Picture";
  } else if (centerOffsetPct > 25) {
    label = "Side Angle";
  } else {
    label = "Balanced View";
  }

  const preset = QUALITY_PRESETS[label];
  const price = PRICE_MAP[label];
  return {
    label,
    price,
    priceLabel: `$${price.toFixed(2)}`,
    color: preset.color,
    hex: preset.hex,
    badgeClass: preset.badgeClass,
  };
}

export type SeatStatus = "available" | "occupied";

export interface SeatData {
  rowIndex: number;
  colIndex: number;
  rowLetter: string;
  seatNumber: number;
  status: SeatStatus;
  position: SeatPosition;
  telemetry: SeatTelemetry;
  quality: SeatQuality;
}

// Deterministic pseudo-random (mulberry32) — same occupied set on every load
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic ~25% occupied seats, clustered in center rows for realism. */
function generateOccupiedSet(): Set<string> {
  const rng = mulberry32(0x5eed_5eed);
  const occupied = new Set<string>();
  const key = (r: number, c: number) => `${r}-${c}`;

  for (let r = 0; r < AUDITORIUM.rows; r++) {
    // center rows D-G (3..6) get higher occupancy to feel "popular"
    const centerBoost = r >= 3 && r <= 6 ? 0.18 : 0.0;
    for (let c = 0; c < AUDITORIUM.cols; c++) {
      const base = 0.16; // baseline ~16%
      const isCenterCol = c >= 5 && c <= 10 ? 0.1 : 0;
      const roll = rng();
      if (roll < base + centerBoost + isCenterCol) {
        occupied.add(key(r, c));
      }
    }
  }
  return occupied;
}

const OCCUPIED_SET = generateOccupiedSet();

/** Default selected seat: Row F • Seat 8 (rowIndex 5, colIndex 7) */
export const DEFAULT_SELECTION = { rowIndex: 5, colIndex: 7 };

export function buildAllSeats(): SeatData[] {
  const seats: SeatData[] = [];
  for (let r = 0; r < AUDITORIUM.rows; r++) {
    for (let c = 0; c < AUDITORIUM.cols; c++) {
      const key = `${r}-${c}`;
      seats.push({
        rowIndex: r,
        colIndex: c,
        rowLetter: ROW_LETTERS[r],
        seatNumber: c + 1,
        status: OCCUPIED_SET.has(key) ? "occupied" : "available",
        position: getSeatPosition(r, c),
        telemetry: getTelemetry(r, c),
        quality: getSeatQuality(r, c),
      });
    }
  }
  return seats;
}

/** THX ideal horizontal FOV range — used by the mini arc bar in the HUD. */
export const THX_FOV_RANGE = { min: 55, max: 65 };

/** Quick lookup helpers used by hop buttons */
export function findSeat(
  seats: SeatData[],
  rowIndex: number,
  colIndex: number
): SeatData | undefined {
  return seats.find((s) => s.rowIndex === rowIndex && s.colIndex === colIndex);
}

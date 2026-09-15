import { ComputationError, needNonNegativeInt } from "./errors";

export type PressureDegree = "EXTREME" | "HEAVY" | "MODERATE-HEAVY" | "MODERATE" | "LIGHT" | "MINIMAL";

export interface PressureBand {
  degree: PressureDegree;
  zfpLow: number;
  zfpHigh: number;
}

interface CalibratedBand extends PressureBand {
  min: number;
}

export const PRESSURE_BANDS: readonly CalibratedBand[] = [
  { min: 12, degree: "EXTREME", zfpLow: 0, zfpHigh: 10 },
  { min: 10, degree: "HEAVY", zfpLow: 10, zfpHigh: 25 },
  { min: 8, degree: "MODERATE-HEAVY", zfpLow: 20, zfpHigh: 35 },
  { min: 6, degree: "MODERATE", zfpLow: 30, zfpHigh: 45 },
  { min: 4, degree: "LIGHT", zfpLow: 40, zfpHigh: 60 },
  { min: 0, degree: "MINIMAL", zfpLow: 60, zfpHigh: 100 },
];

export const ZFP_FROM_CONFLUENCE: Readonly<Record<PressureDegree, number>> = {
  EXTREME: 10,
  HEAVY: 20,
  "MODERATE-HEAVY": 30,
  MODERATE: 40,
  LIGHT: 55,
  MINIMAL: 65,
};

export function zfpLadder(battles: unknown): number {
  const n = needNonNegativeInt("zfpLadder", "battles", battles);
  return Math.min(60, 20 + Math.floor((n - 3) / 2) * 5);
}

function needConfluence(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 14) {
    throw new ComputationError("pressureBand", "confluence", `expected integer in [0,14], got ${String(value)}`);
  }
  return value;
}

export function pressureBand(confluence: unknown): PressureBand {
  const c = needConfluence(confluence);
  for (const band of PRESSURE_BANDS) {
    if (c >= band.min) return { degree: band.degree, zfpLow: band.zfpLow, zfpHigh: band.zfpHigh };
  }
  throw new ComputationError("pressureBand", "confluence", `no band covers ${String(confluence)}`);
}

export function zfpFromConfluence(confluence: unknown): number {
  return ZFP_FROM_CONFLUENCE[pressureBand(confluence).degree];
}

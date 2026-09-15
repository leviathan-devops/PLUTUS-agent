import { mirror_floor, quantize, type FloorVerdict } from "./oracles";
import { ComputationError, needFiniteNumber, needNonNegativeInt } from "./errors";

export function mirrorFloorTruth(n: unknown, p: unknown): number {
  const base = needFiniteNumber("mirrorFloorTruth", "n", n);
  const pressure = needFiniteNumber("mirrorFloorTruth", "p", p);
  if (base < 0 || pressure < 0) {
    throw new ComputationError("mirrorFloorTruth", "n|p", `expected finite non-negative, got n=${String(n)} p=${String(p)}`);
  }
  return base * (1 + pressure);
}

export function countSetups(designations: unknown): number {
  if (!Array.isArray(designations)) {
    throw new ComputationError("countSetups", "designations", `expected array, got ${String(designations)}`);
  }
  return designations.length;
}

export function dischargeMirrorFloor(setupCount: unknown, expectedSetups: unknown): FloorVerdict {
  if (typeof setupCount !== "number" || !Number.isInteger(setupCount) || setupCount < 0) {
    throw new RangeError(`[MIRROR_FLOOR_RANGE] setupCount=${String(setupCount)} must be a non-negative integer`);
  }
  if (typeof expectedSetups !== "number" || !Number.isInteger(expectedSetups) || expectedSetups <= 0) {
    throw new RangeError(`[MIRROR_FLOOR_RANGE] expectedSetups=${String(expectedSetups)} must be a positive integer`);
  }
  return mirror_floor({ setupCount, expectedSetups });
}

export function dischargeFromDesignations(designations: unknown, expectedSetups: unknown): FloorVerdict {
  return dischargeMirrorFloor(countSetups(designations), expectedSetups);
}

export function mirrorCoverage(activeMirrors: unknown, activeDxy: unknown): boolean {
  const mirrors = needNonNegativeInt("mirrorCoverage", "activeMirrors", activeMirrors);
  const dxy = needNonNegativeInt("mirrorCoverage", "activeDxy", activeDxy);
  return quantize(mirrors, 1) >= quantize(dxy, 1);
}

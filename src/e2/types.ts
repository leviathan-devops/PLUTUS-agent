export type PairKey = "DXY" | "EUR/USD" | "GBP/USD";
export type Direction = "LONG" | "SHORT";
export type ZoneKind = "DEMAND" | "SUPPLY";
export type ShapeState = "SS" | "BS" | "R" | "WL" | "RWL" | "WLS" | "PBS";

export interface ZoneRecord {
  id: string;
  zoneType: ZoneKind;
  floor: number;
  ceiling: number;
}

export interface ZoneMapSnapshot {
  pair: PairKey;
  zones: ZoneRecord[];
}

export interface DesignationInput {
  supplyZoneId: string;
  demandZoneId: string;
  keyZoneType: ZoneKind;
  deepDemandZoneId: string;
}

export interface Designation {
  day: string;
  pair: PairKey;
  direction: Direction;
  supplyZoneId: string;
  demandZoneId: string;
  keyZoneType: ZoneKind;
  deepDemandZoneId: string;
}

export const SIDE_INVERSION_VIOLATION = "SIDE_INVERSION_VIOLATION";
export const DESIGNATION_INCOMPLETE = "DESIGNATION_INCOMPLETE";
export const ILLEGAL_WORKFLOW_TRANSITION = "ILLEGAL_WORKFLOW_TRANSITION";
export const NO_SHAPE_TRANSITION = "NO_SHAPE_TRANSITION";

export class SideInversionViolation extends Error {
  readonly code = SIDE_INVERSION_VIOLATION;
  constructor(
    readonly pair: string,
    readonly day: string,
    readonly direction: Direction,
    readonly anchorZoneId: string,
  ) {
    super(
      `[${SIDE_INVERSION_VIOLATION}] ${pair} ${day} ${direction} consumed ${anchorZoneId}`,
    );
    this.name = "SideInversionViolation";
  }
}

export class DesignationIncomplete extends Error {
  readonly code = DESIGNATION_INCOMPLETE;
  constructor(
    readonly pair: string,
    readonly day: string,
    readonly reason: string,
  ) {
    super(`[${DESIGNATION_INCOMPLETE}] ${pair} ${day}: ${reason}`);
    this.name = "DesignationIncomplete";
  }
}

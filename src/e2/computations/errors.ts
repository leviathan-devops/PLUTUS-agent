export class ComputationError extends Error {
  readonly oracle: string;
  readonly field: string;
  constructor(oracle: string, field: string, detail: string) {
    super(`[${oracle}] malformed input — field '${field}': ${detail}`);
    this.name = "ComputationError";
    this.oracle = oracle;
    this.field = field;
  }
}

export function needNonNegativeInt(oracle: string, field: string, value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ComputationError(oracle, field, `expected non-negative integer, got ${String(value)}`);
  }
  return value;
}

export function needPositiveInt(oracle: string, field: string, value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new ComputationError(oracle, field, `expected positive integer, got ${String(value)}`);
  }
  return value;
}

export function needFiniteNumber(oracle: string, field: string, value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ComputationError(oracle, field, `expected finite number, got ${String(value)}`);
  }
  return value;
}

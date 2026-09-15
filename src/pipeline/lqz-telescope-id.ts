import { ANALYSIS_POINT_MS } from "../mdve/temporal.ts";

/** Deterministic LQZ id/createdAt stamp. Never Date.now — AP-5. */
export function lqzTelescopedIdentity(
  pair: string,
  side: string,
  index: number,
  firstSeen: number,
  level: number,
): string {
  const pairKey = pair.replace("/", "").toLowerCase();
  const formed = firstSeen > 0 ? firstSeen : ANALYSIS_POINT_MS;
  return `${pairKey}-lqz-${side.toLowerCase()}-${index}-${level}-${formed}`;
}

export function lqzTelescopedCreatedAt(firstSeen: number): number {
  return firstSeen > 0 ? firstSeen : ANALYSIS_POINT_MS;
}

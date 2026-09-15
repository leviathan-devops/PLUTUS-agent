// ESCALATION — the 4-tier TEB ladder (spec §B.W7 gate: "escalation drills (all 4 tiers +
// escape hatches)"). CALIBRATION: tiers 1-4 are the doctrine's fixed ladder, not magic
// numbers — T1 WARN + T2 REVIEW are advisory-first (never throw, never a silent block);
// T3 BLOCK + T4 HALT throw EscalationError; every tier offers the hatch transit
// (container-test / demanded-instrument / operator-override with a recorded reason).
import type { LexiconFinding } from "./lexicon-engine.js";

export type Tier = 1 | 2 | 3 | 4;
export type TierMode = "WARN" | "REVIEW" | "BLOCK" | "HALT";

export interface TierDecision {
  tier: Tier;
  mode: TierMode;
  message: string;
  hatchAvailable: boolean;
  occurrence: number;
  findingId: string;
}

export type HatchKind = "container-test" | "demanded-instrument" | "operator-override";

export interface HatchResult {
  granted: boolean;
  kind: HatchKind;
  findingId: string;
  reason: string;
  countReset: boolean;
}

export interface DrillResult {
  tier: Tier;
  mode: TierMode;
  threw: boolean;
  thrownCode: string | null;
  hatchGranted: boolean;
}

export class EscalationError extends Error {
  readonly code: "ESCALATION_BLOCK" | "ESCALATION_HALT";
  readonly tier: Tier;
  readonly findingId: string;

  constructor(code: "ESCALATION_BLOCK" | "ESCALATION_HALT", tier: Tier, findingId: string) {
    super(`${code}: tier-${tier} enforcement on ${findingId} — use requestHatch to transit`);
    this.name = "EscalationError";
    this.code = code;
    this.tier = tier;
    this.findingId = findingId;
  }
}

function assertFindingId(findingId: unknown): asserts findingId is string {
  if (typeof findingId !== "string" || findingId.length === 0) {
    throw new TypeError("ESCALATION_BAD_ID: findingId must be a non-empty string");
  }
}

function assertOccurrence(occurrence: unknown): asserts occurrence is number {
  if (typeof occurrence !== "number" || !Number.isInteger(occurrence) || occurrence < 1) {
    throw new RangeError(`ESCALATION_BAD_COUNT: occurrence must be a positive integer, got ${String(occurrence)}`);
  }
}

export function tierForOccurrence(occurrence: number): { tier: Tier; mode: TierMode } {
  assertOccurrence(occurrence);
  if (occurrence === 1) return { tier: 1, mode: "WARN" };
  if (occurrence === 2) return { tier: 2, mode: "REVIEW" };
  if (occurrence === 3) return { tier: 3, mode: "BLOCK" };
  return { tier: 4, mode: "HALT" };
}

export interface OverrideRecord {
  findingId: string;
  reason: string;
  at: string;
}

export class EscalationLadder {
  private readonly counts = new Map<string, number>();
  private readonly overrides: OverrideRecord[] = [];

  decide(findingId: string, occurrence: number): TierDecision {
    assertFindingId(findingId);
    const { tier, mode } = tierForOccurrence(occurrence);
    return {
      tier,
      mode,
      message: `tier-${tier} ${mode}: ${findingId} (occurrence ${occurrence})`,
      hatchAvailable: true,
      occurrence,
      findingId,
    };
  }

  enforce(decision: TierDecision, finding?: LexiconFinding): TierDecision {
    if (!decision || typeof decision.tier !== "number") {
      throw new TypeError("ESCALATION_BAD_DECISION: decision must be a TierDecision");
    }
    if (decision.tier === 1 || decision.tier === 2) return decision;
    if (decision.tier === 3) {
      throw new EscalationError("ESCALATION_BLOCK", 3, decision.findingId);
    }
    throw new EscalationError("ESCALATION_HALT", 4, decision.findingId);
  }

  track(finding: LexiconFinding): TierDecision {
    if (!finding || typeof finding.familyId !== "string" || finding.familyId.length === 0) {
      throw new TypeError("ESCALATION_BAD_FINDING: finding must carry a non-empty familyId");
    }
    if (!finding.triad || !finding.triad.evidence || typeof finding.triad.evidence.file !== "string") {
      throw new TypeError("ESCALATION_BAD_FINDING: finding must carry an evidence triad with a file");
    }
    const key = `${finding.familyId}::${finding.triad.evidence.file}:${finding.triad.evidence.line}`;
    const occurrence = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, occurrence);
    return this.enforce(this.decide(key, occurrence), finding);
  }

  countFor(key: string): number {
    assertFindingId(key);
    return this.counts.get(key) ?? 0;
  }

  requestHatch(kind: HatchKind, findingId: string, reason?: string): HatchResult {
    if (kind !== "container-test" && kind !== "demanded-instrument" && kind !== "operator-override") {
      throw new TypeError(`ESCALATION_BAD_HATCH: unknown hatch kind ${String(kind)}`);
    }
    assertFindingId(findingId);
    if (kind === "operator-override") {
      if (typeof reason !== "string" || reason.length === 0) {
        throw new TypeError("ESCALATION_BAD_OVERRIDE: operator-override requires a non-empty reason");
      }
      this.overrides.push({ findingId, reason, at: new Date().toISOString() });
    }
    let countReset = false;
    for (const key of [...this.counts.keys()]) {
      if (key === findingId || key.startsWith(`${findingId}::`) || findingId.startsWith(key)) {
        this.counts.delete(key);
        countReset = true;
      }
    }
    if (!countReset) this.counts.delete(findingId);
    return {
      granted: true,
      kind,
      findingId,
      reason:
        kind === "container-test"
          ? "container-test transit clears the occurrence count"
          : kind === "demanded-instrument"
            ? "demanded-instrument transit clears the occurrence count"
            : `operator override recorded: ${reason}`,
      countReset: true,
    };
  }

  runDrill(tier: Tier): DrillResult {
    if (tier !== 1 && tier !== 2 && tier !== 3 && tier !== 4) {
      throw new RangeError(`ESCALATION_BAD_TIER: tier must be 1-4, got ${String(tier)}`);
    }
    const probeId = `drill:probe:tier-${tier}`;
    const occurrence = tier === 4 ? 4 : tier;
    const decision = this.decide(probeId, occurrence);
    let threw = false;
    let thrownCode: string | null = null;
    try {
      this.enforce(decision);
    } catch (error) {
      threw = true;
      thrownCode = error instanceof EscalationError ? error.code : `UNEXPECTED:${String(error)}`;
    }
    const hatch = this.requestHatch("container-test", probeId);
    return { tier, mode: decision.mode, threw, thrownCode, hatchGranted: hatch.granted };
  }

  overrideLog(): OverrideRecord[] {
    return [...this.overrides];
  }
}

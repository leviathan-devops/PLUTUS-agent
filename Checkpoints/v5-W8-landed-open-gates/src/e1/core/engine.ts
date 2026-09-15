// OHLC-Intelligence-Lexicon-v1.0 — src/core/engine.ts
// The engine: one registry, one scoring classifier, one enforcement interface.
// Copied VERBATIM-in-structure from the IntelligenceLexicon-Edition-v1.0
// (src/core/engine.ts — the registry/classifier/scorer/enforcement/state-store).
// THE ADAPTATION: the scorer's signals are the trading Predicates over LexiconData
// (the MPSE law), not regex over text. The confidence formula is identical:
// pos/(pos+neg+1). The decision is identical-in-spirit: pos > neg ? classify : reject.
//
// Design authority: MASTER_CONTEXT/PLUTUS_V4.5.4_LEXICON_SPEC.md lines 7-31 (the
// machine form) + the operator's doctrine: "a refine/retry is correct. not a hard
// throw... only hard throw SPECIFIC MICRO COMPONENTS after they have failed 3
// refinements" (the ENFORCEMENT LAW, Plutus_Shark_Operator_Audit_Process.md line 539).

import type {
  ClassifierInput, ClassifierResult, LexiconData, MachineRule, OHLCBar,
  PatternFamily, Predicate, StructuredLexiconBlockError, ToolFirewall, ZoneModel,
} from './types';

// ── registry.ts ──────────────────────────────────────────────────────────────
export class LexiconRegistry {
  private machines = new Map<string, MachineRule>();
  private toolFirewalls = new Map<string, ToolFirewall>();

  registerMachine(rule: MachineRule): void {
    this.machines.set(rule.id, rule);
  }
  registerToolFirewall(tool: string, fw: ToolFirewall): void {
    this.toolFirewalls.set(tool, fw);
  }
  machine(id: string): MachineRule | undefined { return this.machines.get(id); }
  firewall(tool: string): ToolFirewall | undefined { return this.toolFirewalls.get(tool); }
  allMachines(): MachineRule[] { return [...this.machines.values()]; }
}

// ── the trading-type adaptations — the deterministic predicate helpers ───────
// (the MPSE deterministic utilities the machines' predicates share — the SMC
// ratio-based widths, the recency window, the candle groups, the consumption count.)

/** PROPOSED — the SMC large-OB ratio (width >= ratio x ATR14). The operator's pending ruling (REASONING_CHAIN_L1_SPEC §11.3 — never a fixed pip number). */
export const SMC_LARGE_OB_RATIO = 1.5;
/** The virgin-death-rule scope (the operator's Q3 answer): the 30m virgin MoMs + the 1H type-1 ONLY — the 4H zones never. */
export const DEATH_SCOPE_TFS: ReadonlyArray<string> = ['30m', '1H'];
/** The escalation threshold — three rejected classifications → the problem-solving dispatch. */
export const ESCALATION_THRESHOLD = 3;
/** The recency law — the 3-day vote window (VOTE_WINDOW_HOURS = 72). */
export const VOTE_WINDOW_HOURS = 72;

export function operativeZone(data: LexiconData): ZoneModel | undefined {
  if (data.meta.candidateZoneId) {
    const c = data.zones.find((z) => z.id === data.meta.candidateZoneId);
    if (c) return c;
  }
  return data.zones.slice().sort((a, b) => (b.zfp ?? 0) - (a.zfp ?? 0))[0];
}

export function zoneWidth(z: ZoneModel): number { return z.top - z.bottom; }

/** The widened bucket [lo−ε, hi+ε] (PROPOSED ε = max(2 pips, 0.05 × ATR14)). */
export function bucket(data: LexiconData, z: ZoneModel): { lo: number; hi: number } {
  const eps = Math.max(2 * data.meta.pip, 0.05 * data.meta.atr14);
  return { lo: z.bottom - eps, hi: z.top + eps };
}

/** The recency law: the bars within the 3-day vote window of the anchor, never past it (the temporal gate). */
export function windowBars(data: LexiconData): OHLCBar[] {
  return data.bars.filter((b) => b.t <= data.meta.anchorMs && data.meta.anchorMs - b.t <= VOTE_WINDOW_HOURS * 3600_000);
}

export function approachSide(data: LexiconData, z: ZoneModel): 'fromAbove' | 'fromBelow' | 'dwell' {
  const bs = windowBars(data);
  const above = bs.filter((b) => b.C > z.top).pop();
  const below = bs.filter((b) => b.C < z.bottom).pop();
  if (above && (!below || above.t > below.t)) return 'fromAbove';
  if (below) return 'fromBelow';
  return 'dwell';
}

/** The candle groups: the touches (the candles that actually touch the zone band). */
export function candlesTouching(data: LexiconData, z: ZoneModel): OHLCBar[] {
  const b = bucket(data, z);
  return windowBars(data).filter((x) => x.H >= b.lo && x.L <= b.hi);
}

/** The consumption events: the candles whose wick crossed the ENTIRE bucket (the SWEEP → reactionCount += 1). */
export function reactionCount(data: LexiconData, z: ZoneModel): number {
  const b = bucket(data, z);
  return windowBars(data).filter((x) => x.H > b.hi && x.L < b.lo).length;
}

export function largeOb(data: LexiconData, z: ZoneModel | undefined): boolean {
  if (!z) return false;
  return zoneWidth(z) >= SMC_LARGE_OB_RATIO * data.meta.atr14;
}

// ── semantic-scorer.ts (the trading form) ────────────────────────────────────
// The family's signature: opposed signal groups + scoring. A predicate hit
// INITIATES; the opposed predicates DECIDE. confidence = pos/(pos+neg+1).
// Fail-closed: a predicate that throws counts AGAINST the classification
// (error paths FIRST — the conservative default), never crashes the pipeline.
export function scoreSignals(data: LexiconData, family: PatternFamily): { pos: number; neg: number; evidence: string } {
  let pos = 0, neg = 0;
  let evidence = '';
  const hit = (p: Predicate, w: number): boolean => {
    try {
      const r = p(data);
      if (r && !evidence) evidence = p.name || 'predicate';
      return r;
    } catch {
      // the fail-closed path: a crashing predicate counts against (never silently passes)
      if (!evidence) evidence = p.name || 'predicate';
      return true;
    }
  };
  for (const p of family.descriptive) if (hit(p, 1)) neg += 1;
  for (const p of family.suggestive) if (hit(p, 1)) pos += 1;
  if (family.substitute) for (const p of family.substitute) if (hit(p, 2)) pos += 2;
  if (family.use) for (const p of family.use) if (hit(p, 3)) neg += 3;
  return { pos, neg, evidence };
}

export function confidence(pos: number, neg: number): number {
  return pos / (pos + neg + 1);
}

// ── classifier.ts ────────────────────────────────────────────────────────────
// Deterministic: no LLM calls at enforcement time. Same data → same verdict.
export function classify(input: ClassifierInput, families: PatternFamily[]): ClassifierResult {
  let bestPos = 0, bestNeg = 0, bestEvidence = '';
  const matched: string[] = [];
  const data = input.data;
  if (!data) return { intent: 'none', confidence: 0, action: 'allow', matchedFamilies: [], evidence: 'no LexiconData' };
  for (const f of families) {
    const s = scoreSignals(data, f);
    if (s.pos > 0) matched.push(f.group);
    if (s.pos > bestPos) { bestPos = s.pos; bestNeg = s.neg; bestEvidence = s.evidence; }
  }
  const conf = confidence(bestPos, bestNeg);
  const action: ClassifierResult['action'] = bestPos > 0 && bestPos > bestNeg ? 'classify' : 'reject';
  return {
    intent: action === 'classify' ? 'flagged' : 'none',
    confidence: conf,
    action,
    matchedFamilies: matched,
    evidence: bestEvidence,
    sessionID: input.sessionID,
  };
}

/** The AGGREGATE classifier — the obvious-trades-lexicon's form (the LEXICON_SPEC line 249: "the trade projection fires when the families' AGGREGATE pos > neg"). Sums the FOR/AGAINST evidence across ALL families — the forward-reasoning baseline. */
export function classifyAggregate(input: ClassifierInput, families: PatternFamily[]): ClassifierResult {
  let pos = 0, neg = 0;
  const matched: string[] = [];
  const data = input.data;
  if (!data) return { intent: 'none', confidence: 0, action: 'allow', matchedFamilies: [], evidence: 'no LexiconData' };
  for (const f of families) {
    const s = scoreSignals(data, f);
    if (s.pos > 0) matched.push(f.group);
    pos += s.pos;
    neg += s.neg;
  }
  const conf = confidence(pos, neg);
  const action: ClassifierResult['action'] = pos > 0 && pos > neg ? 'classify' : 'reject';
  return {
    intent: action === 'classify' ? 'flagged' : 'none',
    confidence: conf,
    action,
    matchedFamilies: matched,
    evidence: 'aggregate',
    sessionID: input.sessionID,
  };
}

// ── enforcement.ts ───────────────────────────────────────────────────────────
export function buildBlock(machine: string, detected: string, correction: string, phase: 'A' | 'B' = 'A'): StructuredLexiconBlockError {
  const err = new Error(`[${machine.toUpperCase()} BLOCK] ${detected}\n\n${correction}`) as StructuredLexiconBlockError;
  err.machine = machine;
  err.detected = detected;
  err.correction = correction;
  err.evidenceRequired = true;
  err.phase = phase;
  return err;
}

/** The refine/retry warning (the ENFORCEMENT LAW — never a bare hard-throw): carries the refinement count + the context. */
export function buildRefineWarning(machine: string, detected: string, correction: string, refinements: number): StructuredLexiconBlockError {
  const err = buildBlock(machine, detected, correction, 'A');
  err.refinements = refinements;
  return err;
}

// ── state-store.ts ───────────────────────────────────────────────────────────
// Session-scoped trackers with the 'default' dual-write (hooks lose sessionID)
// + globalThis backing (dual-instance/hot-reload hazard).
const g = globalThis as Record<string, any>;
const KEY = '__ohlc_intellilex_state__';

export interface SessionState {
  blockCount: number;
  lastBlocked: string;
  claimTimestamp: number;
  loadedSkills: Set<string>;
  chainFired: Set<string>;
  refinementCount: number;   // the trading adaptation: the per-session refinement counter (the hard-throw-after-3)
  auditTrail: string[];       // the trading adaptation: the Phase B classification-demand mutation log
}

export function sessionState(sessionID?: string): SessionState {
  const sid = sessionID || 'default';
  if (!g[KEY]) g[KEY] = new Map<string, SessionState>();
  const map = g[KEY] as Map<string, SessionState>;
  if (!map.has(sid)) {
    map.set(sid, { blockCount: 0, lastBlocked: '', claimTimestamp: 0, loadedSkills: new Set(), chainFired: new Set(), refinementCount: 0, auditTrail: [] });
  }
  const st = map.get(sid)!;
  if (sid !== 'default') {
    if (!map.has('default')) map.set('default', { blockCount: 0, lastBlocked: '', claimTimestamp: 0, loadedSkills: new Set(), chainFired: new Set(), refinementCount: 0, auditTrail: [] });
    const def = map.get('default')!;
    def.blockCount = st.blockCount; def.lastBlocked = st.lastBlocked; def.claimTimestamp = st.claimTimestamp;
    def.refinementCount = st.refinementCount; def.auditTrail = st.auditTrail;
  }
  return st;
}

// ── index.ts (core) ──────────────────────────────────────────────────────────
export const DEFAULT_MACHINES: MachineRule[] = []; // machines/index.ts fills this

/**
 * review-stage.ts — WAVE K1 — THE MANUAL POST-PIPELINE REVIEW STAGE.
 *
 * FIX PLAN §5 (the operator's ruling, verbatim): "New step post
 * current-pipeline complete. Current pipeline completes --> new manual
 * agent based review of all rejected setups (they should be logged
 * somewhere easily accessible) + refinement of 'diamond in the mud'
 * setups (sequential to force precision and focus to detail) --> pass
 * through mechanical quality filter (batch not sequential - all refined
 * trades batch passed through quality gate) --> 2 revision attempts
 * (starting from the first agent based pass) allowed --> generate final
 * updated reports with any refined setups that pass completion w/ notes
 * on how it was refined and why it was passed".
 *
 * THE PIPELINE FLOW (§5.1): the CURRENT PIPELINE COMPLETES (harvest → E1
 * → E2 CORE → cascade translation → E3 → report) → THE REJECTED-SETUP
 * REVIEW (manual, agent-driven, SEQUENTIAL) → THE 3D REFINEMENT MACHINE
 * per rejected setup (Layer 1-3 audit + model inference) → THE MECHANICAL
 * QUALITY FILTER (BATCH — all refined setups passed through the gates at
 * once) → 2 REVISION ATTEMPTS allowed (starting from the first agent
 * pass) → THE FINAL UPDATED REPORT.
 *
 * THE SEQUENTIAL DISCIPLINE (§5.2 — the operator: "I want to say batch
 * analysis w/ focus but batch might lead to skimming... make this
 * sequential to ensure each trade is properly looked at"): every rejected
 * setup is reviewed ONE AT A TIME — full depth. The review order: by pair
 * (DXY first — the source), then by day, then by severity.
 *
 * THE STAGE'S CONTRACT (this module): the stage is the MACHINERY — the
 * deterministic sequencing, the §19.1 audit cards, the verdict routing,
 * the batch quality filter, the bounded 2-revision loop, and the final
 * report assembly. The model-inference parts (the reasoning over the
 * scaffolding — the operator's "manual agent based review") are driven
 * THROUGH the stage by the agent (the orchestrator) via the hooks
 * (auditInputOf / refineOf / retranslateOf / reviseOf): the agent invokes
 * this stage per setup, supplies the model context, and reasons over the
 * mechanical cards the stage returns. Determinism is mechanical: no
 * wall-clock anywhere; every sort is a TOTAL comparator; the result
 * fingerprint is byte-identical on the same inputs (the diag proves the
 * ×2 canary).
 *
 * INPUT (§12): data/rejected_setups/{run}/rejected_setup_*.json — the
 * structured records Wave J3 writes (setupId, pair, lane, day, direction,
 * entry/sl/tp/rrr, the rejection reason, the layer-evidence snapshot,
 * the 3D machine's verdict + corrected anchors when it produced them). If
 * the log dir is empty or missing, the stage declares "no rejected
 * setups" HONESTLY and exits (no fabricated reviews).
 *
 * OUTPUT: ReviewStageResult — reviewed[] (the §19.1 audit cards),
 * refined[] (the batch-gate-passed 🔧 REFINED), rejected[] (the
 * genuinely-shit ✗ REJECTED with the full 3-layer audit trail),
 * reAdmitted[] (the false alarms ✓ RE-ADMITTED with the evidence), the
 * hallucination-detector stats, and the REVIEW_STAGE_ report section
 * (appended to the main report file — report_v452.md by default; the
 * standalone review_stage_{run}.md at the project root when the main
 * file isn't writable — flagged).
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { auditSetup3D } from './refinement-machine.js';
import type {
  ThreeDAuditInput,
  ThreeDAuditCard,
  ThreeDCorrectedAnchors,
  ThreeDLayerFindings,
  AuditVerdict,
  ReTranslateResult,
} from './refinement-machine.js';

// ═══════════════════════════════════════════════════════════════════════════════
// THE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** The §12 rejected-setup log record — the review's INPUT. Tolerant of
 *  extra fields (the log schema may evolve); every known field is
 *  null-guarded on read. */
export interface RejectedSetupRecord {
  setupId: string;
  run?: string;
  pair: string;
  lane: string;
  day: string;
  direction: 'LONG' | 'SHORT';
  entry: number; sl: number; tp: number;
  rrrComputed: number;
  rrrFloor: number;
  rejectionReason: string;
  hallucinationTrigger?: boolean;
  sourceSetupId?: string;
  sourceZone?: { id?: string; band?: [number, number] } | null;
  designatedZone?: { id?: string; band?: [number, number] } | null;
  opposingBoMWall?: { id?: string; band?: [number, number] } | null;
  layerFindings?: ThreeDLayerFindings | null;
  verdict?: AuditVerdict | null;
  correctedAnchors?: ThreeDCorrectedAnchors | null;
  refinementNote?: string | null;
  auditCard?: ThreeDAuditCard | null;
  [k: string]: unknown; // the §12 record's optional extras (tolerated)
}

/** The agent's model-inference bridges — the orchestrator drives the
 *  per-setup reasoning THROUGH the stage with these. Every bridge is
 *  optional; an absent bridge degrades the stage HONESTLY (never
 *  invents — the record's embedded data or a null-guarded skip). */
export interface ReviewStageHooks {
  /** Build the 3D audit input for a record (the model context). Null →
   *  the record's embedded card/findings are used; neither → honest
   *  absence (the card is null and the record stands on its raw verdict). */
  auditInputOf?: (record: RejectedSetupRecord) => ThreeDAuditInput | null;
  /** Re-audit a candidate at the CORRECTED anchors (the batch gate's
   *  T1-T8 re-verification). Null → the gate verifies the mechanical
   *  subset (RRR recompute + the direction/zone sanity) — honest. */
  reAuditInputOf?: (record: RejectedSetupRecord, corrected: ThreeDCorrectedAnchors) => ThreeDAuditInput | null;
  /** The REFINE correction (the T1-T8 mechanics: entry = the internal-LQZ
   *  near edge, SL = the next rung + buffer, TP = the opposing BoM wall's
   *  internal LQZ). Null → the record's own correctedAnchors are used;
   *  neither → HARD REJECT (the REFINE verdict without a correction is a
   *  dead end — the D36 discipline). */
  refineOf?: (record: RejectedSetupRecord, card: ThreeDAuditCard) => { corrected: ThreeDCorrectedAnchors; note: string } | null;
  /** The RE_TRANSLATE loop (the 3D machine's retranslateSetup). Null →
   *  the record's correctedAnchors are used; neither → HARD REJECT. */
  retranslateOf?: (record: RejectedSetupRecord, card: ThreeDAuditCard) => ReTranslateResult | null;
  /** The 2nd revision (attempt 2 — the operator's ONE revision for the
   *  batch-gate failures): re-audit with the gate's failure evidence and
   *  return the revised correction. Null → the candidate is HARD
   *  REJECTED at attempt 2 (attempt 3+ is never reached). */
  reviseOf?: (record: RejectedSetupRecord, card: ThreeDAuditCard, failures: string[]) => { corrected: ThreeDCorrectedAnchors; note: string } | null;
}

/** The §5.4 golden 3-pip re-check reference (the operator's golden
 *  coverage — the diag supplies the reference data; the stage never
 *  hardcodes price levels). The golden coverage is measured on the
 *  ENTRIES (diag-golden-coverage.ts:34 — the 3-pip "PRECISION IS THE
 *  ONLY METRIC" ruling): the corrected entry must stay within 3 pips of
 *  the golden reference for the same pair/day/direction. */
export interface GoldenRef {
  pair: string;
  day: string;
  direction: 'LONG' | 'SHORT';
  entry: number;
}

export interface ReviewStageOptions {
  /** The {run} dir under the log root. Default: the runId argument; when
   *  runId is 'latest' (or empty) → the lexically-max run dir. */
  run?: string;
  /** The log root (default 'data/rejected_setups'). */
  logRoot?: string;
  /** Seeded records — the diag feeds the fixture this way (no fs read). */
  records?: RejectedSetupRecord[];
  /** The agent bridges (see ReviewStageHooks). */
  hooks?: ReviewStageHooks;
  /** The default RRR floor (3.0 — the firewall). */
  rrrFloor?: number;
  /** The golden 3-pip re-check references (§5.4). */
  goldenRefs?: GoldenRef[];
  /** The main report path (default 'report_v452.md' — appended). */
  reportPath?: string;
  /** The project root for the standalone fallback (default '.'). */
  projectRoot?: string;
  /** Write the report? (default true — the diag turns it off for the
   *  determinism ×2 probe, or points it at a temp path). */
  writeReport?: boolean;
  /** INTERNAL PLUMBING — the flag collector (the corrupt-record and the
   *  write-fallback flags). Not part of the public contract. */
  flagsRef?: string[];
}

/** The per-setup review outcome (reviewed[]). */
export interface AuditCard {
  setupId: string;
  pair: string;
  lane: string;
  day: string;
  direction: 'LONG' | 'SHORT';
  /** The §19.1 3D audit card (null → the record carried no card and no
   *  audit bridge was available — the raw verdict stands, honest). */
  card: ThreeDAuditCard | null;
  verdict: AuditVerdict;
  /** 1 = the first agent pass; 2 = the ONE revision (attempt 2);
   *  never > 2 (the D36 discipline — attempt 3+ is HARD REJECT). */
  revision: number;
  /** The batch-gate failures (empty = the candidate passed / not a
   *  refined candidate). */
  gateFailures: string[];
  /** The disposition: 'REFINED' | 'REJECTED' | 'RE_ADMITTED'. */
  disposition: 'REFINED' | 'REJECTED' | 'RE_ADMITTED';
}

/** A batch-gate-passed refinement (refined[] — 🔧 REFINED). */
export interface RefinedSetup {
  setupId: string;
  pair: string; lane: string; day: string; direction: 'LONG' | 'SHORT';
  before: { entry: number; sl: number; tp: number; rrr: number };
  after: { entry: number; sl: number; tp: number; rrr: number };
  revision: number;
  refinementNote: string; // the how/why note (the operator's requirement)
}

/** A genuinely-shit setup (rejected[] — ✗ REJECTED, the full trail). */
export interface RejectedSetup {
  setupId: string;
  pair: string; lane: string; day: string; direction: 'LONG' | 'SHORT';
  reason: string;       // the RAW rejection reason (layer-evidenced when the machine produced it)
  verdict: AuditVerdict;
  trail: string;        // the full 3-layer audit trail (or the raw reason when no card exists)
  revision: number;
}

/** A false alarm (reAdmitted[] — ✓ RE-ADMITTED). */
export interface ReAdmittedSetup {
  setupId: string;
  pair: string; lane: string; day: string; direction: 'LONG' | 'SHORT';
  falseRejectionEvidence: string;
  revision: number;
}

/** The hallucination-detector stats (§5.6 — the feedback for the
 *  mechanics: how many generic reasons were flagged, what the real
 *  causes were). */
export interface HallucinationStats {
  triggered: number;
  byVerdict: Record<string, number>;
  realCauses: string[]; // the distinct failing-layer causes behind the generic reasons
}

export interface ReviewStageStats {
  reviewed: number;
  refined: number;
  rejected: number;
  reAdmitted: number;
  reTranslated: number;
  revisionsUsed: number;
  hardRejects: number;
  hallucination: HallucinationStats;
}

/** The stage's deterministic result. */
export interface ReviewStageResult {
  run: string;
  reviewed: AuditCard[];
  refined: RefinedSetup[];
  rejected: RejectedSetup[];
  reAdmitted: ReAdmittedSetup[];
  report: string;
  stats: ReviewStageStats;
  /** true → the log was empty/missing — the stage declared "no rejected
   *  setups" and exited honestly (no fabricated reviews). */
  noRejectedSetups: boolean;
  /** The path the report section was written to. */
  reportPath: string;
  /** 'APPENDED' → report_v452.md got the section; 'STANDALONE' → the
   *  main file was not writable — review_stage_{run}.md was written at
   *  the project root instead (FLAGGED — the non-breaking option). */
  reportMode: 'APPENDED' | 'STANDALONE';
  flags: string[];
  /** The determinism canary: sha256 of the stable result payload —
   *  byte-identical on the same inputs (the ×2 proof). */
  fingerprint: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE DETERMINISTIC MACHINERY
// ═══════════════════════════════════════════════════════════════════════════════

/** The §4.1 hallucination-trigger phrase table (mirrored from
 *  refinement-machine.ts:581-585 — the canonical source; a generic
 *  rejection reason masks the real cause). */
const HALLUCINATION_TRIGGERS: readonly string[] = [
  'candles smaller', 'candles are smaller', 'smaller candles',
  'pair-native re-anchor', 'volatility differs', 'pair volatility',
  'candle size',
];

/** The canonical pair review order (§5.2 — DXY first, the source). */
const PAIR_RANK: Readonly<Record<string, number>> = {
  DXY: 0, 'EUR/USD': 1, 'GBP/USD': 2,
};
const UNKNOWN_PAIR_RANK = 3;

/** The canonical day order (§5.2 — then by day). */
const DAY_RANK: Readonly<Record<string, number>> = {
  Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6,
};
const UNKNOWN_DAY_RANK = 7;

/** The batch gate's RRR floor (the firewall — §5.4). */
const DEFAULT_RRR_FLOOR = 3.0;

/** The golden 3-pip re-check tolerance (§5.4 — the operator's metric). */
const GOLDEN_RE_CHECK_PIPS = 3.0;

/** The max revision attempts (the operator's "2 revision attempts" —
 *  attempt 3+ is HARD REJECT, the D36 discipline). */
const MAX_REVISIONS = 2;

/** The trigger matcher (the §4.1 table, case-insensitive). */
function hallucinationTriggered(text: string | null | undefined): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return HALLUCINATION_TRIGGERS.some((t) => lower.includes(t));
}

/** The stable sort comparator — the §5.2 total order (pair → day →
 *  severity → setupId tiebreak). Severity = the LOWEST rrr first (the
 *  most severe rejections get the first look). TOTAL: every field is
 *  compared with a deterministic key; two records NEVER compare equal
 *  (the setupId tiebreak). */
function compareRecords(a: RejectedSetupRecord, b: RejectedSetupRecord): number {
  const pairA = PAIR_RANK[a.pair] ?? UNKNOWN_PAIR_RANK;
  const pairB = PAIR_RANK[b.pair] ?? UNKNOWN_PAIR_RANK;
  if (pairA !== pairB) return pairA - pairB;
  const dayA = DAY_RANK[a.day] ?? UNKNOWN_DAY_RANK;
  const dayB = DAY_RANK[b.day] ?? UNKNOWN_DAY_RANK;
  if (dayA !== dayB) return dayA - dayB;
  const rrrA = Number.isFinite(a.rrrComputed) ? a.rrrComputed : Infinity;
  const rrrB = Number.isFinite(b.rrrComputed) ? b.rrrComputed : Infinity;
  if (rrrA !== rrrB) return rrrA - rrrB;
  if (a.setupId < b.setupId) return -1;
  if (a.setupId > b.setupId) return 1;
  // The absolute last resort (a fully-duplicated record) — the order is
  // still TOTAL (the original array index, which is deterministic for the
  // same input array).
  return 0;
}

/** The RRR recompute — the mechanical gate (NEVER trusts a claimed rrr:
 *  rrr = |tp − entry| / |entry − sl|, null-guarded against a degenerate
 *  zero risk). */
function recomputeRrr(entry: number, sl: number, tp: number): number | null {
  const risk = Math.abs(entry - sl);
  if (!(risk > 0) || !Number.isFinite(risk)) return null;
  const reward = Math.abs(tp - entry);
  if (!Number.isFinite(reward)) return null;
  return reward / risk;
}

/** The zone band of a record (the §12 sourceZone/designatedZone bands —
 *  the frozen-list integrity's anchor reference). Null → no band known. */
function zoneBandOf(record: RejectedSetupRecord): [number, number] | null {
  for (const z of [record.designatedZone, record.sourceZone]) {
    if (z && Array.isArray(z.band) && z.band.length === 2 &&
      Number.isFinite(z.band[0]) && Number.isFinite(z.band[1]) && z.band[0] < z.band[1]) {
      return [z.band[0], z.band[1]] as [number, number];
    }
  }
  return null;
}

/** The frozen-list integrity check: the corrected entry must stay on the
 *  SAME zone anchors (invariant 7 — "the refinement repairs on the same
 *  zone anchors (3 attempts, D36)"; the §8.1 anchor union is mechanical).
 *  A corrected entry that LEAVES the rejected setup's anchor band is a
 *  re-anchor, not a refinement — FAIL. When no band is recorded the
 *  check is NOT JUDGED (returns [] — the §12 log may legitimately omit
 *  the band; a record with a band IS verified, a record without one is
 *  honestly unverifiable — never a silent pass, never a false fail). */
function sameZoneIntegrity(record: RejectedSetupRecord, corrected: ThreeDCorrectedAnchors): string[] {
  const band = zoneBandOf(record);
  if (!band) return [];
  const [lo, hi] = band;
  if (corrected.entry < lo - 1e-9 || corrected.entry > hi + 1e-9) {
    return [`ZONE: the corrected entry ${corrected.entry.toFixed(5)} left the rejected anchor band [${lo.toFixed(5)}, ${hi.toFixed(5)}] — a re-anchor, NOT a refinement (D36 — HARD REJECT)`];
  }
  return [];
}

/** The directional sanity check (T2 mechanical proxy — a LONG must
 *  risk-below, target-above; a SHORT the mirror). */
function directionalSanity(record: RejectedSetupRecord, corrected: ThreeDCorrectedAnchors): string[] {
  const { entry, sl, tp } = corrected;
  if (record.direction === 'LONG') {
    if (!(sl < entry && entry < tp)) {
      return [`DIR: LONG geometry is degenerate (need sl < entry < tp — got sl ${sl}, entry ${entry}, tp ${tp})`];
    }
  } else if (record.direction === 'SHORT') {
    if (!(tp < entry && entry < sl)) {
      return [`DIR: SHORT geometry is degenerate (need tp < entry < sl — got tp ${tp}, entry ${entry}, sl ${sl})`];
    }
  } else {
    return [`DIR: unknown direction ${record.direction} — cannot verify`];
  }
  return [];
}

/** The §5.4 golden 3-pip re-check: a matching goldenRef (same pair, day,
 *  direction) constrains the corrected ENTRY to ≤ 3 pips (the golden
 *  coverage's entry metric — "PRECISION IS THE ONLY METRIC"). */
function goldenReCheck(goldenRefs: GoldenRef[] | undefined, record: RejectedSetupRecord, corrected: ThreeDCorrectedAnchors): string[] {
  if (!goldenRefs || goldenRefs.length === 0) return [];
  const pip = record.pair === 'DXY' ? 0.01 : 0.0001;
  const matches = goldenRefs.filter((g) =>
    g.pair === record.pair && g.day === record.day && g.direction === record.direction);
  if (matches.length === 0) return [];
  const deltas = matches.map((g) => Math.abs(corrected.entry - g.entry) / pip);
  const bestIdx = deltas.indexOf(Math.min(...deltas));
  const best = deltas[bestIdx]!;
  if (best > GOLDEN_RE_CHECK_PIPS) {
    return [`GOLDEN: the corrected entry is ${best.toFixed(1)}p from the golden ${matches[bestIdx]!.entry.toFixed(5)} (> ${GOLDEN_RE_CHECK_PIPS}p — the §5.4 coverage re-check FAILS)`];
  }
  return [];
}

/** THE BATCH MECHANICAL QUALITY FILTER (§5.4 — pure, deterministic,
 *  batch-safe: every refined candidate passes through the SAME gates,
 *  all at once). Returns the failure strings (empty = PASS). */
function batchQualityGate(
  record: RejectedSetupRecord,
  corrected: ThreeDCorrectedAnchors,
  note: string,
  opts: ReviewStageOptions,
): string[] {
  const failures: string[] = [];
  const floor = record.rrrFloor > 0 ? record.rrrFloor : (opts.rrrFloor ?? DEFAULT_RRR_FLOOR);

  // G1 — RRR ≥ floor, recomputed (the firewall — NEVER the claimed rrr).
  const rrr = recomputeRrr(corrected.entry, corrected.sl, corrected.tp);
  if (rrr === null) {
    failures.push(`RRR: the corrected geometry is degenerate (|entry−sl| ≈ 0) — no risk to reward`);
  } else if (rrr < floor - 1e-9) {
    failures.push(`RRR: recomputed ${rrr.toFixed(2)} < ${floor.toFixed(1)} (the firewall — the refined candidate FAILS the floor)`);
  }

  // G2 — the directional sanity (T2 mechanical proxy).
  failures.push(...directionalSanity(record, corrected));

  // G3 — the frozen-list integrity: the SAME zone anchors (invariant 7).
  failures.push(...sameZoneIntegrity(record, corrected));

  // G4 — the T1-T8 re-verification (the 3D machine re-audits at the
  // CORRECTED anchors — the machine's own admission semantics: the
  // re-audit verdict must NOT be REJECT_GENUINE (a pipeline-level break
  // — the corrected geometry is structurally unsound) and the T6 RRR box
  // must PASS. The machine's own ACTIVE mirrors carry T1/T3 sub-pip
  // findings (the micro-refine moves entries off the strict near edge —
  // refinement-machine.ts:172-198) — requiring an all-T-pass would
  // reject the machine's own admissions; the admission criterion is
  // verdict-not-REJECT_GENUINE + T6. When the re-audit bridge is absent,
  // the mechanical subset above (G1-G3) stands — honest. */
  const reAudit = opts.hooks?.reAuditInputOf?.(record, corrected) ?? null;
  if (reAudit) {
    const reCard = auditSetup3D(reAudit);
    if (reCard.verdict === 'REJECT_GENUINE') {
      failures.push(`T1-T8: the re-audit at the corrected anchors fired REJECT_GENUINE (${reCard.refinementNote})`);
    }
    if (reCard.layers.setup.T6.pass !== true) {
      failures.push(`T1-T8: the re-audit T6 (RRR) box FAILS at the corrected anchors — ${reCard.layers.setup.T6.evidence}`);
    }
  }

  // G5 — the §5.4 golden 3-pip re-check (the refined setups' deltas).
  failures.push(...goldenReCheck(opts.goldenRefs, record, corrected));

  // G6 — the note honesty: the how/why note is non-empty and carries NO
  // hallucination-trigger phrase (a generic note masks the real cause).
  if (!note || note.trim().length === 0) {
    failures.push('NOTE: the refinement note is EMPTY — the operator requires the how/why');
  } else if (hallucinationTriggered(note)) {
    failures.push('NOTE: the refinement note contains a hallucination-trigger phrase (generic — the real cause is masked)');
  }

  return failures;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE LOADER (the §12 log reader — honest on absence)
// ═══════════════════════════════════════════════════════════════════════════════

/** Resolve the actual run dir: opts.run ?? runId ('latest' → the
 *  lexically-max run dir under the log root). Deterministic given the
 *  filesystem state. Returns null when nothing resolves (the empty case). */
function resolveRun(runId: string, opts: ReviewStageOptions): string | null {
  if (opts.run && opts.run !== 'latest' && opts.run !== '') return opts.run;
  if (runId && runId !== 'latest' && runId !== '') return runId;
  // 'latest': scan the log root for the lexically-max run dir.
  const logRoot = opts.logRoot ?? join(opts.projectRoot ?? '.', 'data', 'rejected_setups');
  try {
    const dirs = readdirSync(logRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .filter((n) => !n.startsWith('.'))
      .sort();
    return dirs.length > 0 ? dirs[dirs.length - 1]! : null;
  } catch {
    return null; // no log root → no rejected setups (honest)
  }
}

/** Load the records: the seeded opts.records first, else the log dir's
 *  rejected_setup_*.json files. Returns [] when the dir is empty/missing
 *  (the honest "no rejected setups" state). */
function loadRecords(run: string, opts: ReviewStageOptions): RejectedSetupRecord[] {
  if (opts.records && opts.records.length > 0) return [...opts.records];
  const logRoot = opts.logRoot ?? join(opts.projectRoot ?? '.', 'data', 'rejected_setups');
  const runDir = join(logRoot, run);
  try {
    if (!existsSync(runDir) || !statSync(runDir).isDirectory()) return [];
    const files = readdirSync(runDir).filter((f) => /^rejected_setup_\d+\.json$/.test(f)).sort();
    const records: RejectedSetupRecord[] = [];
    for (const f of files) {
      try {
        const parsed = JSON.parse(readFileSync(join(runDir, f), 'utf8')) as RejectedSetupRecord;
        if (parsed && typeof parsed.setupId === 'string' && parsed.pair && parsed.direction) {
          records.push({ ...parsed, run: parsed.run ?? run });
        }
      } catch {
        // A corrupt record is skipped with a flag — never thrown (the
        // stage continues with the readable records; the report flags it).
        opts.flagsRef?.push(`corrupt log record skipped: ${f}`);
      }
    }
    return records;
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE PER-SETUP REVIEW (the sequential 3D audit — one at a time)
// ═══════════════════════════════════════════════════════════════════════════════

/** The §19.1 audit-card resolution order (deterministic):
 *  1. the record's embedded card (the 3D machine already audited it in
 *     the pipeline — Wave I1 threaded it onto the mirror outcomes);
 *  2. the record's layerFindings + verdict (the §12 log's evidence
 *     snapshot — the authoritative card the pipeline recorded; the log
 *     record IS the review's input substrate);
 *  3. the agent's auditInputOf bridge → auditSetup3D (the model context
 *     the orchestrator supplies — the fresh audit for records that
 *     carried no machine card — e.g. the pipeline's discarded mirrors);
 *  4. NOTHING → null (the honest absence — the raw verdict stands). */
function resolveCard(record: RejectedSetupRecord, opts: ReviewStageOptions): ThreeDAuditCard | null {
  if (record.auditCard && typeof record.auditCard.verdict === 'string') return record.auditCard;
  if (record.layerFindings && record.verdict) {
    const lf = record.layerFindings;
    // The FULL 22-box validation (P1-P8 + C1-C6 + T1-T8) — a findings
    // snapshot missing ANY box is an incomplete record (honest → null).
    const allBoxes = [
      ...(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'] as const).map((k) => lf.pipeline?.[k]),
      ...(['C1', 'C2', 'C3', 'C4', 'C5', 'C6'] as const).map((k) => lf.cascade?.[k]),
      ...(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'] as const).map((k) => lf.setup?.[k]),
    ];
    if (!allBoxes.every((box) => !!box && typeof box.pass === 'boolean' && typeof box.evidence === 'string')) {
      return null;
    }
    return {
      setupId: record.setupId,
      pair: record.pair,
      lane: record.lane,
      day: record.day,
      direction: record.direction,
      category: 'unknown',
      geometry: { entry: record.entry, sl: record.sl, tp: record.tp, rrr: record.rrrComputed, floor: record.rrrFloor > 0 ? record.rrrFloor : DEFAULT_RRR_FLOOR },
      layers: lf,
      rawRejectionReason: record.rejectionReason,
      hallucinationTrigger: record.hallucinationTrigger ?? hallucinationTriggered(record.rejectionReason),
      verdict: record.verdict,
      correctedAnchors: record.correctedAnchors ?? null,
      refinementNote: record.refinementNote ?? '',
    };
  }
  const input = opts.hooks?.auditInputOf?.(record);
  if (input) {
    try {
      return auditSetup3D(input);
    } catch {
      return null; // the audit bridge failed — honest (the record stands)
    }
  }
  return null;
}

/** The full 3-layer audit trail (the §19.2 evidence lines — the
 *  rejected[] deliverable). Deterministic — every P/C/T box with its
 *  PASS/FAIL + evidence. */
function auditTrailOf(card: ThreeDAuditCard | null, record: RejectedSetupRecord): string {
  if (!card) return record.rejectionReason || `no 3D audit card (no audit bridge) — the raw rejection reason stands: ${record.rejectionReason}`;
  const lines: string[] = [];
  const layers = card.layers;
  const push = (box: { check: string; pass: boolean; evidence: string }): void => {
    lines.push(`${box.check} ${box.pass ? 'PASS' : 'FAIL'} — ${box.evidence}`);
  };
  for (const k of ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'] as const) push(layers.pipeline[k]);
  for (const k of ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'] as const) push(layers.cascade[k]);
  for (const k of ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'] as const) push(layers.setup[k]);
  return lines.join('\n');
}

/** The false-rejection evidence (the reAdmitted[] deliverable — the §19.3
 *  STEP 6 note: what was wrong with the rejection). */
function falseRejectionEvidenceOf(card: ThreeDAuditCard): string {
  const boxes = [
    ...Object.values(card.layers.pipeline),
    ...Object.values(card.layers.cascade),
    ...Object.values(card.layers.setup),
  ];
  const failCount = boxes.filter((b) => !b.pass).length;
  return card.refinementNote ||
    `RE_ADMIT — ${boxes.length - failCount}/${boxes.length} boxes PASS on re-audit (0 failing layers) — the rejection was a FALSE ALARM`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE STAGE ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

/** The report section's canonical render (deterministic — no wall-clock,
 *  no random, no iteration-order dependence: every array is rendered in
 *  the stable review order). */
function renderReport(
  run: string,
  stats: ReviewStageStats,
  refined: RefinedSetup[],
  rejected: RejectedSetup[],
  reAdmitted: ReAdmittedSetup[],
  revisionLog: { setupId: string; attempt: number; what: string; why: string }[],
): string {
  const L: string[] = [];
  L.push(`## REVIEW_STAGE_${run}`);
  L.push('');
  L.push('> The manual post-pipeline review stage (FIX PLAN §5/§11.2/§12/§19) — appended by `src/mdve/review-stage.ts` (Wave K1). Pipeline: the current pipeline completes → the rejected-setup review (SEQUENTIAL — one setup at a time, no skimming) → the 3D refinement machine per rejected setup → the mechanical quality filter (BATCH — all refined setups through the gates together) → the 2-revision loop (attempt 3+ is HARD REJECT) → this final updated report.');
  L.push('');
  L.push('### REVIEW STAGE — THE STATS');
  L.push('');
  L.push('| metric | value |');
  L.push('|---|---|');
  L.push(`| reviewed (sequential 3D audits) | ${stats.reviewed} |`);
  L.push(`| refined (🔧 batch-gate-passed) | ${stats.refined} |`);
  L.push(`| rejected (✗ genuinely-shit) | ${stats.rejected} |`);
  L.push(`| re-admitted (✓ false alarms) | ${stats.reAdmitted} |`);
  L.push(`| re-translated (RE_TRANSLATE loop) | ${stats.reTranslated} |`);
  L.push(`| revisions used (the 2-attempt loop) | ${stats.revisionsUsed} |`);
  L.push(`| hard rejects (attempt 3+ / no correction) | ${stats.hardRejects} |`);
  L.push(`| hallucination triggers flagged | ${stats.hallucination.triggered} |`);
  L.push('');
  L.push('### 🔧 REFINED SETUPS (the diamond-in-the-mud — before → after, the why-it-passes note)');
  L.push('');
  if (refined.length === 0) {
    L.push('_none — no refined setup passed the batch quality filter._');
  } else {
    L.push('| setup | pair | lane | day | dir | before E/SL/TP/RRR | after E/SL/TP/RRR | rev | how it was refined / why it passes |');
    L.push('|---|---|---|---|---|---|---|---|---|---|');
    for (const r of refined) {
      const b = r.before; const a = r.after;
      L.push(`| ${r.setupId} | ${r.pair} | ${r.lane} | ${r.day} | ${r.direction} | ${b.entry.toFixed(5)}/${b.sl.toFixed(5)}/${b.tp.toFixed(5)}/${b.rrr.toFixed(2)} | ${a.entry.toFixed(5)}/${a.sl.toFixed(5)}/${a.tp.toFixed(5)}/${a.rrr.toFixed(2)} | ${r.revision} | ${r.refinementNote.replace(/\n/g, ' ')} |`);
    }
  }
  L.push('');
  L.push('### ✗ REJECTED SETUPS (the genuinely-shit — the full 3-layer audit trail)');
  L.push('');
  if (rejected.length === 0) {
    L.push('_none — every rejected setup was recovered._');
  } else {
    for (const r of rejected) {
      L.push(`- **${r.setupId}** (${r.pair} ${r.direction} ${r.day}) — verdict **${r.verdict}** (revision ${r.revision})`);
      L.push('  - raw reason: ' + (r.reason.replace(/\n/g, ' ')));
      L.push('  ```');
      L.push(r.trail.split('\n').map((t) => '  ' + t).join('\n'));
      L.push('  ```');
    }
  }
  L.push('');
  L.push('### ✓ RE-ADMITTED SETUPS (the false-rejection evidence)');
  L.push('');
  if (reAdmitted.length === 0) {
    L.push('_none._');
  } else {
    L.push('| setup | pair | lane | day | dir | evidence |');
    L.push('|---|---|---|---|---|---|');
    for (const r of reAdmitted) {
      L.push(`| ${r.setupId} | ${r.pair} | ${r.lane} | ${r.day} | ${r.direction} | ${r.falseRejectionEvidence.replace(/\n/g, ' ')} |`);
    }
  }
  L.push('');
  L.push('### THE HALLUCINATION-DETECTOR STATS (the generic-reason feedback — §5.6)');
  L.push('');
  L.push(`- generic rejection reasons flagged: **${stats.hallucination.triggered}**`);
  L.push(`- the flagged verdicts: ${Object.entries(stats.hallucination.byVerdict).map(([v, n]) => `${v}×${n}`).join(' · ') || '—'}`);
  if (stats.hallucination.realCauses.length === 0) {
    L.push('- the real causes: — (no generic reasons flagged)');
  } else {
    L.push('- the real causes behind the generic reasons (the failing-layer evidence):');
    for (const c of stats.hallucination.realCauses) L.push(`  - ${c}`);
  }
  L.push('');
  L.push('### THE REVISION LOG (the 2-attempt loop — every revision logged, what/why)');
  L.push('');
  if (revisionLog.length === 0) {
    L.push('_no revisions were needed._');
  } else {
    L.push('| setup | attempt | what | why |');
    L.push('|---|---|---|---|');
    for (const r of revisionLog) {
      L.push(`| ${r.setupId} | ${r.attempt} | ${r.what.replace(/\n/g, ' ')} | ${r.why.replace(/\n/g, ' ')} |`);
    }
  }
  L.push('');
  return L.join('\n');
}

/** The deterministic fingerprint: sha256 over the stable result payload
 *  (the ×2 canary — the same inputs → the identical byte string). */
function fingerprintOf(result: Omit<ReviewStageResult, 'report' | 'fingerprint'>): string {
  const stable = {
    run: result.run,
    reviewed: result.reviewed.map((c) => ({
      setupId: c.setupId, verdict: c.verdict, revision: c.revision,
      disposition: c.disposition, gateFailures: c.gateFailures,
      cardVerdict: c.card?.verdict ?? null,
      cardCorrected: c.card?.correctedAnchors ?? null,
    })),
    refined: result.refined,
    rejected: result.rejected,
    reAdmitted: result.reAdmitted,
    stats: result.stats,
    noRejectedSetups: result.noRejectedSetups,
  };
  return createHash('sha256').update(JSON.stringify(stable)).digest('hex');
}

/**
 * runReviewStage — THE WAVE-K1 STAGE ENTRY POINT.
 *
 * The operator's manual review, mechanized: reads the rejected-setup log
 * (or the seeded records), reviews EVERY setup SEQUENTIALLY (pair → day →
 * severity — one at a time, full depth), routes the verdicts (the
 * REJECT_GENUINE / REFINE / RE_ADMIT / RE_TRANSLATE matrix), refines the
 * diamond-in-the-mud through the agent's hooks, passes ALL refined
 * candidates through the BATCH mechanical quality filter TOGETHER (RRR ≥
 * 3.0 recomputed · T1-T8 re-audited · the same-zone integrity · the
 * golden 3-pip re-check · the note honesty), runs the bounded 2-revision
 * loop (attempt 1 → the gate; attempt 2 = the ONE revision with the gate
 * failure evidence; attempt 3+ = HARD REJECT), and assembles the final
 * updated report (🔧 REFINED with the before/after + the why-it-passes
 * notes · ✗ REJECTED with the full audit trail · ✓ RE-ADMITTED with the
 * false-rejection evidence · the hallucination-detector stats).
 *
 * Deterministic: no wall-clock; the review order is a total order; the
 * result fingerprint is byte-identical on the same inputs.
 */
export function runReviewStage(runId: string, opts: ReviewStageOptions = {}): ReviewStageResult {
  const flags: string[] = [];
  const optsWithFlags: ReviewStageOptions = { ...opts, flagsRef: flags };

  // ── 1. THE INPUT — resolve the run + load the records ──
  const run = resolveRun(runId, optsWithFlags) ?? (opts.run || runId || 'unknown-run');
  const records = loadRecords(run, optsWithFlags);

  const empty = {
    run,
    reviewed: [] as AuditCard[],
    refined: [] as RefinedSetup[],
    rejected: [] as RejectedSetup[],
    reAdmitted: [] as ReAdmittedSetup[],
    report: '',
    stats: {
      reviewed: 0, refined: 0, rejected: 0, reAdmitted: 0,
      reTranslated: 0, revisionsUsed: 0, hardRejects: 0,
      hallucination: { triggered: 0, byVerdict: {}, realCauses: [] as string[] },
    },
    noRejectedSetups: records.length === 0,
    reportPath: '',
    reportMode: 'STANDALONE' as 'APPENDED' | 'STANDALONE',
    flags: [] as string[],
    fingerprint: '',
  } satisfies ReviewStageResult;

  // ── THE HONEST EMPTY EXIT (§5.3 — "if the dir is empty, the stage
  //    declares 'no rejected setups' and exits honestly") ──
  if (records.length === 0) {
    empty.report = `## REVIEW_STAGE_${run}\n\n> The manual post-pipeline review stage (Wave K1).\n\n**NO REJECTED SETUPS** — the log \`${opts.logRoot ?? join(opts.projectRoot ?? '.', 'data', 'rejected_setups')}/${run}\` is empty or missing. The stage declares the review empty and exits honestly (no fabricated reviews — §5.3).\n`;
    empty.fingerprint = fingerprintOf(empty);
    const written = writeReport(run, empty.report, optsWithFlags);
    empty.reportPath = written.path;
    empty.reportMode = written.mode;
    if (written.flag) flags.push(written.flag);
    empty.flags = [...flags];
    return empty;
  }

  // ── 2. THE SEQUENTIAL REVIEW (one setup at a time — the §5.2 total
  //    order; each produces the §19.1 audit card + a disposition) ──
  const sorted = [...records].sort(compareRecords);
  const reviewed: AuditCard[] = [];
  const refined: RefinedSetup[] = [];
  const rejected: RejectedSetup[] = [];
  const reAdmitted: ReAdmittedSetup[] = [];
  const revisionLog: { setupId: string; attempt: number; what: string; why: string }[] = [];
  const hallucinationByVerdict: Record<string, number> = {};
  const realCauses: string[] = [];
  let reTranslated = 0;
  let revisionsUsed = 0;
  let hardRejects = 0;

  for (const record of sorted) {
    // ── the audit card (the §19.1 scaffolding — deterministic) ──
    const card = resolveCard(record, optsWithFlags);
    const verdict = card?.verdict ?? record.verdict ?? 'REJECT_GENUINE';

    // ── the hallucination-detector stats (the generic-reason feedback) ──
    const trig = card?.hallucinationTrigger ?? record.hallucinationTrigger ?? hallucinationTriggered(record.rejectionReason);
    if (trig) {
      hallucinationByVerdict[verdict] = (hallucinationByVerdict[verdict] ?? 0) + 1;
      if (card) {
        const fails = [...Object.values(card.layers.pipeline), ...Object.values(card.layers.cascade), ...Object.values(card.layers.setup)]
          .filter((c) => !c.pass)
          .map((c) => `${c.check} ${c.evidence}`);
        if (fails.length > 0) realCauses.push(`${record.setupId}: ${fails.join(' | ')}`);
        else realCauses.push(`${record.setupId}: the card shows NO failing layer — the generic reason masked a false alarm (RE_ADMIT-class)`);
      } else {
        realCauses.push(`${record.setupId}: no 3D card — the generic reason stands unaudited`);
      }
    }

    // ── the verdict routing (§10.4 matrix + §19.3 STEP 3) ──
    if (verdict === 'RE_ADMIT') {
      // The false alarm — the setup is valid on re-audit.
      const evidence = card ? falseRejectionEvidenceOf(card) : `RE_ADMIT verdict recorded by the pipeline (${record.rejectionReason}) — no card to re-verify`;
      reAdmitted.push({
        setupId: record.setupId, pair: record.pair, lane: record.lane, day: record.day, direction: record.direction,
        falseRejectionEvidence: evidence, revision: 1,
      });
      reviewed.push({ setupId: record.setupId, pair: record.pair, lane: record.lane, day: record.day, direction: record.direction, card, verdict, revision: 1, gateFailures: [], disposition: 'RE_ADMITTED' });
      continue;
    }

    if (verdict === 'REJECT_GENUINE') {
      // The genuinely-shit — the full 3-layer audit trail.
      rejected.push({
        setupId: record.setupId, pair: record.pair, lane: record.lane, day: record.day, direction: record.direction,
        reason: record.rejectionReason, verdict, trail: auditTrailOf(card, record), revision: 1,
      });
      reviewed.push({ setupId: record.setupId, pair: record.pair, lane: record.lane, day: record.day, direction: record.direction, card, verdict, revision: 1, gateFailures: [], disposition: 'REJECTED' });
      continue;
    }

    // ── REFINE / RE_TRANSLATE — the diamond-in-the-mud candidate ──
    let corrected: ThreeDCorrectedAnchors | null = null;
    let note = '';
    if (verdict === 'RE_TRANSLATE') {
      const re = optsWithFlags.hooks?.retranslateOf?.(record, card!);
      if (re && re.setup) {
        reTranslated += 1;
        corrected = { entry: re.setup.entry, sl: re.setup.sl, tp: re.setup.tp, rrr: re.setup.rrr };
        note = re.annotation;
      } else if (record.correctedAnchors) {
        reTranslated += 1;
        corrected = record.correctedAnchors;
        note = record.refinementNote ?? "RE_TRANSLATE — the record carries the pipeline's corrected anchors";
      } else {
        // No re-translation substrate → HARD REJECT with the trail.
        hardRejects += 1;
        const trail = re && !re.setup ? re.annotation : 'RE_TRANSLATE verdict with NO re-translation bridge and NO record.correctedAnchors — the translation error was never corrected (HARD REJECT)';
        rejected.push({
          setupId: record.setupId, pair: record.pair, lane: record.lane, day: record.day, direction: record.direction,
          reason: record.rejectionReason, verdict, trail, revision: 1,
        });
        reviewed.push({ setupId: record.setupId, pair: record.pair, lane: record.lane, day: record.day, direction: record.direction, card, verdict, revision: 1, gateFailures: ['RE_TRANSLATE: no correction produced'], disposition: 'REJECTED' });
        continue;
      }
    } else {
      // REFINE — the T1-T8 correction (the agent's hook, else the record's).
      const ref = optsWithFlags.hooks?.refineOf?.(record, card!) ?? (record.correctedAnchors ? { corrected: record.correctedAnchors, note: record.refinementNote ?? "REFINE — the record carries the pipeline's corrected anchors (T1-T8 mechanics)" } : null);
      if (ref) {
        corrected = ref.corrected;
        note = ref.note;
      } else {
        // The REFINE verdict WITHOUT a correction is a dead end (D36).
        hardRejects += 1;
        rejected.push({
          setupId: record.setupId, pair: record.pair, lane: record.lane, day: record.day, direction: record.direction,
          reason: record.rejectionReason, verdict,
          trail: auditTrailOf(card, record) + '\nREFINE verdict with NO corrected anchors (no refineOf hook, no record.correctedAnchors) — the diamond was never cut (HARD REJECT — D36)',
          revision: 1,
        });
        reviewed.push({ setupId: record.setupId, pair: record.pair, lane: record.lane, day: record.day, direction: record.direction, card, verdict, revision: 1, gateFailures: ['REFINE: no correction produced'], disposition: 'REJECTED' });
        continue;
      }
    }

    // ── THE 2-REVISION LOOP (§5.5): attempt 1 = this review's
    //    refinement; the BATCH gate decides; the failures get ONE
    //    revision (attempt 2 — the machine re-audits with the gate's
    //    failure evidence); attempt 3+ is NEVER reached (HARD REJECT).
    //    A clean state machine: exactly ONE disposition per record
    //    (REFINED xor REJECTED — never both, never neither). ──
    let attempt = 1;
    let gateFailures = batchQualityGate(record, corrected, note, optsWithFlags);
    let finalCorrected = corrected;
    let finalNote = note;
    let hardRejectTrail: string | null = null;

    if (gateFailures.length > 0) {
      // attempt 2 — the ONE revision (the operator's "2 revision attempts
      // starting from the first agent based pass").
      attempt += 1;
      revisionsUsed += 1;
      revisionLog.push({
        setupId: record.setupId, attempt,
        what: `the batch gate failed (${gateFailures.join('; ')}) — the 3D machine re-audits with the failure evidence`,
        why: 'the operator\'s 2-revision discipline: the refined setups that FAILED the batch quality gate get ONE revision',
      });
      const revised = optsWithFlags.hooks?.reviseOf?.(record, card!, gateFailures) ?? null;
      if (!revised) {
        // No revision substrate → HARD REJECT at attempt 2 (attempt 3
        // is never reached — the D36 discipline).
        hardRejectTrail =
          auditTrailOf(card, record) + '\n' +
          `BATCH-GATE FAILURES (attempt ${attempt - 1}): ${gateFailures.join(' | ')}\n` +
          'REVISION: the reviseOf hook produced NO revised correction — HARD REJECT at attempt 2 (the D36 discipline — attempt 3+ never runs)';
      } else {
        finalCorrected = revised.corrected;
        finalNote = revised.note;
        gateFailures = batchQualityGate(record, finalCorrected, finalNote, optsWithFlags);
        if (gateFailures.length > 0) {
          // The revision ALSO failed the gate → HARD REJECT at attempt 2.
          hardRejectTrail =
            auditTrailOf(card, record) + '\n' +
            `BATCH-GATE FAILURES (final, after revision ${attempt}): ${gateFailures.join(' | ')}`;
        }
      }
    }

    if (hardRejectTrail !== null) {
      // ── THE HARD REJECT (the genuinely-shit — the full trail) ──
      hardRejects += 1;
      rejected.push({
        setupId: record.setupId, pair: record.pair, lane: record.lane, day: record.day, direction: record.direction,
        reason: record.rejectionReason, verdict,
        trail: hardRejectTrail,
        revision: attempt,
      });
      reviewed.push({ setupId: record.setupId, pair: record.pair, lane: record.lane, day: record.day, direction: record.direction, card, verdict, revision: attempt, gateFailures, disposition: 'REJECTED' });
    } else {
      // ── THE BATCH-GATE-PASSED REFINEMENT (🔧 REFINED) ──
      const rrr = recomputeRrr(finalCorrected.entry, finalCorrected.sl, finalCorrected.tp) ?? 0;
      refined.push({
        setupId: record.setupId, pair: record.pair, lane: record.lane, day: record.day, direction: record.direction,
        before: { entry: record.entry, sl: record.sl, tp: record.tp, rrr: record.rrrComputed },
        after: { entry: finalCorrected.entry, sl: finalCorrected.sl, tp: finalCorrected.tp, rrr },
        revision: attempt,
        refinementNote: finalNote,
      });
      reviewed.push({ setupId: record.setupId, pair: record.pair, lane: record.lane, day: record.day, direction: record.direction, card, verdict, revision: attempt, gateFailures: [], disposition: 'REFINED' });
    }
  }

  // ── THE STATS ──
  const stats: ReviewStageStats = {
    reviewed: reviewed.length,
    refined: refined.length,
    rejected: rejected.length,
    reAdmitted: reAdmitted.length,
    reTranslated,
    revisionsUsed,
    hardRejects,
    hallucination: { triggered: Object.values(hallucinationByVerdict).reduce((a, b) => a + b, 0), byVerdict: hallucinationByVerdict, realCauses },
  };

  // ── THE FINAL UPDATED REPORT (§5.6) ──
  const report = renderReport(run, stats, refined, rejected, reAdmitted, revisionLog);

  const resultBase = {
    run, reviewed, refined, rejected, reAdmitted,
    stats, noRejectedSetups: false,
  };
  const fingerprint = fingerprintOf(resultBase as Omit<ReviewStageResult, 'report' | 'fingerprint'>);

  // ── THE REPORT WRITE: append to the main report; the standalone
  //    fallback when the main file isn't writable (the non-breaking
  //    option, FLAGGED) ──
  const written = writeReport(run, report, optsWithFlags);
  if (written.flag) flags.push(written.flag);

  return {
    ...resultBase,
    report,
    reportPath: written.path,
    reportMode: written.mode,
    flags,
    fingerprint,
  };
}

/** The report write — APPEND the REVIEW_STAGE_ section to the main
 *  report file (report_v452.md by default — the section renders after
 *  the main stats, the main content untouched). When the main file is
 *  NOT writable (EACCES/EROFS/missing dir) → the STANDALONE
 *  review_stage_{run}.md at the project root is written instead (the
 *  non-breaking option — the main report's determinism ×2 hash is never
 *  disturbed — FLAGGED). Deterministic: the section text is a pure
 *  function of the inputs; the append is byte-identical on the same run. */
function writeReport(
  run: string,
  section: string,
  opts: ReviewStageOptions,
): { path: string; mode: 'APPENDED' | 'STANDALONE'; flag: string | null } {
  const projectRoot = opts.projectRoot ?? '.';
  const mainPath = opts.reportPath ?? join(projectRoot, 'report_v452.md');
  try {
    const existing = existsSync(mainPath) ? readFileSync(mainPath, 'utf8') : '';
    // The IDEMPOTENT append: any previously-appended REVIEW_STAGE_ section
    // (ANY run — the main report carries the CURRENT review) is replaced
    // from its marker onward, and the base is normalized to a single
    // trailing-blank-line boundary. Re-appending the SAME run yields the
    // BYTE-IDENTICAL file (the determinism ×2 canary survives re-runs).
    const marker = '## REVIEW_STAGE_';
    const start = existing.indexOf(marker);
    const base = start >= 0 ? existing.slice(0, start) : existing;
    const normalized = base.replace(/\s+$/, '');
    const content = normalized.length === 0 ? section : normalized + '\n\n' + section;
    writeFileSync(mainPath, content, 'utf8');
    return { path: mainPath, mode: 'APPENDED', flag: null };
  } catch (err) {
    // The non-breaking fallback: the standalone review_stage file at the
    // project root (the main report is never mutated — its ×2 hash stays
    // pristine). FLAGGED per the mission: "choose the non-breaking option
    // and flag it".
    const fallbackPath = join(projectRoot, `review_stage_${run}.md`);
    try {
      writeFileSync(fallbackPath, section, 'utf8');
      return {
        path: fallbackPath,
        mode: 'STANDALONE',
        flag: `REPORT-FALLBACK: ${mainPath} was not writable (${(err as Error).message}) — the REVIEW_STAGE_ section was written to ${fallbackPath} instead (the main report is untouched — the non-breaking option)`,
      };
    } catch (err2) {
      opts.flagsRef?.push(`REPORT-WRITE-FAILED: neither ${mainPath} nor ${fallbackPath} was writable (${(err2 as Error).message}) — the report section is returned in the result only`);
      return { path: '', mode: 'STANDALONE', flag: 'REPORT-WRITE-FAILED: no report file written — the section is in the result.report' };
    }
  }
}

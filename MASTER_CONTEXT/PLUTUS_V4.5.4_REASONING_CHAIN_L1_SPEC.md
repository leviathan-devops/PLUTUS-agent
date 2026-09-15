# PLUTUS V4.5.4 — REASONING CHAIN + SHADOW-ENHANCED AGENT — L1 INITIAL PLAN

> **Build authority for the shadow-agent wave.** Every name below is REAL (from the provided context) unless tagged `PROPOSED:` — new modules the build agent creates. Every interface is the contract a build agent implements directly. Golden levels appear ONLY in §16 (the acceptance oracle) — never in the chain's computation input.

---

## 1. SCOPE

Construct the missing semantic-intent layer of the Plutus pipeline: a **reasoning chain** (the operator's 11-token sequence) running between E2 and E3, an embedded **shadow-enhanced agent** (deepseek v4 flash via opencode go) driving the forward-projection tokens, a **validation/refine/retry** loop with a **SQLite failure store**, and the **six-lexicon wiring** (phantom-BoM exemption, unified macro authority, forward-position predicate) enriching E1/E2/E3.

### 1.1 The operator's mapping (adopted verbatim — the design law)
- zones/candles = **regex** (the mechanical detection — the LMV/OBCV foundations work, DO NOT rebuild them)
- pressure mechanics = **semantic intent** (the MISSING layer — THIS is the build)
- shape chains = **semantically intelligent algorithmic systems**
- E1/E2/E3 pipeline = the deep-planning orchestration (E1 = zones, E2 = mirror projections, E3 = final setups)
- trade setups = **tool outputs** (the TradeProjection = the tool's output contract)

### 1.2 The pipeline's failure (the Monday test: native 2/5, cascade 0/3)
1. **EU LONG miss** — the virgin-MoM blanket death rule at `src/brains/shape-brain.ts:2330-2336` ("Virgin MoM zones are DEATH ZONES — automatic REJECT") rejected the operator's phantom-BoM demand `[1.14145-1.14000]` (the type-2 virgin MoM = the **fortress**, NOT a death zone).
2. **GU Monday direction inversion** — the per-pair classification produced R; the operator's golden was WL LONG. Root: the **unified macro authority is missing** — no single macro-direction authority that the per-pair classification must not contradict.
3. **Forward-reasoning absence** — the operator: *"the lack of forward looking reasoning and logic in this EXACT scenario... THIS is the root cause of literally ALL fucked trades."* The pipeline had no token-sequence that reasons forward from the zone to the target.

### 1.3 The law of the mirrors (the macro context)
- **EU/DXY mirror law**: the EU analysis exists 1:1 inverted on DXY — the same E1 zones, the same E2 chains, the same E3 setups, the directions inverted.
- **GU cascade law**: GU cascades from the EU — the same E1 zones + the same macro chain; the candles differ by the volatility. Match **ZONE ELEMENTS**, never price levels.
- **KCE-Telescoping** (`V3.4_KRONOS_CANDLE_ENGINE_SPEC` + `VISUAL_TELESCOPE_CHARTING_T2` + `Zone_Element_Mechanics`): the deterministic pipeline for the macro-origin continuation.

### 1.4 Hard constraints (the frozen surface)
- **Frozen pair, never touched**: `sl-lmv 91294083` · `trade-dedup 33914c89`.
- **Temporal gate**: `src/mdve/temporal.ts` (the locked run-anchor) never bypassed. The chain reads bars only up to `ANCHOR_MS`; the run-anchor locks the analysis horizon.
- **Golden levels = measurement oracle, never computation input**: `1.14110` (EU LONG), `100.972` (DXY Wed), `100.940/100.945/100.905/101.115` (DXY Mon), `[1.14145-1.14000]` (phantom-BoM) exist ONLY in the acceptance gate.
- **MPSE law**: the lexicons are deterministic predicates — fuzzy prose is the derailment. `score = pos/(pos+neg+1)`, always.
- **Enforcements = refine/retry, not hard-throw**: hard-throw ONLY after 3 failed refinements.
- **E3-NEVER**: a projection's anchors must trace to a specific E1 zone id + the E2 projection id.
- **Native lanes first, cascade complementary** (never overwriting).
- **Unified macro authority**: EU/DXY 1:1 inverted mirror; GU same-chain-different-candles. A per-pair classification contradicting the macro = a divergence BUG.
- **Token-set semantics**: 1 candle = 1 token; the set of tokens in the structured dataset = the relevant context (the TTE shapes). Candle groups = the touches + the pre-touch storyline + the post-reaction move.
- **Ratio-based widths** (SMC doctrine): an OB's width = a ratio anchored to the context (ATR / move-scale / TF) — never a fixed pip number.

---

## 2. GROUNDED FAILURE INVENTORY (evidence, not prose)

| # | Failure | Evidence (source of truth) | Root mechanism |
|---|---------|----------------------------|----------------|
| F1 | EU LONG rejected | `shape-brain.ts:2330-2336` — virgin-MoM blanket REJECT; operator's phantom-BoM demand `[1.14145-1.14000]` | The death rule has no exemption lane for the type-2 virgin MoM (the fortress: large-OB + mid-swing-recovery + opposing-BoM reaction + macro-origin continuation) |
| F2 | GU Monday direction inverted | per-pair classification R vs operator's WL LONG | No unified macro authority; the per-pair classifier is free to contradict the EU-cascade macro direction |
| F3 | No forward reasoning | Monday test native 2/5, cascade 0/3; the operator's root-cause quote | The pipeline stops at E2; there is no 11-token sequence producing a forward-positioned TradeProjection |
| F4 | E2 emitted before validation | cascade 0/3 — projections shipped unvalidated into E3 | No validation/refine/retry gate between E2 and E3 |
| F5 | Report duplication (historical) | `INDEPENDENT_AUDIT_v452.md`: 36 rows = 13 unique trades (7 DXY + 5 EU + 1 GU); total R 2.34× inflated | Dedup doctrine exists (`trade-dedup 33914c89` — FROZEN); the chain must not re-introduce duplication at the emission layer |
| F6 | Fixed-width SL/TP | `SL_vs_ENTRY_ANALYSIS.md`: util<0.40 → SL TOO WIDE (25 of 30 wins) | Fixed-pip widths violate the SMC ratio doctrine; widths must be ratio-anchored (ATR/move-scale/TF) |

**Design law from F1-F6**: the reasoning chain does NOT rebuild the LMV/OBCV/cascade mechanics. It adds (a) the exemption lane, (b) the macro authority, (c) the forward-projection tokens, (d) the validation gate, (e) the ratio-based width doctrine, (f) the failure store.

---

## 3. ARCHITECTURE OVERVIEW

```
                          ┌────────────────────────────────────────────────────────┐
 bars_raw.json            │  THE PIPELINE (E1 → E2 → E3)                            │
 (/tmp/opencode/          │                                                        │
  bars_raw.json)          │  E1: buildChartModel → generateSourceSetupsV45(model)  │
      │                   │      └ zone-classification-lexicon (phantom-BoM exempt)│
      ▼                   │      └ zone-pressure-lexicon + unified macro authority  │
 E1 ──► ZONES ───────────►│                                                        │
      │                   │  E2: cascadeV45(dxySetups, models, {v452, shapeChains, │
      │                   │      translatedDays}) → computeMirrorSL/TP (mirror.ts) │
      ▼                   │      └ validated by REASONING CHAIN tokens 1-7         │
 E2 ──► PROJECTIONS ─────►│            (deterministic 70%)                         │
      │                   │                                                        │
      ▼                   │  VALIDATE / REFINE / RETRY (≤3) ──┐                    │
 REASONING CHAIN ────────►│  SHADOW AGENT (tokens 8-11, 30%)   │  ┌─► SQLite       │
  (11-token ledger)       │  └ deepseek v4 flash via opencode go│  │   FAILURE      │
      │                   │  └ E/SL/TP CHECKABLE               │  │   STORE        │
      ▼                   │  └ deterministic fallback on timeout│ ─┘   (bun:sqlite) │
 E3 ──► TradeProjections ─┘  └ hard-throw ONLY after 3 → store │                   │
      │                                                        ▼                   │
      ▼                                              END-OF-PIPELINE SYNTHESIS     │
 HARVEST (diag-monday.ts)  ────────────────────►  (failure synthesis + next steps, │
      │                                             appended to PLUTUS_V4.5.3_     │
      ▼                                             BUILD_REPORT.md — append-only) │
 ACCEPTANCE GATE (diag-reasoning-chain-golden.ts)                                   │
      └ golden levels as ORACLE ONLY (never computation input)                     │
                              └────────────────────────────────────────────────────┘
```

### 3.1 The 11-token split (deterministic 70% / LLM 30%)
- **Tokens 1-7 — DETERMINISTIC** (lexicons + existing mdve machinery; no LLM): `zone-identification` → `pressure-status` → `liquidity` → `break-validation` → `strength-comparison` → `reaction-count` → `chain-progress`.
- **Tokens 8-11 — LLM-HOOKED** (deterministic skeleton + shadow-agent hook at the forward-projection tokens): `forward-position` → `chaining` → `anchors` → `validation`.

The shadow agent reads the lexicons' outputs + the E1/E2 data (the serialized token-set), runs the token sequence, validates/refines/retries the E2 before the E3. Its output is the `TradeProjection` with **E/SL/TP as CHECKABLE numbers**.

### 3.2 Existing modules (consumed, not rebuilt)
| Module | Role in the chain |
|--------|-------------------|
| `src/mdve/lmv.ts` | The 3-day vote; the rung table `(model.lmv as any).table` feeds token 3 (liquidity) |
| `src/mdve/resting-side.ts` | The structure pass; resting-side liquidity feeds token 3 |
| `src/mdve/mirror.ts` | `computeMirrorSL(E, anchor, dir, ladder, pair, pip, atr)` → `{sl, method, rungId}`; `computeMirrorTP(E, sl, anchor, dir, ladder, pip, {passThroughWeakWalls})` → `{tp, rungId, rrr}`; `proxyAtr1hPips(model, pip)` — feeds tokens 8-10 (anchors) |
| `src/mdve/temporal.ts` | The locked run-anchor — token 4's horizon |
| `src/brains/shape-brain.ts` | THE OVERHAUL TARGET — the virgin-MoM death rule at `:2330-2336` gets the surgical exemption (§11) |
| `src/mdve/obcv.ts` | `buildObcv(bars)` — BoM quality gates (`bw ≥ 3.0 ∧ bf ≥ 0.65`) feed token 5 (strength-comparison) |
| `report-v452.js` | `runChainV452()` → `{dxySource, eu, gu, ...}`; `buildE2Core(models, priorStorylines)` → `{euCoreChain, guCoreChain, euCascaded, guCascaded}` — the E2/E3 inputs |
| `src/pipeline/mdve-stage.js` | `floorSetupsToDedupRows(dxySetups, activeMirrors)` — the emission floor |
| `src/mdve/trade-dedup.js` | `dedupTrades(rows)` — FROZEN `33914c89`, consumed unchanged |

---

## 4. COMPONENT A — THE TRADE PROJECTION CONTRACT

`PROPOSED:` `src/mdve/trade-projection.ts`. The single output contract of the chain. Every field below is checkable.

```ts
// src/mdve/trade-projection.ts (PROPOSED)
import type { OHLCBar } from './src/types.js'; // existing

export type PairKey = 'DXY' | 'EUR/USD' | 'GBP/USD';
export type TimeframeKey = '1H' | '4H' | '30m' | '15m';
export type Direction = 'LONG' | 'SHORT';
export type ProjectionSource = 'NATIVE' | 'CASCADE' | 'MIRROR';
export type TokenId =
  | 'zone-identification' | 'pressure-status' | 'liquidity'
  | 'break-validation' | 'strength-comparison' | 'reaction-count'
  | 'chain-progress' | 'forward-position' | 'chaining'
  | 'anchors' | 'validation';

export interface PricePoint { price: number; sourceRef: string; } // sourceRef = zone id or projection id — the E3-NEVER anchor

export interface LexiconTrace {
  lexicon: 'candle-pressure' | 'candle-shape' | 'zone-classification'
          | 'zone-pressure' | 'shape-chain' | 'obvious-trades';
  family: 'suggestive' | 'descriptive' | 'substitute' | 'use';
  score: number;            // pos/(pos+neg+1) — the MPSE law
  verdict: string;          // the deterministic predicate result, never free prose
}

export interface TokenResult {
  token: TokenId;
  deterministic: boolean;       // tokens 1-7 true; 8-11 true (skeleton) w/ llmRefined flag
  llmRefined?: boolean;
  verdict: string;
  evidence: string[];           // file:line or token-set refs — never narration
  lexiconTraces?: LexiconTrace[];
}

export interface ChainContext {
  pair: PairKey;
  week: string;                 // '2026-07-06'
  anchorMs: number;             // 1783702800000 — the temporal gate
  tokens: TokenResult[];        // the 11-token ledger, ordered
  macroDirection: Direction;    // the unified macro authority verdict
  macroConsistent: boolean;     // false => divergence BUG recorded, never suppressed
  divergences: string[];        // per-pair classifications that contradicted the macro
}

export interface PressureRead {
  side: 'BUY' | 'SELL';
  score: number;                // fused candle-pressure + zone-pressure pos/(pos+neg+1)
  buyVotes: number; sellVotes: number;   // the probe-label vote mechanics
  wickMassRatio: number;        // lwm/uwm accumulation at the zone
}

export interface ProjectionAnchor {
  role: 'ENTRY' | 'SL' | 'TP';
  price: number;                 // CHECKABLE
  e1ZoneId: string;              // traces to a specific E1 zone (E3-NEVER)
  e2ProjectionId: string;        // traces to a specific E2 projection (E3-NEVER)
  method: string;                // 'mirror-lmv' | 'mirror-lqz' | 'continuation-target' | ...
  rungId?: string;               // the mirror.ts ladder rung
  widthRatio?: number;           // SMC ratio (width / ATR-anchor), never a fixed pip number
}

export interface TradeProjection {
  pair: PairKey;
  direction: Direction;
  entry: number;                 // CHECKABLE
  sl: number;                    // CHECKABLE
  tp: number;                    // CHECKABLE
  rrr: number;                   // |tp-entry| / |sl-entry|  (E/SL/TP sanity: tp-side of sl)
  pressureRead: PressureRead;
  chainContext: ChainContext;    // the 11-token ledger
  confidence: number;            // 0.0-1.0 — fused lexicon scores + shadow validation
  anchors: ProjectionAnchor[];   // every anchor must carry e1ZoneId + e2ProjectionId
  source: ProjectionSource;      // NATIVE first; CASCADE complementary, never overwriting
  day: string;                   // 'Monday' ... (report_v45.md day taxonomy)
  session: string;               // 'London Open 02:00-05:00 ET' | 'London Mid' | 'NY Mid 10:00-14:00 ET'
  setupId: string;               // the report_v45.md setup-id lineage
}

export function assertProjectionContract(p: TradeProjection): void {
  // throws ProjectionContractError — the E3-NEVER enforcement
  //   1. every anchor has non-empty e1ZoneId AND e2ProjectionId
  //   2. LONG: sl < entry < tp  |  SHORT: tp < entry < sl
  //   3. entry within [floor, ceiling] of its e1Zone (CLUSTER_TOLERANCE_PIPS = 2 pips)
  //   4. rrr >= 1.0 (a sub-1R projection is a refinement warning, not a hard error)
  //   5. confidence in [0,1]
}
```

### 4.1 The E3-NEVER rule (mechanical)
`assertProjectionContract` is called at the E3 emission boundary. A projection whose anchor lacks `e1ZoneId` or `e2ProjectionId` is a **pipeline error** → hard-throw → `ProjectionContractError` → SQLite failure store (§8) → end-of-pipeline synthesis (§8.3). It is NEVER silently dropped and NEVER auto-credited an anchor.

---

## 5. COMPONENT B — THE REASONING CHAIN CORE

`PROPOSED:` `src/mdve/reasoning-chain.ts`. The 11-token sequence engine — the deterministic skeleton with the LLM hooks at the forward-projection tokens.

### 5.1 Entry signature

```ts
// src/mdve/reasoning-chain.ts (PROPOSED)
import type { ChartModel } from './src/mdve/index.js';   // buildChartModel output
import type { TradeProjection, ChainContext, TokenResult, PairKey, TimeframeKey } from './trade-projection.js';
import type { LexiconBundle } from './lexicons/index.js'; // §9

export interface ReasoningChainInput {
  pair: PairKey;
  week: string;              // '2026-07-06'
  anchorMs: number;          // 1783702800000
  model: ChartModel;         // the E1 model (buildChartModel output, 8-arg: ..., bars15m last)
  lmvTable: Array<Record<string, unknown>>;  // (model.lmv as any).table
  e2: {                      // buildE2Core output (report-v452.js)
    euCoreChain?: unknown; guCoreChain?: unknown;
    euCascaded?: unknown;    guCascaded?: unknown;
  };
  dxySetups: unknown[];      // generateSourceSetupsV45(models.DXY)
  cascade: { eu: unknown[]; gu: unknown[] };   // cascadeV45 output (status === 'ACTIVE' filtered)
  barsByTf: Record<TimeframeKey, OHLCBar[]>;
  macro: MacroAuthorityInput;  // §10
  lexicons: LexiconBundle;     // §9
  shadow?: ShadowAgentClient;  // §6 — absent => deterministic fallback, confidence capped
  pip: number;                 // DXY_PIP = 0.01; EU/GU PIP = 0.0001 (trading-constants lineage)
  atr1hPips: number;           // proxyAtr1hPips(model, pip)
}

export interface ReasoningChainResult {
  projections: TradeProjection[];     // E3 output — validated, refined, anchored
  ledger: ChainContext;               // the full 11-token ledger per projection lineage
  failures: ChainFailure[];           // refinement-exhausted / contract-violating projections
  stats: { deterministicTokens: number; llmTokens: number; refinements: number; hardThrows: number; };
}

export async function buildReasoningChain(input: ReasoningChainInput): Promise<ReasoningChainResult>
```

### 5.2 Token execution order (the deterministic 70%)

| Token | Deterministic inputs (existing machinery) | Output | Lexicon |
|-------|-------------------------------------------|--------|---------|
| **1 zone-identification** | `model.zones` (E1) — the operative zone for the setup; classification BoM/MoM | `operativeZone`, `classification`, `deathRuleVerdict` | zone-classification (incl. phantom-BoM exemption §11) |
| **2 pressure-status** | The reaction candles at the zone (probe-label mechanics) | `pressureSide`, `score`, vote counts | candle-pressure |
| **3 liquidity** | `lmvTable` rungs + `resting-side.ts` structure + mirror ladder (LQZ rungs below for LONG) | `liquidityBelow/Above`, `nearestLQZ` | (mechanical) |
| **4 break-validation** | OHLC bars up to `anchorMs`; `temporal.ts` run-anchor; TF hierarchy (1H/4H/30m/15m telescoped tiers) | `breakVerdict` (close-beyond = invalid; wick-reclaim = valid) | (mechanical) |
| **5 strength-comparison** | BoM quality (`bw ≥ 3.0 ∧ bf ≥ 0.65`, OBCV gate O6) vs opposing force | `strengthDelta`, `strongerSide` | zone-pressure |
| **6 reaction-count** | Candle groups = touches + pre-touch storyline + post-reaction move; wick-mass `lwm/uwm` accumulation | `reactionCount`, `wickMassRatio`, `directionBias` | candle-shape |
| **7 chain-progress** | KCE-Telescoping (`V3.4_KRONOS_CANDLE_ENGINE_SPEC` + `VISUAL_TELESCOPE_CHARTING_T2` + `Zone_Element_Mechanics`) | `chainStage`, `chainDirection`, `chainProgress` | shape-chain |

### 5.3 Token 8-11 skeletons (the LLM 30% — hooks)

```ts
// The deterministic skeleton each LLM hook refines. The shadow agent may ONLY refine
// (return adjusted values + a reasoning trace) — it never invents zones or ids.

export interface ForwardProjectionInput {
  pair: PairKey;
  tokenLedger: TokenResult[];         // tokens 1-7, already fixed
  operativeZone: { id: string; floor: number; ceiling: number; classification: 'BoM'|'MoM'|'PHANTOM_BOM'; };
  candleGroups: TokenSet;             // the token-set: 1 candle = 1 token; groups = touches + pre-touch + post-reaction
  continuationTargets: number[];      // KCE-Telescoping output — macro-origin continuation targets
  macro: MacroAuthorityInput;         // the mirror/cascade authority (§10)
  widthRatio: number;                 // SMC ratio, computed by the skeleton from ATR/move-scale
}

export interface ForwardProjectionOutput {
  forwardPosition: number;            // price "positioned forward of the zone toward the target"
  chosenTarget: number;               // one of continuationTargets (ratio-validated)
  positionVerdict: string;            // 'FORWARD' | 'NOT_FORWARD' — the forward-position predicate
  reasonTrace: string[];              // the checkable trace, token-set refs
}

export interface ChainingInput {
  pair: PairKey; direction: Direction;
  euCascaded?: unknown; guCascaded?: unknown;   // buildE2Core translated days
  macro: MacroAuthorityInput;
}

export interface ChainingOutput {
  chainVerdict: boolean;              // does this setup's zone trace to the macro chain, correct direction?
  linkedMirror: PairKey | null;       // the DXY twin for an EU setup (1:1 inverted)
  divergence: string | null;          // non-null => the per-pair classification contradicted the macro (BUG, recorded)
}

export interface AnchorInput {
  pair: PairKey; direction: Direction; operativeZone; tokenLedger;
  e2ProjectionId: string;             // the specific E2 projection this anchors to
  slCandidate: number | null;         // computeMirrorSL(E, anchor, dir, ladder, pair, pip, atr)
  tpCandidate: number | null;         // computeMirrorTP(E, sl, anchor, dir, ladder, pip, {passThroughWeakWalls: true})
  atr1hPips: number; widthRatio: number;
}

export interface AnchorOutput {
  entry: number; sl: number; tp: number; rrr: number;
  anchors: ProjectionAnchor[];        // every anchor carries e1ZoneId + e2ProjectionId
}

export interface ValidationOutput {
  valid: boolean;
  warnings: RefinementWarning[];      // each carries the context (§7.3)
  confidence: number;                 // fused — deterministic floor, LLM validation delta
}
```

### 5.4 Token-set construction (the context the shadow reads)
- **1 candle = 1 token.** The set of tokens in the structured dataset = the relevant context (the TTE shapes).
- Candle groups = the touches + the pre-touch storyline + the post-reaction move around the operative zone.
- The shadow agent receives the **serialized token-set** (structured rows: `{t, O, H, L, C, group, vote, wick}`), never the raw OHLC dump. `PROPOSED:` `src/mdve/token-set.ts` builds it from `barsByTf` + the zone band + `CLUSTER_TOLERANCE_PIPS` (2 pips), reusing the probe-label vote mechanics verbatim (from-above fell-in → BUY; from-below rose-in → SELL; dwell lower/upper wick; tie → close-vs-center).

---

## 6. COMPONENT C — THE SHADOW-ENHANCED AGENT

The shadow-enhanced pattern from `SHADOW_ENHANCED_TOOLS_MACRO_ARCHITECTURE` + `SHADOW_ENHANCED_TASK_PREFLIGHT_SPEC`. **Deepseek v4 flash via opencode go** — the time-efficient choice (the headed agent later). It is an EMBEDDED tool-call, not a hosted agent.

### 6.1 Contract

```ts
// PROPOSED: src/mdve/shadow-agent.ts
export interface ShadowAgentClient {
  projectForward(inp: ForwardProjectionInput): Promise<ForwardProjectionOutput>;
  chaining(inp: ChainingInput): Promise<ChainingOutput>;
  anchor(inp: AnchorInput): Promise<AnchorOutput>;
  validate(p: TradeProjection, ledger: ChainContext): Promise<ValidationOutput>;
  readonly provider: 'opencode-go-deepseek-v4-flash';
}
```

### 6.2 The tool-call wrapper

```
PROPOSED: scripts/shadow-agent.ts — a standalone bun script.
  STDIN  : a JSON request  { op: 'project-forward'|'chaining'|'anchor'|'validate', payload }
  STDOUT : a JSON response  { ok, result }  — the ONLY channel; no logging to stdout
  Invocation: invoked as a child process by src/mdve/shadow-agent.ts via the
              opencode-go CLI (deepseek v4 flash). Bounded timeout (PROPOSED 60s).
```

- **The request payload is ALWAYS pre-flighted** per the `SHADOW_ENHANCED_TASK_PREFLIGHT_SPEC`: every input carries the token-ledger + serialized token-set + macro authority + lexicon scores — the structured context is the prompt; the model writes ONLY the `ForwardProjectionOutput`/`AnchorOutput` shape.
- **Grounding contract for the LLM response**: `entry/sl/tp` must be numeric and direction-ordered; `chosenTarget` must be one of the supplied `continuationTargets`; `e1ZoneId`/`e2ProjectionId` must be real ids from the input. Any invented id/value → the response is a refinement warning, not accepted.
- **Deterministic fallback (degradation path)**: on timeout, non-JSON, or shape violation → the LLM-hooked token falls back to the skeleton's best-effort value with `llmRefined: false` and `confidence` capped at `0.70`. The pipeline NEVER stalls on the LLM call. The degradation is logged to the failure store as `SHADOW_DEGRADE` (informational, not a hard failure).

### 6.3 Known gap
The exact opencode-go CLI integration details (the executable path, the arg shape, the env for the deepseek v4 flash key) are **CONTEXT NEEDED**. The wrapper isolates them behind `scripts/shadow-agent.ts` so a build agent wires the invocation once. `PROPOSED:` the wrapper prefers env `SHADOW_AGENT_CMD` (e.g. `opencode go`), defaults to a documented path, and returns a typed `{ok:false, reason:'invocation-failed'}` — never a crash.

---

## 7. COMPONENT D — THE VALIDATION / REFINE / RETRY LOOP

### 7.1 The gate position
The E2 output is validated by the reasoning chain **before** the E3. Order in `buildReasoningChain`:

1. Run tokens 1-7 (deterministic) per E2 candidate projection.
2. Run tokens 8-11 through the shadow agent (or deterministic fallback).
3. `validate()` the resulting projection.
4. On `valid === false` → refine (§7.2) and re-run tokens 8-11 (never re-run the deterministic 1-7 — the refinement targets the forward-projection only).
5. `refinementsUsed >= 3` and still invalid → **HARD THROW** → SQLite failure store → the projection is a `ChainFailure` (never silently emitted, never silently dropped).

### 7.2 The loop

```ts
export async function validateRefineRetry(
  proj: TradeProjection, input: ReasoningChainInput, maxRefinements = 3
): Promise<{ projection: TradeProjection; valid: boolean; hardThrow: boolean; warnings: RefinementWarning[] }> {
  let p = proj; let n = 0;
  for (;;) {
    const v = await input.shadow?.validate(p, p.chainContext)
      ?? deterministicValidate(p);                       // fallback: contract + macro checks
    if (v.valid) return { projection: p, valid: true, hardThrow: false, warnings: v.warnings };
    if (n >= maxRefinements) {
      recordFailure(p, v.warnings, 'REFINEMENT_EXHAUSTED');   // §8
      return { projection: p, valid: false, hardThrow: true, warnings: v.warnings };
    }
    p = await refine(p, v.warnings, input);              // tokens 8-11 re-run with the warnings as context
    n += 1; p.chainContext.tokens = ledgerWithRefinement(p.chainContext, n);
  }
}
```

### 7.3 Refinement warnings carry the context (never bare text)
Each `RefinementWarning` must include: the failing check, the token id, the source ref (file:line or token-set ref), the offending value, and the proposed correction.

```ts
export interface RefinementWarning {
  check: string;                 // e.g. 'DIRECTION_ORDER' | 'MACRO_DIVERGENCE' | 'ANCHOR_TRACE' | 'SHADOW_INVENTED_ID' | 'RATIO_OFF_CONTEXT'
  token: TokenId;
  sourceRef: string;             // file:line or token-set ref — evidence, never narration
  value: unknown;                // the offending value
  proposed: string;              // the correction, with the context
}
```

### 7.4 The refine/retry, not hard-throw, doctrine
- The enforcement default = **refine/retry** with the context-bearing warnings.
- The **hard-throw happens ONLY after 3 failed refinements** — and even then it is caught at the pipeline level, written to the SQLite failure store, and surfaced in the end-of-pipeline synthesis (§8.3). A hard-throw is data, not a crash.

---

## 8. COMPONENT E — THE SQLITE FAILURE STORE + END-OF-PIPELINE SYNTHESIS

### 8.1 The store
`PROPOSED:` `src/mdve/failure-store.ts`, backed by **bun:sqlite** (the project runs on bun — `bun diag-*.ts`, `bun build`). DB path `PROPOSED:` `MASTER_CONTEXT/plutus-reasoning-failures.db`.

```sql
-- PROPOSED schema
CREATE TABLE IF NOT EXISTS chain_failures (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  recorded_at   TEXT NOT NULL DEFAULT (datetime('now')),
  pipelineStage TEXT NOT NULL,              -- 'E1' | 'E2' | 'E3' | 'SHADOW'
  pair          TEXT NOT NULL,              -- 'EUR/USD' | 'DXY' | 'GBP/USD'
  setupId       TEXT NOT NULL,              -- report_v45.md lineage
  failureType   TEXT NOT NULL,              -- 'REFINEMENT_EXHAUSTED' | 'CONTRACT_VIOLATION' | 'SHADOW_DEGRADE' | 'MACRO_DIVERGENCE'
  tokenFailures TEXT NOT NULL,              -- JSON: RefinementWarning[]
  ledger        TEXT NOT NULL,              -- JSON: the 11-token ledger at failure time
  projection    TEXT,                       -- JSON: the last refined TradeProjection (or NULL)
  nextSteps     TEXT NOT NULL,              -- JSON: the synthesis's next steps (checkable commands)
  week          TEXT NOT NULL               -- '2026-07-06'
);
CREATE INDEX IF NOT EXISTS idx_failures_week ON chain_failures(week);
CREATE INDEX IF NOT EXISTS idx_failures_type ON chain_failures(failureType);
```

### 8.2 API

```ts
export interface FailureRecord {
  pipelineStage: string; failureType: string; pair: PairKey; setupId: string;
  tokenFailures: RefinementWarning[]; ledger: ChainContext; projection?: TradeProjection;
  nextSteps: string[];
}
export function recordFailure(r: FailureRecord): number;          // INSERT, returns id
export function failuresForWeek(week: string): FailureRecord[];   // read for the synthesis
export function failureStats(): { total: number; byType: Record<string, number>; };
```

### 8.3 End-of-pipeline synthesis
After every E3 emission pass:
1. `failuresForWeek(week)` — collect the week's failures.
2. Build the **FAILURE SYNTHESIS** block: per failure — the type, the token-ledger excerpt, the refinement warnings, and **next steps as checkable commands** (e.g. `bun diag-monday.ts --pair EUR/USD --zone <id>` — `PROPOSED` flags).
3. **Append** (never overwrite) to the one-running-report `MASTER_CONTEXT/PLUTUS_V4.5.3_BUILD_REPORT.md` under a dated `## FAILURE SYNTHESIS (reasoning-chain)` section.
4. Zero failures → the synthesis block records `0 hard-throws, 0 contract violations` — still appended (the append-only law).

---

## 9. COMPONENT F — THE LEXICON WIRING

The six lexicons from `MASTER_CONTEXT/PLUTUS_V4.5.4_LEXICON_SPEC.md` take the **IntelligenceLexicon machine form** (PatternFamily `suggestive/descriptive/substitute/use` + `score = pos/(pos+neg+1)` + two-phase enforcement + escape hatches).

### 9.1 The machine form

```ts
// PROPOSED: src/mdve/lexicons/index.ts
export type LexiconName =
  | 'candle-pressure' | 'candle-shape' | 'zone-classification'
  | 'zone-pressure' | 'shape-chain' | 'obvious-trades';
export type PatternFamily = 'suggestive' | 'descriptive' | 'substitute' | 'use';

export interface LexiconRule {
  id: string;                       // deterministic predicate id
  family: PatternFamily;
  pattern: RegExp;                  // the mechanical detection (zones/candles = regex layer)
  posWeight: number; negWeight: number;   // score = pos/(pos+neg+1)
  action: 'flag' | 'exempt' | 'override' | 'record';   // two-phase enforcement hook
}

export interface Lexicon {
  name: LexiconName;
  rules: LexiconRule[];
  score(text: string): number;                 // pos/(pos+neg+1)
  twoPhaseEnforcement(): { phase: 'proposal' | 'claim' };  // Phase A/B per the spec
  escapeHatches: string[];                     // the checks that clear an enforcement
}

export interface LexiconBundle {
  candlePressure: Lexicon;      // candle-pressure
  candleShape: Lexicon;         // candle-shape
  zoneClassification: Lexicon;  // zone-classification  ← phantom-BoM exemption (§11)
  zonePressure: Lexicon;        // zone-pressure
  shapeChain: Lexicon;          // shape-chain          ← unified macro authority (§10) + forward-position predicate
  obviousTrades: Lexicon;       // obvious-trades
}
```

### 9.2 Two-phase enforcement (per the IntelligenceLexicon spec)
- **Phase A (proposal-time)**: a direction/classification *proposed* into E3 that violates a lexicon (e.g. a GU classification contradicting the macro) → flagged with the context-bearing warning before emission.
- **Phase B (claim-time)**: a TradeProjection *claimed valid* that violates a lexicon → the refine demand (the enforcement = refine/retry, never a bare block).
- **Escape hatches**: the real chain-validation clears enforcement — token 4 (break-validation with a real close/claim sequence) and token 11 (validation with real E2 evidence) are the escapes. A use-frame (a legitimate setup the operator drew) is NEVER blocked.

### 9.3 The MPSE law
Every lexicon output is a deterministic predicate verdict (`{side, score, verdict}`) — fuzzy prose is the derailment. The shadow agent's free-text is confined to `reasonTrace`; it never feeds back into the deterministic tokens.

---

## 10. THE UNIFIED MACRO AUTHORITY

### 10.1 Definition
The single macro-direction authority that per-pair classifications must not contradict. Wired as the **shape-chain lexicon's override** — a divergence = the bug (F2), recorded, never suppressed.

```
PROPOSED: src/mdve/macro-authority.ts

buildMacroAuthority(input: ReasoningChainInput): MacroAuthorityInput {
  // 1. EU-DXY 1:1 INVERTED MIRROR — the EU analysis exists 1:1 inverted on DXY:
  //    the same E1 zones, the same E2 chains, the same E3 setups — directions inverted.
  //    For every EU LONG zone/setup there MUST exist a DXY SHORT twin (ZONE ELEMENTS,
  //    never price levels — the candles differ by the volatility).
  // 2. GU CASCADE — GU cascades from the EU: the same E1 zones + the same macro chain;
  //    the candles differ by the volatility. GU direction == EU direction.
  // 3. Every per-pair E1 classification and E2 projection is checked against (1)+(2).
  //    mismatch => macroConsistent=false + a divergence entry (context-bearing).
}
```

### 10.2 The divergence law
- The macro authority **wins**: E3 never emits a direction contradicting it. A per-pair R vs macro LONG contradiction (the GU Monday failure) → the chain flips the emission to the macro direction AND records the divergence in `chainContext.divergences` + the failure store (`MACRO_DIVERGENCE`, informational-flag, not a hard-throw).
- The GU Monday golden (`WL LONG`) becomes the *accepted* output; the per-pair R classification is surfaced as the bug evidence with its source ref.

### 10.3 The forward-position predicate (the operator's "common sense" law)
The forward-position predicate's distance definition = **macro-context-driven, visibly obvious from the OHLC data** — never a fixed threshold (the operator's words adopted verbatim). Implemented in the shape-chain lexicon + candle-shape lexicon:
- Compute the candidate target via KCE-Telescoping (the macro-origin continuation).
- Evaluate the price position with **ratio-based widths** (SMC): the forward distance vs the zone width, the zone width vs `proxyAtr1hPips`, the move-scale of the chain — all ratios, zero fixed pip numbers.
- `positionVerdict = 'FORWARD'` iff the price is positioned ahead of the zone toward the target in a way that is visually evident on the OHLC (the token-set's post-reaction move confirms it), not a borderline hair.
- `CONTEXT NEEDED`: the exact ratio bands are pending the operator's answers (see §17).

---

## 11. THE PHANTOM-BoM EXEMPTION (the shape-brain surgical edit)

### 11.1 The target
`src/brains/shape-brain.ts:2330-2336` — the virgin-MoM blanket death rule ("Virgin MoM zones are DEATH ZONES — automatic REJECT"). **Surgical edit only** — the death rule stays; it gains an exemption lane.

### 11.2 The exemption criteria (the operator's type-2 virgin MoM = the fortress)
A virgin MoM zone is EXEMPTED from the death rule (re-classified `PHANTOM_BOM`) iff **all four** of the operator's criteria hold:
1. **large-OB** — the zone's width exceeds the SMC ratio threshold anchored to the context (ATR/move-scale/TF);
2. **mid-swing-recovery + the fakeout** — the zone formed at the bottom of a mid-swing-recovery phase whose candles TEMPORARILY broke the actual swing structure (the "fake RWL" / correction fakeout — a couple of candles that make inexperienced traders think the swing is done — the operator's verbatim: "clearly breaks (temporarily for only a couple of candles) the actual swing move structure and is clearly a 'fake RWL' type or 'correction' fakeout candle");
3. **the pre-formation opposing-BoM reaction** — the correction (the move BEFORE the zone's formation!) INSTANTLY reacted to an opposing UM BoM structure (the operator's verbatim: "there is an UM 1H BoM supply zone on Wed Jul 1 at 1.14230 - 1.14185 that this correction instantly reacts to before forming the big OB") — the reaction PRECEDES the formation, it does not follow it;
4. **macro-origin continuation** — the KCE-Telescoping macro chain continues THROUGH the zone in the macro direction (the move completes the FULL swing from the macro origin element — the operator's verbatim: "before the move actually CONTINUES FORWARD VIOLENTLY and completes the full swing from the macro origin element (in this case the origin was a 4H Demand zone... and the move completes at the 4H supply zone)").

### 11.3 The edit shape

```
// shape-brain.ts:2330-2336 — BEFORE (verbatim from context)
//   "Virgin MoM zones are DEATH ZONES — automatic REJECT"
// AFTER — the exemption lane:
//   const ph = lexicons.zoneClassification.phantomBoM(zone, ctx);  // §11.2, all-4 predicate
//   if (ph.verdict === 'EXEMPT') { classification = 'PHANTOM_BOM'; }  // the fortress
//   else { deathRuleReject(zone); }                                    // unchanged path
```

- The exemption consults `zoneClassification.score(...)` + the SMC ratio doctrine. All-4 must hold; a 3-of-4 is NOT exempted (falls through to the death rule — the conservative default).
- `CONTEXT NEEDED`: the exact ratio thresholds (large-OB ratio) — the operator's pending answers (§17). `PROPOSED` defaults (gated on the ratio doctrine, never fixed pips): large-OB = zone width ≥ 1.5 × `proxyAtr1hPips` (the SMC ratio-based width — the OB's size is a function of the move it precedes!); the fakeout = the temporary structure-break candle count ≤ 2-3 with the immediate reclaim (the operator's "temporarily for only a couple of candles"). Marked as PROPOSED until the operator rules.

### 11.4 What it fixes
F1 — the EU LONG miss: the phantom-BoM demand `[1.14145-1.14000]` passes the all-4 predicate → exempted → the chain's token 1 classifies it `PHANTOM_BOM` → tokens 8-11 anchor a LONG projection into the golden `1.14110` region (§16.2). The blanket reject is overridden ONLY for the all-4 fortress, never for a normal virgin MoM.

---

## 12. THE HARNESS + FILL SIMULATION

### 12.1 Existing harness (shipped)
- `diag-monday.ts` — the harness.
- `scripts/fetch-bars.ts` + `MASTER_CONTEXT/DATA_PROVENANCE.md` — the broker (feeds `/tmp/opencode/bars_raw.json`).
- The probe/diag scripts (from the reference material) — the measurement layer: `diag-golden-coverage` lineage, `probe-step1d.ts`, `probe-label.ts`, `probe-shape.ts`, `probe-mirror-sl.ts`, `diag-obcv-golden.ts`, `diag-report-source.ts`, `diag-dump-dedup.ts`, `probe-step1.ts`, `probe-notes.ts`.

### 12.2 The fill-simulation upgrade (known gap)
`PROPOSED:` `src/harness/fill-sim.ts` — the day-end fill simulation (the full-trading-day accuracy).
- Per projection: session-start (the `report_v45.md` sessions: `London Open 02:00-05:00 ET`, `London Mid 05:00-08:00 ET`, `NY Mid 10:00-14:00 ET`) → trigger → **TP-first = WIN / SL-first = LOSS** (the `INDEPENDENT_AUDIT_v452` re-simulation doctrine, mechanically identical).
- Post-week resolution handling: a trade that resolves after the week (the `INDEPENDENT_AUDIT_v452` finding) is tagged `POST_WEEK` in the outcome, never silently counted as a week resolution.
- The dedup doctrine applied at the emission layer via `floorSetupsToDedupRows` + `dedupTrades` (frozen) — the chain emits `setupId`-lineaged projections so dedup rows carry the trace.
- `MAE / SL-distance` util computed per trade (`SL_vs_ENTRY_ANALYSIS.md` doctrine: `util<0.40 → SL TOO WIDE`; `util>0.70 → ENTRY TOO EARLY`) — the SL/TP widths are ratio-checked against the context, the historical fixed-width finding (F6) is the regression target.

### 12.3 Diag entrypoints (PROPOSED)
- `diag-reasoning-chain.ts` — runs the chain on the fixture week, dumps the 11-token ledgers.
- `diag-reasoning-chain-golden.ts` — the acceptance gate (§16), exit 0/1, `bun diag-reasoning-chain-golden.ts && echo PASS`.
- `diag-failure-store.ts` — dumps `failuresForWeek('2026-07-06')`.

---

## 13. DATA FLOWS + ERROR PATHS

### 13.1 The E1 → E2 → E3 flow with the chain
1. `buildChartModel(pair, WEEK, bars1H, bars4H, bars30m, spot, undefined, bars15m)` — E1 zones (the 8-arg call, bars15m LAST — the Phase 2 T5b telescoped tier).
2. `generateSourceSetupsV45(models.DXY)` — E1 source setups.
3. `runPriorWeekPreflight(pair, {barsByTf, weekStartMs: 1783296000000, anchorMs: 1783702800000})` — the prior-week storylines.
4. `buildE2Core(models, priorStorylines)` → `{euCoreChain, guCoreChain, euCascaded, guCascaded}` — the shape chains.
5. `cascadeV45(dxySetups, models, {v452: {goldenSlLmv, consumedPoolQualifier, guAnchorPoolV453}, shapeChains, translatedDays})` → `{eu, gu}` — filter `status === 'ACTIVE'`.
6. **THE CHAIN** (`buildReasoningChain`) — tokens 1-7 deterministic → tokens 8-11 shadow-refined → validate/refine/retry → `TradeProjection[]`.
7. `floorSetupsToDedupRows(dxySetups, activeMirrors)` + `dedupTrades(rows)` — the emission floor (frozen, unchanged).
8. The acceptance gate reads the projections — golden levels as oracle only.

### 13.2 Error paths (each with its disposition)
| Error | Detection | Disposition |
|-------|-----------|-------------|
| `SHADOW_TIMEOUT` / non-JSON | shadow-agent wrapper | deterministic fallback; `confidence` capped 0.70; `SHADOW_DEGRADE` to the store |
| `SHADOW_INVENTED_ID` (a made-up zone/projection id) | the grounding contract check (§6.2) | refinement warning (context-bearing); retry; after 3 → hard-throw → store |
| `MACRO_DIVERGENCE` (per-pair contradicts macro) | token 9 chaining | NOT an error — the macro wins, the divergence recorded + stored (flag) |
| `CONTRACT_VIOLATION` (E/SL/TP unordered, anchor-less) | `assertProjectionContract` | hard-throw → `ProjectionContractError` → store → synthesis |
| `REFINEMENT_EXHAUSTED` (3 failed refinements) | the loop (§7.2) | hard-throw → store → synthesis |
| LLM hallucinated target not in `continuationTargets` | token 8 grounding | refinement warning; the target set is closed (never extended by the LLM) |
| `bun:sqlite` unavailable | `failure-store.ts` open | `recordFailure` degrades to an append-only `MASTER_CONTEXT/PLUTUS_FAILURES_FALLBACK.md` row (never silently drops) |

### 13.3 Determinism guarantees
- Same bars + same lexicons + no shadow call → byte-identical chain ledger (the `diag-obcv-golden.ts` O7 determinism doctrine extended to the chain's deterministic tokens).
- The LLM hook is the ONLY nondeterminism; it is bounded to tokens 8-11 and recorded as `llmRefined` per token.

---

## 14. IMPLEMENTATION ORDER (5 WAVES)

| Wave | Deliverable | Depends on | Exit criterion |
|------|-------------|-----------|----------------|
| **W1** | The `TradeProjection` contract + `assertProjectionContract` + `token-set.ts` | existing mdve | `bun test` green; contract unit tests (5 adversarial: unordered E/SL/TP, anchor-less, invented id, sub-1R, NaN) |
| **W2** | `lexicons/index.ts` machine form + the three wirings (phantom-BoM exemption in `shape-brain.ts:2330-2336`, unified macro authority, forward-position predicate) | W1 | the exemption predicate unit-tested against the `[1.14145-1.14000]` fixture; macro divergence detector unit-tested |
| **W3** | `reasoning-chain.ts` tokens 1-7 (deterministic) | W1, W2 | tokens 1-7 produce the same ledger twice on the same bars (determinism) |
| **W4** | `shadow-agent.ts` wrapper + `scripts/shadow-agent.ts` + tokens 8-11 hooks + deterministic fallback | W3 | a shadow call with the fixture input returns a shape-valid `AnchorOutput`; a forced timeout returns the capped fallback |
| **W5** | The validate/refine/retry loop + `failure-store.ts` (bun:sqlite) + end-of-pipeline synthesis + the harness fill-sim + `diag-reasoning-chain-golden.ts` | W2-W4 | the Monday goldens gate passes (§16); `bun diag-reasoning-chain-golden.ts` exit 0 |

**Poseidon-mode note**: W2 touches `shape-brain.ts` (surgical exemption edit, the overhaul target). The frozen pair (`sl-lmv 91294083`, `trade-dedup 33914c89`) and `src/mdve/mirror.ts`/`src/mdve/lmv.ts`/`src/mdve/temporal.ts` are READ-ONLY.

---

## 15. VERIFICATION PROTOCOL

1. **Type + build**: `bun build` (the project's build chain) — no new type errors.
2. **Unit tests**: `npx vitest run` / `bun test` (the project's suite) — the W1 contract adversarial cases + the W2 exemption/divergence cases + the W4 fallback cases.
3. **Regression diags** (must stay green): `diag-obcv-golden.ts` (the OBCV acceptance, exit 0), the `diag-golden-coverage` lineage, `diag-monday.ts`, `probe-step1d.ts`, `probe-label.ts`, `probe-mirror-sl.ts`, `diag-report-source.ts`, `diag-dump-dedup.ts`.
4. **Chain diags** (PROPOSED): `diag-reasoning-chain.ts`, `diag-failure-store.ts`.
5. **The acceptance gate**: `bun diag-reasoning-chain-golden.ts && echo PASS` — the Monday goldens under the new architecture (§16).
6. **Container verification**: the `MASTER_CONTEXT/Plutus_Shark_Operator_Audit_Process.md` (544 lines — the de facto testing process) via `trident-container-test` — the TUI runs `diag-reasoning-chain-golden.ts` in the sandbox image with the fixture mounted; `ContainerTestResult.json` records the exit code + the ledger excerpts.
7. **The running report**: every wave appends to `MASTER_CONTEXT/PLUTUS_V4.5.3_BUILD_REPORT.md` (append-only) — the chain's wave entries + the failure syntheses.

---

## 16. ACCEPTANCE CRITERIA — THE MONDAY GOLDENS UNDER THE NEW ARCHITECTURE

### 16.1 The gate (`diag-reasoning-chain-golden.ts`, exit 0/1)
The golden levels exist ONLY here — the measurement oracle, never the computation input. All checks run on the fixture week `2026-07-06`, `ANCHOR_MS = 1783702800000`, `WEEK_START_MS = 1783296000000`, `DXY_PIP = 0.01`, EU/GU `PIP = 0.0001`.

| G# | Golden | Pass condition |
|----|--------|----------------|
| G1 | **EU LONG emission** (the phantom-BoM fortress) | ≥1 LONG projection on `EUR/USD` whose `chainContext.tokens[0]` (zone-identification) verdict is `PHANTOM_BOM` on the `[1.14145-1.14000]` zone; the projection's `entry` is within 2 pips (`CLUSTER_TOLERANCE_PIPS`) of the golden `1.14110`; the projection's anchors trace to that E1 zone id + a valid E2 projection id (E3-NEVER) |
| G2 | **Native first, cascade complementary** | the Monday EU LONG exists in the NATIVE lane (the Monday test native 2/5 baseline); any cascade projection is complementary — it never overwrites, it never duplicates (the dedup doctrine, frozen) |
| G3 | **GU Monday direction = LONG** (the operator's WL) | the `GBP/USD` Monday projection's `direction === 'LONG'`; the per-pair R divergence is recorded in `chainContext.divergences` + the failure store (`MACRO_DIVERGENCE`), and the emission still ships LONG (the macro wins) |
| G4 | **EU/DXY 1:1 inverted mirror** | for the EU LONG projection, a `DXY` SHORT projection exists whose anchors match ZONE ELEMENTS (the mirrored E1 zone ids, the inverted E2 chains, the inverted E3 setups — never price levels); the `chaining` token's `linkedMirror` resolves |
| G5 | **E3-NEVER compliance** | 100% of emitted projections pass `assertProjectionContract`; 0 anchor-less projections |
| G6 | **Hard-throw discipline** | 0 `REFINEMENT_EXHAUSTED` hard-throws on the golden week (the goldens refine within <3 rounds); the failure store's week row count = 0 hard-throws |
| G7 | **No regression of the correct trades** | the 13 unique trades (7 DXY + 5 EU + 1 GU, per `INDEPENDENT_AUDIT_v452.md`) that were correct still emit correctly; the util findings (`SL_vs_ENTRY_ANALYSIS.md`) no longer show fixed-width SL regression (the widths are ratio-anchored) |
| G8 | **Temporal gate respected** | no chain computation reads bars beyond `ANCHOR_MS`; a negative control (a run with a later anchor) does not change the golden projections' anchors |

### 16.2 The EU LONG reconstruction (the forward-reasoning proof)
Under the chain: `[1.14145-1.14000]` (type-2 virgin MoM) → token 1 exemption (`PHANTOM_BOM`) → tokens 2-7 (pressure/liquidity/break/strength/reaction/chain) all confirm the fortress holds → token 8 forward-position (the KCE continuation target above the zone, ratio-validated) → token 9 chaining (DXY SHORT twin) → token 10 anchors (entry at the golden band, SL below `1.14000` per `computeMirrorSL`, TP at the macro-origin continuation per `computeMirrorTP` with `passThroughWeakWalls`) → token 11 validation (contract + macro consistency). The projection's ledger is the forward-reasoning evidence — the token-set rows it read, the verdicts it derived, the numbers it produced.

---

## 17. KNOWN GAPS / CONTEXT NEEDED

1. **The phantom-BoM's exact ratio thresholds** — the operator's pending answers (the SMC ratio-based width). `PROPOSED` defaults in §11.3, explicitly gated until ruled.
2. **The forward-position predicate's distance definition** — per the operator, "should be common sense and visibly obvious from the OHLC data" — macro-context-driven, NOT a fixed threshold. The ratio formula is `PROPOSED` (§10.3); the operator's exact bands pending.
3. **The shadow agent's exact tool-call contract** — the opencode-go integration details (executable, args, env) — `CONTEXT NEEDED`; isolated behind `scripts/shadow-agent.ts` (§6.3).
4. **The GU Monday R's full instrumentation** — the operator's Q8, the root-cause context pending — the divergence detector (W2) instruments the per-pair classification at the file:line level so the Q8 answer can be completed post-build.
5. **The harness's day-end fill simulation** — the full-trading-day accuracy is the known gap; the `fill-sim.ts` design (§12.2) is `PROPOSED` until validated against the `INDEPENDENT_AUDIT_v452` re-simulations.
6. **The SQLite db path** — `MASTER_CONTEXT/plutus-reasoning-failures.db` is `PROPOSED` (the context gives no db path).

---

## 18. ANTI-DERAILMENT DOCTRINE (the build law)

- **The scope is the operator's** — the reasoning chain + shadow agent + lexicons + failure store + harness. No shrinking. The LMV/OBCV/cascade foundations are consumed, not rebuilt.
- **No approval gates** — the waves ship in-turn; W1→W5 each ends at its exit criterion, then the next wave starts.
- **Evidence over prose** — every claim in the build carries a `file:line` or token-set ref; the ledger is the evidence structure.
- **The lexicons are deterministic predicates** — fuzzy prose is the derailment; `score = pos/(pos+neg+1)`; free-text lives only in `reasonTrace`.
- **Refine/retry, not hard-throw** — the hard-throw is data (the failure store), never a crash.
- **The E3-NEVER rule is mechanical** — a projection without the E1-zone + E2-projection trace is a pipeline error, never an emission.
- **Adversarial testing only** — the W1 contract unit tests are 5 adversarial cases, not happy paths; the golden gate's G8 is the temporal negative control.

---

*L1 complete. Build waves W1→W5 per §14. The next document is the W2 L2 expansion (the lexicons machine form + the shape-brain exemption edit) gated on the operator's answers to the §17 ratio questions.*

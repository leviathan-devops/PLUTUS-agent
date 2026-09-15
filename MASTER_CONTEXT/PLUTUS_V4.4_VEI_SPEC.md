# PLUTUS V4.4 — VEI: THE EMBEDDED VISUAL EXECUTION INTELLIGENCE MICRO-HARNESS

**Version:** 2.0 (FULL SPEC — supersedes v1.0)
**Date:** 2026-07-28
**Status:** DESIGN LOCKED — build target v4.4.0
**Scope:** Headed-browser GUI environments generally (any canvas/DOM hybrid UI driven via MCP browser tools). TradingView is the primary theater (~90% of current use), but NOTHING in this harness is TradingView-specific by construction — all TV-isms live in one swappable profile module.
**Lineage:** Ported + adapted from MV3_Web_Agent's SEL (Semantic Execution Layer — 15 components, `extension/lib/sel/`, 70% solid working architecture) → re-architected as an **embedded micro-harness inside the PLUTUS opencode plugin** (server-side TypeScript, zero Chrome dependencies, zero new npm dependencies for v1). Mathematical enforcement per KNOWLEDGE_LIBRARY/MPSE (MathContract, firewall+oracle, totality, invariants).
**Position in the v4.4 triad:** MDVE is the EYES (mathematical data vision — the mental model of the chart computed from raw OHLC). VEI is the HANDS (GUI execution intelligence — the agent's moment-to-moment behavior inside the headed browser). PVE is the JUDGE (probabilistic verification of emitted setups). VEI owns nothing about trading logic; it owns the physics of the GUI environment.

---

## TABLE OF CONTENTS

0. What VEI Is (the doctrine)
1. The Problem (container evidence)
2. The v4.4 Triad Architecture (MDVE / VEI / PVE)
3. Lineage — What We Take From SEL (and What We Leave)
4. Architecture — The Embedded Micro-Harness
5. Module Specifications (5 modules + wiring)
6. The Four Intelligence Primitives (full algorithms)
7. The Detector Catalog (13 detectors, exact thresholds)
8. The Guidance Grammar (message catalog)
9. The TradingView Profile (all TV-isms, quarantined)
10. Hook Integration (binary-verified contract)
11. Session State + Compaction Survival
12. Determinism + Anti-Theatrical Laws
13. Verification Plan (unit + container acceptance)
14. Rollout Phases
15. Anti-Goals
16. Why This Is the Neocortex

---

## 0. WHAT VEI IS (the doctrine)

VEI is the Plutus agent's **neocortex for headed-browser work**: a thin, deterministic, server-side micro-harness that sits between the LLM and the GUI tool stream. It **watches every GUI action the agent attempts** (tool fingerprints), **knows the ground truth of the environment** (view-state, coordinate transforms, action outcomes, temporal anchors), and **injects precise corrective guidance into the agent's context at the exact moment it flounders** — not generic "stop looping" text, but actionable, environment-aware instruction:

> *"You called canvas_zoom(out,3) three times with zero view change (barRange still 1784736000-1785168000). Zoom cannot travel through time. To reach the week of 2026-07-06: canvas_pan({time: 1783100000}) — then get_view to confirm Jul 6-10 fills the frame."*

The agent stops being visually dumb. It executes through VEI's truth layer the way a neocortex executes through the cerebellum and spatial cortex — the raw senses (screenshots, MCP tools) and raw motor outputs (tool calls) are unchanged, but the **interpretation, spatial grounding, outcome verification, and error correction are computed deterministically and delivered as intelligence at the moment of need.**

**Design law:** the LLM is the strategist; VEI is the vestibular system + spatial cortex + motor error-correction. VEI never trades, never draws, never navigates, never blocks (v1) — it OBSERVES, KNOWS, and CORRECTS. Every VEI output is a deterministic function of the tool-call stream + environment state. Zero LLM calls inside VEI v1.

**The MPSE framing (why VEI is un-cheatable):** every VEI detector is a **total, well-typed mathematical predicate** over the action ledger — per MPSE's Losslessness Theorem, a well-typed total spec admits exactly one program, so VEI's verdicts cannot vary run-to-run. Every VEI finding is evaluated against an **oracle** (the view-state record, the tool-call history, the temporal anchor) — VEI does not read the agent's reasoning; it evaluates the agent's *actions* against ground truth. Detectors are encoded as `MathExpr` predicates (the MPSE universal contract object) so the SAME predicate can be evaluated by the hook, logged to the audit chain, and model-checked offline.

---

## 1. THE PROBLEM (container evidence, v4.3 Wave 7 test loop)

The v4.3 scaffold made zone IDENTITY deterministic. The remaining variance is the agent's **hands**: its moment-to-moment behavior inside the headed browser. Measured failures from 4 container tests (Jul 27, 2026), each with stream evidence:

| # | Failure (evidence) | Root cause | Cost |
|---|---|---|---|
| F1 | `tv_canvas_zoom(out, steps=3)` × 8 consecutive identical calls trying to reach a week 3 weeks back (test 4) | No temporal-navigation verb knowledge; no loop self-awareness | ~7 min + human nudge |
| F2 | `tv_draw_rectangle(y1=707,y2=727)` fired twice; 203× `tv_find_price_y` in one run (test 2) | No "already done" memory; no coordinate cache | ~10 min, token flood |
| F3 | Zoom used for temporal navigation (wrong tool — `canvas_pan(bars/time)` is the verb) | No intent→verb map | loops, derailment |
| F4 | Verdict match-rate swings: DXY CONFIRMED 2 → 21 → 0 across 3 runs | Coordinate/copy drift during draw+read; no spatial grounding | EUR/DXY output variance |
| F5 | Agent judged scaffold rungs against the LIVE right-edge price (101.508) instead of the report week (W7-A temporal leak) | No mechanical temporal anchor — prompt text alone failed twice | 17 false REJECTED verdicts, 0-setup run |
| F6 | Provider rate-limit stall sat 43 minutes undetected (my monitoring gap) | No agent-health telemetry surfaced to the orchestrator | 43 min wall clock |
| F7 | Pan-loop ×6 after the zoom loop (`canvas_pan(bars=-50)` repeated, iterating blindly) | No "did the last pan move the view?" feedback | ~4 min |
| F8 | Agent debated draw strategy in prose for 3+ minutes (thin bands vs grouped zones, test 3 stream) | No authoritative guidance on what "done" looks like | token waste, delay |

**Root cause (one sentence):** the agent has no spatial-temporal self-model of the GUI — it cannot tell (a) whether its action changed anything, (b) where anything is, (c) when it is repeating itself, (d) which tool achieves a given intent, or (e) whether it is even looking at the right time window — because nobody computes those facts for it.

VEI computes those five facts, for every action, deterministically, and delivers them as injected intelligence.

---

## 2. THE v4.4 TRIAD ARCHITECTURE (MDVE / VEI / PVE)

v4.4 is a three-engine overhaul of how the agent perceives, acts, and judges:

```
┌─────────────────────────────────────────────────────────────────────┐
│  MDVE (EYES) — Mathematical Data Vision Engine                       │
│  Computes the mental model of the chart from raw OHLC: OB/S/D zones, │
│  LQZ matrix, BoM/MoM classification, freshness state machines,       │
│  the scaffold ladder, reaction-validity, the DXY→EU→GU mirror map.   │
│  Output: the deterministic zone/trade STRUCTURE. (spec: PLUTUS_V4.4_ │
│  MDVE_SPEC.md)                                                       │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ structure feeds
┌──────────────────────────────▼──────────────────────────────────────┐
│  ENGINE 3 + MIRROR — setup generation (existing) + the mirror stage  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ setups feed
┌──────────────────────────────▼──────────────────────────────────────┐
│  PVE (JUDGE) — Probabilistic Verification Engine                     │
│  Deterministic probability scoring of every emitted setup.           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  VEI (HANDS) — Visual Execution Intelligence (THIS SPEC)             │
│  Orthogonal to the pipeline: governs the agent's behavior whenever   │
│  it drives the headed browser (drawing rungs, capturing screenshots, │
│  navigating charts for the verification lane). VEI consumes MDVE's   │
│  scaffold (for coordinate injection + temporal anchor) but answers   │
│  no trading questions.                                               │
└─────────────────────────────────────────────────────────────────────┘
```

**Why VEI still matters in a math-first world:** MDVE makes pixel-perception *secondary* for zone identity, but the agent still drives the browser — drawing scaffold rungs on charts for the visual verification lane, capturing the screenshots MiMo reads for freshness/evidence verdicts, navigating to the correct week. Every one of those actions is a GUI execution problem, and F1-F8 show the agent failing at them mechanically. MDVE tells the agent WHAT the chart contains; VEI guarantees the agent can physically operate in the environment where it verifies and presents that content.

**Data VEI consumes from the pipeline (read-only):** the scaffold rungs per pair (for coordinate injection), the temporal anchor (weekStart → target window), the spot prices. VEI never mutates pipeline state. **MDVE compatibility:** when MDVE lands, the rung source becomes the MDVE ChartModel's ladder (the same rung shape — price/top/bottom/type/timeframe/zfp) — the pipeline context's `scaffoldByPair` and the ChartModel's `ladder` are interchangeable for VEI's purposes (the GuidanceContext interface accepts either; the wire layer maps the active source). No VEI changes required when MDVE ships.

**Container-test provider note:** VEI's own acceptance runs use opencode-go/mimo-v2.5 (paid — the free tier rate-caps after extended use, per the v4.3 stall incident). The orchestrator's 3-signal monitoring protocol (stream content + tool counts + DB mtime, ≤3-min cadence) applies to every VEI validation run.

---

## 3. LINEAGE — WHAT WE TAKE FROM SEL (and what we leave)

Source: `MV3_Web_Agent/extension/lib/sel/` (full synthesis 2026-07-27). SEL wrapped every tool call in `enforceAction()`: pre-gates → BEFORE shot → execute → settle → AFTER shot → 3-component verify → monitors → honest report.

| SEL component | Take? | Adaptation for VEI |
|---|---|---|
| **LD.js (Loop Detector)** | ✅ CORE | 6 loop types over a 20-action sliding window. Fingerprints become `tool:sha256(args)` on MCP tool names. State input becomes VEI view-state hash (§6.3). |
| **WebAntiDerailment.js** | ✅ CORE | 11 patterns; we take 7 (action_repetition, click-loop proximity, navigation-drift, repeated-failure, state-oscillation, progress-stagnation, excessive-screenshots). Warning strings rewritten to name MCP tools + correct verbs + exact args. |
| **TM.js (Trajectory Monitor)** | ✅ CORE | Rolling 20-action health = fraction `executed ∧ verified`. Feeds the intervention ladder (§4.2). |
| **AG.js (Adaptive Guardrails)** | ✅ LITE | TRUSTED→STANDARD→GUIDED escalation maps to VEI intervention intensity: silent-log → annotate → corrective-directive → sitrep injection. |
| **Honest-report builder** | ✅ CONCEPT | VEI annotates tool results with verified truth: "action executed but view did not change — NOT confirmed." Never lets the agent believe an unverified success. |
| **Per-tool settle delays** | ✅ VERBATIM | navigate/switch 2000ms, draw/replay 1000ms, click/type 300ms, default 200ms — before outcome evaluation. |
| **Price↔pixel deterministic interpolation** | ✅ AS AFFINE CACHE | 2 (price,y) samples → affine `y = a·price + b` per view-state; invalidate on view change. Replaces VLM coordinate guessing AND the 203× probe spam. |
| **VGT (dHash + VLM + semantic)** | ⏸ v2 | dHash needs a PNG decode dependency; view-state hash covers ~90% of the truth need at zero cost. MiMoVerifier as a cost-gated v2 option. |
| **AIG pre-gate nodes** | ⏸ v2 | Geometry validation (rectangle top>bottom etc.) joins as pre-execution checks once v1 proves out. |
| **IntentClassifier** | ⏸ v2 | Verb-frame table useful as a goal-extractor for verification ("what does done look like for this action"). |
| **EC Merkle chain, IdentityEnforcer, Firewall(identity), chrome.* plumbing, VLM priceToY, UNI_RATE_001** | ❌ LEAVE | Audit overhead / identity security / platform-specific / superseded by affine cache / LD covers realistic abuse. |

---

## 4. ARCHITECTURE — THE EMBEDDED MICRO-HARNESS

VEI lives INSIDE the Plutus opencode plugin (`src/vei/`), hooked into the existing opencode plugin hook chain (`tool.execute.before` / `tool.execute.after` / `messages.transform`) — the same integration points the TVI stack already uses (VEB before-hook, tool-after Manual Step injections). It observes **all** tool calls but only acts on GUI-tool calls (profile-matched prefixes, e.g. `tv-browser_tv_`; future profiles: `web_*`, `canvas_*`).

```
                ┌──────────────────────────────────────────────────────┐
                │                    PLUTUS AGENT (MiMo)                │
                │         strategist — decides WHAT, never HOW          │
                └──────────────┬───────────────────────┬────────────────┘
                               │ tool call              │ tool result + VEI guidance
                ┌──────────────▼───────────────────────▼────────────────┐
                │              VEI MICRO-HARNESS (src/vei/)              │
                │                                                        │
                │  ┌─────────────┐   ┌──────────────┐   ┌─────────────┐ │
                │  │ FINGERPRINT │──▶│  DETECTORS   │──▶│  GUIDANCE   │ │
                │  │  + LEDGER   │   │  (13 total)  │   │  COMPOSER   │ │
                │  └─────────────┘   └──────────────┘   └─────────────┘ │
                │         │                 ▲                  │         │
                │         ▼                 │                  ▼         │
                │  ┌─────────────────────────────────────────────────┐  │
                │  │           TRUTH LAYER (view-state store)         │  │
                │  │  view-state hash · affine price↔Y cache ·        │  │
                │  │  action outcome (changed/unchanged) · temporal   │  │
                │  │  anchor (target week) · trajectory health        │  │
                │  └─────────────────────────────────────────────────┘  │
                └──────────────────────────────────────────────────────┘
                               │ observes (tool.before / tool.after)
                ┌──────────────▼───────────────────────────────────────┐
                │   HEADED BROWSER ENV (MCP tools: tv-browser_tv_*,     │
                │   future: any canvas/DOM GUI via profile)             │
                └──────────────────────────────────────────────────────┘
```

### 4.1 Data flow (per GUI tool call)

```
tool.before(agent calls tv_canvas_zoom):
  1. wire.ts matches tool prefix against the active profile
  2. ledger.record_intent(tool, args, sessionID, ts)
  3. IF tool is nav-class (pan/zoom/navigate): truth.snapshot_viewstate()
     (from the cached get_view result, or mark "unknown")

execute (the MCP tool runs — VEI does not intercept)

tool.after(result):
  4. truth.update(result) — if result is a get_view/find_price_y/screenshot
     payload, fold it into the truth layer (view-state, affine samples,
     screenshot hash)
  5. truth.compute_outcome(tool) — changed / unchanged / unknown
     (nav-class: view-state hash delta after settle; draw-class:
     drawing-list delta or screenshot hash delta; polarity per §6.1)
  6. ledger.record_outcome(tool, args, outcome, viewHash)
  7. detectors.evaluate(ledger, truth) → Finding[] (§7 — pure predicates)
  8. guidance.compose(findings, truth, pipelineContext) → text (§8)
  9. deliver: Level 1 → append annotation to the tool result text;
     Level 2 → corrective directive in the tool result;
     Level 3 → [VEI SITREP] block via messages.transform (next inference)
 10. trajectory health update → intervention ladder position (§4.2)
```

### 4.2 The intervention ladder (AG-lite)

| Level | Trigger | VEI action | Agent sees |
|---|---|---|---|
| **L0 silent** | default | ledger only | nothing |
| **L1 annotate** | first detector finding of a kind | one-line truth appended to tool result | `[VEI] view unchanged after canvas_zoom(out,3) — 2nd identical call.` |
| **L2 corrective** | same finding repeats (or severity=WARN patterns) | full 4-part directive (§8) in the tool result | exact correct tool + args + verification step |
| **L3 sitrep** | trajectory health <0.5 over ≥5 actions, OR temporal-anchor violation, OR severity=BLOCK patterns | `[VEI SITREP]` system block via messages.transform | structured sitrep: current view-state, what it's doing wrong, the exact recovery sequence, the temporal anchor |

Escalation is per-session, computed from the trajectory monitor (fraction of `executed ∧ verified` over the rolling 20-action window): health ≥ 0.7 → L0/L1 only; 0.5-0.7 → L1/L2 allowed; <0.5 → L2/L3 allowed. Upgrade requires ≥10 consecutive clean outcomes (AG's exact hysteresis — no flapping).

#### 4.2.1 The ladder state machine (full transition table)

```
States: L0 (silent) → L1 (annotate) → L2 (corrective) → L3 (sitrep)
Guards (evaluated after every recorded outcome):

  health = |{a ∈ window : a.outcome == 'changed'}| / |{a ∈ window : a.verified}|
           (undefined when window has < 5 verified actions → stay in current state)

  L0 → L1 : first Finding of any code
  L1 → L2 : (a) second Finding with the same code in the window, OR
            (b) any Finding with severity WARN while health < 0.7, OR
            (c) any Finding while health < 0.5
  L2 → L3 : (a) health < 0.5 over ≥ 5 verified actions, OR
            (b) any Finding with severity BLOCK (e.g. D10), OR
            (c) 3 distinct detector codes fire within 5 actions (compound derailment)
  L3 → L2 : health ≥ 0.7 for 10 consecutive verified actions
  L2 → L1 : health ≥ 0.7 for 10 consecutive verified actions
  L1 → L0 : 10 consecutive actions with zero findings

Hysteresis (AG's anti-flap rule): de-escalation requires 10 CONSECUTIVE clean
verified outcomes — a single finding resets the counter. Escalation is
immediate; de-escalation is earned.
```

The ladder position is per-session, serialized with the ledger (§11), and logged on every transition: `[VEI] ladder L1→L2 (health 0.63, trigger: 2nd ACTION_REPETITION)`.

### 4.3 The temporal anchor (pipeline context, read-only)

VEI reads the pipeline's temporal anchor when available (the zones tool computes `buildTemporalAnchor(weekStart)` — Friday 17:00 ET of the target week). From it VEI derives the **target window**: `[weekStartMs, anchorMs]` (Monday 00:00 UTC → Friday close). During perception-class phases (any screenshot that will be read for verdicts), VEI compares the visible bar range (from view-state) against the target window:

- visible range ∩ target window < 60% of the window → **TEMPORAL_ANCHOR finding (severity BLOCK-class, delivered L3)**: the agent is looking at the wrong week. This is the mechanical enforcement of the W7-A fix — prompt text failed twice; computation does not.
- If the pipeline context is absent (non-pipeline GUI work), the anchor check is inert (VEI reports `anchor: none` and skips — §12 law 3: absence of truth is reported, never fabricated).

---

## 5. MODULE SPECIFICATIONS (5 modules + wiring)

### 5.1 `src/vei/ledger.ts` — the fingerprint ledger (~140 lines)

Per-session rolling window of the last 20 GUI actions. The ONLY state VEI keeps about agent behavior.

```typescript
export interface VeiAction {
  seq: number;                 // monotonic per session
  tool: string;                // e.g. 'tv-browser_tv_canvas_zoom'
  argsHash: string;            // sha256(JSON.stringify(args)) — node:crypto
  signature: string;           // `${tool}:${argsHash}` — the LD fingerprint
  ts: number;
  outcome: 'changed' | 'unchanged' | 'unknown' | 'failed';
  viewHashAfter: string | null; // truth-layer view-state hash after this action
  verified: boolean;           // outcome was computed (not 'unknown')
}

export interface VeiLedger {
  sessionID: string;
  actions: VeiAction[];        // ring buffer, max 20 (LD's windowSize)
  toolStreaks: Record<string, { failures: number; lastArgsHash: string }>;
  screenshotHashes: string[];  // last 3 (perception-loop detection)
  productiveCount: number;     // actions in the profile's productive allowlist
  health: number;              // fraction executed∧verified over the window
}

export function recordIntent(l: VeiLedger, tool: string, args: unknown): VeiAction;
export function recordOutcome(l: VeiLedger, a: VeiAction, outcome: VeiAction['outcome'], viewHash: string | null): void;
export function trimWindow(l: VeiLedger): void;               // keep last 20
export function serialize(l: VeiLedger): string;              // JSON — compaction survival
export function restore(s: string): VeiLedger;                // version-checked
```

Invariants (checked on every mutation — MPSE Structure 10): `actions.length ≤ 20`; `seq` strictly increasing; `health ∈ [0,1]`. Violation → VEI disables itself for the session and logs (§12 law 6).

### 5.2 `src/vei/truth.ts` — the truth layer (~260 lines)

The ground-truth store. Everything VEI KNOWS about the environment.

```typescript
export interface ViewState {
  symbol: string;
  timeframe: string;
  barStartMs: number;          // left edge of visible range
  barEndMs: number;            // right edge
  priceHigh: number;
  priceLow: number;
  barSpacing: number;          // px per bar
}
export type ViewHash = string; // sha256 of the ViewState tuple

export interface AffineCache {
  a: number; b: number;        // y = a·price + b
  calibratedAt: ViewHash;      // the view-state it was fitted in
  samples: Array<{ price: number; y: number }>;
}

export interface TruthLayer {
  current: ViewState | null;        // last parsed get_view
  currentHash: ViewHash | null;
  history: ViewHash[];              // last 6 (oscillation detection)
  affine: AffineCache | null;
  anchor: { weekStartMs: number; anchorMs: number; label: string } | null;
  screenshots: Array<{ path: string; bytes: number; hash: string; viewHash: ViewHash | null }>;
}

// Parsing (pure functions over tool results)
export function parseGetViewResult(result: unknown): ViewState | null;
export function hashViewState(v: ViewState): ViewHash;

// The affine cache (§6.2 — the coordinate intelligence)
export function recordPriceSample(t: TruthLayer, price: number, y: number): void;
export function priceToY(t: TruthLayer, price: number): number | null;  // null = uncalibrated
export function invalidateAffine(t: TruthLayer, newHash: ViewHash): void; // on view change

// Outcome computation (§6.1 — did the action do anything?)
export function computeOutcome(t: TruthLayer, tool: string, before: ViewHash | null): 'changed' | 'unchanged' | 'unknown';

// Temporal anchor (§4.3)
export function setAnchor(t: TruthLayer, weekStart: string): void;        // from buildTemporalAnchor
export function anchorCoverage(t: TruthLayer): number | null;             // visible ∩ target / target — null without anchor or view
```

Determinism law: every function in truth.ts is pure. Same inputs → same outputs, byte-identical. No clocks except the recorded `ts` on ledger entries (which never feeds a decision — decisions use hashes and counts only).

### 5.3 `src/vei/detectors.ts` — the detector engine (~300 lines)

All 13 detectors as **total predicates** `(ledger, truth) → Finding | null`, evaluated in a fixed order after every recorded outcome. Each finding carries machine-readable evidence (MPSE: a finding without evidence is a defect).

```typescript
export interface Finding {
  code: DetectorCode;          // see §7 catalog
  severity: 'INFO' | 'WARN' | 'BLOCK';
  toolName: string;
  repeatCount: number;
  evidence: Record<string, string | number | boolean>;  // counts, hashes, args — never prose-only
}

export type DetectorCode =
  | 'ACTION_REPETITION' | 'TOOL_FAILURE_STREAK' | 'STATE_OSCILLATION'
  | 'NAV_STAGNATION' | 'PERCEPTION_LOOP' | 'CLICK_LOOP'
  | 'NAVIGATION_DRIFT' | 'PROGRESS_STAGNATION' | 'EXCESSIVE_SCREENSHOTS'
  | 'TEMPORAL_ANCHOR' | 'DRAW_DUPLICATE' | 'COORD_SPAM'
  | 'WRONG_VERB';

export function evaluate(l: VeiLedger, t: TruthLayer, profile: GuiProfile): Finding[];
```

Evaluation order (fixed, deterministic): BLOCK-severity first (TEMPORAL_ANCHOR), then loop-class (ACTION_REPETITION → TOOL_FAILURE_STREAK → STATE_OSCILLATION → PERCEPTION_LOOP), then navigation-class (NAV_STAGNATION → NAVIGATION_DRIFT → WRONG_VERB), then hygiene (CLICK_LOOP → PROGRESS_STAGNATION → EXCESSIVE_SCREENSHOTS → DRAW_DUPLICATE → COORD_SPAM). First 3 findings max per evaluation (flood control — the deepest issue speaks first).

Each detector is a pure function and is ALSO exported as a `MathExpr` (MPSE contract form) so the same predicate can be replayed by offline verification and logged into the audit chain: e.g. `ACTION_REPETITION ⟺ card({a ∈ last(3, actions) : a.signature = head(actions).signature}) = 3`.

### 5.4 `src/vei/guidance.ts` — the guidance composer (~280 lines)

Finding → precise corrective text. The ONLY module that produces natural language, and every string is a template with slots filled from `Finding.evidence` + the truth layer + the pipeline context — zero free generation, zero LLM.

```typescript
export interface GuidanceContext {
  scaffoldByPair?: Record<string, Array<{ price: number; top: number; bottom: number; type: string }>>;
  anchorLabel?: string;        // e.g. 'Jul 6-10, 2026'
  weekStartMs?: number;
  anchorMs?: number;
}

export function compose(f: Finding, t: TruthLayer, ctx: GuidanceContext, profile: GuiProfile): string;
export function composeSitrep(l: VeiLedger, t: TruthLayer, ctx: GuidanceContext, profile: GuiProfile): string;
```

The composer is also where the **coordinate injection** lives: when the affine cache is calibrated and the scaffold is available, the composer can append the rung→pixel map to any guidance (§6.2) — the operator's "the supply zone you are looking for is here at these pixel coordinates."

### 5.5 `src/vei/profiles/tradingview.ts` — the GUI profile (~180 lines)

ALL TradingView-isms quarantined behind this interface. A second profile (generic canvas app) can be added without touching core modules.

```typescript
export interface GuiProfile {
  name: string;
  matches(tool: string): boolean;                        // tool prefix match
  productiveTools: ReadonlySet<string>;                  // allowlist for PROGRESS_STAGNATION
  navClass: ReadonlySet<string>;                         // pan/zoom/navigate (outcome = view-delta)
  drawClass: ReadonlySet<string>;                        // draw_* (outcome = drawing-delta)
  settleMs(tool: string): number;                        // SEL's per-tool settle table
  parseViewState(result: unknown): ViewState | null;     // tv_get_view result shape
  expectedChange(tool: string): 'view' | 'drawing' | 'screenshot' | 'none';  // outcome polarity
  temporalRecipe(target: { weekStartMs: number; anchorMs: number }): string; // the exact pan recipe text
  verbTable: Record<string, string>;                     // intent → correct tool+args guidance fragments
}
```

The TradingView profile's `temporalRecipe`: `"canvas_pan({time: ${target.weekStartMs + 2.5 * 86400000}}) — or canvas_pan({bars: -60}) on 1H — then get_view: ${target.label} must fill the frame."` The `verbTable` includes: temporal navigation → canvas_pan (NEVER zoom); fine positioning → canvas_pan; price→pixel → affine cache first, find_price_y only to calibrate; verify drawing → list_drawings (NOT another screenshot).

### 5.6 `src/vei/wire.ts` — hook integration (~100 lines)

Registers VEI into `src/index.ts`'s existing hook chain. Honors the binary-verified K-contract: BEFORE trigger args live in the OUTPUT parameter (`(output?.args ?? input?.args ?? input)` — index.ts:189).

```typescript
export interface VeiHooks {
  onToolBefore(tool: string, args: unknown, sessionID: string): void;
  onToolAfter(tool: string, args: unknown, result: unknown, sessionID: string): string | null;  // returns appended guidance text or null
  onMessagesTransform(sessionID: string): string | null;  // L3 sitrep injection
}
export function createVeiHooks(profile: GuiProfile, getPipelineContext: () => GuidanceContext): VeiHooks;
```

- **Non-GUI tools:** one prefix check → passthrough, zero overhead.
- **Fail-silent-off:** any exception inside VEI → log + disable for the session. VEI must never break the pipeline it observes (§12 law 6).
- **State:** per-session `Map<sessionID, {ledger, truth}>`, serialized into the compaction-survival flow alongside existing state.

---

## 6. THE FOUR INTELLIGENCE PRIMITIVES (full algorithms)

### 6.1 DID IT WORK? — outcome truth with per-tool polarity

For each GUI action, VEI computes `changed | unchanged | unknown | failed` by comparing environment truth before/after. The polarity table (SEL's `expectsChange` pattern):

| Tool class | Expected change | Verified by | `unchanged` means |
|---|---|---|---|
| nav-class (pan/zoom/navigate/set_timeframe) | VIEW | view-state hash delta after `settleMs` | the action did NOT move the chart — loop signal |
| draw-class (draw_rectangle/trend_line/fib/horizontal) | DRAWING | drawing-list delta (list_drawings) or screenshot hash delta | the draw did NOT register — retry or wrong coordinates |
| screenshot-class | SCREENSHOT | new file at auto-saved path, byte-size > 1KB, hash ≠ previous | capture failed or blank frame |
| read-class (get_view, get_state, find_price_y, list_drawings) | NONE | polarity inverted — `changed` view-state after a read means something ELSE moved the chart | informational only, never a finding |
| click/key-class | UNKNOWN | honest `unknown` (no cheap oracle) | no finding from outcome alone |

The BEFORE snapshot: for nav-class, VEI snapshots `truth.currentHash` at tool.before. The AFTER read: VEI does NOT force a get_view call (no extra browser traffic) — it consumes the agent's own subsequent get_view result when one arrives, marking the action `unknown` until then. If the agent never calls get_view within 3 actions after a nav-class call, VEI's next guidance says so: `"no get_view since your last 3 navigation calls — I cannot confirm the view moved. Call get_view once so I can calibrate."` (§12 law 3: absence of truth is reported as truth.)

### 6.2 WHERE IS IT? — the affine price↔Y cache (coordinate intelligence)

**The math.** After any 2 `(price, y)` samples in the same view-state (parsed from `find_price_y` results), VEI fits:

```
a = (y₂ − y₁) / (p₂ − p₁)
b = y₁ − a·p₁
priceToY(p) = round(a·p + b)
```

Chart Y is affine in price within a fixed view (linear axis — true for TV's default scale; log-scale is flagged by the profile and disables the cache honestly). With ≥3 samples VEI computes residuals and reports calibration quality (`maxResidual ≤ 2px` → calibrated; else keep sampling).

**Invalidation.** Any view-state change (pan/zoom/navigate → new view hash) clears the cache. Any timeframe/symbol change clears it. The cache key IS the view hash (`calibratedAt`) — a stale mapping is impossible by construction.

**Delivery (coordinate injection).** When calibrated and the scaffold is available, the composer appends to relevant guidance (first draw-class call per view, or on COORD_SPAM):

```
[VEI:COORD_CACHE] price↔Y calibrated for this view (a=-152.3 px/$, max residual 1px).
  DXY rungs: 100.851→y≈361, 100.946→y≈375, 100.980→y≈380, 101.144→y≈405, 101.235→y≈419.
  Draw these without further find_price_y probes. Chart center x≈950.
```

**Expected effect:** `find_price_y` calls per run drop from ~200 (test 2 evidence) to ~4 per chart (2 to calibrate + occasional recalibration after pans).

### 6.3 AM I REPEATING? — the temporal self-model

The ledger + truth history answer, per action:

- **Identical action ×3:** last 3 `signature` equal → ACTION_REPETITION.
- **Nav with zero movement ×3:** 3 consecutive nav-class actions with `outcome = unchanged` → NAV_STAGNATION.
- **A-B-A-B view flapping:** last 6 view hashes alternate A,B,A,B,A,B (≥5 match) → STATE_OSCILLATION.
- **Same screenshot ×3:** last 3 screenshot hashes identical → PERCEPTION_LOOP.
- **Per-tool failure streak ≥3:** consecutive `outcome = failed` per tool → TOOL_FAILURE_STREAK.
- **Click proximity loop:** last 3 click-class calls within 20px center distance (SEL's exact `_isClickLoop`) → CLICK_LOOP.
- **Progress stagnation:** last 5 actions contain zero productive-allowlist verbs → PROGRESS_STAGNATION.
- **Screenshot over-reliance:** ≥5 screenshots in the 20-window with zero read() of them (heuristic: screenshot actions without an intervening read-tool marker) → EXCESSIVE_SCREENSHOTS.

Every detection carries its evidence into the finding (counts, the repeated args hash, the unchanged view hash, the streak length) — the guidance composer renders it; the agent cannot argue with its own action record.

### 6.4 WHAT SHOULD I DO INSTEAD? — intent-correct verbs (the wrong-verb corrector)

The profile's verb table maps detected intent → correct tool + args template. Intent is detected from the failing pattern:

| Observed pattern | Intent (inferred) | Correct verb (injected) |
|---|---|---|
| zoom out ×N with no view change + a past-tense target in context | temporal navigation to a past week | `canvas_pan({time: <weekStartMs+2.5d>})` or `bars:-60`, then `get_view` |
| navigate ×N with tiny view deltas | fine positioning | `canvas_pan({bars: ±N})` |
| find_price_y ×N (N>6) in one view | coordinate lookup spam | affine cache answer + "calibrate once, reuse" |
| draw_rectangle with identical args ×2 | duplicate draw | "already on chart (drawing list confirms) — next rung" |
| screenshot ×N without reads | perception without consumption | "read() the LAST screenshot — you have visual context already" |
| verdicts being written while view shows wrong week | temporal perception | TEMPORAL_ANCHOR sitrep with the exact re-capture recipe |

---

## 7. THE DETECTOR CATALOG (13 detectors, exact thresholds)

| # | Code | Predicate (exact) | Severity | Threshold provenance |
|---|---|---|---|---|
| D1 | ACTION_REPETITION | last 3 signatures identical | WARN | LD.js L30-38 (production-verified) |
| D2 | TOOL_FAILURE_STREAK | per-tool consecutive `failed` ≥ 3 | WARN | LD.js L40-50 |
| D3 | STATE_OSCILLATION | last 6 view hashes alternate A,B ≥ 5 of 6 | WARN | LD.js L52-69 |
| D4 | NAV_STAGNATION | 3 consecutive nav-class with outcome=unchanged | WARN | SEL nav-drift pattern + outcome polarity |
| D5 | PERCEPTION_LOOP | last 3 screenshot hashes identical | WARN | LD.js L86-93 |
| D6 | CLICK_LOOP | last 3 click-class within 20px center-distance | WARN | WebAntiDerailment L172-181 |
| D7 | NAVIGATION_DRIFT | 3 nav-class within 5 actions with zero productive verbs between | WARN | WebAntiDerailment L183-194 |
| D8 | PROGRESS_STAGNATION | last 5 actions, zero productive-allowlist verbs | WARN | WebAntiDerailment L203-212 |
| D9 | EXCESSIVE_SCREENSHOTS | ≥5 screenshot-class in window with zero read markers | WARN | WebAntiDerailment L100-151 |
| D10 | TEMPORAL_ANCHOR | anchorCoverage < 0.6 during a perception-class phase | BLOCK | W7-A container evidence (test 3: 17 false rejections) |
| D11 | DRAW_DUPLICATE | draw-class signature seen before in session with same args | INFO | test-2 evidence (y1=707 redraw) |
| D12 | COORD_SPAM | >6 find_price_y in one view-state while affine calibrated | WARN | test-2 evidence (203 probes) |
| D13 | WRONG_VERB | zoom-class used with temporal-navigation context (past-week target in pipeline context) | WARN | test-4 zoom-loop evidence |

All thresholds are named constants with BECAUSE comments citing the SEL source line or the container evidence. No magic numbers.

### 7.1 Detector pseudocode (complete, total functions)

Each detector is a total predicate `(ledger, truth, profile) → Finding | null`. Pseudocode is normative — the build implements these EXACTLY.

**D1 ACTION_REPETITION** (the F1/F3/F7 killer — fires on the 3rd identical call):
```
fn d1(ledger):
  if ledger.actions.length < 3: return null
  const [a, b, c] = ledger.actions.slice(-3)
  if a.signature == b.signature && b.signature == c.signature:
    return Finding {
      code: ACTION_REPETITION, severity: WARN,
      toolName: c.tool, repeatCount: 3,
      evidence: { signature: c.signature, argsHash: c.argsHash,
                  outcomes: [a.outcome, b.outcome, c.outcome],
                  viewUnchanged: (a.viewHashAfter == c.viewHashAfter) }
    }
  return null
```
Note the evidence captures `viewUnchanged` — three identical calls WITH view changes (e.g. zooming progressively) is legitimate progression, so the guidance composer DOWNGRADES to INFO when outcomes show change; three identical calls with NO change is a hard loop. (Refinement over SEL's LD, which ignores outcomes.)

**D2 TOOL_FAILURE_STREAK:**
```
fn d2(ledger):
  for (tool, streak) of ledger.toolStreaks:
    if streak.failures >= 3:
      return Finding { code: TOOL_FAILURE_STREAK, severity: WARN,
        toolName: tool, repeatCount: streak.failures,
        evidence: { lastArgsHash: streak.lastArgsHash, failures: streak.failures } }
  return null
```
Streak semantics (SEL exact): increment on `outcome == failed`, reset to 0 on any non-failed outcome of the same tool.

**D3 STATE_OSCILLATION:**
```
fn d3(truth):
  if truth.history.length < 6: return null
  const last6 = truth.history.slice(-6)
  const [A, B] = [last6[0], last6[1]]
  if A == B: return null                        // not an alternation
  let matches = 0
  for i in 0..5: if last6[i] == (i % 2 == 0 ? A : B): matches++
  if matches >= 5:
    return Finding { code: STATE_OSCILLATION, severity: WARN,
      toolName: 'navigation', repeatCount: matches,
      evidence: { hashA: A, hashB: B, matches } }
  return null
```
This catches pan-too-far → pan-back → pan-too-far flapping (the agent oscillating around a target it can't land on).

**D4 NAV_STAGNATION:**
```
fn d4(ledger, profile):
  const navActions = ledger.actions.filter(a => profile.navClass.has(a.tool))
  const last3 = navActions.slice(-3)
  if last3.length < 3: return null
  if last3.every(a => a.outcome == 'unchanged'):
    return Finding { code: NAV_STAGNATION, severity: WARN,
      toolName: last3[2].tool, repeatCount: 3,
      evidence: { tools: last3.map(a => a.tool),
                  viewHash: last3[2].viewHashAfter } }
  return null
```
Distinct from D1: three DIFFERENT nav calls (different args) that all fail to move the view — the agent is trying variations of a wrong approach (e.g. zoom out 3, zoom out 5, zoom out 8 — different args, same wrong verb).

**D5 PERCEPTION_LOOP:**
```
fn d5(ledger):
  if ledger.screenshotHashes.length < 3: return null
  const [a, b, c] = ledger.screenshotHashes.slice(-3)
  if a == b && b == c:
    return Finding { code: PERCEPTION_LOOP, severity: WARN,
      toolName: 'tv_screenshot', repeatCount: 3,
      evidence: { hash: a } }
  return null
```
Three identical screenshots = the chart hasn't changed OR the capture is failing silently OR the agent re-captures without acting.

**D6 CLICK_LOOP** (SEL's exact spatial check):
```
fn d6(ledger):
  const clicks = ledger.actions.filter(a => a.tool.endsWith('click')).slice(-3)
  if clicks.length < 3: return null
  const centers = clicks.map(c => [ (c.args.x1 + c.args.x2) / 2, (c.args.y1 + c.args.y2) / 2 ])
  const target = centers[2]
  if centers.every(c => Math.abs(c[0] - target[0]) < 20 && Math.abs(c[1] - target[1]) < 20):
    return Finding { code: CLICK_LOOP, severity: WARN,
      toolName: clicks[2].tool, repeatCount: 3,
      evidence: { center: target } }
  return null
```

**D7 NAVIGATION_DRIFT:**
```
fn d7(ledger, profile):
  const last5 = ledger.actions.slice(-5)
  const navCount = last5.filter(a => profile.navClass.has(a.tool)).length
  const productiveCount = last5.filter(a => profile.productiveTools.has(a.tool)).length
  if navCount >= 3 && productiveCount == 0:
    return Finding { code: NAVIGATION_DRIFT, severity: WARN,
      toolName: 'navigation', repeatCount: navCount,
      evidence: { navCount, productiveCount } }
  return null
```

**D8 PROGRESS_STAGNATION:**
```
fn d8(ledger, profile):
  const last5 = ledger.actions.slice(-5)
  if last5.length < 5: return null
  if last5.every(a => !profile.productiveTools.has(a.tool)):
    return Finding { code: PROGRESS_STAGNATION, severity: WARN,
      toolName: last5[4].tool, repeatCount: 5,
      evidence: { tools: last5.map(a => a.tool) } }
  return null
```

**D9 EXCESSIVE_SCREENSHOTS:**
```
fn d9(ledger):
  const shots = ledger.actions.filter(a => a.tool.endsWith('screenshot'))
  const reads  = ledger.actions.filter(a => a.tool == 'read')
  if shots.length >= 5 && reads.length == 0:
    return Finding { code: EXCESSIVE_SCREENSHOTS, severity: WARN,
      toolName: 'tv_screenshot', repeatCount: shots.length,
      evidence: { shots: shots.length, reads: reads.length } }
  return null
```

**D10 TEMPORAL_ANCHOR** (the W7-A killer — the only BLOCK-severity detector):
```
fn d10(truth, profile):
  if !truth.anchor: return null                    // inert without pipeline context
  const coverage = anchorCoverage(truth)           // §5.2 — visible ∩ target / target
  if coverage == null: return null                 // no view-state yet — inert
  if coverage < 0.6 && truth.phase == 'perception':  // phase tracked from pipeline context
    return Finding { code: TEMPORAL_ANCHOR, severity: 'BLOCK',
      toolName: 'screenshot/verdicts', repeatCount: 1,
      evidence: { coverage, visibleStart: truth.current.barStartMs,
                  visibleEnd: truth.current.barEndMs,
                  anchorStart: truth.anchor.weekStartMs,
                  anchorEnd: truth.anchor.anchorMs } }
  return null
```
Coverage computation: `|max(vs, as) − min(ve, ae)| / (ae − as)` where `[vs, ve]` = visible bar range, `[as, ae]` = anchor window. The 0.6 threshold: the golden rungs span the whole week — verifying with less than 60% of the week visible means missing reactions. BECAUSE: test-3's agent read the live right edge (0% coverage) and produced 17 false REJECTIONS → 0 setups.

**D11 DRAW_DUPLICATE:**
```
fn d11(ledger, profile):
  const draws = ledger.actions.filter(a => profile.drawClass.has(a.tool))
  const seen = new Set(draws.slice(0, -1).map(a => a.signature))
  const last = draws[draws.length - 1]
  if last && seen.has(last.signature):
    return Finding { code: DRAW_DUPLICATE, severity: 'INFO',
      toolName: last.tool, repeatCount: draws.filter(a => a.signature == last.signature).length,
      evidence: { signature: last.signature } }
  return null
```

**D12 COORD_SPAM:**
```
fn d12(ledger, truth):
  const probes = ledger.actions.filter(a => a.tool.endsWith('find_price_y'))
  const thisView = probes.filter(a => a.viewHashAfter == truth.currentHash)
  if thisView.length > 6 && truth.affine && truth.affine.calibratedAt == truth.currentHash:
    return Finding { code: COORD_SPAM, severity: WARN,
      toolName: 'find_price_y', repeatCount: thisView.length,
      evidence: { probes: thisView.length, calibrated: true,
                  residual: truth.affine.maxResidual ?? 0 } }
  return null
```

**D13 WRONG_VERB:**
```
fn d13(ledger, profile, ctx):
  const last = ledger.actions[ledger.actions.length - 1]
  if !last || !last.tool.includes('zoom'): return null
  if ctx.weekStartMs && ctx.weekStartMs < (truth.current?.barStartMs ?? Infinity):
    // the target week is LEFT of the visible range — temporal navigation needed
    const recentSameZoom = ledger.actions.slice(-3).filter(a => a.tool == last.tool).length
    if recentSameZoom >= 2:
      return Finding { code: WRONG_VERB, severity: WARN,
        toolName: last.tool, repeatCount: recentSameZoom,
        evidence: { targetWeekStart: ctx.weekStartMs,
                    visibleStart: truth.current?.barStartMs,
                    direction: 'past' } }
  return null
```
This is the detector that would have fired on test-4's zoom-loop at call #2 — the pipeline context says the target week is BEHIND the visible range, and zoom (which only changes scale, never time position) is the wrong verb for temporal travel.

### 7.2 Failure-mode → detector mapping (the F1-F8 coverage proof)

| Container failure | Detector(s) | Fires at | Guidance delivered |
|---|---|---|---|
| F1 zoom×8 loop | D1 (call 3) + D13 (call 2) | 2nd-3rd call | canvas_pan recipe + get_view confirm |
| F2 rectangle re-draw + 203 probes | D11 + D12 | 2nd draw / 7th probe | "already drawn" + affine injection |
| F3 zoom for temporal nav | D13 | 2nd zoom | correct verb: canvas_pan |
| F4 verdict match-rate swings | D10 + D12 (indirect — spatial grounding via affine injection) | before verdicts | temporal anchor + coordinate injection |
| F5 temporal leak (live price) | D10 | first wrong-window screenshot | BLOCK sitrep with re-capture recipe |
| F6 orchestrator monitoring gap | (out of VEI scope — addressed by the orchestrator's 3-signal protocol) | — | — |
| F7 pan×6 blind iterations | D1 (call 3) + D4 (call 3) | 3rd call | "pan moved the view? get_view to confirm, then stop" |
| F8 3-min prose deliberation on draw strategy | D8 (if 5 non-productive actions) | 5th action | authoritative draw guidance + coordinate injection |

---

## 8. THE GUIDANCE GRAMMAR (message catalog)

Every L2/L3 message follows the fixed 4-part shape — no vagueness permitted:

```
[VEI:{CODE}] {what you did — with counts} → {why it's wrong — with evidence} →
  {the correct action — exact tool + exact args} → {how to confirm — the verification step}
```

The full catalog (templates with slots; each maps to a detector):

**D1 ACTION_REPETITION:**
```
[VEI:ACTION_REPETITION] {tool}({argsSummary}) ×{count} with zero new effect →
  repeating the same call cannot produce a different result →
  {verbTable's alternative for the inferred intent} → confirm with {verification verb}.
```

**D4/D13 navigation (the F1/F3/F7 killer):**
```
[VEI:WRONG_VERB] {tool}({args}) ×{count} — view still {barStart}-{barEnd} →
  {zoom|navigate} cannot travel to a past week →
  canvas_pan({time: ${weekStartMs + 2.5*86400000}}) (or bars:-60 on 1H) →
  then get_view: {anchorLabel} must fill the frame.
```

**D10 TEMPORAL_ANCHOR (L3 sitrep):**
```
[VEI SITREP — TEMPORAL_ANCHOR]
Your visible window is {visibleStart} to {visibleEnd}. The report week is {anchorLabel}
({weekStartMs} to {anchorMs}). Verdicts computed against future price are forward leakage
(test-3: 17 false REJECTIONS, 0 setups).
RECOVERY: (1) canvas_pan({time: ${weekStartMs + 2.5*86400000}}); (2) get_view — confirm
{anchorLabel} fills the frame; (3) RE-CAPTURE the screenshot; (4) re-read and re-issue
verdicts. Judge each rung ONLY by candles inside {anchorLabel}.
```

**D12 COORD_SPAM + affine injection:**
```
[VEI:COORD_CACHE] {count} find_price_y calls in this view → the transform is already
calibrated (a={a} px/$, residual {r}px) → use it: {rung→y map, up to 8 rungs} →
call find_price_y again ONLY after pan/zoom (I will tell you if the cache is stale).
```

**D11 DRAW_DUPLICATE:**
```
[VEI:DRAW_DUPLICATE] draw_rectangle({argsSummary}) is already on the chart
(drawing list entry {id}) → the rung is drawn → proceed to rung #{next} of {total}.
```

**D2 TOOL_FAILURE_STREAK:**
```
[VEI:TOOL_FAILURE_STREAK] {tool} failed {count}× consecutively ({lastError}) →
  the same call will keep failing → {alternative strategy from verbTable} →
  if that fails once, STOP and report the blocker instead of retrying.
```

**L3 full sitrep (trajectory health < 0.5):**
```
[VEI SITREP] Health {health} over last {n} actions ({breakdown}: {counts per outcome}).
  Current view: {symbol} {timeframe}, bars {barStart}-{barEnd}, prices {low}-{high}.
  Affine cache: {calibrated|stale|absent}. Anchor: {anchorLabel|none}.
  What is going wrong: {top 2 findings with evidence}.
  Recovery sequence: {numbered exact steps}.
```

---

## 9. THE TRADINGVIEW PROFILE (all TV-isms, quarantined)

Everything TradingView-specific lives in `profiles/tradingview.ts`:

- **Tool prefix:** `tv-browser_tv_`.
- **View-state parser:** consumes `tv_get_view` output `{visibleBarRange: {startMs, endMs}, priceRange: {high, low}, timeframe, symbol, barSpacing}` (the 'where am I' primitive).
- **Settle table:** navigate/switch 2000ms, draw 1000ms, click/type 300ms, default 200ms (SEL verbatim).
- **Temporal recipe:** `canvas_pan({time})` or `canvas_pan({bars})` — the profile knows TV's bar-time model (1H = 120 bars/week, 4H = 30 bars/week) and computes `bars` from the target window: `barsBack = ceil((nowBarMs - targetMidMs) / barMs)`.
- **Drawing verification:** `tv_list_drawings` (drawing-list delta) — cheaper than screenshot comparison.
- **Coordinate tools:** `find_price_y` (calibration samples), chart-center x from `get_view` (or 0.5×viewport width fallback, marked as fallback).
- **Known MCP quirks** (from the MV3 handover, HANDOVER_PACKAGE_TV_BROWSER.md L66-81): select_tool flyout buttons need x>50 filtering; hover-before-click on toolbar arrows. The profile carries these as tool-specific guidance fragments injected when those tools appear.

A second profile (generic web canvas, `web_` prefix) can register by implementing the same interface — the core modules never change.

---

## 10. HOOK INTEGRATION (binary-verified contract)

VEI registers into `src/index.ts`'s existing hooks:

- **tool.execute.before** — the K-contract: opencode 1.14.43 BEFORE trigger = `trigger(before, {tool, sessionID, callID}, {args})` — args in the OUTPUT parameter. VEI reads them via the same `(output?.args ?? input?.args ?? input)` chain already proven at index.ts:189. Records intent; snapshots view hash for nav-class.
- **tool.execute.after** — args in input per the binary evidence. VEI records outcome, runs detectors, composes guidance, returns the annotation text (appended to the result the agent receives by the existing tool.after chain — the same mechanism tool-after.ts uses for Manual Step pushes).
- **messages.transform** — L3 sitrep injection: VEI's sitrep block is prepended as system context before the agent's next inference.
- **Order relative to TVI:** VEI runs AFTER the TVI VEB (before-hook gates) and BEFORE the tool.after Manual Step pushes — VEI's guidance and TVI's pipeline discipline are complementary layers (TVI = pipeline doctrine, VEI = GUI execution).

---

## 11. SESSION STATE + COMPACTION SURVIVAL

- Per-session store: `Map<sessionID, { ledger: VeiLedger, truth: TruthLayer, ladder: 'L0'|'L1'|'L2'|'L3' }>`.
- `serialize()` → JSON with `veiStateVersion` (contractId discipline, MPSE KB-MPSE-03 §6: mismatched version → restore rejected, fresh state).
- Serialized into the same compaction-survival flow the plugin already uses (category="compaction" hive pattern) — the ledger and truth layer survive compaction so loop history and calibration don't reset mid-run.
- Session eviction: sessions older than 24h dropped (bounded memory).

---

## 12. DETERMINISM + ANTI-THEATRICAL LAWS (binding on the build)

1. **Zero LLM calls inside VEI v1.** Every output is a pure function of the tool stream + tool results. Same stream → same guidance, byte-identical.
2. **Zero new npm dependencies.** sha256 via node:crypto; no PNG libs (dHash is v2).
3. **No invented truth.** Uncalibrated affine → `priceToY` returns null and guidance says "calibrate with 2 find_price_y calls." Missing view-state → outcome is `unknown`, never guessed. Missing anchor → anchor checks inert, reported as `anchor: none`. Absence of truth is itself reported as truth.
4. **Guidance ≠ action.** VEI never executes, never blocks in v1, never edits the agent's plan or the pipeline. It observes, knows, corrects.
5. **Evidence or silence.** A finding without machine-readable evidence (counts/hashes/args) is a build defect — every detector MUST emit evidence.
6. **Fail-silent-off.** Any VEI internal error → log + disable VEI for the session. VEI must never break the pipeline it observes.
7. **Total predicates only** (MPSE Losslessness): every detector is a total function over the ledger — every possible ledger state maps to exactly one verdict (finding or null). No partial functions, no exceptions-as-logic.
8. **Immutable constants with provenance.** Every threshold cites its SEL source line or container evidence in a BECAUSE comment.

---

## 13. VERIFICATION PLAN (pre-container + container)

### 13.1 Unit/scratch (orchestrator-run, pre-deploy)

- **Loop detectors:** synthetic streams — zoom×3 (fires at exactly 3), pan-with-no-change×3 (NAV_STAGNATION), A-B-A-B view hashes (oscillation at 6), rectangle re-draw (DRAW_DUPLICATE), alternating tools (no false positive), 2 identical + 1 different (no fire — boundary exactness).
- **Affine cache:** 2 samples → predicted y for a 3rd known (price,y) within ±2px; invalidation on view hash change; 3-sample residual quality gate; uncalibrated → null (never a guess).
- **Outcome polarity:** nav-class with view-delta → changed; nav-class without → unchanged; draw-class with drawing-delta → changed; read-class → never a finding.
- **Temporal anchor:** visible window 60%+ coverage → inert; 30% coverage → D10 fires with correct recovery recipe; no anchor → inert + reported.
- **Guidance grammar:** every detector code produces the 4-part shape with non-empty evidence + args + verification sections.
- **Determinism:** same synthetic stream twice → byte-identical findings + guidance.
- **Ladder hysteresis:** health 0.6→0.4 escalates L2; 10 clean outcomes de-escalates; no flap at the boundary.

### 13.2 Container (the v4.4 acceptance run, week 2026-07-06, opencode-go)

1. **Loop-catch proof:** if the agent zoom/pan-loops, the stream shows `[VEI:ACTION_REPETITION]` or `[VEI:WRONG_VERB]` by the 3rd identical call with the correct-verb directive — and the agent USES the suggested tool within its next 2 actions (behavioral evidence, not just message presence).
2. **Probe-spam reduction:** `find_price_y` count ≤ 12 for the whole run (baseline 203).
3. **Temporal enforcement:** zero verdict evidence lines citing prices outside the Jul 6-10 window (baseline: 17 false rejections in test 3); if the agent views the wrong week, D10 sitrep fires BEFORE it emits verdicts.
4. **Draw-phase duration:** ≤ 15 min (baseline ~45 min in test 4).
5. **Verdict match-rate:** DXY CONFIRMED ≥ 15 with zero orchestrator nudges (baseline: 0-2 unassisted).
6. **No regression:** pipeline completes, 0 FATAL, sniff-test criteria unchanged-or-better (mirror lane ≥ DXY count per pair, ≤12/pair without documented filter casualties, balance within doctrine).
7. **VEI overhead:** detector evaluation < 1ms per action (log the timing); zero added latency perceivable in the run.

---

## 14. ROLLOUT PHASES

| Phase | Content | Gate |
|---|---|---|
| **v4.4.0 (this spec)** | 5 modules + TV profile + wiring; observe+guide only (no blocking); 13 detectors; affine cache; temporal anchor; L0-L3 ladder | Container acceptance (§13.2) |
| **v4.4.1** | dHash pixel-truth (pure-JS PNG decode — evaluate fast-png vs hand-rolled); draw-verification via drawing-list delta as primary; AIG-style pre-gates (geometry sanity: rectangle top>bottom, sane coordinates) | dHash parity vs view-hash on the same run |
| **v4.4.2** | AG full escalation (optional hard block on 4th identical call); MiMoVerifier second-stage confirm (cost-gated); generic-web profile | 2 consecutive sniff-test passes |
| **v4.5** | Environment-level VEI (docker-image sidecar: the same truth layer exposed as an MCP resource so ANY agent in the container gets spatial intelligence) — the operator's "environment VEI" end-state, lifted from the proven internal version | ship review |

---

## 15. ANTI-GOALS (explicitly out of scope)

- ❌ VEI does not trade, draw, navigate, or plan — ever.
- ❌ No LLM/VLM calls inside v1 (deterministic only).
- ❌ No chrome-extension anything; no DOM access; no new deps in v1.
- ❌ Not a replacement for TVI (TVI gates pipeline discipline; VEI governs GUI execution — different layers, complementary).
- ❌ Not a replacement for MDVE (MDVE computes WHAT the chart contains from data; VEI governs HOW the agent operates the browser — VEI consumes MDVE's scaffold read-only).
- ❌ Not TradingView-hardcoded — the profile is the only TV surface.
- ❌ No blocking in v1 (observe + guide; blocking is a v2 decision with evidence).
- ❌ No free-generated guidance text (templates + evidence slots only).

---

## 16. WHY THIS IS THE NEOCORTEX (the architectural claim, precisely)

The agent today is a brainstem with eyes: raw sensory input (screenshots) and raw motor output (MCP calls) wired directly to a planner with no intervening spatial/temporal cortex. Every v4.3 GUI failure was a failure of **grounding**, not intelligence: the model reasons about zones flawlessly once it knows where it is, when it is, what changed, and what it just did. VEI supplies exactly those four grounding facts, computed deterministically, injected at the moment of need — the same division of labor as thalamus → visual cortex → cerebellum → motor cortex. The planner (MiMo) keeps full authority over strategy; VEI owns the physics of the environment. In the v4.4 triad, MDVE computes the chart's structure from data (the eyes), PVE scores the outputs (the judge), and VEI guarantees the agent can physically operate in the GUI where it verifies and presents that structure (the hands). That is the de facto neocortex architecture: **the agent inferences with intelligence because VEI guarantees it is never visually dumb.**

---

## APPENDIX A — SEL ALGORITHM TRANSCRIPTIONS (the ported cores, verbatim-adapted)

These are the production-verified SEL algorithms transcribed to the VEI context. The build implements these semantics exactly (variable names adapted; logic identical).

### A.1 The LD fingerprint (LD.js L19-28 → VEI ledger)

```typescript
// SEL original (JS):
//   const targetHash = target ? sha256(JSON.stringify(target)) : 'null';
//   const valueHash  = value !== undefined ? sha256(JSON.stringify(value)) : 'null';
//   const actionSignature = `${tool}:${targetHash}:${valueHash}`;
// VEI adaptation (args are the tool call's full args object):
function fingerprint(tool: string, args: unknown): string {
  const argsHash = createHash('sha256')
    .update(stableStringify(args))     // key-sorted stringify — same args → same hash
    .digest('hex')
    .slice(0, 16);                     // 64 bits is ample for loop detection
  return `${tool}:${argsHash}`;
}
```
`stableStringify` sorts object keys recursively — `{a:1,b:2}` and `{b:2,a:1}` produce the same hash (the agent's arg key order varies; the semantic call is what matters).

### A.2 The sliding window (LD.js L127-129 → VEI ledger trim)

```typescript
function trimWindow(ledger: VeiLedger): void {
  while (ledger.actions.length > 20) ledger.actions.shift();
  while (ledger.screenshotHashes.length > 3) ledger.screenshotHashes.shift();
}
```
Window size 20 = SEL's production value. BECAUSE: 20 actions ≈ 2-3 pipeline phases; large enough to see patterns, small enough that ancient history can't mask a current loop.

### A.3 The honest-report annotation (enforceAction.js L509-558 → VEI tool-result annotation)

SEL's honest report never claims unverified success. VEI's equivalent — the annotation appended to tool results:

```typescript
function annotateResult(tool: string, outcome: Outcome, baseResult: string): string {
  switch (outcome) {
    case 'changed':   return baseResult + `\n[VEI] confirmed: view changed after ${tool}.`;
    case 'unchanged': return baseResult + `\n[VEI] WARNING: ${tool} executed but the view did NOT change. ` +
                                    `The action had no measurable effect — do NOT proceed as if it worked.`;
    case 'failed':    return baseResult + `\n[VEI] ${tool} FAILED — see the tool error. Do not retry identical args.`;
    case 'unknown':   return baseResult + `\n[VEI] effect of ${tool} unverified (no view-state yet — call get_view once so I can confirm).`;
  }
}
```

### A.4 The settle table (enforceAction.js L470-476 → VEI profile)

```typescript
function settleMs(tool: string): number {
  if (tool.includes('navigate') || tool.includes('switch')) return 2000;
  if (tool.includes('draw'))                               return 1000;
  if (tool.includes('replay'))                             return 1000;
  if (tool.includes('click') || tool.includes('type'))     return 300;
  return 200;
}
```
BECAUSE (SEL): verification screenshots taken before the repaint settle are the #1 cause of false "no change" readings. VEI applies the same delays before computing outcomes.

---

## APPENDIX B — WORKED EXAMPLES (the math with real numbers)

### B.1 The affine cache (the coordinate intelligence, worked)

Scenario: DXY chart, Jul 6-10 week panned into view. The agent calls `find_price_y` twice:
```
find_price_y(101.00) → y = 400
find_price_y(100.50) → y = 520
```
VEI fits:
```
a = (520 − 400) / (100.50 − 101.00) = 120 / (−0.50) = −240 px per DXY point
b = 400 − (−240 × 101.00) = 400 + 24240 = 24640
priceToY(p) = round(−240·p + 24640)
```
Now the scaffold's rungs map WITHOUT further probes:
```
100.851 → y = round(−240 × 100.851 + 24640) = round(24640 − 24204.24) = 436
100.946 → y = round(24640 − 24227.04) = 413
101.144 → y = round(24640 − 24274.56) = 365
101.235 → y = round(24640 − 24296.40) = 344
```
Third sample `find_price_y(100.75) → y = 460`: predicted `round(24640 − 24180) = 460` ✓ residual 0 → calibrated, quality CONFIRMED. The cache now serves every rung until any pan/zoom (view hash change → invalidate → recalibrate with 2 fresh samples).

**Expected effect:** test-2's 203 probes → ~4-6 per chart (2 calibrate + 1 confirm + occasional recalibration after pans). At ~2s per MCP call, that's ~400s → ~10s of probe time per chart.

### B.2 The temporal anchor coverage (worked)

Pipeline context: weekStart 2026-07-06 → `weekStartMs = 1781827200000` (Mon Jul 6 00:00 UTC), `anchorMs = 1781827200000 + 4×86400000 + 17×3600000 = 1782234000000` (Fri Jul 10 17:00 ET).

Case A (test-3's failure): the agent's chart shows the live right edge — view-state `barStart = 1784304000000` (Jul 20), `barEnd = 1784500000000` (Jul 27).
```
coverage = |max(1784304000000, 1781827200000) − min(1784500000000, 1782234000000)| / (1782234000000 − 1781827200000)
         = |1784304000000 − 1782234000000| / 406800000
         = 2070000000 / 406800000 → the intervals don't overlap → coverage = 0
0 < 0.6 → D10 FIRES (BLOCK) with the re-capture recipe.
```

Case B (correct window): panned to the report week — view-state `barStart = 1781827200000` (Jul 6), `barEnd = 1782234000000` (Jul 10).
```
coverage = |1782234000000 − 1781827200000| / 406800000 = 1.0 → inert. Verdicts proceed.
```

### B.3 The loop-detection trace (test-4's zoom loop, replayed through VEI)

```
Action 1: canvas_zoom(out, 3)   → outcome: changed (view zoomed)        → no finding
Action 2: canvas_zoom(out, 3)   → outcome: changed                      → no finding
Action 3: canvas_zoom(out, 3)   → outcome: changed                      → D1 fires (3 identical signatures)
          BUT evidence.viewUnchanged = false (view IS changing)
          → composer downgrades to INFO: "[VEI] 3rd consecutive zoom — if you're
            navigating to a past week, zoom is the wrong verb: canvas_pan({time: ...})"
Action 4-8: agent ignores, keeps zooming (outcome: eventually unchanged at max zoom-out)
Action 6: canvas_zoom(out, 3)   → outcome: unchanged                    → D1 + D13 escalate:
          "[VEI:WRONG_VERB] canvas_zoom(out,3) ×6 — view at maximum zoom, cannot travel
           to Jul 6-10 → canvas_pan({time: 1781990400000}) → then get_view."
```

### B.4 The intervention ladder trace

```
Actions 1-10: 8 verified outcomes, 2 unknown → health 0.8 → L0/L1 (silent + annotations)
Actions 11-15: 4 failures (wrong chart symbol) → health drops to 0.55 → L2 unlocked
Action 16: another failure → health 0.47 → L3 unlocked
Action 17: D1 fires → delivered as L2 corrective directive (full 4-part)
Actions 18-27: 10 consecutive clean outcomes → hysteresis satisfied → back to L1
```

---

## APPENDIX C — INTEGRATION TEST VECTORS (the pre-deploy unit suite)

Each vector: synthetic action stream → expected findings (exact codes, exact fire points).

| # | Stream (compressed) | Expected |
|---|---|---|
| V1 | zoom(out,3) ×3, all outcomes changed | D1 at action 3, INFO-downgrade (viewUnchanged=false) |
| V2 | zoom(out,3) ×3, outcomes [changed, changed, unchanged] | D1 at 3 (WARN, viewUnchanged=true on 3rd) + D13 if past-week context |
| V3 | pan(bars:-50) ×3, all unchanged | D4 at 3 (not D1 — same args so D1 also fires; both reported, D4 first by evaluation order) |
| V4 | zoom, pan, zoom, pan, zoom, pan (alternating, views A,B,A,B,A,B) | D3 at action 6 (oscillation) |
| V5 | screenshot ×5, zero reads | D9 at action 5 |
| V6 | draw_rectangle(same args) ×2 | D11 at action 2 (INFO) |
| V7 | find_price_y ×8 in one view, affine calibrated at sample 2 | D12 at action 7 |
| V8 | 3 failures of tv_navigate, then 1 success | D2 at action 3; streak resets at action 4 (no finding after) |
| V9 | 5 non-productive actions (get_state, get_view, screenshot, find_price_y, list_drawings) | D8 at action 5 |
| V10 | view-state coverage 0.3 during perception phase | D10 (BLOCK) with correct coverage math in evidence |
| V11 | same stream as V10 but coverage 0.7 | nothing (boundary exactness) |
| V12 | click at (500,400), click at (510,405), click at (495,398) | D6 at action 3 (all within 20px) |
| V13 | 2 identical zooms + 1 different zoom | nothing (D1 requires 3 identical — boundary) |
| V14 | draw, draw, draw (3 DIFFERENT rectangles) | nothing (different signatures — legitimate) |
| V15 | full healthy flow: get_view, 2 probes (calibrate), pan, get_view (confirm), 10 draws with affine | zero findings (the clean-path proof — no false positives) |

**Determinism vector:** every stream run twice → byte-identical findings JSON.

---

*END OF SPEC — build proceeds per TASK-304 (VEI v4.4.0) after the v4.3 cleanup (dedup doctrine + reaction-validity design) lands.*

# PLUTUS v4.5.4 — THE ANCHOR DECISION MACHINE (ADM) — THE DETERMINISTIC E3 DECISION ENGINE — L2 SPEC

**Version:** 1.0 (CME grade) · **Date:** 2026-08-10 · **Status:** THE BUILD AUTHORITY — the next wave implements THIS spec.
**Purpose:** the deterministic decision engine that replicates the operator's anchor reasoning — the measured SL placement (the reaction-wick context + the zone-width scaling + the nesting depth + the RRR-headroom safety), the chained-entry zone-snap, the interior-reaction entries, the geometry-honest RRR (the degenerate-pair rejection) — the "0 dumb degenerate garbage" mandate made mechanical.
**Predecessor:** the W8B D-fixes (reasoning-chain.ts — the entry-precision 5/5) · the OUTCOME_ANALYSIS_AND_IMPROVEMENT_PLAN.md (the checkpoint v4.5.4_W8B_5OF5_ALMOST_GOLDEN) · the OVERHAUL SPEC V2 (the lexicon/MPSE law) · the E1+E2=E3 MACRO_CONTEXT · the ENGINEERING_SPEC (the D1-D10 contract layer).
**Baseline (operator-locked):** ANALYSIS_POINT_MS 1783317600000 · the frozen pair sl-lmv 912940832fac44bc + trade-dedup 33914c897e777540 · the golden Monday oracle (DXY L 100.945 / DXY S 101.140 / EU S 1.14395 / EU L 1.14110 / GU L 1.33330 at ≤3p) · the RRR floor 3.0 (the operator: "MINIMUM 3 RRR NOTHING LESS IS ACCEPTABLE") · the operator's 2026-08-10 directives (quoted in §0) · the golden week = the ACCEPTANCE, never the calibration set (the Phase-2 multi-week gate).

## TABLE OF CONTENTS

- §0 THE FUNDAMENTAL PROBLEM — the fixed-const SL class + the outcome-vs-precision gap
- §1 THE FAILURE INVENTORY — the evidence-grounded defects (the 1-pip SL, the 0.2p pierce, the chained chase, the edge-entry, the 16.8 degenerate pair, the fixed-const class)
- §2 THE FIX PLAN — THE ADM ENGINE (the MEASURE/ANCHOR/VERIFY state machine + the interfaces + the pseudocode) + the wiring points + the admission gate
- §3 THE IMPLEMENTATION ORDER — the waves with the disjoint file sets + the mechanical gates
- §4 THE TESTING STRATEGY — the unit battery + the replay fixtures + the visual-eval acceptance
- §5 THE ANTI-PATTERNS AGAINST FALSE SUCCESS — the ADM-specific traps
- §6 THE SUCCESS CRITERIA — the operator's acceptance bar, mechanical
- §7 THE COMPACTION-PROOF IMPLEMENTATION GUIDE
- §8 THE FINAL NOTES + THE OPEN QUESTIONS
- APPENDIX A — THE ZERO-TRUST AUDIT (the mandatory adversarial pass)

---

# §0 THE FUNDAMENTAL PROBLEM

**THE ROOT CLASS OF DEFECT, IN ONE SENTENCE:** the E3 anchor construction (the SL depth, the entry level, the TP target) is decided by FIXED PIP CONSTANTS (the "1.5p inside the close edge", the "3p outside the back edge", the "1.5p inside the next rung") and EDGE-BAND levels (the chained TP as the raw fill, the near-edge-as-entry) — while the operator's anchors are MEASURED CHART-CONTEXT READS (the reaction-wick territory, the zone-width scaling, the nesting depth, the receiving-zone interior) — so the machine's geometry differs from the operator's by 0.2-6.3 pips, and those pips are the difference between the TP hit and the SL stop (the visual-eval: 2/6 outcomes vs the 5/5 entry precision).

**WHAT THE SYSTEM DOES NOW (measured 2026-08-10 — the visual-eval + the golden gate):**
- The ENTRY PRECISION: 5/5 at ≤3p (the golden gate exit 0 ×3 — the machine emits the operator's levels within the tolerance).
- THE OUTCOME: 2/6 — the DXY SHORT +3.16R + the GU LONG +3.24R won; the EU SHORT (the operator's #1), the EU LONG (the #2), the DXY LONG, the GU SHORT lost on the real post-anchor bars. Net +2.40R.
- THE SL DIFFS (the losses): the EU SHORT's SL 1.14475 (the fixed 1.5p-inside) vs the operator's 1.14485 — the real peak 1.14480 pierced the machine's by 0.5p and missed the operator's by 0.5p — the operator's #1 WOULD HAVE WON. The EU LONG's SL 1.13985 pierced by 0.2p (the low 1.13983) on the Wednesday chop — the MFE 36p (the thesis right). The DXY LONG's chained fill 100.918 = 2.7p below the receiving zone's floor [100.945-101.063] (the operator's 100.945) — the momentum carried 6.3p through.
- THE RRR 16.8 PHANTOM (the GU SHORT): 77.3p reward ÷ 4.6p risk — a degenerate pair — the SL from a 1.6p sliver rung (the entry-rung rule) ÷ the TP from the zero-width degenerate rung LMV|GBP/USD|1.32850 [1.32673-1.32673] (the TP walk never applies the W6 gate). The operator's flat-2R read = the real structures.

**WHAT IT SHOULD DO (the operator's directives, verbatim — the ADM's laws):**
- "the machine needs this exact logical decision making process wired in so it can replicate my reasoning tokens and place intelligent SLs NOT a fixed const. the market will eat all fixed const hardcoded garbage alive"
- "deeper zones usually i move the SL slightly further in. I will not do 1 pip on a big zone and similar i wont do 3 pips on a tiny zone it needs to scale w/ the market conditions"
- "we need a decision making lexicon/engine/machine some sort of mechanism that deterministically makes intelligent trading decisions based on all the data ive given. should honestly work without model influence — all trading is like 95% deterministic"
- "safety > profit while making sure to maximize profits as much as possible without sacrificing safety. 3R is better than a loss... stupid losses are degenerate"
- "the SL depth becomes a MEASURED quantity, never a fixed pip"
- "literally all of these losses and stupid derailments comes from not verbatim following my exact instructions and data ive literally given dozens of times at this point"
- "what the actual FUCK is this? this was a flat 2R trade" (the RRR 16.8 — the degenerate-pair ban)

**THE ARCHITECTURAL CONSEQUENCE:** the E3 anchor construction becomes THE ANCHOR DECISION MACHINE (ADM) — a deterministic MPSE engine (the state machine IDLE → MEASURE → ANCHOR → VERIFY → EMIT|REJECT) whose every number is a MEASUREMENT of the E1/E2 data (the reaction wicks, the zone widths, the dispersions, the nesting, the receiving-zone bands) or a CANON QUOTE (the 3.0 floor). A fixed pip constant in the anchor path = the slop class this spec eliminates. The golden week is the ACCEPTANCE, never the calibration set (the Phase-2 multi-week gate).

# §1 THE FAILURE INVENTORY

**Every failure below is code-verified + bar-verified 2026-08-10 (the golden gate + the visual-eval simulation + the failure store).**

| # | The failure | What happened (the evidence) | The root cause | Why it's broken | The severity |
|---|---|---|---|---|---|
| F-1 | **The fixed 1.5p-inside SL** | the EU SHORT: the machine's SL 1.14475 vs the operator's 1.14485 — the real peak Mon 23:00 H 1.14480 — the machine's SL pierced by 0.5p, the operator's survived → the operator's #1 wins, the machine's loses (reasoning-chain.ts — the D-4a zone-anchored SL's fixed 1.5×pip buffer) | the SL depth = a FIXED PIP constant — ignored the zone's measured reaction-wick territory (the Jul 2/3 wicks' max high ≈ 1.14480) | the market's wick volatility is a MEASURED quantity of the zone's battle history — a constant can't see it — "the market will eat all fixed const hardcoded garbage alive" | CRITICAL |
| F-2 | **The thin-zone 1.5p-inside SL** | the EU LONG: the SL 1.13985 pierced by 0.2p (the low 1.13983) on the Wednesday range-chop — the MFE 36.0p (the price rallied 72% of the TP distance — the thesis was RIGHT — the SL got caught in the wick zone) | the thin-zone branch (the "3p-outside overshoots the next step → 1.5p inside it") placed the SL below the demand's floor 1.14004 INSIDE the range's actual low territory (~1.1390) — the fixed 1.5p again, on a collapsed 1-pip rung | the SL must respect the DEMAND's measured DEFENDED EXTREME (the fortress's reaction lows), never 1.5p inside a collapsed rung | CRITICAL |
| F-3 | **The chained-entry chase** | the DXY LONG: the chained fill 100.918 = the SHORT's exact TP — 2.7p BELOW the receiving demand zone's floor [100.945-101.063] — the momentum carried 6.3p through (the MAE 8.0p vs the 6.3p risk) — the SL hit one hour after the trigger (Mon 17:00 → 18:00) — the operator's level 100.945 (the zone's interior) | the chained entry = the raw priorTp — the operator's chaining levels ALWAYS land INSIDE the receiving structure (the EU #2's E 1.14110 = the fortress's interior) — the raw TP can fall outside the band | the fill must SNAP to the receiving zone — clamp(priorTp, zone.floor, zone.ceiling) — "literally all of these losses come from not verbatim following my exact instructions" | CRITICAL |
| F-4 | **The band-edge entries** | the GU LONG: the entry 1.33343 = the rung [1.33306-1.33343]'s TOP edge — the price fell 5.7p (the MAE — within 1p of the SL!) before the recovery — the operator's E 1.33330 = the rung's INTERIOR (the modal reaction level) | the LONG entries resolve to the band's extreme edge (the near edge from above) — the operator's entries sit at the structure's REACTION level (the interior / the modal) | the entry must resolve to the structure's measured reaction level (the LMV's modal distribution), never the band's extreme | HIGH |
| F-5 | **The RRR 16.8 degenerate pair** | the GU SHORT: E 1.33623 / SL 1.33669 (4.6p risk — the entry-rung rule on a 1.6p sliver) / TP 1.32850 (77.3p — the zero-width degenerate rung [1.32673-1.32673], its band 21p below its id) — RRR 16.8 — the operator: "this was a flat 2R trade... no way in HELL there is anything remotely close to 17x" | the SL from the sliver-rung math + the TP walk's admission of the degenerate rung (the W6 gate exists in the PICKER, the TP WALK never applies it) — a DOUBLE-DEGENERATE pair | an RRR is only a MEASUREMENT when BOTH halves come from real structures — a degenerate pair = the DEGENERATE_PAIR_REJECTED verdict, never an emission | CRITICAL |
| F-6 | **The fixed-const class itself** | the D-4a/D-4b/D-4c rules (1.5p-inside / 3p-outside / 1.5p-inside-the-next-rung) — every one a bare pip constant in the anchor path (reasoning-chain.ts + mirror.ts's ladder branches) | the slop class the overhaul bans: "EVERYTHING should now be tangible Lexicon filters + MPSE engines with 0 dumb degenerate garbage anywhere" — the constants survived the W1-W7 in the SL/entry paths | the constants are the derailment seed — each one ignores a measurable chart context | CRITICAL |
| F-7 | **The outcome-vs-precision gap** | the 5/5 entry precision vs the 2/6 outcome — the acceptance measured ONLY the emitted E vs the oracle — the SL/TP geometry + the real-bar outcomes were never the gate | the golden gate's convergence table measures the ENTRY precision only — the visual-eval outcome simulation is the missing acceptance | the engine's acceptance = the OUTCOME (the visual-eval win rate + the R), not the precision alone — an engine that hits the entries but loses the outcomes is the derailment the outcome gate catches | HIGH |

**THE INTERACTION (why the losses are an EMERGENT result):** the fixed-const SL (F-1/F-2) + the chained chase (F-3) + the edge entries (F-4) + the degenerate pair (F-5) — each loss = one or more of these on the real bars. The EU SHORT = F-1 alone (the 1-pip SL). The EU LONG = F-2 alone (the 0.2p pierce). The DXY LONG = F-3 alone (the chained chase). The GU LONG = F-4 (the near-miss). The GU SHORT = F-5 (the phantom). THE FIX PLAN (§2) addresses the CLASS — one engine, all five.

# §2 THE FIX PLAN — THE ANCHOR DECISION MACHINE

## 2.0 THE DESIGN PRINCIPLES (the operator's mapping — the lexicon/MPSE law)

**THE OPERATOR'S MAPPING (verbatim, the LEXICON_SPEC):** "zones/candles = regex · pressure mechanics = semantic intent · shape chains = semantically intelligent algorithmic systems · E1/E2/E3 pipeline = Trident deep planning L2 · trade setups = tool outputs" + "all trading is like 95% deterministic... a properly engineered algorithm with the correct logic can outperform an LLM".

**THE FIVE LAWS THE ADM EXECUTES:**

**LAW-1 — THE MEASUREMENT IS THE DECISION'S ONLY INPUT.** Every anchor number (the SL depth, the entry level, the TP target) is the OUTPUT of a measurement over the E1/E2 data — the reaction events, the zone widths, the wick dispersions, the nesting structures, the receiving bands. A fixed pip constant in the anchor path = the SLOP class. A measurement without a source (no reaction events) = the honest absence + the loud log — NEVER a constant dressed as a measurement.

**LAW-2 — THE ZONE-WIDTH SCALING (the operator verbatim):** "deeper zones usually i move the SL slightly further in. I will not do 1 pip on a big zone and similar i wont do 3 pips on a tiny zone it needs to scale w/ the market conditions." The SL depth scales with the zone's measured width × a battle-adaptive ratio (the virgin zone = the thin wick zone; the battle-tested = the proven wider territory).

**LAW-3 — THE REACTION-WICK TERRITORY (the operator's read #1):** the SL sits BEYOND the measured reaction-wick extreme (the max high pushed into a supply / the min low pushed into a demand within the recency window) + ONE measured dispersion (the median |touch − edge|). The operator's EU #1 SL 1.14485 = the measured 1.14480 wick territory + the buffer.

**LAW-4 — THE SAFETY ENVELOPE (the operator verbatim):** "safety > profit while making sure to maximize profits as much as possible without sacrificing safety. 3R is better than a loss... stupid losses are degenerate." The RRR floor 3.0 is the hard gate; the SL depth is capped by the RRR headroom (the deepest wick-surviving placement that still clears the floor); the cap NEVER pushes the SL inside the measured wick territory (if the geometry breaks, the ENTRY is the problem).

**LAW-5 — THE RECEIVING-ZONE INTERIOR (the operator verbatim):** "Set E at the TP level of trade #1" — the chained entry SNAPS into the receiving zone's band (clamp) — "literally all of these losses and stupid derailments comes from not verbatim following my exact instructions" — and the entries resolve to the structure's measured reaction level (the interior / the modal), never the band's extreme edge.

**THE MPSE STRUCTURES THE ADM DEPLOYS (the operator's "MPSE functions is a great idea"):**

| The MPSE structure | The engine | Where |
|---|---|---|
| The state machine | IDLE → MEASURE → ANCHOR → VERIFY → EMIT\|REJECT (the INCONCLUSIVE fail-state, never a fabricated PASS) | the ADM module |
| The total function | `anchorTrade(input) → {E, SL, TP, RRR, anchors, verdict}` — the anchors as a pure function of the E1/E2 data + the analysis point | the ADM module |
| The matrix columns | the per-zone feature vector: {width, battleCount, wickExtreme, wickDispersion, nestingDepth, defendedExtreme, closeEdge} — the MEASURE's output columns | the measure functions |
| The order-theoretic ranking | the SL depth = max(wickPlacement, widthScale, nestingDepth) capped by the RRR headroom — the deepest-wick-surviving within the envelope | the anchor functions |
| The invariant | the rung-validity gate (the W6) at EVERY TP-walk candidate — a zero-width geometry never admits | the TP walk |
| The piecewise-total | the ENTRY resolution: the chained-snap (clamp) OR the interior-reaction level — the total function over the receiving zone | the anchor functions |

**THE CONTRACT EVERY COMPONENT MUST SATISFY (the E3-NEVER + the E2-designates law, unchanged):** E2 emits ZONE ANCHORS ONLY; E3 resolves the prices from the zones; every anchor traces to an E1 zone id + an E2 projection id (assertProjectionContract); the ADM never overrides the E1/E2 data — it MEASURES it. A decision without an MPSE triplet ({Pattern, State, Evidence: node+file:line}) = the INCONCLUSIVE state, never an emission.

## 2.1 THE ADM ARCHITECTURE (the module contract)

**THE MODULE:** `src/mdve/anchor-decision-machine.ts` (NEW — the deterministic core, no LLM hooks, no imports from the shadow).

**THE INTERFACE CONTRACT:**

```typescript
// THE ADM — the deterministic E3 anchor engine (the operator 2026-08-10)
import type { ChartModel, ZoneModel } from './types.js';
import type { LmvTable, LqzZoneMatrix } from './lmv.js';
import type { ShapeDayZone } from './shape-cascade.js';
import type { OperativeZone, Direction, ProjectionAnchor } from './reasoning-chain.js';

export interface AdmInput {
  model: ChartModel;            // the E1 map (zones + lmv + ladder + reaction events)
  lmvTable: LmvTable;
  pair: string;
  pip: number;
  analysisPointMs: number;      // the LOCKED temporal anchor (getAnalysisPointMs)
  direction: Direction;
  operativeZone: OperativeZone; // the E2-resolved zone the trade reasons over
  dayOpenSpot: number;
  priorTp?: number;             // the chained TP (Law 27 — the TP-of-N = entry-of-N+1)
  shapeDay?: ShapeDayZone;      // the E2 day (the TP's opposing-zone resolution)
  atr1hPips: number;
}

export interface Measurement {
  value: number;                // the measured quantity (pips — the pair scale)
  evidence: string[];           // the source strings (the reaction ids, the timestamps)
  source: 'reaction-wicks' | 'zone-width' | 'nesting' | 'defended-extreme' | 'dispersion' | 'absent';
  present: boolean;             // FALSE = the honest absence (the loud-fail path)
}

export interface AdmResult {
  entry: number; entryMethod: string; entryRungId?: string;
  sl: number; slMethod: string; slRungId?: string;
  tp: number; tpMethod: string; tpRungId?: string;
  rrr: number;
  anchors: ProjectionAnchor[];
  verdict: 'EMIT' | 'REJECT';
  rejectReason?: 'DEGENERATE_PAIR_REJECTED' | 'RRR_BELOW_FLOOR' | 'NO_STRUCTURAL_TP' | 'INCONCLUSIVE';
  rejectEvidence?: string[];
  measurements: { slDepth: Measurement; entryLevel: Measurement; tpLevel: Measurement };
  triplets: Array<{ pattern: string; state: string; evidence: string }>;  // the MPSE law
}

export function anchorTrade(input: AdmInput): AdmResult;   // THE total function
```

**THE STATE MACHINE (the decision flow — the INCONCLUSIVE fail-state):**

```
IDLE ── resolve the operative zone + the direction ──> MEASURE
MEASURE ── m1..m5 over the E1 data (each returns {value, evidence, present}) ──> ANCHOR
   (a measurement with present:false → the honest fallback chain + the LOUD log — the
    INCONCLUSIVE state if EVERY source is absent AND the width scale is unmeasurable)
ANCHOR ── the SL depth = max(wick, widthScale, nesting) capped by the RRR headroom
        ── the ENTRY = the chained-snap OR the interior-reaction level
        ── the TP = the W6-gated opposing-wall internal-LQZ near edge ──> VERIFY
VERIFY ── the RRR floor 3.0 · the geometry honesty (a degenerate pair → REJECT)
       ── the E3-NEVER contract (the anchor traces) ──> EMIT | REJECT(verdict)
REJECT ── the verdict + the evidence recorded (the failure store) — NEVER a fabricated substitute
```

**THE ERROR RULES:**
- The analysis point MUST be locked (getAnalysisPointMs — the temporal engine's one-way lock) — an unlocked run THROWS (the W1's temporal law).
- A measurement with no source (no reaction events in the window) → `present:false` + the fallback chain + the loud `MEASURE_NO_EVIDENCE` record — the SL falls to the width-scale + the documented minimum floor — NEVER a silent constant.
- The median (not the mean) for the dispersion — a single gigantic sweep wick cannot blow the SL out (the anti-outlier rule).
- The RRR floor 3.0 (the operator's "MINIMUM 3 RRR NOTHING LESS IS ACCEPTABLE") — a REJECT with the RRR_BELOW_FLOOR verdict + the evidence.
- The geometry honesty: the SL from a sliver (< the pair's minimum-viable defense) OR the TP from a degenerate rung → the DEGENERATE_PAIR_REJECTED verdict — NEVER an emission.
- The determinism: the ADM is a pure function — the same input → the identical result (the golden gate's ×2 check).

## 2.2 THE MEASURE FUNCTIONS (m1-m5 — the chart-context reads)

**THE FIVE MEASUREMENTS — every one a deterministic function over the E1 data (the pseudocode — build-agent executable):**

```typescript
// THE RECENCY WINDOW (the temporal lock — the D-3b fix's law): the recency
// window is anchored to the LOCKED analysis point, NEVER the run's limitMs.
const RECENCY_WINDOW_MS = 3 * 86_400_000; // the operator's "within 3 trading days" (the M-9 window)
const windowStart = analysisPointMs - RECENCY_WINDOW_MS;

// m1 — THE REACTION-WICK EXTREME (the operator's battle-history read):
//   the deepest wick the price pushed INTO the zone within the window.
//   The reactionEvents carry the touch prices (the zone-pressure data) — the
//   SHORT side: the max touch HIGH into a SUPPLY; the LONG side: the min
//   touch LOW into a DEMAND. NO events in the window → present:false.
function measureReactionWickExtreme(zone, direction, windowStart): Measurement {
  const events = zone.sourceZone?.reactionEvents ?? [];
  const recent = events.filter((ev) => ev.lastTouchMs >= windowStart);
  if (recent.length === 0) {
    return { value: 0, evidence: ['no reaction events in the recency window'],
             source: 'reaction-wicks', present: false };
  }
  const extreme = direction === 'SHORT'
    ? Math.max(...recent.map((ev) => ev.touchHigh ?? ev.lastTouchPrice))
    : Math.min(...recent.map((ev) => ev.touchLow ?? ev.lastTouchPrice));
  return { value: extreme, evidence: recent.map((ev) => `reaction ${ev.lastTouchMs} @ ${extreme}`),
           source: 'reaction-wicks', present: true };
}
// THE EU SHORT after m1: the Jul 2/3 reactions' max high ≈ 1.14480 —
// the operator's "pierces through w/ a wick" as a number.

// m2 — THE WICK DISPERSION (the adaptive buffer — the anti-outlier MEDIAN):
//   the median |touch − zoneCloseEdge| of the recent reactions — the SL sits
//   ONE dispersion beyond the extreme. The median resists the single giant
//   sweep wick (the anti-outlier rule).
function measureWickDispersion(zone, direction, windowStart): Measurement {
  const events = (zone.sourceZone?.reactionEvents ?? []).filter((ev) => ev.lastTouchMs >= windowStart);
  if (events.length === 0) return { value: 0, evidence: ['no reactions'], source: 'dispersion', present: false };
  const closeEdge = direction === 'SHORT' ? zone.floor : zone.ceiling;
  const touches = events.map((ev) => Math.abs(ev.lastTouchPrice - closeEdge));
  touches.sort((a, b) => a - b);
  const median = touches[Math.floor(touches.length / 2)];
  return { value: median, evidence: [`median |touch−edge| = ${median} over ${touches.length} reactions`],
           source: 'dispersion', present: true };
}

// m3 — THE ZONE-WIDTH SCALE (the operator's scaling law — "no 1p on a big
//   zone, no 3p on a tiny zone"): the SL depth scales with the zone's width ×
//   a battle-adaptive ratio. THE RATIO derives from the pair's MEASURED
//   dispersion distribution (the median dispersion ÷ the median width across
//   the map's zones — the anti-fitting: the golden week is never the
//   calibration set) — the virgin zone (0-1 battles) = the THIN wick zone
//   (the ratio × the virgin factor); the battle-tested (2+) = the proven
//   territory (the ratio × the tested factor). The ratio is CLAMPED to the
//   pair's measured dispersion percentiles — never a bare constant.
function measureZoneWidthScale(zone, model, pair, atr1hPips): Measurement {
  const width = zone.ceiling - zone.floor;
  const battles = zone.reactionCount ?? zone.sourceZone?.reactionEvents?.length ?? 0;
  // THE MAP-DERIVED RATIO (the anti-fitting): the median of the pair's zones'
  //   dispersion-to-width fractions (the measured market norm).
  const norms = model.zones
    .map((z) => (z.reactionEvents?.length ?? 0) > 0
      ? (medianWickOf(z) / Math.max(z.top - z.bottom, 1e-9))
      : null)
    .filter((v): v is number => v !== null);
  const baseRatio = norms.length > 0 ? medianOf(norms) : 0.2; // the measured norm / the documented floor
  const battleFactor = battles >= 2 ? 1.6 : 1.0;               // the battle-tested = the wider territory
  const scalePips = width * baseRatio * battleFactor;
  return { value: scalePips, evidence: [`width ${width/pip}p × ratio ${(baseRatio*battleFactor).toFixed(2)}`],
           source: 'zone-width', present: true };
}
// The EU SHORT after m3: the ~7-11p zone × the measured ratio ≈ 2.5-3.5p —
// "deeper zones → the SL slightly further in".

// m4 — THE NESTING DEPTH (the operator's "nested supply within a 1H refined
//   4H supply OB"): when the zone is nested (parent / nestedWithin), the SL
//   must survive the PARENT structure's wick territory — the parent's close
//   edge + the parent's measured reaction-wick extreme + the dispersion.
function measureNestingDepth(zone, model, windowStart): Measurement {
  const parent = zone.sourceZone?.parent;
  if (!parent && !zone.sourceZone?.nestedWithin) {
    return { value: 0, evidence: ['no nesting context'], source: 'nesting', present: false };
  }
  const parentZone = model.zones.find((z) => z.id === parent?.id)
    ?? (zone.sourceZone?.nestedWithin ? nearestParentOf(zone, model) : null);
  if (!parentZone) return { value: 0, evidence: ['parent unresolvable'], source: 'nesting', present: false };
  const parentWick = measureReactionWickExtreme(
    zoneToOperative(parentZone), 'SHORT', windowStart);  // the parent's intrusion extreme
  const depth = (parentZone.top - (direction === 'SHORT' ? parentZone.top - parentWick.value : parentWick.value));
  return { value: Math.max(depth, 0), evidence: [`parent ${parentZone.id} wick ${parentWick.value}`],
           source: 'nesting', present: parentWick.present };
}

// m5 — THE DEFENDED EXTREME (the EU LONG's class — the fortress's actual
//   defended low): the min reaction LOW (the LONG side) / the max reaction
//   HIGH (the SHORT side) across the zone's FULL reaction history — the SL
//   must sit below/above the level the price has ACTUALLY been defended at.
function measureDefendedExtreme(zone, direction): Measurement {
  const events = zone.sourceZone?.reactionEvents ?? [];
  if (events.length === 0) return { value: 0, evidence: ['no reactions'], source: 'defended-extreme', present: false };
  const extreme = direction === 'SHORT'
    ? Math.max(...events.map((ev) => ev.touchHigh ?? ev.lastTouchPrice))
    : Math.min(...events.map((ev) => ev.touchLow ?? ev.lastTouchPrice));
  return { value: extreme, evidence: [`defended extreme ${extreme} over ${events.length} reactions`],
           source: 'defended-extreme', present: true };
}
```

## 2.3 THE ANCHOR FUNCTIONS (the SL / the ENTRY / the TP decisions)

**THE THREE ANCHOR DECISIONS — each a deterministic resolution (the pseudocode):**

```typescript
// THE SL DECISION (the F-1/F-2 fix — the fixed 1.5p/3p constants DIE):
//   depth = max(wickPlacement, widthScale, nestingDepth, defendedDepth)
//   where wickPlacement = (wickExtreme − closeEdge) + dispersion
//   then CAPPED by the RRR headroom: the deepest wick-surviving placement
//   that still clears the 3.0 floor. THE CAP NEVER PUSHES THE SL INSIDE the
//   measured wick territory — when the wick placement breaks the floor, the
//   ENTRY is the problem (the interior-reaction entry fixes the geometry).
function resolveSlDepth(input: AdmInput): { depthPips: number; method: string; measurements: ... } {
  const m1 = measureReactionWickExtreme(input.operativeZone, input.direction, windowStart);
  const m2 = measureWickDispersion(input.operativeZone, input.direction, windowStart);
  const m3 = measureZoneWidthScale(input.operativeZone, input.model, input.pair, input.atr1hPips);
  const m4 = measureNestingDepth(input.operativeZone, input.model, windowStart);
  const m5 = measureDefendedExtreme(input.operativeZone, input.direction);
  const closeEdge = input.direction === 'SHORT' ? input.operativeZone.floor : input.operativeZone.ceiling;
  const wickPlacement = m1.present
    ? Math.abs(m1.value - closeEdge) + m2.value
    : 0;
  const defendedPlacement = m5.present
    ? Math.abs(m5.value - closeEdge)
    : 0;
  const depth = Math.max(wickPlacement, m3.value, m4.value, defendedPlacement);
  // THE RRR-HEADROOM CAP (the safety envelope — the operator: "3R is better
  // than a loss"): the depth must leave the reward/risk ≥ 3.0 — the cap only
  // REJECTS the placement that would break the floor; it never drives it.
  const tpPrelim = resolveTpPrelim(input);                 // §2.4 — the W6-gated walk
  const reward = Math.abs(tpPrelim - input.dayOpenSpot);   // the reward proxy
  const maxDepthForRrr = reward / 3.0;
  const capped = Math.min(depth, maxDepthForRrr);
  if (capped < wickPlacement - 1e-9) {
    // the wick placement breaks the floor → the ENTRY is the problem (the
    // interior-reaction entry) — the geometry-honesty verdict, never a
    // forced tight SL inside the wick territory
    return { depthPips: capped, method: 'rrr-capped (wick-territory conflict — entry-lever)',
             verdict: 'ENTRY_LEVER_REQUIRED' };
  }
  return { depthPips: capped, method: `measured (wick ${wickPlacement.toFixed(1)}p / width ${m3.value.toFixed(1)}p / nesting ${m4.value.toFixed(1)}p / defended ${defendedPlacement.toFixed(1)}p)` };
}
// THE SL LEVEL: SHORT → zone.floor + depthPips (the SL above the entry);
//              LONG  → zone.ceiling − depthPips (the SL below the entry).

// THE ENTRY DECISION (the F-3/F-4 fix):
//   1. THE CHAINED-SNAP: when a priorTp exists, the fill = clamp(priorTp,
//      zone.floor, zone.ceiling) — the operator's chaining levels ALWAYS
//      land INSIDE the receiving structure (the EU #2's E 1.14110 = the
//      fortress's interior; the DXY LONG's E → 100.945 = the operator's
//      exact golden). The raw priorTp OUTSIDE the band = the chase (F-3).
//   2. THE INTERIOR-REACTION ENTRY (no priorTp — the day's first leg):
//      the LONG entries resolve to the structure's measured reaction level —
//      the internal LQZ rung's near edge OR the zone's MODAL reaction level
//      (the LMV's measured distribution) — NEVER the band's extreme edge
//      (the GU LONG's E → 1.33330 = the rung's interior — the operator's
//      exact). The SHORT entries keep the shield-near-edge semantics (the
//      EU #1's E 1.14390 = the floor-shield's bottom — the first contact —
//      the measured reaction level of the approach side).
function resolveEntry(input: AdmInput, priorTp?: number): { entry: number; method: string } {
  if (priorTp && priorTp > 0) {
    const snapped = Math.min(Math.max(priorTp, input.operativeZone.floor), input.operativeZone.ceiling);
    return { entry: snapped, method: snapped === priorTp
      ? 'chained (Law 27 — the TP-of-N = entry-of-N+1)'
      : 'chained-snapped (the TP outside the receiving band → clamped into the zone)' };
  }
  if (input.direction === 'LONG') {
    const interior = interiorReactionLevel(input.operativeZone, input.lmvTable);
    return { entry: interior, method: 'interior-reaction (the structure\'s measured modal level)' };
  }
  const shield = shieldNearEdge(input.operativeZone, input.lmvTable, 'SUPPLY');
  return { entry: shield, method: 'shield-near-edge (the first contact — the operator\'s EU #1)' };
}

// THE TP DECISION (the F-5 fix — the W6 gate at EVERY candidate):
//   the first DEFENDED opposing wall's internal-LQZ near edge — the walk
//   applies the rung-validity gate (isDegenerateRung — the W6 predicate:
//   width > 0.5p AND the id-center consistency) to EVERY candidate — a
//   zero-width geometry (the GU's 1.32850 [1.32673-1.32673]) is REJECTED at
//   admission, the walk continues to the next defended wall. NO candidate →
//   null → the NO_STRUCTURAL_TP verdict (the D3 law — the trade does not
//   exist, never a fabricated target).
function resolveTp(input: AdmInput): { tp: number; method: string; rungId?: string } | null {
  const candidates = opposingDefendedWalls(input.model, input.operativeZone, input.direction)
    .filter((c) => c.kind === 'zone' ? true : !isDegenerateRung(c.rung, input.pair));  // THE W6 GATE
  if (candidates.length === 0) return null;
  const wall = candidates[0];
  return internalLqzNearEdge(wall, input.direction, input.lmvTable);  // the I-8 pathCap
}
```

## 2.4 THE VERIFY GATE (the geometry honesty + the RRR floor)

**THE VERIFY GATE — the honesty checks before the emission (the pseudocode):**

```typescript
function verify(input: AdmInput, anchors: {E, SL, TP}, measurements): AdmResult['verdict'] {
  const risk = Math.abs(anchors.E - anchors.SL) / input.pip;
  const reward = Math.abs(anchors.TP - anchors.E) / input.pip;
  const rrr = risk > 0 ? reward / risk : 0;

  // 1. THE RRR FLOOR (the operator: "MINIMUM 3 RRR NOTHING LESS IS ACCEPTABLE"):
  if (rrr < 3.0 - 1e-9) return 'RRR_BELOW_FLOOR';

  // 2. THE GEOMETRY HONESTY (the F-5 fix — the RRR 16.8 phantom's gate):
  //    an RRR whose SL comes from a sliver or whose TP comes from a
  //    degenerate rung is NOT a measurement — the DEGENERATE_PAIR_REJECTED.
  const slDefense = slDefenseWidth(anchors.E, anchors.SL, input);   // the measured defense span
  const slFromSliver = slDefense < MIN_VIABLE_DEFENSE_PIPS;        // the pair-scale floor (the measured
                                                                   // dispersion percentile — never a
                                                                   // bare magic number)
  const tpDegenerate = tpFromDegenerateRung(anchors.TP, input);    // the W6-gated walk's rejection evidence
  if (slFromSliver || tpDegenerate) return 'DEGENERATE_PAIR_REJECTED';

  // 3. THE E3-NEVER CONTRACT (the anchors trace to the E1 zone + the E2 projection):
  if (!anchorsTrace(input, anchors)) return 'INCONCLUSIVE';

  return 'EMIT';
}
// THE GU SHORT after verify: the SL 4.6p (the sliver) OR the TP 1.32850 (the
//   degenerate rung) → DEGENERATE_PAIR_REJECTED — the operator's flat-2R
//   rejection, mechanically reproduced. Under the ADM's SL/TP resolutions the
//   GU SHORT resolves to the REAL defense ÷ the REAL demand ≈ 2R → the RRR
//   floor rejects it — the operator's exact verdict.

// THE MPSE TRIPLETS (the ISE law — no triplet = no decision = the INCONCLUSIVE
//   state, never a PASS): every emitted result carries the per-anchor
//   {Pattern, State, Evidence: node+file:line} triplets — the wave audit
//   re-checks the triplets against the code (a finding without a triplet = a
//   FLAWED finding).
```

**THE ADM RESULT'S INTEGRATION (the caller's contract):** the ADM returns the complete AdmResult — the reasoning-chain's deterministicAnchors DELEGATES to it (the F-6 wiring): the SL = the ADM's measured placement, the entry = the ADM's snap/interior, the TP = the ADM's W6-gated walk. The lane emission consumes the verdict: EMIT → the projection proceeds; REJECT → the lane records the verdict (the failure store) and the lane is skipped — the D3 law's honest absence, never a fabricated substitute. The shadow agent's refinement operates WITHIN the ADM's envelope (the SL never inside the measured wick territory, the RRR floor never lowered, the degenerate pair never force-emitted — the LLM-envelope firewall).

## 2.5 THE WIRING (deterministicAnchors + refineProjection + the lanes)

**THE WIRING — the reasoning-chain's anchor construction DELEGATES to the ADM (the fixed constants DIE at their sites):**

**2.5.1 deterministicAnchors (reasoning-chain.ts — the D-4a/D-4b/D-4c sites, ~:1120-1170):**
- BEFORE: the fixed 1.5p-inside/3p-outside/1.5p-inside-the-next-rung ladder + the entry-rung rules + the zone-anchored 1.5p.
- AFTER: `const adm = anchorTrade({...});` — the SL = adm.sl, the entry = adm.entry, the TP = adm.tp, the anchors = adm.anchors. The verdict REJECT → the caller records the rejection and returns null (the D3 law). The ADM's measurements feed the anchor methods' strings (the trace honesty).

**2.5.2 refineProjection (reasoning-chain.ts — the D-4b site, ~:1440):**
- BEFORE: the refine loop's SL recompute (the ladder-first + the mirror fallback — the fixed rules).
- AFTER: the refine's SL recompute DELEGATES to the ADM's resolveSlDepth (the same measured placement) — the refine loop NEVER re-introduces the fixed constants. The TP extension (the zrExt) uses the ADM's W6-gated walk.

**2.5.3 The lane admission (buildReasoningChain — the F-5 gate):**
- The lane's projection assembly checks the ADM verdict: a DEGENERATE_PAIR_REJECTED / RRR_BELOW_FLOOR / NO_STRUCTURAL_TP → the lane is SKIPPED with the verdict recorded (the failure store — the loud-fail law) — the GU SHORT class never emits.

**2.5.4 The chained entry (the lanes' priorTp flow):**
- The priorTp passes to the ADM's resolveEntry → the chained-snap (clamp) — the DXY LONG's fill → 100.945 (the operator's exact golden).

**2.5.5 The shadow-envelope firewall (shadow-agent.ts's anchor refinement):**
- The shadow's anchor output is validated against the ADM's envelope: the SL outside the measured wick territory, the RRR < 3.0, or a degenerate pair → the SHADOW_FLAG rejection + the deterministic ADM result stands (the operator: "should honestly work without model influence").

**THE DATA FLOW (the complete path):**

```
E1 (the models) → E2 (the designation) → the lanes (the direction + the operative zone)
  → THE ADM (anchorTrade — the MEASURE/ANCHOR/VERIFY)
      → EMIT: the anchors {E, SL, TP, RRR} → the projection assembly → the golden gate
      → REJECT: the verdict + the evidence → the failure store → the lane skipped
  → the visual-eval OUTCOME simulation (the acceptance — the real-bar win rate)
```

## 2.6 THE TP-WALK W6 GATE (mirror.ts computeLmvTP — the degenerate admission)

**THE DEFECT (the F-5 root — code-verified):** mirror.ts's computeLmvTP (the ZR-3.3 walk, ~:2808-2964) admits EVERY opposing rung candidate — the GU SHORT's TP 1.32850 anchored to the ZERO-WIDTH degenerate rung `LMV|GBP/USD|1.32850 [1.32673-1.32673]` (its band 21p below its id) — the W6 rung-validity gate (mirror.ts:1428 isValidRung) exists in the PICKER (selectPairNativeZone :1559-1568) but the TP WALK never applies it.

**THE FIX:** the walk's candidate admission runs the SAME W6 predicate at EVERY candidate — a zero-width / sub-floor-width / id-center-drifting geometry is REJECTED at admission with the DEGENERATE_RUNG_REJECTED record + the walk continues to the next defended wall:

```typescript
// mirror.ts computeLmvTP — the candidate admission (the W6 gate extension):
const candidates = model.lmv.table.filter((z) => {
  if (z.side !== wantSide || centerOf(z) > entry === (direction === 'SHORT')) return false;
  if (!isValidRung(z, lmvAnchorId('LMV', z), pip)) {   // THE W6 GATE — the picker's predicate
    console.log('[DEGENERATE_RUNG_REJECTED]', { id: lmvAnchorId('LMV', z), band: [z.bottom, z.top], walk: 'computeLmvTP' });
    return false;
  }
  return true;
});
// THE GU SHORT after the fix: the 1.32850 [1.32673-1.32673] (width 0 ≤ the
//   0.5p floor) REJECTED at admission → the walk continues → the REAL
//   demand's near edge → the ~2R geometry → the RRR floor rejects the trade
//   (the operator's exact verdict) — the 16.8 phantom is structurally
//   impossible.
```

**THE CONSTANT:** the W6's MIN_RUNG_WIDTH_PIPS 0.5 + the ID_CENTER_TOLERANCE_PIPS 2 (mirror.ts — the CANON, unchanged, imported — never re-declared).

# §3 THE IMPLEMENTATION ORDER (the waves + the gates)

**THE WAVES — one builder per disjoint file set, each with the mechanical done-when gate:**

| The wave | The file set (disjoint) | The exact change | The done-when gate |
|---|---|---|---|
| **W-ADM-1** | `src/mdve/anchor-decision-machine.ts` (NEW) | the ADM module: the AdmInput/Measurement/AdmResult contracts + the state machine + the measure functions (m1-m5: the reaction-wick extreme, the dispersion median, the zone-width scale with the MAP-derived ratio, the nesting depth, the defended extreme) + the anchor functions (resolveSlDepth with the RRR-headroom cap, resolveEntry with the chained-snap + the interior-reaction level, resolveTp with the W6-gated walk) + the verify gate (the RRR floor, the geometry honesty, the E3-NEVER contract) + the MPSE triplets | tsc 0 · the ADM's own unit battery (the known-answer tests — the EU SHORT's SL 1.14485, the EU LONG's defended-low SL, the GU SHORT's DEGENERATE_PAIR_REJECTED, the DXY LONG's chained-snap 100.945, the GU LONG's interior 1.33330) · ZERO bare magic constants (the audit grep: every number has the provenance comment) |
| **W-ADM-2** | `src/mdve/reasoning-chain.ts` (the deterministicAnchors + refineProjection + the lane admission + the priorTp flow) | the DELEGATION: deterministicAnchors calls anchorTrade (the fixed 1.5p/3p/1.5p-inside rules DIE at their sites); refineProjection's SL recompute delegates to the ADM; the lane admission checks the verdict (REJECT → the lane skipped + the record); the chained entry flows through the ADM's snap | tsc 0 · the golden gate exit 0 (the entries hold ≤3p — the E-levels IMPROVE toward the operator's exact) · the EU SHORT's emission SL ≈ 1.14485 · the DXY LONG's E = 100.945 · the GU SHORT's lane SKIPPED with the DEGENERATE_PAIR_REJECTED record |
| **W-ADM-3** | `src/mdve/mirror.ts` (computeLmvTP's candidate admission, ~:2808) | the W6 rung-validity gate at EVERY TP-walk candidate (the picker's isValidRung — imported, never re-declared) + the DEGENERATE_RUNG_REJECTED record | the LMV oracle 7/7 (the levels unchanged — only the degenerate admissions die) · diag-step-tools 31/31 · the GU SHORT's TP walk rejects the 1.32850 rung |
| **W-ADM-4** | `src/mdve/shadow-agent.ts` (the anchor refinement's validation) | the LLM-envelope firewall: the shadow's anchor output validated against the ADM's envelope (the SL inside the wick territory / the RRR < 3.0 / a degenerate pair → the SHADOW_FLAG + the deterministic result stands) | diag-grounding-warn 23/23 · diag-step-tools 31/31 |
| **W-ADM-5** | the diag harness `diag-reasoning-chain-golden.ts` (the acceptance extension) | the outcome-accountability: the harness runs the visual-eval simulation (the TTE report generation from the emissions + the outcome audit) as a NEW gate — the acceptance = the outcome win rate, not the precision alone | the golden gate exit 0 · the OUTCOME gate: ≥ 4/6 wins on the golden week (the EU SHORT + the EU LONG + the DXY LONG flip to WINS) |

**THE EXECUTION ORDER:** W-ADM-1 (the ADM module) → W-ADM-2 (the delegation) → W-ADM-3 (the W6 walk) → W-ADM-4 (the shadow firewall) → W-ADM-5 (the outcome gate) — each gate verified by the orchestrator (tsc + the golden gate + the ADM battery) before the next wave starts. The frozen pair is NEVER touched (sl-lmv + trade-dedup — the byte-identical law).

# §4 THE TESTING STRATEGY

**THE TEST MATRIX — every failure in §1 becomes a replay fixture:**

| The test | The fixture (from the REAL evidence) | The expected | The gate |
|---|---|---|---|
| T-1 the reaction-wick SL | the EU SHORT's zone [1.1446-1.14571] + the Jul 2/3 reaction events | the SL ≈ 1.14485 (the measured wick extreme + the dispersion) — the real peak 1.14480 SURVIVED | the ADM unit battery · the visual-eval WIN |
| T-2 the defended-extreme SL | the EU LONG's fortress [1.14004-1.14147] + its reaction lows | the SL below the measured defended low — the Wednesday 1.13983 pierce SURVIVED | the ADM unit battery · the visual-eval WIN |
| T-3 the chained-snap | the DXY LONG's priorTp 100.918 vs the receiving zone [100.945-101.063] | the fill = 100.945 (the clamp) — the operator's exact golden | the ADM unit battery · the emission check |
| T-4 the interior entry | the GU LONG's rung [1.33306-1.33343] | the entry ≈ 1.33330 (the modal reaction level) | the ADM unit battery · the emission check |
| T-5 the degenerate pair | the GU SHORT's 1.6p sliver SL + the 1.32850 zero-width rung | the DEGENERATE_PAIR_REJECTED verdict — never an emission | the lane-admission test · the failure-store record |
| T-6 the virgin zone | a zone with ZERO reaction events | the width-scale SL + the MEASURE_NO_EVIDENCE log — never a fabricated wick | the ADM unit battery |
| T-7 the outlier wick | a zone with ONE giant sweep wick + small reactions | the MEDIAN dispersion resists the outlier — the SL not blown out | the ADM unit battery |
| T-8 the determinism | the golden gate ×2 | the byte-identical digests | the golden gate G10/A5 |
| T-9 the temporal lock | the negative control (the later anchor) | the anchors UNCHANGED (the recency window anchored to the LOCKED analysis point) | the golden gate G8/A3 |
| T-10 the outcome acceptance | the visual-eval simulation of the 5 emissions | ≥ 4/6 wins on the real bars (the EU SHORT + the EU LONG + the DXY LONG flip) | the OUTCOME gate (the W-ADM-5 harness extension) |

**THE LIVE MATRIX (the operator's Phase 2 — the anti-fitting proof):** the ADM run on MULTIPLE UNRELATED WEEKS in parallel — the prediction quality consistent across all (the operator: "the quality of prediction needs to be consistent across all of them so i know that this is actually capable of forward mapping REAL trading weeks") — the multi-week consistency is the ADM's final acceptance, never the single golden week.

# §5 THE ANTI-PATTERNS AGAINST FALSE SUCCESS

**AP-1 THE MAGIC-RATIO REINTRODUCTION:** the battle-adaptive ratio hardcoded ("the ratio = 0.33") — the ratio must derive from the map's measured dispersion distribution (the anti-fitting law) — a bare ratio in the ADM module = the same slop in a new costume = FLAWED.

**AP-2 THE SL-CAP KILLING THE WICK-SURVIVAL:** the RRR-headroom cap pushing the SL INSIDE the measured wick territory to clear the floor — the ENTRY_LEVER_REQUIRED verdict, never a forced tight SL (the operator: "safety > profit" — the wick placement is the safety; a forced tight SL = the F-1 class return).

**AP-3 THE DEGENERATE-PAIR EMISSION:** an RRR from a sliver-SL × a phantom-TP emitted because "the numbers pass" — the geometry-honesty gate REJECTS it (the operator's 16.8 class — "what the actual FUCK is this").

**AP-4 THE FITTED-CALIBRATION:** the ratio/dispersion tuned to make the golden week pass — the anti-fitting gate: the parameters from the map's distribution + the Phase-2 multi-week gate (a golden-only calibration = the overfit = FLAWED).

**AP-5 THE SILENT-CONSTANT FALLBACK:** a measurement with no source returning a constant dressed as measured — the provenance gate: present:false + the loud log + the documented floor — a silent constant = the theatrical class.

**AP-6 THE LLM OVERRIDE:** the shadow agent moving the SL inside the wick territory or lowering the RRR floor — the envelope firewall rejects (the operator: "should honestly work without model influence").

**AP-7 THE FROZEN-PAIR VIOLATION:** sl-lmv.ts + trade-dedup.ts touched by ANY wave — the byte-identical law — a mutation = the HARD FAILURE (the golden gate's frozen-pair check catches it).

**AP-8 THE RE-DERIVED CONSTANTS:** the W6's MIN_RUNG_WIDTH_PIPS / ID_CENTER_TOLERANCE_PIPS re-declared in the ADM or the mirror walk instead of imported — the single-source law (the drift hazard — M-7's class).

**AP-9 THE MEAN-VS-MEDIAN:** the dispersion using the MEAN — a single giant sweep wick blows the SL out — the median is the law (the anti-outlier rule).

**AP-10 THE PRECISION-ONLY ACCEPTANCE:** the build declared done on the 5/5 entry precision without the OUTCOME gate — the outcome-accountability law: the visual-eval win rate is the acceptance, never the precision alone.

# §6 THE SUCCESS CRITERIA

**THE OPERATOR'S ACCEPTANCE BAR — mechanical and numbered (the operator can verify every one by command):**

1. **THE ADM UNIT BATTERY:** the T-1..T-7 known-answer tests pass — the EU SHORT's SL ≈ 1.14485 (the measured wick extreme), the EU LONG's SL below the defended low, the DXY LONG's chained-snap 100.945, the GU LONG's interior ≈ 1.33330, the GU SHORT's DEGENERATE_PAIR_REJECTED, the virgin zone's width-scale + the NO_EVIDENCE log, the outlier's median resistance. `bun test tests/adm-*` (or the diag harness's ADM section) — all green.
2. **THE CONSTANT-FREE GREP:** the ADM module's audit — every number carries the provenance comment (a measurement / a canon quote / a documented floor) — zero bare magic constants.
3. **THE GOLDEN GATE:** exit 0 — G1-G10 10/10 + A1-A7 7/7 · the determinism ×2 · the frozen pair byte-identical · the negative control UNCHANGED · the entries ≤ 3p (the E-levels IMPROVE toward the operator's exact: the DXY LONG 100.945, the GU LONG 1.33330).
4. **THE EMISSION CHECKS:** the EU SHORT's SL = 1.14485 ± 0.5p (the operator's exact) · the DXY LONG's E = 100.945 (the clamp) · the GU SHORT's lane SKIPPED with the DEGENERATE_PAIR_REJECTED record in the failure store · the EU LONG's SL below the fortress's measured defended low.
5. **THE OUTCOME GATE (the W-ADM-5 harness):** the visual-eval simulation of the 5 emissions — **≥ 4/6 wins on the real bars** — the EU SHORT + the EU LONG + the DXY LONG flip to WINS (the machine's trades WIN where the operator's would have won) — the net R > the +2.40R baseline.
6. **THE REGRESSION BATTERY:** tsc 0 · bun build exit 0 · the LMV oracle 7/7 · the lexicons 40/40 · the step-tools 31/31 · the grounding-warn 23/23.
7. **THE PHASE-2 GATE (the forward proof):** the ADM's quality consistent across MULTIPLE UNRELATED WEEKS (the operator's Phase-2 law) — the multi-week run in the diag harness.
8. **THE CANON DOCS:** the build report ENTRY 8 · the DECISION_CHAIN D68 · the EVIDENCE_STATE (the outcome audit) · the COMPACTION_SURVIVAL · the wave audit at BOTH .trident/wave-audit/ paths.

# §7 THE COMPACTION-PROOF IMPLEMENTATION GUIDE

**THE DOCS TO MAINTAIN (the running-build-docs law — append-only):**
- The DEBUG_LOG — the D68 entry (the ADM build: the findings + the fixes + the lessons).
- The BUILD_REPORT — the ENTRY 8 (the ADM wave record).
- The DECISION_CHAIN — the D68 (the ADM decision).
- The EVIDENCE_STATE — the outcome audit (the visual-eval numbers).
- The COMPACTION_SURVIVAL — the session delta.
- The wave audit — .trident/wave-audit/ BOTH paths (the gate reads process.cwd() = /home/leviathan/OPENCODE_WORKSPACE/.trident/wave-audit/).
- THIS SPEC — the build authority; the APPENDIX A's audit findings update as the waves land.

**THE RESUME ANCHORS (the next session's entry sequence):**
1. Read THIS spec (the L2 — the ADM authority) + the W8B spec §7 + the checkpoint's OUTCOME_ANALYSIS_AND_IMPROVEMENT_PLAN.md (PART 6-7).
2. Run the zero-trust battery (tsc · the golden gate · the frozen pair · the regression diags) — the baseline.
3. Execute W-ADM-1 → W-ADM-5 in order, gating each.
4. The acceptance: the §6 criteria — the outcome gate ≥ 4/6.
5. The canon docs (the D68 + the ENTRY 8 + the EVIDENCE_STATE).

**THE CROSS-CONSISTENCY RULES:**
- The ADM's rung-validity = the W6's isValidRung (mirror.ts — IMPORTED, never re-derived).
- The RRR floor 3.0 = the operator's quote (documented at the ADM's verify gate + the reasoning-chain's RRR_GATE — the M-11 layering documented, never conflated).
- The recency window = the temporal lock's 3-trading-day window (the D-3b law) — never a run-limit-derived window.
- The frozen pair — the byte-identical law, checked at EVERY gate.

# §8 THE FINAL NOTES + THE OPEN QUESTIONS

**THE OPEN QUESTIONS (each with the recommendation — nothing hidden):**

1. **THE MIN_VIABLE_DEFENSE floor (the sliver-SL gate):** the geometry-honesty gate needs a minimum-viable-defense threshold — the recommendation: the pair's measured dispersion percentile (the ADM's own m2 distribution — the median dispersion of the map's zones), documented with the derivation — NOT a bare pip constant. OPEN until the ADM's m2 data lands.
2. **THE battle-adaptive ratio's virgin factor (1.0 vs the tested 1.6):** the initial factors are the DESIGN's placeholders — the W-ADM-1 wave calibrates them from the map's measured virgin-vs-tested dispersion difference (the anti-fitting law: the golden week never the calibration set — the map's OTHER zones are).
3. **THE interior-reaction level's modal source:** the GU LONG's interior ≈ 1.33330 — the modal measurement options: the LMV's bucket distribution vs the zone's internal-LQZ near edge — the recommendation: the internal-LQZ near edge when present, else the LMV bucket median — the W-ADM-1 wave's unit battery decides on the known-answer (the GU 1.33330).
4. **THE outcome gate's target (≥ 4/6):** the operator's acceptance — the EU SHORT + the EU LONG + the DXY LONG must flip to WINS on the real bars — the W-ADM-5 harness measures; if a trade does NOT flip, the ADM's measurement for that trade is examined (never a threshold-gaming).
5. **THE multi-week fixtures (the Phase-2 gate):** the OTHER weeks' bar data — the fixture's coverage (the bars_raw.json extends 526h past the anchor — the OTHER weeks' data availability needs the harvest check) — the Phase-2 gate runs when the fixtures exist.

**THE FINAL NOTES:**
- This spec's authority: the ADM replaces the fixed-constant SL/entry/TP decisions in the chain's native assembly — the E2's designation machinery (shape-brain) is UNCHANGED by this wave (the H-9 follow-up stands separately).
- The GU SHORT's lane: under the ADM, the lane EMITS NOTHING (the DEGENERATE_PAIR_REJECTED / RRR_BELOW_FLOOR) — the operator's rejection reproduced — the golden GU remains LONG-only.
- The outcome-accountability: the acceptance of this build = the machine's trades WIN where the operator's would have won (the §6.5) — the "almost there" checkpoint becomes the "golden match" checkpoint when the outcome gate passes.

# APPENDIX A — THE ZERO-TRUST AUDIT

**THE ZERO-TRUST AUDIT — the spec read as an ADVERSARIAL BUILDER (the findings + the surgical edits):**

| Severity | The finding | The surgical edit |
|---|---|---|
| HIGH | the MIN_VIABLE_DEFENSE_PIPS threshold undefined in §2.4's verify pseudocode | §8.1: the measured-dispersion-percentile recommendation documented (the anti-fitting derivation) |
| HIGH | the interiorReactionLevel's exact modal source unspecified (§2.3) | §8.3: the internal-LQZ-near-edge-first + the LMV-bucket-median fallback recommendation documented |
| MEDIUM | the resolveTp's opposingDefendedWalls helper unspecified (the wall classification's source) | the W5's isDefendedWall (mirror.ts:2112) + the anchorToLexiconPressure — the EXISTING E1-pressure wall machinery referenced, never re-derived |
| MEDIUM | the reactionEvents' touchHigh/touchLow fields assumed — the actual event schema may carry only lastTouchMs + lastTouchPrice | the W-ADM-1 wave VERIFIES the ZoneModel.reactionEvents schema first (the probe) — the fallback: the lastTouchPrice + the bar-scoped extremes |
| MEDIUM | the ADM's resolveEntry for the SHORT side: the shieldNearEdge may return the floor-edge when no shield exists (the inside-rungs fallback) — the F-4 class on the SHORT side | the SHORT entries keep the D-2's ceiling-shield semantics (the W8B's verified behavior) — referenced, not re-derived |
| LOW | the outcome gate's "≥ 4/6" could be gamed by the harness thresholds | the gate measures the RAW visual-eval outcomes (the trigger→exit simulation) — the threshold is the operator's stated acceptance, never a harness constant |

**THE VERDICT: 0 CRITICAL · 2 HIGH (documented, the build waves resolve them) · 2 MEDIUM (the wave probes verify the schemas) · 1 LOW — NO UNRESOLVABLE GAPS — the spec is buildable by a fresh agent with zero prior context (the §7 resume anchors + the interfaces + the pseudocode + the evidence citations).**

**THE BUILD AUTHORITY'S COMPLETENESS:** the §1 failures all cite the code+bar evidence · the §2 components all carry the interface contracts + the pseudocode · the §3 waves are file-disjoint with the mechanical gates · the §4 tests reconstruct the REAL failure events · the §5 anti-patterns name the bypasses · the §6 criteria are mechanically verifiable · the §7 carries the resume anchors · the §8 hides nothing.

# THE DETAILED BUILD ARCHITECTURE — All Five Components
## Plutus 5.0 — The Plutus Card Generator + The Plutus Kernel

**Date:** 2026-09-04 · **Status: THE v5.0 BUILD AUTHORITY — THE DETAILED ARCHITECTURE** · **Supersedes:** all prior architecture sketches for the five components

---

## 1. THE PLUTUS CARD (the input artifact)

```
┌─────────────────────────────────────────────────────────────────┐
│  PLUTUS CARD — plutus-card-v1.json                             │
│  Same relationship to the Plutus Kernel as JESL cards to JESL: │
│  the card is STRUCTURED DATA, the kernel is CODE that reads it │
└─────────────────────────────────────────────────────────────────┘

SCHEMA (zod, Schema-gated at kernel entry):
├── meta
│   ├── week, analysisPointMs, pairs[], generated (session-id)
│   └── quality: { screenshotsVerified: bool, chartGrade: PASS|FAIL }
│
├── e1: ZoneMapSnapshot                    ← produced by E1 Machine 1
│   ├── zones[]: { id, floor, ceiling, type, classification,
│   │             pressureState, zfp, touchKind,
│   │             lexiconVerdicts[] }     ← every zone carries its
│   │                                        evidence triplets
│   ├── rungs[]: { id, zoneId, floor, ceiling, type }
│   └── pressureStates[]: per-zone lifecycle transitions
│
├── e2: DesignationEvents                  ← produced by E2 Machine 1
│   ├── designations[]: { day, pair, direction,
│   │     supplyZoneId, demandZoneId,        ← ZONE IDs ONLY
│   │     keyZoneType, deepDemandZoneId,
│   │     shapeChainPrediction,
│   │     machineTransitionTrail[] }         ← IDLE→DESIGNATED→CONSUMED
│   └── cascadeVerification: { dxyChainValid,
│         divergenceScore, mirrorFloorCheck }
│
├── visuals                                ← produced by the Chart Layer
│   ├── charts[4]: { timeframe, path, zonesDrawn, grade }
│   └── renderQuality: { verifier, binaryGrade, contextOnFail }
│
└── reasoning                              ← produced by the Primary Agent
    ├── stepA: { designationRationale (≥40 chars, price-referenced),
    │            confirmedDesignationIds[], challengedDesignationIds[],
    │            groundingChecks: { w1..w7 } }
    └── stepB: { forwardProjection,
                 anchorTokens: { t8_forwardPosition,
                                 t9_anchor, t10_validation } }

ASSEMBLY (the wave-manager pattern):
  1. E1 runs → ZoneMapSnapshot journaled
  2. E2 runs → DesignationEvents journaled
  3. Chart Layer draws zones+shapes on TV 4TFs → screenshots captured
  4. Aether Chart Verifier grades each screenshot (binary PASS/FAIL)
  5. Primary Agent reads E1+E2+charts → STEP A/B reasoning
  6. Card Assembler merges ALL into one JSON → schema-validated
  7. Card written to disk → ready for kernel consumption

FILE STRUCTURE:
  plutus-cards/
  ├── schema.ts          ← the zod PlutusCardSchema
  ├── assembler.ts       ← merges E1+E2+visuals+reasoning into the card
  ├── validator.ts       ← schema validation + quality gates
  └── examples/          ← golden-week card for D17 calibration
```

---

## 2. E1: OHLC LEXICON VISION SYSTEM (Machine 1, first half)

```
┌─────────────────────────────────────────────────────────────────┐
│  E1 = the OHLC Intelligence Lexicon system ported from the     │
│  agent_plugin_boilerplates/OHLC-Intelligence-Lexicon-v1.0     │
│  + Actor systems managing running zone maps                    │
└─────────────────────────────────────────────────────────────────┘

SOURCE (already exists, 14 .ts files):
├── src/core/types.ts (176L)     ← port VERBATIM (already Plutus-shaped)
│   OHLCBar, ZoneModel, Rung, LexiconData, Predicate, PatternFamily,
│   MachineRule, ClassifierResult, TouchKind, PressureState, ShapeCode
│
├── src/core/engine.ts (225L)    ← port VERBATIM (the kernel)
│   LexiconRegistry, scoreSignals (pos/(pos+neg+1)), classify,
│   operativeZone, bucket, windowBars, approachSide, candlesTouching,
│   reactionCount, largeOb
│
├── src/machines/ (6 files)      ← port + re-point predicates
│   ├── candle-pressure.ts    the per-zone battle classification
│   │                          (DEFEND/REJECT/SWEEP/DWELL/PASS_THROUGH)
│   │                          4-bank scoring: descriptive(-1) suggestive(+1)
│   │                          substitute(+2) use(+3)
│   ├── candle-shape.ts       the SS/BS/R/WL/RWL/WLS anatomy grammar
│   │                          body-fraction, wick-ratio, progression
│   ├── zone-classification.ts BoM/MoM/PHANTOM_BOM/FORTRESS/IP/LSZ/REJECT
│   │                          the ALL-4 phantom-BoM predicate:
│   │                          largeOb(1.5×ATR14) + fakeout + preFormation
│   │                          + macroOrigin — kills C-8's side-vote
│   ├── zone-pressure.ts      VIRGIN→ACTIVE-1→ACTIVE-2→DEPLETED→FORTRESS|BROKEN
│   │                          battle-counted, DEATH_SCOPE = ['30m','1H'] ONLY
│   │                          (4H NEVER dies — the operator's law)
│   ├── shape-chain.ts        the ZFP-conditioned transition families
│   │                          SS→BS (zfp>0.45+marubozu), BS→R (zfp 0.20-0.40)
│   │                          unified macro authority + chainsContradict
│   └── obvious-trades.ts     the aggregate forward-reasoning gate
│                              classifyAggregate fires when pos>neg + RRR≥2.5
│
├── ACTORS (new, the running zone maps)
│   ├── zoneMapActor          XState v5 machine, state = the live zone map
│   │                         events: zoneAdded, zoneUpdated, pressureChanged
│   ├── pressureActor         per-zone lifecycle tracker
│   │                         events: battleResolved(touchKind), zfpMeasured
│   └── container             { zoneMapActor, pressureActor, lmEngine, obcvEngine }
│
├── ADAPTERS (new)
│   ├── MarketDataAdapter     TV OHLC → OHLCBar[] with anchorMs gate
│   │                         FUTURE_BAR_LEAK = Schema-gate (bars past anchor
│   │                         decode-fail with the typed error)
│   └── OBCVEngine            order-block vision → the zone evidence
│                              behind the zone-classification lexicon
│
└── OUTPUT CONTRACT (exactly two things):
    1. ZoneMapSnapshot — zones+rungs+touchKinds+pressureStates+zfp
       every field traces to a lexiconVerdictId
    2. LexiconVerdict[] — evidence triplets {Pattern,State,Evidence}
       no triplet = the classification does not exist

WHAT MAKES THIS "MATRIX VISION":
  The lexicon predicates are deterministic functions over the OHLC data.
  Every zone the operator sees on the chart gets classified by MULTIPLE
  lexicon families simultaneously (candle-pressure says DEFEND, zone-
  classification says BoM, zone-pressure says VIRGIN→ACTIVE-1). The
  composite verdict IS the "matrix vision" — every zone carries its
  full structural identity, not just a price band.
```

---

## 3. E2: STATE MACHINES + COMPUTATIONS (Machine 1, second half)

```
┌─────────────────────────────────────────────────────────────────┐
│  E2 = the decision layer: state machines making every           │
│  designation/transition decision, MPSE for all numeric math    │
└─────────────────────────────────────────────────────────────────┘

├── ShapeChainMachine (per pair)
│   states: SS|BS|R|WL|RWL|WLS|PBS (the 7 shapes)
│   events: dayOpen, battleResolved(zoneId,touchKind), zfpMeasured
│   guards: the shape-chain lexicon's transition families
│            SS→BS requires zfp>0.45 + marubozu anatomy
│            BS→R requires zfp 0.20-0.40
│   unified macro authority guard: per-pair transition that
│     contradicts macro → chainsContradict (evidence, never suppress)
│
├── DesignationMachine (per day × pair)
│   states: OPEN→DESIGNATED→CONSUMED|INCOMPLETE
│   emissions: demandZoneId, supplyZoneId, keyZoneType,
│              deepDemandZoneId — ZONE IDs ONLY (type-enforced:
│              the machine has NO price field to emit)
│   CONSUMED guard: the consuming E3 anchor traces to the designation ID
│   SIDE_INVERSION_VIOLATION: any mirror consuming the wrong side fires
│
├── CascadeMachine (DXY→EU→GU)
│   built on ms-chain-tracker semantics:
│   requires[]: EU E2 cannot advance before DXY-inverse exists
│   forbids[]: GU lane never consumes raw DXY setups
│   detectLoop: same translation re-firing = duplicate class
│   per-stage ChainRule violations carry the stage ID
│
├── Computations (MPSE MathExpr + oracles)
│   f(T) = N×(1+P) = 24      the mirror floor
│   divergence(pair,macro) ≤0.35  the chain-divergence
│   zfp = min(60, 20+floor((battles-3)/2)×5)  the canon ladder
│   designation totality: ∀(day,direction): ∃! designation
│
└── OUTPUT: DesignationEvents + ShapeChainProjection (journaled)

PROBABILISTIC COMBINATORICS (forward shape-chain mapping):
  The ShapeChainMachine doesn't just track the current shape — it
  computes the FORWARD-PROBABILITY of each next shape given the
  current state + the E1 zone data. This is a transition matrix
  over the guard conditions (zfp bands, candle anatomy, pressure
  state). The "most likely shape chain" emerges from the machine's
  own transition table + the E1 evidence — not from heuristics.
```

---

## 4. THE AETHER CHART VERIFIER (the quality gate)

```
┌─────────────────────────────────────────────────────────────────┐
│  A separate embedded Aether Agent system that validates         │
│  TradingView screenshots BEFORE the kernel receives them        │
└─────────────────────────────────────────────────────────────────┘

ARCHITECTURE (the ViL Grade-3 pattern applied to charts):

┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ TV Browser  │────▶│ Screenshot       │────▶│ Aether Chart    │
│ MCP draws   │     │ Capture (4 TFs)  │     │ Verifier        │
│ E1 zones +  │     │                  │     │ (AetherAgent)   │
│ E2 shapes   │     │ 4H/1H/30m/15m    │     │                 │
│ on charts   │     │ per pair         │     │ BINARY GRADE:   │
└─────────────┘     └──────────────────┘     │ PASS or FAIL    │
                                              │ + context on    │
                                              │   fail          │
                                              └─────────────────┘

THE VERIFIER IS AN AetherAgent (the pi-SDK harness):
├── prompt: the chart-quality checklist
│   1. Are E1 zones visible and correctly positioned?
│   2. Do the drawn zones match the ZoneMapSnapshot?
│   3. Are E2 shape annotations present?
│   4. Is the timeframe label correct?
│   5. Is the chart readable (not blank/corrupted)?
│
├── tools: read (the screenshot file) — the ONLY tool
│   force-pinned to the screenshot path, read-only
│
├── output: judgment.md via report_write
│   REQUIRED_MARKERS: "GRADE:PASS" or "GRADE:FAIL"
│   + per-criterion verdict + failure context
│
├── hard caps: 1 round, max 2 LLM calls, temp 0
│
└── the output is a BINARY gate:
    PASS → the screenshot enters the Plutus Card
    FAIL → the card is NOT assembled (the pipeline retries
           the chart drawing, or degrades loudly)

WHY BINARY:
  The kernel must only receive quality-vetted visual data.
  A screenshot with zones drawn wrong is worse than no screenshot
  — it corrupts the kernel's visual reasoning input. The binary
  gate ensures the kernel NEVER sees unverified visuals.

INTEGRATION:
  Runs BETWEEN the chart drawing (W3.5) and the card assembly (W4)
  A pipeline stage in the JESL graph: "chart-verify" node
  Consumes: the screenshot files + the ZoneMapSnapshot
  Produces: the quality gate verdict (per screenshot)
```

---

## 5. THE PLUTUS KERNEL + TRADE COMPUTER (Machine 2)

```
┌─────────────────────────────────────────────────────────────────┐
│  THE PLUTUS KERNEL = a JESL Kernel optimized for trade         │
│  computation. Same architecture as the JESL kernel: the card   │
│  is DATA, the kernel is CODE, the kernel consumes the card.    │
└─────────────────────────────────────────────────────────────────┘

FILE STRUCTURE:
src/kernel/
├── card-loader.ts           ← decode + zod-validate the Plutus Card
│                               (the Schema-gate: invalid card = REFUSAL)
│
├── telescope-engine.ts      ← META-LAYER 1: HTF Telescoping
│   INPUT:  the card's e1.zones[] + e1.rungs[]
│   COMPUTES: the 4H King → 1H General → 30m Captain hierarchy
│             BoM origins (4H/1H ONLY) identification
│             30m MoM-only zone classification
│             LQZ rung mapping (1H→30m→15m)
│   OUTPUT:  TelescopeMap { htfZones, ltfRungs, boMOrigins, tfHierarchy }
│   SOURCE:  VISUAL_TELESCOPE_CHARTING_T2.md doctrine
│
├── pressure-mapper.ts       ← META-LAYER 2: S/D + Liquidity + Pressure
│   INPUT:  the card's e1 (zones + pressureStates) + telescope output
│   COMPUTES: supply/demand overlap zones
│             liquidity rung positions + shield relations
│             BoM/MoM pressure zone mapping (the composite overlay)
│             fortress detection (4+ strong defenses = FORTRESS)
│             phantom-BoM identification (the ALL-4 predicate)
│   OUTPUT:  PressureMap { overlapZones, shields, fortresses, phantoms }
│
├── fib-spiderweb.ts         ← META-LAYER 3: Fibonacci Trade Path
│   INPUT:  the card's e2 (designations + shape chain) + pressure map
│   COMPUTES: fib retracement levels from swing highs/lows
│             extension targets (1.272, 1.618, 2.618)
│             the full trade path (entry zone → target zone)
│             E/SL/TP verification against the fib mapping
│             E2 shape alignment w/ the trade setup
│   OUTPUT:  SpiderwebMap { retracements, extensions, tradePaths[],
│                             anchorVerification[] }
│   SOURCE:  Fibonacci Spiderwebs.md/PDF doctrine
│
├── cascade-verifier.ts      ← META-LAYER 4: DXY Cascade Mapping
│   INPUT:  the card's e2.cascadeVerification + all pairs' designations
│   COMPUTES: for each EU/GU trade → the equivalent inverse DXY setup
│             verification that the DXY setup EXISTS in the DXY lane
│             divergence computation (≤0.35 threshold)
│             mirror floor check (|mirrors| ≥ |DXY active|)
│   OUTPUT:  CascadeVerification { perTradeInverseMapping[],
│                                 divergenceScore, floorCheck }
│   NOTE:    if a trade has NO DXY inverse → it FAILS this layer
│            (the cascade law: every EU/GU trade must have its DXY
│             equivalent — "DXY provides DIRECTION, pair provides LEVELS")
│
├── warhead-confluence.ts    ← META-LAYER 5: TI Graph Grading
│   INPUT:  ALL previous layers' outputs + the Plutus Card's reasoning
│   COMPUTES: the Trading Intelligence graph evaluation
│             (pre-built from the bibles: HANDOVER_37_FUNDAMENTAL_LAWS,
│              TTE_GOLDEN_STANDARD, TTE_SHAPE_ZONE_MECHANICS, SMC_Notes,
│              PLUTUS_ANCHOR_DOCTRINE, E3_ANCHOR_ENGINEERING_SPEC)
│   THE TI GRAPH:
│     Nodes = the operator's laws as typed warheads
│     Edges = confluence relationships between laws
│     Each proposed trade passes through the graph:
│       → which laws support it? (confluence count)
│       → which laws contradict it? (disqualifiers)
│       → macro-level grading: NOT binary arithmetic but the
│         structural weight of the doctrine
│   OUTPUT:  ConfluenceVerdict { score, supportingLaws[],
│             contradictingLaws[], entryChecklist[], tradeValid: bool }
│
├── trade-computer.ts        ← THE ORCHESTRATOR
│   1. Load card (card-loader)
│   2. Run L1 (telescope-engine) on e1 data
│   3. Run L2 (pressure-mapper) on e1 + L1 output
│   4. Run L3 (fib-spiderweb) on e2 + L2 output
│   5. Run L4 (cascade-verifier) on all pairs' e2
│   6. For each candidate trade (from e2 designations):
│      a. Compute E/SL/TP from the zone geometry (L1+L2)
│      b. Verify against fib path (L3)
│      c. Verify DXY inverse exists (L4)
│      d. Apply warhead confluence grading (L5)
│      e. Emit TradeProjection with full provenance
│   7. Filter: tradeValid=true + confluenceScore≥threshold
│   8. Output: TradeProjection[] (the winning trades)
│
├── report-generator.ts      ← THE OUTPUT
│   Takes TradeProjection[] + the full card data
│   Runs the Leviathan PDF template (52 ironclad rules)
│   25 sections: DXY 1-8, EU 9-13, GU 14-18, AU 19-23, Cross-Pair 24-25
│   Output: the professional Leviathan Trading Report PDF
│   SOURCE: Leviathan_Report_Template_v2.0.py (ported to TS or called
│           as a python subprocess from the Effect runtime)
│
├── report-validator.ts      ← from Trident_Report_Validator.py
│   Validates the PDF: formatting rules, section completeness,
│   data consistency, zone coverage
│
└── journal.ts               ← Effect journal
    Every L1-L5 computation journaled as an Activity
    Every trade decision carries its full causal chain:
    harvest→E1→E2→card→L1→L2→L3→L4→L5→trade→report
    Replayable: Journal.query(causationId) reconstructs any trade

INVOCATION (the wave-manager pattern):
  plutus-kernel --card plutus-cards/2026-07-06.json --output reports/

SUBSTRATE:
  The entire kernel runs as a JESL Workflow (Effect-TS):
  - card-loader = a detect node (Schema-gate)
  - L1-L5 = pipeline nodes (each an Activity, journaled)
  - trade computation = a decide node (machine-driven)
  - report = a generate node (the only LLM-touching part)
  - The kernel IS a JESL Kernel — same runtime, same journal,
    same capability model, same single-runtime law
```

---

## HOW THE TWO MACHINES CONNECT (the build sequence)

```
BUILD ORDER (what each wave produces):

W2 (E1 Lexicons):
  input:  OHLC bars (fixture)
  output: ZoneMapSnapshot + LexiconVerdicts
  files:  src/e1/core/* + src/e1/machines/* + src/e1/actors/*

W3 (E2 Machines):
  input:  E1 ZoneMapSnapshot
  output: DesignationEvents + ShapeChainProjection
  files:  src/e2/machines/* + src/e2/computations/*

W3.5 (Visual Rendering):
  input:  E1 zones + E2 shapes
  output: 4 screenshots per pair (quality-graded)
  files:  src/visual/tv-browser-adapter + src/visual/chart-drawer +
          src/aether/chart-verifier.ts

W4 (Card Assembly):
  input:  E1 + E2 + screenshots + primary agent reasoning
  output: plutus-card.json (schema-valid)
  files:  src/card/assembler.ts + src/card/schema.ts

W5 (Kernel):
  input:  plutus-card.json
  output: TradeProjection[] + Leviathan PDF
  files:  src/kernel/* (all 8 files)

W6 (Report):
  input:  TradeProjection[]
  output: final PDF
  files:  src/kernel/report-generator.ts (ports the Python template)
```

Each machine is independently testable: E1 gets its own 500-run property battery, E2 gets its designation-totality oracle, the kernel gets golden-week replay (card in → known trades out). The connection is ONLY the card schema — clean, typed, replayable.

---

## THE FULL MIGRATION WAVE TABLE (from the v5.0 report, revised for this architecture)

| Wave | Builds | Gate |
|---|---|---|
| **W0** | Spec corpus (S-1..S-7 as MPSE MathExpr + oracle fixtures) | D17 calibrated, founding oracle discharges |
| **W1** | Substrate install (@paragon/substrate, Effect runtime, JESL engine, shared.db) | hello-workflow runs, PARAGON battery green |
| **W2** | **E1: Lexicon Vision System** — port OHLC-Intelligence-Lexicon, port OBCV, build Actor systems, MarketDataAdapter | ZoneMapSnapshot + LexiconVerdicts journaled on fixture week |
| **W3** | **E2: State Machines** — ShapeChain, Designation, Cascade machines + MPSE computations | Designation totality + side-correct + EU #2 ≤3p + golden ≥12/21 |
| **W3.5** | **Visual Rendering Pipeline** — TV Browser MCP chart drawing (E1 zones + E2 shapes on 4 TFs), screenshot capture, **Aether Chart Verifier** (binary quality grading) | 4 screenshots per pair, quality-graded, zones+shapes visible |
| **W4** | **Plutus Card Assembler** — primary agent reasoning layer consumes E1/E2 + charts → produces the Plutus Card JSON | Card schema-valid, grounding checks armed, all designation IDs machine-traceable |
| **W5** | **Plutus Kernel: Trade Computer** — L1-L5 embedded Aether meta-layers (telescoping, pressure, fib-spiderweb, cascade, warhead-confluence) + the JESL graph wrapping it all | EU #3 + GU #7 + EU #6 ≤3p + golden ≥14/21 + DXY 6/6 held |
| **W6** | **Report Generator** — Leviathan PDF from the template + validator integration | PDF generated, 52 formatting rules enforced, 25 sections complete |
| **W7** | **Enforcement** — PBA/PTA planes, sentinels, Bug Hunter on doctrine corpus, LOGIC-LSP | Hunt report, conformanceZero on touched files |
| **W8** | **Decommission + Multi-Week Validation** | Golden ≥15/21 sustained + multi-week consistent + operator sign-off |

---

## THE RELATIONSHIP TO THE KNOWLEDGE GRAPH INFRASTRUCTURE

| What was built (the KG session) | Where it plugs into v5.0 |
|---|---|
| Knowledge graph (corbell + shared.db) | L6 — the graph layer the kernel queries for zone history + call graphs |
| 2,837 compiled predicates | The D17 calibration infrastructure — S-1..S-7 compile into THIS battery |
| LOGIC-LSP | W7's audit-before-advance enforcement |
| 32-doc doctrine corpus | W0's spec corpus source material |
| The gateG8 findings | W0's founding violation fixtures (the price-anchor class) |
| The corbell scoping fix | L6's graph builder — already operational |

---

*This document is the build authority for the five-component architecture. Every file structure, every interface, every data contract, every gate criterion is specified. The next session opens with W0 and drives through W8.*

# TRADING VISUAL INTELLIGENCE (TVI) ENGINE — FULL ENGINEERING SPECIFICATION v1.0

**Document ID:** TVI-SPEC-v1.0
**Classification:** RUNTIME_GRADE_OVERHAUL
**Authority:** Operator directive 2026-07-25: "TVI NEEDS TO BE FUCKING ENGINEERED PROPERLY. Every single trade setup is visually obvious on the chart. I built this entire system from my eyes."
**Architectural basis:** VC VEE (Visual Execution Engine — "model PERCEIVES, harness DECIDES, harness VERIFIES"), Shark EIE (Knowledge Graph + FindingBus + IntelligenceOrchestrator), Shark CME (Context Management Engine — trajectory analysis, loop detection, anti-derailment), MV3 Web Agent (perception-first loop, deterministic engines as tools)
**Quality Bar:** CME specification grade — exhaustive, unambiguous, every detail specified, every decision justified, every file mapped, every test enumerated.
**Build Time Estimate:** 3-5 days (6 phases)
**Lines of Code Estimate:** 2,800-3,500 new (TypeScript) + 300-500 modified
**Status:** MASTER EXECUTION DOCUMENT — read top-to-bottom, execute phase-by-phase, zero derailments tolerated.

---

## TABLE OF CONTENTS

1. [Executive Summary & Architecture Overview](#1-executive-summary--architecture-overview)
2. [The Perception-First Loop](#2-the-perception-first-loop)
3. [Visual Knowledge Graph (VKG) — 100 Nodes](#3-visual-knowledge-graph-vkg--100-nodes)
4. [Visual Context Matcher (VCM) — 8-Phase Pipeline](#4-visual-context-matcher-vcm--8-phase-pipeline)
5. [Visual Enforcement Brain (VEB) — Pre/Post Gates](#5-visual-enforcement-brain-veb--prepost-gates)
6. [Zone Identification Protocol (ZIP) — The Agent's Visual Task](#6-zone-identification-protocol-zip--the-agents-visual-task)
7. [Multi-Layer Verification (MLV) — 3 Independent Layers](#7-multi-layer-verification-mlv--3-independent-layers)
8. [Visual Guidance System (VGS) — T0 Bullets + T1 Warheads](#8-visual-guidance-system-vgs--t0-bullets--t1-warheads)
9. [Visual State Tracker (VST) — SQLite State](#9-visual-state-tracker-vst--sqlite-state)
10. [Loop Detection (VLD) & Trajectory Monitor (VTM)](#10-loop-detection-vld--trajectory-monitor-vtm)
11. [Anti-Derailment System — 12 Behavioral Patterns](#11-anti-derailment-system--12-behavioral-patterns)
12. [Integration with Existing Pipeline](#12-integration-with-existing-pipeline)
13. [Data Model — TypeScript Interfaces](#13-data-model--typescript-interfaces)
14. [Test Specifications](#14-test-specifications)
15. [Performance Budgets](#15-performance-budgets)
16. [File Manifest](#16-file-manifest)
17. [Migration Strategy — From Broken to TVI](#17-migration-strategy--from-broken-to-tvi)
18. [The 10 Absolute Prohibitions](#18-the-10-absolute-prohibitions)

---

## 1. EXECUTIVE SUMMARY & ARCHITECTURE OVERVIEW

### 1.1 What TVI IS

The Trading Visual Intelligence (TVI) Engine is a **deterministic intelligence layer** embedded as plugin hooks inside the Plutus TTE opencode plugin. It enforces **visual execution discipline** on the Plutus agent — a MiMo v2.5 multimodal model that perceives TradingView charts directly through screenshots and identifies supply/demand/liquidity zones from actual candlestick structure.

TVI implements the foundational principle: **the model PERCEIVES, the harness DECIDES, the harness VERIFIES.**

The agent (MiMo v2.5) is the visual perception engine. It sees charts. It identifies zones from candlestick patterns. It describes what it sees in structured format (ZONE| lines). The harness (deterministic TypeScript code) validates every zone the agent produces — structure, evidence, price references, distance, type, freshness. The harness never calls the model. The harness never guesses. The harness never falls back.

**TVI is NOT a confirmation step.** It is the PRIMARY zone identification mechanism. Every trade setup must be visually obvious on the chart. The operator built this system from their eyes — they never looked at a data feed to find zones. TVI encodes that visual-first principle into mechanical architecture.

### 1.2 Why TVI Exists — The Problem It Solves

The current Plutus pipeline has a broken visual zone identification flow:

1. **Agent draws Engine 1 zones as rectangles on TradingView charts** — this works (tv_draw_rectangle via MCP)
2. **Agent screenshots the chart** — this works (tv_screenshot → plutus-save-screenshot)
3. **Agent is supposed to read the screenshot and identify zones** — THIS FAILS. The agent either:
   - Doesn't produce enough zones (VLM_UNAVAILABLE for most setups)
   - Confirms drawn rectangles without reading actual candle structure (VAP-005)
   - Tries to read base64 text instead of the PNG image (VAP-007)
   - Produces generic evidence that fails the firewall ("zone confirmed", "looks good")
   - Only looks at one side (all supply, no demand)
4. **Engine falls back to Engine 1 IP zones** — VIOLATES "NO FALLBACK — WORK OR FAIL"
5. **IP zones are treated as entry zones** — STRUCTURAL VIOLATION. IP zones are macro liquidity context (institutional pressure), NOT supply/demand entry zones. Entries at IP zones are slop.

**Result:** 22 DXY setups at IP zones (impossible — IP zones are not entry zones), 22 WL setups on 1H (impossible — WL is 1-3 candles), VLM_UNAVAILABLE everywhere (agent not producing zones), distribution broken (22/5/3/4 instead of 6-11/pair).

### 1.3 The TVI Solution

TVI replaces the broken flow with a **structured, enforced, verifiable zone identification process**:

```
Engine 1 produces zones (IP + S/D + LQZ) — mechanical, from OHLC data
    ↓
Agent draws Engine 1 S/D + LQZ zones on TradingView charts (visual anchors)
    ↓
Agent screenshots → reads via read() (MiMo v2.5 PERCEIVES the chart)
    ↓
Agent produces ZONE| lines (structured zone identification — Bible Part 3.6 format)
    ↓
TVI Harness parses ZONE| lines → validates each zone (deterministic, zero model inference)
    ↓
TVI Harness enforces: structure, evidence, price, distance, type, freshness, both-sides
    ↓
Output: validatedZones (passed ALL gates — highest confidence entry candidates)
    ↓
Engine 3 generates setups at validatedZones ONLY (no IP zones, no fallback)
```

**Intelligence ratio:** 60% architecture (zone structure validation, pattern recognition rules, evidence verification, confluence scoring, gate enforcement) / 40% model (visual perception, pattern identification, evidence description). The model sees and describes. The harness validates and decides.

### 1.4 Architecture Overview Diagram

```
┌─────────────────────── PLUTUS TTE PIPELINE ──────────────────────┐
│                                                                  │
│  Tool 1: harvest → Tool 2: zones → Tool 3: shapes               │
│                                                                  │
│  ┌─── MANUAL STEP C: Agent draws zones on charts ──────────────┐ │
│  │ tv_navigate → tv_set_timeframe → tv_find_price_y            │ │
│  │ → tv_draw_rectangle (S/D red, LQZ blue) → tv_screenshot     │ │
│  │ → plutus-save-screenshot (binary PNG)                       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                          │                                       │
│  Tool 4: plutus-pipeline-charts (verify screenshots exist)       │
│                          │                                       │
│  ┌─── MANUAL STEP D: TVI ZONE IDENTIFICATION ──────────────────┐ │
│  │                                                             │ │
│  │  Agent reads screenshot via read() (MiMo v2.5 PERCEIVES)   │ │
│  │     ↓                                                       │ │
│  │  Agent produces ZONE| lines (structured identification)     │ │
│  │     ↓                                                       │ │
│  │  ┌─── TVI HARNESS ──────────────────────────────────────┐   │ │
│  │  │                                                      │   │ │
│  │  │  VCM (Visual Context Matcher) ──→ VKG nodes (max 5) │   │ │
│  │  │     ↓                                               │   │ │
│  │  │  VEB (Visual Enforcement Brain) ──→ gates:          │   │ │
│  │  │    PRE: must read screenshot, must have ≥3 zones    │   │ │
│  │  │    POST: structure, evidence, price, distance, type │   │ │
│  │  │     ↓                                               │   │ │
│  │  │  VST (Visual State Tracker) ──→ SQLite state        │   │ │
│  │  │     ↓                                               │   │ │
│  │  │  VGS (Visual Guidance System) ──→ bullets/warheads  │   │ │
│  │  │     ↓                                               │   │ │
│  │  │  VLD/VTM (Loop Detection + Trajectory) ──→ health   │   │ │
│  │  │                                                      │   │ │
│  │  └──────────────────────────────────────────────────────┘   │ │
│  │     ↓                                                       │ │
│  │  validatedZones (passed ALL gates)                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                          │                                       │
│  Tool 5: plutus-pipeline-setups → setups at validatedZones ONLY  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 1.5 Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **ZONE\| pipe-delimited format** | Simple for model to produce, simple for harness to parse. JSON arrays are fragile (model produces invalid JSON). ZONE\| lines are one-per-line, mechanically parseable, self-documenting. |
| **NO FALLBACK to Engine 1 zones** | Operator rule: "NO FALLBACK — WORK OR FAIL." If the agent can't produce ≥3 valid zones, the pipeline BLOCKS. The agent MUST identify zones visually. Engine 1 zones are NOT a substitute for visual perception. |
| **IP zones are NOT entry zones** | IP zones are macro liquidity context (institutional pressure). They work IN CONJUNCTION with S/D/L zones. Only S/D (BoM/MoM from 4H order blocks) and LQZ zones are valid entry zones. |
| **Agent reads via read(), NOT SDK client** | Operator rule: "MIMO IS A FUCKING VLM AND CAN SEE IMAGES DIRECTLY WITH THE FUCKING READ TOOL." The SDK client creates a separate inference without conversation context. read() puts the image in the agent's primary context where it reasons with full pipeline awareness. |
| **Deterministic harness, zero model inference** | VCM matching, zone verification, evidence validation — all boolean evaluation on structured data. No LLM calls in the harness. The harness is fast (<10ms), deterministic, and auditable. |
| **Both sides required** | Agent MUST produce both supply AND demand zones per pair. One-sided identification means the agent missed the other side (WARN). |
| **ZONE\| format is mandatory** | Free-form text is not parseable. The agent MUST produce ZONE\|type\|top\|bottom\|timeframe\|classification\|confidence\|evidence lines. Any other format is rejected. |

---

## 2. THE PERCEPTION-FIRST LOOP

### 2.1 The Loop (from MV3 Web Agent pattern)

The TVI agent operates in a **perception-first decision loop**, NOT a scripted pipeline. The agent perceives the chart, decides what to do, calls a tool, perceives the result, decides the next action, loops. This is fundamentally different from a fixed pipeline where the agent follows a rigid sequence.

```
PERCEIVE: Agent reads chart screenshot via read()
    ↓
DECIDE: Agent identifies zones from candlestick structure
    ↓
ACT: Agent produces ZONE| lines for identified zones
    ↓
PERCEIVE: Harness verifies zones (structure, evidence, price)
    ↓
DECIDE: Harness accepts/rejects each zone (deterministic)
    ↓
ACT: Harness produces validatedZones for Engine 3
    ↓
LOOP: Agent reviews rejected zones, adjusts identification
```

### 2.2 Why Perception-First (Not Pipeline-First)

A scripted pipeline assumes the agent knows exactly what to do at each step. But visual zone identification is inherently perceptual — the agent must SEE the chart and REASON about what it sees. A rigid pipeline can't account for:
- Charts that look different week to week (volatility, range, trend)
- Zones that appear in unexpected places (new liquidity pools, fresh order blocks)
- Patterns that require interpretation (is that wick a rejection or just noise?)
- Zones that need confirmation (is this rectangle aligned with a real pattern?)

The perception-first loop lets the agent use its visual intelligence to identify zones that a mechanical detector might miss (or misidentify). The harness then validates the agent's identifications deterministically — ensuring the zones are structurally valid, properly evidenced, and correctly typed.

### 2.3 The Agent's Role vs The Harness's Role

| Component | Role | Intelligence Type |
|-----------|------|-------------------|
| **Agent (MiMo v2.5)** | PERCEIVES the chart, IDENTIFIES zones from candlestick patterns, DESCRIBES evidence in ZONE\| format | Visual perception, pattern recognition, evidence description |
| **Harness (TVI)** | VALIDATES zones (structure, evidence, price, distance, type, freshness), ENFORCES gates (must read screenshot, must have ≥3 zones, both sides required), RECORDS state (SQLite), GUIDES agent (bullets, warheads) | Deterministic validation, gate enforcement, state tracking, guidance generation |
| **Engine 1 (zones)** | PRODUCES zones mechanically from OHLC data (IP, S/D, LQZ) | Mathematical computation, pattern detection, confluence scoring |
| **Engine 2 (shapes)** | PREDICTS shape chain from zone map | ZFP-conditioned transition rules, day decomposition |
| **Engine 3 (setups)** | GENERATES trade setups at verified zones | Entry/SL/TP computation, confidence scoring, quality classification |

---

## 3. VISUAL KNOWLEDGE GRAPH (VKG) — 100 NODES

The VKG is a deterministic knowledge base of ~100 nodes across 6 categories. Each node has: id, category, condition (boolean function), guidance (T0 bullet <80 chars), warhead (T1 300-600 tokens for complex situations), priority (block/warn/guide), and disclosure mode (always/once-gate/once-session).

### 3.1 Category A: Zone Identification Patterns (30 nodes)

These nodes teach the agent WHAT to look for on the chart. They are matched by VCM when the agent is performing zone identification.

**A-001: SUPPLY_ORDER_BLOCK**
- Condition: `task === 'zone_identification' && side === 'supply'`
- Bullet: "Supply OB = candle BEFORE sharp move down. Mark high/low of that candle's wicks."
- Warhead: `warheads/supply-order-block.md` — full identification guide with examples
- Priority: guide
- Disclosure: once-gate

**A-002: SUPPLY_WICK_CLUSTER**
- Condition: `task === 'zone_identification' && side === 'supply'`
- Bullet: "Supply wick cluster = 3+ candles rejecting the SAME high. Upper wicks = rejection."
- Warhead: `warheads/supply-wick-cluster.md`
- Priority: guide
- Disclosure: once-gate

**A-003: SUPPLY_BEARISH_ENGULFING**
- Condition: `task === 'zone_identification' && side === 'supply'`
- Bullet: "Bearish engulfing at resistance = supply confirmed. Body engulfs prior candle."
- Warhead: `warheads/supply-bearish-engulfing.md`
- Priority: guide
- Disclosure: once-gate

**A-004: SUPPLY_CONSOLIDATION_TOP**
- Condition: `task === 'zone_identification' && side === 'supply'`
- Bullet: "Consolidation top + rejection = supply. Price touched ceiling and reversed."
- Warhead: `warheads/supply-consolidation-top.md`
- Priority: guide
- Disclosure: once-gate

**A-005: DEMAND_ORDER_BLOCK**
- Condition: `task === 'zone_identification' && side === 'demand'`
- Bullet: "Demand OB = candle BEFORE sharp move up. Mark high/low of that candle's wicks."
- Warhead: `warheads/demand-order-block.md`
- Priority: guide
- Disclosure: once-gate

**A-006: DEMAND_WICK_CLUSTER**
- Condition: `task === 'zone_identification' && side === 'demand'`
- Bullet: "Demand wick cluster = 3+ candles rejecting the SAME low. Lower wicks = rejection."
- Warhead: `warheads/demand-wick-cluster.md`
- Priority: guide
- Disclosure: once-gate

**A-007: DEMAND_BULLISH_ENGULFING**
- Condition: `task === 'zone_identification' && side === 'demand'`
- Bullet: "Bullish engulfing at support = demand confirmed. Body engulfs prior candle."
- Warhead: `warheads/demand-bullish-engulfing.md`
- Priority: guide
- Disclosure: once-gate

**A-008: DEMAND_CONSOLIDATION_BOTTOM**
- Condition: `task === 'zone_identification' && side === 'demand'`
- Bullet: "Consolidation bottom + rejection = demand. Price touched floor and bounced."
- Warhead: `warheads/demand-consolidation-bottom.md`
- Priority: guide
- Disclosure: once-gate

**A-009: LIQUIDITY_SWEEP**
- Condition: `task === 'zone_identification' && type === 'LIQUIDITY'`
- Bullet: "Liquidity sweep = long wick through level then reversal. Stop hunt."
- Warhead: `warheads/liquidity-sweep.md`
- Priority: guide
- Disclosure: once-gate

**A-010: LIQUIDITY_DOUBLE_TOP_TRAP**
- Condition: `task === 'zone_identification' && type === 'LIQUIDITY'`
- Bullet: "Double top ABOVE liquidity = smart money trap. Sweep then smash TP."
- Warhead: `warheads/liquidity-double-top-trap.md`
- Priority: guide
- Disclosure: once-gate

**A-011: LIQUIDITY_DOUBLE_BOTTOM_TRAP**
- Condition: `task === 'zone_identification' && type === 'LIQUIDITY'`
- Bullet: "Double bottom BELOW liquidity = smart money trap. Sweep then reverse."
- Warhead: `warheads/liquidity-double-bottom-trap.md`
- Priority: guide
- Disclosure: once-gate

**A-012: BOM_BODY_CRITERIA**
- Condition: `task === 'zone_identification' && classification === 'BoM'`
- Bullet: "BoM: body ≥ 65% of range AND body-to-wick ≥ 3.0 AND prior move NONE/OPPOSITE."
- Warhead: `warheads/bom-body-criteria.md`
- Priority: guide
- Disclosure: once-gate

**A-013: MOM_CONTINUATION**
- Condition: `task === 'zone_identification' && classification === 'MoM'`
- Bullet: "MoM = continuation candle mid-move. Prior move SAME direction as zone."
- Warhead: `warheads/mom-continuation.md`
- Priority: guide
- Disclosure: once-gate

**A-014: UNMITIGATED_PRIORITY**
- Condition: `task === 'zone_identification' && zone.reactionCount === 0`
- Bullet: "Unmitigated (not retested) = strongest entry. Price hasn't touched since formation."
- Warhead: `warheads/unmitigated-priority.md`
- Priority: guide
- Disclosure: once-gate

**A-015: MITIGATED_WEAKNESS**
- Condition: `task === 'zone_identification' && zone.reactionCount >= 1 && zone.reactionCount <= 2`
- Bullet: "Mitigated 1-2x = still valid but weaker. 1x=80%, 2x=50% reaction rate."
- Warhead: `warheads/mitigated-weakness.md`
- Priority: guide
- Disclosure: once-gate

**A-016: DEPLETED_TP_ONLY**
- Condition: `task === 'zone_identification' && zone.reactionCount >= 3`
- Bullet: "Depleted 3x+ = TP target only. Not an entry zone."
- Warhead: `warheads/depleted-tp-only.md`
- Priority: warn
- Disclosure: always

**A-017: ZONE_WIDTH_4H**
- Condition: `task === 'zone_identification' && timeframe === '4H'`
- Bullet: "4H zone width: 15-40 pips. Wider = less precise. Narrower = suspect."
- Warhead: `warheads/zone-width-4h.md`
- Priority: guide
- Disclosure: once-gate

**A-018: ZONE_WIDTH_1H**
- Condition: `task === 'zone_identification' && timeframe === '1H'`
- Bullet: "1H zone width: 8-25 pips. Wider = less precise."
- Warhead: `warheads/zone-width-1h.md`
- Priority: guide
- Disclosure: once-gate

**A-019: ZONE_WIDTH_30M**
- Condition: `task === 'zone_identification' && timeframe === '30m'`
- Bullet: "30m zone width: 5-15 pips."
- Warhead: `warheads/zone-width-30m.md`
- Priority: guide
- Disclosure: once-gate

**A-020: ZONE_WIDTH_15M**
- Condition: `task === 'zone_identification' && timeframe === '15m'`
- Bullet: "15m zone width: 3-10 pips."
- Warhead: `warheads/zone-width-15m.md`
- Priority: guide
- Disclosure: once-gate

**A-021: ZONE_SIDE_SUPPLY_ABOVE**
- Condition: `task === 'zone_identification' && type === 'SUPPLY'`
- Bullet: "Supply zone MUST be ABOVE spot for SHORT entry. Law 6."
- Warhead: `warheads/zone-side-supply.md`
- Priority: block
- Disclosure: always

**A-022: ZONE_SIDE_DEMAND_BELOW**
- Condition: `task === 'zone_identification' && type === 'DEMAND'`
- Bullet: "Demand zone MUST be BELOW spot for LONG entry. Law 6."
- Warhead: `warheads/zone-side-demand.md`
- Priority: block
- Disclosure: always

**A-023: FVG_IDENTIFICATION**
- Condition: `task === 'zone_identification'`
- Bullet: "FVG = gap between before/after candles surrounding inefficiency. Valid zone."
- Warhead: `warheads/fvg-identification.md`
- Priority: guide
- Disclosure: once-gate

**A-024: TIGHT_CONSOLIDATION**
- Condition: `task === 'zone_identification'`
- Bullet: "Tight consolidation = compressed range with aligned wick tips. Maps zone edges."
- Warhead: `warheads/tight-consolidation.md`
- Priority: guide
- Disclosure: once-gate

**A-025: PIN_BAR_REJECTION**
- Condition: `task === 'zone_identification'`
- Bullet: "Pin bar = long wick rejecting zone. 32% of winning entries use pin bars."
- Warhead: `warheads/pin-bar-rejection.md`
- Priority: guide
- Disclosure: once-gate

**A-026: INSIDE_BAR_COMPRESSION**
- Condition: `task === 'zone_identification'`
- Bullet: "Inside bar = small candle contained in prior. Compression before resolution."
- Warhead: `warheads/inside-bar-compression.md`
- Priority: guide
- Disclosure: once-gate

**A-027: BREAKOUT_CANDLE**
- Condition: `task === 'zone_identification'`
- Bullet: "Breakout candle = strong close beyond structure. Confirms zone break."
- Warhead: `warheads/breakout-candle.md`
- Priority: guide
- Disclosure: once-gate

**A-028: SWEEP_THICK_BODY**
- Condition: `task === 'zone_identification' && pattern === 'LIQUIDITY_SWEEP'`
- Bullet: "Sweep: 2 back-to-back thick bodies (≥1.5× avg) breaking level, wick ≥2 pips beyond."
- Warhead: `warheads/sweep-thick-body.md`
- Priority: guide
- Disclosure: once-gate

**A-029: LONG_WICK_PATTERN**
- Condition: `task === 'zone_identification' && pattern === 'LONG_WICK'`
- Bullet: "Long wick: wick ≥2.5× body AND ≥5 pips, followed by sharp move ≥15 pips in 3 bars."
- Warhead: `warheads/long-wick-pattern.md`
- Priority: guide
- Disclosure: once-gate

**A-030: SHORT_WICK_CONSOL**
- Condition: `task === 'zone_identification' && pattern === 'SHORT_WICK_CONSOL'`
- Bullet: "Short wick consol: 3+ candles, wicks ≤3 pips, tips align within 2 pips, span ≤25 pips."
- Warhead: `warheads/short-wick-consol.md`
- Priority: guide
- Disclosure: once-gate

### 3.2 Category B: Zone Validation Rules (25 nodes)

These nodes encode the rules for VALIDATING zones. They are matched by VCM when the harness is verifying agent-produced zones.

**B-001: ZONE_TOP_GT_BOTTOM**
- Condition: `task === 'zone_verification' && zone.top <= zone.bottom`
- Bullet: "BLOCKED: zone top must be > bottom. Structure invalid."
- Priority: block
- Disclosure: always

**B-002: ZONE_EVIDENCE_MIN_LENGTH**
- Condition: `task === 'zone_verification' && zone.visualEvidence.length < 20`
- Bullet: "BLOCKED: visualEvidence < 20 chars. Describe the SPECIFIC pattern."
- Priority: block
- Disclosure: always

**B-003: ZONE_EVIDENCE_PRICE_REF**
- Condition: `task === 'zone_verification' && !/\d+\.\d{3,}/.test(zone.visualEvidence)`
- Bullet: "BLOCKED: evidence needs exact price with 3+ decimals (e.g. 'at 1.1480')."
- Priority: block
- Disclosure: always

**B-004: ZONE_EVIDENCE_GENERIC**
- Condition: `task === 'zone_verification' && GENERIC_PATTERNS.some(p => zone.visualEvidence.toLowerCase() === p)`
- Bullet: "BLOCKED: generic evidence. Name the candlestick pattern with prices."
- Priority: block
- Disclosure: always

**B-005: ZONE_SCREENSHOT_EXISTS**
- Condition: `task === 'zone_verification' && !fs.existsSync(zone.sourceScreenshot)`
- Bullet: "BLOCKED: screenshot file not found. Capture via tv_screenshot first."
- Priority: block
- Disclosure: always

**B-006: ZONE_DISTANCE_FX**
- Condition: `task === 'zone_verification' && pair !== 'DXY' && Math.abs(zoneMid - spot) > 0.020`
- Bullet: "BLOCKED: zone > 200 pips from spot. Too far to be actionable."
- Priority: block
- Disclosure: always

**B-007: ZONE_DISTANCE_DXY**
- Condition: `task === 'zone_verification' && pair === 'DXY' && Math.abs(zoneMid - spot) > 2.00`
- Bullet: "BLOCKED: DXY zone > 2.00 points from spot."
- Priority: block
- Disclosure: always

**B-008: ZONE_TYPE_ENTRY_VALID**
- Condition: `task === 'zone_verification' && zone.type === 'IP'`
- Bullet: "BLOCKED: IP zones are NOT entry zones. Only S/D and LQZ zones are entries."
- Priority: block
- Disclosure: always

**B-009: ZONE_FRESHNESS_UNMITIGATED**
- Condition: `task === 'zone_verification' && zone.reactionCount === 0`
- Bullet: "Unmitigated zone (reactionCount=0) — highest priority entry."
- Priority: guide
- Disclosure: once-gate

**B-010: ZONE_FRESHNESS_MITIGATED**
- Condition: `task === 'zone_verification' && zone.reactionCount >= 1 && zone.reactionCount <= 2`
- Bullet: "Mitigated zone (1-2x) — still valid but weaker reaction expected."
- Priority: guide
- Disclosure: once-gate

**B-011: ZONE_FRESHNESS_DEPLETED**
- Condition: `task === 'zone_verification' && zone.reactionCount >= 3`
- Bullet: "WARN: depleted zone (3x+) — TP target only, not entry."
- Priority: warn
- Disclosure: always

**B-012: ZONE_WIDTH_4H_VALID**
- Condition: `task === 'zone_verification' && timeframe === '4H' && (zoneWidth < 15 || zoneWidth > 40)`
- Bullet: "WARN: 4H zone width outside 15-40 pips. Check zone boundaries."
- Priority: warn
- Disclosure: once-gate

**B-013: ZONE_WIDTH_1H_VALID**
- Condition: `task === 'zone_verification' && timeframe === '1H' && (zoneWidth < 8 || zoneWidth > 25)`
- Bullet: "WARN: 1H zone width outside 8-25 pips."
- Priority: warn
- Disclosure: once-gate

**B-014: ZONE_BOM_CRITERIA**
- Condition: `task === 'zone_verification' && zone.classification === 'BoM' && !bomBodyCriteriaMet(zone)`
- Bullet: "WARN: BoM without body criteria (≥65% body, ≥3.0 body-to-wick). Verify."
- Priority: warn
- Disclosure: once-gate

**B-015: ZONE_LIQUIDITY_SCORE**
- Condition: `task === 'zone_verification' && zone.liquidityScore < 5 && isTpTarget(zone)`
- Bullet: "WARN: liquidityScore < 5 — insufficient 'wood for the fire' for TP target."
- Priority: warn
- Disclosure: once-gate

**B-016: ZONE_CONFIDENCE_RANGE**
- Condition: `task === 'zone_verification' && (zone.confidence < 0 || zone.confidence > 100)`
- Bullet: "BLOCKED: confidence must be 0-100."
- Priority: block
- Disclosure: always

**B-017: ZONE_TIMEFRAME_VALID**
- Condition: `task === 'zone_verification' && !['4H','1H','30m','15m'].includes(zone.timeframe)`
- Bullet: "BLOCKED: timeframe must be 4H, 1H, 30m, or 15m."
- Priority: block
- Disclosure: always

**B-018: ZONE_TYPE_VALID**
- Condition: `task === 'zone_verification' && !['SUPPLY','DEMAND','LIQUIDITY'].includes(zone.type)`
- Bullet: "BLOCKED: type must be SUPPLY, DEMAND, or LIQUIDITY."
- Priority: block
- Disclosure: always

**B-019: ZONE_CLASSIFICATION_VALID**
- Condition: `task === 'zone_verification' && !['BoM','MoM','UNMITIGATED'].includes(zone.classification)`
- Bullet: "BLOCKED: classification must be BoM, MoM, or UNMITIGATED."
- Priority: block
- Disclosure: always

**B-020: ZONE_SOURCE_VALID**
- Condition: `task === 'zone_verification' && !['VLM_CONFIRMED','VLM_NEW'].includes(zone.source)`
- Bullet: "BLOCKED: source must be VLM_CONFIRMED or VLM_NEW."
- Priority: block
- Disclosure: always

**B-021: ZONE_BOTH_SIDES**
- Condition: `task === 'zone_verification' && pairZones.every(z => z.type === 'SUPPLY')`
- Bullet: "WARN: only supply zones found — also look for demand below spot."
- Priority: warn
- Disclosure: once-gate

**B-022: ZONE_BOTH_SIDES_DEMAND**
- Condition: `task === 'zone_verification' && pairZones.every(z => z.type === 'DEMAND')`
- Bullet: "WARN: only demand zones found — also look for supply above spot."
- Priority: warn
- Disclosure: once-gate

**B-023: ZONE_SPREAD**
- Condition: `task === 'zone_verification' && allZonesWithinPips(pairZones, spot, 10)`
- Bullet: "WARN: all zones within 10 pips of spot — spread across the range."
- Priority: warn
- Disclosure: once-gate

**B-024: ZONE_MINIMUM_COUNT**
- Condition: `task === 'zone_verification' && pairZones.length < 3`
- Bullet: "BLOCKED: < 3 validated zones for pair. Minimum 3 required."
- Priority: block
- Disclosure: always

**B-025: ZONE_DEDUP_EXACT**
- Condition: `task === 'zone_verification' && isDuplicate(zone, existingZones)`
- Bullet: "Duplicate zone (same type + entry at full precision). Keeping first."
- Priority: guide
- Disclosure: once-gate

### 3.3 Category C: Visual Evidence Requirements (15 nodes)

**C-001: EVIDENCE_ENGULFING**
- Bullet: "Engulfing = current candle body completely engulfs prior. 47% of winning entries."
- Priority: guide
- Disclosure: once-gate

**C-002: EVIDENCE_PIN_BAR**
- Bullet: "Pin bar = long wick rejecting zone. 32% of winning entries."
- Priority: guide
- Disclosure: once-gate

**C-003: EVIDENCE_INSIDE_BAR**
- Bullet: "Inside bar = small candle contained in prior. 21% of winning entries."
- Priority: guide
- Disclosure: once-gate

**C-004: EVIDENCE_BREAKOUT**
- Bullet: "Breakout candle = strong close beyond structure. 16% of winning entries."
- Priority: guide
- Disclosure: once-gate

**C-005: EVIDENCE_CANDLE_POSITION**
- Bullet: "Reference candle position: '3rd from right', 'large bearish at 14:00'."
- Priority: guide
- Disclosure: once-gate

**C-006: EVIDENCE_PRICE_AXIS**
- Bullet: "Map zone boundaries to chart's price axis (right side numbers)."
- Priority: guide
- Disclosure: once-gate

**C-007: EVIDENCE_PATTERN_COMBO**
- Bullet: "Combo evidence: 'engulfing + 3-wick rejection from 1.1480 supply'."
- Priority: guide
- Disclosure: once-gate

**C-008: EVIDENCE_NO_VAGUE**
- Bullet: "BLOCKED: vague evidence. Name the EXACT pattern with EXACT prices."
- Priority: block
- Disclosure: always

**C-009: EVIDENCE_WICK_VS_BODY**
- Bullet: "Wick rejection = price probed and pushed back. Body = sustained direction."
- Priority: guide
- Disclosure: once-gate

**C-010: EVIDENCE_UNMITIGATED_PROOF**
- Bullet: "Unmitigated proof: no candle has entered the zone since formation."
- Priority: guide
- Disclosure: once-gate

**C-011: EVIDENCE_SWEEP_CONFIRM**
- Bullet: "Sweep confirmed: wick beyond level + sharp reversal ≥15 pips in 3 bars."
- Priority: guide
- Disclosure: once-gate

**C-012: EVIDENCE_CONSOLIDATION_EDGES**
- Bullet: "Consolidation edges: aligned wick tips at same level within 2 pips."
- Priority: guide
- Disclosure: once-gate

**C-013: EVIDENCE_ORDER_BLOCK_ORIGIN**
- Bullet: "OB origin: candle BEFORE the sharp move. Mark its high/low."
- Priority: guide
- Disclosure: once-gate

**C-014: EVIDENCE_BOS_CONFIRM**
- Bullet: "BoS confirmed: price broke structure (higher high or lower low)."
- Priority: guide
- Disclosure: once-gate

**C-015: EVIDENCE_REJECTION_COUNT**
- Bullet: "Count rejections: '3 consecutive upper wicks from 1.1500' = strong supply."
- Priority: guide
- Disclosure: once-gate

### 3.4 Category D: Anti-Pattern Detection (15 nodes)

**D-001: VAP-001_CLAIM_WITHOUT_SCREENSHOT**
- Condition: `task === 'zone_identification' && !agentHasReadScreenshot`
- Bullet: "BLOCKED: read() the screenshot first — then produce ZONE| lines."
- Priority: block
- Disclosure: always

**D-002: VAP-002_COMPUTATIONAL_INSTEAD_OF_VISUAL**
- Condition: `task === 'zone_identification' && agentComputedInsteadOfSeeing`
- Bullet: "WARN: you computed zones instead of seeing them. Read the chart."
- Priority: warn
- Disclosure: always

**D-003: VAP-003_STALE_SCREENSHOT**
- Condition: `task === 'zone_identification' && screenshotAge > 300_000`
- Bullet: "WARN: screenshot is > 5 minutes old. Re-capture for fresh data."
- Priority: warn
- Disclosure: once-gate

**D-004: VAP-004_PHANTOM_ZONE**
- Condition: `task === 'zone_verification' && !hasVisibleCandleEvidence(zone, screenshot)`
- Bullet: "BLOCKED: zone has no visible candlestick evidence on chart."
- Priority: block
- Disclosure: always

**D-005: VAP-005_RECTANGLE_ONLY**
- Condition: `task === 'zone_identification' && agentOnlyConfirmedRectangles`
- Bullet: "WARN: you confirmed rectangles without reading candle structure. Look deeper."
- Priority: warn
- Disclosure: always

**D-006: VAP-006_NO_PRICE_AXIS**
- Condition: `task === 'zone_identification' && zoneBoundariesNotFromPriceAxis`
- Bullet: "BLOCKED: zone boundaries must come from the chart's price axis numbers."
- Priority: block
- Disclosure: always

**D-007: VAP-007_BASE64_CONFUSION**
- Condition: `task === 'zone_identification' && agentTriedToReadBase64`
- Bullet: "BLOCKED: read() the .png file — base64 text is not an image."
- Priority: block
- Disclosure: always

**D-008: VAP-008_OMNI_VISION_MISUSE**
- Condition: `task === 'zone_identification' && agentCalledOmniVision`
- Bullet: "BLOCKED: use read() directly — omni-vision is for VIDEO only."
- Priority: block
- Disclosure: always

**D-009: VAP-009_ONE_SIDED**
- Condition: `task === 'zone_verification' && allZonesSameSide(pairZones)`
- Bullet: "WARN: only one side identified. Look for both supply AND demand."
- Priority: warn
- Disclosure: once-gate

**D-010: VAP-010_CLUSTERED_ZONES**
- Condition: `task === 'zone_verification' && allZonesWithinPips(pairZones, spot, 10)`
- Bullet: "WARN: zones clustered near spot. Spread across the visible range."
- Priority: warn
- Disclosure: once-gate

**D-011: VAP-011_GENERIC_EVIDENCE**
- Condition: `task === 'zone_verification' && isGenericEvidence(zone.visualEvidence)`
- Bullet: "BLOCKED: generic evidence. Name the EXACT pattern with EXACT prices."
- Priority: block
- Disclosure: always

**D-012: VAP-012_MISSING_ZONE**
- Condition: `task === 'zone_verification' && pairZones.length === 0`
- Bullet: "BLOCKED: zero zones identified for pair. Read the chart and identify zones."
- Priority: block
- Disclosure: always

**D-013: VAP-013_WRONG_TIMEFRAME**
- Condition: `task === 'zone_identification' && timeframe !== '4H'`
- Bullet: "WARN: use 4H chart for zone identification. 4H shows institutional structure."
- Priority: warn
- Disclosure: once-gate

**D-014: VAP-014_IGNORED_LQZ**
- Condition: `task === 'zone_identification' && !identifiedAnyLqz`
- Bullet: "WARN: no liquidity zones identified. Look for stop hunts (long wicks)."
- Priority: warn
- Disclosure: once-gate

**D-015: VAP-015_WRONG_PAIR**
- Condition: `task === 'zone_identification' && pairMismatch(zone.pair, screenshot.pair)`
- Bullet: "BLOCKED: zone pair doesn't match screenshot pair."
- Priority: block
- Disclosure: always

### 3.5 Category E: Confluence Scoring (10 nodes)

**E-001: CONFLUENCE_EARTH_FIRE**
- Bullet: "Earth+Fire: S/D zone overlapping LQZ = double reaction. TP at midpoint."
- Priority: guide
- Disclosure: once-gate

**E-002: CONFLUENCE_IP_OVERLAP**
- Bullet: "IP zone overlap with entry zone = +2 confluence. Tier 1 POI."
- Priority: guide
- Disclosure: once-gate

**E-003: CONFLUENCE_DUAL_TF**
- Bullet: "Dual-TF zone overlap = +3 confluence. Refined zones preferred."
- Priority: guide
- Disclosure: once-gate

**E-004: CONFLUENCE_TRIPLE_TF**
- Bullet: "Triple-TF zone overlap = +5 confluence. Highest priority entry."
- Priority: guide
- Disclosure: once-gate

**E-005: CONFLUENCE_LIQUIDITY_SCORE**
- Bullet: "liquidityScore 0-10. TP zones need ≥5. 'Wood for the fire.'"
- Priority: guide
- Disclosure: once-gate

**E-006: CONFLUENCE_BOM_BONUS**
- Bullet: "BoM zone = +5 confidence bonus. Deepest institutional commitment."
- Priority: guide
- Disclosure: once-gate

**E-007: CONFLUENCE_VLM_BONUS**
- Bullet: "VLM-sourced zone = +7 confidence. Visual confirmation > fallback."
- Priority: guide
- Disclosure: once-gate

**E-008: CONFLUENCE_UNMITIGATED_BONUS**
- Bullet: "Unmitigated zone = +10 freshness bonus. 100% reaction rate."
- Priority: guide
- Disclosure: once-gate

**E-009: CONFLUENCE_REACTION_PENALTY**
- Bullet: "3x+ reactions = -5 penalty. Depleted zone."
- Priority: guide
- Disclosure: once-gate

**E-010: CONFLUENCE_CASCADE_BONUS**
- Bullet: "Cascade-aligned (DXY macro direction matches) = +10 for FX HTF swings."
- Priority: guide
- Disclosure: once-gate

### 3.6 Category F: Shape-Zone Relationship (5 nodes)

**F-001: SS_CEILING_FLOOR**
- Bullet: "SS = scalp at consolidation ceiling AND floor. Both boundaries valid."
- Priority: guide
- Disclosure: once-gate

**F-002: BS_FAILING_ZONE**
- Bullet: "BS = entry at the FAILING zone (zfp > 45%). Breakout direction."
- Priority: guide
- Disclosure: once-gate

**F-003: WL_HARD_WALL**
- Bullet: "WL = entry at Hard Wall (zfp < 20%). Rejection entry."
- Priority: guide
- Disclosure: once-gate

**F-004: RWL_HARD_WALL_REVERSE**
- Bullet: "RWL = entry at Hard Wall in OPPOSITE direction of preceding BS."
- Priority: guide
- Disclosure: once-gate

**F-005: R_MID_RANGE**
- Bullet: "R = entry at mid-range zone (zfp 20-40%). Recovery entry."
- Priority: guide
- Disclosure: once-gate

---

## 4. VISUAL CONTEXT MATCHER (VCM) — 8-PHASE PIPELINE

The VCM is a deterministic matching engine that selects the most relevant VKG nodes for the current context. It runs on every zone identification and verification task. Zero model inference.

### 4.1 VCM Architecture

```typescript
interface AgentState {
  task: 'zone_identification' | 'zone_verification' | 'setup_generation';
  pair: string;
  timeframe: string;
  spot: number;
  zonesDrawn: number;
  screenshotsRead: string[];
  agentHasReadScreenshot: boolean;
  currentShape: string;
  dayShape: string;
}

interface MatchedNode {
  node: VKGNode;
  score: number;
  phase: number;
}

class VisualContextMatcher {
  private nodes: Map<string, VKGNode>;
  
  constructor(nodes: VKGNode[]) {
    this.nodes = new Map(nodes.map(n => [n.id, n]));
  }

  match(state: AgentState): MatchedNode[] {
    // 8-phase pipeline
    let candidates = this.phase1_filterByTask(state.task);
    candidates = this.phase2_filterByPair(candidates, state.pair);
    candidates = this.phase3_filterByTimeframe(candidates, state.timeframe);
    candidates = this.phase4_evaluateConditions(candidates, state);
    candidates = this.phase5_scoreRelevance(candidates, state);
    candidates = this.phase6_sortByScore(candidates);
    candidates = this.phase7_takeTopN(candidates, 5);
    return this.phase8_formatResults(candidates);
  }

  private phase1_filterByTask(task: string): VKGNode[] {
    return Array.from(this.nodes.values()).filter(n => 
      n.taskTypes.includes(task)
    );
  }

  private phase2_filterByPair(nodes: VKGNode[], pair: string): VKGNode[] {
    return nodes.filter(n => 
      !n.pairs || n.pairs.includes(pair)
    );
  }

  private phase3_filterByTimeframe(nodes: VKGNode[], tf: string): VKGNode[] {
    return nodes.filter(n => 
      !n.timeframes || n.timeframes.includes(tf)
    );
  }

  private phase4_evaluateConditions(nodes: VKGNode[], state: AgentState): VKGNode[] {
    return nodes.filter(n => n.condition(state));
  }

  private phase5_scoreRelevance(nodes: VKGNode[], state: AgentState): MatchedNode[] {
    return nodes.map(n => ({
      node: n,
      score: this.computeRelevanceScore(n, state),
      phase: 5,
    }));
  }

  private computeRelevanceScore(node: VKGNode, state: AgentState): number {
    let score = 0;
    // Priority weight
    if (node.priority === 'block') score += 100;
    else if (node.priority === 'warn') score += 50;
    else score += 25;
    // Category weight
    if (node.category === 'anti_pattern') score += 30;
    else if (node.category === 'validation') score += 20;
    else if (node.category === 'identification') score += 15;
    else if (node.category === 'evidence') score += 10;
    // Disclosure weight (never shown before = higher priority)
    if (node.disclosure === 'always') score += 20;
    else if (node.disclosure === 'once-gate') score += 10;
    else if (node.disclosure === 'once-session') score += 5;
    return score;
  }

  private phase6_sortByScore(nodes: MatchedNode[]): MatchedNode[] {
    return [...nodes].sort((a, b) => b.score - a.score);
  }

  private phase7_takeTopN(nodes: MatchedNode[], n: number): MatchedNode[] {
    return nodes.slice(0, n);
  }

  private phase8_formatResults(nodes: MatchedNode[]): MatchedNode[] {
    return nodes;
  }
}
```

### 4.2 Performance Budget

| Metric | Budget | Technique |
|--------|--------|-----------|
| VCM invocation | < 2ms | Map.get() for O(1) lookup, early-exit on score threshold |
| Node evaluation | < 0.01ms per node | Boolean condition evaluation only, no string operations |
| Full match cycle | < 5ms | 100 nodes × 8 phases, most nodes eliminated in phase 1-2 |

### 4.3 VCM Integration

```typescript
// In the TVI hook (tool.execute.before for plutus-pipeline-setups)
const vcm = new VisualContextMatcher(vkgNodes);
const matched = vcm.match({
  task: 'zone_verification',
  pair: args.validatedZones[0]?.pair ?? 'DXY',
  timeframe: '4H',
  spot: ctx.harvestData?.spots[pair] ?? 0,
  zonesDrawn: ctx.zonesDrawn ?? 0,
  screenshotsRead: ctx.screenshotsRead ?? [],
  agentHasReadScreenshot: ctx.screenshotsRead.length > 0,
  currentShape: ctx.shapeSnapshot?.currentShape ?? 'SS',
  dayShape: ctx.shapeSnapshot?.dayDecomposition?.[0]?.shape ?? 'SS',
});

// Use matched nodes for guidance
for (const m of matched) {
  if (m.node.priority === 'block') {
    output.system.push(`[TVI BLOCK] ${m.node.bullet}`);
    throw new Error(`[TVI] ${m.node.bullet}`);
  } else if (m.node.priority === 'warn') {
    output.system.push(`[TVI WARN] ${m.node.bullet}`);
  } else {
    output.system.push(`[TVI GUIDE] ${m.node.bullet}`);
  }
}
```

---

## 5. VISUAL ENFORCEMENT BRAIN (VEB) — PRE/POST GATES

The VEB is the enforcement layer that gates the agent's zone identification and the harness's zone verification. Only `tool.execute.before` may BLOCK (throw). All other hooks are non-blocking.

### 5.1 Pre-Action Gates (tool.execute.before)

These gates fire BEFORE the setups tool executes. They BLOCK (throw) if the agent hasn't done the required visual work.

**GATE P1: MUST_READ_SCREENSHOT**
```typescript
if (!ctx.screenshotsRead || ctx.screenshotsRead.length === 0) {
  output.system.push('[TVI BLOCK] You have not read any chart screenshots. Call read() on the PNG files first, then produce ZONE| lines.');
  throw new Error('[TVI] MUST_READ_SCREENSHOT: read() the chart screenshots before calling plutus-pipeline-setups.');
}
```

**GATE P2: MINIMUM_ZONES**
```typescript
const validZones = args.validatedZones.filter(z => 
  z.source === 'VLM_CONFIRMED' || z.source === 'VLM_NEW'
);
if (validZones.length < 3) {
  output.system.push(`[TVI BLOCK] Only ${validZones.length} validated zones (need ≥3). Read the charts and identify more zones — both supply and demand.`);
  throw new Error(`[TVI] MINIMUM_ZONES: ${validZones.length}/3 validated zones. Produce more.`);
}
```

**GATE P3: BOTH_SIDES_REQUIRED**
```typescript
for (const pair of pairs) {
  const pairZones = validZones.filter(z => z.pair === pair);
  const hasSupply = pairZones.some(z => z.type === 'SUPPLY');
  const hasDemand = pairZones.some(z => z.type === 'DEMAND');
  if (!hasSupply && !hasDemand) {
    output.system.push(`[TVI BLOCK] ${pair}: no zones identified. Read the chart and identify both supply AND demand zones.`);
    throw new Error(`[TVI] BOTH_SIDES: ${pair} has zero zones.`);
  }
  if (!hasSupply || !hasDemand) {
    output.system.push(`[TVI WARN] ${pair}: only ${hasSupply ? 'SUPPLY' : 'DEMAND'} zones found. Also look for ${hasSupply ? 'DEMAND' : 'SUPPLY'} zones ${hasSupply ? 'below' : 'above'} spot.`);
    // WARN only — don't block, but flag the one-sided identification
  }
}
```

**GATE P4: NO_IP_ZONES_AS_ENTRIES**
```typescript
for (const vz of args.validatedZones) {
  if (vz.type === 'IP' || vz.source === 'FALLBACK_IP_EDGE') {
    output.system.push(`[TVI BLOCK] IP zones are NOT entry zones. Only S/D (BoM/MoM) and LQZ zones are valid entries. Remove IP zones and re-identify.`);
    throw new Error(`[TVI] NO_IP_ENTRIES: IP zones are not entry zones.`);
  }
}
```

**GATE P5: SCREENSHOT_FRESHNESS**
```typescript
for (const shot of ctx.screenshots) {
  const age = Date.now() - shot.capturedAt;
  if (age > 600_000) { // 10 minutes
    output.system.push(`[TVI WARN] Screenshot for ${shot.pair} is ${Math.round(age/1000)}s old (>10min). Consider re-capturing for fresh data.`);
    // WARN only
  }
}
```

### 5.2 Post-Action Gates (tool.execute.after)

These gates fire AFTER the setups tool executes. They verify the output and log enforcement decisions. They are non-blocking (they record, they don't throw).

**GATE V1: ZONE_STRUCTURE_VALID**
```typescript
for (const vz of validatedZones) {
  if (vz.top <= vz.bottom) {
    log.warn(`[TVI] ZONE_STRUCTURE: ${vz.pair} ${vz.type} top (${vz.top}) <= bottom (${vz.bottom}) — invalid`);
    vst.recordViolation('ZONE_STRUCTURE', vz);
  }
}
```

**GATE V2: EVIDENCE_SPECIFIC**
```typescript
for (const vz of validatedZones) {
  const evidence = vz.visualEvidence.toLowerCase();
  const GENERIC = ['zone confirmed', 'looks good', 'valid zone', 'order block', 'confirmed zone', 'validated'];
  if (GENERIC.some(g => evidence === g) || evidence.length < 20) {
    log.warn(`[TVI] EVIDENCE_GENERIC: ${vz.pair} ${vz.type} evidence too generic: "${vz.visualEvidence}"`);
    vst.recordViolation('EVIDENCE_GENERIC', vz);
  }
  if (!/\d+\.\d{3,}/.test(vz.visualEvidence)) {
    log.warn(`[TVI] EVIDENCE_NO_PRICE: ${vz.pair} ${vz.type} evidence lacks price reference`);
    vst.recordViolation('EVIDENCE_NO_PRICE', vz);
  }
}
```

**GATE V3: ZONE_DISTANCE_VALID**
```typescript
for (const vz of validatedZones) {
  const zoneMid = (vz.top + vz.bottom) / 2;
  const maxDist = vz.pair === 'DXY' ? 2.00 : 0.020;
  if (Math.abs(zoneMid - spot) > maxDist) {
    log.warn(`[TVI] ZONE_DISTANCE: ${vz.pair} ${vz.type} at ${zoneMid} is ${Math.abs(zoneMid - spot).toFixed(4)} from spot ${spot} (max ${maxDist})`);
    vst.recordViolation('ZONE_DISTANCE', vz);
  }
}
```

**GATE V4: ZONE_TYPE_ENTRY_VALID**
```typescript
for (const vz of validatedZones) {
  const isSdZone = vz.classification === 'BoM' || vz.classification === 'MoM';
  const isLqzZone = vz.type === 'LIQUIDITY';
  if (!isSdZone && !isLqzZone) {
    log.warn(`[TVI] ZONE_TYPE: ${vz.pair} ${vz.type} is not S/D or LQZ — not a valid entry zone`);
    vst.recordViolation('ZONE_TYPE', vz);
  }
}
```

**GATE V5: ZONE_FRESHNESS_CHECK**
```typescript
for (const vz of validatedZones) {
  if (vz.reactionCount >= 3) {
    log.warn(`[TVI] ZONE_FRESHNESS: ${vz.pair} ${vz.type} has ${vz.reactionCount} reactions — depleted, TP only`);
    vst.recordViolation('ZONE_FRESHNESS', vz);
  }
}
```

### 5.3 VEB Hook Wiring

```typescript
// In the TVI plugin hooks (index.ts)
return {
  'tool.execute.before': async (input, output) => {
    if (input.tool === 'plutus-pipeline-setups') {
      await veb.preActionGates(input, output, ctx);
    }
  },
  'tool.execute.after': async (input, output) => {
    if (input.tool === 'plutus-pipeline-setups') {
      await veb.postActionGates(input, output, ctx);
    }
    if (input.tool === 'plutus-pipeline-charts') {
      await veb.recordScreenshots(input, output, ctx);
    }
    if (input.tool === 'read') {
      await veb.recordImageRead(input, output, ctx);
    }
  },
  'experimental.chat.system.transform': (input, output) => {
    vgs.injectGuidance(output, ctx);
  },
};
```

---

## 6. ZONE IDENTIFICATION PROTOCOL (ZIP) — THE AGENT'S VISUAL TASK

The ZIP is the exact protocol the agent follows when identifying zones from chart screenshots. It combines the Bible Part 3.6 VLM prompt structure with SMC_Master_Notes visual identification guidance and the VC VEE enforcement patterns.

### 6.1 ZIP Phase 1: Draw Visual Anchors

The agent draws Engine 1 S/D and LQZ zones on TradingView charts as visual anchors. These are NOT the zones themselves — they are reference points that help the agent focus its visual attention.

```
FOR EACH PAIR (DXY FIRST — DXY IS THE MASTER COMPASS):

1. tv_navigate({ url: "https://www.tradingview.com/chart/?symbol={SYMBOL}&interval=240" })
   - DXY: TVC:DXY
   - EUR/USD: FX:EURUSD
   - GBP/USD: FX:GBPUSD
   - AUD/USD: FX:AUDUSD

2. tv_set_timeframe({ timeframe: "4H" })
   - 4H shows institutional structure (order blocks, BoM/MoM zones)
   - 1H shows liquidity zones (LQZ patterns)
   - Use 4H for zone identification (institutional structure)

3. For each Engine 1 S/D zone (from zones tool output):
   a. tv_find_price_y({ price: zone.ceiling }) → y_top
   b. tv_find_price_y({ price: zone.floor }) → y_bottom
   c. tv_draw_rectangle({ x1: 200, y1: y_top, x2: 1700, y2: y_bottom })
      - SUPPLY zones: red rectangle (price rejected DOWN)
      - DEMAND zones: green rectangle (price rejected UP)

4. For each Engine 1 LQZ zone (from zones tool output):
   a. tv_find_price_y({ price: zone.top }) → y_top
   b. tv_find_price_y({ price: zone.bottom }) → y_bottom
   c. tv_draw_rectangle({ x1: 200, y1: y_top, x2: 1700, y2: y_bottom })
      - LQZ zones: blue rectangle (liquidity/stop-hunt area)

5. Draw at least the top 5 supply and top 5 demand zones per pair.
   - More is better — draw ALL S/D and LQZ zones if possible.
   - The rectangles help you FOCUS on the right price levels.

6. tv_screenshot() → capture the chart WITH zones drawn.

7. plutus-save-screenshot({ data: <base64 from tv_screenshot>, filePath: "/tmp/plutus_{pair}_4H.png" })
   - This saves a REAL binary PNG. Do NOT use write() for images.
```

### 6.2 ZIP Phase 2: Read and Identify

The agent reads the screenshot via read() and identifies zones from the actual candlestick structure. This is the PERCEPTION step — the agent uses its visual intelligence to see patterns that mechanical detectors might miss.

```
You ARE PLUTUS TTE, a trading expert with 37 fundamental laws.
You have just drawn Engine 1 zones on a {PAIR} chart and captured a screenshot.
Read this screenshot with read() and identify ALL supply, demand, and liquidity zones near current price (spot: {spot}).

For each zone, write EXACTLY this format (one per line):
ZONE|type|top|bottom|timeframe|classification|confidence|evidence

Where:
- type: SUPPLY or DEMAND or LIQUIDITY
- top/bottom: exact price levels from the chart's price axis (right side of chart — the numbers)
- timeframe: 4H
- classification: BoM or MoM or UNMITIGATED
- confidence: 0-100 (how clearly you can see this zone)
- evidence: specific candlestick pattern with exact prices (e.g. "bearish engulfing at 1.1480 with 3 upper wicks rejecting from 1.1500")

List at least 5 zones per pair. Both supply AND demand required.

WHAT TO LOOK FOR (from SMC_Master_Notes):

1. ORDER BLOCKS (the most important pattern):
   - Find a drastic and sharp price move (inefficiency)
   - Identify the candle BEFORE the move
   - Mark the high and low of that candle's wicks to form an OB zone
   - Must create break of structure (higher high or lower low)
   - One time use: unmitigated (price HAS NOT retested since formation) = strongest
   - Look for OBs that are pushing price in the current trend direction

2. SUPPLY zones (price rejected DOWN):
   - Bearish order blocks: candle before sharp move down
   - Upper wick clusters: 3+ candles rejecting the SAME high
   - Bearish engulfing at resistance: current candle body engulfs prior
   - Consolidation tops: price touched ceiling and reversed
   - Double top with liquidity sweep above

3. DEMAND zones (price rejected UP):
   - Bullish order blocks: candle before sharp move up
   - Lower wick clusters: 3+ candles rejecting the SAME low
   - Bullish engulfing at support: current candle body engulfs prior
   - Consolidation bottoms: price touched floor and bounced
   - Double bottom with liquidity sweep below

4. LIQUIDITY zones (stop-hunt/sweep areas):
   - Long wicks where price spiked through a level then reversed
   - Just beyond visible swing highs/lows or round numbers
   - Smart money traps at chart patterns (double top above liquidity, double bottom below liquidity)
   - Trendline break liquidity traps

5. CONFIRM drawn zones:
   - The colored rectangles on the chart are Engine 1 zones
   - If a rectangle ALIGNS with a real candlestick pattern, mark VLM_CONFIRMED with confidence 70+
   - If a rectangle does NOT align with any pattern, mark confidence 30 (weak)

6. FIND NEW ZONES (VLM_NEW):
   - Also identify zones you can SEE that were NOT drawn by Engine 1
   - These are zones the Engine 1 analysis missed
   - Actively hunt for them — they are often the best entries
   - Look for unmitigated order blocks and liquidity sweeps that weren't in the Engine 1 output

7. UNMITIGATED zones get priority:
   - Zones price has NOT retested since formation are the strongest entries
   - Check: has any candle entered the zone since it formed? If not, it's unmitigated.

DO NOT:
- Use plutus-omni-vision (that is for VIDEO only)
- Try to read base64 text (read() on .png renders the image directly)
- Write generic evidence ("zone confirmed", "looks good", "valid zone", "order block" without specifics) — describe the EXACT pattern with EXACT prices
- Skip pairs — ALL 4 pairs required
- Only look at one side — you MUST find both supply AND demand zones
- Just confirm rectangles — look for the actual candlestick patterns behind them

EXAMPLE OUTPUT (for DXY at spot 100.95):
ZONE|SUPPLY|101.14|101.19|4H|MoM|85|bearish engulfing at 101.150 with 3 consecutive upper wicks rejecting from 101.190 supply zone
ZONE|SUPPLY|101.23|101.24|4H|BoM|90|bearish order block at 101.235 with strong body covering 70% of range, break of structure below 101.190
ZONE|DEMAND|100.84|100.95|4H|MoM|80|bullish engulfing at 100.945 with double-bottom wick rejection from 100.845 demand
ZONE|DEMAND|100.67|100.80|4H|BoM|75|bullish order block at 100.667 with break of structure above 100.920, unmitigated
ZONE|LIQUIDITY|100.97|100.98|4H|MoM|85|liquidity sweep at 100.975 with long lower wick through 100.945 then sharp reversal up 25 pips in 2 bars
```

### 6.3 ZIP Phase 3: Harness Parses and Verifies

The harness receives the agent's ZONE| lines and validates each one deterministically. This is the DECIDE step — the harness decides which zones are valid for Engine 3.

```typescript
function parseZoneLines(agentResponse: string, pair: string, screenshotPath: string): ValidatedZone[] {
  const zoneLines = agentResponse.split('\n').filter(l => l.startsWith('ZONE|'));
  const validatedZones: ValidatedZone[] = [];
  
  for (const line of zoneLines) {
    const parts = line.split('|');
    if (parts.length < 7) {
      log.warn(`[TVI] PARSE_SKIP: malformed ZONE line (need ≥7 parts): "${line}"`);
      continue;
    }
    
    const zone: ValidatedZone = {
      pair,
      type: parts[1].trim().toUpperCase() as ZoneType,
      top: parseFloat(parts[2]),
      bottom: parseFloat(parts[3]),
      timeframe: parts[4].trim() || '4H',
      classification: parts[5].trim() || 'UNMITIGATED',
      source: 'VLM_CONFIRMED', // or VLM_NEW if agent marked it
      confidence: parseFloat(parts[6]) || 60,
      visualEvidence: parts[7]?.trim() || '',
      sourceScreenshot: screenshotPath,
      reactionCount: 0, // populated by Engine 1 enrichment
      liquidityScore: 0, // populated by Engine 1 enrichment
    };
    
    // HARNESS VERIFICATION (deterministic, zero model inference)
    const verification = verifyZone(zone, pair);
    if (verification.passed) {
      validatedZones.push(zone);
    } else {
      log.info(`[TVI] REJECTED: ${zone.pair} ${zone.type} ${zone.top}-${zone.bottom} — ${verification.reason}`);
      vst.recordRejection(zone, verification.reason);
    }
  }
  
  return validatedZones;
}

function verifyZone(zone: ValidatedZone, pair: string): { passed: boolean; reason: string } {
  // Structure: top > bottom
  if (zone.top <= zone.bottom) {
    return { passed: false, reason: `top (${zone.top}) <= bottom (${zone.bottom})` };
  }
  
  // Type valid
  if (!['SUPPLY', 'DEMAND', 'LIQUIDITY'].includes(zone.type)) {
    return { passed: false, reason: `invalid type: ${zone.type}` };
  }
  
  // Evidence: ≥ 20 chars
  if (zone.visualEvidence.length < 20) {
    return { passed: false, reason: `evidence < 20 chars` };
  }
  
  // Evidence: has price reference (3+ decimals)
  if (!/\d+\.\d{3,}/.test(zone.visualEvidence)) {
    return { passed: false, reason: `no price reference in evidence` };
  }
  
  // Evidence: not generic
  const GENERIC = ['zone confirmed', 'looks good', 'valid zone', 'order block', 'confirmed zone', 'validated'];
  if (GENERIC.some(g => zone.visualEvidence.toLowerCase() === g)) {
    return { passed: false, reason: `generic evidence: "${zone.visualEvidence}"` };
  }
  
  // Distance: within ±200 pips FX / ±2.00 DXY of spot
  const zoneMid = (zone.top + zone.bottom) / 2;
  const maxDist = pair === 'DXY' ? 2.00 : 0.020;
  if (Math.abs(zoneMid - spot) > maxDist) {
    return { passed: false, reason: `zone at ${zoneMid} too far from spot ${spot} (max ${maxDist})` };
  }
  
  // Screenshot exists
  if (!fs.existsSync(zone.sourceScreenshot)) {
    return { passed: false, reason: `screenshot not found: ${zone.sourceScreenshot}` };
  }
  
  // Zone type appropriate for entry (S/D or LQZ, NOT IP)
  const isSdZone = zone.classification === 'BoM' || zone.classification === 'MoM';
  const isLqzZone = zone.type === 'LIQUIDITY';
  if (!isSdZone && !isLqzZone && zone.classification !== 'UNMITIGATED') {
    return { passed: false, reason: `not S/D or LQZ zone (classification: ${zone.classification})` };
  }
  
  return { passed: true, reason: '' };
}
```

### 6.4 ZIP Phase 4: Engine 1 Enrichment

After the harness verifies zones, it enriches them with Engine 1 metadata (confluence, zfp, reactionCount, liquidityScore, mappedIPZoneName) by matching to the nearest Engine 1 zone.

```typescript
function enrichWithEngine1(validatedZones: ValidatedZone[], engine1Zones: DXYZone[]): ValidatedZone[] {
  for (const vz of validatedZones) {
    const zoneMid = (vz.top + vz.bottom) / 2;
    
    // Find nearest Engine 1 zone by price proximity
    const nearest = engine1Zones
      .filter(ez => ez.pair === vz.pair)
      .map(ez => ({ ez, dist: Math.abs((ez.ceiling + ez.floor) / 2 - zoneMid) }))
      .sort((a, b) => a.dist - b.dist)[0]?.ez;
    
    if (nearest) {
      // Enrich with Engine 1 metadata (only if not already set by agent)
      vz.reactionCount = vz.reactionCount ?? nearest.reactionCount ?? 0;
      vz.confluence = vz.confluence ?? nearest.confluence ?? 0;
      vz.zfp = vz.zfp ?? computeZfpFromConfluence(nearest.confluence ?? 5);
      vz.liquidityScore = vz.liquidityScore ?? nearest.liquidityScore ?? 0;
      vz.mappedIPZoneName = vz.mappedIPZoneName ?? nearest.zoneName ?? '';
      
      // If the Engine 1 zone is an LQZ, mark the validated zone
      if (nearest.sdOverlap === 'LQZ' || nearest.zoneName?.includes('LQZ')) {
        vz.source = vz.source + '_LQZ';
      }
    }
  }
  
  return validatedZones;
}
```

---

## 7. MULTI-LAYER VERIFICATION (MLV) — 3 INDEPENDENT LAYERS

Every zone must pass ALL 3 layers to be an entry candidate. Layers are INDEPENDENT — a zone passing one layer does NOT exempt it from the others.

### 7.1 Layer 1: Mechanical Detection (Engine 1)

**Purpose:** Produce zones from OHLC data using mathematical pattern detection.

**Components:**
- **LQZ detector** (`src/brains/lqz-lobe.ts`): Detects liquidity zones from 1H candlestick patterns (LIQUIDITY_SWEEP, LONG_WICK, SHORT_WICK_CONSOL). 14 canon thresholds. Confirmation rule: 2+ pattern types align within 3 pips. Lookback: 720 bars (6 weeks).
- **4H S/D lobe** (`src/brains/4h-sd-lobe.ts`): Detects supply/demand order blocks from 4H candles. BoM/MoM classification with body criteria (body-to-wick ≥ 3.0, body ratio ≥ 0.65). Prior-move-direction analysis.
- **9-pillar engine** (`src/brains/9-pillar-lobe.ts`): Produces confluence-scored IP zones from pivots, MAs, options, analyst commentary, structural extremes, Fibonacci, regime detection. 0-14 confluence scale.

**Output:** Zones with type, sdType (BoM/MoM/IP/LQZ), reactionCount, confluence, zfp, liquidityScore, zoneName.

**Independence:** These zones are produced from OHLC data alone — no visual input. They represent the "data 60%" of the system.

### 7.2 Layer 2: Visual Perception (Agent + TVI)

**Purpose:** Identify zones from chart screenshots using the agent's visual intelligence.

**Components:**
- **Agent (MiMo v2.5):** Reads chart screenshots via read(). Identifies zones from candlestick patterns. Produces ZONE| lines.
- **TVI Harness:** Parses ZONE| lines. Validates structure, evidence, price, distance, type. Enforces gates (must read screenshot, ≥3 zones, both sides, no IP entries).
- **VCM:** Matches VKG nodes for guidance (zone identification patterns, validation rules, anti-patterns).
- **VEB:** Pre/post gates enforcing visual discipline.

**Output:** validatedZones with type, classification, confidence, visualEvidence, source (VLM_CONFIRMED/VLM_NEW).

**Independence:** These zones are produced from visual perception alone — no OHLC data input. They represent the "vision 40%" of the system.

### 7.3 Layer 3: Deterministic Validation (Firewall + TVI Harness)

**Purpose:** Validate every zone against mechanical rules to ensure structural validity.

**Components:**
- **Semantic Firewall** (`src/semantic-firewall/`): 63 rules covering ZT (zero tolerance), CS (core semantic), RRR, SL, proximity, blind-execution, anti-derailment, theatrical detection.
- **TVI Harness:** Zone structure validation, evidence validation, distance validation, type validation, freshness validation.
- **VST:** Records every validation decision for trajectory analysis.

**Output:** Entry candidates (zones that passed all gates).

**Independence:** This layer validates zones from BOTH Layer 1 and Layer 2 — it doesn't care where the zone came from, only whether it passes the rules.

### 7.4 The Multi-Layer Rule

A zone that passes ALL 3 layers is the HIGHEST-CONFIDENCE entry candidate:
- **Layer 1 (Mechanical):** Engine 1 detected it from OHLC data → it has mathematical structure
- **Layer 2 (Visual):** Agent confirmed it on the chart → it has visual evidence
- **Layer 3 (Deterministic):** Harness validated it → it has structural validity

A zone that passes 2 layers is MEDIUM confidence. A zone that passes 1 layer is LOW confidence. A zone that fails any layer is REJECTED.

**The critical rule:** A zone that Engine 1 detects mechanically BUT the agent does NOT confirm visually is LOWER confidence than a zone the agent identifies visually AND the harness validates. The visual confirmation is the PRIMARY signal — the mechanical detection is the SUPPORTING signal. This is the "vision-first" principle.

---

## 8. VISUAL GUIDANCE SYSTEM (VGS) — T0 BULLETS + T1 WARHEADS

The VGS provides guidance to the agent via output.system.push(). It follows the Shark EIE / VC VEE pattern: T0 bullets (<80 chars, pushed before blocking throw) and T1 warheads (300-600 tokens, one-shot .md files, injected via messages.transform).

### 8.1 T0 Bullets (<80 chars)

These are short, actionable guidance strings pushed to output.system BEFORE a blocking throw. They tell the agent exactly what to do to fix the issue.

**Block bullets:**
```
[TVI BLOCK] Read() the screenshot first — then produce ZONE| lines.
[TVI BLOCK] visualEvidence needs exact prices (e.g. 'at 1.1480').
[TVI BLOCK] Screenshot file not found — capture via tv_screenshot first.
[TVI BLOCK] < 3 validated zones — identify more from the chart.
[TVI BLOCK] IP zones are NOT entry zones. Use S/D and LQZ only.
[TVI BLOCK] Only one side found — also look for the other side.
[TVI BLOCK] Zone top <= bottom — check price axis mapping.
[TVI BLOCK] Generic evidence — name the EXACT pattern with prices.
[TVI BLOCK] base64 is not an image — read() the .png file.
[TVI BLOCK] omni-vision is for VIDEO — use read() for images.
```

**Warn bullets:**
```
[TVI WARN] Only supply zones found — also look for demand below spot.
[TVI WARN] Zones clustered near spot — spread across the range.
[TVI WARN] Screenshot is > 10 min old — consider re-capturing.
[TVI WARN] Zone has 3+ reactions — depleted, TP only.
[TVI WARN] No liquidity zones identified — look for stop hunts.
[TVI WARN] 4H zone width outside 15-40 pips — verify boundaries.
[TVI WARN] liquidityScore < 5 — insufficient for TP target.
[TVI WARN] BoM without body criteria — verify classification.
```

**Guide bullets:**
```
[TVI GUIDE] Supply OB = candle BEFORE sharp move down. Mark high/low.
[TVI GUIDE] Demand OB = candle BEFORE sharp move up. Mark high/low.
[TVI GUIDE] Liquidity sweep = long wick through level then reversal.
[TVI GUIDE] Unmitigated (not retested) = strongest entry.
[TVI GUIDE] BoM: body ≥ 65% of range AND body-to-wick ≥ 3.0.
[TVI GUIDE] SS = scalp at consolidation ceiling AND floor.
[TVI GUIDE] WL = entry at Hard Wall (zfp < 20%). Rejection entry.
[TVI GUIDE] Engulfing = body engulfs prior candle. 47% of wins.
[TVI GUIDE] Pin bar = long wick rejecting zone. 32% of wins.
[TVI GUIDE] Earth+Fire overlap = double reaction. TP at midpoint.
```

### 8.2 T1 Warheads (300-600 tokens)

These are one-shot .md files injected via messages.transform for complex situations. They provide detailed guidance when a bullet isn't enough.

**warheads/zone-identification-guide.md:**
```markdown
# ZONE IDENTIFICATION GUIDE

## Order Blocks (Most Important)
Find a drastic sharp move. Identify the candle BEFORE the move. Mark high/low of that candle's wicks. Must create break of structure. Unmitigated (not retested) = strongest.

## Supply Zones
- Bearish order blocks: candle before sharp move down
- Upper wick clusters: 3+ candles rejecting same high
- Bearish engulfing at resistance
- Consolidation tops with rejection

## Demand Zones
- Bullish order blocks: candle before sharp move up
- Lower wick clusters: 3+ candles rejecting same low
- Bullish engulfing at support
- Consolidation bottoms with rejection

## Liquidity Zones
- Long wicks through level then reversal (stop hunts)
- Just beyond swing highs/lows or round numbers
- Smart money traps at chart patterns

## Evidence Format
ZONE|type|top|bottom|timeframe|classification|confidence|evidence
Evidence must name the EXACT pattern with EXACT prices (3+ decimals).
```

**warheads/common-mistakes.md:**
```markdown
# COMMON ZONE IDENTIFICATION MISTAKES

## Mistake 1: Confirming Rectangles Without Reading Structure
The colored rectangles are Engine 1 zones — they are ANCHORS, not answers.
Look BEHIND the rectangle: what candles are there? What patterns?

## Mistake 2: Generic Evidence
"zone confirmed" / "looks good" / "valid zone" — BLOCKED.
Write: "bearish engulfing at 1.1480 with 3 upper wicks rejecting from 1.1500"

## Mistake 3: One-Sided Identification
You found only supply zones. You MUST also find demand zones below spot.
Look for: bullish order blocks, lower wick clusters, consolidation bottoms.

## Mistake 4: Clustered Zones
All your zones are within 10 pips of spot. Spread across the range.
Look for zones at the edges of the visible chart — not just near current price.

## Mistake 5: Wrong Price Mapping
Zone boundaries must come from the chart's price axis (right side numbers).
Read the numbers and map them to zone top/bottom precisely.
```

**warheads/price-axis-reading.md:**
```markdown
# HOW TO READ THE PRICE AXIS

The price axis is on the RIGHT side of the chart. It shows exact price levels.

1. Find the zone you want to identify on the chart (left side = time, right side = price)
2. Follow the horizontal line from the zone to the right edge
3. Read the number on the price axis where the line intersects
4. That number is your zone boundary (top or bottom)

Example:
- You see a supply zone at the top of a consolidation
- Follow the top edge of the consolidation to the right
- The price axis shows 101.14 at that level
- Your zone top = 101.14

For DXY: prices are like 100.95, 101.14 (2 decimal places)
For FX: prices are like 1.1415, 1.1480 (4 decimal places)
```

### 8.3 Single Output Gateway (IntelligenceOrchestrator Pattern)

All TVI findings (blocks, warns, guides) are synthesized into ONE coherent output.system push per turn. No fragmentation, no contradiction.

```typescript
class TVIOrchestrator {
  synthesize(findings: TVIFinding[]): string {
    // Priority order: block > warn > guide
    const blocks = findings.filter(f => f.priority === 'block');
    const warns = findings.filter(f => f.priority === 'warn');
    const guides = findings.filter(f => f.priority === 'guide');
    
    const parts: string[] = [];
    
    if (blocks.length > 0) {
      parts.push(`[TVI BLOCK] ${blocks.map(b => b.bullet).join(' | ')}`);
    }
    if (warns.length > 0) {
      parts.push(`[TVI WARN] ${warns.map(w => w.bullet).join(' | ')}`);
    }
    if (guides.length > 0 && blocks.length === 0) {
      parts.push(`[TVI GUIDE] ${guides.map(g => g.bullet).join(' | ')}`);
    }
    
    return parts.join('\n');
  }
}
```

---

## 9. VISUAL STATE TRACKER (VST) — SQLITE STATE

The VST is a SQLite-backed state tracker that records every visual action for trajectory analysis and loop detection.

### 9.1 SQLite Schema

```sql
-- Zone identifications (every zone the agent produced)
CREATE TABLE zone_identifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pair TEXT NOT NULL,
  type TEXT NOT NULL,
  top REAL NOT NULL,
  bottom REAL NOT NULL,
  timeframe TEXT NOT NULL,
  classification TEXT NOT NULL,
  source TEXT NOT NULL,
  confidence INTEGER NOT NULL,
  visual_evidence TEXT NOT NULL,
  source_screenshot TEXT NOT NULL,
  reaction_count INTEGER DEFAULT 0,
  confluence REAL DEFAULT 0,
  zfp REAL DEFAULT 50,
  liquidity_score REAL DEFAULT 0,
  mapped_ip_zone_name TEXT DEFAULT '',
  created_at INTEGER NOT NULL
);

-- Zone verifications (every zone the harness accepted/rejected)
CREATE TABLE zone_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zone_id INTEGER NOT NULL,
  gate TEXT NOT NULL,
  passed INTEGER NOT NULL, -- 0=failed, 1=passed
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (zone_id) REFERENCES zone_identifications(id)
);

-- Screenshots (every screenshot captured)
CREATE TABLE screenshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL,
  pair TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  captured_at INTEGER NOT NULL
);

-- Enforcement log (every VEB decision)
CREATE TABLE enforcement_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gate TEXT NOT NULL,
  decision TEXT NOT NULL, -- 'blocked', 'warned', 'passed'
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Trajectory history (success/failure per pipeline run)
CREATE TABLE trajectory_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  week_start TEXT NOT NULL,
  zones_produced INTEGER NOT NULL,
  zones_validated INTEGER NOT NULL,
  setups_produced INTEGER NOT NULL,
  gates_passed INTEGER NOT NULL,
  gates_failed INTEGER NOT NULL,
  health_score REAL NOT NULL, -- 0.0-1.0
  created_at INTEGER NOT NULL
);

-- Loop detection (occurrence counts per pattern)
CREATE TABLE loop_detection (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  last_occurrence INTEGER NOT NULL
);

-- Image reads (every read() call on an image)
CREATE TABLE image_reads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL,
  pair TEXT,
  timeframe TEXT,
  read_at INTEGER NOT NULL
);
```

### 9.2 VST Implementation

```typescript
class VisualStateTracker {
  private db: Database;
  
  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS zone_identifications (...);
      CREATE TABLE IF NOT EXISTS zone_verifications (...);
      CREATE TABLE IF NOT EXISTS screenshots (...);
      CREATE TABLE IF NOT EXISTS enforcement_log (...);
      CREATE TABLE IF NOT EXISTS trajectory_history (...);
      CREATE TABLE IF NOT EXISTS loop_detection (...);
      CREATE TABLE IF NOT EXISTS image_reads (...);
    `);
  }

  recordZoneIdentification(zone: ValidatedZone): void {
    this.db.prepare(`
      INSERT INTO zone_identifications (pair, type, top, bottom, timeframe, classification, source, confidence, visual_evidence, source_screenshot, reaction_count, confluence, zfp, liquidity_score, mapped_ip_zone_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(zone.pair, zone.type, zone.top, zone.bottom, zone.timeframe, zone.classification, zone.source, zone.confidence, zone.visualEvidence, zone.sourceScreenshot, zone.reactionCount, zone.confluence, zone.zfp, zone.liquidityScore, zone.mappedIPZoneName, Date.now());
  }

  recordZoneVerification(zoneId: number, gate: string, passed: boolean, reason: string): void {
    this.db.prepare(`
      INSERT INTO zone_verifications (zone_id, gate, passed, reason, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(zoneId, gate, passed ? 1 : 0, reason, Date.now());
  }

  recordScreenshot(path: string, pair: string, timeframe: string, sizeBytes: number): void {
    this.db.prepare(`
      INSERT INTO screenshots (path, pair, timeframe, size_bytes, captured_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(path, pair, timeframe, sizeBytes, Date.now());
  }

  recordEnforcement(gate: string, decision: string, reason: string): void {
    this.db.prepare(`
      INSERT INTO enforcement_log (gate, decision, reason, created_at)
      VALUES (?, ?, ?, ?)
    `).run(gate, decision, reason, Date.now());
  }

  recordTrajectory(runId: string, weekStart: string, zonesProduced: number, zonesValidated: number, setupsProduced: number, gatesPassed: number, gatesFailed: number): void {
    const healthScore = gatesPassed / Math.max(1, gatesPassed + gatesFailed);
    this.db.prepare(`
      INSERT INTO trajectory_history (run_id, week_start, zones_produced, zones_validated, setups_produced, gates_passed, gates_failed, health_score, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(runId, weekStart, zonesProduced, zonesValidated, setupsProduced, gatesPassed, gatesFailed, healthScore, Date.now());
  }

  recordImageRead(filePath: string, pair?: string, timeframe?: string): void {
    this.db.prepare(`
      INSERT INTO image_reads (file_path, pair, timeframe, read_at)
      VALUES (?, ?, ?, ?)
    `).run(filePath, pair ?? null, timeframe ?? null, Date.now());
  }

  getTrajectoryHistory(limit: number = 10): TrajectoryRecord[] {
    return this.db.prepare(`
      SELECT * FROM trajectory_history ORDER BY created_at DESC LIMIT ?
    `).all(limit);
  }

  getLoopCount(pattern: string): number {
    const row = this.db.prepare(`
      SELECT count FROM loop_detection WHERE pattern = ?
    `).get(pattern);
    return row?.count ?? 0;
  }

  incrementLoopCount(pattern: string): void {
    this.db.prepare(`
      INSERT INTO loop_detection (pattern, count, last_occurrence)
      VALUES (?, 1, ?)
      ON CONFLICT(pattern) DO UPDATE SET count = count + 1, last_occurrence = ?
    `).run(pattern, Date.now(), Date.now());
  }
}
```

---

## 10. LOOP DETECTION (VLD) & TRAJECTORY MONITOR (VTM)

### 10.1 Loop Detection (VLD)

Detects when the agent is stuck in a loop — producing the same output repeatedly without progress.

**6 loop patterns (from VC VEE):**

**VLD-1: STALE_READ** — agent reads the same screenshot 3+ times without producing new zones
```typescript
if (vst.getImageReadCount(screenshotPath) >= 3 && vst.getNewZoneCountSince(lastRead) === 0) {
  vgs.warn(`[VLD] STALE_READ: you've read ${screenshotPath} 3+ times without producing new zones. Move to the next pair or re-capture.`);
  vst.incrementLoopCount('STALE_READ');
}
```

**VLD-2: NO_VERIFY** — agent produces zones but doesn't verify them against the chart
```typescript
if (vst.getZoneProductionCount() > 0 && vst.getZoneVerificationCount() === 0) {
  vgs.warn(`[VLD] NO_VERIFY: you produced zones but didn't verify them. Check the harness output for rejections.`);
  vst.incrementLoopCount('NO_VERIFY');
}
```

**VLD-3: SCRIPT_LOOP** — agent tries to use scripts/computation instead of visual identification
```typescript
if (agentCalledTool('bash') || agentCalledTool('write') && output.includes('python') || output.includes('script')) {
  vgs.warn(`[VLD] SCRIPT_LOOP: you're computing zones instead of seeing them. Read the chart.`);
  vst.incrementLoopCount('SCRIPT_LOOP');
}
```

**VLD-4: REPEAT_ERROR** — agent makes the same mistake 3+ times (e.g., generic evidence, wrong price mapping)
```typescript
const errorCount = vst.getViolationCount('EVIDENCE_GENERIC');
if (errorCount >= 3) {
  vgs.warn(`[VLD] REPEAT_ERROR: ${errorCount} generic evidence violations. Read the evidence guide: name the EXACT pattern with EXACT prices.`);
  vst.incrementLoopCount('REPEAT_ERROR');
}
```

**VLD-5: BLIND_ACT** — agent calls setups tool without reading any screenshot
```typescript
if (!ctx.screenshotsRead || ctx.screenshotsRead.length === 0) {
  vgs.block(`[VLD] BLIND_ACT: you haven't read any screenshots. read() the PNG files first.`);
  vst.incrementLoopCount('BLIND_ACT');
}
```

**VLD-6: NO_REPORT** — agent completes pipeline but doesn't produce a report
```typescript
if (ctx.pipelineComplete && !ctx.reportGenerated) {
  vgs.warn(`[VLD] NO_REPORT: pipeline complete but no report generated. Call the report tool.`);
  vst.incrementLoopCount('NO_REPORT');
}
```

### 10.2 Trajectory Monitor (VTM)

Tracks the agent's success rate over time and adjusts enforcement intensity.

**Health score computation:**
```typescript
function computeHealthScore(): number {
  const history = vst.getTrajectoryHistory(10);
  if (history.length === 0) return 0.5; // neutral start
  
  const totalGates = history.reduce((sum, h) => sum + h.gates_passed + h.gates_failed, 0);
  const passedGates = history.reduce((sum, h) => sum + h.gates_passed, 0);
  
  return totalGates > 0 ? passedGates / totalGates : 0.5;
}
```

**Adaptive profiles (from VC VEE):**
```typescript
const healthScore = computeHealthScore();

if (healthScore > 0.85) {
  // TRUSTED — light enforcement
  // Agent has proven competence. Minimal gates. Focus on edge cases.
  vgs.setProfile('TRUSTED');
} else if (healthScore > 0.60) {
  // STANDARD — normal enforcement
  // Agent is competent but makes occasional mistakes. Full gates.
  vgs.setProfile('STANDARD');
} else {
  // GUIDED — heavy enforcement
  // Agent is struggling. Maximum gates + guidance. T1 warheads for common mistakes.
  vgs.setProfile('GUIDED');
}
```

**Profile effects:**
- **TRUSTED:** VEB gates reduced to critical only (must read screenshot, no IP entries). Warns only for anti-patterns.
- **STANDARD:** Full VEB gates. All anti-patterns detected. T0 bullets for guidance.
- **GUIDED:** Full VEB gates + T1 warheads injected for every common mistake. Maximum hand-holding.

---

## 11. ANTI-DERAILMENT SYSTEM — 12 BEHAVIORAL PATTERNS

From Shark CME pattern. These patterns detect when the agent is derailing from the correct visual workflow.

**AD-1: COMPUTATIONAL_INSTEAD_OF_VISUAL**
- Trigger: Agent computes zones from OHLC data instead of reading the chart
- Detection: Agent calls a computation tool (bash, python) to produce zones
- Response: `[AD-1] You're computing zones instead of seeing them. Read the chart.`

**AD-2: RECTANGLE_CONFIRMATION_ONLY**
- Trigger: Agent confirms drawn rectangles without reading actual candle structure
- Detection: All zones have source=VLM_CONFIRMED, none have source=VLM_NEW, and evidence references only the rectangle positions
- Response: `[AD-2] You confirmed rectangles without reading candle structure. Look deeper.`

**AD-3: EVIDENCE_FABRICATION**
- Trigger: Agent writes evidence that doesn't match the actual chart content
- Detection: Evidence references patterns that don't exist on the chart (e.g., "bullish engulfing at 1.1480" when the chart shows bearish candles at that level)
- Response: `[AD-3] Evidence doesn't match chart. Describe what you ACTUALLY see.`

**AD-4: PRICE_AXIS_CONFUSION**
- Trigger: Agent maps zone boundaries to wrong prices
- Detection: Zone top/bottom don't align with the chart's price axis at the zone's position
- Response: `[AD-4] Zone boundaries don't match price axis. Read the numbers on the right side.`

**AD-5: ONE_SIDED_IDENTIFICATION**
- Trigger: Agent only finds supply OR only finds demand
- Detection: All zones for a pair are the same type
- Response: `[AD-5] Only ${type} zones found. Also look for ${oppositeType} zones ${oppositeSide} spot.`

**AD-6: CLUSTERED_ZONES**
- Trigger: All zones within 10 pips of spot
- Detection: All zone midpoints within 10 pips of spot price
- Response: `[AD-6] Zones clustered near spot. Spread across the visible range.`

**AD-7: STALE_ANALYSIS**
- Trigger: Agent uses old screenshot or old zone data
- Detection: Screenshot timestamp > 10 minutes old, or zone data from previous pipeline run
- Response: `[AD-7] Using stale data. Re-capture the chart for fresh analysis.`

**AD-8: WRONG_TIMEFRAME**
- Trigger: Agent uses wrong timeframe for zone identification
- Detection: Agent reads 1H or 30m chart when 4H is required for zone identification
- Response: `[AD-8] Use 4H chart for zone identification. 4H shows institutional structure.`

**AD-9: IGNORED_LIQUIDITY**
- Trigger: Agent doesn't identify any liquidity zones
- Detection: No LIQUIDITY type zones in the validated set
- Response: `[AD-9] No liquidity zones identified. Look for stop hunts (long wicks through levels).`

**AD-10: WRONG_PAIR_ATTRIBUTION**
- Trigger: Agent attributes zones to the wrong pair
- Detection: Zone pair doesn't match the screenshot's pair
- Response: `[AD-10] Zone pair doesn't match screenshot. Check which chart you're reading.`

**AD-11: OVER_PRODUCTION**
- Trigger: Agent produces too many zones (likely low quality)
- Detection: > 15 zones per pair (golden standard: 5-10 per pair)
- Response: `[AD-11] Too many zones (${count}). Focus on the clearest, highest-confidence zones.`

**AD-12: UNDER_PRODUCTION**
- Trigger: Agent produces too few zones (insufficient for setup generation)
- Detection: < 3 zones per pair
- Response: `[AD-12] Too few zones (${count}). Minimum 3 required. Look harder at the chart.`

---

## 12. INTEGRATION WITH EXISTING PIPELINE

### 12.1 Pipeline Flow (TVI-Integrated)

```
Tool 1: plutus-pipeline-harvest
  → Fetches OHLC data (4H 500 bars, 1H 1500 bars, 30m 500 bars, 15m 300 bars)
  → Extracts spot prices
  → Computes options date link
  → nextStep: MANUAL STEP A (options data extraction)

Tool 2: plutus-pipeline-zones
  → FIREWALL: verifies options screenshot exists + content valid
  → Constructs Engine 1 zones: 9-pillar IP zones + 4H S/D zones + LQZ zones
  → Merges LQZ with IP zones (confluence boost, zfp reduction)
  → Output: zoneMapSnapshot (zones, spots, version, timestamp)
  → nextStep: MANUAL STEP B (review zone map)

Tool 3: plutus-pipeline-shapes
  → FIREWALL: verifies Manual Step B performed
  → Computes Engine 2 shape chain (ZFP-conditioned transitions)
  → Day decomposition (Mon-Fri)
  → Consolidation phase detection
  → Output: shapeSnapshot
  → nextStep: MANUAL STEP C (draw zones on charts)

  ┌─── MANUAL STEP C: Agent draws Engine 1 zones on TradingView charts ───┐
  │ tv_navigate → tv_set_timeframe("4H") → tv_find_price_y →            │
  │ tv_draw_rectangle (S/D red, LQZ blue) → tv_screenshot →              │
  │ plutus-save-screenshot (binary PNG)                                  │
  └───────────────────────────────────────────────────────────────────────┘

Tool 4: plutus-pipeline-charts
  → FIREWALL: verifies Manual Step C performed
  → Verifies screenshots exist on disk (fs.access + ≥1KB size)
  → Stores screenshots in context
  → Returns: screenshots + TVI directive (ZIP protocol instructions)
  → nextStep: MANUAL STEP D (TVI zone identification)

  ┌─── MANUAL STEP D: TVI ZONE IDENTIFICATION ──────────────────────────┐
  │ Agent reads screenshot via read() (MiMo v2.5 PERCEIVES)            │
  │ Agent produces ZONE| lines (structured identification)              │
  │ TVI Harness parses ZONE| lines → validates each zone               │
  │ TVI Harness enforces gates (VEB: must read, ≥3 zones, both sides)  │
  │ TVI Harness enriches with Engine 1 metadata                         │
  │ Output: validatedZones (passed ALL gates)                           │
  └───────────────────────────────────────────────────────────────────────┘

Tool 5: plutus-pipeline-setups
  → FIREWALL: verifies Manual Step D output (≥3 validated zones with real screenshots + specific evidence)
  → TVI VEB pre-action gates (must read screenshot, ≥3 zones, both sides, no IP entries)
  → Supplements validated zones with Engine 1 zones for TP targeting (opposing S/D zones)
  → Calls VisualSetupGenerator.generateSetups()
  → TVI VEB post-action gates (structure, evidence, distance, type, freshness)
  → Output: final setups + report path
  → resetContext()
```

### 12.2 Key Differences from Current Implementation

| Aspect | Current (Broken) | TVI (Correct) |
|--------|-----------------|---------------|
| Zone identification | Vague "read screenshots and produce zones" directive | ZIP protocol with structured ZONE\| format + SMC visual guidance |
| Agent output format | JSON array (fragile, error-prone) | ZONE\| lines (simple, parseable, self-documenting) |
| Zone verification | None (agent's zones trusted blindly) | VEB gates: structure, evidence, price, distance, type, freshness |
| Fallback | Engine 1 IP zones (violates NO FALLBACK) | Pipeline FAILS if agent can't produce zones |
| IP zones | Treated as entry zones (slop) | NOT entry zones (confluence context only) |
| Entry zone types | Any zone type (IP, S/D, LQZ mixed) | Only S/D (BoM/MoM) and LQZ zones |
| Anti-pattern detection | None | 15 VAP nodes + 12 AD patterns |
| State tracking | None | SQLite state tracker with trajectory history |
| Loop detection | None | 6 VLD patterns with adaptive profiles |
| Guidance | None | T0 bullets + T1 warheads via VGS |
| Both sides | Not enforced | WARN if one-sided, BLOCK if zero zones |
| Zone spread | Not enforced | WARN if clustered within 10 pips of spot |

---

## 13. DATA MODEL — TYPESCRIPT INTERFACES

### 13.1 Core Types

```typescript
// ═══════════════════════════════════════════════════════════════════
// TVI CORE TYPES
// ═══════════════════════════════════════════════════════════════════

/** Zone type — what kind of price level this is */
type ZoneType = 'SUPPLY' | 'DEMAND' | 'LIQUIDITY';

/** Zone classification — structural role in the move */
type ZoneClassification = 'BoM' | 'MoM' | 'UNMITIGATED';

/** Zone source — how the zone was identified */
type ZoneSource = 'VLM_CONFIRMED' | 'VLM_NEW' | 'VLM_CONFIRMED_LQZ' | 'VLM_NEW_LQZ';

/** A validated zone that passed all TVI gates */
interface ValidatedZone {
  /** Pair this zone belongs to (DXY, EUR/USD, GBP/USD, AUD/USD) */
  pair: string;
  /** Zone type — SUPPLY (rejected DOWN), DEMAND (rejected UP), LIQUIDITY (stop-hunt) */
  type: ZoneType;
  /** Upper price boundary (from chart's price axis) */
  top: number;
  /** Lower price boundary (from chart's price axis) */
  bottom: number;
  /** Timeframe of the chart this zone was identified on */
  timeframe: '4H' | '1H' | '30m' | '15m';
  /** Structural classification — BoM (beginning of move), MoM (middle of move), UNMITIGATED */
  classification: ZoneClassification;
  /** How the zone was identified — VLM_CONFIRMED (aligned with Engine 1) or VLM_NEW (agent found it) */
  source: ZoneSource;
  /** Agent's confidence in this zone (0-100) */
  confidence: number;
  /** Specific candlestick pattern observed (≥20 chars, with price references) */
  visualEvidence: string;
  /** Path to the screenshot this zone was identified from */
  sourceScreenshot: string;
  /** Number of times price has retested this zone (0 = unmitigated) */
  reactionCount: number;
  /** Confluence score from Engine 1 (0-14) */
  confluence: number;
  /** Zone Failure Probability (0-100) */
  zfp: number;
  /** Liquidity score (0-10) — "wood for the fire" */
  liquidityScore: number;
  /** Name of the Engine 1 IP zone this maps to (if any) */
  mappedIPZoneName: string;
}

/** A VKG knowledge node */
interface VKGNode {
  /** Unique node ID (e.g., "A-001", "B-003", "D-007") */
  id: string;
  /** Category (identification, validation, evidence, anti_pattern, confluence, shape) */
  category: VKGCategory;
  /** Task types this node applies to */
  taskTypes: string[];
  /** Pairs this node applies to (undefined = all pairs) */
  pairs?: string[];
  /** Timeframes this node applies to (undefined = all timeframes) */
  timeframes?: string[];
  /** Boolean condition for matching */
  condition: (state: AgentState) => boolean;
  /** T0 bullet guidance (<80 chars) */
  bullet: string;
  /** T1 warhead file path (for complex guidance) */
  warhead?: string;
  /** Priority: block (throw), warn (flag), guide (inform) */
  priority: 'block' | 'warn' | 'guide';
  /** Disclosure mode: always (every time), once-gate (once per gate), once-session (once per session) */
  disclosure: 'always' | 'once-gate' | 'once-session';
}

type VKGCategory = 'identification' | 'validation' | 'evidence' | 'anti_pattern' | 'confluence' | 'shape';

/** Agent state for VCM matching */
interface AgentState {
  /** Current task type */
  task: 'zone_identification' | 'zone_verification' | 'setup_generation';
  /** Current pair */
  pair: string;
  /** Current timeframe */
  timeframe: string;
  /** Current spot price */
  spot: number;
  /** Number of zones drawn on chart */
  zonesDrawn: number;
  /** Screenshots the agent has read */
  screenshotsRead: string[];
  /** Whether the agent has read any screenshot */
  agentHasReadScreenshot: boolean;
  /** Current shape from Engine 2 */
  currentShape: string;
  /** Today's shape from Engine 2 */
  dayShape: string;
}

/** TVI finding for orchestrator synthesis */
interface TVIFinding {
  /** Finding priority */
  priority: 'block' | 'warn' | 'guide';
  /** Bullet text (<80 chars) */
  bullet: string;
  /** Gate that produced this finding */
  gate: string;
  /** Reason for the finding */
  reason: string;
}

/** Trajectory record for health scoring */
interface TrajectoryRecord {
  run_id: string;
  week_start: string;
  zones_produced: number;
  zones_validated: number;
  setups_produced: number;
  gates_passed: number;
  gates_failed: number;
  health_score: number;
  created_at: number;
}

/** Screenshot metadata */
interface ScreenshotMeta {
  path: string;
  pair: string;
  timeframe: string;
  sizeBytes: number;
  capturedAt: number;
}

/** Zone verification result */
interface ZoneVerification {
  passed: boolean;
  reason: string;
  gate: string;
}

/** TVI context (shared across hooks) */
interface TVIContext {
  /** Screenshots captured and read */
  screenshots: ScreenshotMeta[];
  /** Screenshots the agent has read via read() */
  screenshotsRead: string[];
  /** Zones the agent has drawn on charts */
  zonesDrawn: number;
  /** Validated zones from TVI */
  validatedZones: ValidatedZone[];
  /** Engine 1 zone map snapshot */
  zoneMapSnapshot: ZoneMapSnapshot | null;
  /** Engine 2 shape snapshot */
  shapeSnapshot: ShapePredictionSnapshot | null;
  /** Harvest data (OHLC, spots) */
  harvestData: HarvestData | null;
  /** Pipeline run ID */
  runId: string;
  /** Week start date */
  weekStart: string;
}
```

### 13.2 ZONE| Line Format

```
ZONE|type|top|bottom|timeframe|classification|confidence|evidence

Fields (pipe-delimited, one per line):
1. "ZONE" — literal prefix (required for parsing)
2. type — SUPPLY | DEMAND | LIQUIDITY
3. top — upper price boundary (float, from chart's price axis)
4. bottom — lower price boundary (float, from chart's price axis)
5. timeframe — 4H | 1H | 30m | 15m
6. classification — BoM | MoM | UNMITIGATED
7. confidence — 0-100 (integer)
8. evidence — specific candlestick pattern with exact prices (≥20 chars, with 3+ decimal price references)

Examples:
ZONE|SUPPLY|101.14|101.19|4H|MoM|85|bearish engulfing at 101.150 with 3 consecutive upper wicks rejecting from 101.190 supply zone
ZONE|DEMAND|100.84|100.95|4H|BoM|90|bullish order block at 100.945 with strong body covering 70% of range, break of structure above 100.920
ZONE|LIQUIDITY|100.97|100.98|4H|MoM|85|liquidity sweep at 100.975 with long lower wick through 100.945 then sharp reversal up 25 pips in 2 bars
```

---

## 14. TEST SPECIFICATIONS

### 14.1 Unit Tests

**T1: ZONE| Parsing**
```
Input: "ZONE|SUPPLY|101.14|101.19|4H|MoM|85|bearish engulfing at 101.150"
Expected: 1 zone parsed with correct fields
```

**T2: ZONE| Parsing — Malformed**
```
Input: "ZONE|SUPPLY|101.14" (only 3 parts)
Expected: skipped (need ≥7 parts), warning logged
```

**T3: Zone Verification — Structure**
```
Input: zone with top=100.95, bottom=101.14 (top < bottom)
Expected: REJECTED — "top <= bottom"
```

**T4: Zone Verification — Evidence Length**
```
Input: zone with visualEvidence="zone confirmed" (14 chars)
Expected: REJECTED — "evidence < 20 chars"
```

**T5: Zone Verification — Evidence Price Ref**
```
Input: zone with visualEvidence="bearish engulfing at the top"
Expected: REJECTED — "no price reference in evidence"
```

**T6: Zone Verification — Evidence Generic**
```
Input: zone with visualEvidence="order block"
Expected: REJECTED — "generic evidence"
```

**T7: Zone Verification — Distance FX**
```
Input: EUR/USD zone at 1.3000, spot=1.1415 (distance 0.1585 > 0.020)
Expected: REJECTED — "zone too far from spot"
```

**T8: Zone Verification — Distance DXY**
```
Input: DXY zone at 103.50, spot=100.95 (distance 2.55 > 2.00)
Expected: REJECTED — "zone too far from spot"
```

**T9: Zone Verification — Screenshot Missing**
```
Input: zone with sourceScreenshot="/tmp/nonexistent.png"
Expected: REJECTED — "screenshot not found"
```

**T10: Zone Verification — IP Zone Type**
```
Input: zone with type='IP'
Expected: REJECTED — "IP zones are NOT entry zones"
```

**T11: VCM Matching**
```
Input: AgentState { task: 'zone_identification', pair: 'DXY', timeframe: '4H' }
Expected: ≤5 matched nodes, all with taskTypes including 'zone_identification'
```

**T12: VEB Pre-Gate — Must Read Screenshot**
```
Input: agentHasReadScreenshot=false
Expected: BLOCKED — "MUST_READ_SCREENSHOT"
```

**T13: VEB Pre-Gate — Minimum Zones**
```
Input: validatedZones.length=2
Expected: BLOCKED — "MINIMUM_ZONES: 2/3"
```

**T14: VEB Pre-Gate — Both Sides**
```
Input: pair zones all SUPPLY, no DEMAND
Expected: WARN — "only SUPPLY zones found"
```

**T15: VEB Pre-Gate — No IP Entries**
```
Input: validatedZones contains zone with source='FALLBACK_IP_EDGE'
Expected: BLOCKED — "NO_IP_ENTRIES"
```

**T16: Engine 1 Enrichment**
```
Input: validated zone at 101.14, Engine 1 zone at 101.15 with confluence=10
Expected: zone enriched with confluence=10, zfp computed from confluence
```

**T17: Multi-Layer — All 3 Layers Pass**
```
Input: zone detected by LQZ (Layer 1), confirmed by agent (Layer 2), validated by harness (Layer 3)
Expected: HIGHEST confidence entry candidate
```

**T18: Multi-Layer — Layer 2 Fails**
```
Input: zone detected by LQZ (Layer 1), NOT confirmed by agent (Layer 2 fails), validated by harness (Layer 3)
Expected: MEDIUM confidence — visual confirmation missing
```

**T19: Loop Detection — Stale Read**
```
Input: agent reads same screenshot 3 times without producing new zones
Expected: VLD-1 STALE_READ triggered, warning issued
```

**T20: Trajectory Health Score**
```
Input: 10 runs with 80 gates passed, 20 gates failed
Expected: health_score = 0.80, profile = STANDARD
```

### 14.2 Integration Tests

**IT-1: Full Pipeline — Zone Identification to Setup Generation**
```
1. Harvest OHLC data for week 2026-07-06
2. Produce Engine 1 zones
3. Draw zones on TradingView charts
4. Capture screenshots
5. Agent reads screenshots and produces ZONE| lines
6. Harness parses and verifies zones
7. Engine 3 generates setups at verified zones
8. Verify: setups produced, both directions, proper SL/TP/RRR
```

**IT-2: No Fallback — Agent Can't Produce Zones**
```
1. Agent produces < 3 validated zones
2. Setups tool called
3. Verify: BLOCKED with "MINIMUM_ZONES" error
4. Verify: NO fallback to Engine 1 zones
5. Verify: pipeline FAILS (doesn't produce setups)
```

**IT-3: IP Zones Excluded**
```
1. Agent produces zones including IP zones
2. Setups tool called
3. Verify: BLOCKED with "NO_IP_ENTRIES" error
4. Verify: IP zones NOT used as entry candidates
```

**IT-4: Both Sides Required**
```
1. Agent produces only supply zones for DXY
2. Setups tool called
3. Verify: WARN "only supply zones found"
4. Verify: pipeline continues (warn, not block)
5. Verify: setups produced for supply zones only
```

**IT-5: Visual Evidence Quality**
```
1. Agent produces zone with generic evidence ("zone confirmed")
2. Setups tool called
3. Verify: zone REJECTED with "generic evidence" reason
4. Agent produces zone with specific evidence ("bearish engulfing at 101.150 with 3 upper wicks")
5. Verify: zone ACCEPTED
```

**IT-6: Zone Spread**
```
1. Agent produces 5 zones all within 5 pips of spot
2. Setups tool called
3. Verify: WARN "zones clustered near spot"
4. Verify: pipeline continues
```

### 14.3 Adversarial Tests

**AT-1: Base64 Confusion**
```
Agent tries to read() a base64 string instead of a PNG file
Expected: BLOCKED with "base64 is not an image" message
```

**AT-2: Omni-Vision Misuse**
```
Agent calls plutus-omni-vision for a chart screenshot
Expected: BLOCKED with "omni-vision is for VIDEO only" message
```

**AT-3: Phantom Zone**
```
Agent produces zone with no visible candlestick evidence on chart
Expected: zone REJECTED with "no visible evidence" reason
```

**AT-4: Wrong Price Mapping**
```
Agent maps zone boundaries to wrong prices (off by 50+ pips from chart axis)
Expected: zone REJECTED with "boundaries don't match price axis" reason
```

**AT-5: Over-Production**
```
Agent produces 20 zones for one pair (likely low quality)
Expected: WARN "too many zones — focus on highest confidence"
```

**AT-6: Wrong Pair Attribution**
```
Agent attributes EUR/USD zone to DXY screenshot
Expected: BLOCKED with "zone pair doesn't match screenshot" message
```

---

## 15. PERFORMANCE BUDGETS

From VC VEE pattern. These are HARD limits — exceeding them means the implementation is wrong.

| Hook | Budget | Technique |
|------|--------|-----------|
| `experimental.chat.system.transform` | < 5ms | Pre-built bullet cache, O(1) Map.get(), no model inference |
| `tool.execute.before` | < 10ms | SQLite prepared statement lookup + boolean condition evaluation |
| `tool.execute.after` | < 15ms | Above + evidence verification (stat, exists, sha256) |
| VCM match | < 2ms | Map.get() for O(1) lookup, early-exit on score threshold |
| Zone verification | < 1ms per zone | Boolean checks only, no string operations beyond regex |
| ZONE\| parsing | < 0.5ms per line | Split on '\n', filter 'ZONE\|', split on '\|' |

**Why these budgets matter:**
- `tool.execute.before` fires synchronously in the message turn. Latency above 10ms produces perceptible lag in streaming responses.
- `system.transform` fires on every system prompt mutation including compaction. The agent's entire visual context is rebuilt here.
- opencode's plugin hook timeout has a soft cap at 50ms before the runtime logs a warning.

---

## 16. FILE MANIFEST

### 16.1 New Files (TVI Engine)

```
src/tvi/
├── index.ts                    # TVI plugin entry — wires hooks, initializes subsystems
├── vkg/
│   ├── nodes.ts                # 100 VKG node definitions (all 6 categories)
│   ├── identification.ts       # Category A: 30 zone identification nodes
│   ├── validation.ts           # Category B: 25 zone validation nodes
│   ├── evidence.ts             # Category C: 15 visual evidence nodes
│   ├── anti-pattern.ts         # Category D: 15 anti-pattern nodes
│   ├── confluence.ts           # Category E: 10 confluence scoring nodes
│   └── shape.ts                # Category F: 5 shape-zone relationship nodes
├── vcm.ts                      # Visual Context Matcher — 8-phase pipeline
├── veb.ts                      # Visual Enforcement Brain — pre/post gates
├── vgs.ts                      # Visual Guidance System — bullets + warheads
├── vst.ts                      # Visual State Tracker — SQLite state
├── vld.ts                      # Loop Detection — 6 patterns
├── vtm.ts                      # Trajectory Monitor — health scoring + profiles
├── orchestrator.ts             # Single output gateway — synthesizes findings
├── zip.ts                      # Zone Identification Protocol — parse + verify
├── enrichment.ts               # Engine 1 enrichment — confluence, zfp, reactionCount
├── types.ts                    # TVI TypeScript interfaces
├── warheads/
│   ├── zone-identification-guide.md    # T1: full SMC visual identification guide
│   ├── common-mistakes.md              # T1: anti-patterns with corrections
│   ├── price-axis-reading.md           # T1: how to read chart's price axis
│   ├── order-block-guide.md            # T1: order block identification guide
│   ├── liquidity-sweep-guide.md        # T1: liquidity sweep identification guide
│   └── evidence-format-guide.md        # T1: evidence format requirements
└── state/
    └── tvi-state.db            # SQLite database (created at runtime)
```

### 16.2 Modified Files

```
src/hooks/tool-after.ts         # Replace Manual Step D injection with TVI ZIP protocol
src/pipeline/engine.ts          # Replace charts tool VLM directive with TVI ZIP protocol
src/engine3/visual-setup-generator.ts  # Wire TVI enrichment (zfp, confluence, reactionCount)
src/index.ts                    # Wire TVI hooks (tool.execute.before/after, system.transform)
```

### 16.3 Deleted Code

```
src/pipeline/engine.ts          # REMOVE: fallback to Engine 1 IP zones (~55 lines)
src/pipeline/engine.ts          # REMOVE: FALLBACK_IP_EDGE zone creation
src/pipeline/engine.ts          # REMOVE: vague VLM directive text
```

---

## 17. MIGRATION STRATEGY — FROM BROKEN TO TVI

### 17.1 Phase 1: Foundation (Day 1)

**Goal:** TVI core infrastructure exists.

1. Create `src/tvi/` directory structure
2. Implement `types.ts` — all TVI TypeScript interfaces
3. Implement `vkg/nodes.ts` + all 6 category files — 100 VKG nodes
4. Implement `vcm.ts` — Visual Context Matcher with 8-phase pipeline
5. Implement `vst.ts` — SQLite state tracker with full schema
6. Unit tests: VKG node count, VCM matching, VST schema creation

**Verification:** `bun test src/tvi/__tests__/phase1.test.ts` — all pass.

### 17.2 Phase 2: Enforcement (Day 1-2)

**Goal:** VEB gates are wired and enforcing.

1. Implement `veb.ts` — Visual Enforcement Brain with all pre/post gates
2. Implement `vgs.ts` — Visual Guidance System with bullets + warheads
3. Implement `orchestrator.ts` — Single output gateway
4. Wire hooks in `src/index.ts` — tool.execute.before/after, system.transform
5. Unit tests: VEB gates fire correctly, VGS bullets pushed, orchestrator synthesizes

**Verification:** `bun test src/tvi/__tests__/phase2.test.ts` — all pass.

### 17.3 Phase 3: Zone Identification (Day 2-3)

**Goal:** ZIP protocol works end-to-end.

1. Implement `zip.ts` — ZONE| parsing + zone verification
2. Implement `enrichment.ts` — Engine 1 enrichment (confluence, zfp, reactionCount)
3. Rewrite `tool-after.ts` Manual Step D injection with ZIP protocol
4. Rewrite `engine.ts` charts tool output with ZIP protocol
5. Unit tests: ZONE| parsing, zone verification, enrichment

**Verification:** `bun test src/tvi/__tests__/phase3.test.ts` — all pass.

### 17.4 Phase 4: Anti-Derailment (Day 3-4)

**Goal:** Loop detection and trajectory monitoring are active.

1. Implement `vld.ts` — Loop Detection with 6 patterns
2. Implement `vtm.ts` — Trajectory Monitor with health scoring + profiles
3. Implement 12 anti-derailment behavioral patterns
4. Unit tests: loop detection triggers, health score computation, profile switching

**Verification:** `bun test src/tvi/__tests__/phase4.test.ts` — all pass.

### 17.5 Phase 5: Integration (Day 4-5)

**Goal:** TVI is fully integrated with the existing pipeline.

1. Remove fallback to Engine 1 IP zones from `engine.ts` (~55 lines)
2. Wire TVI enrichment into `visual-setup-generator.ts`
3. Integration test: full pipeline (harvest → zones → shapes → charts → TVI → setups)
4. Container test: deploy to clean-v421, run full pipeline, verify output

**Verification:** Container test produces ≥6 setups per pair, both directions, proper SL/TP/RRR, no IP zone entries, no fallback, VLM_CONFIRMED/VLM_NEW for most setups.

### 17.6 Phase 6: Hardening (Day 5)

**Goal:** TVI is production-ready.

1. Adversarial tests: base64 confusion, omni-vision misuse, phantom zones, wrong price mapping, over-production, wrong pair attribution
2. Performance audit: VCM < 2ms, VEB before < 10ms, VEB after < 15ms
3. Documentation: README, inline comments, warhead files
4. Final container test: verify all acceptance criteria

**Verification:** All adversarial tests pass, performance budgets met, documentation complete.

---

## 18. THE 10 ABSOLUTE PROHIBITIONS

These are HARD RULES. Violating any of them is a derailment.

1. **NO FALLBACK to Engine 1 zones when agent doesn't produce zones.** The pipeline FAILS (BLOCKED) if the agent produces < 3 valid zones. The agent MUST identify zones visually. No Engine 1 IP zone supplementation for entry candidates.

2. **NO model inference in the harness.** VCM matching, zone verification, evidence validation — all deterministic boolean evaluation. Zero LLM calls in the harness. The harness is fast (<10ms), deterministic, and auditable.

3. **ZONE| format is mandatory.** Free-form text is not parseable. The agent MUST produce ZONE|type|top|bottom|timeframe|classification|confidence|evidence lines. Any other format is rejected.

4. **IP zones are NOT entry zones.** Only S/D (BoM/MoM from 4H order blocks) and LQZ zones are entry candidates. IP zones provide confluence context only.

5. **Both sides required.** Agent MUST produce both supply AND demand zones per pair. One-sided identification is a WARN (likely missed the other side). Zero zones is a BLOCK.

6. **read() for images, omni-vision for VIDEO only.** The agent reads chart screenshots via read() directly. plutus-omni-vision is for video processing only. Using omni-vision for chart screenshots is a BLOCK.

7. **Evidence must be specific with price references.** visualEvidence must be ≥ 20 chars, contain a price reference with 3+ decimal places (e.g., "at 1.1480"), and not match generic patterns ("zone confirmed", "looks good", "valid zone").

8. **No base64 text reading.** The agent reads .png files via read() — the image renders directly. Reading base64 text is not reading an image. If the agent tries to analyze base64, it's a BLOCK.

9. **Zone boundaries from chart's price axis.** Zone top/bottom must come from the chart's price axis (right side numbers). Computing boundaries from OHLC data instead of reading the chart is a derailment.

10. **No count caps on zone identification.** The agent identifies as many zones as it can see. The harness validates each one. There is no "maximum 10 zones" limit. Volume is controlled by quality gates, not arbitrary caps.

---

*End of TVI Full Engineering Specification v1.0. This document is the single source of truth for the TVI engine. Implement it exactly. Zero deviations tolerated.*

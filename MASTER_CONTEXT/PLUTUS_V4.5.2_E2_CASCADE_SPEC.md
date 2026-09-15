# PLUTUS v4.5.2 — E2 CASCADE + E3 INTEGRATION SPEC

**Author:** Trident Agent
**Date:** 2026-07-31
**Status:** APPROVED BY OPERATOR
**Base:** pristine v4.5.1 (forked as `Checkpoints/v4.5.2_E2_CASCADE/`)

---

## 1. THE PROBLEM

v4.5.1's pipeline fires E2 (ShapeBrain) per-pair independently. Each pair gets
its OWN shape prediction from its OWN bars. But the operator's architecture
requires E2 to CASCADE:

```
E2 fires on DXY → cascades INVERSE to EU → cascades KEPT to GU
E3 cascades AFTER E2, benefiting from pre-existing E2 maps on cascade pairs
```

Without the E2 cascade, the E3 mirror cascade (cascadeV45 → selectPairNativeZone)
operates BLIND — it has no knowledge of which zone price will visit on which
day. It picks zones by heuristics (strength ranking, formation time) instead
of by the shape chain's day-by-day projection.

**Result:** DXY works (E3 reads E2 directly for DXY's own setups). EU/GU are
broken (the cascade has no E2 data to guide zone selection).

---

## 2. THE ARCHITECTURE (operator's design)

```
E1 (PARALLEL per pair)          Each pair gets its OWN zone map from its OWN bars
    ↓
E2 DXY (shape chain)             DXY shape prediction: SS→BS→R→WL, day decomposition
    ↓ cascade INVERSE
E2 EU (shape chain from DXY)     EU follows DXY's shape sequence, INVERTED direction
    ↓ cascade KEPT
E2 GU (shape chain from EU)      GU follows EU's shape sequence, KEPT direction
    ↓
E3 DXY (source setups)           DXY setups from DXY E1 + DXY E2
    ↓ cascade INVERSE
E3 EU (mirror setups)            EU mirrors from EU E1 + EU E2 (the day-map guides zone selection)
    ↓ cascade KEPT
E3 GU (mirror setups)            GU mirrors from GU E1 + GU E2
```

### Key principle:
- **E2 provides SHAPE + DIRECTION + TIMING** — what shape each day, which direction, which session
- **E1 provides ZONES** — the pair's own structural zones (supply/demand/LQZ)
- **E3 uses E2's day-map to select the EXACT zone** from E1's zone inventory — the zone the shape chain says price will visit that day

---

## 3. THE E2 CASCADE — DATA FLOW

### 3.1 DXY Shape Chain (already exists — ShapeBrain.compute())

ShapeBrain produces a `ShapePredictionSnapshot`:
```typescript
interface ShapePredictionSnapshot {
  currentShape: ShapeCode;           // SS, BS, WL, RWL, R, etc.
  chain: ShapePredictionDay[];       // 5 days, Mon-Fri
  dayDecomposition: DayShapeEntry[]; // per-day: shape, direction, key zone
  storylineBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  consolidationPhase: boolean;
}
```

Each `ShapePredictionDay`:
```typescript
interface ShapePredictionDay {
  day: string;                       // 'Mon', 'Tue', etc.
  shape: ShapeCode;                  // predicted shape for this day
  predictedShape?: ShapeCode;        // alias
  direction?: 'LONG' | 'SHORT';      // predicted direction
  keyZoneId?: string;                // DXY zone price interacts with
  floor?: number;                    // projected day floor
  ceiling?: number;                  // projected day ceiling
  session?: string;                  // predicted session window
  confidence?: number;               // 0-1
}
```

### 3.2 EU Shape Chain (NEW — the cascade)

The DXY shape chain cascades to EU:
- **Shape sequence:** SAME as DXY (SS→BS→R→WL). The macro moves are the same.
- **Direction:** INVERTED. DXY LONG day → EU SHORT day. DXY SHORT day → EU LONG day.
- **Key zones:** EU's OWN zones. For each day, find EU's zone that corresponds
  to the DXY key zone by:
  1. CLASS match (DXY BoM → EU BoM, DXY LQZ → EU LQZ)
  2. ROLE match (DXY supply → EU demand for inverted LONG→SHORT)
  3. SIDE match (the zone on the correct side for the inverted direction)
  4. STRENGTH (the strongest matching zone — lowest zfp, most reactions)
  5. Formation-time proximity (the zone reacting around the same time)

### 3.3 GU Shape Chain (NEW — the cascade from EU)

The EU shape chain cascades to GU:
- **Shape sequence:** SAME as EU (which is same as DXY)
- **Direction:** KEPT from EU. EU SHORT → GU SHORT. EU LONG → GU LONG.
- **Key zones:** GU's OWN zones, same matching logic as 3.2 but EU→GU

---

## 4. THE E2 → E3 INTEGRATION

### 4.1 The shape-augmented ChartModel

Add the shape chain to the ChartModel so E3 can consume it:
```typescript
interface ChartModel {
  // ... existing fields ...
  shapeChain?: ShapePredictionSnapshot;  // E2 output (this pair's cascaded shape chain)
}
```

### 4.2 selectPairNativeZone consumes E2

When the cascade calls `selectPairNativeZone`, it passes the shape day-map:
```typescript
function selectPairNativeZone(
  targetLmv, targetObZones, zoneClass, direction,
  sourceFormationMs, targetSpot, opts?,
  shapeDayMap?,  // NEW: the E2 day-map for this pair
): ZoneModel | LqzZoneMatrix | null
```

When `shapeDayMap` is provided:
1. If `shapeDayMap.keyZoneId` is set → select that EXACT zone (the E2-designated zone)
2. If no exact match → filter candidates to zones of the correct class + side that
   are ACTIVE (have reactions) near the shape day's projected range [floor, ceiling]
3. Rank by proximity to the shape day's key zone price, then by strength

This replaces ALL heuristics (spot gate, formation-time ranking, etc.) with
the E2 shape chain's forward projection.

### 4.3 computeLmvTP consumes E2

When the TP walk runs, it uses the shape day-map's projected opposing zone:
```typescript
function computeLmvTP(
  entry, sl, direction, targetModel, targetPair, pipValue, opts?,
  shapeDayMap?,  // NEW: the E2 day-map for this pair
)
```

When `shapeDayMap` is provided:
1. The TP target = the shape day's projected opposing zone (the zone the shape
   chain says price will reach)
2. If the projected opposing zone has a defendedEdge → TP = that defendedEdge
3. Fallback: the existing nearest-first walk (unchanged)

### 4.4 The cascade receives E2 data

```typescript
function cascadeV45(
  dxySetups: TradeSetup[],
  models: { DXY: ChartModel; 'EUR/USD': ChartModel; 'GBP/USD': ChartModel },
  ctx?,  // existing context
  // NEW: the E2 shape chains (each pair's cascaded chain)
  shapeChains?: {
    dxy: ShapePredictionSnapshot;
    eu: ShapePredictionSnapshot;
    gu: ShapePredictionSnapshot;
  },
)
```

The cascade passes the relevant shape day-map to `reAnchorMirror` for each
source setup, based on the setup's day:
```typescript
const dayIdx = setup.battleMs ? dayIndex(setup.battleMs) : 0;
const euShapeDay = shapeChains?.eu.chain[dayIdx];
// ... passed to selectPairNativeZone and computeLmvTP
```

---

## 5. IMPLEMENTATION PLAN

### Module 1: `src/mdve/shape-cascade.ts` (NEW, ~200 lines)

```typescript
/**
 * cascadeShapeChain — cascades DXY's shape prediction to EU and GU.
 *
 * DXY shape → EU: same shapes, INVERTED direction, EU's own zones
 * EU shape → GU: same shapes, KEPT direction, GU's own zones
 */
export function cascadeShapeChain(
  dxyChain: ShapePredictionSnapshot,
  dxyModel: ChartModel,
  euModel: ChartModel,
  guModel: ChartModel,
): {
  eu: ShapePredictionSnapshot;
  gu: ShapePredictionSnapshot;
}
```

For each day in the chain:
1. Copy the shape (SS/BS/R/WL) — the macro move is the same
2. Invert direction for EU (DXY LONG → EU SHORT)
3. Keep direction for GU (EU SHORT → GU SHORT)
4. Find the key zone on the target pair:
   - Extract the DXY key zone's class (BoM/MoM/LQZ) and role (supply/demand)
   - Invert the role for EU (DXY supply → EU demand for inverted direction)
   - Keep the role for GU
   - Find the target pair's strongest zone of that class + role + side
   - That zone becomes the shape day's keyZoneId

### Module 2: Wire E2 into report-v452.ts (~50 lines)

After `buildChartModel` for all 3 pairs:
1. Create a ShapeBrain instance for DXY
2. Feed it DXY's zone map
3. Call `brain.compute()` → DXY shape chain
4. Call `cascadeShapeChain(dxyChain, dxyModel, euModel, guModel)` → EU + GU chains
5. Attach the shape chains to each pair's ChartModel
6. Pass the shape chains to `cascadeV45`

### Module 3: Modify selectPairNativeZone (~40 lines)

Add `shapeDayMap` parameter. When provided:
- Select the E2-designated key zone if available
- Filter candidates by the shape day's projected range
- Rank by proximity to the shape day's key zone price

### Module 4: Modify computeLmvTP (~20 lines)

Add `shapeDayMap` parameter. When provided:
- Target the shape day's projected opposing zone

### Module 5: Modify cascadeV45 (~30 lines)

Accept `shapeChains` parameter. For each source setup, look up the
corresponding shape day and pass it through.

### Module 6: Port tangible improvements (~existing code)

Port from /tmp/opencode/plutus-improvements/:
1. trade-dedup.ts (NEW file, copy)
2. accurate-stats.ts (NEW file, copy)
3. report-v452.ts (NEW file, copy + modify to fire E2)
4. types.ts (add battleMs)
5. setup-gen.ts (add F1-A, F1-B, dual-entry, battleMs — v45-gated)
6. mdve-stage.ts (add floorSetupsToDedupRows, dayOpenPriceProvider)
7. mirror.ts (add mirrorToDedupSetupV452)

---

## 6. THE INVARIANTS

1. **Frozen files untouched** — lmv.ts, sl-lmv.ts, engine.ts, lqz-matrix.ts,
   visual-setup-generator.ts, and all frozen harness scripts remain byte-identical.
2. **v4.4 geometry preserved** — all v45-specific changes behind `geometry === 'v45'`.
3. **Determinism** — same fixture → byte-identical report. No wall-clock.
4. **E1 parallel** — each pair's zone map is built from its own bars, independently.
5. **E2 cascade order** — DXY first, then EU (inverted), then GU (kept). Never
   the reverse.
6. **E3 reads E2** — the cascade's zone selection and TP targeting use the E2
   shape day-map. No spot-price evaluation. No heuristic ranking.
7. **The 23 golden trades** — the acceptance oracle. Every trade at ±3 pips
   of the golden levels with RRR ≥ 3.5.

---

## 7. THE ACCEPTANCE CRITERIA

1. **E2 fires** — ShapeBrain computes DXY shape chain after E1
2. **E2 cascades** — DXY chain → EU (inverted) → GU (kept)
3. **E3 uses E2** — selectPairNativeZone selects the E2-designated zone
4. **EU produces 8 trades** — matching the golden-8 at ±3 pips
5. **GU produces 7 trades** — matching the golden-7 at ±3 pips
6. **All RRR ≥ 3.5** — the operator's standard
7. **Determinism** — byte-identical report across runs
8. **Container test** — fresh agent runs the pipeline, forecast vs reality
   visual eval shows the 23 golden trades overlaid

---

## 8. FILE CHANGE SUMMARY

| File | Action | Lines |
|---|---|---|
| `src/mdve/shape-cascade.ts` | NEW | ~200 |
| `src/mdve/mirror.ts` | MODIFY (add shapeDayMap to selectPairNativeZone + computeLmvTP; add mirrorToDedupSetupV452) | ~60 |
| `src/mdve/index.ts` | MODIFY (export cascadeShapeChain) | ~5 |
| `src/types.ts` | MODIFY (add battleMs to TradeSetup) | ~5 |
| `src/mdve/setup-gen.ts` | MODIFY (F1-A, F1-B, dual-entry, battleMs — v45-gated) | ~80 |
| `src/pipeline/mdve-stage.ts` | MODIFY (add floorSetupsToDedupRows, dayOpenPriceProvider) | ~40 |
| `src/mdve/trade-dedup.ts` | NEW (port from improvements) | 524 |
| `src/report/accurate-stats.ts` | NEW (port from improvements) | 400 |
| `report-v452.ts` | NEW (port + modify to fire E2) | ~570 |
| `verify-dedup.ts` | NEW (port) | 342 |
| `verify-accurate-stats.ts` | NEW (port) | 376 |
| **TOTAL** | | ~2,600 |

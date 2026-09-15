# PLUTUS v4.5.2 OVERHAUL — SHARK-CME ENGINEERING SPEC (Phases 0–8) — EXPANDED EDITION
## E1 TELESCOPING + LMV RESOLUTION + OBCV + E2 FORWARD MAP + INTERLEAVED CASCADE + RRR≥3.0 + VERIFICATION

**Version:** 2.0 EXPANDED FINAL
**Status:** BUILD-AUTHORITATIVE — read AFTER Bible 4.0 + Bible 4.5, BEFORE any code
**Date:** 2026-07-31 (expanded 2026-07-31)
**Base:** Checkpoints/v4.5.2_E2_CASCADE (pristine v4.5.1 fork + 7 improvements + E2 cascade)
**Working tree:** src/ (Phase 0 RESTORED — verified byte-identical, tsc 0, build success, determinism e02fbe58 ×2)
**Locked baseline:** v4.5.1_LIVE_MARKET_CAPABLE (operator: "4.5.1 is the new baseline which i have also locked immutable")
**Acceptance oracle:** all 23 golden trades at ±3 pips (DXY 8 + EU 8 + GU 7), RRR ≥ 3.0 emission minimum, ≥ 3.5 executed standard
**Current baseline (2026-07-31 honest measurement):** 11/22 at ≤3 pip — DXY 6/6 (Δ0.1-1.5p), EU 2/8, GU 3/7

---

## PART 0 — THE ARCHITECTURE (operator-mandated, 2026-07-31)

### 0.1 The Interleaved Pipeline Order (verbatim doctrine)

```
DXY: E1 → E2 → E3                                    (full, completes first)
EU:  E1 → DXY-Inverse E2 Cascade → E2 → DXY-Inverse E3 Cascade
                                        (ZONE-ANCHORED setups, not price-anchored)
     → E3 + EU emergent trades on top
GU:  E1 → EU E2 Cascade → E2 → EU E3 Cascade
                                        (zone-anchored)
     → E3 + GU emergent trades on top
```

**The cascade law (canon):** DXY LONG → EU SHORT (inverse) → GU SHORT (kept) · DXY SHORT → EU LONG (inverse) → GU LONG (kept). **DXY provides DIRECTION. The PAIR provides LEVELS.** Mathematical conversion FORBIDDEN — structural equivalence only. "this preserves macro structure while also allowing for pair specific variance."

### 0.2 The Machine Roles

| Machine | Detects | Method | Anchor outputs |
|---------|---------|--------|----------------|
| **LMV** | LQZs | Candle-matrices (1-6 week OHLC reactions), column reductions → reactionExtreme + defendedEdge | Entry = defendedEdge; SL = next rung rxExtreme + buffer; TP = opposing rung defendedEdge w/ S/D overlap |
| **OBCV** | BoM/MoM S/D | Displacement field → origin-candle feature matrix → prior-move classifier → telescoping incidence | Zone = [origin.low, origin.high]; BoM = prior NONE/OPPOSITE + bw≥3.0 + bf≥0.65; 4H/1H origins only |
| **E2** | Shapes + day zones | ZFP-conditioned transitions + day decomposition + projectZoneForDay | keyZoneId AUTHORITATIVE; ENTRY rungs; DayBand day-native spot |
| **E3** | Trade setups | selectPairNativeZone + computeLmvTP + computeSL_LMV + refinement machine | The 23 golden trades |

### 0.3 The 8 Immutable Operating Constraints

1. Precision is the ONLY metric — 3-pip count, never a looser tolerance
2. Never lower standards — RRR ≥ 3.0 minimum, 4+ norm
3. Fix the map, not the ranking — levels must EXIST first (telescoping → LMV → OBCV order)
4. E2 designates the zone, E3 obeys — keyZoneId authoritative
5. LQZ runs 1H→30m→15m; BoM 4H/1H only; 30m MoM only
6. No repeat of the 18 documented derailments
7. DXY direction, pair levels; zone-anchored; Friday spot Monday-E2-only
8. Don't stop; don't fake coverage; verify mechanically

### 0.4 THE ACCEPTANCE ORACLE — THE 23 GOLDEN TRADES (complete reference)

**DXY 8 (Tier A — documented exact, verbatim):**

| # | Day | Setup | Entry | SL | TP | Risk (p) | Reward (p) | RRR | Zone |
|---|-----|-------|-------|----|----|------|--------|-----|------|
| 1 | Mon | SS Long | 100.945 | 100.905 | 101.115 | 4.0 | 17.0 | 4.25 | 1H LQZ |
| 2 | Mon | BS Short | 101.14 | 101.200 | 100.845 | 6.0 | 29.5 | 4.92 | 1H LQZ |
| 3 | Tue | SS Long | 100.845 | 100.77 | 101.190 | 7.5 | 34.5 | 4.60 | 1H MoM |
| 4 | Wed | SS Short | 101.19 | 101.25 | 100.975 | 6.0 | 21.5 | 3.58 | 1H LQZ |
| 5 | Wed | RWL Long | 100.975 | 100.905 | 101.240 | 7.0 | 26.5 | 3.79 | 1H LQZ |
| 6 | Wed | BS Short | 101.235 | 101.330 | 100.680 | 9.5 | 55.5 | 5.84 | 4H BoM |
| 7 | Thu | Ladder Short | (multiple at LQZ) | — | — | — | — | — | 1H LQZ |
| 8 | Fri | Whiplash + RWL | (continuation) | — | — | — | — | — | 1H LQZ |

**Documented key levels (verbatim):** LQZ = 100.845, 100.945, 100.975, 101.14, 101.19, 101.235, 101.240 · BoM = 100.680 (1H), 101.330 (4H) · MoM = 100.845 (1H).

**EU 8 (Tier D — pixel-inferred, ±2 pips):**

| # | Cascade | Day | Dir | E | SL | TP | RRR (est) |
|---|---------|-----|-----|---|----|----|-----------|
| EU-1 | DXY#1 Mon SS Long → | Mon | SHORT | 1.14544 | 1.14578 | 1.14103 | 12.9 |
| EU-2 | DXY#2 Mon BS Short → | Mon | LONG | 1.14004 | 1.13950 | 1.14250 | 4.6 |
| EU-3 | DXY#3 Tue SS Long → | Tue | SHORT | 1.14205 | 1.14250 | 1.13964 | 5.4 |
| EU-4 | DXY#4 Wed SS Short → | Wed | LONG | 1.13950 | 1.13900 | 1.14276 | 6.5 |
| EU-5 | DXY#5 Wed RWL Long → | Wed | SHORT | 1.14325 | 1.14353 | 1.14039 | 10.2 |
| EU-6 | DXY#6 Wed BS Short → | Wed | LONG | 1.13953 | 1.13900 | 1.14277 | 6.1 |
| EU-7 | DXY#7 Thu Ladder → | Thu | SHORT ladder | 1.14408 | 1.14441 | 1.14150 | 7.8 |
| EU-8 | DXY#8 Fri Whiplash → | Fri | SHORT | 1.14505 | 1.14544 | 1.14106 | 10.2 |

**GU 7 (Tier D):**

| # | Cascade | Day | Dir | E | SL | TP | RRR (est) |
|---|---------|-----|-----|---|----|----|-----------|
| GU-1 | EU Mon SS Short → | Mon | SHORT | 1.33882 | 1.34021 | 1.33347 | 3.8 |
| GU-2 | EU Mon/Tue BS Long → | Tue | LONG | 1.33522 | 1.33331 | 1.33941 | 2.2 ⚠ |
| GU-3 | EU Tue SS Short → | Tue | SHORT | 1.33941 | 1.34021 | 1.33629 | 3.9 |
| GU-4 | EU Wed SS Long → | Wed | LONG | 1.33629 | 1.33522 | 1.33941 | 2.9 ⚠ |
| GU-5 | EU Wed RWL Short → | Wed | SHORT | 1.34075 | 1.34246 | 1.33750 | 1.9 ⚠ |
| GU-6 | EU Fri Short → | Fri | SHORT | 1.34360 | 1.34481 | 1.34021 | 2.8 ⚠ |
| GU-7 | EU Fri Short → | Fri | SHORT | 1.34481 | 1.34587 | 1.34021 | 4.3 |

**⚠ rows = refinement-machine targets:** proper E/SL/TP anchors on the SAME zones produce 3-4R (2026-07-31 ruling: "Most of these 1.5-2 R trades can easily be 3-4 R trades with properl E/SL/TP anchors on the exact same zones").

**The Tier B axis labels (the pair-native levels — EU ladder 1.14649→1.13850; GU ladder 1.34587→1.33000):** see Bible 4.5 Part 8.2 — these are the golden level sets the pair maps must contain.

### 0.5 The Phase Dependency Graph

```
Phase 0 (restore src/) — DONE 2026-07-31
    ↓
Phase 2 (E1 telescoping) ──→ Phase 3 (LMV resolution) ──→ Phase 4 (OBCV)
    ↓                          ↓                            ↓
Phase 5 (E2 forward map) ←────┘ (needs telescoped map)      │
    ↓                                                        │
Phase 6 (interleaved cascade) ←─────────────────────────────┘
    ↓
Phase 7 (RRR ≥ 3.0 + refinement machine)
    ↓
Phase 8 (verification: diag suite → container test → visual eval → ship)
```

**Dependency rules:** Phase 2 MUST complete before 3/4/5 (the map must exist before the machines consume it — "Fix the map, not the ranking"). Phase 4 (OBCV) is independent of 3 (LMV) but both feed the same zone map. Phase 5 needs the E2-authoritative selectPairNativeZone which needs the Phase-2 map. Phase 6 needs 3+4+5 outputs. Phase 7 gates on 6. Phase 8 gates on everything.

---

# PHASE 0 — WORKING TREE RESTORE — ✅ COMPLETE (2026-07-31)

## 0.1 What Was Done (mechanical evidence)

| Step | Command | Result |
|------|---------|--------|
| Backup stale src/ | `mv src src_OLD_STALE_LINEAGE_2026-07-31` | Done |
| Restore from checkpoint | `cp -r Checkpoints/v4.5.2_E2_CASCADE/src src` | Done |
| Byte-verify | `diff -rq Checkpoints/v4.5.2_E2_CASCADE/src src` | IDENTICAL (exit 0, empty) |
| Typecheck | `npx tsc --noEmit` | 0 errors |
| Build | `bun build src/index.ts --outdir dist --target bun` | 139 modules, 1.18 MB, success |
| Report | `bun report-v452.ts` | 32 trades, 18W/6L (75%), +40.12R |
| Determinism | sha256 report_v452.md ×2 | **e02fbe58 ×2 — byte-identical** |
| Diag scripts | report-v452.ts, diag-golden-coverage.ts, diag-e2-zones.ts, diag-eu-shapebrain.ts, diag-gu-cascade.ts, diag-eu-spread.ts, verify-dedup.ts, verify-accurate-stats.ts copied to root | Done |
| diag-golden-coverage | REWRITTEN to 3-pip-primary (30-pip delusion BANNED) | 11/22 baseline |

## 0.2 Remaining Phase-0 Items

1. **Fix the stale MANIFEST:** `Checkpoints/v4.5.2_E2_CASCADE/MANIFEST.md` currently contains the v4.4 manifest (SHA 0dedd262, "LOCKED IMMUTABLE 2026-07-28") — replace with the actual E2_CASCADE manifest (base, SHA chain, ported improvements, frozen list, this spec's URL) or delete it.
2. **Verify config parity:** root config.json plugin path must match `plutus-agent/dist/index.js` (the checkpoints' config). If it points at `plutus-engine/dist/index.js`, update.
3. **git init in src/** (if not a repo): the working-tree discipline — every phase = commit + checkpoint save.

## 0.3 Gate (already passed — re-verify before Phase 2)

- [ ] tsc 0 · [ ] bun build success · [ ] determinism e02fbe58 ×2 · [ ] src/ == checkpoint byte-verified

---

# PHASE 2 — E1 TELESCOPING (THE FOUNDATION — the root cause of all macro derailments)

## 2.1 Doctrine (operator verbatim, 2026-07-31)

> "S/D zones are charted on 4H and refined down to 1H, also can be charted on 1H and refined down to 30m (for 1H specific OBs that are not visible on 4H - nested S/D zones can exist)"
> "30m is not an origin point for BoM S/D zones - valid for MoM S/D zones to identifiy E2 reaction points for SS/R shapes but BoM OBs are 4H/1H only w/ 30m only for minor telescoping refinement of 1H origin OBs"
> "LQZ similarly starts on 1H and is refined down to 30m + started on 30m and refined down to 15m"
> "All of these are telescoping refinment procedures."

**The compressed law (mechanical gate):**
- S/D: 4H → 1H refinement; 1H → 30m refinement (nested zones allowed)
- BoM origins: 4H/1H ONLY (30m NEVER a BoM origin)
- MoM: 30m VALID (E2 reaction points for SS/R shapes)
- LQZ: 1H → 30m → 15m telescoping (origin detection per TF, refinement down)
- LTF never overrides HTF direction (Bible 4.0 Law 1)

## 2.2 Current State (forensic-verified 2026-07-31)

| Lane | Timeframes | Cross-TF logic | Status |
|------|-----------|---------------|--------|
| Live emergent (engine.ts) | 4H S/D + 1H LQZ only | NONE | `timeframe:'4H'` hardcoded at :465; `ohlc[pair]` = 4H at :223 |
| MDVE (ob-engine.ts) | 4H + 1H + 30m OBs | NONE — concatenated + sorted (:348-354) | MDVE_TIMEFRAMES=['4H','1H','30m'] (:45) |
| Legacy (plutus-tte-pipeline.ts) | 4H/1H/30m/15m + refinedLabel (:3021-3179) | YES — the ONLY telescoping code | **DEAD** (not in live tool registry) |

**Harvest coverage per TF (the telescoping feasibility constraint — from PLUTUS_DXY_FORENSIC.md:49-54):**

| TF | Bars available | ≈ Lookback |
|----|---------------|------------|
| 4H | 500 | ≈ 83 days |
| 1H | 1500 | ≈ 62 days |
| 30m | 500 | ≈ 10 days |
| 15m | 300 | ≈ 3 days |

**⚠ CRITICAL FEASIBILITY NOTE:** for OLD replay weeks (the golden fixture), the 30m/15m lanes are SHORT — 30m ≈ 10 days, 15m ≈ 3 days. The LQZ detector's 720-bar lookback (6 weeks) CANNOT be satisfied on 30m/15m for old weeks. **Resolution:** per-TF lookback scaling — 30m uses available bars (cap at 500), 15m uses available (cap at 300); the detector's lookback window becomes `min(720, available)` with a MINIMUM of `SWEEP_LEVEL_LOOKBACK_BARS[tf] + SHARP_MOVE_WINDOW_BARS[tf] + 20` (the reaction window must be satisfiable or the TF tier is skipped with a completeness-record note — the MPSE totality discipline: an unexamined region is RECORDED, never silently skipped). For LIVE weeks the full lookback is available.

## 2.3 Module T1 — LQZ TF Parameterization

**File:** `src/brains/lqz-lobe.ts:264-269`
**Change:** add `timeframe: '4H'|'1H'|'30m'|'15m'` param to `detectLiquidityZones(pair, bars, lookbackBars, timeframe?)` — default '1H' (backward compatible; all existing callers unchanged).

**The 14 canon constants per TF (the scaling table):**

| Constant | 1H (canon) | 30m | 15m | Line |
|----------|-----------|-----|-----|------|
| SWEEP_LEVEL_LOOKBACK_BARS | 24 | 20 | 30 | :117 |
| SWEEP_THICK_BODY_MULT | 1.5 | 1.5 | 1.5 | :120 |
| SWEEP_MIN_BEYOND_PIPS | 2 | 1.5 | 1 | :123 |
| SWEEP_REVERSAL_WINDOW_BARS | 6 | 5 | 4 | :126 |
| LONG_WICK_BODY_MULT | 2.5 | 2.5 | 2.5 | :137 |
| LONG_WICK_MIN_PIPS | 5 | 3 | 2 | :140 |
| SHARP_MOVE_WINDOW_BARS | 3 | 3 | 3 | :143 |
| SHARP_MOVE_MIN_PIPS | 15 | 10 | 6 | :146 |
| SHARP_MOVE_ATR_MULT | 1.5 | 1.5 | 1.5 | :149 |
| SHORT_WICK_MAX_PIPS | 3 | 2 | 1.5 | :154 |
| SHORT_WICK_CLUSTER_MIN_BARS | 3 | 3 | 3 | :157 |
| SHORT_WICK_CLUSTER_TOL_PIPS | 2 | 1.5 | 1 | :160 |
| CONSOL_MAX_SPAN_PIPS | 25 | 15 | 8 | :163 |
| LQZ_ALIGN_TOLERANCE_PIPS | 3 | 2 | 1 | :168 |

**Scaling anchor:** SINGULAR_CANDLE.BARS_PER_DAY {'4H':6,'1H':24,'30m':48,'15m':96} (trading-constants.ts:918-923). The 30m/15m values derive from the 1H canon by the TF bar-count ratio (24/48 = 0.5, 24/96 = 0.25 applied to pips; lookbacks scale inversely: 30m needs FEWER bars per day but the same event coverage → 20 (48/24×10=20? No — 30m has 2× the bars of 1H per day; a 24-bar 1H window ≈ 1 day ≈ 48 bars of 30m... BUT the canon's 24-bar 1H sweep lookback is CALIBRATED to 1-day event horizons. For 30m, the equivalent event horizon = 48 bars, but the canon DXY_FORENSIC swing lookback for 30m is 20 per the telescope spec §3.5 (sweepLookback: 4H=8, 1H=12, 30m=20, 15m=30). **AUTHORITATIVE: use the telescope spec's sweepLookback (1H=12/30m=20/15m=30) for the SWEEP pattern; keep the canon 24 for the lqz-lobe LIQUIDITY_SWEEP lookback at 1H, scale 30m→20, 15m→30 per the telescope. Document the choice in a comment: "sweep lookback per VISUAL_TELESCOPE_CHARTING_T2 §3.5".**

**Edge cases:**
- `bars.length < minRequired(tf)` → return [] with a completeness note (never throw)
- `timeframe` not in the enum → throw TypeError (totality — no silent default beyond '1H')
- Anchored bars only (b.timestamp ≤ ANCHOR_MS) — no future leak (the W7-A temporal-leak discipline)

**Interface:**
```typescript
export interface LqzDetectionResult {
  zones: LqzZone[];
  timeframe: Timeframe;
  completeness: { bucketsExamined: number; bucketsEmpty: number; barsScanned: number };
}
export function detectLiquidityZones(
  pair: string,
  bars: OHLCBar[],
  lookbackBars?: number,        // default LQZ_LOOKBACK_BARS=720 (1H); scaled per TF
  timeframe?: Timeframe,        // default '1H'
): LqzDetectionResult;
```

## 2.4 Module T2 — 4H S/D → 1H Refinement (nested zones)

**Files:**
- `src/mdve/ob-engine.ts:348` — insert the nesting pass BEFORE the sort/concatenate at :348-354
- `src/pipeline/engine.ts:479-481` — emergent lane: add `construct4HZones({..., timeframe: '1H'})` call (bars available at :472) + same nesting merge

**The nesting pass (normative pseudocode):**
```typescript
function applyNestingPass(zones: ZoneModel[]): ZoneModel[] {
  const htf = zones.filter(z => z.timeframe === '4H');
  const ltf = zones.filter(z => z.timeframe === '1H');
  for (const z1 of ltf) {
    for (const z4 of htf) {
      if (z1.type !== z4.type) continue;                    // same-type only (SUPPLY|DEMAND)
      if (z1.bottom >= z4.bottom && z1.top <= z4.top) {     // containment: [z1] ⊆ [z4]
        z1.refinedLabel = '1H Refined 4H';
        z1.nestedWithin = z4.id;
        z4.confluence = Math.min(14, (z4.confluence ?? 0) + 3);   // dual-TF bonus (Law 32)
        z4.refinedBy = z1.id;                               // the finer edge wins for entry
        break;
      }
    }
    // no parent found → z1 is an INDEPENDENT zone (top-level) — kept as-is
  }
  return zones;
}
```

**Interface change — `ZoneModel` (mdve/types.ts:131-142) gains:**
```typescript
refinedLabel?: string;    // '1H Refined 4H', '30m Refined 1H', '15m Refined 30m'
nestedWithin?: string;    // parent zone id
refinedBy?: string;       // the child zone id that refines this zone's edge
parent?: ZoneModel;       // OBCV telescoping link (Phase 4)
```
`DXYZone.refinedLabel` already exists (types.ts:206); renderers already honor it (report-generator.ts:537, md-report-generator.ts:515).

**Confluence rules (canon):** dual-TF +3, triple-TF +5 (Law 32; trading-constants.ts:512-513 DUAL_BRAIN_AGREEMENT_BONUS_DUAL=5/TRIPLE=15 are the DUAL-BRAIN bonuses — the LAW-32 nesting bonuses are +3/+5, use the law values, cite Law 32). Cap at 14 (the confluence max).

## 2.5 Module T3 — 1H OB → 30m Minor Refinement

**File:** `src/mdve/ob-engine.ts:346`
**Change:** 30m zones entirely within a 1H zone (same type) refine the 1H zone's minor edge; tag "30m Refined 1H". The 30m OB construction already exists (:333-345) — only the cross-TF linkage is missing.

```typescript
// after the 30m branch in buildZoneMap:
for (const z30 of zones.filter(z => z.timeframe === '30m')) {
  const parent = zones.find(z => z.timeframe === '1H' && z.type === z30.type
                              && z30.bottom >= z.bottom && z30.top <= z.top);
  if (parent) {
    z30.refinedLabel = '30m Refined 1H';
    z30.nestedWithin = parent.id;
    z30.parent = parent;
  }
  // NO parent → 30m zone is REJECTED here (orphan rule, Phase 4) —
  // for Phase 2, tag it `refinedLabel: undefined` + `classification: 'MoM'` (T4 gate)
}
```

**The BoM origin gate (T4) applies at construction:** every 30m zone gets `classification: 'MoM'` regardless of the classifier (the doctrine: 30m is NOT a BoM origin).

## 2.6 Module T4 — 30m MoM-Only + E2 Delivery

**Files:**
- `src/mdve/bom-mom.ts:79-106` — add `timeframe` to BoMMoMInput; gate at the TOP of classifyBoMMoM: `if (input.timeframe === '30m' || input.timeframe === '15m') return 'MoM';`
- `src/mdve/ob-engine.ts:339-344` — force `classification: 'MoM'` for all 30m zones (belt + suspenders)
- `src/brains/4h-sd-lobe.ts:147-149` — gate `isBoM = tf !== '30m' && tf !== '15m' && classifyOrderBlock(...)` (protects ANY future 30m/15m construct4HZones call, including the legacy pipeline at plutus-tte-pipeline.ts:3061-3067 which today can emit 30m BoM — a live doctrine violation)
- `src/brains/shape-brain.ts:608` — deliver 30m MoM zones to E2 as SS/R reaction points. **Current:** the shapes tool reads the 4H-only snapshot (shape-brain.ts:167 identifyCurrentShape reads DXYZone[] from the snapshot). **Change:** the shapes tool merges `ChartModel.zones` (30m MoM) or a dedicated 30m-MoM lane into the shape classifier's zone set — the 30m MoM zones become the reaction points the SS/R day shapes reference.

**The gate table (the doctrine made mechanical):**

| TF | BoM origin? | MoM? | Role |
|----|------------|------|------|
| 4H | ✅ YES | ✅ YES | Strategic S/D, HTF swings |
| 1H | ✅ YES | ✅ YES | Tactical S/D, entry zones |
| 30m | ❌ NEVER | ✅ YES | MoM reaction points for SS/R; minor refinement of 1H origins ONLY |
| 15m | ❌ NEVER | (LQZ-only lane) | LQZ refinement of 30m levels |

## 2.7 Module T5 — LQZ 1H→30m→15m Telescoping

**Files:**
- `src/pipeline/engine.ts:472-480` — add `detectLiquidityZones(pair, bars30m, 720, '30m')` + `detectLiquidityZones(pair, bars15m, 720, '15m')` (bars at :277-280 via `ohlcByPairTf[pair]?.['30m'|'15m']`)
- Nested-refinement merge BEFORE `mergeLqzWithIpZones` at :480
- `src/mdve/index.ts:161-178` — thread 30m/15m bars into `buildLqzMatrix`/`buildLmvTable` for matrix refinement tiers (Phase 3 depends on this)

```typescript
function telescopeLqzTiers(lqzByTf: Record<Timeframe, LqzZone[]>): LqzZone[] {
  const all: LqzZone[] = [];
  for (const tf of ['1H', '30m', '15m'] as Timeframe[]) {
    for (const z of lqzByTf[tf] ?? []) {
      const parent = tf === '30m'
        ? (lqzByTf['1H'] ?? []).find(p => p.side === z.side && z.bottom >= p.bottom - 0 && z.top <= p.top + 0)
        : tf === '15m'
          ? (lqzByTf['30m'] ?? []).find(p => p.side === z.side && z.bottom >= p.bottom && z.top <= p.top)
          : undefined;
      if (parent) { z.refinedLabel = tf === '30m' ? '30m Refined 1H' : '15m Refined 30m'; z.nestedWithin = parent.id; }
      all.push(z);   // KEPT regardless — the resolution principle: nested rungs are NEVER merged
    }
  }
  return all;
}
```

**THE RESOLUTION PRINCIPLE (2026-07-31 — the golden-rung fix):** the lower-TF runs produce the FINE rungs (0.5-pip separation) that the 1H run cannot see. 100.945 vs 100.975 (3.0p) resolves on 30m; 101.235 vs 101.240 (0.5p) resolves on 15m. **Nested rungs are KEPT, never merged** — the 3-pip dedup applies only WITHIN a TF tier (Phase 3 L2 tightens LQZ_M to 1 pip).

## 2.8 Module T6 — Zone Map Snapshot Merge (kill the two-parallel-universes bug)

**File:** `src/pipeline/engine.ts:517-524`
**Change:** after `ctx.chartModelsByPair` is built (:546), run the T2/T3/T5 refinements on ChartModel.zones and merge the telescoped MDVE zones into `zonesByPair`/`snapshot`:

```typescript
zonesByPair[pair] = [
  ...pillarZones,                        // RETIRED to SL/TP rungs only — NEVER entry (DECISION-1)
  ...telescopedSdZones,                  // 4H + 1H + 30m MoM, refinedLabel-tagged
  ...telescopedLqzZones,                 // 1H + 30m + 15m, refinedLabel-tagged
];
```

report-v452 consumes ChartModel.zones at :103-105 → telescoping propagates to source setups + cascade automatically.

## 2.9 Phase 2 Invariants (asserted at the gate)

1. **BoM-origin law:** no zone with `classification === 'BoM'` has `timeframe === '30m' || '15m'`
2. **Nesting law:** every `refinedLabel` zone has `nestedWithin` set; every parent's child is strictly finer (LTF ⊆ HTF)
3. **LTF-never-overrides-HTF:** a refined zone's direction is inherited from its parent when types match (Law 1)
4. **Totality:** every TF lane examined is recorded in the completeness record (even when skipped for insufficient bars)
5. **No future leak:** all zones formed from bars with `timestamp ≤ ANCHOR_MS` (W7-A discipline)

## 2.10 Phase 2 Test Spec

**Unit tests (diag-telescoping-ts, ~20 assertions):**
- U1: `detectLiquidityZones(pair, bars1H)` output is unchanged from the pre-T1 baseline (backward compat — byte-identical zone set on the golden fixture)
- U2: `detectLiquidityZones(pair, bars30m, 720, '30m')` returns zones with `timeframe === '30m'` and TF-scaled thresholds applied (spot-check: SWEEP_MIN_BEYOND 1.5)
- U3: 30m zones are ALL classified MoM (zero BoM at 30m)
- U4: a 1H zone inside a 4H zone gets `refinedLabel === '1H Refined 4H'` + the parent's confluence +3
- U5: 15m LQZ inside 30m LQZ gets '15m Refined 30m'; both rungs SURVIVE (never merged)
- U6: insufficient-bars TF lane returns [] + completeness note (no throw)
- U7: every zone's `formationMs` ≤ ANCHOR_MS

**Golden fixture tests (the acceptance):**
- G1: 7 golden DXY levels present in the map (100.845, 100.945, 100.975, 101.14, 101.19, 101.235, 101.240) — computed, not hardcoded
- G2: EU ladder levels present (1.14544, 1.14205, 1.14004, 1.13950, 1.13953, 1.14325, 1.14408, 1.14505)
- G3: GU ladder levels present (1.33882, 1.33522, 1.33941, 1.33629, 1.34075, 1.34360, 1.34481)
- G4: determinism — same fixture → byte-identical map (sha256 of the serialized map ×2)

## 2.11 Phase 2 Acceptance Gate

**`diag-telescoping.ts` (NEW):** asserts G1-G4 + U1-U7. **"This is the definitive test of E1 — if E1 is fucked, everything on top is fucked."** (operator, 2026-07-31)

---

# PHASE 3 — LMV RESOLUTION UPGRADE (the definitive machine)

## 3.1 Doctrine

> "this is the definitive test of LMV. LMV is the most important machine in the MDVE - if it cannot copute these LQZs there is a major issue we need to address"
> "if the current LMV + LQZ matrix are not identifying any of the gold standard LQZs then they obviously need modification and the current versions are just working prototypes"

**lmv.ts (77e56cd0) + lqz-matrix.ts are now MUTABLE PROTOTYPES.** sl-lmv.ts stays frozen UNLESS the LMV interface changes (then contract-update + new hash, documented in BUILD_STATE).

**Frozen-list verification note (2026-07-31 forensic):** lmv.ts, sl-lmv.ts, lqz-matrix.ts are **byte-identical across ALL five trees** (v4.5.2_FINAL, v4.5.3, v4.5.4, v4.5.5, E2_CASCADE) — the LMV core NEVER changed; ALL version evolution happened in the CALLERS (setup-gen.ts, mirror.ts). The wipe did not lose LMV code — it lost 3 mirror.ts fixes (L5 below).

## 3.2 The 4 Failure Mechanisms (why 3/7 today)

| # | Mechanism | Evidence | Fix |
|---|-----------|----------|-----|
| 1 | ε=2-pip reaction band merges 3.0p pairs (100.975 absorbed into 100.945) | ONE matrix [100.936-100.972], ONE entry 100.977 (FAILURE_LOG_2026-07-29.md:68) | Modal-cluster emission (L1) + 30m/15m telescoped runs (T5) |
| 2 | Prominence-weighted center drifts from the modal reaction level | 101.19 emits at 101.208 (Δ1.8p); 101.235 at 101.253 (Δ1.8p) | One rung per MODAL defended-edge cluster (L1) |
| 3 | 3-pip ladder dedup kills ≤3p pairs (101.235/101.240 = 0.5p) | One survives, one erased | LQZ_M rungs dedup at 1 pip (L2) |
| 4 | Matrix LQZ never enters model.zones | Mirror anchor search can't see them (Bible 4.0:2647 still true) | matrix→model.zones bridge (L3) |

**The emitted-rung evidence (report_v452.md rows 30-44):** 100.849 (Δ0.4p vs 100.845 ✓), 100.949 (Δ0.4p vs 100.945 ✓), 101.000, 101.054, 101.130 (Δ1.0p vs 101.14 ✓), 101.253 — **100.975, 101.19, 101.235, 101.240 have NO dedicated emitted rung.** Underlying zone-matrices DO form at the golden regions: [100.936-100.972] (100.945 shelf), [101.188-101.226] (range-top supply), [101.239-101.275] — but the EMITTED CENTERS drift 1-2 pips from the labels (BUILD_STATE.md:226).

## 3.3 Module L1 — Modal-Cluster Emission

**File:** `src/mdve/lmv.ts` (MUTABLE now)

**Current (lmv.ts:473):** cluster center = prominence-weighted mean of swing points.
**New:** within each cluster's reaction candles, group bodyCloses at the 1-pip quantum (DEFENDED_EDGE_QUANTUM_PIPS=1, :231). **Emit ONE rung per modal bodyClose cluster** — each cluster's modal level becomes a distinct rung with its own reactionExtreme/defendedEdge.

```typescript
function emitModalRungs(cluster: SwingCluster, candles: OhlcRow[], pair: string): LqzZoneMatrix[] {
  const buckets = new Map<number, OhlcRow[]>();          // key = quantized bodyClose
  for (const c of candles) {
    const q = Math.round(c.bodyClose / (1 * pip(pair))) * (1 * pip(pair));  // 1-pip quantum
    (buckets.get(q) ?? buckets.set(q, []).get(q)!).push(c);
  }
  const rungs: LqzZoneMatrix[] = [];
  for (const [price, group] of buckets) {
    if (group.length < MIN_REACTION_CANDLES) continue;   // 3 (lmv.ts:197)
    rungs.push({
      bottom: cluster.bottom, top: cluster.top,
      center: price,                                     // THE MODAL LEVEL — not the mean
      side: cluster.side,
      candles: group,
      reactionExtreme: cluster.side === 'BUY_SIDE'
        ? Math.min(...group.map(c => c.wickTip))         // deepest LOW probe
        : Math.max(...group.map(c => c.wickTip)),        // deepest HIGH probe
      defendedEdge: price,                               // the modal bodyClose = defendedEdge
      touchKinds: distinctKinds(group),
      weekSpan: cluster.weekSpan,
      zfp: Math.min(60, 20 + Math.floor((group.length - 3) / 2) * 5),
    });
  }
  return rungs;
}
```

**Effect:** the 100.945 shelf's matrix may contain TWO modal clusters (100.945 and 100.975) → TWO rungs. 101.235 vs 101.240 (0.5p apart) — on 1H they share a modal bucket; the 15m telescoped run (T5) separates them into two 1-pip-quantum clusters → two rungs.

**Backward-compat gate:** the LmvTable total count may INCREASE (multi-rung emission); verify no rung count regression below the golden-week 48 (DXY) baseline — the completeness record must show the full price span [98.751, 101.800] covered.

## 3.4 Module L2 — 1-Pip LQZ Dedup

**File:** `src/engines/ladder-scaffold.ts:438-466` (the scaffold dedup, DEDUP_TOLERANCE_PIPS=3 at :106, strict `<` at :446)
**Change:**
```typescript
const LQZ_DEDUP_TOLERANCE_PIPS = 1;   // NEW — LQZ_M rungs (the golden 0.5p pair must survive)
const OB_DEDUP_TOLERANCE_PIPS   = 3;  // unchanged — ORDER_BLOCK zones

// in the dedup loop:
const tol = rung.source === 'LQZ' ? LQZ_DEDUP_TOLERANCE_PIPS : OB_DEDUP_TOLERANCE_PIPS;
if (Math.abs(rung.price - last.price) < tol * pip(pair)) { merge/keep-best; } else { push; }
```
**Effect:** 101.235/101.240 (0.5p) both survive as distinct LQZ_M rungs. 100.945/100.975 (3.0p) both survive even at 3p (3.0 < 3.0 is false) — and definitely at 1p. Cross-namespace (LQZ vs OB) dedup stays at 3 pips (different zone classes may legitimately share a band — the anchor union §8.1).

## 3.5 Module L3 — Matrix → model.zones Bridge

**File:** `src/mdve/index.ts:152-158` (buildZoneMap) + `lqz-matrix.ts:599-626` (matrixLadderRungs)
**Change:** feed `LqzZoneMatrix[]` directly into `buildZoneMap` via a new adapter (IN ADDITION to the existing ladder bridge):

```typescript
function matrixZonesToZoneModels(lmv: LmvTable, pair: string): ZoneModel[] {
  return lmv.zones.map(z => ({
    id: `LMV|${pair}|${z.center.toFixed(5)}`,
    type: z.side === 'BUY_SIDE' ? 'DEMAND' : 'SUPPLY',
    top: z.top, bottom: z.bottom, center: z.center,
    timeframe: '1H', classification: 'MoM',        // LQZ rungs are MoM-class per canon
    source: 'LQZ', liquidityScore: z.zfp,
    reactionCount: z.sweepCount, defendedEdge: z.defendedEdge,
    reactionExtreme: z.reactionExtreme, touchKinds: z.touchKinds,
    weekSpan: z.weekSpan, refinedLabel: z.refinedLabel,
  }));
}
```
**Effect:** the mirror engine's anchor search (selectPairNativeZone) now sees matrix LQZ as first-class candidates — closing the Bible 4.0:2647 structural gap. The E2 cascade's bestGroup filter can now rank golden-level LQZ rungs.

**⚠ Interaction with the E2-CASCADE VIOLATED admission:** golden-level zones are ALL VIOLATED (consumed by the week's action). The current selectPairNativeZone admits VIOLATED within a 50-pip band at group −2 (mirror.ts:1289-1301). With L3, the golden LQZ rungs are first-class — the E2 keyZoneId AUTHORITATIVE match (Phase 5) bypasses the group ranking entirely for E2-designated days. Keep the 50-pip VIOLATED admission as the non-E2 fallback.

## 3.6 Module L4 — Sweep-Bonus Inversion (documented 2026-07-29, UNBUILT → now mandated)

**File:** `src/mdve/mirror.ts:1553-1555` (computeLmvTP significance)
**Change:**
```
CURRENT: sig = (z.sweepCount >= 1 ? 50 : 0) + (z.zfp >= 40 ? 40 : z.zfp <= 20 ? 25 : 15)
NEW:     sig = (z.sweepCount >= 1 ? -30 : 0) + (z.zfp <= 20 ? 40 : z.zfp <= 30 ? 25 : 15)
```
**Rationale (NEXT_STEPS.md:47-53, verbatim):** a swept rung's liquidity is TAKEN — it is DEMOTED as a TP target, not promoted. Evidence (diag-rungs, EVIDENCE_STATE.md:250-254): `[1.34081-1.34116] defEdge=1.34111 zfp=60 sweeps=1 → sig 90 (PROMOTED — wrong)`; `[1.34036-1.34073] defEdge=1.34022 zfp=50 sweeps=0 → sig 40 (DEMOTED — wrong)`. The GU TP currently lands one rung too shallow → RRR 1.30 → RRR_DISCARDED → GU lane dead.

**The operator's practice (the authority):** "swept rung = liquidity TAKEN" — a consumed level cannot be a fresh TP target; fresh Hard Walls (zfp ≤ 20) and heavy-confirmed zones (zfp ≥ 40) hold their weight.

## 3.7 Module L5 — Re-port the 3 Lost Mirror.ts Fixes

**Sources:** `Checkpoints/_ARCHIVED/v4.5.5_PRISTINE_CORE/src/mdve/mirror.ts` (the ONLY copy — verified present 2026-07-31)
**Target:** `src/mdve/mirror.ts`
**Lost-fix inventory (the undocumented regression — BUILD_STATE.md:127 falsely claims these exist):**

1. **`weekProbeAtAnchor`** (:2328-2381 PRISTINE) — deepest adverse probe at the anchor within the model week. Semantics: OB → non-pierced reaction-event prices (:2351-2354); **GA-audit fix: LMV candle wicks reaching INTO the anchor band ARE adverse anatomy** (:2362-2372); consumed anchors also include the band edge (:2373-2378); LQZ → week candle highs/lows (:2344-2348). **Re-ported verbatim.**

2. **`computeGoldenSL_V452` + GOLDEN_FLOOR + GOLDEN_FLOOR_FALLBACK** (:2417-2536 PRISTINE) — the 4-stage golden SL pipeline:
   - Stage 1: `computeSL_LMV` golden SL
   - Stage 2: PROBE_GUARD + §4.4.3 wick-clear: `const probe = weekProbeAtAnchor(...); if (!clearsAnatomy(sl)) sl = direction==='SHORT' ? p.price+buffer : p.price−buffer` (:2452-2456)
   - Stage 3: GOLDEN FLOOR `GOLDEN_SL_MIN_PIPS=4` — sub-floor SL walks to the next defended rung in `[4p, 9.5+buffer]` clearing anatomy (:2466-2507)
   - Stage 4: selective util guard: `util = probeDepthPips/structDistPips`; `util >= 0.40 → KEEP structural SL with UTIL_GUARD_KEEP` (:2511-2527), else PROBE_GUARD flag (:2528-2533)
   - **Re-ported verbatim.** (This fixes the golden T3 SL gap: our 100.811 vs his 100.77 — the sub-floor walk + weekProbeAtAnchor move the SL outside the 100.803 dip.)

3. **`classFlexibleLQZFallback`** (:1213, used :1324-1342, wired :1858 PRISTINE) — the §8.1 union pool: LMV rungs join OB-class candidacy unconditionally at **group −1.5** (between OB recently-battled −1 and OB rank/nearest −2) with the recency gate (`lastReaction ∈ [weekStartMs, anchorMs]`). GU's trending week: 25/26 supply VIOLATED + 1 DEPLETED → class-locked pool collapses to ONE anchor; the union unlocks the operator's manual GU rung map (1.3380/1.3397/1.3400/1.3410/1.3436/1.3440). **Re-ported verbatim.** (The GU distribution loop already exists in E2_CASCADE mirror.ts:2090-2117 — verify it matches PRISTINE :2115-2134 including the deadlock fix `usedGuAnchors.add(g.anchorZoneId)` for EVERY constructed mirror.)

**After re-port:** update BUILD_STATE.md:127 to the truth (these now EXIST in the current tree) + record new SHAs.

## 3.8 Phase 3 Invariants

1. **Resolution law:** no two LQZ_M rungs closer than 1 pip survive dedup; the golden 0.5p pair (101.235/101.240) BOTH survive
2. **Modal law:** every emitted rung center = a modal bodyClose cluster (never a weighted mean)
3. **Sweep-demotion law:** swept rungs (sweepCount ≥ 1) are NEVER promoted in TP significance (sig ≤ 25 max)
4. **Golden-SL law:** no emitted SL below GOLDEN_SL_MIN_PIPS=4 or above GOLDEN_SL_MAX_PIPS=9.5 (except the SWEEP-ORIGIN exception) — the golden 4-9.5p envelope
5. **Bridge law:** every LqzZoneMatrix in the LmvTable has a corresponding ZoneModel in model.zones

## 3.9 Phase 3 Test Spec

**`diag-lmv-golden.ts` (NEW, ~25 assertions):**
- L1: 7/7 golden DXY LQZs emitted at ≤1 pip (100.845/100.945/100.975/101.14/101.19/101.235/101.240)
- L2: 101.235 AND 101.240 BOTH present as distinct rungs (the 0.5p pair)
- L3: every rung's center == its defendedEdge (modal, not mean)
- L4: computeLmvTP significance: a swept rung scores ≤ 25; a fresh zfp≤20 rung scores 40
- L5: mirror.ts contains weekProbeAtAnchor + computeGoldenSL_V452 + classFlexibleLQZFallback (grep-assert)
- L6: no golden DXY SL outside [4, 9.5] pips (except T6's 9.5 = the envelope edge)
- L7: determinism sha256 ×2

## 3.10 Phase 3 Acceptance Gate

**7/7 golden DXY LQZs at ≤1 pip + the golden SL envelope + determinism.** EU/GU equivalents at the Tier-B labels.

---

# PHASE 4 — OBCV MACHINE (ORDER BLOCK CANDLE VISION)

## 4.1 Doctrine

> "We should also build an OBCV (order block candle vision) machine on the same principles that finds all the OBs using its own MPSE function. I dont think matrices apply here like they do with LQZ since there arent dozens of candles reacting to the same level that can be grouped into matricies and detected."
> "and then these 2 become the biggest levers because once these 2 are 96%+ accurate then 90% of the work in charting zones is done from the start already and we have the exact candles/price anchors for nearly all the zones already computed"

## 4.2 The Macro Concept

LMV finds levels that DOZENS of candles react to (clustering matrix). An order block is the OPPOSITE shape of evidence: **ONE candle that a big move started from** (singular event). The impulse candle is the sprinter exploding out of the blocks; the order block is the blocks themselves — the candle right before. OBCV finds every explosion, looks one candle back, and classifies the block. **Matrices apply to OBs as ORIGIN-CANDLE FEATURE ROWS, not reaction-clustering** — the operator's intuition confirmed by the MPSE library.

## 4.3 Module O1 — The Displacement Field (impulse detection)

**File:** `src/mdve/obcv.ts` (NEW, ~350 lines)

```typescript
// ═══ OBCV — ORDER BLOCK CANDLE VISION (normative) ═══
// Input: bars per TF {4H, 1H, 30m} for the week ± lookback, pair, pip, anchorMs
// Output: ObZone[] — every BoM/MoM order block with formationMs, type, class, tf, zfp

D_t(i, k) = (max(close[i+1..i+k]) − min(close[i+1..i+k])) / ATR14_t(i)
ATR14_t(i) = Wilder's ATR(14) over bars [i−14, i−1]   // ROLLING — NEVER includes bar i
                                                       // (v4.4 Bug-3: the impulse bar inflates ATR
                                                       //  and blinds the detector — TR prefix sums)
k = moveWindowBars(t) = { 4H: 18, 1H: 36, 30m: 24 }

isImpulse(i, t) ⟺
  (1) body[i] ≥ 1.5 × μ_body(i−4..i−1)      // relative displacement (forensic Step 1)
  (2) |close[i] − open[i]| ≥ 1.5 × ATR14_t(i)  // operator canon: ≥1.5×ATR(14), rolling
  (3) D_t(i, k) ≥ θ_t                        // forward confirmation (MDVE predicate)
  (4) structureBroken(i, t)                  // close beyond the prior N-bar extreme
where θ_4H = 50 pips / ATR  (canon; Bible ≥0.5 DXY pts / 3 days)
      θ_1H = 30 pips / ATR  (MDVE-native — the golden 1H moves are 30-46 pips, NOT 50:
                             v4.4 Bug-1 proof bodyFail=32, moveFail=13, detected=0)
      θ_30m = 20 pips / ATR (current code value 20p/48b — BUILD WITH THIS; validate against
                             the golden oracle; tune to 15p/24b ONLY if the oracle demands)
```

**The v4.4 Bug-1/3 lessons (load-bearing):** (Bug-1) fixed canon thresholds fail on real bars → TF-scaled θ + 300-bar 1H lookback; (Bug-3) rolling ATR ending at each candidate bar — never include the impulse bar. (Bug-2) bar-range bucketing mega-merges → sparse swing-point clustering with the 4-pip span cap — OBCV does NOT cluster origins (singular by construction).

## 4.4 Module O2 — The Origin-Candle Feature Matrix

```typescript
F[o] = [ bw(o), bf(o), rng(o), dir(o), prior(o) ]
bw(o)  = body(o) / max(wickTop(o), wickBottom(o))    // ≥ 3.0 for BoM (Bible L1157)
bf(o)  = body(o) / (high(o) − low(o))                 // ≥ 0.65 for BoM (Bible L1159)
rng(o) = (high(o) − low(o)) / pip(t)                  // width gate
dir(o) = sign(close(o) − open(o))                     // + → DEMAND; − → SUPPLY
prior(o) = prior-move class                           // NONE | OPPOSITE | SAME
zone range = [o.low, o.high]                          // origin candle's FULL range (Bible L1146)
```

**The width gate — dual-source reconciliation (audit finding #5):**
```
widthGate(o, t) = (max(OPERATOR_FLOOR[t], CODE_MIN[pair]) ≤ rng(o) ≤ CODE_MAX[t])
OPERATOR_FLOOR = { 4H: 15, 1H: 8, 30m: 5 }   // the operator's OBCV floors (2026-07-31)
CODE_MIN  = { DXY: 10, FX: 20 }              // 4h-sd-lobe.ts:197 (prevents 0-pip SLs)
CODE_MAX  = { 4H: 40, 1H: 25, 30m: 15, 15m: 10 }  // 4h-sd-lobe.ts:64-69 + ob-engine.ts
// For DXY at 4H: max(15, 10) = 15 → [15, 40]. For EUR at 1H: max(8, 20) = 20 → [20, 25].
// The operator's floors are the doctrine; the code min is the SL-safety floor; the effective
// gate = the MAX of the two floors (both must hold).
```

## 4.5 Module O3 — The Prior-Move Classifier (piecewise-total)

```typescript
priorMove(o, L) =
  NONE     if range(o−L..o−1) ≤ 0.5×ATR14 ∧ |Σ body[j]·dir[j]/ATR14| < 0.25   // consolidation
  OPPOSITE if sign(Σ body[j]·dir[j]/ATR14) == −dir(o)   // the prior leg moved AGAINST
  SAME     if sign(Σ body[j]·dir[j]/ATR14) == +dir(o)   // mid-move shelf
where L = { 4H: 18, 1H: 36, 30m: 24 }

classifyOrigin(o, t) =
  { BoM   if prior(o) ∈ {NONE, OPPOSITE} ∧ bw(o) ≥ 3.0 ∧ bf(o) ≥ 0.65 ∧ widthGate(o, t)
  { MoM   if prior(o) == SAME ∧ validOrigin(o) ∧ widthGate(o, t)
  { REJECT otherwise                                    // totality: no undefined inputs
validOrigin(o) = body(o) > 0 ∧ rng(o) ≥ minWidth(t)
```

**The exhaustiveness invariant (MPSE):** every origin candle classifies to EXACTLY ONE of {BoM, MoM, REJECT} — no overlaps, no gaps. The REJECT branch is mandatory: a marginal candle (bw 2.5, bf 0.6, prior OPPOSITE) is NOT downgraded to MoM — it is rejected, and the honesty rule applies (empty set is fine).

**Direction → zone type (boolean implication):** `dir(o) = + → DEMAND zone [o.low, o.high]`; `dir(o) = − → SUPPLY zone [o.low, o.high]`.

## 4.6 Module O4 — The Telescoping Incidence Matrix

```typescript
T[parent][child] = 1 ⟺ child.zone ⊆ parent.zone ∧ child.originMs ∈ interval(parent.originCandle)
                        ∧ tf(child) < tf(parent)        // strictly finer
30m OB: REQUIRES a 1H parent (orphan → REJECT — the operator's rule: 30m is not an origin TF)
1H OB:  MAY refine a 4H OB (optional nesting)
Never skipping a level; never a sibling at the same TF (that is a SEPARATE zone, deduped)
```

## 4.7 Module O5 — Firewall + Wiring

```typescript
assert(|BoM| + |MoM| == |deduped|);      // partition — every zone classified exactly once
assert(∀ z30m: parent != null);          // nesting — 30m never top-level
assert(∀ z: widthGate(z));               // width canon re-verified at output
```

**Wiring:** `ob-engine.ts` buildZoneMap as the ORDER_BLOCK source (supplementing/replacing detectTfOrderBlocks); the scaffold ladder's ORDER_BLOCK source (ladder-scaffold.ts). **zfp ladders (canon):** BoM 10/18/32/65 · MoM 65/22/38/70 · 30m nested = min(zfp, parent.zfp). **BoM/MoM classification** feeds Engine 3's +5 isBoM scoring, the zfp ladders, and the Law-14 TP walk's significance ranking (UM BoM > liquidityScore≥5 > BoM > MoM ≤1x).

**E/SL anchors OB-native:** entry at the origin-candle defended edge (the body-close side — the price band where institutions deployed); SL just beyond the origin-candle reaction extreme (the wick tip) + Law-7 buffer; nested zones refine the parent's anchor band. `defendStrength = 1 − |reactionExtreme − defendedEdge|/ATR` carries over from LMV.

## 4.8 Phase 4 Invariants

1. **Singular-origin law:** every ObZone's zone range == its origin candle's [low, high] — NEVER the impulse candle
2. **BoM-origin law:** BoM zones exist ONLY at 4H/1H; 30m is MoM-only (redundant with T4 — belt + suspenders)
3. **Orphan law:** every 30m OB has a 1H parent (T[parent][child] = 1)
4. **Partition law:** every origin candle → exactly one of {BoM, MoM, REJECT}
5. **Rolling-ATR law:** ATR14_t(i) NEVER includes bar i (Bug-3)

## 4.9 Phase 4 Test Spec

**`diag-obcv-golden.ts` (NEW, ~20 assertions):**
- O1: golden reconstruction — 1H BoM demand [100.68-100.73] present
- O2: 4H BoM supply 101.235-band present
- O3: 1H MoM demand 100.845 present
- O4: 96%+ agreement with the operator's drawn OB map (his chart annotations = the oracle)
- O5: zero 30m BoM zones; zero orphan 30m
- O6: every BoM has bw ≥ 3.0 ∧ bf ≥ 0.65 (spot-check 5 zones)
- O7: determinism sha256 ×2
- O8: the golden week's OBs reconstruct within the golden tolerances (DXY 1p / FX 2p)

## 4.10 Phase 4 Acceptance Gate

**Golden OB reconstruction from data alone + 96%+ vs the drawn map.** The meta-lesson (Bug-9): synthetic-bar verification is a pre-flight check; REAL-BAR verification is the acceptance.

---

# PHASE 5 — E2 FORWARD MAP + AUTHORITATIVE ZONE DESIGNATION

## 5.1 Doctrine

> "friday spot is only relevant to MONDAY E2 SHAPE prediction after that it is compltely irrelevant"
> E2 must "forward map the predicted spot price of that day at london session open"
> "make it E2 waveform based not dumb fucking friday spot price based"
> "E2 designates the zone, E3 obeys" (SPEC §4.2)

**The canonical failure case (FAILURE_LOG_2026-07-29.md:48):** Monday's GU short at 1.3380 (a WINNER) was REJECTED by the Friday gate ("below Friday spot 1.33968") — Monday's open was 1.33522. **The day-native gate MUST admit it.**

## 5.2 Module E1 — projectZoneForDay (NEW — does not exist in src/, grep-verified 2026-07-31)

**File:** `src/brains/shape-brain.ts` (after buildDayDecomposition :807-999)

**Current state (verified):** `buildDayDecomposition` emits `keyZone` as a DISPLAY LABEL STRING ("Range: X ↔ Y", :877) — not a machine zone ID; direction is 'RANGE'/'NEUTRAL'/inferred-from-failing-zone (:874-946); spot-anchored (Friday model spot gates every day); the E2-1 Trading Speed Rule +1 shift is the only temporal logic (:857-859, :964-966).

**New `projectZoneForDay(day, zones, priorDay): ShapeDayZone` — the DayBand forward projection:**

```typescript
interface ShapeDayZone {
  day: string;                        // 'Mon'..'Fri'
  shape: ShapeCode;                   // SS | BS | R | WL | RWL | WLS | PBS
  direction: 'LONG' | 'SHORT' | 'RANGE';
  keyZoneId: string;                  // the E2-designated ENTRY zone's machine ID
  keyZonePrice: number;
  supplyZoneId?: string; supplyZonePrice?: number;   // the designated SUPPLY (SHORT days)
  demandZoneId?: string; demandZonePrice?: number;   // the designated DEMAND (LONG days)
  floor: number; ceiling: number;     // the projected day range
  dayOpenSpot: number;                // the DayBand forward-projected London-open price
  session: string; confidence: number;
}

function projectZoneForDay(day, zones, priorDay: {close: number; shape: ShapeCode}): ShapeDayZone {
  // 1. DayBand: the day's predicted London-open spot
  //    Monday:   priorDay.close = FRIDAY close (the ONLY Friday-spot use — E2 Monday shape)
  //    Tue-Fri:  priorDay.close = the PRIOR DAY's predicted close (DayBand chain — Friday
  //              spot is completely irrelevant after Monday)
  const travel = SHAPE_TRAVEL[day.shape];   // SS ±5-30p · BS 30-100p · WL 50-200p
                                            // RWL 30-100p · R ±10-50p (Law 2, golden ref)
  const dayOpenSpot = priorDay.close + (direction === 'SHORT' ? -travel.mid : +travel.mid);

  // 2. ENTRY rung selection (the operator's rule — supply ABOVE for SHORT, demand BELOW for LONG):
  //    SHORT day → keyZone = SUPPLY ABOVE dayOpenSpot (the rejection level)
  //    LONG day  → keyZone = DEMAND BELOW dayOpenSpot
  //    The candidate set = the TELESCOPED zone map (Phase 2) — the E2-designated zone is the
  //    strongest class+side+role match within the day's [floor, ceiling] range, per the
  //    cascade's structural-equivalence rules (BoM→BoM, MoM→MoM, LQZ→LQZ).

  // 3. floor/ceiling = dayOpenSpot ± travel.max
  // 4. keyZoneId = the zone's machine id (MUST match selectPairNativeZone's candidate ids)
}
```

**The DayBand chain (the forward projection):** Mon = f(Friday close); Tue = f(Mon predicted); Wed = f(Tue predicted); Thu = f(Wed predicted); Fri = f(Thu predicted). The shape sequence comes from the ShapeBrain chain; the travel ranges from Law 2. **This is the E2 waveform — the day-native predicted price, not the Friday spot.**

## 5.3 Module E2 — selectPairNativeZone AUTHORITATIVE (mirror.ts:1233-1373)

**Change (SPEC §4.2 + the 2026-07-31 ruling):**

```typescript
function selectPairNativeZone(..., shapeDay?: ShapeDayZone): ZoneModel | LqzZoneMatrix | null {
  // 1. AUTHORITATIVE: the E2-designated zone wins immediately — no ranking, no heuristics
  if (shapeDay?.keyZoneId) {
    const exact = candidates.find(c => c.id === shapeDay.keyZoneId);
    if (exact) return exact;
    // center-price suffix fallback (the lmvAnchorId format fix, mirror.ts:1271-1276):
    const centerKey = `|${Number(shapeDay.keyZonePrice?.toFixed(5))}`;
    const centerMatch = candidates.find(c => c.id.endsWith(centerKey));
    if (centerMatch) return centerMatch;
  }
  // 2. direction-aware: SHORT → supplyZoneId match; LONG → demandZoneId match
  if (shapeDay?.direction === 'SHORT' && shapeDay.supplyZoneId) {
    const s = candidates.find(c => c.id === shapeDay.supplyZoneId);
    if (s) return s;
  }
  if (shapeDay?.direction === 'LONG' && shapeDay.demandZoneId) {
    const d = candidates.find(c => c.id === shapeDay.demandZoneId);
    if (d) return d;
  }
  // 3. FALLBACK (non-E2 path): candidates filtered to class+side ACTIVE near [floor, ceiling]
  //    → ranked by |center − keyZonePrice|, then strength
  //    (the current +2 tier bonus is REMOVED — it was advisory; now authoritative or fallback)
}
```

**Friday spot is REMOVED from the evaluation path entirely** — the day-native reference is `MirrorReanchorContext.dayOpenPrice` (mirror.ts:1021-1025) fed by `dayOpenPriceProvider` (mdve-stage.ts:805-813); for E2-designated zones the DayBand predicted price (ShapeDayZone.dayOpenSpot).

## 5.4 Module E3 — computeLmvTP shape-day target (mirror.ts:1533-1591)

**Change (SPEC §4.3):** add `shapeDayMap` param:
```typescript
function computeLmvTP(entry, sl, direction, targetModel, targetPair, pipValue, opts?,
                      shapeDay?: ShapeDayZone): number | null {
  // 1. The TP target = the shape day's projected OPPOSING zone (the zone the shape chain
  //    says price will reach — the golden TP semantics: the LQZ WITHIN the opposing S/D zone)
  if (shapeDay) {
    const projected = shapeDay.direction === 'SHORT'
      ? shapeDay.demandZoneId   // SHORT day → TP at the projected DEMAND
      : shapeDay.supplyZoneId;  // LONG day  → TP at the projected SUPPLY
    const rung = targetModel.lmv.zones.find(z => z.id === projected);
    if (rung?.defendedEdge) return rung.defendedEdge;
  }
  // 2. Fallback: the existing nearest-first significance walk (with the L4 sweep inversion)
}
```

## 5.5 Module E4 — cascadeV45 shapeChains threading (mirror.ts:2028-2121)

The per-day resolution already exists (:2060-2065 euShapeDay, :2094-2099 guShapeDay) — verify it threads the NEW ShapeDayZone fields (supplyZoneId/demandZoneId/dayOpenSpot) through reAnchorMirror → selectPairNativeZone → computeLmvTP. **The shapeChains object now carries ShapeDayZone[] per pair per day, produced by projectZoneForDay after each pair's ShapeBrain run.**

## 5.6 Phase 5 Invariants

1. **Monday-only-Friday law:** Friday close appears ONLY in the Monday projection; Tue-Fri use the DayBand chain (grep-assert: no `spots['DXY']`-style Friday reference in the day-native path)
2. **Authoritative law:** an exact keyZoneId match returns the zone IMMEDIATELY (no ranking)
3. **Entry-rung law:** SHORT days designate SUPPLY above; LONG days designate DEMAND below
4. **DayBand law:** every day's dayOpenSpot = f(prior day's predicted close + shape travel)
5. **Zero-rejection law:** the GU Monday 1.3380 case is ADMITTED (the Friday-gate rejection is impossible by construction)

## 5.7 Phase 5 Test Spec

**`diag-e2-forward.ts` (NEW, ~15 assertions):**
- E1: Wed SHORT designation → supply zone containing 101.235/101.240 (≤1 pip)
- E2: Wed LONG designation → demand at 100.975 (≤1 pip)
- E3: Mon SHORT EU designation → supply at 1.14544 (≤1 pip)
- E4: GU Monday 1.3380 SHORT is ADMITTED (day-native gate, not Friday)
- E5: zero Friday-spot rejections across the golden week
- E6: dayOpenSpot chain is monotonic with the shape direction (no direction flips mid-chain)
- E7: determinism sha256 ×2

## 5.8 Phase 5 Acceptance Gate

**E2 designations point at the golden zones at ≤1 pip; zero Friday-spot rejections.**

---

# PHASE 6 — INTERLEAVED CASCADE PIPELINE

## 6.1 Doctrine

> "DXY E1/E2/E3"
> "EU E1 --> DXY Inverse E2 Cascade --> E2 --> DXY Inverse E3 Cascade (ZONE ANCHORED Trade Setups not Price Anchored) --> E3 w/ EU specific emrgent trades added on top of DXY-inverse-cascade setups"
> "GU E1 --> EU E2 Cascade --> E2 --> EU E3 Cascade (ZONE ANCHORED Trade Setups not Price Anchored) --> E3 w/ GU specific emrgent trades added on top of EU-cascade setups"
> "this preserves macro structure while also allowing for pair specific variance"

## 6.2 Module P1 — Restructure cascadeV45 (mirror.ts) + report-v452.ts

**Current (SPEC §2 flat order):** E2 fires per-pair then E3 cascades.
**New (the interleave — normative report-v452.ts flow):**

```typescript
// ═══ THE INTERLEAVED PIPELINE (2026-07-31 operator architecture) ═══
// 1. DXY — FULL
const dxyModel = buildChartModel('DXY', WEEK, bars1H, bars4H, bars30m, spot);  // E1
const dxyShape = shapeBrain.compute(dxyModel);                                  // E2
const dxySetups = generateSourceSetupsV45(dxyModel, dxyShape);                  // E3 (source lane)

// 2. EU — E1 → DXY-inverse E2 cascade → E2 → DXY-inverse E3 cascade (ZONE-ANCHORED) → E3 + emergent
const euModel = buildChartModel('EUR/USD', WEEK, ...);                          // EU E1 (own zones)
const euCascadedShape = cascadeShapeChain(dxyShape, dxyModel, euModel, null).eu; // DXY-inv E2
const euShape = shapeBrain.compute(euModel, euCascadedShape);                   // EU E2 (consumes cascade)
const euMirrors = cascadeV45(dxySetups, {DXY: dxyModel, 'EUR/USD': euModel}, ctx, {eu: euShape}); // DXY-inv E3
const euFinal = mergeMirrorWithEmergent(euMirrors, emergentEuSetups, 'EUR/USD'); // E3 + EU emergent

// 3. GU — E1 → EU E2 cascade → E2 → EU E3 cascade (ZONE-ANCHORED) → E3 + emergent
const guModel = buildChartModel('GBP/USD', WEEK, ...);                          // GU E1 (own zones)
const guCascadedShape = cascadeShapeChain(euShape, euModel, guModel, null).gu;  // EU E2 cascade
const guShape = shapeBrain.compute(guModel, guCascadedShape);                   // GU E2
const guMirrors = cascadeV45(euMirrors, {DXY: dxyModel, 'EUR/USD': euModel, 'GBP/USD': guModel}, ctx, {gu: guShape});
const guFinal = mergeMirrorWithEmergent(guMirrors, emergentGuSetups, 'GBP/USD'); // E3 + GU emergent
```

**Zone-anchored semantics:** the mirror setup anchors to the PAIR's own zone designated by the cascaded E2 (structural equivalence — class + side + role inverted/kept). NO price conversion from DXY. The 80/20 doctrine applies: direction/shape/zone-class mirrored; E/SL/TP pair-native.

## 6.3 Module P2 — The Emergent Merge (mdve-stage.ts:691-720)

Already exists (`mergeMirrorWithEmergent`, dedup by `pair|direction|day|session|bucket(3-pip)`, mirror provenance wins collisions). Verify it runs per-pair after the interleaved cascade. AUD is emergent-only (§8.13 profile: HTF+Reinforcement only, Tokyo+London, max 3/week).

**The operator's emergent doctrine (MDVE_SPEC.md:597, verbatim):**
> "Emergent pair-specific trades ON TOP are fine and encouraged — MORE than 24 is fine, LESS is not. GU diverges: bigger swings, tighter consolidations, moves can begin early or late by hours or a full session; some cascaded setups die to the RRR filter (GU's volatility); GU winners run 5-11 RRR vs EU 4-8."

## 6.4 Module P3 — The Mirror Floor (mirror.ts:2135-2166 checkMirrorFloorV45)

`|EU| ≥ |DXY ACTIVE mirrors|`, `|GU| ≥ |EU ACTIVE| − documented casualties`. GOLDEN_FLOOR_TOTAL=24 (mdve-stage.ts:78). Emergent trades are ADDITIVE.

## 6.5 Phase 6 Invariants

1. **Cascade-order law:** DXY first → EU (inverted) → GU (kept). Never the reverse (SPEC invariant 5)
2. **Zone-anchor law:** mirror setups reference the pair's OWN zone IDs (no DXY price coordinates)
3. **Floor law:** |EU| ≥ |DXY ACTIVE|; |GU| ≥ |EU ACTIVE| − casualties
4. **Emergent-additive law:** emergent merges ON TOP of the cascade — never suppresses it
5. **Per-pair clean-room:** each pair's E1/E2/E3 runs with ZERO carryover from the prior pair's setups (only the shape chain cascades)

## 6.6 Phase 6 Test Spec

- P1: DXY 8 golden trades emitted (the v4.5.5 DXY lane must not regress — 6/7 resolved wins baseline)
- P2: EU 8 golden-matching at ±3 pips (the 2/8 baseline → 8/8 target)
- P3: GU 7 golden-matching at ±3 pips (the 3/7 baseline → 7/7 target)
- P4: distribution 6-11 per pair; >12 = slop flag
- P5: checkMirrorFloorV45 passes
- P6: determinism sha256 ×2

## 6.7 Phase 6 Acceptance Gate

**EU 8 + GU 7 at ±3 pips; DXY 8 intact; mirror floor passes.**

---

# PHASE 7 — RRR ≥ 3.0 + THE E/SL/TP REFINEMENT MACHINE

## 7.1 Doctrine

> "MINIMUM 3 RRR NOTHING LESS IS ACCEPTABLE IDK WHERE THE FUCK THIS SLOP CAME FROM ALL MY TRADES ARE 4+ SO 3 IS THE MINNIMUM."
> "RRR failed does not mean instant hard reject often the E/SL/TP is wrong on a correct analysis so we need the retry loop with an intelligent E/SL/TP refinment machine that provides the correct mental frameworks for adjusting these surgically to maximize RRR while still staying on the correct zone anchros. Most of these 1.5-2 R trades can easily be 3-4 R trades with properl E/SL/TP anchors on the exact same zones that are already thethered to. this is purely a lack of precision and dumb trade setups"
> "A rejected setup is not a dead setup. The entry is the hard-won insight; SL/TP are engineering." (ANCHOR_DOCTRINE.md:157)
> "If all 3 are solid RRR will literally be 4 minimum." (ANCHOR_DOCTRINE.md:28)

## 7.2 Module R1 — RRR Constants to 3.0 (the complete site map)

| Site | Current | New | Location |
|------|---------|-----|----------|
| RRR_BY_CATEGORY tp1 | 2.0/1.5/2.0/1.5/2.0/2.0 | **3.0 for ALL** | trading-constants.ts:140-147 |
| RRR_BY_CATEGORY blended | 3.0/2.0/2.5/2.0/3.0/2.5 | **≥ 3.0 for ALL** | same |
| DEFAULT_RRR_MINIMUMS | {2.0, 3.0} | **{3.0, 3.0}** | :150 |
| MIN_RRR_CONSTRUCTION | 1.5 | **3.0** | :114 |
| semantic-firewall RRR-1 | rrrForCategory().tp1 | **3.0** | rrr-rules.ts:39-46 |
| mirror.ts:701-702 | rrrForCategory().tp1 | **3.0** | buildMirror |
| mirror.ts:1919-1925 | rrrForCategory().tp1 | **3.0** | reAnchorMirror (the FX floor-1.0 comment at :1917-1918 is DEAD — remove it) |
| setup-gen.ts:674-681 | rrrForCategory().tp1 | **3.0** | RRR_BELOW_FLOOR gate |
| visual-setup-generator.ts classifyQuality | ≥3.0 GOD / ≥2.0 HIGH / ≥1.5 STANDARD | **≥3.0 GOD / ≥3.0 HIGH / ≥3.0 STANDARD** | :905-909 |
| visual-setup-generator.ts direction RRR check | ≥2 PASS / ≥1.5 WARN | **≥3.0 PASS / ≥2.5 WARN** | :967-971 |
| PATTERN_MIN_RRR / RANGE_BREAKOUT_MIN_RRR | 2.0 / 1.5 | **3.0 / 3.0** | :648, :656 |

**CHAIN_MIN_RRR_SUPPLEMENTARY (3.0) and MIN_RRR_FOR_LOW_PROB (3.0) already at 3.0 — no change.** `rrrForCategory()` (trading-constants.ts:169-173) resolves from RRR_BY_CATEGORY — changing the table changes every consumer.

**⚠ CODE REALITY (audit finding #4):** the current `visual-setup-generator.ts` (1944 lines in B) has **NO repair loop** — grep-verified: only "NO direction retry" at :486. The historical generateWithRepair references (v4.4 gen:417-530, v4.5.2 Appendix E :584-657) are OLDER REVISIONS. **The refinement machine (R2) is NET-NEW — a build, not an extension.**

## 7.3 Module R2 — The E/SL/TP Refinement Machine (net-new)

**File:** `src/engine3/visual-setup-generator.ts` (documented exception to the frozen list — same precedent as setup-gen.ts HOTFIX_SPEC:65) or a NEW `src/mdve/refinement-machine.ts` invoked from the generator (preferred — keeps the frozen file untouched; the generator calls `refineSetup(setup)` before the final RRR gate).

**The 3-attempt cycle (ANCHOR_DOCTRINE §7 + D36 + the 2026-07-31 expansion):**

```typescript
interface RefinementAttempt {
  attempt: number;
  entry: number; sl: number; tp: number; rrr: number;
  reason: string;                     // 'RRR 1.4 < 3.0 — E 1.14505, SL 28p, TP 39p'
  action: string;                     // 'SL re-anchored 28p→9p (next rung IN)', etc.
}

function refineSetup(setup, zone, model, ctx): { setup: TradeSetup; attempts: RefinementAttempt[] } {
  const attempts: RefinementAttempt[] = [];
  let { entry, sl, tp } = setup;
  let rrr = computeRrr(entry, sl, tp);

  // ATTEMPT 1 — the current geometry
  attempts.push({attempt: 1, entry, sl, tp, rrr, reason: 'initial', action: 'none'});
  if (rrr >= 3.0) return {setup, attempts};

  // ATTEMPT 2 — surgical refinement ON THE SAME ZONE ANCHORS
  // a. ENTRY micro-refinement on defendedEdge (the operator's entries sit at reaction levels):
  //    LMV rungs → entry = zone.defendedEdge (modal bodyClose) instead of the geometric edge
  //    OB zones  → entry = the origin-candle body edge nearest the defended side
  //    SHORT     → entry = band top − 1 pip (F1-A lift); LONG → band bottom + 1 pip
  const refinedEntry = entryMicroRefine(entry, zone);        // may move ≤ 2-3 pips within the band
  // b. SL re-anchor — the Law-7 BIDIRECTIONAL walk (computeSL_LMV):
  //    try the next rung IN (tighter) AND the next rung OUT (wider);
  //    each candidate must clear PROBE_GUARD + weekProbeAtAnchor;
  //    accepted in [max(0.5×ATR, buffer), GOLDEN_SL_MAX_PIPS=9.5] with D17 36p ceiling
  const slCandidates = bidirectionalSlWalk(zone, entry, direction, model);  // both directions
  // c. TP re-anchor — the Law-14 significance walk (computeLmvTP with the L4 sweep inversion):
  //    next significance-ranked candidate, fresh-wall (zfp≤20) cap-walk, Earth+Fire mid/near-edge
  const tpCandidates = significanceTpWalk(zone, entry, direction, model);
  // d. pick the (sl, tp) pair maximizing rrr ≥ 3.0; entry = refinedEntry
  for (const slc of slCandidates) for (const tpc of tpCandidates) {
    const r = computeRrr(refinedEntry, slc, tpc);
    if (r > rrr) { sl = slc; tp = tpc; rrr = r; }
  }
  attempts.push({attempt: 2, entry: refinedEntry, sl, tp, rrr,
    reason: `refined: E ${setup.entry}→${refinedEntry} (defendedEdge)`,
    action: `SL/TP re-anchored on the same zone`});
  if (rrr >= 3.0) return {setup: {...setup, entry: refinedEntry, sl, tp}, attempts};

  // ATTEMPT 3 — last: next-best opposing zone/rung for TP + next rung for SL
  //            entry STAYS on the SAME zone
  const sl3 = nextRungOut(sl, zone, model);
  const tp3 = nextSignificanceCandidate(tp, zone, model);
  const rrr3 = computeRrr(refinedEntry, sl3, tp3);
  attempts.push({attempt: 3, entry: refinedEntry, sl: sl3, tp: tp3, rrr: rrr3,
    reason: 'attempt-3 last', action: 'next-best opposing zone/rung'});
  if (rrr3 >= 3.0) return {setup: {...setup, entry: refinedEntry, sl: sl3, tp: tp3}, attempts};

  // FAILURE — HARD REJECT with the full 3-attempt audit trail (D36)
  return {setup: null, attempts};
}
```

**The annotation contract:** `🔧 REPAIRED(2): SL re-anchored 28p→9p, E 1.14505→1.14544 (defendedEdge), RRR 1.4→4.1`. **The zone anchors NEVER change — only the surgical E/SL/TP placement on the same zone.**

**The mental framework (2026-07-31, verbatim):** "Most of these 1.5-2 R trades can easily be 3-4 R trades with properl E/SL/TP anchors on the exact same zones that are already thethered to. this is purely a lack of precision and dumb trade setups."

## 7.4 Module R3 — No Caps, Dedup Reporting-Layer

- NO count caps (D38). Dedup = reporting-layer only (pair, dir, zone_anchor±3pips, day)
- >12 trades per pair = slop flag (operator rule); 6-11 per pair target
- f(T) = 23 golden + emergent (MORE than 24 fine, LESS not)

## 7.5 Phase 7 Invariants

1. **RRR-floor law:** no emitted setup below 3.0 (the firewall + all gates)
2. **Same-zone law:** refinement NEVER changes the zone anchors — only E/SL/TP placement on them
3. **Audit law:** every rejection carries the full 3-attempt audit trail (D36)
4. **Annotation law:** every repaired setup carries `🔧 REPAIRED(n)` with the before/after anchors
5. **No-cap law:** zero count caps anywhere (D38)

## 7.6 Phase 7 Test Spec

- R1: every emitted setup RRR ≥ 3.0 (assert across the full report)
- R2: the GU ⚠ rows (GU-2 2.2, GU-4 2.9, GU-5 1.9, GU-6 2.8) emerge at ≥ 3.0 via the refinement machine — SAME zones, better anchors
- R3: repaired setups carry the annotation with before/after values
- R4: a forced-fail setup (RRR 1.2 at all 3 attempts) hard-rejects WITH the audit trail — never silently dropped
- R5: determinism sha256 ×2

## 7.7 Phase 7 Acceptance Gate

**Every emitted setup RRR ≥ 3.0; the GU ⚠ rows refined to ≥ 3.0 on the same zones; the audit trail complete.**

---

# PHASE 8 — VERIFICATION (the only honest gates)

## 8.1 The Diag Suite (run after EVERY change)

| Tool | Checks | Target |
|------|--------|--------|
| `diag-golden-coverage.ts` | 23 golden trades at 3-pip tolerance (30-pip BANNED) | **23/23** |
| `diag-telescoping.ts` (NEW) | 7 golden DXY levels in the zone map | 7/7 computed from data |
| `diag-lmv-golden.ts` (NEW) | 7 golden DXY LQZs at ≤1 pip | 7/7 |
| `diag-obcv-golden.ts` (NEW) | golden OB reconstruction + 96% vs drawn map | PASS |
| `diag-e2-forward.ts` (NEW) | E2 designations at golden zones; zero Friday-spot rejections | PASS |
| `diag-rrr.ts` (NEW) | every emitted setup RRR ≥ 3.0 | PASS |

## 8.2 The Determinism Discipline

- sha256 report_v452.md ×2 byte-identical (in-process + cross-process) — baseline e02fbe58
- tsc 0 + bun build success after every change
- The scaffold contains ZERO Jul-6-10 content — determinism is in the COMPUTATION, not the LEVELS (Codex §11)
- **Different week = different ladder** (the operator's hard constraint: no hardcoding the golden example)

## 8.3 The Container Test (end of build)

1. Fresh container from `plutus-container-testing:clean-v421`
2. SHA-verified deploy (dist bundle)
3. Standard task prompt via TUI tmux send-keys
4. 3-signal monitoring: pipe-pane stream / tool calls / artifacts on disk
5. Sniff test + golden reconstruction + outcome audit
6. **Visual eval:** the 23 golden trades overlaid with the generated setups — same zones, same candles, side by side (Visual_Evals/ output)

## 8.4 The Checkpoint Discipline

Per-phase saves: `Checkpoints/v4.5.2_TELESCOPE/` → `v4.5.2_LMV/` → `v4.5.2_OBCV/` → `v4.5.2_E2FWD/` → `v4.5.2_CASCADE/` → `v4.5.2_RRR/` — each a static reload anchor with MANIFEST + SHA. src/ stays the working tree. **git commit per phase in src/.**

---

# APPENDIX A — FILE CHANGE SUMMARY (the complete build footprint)

| File | Action | Lines | Phase |
|------|--------|-------|-------|
| `src/` (whole tree) | RESTORE from v4.5.2_E2_CASCADE | — | 0 ✅ |
| `src/brains/lqz-lobe.ts` | MODIFY: TF param + 14 scaled constants | ~60 | 2 |
| `src/mdve/ob-engine.ts` | MODIFY: nesting pass T2/T3, 30m MoM-only, OBCV wiring | ~80 | 2,4 |
| `src/mdve/types.ts` | MODIFY: refinedLabel/nestedWithin/refinedBy/parent on ZoneModel | ~10 | 2 |
| `src/mdve/bom-mom.ts` | MODIFY: TF gate (30m/15m → MoM) | ~10 | 2 |
| `src/brains/4h-sd-lobe.ts` | MODIFY: BoM TF gate | ~5 | 2 |
| `src/brains/shape-brain.ts` | MODIFY: 30m MoM delivery; NEW projectZoneForDay + DayBand | ~150 | 2,5 |
| `src/pipeline/engine.ts` | MODIFY: T5 30m/15m LQZ runs; T6 snapshot merge | ~50 | 2 |
| `src/mdve/index.ts` | MODIFY: 30m/15m matrix tiers; matrix→model.zones bridge | ~40 | 2,3 |
| `src/mdve/lmv.ts` | **MODIFY (unfrozen prototype):** modal-cluster emission | ~60 | 3 |
| `src/engines/ladder-scaffold.ts` | MODIFY: 1-pip LQZ_M dedup | ~10 | 3 |
| `src/mdve/mirror.ts` | MODIFY: sweep inversion −30; re-port 3 lost fixes; keyZoneId authoritative; computeLmvTP shapeDay | ~250 | 3,5,6 |
| `src/mdve/obcv.ts` | **NEW:** the OBCV machine | ~350 | 4 |
| `src/mdve/refinement-machine.ts` | **NEW:** the E/SL/TP refinement machine | ~150 | 7 |
| `report-v452.ts` | MODIFY: interleaved pipeline order | ~60 | 6 |
| `src/constants/trading-constants.ts` | MODIFY: RRR 3.0 | ~15 | 7 |
| `src/semantic-firewall/rrr-rules.ts` | MODIFY: RRR-1 floor 3.0 | ~5 | 7 |
| `src/engine3/visual-setup-generator.ts` | MODIFY (documented exception): RRR gates + refinement invocation | ~30 | 7 |
| `src/mdve/setup-gen.ts` | MODIFY: RRR 3.0 gate | ~5 | 7 |
| `diag-telescoping.ts` / `diag-lmv-golden.ts` / `diag-obcv-golden.ts` / `diag-e2-forward.ts` / `diag-rrr.ts` | NEW: phase gates | ~400 total | 2-8 |
| **TOTAL** | | **~1,750** | |

# APPENDIX B — THE CANON QUOTES (the build's authority — verbatim)

1. "MINIMUM 3 RRR NOTHING LESS IS ACCEPTABLE IDK WHERE THE FUCK THIS SLOP CAME FROM ALL MY TRADES ARE 4+ SO 3 IS THE MINNIMUM." (2026-07-31)
2. "friday spot is only relevant to MONDAY E2 SHAPE prediction after that it is compltely irrelevant" (2026-07-31)
3. "S/D zones are charted on 4H and refined down to 1H... 30m is not an origin point for BoM S/D zones... LQZ similarly starts on 1H and is refined down to 30m + started on 30m and refined down to 15m" (2026-07-31)
4. "We should also build an OBCV (order block candle vision) machine on the same principles that finds all the OBs using its own MPSE function." (2026-07-31)
5. "this is the definitive test of LMV. LMV is the most important machine in the MDVE - if it cannot copute these LQZs there is a major issue we need to address" (2026-07-31)
6. "DXY E1/E2/E3 | EU E1 --> DXY Inverse E2 Cascade --> E2 --> DXY Inverse E3 Cascade (ZONE ANCHORED Trade Setups not Price Anchored) --> E3 w/ EU specific emrgent trades | GU E1 --> EU E2 Cascade --> E2 --> EU E3 Cascade --> E3 w/ GU specific emrgent trades" (2026-07-31)
7. "E2 fires on DXY and cascades inverse to EU and then to GU" / "DXY provides DIRECTION. The PAIR provides LEVELS." (canon)
8. "A rejected setup is not a dead setup. The entry is the hard-won insight; SL/TP are engineering." (ANCHOR_DOCTRINE.md:157)
9. "NOT A SINGLE ONE OF MY TRADES IS BELOW RRR = 3.5." (2026-07-29)
10. "spot price is practically irrelevant for calculations and everything is done based on E1 → E2 → E3 mechanics and data" (canon)
11. "Emergent pair-specific trades ON TOP are fine and encouraged — MORE than 24 is fine, LESS is not." (MDVE_SPEC.md:597)
12. "If all 3 are solid RRR will literally be 4 minimum." (ANCHOR_DOCTRINE.md:28)

# APPENDIX C — THE DERAILMENT PREVENTION CHECKLIST (18 documented derailments)

**Bible 4.0's 8 (v3 era):**
1. ZFP threshold 45→60 — NEVER change ZFP from 45
2. Pair names 'EUR/USD'→'EURUSD' — NEVER remove slashes
3. RRR flattened to 1.0 — NEVER flatten; now 3.0 min via rrrForCategory
4. Multi-TP created — ONE TP per trade, forever
5. Charts rewritten to 2-phase — automated VLM only
6. Cascade filter B4 — NEVER add
7. ZFP evolution — NEVER add dynamic ZFP
8. Shape chain rewritten — ZFP-conditioned only

**The 10 session derailments (2026-07-31):**
9. RRR floor 1.5→1.0 for FX — NEVER (3.0 is the floor)
10. onSide 150-pip tolerance — NEVER (day-native only)
11. VIOLATED zones at group −3 — only via the E2-authoritative path or the 50-pip band
12. Nearest-to-spot ranking — NEVER (E2 designation + strength)
13. The "30-pip coverage" delusion — BANNED FOREVER (3-pip only)
14. §8.1 LMV union unconditional — NEVER (class-flexible fallback only, recency-gated)
15. Stopping after every change — LOOP AUTONOMOUSLY
16. Chasing volume over precision — precision is the ONLY metric
17. Heuristic tweaking instead of architecture — fix the map, not the ranking
18. Stopping at step 1 of telescoping — the FULL procedure, wired end-to-end

**The 3 pre-session derailments (from the era):** embellished reporting (2.8× inflation), the ACTIVE-only GU distribution deadlock, the computeMirrorTP-primary TP regression (v4.5.4 — correctly NOT inherited).

# APPENDIX D — THE RISK REGISTER

| # | Risk | Impact | Mitigation |
|---|------|--------|-----------|
| 1 | 30m/15m lanes too short for old weeks (15m ≈ 3 days) | Telescoping tiers skip → golden rungs unresolved on replay weeks | Per-TF lookback scaling + completeness record; live weeks unaffected |
| 2 | Modal-cluster emission explodes rung count | Ladder noise | MIN_REACTION_CANDLES=3 + 1-pip dedup + zfp ladder caps |
| 3 | The 3 lost mirror.ts fixes conflict with E2_CASCADE code | Merge bugs | Re-port VERBATIM from PRISTINE, verify each with its original harness (verify-sl-fix 25/25, verify-mirror-fix 21/21) |
| 4 | OBCV θ_30m = 20p/48b misses golden 30m moves | Golden reconstruction fails | Validate against the oracle; tune to 15p/24b ONLY if required (documented decision) |
| 5 | keyZoneId authoritative returns a WRONG zone (ID collision) | Cascade anchors at garbage | centerKey suffix fallback + direction-aware supply/demand match + day-range filter [floor, ceiling] |
| 6 | RRR 3.0 kills the EU/GU lanes entirely | f(T) < 24 | The refinement machine (R2) is the mitigation — the ⚠ rows are its targets; if a lane still starves, the ANCHORS are wrong, not the floor |
| 7 | Determinism break from wall-clock or unordered iteration | Report non-reproducible | No wall-clock; deterministic iteration; sha256 ×2 after every change |
| 8 | The operator's doctrine gets re-synthesized instead of quoted | Build drifts | D13: quote with source before every doctrine-touching decision |
| 9 | Container image drift (BUG-19 recurrence) | Testing corrupted | clean-v421 pinned; verify image SHA before container runs |

# APPENDIX E — DECISION RECORDS (the build's rulings)

| # | Date | Ruling | Source |
|---|------|--------|--------|
| D1 | 2026-07-31 | src/ IS the working tree; checkpoints are static anchors | operator session |
| D2 | 2026-07-31 | v4.5.1 = the new locked immutable baseline (supersedes v4.4) | operator session |
| D3 | 2026-07-31 | lmv.ts + lqz-matrix.ts = MUTABLE prototypes (golden-LQZ oracle pending) | operator session |
| D4 | 2026-07-31 | 101.235/101.240 = two distinct rungs (the drawn map) | operator session |
| D5 | 2026-07-31 | RRR ≥ 3.0 emission minimum; ≥ 3.5 executed; 4+ norm | operator session |
| D6 | 2026-07-31 | The E/SL/TP refinement machine replaces hard-reject (3 attempts, same zones) | operator session |
| D7 | 2026-07-31 | Telescoping: BoM 4H/1H only; 30m MoM only; LQZ 1H→30m→15m | operator session |
| D8 | 2026-07-31 | Friday spot Monday-E2-only; DayBand London-open forward projection | operator session |
| D9 | 2026-07-31 | Interleaved pipeline: DXY full → EU → GU, zone-anchored, emergent on top | operator session |
| D10 | 2026-07-31 | OBCV machine on MPSE principles (the 2nd big lever after LMV) | operator session |
| D11 | 2026-07-31 | 30-pip tolerance BANNED; 3-pip is the only metric | operator session (earlier: failure-log verdict) |
| D12 | 2026-07-31 | Bible 4.5 (3000+ lines) + shark-CME spec required before build | operator session |
| D13 | canon | Doctrine is QUOTED, never synthesized | DECISION_CHAIN.md:312 |

*END OF PLUTUS v4.5.2 OVERHAUL ENGINEERING SPEC v2.0 — EXPANDED. BUILD IN ORDER: 0 → 2 → 3 → 4 → 5 → 6 → 7 → 8. GATE AFTER EVERY PHASE. 3-PIP COUNT AFTER EVERY CHANGE.*

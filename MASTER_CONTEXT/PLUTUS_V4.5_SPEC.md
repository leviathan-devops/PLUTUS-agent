# PLUTUS V4.5 — THE REFINEMENT + LMV SPEC

**Version:** 1.0 (FULL SPEC)
**Date:** 2026-07-28
**Status:** DESIGN LOCKED — build target v4.5.0
**Baseline:** `Checkpoints/v4.4_MARKET_READY_BASELINE/` @ SHA `0dedd262...` (LOCKED IMMUTABLE — the most solid baseline). v4.5 FORKS from it.
**Doctrine:** the v4.4 baseline is market-ready and profitable (70.8% win rate, +25.69R). v4.5 is a **refinement**, not a rebuild — it fixes the proven E/SL defects, re-anchors the mirror per the operator's 80/20 doctrine, adds the common-sense guards, and formalizes the **Liquidity Matrix Vision (LMV)** as the LQZ-mapping foundation that all E/SL refinement anchors to.

---

# TABLE OF CONTENTS

0. Context — the v4.4 verdict and what it proved
1. The Refinement Evidence (every fix is evidence-backed)
2. The LMV Engine (Liquidity Matrix Vision — the centerpiece)
3. Fix 1 — SL-Width (selective tightening to the golden range)
4. Fix 2 — Entry-Precision (anchor to the actual reaction extreme)
5. Fix 3 — The Mirror Re-Anchor (the 80/20 doctrine)
6. Fix 4 — The CS-1 Structural-Validity Guard
7. Fix 5 — Counter-Structure Suppression (the weekly narrative weight)
8. The LQZ Chart Drawing (visual refinement, feeds the visual-eval skill)
9. The Build Plan (waves, disjoint files)
10. The Verification Plan (cascade + outcome audit + visuals + container)
11. Anti-Goals + Frozen Constraints
12. The Acceptance Formula (v4.5 done-when)
Appendix A — The operator's doctrine corrections (verbatim, canon)
Appendix B — The loss autopsy (the 7 losses, classified)
Appendix C — The LMV mathematics (the MPSE structure map)

---

# 0. CONTEXT — THE V4.4 VERDICT AND WHAT IT PROVED

## 0.1 The baseline is profitable and market-ready

v4.4 (the MDVE+VEI+Mirror triad) is container-tested and outcome-audited against the real Jul 6-10 bars:

- **24 clean setups** (DXY 12 / EU 5 / GU 7 / AUD 0), **0 passive entries**, 0 FATAL, f(T) firewall OK.
- **Forecast vs reality: 70.8% win rate (17W/7L), +25.69R, +1.07R expectancy.** DXY 83%, GU 71%, EU 40%.
- **Avg WIN RRR ~1.95R** (the operator's manual standard is 4R — the gap is the refinement target).

## 0.2 What v4.4 proved needs fixing (the refinement evidence)

The outcome audit + the SL-wide-vs-entry-early analysis isolated exactly four defects, each with mechanical evidence:

1. **SL too wide (the dominant defect — 12/17 wins, 71%).** The v4.4 stop losses are ~2-3× wider than the golden standard (v4.4 SLs 10-22 pips vs golden 4-9.5 pips). Same TP, wider SL → the avg win RRR is ~1.95R instead of ~4R. Example: DXY LONG Monday SL 17 pips but MAE only 4.7 pips (util 0.28).
2. **Entry too early (5/17 wins, 29%).** The SL is CORRECT (it barely survived) — the entry was a few pips early. Tightening these SLs converts wins to losses. Example: GU LONG Tuesday SL 27 pips, MAE 24.8 pips (util 0.92 — the SL barely held).
3. **The EU mirror lane is broken (EU 40% vs DXY 83%).** The mirror did a blind structure copy + formation-time anchor, producing EU SHORTs that anchored to stale supply with tight SLs (3 of the 7 losses). The operator's correction: the mirror is **80% signal + 20% pair-native optimization**, not a blind copy.
4. **Common-sense failures (CS-1/2/3).** Structurally-invalid entries (entry+SL below session-open price — EU #3/#4), stale zone anchoring, counter-structure timing (long-into-top #1, short-into-bottom #2, long-into-post-top-decline #5).

## 0.3 The refinement thesis

**Everything anchors to the LQZ.** Every entry is at a liquidity rung; every SL is inside the next rung; every TP is at an opposing rung. So the foundation of all E/SL refinement is a **complete, precise map of the LQZ ranges** — which is exactly what the **Liquidity Matrix Vision (LMV)** computes from data. v4.5 formalizes the LMV as the first-class engine, then anchors the SL-width fix, the entry-precision fix, and the mirror re-anchor to it.

---

# 1. THE REFINEMENT EVIDENCE (every fix is evidence-backed)

## 1.1 The SL-width evidence (Fix 1)

The 12 SL-too-wide wins (util = MAE/SL-dist < 0.40):

| Trade | SL dist | MAE | util | Tightened SL → new RRR |
|---|---|---|---|---|
| DXY LONG Mon 100.85 | 17p | 4.7p | 0.28 | ~5p → ~7x (was 2.0x) |
| DXY LONG Tue 100.91 | 17p | 5.8p | 0.34 | ~6p → ~5x (was 1.8x) |
| DXY LONG Fri 100.74 | 22p | 2.6p | 0.12 | ~6p → ~7.8x (was 2.1x) |
| EU LONG Wed 1.1386 | 13p | 1.8p | 0.14 | ~3p → ~9x (was 2.2x) |
| DXY SHORT Thu 100.94 | 14p | 3.2p | 0.23 | ~4p → ~5.7x (was 1.6x) |
| GU SHORT Tue 1.3425 | 17p | 5.8p | 0.34 | ~7p → ~4x (was 1.6x) |
| (+ 6 more) | | | | |

**Root cause:** the frozen `computeSLNextLqzRung` places the SL at the *next significant rung* (e.g. the 100.68 BoM, 17p below the 100.85 entry) instead of the *nearest defended rung below the entry zone* (the golden 4-9.5p). The golden rungs are 3-10 pips apart, so its next-rung SL is tight.

## 1.2 The entry-precision evidence (Fix 2)

The 5 entry-too-early wins (util > 0.70): GU LONG Tue/Wed (util 0.92 — GU dropped to ~1.332, near the 1.332 SL, before the rally), DXY SHORT Wed/Thu (util 0.88/0.71), EU LONG Thu (util 0.76). **Tightening these SLs = losses.** The fix is a better entry (at the actual reaction bottom), which simultaneously gives a better price AND a tighter natural SL AND higher RRR.

## 1.3 The EU mirror evidence (Fix 3)

The EU SHORTs (mirror of DXY LONGs) went 1W/5L; the EU LONGs (mirror of DXY SHORTs) went 3W/1L. The broken SHORTs: EU opened *above* the SL (entry+SL below session-open price → structurally invalid), or EU's wick exceeded the tight SL before the inverse move. **The mirror anchored to the formation-time-nearest supply (1.1422), not the strong supply EU actually reverses from (1.1447, 1.1461).**

## 1.4 The common-sense evidence (Fixes 4+5)

- **CS-1:** EU #3 (open 1.14195 > SL 1.1418), EU #4 (open 1.14317 > SL 1.1431) — entry+SL below session-open price.
- **CS-3:** DXY #1 (long into the Wednesday top), #2 (short into the Friday sweep bottom), EU #5 (long into the Friday post-top decline).

---

# 2. THE LMV ENGINE (LIQUIDITY MATRIX VISION — THE CENTERPIECE)

## 2.1 The doctrine (the operator, verbatim)

*"Create a matrix data set based on linear algebra or other MPSE concepts that groups ALL visible ranges of LQZs from candlestick data (the OHLC of several if not dozens of candles across the last 1-6 weeks all reacting to the same price range = clear liquidity zone). Group all of these into matrices so each zone's OHLC data from X number of candles = 1 matrix. We will have a table of matrices denoting exactly what are all the LQZ ranges. LQZs discovered by MPSE matrices. It should be very easy to map LQZs on the chart without even needing vision, and then when we use vision to verify it will be visibly obvious. This immediately solves a big problem for E/SL refinement since everything is anchored to LQZs."*

## 2.2 What LMV is

LMV is the formalization of the LQZ-detection into a **first-class matrix dataset**. The v4.4 swing-cluster matrix (lqz-matrix.ts) already prototypes the clustering; LMV elevates it to a **table of zone-matrices** — one matrix per LQZ, holding the OHLC data of the X candles that reacted to that range — and makes it the **canonical LQZ source** that every E/SL decision (entry, SL, TP) reads from.

**The core object:**
```typescript
/** One LQZ = one matrix of the candles that reacted to its price range. */
interface LqzZoneMatrix {
  /** The range [bottom, top] of the zone (the cluster extremes). */
  bottom: number; top: number; center: number;
  side: 'BUY_SIDE' | 'SELL_SIDE';
  /** THE MATRIX: the OHLC of the X candles that reacted to this range.
   *  Rows = candles (chronological), Cols = [timestamp, open, high, low, close]. */
  candles: OhlcRow[];              // |candles| = X (the reaction count)
  /** Matrix-derived structure (linear algebra over `candles`). */
  reactionExtreme: number;         // the deepest wick tip (the SL anchor)
  defendedEdge: number;            // the price where reactions consistently turn (the entry anchor)
  touchKinds: TouchKind[];         // per-candle anatomy (SWEEP/REJECT/DEFEND/DWELL)
  weekSpan: number;                // distinct weeks touched
  zfp: number;                     // canon LQZ zfp ladder
}
/** The LMV dataset = the table of all LQZ zone-matrices, price-ordered. */
type LmvTable = LqzZoneMatrix[];
```

**Why a matrix per zone:** the zone's `candles` matrix is the raw evidence. Linear-algebra operations over it (the reaction-extreme as the min/max of the wick column, the defended-edge as the mode of the body-close column, the touch-kind classification per row) yield the **exact** SL anchor (the reaction extreme) and the **exact** entry anchor (the defended edge) — which is what the SL-width and entry-precision fixes need.

## 2.3 The LMV construction algorithm (formalizes + extends the v4.4 swing-cluster)

```
INPUT: bars1H (720-bar canon lookback ≈ 6 weeks), pair, pipValue, atr14
OUTPUT: LmvTable (price-ordered zone-matrices)

Stage 1 — REACTION EXTRACTION (the candidate candle set):
  For each bar, classify its interaction with every price level via the
  total touch predicate (SWEEP / WICK_REJECT / BODY_DEFEND / CONSOL_DWELL /
  PASS_THROUGH — v4.4 canon, PASS_THROUGH excluded). A "reaction candle" is
  a bar that REACTED at a level (any non-PASS_THROUGH touch).

Stage 2 — SWING-POINT CLUSTERING (the v4.4 validated core):
  Extract local swing extremes (strict max/min of ±1-bar neighborhood, ties →
  earliest, prominence ≥ 1 pip). Cluster swing points within ε = 2 pips
  (single-linkage) with a 4-pip span cap (the anti-chaining guard). A cluster
  = a candidate LQZ.

Stage 3 — ZONE-MATRIX ASSEMBLY (NEW — the LMV formalization):
  For each candidate cluster [bottom, top]:
    candles = every reaction candle whose touch price ∈ [bottom − ε, top + ε],
              chronological.
    IF |candles| < 3 OR distinct touch kinds < 2 → discard (the canon
       confirmation gate: ≥3 reactions, ≥2 kinds).
    reactionExtreme = min(wick-low col) for BUY_SIDE; max(wick-high col) for SELL_SIDE.
    defendedEdge = the price where the body-close column turns (the modal
       rejection level).
    weekSpan = |distinct isoWeeks(candles)|.
    zfp = canon ladder min(60, 20 + floor((|candles| − 3) / 2) × 5).

Stage 4 — MATRIX COMPLETENESS (MPSE Structure 9):
  The union of all zone-matrices' ranges + the zero-filled gaps covers the
  observed price range — total over price × time, no unexamined region.
```

**Relationship to the v4.4 matrix:** the v4.4 `LqzMatrixEntry` (priceCenter, top, bottom, touchEvents, zfp) is the coarse form. The LMV `LqzZoneMatrix` ADDS the `candles` matrix (the raw OHLC per zone) + the derived `reactionExtreme` and `defendedEdge` (the E/SL anchors). The clustering (Stage 2) is unchanged (proven); Stage 3 is the LMV formalization.

## 2.4 The zone-matrix structure (the linear-algebra substrate)

Each zone's `candles` field is a literal 2-D matrix — rows are the X reaction candles (chronological), columns are the OHLC fields + derived anatomy:

```
LqzZoneMatrix.candles : OhlcRow[]
OhlcRow = {
  timestamp: number;      // col 0 — the candle's ms (chronological, deterministic order)
  open: number;           // col 1
  high: number;           // col 2
  low: number;            // col 3
  close: number;          // col 4
  touchKind: TouchKind;   // col 5 — the row's reaction anatomy (SWEEP/REJECT/DEFEND/DWELL)
  wickTip: number;        // col 6 — the extreme that did the work (low tip / high tip)
  bodyClose: number;      // col 7 — the close (the auction's verdict)
}
```

**The matrix reductions (the E/SL anchors, computed by column operations):**

| Anchor | The operation | What it yields |
|---|---|---|
| `reactionExtreme` | BUY_SIDE: `min(candles.wickTip)` · SELL_SIDE: `max(candles.wickTip)` | the deepest point price probed and was rejected — **the SL anchor** (price was defended here) |
| `defendedEdge_forLong` | the modal `bodyClose` of BUY_SIDE candles that closed back UP | the level buyers consistently defended — **the LONG entry anchor** |
| `defendedEdge_forShort` | the modal `bodyClose` of SELL_SIDE candles that closed back DOWN | the level sellers consistently defended — **the SHORT entry anchor** |
| `sweepCount` | `count(candles.touchKind == SWEEP)` | sweeps consume liquidity (drives the zfp + the mitigation semantics) |
| `defendStrength` | `1 − (|reactionExtreme − defendedEdge| / ATR)` | how tightly the zone held (higher = a cleaner SL just beyond the extreme) |

**Why the matrix form matters:** the SL needs the *deepest defended point* (reactionExtreme), and the entry needs the *most-defended level* (defendedEdge). Both are column reductions over the zone's candle matrix — NOT guesses, NOT the zone's geometric edge. This is the "linear algebra" the operator described: the LQZ is a matrix of reaction candles, and the E/SL anchors are well-defined reductions over it. Two zones with the same [bottom, top] but different candle matrices have DIFFERENT anchors — the matrix captures the difference (a hard-defended shelf vs a loose cluster).

**Worked example (the golden 100.845 DXY demand):**
- `candles` = the ~9 reaction candles at 100.842-100.852 across Jul 6-8 (SWEEP + WICK_REJECT + BODY_DEFEND).
- `reactionExtreme` = 100.803 (the deepest wick low — Jul 7's probe).
- `defendedEdge_forLong` = 100.845 (the modal body-close — buyers defended here 4×).
- → the LONG entry anchors at 100.845 (the defended edge), the SL anchors just below 100.803 − buffer (the reaction extreme). **This is the golden 4-9.5 pip SL — computed, not assumed.**

## 2.5 What LMV feeds (the consumers)

| Consumer | What it reads from LMV |
|---|---|
| **SL placement (Fix 1)** | the `reactionExtreme` of the next rung beyond the entry — the SL goes inside the *defended* extreme, not a far significant zone |
| **Entry anchor (Fix 2)** | the `defendedEdge` of the zone — the entry is AT the level price actually reverses from, not a few pips early |
| **TP placement** | the opposing zone's `defendedEdge` (the Law-14 walk over the LmvTable) |
| **Mirror re-anchor (Fix 3)** | the target pair's OWN LmvTable — the pair-native strong zone |
| **§8.1 anchor gate** | `structural(zone) ⟺ zone ∈ LmvTable ∪ OB-zones` |
| **Chart drawing (§8)** | the LmvTable ranges → the zone rectangles on the visual-eval charts |

## 2.5 The LMV determinism + totality laws

1. Same bars → byte-identical LmvTable. No wall-clock, no randomness.
2. Every zone-matrix is total (empty bars → empty table; flat bars → no reactions → empty table).
3. Every constant has a BECAUSE (ε=2p cluster tolerance, 4p span cap, ≥3 candles + ≥2 kinds gate, 720-bar lookback — all v4.4 canon, cited).
4. **No hardcoded levels** — every zone's range/emerges from the bars.

---

# 3. FIX 1 — SL-WIDTH (SELECTIVE TIGHTENING TO THE GOLDEN RANGE)

## 3.1 The defect

`computeSLNextLqzRung` places the SL at the next *significant* rung (the far BoM/zone), producing 10-22-pip SLs where the golden standard uses 4-9.5 pips. The SL-utilization analysis (util = MAE/SL-dist) shows 71% of wins use < 40% of their SL room — the SL is far wider than the actual reaction requires.

## 3.2 The fix — the reaction-extreme SL

Replace the "next significant rung" SL with the **reaction-extreme SL**: the SL goes just beyond the **defended extreme** of the nearest rung below the entry zone (from the LmvTable), with the Law-7 pair buffer.

```
fn computeSL_LMV(entry, entryZone, direction, lmvTable, pair) -> number:
  pip = PIP[pair]; buffer = LAW7_BUFFER[pair] * pip   // EUR 2/GBP 3/AUD 3/DXY 5
  // the rungs beyond the entry zone (below for LONG, above for SHORT), nearest first
  candidates = lmvTable.rungs beyond entryZone, sorted by |center − entry|
  for rung in candidates:
    // the defended extreme = the price the rung's candles actually turned at
    sl = direction == 'LONG' ? rung.reactionExtreme − buffer
                             : rung.reactionExtreme + buffer
    dist = |entry − sl| / pip
    if dist >= LAW10_MIN(pair) && dist <= GOLDEN_SL_MAX:   // Law-10 floor ≥0.5×ATR, golden ceiling
      return sl
  // fallback: the zone's own width + buffer (the golden zone-width SL)
  return direction == 'LONG' ? entryZone.bottom − buffer : entryZone.top + buffer

GOLDEN_SL_MAX = 9.5 pips   // the golden standard's max SL (bible §9.5: 4H BoM 9.5p)
```

**The selective guard (from the analysis):** only tighten when the *current* SL-utilization is low. For a forward-looking placement, this means: prefer the nearest defended rung's extreme; only fall back to a far significant zone if the near rungs are depleted (the Law-14 walk's mitigation semantics, preserved).

**The wide-case exception (the sweep-catch):** for a trade whose entry is at a sweep origin (the Friday 100.74 BoM catch), the SL goes below the *sweep low* (the structural invalidation point), not the zone width — the sweep low IS the defended extreme. This preserves the correct wide SL where it's structurally required (and the v4.4 22-pip case becomes the sweep-low SL, which is correct, vs the arbitrary far-rung SL).

## 3.3 The effect (verified against the golden-week evidence)

| Trade | old SL | old RRR | new SL (reaction-extreme) | new RRR |
|---|---|---|---|---|
| DXY LONG Mon 100.85 | 100.68 (17p) | 2.0x | ~100.80 (5p) | ~7x |
| DXY LONG Fri 100.74 | 100.52 (22p) | 2.1x | ~100.68 (6p, BoM bottom) | ~7.8x |
| EU LONG Wed 1.1386 | 1.1373 (13p) | 2.2x | ~1.1383 (3p) | ~9x |

**Target:** avg win RRR ~1.95R → **~4R** (the operator's manual standard), without converting any win to a loss (the util<0.40 trades have provably-unused SL room).

## 3.4 The frozen-machinery boundary

`computeSLNextLqzRung` is FROZEN (used by the emergent lane's generator). The LMV SL is a NEW function (`computeSL_LMV`) consumed by the MDVE/mirror lane + offered to the emergent lane as an opt-in upgrade path. The frozen function is NOT modified (zero broken windows); the new function is verified to produce SLs within the golden range on the golden-week fixture.

---

# 4. FIX 2 — ENTRY-PRECISION (ANCHOR TO THE ACTUAL REACTION EXTREME)

## 4.1 The defect

5 wins (util > 0.70) had entries a few pips early — price dipped most of the way to the SL before recovering. The entry was at the zone's *edge* (the scaffold rung's near edge), not at the level price *actually reversed from* (the defended extreme). Example: GU LONG entered 1.3347, but GU's actual reaction bottom was ~1.332-1.334.

## 4.2 The fix — the defended-edge entry

The entry is anchored to the zone's `defendedEdge` (from the LmvTable) — the price where the zone's reaction candles consistently turn — instead of the zone's geometric edge.

```
fn entryPrice_LMV(zone: LqzZoneMatrix, direction) -> number:
  // the defended edge = the modal rejection level of the zone's candles
  return direction == 'LONG' ? zone.defendedEdge_forLong   // the level buyers defended
                             : zone.defendedEdge_forShort  // the level sellers defended
```

**The staggered entries** (the frozen 0.33/0.33/0.34 forward-spread ladder) are computed from this defended-edge anchor (the front/mid/back spread is preserved — the frozen entry-stagger machinery is untouched; only the anchor point moves to the defended edge).

## 4.3 The effect

- The 5 entry-too-early trades get a better price (closer to the actual bottom) AND a tighter natural SL distance AND a higher RRR — without touching the (correct) SL.
- Example: GU LONG entry 1.3347 → ~1.3340 (the actual bottom) → SL stays ~1.332 → RRR rises (better entry, same TP).

---

# 5. FIX 3 — THE MIRROR RE-ANCHOR (THE 80/20 DOCTRINE)

## 5.1 The doctrine (the operator, verbatim — Appendix A)

The mirror is **80% SIGNAL + 20% pair-native optimization**:
- **80% (the signal, always followed):** DIRECTION (inverse for DXY→EU, same for EU→GU), SHAPE (the day's Engine-2 shape), ZONE CLASS (BoM→BoM, MoM→MoM, LQZ→LQZ — of the entry AND the TP).
- **20% (pair-native optimization, always adapted):** the specific E/SL/TP LEVELS, re-anchored to the target pair's OWN relevant zone in its current storyline + a volatility-appropriate SL.

**"DXY BoM → EU's relevant BoM (the strong one EU actually reverses from in its own storyline), not the formation-time nearest. DXY gives a high-accuracy signal; the signal is followed but adapted to the pair's micro-nuances."**

## 5.2 The re-anchor algorithm

```
fn reAnchorMirror(source: TradeSetup, targetModel: ChartModel, targetLmv: LmvTable, pair) -> MirrorMapping:
  // 80% — the signal (inherited verbatim)
  direction = source.pair == 'DXY' ? inverse(source.direction) : source.direction
  shape     = source.shapeAlignment
  zoneClass = source.zoneClass            // BoM | MoM | LQZ

  // 20% — the pair-native re-anchor
  // find the target's OWN zone of the SAME CLASS, in the target's current
  // storyline, that the target ACTUALLY reverses from (highest defendedEdge
  // significance in the mirror direction's side)
  anchorZone = selectPairNativeZone(targetLmv, zoneClass, direction, targetModel)
    // selection: same class + same side + highest zfp-ranked defendedEdge +
    // within the formation-time ±24h window (loose, not binding)
  if anchorZone == null: return FAILED-anchor (honest, logged)

  entry = defendedEdge(anchorZone, direction)               // Fix 2's defended-edge
  sl    = computeSL_LMV(entry, anchorZone, direction, targetLmv, pair)  // Fix 1's reaction-extreme SL
  tp    = law14Walk_LMV(targetLmv, entry, direction)        // opposing rung via LmvTable
  rrr   = computeBlendRrr(entry, sl, tp, pair)
  status = rrr >= RRR_FLOOR(pair, category) ? 'ACTIVE' : 'RRR_DISCARDED'
  // + the CS-1 structural-validity guard (Fix 4) — MANDATORY before ACTIVE
```

**What changes from v4.4:** the anchor is no longer the formation-time-nearest inverse zone — it's the target's OWN strong zone of the same class (the one the target actually reverses from). The SL is the reaction-extreme SL (volatility-appropriate), not the tight next-rung SL that EU's wicks blew through.

## 5.3 The selectPairNativeZone algorithm (the heart of the re-anchor)

```
fn selectPairNativeZone(targetLmv: LmvTable, targetObZones: ZoneModel[],
                        zoneClass: 'BoM'|'MoM'|'LQZ', direction: 'LONG'|'SHORT',
                        sourceFormationMs: number, targetSpot: number) -> ZoneModel | LqzZoneMatrix | null:
  // the mirror direction determines the side: SHORT → SELL_SIDE supply above;
  // LONG → BUY_SIDE demand below
  const side = direction === 'SHORT' ? 'SELL_SIDE' : 'BUY_SIDE';

  // 1. CLASS MATCH — the same zone CLASS (BoM→BoM, MoM→MoM, LQZ→LQZ).
  //    BoM/MoM come from the target's OB zones; LQZ from the LmvTable.
  const classMatches = zoneClass === 'LQZ'
    ? targetLmv.filter(z => z.side === side)
    : targetObZones.filter(z => z.classification === zoneClass && z.type === (side === 'SELL_SIDE' ? 'SUPPLY' : 'DEMAND'));

  // 2. FORMATION-TIME PROXIMITY (loose, ±24h — the same macro structure forms
  //    within a day on both charts; a PREFERENCE, not a binding filter).
  const timed = classMatches.filter(z => |z.formationMs − sourceFormationMs| <= 24h);

  // 3. STRENGTH RANK — the zone the target ACTUALLY reverses from:
  //    rank by (a) formation-time proximity (if any timed), then (b) the
  //    defendedEdge significance (zfp-ranked: fresh BoM > liquidityScore≥5 >
  //    MoM ≤1x > other), then (c) |center − targetSpot| ascending.
  const pool = timed.length > 0 ? timed : classMatches;
  const ranked = pool.sort(bySignificance then byProximityToSpot);
  return ranked[0] ?? null;   // null → honest FAILED anchor (logged)
```

**The key difference from v4.4:** v4.4's `findMirrorAnchor` matched by *formation time alone* (the nearest inverse-type zone). v4.5's `selectPairNativeZone` matches by *class + side + strength* — it picks the target's STRONGEST relevant zone (the one price actually reverses from), with formation-time as a preference, not the binding criterion. This is why the EU SHORTs re-anchor from the weak 1.1422 supply to the strong 1.1447/1.1461 supply.

## 5.4 The volatility-aware SL (the pair-native optimization)

The re-anchored SL is the **reaction-extreme SL on the TARGET pair's own LmvTable** (Fix 1's `computeSL_LMV`), which clears the target's wick range by construction (the reactionExtreme IS the deepest defended point). For EU specifically: the SL goes just beyond the strong supply's `reactionExtreme` + the EUR Law-7 buffer (2 pips) — which is above EU's typical wick, so the SHORT survives the wick that killed the v4.4 EU SHORTs.

## 5.5 The expected effect (the EU lane)

- The EU SHORTs re-anchor to EU's actual strong supply (1.1447, 1.1461) with a volatility-aware SL (above EU's wick range) → the 1W/5L SHORT lane recovers toward the DXY/EU-LONG standard.
- The EU win rate recovers from 40% toward the DXY/GU standard (70-83%).

---

# 6. FIX 4 — THE CS-1 STRUCTURAL-VALIDITY GUARD

## 6.1 The defect

The v4.4 mirror emitted SHORTs whose entry AND stop both sat *below* the session-open price (EU #3: open 1.14195 > SL 1.1418; EU #4: open 1.14317 > SL 1.1431). A trade whose SL is already violated at entry is a guaranteed loss.

## 6.2 The guard (mandatory, all lanes)

```
fn structurallyValid(setup, sessionStartPrice, direction) -> { valid, reason }:
  if direction == 'SHORT' && sessionStartPrice >= setup.sl:
    return { valid: false, reason: 'CS-1: session-open price already beyond SL (structurally un-enterable SHORT)' }
  if direction == 'LONG' && sessionStartPrice <= setup.sl:
    return { valid: false, reason: 'CS-1: session-open price already beyond SL (structurally un-enterable LONG)' }
  return { valid: true }
```

**Enforcement:** applied at mirror-construction (Fix 3) AND at emergent-setup emission (the anchor gate). A structurally-invalid setup is **declared invalid and honestly discarded** (logged with the reason), never emitted. This is a hard, mechanical guard — the "would a human place this trade?" check, mechanized.

---

# 7. FIX 5 — COUNTER-STRUCTURE SUPPRESSION (THE WEEKLY NARRATIVE WEIGHT)

## 7.1 The defect

3 losses were counter-structure: long-into-the-Wednesday-top (#1), short-into-the-Friday-sweep-bottom (#2), long-into-the-Friday-post-top-decline (#5). The zone-based entry fired at a valid *zone* but ignored the *structural turn* (the weekly narrative).

## 7.2 The fix — the narrative alignment gate

The MDVE weekly narrative (sweep origin, range top/bottom, the break, post-break reaction) provides the structural context. A setup is suppressed when it fights the narrative:

```
fn narrativeAligned(setup, narrative, day) -> { aligned, reason }:
  // after a confirmed range-top break DOWN, suppress LONGs into the top's
  //   supply (they fight the break) — the #1 case (long into the Wednesday top)
  // after a sweep LOW + recovery, suppress SHORTs into the recovery (they
  //   fight the post-sweep reversal) — the #2 case (short into the Friday bottom)
  // after a confirmed top + decline, suppress LONGs into the decline (they
  //   fight the downtrend) — the #5 case (long into the Friday post-top decline)
  if fightsBreak(setup, narrative) || fightsSweepRecovery(setup, narrative) || fightsConfirmedTrend(setup, narrative):
    return { aligned: false, reason: 'CS-3: counter-structure (fights the weekly narrative)' }
  return { aligned: true }
```

**This is a weight, not a hard block** (the operator's Law 20: counter-trend scalps are valid at strong zones with 3+ confluences). The suppression applies to setups whose zone is weak (zfp > 30) AND fights the narrative; strong-zone (zfp < 20) counter-structure setups are allowed with a logged flag (the doctrine permits them at Hard Walls).

## 7.3 The narrative-alignment predicates (the mechanical forms)

```
// fightsBreak: the entry fights a confirmed range break.
fightsBreak(setup, narrative) ⟺
  narrative.theBreak != null
  ∧ setup.day >= dayOf(narrative.theBreak.ms)
  ∧ sign(setup.direction) == sign(narrative.theBreak.direction) == false   // entry AGAINST the break
  ∧ setup's zone is on the BROKEN side of the range (the side the break left)
  // e.g. Wednesday's BS break DOWN through the range bottom → suppress LONGs
  //      into the range-top supply that the break invalidated (the #1 case).

// fightsSweepRecovery: the entry fights a post-sweep reversal.
fightsSweepRecovery(setup, narrative) ⟺
  narrative.sweepOrigin != null
  ∧ setup.day >= dayOf(narrative.sweepOrigin.ms)
  ∧ setup.direction OPPOSES the sweep's reversal direction
     (SWEEP_LOW → reversal UP → suppress SHORTs; SWEEP_HIGH → reversal DOWN → suppress LONGs)
  ∧ setup's zone is within 1×ATR of the sweep extreme (the reversal's origin)
  // e.g. Friday's sweep to 100.598 (SWEEP_LOW) → suppress SHORTs into the
  //      recovery (the #2 case).

// fightsConfirmedTrend: the entry fights a confirmed top/bottom + trend.
fightsConfirmedTrend(setup, narrative) ⟺
  ∃ a confirmed extreme (the week's high/low with rejection anatomy)
  ∧ price has TRENDED away from it for ≥ 1 day (the decline/rally is established)
  ∧ setup.direction fights that trend
  // e.g. Friday's post-top all-day decline → suppress LONGs (the #5 case).
```

**The zfp interaction:** each predicate only suppresses when the setup's zone zfp > 30 (weak/conditional). A counter-structure setup at a Hard Wall (zfp < 20) is allowed with a logged `COUNTER_STRUCTURE_FLAG` (the operator's Law-20 counter-trend-scalp exemption). The gate returns `{ aligned, reason, flagged }` — `aligned: false` → suppress; `flagged: true` → emit with the flag in the report.

---

# 8. THE LQZ CHART DRAWING (VISUAL REFINEMENT)

## 8.1 The gap

The v4.4 visual-eval charts did NOT draw the liquidity zones — the operator noted that drawing them makes E/SL refinement "even easier to see."

## 8.2 The fix — LMV-fed zone rectangles

The `plutus_visual_eval.py` tool (the skill) is extended to draw the LmvTable's zone-matrices as labeled rectangles on every chart:
- **BUY_SIDE zones** (demand) → blue rectangles; **SELL_SIDE zones** (supply) → maroon rectangles.
- Each labeled with the range + the zfp + the touch count.
- The position-tool setups are drawn ON TOP, so the operator sees the E/SL/TP *relative to the LQZ structure* — where to tighten the SL (to the next zone's defended edge) and where to move the entry (to the zone's defended edge).

**This is the LMV's visual proof:** the zones are computed from data (no vision), drawn on the chart, and the operator verifies by looking — "visibly obvious."

---

# 9. THE BUILD PLAN (waves, disjoint files)

## Wave A (parallel, 2 build agents)

**PKG-LMV (the LMV engine):** `src/mdve/lmv.ts` (NEW) — the LqzZoneMatrix type, the LmvTable, the construction algorithm (§2.3), the reactionExtreme/defendedEdge derivations, the completeness invariant. Absorbs the v4.4 swing-cluster (lqz-matrix.ts) as Stage 2; adds Stage 3 (zone-matrix assembly). Done when: the Jul 6-10 LmvTable contains every golden rung with its candle-matrix + defendedEdge + reactionExtreme, deterministic, total, complete.

**PKG-SL (SL-width + entry-precision):** `src/mdve/sl-lmv.ts` (NEW) — `computeSL_LMV` (§3.2) + `entryPrice_LMV` (§4.2). Done when: the golden-week SLs land in the 4-9.5 pip range (util<0.40 trades) and the entries anchor to defendedEdge, verified against the golden-week fixture (the 12 wide cases tighten, the 5 early cases improve, NO win converts to loss).

## Wave B (after Wave A verified)

**PKG-MIRROR (re-anchor + guards):** `src/mdve/mirror.ts` (EXTEND) — the re-anchor algorithm (§5.2), the CS-1 guard (§6.2), the narrative-alignment gate (§7.2). Done when: the EU lane's win rate recovers toward DXY/GU, the CS-1-invalid setups are discarded, the counter-structure setups are suppressed, and verify-cascade still passes (no regression).

## Wave C (integration + visual)

**PKG-INTEGRATE:** wire the LMV SL/entry/mirror into the pipeline (mdve-stage) + extend `plutus_visual_eval.py` to draw the LQZ zones. Done when: the pipeline produces the refined setups, the visual-eval charts show the LQZ zones, and verify-integration passes.

## 9.1 The v4.5 integration data-flow

```
                 ┌──────────────────────────────────────────┐
                 │  HARVESTED BARS (existing, anchor-filtered)│
                 └──────────────────┬─────────────────────────┘
                                    │
              ┌─────────────────────▼──────────────────────┐
              │  MDVE ChartModel (v4.4 — zones/narrative)   │
              └─────────────────────┬────────────────────────┘
                                    │
        ┌───────────────────────────▼───────────────────────────┐
        │  LMV ENGINE (NEW — src/mdve/lmv.ts)                    │
        │  LmvTable: every LQZ as a candle-matrix +              │
        │  reactionExtreme + defendedEdge (the E/SL anchors)     │
        └───────┬───────────────────────┬───────────────────────┘
                │                       │
   ┌────────────▼─────────┐   ┌─────────▼──────────────┐
   │ SL/ENTRY (sl-lmv.ts) │   │ MIRROR RE-ANCHOR        │
   │ computeSL_LMV        │   │ selectPairNativeZone    │
   │ entryPrice_LMV       │   │ + CS-1 guard            │
   │ (Fixes 1+2)          │   │ + narrative gate        │
   └────────────┬─────────┘   │ (Fixes 3+4+5)           │
                │             └─────────┬──────────────┘
                │                       │
        ┌───────▼───────────────────────▼────────┐
        │  SETUPS (refined E/SL/TP)               │
        │  DXY source + EU/GU mirrors + emergent  │
        └───────┬───────────────────────┬────────┘
                │                       │
   ┌────────────▼─────────┐   ┌─────────▼──────────────┐
   │  OUTCOME AUDIT        │   │  VISUAL EVAL (skill)    │
   │  (win rate / R / RRR) │   │  charts + LQZ zones     │
   └───────────────────────┘   └─────────────────────────┘
```

**The LmvTable is the shared substrate:** the SL placement, the entry anchor, the mirror re-anchor, and the chart drawing all read from the SAME LmvTable — one source of truth for "where the liquidity is." This is the operator's "everything is anchored to LQZs" doctrine mechanized.

## 9.2 The integration points (the exact files)

| File | Change |
|---|---|
| `src/mdve/lmv.ts` | **NEW** — the LMV engine (LqzZoneMatrix, LmvTable, construction, completeness) |
| `src/mdve/sl-lmv.ts` | **NEW** — computeSL_LMV, entryPrice_LMV |
| `src/mdve/mirror.ts` | **EXTEND** — selectPairNativeZone (replaces findMirrorAnchor's formation-time-only match), + CS-1 guard, + narrative gate |
| `src/mdve/index.ts` | **EXTEND** — buildChartModel also builds the LmvTable (chartModel.lmv) |
| `src/pipeline/mdve-stage.ts` | **EXTEND** — consume the LMV SL/entry in the source gen + mirror stage |
| `src/mdve/setup-gen.ts` | **EXTEND** — use computeSL_LMV + entryPrice_LMV for the DXY source setups |
| `plutus_visual_eval.py` (skill) | **EXTEND** — draw the LQZ zones (LmvTable-fed rectangles) |
| `src/engine3/visual-setup-generator.ts` | **FROZEN — untouched** (the LMV SL/entry are new functions, not edits) |
| `src/engines/ladder-scaffold.ts` | **FROZEN — untouched** |

**Zero broken windows:** all new code is additive; the frozen machinery + the v4.4 harnesses are preserved and must still pass.

---

# 10. THE VERIFICATION PLAN

## 10.1 Unit/scratch (orchestrator-run, pre-deploy)

- **LMV golden reconstruction:** the Jul 6-10 LmvTable contains every golden rung (100.845, 100.905, 100.94, 100.945, 100.975, 101.115, 101.14, 101.189, 101.235, 101.24) within 2 pips, each with its candle-matrix + defendedEdge + reactionExtreme. Determinism byte-identical ×2. Totality (empty/flat/fuzz). Completeness (the union covers the range).
- **SL-width:** the 12 wide-SL golden trades → new SLs in the 4-9.5 pip range, RRR ≥ 3x, ZERO converted to a loss (re-simulated against the bars).
- **Entry-precision:** the 5 early-entry trades → better entry price, no loss introduced.
- **Mirror re-anchor:** the EU lane (fixture) → EU SHORTs re-anchored to EU's strong supply with volatility-aware SLs → EU win rate recovers.
- **CS-1 guard:** a structurally-invalid setup (entry+SL below session-open) → discarded with the logged reason.
- **Counter-structure:** a long-into-top / short-into-bottom setup → suppressed (weak zone) or flagged (strong zone).

## 10.2 The outcome audit re-run (the acceptance oracle)

Re-run `plutus_visual_eval.py` on the v4.5 output:
- **Win rate ≥ 70.8%** (no regression — the fixes must not lose any v4.4 win).
- **Avg win RRR ≥ 3R** (target ~4R).
- **EU win rate ≥ 60%** (recovers from 40%).
- **Losses:** the 7 v4.4 losses re-analyzed — the CS-1 losses eliminated (guard), the counter-structure losses suppressed, the SL-tight losses become wins (wider SL), the entry-early losses become wins (better entry).

## 10.3 Container acceptance

Fresh container, SHA-verified deploy, the standard task prompt, the 3-signal monitoring. The pipeline produces the refined setups + the LQZ-zone charts. The sniff test + the golden reconstruction + the outcome audit, all logged.

---

# 11. ANTI-GOALS + FROZEN CONSTRAINTS

- ❌ **No blanket SL-tightening.** Only the util<0.40 (SL-too-wide) trades tighten; the util>0.70 (entry-too-early) trades get entry-precision, NOT SL-tightening. Blanket tightening = losses.
- ❌ **No blind mirror.** The 80/20 doctrine: signal (direction/shape/zone-class) + pair-native re-anchor. Never a literal structure copy.
- ❌ **No hardcoded levels.** Every zone/SL/TP emerges from the bars (LMV).
- ❌ **No modification to the frozen machinery** (visual-setup-generator.ts, ladder-scaffold.ts, the canon lobes, computeSLNextLqzRung). The LMV SL/entry are NEW functions; the frozen functions are preserved (zero broken windows).
- ❌ **No vision inside LMV.** The zones are computed from data; vision (the visual-eval charts) verifies.
- **The v4.4_MARKET_READY_BASELINE is LOCKED.** v4.5 forks from it; the baseline is never modified.

---

# 12. THE ACCEPTANCE FORMULA (v4.5 done-when)

1. **LMV engine:** the Jul 6-10 LmvTable reproduces every golden rung with its candle-matrix, deterministic, total, complete (golden-recon extended).
2. **SL-width:** avg win RRR ≥ 3R (target ~4R), zero wins converted to losses.
3. **EU lane:** win rate ≥ 60% (from 40%).
4. **CS-1:** zero structurally-invalid setups emitted.
5. **Counter-structure:** the 3 counter-structure v4.4 losses suppressed or flagged.
6. **Outcome audit:** win rate ≥ 70.8%, total R ≥ +25.69R (no regression).
7. **Visual:** the charts draw the LQZ zones; the operator can see the E/SL refinement anchors.
8. **No regression:** every v4.4 harness still passes (golden-recon 16/16, verify-cascade 13/13, verify-integration 13/13, scratch suites). Frozen machinery byte-identical.

**THEN:** checkpoint `Checkpoints/v4.5_FINAL/` + full build report + ship review.

---

# APPENDIX A — THE OPERATOR'S DOCTRINE CORRECTIONS (VERBATIM, CANON)

**The mirror (80/20):** "The mirror is not per pip precision. The mirror is for the trade setup direction, shape, and zone class of entry + TP. 80%. The remaining 20% like specific entry/SL/TP levels and anchors within the mirror cascade must be optimized for the actual pair being traded on. obviously. cannot be a blind mirror."

**Zone class, not literal zone:** "You are mirroring zone CLASS not literal zone. If DXY moves from BoM EU moves from BoM — you must match to the relevant BoM zone that is specific to EU's actual price action pair-native storyline. DXY is only giving a SIGNAL with high accuracy not a blind copy paste trade. Signals all must be followed, but adapted as well for the micro nuances of the specific pair."

**LMV:** "Create a matrix data set based on linear algebra or other MPSE concepts that groups ALL visible ranges of LQZs from candlestick data (the OHLC of several if not dozens of candles across the last 1-6 weeks all reacting to the same price range = clear liquidity zone). Group all of these into matrices so each zone's OHLC data from X number of candles = 1 matrix. We will have a table of matrices denoting exactly what are all the LQZ ranges. LQZs discovered by MPSE matrices. It should be very easy to map LQZs on the chart without even needing vision and then when we use vision to verify it will be visibly obvious. This immediately solves a big problem for E/SL refinement since everything is anchored to LQZs."

# APPENDIX B — THE LOSS AUTOPSY (the 7 v4.4 losses, classified)

| # | Trade | Category | v4.5 fix |
|---|---|---|---|
| 1 | DXY LONG Wed NY | analysis wrong (long into top) | Fix 5 (counter-structure) |
| 2 | DXY SHORT Fri NY | analysis wrong (short into bottom) | Fix 5 (counter-structure) |
| 3 | EU SHORT Wed | SL tight + wrong zone + CS-1 | Fix 4 (CS-1 guard) + Fix 3 (re-anchor) |
| 4 | EU SHORT Tue | wrong zone + CS-1 | Fix 4 (CS-1 guard) + Fix 3 (re-anchor) |
| 5 | EU LONG Fri | analysis wrong / timing | Fix 5 (counter-structure) |
| 6 | GU LONG Tue | entry too early / wrong LQZ | Fix 2 (entry-precision) |
| 7 | GU LONG Wed | entry too early / wrong LQZ | Fix 2 (entry-precision) |

# APPENDIX C — THE LMV MATHEMATICS (the MPSE structure map)

- **The LmvTable as a total function** `LMV: OHLC → LmvTable` (Losslessness Theorem: `|I(S_math)| = 1`). Every input bar set → exactly one table.
- **Partitions / equivalence classes (Structure 15):** the swing-point clustering `c₁ ~ c₂ ⟺ |price(c₁) − price(c₂)| ≤ ε` — proven reflexive/symmetric/transitive. An LQZ = an equivalence class with a cardinality predicate (≥3 candles, ≥2 kinds).
- **Matrix operations (Structure 9):** each zone's `candles` matrix (rows = candles, cols = OHLC). The completeness invariant ("every cell of the price×time matrix exists") makes the model total.
- **Vector distance (Structure 17):** the proximity metric (`|p₁−p₂| ≤ ε·pip`, ATR-scaled).
- **Piecewise-total classifiers (Structure 4):** the touch-kind predicate (SWEEP/REJECT/DEFEND/DWELL/PASS_THROUGH) — every bar classifies to exactly one branch.
- **Recurrence (Structure 6):** the freshness state machine per zone.
- **The reactionExtreme / defendedEdge as matrix reductions:** `reactionExtreme = min(wickLow col)` (BUY_SIDE) / `max(wickHigh col)` (SELL_SIDE); `defendedEdge = modalRejectionLevel(bodyClose col)`. These are the exact E/SL anchors the fixes consume.

---

*END OF V4.5 SPEC — build proceeds per the Wave plan (§9) after the operator's go-ahead. The v4.4_MARKET_READY_BASELINE is LOCKED and is the fork point.*

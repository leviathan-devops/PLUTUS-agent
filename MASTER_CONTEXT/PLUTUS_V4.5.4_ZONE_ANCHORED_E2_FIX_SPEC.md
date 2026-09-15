# PLUTUS V4.5.4 — THE ZONE-ANCHORED E2 FIX SPEC (the C-3B/C-3C/C-3D wave authority)

**DATE:** 2026-08-11 · **AUTHOR:** the Trident orchestrator (the compaction-prep record) · **STATUS:** the audit + the fix plan — the next session EXECUTES (the operator's directive: "dont fix it yourself — write the exact audit findings + fix plan to the compaction prep w/ FULL detail, no watering down, as dense as it needs to be for the next session to handle. fully compaction proof all context self contained on how + why")

**THE OPERATOR'S DOCTRINE (verbatim — THE LAW):**
> "NOTHING SHOULD BE PRICE ANCHORED EVER. THIS IS THE EXACT HARDCODED DEGENERATE GARBAGE THAT IS FORBIDDEN. NEEDS TO BE ZONE ANCHORED. E1 CALCULATES THE EXACT ZONES YOU ARE TRYING TO HARDCODE FUCKING PRICES DO. SO THIS IS A BREAK IN THE LOGIC EITHER ON E1 ZONE CALCULATION OR E2 ZONE PINNING. YOU DO NOT HARDCODE FUCKING PRICES. ZOOM OUT AND SEE HOW YOU CAN PIN THESE EXACT SAME FUCKING ZONES *WITHOUT* HARDCODING THE PRICES USING THE E1 ZONE COMPUTATION OUTPUT. I SPENT 2 FUCKING WEEKS BUILDING MPSE ENGINES FOR E1 FOR LITERALLY EXACTLY THIS. USE THEM."

**THE WORKSPACE ROOT:** /home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident_Agent/Active_Projects/Plutus_Agent

---

# PART 1 — THE ARCHITECTURE (what the E1/E2/E3 separation IS)

## 1.1 THE THREE LAYERS (the operator's design — the separation of concerns)

- **E1 = THE ZONE ENGINE (the MPSE — the 2 weeks of work).** Computes the ZONES: the S/D zones + the LQZ rungs at their REAL positions in the market structure, each carrying the MPSE outputs — the pressure lifecycle (VIRGIN/FORTRESS/DEPLETED), the classification (BoM/MoM), the zfp (the failure probability), the reaction history (the battles), the semantic intent (via the zone-pressure lexicon). **THE ZONES ARE THE ANCHORS. THE PRICES ARE EMBEDDED IN THE ZONE GEOMETRY — the E1 zone map IS the price structure, but the SELECTION must never use the price DISTANCE as the ranking criterion — it uses the STRUCTURAL significance.**
- **E2 = THE ZONE PINNER (the shape chain + the per-day designation).** Consumes the E1 zone map + the shape chain → designates WHICH zones the day's shape interacts with (the supply above / the demand below). **E2 emits ZONE ANCHORS ONLY (the zone IDs) — NEVER the prices.** The E2's selection must rank the E1's MPSE structural outputs (the pressure DESC, the zfp ASC, the classification, the fortress) — the operator's "pressure mechanics = semantic intent". THE PRICE DISTANCE FROM THE DAY OPEN IS E3'S JOB — it must NEVER be the E2's primary ranking.
- **E3 = THE PRICE RESOLVER (the setups).** Computes the exact entries/SL/TP FROM the E2-designated zone geometry (the near edges, the defended edges, the measured SL depths). **THE PRICES ARE E3'S JOB — the ONLY place the exact pip levels appear.**

## 1.2 THE CASCADE (the operator's architecture — verbatim)

> "E2 now only needs to be calculated on DXY, injected into EU w/ an 'invert' function, and then the completed EU E2 needs to be injected into GU. this is exactly how cascade is supposed to work."
> "EU is this from DXY but inverted direction 1:1 mapping. so if DXY is long long short short long EU is the injected shape chain verbatim exactly and then inverted short short long long short - literally the same just with a simple 'flip' inverting it across the X axis. literally the simplest fucking thing. should be a fucking boolean switch like literally not that hard. if 1 = long and 0 = short literally just boolean switch after shape chain is injected from DXY to EU (THIS IS AN EXAMPLE OF THE LOGIC DONT TAKE IT LITERALLY AND CREATE DEGENERATE SHIT. Document this in the compaction prep)"

**THE IMPLEMENTATION CONTRACT:**
1. **THE DXY = the E2 SOURCE.** Its own brain computes the shape chain (the ONLY brain that runs its own prediction — the DXY's zone map drives the SS/BS/R/BS/WL waveform).
2. **THE EU = the DXY's shape chain injected + the DIRECTION INVERTED.** The shapes propagate VERBATIM (the waveform is the same); the DIRECTION flips 1:1 (the DXY LONG day → the EU SHORT day — the X-axis inversion — a boolean direction-switch on the injected day rows). **THE WARNING: the operator's "boolean switch" is the LOGIC EXAMPLE — the implementation must ride the ZONE-ANCHORED principle (the shapes flip; the EU's OWN E1 zones resolve the designations) — NEVER a hardcoded price flip, NEVER degenerate.**
3. **THE GU = the COMPLETED EU E2 injected (KEPT — no flip)** over the GU's OWN zones.
4. **THE E2-SHAPE LAYER: 0 DIVERGENCE** across the pairs (the same waveform — the verified state: the GU = the EU's LITERALLY — Mon SS · Tue BS · Wed R · Thu BS · Fri WL).
5. **THE E3 LAYER: THE ONLY DIVERGENCE** — the actual prices/pip levels (the entries/SL/TP from each pair's own zone geometry) + the E1 LQZ profile (each pair's own liquidity rungs — the S/D are functionally the same, the LQZ differ).

**THE IMPLEMENTED SYSTEM (the GU leg — the injectShapeSequence, D96 — the exhaustive record in context_management/DEBUG_LOG.md):** the ShapeBrain class gained `injectShapeSequence(seq)` (src/brains/shape-brain.ts:3321) + the `injectedShapeSequence` field (:3219); `buildShapeChain` gained the `injectedChain?` 6th parameter (:2984); report-v452's GU brain construction (:1068-1097) injects `euShape.shapeChain.dayDecomposition.map(d => ({shape: d.shape}))` BEFORE `compute()`. The override (:3112-3114): `const nextShape = injectedChain && injectedChain[i] ? injectedChain[i]!.shape : predictNextShapePressureAware(...)` — the chain's SHAPE follows the EU; the ZFP/contested-zone/confidence still derive from the GU's own zones. The day decomposition then resolves the GU's OWN zone IDs per the EU's waveform. The dayOpenSpot stays the GU's own day-band (the C-1 forward projection on the GU's spot).

---

# PART 2 — THE AUDIT: THE 11 PRICE-ANCHORED SITES (the full blast radius — THE FORBIDDEN CLASS)

**THE CLASS:** every E2-selection ranking that uses the PRICE DISTANCE (from the day open, from a reach, from a level) as a PRIMARY or high-ranking comparator — instead of the E1 MPSE structural outputs (the pressureScoreOf, the lifecycle, the zfp, the classification, the reactions). The operator: "NOTHING SHOULD BE PRICE ANCHORED EVER."

**THE VERIFIED FAILURE:** the machine's full-week Tue-Fri designations diverged from the operator's structural reads — the EU Tue SHORT 1.14189 (the price-nearest rung to the projected open 1.14082) vs the operator's 1.14460 (the STRUCTURAL BoM supply at its real position). The Monday worked because the golden zones ARE the structural winners AND the price-nearest — the position legs masked the structural truth. The D97 record (DEBUG_LOG) maps every trade.

## 2.1 SITE-1 — shape-brain.ts:2065-2066 — THE RUNG-VS-RUNG SUBSTANTIAL-POSITION LEG (the PRIMARY comparator leg)

**THE EXACT CODE (current):**
```ts
? (((a.ceiling - a.floor) < 2 * pipSize ? Infinity : (a.floor - dayOpenSpot))
   - ((b.ceiling - b.floor) < 2 * pipSize ? Infinity : (b.floor - dayOpenSpot)))
```
**WHAT IT DOES:** among the LMV-rung candidates (the supply side), the rungs with a band ≥ 2 pips race by `(a.floor - dayOpenSpot)` — the rung's FLOOR PRICE distance above the day's projected open. The nearest substantial rung above the open wins.
**WHY IT'S DEGENERATE:** the price distance from the projected open is the ranking — NOT the structural significance. The Tuesday's projected open 1.14082 → the rung [1.14150-1.14189] (floor 6.8p above) wins over the structural BoM supply at 1.14460 (37.8p above) — the operator's actual read.
**THE CORRECT LOGIC:** the rungs rank by the E1 MPSE structural outputs FIRST (the pressureScoreOf DESC — the VIRGIN +40 / FORTRESS +20 — then the zfp ASC, then the width DESC — the operator's scale law, then the dayWindow/recency) — the price position DEMOTED to the final tie-break or REMOVED.

## 2.2 SITE-2 — shape-brain.ts:2068-2073 — THE ZONE-INVOLVED POSITION LEG (the PRIMARY comparator leg)

**THE EXACT CODE (current):**
```ts
: ((pressureScoreOf(zoneToLexiconPressure(a)) <= -30 || (a.zfp ?? 99) > 25
    || a.floor <= dayOpenSpot || (a.ceiling - a.floor) < pipSize
    ? Infinity : a.floor - dayOpenSpot)
   - (pressureScoreOf(zoneToLexiconPressure(b)) <= -30 || (b.zfp ?? 99) > 25
      || b.floor <= dayOpenSpot || (b.ceiling - b.floor) < pipSize
      ? Infinity : b.floor - dayOpenSpot)))
```
**WHAT IT DOES:** for the supply-candidate comparisons involving a ZONE (not two rungs), the zone's `floor - dayOpenSpot` (the price distance above the open) ranks, with the quality gates (the non-depleted, zfp ≤ 25, the floor above the open, the width ≥ 1 pip) as the Infinity filters.
**WHY IT'S DEGENERATE:** the same price-anchored class — the nearest quality zone above the projected open wins, NOT the structural pressure zone.
**THE CORRECT LOGIC:** the zone's structural ranking (the pressure DESC — the +40 VIRGIN-BoM, the +20 FORTRESS — the zfp ASC, the classification, the width DESC) leads; the price position is the final tie-break.

## 2.3 SITE-3 — shape-brain.ts:2091-2094 — THE DEMAND-SIDE POSITION LEG (the C-3 re-enable)

**THE EXACT CODE (current):**
```ts
: (cands.length > 0 && (isDemandZone(cands[0]!) || (cands[0] as { side?: string }).side === 'BUY_SIDE')
    ? ((pressureScoreOf(zoneToLexiconPressure(a)) <= -30 || (a.zfp ?? 99) > 25
        || a.ceiling > dayOpenSpot + 0.5 * pipSize || (a.ceiling - a.floor) < pipSize
        ? Infinity : Math.max(0, dayOpenSpot - a.ceiling))
       - (pressureScoreOf(zoneToLexiconPressure(b)) <= -30 || (b.zfp ?? 99) > 25
          || b.ceiling > dayOpenSpot + 0.5 * pipSize || (b.ceiling - b.floor) < pipSize
          ? Infinity : Math.max(0, dayOpenSpot - b.ceiling)))
    : 0)) ||
```
**WHAT IT DOES:** the LONG's demand candidates race by `dayOpenSpot - a.ceiling` — the ceiling's price distance BELOW the day's open (the nearest demand below wins), with the ≤0.5p-straddle tolerance.
**WHY IT'S DEGENERATE:** the same class — the price distance ranks. (It fixed the identical-every-day EU LONG by giving the BS days a nearer demand — but the SELECTION should be structural, and the per-day variation should come from the E2's shape-driven ZONE designation + the E3's chained entries, not the open-distance ranking.)
**THE CORRECT LOGIC:** the demand's structural ranking (the pressure DESC — the fortress +20, the VIRGIN +40 — the zfp ASC) leads; the ceiling-below-open position is the final tie-break (the filter `ceiling ≤ open + tolerance` may stay as a VALIDITY gate — a demand whose ceiling is far above the open is not the day's LONG target — but the RANKING is structural).

## 2.4 SITE-4 — shape-brain.ts:1818-1820 — `nearestSupplyAbove` (the reach extension)

**THE EXACT CODE (current):**
```ts
const nearestSupplyAbove = (z: readonly DXYZone[]): number | null => {
  const q = z.filter((x) => isSupplyZone(x) && x.floor > dayOpenSpot)
    .sort((a, b) => a.floor - b.floor)[0];
  return q ? q.ceiling : null;
};
```
**WHAT IT DOES:** finds the FIRST supply floor above the day open (the price-nearest) — used to EXTEND the day's reach (so the operator's distant structures stay reachable).
**WHY IT'S DEGENERATE:** the reach extension targets the price-nearest zone — the operator's structural zones (the Friday supply 1.14460) can be skipped if a closer sliver exists. (The C-2 added the QUALITY filter at SITE-5 — but the structural ranking is still absent.)
**THE CORRECT LOGIC:** the reach extension should target the STRONGEST structural supply above the open (the pressure DESC / zfp ASC — the MPSE) — the operator's "the reach extends to the FIRST quality structure beyond the open" — the QUALITY = the structural significance, not the price proximity.

## 2.5 SITE-5 — shape-brain.ts:1841-1848 — `nearestQualitySupplyAbove` (the reach extension)

**THE EXACT CODE (current):**
```ts
const nearestQualitySupplyAbove = (z: readonly DXYZone[]): number | null => {
  const isQuality = (x: DXYZone): boolean =>
    (x.zfp ?? 99) <= 25
    || x.reactionStatus === 'virgin'
    || x.reactionStatus === 'active';
  const q = z.filter((x) => isSupplyZone(x) && isQuality(x) && x.floor > dayOpenSpot)
    .sort((a, b) => a.floor - b.floor)[0];
  return q ? q.ceiling : null;
};
```
**WHAT IT DOES:** the C-2 quality-filtered version of SITE-4 — the first zfp≤25/virgin/active supply above the open.
**WHY IT'S DEGENERATE:** still sorts by `a.floor - b.floor` — the price-nearest among the quality set. The operator's structural zone (the BoM 1.14460) can still lose to a closer quality rung.
**THE CORRECT LOGIC:** sort by the structural strength (the pressure DESC — the VIRGIN-BoM +40, the FORTRESS +20 — the zfp ASC) — the reach extends to the STRONGEST structure, not the nearest.

## 2.6 SITE-6 — shape-brain.ts:2204 — the deep-demand pick (the ZR-6D)

**THE EXACT CODE (current):**
```ts
deepDemandPick = [...deepPool].sort((a: DXYZone, b: DXYZone) =>
  (a.zfp - b.zfp) ||
  (recencyRank(a) - recencyRank(b)) ||
  (Math.abs(zoneCenter(a) - demandPick!.floor) - Math.abs(zoneCenter(b) - demandPick!.floor)),
)[0];
```
**WHAT IT DOES:** the deep demand beneath the primary demand — ranked by the zfp ASC, the recency, then the CENTER PRICE DISTANCE from the primary's floor.
**WHY IT'S DEGENERATE:** the third leg is price-anchored (the center distance from the primary's floor). The operator's deep-demand read (the EU #6: "the LQZ at 1.13935-1.13875 — the LQ shield of the BoM 4H bullish OB") is a STRUCTURAL read — the deepest strong structure, not the nearest to the primary's floor.
**THE CORRECT LOGIC:** the deep-demand ranks by the pressure DESC (the BoM/fortress), the zfp ASC, the reactions — the price distance removed or the final tie-break.

## 2.7 SITE-7 — shape-brain.ts:2364-2365 — the I2 qualifying sort (the zone-override)

**THE EXACT CODE (current):**
```ts
.sort((a, b) => {
  return (a.z.zfp - b.z.zfp) ||
    (Math.min(...a.internal.map((r) => Math.abs(zoneCenter(r) - i2SortReach)))
     - Math.min(...b.internal.map((r) => Math.abs(zoneCenter(r) - i2SortReach)))) ||
    (a.z.id < b.z.id ? -1 : a.z.id > b.z.id ? 1 : 0);
})[0];
```
**WHAT IT DOES:** the I2 S/D-zone preference — the qualifying zone whose INTERNAL rungs sit nearest the price-derived reach (i2SortReach = the expectedReach — open ± travelMid) wins.
**WHY IT'S DEGENERATE:** the second leg ranks by the internal rungs' PRICE DISTANCE from the reach. The structural pressure of the zones is NOT in the ranking (only the zfp first).
**THE CORRECT LOGIC:** the qualifying zones rank by the pressure DESC (the FORTRESS +20, the VIRGIN +40), the zfp ASC, the reactions — the internal-rung reach-distance demoted or removed.

## 2.8 SITE-8 — reasoning-chain.ts:749-766 — `nearestDemandBelow` (the chain's LONG fallback)

**THE EXACT CODE (current):**
```ts
function nearestDemandBelow(model: ChartModel, dayOpenSpot: number): OperativeZone | null {
  const zones = model.zones
    .filter((z) => z.type === 'DEMAND' && z.bottom <= dayOpenSpot)
    .map((z) => ({ zone: zoneToOperative(z), ceiling: z.top }));
  const rungs = model.lmv.table
    .filter((r) => r.side === 'BUY_SIDE' && r.bottom <= dayOpenSpot && !isDegenerateRung(r, model.pair))
    .map((r) => ({ zone: rungToOperative(model.pair, r), ceiling: r.top }));
  const pool = [...zones, ...rungs].sort((a, b) => b.ceiling - a.ceiling); // the nearest first
  return pool[0]?.zone ?? null;
}
```
**WHAT IT DOES:** the chain's LONG-lane fallback (when the E2 designation + the fortress are absent) — the demand with the HIGHEST CEILING below the open (the price-nearest) wins.
**WHY IT'S DEGENERATE:** the price-nearest ceiling ranks — the operator's structural demand (the fortress 1.14004, the BoM 1.13885) can lose to a nearer sliver.
**THE CORRECT LOGIC:** the fallback ranks by the structural strength (the pressure DESC — the fortress +20 — the zfp ASC) — the price position is the final tie-break (the `bottom ≤ open` filter stays as the VALIDITY gate).

## 2.9 SITE-9 — reasoning-chain.ts:853 — the strongestSupplyInDayBand FINAL tie-break

**THE EXACT CODE (current):**
```ts
return pool.sort((a, b) =>
  (recentlyFormed(b) - recentlyFormed(a)) ||            // the recently-FORMED first (the operator's #1)
  (recentlyBattled(b) - recentlyBattled(a)) ||          // the recent battles second
  (zonePressureScore(b) - zonePressureScore(a)) ||      // the E1 pressure DESC (the C-4)
  (a.zfp - b.zfp) ||                                    // the failure prob ASC
  (Math.abs(a.ceiling - dayOpenSpot) - Math.abs(b.ceiling - dayOpenSpot)) ||
  (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0]!;
```
**WHAT IT DOES:** the chain's SHORT-lane fallback — the recently-formed/battled first, the pressure DESC, the zfp ASC, then the CEILING PRICE DISTANCE from the day open.
**WHY IT'S DEGENERATE:** the FINAL price tie-break (the ceiling distance from the open) — the weakest leg but still the class. (The PRIMARY legs — recentlyFormed/recentlyBattled/pressure/zfp — ARE the structural MPSE outputs — this site is the LEAST degenerate, but the price leg must go.)
**THE CORRECT LOGIC:** the price tie-break removed or replaced by the width DESC (the scale law).

## 2.10 SITE-10 — cascade-translation.ts:310-323 — `positionMatchOf` (the cascade's zone matching)

**THE EXACT CODE (current):**
```ts
function positionMatchOf(
  candidate: ZoneModel,
  level: number | null,
  dayDirection: string,
  pipSize: number,
): boolean {
  if (level === null) return false;
  const wantType = dayDirection === 'SHORT' ? 'SUPPLY' : dayDirection === 'LONG' ? 'DEMAND' : null;
  if (wantType === null || candidate.type !== wantType) return false;
  const tol = POSITION_TOLERANCE_PIPS * pipSize;
  return candidate.bottom - tol <= level && candidate.top + tol >= level;
}
```
**WHAT IT DOES:** the cascade's zone translation requires the candidate's band to CONTAIN the receiving price level (the translated zone's level ± the tolerance).
**WHY IT'S DEGENERATE:** the price-level containment gates the zone matching — the cascade's structural matching should rank the receiving pair's OWN zones by the structural significance, not require the price-position containment.
**THE CORRECT LOGIC:** the cascade translation (the EU→GU zone mapping) should select the receiving pair's zones by the structural equivalence (the element, the role, the window, the pressure) — the price containment REMOVED or the last criterion. (NOTE: the INJECTION SYSTEM (Part 1.2) already bypasses this — the GU's zones resolve via its OWN brain with the EU's shapes injected; the translateCascadeDayMap remains for the divergence validation only.)

## 2.11 SITE-11 — cascade-translation.ts:459-471 — the scored sort (the cascade's zone ranking)

**THE EXACT CODE (current):**
```ts
scored.sort((a, b) =>
  (b.primary - a.primary) ||                     // PRIMARY: structural confluence
  (a.distance - b.distance) ||                   // POSITION ACCURACY: at the rejection point
  (a.z.zfp - b.z.zfp) ||                         // SECONDARY: lowest zfp (strength — the noise filter)
  (b.reactions - a.reactions) ||                 // SECONDARY: most reactions (most-battled level)
  (a.z.id < b.z.id ? -1 : a.z.id > b.z.id ? 1 : 0)); // deterministic tiebreak
```
**WHAT IT DOES:** the cascade's translated-zone ranking — the structural confluence first, then the PRICE DISTANCE from the designated level.
**WHY IT'S DEGENERATE:** the second leg ranks by the price distance (the position accuracy) — the structural pressure/lifecycle is NOT in the ranking.
**THE CORRECT LOGIC:** the pressure DESC (the +40/+20/−30), the classification, the zfp ASC lead; the price distance removed or the last tie-break.

---

# PART 3 — THE FIX PLAN (the C-3B wave — the next session executes)

## 3.1 THE PRINCIPLE (the operator's law — mechanically enforced)

**THE E2's zone ranking = THE E1 MPSE STRUCTURAL OUTPUTS, in this order:**
1. **THE PRESSURE DESC** — `pressureScoreOf(zoneToLexiconPressure(z))`: the VIRGIN-BoM +40 (the ENTRY-PRIMARY), the FORTRESS +20, the DEPLETED −30 (the operator-confirmed W3 law: "yeah thats an issue it should be the opposite" — the depleted LAST), the bare-virgin-MoM −20 penalty (the death-zone class).
2. **THE ZFP ASC** — the failure probability (the strength).
3. **THE CLASSIFICATION** — the BoM over the MoM (the structural walls).
4. **THE WIDTH DESC** — the operator's scale law ("I will not do 1 pip on a big zone... it needs to scale w/ the market conditions") — the substantial bands over the slivers.
5. **THE REACTIONS DESC** — the most-battled levels.
6. **THE DAYWINDOW/RECENCY** — the factors, never the law.
7. **THE PRICE POSITION — DEMOTED TO THE FINAL TIE-BREAK OR REMOVED.** The validity gates (the floor-above-open for the supplies, the ceiling-below-open for the demands, the inBand reach) STAY as FILTERS (a supply below the open is not the SHORT's target — the day's reach bounds the candidates) — but the RANKING is structural, never the price distance.

**THE EXACT REWRITE (the strongest() comparator — src/brains/shape-brain.ts:2050-2117):**

```ts
const strongest = (cands: DXYZone[], reach: number): DXYZone | undefined =>
  [...cands].sort((a: DXYZone, b: DXYZone) =>
    // ── THE E1 MPSE STRUCTURAL RANKING (the operator's law: "NOTHING SHOULD
    //    BE PRICE ANCHORED EVER" — the pressure DESC, the zfp ASC, the
    //    classification, the width, the reactions — the zone anchors) ──
    (pressureScoreOf(zoneToLexiconPressure(b)) - pressureScoreOf(zoneToLexiconPressure(a))) ||
    ((a.zfp ?? 99) - (b.zfp ?? 99)) ||
    ((isBoMZone(b) ? 1 : 0) - (isBoMZone(a) ? 1 : 0)) ||
    ((b.ceiling - b.floor) - (a.ceiling - a.floor)) ||
    ((b.reactionCount ?? 0) - (a.reactionCount ?? 0)) ||
    (dayWindowRank(b) - dayWindowRank(a)) ||
    (recencyRank(a) - recencyRank(b)) ||
    // ── THE PRICE POSITION: the FINAL tie-break ONLY (the validity gates
    //    above — the cands filters — already bound the candidates to the
    //    day's reach; the ranking is structural) ──
    (Math.abs(zoneCenter(a) - dayOpenSpot) - Math.abs(zoneCenter(b) - dayOpenSpot)) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  )[0];
```

**THE VALIDITY GATES THAT STAY (the filters, NOT the ranking):**
- The supply candidates: `isSupplyZone(z) || z.side === 'SELL_SIDE'` + `z.ceiling > dayOpenSpot` (the supply's TOP above the open — the zone reaches the SHORT side) + `z.floor <= supplyReach` (the day's reach) + `inBand(z)` (the day's travel band) — these bound the candidate SET; the RANKING is the structural order above.
- The demand candidates: `isDemandZone(z) || z.side === 'BUY_SIDE'` + `z.floor < dayOpenSpot` (the demand's floor below the open) + `z.ceiling >= demandReach` + `inBand(z)`.
- THE STRADDLE TOLERANCE: a zone whose band STRADDLES the open (the supply floor below, the ceiling above — the DXY golden [101.027-101.153]; the demand ceiling ≤ open + 0.5p — the GU golden [1.33306-1.33343]) is a VALID candidate — the E3 resolves the entry from the zone geometry (the internal rungs). The 0.5p straddle tolerance for the demands is a VALIDITY gate (the zone's ceiling must not be far above the open — it's not the day's LONG target).

**THE WAVE STEPS (the C-3B):**
1. REWRITE the strongest() comparator (the code above) — the structural legs lead, the price position demoted to the final tie-break.
2. REMOVE the price-distance legs from SITES 1-3 (the rung-vs-rung + the zone-involved + the demand-side position legs become the final tie-break or die) — the per-day variation MUST come from the E2's shape-driven designation + the E3's chained entries, NOT the open-distance ranking.
3. REWRITE the SITES 4-5 (the reach extensions) to target the STRONGEST structural supply (the pressure DESC / zfp ASC), not the nearest.
4. REWRITE SITE-6 (the deep-demand) — the structural ranking (the pressure/zfp/reactions), the center-distance removed.
5. REWRITE SITE-7 (the I2 qualifying sort) — the pressure DESC leads; the internal-rung reach-distance demoted.
6. REWRITE SITE-8 (nearestDemandBelow) — the structural ranking; the ceiling-position as the final tie-break.
7. REMOVE the SITE-9 price tie-break (replace with the width DESC).
8. AUDIT the SITES 10-11 (the cascade translation) — the injection system (Part 1.2) already bypasses them for the GU; the DXY→EU inversion (the future wave) must ride the SAME injection principle, NOT the price-position cascade matching.

## 3.2 THE VERIFICATION PROTOCOL (the C-3B done-when — mechanical)

1. **THE GOLDEN GATE 5/5 UNCHANGED** (`bun diag-reasoning-chain-golden.ts` — the Monday golden: DXY L 100.945 Δ2.7p · DXY S 101.140 Δ2.0p · EU S 1.14395 Δ0.5p · EU L 1.14110 Δ1.5p · GU L 1.33330 Δ1.3p — ALL ≤ 3p) + the OUTCOME GATE ≥ 4/6 PASS. **THE MONDAY MUST NOT MOVE** — if the structural rewrite shifts a Monday designation, the pressure ranking is WRONG (the Monday golden zones ARE the structural winners — the +40 VIRGIN-BoM / the +20 FORTRESS).
2. **THE FULL-WEEK ORACLE (the C-3B acceptance — the operator's reads from MASTER_CONTEXT/Golden_Operator_Trade_Feedback_EU_GU.md):** the machine's Tue-Fri designations must PIN THE SAME STRUCTURAL ZONES as the operator — the EU Tue S the BoM supply at 1.14460 (the zone containing 1.14460-1.14625), the EU Wed S the MoM supply at 1.14295 (the zone containing 1.14295-1.14220), the EU Wed L the demand at 1.14020 (the chained BS TP), the EU Thu L the fib-LQZ zone at 1.14225, the EU Fri S the chained Thu-TP zone at 1.14555, the GU Tue S 1.33965, the GU Wed S 1.33660, the GU Wed L 1.33280, the GU Thu S 1.34260, the GU Thu L 1.33850, the GU Fri S 1.34500. **THE ZONES, NOT THE PRICES — the acceptance is that the E2 designates the SAME ZONE IDS the operator's levels map to (the zone CONTAINING the operator's level), WITHOUT ANY PRICE IN THE SELECTION.**
3. **tsc the FULL project** (`npx tsc --noEmit -p tsconfig.check.json` — the src 0 errors; the 134 pre-existing harness errors are the known backlog).
4. **THE FULL-WEEK ≥ 90%** through the sanctioned E1→E2→E3 pipeline (the outcome sim on the real bars — the operator: "the machine's trades WIN where the operator's would have won EVERY DAY").
5. **THE DETERMINISM ×2** (the byte-identical runs) + the frozen pair (sl-lmv 912940832fac44bc838d53423cbb921eff501de60a9f2641bf20c1d1497eaeab · trade-dedup 33914c897e7775402eefd7d13a5d3675667a2ace576b55a689bc864401a680e4 — byte-identical).

## 3.3 THE DO-NOTs (the anti-patterns — the operator's bans, mechanically enforced)
- NO hardcoded prices ANYWHERE in the E2 selection — the golden oracle levels are the MEASUREMENT reference (the acceptance), NEVER a pipeline input.
- NO price-distance ranking as the primary comparator — the structural MPSE outputs lead.
- NO fitted calibration — the golden week is never the calibration set.
- NO the degenerate pairs (the flat-2R class — the W6 gate).
- NO the LSP/tsc bypass — the FULL project type-checks.
- NO theatrical declarations — the container test IS the test (the TUI evidence + the artifacts on disk).

---

# PART 4 — THE CONTEXT (self-contained — the next session's full awareness)

## 4.1 THE VERIFIED STATE (2026-08-11 — re-run the battery, never trust the record)
- THE MONDAY GOLD 5/5 + the OUTCOME PASS — LOCKED (the golden gate UNCHANGED through the C-2 + C-3 waves). The checkpoint `Checkpoints/monday-gold-standard-achieved/` (immutable) + `Checkpoints/v4.5.4_C3_CASCADE_INJECTION/` (the C-3 baseline — 8 source files + the check config, sha-verified identical to the live src).
- THE E2-NULL — DEAD (the C-1 wave: the day-band forward projection + the median travel + the Monday exclusion — the opens advance Mon-Fri).
- THE E2-AUTHORITATIVE PATH — LANDED (the C-2 wave: the 15 fixes — the golden designations populate DIRECTLY without the fallbacks).
- THE GU CHAIN = THE EU'S LITERALLY (the C-3 wave: the injectShapeSequence — the shared waveform, the GU's own zones).
- THE FULL-WEEK: 11 WINS · 8 LOSSES · 0 OPEN of 19 (the honest count — the slop dead, the per-day variation live).
- **THE REMAINING 8 LOSSES = THE PRICE-ANCHORED E2 SELECTION (this spec's audit — the C-3B fix).**

## 4.2 THE KEY FILES
- `src/brains/shape-brain.ts` — the E2 designation machinery (the strongest() comparator :2050-2117, the reach extensions :1818-1850, the deep-demand :2204, the I2 qualifying :2364-2365, the injectShapeSequence :3321).
- `src/mdve/reasoning-chain.ts` — the chain (nearestDemandBelow :749-766, strongestSupplyInDayBand :853, the lane order :2040+).
- `src/mdve/mirror.ts` — the TP machinery (structuralOpposingLqz, strengthDrivenRungTp, the path-cap firstUnmitigatedOpposingZone — the W6 gates LANDED).
- `src/mdve/anchor-decision-machine.ts` — the ADM (the measured SL/TP — the E3's price computation — LEGITIMATE, the prices ARE the E3's job).
- `src/mdve/lexicons/zone-pressure.ts` — THE MPSE ENGINE (the pressureScoreOf +40/−30/+20, the lifecycle, the fortress — THE ZONE ANCHORS the E2 must rank by).
- `src/mdve/cascade-translation.ts` — the cascade translation (the SITES 10-11 — the price-position matching — the divergence validation only).
- `report-v452.ts` — the buildE2Core (the cascade wiring — the injectShapeSequence at :1068-1097).
- `MASTER_CONTEXT/Golden_Operator_Trade_Feedback_EU_GU.md` — THE FULL-WEEK ORACLE (the 15 trades: 8 EU + 7 GU — the acceptance reference).
- `context_management/DEBUG_LOG.md` — the D91-D99 records (the full journey).
- `context_management/POST-COMPACTION_PROMPT.md` + `COMPACTION_SURVIVAL.md` — the activation + the resume.

## 4.3 THE KEY HASHES
- The frozen pair: sl-lmv.ts `912940832fac44bc838d53423cbb921eff501de60a9f2641bf20c1d1497eaeab` · trade-dedup.ts `33914c897e7775402eefd7d13a5d3675667a2ace576b55a689bc864401a680e4`.
- The C-3 checkpoint: shape-brain.ts `14d01cf306dc88ce0813e90d3d171ad3e22964929730b289834d1f9b80f1b0e7` · the analysis point `1783317600000` (Mon 2026-07-06 06:00 UTC) · the dist `a6383b6587f95f6d4352bb4176f397b9320ea8e951565b4ee994319c9aedd6cf`.

## 4.4 THE NEXT WAVES (the full queue)
- **C-3B — THIS SPEC'S FIX** (the zone-anchored E2 — the strongest() rewrite + the SITE 1-9 rewrites + the oracle acceptance).
- **C-3C — THE GU SHORT-SIDE ADM GEOMETRY** (the GU Tue/Thu/Fri BS/WL SHORT days emit NOTHING — the GU supply geometry fails the ADM RRR gate — the SL-depth refinement for the GU's zones, the same measured-SL class the EU's Monday needed).
- **C-3D — THE DEDUP + THE FILL SIM** (trade-dedup.ts — the day-keyed identity `pair|direction|anchorBucket|day` — merges the same-day duplicates only; fill-sim.ts over the full-week emissions).
- **C-4 — THE VERIFICATION BATTERY** (tsc the FULL project · the golden gate 5/5 · the full-week oracle ≥ 90% · the wave audit at both paths · the canon docs · the checkpoint).
- **THE DXY→EU INVERSION** (the future wave — the operator's boolean-flip cascade leg — the EU's brain injects the DXY's shape chain with the direction inverted — rides the SAME injection principle, zone-anchored, NEVER degenerate).

**THE FIRST ACTION (the next session):** state the 5-line proof — (1) THE MISSION (the zone-anchored E2 — the C-3B fix — the structural MPSE ranking leads, the price position dies), (2) THE STATE (the Monday gold locked · the E2-authoritative path landed · the GU chain = the EU's · the 8 losses = the price-anchored selection · the 11-site audit in THIS spec), (3) THE ANCHORS (ANALYSIS_POINT 1783317600000 · the frozen pair · the C-3 checkpoint · the oracle file), (4) THE ROOT CONCEPT (E1 computes the zones — the MPSE outputs ARE the anchors — E2 PINS the zones structurally — E3 computes the prices — NOTHING price-anchored EVER), (5) THE FIRST WAVE (the strongest() rewrite + the golden-gate 5/5 unchanged + the oracle acceptance) — THEN execute.

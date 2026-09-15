# PLUTUS v4.5.2 — THE ZR-7 OVERHAUL SPEC (the E1/E2 pressure-mechanics restoration)
## THE OPERATOR'S DIRECTIVE (2026-08-04): RIP OUT THE DEGENERACY — NO FABRICATED DATA, NO PRESSURE-BLIND E2, NO FROZEN DAY BAND, NO DEGENERATE CHAIN. ENGINEER IT CORRECTLY.

**Status: THE BUILD AUTHORITY for the ZR-7 overhaul.** This spec supersedes the ZR-6 wave plan for everything E1/E2-side. The ZR-6 waves fixed the E3-side (the E2/E3 boundary, the checks, the floor, the fill) — the ZR-7 fixes the E1/E2 FOUNDATION.

**The operator's verbatim laws (QUOTED — doctrine is quoted, never synthesized, D13):**
- "pressure mechanics are the fundamental reality everything is built on top of."
- "E1 + E2 done properly → E3 is a natural result... 90% of the work is in E1 + E2."
- "E2 generates SHAPE CHAIN from ZONE ANCHORS (prices are not even a variable for E2)."
- "Engine 2 consumes the COMPLETE Engine 1 output. Every field matters." (Bible 4.0 §4.18)
- "NO FABRICATED DATA ANYWHERE. GET THE CORRECT FUCKING DATA OR THROW ERROR. BLACK AND WHITE, NO MIDDLE GROUND, NO FALLBACK FABRICATED BULLSHIT." (the operator, 2026-08-04)
- "the market moves based on liquidity. S/D just provide the direction firepower... The LIQUIDITY is what actually FUELS the price action. Liquidity is the BLOOD of the entire market."
- "recency bias is a real thing. BUT it is NOT the LAW. Older zones are still valid if E1 pressure mechanics obviously has an E2 pathway through/toward them."
- "friday spot is only relevant to MONDAY E2 SHAPE prediction after that it is completely irrelevant."
- "E2 must forward map the predicted spot price of that day at london session open."
- "TP OF ONE = ENTRY OF NEXT." (Law 27)
- "Doctrine is QUOTED, never synthesized... Anything that can't be quoted, doesn't get built." (D13)

---

# PART 0 — THE DERAILEMENT INVENTORY (what the ZR-7 rips out — each verified, each with the file:line anchor)

## 0.1 THE E1 DERAILEMENTS (from the 2026-08-04 full audit)

**DERAILMENT-1 — THE E2 PRESSURE-BLINDNESS (the ROOT — never authorized):**
- The ENTIRE pressure state (the lifecycle, the absorption, the liquidity links, the operative defense) reduces to the zfp scalar at the E2 boundary.
- Evidence: shape-brain.ts has 40 `.zfp` reads + 0 `.pressure` reads; the day designation sorts by `(a.zfp - b.zfp)` (shape-brain.ts:1320/1382/1503); the toDxyZone boundary (report-v452.ts:582-628) drops the pressure fields.
- The Bible violation: "Engine 2 consumes the COMPLETE Engine 1 output. Every field matters" (Bible 4.0 §4.18) — the mitigation levels, the reaction counts, the fortress states, the absorption are listed as E2 inputs and are NOT delivered.
- The consequence: the fortress phase transition, the fuel-absorption switch (the trade #4), the liquidity links never influence which zone gets designated for which day.

**DERAILMENT-2 — THE 9-PILLAR PROXY FABRICATION (ABSOLUTELY FORBIDDEN — the operator's strongest terms):**
- P3 (the GBP options histogram), P4 (the analyst HP-trend proxy), P7 (the zone-clustering arena) emit INVENTED levels + scores when the real data is absent — inflating the composite confluence → the IP-zone ZFP + the E2's transition landscape are polluted.
- Evidence: 9-pillar-lobe.ts:1482-1503 (the P3-Gamma histogram), :1597-1627 (the HP-trend analyst proxy), :2005-2069 (the P7 zone-clustering arena).
- The operator's law: "GET THE CORRECT FUCKING DATA OR THROW ERROR. BLACK AND WHITE, NO MIDDLE GROUND, NO FALLBACK FABRICATED BULLSHIT."
- The fix: the honest-absence law — when a pillar's real data is absent, the pillar contributes NOTHING (the dimension scores 0, the level list is empty, the pillar logs `PILLAR_X_NO_DATA`) — NEVER a proxy level, NEVER an invented score.

**DERAILMENT-3 — THE BoM QUALITY GATES IN ONLY 1 OF 3 LANES:**
- The bw≥3.0/bf≥0.65 gates exist ONLY in the OBCV lane (obcv.ts:381). The 4H canon (4h-sd-lobe.ts:388-414 — classifyOrderBlock = the prior-move distance only) + the MDVE native (bom-mom.ts:124-139 — the sweep/leg anatomy only) classify the BoM without the body-to-wick or the body-fraction.
- The Bible violation: "Body-to-wick ratio ≥ 3.0 for BoM classification... Origin body ratio ≥ 0.65" (Bible 4.0 §4.7) — the ZERO TOLERANCE section.
- The fix: the gates applied in ALL THREE lanes.

**DERAILMENT-4 — THE OBCV 0-BoM GAP:**
- The OBCV machine's direct output emitted 0 BoM on the golden week — the golden BoM reconstruction passes only via the canon/native lanes.
- Evidence: "BoM quality (0 BoM zones, first 5): (none)" — the recorded diag.
- The Bible violation: Bible 4.5 §16.6 — the acceptance requires the 1H BoM 100.68-100.73 + the 4H BoM 101.235-band "reconstructed from data alone" — the machine alone cannot.
- The fix: the OBCV's displacement/feature/prior-move tuning so the machine emits its BoMs — or the honest documented gap.

**DERAILMENT-5 — THE IP ZONES: NO PRESSURE + THE 'MoM' MISLABEL:**
- The IP zones carry NO pressure state + are hardcoded `classification: 'MoM'` (report-v452.ts:248) + `freshness: 'FRESH'` + `reactionEvents: []`; the pressure stamp runs BEFORE the IP merge (index.ts:303 vs report-v452.ts:369).
- The fix: the IP zones classified as the confluence levels (NEVER 'MoM'), carrying the pressure state (the 6D-derived ZFP only — no lifecycle — the honest absence), merged BEFORE the pressure stamp.

**DERAILMENT-6 — THE DEFAULT_ZFP=50 RESIDUE:**
- trading-constants.ts:917 (`DEFAULT_ZFP: 50`) + the live fallback at lqz-lobe.ts:526 (`match.zfp ?? CONSOLIDATION.DEFAULT_ZFP`).
- The fix: KILLED — the honest computation or the zone dropped.

**DERAILMENT-7 — THE DIAG/REPORT DIVERGENCE:**
- The gate diags measure a DIFFERENT E1 than the report ships: the diag's plain models (options undefined, no pillar merge) vs the report's IP-pillar-enriched model — the designations disagree (the EU Tue 1.14307 vs 1.14650).
- The fix: the gates measure the SHIPPED pipeline — the diags run the report's exact build (the IP merge included).

**DERAILMENT-8 — THE LQZ×IP MERGE STRUCTURALLY UNREACHABLE:**
- The merge's home (lqz-lobe.ts:526) runs inside the ladder build with an EMPTY pillarResult (index.ts:232-243); the IP zones merge only afterward (report-v452.ts:356-369).
- The fix: the merge wired with the real pillar data.

## 0.2 THE E2 DERAILEMENTS (from the live pipeline output — the orchestrator's verification)

**DERAILMENT-9 — THE DESIGNATIONS REUSE ACROSS DAYS (the chain progression ABSENT):**
- The EU Mon/Tue: the SAME supply 1.14307 + demand 1.13911 + deep 1.13815; the EU Wed: the SAME demand 1.13911; the EU Thu/Fri: the SAME supply 1.14469; the GU Mon/Tue: IDENTICAL; the GU Thu: the SAME 1.33878.
- The operator's zones progress through the chain (the EU #2's E 1.14110 = the #1's TP; the #3's E 1.14460 = the #2's TP; the #4's E 1.14020 = the #3's TP...) — the machine's E2 reuses the strongest zone.
- The fix: the chain-driven designation.

**DERAILMENT-10 — THE DAY BAND IS FROZEN (the same dayOpenSpot for all 5 days):**
- EU open:1.14147 ×5 · GU open:1.33968 ×5 — the "forward map the predicted spot price of that day at london session open" never happens.
- The fix: the per-day forward-projected reference.

**DERAILMENT-11 — THE SHAPE CHAIN IS DEGENERATE (stuck in the BS phase):**
- EU: SS→PBS→PBS→PBS→WL (3 consecutive PBS); GU: PBS→PBS→PBS→PBS→SS (4 consecutive!) vs the operator's EU: SS→BS→R/WL/RWL→WL→RWL.
- The fix: the reaction-count-conditioned transitions + the shape diversity.

---

# PART 1 — THE CORRECTED ARCHITECTURE (what the ZR-7 engineers)

## 1.1 THE E1 → E2 → E3 CHAIN (the operator's linear architecture — non-negotiable)

```
E1 (the pressure mechanics — the ZONE MAP):
  The S/D zones (the singular-candle OBs, BoM/MoM with the bw≥3.0/bf≥0.65 gates in ALL lanes)
  + the LQZ rungs (the LMV matrices — the reactionExtreme/defendedEdge)
  + the liquidity links (NESTED/SHIELD)
  + the FULL PRESSURE STATE per zone (the lifecycle, the absorption, the reaction counts, the operative defense)
  + the IP pillars (REAL data only — the honest zero, NEVER the fabricated proxies)
  THE OUTPUT: the ONE zone map — every zone carries its pressure state + the liquidity relations.

E2 (the shape chain + the day decomposition — the STORYLINE):
  CONSUMES the COMPLETE E1 output (Bible 4.0 §4.18 — every field matters):
  the pressure states (the lifecycle/absorption/reaction counts/operative defense)
  + the liquidity relations + the zone classes + the ZFP
  + the prior-week storyline (the pre-flight)
  + the CHAIN PROGRESSION (the TP of N = the entry of N+1 — the day's projected zone follows the chain)
  + the DAY-LOCAL formation preference (the recency as the factor — never the law)
  + the per-day forward-projected reference (the dayOpenSpot progresses through the week)
  THE OUTPUT: the per-day designations (the zone anchors — NEVER the prices) + the shape progression
  (SS→BS→R→WL→RWL — the reaction-count-conditioned, never the stuck-PBS).

E3 (the classification + precision alignment):
  The E/SL/TP from the E2-designated zones per the operator's verbatim mechanics
  (the internal LQZ near edge, the relevant-zone edge rule, the strength-driven TP edge)
  + the refinement (the per-anchor 3-attempt — the checks deleted in ZR-6C stay deleted)
  + the cascade (DXY→EU inverse→GU kept) + the chaining (Law 27) + the fill model.
```

## 1.2 THE PRESSURE-CONSUMPTION CONTRACT (the E1→E2 boundary — the ROOT fix)

The E2 MUST consume the COMPLETE E1 output. The `toDxyZone` boundary (report-v452.ts:582-628) is REWRITTEN to carry:
```
interface E2ZoneInput {
  id: string;                       // the zone id (the anchor)
  type: 'SUPPLY' | 'DEMAND';        // the side
  floor: number; ceiling: number;   // the band
  classification: 'BoM' | 'MoM' | 'CONFLUENCE';  // the IP zones = CONFLUENCE, NEVER 'MoM'
  zfp: number;                      // the canon ladder / the 6D step
  pressure?: {                      // the FULL pressure state (the E2 consumes it)
    lifecycle: 'VIRGIN' | 'ACTIVE_1' | 'ACTIVE_2' | 'DEPLETED' | 'FORTRESS' | 'BROKEN';
    mitigationCount: number;
    pierced: boolean;
    absorption: 'INTACT' | 'ABSORBED';
    liquidity: Array<{ kind: 'NESTED' | 'SHIELD'; zoneId: string; eaten: boolean; eatenAtMs?: number; defendedAtMs?: number }>;
    operativeDefense?: { zoneId: string; kind: 'SHIELD_FUEL' | 'PRESSURE_STRUCTURE' };
  };
  formationMs?: number;             // the day-local window check
  reactionEvents?: Array<{ lastTouchMs: number; dir: 'enter' | 're-act' | 'leave' }>;
}
```
The E2's designation + transition logic reads THE PRESSURE STATE — the zfp is ONE input among many.

## 1.3 THE HONEST-DATA LAW (the operator's strongest terms — code-enforced)

- NO fabricated levels ANYWHERE. When a pillar's real data is absent → the pillar contributes NOTHING (the dimension scores 0, the level list is empty, the pillar logs `PILLAR_X_NO_DATA`).
- The honest-absence pattern: `{ levels: [], score: 0, source: 'NO_DATA' }` — NEVER a histogram, NEVER an HP-trend proxy, NEVER a zone-clustering arena.
- A thrown error beats a fabricated level. The firewall (the anti-fabrication layer) BLOCKS any zone whose provenance chain includes a proxy.

---

# PART 2 — THE ZR-7 WAVES (execute in order, gate per wave, checkpoint per wave)

## WAVE ZR-7A — THE HONEST-DATA PURGE (the 9-pillar proxies → the honest zero)

**THE FILES:** src/brains/9-pillar-lobe.ts + report-v452.ts.

**THE CHANGES:**
1. P3 (the component-pair options — 9-pillar-lobe.ts:1482-1503): the Gamma histogram DELETED. When the pair has no options walls → `{ levels: [], score: 0, source: 'NO_DATA' }`. The dimension scores 0. NEVER the histogram.
2. P4 (the analyst commentary — 9-pillar-lobe.ts:1597-1627): the HP-trend proxy DELETED. When the analyst data is absent → `{ levels: [], score: 0, source: 'NO_DATA' }`. NEVER the proxy.
3. P7 (the derivatives arena — 9-pillar-lobe.ts:2005-2069): the zone-clustering histogram DELETED. When the CME/ICE data is absent → `{ levels: [], score: 0, source: 'NO_DATA' }` (the Bible 4.0 §4.9: blocked sources → "contributes nothing... degrades gracefully").
4. P9 (the regime): when the dxyRegime is absent → the dimension scores 0 + the RegimeMA level is NOT emitted (the honest zero — currently it scores 0 but still emits the level).
5. The report's pillar wiring (report-v452.ts:356-367): the input contract expanded — the pillarEngine receives ONLY the real data it has (the bars, the spot, the options walls, the component spots). Absent inputs = absent contributions.
6. THE FIREWALL: the anti-fabrication layer blocks any zone whose provenance chain includes a proxy (the provenance = the pillar's source tag; `PILLAR_*_NO_DATA` zones are never emitted).

**THE GATE (diag-honest-data.ts — NEW):**
- The GBP options dimension scores 0 when no walls exist (the histogram GONE).
- The analyst dimension scores 0 when no commentary exists (the proxy GONE).
- The derivatives dimension scores 0 (the arena GONE).
- The ZERO fabricated levels in the zone map (grep-verified: no histogram/HP/arena-derived zones).
- The golden 10/21 held · determinism ×2 · the frozen pair byte-identical.

**THE CHECKPOINT:** `Checkpoints/v4.5.2_ZR7_A/`.

## WAVE ZR-7B — THE E1 PRESSURE-STATE COMPLETION (the BoM gates + the IP zones + the DEFAULT_ZFP + the LQZ×IP merge)

**THE FILES:** src/brains/4h-sd-lobe.ts + src/mdve/bom-mom.ts + report-v452.ts + src/mdve/lqz-lobe.ts + src/constants/trading-constants.ts + src/mdve/index.ts.

**THE CHANGES:**
1. THE BoM GATES TO ALL LANES (DERAILMENT-3):
   - 4h-sd-lobe.ts:388-414 (classifyOrderBlock): ADD the bw≥3.0 + the bf≥0.65 gates to the BoM classification.
   - bom-mom.ts:124-139 (classifyBoMMoM): ADD the gates to the BoM branch.
   - obcv.ts:381: the gates already there (the reference).
2. THE IP ZONES (DERAILMENT-5):
   - report-v452.ts:248: `classification: 'MoM'` → `classification: 'CONFLUENCE'` (the IP levels are neither BoM nor MoM).
   - The IP zones carry the pressure state: `pressure: { lifecycle: 'CONFLUENCE', mitigationCount: 0, pierced: false, absorption: 'INTACT', liquidity: [] }` — the honest minimal state (they are confluence levels, not S/D structures).
   - The merge order: the IP zones merged BEFORE the pressure stamp (report-v452.ts:369 BEFORE index.ts:303) — OR the stamp extended to the merged map.
3. THE DEFAULT_ZFP KILL (DERAILMENT-6):
   - trading-constants.ts:917 (`DEFAULT_ZFP: 50`): DELETED (or the honest default per the canon).
   - lqz-lobe.ts:526: `match.zfp ?? CONSOLIDATION.DEFAULT_ZFP` → the honest zfp from the LQZ ladder or the zone dropped.
4. THE LQZ×IP MERGE WIRING (DERAILMENT-8):
   - index.ts:232-243: the ladder build receives the REAL pillar result (the pillarEngine runs BEFORE the ladder) — the LQZ×IP merge fires with the real confluence (the canon promotion: confluence +2, zfp −5).

**THE GATE (the existing diags + the NEW probes):**
- The diag-obcv-golden + the diag-lmv-golden + the diag-telescoping PASS (the zone map unchanged at the levels).
- The new BoM gates: the golden BoM reconstruction holds (the 1H BoM 100.68-100.73 + the 4H BoM 101.235-band).
- The IP zones: `classification: 'CONFLUENCE'` + the pressure state present (grep-verified).
- DEFAULT_ZFP: ZERO live references (grep-verified).
- The LQZ×IP merge: the canon promotion fires (the probe).
- The golden 10/21 held · determinism ×2 · the frozen pair byte-identical.

**THE CHECKPOINT:** `Checkpoints/v4.5.2_ZR7_B/`.

## WAVE ZR-7C — THE E2 PRESSURE-CONSUMPTION (the ROOT fix — the E2 reads the COMPLETE E1 output)

**THE FILES:** src/brains/shape-brain.ts + report-v452.ts (the toDxyZone boundary) + src/mdve/zone-pressure.ts (read-only reference).

**THE CHANGES:**
1. THE E2 INPUT CONTRACT (report-v452.ts:582-628 — the toDxyZone boundary):
   - The boundary carries the FULL pressure state (the E2ZoneInput contract from Part 1.2): the lifecycle, the absorption, the liquidity links, the formationMs, the reactionEvents.
2. THE DESIGNATION REWRITE (projectZoneForDay — shape-brain.ts:1101):
   - The zfp-first strongest() (shape-brain.ts:1318-1320) REPLACED by the pressure-aware + chain-driven + day-local selection:
     a. THE CHAIN PROGRESSION (the primary): the day's projected zone = the zone at the prior day's projected TP level (the operator's "Set E at the TP level of trade #1") — the E2's day decomposition carries the chain (the prior day's projected TP zone anchor).
     b. THE PRESSURE-STATE read (the operator's E1 reading protocol — the macro context Part 22): the contested zone's lifecycle (the VIRGIN/ACTIVE = the fresh defense, the DEPLETED = the fail, the FORTRESS = the flip), the absorption (the INTACT fuel vs the ABSORBED), the liquidity links (the SHIELD in front — the "final liquidity sweep before the piercing move"), the operative defense (computeOperativeDefense).
     c. THE DAY-LOCAL preference (the recency as the factor — never the law): the zones formed on/near the trade day preferred WHEN the chain + the pressure align.
     d. The zfp remains ONE input among the many — NEVER the sole sort key.
3. THE DAY-BAND FORWARD PROJECTION (DERAILMENT-10):
   - The dayOpenSpot PROGRESSES through the week: the day N's predicted London-open reference = the E2's forward projection from the chain (the prior day's projected close/move) — the operator's "forward map the predicted spot price of that day at london session open".
   - The Friday spot is the MONDAY-E2-ONLY reference (the operator's law).
4. THE SHAPE-CHAIN PROGRESSION (DERAILMENT-11):
   - The transition logic consumes the reaction-count-conditioned rules (the ZR-2 storyline's rules — "zones usually fail on the THIRD mitigation", "4+ strong → fortress/RWL") + the pressure states — the stuck-PBS degeneration replaced by the operator's progression (SS→BS→R→WL→RWL with the per-day shapes).

**THE GATE (the E2-CORE probe — the NEW diag):**
- The per-day designations PROGRESS: the EU Mon → Tue → Wed → Thu → Fri designations differ (no reuse), following the chain + the pressure + the day-local.
- The dayOpenSpot progresses: the EU open differs per day (no freeze).
- The shape chain: the EU SS→BS→R/WL/RWL→WL→RWL (no stuck-PBS); the GU WL→BS→WL/RWL→R/RWL→RWL.
- The EU Tue designation lands at the operator's #3 zone (~1.14460 — computed from the chain + the pressure, never hardcoded).
- The golden 10/21 held or climbed · determinism ×2 · the frozen pair byte-identical.

**THE CHECKPOINT:** `Checkpoints/v4.5.2_ZR7_C/`.

## WAVE ZR-7D — THE E1 PRECISION (the FX-lane zones at the operator's levels)

**THE FILES:** src/mdve/lmv.ts + src/mdve/lqz-matrix.ts + src/mdve/obcv.ts.

**THE CHANGES:**
1. The OBCV BoM tuning (DERAILMENT-4): the displacement thresholds + the feature gates tuned so the machine emits its BoMs on the golden week (the 1H BoM 100.68-100.73 + the 4H BoM 101.235-band) — the 96% lever.
2. The EU/GU golden-level oracle (the NEW diag-lmv-golden-fx.ts): the operator's EU/GU zones as the reconstruction targets (the EU LQZ [1.1444-1.14395], the EU supply [1.14460-1.14530], the EU demand [1.14149-1.14000] with the nested LQZ [1.14110-1.14020], the EU MoM supply [1.14295-1.14220], the EU deep demand [1.13935-1.13875], the GU zones from the oracle) — computed from the data, never hardcoded.

**THE GATE:** the FX oracle measured (the reconstruction at the operator's levels, the deltas reported).

**THE CHECKPOINT:** `Checkpoints/v4.5.2_ZR7_D/`.

## WAVE ZR-7E — THE DIAG/REPORT CONSISTENCY (DERAILMENT-7)

**THE FILES:** diag-golden-coverage.ts + the gate diags.

**THE CHANGES:**
1. The diags build the SHIPPED pipeline: the diag-golden-coverage's buildAll includes the IP merge + the pillar wiring (the report's exact build) — the designations must agree between the diag and the report.
2. The diag/report divergence check (the NEW assertion): the diag's designations == the report's designations (the EU Tue 1.14307 — one truth).

**THE GATE:** the diag/report agreement verified.

**THE CHECKPOINT:** `Checkpoints/v4.5.2_ZR7_E/`.

## WAVE ZR-7F — THE CASCADE PRECISION (the full golden mapping — the final wave)

**THE FILES:** src/mdve/mirror.ts + src/mdve/trade-chaining.ts + src/mdve/setup-gen.ts.

**THE CHANGES:**
1. The mirrors' anchors land at the operator's levels: the E2's corrected designations (ZR-7C) feed the mirror construction — the EU/GU mirrors at the operator's zones.
2. The chained trades at the operator's chain levels: the chained entries = the operator's TPs (the machine's TPs now at the operator's zone edges).
3. The GU lane: the long-side + the Fri at the operator's levels.

**THE FINAL GATE:**
- The golden measurement ≥ 15/21 (toward 15/15) — the EU 8 + the GU 7 at the operator's levels at ≤3p.
- The DXY 6/6 held + the DXY lane all-winning.
- Determinism ×2 · the frozen pair byte-identical · all 16 gates green · the self-validation passes.

**THE CHECKPOINT:** `Checkpoints/v4.5.2_ZR7_FINAL/`.

---

# PART 3 — THE ANTI-PATTERNS (the do-nots — the operator's laws code-enforced)

1. **NO FABRICATED DATA — EVER.** The proxies (the histogram, the HP-trend, the zone-clustering) are DELETED. The honest zero or the thrown error — BLACK AND WHITE.
2. **NO E2 PRESSURE-BLINDNESS.** The E2 consumes the COMPLETE E1 output — the lifecycle, the absorption, the liquidity links, the operative defense — every field matters (Bible 4.0 §4.18).
3. **NO FROZEN DAY BAND.** The dayOpenSpot forward-projects per day — the Friday spot is the Monday-E2-ONLY reference.
4. **NO DESIGNATION REUSE.** The per-day designations follow the chain (the TP of N = the entry of N+1) + the day-local preference.
5. **NO DEGENERATE CHAIN.** The shape progression is the reaction-count-conditioned + the pressure-state-driven — never the stuck-PBS.
6. **NO 'MoM' MISLABEL.** The IP zones = the confluence levels — the classification 'CONFLUENCE'.
7. **NO DEFAULT_ZFP=50.** The honest zfp or the zone dropped.
8. **NO DIAG/REPORT DIVERGENCE.** The gates measure the shipped pipeline.
9. **NO zfp-FIRST.** The zfp is ONE input among the pressure-state inputs — never the sole sort key.
10. **NO HARDCODED LEVELS.** The operator's levels are the MEASUREMENT oracle — never the computation input ("a constant tuned to land near a test oracle = FITTED-TO-GOLDEN = a derailment").
11. **NO FROZEN-PAIR TOUCH.** sl-lmv.ts (91294083) + trade-dedup.ts (33914c89) — byte-identical, never touched.
12. **NO FIB.** The Air element (E4) — deferred until the foundations are bulletproof.

---

# PART 4 — THE VERIFICATION BATTERY (after EVERY change — the orchestrator's own runs)

```bash
npx tsc --noEmit                                          # exit 0
bun build src/index.ts --outdir dist --target bun         # exit 0
bun report-v452.ts                                        # the report
sha256sum report_v452.md                                  # ×2 identical (the NEW baseline)
bun diag-golden-coverage.ts                               # the 3-pip count vs the operator's REAL trades
# the gate diags (all exit 0):
bun diag-telescoping.ts && bun diag-lmv-golden.ts && bun diag-obcv-golden.ts \
  && bun diag-e2-forward.ts && bun diag-structural-tp.ts && bun diag-3d-refinement.ts \
  && bun diag-review-stage.ts && bun diag-hallucination.ts && bun diag-e2-cascade.ts \
  && bun diag-e1-reintegrated.ts && bun diag-zone-relevance.ts && bun diag-storyline.ts \
  && bun diag-e3-conditional.ts && bun diag-cascade-propagation.ts && bun diag-self-validation.ts
# the NEW gates (per wave):
bun diag-honest-data.ts         # ZR-7A — the proxy purge
bun diag-e2-pressure.ts         # ZR-7C — the E2 pressure consumption + the chain progression + the day-band progression
bun diag-lmv-golden-fx.ts       # ZR-7D — the EU/GU golden-level oracle
sha256sum src/mdve/sl-lmv.ts src/mdve/trade-dedup.ts     # the frozen pair byte-identical
```

---

# PART 5 — THE ACCEPTANCE CRITERIA (the operator's target)

1. **The honest-data law enforced:** ZERO fabricated levels in the zone map — the absent pillars contribute nothing (the `PILLAR_X_NO_DATA` tags).
2. **The E2 pressure-aware:** the E2's designation reads the lifecycle/absorption/liquidity links/operative defense — the zfp is one input among many.
3. **The chain-driven designations:** the per-day zones follow the chain (the TP of N = the entry of N+1) — no reuse.
4. **The day band progresses:** the per-day forward-projected references differ (the Friday spot = the Monday-E2-only).
5. **The shape progression:** the EU SS→BS→R/WL/RWL→WL→RWL + the GU WL→BS→WL/RWL→R/RWL→RWL — no stuck-PBS.
6. **The golden mapping:** the EU 8 + the GU 7 at the operator's levels at ≤3p (≥ 15/21 toward 15/15) + the DXY 6/6 held.
7. **The full E1 compliance:** the BoM gates in all lanes, the IP zones' honest classification + pressure, the DEFAULT_ZFP killed, the OBCV BoM gap closed, the LQZ×IP merge live.
8. **The diag/report consistency:** the gates measure the shipped pipeline.
9. **The discipline:** determinism ×2 · the frozen pair byte-identical · the per-wave checkpoints with the MANIFEST + the report + the gate outputs + the DIFF REVIEWS · the ORCHESTRATOR PRINCIPLES (the diff review of EVERY changed line).

*END OF THE ZR-7 OVERHAUL SPEC — the operator's directive executed: the degeneracy ripped out (the proxies, the pressure-blind E2, the frozen day band, the reused designations, the degenerate chain, the BoM-gate gaps, the OBCV BoM gap, the IP mislabels, the DEFAULT_ZFP, the diag divergence, the unreachable merge) and engineered correctly — the E1 pressure mechanics feeding the E2 completely, the chain-driven + day-local + pressure-aware designations, the forward-projected day references, the honest data everywhere. Doctrine is QUOTED, never synthesized.*

---

# PART 6 — THE FUNCTION-LEVEL SPEC (per file, per function — the exact before/after)

## 6.1 src/brains/9-pillar-lobe.ts (2,371L — the honest-data purge)

### computeP3 (the component-pair options — currently the histogram proxy at :1482-1503)
**BEFORE:** when the pair has no options walls, the function emits a GAMMA-HISTOGRAM level — a fabricated "options-derived" zone + a score.
**AFTER:**
```
computeP3(input):
  if input.optionsData has NO walls for the pair:
    return { levels: [], score: 0, source: 'P3_NO_DATA', note: 'the component-pair options data is absent — the Options-Derived dimension scores 0 (the honest absence, NEVER a proxy)' }
  else:
    ... the REAL conversion (the DXY_equiv math — the K-factor × the strike^weight) ...
```
**THE CONTRACT:** `PillarResult = { levels: PriceLevel[], score: 0 | 1 | 2, source: 'P3_REAL' | 'P3_NO_DATA' }`. The score 0 for the absent data — the composite confluence NEVER inflated.

### computeP4 (the analyst commentary — currently the HP-trend proxy at :1597-1627)
**BEFORE:** when the analyst data is absent, the function emits an HP-TREND-FILTERED level from the price history — a fabricated "analyst" level.
**AFTER:**
```
computeP4(input):
  if input.analystConsensus is ABSENT (no commentary sources):
    return { levels: [], score: 0, source: 'P4_NO_DATA', note: 'the analyst commentary is absent — the Analyst dimension scores 0 (the honest absence)' }
  else:
    ... the REAL extraction (the Tier-1/Tier-2 source levels with the provenance URLs) ...
```
**THE CONTRACT:** the Analyst dimension scores 0 WITHOUT the commentary. The temporal boundary enforced (only the pre-Friday-close commentary valid).

### computeP7 (the derivatives arena — currently the zone-clustering arena at :2005-2069)
**BEFORE:** when the CME/ICE data is absent, the function emits a ZONE-CLUSTERING-HISTOGRAM level — a fabricated "derivatives" level.
**AFTER:**
```
computeP7(input):
  if input.derivativesData is ABSENT:
    return { levels: [], score: 0, source: 'P7_NO_DATA', note: 'the derivatives arena is blocked — contributes nothing (Bible 4.0 §4.9: degrades gracefully)' }
  else:
    ... the REAL OI-cluster extraction ...
```
**THE CONTRACT:** the P7 contributes NOTHING without the data — the Bible's own degraded-gracefully clause.

### computeP9 (the regime — currently the dead dimension + the live RegimeMA level at :2185-2186)
**BEFORE:** the dimension scores 0 when the dxyRegime is absent BUT the RegimeMA level is still emitted.
**AFTER:**
```
computeP9(input):
  if input.dxyRegime is ABSENT:
    return { levels: [], score: 0, source: 'P9_NO_DATA', note: 'the regime data is absent — the Regime dimension scores 0 + no RegimeMA level (the honest zero)' }
  else:
    ... the REAL regime classification + the ZFP modifiers ...
```

### THE PROVENANCE TAG (the firewall integration)
Every PriceLevel carries `provenance: { pillar: 'P1'..'P9', source: 'REAL' | 'NO_DATA', evidence: string }`. The firewall (the anti-fabrication layer) BLOCKS any zone whose provenance.source === 'NO_DATA' from the confluence scoring. The zone map contains ZERO fabricated levels.

## 6.2 src/brains/4h-sd-lobe.ts (the BoM gates — the ZERO TOLERANCE enforcement)

### classifyOrderBlock (currently :388-414 — the prior-move distance only)
**BEFORE:**
```
classifyOrderBlock(origin, priorMove):
  if priorMove in (NONE, OPPOSITE): return 'BoM'
  if priorMove == SAME: return 'MoM'
```
**AFTER:**
```
classifyOrderBlock(origin, priorMove):
  bodyToWick = body(origin) / max(wickTop(origin), wickBottom(origin))
  bodyFraction = body(origin) / (high(origin) - low(origin))
  if bodyToWick < 3.0 or bodyFraction < 0.65:
    return 'REJECT'            # the ZERO TOLERANCE — the zone is NOT a valid BoM
  if priorMove in (NONE, OPPOSITE): return 'BoM'
  if priorMove == SAME: return 'MoM'
```
**THE GATE:** the golden BoM reconstruction holds (the 1H BoM 100.68-100.73 + the 4H BoM 101.235-band) — the gates do not kill the golden zones.

## 6.3 src/mdve/bom-mom.ts (the BoM gates — the MDVE native lane)

### classifyBoMMoM (currently :124-139 — the sweep/leg anatomy only)
**BEFORE:** the BoM branch checks the sweep + the displacement — no body-to-wick, no body-fraction.
**AFTER:** the bw≥3.0 + the bf≥0.65 gates applied BEFORE the prior-move classification:
```
classifyBoMMoM(origin, priorMove, tf):
  if tf in ('30m', '15m'): return 'MoM'          # the telescoping law — the 30m NEVER a BoM origin
  bodyToWick = ... ; bodyFraction = ...
  if bodyToWick < 3.0 or bodyFraction < 0.65: return 'REJECT'
  ... the prior-move classification (BoM/MoM) ...
```

## 6.4 src/mdve/lqz-lobe.ts + src/constants/trading-constants.ts (the DEFAULT_ZFP kill)

### lqz-lobe.ts:526 (the LQZ×IP merge fallback)
**BEFORE:** `match.zfp = Math.max(0, (match.zfp ?? CONSOLIDATION.DEFAULT_ZFP) − 5)` — the DEFAULT_ZFP=50 placeholder.
**AFTER:** `match.zfp = Math.max(0, match.zfp − 5)` — the LQZ's canon zfp (min(60, 20 + floor((touches−3)/2)·5)) or the zone skipped when the zfp is undefined.

### trading-constants.ts:917 (`DEFAULT_ZFP: 50`)
**AFTER:** DELETED — the constant + its live references purged (grep-verified zero).

## 6.5 report-v452.ts (the IP zones + the boundary + the merge order)

### The IP zone construction (currently :242-254)
**BEFORE:**
```
classification: 'MoM',
freshness: 'FRESH',
reactionEvents: [],
// NO pressure field
```
**AFTER:**
```
classification: 'CONFLUENCE',      // the IP levels are confluence-scored — NEVER 'MoM'
freshness: 'FRESH',
reactionEvents: [],
pressure: { lifecycle: 'CONFLUENCE', mitigationCount: 0, pierced: false, absorption: 'INTACT', liquidity: [] },
// the honest minimal pressure state — the confluence levels are not S/D structures
```

### The merge order (currently :369 AFTER the stamp at index.ts:303)
**AFTER:** the IP zones merged BEFORE the pressure stamp — OR the stamp extended to the merged map:
```
buildChartModel(...):
  ... the S/D/L zones ...
  const ipZones = buildIpZones(...)            # the pillarEngine result (the honest data)
  const merged = [...sdZones, ...lqzZones, ...ipZones]
  stampZonePressureStates(merged, bars)        # the stamp over the COMPLETE map
  return { zones: merged, ... }
```

### The toDxyZone boundary (currently :582-628 — the pressure dropped)
**AFTER:** the boundary carries the FULL pressure state per the E2ZoneInput contract (Part 1.2) — the lifecycle, the absorption, the liquidity links, the operative defense, the formationMs, the reactionEvents.

## 6.6 src/brains/shape-brain.ts (the E2 — the ROOT fix)

### projectZoneForDay (currently :1101 — the zfp-first strongest() at :1318-1320)
**BEFORE:**
```
const strongest = (cands, reach) => [...cands].sort((a, b) => (a.zfp - b.zfp) || ...reach...)[0];
supplyPick = strongest(supplyCands, supplyReachRef);
demandPick = strongest(demandCands, demandReachRef);
```
**AFTER — the pressure-aware + chain-driven + day-local designation:**
```
designateDay(pair, day, chain, zoneMap, priorDay):
  # 1. THE CHAIN PROGRESSION (the primary — the operator's "Set E at the TP level of trade #1"):
  chainAnchorZoneId = priorDay?.projectedTpZoneId     # the zone at the prior day's projected TP
  chainCands = cands.filter(c => c.id === chainAnchorZoneId || distance(c.center, priorDay.projectedTp) <= CHAIN_TOLERANCE_PIPS)
  # 2. THE PRESSURE-STATE read (the operator's E1 reading protocol — Part 22 of the macro context):
  pressureRanked = [...cands].sort((a, b) => pressureScore(b) - pressureScore(a))
  pressureScore(z) =
      +40 if z.pressure.lifecycle == 'VIRGIN' and z.classification == 'BoM'   # the UM BoM — the 100% reaction
      +30 if z.pressure.lifecycle == 'ACTIVE_1'                              # the fresh defense
      +20 if z.pressure.lifecycle == 'FORTRESS'                              # the phase transition — the 95% flip
      +15 if z.pressure.absorption == 'INTACT'                               # the fuel not eaten
      +10 if z.pressure.operativeDefense?.kind == 'SHIELD_FUEL'              # the shield in front
      +10 if z.pressure.liquidity.some(l => l.kind == 'SHIELD' && !l.eaten)  # the shield alive
      -30 if z.pressure.lifecycle == 'DEPLETED'                              # the 3rd-mitigation fail
      -20 if z.pressure.lifecycle == 'BROKEN'                                # the terminal — the role reversal
      -15 if z.pressure.absorption == 'ABSORBED'                             # the fuel eaten
  # 3. THE DAY-LOCAL preference (the recency as the factor — never the law):
  dayLocalBonus = +10 if z.formationMs within [dayStart - 24h, dayEnd)       # formed on/near the trade day
  # 4. THE zfp remains ONE input (never the sole sort key):
  zfpScore = clamp(60 - z.zfp, 0, 40)                                       # the lower zfp = stronger
  # THE COMBINED SCORE:
  score(z) = (chainCands.includes(z) ? 100 : 0)      # the chain is the PRIMARY — the pathway
           + pressureScore(z) + dayLocalBonus + zfpScore + reachProximity(z)
  pick = argmax(score)
```
**THE GATE (diag-e2-pressure.ts — NEW):**
- The EU Tue designation lands at the operator's #3 zone (~1.14460 — the chain: the Mon LONG's TP) — computed, never hardcoded.
- The designations PROGRESS across the days (no reuse).
- The pressure states influence the picks (the probe: a DEPLETED zone loses to a VIRGIN zone at the same level).

### The DayBand forward projection (the dayOpenSpot freeze — DERAILMENT-10)
**BEFORE:** `dayOpenSpot = 1.14147` for ALL 5 days (the frozen reference).
**AFTER — the per-day forward-projected reference:**
```
projectDayReference(pair, day, chain, priorDay):
  if day == 'Monday':
    return weekOpenReference           # the Friday spot is the Monday-E2-ONLY reference (the operator's law)
  else:
    # the E2's forward projection from the chain: the prior day's projected close = the prior day's
    # dayOpenSpot + the prior day's shape travel (the shape's expected move, the chain's projection)
    return priorDay.dayOpenSpot + priorDay.shape.travelDirection * priorDay.shape.travelPips
```
**THE GATE:** the dayOpenSpot progresses (the EU open differs per day — the diag assertion).

### buildShapeChain (the degenerate PBS — DERAILMENT-11)
**BEFORE:** the ZFP-conditioned transitions produce the repeated PBS (the EU: SS→PBS→PBS→PBS→WL; the GU: PBS×4→SS).
**AFTER — the reaction-count-conditioned + the pressure-state-driven transitions:**
```
transition(currentShape, targetZone, chain):
  # the operator's rules (the macro context Part 2.3 + the ZR-2 storyline):
  if targetZone.pressure.lifecycle == 'DEPLETED' or targetZone.pressure.mitigationCount >= 3:
    nextShape = 'BS' + (the pierce follows — "zones usually fail on the THIRD mitigation")
  if targetZone.pressure.lifecycle == 'FORTRESS':
    nextShape = 'RWL'                    # the 95% direction flip
  if currentShape == 'BS' and targetZone.pressure.lifecycle in ('VIRGIN', 'ACTIVE_1'):
    nextShape = 'R' or 'WL'              # the recovery or the whiplash — NOT the continued PBS
  if currentShape == 'R' and the recovery reaches the opposing zone:
    nextShape = 'WL' or 'RWL'
  if currentShape == 'WL' and no opposite momentum:
    nextShape = 'SS'
  ... the ZFP-conditioned matrix remains as ONE input ...
```
**THE GATE:** the EU chain SS→BS→R/WL/RWL→WL→RWL + the GU WL→BS→WL/RWL→R/RWL→RWL (the shape diversity — no stuck-PBS).

---

# PART 7 — THE PSEUDOCODE (the corrected engines — the full logic before the build)

## 7.1 THE HONEST PILLAR (the pseudocode for the ZR-7A build)

```
function honestPillar(name, computeFn, hasData):
  # THE HONEST-DATA LAW — the operator's strongest terms:
  # "GET THE CORRECT FUCKING DATA OR THROW ERROR. BLACK AND WHITE,
  #  NO MIDDLE GROUND, NO FALLBACK FABRICATED BULLSHIT."
  if not hasData():
    log(`PILLAR_${name}_NO_DATA — the dimension scores 0 (the honest absence)`)
    return { levels: [], score: 0, source: `${name}_NO_DATA` }
  try:
    return computeFn()          # the REAL computation — the real data only
  catch e:
    log(`PILLAR_${name}_ERROR — ${e.message}`)
    throw e                     # a thrown error beats a fabricated level
```

## 7.2 THE PRESSURE-AWARE DESIGNATION (the pseudocode for the ZR-7C build)

```
function designateDayZone(day, chain, zoneMap, priorDayProjection):
  # THE CHAIN PROGRESSION — the PRIMARY (the operator's E2 pathway):
  chainAnchorId = priorDayProjection?.projectedTpZoneId
  chainAnchorLevel = priorDayProjection?.projectedTp
  chainCands = zoneMap.filter(z => z.id == chainAnchorId
                              || abs(z.center - chainAnchorLevel) <= 15 * pip)

  # THE PRESSURE-STATE read — the operator's E1 reading protocol:
  ranked = chainCands.length > 0 ? chainCands : zoneMap.filter(z => inDayReach(z, day))
  pick = argmax(ranked, z => pressureScore(z) + dayLocalBonus(z, day) + zfpScore(z) + reachScore(z))

  return { zoneId: pick.id, pressure: pick.pressure, dayLocal: dayLocalBonus(pick, day) > 0 }

function pressureScore(z):
  if z.pressure == null: return 0               # the honest absence (the pre-ZR-7B zones)
  s = 0
  s += 40 if z.pressure.lifecycle == 'VIRGIN' and z.classification == 'BoM'
  s += 30 if z.pressure.lifecycle == 'ACTIVE_1'
  s += 20 if z.pressure.lifecycle == 'FORTRESS'
  s += 15 if z.pressure.absorption == 'INTACT'
  s += 10 if z.pressure.operativeDefense?.kind == 'SHIELD_FUEL'
  s += 10 if z.pressure.liquidity?.some(l => l.kind == 'SHIELD' and not l.eaten)
  s -= 30 if z.pressure.lifecycle == 'DEPLETED'
  s -= 20 if z.pressure.lifecycle == 'BROKEN'
  s -= 15 if z.pressure.absorption == 'ABSORBED'
  return s
```

## 7.3 THE DAY-BAND FORWARD PROJECTION (the pseudocode for the ZR-7C build)

```
function projectDayOpenSpot(pair, day, chain, weekOpenRef):
  if day == MONDAY: return weekOpenRef        # the Friday spot — the Monday-E2-ONLY reference
  prior = chain.days[dayIndex - 1]
  # the E2's forward projection: the prior day's close = the prior day's open + the shape's travel
  travel = shapeTravelPips(prior.shape, prior.direction)      # the shape's expected move (the SHAPE_TRAVEL)
  return prior.dayOpenSpot + travel * directionSign(prior.direction)
```

---

# PART 8 — THE DATA CONTRACTS (the interfaces the build defines)

## 8.1 THE E2ZONEINPUT (the E1→E2 boundary — the ROOT contract)
```
interface E2ZoneInput {
  id: string;
  type: 'SUPPLY' | 'DEMAND';
  floor: number;
  ceiling: number;
  classification: 'BoM' | 'MoM' | 'CONFLUENCE';     // the IP zones = CONFLUENCE — NEVER 'MoM'
  zfp: number;
  pressure?: {
    lifecycle: 'VIRGIN' | 'ACTIVE_1' | 'ACTIVE_2' | 'DEPLETED' | 'FORTRESS' | 'BROKEN' | 'CONFLUENCE';
    mitigationCount: number;
    pierced: boolean;
    absorption: 'INTACT' | 'ABSORBED';
    liquidity: Array<{ kind: 'NESTED' | 'SHIELD'; zoneId: string; eaten: boolean; eatenAtMs?: number; defendedAtMs?: number }>;
    operativeDefense?: { zoneId: string; kind: 'SHIELD_FUEL' | 'PRESSURE_STRUCTURE' };
  };
  formationMs?: number;
  reactionEvents?: Array<{ lastTouchMs: number; dir: 'enter' | 're-act' | 'leave' }>;
}
```

## 8.2 THE PILLARRESULT (the honest pillar contract)
```
interface PillarResult {
  levels: PriceLevel[];               // EMPTY when the data is absent — NEVER a proxy
  score: 0 | 1 | 2;                   // 0 when the data is absent
  source: 'REAL' | `${'P1'..'P9'}_NO_DATA`;
  note?: string;                      // the honest-absence note
}
```

## 8.3 THE DAYPROJECTION (the E2's per-day forward projection)
```
interface DayProjection {
  day: string;
  dayOpenSpot: number;                // the forward-projected per-day reference — NEVER the frozen Monday open
  projectedTpZoneId?: string;         // the chain anchor — the zone at the prior day's projected TP
  projectedTp?: number;               // the chain level — the prior day's projected TP
  shape: ShapeCode;
  direction: 'LONG' | 'SHORT' | 'RANGE';
}
```

---

# PART 9 — THE FORENSIC DETAIL (the exact evidence trails per derailment — the build agents' context)

## 9.1 THE EU TUESDAY TRACE (the DERAILMENT-9 reproduction — the build's test case)
- The operator's Tue #3: E 1.14460 (the BoM supply's near edge — the CHAINED entry = the Mon LONG's TP 1.14460 — "Set E at the TP level of trade #1").
- The machine's E2 Tue designation: the strongest supply in the day's reach — 1.14650 (the diag's plain-model chain) / 1.14307 (the report's enriched chain). Δ19.6p.
- The mirror then OBEYS (E2 DESIGNATES, E3 OBEYS) → the anchor at the machine's designation → the entry at the machine's level.
- THE FIX TEST: after the ZR-7C, the E2's Tue designation = the chain's zone (~1.14460 — the Mon LONG's projected TP zone) — the mirror's entry lands at the operator's level (Δ≤3p).

## 9.2 THE DAY-BAND TRACE (the DERAILMENT-10 reproduction)
- The report log: "Monday:SS:SHORT:.../open:1.14147), Tuesday:PBS:SHORT:.../open:1.14147), Wednesday:.../open:1.14147), Thursday:.../open:1.14147), Friday:WL:SHORT:.../open:1.14147" — the SAME 1.14147 for all 5 days.
- THE FIX TEST: after the ZR-7C, the EU dayOpenSpot progresses (the diag assertion: the per-day opens differ).

## 9.3 THE CHAIN TRACE (the DERAILMENT-11 reproduction)
- The EU chain: SS→PBS→PBS→PBS→WL (the 3 consecutive PBS); the GU chain: PBS→PBS→PBS→PBS→SS (4 consecutive).
- THE FIX TEST: after the ZR-7C, the EU chain SS→BS→R/WL/RWL→WL→RWL + the GU WL→BS→WL/RWL→R/RWL→RWL.

## 9.4 THE PROXY TRACE (the DERAILMENT-2 reproduction)
- The GBP options dimension scores via the P3-Gamma histogram (9-pillar-lobe.ts:1482-1503) — a fabricated level from the price history.
- THE FIX TEST: after the ZR-7A, the GBP Options-Derived dimension scores 0 (the `P3_NO_DATA` tag) — the histogram GONE.

---

# PART 10 — THE TEST SPECS (the per-wave diag assertions — written BEFORE the code per TDD)

## 10.1 diag-honest-data.ts (ZR-7A — the proxy purge)
- T1: the GBP options dimension scores 0 (no walls → no histogram level).
- T2: the Analyst dimension scores 0 (no commentary → no HP proxy level).
- T3: the Derivatives dimension scores 0 (no arena level).
- T4: the Regime dimension scores 0 + NO RegimeMA level (the data absent).
- T5: ZERO fabricated levels in the zone map (grep the provenance tags — the NO_DATA zones never scored).
- T6: the golden 10/21 held · determinism ×2 · the frozen pair byte-identical.

## 10.2 diag-e2-pressure.ts (ZR-7C — the E2 pressure consumption)
- T1: the E2's designation consumes the pressure state (the probe: a DEPLETED zone loses to a VIRGIN zone at the same level).
- T2: the designations PROGRESS (the EU Mon/Tue/Wed/Thu/Fri designations differ — no reuse).
- T3: the dayOpenSpot progresses (the per-day opens differ — the forward projection).
- T4: the chain progresses (the EU SS→BS→R/WL/RWL→WL→RWL — no stuck-PBS).
- T5: the EU Tue designation lands at the operator's #3 zone (~1.14460 — computed from the chain, never hardcoded).
- T6: the golden 10/21 held or climbed · determinism ×2 · the frozen pair byte-identical.

## 10.3 diag-lmv-golden-fx.ts (ZR-7D — the FX oracle)
- T1: the EU LQZ [1.1444-1.14395] reconstructed (the deltas reported).
- T2: the EU supply [1.14460-1.14530] reconstructed.
- T3: the EU demand [1.14149-1.14000] with the nested LQZ [1.14110-1.14020] reconstructed.
- T4: the EU MoM supply [1.14295-1.14220] reconstructed.
- T5: the EU deep demand [1.13935-1.13875] reconstructed.
- T6: the GU zones reconstructed (the oracle targets).
- T7: computed from the data — the hardcode detector (the fixture swap produces different levels).

---

# PART 11 — THE EXECUTION ORDER + THE DISPATCH PLAN (the ORCHESTRATOR PRINCIPLES)

## 11.1 THE WAVE ORDER (the dependencies)
- ZR-7A (the honest-data purge) FIRST — the IP pollution is the E2's transition-landscape poison.
- ZR-7B (the E1 completion) SECOND — the BoM gates + the IP pressure + the DEFAULT_ZFP + the merge wiring — the E1's honest output.
- ZR-7C (the E2 pressure-consumption) THIRD — the ROOT fix — consumes the ZR-7B's complete E1 output.
- ZR-7D (the FX precision) FOURTH — the zone-map refinement at the operator's levels.
- ZR-7E (the diag/report consistency) FIFTH — the gates measure the shipped pipeline.
- ZR-7F (the cascade precision) SIXTH — the full golden mapping.

## 11.2 THE DISPATCH PLAN (the parallel subagents per wave — the disjoint files)
- ZR-7A: S1 (9-pillar-lobe.ts) + S2 (report-v452.ts — the pillar wiring + the firewall provenance).
- ZR-7B: S1 (4h-sd-lobe.ts + bom-mom.ts — the BoM gates) + S2 (report-v452.ts — the IP classification + the merge order) + S3 (lqz-lobe.ts + trading-constants.ts — the DEFAULT_ZFP).
- ZR-7C: S1 (shape-brain.ts — the designation + the day-band + the chain) + S2 (report-v452.ts — the toDxyZone boundary).
- ZR-7D: S1 (obcv.ts — the BoM tuning) + S2 (lmv.ts + lqz-matrix.ts — the FX oracle).
- ZR-7E: S1 (the diags).
- ZR-7F: S1 (mirror.ts) + S2 (trade-chaining.ts + setup-gen.ts).

## 11.3 THE DISPATCH PROMPT STANDARD (the operator's instruction — the DP L1 briefs)
Every dispatch: the 200+ line DP L1 brief — the mission + the architecture + the context blocks + the constraints + the design decisions + the known gaps + the source lineage + the file inventory + the per-task WHAT/HOW/WHY/EXPECTED + the verification protocol + the return format. The doctrine quotes verbatim (the operator's laws). The anti-patterns (the banned behaviors). The self-check (the pre-return verification).

---

# PART 12 — THE WAVE REPORT TEMPLATE (the ORCHESTRATOR PRINCIPLES Part 15)

```
=== WAVE ZR-7{letter} — {NAME} ===
THE DISPATCHES: (the prompt summaries)
THE RETURNS: (the claims)
THE DIFF REVIEWS (THE AUDIT — per changed file):
  <file> — <hunk>: WHAT | WHY (verified) | HOW (blast radius)
  VERDICT: CORRECT | FLAWED (<the flaw>) | FITTED-TO-GOLDEN | ARCHITECTURE-VIOLATION | SCOPE-CREEP
THE VERIFICATION (the orchestrator's OWN runs):
  tsc / build / report / sha256 ×2 / the golden / the wave gates / the frozen hashes
THE PROBES: (the E2-CORE trace, the designation trace, the pressure-read trace)
THE HONEST RESIDUALS:
THE VERDICT: PASS (all hunks reviewed + verified) | FAIL (<the flaw> + the correction)
```

---

# PART 13 — THE FINAL ACCEPTANCE (the operator's 2026-08-04 target)

1. **The honest-data law enforced** — ZERO fabricated levels — the absent pillars contribute NOTHING (the PILLAR_*_NO_DATA tags) — the thrown error beats the fabricated level.
2. **The E2 pressure-aware** — the designation reads the lifecycle/absorption/liquidity links/operative defense — the zfp is ONE input among many.
3. **The chain-driven designations** — the per-day zones follow the chain (the TP of N = the entry of N+1) — no reuse.
4. **The day band progresses** — the per-day forward-projected references differ — the Friday spot = the Monday-E2-only.
5. **The shape progression** — the EU SS→BS→R/WL/RWL→WL→RWL + the GU WL→BS→WL/RWL→R/RWL→RWL — no stuck-PBS.
6. **The golden mapping** — the EU 8 + the GU 7 at the operator's levels at ≤3p (≥ 15/21 toward 15/15) + the DXY 6/6 held + the DXY lane all-winning.
7. **The E1 compliance** — the BoM gates in all lanes, the IP zones' honest classification + pressure, the DEFAULT_ZFP killed, the OBCV BoM gap closed, the LQZ×IP merge live.
8. **The diag/report consistency** — the gates measure the shipped pipeline.
9. **The discipline** — determinism ×2 · the frozen pair byte-identical · the per-wave checkpoints with the MANIFEST + the report + the gate outputs + the DIFF REVIEWS · the diff review of EVERY changed line (the ORCHESTRATOR PRINCIPLES).
10. **The phase-2 readiness** — the golden anchor's removal precondition: the pipeline on MULTIPLE unrelated weeks with the consistent prediction quality (the operator's Part 30).

*END OF THE ZR-7 OVERHAUL SPEC — the complete 1000+ line build authority: the derailment inventory (the 11 verified defects), the corrected architecture, the 6 waves with the function-level specs + the pseudocode + the data contracts + the test specs + the forensic trails, the anti-patterns, the verification battery, the execution order, the dispatch plan, the wave report template, and the final acceptance. The degeneracy is ripped out and engineered correctly. Doctrine is QUOTED, never synthesized.*

---

# PART 14 — THE OPERATOR'S DOCTRINE REGISTER (the ZR-7's canon — quoted, never synthesized)

1. "pressure mechanics are the fundamental reality everything is built on top of."
2. "E3 is a natural RESULT we ARRIVE AT from E1 + 2 being done properly... 90% of the work is in E1 + E2 - if you do these correctly E3 is basically obvious."
3. "this needs to clearly follow the pre-existing linear price-action-zone-pressure-shape-chain-trade-mapping architecture E1 --> E2 --> E3 each one BUILDS ON TOP of the previous. Next engine's data MUST FIT WITHIN THE CONSTRAINTS of the previous engine's data archtiecture this is absolutely non negotiable."
4. "E3 is not permitted to override pre-existing E1/E2 data architecture nor is it allowed to jsut randomly fabricate its own rules and make shit up."
5. "E2 generates SHAPE CHAIN from ZONE ANCHORS (prices are not even a variable for E2). E3 generates trade setups at specific price levels on top of the E2 shape chain. Refinement engine fires for all E2 valid setups that have shitty anchors causing RR to be below the floor."
6. "NO FABRICATED DATA ANYWHERE. GET THE CORRECT FUCKING DATA OR THROW ERROR. BLACK AND WHITE, NO MIDDLE GROUND, NO FALLBACK FABRICATED BULLSHIT." (the 2026-08-04 directive)
7. "the market moves based on liquidity. S/D just provide the direction firepower and set the market structure of pressure mechanics + shape chain anchors. The LIQUIDITY is what actually FUELS the price action. Liquidity is the BLOOD of the entire market. S/D are the pressure zones, LQZ are the fuel zones."
8. "3 pips outside the back edge of the entry zone, or 1-2 pips inside the close edge of the *next rung* relevant zone... you need to look at the zones like ladder steps."
9. "zones usually fail on the THIRD mitigation."
10. "recency bias is a real thing. BUT it is NOT the LAW. Older zones are still valid if E1 pressure mechanics obviously has an E2 pathway through/toward them."
11. "anything that is 2.5 RR or above is valid as long as it is high probability. However the TARGET is always 4R+ i dont want the machine optimizing everything for low R just to pass the filter."
12. "the stronger the pressure of the zone, the weaker the mitigation will be prior to the reaction. Strong pressure zones = near instant reaction. exit on the closest zone edge and even potentially add a 1-2 pip spread so you dont miss the exit. Weak pressure zones = delayed reaction. Maximize the profits you catch from these while the candles are still inside of them."
13. "no holding trades over the weekend. all trades CLOSE ON FRIDAY before markets close and the next weeks starts fresh based on Monday market open price action."
14. "Everything I found on this EU chart maps 1:1 to DXY EXACTLY simply in the inverse direction... LITERALLY EVERYTHING IS THE SAME the only thing that changes are the actual price levels between the pairs."
15. "friday spot is only relevant to MONDAY E2 SHAPE prediction after that it is completely irrelevant."
16. "E2 must forward map the predicted spot price of that day at london session open."
17. "TP OF ONE = ENTRY OF NEXT." (Law 27)
18. "E2 DESIGNATES, E3 OBEYS."
19. "TP should be exteneded to the STRUCTURALLY CORRECT zone based on E2 shape chain + E1 pressure mechanics."
20. "SL should be made tighter (where actually possible not arbitrarily) based on E1 pressure mechanics + E2 shape chain."
21. "A rejected setup is not a dead setup. The entry is the hard-won insight; SL/TP are engineering."
22. "The agent/codebase must be able to self validate based on RULES and LOGIC not a hardcoded data set."
23. "Doctrine is QUOTED, never synthesized... Anything that can't be quoted, doesn't get built." (D13)

---

# PART 15 — THE RISK REGISTER (the ZR-7's failure modes + the mitigations)

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| 1 | The honest-data purge drops the IP zones entirely (the confluence collapses) | The E2's transition landscape thins | The honest zero is the CORRECT state — the IP zones with the REAL pillar data survive; the ZR-7A gate verifies the golden-held |
| 2 | The BoM gates kill the golden BoM reconstruction (the gate too strict) | The zone map loses the golden zones | The ZR-7B gate verifies the reconstruction holds — the thresholds are the operator's canon (bw≥3.0, bf≥0.65), never fitted |
| 3 | The chain-driven designation overfits to the prior day's TP (the chain error propagates) | The designation errors compound | The chain is the PRIMARY but the pressure + the day-local + the reach still score — a wrong chain anchor loses to a strong pressure zone |
| 4 | The day-band forward projection drifts (the travel estimation wrong) | The day references diverge from the actual | The projection uses the SHAPE_TRAVEL canon + the direction — the ZR-7C gate verifies the progression, not the exact values |
| 5 | The shape-chain rewrite destabilizes the E3 emissions | The golden regresses | The ZR-7C gate: the golden 10/21 held or climbed — the chain changes only the E2's output, the E3 mechanics unchanged |
| 6 | The E2ZoneInput boundary change breaks the consumers (the mirror/setup-gen) | The tsc/build failures | The additive contract — the existing fields kept, the pressure fields added; the consumers compile unchanged |
| 7 | The diag/report consistency exposes MORE divergence (the measurement worsens) | The golden count drops | The honest measurement — the diag now measures the shipped pipeline (the IP merge included) — the TRUE count is the truth |
| 8 | The subagent dispatches hit the firewall (the thin prompts) | The wave stalls | The 200+ line DP L1 briefs (the operator's instruction) — the mission + the architecture + the context + the constraints + the design decisions + the known gaps + the source lineage + the file inventory + the per-task expansion + the verification + the return format |

---

# PART 16 — THE CODEBASE MAP (the ZR-7's working files — the file inventory)

| File | Lines | The ZR-7 role | The wave |
|------|-------|---------------|----------|
| src/brains/9-pillar-lobe.ts | 2,371 | THE HONEST-DATA PURGE — the P3/P4/P7/P9 proxies → the honest zero + the provenance tags | ZR-7A |
| report-v452.ts | 1,421+ | THE BOUNDARY + THE WIRING — the toDxyZone carries the pressure; the IP zones' classification + the merge order; the pillar wiring | ZR-7A/B/C |
| src/brains/4h-sd-lobe.ts | ~460 | THE BoM GATES — the bw≥3.0/bf≥0.65 to the canon lane | ZR-7B |
| src/mdve/bom-mom.ts | ~200 | THE BoM GATES — to the MDVE native lane | ZR-7B |
| src/mdve/lqz-lobe.ts | ~620 | THE DEFAULT_ZFP fallback kill + the LQZ×IP merge with the real pillar data | ZR-7B |
| src/constants/trading-constants.ts | 1,419 | DEFAULT_ZFP: 50 DELETED | ZR-7B |
| src/mdve/index.ts | ~520 | THE MERGE ORDER — the IP zones merged before the pressure stamp; the ladder build receives the real pillar result | ZR-7B |
| src/brains/shape-brain.ts | 2,206 | THE ROOT FIX — the pressure-aware + chain-driven designation + the day-band projection + the chain progression | ZR-7C |
| src/mdve/obcv.ts | 520 | THE BoM TUNING — the machine emits its BoMs on the golden week | ZR-7D |
| src/mdve/lmv.ts | 611 | THE FX ORACLE — the EU/GU zones at the operator's levels | ZR-7D |
| src/mdve/lqz-matrix.ts | 626 | THE FX ORACLE — the fine-tier resolution | ZR-7D |
| diag-golden-coverage.ts | 118 | THE SHIPPED-PIPELINE measurement (the IP merge included) | ZR-7E |
| diag-honest-data.ts | NEW | THE ZR-7A gate | ZR-7A |
| diag-e2-pressure.ts | NEW | THE ZR-7C gate | ZR-7C |
| diag-lmv-golden-fx.ts | NEW | THE ZR-7D gate | ZR-7D |
| src/mdve/mirror.ts | 3,878 | THE CASCADE PRECISION — the mirrors at the operator's levels (the E2's corrected designations feed it) | ZR-7F |
| src/mdve/trade-chaining.ts | 292 | THE CHAINED LEVELS — at the operator's chain levels | ZR-7F |
| src/mdve/setup-gen.ts | 1,353 | THE SOURCE LANE — the DXY held | ZR-7F |
| src/mdve/sl-lmv.ts | 317 | FROZEN — 912940832fac44bc838d53423cbb921eff501de60a9f2641bf20c1d1497eaeab | NEVER |
| src/mdve/trade-dedup.ts | 524 | FROZEN — 33914c897e7775402eefd7d13a5d3675667a2ace576b55a689bc864401a680e4 | NEVER |

---

# PART 17 — THE PER-WAVE EXECUTION CHECKLIST (the mechanical gates — the operator's discipline)

## THE ZR-7A CHECKLIST (the honest-data purge)
- [ ] The P3 histogram deleted — the `P3_NO_DATA` honest zero verified.
- [ ] The P4 HP proxy deleted — the `P4_NO_DATA` honest zero verified.
- [ ] The P7 arena deleted — the `P7_NO_DATA` honest zero verified.
- [ ] The P9 RegimeMA emission gated on the real data.
- [ ] The firewall provenance tags — ZERO NO_DATA zones scored.
- [ ] tsc 0 · build · report · sha256 ×2 · the golden 10/21 held · the frozen pair.
- [ ] The diag-honest-data PASS · the checkpoint v4.5.2_ZR7_A with the MANIFEST + the DIFF REVIEWS.

## THE ZR-7B CHECKLIST (the E1 completion)
- [ ] The BoM gates in the 4h-sd-lobe + the bom-mom — the golden BoM reconstruction holds.
- [ ] The IP zones: classification 'CONFLUENCE' + the pressure state present.
- [ ] The merge order: the IP zones stamped (the pressure over the complete map).
- [ ] DEFAULT_ZFP: zero live references.
- [ ] The LQZ×IP merge fires with the real pillar data (the canon promotion).
- [ ] tsc 0 · build · report · sha256 ×2 · the golden held · the frozen pair.
- [ ] The checkpoint v4.5.2_ZR7_B.

## THE ZR-7C CHECKLIST (the E2 pressure-consumption — the ROOT)
- [ ] The toDxyZone boundary carries the FULL pressure state.
- [ ] The designation: the pressure-aware + chain-driven + day-local — the zfp one input among many.
- [ ] The dayOpenSpot progresses (the per-day forward projection).
- [ ] The chain progresses (the EU SS→BS→R/WL/RWL→WL→RWL — no stuck-PBS).
- [ ] The EU Tue designation lands at the operator's #3 zone (~1.14460 — computed).
- [ ] tsc 0 · build · report · sha256 ×2 · the golden 10/21 held or climbed · the frozen pair.
- [ ] The diag-e2-pressure PASS · the checkpoint v4.5.2_ZR7_C.

## THE ZR-7D CHECKLIST (the FX precision)
- [ ] The OBCV emits its BoMs on the golden week (the 1H BoM 100.68-100.73 + the 4H BoM 101.235-band).
- [ ] The FX oracle: the EU/GU zones at the operator's levels (the deltas reported).
- [ ] tsc 0 · build · report · sha256 ×2 · the golden held or climbed · the frozen pair.
- [ ] The diag-lmv-golden-fx PASS · the checkpoint v4.5.2_ZR7_D.

## THE ZR-7E CHECKLIST (the consistency)
- [ ] The diags build the shipped pipeline (the IP merge included).
- [ ] The diag/report divergence: the designations agree.
- [ ] tsc 0 · build · report · sha256 ×2 · the golden held · the frozen pair.
- [ ] The checkpoint v4.5.2_ZR7_E.

## THE ZR-7F CHECKLIST (the cascade precision — the FINAL)
- [ ] The EU 8 + the GU 7 at the operator's levels at ≤3p.
- [ ] The golden measurement ≥ 15/21 (toward 15/15).
- [ ] The DXY 6/6 held + the DXY lane all-winning.
- [ ] The chained trades at the operator's chain levels.
- [ ] Determinism ×2 · the frozen pair byte-identical · all 16 gates green · the self-validation passes.
- [ ] The checkpoint v4.5.2_ZR7_FINAL.

---

# PART 18 — THE CROSS-REFERENCE INDEX (the ZR-7's sources of truth)

| The source | The content | The ZR-7 reference |
|------------|------------|--------------------|
| MASTER_CONTEXT/PLUTUS_E1_E2_E3_MACRO_CONTEXT.md | The operator's E1+E2=E3 law + the Part 22 E1 reading protocol + the Part 16 storyline structure | The ZR-7C designation + the chain logic |
| MASTER_CONTEXT/Golden_Operator_Trade_Feedback_EU_GU.md | The operator's REAL EU 8 + GU 7 trades with the full reasoning | The FX oracle targets + the chain-progression evidence |
| MASTER_CONTEXT/PLUTUS_ARCHITECTURE_BIBLE_4.0.md | The E1 canon (the 9 pillars, the BoM/MoM, the reaction counter, the ZFP, the confluence) + "Engine 2 consumes the COMPLETE Engine 1 output" (§4.18) | The ZR-7A/B compliance |
| MASTER_CONTEXT/PLUTUS_ARCHITECTURE_BIBLE_4.5.md | The LMV/OBCV formulations + the telescoping + the overhaul directives | The ZR-7D |
| MASTER_CONTEXT/PLUTUS_V4.5.2_ZR7_OVERHAUL_SPEC.md | THIS SPEC | The build authority |
| .trident/wave-audit/e1-e2-full-audit.md | The 2026-08-04 full audit (the D1-D8 + the E2-A..D findings) | The derailment inventory |
| context_management/FAILURE_LOG.md | The DERAILMENT-2026-08-04 record (the E2 zone-selection disconnect) | The root-cause record |
| context_management/COMPACTION_SURVIVAL.md | The resume anchor + the ZR-6 completion + the ZR-7 diagnosis | The session entry |
| context_management/ORCHESTRATOR PRINCIPLES | The audit discipline (the diff review of EVERY changed line) | The wave execution |

*END OF THE ZR-7 OVERHAUL SPEC — the complete 1000+ line build authority. The degeneracy is ripped out (the proxies, the pressure-blind E2, the frozen day band, the reused designations, the degenerate chain, the BoM-gate gaps, the OBCV BoM gap, the IP mislabels, the DEFAULT_ZFP, the diag divergence, the unreachable merge). The corrected architecture: the E1 pressure mechanics feeding the E2 completely, the chain-driven + day-local + pressure-aware designations, the forward-projected day references, the honest data everywhere. Execute ZR-7A first. Doctrine is QUOTED, never synthesized.*

---

# PART 19 — THE OPERATOR'S E1 READING PROTOCOL IMPLEMENTED (the macro context Part 22 → the code)

## 19.1 THE READING SEQUENCE (the operator's 7 steps — each becomes a code path in the ZR-7C designation)

**STEP 1 — THE MACRO NARRATIVE FIRST (the 4H structure — the operator's trade #1):**
> "1H Refined 4H supply zone at 1.14475-1.14625 anchored to Jun 22 OB candle(s) that price has reacted to on Jul 2... and on Jul 3..."
- THE CODE: the E2's designation input includes the 4H parent context (the refinedLabel '1H Refined 4H' + the parent zone's reaction history) — the zone's E1 structure feeds the designation's macro-narrative read.

**STEP 2 — THE ZONE'S PRESSURE STATE (the operator's trade #2):**
> "This UM MoM zone of the BS is also simultaneously the UM BoM zone of the Whiplash move... This is clearly an area of strong pressure + bullish liquidity"
- THE CODE: the E2ZoneInput.pressure — the lifecycle (VIRGIN — the UM status), the classification (the dual BoM/MoM identity), the liquidity links (the "bullish liquidity" beneath) — the pressureScore's VIRGIN-BoM +40 + the liquidity +10.

**STEP 3 — THE LIQUIDITY (the operator's trade #3):**
> "The liquidity shield that sits right in front of the BoM supply is highly likely to be retested now that the bearish BS has started as a final liquidity sweep before the full piercing move happens."
- THE CODE: the pressureScore's SHIELD-alive +10 + the operativeDefense's SHIELD_FUEL +10 — the shield's presence influences the designation.

**STEP 4 — THE BREAK-VALIDATION (the operator's trade #6):**
> "this 'break of structure' could be a false positive as looking purely at E1 pressure mechanics, this ZONE has not yet been broken."
- THE CODE: the E2's chain logic validates the structure break via the E1 pressure — the zone's lifecycle (NOT_BROKEN) gates the chain's break-respect.

**STEP 5 — THE STRENGTH COMPARISON (the operator's trade #6):**
> "the Bearish BS from Tuesday was extremely weak compared to the Bullish BS from Thursday. Bullish pressure is definitively stronger."
- THE CODE: the shape-chain's strength comparison (the ZR-2 storyline's compareStrength) feeds the transition logic — the weak BS → the bullish continuation.

**STEP 6 — THE REACTION-COUNT STATE (the operator's trades #4/#8):**
> "this MoM Demand zone is now 2x mitigated... zones usually fail on the THIRD mitigation" + "this supply zone has not been pierced or broken in 4 prior mitigations... likely to become a fortress zone"
- THE CODE: the pressureScore's DEPLETED −30 + the FORTRESS +20 + the chain's reaction-count-conditioned transitions (the 3rd-mitigation → fail, the 4+ → fortress/RWL).

**STEP 7 — THE DEEP LIQUIDITY (the operator's trade #6):**
> "Looking left to see what relevant LQZs exist beneath this demand, one is clearly visible at 1.13935-1.13875... this LQZ is the LQ shield of the BoM 4H bullish OB."
- THE CODE: the deepDemandZoneId (the ZR-6D contract) + the deep liquidity's pressure state — the designation's reach includes the deep structures.

## 19.2 THE SHAPE-TRANSITION MATRIX (the corrected E2 — the operator's Part 16 + the ZR-2 storyline)

| The current shape | The target zone's pressure state | The next shape | The rule source |
|---|---|---|---|
| SS | the bounding zone DEPLETED (mitigationCount ≥ 3) | BS | "zones usually fail on the THIRD mitigation" |
| SS | the bounding zone VIRGIN/ACTIVE_1 | SS continues | the fresh defense holds |
| BS | the target zone VIRGIN/ACTIVE_1 | R (the recovery) or WL (the whiplash) | the BS hits the fresh defense → the reaction |
| BS | the target zone FORTRESS | RWL (the 95% flip) | the phase transition Fire→Earth |
| BS | the target zone DEPLETED | PBS (the pierce) | the depleted defense fails |
| R | the recovery reaches the opposing zone | WL or RWL | the recovery's endpoint reaction |
| WL | the rejection at the hard zone | RWL or SS | the whiplash's exhaustion |
| RWL | the reversal's exhaustion | SS | the new range forms |
| WLS | the storm's boundary fails | BS | the storm resolves |

---

# PART 20 — THE WORKED EXAMPLE (the EU Tuesday through the corrected pipeline — the build's acceptance test)

**THE INPUT (the operator's oracle):** the EU Tue #3: E 1.14460 / SL 1.14560 / TP 1.14020 / RRR 4.4 — the BoM supply [1.1453-1.14460]'s near edge — the CHAINED entry = the Mon LONG's TP 1.14460 ("Set E at the TP level of trade #1").

**THE CORRECTED E2 (post-ZR-7C):**
1. THE CHAIN: the Monday's projected TP zone = the demand's nested LQZ [1.14110-1.14020]'s zone — the Tuesday's chain anchor = the zone at 1.14460 (the Monday's projected TP level — the chain's progression).
2. THE PRESSURE: the chain-anchored zone = the BoM supply [1.1453-1.14460] — the pressureScore: the BoM VIRGIN +40 (the fresh strong defense) + the INTACT +15 + the SHIELD +10 = the highest pressure score in the day's reach.
3. THE DAY-LOCAL: the zone's formation near the Tue +10.
4. THE zfp: the BoM 0x = 10 → the zfpScore +40.
5. THE PICK: the chain-anchored BoM supply [1.1453-1.14460] — the operator's #3 zone.

**THE CORRECTED E3 (the existing ZR-6B mechanics):** the entry = the internal LQZ rung's near edge (1.14460) · the SL = the relevant-zone edge rule (1.14560 — 3p outside the BoM supply's back edge) · the TP = the structurally-correct opposing zone (the demand's nested LQZ near edge 1.14020) · the RRR 4.4.

**THE MEASUREMENT:** the golden Tue #3 at ≤3p — the cascade maps the operator's trade.

---

# PART 21 — THE OPERATOR'S 2026-08-04 EXECUTION DIRECTIVE (the binding rules for the ZR-7 waves)

1. **The waves execute in order** — ZR-7A → ZR-7B → ZR-7C → ZR-7D → ZR-7E → ZR-7F — gating per wave, checkpointing per wave, no stopping between waves.
2. **The subagents do 85% of the execution** — the orchestrator preserves the context for: auditing the subagent output quality, updating the context docs + writing the progress reports after each wave, deciding how to organize and dispatch the parallel subagent waves, surgically fixing any subagent mistakes directly, the container testing.
3. **The dispatches are the 200+ line DP L1 briefs** — the mission + the architecture + the context blocks + the constraints + the design decisions + the known gaps + the source lineage + the file inventory + the per-task WHAT/HOW/WHY/EXPECTED + the verification protocol + the return format — the operator's instruction: "write proper 200+ line prompts follow the template like it is a DPL1 prompt output and you wont hit the firewall".
4. **The diff review of EVERY changed line** — the ORCHESTRATOR PRINCIPLES — the gates passing is the START of the audit, never the end.
5. **The honest-data law is absolute** — no fabricated levels, no proxies, no middle ground — the correct data or the thrown error.
6. **The operator's levels are the MEASUREMENT oracle** — never the computation input — the machine must GENERATE the correct zones from the data.

*END OF THE ZR-7 OVERHAUL SPEC — the complete 1000+ line build authority. The degeneracy is ripped out. The corrected architecture is specified to the function level. Execute ZR-7A first. Doctrine is QUOTED, never synthesized.*

---

# PART 22 — THE ZR-7 QUICK REFERENCE (the one-page cheat sheet for every build agent)

## THE 11 DERAILEMENTS (the rip-out list)
1. The E2 pressure-blindness — the zfp scalar only (shape-brain.ts:1318-1320, 40 zfp reads / 0 pressure reads).
2. The 9-pillar proxy fabrication — the P3 histogram, the P4 HP proxy, the P7 arena (9-pillar-lobe.ts:1482-1503/:1597-1627/:2005-2069).
3. The BoM gates in 1 of 3 lanes (the 4h-sd-lobe + the bom-mom lack the bw≥3.0/bf≥0.65).
4. The OBCV 0-BoM on the golden week.
5. The IP zones: 'MoM' mislabel + no pressure (report-v452.ts:248).
6. The DEFAULT_ZFP=50 residue (trading-constants.ts:917 + lqz-lobe.ts:526).
7. The diag/report divergence (the plain-model diags vs the IP-enriched report).
8. The LQZ×IP merge unreachable (the empty pillarResult).
9. The designation reuse across days (the EU Mon/Tue identical).
10. The frozen day band (the same dayOpenSpot ×5).
11. The degenerate chain (the EU SS→PBS×3→WL, the GU PBS×4→SS).

## THE 6 WAVES (the order + the gate diag)
- ZR-7A: the honest-data purge → diag-honest-data.
- ZR-7B: the E1 completion (the BoM gates, the IP pressure, the DEFAULT_ZFP kill, the merge) → the existing diags.
- ZR-7C: the E2 pressure-consumption (the designation + the day band + the chain) → diag-e2-pressure.
- ZR-7D: the FX precision (the OBCV BoM + the FX oracle) → diag-lmv-golden-fx.
- ZR-7E: the diag/report consistency → the divergence check.
- ZR-7F: the cascade precision (the full golden mapping) → the golden ≥ 15/21.

## THE PRESSURE SCORE (the ZR-7C designation's core)
```
+40 VIRGIN BoM · +30 ACTIVE_1 · +20 FORTRESS · +15 INTACT · +10 SHIELD_FUEL · +10 SHIELD-alive
-30 DEPLETED · -20 BROKEN · -15 ABSORBED · +10 day-local · +clamp(60 - zfp, 0, 40) · +100 chain-anchored
```

## THE OPERATOR'S LAWS (the absolute)
- NO fabricated data — the correct data or the thrown error.
- The E2 consumes the COMPLETE E1 output — every field matters.
- The Friday spot is the Monday-E2-ONLY reference.
- The TP of ONE = the ENTRY of NEXT.
- The zones are ladder steps.
- The zones fail on the THIRD mitigation.
- The 2.5 floor, the 4R+ target.
- Doctrine is QUOTED, never synthesized.

*END OF THE ZR-7 OVERHAUL SPEC — COMPLETE. 1000+ lines. The build authority for the E1/E2 restoration. Execute ZR-7A first. No degeneracy survives.*

---

# PART 23 — THE STRONGEST() CALL-SITE MAP (the ZR-7C integration — the thin-spot closure)

The `strongest()` zfp-first sort appears at FIVE call sites in projectZoneForDay — each with a different candidate pool + context. The ZR-7C replaces each with the pressure-aware + chain-driven selection:

| Call site | The pool | The context | The ZR-7C replacement |
|-----------|----------|-------------|----------------------|
| :1343 supplyPick = strongest(supplyCands, supplyReachRef) | the SUPPLY candidates above the day's reference within the reach | the SHORT-day designation | designateDay(day, chain, 'SUPPLY') — the chain anchor first (the prior day's projected TP zone), then the pressureScore + the dayLocal + the zfpScore |
| :1344 demandPick = strongest(demandCands, demandReachRef) | the DEMAND candidates below the reference within the reach | the LONG-day designation | designateDay(day, chain, 'DEMAND') — the same chain-pressure-daylocal logic |
| :1382 deepDemandPick = strongest(deepPool, ...) | the demands BENEATH the primary's floor (the ZR-6D deep demand) | the operator's #6 structure | the deep demand = the strongest NON-depleted demand beneath the primary's floor by the pressureScore — the FORTRESS/VIRGIN demands preferred, the BROKEN/DEPLETED excluded |
| :1400 pick = strongest([...supplyCands, ...demandCands], expectedReach) | the RANGE-day both-sides pool | the RANGE (SS) day | the RANGE-day pick = the chain anchor (the prior TP level) + the highest pressureScore across both sides — the direction resolved by the keyZoneType (the ZR-6D contract) |
| :1503 pick = qualifying.z (the I2 qualified sort) | the internal-LQZ-qualified candidates | the §8.1 internal-rung preference | the same pressure-aware sort applied to the qualified pool — the qualification (the near-active-edge) first, the pressureScore second |

**THE UNIFIED DESIGNATION FUNCTION (the ZR-7C core):**
```
function designateZone(pool, day, chain, priorDayProjection, side):
  # 1. THE CHAIN ANCHOR (the PRIMARY — the operator's "Set E at the TP level of trade #1"):
  chainLevel = priorDayProjection?.projectedTp
  chainCands = pool.filter(z => abs(zoneCenter(z) - chainLevel) <= 15 * pip)
  # 2. THE PRESSURE SCORE (the operator's E1 reading protocol — the macro context Part 22):
  candidates = chainCands.length > 0 ? chainCands : pool
  return argmax(candidates, z =>
    (chainCands.includes(z) ? 100 : 0)
    + pressureScore(z)                    # the +40 VIRGIN-BoM / −30 DEPLETED / +20 FORTRESS / the absorption / the shields
    + dayLocalBonus(z, day)               # the +10 formed on/near the day
    + clamp(60 - z.zfp, 0, 40)            # the zfp — ONE input among many
    + reachProximity(z, day))             # the day-reachability
```

---

# PART 24 — THE DAY-BAND × REACHABILITY INTERACTION (the thin-spot closure)

The corrected dayOpenSpot (the per-day forward projection) CHANGES the day-reachability band (the R1-b: the designation's zone must fall within [dayOpenSpot − travel, dayOpenSpot + travel]). The interaction:

1. **The day N's reference** = projectDayOpenSpot(pair, day, chain, weekOpenRef) (Part 7.3) — the forward-projected per-day open.
2. **The day N's reach band** = [dayOpenSpot_N − travelMax(shape_N), dayOpenSpot_N + travelMax(shape_N)] — the SHAPE_TRAVEL canon (the shape's expected travel).
3. **The day N's designation** = designateZone(pool, day, chain, priorDayProjection, side) — the chain anchor + the pressure + the day-local + the zfp + the reach proximity — the candidate must fall within the reach band (the R1-b retained).
4. **THE FEEDBACK LOOP (the critical detail):** the chain anchor (the prior day's projected TP) MUST lie within the current day's reach band for the chain to fire. When the chain anchor is OUTSIDE the band (the prior TP beyond the day's expected travel), the chain anchor is dropped and the pressure/day-local selection takes over — the designation logs `CHAIN_ANCHOR_OUT_OF_REACH` (the honest absence, never a forced pick).
5. **The Monday rule:** the weekOpenRef = the Friday-spot-derived reference (the Monday-E2-ONLY use of the Friday spot) — the operator's law.

**THE GATE ASSERTION (diag-e2-pressure T3):** the per-day dayOpenSpot values differ (the projection progresses) AND every designation's zone falls within its day's reach band (the R1-b retained — the diag-e2-forward's day-reachability assertion must still pass).

---

# PART 25 — THE PRIOR-WEEK STORYLINE FEED (the thin-spot closure — the macro arc)

The operator's Part 16: "the macro arc (the prior-week storyline)" — the chain-driven designation consumes the prior-week pre-flight (runPriorWeekPreflight) output:

```
interface PriorWeekStoryline {
  sweepOrigin: number;                 // the prior week's sweep origin (the DXY 100.603 — computed)
  rangeTop: number; rangeBottom: number;
  defendedZones: string[];             // Law 28 — the DEFENDED
  brokenZones: string[];               // Law 28 — the role reversals
  roleReversals: Array<{ zoneId: string; from: 'SUPPLY' | 'DEMAND'; to: 'SUPPLY' | 'DEMAND' }>;
  priorShapeChain: ShapeCode[];        // the prior week's chain (the macro arc's starting context)
}
```

**THE CHAIN-DRIVEN DESIGNATION CONSUMPTION:**
1. The Monday's designation: the prior-week storyline anchors the macro read — the defended zones (the fresh defenses) + the broken zones (the role reversals — the broken support = the new resistance) + the prior chain's endpoint shape (the energy state — the operator's "the bullish SS/BS/R/WL chain just completed... the supply zone's pressure confirmed").
2. The chain's first transition: the prior chain's endpoint → the current week's first shape (the operator's "the bearish Recovery move that will likely dissipate into SS now that SS/BS/R/WL chain has just completed").
3. The pressureScore's FORTRESS/VIRGIN reads: the prior week's defended zones carry the FORTRESS accumulation (the 4+ strong holds) — the operator's #8: "this supply zone... has not been pierced or broken in 4 prior mitigations... likely to become a fortress zone".

---

# PART 26 — THE GU PROPAGATION (the thin-spot closure — the EU-kept cascade)

The corrected EU designations flow to the GU through the shape-cascade translation (the EU-kept direction):

1. **The EU days' corrected designations** (the ZR-7C output — the chain-driven + pressure-aware) become the translation's input.
2. **The translation** (shape-cascade.ts): for each EU day, the GU's SAME-ELEMENT zone (the EU supply → the GU supply — the kept direction) at the GU's OWN levels (the structural-equivalence matching — the element BoM→BoM/MoM→MoM/LQZ→LQZ, the role kept, the ±48h window, the position-in-structure).
3. **The GU chain progression:** the GU's chain follows the EU's corrected chain (the kept shapes) — the GU Mon WL (the operator's #1 1.33330) from the EU Mon's corrected structure; the GU Wed SHORT+LONG (the #3/#4) from the EU Wed's dual-side; the GU Fri SHORT (the #7 1.34500 — the SELL_SIDE rung designated — the ZR-6D keyZoneType fix retained).
4. **The GU's pressure-state read:** the GU's OWN zones' pressure states (the GU's lifecycle/absorption/liquidity — never the EU's) — the designation at the GU's levels per the GU's pressure mechanics.

**THE GATE (the wave F):** the GU lane at the operator's levels — the GU Mon LONG Δ≤3p of 1.33330, the GU Wed SHORT Δ≤3p of 1.33660, the GU Wed LONG Δ≤3p of 1.33280, the GU Thu SHORT Δ≤3p of 1.34260, the GU Thu LONG Δ≤3p of 1.33850, the GU Fri SHORT Δ≤3p of 1.34500.

---

# PART 27 — THE EXACT DIAG ASSERTIONS (the thin-spot closure — the test values)

## diag-honest-data.ts (ZR-7A — the exact assertions)
```
T1: assert(gbpOptionsDimension.score === 0)                              // the P3_NO_DATA — the histogram GONE
T2: assert(analystDimension.score === 0)                                 // the P4_NO_DATA — the HP proxy GONE
T3: assert(derivativesDimension.score === 0)                             // the P7_NO_DATA — the arena GONE
T4: assert(regimeDimension.score === 0 && regimeLevels.length === 0)     // the P9_NO_DATA — no RegimeMA level
T5: assert(zoneMap.filter(z => z.provenance?.source === 'NO_DATA').length === 0)  // the NO_DATA zones never scored
T6: assert(goldenCount >= 10 && determinism && frozenPair)
```

## diag-e2-pressure.ts (ZR-7C — the exact assertions)
```
T1: const probe = designateZone(poolWithDepletedAndVirgin, ...)
    assert(probe.zoneId === theVirginZone.id)                            // the pressure beats the zfp
T2: assert(euDesignations[0].keyZoneId !== euDesignations[1].keyZoneId)  // the Mon ≠ the Tue — no reuse
    assert(euDesignations[1].keyZoneId !== euDesignations[2].keyZoneId)  // the Tue ≠ the Wed
    assert(euDesignations[2].keyZoneId !== euDesignations[3].keyZoneId)  // the Wed ≠ the Thu
    assert(euDesignations[3].keyZoneId !== euDesignations[4].keyZoneId)  // the Thu ≠ the Fri
T3: assert(euDayOpens[0] !== euDayOpens[1] || the projection is monotonic)  // the day band progresses
T4: assert(euChain === ['SS', 'BS', 'R', 'WL', 'RWL'] || the per-day shapes differ)  // no stuck-PBS
T5: const tue = euDesignations[1]
    assert(abs(zoneCenter(tue.zone) - 1.14460) <= 30 * pip)              // the operator's #3 zone territory — computed
T6: assert(goldenCount >= 10 && determinism && frozenPair)
```

---

# PART 28 — THE CONTAINER TEST PLAN (the ZR-7's runtime verification)

The ZR-7F final gate runs the container test (the only valid runtime evidence):
1. The fresh container from plutus-container-testing:clean-v421 (the BUG-19 discipline — the shadow-hive fleet-manager stopped + disabled).
2. The SHA-verified deploy (the dist/index.js sha256 recorded before/after — the silent-deploy-gap lesson).
3. The TUI launch (the tmux send-keys + the pipe-pane capture).
4. The 3-signal monitoring (the stream, the artifacts, the exit codes).
5. The sniff test (the pipeline end-to-end: the harvest → zones → shapes → cascade → setups).
6. The golden reconstruction (the 23 golden trades overlaid vs the generated — the same zones, the same candles).
7. The outcome audit (each golden trade verified against the bars fixture: the entry fill, the SL/TP order).
8. The 4-element evidence (the image SHA, the deploy SHA, the stream evidence, the artifacts, the pass/fail).

---

# PART 29 — THE ZR-7 SELF-AUDIT (the thin spots — the closure verification)

The spec's own audit (the orchestrator's assessment of the coverage):
1. The strongest() call-site map — CLOSED (Part 23 — the 5 sites with the unified designation function).
2. The day-band × reachability interaction — CLOSED (Part 24 — the feedback loop + the CHAIN_ANCHOR_OUT_OF_REACH rule).
3. The prior-week storyline feed — CLOSED (Part 25 — the PriorWeekStoryline contract + the consumption).
4. The GU propagation — CLOSED (Part 26 — the EU-kept translation + the GU's own pressure reads + the gate levels).
5. The exact diag assertions — CLOSED (Part 27 — the assertion values).
6. The container test — CLOSED (Part 28 — the 8-step protocol).
The remaining orchestration-level details (the dispatch-specific task decomposition) live in the 200+ line DP L1 briefs per wave — the spec is the build authority, the briefs are the execution.

*END OF THE ZR-7 OVERHAUL SPEC — COMPLETE. The thin spots closed: the call-site map, the day-band interaction, the prior-week feed, the GU propagation, the exact assertions, the container plan. Execute ZR-7A first. Doctrine is QUOTED, never synthesized.*

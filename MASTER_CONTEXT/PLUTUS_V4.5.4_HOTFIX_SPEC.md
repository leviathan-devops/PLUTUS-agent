# PLUTUS v4.5.4 — THE HOTFIX SPEC (Wave 1: TP revert + cap removal + anchor-pool union + shelf dual-entry)

**Date:** 2026-07-29 | **Author:** the orchestrator, under the operator's direct orders | **Base:** `Checkpoints/v4.5.1_LIVE_MARKET_CAPABLE/` (the v4.5.3 working copy) | **Output checkpoint:** `Checkpoints/v4.5.4_HOTFIX/`
**Companion docs:** `MASTER_CONTEXT/PLUTUS_FAILURE_LOG_2026-07-29.md` (the mistakes this spec corrects) · `Checkpoints/v4.5.3_FILL_AND_GU_FIX/PLUTUS_V4.5.3_ADDENDUM.md` (the state this builds on)
**The operator's orders (verbatim, 2026-07-29):** (1) "S/D OBs + LQZs are BOTH RELEVANT — READ THE BUILD REPORTS — THIS IS A REGRESSION"; (2) "spot price is practically irrelevant for calculations and everything is done based on E1 → E2 → E3 mechanics and data… it needs to be day native"; (3) "we literally already had this wired properly on DXY — i explicitly said to copy those same settings to EU and GU… literally replicating the working infrastructure"; (4) "both entries on the 1 trade need to be properly emitted — this is not a 'pick the best one' option… 1 was a LL reinforcement while the other was from the start of the move. These are 2 separate trades"; (5) "i never said to put a cap. i think you misinterpreted something here."

---

## PART A — THE FIVE FIXES (scope, mechanics, exact edits)

### FIX 1 — THE TP REVERT (the DXY walk, verbatim)

**Doctrine (the operator's D5 order + the Q3 evidence):** the EU/GU mirror TP uses the EXACT DXY infrastructure: `computeMirrorTP` (mirror.ts:458+) with `passThroughWeakWalls: true` — the Law-14 walk: weak walls (MoM rc≤1, or liquidityScore<5, or zfp>30) pass through; cap at the FIRST STRONG opposing rung (UM BoM, or liquidityScore≥5, or zfp<20) **wherever the walk finds it** — NO week-range-extreme anchor, NO terminal-wall clamp. The X4 record (BR451 §9.5): pushing PAST the first strong rung is the rejected experiment; the walk terminates AT it — exactly what this revert restores.

**Mechanical proof (diag-tp.ts, 2026-07-29):** the DXY walk on the ACTIVE mirrors produces the operator's TPs: GU 1.34337/1.34261 → **1.34055** (rung 1.34047 — fills Friday, low 1.33918 ✓ WIN) vs my wall 1.33395 (missed by 2.7p → LOSS); EU 1.14572 → **1.14305**; EU 1.14369/1.14389/1.14460 → **1.14138**; EU LONG 1.14082 → **1.14220** (kills the absurd 10.21 "planned RRR").

**Exact edits (mirror.ts, OPEN):**
1. In `reAnchorMirror`'s v452 TP branch: DELETE the `computeWeeklyWallTP` call. The v452 TP path becomes the SAME `computeMirrorTP(entry, slFinal.sl, ladderAnchor, direction, targetModel.ladder, pipValue, { passThroughWeakWalls: true })` call the default path uses (:1897) — one TP path, no divergence.
2. DELETE `computeWeeklyWallTP` + `weekRangeExtremes` (the invention). Remove `weeklyWallTp` from `MirrorV452Refinements` (keep the interface member documented as REMOVED for the audit trail — no, delete it cleanly; the CHANGELOG carries the history).
3. The wall-TP harness assertion (verify-eu-gu-v452.ts [1]) is REWRITTEN: assert every ACTIVE EU/GU mirror TP == the computeMirrorTP output (recomputed independently in the harness) AND lands on a rung of the target's ladder (no mid-range TPs). The DXY LONG TP assertion [101.19, 101.24] is UNCHANGED (the DXY source lane is frozen and was never touched).

**Done when:** GU ACTIVE mirror TPs = 1.34055-class (the next strong rung below entry — fills the week's actual lows); EU mirror TPs = the walk's rung targets; the GU trades resolve WIN (TP hit before SL on the bars); verify-eu-gu-v452 green with the rewritten assertion; the v4.5.2 wall-TP code path is gone from the source.

### FIX 2 — THE CAP REMOVAL (emission ≠ counting)

**Doctrine (the operator: "i never said to put a cap"; D16/D38; the audit's FIX 1 `merge_as_leg`):** ALL mirrors emit. The unique-trade identity is a REPORTING-layer computation (trade-dedup.ts — post-processing, spec §9.1's original placement): N mirrors on the same anchor+day produce N emitted mirrors AND ONE trade in the stats, with merged provenance (`GU mirror of DXY-T1 + DXY-T2 + …`) and the staggered legs.

**Exact edits:**
1. `mirror.ts`: DELETE the `applyEmissionCap` block in `cascadeV45` (the `capMirrorLaneEmission(eu/gu)` calls) + the `capMirrorLaneEmission` function + the `EMISSION_CAPPED` status production. The `MirrorStatus` member stays (harmless, documented as retired). `applyEmissionCap` in the context type stays documented-retired (read nowhere).
2. `report-v452.ts`: remove `applyEmissionCap: true` from the cascade options.
3. `trade-dedup.ts` (OPEN — Wave A built it): NO CHANGE NEEDED — `dedupTrades` already merges same-identity rows into ONE trade with merged provenance + legs (verified Wave A: the GU ×10 → 1 trade, 10 legs). This IS the merge-as-leg semantics — it was always the right layer.
4. Harness (verify-eu-gu-v452.ts [3]): REWRITE the cap section → THE MERGE ASSERTION: (a) the cascade emits ALL ACTIVE mirrors (no EMISSION_CAPPED status anywhere in the output); (b) N ACTIVE GU mirrors on the same anchor+day → dedupTrades produces EXACTLY 1 unique trade; (c) that trade's provenance names ALL N source rows; (d) its legs = the staggered union in chronological order; (e) D16/D38 guard — the emitted ACTIVE mirror count is NOT artificially limited (every structurally-valid mirror is ACTIVE or carries a structural discard reason — no cap-flavored reason exists in any discardReason string).
5. The EU/GU lanes' DISTINCT-anchor distribution (the v4.5.3 loops, `usedEuAnchors`/`usedGuAnchors` + excludedIds) STAYS — that is pool distribution (choosing distinct zones), not emission suppression. With the cap gone, a source that fails to find a distinct anchor falls back to the strongest shared anchor and EMITS ANYWAY (the current code: "else: the strongest anchor stands") — the dedup merges the duplicates at report time.

**Done when:** zero EMISSION_CAPPED statuses in any cascade output; the GU lane emits every structurally-valid mirror; the dedup merges same-anchor+day mirrors to one trade with full provenance + legs; the harness merge assertions green; the emitted counts are bounded only by structure (zones, RRR floors, CS-1), never by quota.

### FIX 3 — THE ANCHOR-POOL UNION (§8.1 restored)

**Doctrine (§8.1, six loci):** `structural(zone)⟺ zone.source ∈ {ORDER_BLOCK, LQZ}` — BOTH first-class. Class-matching (BoM→BoM, MoM→MoM, LQZ→LQZ) is a PREFERENCE inside the union, not a wall.

**Exact edits (mirror.ts `selectPairNativeZone`, OPEN):**
1. The LQZ inclusion for OB-class sources becomes UNCONDITIONAL (when the `guAnchorPoolV453` flag is on — the frozen default lanes stay byte-identical; verify-cascade/verify-mirror-fix/verify-refinement-x do not pass the flag): the candidate pool = OB zones (grouped 0/−1/−2 as now) ∪ LQZ rungs at group −1.5 (recency-gated: a reaction candle inside the model's week — the v4.5.3 gate stays; zfp-tiered via lqzSignificanceTier). DELETE the `!candidates.some((c) => c.group >= -1)` precondition — the rungs join ALWAYS, ranking below alive/recently-battled OB and above the OB rank/nearest tier.
2. The `classFlexibleLQZFallback` option is renamed in-doc (not in code — code churn is waste) to reflect its real semantics: "the union pool" (comment update only).
3. Harness [3-new]: THE UNION ASSERTION — for every DXY source mirrored, the EU/GU candidate pool contains BOTH the OB candidates AND the recency-passing LQZ rungs (assert by calling selectPairNativeZone with a probe set + verifying an LQZ anchor can win when the OB pool is VIOLATED-only); assert the operator's manual GU anchors (1.3380-class) are candidate-reachable on their signal days (see FIX 4's day-native note — for Wave 1, assert pool membership, not day-native evaluation).
4. EU lane: the same union applies (the EU OB pool is healthier, but the union now feeds the distribution more distinct anchors — the operator's ~8 EU map becomes reachable).

**Done when:** GU's pool offers multiple distinct anchors (the rungs his manual map uses); the EU/GU distribution spreads (the v4.5.3 loops) across them; the union assertion green; the frozen suites byte-identical + green (the default path unchanged).

### FIX 4 — THE DAY-NATIVE EVALUATION, WAVE-1 SCOPE (the full reasoning chain is Wave 2)

**Doctrine:** *"spot price is practically irrelevant… everything is done based on E1 → E2 → E3 mechanics"* + *"it needs to be day native."* The FULL forward reasoning chain (ShapeContinuity + DayBands + path-walker, the M1-M8 Kronos-derived plan — stored in hive t3 `plutus-reasoning-chain-gaps-vs-bible`) is WAVE 2 (v4.6). Wave 1 delivers the minimal day-native correction that unblocks the cascade NOW:

**Exact edits (mirror.ts, OPEN):**
1. `reAnchorMirror` gains a day-native reference: the SOURCE's trade day (the DXY source's tradeDay → ISO day; for the EU→GU lane, the EU mirror's tradeDay). The onSide gate in `selectPairNativeZone` receives `referenceSpot` = the SIGNAL DAY's session-open price on the TARGET pair (via the existing `sessionStartPrice(pair, ms)` plumbing — the report chain already provides it; extend it to compute the day-open from the bars: first 1H bar of the source's trade day). The Friday model spot stops being the gate reference **for sources whose trade day ≠ Friday**.
2. The `tradeDay` derivation stays §9.3 (the anchor's latest reaction day) EXCEPT it must not contradict the source day by more than the week: if the anchor's latest reaction predates the week start, the anchor is stale — the recency gate (FIX 3) already excludes those rungs; OB anchors keep the battled-within-week rule.
3. Harness [6c]: THE DAY-NATIVE ASSERTION — the GU 1.3380-class anchor (below Friday spot, above Monday's open) is ADMISSIBLE for a Monday-day source (pool membership under the Monday reference) and REJECTED for a Friday-day source (correctly below Friday's reference); the onSide gate references the source's day, proven with two probe calls.
4. Honest scope note (written into the build report): Wave 1 keys the evaluation to the SOURCE's day-open. It does NOT yet project Monday's price FORWARD from the prior week's storyline (that is the DayBand, Wave 2 / M3). Wave 1 makes the pipeline day-native for REPLAYED weeks; Wave 2 makes it forward-projecting for UPCOMING weeks.

**Done when:** the onSide gate admits the operator's Monday GU anchor for a Monday source; the Friday gate behavior is unchanged for Friday sources (no regression on the current trades); the day-native assertion green.

### FIX 5 — THE SHELF DUAL-ENTRY EMISSION (setup-gen.ts — the operator's explicit unfreeze)

**Doctrine (the operator, verbatim):** *"both entries on the 1 trade need to be properly emitted this is not a 'pick the best one' option… 1 was a LL reinforcement while the other was from the start of the move. These are 2 separate trades… multiple entries within 5-15 or so pips of each other are multiple entries of 1 trade; a LL reinforcement 30+ pips away is obviously a separate trade."*

**Mechanics (setup-gen.ts — FROZEN FILE, the operator's explicit order unfreezes it for THIS change only; the freeze re-locks after with a new sha):**
1. Read the LQZ-shelf emission path (setup-gen.ts, 630 lines) + the zone-matrix structure (lqz-matrix.ts — READ ONLY, stays frozen). A merged shelf matrix (e.g. [100.936-100.972], 39 candles) carries multiple structural sub-edges in its candle anatomy: the move-ORIGIN edge (the first swing low that started the move) and the defended/reinforcement edge (the defendedEdge field).
2. NEW: `extractShelfSubEdges(zoneMatrix)` (~50 lines, in setup-gen.ts): cluster the matrix's candle extremes (swing lows for demand / swing highs for supply) at 2-pip tolerance → sub-edges with ≥3 reaction candles each → if 2+ DISTINCT sub-edges exist (>3 pips apart — the dedup tolerance, so they stay distinct identities), the shelf is MULTI-EDGE.
3. The emission: a multi-edge shelf emits ONE SETUP PER SUB-EDGE (each with its own entry = the sub-edge price, its own SL via the existing computeSL_LMV machinery, its own TP via the existing walk, its own session/day per the existing semantics). The single-edge path is byte-identical (no change for normal shelves).
4. The dedup identity (trade-dedup.ts) keeps them distinct (the 3-pip bucket — 100.945 vs 100.977 = 3.2 DXY pips apart → distinct buckets ✓; assert this in the harness: the two shelf trades have DIFFERENT trade_ids).
5. FROZEN-HARNESS CONFLICT PROTOCOL: verify-sl-fix (25/25) tests SL computation on specific setups — additive emissions shouldn't break it. verify-cascade (13/13) + verify-integration (13/13) + verify-integration-v45 (26/26) + verify-refinement-x (18/18) may encode exact setup COUNTS. If the dual-entry changes a count: the harness expectation is updated WITH the documented evidence (the new emission is valid per the operator's doctrine — the update is a correction, not a suppression; each changed assertion is logged in the build report with before/after values + the bar evidence). NO harness logic is weakened — only stale count constants updated.
6. Harness [7-new]: THE SHELF ASSERTION — the Wednesday 100.936-100.972 shelf emits BOTH the 100.945-class entry (move-origin) AND the 100.977-class entry (reinforcement); both have valid SL/TP (golden ranges); their dedup identities are distinct; the single-edge shelves still emit exactly one setup (no double-emission regression).

**Done when:** the golden Wednesday shelf emits 2 distinct trades; DXY unique trades 7 → 8 (the operator's golden-8 covered); the shelf assertion green; the frozen battery green (with any count-constant updates documented).

---

## PART B — THE VERIFICATION BATTERY (every gate, mechanical)

1. `bun run typecheck` → 0 errors.
2. verify-dedup.ts 59/59 · verify-accurate-stats.ts 64/64 (Wave A modules — untouched by these fixes except where noted).
3. verify-eu-gu-v452.ts — UPDATED per Fixes 1-5 (the rewritten TP assertion, the merge assertion, the union assertion, the day-native assertion, the shelf assertion) → ALL green. The v4.5.3 fill-model assertions ([2c], [6b]) stay green (the fill model is untouched).
4. The 8 frozen suites: golden-recon 16/16 · verify-cascade 13/13 · verify-integration 13/13 · scratch-lmv 21/21 · verify-sl-fix 25/25 · verify-mirror-fix 21/21 · verify-integration-v45 26/26 · verify-refinement-x 18/18. ANY failure → the conflict protocol (Fix 5.5): documented evidence + surgical expectation correction or revert. Frozen SOURCE files (lmv.ts, sl-lmv.ts, engine.ts, the 7 harness scripts, trade-dedup.ts) sha256-verified byte-identical before/after EXCEPT setup-gen.ts (Fix 5 — the operator's explicit unfreeze; the new sha is recorded and setup-gen.ts re-locks).
5. Determinism: the full chain ×2 → byte-identical report (in-process + cross-process sha).
6. The regenerated report_v452.md with the v4.5.4 trade set: the expected shape — DXY 8 unique (the shelf dual-entry), EU ≥ 6 unique (the union-enriched distribution), GU ≥ 2 unique with the walk TPs resolving WIN (the 1.34055 TP fills); GU 0W/2L → expected 2W/0L; every stat on the unique set with n; the merge provenance visible for same-anchor mirrors.
7. The visual evals regenerated (Visual_Evals/v4.5.4/) covering the FULL trade set with the corrected TPs (the GU charts must show the TP 1.34055 HIT).
8. The independent R recomputation ±0.01R (harness [7] — unchanged semantics).

---

## PART C — THE EXECUTION SEQUENCE (this session)

1. Fix 1 (TP revert) → run the chain → confirm GU TPs = 1.34055-class + the walk's EU TPs.
2. Fix 2 (cap removal) → run → confirm zero EMISSION_CAPPED + the merge provenance.
3. Fix 3 (anchor union) → run → confirm the GU/EU pool spreads across the rungs.
4. Fix 4 (day-native reference) → run → confirm the Monday GU anchor admissibility.
5. Fix 5 (shelf dual-entry) → run → confirm DXY 8 unique.
6. Harness updates (all 5 assertion blocks) → verify-eu-gu-v452 green.
7. Full battery (Part B) → all green, zero undocumented regressions.
8. Visual evals v4.5.4 (dispatch the render agent).
9. Checkpoint `Checkpoints/v4.5.4_HOTFIX/` + the v4.5.4 build report (with the failure-log cross-references) + context docs updated.

## PART D — EXPLICIT NON-GOALS (Wave 1)

- The full forward reasoning chain (ShapeContinuity/DayBands/path-walker, the M1-M8 plan) — WAVE 2 (v4.6). Wave 1's Fix 4 is the minimal day-native unblocking only.
- GATE-5 (the deployed container run) — WAVE 3, after Wave 1 verification.
- The frozen emergent TP (computeTPSignificancePath, DXY source lane) — untouched.
- The dedup identity/merge machinery (trade-dedup.ts) — untouched (proven Wave A).
- The v4.5.3 fill model (intended-session activation + day-end expiry) — untouched (proven).

## PART E — THE ACCEPTANCE (the operator's checklist)

- [ ] GU mirror TPs = the DXY-walk output (1.34055-class) — the weekly-wall code deleted.
- [ ] Zero EMISSION_CAPPED statuses; same-anchor mirrors merged at the reporting layer with full provenance + legs.
- [ ] The §8.1 union live: OB + LQZ candidates together; the GU/EU lanes spread across distinct rung anchors.
- [ ] The day-native onSide gate: the Monday GU 1.3380-class anchor admissible for a Monday source.
- [ ] The Wednesday shelf emits 2 distinct trades (100.945-origin + 100.977-reinforcement); DXY 8 unique.
- [ ] All harnesses green; frozen files byte-identical (except the operator-unfrozen setup-gen.ts, new sha recorded); determinism ×2.
- [ ] The honest stats: every number on the unique set with n; the GU wins restored by the walk TPs; the visual evals showing the TP fills.

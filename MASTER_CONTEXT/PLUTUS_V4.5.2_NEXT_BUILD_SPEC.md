# PLUTUS v4.5.2 — NEXT-BUILD SPEC (2026-08-01): THE E1 REINTEGRATION + THE E2-AUTHORITATIVE CASCADE

**Status:** OPERATOR-DIRECTED MAJOR OVERHAUL — the next session's authority (replaces the stale parts of the FIX PLAN v2)
**Base:** `Checkpoints/v4.5.2_AUDIT_2026-08-01/` (the TRUE state — golden 6/22, DXY 6W/0L +24.04R, EU/GU 0 resolved)
**Author:** the 2026-08-01 audit session (Trident Agent)
**Reading order:** Bible 4.0 → Bible 4.5 → this spec → the FULL BUILD REPORT → the DEBUG LOG → the 9 canon docs

---

## 0. THE ZERO-TRUST STATE (verified 2026-08-01 — NEVER the claimed state)

| Item | TRUE value | Evidence |
|---|---|---|
| Golden ≤3 pip | **6/22** (DEGRADED from 11/22 at the Wave-H peak — the E2-authoritative fixes shifted DXY emissions) | diag-golden-coverage.ts |
| DXY lane | headline 5W/0L +19.07R | overall 6W/0L **+24.04R** (all winning — BETTER R than the original +21.61R) | report_v452.md |
| EU lane | **0 resolved** (0W/0L n=0) | report_v452.md |
| GU lane | **0 resolved** (0W/0L n=0) | report_v452.md |
| STALE | 7 trades | report_v452.md |
| Determinism | report c6cc3537 ×2 · dist ee259e00 | sha256sum |
| tsc / build | 0 errors / 1.27MB | commands |
| Frozen | sl-lmv 91294083 · trade-dedup 33914c89 | sha256sum |
| E2 designation (EU Mon) | keyZoneId `EUR/USD|1H|1783648800000|1.14469` · keyZonePrice **1.14567** (golden 1.14544, Δ2.3p) · session NY Overlap | probe-verified |
| The report's EU Mon SHORT | E **1.14494** (NOT the E2's 1.14567) — session TOKYO | report_v452.md row 3816 |

**The contradiction that defines the work:** the E2 CORE designates the CORRECT zone/level/session for the EU Mon SHORT (probe-verified in isolation: `selectPairNativeZone` returns the E2 zone, the entry fix computes 1.14567), but the REPORT emits E 1.14494 / session TOKYO. The E2 designation is not reaching the emitting mirror path. THE ROOT CAUSE IS NOT YET FULLY FIXED.

---

## 1. THE TWO MAJOR ARCHITECTURAL OVERHAULS (the operator's 2026-08-01 directives)

### OVERHAUL A — E1 REINTEGRATION (the 9-pillar IP zone map + the prior-week backwards-mapping pre-flight)

**The problem (mechanically proven):** the v452 report path (`report-v452.ts` → `buildChartModel`) builds **pure S/D/L only** — S/D order blocks (ob-engine) + LQZ/LMV rungs + the ladder. The **9-pillar IP zone map is NOT in the path at all**:
- `pillarEngine` (src/brains/9-pillar-lobe.ts, 2,371L) is called ONLY in: `src/brains/zone-brain.ts:310`, `src/engine/plutus-tte-pipeline.ts:539` (DEAD legacy), `src/pipeline/engine.ts:531` (the 5-tool pipeline — **which report-v452.ts does NOT import**).
- `report-v452.ts` imports `src/mdve/index.js` (buildChartModel), shape-brain, shape-cascade, cascade-translation, mirror, dedup, stats — **NEVER pillarEngine**.
- Result: no pivot confluence, no MA confluence, no options walls (P3/P8), no analyst levels (P4), no Fib grid (P6). The IP zone map — the thing E2's shape chain anchors to — is not built. **ZFP comes from the canon ladders (BoM 10/18/32/65), NOT from the 6D confluence step function (Bible 4.0 §4.11).**

**The operator's doctrine (QUOTED):**
> "how much of this E1 specific web data prompt is being skipped that maps the IP zones? That drive the fucking E2 shapes? so you're just doing S/D/L and nothing else?" — the 9-pillar IP map is a FUNDAMENTAL PILLAR of E1, not skippable.
> The system prompt (Trident_System_Prompt_v5.3.3_DOWNLOAD_ME.md, 4,216L): "Engine 1 (9-Pillar 6D Hybrid System + 4H Zone Overlay + POI Tier Classification + Zone Reaction Counter + BoM/MoM Classification): Maps Institutional Pressure (IP) zones... answers 'Where are the walls? How strong are they? Which ones are REAL? Which ones have juice left?'"
> The operator's E1 web data: FX options expiry tables (Pillar 3/8 — Protocol A), institutional analyst commentary (Pillar 4 — ING, forex.com), Fed H.10 rates (the K factor), ICE/CME derivatives (Pillar 7).

**The prior-week backwards-mapping pre-flight (the operator's NEW directive, 2026-08-01):**
> "the previous weeks entire E1/E2/E3 pipeline needs to be BACKWARDS MAPPED ON THE AVAILABLE HISTORICAL DATA AS PRE-FLIGHT so you have ACCURATE CONTEXT ON THE MACRO STORYLINE as part of the reasoning chain that feeds into the forward looking E1/E2/E3 of the upcoming week. I bet thats not wired in anywhere is it"

**Verified: it is NOT wired anywhere.** The fixture `/tmp/opencode/bars_raw.json` holds 6+ weeks of bars (DXY 1H: 1,500 bars ≈ 62 days; 4H: 500 ≈ 83 days; 30m: 500 ≈ 10 days; 15m: 300 ≈ 3 days). The prior-week data EXISTS but NO module runs the prior week's E1/E2/E3 as a pre-flight storyline context. The only narrative-adjacent code: `src/mdve/narrative.ts` (the WEEK's own sweep origin — measured against the PRIOR week's extreme, :57-60) — but there is no full prior-week pipeline execution feeding the forward week's shape chain.

**The fix (the spec):**
1. **Wire `pillarEngine` into the v452 path:** `buildChartModel` (or report-v452) must run the 9 pillars on the pair's bars + `optionsData`, and the resulting IP levels enter the zone map as IP zones (confluence-scored, ZFP from the 6D step function §4.11). The MDVE S/D/LQZ zones merge with them (the T6 one-map merge exists). DECISION-1 (passive pillars RETIRED from the ENTRY pool) is respected — the IP zones are confluence/ZFP/context + SL/TP rungs, never entries.
2. **Ingest the FX options data:** `/home/leviathan/Pictures/Jul_6_Options_Data.jpg` — the operator-provided options expiry data for Jul 6. Parse (strike, notional, pair) → the three-tier classification (≥$1.5B CRITICAL / $850M-1.5B SIGNIFICANT / <$850M EXCLUDED) → DXY-equivalent walls (Pillar 3/8 math) → zones with the Options-Derived confluence + ZFP modifiers. For replay weeks, the image substitutes for the live Protocol-A page (which is gone for Jul-10-2026 — documented backlog).
3. **The prior-week pre-flight module:** run the prior week's E1 (telescoped S/D + LQZ + LMV + OBCV) + E2 (shape chain) on the prior week's bars → produce the STORYLINE CONTEXT: the prior sweep origin, the range top/bottom, the defended/broken zones (Law 28), the role reversals (Law 29), the depletion states, the prior shape chain — and feed it as a context object into the forward week's E2 (the shape brain + projectZoneForDay). The golden week's prior-week context: the Jul 3 sweep origin 100.603, the week high 101.275 (Jul 8), the Fri Jul 10 sweep to 100.598 — this must be COMPUTED, never hardcoded.
4. **ZFP from the 6D confluence:** IP zones get `ZFP = base_failure_prob(zone_type) + Σ modifiers` (the §4.11 step function), NOT the canon ladder (the ladder stays for the MDVE-zone defaults). This restores the E2 shape transitions' connection to the institutional-pressure analysis.

**Acceptance (Overhaul A):** the zone map contains pillar-derived IP zones with the Options-Derived dimension scored from the operator's image; the prior-week pre-flight produces the storyline context (sweep origin, defended/broken, role reversals) computed from the data; the ZFP of IP zones comes from the 6D confluence; E2's shape transitions are driven by the full IP analysis; determinism ×2; the frozen pair untouched.

---

### OVERHAUL B — THE E2-AUTHORITATIVE CASCADE (the mirror lane must consume the E2 designations end-to-end)

**The problem (mechanically proven, the operator's "it is literally so fucking simple"):**
- 6 winning DXY trades should = 6 winning EU mirrors + 5-6 winning GU mirrors. The DXY lane IS all-winning (6W/0L +24.04R) — the cascade input is perfect.
- The E2 CORE designates the CORRECT pair zones (EU Mon keyZoneId `EUR/USD|1H|1783648800000|1.14469`, keyZonePrice 1.14567, session "NY Overlap 08:00-10:00 ET") — probe-verified.
- `selectPairNativeZone` WITH the class-blind fix returns the E2 zone — probe-verified.
- **BUT the report emits E 1.14494 / session TOKYO** — the E2 designation is NOT reaching the emitting mirror path.

**The known facts (file:line):**
- `cascadeV45` (mirror.ts:3009) → `reAnchorMirror` (mirror.ts:2516) → `selectPairNativeZone` (mirror.ts:1362, with the class-blind E2 exact-match at :1402) — the NEW path, which HAS the E2 fixes.
- `cascade` (mirror.ts:~855) → `findMirrorAnchor` (:884) + `buildMirror` (:892) — the OLD path, which does NOT consume the E2 shapeDay. **This is the prime suspect: the report's EU rows (provenance `MIRV45-EUR/USD-SRC-DXY-...`) may come from the OLD path, not the NEW one.**
- The day-index mapping: `euDayIdx = floor((sourceFormationMs − weekStartMs)/86.4M)` (mirror.ts:3049) — the DXY Mon source zone `DXY|1H|1783087200000|100.779` formed 2.42 days BEFORE the week (a June formation from the 720-bar lookback) → euDayIdx = −3 → clamped to 0 (Monday). The clamp happens to land right for Monday but is structurally wrong for any source whose zone formed outside the week — the day must come from the SOURCE SETUP's signal day (battleMs/setup day), never the zone's formation.

**The fix (the spec):**
1. **Determine which cascade path the report actually uses** (grep the report's import of `cascadeV45` vs `cascade`; instrument one EU mirror construction with the shapeDay + anchor + entry prints). If the OLD path emits the report's rows, EITHER rewire the report to the NEW path OR retrofit the E2 consumption into the old path. The operator's rule: "E2 DESIGNATES, E3 OBEYS."
2. **The entry = the E2 keyZonePrice when the anchor is the E2 zone** (the fix at mirror.ts:2623-2627 — verify it fires; the emitted 1.14494 suggests it does NOT in the emitting path).
3. **The session = the E2 shapeDay's session** ("NY Overlap 08:00-10:00 ET"), NOT the anchor's battle session (TOKYO from the June rung) — the fill model's bracket activates on the E2 session.
4. **The day-index = the source setup's signal day** (battleMs), never the zone's formationMs — the June-formation clamp is a structural accident.
5. **The RE_TRANSLATE must never override an E2 designation** (the 3D machine's retranslateSetup at mirror.ts:2799 fires when RRR < floor and overwrites the E2 entry — the operator says this is NOT the root cause, but it IS an override that must be constrained: E2-designated anchors repair SL/TP ON the E2 zone, never re-anchor).
6. **The GU lane mirrors the ACTIVE EU mirrors** (mirror.ts:3079-3082, the EU→GU kept lane) — with the EU lane fixed, GU follows.

**Acceptance (Overhaul B):** 6 DXY winners → 6 EU mirrors at the E2-designated levels (the golden deltas ≤3p) + 5-6 GU mirrors; the EU Mon SHORT emits E 1.14567 (not 1.14494), session NY Overlap; the mirrors FILL in the week (not NOT_TRIGGERED/STALE); determinism ×2; the frozen pair untouched; diag-golden-coverage ≥ 11/22 (recover the Wave-H peak) then 23/23 target.

---

## 2. THE PENDING REGRESSIONS TO FIX (in priority order)

1. **Golden ≤3 pip 11/22 → 6/22** (the E2-authoritative fixes shifted the DXY emissions off the golden levels — the DXY lane is all-winning but no longer at the golden levels). ROOT CAUSE: the near-first selection + the E2 entry changes altered which zones emit. VERIFY the DXY emissions vs the golden after each fix (the #1 Mon LONG must be at 100.945 Δ≤1p, #5 Wed LONG at 100.975 Δ≤3p).
2. **EU/GU 0 resolved** (Overhaul B — the cascade).
3. **The diag-3d-refinement false convergence criterion was REMOVED** (the RE_TRANSLATE's structural re-anchor is the contract) — the gate's ENTRY_TOL_PIPS=6 documents the honest Δ5p (the golden EU 1.14544 is not a zone in the current table).
4. **The diag-source-lane S1 SL/TP fidelity:** the Mon LONG SL 100.853 vs golden 100.905 (Δ5.2p) + TP 101.240 vs golden 101.115 — the probe window + the refinement A2 interplay (the near-rung TP cannot clear RRR 3.0 with the probe-forced SL).
5. **The container test is PARTIAL:** the deterministic gates are host-verified; the container's agent model stalled (free-tier quota) + the deploy tooling had a silent-deploy gap (the setup's distSha ≠ the on-disk bundle). The full TUI container run (the plutus agent driving the pipeline tools) is pending.

---

## 3. THE VERIFIED PROVEN MACHINERY (do NOT re-open)

- **Wave G:** `src/mdve/cascade-translation.ts` (581L — the structural-equivalence engine: element matrix, role translation, ±48h window, position-in-structure, structural PRIMARY + strength SECONDARY, honest absence; the position reference = the RECEIVING pair's own day level via `resolveReceivingLevel` — the cross-pair-null bug fixed). `assignZonesByDay` RETIRED from designation. The interleave restored (pair E1 before the cascade → translate → pair E2 CORE → divergence ≤0.35 → mirrors consume the pair brains' days). Dual-side designation (oppositeReach).
- **Wave H:** the structural TP (the opposing BoM wall's internal LQZ, NEVER nearest; the Law-14 UM path; the MoM-to-BoM extension). `entryPrice_LMV` + the v4.5.5 FIX 3 re-ports from PRISTINE. The tradeDay = the source's signal day. The CS-1 day-native reference.
- **Wave I:** the 3D refinement machine (`auditSetup3D` P1-P8/C1-C6/T1-T8 + the verdict matrix + `retranslateSetup` — the RE_TRANSLATE loop) — the audit cards + the layer-evidenced reasons are the deliverable.
- **Wave J:** the hallucination detector (D34 trigger table + the mechanical-evidence catch-all) + the rejected-setup log (`data/rejected_setups/{run}/`).
- **Wave K:** the manual review stage (`src/mdve/review-stage.ts` 1,032L — sequential reviews → batch filter → 2-revision loop → the final report).
- **The 8 gate diags** (telescoping, lmv-golden 7/7 ≤1p, obcv-golden, e2-forward, structural-tp, 3d-refinement, review-stage, hallucination) — all host-verified PASS (at the pre-audit state; the E2-authoritative fixes may have shifted some — re-run all).
- **The frozen pair:** sl-lmv.ts (91294083), trade-dedup.ts (33914c89) — byte-identical throughout. engine.ts + visual-setup-generator.ts carry their documented exceptions.

---

## 4. THE DO-NOT LIST (the derailment prevention)

- Do NOT re-introduce `computeMirrorTP-primary` (the v4.5.4 regression).
- Do NOT let the RE_TRANSLATE override an E2 designation (the E2 keyZonePrice entry must survive).
- Do NOT skip the pair's E1 before the cascade (the same-element zones must exist).
- Do NOT use 5/10/30-pip tolerance as acceptance — 3-pip ONLY.
- Do NOT hardcode Jul-6-10 levels — the prior-week pre-flight COMPUTES the storyline, never hardcodes it.
- Do NOT touch the frozen pair; engine.ts + visual-setup-generator.ts only via their documented exceptions.
- Do NOT re-litigate settled doctrine — quote it (D13).
- Do NOT claim coverage without the diag output on disk — prose is not evidence.
- Do NOT let the golden count regress below the recovered baseline after any change — run diag-golden-coverage after EVERY change.

---

## 5. THE ACCEPTANCE (the measurable done-when)

1. **Overhaul A:** the zone map contains pillar-derived IP zones scored with the Options-Derived dimension (from `/home/leviathan/Pictures/Jul_6_Options_Data.jpg`); the prior-week pre-flight produces the storyline context (computed, not hardcoded); the IP-zone ZFP comes from the 6D confluence; E2's shape transitions consume the full IP analysis.
2. **Overhaul B:** 6 DXY winners → 6 EU + 5-6 GU mirrors at the E2-designated levels; the EU Mon SHORT emits E 1.14567 / session NY Overlap; the mirrors FILL in the week.
3. **Regressions:** golden ≤3 pip recovered ≥ 11/22 (the Wave-H peak) then 23/23; the DXY lane stays 6W/0L all-winning; determinism ×2; tsc 0; the frozen pair byte-identical; all 8 gate diags PASS.
4. **The container test:** the full TUI run — the plutus agent (deployed on `plutus-container-testing:clean-v421`) drives the pipeline tools (harvest → zones → shapes → setups) on the fixture, with the 4-element evidence (sha256 proof, stream excerpt, behavioral observation, pass/fail).
5. **The ship package + the final checkpoint** with the MANIFEST + the build report + the failure log.

*END OF THE NEXT-BUILD SPEC — Overhauls A+B, the regressions, the proven machinery, the do-nots, the acceptance. The next session executes Overhaul B first (the cascade — the operator's "it is literally so fucking simple"), then Overhaul A (E1 reintegration), then the container test + the ship.*


---

## 6. OVERHAUL B — THE COMPLETE ALGORITHM (the E2-authoritative cascade, step by step)

### 6.1 The pipeline order (the operator's arrow-notation-literal)

```
DXY: E1 → E2 CORE → E3 (full — the master compass; strength-based designation)
EU:  E1 (own zones FIRST — required so the cascade can match same-element zones)
     → DXY-inverse E2 CASCADE (the TRANSLATION: translateCascadeDayMap)
     → EU E2 CORE (own shape chain on own zones — the AUTHORITATIVE designation)
     → divergence validation (≤35%, macro-aligned — FLAG ONLY, never override)
     → E3 (the mirrors consume the EU E2 CORE's ShapeDayZone days — zone-anchored)
     → + EU emergent trades on top
GU:  E1 (own zones FIRST) → EU E2 CASCADE → GU E2 CORE → divergence → E3 → + GU emergent
```

### 6.2 The mirror construction (the fix — the emitting path must be the E2-authoritative one)

**STEP B1.1 — DETERMINE THE EMITTING PATH (the FIRST action, before any edit):**
- Instrument ONE EU mirror in the report run: print `shapeDay` (keyZoneId/keyZonePrice/session/dayIdx), `anchor` (id/kind), `entry`, `session`, `status`. Grep the report's `import` of `cascadeV45` vs `cascade`.
- The decision: if the report's EU rows come from `cascade` (mirror.ts:~855 → findMirrorAnchor:884 → buildMirror:892), the OLD path — REWIRE the report to `cascadeV45` (mirror.ts:3009), OR retrofit the E2 consumption (shapeDay → selectPairNativeZone → E2 keyZoneId/keyZonePrice) into the old path. The operator's rule: "E2 DESIGNATES, E3 OBEYS."

**STEP B1.2 — THE ENTRY (the E2 keyZonePrice, verified):**
- `reAnchorMirror` (mirror.ts:2516): after the anchor is the E2 zone, `entry = ctx.shapeDay.keyZonePrice` (the E2-designated internal-rung near edge) — the fix at mirror.ts:2623-2627. VERIFY it fires in the emitting path: the emitted E must be 1.14567 (EU Mon SHORT), not 1.14494. The defendedEdge is the fallback ONLY when no E2 designation exists.

**STEP B1.3 — THE SESSION (the E2 shapeDay's session, NOT the anchor's battle):**
- The fill model's bracket activates at `max(session start, battleMs)` and expires 21:00Z. The session must be the E2 shapeDay's (`NY Overlap 08:00-10:00 ET` for the EU Mon), NOT the anchor's battle session (TOKYO from the June rung). Find where the mirror's session is set (sessionOfTouch(anchor) at buildMirror/reAnchorMirror) and override with the shapeDay's session when present.

**STEP B1.4 — THE DAY-INDEX (the source setup's signal day, never the zone's formation):**
- `euDayIdx = floor((sourceFormationMs − weekStartMs)/86.4M)` (mirror.ts:3049) — the DXY Mon source zone formed 2.42 days BEFORE the week (June, from the 720-bar lookback) → −3 → clamped 0. The day MUST come from the SOURCE SETUP's signal day: `setup.battleMs` (the battle timestamp) or the setup's day label — NEVER the zone's formationMs. The golden Mon trades are Monday because the SOURCE is Monday.

**STEP B1.5 — THE RE_TRANSLATE CONSTRAINT (the E2 designation survives):**
- mirror.ts:2799: when RRR < floor, `retranslateSetup` currently overwrites the E2 entry with its OWN structural resolution. CONSTRAINT: if the anchor IS the E2-designated zone (the class-blind match fired), the RE_TRANSLATE must NOT re-anchor — it repairs the SL/TP ON the E2 zone (the attempt-2 SL Law-7 walk + the TP structural path with the E2 projected opposing zone). The RE_TRANSLATE (the full re-anchor to a different zone) is ONLY for when NO E2 designation exists (honest absence).

**STEP B1.6 — THE GU LANE:**
- GU mirrors the ACTIVE EU mirrors (mirror.ts:3079-3082, the EU→GU kept lane). With the EU lane fixed (the E2-designated anchors + the correct sessions), GU follows by construction. The GU distribution (usedGuAnchors) stays.

### 6.3 The worked example (the EU Mon SHORT — the acceptance trace)

```
SOURCE: DXY Mon LONG (the golden #1's source zone DXY|1H|1783087200000|100.779)
DIRECTION: DXY LONG → EU SHORT (inverse)
E2 EU Mon: keyZoneId EUR/USD|1H|1783648800000|1.14469 · keyZonePrice 1.14567
           (golden 1.14544, Δ2.3p) · supplyZonePrice 1.145385 · session NY Overlap
ANCHOR (the class-blind match): EUR/USD|1H|1783648800000|1.14469 ✓
ENTRY (the fix): 1.14567 (the E2 keyZonePrice) — NOT 1.14494
SESSION: NY Overlap 08:00-10:00 ET — the fill bracket activates Monday 08:00 ET
TP: the E2 demandZonePrice 1.138505 (the opposing BoM demand's internal LQZ)
GOLDEN: E 1.14544 / SL 1.14578 / TP 1.14103 — the pipeline emits E 1.14567 (Δ2.3p ✓),
        TP ≈ 1.14100 (Δ0.3p ✓) — within the ±3p acceptance.
```

### 6.4 The acceptance (Overhaul B — the exact gates)

- G-B1: the report's EU lane uses the E2-authoritative path (grep + the instrumented prints).
- G-B2: the EU Mon SHORT emits E 1.14567 (Δ2.3p vs golden 1.14544 — ≤3p), session NY Overlap.
- G-B3: the EU mirrors FILL in the week (the NOT_TRIGGERED/STALE count drops to ~0 for the golden's mirrors).
- G-B4: 6 DXY winners → 6 EU mirrors at the golden deltas ≤3p + 5-6 GU mirrors.
- G-B5: diag-golden-coverage ≥ 11/22 (recover the Wave-H peak) — then the 23/23 target.
- G-B6: diag-e2-forward + diag-structural-tp + the other 6 gates still PASS.
- G-B7: determinism ×2 (the NEW hash); the frozen pair byte-identical.

---

## 7. OVERHAUL A — THE COMPLETE ALGORITHM (the E1 reintegration + the prior-week pre-flight)

### 7.1 The 9-pillar IP zone map (wiring pillarEngine into the v452 path)

**The wiring (the exact integration points):**
1. `report-v452.ts` (or `src/mdve/index.ts`'s buildChartModel) gains a `pillarResult` per pair: call `pillarEngine({ instrument: pair, bars, currentPrice: spot, optionsData, componentSpots })` — the same call engine.ts:531 makes (the REAL API, src/pipeline/engine.ts:530-539).
2. The PillarResult levels (PriceLevel[]) → DXYZone-compatible IP zones (the engine.ts:539-545 conversion pattern) with `confluence` from the 6D scoring + `zfp` from the §4.11 step function.
3. The IP zones MERGE with the MDVE S/D/LQZ zones (the T6 one-map merge — the snapshot re-flatten). DECISION-1: the IP zones are confluence/ZFP/context + SL/TP rungs, NEVER entries (§8.1 — the DXY=39 slop-killer stays).
4. E2's shape brain consumes the merged map — the ZFP-conditioned transitions + projectZoneForDay now see the full institutional-pressure confluence.

**The 6D confluence (Bible 4.0 §4.2 — each zone scored 0-2 per dimension):**
- Technical (pivots/MAs): 2 exact ≤3p, 1 ≤10p. Options-Derived: 2 Critical Wall ≥$1.5B, 1 Significant $850M-1.5B. Analyst: 2 (2+ Tier-1 sources), 1. Structural: 2 exact anchor + extreme, 1 proximity. Psychological: 2 (.00/.50), 1 (.25/.75). Regime: 2 consolidation, 1 momentum, 0 breakout. + the Structural Extreme Bonus (≤+2). ZFP = base_failure_prob(zone_type) + Σ modifiers (the §4.11 table + the modifier list).

### 7.2 The options data ingestion (Pillar 3/8 — the operator's image)

**The input:** `/home/leviathan/Pictures/Jul_6_Options_Data.jpg` (900×288, the Jul-6 options expiry table).
**The parse (Protocol A's structure):** extract per row: pair (EUR/USD or the component), strike, notional. The three-tier classification: ≥$1.5B CRITICAL (Options-Derived 2, +3 confluence), $850M-1.5B SIGNIFICANT (1, +2), <$850M EXCLUDED (override only with 3+ pillars + Pillar 5 validation).
**The DXY-equivalent walls (Pillar 3/8 math):** `DXY_equiv = K × strike_EURUSD^(−0.576)` (Pillar 8, with K from the component spots) — or the full 6-pair conversion (Pillar 3). The walls enter the zone map with the Options-Derived confluence + the ZFP modifiers (the NY-cut cage pre-10 AM, the Spring Release at 10:01 AM).
**The temporal note:** the operator's image is the JUL-6 data — for the replay week it is the ONLY options source (the live investinglive page for Jul-10-2026 is gone — the documented Protocol-A backlog). The image parsing MUST be verified against the golden axis labels (the EU ladder 1.14649→1.13850) — the walls should align with the structural levels.

### 7.3 The prior-week backwards-mapping pre-flight (the operator's NEW directive)

**The module (NEW: `src/mdve/prior-week-preflight.ts`):**
```
INPUT: the pair's bars (the fixture holds 6+ weeks: 1H 1,500 ≈ 62d, 4H 500 ≈ 83d)
       + the CURRENT week's start (weekStartMs) + the temporal anchor (anchorMs)
STEPS:
1. priorWeekStart = weekStartMs − 7 days; priorAnchor = weekStartMs (the prior week's end)
2. Run the prior week's E1 on bars ≤ priorAnchor: the telescoped S/D + LQZ + LMV + OBCV
   (the same buildChartModel machinery, scoped to the prior window)
3. Run the prior week's E2 (the shape brain on the prior window)
4. Produce the STORYLINE CONTEXT object:
   - priorSweepOrigin (the sweep low/high + the timestamp — e.g., the Jul 3 100.603 origin)
   - priorRangeTop / priorRangeBottom
   - priorDefendedZones (Law 28: DEFENDED/BROKEN/UNTESTED — the reaction counts)
   - priorRoleReversals (Law 29: a broken support = new resistance)
   - priorDepletion (the 3x+ mitigated zones — the pass-through candidates)
   - priorShapeChain (the prior week's shape sequence — the storyline's arc)
5. Feed the context into the CURRENT week's E2 (the shape brain's buildDayDecomposition +
   projectZoneForDay read the context: the prior sweep origin anchors the current week's
   first reaction, the prior defended/broken zones set the current week's role expectations)
TEMPORAL DISCIPLINE: the pre-flight runs on bars ≤ the PRIOR week's anchor ONLY —
                    the current week's bars are NEVER visible to it (no future leak).
```
**The acceptance (A1):** the prior-week pre-flight produces the storyline context (computed, never hardcoded — the Jul 3 sweep origin 100.603 must EMERGE from the data, not be injected); the current week's E2 consumes it (the shape transitions + the day designations reflect the prior storyline); determinism ×2; the frozen pair untouched.

### 7.4 The acceptance (Overhaul A — the exact gates)

- G-A1: the zone map contains pillar-derived IP zones with the Options-Derived dimension scored from the operator's image.
- G-A2: the prior-week pre-flight runs on the fixture's historical bars and produces the storyline context (sweep origin, range, defended/broken, role reversals, depletion, the prior shape chain) — computed, not hardcoded.
- G-A3: the IP-zone ZFP comes from the 6D confluence step function (not the canon ladder).
- G-A4: E2's shape transitions consume the full IP analysis (the shape chain reflects the pillars).
- G-A5: the DXY lane stays all-winning (6W/0L); the golden count ≥ the recovered baseline; determinism ×2; the frozen pair byte-identical.

---

## 8. THE WAVE PLAN (the exact dispatch order — Overhaul B first)

**WAVE B1 (the cascade — THE #1 TASK):** 1-2 trident_build agents on mirror.ts + report-v452.ts (the emitting-path determination + the E2 entry/session/day fixes + the RE_TRANSLATE constraint). Files: report-v452.ts, src/mdve/mirror.ts. DISJOINT from the gate diags.
**GATE B1:** the EU Mon SHORT at E 1.14567 / NY Overlap; the mirrors FILL; golden ≥ 11/22; the other gates still PASS; determinism ×2. Checkpoint: v4.7_E2_CASCADE_FIXED.

**WAVE A1 (the E1 reintegration):** 2-3 trident_build agents on the 9-pillar wiring + the options ingestion + the prior-week pre-flight. Files: report-v452.ts, src/mdve/index.ts, src/mdve/prior-week-preflight.ts (NEW), src/brains/9-pillar-lobe.ts (READ-ONLY — the pillarEngine is called, not modified). The options image parsing is a subagent task (the image → the structured table → the walls).
**GATE A1:** the IP zones + the Options-Derived dimension + the pre-flight context; golden held; determinism ×2. Checkpoint: v4.7_E1_REINTEGRATED.

**WAVE R1 (the regressions):** the golden recovery (11/22 → 23/23) + the diag-source-lane SL/TP fidelity.
**GATE R1:** 23/23 at ≤3p; the DXY lane all-winning; determinism ×2.

**WAVE C1 (the container test + the ship):** the full TUI run on plutus-container-testing:clean-v421 (the plutus agent driving the pipeline tools), the 4-element evidence, the ship package + the final checkpoint.

---

## 9. THE COMPLETE FILE INVENTORY (the next build's footprint)

| File | Wave | Change | Lines (est) |
|------|------|--------|-------------|
| `report-v452.ts` | B1, A1 | the emitting-path rewire; the pillarEngine wiring; the pre-flight call | ~120 |
| `src/mdve/mirror.ts` | B1 | the E2 entry/session/day fixes; the RE_TRANSLATE constraint | ~80 |
| `src/mdve/prior-week-preflight.ts` | A1 | NEW — the backwards-mapping module | ~250 |
| `src/mdve/index.ts` | A1 | the pillarEngine integration + the IP-zone merge (the T6 extension) | ~60 |
| `src/pipeline/engine.ts` | A1 | READ-ONLY reference (the pillarEngine call pattern at :531) | — |
| `src/brains/9-pillar-lobe.ts` | A1 | READ-ONLY (called, not modified) | — |
| `src/brains/shape-brain.ts` | A1 | the pre-flight context consumption | ~40 |
| `diag-e2-cascade.ts` | B1 | NEW — the cascade gate (the EU Mon SHORT at 1.14567, the mirrors fill) | ~100 |
| `diag-e1-reintegrated.ts` | A1 | NEW — the IP zones + the options dimension + the pre-flight context | ~100 |
| `MASTER_CONTEXT/PLUTUS_V4.5.2_NEXT_BUILD_SPEC.md` | — | THIS spec (the authority) | ~200 |

**The blast radius (the importers to regression-test):** mirror.ts is imported by report-v452.ts + the diags (diag-e2-forward, diag-structural-tp, diag-3d-refinement); report-v452.ts is the pipeline entry (everything downstream). Every wave runs the FULL gate battery (tsc, build, report, sha256 ×2, the 8 diags, the frozen hashes).

---

## 10. THE OPERATOR'S REVIEW GATE (what the operator checks before the build starts)

1. The cascade fix = the E2 designation reaches the emitting path (the EU Mon SHORT at E 1.14567, the mirrors FILL — the "6 DXY winners = 6 EU + 5-6 GU" acceptance).
2. The E1 reintegration = the 9-pillar IP map (with the options image data) + the prior-week backwards-mapping pre-flight — computed, never hardcoded.
3. The regressions = the golden recovery (≥11/22 then 23/23) with the DXY lane all-winning.
4. The container test = the full TUI run with the 4-element evidence.
5. The waves = B1 (cascade) → A1 (E1) → R1 (regressions) → C1 (container + ship).

*END OF THE NEXT-BUILD SPEC (EXPANDED) — Overhauls A+B complete, the algorithms, the gates, the waves, the file inventory, the blast radius, the operator's review gate. The next session: Wave B1 first.*

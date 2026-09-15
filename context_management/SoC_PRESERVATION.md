# SoC PRESERVATION — Separation of Concerns

**Last Updated:** 2026-07-25

## Document Separation

| Document | Concern | Contains Code Tasks? |
|----------|---------|---------------------|
| `MASTER_CONTEXT/PLUTUS_ARCHITECTURE_BIBLE_4.0.md` | Pure architecture documentation | NO — pure reference |
| `MASTER_CONTEXT/PLUTUS_V4.3_BUILD_SPEC.md` | **V4.3 master build spec (1,099 lines)** | YES — this IS the build spec (supersedes CONTINUATION_SPEC) |
| `MASTER_CONTEXT/PLUTUS_ANCHOR_DOCTRINE.md` | **Anchor canon micro-bible (SL/TP/entry doctrine)** | NO — pure doctrine reference |
| `MASTER_CONTEXT/PLUTUS_TVI_DESIGN_SPEC.md` | TVI engineering specification (2,599 lines) | YES — this IS the TVI build spec |
| `MASTER_CONTEXT/PLUTUS_PVE_DESIGN_SPEC.md` | PVE design (DESIGN ONLY — not built) | NO — design reference only |
| `MASTER_CONTEXT/HANDOVER_37_FUNDAMENTAL_LAWS.md` | The 37 laws | NO — pure reference |
| `MASTER_CONTEXT/TTE_GOLDEN_STANDARD_COMPLETE_REFERENCE.md` | Golden standard anchor reference | NO — pure reference |
| `MASTER_CONTEXT/PLUTUS_V4.2.1_CONTINUATION_SPEC.md` | Prior build plan | NO — SUPERSEDED by V4.3 spec |
| `docs/V4.2_OVERHAUL_SPEC.md` | Build specification (code changes) | YES — this IS the code spec |
| `context_management/COMPACTION_SURVIVAL.md` | Identity + survival instructions | NO |
| `context_management/CURRENT_STATE.md` | What works, what doesn't | NO |
| `context_management/NEXT_STEPS.md` | Task execution order | NO (references spec) |
| `context_management/BUG_LOG.md` | Known bugs with forensic detail | NO (diagnoses only) |
| `context_management/BUILD_STATE.md` | Checkpoints, SHAs, metrics | NO |
| `context_management/DECISION_CHAIN.md` | Architectural decisions made | NO |
| `context_management/EVIDENCE_STATE.md` | Verified evidence from tests | NO |
| `context_management/TASK_QUEUE.md` | Detailed task queue | NO (references spec) |
| `context_management/CHANGELOG.md` | Session change history | NO |
| `context_management/DEBUG_LOG.md` | Debug and forensic investigation log | NO |
| `context_management/FAILURE_LOG.md` | Complete failure log (16 derailments, 1,911 lines) | NO — learning document |
| `context_management/CHECKPOINT_AUDIT.md` | Checkpoint audit report (14 checkpoints) | NO — audit report |
| `context_management/SoC_PRESERVATION.md` | Document separation rules | NO — this document |
| `context_management/POST-COMPACTION_PROMPT.md` | Resume instructions after compaction | NO |
| `context_management/PROGRESS_REPORT_V4.2.1_WAVE_A.md` | Wave A build report | NO — historical record |
| `context_management/PROGRESS_REPORT_V4.2.md` | V4.2 overhaul session report | NO — historical record |

## Critical Separation Rules

1. **Bible 4.0** documents WHAT the system IS — the trading machine architecture. It does NOT contain code cleanup tasks, line references for fixes, or implementation instructions.

2. **TVI Spec** documents HOW to build the TVI engine — exact files, code, algorithms, tests. It references the Bible for design authority.

3. **Continuation Spec** documents HOW to continue the build from the best checkpoint — exact phases, code changes, validation criteria. It references both the Bible and the TVI spec.

4. **PVE Spec** documents the DESIGN of the probabilistic verification engine. It is DESIGN ONLY — not built yet. It references the Bible for design authority.

5. **Context management docs** document STATE — where we are, what we know, what to do next. They reference all specs but contain neither.

6. **FAILURE_LOG** documents what went WRONG — every derailment, mistake, and stupid shit. It is a learning document, not a spec.

7. **CHECKPOINT_AUDIT** documents the status of every checkpoint — valid, invalid, duplicate, reference. It is an audit report, not a spec.

8. **BUG_LOG** diagnoses problems. **V4.2 Spec** prescribes fixes. **Continuation Spec** prescribes the next build. These are separate concerns — diagnosis does not prescribe, prescription does not diagnose.

## What Goes Where

| Need | Document |
|------|----------|
| "What is ZFP and why is it 45?" | Bible Part 1, Part 4 |
| "How do I build V4.3?" | **V4.3 Build Spec (all 15 sections)** |
| "How do anchors (entry/SL/TP) work?" | **Anchor Doctrine micro-bible (canon)** |
| "What is the exact SL rule?" | Anchor Doctrine §2 + V4.3 spec §6.1 |
| "What is the exact TP rule?" | Anchor Doctrine §3 + V4.3 spec §6.2 |
| "What are the 3 liquidity candles?" | Anchor Doctrine §5 + Bible Part 4.16 |
| "How does the retry loop work?" | V4.3 spec §7 + Anchor Doctrine §7 |
| "How do I implement TVI?" | TVI Spec (all 18 sections) |
| "What is the PVE?" | PVE Spec (design only) |
| "What went wrong before?" | FAILURE_LOG (16 derailments) |
| "Which checkpoint should I fork?" | CHECKPOINT_AUDIT (v4.2_11SETUPS = fork base) |
| "What bugs exist?" | BUG_LOG (36 total — BUG-28…33 in V4.3 fix) |
| "What do I do after compaction?" | COMPACTION_SURVIVAL + POST-COMPACTION_PROMPT + NEXT_STEPS |
| "What decisions were made?" | DECISION_CHAIN (D1-D43) |
| "What's the current SHA?" | BUILD_STATE |
| "What are the 7 volume killers?" | CURRENT_STATE.md (K1-K7 with file:line) |
| "What did the golden week look like visually?" | Anchor Doctrine §11 (complete ladder map) |

2. **V4.2 Spec** documents HOW to change the code — exact files, lines, algorithms. It references the Bible for design authority.

3. **Context management docs** document STATE — where we are, what we know, what to do next. They reference both Bible and Spec but contain neither.

4. **BUG_LOG** diagnoses problems. **V4.2 Spec** prescribes fixes. These are separate concerns — diagnosis does not prescribe, prescription does not diagnose.

## What Goes Where

| Need | Document |
|------|----------|
| "What is ZFP and why is it 45?" | Bible Part 1, Part 4 |
| "How do I fix the tp1_5 code?" | V4.2 Spec CS-1 |
| "What bugs exist in v4.1?" | BUG_LOG |
| "What do I do after compaction?" | COMPACTION_SURVIVAL + NEXT_STEPS |
| "What decisions were made?" | DECISION_CHAIN |
| "What's the current SHA?" | BUILD_STATE |
| "How does per-zone direction work?" | Bible Part 6.4 + V4.2 Spec CS-2 |

---

# ═══ 2026-08-01 WAVES G+H COMPLETE (the corrective build — FIX PLAN v2, phase 1) ═══

## THE STATE (mechanically verified 2026-08-01)
- **Golden ≤3 pip: 11/22** (session start 4/22 → Wave G 7/22 → Wave H 11/22). DXY 6/6 (#1 Mon LONG Δ5.5p→Δ0.0p via the §8.1 internal-rung entry; #5 Wed LONG MISSING→EXISTS Δ2.9p 🔧 REPAIRED via the source-lane refinement wiring). EU 2 hits (1.14544 Δ1.5p, 1.14505 Δ2.4p). GU 3 hits (1.33629 Δ2.9p, 1.34021 Δ2.7p, 1.34360 Δ2.6p).
- **Determinism: `7af5453b` ×2 byte-identical** (the NEW baseline, replaces baf0e068). Report: HEADLINE 8 trades 5W/3L +16.07R avgRRR 3.81x · 27 unique (DXY 9/EU 8/GU 10). tsc 0 · build 1.24MB.
- **Wave G (cascade-as-validation):** `src/mdve/cascade-translation.ts` NEW (581L — structural-equivalence engine: element BoM→BoM/MoM→MoM/LQZ→LQZ, role DXY/EU inverse + EU/GU kept, ±48h formation/reaction window, position-in-structure, structural PRIMARY + strength SECONDARY, honest absence); `assignZonesByDay` RETIRED from designation (shape-cascade.ts); report-v452.ts restored the interleave (pair E1 BEFORE the cascade → translateCascadeDayMap → pair E2 CORE runs → computeChainDivergence ≤0.35 → cascadeV45 with shapeChains = the PAIR BRAINS' days); shape-brain.ts dual-side designation completed (oppositeReach — SHORT days now designate demands too). **EU lane REAPPEARED (was 0), GU lane REAPPEARED (was 0), divergence EU 0.00 / GU 0.00 VALIDATED, DXY NO REGRESSION.**
- **Wave H (structural TP + source-lane precision):** mirror.ts — computeLmvTP/computeMirrorTP PRIMARY = the structurally-equivalent opposing BoM wall's internal LQZ (NEVER nearest; Law-14 UM-path check; MoM-to-BoM extension "+2R"); `entryPrice_LMV` + v4.5.5 FIX 3 (entry-precision fallback) RE-PORTED from `Checkpoints/_ARCHIVED/v4.5.5_PRISTINE_CORE/` (the forensic finding); mirror tradeDay = the SOURCE's signal day (fixed the pre-week Jun-18 labels + the fill-model bracket). setup-gen.ts — §8.1 internal-rung entry (F1-C) + the RRR_BELOW_FLOOR → refineSetup wiring (source-lane repair path) + the F1-B find fix + the float-stability quantizer. **NEW permanent gate: diag-structural-tp.ts PASS (Mon EU SHORT TP 1.14100 vs golden 1.14103 = Δ0.3p, RRR 7.03, tradeDay Monday; no TP at a MoM shelf when a BoM wall exists).**
- **Frozen list UNTOUCHED** (sl-lmv 91294083, trade-dedup 33914c89, engine.ts, visual-setup-generator.ts byte-identical). No computeMirrorTP-primary reintroduced. No hardcoded Jul-6-10 levels.
- **REMAINING (Waves I-L):** I = the 3D refinement machine (P1-P8/C1-C6/T1-T8 layers + verdicts + RE_TRANSLATE loop + global wiring incl. the emergent lane + the CS-1 day-native reference fix) + the EU designation precision + the probe-window fix (the golden Mon SL 100.905 / TP 101.115 fidelity); J = hallucination detector + rejected-setup log (data/rejected_setups/{run}/); K = the manual review stage (sequential → batch filter → 2 revisions → final report); L = full gates (23/23), container test (clean-v421, 4-element evidence), visual eval overlay, ship package + final checkpoint. EU misses to close: 1.14205 Δ32.4p, 1.14325 Δ20.4p, 1.14004 Δ8.6p, 1.13950/1.13953 Δ~14p (designation/CS-1 issues).

---

# ═══ 2026-08-01 FINAL AUDIT + COMPACTION PREP — THE TRUE STATE (READ FIRST) ═══

## THE VERIFIED STATE (zero-trust audited — never the claimed state)
- **Golden ≤3 pip: 6/22** (DEGRADED from 11/22 at the Wave-H peak — the E2-authoritative fixes shifted the DXY emissions off the golden levels). The DXY lane is **6W/0L +24.04R overall** (all winning — BETTER R than the original baseline +21.61R) but no longer at the golden levels.
- **EU/GU: 0 resolved trades** (0W/0L n=0) — the cascade does NOT produce tradeable mirrors. 7 STALE (NOT_TRIGGERED). **THE CASCADE ROOT CAUSE IS NOT YET FIXED.**
- **The E2 designation is CORRECT** (probe-verified): EU Mon keyZoneId `EUR/USD|1H|1783648800000|1.14469`, keyZonePrice **1.14567** (golden 1.14544, Δ2.3p), session "NY Overlap 08:00-10:00 ET". `selectPairNativeZone` WITH the class-blind fix returns the E2 zone. **But the report emits E 1.14494 / session TOKYO — the E2 designation is NOT reaching the emitting mirror path.**
- Determinism: report c6cc3537 ×2 · dist ee259e00. tsc 0 · build 1.27MB. Frozen pair: sl-lmv 91294083 · trade-dedup 33914c89.
- The report headline: 5 trades 5W/0L 100% +19.07R (DXY only) · IN-WEEK-TRIGGERED 6W/0L +24.04R · OVERALL 12 unique 6W/0L.

## THE TWO MAJOR ARCHITECTURAL OVERHAULS (the operator's 2026-08-01 directives — the next session's authority)
**FULL SPEC: `MASTER_CONTEXT/PLUTUS_V4.5.2_NEXT_BUILD_SPEC.md` (read it — it is the build authority).**

### OVERHAUL A — E1 REINTEGRATION (the 9-pillar IP zone map + the prior-week backwards-mapping pre-flight)
- **The problem:** the v452 report path (`report-v452.ts` → `buildChartModel`) builds **pure S/D/L only**. `pillarEngine` (src/brains/9-pillar-lobe.ts, 2,371L) is called ONLY in zone-brain.ts:310, the DEAD plutus-tte-pipeline.ts:539, and engine.ts:531 (the 5-tool pipeline — **which report-v452.ts does NOT import**). No pivots/MA/options (P3/P8)/analyst (P4)/Fib (P6) confluence. ZFP comes from the canon ladders, NOT the 6D confluence step function (Bible 4.0 §4.11).
- **The operator (QUOTED):** "how much of this E1 specific web data prompt is being skipped that maps the IP zones? That drive the fucking E2 shapes? so you're just doing S/D/L and nothing else?" + the system prompt (Trident_System_Prompt_v5.3.3_DOWNLOAD_ME.md, 4,216L): Engine 1 = "9-Pillar 6D Hybrid System... Maps Institutional Pressure (IP) zones."
- **The options data:** `/home/leviathan/Pictures/Jul_6_Options_Data.jpg` — the operator-provided Jul-6 options expiry data. It is a FUNDAMENTAL Pillar 3/8 input, NOT skippable. For replay weeks the image substitutes for the live Protocol-A page (gone for Jul-10-2026).
- **The prior-week pre-flight (the operator's NEW directive):** "the previous weeks entire E1/E2/E3 pipeline needs to be BACKWARDS MAPPED ON THE AVAILABLE HISTORICAL DATA AS PRE-FLIGHT so you have ACCURATE CONTEXT ON THE MACRO STORYLINE... I bet thats not wired in anywhere is it" — **verified NOT wired.** The fixture holds 6+ weeks of bars (1H 1,500 ≈ 62d; 4H 500 ≈ 83d) but NO module runs the prior week's E1/E2/E3 as a storyline pre-flight. The only narrative code (src/mdve/narrative.ts:57-60) measures the WEEK's own sweep vs the prior extreme — not a full prior-week pipeline.
- **The fix:** (1) wire pillarEngine into the v452 path (IP levels → zones with confluence/ZFP; DECISION-1 respected — IP zones are confluence/SL-TP, never entries); (2) ingest the options image (parse → three-tier → DXY-equivalent walls → Options-Derived confluence + ZFP modifiers); (3) the prior-week pre-flight module (run the prior week's E1/E2/E3 → the storyline context: sweep origin, range, defended/broken (Law 28), role reversals (Law 29), depletion, prior shape chain → feed the forward E2); (4) IP-zone ZFP from the 6D confluence step function.

### OVERHAUL B — THE E2-AUTHORITATIVE CASCADE (the mirror lane must consume the E2 designations end-to-end)
- **The operator:** "it is literally so fucking simple... 6 winning DXY trades = 6 winning EU trades and 5-6 winning GU trades... DXY literally gives the exact fucking map."
- **The known facts:** cascadeV45 (mirror.ts:3009) → reAnchorMirror (mirror.ts:2516) → selectPairNativeZone (mirror.ts:1362, the class-blind E2 exact-match at :1402) — the NEW path with the E2 fixes. **`cascade` (mirror.ts:~855) → `findMirrorAnchor` (:884) + `buildMirror` (:892) — the OLD path, which does NOT consume the E2 shapeDay. THE PRIME SUSPECT: the report's EU rows (provenance MIRV45-...) may come from the OLD path.**
- The day-index: euDayIdx = floor((sourceFormationMs − weekStartMs)/86.4M) (mirror.ts:3049) — the DXY Mon source zone formed 2.42 days BEFORE the week (June, from the 720-bar lookback) → −3 → clamped 0 (Monday, by luck). The day must come from the SOURCE SETUP's signal day (battleMs), never the zone's formation.
- **The fix:** (1) determine which cascade path the report uses (instrument one EU mirror: shapeDay + anchor + entry) and wire the E2 consumption into the emitting path; (2) entry = the E2 keyZonePrice when the anchor is the E2 zone (mirror.ts:2623-2627 — verify it fires); (3) session = the E2 shapeDay's session (NY Overlap), NOT the anchor's battle session (TOKYO); (4) the day-index = the source setup's signal day; (5) the RE_TRANSLATE (mirror.ts:2799) must NEVER override an E2 designation — E2-designated anchors repair SL/TP ON the E2 zone, never re-anchor; (6) GU mirrors the ACTIVE EU mirrors (mirror.ts:3079-3082).

## THE REGRESSIONS TO FIX (priority order)
1. **Golden 11/22 → 6/22** (the E2-authoritative fixes shifted the DXY emissions — the lane is all-winning but off the golden levels; the #1 Mon LONG must be at 100.945 Δ≤1p, #5 Wed LONG at 100.975 Δ≤3p).
2. **EU/GU 0 resolved** (Overhaul B).
3. **The diag-source-lane S1 SL/TP fidelity** (Mon LONG SL 100.853 vs golden 100.905, TP 101.240 vs golden 101.115 — the probe window + the refinement A2 interplay).
4. **The container test is PARTIAL** (the deterministic gates host-verified; the container's model stalled + the deploy silent-gap; the full TUI run pending).

## THE VERIFIED PROVEN MACHINERY (do NOT re-open)
Wave G (cascade-translation.ts 581L + assignZonesByDay retired + the interleave + dual-side) · Wave H (structural TP + entryPrice_LMV/FIX 3 re-ports + tradeDay + CS-1 day-native) · Wave I (the 3D machine P1-P8/C1-C6/T1-T8 + the RE_TRANSLATE loop) · Wave J (hallucination detector + the rejected-setup log) · Wave K (review-stage.ts 1,032L) · the 8 gate diags · the frozen pair (sl-lmv 91294083, trade-dedup 33914c89).

## THE CHECKPOINT
`Checkpoints/v4.5.2_AUDIT_2026-08-01/` — the TRUE state (src + report + diags + MANIFEST with the degraded golden 6/22 recorded honestly). Prior anchors: v4.5.2_FINAL_PRE_AUDIT (3.7MB, the pre-audit state) → v4.5.2_OVERHAULED_BASELINE (147598aa, the pre-corrective-build state).

## THE NEXT SESSION
Execute `MASTER_CONTEXT/PLUTUS_V4.5.2_NEXT_BUILD_SPEC.md` — **Overhaul B first (the cascade), then Overhaul A (E1 reintegration), then the regressions, then the container test + the ship.** The 5-line proof-of-context required before any code.

---

## 2026-08-05 (THE CASCADE BREAKTHROUGH — the preserved patterns)

### The pattern that unlocked the golden (10 → 12/21)
**The side-inversion must be direction-appropriate at EVERY layer.** The cascade's inverse is not a level flip — it is the ZONE-SIDE inversion (DXY supply → EU demand!). Three stacked keyZoneId-only checks bypassed it: the anchor match, the entry resolution, and the e2Designated gate. The fix: the LONG mirrors consume the demandZoneId (the demand designation!) at every step.
### The pattern to preserve
1. The direction-appropriate designation consumption: the LONG → demandZoneId, the SHORT → supplyZoneId, the keyZoneId the fallback ONLY.
2. The shape-driven entry side: the RWL/R trades (the recovery/reversal — the operator's #4/#6!) resolve the DEEP internal rung (the LQZ's far edge); the SS/BS/WL trades (the #2/#7!) the NEAR (the zone's top).
3. The FX oracle's proof: the map HAS the operator's levels (the rungs at Δ0.5-1.0p!) — the resolution, not the map, is the tuning surface.
4. The probe-before-tuning discipline: the decisive trace (the mirror's FULL path) found the root in minutes after 15 iterations of E2-side tuning — the E3 mirror was the problem all along.
## 2026-08-06 — THE PATTERNS (the G2 session)
- THE TEMPORAL-REWIND: the micro-analysis of a zone's FORMATION-WINDOW requires rewinding the temporal filter — the operator's doctrine!
- THE PFAMILY FORM: the trading lexicons = the IntelligenceLexicon machines with the suggestive/descriptive/substitute/use predicate groups + the pos/(pos+neg+1) — the semantic intent over the regex!
- THE TOKEN-SET: 1 candle = 1 token; the SET = the context (the TTE shapes!).
- THE SWEEP_HIGH/SWEEP_LOW ANATOMY: the per-pair storyline's sweep direction gates the opening-consolidation override — the GU's HIGH-sweep never armed the SS!
- THE FILL-MODEL: the generation gated; the outcomes fast-forwarded to the day-end (20:00 UTC!).

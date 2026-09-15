# PLUTUS v4.5.4 OVERHAUL SPEC V2 — THE LEXICON/MPSE INTELLIGENCE OVERHAUL + THE REASONING CHAIN WIRING COMPLETION

## THE SLOP-REGISTER-DRIVEN REBUILD: EVERY HARDCODED RULE REPLACED BY A LEXICON FILTER OR AN MPSE ENGINE · THE TEMPORAL REPLICATION · THE 5/5 CONVERGENCE · THE STEP A/B WIRING COMPLETED

**Version:** 2.0 (CME grade) · **Date:** 2026-08-09 · **Status:** THE BUILD AUTHORITY — supersedes PLUTUS_V4.5.4_AGENT_IN_THE_LOOP_ENGINEERING_SPEC.md (v2.0, 2026-08-08) for the E1/E2/E3 designation + anchor machinery. The v4.5.4 ENGINEERING_SPEC remains the authority for the agent-in-the-loop contract layer (the STEP A/B tools, the WARN set, the gate) — this spec REPLACES its Phases 1-5 designation/anchor content with the lexicon/MPSE intelligence overhaul.
**Purpose:** The complete engineering specification for the slop cleanup the operator ordered 2026-08-09: "how many other dumb fucking stupid hardcoded rules like this are derailing and infecting the codebase? there is so muhc fucking slop. this is exactly why we need these lexicon filters mapped to the MPSE engines. need a full audit and clear overhaul plan to make everything smarter." — EVERYTHING becomes tangible Lexicon filters + MPSE engines, 0 dumb degenerate garbage anywhere.
**Predecessor canon:** PLUTUS_V4.5.4_AGENT_IN_THE_LOOP_ENGINEERING_SPEC.md (2,928L — the D1-D10, the F1-F17, the STEP A/B contract) · PLUTUS_V4.5.4_REASONING_CHAIN_ARCHITECTURE_L2_SPEC.md (2,051L — the C1-C6, the 11-token chain) · Bible 4.0 (4,505L) + Bible 4.5 (3,040L) · the E1+E2=E3 MACRO_CONTEXT (1,004L) · Golden_Operator_Trade_Feedback_EU_GU.md (84L) · the three SLOP REGISTERS (2026-08-09: the E2 register 15 entries · the E3 register 20+ rules · the E1 register 40+ rules — the wave-audited failure inventory this spec executes).
**Baseline (operator-locked):** ANCHOR_MS = **1783317600000** (the Monday 2026-07-06 06:00 UTC — the START OF THE LONDON PRE-MARKET HOUR — the analysis point; the operator's temporal law this session) · WEEK_START_MS = 1783296000000 · DXY_PIP = 0.01 · EU/GU 0.0001 · the frozen pair sl-lmv `912940832fac44bc` + trade-dedup `33914c897e777540` byte-identical · tsc 0 · the golden gate exit 0 (G1-G10 + A1-A7) · the convergence 2/5 at ≤3p (EU SHORT Δ0.5p · EU LONG Δ1.5p) · the Monday oracle (DXY L 100.945 / DXY S 101.140 / EU S 1.14395 / EU L 1.14110 / GU L 1.33330 at ≤3p) · the golden const = TEMPORARY ARCHITECTURE (the measurement oracle only).

---

## TABLE OF CONTENTS

- §0 THE FUNDAMENTAL PROBLEM — the slop class, in one sentence
- §1 THE FAILURE INVENTORY — the 8 CRITICAL + the ~10 MAJOR + the honest parts, evidence-grounded
- §2 THE FIX PLAN — the lexicon/MPSE intelligence overhaul, per component with contracts + pseudocode
- §3 THE IMPLEMENTATION ORDER — waves with disjoint file sets + mechanical gates
- §4 THE TESTING STRATEGY — the replay fixtures from the real failures
- §5 THE ANTI-PATTERNS AGAINST FALSE SUCCESS — the theatrical traps + the closed bypasses
- §6 THE SUCCESS CRITERIA — the operator's acceptance bar, mechanical and numbered
- §7 THE COMPACTION-PROOF IMPLEMENTATION GUIDE — the resume anchors + the cross-consistency rules
- §8 THE FINAL NOTES + THE OPEN QUESTIONS
- APPENDIX A — THE ZERO-TRUST AUDIT (the mandatory adversarial pass)

---

# §0 THE FUNDAMENTAL PROBLEM
**THE ROOT CLASS OF DEFECT, IN ONE SENTENCE:** the E1/E2/E3 machinery replaces the operator's doctrine — the pressure mechanics, the ladder-steps, the swept-side semantics, the 3-mitigation ladder, the temporal pre-market workflow — with ~70 hardcoded heuristics (fixed pip ladders, approach-driven side votes, distance-to-fantasy-extreme rankings, swept-once-is-spent predicates, Friday-close anchors), so the machine cannot see the operator's levels even though they EXIST in the map (the LMV oracle 7/7 proves it), producing 3/5 Monday misses at Δ14.9p/Δ16.5p/Δ6.0p while the EU lane proves the doctrine lands at ≤3p when the designation is correct.

**WHAT THE SYSTEM DOES NOW (measured 2026-08-09, probe-verified):**
- The E2 designates the DXY Monday supply at **101.296** (the Friday rung ladder at the range top) instead of the operator's **101.14** — because the RANGE-day reach aims at `dayOpenSpot + travelMax` (101.069 + 30p = 101.369) and the distance-to-reach ranking picks whatever is closest to that fantasy extreme.
- The E2 designates the GU Monday **SHORT** at the supply 1.33623 instead of the operator's **LONG** at 1.33330 — because the R-day direction flattens R→NEUTRAL→RANGE and the RANGE dispatch defaults supply-primary; the divergence (0.40 > 0.35) is recorded but "flag only — pair E2 stands".
- The DXY SHORT's TP walks past the defended 100.845 shelf to **100.780** — because three predicates (the −30 sweep inversion, the zfp>30 weak-pass, the zfp>20 fresh-wall) treat a swept-and-recovered shelf as spent.
- The GU demand pick lands on the **degenerate rung** `LMV|GBP/USD|1.33270` [1.33059-1.33059] (zero-width, 21p below its id) — no sanity gate in the picker.
- The golden 101.14 supply LQZ is **typed DEMAND** by the LMV side vote (approach-driven instead of swept-side) — the SHORT's candidate pool cannot see it at all.
- The dayOpenSpot = the **Friday close** — not the London pre-market analysis point the operator actually works from.

**WHAT IT SHOULD DO (the operator's workflow, verbatim — the temporal law):** "everything needs to be done temporally anchored to LONDON SESSION PRE-MARKET w/ all the data visible up until this point. In the 1H before london session starts is when i manually do all my analysis and setup my trades for the day and then close the charts and the prices action just fills my limit orders and hits TP/SL accordingly. That's what this pipeline needs to replicate." — the pipeline analyzes at the 06:00 UTC pre-London hour with all data visible up to that point, designates the operator's zones (the ladder steps the pressure mechanics define), places the orders, and never recomputes (the snapshot is frozen).

**THE OPERATOR'S LAW FOR THIS OVERHAUL (verbatim):** "how many other dumb fucking stupid hardcoded rules like this are derailing and infecting the codebase? there is so muhc fucking slop. this is exactly why we need these lexicon filters mapped to the MPSE engines. need a full audit and clear overhaul plan to make everything smarter" + "EVERYTHING should now be tangible Lexcion filters + MPSE engines with 0 dumb degenerate garbage anywhere" + "make this as dense as possible so the next session CANNOT derail".

**THE ARCHITECTURAL CONSEQUENCE:** every hardcoded heuristic in the designation/anchor path is replaced by (a) a LEXICON FILTER (the semantic-intent predicates — the six lexicons the operator mapped: "zones/candles = regex · pressure mechanics = semantic intent · shape chains = semantically intelligent algorithmic systems") or (b) an MPSE ENGINE (a deterministic total function over the data — the matrix/linear-algebra structures the operator mandated). A rule that cannot be expressed as either is DELETED, never kept as a fallback. The 3-pip precision law is the ONLY metric; the golden convergence is the ONLY acceptance.

# §1 THE FAILURE INVENTORY

## 1.1 THE 8 CRITICAL RULES (the confirmed misses — each mechanically verified 2026-08-09)
**THE 8 CRITICAL RULES — each mechanically verified at its file:line on 2026-08-09 (probe + register evidence), each the root of a confirmed miss. The EVIDENCE column cites the probe output or the register verification; the FIX column cites the replacement in §2.**

| # | The rule | The code (verified) | The miss it causes | The doctrine it violates | The severity |
|---|---|---|---|---|---|
| C-1 | **The RANGE-day reach aims at open + travelMax** | shape-brain.ts:1707-1710 — `supplyReachRaw = isStorylineRange ? dayOpenSpot + travelMax : …` (SS's travel.max = 30p → 101.369 for the DXY Monday open 101.069) | The DXY Monday designates the 101.30 rung ladder (Δ14.9p) — the probe: the 101.33 rung wins at 3.6p from the reach; the operator's 101.14 is 24p away | The ladder-steps law: "3 pips outside the back edge of the entry zone, or 1-2 pips inside the close edge of the *next rung* relevant zone... you need to look at the zones like ladder steps" — the reach must be the map's ladder, never a fixed extreme | CRITICAL |
| C-2 | **The distance-to-reach ranking** | shape-brain.ts:1773 — `Math.abs(zoneCenter(a) − reach) − Math.abs(zoneCenter(b) − reach)` ASC, reach = the travelMax extreme on RANGE days (:1786-1795) | Picks the densest cluster nearest the fantasy extreme (the Friday rung ladder 101.30-101.38) — "closest to the invented range top wins" | The pressure-mechanics law: "pressure mechanics are the fundamental reality everything is built on top of" — a position tie-break ranks ABOVE the pressure evidence | CRITICAL |
| C-3 | **The rung-direct bypass** | shape-brain.ts:1810-1821 — `if (supplyRungs.length > 0) supplyPick = strongest(supplyRungs, supplyReachRef)` | The operator's supply zone [101.027-101.153] (zfp 22, the exact inverse of the EU fortress demand — SAME formationMs 1782990000000) is NEVER evaluated once any LMV rung survives | The §8.1 union (the code's own I2 comment :1886-1911): "must prefer the S/D ZONE that contains the structurally-relevant rungs, not the bare rung itself" — zones and rungs are ONE pool | CRITICAL |
| C-4 | **The pressure-ASC sign** | shape-brain.ts:1770 — `(pressureScoreOf(zoneToLexiconPressure(a)) − pressureScoreOf(zoneToLexiconPressure(b)))` ASCENDING | DEPLETED (−30) sorts before fresh (0); FORTRESS (+20) last — the operator confirmed: "yeah thats an issue it should be the opposite" | The zone-pressure lexicon: pressureScoreOf larger = stronger (+40 VIRGIN-BoM / +20 FORTRESS / −30 DEPLETED — zone-pressure.ts:265) | CRITICAL |
| C-5 | **The day-direction switch flattens R→NEUTRAL→RANGE→supply-primary** | shape-brain.ts:2151-2230 (`case R: direction='NEUTRAL'` :2181, `default: NEUTRAL` :2226) + toEntryDirection :1427-1431 (NEUTRAL collapses to RANGE) + the RANGE dispatch :1869-1875 (supplyPick ?? demandPick) | The GU Monday (R day) designates SHORT at the supply 1.33623 — the operator's GU Monday is LONG at 1.33330 (the kept EU cascade). The divergence 0.40 is "flag only — pair E2 stands" (report-v452.ts) | The G3 contract: "the GU Monday direction === 'LONG'; the divergence recorded (MACRO_DIVERGENCE); the macro wins" + D59: "the DIRECTION is the derailment — the unified macro authority must fix it (the mirror law!)" | CRITICAL |
| C-6 | **dayOpenSpot = the Friday close** | shape-brain.ts:1549 — `const dayOpenSpot = priorDayClose;` + the dayBandCarry init :2079 (`let dayBandCarry = spot;` = the Friday close for Monday) | Every reach, band, and designation derives from the Friday close instead of the London pre-market analysis point — the temporal law is violated at the root | THE TEMPORAL LAW (this session, verbatim): "everything needs to be done temporally anchored to LONDON SESSION PRE-MARKET w/ all the data visible up until this point. In the 1H before london session starts is when i manually do all my analysis and setup my trades for the day and then close the charts and the prices action just fills my limit orders and hits TP/SL accordingly. That's what this pipeline needs to replicate." | CRITICAL |
| C-7 | **The swept-shelf pass — THREE predicates** | mirror.ts:2875 (`(z.sweepCount >= 1 ? -30 : 0)` — the swept shelf PENALIZED) + :2881 (`.filter((c) => !weakPass || c.z.zfp <= 30)` — zfp>30 walked past) + :2903 (`else if (z.zfp > 20) return false` — the frozen fresh-wall) | The DXY SHORT's TP walks past the defended 100.845 shelf (102 reaction candles, the modal body-close 100.869, the deepest probe 100.596) to 100.780 — the chained DXY LONG at Δ16.5p | The 3-mitigation doctrine (the operator, verbatim this session): "A zone does not immediately magically fail it takes minimum 3 mitigations before it fails. the only exception is virgin MoM zones IN THE MIDDLE OF A BS/WL pathway." + the reaction ladder (UM 100% / 1x ~80% / 2x ~50% / 3x+ TP-only) | CRITICAL |
| C-8 | **The LMV side vote — approach-driven, not swept-side** | lmv.ts:696-697 — `else if (r.fromAbove && !r.fromBelow) buyVotes++; else if (r.fromBelow && !r.fromAbove) sellVotes++;` + candle-pressure.ts:363-370 — `if (fromAbove && !fromBelow) return 'BUY_SIDE'; if (fromBelow && !fromAbove) return 'SELL_SIDE';` | The golden DXY 101.14 SUPPLY LQZ (the HIGH sweep) types DEMAND — the SELL_SIDE rungs jump 101.02 → 101.30; the SHORT's pool cannot see 101.14. The 100.945 DEMAND types SUPPLY — the LONG's pool cannot see it. THE SIDE FLIP — the root of the DXY invisibility | The LQZ semantics (Bible 4.0 §4.16): "LIQUIDITY_SWEEP — an UPWARD sweep (breaks resistance above) → BUY_SIDE → supply; a DOWNWARD sweep (breaks support below) → SELL_SIDE → demand" — the side is the SWEPT SIDE (the wick direction), NEVER the approach | CRITICAL |

**THE INTERACTION (why the DXY Monday miss is an EMERGENT result, not one rule):** the C-6 Friday-close open → the C-1 travelMax reach (101.369) → the C-2 distance ranking (the 101.33 rung at 3.6p beats the 101.14 area at 24p) → the C-3 rung-direct bypass (the [101.027-101.153] zone never competes) → the C-4 pressure-ASC (the depleted-first order) → the I2 containment (the 0.1p overhang kills the nesting). The GU miss: C-5 (the direction) + C-6 (the open) + the degenerate-rung pick (2.6). The DXY LONG miss: C-7 (the swept-shelf TP pass). The fix plan (§2) must address the INTERACTION, not just the rules — the register's §7 entry 2 said exactly this, and §2.3 executes it.

## 1.2 THE ~10 MAJOR RULES (doctrine-violating, not the confirmed flips)
**THE ~10 MAJOR RULES — doctrine-violating, not the confirmed flips, but they infect the same paths. Each verified at its file:line.**

| # | The rule | The code (verified) | The doctrine violation | The fix reference |
|---|---|---|---|---|
| M-1 | **The degenerate-rung admission** | mirror.ts:1507-1525 (the LQZ branch pushes `{kind:'LQZ', …}` with NO `bottom < top` width gate anywhere in the picker) | The GU demand pick = `LMV|GBP/USD|1.33270` [1.33059-1.33059] — a zero-width collapsed rung 21p below its id. sl-lmv.ts:33-34 tolerates degenerate zones BY DESIGN (the totality law) — **the sanity gate belongs in the PICKER, never in computeSL_LMV** (the register's sharpest architectural fact) | §2.6 |
| M-2 | **The I2 strict containment** | shape-brain.ts:1960 — `r.floor >= z.floor - 1e-9 && r.ceiling <= z.ceiling + 1e-9` | The rung [101.12-101.154] pokes 0.1p above the zone ceiling 101.153 → not internal → the I2 cannot promote your 101.14 LQZ into its supply | §2.3 (the edge-distance predicate) |
| M-3 | **The 60-pip opposing proximity** | zone-classification.ts:49 + :102 + the DUPLICATE at reasoning-chain.ts:544 — `OPPOSING_PROXIMITY_PIPS = 60` + the ±3p tolerances :109/:113 | The operator's element-match doctrine: "the opposing structure sits at/above the zone (the ELEMENT match, never the price level)" — a fixed pip window is a price level | §2.7 |
| M-4 | **The phantom-BoM all-4 DUPLICATED** | shape-brain.ts:1136-1181 (the adapter) + zone-classification.ts:145 (the lexicon's) + reasoning-chain.ts:520 (phantomBoMExemption — the W5 comment's :428 anchor is STALE) — the mid-position predicate DIVERGES (the lexicon requires `mid ∈ (0,0.9)` :88; the reasoning-chain version does NOT :534-536) | The W5 comment's "zero drift by construction" claim is FALSE — two independent all-4 implementations, a zone can be exempted by one and rejected by the other | §2.7 |
| M-5 | **The BoM-gated +40** | zone-pressure.ts:268 — `case 'VIRGIN': return input.zoneClassification === 'BoM' ? VIRGIN_PRESSURE : VIRGIN_PRESSURE - 20;` | The virgin-MoM scores 20, not 40 — the pressure signal silently halved; the lifecycle state alone doesn't carry the signal (the fortress-exempted virgin MoM — the EU case — needs the +40) | §2.7 |
| M-6 | **The 30m-MoM force in 3 copies** | bom-mom.ts:118 (`if (input.timeframe === '30m' || input.timeframe === '15m') return 'MoM';` — UNCONDITIONAL) + ob-engine.ts:399 + :459 | The telescoping law is real ("30m is not an origin point for BoM S/D zones") but the implementation overrides the classifier's verdict instead of expressing the law inside it — three copies = drift | §2.7 |
| M-7 | **The Law-7 buffers duplicated** | mirror.ts:98-100 + sl-lmv.ts:61-63 — the same `{'EUR/USD': 2, 'GBP/USD': 3, 'AUD/USD': 3, 'DXY': 5}` in TWO files | The register: "Replicated, not imported" — a drift hazard | §2.7 |
| M-8 | **The confidence default 0.5** | shape-brain.ts:2032 — `confidence: confidence ?? 0.5` | A silent fabricated mid-confidence masks a missing value — the false-success class | §2.7 (the evidence-derived confidence) |
| M-9 | **The fixed windows: recency ±1 calendar day + dayWindow 72h** | shape-brain.ts:1614-1615 (`(dayIdxOf ∓ 1) * DAY_MS`) + :1670 (`DAY_WINDOW_HOURS = 72`) | The operator's recency law: "within 3 trading days up to the present moment" — ±1 calendar day and 72h (which spans weekends as trading time) are uncalibrated approximations | §2.7 (the trading-day windows from the anchored bar calendar) |
| M-10 | **The shapeTierBonus — REMOVED (confirmed absent)** | selectPairNativeZone :1676-1679 — "the +2 tier bonus is GONE; the advisory proximity path is removed" | ALREADY FIXED — the register verifies the E2-advisory path is dead; the E2 exact-match is authoritative. Do NOT re-introduce it | verify-only |
| M-11 | **The RRR floors conflated** | reasoning-chain.ts:49 (RRR_GATE = 2.5) vs setup-gen.ts:1077 (rrrForCategory(category).tp1) vs the mirror preconditions (≥1.2×SL) vs the D3 doctrine (3.5 executed / 3.0 emission) | FOUR separate floors — the register's warning: "often conflated in the context args" | §2.8 (the single RRR-consequence law) |
| M-12 | **The GOLDEN_SL_MIN location** | mirror.ts:2007 — the LOCAL `GOLDEN_SL_MIN_PIPS = 4` (not an sl-lmv export; MAX 9.5 at sl-lmv.ts:84) | Location drift — the spec's citations split between two files | §2.7 |

**The confirmed-severity note:** the register's severity grading — CRITICAL = a doctrine-violating predicate that produced a confirmed defect; MAJOR = a fixed threshold that overrides the pressure lexicon or the zone's own reaction evidence; MINOR = a heuristic with a documented BECAUSE; INFO = a constant that matches the canon. The ~40 MINOR/INFO rules (the cluster constants, the OBCV gates, the BoM gates, the touch-kind thresholds) are inventoried as CANON-COMPLIANT in §1.3 — they are NOT slop and MUST NOT be "improved".

## 1.3 THE HONEST PARTS (the audit's confirmation — NOT slop, never touch)
**THE HONEST PARTS — the audit's confirmation that these are NOT slop. DO NOT TOUCH. The register's verdicts, verified at the lines:**

| The part | The verification | The verdict |
|---|---|---|
| **The zfp ladders** | freshness.ts:186-201 — BoM: FRESH=10, 1x=18, 2x=32, DEPLETED=65 · MoM: FRESH=65, 1x=22, 2x=38, DEPLETED=70 · VIOLATED → BoM 65 / MoM 70. THE EXACT SOURCE of the measured 70/22/65/22: the DXY OB 70 = MoM DEPLETED (3+ battles), the DXY [101.027-101.153] 22 = MoM 1x (the Friday sweep), the EU demand 65 = MoM virgin (never retested), the EU supply 22 = MoM 1x | **HONEST — the ladder records the market's actual treatment. The asymmetry is the SELECTION + the EXEMPTION (C-3/C-8 + the phantom-BoM), never the ladder.** |
| **The rung zfp=20** | lmv.ts:799-802 — `min(60, 20 + floor((n−3)/2)×5)` — a 3-candle rung → 20. The LMV ladder = canon (lqz-lobe.ts:571) | **HONEST — the rung zfp is not the defect** (the register: "the ladder is honest") |
| **The LMV modal emission** | lmv.ts:753-821 — the 1-pip-quantum modal buckets, MIN_RUNG_CANDLES=2 — the operator's ANCHOR_DOCTRINE §5.3 "within ~1-2 pips = a rung" | **HONEST — the modal emission DID emit the 101.14 area; it typed it DEMAND** (the register's key finding: "the visible gap IS the flip's symptom") |
| **The cluster constants** | lqz-matrix.ts:71-164 (the canon): MIN_PROMINENCE=1, TOLERANCE=2, MAX_SPAN=4, MIN_POINTS=3, MIN_RECURRENCE=2, EPSILON_ATR=0.25 — the LMV Stage 2 re-implementation is byte-identical BY CITATION (lmv.ts:368-437) | **HONEST — canon. The citation-duplication is a drift hazard (M-level), not a wrong value** |
| **The OBCV gates** | obcv.ts:83/:97/:100/:102/:104/:108/:115/:117/:119/:121/:124/:126 — the displacement windows, the theta floors, the body multipliers, the OPERATOR_FLOOR, the width gates, the bw≥3.0/bf≥0.65 BoM gates | **HONEST — the operator's OBCV floors + the Bible 4.0 §4.7 verbatim** |
| **The pressure counts** | zone-pressure.ts:39-40 — DEPLETED_COUNT=3, FORTRESS_HOLDS=4 | **HONEST — "zones usually fail on the THIRD mitigation" + "not pierced or broken in 4 prior mitigations" verbatim** |
| **The touch-kind classifier's 5 branches** | lqz-matrix.ts:221-241 — SWEEP/WICK_REJECT/BODY_DEFEND/CONSOL_DWELL/PASS_THROUGH with the canon thresholds | **HONEST — the piecewise-total exhaustiveness. The SIDE of the reject is where the flip lands — downstream in the vote (C-8)** |
| **The phantom-BoM 3-of-4 → DEATH** | zone-classification.ts:326-328/:335-342 | **HONEST — the operator's own conservative default** ("3-of-4 → the DEATH rule stands") |
| **The LMV oracle 7/7** | diag-lmv-golden — the 7 golden DXY LQZs at ≤1p | **HONEST — the levels EXIST in the map. The fails are typing + selection, NEVER detection.** |
| **The EU lane's ≤3p reference** | E 1.14390 (Δ0.5p) · SL 1.14475 (Δ1.0p) · TP 1.14095 (Δ1.5p) — the I-5/I-6/I-7/I-8 fixes | **HONEST — the reference implementation; every proposed fix in this spec must not degrade it** |
| **The frozen pair** | sl-lmv `912940832fac44bc` + trade-dedup `33914c897e777540` | **HONEST — read-only, never touched** |

**THE SELECTION-ASYMMETRY PROOF (the operator's zfp question answered in full):** the DXY `[101.027-101.153]` (zfp 22, 1x MoM) and the EU fortress demand `[1.14004-1.14147]` (zfp 65, 0x MoM) share formationMs **1782990000000** — the SAME structural inverse, one reaction apart on the SAME canon ladder. The EU 0x is a VIRGIN (the death-rule candidate) rescued by the phantom-BoM all-4 (zone-classification.ts:303 → PHANTOM_BOM → shape-brain.ts:1230 EXEMPT) — the WIN. The DXY 1x is TESTED_1X — never virgin, never a death zone, never a fortress candidate — and the designation treats a 1x-22 as mid-ladder, never a primary. **The ladder is honest; the SELECTION path is asymmetric** (the register's CRITICAL finding). The fix: §2.3's union + the data-derived reach + the pressure-DESC — the 1x supply becomes the near-open primary it structurally is.

**1.4 THE COMPLETE REGISTER EXECUTION TABLE — EVERY rule the three SLOP REGISTERS inventoried (2026-08-09), with its disposition. The operator's mandate: "address every single one of these" — a rule without a row here is an unexecuted register item. THE DISPOSITION CODES: FIX = replaced by a lexicon filter / an MPSE engine (the §2 section cited) · HONEST = canon-compliant, verified, NEVER touched (the §1.3 class) · DOC = documented hazard (the frozen-edge / the layered semantics) · VERIFY = confirmed already-correct, watch-only.**

**THE E2 REGISTER (the 15 entries — shape-brain.ts):**

| # | The rule | The disposition |
|---|---|---|
| E2-1 | the SHAPE_TRAVEL fixed ladder (:1409-1419) | FIX — §2.3 `dataDerivedTravel` (the ATR-proxy band; the ladder = the last-resort fallback only) |
| E2-2 | the reach clamps open ± travelMax (:1686-1722) | FIX — §2.3 STAGE 3 (the day's actual structures: dayReachHigh/dayReachLow + the nearest beyond the open) |
| E2-3 | the distance-to-reach ranking (:1773) | FIX — §2.3 STAGE 4 (the distance from the OPEN, the position last) |
| E2-4 | the rung-direct bypass (:1810-1821) | FIX — §2.3 STAGE 2 (the §8.1 union — the rung-direct = a tiebreak only) |
| E2-5 | the direction dispatch (:1865-1878) | FIX — §2.4 (the RANGE supply-primary dies; the direction derives from the macro + the pressure evidence) |
| E2-6 | the pressure-ASC sign (:1770) | FIX — §2.3 STAGE 4 (DESC — the operator confirmed "it should be the opposite") |
| E2-7 | the I2 strict containment (:1960) + NEAR_ACTIVE_EDGE_PIPS=5 (:1943) | FIX — §2.3 STAGE 5 (the edge-distance predicate; the band from the ATR proxy) |
| E2-8 | the day-direction switch SS→RANGE/R→NEUTRAL (:2151-2230) | FIX — §2.4 `dayDirection` (the R = the macro; the STORM/DWL explicit; no silent default) |
| E2-9 | toEntryDirection's NEUTRAL collapse (:1427-1431) | FIX — §2.4 (the NEUTRAL resolves via the pressure evidence — the ZR-6D "the label must match the side") |
| E2-10 | isStorylineRange (:1700) | FIX — §2.3 (keeps the day-reachability role; the travelMax reach dies) |
| E2-11 | the recency ±1 calendar day (:1609-1617) | FIX — §2.7.7 (the 3-TRADING-day window from the anchored bar calendar) |
| E2-12 | the dayWindow 72h (:1670-1673) · dayLimitMs (:1657) · formationMsOf (:1623-1628) | FIX dayWindow — §2.7.7 · HONEST dayLimitMs + formationMsOf (the temporal-engine integration + the id-segment parse are correct) |
| E2-13 | the confidence default 0.5 (:2032) | FIX — §2.7.6 (the evidence-derived confidence + the honest 0.05 + the loud log) |
| E2-14 | the phantom-BoM adapter (:1136-1181) | FIX — §2.7.1 (the single-source all-4; the adapter delegates) |
| E2-15 | dayOpenSpot = priorDayClose (:1549 + the carry :2079) | FIX — §2.1 (the analysis-point price — THE temporal law) |

**THE E3 REGISTER (the ~20 rules — mirror.ts / sl-lmv.ts / reasoning-chain.ts / setup-gen.ts):**

| # | The rule | The disposition |
|---|---|---|
| E3-1 | the −30 sweep inversion (:2875) | FIX — §2.5 (a swept shelf is DEFENDED — the penalty dies) |
| E3-2 | firstUnmitigatedOpposingZone (:2366) | FIX — §2.5 (the first DEFENDED wall — the 3-mitigation ladder) |
| E3-3 | the significance ladder −30/40/25/15 (:2874-2876) | FIX — §2.5 (the E1-pressure significance; the candle-count zfp = the tiebreak only) |
| E3-4 | the degenerate-rung admission (the picker :1507-1525) | FIX — §2.6 (the rung-validity gate at the ADMISSION — never in computeSL_LMV) |
| E3-5 | the Law-7 buffers duplicated (mirror.ts:98 + sl-lmv.ts:61) | DOC — §2.7.2 (the frozen-edge hazard; the values identical today, documented) |
| E3-6 | GOLDEN_SL_MIN 4 (mirror.ts:2007 local) / MAX 9.5 (sl-lmv.ts:84) | DOC — §2.7.9 (the locations corrected; no code change) |
| E3-7 | the D17 ceiling 36 (mirror.ts:110) | HONEST — the operator's D17 ("36 pips HARD") |
| E3-8 | the Law-10 floor 0.5×ATR (sl-lmv.ts:74) | HONEST — the Bible's Law 10 |
| E3-9 | the shapeTierBonus (the E2-advisory +2) | VERIFY — confirmed REMOVED (:1676-1679 — "the +2 tier bonus is GONE"); do NOT re-introduce (AP-10) |
| E3-10 | the ±15% price-range filter (:1424) | HONEST — the stale-exclusion rationale (the register: "a defensible BECAUSE"); documented |
| E3-11 | the VIOLATED-50p admission (:1543-1546) | HONEST — the documented admission band (the §8.1 union's VIOLATED class); documented |
| E3-12 | the ±48h pool (:1612-1615) | HONEST — the canon formation-time tolerance (FORMATION_TIME_TOLERANCE_MS ±24h) |
| E3-13 | the RRR floors (RRR_GATE 2.5 :49 · rrrForCategory tp1 · the mirror ≥1.2×SL · the 3.5 doctrine) | DOC — §2.7.8 (the four layers documented, never conflated; a TP computed to hit a floor = the D37 class, BANNED) |
| E3-14 | the null-TP skip (:1035, :1685-1700) | HONEST — the D3 law ("a null TP = the trade does not exist, never a fabricated one") |
| E3-15 | the dual-entry 15p (:1272) | HONEST — the D11 doctrine verbatim ("within 5-15 or so pips = multiple entries of 1 trade") |
| E3-16 | the RWL hair-miss delta 0.1 (:365) | DOC — the documented MINOR (the F1-D refinement's epsilon); no doctrine conflict |
| E3-17 | the fresh-wall zfp≤20 default (:2901/:2903) | FIX — §2.5 (the bridged isStructuralWall becomes the PRIMARY — the E1-pressure wall) |
| E3-18 | the weak-shelf pass zfp>30 (:2879-2881) | FIX — §2.5 (the pass filter dies — the defended shelf is a wall) |
| E3-19 | the sweep-origin tolerance 2p (sl-lmv.ts:95) | HONEST — the canon SWEEP_MIN_BEYOND_PIPS |
| E3-20 | entryPrice_LMV defendedEdge (:297-316) | HONEST — the anchor doctrine (the entry = the modal body-close — the EU win's E) |

**THE E1 REGISTER (the ~40 rules — lmv.ts / lqz-matrix.ts / ob-engine.ts / obcv.ts / bom-mom.ts / the lexicons / freshness.ts / lqz-lobe.ts):**

| # | The rule | The disposition |
|---|---|---|
| E1-1 | the side-vote approach-driven (lmv.ts:696-697) | FIX — §2.2 (the swept-side primary — the C-8 root) |
| E1-2 | the lexicon WICK_REJECT fromAbove→BUY (candle-pressure.ts:363-370) | FIX — §2.2 (the swept-side mapping — the SAME inversion, the SECOND file) |
| E1-3 | the wick-mass tiebreak (:708-711) | HONEST — harmonizes with the swept-side fix (the upper wick mass = the supply side) |
| E1-4 | the spot-relative tiebreak (:712-714) | DOC — the MINOR (fires only on a zero-window cluster); the swept-side fix makes it rarer |
| E1-5 | the touch-kind 5 branches (lqz-matrix.ts:221-241) | HONEST — the canon piecewise-total (the SWEEP 2p beyond, the WICK_REJECT, the BODY_DEFEND, the CONSOL_DWELL 3+, the PASS_THROUGH) |
| E1-6 | the cluster constants (lqz-matrix.ts:71-164 — the canon) | HONEST — the canon; the LMV Stage 2 citation-copy (lmv.ts:368-437) = the DOC drift hazard (§2.7.2's pattern — never edit one copy alone) |
| E1-7 | the LMV zfp ladder (lmv.ts:799-802) | HONEST — canon-identical (lqz-lobe.ts:571); the rung zfp=20 is correct (the register's explicit verdict) |
| E1-8 | the modal emission (lmv.ts:753-821) | HONEST — the operator's rung rule (the 1-pip quantum, MIN_RUNG_CANDLES=2) |
| E1-9 | the OBCV gates (obcv.ts:83/:97/:100/:102/:104/:108/:115/:117/:119/:121/:124/:126) | HONEST — the operator's OBCV floors + the Bible 4.0 §4.7 verbatim (the bw≥3.0/bf≥0.65) |
| E1-10 | the 30m-MoM force ×3 (bom-mom.ts:118 + ob-engine.ts:399/:459) | FIX — §2.7.5 (the law folded into classifyBoMMoM as a stated precondition; the 2 belt-and-suspenders die) |
| E1-11 | the pressure counts (zone-pressure.ts:39-40 — DEPLETED 3 / FORTRESS 4) | HONEST — the operator verbatim ("zones usually fail on the THIRD mitigation" / "not pierced or broken in 4 prior mitigations") |
| E1-12 | the pressureScoreOf BoM-gate (zone-pressure.ts:268 — the virgin MoM scores 20) | FIX — §2.7.4 (the gate reads the phantom/fortress classification — the exempted virgin MoM keeps the +40) |
| E1-13 | the opposing proximity 60p (zone-classification.ts:49/:102 + reasoning-chain.ts:544) | FIX — §2.7.3 (the ATR-ratio — the ELEMENT match, never a fixed pip window) |
| E1-14 | the tfOfZone default '1H' (zone-classification.ts:61) | DOC — the MINOR (a missing tf defaults to the mid-tier; the death rule then applies the 1H branch — documented) |
| E1-15 | the phantom all-4 (zone-classification.ts:145 + reasoning-chain.ts:520 + the adapter) | FIX — §2.7.1 (the single-source; the mid-position divergence reconciled) |
| E1-16 | the type-1 signature thresholds (zone-classification.ts:152-158 — 0.2/0.5) | DOC — the MINOR (fixed ratios with no stated calibration; not the flip; documented) |
| E1-17 | the DEATH 3-of-4 default (:326-328/:335-342) | HONEST — the operator's own conservative default ("3-of-4 → the DEATH rule stands") |
| E1-18 | the blanket virgin-MoM death rule (shape-brain.ts:1220-1243) | HONEST — the operator's Q3 ("the only exception is virgin MoM zones IN THE MIDDLE OF A BS/WL pathway") — the phantom exemption is the only hole, single-sourced at E1-15 |
| E1-19 | the LQZ lookback 720 (lqz-lobe.ts:166) | HONEST — the operator's 3-6 week reaction horizon |
| E1-20 | the LQZ alignment 3p (lqz-lobe.ts:232) | HONEST — the canon LQZ_ALIGN_TOLERANCE_PIPS |
| E1-21 | the vote window 72h (lmv.ts:288/:546-547) | HONEST — the operator's recency-bias law quoted verbatim at lmv.ts:266-276 |
| E1-22 | the zfpFromState canon ladders (freshness.ts:186-201) | HONEST — THE honest ladder that produced all four measured zfps (the register's explicit verdict) |
| E1-23 | the battle-count precedence (zone-pressure.ts:47) | HONEST — the reactionEvents → mitigationCount → reactionCount precedence |
| E1-24 | the lifecycle priority (zone-pressure.ts:223-227) | HONEST — the BROKEN → FORTRESS → DEPLETED → ACTIVE → VIRGIN recurrence |
| E1-25 | the candle-pressure constants re-declared (candle-pressure.ts:45-48) | DOC — the cited-never-imported duplication (the canon anchor values, the drift hazard documented) |
| E1-26 | the escalationThreshold 3 (candle-pressure.ts:297) | HONEST — the D2 warn-then-throw |
| E1-27 | the opposing-formationMs default (zone-classification.ts:106 — ?? -Infinity) | HONEST — the conservative (a missing formation time never falsely qualifies) |
| E1-28 | the CODE_MIN/MAX + the OPERATOR_FLOOR width gates (obcv.ts:115-121) | HONEST — the operator's floors + the SL-safety minimums |

**THE EXECUTION ACCOUNTING:** the table above disposes of every inventoried rule: 20 FIX (the lexicon/MPSE replacements — §2.1 through §2.7) · 30 HONEST (canon-compliant, verified — never touched) · 8 DOC (the documented hazards + the layered semantics) · 2 VERIFY (the already-correct — the shapeTierBonus removed, watch-only). **A rule with a disposition is an executed register item; the wave audit at each gate re-checks the table's rows against the code.**

**1.5 THE CONFIRMED PROBE EVIDENCE (the 2026-08-09 measurements — the spec's ground truth, condensed from the probe runs. A builder who contradicts these numbers without a fixture change is hallucinating.)**

**THE SELECTION TRACE (probe-n1-selection.ts — the Monday projectZoneForDay internals):**

```
[DXY] Monday — shape=SS dayOpen=101.069
  travel=5,15,30 floor=100.769 ceiling=101.369
  dayReachHigh=null dayReachLow=100.885 (day zones: 1)
  supplyReach=101.369 (raw 101.369) supplyFloor=100.885 demandReach=100.885 demandCeiling=101.069
  supplyCands=31 (rungs 16) demandCands=17 (rungs 9)
  SUPPLY RUNGS (sorted by the CURRENT comparator, reach=101.369):
    LMV|DXY|101.33000 [101.331-101.335] zfp=20 press={"mitigationCount":2,"lifecycle":"VIRGIN"} dist=3.6p  ← THE PICK
    LMV|DXY|101.30000 [101.289-101.317] zfp=20 dist=6.6p
  → the E2 core Monday: {SS, SHORT, keyZone DXY|1H|1782874800000|101.296}  → E 101.289 (Δ14.9p)
[EUR/USD] Monday — shape=SS dayOpen=1.14205
  supplyCands=14 (rungs 3) demandCands=13 (rungs 0)
  SUPPLY RUNGS: only the 1.1425 cluster [1.14253-1.14261] dist=24.8p → the I2 promoted the nearest ZONE:
  [ZONE] EUR/USD|1H|1783076400000|1.14460 [1.1446-1.14571] zfp=22 dist=1.1p  ← THE WIN
  → the E2 core Monday: {SS, SHORT, keyZone EUR/USD|1H|1783076400000|1.14460}  → E 1.14390 (Δ0.5p)
[GBP/USD] Monday — shape=R dayOpen=1.33375
  supplyCands=15 (rungs 12) demandCands=6 (rungs 5)
  SUPPLY RUNGS: the 1.3386 cluster [1.33845-1.33864] dist=2.1p  → the I2 → the Friday supply 1.33623
  DEMAND RUNGS (reach=1.32875 — the range bottom): LMV|GBP/USD|1.33270 [1.33059-1.33059] dist=18.4p ← THE PICK
    (the golden-containing 1.33380 [1.33306-1.33343] dist=44.9p — 26.5p further)
  → the E2 core Monday: {R, SHORT, keyZone GBP/USD|1H|1783062000000|1.33623}  → E 1.33270 (Δ6.0p + the WRONG DIRECTION)
```

**THE ZONE UNIVERSES (probe-n1-rootcause.ts — the containment + the typing):**

```
[DXY] zones CONTAINING the golden short 101.14 (11):
   LMV|DXY|101.11000/101.13000/101.16000/101.17000/101.19000 [101.12-101.154] zfp=20 type=DEMAND  ← THE FLIP (should be SUPPLY)
   DXY|1H|1782990000000|101.027 [101.027-101.153] zfp=22 type=SUPPLY form=2026-07-02T11:00Z  ← THE INVERSE (same ms as the EU fortress)
   OB|DXY|1H|1782975600000|101.06500 [101.065-101.25] zfp=70 type=SUPPLY  ← the OBCV caught it — DEPLETED (3+ battles)
   DXY|1H|1781841600000|100.945 [100.945-101.063] zfp=65 type=SUPPLY  ← the golden LONG level, typed SUPPLY (the flip)
[DXY] zones CONTAINING the golden long 100.945 (5): the 100.93000/100.95000 rungs [100.936-100.952] type=SUPPLY  ← THE FLIP
[EU] the fortress demand: EUR/USD|1H|1782990000000|1.14004 [1.14004-1.14147] zfp=65 type=DEMAND form=2026-07-02T11:00Z
     + the internal rung LMV|EUR/USD|1.14120 [1.14095] — the WIN's TP edge (the I-8 pathCap)
[EU] the designated supply: EUR/USD|1H|1783076400000|1.14460 [1.1446-1.14571] zfp=22 form=2026-07-03T11:00Z
     + the shield rung LMV|EUR/USD|1.14370 [1.1439-1.14415] — the WIN's entry (the I-5 straddling shield)
[GU] zones CONTAINING the golden long 1.33330 (1): LMV|GBP/USD|1.33380 [1.33306-1.33343] zfp=20 type=DEMAND
[GU] the designated demand rung: LMV|GBP/USD|1.33270 [1.33059-1.33059] — the DEGENERATE (floor==ceil, 21p below its id)
[GU] the designated supply: GBP/USD|1H|1783062000000|1.33623 [1.33623-1.33764] zfp=22 form=2026-07-03T07:00Z
```

**THE DIVERGENCE + THE DIRECTION (the probe + the E2-CORE log):**

```
[E2-divergence] GU core vs EU cascade: 0.40 (>0.35 — DIVERGED, flag only — pair E2 stands)   ← THE C-5 handler
[E2-CORE] GU days: Monday:R:SHORT:GBP/USD|1H|1783062000000|1.33623(S:…1.33623/D:LMV|GBP/USD|1.33270/…/KT:SUPPLY/open:1.33375)
[E2-CORE] EU days: Monday:SS:SHORT:EUR/USD|1H|1783076400000|1.14460(…/KT:SUPPLY/open:1.14205)
[DXY] Monday (chain): {SS, SHORT, keyZone DXY|1H|1782874800000|101.296, floor 100.769, ceiling 101.369, dayOpenSpot 101.069}
```

**THE ZFP MECHANICS (freshness.ts:186-201 — the honest ladder):** BoM FRESH=10 / 1x=18 / 2x=32 / DEPLETED=65 · MoM FRESH=65 / 1x=22 / 2x=38 / DEPLETED=70. The DXY OB 70 = MoM DEPLETED (3+ battles) · the DXY [101.027-101.153] 22 = MoM 1x (the Friday sweep) · the EU demand 65 = MoM FRESH (never retested — the virgin the phantom exemption rescues) · the EU supply 22 = MoM 1x. **The ladder is honest; the selection + the exemption are the asymmetry (C-3/C-8 + the phantom-BoM).**

# §2 THE FIX PLAN

## 2.0 THE DESIGN PRINCIPLES (the lexicon/MPSE law — the operator's mapping made mechanical)
**THE DESIGN PRINCIPLES — the operator's mapping made mechanical. EVERY rule in this overhaul is a LEXICON FILTER or an MPSE ENGINE; a rule that cannot be expressed as either is DELETED.**

**THE OPERATOR'S MAPPING (verbatim):** "zones/candles = regex · pressure mechanics = semantic intent · shape chains = semantically intelligent algorithmic systems · E1/E2/E3 pipeline = Trident deep planning L2 · trade setups = tool outputs" (the LEXICON_SPEC:5).

**THE FIVE LAWS THIS OVERHAUL EXECUTES:**

**LAW-1 — THE LEXICON IS THE DECISION, THE REGEX IS THE DETECTOR ONLY.** A mechanical detector (a regex, a threshold, a fixed constant) can IDENTIFY a pattern; it can NEVER DECIDE. The decision (the classification, the designation, the side, the wall) belongs to the lexicon's semantic-intent predicates. The MPSE law: every predicate is a deterministic expression (a numeric comparison / a set membership / a piecewise branch) — the confidence = pos/(pos+neg+1), the decision = pos > neg ? classify : reject. A hardcoded decision where a lexicon should decide = the SLOP class this spec eliminates.

**LAW-2 — THE DATA DERIVES, NOTHING IS FIXED.** Every reach, band, window, and proximity derives from the map's actual structures or the operator's canon ratios — NEVER a fixed pip number. The SMC ratio doctrine: "the OB's size is inherently a function of the move it precedes — NEVER a fixed pip number" (shape-brain.ts:1011-1012). The ATR-proxy precedent already in the file: `shapeBrainAtrProxyPips` (shape-brain.ts:1116-1123, mirror.ts:367 — "the SMC ratio anchor — NEVER a fixed pip number"). Every fixed constant in the CRITICAL/MAJOR list gets a data-derived replacement or dies.

**LAW-3 — THE OPERATOR'S WORKFLOW IS THE TIMELINE.** "everything needs to be done temporally anchored to LONDON SESSION PRE-MARKET w/ all the data visible up until this point. In the 1H before london session starts is when i manually do all my analysis and setup my trades for the day and then close the charts and the prices action just fills my limit orders and hits TP/SL accordingly." — the analysis point = 06:00 UTC (1783317600000), all data ≤ that, the dayOpenSpot = the price at that point, the snapshot FROZEN after the designation (the "close the charts" clause — never recompute post-order).

**LAW-4 — THE MITIGATION LADDER IS THE WALL SEMANTICS.** "A zone does not immediately magically fail it takes minimum 3 mitigations before it fails. the only exception is virgin MoM zones IN THE MIDDLE OF A BS/WL pathway." (the operator, verbatim 2026-08-09) — the reaction ladder UM 100% / 1x ~80% / 2x ~50% / 3x+ TP-target-only. A swept-and-recovered shelf is DEFENDED (1x = 80% reaction), never spent. The Law-14 walk's wall predicate = the E1-pressure classification (the mitigation count + the BoM/MoM + the Earth+Fire), never the candle-count zfp.

**LAW-5 — THE MACRO AUTHORITY WINS.** "the DIRECTION is the derailment — the unified macro authority must fix it (the mirror law!)" (D59) + the G3 contract: "the GU Monday direction === 'LONG'; the divergence recorded (MACRO_DIVERGENCE); the macro wins." The cascade direction (DXY → EU inverse → GU kept) is the authority when the pair's core diverges > 0.35 — "flag only" is the derailment this spec kills.

**THE MPSE STRUCTURES THIS SPEC DEPLOYS (the operator's "tangible MPSE engines"):**

| The MPSE structure | The engine | Where |
|---|---|---|
| The total function | `projectZoneForDay: (zones, day, shape, priorStoryline, analysisPoint) → ShapeDayZone` — the designation as a pure function of the map + the analysis point | shape-brain.ts (rewritten) |
| The set-theoretic union | the §8.1 pool: `structural(zone) ⟺ source ∈ {ORDER_BLOCK, LQZ}` — zones and rungs ONE candidate set | shape-brain.ts:1810 (rewritten) |
| The piecewise-total classifier | the swept-side vote: every reaction candle maps to EXACTLY ONE side by the wick direction — the totality law | lmv.ts:696 + candle-pressure.ts:367 (rewritten) |
| The order-theoretic ranking | the strongest() comparator as a total order over the evidence tuple: (pressure DESC, zfp ASC, position ASC, recency, id) — the pressure first, the position last | shape-brain.ts:1756 (rewritten) |
| The matrix/column-reduction | the wall classification: the mitigation count + the reaction events as the wall's columns | mirror.ts:2875-2903 (rewritten) |
| The recurrence | the temporal chain: the day-by-day designation carries the prior day's projection (Law 27) with the analysis-point anchor | shape-brain.ts:2259 |
| The invariant | the degenerate-rung gate: `∀ candidate rung: bottom < top ∧ |id−center| ≤ tolerance` — a total function over the picker's input | mirror.ts picker (new) |

**THE CONTRACT THAT EVERY COMPONENT MUST SATISFY (the E3-NEVER + the E2-designates law):** E2 emits ZONE ANCHORS ONLY (keyZoneId/supplyZoneId/demandZoneId — the ZR-6A strip stays, shape-brain.ts:1993-2008); E3 resolves the prices from the zones (the I-5/I-6/I-7/I-8 anchor doctrine); every anchor traces to an E1 zone id + an E2 projection id (assertProjectionContract, reasoning-chain.ts:1149). A component that emits a price where a zone id belongs = the PRICE-ANCHORED derailment (the E3-eng spec's foundational defect) — REJECTED.

## 2.1 THE TEMPORAL REPLICATION (the London pre-market analysis point — the operator's workflow made mechanical)
**2.1 THE TEMPORAL REPLICATION (C-6 — the operator's workflow made mechanical — EXECUTE FIRST, everything derives from it)**

**THE PROBLEM:** `dayOpenSpot = priorDayClose` (shape-brain.ts:1549) + the dayBandCarry init :2079 — the Friday close anchors the entire Monday designation. The operator analyzes in the 1H BEFORE the London session (06:00-07:00 UTC) with all data visible up to that point.

**THE CONTRACT:**

```typescript
// THE ANALYSIS POINT (the frozen, operator-locked constant)
const ANALYSIS_POINT_MS = 1783317600000;   // Monday 2026-07-06 06:00 UTC — the START of the
                                           // pre-London hour (the London open = 07:00 UTC)
// THE TEMPORAL ENGINE (temporal.ts — extended, the one-way lock stays)
interface AnalysisPoint { ms: number; isPreLondon: boolean; }
lockAnalysisPoint(ms: number): void;        // one-way lock, throws on a different-value re-lock
getAnalysisPointMs(): number;               // throws when unlocked
gateBars<T extends { timestamp: number }>(bars: T[]): T[];  // total filter: timestamp <= getAnalysisPointMs()

// THE DAY OPEN (the price at the analysis point — NEVER the prior close)
function dayOpenSpotAt(analysisPointMs: number, bars1H: OhlcBar[]): number {
  // the last 1H close at or before the analysis point — the market state when the operator
  // begins the analysis (the 06:00 bar's OPEN = the 05:00 bar's close, per the bar semantics)
  const anchorBars = gateBars(bars1H);
  const last = anchorBars[anchorBars.length - 1];
  return last.close;   // the price the operator sees when the charts open at 06:00
}
```

**THE 10-SITE SWEEP (the T8 mechanical replacement — every site, no pick-and-choose):**

| # | The site (verified) | The before | The after |
|---|---|---|---|
| 1 | shape-brain.ts:1549 | `const dayOpenSpot = priorDayClose;` | `const dayOpenSpot = dayOpenSpotAt(ANALYSIS_POINT_MS, bars1H);` |
| 2 | shape-brain.ts:2079 | `let dayBandCarry = spot;` (the Friday close for Monday) | `let dayBandCarry = dayOpenSpotAt(ANALYSIS_POINT_MS, bars1H);` |
| 3 | shape-brain.ts:1536 | `pipSize = priorDayClose > 50 ? 0.01 : 0.0001` | `pipSize = dayOpenSpot > 50 ? 0.01 : 0.0001` (from the analysis-point price) |
| 4 | shape-brain.ts:1686-1689 | `expectedReach/oppositeReach` from the prior-close open | from the analysis-point open |
| 5 | shape-brain.ts:1707-1722 | the reach clamps from the prior-close open | from the analysis-point open |
| 6 | shape-brain.ts:1786-1795 | the reach references | from the analysis-point open |
| 7 | shape-brain.ts:1851 | `deepFloor = dayOpenSpot − travelMax` | from the analysis-point open |
| 8 | shape-brain.ts:1936 | `i2ReachRaw = isStorylineRange ? dayOpenSpot + travelMax : expectedReach` | from the analysis-point open |
| 9 | shape-brain.ts:2259 | the chain carry from the prior-close opens | from the analysis-point opens |
| 10 | report-v452.ts:106 + the diag harnesses | `ANCHOR_MS = 1783702800000` (the Friday close) / `1783321200000` (Monday 07:00) | **ANALYSIS_POINT_MS = 1783317600000** everywhere |

**THE FROZEN-SNAPSHOT CLAUSE (the "close the charts" operational law):** after the STEP A designation + the STEP B projections are placed, the pipeline NEVER recomputes the model or the designation. The `compute()` snapshot (the zoneMapVersion stamp, shape-brain.ts:2803/:2835) is already immutable; the pipeline tools MUST NOT re-run E2/E3 after the order placement. A re-computation that changes the designation from what the operator saw = the derailment.

**THE PSEUDOCODE (the day-native reference, replacing the prior-close everywhere):**

```typescript
function designateDay(day, shape, zones, bars1H, priorStoryline, analysisPointMs) {
  const dayOpenSpot = dayOpenSpotAt(analysisPointMs, bars1H);   // THE analysis-point price
  const travel = dataDerivedTravel(zones, dayOpenSpot);         // §2.3 — never SHAPE_TRAVEL
  const floor = dayOpenSpot - travel.max;                       // the band from the open
  const ceiling = dayOpenSpot + travel.max;
  // ... the §2.3 selection (the union + the pressure-DESC + the edge-distance)
  return { keyZoneId, supplyZoneId, demandZoneId, floor, ceiling,
           dayOpenSpot, session, confidence: evidenceConfidence(...) };
}
```

**THE TEMPORAL ENGINE FULL CODE (temporal.ts — REWRITTEN with the analysis point — the operator's workflow made mechanical):**

```typescript
// THE TEMPORAL LAW (the operator, verbatim — the file's own header doctrine + this session's law):
//   "there needs to be a clear temporal anchor for 'today' wired into the codebase... a proper date and
//   time input that it physically blocks any future data from ever being read or input anywhere into the
//   machine past this. and this is LOCKED until the pipeline finishes so it cannot be gamed and changed
//   right in the middle." + "everything needs to be done temporally anchored to LONDON SESSION PRE-MARKET
//   w/ all the data visible up until this point... That's what this pipeline needs to replicate."
let lockedAnalysisPointMs: number | null = null;

export function lockAnalysisPoint(ms: number): void {
  if (lockedAnalysisPointMs !== null && lockedAnalysisPointMs !== ms)
    throw new Error(`TEMPORAL: the analysis point is LOCKED at ${lockedAnalysisPointMs} — cannot relock to ${ms}`);
  lockedAnalysisPointMs = ms;
}
export function getAnalysisPointMs(): number {
  if (lockedAnalysisPointMs === null) throw new Error('TEMPORAL: the analysis point is not locked — lockAnalysisPoint() first');
  return lockedAnalysisPointMs;
}
export function isAnalysisPointLocked(): boolean { return lockedAnalysisPointMs !== null; }

// THE TOTAL BAR FILTER (the "physically blocks any future data" — every bar input passes through here):
export function gateBars<T extends { timestamp: number }>(bars: T[]): T[] {
  const anchor = getAnalysisPointMs();
  return bars.filter(b => b.timestamp <= anchor);        // the total function — future data physically cannot enter
}
// THE LEGACY NAMES (the compatibility seam — the engine + the diag + the probe migrate in W1):
export const lockRunAnchor = lockAnalysisPoint;           // the old name → the new semantics (the SAME one-way lock)
export const getRunAnchorMs = getAnalysisPointMs;
export const isRunAnchorLocked = isAnalysisPointLocked;
// THE DAY OPEN AT THE ANALYSIS POINT (the §2.1 semantic — the market state when the operator begins):
export function dayOpenSpotAt(analysisPointMs: number, bars1H: OhlcBar[]): number {
  const anchorBars = gateBars(bars1H);
  const last = anchorBars[anchorBars.length - 1];
  if (!last) throw new Error('TEMPORAL: no bars at or before the analysis point');
  return last.close;   // the 06:00 bar's open = the 05:00 bar's close — the state the operator sees at 06:00
}
```

**THE GATE (done-when):** the faithful re-walk probe (probe-e2-designation.ts) prints `dayOpenSpot = 101.069 → the analysis-point price` (the 06:00 bar's close — the probe must read the fixture's actual 06:00 value); the E2 core's Monday `dayOpenSpot` field = that price; the golden gate G1-G10 still passes (the harness re-anchors to 1783317600000); the convergence table re-measured.

## 2.2 THE SIDE-VOTE LEXICON (the swept-side predicate — the CRITICAL flip, two files, one fix)
**2.2 THE SIDE-VOTE LEXICON (C-8 — the swept-side predicate — ONE defect in TWO files, swap BOTH or the lexicon lane re-inverts the fix)**

**THE PROBLEM:** the LMV side vote is APPROACH-DRIVEN — `fromAbove → buyVotes` (lmv.ts:696-697) and the lexicon's `WICK_REJECT fromAbove → BUY_SIDE` (candle-pressure.ts:363-370). The operator's semantics: the side is the SWEPT SIDE (the wick direction), never the approach. Result: the golden 101.14 HIGH sweep types DEMAND; the 100.945 floor lows type SUPPLY — both golden DXY levels invisible to their pools.

**THE CONTRACT (the swept-side predicate — build-agent executable):**

```typescript
// THE SWEPT-SIDE LAW (Bible 4.0 §4.16, verbatim mechanics):
//   an UPWARD sweep (breaks resistance above) → BUY_SIDE label → SUPPLY type (the sell-side liquidity
//     above was consumed — price swept the highs, grabbed buy stops, reversed)
//   a DOWNWARD sweep (breaks support below) → SELL_SIDE label → DEMAND type (the buy-side liquidity
//     below was consumed — price swept the lows, grabbed sell stops, reversed)
//   LONG_WICK: an UPPER wick = buy stops swept above → SUPPLY; a LOWER wick = sell stops swept below → DEMAND
//   SHORT_WICK_CONSOL: aligned UPPER tips at the range top → SUPPLY; aligned LOWER tips at the range bottom → DEMAND
// The APPROACH (fromAbove/fromBelow) is a TIE-BREAK ONLY — never the primary.
```

**THE FIX — lmv.ts:696-701 (the vote block — the replacement predicate):**

```typescript
// BEFORE (the approach-driven inversion — VERBATIM):
//   else if (r.fromAbove && !r.fromBelow) buyVotes++;
//   else if (r.fromBelow && !r.fromAbove) sellVotes++;
// AFTER (the swept-side primary — the wick direction decides):
else if (r.kind === 'SWEEP') {
  // the SWEEP branch already resolves the correct side (an upward sweep r.bar.high > hi is
  // SELL; a downward r.bar.low < lo is BUY) — keep it, make it the explicit first branch
  if (r.bar.high > hi) sellVotes++; else buyVotes++;
} else if (an.upperWick > an.lowerWick) {
  sellVotes++;              // buy stops swept ABOVE → the supply side
} else if (an.lowerWick > an.upperWick) {
  buyVotes++;               // sell stops swept BELOW → the demand side
} else if (r.bar.close >= center) {
  sellVotes++;              // a body closed back above the modal level = supply-held
} else {
  buyVotes++;
}
// the approach (fromAbove/fromBelow) becomes the tie-break ONLY, never the primary
```

**THE FIX — candle-pressure.ts:363-370 (the lexicon's candleSideVote — the same inversion):**

```typescript
// BEFORE (VERBATIM):
//   if (r.intent !== 'WICK_REJECT') return null;
//   ...
//   if (fromAbove && !fromBelow) return 'BUY_SIDE';
//   if (fromBelow && !fromAbove) return 'SELL_SIDE';
// AFTER (the swept-side mapping — the anatomy it already computes):
if (r.intent !== 'WICK_REJECT') return null;
const an = candleAnatomyOf(r);
return an.upperWick > an.lowerWick ? 'SELL_SIDE'   // buy stops swept above → supply
     : an.lowerWick > an.upperWick ? 'BUY_SIDE'    // sell stops swept below → demand
     : r.fromAbove ? 'BUY_SIDE' : 'SELL_SIDE';     // the approach = the tie-break only
```

**THE DATA-FLOW RIPPLE (the register's coupling graph — every consumer of the vote):** the vote → the rung `side` (lmv.ts:703-714) → the `type` conversion at `mdve/index.ts:406` (`type: z.side === 'BUY_SIDE' ? 'DEMAND' : 'SUPPLY'`) → the designation pools (isSupplyZone/isDemandZone) → the E3's side-scoped walks (mirror.ts:2431/:2485/:2531 — `z.side === wantSide && z.zfp <= 20`). A correct side flip changes: the DXY 101.14 rungs [101.12-101.154] → SUPPLY (the SHORT pool sees them) · the 100.945 rungs [100.936-100.952] → DEMAND (the LONG pool sees them) · the mirror TP walks' `wantSide` matches. **The LMV oracle (7/7 at ≤1p) is the regression net: the side flip must NOT move the rung levels, only their types.**

**THE GATE (done-when):** the probe re-prints the DXY zone universe — the [101.12-101.154] rungs now type SUPPLY, the [100.936-100.952] rungs now type DEMAND; the LMV oracle stays 7/7; diag-lexicons 38 checks stay green (the candle-pressure lexicon's X-3 piecewise-total still holds).

## 2.3 THE SELECTION MPSE ENGINE (the §8.1 union · the data-derived reach · the pressure-DESC · the edge-distance nesting)
**2.3 THE SELECTION MPSE ENGINE (C-1/C-2/C-3/C-4 + M-2 — the designation as a pure function of the map + the analysis point)**

**THE PROBLEM (the interaction, proven):** the C-6 open → the C-1 travelMax reach (101.369) → the C-2 distance ranking (the 101.33 rung at 3.6p) → the C-3 rung-direct bypass (the zone never competes) → the C-4 pressure-ASC → the M-2 containment (the 0.1p overhang). The DXY Monday designates the 101.296 rung ladder. The EU Monday won by luck (3 rungs, 24.8p away → the I2 promoted the nearest zone — the Friday supply 1.14460).

**THE CONTRACT — the designation as a total function:**

```typescript
interface ShapeDayZone {                 // the output contract — ZONE ANCHORS ONLY (the ZR-6A strip stays)
  day: string; shape: ShapeCode; direction: 'LONG' | 'SHORT' | 'RANGE';
  keyZoneId: string; supplyZoneId: string | null; demandZoneId: string | null;
  keyZoneType: 'SUPPLY' | 'DEMAND' | null; deepDemandZoneId: string | null;
  floor: number; ceiling: number; dayOpenSpot: number;
  session: string; confidence: number;   // evidence-derived (§2.7) — NEVER the 0.5 default
}

// THE SELECTION — the five mechanical stages:
function projectZoneForDay(zones, day, shape, priorStoryline, analysisPointMs): ShapeDayZone {
  const dayOpenSpot = dayOpenSpotAt(analysisPointMs, bars1H);        // §2.1 — the analysis-point price
  const travel = dataDerivedTravel(zones, dayOpenSpot);              // STAGE 1 — the map-derived band
  const band = { floor: dayOpenSpot - travel.max, ceiling: dayOpenSpot + travel.max };

  // STAGE 2 — THE §8.1 UNION POOL (the C-3 kill): zones AND rungs are ONE candidate set.
  //   structural(zone) ⟺ source ∈ {ORDER_BLOCK, LQZ} — the operator's union, the I2 comment's own law.
  const pool = [...zones, ...ltfZones];                              // the telescoped union, no pre-filter
  const supplyCands = pool.filter(isSupplyZone).filter(inBand).filter(reachable);
  const demandCands = pool.filter(isDemandZone).filter(inBand).filter(reachable);

  // STAGE 3 — THE REACH FROM THE MAP (the C-1 kill): the RANGE-day reach = the day's ACTUAL
  //   structures (the R1-b day band, :1588-1589), NEVER open ± travelMax.
  //   dayReachHigh = max ceiling of the day's supply zones; dayReachLow = min floor of the day's demands.
  const supplyReach = dayReachHigh ?? nearestSupplyCeilingAbove(dayOpenSpot, pool);   // the first quality
  const demandReach = dayReachLow  ?? nearestDemandFloorBelow(dayOpenSpot, pool);      // structure beyond the open
  const supplyFloor = dayReachLow ?? dayOpenSpot; const demandCeiling = dayReachHigh ?? dayOpenSpot;

  // STAGE 4 — THE EVIDENCE RANKING (the C-4 + C-2 kill): the pressure FIRST, the position LAST.
  //   THE TOTAL ORDER (the strongest() rewrite — the pressure DESC is the PRIMARY leg):
  const strongest = (cands) => [...cands].sort((a, b) =>
    (pressureScoreOf(zoneToLexiconPressure(b)) - pressureScoreOf(zoneToLexiconPressure(a))) ||  // DESC — the fix
    (a.zfp - b.zfp) ||                                                                          // the failure prob asc
    (dayWindowRank(b) - dayWindowRank(a)) ||
    (recencyRank(a) - recencyRank(b)) ||
    (Math.abs(zoneCenter(a) - dayOpenSpot) - Math.abs(zoneCenter(b) - dayOpenSpot)) ||          // from the OPEN, never the reach
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0];

  // STAGE 5 — THE NESTING (the M-2 kill): the edge-distance predicate replaces the strict containment.
  //   An internal rung qualifies when its FAR EDGE sits within the near-edge band of the zone's ACTIVE edge:
  //     |activeEdgeOf(z) - rungFarEdge| / pipSize <= edgeBandPips
  //   where edgeBandPips = dataDerivedTravel(...).nearEdge (the ATR-proxy band, §2.7) — NEVER the fixed 5.
  const pick = applySdPreference(supplyPick ?? demandPick, supplyCands, dayOpenSpot);   // the I2 rewrite
  return { keyZoneId: pick?.id ?? '', supplyZoneId, demandZoneId, ...,
           dayOpenSpot, confidence: evidenceConfidence(pick) };                          // §2.7
}

// THE §8.1 UNION — the rung-direct becomes a TIE-BREAK, never a bypass:
//   BEFORE: if (supplyRungs.length > 0) pick = strongest(supplyRungs, supplyReachRef);
//   AFTER:  pick = strongest(supplyCands);   // the LMV rungs rank INSIDE the one pool
//           (the I2 S/D preference then promotes the containing zone at equal structural position —
//            the EU Monday win is the TARGET behavior, preserved, never a casualty)
```

**THE DATA-DERIVED TRAVEL (the C-1 replacement — the fixed SHAPE_TRAVEL ladder dies):**

```typescript
function dataDerivedTravel(pool: DXYZone[], dayOpenSpot: number): { min: number; mid: number; max: number; nearEdge: number } {
  // the SMC ratio anchor (the precedent: shapeBrainAtrProxyPips :1116-1123, mirror.ts:367):
  //   the day's travel = the map's actual structure, scaled by the ATR proxy — NEVER a fixed pip ladder.
  const atrProxyPips = shapeBrainAtrProxyPips(pool, pipSize);       // 4 × the narrowest zone width / pip
  return {
    min: 0.5 * atrProxyPips, mid: 1.0 * atrProxyPips, max: 1.5 * atrProxyPips,
    nearEdge: 0.25 * atrProxyPips,   // the edge-distance band for the nesting (§2.3 STAGE 5)
  };
  // SHAPE_TRAVEL (:1409-1419) is retained ONLY as the last-resort fallback when the map yields no width —
  //   the register's entry 1: "Keep SHAPE_TRAVEL ONLY as the last-resort fallback."
}
```

**THE GATE (done-when):** the probe re-walks the DXY Monday — the supplyReach = the day's actual structures (the first quality supply ≥ the open), the pick = the 101.14-adjacent structure (the zone [101.027-101.153] or the corrected SUPPLY rungs [101.12-101.154], per the C-8 fix order); the EU Monday pick UNCHANGED (the Friday supply 1.14460 — the win preserved); the GU demand pick = the 1.33380 rung [1.33306-1.33343] (the golden-containing band) instead of the degenerate 1.33270; the golden gate re-measured.

## 2.4 THE DIRECTION + THE MACRO AUTHORITY (the R-day designation · the divergence handler flip · the G3 contract)
**2.4 THE DIRECTION + THE MACRO AUTHORITY (C-5 — the R-day designation · the divergence handler flip · the G3 contract)**

**THE PROBLEM:** the day-direction switch flattens R→NEUTRAL (shape-brain.ts:2181) → toEntryDirection collapses NEUTRAL→RANGE (:1427-1431) → the RANGE dispatch defaults supply-primary (:1869-1875) → the GU Monday designates SHORT at the supply 1.33623. The operator's GU Monday is LONG (the kept EU cascade). The divergence 0.40 is "flag only — pair E2 stands" (report-v452.ts's computeChainDivergence ≤ 0.35 consumer).

**THE CONTRACT — the direction as a derived quantity, the macro as the authority:**

```typescript
// THE DIRECTION LAW (the G3 contract + D59):
//   "the GBP/USD Monday projection direction === 'LONG'; the R divergence recorded (MACRO_DIVERGENCE); the macro wins."
//   "the DIRECTION is the derailment — the unified macro authority must fix it (the mirror law!)"
// The R (recovery) day is NOT directionless: the recovery RISES back toward the pre-breakout level —
//   the supply above is the recovery's TARGET, the demand below is the entry fuel. The direction derives
//   from the E1 pressure evidence + the macro cascade, NEVER a blanket supply-primary.

// THE DAY-DIRECTION SWITCH REWRITE (shape-brain.ts:2151-2230):
function dayDirection(shape, failingZone, zones, spot, macroDirection): 'UP' | 'DOWN' | 'RANGE' {
  switch (shape) {
    case 'SS':   return bothBoundsHold(zones, spot) ? 'RANGE' : macroDirection;  // bi-directional ONLY when both hold
    case 'R':    return macroDirection ?? recoveryDirection(zones, spot);        // the C-5 kill: the macro wins
    case 'WL':   case 'PWL': case 'WLS': return 'RANGE';
    case 'RWL':  case 'PRWL': return failingZone ? (failingZone.floor > spot ? 'DOWN' : 'UP') : 'RANGE';
    case 'BS':   case 'PBS': return failingZone ? failingDirection(failingZone) : inferDirection(zones, spot);
    case 'RS':   return 'UP';
    case 'STORM': return 'RANGE';     // the explicit case — the 12-member ShapeCode fully covered
    case 'DWL':  return macroDirection; // the explicit case — no silent default
    default:     return 'NEUTRAL';    // the only remaining default — documented, never silent
  }
}

// THE toEntryDirection COLLAPSE KILL (shape-brain.ts:1427-1431):
//   BEFORE: 'NEUTRAL' → 'RANGE' (the R-day → the supply-primary mechanism)
//   AFTER:  'NEUTRAL' resolves via the pressure evidence — the designation emits the side
//           the E1 pressure supports (the demand below = the LONG entry fuel on a recovery day)
function toEntryDirection(direction, supplyEvidence, demandEvidence): 'LONG' | 'SHORT' | 'RANGE' {
  if (direction === 'UP') return 'LONG';
  if (direction === 'DOWN') return 'SHORT';
  if (direction === 'RANGE') return 'RANGE';
  // NEUTRAL — the pressure evidence decides (the ZR-6D "the label must match the side")
  return supplyEvidence >= demandEvidence ? 'SHORT' : 'LONG';
}
```

**THE DIVERGENCE HANDLER FLIP (the C-5 second half — report-v452.ts's computeChainDivergence consumer + cascade-translation.js):**

```typescript
// BEFORE (VERBATIM — the §9.1 chain comment documents the defect): "computeChainDivergence ≤ 0.35 — FLAG ONLY,
//   never override the pair's E2" — the pair's E2 core stands even when the cascade contradicts it.
// AFTER (the G3 contract — the macro WINS):
function applyDivergence(euCore, guCore, euCascaded, guCascaded) {
  const guDivergence = computeChainDivergence(guCore, guCascaded);     // 0.40 measured 2026-08-09
  if (guDivergence > DIVERGENCE_THRESHOLD) {                            // 0.35 — verified at cascade-translation.js
    recordFailure('MACRO_DIVERGENCE', { pair: 'GBP/USD', divergence: guDivergence,
      coreDirection: guCore.direction, macroDirection: guCascaded.direction });   // the store row — data, never dropped
    // THE MACRO WINS: the designation flips to the cascade's direction + the cascade's designation
    //   (the kept EU LONG → the GU LONG at the demand below) — the D59 ruling, the mirror law
    return { direction: guCascaded.direction, keyZoneId: guCascaded.keyZoneId, flipped: true };
  }
  return { direction: guCore.direction, keyZoneId: guCore.keyZoneId, flipped: false };
}
// THE THREE CONSUMERS MUST AGREE (the register's sharp edge): report-v452's handler + golden-gate's G3
//   (macroDivergenceRows read from the store) + ChainContext.divergences (reasoning-chain.ts) —
//   the fix edits the header chain-comment + the inline handler comment + the code TOGETHER,
//   or the next build agent restores the flag-only semantics from the comment.
```

**THE FULL dayDirection SWITCH (the C-5 kill — build-agent executable, the complete 12-member ShapeCode coverage):**

```typescript
// shape-brain.ts:2151-2230 — REWRITTEN (the BEFORE's flattening is quoted in §1.1 C-5):
const SHAPE_TO_BASE_DIRECTION: Record<ShapeCode, 'UP' | 'DOWN' | 'RANGE' | 'NEUTRAL'> = {
  SS: 'RANGE', BS: 'DOWN', WL: 'RANGE', RWL: 'RANGE', R: 'NEUTRAL', PBS: 'DOWN',
  WLS: 'RANGE', DWL: 'NEUTRAL', STORM: 'RANGE', RS: 'UP', PWL: 'RANGE', PRWL: 'RANGE',
};
function dayDirection(shape: ShapeCode, failingZone: DXYZone | null, zones: DXYZone[],
                      spot: number, macroDirection: 'LONG' | 'SHORT' | null): 'UP' | 'DOWN' | 'RANGE' {
  const base = SHAPE_TO_BASE_DIRECTION[shape] ?? 'NEUTRAL';
  // THE SHAPE-SPECIFIC RESOLUTIONS (the operator's shape semantics — the MACRO_CONTEXT Part 2.3):
  if (shape === 'R') return macroDirection ?? recoveryDirection(zones, spot);   // THE C-5 KILL: the R day follows
                                                                                // the macro (the kept cascade) — the
                                                                                // recovery RISES to the pre-breakout
                                                                                // supply; the demand below = the fuel
  if (shape === 'DWL') return macroDirection ?? 'RANGE';                         // the explicit DWL case — no silent default
  if (shape === 'RWL' || shape === 'PRWL')
    return failingZone ? (failingZone.floor > spot ? 'DOWN' : 'UP') : 'RANGE';
  if (shape === 'BS' || shape === 'PBS')
    return failingZone ? failingDirection(failingZone) : inferDirection(zones, spot);
  return base;                                                                    // SS → RANGE (bi-directional when both
                                                                                  // bounds hold), WL/WLS → RANGE, RS → UP
}
function recoveryDirection(zones: DXYZone[], spot: number): 'UP' | 'DOWN' {
  // the R day's pressure evidence: the nearer bound + the stronger pressure decides
  const supplyAbove = nearestSupply(zones, spot); const demandBelow = nearestDemand(zones, spot);
  if (!supplyAbove) return 'UP'; if (!demandBelow) return 'DOWN';
  return pressureOf(supplyAbove) >= pressureOf(demandBelow) ? 'UP' : 'DOWN';
  // the GU Monday after the fix: the macro (the kept EU LONG) says LONG → the R day designates the demand
  //   below (the 1.33380 rung) — the SHORT-from-supply-primary is dead
}
```

**THE FULL DIVERGENCE HANDLER (report-v452.ts — the C-5 second half, the comment + the code together):**

```typescript
// THE §9.1 CHAIN COMMENT (REWRITTEN — the old "FLAG ONLY, never override the pair's E2" is the derailment's
//   seed; the comment + the code change TOGETHER or the next agent restores the flag-only from the comment):
//   "computeChainDivergence ≤ 0.35 — the macro-wins law (the G3 contract + D59): when the cascade direction
//   contradicts the pair's E2 core beyond the threshold, the MACRO AUTHORITY WINS — the direction + the
//   designation flip to the cascade's, the divergence recorded in the store (MACRO_DIVERGENCE)."
function applyDivergence(euCore, guCore, euCascaded, guCascaded, store) {
  const DIVERGENCE_THRESHOLD = 0.35;                       // verified at cascade-translation.js
  const guDivergence = computeChainDivergence(guCore, guCascaded);   // 0.40 measured — the GU Monday
  if (guDivergence > DIVERGENCE_THRESHOLD) {
    store.recordFailure('MACRO_DIVERGENCE', { pair: 'GBP/USD', week, divergence: guDivergence,
      coreDirection: guCore.direction, macroDirection: guCascaded.direction });   // the data, never dropped
    return { direction: guCascaded.direction, keyZoneId: guCascaded.keyZoneId,
             supplyZoneId: guCascaded.supplyZoneId, demandZoneId: guCascaded.demandZoneId, flipped: true };
  }
  return { direction: guCore.direction, keyZoneId: guCore.keyZoneId, flipped: false };
}
// THE THREE CONSUMERS (the register's sharp edge — ALL must agree after the fix):
//   1. report-v452's handler (above) — the flip
//   2. golden-gate's G3 — the macroDivergenceRows read from the store → the direction check passes
//   3. reasoning-chain's ChainContext.divergences — the divergence appended (the T11 evidence visible)
// The GU Monday after the fix: {R, LONG, the demand designating the 1.33330 area} + the store row (0.40).
```

**THE GATE (done-when):** the E2 core's GU Monday = {R, LONG, the demand designating the 1.33330 area}; the divergence recorded in the store (MACRO_DIVERGENCE, the 0.40 value); G3 passes on the direction + the divergence; the golden gate exit 0.

## 2.5 THE E3 WALL CLASSIFICATION (the 3-mitigation doctrine · the Law-14 walk rewrite · the swept-shelf-as-wall)
**2.5 THE E3 WALL CLASSIFICATION (C-7 — the 3-mitigation doctrine · the Law-14 walk rewrite · the swept-shelf-as-wall)**

**THE PROBLEM (the three-predicate combination, verified):** mirror.ts:2875 (the `sweepCount >= 1 ? -30 : 0` — a swept shelf PENALIZED for being defended) + :2881 (`.filter((c) => !weakPass || c.z.zfp <= 30)` — zfp>30 walked past) + :2903 (`else if (z.zfp > 20) return false` — the frozen fresh-wall) — the DXY SHORT's TP walks past the defended 100.845 shelf (102 reaction candles, the modal body-close 100.869, the deepest probe 100.596 — the DXY forensic) to the Friday-formed demand [100.704-100.783] near edge (100.780).

**THE DOCTRINE (the operator, verbatim 2026-08-09):** "A zone does not immediately magically fail it takes minimum 3 mitigations before it fails. the only exception is virgin MoM zones IN THE MIDDLE OF A BS/WL pathway." + the reaction ladder (UM 100% / 1x ~80% / 2x ~50% / 3x+ TP-target-only — the Bible's Law 31) + the significance order (the anchor doctrine): UM BoM (100%) → LQZ-overlapping S/D (Earth+Fire) → MoM ≤1x → other (near-edge) → depleted (3x+) NOT a target.

**THE CONTRACT — the E1-pressure wall classification (the replacement — the machinery is ALREADY in the file):**

```typescript
// THE WALL PREDICATE (the C-7 kill — the three dumb predicates become ONE pressure read):
//   isStructuralWall (:2112-2122) + anchorToLexiconPressure (:2245-2262) are the EXISTING E1-pressure
//   overrides — the rewrite makes them the PRIMARY, never the bridge.
function isDefendedWall(zone, entry, direction, ctx): boolean {
  const pressure = anchorToLexiconPressure(zone, ctx);          // the lexicon-4 lifecycle read
  const mitigations = battleCountOf(zone);                      // reactionEvents → mitigationCount → reactionCount
  // THE 3-MITIGATION LADDER (the operator's law — the ONLY auto-death is the virgin MoM mid-BS/WL):
  if (mitigations >= 3) return false;                           // 3x+ = TP-target-only — passable
  if (mitigations === 0 && isVirginMoM(zone)) return false;     // the virgin MoM = the death zone (the ONLY exception)
  return true;                                                  // 0x-2x (incl. the swept-and-recovered 1x) = DEFENDED
}
// THE SWEEP IS EVIDENCE OF DEFENSE, NEVER OF SPENT: a swept-and-recovered shelf (1x, the modal body-close
//   held) is the WALL the move reacts at — the register: "a swept shelf with zfp > 30 AND sweepCount ≥ 1 is
//   double-excluded −30/15" — BOTH exclusions die.
```

**THE Law-14 WALK REWRITE (computeLmvTP :2808-2964 + computeMirrorTP :555-678):**

```typescript
// BEFORE (VERBATIM — the three predicates):
//   significance = (z.sweepCount >= 1 ? -30 : 0) + (z.zfp <= 20 ? 40 : z.zfp <= 30 ? 25 : 15)   // :2874-2876
//   .filter((c) => !weakPass || c.z.zfp <= 30)                                                  // :2879-2881
//   bridged ? isStructuralWall(bridged) : z.zfp <= 20                                           // :2901
//   else if (z.zfp > 20) return false                                                           // :2903
// AFTER (the E1-pressure significance — the candle-count zfp as a TIEBREAK ONLY):
function computeLmvTP(entry, sl, direction, model, pair, pipValue, opts) {
  const candidates = opposingSideCandidates(model, direction, entry);           // the opposing side
  const ranked = candidates
    .map(c => ({ c, wall: isDefendedWall(c, entry, direction, ctx),
                 pressure: anchorToLexiconPressure(c, ctx),                     // the E1 pressure read
                 sweep: c.sweepCount ?? 0, zfp: c.zfp }))
    .sort((a, b) =>
      (Number(b.wall) - Number(a.wall)) ||                                      // the defended walls FIRST
      (pressureRank(b.pressure) - pressureRank(a.pressure)) ||                  // the E1 pressure
      (a.sweep - b.sweep) ||                                                    // the fewer sweeps (the fresher) — NEVER a −30 penalty
      (a.zfp - b.zfp) ||                                                        // the candle-count as the tiebreak ONLY
      (Math.abs(centerOf(a.c) - entry) - Math.abs(centerOf(b.c) - entry)));     // the position last
  const wall = ranked.find(r => r.wall);                                        // the FIRST defended wall = the TP
  return wall ? { tp: strengthDrivenEdge(wall.c, wall.pressure, direction, pipValue),  // §2.5 the edge choice
                  rungId: rungIdOf(wall.c) } : null;                             // null = the trade does not exist (the D3 law)
}
// THE STRENGTH-DRIVEN EDGE (the anchor doctrine, preserved — the I-8 pathCap's internal-LQZ near edge):
//   STRONG (BoM · confluence ≥ 8 · fortress) → the CLOSE edge + the 1-2p spread
//   WEAK (virgin MoM · low confluence) → the FAR edge — "the stronger the pressure of the zone, the weaker
//   the mitigation will be prior to the reaction. Strong pressure zones = near instant reaction. exit on the
//   closest zone edge... Weak pressure zones = delayed reaction. Maximize the profits you catch"
// The pathCap (firstUnmitigatedOpposingZone :2366) is REPLACED by the first DEFENDED wall — the 100.845 shelf
//   (1x, defended) IS the wall → the TP lands at 100.845 → the chained DXY LONG at the 100.845-adjacent level.
```

**THE GATE (done-when):** the probe re-traces the DXY SHORT's TP — the pathCap = the 100.845 shelf (the defended wall), the TP = 100.845 ± the strength-driven edge; the chained DXY LONG's E = the 100.845-adjacent level → the near-edge refinement → 100.945 (Δ≤3p); the EU lane's TP 1.14095 UNCHANGED (the internal-LQZ near edge — the I-8 mechanism preserved); the golden gate re-measured.

## 2.6 THE SANITY MACHINE (the degenerate-rung gate · the rung-validity predicate · the picker's width gate)
**2.6 THE SANITY MACHINE (M-1 — the degenerate-rung gate · the rung-validity predicate · the picker's width gate)**

**THE PROBLEM:** the GU demand pick = `LMV|GBP/USD|1.33270` [1.33059-1.33059] — a zero-width collapsed rung (floor == ceiling), 21 pips below its id-embedded level — admitted by the picker with NO sanity gate (mirror.ts:1507-1525 pushes the LQZ candidates with no `bottom < top` check). sl-lmv.ts:33-34 tolerates degenerate zones BY DESIGN (the totality law — "degenerate zones still yield a defined SL on the adverse side of entry") — **the sanity gate belongs in the PICKER, NEVER in computeSL_LMV** (the register's single most important architectural fact).

**THE CONTRACT — the rung-validity predicate (the picker's total-function gate):**

```typescript
// THE RUNG-VALIDITY PREDICATE (a total function over every candidate — the invariant):
function isValidRung(z: LqzZoneMatrix): boolean {
  const widthPips = (z.top - z.bottom) / pipOf(z);
  // (1) the WIDTH GATE: a liquidity rung is a BAND — a zero-width (collapsed) geometry is a defect,
  //     never a level. The LMV's own modal emission produces real bands (the 3.4p [101.12-101.154]).
  if (widthPips <= 0) return false;
  if (widthPips < MIN_RUNG_WIDTH_PIPS) return false;          // 0.5p = the 0.5-pip pair 101.235/101.240 survives;
                                                              // 0 = the collapsed geometry dies
  // (2) THE ID-CENTER CONSISTENCY: the id-embedded level (LMV|pair|<center>) must sit inside the band —
  //     the [1.33059-1.33059] rung's id 1.33270 is 21p from its band: a defect, not a level.
  const idLevel = Number(String(z.id).split('|')[2]);
  if (Math.abs(idLevel - z.center) > ID_CENTER_TOLERANCE_PIPS * pipOf(z)) return false;  // 2p
  // (3) THE BAND REACHABILITY: the band must lie within the pair's tradeable range (a band 21p from
  //     its own id cannot be reached by the designation's reach filters honestly)
  return true;
}
// THE PICKER'S GATE (selectPairNativeZone :1389-1711 — the candidate admission):
//   BEFORE: candidates.push({kind:'LQZ', …}) with no width check
//   AFTER:  for (const z of lmvTable) if (isValidRung(z)) candidates.push(...);
//           — the collapsed [1.33059-1.33059] is REJECTED at admission; the golden-containing
//             1.33380 rung [1.33306-1.33343] (3.7p wide, the id 1.33380 inside the band) is ADMITTED.
```

**THE CONSTANTS (each with the rationale):** `MIN_RUNG_WIDTH_PIPS = 0.5` (the 0.5-pip pair 101.235/101.240 — the operator's "do what make sense and aligns with the visual example" ruling — must SURVIVE; a 0.0 width = a defect) · `ID_CENTER_TOLERANCE_PIPS = 2` (the ANCHOR_DOCTRINE "within ~1-2 pips = a rung" — a 21p drift = a degenerate geometry).

**THE RECONSTRUCTION OPTION (when a degenerate rung is the ONLY candidate in a band):** do NOT emit it — the designation's honest-absence law (the CHAIN_ANCHOR_OUT_OF_REACH precedent, the ZR7C spec): the absence is logged (`DEGENERATE_RUNG_REJECTED`, the rung id + the band), the selection moves to the next candidate. A forced pick on a collapsed geometry = the theatrical pick — BANNED.

**THE FULL I2 REWRITE (the §2.3 STAGE 5 — the edge-distance nesting, build-agent executable):**

```typescript
// THE I2 S/D-ZONE PREFERENCE (shape-brain.ts:1924-1991 — REWRITTEN):
//   BEFORE: the strict containment (r.floor >= z.floor - 1e-9 && r.ceiling <= z.ceiling + 1e-9) — the
//           0.1p overhang failed the DXY 101.14 rung's promotion into its supply [101.027-101.153].
//   AFTER:  the edge-distance predicate — an internal rung qualifies when its FAR EDGE sits within the
//           near-edge band of the zone's ACTIVE edge (the operator's "3 pips outside the back edge /
//           1-2 pips inside the close edge" — the distances, never the strict containment).
function applySdPreference(pick, cands, dayOpenSpot, pool, pipSize) {
  if (!pick || !String(pick.id).startsWith('LMV|')) return pick;          // the bare-zone pick stays
  if (!(day === 'Mon' || priorWeekStoryline != null)) return pick;        // the I2's existing gate
  const pickSide = pickSideOf(pick);                                      // SUPPLY | DEMAND
  const edgeBandPips = dataDerivedTravel(pool, dayOpenSpot).nearEdge;     // the ATR-proxy band (§2.3) — NEVER 5
  const candidates = cands.filter(z => {
    const tf = String(z.id).split('|')[1];
    if (tf !== '1H' && tf !== '4H') return false;                         // the 1H/4H S/D zones only
    if (!isSameSide(z, pickSide)) return false;
    const activeEdge = pickSide === 'SUPPLY' ? z.ceiling : z.floor;       // activeEdgeOf — the operator's edge
    const internalRungs = internalLmvRungsOf(z, pool);                    // the rungs inside the zone
    if (!internalRungs.length) return false;
    return internalRungs.some(r =>
      Math.abs(activeEdge - farEdgeOf(r, pickSide)) / pipSize <= edgeBandPips);  // the EDGE-DISTANCE — the fix
  });
  if (!candidates.length) return pick;
  // the position-aware sort (the nearest internal rung to the dayOpenSpot → the zfp → the id):
  return [...candidates].sort((a, b) =>
    (nearestInternalRungDist(a, dayOpenSpot, pool) - nearestInternalRungDist(b, dayOpenSpot, pool)) ||
    (a.zfp - b.zfp) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0];
}
// THE DXY 101.14 CASE AFTER THE FIX: the rung [101.12-101.154]'s far edge 101.154 vs the supply
//   [101.027-101.153]'s active edge (the ceiling) 101.153 = 0.1p ≤ the edge band → PROMOTED —
//   the designation lands on the supply the operator trades. The EU Monday's I2 promotion (the win)
//   is mathematically unchanged (the same predicate, the same data).
```

**THE FULL STRONGEST() REWRITE (the §2.3 STAGE 4 — the evidence total order, build-agent executable):**

```typescript
// shape-brain.ts:1756-1776 — REWRITTEN (the BEFORE is quoted in §1.1 C-4/C-2):
function strongest(cands: DXYZone[], dayOpenSpot: number, ctx): DXYZone | undefined {
  return [...cands].sort((a, b) => {
    const pa = pressureScoreOf(zoneToLexiconPressure(a, ctx));   // +40 VIRGIN-BoM / +20 FORTRESS / −30 DEPLETED
    const pb = pressureScoreOf(zoneToLexiconPressure(b, ctx));
    return (pb - pa) ||                                             // THE PRESSURE DESC — the C-4 fix (the FIRST leg)
           ((a.zfp ?? 99) - (b.zfp ?? 99)) ||                       // the failure prob asc — the SECOND leg
           (dayWindowRank(b) - dayWindowRank(a)) ||
           (recencyRank(a) - recencyRank(b)) ||
           (Math.abs(zoneCenter(a) - dayOpenSpot) - Math.abs(zoneCenter(b) - dayOpenSpot)) ||  // from the OPEN — the C-2 fix
           (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  })[0];
}
// THE ORDER CHANGE'S MEANING: the pressure is now the PRIMARY (the doctrine: "pressure mechanics are the
//   fundamental reality everything is built on top of"), the position is the tiebreak (the ladder-steps:
//   the near-open steps win only at equal pressure — the operator's 101.14 rungs (fresh, swept-side SUPPLY
//   after W2) outrank the 101.30 rungs (the pressure-equal but 20p further) — the reach no longer invents
//   the ranking.
```

**THE FULL computeLmvTP REWRITE (the §2.5 — the E1-pressure wall, build-agent executable):**

```typescript
// mirror.ts:2808-2964 — REWRITTEN (the BEFORE's three predicates are quoted in §1.1 C-7):
export function computeLmvTP(entry, sl, direction, model, pair, pipValue, opts = {}) {
  const { passThroughWeakWalls = false, structuralExtension = false, shapeDay } = opts;
  const pip = pipValue ?? PIP[pair];
  const wantSide = direction === 'SHORT' ? 'BUY_SIDE' : 'SELL_SIDE';      // the opposing side's liquidity
  const candidates = model.lmv.table.filter(z => z.side === wantSide && centerOf(z) > entry === (direction === 'SHORT'));
  // THE E1-PRESSURE WALL CLASSIFICATION (the C-7 kill — isDefendedWall from §2.5):
  const ranked = candidates
    .map(z => ({ z, wall: isDefendedWall(z, entry, direction, { model, pip }),
                 pressure: anchorToLexiconPressure(z, { model, pip }), sweep: z.sweepCount ?? 0, zfp: z.zfp }))
    .sort((a, b) =>
      (Number(b.wall) - Number(a.wall)) ||                                // the defended walls FIRST
      (pressureRank(b.pressure) - pressureRank(a.pressure)) ||            // the E1 pressure
      (a.sweep - b.sweep) ||                                              // the fewer sweeps — NEVER the −30 penalty
      (a.zfp - b.zfp) ||                                                  // the candle-count tiebreak ONLY
      (Math.abs(centerOf(a.z) - entry) - Math.abs(centerOf(b.z) - entry)));
  const wall = ranked.find(r => r.wall);                                  // the FIRST defended wall
  if (!wall) return null;                                                 // the D3 law: no structural target = no trade
  const tp = strengthDrivenEdge(wall.z, wall.pressure, direction, pip);   // §2.5 — the close/far edge by the strength
  // THE INTERNAL-LQZ NEAR-EDGE CAP (the I-8 mechanism — preserved, the EU win's TP terminal):
  const internal = strongestInternalLqzRung(wall.z, model, wantSide);     // :2423 family
  return internal ? { tp: nearEdgeOf(internal, direction, pip), rungId: rungIdOf(internal) }
                  : { tp, rungId: rungIdOf(wall.z) };
}
// THE DXY SHORT AFTER THE FIX: the walk's first DEFENDED wall = the 100.845 shelf (1x, the modal body-close
//   100.869 — swept Friday AND recovered = DEFENDED) → the TP = 100.845 ± the strength-driven edge →
//   the chained DXY LONG's E at the 100.845-adjacent level → the near-edge refinement → 100.945 (Δ≤3p).
```

**THE FULL PICKER GATE (the §2.6 — the candidate admission rewrite, build-agent executable):**

```typescript
// mirror.ts:1507-1525 (the LQZ branch of selectPairNativeZone) — REWRITTEN:
//   BEFORE: candidates.push({kind:'LQZ', …}) — no width check → the collapsed [1.33059-1.33059] admitted.
//   AFTER:  the rung-validity gate at ADMISSION (the only path into the candidates — §2.6):
for (const z of lmvTable) {
  if (!isValidRung(z)) { record('DEGENERATE_RUNG_REJECTED', { id: z.id, band: [z.bottom, z.top] }); continue; }
  candidates.push({ kind: 'LQZ', zone: z, ... });
}
// THE GU AFTER THE FIX: the 1.33270 [1.33059-1.33059] → isValidRung fails (the width 0 ≤ MIN_RUNG_WIDTH 0.5 +
//   the id-center 21p > 2p tolerance) → REJECTED + the verdict logged; the 1.33380 [1.33306-1.33343]
//   (3.7p wide, the id 1.33380 inside the band) → ADMITTED → the pick = the golden-containing band.
```

**THE GATE (done-when):** the probe re-traces the GU demand pick — the 1.33270 degenerate rung REJECTED at admission (the verdict + the reason logged), the pick = the 1.33380 rung [1.33306-1.33343] (the golden-containing); the 0.5-pip pair 101.235/101.240 still BOTH emitted (the LMV oracle 7/7 intact — the width gate at 0.5p does not touch them); the golden gate re-measured.

## 2.7 THE SINGLE-SOURCING (the phantom-BoM all-4 · the Law-7 buffers · the proximity ratio · the derived constants)
**2.7 THE SINGLE-SOURCING + THE DERIVED CONSTANTS (M-2 through M-9, M-11, M-12 — the drift hazards + the fixed numbers that become data)**

**2.7.1 THE PHANTOM-BOM ALL-4 SINGLE-SOURCE (M-4):** THREE implementations exist — the lexicon's `predPhantomBomAll4` (zone-classification.ts:145, the mid-position `mid ∈ (0,0.9)` :88, the opposing-scan over `d.zones` :116-121) · the reasoning-chain's `phantomBoMExemption` (:520-575, NO mid requirement :534-536, the macro-origin via `sourceZone.parent/nestedWithin` :558-563) · the shape-brain adapter `isPhantomBoMFortress` (:1136-1181). **THE FIX:** one exported implementation in `zone-classification.ts` (the semantic-intent layer per the operator's mapping); `phantomBoMExemption` + `isPhantomBoMFortress` DELEGATE to it. Then RECONCILE the mid-position divergence deliberately — the operator's all-4 (the LEXICON_SPEC): `largeObWidth ∧ midSwingFakeout ∧ preFormationOpposingBoMReaction ∧ macroOriginContinuation — 3-of-4 → DEATH`. The register's verdict: "a zone can be exempted by one and rejected by the other" — after the single-source, impossible.

**2.7.2 THE LAW-7 BUFFERS SINGLE-SOURCE (M-7):** the `{'EUR/USD': 2, 'GBP/USD': 3, 'AUD/USD': 3, 'DXY': 5}` exists TWICE (mirror.ts:98-100 + sl-lmv.ts:61-63 — "Replicated, not imported" per sl-lmv's comment). **THE FIX:** sl-lmv.ts is FROZEN — the duplication is documented as a FROZEN-EDGE HAZARD (the values identical today; a future change MUST update both + the register entry). Do NOT edit the frozen file; the single-source lives in mirror.ts with a frozen-file citation.

**2.7.3 THE OPPOSING-PROXIMITY RATIO (M-3):** `OPPOSING_PROXIMITY_PIPS = 60` + the ±3p tolerances (zone-classification.ts:49/:102/:109/:113 + the duplicate reasoning-chain.ts:544) — a fixed pip window where the doctrine demands the ELEMENT match ("the opposing structure sits at/above the zone (the ELEMENT match, never the price level)"). **THE FIX:** `OPPOSING_PROXIMITY_RATIO × atrPips` (the SMC ratio doctrine already used for LARGE_OB_RATIO — "the OB's size is inherently a function of the move it precedes — NEVER a fixed pip number"); the ±3p tolerances become the ATR-proxy band. Single-source the constant into zone-classification.ts; reasoning-chain imports it.

**2.7.4 THE BoM-GATED +40 (M-5):** zone-pressure.ts:268 — the virgin-MoM scores 20, not 40. The ZR7 spec's +40 ENTRY-PRIMARY is defined for the VIRGIN state. **THE FIX:** the gate reads the phantom/fortress classification — `input.zoneClassification === 'BoM' || isPhantomBoM-equivalent ? 40 : 20` — the fortress-exempted virgin MoM (the EU case) keeps the +40; the bare virgin MoM (the death-zone candidate) keeps the −20 penalty. The diag-lexicons X-5 assertions updated.

**2.7.5 THE 30m-MoM FORCE (M-6):** the telescoping law hardcoded in 3 copies (bom-mom.ts:118 + ob-engine.ts:399/:459). **THE FIX:** fold the law into `classifyBoMMoM`'s branch order as a stated precondition (a single copy): `if (input.timeframe === '30m' || input.timeframe === '15m') return 'MoM';` INSIDE the classifier — remove the two belt-and-suspenders forces at ob-engine.ts:399/:459. The behavior is unchanged; the copies die.

**2.7.6 THE EVIDENCE-DERIVED CONFIDENCE (M-8):** shape-brain.ts:2032's `confidence ?? 0.5` dies. **THE FIX:** `evidenceConfidence(pick) = clamp(0.5 + 0.25 × (1 − zfp/100) + 0.25 × (pressureScoreOf(...) + 30)/70, 0.05, 0.95)` — derived from the data the pick consumed (the zfp + the pressure). A designation with NO evidence → the honest low-confidence floor 0.05 + a loud `DESIGNATION_NO_EVIDENCE` log — never a fabricated 0.5.

**2.7.7 THE TRADING-DAY WINDOWS (M-9):** the ±1-calendar-day recency (shape-brain.ts:1614-1615) + the 72h dayWindow (:1670) become trading-day windows from the anchored bar calendar: `recencyWindow = [analysisPoint − 3 TRADING days, analysisPoint]` (the operator's "within 3 trading days up to the present moment" — the register's verbatim quote at :1658-1661); `dayWindow = the 3 trading days preceding the day` (weekends are NOT trading time — the bar calendar, not the clock). The dayLimitMs (:1657 — `min(dayStart + DAY − 1, runAnchor)`) and the formationMsOf (:1623-1628 — the id-segment parse) are CORRECT — untouched.

**2.7.8 THE RRR SINGLE LAW (M-11):** the FOUR floors (RRR_GATE 2.5 reasoning-chain.ts:49 · rrrForCategory tp1 setup-gen.ts:1077 · the mirror ≥1.2×SL precondition · the D3 3.5-executed/3.0-emission doctrine) are documented as LAYERED, never conflated: the CONTRACT floor (assertProjectionContract, rrr ≥ 1.0 — a sub-1R = a refinement warning) · the EMISSION floor (RRR ≥ 3.0 — the firewall gate, the operator's "MINIMUM 3 RRR NOTHING LESS IS ACCEPTABLE") · the EXECUTED standard (≥ 3.5 — "NOT A SINGLE ONE OF MY TRADES IS BELOW RRR = 3.5") · the RRR = a CONSEQUENCE never a target (D3). A TP computed to hit a floor = the D37 class — BANNED. The layers are documented at the top of each consumer; no code change required beyond the documentation.

**2.7.9 THE GOLDEN-SL CONSTANTS (M-12):** `GOLDEN_SL_MIN_PIPS = 4` is the LOCAL const at mirror.ts:2007 (inside the golden-SL fallback); `GOLDEN_SL_MAX_PIPS = 9.5` at sl-lmv.ts:84 (FROZEN). The register's correction: the spec citations split between the two files — this spec's citations now match the verified locations. No code change.

**2.7.10 THE FULL SINGLE-SOURCE IMPLEMENTATIONS (the build-agent executable targets):**

```typescript
// THE PHANTOM-BOM ALL-4 — ONE EXPORT (zone-classification.ts — the semantic-intent layer):
//   the operator's all-4 (the LEXICON_SPEC): largeObWidth ∧ midSwingFakeout ∧
//   preFormationOpposingBoMReaction ∧ macroOriginContinuation — 3-of-4 → DEATH
export function predPhantomBomAll4(d: LexiconData): boolean {
  return predLargeOb(d) && predMidSwingFakeout(d) && predOpposingBoMReaction(d) && predMacroOriginContinuation(d);
}
export function isPhantomBoM(d: LexiconData): boolean {
  const all4 = predPhantomBomAll4(d);
  const type1 = predType1Signature(d);                 // the small-OB + uninterrupted + mid-move signature
  // THE BOOLEAN ALGEBRA (the LEXICON_SPEC): PHANTOM ∧ DEATH_TYPE1 → DEATH · PHANTOM ∧ ¬DEATH_TYPE1 → FORTRESS
  if (!all4) return false;
  return !type1;                                       // the all-4 + NOT the type-1 death signature = the fortress
}
// THE RECONCILED MID-POSITION (the M-4 divergence — the deliberate decision):
//   the operator's mid-swing-fakeout: "clearly breaks (temporarily for only a couple of candles) the actual
//   swing move structure" — the mid-position requirement (the lexicon's mid ∈ (0,0.9)) is KEPT as the
//   definition; the reasoning-chain's looser variant (no mid requirement) is SUPERSEDED — the lexicon's
//   predicate is the authority (the semantic-intent layer), and phantomBoMExemption (reasoning-chain.ts:520)
//   + isPhantomBoMFortress (shape-brain.ts:1136) DELEGATE to it.
//   THE DRIFT IS CLOSED: one implementation, three consumers — a zone cannot be exempted by one and
//   rejected by the other (the register's M-4 verdict).

// THE OPPOSING-PROXIMITY RATIO (the M-3 fix — the ELEMENT match, never a fixed pip window):
const OPPOSING_PROXIMITY_RATIO = 3.0;                  // 3 × ATR — the SMC ratio doctrine's concrete form
function opposingProximityPips(atr1hPips: number): number {
  return OPPOSING_PROXIMITY_RATIO * atr1hPips;         // the ATR-proxy band, never the fixed 60
}
//   the register's evidence: the DXY inverse supply [101.027-101.153] (the same formationMs as the EU
//   fortress) is ~12p from the EU's structure in the ELEMENT space — the fixed 60p either admits everything
//   or nothing; the ratio adapts to the pair's volatility.

// THE EVIDENCE-DERIVED CONFIDENCE (the M-8 fix — the 0.5 default dies):
function evidenceConfidence(pick: DXYZone | undefined, ctx): number {
  if (!pick) { log('DESIGNATION_NO_EVIDENCE', { day, shape }); return 0.05; }   // the honest floor + the loud log
  const zfp = pick.zfp ?? 50;
  const pressure = pressureScoreOf(zoneToLexiconPressure(pick, ctx));            // +40 / +20 / 0 / −30
  const c = 0.5 + 0.25 * (1 - zfp / 100) + 0.25 * ((pressure + 30) / 70);        // the evidence mix
  return clamp(c, 0.05, 0.95);
}
//   the EU Monday after the fix: the Friday supply (zfp 22, the virgin-adjacent) → ~0.83 — the evidence
//   the designation actually used, never a fabricated 0.5.

// THE TRADING-DAY WINDOW (the M-9 fix — the operator's "within 3 trading days", never the 72h clock):
function tradingDayWindowMs(analysisPointMs: number, bars1H: OhlcBar[]): { start: number; end: number } {
  const bars = gateBars(bars1H);                         // the data ≤ the analysis point (the temporal engine)
  const dayStarts = uniqueBarDays(bars);                 // the trading days by the bar calendar — weekends EXCLUDED
  const end = analysisPointMs;
  const start = dayStarts[Math.max(0, dayStarts.length - 3)];   // the 3 most recent TRADING days — the operator's law
  return { start, end };
}
//   the recencyRank + the dayWindowRank consume { start, end } instead of the fixed (dayIdxOf ∓ 1)*DAY_MS
//   and the fixed 72h — the windows adapt to the market's actual days.
```

## 2.8 THE REASONING CHAIN WIRING COMPLETION (the STEP A/B tools fully wired · the agent-in-session · the visible reasoning)
**2.8 THE REASONING CHAIN WIRING COMPLETION (the STEP A/B tools fully wired · the agent-in-session · the visible reasoning)**

**THE CURRENT STATE (the W6 wave's build — verified):** the STEP A tool (reason-step-a.ts, 169L — the designation contract + the firewalls: the zoneId membership :129-141, the rationale ≥40c + the price regex :142-151) · the STEP B tool (reason-step-b.ts, 527L — the TokenLedger, the WARN-set consumer via validateAgentDecisions :432-440, the assemble + assertProjectionContract :481-501) · the gate tool (gate-tool.ts — runGoldenGate :57, the A-7 never-crash :58-67, resetContext :73) · the 7-tool registry (engine.ts:2500-2516 — harvest → zones → reason-step-a → shapes → reason-step-b → setups → gate, the D5 order) · the shadow REFITTED (0 fetches in the reasoning path, the WARN set W-1..W-7 at shadow-agent.ts:256-351). **The diag battery green: diag-step-tools 31 checks · diag-grounding-warn 23 checks · the golden gate exit 0.**

**THE REMAINING WIRING (the operator's D8 "manual agent step" made complete — the two visible reasoning turns):**

**THE STEP A TURN (the E1→E2 designation — what the operator SEES in the stream):**

```typescript
// THE PIPELINE FLOW (engine.ts's 7-tool chain — the contracted NEXT-instruction chain):
//   harvest → zones → [NEXT: AGENT REASONING STEP A] → reason-step-a → shapes
//          → [NEXT: AGENT REASONING STEP B] → reason-step-b → setups → gate
// THE AGENT'S VISIBLE TURN (the D1 "so we can see everything" — the primary agent reasons in-session):
//   1. the zones tool returns the telescoped map + the lexicon classes + the pressure states;
//   2. THE AGENT reads the E1 pressure (the operator's reading protocol — the MACRO_CONTEXT Part 22:
//      the macro narrative → the pressure state → the liquidity → the break-validation → the strength →
//      the reaction count → the deep liquidity);
//   3. THE AGENT EMITS the designation[] — the E2's contracted input (the StepADesignation contract):
//      { pair, day, zoneId, role, classification, rationale (≥40c + the price ref), pressureRead } —
//      the machine validates the membership (the A4 firewall) and the rationale (the A4b);
//   4. the shapes tool builds the chain ON the designated zones (the E2 obeys — the B2 law).
// THE STEP A TOOL'S OUTPUT (reason-step-a.ts — extended with the designation evidence):
//   { status, designation: [...], nextStep: 'AGENT REASONING STEP A done — call plutus-pipeline-shapes' }
```

**THE STEP B TURN (the E2→E3 11-token chain — what the operator SEES in the stream):**

```typescript
// THE MACHINE'S LEDGER (tokens 1-7 + 9 — the deterministic core, ms-scale, PRESENTED to the agent):
//   T1 zone-identification (the phantom-BoM verdict) · T2 pressure-status · T3 liquidity ·
//   T4 break-validation · T5 strength-comparison · T6 reaction-count · T7 chain-progress ·
//   T9 chaining (Law 27 — the prior TP = the next entry)
// THE AGENT'S VISIBLE TURN (the D8 "reasoning informed generation of the next phase"):
//   1. the STEP B tool presents the ledger + the candidates (the ReasoningStepInput — the CLOSED set);
//   2. THE AGENT reasons IN-SESSION: T8 the forward-position ("the short is halfway to the demand — the
//      reaction WILL happen"), T10 the anchor construction (E/SL/TP as checkable numbers on the machine's
//      candidates — the operator's EU #2 baseline: "Set E at the TP level of trade #1, SL 3 pips outside the
//      far edge of the nested liquidity zone... set TP at the near edge of the supply zone"), T11 the
//      validation judgment (the machine floor is the authority, the agent adds the confidence);
//   3. THE AGENT EMITS the decisions[] (ReasoningStepDecisions — the E/SL/TP + the anchors + the verdicts —
//      NOT the full projections; the machine assembles, per the A-2 audit amendment);
//   4. THE MACHINE validates (the WARN set W-1..W-7 — the D2 law: WARN + the loop continues, the hard-throw
//      ONLY after 3 → REFINEMENT_EXHAUSTED → the store) and assembles the TradeProjections;
//   5. the setups tool resolves the projections' anchors (the E3-NEVER: assertProjectionContract);
//   6. the gate tool runs the G1-G10 verdicts + resetContext().
// THE STEP B TOOL'S OUTPUT (reason-step-b.ts — extended):
//   { status, projections, ledger, warnings, nextStep: 'AGENT REASONING STEP B done — call plutus-pipeline-setups' }
```

**THE STEP B TOOL'S OUTPUT (reason-step-b.ts — extended):**
//   { status, projections, ledger, warnings, nextStep: 'AGENT REASONING STEP B done — call plutus-pipeline-setups' }
```

**THE FULL STEP A TOOL (reason-step-a.ts — the final form, the build agent's target):**

```typescript
import { tool } from 'opencode'; import { z } from 'zod';
import { ensureContext, StepToolContextApi } from './engine.js';   // the T1 global context

const StepADesignationSchema = z.object({
  pair: z.enum(['DXY', 'EUR/USD', 'GBP/USD']),
  day: z.enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']),
  zoneId: z.string(),                      // ∈ the E1 zone map (the firewall — the membership)
  role: z.enum(['SUPPLY', 'DEMAND', 'LQZ']),
  classification: z.enum(['BoM', 'MoM', 'LQZ']),
  rationale: z.string().min(40).regex(/\d+\.\d{3,}/),   // the A4b firewall — ≥40c + the price ref
  pressureRead: z.string(),
});
export type StepADesignation = z.infer<typeof StepADesignationSchema>;

export function buildStepATool(api: StepToolContextApi) {
  return tool({
    description: 'STEP A (E1→E2): the agent reads the zone map + the pressure states + the lexicon ' +
      'classes, then designates the zones the E2 shape chain will build on — the contracted input of ' +
      'plutus-pipeline-shapes. THE DESIGNATION IS THE AGENT\'S VISIBLE REASONING (D1/D8).',
    args: { weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            designation: z.array(StepADesignationSchema).min(1) },
    async execute(args) {
      const ctx = ensureContext(args.weekStart);
      // THE MECHANICAL FIREWALL (the T1 layers — the semantic + the format):
      const zoneIds = new Set((ctx.zoneMapSnapshot?.zones ?? []).map((z: any) => z.id));
      for (const d of args.designation) {
        if (!zoneIds.has(d.zoneId))
          return { status: 'BLOCKED', error: `zoneId ${d.zoneId} not in the E1 zone map — pick from the map` };
        // the A4b: the generic-rationale block (the price regex is schema-enforced)
      }
      ctx.stepADesignation = args.designation;
      return { title: `STEP A complete — ${args.designation.length} designations`,
               output: JSON.stringify({ status: 'success', designation: args.designation,
                 nextStep: 'AGENT REASONING STEP A done — call plutus-pipeline-shapes (the designation is in the context).' }) };
    },
  });
}
```

**THE FULL STEP B TOOL (reason-step-b.ts — the final form):**

```typescript
const ReasoningStepDecisionsSchema = z.object({
  pair: z.enum(['DXY', 'EUR/USD', 'GBP/USD']), day: z.string(), direction: z.enum(['LONG', 'SHORT']),
  forwardPosition: z.number(), chosenTarget: z.union([z.string(), z.number()]),   // the W-4 accepts both forms (the validator normalizes)
  E: z.number(), SL: z.number(), TP: z.number(),
  e1ZoneId: z.string(), e2ProjectionId: z.string(), confidence: z.number().min(0).max(1),
  rationale: z.string().min(40),
});
export type ReasoningStepDecisions = z.infer<typeof ReasoningStepDecisionsSchema>;

export function buildStepBTool(api: StepToolContextApi) {
  return tool({
    description: 'STEP B (E2→E3): the 11-token reasoning chain. The machine computes the ledger (T1-7 + T9) ' +
      'and presents it; the AGENT performs T8/T10/T11 in-session; the machine validates (the WARN set, D2) ' +
      'and assembles the TradeProjections — the contracted input of plutus-pipeline-setups.',
    args: { weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            decisions: z.array(ReasoningStepDecisionsSchema).min(1) },
    async execute(args) {
      const ctx = ensureContext(args.weekStart);
      const ledger = ctx.reasoningLedger;                    // the machine's deterministic core (T1-7 + T9)
      // THE VALIDATION (the WARN set — validateAgentDecisions, the D2 law):
      const warnings = api.validateAgentDecisions(args.decisions, ledger);
      for (const w of warnings) api.recordFailure('GROUNDING_WARN', { ...w, pair: args.decisions[0]!.pair, week: args.weekStart });
      if (warnings.length) {
        ctx.refineAttempts = (ctx.refineAttempts ?? 0) + 1;
        if (ctx.refineAttempts >= MAX_REFINEMENTS) {         // 3 — the D2 hard-throw
          api.recordFailure('REFINEMENT_EXHAUSTED', { pair: args.decisions[0]!.pair, week: args.weekStart });
          return { status: 'FAILED', output: JSON.stringify({ status: 'REFINEMENT_EXHAUSTED', warnings }) };
        }
        return { status: 'success_with_warnings', output: JSON.stringify({ status: 'refine', warnings,
          nextStep: 'AGENT REASONING STEP B — refine the decisions per the warnings (attempt ' + ctx.refineAttempts + '/3).' }) };
      }
      // THE ASSEMBLE (the machine builds the full projections — the A-2 amendment):
      const projections = args.decisions.map((d: any) => api.assembleProjection(d, ledger));
      api.assertProjectionContract(projections);             // the E3-NEVER
      ctx.projections = projections;
      return { title: `STEP B complete — ${projections.length} projections`,
               output: JSON.stringify({ status: 'success', projections, ledger, warnings: [],
                 nextStep: 'AGENT REASONING STEP B done — call plutus-pipeline-setups (the projections are in the context).' }) };
    },
  });
}
```

**THE GATE TOOL (gate-tool.ts — the final form):**

```typescript
export function buildGateTool(api: GateToolContextApi) {
  return tool({
    description: 'The W6 golden gate: the G1-G10 acceptance verdicts for the run + resetContext().',
    args: { weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) },
    async execute(args) {
      const ctx = ensureContext(args.weekStart);
      let verdicts;
      try { verdicts = api.runGoldenGate(ctx); }             // the A-7: NEVER crashes — reports
      catch { verdicts = G1..G10.map(g => ({ gate: g, pass: false, detail: 'gate crashed', evidence: '' })); }
      api.resetContext();                                    // the T1 lifecycle — the chain's end
      return { title: `Gate complete — ${verdicts.filter(v => v.pass).length}/10 passed`,
               output: JSON.stringify({ status: verdicts.every(v => v.pass) ? 'success' : 'FAILED', verdicts }, null, 2) };
    },
  });
}
```

**THE PIPELINE INTEGRATION FULL CODE (engine.ts — the 7-tool registry + the context, the W7 target):**

```typescript
// THE PIPELINE RUN CONTEXT (the T1 global context — the phases' outputs carried):
interface PipelineRunContext {
  weekStart: string;
  temporalAnchor: number;                      // = getAnalysisPointMs() — the §2.1 anchor
  analysisPointMs: number;                     // NEW — the London pre-market analysis point
  startedAt: number;
  harvestData: { ohlcByPairTf: Record<string, Record<string, OHLCBar[]>>; spots: Record<string, number> } | null;
  zoneMapSnapshot: { zones: DXYZone[]; spots: Record<string, number>; version: number } | null;
  stepADesignation: StepADesignation[] | null;         // the STEP A output — the E2's contracted input
  shapeSnapshot: ShapePredictionSnapshot | null;
  reasoningLedger: TokenLedger | null;                 // the STEP B machine core (T1-7 + T9)
  projections: TradeProjection[] | null;               // the STEP B output — the E3's contracted input
  refineAttempts: number;                              // the D2 per-run counter
  placed: boolean;                                     // NEW — the frozen-snapshot flag ("close the charts")
  screenshots: Array<{ pair: string; timeframe: string; path: string }>;
  validatedZones: any[]; errors: PipelineError[]; setupCounter: number;
  manualStepOutputs: Record<string, unknown>;
}

// THE 7-TOOL REGISTRY (the D5 order — the operator's "the reasoning chain I said to wire in as a STEP"):
export function createPipeline7Tools(): Record<string, ReturnType<typeof tool>> {
  return {
    'plutus-pipeline-harvest': harvestTool,                        // 1 — the OHLC + the analysis point
    'plutus-pipeline-zones': zonesTool,                            // 2 — E1 the telescoped map
    'plutus-pipeline-reason-step-a': reasonStepATool,              // 3 — STEP A (the E1→E2 designation)
    'plutus-pipeline-shapes': shapesTool,                          // 4 — E2 the chain on the designated zones
    'plutus-pipeline-reason-step-b': reasonStepBTool,              // 5 — STEP B (the E2→E3 11-token chain)
    'plutus-pipeline-setups': setupsTool,                          // 6 — E3 the projections' anchors
    'plutus-pipeline-gate': gateTool,                              // 7 — the G1-G10 verdicts + resetContext()
  };
}
// THE NEXT-INSTRUCTION CHAIN (the T1 §3.4 — every tool's output ends with the next step):
//   harvest:  NEXT: call plutus-pipeline-zones
//   zones:    NEXT: AGENT REASONING STEP A — read the zone map + the pressure states and call
//             plutus-pipeline-reason-step-a with your designation[]
//   step-a:   NEXT: call plutus-pipeline-shapes (the designation is in the context)
//   shapes:   NEXT: AGENT REASONING STEP B — read the shape chain + the ledger and call
//             plutus-pipeline-reason-step-b with your decisions[]
//   step-b:   NEXT: call plutus-pipeline-setups (the projections are in the context)
//   setups:   NEXT: call plutus-pipeline-gate
//   gate:     FINAL — the G1-G10 verdicts + resetContext()

// THE FROZEN-SNAPSHOT ENFORCEMENT (the §2.1 "close the charts" — the placement guard):
function assertNotPlaced(ctx: PipelineRunContext): void {
  if (ctx.placed) throw new PipelineError('FROZEN_SNAPSHOT',
    'the orders are placed — the pipeline does not recompute after the placement (the operator\'s workflow)');
}
//   the setups tool sets ctx.placed = true AFTER the projections resolve — any E2/E3 re-entry throws.
```

**THE WIRING COMPLETION ITEMS (the deltas this overhaul makes):**

| # | The item | The change |
|---|---|---|
| RC-1 | The harness re-anchor | the diag + the golden gate + the report lane: ANALYSIS_POINT_MS = 1783317600000 (§2.1) — the STEP A/B run at the pre-London analysis point |
| RC-2 | The STEP A designation source | the STEP A tool's args now accept the §2.3 designation (the union + the pressure-DESC output) — the firewall unchanged (the zoneId membership + the rationale) |
| RC-3 | The STEP B ledger inputs | the tokens consume the corrected map (the C-8 side types, the §2.5 walls) — the ledger's T1/T2/T3 reads the corrected data automatically |
| RC-4 | The GU divergence visible | the STEP B's T11 + the gate's G3 consume the §2.4 flip (the macro wins) — the MACRO_DIVERGENCE store row visible in the stream |
| RC-5 | The agent-in-session proof | the N3 host deployment (the operator's D10): the plutus agent deployed as a subagent on host — the STEP A/B reasoning OBSERVED IN THE STREAM — the pipeline run: harvest → zones → STEP A (the visible designation) → shapes → STEP B (the visible 11-token reasoning) → setups → gate — the convergence table is the operator's acceptance read. NO container. |
| RC-6 | The frozen-snapshot | the "close the charts" clause: the pipeline NEVER recomputes post-order (§2.1) |

**THE CONTRACT SUMMARY (the reasoning chain's final form — the operator's D5/D8 law):** the machine computes (the deterministic tokens, ms-scale), the primary agent decides IN-SESSION, VISIBLE (the T8/T10/T11 — the D1 "so we can see everything"), the machine validates (the WARN set — the D2), the firewalls enforce (the output-contracted args — the T1 "The agent is NOT a passive caller. The next tool's arguments MUST contain the output of that reasoning"). The shadow infra = the REFITTED contract layer (the operator's correction: "shadow agent infra is not completely deleted it is refitted to have the primary agent do all the reasoning instead of the shadow agent") — the executor = the plutus agent in-session, 0 external fetches (the grep gate).

# §3 THE IMPLEMENTATION ORDER (the waves + the gates)
**§3 THE IMPLEMENTATION ORDER — THE WAVES WITH THE DISJOINT FILE SETS + THE MECHANICAL GATES**

**THE DISCIPLINE (the operator's wave law):** "i said WAVES not fucking one at a time. where relevant - dispatch all the subagents in parallel dont be dumb" — the disjoint file sets dispatch in ONE batch; the same-file owners MERGE; the dispatch = the task tool ONLY (D6) with the DPL1-grade prompts (the trident-dispatch-templates skill); every return verified by the zero-trust battery (tsc 0 · the frozen pair sha256 · the diag exit 0 · the report determinism ×2 · the golden-convergence table · the wall ≤5min · the diff review of EVERY changed line · the wave audit).

**THE WAVE ORDER (the dependency: the temporal anchor first — everything derives from it; the side vote second — the pools; the selection third — the picks; the direction fourth — the GU; the walls fifth — the TP; the wiring sixth — the chain; the hardening seventh):**

| The wave | The owner | The file set (disjoint) | The mission (the §2 section) | The mechanical gate (done-when) |
|---|---|---|---|---|
| **W1 — THE TEMPORAL REPLICATION** | 1 builder | src/mdve/temporal.ts · src/brains/shape-brain.ts (the 10-site sweep :1549/:2079/:1536/:1686-1689/:1707-1722/:1786-1795/:1851/:1936/:2259) · report-v452.ts:106 · diag-reasoning-chain-golden.ts · probe-e2-designation.ts | §2.1 — ANALYSIS_POINT_MS = 1783317600000, the dayOpenSpot at the analysis point, the frozen-snapshot clause | the probe prints the analysis-point dayOpenSpot; the golden gate re-anchors + exit 0; the convergence table re-measured |
| **W2 — THE SIDE-VOTE LEXICON** | 1 builder | src/mdve/lmv.ts (:696-701) · src/mdve/lexicons/candle-pressure.ts (:363-370) · diag-lexicons.ts · probe-n1-rootcause.ts | §2.2 — the swept-side predicate, BOTH files | the DXY [101.12-101.154] types SUPPLY; the [100.936-100.952] types DEMAND; the LMV oracle 7/7; diag-lexicons 38 green |
| **W3 — THE SELECTION ENGINE** | 1 builder | src/brains/shape-brain.ts (:1409/:1686-1722/:1756-1776/:1810-1821/:1865-1878/:1924-1991/:2032) — the SAME file as W1 → **W1 + W3 MERGE into one builder** (the same-file owners merge, the operator's law) | §2.3 + §2.7.6 — the union, the data-derived travel, the pressure-DESC, the edge-distance nesting, the evidence confidence | the DXY Monday keyZone = the 101.14 structure; the EU pick unchanged; the GU demand = the 1.33380 rung; the golden gate exit 0 |
| **W4 — THE DIRECTION + THE MACRO** | 1 builder | src/brains/shape-brain.ts (:1427-1431/:2151-2230) · report-v452.ts (the divergence consumer + the §9.1 comments) · src/mdve/cascade-translation.js (the 0.35 threshold) · src/mdve/reasoning-chain.ts (the divergence fields) · golden-gate.ts (G3) | §2.4 — the R-day designation + the macro-wins flip | the GU Monday = LONG; the MACRO_DIVERGENCE row (0.40) in the store; G3 passes; the golden gate exit 0 |
| **W5 — THE E3 WALLS** | 1 builder | src/mdve/mirror.ts (:555-678/:2366/:2808-2964/:2873-2903) | §2.5 — the E1-pressure wall classification, the 3-mitigation ladder | the DXY SHORT's TP = 100.845; the chained DXY LONG Δ≤3p; the EU TP 1.14095 unchanged |
| **W6 — THE SANITY + THE SINGLE-SOURCE** | 1 builder | src/mdve/mirror.ts (the picker :1389-1711/:1507-1525) · src/mdve/lexicons/zone-classification.ts (:49/:102/:145) · src/mdve/lexicons/zone-pressure.ts (:268) · src/mdve/reasoning-chain.ts (:520-575/:544) · src/mdve/ob-engine.ts (:399/:459) · src/mdve/bom-mom.ts (:118) | §2.6 + §2.7 — the rung-validity gate, the all-4 single-source, the proximity ratio, the BoM-gate, the 30m force, the windows | the degenerate rung rejected; the all-4 single-sourced; diag-lexicons 38 green; the LMV oracle 7/7 |
| **W7 — THE WIRING COMPLETION** | 1 builder | src/pipeline/engine.ts (the registry) · src/pipeline/reason-step-a.ts · src/pipeline/reason-step-b.ts · src/pipeline/gate-tool.ts | §2.8 — the RC-1..RC-6 wiring deltas | diag-step-tools 31 green; diag-grounding-warn 23 green; the 7-tool registry intact |
| **W8 — THE FULL GOLDEN RE-RUN** | the orchestrator | the diag + the probe (no source changes) | the convergence 5/5 | **the golden gate exit 0 · the convergence table 5/5 at ≤3p · the determinism ×2 · the frozen pair byte-identical · tsc 0 · the wall ≤5min** |

**THE DISPATCH MANIFEST (the trident-task-preflight wave fills per wave — the E1/B3 templates, the operator's "WAVES not fucking one at a time" — each wave's mission/knownContext/doctrine/measurements/acceptance/taskTargets/position):**

| The wave | The template | The mission (one line) | The measurements (the gate numbers) | The acceptance (the done-when) |
|---|---|---|---|---|
| W1 | B3 (surgical) | The ANALYSIS_POINT_MS sweep + the dayOpenSpot semantics + the frozen-snapshot | the 10 sites · the 06:00 bar close | the probe's dayOpenSpot = the analysis-point price; the golden gate exit 0 |
| W2 | B3 (surgical) | The swept-side predicate in the TWO files | lmv.ts:696-701 + candle-pressure.ts:363-370 | the side types flipped; the LMV oracle 7/7; diag-lexicons 38 |
| W3 | B3 (surgical) | The union + the data-derived travel + the pressure-DESC + the edge-distance + the evidence confidence | shape-brain.ts:1409/:1686-1722/:1756-1776/:1810-1821/:1865-1878/:1924-1991/:2032 | the DXY keyZone = the 101.14 structure; the EU pick unchanged; the GU demand = the 1.33380 |
| W4 | B3 (surgical) | The dayDirection + the divergence macro-wins | shape-brain.ts:1427/:2151-2230 + report-v452 + cascade-translation | the GU Monday = LONG; the MACRO_DIVERGENCE row (0.40); G3 passes |
| W5 | B3 (surgical) | The E1-pressure wall in the Law-14 walk | mirror.ts:555-678/:2366/:2808-2964/:2873-2903 | the DXY TP = 100.845; the chained LONG Δ≤3p; the EU TP unchanged |
| W6 | B3 (surgical) | The rung-validity gate + the single-source all-4 + the ratio + the BoM-gate + the 30m force | mirror.ts picker + zone-classification + zone-pressure + reasoning-chain + ob-engine + bom-mom | the degenerate rejected; the all-4 single-sourced; diag-lexicons 38 |
| W7 | B1 (build) | The RC-1..RC-6 wiring deltas | engine.ts + reason-step-a + reason-step-b + gate-tool | diag-step-tools 31; diag-grounding-warn 23; the registry intact |
| W8 | the orchestrator | The full golden re-run + the canon docs | the diag + the probe + the battery | exit 0 · 5/5 · determinism ×2 · the frozen pair · tsc 0 · the wall ≤5min |

**THE WAVE INTERACTION NOTES (the knife's-edge lessons — the ZR-7C history):** (1) the pressure-sort + the chain-anchor experiments were MEASURED + REVERTED ×4 in the v4.5.2 era (the GU Thu Δ22.8 / Fri Δ46.8 drifts — the chain anchored at the zone CENTERS) — the chain level = the internal-LQZ NEAR EDGE (the I-8 precedent), NEVER the zone center; an out-of-reach chain anchor → CHAIN_ANCHOR_OUT_OF_REACH → the pressure selection takes over, never a forced pick. (2) Every wave's change must be A/B-measured against the golden convergence and reverted on regression — the probe's faithfulness assertion (the re-walk pick === the E2 core) is the wave-level tripwire. (3) The EU Monday win (the I2's nearest-zone promotion) is the TARGET behavior — the union fix (W3) must preserve it, never regress to the bare-rung pick. (4) The frozen pair is READ-ONLY — sl-lmv.ts + trade-dedup.ts never appear in a wave's file set. (5) The same-file waves merge (W1+W3 — shape-brain.ts).

# §4 THE TESTING STRATEGY (the replay fixtures from the real failures)
**§4 THE TESTING STRATEGY — THE REPLAY FIXTURES FROM THE REAL FAILURES (the runtime-grade law: happy paths forbidden, every scenario adversarial)**

**THE REPLAY FIXTURES (each reconstructs the ACTUAL failure event as a test — the fixture /tmp/opencode/bars_raw.json at ANALYSIS_POINT_MS = 1783317600000):**

| The fixture | The scenario (adversarial) | The pass token | The fail token |
|---|---|---|---|
| F-1 THE DXY MONDAY DESIGNATION | the Monday SS day — the designation must land on the operator's 101.14 (the supply + the nested LQZ), not the 101.30 rung ladder | the keyZoneId = the 101.14-adjacent structure; the E3 entry Δ≤3p of 101.140 | the keyZoneId = the 101.296 supply; Δ>3p |
| F-2 THE GU MONDAY DIRECTION | the Monday R day — the designation must be LONG at the demand (the kept EU cascade), not SHORT at the supply | the GU Monday direction = LONG; the keyZone = the demand containing 1.33330; the MACRO_DIVERGENCE row (0.40) in the store | the direction = SHORT; "flag only — pair E2 stands" |
| F-3 THE SWEPT-SHELF TP | the DXY SHORT's Law-14 walk — the defended 100.845 shelf (1x, swept-and-recovered) must be the WALL | the TP = 100.845 ± the strength-driven edge; the chained DXY LONG's E Δ≤3p of 100.945 | the TP = 100.780 (the walk passed the shelf) |
| F-4 THE SIDE FLIP | the DXY [101.12-101.154] band — the range-top HIGH sweep must type SUPPLY; the [100.936-100.952] floor lows must type DEMAND | the SHORT pool sees the 101.14 rungs; the LONG pool sees the 100.945 rungs | the types stay flipped (DEMAND/SUPPLY) |
| F-5 THE DEGENERATE RUNG | the GU demand pick — the collapsed [1.33059-1.33059] must be REJECTED at admission | the verdict `DEGENERATE_RUNG_REJECTED` logged; the pick = the 1.33380 rung [1.33306-1.33343] | the collapsed rung picked (E = 1.33270) |
| F-6 THE TEMPORAL ANCHOR | the analysis point = 1783317600000 — the dayOpenSpot = the 06:00 price, NEVER the Friday close | the dayOpenSpot field = the analysis-point price; the probe's faithfulness assertion passes | the dayOpenSpot = 101.069 (the Friday close) |
| F-7 THE PRESSURE SIGN | a DEPLETED (−30) vs a VIRGIN (+40) candidate — the sort must rank the VIRGIN first | the virgin sorts before the depleted on equal zfp | the depleted first (the ASC sign) |
| F-8 THE EU CONTROL (the regression net) | the EU Monday — the WIN must not degrade | E 1.14390 Δ0.5p · SL 1.14475 · TP 1.14095 Δ1.5p | any EU delta regresses past ≤3p |
| F-9 THE 0.5-PIP PAIR | the LMV oracle — 101.235/101.240 both survive (the width gate at 0.5p) | 7/7 at ≤1p incl. the 0.5-pip pair | a merge or a rejection |

**THE ADVERSARIAL MINIMUMS (the runtime-grade law):** every wave's diag carries ≥1 adversarial scenario beyond its fixture: the empty candidate pool (the designation → the honest absence, never a forced pick) · the zero-width rung (F-5) · the NaN/missing fields (the evidence-confidence → the honest 0.05 + the loud log) · the divergence = 0.35 EXACTLY (the threshold boundary) · the analysis point unlocked (the temporal throw) · the empty projection set (the gate's A-7 never-crash) · the re-computed snapshot (the frozen-snapshot clause — a post-order recompute must be BLOCKED).

**THE PER-WAVE DIAG SPECIFICATIONS (written BEFORE the code — the TDD law; each diag exits 0/1 with the per-test verdicts):**

| The wave | The diag | The tests (each a pass/fail assertion) |
|---|---|---|
| W1 | diag-temporal-anchor.ts (NEW — or the extended probe) | T-1 the ANALYSIS_POINT_MS = 1783317600000 pinned · T-2 the dayOpenSpot = the 06:00 analysis-point price (the fixture's actual bar) · T-3 the grep gate: `priorDayClose\|1783702800000` = 0 in the designation path · T-4 the frozen-snapshot: a post-order recompute BLOCKED · T-5 the adversarial: the analysis point unlocked → the THROW |
| W2 | diag-side-vote.ts (NEW) | S-1 the DXY [101.12-101.154] rungs type SUPPLY · S-2 the [100.936-100.952] rungs type DEMAND · S-3 the candle-pressure lexicon's candleSideVote: an upper-wick reject → SELL_SIDE, a lower-wick → BUY_SIDE (the synthetic fixture) · S-4 the LMV oracle 7/7 at ≤1p unchanged · S-5 diag-lexicons 38 green |
| W3 | diag-selection.ts (NEW) | P-1 the DXY Monday keyZone = the 101.14-adjacent structure · P-2 the EU Monday pick UNCHANGED (the Friday supply 1.14460 — the win preserved) · P-3 the GU demand = the 1.33380 rung [1.33306-1.33343] · P-4 the sort: a VIRGIN (+40) ranks before a DEPLETED (−30) at equal zfp · P-5 the edge-distance nesting: the 0.1p-overhang rung PROMOTED (the M-2 kill) · P-6 the confidence: an evidence-less designation → 0.05 + the loud log · P-7 the adversarial: the empty pool → the honest absence |
| W4 | diag-direction.ts (NEW) | D-1 the GU Monday direction = LONG · D-2 the MACRO_DIVERGENCE store row (0.40) present · D-3 the R-day's designation = the demand below (the LONG entry fuel) · D-4 the divergence at exactly 0.35 (the threshold boundary) → the core stands · D-5 the adversarial: a STORM + a DWL day → explicit directions, no silent default |
| W5 | diag-walls.ts (NEW) | W-1 the DXY SHORT's TP = the 100.845 shelf (the defended wall) · W-2 the chained DXY LONG's E Δ≤3p of 100.945 · W-3 a 3x-mitigated zone (zfp 70) = passable (the TP-target-only) · W-4 a virgin MoM mid-BS/WL = passable (the only auto-death) · W-5 the EU TP 1.14095 unchanged · W-6 the adversarial: a swept-and-recovered 1x shelf with a modal body-close → a WALL |
| W6 | diag-sanity.ts (NEW) | G-1 the collapsed [1.33059-1.33059] rung REJECTED at admission (the verdict + the reason) · G-2 the 0.5-pip pair 101.235/101.240 BOTH emitted · G-3 the all-4 single-source: the lexicon's + the reasoning-chain's + the adapter's outputs IDENTICAL on the golden fixture · G-4 the 30m-MoM force: a 30m BoM-shaped OB still classifies MoM (one path, no copies) · G-5 the adversarial: an id 21p from its band → REJECTED |
| W7 | diag-step-tools (extended) | P-1..P-9 the registry + the firewalls + the NEXT chain (the existing 31 checks) + RC-1 the ANALYSIS_POINT re-anchor + RC-4 the GU divergence visible in the ledger |
| W8 | diag-reasoning-chain-golden (the FULL re-run) | G1-G10 + A1-A7 + the convergence table 5/5 + the determinism ×2 + the frozen-pair sha + the wall ≤ 5min |

**THE ADVERSARIAL MINIMUMS — the full scenario definitions (the runtime-grade law — every wave's diag carries these; a scenario is PASS only with the pass token matched in a tool-result context + the fail token absent + the verdict recorded):**

| The scenario | The adversarial input | The pass token | The fail token |
|---|---|---|---|
| A-W1 | the analysis point UNLOCKED (the diag calls the model build without lockAnalysisPoint) | the THROW (the temporal engine's fail-fast) + the diag reports the locked requirement | a silent build with the Friday-close data |
| A-W1b | the re-lock with a DIFFERENT value mid-run | the THROW (the one-way lock) | a silent re-anchor |
| A-W1c | the frozen-snapshot: the E2 re-computed AFTER the STEP B placement | the recompute BLOCKED (the context's placed flag) | a silent re-designation |
| A-W2 | a synthetic upper-wick reject at the range top | candleSideVote = SELL_SIDE | BUY_SIDE (the old approach vote) |
| A-W2b | a synthetic lower-wick reject at the range bottom | BUY_SIDE | SELL_SIDE |
| A-W3 | a DEPLETED (−30) vs a VIRGIN (+40) at equal zfp | the VIRGIN first (the pressure DESC) | the DEPLETED first |
| A-W3b | an empty candidate pool (no zones in the band) | the honest absence (no keyZone) + the loud log | a forced pick |
| A-W4 | the divergence = 0.35 EXACTLY (the boundary) | the core stands (the threshold is STRICTLY greater) | the flip at the boundary |
| A-W4b | a STORM + a DWL day | the explicit directions (RANGE / the macro) | the silent NEUTRAL default |
| A-W5 | a 3x-mitigated zone (zfp 70) on the TP path | passable (the TP-target-only) | treated as a wall |
| A-W5b | a virgin MoM mid-BS/WL on the TP path | passable (the ONLY auto-death, mid-path) | treated as a wall |
| A-W5c | a swept-and-recovered 1x shelf with a modal body-close | a WALL (the TP caps there) | walked past |
| A-W6 | a rung 21p from its id + a rung 2.5p from its id | the 21p REJECTED, the 2.5p ADMITTED | both admitted / both rejected |
| A-W7 | a fabricated zoneId in the STEP A designation | BLOCKED (the A4 firewall) | accepted |
| A-W7b | a bad projection (the strings) in the STEP B decisions | the WARN + the loop continues (the D2) | the first-violation hard-kill |
| A-W7c | the same bad projection ×3 | REFINEMENT_EXHAUSTED → the store row | a crash |
| A-W8 | the negative control (a later anchor) | the anchors unchanged (the G8) | any bar beyond the anchor read |

**THE WORKED EXAMPLES (the fixed machinery's expected output — the next session compares its runs against THESE numbers; a mismatch = a wave's fix drifted):**

**THE DXY MONDAY (the C-1..C-4 + C-6 + C-8 fix chain, end to end):**
```
the analysis point: 1783317600000 (the 06:00 pre-London hour) → dayOpenSpot = the 06:00 bar's close
the side vote (W2): the [101.12-101.154] rungs type SUPPLY (the swept-side predicate)
the pools (W3): supplyCands include the SUPPLY rungs [101.12-101.154] + the zone [101.027-101.153] (zfp 22)
the reach (W3): supplyReach = the day's actual structures (dayReachHigh or the nearest supply ≥ the open) —
                the 101.14 area sits 7.1p above the open (the FIRST quality supply) — THE DESIGNATED ZONE
the ranking (W3): the pressure DESC → the 101.14 structure (the fresh 1x, the swept-side SUPPLY) outranks
                the 101.30 rung ladder (the equal-pressure, 20p further)
the E3 (W5): E = the 101.14 LQZ's near edge (the I-5 shield semantics) ≈ 101.140 (Δ≤3p)
the TP (W5): the pathCap = the 100.845 shelf (the DEFENDED wall) → the chained DXY LONG at the 100.845-
             adjacent level → the near-edge refinement → 100.945 (Δ≤3p)
THE EXPECTED EMISSION TABLE: DXY SHORT E ≈ 101.140 · DXY LONG (chained) E ≈ 100.945 — the Δ≤3p row
```

**THE GU MONDAY (the C-5 fix chain, end to end):**
```
the analysis point → dayOpenSpot = the 06:00 bar's close
the direction (W4): the R day + the macro (the kept EU LONG) → LONG — the SHORT-from-supply-primary dead
the demand pick (W3 + W6): the degenerate [1.33059-1.33059] REJECTED; the 1.33380 rung [1.33306-1.33343]
                (the golden-containing) ADMITTED → the designated demand
the E3 (W5): E = the 1.33380 rung's near edge ≈ 1.33330 (Δ≤3p) — the operator's GU LONG
THE EXPECTED EMISSION TABLE: GU LONG E ≈ 1.33330 — the Δ≤3p row
```

**THE EU CONTROL (the win preserved — the regression net):**
```
the designation UNCHANGED: the Friday supply EUR/USD|1H|1783076400000|1.14460 (the I2's nearest-zone promotion)
the anchors UNCHANGED: E 1.14390 (the shield rung [1.1439-1.14415]) · SL 1.14475 · TP 1.14095 (the internal
                LQZ rung 1.14120 [1.14095])
THE EXPECTED EMISSION TABLE: EU SHORT E ≈ 1.14395 (Δ0.5p) · EU LONG E ≈ 1.14110 (Δ1.5p) — BOTH rows HOLD
```

**THE CONVERGENCE 5/5 (the W8 acceptance table — the operator's D4 law):**

| The emission | The golden | The expected machine E | The delta |
|---|---|---|---|
| DXY SHORT | 101.140 | ≈ 101.140 (the 101.14 structure's near edge) | ≤ 3p |
| DXY LONG (chained) | 100.945 | ≈ 100.945 (the 100.845 TP → the chained + the near-edge refinement) | ≤ 3p |
| EU SHORT | 1.14395 | 1.14390 (unchanged) | 0.5p |
| EU LONG (chained) | 1.14110 | 1.14095 (unchanged) | 1.5p |
| GU LONG | 1.33330 | ≈ 1.33330 (the 1.33380 rung's near edge) | ≤ 3p |

**THE CONTAINER RULE:** NO container (the operator's D10 — "not waste time on container garbage") — the diag harnesses run on the HOST; the STEP A/B reasoning observed in the TUI stream at the N3 deployment. The TEST-AUTHENTICITY rule: a scenario is PASS only when the pass token matched in a tool-result context + the fail token absent + the verdict recorded in the wave audit — "structural PASS" / "PASS by design" are theatrical declarations, REJECTED.

**THE MECHANICAL BATTERY (after EVERY wave — the orchestrator's own runs, never the agent's claims):** `bunx tsc --noEmit` = 0 · `bun build` = success · the frozen pair sha256 byte-identical · the wave's diag exit 0 · the report determinism ×2 (sha256 identical) · the golden-convergence table (the per-emission delta, never a bare claim) · the wall ≤ 5 min (G9) · the grep gates (0 fetches in the reasoning path · 0 ratio/RRR-target in the TP paths · the golden const referenced only in the diag) · the diff review of EVERY changed line (the WHAT/WHY/HOW verdicts) · the wave audit at .trident/wave-audit/.

# §5 THE ANTI-PATTERNS AGAINST FALSE SUCCESS
**§5 THE ANTI-PATTERNS AGAINST FALSE SUCCESS — the theatrical traps specific to THIS overhaul, each with the closed bypasses**

| # | The trap | The failure mode | The closed bypasses |
|---|---|---|---|
| AP-1 | **The 8 CRITICAL rules re-introduced** | a builder "improves" the reach by tuning the travelMax constant instead of deriving it — the slop returns with a new number | the data-derived law (LAW-2): a fixed pip number in the designation/anchor path = the review REJECT; the grep gate: `travelMax\|NEAR_ACTIVE_EDGE_PIPS\|DAY_WINDOW_HOURS\|confidence ?? 0.5\|priorDayClose` = 0 in the designation path |
| AP-2 | **The rung-direct bypass re-wired** | a builder restores the rung-only path "for precision" — the §8.1 union dies | the union law (LAW-2, §2.3): zones and rungs ONE pool; the probe's faithfulness assertion catches the pick change |
| AP-3 | **The swept-shelf predicate re-tuned** | a builder adjusts the −30 to −10 instead of replacing the predicate | the 3-mitigation doctrine (LAW-4): the wall = the E1-pressure classification; the grep gate: `sweepCount >= 1 ? -` = 0 in the TP walk |
| AP-4 | **The approach-driven side vote re-enters** | a builder "fixes" the flip by flipping the branch order but keeping the approach primary | the swept-side law (§2.2): the wick direction IS the primary; the probe's side-print assertion |
| AP-5 | **The flag-only divergence re-restored** | a builder reads the §9.1 comment ("FLAG ONLY") and restores the semantics — the comment re-seeds the bug | the §2.4 fix edits the comment + the code TOGETHER; the store's MACRO_DIVERGENCE row required in the gate |
| AP-6 | **The Friday-close anchor re-enters** | a builder copies an old harness constant (1783702800000) — the week's answers leak again | the I-4 lesson + §2.1: ANALYSIS_POINT_MS = 1783317600000 pinned in the diag + the probe + the report; the grep gate: `1783702800000` = 0 |
| AP-7 | **The degenerate rung re-admitted** | a builder skips the sanity gate "because sl-lmv tolerates it" | §2.6: the picker's validity gate is the ONLY admission path; the F-5 fixture fails the build |
| AP-8 | **The confidence default re-introduced** | a builder restores `?? 0.5` "as a safety" | §2.7.6: the evidence-derived confidence + the honest 0.05 + the loud log; the grep gate |
| AP-9 | **The theatrical pass** | a wave claims "PASS by design" / "structural PASS" without the tool-result tokens | the test-authenticity rule (§4): a scenario passes ONLY with the pass token matched in a tool-result context + the fail token absent + the artifact |
| AP-10 | **The subagent claim trusted** | "it works" without the battery | the zero-trust battery (§4) re-run by the orchestrator on EVERY return — never the agent's exit codes |
| AP-11 | **The scope creep** | a builder "fixes" the frozen pair or an unrelated module | the disjoint-file wave table (§3) + the diff review blocks anything outside the wave's file set |
| AP-12 | **The shadow executor re-created** | a builder re-adds an external fetch "for the reasoning" | the grep gate: `fetch\|axios\|http` = 0 in reasoning-chain.ts + shadow-agent.ts — the D1/D7 law |
| AP-13 | **The EU win regressed** | a fix "improves" the selection and breaks the I2's nearest-zone promotion | the EU control fixture (F-8) — the ≤3p reference is the floor |
| AP-14 | **The golden fitted** | a diag threshold tuned to pass | the golden const = TEMPORARY ARCHITECTURE (the measurement oracle only); the pipeline never reads it (the grep gate) |
| AP-15 | **The stop-after-every-change** | a builder waits for permission between waves | the operator's loop law: "DON'T STOP — loop autonomously"; the wave table executes W1→W8 in sequence |

**THE FROZEN-EDGE HAZARD (documented, never edited):** sl-lmv.ts + trade-dedup.ts are READ-ONLY (the frozen pair, byte-identical — the sha256 pins in the diag). The Law-7 duplication (mirror.ts:98 + sl-lmv.ts:61) is a FROZEN-EDGE hazard — a future change updates BOTH + the register entry; the values are identical today.

# §6 THE SUCCESS CRITERIA
**§6 THE SUCCESS CRITERIA — the operator's acceptance bar, mechanical and numbered (verifiable by command / ledger / eyes)**

1. **THE CONVERGENCE 5/5 AT ≤3p** — `bun diag-reasoning-chain-golden.ts --day=2026-07-06` prints the emission table: DXY SHORT E within 3p of 101.140 · DXY LONG (chained) within 3p of 100.945 · EU SHORT within 3p of 1.14395 · EU LONG (chained) within 3p of 1.14110 · GU LONG within 3p of 1.33330 — the G7 convergence row = 5/5. The golden gate exit 0 (ALL G1-G10 + A1-A7).
2. **THE TEMPORAL REPLICATION** — the probe prints the dayOpenSpot = the 06:00 UTC analysis-point price (1783317600000), never the Friday close; the grep gate: `priorDayClose\|1783702800000` = 0 in the designation path; the frozen-snapshot clause enforced (a post-order recompute is blocked).
3. **THE SIDE TYPES** — the probe prints the DXY universe: the [101.12-101.154] rungs type SUPPLY, the [100.936-100.952] rungs type DEMAND; the LMV oracle stays 7/7 at ≤1p; diag-lexicons 38 checks exit 0.
4. **THE SELECTION** — the probe re-walk FAITHFUL (the re-walk pick === the E2 core's designation); the EU Monday pick unchanged (the Friday supply 1.14460 — the win preserved); the GU demand pick = the 1.33380 rung (the golden-containing band).
5. **THE DIRECTION** — the E2 core's GU Monday = LONG; the store's week rows contain the MACRO_DIVERGENCE (0.40) record; the G3 gate passes on the direction + the divergence.
6. **THE WALLS** — the probe traces the DXY SHORT's TP = the 100.845 defended shelf (never 100.780); the EU TP 1.14095 unchanged.
7. **THE SANITY** — the degenerate rung [1.33059-1.33059] rejected with the `DEGENERATE_RUNG_REJECTED` verdict; the 0.5-pip pair 101.235/101.240 both emitted.
8. **THE SINGLE-SOURCE** — the phantom-BoM all-4 has ONE implementation (zone-classification.ts; the reasoning-chain + the shape-brain adapters delegate); the proximity = the ATR ratio; the Law-7 values documented as the frozen-edge hazard.
9. **THE WIRING** — diag-step-tools 31 checks exit 0; diag-grounding-warn 23 checks exit 0; the 7-tool registry intact (harvest → zones → step-a → shapes → step-b → setups → gate); 0 fetches in the reasoning path (the grep gate).
10. **THE ZERO-TRUST BATTERY** — tsc 0 · bun build success · the frozen pair sha256 byte-identical (sl-lmv 912940832fac44bc + trade-dedup 33914c897e777540) · the report determinism ×2 identical · the wall ≤ 5 min · the diff review of EVERY changed line · the wave audits at .trident/wave-audit/.
11. **THE HOST DEPLOYMENT (N3 — the operator's D10)** — the plutus agent deployed as a subagent on host; the STEP A/B reasoning VISIBLE in the stream (the designation rationale + the forward-position + the anchor construction); the convergence table = the operator's acceptance read. NO container.
12. **THE CANON DOCS (N4)** — the build report ENTRY 7 · the DECISION_CHAIN D63 (the E2-designation ruling — the operator's 2026-08-09 directives + this spec's authority) · the EVIDENCE_STATE (the 5/5 convergence) · the COMPACTION_SURVIVAL · the wave audits.

**THE OPERATOR'S VERBATIM ACCEPTANCE (the final read):** "EVERYTHING should now be tangible Lexcion filters + MPSE engines with 0 dumb degenerate garbage anywhere" — the register's ~70 rules: every CRITICAL/MAJOR either replaced by a lexicon filter / an MPSE engine or documented as a frozen-edge hazard; the grep gates prove the dead rules are gone; the convergence proves the machine now sees the operator's levels.

# §7 THE COMPACTION-PROOF IMPLEMENTATION GUIDE
**§7 THE COMPACTION-PROOF IMPLEMENTATION GUIDE — the resume anchors + the cross-consistency rules**

**THE RESUME ANCHORS (the post-compaction reading order — the NEXT session's entry sequence):**
1. THIS SPEC (the overhaul authority — the §0 problem, the §1 inventory, the §2 fix plan, the §3 wave table, the §6 acceptance).
2. The three SLOP REGISTERS (the wave-audited failure inventories this spec executes — the E2 register 15 entries · the E3 register 20+ rules · the E1 register 40+ rules — at .trident/wave-audit/ + the agent returns).
3. The v4.5.4 ENGINEERING_SPEC (2,928L — the agent-in-the-loop contract layer: the D1-D10, the STEP A/B contract, the WARN set — UNCHANGED by this spec).
4. The L2 spec (2,051L — the C1-C6, the 11-token chain — UNCHANGED).
5. Bible 4.0 + 4.5 + the MACRO_CONTEXT (the doctrine — the law this spec quotes).
6. The POST-COMPACTION_PROMPT (updated with this spec as the authority + the N1→N4 queue re-sequenced to the W1→W8 wave table).
7. probe-e2-designation.ts (the faithful re-walk — the wave-level tripwire; its dayOpenSpot + the sort comparator updated in lockstep with W1/W3).

**THE CROSS-CONSISTENCY RULES (the docs MUST agree — a contradiction is a build-blocker, never carried):**
- The ANCHOR: ANALYSIS_POINT_MS = 1783317600000 in this spec + the diag + the probe + the report lane — ONE value, everywhere (the grep gate).
- The oracle: the Monday golden (DXY L 100.945 / DXY S 101.140 / EU S 1.14395 / EU L 1.14110 / GU L 1.33330 at ≤3p) — the golden const = the TEMPORARY ARCHITECTURE measurement oracle only.
- The frozen pair: sl-lmv `912940832fac44bc` + trade-dedup `33914c897e777540` — byte-identical in every wave audit.
- The wave audits: .trident/wave-audit/<wave>.md with the spec-coverage map (the §3 wave → the §2 section → the covered hunks) + the per-hunk verdicts — a wave ships ONLY with 100% coverage + the per-hunk verdicts.
- The canon docs: the build report ENTRY 7 (append-only) · the DECISION_CHAIN D63 · the EVIDENCE_STATE (the 5/5) · the COMPACTION_SURVIVAL · the DEBUG_LOG (the append-only record of every bug found + fixed with the root causes — the RUNNING-BUILD-DOCS law).
- The doctrine: QUOTED, never synthesized (D13) — a claim that cannot be quoted does not get built.

**THE KNOWLEDGE TRAIL (the permanent records this overhaul produces):** the three SLOP REGISTERS (the audit) · this spec (the authority) · the wave audits (the evidence) · the DEBUG_LOG entries (the bug classes: the param-name-vs-schema class, the sign-flip class, the swept-shelf class, the side-flip class, the degenerate-rung class, the approach-driven-vs-swept-side class — each abstracted so a recurrence is caught at the register, never re-diagnosed) · the hive storage (t3 domain=plutus).

**THE DEBUG_LOG ENTRY TEMPLATE (the RUNNING-BUILD-DOCS law — every bug found + fixed, append-only):**

```
## 2026-08-09 — THE OVERHAUL V2 WAVE <N> — <the bug class>
- THE BUG: <the rule + the file:line + the miss it caused>
- THE ROOT CAUSE: <the mechanism — the probe/register evidence>
- THE FIX: <the §2 section + the contract change>
- THE VERIFICATION: <the diag test + the exit + the convergence delta>
- THE CLASS: <the abstracted pattern — the next occurrence is caught at the register, never re-diagnosed>
```

**THE RESUME PROTOCOL (the post-compaction first hour — the exact sequence):**
1. Read this spec (§0 → §1 → §2 → §3 → §6 — the resume surface, 30 min).
2. Read the three SLOP REGISTERS (the audit detail, 15 min).
3. Run the zero-trust battery (tsc · build · the frozen pair · the diags — 5 min).
4. Run the faithful re-walk probe (the tripwire: the re-walk pick === the E2 core).
5. Read the §3 wave table → execute W1 (the temporal replication — the FIRST gate, everything derives from it).
6. Update the canon docs per wave (the build report ENTRY 7 · the DECISION_CHAIN D63 · the EVIDENCE_STATE · the COMPACTION_SURVIVAL · the DEBUG_LOG) — the append-only discipline, NEVER overwritten.

# §8 THE FINAL NOTES + THE OPEN QUESTIONS
**§8 THE FINAL NOTES + THE OPEN QUESTIONS — nothing hidden, the operator's decisions flagged with the recommendations**

**THE OPEN QUESTIONS (needing the operator, with the recommendations):**

| # | The question | The recommendation |
|---|---|---|
| OQ-1 | **The London pre-market analysis point: 06:00 UTC exactly?** The operator's workflow: "In the 1H before london session starts" — the London FX open is 07:00 UTC (BST). This spec pins ANALYSIS_POINT_MS = 1783317600000 (06:00 UTC — the START of the pre-London hour). If the operator's actual analysis moment differs (e.g., 06:30), the constant moves — the mechanism is unchanged. | 06:00 UTC (the start of the pre-London hour), one constant, the sweep follows. |
| OQ-2 | **The data-derived travel multipliers (0.5/1.0/1.5 × the ATR proxy + the 0.25 near-edge band)** — the SMC ratio doctrine's concrete scaling. The 4× narrowest-zone-width proxy is the in-file precedent (shapeBrainAtrProxyPips :1116-1123). | Ship the ratios as named constants with the BECAUSE comments; the golden gate calibrates them (the A/B measure — revert on regression). |
| OQ-3 | **The MIN_RUNG_WIDTH_PIPS = 0.5** — the 0.5-pip pair (101.235/101.240) survives; a 0.0 width dies. | 0.5, pinned by the LMV oracle fixture. |
| OQ-4 | **The macro-authority flip's scope: ONLY the GU Monday, or all pairs?** The G3 contract + D59 name the GU Monday; the cascade law is pair-general (DXY LONG → EU SHORT inverse → GU SHORT kept). The flip (§2.4) applies the macro-wins rule to any pair whose core diverges > 0.35 from its cascade — the EU's divergence = 0.00 (validated) so the EU is unaffected. | Apply the macro-wins rule pair-general; the divergence threshold 0.35 stays (verified at cascade-translation.js). |
| OQ-5 | **The N3 host deployment timing** — the operator's D10: "when it is ready i will deploy the full plutus agent as a subagent on host" — the deployment is the operator's action; this spec's W8 gate (the 5/5 convergence) is the readiness signal. | W8 green → the operator deploys → the STEP A/B observed in the stream. |
| OQ-6 | **The 4th SLOP REGISTER (the chain-gate: the GU divergence handler + the temporal machinery + the gate thresholds)** — the audit wave's 4th agent is being dispatched; its findings fold into this spec's §1 if any CRITICAL/MAJOR item surfaces beyond the C-1..C-8 + M-1..M-12. | The register completes the audit; this spec's §1 is the floor, not the ceiling. |

**THE FINAL NOTE (the operator's mandate):** "make this as dense as possible so the next session CANNOT derail" — the density IS the derailment-proof: every rule line-anchored, every fix contract-shaped, every gate mechanical, every wave disjoint, every anti-pattern's bypass closed. The next session executes the §3 wave table against the §6 acceptance — nothing to decide, everything to verify.

---

# APPENDIX A — THE ZERO-TRUST AUDIT (the mandatory adversarial-builder pass — of THIS spec)

# APPENDIX A — THE ZERO-TRUST AUDIT
**THE ADVERSARIAL-BUILDER PASS — the findings table (severity / finding / surgical edit):**

| # | Severity | The finding | The surgical edit |
|---|---|---|---|
| A-1 | HIGH | The §2.3 pseudocode's `dataDerivedTravel` returns the fixed ratios (0.5/1.0/1.5 × the proxy) — a NEW fixed set replacing the old. The rationale (the SMC ratio doctrine) is stated, the calibration is the gate's job (A/B + revert), but a builder could read it as a new slop ladder. | The BECAUSE comments + the OQ-2 flag + the calibration protocol: the golden gate's convergence table is the ONLY tuner; the ratios ship as named constants with the calibration procedure documented at the site. |
| A-2 | MEDIUM | The §2.1 `dayOpenSpotAt` reads the last 1H CLOSE at ≤ the analysis point — the operator's "charts open" moment semantics: the 06:00 bar's OPEN is the state when the analysis begins (the 05:00 close = the same value by the bar continuity). The choice is documented; a one-line semantic drift (using the bar's open instead) changes every designation. | The comment pins the semantics: "the 06:00 bar's open = the 05:00 bar's close — the market state when the operator begins the analysis; the value is the same either way, the semantic is frozen." |
| A-3 | MEDIUM | The §2.4's `dayDirection` switch's DWL case maps to `macroDirection` — the DWL subtype's directional semantics are documented in the Bibles as "NOT a separate shape"; the mapping is a judgment. | The comment cites the Bible 4.0 §5.2 DWL note; the F-2 fixture (the GU Monday) is the regression net. |
| A-4 | MEDIUM | The §2.5's `isDefendedWall` treats a 0x-2x zone as a wall INCLUDING a virgin BoM — correct (the 100% reaction law); a virgin MoM mid-BS/WL returns false — correct (the only auto-death). The 2x→3x boundary (the "zones usually fail on the THIRD mitigation") is a judgment. | The DEPLETED_COUNT = 3 constant (zone-pressure.ts:39, canon-verbatim) is cited as the boundary's source; the F-3 fixture tests the 1x shelf (the defended wall) + the 3x zone (passable). |
| A-5 | LOW | The §3 wave table merges W1+W3 (shape-brain.ts) but the W2 side-vote (lmv.ts) is independent — the DXY Monday's designation depends on BOTH (the side types feed the pools). The wave ORDER (W2 before W3) is enforced by the table. | The table's dependency note: W2's gate (the side types) precedes W3's pick — the orchestrator blocks W3 until W2's gate is green. |
| A-6 | LOW | The §5 AP-1's grep gate lists `priorDayClose` = 0 in the designation path — but the W1 sweep's site 9 (the chain carry :2259) legitimately reads the prior DAY's open (not the prior close) — the grep pattern must be precise. | The grep gate pattern: `priorDayClose` (exact) = 0; the prior-day-open carry is the designated chain semantic, allowed. |
| A-7 | LOW | The §6 criterion 12 (the canon docs) names the DECISION_CHAIN D63 — the D63 was PENDING at the audit; this spec's execution writes it (the operator's 2026-08-09 directives + this spec's authority). | The N4 wave's D63 content is specified: the operator's verbatim directives (the slop audit, the lexicon/MPSE mandate, the temporal law) + this spec's reference. |

**THE AUDIT VERDICT:** 0 CRITICAL · 1 HIGH (A-1 — mitigated by the calibration protocol + the OQ-2 flag) · 2 MEDIUM (A-2, A-3 — pinned semantics + the fixture nets) · 4 LOW (accepted) — **no unresolvable gaps; the spec ships as the build authority.** The failure inventory (§1) is evidence-grounded (the probe measurements + the register verifications); every threshold carries a rationale or an evidence citation; every "blocked" rule's bypasses are closed (§5); every wave is one builder per disjoint file set (§3); the success criteria are mechanically verifiable (§6).

**THE SPEC'S COMPACTION ANCHOR:** this document is the FIRST read after any compaction — the §0 problem, the §1 inventory, the §2 fix plan, the §3 wave table, the §6 acceptance, and the §7 resume anchors are the complete resume surface. The canon docs (the build report ENTRY 7 · the DECISION_CHAIN D63 · the EVIDENCE_STATE · the COMPACTION_SURVIVAL) are updated per wave. Doctrine is QUOTED, never synthesized (D13).

**THE COMPLETE HELPER SET (the functions the rewritten components consume — build-agent executable, every helper line-anchored to its home):**

```typescript
// THE STRENGTH-DRIVEN TP EDGE (the §2.5 consumer — the anchor doctrine verbatim:
//   "the stronger the pressure of the zone, the weaker the mitigation will be prior to the reaction.
//   Strong pressure zones = near instant reaction. exit on the closest zone edge... Weak pressure zones =
//   delayed reaction. Maximize the profits you catch"):
function strengthDrivenEdge(zone, pressure: ZonePressureState, direction, pip): number {
  const strong = (pressure.lifecycle === 'VIRGIN' && zone.classification === 'BoM')
              || pressure.lifecycle === 'FORTRESS'
              || (zone.confluence ?? 0) >= 8;
  if (strong) return direction === 'SHORT'
    ? zone.bottom + 1.5 * pip          // the CLOSE edge (the near edge for the move) + the 1-2p spread
    : zone.top - 1.5 * pip;
  return direction === 'SHORT' ? zone.bottom : zone.top;   // the WEAK zone → the FAR edge — the delayed reaction
}

// THE DEFENDED-WALL FULL PREDICATE (the §2.5 — the 3-mitigation doctrine, the ONLY auto-death):
function isDefendedWall(zone, entry, direction, ctx): boolean {
  const mitigations = battleCountOf(zone);                 // the reactionEvents → mitigationCount → reactionCount
  if (mitigations >= 3) return false;                      // "zones usually fail on the THIRD mitigation" — 3x+ = TP-only
  if (mitigations === 0 && zone.classification === 'MoM') {
    // the virgin MoM: the ONLY auto-death is the virgin MoM IN THE MIDDLE OF A BS/WL pathway —
    // the phantom-BoM fortress (the all-4, §2.7.1) is EXEMPT — the EU case:
    if (isPhantomBoM(zone)) return true;
    return false;                                          // the bare virgin MoM mid-path = passable (the death zone)
  }
  return true;                                             // 0x-2x (incl. the swept-and-recovered 1x) = DEFENDED
}

// THE CANDLE ANATOMY (the §2.2's swept-side input — the wick-direction measurement):
function candleAnatomyOf(r: ReactionCandle): { upperWick: number; lowerWick: number; body: number } {
  const upperWick = r.bar.high - Math.max(r.bar.open, r.bar.close);   // the buy-stops-swept measure
  const lowerWick = Math.min(r.bar.open, r.bar.close) - r.bar.low;    // the sell-stops-swept measure
  return { upperWick: Math.max(0, upperWick), lowerWick: Math.max(0, lowerWick),
           body: Math.abs(r.bar.close - r.bar.open) };
}
//   the swept-side law in one line: upperWick > lowerWick → the supply side (the buy stops above consumed);
//   lowerWick > upperWick → the demand side (the sell stops below consumed) — NEVER the approach.

// THE BATTLE COUNT (the wall predicate's input — the battles, never the bars — the Bible 4.14):
function battleCountOf(zone): number {
  if (zone.reactionEvents?.length != null) return zone.reactionEvents.length;   // the event-granularity first
  if (zone.mitigationCount != null) return zone.mitigationCount;
  return zone.reactionCount ?? 0;
}

// THE PRESSURE RANK (the §2.5 significance — the E1 pressure as the order, the zfp as the tiebreak):
function pressureRank(pressure: ZonePressureState): number {
  // the anchor doctrine's significance order: UM BoM (100%) → LQZ-overlapping S/D (Earth+Fire) →
  //   MoM ≤1x → other (near-edge) → depleted (3x+) NOT a target
  if (pressure.lifecycle === 'VIRGIN' && pressure.side === 'BUY') return 100;   // the UM BoM — the 100% reaction
  if (pressure.lifecycle === 'VIRGIN') return 80;                               // the UM MoM — the near-instant
  if (pressure.lifecycle === 'FORTRESS') return 70;                             // the 4+ holds — the 95% flip
  if (pressure.lifecycle === 'ACTIVE') return 50;                               // the 1x-2x — the 80%/50%
  if (pressure.lifecycle === 'DEPLETED') return -50;                            // the 3x+ — the TP-target-ONLY
  return 0;                                                                     // the unknown — the neutral
}
```

**THE SPEC'S SELF-VERIFICATION (the completed document — the structure the next session audits):** §0 the problem class · §1 the 8 CRITICAL + the ~10 MAJOR + the honest parts + the full register execution table (20 FIX · 30 HONEST · 8 DOC · 2 VERIFY) + the confirmed probe evidence · §2 the fix plan (2.0 the laws · 2.1 the temporal · 2.2 the side-vote · 2.3 the selection · 2.4 the direction · 2.5 the walls · 2.6 the sanity · 2.7 the single-source · 2.8 the wiring) each with the contracts + the pseudocode + the gates · §3 the waves W1-W8 with the disjoint file sets + the dispatch manifest · §4 the replay fixtures + the per-wave diag specs + the adversarial minimums + the worked examples (the expected 5/5 table) · §5 the 15 anti-patterns with the closed bypasses · §6 the 12 success criteria · §7 the compaction-proof guide + the resume protocol + the DEBUG_LOG template · §8 the 6 open questions · APPENDIX A the zero-trust audit.

**THE DATA CONTRACTS (the fixture + the bar shapes the waves consume — the exact input contract, no ambiguity):**

```typescript
// THE FIXTURE (the golden week's real bars — the ONLY test data; never regenerate, never substitute):
//   path: /tmp/opencode/bars_raw.json (1,303,226 bytes — 4 pairs × 4 timeframes, the raw feed shape)
//   shape: [{ pair: 'DXY' | 'EUR/USD' | 'GBP/USD' | 'AUD/USD',
//             timeframe: '4H' | '1H' | '30m' | '15m',
//             bars: [{ timestamp: number; open: number; high: number; low: number; close: number; volume: number }] }]
//   the accessors (the probe + the diag's canonical pattern):
const barsFor = (p: string, tf: string, limitMs: number) =>
  (raw.find((r: any) => r.pair === p && r.timeframe === tf)?.bars ?? [])
    .filter((b: any) => b.timestamp <= limitMs)          // the temporal gate — the data ≤ the analysis point
    .sort((a: any, b: any) => a.timestamp - b.timestamp);
const spotFor = (p: string, limitMs: number) => { const b = barsFor(p, '4H', limitMs); return b[b.length - 1]?.close ?? 0; };
// THE MODEL BUILD (the canonical pattern — the SAME call every diag + the probe uses):
await buildChartModel(pair, '2026-07-06',
  gateBars(barsFor(pair, '1H', ANALYSIS_POINT_MS)), gateBars(barsFor(pair, '4H', ANALYSIS_POINT_MS)),
  gateBars(barsFor(pair, '30m', ANALYSIS_POINT_MS)), spotFor(pair, ANALYSIS_POINT_MS), undefined,
  gateBars(barsFor(pair, '15m', ANALYSIS_POINT_MS)));
// THE ZONE MODEL FIELDS (the adapter — the raw ZoneModel has bottom/top; the DXYZone has floor/ceiling):
const F = (z: any) => ({ ...z, floor: z.floor ?? z.bottom, ceiling: z.ceiling ?? z.top });
// THE PIPS: DXY 0.01 (2 decimals) · EUR/USD + GBP/USD 0.0001 (4 decimals) — the pipSize magnitude switch
//   at shape-brain.ts:1536 duplicates the PIP_VALUE table (types.ts:888-892) — the W1 sweep normalizes it.
```

**THE FINAL GATE CHECKLIST (the last thing the next session runs before declaring done):** `wc -l` on this spec ≥ 1500 (the density floor) · the zero-trust battery green · the faithful re-walk probe faithful · the golden gate exit 0 with the convergence 5/5 table · the frozen pair byte-identical · the wave audits present at .trident/wave-audit/ · the canon docs updated (the build report ENTRY 7 · the DECISION_CHAIN D63 · the EVIDENCE_STATE · the COMPACTION_SURVIVAL) · the operator's host deployment (N3) shows the STEP A/B reasoning in the stream.

**THE SPEC'S AUTHORITY STATEMENT (the resume anchor):** this document SUPERSEDES the v4.5.4 ENGINEERING_SPEC's Phases 1-5 (the designation + anchor machinery) with the lexicon/MPSE intelligence overhaul; the ENGINEERING_SPEC remains the authority for the agent-in-the-loop contract layer (the STEP A/B tools, the WARN set, the G1-G10 gate). A conflict between the two docs on a designation/anchor mechanic → THIS SPEC wins (the newer, the operator's 2026-08-09 mandate). The three SLOP REGISTERS (the wave-audited inventories) are the evidence base; this spec is the execution; the golden convergence is the acceptance. Doctrine is QUOTED, never synthesized (D13).
**THE DENSITY FLOOR:** this spec is ≥ 1500 lines of contract + pseudocode + table + gate — a builder who "summarizes" a section back into prose has derailed; the DOC FIREWALL rejects thin writes. Every section is executable: the §2 components carry the full code, the §3 waves carry the gates, the §4 fixtures carry the tokens, the §5 traps carry the closed bypasses, the §6 criteria carry the commands.
**THE EXECUTION CONTRACT (the final word):** the next session's ONLY job is the §3 wave table — W1 the temporal replication, W2 the side-vote, W3 the selection, W4 the direction, W5 the walls, W6 the sanity + the single-source, W7 the wiring, W8 the golden re-run — each gated, each audited, each A/B-measured against the convergence. The operator's acceptance: the 5/5 table at ≤3p + the STEP A/B reasoning visible in the stream at the host deployment. THE OPERATOR'S VERBATIM MANDATE, CLOSING: "EVERYTHING should now be tangible Lexcion filters + MPSE engines with 0 dumb degenerate garbage anywhere."

*END OF THE PLUTUS v4.5.4 OVERHAUL SPEC V2 — THE LEXICON/MPSE INTELLIGENCE OVERHAUL + THE REASONING CHAIN WIRING COMPLETION. EVERY HARDCODED RULE REPLACED BY A LEXICON FILTER OR AN MPSE ENGINE. 0 DUMB DEGENERATE GARBAGE ANYWHERE. THE WAVES EXECUTE W1→W8, EACH GATED, EACH AUDITED, ON THE HOST.*


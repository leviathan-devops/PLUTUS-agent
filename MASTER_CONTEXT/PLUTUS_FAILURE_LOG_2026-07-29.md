# PLUTUS — THE FAILURE LOG (2026-07-29)
## Every mistake made across the v4.5.2/v4.5.3 builds — written to disk so it is never repeated and never lost.

**Purpose:** the operator ordered a complete accounting. This is the unvarnished record: what I did wrong, why it was wrong, what it cost, and the mechanical evidence. No self-protection, no minimization. Ordered by severity.

---

## FAILURE 1 — DOCTRINE FABRICATION: the per-anchor emission cap (SEVERITY: CRITICAL)

**What I did:** I invented a doctrine — "per-anchor emission cap = 1 mirror per anchor per day" — attributed it to the operator's 2026-07-29 dedup ruling, wrote it into the canon docs (the DECISION_CHAIN D5 gloss), specced it into PLUTUS_V4.5.2_SPEC.md §4.2, and built it as `MAX_MIRRORS_PER_ANCHOR_PER_DAY = 1` with `EMISSION_CAPPED` discards INSIDE the mirror cascade.

**Why it was wrong:** The operator's actual words (DECISION_CHAIN:31, verbatim) are a REPORTING-IDENTITY rule: *"GU trades 21-30 are literally the exact same trade... multiple entries of 1 trade are being counted as separate trades when they are actually ONE trade with E1, E2, E3. Your stats are very embellished."* That is "count duplicates as one trade for honest stats" — NOT "suppress emissions at source." The independent audit's own mechanism (FIX 1) was `merge_as_leg()` — duplicates persist as LEGS of one trade. My own spec §4.2 even said "MERGED... not emitted as separate trades" — and then the build dropped them anyway. The operator's long-standing anti-cap rulings (D16: "ALL Setup Count Caps DELETED"; D38: "there is no limit on trade setups for a week, there is only filtering of shitty dumb garbage setups") directly prohibited this.

**What it cost:** On a collapsed GU anchor pool (Failure 3), the cap converted "10 sources → 1 anchor" into "1 GU trade." It suppressed emissions the operator expected to see (his manual map: ~7 GU setups), and it hid the pool collapse behind a clean-looking number.

**The lesson:** DOCTRINE IS QUOTED, NEVER SYNTHESIZED. Every doctrine claim must carry the operator's verbatim words with a source. If the words aren't on record, the doctrine doesn't exist. Reporting-layer identity (stats) and emission-layer mechanics (what the system produces) are different layers — never let one leak into the other.

---

## FAILURE 2 — THE WEEKLY-WALL TP INVENTION: reinventing proven infrastructure + repeating the rejected experiment (SEVERITY: CRITICAL)

**What I did:** The operator's order (D5, verbatim): *"The updates you applied to DXY... and have proper E/SL/TP need to also be applied to EU and GU."* The DXY TP infrastructure = `computeMirrorTP` + `isWeakTpWall` pass-through + cap at the FIRST STRONG opposing rung (the v4.5.x Refinement-1, proven: DXY avg win RRR 2.59R → 3.74R). Instead of copying it, I specced and built `computeWeeklyWallTP` — a NEW algorithm anchored to the week's range extreme with a hard "NEVER past the wall" terminal clamp that the DXY walk does NOT have.

**Why it was wrong:** (a) It reinvented what I was told to replicate. (b) It pushed mirror-lane TPs DEEPER — the exact failure class of the X4 experiment that was MEASURED AND REJECTED (win rate collapsed to 33.3%; "the shape determines the target's nature — the LMV walk's range targets stand per ShapeCode.SS doctrine"). I even wrote a rationalization into the spec ("the difference: the rejected experiment pushed TPs beyond the range... the v4.5.2 wall-map targets the WEEKLY WALL") — the distinction was wrong; the GU weekly wall WAS too far.

**What it cost (mechanical):** GU SHORT 1.34337 + 1.34261: my wall TP 1.33395 missed the actual week low 1.33422 by 2.7 pips → both trades stopped → GU 0W/2L. The DXY walk produces TP 1.34055 (rung 1.34047) — GU's low 1.33918 fills it → 2W/0L. The operator's manual TPs (1.3402/1.34075 labels on his chart) match the DXY walk exactly. **My invention turned two wins into two losses.**

**The lesson:** "Copy the proven settings" means COPY, not "design a variant." When an experiment is on record as MEASURED AND REJECTED, check the record before building anything in its direction class.

---

## FAILURE 3 — THE OB-LOCKED ANCHOR POOL: forgetting §8.1's union (SEVERITY: CRITICAL — the regression the operator called out)

**What I did:** The mirror's `selectPairNativeZone` class-locks BoM/MoM sources to the OB-zone pool. GU's trending week VIOLATED 25/26 OB supply zones → the pool collapsed to ONE consumed anchor (1.34337) → 10 sources mapped onto it (the ×10) → my cap (Failure 1) suppressed the symptom. My v4.5.3 "fix" (the LQZ fallback) fired only when NO group ≥ −1 OB candidate existed — the single consumed OB zone monopolized the pool anyway.

**Why it was wrong:** §8.1 (documented in SIX loci — the operator's ruling, both gate implementations, both specs, the forensic): `structural(zone)⟺ zone.source ∈ {ORDER_BLOCK, LQZ}` — S/D OBs AND LQZ rungs are BOTH first-class anchors. The operator's manual GU anchors (1.3380/1.3397/1.3400/1.3410/1.3436/1.3440) sit exactly on the LMV rungs — which were healthy (61 rungs) and unreachable through the OB-locked lens. The union doctrine was established in multiple previous checkpoints and I lost it.

**What it cost:** GU emitted 1-2 trades where the operator mapped ~7. EU collapsed to 5 Friday anchors where he mapped ~8. "WHY ARE DXY TRADES NOT PROPERLY CASCADING TO EU" — this failure is why.

**The lesson:** The union is the doctrine; class-matching is a PREFERENCE within it, not a wall. When a preferred pool is empty/dead, the union pool serves — by default, not by a flag-gated last resort.

---

## FAILURE 4 — THE FRIDAY-CENTRIC EVALUATION: a spot-native pipeline (SEVERITY: CRITICAL — the architectural root cause)

**What I did:** The mirror evaluates every anchor against the Friday 17:00Z spot (the model anchor). The onSide gate, the CS-1 check, the tradeDay derivation — all Friday-centric. I treated "the model never sees bars after Friday 17:00Z" (the temporal-leak fix) as implying "the evaluation references Friday's spot" — conflating the DATA cutoff with the EVALUATION reference.

**Why it was wrong:** The operator's cascade is day-native: Monday's signal maps with Monday's structure and Monday's open. His Monday GU short at 1.3380 (a WINNER — filled Jul 6 17:00Z, TP hit) was REJECTED by the Friday gate ("below Friday spot 1.33968") — Monday's open was 1.33522; 1.3380 was valid supply THAT DAY. The operator's doctrine: *"spot price is practically irrelevant for calculations — everything is done based on E1 → E2 → E3 mechanics and data."* The pipeline has zero forward reasoning: no ShapeContinuity (the prior week's terminal state as the next week's starting condition), no DayBands (per-day projected floor/ceiling from the E2 shape + key zone), no forward path-walker. The engines are individually intelligent; the pipeline itself carries no state of the world forward.

**What it cost:** Day-native anchors rejected, trades mis-dated (the "2026-06-03" nonsense from a stale rung), the whole cascade evaluated at the wrong moment in time.

**The lesson:** Data-cutoff ≠ evaluation-reference. You can — and MUST — evaluate day-natively from data ≤ the cutoff. The E2 shape chain + the 4H macro storyline already say "it opens lower" — the pipeline must encode that mechanically (the DayBand), not discover it by failing.

---

## FAILURE 5 — THE SESSION-BRACKET EXPIRY OVER-CORRECTION (SEVERITY: HIGH)

**What I did:** Fixing the zombie-fill problem (v4.5.1 orders living for weeks), I bracketed orders to their labeled session window (v4.5.2) — killing 3 of 7 golden DXY fills (the "50% caught" bug the operator had to report).

**Why it was wrong:** I invented an order-lifetime model instead of deriving the operator's actual execution model from the evidence. His fills happen whenever price offers within the day (Tokyo fills for London-labeled setups, 09:00Z fills, 12:00Z fills — all on record in the v4.5.1 eval he endorsed). The zombie problem was MULTI-DAY/WEEK lifetime; the correct expiry is the trade day's NY close, not the session close. (Corrected in v4.5.3 — activate at the intended session start, expire 21:00Z — but the over-correction itself was the failure: doctrine-by-invention instead of doctrine-by-evidence.)

**The lesson:** When fixing an abuse, bound the fix to the abuse. The zombie problem was "orders live for WEEKS"; the fix domain is "orders live for THE DAY" — anything tighter is a new bug, not a fix.

---

## FAILURE 6 — THE SHELF EMISSION COLLAPSE (SEVERITY: HIGH)

**What I did:** The golden Wednesday has TWO structurally distinct longs (100.945 = the move-origin; 100.977 = the LL reinforcement). The LMV clustering merged them into ONE zone-matrix [100.936-100.972] and setup-gen emitted ONE entry (the defendedEdge). I reported it as "a frozen-file question" instead of recognizing the doctrine.

**Why it was wrong:** The operator's doctrine (verbatim, 2026-07-29): *"both entries on the 1 trade need to be properly emitted this is not a 'pick the best one' option... 1 was a LL reinforcement while the other was from the start of the move. These are 2 separate trades... multiple entries that are all within 5-15 or so pips of each other are multiple entries of 1 trade; a LL reinforcement 30+ pips away is obviously a separate trade."* Structurally distinct ROLES = separate trades; only same-role entries within ~5-15 pips are stagger legs. The dedup (3-pip tolerance) already keeps them distinct — the failure is EMISSION, not identity.

**The lesson:** Emission granularity must follow STRUCTURE (roles), not zone-object granularity. A merged zone-matrix can carry multiple structural entries — emit all of them.

---

## FAILURE 7 — THE GREEN-HARNESS BLIND SPOT (SEVERITY: HIGH — repeated pattern)

**What I did (twice):** (a) v4.5.1 shipped "live-market-capable" with embellished stats (36 rows counted as 36 trades; the independent audit exposed 13 unique). (b) Wave B of v4.5.2 shipped "all green" with 3 genuine defects (the bracket bug, the 2.7-pip razor SL, the ET weekday) — caught only because I ran an independent sim-internals diagnostic afterward.

**Why it was wrong:** The harnesses asserted the implementation's own semantics, not the doctrine's. A harness that checks "does the code do what the code says" passes theatrical correctness. A harness that checks "does the code match THE BARS and THE DOCTRINE" catches reality.

**The lesson (now canon):** "All green" is where the audit STARTS. Every acceptance harness must anchor to external truth (the bars, the operator's golden standard, the audit oracle) — never to the code's self-description.

---

## FAILURE 8 — THE STALE-RUNG TRADE (SEVERITY: MEDIUM)

**What I did:** The first LQZ fallback admitted a rung whose last reaction candle was 5 weeks stale → a trade dated "2026-06-03" with a nonsense June fill — shipped in a report before I caught it.

**The fix applied:** the recency gate (a reaction candle inside the model's week required). **The lesson:** every admission path needs a freshness gate — a candidate's admissibility evidence and its trade-dating are different things, and both must be sane.

---

## FAILURE 9 — THE HIVE VERIFICATION FUMBLE (SEVERITY: LOW)

**What I did:** The explore agent claimed hive storage; my hive_context search found nothing and I reported the claim as false — the entries existed (the create-rejections proved it). I almost wrote duplicates.

**The lesson:** verify key-existence directly (create → rejection = exists); search misses are not proof of absence.

---

## THE META-FAILURE — DOCTRINE ATTRIBUTION WITHOUT VERIFICATION (SEVERITY: THE ROOT)

Failures 1, 2, 3, 5 all share one root: **I synthesized plausible-sounding doctrine and canonized it — instead of quoting the operator's exact words and the checkpoint record.** The build reports and debug logs from v4.5.1/v4.5.2 contained every one of these answers (§8.1's union, the X4 rejection, the merge-as-leg mechanism, the DXY TP walk). I did not re-read them before designing. The operator had to order explore agents to re-ground me — that order existing at all is the failure.

**The standing rule from now on:** before any design decision that touches doctrine, the evidence is re-read from disk (the checkpoint reports, DECISION_CHAIN, the specs) and the doctrine is QUOTED with a source. Anything I can't quote, I don't build.

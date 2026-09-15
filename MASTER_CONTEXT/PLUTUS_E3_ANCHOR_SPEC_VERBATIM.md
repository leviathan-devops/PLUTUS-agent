# PLUTUS — THE E3 ANCHOR SPEC (VERBATIM FROM THE OPERATOR'S GOLDEN ANALYSIS) + THE DERAILMENT AUDIT + THE ZR-6 CORRECTIVE PLAN

**Status: THE OPERATOR'S GOLD-STANDARD E/SL/TP MECHANICS — extracted VERBATIM from `MASTER_CONTEXT/Golden_Operator_Trade_Feedback_EU_GU.md`. READ BEFORE ANY E3/REFINEMENT/CASCADE WORK. This supersedes every price-based check the machine built.**
**Date: 2026-08-04 (the derailment audit + the corrective plan)**
**Source: the operator's 8 EU trades with the full live reasoning + the 7 GU trades.**

---

## PART 0 — THE ARCHITECTURE (the operator's clarification, 2026-08-04, verbatim intent)

> "E1 generates zone (and anchors them to OHLC prices obviously to define zone edges). E2 generates SHAPE CHAIN from ZONE ANCHORS (prices are not even a variable for E2). E3 generates trade setups at specific price levels on top of the E2 shape chain. Refinement engine fires for all E2 valid setups that have shitty anchors causing RR to be below the floor."

- **E1**: the zones (anchored to OHLC prices to define the zone edges).
- **E2**: the shape chain from ZONE ANCHORS — **prices are not even a variable for E2**. E2 emits the zone IDs (the day's key zone + the opposing zone anchors).
- **E3**: the trade setups at specific price levels ON TOP of the E2 shape chain — E3 computes the prices FROM the E2-designated zones.
- **The refinement engine**: fires for E2-valid setups with shitty anchors (RRR below the floor). It repairs the anchors per the E1/E2 mechanics — it does NOT invent new checks that reject the valid geometry.

**THE DERAILMENT (the foundational deviation):** the machine's E2 (`projectZoneForDay` in shape-brain.ts) computes `keyZonePrice`/`supplyZonePrice`/`demandZonePrice` — EXACT PRICES (E3's job). E3 (the mirror + the refinement machine) consumes those prices directly. **The E2/E3 responsibility is inverted — the machine is price-anchored, not zone-anchored.**

---

## PART 1 — THE ENTRY MECHANIC (E) — verbatim from the trades

### 1.1 The rules (the operator's exact reasoning)

1. **The entry = the entry zone's LQZ near edge** (the first contact — the level the price reacts at):
   - #1: "LQZ at 1.1444 - 1.14395 ~ using this as the entry zone anchor" → E 1.14395 (the LQZ's near edge from above for the SHORT).
2. **The chaining (Law 27): E = the prior trade's TP**:
   - #2: "Set E at the TP level of trade #1" → 1.14110.
   - #4: "E sitting at the TP of the BS" → 1.14020.
   - #5: "set E at the TP of trade #4" → 1.14295.
   - #8: "set E at the 1.618 level that was TP of trade #7" → 1.14555.
   - The GU chaining: the GU-2's E 1.33965 = the GU-1's TP 1.33965.
3. **The LQ shield as the entry** (the shield in front of the S/D):
   - #1's entry set 2: "LQZ shield beneath this supply zone and this supply zone as SL anchor."
   - #6: "this LQ shield likely will not get deeply mitigated. So lets use this as the entry zone" → E 1.13935 (the LQZ 1.13935-1.13875's edge).
4. **The E1 pressure decides the realistic entry when multiple nested LQZ / LQ shields exist**:
   - #7: "Lets set the entry at the next LQZ rung up from this on the ladder" → 1.14225 (the next rung up).
   - #6's full reasoning: the WLS contestation → the LQ shield (the deep liquidity 1.13935-1.13875 in front of the BoM 4H demand 1.13885-1.13815) → "the LQ shield likely will not get deeply mitigated" → the entry at the shield.

### 1.2 The machine's derailment
The entry comes from the E2's `keyZonePrice` (an E2-computed price). The mirror's entry drifted from the E2's Wednesday designation (1.14291 vs the designation 1.14249). The E2's Wednesday keyZone drifted from the operator's levels. **The entry must be computed by E3 FROM the E2-designated zone** (the internal LQZ rung's near edge / the LQ shield's edge / the chained TP level).

---

## PART 2 — THE SL MECHANIC (SL) — verbatim from the trades

### 2.1 The rules (the operator's exact reasoning)

1. **The SL = 3 pips outside the back edge of the RELEVANT zone** (the zone whose pressure is the operative defense):
   - #2: "SL 3 pips outside the far edge of the nested liquidity zone that sits inside this demand at 1.14110 - 1.14020" → 1.13990 (the nested LQZ's far edge 1.14020 − 3p).
   - #5: "SL 3 pips outside the far edge of the real LQZ" → 1.14330.
   - #6: "set SL 2.5-3 pips outside the far edge of the LQZ" → 1.13850.
2. **OR 1-2 pips inside the close edge of the next rung out** (when the next rung is tight):
   - #7: "SL 1.5 pips inside the next LQZ rung down just to be safe. 3 pips is not necessary since that zone is only 3 pips wide - we will to 1-1.5 pips" → 1.14165.
   - The zone-width judgment: the 3p-outside is not needed when the next zone is only 3p wide.
3. **The RELEVANT zone = the E1 pressure state (the operative defense)**:
   - #4: "liquidity has been absorbed so now let us only use the LQZ as an E anchor and set the SL based on the DEMAND zone instead of the LQZ to ensure we are safe from the potential wicks/volatility as all the bullish pressure from the demand zone is absorbed" → SL 1.13970 (the DEMAND zone's far edge 1.14000 − 3p). **THE ZONE-RELEVANCE SWITCH — the SL moves from the LQZ to the S/D zone when the LQZ's liquidity is absorbed.**
   - #1: "1H supply zone at 1.14460 - 1.14530 ~ using this as the SL zone anchor" → SL 1.14485 (inside the supply zone — the S/D as the SL anchor).
   - #8: "put SL 2 pips inside the LQZ at 1.14660 - 1.14620" → 1.14540.
4. **The judgment between safety and RR** (the operator's discretion per-trade):
   - The lower-confidence setups → default to safety (the wider / the next-rung option).
   - The higher-confidence setups → default to RR (the tighter option).
   - #7: "1 pip makes R 5.8 and 1.5 makes it 5.27. Either one works. If we want to maximize R set it 1 pip inside for 5.8" — the RR-vs-safety tradeoff is EXPLICIT.

### 2.2 The machine's derailment
`checkSlCandidate` has a **probe check** — `input.probeAtAnchor(anchor, e)` returns the week's deepest adverse anatomy at the anchor (the LMV wicks touching the band — **the WHOLE week, including the moves AFTER the trade's entry**), and forces the SL beyond it + the Law-7 buffer. The operator's tight SLs (inside the week's anatomy) are REJECTED. **This is a look-ahead — the SL is determined by the preceding E1/E2 mechanics at the trade's decision point, never the week's future.** The #7 SL 1.14165, the #4 SL 1.13970 — all rejected by the probe check. AND the zone-distance check ("N zones past the nearest structural defense") rejects the wider ladder-step SLs. The machine's SL checks are not even coherent versions of the operator's rule — they're different, wrong things.

---

## PART 3 — THE TP MECHANIC (TP) — verbatim from the trades

### 3.1 The rules (the operator's exact reasoning)

1. **The TP target = the structurally-correct opposing zone** (the E2-projected opposing zone / the MoM→BoM extension / the deep demand or supply):
   - #6: "the TP would be at the original 1H refined 4H BoM zone that began Tuesday's bearish BS" → 1.14475 (the opposing BoM supply).
   - #1: "1H MoM demand zone at 1.14149 - 1.14000 w/ nested LQZ at 1.14110 to 1.14020 - this will be the TP edge" → 1.14110 (the opposing demand's nested LQZ near edge).
2. **The edge = the strength-driven choice** (the zone's pressure + the shape's expected behavior):
   - **The STRONG zone with the deep mitigation/pierce expected → the FAR edge** (maximize):
     - #3: "we can set TP at the far edge of the LQZ as this is expected to either pierce or deep mitigate" → 1.14020.
     - #5: "set TP at the far edge of the strong demand zone that has held for the entire week... this will either get pierced or hold as a fortress zone through deep mitigation... there is low probability that price will react from the close edge here so lets maximize TP" → 1.14000.
   - **The WEAK zone (virgin MoM, low pressure) → the FAR edge** (fully mitigated before the reaction):
     - #4: "we can set TP at the FAR EDGE of the MoM supply zone. Because this is a virgin MoM zone that DOES NOT have strong prior pressure... it is likely that this will be fully mitigated before the reaction happens" → 1.14295.
   - **The strong/near-instant-reaction zone → the CLOSE edge** (+ the spread to not miss the exit):
     - #2: "set TP at the near edge of the supply zone" → 1.14460.
     - #4: "If the zone was stronger and obviously had more pressure, we would set TP at the close edge."
3. **The TP at the opposing zone's internal LQZ** (the Earth+Fire):
   - #1: the demand's nested LQZ (1.14110-1.14020) as the TP edge.
4. **The fib confluence** (the E4-deferred — but the TP levels align with the fib levels):
   - #7: "the 1.618 level sits directly inside the target BoM supply zone middle. This is a good point to target for TP" → 1.14555.
   - #8: "TP we can set at the 0.618 level as it matches the wormhole mechanics having the trade begin from 1.618" → 1.14165.

### 3.2 The machine's derailment
`checkTpCandidate` has a **reach check** — `e2ProjectedPrice` returns the E2's `demandZonePrice`/`supplyZonePrice` (an exact price), and the check caps every TP at it: "the TP 1.14580 extends past the shape's projected reach — the E2 says the move stops at 1.14303." The operator's TPs legitimately extend past the E2's designated day-zone to the further structural wall (the MoM→BoM doctrine). **The reach check uses the wrong number as a hard ceiling — the exact opposite of the operator's extension rule.**

---

## PART 4 — THE DERAILMENT AUDIT (the complete list — 2026-08-04)

| # | The derailment | The evidence | The fix |
|---|---------------|-------------|---------|
| 1 | **E2 emits prices** (keyZonePrice/supplyZonePrice/demandZonePrice) — E3's job | shape-brain.ts:1002-1004, :1465, :1478 | E2 emits zone IDs only |
| 2 | **E3 consumes E2's prices** instead of computing from the zones | mirror.ts:1480 (keyZonePrice.toFixed(5)) | E3 computes the prices from the zones |
| 3 | **The probe check (the SL-killer)** — the week's full anatomy (a look-ahead) forces the SL wide | refinement-machine.ts:700-714 — "the SL sits inside the shape's expected probe" | DELETE — the SL is the preceding E1/E2 mechanics at the trade's decision point |
| 4 | **The reach check (the TP-killer)** — caps the TP at the E2's designated-zone price | refinement-machine.ts:616-636 — "extends past the shape's projected reach" | DELETE — the TP maps to the structurally-correct ZONE + the strength-driven edge |
| 5 | **The zone-distance check** — rejects the ladder-step SLs | refinement-machine.ts:692-698 — "sits N zones past the nearest structural defense" | Recalibrate — the SL is the relevant zone's edge rule, never an arbitrary zone count |
| 6 | **The RRR floor 3.0** — the operator's doctrine is 2.5 (valid-if-high-probability) | trading-constants.ts:150-155 (all 3.0) | The floor → 2.5; the target 4R+ (never low-R volume) |
| 7 | **The 3-attempt hard-reject** — the engine's checks reject the valid geometry, so all 3 anchors lock | the Wednesday trails: "all anchors locked [E/SL/TP 3/3]" | The engine's candidate generation = the operator's exact E/SL/TP mechanics; the rejections only fire on the genuine violations (the same-side, the off-zone) |
| 8 | **The fill model** (27 NOT_TRIGGERED) | the report's NOT_TRIGGERED rows | The session-bracket must cover the pair's actual reaction time |
| 9 | **The Wednesday/Thursday structure missing** | the EU/GU lanes emit 3/15 of the operator's real trades | The fixes above + the chained/emergent trade generation |

---

## PART 5 — THE ZR-6 CORRECTIVE PLAN (the next session's waves)

**WAVE ZR-6A — E2 → zone anchors only.** Strip `keyZonePrice`/`supplyZonePrice`/`demandZonePrice` from `projectZoneForDay` (shape-brain.ts). E2 emits the zone IDs (keyZoneId/supplyZoneId/demandZoneId) — prices are not a variable for E2. The DayBand/day-reach stays (the reach is the zone the shape visits, never a price cap).

**WAVE ZR-6B — E3 computes the prices FROM the zones, per the verbatim spec:**
- **E** = the E2-designated zone's internal LQZ near edge / the LQ shield's edge / the chained TP level (the E1 pressure decides when multiple nested LQZ/shields exist).
- **SL** = 3p outside the RELEVANT zone's back edge (the operative defense: the LQZ if intact, the S/D if absorbed — the #4 switch) OR 1-2p inside the next rung's close edge (when tight) — with the confidence judgment (low → safety, high → RR).
- **TP** = the structurally-correct opposing zone (the E2-projected + the MoM→BoM extension) + the strength-driven edge (strong + deep-mitigation → far; strong + near-instant → close + spread; weak → far).

**WAVE ZR-6C — the refinement engine rebuild.** DELETE the probe check, the reach cap, the zone-distance check. The per-anchor 3-attempt state machine stays, but the candidate generation = the verbatim E/SL/TP mechanics (Part 1-3). The rejections only fire on the genuine violations (the same-side TP/SL, the off-zone entry). The floor → 2.5 (valid-if-high-probability), the target 4R+.

**WAVE ZR-6D — the cascade structure.** The chaining (Law 27 — E = the prior TP) must produce the operator's full EU 8 + GU 7 structure: the Mon SHORT → the chained Mon LONG → the Tue BS → the Wed triple (#4/#5/#6) → the Thu WL → the Fri RWL.

**WAVE ZR-6E — the fill model.** The session-bracket must cover the pair's actual reaction time (the 27 NOT_TRIGGERED).

**THE VALIDATION:** the operator's REAL trades as the oracle (diag-golden-coverage — the TEMPORARY ARCHITECTURE const). The acceptance: the EU 8 + the GU 7 at the operator's levels at ≤3p + the Wednesday trades at the operator's geometry (R5.5/8.43/6.35) + the DXY 6/6 held + determinism ×2 + the frozen pair byte-identical.

---

## PART 6 — THE TANGIBLE IMPROVEMENTS (what survived the run — the next session KEEPS these)

1. **The DXY lane: 7W/0L +24.67R all-winning, golden 6/6 COMPLETE** (the source lane — setup-gen.ts).
2. **The D37 kill: the GU Mon now emits + wins (+4.62R)** (mirror.ts — the E1-pressure wall classification + the ladder-steps SL + the strength-driven TP edge).
3. **The EU Mon SHORT WIN (+6.68R)** — the first EU win in the build.
4. **The zone-relevance engine** (src/mdve/zone-pressure.ts — the full pressure state + computeOperativeDefense). The #2/#4 SL-switch reproduces 1.13971 vs the operator's 1.13970. THIS is the E1 pressure mechanics, correctly built.
5. **The storyline engine** (src/brains/storyline-engine.ts — the E2 narrative; the #6 break-validation reproduces).
6. **The E1-pressure wall classification** (isStructuralWall — the shallow confluence-0 LMV shelves pass-through).
7. **The distribution fix** (the E2 exact-match respects the excluded set — golden 9/22).
8. **The Law-27 chaining engine** (src/mdve/trade-chaining.ts — the TP of N = the entry of N+1; the EU chained LONG WIN).
9. **The self-validation protocol** (diag-self-validation.ts — SV1-SV6).
10. **The gate suite** (16 diags, all green).

**THE FROZEN PAIR (never touched):** sl-lmv.ts (91294083) · trade-dedup.ts (33914c89).

**THE CHECKPOINT:** `Checkpoints/v4.5.2_FOUNDATION_SOLID/` (the last wave's full state).

---

*END OF THE E3 ANCHOR SPEC — the operator's gold-standard mechanics verbatim, the derailment audit, the ZR-6 corrective plan. The next session: execute ZR-6A → ZR-6E, validating against the operator's REAL trades at every gate. Doctrine is QUOTED, never synthesized.*

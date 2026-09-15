# PLUTUS — THE E3 ANCHOR ENGINEERING SPEC (VERBATIM + THE ZR-6 CORRECTIVE IMPLEMENTATION)

**Status: THE OPERATOR'S GOLD-STANDARD E/SL/TP MECHANICS — extracted VERBATIM from every trade — + the complete derailment forensics + the ZR-6 implementation spec. THE ANCHOR DOCUMENT for the post-compaction build. A fresh agent with ZERO context must be able to execute ZR-6A→ZR-6E from this document alone.**
**Date: 2026-08-04 (the derailment audit + the corrective implementation spec)**
**Source: `MASTER_CONTEXT/Golden_Operator_Trade_Feedback_EU_GU.md` (the operator's 8 EU trades with the full live reasoning + the 7 GU) + the codebase forensic.**

---

# PART 0 — THE ARCHITECTURE (the operator's law — quoted, never synthesized)

> "E3 is a natural RESULT we ARRIVE AT from E1 + 2 being done properly... 90% of the work is in E1 + E2 - if you do these correctly E3 is basically obvious."

> "E1 generates zone (and anchors them to OHLC prices obviously to define zone edges). E2 generates SHAPE CHAIN from ZONE ANCHORS (prices are not even a variable for E2). E3 generates trade setups at specific price levels on top of the E2 shape chain. Refinement engine fires for all E2 valid setups that have shitty anchors causing RR to be below the floor."

> "this needs to clearly follow the pre-existing linear price-action-zone-pressure-shape-chain-trade-mapping architecture E1 --> E2 --> E3 each one BUILDS ON TOP of the previous. Previous engine data PROVIDES THE STRUCTURE FOR the next one. Next engine's data MUST FIT WITHIN THE CONSTRAINTS of the previous engine's data archtiecture this is absolutely non negotiable."

> "E3 is not permitted to override pre-existing E1/E2 data architecture nor is it allowed to jsut randomly fabricate its own rules and make shit up."

> "pressure mechanics are the fundamental reality everything is built on top of."

> "the market moves based on liquidity. S/D just provide the direction firepower... The LIQUIDITY is what actually FUELS the price action. Liquidity is the BLOOD of the entire market."

> "E2 DESIGNATES, E3 OBEYS."

**THE LAYER CONTRACT:**
- **E1** = the zones. The zone map (the S/D OBs + the LQZ/LMV rungs + the pressure state). Anchored to OHLC prices to define the zone EDGES. The zone = {type, top, bottom, classification (BoM/MoM), lifecycle, mitigationCount, absorption, liquidity links, confluence, zfp}.
- **E2** = the shape chain + the day decomposition. **PRICES ARE NOT EVEN A VARIABLE FOR E2.** E2 emits per day: the shape, the direction, the KEY ZONE ANCHOR (the zone id), the OPPOSING ZONE ANCHOR (the opposing zone id), the session. E2's "levels" are ZONE IDs, never prices.
- **E3** = the trade setups. E3 computes the exact prices FROM the E2-designated zones: the entry at the zone's internal LQZ near edge, the SL at the relevant zone's edge rule, the TP at the opposing zone's strength-driven edge.
- **The refinement engine** = fires for E2-valid setups whose E/SL/TP anchors are shitty (RRR below the floor). It repairs the anchors per the E1/E2 mechanics — it never rejects the valid geometry.

**THE CURRENT DERAILMENT (the foundational inversion):** the machine's E2 (`projectZoneForDay` in shape-brain.ts) computes `keyZonePrice`/`supplyZonePrice`/`demandZonePrice` — EXACT PRICES (E3's job). E3 (the mirror + the refinement machine) consumes those prices directly. The machine is PRICE-ANCHORED, not ZONE-ANCHORED. This single inversion caused the Wednesday/Thursday cascade structure to fail: the E2's price-based designations drifted from the operator's levels, the refinement engine's price-based checks (the week-wide probe, the E2-zone-price reach cap) rejected the operator's valid geometry, and the 3.0 floor killed the borderline trades.

---

# PART 1 — THE VERBATIM TRADE-BY-TRADE MECHANICS (the complete extraction)

## 1.1 EU #1 — Mon SHORT (Swing Scalp): E 1.14395 / SL 1.14485 / TP 1.14110 / R3.18

**The analysis (verbatim):** "1H supply zone at 1.14460 - 1.14530 ~ using this as the SL zone anchor ~ LQZ at 1.1444 - 1.14395 ~ using this as the entry zone anchor. 1H MoM demand zone at 1.14149 - 1.14000 w/ nested LQZ at 1.14110 to 1.14020 - this will be the TP edge for the trade."
**The macro narrative:** "1H Refined 4H supply zone at 1.14475 - 1.14625 anchored to Jun 22 OB candle(s) that price has reacted to on Jul 2 (Stops the bullish BS - pierces through w/ a wick but candle body closes inside the bottom half of this supply zone and causes a bearish Recovery) and on Jul 3 (Whiplash move attempts to pierce this zone. Also candle body closes within the bottom half of this zone and starts a bearish Recovery move that will likely dissipate into SS now that SS/BS/R/WL chain has just completed)."
**Entry set #2:** "LQZ shield beneath this supply zone and this supply zone as SL anchor. This 1H supply zone is now nested supply within a 1H refined 4H supply OB - strong pressure confirmed, Bullish BS/WL chain just defeated at this zone, Reversal/Reaction from this pressure wall is confirmed for coming week."

**THE MECHANICS:**
- **E** = the LQZ's near edge (1.14395 — the LQZ [1.1444-1.14395]'s near edge from above for the SHORT). The alternative entry set = the LQZ SHIELD beneath the supply zone.
- **SL** = the supply zone as the SL anchor (1.14485 — INSIDE the supply zone's band [1.14460-1.14530]).
- **TP** = the opposing demand zone's NESTED LQZ (1.14110 — the near edge of the nested LQZ [1.14110-1.14020] inside the MoM demand [1.14149-1.14000]).
- **The pressure context:** the supply is a 1H-refined-4H supply (nested) — strong pressure — the reversal is confirmed by the chain completion.

## 1.2 EU #2 — Mon LONG (Whiplash): E 1.14110 / SL 1.13990 / TP 1.14460 / R2.92

**The analysis (verbatim):** "1H Unmitigated MoM Demand zone at 1.14145 - 1.14000 from Thursday's Breakout Surge. This UM MoM zone of the BS is also simultaneously the UM BoM zone of the Whiplash move that was the 2nd leg of Thursday's breakout surge and precedes the actual whiplash move that happened on Friday. This is clearly an area of strong pressure + bullish liquidity... There is likely to be a reaction from this zone as the opposing bearish pressure is not yet strong enough to pierce it. The supply zone that began the previous SS Short that hits TP at this zone hat not yet been mitigated. Obvious pressure mechanics logical reasoning concludes a reaction from this Demand zone will drive price to the BoM supply zone at 1.1453 - 1.14460 providing the pressure and liquidity needed to mitigate the supply zone the bearish BS will begin from. This follows the shape chain forming of SS → BS... Set E at the TP level of trade #1, SL 3 pips outside the far edge of the nested liquidity zone that sits inside this demand at 1.14110 - 1.14020, and set TP at the near edge of the supply zone. Easy SS reversal trade. Trade #1 literally sets this up and all the macro storyline confluences align and make this a logical no brainer."

**THE MECHANICS:**
- **E** = the TP of trade #1 (1.14110 — the chaining, Law 27).
- **SL** = "3 pips outside the far edge of the nested liquidity zone that sits inside this demand at 1.14110 - 1.14020" → the nested LQZ's far edge (1.14020) − 3p = **1.13990**.
- **TP** = "the near edge of the supply zone" (the BoM supply [1.1453-1.14460]'s near edge) = **1.14460**.
- **The pressure read:** the demand is UM MoM-of-the-BS + UM BoM-of-the-Whiplash — strong pressure + bullish liquidity. The reaction is "logical no brainer."

## 1.3 EU #3 — Tue SHORT (Breakout Surge): E 1.14460 / SL 1.14560 / TP 1.14020 / R4.4

**The analysis (verbatim):** "Trade 2 completed, macro storyline shows bearish market reversal from this point, 1H supply matches the element of 1H demand, and this is BoM so high pressure aligns with confluences. Logic of the shape chain flows - this is an obvious setup likely with Liquidity Rocket/Liquidity Ladder Reinforcement... Since Trade #2 already mitigated this zone and reacted from the close edge of the LQZ on the SS move, and this is a BS move - we can set TP at the far edge of the LQZ as this is expected to either pierce or deep mitigate."
**The RL reinforcement:** "The liquidity shield that sits right in front of the BoM supply is highly likely to be retested now that the bearish BS has started as a final liquidity sweep before the full piercing move happens."

**THE MECHANICS:**
- **E** = 1.14460 (the supply — "this is BoM so high pressure aligns with confluences").
- **SL** = 1.14560.
- **TP** = "the far edge of the LQZ as this is expected to either pierce or deep mitigate" → **1.14020** — the STRONG zone (BoM) + the BS pierce → the FAR edge.
- **The pressure read:** BoM + the element match (1H supply = 1H demand) + the BS shape → high pressure.

## 1.4 EU #4 — Wed LONG (Recovery): E 1.14020 / SL 1.13970 / TP 1.14295 / R5.5

**The analysis (verbatim):** "Since SS/BS/R/WL is the most common shape chain, and SS/BS just completed in the last 3 trades, along with the fact that this MoM Demand zone is now 2x mitigated as an area of strong bullish pressure + the fact that zones usually fail on the THIRD mitigation - it is plausible that a minor recovery will happen here as the BS hits TP and pierce through on the NEXT (Third) mitigation of this zone. So we can scalp the recovery and pocket some easy cash. A 1H MoM supply zone has formed at 1.14295 - 1.14220 during the BS which is an obvious reaction point for the WL shape that will likely pierce through this zone - so an obvious trade is a quick long with E sitting at the TP of the BS, SL 3 pips outside the far edge of the DEMAND ZONE that is being contexted (liquidity has been absorbed so now let us only use the LQZ as an E anchor and set the SL based on the DEMAND zone instead of the LQZ to ensure we are safe from the potential wicks/volatility as all the bullish pressure from the demand zone is absorbed) and we can set TP at the FAR EDGE of the MoM supply zone. Because this is a virgin MoM zone that DOES NOT have strong prior pressure like this Demand Zone did, it is likely that this will be fully mitigated before the reaction happens. There is a liquidity shield in front of it at 1.14195 - 1.14225 as well as behind it at 1.14265 - 1.14300. Likely the front LQ shield will get pierce and the rear LQZ will be fully swept before the move begins... So we will set TP at the far edge. If the zone was stronger and obviously had more pressure, we would set TP at the close edge."

**THE MECHANICS:**
- **E** = the TP of the BS (1.14020 — the chaining).
- **SL** = "3 pips outside the far edge of the DEMAND ZONE" (NOT the LQZ — the absorption switch) → the demand's far edge (1.14000) − 3p = **1.13970**. The reason: "liquidity has been absorbed so now let us only use the LQZ as an E anchor and set the SL based on the DEMAND zone instead of the LQZ... as all the bullish pressure from the demand zone is absorbed."
- **TP** = "the FAR EDGE of the MoM supply zone" (1.14295) — the WEAK zone (virgin MoM, no strong prior pressure) → the FAR edge (fully mitigated before the reaction).
- **The conditional:** "If the zone was stronger and obviously had more pressure, we would set TP at the close edge."
- **THE ZONE-RELEVANCE SWITCH:** the SL anchor moves from the LQZ to the DEMAND zone when the LQZ's liquidity is absorbed — the operative defense is a pressure-state function.

## 1.5 EU #5 — Wed SHORT (Whiplash): E 1.14295 / SL 1.14330 / TP 1.14000 / R8.43

**The analysis (verbatim):** "Trade #4 played out perfectly, recovery reaches the MoM supply zone - set E at the TP of trade #4, SL 3 pips outside the far edge of the real LQZ, and set TP at the far edge of the strong demand zone that has held for the entire week so far as this will either get pierced or hold as a fortress zone through deep mitigation. Either way this is about to be mitigation #3 of this demand zone and #2 already deeply mitigated + shape chain is a bearish whiplash imminent, there is low probability that price will react from the close edge here so lets maximize TP."

**THE MECHANICS:**
- **E** = the TP of trade #4 (1.14295 — the chaining).
- **SL** = "3 pips outside the far edge of the real LQZ" → **1.14330**.
- **TP** = "the far edge of the strong demand zone" (1.14000) — the STRONG zone (held all week, 2x deep-mitigated, the fortress candidate) + the deep mitigation expected → the FAR edge to MAXIMIZE ("there is low probability that price will react from the close edge here so lets maximize TP").
- **THE STRENGTH-EDGE RULE:** the strong zone + the deep-mitigation/pierce expected → the FAR edge (maximize). The weak zone → the far edge (fully mitigated). The strong + near-instant reaction → the close edge.

## 1.6 EU #6 — Wed LONG (RWL/BS): E 1.13935 / SL 1.13850 / TP 1.14475 / R6.35

**The analysis (verbatim):** "There is a very clear Whiplash Storm happening on the 15m timeframe - bearish pressure is trying to pierce, bullish pressure is not letting it... the MoM demand zone though heavily mitigated has still NOT YET BEEN BROKEN... this 'break of structure' could be a false positive as looking purely at E1 pressure mechanics, this ZONE has not yet been broken... the market structure is still BULLISH at the macro level... Also the Bearish BS from Tuesday was extremely weak compared to the Bullish BS from Thursday. Bullish pressure is definitively stronger... Looking left to see what relevant LQZs exist beneath this demand, one is clearly visible at 1.13935 - 1.13875 from the candles of Jun 29 - Jun 30 w/ obvious wicks + flat body edges reacting to this zone. This seems like the deep liquidity that is being fought over. The BoM demand zone that began Thursday's bullish BS is sitting right beneath this LQZ at 1.13885 - 1.13815 and if I zoom out to the 4H chart I can see that this is also CLEARLY a 4H bullish OB refined on the 1H so this is VERY OBVIOUSLY an area of EXTREME BULLISH PRESSURE - this LQZ is the LQ shield of the BoM 4H bullish OB... this LQ shield likely will not get deeply mitigated. So lets use this as the entry zone and set SL 2.5-3 pips outside the far edge of the LQZ... the TP would be at the original 1H refined 4H BoM zone that began Tuesday's bearish BS."

**THE MECHANICS:**
- **E** = the LQ SHIELD (1.13935 — the LQZ [1.13935-1.13875]'s edge, the LQ shield of the BoM 4H demand) — "this LQ shield likely will not get deeply mitigated. So lets use this as the entry zone."
- **SL** = "2.5-3 pips outside the far edge of the LQZ" → **1.13850**.
- **TP** = "the original 1H refined 4H BoM zone that began Tuesday's bearish BS" → **1.14475** — the structurally-correct opposing BoM supply.
- **THE BREAK-VALIDATION:** the "break of structure" is a false positive (the zone not yet broken) → the macro structure is still bullish → the RWL/BS from the deep demand.

## 1.7 EU #7 — Thu LONG (WL): E 1.14225 / SL 1.14165 / TP 1.14555 / R5.5

**The analysis (verbatim):** "0.786 LQZ already provided a strong reaction... Lets set the entry at the next LQZ rung up from this on the ladder - which is the same Fib 1 LQZ that we set as our stop-limit target during the FLR reinforcement... Let's set E through this zone but put more emphasis on the middle and back as its unlikely the whiplash moves fully from a hairpin touch on the forward edge... SL 1.5 pips inside the next LQZ rung down just to be safe. 3 pips is not necessary since that zone is only 3 pips wide - we will to 1-1.5 pips. 1 pip makes R 5.8 and 1.5 makes it 5.27. Either one works. If we want to maximize R set it 1 pip inside for 5.8 from back edge."

**THE MECHANICS:**
- **E** = "the next LQZ rung up from this on the ladder" (1.14225 — the LQZ rung [1.14265-1.14300]'s middle/back emphasis).
- **SL** = "1.5 pips inside the next LQZ rung down" (1.14165) — **THE NEXT-STEP RULE with the zone-width judgment**: "3 pips is not necessary since that zone is only 3 pips wide — 1-1.5 pips." The SL at 1 pip inside → R5.8; at 1.5 pips → R5.27. "Either one works. If we want to maximize R set it 1 pip inside."
- **TP** = "the 1.618 level sits directly inside the target BoM supply zone middle. This is a good point to target for TP" (1.14555 — the fib confluence inside the BoM supply).
- **THE CONFIDENCE JUDGMENT:** the RR-vs-safety tradeoff is EXPLICIT — the operator chooses the RR-maximizing SL when the zone geometry allows it.

## 1.8 EU #8 — Fri SHORT (RWL): E 1.14555 / SL 1.14540 / TP 1.14165 / R4.59

**The analysis (verbatim):** "Since the TP of trade #7 is at a BoM supply that previously caused a BS - it is likely there will be a sharp reaction once it is mitigated deeply enough. WL → RWL is a common shape chain for market reversals, there have now been 2 major bullish shape chains in the last 2 weeks - macro storyline reasons that bullish pressure has now dissipated... This will also now be mitigation #5 of this supply zone - since it has not been pierced or broken in 4 prior mitigations (with mitigations 3 + 4 being weak mitigations. Barely touching the close edge before being slapped down sharply) this supply zone is likely to become a fortress zone and NOT get pierced. WL → RWL is very likely now - multiple confluences support it. We can set E at the 1.618 level that was TP of trade #7 and put SL 2 pips inside the LQZ at 1.14660 - 1.14620 that also happens to anchor perfectly to 1.786. TP we can set at the 0.618 level as it matches the wormhole mechanics having the trade begin from 1.618."

**THE MECHANICS:**
- **E** = the TP of trade #7 (1.14555 — the chaining).
- **SL** = "2 pips inside the LQZ at 1.14660 - 1.14620" → **1.14540**.
- **TP** = "the 0.618 level" (1.14165 — the wormhole mechanics).
- **THE FORTRESS READ:** mitigation #5 of the supply (4 prior non-pierced, mitigations 3+4 weak) → the fortress candidate → RWL.

## 1.9 THE GU TRADES (the kept cascade — OANDA data)

| # | Day | Dir | E | SL | TP | RRR | The cascade source |
|---|-----|-----|---|---|----|-----|-----|-------------------|
| 1 | Mon | Long | 1.33330 | 1.33250 | 1.33965 | 8.94 | the EU Mon LONG kept |
| 2 | Tue | Short | 1.33965 | 1.34065 | 1.33330 | 6.35 | the EU Tue SHORT kept (the chaining: E = GU-1's TP 1.33965) |
| 3 | Wed | Short | 1.33660 | 1.33740 | 1.33275 | 4.81 | the EU Wed SHORT kept |
| 4 | Wed | Long | 1.33280 | 1.33190 | 1.34270 | 11 | the EU Wed LONG kept |
| 5 | Thu | Short | 1.34260 | 1.34365 | 1.33850 | 3.9 | the GU's own storyline continuation |
| 6 | Thu | Long | 1.33850 | 1.33760 | 1.34500 | 7.22 | the EU Thu LONG kept |
| 7 | Fri | Short | 1.34500 | 1.34625 | 1.33960 | 4.32 | the EU Fri SHORT kept |

**The GU Mon SHORT (the missing trade):** the operator REJECTED it on RRR (~2R — "the equivalent setup was too low RRR to be worth taking") + the Friday-close rule. The machine's GU Mon SHORT at RRR 4.62 (the D37 fix) — the operator would take it at that RRR (the 2.5 floor makes it valid).

---

# PART 2 — THE FORMAL E/SL/TP MECHANIC SPEC (the rules the code must implement)

## 2.1 THE ENTRY (E) — the E1-pressure-driven choice

**RULE E1 — the entry = the entry zone's LQZ near edge** (the first contact):
- For a SHORT at a supply zone: the LQZ's near edge from above (the lower edge).
- For a LONG at a demand zone: the LQZ's near edge from below (the upper edge).
- The mechanism: find the E2-designated zone → its internal LQZ rung (fully inside the zone) → the entry = the rung's near edge.

**RULE E2 — the chaining (Law 27):** the entry = the prior trade's TP. "TP OF ONE = ENTRY OF NEXT." The operator's #2/#4/#5/#8 + the GU-2 all chain.

**RULE E3 — the LQ shield as the entry:** when the LQZ in front of the S/D zone is the realistic entry (the shield "likely will not get deeply mitigated"), the entry = the shield's edge (#6).

**RULE E4 — the E1 pressure decides when multiple nested LQZ / LQ shields exist:** the entry is the MOST REALISTIC first contact — the one the price will actually react at — chosen by the pressure state (the shield's absorption, the nested rung's strength, the operative defense).

## 2.2 THE SL — the relevant-zone edge rule + the confidence judgment

**RULE S1 — the primary: 3 pips outside the back edge of the RELEVANT zone:**
- The RELEVANT zone = the operative defense (the E1 pressure state): the LQZ if its fuel is INTACT; the S/D zone if the LQZ's fuel is ABSORBED (the #4 switch).
- For a SHORT: the back edge = the zone's TOP + 3 pips. For a LONG: the back edge = the zone's BOTTOM − 3 pips.
- The evidence: #2 (the nested LQZ's far edge − 3p = 1.13990), #5 (the LQZ's far edge + 3p = 1.14330), #4 (the DEMAND zone's far edge − 3p = 1.13970 — the absorption switch), #6 (the LQZ's far edge − 2.5-3p = 1.13850), #1 (the SL inside the supply zone — the S/D as the SL anchor).

**RULE S2 — the alternative: 1-2 pips inside the close edge of the NEXT RUNG OUT** (when the next rung is tight):
- The operator's #7: "SL 1.5 pips inside the next LQZ rung down... 3 pips is not necessary since that zone is only 3 pips wide — 1-1.5 pips." The next rung's close edge (the edge nearest the entry) ∓ 1-2 pips.
- The judgment: when the 3p-outside would land past the next rung (or the next rung is only a few pips wide), use 1-2 pips inside its close edge instead.

**RULE S3 — the confidence judgment (the operator's discretion):**
- The lower-confidence setups → default to SAFETY (the wider option / the next-rung option).
- The higher-confidence setups → default to RR (the tighter option).
- The operator's #7: "1 pip makes R 5.8 and 1.5 makes it 5.27. Either one works. If we want to maximize R set it 1 pip inside for 5.8" — the RR-vs-safety tradeoff is an explicit per-trade decision.

**RULE S4 — the SL zone anchor = the S/D when it's the relevant defense:** #1's "1H supply zone... using this as the SL zone anchor" — the SL sits within/at the supply zone's band.

## 2.3 THE TP — the structurally-correct opposing zone + the strength-driven edge

**RULE T1 — the TP target = the structurally-correct opposing zone:**
- The E2-projected opposing zone (the zone the shape will reach).
- The MoM→BoM extension ("extend TP from MoM to BoM. Nice it adds an extra 2 R").
- The opposing zone's internal LQZ (the Earth+Fire): #1's "the nested LQZ at 1.14110 to 1.14020 - this will be the TP edge."
- The evidence: #6's TP at "the original 1H refined 4H BoM zone that began Tuesday's bearish BS" (1.14475).

**RULE T2 — the edge = the strength-driven choice:**
- **The STRONG zone (BoM, high confluence, fortress) + the deep-mitigation/pierce expected → the FAR edge** (maximize the catch): #3 ("we can set TP at the far edge of the LQZ as this is expected to either pierce or deep mitigate" → 1.14020), #5 ("set TP at the far edge of the strong demand zone... there is low probability that price will react from the close edge here so lets maximize TP" → 1.14000).
- **The WEAK zone (virgin MoM, low pressure) → the FAR edge** (fully mitigated before the reaction): #4 ("we can set TP at the FAR EDGE of the MoM supply zone. Because this is a virgin MoM zone that DOES NOT have strong prior pressure... it is likely that this will be fully mitigated before the reaction happens" → 1.14295).
- **The strong zone + the near-instant reaction → the CLOSE edge** (+ the 1-2 pip spread to not miss the exit): #2 ("set TP at the near edge of the supply zone" → 1.14460), #4's conditional ("If the zone was stronger and obviously had more pressure, we would set TP at the close edge").
- The mechanism: classify the opposing zone's pressure (BoM/FORTRESS/confluence ≥ 8 = STRONG; virgin MoM/low confluence = WEAK; else MIDDLE) → the STRONG + the deep-mitigation context → the FAR edge; the STRONG + the near-instant context → the CLOSE edge + the spread; the WEAK → the FAR edge.

**RULE T3 — the TP at the opposing zone's internal LQZ** (the Earth+Fire — the level the move reacts at).

---

# PART 3 — THE DERAILMENT FORENSICS (the exact code paths + the Wednesday failure trails)

## 3.1 THE E2 PRICE EMISSION (the foundational deviation)

**The evidence (shape-brain.ts):**
- :1002-1004 — the ShapeDayZone interface carries `keyZonePrice: number; supplyZonePrice?: number; demandZonePrice?: number`.
- :1465 — `const keyZonePrice = entryRung ...` — E2 computes the ENTRY PRICE (the internal rung's near edge — the §8.1 anchor union).
- :1478 — `supplyZonePrice: supplyPick ? zoneCenter(supplyPick) : undefined` — E2 computes the supply's price.

**The consumer (mirror.ts):**
- :1480 — `shapeDay.keyZonePrice.toFixed(5)` — the mirror reads the E2's price directly as the entry.
- :2984 — "keyZonePrice (the internal-LQZ rung's near edge — the level the day's..." — E3 uses the E2's price.

**The refinement machine (refinement-machine.ts):**
- :459-470 — `e2ProjectedPrice(input)` returns `sd.demandZonePrice`/`sd.supplyZonePrice` — the E2's price used as the "projected reach."

**THE FIX:** E2 emits the zone IDs only. E3 computes the prices from the zones. The ShapeDayZone's price fields are REMOVED (or marked unused); the mirror + the refinement consume the zone IDs + the zones' geometry.

## 3.2 THE WEDNESDAY FAILURE — the exact trail

**The operator's Wednesday EU trades:** #4 LONG 1.14020/1.13970/1.14295 (R5.5) · #5 SHORT 1.14295/1.14330/1.14000 (R8.43) · #6 LONG 1.13935/1.13850/1.14475 (R6.35).

**The machine's Wednesday EU mirrors:** E 1.14291, SL 14.6p (1.14437), TP 42.1p (1.13870) → RRR 2.9 (the SHORT) + E 1.14291, SL 10.7p, TP 28.9p → RRR 2.7 (the LONG).

**The refinement trails (verbatim from the report):**
- "[SL] the SL 1.14387 sits inside the shape's expected probe 1.14460 (LMV week candle touch of the anchor band 2026-07-07) — the E2 says price will reach 1.14460 → HOW: the SL must sit beyond the probe + the Law-7 buffer (≥ 1.14480)" — **THE PROBE CHECK rejected the tight SLs (the operator's 1.14330 would also be rejected — it's below 1.14460).**
- "[TP] the TP 1.14580 extends past the shape's projected reach — the E2 says the move stops at 1.14303 (Wednesday PBS) → HOW: the TP must sit at/inside 1.14303" — **THE REACH CHECK rejected the TPs past the E2's designated-zone price (the operator's 1.14475 and 1.14460 TPs would be rejected).**
- "[SL] the SL 1.14184 sits 5 zones past the nearest structural defense... the E1 pressure between is undefended — the entry is wrong, not the SL" — **THE ZONE-DISTANCE CHECK rejected the wider SLs.**
- The final: "HARD-REJECT — all anchors locked [E 1/3🔒 · SL 3/3🔒 · TP 3/3🔒] — RRR 2.9 < 3.0" — **THE 3.0 FLOOR (should be 2.5) + all candidates rejected by the mis-calibrated checks.**

**THE FAILURE MECHANISM:**
1. The E2's Wednesday demandZonePrice (1.13911/1.14014) is used as the TP's reach cap → the TPs past it (the operator's 1.14000, 1.14475) rejected.
2. The week-wide probe (1.14460) forces the SL beyond it (≥1.14480) → the operator's tight SLs (1.14330, 1.13970) rejected.
3. The zone-distance check rejects the wider SLs.
4. With the forced-wide SL + the capped TP, the RRR maxes at 2.6-2.9 < 3.0 → HARD-REJECT.

**THE FIX:** delete the three checks. The refinement generates the operator's exact mechanics: the SL at the relevant zone's edge rule (3p outside / 1-2p inside the next rung), the TP at the structurally-correct zone's strength-driven edge, the floor 2.5.

## 3.3 THE OTHER DERAILMENTS

- **The RRR floor 3.0** (trading-constants.ts:150-155, all categories 3.0) — the operator's doctrine: 2.5 valid-if-high-probability, 4R+ target.
- **The fill model** (27 NOT_TRIGGERED) — the session-bracket expires before the pair's reaction.
- **The Wednesday/Thursday structure missing** — the chained/emergent trades (the EU #4/#5/#6, the GU #3/#4/#5/#6) don't emit at the operator's levels.
- **The E2's Wednesday designation drift** — the machine's Wednesday EU designation was supply 1.14249/demand 1.13911 (close to the operator's levels) but the mirror's entry was 1.14291 (Δ4.6p off the designation) — the construction drifted off the E2's zone anchor.

---

# PART 4 — THE CURRENT CODEBASE STATE (the file:line map the next build works from)

| File | Lines | The role | The ZR-6 change |
|------|-------|----------|----------------|
| `src/brains/shape-brain.ts` | 2,157 | E2 — projectZoneForDay (:1101), the DayBand, the day-reachability | ZR-6A: strip the price computation; emit the zone IDs |
| `src/mdve/mirror.ts` | 3,185+ | E3 — cascadeV45 (:3009), reAnchorMirror (:2548), selectPairNativeZone (:1362 with the E2 exact-match :1429), computeLmvTP (:2220), structuralOpposingLqz (:2142), computeGoldenSL_V452 (:1891) | ZR-6B: compute the prices from the zones |
| `src/mdve/refinement-machine.ts` | 1,740 | E3 — refineSetup (:808), tpCandidates (:494), slCandidates (:555), checkTpCandidate (:616), checkSlCandidate (:677), e2ProjectedPrice (:462), the probe check (:700-714), the zone-distance check (:692-698) | ZR-6C: DELETE the three checks; the candidate generation = the verbatim mechanics; the floor 2.5 |
| `src/mdve/zone-pressure.ts` | 287 | E1 — computeOperativeDefense, the pressure states | KEEP (the #2/#4 SL-switch machinery) |
| `src/mdve/trade-chaining.ts` | 282+ | E3 — the Law-27 chaining | KEEP + extend (the full EU 8/GU 7 structure) |
| `src/mdve/setup-gen.ts` | 1,353 | E3 — the DXY source lane | KEEP (the DXY 6/6) |
| `src/mdve/sl-lmv.ts` | 317 | **FROZEN** (91294083) | never touched |
| `src/mdve/trade-dedup.ts` | 524 | **FROZEN** (33914c89) | never touched |
| `src/constants/trading-constants.ts` | — | the RRR floors (:150-155 — all 3.0) | ZR-6C: the floor → 2.5 |
| `report-v452.ts` | 874+ | the pipeline entry | the wiring (the chaining, the storylines) |
| `diag-golden-coverage.ts` | 106 | the measurement oracle (the operator's REAL trades — TEMPORARY ARCHITECTURE) | keep |
| `diag-self-validation.ts` | 430 | the Part-30 self-validation | keep |

**The 16 gate diags:** diag-telescoping, diag-lmv-golden, diag-obcv-golden, diag-e2-forward, diag-structural-tp, diag-3d-refinement, diag-review-stage, diag-hallucination, diag-e2-cascade, diag-e1-reintegrated, diag-zone-relevance, diag-storyline, diag-e3-conditional, diag-cascade-propagation, diag-self-validation, diag-golden-coverage — all exit 0 at the current state.

**The determinism baseline:** report b86a7309 ×2 · dist 261343a9.

---

# PART 5 — THE ZR-6 IMPLEMENTATION SPEC (the exact waves, files, functions, changes, acceptances)

## WAVE ZR-6A — E2 ZONE ANCHORS ONLY (shape-brain.ts)

**THE CHANGE:** `projectZoneForDay` (:1101) + `buildDayDecomposition` (:1465) stop computing the price fields.
1. The ShapeDayZone interface (:997-1005): REMOVE (or set to undefined) `keyZonePrice`, `supplyZonePrice`, `demandZonePrice`. KEEP `keyZoneId`, `supplyZoneId`, `demandZoneId` (the zone anchors), `day`, `shape`, `direction`, `floor`/`ceiling` (the DAY BAND — the reach the shape visits, not a price cap), `dayOpenSpot`, `session`, `confidence`.
2. The §8.1 internal-rung entry (:1350, :1426, :1465) — the internal LQZ rung's near edge is NO LONGER computed by E2. E2 emits the ZONE ID; E3 resolves the rung.
3. The DayBand reach: the floor/ceiling stay (the day's projected band — the zones the shape visits). This is the E2's "reach" — a BAND, never a single price cap.
4. The E2's exact-match (mirror.ts:1429): the mirror's entry = E3's resolution of the E2-designated zone (the internal LQZ rung's near edge), NOT an E2 price.

**THE ACCEPTANCE:** the E2's day decomposition carries the zone IDs; the price fields gone; the DXY 6/6 held; the EU Mon SHORT still emits + wins; determinism ×2; the frozen pair byte-identical.

## WAVE ZR-6B — E3 COMPUTES THE PRICES FROM THE ZONES (mirror.ts + setup-gen.ts)

**THE ENTRY (E):**
1. `computeEntryFromZone(model, zoneId, direction)` — the zone's internal LQZ rung's near edge (the first contact). For the chained trades: the entry = the prior TP (the chaining — the E2's day decomposition + the trade-chaining engine provide the chain).
2. The LQ shield entry: when the operative defense (computeOperativeDefense) is SHIELD_FUEL, the entry = the shield rung's near edge.

**THE SL (S1-S3):**
1. `computeSLFromZone(model, entryZoneId, entry, direction, pipValue, confidence)` — the relevant zone's edge rule:
   - The operative defense (computeOperativeDefense) → the relevant zone (the LQZ if SHIELD_FUEL, the S/D if PRESSURE_STRUCTURE).
   - RULE S1: 3 pips outside the relevant zone's back edge (the far edge ∓ 3p).
   - RULE S2: if the next rung out is tight (the 3p-outside lands past its close edge, or the next rung is ≤ ~4p wide), use 1-2 pips inside the next rung's close edge.
   - RULE S3: the confidence judgment — the lower-confidence → safety (the next-rung option), the higher-confidence → RR (the tighter option).
2. The probe check (the week-wide anatomy) is DELETED — the SL is the preceding E1/E2 mechanics at the trade's decision point.

**THE TP (T1-T3):**
1. `computeTPFromZones(model, entry, direction, shapeDay, pipValue)` — the structurally-correct opposing zone:
   - The E2-projected opposing zone (the shapeDay's supplyZoneId/demandZoneId) resolved to the zone.
   - The MoM→BoM extension: if the projected zone is a MoM, extend to the next BoM wall.
   - The zone's internal LQZ (the Earth+Fire).
2. The strength-driven edge (classifyZoneStrength): the STRONG + the deep-mitigation/pierce context → the FAR edge; the STRONG + the near-instant context → the CLOSE edge + the spread; the WEAK → the FAR edge.
3. The reach check (the E2-zone-price cap) is DELETED — the TP maps to the structurally-correct ZONE.

**THE ACCEPTANCE:** the EU Mon SHORT at the operator's level (1.14395 ±3p); the Wednesday trades emitting at the operator's levels; the DXY 6/6 held; the GU Mon still wins.

## WAVE ZR-6C — THE REFINEMENT ENGINE REBUILD (refinement-machine.ts + trading-constants.ts)

**THE CHANGES:**
1. DELETE `checkTpCandidate`'s reach check (:616-636 — the `e2ProjectedPrice` cap).
2. DELETE `checkSlCandidate`'s probe check (:700-714 — the week-wide probe).
3. DELETE/recalibrate `checkSlCandidate`'s zone-distance check (:692-698 — the "N zones past" — the ladder-step SLs are legitimate).
4. DELETE `e2ProjectedPrice` (:459-470) — the E2's price is gone.
5. The candidate generation = the verbatim mechanics (Part 2): the entry at the internal LQZ near edge, the SL at the relevant-zone edge rule (with the confidence judgment), the TP at the structurally-correct zone's strength-driven edge.
6. The RRR floor → 2.5 (trading-constants.ts:150-155 — all categories 2.5; MIN_RRR_CONSTRUCTION 2.5; CHAIN_MIN_RRR_SUPPLEMENTARY 2.5). The target 4R+ (the machine prefers the candidate maximizing RRR toward 4+, never the first that barely clears the floor).
7. The rejections fire ONLY on the genuine violations: the same-side TP/SL, the off-zone entry, the direction-insane geometry.

**THE ACCEPTANCE:** the Wednesday EU trades refine to the operator's geometry (R5.5/8.43/6.35 territory); the 2.7/2.9 trades pass (≥2.5); the DXY lane held; determinism ×2.

## WAVE ZR-6D — THE CASCADE STRUCTURE (the chaining + the emergent trades)

**THE CHANGE:** the trade-chaining engine (trade-chaining.ts) + the mirror lane produce the operator's full EU 8 + GU 7 structure:
1. The chaining (Law 27): the Mon SHORT → the chained Mon LONG (#2); the Tue BS (#3) → the Wed LONG (#4) → the Wed SHORT (#5) → the Wed LONG (#6); the Thu WL (#7) → the Fri RWL (#8).
2. The cascade: the DXY→EU inverse (the EU mirrors) + the EU→GU kept (the GU mirrors) at the operator's levels.
3. The multi-trade days (the Wednesday triple) — the per-zone direction + the distinct zones.

**THE ACCEPTANCE:** the EU 8 + the GU 7 at the operator's levels; the golden measurement climbs toward 15/15.

## WAVE ZR-6E — THE FILL MODEL

**THE CHANGE:** the session-bracket must cover the pair's actual reaction time (the 27 NOT_TRIGGERED). The fill model's activation = max(session start, battleMs); the expiry = the trade-day's 21:00Z. The fix: the bracket must match the E2-designated session for the pair's reaction (the London/NY session windows the operator's analysis uses).

**THE ACCEPTANCE:** the NOT_TRIGGERED count drops; the winning trades fill.

---

# PART 6 — THE VALIDATION PROTOCOL (every wave)

1. `npx tsc --noEmit` — exit 0.
2. `bun build src/index.ts --outdir dist --target bun` — exit 0.
3. `bun report-v452.ts` + `sha256sum report_v452.md` ×2 (the determinism — the NEW baseline recorded).
4. `bun diag-golden-coverage.ts` — the 3-pip count vs the operator's REAL trades (the TEMPORARY ARCHITECTURE const).
5. The wave's gate diag (the 16 existing + any new) — exit 0.
6. `sha256sum src/mdve/sl-lmv.ts src/mdve/trade-dedup.ts` — the frozen pair byte-identical.
7. The checkpoint (`Checkpoints/v4.5.2_ZR6_{WAVE}/`) with the MANIFEST + the report + the gate outputs + the DIFF REVIEWS.

**THE FINAL ACCEPTANCE:** the EU 8 + the GU 7 at the operator's REAL levels at ≤3p (the golden measurement 15/21+ toward 15/15) · the Wednesday trades at the operator's geometry (R5.5/8.43/6.35) · the DXY 6/6 held · the DXY lane all-winning · determinism ×2 · the frozen pair byte-identical · all gates green · the self-validation passes.

---

# PART 7 — THE DO-NOT LIST + THE FROZEN LIST

**THE DO-NOTs:**
- Do NOT let E2 emit prices (the ShapeDayZone's price fields are the derailment).
- Do NOT use the week-wide probe as an SL check (the SL is the preceding E1/E2 mechanics at the trade's decision point).
- Do NOT cap the TP at the E2's designated-zone price (the MoM→BoM extension is doctrine).
- Do NOT use the 3.0 floor (2.5 valid-if-high-probability, 4R+ target).
- Do NOT re-open the frozen pair.
- Do NOT touch the fib (the Air — E4, deferred until the foundations are bulletproof).
- Do NOT hardcode the golden levels into the pipeline (the diag's const is the measurement oracle ONLY).
- Do NOT re-litigate settled doctrine — quote it (D13).
- Do NOT do the output-only audit (the ORCHESTRATOR PRINCIPLES — the diff review of EVERY changed line).

**THE FROZEN LIST:**
- `src/mdve/sl-lmv.ts` (912940832fac44bc838d53423cbb921eff501de60a9f2641bf20c1d1497eaeab) — FROZEN.
- `src/mdve/trade-dedup.ts` (33914c897e7775402eefd7d13a5d3675667a2ace576b55a689bc864401a680e4) — FROZEN.
- The v4.5.1_LIVE_MARKET_CAPABLE checkpoint — LOCKED IMMUTABLE.

---

# PART 8 — THE READING ORDER (the fresh agent's entry)

1. `MASTER_CONTEXT/PLUTUS_E3_ANCHOR_ENGINEERING_SPEC.md` (THIS document — the anchor).
2. `MASTER_CONTEXT/Golden_Operator_Trade_Feedback_EU_GU.md` (the oracle — the trades + the reasoning).
3. `MASTER_CONTEXT/PLUTUS_E1_E2_E3_MACRO_CONTEXT.md` (1004L — the fundamental law).
4. `MASTER_CONTEXT/NON_NEGOTIABLE_ORCHESTRATOR_PRINCIPLES.md` (501L — the audit discipline).
5. `MASTER_CONTEXT/PLUTUS_ARCHITECTURE_BIBLE_4.5.md` (3,040L) + `PLUTUS_ARCHITECTURE_BIBLE_4.0.md` (4,504L).
6. `MASTER_CONTEXT/PLUTUS_V4.5.2_NEXT_BUILD_SPEC.md` (293L).
7. `MASTER_CONTEXT/PLUTUS_V4.5.2_OVERHAUL_FULL_BUILD_REPORT.md` (1,039L) + `PLUTUS_V4.5.2_OVERHAUL_DEBUG_LOG.md` (1,080L).
8. The 9 canon docs in `context_management/`.

**THE PROOF-OF-CONTEXT (the 5-line summary before any code):** (1) the mission — ZR-6: the E3 anchor corrective (the operator's gold-standard E/SL/TP logic programmed correctly); (2) the state — DXY 7W/0L + golden 6/6; EU 2W/0L; GU 1W/2L; golden 9/21 vs the REAL trades; the derailment = the E2 price emission + the refinement checks; (3) the anchor + frozen — v4.5.2_FOUNDATION_SOLID; sl-lmv 91294083 + trade-dedup 33914c89; (4) the root concept — E2 emits zone anchors only, E3 computes the prices from the zones per the verbatim spec, the refinement repairs the anchors per the E1/E2 mechanics; (5) the first wave + the first file — Wave ZR-6A — shape-brain.ts (strip the E2 price computation).

---

*END OF THE E3 ANCHOR ENGINEERING SPEC — the complete verbatim mechanics, the forensics, the codebase map, the ZR-6 implementation spec, the validation protocol. The next session executes ZR-6A → ZR-6E from this document alone. Doctrine is QUOTED, never synthesized.*

---

# PART 9 — THE DERAILMENT-PROOFING ADDENDUM (the gaps closed — 2026-08-04)

## 9.1 THE CONFIDENCE JUDGMENT (RULE S3) — THE MECHANICAL PROXY

The operator's SL judgment: "Lower confidence setups - default to safety. Higher confidence setups - default to RR." The machine needs a MECHANICAL confidence proxy — never a model guess. THE PROXY (the E1/E2 data only):

```
confidence = base 0.5
  + 0.2 if the E2 shapeDay's confidence >= 0.65 (the chain's confidence)
  + 0.15 if the contested zone's lifecycle is VIRGIN/ACTIVE_1 (the fresh defense)
  + 0.15 if the contested zone's absorption is INTACT (the fuel not eaten)
  + 0.1 if the storyline's strengthComparison verdict matches the trade direction
  - 0.2 if the contested zone is DEPLETED or the absorption is ABSORBED
clamp to [0, 1]

RULE S3 MECHANICAL: confidence >= 0.6 → the RR-tight option (the 3p-outside-back-edge);
confidence < 0.6 → the safety option (the 1-2p-inside-next-rung when available, else the
wider of the two valid placements). The operator's #7 (the explicit RR choice) fired at
high confidence (the fib + the pressure + the structure all aligned).
```

## 9.2 WAVE ZR-6D — THE FULL EU 8 / GU 7 STRUCTURE (the exact mechanism)

The operator's EU 8 is NOT 8 independent DXY mirrors — it is the DXY-cascade mirrors + the CHAINED reactions + the pair's own structure. THE MECHANISM:

1. **The DXY source lane** emits the 6-7 DXY primaries (already working — the DXY 6/6).
2. **The EU mirrors** = the DXY→EU inverse for each DXY primary (the cascadeV45 — already working, but the E3 anchors must be the verbatim mechanics from PART 2).
3. **The EU chained trades** = for EVERY emitted EU trade with a clear TP, the chained reaction (Law 27): the entry = the TP, the direction = opposite, the SL/TP per the verbatim mechanics. The chain can be 2-3 deep (the operator's #1→#2, #3→#4→#5, #7→#8). The trade-chaining engine (trade-chaining.ts) exists — EXTEND it to generate the full chain from every primary.
4. **The GU mirrors** = the EU→GU kept (the EU mirrors → the GU mirrors at the GU's own zones — the kept direction). The GU Mon SHORT is the operator's REJECTED trade (RRR ~2R) — but the machine's GU Mon SHORT at RRR 4.62 (the D37 fix) is VALID per the 2.5 floor.
5. **The GU chained trades** = the chaining on the GU lane (the GU-2's E = the GU-1's TP — already verified in the operator's data).
6. **The multi-trade days** (the Wednesday triple): the per-zone direction (the supply → SHORT, the demand → LONG — the same day, 3 trades, 3 zones) — the E2's dual-side designation + the chaining produce the structure.

**THE KEY: the chaining runs on the EMITTED trades (the primaries + the mirrors), and the chained trades re-enter the emission (deduped against the primaries). The chain extends until the RRR floor or the week's end.**

## 9.3 WAVE ZR-6E — THE FILL MODEL (the exact mechanism)

The 27 NOT_TRIGGERED: the fill bracket (activation = max(session start, battleMs); expiry = the trade-day's 21:00Z) expires before the pair's reaction. THE FIX:

1. The activation must use the E2-DESIGNATED session for the trade's day (the shapeDay's session — the session the shape ACTUALLY reacts in, per the day-reachability). The battleMs is the anchor's FORMATION time — WRONG for the activation (the formation can predate the week). The activation = the E2-designated session's start on the trade day.
2. The expiry must be the NEXT day's session start (the trade can react the next day — the operator's #7 filled Thursday NY, the #8 filled Friday). The 21:00Z same-day expiry kills the next-day reactions.
3. The verification: the NOT_TRIGGERED count must drop to ~0 for the trades the operator's analysis says filled.

## 9.4 THE PER-WAVE VERIFICATION BATTERY (inline — the next session runs THIS after every change)

```bash
npx tsc --noEmit                                          # exit 0
bun build src/index.ts --outdir dist --target bun         # exit 0
bun report-v452.ts                                        # the report
sha256sum report_v452.md                                  # ×2 identical (the NEW baseline)
bun diag-golden-coverage.ts                               # the 3-pip count vs the operator's REAL trades
for g in diag-telescoping diag-lmv-golden diag-obcv-golden diag-e2-forward diag-structural-tp \
         diag-3d-refinement diag-review-stage diag-hallucination diag-e2-cascade diag-e1-reintegrated \
         diag-zone-relevance diag-storyline diag-e3-conditional diag-cascade-propagation \
         diag-self-validation; do bun $g.ts || echo "FAIL: $g"; done   # ALL exit 0
sha256sum src/mdve/sl-lmv.ts src/mdve/trade-dedup.ts     # the frozen pair byte-identical
```

## 9.5 THE WAVE-GATE TRUTH TABLE (what PASS means per wave)

| Wave | The gate PASS = | The hard evidence |
|------|-----------------|-------------------|
| ZR-6A | the E2's day decomposition carries the zone IDs; the price fields gone; the DXY 6/6 + the EU Mon WIN held | diag-e2-forward exit 0 + the golden 6/6 DXY + the report's EU Mon row |
| ZR-6B | the EU Mon SHORT at the operator's level (1.14395 ±3p); the Wednesday trades emitting; the GU Mon WIN held | the golden measurement + the report's EU/GU rows |
| ZR-6C | the Wednesday EU trades at the operator's geometry (E 1.14020/1.14295/1.13935 ±3p, RRR 5.5/8.43/6.35 territory); the 2.7/2.9 trades PASS (≥2.5); the DXY held | the golden measurement + the report's Wednesday rows |
| ZR-6D | the EU 8 + the GU 7 emitted at the operator's levels; the chaining visible (the TP of N = the entry of N+1) | the golden measurement 15/21+ toward 15/15 + the report's full lanes |
| ZR-6E | the NOT_TRIGGERED count drops; the winning trades fill | the report's fill columns |

**THE FINAL GATE:** the golden measurement (the operator's REAL trades) ≥ 15/21 (toward 15/15) + the DXY 6/6 held + the DXY lane all-winning + determinism ×2 + the frozen pair byte-identical + all 16 gates green + the self-validation passes.

## 9.6 THE OPERATOR'S VERBATIM DOCTRINE (the quotes the next session quotes — never synthesizes)

- "E3 is a natural RESULT we ARRIVE AT from E1 + 2 being done properly... 90% of the work is in E1 + E2."
- "E2 generates SHAPE CHAIN from ZONE ANCHORS (prices are not even a variable for E2). E3 generates trade setups at specific price levels on top of the E2 shape chain."
- "3 pips outside the back edge of the entry zone, or 1-2 pips inside the close edge of the *next rung* relevant zone... you need to look at the zones like ladder steps."
- "SL should be made tighter (where actually possible not arbitrarily) based on E1 pressure mechanics + E2 shape chain."
- "the stronger the pressure of the zone, the weaker the mitigation will be prior to the reaction. Strong pressure zones = near instant reaction. exit on the closest zone edge and even potentially add a 1-2 pip spread so you dont miss the exit. Weak pressure zones = delayed reaction. Maximize the profits you catch from these while the candles are still inside of them."
- "zones usually fail on the THIRD mitigation."
- "TP should be exteneded to the STRUCTURALLY CORRECT zone based on E2 shape chain + E1 pressure mechanics."
- "NEVER have I said 'the nearest'. No. This needs to follow proper TP calculation mechanics and match to the zone of opposing pressure that will ACTUALLY cause a reaction."
- "anything that is 2.5 RR or above is valid as long as it is high probability. However the TARGET is always 4R+ i dont want the machine optimizing everything for low R just to pass the filter."
- "A rejected setup is not a dead setup. The entry is the hard-won insight; SL/TP are engineering. A 1.8-RRR trade with a valid entry is a good trade with a dumb anchor."
- "3 attempts on each anchor (3 E, 3 SL, 3 TP refinement attempts each tracked and locked individually per trade... each rejection needs to also give context on WHY it was rejected and HOW to properly improve it."
- "Refinement engine fires for all E2 valid setups that have shitty anchors causing RR to be below the floor."
- "E2 DESIGNATES, E3 OBEYS."
- "the market moves based on liquidity... The LIQUIDITY is what actually FUELS the price action. Liquidity is the BLOOD of the entire market."
- "pressure mechanics are the fundamental reality everything is built on top of."
- "Doctrine is QUOTED, never synthesized... Anything that can't be quoted, doesn't get built." (D13)

*END OF THE DERAILMENT-PROOFING ADDENDUM — the gaps closed: the confidence-judgment mechanism, the full-structure chaining mechanism, the fill-model mechanism, the per-wave battery, the wave-gate truth table, the verbatim doctrine quotes. The handoff is now execution-ready.*

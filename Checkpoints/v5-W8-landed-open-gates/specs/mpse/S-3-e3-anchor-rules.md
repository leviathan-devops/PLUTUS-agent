# S-3 — E3 Anchor Rules (E/SL/TP)
spec: S-3
form: predicate-family
sources: PLUTUS_E3_ANCHOR_ENGINEERING_SPEC.md:141, PLUTUS_V4.5.3_BUILD_REPORT.md:17, PLUTUS_V4.5.3_BUILD_SPEC.md:39, PLUTUS_V4.5.3_BUILD_SPEC.md:47, PLUTUS_V4.5.4_AGENT_IN_THE_LOOP_ENGINEERING_SPEC.md:1822, PLUTUS_E3_ANCHOR_ENGINEERING_SPEC.md:72, PLUTUS_V5_FULL_BUILD_SPEC.md:2011, PLUTUS_V5_FULL_BUILD_SPEC.md:1986, PLUTUS_E3_ANCHOR_ENGINEERING_SPEC.md:452, PLUTUS_E3_ANCHOR_ENGINEERING_SPEC.md:457, PLUTUS_V5_FULL_BUILD_SPEC.md:2010, PLUTUS_E3_ANCHOR_ENGINEERING_SPEC.md:22, Golden_Operator_Trade_Feedback_EU_GU.md:12, Golden_Operator_Trade_Feedback_EU_GU.md:20, Golden_Operator_Trade_Feedback_EU_GU.md:46
## Blocks
### B-1-E1-entry-lqz-near-edge — E1 entry LQZ near-edge rule
quote: "the entry = the entry zone's LQZ near edge"
anchor: PLUTUS_E3_ANCHOR_ENGINEERING_SPEC.md:141
kind: exists-unique
expr: forall E2-designated zone Z with internal LQZ rung R: entry(Z,dir) = nearEdge(R,dir) OR entry = priorTP (Law-27 chain: TP OF ONE = ENTRY OF NEXT); SHORT = rung near edge from above (rung floor side); LONG = rung near edge from below (rung ceiling side); EU#1 SHORT E 1.14395 = LQZ [1.1444-1.14395] near edge
oracle: golden-week-discharge
fixtures: [golden-week, mutant-9-eu2-nearedge]
### B-2-E2-ss-nested-liquidity-long — E2 SS-shape nested-liquidity LONG rule
quote: "The fix: `nestedSellLiquidity()` — the SS-shape LONG enters at the top of the rung within 10p below the demand anchor's floor — the #2's Δ1.0p HIT."
anchor: PLUTUS_V4.5.3_BUILD_REPORT.md:17
kind: inequality
expr: SS-shape LONG: exists SELL-side rung R nested in demand D with 0p <= floor(D) - top(R) <= 10p: entry = top(R); golden row EU#2: rung 1.14100, top 1.14120, Delta 1.0p; SL 3p outside nested-LQZ far edge (1.14020 - 3p = 1.13990); TP at near edge of BoM supply (1.14460)
oracle: d17-eu2-near-edge-row-produced
fixtures: [golden-week, mutant-9-eu2-nearedge]
### B-3-E3-rwl-bs-deep-rung — E3 RWL/BS deep-rung rule
quote: "the shape-driven gating MUST accompany: the RWL/R/RS/PRWL shapes → the DEEP rung (the demandReachRef proximity!); the SS/BS/WL shapes → the NEAR (the demandCeiling proximity!)."
anchor: PLUTUS_V4.5.3_BUILD_SPEC.md:39
kind: piecewise
expr: rungPick(shape): shape in {RWL,R,RS,PRWL} -> DEEP rung (demandReachRef proximity, e.g. EU#6 LQ shield [1.13935-1.13875] beneath contested demand); shape in {SS,BS,WL} -> NEAR rung (demandCeiling proximity); EU#4 LONG E 1.14020 = chained BS TP with SL on DEMAND far edge (absorption switch, see S2)
oracle: d17-eu4-deep-silent
fixtures: [golden-week, mutant-eu4-deep]
### B-4-E4-supply-side-symmetry-short — E4 supply-side symmetry SHORT rule
quote: "the SHORT mirrors' entry resolution — the same near-edge mechanics on the supply side (the entry = the LQZ's floor!)."
anchor: PLUTUS_V4.5.3_BUILD_SPEC.md:47
kind: equality
expr: SHORT at supply S with internal SELL-side rung R: entry = floor(R); SELL_SIDE rung designation per ZR-6D keyZoneType contract; golden row GU#7: rung Delta 0.0p at operator 1.34500; EU#3 SHORT E 1.14460 at BoM supply with TP at far edge of LQZ (1.14020, pierce expected)
oracle: golden-week-discharge
fixtures: [golden-week]
### B-5-S1-ladder-steps-sl — S1 ladder-steps SL rule
quote: "3 pips outside the back edge of the entry zone, or 1-2 pips inside the close edge of the *next rung* relevant zone. In the case of the EU trade the next rung relevant zone was the supply zone. you need to look at the zones like ladder steps. It is either 3 pips outside the far edge of the current step we enter on, or 1-2 pips inside the close edge of the NEXT STEP away (opposite direction of the projected trade direction - if it is a short then this is the next step UP. if it is a long this is the next step DOWN) from the entry step. This is to ensure the SL has breathing room for volatility while still being tight enough to maximize RRR"
anchor: PLUTUS_V4.5.4_AGENT_IN_THE_LOOP_ENGINEERING_SPEC.md:1822
kind: piecewise
expr: SL = outside(backEdge(relevantZone,dir),3p) OR inside(closeEdge(nextRungOut,dir),1..2p); SHORT: next step UP; LONG: next step DOWN; EU#2 LONG: SL = farEdge(nested LQZ [1.14110-1.14020]) - 3p = 1.13990; EU#5 SHORT: SL = farEdge(real LQZ) + 3p = 1.14330
oracle: golden-week-discharge
fixtures: [golden-week, mutant-8-rrr-drift]
### B-6-S2-operative-defense-switch — S2 operative-defense SL switch
quote: "liquidity has been absorbed so now let us only use the LQZ as an E anchor and set the SL based on the DEMAND zone instead of the LQZ to ensure we are safe from the potential wicks/volatility as all the bullish pressure from the demand zone is absorbed"
anchor: PLUTUS_E3_ANCHOR_ENGINEERING_SPEC.md:72
kind: piecewise
expr: relevantZone = (absorption(entryLQZ) = INTACT) ? entryLQZ : parentSDZone; EU#4 LONG: LQZ fuel ABSORBED -> SL = farEdge(demand [1.14145-1.14000]) - 3p = 1.13970 (NOT the LQZ); E stays anchored to LQZ (E = BS TP 1.14020)
oracle: golden-week-discharge
fixtures: [golden-week]
### B-7-S3-atr-floor — S3 ATR SL floor
quote: "SL must NEVER be tighter than 0.5 × pairATR(14) on entry TF"
anchor: PLUTUS_V5_FULL_BUILD_SPEC.md:2011
kind: inequality
expr: |entry - SL| >= 0.5 * pairATR(14, entryTF); tighter-than-floor SL is rejected with context (never silently widened); Law-8 fallback when no rung within 100p: SL = entry -/+ max(zoneWidth * 2, 1.5 * pairATR)
oracle: d17-tolerance-drift-fire
fixtures: [golden-week, mutant-tolerance-drift]
### B-8-S4-golden-sl-min — S4 golden SL minimum 4p
quote: "| GOLDEN_SL_MIN_PIPS | 4 | The canon | The minimum SL width |"
anchor: PLUTUS_V5_FULL_BUILD_SPEC.md:1986
kind: inequality
expr: |entry - SL| >= GOLDEN_SL_MIN_PIPS (4p); sub-floor SL walks to next defended rung in [4p, 9.5p + buffer] clearing anatomy; ceiling SL_CEILING_PIPS 36 HARD (structural SL beyond it = wrong entry, repair anchor chain); EU#7 narrow-rung judgment: next rung only 3p wide -> 1-1.5p inside close edge (SL 1.14165) instead of 3p
oracle: golden-week-discharge
fixtures: [golden-week, mutant-5-tpcap]
### B-9-T1-strength-driven-edge — T1 strength-driven TP edge
quote: "the stronger the pressure of the zone, the weaker the mitigation will be prior to the reaction. Strong pressure zones = near instant reaction. exit on the closest zone edge and even potentially add a 1-2 pip spread so you dont miss the exit. Weak pressure zones = delayed reaction. Maximize the profits you catch from these while the candles are still inside of them."
anchor: PLUTUS_E3_ANCHOR_ENGINEERING_SPEC.md:452
kind: piecewise
expr: TPedge = (strength(OPZONE) = STRONG AND reaction = near-instant) ? closeEdge + spread(1..2p) : farEdge; STRONG = BoM/high-confluence/fortress + deep-mitigate-or-pierce expected (EU#5 -> far edge 1.14000 maximize; EU#3 BS pierce -> far edge 1.14020); WEAK = virgin MoM/no prior pressure -> farEdge fully-mitigated (EU#4 -> 1.14295); STRONG + instant (EU#2) -> close edge 1.14460
oracle: golden-week-discharge
fixtures: [golden-week, mutant-5-tpcap]
### B-10-T2-opposing-zone-internal-lqz — T2 E2-projected opposing zone TP
quote: "TP should be exteneded to the STRUCTURALLY CORRECT zone based on E2 shape chain + E1 pressure mechanics."
anchor: PLUTUS_E3_ANCHOR_ENGINEERING_SPEC.md:457
kind: exists-unique
expr: TPtarget = internalLQZ(E2projectedOpposingZoneId); MoM projection extends MoM->BoM wall (EU#6 TP = original 1H-refined-4H BoM supply 1.14475); opposing internal LQZ is the Earth+Fire level (EU#1 TP = nested LQZ [1.14110-1.14020] near edge 1.14110); E2 DESIGNATES zone IDs only, E3 OBEYS by computing prices
oracle: golden-week-discharge
fixtures: [golden-week]
### B-11-T3-tp-timeframe-floor — T3 TP timeframe floor
quote: "TP timeframe must be ≥ entry timeframe"
anchor: PLUTUS_V5_FULL_BUILD_SPEC.md:2010
kind: inequality
expr: TF(TPzone) >= TF(entry); 15m entry -> 30m/1H TP; 1H entry -> 4H TP; never same-TF; TP min distance |TP - entry| >= 1.2 * |entry - SL| (viable-RRR precondition)
oracle: golden-week-discharge
fixtures: [golden-week]
### B-12-shape-gating — shape-gating map for E/SL/TP families
quote: "E2 DESIGNATES, E3 OBEYS."
anchor: PLUTUS_E3_ANCHOR_ENGINEERING_SPEC.md:22
kind: piecewise
expr: gate on ShapeCode chain position (SS|BS|R|WL|RWL|WLS): E1-near-edge fires on all shapes; E2-nested-liquidity-LONG fires on SS/BS chains (SS->BS follow-up, EU#2); E3-deep-rung fires on RWL/R/RS/PRWL chains (EU#6 RWL/BS from deep LQ shield); E4-supply-symmetry fires on SHORT direction of any chain (EU#3 BS, EU#5 WL, EU#8 RWL); S1/S2 ladder+switch fire on all shapes with relevantZone from E1 pressure state; T1/T2/T3 fire on E2-projected opposing zone of the active chain; NO family emits a price from an E2 price field (zone IDs only)
oracle: d17-side-inversion-pair
fixtures: [golden-week, mutant-side-inversion]

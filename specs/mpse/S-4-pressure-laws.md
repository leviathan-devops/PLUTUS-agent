# S-4 — The Pressure Laws

spec: S-4
form: piecewise
sources: PLUTUS_V5_FULL_BUILD_SPEC.md:810-826, PLUTUS_V5_FULL_BUILD_SPEC.md:2008, Golden_Operator_Trade_Feedback_EU_GU.md:20, Golden_Operator_Trade_Feedback_EU_GU.md:54, Golden_Operator_Trade_Feedback_EU_GU.md:17, PLUTUS_V5_FULL_BUILD_SPEC.md:807, PLUTUS_V4.5.3_BUILD_REPORT.md:160

## Blocks

### B-1-lifecycle-recurrence — The six-state pressure lifecycle

quote: "track the VIRGIN → ACTIVE-1 → ACTIVE-2 → DEPLETED → FORTRESS | BROKEN lifecycle"
anchor: PLUTUS_V5_FULL_BUILD_SPEC.md:813
kind: recurrence
expr: pressure(0)=VIRGIN; pressure(n+1)=step(pressure(n),event(n)) over {VIRGIN,ACTIVE-1,ACTIVE-2,DEPLETED,FORTRESS,BROKEN} with step(VIRGIN,SWEEP)=ACTIVE-1, step(ACTIVE-1,SWEEP)=ACTIVE-2, step(ACTIVE-2,SWEEP)=DEPLETED, step(ANY,4plus-held)=FORTRESS, step(ANY,body-close-through)=BROKEN; exactly 6 valid states, no other state admissible
oracle: O-0.3
fixtures: [golden-week]

### B-2-battle-count-guard — Only SWEEP battles advance the count

quote: "The battle-count guard: only SWEEP events advance the count (not touches)"
anchor: PLUTUS_V5_FULL_BUILD_SPEC.md:825
kind: recurrence
expr: battleCount(n+1)=battleCount(n)+1 iff event(n)=SWEEP-battleResolved else battleCount(n+1)=battleCount(n); touches, wick-taps without battle resolution, and gap-throughs without a battle contribute 0; the B-1 recurrence consumes battleCount, never touchCount
oracle: O-0.3
fixtures: [golden-week]

### B-3-death-scope-piecewise — Virgin-MoM death applies to 30m and 1H only

quote: "DEATH_SCOPE_TFS = ['30m', '1H'] ONLY — the 4H zones NEVER become death zones"
anchor: PLUTUS_V5_FULL_BUILD_SPEC.md:807
kind: piecewise
expr: deathRule(z)=IF z.tf IN ['30m','1H'] AND z.classification='MoM' AND z.state=VIRGIN THEN mayDieOnThirdSweep(z) ELSE IF z.tf='4H' THEN REFUSE-DEPLETED (guard: 4H-never-death; per PLUTUS_V4.5.3_BUILD_REPORT.md:160 the scope is the 30m virgin MoMs + the 1H type-1 ONLY, 4H zones never, all get >= 1 reaction)
oracle: O-0.3
fixtures: [golden-week]

### B-4-fortress-invariant — Four prior mitigations without pierce flips to FORTRESS

quote: "since it has not been pierced or broken in 4 prior mitigations (with mitigations 3 + 4 being weak mitigations. Barely touching the close edge before being slapped down sharply) this supply zone is likely to become a fortress zone and NOT get pierced."
anchor: Golden_Operator_Trade_Feedback_EU_GU.md:54
kind: inequality
expr: fortress(z) <=> (reactionCount(z)>=4 AND pierced(z)=false AND broken(z)=false AND pressure(z)='FORTRESS'); guard defendedAtMs>eatenAtMs => FORTRESS not DEPLETED (PLUTUS_V5_FULL_BUILD_SPEC.md:824); the predicate is the >=4 strong-holds conjunction, NOT the depletion count; kills F1 (freshness.ts 3-held-defenses->DEPLETED made FORTRESS unreachable)
oracle: O-0.3
fixtures: [golden-week, golden-eu-8]

### B-5-third-mitigation-inequality — Zones fail on the third mitigation, TP-target-only

quote: "zones usually fail on the THIRD mitigation"
anchor: Golden_Operator_Trade_Feedback_EU_GU.md:20
kind: inequality
expr: IF reactionCount(z)>=3 AND pressure(z)!='FORTRESS' THEN tradePosture(z)=TP-target-only (expect pierce-or-deep-mitigate; per Golden_Operator_Trade_Feedback_EU_GU.md:23 mitigation #3 expects pierce-or-hold-as-fortress through deep mitigation); boundary: reactionCount>=4 with 0 pierce/break admits B-4 FORTRESS instead; the B-4/B-5 boundary is reactionCount=3 (fail-expected) vs reactionCount>=4-held (fortress-flip)
oracle: O-0.3
fixtures: [golden-week, eu4-deep, golden-eu-5]

### B-6-broken-with-battle — Pierce WITH a battle breaks; gap-through without battle does not

quote: "ANY      --body-close-through-->           BROKEN (the role reversal)"
anchor: PLUTUS_V5_FULL_BUILD_SPEC.md:820
kind: piecewise
expr: broken(z) <=> bodyCloseThrough(z)=true AND battleFought(z)=true; gapThrough(z)=true AND battleFought(z)=false => broken(z)=false (a gap-through without a battle is NOT a break; per Golden_Operator_Trade_Feedback_EU_GU.md:27 no clean break of market structure holds until the MoM zone fully fails); BROKEN triggers role-reversal of the zone
oracle: O-0.3
fixtures: [golden-week]

### B-7-shield-relation — The LQZ in front absorbs first and protects the S/D

quote: "The liquidity shield that sits right in front of the BoM supply is highly likely to be retested"
anchor: Golden_Operator_Trade_Feedback_EU_GU.md:17
kind: subset
expr: shieldOf(sdz)={lqz: lqz sits in front of sdz on the approach path}; sweepOrder: eat(shieldOf(sdz)) BEFORE touch(sdz); the candles eat the liquidity in front of the S/D and in doing so the S/D is protected (per Golden_Operator_Trade_Feedback_EU_GU.md:28 this LQZ is the LQ shield of the BoM 4H bullish OB); a shield pierced while sdz holds = defense credited to sdz, not damage
oracle: O-0.3
fixtures: [golden-week]

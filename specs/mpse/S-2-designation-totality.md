# S-2 — Designation Totality (the bounded forall + exists-unique invariant)

spec: S-2
form: forall
sources: PLUTUS_V5_FULL_BUILD_SPEC.md:59, PLUTUS_V5_FULL_BUILD_SPEC.md:2005, PLUTUS_V5_FULL_BUILD_SPEC.md:2015, PLUTUS_V5_FULL_BUILD_SPEC.md:2017, PLUTUS_V5_FULL_BUILD_SPEC.md:1041, PLUTUS_V5_FULL_BUILD_SPEC.md:1050, PLUTUS_V5_FULL_BUILD_SPEC.md:1940, Golden_Operator_Trade_Feedback_EU_GU.md:12, Golden_Operator_Trade_Feedback_EU_GU.md:54

## Blocks

### B-1-bounded-forall — The totality forall over Days(5) x Pairs(3) x Directions(2) = 90 rows
quote: "E3 is a natural RESULT we ARRIVE AT from E1 + 2 being done properly... 90% of the work is in E1 + E2"
anchor: PLUTUS_V5_FULL_BUILD_SPEC.md:2005
kind: forall
expr: FORALL (day, pair, dir) IN Days(5) x Pairs(3) x Directions(2) [90 rows]: EXISTS designation(day, pair, dir) AND designation != INCOMPLETE ON golden-week (zero INCOMPLETE states)
oracle: DESIGNATION_INCOMPLETE
fixtures: [monday-convergence-5-5, eu-chain-oracle, gu-chain-oracle]

### B-2-dual-sided — Each (day, pair) carries exactly 2 designations (demand-side + supply-side)
quote: "E2 designates, E3 obeys"
anchor: PLUTUS_V5_FULL_BUILD_SPEC.md:59
kind: equality
expr: |designations(day, pair)| = 2 WHERE designations(day, pair) = { demandZoneId, supplyZoneId }; FOR golden-week: 30 pairs x 2 = 60 zone-IDs total
oracle: DESIGNATION_INCOMPLETE
fixtures: [monday-convergence-5-5]

### B-3-exists-unique — Exactly one designation per (day, direction) (the single reading)
quote: "Doctrine is QUOTED, never synthesized"
anchor: PLUTUS_V5_FULL_BUILD_SPEC.md:2015
kind: exists-unique
expr: FORALL (day, direction) IN Days x Directions: EXISTS-UNIQUE designation(day, direction) (one admissible reading; a second competing designation for the same slot => E3_DISOBEYED_E2); SILENT-case: v4.5.3 row anchored at demand 1.14100
oracle: E3_DISOBEYED_E2
fixtures: [eu-2-near-edge, mutant-4-sideinversion-v453-silent]

### B-4-exhaustiveness-d8 — The D8 exhaustiveness over the designation input space
quote: "PROPERLY TANGIBLY LEGIT BASED ON MACRO CONCEPTS AND MECHANICS NOT STUPID FUCKING HARDCODED PRICE GARBAGE"
anchor: PLUTUS_V5_FULL_BUILD_SPEC.md:2017
kind: forall
expr: FORALL input IN (day, pair, direction, designation-state): COVERED(input) BY { DESIGNATED, CONSUMED, INCOMPLETE-LOUD, SIDE_INVERSION_VIOLATION } (the piecewise family covers the input space; no fifth state; INCOMPLETE is LOUD via DESIGNATION_INCOMPLETE, never silent)
oracle: DESIGNATION_INCOMPLETE
fixtures: [eu-chain-oracle, gu-chain-oracle, monday-convergence-5-5, mutant-3-sideinversion-v452]

### B-5-golden-instantiation — The golden-week instantiation (TP-of-one is entry-of-next)
quote: "Set E at the TP level of trade #1"
anchor: Golden_Operator_Trade_Feedback_EU_GU.md:12
kind: equality
expr: chain(trade-N, trade-N+1): entry(trade-N+1) = TP(trade-N) (EU Mon-L entry 1.14110 = EU Mon-S TP 1.14110); rung(EU-Tue-S) = 1.14100, top = 1.14120, delta = 1.0p (near-edge-aware designation lands it)
oracle: DESIGNATION_INCOMPLETE
fixtures: [eu-2-near-edge, monday-convergence-5-5, mutant-2-13setup]

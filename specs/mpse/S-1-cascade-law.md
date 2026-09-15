# S-1 — The Cascade Law (side inversion + mirror floor)

spec: S-1
form: piecewise
sources: PLUTUS_V5_FULL_BUILD_SPEC.md:2002, PLUTUS_V5_FULL_BUILD_SPEC.md:2003, PLUTUS_V5_FULL_BUILD_SPEC.md:2004, PLUTUS_V5_FULL_BUILD_SPEC.md:2017, PLUTUS_V5_FULL_BUILD_SPEC.md:59, PLUTUS_V5_FULL_BUILD_SPEC.md:1009, PLUTUS_V5_FULL_BUILD_SPEC.md:1029, PLUTUS_V5_FULL_BUILD_SPEC.md:1034, PLUTUS_V5_FULL_BUILD_SPEC.md:1055, PLUTUS_V5_FULL_BUILD_SPEC.md:1065, PLUTUS_V5_FULL_BUILD_SPEC.md:1925, Golden_Operator_Trade_Feedback_EU_GU.md:12

## Blocks

### B-1-side-match — The D50 side-match rule (piecewise over direction)
quote: "NOTHING SHOULD BE PRICE ANCHORED EVER. THIS IS THE EXACT HARDCODED DEGENERATE GARBAGE THAT IS FORBIDDEN. NEEDS TO BE ZONE ANCHORED."
anchor: PLUTUS_V5_FULL_BUILD_SPEC.md:2002
kind: piecewise
expr: match(mirror) = CASE direction(mirror) OF LONG -> demandZoneId ONLY (supplyZoneId FORBIDDEN) | SHORT -> supplyZoneId ONLY (demandZoneId FORBIDDEN); VIOLATION(LONG consumes supplyZoneId OR SHORT consumes demandZoneId) => SIDE_INVERSION_VIOLATION FIRE
oracle: SIDE_INVERSION_VIOLATION
fixtures: [mutant-3-sideinversion-v452, mutant-4-sideinversion-v453-silent]

### B-2-mirror-floor — The mirror floor equality f(T) = N x (1+P) = 24
quote: "PROPERLY TANGIBLY LEGIT BASED ON MACRO CONCEPTS AND MECHANICS NOT STUPID FUCKING HARDCODED PRICE GARBAGE"
anchor: PLUTUS_V5_FULL_BUILD_SPEC.md:2017
kind: equality
expr: f(T) = N x (1+P) = 24 AND discharge(|all_setups|) = CASE |all_setups| OF 40 -> CONTRADICTED (overgen) | 13 -> CONTRADICTED (undergen) | 24 -> VALID | _ -> CONTRADICTED
oracle: MIRROR_FLOOR_CONTRADICTED
fixtures: [mutant-1-40setup, mutant-2-13setup]

### B-3-divergence — The chain-divergence inequality (flag-only at 0.35)
quote: "the GU's E2 chain is LITERALLY the EU's — THERE SHOULD BE 0 DIVERGENCE AT THIS LEVEL."
anchor: PLUTUS_V5_FULL_BUILD_SPEC.md:2004
kind: inequality
expr: divergence(pair, macro) IN [0,1] AND divergence(pair, macro) <= 0.35 (DIVERGENCE_MAX); outcome(divergence > 0.35) = FLAG ONLY (never silent-drop, never auto-reject)
oracle: CASCADE_DIVERGENCE_EXCEEDED
fixtures: [eu-chain-oracle, gu-chain-oracle]

### B-4-sequencing-requires — EU advances only after the DXY-inverse exists
quote: "E2 now only needs to be calculated on DXY, injected into EU w/ an 'invert' function, and then the completed EU E2 needs to be injected into GU."
anchor: PLUTUS_V5_FULL_BUILD_SPEC.md:2003
kind: process
expr: REQUIRES(EU-DesignationMachine -> DESIGNATED) = EXISTS(DXY-inverse designation) (the DXY E2 completed first); direction(EU-day) = INVERT(direction(DXY-day)); shape(EU-day) = shape(DXY-day) VERBATIM
oracle: DESIGNATION_INCOMPLETE
fixtures: [eu-chain-oracle, monday-convergence-5-5]

### B-5-consumption-forbids — GU never consumes raw DXY (subset of EU mirrors)
quote: "the GU's E2 chain is LITERALLY the EU's — THERE SHOULD BE 0 DIVERGENCE AT THIS LEVEL."
anchor: PLUTUS_V5_FULL_BUILD_SPEC.md:2004
kind: subset
expr: inputs(GU-lane) SUBSET mirrors(ACTIVE-EU-E2) AND FORBID(GU-lane consumes raw-DXY-setups); shape(GU-day) = shape(EU-day) VERBATIM (injectShapeSequence)
oracle: CASCADE_DIVERGENCE_EXCEEDED
fixtures: [gu-chain-oracle, eu-chain-oracle]

### B-6-loop-detection — The duplicate re-fire killer (the 40-duplicate class)
quote: "E2 designates, E3 obeys"
anchor: PLUTUS_V5_FULL_BUILD_SPEC.md:59
kind: recurrence
expr: detectLoop(translation) = SAME-translation RE-FIRES => KILL duplicate AND RECORD stage-id; ADVANCE(stage) ONLY ON designated-translation (re-fired translations never advance the cascade)
oracle: MIRROR_FLOOR_CONTRADICTED
fixtures: [mutant-1-40setup]

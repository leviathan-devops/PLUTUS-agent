# S-5 — The RRR Regime

spec: S-5
form: predicate-family
sources: PLUTUS_V5_FULL_BUILD_SPEC.md:1981, PLUTUS_V5_FULL_BUILD_SPEC.md:2006, PLUTUS_V5_FULL_BUILD_SPEC.md:1985, PLUTUS_V5_FULL_BUILD_SPEC.md:1986, PLUTUS_V5_FULL_BUILD_SPEC.md:1341, PLUTUS_V5_FULL_BUILD_SPEC.md:861, PLUTUS_V5_FULL_BUILD_SPEC.md:1419, PLUTUS_V5_FULL_BUILD_SPEC.md:1931, PLUTUS_V5_FULL_BUILD_SPEC.md:1936, PLUTUS_V5_FULL_BUILD_SPEC.md:1907, .trident/wave-plan.md:10

D-R1 RATIFICATION (binding on every block below): RRR floor 2.5 / target 4R+ per ZR-6C.
The executed expectation is recorded, not built on: the operator ran the golden week at
"MINIMUM 3 RRR NOTHING LESS IS ACCEPTABLE" and every golden row landed >= 2.92, but the
BUILD CONSTANT is 2.5 — the floor below records 2.5 and this header records D-R1 as its
authority. No block below trades the ratified constant for the executed-expectation quote.

## Blocks

### B-1-floor-inequality — The 2.5 floor as the final filter

quote: "RRR ≥ 2.5 (floor) / 4R+ (target)"
anchor: PLUTUS_V5_FULL_BUILD_SPEC.md:1341
kind: inequality
expr: pass(rrr) <=> q(rrr) >= q(2.5) where q(x)=round(x/pipEps) pip-quantizes both sides before compare (spec §9.1 epsilon); boundary: q(2.49)<q(2.5) FAILS, q(2.50)>=q(2.5) PASSES; the RRR 1.5→1.0 floor drift mutant (spec D.2 mutant-8) MUST FIRE RRR_FLOOR_VIOLATION
oracle: O-0.6
fixtures: [golden-week, rrr-drift]

### B-2-target-statement — The 4R+ target kills volume-over-quality

quote: "anything that is 2.5 RR or above is valid as long as it is high probability. However the TARGET is always 4R+ i dont want the machine optimizing everything for low R just to pass the filter"
anchor: .trident/wave-plan.md:10
kind: equality
expr: target(rrr) <=> rrr >= 4.0; validity = B-1-floor AND highProbability (the floor admits, the target ranks); a trade at 2.5 admitted but never preferred over a 4R+ candidate — the optimizer maximizes rrr subject to B-1, never minimizes rrr subject to pass(B-1); discharge: 7/15 golden rows >= 4R (spec D.2 EU #3 4.4, #4 5.5, #5 8.43, #6 6.35, #7 5.5, #8 4.59, GU #1 8.94, #2 6.35, #3 4.81, #4 11, #6 7.22, #7 4.32)
oracle: O-0.3
fixtures: [golden-week]

### B-3-ceiling-predicate — The 36-pip SL ceiling fires the degenerate cap

quote: "The maximum SL depth"
anchor: PLUTUS_V5_FULL_BUILD_SPEC.md:1985
kind: inequality
expr: ceiling(slPips) <=> q(slPips) <= q(36) with pip-quantized compare; violation => DEGENERATE_TP_CAP FIRES (the D.3 typed error); boundary: 36.0 SILENT, 36.4 FIRES; calibration row: entry 100.918 / SL 100.553 / riskPips 36.4 / degenerateTp 101.071 (spec D.2 mutant-5) MUST FIRE
oracle: O-0.6
fixtures: [golden-week, tp-cap-mutant]

### B-4-min-sl — The golden-SL minimum 4p width

quote: "The minimum SL width"
anchor: PLUTUS_V5_FULL_BUILD_SPEC.md:1986
kind: inequality
expr: minSL(slPips) <=> q(slPips) >= q(4); an SL tighter than 4p is REFUSED even when B-1 would pass — the width guard dominates the ratio; conjoins with LAW-10 "SL never tighter than 0.5 × ATR(14)" (the tighter of the two minima governs); every golden EU/GU row carries SL >= 4p (EU #2 12p narrowest at 1.14110/1.13990, EU #8 1.5p-against-ceiling is the TP-side exception documented in the row, all risk-side SLs >= 4p)
oracle: O-0.3
fixtures: [golden-week]

### B-5-consequence-law — RRR is computed from geometry, never an input

quote: "E3 is a natural RESULT we ARRIVE AT from E1 + 2 being done properly... 90% of the work is in E1 + E2"
anchor: PLUTUS_V5_FULL_BUILD_SPEC.md:2005
kind: equality
expr: rrr = computeRRR(anchors) = |TP - E| / |E - SL| with E/SL/TP already fixed by the E1/E2 anchor rules (S-3 families); FORBIDDEN direction: no assignment to E/SL/TP may read rrr (anchors are rrr-blind; bending an anchor to lift rrr => E3_DISOBEYED_E2 FIRES); the trade-computer emits rrr: computeRRR(anchors) per the L5 TI-graph edge, never a fitted constant
oracle: O-0.6
fixtures: [golden-week, eu4-deep]

### B-6-filter-law — RRR >= 2.5 is the FINAL filter after the aggregate gate

quote: "GATE: classifyAggregate fires when total pos > total neg AND RRR ≥ 2.5"
anchor: PLUTUS_V5_FULL_BUILD_SPEC.md:861
kind: piecewise
expr: filter(input) = IF aggregatePos(input) > aggregateNeg(input) THEN B-1-floor(rrr(input)) ELSE REJECT (the pos>neg gate runs FIRST, the RRR floor runs LAST — a high-RRR candidate with neg>=pos is still rejected); order fixed: gate THEN floor, never floor THEN gate; the aggregate = all 8 families scored together per the MACHINE-1 gate clause
oracle: O-0.3
fixtures: [golden-week, rrr-drift]

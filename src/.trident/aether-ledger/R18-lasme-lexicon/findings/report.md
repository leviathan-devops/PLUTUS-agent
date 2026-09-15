# LEXICON HUNT REPORT — R18-lasme-lexicon

## METHODOLOGY
Hunt mandate: lexicon integrity (MISSING, DEGENERATE, UNCALIBRATED, DRIFT). Graph-first law attempted: 3 graph queries issued via graphify_query (interfaces >5 members, if/else >3, numeric literals not in constants) — all returned `mcp.callTool is not a function` (graphify unavailable). Fallback to direct file reads under targetRoot. Manual hunt sampled 12 source files: tvi/vcm.ts, tvi/vkg/*, tvi/types.ts, tvi/veb.ts, vei/profiles/tradingview.ts, pipeline/engine.ts, engines/ladder-scaffold.ts. Each threshold checked for named calibration constant + calib: comment. Each if/else ladder depth counted. Each lexicon checked for typed PatternFamily shape, evidence-triad production, state machine.

## SPEC GROUND TRUTH
- PLUTUS_TVI_DESIGN_SPEC.md §4.1 (VCM 8-phase pipeline, relevance scoring: block +100 | warn +50 | guide +25; category +30/20/15/10; disclosure +20/10/5; TOP_N=5)
- PLUTUS_TVI_DESIGN_SPEC.md §3.2 B-002 (visualEvidence <20 chars BLOCK), B-012/B-013 (4H 15-40 pips, 1H 8-25 pips WARN), B-014 (BoM body ≥65% AND body-to-wick ≥3.0)
- PLUTUS_TVI_DESIGN_SPEC.md §5.2 GATE V2 / §6.3 verifyZone (GENERIC_EVIDENCE_PATTERNS exact-match generic strings fail firewall, price 3+ decimals required)
- PLUTUS_TVI_DESIGN_SPEC.md §3.2 B-006/B-007 (±0.020 FX / ±2.00 DXY distance BLOCK)
- PLUTUS_ARCHITECTURE_BIBLE_4.0.md Part 4.12 (Pillar 9 confluence → ZFP step function 12→10, 10→20, 8→30, 6→40, 4→55, else 65)
- PLUTUS_V4.4_VEI_SPEC.md Appendix A.4 / §5.5 (SEL settleMs per-tool table: navigate/switch 2000ms, draw/replay 1000ms, click/type 300ms, default 200ms)
- ISE named-threshold law: numeric literals gating decisions MUST be named calibration constant AND carry calib: comment.

## FINDINGS

## FINDING: uncalibrated settleMs thresholds in 4-branch if/else ladder — missing PatternFamily lexicon
- layer: R18-lasme-lexicon
- predicate: lexicon.missing
- object: Contract
- file: src/vei/profiles/tradingview.ts:88
- evidence: "if (tool.includes('navigate') || tool.includes('switch')) return 2000;"
- spec: PLUTUS_V4.4_VEI_SPEC.md:925 settleMs — Appendix A.4 SEL 2000/1000/300/200 table
- severity: HIGH
- confidence: 0.92

## FINDING: uncalibrated relevance scoring weights — 3 separate >=3-branch ladders without named constants
- layer: R18-lasme-lexicon
- predicate: lexicon.threshold
- object: Contract
- file: src/tvi/vcm.ts:102
- evidence: "if (node.priority === 'block') score += 100;"
- spec: PLUTUS_TVI_DESIGN_SPEC.md:4.1 relevance scoring block +100 | warn +50 | guide +25, category +30/20/15/10, disclosure +20/10/5
- severity: HIGH
- confidence: 0.89

## FINDING: uncalibrated confluence-to-ZFP step function — 6-branch if cascade with bare literals
- layer: R18-lasme-lexicon
- predicate: lexicon.threshold
- object: Contract
- file: src/pipeline/engine.ts:236
- evidence: "if (confluence >= 12) return 10;  // EXTREME — nearly impregnable"
- spec: PLUTUS_ARCHITECTURE_BIBLE_4.0.md:4.12 Pillar 9 pressure-degree → ZFP step 12→10,10→20,8→30,6→40,4→55 else 65
- severity: HIGH
- confidence: 0.88

## FINDING: uncalibrated validation threshold gates BLOCK/WARN without named constant or calib comment
- layer: R18-lasme-lexicon
- predicate: lexicon.threshold
- object: Contract
- file: src/tvi/vkg/validation.ts:62
- evidence: "condition: (s) => isVerif(s) && s.zone !== undefined && s.zone.visualEvidence.length < 20,"
- spec: PLUTUS_TVI_DESIGN_SPEC.md:422 B-002 BLOCKED visualEvidence < 20 chars
- severity: HIGH
- confidence: 0.90

## FINDING: uncalibrated zone width and distance thresholds — bare literals 15/40, 8/25, 0.020/2.00 gating WARN/BLOCK
- layer: R18-lasme-lexicon
- predicate: lexicon.threshold
- object: Contract
- file: src/tvi/vkg/validation.ts:156
- evidence: "condition: (s) => isVerif(s) && s.zone !== undefined && s.timeframe === '4H' && (widthPips(s.zone) < 15 || widthPips(s.zone) > 40),"
- spec: PLUTUS_TVI_DESIGN_SPEC.md:3.2 B-012 4H zone width outside 15-40 pips WARN, B-006/B-007 >0.020 FX / >2.00 DXY BLOCK
- severity: MEDIUM
- confidence: 0.85

## FINDING: lexicon drift — BoM body criteria lexicon says AND 3.0 body-to-wick but matcher fires on body% only
- layer: R18-lasme-lexicon
- predicate: lexicon.drift
- object: Contract
- file: src/tvi/vkg/validation.ts:20
- evidence: "return /body/i.test(z.visualEvidence) && /(?:6[5-9]|[7-9]\d|100)\s*%/.test(z.visualEvidence);"
- spec: PLUTUS_TVI_DESIGN_SPEC.md:3.2 B-014 BoM body ≥ 65% of range AND body-to-wick ≥ 3.0 AND prior move NONE/OPPOSITE
- severity: HIGH
- confidence: 0.87

## FINDING: degenerate lexicon — GENERIC_EVIDENCE_PATTERNS flat string list detection-only with no typed PatternFamily or state machine
- layer: R18-lasme-lexicon
- predicate: lexicon.degenerate
- object: Contract
- file: src/tvi/types.ts:215
- evidence: "export const GENERIC_EVIDENCE_PATTERNS: readonly string[] = ["
- spec: PLUTUS_TVI_DESIGN_SPEC.md:5.2 GATE V2 GENERIC_EVIDENCE_PATTERNS canon — evidence-triad + state machine required by ISE law
- severity: MEDIUM
- confidence: 0.78

## SUMMARY
7 findings — 5 HIGH, 2 MEDIUM. Graph unavailable (mcp.callTool undefined) — no graph connection found; blast radius assessed manually. All thresholds lack named calibration constants AND calib: comments, violating ISE named-threshold law. VCM and settleMs ladders are 3-6 branch towers that should be typed PatternFamily lexicons per (a). GENERIC_EVIDENCE_PATTERNS is degenerate per (b). BomBodyCriteriaMet drift per (d) drops body-to-wick 3.0 conjunct.

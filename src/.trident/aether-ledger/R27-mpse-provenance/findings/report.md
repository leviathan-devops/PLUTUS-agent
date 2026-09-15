# PROVENANCE Hunt — R27-mpse-provenance (MPSE gate 4/4)
Methodology: Graph-first per LAW 1. Queried graphify:path "spec clause reference → code implementation" and "find unreachable spec declarations" via graphify_query/path/subgraph/explain — all returned `mcp.callTool is not a function` (no graph connection found). Fell back to manual file reads under targetRoot src/. Cross-checked every bible spec clause (PLUTUS_ARCHITECTURE_BIBLE_v2.1.md v2.1) against implementing code via grep + direct reads. Prefer EXTRACTED edges, flag INFERRED. Blast radius depth 3 attempted via graphify_subgraph (failed — no graph). Every finding carries file:line under targetRoot + verbatim quote OR spec site + no-path evidence. Trace-exempt and generated code ignored.

## FINDING: Semantic Firewall 48-rule spec has zero provenance — no 48-rule implementation or isReportGeneration flag in src
- layer: R27-mpse-provenance
- predicate: provenance.trace-gap
- object: Contract
- file: pipeline/engine.ts:1
- evidence: "graph query 'path spec clause reference to code implementation' returned no path — no src file implements 48-rule Semantic Firewall nor isReportGeneration flag; grep for isReportGeneration in src returns zero hits — no graph connection found [INFERRED]"
- spec: PLUTUS_ARCHITECTURE_BIBLE_v2.1.md:42 "THE SEMANTIC FIREWALL | 48 rules, two modes, the mode flag solution"
- severity: HIGH
- confidence: 0.92

## FINDING: Report Generation 36-section + Pine Script spec has zero provenance — no report-generator or Pine v6 implementation in src
- layer: R27-mpse-provenance
- predicate: provenance.trace-gap
- object: Contract
- file: pipeline/temporal-anchor.ts:1
- evidence: "graph query 'path spec clause reference to code implementation' returned no path — src/pipeline contains no report-generator.ts; no src file implements 36-section report generation or Pine Script v6; blind-execution-check.ts validates reports but does not generate them — no graph connection found [INFERRED]"
- spec: PLUTUS_ARCHITECTURE_BIBLE_v2.1.md:43 "REPORT GENERATION PIPELINE | Weekly report, 36 sections, blind-execution, Pine Script"
- severity: HIGH
- confidence: 0.9

## FINDING: Orphaned implementation — Kronos sidecar + Dual-Brain agreement bonuses ship without any spec clause declaration
- layer: R27-mpse-provenance
- predicate: provenance.orphaned
- object: Contract
- file: constants/trading-constants.ts:505
- evidence: "export const KRONOS_SIDECAR_URL = 'http://localhost:7090';"
- spec: PLUTUS_ARCHITECTURE_BIBLE_v2.1.md:1 "no spec clause declares Kronos sidecar at localhost:7090 or Dual-Brain agreement bonuses — PLUTUS_ARCHITECTURE_BIBLE_v2.1 has zero mentions of KRONOS, DUAL_BRAIN"
- severity: MEDIUM
- confidence: 0.88

## FINDING: Divergent provenance — BE9 spec requires calendar covers all 5 days but code explicitly no-ops and declares days without setups OK
- layer: R27-mpse-provenance
- predicate: provenance.divergent
- object: Contract
- file: pipeline/blind-execution-check.ts:230
- evidence: "for (const day of ALL_WEEKDAYS) {"
- spec: PLUTUS_ARCHITECTURE_BIBLE_v2.1.md:220 "BE9: Calendar covers all 5 trading days — Every weekday must appear in the setups OR be explicitly noted as \"no setups\""
- severity: HIGH
- confidence: 0.93

## FINDING: Ambiguous trace — settlement threshold 0.85 maps to two INFERRED equal-confidence sites with no EXTRACTED anchor
- layer: R27-mpse-provenance
- predicate: provenance.ambiguous
- object: Contract
- file: constants/trading-constants.ts:205
- evidence: "[INFERRED] spec clause 'settlement threshold is 0.85' traces to two INFERRED candidates of equal confidence with no EXTRACTED anchor — constants/trading-constants.ts:205 \"export const PILLAR_SIGNIFICANT_NOTIONAL_B = 0.85;\" and constants/trading-constants.ts:206 \"export const OPTION_SIGNIFICANT_NOTIONAL_B = 0.85;\" plus OI_NOTIONAL_MODERATE = 0.85 — provenance undecidable"
- spec: PLUTUS_ARCHITECTURE_BIBLE_v2.1.md:85 "PILLAR_SIGNIFICANT_NOTIONAL_B = 0.85 — the settlement/threshold is 0.85 (SIGNIFICANT MAGNET)"
- severity: MEDIUM
- confidence: 0.82

## SUMMARY
5 findings — 2 TRACE_GAP (HIGH), 1 ORPHANED (MEDIUM), 1 DIVERGENT (HIGH), 1 AMBIGUOUS (MEDIUM). Graph system was non-functional (mcp.callTool undefined for all graphify:* calls) — every provenance query returned "no graph connection found", forcing manual file-read fallback. True defects: (1) 48-rule Semantic Firewall declared in bible Part 8 has zero implementing code and no isReportGeneration flag anywhere in src — verified by absence of any firewall file and zero grep hits; (2) 36-section + Pine Script report generation declared in bible Part 14 has no generator in src/pipeline (only blind-execution-check exists). Orphaned drift: Kronos sidecar URL and Dual-Brain agreement bonuses are fully implemented in constants/trading-constants.ts:505-515 and used in pipeline but never declared in PLUTUS_ARCHITECTURE_BIBLE_v2.1 — spec drift. Divergent: blind-execution-check.ts:230 BE9 loop is empty and comment says "Days without setups are OK", directly contradicting BE9 spec that calendar must cover all 5 days — validation is vacuous. Ambiguous: threshold 0.85 appears as three identical constants (PILLAR_SIGNIFICANT, OPTION_SIGNIFICANT, OI_NOTIONAL_MODERATE) with no EXTRACTED edge to disambiguate intended settlement threshold — provenance undecidable. No god-node involved (graph unavailable). All file:line resolve under targetRoot src/. Conformance: pip-counting (PIP_VALUE_DXY 0.01 / FX 0.0001) and temporal-anchor frozen Friday 17:00 ET correctly trace to code — RED_HERRING per Shot 1, not filed.

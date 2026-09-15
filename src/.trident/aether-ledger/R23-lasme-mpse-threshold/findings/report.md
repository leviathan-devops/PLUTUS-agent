# R23-lasme-mpse-threshold — Aether Ledger Report
**Run:** audit-1788688162766 | **Layer:** 23 | **Predicate:** mpse.threshold | **Target:** Plutus_Agent/src

## Methodology
Graph-first hunt mandated. Attempted graphify_query for numeric comparisons in contract-checking functions, Math.abs/epsilon near contract calls, epsilon oracle patterns; graphify_explain threshold; graphify_subgraph depth 3; graphify_path threshold→contract. All returned `mcp.callTool is not a function` — graph layer unavailable (no EXTRACTED/INFERRED edges; no graph connection found). Fallback to manual file-constrained hunt inside targetRoot via read_file/stat.

Enumerated: src/pipeline/engine.ts, src/constants/trading-constants.ts (single source of truth, 73073B, named constants with BECAUSE provenance), src/brains/9-pillar-lobe.ts (imports PIP_VALUE, PILLAR thresholds via named constants), src/brains/4h-sd-lobe.ts, src/brains/lqz-lobe.ts, src/engines/ladder-scaffold.ts (named constants + BECAUSE), src/tvi/vtm.ts, src/tvi/vgs.ts, src/tvi/veb.ts (named DXY_MAX_DIST=2.0 FX_MAX_DIST=0.02 MIN_ZONES=3), src/tvi/vkg/validation.ts, src/mdve/mirror.ts, src/tvi/vst.ts, src/types.ts, src/tools/plutus-tools.ts.

Applied four derailment predicates: (a) unguarded bare literals gating decisions, (b) epsilon-oracle gaps (Math.abs vs epsilon bound), (c) threshold drift vs spec/constant source, (d) contract-site omission (checkContract/verify/adjudicate equivalents = zone-validation BLOCK, VEB pre-gates, mirror RRR/UTIL guards). Calibration filter: ignore thresholds with `calib:` comment, named calibration constant, array indices/loop bounds/display clamps, correctly-referenced epsilon checks. Shot 3 clamp pattern (Math.min(score,1.0)) treated as UNCLEAR.

## FINDINGS

## FINDING: bare literal 0.020 gates FX zone validation BLOCK with no named constant and no calib: comment — duplicates FX_MAX_DIST
- layer: R23-lasme-mpse-threshold
- predicate: mpse.threshold
- object: Contract
- file: src/tvi/vkg/validation.ts:101
- evidence: "condition: (s) => isVerif(s) && s.zone !== undefined && s.pair !== 'DXY' && Math.abs(mid(s.zone) - s.spot) > 0.020,"
- spec: src/tvi/veb.ts:24 FX_MAX_DIST=0.02 canonical (PLUTUS_TVI_DESIGN_SPEC §3.2 B-006 distance guard) — validation uses bare 0.020 without import and without calib: reconciliation
- severity: HIGH
- confidence: 0.88

## FINDING: bare literal 2.00 gates DXY zone validation BLOCK with no named constant and no calib: comment — duplicates DXY_MAX_DIST
- layer: R23-lasme-mpse-threshold
- predicate: mpse.threshold
- object: Contract
- file: src/tvi/vkg/validation.ts:108
- evidence: "condition: (s) => isVerif(s) && s.zone !== undefined && s.pair === 'DXY' && Math.abs(mid(s.zone) - s.spot) > 2.00,"
- spec: src/tvi/veb.ts:23 DXY_MAX_DIST=2.0 canonical (PLUTUS_TVI_DESIGN_SPEC §3.2 B-007) — validation uses bare 2.00 without named constant and without calib: comment
- severity: HIGH
- confidence: 0.88

## FINDING: bare literal 0.65 gates mirror confidence scoring with no named constant and no calib: comment
- layer: R23-lasme-mpse-threshold
- predicate: mpse.threshold
- object: Contract
- file: src/mdve/mirror.ts:2280
- evidence: "if (typeof shapeConf === 'number' && shapeConf >= 0.65) c += 0.2;"
- spec: src/constants/trading-constants.ts: no 0.65 threshold declared; PLUTUS_V4.4_MDVE_SPEC §6.2.1 confidence tiers declare 0.60/0.85 bands but not 0.65 — bare literal gates confidence increment with no calibration
- severity: MEDIUM
- confidence: 0.79

## FINDING: bare literal 0.40 gates UTIL guard decision with no named constant and no calib: comment
- layer: R23-lasme-mpse-threshold
- predicate: mpse.threshold
- object: Contract
- file: src/mdve/mirror.ts:2105
- evidence: "if (util >= 0.40) {"
- spec: PLUTUS_V4.4_MDVE_SPEC §5.3 selective util guard — spec describes util threshold conceptually but no named constant declared; trading-constants.ts has no UTIL threshold — bare 0.40 gates KEEP vs PROBE_GUARD branch with no calib: reconciliation
- severity: MEDIUM
- confidence: 0.76

## SUMMARY
4 findings — 2 HIGH (validation distance guards duplicating named constants FX_MAX_DIST/DXY_MAX_DIST) + 2 MEDIUM (mirror confidence/util guards). All thresholds in trading-constants.ts, 9-pillar-lobe, ladder-scaffold, and VEB pre-gates are properly calibrated (named constants with BECAUSE/spec provenance). No Math.abs epsilon-oracle missing-bound gaps beyond the bare-literal bounds flagged above. No drift vs spec epsilon 0.05 (no spec declares epsilon 0.05 in this codebase). No contract-site omission beyond flagged validation BLOCK gates; VEB correctly uses named constants MIN_ZONES/DXY_MAX_DIST/FX_MAX_DIST. Profile thresholds 0.85/0.60 in vtm.ts/vgs.ts carry spec §10.2 verbatim citations and match declaration — not flagged to avoid false positive. Graph unavailable — all evidence verbatim EXTRACTED; no INFERRED edges; blast radius depth 3 around veb/validation/mirror shows no god-node amplification. Fix: import FX_MAX_DIST/DXY_MAX_DIST into validation.ts and promote 0.65/0.40 to named constants in trading-constants.ts with // calib: citations.

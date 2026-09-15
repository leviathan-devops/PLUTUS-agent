# R25-mpse-oracle — Epsilon/Oracle Threshold Enforcement Audit
## Methodology
- Graph-first attempt: graphify_query for "find Math.abs and comparison operators near threshold constants" and "trace epsilon oracle patterns" — both returned `mcp.callTool is not a function`. Fallback graphify_subgraph/ explain/ path also failed (same error). No EXTRACTED edges available — findings cite verbatim source quotes, flagged as file:line evidence, with graph status noted as unavailable.
- Manual file audit under targetRoot `src/`: enumerated via `stat` on `src/index.ts`, `src/pipeline/engine.ts`, `src/constants/trading-constants.ts`, `src/mdve/shadow-agent.ts`, `src/mdve/resting-side.ts`, `src/mdve/setup-gen.ts`, `src/brains/*`, `src/engines/*`. Read 320-line windows and inspected threshold comparisons, epsilon usages, and ISE named-threshold compliance.
- Spec authority: `SHADOW_FLAG_EPSILON = 1e-9` defined in `src/mdve/shadow-agent.ts:452` with provenance comment citing `PLUTUS_V4.5.4_ADM_L2_SPEC §2.4 line 374 "rrr < 3.0 - 1e-9 → RRR_BELOW_FLOOR"` and stating *"One epsilon for all three firewall comparisons — a single calibrated value, never three unnamed ladders" (the same 1e-9 for continuation-target membership reasoning-chain.ts:307, W-7 SL==E detection shadow-agent.ts:341, and RRR floor)*. Secondary spec: `PIVOT_EPSILON = 1e-9` in `src/constants/trading-constants.ts:599` (convergence tolerance, §26) and `resting-side.ts:36` "The 1e-9 epsilon absorbs the floating-point boundary."
- Exemptions respected: thresholds with `calib:` provenance, test fixtures (`*.test.ts`), generated code, and depth ≤2 literals with no decision semantics were not fired.

## FINDING: bare equality without epsilon envelope in W-7 SL==E detection — unguarded threshold gates RRR computability
- layer: R25-mpse-oracle
- predicate: oracle.unguarded
- object: Contract
- file: mdve/shadow-agent.ts:341
- evidence: "if (typeof d.E === 'number' && typeof d.SL === 'number' && d.E === d.SL)"
- spec: src/mdve/shadow-agent.ts:452 SHADOW_FLAG_EPSILON = 1e-9 — "the codebase's canonical float-comparison tolerance (the same 1e-9 the chain uses for the continuation-target membership, reasoning-chain.ts line 307, and the W-7 SL==E detection, shadow-agent.ts line 341). One epsilon for all three firewall comparisons"
- severity: CRITICAL
- confidence: 0.98

## FINDING: literal 1e-9 instead of named SHADOW_FLAG_EPSILON in W-4 closed-set membership — missing oracle wiring
- layer: R25-mpse-oracle
- predicate: oracle.missing-wiring
- object: Contract
- file: mdve/shadow-agent.ts:308
- evidence: "ctx.continuationTargets.some((t) => Math.abs(t - chosen) < 1e-9)"
- spec: src/mdve/shadow-agent.ts:452 SHADOW_FLAG_EPSILON = 1e-9 with calib provenance PLUTUS_V4.5.4_ADM_L2_SPEC §2.4 line 374 — ISE named-threshold law requires thresholds be named constants with calib:
- severity: HIGH
- confidence: 0.92

## FINDING: literal 1e-9 epsilon without named constant in resting-side containment — missing oracle wiring
- layer: R25-mpse-oracle
- predicate: oracle.missing-wiring
- object: Contract
- file: mdve/resting-side.ts:64
- evidence: "if (r.bottom >= c.bottom - 1e-9 && r.top <= c.top + 1e-9)"
- spec: src/mdve/resting-side.ts:36 "The 1e-9 epsilon absorbs the floating-point boundary" and src/mdve/shadow-agent.ts:452 SHADOW_FLAG_EPSILON = 1e-9 — named calibration required, literal carries no calib: provenance
- severity: HIGH
- confidence: 0.90

## FINDING: literal 1e-9 epsilon without named constant in probe-side pool filter — missing oracle wiring
- layer: R25-mpse-oracle
- predicate: oracle.missing-wiring
- object: Contract
- file: mdve/setup-gen.ts:310
- evidence: "s.direction === 'LONG' ? z.defendedEdge >= probe - 1e-9 : z.defendedEdge <= probe + 1e-9"
- spec: src/mdve/shadow-agent.ts:452 SHADOW_FLAG_EPSILON = 1e-9 — "One epsilon for all three firewall comparisons — never three unnamed ladders"; literal 1e-9 literal is an unnamed ladder with no calib: provenance
- severity: MEDIUM
- confidence: 0.88

## FINDING: literal 1e-9 epsilon without named constant in recovery-shelf containment filter — missing oracle wiring
- layer: R25-mpse-oracle
- predicate: oracle.missing-wiring
- object: Contract
- file: mdve/setup-gen.ts:431
- evidence: "z.bottom >= s.top - 1e-9 && z.top <= dayHigh + 1e-9"
- spec: src/mdve/shadow-agent.ts:452 SHADOW_FLAG_EPSILON = 1e-9 with PLUTUS_V4.5.4_ADM_L2_SPEC §2.4 line 374 provenance; ISE law mandates named constant
- severity: MEDIUM
- confidence: 0.88

## FINDING: literal 1e-9 epsilon without named constant in recovery-shelf candle predicates — missing oracle wiring
- layer: R25-mpse-oracle
- predicate: oracle.missing-wiring
- object: Contract
- file: mdve/setup-gen.ts:435
- evidence: "c.open < z.bottom + 1e-9 && c.close >= z.center - 1e-9"
- spec: src/mdve/shadow-agent.ts:452 SHADOW_FLAG_EPSILON = 1e-9 — same canonical epsilon, same missing calib wiring; additional literals appear at mdve/setup-gen.ts:436 and :440 with identical pattern
- severity: MEDIUM
- confidence: 0.85

## SUMMARY
6 findings — 1 CRITICAL unguarded, 5 missing-wiring (HIGH/MEDIUM). The canonical epsilon `SHADOW_FLAG_EPSILON = 1e-9` is correctly defined and correctly applied in `validateAgainstAdmEnvelope` (`riskRaw <= SHADOW_FLAG_EPSILON`, `rewardRaw <= SHADOW_FLAG_EPSILON`, `rrr < floor - SHADOW_FLAG_EPSILON`) and via `PIVOT_EPSILON` in `brains/9-pillar-lobe.ts` (RED_HERRING — correctly named, calibrated). The derailments are:
1. **CRITICAL unguarded threshold**: `validateAgentDecisions` W-7 uses bare `d.E === d.SL` to gate RRR computability, while the spec binds W-7 to the same 1e-9 envelope as the firewall (floating-point dust at the boundary flips RRR from zero to epsilon-denominated phantom). Any sub-epsilon SL distance (e.g., 1e-10) bypasses the guard, emitting a degenerate pair that `validateAgainstAdmEnvelope` later correctly rejects — the warn-set and firewall disagree on what "zero" means.
2. **HIGH missing wiring**: W-4 closed-set check uses literal `< 1e-9` instead of `SHADOW_FLAG_EPSILON`, violating ISE named-threshold law (thresholds must be named constants with `calib:` provenance). No graph edge exists to a named constant; literal carries no provenance, enabling stale drift if spec epsilon changes.
3. **HIGH/MEDIUM missing wiring**: `resting-side.ts` and `setup-gen.ts` contain 6+ decision-gating containment checks (`r.bottom >= c.bottom - 1e-9`, `probe - 1e-9`, `s.top - 1e-9`, `z.bottom + 1e-9`, etc.) all using literal `1e-9`. Each gates a structural decision (rung type overwrite, probe-side pool selection, shelf floor selection). The correct named constant (`SHADOW_FLAG_EPSILON` or `PIVOT_EPSILON` per domain) exists but is not wired; literals have no `calib:` exempt comment.
Corrective pattern per ISE law: replace every literal `1e-9` gating a decision with the named `SHADOW_FLAG_EPSILON` (imported from `mdve/shadow-agent.ts` or a shared `constants` export) with `// calib: PLUTUS_V4.5.4_ADM_L2_SPEC §2.4:374` provenance, and replace bare `d.E === d.SL` with `Math.abs(d.E - d.SL) <= SHADOW_FLAG_EPSILON`. No stale-calibration (value 1e-9 matches spec) and no inverted epsilon (> vs <) found — the 9-pillar `> PIVOT_EPSILON` checks correctly flag deviation.
Graph status: all `graphify_*` calls failed (`mcp.callTool is not a function`); no EXTRACTED/INFERRED edges cited — evidence is verbatim file:line quotes, manually verified under targetRoot.

# Runtime-Grade Engineering — Plutus TS

## Definition

Runtime-grade software is software that **works correctly when executed in a real runtime environment**. Not software that compiles. Not software that looks correct. Software that **WORKS** — first try, real environment, real inputs, real errors.

## The Metric

There is exactly one metric that matters:

> **Does the code work when executed in a real runtime environment?**

If yes → ship it.
If no → fix it.
If "sort of" → it's a no. Fix it.

## 18-Step Engineering Pipeline

1. READ context library + build spec fully
2. PLAN architecture (execution_plan.md) + full runtime test suite
3. Write full pseudocode
4. Validate pseudocode against plan + context library
5. Save as Checkpoint 0 (prototype/boilerplate)
6. Engineer production-grade codebase from pseudocode
7. Test programmatically, document ALL bugs/derailments
8. Debug and fix everything — loop until perfect
9. Save as Checkpoint 1 (production-grade baseline)
10. Re-ingest runtime-grade quality standards
11. Audit against runtime-grade standards — overhaul
12. Save as Checkpoint 2 (runtime-grade baseline)
13. Audit vs spec/plan/pseudocode — debug loop until 100%
14. Save as Checkpoint 3 (sub-loops: 2.1, 2.2, 2.3...)
15. SETUP container test environment
16. EXECUTE full test suite in TUI container
17. Document ALL deviations — save Checkpoint 4 (sub-loops: 3.1...)
18. Generate overhaul log — loop until 100% mechanical verification

## Rules

- **Container test via tmux + docker exec -it ONLY.** `opencode run` is BANNED.
- **Triple evidence required.** ContainerSpawnResult.json + ContainerTestResult.json + TuiInteraction.json.
- **100% pass rate required.** Not 99%. Not 98%. 100%. Anything less triggers a debug loop.
- **Semantic enforcement on every write.** Merkle chain + evidence DB.
- **Merkle chain evidence.** Every enforcement action is cryptographically linked.
- **Evidence on disk is the ONLY proof.** Claims without evidence files are THEATRICAL.

## Trading-Specific Rules

In addition to the general runtime-grade rules, Plutus enforces:

1. **BoM-only entries** — MoM zones are TP targets only (90% win rate differentiator)
2. **Single TP architecture** — one TP point per setup, not three
3. **Weekend prohibition** — all positions flat by Friday NY close (CS5)
4. **SL cap 150 pips** — hard cap (CS8)
5. **Red folder deferral** — 30 min before/after high-impact news (CS7)
6. **DXY directional only** — pairs have own price levels, no arithmetic conversion
7. **TimesFM is prior not signal** — augments never overrides structural rules
8. **Entry proximity validation** — entries >30 pips from spot (DXY) get rejected
9. **No ICT/SMC terminology** — this is Trident, not internet guru methodology
10. **Pip scale** — user's 1 pip = system's 10 pips (5-digit broker)

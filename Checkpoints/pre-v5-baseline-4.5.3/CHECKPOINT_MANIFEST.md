# CHECKPOINT MANIFEST — pre-v5-baseline-4.5.3

**Token:** `pre-v5-baseline-4.5.3` (hyphens only, no spaces)
**Date:** 2026-09-15
**Repo:** `/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/PLUTUS/agent`
**Branch / SHA at snapshot:** `plutus/main` (nested git; parent Shared_Workspace is a different repo)
**What this is:** the working tree we are about to build V5 from — 4.5.3 CLEAN_BASELINE src at repo root plus hydra pin pack. Not a ship. Not a green battery.

## Frozen pair (verified at snapshot)

```
src/mdve/sl-lmv.ts       912940832fac44bc838d53423cbb921eff501de60a9f2641bf20c1d1497eaeab
src/mdve/trade-dedup.ts  33914c897e7775402eefd7d13a5d3675667a2ace576b55a689bc864401a680e4
```

Both MATCH `Checkpoints/v4.5.3_CLEAN_BASELINE` and HEAD.

## Contents (counts)

- `src/**/*.ts` = 149
- files in this checkpoint = 250 + this manifest + structure doc
- hydra pack: MASTER_PROMPT.md PATHS.md 5 SCOPE files LAUNCH_GOAL.txt
- V5 spec: MASTER_CONTEXT/PLUTUS_V5_FULL_BUILD_SPEC.md
- injector: MASTER_CONTEXT/PLUTUS_MASTER_CONTEXT_INJECTOR.md
- 4.5.3 MANIFEST + report-v452.ts + report_v452.md copied

## Battery / tsc / dist

- dist/: ABSENT (never built on this checkout)
- `bun test`: 0 test files on this tree (honest — not green)
- tsc: not used as a ship gate at this snapshot
- bun.lock: present (install happened; 169 packages on disk, node_modules NOT copied)

## State

- VALIDATED: frozen pair SHAs, 4.5.3 src present, hydra pin files present
- PENDING: entire V5 W0–W9; GATE-CLASS scripts not on this tree yet
- NOT a v4.5.3_CLEAN_BASELINE duplicate: that sealed copy stays next door; this snapshot is the *working* fork plus hydra dirs

## Honest gaps (required)

1. No `dist/` / no dist SHA — nothing to fingerprint as a deployable.
2. No `context_management/` (11 canon docs ABSENT on this checkout).
3. No BUILD_REPORT.md DEBUG_LOG.md FAILURE_LOG.md SPEC_VIOLATION_LOG.md TESTING_LOG.md at project root — recorded ABSENT, not copied.
4. Empty lock roots (`src/e1` `src/e2` `src/card` `src/visual` `src/aether` `src/kernel` `src/jesl` `src/substrate` `src/runtime` `src/enforcement` `specs/*` `scripts`) were mkdir'd for hydra ownership; they are empty on purpose.
5. `src/graphify-out` `src/corbell-data` `*.db` excluded (gitignore / size / secrets class).
6. Overlay `plutus/pre-v5-overlay` @ f5ee436 is NOT in this checkpoint; it remains a git branch copy-source.

## Next work

Pin `hydra/LAUNCH_GOAL.txt`. First real code lands in foundation W0 (`specs/mpse`). Do not treat this checkpoint as a green V5 baseline.

## Lock mode

MODE B — mutable working snapshot. No chattr. Refresh in place only by making a NEW token, never by silently editing this folder after commit.

# PLUTUS V5 HYDRA PATHS — lock ownership (2026-09-15)

Workspace git root: `/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/PLUTUS/agent`
HEAD at pin time: `plutus/main` @ `282b1a3` (4.5.3 CLEAN_BASELINE fork)
Overlay copy-source (READ, never merge wholesale): `plutus/pre-v5-overlay` @ `f5ee436`

## ORCHESTRATOR-ONLY (locks READ, change-requests route to /goal)

- `package.json` `bun.lock` `tsconfig.json` `tsconfig.substrate.json` `.gitignore`
- `src/types.ts` `src/index.ts` `src/mdve/sl-lmv.ts` `src/mdve/trade-dedup.ts`
- `Checkpoints/**` (goal writes checkpoints; locks never)
- `MASTER_CONTEXT/**` (read-only doctrine)
- `hydra/**` (this pack)
- `BUILD_REPORT.md` `DEBUG_LOG.md` (goal appends after every audited wave)

## LOCK WRITE SETS (DISJOINT)

| token | write |
|---|---|
| god-loop-foundation | `specs/mpse/**` `specs/fixtures/**` `specs/harness/**` `scripts/**` `src/jesl/**` `src/substrate/**` `src/runtime/**` |
| god-loop-e1 | `src/e1/**` |
| god-loop-e2 | `src/e2/**` |
| god-loop-cardvis | `src/card/**` `src/visual/**` `src/aether/**` |
| god-loop-kernel | `src/kernel/**` `src/enforcement/**` |

## FROZEN (byte-identical every wave)

- `src/mdve/sl-lmv.ts` = `912940832fac44bc838d53423cbb921eff501de60a9f2641bf20c1d1497eaeab`
- `src/mdve/trade-dedup.ts` = `33914c897e7775402eefd7d13a5d3675667a2ace576b55a689bc864401a680e4`

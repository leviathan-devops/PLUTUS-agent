# plutus/grok-prototype

Grok V5 write line. `plutus/main` is the OMP/CLEAN_BASELINE review parent.

| ref | commit | meaning |
|---|---|---|
| `plutus/main` | `e99377f` | CLEAN_BASELINE + OMP overlay. Do not commit here from this worktree. |
| `plutus/grok-prototype` | this branch | LIVE verified tree imported, then V5 overhaul. |

Worktree: `PLUTUS/agent/.worktrees/grok-prototype`

Compare:

```bash
git -C PLUTUS/agent log --oneline plutus/main..plutus/grok-prototype
git -C PLUTUS/agent diff plutus/main...plutus/grok-prototype
```

Frozen pair (pre-commit enforced):

- `src/mdve/sl-lmv.ts` `912940832fac44bc838d53423cbb921eff501de60a9f2641bf20c1d1497eaeab`
- `src/mdve/trade-dedup.ts` `33914c897e7775402eefd7d13a5d3675667a2ace576b55a689bc864401a680e4`

Review lifecycle: ripwire PreToolUse (kernel deny-once) · `ocr delegate` after each implementation wave · `/workflow open-code-review` when preview `reviewable_count >= 6` · never steal bundled `/review` (GitHub).

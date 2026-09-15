#!/usr/bin/env bash
# scripts/check-frozen.sh — assert the frozen pair is byte-identical (FIREWALL red on drift).
# Expected SHAs are pinned in hydra/PATHS.md. Any mismatch = HARD STOP, exit 1.
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

EXP_SL="912940832fac44bc838d53423cbb921eff501de60a9f2641bf20c1d1497eaeab"
EXP_DD="33914c897e7775402eefd7d13a5d3675667a2ace576b55a689bc864401a680e4"

GOT_SL="$(sha256sum src/mdve/sl-lmv.ts | awk '{print $1}')"
GOT_DD="$(sha256sum src/mdve/trade-dedup.ts | awk '{print $1}')"
echo "frozen sl-lmv.ts      : $GOT_SL"
echo "frozen trade-dedup.ts : $GOT_DD"

RED=0
[ "$GOT_SL" = "$EXP_SL" ] || { echo "FROZEN-FIREWALL RED: src/mdve/sl-lmv.ts drift" >&2; RED=1; }
[ "$GOT_DD" = "$EXP_DD" ] || { echo "FROZEN-FIREWALL RED: src/mdve/trade-dedup.ts drift" >&2; RED=1; }
if [ "$RED" = 1 ]; then
  echo "FROZEN: MISMATCH — HARD STOP" >&2
  exit 1
fi
echo "FROZEN: MATCH"

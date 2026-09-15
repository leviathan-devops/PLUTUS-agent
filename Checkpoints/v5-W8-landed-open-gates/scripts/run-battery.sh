#!/usr/bin/env bash
# scripts/run-battery.sh — W1 GATE-CLASS wrapper (gates 0-3, stop on first red).
#
#   gate 0: python3 scripts/rebuild-fixture.py --verify
#   gate 1: bun report-v452.ts  (+ frozen sha x2 via check-frozen.sh)
#   gate 2: bun diag-reasoning-chain-golden.ts --day=2026-07-06
#   gate 3: sha256sum frozen pair (check-frozen.sh, final assert)
#
# A missing entry point or fixture is a LOUD fail, never a silent skip.
# W1 gate = this script exists + executable; gates may be red until W2+ lands.
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

pass() { echo "GATE-CLASS gate $1: PASS — $2"; }
red()  { echo "GATE-CLASS gate $1: RED — $2" >&2; echo "STOP on first GATE-CLASS red." >&2; exit 1; }

echo "═══ GATE-CLASS 0: fixture verify ═══"
python3 scripts/rebuild-fixture.py --verify \
  && pass 0 "fixture verify" \
  || red 0 "rebuild-fixture.py --verify failed (see FIXTURE-VERIFY line above)"

echo "═══ GATE-CLASS 1: report-v452 + frozen sha x2 ═══"
[ -f report-v452.ts ] || red 1 "report-v452.ts missing from repo root"
bun report-v452.ts || red 1 "bun report-v452.ts exited non-zero"
bash scripts/check-frozen.sh || red 1 "frozen pair drift after report run"
pass 1 "report-v452.ts + frozen MATCH"

echo "═══ GATE-CLASS 2: golden gate day=2026-07-06 ═══"
[ -f diag-reasoning-chain-golden.ts ] \
  || red 2 "diag-reasoning-chain-golden.ts missing from repo root (lands W6+; honest gap, not green)"
bun diag-reasoning-chain-golden.ts --day=2026-07-06 \
  || red 2 "golden gate exited non-zero"
pass 2 "golden gate day=2026-07-06"

echo "═══ GATE-CLASS 3: frozen pair final assert ═══"
bash scripts/check-frozen.sh || red 3 "frozen pair final assert"
pass 3 "frozen MATCH"

echo "GATE-CLASS: ALL GREEN"

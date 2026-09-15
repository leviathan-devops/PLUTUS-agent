# SCOPE — god-loop-kernel

WRITE: src/kernel/** src/enforcement/**
NEVER: src/e1 src/e2 src/card src/visual specs frozen pair

## Deliverable
Card loader + L1 telescope L2 pressure L3 fib L4 cascade L5 warhead +
trade-computer orchestrator + journal + Leviathan report generator/validator
+ PBA/PTA sentinels.

## Depends
plutus-card-v1 schema from cardvis. Do not re-derive E1/E2 inside kernel.

## Gates (V5 SC-16..SC-27 subset owned here)
- every trade traces card→L1→L2→L3→L4→L5 in journal
- EU #3 + GU #7 + EU #6 ≤3p; golden ≥14/21; DXY 6/6 held
- Monday 5/5 ≤3p; report sha ×2; f(T) VALID
- Report Validator PASS
- Bug Hunter conformanceZero on touched kernel files
- known-bad: card with no DXY inverse → L4 FAIL token, trade not emitted

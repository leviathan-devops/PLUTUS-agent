# SCOPE — god-loop-cardvis

WRITE: src/card/** src/visual/** src/aether/**
NEVER: src/e1 src/e2 src/kernel specs frozen pair

## Deliverable
TV draw + screenshot capture + Aether Chart Verifier (binary PASS/FAIL +
context-on-fail, native PNG `read` grade — no external-VLM-only). Plutus
Card zod schema + assembler + validator. STEP A/B grounding W-1..W-7.

## Depends
e1 ZoneMapSnapshot + e2 DesignationEvents types. Card schema is the ONLY
coupling to kernel.

## Gates (V5 SC-11..SC-15)
- 12 screenshots (4 TF × 3 pairs) with GRADE:PASS or FAIL+context (never silent)
- corrupt PNG known-bad → GRADE:FAIL + context
- zod validate golden-week card exit 0
- orphan designation IDs = 0
- W-1 fires on non-numeric forward-position

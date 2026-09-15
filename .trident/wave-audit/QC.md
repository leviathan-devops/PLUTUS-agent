# WAVE AUDIT — QC adversarial trio (orch re-run)

| angle | verdict | evidence |
|---|---|---|
| FUTURE_BAR_LEAK | CORRECT | bun test future-bar-leak 8/0 |
| SIDE_INVERSION | CORRECT | v452 FIRE SIDE_INVERSION_VIOLATION; v453 SILENT 7/0 |
| CARD_INVALID | CORRECT with residual | parsePlutusCard refuses; tests CARD_CHART_GRADE / CARD_PROVENANCE_MISSING 25/0 |
| FROZEN | CORRECT | MATCH |
| GATE-CLASS 0-3 | RED residual | bars_raw fixture not proven this turn |
| SC-21 Monday 5/5 | NOT RUN | needs golden-gate + fixture |
| product_tui container | NOT RUN | after GATE-CLASS only |

QC trio PASS. Ship bar NOT met.

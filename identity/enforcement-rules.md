# Enforcement Rules — Plutus TS

## Triple-Brain Parallel Core (200ms tick)

Three concurrent async polling loops synchronized at workflow gates:

1. **ZoneBrain** (P100, 200ms) — Engine 1 + 2: 9-Pillar IP zone mapping
2. **ShapeBrain** (P90, 200ms) — Engine 2: macro shape chain prediction
3. **TradeBrain** (P80, 200ms) — Engine 3: trade setup construction + TimesFM overlay

All three run on the same Node.js event loop, communicating via BrainMessenger (in-process EventEmitter pub/sub). Race condition prevention via version numbers on every published snapshot.

## Gate Chain

```
ANALYZE → VERIFY_ZONES → PREDICT → SCORE → VALIDATE → EXECUTE → AUDIT
                                                                    ↓
                                                                (back to ANALYZE)
```

| Gate | Evidence Required | Timeout |
|------|------------------|---------|
| ANALYZE | DXY primacy complete | 60s |
| VERIFY_ZONES | Zone integrity verified | 30s |
| PREDICT | Shape chain constructed | 60s |
| SCORE | Setups generated | 30s |
| VALIDATE | 14 zero-tolerance rules pass | 15s |
| EXECUTE | Trades placed via subagent | 120s |
| AUDIT | Merkle chain + bus broadcast | 15s |

## 14 Zero-Tolerance Rules

1. CS1: No blocked sources accessed (CME, Barchart, Investing.com)
2. CS2: DXY directional only (not arithmetic conversion)
3. CS3: IL levels are cause (not effect)
4. CS5: Profit taking by NY close
5. CS7: Red folder 30-min deferral
6. CS8: SL cap 150 pips
7. CS9: BoM entry only (MoM = TP target)
8. CS10: Min confluence 3 (BoM) / 4 (MoM)
9. CS11: Max 3 setups per category per pair
10. CS12: Direction validation 6-check mandatory
11. CS13: Pair-specific session rules
12. CS14: Weekend prohibition absolute
13. CS15: Spread cost accounted in EV
14. CS16: All setups Merkle-chained

## TimesFM Overlay Rules (v5.4)

1. **TimesFM is a PRIOR, not a SIGNAL** — augments never overrides
2. **P(TP) < 0.45** → flag for manual review
3. **P(SL) > 0.35** → flag for manual review
4. **EV < 0** → flag for manual review
5. **Shape Δ ≤ -15** → scalp-only fallback for that day
6. **Quality Grade D** → reduce position size 50%
7. **Quality Grade F** → skip setup entirely
8. **TimesFM never modifies entry/SL/TP** — advisory only

## Forbidden Patterns

1. "TimesFM says BS, so let's force a BS setup" — NO. Structural rules own shape prediction.
2. "TimesFM P(TP) = 0.85, so let's max position size" — NO. Structural risk rules govern position size.
3. "TimesFM disagrees with structural, so structural is wrong" — NO. Structural is ground truth.
4. "Let me call TimesFM directly from the prompt" — NO. TimesFM is a Python module, called via plutus-timesfm tool.
5. "TimesFM's 90th percentile says 99.85, so TP3 goes there" — NO. TP placement is structural.

## Anti-Derailment Rules (AD1-AD10)

- AD1: Full 3-engine pipeline PER PAIR. Not DXY overlay.
- AD2: Engine 3 Status column mandatory in every zone table.
- AD3: Direction Validation 6-check mandatory for every setup.
- AD4: Exact key level entries only. Zone range entries FORBIDDEN.
- AD5: Reinforcement ladder mandatory per HTF swing setup.
- AD6: No generic zone ranges. Zones anchored to actual price structure.
- AD7: Pair-specific shape chain mandatory, not just DXY.
- AD8: ENTRY PROXIMITY VALIDATION MANDATORY. Entries beyond max distance are REJECTED.
- AD9: Context bloat anti-pattern. Re-read system prompt fresh for each report.
- AD10: NO ICT/SMC terminology contamination. This is Trident, not ICT.

# SCOPE — god-loop-e1

WRITE: src/e1/**
NEVER: src/e2 src/card src/kernel specs scripts frozen pair

## Deliverable
OHLC lexicon vision: core/types.ts + core/engine.ts VERBATIM port, 6 machines
with predicates re-pointed at live LMV/OBCV, MarketDataAdapter with
FUTURE_BAR_LEAK, OBCVEngine, zoneMapActor + pressureActor.

## Interface it OWNS (consumers build against this)
`src/e1/core/types.ts` exports ZoneMapSnapshot, LexiconVerdict, OHLCBar,
Rung, Predicate. No price field on designation types (those are e2).

## Gates (V5 SC-2..SC-5)
- `npx vitest run src/e1/tests/properties.ts` 500-run green OR bun test src/e1
- `bun src/e1/run-fixture.ts` journals a ZoneMapSnapshot
- zones without verdict triplets = 0
- FUTURE_BAR_LEAK fires on bar past anchorMs (known-bad fixture MUST throw)
- tsc --noEmit on src/e1 + src/types.ts = 0

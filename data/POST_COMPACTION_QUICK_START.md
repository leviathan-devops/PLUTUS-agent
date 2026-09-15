# POST-COMPACTION QUICK START

**Read this FIRST after compaction.**

## What This Is

The full handover package at `data/HANDOVER_PACKAGE_POST_COMPACTION.md` contains the complete stream-of-consciousness from this session. It has:
- All 37 fundamental trading laws
- All Engine 1 + Engine 2 fixes applied (16 deviations corrected)
- Engine 3 visual intelligence architecture
- All code locations and file paths
- What NOT to touch (Engine 1 + 2 are done)
- What still needs to be built
- The user's frustration pattern (what NOT to do)
- Immediate next steps

## Current State (as of 2026-07-17 16:30 UTC+4)

| Component | Status |
|-----------|--------|
| Engine 1 (IP zones) | ✅ FIXED — 6 deviations corrected. DO NOT TOUCH. |
| Engine 2 (Shape chain) | ✅ FIXED — 10 deviations corrected. DO NOT TOUCH. |
| Engine 3 (Visual intelligence) | ✅ BUILT — TvChartController + VisualZoneLobe + VisualSetupGenerator. NOT YET TESTED in container. |
| CS12 (6 direction checks) | ✅ FIXED — visual-setup-generator now produces 6 checks. |
| GBP/EUR 0-setup issue | ✅ FIXED — direction now zone-based, not shape-based. |
| VC daemon dependency | ✅ FIXED — self-contained playwright-core over CDP :9228. |
| SS terminology | ✅ FIXED — "Sideways" → "Swing Scalps" across all files. |
| Bullish/Bearish shape lists | ✅ REMOVED — direction from zone type, not shape. |

## Codebase State
- TSC: 0 errors
- Bun build: SUCCESS (1.19 MB, 125 modules)
- Pipeline: 5,641 lines
- shape-brain.ts: 1,341 lines (Engine 2 fixes)
- 9-pillar-lobe.ts: 2,371 lines (Engine 1 9-pillar fixes)
- Engine 3 files: 145 + 841 + 919 + 254 + 354 = 2,513 lines
- `bun test`: 13 passed

## Immediate Next Steps
1. Read `data/HANDOVER_PACKAGE_POST_COMPACTION.md` fully
2. Verify TSC + build pass
3. Deploy to container, run E2E test for July 6 week
4. Check: setups generated? GBP/EUR working? Visual layer connecting?
5. Score against July 6-10 price action
6. Fix remaining issues (spot price, TP distance, war narrative)
7. Backtest 3+ weeks

## The User's Core Message
- Engine 1 + 2 are A+ solid in the prompt, corrupted in code. FIXED. Do not change them.
- Engine 3 is the visual intelligence layer that needs to work correctly on top of Engine 1 + 2.
- Visual zones come from CANDLESTICK PATTERN RECOGNITION (chart screenshots + VLM), not from OHLC statistics.
- The user's trading strategy is the gold standard. The pipeline must reproduce it exactly.
- NO HALLUCINATION. NO THEATRICAL REPORTS. JUST WORKING CODE.

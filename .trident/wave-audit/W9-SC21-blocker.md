# W9 SC-21 blocker — orch 2026-09-15

**HEAD:** af74afc omp-worker-1  
**Golden:** 2/5 (DXY L HIT Δ2.7, GU L HIT Δ1.3). Exit 1.  
**Frozen:** MATCH  
**v5-W9-converge:** ABSENT (not earned)

## EU LONG 1.14110

Fortress EUR/USD|1H|1782990000000|1.14004 DEMAND [1.14004-1.14147] exists.  
lmv.table: 0 BUY_SIDE rows fully inside that band. Interior-reaction falls to [1.14150-1.14189] → E 1.14189 Δ7.9p MISS.

## Why nested LQZ cannot be invented

R21: LQZ 1H→30m→15m. Fixture `rebuild-fixture.py --verify`: **30m/15m n=0 GAP** for DXY/EU/GU on 2026-07-06.  
W9LqzNest: swing cluster [1.14116-1.14127] votes SELL_SIDE; lmv.ts:554 reaction gate fails (BODY_DEFEND only, MIN_DISTINCT_KINDS=2).  
Inserting 1.14110 constants = R29 price-anchor. Stopped. No lmv.ts/lqz-matrix.ts edit.

## Ship bar

SC-21 FAIL. GATE-CLASS golden FAIL. Do not stamp COMPLETE. Do not create v5-W9-converge.

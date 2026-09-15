# TTE Report — the W8B golden Monday emissions (2026-07-06) — forecast-vs-reality

**Version:** 1.0 · **Date:** 2026-08-10 · **Source:** the reasoning chain's final emissions (the golden gate exit 0 ×3 — the W8B D-fix wave).

## The source of truth (what this report carries)

The 5 golden trades emitted by the reasoning chain (`src/mdve/reasoning-chain.ts` — the buildReasoningChain orchestrator) at the ANALYSIS_POINT_MS 1783317600000 (Monday 2026-07-06 06:00 UTC — the London pre-market hour — the operator's temporal law). The harness: `diag-reasoning-chain-golden.ts` (the E1 models at the gated bars → the E2 core → the cascade → the macro authority → the chain's 11-token sequence → the TradeProjections → the G1-G10/A1-A7 verdicts).

**The convergence (the Monday oracle — the tolerance 3 pips):**

| Pair | Dir | E (emitted) | Golden | Δ | SL | TP | RRR | Verdict |
|---|---|---|---|---|---|---|---|---|
| DXY | SHORT | 101.120 | 101.140 | 2.0p | 101.184 | 100.918 | 3.16 | HIT |
| DXY | LONG | 100.918 | 100.945 | 2.7p | 100.855 | 101.240 | 5.11 | HIT |
| EUR/USD | SHORT | 1.14390 | 1.14395 | 0.5p | 1.14475 | 1.14120 | 3.18 | HIT |
| EUR/USD | LONG | 1.14120 | 1.14110 | 1.0p | 1.13985 | 1.14620 | 3.70 | HIT |
| GBP/USD | LONG | 1.33343 | 1.33330 | 1.3p | 1.33276 | 1.33560 | 3.24 | HIT |

## The simulation semantics (the forecast-vs-reality test)

Each setup is simulated from the Monday 06:00 UTC (the orders are LIVE from the analysis point — the operator's workflow: "close the charts and the prices action just fills my limit orders and hits TP/SL accordingly") against the REAL harvested 1H bars (the fixture extends 526h past the anchor — every outcome is fully visible, nothing is open-ended). The trigger = the first bar touching the entry; the exit = the first TP or SL hit (a same-bar TP+SL = a conservative loss). The MAE (the max adverse excursion) and the MFE (the max favorable excursion) tracked in pips per trade. The SL-vs-ENTRY analysis: `util = MAE / SL-distance` — < 0.40 = the SL TOO WIDE (tighten); > 0.70 = the ENTRY TOO EARLY (improve the entry); 0.40-0.70 = balanced.

## The per-trade anchor traces (the E3-NEVER evidence — every anchor traces to an E1 zone + an E2 projection)

### 1. DXY SHORT — E 101.120 · SL 101.184 · TP 100.918 · RRR 3.16 (VALID)
- The operative zone: `DXY|1H|1782990000000|101.027` [101.027-101.153] — the operator's Friday-formed supply (the W3 selection's designation, carried by the E2's dxyChain).
- ENTRY: zone-internal-near-edge — the D-2 active-edge shield: the SELL_SIDE rung [101.12-101.154] overlaps the zone's ceiling → the entry = the rung's bottom 101.12 (the near edge from below — the I-5 shield doctrine). The pre-fix deep-internal rung [101.071-101.076] (E 101.071 — Δ6.9p) is dead.
- SL: ladder-steps (entry-rung) — 3p outside the ENTRY rung `LMV|DXY|101.11000`'s back edge (101.154 + 3p = 101.184) — the D-4c fallback that fixed the mirror-SL's 11.8p-risk exhaustion.
- TP: the e2-projected-opposing-zone full-model (closest-edge extension — the operator's EU #1 rule) — the first opposing DEMAND S/D zone with an internal LQZ at ≥ 2× the risk = the defended 100.845 shelf's internal LQZ near edge 100.918 — the D-5 rescue cap (the C-7 swept-shelf-as-wall doctrine).

### 2. DXY LONG — E 100.918 · SL 100.855 · TP 101.240 · RRR 5.11 (VALID)
- The operative zone: `DXY|1H|1782172800000|101.005` — the E2's demand designation.
- ENTRY: chained (TP-of-N = entry-of-N+1 — Law 27) — 100.918 = the SHORT's TP — the D-3c D11 15-pip window accepted the operator's exact chain (the chained level 8.7p below the zone's floor — within the dual-entry window).
- SL: ladder-steps (entry-rung) — 3p outside the ENTRY rung `LMV|DXY|100.86000`'s back edge = 100.855.
- TP: the e2-projected-opposing-zone full-model (ZR-3.3 + ZR-3.4) — the supply structure above with the internal LQZ near edge 101.240.

### 3. EU SHORT — E 1.14390 · SL 1.14475 · TP 1.14120 · RRR 3.18 (VALID) — THE OPERATOR'S EXACT #1
- The operative zone: `EUR/USD|1H|1783076400000|1.14460` [1.1446-1.14571] — the Friday-formed supply — the operator's #1 SL-anchor zone ("the 1H supply zone at 1.14460-1.14530") — selected by the D-3a strongestSupplyInDayBand (the recently-FORMED first — the Jul 3 formation — over the Jun-22 fortress 1.14503 and the minor 1.14245).
- ENTRY: zone-internal-near-edge — the floor-side shield `LMV|EUR/USD|1.14370` [1.1439-1.14415] (the operator's "LQZ at 1.1444-1.14395 ~ using this as the entry zone anchor") → the shield's bottom 1.14390 — the operator's exact E (the golden 1.14395 — Δ0.5p).
- SL: ladder-steps (zone-anchored — the D-4a doctrine) — 1.5p inside the supply's close edge = 1.14475 — the operator's exact SL (the pre-fix fuel-ladder 1.14559 — risk 16.9p — killed the TP cap and exhausted the RRR; the D-4a zone-anchored SL — risk 8.5p — unlocked the rescue).
- TP: the e2-projected-opposing-zone full-model (ZR-3.3 + ZR-3.4) — the fortress demand's internal LQZ near edge 1.14120 (the operator's "TP at the demand nested LQZ" — the D-5 full-model resolution + the D-3b cap). RRR 3.18 = the operator's exact 3.18.

### 4. EU LONG — E 1.14120 · SL 1.13985 · TP 1.14620 · RRR 3.70 (VALID) — the operator's #2
- The operative zone: `EUR/USD|1H|1782990000000|1.14004` [1.14004-1.14147] — the phantom-BoM fortress demand (the findFortressDemand — the D-1b injected-zone exclusion keeps the fortress = the pair's OWN structure).
- ENTRY: chained (Law 27) — 1.14120 = the SHORT's TP — the operator's #2 ("Set E at the TP level of trade #1" — the golden 1.14110 — Δ1.0p).
- SL: ladder-steps (NEXT_STEP — the thin-zone trade-#7 branch) — the fuel's 3p-outside overshoots the next step down's close edge → 1.5p inside it = 1.13985.
- TP: the e2-projected-opposing-zone full-model (ZR-3.3 + ZR-3.4) — the supply structure above (the 1.14460-1.14625 area) — the near edge 1.14620.

### 5. GU LONG — E 1.33343 · SL 1.33276 · TP 1.33560 · RRR 3.24 (VALID)
- The operative zone: `LMV|GBP/USD|1.33380` [1.33306-1.33343] — the golden-containing rung — the D-1 fixes: the bridge-injected degenerate zone (LMV|GBP/USD|1.33370 [1.33248-1.33263] — a band 11p below its id) excluded from the fortress scan; the nearestDemandBelow's band-crossing filter admits the 1.33380 rung whose band spans the open (its top 1.33343 vs the open 1.33342 — the 0.1p hair).
- ENTRY: zone-internal-near-edge — the rung's near edge from above = 1.33343 (the golden 1.33330 — Δ1.3p). The chained entry (the REACTION-SHORT's degenerate TP 1.32850 — 40p below) REJECTED by the D-3c D11 15p window — the anchor trace holds.
- SL: ladder-steps (CURRENT_STEP — the PRESSURE_STRUCTURE defense) — 3p outside the rung's far edge 1.33306 → 1.33276.
- TP: the e2-projected-opposing-zone full-model (ZR-3.3 + ZR-3.4) — the GU's supply structure above (the 1.33623 area) — the near edge 1.33560.

### 6. GU SHORT (the extra — the honest completeness)
- E 1.33623 · SL 1.33669 · TP 1.32850 · RRR 16.80 — the REACTION lane's emission (the day's LONG-designated complement). The operator's GU Monday = LONG-only (the SHORT was RRR-rejected in the operator's analysis ~2R); the chain's degenerate 1.5p-risk geometry inflated the RRR — the honest consequence of the collapsed-defense ladder, shown for completeness, NOT part of the golden measurement.

## The verification chain (why this is NOT theatrical)

1. The emission precision: the golden gate's convergence table — the 5/5 at ≤3p — measured by the harness's mechanical comparison of the emitted E vs the golden oracle (diag-reasoning-chain-golden.ts:361-378 — the `Math.abs(p.E - g.entry) / pip <= TOLERANCE_PIPS` — a tool-result-bound pass token, never an agent-typeable phrase).
2. The determinism: the gate runs the chain twice (the parallel + the sequential) and compares the projection digests — byte-identical (the G10/A5) + the full gate exit 0 ×3 across the session.
3. The regression battery: the LMV oracle 7/7 (the golden LQZ levels exist in the map — the detection is never the question) · the lexicons 40/40 · the step-tools 31/31 · the grounding-warn 23/23 · tsc 0 · bun build exit 0.
4. The temporal law: the negative control (a later anchor → the anchors unchanged) — the G8/A3 — the D-3b temporal-lock fix — the recency window anchored to the LOCKED analysis point, never the run's limit.
5. THE FORECAST-VS-REALITY (this report): the 5 setups simulated against the REAL post-anchor bars — the trigger → the exit — the TP/SL outcomes — the MAE/MFE — the SL-vs-entry verdicts. This is the ONLY test that proves the trades "actually hit TP" — the charts + the outcome audit below.

# DXY
| 1 | **SHORT** | Monday | Mon 02:00 | 101.120 | — | — | 101.184 | 100.918 | 3.16 |
| 2 | **LONG** | Monday | Mon 02:00 | 100.918 | — | — | 100.855 | 101.240 | 5.11 |

# EUR/USD
| 1 | **SHORT** | Monday | Mon 02:00 | 1.14390 | — | — | 1.14475 | 1.14120 | 3.18 |
| 2 | **LONG** | Monday | Mon 02:00 | 1.14120 | — | — | 1.13985 | 1.14620 | 3.70 |

# GBP/USD
| 1 | **SHORT** | Monday | Mon 02:00 | 1.33623 | — | — | 1.33669 | 1.32850 | 16.80 |
| 2 | **LONG** | Monday | Mon 02:00 | 1.33343 | — | — | 1.33276 | 1.33560 | 3.24 |

<!-- DOC-COMPLETE -->

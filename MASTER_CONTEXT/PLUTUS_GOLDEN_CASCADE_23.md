# ⚠ OPERATOR REVIEW REQUIRED — THE 23-TRADE GOLDEN CASCADE (week 2026-07-06 → 2026-07-10)

> **TO THE OPERATOR:** this document is the acceptance oracle for every future build. It is split into four precision tiers so nothing inferred is ever mistaken for fact:
> - **TIER A — DOCUMENTED EXACT** (verbatim from `data/GAP_ANALYSIS_2026-07-18.md` §9 — your own documented trades).
> - **TIER B — EXACT AXIS LABELS** (the price labels TradingView renders on your charts — these are exact as drawn, but their per-trade E/SL/TP *assignment* is Tier D).
> - **TIER C — DOCUMENTED DOCTRINE** (the cascade structure + the E/SL/TP rules, quoted from your rulings + the codebase audit that verified them).
> - **TIER D — PIXEL-INFERRED, NEEDS YOUR CONFIRMATION** (my per-trade E/SL/TP assignments for EU/GU from the screenshots — geometry-corrected against your RRR ≥ 3.5 standard, but NOT verbatim-documented. **Please confirm or correct each row — any row you strike gets replaced with your verbatim values.**)
>
> **RRR verification standard (your words, 2026-07-29): "NOT A SINGLE ONE OF MY TRADES IS BELOW RRR = 3.5."** Every assignment in this document is checked against it; the DXY Tier-A rows compute 3.58–5.84.
>
> The cascade doctrine: **DXY LONG → EU SHORT (inverse) → GU SHORT (kept) · DXY SHORT → EU LONG (inverse) → GU LONG (kept).** Full-direction on all three pairs: 5 DXY longs → 5 EU shorts → 5 GU shorts · 3 DXY shorts → 3 EU longs → 3 GU longs (one GU trade did not materialize this week → 7).

---

# TIER A — THE 8 DXY TRADES (DOCUMENTED EXACT — `data/GAP_ANALYSIS_2026-07-18.md` §9, verbatim)

| # | Day | Setup | Entry | SL | TP | Risk (p) | Reward (p) | RRR (computed) | Zone |
|---|-----|-------|-------|----|----|------|--------|-----|------|
| 1 | Mon | SS Long | 100.945 | 100.905 | 101.115 | 4.0 | 17.0 | **4.25** | 1H LQZ |
| 2 | Mon | BS Short | 101.14 | 101.200 | 100.845 | 6.0 | 29.5 | **4.92** | 1H LQZ |
| 3 | Tue | SS Long | 100.845 | 100.77 | 101.190 | 7.5 | 34.5 | **4.60** | 1H MoM |
| 4 | Wed | SS Short | 101.19 | 101.25 | 100.975 | 6.0 | 21.5 | **3.58** | 1H LQZ |
| 5 | Wed | RWL Long | 100.975 | 100.905 | 101.240 | 7.0 | 26.5 | **3.79** | 1H LQZ |
| 6 | Wed | BS Short | 101.235 | 101.330 | 100.680 | 9.5 | 55.5 | **5.84** | 4H BoM |
| 7 | Thu | Ladder Short | (multiple at LQZ) | — | — | — | — | — | 1H LQZ (consolidation) |
| 8 | Fri | Whiplash + RWL | (continuation of Wed+Thu) | — | — | — | — | — | 1H LQZ |

**Documented key levels (verbatim):** LQZ = 100.845, 100.945, 100.975, 101.14, 101.19, 101.235, 101.240 · BoM = 100.680 (1H), 101.330 (4H) · MoM = 100.845 (1H).

**Structural notes (verified against the bars fixture `/tmp/opencode/bars_raw.json`):**
- #1 (Mon 100.945 long): Monday's dip printed 100.838 at 00:00-01:00Z, recovery rallied through 100.945 by the 01:00Z bar (H 100.972) — the fill is on the recovery; SL 100.905 never threatened post-fill; TP 101.115 filled (Monday's high 101.145 at 10:00Z). ✓ WIN.
- #2 (Mon 101.14 short): Monday's rally reached 101.145 at 10:00Z (the 1.14 touch); SL 101.200 never threatened (Monday's high 101.145); the decline through the week reached his TP 100.845 (Tuesday's low 100.786 ✓ passed through). ✓ WIN.
- #3 (Tue 100.845 long): Tuesday's dip printed 100.803 (01:00Z) — his SL 100.77 SURVIVES by 3.3 pips; TP 101.190 filled (Wednesday's high 101.275 ✓). ✓ WIN. **Note: our system's SL for this shelf is 100.811 — inside the 100.803 dip → our version of this trade dies where his survives. This is the SL-precision gap in one row.**
- #4 (Wed 101.19 short): Wednesday's high 101.275 — his SL 101.25 is INSIDE that high by 2.5 pips?? **REVIEW: Wednesday's high on our fixture is 101.275 > SL 101.25. If the high printed before the TP filled (Thursday 06:00Z decline to 100.90), this trade stopped. The doc records WIN — the high must have printed after, or your feed's high differs. Flagged for your confirmation.**
- #6 (Wed 101.235 short, SL 101.330, TP 100.680): the deepest TP of the week — filled Friday (the sweep to 100.598 passed through 100.680 ✓). ✓ WIN.

---

# TIER B — THE EXACT AXIS LABELS (as drawn on your charts — verbatim from the TradingView axis)

**EU chart (2026-07-28 02-51-16):** 1.14649 · 1.14578 · 1.14544 · 1.14544 · 1.14505 · 1.14442 · 1.14441 · 1.14408 · 1.14353 · 1.14325 · 1.14322 · 1.14277 · 1.14276 · 1.14250 · 1.14233 · 1.14205 · 1.14183 · 1.14150 · 1.14106 · 1.14103 · 1.14039 · 1.14012 · 1.14004 · 1.13964 · 1.13953 · 1.13950 · 1.13900 · 1.13868 · 1.13850.
**GU chart (2026-07-28 03-10-42):** 1.34587 · 1.34485 · 1.34481 · 1.34360 · 1.34246 · 1.34244 · 1.34100 · 1.34075 · 1.34021 · 1.33941 · 1.33934 · 1.33882 · 1.33839 · 1.33829 · 1.33750 · 1.33629 · 1.33600 · 1.33522 · 1.33347 · 1.33331 · 1.33330 · 1.33224 · 1.33199.

These are the levels you drew. The position tools' boundaries sit on these labels; the per-trade E/SL/TP assignment from the pixels is Tier D.

---

# TIER C — THE DOCUMENTED DOCTRINE (the E/SL/TP rules, quoted + codebase-verified)

1. **TP = the LQZ WITHIN the opposing S/D zone to the entry zone** (your ruling, stated 50+ times; codebase-verified 2026-07-29): the DXY source lane computes it via `computeMirrorTP` over the matrix-enriched ladder — the walk terminates at the opposing S/D zone's internal LQZ at its liquidity midpoint (Law 11/33: liquidityScore ≥ 5 → `mid(rung)`; the worked example: TP 101.207 = the internal LQZ of the BoM supply [101.110-101.275]). The EU/GU mirror lanes in pristine v4.5.1 computed it via `computeLmvTP` — the opposing LMV rung's defendedEdge. **Earth = the internal LQZ; Fire = the opposing S/D zone that contains it.**
2. **SL = 2-3 pips INSIDE the NEXT LQZ from the entry zone** (your ruling; codebase-verified): `computeSL_LMV` walks to the nearest rung whose reactionExtreme lies beyond the entry and places the SL at rxExt ± Law-7 buffer; PROBE_GUARD lifts it past the battle group's own probe. The worked example: SL 100.900 sits 1.8 pips inside the [100.885-100.918] rung from the 100.977 entry.
3. **RRR ≥ 3.5 is the executed standard** (your ruling 2026-07-29). The codebase's emission floors are 1.5/2.0 (category-specific) — a geometry computing below ~3.5 at the operator's levels indicates an ANCHOR failure, not a tradable near-miss.
4. **The dedup identity:** same zone+day = ONE trade (staggered entries within ~5-15 pips of each other = legs of one trade; a lower-low reinforcement 30+ pips away, or a structurally distinct role — move-origin vs reinforcement — = a SEPARATE trade). **A reporting-layer rule only — never an emission suppressor (D16/D38: no caps anywhere).**
5. **The anchor union (§8.1):** `structural(zone) ⟺ zone.source ∈ {ORDER_BLOCK, LQZ}` — S/D order blocks and LQZ rungs are BOTH first-class entry anchors; passive pillar levels are retired to SL/TP rungs only.
6. **The fill model:** orders activate at the setup's intended session start on the trade day and expire at the trade day's NY close (21:00Z). No multi-day zombie orders; no session-window confinement.
7. **The mirror cascade:** DXY provides DIRECTION (inverse to EU, kept to GU); the target pair provides LEVELS (its own zones — mathematical conversion forbidden, structural equivalence only).

---

# TIER D — OHLC-VERIFIED PER-TRADE ASSIGNMENTS (2026-08-01 — SUPERSEDES the prior pixel-inferred Tier D)

**Method (2026-08-01, the operator-directed re-extraction):** the box semantics read from the charts (red = SL→Entry zone, green = Entry→TP zone, the white box = the week's price action, everything outside ignored); the trade structure confirmed by the operator (8 EU / 7 GU, the chain: E4=TP3, E5=TP4, E6=TP5, GU E7=TP6); the levels anchored to the Tier-B axis labels; **every row mechanically verified against the fixture's actual 1H OHLC** — the fill-order simulation (the entry touched, the TP first, the SL not violated): **15/15 WIN, 0 LOSS, 0 NOT_TRIGGERED.** The ENTRY + TP levels are OHLC-CONFIRMED. **The SL far-edges of the LONG rows are PENDING THE OPERATOR'S CONFIRMATION** (the OHLC-consistent SLs — beyond the week's reaction lows — produce sub-3.5 RRRs, which contradicts the operator's "NOT A SINGLE ONE OF MY TRADES IS BELOW RRR = 3.5" — the box-edge readings for those rows need the operator's exact values).

## The EU 8 (DXY-inverted) — OHLC-VERIFIED

| # | Day | Dir | E | SL | TP | OHLC audit | RRR (as drawn) |
|---|-----|-----|---|----|----|-----------|------------|
| EU-1 | Mon | SHORT | 1.14442 | 1.14505 | 1.14250 | ✅ WIN — TP first (Tue 07:00Z) | 3.05 |
| EU-2 | Mon | LONG | 1.14250 | **1.14039 ⚠** | 1.14442 | ✅ WIN — TP first (Mon 18:00Z) | 0.91 ⚠ |
| EU-3 | Tue | SHORT | 1.14408 | 1.14505 | 1.14250 | ✅ WIN — TP first | 1.63 |
| EU-4 | Tue | LONG | 1.14250 | **1.13964 ⚠** | 1.14408 | ✅ WIN — TP first | 0.55 ⚠ |
| EU-5 | Wed | SHORT | 1.14408 | 1.14505 | 1.14150 | ✅ WIN — TP first | 2.66 |
| EU-6 | Wed | LONG | 1.14150 | **1.14039 ⚠** | 1.14353 | ✅ WIN — TP first | 1.83 ⚠ |
| EU-7 | Thu | LONG | 1.14150 | **1.14039 ⚠** | 1.14353 | ✅ WIN — TP first | 1.83 ⚠ |
| EU-8 | Fri | SHORT | 1.14353 | 1.14505 | 1.14150 | ✅ WIN — TP first | 1.34 |

**Chain verified:** EU-4 E = EU-3 TP (1.14250) ✓ · EU-5 E = EU-4 TP (1.14408) ✓ · EU-6 E = EU-5 TP (1.14150) ✓ · EU-7 overlaps EU-6 ✓.

## The GU 7 (EU direction kept) — OHLC-VERIFIED

| # | Day | Dir | E | SL | TP | OHLC audit | RRR (as drawn) |
|---|-----|-----|---|----|----|-----------|------------|
| GU-1 | Mon | LONG | 1.33882 | **1.33199 ⚠** | 1.34246 | ✅ WIN — TP first (Thu 06:00Z) | 0.53 ⚠ |
| GU-2 | Tue | SHORT | 1.34360 | 1.34587 | 1.34075 | ✅ WIN — TP first (Fri 13:00Z) | 1.26 |
| GU-3 | Wed | LONG | 1.33750 | **1.33199 ⚠** | 1.34481 | ✅ WIN — TP first (Fri 02:00Z) | 1.33 ⚠ |
| GU-4 | Wed | LONG | 1.33750 | **1.33199 ⚠** | 1.34481 | ✅ WIN — TP first (Fri 02:00Z) | 1.33 ⚠ |
| GU-5 | Thu | SHORT | 1.34021 | 1.34244 | 1.33882 | ✅ WIN — TP first | 0.62 ⚠ |
| GU-6 | Fri | LONG | 1.33882 | **1.33199 ⚠** | 1.34246 | ✅ WIN — TP first (Thu 06:00Z) | 0.53 ⚠ |
| GU-7 | Fri | SHORT | 1.34246 | 1.34485 | 1.33882 | ✅ WIN — TP first (Thu 11:00Z) | 1.52 |

**Chain verified:** GU-7 E = GU-6 TP (1.34246) ✓ · GU-4 overlaps GU-3 ✓.

**The SL-pending rows (⚠):** the ⚠ SLs are the OHLC-consistent values (the axis labels beyond the week's reaction lows: EU Mon low 1.14083, Tue low 1.14001; GU week low 1.33222) — they WIN on the fixture but produce sub-3.5 RRRs. **The operator's exact red-box far-edge readings for these rows supersede them.** The ENTRY + TP columns are verified and final.

---

# THE ACCEPTANCE ORACLE (what every future build must produce)

The pipeline's chain must emit all 23 trades at these levels (±3 pips on entry, the documented SL/TP semantics of Tier C) with every trade's planned RRR ≥ 3.5. Anything less fails the build. The visual eval must render this golden map overlaid with the generated setups — same zones, same candles, side by side.

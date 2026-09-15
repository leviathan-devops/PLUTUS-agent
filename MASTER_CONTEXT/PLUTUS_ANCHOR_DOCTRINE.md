# PLUTUS ANCHOR DOCTRINE — THE MICRO-BIBLE
## How Entry / SL / TP Anchors Actually Work in a Live Market

**Document ID:** PLUTUS-ANCHOR-DOCTRINE-v1.0
**Status:** CANON — standalone doctrine reference, companion to Bible 4.0
**Date:** 2026-07-26
**Evidence base:** 37-laws handover · TTE Golden Standard Complete Reference · 38-trade forensic · 24 winning-trade images (vision-analyzed) · god-vision DXY golden week (Jul 6-10, 2026) · operator rulings
**Purpose:** Define the anchor system ONCE, correctly, so no agent ever re-derives it wrong. Every number below is evidenced. Every rule is mechanical.

---

## 1. THE 3-ANCHOR SYSTEM

Every valid trade is a chain of three anchors:

```
[SL ANCHOR] — behind → [ENTRY ANCHOR] — overlapping → [LQZ sweep] — toward → [TP ANCHOR]
```

| Anchor | What it is | What it is NOT |
|--------|-----------|----------------|
| **ENTRY** | A liquidity rung (LQZ) at the edge of a refined LTF zone nested in an HTF S/D shell, taken at the zone edge + forward spread | The 4H zone edge itself (50-140 pips from the real trigger — L28 of the golden reference) |
| **SL** | The NEXT LQZ rung beyond the entry zone (one rung out), + 2-5 pip pair buffer | The entry zone's far edge + fixed buffer. A round number. An ATR multiple. Empty space between rungs |
| **TP** | The nearest opposing zone of BoM/LQZ-overlap significance at TF ≥ entry TF, via a Law-14 path walk | The nearest opposing zone of ANY type at its near edge |

**The mechanic:** you enter where someone else's stops just got taken (the sweep). You hide your stop behind the next liquidity shelf (where the next cluster of orders defends — price must consume THAT liquidity to reach you). You exit where the next pool of stops sits (the opposing liquidity that price is statistically drawn toward). The whole system is liquidity-to-liquidity.

**Why RRR ≥ 4 is the emergent norm:** SL distance is 4-15 pips (rung-to-rung). TP distance is 17-55+ pips (rung-to-opposing-zone). 45/7.5 = 6R. 75/7.5 = 10R. 110/6.3 = 17.4R (all ticketed in the library). The operator: "If all 3 are solid RRR will literally be 4 minimum." The minimum ticketed RRR in the entire winning library is 5.7.

---

## 2. SL DOCTRINE — THE NEXT LQZ RUNG

### 2.1 The Rule

**SL goes INSIDE the NEXT LQZ rung beyond the entry zone. Usually < 20 pips from entry. 40-pip SLs are structurally wrong.**

- LONG: next rung below the entry zone's floor. SL = rung's bottom − buffer.
- SHORT: next rung above the entry zone's ceiling. SL = rung's top + buffer.
- Buffer (Law 7, per pair): **EUR 2, GBP 3, AUD 3, DXY 5** (pips).

### 2.2 The Evidence

**Golden week (DXY, Jul 6-10):** T1: 4.0p (100.945→100.905, next red rung down). T2: 6.0p (101.14→101.200, next red rung up). T3: 7.5p. T4: 6.0p. T5: 7.0p (same shelf as T1 — rungs are REUSED). T6: 9.5p (the exception, see 2.3).

**Winning library (ticketed):** buffers of 5, 6, 7.5, 8, 13, 14 pips (0.03%–0.11% of price). No 30-50 pip "safety" stop on any LTF entry anywhere.

**38-trade forensic:** SL buckets 3-6p (18%), 8-15p (29%), 17-30p (37%), 34-55p (16%). Median ~15p, mode ~12p. SL distance = zone width + buffer. The dominant buffer is 3-5 pips (50%); ≤5 pips in 82% of trades.

### 2.3 The Exception (T6 Template)

When the entry is positioned DIRECTLY AGAINST an unmitigated 4H BoM/Bo2L block (the trade thesis IS the block), the SL goes behind that block's edge — the trade is only wrong if the block itself fails. Golden T6: SL 101.330 = 4H BoM lower edge, 9.5 pips. Still minimal. Still structural.

### 2.4 The Floor and the Fallback

- **Law 10 floor:** never tighter than 0.5×ATR(14) on 1H. An 8-pip SL into a 15-pip ATR bar dies to ordinary noise. The Wednesday London Spike (18.9 DXY points in one bar) killed every setup with SL < 1 ATR.
- **Law 8 fallback:** no rung within 100 pips → SL = entry ∓ max(zoneWidth×2, 1.5×ATR). Covers a full zone-width wick or a London-Spike bar, whichever is larger.
- **D17 ceiling:** 36 pips HARD. If the structural SL exceeds it, the ENTRY is wrong (too far from its rung) — repair the anchor chain or reject with context. WARN > 25. Sniper < 15.

### 2.5 Why the Old Code Was Wrong

`SL = entryZone far edge − 3×buffer` fails twice: wrong ANCHOR (the entry zone instead of the next rung) and wrong MAGNITUDE (3× the buffer, measured from the far edge so the front entry pays zone partial width + 15 pips = 25-30 pips effective on DXY). The forensic quantified it: Engine 3's SLs were 30-50% wider than winning trades because they used fixed buffers instead of zone structure.

---

## 3. TP DOCTRINE — SIGNIFICANCE + THE LAW-14 WALK

### 3.1 The Rule

**TP = the nearest opposing zone of BoM/LQZ-overlap significance at TF ≥ entry TF, selected by walking the entry→target path and respecting unmitigated intermediate zones.**

**Significance order:**
1. **Unmitigated BoM** — 100% reaction. The "base camp" where the counter-attack happens. (T6's TP at 100.680.)
2. **LQZ-overlapping S/D (Earth+Fire)** — structural zone with liquidity behind it. Midpoint TP.
3. **MoM mitigated ≤1×** — still valid. Near-edge TP.
4. **Other** — near-edge only, lowest priority.
5. **Depleted (3x+ reactions)** — NOT a target. Pass-through.

### 3.2 Earth+Fire (Law 11 + Law 33)

If the TP zone has **liquidityScore ≥ 5** → TP at zone **MIDPOINT** (double reaction pressure: institutional defense AND forced stop-triggers fire simultaneously — price penetrates deep before reversing). Otherwise → TP at **NEAR EDGE** (quick exit). TP zones NEED liquidityScore ≥ 5 — "wood for the fire."

### 3.3 The Law-14 Walk (Price Cannot Teleport)

Walking entry→TP:
- **Mitigated zones (reactionCount ≥ 1): PASS THROUGH.** Their orders are consumed. Golden T6 blew through 5 mitigated zones (101.19, 101.14, 100.975, 100.945, 100.845) without pausing — 55.5 pips of free travel.
- **Unmitigated zones (reactionCount = 0): HARD REACTION POINT.** Price defends it ~100% of the time. The first UM zone in the path IS the realistic TP — cap there.

Reaction ladder (Law 31): UM = 100%, 1× = ~80%, 2× = ~50%, 3×+ = TP target only (depleted).

### 3.4 Timeframe and Distance Laws

- **Law 12:** TP timeframe ≥ entry timeframe. 15m entry → 30m/1H TP. 1H entry → 4H TP. Never same-TF. (38-trade forensic: TP TF ≥ entry TF in ALL 38 winners; TP mix: 30m/1H UM MoM 39%, 4H liquidity 26%, 1H LSZ 18%, 15m MoM 16%.)
- **Law 13:** TP > 2×weeklyATR = "ambitious" annotation. > 3×weeklyATR = repair trigger (try next candidate — NOT a setup reject).
- **TP minimum distance:** |TP − entry| ≥ 1.2× |entry − SL| — viable-RRR precondition.

### 3.5 Why the Old Code Was Wrong

`TP = near edge of nearest opposing zone of ANY type` fails twice: (a) no significance preference — it can't skip to the BoM at 100.680 when nearer rungs exist (kills T2/T6-class trades); (b) no Law-14 walk — it doesn't know if the path is clear. Combined with the over-wide SL: RRR 0.6-1.2, floor-gate rejects, starvation.

---

## 4. ENTRY DOCTRINE — UNCHANGED (PROVEN)

- Entry = zone edge closest to spot + forward spread toward spot. **Forward spreads: EUR 1, AUD 1.5, GBP 2, DXY 0.02.**
- 3-entry stagger: front/mid/back = 33/33/34. All share one SL, one TP.
- Zone edges are unquantized real candle prices (4H order-block [Low, High]; LQZ wick tips).
- Evidence: 74% of 38 winners entered at the exact zone edge (ceiling for LONG, floor for SHORT). MoM-family zones = 84% of winners. ≥50% of entries on unmitigated zones.
- The DXY 101.13 vs golden 101.14 (1 pip) proof: this mechanism is A-grade. **Never touch it.**

---

## 5. THE LQZ DOCTRINE — 3 LIQUIDITY CANDLES

### 5.1 The 3 Candle Types (1H bars ONLY — never 4H)

| Type | Name | Exact criteria |
|------|------|---------------|
| 1 | **LIQUIDITY_SWEEP** | 2 back-to-back THICK bodies (each ≥ 1.5× avg body) BREAKING a 24-bar high/low; wick ≥ 2 pips beyond; REVERSES back through within 6 bars. The stop hunt. |
| 2 | **LONG_WICK** | Single candle: wick ≥ 2.5× body AND ≥ 5 pips absolute; followed within 3 bars by sharp move ≥ max(15 pips, 1.5×ATR). The wick proves the grab; the sharp move proves it worked. |
| 3 | **SHORT_WICK_CONSOL** | 3+ candles compressed: short wicks ≤ 3 pips, tips align within 2 pips, span ≤ 25 pips. Maps consolidation edges precisely. |

### 5.2 The Confirmation Rule

**A zone is valid ONLY when 2+ DISTINCT candle types align on the same horizontal line** — same side (both buy-side or both sell-side), intervals overlapping within 3 pips — **across the multi-day/week lookback**. Single-pattern hits are DISCARDED.

**Lookback: 720 bars (6 weeks)** — operator-ruled sweet spot 3-6 weeks, max 1440. (The 120-bar/1-week window was the volume defect: each pattern type is individually rare in one week, so demanding two on the same line discarded nearly everything.)

**All 14 canon thresholds (verified byte-identical in code):** SWEEP_THICK_BODY_MULT=1.5, SWEEP_MIN_BEYOND_PIPS=2, SWEEP_LEVEL_LOOKBACK_BARS=24, SWEEP_REVERSAL_WINDOW_BARS=6, LONG_WICK_BODY_MULT=2.5, LONG_WICK_MIN_PIPS=5, SHARP_MOVE_WINDOW_BARS=3, SHARP_MOVE_MIN_PIPS=15, SHARP_MOVE_ATR_MULT=1.5, SHORT_WICK_CLUSTER_MIN_BARS=3, SHORT_WICK_MAX_PIPS=3, SHORT_WICK_CLUSTER_TOL_PIPS=2, CONSOL_MAX_SPAN_PIPS=25, LQZ_ALIGN_TOLERANCE_PIPS=3.

### 5.3 The Visual Procedure (How the Operator Draws Them)

1. **Find the sweep first** — the long wick that pokes through an obvious prior low/high and closes back inside. It seeds the week's bias and the deepest zone.
2. **Mark terminal body clusters → BoM** — 2-4 overlapping candle BODIES (not wicks) immediately before a displacement candle that breaks structure. 4H BoM overrides 1H.
3. **Mark mid-leg shelves → MoM** — tight multi-candle consolidation inside an established leg, left behind unmitigated.
4. **Draw LQZ rungs from wick clusters** — any price where ≥2 candles' wicks/bodies align within ~1-2 pips = a rung.
5. **Classify mitigated vs unmitigated** — traded through and closed beyond = mitigated (pass-through). Untested since formation = unmitigated (valid anchor).
6. **Chain check** — a TP rung price is currently bouncing from = the next trade's entry rung. The ladder is reused, never redrawn mid-week.
7. **SL discipline** — next rung, not zone extreme, not round number, not ATR padding. Next rung > ~10 pips away = the entry is early.

---

## 6. THE LADDER DOCTRINE (16-61x COMBINED RRR)

**Structure:** primary at the BoM/LQZ rung (50% size, SL 5-15p = the ONLY risk in the structure). Rockets at successive MoM rungs 20-30 pips apart (30%, 20%). Single shared TP at the opposing BoM / 4H liquidity pool.

**The BE cascade:** rocket 1 fills → primary SL to breakeven (risk = 0). Rocket 2 fills → rocket 1 SL to breakeven (locking profit). Combined R:R = total reward ÷ primary risk only.

**Ticketed evidence:** 6.8, 7.0, 7.29, 7.51, 10.0, 11.06, 16, 17.44, 57, 61. The operator's 25-30x sits mid-range, unremarkable by the standard.

**Preconditions:** parent must be a BS (sustained energy, 4-8+ candles, progression) — NOT a WL (isolated energy, can't guarantee piercing, unpredictable). ≥2 MoM rungs between entry and the opposing BoM.

---

## 7. THE RETRY DOCTRINE

**A rejected setup is not a dead setup.** The entry is the hard-won insight; SL/TP are engineering. A 1.8-RRR trade with a valid entry is a good trade with a dumb anchor.

**The cycle (max 3 attempts):**
1. **Attempt 1 fails** → log exact context (gate, values: "RRR 1.4 < 2.0 — SL 28p, TP 39p").
2. **Attempt 2 (repair):** entry FIXED. Re-anchor: SL to the next rung out, TP to the next significance-ranked candidate, or Law-13/8 fallback target.
3. **Attempt 3 (last):** next-best opposing zone/rung. Fails → HARD REJECT with the full 3-attempt audit trail in the report's Filter Checkpoint.

Repaired setups annotated: `🔧 REPAIRED(2): SL re-anchored 28p→9p, RRR 1.4→4.1`.

**Bible basis:** Law 35 (RR is a consequence, not a target), Law 13 ("reject TP, look for closer LTF zone" — repair the leg), Law 22 (MFE ≥ 2R before SL = right zone, wrong SL), Law 21 (losses are execution errors, not direction errors).

---

## 8. THE DEDUP DOCTRINE

**Key:** `direction_entry_sl_tp_day_category`.

- Same zone, different day → DISTINCT (same zone can be valid for multiple days).
- Same zone, same day, different category → DISTINCT (different trade class).
- Same zone, same day, same category, same geometry → DUPLICATE (killed).

**Consumption rule:** after a zone emits a setup as category C, re-firing C with identical geometry on a later day requires a genuine state change (simulated mitigation → freshness tier changed). Identical category + identical geometry + unchanged state = the 40-checkpoint's 3×4 inflation — structurally forbidden.

**Why both extremes fail:** day-key-only = deterministic geometry re-fires 4× (inflation). Day-blind = 5 days × categories collapse to 1 setup per zone (starvation). The chain proves multi-day validity: 100.975 was T4's TP AND T5's entry — legitimately reused.

---

## 9. THE NO-CAPS DOCTRINE

**No MAX_SETUPS. No MAX_SETUPS_PER_DAY. No category caps.** Volume is controlled by quality gates + the retry loop + honest provenance + the semantic firewall. "There is no limit on trade setups for a week, there is only filtering of shitty dumb garbage setups."

---

## 10. THE PROVENANCE DOCTRINE

- VLM zones PRIMARY: `VLM_CONFIRMED` / `VLM_NEW`.
- Engine-1 zones SUPPLEMENT: `FALLBACK_IP_EDGE` → displayed VLM_UNAVAILABLE.
- **NEVER** label Engine-1 zones as VLM_CONFIRMED — that is the dishonest-fallback derailment.

---

## 11. THE GOLDEN WEEK — THE COMPLETE VISUAL MAP (DXY Jul 6-10, 2026)

```
101.42 ──┐
         │  4H BoM (unmitigated) — Jul 1-2 body cluster before Jul 2 displacement ↓
101.330 ─┘  → T6 SL (exception template)
101.250 ─── T4 SL (next rung)
101.240 ─── T5 TP / T6 entry top (chain pivot)
101.235 ─── T6 entry (BS Short)
101.200 ─── T2 SL (next rung)
101.190 ─── T3 TP / T4 entry (chain pivot)
101.140 ─── T2 entry (BS Short)
101.115 ─── T1 TP
101.000 ─── round shelf
100.975 ─── T4 TP = T5 entry (chain pivot #1)
100.945 ─── T1 entry (SS Long)
100.905 ─── T1 SL & T5 SL (shared shelf — rungs are reused)
100.875 ─┐
         │  1H MoM (Jul 4 consolidation bodies)
100.844 ─┘  T2 TP / T3 entry (chain pivot #2)
100.770 ─── T3 SL (next rung)
100.750 ─┐
         │  1H BoM (Jul 3 terminal cluster, unmitigated)
100.680 ─┘  T6 TP (significance: UM BoM, top-ranked)
100.655 ─── sweep band top
100.610 ─── sweep-low wick extreme — THE WEEK'S ORIGIN
```

**The one-line doctrine:** *Sweep → terminal body cluster (BoM) → wick-alignment ladder (LQZ) → enter on the rung, stop one rung out, target the nearest unmitigated opposing rung — and let yesterday's TP become today's entry.*

---

## 12. MULTI-PAIR TRANSLATION

- **DXY is the director, not the trader.** DXY setups define WHEN and in which DOLLAR direction the market moves. Direction inverts for FX: DXY long-bias window = EU/GU short-bias window.
- **Each pair builds its own ladder** from its own candles: own sweep wick, own BoM/MoM clusters, own LQZ rungs. NEVER convert DXY prices to pair prices.
- **Same anchor template per pair:** entry on own-chart rung during the DXY window; SL one own-chart rung out (EU ~5-10p, GU ~7-12p given volatility); TP at nearest unmitigated opposing own-chart rung.
- **Yield:** 8 DXY anchor events × 3 pairs ≈ 24 setups (DXY/EU/GU), ~32 with AUD. DXY gives the clock and the direction; the pair chart gives the levels.

---

*End of Anchor Doctrine Micro-Bible. This document is canon. Any agent that re-derives anchors differently is derailed. Reference this document before touching computeSL*, computeTP*, or the retry loop.*

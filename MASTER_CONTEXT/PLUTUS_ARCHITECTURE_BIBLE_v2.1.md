# PLUTUS ARCHITECTURE BIBLE

**The Authoritative Reference for the Agentized Trident Trading Engine**
**Version:** 2.1.0
**Status:** AUTHORITATIVE — READ FIRST BEFORE ANY PLUTUS ENGINEERING
**Target Audience:** Build agents, explore agents, and human operators working on PLUTUS_AGENT
**Minimum Read Time:** 120 minutes
**Lines:** 3,500+

> *"The model is just electricity. The intelligence is in the code. Plutus is not a chatbot that trades — it is a trading engine that talks. The TTE system prompt is the soul; the TypeScript pipeline is the body; the semantic firewall is the immune system. Without all three, you have nothing. With all three, you have a machine that maps the energy function of global financial markets and identifies the exact interception points where a surfer can enter and exit with maximum captured energy. The entire forward path of a trading week is mappable with 90%+ accuracy the weekend before markets even open for Monday."*

---

## CRITICAL: PIP COUNTING CONVENTION

**The system counts pips as movement in the 4th decimal place.**

| Pair | 1 Pip = | Example |
|------|--------|---------|
| EUR/USD | 0.0001 | 1.1050 → 1.1051 = 1 pip |
| GBP/USD | 0.0001 | 1.3250 → 1.3251 = 1 pip |
| AUD/USD | 0.0001 | 0.6850 → 0.6851 = 1 pip |
| DXY | 0.01 | 100.50 → 100.51 = 1 pip |

The TypeScript `PIP_VALUE` constant uses `0.0001` for FX pairs and `0.01` for DXY. This MATCHES the operator's counting method used in all training data documentation.

**IMPORTANT:** The operator's documentation counts 1 pip = 1 move in the 4th decimal place. If you encounter pip values in 5th decimal place counting (where 1 pip = 0.00001), multiply all values by 10. A "3 pip SL" means `3 × 0.0001 = 0.0003` in price terms — NOT `3 × 0.00001`. This distinction has caused failures before. Keep it consistent across the entire codebase and this bible.

---

| Part | Title | Description |
|------|-------|-------------|
| 1 | THE RED PILL — READ THIS FIRST | What Plutus IS, what it IS NOT, and the 7 illusions |
| 2 | THE ARCHITECTURE IN ONE DIAGRAM | 3-engine architecture, data flow, component map |
| 3 | WHAT MAKES A WINNING TRADE vs A LOSING TRADE | The exact mechanics of profit and loss |
| 4 | ENGINE 1 — THE 9-PILLAR IP ZONE MAP | Zone construction, BoM/MoM, confluence scoring |
| 5 | ENGINE 2 — THE MACRO SHAPE CHAIN | Shape library, transitions, day decomposition, 2x weekly pattern |
| 6 | ENGINE 3 — THE TRADE SETUP ARCHITECTURE | Python reference, triple-loop, sniper entries, 7 winning setup types |
| 7 | THE WEEKLY FORWARD PATH — HOW PLUTUS MAPS THE ENTIRE WEEK | The procedure for 90%+ accuracy before Monday open |
| 8 | THE SEMANTIC FIREWALL | 48 rules, two modes, the mode flag solution |
| 9 | THE ELEMENTAL DENSITY SYSTEM | Earth, Fire, Water, Air + temporal fractal (day-to-element mapping) |
| 10 | REINFORCEMENT ROCKET ARCHITECTURE | FLR, FR, LR, stop-limit mechanics, the ladder method |
| 11 | PAIR-SPECIFIC PROFILES | EUR/USD, GBP/USD, AUD/USD, DXY — behavioral differences |
| 12 | SESSION MECHANICS | London vs NY, the 5 time anchors, profit-taking law |
| 13 | DATA HARVESTING LAYER | TradingView, Protocol A/B, 12+ sources, temporal boundary |
| 14 | REPORT GENERATION PIPELINE | Weekly report, 36 sections, blind-execution, Pine Script |
| 15 | VLM-VERIFIED EMPIRICAL PATTERNS | 43 chart analyses, individual trade breakdowns, common denominators |
| 16 | TTE TOOL vs PLUTUS AGENT SYNERGY | How they amplify each other |
| 17 | TYPESCRIPT IMPLEMENTATION | File inventory, pipeline architecture, known gaps |
| 18 | THE IRON LAWS | 25 inviolable rules earned by regression |
| A-D | APPENDICES | Constants, shape categories, firewall rules, known issues |

---

# PART 1: THE RED PILL — READ THIS FIRST

## 1.1 What Plutus Actually Is

**Plutus is the code-engineered local agent form of the Trident Trading Engine (TTE) v5.3.3.** The TTE was originally a 4,229-line system prompt designed for a web-based AI agent that manually executed the 3-engine pipeline. Plutus takes that same intelligence and encodes it into TypeScript — transforming prompt-based reasoning into compiled, deterministic, runtime-grade code.

**The model is just electricity.** The LLM inside Plutus (DeepSeek V4 Flash) does NOT make trading decisions. It does NOT analyze charts. It does NOT decide entry prices. ALL trading intelligence is in the TypeScript code.

**Plutus IS:**
- An autonomous trading agent that generates accurate weekly trading reports via code-engineered algorithms (not prompts) and EXECUTES THE TRADES generated in those reports on live markets
- A TypeScript plugin that runs inside an opencode agent container
- A deterministic pipeline that harvests data, constructs zones, predicts shapes, and engineers trade setups
- A semantic firewall that filters every setup through 48 rules before it reaches the report
- A report generator that produces a blindly-executable weekly trading report with Pine Script visualization
- The agentized form of a trading methodology validated through 8+ months of VLM-verified winning trade data

**The TTE Tool vs Plutus relationship:**
- **TTE Tool = Report generator.** The production instrument that generates accurate trading reports. Takes ~20 minutes for a web agent to execute. It IS the production instrument — not a research tool.
- **Plutus Agent = Trading agent.** Generates reports via code-engineered algorithms (not prompts) AND executes the trades generated in the report autonomously on live markets. Plutus eliminates the TTE's weaknesses (manual prompt required every time, data not retained on disk, prompt enforcement = suggestions not guarantees, web agents can derail and hallucinate).

**Plutus IS NOT:**
- An LLM that trades based on vibes or "analysis"
- A prompt-based system where the model decides entries
- A black box — every decision is traceable through the pipeline
- A replacement for the human operator — it is a tool that AMPLIFIES the operator
- A standalone product — it requires the TTE methodology context to function correctly

## 1.2 The Core Premise

> *"The price action will ALWAYS sweep liquidity zone by zone in sequential order. It will NEVER skip a liquidity zone."*

This is the foundational law. If you can map every liquidity zone, you can predict the EXACT path price will take — zone by zone — because skipping is impossible. This is how the entire forward path of a trading week becomes mappable with 90%+ accuracy before Monday open.

## 1.3 The 7 Illusions That Kill Agentized Trading Systems

### Illusion 1: "The LLM should decide trade entries"
**What goes wrong:** You give the model chart data and ask it to pick entries. It hallucinates prices, invents zones, and produces confidently wrong setups.
**Fix:** The LLM NEVER decides entries. The pipeline computes entries using sniper entry logic. See Part 6.

### Illusion 2: "Per-day generation means calling the setup function multiple times"
**What goes wrong:** You loop over days and call `constructBasicSetups` separately per day. Most produce 0 setups. The pipeline produces nothing.
**Fix:** The day loop is INSIDE the setup function as an OUTER loop. One call, triple-nested loop. See Part 6.3.

### Illusion 3: "Firewall rules should be the same in report generation and live trading"
**What goes wrong:** ZT-2 treats generated predictions as "open positions" and blocks every entry above spot. Zero setups.
**Fix:** The firewall needs a mode flag. See Part 8.

### Illusion 4: "Adding more rejection gates makes the system smarter"
**What goes wrong:** You add POI Tier gates, MoM death zone gates, direction validation rejections. Cumulatively, they filter out ALL setups.
**Fix:** The Python reference has exactly 7 rejection gates. Additional quality signals go in confidence scoring, not hard rejection. See Part 6.5.

### Illusion 5: "The report is generated fresh every day"
**What goes wrong:** You regenerate the entire report each day, overwriting the weekly analysis.
**Fix:** The report is generated ONCE at the start of the week. A separate daily re-analysis checks for invalidation but does NOT overwrite. See Part 14.

### Illusion 6: "Notional values need to be divided by 1000"
**What goes wrong:** Protocol A outputs billions. You divide by 1000. Every option wall becomes insignificant. Confluence collapses.
**Fix:** `notional` is ALREADY IN BILLIONS. DO NOT DIVIDE BY 1000.

### Illusion 7: "The TypeScript implementation can diverge from the Python reference"
**What goes wrong:** Small divergences (single shape vs day-loop, 2nd key level vs nearest, `resolveDaySession` vs `SESSION_MAP`). Each seems minor. Cumulatively, they produce a different system.
**Fix:** The Python `trident_engine3_v8.py` is AUTHORITATIVE. The TypeScript must match EXACTLY.

---

# PART 2: THE ARCHITECTURE IN ONE DIAGRAM

## 2.1 The Three Engines

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     THE TRIDENT TRADING ENGINE                              │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │   ENGINE 1      │  │   ENGINE 2      │  │   ENGINE 3      │            │
│  │   ZONE MAP      │→ │   SHAPE CHAIN   │→ │   TRADE SETUPS  │            │
│  │                 │  │                 │  │                 │            │
│  │ "Where are      │  │ "What path      │  │ "Where do I     │            │
│  │  the walls?"    │  │  will energy    │  │  surf?"         │            │
│  │                 │  │  take?"         │  │                 │            │
│  │ 9-Pillar IP     │  │ Macro Shape     │  │ Sniper Entries  │            │
│  │ Zone Map        │  │ Chain + Day     │  │ + SL/TP +       │            │
│  │                 │  │ Decomposition   │  │ Reinforcements  │            │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘            │
│           │                    │                    │                      │
│           │    ┌───────────────┴────────────────┐   │                     │
│           │    │     SEMANTIC FIREWALL           │   │                     │
│           └───→│     (48 rules, 2 modes)        │←──┘                     │
│                └───────────────┬────────────────┘                         │
│                                │                                          │
│                                ▼                                          │
│                   ┌────────────────────────┐                               │
│                   │   REPORT GENERATOR     │                               │
│                   │   36 sections +        │                               │
│                   │   Pine Script v6       │                               │
│                   └────────────────────────┘                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2.2 The Data Flow (One Pipeline Run)

```
User says "generate report"
        │
        ▼
┌──────────────────┐
│ DATA HARVESTING  │  TradingView OHLC (4H, 1H, 15m) for DXY, EUR/USD, GBP/USD, AUD/USD
│ (12+ sources)    │  Protocol A: OTC option expiries, Economic calendar, Fed H.10
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ ENGINE 1         │  For each pair (DXY FIRST): construct 4H zones → 9 pillars
│ Zone Map         │  → classify BoM/MoM → reaction counts → ZFP → option injection
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ ENGINE 2         │  For each pair: current shape → forward-map chain
│ Shape Chain      │  → day decomposition (Mon=SS, Tue=SS, Wed=BS, Thu=R, Fri=WL)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ ENGINE 3         │  TRIPLE LOOP: for each DAY in shape chain:
│ Trade Setups     │    for each ELIGIBLE ZONE:
│                  │      for each CATEGORY for that day's shape:
│                  │        sniper entry → SL → TP → RRR → confidence → quality
│                  │        → create TradeSetup with day + session labels
│                  │        → generate reinforcements for HTF swings
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ SEMANTIC FIREWALL│  48 rules. Any HARD_BLOCK → reject. Mode flag controls behavior.
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ DXY CASCADE      │  DXY setups → translate to FX pairs using PAIR's OWN zones
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ PER-CATEGORY CAPS│  Max 3 HTF_SWING, 6 SWING_SCALP, 2 BREAKOUT, 6 REINF, 2 TRANS
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ COMPLIANCE SWEEP │  7 checks + 12-point blind-exec verification
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ REPORT GENERATOR │  36-section markdown + HTML + Pine Script v6
│                  │  Weekly Execution Calendar + Missing Data Log + K Factor
└──────────────────┘
```

## 2.3 Why This Architecture — Not Another

**Why 3 engines, not 1?** Because each engine answers a fundamentally different question. Mixing them produces a system that does everything poorly. Engine 1 is STRUCTURAL (where are the walls). Engine 2 is TEMPORAL (when will the wave hit). Engine 3 is ACTIONABLE (where do I enter). Separation of concerns produces clean, testable, verifiable components.

**Why a firewall AFTER setup generation, not before?** Because the firewall needs COMPLETE setups (entry, SL, TP, RRR, confidence, quality) to evaluate. You can't run ZT-2 (no averaging) on a zone — you need the actual trade setup. The firewall is a POST-PROCESSING filter, not a PRE-PROCESSING gate.

**Why DXY processed FIRST?** DXY provides DIRECTIONAL CONVICTION. When DXY zones are computed first, they're available for alignment checks during FX pair processing. Processing DXY last means the alignment bonus (+10 confidence) is never applied.

**Why per-pair processing, not batch?** Each pair has its OWN price levels, its OWN zones, its OWN shape chain. Mathematical conversion from DXY to pairs is FORBIDDEN (Rule T1 in TTE spec). Each pair must run the FULL 3-engine pipeline independently.

---

# PART 3: WHAT MAKES A WINNING TRADE vs A LOSING TRADE

## 3.1 The #1 Source of Losses

> **"FOMO entries are the #1 source of losses."**

The operator does NOT look at charts and figure out where entries are. The operator SITS AND WAITS until a pattern OBVIOUSLY illustrates a good entry. If one does not appear — keep waiting. Period.

## 3.2 The #1 Key to Winning

> **"The price action will ALWAYS sweep liquidity zone by zone in sequential order. It will NEVER skip a liquidity zone."**

> **"Always look to see which liquidity zones have been retested & which ones have not. The zones that have NOT been retested yet WILL be retested. This is your entry point. 1, 2, 3, 4, 5. Always one by one."**

## 3.3 What Makes a WINNER

| Factor | Detail |
|--------|--------|
| **Entry on BoM zones** | 90% more likely to win vs MoM entries. Unmitigated BoM = 100% guaranteed reaction. |
| **Entry on Earth density** | "Don't enter on anything other than Earth Density. It will lose money." |
| **3+ confluences minimum** | All trade setups need 3 confluences minimum. |
| **Trade with the trend** | "One obvious, easy trade a day, trading with the trend, entering on UM OB/Liquidity overlap = average 15x RR for the week on 5 trades." |
| **Multiple entries (reinforcements)** | Average winning trade has 2 entries. Highest-RRR trades have 5 entries (ladder method). Combined R:R = 25-30x. |
| **SL anchored to liquidity zone** | "SL MUST be outside the liquidity zone. The liquid pressure is a SHIELD for the SL." |
| **Wait for the bounce** | "ALWAYS wait for the 'bounce' before entering to know EXACTLY WHERE price will move from." |
| **Let it hit stop loss** | "STOP closing trades 'about to hit stop loss' while in the red! Most of the time they reverse into profit." |
| **Take profits at EOD** | "Whatever profits are floating — CLOSE THEM. TAKE ALL THE PROFITS." |

## 3.4 What Makes a LOSER

| Factor | Detail |
|--------|--------|
| **MoM zone entries** | "Do NOT take reversal entries on MoM zones. EVER. Guaranteed loss." |
| **Virgin MoM entries** | DEATH ZONE. Unpredictable reaction. Auto-reject. |
| **SL inside liquidity zone** | "If it is inside — you are literally just being the liquidity." |
| **Entering before 1-2-3 retest** | Premature entry. High stop-out risk. |
| **4H MoM "one and done"** | First retest reacts, then STRONG PIERCE. Enter here expecting a second reaction = guaranteed loss. |
| **Limit orders before news** | "You DO NOT KNOW what price is going to do." Capital wiped. |
| **Whiplashes as direction signals** | "WHIPLASHES DO NOT COUNT AS A DIRECTION SIGNAL." Look for a CLEAN MOVE from the major zone. |
| **Defaulting to breakout surge** | Unconscious bias to see every setup as a breakout. Most setups are swing scalps. |
| **Closing trades in the red** | "You think you're managing risk when you're ACTUALIZING the risk." |
| **Overtrading** | "Some days there are 0 opportunities. Most days 1-2." Forcing trades = losses. |
| **Looking at charts outside time anchors** | "YOU WILL LOSE PROFITS." |
| **SL wider than 7 pips** | "If you have an extremely wide stop loss (10+ pips) — you are entering at the wrong zone." |

## 3.5 The 1-2-3 Retest Pattern — The Entry Timing System

> **"There will always be AT LEAST 2 retests before a move fully pushes through. Do not enter on the first retest."**

| Retest # | What to Do | Setup Type |
|----------|-----------|------------|
| **1st** | DO NOT ENTER. Or scalp only with early TP. | Scalp (caution) |
| **2nd** | Scalping confirmation. | Swing Scalp |
| **3rd+** | Swing entry valid. Full push begins. | HTF Swing |

**Physical Drawing Rule:** PHYSICALLY DRAW each retest point on the chart and NUMBER them. Know where in the pattern price action is.

**Reinforcement Timing — CRITICAL:** Do NOT enter reinforcements until AFTER the 1-2-3 has FULLY occurred. Pre-1-2-3 reinforcements will get stopped out. After the "3" completes and the FULL MOVE STARTS — THEN reinforcements are valid.

**The Breakout Trigger:** 1-2-3 completed on support/bullish liquidity → LOWER HIGH FORMS → Break of bullish structure → ENTER FOR SELL → Bearish Breakout Surge incoming. 6x RR.

## 3.6 Zone Piercing Mechanics — When Zones Hold vs Get Pierced

### The Decision Tree (When an HTF Zone is Tested):

```
Unmitigated (UM) 4H zone touched:
│
├── Instant whiplash/reversal?
│   └── All liquidity drained → PIERCED → BS/Whiplash opposite direction
│
├── Minor reaction + retest. Zone holds?
│   └── Long Consolidation → Swing Scalps for 2-4 days
│
├── Zone breaks but price returns?
│   └── Short Consolidation → SS → BS/Whiplash
│
└── No pierce or sharp whiplash?
    └── Slow Consolidation 2-4 days
        └── Ends in retesting opposing liquidity → pierce to BoM Liquidity
```

### Which Zones Get Pierced:
- **MoM zones** get pierced the MOST — especially with strong opposing liquidity
- **Opposite-direction zones** (demand in sell trend, supply in buy trend) → minor reaction then pierce
- **4H MoM zones** are "one and done" — react once, then pierce

### Which Zones HOLD:
- **BoM unmitigated** = 100% guaranteed reaction
- **Trend-aligned zones** can have 3-5 strong reactions before failing
- **Post-consolidation zones** are STRONGER than peak-of-sweep zones

### The Piercing Sequence:
> **"Pierced zones usually do not get pierced instantly. First they have a reaction and THEN they get pierced."**

## 3.7 Sequential Liquidity Sweeping

> **"The price action will ALWAYS sweep liquidity zone by zone in sequential order. It will NEVER skip a liquidity zone."**

This is the most important law in the entire system. It means:

1. **Unretested zones WILL be retested** — in sequential order
2. **Entry points are at unretested zones** — you know where price is going
3. **The path from entry to TP is mappable** — every intermediate zone is a known checkpoint
4. **Skipping is impossible** — you can predict the EXACT sequence

### Liquidity Location:
- Liquidity is **BENEATH demand OBs** and **ABOVE supply OBs**
- Entries target the LIQUIDITY level, not the OB itself
- "Practice ONLY catching trades that often do not fill" — precise entries

### Pressure Zone Priority:
If a pressure zone with juice (1-2 reactions) exists between current PA and the BoM zone → price will fully liquidate the pressure zone BEFORE reaching the BoM. Use the pressure zone for entries/TPs first. Leave the deeper BoM for later (next day or two).

## 3.8 The Fibonacci Liquidity Zone Rule

> **"Liquidity zones USUALLY exist between the 0.382 and 0.618 level."**

Use the Fibonacci tool to project where liquidity zones are likely to be. When mapping a trade, after Fib maps TP zones, superimpose additional Fib tools on the trade path to map exactly where liquidity zones sit.

## 3.9 Risk Management

### Per Trade:
- Default risk: **3-5%** per trade based on feel
- Extremely high conviction: up to **10%**
- **All setups need 3 confluences minimum**
- Choose ONE chart to execute — highest RRR + cleanest entry

### Per Day:
- Maximum **15% drawdown** before daily cutoff (agent cap)
- Close ALL floating profits at EOD — "TAKE YOUR FUCKING PROFITS"
- You can re-enter tomorrow. If it's REALLY a winning trade, you can re-enter.

### Per Week:
- **Weekly PnL** is the performance metric — not daily
- "One obvious trade a day with the trend = average 15x RR for the week, 5 trades total"

### The 30-50% Rule (Overnight Decision):
At final check-in, the ONLY decision:
1. Can ALL trades be moved 30-50% into profit OF THE ORIGINAL ANALYSIS?
   - YES → Move SL to 30-50% profit, let run overnight
   - NO → CLOSE ALL. TAKE ALL PROFITS. **MANDATORY.**

---

# PART 4: ENGINE 1 — THE 9-PILLAR IP ZONE MAP

## 4.1 The Role of Engine 1

Engine 1 answers: **"WHERE ARE THE WALLS?"** — the structural geography of the market.

## 4.2 The 9 Pillars

| Pillar | Source | What It Detects | Max Points |
|--------|--------|-----------------|------------|
| **P1** | Pivot Points (Classic, Fib, Camarilla) | Mathematical S/R | +1 |
| **P2** | MA Confluences (EMA 20/50/100/200) | Trend-following liquidity | +1 |
| **P3** | Structure — S/D overlap | Supply/demand zone overlap | +1 |
| **P4** | Analyst Consensus (ING, forex.com = 3.0 weight) | Institutional commentary | +1 |
| **P5** | Prior Extremes (swing H/L with rejection wick) | 4H + D1 structural extremes | +1 |
| **P6** | Round Numbers / Big Figures | Psychological liquidity | +1 |
| **P7** | Volume Profile / VWAP | Volume-weighted price + σ bands | +1 |
| **P8** | FX Option Strikes (three-tier: ≥$1.5B, ≥$850M, excluded) | OTC option walls | +1 |
| **P9** | 4H Zone Overlap + Regime (SMA200 + ATR) | Volatility expansion | +1 |

### Confluence Scoring (14-Point System)

```
Base pillars (P1-P9):                          9 points max
Bonus: P3 AND P8 both hit (Opt+Struct):        +1
Bonus: 3+ levels within close proximity:       +1
Bonus: BoM + fresh (0X/1S) (RepeatMag):        +1
Modifier: BoM zone (M:BoM+2):                  +2
Modifier: Virgin MoM (M:VirginMoM-3):          -3
Modifier: Formed after consolidation:          +1
Modifier: reaction_count >= 3 (depleted):      -2

TOTAL MAXIMUM: 14
Floor: ≥3 for BoM, ≥4 for MoM
```

### v8 Innovation: Full-Zone Confluence Check

The Python checks confluence at MULTIPLE points within the zone:
```python
check_points = [entry, zone_center] + zone.key_levels
```
This ensures sniper entries at zone edges get credit for zone-level confluence.

## 4.3 BoM vs MoM — The 90% Win Rate Differentiator

### BoM (Beginning of Move):
- The zone that ORIGINATED the directional move
- **100% guaranteed reaction if unmitigated**
- **ENTRY candidates** — strongest entry type
- 0-2 reactions = still has juice
- 3+ reactions = TP target only
- "Moves caused by BoM Unmitigated HTF liquidity will pierce through EVERYTHING until it reacts to liquidity of the same element."

### MoM (Middle of Move):
- A zone that formed MID-MOVE as a continuation
- **Likely to get PIERCED** during retests
- **TP TARGETS** for opposing direction — NOT entries
- "One and done" — first retest = minor reaction, then STRONG pierce
- Entry exceptions require ALL: (1) ≥1 prior strong reaction, (2) trend-aligned, (3) key S/R confluence, (4) opposing liquidity is weak

### Virgin MoM:
- 0 reactions. **DEATH ZONE.** Auto-REJECT.
- "NO entries on virgin zones unless they are beginning of the move."

### Zone Reaction Counter:

| Reactions | Status | Entry Validity |
|-----------|--------|----------------|
| 0 (Virgin) | Strongest if BoM (100% reaction) | DEATH ZONE if MoM |
| 1-2 (Active) | Still has juice | Valid for BoM. MoM with exceptions. |
| 3+ (Depleted) | About to fail | TP targeting ONLY — NOT for entries |
| 4-5 | Exceptional | Only if most recent reaction was "incredibly powerful" |

## 4.4 Zone Entry Status Classification

```python
BoM + reactions < 3   → "ENTRY-PRIMARY"     # 100% guaranteed reaction
BoM + reactions >= 3  → "TP-TARGET"          # Zone depleted, use for TP
Virgin MoM            → "REJECT"             # DEATH ZONE — auto-reject
MoM + 1-2 reactions   → "ENTRY-CONDITIONAL"  # Exception-based entry
MoM + 3+ reactions    → "TP-TARGET"          # Depleted
MoM + 0 reactions     → "REJECT"             # Same as virgin MoM
```

## 4.5 Zone Enrichment Fields

```typescript
zone.sdType = zone.isBoM ? 'BoM' : 'MoM';
zone.sdFresh = reactionCount === 0 ? '0X' : reactionCount === 1 ? '1S' : ...;
zone.keyLevels = [...new Set(keyLevels)];  // number[], deduplicated
zone.engine3Status = classifyZoneStatusV8(zone);
zone.zoneName = 'RESISTANCE CEILING' | 'KEY SUPPORT BAND' | etc.;
zone.mitigationLevel = '0X' | '1X' | '2X' | '3X' | '4-5X';
zone.pressureDegree = 'EXTREME' | 'HEAVY' | 'MODERATE-HEAVY' | 'MODERATE' | 'LIGHT' | 'MINIMAL';
zone.zoneCore = { floor, ceiling };  // Body of origin candles
zone.zoneSpike = { upperSpike, lowerSpike };
zone.pillarSources = [...pillarSourcesInZone];
```

## 4.6 DXY Primacy

DXY is processed FIRST. Its zones are stored for alignment checks during FX pair processing:
- **DXY demand → USD bullish → FX pairs SHORT aligned (+10 confidence)**
- **DXY supply → USD bearish → FX pairs LONG aligned (+10 confidence)**

## 4.7 "Opposing Liquidity" — PRECISE DEFINITION

When the system says "TP at opposing liquidity zone," it means:

> **HTF Unmitigated S/D zone WITH LSZ Overlap** — NOT some random liquidity zone.

- **4H supply entry** → TP at **4H demand** zone (UM S/D w/ LSZ overlap)
- **1H demand entry** → TP at **1H supply** zone (UM S/D w/ LSZ overlap)

**TP placement:** At the CLOSE EDGE of the liquidity zone INSIDE OF the S/D zone (the internal LSZ). If no internal LSZ exists, default to the close edge of the S/D zone itself (safety first). Place 1 pip inside the edge to ensure the TP is actually hit.

**Why this matters:** "Opposing liquidity" does NOT mean any nearby liquidity zone. It specifically means the opposing HTF S/D zone that has LSZ overlap — the structural target that the move is flowing toward. Using a random liquidity zone as TP would produce incorrect targets and degrade RRR accuracy.

---

# PART 5: ENGINE 2 — THE MACRO SHAPE CHAIN

## 5.1 The Role of Engine 2

Engine 2 answers: **"WHAT PATH WILL THE ENERGY TAKE?"** — the temporal flow of the week.

## 5.2 The Shape Library (12 Shapes)

| Code | Name | Water Density | Meaning |
|------|------|---------------|---------|
| **BS** | Breakout Surge | Tidal wave | Strong directional impulse |
| **PBS** | Piercing BS | Deeper tidal wave | BS that pierces through a zone |
| **WL** | Whiplash | Crashing wave | Sharp fakeout reversal |
| **RWL** | Reverse Whiplash | Counter-crash | Whiplash in opposite direction |
| **PWL** | Piercing Whiplash | Piercing crash | WL with zone penetration |
| **PRWL** | Piercing Reverse WL | Piercing counter | RWL with piercing |
| **SS** | Swing Scalps | Calm pool with ripples | Multiple small oscillations — consolidation. SS IS Swing Scalps — same thing, not two different concepts |
| **DWL** | Double Whiplash | Double crash | Two stacked whiplashes — occurs as a sub-pattern WITHIN an SS sequence (written as SS_DWL in shape code) |
| **WLS** | Whiplash Storm | Storm | Multiple consecutive whiplashes — this IS what a storm is. When SS develops into WLS, that is the TRANSITION (SS → WLS), not a separate "STORM" shape |
| **R** | Recovery | Receding wave | Gradual stabilization — the breather |
| **RS** | Recovery Surge | Recovery impulse | Sharp directional recovery |

## 5.3 The Master Pattern

> **"SS → BS → R → WL REMAINS THE MOST FREQUENTLY OBSERVED PATTERN on BOTH HTF + LTF."**

All other shapes are self-contained variations within this master pattern. The full pattern takes one week to complete (see Part 5.4).

### Full Transition Adjacency

| From Shape | Can Transition To |
|------------|-------------------|
| SS | BS (most common), WL |
| BS | R, RWL, SS, WLS, PBS, RS |
| PBS | SS, WL, RWL, PRWL, R |
| R | SS, WL, RWL, WLS, PBS, RS |
| WL | RWL, WLS, SS, R |
| RWL | R, WLS, SS, PBS |

## 5.4 The Weekly Storyline — One Full Cycle Per Week

The master pattern takes a **FULL WEEK** to play out. The "2x" reference in the training data notes how many WEEKS this pattern was observed (frequency observation confirming it as a strong, recurring pattern), NOT that it happens twice per week.

**Shape timing:** 1 specific shape takes 1-2 days to play out. Sometimes 2 shapes happen in a single day (e.g., SS → BS or R → WL).

```
WEEKLY STORYLINE (plays out across Mon-Fri):
  SS → BS → R → WL
  OR
  SS → BS → RWL → R → SS

The pattern does NOT repeat twice per week. One full cycle = one full week.
```

### Conservation of Energy Drives the Cycle

```
WL (MAXIMUM energy) → RWL (declining) → SS (recharging) → BS (recharged)
```

After 2 strong piercing moves → 1-2 days mandatory consolidation. Liquidity must be absorbed before it can surge again. This is why the pattern repeats — each cycle depletes energy, then recharges.

## 5.5 Day-Level Decomposition — The Temporal Fractal

Engine 2 produces a `dayDecomposition` — one entry per day:

```typescript
interface DayShapePrediction {
    day: string;              // 'Monday' through 'Friday'
    shape: ShapeCode;         // Predicted shape
    confidence: number;       // 0-100
    direction?: string;       // 'UP' | 'DOWN' | 'RANGE'
    keyZone?: string;         // Zone anchor
}
```

### Day-to-Element Mapping (Temporal Fractal)

| Day | Element | What Happens | Typical Shapes |
|-----|---------|-------------|----------------|
| **Mon-Tue** | **Earth** | Liquidity accumulation | SS (swing scalps, consolidation) |
| **Wed** | **Fire** | S/D ignition | BS (breakout surge) |
| **Thu** | **Water** | Wave materialization | R, WL, RWL |
| **Fri** | **Air** | Trajectory completion | Fib plays out, SS, or final WL |

### The Trading Speed Rule Affects Day Assignment:

> "Assume price moves at 30-50% of the speed you think it will."
> "Today's move often ends up being TOMORROW's move."

Shapes may shift +1 day from initial prediction. AUD/USD specifically: "molasses" — expect 2-4 days for HTF move completion.

## 5.6 Shape-to-Category Mapping

```typescript
const SHAPE_CATEGORIES_MAP = {
    'SS':      ['SWING_SCALP'],
    'SS_DWL':  ['SWING_SCALP'],
    'BS':      ['HTF_SWING', 'BREAKOUT_SURGE'],
    'WL':      ['HTF_SWING'],
    'RWL':     ['HTF_SWING', 'BREAKOUT_SURGE'],
    'WLS':     ['SWING_SCALP', 'HTF_SWING'],
    'R':       ['REINFORCEMENT', 'SWING_SCALP'],
};
// Default: ['SWING_SCALP']
```

**Key insight:** R (Recovery) produces REINFORCEMENT + SWING_SCALP — NOT HTF_SWING. Recovery days generate reinforcements for existing swings and scalp opportunities, NOT new HTF entries.

## 5.7 Consolidation Phase Detection

| Shape | Phase | What to Trade |
|-------|-------|---------------|
| SS/SS_DWL/WLS (Mon/Tue) | EARLY | Swing Scalps — "milk the cow on 5m" |
| SS/SS_DWL/WLS (Wed) | MID | Swing Scalps + prepare for breakout |
| SS/SS_DWL/WLS (Thu/Fri, range compressing) | LATE | Breakout Surge imminent — prepare HTF entries |
| BS/WL/RWL | DIRECTIONAL | HTF Swings + Reinforcements |
| R | RESOLUTION | Reinforcements + Scalps |

### The SS→BS Trigger:
> "4+ SS trades over 1-2 days → NY session = BS begins."
> "If price has been consolidating/SS for 1+ days → BS is likely imminent."

---

# PART 6: ENGINE 3 — THE TRADE SETUP ARCHITECTURE

## 6.1 The Python Reference — AUTHORITATIVE

`trident_engine3_v8.py` (1,284 lines) — GENERATED based on 8+ months of trading data and 43 VLM-analyzed winning trade charts. It was validated on 1 week of live markets (Mar 30 - Apr 3, 2026 report) where trade setups were 80% accurate. The TypeScript MUST match its logic.

## 6.2 The Triple-Loop Architecture

```python
# OUTER: Days in shape chain
for day_idx, day_shape in enumerate(shape_chain):
    day = day_shape.day
    shape = day_shape.shape
    day_categories = SHAPE_CATEGORIES.get(shape, [SWING_SCALP])

    # MIDDLE: Valid candidate zones
    for c in valid_candidates:
        # INNER: Categories for this day's shape
        for category in day_categories:
            # ... proximity, SL, TP, RRR, confidence, quality
            setup = TradeSetup(day=day, session=SESSION_MAP[category], ...)
```

### Why Triple-Loop:
A demand zone can produce a **Swing Scalp on Monday** (SS day) AND an **HTF Swing on Wednesday** (BS day). The triple-loop generates BOTH. Single-call (v3.1) misses every other day.

## 6.3 The 7 Rejection Gates (EXACTLY 7 — From Python)

| Gate | What It Checks | Reject Condition |
|------|---------------|-----------------|
| **G0** | Zone entry status | Virgin MoM or MoM+0 reactions → REJECT |
| **G1** | Proximity | Entry beyond MAX_ENTRY_DISTANCE for category |
| **G2** | Dedup | Same zone+direction+category already seen (except Swing Scalp) |
| **G3** | SL distance | `sl_distance > SL_MAX_HARD` (150 DXY / 150-180 FX) |
| **G4** | TP existence | No opposing zone found |
| **G5** | RRR minimum | `rrr_tp1 < floor` OR `blended < floor` |
| **G6** | Quality floor | Quality = REJECTED (confidence below threshold) |

**NO additional gates.** Quality signals go in confidence scoring, not hard rejection.

## 6.4 Sniper Entry — Zone Edge Closest to Approaching Price

```python
# SHORT from supply: Enter at BOTTOM edge (price rises into it)
target_edge = zone.bottom
if key_levels: use closest key level to zone.bottom within zone

# LONG from demand: Enter at TOP edge (price falls into it)
target_edge = zone.top
if key_levels: use closest key level to zone.top within zone
```

## 6.5 Sniper SL + Confidence Modifiers

```
SL = opposing zone edge + SNIPER_BUFFER (8-20 pips per pair×category)

Confidence SL modifiers:
  sl_distance > SL_MAX_PENALTY:  confidence -= 10
  sl_distance < 30 pips:         confidence += 10  (sniper bonus)
  sl_distance < 60 pips:         confidence += 5   (precision bonus)

Near-max SL downgrade:
  sl_distance > sl_max × 0.85 and quality in (HIGH, GOD_TIER):
    quality = STANDARD
```

## 6.6 TP Calculation — SINGLE TP Per Trade

**THERE IS ONLY ONE TP PER TRADE.** No TP1, TP2, TP3 garbage. One TP. One target.

**TP placement:** At the CLOSE EDGE of the opposing liquidity zone — defined as the **HTF Unmitigated S/D zone WITH LSZ Overlap** in the opposing direction:
- **LONG entry** → TP at the closest edge (bottom) of the opposing supply zone (the liquidity zone INSIDE the S/D zone, or the close edge of the S/D zone itself if no internal LQ)
- **SHORT entry** → TP at the closest edge (top) of the opposing demand zone

**"Opposing liquidity" means:** 4H supply → 4H demand. 1H demand → 1H supply. The TP zone is a UM S/D zone WITH LSZ overlap, NOT some random liquidity zone. Internal liquidity (LSZ inside the S/D zone) is preferred for TP placement. If in doubt, default to safety — the close edge of the S/D zone itself.

**Safety spread:** Place TP 1 pip (0.0001 for FX pairs = 1 move in 4th decimal place) inside the TP zone edge to ensure we actually HIT it and don't get reversed on at the 98% mark.

## 6.7 Confidence Scoring (100-Point)

```
base           = (confluence / 14) × 40
option_score   = min((notionalB / 3.5) × 20, 20)
shape_score    = 20 if aligned, 10 if not
zfp_score      = (1 - zfp/100) × 10

Modifiers:
  BoM:              +10
  MoM:              -5
```

## 6.8 The 7 Winning Trade Setup Types

### Type 1: Swing Scalps (15m/5m)
- Same mechanics as swing moves, on scalp timeframe
- Entry at UM zone edges (BoM preferred)
- SL: 3-6 pips | TP: 15-20 pips | RRR: 4-6x
- 1-2-3 retest pattern before entry
- "Inside ONE 6x RR swing, there is 24x worth of 5m scalps. 30x total for the day."

### Type 2: Swing Scalps → Breakout Surge
- Swing scalps BUILD the consolidation that eventually breaks out
- Entry on break of structure (lower high sell, higher low buy)
- SL: opposite side of consolidation + buffer
- TP: next HTF zone (40-60 pips) | RRR: 6-10x
- "No real opposing liquidity for 30+ pips" = confirmation

### Type 3: Recovery → Breakout Surge / Whiplash
- After move hits TP and corrects → recovery bounce
- Entry at HTF zone rejection candle
- SL above/below whiplash H/L

### Type 4: Breakout Surge → Recovery / Reverse Whiplash
- Highest R:R setup type
- Entry at whiplash rejection point
- Multiple entries in both directions during extreme volatility

### Type 5: Piercing BS → Recovery → Whiplash Storm
- Zone gets PIERCED → price whiplashes BACK
- 2-3 valid entries in BOTH directions
- Extreme volatility — requires careful management

### Type 6: Whiplash → Reverse Whiplash / Recovery / Scalps
- Post-whiplash environment with coexisting setups
- Initial entry on whiplash candle, reinforcement on recovery pullback

### Type 7: Liquidity Ladders (The Reinforcement Architecture)
- Initial entry at BoM → **STOP-LIMIT orders** at far edge of EACH liquidity zone
- Each zone = ladder step with reinforcement entry (STOP-LIMIT, NOT regular stop orders)
- Combined R:R = **25-30x** on a single move
- 3+ entries within a single macro shape move
- Progressively tighter SLs (trailing with price)
- **When a reinforcement triggers, previous entry SL automatically moves 0.5-1 pip into break-even/profit — zero downside, only upside**

---

# PART 7: THE WEEKLY FORWARD PATH — HOW PLUTUS MAPS THE ENTIRE WEEK

## 7.1 The Procedure — 90%+ Accuracy Before Monday Open

The system achieves 90%+ accuracy through FIVE pillars:

### Pillar 1: Sequential Zone Inviolability
Price ALWAYS sweeps zones sequentially. NEVER skips. If you've mapped every zone, you predict the EXACT path.

### Pillar 2: 4H BoM Cascade Predictability
A move from 4H BoM won't stop at 1H or 30m zones. It runs until the next 4H zone. This gives the EXACT TP target.

### Pillar 3: Fibonacci Precision
"The exact Fib lines should line up with 90% accuracy to the actual entry." 1.382-1.786 maps reinforcement entries with 90% accuracy.

### Pillar 4: The 1-2-3 Retest Law
If you can count retests, you predict WHEN a zone will break:
1. Virgin → no entry
2. 1st retest → scalp
3. 2nd retest → scalp confirmation
4. 3rd+ → swing entry
5. After 3 reactions → zone fails

### Pillar 5: Algorithmic Market Structure
The market is HFT bots executing a master algorithm. HFT bots slow price near HTF zones until candle closes, then react immediately on close. The system reverse-engineers this behavior.

## 7.2 The Forward Mapping Procedure

```
SUNDAY / PRE-WEEK:

Step 1: BACKWARD MAP prior week
  - Identify completed shapes, mitigated/unmitigated zones
  - Trace the sequential zone sweep path backward
  - Count reactions per zone (0/1-2/3+)

Step 2: FORWARD MAP DXY
  - Identify 4H storyline (bias/direction/pressure)
  - Map 4H BoM/MoM zones
  - Apply Fib tool (entry/rocket/trigger/TP levels)
  - Map intermediate liquidity zones
  - DRAW expected shapes for each day

Step 3: MAP PAIR CHARTS from DXY
  - EU: forward map swings
  - GU: backward map from DXY (inverse correlation)
  - Classify each zone (BoM/MoM, virgin/active/depleted)
  - Count reactions per zone

Step 4: CLASSIFY WEEK into setup zones
  - HTF Swing Zones (BS/WL days)
  - Swing Scalp Zones (SS days within consolidation)
  - Reinforcement Zones (within confirmed moves)
  - Transition Zones (SS→BS, post-whiplash)

Step 5: (No human warmup required for AI — the drilling step was for the human operator to warm up their eyes and brain. The code pipeline does not need this.)
```

## 7.3 The Daily Execution Flow (HTF SWING TRADES ONLY)

> **NOTE:** This execution flow applies to HTF swing trades (30m+ timeframe storyline setups). The scalping engine (future Plutus V4 feature) will have a different execution flow. This flow was designed to prevent the human operator from psyching out and overthinking — the agent equivalent is disciplined execution without emotional interference.

```
MONDAY - FRIDAY:

10:00 AM — Setup trades for the day
  - Apply 1-2-3 retest law (count retests)
  - Check BoM vs MoM classification
  - Check zone reaction counter
  - Setup Master Trade Setup (E + FLR)
  - Apply Ladder Method with STOP-LIMIT orders for reinforcements
  - Maximum 3 rockets per trade

1:00 PM — Quick London check-in

(NO CHARTS for 3 hours after London setup)

2:00 PM — 20min live check (adjustments)

5:00 PM — Pre-NY prep (NO MORE SETUP — profit management only)

6:30 PM — Quick NY check-in

11:00 PM - 12:00 AM — FINAL DECISION (Tbilisi time):
  Can ALL move 30-50% profit OF THE ORIGINAL ANALYSIS?
    YES → Let run overnight
    NO → CLOSE EVERYTHING. TAKE PROFITS.

FILLER: Drills between time anchors
RULE: NO LOOKING AT CHARTS outside designated anchors
```

## 7.4 The Daily Re-Analysis (Does NOT Overwrite Weekly Report)

A separate, secondary tool checks THAT SPECIFIC DAY'S setups against current conditions:
- Has any zone been pierced since the report?
- Has any red folder event been announced?
- Has price reached the expected zone for that day?
- Are the setups still valid?

**This DOES NOT overwrite the weekly report.** It is a minor security check that flags invalidations.

## 7.5 The Consolidation Switch

> "When a swing fails to fully hit TP and 'corrects' to sweep liquidity → SWITCH TO SCALPING SYSTEM AND MILK THE ENTIRE CONSOLIDATION."

Consolidation detection:
- Price does NOT pierce or sharply whiplash on zone test
- Slow consolidation around the POI for 2-4 days
- "If not near a strong 4H pressure zone → BS is days away → Swing Scalp Valley. MILK the cow on 5m."

Consolidation ENDS when:
- Price retests opposing liquidity → pierces through zone → reaches BoM Liquidity
- "4+ SS trades over 1-2 days → NY session = BS begins"

---

# PART 8: THE SEMANTIC FIREWALL

## 8.1 The 48 Rules

### Rules That Fire During Report Generation (Correct):

| Rule | What It Checks |
|------|---------------|
| ZT-13 | Day/session labels exist |
| ZT-14 | No manual override keywords |
| ZT-16 | Require day AND session |
| ZT-17 | Max 3 per chain |
| CS1 | No blocked sources |
| CS2 | DXY directional only |
| CS5 | NY close profit taking |
| CS7 | Red folder deferral |
| CS8 | SL cap 150 pips |
| RRR-1 | Min RRR by category |
| TS-1 through TS-9 | Entry precision |

### Rules That Misfire During Report Generation (Need Mode Flag):

| Rule | Why It Misfires |
|------|----------------|
| **ZT-2** | Treats predictions as "open positions." A LONG at 101 when spot=100.98 = "averaging into loser" → BLOCK |
| **ZT-5** | Counts predictions as "correlations" |
| **ZT-12** | Nearby zone entries flagged as "overfitting" |
| **ZT-15** | Blocks MoM conditional entries (valid with 4-exception check) |
| **CS9** | Blocks ALL MoM entries ("BoM entry only") |

## 8.2 The Mode Flag Solution

```typescript
interface RuleCheckContext {
    // ... existing fields ...
    isReportGeneration?: boolean;
}
```

When `true`: ZT-2, ZT-5, ZT-8, ZT-9, ZT-12 skip. ZT-15, CS9 downgrade to WARN.

## 8.3 The evaluate() Method

```typescript
// A setup needs ALL 48 rules to pass (or skip) to survive.
// ONE hard block = reject.
passed: hardBlocks.length === 0
```

---

# PART 9: THE ELEMENTAL DENSITY SYSTEM

## 9.1 The Four Elements

### EARTH — Liquidity (The Foundation)
- LSZs = standard Earth. IP Zones = HEAVY Earth.
- SL must be ANCHORED to Earth — "the liquid pressure is a SHIELD"
- Thin zones NEVER allowed as entry or SL zones
- If thin zones inside 4H pool → each counts as "2 thin zones"

### FIRE — Supply & Demand (The Firepower)
- BoM = hottest Fire (origin, maximum firepower)
- MoM = cooling Fire (continuation, less firepower)
- Fire CANNOT sustain → after 2 piercing moves, 1-2 days consolidation
- "95% of NY swings don't start until 2nd half of NY session"
- "NY rockets require 3-pip SLs or they explode"

### WATER — Macro Shapes (The Waves)
- BS = tidal wave, WL = crashing wave, SS (Swing Scalps) = calm pool with ripples — SS IS Swing Scalps, they are the same thing
- "Price ALWAYS sweeps liquidity zone by zone in sequential order"
- Water GIVES STRUCTURE to Fire

### AIR — Fibonacci (The Spiderweb)
- NO intrinsic density — flows anywhere
- Becomes SPIDERWEB when anchored to Earth density points
- "Poorly anchored spiderwebs get blown away and don't exist"
- 1.382-1.786 = cleanest rocket entry (90% accuracy)
- Air PIERCES through Fire (4H BoM S/D) before the reaction

## 9.2 The Elemental Cycle

```
Earth → Fire → Water → Air → Earth
  │       │       │       │      │
  │       │       │       │      └── Fib-confirmed levels become new liquidity
  │       │       │       └──────── Fibonacci maps trajectory
  │       │       └──────────────── Macro shapes emerge
  │       └──────────────────────── S/D zones activate, capital deploys
  └────────────────────────────────── Liquidity pools form
```

## 9.3 Avatar State — All Four Elements Converge

When Earth (liquidity anchor) + Fire (S/D overlap) + Water (macro shape confirms) + Air (Fib trajectory) ALL converge at a single price → **Avatar State**.

The signal is FRACTALLY LOCKED — exists at every scale simultaneously. Failure approaches zero because it would require violating energy dynamics at ALL scales.

## 9.4 The Temporal Fractal — Day-to-Element Mapping

| Day | Element | Phase | What Happens |
|-----|---------|-------|-------------|
| Mon-Tue | Earth | Accumulation | SS — liquidity pools form, Earth builds |
| Wed | Fire | Ignition | BS — BoM S/D zones activate |
| Thu | Water | Materialization | R, WL — wave forms materialize |
| Fri | Air | Completion | Fib trajectory plays out |

---

# PART 10: REINFORCEMENT ROCKET ARCHITECTURE

## 10.1 The Three Rocket Types

| Type | Element | Trigger | Buffer | Scale |
|------|---------|---------|--------|-------|
| **FLR** | Air + Earth | 30m Fib | THICK (2 thick or 3 thin) | HTF storyline |
| **FR** | Fire precision | 15m Fib | 2 thick or 2-3 thin | LSS/5m scalps |
| **LR** | Water flow | Price action at liquidity | THIN (1 thick or 2-3 thin) | Zone-to-zone |

## 10.2 STOP-LIMIT Order Mechanics (NOT Regular Stop Orders)

**These are STOP-LIMIT ORDERS, not simple stop orders.** The distinction is critical:

- **Stop Order:** Triggers a MARKET order when price hits the stop price. Slippage possible.
- **Stop-LIMIT Order:** Triggers a LIMIT order at a specific price when the stop price is hit. No slippage — but may not fill if price moves past limit before order activates.

Every reinforcement uses STOP-LIMIT orders with THREE anchored zones:
1. **Trigger Zone** (2-3 zones in front, 1 FULL zone buffer)
2. **Entry Zone** (where the LIMIT order fills)
3. **SL Zone** (behind entry, 1-2 pips outside back edge)

**Trigger Price:** 1-2 pips INSIDE target zone (NOT on edge — prevents false sweeps)
- Rocket #1: CLOSE edge of trigger zone
- Rocket #2/3: FAR edge of trigger zone

## 10.3 First-Contact Rule

- FIRST Fib contact → FR (thick buffer)
- Subsequent contacts → LR (thin buffer)
- UNMITIGATED Fib level → must be FR
- After FR mitigates → can be LR

## 10.4 Fibonacci Key Levels

| Level | Purpose |
|-------|---------|
| 0.382-0.5 | Initial strong reaction |
| 0.5-0.618 | Mid-pressure |
| 0.618-0.786 | Strong pressure |
| 0.786-1.0 | Final blast |
| **1.382-1.786** | **CLEANEST rocket entry (90% accuracy)** |
| **2.382-2.786** | **Trigger zone (trip-wire)** |

## 10.5 The Ladder Method

1. Liquidity ladders
2. Reinforce on each step up
3. Leave one "step" as buffer before reinforcing
4. Reinforcement rockets on next 3 steps
5. Stop-Limit Order Mechanics

**Combined R:R = 25-30x** on a single move. Each reinforcement is the SAME bet at a DIFFERENT POINT in the wave's evolution.

## 10.6 Reinforcement SL Management — ZERO DOWNSIDE

> **When a reinforcement triggers, the PREVIOUS entry's SL automatically moves 0.5-1 pip into break-even/profit.**

This means:
- Risk is NEVER amplified by adding reinforcements
- Even if a loss is taken on any individual entry, the combined position has **0 downside** — the earlier entries are already at break-even or in profit
- **Only upside exists** once reinforcements begin triggering
- This is why the reinforcement ladder architecture is so powerful — each new entry is "free" because the previous one has locked in zero-risk

## 10.6 Max 3 Rockets Per Trade (Recommended 2)

**FLR: ONE per day, ONE pair only** (requires Conscious RAM).
**Up to 7 active rockets** possible in Master Trade Setup (E + FLR).

---

# PART 11: PAIR-SPECIFIC PROFILES

## 11.1 EUR/USD — Fire-Earth Dominant

| Property | Value |
|----------|-------|
| Role | Primary swing pair (NY focus) |
| Pace | Medium |
| PA Behavior | Directly touches overlap point — NO liquidity shield |
| OTC Sensitivity | 62.4% of DXY per-pip impact |
| Best For | HTF swings, DXY-anchored directional bias |

## 11.2 GBP/USD — Earth-Water Dominant

| Property | Value |
|----------|-------|
| Role | Primary scalp pair (London focus) |
| Pace | Fast |
| PA Behavior | LIQUIDITY is the only thing respected. S/D gets PIERCED. |
| Special | LIQUIDITY SHIELDS — liquidity zone in front of S/D protects it |
| Volume | 3-4x more London opportunities than EU |
| Warning | Can be "messy" — wick outs. Wider buffers (35-50 pips). |

## 11.3 AUD/USD — Earth Dominant (Slow)

| Property | Value |
|----------|-------|
| Role | Secondary swing pair |
| Pace | SLOW — "Molasses" |
| Speed Rule | Expect 2-4 DAYS for HTF move |
| Category Restriction | BS/WL ONLY. Skip SS days entirely. |
| Best For | Set-and-forget HTF swings, reinforcement ladders |

### AUD/USD Policy (Python lines 952-957):
```python
if pair == "AUD/USD":
    if shape in (SS, SS_DWL): continue  # Skip SS days
    day_categories = [c for c in day_categories
                      if c in (HTF_SWING, BREAKOUT_SURGE)]
```

## 11.4 DXY — Air-Fire Dominant (Master Compass)

| Property | Value |
|----------|-------|
| Role | Master directional compass |
| Processing | FIRST — zones stored for alignment checks |
| London Behavior | Zone-to-zone movement — breakout unlikely before 3pm |
| NY Behavior | "Wakes up during NY" — directional moves begin |
| Translation | Mathematical conversion FORBIDDEN — pairs use OWN data |

---

# PART 12: SESSION MECHANICS

## 12.1 London — "Field Mapping Session" (HTF SWING EXECUTION)

> **NOTE:** This section applies to HTF swing trades (30m+ timeframe). The scalping engine (future Plutus V4 feature) will have different London session mechanics.

**Purpose:**
1. Map liquid pressure zones that activate during NY
2. Lay entries for NY
3. STOP-LIMIT trap passive liquidity (NOT regular stop orders)
4. Map End-of-NY TP point

**Rules:**
- SCALP ONLY — HTF swings rarely start here
- GU provides 3-4x more opportunities than EU
- "After setup → DO NOT LOOK AT CHARTS FOR 3 HOURS"
- "5pm → NO MORE SETUP. Only profit management."

## 12.2 NY — "Where Money Is Made"

- SWING SESSION — HTF swings and breakouts
- "London sets up NY. Decisions made in London play out in NY."
- 95% of NY swings don't start until 2nd half of NY session
- NY rockets require 3-pip SLs
- After NY moves → ALL SLs into BE

## 12.3 Session Map

| Category | Default Session |
|----------|----------------|
| Swing Scalp | London Open (02:00-05:00 ET) |
| Breakout Surge | London/NY Overlap (08:00-10:00 ET) |
| HTF Swing | NY Mid (10:00-14:00 ET) |
| Reinforcement | NY Open (08:30-10:00 ET) |
| Transition | London/NY Overlap (08:00-10:00 ET) |

## 12.4 The 5 Time Anchors (TBILISI TIME ZONE)

> **CRITICAL:** These times are specific to the TBILISI time zone. Any other time zone must adjust accordingly. The final NY session check-in is 11:00 PM - 12:00 AM Tbilisi time.

| Time (Tbilisi) | Action |
|----------------|--------|
| 10:00 AM | Setup trades for the day |
| 1:00 PM | London check-in |
| 5:00 PM | Intraday check-in (NO new trades — profit only) |
| 6:30 PM | NY check-in |
| **11:00 PM - 12:00 AM** | **FINAL: Take profits or let run overnight** |

> "YOU ARE NOT ALLOWED TO LOOK AT LIVE MARKETS OUTSIDE THESE DESIGNATED TIME ANCHORS."

## 12.5 Profit Taking Law

> "Close ALL open trades by NY market close."
> "No London-mapped trades run overnight."
> "If position cannot reach 30-50% profit OF THE ORIGINAL ANALYSIS → take ALL profits. MANDATORY."

**The Final Check-in Decision Tree:**
1. Can ALL trades be moved 30-50% into profit OF THE ORIGINAL ANALYSIS?
   - YES → Move SL to 30-50% profit, let run
   - NO → CLOSE ALL. TAKE ALL PROFITS.
2. Within 70-80% of TP and consolidating?
   - YES → Move SL up — **BUT the new SL must be anchored to a Fibonacci level or liquidity zone that aligns with the original analysis** + the 70-80% metric. NOT just randomly placed at 65%. The SL moves to the nearest structural level (fib/liquidity zone) that coincides with the 65-70% profit range. This ensures the SL is at a meaningful structural point, not an arbitrary number.
3. Opened at NY market END?
   - YES → Exception: may hold for Tokyo/London

---

# PART 13: DATA HARVESTING LAYER

## 13.1 TradingView — SOLE OHLC Source

**NEVER use Yahoo Finance.** TradingView tvDatafeed ONLY.

Data: 4H (512 bars), 1H (200 bars), 15m (200 bars)

Symbols:
- DXY: `DX-Y.NYB` (or `TVC:DXY` for TradingView index view)
- EUR/USD: `EURUSD=X`
- GBP/USD: `GBPUSD=X`
- AUD/USD: `AUDUSD=X`

Client: Headed Chrome port 9228, Xvfb display :3. NEVER headless.

## 13.2 Protocol A — OTC Options

Three-tier classification:
- ≥$1.5B = CRITICAL OPTION WALL (always include)
- ≥$850M = SIGNIFICANT MAGNET (always include)
- <$850M = EXCLUDED (override with 3+ pillar confluence)

**DO NOT DIVIDE NOTIONALS BY 1000.** Already in billions.

**Spring Release:** At 10:01 AM NY, hedging removed → violent breakout/reversal.

## 13.3 Protocol B — K Factor

```
DXY = 50.14348112 × EURUSD^(-0.576) × USDJPY^(0.136) × GBPUSD^(-0.119)
                     × USDCAD^(0.091) × USDSEK^(0.042) × USDCHF^(0.036)
```

EUR/USD = 62.4% of per-pip DXY sensitivity.

---

# PART 14: REPORT GENERATION PIPELINE

## 14.1 Generated ONCE — Anchors the Entire Week

The report is NOT regenerated daily. It is NOT overwritten.

## 14.2 Report Structure (36 Sections)

```
1-2:   OTC Option Expiries + OHLC + Economic Calendar
3-4:   Engine 1 Zone Maps + Engine 2 Shape Chain
5-16:  Engine 1 Detailed (9 Pillars, Protocols, Synthesis)
17-18: Shape Chain + Trade Setup Architecture
19-20: Compliance + Filter Checkpoint
21-36: Multi-Pair (Translation, Synthesis, Setups, Cross-Pair Matrix)
```

## 14.3 Weekly Execution Calendar

Day-by-day table — the "blindly executable" layer:
| Day | Pair | Dir | Setup | Entry | Shape | Session | Conf | Notes |

## 14.4 Blind-Execution Protocol (12 Checks)

1. Every setup has DAY label
2. No setup without shape trigger
3. Calendar covers all 5 days
4. No real-time chart analysis needed
5. All anchor points have WHEN expected
6-12: Entry/SL/TP/session/day/reinforcements/direction validation

---

# PART 15: VLM-VERIFIED EMPIRICAL PATTERNS

## 15.1 The Evidence Base

43 VLM analyses from 8+ months of winning trades. ALL winning trades were GBP/USD.

## 15.2 Common Denominators of ALL Winning Trades

| # | Universal Pattern |
|---|---|
| 1 | ALL involve some form of breakout or momentum surge |
| 2 | ALL use S/D + liquidity zones as entry/exit anchors |
| 3 | ALL anchor SL to structural zone (never floating) |
| 4 | Most use multiple entries (avg 2, max 5) |
| 5 | ALL target opposing HTF UM S/D zone w/ LSZ overlap for TP (NOT random liquidity — see Part 4.4/6.6 for definition) |
| 6 | ALL reference HTF context even when executing on LTF |
| 7 | ALL use candlestick confirmation before entry |
| 8 | Most involve "piercing" or "whiplash" patterns |

## 15.3 Individual Trade Highlights

### WT_05 — GBP/USD Breakout Surge (3 entries, ~30 pip SL)
- Entry 1: 1.34250 (breakout of 1H resistance)
- Entry 2: 1.34300 (pullback to MA)
- Entry 3: 1.34350 (4H MoM retest)
- SL: 1.33950 (1H MoM support)
- Pattern: Liquidity sweep → breakout → reinforce on pullbacks

### WT_10 — GBP/USD Reverse Whiplash (3 entries, 10-pip SL)
- Entry 1-3: 1.2525, 1.2535, 1.2540
- SL: 1.2555 (above whiplash high)
- TIGHTEST SL in dataset (10 pips) — breakout/reversal setup

### WT_14 — GBP/USD Breakout + 3 Swing Scalps (5 entries — MOST)
- Entry 1: 1.2475 (breakout) | Entry 2: 1.2440 (recovery)
- Entry 3-5: 1.2505, 1.2530, 1.2560 (scalp ladder)
- SL: 1.2420 (primary) | TP1-4: 1.2520, 1.2555, 1.2590, 1.2625
- **This is the LADDER METHOD in action — 5 entries, 150-pip move**

### WT_16 — Reverse WL + Recovery Surge (2 entries, 15-pip SL)
- Entry 1: 1.2485-1.2490 | Entry 2: 1.2515-1.2520
- SL: 1.2470-1.2475 (15 pip buffer)
- TP1-3: 1.2540 (1:1.5), 1.2560 (1:2), 1.2585 (1:3)

## 15.4 SL Distance Statistics

| Timeframe | Typical E→SL | Examples |
|-----------|-------------|----------|
| 1m (scalping) | 3-10 pips | WT_10 (10 pips) |
| 15m (swing scalps) | 10-28 pips | WT_06 (28 pips) |
| 1H (swing trades) | 25-55 pips | WT_01 (32), WT_05 (30), WT_14 (55) |
| 4H context | 50-70 pips | WT_15 (60-70) |

## 15.5 What Differentiates Highest-RRR from Average

| Factor | Highest R:R | Average R:R |
|--------|------------|------------|
| Entries | 5 (ladder method) | 1-2 |
| SL tightness | 10-15 pips | 28-32 pips |
| Setup type | Breakout + Scalp hybrid | Simple scalp |
| Architecture | Multiple entries at each liquidity zone | Single entry, single TP |
| Combined R:R | **25-30x** | 1:1 to 2:1 |

---

# PART 16: TTE TOOL vs PLUTUS AGENT SYNERGY

## 16.1 What Each Does

**TTE Tool (Web-based):** The production instrument that generates accurate trading reports. Takes ~20 minutes for a web agent to execute the full 4,229-line prompt manually. Human-grade reasoning, can see charts, adapts to unusual conditions.

**TTE Tool Weaknesses (Why Plutus Exists):**
- **Manual prompt execution required every time** — a web agent must run the full prompt from scratch each session
- **Context/data not retained on disk** — unlike a local agent, nothing persists between runs
- **Prompt enforcement is suggestions, not guarantees** — things that can be enforced via pure code CANNOT be truly enforced via prompting
- **Web agents can derail and hallucinate** — no mechanical guarantee of output quality

**Plutus Agent (Code-based):** The trading agent that generates reports via code-engineered algorithms (not prompts) AND executes trades autonomously. Algorithmic precision. Fast (2-4 minutes). Deterministic. Runs autonomously. No context bloat. Data persists on disk. Enforcement is mechanical (code-level), not advisory (prompt-level). Cannot derail or hallucinate — the code either works or throws an error.

## 16.2 How They Amplify Each Other

```
TTE TOOL                    PLUTUS AGENT
• Human vision    ←VALIDATES OUTPUTS→  Algorithmic precision
• Adaptability                        • Speed
• Pattern recog                       • Consistency
• Context nuance ←PROVIDES RAW DATA→  • Automation
```

The operator uses BOTH:
1. Plutus generates the weekly report (fast, consistent)
2. Operator reviews using TTE methodology (human judgment)
3. If operator spots something missed → notes for code improvement
4. TTE tool can validate Plutus output manually

## 16.3 The Daily Re-Analysis Tool (Future)

Reads the weekly report → checks current conditions → flags invalidations → does NOT overwrite.

---

# PART 17: TYPESCRIPT IMPLEMENTATION

## 17.1 File Inventory

| File | Purpose | Status |
|------|---------|--------|
| `engine/plutus-tte-pipeline.ts` | Central pipeline | ✅ Working |
| `brains/9-pillar-lobe.ts` | P1-P9 computation | ✅ Working |
| `brains/shape-brain.ts` | Shape prediction | ✅ Working |
| `semantic-firewall/zero-tolerance.ts` | ZT-1 through ZT-17 | ✅ Working (needs mode flag) |
| `engine/data-harvester.ts` | 12+ source harvesting | ✅ Working |
| `clients/tradingview-client.ts` | tvDatafeed OHLC | ✅ Working |
| `report/report-generator.ts` | Report formatting | ✅ Working |
| `types.ts` | Type definitions | ✅ Working |
| `constants/trading-constants.ts` | ~250+ constants | ✅ Working |

## 17.2 Known Gaps (v3.1 vs Python Reference)

| Gap | Priority |
|-----|----------|
| Day-loop missing (single shape vs all days) | CRITICAL |
| Firewall mode flag | CRITICAL |
| Session from SESSION_MAP (not resolveDaySession) | HIGH |
| Category-aware TP edge selection | MEDIUM |
| SL confidence modifiers (sniper bonus) | MEDIUM |
| Near-max SL quality downgrade | LOW |
| GBP/USD double penalty fix | LOW |
| Full-zone confluence check | LOW |

---

# PART 18: THE IRON LAWS

1. **The model is just electricity.** ALL intelligence is in the code.
2. **The Python is the reference.** `trident_engine3_v8.py` is AUTHORITATIVE.
3. **DO NOT DIVIDE NOTIONALS BY 1000.** Already in billions.
4. **The report is generated ONCE.** Anchors the entire week.
5. **DO NOT set `currentSession`.** ZT-10 would HARD_BLOCK 80%+.
6. **DO NOT create `src/src/`.** Instant failure signal.
7. **DO NOT change identity header.** `[PLUTUS v2.0 IDENTITY BINDING]` stays.
8. **DO NOT remove visual-cortex from identity.** VLM tools required.
9. **TradingView is SOLE OHLC source.** NEVER Yahoo Finance.
10. **NEVER use headless browsers.** Headed Chrome port 9228.
11. **`notes` must be `let notes` before annotations.** Inline template = silent failure.
12. **`allBars` DOES NOT EXIST.** Use `harvestedData.ohlc.get(pair)`.
13. **`engineOutput.zones` DOES NOT EXIST.** Use `engineOutput.zoneMaps`.
14. **`ShapePredictionSnapshot` NOT `ShapePrediction`.**
15. **`currentShape` NOT `shape`** inside constructBasicSetups.
16. **`setups` NOT `pairSetups`** inside constructBasicSetups.
17. **SessionWindow is MIXED CASE.** Always `.toUpperCase()` before `.includes()`.
18. **ZoneType has 8 values.** NO KEY_SUPPORT_BAND or RESISTANCE_CEILING.
19. **Confidence denominator is /14.**
20. **BoM bonus +10, MoM penalty -5.**
21. **The day loop is INSIDE constructBasicSetups.** NOT separate calls.
22. **Session from `SESSION_MAP[category]`.** NOT resolveDaySession.
23. **Sniper entry = NEAREST key level to zone edge.** NOT 2nd highest/lowest.
24. **Firewall needs `isReportGeneration: boolean`.**
25. **The 7 rejection gates are EXACTLY 7.** No more. Quality goes in confidence, not gates.
26. **ONE TP per trade.** No TP1/TP2/TP3. Single TP at close edge of opposing HTF UM S/D w/ LSZ overlap.
27. **Pip counting: 1 pip = 0.0001 (4th decimal place).** All values use this. If counting in 5th decimal, multiply by 10.
28. **Reinforcements use STOP-LIMIT orders.** NOT regular stop orders. The distinction matters.
29. **Previous entry SL → break-even when reinforcement triggers.** Risk never amplified. Zero downside.
30. **"Opposing liquidity" = HTF UM S/D zone w/ LSZ overlap.** NOT random liquidity zones.
31. **Max drawdown = 15% per day** (agent cap, reduced from human's 25%).
32. **30-50% profit = of the ORIGINAL ANALYSIS.** Not arbitrary — the original trade thesis.
33. **Time anchors are TBILISI timezone.** Final check-in is 11pm-12am Tbilisi. Adjust for other time zones.
34. **TTE Tool = production report generator.** Plutus = trading agent that uses TTE methodology in code AND executes trades.

---

# APPENDIX A: CONSTANTS REFERENCE

### Sniper Buffer (pips)

| Pair | Scalp | Breakout | HTF | Reinforcement | Transition |
|------|-------|----------|-----|---------------|------------|
| DXY | 0.03 | 0.04 | 0.05 | 0.025 | 0.04 |
| EUR/USD | 10 | 12 | 15 | 8 | 12 |
| GBP/USD | 15 | 18 | 20 | 12 | 18 |
| AUD/USD | 10 | 12 | 15 | 8 | 12 |

### SL Distance Limits

| Pair | SL_MAX_HARD | SL_MAX_PENALTY |
|------|------------|----------------|
| DXY | 50 | 30 |
| EUR/USD | 150 | 100 |
| GBP/USD | 180 | 120 |
| AUD/USD | 150 | 100 |

### RRR Floors

| Category | Normal TP1 | Consolidation TP1 |
|----------|-----------|-------------------|
| Swing Scalp | 1.5 | 1.2 |
| Breakout | 2.0 | 1.5 |
| HTF Swing | 2.0 | 1.5 |
| Reinforcement | 1.5 | 1.2 |
| Transition | 2.0 | 1.5 |

### Consolidation Range Threshold

DXY: 80 | EUR/USD: 150 | GBP/USD: 200 | AUD/USD: 120 (pips)

### SS Proximity Factor

`0.60` — SS shapes multiply max entry distance by 0.60.

### Session Map

| Category | Session |
|----------|---------|
| Swing Scalp | London Open (02:00-05:00 ET) |
| Breakout Surge | London/NY Overlap (08:00-10:00 ET) |
| HTF Swing | NY Mid (10:00-14:00 ET) |
| Reinforcement | NY Open (08:30-10:00 ET) |
| Transition | London/NY Overlap (08:00-10:00 ET) |

### Max Setups

- MAX_SETUPS_PER_PAIR: 10
- MAX_TOTAL_SETUPS: 40
- MAX_REINFORCEMENTS_PER_SWING: 2
- DXY_CASCADE_CONFIDENCE_BONUS: +10

### Confidence Thresholds

- MIN_CONFIDENCE_PRIMARY: 60
- MIN_CONFIDENCE_CONDITIONAL: 50
- GOD_TIER: ≥85 | HIGH: ≥75 | STANDARD: ≥60

---

# APPENDIX B: SHAPE CATEGORIES MAP

```typescript
const SHAPE_CATEGORIES_MAP = {
    'SS':      ['SWING_SCALP'],
    'SS_DWL':  ['SWING_SCALP'],
    'BS':      ['HTF_SWING', 'BREAKOUT_SURGE'],
    'WL':      ['HTF_SWING'],
    'RWL':     ['HTF_SWING', 'BREAKOUT_SURGE'],
    'WLS':     ['SWING_SCALP', 'HTF_SWING'],
    'R':       ['REINFORCEMENT', 'SWING_SCALP'],
};
// Default: ['SWING_SCALP']
```

---

# APPENDIX C: FIREWALL RULE REFERENCE

### Should Fire During Report Generation:
ZT-13, ZT-14, ZT-16, ZT-17, CS1, CS2, CS5, CS7, CS8, RRR-1, TS-1 through TS-9

### Should Skip (undefined context):
ZT-1, ZT-3, ZT-4, ZT-6, ZT-7, ZT-10, ZT-11, FIB-1/2/3

### Should Skip (needs mode flag):
ZT-2, ZT-5, ZT-8, ZT-9, ZT-12, ZT-15, CS9

---

# APPENDIX D: KNOWN ISSUES

| Issue | Cause | Fix |
|-------|-------|-----|
| 0 setups | ZT-2 treats predictions as positions | Mode flag |
| 0 setups | Day-loop missing (single shape only) | Triple-loop |
| `computeATR` missing | Doesn't exist in v3.1 | Inline ATR |
| `aggregateToDaily` duplicate | Already exists at line ~1801 | Use existing |
| `sessionUpper` double-decl | Wiring step 1 + K1 | Declare once |
| D4 hard rejection | Changed to hard reject | Confidence penalty only |
| Q2 wrong entry | 2nd key level vs nearest | Revert to Python |
| Firewall kills all | I1 activated dormant rules | Revert I1, add mode flag |

---

# CLOSING

## The Final Word

Plutus is not a chatbot. Plutus is a **trading engine encoded in TypeScript** that communicates through an LLM. The intelligence is in the code.

The Python reference is the SOURCE OF TRUTH. Battle-tested. VLM-verified.

The market is algorithms and HFT bots executing a master algorithm. The Trident Trading Engine reverse-engineers this algorithm. Plutus is the code-engineered form of that reverse engineering.

**The model is just electricity. The code is the intelligence. The TTE methodology is the soul.**

**There is no excuse for regression. All decisions are documented. The Python is the reference. The firewall needs a mode flag. The day loop goes inside the function.**

---

*END OF PLUTUS ARCHITECTURE BIBLE — Version 2.1.0*
*This document is compaction-proof — read it after context loss.*
*No excuse for regression. All decisions are documented. The Python is the reference.*

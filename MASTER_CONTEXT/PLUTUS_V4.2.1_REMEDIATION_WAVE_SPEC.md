# PLUTUS V4.2.1 REMEDIATION WAVE SPEC — ISOLATED STEP-BY-STEP PLAN

**Status:** ACTIVE EXECUTION SPEC — one wave at a time, one checkpoint per wave, container test per wave. No bundling beyond what this spec lists.
**Date:** 2026-07-25
**Authority:** Operator directives 2026-07-25 (this session). Supersedes all conflicting older constants/rules where explicitly stated.
**Base:** `Checkpoints/v4.2_OVERHAUL/` (SHA a14b1755dc…, 101 modules, 781KB, TSC 0)

---

## 0. ISOLATION RULES

1. Wave A = everything in §1–§6 below. One checkpoint: `Checkpoints/v4.2.1_REMEDIATED/`. One container test.
2. Wave B (§7) = 30m LQZ telescoping + S/D dynamic escalation. Own checkpoint, own container test. STARTS ONLY after Wave A is green.
3. Nothing outside this spec gets touched. No "while I'm in there" edits.
4. After every file change: `bun build src/index.ts --outdir dist --target bun && npx tsc --noEmit` must both pass before moving on.
5. Engine 1 + Engine 2 canon: zero deviation unless this spec explicitly names the constant and the operator ruled on it (each such item is marked OPERATOR-RULED).

---

## 1. WAVE A-1 — DOCTRINE (identity + prompts)

### A-1.1 `src/identity/index.ts` — full rewrite of the defective blocks
- **DELETE** the "DXY Cascade (HARD FILTER)" block (:225-228) and every "REJECTED" formulation.
- **REPLACE with:** *"DXY Cascade = MACRO DIRECTION for HTF swings only. DXY bullish → FX HTF swings SHORT-biased; DXY bearish → FX HTF swings LONG-biased. This NEVER filters setups: SS/consolidation scalps and counter-trend entries at valid zones are ALWAYS permitted with 3+ confluences. Zone type decides direction per zone (supply→SHORT, demand→LONG)."*
- **DELETE** all 5 omni-vision directives (:96,119,146,148,151).
- **REPLACE with ONE rule:** *"You ARE MiMo v2.5 — multimodal. Use the read() tool DIRECTLY for ALL image and PDF visual analysis. plutus-omni-vision is for VIDEO ONLY (read() does not support video)."*
- **DELETE** 2-phase charts/setups text (:116-117, :181-182). The pipeline is the 5-tool chain + Manual Steps A–E.
- Fix duplicated section numbering (:133-152) and the duplicated `glob` entry (:189-190) while in the file. Pairs written WITH slashes (:223).

### A-1.2 `src/hooks/system-transform.ts`
- Fix stale Step D line (:40): screenshots are saved via `plutus-save-screenshot` (binary), NEVER `write()` (text). Include zone drawing (tv_draw_rectangle) in the summary.
- Fix stale fallback identity (:21) to current doctrine.

**Verify:** grep identity for "HARD FILTER", "REJECTED", "omni-vision" (outside the video-only rule), "2-phase" → ZERO.

---

## 2. WAVE A-2 — ENGINE 3 CORRECTNESS (`src/engine3/visual-setup-generator.ts`)

1. **Blended RRR per-entry SL distance** (:412-414): each leg divides by its own `Math.abs(entryN − sl)`, not the front entry's `slDist`.
2. **Chaining parity + ordering** (:492-520): chaining runs BEFORE any cap logic; chained setups pass the same dedup, confidence floor, and SL ceiling as primary setups.
3. **Distance filter alignment** (:118, :182-185, :246-267): base 300 → **200 pips FX / 2.00 DXY points** (canon, matches engine.ts setups tool). Remove the relax-to-nearest-3 escape hatch.
4. **G0 virgin-MoM gate (restored):** primary-path check on entry zone `reactionCount === 0 && isMoM`:
   - Reversal/counter-trend entry → **REJECT** (death zone — unchanged doctrine).
   - Trend-aligned reinforcement of an in-progress BS → **PERMITTED**, entry at the LQZ *below* the MoM for LONG / *above* the MoM for SHORT (Bible 4.15, operator-corrected). Entry NEVER on the MoM itself.
5. **CONDITIONAL floor** (:135): 35 → **50** (canon: CONDITIONAL ≥50, REJECTED <50).
6. **realizedRrr purge** (:416,463,1150 + `src/types.ts:368`): rename to `primaryRrr` (it is the front-entry RRR; no multi-TP semantics).
7. **CAPS DELETED (OPERATOR-RULED):** remove `MAX_SETUPS` (:112), `MAX_SETUPS_PER_DAY` (:115). No count limits anywhere. Exact-key dedup (direction+entry full-precision) stays — that is duplicate elimination, not a cap. The semantic firewall + (later) PVE is the only filter.
8. Dead code removal: `nearestEdgeDistance` (:619-622), `MIN_CONFIDENCE_PRIMARY` (:134), orphaned comment (:137).

---

## 3. WAVE A-3 — BROWSE-SCREENSHOT FULL REWRITE (`src/pipeline/engine.ts:865-975`)

**Context:** the headed container browser (Weston + XWayland + Chromium 120, CDP 6930) exists for exactly this — T1_HEADED_CHROME_DOCKER_REFERENCE.md. Host `tv-browser` MCP drives it. NO FALLBACKS. Works or fails.

**New behavior (single path):**
1. Navigate via CDP WebSocket `Page.navigate` to `https://investinglive.com/Orders/` (the broken `/json/navigate` HTTP call and the `?? any-page` fallback are DELETED).
2. DOM-query the index for the date-specific link matching `fx-option-expiries-for-DD-MMM-10am-new-york-cut-YYYYMMDD` for the target day. Not found → THROW (`NO EXPIRY PAGE for {date} — v5.3.3 missing-day rule: mark [NO DATA], structural pillars only`).
3. Navigate to the date page. DOM-query the options table image element. Scroll it into view (`scrollIntoView`).
4. Screenshot with `Page.captureScreenshot` **clipped to the table element's bounding box** — the TABLE, not the page.
5. **Semantic firewall gate (internal VLM call, fixed const prompt below):** MiMo returns `VALID` or `INVALID`. INVALID → tool THROWS with the ≤80-char reason. VALID → return { screenshotPath, sourceUrl }.
6. Any navigation/DOM/timeout failure → THROW with stage name. No success without a verified table image.

**The fixed validation prompt (const, identical every call — written by Trident, do not modify without operator ruling):**

```typescript
export const PLUTUS_IMAGE_VALIDATION_PROMPT =
`You are a strict data-validation gate inside a trading pipeline. Judge ONE image: is it a usable FX OTC options expiry table from investinglive.com?

VALID requires ALL of:
1. A table of FX option expiries: currency pairs (e.g. EUR/USD, USD/JPY, GBP/USD), strike prices (decimal numbers), notional amounts (millions/billions).
2. The table is the MAIN subject — not cropped to a corner, not tiny, not covered by popups, ads, cookie banners, or nav bars.
3. Rows are legible: pair + strike + notional readable.

INVALID if ANY of: homepage/index without the table; CloudFront/403/error page; login or signup wall; a chart; article text without the table; header/footer/sidebar region; blank or mostly-empty image; table too small or obscured to read.

Reply with EXACTLY one word on line 1: VALID or INVALID.
If INVALID, add ONE line under 80 characters: the reason and the corrective action (e.g. "table below fold — scroll further", "403 error page — browser blocked", "login wall — reauthenticate").
No other output.`;
```

---

## 4. WAVE A-4 — BACKTEST → 30m NATIVE (`src/pipeline/engine.ts:1076-1310`)

1. Fetch **30m bars** per pair for the target week (same tvDatafeed mechanism, timeframe arg change).
2. Entry trigger + TP/SL resolution walk 30m bars → intra-1H-bar path resolved truthfully (four 30m bars per 1H bar).
3. Where 30m data is missing for a bar, use TradingView's documented broker-emulator path assumption: **bullish bar O→L→H→C, bearish bar O→H→L→C**; if both TP and SL fall in the same assumed leg → SL-first (conservative, matches broker pessimism).
4. DELETE the current TP-before-SL same-bar resolution (:1238-1251).

---

## 5. WAVE A-5 — FIREWALL RULE UPDATES (`src/semantic-firewall/`)

### 5.1 CS8 — SL cap: 150 → 36 pips (OPERATOR-RULED)
- Pip math: FX majors 1 pip = 0.0001 (4th decimal). Example: E 1.11350, SL 1.11000 → 0.0035 = 35 pips. DXY 1 pip = 0.01 → ceiling 0.36 points.
- **HARD ceiling: 36 pips** (all FX pairs; DXY 0.36 pts). Rationale (operator): "MAX SL EVER should be like 36 pips. Bigger = entry is fucked or the setup is wrong."
- **WARN annotations:** > 25 pips = "wide SL — entry/setup suspect" (general rule: SL should be < 25). < 15 pips = "sniper entry" (positive). Golden-standard SLs were 4–9.5 pips — consistent.
- Generator `SL_CAP_PIPS` (:339) aligned to 36.

### 5.2 ZT-4 — per-pair illiquid hours (OPERATOR-RULED)
- DXY, EUR/USD, GBP/USD: illiquid = Asian/Tokyo session (~20% of London liquidity). Valid = London, NY.
- AUD/USD: illiquid = **NY session**. Valid = Tokyo, London (AU is active when others are illiquid and vice versa).
- Implement as an extensible `PAIR_SESSION_MECHANICS` map — future pairs register their own windows.

### 5.3 ZT-15 — scope 4H MoM one-and-done (OPERATOR-RULED)
- **Applies to:** HTF swing + reversal entries on non-virgin 4H MoM zones (first retest = minor reaction; after that, scalp-only, NO swing entries).
- **Exempt:** SS LTF chained scalps — 3-8 chained entries inside a MoM range between S/D, anchored on 30m. These are valid and must NOT be blocked.

### 5.4 AP22 + AD10 — terminology whitelist (OPERATOR-RULED)
- **ALLOWED:** order block, supply, demand, liquidity, Fibonacci, market structure, swing high/low, mitigation, retest, premium/discount/equilibrium, top-down analysis (valid — becomes load-bearing when MTF mechanics wire in, Wave B), plus all native TTE vocabulary (BoM, MoM, LQZ, ZFP, confluence, reaction count, SS/BS/R/WL/RWL/PBS/WLS).
- **TERMINOLOGY UNIFICATION (OPERATOR-RULED):** LSZ is DEAD. Liquidity Sweep Zone and Liquidity Zone are the same thing — the term is **LQZ (Liquidity Zone)** everywhere: code comments, prompts, identity, report, docs. Any "LSZ" string in agent-facing text is updated to LQZ (internal type names like `LSZ_SUPPLY` may remain in code enums for compatibility but never surface to the agent/report).
- **BANNED (everything else):** fair value gap/FVG, breaker block, inducement, displacement, optimal trade entry/OTE, smart money concepts, sideways squeeze, institutional candle, ICT, SMC-as-label.
- Rationale: allowed terms keep the agent grounded in operator doctrine; guru-jargon confuses it.

### 5.5 CS11 — DELETE (OPERATOR-RULED)
Per-category count cap — same arbitrary-ceiling class as the deleted generator caps. Filtering is semantic + (later) probabilistic, never numeric.

### 5.6 ZT-17 — reassessment trigger, not block (OPERATOR-RULED)
After 3 chain links → annotate `REASSESS_ENGINE2: revalidate macro shape before further links` in the report. Awareness refresh, never a wall.

### 5.7 TFM-K1 — DELETE
Always-pass placeholder (theatrical). PVE (MASTER_CONTEXT/PLUTUS_PVE_DESIGN_SPEC.md) rewires semantically-equivalent checks deterministically at build time.
- Fix firewall header comment: actual count is 65 pre-change; update count after these edits.

---

## 6. WAVE A-6 — LQZ MULTI-WEEK LOOKBACK (`src/brains/lqz-lobe.ts` + call site)

**OPERATOR-RULED:** the 120-bar (1 week) window was the deficit cause — NOT the 14 canon thresholds (all verified exact, DO NOT TOUCH).
1. Lookback: 120 → **720 bars (3 weeks)**, configurable to 1440 (6 weeks) via constant `LQZ_LOOKBACK_BARS`.
2. Confirmation rule scope fix: 2 different pattern types confirm a level **anywhere across the full viewed range** — there is NO same-week temporal scoping (this was the bug).
3. **Reaction-age weighting:** a level confirmed by reactions spanning 6+ weeks gets maximum age-confidence ("same level reacted across 6+ weeks = 100% valid LQZ" — operator doctrine). Implement as a confidence multiplier on the emitted zone, not a threshold change.
4. Emit runtime stats (`discardedSingleTypeGroups` vs `confirmedZones`) in the zones tool output for the container test to capture.
5. Call-site (`pipeline/engine.ts:344`): pass the new lookback.

**Deferred to Wave B (isolation):** S/D dynamic escalation (4H/D months-back key-level search when no visible S/D in TP range — the 10-15% case) and 30m LQZ telescoping — these touch zone-construction machinery and get their own checkpoint.

---

## 7. WAVE B (SEPARATE CHECKPOINT — STARTS ONLY AFTER WAVE A IS GREEN)

Spec to be finalized post-Wave-A container test. Scope:
1. **30m LQZ telescoping:** run detector on 30m bars (pip/ATR scaling per TF), telescope 1H→30m for zone-edge refinement, Law 4 nesting merge.
2. **S/D dynamic temporal escalation:** primary scope current+previous week; when TP range lacks visible S/D, escalate to 4H/D and months-back structural levels (10-15% case) — algorithmic relevance rules, not hardcoded horizons.
3. Verification: golden 7 DXY LQZ levels detected ≥5; zone-edge precision vs Wave A.

---

## 8. WAVE A VERIFICATION GATE (before container test)

- [ ] `bun build` + `tsc --noEmit` clean
- [ ] grep: zero "HARD FILTER", zero omni-vision-in-identity, zero tp1_5/tp2/maximumRrr/realizedRrr, zero MAX_SETUPS, zero CS11, zero TFM-K1, zero `/json/navigate`, zero TP-before-SL same-bar
- [ ] grep: SL ceiling = 36 (firewall + generator), LQZ lookback = 720, CONDITIONAL = 50
- [ ] ZFP threshold = 45 untouched everywhere; 14 LQZ thresholds untouched
- [ ] **OPEN ITEM (evidence, not change):** `engine.ts:322` hardcodes `zfp: 50` on pillar zones. Wave A does NOT change it (Engine 1 canon, zero-deviation rule). Container test MUST log per-zone zfp distribution; if shape classification skews all-BS, escalate to operator for ruling.
- [ ] Container test: full pipeline, capture LQZ stats, per-pair direction counts, SL distances (expect ≤36, most <15), setup probability of dual-direction days on GBP/AUD/DXY.

---

*End of V4.2.1 Remediation Wave Spec. One wave. One checkpoint. One container test. Then Wave B.*

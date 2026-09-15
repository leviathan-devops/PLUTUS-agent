# PLUTUS V4.5.4 — THE E1 MISSING-ZONE FORENSIC REPORT (D100 — the "why is this missing" answer)

**DATE:** 2026-08-11 · **AUTHOR:** the Trident orchestrator · **STATUS:** the root-cause diagnosis + the blast radius — the fix waves follow the operator's decision

**THE OPERATOR'S DIRECTIVE (verbatim):** "this is retarded. find exactly why this is missing. OBCV should literally highlight this alone with all the other E1 machinery. this is a criticall issue. find out what is causing this and what other stupidity like this is in the codebase"

**THE QUESTION:** why does the operator's structural BoM supply (1.14460-1.14625, anchored to the Jun 22 OB) NOT EXIST as a zone in the E1 map — while the LMV matrix carries its levels as rungs?

---

# PART 1 — THE ANSWER: FIVE STACKED MECHANISMS, ALL PROBE-VERIFIED

## 1.1 THE PRIMARY: THE FRESHNESS MACHINE KILLS ZONES THAT HELD (freshness.ts:126-131)

**THE PROBE EVIDENCE (the real fixture + the real buildZoneMap):**

```
EUR/USD|1H|1782129600000|1.14476 [1.14476-1.14618] SUPPLY class=MoM zfp=70 fresh=VIOLATED
  ev: 2026-06-22 WICK_REJECT · ev: 2026-07-02 WICK_REJECT · ev: 2026-07-03 WICK_REJECT  (pierced=0)
```

The operator's OWN narrative of those events (Golden_Operator_Trade_Feedback_EU_GU.md #1):
> "Stops the bullish BS - pierces through w/ a wick but candle body closes inside the bottom half of this supply zone and causes a bearish Recovery" (Jul 2)
> "Whiplash move attempts to pierce this zone. Also candle body closes within the bottom half of this zone and starts a bearish Recovery move" (Jul 3)

**THE OPERATOR'S READ: the zone HELD both attacks = a STRONG zone (the fortress-in-formation).**
**THE MACHINE'S READ: 3 battles → DEPLETED → zfp 70 → the E2's quality gate (zfp ≤ 25) EXCLUDES it.**

**THE BUG (freshness.ts:126-131):**
```ts
function transition(s: MachineState, event: ReactionEvent): MachineState {
  const battles = s.battles + 1;
  if (event.pierced) return { state: 'VIOLATED', battles };
  if (battles <= 1) return { state: 'TESTED_1X', battles };
  if (battles === 2) return { state: 'TESTED_2X', battles };
  return { state: 'DEPLETED', battles };   // ← 3 non-pierced DEFENSES = DEPLETED!
}
```

**THE DOCTRINE VIOLATION (quoted):**
- "A zone does not immediately magically fail it takes minimum 3 mitigations before it fails" — the operator's "3 mitigations" = FAILED mitigations (pierces), never held defenses.
- "4+ strong → fortress" (the fortress lifecycle) — a zone that survives attacks becomes a FORTRESS; the machine depletes it at 3 HELD defenses, so **the FORTRESS class is structurally UNREACHABLE through the E1 lifecycle**.
- "zones usually fail on the THIRD mitigation" — the third FAILURE, not the third touch.

**THE FIX DIRECTION:** the DEPLETED tier requires PIERCED battles (the operator's "3 mitigations" that failed). Held defenses (WICK_REJECT, body closed back inside = the A17 DEFENSE semantics) advance toward TESTED → FORTRESS, never DEPLETED.

## 1.2 THE SECONDARY: THE 4H WINDOW TRUNCATION — THE TELESCOPING PARENT CAN NEVER EXIST (4h-sd-lobe.ts:65)

**THE PROBE EVIDENCE:**
- `TF_CONSTRUCTION_PARAMS['4H'] = { maxBars: 60, ... }` = **the last 60 4H bars ≈ 10 days**.
- The operator's OB anchor = Jun 22 = **14 days before the Jul 6 decision** → OUTSIDE the 4H detection window.
- The EU 4H map = FOUR zones total (all formed Jun 23-29): `[1.13684-1.13884] BoM Supply (Jun 23) · [1.13251-1.13537] BoM Demand (Jun 24) · [1.13541-1.13771] MoM Demand (Jun 26) · [1.13930-1.14130] MoM Demand (Jun 29)`.
- **NO 4H zone at 1.1446-1.1463 EVER EXISTS** → the T2 telescoping ("1H Refined 4H" refinement tag) can never fire for the operator's zone → the E3's TF-hierarchy ("4H King → 1H General") has NO 4H parent.

**THE FIX DIRECTION:** the 4H window must cover the prior-week/pre-flight anchor (the operator's Jun 22 reference — the telescoping doctrine's "4H King" horizon), not a fixed 10-day slice.

## 1.3 THE TERTIARY: OBCV'S SINGLE-CANDLE OB MODEL — THE CONSOLIDATION ZONES HAVE NO DETECTOR (obcv.ts classifyOrigin)

**THE PROBE EVIDENCE:**
- OBCV emits **4 zones for the EU (all 4H · ZERO 1H · ZERO 30m)** — the operator: "OBCV should literally highlight this alone".
- The Jun 22 13:00 impulse (body 26.3p — DETECTED by the O1 scan) has its OB = the SINGLE candle immediately before (the tiny 12:00 candle inside the consolidation: bw=0.41/bf=0.19 → fails the BoM gates → REJECTED).
- **The operator's zone = the multi-candle consolidation [1.14475-1.14635] — NO E1 machine detects consolidation-range zones.** OBCV is a single-origin-candle machine (the impulse-1 bar); the operator's "1H Refined 4H supply zone anchored to Jun 22 OB candle(s)" is a CONSOLIDATION.

**THE FIX DIRECTION:** the OBCV (or a companion consolidation detector) must detect the multi-candle consolidation ranges the operator actually reads — the range BEFORE the impulse, not the impulse-1 candle.

## 1.4 THE DATA STUPIDITY: THE 30m/15m FIXTURE IS FUTURE-DATED (bars_raw.json)

**THE PROBE EVIDENCE:**
```
EUR/USD 30m: 500 bars · first = 2026-07-13T19:00  (7 days AFTER the Jul 6 decision!)
EUR/USD 15m: 300 bars · first = 2026-07-23T02:00  (17 days AFTER!)
```
The 30m/15m lanes are **EMPTY at the analysis point** (0 bars in the Jun 19→Jul 6 window). The operator's trade #6 reasoning — "There is a very clear Whiplash Storm happening on the 15m timeframe" — is MECHANICALLY IMPOSSIBLE in the current fixture: the LTF reaction points + the 15m WLS storm detection are starved by the DATA ITSELF. The 30m/15m harvest windows (500/300 bars ≈ 10/3 days ending at the LATEST bar) never reach back to the analysis point.

**THE FIX DIRECTION:** the 30m/15m fixture must be re-harvested ending AT the analysis point (the same Apr→Jul 6 span as the 1H/4H), or the pipeline must fetch the LTF data temporally anchored.

## 1.5 THE E2 REACH CAP — EVEN THE SURVIVING ZONE IS UNREACHABLE (shape-brain.ts:1818-1877)

**THE PROBE EVIDENCE:** the Jul-3-re-formed zone `EUR/USD|1H|1783076400000|1.14460 [1.14460-1.14571] SUPPLY zfp=22` (the machine's replacement for the operator's zone) EXISTS with zfp 22 — but:
- The EU Tuesday supplyReach caps at ~1.14381 (open 1.14082 + travelMid ~3p); the zone's floor 1.14460 is BEYOND → excluded from supplyCands.
- The C-3B reach extension (nearestQualitySupplyAbove, my own rewrite) sorts by the pressure DESC — the FRESH rungs (P=20 virgin MoM) rank ABOVE the operator's TESTED zone (P=10 ACTIVE_1) → qualityReach = the rung's ceiling 1.14261, NOT the zone's 1.14571 → **the reach caps BEFORE the structural zone** (a C-3B regression vs the floor-distance sort).

**THE FIX DIRECTION:** the reach extension must target the STRUCTURAL zone (zfp ≤ 25 + the pressure + the width) over the fresh rung — the operator's "first quality structure beyond the open" where QUALITY = the structural significance.

---

# PART 2 — THE BLAST RADIUS: THE OTHER STUPIDITY OF THE SAME CLASS

| # | The stupidity | The site | The consequence |
|---|---|---|---|
| 1 | **The 3-defense depletion** | freshness.ts:126-131 | The FORTRESS class is DEAD — every zone dies at 3 held defenses; the phantom-BoM fortress logic (reasoning-chain.ts findFortressDemand) can never trigger from the E1 lifecycle; the operator's fortress-class zones read zfp 70 (garbage) |
| 2 | **The 4H maxBars=60 (10 days)** | 4h-sd-lobe.ts:65 | The operator's 4H-anchored zones (the Jun 22 reference, 14 days back) NEVER enter the 4H map → the T2 telescoping dead → no "1H Refined 4H" zones |
| 3 | **OBCV's single-candle OB + ZERO 1H output** | obcv.ts classifyOrigin :298 | The consolidation zones have NO detector — OBCV emits 4 zones (EU) / 6 (GU), all 4H; the operator's "1H Refined 4H" zones are structurally undetectable |
| 4 | **The future-dated 30m/15m fixture** | /tmp/opencode/bars_raw.json | The LTF lanes empty → the WLS storm (trade #6), the 30m MoM reaction points, the SS/R LTF context all dead at the decision |
| 5 | **The GU-side starvation** | (the same E1 chain) | GU Tue S 1.33965 = only the May-27 4H [1.34097-1.34305] zfp 70 (the Thu S 1.34260 IS inside it — but zfp-70-excluded); GU Fri S 1.34500 = the BoM [1.34237-1.34580] zfp 65 — old, excluded; GU Wed S 1.33660 = the Jul-3 [1.33623-1.33764] zfp 22 EXISTS (the ONLY survivor) |
| 6 | **The C-3B reach-extension regression** | shape-brain.ts:1841 (my rewrite) | The pressure-DESC reach sort picks the fresh rungs (P=20) over the operator's TESTED zone (P=10) — the reach caps BEFORE the structural zone |
| 7 | **The 1H maxBars=120 (5 days) at the canon lobe** | 4h-sd-lobe.ts:66 | The canon 1H construction params truncate at 5 days — the MDVE native's 300-bar (12.5-day) window is the ONLY 1H lane that saw the Jun 22 zone (234 bars back — inside 300, outside 120) |
| 8 | **The 30m MDVE lookback=576 ≈ 12 days** | ob-engine.ts:93-98 | The 30m lane's window is defined but the FIXTURE provides zero 30m bars at the decision — the parameter is moot until the data exists |

---

# PART 3 — THE CONSEQUENCE CHAIN (how the 8 losses were REALLY caused)

```
THE OPERATOR'S ZONE (1.14460-1.14625, the Jun 22 4H BoM supply)
  → the 1H native lane DETECTS it (Jun 22, [1.14476-1.14618])
  → the freshness machine counts 3 WICK_REJECT DEFENSES (Jun 22 + Jul 2 + Jul 3)
      as 3 battles → DEPLETED → zfp 70 (freshness.ts:126-131)
  → the E2's quality gate (zfp ≤ 25) EXCLUDES the zone (shape-brain.ts:1949)
  → the E2 designates the NEAREST surviving structure instead
      (Tue: the rung [1.14150-1.14189] → E 1.14189 → LOSS vs the oracle 1.14460)
  → the Jul 3 whiplash RE-FORMS a new zone [1.14460-1.14571] zfp 22
  → BUT the reach caps at 1.14381 (open + travel) → STILL excluded on Tuesday
  → the 8 losses = the E1 zone-murder cascading into the E2 selection
THE MONDAY WORKS because the golden SELL_SIDE rungs [1.1439-1.14415] are LMV
  matrix outputs (never touched by the freshness/4H/OBCV machinery) and the
  DXY 1H lane's zones happened to survive the freshness machine.
```

**THE VERDICT:** the C-3B's zone-anchored E2 (the strongest() rewrite) was the RIGHT LAW applied to the WRONG MAP. The 8 losses (D97) were NOT primarily the price-anchored selection — the selection was downstream of the E1's zone-murder. The D97 "price-anchored" label was the SYMPTOM; the E1's depletion/truncation/consolidation blindness is the CAUSE.

---

# PART 4 — THE FIX-WAVE ORDER (for the operator's decision — each gated + verified)

1. **E1A — THE FRESHNESS FIX (the primary):** freshness.ts transition() — the DEPLETED tier requires PIERCED battles; the held defenses (WICK_REJECT, the A17 DEFENSE semantics) advance TESTED_1X → TESTED_2X → FORTRESS (the operator's "4+ strong → fortress"). GATE: the Jun-22 zone [1.14476-1.14618] survives with zfp 22-38, NOT 70; the fortress lifecycle reachable.
2. **E1B — THE 4H WINDOW:** 4h-sd-lobe.ts maxBars 60 → the pre-flight-anchored window (the prior-week storyline anchor — the operator's Jun 22 reference). GATE: the 4H map emits the [1.1446-1.1463] supply; the T2 telescoping tags the "1H Refined 4H" parent.
3. **E1C — THE OBCV CONSOLIDATION DETECTOR:** the multi-candle range detection (the consolidation before the impulse) — the operator's actual zone shape. GATE: OBCV emits the Jun-22 consolidation zone.
4. **E1D — THE FIXTURE RE-HARVEST:** the 30m/15m bars ending AT the analysis point (the Apr→Jul 6 span). GATE: the 30m/15m lanes populated at the decision; the WLS storm detectable.
5. **C-3B2 — THE REACH-EXTENSION CORRECTION:** shape-brain.ts:1841 — the structural zone (zfp ≤ 25 + pressure + width) over the fresh rung. GATE: the EU Tue supplyReach reaches 1.14571; the operator's zone enters supplyCands.
6. **THE FULL-WEEK RE-RUN + THE ORACLE ACCEPTANCE** (Golden_Operator_Trade_Feedback_EU_GU.md): the machine's Tue-Fri designations pin the SAME STRUCTURAL ZONES — the zones CONTAINING the oracle levels (EU Tue S the BoM-1.14460-zone, the EU Wed S the MoM-1.14295-zone, the EU Wed L the chained-1.14020-zone, the EU Thu L the 1.14225-zone, the EU Fri S the 1.14555-zone, the GU Tue S 1.33965, the GU Wed S 1.33660, the GU Wed L 1.33280, the GU Thu S 1.34260, the GU Thu L 1.33850, the GU Fri S 1.34500) — WITHOUT ANY PRICE IN THE SELECTION — + the golden gate 5/5 UNCHANGED + the full-week ≥ 90% + tsc 0 (src) + the frozen pair byte-identical + the determinism ×2.

---

# PART 5 — THE KEY FILES + HASHES

- `src/mdve/freshness.ts` — THE PRIMARY BUG (the transition() :126-131 — the 3-defense depletion).
- `src/brains/4h-sd-lobe.ts` — the 4H maxBars=60 (:65) + the single-candle detection (:296).
- `src/mdve/obcv.ts` — the OBCV single-origin-candle model (classifyOrigin :298; the 4-zone EU output).
- `src/mdve/ob-engine.ts` — the MDVE native 1H (300-bar window — the ONLY lane that saw the Jun 22 zone) + the 30m (576-bar, starved by the fixture).
- `src/brains/shape-brain.ts` — the E2 reach (:1818-1877) + the C-3B reach-extension regression (:1841) + the quality gate (:1949).
- `src/mdve/reasoning-chain.ts` — the fortress logic (findFortressDemand :713 — unreachable via the E1 lifecycle).
- `/tmp/opencode/bars_raw.json` — THE FIXTURE (the 30m starts Jul 13, the 15m starts Jul 23 — both after the Jul 6 decision).
- The frozen pair: sl-lmv 912940832fac44bc · trade-dedup 33914c897e777540 · the analysis point 1783317600000 · the oracle: MASTER_CONTEXT/Golden_Operator_Trade_Feedback_EU_GU.md.

**THE FIRST ACTION (the fix waves):** E1A the freshness transition (the DEPLETED tier requires the PIERCED battles) → verify the Jun-22 zone survives → E1B the 4H window → E1C the consolidation detector → E1D the fixture → C-3B2 the reach → the full-week oracle acceptance.

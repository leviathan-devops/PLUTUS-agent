# PLUTUS v4.5.2 OVERHAUL — FIX PLAN v2 (THE MAJOR LEVEL SPEC — 2026-08-01)

**Status:** OPERATOR-DIRECTED MAJOR LEVEL — the complete spec for the corrective build
**Base:** `Checkpoints/v4.5.2_OVERHAULED_BASELINE/` (MANIFEST 147598aa, LOCKED)
**Target:** the 23/23 acceptance oracle at ±3 pips, RRR ≥ 3.0, every rejected setup mechanically audited
**Current state:** DXY 4/6 golden ≤3p (source-lane entry + Wed LONG missing) · EU 0 · GU 0 · report determinism baf0e068
**Reading order:** Bible 4.0 → Bible 4.5 → Spec v2.0 → FULL BUILD REPORT → DEBUG LOG → **THIS** → the context docs

---

## 0. THE ARCHITECTURE — THE FULL CORRECTED PICTURE (the operator's rulings, canon)

### 0.1 The three-layer system (what each layer IS)

| Layer | Role | Mechanics | Designation? |
|-------|------|-----------|--------------|
| **E1** | ZONES — the pair's own structural map | 9 pillars + telescoped S/D (4H→1H→30m, BoM 4H/1H only) + LQZ (1H→30m→15m) + LMV + OBCV | Provides the LEVELS |
| **E2 CORE** | SHAPES + DAY DESIGNATION — the pair's OWN shape chain on its OWN zones | Strength-based day designation (like DXY): projectZoneForDay with the DayBand, the §8.1 internal-rung entry | **AUTHORITATIVE for the pair's levels** |
| **E2 CASCADE** | TRANSLATION — the macro signal from the cascade pair | **STRUCTURAL EQUIVALENCE matching** (BoM→BoM, MoM→MoM, S/D→D/S for DXY/EU, S/D→S/D for EU/GU, pair-specific LQZ unbiased); strength = SECONDARY noise filter | **VALIDATES only** (≤35% divergence + macro alignment) — NEVER designates |
| **E3** | SETUPS — the trades | Source lane (DXY) + mirror lane (EU/GU) + emergent lane; TP at the structurally-equivalent opposing BoM wall | Consumes the E2 CORE designation |

### 0.2 The pipeline (arrow-notation-literal — the operator's exact architecture)

```
DXY: E1 → E2 CORE → E3 (full — the master compass; strength-based designation like always)
EU:  E1 (own zones FIRST — required so the cascade can match zones of the same element)
     → DXY-inverse E2 CASCADE (the TRANSLATION: DXY's map → EU's structurally-equivalent zones)
     → EU E2 CORE (own shape chain on own zones; strength-based day designation)
     → divergence validation (the pair's E2 vs the cascade: ≤35%, macro-aligned)
     → E3 (mirrors consume the EU E2 CORE's ShapeDayZone days — zone-anchored)
     → + EU emergent trades on top
GU:  E1 (own zones FIRST)
     → EU E2 CASCADE (the translation: EU's map → GU's structurally-equivalent zones)
     → GU E2 CORE (own shape chain, strength-based)
     → divergence validation
     → E3 (mirrors consume the GU E2 CORE's days)
     → + GU emergent trades on top
```

### 0.3 The operator's rulings (verbatim — the canon for this build)

1. **The cascade is a translation, not a designation:**
> "No cascade is literally a translation of the exact map/data that currently exists on the cascade pair to the receiving pair. THIS IS WHY E1 OF THAT SPECIFIC PAIR NEEDS TO BE RUN FIRST SO ZONES OF THE SAME ELEMENT CAN BE PROPERLY MATCHED. BoM --> BoM, MoM --> MoM, S/D --> D/S (DXY/EU), S/D --> S/D (EU --> GU), PAIR SPECIFIC LQZ GENERATED UNBIASED FROM CASCADE"

2. **Structural equivalence primary, strength secondary:**
> "cascade needs to match to structurally equivalent as primary confluence and strength as secondary confluence (in case the primary incorrectly selects some weak penetrated high ZFP zone by accident and misses the ACTUAL structurally equivalent zone that is causing the move. this is mainly a noise filter for the occasional fuck up on signal #1)"

3. **The cascade's day-map translation:**
> "'DXY's Monday SS shape will reject at X zone, so EU's Monday SS shape will reject at Y zone' — THIS is exactly what needs to be mapped and is the whole point of cascade"

4. **TP mechanics — structural, never nearest:**
> "NEVER have I said 'the nearest'. No. This needs to follow proper TP calculation mechanics and match to the zone of opposing pressure that will ACTUALLY cause a reaction this is LITERALLY what E1 and E2 are for. Just like point #1 - STRUCTURALLY EQUIVALENT not this wank of false metrics like nearest or strongest"

5. **The TP projection chain (the BoM wall):**
> "'EU's TP for X trade is at Z projected opposing BoM zone, GU's TP for similar X trade should be at Y projected opposing BoM zone — good that we caught this as it invalidates the flawed E3 map that puts TP at the MoM zone closer to spot. DXY + EU both project TP at BoM zone so GU should naturally follow suit. extend TP from MoM to BoM. Nice it adds an extra 2 R'"

6. **The refinement machine is GLOBAL + 3D + 60-40:**
> "refinement needs to be wired globally on ALL E3 trade setups this is a critical component of setting up high probability and high RR trades"
> "refinement machine needs full awareness of pipeline mechanics and cascade mechanics AND trade setup mechanics (3D refinement machine) and be able to individually audit a trade setup on ALL 3 layers just like how trident code audit has 18 individual layers for auditing code bases based on pre build deterministic rules. Same macro architecture for this - except that the model will ALSO INFERENCE based on this for the final conclusion this is not purely mechanical it is 60-40 deterministic/model inference"
> "we are not restricting model inference here we are just constructing the correct mental frameworks (earth density mechanical uncheatable) for it to flow through as it reasons and makes the correct decision"

7. **The hallucination detector:**
> "bullshit fucking hallucinated reason immediately flag all variations of this phrase as a hallucination trigger that needs scrupulous 0 trust auditing. we should build a hallucination detector engine into this as well that immediately red alerts false model claims like this for all rejected trades"

8. **The manual post-pipeline review step:**
> "New step post current-pipeline complete. Current pipeline completes --> new manual agent based review of all rejected setups (they should be logged somewhere easily accessible) + refinement of 'diamond in the mud' setups (sequential to force precision and focus to detail) --> pass through mechanical quality filter (batch not sequential - all refined trades batch passed through quality gate) --> 2 revision attempts (starting from the first agent based pass) allowed --> generate final updated reports with any refined setups that pass completion w/ notes on how it was refined and why it was passed"

9. **The strength-based designation target:**
> "strength based shape chain designation is correct for the PAIR SPECIFIC E2 shape chain like we do on DXY. This is what is supposed to be done on E2 CORE, but NOT on the CASCADE. CASCADE = structural equivalent. CORE = E1 strength based. This seems mainly like a wiring issue"

---

## 1. THE CASCADE TRANSLATION ENGINE (the correct replacement for assignZonesByDay)

### 1.1 What it replaces
`shape-cascade.ts`'s `assignZonesByDay` (the strength-ranked round-robin: the strongest active zone → Monday, second → Tuesday) is RETIRED from the designation role. It was the v4.5.2-era mechanism that predates the E1 designation; it assigns by ZONE STRENGTH, not by STRUCTURAL EQUIVALENCE — the direct cause of the Mon EU SHORT anchoring at 1.14494 instead of the structurally-equivalent 1.14544.

### 1.2 The translation algorithm (the cascade's real job)

```
INPUT:  the cascade pair's full map (zones with class/role/side/formation/reaction)
        + the receiving pair's E1 map (its OWN zones — run FIRST, per the operator)
        + the cascade pair's E2 CORE day designations (the shape chain's day-by-day zones)
OUTPUT: the receiving pair's translated day-map (which of ITS zones correspond to the
        cascade pair's designated zones, day by day)

FOR each day d in the week:
  cascadeDayZone = the cascade pair's E2 CORE designation for day d
                   (e.g., DXY Monday SS rejects at the 101.14 supply — the designated zone)
  element = cascadeDayZone.class       // BoM | MoM | LQZ
  role    = cascadeDayZone.role        // SUPPLY | DEMAND
  translatedRole = role                // EU←DXY: SUPPLY→DEMAND, DEMAND→SUPPLY (inverse)
                                       // GU←EU:  KEPT (SUPPLY→SUPPLY, DEMAND→DEMAND)

  candidates = the receiving pair's E1 zones with:
    1. SAME ELEMENT (BoM→BoM, MoM→MoM, LQZ→LQZ)          [PRIMARY — structural]
    2. TRANSLATED ROLE (the inverse/kept side)            [PRIMARY — structural]
    3. SAME FORMATION WINDOW (formed within ±48h of the cascade zone's formation)
       OR SAME REACTION TIME (reacted within ±48h)        [PRIMARY — structural]
    4. MACRO-ALIGNED POSITION (the same position in the pair's structure:
       the zone the pair's shape chain will reject at that day —
       e.g., the EU Monday SS rejects at ITS ceiling supply)

  match = candidates ranked by:
    PRIMARY (structural): element + role + formation/reaction window + position-in-structure
    SECONDARY (noise filter): strength (lowest ZFP, most reactions) — used ONLY when
      the primary is ambiguous or the primary pick is a weak high-ZFP penetrated zone
      that accidentally outranks the actual structurally-equivalent zone

  IF no structural candidate exists:
    → the day has NO translated designation (honest absence — never invent one)
    → the pair's E2 CORE runs free (its own strength-based designation stands)
```

### 1.3 The element-matching matrix (the operator's exact table)

| Cascade pair zone | Receiving pair (EU, inverse) | Receiving pair (GU, kept) |
|-------------------|------------------------------|---------------------------|
| BoM SUPPLY | BoM DEMAND | BoM SUPPLY |
| BoM DEMAND | BoM SUPPLY | BoM DEMAND |
| MoM SUPPLY | MoM DEMAND | MoM SUPPLY |
| MoM DEMAND | MoM SUPPLY | MoM DEMAND |
| LQZ (supply-side) | pair-specific LQZ (demand-side) — generated UNBIASED from the cascade | pair-specific LQZ (supply-side) |
| S/D zone | D/S zone (the inverse role) | S/D zone (kept role) |

**"PAIR SPECIFIC LQZ GENERATED UNBIASED FROM CASCADE"** — the LQZ translation does NOT copy the cascade's LQZ price; it maps the cascade's LQZ to the receiving pair's OWN LQZ (the LMV table's rungs) that plays the same structural role (the liquidity at the rejection point). The LMV machine (Phase 3, 7/7 golden ≤1p) provides the pair's LQZ rungs; the cascade matches by role + position, never by price conversion.

### 1.4 The day-map translation (the operator's "THIS is the whole point")

```
DXY Monday SS: the shape chain says price rejects at X (the DXY designated supply)
  → EU Monday SS: price rejects at Y (EU's structurally-equivalent supply — the zone
    the EU's Monday rally hits and rejects from, at the same element + role + formation
    window + position in the structure)
  → GU Monday SS: price rejects at Z (GU's structurally-equivalent supply — kept)

DXY Wed BS SHORT: TP at the projected opposing BoM demand (the fresh wall 100.680)
  → EU Wed BS SHORT: TP at EU's projected opposing BoM demand (1.14103 — the golden)
  → GU Wed BS SHORT: TP at GU's projected opposing BoM demand (1.33347 — the golden)
```

### 1.5 The divergence validation (the operator's ≤35% rule)

After the translation, the pair's E2 CORE runs its own strength-based chain. The cascade VALIDATES:
```
per day:  aligned = (the pair's shape-family ≈ the cascade's shape-family)
                     (SS≈SS/RWL, BS≈BS/PBS, R≈R, WL≈WL/WLS — or within ONE step
                      of the master sequence SS→BS→R→WL)
          directionMatch = the pair's day direction agrees with the translated direction
chainDivergence = (days not aligned) / 5
chainDivergence ≤ 0.35 → VALIDATED (the pair's E2 stands)
chainDivergence > 0.35 → FLAG (confidence penalty; log the divergence per day)
NEVER override the pair's E2 designation — the cascade validates, it does not designate
```
The operator: "the macro structure of the pair specific E2 matches the cascade (ex cascade = SS/BS/R/WL - pair specific cannot be like PBS/RWL/SS/BS completely on fucking meth different - needs to stay relatively aligned with the cascaded chain at the macro level)"

---

## 2. THE TP MECHANICS — STRUCTURAL, NEVER NEAREST (the correction)

### 2.1 The ban
**"NEVER have I said 'the nearest'."** The Law-14 significance walk (computeLmvTP's nearest-first ranking) is RETIRED as the primary TP mechanism. The TP is a STRUCTURAL computation: the zone of opposing pressure that will ACTUALLY cause a reaction — the LQZ WITHIN the opposing S/D zone (the operator's doctrine, stated 50+ times), where the opposing S/D zone is the STRUCTURALLY-EQUIVALENT BoM wall, not the nearest MoM shelf.

### 2.2 The correct TP computation (the operator's chain)

```
TP = the LQZ WITHIN the opposing S/D zone that will actually react

STEP 1: the opposing S/D zone = the STRUCTURALLY-EQUIVALENT BoM zone on the opposing side
        (SHORT → the BoM DEMAND the move will reach and react at;
         LONG  → the BoM SUPPLY the move will reach and react at)
        — matched by element (BoM), role (opposing), and position-in-structure
        — NOT the nearest zone, NOT the strongest zone

STEP 2: the internal LQZ of that BoM zone (the Earth within the Fire):
        the LMV rung whose band is inside the BoM zone, nearest the reaction level
        → TP = that rung's defendedEdge (the modal bodyClose)

STEP 3: the Law-14 check: the path from entry to TP must be clear —
        UNMITIGATED zones between entry and TP will react FIRST (price cannot teleport)
        — mitigated zones are pass-through during BS momentum (the golden T6 proof:
        55.5 pips through 5 mitigated zones to the UM 100.680)
        — IF an unmitigated zone sits between entry and TP, the TP moves to THAT zone
          (it will react first) — the walk continues only past MITIGATED zones

STEP 4: the projection chain (the operator's "extends TP from MoM to BoM"):
        DXY's TP is at the opposing BoM wall → EU's TP is at EU's structurally-equivalent
        opposing BoM wall → GU's TP is at GU's structurally-equivalent opposing BoM wall.
        The TP NEVER stops at a MoM shelf because the cascade's source TP didn't.
```

### 2.3 The worked example (the Mon EU SHORT — the rejected trade, corrected)

```
The pipeline's (WRONG) TP: 1.14400 — the nearest demand rung (a MoM shelf 9.4p away)
The correct TP: 1.14103 — the LQZ within the opposing BoM DEMAND (44.1p away, RRR 12.9)
  STEP 1: the opposing BoM demand for the EU Monday SHORT = the structurally-equivalent
          BoM demand at 1.14103 (the fresh wall the Monday move actually reached)
  STEP 2: the internal LQZ rung inside it → defendedEdge 1.14103
  STEP 3: the path check — the intermediate demands (1.14400, 1.14250, 1.14150) are
          MITIGATED (the week's action passed through them) → pass-through during the move
  STEP 4: DXY's TP 101.115 (the opposing supply's internal LQZ) → EU's TP 1.14103
          (EU's opposing BoM demand's internal LQZ) — the structural translation
With E 1.14544, SL 1.14578, TP 1.14103: RRR 12.9 — the golden.
```

### 2.4 The implementation sites
- `computeLmvTP` (mirror.ts): the primary path = the structurally-equivalent opposing BoM zone's internal LQZ (the E2 CORE's projected opposing zone); the significance walk becomes the FALLBACK only when the structural path finds no unmitigated BoM wall
- `computeMirrorTP` (mirror.ts): same structural correction
- `setup-gen.ts` (the DXY source lane): same structural TP (it already uses computeMirrorTP — verify it targets the BoM wall, not the nearest rung)
- The E2 CORE's day designation carries the projected opposing zone (the ShapeDayZone's demandZoneId/supplyZoneId) — the E3 TP consumes it

---

## 3. THE GLOBAL 3D REFINEMENT MACHINE (the major overhaul)

### 3.1 The scope — GLOBAL on ALL E3 setups

The refinement machine runs on **EVERY E3 trade setup** that fails a gate: the DXY source lane, the EU/GU mirror lane, the emergent lane. NOT just the mirrors. A sub-3.0-RRR setup from ANY lane gets the full 3D audit + repair before rejection. The operator: "refinement needs to be wired globally on ALL E3 trade setups this is a critical component of setting up high probability and high RR trades."

### 3.2 The 3D audit (the 18-layer-style architecture)

Every rejected setup is audited on THREE layers, each with its own deterministic rule set (like the Trident 18-layer code audit), then the model INFERENCES the final conclusion over the mechanical scaffolding (60-40):

```
LAYER 1 — PIPELINE MECHANICS (deterministic)
  P1  E1 executed? (the pair's zone map built from its own bars, telescoped, complete)
  P2  E2 CORE executed? (the pair's shape chain + day designation present)
  P3  The cascade translation executed? (the structural-equivalence match present)
  P4  The divergence check ran? (≤35% — the pair's E2 vs the cascade)
  P5  The bars are the pair's OWN (no cross-pair data leak)
  P6  The temporal anchor held (no future bars)
  P7  Determinism (no wall-clock, deterministic iteration)
  P8  The zone map contains the day's designated zone (the E2 CORE's keyZoneId present)

LAYER 2 — CASCADE MECHANICS (deterministic)
  C1  The zone element matched (BoM→BoM, MoM→MoM, LQZ→LQZ)
  C2  The role translated correctly (DXY/EU inverse, EU/GU kept)
  C3  The formation/reaction window matched (±48h)
  C4  The position-in-structure matched (the day's shape will reject at this zone)
  C5  The strength filter was only SECONDARY (not the primary match)
  C6  The pair-specific LQZ was generated unbiased (no price conversion)

LAYER 3 — TRADE SETUP MECHANICS (deterministic)
  T1  ENTRY: at the §8.1 internal-LQZ-rung near edge inside the entry S/D zone
      (the E2 CORE designation's keyZonePrice — NOT the defendedEdge, NOT the zone edge)
  T2  ENTRY: on the correct side of the day's predicted spot (SHORT → supply above)
  T3  SL: at the next rung's reactionExtreme + Law-7 buffer, PROBE_GUARD + weekProbeAtAnchor
      cleared, in [0.5×ATR, 9.5], D17 36p ceiling
  T4  TP: at the structurally-equivalent opposing BoM zone's internal LQZ (NEVER nearest)
  T5  TP: the Law-14 path clear (no UM zone between entry and TP)
  T6  RRR: ≥ 3.0 with the corrected anchors
  T7  The fill model: activation at max(session start, battleMs), 21:00Z expiry
  T8  The dedup identity: (pair, dir, zone_anchor±3pips, day) — reporting-layer

THE MODEL INFERENCE (40% — over the mechanical scaffolding):
  The agent reasons WITH the P1-P8/C1-C6/T1-T8 findings as constraints + context +
  parameters — the "earth density mechanical uncheatable" framework it flows through:
  - If LAYER 1 fails (E1/E2 not executed): the setup is not refinable — the ANALYSIS
    is broken (goes back to the pipeline)
  - If LAYER 2 fails (the cascade translation wrong): the setup is not refinable at the
    E/SL/TP level — the DESIGNATION is wrong (re-translate, then re-run E3)
  - If LAYER 3 fails (T1-T8): the analysis is CORRECT and the anchors are shit —
    THE REFINEMENT TARGET ("a 1.8-RRR trade with a valid entry is a good trade with a
    dumb anchor")
  - The inference conclusion: GENUINELY-SHIT (hard reject with the audit trail) vs
    DIAMOND-IN-THE-MUD (refine: entry micro-adjust ≤3p in-zone, SL bidirectional walk,
    TP structural re-target) vs CORRECT-AS-IS (a false-positive rejection — re-admit)
```

### 3.3 The reasoning-token scaffolding (the mental framework, not a cage)

The model is NOT restricted — it is GIVEN the correct mental framework to reason within:
```
For each rejected setup, the agent is presented (mechanically, deterministic):
  [the setup's full geometry: entry/sl/tp/rrr/zone/day/direction/pair/lane]
  [the LAYER 1 findings: P1-P8 pass/fail with evidence]
  [the LAYER 2 findings: C1-C6 pass/fail with evidence]
  [the LAYER 3 findings: T1-T8 pass/fail with evidence]
  [the zone map excerpt: the designated zone + the opposing BoM wall + the internal rungs]
  [the cascade translation excerpt: the source zone + the translated target]
And then: "Reason through the findings. Determine: is the ANALYSIS correct and the
ANCHORS wrong (refine), or is the ANALYSIS wrong (reject)? If refine: propose the exact
E/SL/TP corrections per the T1-T8 mechanics, on the SAME zone anchors."
The model's reasoning is free — the scaffolding ensures it reasons about the RIGHT things
with the RIGHT data in front of it.
```

### 3.4 The 3D machine's outputs
```
RefinementVerdict:
  REJECT_GENUINE   (the analysis is wrong — hard reject with the full 3-layer audit trail)
  REFINE           (the analysis is right, the anchors are wrong — the corrected
                    E/SL/TP on the same zones, with the 🔧 annotation + the layer findings)
  RE_ADMIT         (a false-positive rejection — the setup passes on re-audit)
  RE_TRANSLATE     (Layer 2 failed — the cascade translation was wrong; re-translate
                    and re-run E3 for this setup)
```

---

## 4. THE HALLUCINATION DETECTOR ENGINE (red-alert false model claims)

### 4.1 The trigger
All variations of the generic rejection reasons are HALLUCINATION TRIGGERS — the reason text is a false model claim that masks the real cause:
```
TRIGGER_PHRASES (flag ALL variations, case-insensitive, fuzzy-matched):
  "candles smaller on this move"
  "candles are smaller"
  "smaller candles"
  "pair-native re-anchor" (as a rejection REASON without layer evidence)
  "volatility differs" / "pair volatility"
  "candle size" (as a rejection reason)
  ANY rejection reason that does NOT cite a specific mechanical failure
  (a zone id, a layer check, a price delta, a rung id)
```

### 4.2 The red-alert protocol (0-trust re-audit)
When a rejection reason matches a trigger:
1. **RED ALERT** — the reason is flagged as a hallucination candidate
2. The setup is routed to the 3D refinement machine's FULL audit (P1-P8/C1-C6/T1-T8)
3. The REAL cause is determined from the mechanical findings (e.g., the Mon EU SHORT:
   the real cause = Layer 2 failed (the cascade translation assigned the wrong supply)
   + T4 failed (the TP stopped at the nearest MoM instead of the BoM wall) —
   NOT "candles smaller")
4. The corrected reason is logged with the layer evidence
5. The setup proceeds per the 3D verdict (REJECT_GENUINE / REFINE / RE_ADMIT / RE_TRANSLATE)

### 4.3 The engine's placement
- The trigger matcher runs on EVERY rejection (in the E3 gates + the mirror lane + the source lane)
- The red-alert routes to the 3D machine
- A hallucination-detector counter logs every trigger hit (the detector's own stats — how often the generic reasons appear, which layers the real causes live in) — this becomes the feedback for the E3 mechanics (if Layer-2 failures dominate, the cascade translation is the fix target)

---

## 5. THE MANUAL POST-PIPELINE REVIEW STEP (the new pipeline stage)

### 5.1 The pipeline flow (the new stage)

```
CURRENT PIPELINE COMPLETES (harvest → E1 → E2 CORE → cascade translation → E3 → report)
    ↓
NEW STAGE: THE REJECTED-SETUP REVIEW (manual, agent-driven, SEQUENTIAL)
    ↓
THE 3D REFINEMENT MACHINE per rejected setup (Layer 1-3 audit + model inference)
    ↓
THE MECHANICAL QUALITY FILTER (BATCH — all refined setups passed through the gates at once)
    ↓
2 REVISION ATTEMPTS allowed (starting from the first agent pass)
    ↓
THE FINAL UPDATED REPORT (any refined setups that pass, with notes on HOW they were
refined and WHY they passed)
```

### 5.2 The sequential discipline (why sequential, not batch)
The operator: "I want to say batch analysis w/ focus but batch might lead to skimming. unless you can force proper depth on batching we should make this sequential to ensure each trade is properly looked at."
- Every rejected setup is reviewed ONE AT A TIME — full depth, full attention
- The review order: by pair (DXY first — the source), then by day, then by severity
- Each review produces a per-setup record: the 3D findings + the verdict + the corrections

### 5.3 The rejected-setup log (easily accessible — the review's input)
- Every E3 rejection writes a structured record: `data/rejected_setups/{run}/` — the setup id, pair, lane, day, direction, entry/sl/tp/rrr, the rejection reason, the layer evidence snapshot
- The review stage reads the log directly — no hunting

### 5.4 The mechanical quality filter (batch)
After the sequential reviews produce the refined candidates, ALL refined setups pass through the mechanical quality gate TOGETHER (batch — the gates are deterministic, batch-safe):
- RRR ≥ 3.0 (the firewall + rrrForCategory)
- T1-T8 (the setup mechanics re-verified)
- The frozen-list integrity + determinism
- The 3-pip golden coverage re-check (the refined setups' deltas)

### 5.5 The revision loop
- Attempt 1: the sequential review + refinement (the first agent pass)
- Attempt 2: the refined setups that FAILED the batch quality gate get ONE revision
  (the 3D machine re-audits with the gate's failure evidence)
- Attempt 3+: HARD REJECT (no more — D36 discipline)
- Every revision is logged (what changed, why)

### 5.6 The final report
The updated report includes:
- The refined setups (marked 🔧 REFINED with the before/after anchors + the layer findings + the why-it-passes note)
- The genuinely-shit setups (marked ✗ REJECTED with the full 3-layer audit trail)
- The re-admitted setups (marked ✓ RE-ADMITTED with the false-rejection evidence)
- The hallucination-detector stats (how many generic reasons were flagged, what the real causes were)

---

## 6. THE FIX WAVES (the implementation order)

### WAVE G — THE CASCADE TRANSLATION ENGINE (shape-cascade.ts + report-v452.ts + mirror.ts)

**G1 — retire assignZonesByDay from the designation role:** the cascade's strength-ranked round-robin no longer designates. It becomes the MACRO-SIGNAL-ONLY path (or is deleted — its output feeds only the divergence check).

**G2 — build the translation engine (NEW: `src/mdve/cascade-translation.ts`):** the §1.2 algorithm — element matching (BoM→BoM, MoM→MoM, LQZ→LQZ), role translation (DXY/EU inverse, EU/GU kept), formation/reaction window (±48h), position-in-structure, structural primary + strength secondary. The output: the receiving pair's translated day-map (zone-by-zone, day-by-day).

**G3 — wire the pair's E1 BEFORE the cascade:** report-v452.ts runs `buildChartModel('EUR/USD')` (EU E1) BEFORE the cascade translation — the cascade matches EU's OWN zones (the operator: "THIS IS WHY E1 OF THAT SPECIFIC PAIR NEEDS TO BE RUN FIRST").

**G4 — restore the pair's E2 CORE runs:** `euShape = buildShapeForPair('EUR/USD')` (the EU brain's own shape chain + strength-based day designation) and `guShape = buildShapeForPair('GBP/USD')`. The mirrors consume these days (the authoritative ShapeDayZone).

**G5 — the divergence validation (NEW):** the ≤35% + macro-alignment check (the §1.5 algorithm) — the cascade validates the pair's E2, never overrides it.

**G6 — the mirror lane wiring:** the mirrors consume the pair E2 CORE's ShapeDayZone days via the existing shapeDay threading (selectPairNativeZone authoritative + the corrected TP).

**GATE G:** `bun diag-golden-coverage.ts` — the EU lane reappears with the golden deltas ≤3p (the Mon SHORT at 1.14544 Δ≤1p); `bun diag-e2-forward.ts` still passes; determinism ×2 (the NEW hash).

### WAVE H — THE STRUCTURAL TP CORRECTION (mirror.ts + setup-gen.ts)

**H1 — computeLmvTP/computeMirrorTP:** the primary path = the structurally-equivalent opposing BoM zone's internal LQZ (the E2 CORE's projected opposing zone); the significance walk = the fallback ONLY. The Law-14 path check (UM zones between entry and TP react first).
**H2 — the projection chain:** DXY's TP at the BoM wall → EU's structurally-equivalent BoM wall → GU's. "extend TP from MoM to BoM — adds an extra 2 R".
**H3 — the worked-example regression:** the Mon EU SHORT must compute TP 1.14103 (not 1.14400); the Wed BS SHORT chain: DXY 100.680 → EU 1.14103 → GU 1.33347.

**GATE H:** the diag's EU/GU deltas at the golden TPs; the worked-example harness (a new diag asserting the Mon SHORT's TP = 1.14103 ± 1p).

### WAVE I — THE GLOBAL 3D REFINEMENT MACHINE (refinement-machine.ts overhaul + setup-gen.ts + mirror.ts)

**I1 — the 3D audit layers:** P1-P8 (pipeline) + C1-C6 (cascade) + T1-T8 (setup) — deterministic rule sets with evidence capture.
**I2 — the model-inference stage:** the reasoning-token scaffolding (§3.3) — the agent reasons over the mechanical findings; the verdict (REJECT_GENUINE / REFINE / RE_ADMIT / RE_TRANSLATE).
**I3 — wire GLOBALLY:** setup-gen.ts's RRR_BELOW_FLOOR path (the source lane) + the mirror lane + the emergent lane — every E3 rejection routes through the 3D machine.
**I4 — the RE_TRANSLATE loop:** a Layer-2 failure re-runs the cascade translation for that setup, then re-runs E3.

**GATE I:** the DXY #1 Mon LONG enters at 100.945 (the internal rung — Δ0.4p); the Wed LONG 100.975 exists (repaired, not rejected); the Wed Mon EU SHORT refines to RRR 12.9; every rejection carries a layer-evidenced reason (no trigger phrases).

### WAVE J — THE HALLUCINATION DETECTOR + THE REJECTED-SETUP LOG (NEW)

**J1 — the trigger matcher** (the §4.1 phrase table) on every rejection reason.
**J2 — the red-alert protocol** (the §4.2 routing to the 3D machine).
**J3 — the rejected-setup log** (`data/rejected_setups/{run}/` — the structured records).
**J4 — the detector stats** (which layers the real causes live in — the feedback for the mechanics).

**GATE J:** a fixture run produces the log with layer-evidenced reasons; the trigger matcher flags the generic phrases (a test asserting the "candles smaller" phrase triggers).

### WAVE K — THE MANUAL POST-PIPELINE REVIEW STAGE (NEW pipeline stage)

**K1 — the stage after the report:** the rejected-setup log → the sequential 3D reviews → the refined candidates.
**K2 — the batch quality filter** (all refined setups through the gates together).
**K3 — the 2-revision loop** (per the §5.5).
**K4 — the final updated report** (the refined setups with the how/why notes; the rejected with the audit trails; the re-admitted with the evidence).

**GATE K:** the review stage runs on the golden fixture — the refined setups pass the batch filter, the notes are complete, the report updates.

### WAVE L — THE PHASE 6/7 GATES + PHASE 8 VERIFICATION

**L1 — the report-lane gates:** EU 8 + GU 7 at ±3 pips; DXY 8 (6 measured + the ladder/continuation); every setup RRR ≥ 3.0; the mirror floor passes.
**L2 — the full diag suite:** golden-coverage 3-pip, telescoping, lmv-golden, obcv-golden, e2-forward, rrr → 23/23.
**L3 — determinism ×2 + tsc 0 + bun build.**
**L4 — the container test:** fresh `plutus-container-testing:clean-v421`, SHA-verified deploy, TUI tmux + pipe-pane, 3-signal monitoring, sniff + golden reconstruction + outcome audit.
**L5 — the visual eval:** the 23 golden overlaid vs the generated setups.
**L6 — the final report + failure log + ship package + checkpoint.**

---

## 7. THE INVARIANTS (never violated)

1. **The cascade translates; the pair designates; the cascade validates** (≤35% divergence, macro alignment)
2. **Structural equivalence is PRIMARY; strength is SECONDARY** (the noise filter for the occasional structural miss)
3. **E1 of the receiving pair runs BEFORE the cascade** — the same-element zones must exist to be matched
4. **TP = the structurally-equivalent opposing BoM zone's internal LQZ — NEVER "nearest"**
5. **The refinement machine is GLOBAL** (source + mirror + emergent) and **3D** (pipeline + cascade + setup) and **60-40** (deterministic scaffolding + model inference)
6. **Every rejection reason is layer-evidenced** — the hallucination triggers are flagged, the real cause is found mechanically
7. **RRR ≥ 3.0** — enforced; the refinement repairs on the same zone anchors (3 attempts, D36)
8. **The 3-pip metric only** — never 5/10/30 as acceptance
9. **Determinism ×2 after every change** — the canary: a byte-identical hash after an intended change = the change isn't in the path
10. **The frozen list** — sl-lmv.ts (91294083), trade-dedup.ts (33914c89); lmv.ts + lqz-matrix.ts mutable
11. **The §8.1 anchor union is mechanical** — entry at the internal LQZ rung's near edge; TP at the opposing rung's defendedEdge
12. **No hardcoded Jul-6-10 levels** — determinism is in the COMPUTATION

## 8. THE DERAILMENT PREVENTION (this build's specific traps)

- **Do NOT let assignZonesByDay back into the designation path** (grep-verify: the mirrors read the pair E2 CORE's days)
- **Do NOT let "nearest" or "strongest" back into the TP path** (the structural BoM wall is the only TP target)
- **Do NOT let a generic rejection reason pass** (every rejection carries the layer evidence; the trigger phrases red-alert)
- **Do NOT run the refinement machine on the mirrors only** (global — every E3 lane)
- **Do NOT skip the pair's E1 before the cascade** (the same-element zones must exist)
- **Do NOT call the DXY lane "perfect" at 4/6** (the golden map is the standard)
- **Do NOT skip the manual review stage** (the rejected setups are the diamond mine)

## 9. THE SUCCESS DEFINITION

`bun diag-golden-coverage.ts` → **23/23 at ≤3 pip** (DXY 6/6 + the ladder/continuation; EU 8/8; GU 7/7) · every trade RRR ≥ 3.0 · every rejection layer-evidenced (zero trigger phrases) · the manual review stage completes with the refined setups + notes · the cascade translation logs ≤35% divergence · determinism ×2 · the container test passed · the visual eval overlaid · the final checkpoint saved.

*END OF THE FIX PLAN v2 — the major-level spec. Waves G → L, gates after every wave, the 3-pip count after every change, the rejected setups logged and reviewed.*

---

## 10. THE COMPLETE DETERMINISTIC RULE SETS (the 3D machine's scaffolding — the full definitions)

### 10.1 LAYER 1 — PIPELINE MECHANICS (P1-P8, full definitions with evidence formats)

**P1 — E1 executed for the pair.**
- Check: the pair's `ChartModel.zones` is non-empty; the zone map contains the pair's OWN zones (ids prefixed `DXY|`, `EUR/USD|`, `GBP/USD|` — never a cross-pair id); the telescoped tiers are present (4H + 1H + 30m MoM; refinedLabels where nesting exists)
- Evidence: the zone count per TF, the refinedLabel list, the zone id samples
- Failure: the setup references a zone from another pair (cross-pair leak) OR the map is empty

**P2 — E2 CORE executed for the pair.**
- Check: the pair's ShapeBrain ran (the snapshot's dayDecomposition is non-empty, 5 days); each day carries the E1 fields (dayOpenSpot, keyZoneId, supplyZoneId, demandZoneId — the Phase-5 contract)
- Evidence: the day chain print (day → shape → direction → dayOpenSpot → keyZoneId)
- Failure: an empty day decomposition OR days without the E1 fields (the pre-Phase-5 snapshot)

**P3 — The cascade translation executed.**
- Check: the receiving pair's translated day-map exists (the cascade-translation engine's output — the structurally-equivalent zones per day); the element/role/window matches are recorded
- Evidence: the translation record per day (source zone → translated target, with the element/role/window match values)
- Failure: no translation record (the cascade never ran) OR the translation used strength as the primary (the assignZonesByDay signature)

**P4 — The divergence check ran.**
- Check: the ≤35% chain divergence computed (the pair's E2 CORE vs the cascade's macro signal); the per-day alignment recorded
- Evidence: the divergence value + the per-day alignment table
- Failure: no divergence record (the validation was skipped)

**P5 — The bars are the pair's OWN.**
- Check: the setup's zone formationMs falls within the pair's own bar range; no cross-pair price coordinate (the entry/SL/TP are in the pair's price space — EUR/USD entries are 1.xx, DXY entries are 1xx.xx)
- Evidence: the pair + the price-space check
- Failure: a price-space mismatch (the classic cross-pair leak)

**P6 — The temporal anchor held.**
- Check: the zone's formationMs ≤ ANCHOR_MS; no bar after the anchor fed the setup
- Evidence: the formationMs vs ANCHOR_MS
- Failure: a future bar (the W7-A temporal leak)

**P7 — Determinism.**
- Check: the report hash ×2 identical (the canary); the run used no wall-clock
- Evidence: the two hashes
- Failure: a hash mismatch (the run is non-reproducible — the setup is untrustworthy)

**P8 — The zone map contains the day's designated zone.**
- Check: the E2 CORE's keyZoneId for the setup's day exists in the pair's model.zones (the bridge worked — the LMV|pair|center ids + the OB ids)
- Evidence: the keyZoneId + the zone's presence
- Failure: the designated zone is absent from the map (the bridge gap — the E3 can't anchor to a zone that isn't there)

### 10.2 LAYER 2 — CASCADE MECHANICS (C1-C6, full definitions)

**C1 — The zone element matched.**
- Check: the translated zone's classification == the cascade zone's classification (BoM→BoM, MoM→MoM, LQZ→LQZ)
- Evidence: both classifications
- Failure: a BoM translated to a MoM (the element mismatch — the LADDER-STEP vs ENTRY confusion)

**C2 — The role translated correctly.**
- Check: DXY→EU inverts (SUPPLY→DEMAND, DEMAND→SUPPLY); EU→GU keeps (SUPPLY→SUPPLY, DEMAND→DEMAND)
- Evidence: both roles + the translation direction
- Failure: a kept role on an inverse leg (the direction confusion)

**C3 — The formation/reaction window matched (±48h).**
- Check: |translated.formationMs − cascade.formationMs| ≤ 48h OR |translated.lastReaction − cascade.lastReaction| ≤ 48h (the same market event created both)
- Evidence: both timestamps + the delta
- Failure: a window mismatch (the zones formed by different events — the structural equivalence is broken)

**C4 — The position-in-structure matched.**
- Check: the translated zone sits in the SAME position of the pair's structure that the cascade zone sits in the cascade pair's structure (the day's shape will reject at this zone — e.g., the EU Monday SS rejects at ITS ceiling supply, structurally-equivalent to the DXY Monday SS rejecting at ITS ceiling supply)
- Evidence: the position description (the nearest structural reference — the week high/low, the consolidation range)
- Failure: a position mismatch (the zone is at a different structural point — e.g., the EU zone is mid-range while the DXY zone is the range ceiling)

**C5 — The strength filter was only SECONDARY.**
- Check: the translated zone was chosen by the structural match (C1-C4), with strength (ZFP/reactions) used ONLY as the tie-breaker or the noise filter
- Evidence: the match ranking (the structural score vs the strength score)
- Failure: the strength was the primary (the assignZonesByDay signature — the direct cause of the Mon EU 1.14494 anchor)

**C6 — The pair-specific LQZ generated unbiased.**
- Check: the LQZ translation maps the cascade's LQZ role to the pair's OWN LMV rung (the same structural role — the liquidity at the rejection point); NO price conversion from the cascade
- Evidence: the source LQZ + the pair's matched rung + the role
- Failure: a price-converted LQZ (the forbidden mathematical conversion)

### 10.3 LAYER 3 — TRADE SETUP MECHANICS (T1-T8, full definitions)

**T1 — ENTRY at the §8.1 internal-LQZ-rung near edge.**
- Check: the entry == the internal LMV rung's near edge inside the entry S/D zone (the E2 CORE's keyZonePrice — for SHORT: the rung's floor; for LONG: the rung's ceiling). NOT the defendedEdge (the modal bodyClose — the DXY #1 100.850 bug), NOT the zone's edge
- Evidence: the entry, the zone band, the internal rung band, the rung's near edge
- Failure: entry == the defendedEdge OR entry == the zone edge (both miss the operator's level)

**T2 — ENTRY on the correct side of the day's predicted spot.**
- Check: SHORT → the entry ≥ the day's dayOpenSpot (supply above); LONG → the entry ≤ dayOpenSpot (demand below)
- Evidence: the entry vs dayOpenSpot
- Failure: an entry on the wrong side (the SHORT at a demand below the open)

**T3 — SL at the next rung's reactionExtreme + Law-7 buffer.**
- Check: the SL == the next rung's reactionExtreme ± the Law-7 buffer (EUR 2 / GBP 3 / AUD 3 / DXY 5), cleared by PROBE_GUARD + weekProbeAtAnchor (no wick INTO the SL band), within [max(0.5×ATR, buffer), GOLDEN_SL_MAX_PIPS=9.5], D17 36p ceiling
- Evidence: the SL, the rung's reactionExtreme, the probe depth, the buffer
- Failure: a fixed-buffer SL (the SNIPER_BUFFER legacy) OR an SL inside the battle's own probe (the PROBE_GUARD miss)

**T4 — TP at the structurally-equivalent opposing BoM zone's internal LQZ.**
- Check: the TP == the opposing BoM zone's internal LQZ rung's defendedEdge (the LQZ WITHIN the opposing S/D zone); the opposing zone is the structurally-equivalent BoM wall (element BoM, opposing role), NOT the nearest MoM shelf, NOT the strongest zone
- Evidence: the TP, the opposing BoM zone, the internal LQZ rung, the defendedEdge
- Failure: TP at a MoM shelf (the "nearest" walk) — the direct cause of the Mon EU 1.14400

**T5 — The Law-14 path clear.**
- Check: no UNMITIGATED zone between the entry and the TP (an UM zone will react FIRST — price cannot teleport); mitigated zones are pass-through during BS momentum (the golden T6: 55.5p through 5 mitigated zones)
- Evidence: the intermediate zones + their mitigation states
- Failure: an UM zone between entry and TP (the TP must move to it)

**T6 — RRR ≥ 3.0 with the corrected anchors.**
- Check: |TP − entry| / |entry − SL| ≥ 3.0
- Evidence: the three prices + the RRR
- Failure: RRR < 3.0 — the refinement target (NOT a rejection — the 3D machine repairs)

**T7 — The fill model.**
- Check: activation at max(session start, battleMs), expiry 21:00Z trade-day NY close
- Evidence: the battleMs + the session bracket
- Failure: a zombie order (multi-day) or a session-window confinement

**T8 — The dedup identity.**
- Check: the setup's (pair, dir, zone_anchor±3pips, day) is unique in the report
- Evidence: the dedup key
- Failure: a duplicate (the reporting-layer inflation)

### 10.4 The verdict matrix (how the 3 layers compose)

| Layer 1 | Layer 2 | Layer 3 | Verdict |
|---------|---------|---------|---------|
| PASS | PASS | PASS | the setup is VALID (it wouldn't be in the review — the rejection was a false alarm) → RE_ADMIT |
| PASS | PASS | FAIL (T1-T8) | **the analysis is CORRECT, the anchors are SHIT → REFINE** (the diamond-in-the-mud) |
| PASS | FAIL (C1-C6) | — | **the cascade translation was WRONG → RE_TRANSLATE** (re-run the translation, then re-run E3 for this setup) |
| FAIL (P1-P8) | — | — | **the pipeline stage was broken → REJECT_GENUINE** (the analysis is not refinable at the setup level — the pipeline must be re-run) |

The model inference (the 40%) reasons over this matrix + the evidence — the mechanical findings are the uncheatable earth density; the model's judgment determines the final verdict with the full context in front of it.

---

## 11. THE REASONING-SCAFFOLDING PROMPT TEMPLATES (the 3D machine's agent-facing interface)

### 11.1 The refinement prompt (per rejected setup — the sequential review)

```
You are the PLUTUS 3D REFINEMENT MACHINE. A trade setup was rejected. Your job:
determine whether the ANALYSIS is correct (the anchors are wrong → refine) or the
ANALYSIS is wrong (→ reject), using the mechanical findings as your constraints.

THE SETUP:
  pair: {pair} | lane: {lane} | day: {day} | direction: {direction}
  entry: {entry} | sl: {sl} | tp: {tp} | rrr: {rrr} (computed) | floor: {floor}
  rejection reason (RAW — flag if it matches a hallucination trigger): {reason}

LAYER 1 — PIPELINE FINDINGS (deterministic):
  P1 E1 executed: {PASS|FAIL} — {evidence}
  P2 E2 CORE executed: {PASS|FAIL} — {evidence}
  P3 Cascade translation executed: {PASS|FAIL} — {evidence}
  P4 Divergence check: {PASS|FAIL} — {evidence}
  P5 Own bars: {PASS|FAIL} — {evidence}
  P6 Temporal anchor: {PASS|FAIL} — {evidence}
  P7 Determinism: {PASS|FAIL} — {evidence}
  P8 Designated zone in map: {PASS|FAIL} — {evidence}

LAYER 2 — CASCADE FINDINGS (deterministic):
  C1 Element matched: {PASS|FAIL} — {evidence}
  C2 Role translated: {PASS|FAIL} — {evidence}
  C3 Window matched: {PASS|FAIL} — {evidence}
  C4 Position-in-structure: {PASS|FAIL} — {evidence}
  C5 Strength secondary: {PASS|FAIL} — {evidence}
  C6 LQZ unbiased: {PASS|FAIL} — {evidence}

LAYER 3 — SETUP FINDINGS (deterministic):
  T1 Entry at internal-LQZ near edge: {PASS|FAIL} — {evidence}
  T2 Entry side vs day open: {PASS|FAIL} — {evidence}
  T3 SL next-rung + buffer: {PASS|FAIL} — {evidence}
  T4 TP opposing BoM wall: {PASS|FAIL} — {evidence}
  T5 Law-14 path: {PASS|FAIL} — {evidence}
  T6 RRR ≥ 3.0: {PASS|FAIL} — {evidence}
  T7 Fill model: {PASS|FAIL} — {evidence}
  T8 Dedup: {PASS|FAIL} — {evidence}

THE ZONE MAP EXCERPT:
  the designated zone: {id, band, class, zfp, internal rungs}
  the opposing BoM wall: {id, band, class, zfp, internal rungs}
  the intermediate zones (entry → TP path): {list with mitigation states}

THE CASCADE TRANSLATION EXCERPT:
  the cascade pair's zone: {id, band, class, role}
  the translated target: {id, band, class, role, window delta}

REASON THROUGH THE FINDINGS (step by step):
  1. Which layers failed? (use the verdict matrix)
  2. Is the ANALYSIS correct and the ANCHORS wrong? (Layer 3 failures only)
  3. If REFINE: propose the exact corrections per T1-T8 on the SAME zone anchors:
     - entry: the internal rung's near edge ({price})
     - sl: the next rung's reactionExtreme + buffer ({price})
     - tp: the opposing BoM wall's internal LQZ ({price})
     - the new RRR
  4. If REJECT: state the genuine reason with the layer evidence (no generic phrases)
  5. If RE_TRANSLATE: state which C check failed and what the correct translation is

YOUR VERDICT: {REJECT_GENUINE | REFINE | RE_ADMIT | RE_TRANSLATE}
YOUR CORRECTED ANCHORS (if REFINE): entry={} sl={} tp={} rrr={}
YOUR REFINEMENT NOTE (why this passes): {}
```

### 11.2 The review-stage sequencing prompt (the manual step)

```
You are the PLUTUS REJECTED-SETUP REVIEWER. The pipeline completed. Review EVERY
rejected setup SEQUENTIALLY (one at a time — full depth, no skimming).

THE REJECTED-SETUP LOG: data/rejected_setups/{run}/
Process each record in order (pair: DXY first, then EU, then GU; then by day; then by
severity). For each:
  1. Run the 3D audit (the refinement prompt above)
  2. Apply the verdict
  3. Record the outcome in the per-setup record
After ALL reviews: pass the refined candidates through the mechanical quality filter
(BATCH — all at once). The failures get ONE revision (attempt 2). Then produce the
final updated report with: the refined setups (🔧 + how/why), the rejected (✗ + the
audit trail), the re-admitted (✓ + the evidence).
```

---

## 12. THE REJECTED-SETUP LOG SCHEMA (the review's input — data/rejected_setups/{run}/)

```
rejected_setup_0001.json:
{
  "setupId": "SRC-DXY-DXY_1H_1782990000000_101_027-20260706-TOKYO",
  "run": "2026-08-01T00:00:00.000Z",
  "pair": "EUR/USD",
  "lane": "MIRROR",
  "day": "Monday",
  "direction": "SHORT",
  "entry": 1.14494, "sl": 1.14570, "tp": 1.14400,
  "rrrComputed": 1.24, "rrrFloor": 3.0,
  "rejectionReason": "EUR/USD mirror of ...: RRR 1.2 < 1.5 after the pair-native re-anchor — EUR/USD candles smaller on this move",
  "hallucinationTrigger": true,        // the matcher flagged it
  "sourceSetupId": "SRC-DXY-DXY_1H_1782990000000_101_027-20260706-TOKYO",
  "sourceZone": {"id": "DXY|1H|1782990000000|101.027", "band": [101.027, 101.148]},
  "designatedZone": null,              // the E2 CORE designation (absent — the wiring bug)
  "opposingBoMWall": {"id": "LMV|EUR/USD|1.14103", "band": [1.14103, 1.14150]},
  "layerFindings": { "P1": {...}, ..., "C1": {...}, ..., "T1": {...}, ... },
  "verdict": "RE_TRANSLATE",
  "correctedAnchors": {"entry": 1.14544, "sl": 1.14578, "tp": 1.14103, "rrr": 12.9},
  "refinementNote": "The cascade translation assigned the strength-picked 1.14494 supply; the structurally-equivalent BoM supply is 1.14544 (C1-C4 failed). The TP was the nearest MoM 1.14400; the structurally-equivalent opposing BoM demand's internal LQZ is 1.14103 (T4 failed). Re-translate + re-run E3."
}
```

---

## 13. THE TEST SPECS PER WAVE (the gates' assertion counts)

**WAVE G (the cascade translation):**
- G1: the Mon EU SHORT's translated zone == the structurally-equivalent supply at 1.14544 ± 1p (element BoM→BoM, role D→S, window ±48h)
- G2: the EU day-map's zones are EU's OWN (ids prefixed EUR/USD — no cross-pair)
- G3: the pair's E1 ran BEFORE the cascade (the translation input includes the EU zones)
- G4: the divergence check ≤35% (the golden week's EU chain vs the DXY-inverse signal)
- G5: the mirrors consume the EU E2 CORE's days (grep: no assignZonesByDay in the shapeDay path)
- G6: determinism ×2 (the NEW hash recorded)

**WAVE H (the structural TP):**
- H1: the Mon EU SHORT's TP == 1.14103 ± 1p (the worked-example harness)
- H2: the Wed BS chain: DXY TP 100.680 → EU TP 1.14103 → GU TP 1.33347 ± 1p
- H3: NO TP at a MoM shelf when a BoM wall exists (grep the significance-walk fallback usage)
- H4: the Law-14 path check: an UM zone between entry and TP moves the TP to it (a synthetic test)

**WAVE I (the global 3D machine):**
- I1: the DXY #1 Mon LONG enters at 100.945 ± 1p (the internal rung — the source-lane fix)
- I2: the Wed LONG 100.975 EXISTS (repaired by the source-lane refinement)
- I3: every E3 lane routes rejections through the 3D machine (grep the wiring)
- I4: a correct-analysis/bad-anchor setup refines (the Mon EU SHORT → RRR 12.9)
- I5: a wrong-analysis setup rejects with the layer-evidenced trail (a synthetic garbage setup)
- I6: determinism ×2

**WAVE J (the hallucination detector):**
- J1: the "candles smaller" phrase triggers the red alert (a unit test)
- J2: every rejection in the fixture run carries a layer-evidenced reason (zero triggers pass)
- J3: the rejected-setup log is written (data/rejected_setups/{run}/ non-empty)
- J4: the detector stats record the real-cause layer distribution

**WAVE K (the manual review stage):**
- K1: the review stage runs on the fixture (the log → the sequential reviews → the batch filter)
- K2: the refined setups pass the batch quality filter (RRR ≥ 3.0, T1-T8)
- K3: the 2-revision loop bounded (no setup exceeds 2 revisions)
- K4: the final report carries the refinement notes (how/why for every refined setup)

**WAVE L (the gates + verification):**
- L1: diag-golden-coverage → 23/23 at ≤3p
- L2: every setup RRR ≥ 3.0 (diag-rrr)
- L3: the mirror floor passes (checkMirrorFloorV45)
- L4: determinism ×2 + tsc 0 + bun build
- L5: the container test (clean-v421, the 4-element evidence)
- L6: the visual eval overlay

---

## 14. THE RISK REGISTER (this build's failure modes + the mitigations)

| # | Risk | Impact | Mitigation |
|---|------|--------|-----------|
| 1 | The cascade translation over-matches (no structural candidate → forced pick) | Wrong translated zones | Honest absence (the day has NO translated designation; the pair's E2 CORE stands alone) |
| 2 | The structural window (±48h) too tight for the golden week's formations | No matches on some days | The window is OR (formation OR reaction); a day without a match is honestly absent, never invented |
| 3 | The 3D machine's model inference drifts (the 40% over-reasons) | Wrong verdicts | The mechanical scaffolding is the uncheatable earth density; the verdict matrix constrains the inference; the layer evidence must support the verdict |
| 4 | The manual review skims (batch temptation) | Missed diamonds | SEQUENTIAL enforced (one setup at a time, full depth); the per-setup record requires the layer findings before the verdict |
| 5 | The refinement machine over-repairs (turns genuine garbage into plausible setups) | Quality inflation | The T1-T8 mechanics are deterministic; the SAME zone anchors constraint; the batch quality filter re-verifies; the D36 hard-reject after 3 attempts |
| 6 | The hallucination detector's trigger phrases are too narrow | Missed hallucinations | Fuzzy matching (case-insensitive, variations); ANY reason without layer evidence triggers |
| 7 | The TP structural path finds no BoM wall | TP fallback to the significance walk | The fallback is logged; the manual review re-audits; the golden-week oracle asserts the BoM walls exist (they do — the map has them) |
| 8 | The divergence check false-flags (the pair's E2 legitimately diverges >35%) | Confidence penalties on valid pairs | The check NEVER overrides — it flags + penalizes confidence; the operator reviews the flagged pairs |
| 9 | The pair's E1 before the cascade doubles the compute | Slower runs | Deterministic, parallelizable; the correctness is worth it (the operator's explicit requirement) |
| 10 | Determinism breaks (the model inference in the 3D machine) | Non-reproducible reviews | The MECHANICAL findings are deterministic (logged); the model's verdict is recorded as the review decision — the report's deterministic core (the setups) stays byte-identical; the review notes are appended post-run |

---

## 15. THE SUCCESS CRITERIA (the operator's acceptance, measurable)

1. `bun diag-golden-coverage.ts` → **23/23 at ≤3 pips** (DXY 6/6 + the ladder/continuation · EU 8/8 · GU 7/7)
2. Every emitted setup RRR ≥ 3.0 (the firewall + the refinement machine, globally)
3. Every rejection carries a layer-evidenced reason — **zero hallucination-trigger phrases in the final report**
4. The manual review stage completes: every rejected setup sequentially audited, the diamonds refined, the batch filter passed, the notes written
5. The cascade translation logs ≤35% divergence per pair (the golden week)
6. Determinism ×2 (the NEW hash recorded) · tsc 0 · bun build
7. The container test passed (clean-v421, SHA-verified deploy, TUI + pipe-pane, 3-signal, sniff + golden reconstruction + outcome audit)
8. The visual eval: the 23 golden overlaid vs the generated setups
9. The final checkpoint saved with the MANIFEST + the build report + the failure log + the ship package

*END OF THE FIX PLAN v2 — the major-level spec, complete. Waves G → L, gates after every wave, the 3-pip count after every change, every rejected setup logged and reviewed, every reason layer-evidenced.*

---

## 16. THE COMPLETE WORKED EXAMPLES (the translation + TP + refinement, end to end)

### 16.1 The Wed BS SHORT chain (the golden T6 — the full structural translation)

**DXY (the cascade pair — the source):**
- Shape: Wed = BS SHORT (the breakout surge — price swept up to 101.275 grabbing buy-stops, then crashed)
- E2 CORE designation: the supply at 101.235-101.240 (the LMV rung [101.239-101.275] inside the 1H BoM supply [101.110-101.275] — the §8.1 internal-rung entry at 101.239, Δ0.4p)
- E3 setup: E 101.235, SL 101.330 (the 4H BoM ceiling + buffer), TP 100.680 (the opposing 1H BoM demand — the UM fresh wall, 55.5p)
- The golden #6: E 101.235, SL 101.330, TP 100.680, RRR 5.84 ✓

**The cascade translation (DXY → EU, inverse):**
- The DXY Wed supply (BoM, SUPPLY) → EU BoM DEMAND? NO — the DIRECTION is inverted: DXY BS SHORT → EU BS LONG. The EU Wed LONG designates the EU demand (the structurally-equivalent zone the EU's Wed crash will reach and bounce from)
- Wait — the golden EU Wed has THREE trades (LONG 1.13950, SHORT 1.14325, LONG 1.13953) — the cascade's macro signal is the DXY SHORT → the EU LONG is the PRIMARY translated direction; the EU's own SS/RWL counter-moves are the pair's E2 CORE emergent designations (the pair-specific variance the operator allows)
- The translation: DXY's Wed BS SHORT designation (the 101.235 supply, BoM) → EU's structurally-equivalent BoM supply at 1.14325 (the EU Wed rally's rejection zone — element BoM, role inverted... the EU LONG targets the DEMAND; the EU SHORT at 1.14325 is the pair's own designation from the EU E2 CORE's strength-based chain)
- The divergence check: the EU Wed chain (LONG/BS per the inversion) vs the DXY signal (BS SHORT) — aligned (the EU LONG is the inverted BS) → ≤35% ✓

**The TP projection chain (the operator's "extends TP from MoM to BoM"):**
- DXY's TP: 100.680 (the opposing 1H BoM demand — the UM fresh wall)
- EU's TP: the structurally-equivalent opposing BoM demand — the EU 1.14103 (the golden EU-6 LONG's TP is 1.14277 — the opposing supply; the golden EU-1 SHORT's TP 1.14103 is the opposing BoM demand)
- GU's TP: the structurally-equivalent opposing BoM — the golden GU-1 SHORT's TP 1.33347
- **The rule: the TP NEVER stops at a MoM shelf because the cascade pair's TP didn't. The MoM-to-BoM extension adds the extra R's the operator described ("Nice it adds an extra 2 R").**

### 16.2 The Mon EU SHORT (the rejected trade — the full 3D refinement walkthrough)

**The setup (as rejected):** E 1.14494, SL 1.14570, TP 1.14400, RRR 1.24, reason "EUR/USD candles smaller on this move" (TRIGGERED).

**Layer 1 (pipeline):** P1 PASS (the EU model has its zones) · P2 PASS (the EU E2 CORE ran — the days carry the E1 fields) · **P3 FAIL** (the cascade translation did NOT run — the P1 wiring used assignZonesByDay) · P4 FAIL (no divergence check) · P5 PASS · P6 PASS · P7 PASS · **P8 FAIL** (the designated zone for Monday — the 1.14544 supply — was never in the mirror's shapeDay; the cascade's 1.14370 was)

**Layer 2 (cascade):** C1 FAIL (the 1.14494 supply is MoM-class — the DXY source was a demand shelf; the structural match needs the EU BoM supply) · C2 PASS conceptually (the role was inverted) · C3 FAIL (no window match recorded) · C4 FAIL (the 1.14494 sits mid-range — the structural position is the Monday ceiling at 1.14544) · **C5 FAIL (strength was the PRIMARY — the assignZonesByDay signature)** · C6 FAIL (the LQZ was not translated — the mirror used the raw anchor)

**Layer 3 (setup):** T1 FAIL (the entry 1.14494 ≠ the internal-LQZ near edge 1.14544) · T2 PASS (SHORT above the day open) · T3 PASS (the SL 1.14570 ≈ the next rung + buffer — the mechanics were right) · **T4 FAIL (the TP 1.14400 = the nearest MoM shelf — NOT the structurally-equivalent opposing BoM wall 1.14103)** · T5 FAIL (the path check never ran — the intermediate demands' mitigation states weren't evaluated) · T6 FAIL (RRR 1.24 < 3.0 — the CONSEQUENCE of T1+T4) · T7 PASS · T8 PASS

**The verdict: RE_TRANSLATE + REFINE** — Layer 2 failed (the translation) → re-translate (the structurally-equivalent supply at 1.14544, BoM) → re-run E3 → the corrected setup: E 1.14544, SL 1.14578, TP 1.14103, RRR 12.9. The "candles smaller" reason is flagged as a hallucination; the real cause is the layer-evidenced trail above.

### 16.3 The GU Monday translation (the golden GU-1)

**The cascade: EU Mon SS SHORT (the inverse of the DXY Mon SS LONG).** The EU's Monday designation: the 1.14544 supply (the Monday ceiling rejection). Translated to GU (KEPT): the structurally-equivalent GU supply — the golden GU-1 at 1.33882 (the GU Monday ceiling rejection, element BoM/MoM matched, role kept, position-in-structure = the Monday ceiling).
- The GU SL: 1.34021 (the next rung + buffer) · The GU TP: 1.33347 (the opposing BoM demand — the structural wall, NOT the nearest rung)
- RRR 3.8 — the golden. The day-native gate: Monday's open 1.33522 (admitted — the Phase-5 fix already proven).

---

## 17. THE OPERATOR'S QUOTES APPENDIX (the canon for this build — verbatim, with sources)

1. "MINIMUM 3 RRR NOTHING LESS IS ACCEPTABLE IDK WHERE THE FUCK THIS SLOP CAME FROM ALL MY TRADES ARE 4+ SO 3 IS THE MINNIMUM." (2026-07-31)
2. "NOT A SINGLE ONE OF MY TRADES IS BELOW RRR = 3.5." (2026-07-29)
3. "If all 3 are solid RRR will literally be 4 minimum." (ANCHOR_DOCTRINE.md:28)
4. "RRR failed does not mean instant hard reject often the E/SL/TP is wrong on a correct analysis so we need the retry loop with an intelligent E/SL/TP refinment machine that provides the correct mental frameworks for adjusting these surgically to maximize RRR while still staying on the correct zone anchros. Most of these 1.5-2 R trades can easily be 3-4 R trades with properl E/SL/TP anchors on the exact same zones that are already thethered to. this is purely a lack of precision and dumb trade setups" (2026-07-31)
5. "A rejected setup is not a dead setup. The entry is the hard-won insight; SL/TP are engineering. A 1.8-RRR trade with a valid entry is a good trade with a dumb anchor." (ANCHOR_DOCTRINE.md:157)
6. "S/D zones are charted on 4H and refined down to 1H, also can be charted on 1H and refined down to 30m (for 1H specific OBs that are not visible on 4H - nested S/D zones can exist)" (2026-07-31)
7. "30m is not an origin point for BoM S/D zones - valid for MoM S/D zones to identifiy E2 reaction points for SS/R shapes but BoM OBs are 4H/1H only w/ 30m only for minor telescoping refinement of 1H origin OBs" (2026-07-31)
8. "LQZ similarly starts on 1H and is refined down to 30m + started on 30m and refined down to 15m" (2026-07-31)
9. "If E1 is fucked everything that is built on top of it also gets fucked." (2026-07-31)
10. "friday spot is only relevant to MONDAY E2 SHAPE prediction after that it is compltely irrelevant" (2026-07-31)
11. "forward map the predicted spot price of that day at london session open" (2026-07-31)
12. "make it E2 waveform based not dumb fucking friday spot price based" (2026-07-31)
13. "DXY E1/E2/E3 | EU E1 --> DXY Inverse E2 Cascade --> E2 --> DXY Inverse E3 Cascade (ZONE ANCHORED Trade Setups not Price Anchored) --> E3 w/ EU specific emrgent trades added on top of DXY-inverse-cascade setups | GU E1 --> EU E2 Cascade --> E2 --> EU E3 Cascade (ZONE ANCHORED Trade Setups not Price Anchored) --> E3 w/ GU specific emrgent trades added on top of EU-cascade setups" (2026-07-31)
14. "DXY provides DIRECTION. The PAIR provides LEVELS." (canon)
15. "Emergent pair-specific trades ON TOP are fine and encouraged — MORE than 24 is fine, LESS is not." (MDVE_SPEC.md:597)
16. "this is the definitive test of LMV. LMV is the most important machine in the MDVE - if it cannot copute these LQZs there is a major issue we need to address" (2026-07-31)
17. "if the current LMV + LQZ matrix are not identifying any of the gold standard LQZs then they obviously need modification and the current versions are just working prototypes" (2026-07-31)
18. "We should also build an OBCV (order block candle vision) machine on the same principles that finds all the OBs using its own MPSE function. I dont think matrices apply here like they do with LQZ since there arent dozens of candles reacting to the same level" (2026-07-31)
19. "once these 2 are 96%+ accurate then 90% of the work in charting zones is done from the start" (2026-07-31)
20. "S/D OBs + LQZs are BOTH RELEVANT — READ THE BUILD REPORTS — THIS IS A REGRESSION" (HOTFIX_SPEC.md:5)
21. "spot price is practically irrelevant for calculations and everything is done based on E1 → E2 → E3 mechanics and data" (canon)
22. "i never said to put a cap." + "there is no limit on trade setups for a week, there is only filtering of shitty dumb garbage setups" (canon)
23. "Doctrine is QUOTED, never synthesized... Anything that can't be quoted, doesn't get built." (DECISION_CHAIN.md:312)
24. "the cascade is a macro signal to validated the pair specific output against to ensure there is no more than 35% divergence (for pair specific mechanics) to the cascaded shape and that the macro structure of the pair specific E2 matches the cascade" (2026-08-01)
25. "No cascade is literally a translation of the exact map/data that currently exists on the cascade pair to the receiving pair. THIS IS WHY E1 OF THAT SPECIFIC PAIR NEEDS TO BE RUN FIRST SO ZONES OF THE SAME ELEMENT CAN BE PROPERLY MATCHED. BoM --> BoM, MoM --> MoM, S/D --> D/S (DXY/EU), S/D --> S/D (EU --> GU), PAIR SPECIFIC LQZ GENERATED UNBIASED FROM CASCADE" (2026-08-01)
26. "cascade needs to match to structurally equivalent as primary confluence and strength as secondary confluence (in case the primary incorrectly selects some weak penetrated high ZFP zone by accident and misses the ACTUAL structurally equivalent zone that is causing the move. this is mainly a noise filter for the occasional fuck up on signal #1)" (2026-08-01)
27. "'DXY's Monday SS shape will reject at X zone, so EU's Monday SS shape will reject at Y zone' — THIS is exactly what needs to be mapped and is the whole point of cascade" (2026-08-01)
28. "NEVER have I said 'the nearest'. No. This needs to follow proper TP calculation mechanics and match to the zone of opposing pressure that will ACTUALLY cause a reaction this is LITERALLY what E1 and E2 are for. STRUCTURALLY EQUIVALENT not this wank of false metrics like nearest or strongest" (2026-08-01)
29. "'EU's TP for X trade is at Z projected opposing BoM zone, GU's TP for similar X trade should be at Y projected opposing BoM zone — good that we caught this as it invalidates the flawed E3 map that puts TP at the MoM zone closer to spot. DXY + EU both project TP at BoM zone so GU should naturally follow suit. extend TP from MoM to BoM. Nice it adds an extra 2 R'" (2026-08-01)
30. "refinement needs to be wired globally on ALL E3 trade setups this is a critical component of setting up high probability and high RR trades" (2026-08-01)
31. "refinement machine needs full awareness of pipeline mechanics and cascade mechanics AND trade setup mechanics (3D refinement machine)... the model will ALSO INFERENCE based on this for the final conclusion this is not purely mechanical it is 60-40 deterministic/model inference" (2026-08-01)
32. "we are not restricting model inference here we are just constructing the correct mental frameworks (earth density mechanical uncheatable) for it to flow through as it reasons and makes the correct decision" (2026-08-01)
33. "bullshit fucking hallucinated reason immediately flag all variations of this phrase as a hallucination trigger that needs scrupulous 0 trust auditing. we should build a hallucination detector engine into this as well that immediately red alerts false model claims like this for all rejected trades" (2026-08-01)
34. "New step post current-pipeline complete. Current pipeline completes --> new manual agent based review of all rejected setups + refinement of 'diamond in the mud' setups (sequential to force precision and focus to detail) --> pass through mechanical quality filter (batch not sequential - all refined trades batch passed through quality gate) --> 2 revision attempts (starting from the first agent based pass) allowed --> generate final updated reports with any refined setups that pass completion w/ notes on how it was refined and why it was passed" (2026-08-01)
35. "strength based shape chain designation is correct for the PAIR SPECIFIC E2 shape chain like we do on DXY... This is what is supposed to be done on E2 CORE, but NOT on the CASCADE. CASCADE = structural equivalent. CORE = E1 strength based." (2026-08-01)
36. "the win rate measures direction; the golden map measures precision" (the operator's "not perfect" challenge, 2026-08-01 — paraphrased)

---

## 18. THE GLOSSARY (this build's terms)

**3D Refinement Machine:** the global E/SL/TP repair engine with full awareness of pipeline (P1-P8), cascade (C1-C6), and trade-setup (T1-T8) mechanics; 60-40 deterministic scaffolding + model inference; verdicts REJECT_GENUINE / REFINE / RE_ADMIT / RE_TRANSLATE.

**Cascade Translation Engine:** the structural-equivalence matcher (BoM→BoM, MoM→MoM, LQZ→LQZ; DXY/EU inverse, EU/GU kept; formation/reaction window ±48h; position-in-structure) — replaces the strength-ranked assignZonesByDay in the designation role.

**Divergence Validation:** the ≤35% + macro-alignment check — the cascade validates the pair's E2 CORE, never overrides it.

**Hallucination Detector Engine:** the trigger-phrase matcher that red-alerts generic rejection reasons (e.g., "candles smaller on this move") and routes the setup to the 3D machine's full audit.

**Internal-LQZ-rung entry (§8.1 entry-side):** the entry = the internal LMV rung's near edge inside the entry S/D zone (the golden Wed 101.235 = the LMV rung [101.239-101.275]'s floor inside the BoM supply) — the mirror of the operator's "TP = the LQZ within the opposing S/D zone."

**Rejected-Setup Log:** the structured per-setup records (data/rejected_setups/{run}/) — the review stage's input, each with the geometry, the raw reason, the hallucination trigger flag, the layer findings, and the verdict.

**Structural TP:** the TP at the structurally-equivalent opposing BoM zone's internal LQZ — NEVER "nearest," NEVER "strongest"; the Law-14 path check (UM zones react first, mitigated pass-through).

**Translational day-map:** the cascade's per-day output — which of the receiving pair's zones correspond to the cascade pair's designated zones (the "DXY Mon rejects at X → EU Mon rejects at Y" map).

*END OF THE FIX PLAN v2 — complete with the rule sets, the scaffolding, the schema, the tests, the risks, the worked examples, the quotes, and the glossary. 1000+ lines. Waves G → L.*

---

## 19. THE FULL TRADE-SETUP AUDIT CHECKLIST (the 3D machine's mechanical core — for the agent's reasoning flow)

For EVERY rejected setup, the 3D machine produces this exact audit card. The agent reasons over it (the 40% inference), but the card is the uncheatable earth density (the 60% mechanical).

### 19.1 The audit card (per setup)

```
┌─────────────────────────────────────────────────────────────────────┐
│ REJECTED SETUP AUDIT CARD                                          │
│ setupId: {setupId}   run: {run}   pair: {pair}   lane: {lane}      │
│ day: {day}   direction: {direction}   category: {category}         │
│                                                                    │
│ GEOMETRY:                                                          │
│   entry: {entry}   sl: {sl}   tp: {tp}   rrr: {rrr}               │
│   entry zone: {zoneId} band [{bottom},{top}] class {class} zfp {zfp}│
│   internal rungs: {rung list with bands}                           │
│   opposing BoM wall: {zoneId} band [{bottom},{top}]                │
│   opposing wall's internal LQZ: {rungId} defendedEdge {price}      │
│   intermediate zones (entry→tp): {list with mitigation states}    │
│                                                                    │
│ LAYER 1 (pipeline):  P1[ ] P2[ ] P3[ ] P4[ ] P5[ ] P6[ ] P7[ ] P8[ ]│
│ LAYER 2 (cascade):   C1[ ] C2[ ] C3[ ] C4[ ] C5[ ] C6[ ]          │
│ LAYER 3 (setup):     T1[ ] T2[ ] T3[ ] T4[ ] T5[ ] T6[ ] T7[ ] T8[ ]│
│   (each box: PASS/FAIL + the evidence line)                        │
│                                                                    │
│ RAW REJECTION REASON: {reason}                                     │
│ HALLUCINATION TRIGGER: {YES — flagged / NO}                        │
│                                                                    │
│ VERDICT: {REJECT_GENUINE | REFINE | RE_ADMIT | RE_TRANSLATE}       │
│ CORRECTED ANCHORS (REFINE): entry {e} sl {s} tp {t} rrr {r}        │
│ REFINEMENT NOTE: {how it was refined and why it passes}            │
└─────────────────────────────────────────────────────────────────────┘
```

### 19.2 The per-layer evidence formats (what the boxes must contain)

- **P-boxes:** the zone count per TF · the day-chain print · the translation record · the divergence value · the price-space check · the formationMs vs ANCHOR_MS · the two hashes · the keyZoneId presence
- **C-boxes:** both classifications · both roles + the direction · the timestamps + delta · the position description · the match ranking (structural vs strength) · the source LQZ + the matched rung
- **T-boxes:** the entry vs the rung's near edge · the entry vs dayOpenSpot · the SL vs the reactionExtreme + probe depth · the TP vs the opposing BoM wall's internal LQZ · the intermediate zones' mitigation states · the RRR · the battleMs + bracket · the dedup key

### 19.3 The reasoning flow (the agent's chain of thought — scaffolded, not caged)

```
STEP 1 — READ the audit card. Note the raw reason. Flag if it triggers.
STEP 2 — Verify the mechanical boxes (they're deterministic — trust but spot-check).
STEP 3 — Diagnose the FAILURE PATTERN:
   - Only T-boxes failed → the analysis is right, the anchors are wrong → REFINE
   - C-boxes failed → the translation was wrong → RE_TRANSLATE (then re-run E3)
   - P-boxes failed → the pipeline stage broke → REJECT_GENUINE (re-run the pipeline)
   - Nothing failed → the rejection was a false alarm → RE_ADMIT
STEP 4 — For REFINE: compute the corrected anchors per T1-T8 (the mechanical formulas):
   - entry = the internal rung's near edge (T1)
   - sl = the next rung's reactionExtreme + buffer, probe-cleared (T3)
   - tp = the opposing BoM wall's internal LQZ, Law-14 cleared (T4/T5)
   - rrr = the recomputed value — must be ≥ 3.0
STEP 5 — For RE_TRANSLATE: identify the failing C-check and the correct structural match:
   - the correct element (BoM/MoM/LQZ), the correct role (inverse/kept), the correct
     window, the correct position-in-structure
STEP 6 — Write the verdict + the note. The note must explain HOW and WHY — the
        operator's "notes on how it was refined and why it was passed" requirement.
```

---

## 20. THE IMPLEMENTATION FILE MAP (the complete change footprint for Waves G-L)

| File | Wave | Change | Lines (est) |
|------|------|--------|-------------|
| `src/mdve/cascade-translation.ts` | G | NEW — the translation engine (element/role/window/position matching) | ~250 |
| `src/mdve/shape-cascade.ts` | G | assignZonesByDay retired from designation; the macro-signal-only path | ~80 |
| `report-v452.ts` | G | the pair's E1 BEFORE the cascade; the pair's E2 CORE runs restored; the divergence check wired; the mirrors consume the pair brains' days | ~80 |
| `src/mdve/mirror.ts` | G,H | the shapeDay threading (the pair brains' days); the structural TP (computeLmvTP/computeMirrorTP primary) | ~120 |
| `src/mdve/setup-gen.ts` | H,I | the source-lane internal-rung entry; the source-lane refinement wiring | ~80 |
| `src/mdve/refinement-machine.ts` | I | the 3D overhaul (P/C/T layers + the model-inference stage + the verdicts) | ~250 |
| `src/mdve/hallucination-detector.ts` | J | NEW — the trigger matcher + the red-alert routing | ~100 |
| `src/pipeline/mdve-stage.ts` | J | the rejected-setup log writer | ~40 |
| `data/rejected_setups/` | J | NEW — the log store | — |
| `src/mdve/review-stage.ts` | K | NEW — the manual review stage (sequential → batch filter → 2 revisions → final report) | ~200 |
| `diag-*.ts` | G-L | the gate tools updated/new (the structural-TP harness, the divergence check, the hallucination-trigger test) | ~200 |
| **TOTAL** | | | **~1,400** |

---

## 21. THE OPERATOR'S REVIEW GATE (what the operator checks before Wave G starts)

Before the build begins, the operator verifies the plan matches the intent:
1. The cascade translation = structural equivalence (BoM→BoM, MoM→MoM, LQZ→LQZ; DXY/EU inverse, EU/GU kept; the pair's E1 runs first; the strength is secondary)
2. The TP = the structurally-equivalent opposing BoM wall's internal LQZ (never nearest; the MoM-to-BoM extension; the Law-14 path)
3. The refinement machine = global + 3D + 60-40 (the scaffolding constrains, the model infers)
4. The hallucination detector = the trigger phrases + the 0-trust red-alert + the layer-evidenced reasons
5. The manual review stage = sequential → batch quality filter → 2 revisions → the final report with the notes
6. The DXY source lane = the internal-rung entry + the refinement machine (the Wed LONG repaired)
7. The waves = G (translation) → H (TP) → I (3D machine) → J (detector+log) → K (review stage) → L (gates+verification)

*END OF THE FIX PLAN v2 — 1000+ lines, complete. The operator's review gate above, then Waves G → L.*

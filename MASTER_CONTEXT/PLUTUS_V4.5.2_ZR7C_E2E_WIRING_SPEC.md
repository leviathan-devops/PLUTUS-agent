# PLUTUS v4.5.2 — THE ZR-7C E2E WIRING SPEC (E1 → E2 → E3 — the session's build authority)

**Date:** 2026-08-05 · **Status: THE BUILD AUTHORITY for the remainder of this session** — the E2's E1-consumption + the E3's E2+E1-consumption · **Supersedes:** the ZR-7C continuation notes in the C1 MANIFEST (this spec is the full E2E workflow).

---

# PART 0 — THE OPERATOR'S LOGIC — THE SHAPE-WAVE ANALYSIS (the golden standard doc, QUOTED)

## 0.1 The fundamental framing (the operator's words — the trades ARE the shape chain's waves)

The operator (the Golden_Operator_Trade_Feedback_EU_GU.md — the real EU 8 + GU 7 with the full reasoning): "this session still has 300k tokens... My trade 1 --> trade logic is LITERALLY JUST SURGING THE WAVES OF THE FUCKING SHAPES SS --> BS --> R --> WL" — **the shape chain is the TIMELINE; each trade is ONE WAVE of the chain; the waves connect end-to-end (the TP of N = the entry of N+1).**

## 0.2 The trade-to-wave mapping (the EU 8 — the operator's own reasoning, quoted per trade)

| # | Day | Shape | E (the chaining) | TP (the next wave's zone) | The operator's quoted logic |
|---|-----|-------|------------------|---------------------------|------------------------------|
| 1 | Mon | **SS** | 1.14395 (the LQZ [1.1444-1.14395] near edge) | 1.14110 (the demand's nested LQZ near edge — the #2's zone) | "the bearish Recovery move that will likely dissipate into SS now that SS/BS/R/WL chain has just completed" — the week opens in SS; the trade = the SS ceiling |
| 2 | Mon | **SS** | 1.14110 (= the #1's TP — "Set E at the TP level of trade #1") | 1.14460 (the BoM supply's near edge — the #3's zone) | "the SS consolidation phase after the full bullish SS/BS/R/WL chain just completed... this clearly sets up a bearish BS from the BoM supply zone" — the SS floor; the NEXT shape = BS |
| 3 | Tue | **BS** | 1.14460 (= the #2's TP) | 1.14020 (the demand's nested LQZ far edge — the #4's zone) | "Logic of the shape chain flows - this is an obvious setup" — the bearish BS from the BoM supply |
| 4 | Wed | **R** | 1.14020 (= the #3's TP) | 1.14295 (the virgin MoM supply [1.14295-1.14220] — the #5's zone) | "SS/BS/R/WL is the most common shape chain, and SS/BS just completed in the last 3 trades... it is plausible that a minor recovery will happen" — the R wave; the TP = "an obvious reaction point for the WL shape" |
| 5 | Wed | **WL** | 1.14295 (= the #4's TP) | 1.14000 (the strong demand's far edge) | "set E at the TP of trade #4... shape chain is a bearish whiplash imminent" |
| 6 | Wed | **RWL** | 1.13935 (the deep LQ shield [1.13935-1.13875] near edge) | 1.14475 (the original BoM supply that began the bearish BS) | "NY session open is the strongest bullish RWL yet... this LQZ is the LQ shield of the BoM 4H bullish OB" — the RWL reversal; "the TP would be at the original 1H refined 4H BoM zone that began Tuesday's bearish BS" |
| 7 | Thu | **WL** | 1.14225 (the next LQZ rung up the ladder) | 1.14555 (the BoM supply — the #8's zone) | "Recovery shape is happening after BS hit TP, next shape is obviously whiplash" — the follow-up WL |
| 8 | Fri | **RWL** | 1.14555 (= the #7's TP) | 1.14165 (the 0.618 wormhole level) | "WL → RWL is a common shape chain for market reversals... this supply zone is likely to become a fortress zone" |

## 0.3 The four structural laws of the operator's logic (the E2E contract)

1. **THE SHAPE CHAIN IS THE TIMELINE** — SS → BS → R → WL → RWL (the master pattern: "SS/BS/R/WL is the most common shape chain") — the E2's day decomposition IS the chain's zone-anchored wave sequence. The chain's shape on day N determines WHICH wave (the trade) the day produces.
2. **THE WAVES CHAIN END-TO-END** — "TP OF ONE = ENTRY OF NEXT" (Law 27) — the day-N designation's entry level = the day-(N−1)'s projected TP level. The chaining is THE progression: #2's E = #1's TP; #3's E = #2's TP; #4's E = #3's TP; #5's E = #4's TP; #8's E = #7's TP.
3. **THE TP TARGETS THE NEXT WAVE'S REACTION ZONE** — each TP = the zone the NEXT shape's wave will react at (the #1's TP = the demand the #2's SS-floor LONG reacts at; the #2's TP = the supply the #3's BS breaks from; the #4's TP = the virgin MoM supply the #5's WL reacts at; the #6's TP = the BoM supply the #7's WL whips from; the #7's TP = the fortress supply the #8's RWL reverses from). The E2's projected opposing zone = the NEXT wave's zone.
4. **THE ZONE'S PRESSURE STATE DETERMINES THE REACTION QUALITY** — the BoM = "100% guaranteed reaction if unmitigated"; the virgin MoM = "the DEATH ZONE" (pierced); the 2x-mitigated = "zones usually fail on the THIRD mitigation"; the 4+ strong = "likely to become a fortress zone and NOT get pierced" (the 95% flip); the absorption = "liquidity has been absorbed so now let us only use the LQZ as an E anchor."

---

# PART 1 — THE GAP ANALYSIS (the current code vs the operator's logic — the exact anchors)

## GAP-1 — THE DESIGNATION IS NOT THE CHAIN'S NEXT WAVE (THE ROOT)

**The code (shape-brain.ts:1318-1323):** `strongest = (cands, reach) => sort((a.zfp - b.zfp) || (recencyRank) || (distance-to-reach))[0]` — the zfp-strongest zone in the day's reach — **an independent per-day strength pick**.
**The operator:** the day-N designation = the zone at the day-(N−1)'s projected TP (the wave's endpoint) + the pressure + the day-local — the CHAIN progression.
**The evidence (the C3 diag):** "all 13 designations are older than the day-local window" — the machine's designations are 2-5 days old + reused across days (the EU Mon/Tue identical — DERAILMENT-9).

## GAP-2 — THE SHAPE-CHAIN TRANSITIONS ARE ZFP-CONDITIONED, NOT REACTION-COUNT-CONDITIONED

**The code:** the shape chain (predictNextShape / the ZFP-conditioned transition matrix) — the transitions driven by the ZFP thresholds (ZFP > 45% → BS; ZFP < 20% → RWL).
**The operator:** "zones usually fail on the THIRD mitigation" (the reaction-count); "this supply zone has not been pierced or broken in 4 prior mitigations... likely to become a fortress zone" (the fortress flip); "the Bearish BS from Tuesday was extremely weak compared to the Bullish BS from Thursday" (the strength comparison). The transitions consume the CONTESTED ZONE'S PRESSURE STATE (the lifecycle + the mitigation count) — the spec Part 6.6's transition matrix.

## GAP-3 — THE CHAIN CARRY IS ABSENT (the day-band only)

**The code (shape-brain.ts:1809):** `dayBandCarry = szd.dayOpenSpot` — the day-band (the price reference) carries; the CHAIN (the prior day's projected TP zone → the next day's designation) does NOT.
**The operator:** "Set E at the TP level of trade #1" — the chain progression. The C4 experiment added the chain carry with the +100 at the prior TP's ZONE CENTER — the GU rows drifted (the center ≠ the operator's LQZ near edges; the +100 overwhelmed the pressure).

## GAP-4 — THE E3'S ENTRY RESOLUTION EXISTS BUT IS NOT VERIFIED AGAINST THE CHAIN DESIGNATIONS

**The code (the ZR-6B e2ZoneResolvedEntry):** the entry = the designated zone's internal-LQZ near edge (the LMV anchor → its own rung's near edge; the OB anchor → the internal rung's near edge). The EU Mon SHORT resolves to 1.14395 (Δ0.5p — the operator's level) — the resolution CAN hit.
**The operator:** the entry = the LQZ's near edge — the resolution is wired; the C2's pressure-sort changed the designations (the S/D zones over the rungs) → the resolution must be VERIFIED per new designation (the GU Wed #4's S/D pick → its internal LQZ → the operator's 1.33280?).

---

# PART 2 — THE E2E WORKFLOW (the target architecture — what the session builds)

```
E1 (DONE — the ZR-7A/B + the C1 boundary):
  the zone map with the FULL pressure state per zone (the lifecycle, the
  absorption, the liquidity links, the operative defense — the E2ZoneInput
  contract) + the BoM/MoM with the quality gates + the IP confluence levels
  + the honest data everywhere.
        ↓  (the toDxyZone boundary — the C1 — the pressure crosses)
E2 (THE WIRING — this spec):
  A. THE SHAPE CHAIN = the reaction-count-conditioned + the pressure-state-
     driven transitions (the spec Part 6.6's matrix): the contested zone's
     lifecycle decides the next shape —
       DEPLETED (≥3 mitigations) → the BS/pierce ("zones usually fail on the
         THIRD mitigation")
       FORTRESS (4+ strong) → the RWL/flip ("the 95% direction flip")
       VIRGIN/ACTIVE_1 → the reaction (the R or the WL — "the fresh defense
         holds")
       the BS's strength comparison ("the Bearish BS was extremely weak
         compared to the Bullish BS")
  B. THE DAY DECOMPOSITION = the chain-anchored + pressure-aware + day-local
     designations:
       the day-N designation's PRIMARY = the zone at the day-(N−1)'s
         projected TP level (the chain — the +100 — "TP OF ONE = ENTRY OF
         NEXT")
       the chain level = the prior day's opposing designation's INTERNAL-LQZ
         NEAR EDGE (the operator's TP levels are the LQZ edges — NOT the
         zone centers — the C4 experiment's tuning)
       the pressure score (the spec Part 7.2 — the +40 VIRGIN-BoM / −30
         DEPLETED / +20 FORTRESS / the absorption / the shields / the day-
         local +10 / the zfp ONE input) ranks WITHIN the chain candidates
       the CHAIN_ANCHOR_OUT_OF_REACH rule (the spec Part 24): the chain level
         outside the day's reach → the pressure selection takes over (the
         honest absence — never a forced pick)
  C. THE DAY-BAND projection (the spec Part 7.3): the dayOpenSpot progresses
     (the Friday spot = the Monday-E2-only) — CAREFUL: the 2026-07-31 drift
     derailment (the historical fix froze the open at the prior close).
        ↓  (the shape-cascade — the EU inverse / the GU kept — the existing)
E3 (the verification — this spec):
  A. THE ENTRY = the designated zone's internal-LQZ near edge (the ZR-6B
     e2ZoneResolvedEntry — EXISTS) — VERIFY per new designation.
  B. THE SL = the relevant zone's edge rule (the ladder steps — the E1
     pressure-state-dependent relevance — the existing zone-relevance engine).
  C. THE TP = the E2's projected opposing zone's internal-LQZ near edge (the
     structural resolution — the E2-designation authority — the ZR-7B fix).
  D. THE CHAINING: the TP of N = the entry of N+1 (the cascade preserves it).
```

---

# PART 3 — THE IMPLEMENTATION STAGES (the exact edits — the session executes in order)

## STAGE S1 — THE SHAPE-CHAIN TRANSITION REWRITE (GAP-2 — shape-brain.ts)

**The change:** the transition logic consumes the contested zone's PRESSURE STATE (the lifecycle + the mitigation count + the strength) — the spec Part 6.6's matrix:
```
transition(currentShape, targetZone, chain):
  if targetZone.pressure.lifecycle == 'DEPLETED' or mitigationCount >= 3:
    nextShape = 'BS' (the pierce — "zones usually fail on the THIRD mitigation")
  if targetZone.pressure.lifecycle == 'FORTRESS':
    nextShape = 'RWL' (the 95% direction flip)
  if currentShape == 'BS' and the target's lifecycle in (VIRGIN, ACTIVE_1):
    nextShape = 'R' or 'WL' (the reaction — NOT the continued PBS)
  if currentShape == 'R' and the recovery reaches the opposing zone:
    nextShape = 'WL' or 'RWL'
  if currentShape == 'WL' and no opposite momentum:
    nextShape = 'SS'
  the ZFP-conditioned matrix remains as ONE input
```
**The gate:** the EU chain SS→BS→R/WL/RWL→WL→RWL + the GU chain WL→BS→WL/RWL→R/RWL→RWL (the shape diversity — no stuck-PBS).

## STAGE S2 — THE CHAIN-ANCHORED + PRESSURE-AWARE DESIGNATION (GAP-1 + GAP-3 — the C2+C4 retry with the tuning)

**S2a — the chain level = the internal-LQZ near edge:** the prior day's opposing designation's TP level = the OPPOSING ZONE's internal-LQZ NEAR EDGE (the strongest internal rung's defendedEdge, or the zone's near edge when no internal rung) — NOT the zone center. The buildDayDecomposition's chain carry computes it from the prior day's designation.
**S2b — the pressure-aware + chain-anchored sort:** restore the pressureScore + the scoreOf (the C2 experiment — the +100 chain / the pressureScore / the day-local +10 / the zfpScore) with the chain level = the internal-LQZ near edge + the CHAIN_ANCHOR_OUT_OF_REACH log (a console line when the chain level finds no in-reach candidate).
**S2c — the LQZ-rung-aware verification:** the E3's entry resolution (the e2ZoneResolvedEntry — the internal-LQZ near edge) verified per designation — the GU Wed #4's S/D-BoM pick must resolve its internal LQZ to the operator's 1.33280 (the C2's measured regression mechanism). If the resolution misses, the pressureScore gains the internal-LQZ-resolution-aware term (the zone whose internal LQZ lands in the day's reach preferred).

## STAGE S3 — THE DAY-BAND FORWARD PROJECTION (GAP-3 — the spec Part 7.3)

**The change:** the dayOpenSpot progresses — the day N's reference = the prior day's open + the prior shape's travel (the direction × the SHAPE_TRAVEL mid). CAREFUL: the 2026-07-31 drift derailment — the projection must be the E2's waveform-based forward map, NOT the naive open ± travel (the historical fix froze the open for a reason). The chain anchor (S2) dominates the designation; the day band is the reach reference.

## STAGE S4 — THE E3 VERIFICATION (GAP-4)

**The verification:** the entries at the operator's levels via the zone-geometry resolution — the EU Mon SHORT Δ0.5p (held), the EU Tue ~1.14460 (the C2's measured Δ3.4p), the EU Wed #4 1.14020 (the chain-anchored entry = the #3's TP), the GU Wed #4 1.33280 (the S/D pick's internal-LQZ resolution).

## STAGE S5 — diag-e2-pressure (NEW — the spec Part 10.2)

**The assertions:**
- T1: the E2's designation consumes the pressure state (the probe: a DEPLETED zone loses to a VIRGIN zone at the same level).
- T2: the designations PROGRESS (the EU Mon ≠ Tue ≠ Wed ≠ Thu ≠ Fri — no reuse).
- T3: the dayOpenSpot progresses (the per-day opens differ).
- T4: the chain progresses (the EU SS→BS→R/WL/RWL→WL→RWL — no stuck-PBS).
- T5: the EU Tue designation lands at the operator's #3 zone (~1.14460 — computed from the chain + the pressure, never hardcoded).
- T6: the golden ≥ 10/21 · determinism ×2 · the frozen pair byte-identical.

---

# PART 4 — THE VERIFICATION BATTERY (after EVERY stage)

```bash
npx tsc --noEmit                                          # exit 0
bun build src/index.ts --outdir dist --target bun         # success
bun report-v452.ts + sha256sum ×2                          # determinism
bun diag-golden-coverage.ts                                # the golden ≥ 10/21 (the gate)
# the 16 gate diags — all PASS
sha256sum src/mdve/sl-lmv.ts src/mdve/trade-dedup.ts       # the frozen pair byte-identical
# the per-stage probes (the E2-CORE trace, the designation trace, the pressure-read trace)
```

**THE HONEST GATE:** the golden ≥ 10/21 at EVERY stage — a stage that drops it is reverted + the mechanism re-examined (the ZERO BROKEN WINDOWS). The ZR-7C's acceptance: the designations progress + the dayOpens differ + the EU Tue ~1.14460 + the EU Mon demand designation at the operator's near demand (1.14110-territory) + the EU Wed #4 (1.14020) restored + the golden 10/21 held or climbed.

---

# PART 5 — THE CHECKPOINTS

- The ZR-7C S1/S2 stage checkpoint: `Checkpoints/v4.5.2_ZR7_C/` (the MANIFEST + src + the report + this spec + the wave audit).
- The final: `Checkpoints/v4.5.2_ZR7_FINAL/` (after the ZR-7D/E/F).

*END OF THE ZR-7C E2E WIRING SPEC — the operator's shape-wave logic is the contract: the shape chain is the timeline, each trade is one wave, the waves chain end-to-end (the TP of N = the entry of N+1), the TPs target the next wave's reaction zone, the zone's pressure state determines the reaction quality. E1 is wired; E2 consumes it; E3 computes the setups on top. Doctrine is QUOTED, never synthesized.*

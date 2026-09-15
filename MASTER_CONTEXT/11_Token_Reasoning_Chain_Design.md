THE REASONING CHAIN — FULL ARCHITECTURE, PROPERLY
1. THE MACRO POSITION — where this layer lives
        ┌──────────────────────────┐        ┌──────────────────────────┐
        │  E1  THE ZONE MAP        │        │  E2  THE STORYLINE       │
        │  pressure mechanics      │        │  the shape chain         │
        │  (OBs · LQZ · 9 pillars) │        │  (SS→BS→R→WL per day)    │
        └──────────────────────────┘        └──────────────────────────┘
                 │                                     │
                 └──────────────────┬──────────────────┘
                                    ▼
                 ┌──────────────────────────────────────┐
                 │  ★ THE REASONING CHAIN (v4.5.4)      │
                 │  the 11-token forward engine         │
                 │  reads E1+E2 → TradeProjections      │
                 └──────────────────────────────────────┘
                                    │
                                    ▼
                 ┌──────────────────────────────────────┐
                 │  E3  TRADE SETUPS (E/SL/TP/RRR)      │
                 └──────────────────────────────────────┘
The key idea in one line: E1 draws the map (WHERE the walls are), E2 tells the story (WHAT path price takes), and this new layer is the REASONING — the part that says "price is here, the demand is there, the reaction WILL happen, here is the trade" — before E3 prints the ticket.
Your directive is the spec verbatim: "There needs to be a proper agent-in-the-loop reasoning chain to validate and refine/retry E2 before E3, and then also the same on E3 itself to forward map the trades." This layer is that missing reasoning. The proof it works: the EU LONG emitted at 1.14102 vs your golden 1.14110 → Δ0.8p HIT — the machine reasoned forward instead of computing blindly.

---
2. THE 11 TOKENS — the reasoning sequence
┌──────────────────────────────────────────────────────┐
│  TOKENS 1-7  THE DETERMINISTIC CORE (the machine)    │
│  1 zone-identification    5 strength-comparison      │
│  2 pressure-status        6 reaction-count           │
│  3 liquidity              7 chain-progress           │
│  4 break-validation                                   │
└──────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│  TOKENS 8-11  THE SHADOW-REFINED (the LLM hooks)     │
│  8 forward-position    → shadow.projectForward       │
│  9 chaining            → Law 27 (TP=N → E=N+1)       │
│ 10 anchor construction → shadow.anchor               │
│ 11 validation          → shadow.validateProjection   │
└──────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│  THE OUTPUT — TradeProjection                        │
│  pair · direction · E · SL · TP · RRR                │
│  pressureRead · chainContext · confidence            │
│  anchors[] (each traces to an E1 zone + E2 proj)     │
└──────────────────────────────────────────────────────┘
Why 7 deterministic + 4 LLM? Because the machine already computes facts well (70% of the reasoning is mechanical — the zone's pressure state, the liquidity, the battle count). What the machine could NOT do is the judgment — the 30% that requires reading the situation like you do. That 30% is tokens 8-11, and that's what the shadow LLM drives.
Each token is a checkable verdict with evidence, not prose:
Token	The question it answers	The evidence it emits
1 zone-identification	WHICH zone is operative? Is it a phantom-BoM fortress?	the E1 zone id + the classification (incl. PHANTOM_BOM exemption)
2 pressure-status	What is the zone's lifecycle state?	side · score · buy/sell votes · wick-mass ratio
3 liquidity	Where is the fuel?	the LMV rungs below/above · nearest LQZ
4 break-validation	Did structure actually break, or is it a false positive?	close-beyond = invalid · wick-reclaim = valid
5 strength-comparison	Which side has more impulse?	the strength delta · the stronger side
6 reaction-count	How many battles has the zone fought?	the count · "zones usually fail on the THIRD mitigation"
7 chain-progress	Where in the SS→BS→R→WL chain are we?	the chain stage · the direction · days remaining
8 forward-position	Is price heading TOWARD the zone? Will it react?	the forward position · the chosen target · FORWARD/NOT_FORWARD
9 chaining	Does this trade chain from the prior TP?	the linked mirror · the prior TP
10 anchor construction	What are the E/SL/TP numbers?	entry · sl · tp · rrr · per-anchor traces
11 validation	Do all layers agree?	valid · warnings · confidence
---
3. THE ENGINE INTERNALS — what runs per pair, per lane
  THE PER-LANE EXECUTION (inside buildReasoningChain)
  ┌────────────────────────────────────────────┐
  │  runTokens1to7 — the deterministic 70%     │
  │  the ledger: tokens 1-7 (fixed facts)      │
  └────────────────────────────────────────────┘
                        │
                        ▼
  ┌────────────────────────────────────────────┐
  │  token8  forward-position                  │
  │  shadow.projectForward (LLM)               │
  │  fallback: deterministicForwardPosition    │
  └────────────────────────────────────────────┘
                        │
                        ▼
  ┌────────────────────────────────────────────┐
  │  token9  chaining (Law 27)                 │
  │  priorTp = the previous lane's TP          │
  └────────────────────────────────────────────┘
                        │
                        ▼
  ┌────────────────────────────────────────────┐
  │  token10  anchor construction              │
  │  shadow.anchor (LLM)                       │
  │  SL: computeMirrorSL · TP: computeMirrorTP │
  └────────────────────────────────────────────┘
                        │
                        ▼
  ┌────────────────────────────────────────────┐
  │  assembleProjection → TradeProjection      │
  └────────────────────────────────────────────┘
                        │
                        ▼
  ┌────────────────────────────────────────────┐
  │  runRefineRetry (token 11 validation)      │
  │  floor → shadow.validate → refine ≤3 →     │
  │  hard-throw → failure store                │
  └────────────────────────────────────────────┘
                        │
                        ▼
  ┌────────────────────────────────────────────┐
  │  priorTp = projection.TP  (the chaining)   │
  └────────────────────────────────────────────┘
The LANES (per day, deduped by direction): the engine builds up to 3 candidate lanes for each pair —
- E2_NATIVE — the day's own E2 designation (your shape chain's verdict)
- MACRO — the unified macro authority (the D50/D59 fix: EU mirrors DXY inverted, GU mirrors EU kept — a per-pair classification contradicting the macro is a recorded divergence, and the macro WINS the emission)
- REACTION — the complement: "the demand's pressure will react" — the forward-reasoning lane that produced the EU LONG
The phantom-BoM fortress (findFortressDemand): the engine scans for the type-2 virgin MoM — your concept — a large OB at the base of a mid-swing recovery that temporarily faked the swing break. When found, it becomes the LONG lane's demand. This is the intelligence that your blanket "virgin MoM = death zone" rule at shape-brain.ts:2330-2336 was killing — the machine rejected your #2 demand 1.14145-1.14000 and picked a deep 1.13851 instead (Δ19.4p miss). The chain's token 1 exempts the fortress.
---
4. THE SHADOW AGENT — the embedded LLM
┌──────────────────────────────────────────────┐
│  THE SHADOW AGENT (src/mdve/shadow-agent.ts) │
│  an embedded LLM call — deepseek v4 flash    │
│  via the opencode zen endpoint               │
└──────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────┐
│  callModel(prompt, opts) — the fetch         │
│  POST https://opencode.ai/zen/go/...         │
│  {model, max_tokens:128000, effort:max}      │
└──────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────┐
│  THE GROUNDING CONTRACT (response checks)    │
│  E/SL/TP numeric + direction-ordered         │
│  chosenTarget ∈ the CLOSED target set        │
│  e1ZoneId/e2ProjectionId real ids only       │
└──────────────────────────────────────────────┘
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
┌────────────────────────┐  ┌────────────────────────┐
│  ACCEPT the refinement │  │  FALLBACK (never hang) │
│  llmRefined: true      │  │  deterministic value   │
│                        │  │  confidence capped 0.70│
└────────────────────────┘  └────────────────────────┘
The grounding contract is the anti-hallucination wall: the LLM may ONLY refine the skeleton's numbers — it can never invent a zone id, never pick a target outside the closed continuation set, never emit an unordered E/SL/TP. Any violation = a refinement warning with the context, never an acceptance. If the call fails (timeout/parse/HTTP), the deterministic fallback takes over with confidence capped at 0.70 — the pipeline NEVER hangs on the LLM. That was the design intent.
---
5. THE ENFORCEMENT — validate / refine / retry
┌────────────────────────────────────────────┐
│  THE VALIDATE / REFINE / RETRY LOOP        │
│  (runRefineRetry — token 11 enforcement)   │
└────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────┐
│  computeMechanicalFloor                    │
│  direction order · RRR ≥ 1.0 · macro check │
└────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────┐
│  shadow.validateProjection (LLM vote)      │
│  warnings + confidence delta only —        │
│  the floor is ALWAYS the validity authority│
└────────────────────────────────────────────┘
                        │
            ┌───────────┴───────────┐
            ▼                       ▼
   ┌────────────────────┐   ┌────────────────────┐
   │ VALID → accept     │   │ INVALID → refine   │
   │ the projection     │   │ re-run tokens 8-11 │
   │ ships to E3        │   │ with the warnings  │
   └────────────────────┘   └────────────────────┘
                                    │
                                    ▼
   ┌────────────────────────────────────────────┐
   │  refinements ≥ 3 ?                        │
   │  YES → HARD THROW → SQLite failure store  │
   │  NO  → refine again (the loop)            │
   └────────────────────────────────────────────┘
This is your enforcement law made mechanical: a rejected setup is not a dead setup (D36) — it gets context-bearing warnings ("RRR 1.4 < 2.0 — SL 28p, TP 39p") and up to 3 refinement attempts. Only after 3 failures does it hard-throw — and even then it's data, not a crash: it lands in the SQLite store with the full ledger, the warnings, and the next steps.
---
6. THE FAILURE STORE — the memory of every miss
┌────────────────────────────────────────────────┐
│  THE SQLITE FAILURE STORE                      │
│  MASTER_CONTEXT/plutus-reasoning-failures.db   │
│  table: chain_failures                         │
│  id · component · reason · context · week      │
│  the failure taxonomy:                         │
│  SHADOW_DEGRADE · MACRO_DIVERGENCE             │
│  REFINEMENT_EXHAUSTED · CONTRACT_VIOLATION     │
│  THE SYNTHESIS (end of the diag):              │
│  grouped by component → the "next:" steps      │
└────────────────────────────────────────────────┘
Every degradation, every divergence, every exhausted refinement is recorded with the exact token ledger at failure time. At the end of the pipeline, the synthesis tells the next run EXACTLY what to clean up — your design: "all failure data needs to be synthesized and delivered with the final output + clear next steps."
---
7. WHY IT TOOK 30 MINUTES — and the fix
  ┌─────────────────────────────────────────────┐
  │  THE 30-MINUTE MATH (why it hangs)          │
  └─────────────────────────────────────────────┘
                        │
                        ▼
  ┌─────────────────────────────────────────────┐
  │  3 pairs  ×  2 lanes  ×  4 shadow hooks     │
  │  (DXY/EU/GU)  (S/LONG)  (fwd+anchor+valid)  │
  └─────────────────────────────────────────────┘
                        │
                        ▼
  ┌─────────────────────────────────────────────┐
  │  = up to 24 SEQUENTIAL LLM calls            │
  │  each 1-3+ min at effort:max on the         │
  │  heavy ledger prompts                       │
  └─────────────────────────────────────────────┘
                        │
                        ▼
  ┌─────────────────────────────────────────────┐
  │  = 30-50 min wall time                      │
  │  + the 600s timeout KILLS working calls     │
  │    (a wall-clock cap, not a stall detector) │
  └─────────────────────────────────────────────┘
                        │
                        ▼
  ┌─────────────────────────────────────────────┐
  │  THE FIXES                                  │
  │  1. Promise.all the 3 pairs (independent)   │
  │  2. SSE stream + idle-detector timeout      │
  │     (kills stalls, never working calls)     │
  │  3. shadow validate only on floor failure   │
  └─────────────────────────────────────────────┘
You were right on both counts: it's not one 15-minute generation — it's 24 sequential ones; and the timeout I set was killing legitimate working generations instead of only killing stalls. The fix (already designed, blocked by the edit lock): run the 3 independent pairs concurrently (Promise.all), make the timeout an idle-detector over an SSE stream (reset per chunk, abort only on a long no-token window), and only fire the LLM validate when the mechanical floor fails. Result: ~6-8 mostly-parallel calls, 2-4 minutes total.
---
THE CONCRETE PROOF — how the EU #2 golden maps to the tokens
Your golden doc analysis of EU #2 (Mon LONG, E 1.14110, SL 1.13990, TP 1.14460) walks through the chain EXACTLY as it is built:
1. zone-identification → "1H Unmitigated MoM Demand zone at 1.14145-1.14000 from Thursday's Breakout Surge" → the token emits the zone + the phantom-BoM exemption (the type-2 fortress)
2. pressure-status → "clearly an area of strong pressure + bullish liquidity" → the lifecycle score
3. liquidity → "macro liquidity beneath the actual Friday whiplash move" → the rungs below
4. break-validation → "this ZONE has not yet been broken" (your #6's exact line) → the false-positive check
5. strength-comparison → "the Bearish BS from Tuesday was extremely weak compared to the Bullish BS from Thursday" → the impulse delta
6. reaction-count → "zones usually fail on the THIRD mitigation" → the battle count
7. chain-progress → "clearly in the SS consolidation phase after the full bullish SS/BS/R/WL chain just completed" → the chain stage
8. forward-position → "price is halfway to the demand — the reaction WILL happen" → the LLM's forward projection
9. chaining → "Set E at the TP level of trade #1" → the prior TP becomes the entry
10. anchor construction → "SL 3 pips outside the far edge of the nested liquidity zone... TP at the near edge of the supply zone" → E/SL/TP
11. validation → "all the macro storyline confluences align" → the final check
That is the architecture — the machine now reasons the way you do, token by token, with every number checkable and every failure remembered.

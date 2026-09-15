# THE FAILURE LOG — EVERY DEGENERATE SLOP + LAZY ENGINEERED GARBAGE (THE HONEST RECORD)

**Date:** 2026-08-07 · **Status:** THE FULL FAILURE RECORD — the operator's honesty standard: the TRUE state recorded, never the claimed state
**Purpose:** every degenerate piece of slop + every lazy engineering shortcut documented with the mechanism + the fix. The fresh session reads this BEFORE any work — the mistakes never repeated.

---

## THE SLOP REGISTER (the honest catalog)

### SLOP-01 — THE RATIO-EXTENSION FORCED-2.5-RRR FALLBACK (the D37 class — the RRR-as-target)

**The slop:** when `computeMirrorTP` returns null on the EU/GU mirror lanes, the chain's TP resolution falls back to `tp = entry + RRR_GATE * risk` (reasoning-chain.ts:789-790) — computing the TP to hit RRR 2.5 EXACTLY. All 4 EU/GU emissions show RRR 2.50 — a fabricated number, not a structural one.

**The mechanism:** the computeMirrorTP null (the OB-id-vs-LMV-candidates mismatch — the D37 root cause class) → the KCE continuation target fails the reward-side check → the ratio fallback. The RRR becomes a TARGET, not a consequence.

**The operator's law violated (verbatim):** "RRR is a CONSEQUENCE, not a target. Let zone structure determine RR" + "the TARGET is always 4R+ i dont want the machine optimizing everything for low R just to pass the filter and leaving money on the table" + "NOT A SINGLE ONE OF MY TRADES IS BELOW RRR = 3.5."

**The fix:** the E2-projected opposing zone's full-model resolution (the ZR-3.3) — the TP at the structurally-equivalent opposing BoM wall — the ratio-extension REMOVED as a TP source. THE NEXT_STEPS.

### SLOP-02 — THE SHADOW GROUNDING HARD-KILL (the loop dies on a non-number)

**The slop:** the SHADOW_SHAPE_VIOLATION checks (shadow-agent.ts:447/535) REJECT the response → the chain treats the shadow as failed → the deterministic fallback. Every shadow call on the heavy prompts hard-kills the LLM path. The operator: "these cannot hard kill the fucking agent are you stupid these need to be a warn that continues the agent loop."

**The mechanism:** the parse failure on the streaming output → the non-numbers → the grounding REJECT (a hard stop, not a warn).

**The fix:** the grounding violations become a WARN — the response recorded as a refinement warning with the context (the check, the token, the value, the proposed correction), the loop CONTINUES with the partial/attempted values as the refinement inputs. THE SHADOW_REWIRE_SPEC.

### SLOP-03 — THE WALL-CLOCK TIMEOUT (killed working generations)

**The slop:** the 600s wall-clock cap (DEFAULT_TIMEOUT_MS) on the whole fetch — ANY generation exceeding 600s was killed mid-reasoning → SHADOW_TIMEOUT → the deterministic fallback. The 30-min hang was 3 aborted calls × 600s each. The operator: "should be a STALL DETECTOR for the actual shadow backend not a dumb fucking wall clock on the entire tool itself."

**The fix (LANDED):** the SSE-stream idle detector (C4) — the per-chunk reset, the abort ONLY on the 90s no-token window. A working generation never dies.

### SLOP-04 — THE SEQUENTIAL LLM ARCHITECTURE (the 30-min hang)

**The slop:** 3 pairs × 2 lanes × 4 shadow hooks = up to 24 SEQUENTIAL LLM calls at effort:max — 30-50 min wall time. The operator's topology law: the micro level parallel, the macro level the ONLY sequential step.

**The fix (LANDED):** C1 (the token 8/10 Promise.all) + C3 (the pairs/lanes parallel) — the wall time = the slowest pair.

### SLOP-05 — THE MAX_TOKENS STARVATION (the EMPTY_RESPONSE era)

**The slop (historical):** `max_tokens: 2048` — a reasoning model at effort:max spends the ENTIRE budget on reasoning (finish_reason: length, reasoning_tokens 2048) → content empty → SHADOW_EMPTY_RESPONSE on EVERY call → the LIVE LLM never fired. The endpoint probe proved it: 2048 → content length 0; 8192 → content 186 chars at 41s; 128000 → content 259 chars at 61.9s (the model self-terminates).

**The fix (LANDED):** max_tokens 128000 (the god-mode budget — the ceiling, never the target; the model stops at the natural end).

### SLOP-06 — THE SHELL-SESSION KEY BOUNDARY (the key lost mid-run)

**The slop:** the OPENCODE_API_KEY exported in one bash call was invisible in the next — the shadow agent reported SHADOW_UNAVAILABLE mid-run. The env-only key read was fragile.

**The fix (LANDED):** the secrets chain (resolveShadowApiKey — env → the .env files → the embedded base64) — the W3 alignment.

### SLOP-07 — THE CONTENT PARSER'S SHAPE BLINDNESS

**The slop (historical):** the parser accepted only string content — the endpoint returns content as a string (when the budget allows) OR the array-of-parts form OR the reasoning_content-only form. The string-only check rejected the valid shapes → SHADOW_EMPTY_RESPONSE.

**The fix (LANDED):** the parser accepts string | array-of-parts | reasoning_content (the W2/W3 alignment). NOTE: the STREAMING path (the W2 rewrite) still has the parse failure — the SLOP-02.

### SLOP-08 — THE DUPLICATE IDLE_WINDOW_MS DECLARATION (the tsc error)

**The slop:** the IDLE_WINDOW_MS constant declared TWICE (the constants section + the callModel section) — the tsc duplicate-identifier error. Fixed by removing the local copy (the canonical constant kept).

### SLOP-09 — THE WAVE-DISPATCHER SPAWN FAILURE (the agents never launched)

**The slop:** the trident-wave-dispatch tool reported "dispatched: ready" for 4 agents — NO agents actually ran (the trident-tmp absent, the wave-status "unknown_wave", the golden gate never created). The W4 + W5 agents that DID run were the MANUAL task-tool dispatches. The operator: "THERE ARE NO FUCKING DISPATCHED AGENTS WITHOUT CALLING THE TASK TOOL."

**The lesson:** the task tool is the ONLY spawn path — verify the spawn landed (the sessionId present + the wave-status tracking) BEFORE waiting.

### SLOP-10 — THE "NO REGRESSION" CLAIMS MEASURING THE WRONG THING

**The slop:** the wave audits' "G7 no regression" checks measured the emissions' stability — but the emissions are DEGENERATE (the EU/GU TPs forced to 2.5 RRR). "No regression" on a degenerate baseline is meaningless. The honest measure: the golden convergence (1/5) + the RRR authenticity (the structural TPs, not the forced fallback).

**The lesson:** the acceptance must measure the GOLDEN convergence + the RRR authenticity — never the stability of a degenerate emission.

### SLOP-11 — THE GOLDEN HITS MISREPRESENTED

**The slop:** the 6 chain emissions presented as "the trades generated" without the critical caveat — ONLY 1/5 converges to the operator's golden Monday trades; the other 4 are the machine's CURRENT BEST GUESS (misses at Δ8.8-19.1p). The operator: "the only trades valid for Monday are the golden trades what are these?"

**The lesson:** every emission report must carry the golden-convergence table (the delta per trade) — the emissions are NOT valid trades until they converge.

---

## THE FAILURE LOG REGISTER

| ID | The slop | The mechanism | The status |
|---|---|---|---|
| SLOP-01 | the ratio-extension forced-2.5-RRR | the computeMirrorTP null → the RRR-as-target | THE NEXT_STEPS (the TP substrate fix) |
| SLOP-02 | the grounding hard-kill | the SHADOW_SHAPE_VIOLATION REJECT → the loop dies | THE SHADOW_REWIRE_SPEC (the warn, never the kill) |
| SLOP-03 | the wall-clock timeout | the 600s cap killed working generations | LANDED (the C4 stall detector) |
| SLOP-04 | the sequential LLM architecture | 24 sequential calls | LANDED (C1+C3) |
| SLOP-05 | the max_tokens starvation | 2048 → the empty response | LANDED (128000) |
| SLOP-06 | the shell-session key boundary | the env-only key read | LANDED (the secrets chain) |
| SLOP-07 | the parser's shape blindness | the string-only check | LANDED (string/array/reasoning) |
| SLOP-08 | the duplicate constant | the tsc error | FIXED |
| SLOP-09 | the wave spawn failure | the dispatcher didn't land | the lesson: the task tool is the ONLY spawn path |
| SLOP-10 | the wrong-measure "no regression" | the degenerate baseline | the lesson: measure the golden + the RRR authenticity |
| SLOP-11 | the golden hits misrepresented | the caveat omitted | the lesson: the convergence table per emission |

---

## THE SLOP DETAILS (the full record — the exact code + the laws violated + the fixes)

### SLOP-01 — THE RATIO-EXTENSION FORCED-2.5-RRR FALLBACK (the D37 class — the RRR-as-target)

**The exact slop code (reasoning-chain.ts:780-790):**

```ts
  const tpRes = computeMirrorTP(entry, sl, anchorZone, direction, input.model.ladder, input.pip, { passThroughWeakWalls: true });
  if (tpRes) {
    tp = tpRes.tp;
    tpMethod = 'mirror-law14-walk';
    tpRungId = tpRes.rungId;
  } else if (isRewardSide(fp.chosenTarget, entry, direction)) {
    tp = fp.chosenTarget;
    tpMethod = 'continuation-target (KCE)';
  } else {
    tp = direction === 'LONG' ? entry + RRR_GATE * risk : entry - RRR_GATE * risk;
    tpMethod = 'ratio-extension (RRR gate)';   // ← THE SLOP: the TP computed to hit RRR 2.5 EXACTLY
  }
```

**The measured evidence:** ALL 4 EU/GU emissions show RRR 2.50 EXACTLY (the EU SHORT, the EU LONG, the GU SHORT, the GU LONG) — the fabricated number, not a structural one. The DXY lane's structural TPs (4.46 / 7.16) prove the source lane's ladder resolves the walls while the EU/GU mirrors' computeMirrorTP returns null.

**The operator's laws violated (verbatim):**
- "RRR is a CONSEQUENCE, not a target. Let zone structure determine RR"
- "anything that is 2.5 RR or above is valid as long as it is high probability. However the TARGET is always 4R+ i dont want the machine optimizing everything for low R just to pass the filter and leaving money on the table"
- "NOT A SINGLE ONE OF MY TRADES IS BELOW RRR = 3.5."

**The fix (the NEXT_STEPS STEP 3):** the E2-projected opposing zone's full-model resolution (the ZR-3.3 — the OB-id-vs-LMV-candidates mismatch fixed) — the TP at the structurally-equivalent opposing BoM wall (the ZR-3.4 — the E1-pressure wall classification, the shallow LQZ shelves pass-through). The ratio-extension REMOVED as a TP source.

### SLOP-02 — THE SHADOW GROUNDING HARD-KILL (the loop dies on a non-number)

**The exact slop code (shadow-agent.ts:447/535):**

```ts
        client.lastError = 'SHADOW_SHAPE_VIOLATION: forwardPosition must be a number';   // ← the hard REJECT
        return errResult(client.lastError);                                                // ← the chain treats the shadow as FAILED
        // ... the deterministic fallback carries — the LLM path dies
```

**The mechanism:** the parse failure on the streaming output → the non-numbers → the grounding REJECT (a hard stop, not a warn) → the chain records the SHADOW_DEGRADE → the deterministic fallback → llm 0 on every pair.

**The operator's directive (verbatim):**
> "SHADOW_SHAPE_VIOLATION: forwardPosition must be a number / entry/sl/tp must be numbers - these cannot hard kill the fucking agent are you stupid these need to be a warn that continues the agent loop."

**The fix (the SHADOW_REWIRE_SPEC STEP 1):** the grounding violations become a WARN — the response recorded as a refinement warning with the context (the check, the token, the sourceRef, the value, the proposed correction), logged to the failure store (the WARN type), the LOOP CONTINUES with the partial/attempted values as the refinement inputs. The hard-throw ONLY after 3 failed refinements.

### SLOP-03 — THE WALL-CLOCK TIMEOUT (killed working generations)

**The exact slop code (the pre-C4 callModel):**

```ts
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);   // ← the wall-clock cap (600s)
```

**The mechanism:** the 600s cap on the whole fetch — ANY generation exceeding 600s was killed mid-reasoning → SHADOW_TIMEOUT → the deterministic fallback. The 30-min hang was 3 aborted calls × 600s each. The model legitimately takes 1-3+ min on the heavy prompts at effort:max — the cap killed working generations.

**The operator's directive (verbatim):**
> "should be a STALL DETECTOR for the actual shadow backend not a dumb fucking wall clock on the entire tool itself"

**The fix (LANDED — the C4):** the SSE-stream idle detector — the per-chunk reset, the abort ONLY on the 90s no-token window. A working generation never dies.

### SLOP-04 — THE SEQUENTIAL LLM ARCHITECTURE (the 30-min hang)

**The mechanism:** 3 pairs × 2 lanes × 4 shadow hooks = up to 24 SEQUENTIAL LLM calls at effort:max — 30-50 min wall time. The operator's topology law: the micro level parallel, the macro level the ONLY sequential step.

**The operator's directive (verbatim):**
> "3 pairs - each pair can be done async. N parallel pipelines can run per pair. Once they are all done the DXY cascade can be layered on top as a macro signal to refine the other pairs against. That is the sequential macro level step 2, but each micro level pair specific pipeline can run in parallel"

**The fix (LANDED — C1+C3):** the token 8/10 Promise.all + the pairs/lanes parallel — the wall time = the slowest pair.

### SLOP-05 — THE MAX_TOKENS STARVATION (the EMPTY_RESPONSE era)

**The slop (historical):** `max_tokens: 2048` — a reasoning model at effort:max spends the ENTIRE budget on reasoning (finish_reason: length, reasoning_tokens 2048) → content empty → SHADOW_EMPTY_RESPONSE on EVERY call → the LIVE LLM never fired.

**The probe evidence:** 2048 → content length 0 + finish_reason length; 8192 → content 186 chars at 41s; 128000 → content 259 chars at 61.9s (the model self-terminates at the natural end).

**The fix (LANDED):** max_tokens 128000 (the god-mode budget — the ceiling, never the target).

### SLOP-06 — THE SHELL-SESSION KEY BOUNDARY (the key lost mid-run)

**The mechanism:** the OPENCODE_API_KEY exported in one bash call was invisible in the next — the shadow agent reported SHADOW_UNAVAILABLE mid-run. The env-only key read was fragile.

**The fix (LANDED):** the secrets chain (resolveShadowApiKey — env → the .env files → the embedded base64) — the W3 alignment.

### SLOP-07 — THE CONTENT PARSER'S SHAPE BLINDNESS

**The slop (historical):** the parser accepted only string content — the endpoint returns content as a string (when the budget allows) OR the array-of-parts form OR the reasoning_content-only form. The string-only check rejected the valid shapes → SHADOW_EMPTY_RESPONSE.

**The fix (LANDED):** the parser accepts string | array-of-parts | reasoning_content. NOTE: the STREAMING path (the W2 rewrite) still has the parse failure — the SLOP-02.

### SLOP-08 — THE DUPLICATE IDLE_WINDOW_MS DECLARATION (the tsc error)

**The mechanism:** the IDLE_WINDOW_MS constant declared TWICE (the constants section + the callModel section) — the tsc duplicate-identifier error. Fixed by removing the local copy (the canonical constant kept).

### SLOP-09 — THE WAVE-DISPATCHER SPAWN FAILURE (the agents never launched)

**The mechanism:** the trident-wave-dispatch tool reported "dispatched: ready" for 4 agents — NO agents actually ran (the trident-tmp absent, the wave-status "unknown_wave", the golden gate never created). The W4 + W5 agents that DID run were the MANUAL task-tool dispatches. The operator: "THERE ARE NO FUCKING DISPATCHED AGENTS WITHOUT CALLING THE TASK TOOL."

**The lesson:** the task tool is the ONLY spawn path — verify the spawn landed (the sessionId present + the wave-status tracking) BEFORE waiting.

### SLOP-10 — THE "NO REGRESSION" CLAIMS MEASURING THE WRONG THING

**The mechanism:** the wave audits' "G7 no regression" checks measured the emissions' stability — but the emissions are DEGENERATE (the EU/GU TPs forced to 2.5 RRR). "No regression" on a degenerate baseline is meaningless.

**The lesson:** the acceptance must measure the GOLDEN convergence + the RRR authenticity — never the stability of a degenerate emission.

### SLOP-11 — THE GOLDEN HITS MISREPRESENTED

**The mechanism:** the 6 chain emissions presented as "the trades generated" without the critical caveat — ONLY 1/5 converges to the operator's golden Monday trades; the other 4 are the machine's CURRENT BEST GUESS (misses at Δ8.8-19.1p). The operator: "the only trades valid for Monday are the golden trades what are these?"

**The lesson:** every emission report must carry the golden-convergence table (the delta per trade) — the emissions are NOT valid trades until they converge.

---

## THE FAILURE LOG REGISTER (the summary)

| ID | The slop | The mechanism | The status |
|---|---|---|---|
| SLOP-01 | the ratio-extension forced-2.5-RRR | the computeMirrorTP null → the RRR-as-target | THE NEXT_STEPS STEP 3 (the TP substrate fix) |
| SLOP-02 | the grounding hard-kill | the SHADOW_SHAPE_VIOLATION REJECT → the loop dies | THE SHADOW_REWIRE_SPEC STEP 1 (the warn, never the kill) |
| SLOP-03 | the wall-clock timeout | the 600s cap killed working generations | LANDED (the C4 stall detector) |
| SLOP-04 | the sequential LLM architecture | 24 sequential calls | LANDED (C1+C3) |
| SLOP-05 | the max_tokens starvation | 2048 → the empty response | LANDED (128000) |
| SLOP-06 | the shell-session key boundary | the env-only key read | LANDED (the secrets chain) |
| SLOP-07 | the parser's shape blindness | the string-only check | LANDED (string/array/reasoning) |
| SLOP-08 | the duplicate constant | the tsc error | FIXED |
| SLOP-09 | the wave spawn failure | the dispatcher didn't land | the lesson: the task tool is the ONLY spawn path |
| SLOP-10 | the wrong-measure "no regression" | the degenerate baseline | the lesson: measure the golden + the RRR authenticity |
| SLOP-11 | the golden hits misrepresented | the caveat omitted | the lesson: the convergence table per emission |

---

## THE HISTORICAL DERAILMENTS (the era's failure record — the fresh session's anti-pattern canon)

### The v4.2 derailment (2026-07-18 — the template for all later derailments)

The agent never read ENGINE3_FUNDAMENTAL_LAWS_V4.md and committed 8 doctrine violations in one session (CHANGELOG.md:648-665):
1. Changed ZFP threshold 45→60 (broke all shape transitions)
2. Changed pair names 'EUR/USD'→'EURUSD' (broke zone matching, pair lookup, cascade mapping)
3. Flattened RRR to flat 1.0 (broke category-specific entry validity)
4. Added cascade filter B4 (amplified direction errors)
5. Rewrote charts to 2-phase agent-driven (broke the VLM pipeline)
6. Changed TP to ceiling (broke exit strategy)
7. Added ZFP evolution (broke the deterministic transition matrix)
8. Rewrote shape chain (broke the energy conservation model)

**The pattern:** each "small improvement" to one component broke the circular dependencies that make the system self-reinforcing.

### The post-wipe derailment (2026-07-31 — the session that triggered Bible 4.5)

The agent repeated the v4.2 pattern (FAILURE_LOG_v4.5.2_E2_CASCADE.md:16-18, 66-82):
1. RRR floor 1.5→1.0 for FX (+20 garbage trades; win rate 82.4%→67.4%)
2. onSide 150-pip tolerance (admitted zones from different price regimes)
3. VIOLATED zones at group −3 (no precision gain, admitted garbage)
4. Nearest-to-spot ranking (win rate 67.4%→63%)
5. **The "30-pip coverage" delusion: declared "22/22 100%" — at ±3 pip tolerance it was 2/22 = 9%**
6. §8.1 LMV union unconditional (BROKE the cascade entirely — 0 EU/GU trades)
7. Stopping after every change (violating the loop directive)

**The verdict (verbatim):**
> "DERAILMENT. The 30-pip 'coverage' is meaningless slop. The pipeline produces MORE trades but at WRONG LEVELS. Quality regressed. Win rate dropped from 82.4% to 67.4%. The '+47.65R' is inflated by volume, not precision."

### The D37 — the GU RRR collapse (the refinement-engine derailment)

**The symptom:** the GU lane's mirrors RRR-killed (the D37: "HARD-REJECT after 3 attempts — [RRR 1.9 < 3.0 — E 1.33965, SL 13.1p, TP 24.5p (nearest-first)]").

**The root cause:** the TP cap-walk's "fresh wall" predicate (zfp≤20) fires on EVERY LQZ rung — the candle-count zfp ladder (the LQZ canon: 2-4 candles → 20) — so the walk stops at the nearest shelf (1.33720, 24.5p) instead of the structurally-equivalent BoM wall (1.33360, 61.8p — RRR 4.7). The wall classification is the candle mechanics, NOT the E1 pressure (the operator's order: E1 first, E2 second, candle mechanics third). **THIS IS THE D37 CLASS — THE SAME CLASS AS THE SLOP-01 RATIO-EXTENSION.**

### The D50 — the cascade's side-inversion (the direction-appropriate consumption)

**The operator (verbatim):** "supply --> demand and demand --> supply dxy supply --> eu demand and vice versa this is clearly not fucking inverting correctly"

**The root cause:** the cascade's inverse (the ZONE-SIDE inversion — DXY supply → EU demand!) was structurally ignored at THREE stacked layers, all from the single-designation era:
1. The anchor exact-match searched the keyZoneId (the PRIMARY — the SHORT's supply!) for both directions — the LONG mirrors anchored the SUPPLY (the EU Mon LONG at Δ49.8p + NARRATIVE_SUPPRESSED by the §7.2 counter-structure gate!)
2. The entry resolution picked the deep rung instead of the demand's near edge
3. THE UNLOCK — the e2Designated gate (whether the anchor IS the E2-designated zone!) also compared the keyZoneId — so every direction-appropriate anchor fell to the defendedEdge fallback — the entire fix was BYPASSED

**The fix (LANDED — the v4.5.3 wave):** the LONG mirrors consume the demandZoneId at every layer (the anchor match + the e2Designated gate) + the entry = the demand's near edge — the golden 10 → 12/21.

### The ZR-7 derailments (the E2 zone-selection disconnect — 2026-08-04)

**The honest one-line:** "The E2's zone designation is a zfp-first (strength-first) independent per-day pick — the operator's zone selection is the CHAIN PROGRESSION (each entry = the prior TP) + the day-local formations. The machine ignores the chain and the day-local structure."

**The 11 verified derailments:**
1. The E2 pressure-blindness — the ENTIRE pressure state reduces to the zfp scalar at the E2 boundary (shape-brain.ts: 40 `.zfp` reads, 0 `.pressure` reads)
2. The 9-pillar proxy fabrication — the P3 Gamma-histogram, the P4 HP-trend proxy, the P7 zone-clustering arena — PURGED (the operator's law: "NO FABRICATED DATA ANYWHERE... BLACK AND WHITE")
3. The BoM quality gates in 1 of 3 lanes (the bw≥3.0/bf≥0.65 only in the OBCV)
4. The OBCV 0-BoM on the golden week
5. The IP zones' 'MoM' mislabel + no pressure
6. The DEFAULT_ZFP=50 residue
7. The diag/report divergence — the gates measure a DIFFERENT E1 than the report ships
8. The LQZ×IP merge unreachable
9. The designation reuse — the EU Mon/Tue identical designations (the chain progression absent)
10. The frozen day band — the same dayOpenSpot ×5
11. The degenerate chain — the EU SS→PBS×3→WL, the GU PBS×4→SS

---

## THE COMPLETE SESSION CHRONOLOGY (2026-08-07 — the full failure sequence)

| Time | The event | The failure |
|---|---|---|
| 03:38 | the probe-shadow-hang.ts created (the endpoint investigation) | — |
| 03:35 | the probe-shadow-latency.ts created (the latency curve) | — |
| 12:25 | the W1 parallel edits landed (the C1/C3 Promise.all) | — |
| 12:28 | the W2 SSE stall detector landed | — |
| 12:45 | the wave dispatcher's batch spawned | **SLOP-09 — the spawn did NOT land (the agents never launched)** |
| 13:01 | the W4 + W5 manual task-tool dispatches | — |
| 13:19 | the W5 phantom-BoM exemption landed (the wave audit: CORRECT) | — |
| 21:25 | the handover package v1 (590 lines) | **the operator: "STOP WRITING NAPKIN GARBAGE"** |
| 21:40+ | the handover package v2 expansion (the chunked protocol) | — |

**The W4 agent's honest findings (the residuals):**
1. The wall time 9m14s > the 5-min G9 gate — the shadow calls at ~106s each ALL failed the grounding contract → llm 0 → the deterministic fallback carried.
2. The GU LONG entry Δ8.8p — the direction fixed, the exact entry alignment = the W6 golden gate's job.

---

## THE FAILURE LOG REGISTER (the summary — all 11 + the historical)

| ID | The slop | The mechanism | The status |
|---|---|---|---|
| SLOP-01 | the ratio-extension forced-2.5-RRR | the computeMirrorTP null → the RRR-as-target (the D37 class) | THE NEXT_STEPS STEP 3 (the TP substrate fix) |
| SLOP-02 | the grounding hard-kill | the SHADOW_SHAPE_VIOLATION REJECT → the loop dies | THE SHADOW_REWIRE_SPEC STEP 1 (the warn, never the kill) |
| SLOP-03 | the wall-clock timeout | the 600s cap killed working generations | LANDED (the C4 stall detector) |
| SLOP-04 | the sequential LLM architecture | 24 sequential calls | LANDED (C1+C3) |
| SLOP-05 | the max_tokens starvation | 2048 → the empty response | LANDED (128000) |
| SLOP-06 | the shell-session key boundary | the env-only key read | LANDED (the secrets chain) |
| SLOP-07 | the parser's shape blindness | the string-only check | LANDED (string/array/reasoning) |
| SLOP-08 | the duplicate constant | the tsc error | FIXED |
| SLOP-09 | the wave spawn failure | the dispatcher didn't land | the lesson: the task tool is the ONLY spawn path |
| SLOP-10 | the wrong-measure "no regression" | the degenerate baseline | the lesson: measure the golden + the RRR authenticity |
| SLOP-11 | the golden hits misrepresented | the caveat omitted | the lesson: the convergence table per emission |
| HIST-01 | the v4.2 derailment | 8 doctrine violations in one session | the canon (Bible 4.5 §1.3) |
| HIST-02 | the post-wipe derailment | the 30-pip delusion (2/22 at ±3p) | the canon (Bible 4.5 §1.16) |
| HIST-03 | the D37 GU RRR collapse | the candle-count wall classification | THE SAME CLASS as SLOP-01 |
| HIST-04 | the D50 side-inversion | 3 stacked keyZoneId-only checks | LANDED (the v4.5.3 fix) |
| HIST-05 | the ZR-7 derailments | the E2 pressure-blindness + the fabrication | the canon (the ZR-7 spec) |

---

## THE SLOP CODE APPENDIX (the exact code of each slop — the do-not-repeat reference)

### The ratio-extension code (SLOP-01 — the full context)

```ts
// reasoning-chain.ts:780-790 — the THREE-WAY TP resolution
  const tpRes = computeMirrorTP(entry, sl, anchorZone, direction, input.model.ladder, input.pip, { passThroughWeakWalls: true });
  if (tpRes) {
    tp = tpRes.tp;
    tpMethod = 'mirror-law14-walk';
    tpRungId = tpRes.rungId;
  } else if (isRewardSide(fp.chosenTarget, entry, direction)) {
    tp = fp.chosenTarget;
    tpMethod = 'continuation-target (KCE)';
  } else {
    tp = direction === 'LONG' ? entry + RRR_GATE * risk : entry - RRR_GATE * risk;
    tpMethod = 'ratio-extension (RRR gate)';   // ← THE SLOP: the TP computed to hit RRR 2.5 EXACTLY
  }
// RRR_GATE = 2.5 (reasoning-chain.ts:48)
// THE MEASURED: ALL 4 EU/GU emissions at RRR 2.50 exactly (the forced fallback);
// the DXY lane at 4.46/7.16 (the structural TP resolved).
// THE LAW VIOLATED: "RRR is a CONSEQUENCE, not a target" + "the TARGET is always 4R+"
// + "NOT A SINGLE ONE OF MY TRADES IS BELOW RRR = 3.5."
// THE FIX: the E2-projected opposing zone's full-model resolution (the ZR-3.3) +
// the ratio-extension REMOVED as a TP source (the NEXT_STEPS STEP 3).
```

### The grounding hard-kill code (SLOP-02 — the full context)

```ts
// shadow-agent.ts:447/535 — the grounding REJECTS
        client.lastError = 'SHADOW_SHAPE_VIOLATION: forwardPosition must be a number';
        return errResult(client.lastError);   // ← THE HARD-KILL: the chain treats the shadow as FAILED

        client.lastError = 'SHADOW_SHAPE_VIOLATION: entry/sl/tp must be numbers';
        return errResult(client.lastError);   // ← THE HARD-KILL

// the chain's disposition (reasoning-chain.ts:728):
  if (sr) recordShadowDegrade(ctx, 'projectForward', sr.reason);
  return fp;   // the deterministic fallback — the LLM path dies

// THE OPERATOR'S DIRECTIVE: "these cannot hard kill the fucking agent are you stupid
// these need to be a warn that continues the agent loop."
// THE FIX: the grounding violations become a WARN (the refinement warning + the
// failure-store GROUNDING_WARN row) + the loop CONTINUES (the SHADOW_REWIRE_SPEC STEP 1).
```

### The wall-clock timeout code (SLOP-03 — the full context)

```ts
// the PRE-C4 callModel (the wall-clock cap):
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);   // ← 600s wall-clock cap
// THE MECHANISM: any generation exceeding 600s killed mid-reasoning → SHADOW_TIMEOUT →
// the deterministic fallback. The 30-min hang = 3 aborted calls × 600s.
// THE OPERATOR'S DIRECTIVE: "should be a STALL DETECTOR for the actual shadow backend
// not a dumb fucking wall clock on the entire tool itself"
// THE FIX (LANDED — the C4): the SSE-stream idle detector — the per-chunk reset,
// the abort ONLY on the 90s no-token window.
```

### The sequential architecture code (SLOP-04 — the full context)

```ts
// the PRE-C1 lane loop (the sequential awaits):
  const fp = await token8_forwardPosition(ctx);           // LLM call #1 (await)
  const chainedEntry = token9_chaining(priorTp);          // sync
  const anchorsOut = await token10_anchorConstruction(ctx, fp, chainedEntry);  // LLM call #2 (await)
// THE ARITHMETIC: 3 pairs × 2 lanes × 4 shadow hooks = up to 24 sequential calls.
// THE FIX (LANDED — C1): token9 sync first, then Promise.all([token8, token10]).
// THE OPERATOR'S TOPOLOGY LAW: "3 pairs - each pair can be done async... each micro
// level pair specific pipeline can run in parallel"
```

### The max_tokens starvation code (SLOP-05 — the full context)

```ts
// the PRE-FIX callModel body:
        max_tokens: 2048,   // ← THE STARVATION: the reasoning model spends ALL of it on reasoning
// THE PROBE EVIDENCE: 2048 → content length 0 + finish_reason length + reasoning_tokens 2048;
// 8192 → content 186 chars at 41s; 128000 → content 259 chars at 61.9s (the model self-terminates).
// THE FIX (LANDED): max_tokens 128000 (the ceiling, never the target).
```

---

## THE OPERATOR'S LAWS REGISTER (the doctrine the slop violated — the complete list)

1. THE RRR LAW: "RRR is a CONSEQUENCE, not a target. Let zone structure determine RR" + "anything that is 2.5 RR or above is valid as long as it is high probability. However the TARGET is always 4R+ i dont want the machine optimizing everything for low R just to pass the filter and leaving money on the table" + "NOT A SINGLE ONE OF MY TRADES IS BELOW RRR = 3.5."
2. THE STALL-DETECTOR LAW: "should be a STALL DETECTOR for the actual shadow backend not a dumb fucking wall clock on the entire tool itself"
3. THE GROUNDING-WARN LAW (this session): "SHADOW_SHAPE_VIOLATION... these cannot hard kill the fucking agent are you stupid these need to be a warn that continues the agent loop."
4. THE SHADOW-DEAD LAW (this session): "ok shadow agent dead you are fucking this up royally replace with the actual headed agent in opencode doing the reasoning/inference in session so we can see everything"
5. THE TOPOLOGY LAW: "3 pairs - each pair can be done async. N parallel pipelines can run per pair. Once they are all done the DXY cascade can be layered on top as a macro signal to refine the other pairs against. That is the sequential macro level step 2, but each micro level pair specific pipeline can run in parallel"
6. THE CASCADE LAW: "EACH PAIR RUNS ITS OWN NATIVE PAIR-ISOLATED E1/E2/E3. THEN DXY'S E2 + E3 OUTPUT CASCADES ON TOP OF THE EU/GU PAIR NATIVE E1 ANCHORS. IT DOES NOT OVERWRITE OR SUPERSEDE IT IS FUCKING COMPLIMENTARY."
7. THE MACRO-AUTHORITY LAW: "they ARE allowed to have their own mechanics but unified macro signal has authority"
8. THE MIRROR LAW: "Everything I found on this EU chart maps 1:1 to DXY EXACTLY simply in the inverse direction. All the zone elements are the same, shapes, trade setups, etc LITERALLY EVERYTHING IS THE SAME the only thing that changes are the actual price levels between the pairs."
9. THE ZONE-ELEMENT LAW: "we are matching ZONE ELEMENTS not fucking price levels. a BoM on EU that is 30 pips away could be 70 pips away on GU. It is still moving to the same E1 zone. That is the fucking point"
10. THE FORWARD-REASONING LAW: "THIS is the root cause of literally ALL fucked trades... the lack of forward looking reasoning and logic"
11. THE REASONING-TOKEN LAW: "My analysis in the golden doc for EU trades is literally EXACTLY what the reasoning tokens should look like as a baseline reference"
12. THE TOKEN-SET LAW: "1 candle = 1 token. 1 token by itself does not provide any meaningful data. A set of tokens in a structured dataset = relevant context (TTE shapes)"
13. THE CANDLE-GROUP LAW: "the group of relevant candles near a zone are the candles that actually touch the zone and the context/storyline of the candles BEFORE they touch the zone + what is going to happen after they touch (post reaction move)"
14. THE PHANTOM-BoM LAW: "a phantom BoM zone... a MoM-disguised BoM... functions as a BoM zone"
15. THE VIRGIN-DEATH-SCOPE LAW: "the 'virgin MoM zones = death' applies largely to 30m virgin MoM zones and 1H type 1 virgin MoMs" + "ALL 4H zones WILL have at least 1 reaction before mitigation"
16. THE TF-HIERARCHY LAW: "the 4H King (the E2 shape chain) · the 1H General (the E3 trade setups) · the 30m Captain (the per-trade context)" — HTF > LTF
17. THE ENFORCEMENT LAW: "a refine/retry is correct. not a hard throw... only hard throw SPECIFIC MICRO COMPONENTS after they have failed 3 refinements and then full data needs to be stored in an internal SQLite db... at the end of the pipeline all failure data needs to be synthesized and delivered with the final output + clear next steps"
18. THE TEMPORAL LAW: "TODAY IS WHATEVER DATE WE SET WHEN RUNNING THE PIPELINE. THERE IS NO FUCKING FORWARD LOOKING."
19. THE RECENCY LAW: "DO NOT ever use 1 week old candles to make decision on E1/E2/E3 mechanics to today's trades. EVER."
20. THE GOLDEN-ORACLE LAW: "make sure this is clearly commented and labelled in the codebase as TEMPORARY ARCHITECTURE... this should NOT BE CORE INFRA"
21. THE 3-PIP LAW: "the golden standard at 3 pips after EVERY change — not 30, not 10, THREE"
22. THE NO-FABRICATION LAW: "NO FABRICATED DATA ANYWHERE... BLACK AND WHITE."
23. THE SEMANTICS LAW: "the rendered artifacts are the candles/zones/OHLC data ~ first principles macro context is the pressure mechanics, shape chain, etc — you must see what GENERATED the rendered artifact"
24. THE E1→E2→E3 CONSTRAINT: "E3 is not permitted to override pre-existing E1/E2 data architecture nor is it allowed to jsut randomly fabricate its own rules and make shit up"
25. THE HONESTY STANDARD: "your stats are very embellished" (the v4.5.1 audit) — the TRUE state recorded, never the claimed state

---

## THE FAILURE LOG REGISTER (the summary — all 11 + the historical + the laws)

| ID | The slop | The mechanism | The status |
|---|---|---|---|
| SLOP-01 | the ratio-extension forced-2.5-RRR | the computeMirrorTP null → the RRR-as-target (the D37 class) | THE NEXT_STEPS STEP 3 |
| SLOP-02 | the grounding hard-kill | the SHADOW_SHAPE_VIOLATION REJECT → the loop dies | THE SHADOW_REWIRE_SPEC STEP 1 |
| SLOP-03 | the wall-clock timeout | the 600s cap killed working generations | LANDED (the C4 stall detector) |
| SLOP-04 | the sequential LLM architecture | 24 sequential calls | LANDED (C1+C3) |
| SLOP-05 | the max_tokens starvation | 2048 → the empty response | LANDED (128000) |
| SLOP-06 | the shell-session key boundary | the env-only key read | LANDED (the secrets chain) |
| SLOP-07 | the parser's shape blindness | the string-only check | LANDED (string/array/reasoning) |
| SLOP-08 | the duplicate constant | the tsc error | FIXED |
| SLOP-09 | the wave spawn failure | the dispatcher didn't land | the lesson: the task tool is the ONLY spawn path |
| SLOP-10 | the wrong-measure "no regression" | the degenerate baseline | the lesson: measure the golden + the RRR authenticity |
| SLOP-11 | the golden hits misrepresented | the caveat omitted | the lesson: the convergence table per emission |
| HIST-01 | the v4.2 derailment | 8 doctrine violations in one session | the canon (Bible 4.5 §1.3) |
| HIST-02 | the post-wipe derailment | the 30-pip delusion (2/22 at ±3p) | the canon (Bible 4.5 §1.16) |
| HIST-03 | the D37 GU RRR collapse | the candle-count wall classification | THE SAME CLASS as SLOP-01 |
| HIST-04 | the D50 side-inversion | 3 stacked keyZoneId-only checks | LANDED (the v4.5.3 fix) |
| HIST-05 | the ZR-7 derailments | the E2 pressure-blindness + the fabrication | the canon (the ZR-7 spec) |

*END OF THE FAILURE LOG — the honest record of the slop + the historical derailments + the laws register + the code appendix. The fresh session reads this BEFORE any work — the mistakes never repeated. The operator's honesty standard: the TRUE state recorded, never the claimed state. <!-- DOC-COMPLETE -->*

# WAVE AUDIT — WK2 per-day runner completion (orch audit of WK2Days desk, 2026-09-15)

**Base:** `6eacaa2` · **Branch:** omp-worker-1 · **Frozen:** MATCH · **Walls:** harness 46/0 · src 1195/0 · e1 398/0 · tsc clean · determinism ×2
**Write set:** specs/harness/real-week-runner.ts ONLY (258+/113-, 9 hunks). Comparator (diag + readOracleRows) **md5-identical to HEAD** — verdict logic untouched. No src edits. No commit by desk.

## Cell verdicts

| Cell | Verdict | Evidence |
|---|---|---|
| Day loop per machine contracts | CORRECT | SHAPE carries ("the shape moves on DAY_OPEN only" :132-133) — Tue SS→BS, Wed BS→R stepped on the carried record; DESIGNATION fresh per day (freshDesignation(day,key) :41-45); ZONE-PRESSURE records carry (event-sourced, :34-38); CASCADE freshCascade PER DAY (IDLE→GU_DONE per day); KERNEL per-pair-per-day with namespaced causationIds — every choice quoted file:line |
| Thu/Fri lawful emptiness | CORRECT (STOP honored) | R→BS and BS→WL have NO DAY_OPEN edge in the B.W3.1 dayTable (:97-128; golden test pins both UNCHANGED) → lanes EMPTY, never forced; cascade passes skipped honestly |
| Zones carry (no per-day re-detection) | CORRECT refusal | No machine contract takes a day window (helpers temporal gate, designation guard reads snapshot+projectedOpen only); per-day session slicing "would be unquotable — refused" |
| Score vs WK1 | **IDENTICAL: 1 HIT / 3 NEAR / 13 MISS — all 17 deltas pip-for-pip** | Day-tagged setups reuse Monday's zone geometry → same price points; Monday rows traced to Monday projections (all 5 quoted); determinism ×2 true |
| No tuning | PROVEN | Zero oracle-as-input; comparator md5-identical; Thu/Fri left empty; no thresholds touched; no test weakened (none asserted Monday-only) |

## The decomposition of doctrine question #3 (now complete)

The week-frozen accuracy gap decomposes into TWO precisely-owned findings — neither is a harness bug:

1. **e2 dayTable vs B.W3.5 (spec contradiction — operator):** the B.W3.1 day-transition table lacks R→BS and BS→WL day-open edges, so the mandated 5-day sequence [SS,BS,R,BS,WL] — which the fixture's own note quotes as "the injectShapeSequence law (spec B.W3.5)" — is unwalkable past Wed. Internal spec contradiction: B.W3.5 mandates the walk, B.W3.1 forbids it.
2. **No per-day zone/session contract (R17 architecture gap — operator):** "spot price is practically irrelevant... day native" needs day-windowed zone detection; no e1/e2 machine takes a day window. The v4.5.3 regime's per-day levels came from day-native chains this architecture has no contract for.

## Ship-bar effect

SC-25's V5-chain leg stands at **1/17** with the causal decomposition COMPLETE: harness gap closed (loop per contracts), remainder owned by (1) + (2) above, plus the unchanged Monday questions (#1 EU slot, #2 diverged-lane chaining). All four are quoted-law collisions / architecture decisions — operator precedence required; every fix path is pre-scoped in its audit.

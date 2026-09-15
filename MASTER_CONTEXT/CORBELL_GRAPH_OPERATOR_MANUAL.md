# CORBELL GRAPH OPERATOR MANUAL
## The Plutus Project Brain — How the Knowledge Graph Transforms the Build

**Version:** 1.0 · **Date:** 2026-08-21 · **Status:** OPERATIONAL — the DB is live and verified
**Audience:** the operator. Purpose: a complete mental model of what changed architecturally,
how the machinery works internally, and how the engineering process is different from here on.
**The one-line summary:** the project's intelligence moved from "model weights + your brain +
re-fed markdown" to **a queryable database that remembers the code's structure, the project's
law, and every violation — permanently, on disk, independent of any model session.**

---

# PART 1 — THE OLD ARCHITECTURE (what you are escaping)

## 1.1 The world of the last 1+ months

```
┌─────────────────────────────────────────────────────────────────────┐
│ EVERY SESSION, THE SAME TAX:                                        │
│                                                                     │
│   Fresh/compacted context window                                    │
│        │                                                            │
│        ▼                                                            │
│   Re-feed 500-700K tokens:                                          │
│     POST-COMPACTION_PROMPT.md (242L)                                │
│     COMPACTION_SURVIVAL.md (227L)                                   │
│     DEBUG_LOG.md (~1,275L)      ← history as prose                  │
│     EVIDENCE_STATE.md (409L)                                        │
│     DECISION_CHAIN.md (367L)    ← rulings as prose                  │
│     NEXT_STEPS.md (496L)                                            │
│     Bible excerpts, spec excerpts, doctrine quotes...               │
│        │                                                            │
│        ▼                                                            │
│   HALF THE WINDOW IS HISTORY. The remaining half must:              │
│     - hold the doctrine in "memory" (prose the model must OBEY      │
│       from recall, not measurement)                                 │
│     - navigate the codebase by grep + read (syntax-only, no map)    │
│     - re-derive "who calls what / what feeds what" every time       │
│                                                                     │
│   FAILURE MODE: forget or misread ONE paragraph mid-build →         │
│   derailment → the theatrical 5/5 gold standard → days lost.        │
└─────────────────────────────────────────────────────────────────────┘
```

## 1.2 The structural problems, named

| # | Problem | The cost you paid |
|---|---|---|
| P1 | **Context = the only memory.** Everything the agent knew lived in the window; compaction destroyed it; refeeding was manual | 500-700K tokens/session; 1-2 steps per session |
| P2 | **Doctrine = prose to remember**, not law to measure | The model could forget "NOTHING PRICE ANCHORED EVER" mid-edit — nothing MECHANICALLY stopped it |
| P3 | **Navigation = grep + read**, syntax-only | "Where does EU get its shape chain?" = probe archaeology (probe-c2-*.ts, days) |
| P4 | **Validation = harnesses the code writes about itself** | golden-gate-harness.ts:116 literally printed "every projection is price-anchored" and returned pass:true — the validator blessed the violation |
| P5 | **History = append-only markdown**, readable but not queryable | "How many times has this class bitten us?" = manual doc archaeology |

---

# PART 2 — THE NEW ARCHITECTURE (the project brain)

## 2.1 The one diagram

```
                    ┌──────────────────────────────────┐
                    │   PLUTUS WORKSPACE (read-only)   │
                    │   src/** · report-v452.ts        │
                    └────────┬─────────────┬───────────┘
                             │             │
              PATH A: CODE   │             │   PATH B: DOCTRINE
              (corbell CLI)  │             │   (lexicon compiler)
                             ▼             ▼
        ┌────────────────────────┐  ┌────────────────────────────┐
        │ tree-sitter parses     │  │ 32 Tier-1 doctrine docs    │
        │ every .ts → methods,   │  │ → line-scanners extract    │
        │ functions, classes,    │  │   blockquotes/quotes/rules │
        │ call edges             │  │ → keyword vote + DECLARED  │
        │                        │  │   override → severity      │
        │ + enrichment: each     │  │ → template selection       │
        │ node's source re-read  │  │ → bindings merge           │
        │ for numeric literals   │  │ → content-addressed ids    │
        └───────────┬────────────┘  └───────────┬────────────────┘
                    │                           │
                    ▼                           ▼
        ╔════════════════════════════════════════════════════╗
        ║  SHARED.DB  <Plutus>/.trident/knowledge-graph/     ║
        ║                                                    ║
        ║  graph_nodes (1,940)   graph_edges (3,647)         ║
        ║  rule_cards (2,837)    compiled_predicates (2,837) ║
        ║  findings (per-run ledger)   events (HUNT/BUILD/   ║
        ║  AUDIT chain)   implementations  conformance       ║
        ║  calibrations  audits                              ║
        ╚════════════╦═══════════════════╦═══════════════════╝
                     │                   │
          ┌──────────▼───────┐  ┌───────▼──────────────┐
          │ QUERY VERBS      │  │ LOGIC-LSP            │
          │ who-calls·chain· │  │ [LOGIC-LSP] blocks   │
          │ violations·      │  │ ride EVERY file read/│
          │ consistency·     │  │ edit until fixed &   │
          │ must-implement·  │  │ audited (conformance-│
          │ semantic-search  │  │ Zero clears them)    │
          └──────────────────┘  └──────────────────────┘
```

## 2.2 What each table IS (the mental model)

| Table | Think of it as | Written by | Changes when |
|---|---|---|---|
| `graph_nodes` / `graph_edges` | **the MAP** — every method/function/class and every call edge in src/ | corbell tree-sitter via the adapter | code changes + rebuild (10s, per-run snapshot) |
| `rule_cards` | **the LAW LIBRARY** — 2,837 verbatim doctrine quotes with file:line anchors | lexicon extractor over the corpus | corpus docs edited + recompile |
| `compiled_predicates` | **the ENFORCEMENT BATTERY** — each card fused with bindings into a runnable check | compiler (cards × templates × profile.bindings) | same as above (hash-cached) |
| `findings` | **the VIOLATION LEDGER** — every measured breach, run-scoped, evidence = the verbatim quote | diagnostics engine per hunt | every hunt |
| `events` | **the HEARTBEAT** — HUNT_DONE / BUILD_DONE / AUDIT_DONE chain | harness + auditor | every lifecycle step |
| `implementations` / `conformance_verdicts` | **the FIX LEDGER** — before_sha→after_sha + CONFORMANT/VIOLATED/PARTIAL verdicts | build agent + auditor | every fix cycle |
| `calibrations` | **the battery's own test results** — did each predicate fire on a known violation and stay silent on the golden state? | calibration gate | curation passes |

**The iron rule: THE DB IS THE TRUTH. Reports are renderings. Prose docs are now audit trail,
not load-bearing context.**

---

# PART 3 — PATH A DEEP DIVE: HOW CODE BECOMES A GRAPH

## 3.1 The pipeline (all verified live this session)

```
profile.yaml (graph.scope/services)
     │
     ▼
CorbellAdapter.build()
     ├─ 1. writes/validates corbell-data/workspace.yaml   ← THE SCOPING FILE
     │     services pinned to ../src (+ symlink dir for    ⚠ THE CHECKPOINTS
     │     root-level report-v452.ts)                       DISASTER LIVES HERE:
     ├─ 2. `corbell graph build --methods`                 unscoped repo:".." parsed
     │     tree-sitter TS grammar                          Checkpoints/ source-copies
     │     ~10s for 171 files                              → 112K poison edges.
     │                                                     Scoped → 10 SECONDS.
     ├─ 3. reads raw store (corbell-data/.corbell/
     │        workspace.db): nodes carry data JSON
     │     ├ ENRICHMENT: re-reads each file, extracts numeric literals
     │     │   → data.comparator = max literal (this is what makes
     │     │     "gateG8.comparator = 101.14 violates gt 1.0" MEASURABLE)
     │     ├ NAME RESOLUTION: corbell stores 'method_name' not 'name';
     │     │   walks name→method_name→function_name→class_name so
     │     │   symbol-scoped checks match bare names ("gateG8")
     │     └ DANGLING-EDGE FILTER: drops edges whose endpoints weren't
     │         materialized (FK safety)
     └─ 4. writeGraph into shared.db — PER-RUN SNAPSHOT
           (DELETE all edges+nodes, insert fresh — never append;
            the ledger tables are append-only, the map is not)
     └─ 5. mirrorToMasterContext → MASTER_CONTEXT/knowledge-graph/graph.db
           (awareness copy for any agent; .trident/…/shared.db is truth)
```

## 3.2 Coverage verification (your question, answered with numbers)

```
171 .ts files on disk under src/
161 indexed (have extracted nodes)
 10 zero-node files = PURE TYPE/PROMPT FILES — nothing extractable:
    types.ts · mdve/types.ts · engine3/types.ts · tvi/types.ts
    tvi/vkg/nodes.ts · semantic-firewall/types.ts · mdve/lexicons/index.ts
    pipeline/{tools,manual-step-output-schemas,types,vlm-prompts}.ts
+1 root file via symlink service: report-v452.ts (the wiring orchestrator)
Checkpoints contamination: ZERO (verified by distinct file_path scan)
```

## 3.3 The call-edge boundary (the corrected finding)

**Cross-file call linking WORKS within a service** — 961 cross-file edges proven:
`4h-sd-lobe::construct4HZones → lqz-lobe::computeSdFresh`,
`9-pillar-lobe::computeP1 → shapes-tool::aggregateToDaily`, etc.

**It does NOT link across SERVICES.** My two-service scoping workaround created a wall
between `plutus-root-pipeline/report-v452.ts` and `plutus-src/src` — so exactly the three
stage-entry functions (`buildShapeBrain/buildReasoningChain` callers) lost inbound edges.
Consequence: the stage-wiring findings in the first hunt were ARTIFACTS, not real breaks —
E1→E2→E3 IS wired in reality (report-v452.ts:436→1063). Fix queued: single-service coverage
or import-aware native-ast comparison.

---

# PART 4 — PATH B DEEP DIVE: HOW DOCTRINE BECOMES MACHINERY

## 4.1 From your words to a running check

```
YOUR DOC LINE (Tier-1 corpus):
  > **Law 10 floor:** never tighter than 0.5×ATR(14) on 1H.
  > classification: DOMAIN        ← declared override BEATS keyword vote
  > severity: CRIT                ← NEVER/MUST words auto-rate; declared wins
        │
        ▼ EXTRACTOR (rule-card.ts) — pure function of the bytes, deterministic
  RuleCard { verbatimQuote, anchor: "doc.md:56", classification, severity,
             proposed }          ← soft voice ("should/perhaps") → proposed=1
        │                          = YOUR curation queue, never silent enforcement
        ▼ TEMPLATE SELECTOR
  DOMAIN → domain.numeric-threshold
  PROCESS → process.gates-measure-outputs-not-logic
  ARCH → contract.must-implement
  LOGIC → provenance.traces-to-source
        │
        ▼ COMPILER fuses card + profile.bindings
  CompiledPredicate {
    id: "domain.numeric-threshold:dbc36ab27d57",   ← sha256(anchor|bindings)[:12]
    check(ctx): sweeps graph nodes where name === bound symbol,
                reads data.comparator, compares vs threshold,
                emits finding WITH the verbatim quote as evidence }
        │
        ▼ persisted to compiled_predicates — hash-cached by battery fingerprint
          (one byte of corpus change → new fingerprint → automatic recompile)
```

## 4.2 Per-card duplication BY DESIGN (your question)

Every DOMAIN-classified quote becomes its OWN predicate, all sharing the ONE binding you
armed (`gateG8.comparator > 1.0`). When gateG8 violates, each quote fires its own row about
the SAME code site. First hunt: 205K rows ≈ 1,063 distinct domain rules × 2 sites + artifacts.

**This is not a bug — it is the design's honesty:** every law that forbids the violation
reports it, with its own words attached. But you READ it differently:

```
DON'T read row counts. Read DISTINCT classes:
    SELECT DISTINCT template, file, line FROM findings WHERE verdict='VIOLATION'
    → domain.numeric-threshold @ golden-gate.ts:322        ← REAL (price-anchor const)
    → domain.numeric-threshold @ golden-gate-harness.ts:98 ← REAL (the self-blessing gate)
    → process.gates @ buildChartModel→buildShapeBrain      ← ARTIFACT (service-wall edge gap)
Row-count = how much doctrine cares. Distinct-sites = what to fix.
```

The cure for noise volume is CALIBRATION (Part 7) + curated `declaredPredicates`
(hand-pick ~20 exact checks instead of family-wide arming) — queued.

---

# PART 5 — WHAT FUNDAMENTALLY TRANSFORMED

## 5.1 Navigation: grep-archaeology → query verbs

```
OLD: "where does GU get its shape chain?"
  → write probe-c2-gu-shape.ts, run it, read output, repeat 20×, days
NEW:
  verb=chain injectShapeSequence buildReasoningChain   ← the exact path, seconds
  verb=who-calls strongest                              ← every caller, file:line
  verb=semantic-search "cascade injection GU zones"     ← GPU embeddings, ranked
```

## 5.2 Validation: self-blessing harnesses → external measurement

```
OLD: the harness grades itself (harness.ts:116 pass:true while printing
     "every projection is price-anchored") — validator captured by the violator
NEW: predicates are EXTERNAL to the code. They cannot be blessed away.
     The W10 machine found that exact bug independently — this class is now
     mechanically surfaced on every hunt.
```

## 5.3 Session economics: refeed-tax → DB rehydration

```
OLD SESSION START: 500-700K tokens of markdown reinjection; 1-2 steps/session
NEW SESSION START: verb queries return record-lines (KBs). The canon docs
                   demote to audit trail. Compaction stops mattering: reopen DB.
```

## 5.4 Model weights: recalled law → measured law

The model stops spending capacity REMEMBERING 37 laws + D-series rulings + blast radii.
Weights do what they're good at (reasoning about the current problem); the DB carries what
memory was bad at (perfect recall of every rule, edge, violation, hash). Doctrine compliance
stops being a personality trait of the session and becomes a property of the battery.

## 5.5 Code-writing: blind edits → instrumented edits

Once LOGIC-LSP is wired (Part 7), every read/edit of a violated file carries its diagnostics
block. You find out AT TOUCH TIME, not at golden-gate-failure time, three waves later.

---

# PART 6 — LOGIC-LSP: WHY IT'S NOT WIRED YET + WHAT WIRING MEANS

## 6.1 Honest status

The injector CODE exists (surface/lsp-injector.ts, tested), but it activates as a
**plugin tool.after hook** inside a running opencode plugin process. This session drove the
machine via direct bun imports (kg-driver) — the hook layer only arms when the trident
plugin carrying `createBugHunterHooks()` is the LIVE plugin of the session, registered in
trident-hooks.ts, with a completed hunt in the DB (the LSP reads latest HUNT_DONE).

## 6.2 What wiring requires (checklist)

```
1. Plugin live: the deployed checkpoint dist registered as THIS opencode
   instance's plugin (hooks + tools registered at startup).
2. Verify registrations: trident-bug-hunter-query answers verb=consistency
   (auth probe S1); hooks appear in the hook registry.
3. Seed state: ≥1 HUNT_DONE in shared.db  ✅ ALREADY DONE (run -1/-2 appended)
4. Then AUTOMATIC: every read/edit/write/bash/glob whose args reference a
   file under the project walks UP to .trident/knowledge-graph/, binds to
   the ONE per-project server, and appends:
     [LOGIC-LSP] N diagnostic(s) in <file>:
       error  domain.numeric-threshold:dbc36ab27d57  gateG8.comparator … :322
   deduped across a 3-result window, hard-capped <500 chars.
5. Clear condition: auditor reaches conformanceZero → block disappears
   CROSS-SESSION (state lives in events table, not memory).
```

## 6.3 What it feels like once live

You (or any agent) open `golden-gate.ts` → the tool result already ends with the two
price-anchor diagnostics. No hunt needed to see them. Fix + re-hunt(0) + audit-zero →
blocks vanish everywhere, persistently. **Matrix vision for logic**: the violation greets
you at first touch.

---

# PART 7 — CALIBRATION: WHY THE BATTERY CAN BE TRUSTED

Every predicate must pass TWO tests before going live (dry-run first, D28):

```
FIRE test   → on a recorded VIOLATION fixture, it MUST fire   (else MISS → FLAGGED)
SILENT test → on the GOLDEN (known-good) state, MUST be quiet (else FALSE-FIRE → FLAGGED)
2×2 verdict matrix: CALIBRATED | FLAGGED(dead-logic) | FLAGGED(false-positive) | FLAGGED(incoherent)
Only CALIBRATED predicates join the live battery. Versioned records; stale calibration invalid.
```

This is the cure for both noise (false positives excluded) and theater (dead checks exposed).
Your role: curate the FIRE/GOLDEN fixture set once per doctrine area; the gate does the rest.

---

# PART 8 — OPERATING PROCEDURES (the new loops)

## 8.1 Rebuild the graph after code changes (~10s)
```
cd <Plutus> && rm -f corbell-data/.corbell/workspace.db* && \
  /opt/corbell-venv/bin/corbell graph build --methods
# then driver/map-step mirrors into shared.db (writeGraph per-run snapshot)
```

## 8.2 Full hunt
```
bug-hunt(targetPath=<Plutus>, profilePath=<Plutus>/profile.yaml)
→ RECON(loadProfile+runId) → MAP(graph) → SCAN(battery×graph)
→ TRACE(root-cause matrix) → STRIKE(rank+fix order) → REPORT(+HUNT_DONE event)
Any failure → NAMED error (PROFILE_INVALID/CORPUS_MISSING/GRAPH_EMPTY…) → INCONCLUSIVE.
No silent passes. Ever.
```

## 8.3 Iterate the law
```
Dump a new ruling as a blockquote w/ declared classification into a Tier-1 doc
→ next compile picks it up automatically (fingerprint changes → cache miss → recompile)
→ calibration dry-run → curate → live. MACHINE CODE NEVER CHANGES. Only profile+corpus.
```

## 8.4 Fix loop (with auditor, once wired)
```
findings → build agent fixes (fix-scope locked to declared files)
→ BUILD_DONE(SHA-paired) → re-hunt(0) → AUDIT_DONE(conformanceZero) → LSP clears globally
```

---

# PART 9 — CURRENT STATE + KNOWN BOUNDARIES (honest)

| Item | State |
|---|---|
| Graph | ✅ 1,940 nodes / 3,647 edges; full src coverage verified; Checkpoints contamination ZERO; scoped rebuild 10s |
| Battery | ✅ 2,837 cards→predicates compiled + persisted (fingerprint bc6ce1a0584a) |
| Embeddings | ✅ 146K chunks indexed, GPU (RTX 4080 CUDA) |
| Hunts | ✅ 2 runs executed; flood rows curated; DISTINCT-class reading established |
| Stage-wiring check | ⚠ artifact until single-service scope fix (call-linking is per-service) |
| Calibration | ⏳ not yet run (next queue item) |
| LOGIC-LSP | ⏳ code ready, needs live-plugin hook registration (Part 6 checklist) |
| Auditor loop | ⏳ ships with the same plugin activation |
| CORPUS_CANON.md consolidation | ⏳ optional refinement (Tier pass done inline via profile list) |

# PART 10 — NEXT QUEUE (each gated, DB-as-truth)

1. Scope fix → single-service graph → stage-gates measures REALITY (expect clean, or a true finding).
2. Calibration dry-run → curate → live flip.
3. declaredPredicates curation → tight ~20-check battery replacing family-wide duplication.
4. Plugin hook registration → LOGIC-LSP live → auth-probe verify.
5. Auditor loop armed → fix cycles close conformanceZero.
6. THEN the actual quarry: cascade bridge analysis via verb=chain through
   injectShapeSequence consumers; EU/GU deltas vs Golden_Operator oracle; the E1A-E1D
   freshness waves become mechanically verifiable after each landing.

---

*The machine is the operator's words, compiled. The DB is the memory. The LSP is the reflex.
The calibration is the conscience. The compaction tax is dead.*

---

# PART 11 — COMPONENT DEEP DIVES (every box in the Part-2 diagram)

## 11.1 COMPONENT: profile.yaml — THE CONSTITUTION

```
 profile.yaml                        THE ONLY project-specific artifact.
 ┌──────────────────────────┐        Everything else is generic engine code
 │ project.name/root        │        that outlived Plutus and will serve the
 │ graph.substrate/scope    │        next project unchanged (iron law D1).
 │ rules.corpus[]           │
 │ rules.bindings{}         │ ◄── THE POWER FIELD: which checks are ARMED.
 │ pipeline.stages[]        │     A template without bindings returns the
 │ history.failureLogs[]    │     HONEST SILENT ([] — claims nothing).
 │ awareness.docs[]         │
 └──────────────────────────┘     Loader is FAIL-CLOSED: missing corpus file
                                  → CORPUS_MISSING → machine refuses to run.
                                  No fallbacks, ever.
```
Agent-behavior change: editing THIS file is how you change what the machine enforces.
No engine code is ever touched per-project.

## 11.2 COMPONENT: corbell substrate (Path A intake)

```
 src/**/*.ts ──tree-sitter TS grammar──► raw store (corbell-data/.corbell/)
                                          graph_nodes(id,node_type,data JSON)
                                          graph_edges(source,target,kind)
 kinds: service→module · method→method · flow→function
 edge kinds: method_call→calls · flow_step→traces-to
 ADAPTER POST-PROCESSING (the thin shell):
   ENRICHMENT      re-reads each file → data.comparator=max numeric literal
   NAME RESOLUTION name→method_name→function_name→class_name (bare symbols)
   EDGE FILTER     drops edges w/ unmaterialized endpoints (FK safety)
   SUBSTANCE CHECK zero CODE nodes → loud GRAPH_EMPTY (no false-clean)
 KNOWN BOUNDARY: call-linking is PER-SERVICE. Cross-service callers (report-
 v452.ts ↔ src) produce no edges until single-service scope lands (queue #1).
```

## 11.3 COMPONENT: shared.db — THE STORE (W1 layer)

```
 ┌─ ONE FILE: <Plutus>/.trident/knowledge-graph/shared.db ─────────────┐
 │ MAP      graph_nodes · graph_edges      (per-run SNAPSHOT: delete+   │
 │          insert fresh each rebuild)                                  │
 │ LAW      rule_cards · compiled_predicates (hash-cached battery)      │
 │ LEDGER   findings · report_sections · implementations ·              │
 │          conformance_verdicts · events   (APPEND-ONLY, run-scoped)   │
 │ TRUST    calibrations (FIRE/SILENT verdicts) · audits                │
 └──────────────────────────────────────────────────────────────────────┘
 PRAGMAS: WAL (concurrent readers never block writers) · busy_timeout=5000
 · foreign_keys=ON · user_version schema marker. bun:sqlite native driver.
 MIRROR: MASTER_CONTEXT/knowledge-graph/graph.db = summary copy for any
 agent; .trident/…/shared.db remains the single truth.
```

## 11.4 COMPONENT: lexicon pipeline (Path B intake)
See Part 4 flow. Micro-facts that matter:
- Extraction is a PURE FUNCTION of corpus bytes → same docs forever yield same
  cards (determinism law). No timestamps, no model, no nondeterminism.
- Keyword vote is a DETECTOR; the DECLARED `classification:`/`severity:` lines
  under a quote are the DECISION and always win.
- Content address = sha256(anchor|bindings)[:12] → a predicate id is stable
  forever unless its anchor text or binding changes.

## 11.5 COMPONENT: diagnostics engine (the sweep)

```
 for predicate in battery:            # ~ms per predicate over 1,940 nodes
   found = check({graph, source, bindings})
   validate: evidence non-empty (else FINDING_NO_TRIPLET), verdict canon
 dedupe(ruleId|file|line) → rank(severity × bounded history-frequency)
 append findings (runId-scoped ledger rows)
 GUARDS: ENGINE_GRAPH_EMPTY (scan over zero nodes = LOUD fail)
         FINDING_CHECK_FAILED (throwing predicate names itself, atomic)
 DETERMINISM: same battery+graph+bytes ⇒ byte-identical findings. Always.
```

## 11.6 COMPONENT: query surface (10 verbs)

```
 verb=who-calls X        inbound 'calls' edges → {caller,file,line}
 verb=chain A B          BFS over calls edges, depth-capped 64
 verb=must-implement     SPEC_DERIVED stages lacking CODE_DERIVED node
 verb=unwired            exports with zero inbound calls (dead machinery)
 verb=rule R             the card + all its violations
 verb=violations         ranked CRIT→WARN, run/week-scoped
 verb=consistency        SPEC vs CODE drift alarm (the matrix vision)
 verb=semantic-search q  GPU embedding cosine top-k (146K chunks indexed)
 verb=code-search        alias
 verb=docs-patterns      learned doc patterns
 --format llm            token-minimal records built for context windows
```

## 11.7 COMPONENT: LOGIC-LSP server
Part 6 covers arming. Mechanics once live: registry keys ONE server per
project root (resolved by walking UP from any touched file to
.trident/knowledge-graph/shared.db). diagnosticsFor(file) = latest HUNT_DONE
violations for that file; EMPTIED when latest AUDIT_DONE carries
conformanceZero:true. State lives IN THE DB → survives restarts/compaction.
Byte-cost capped (<500 chars/file-block) so the highlight can't eat the window.

## 11.8 COMPONENT: auditor loop

```
 HUNT_DONE(findings) ──► BUILD_DONE(fix, before_sha→after_sha,
                                    fix-scope locked to declared files)
       ──► re-HUNT(0 expected) ──► AUDIT_DONE{verdicts:[],conformanceZero:true}
                                     └─► D25 CLEAR: every LSP block empties
 Any VIOLATED verdict → loop stays open → INCONCLUSIVE. No fabricated fixes.
```

# PART 12 — HOW AGENT BEHAVIOR / CONTEXT WINDOW / BUILDS CHANGE

## 12.1 The context window, functionally redesigned

```
OLD WINDOW (~1M tokens)                     NEW WINDOW
├─ 500-700K reinjected history    ├─ ~10-30K: query-verb answers (records)
│  (POST-COMPACTION, DEBUG_LOG,   ├─ live work: code being read/written
│   EVIDENCE_STATE, rulings…)     ├─ [LOGIC-LSP] micro-blocks riding reads
├─ doctrine held as recall-       │  (<500c each, self-deduping)
│  pressure ("obey these 37 laws")├─ doctrine arrives ON DEMAND as quoted
├─ navigation by grep+read        │  evidence inside findings — not preloaded
└─ remaining ~30% for actual work └─ ~95% free for reasoning about THE PROBLEM
The weights stop simulating a filing cabinet and go back to being a brain.
```

## 12.2 The decision loop, rewired

```
OLD: task → recall applicable laws from prose → edit → hope → harness gate
     → gate fails 3 waves later → bisect → discover a forgotten ruling
NEW: task → verb queries fetch exact edges/rules → edit (LSP block confirms
     or objects AT TOUCH) → hunt measures → auditor closes → DB remembers
Every state transition leaves a ROW. Forgetting becomes structurally impossible;
only genuine engineering mistakes remain possible — and those get named errors.
```

## 12.3 How builds proceed from here (the natural cadence)

```
1. scope/edge fix → rebuild (10s) → stage-gates measure reality
2. calibration dry-run → curate fixtures → live flip
3. declaredPredicates curation → tight ~20-check battery
4. plugin restart → tools+hooks live → auth probe → LSP arms
5. auditor loop on → fix cycles close conformanceZero
6. THE QUARRY: cascade bridge via chain-queries + oracle deltas;
   E1A-E1D freshness waves verified by re-hunt after each landing
7. steady-state per feature: dump law → arm binding → hunt → fix → zero
   (machine code NEVER changes again — only profile + corpus + code-under-test)
```

*End of expansion. Parts 1-10 above remain the canonical reference.*

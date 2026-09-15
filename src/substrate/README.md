# src/substrate/ — THE PARAGON SUBSTRATE (W1 vendor, ADOPT near-verbatim)

**What this is:** the vendored PARAGON intelligence substrate — the L1-L6 layer machinery
plus the 12 enforcement microstructures — installed as the foundational codebase every
Plutus v5.0 wave (W2-W7) imports. Ported under the reuse doctrine
(spec §2.3): **ADOPT near-verbatim, ADAPT mechanical re-pointing only.**

**Fidelity proof (audited this wave):** all 83 microstructure `.ts` files are
**byte-identical** to source; all 54 machinery `.ts` files differ **only** in import
specifier lines (0 non-import changed lines across the whole tree — verified by
changed-lines-only diff). No logic was touched, no signature was renamed, no behavior
was fitted.

**Public surface:** `src/substrate/index.ts` (mirrors the upstream barrel) + per-layer
`index.ts` barrels + `microstructures/index.ts` (namespaced: `MsChainTracker`, …).
W2+ consumers import L3 contracts + L1 math; **NEVER L4 directly**
(Aether only via bracketed JESL generate nodes — the dependency law). L5/L6 observe
everything and are imported by nothing. `ms-chain-tracker` + `ms-state-machine` are
CORE E2 machinery (W3 consumes); the other 10 are enforcement-plane.

## SOURCES (the only ground truth)

| # | Source root | Content | Files |
|---|---|---|---|
| S1 | `KNOWLEDGE_LIBRARY/Bibles/Aether_Knowledge/Boilerplate_Prototypes/Paragon_V1_Backend_Machinery/src/` | L1-L6 layer machinery (56 `.ts`) | 55 vendored + upstream barrel mirrored |
| S2 | `KNOWLEDGE_LIBRARY/Bibles/Aether_Knowledge/Boilerplate_Prototypes/Paragon_Microstructures/ms-*/` | 12 microstructures: `src/**` + root `index.ts` shim + root `types.ts` (62+12+9 = 83 `.ts`) | 83 vendored, byte-identical |
| S3 | `Paragon_V1_Backend_Machinery/docs/PARAGON_BIBLE.md` | the permanent record (vendored as `docs/`) | 1 doc |

Tests under both sources (`tests/`, `*.test.ts`) were intentionally NOT vendored —
the substrate ships runtime-only; behavior is proven by the W1 smoke probe (44
assertions, pasted in the wave report) and the upstream battery stays upstream.

## LAYER MAP (substrate dir → source dir → PARAGON layer)

| Substrate dir | Source dir | Layer | Files |
|---|---|---|---|
| `L1-math/` | `src/math/` | L1 spec layer: MathExpr grammar, total evaluator, contracts, oracle registry, D1-D9 families, 20 structures, canonical serialization, D13 anchors, branded verdicts | 10 |
| `L2-compiler/` | `src/compiler/` | L2 projection compiler: spec parser, rule cards, 5 template families, project profile, battery+calibrate+emit | 6 |
| `L3-lasme/` + `L3-lasme/machines/` | `src/lasme/` + `src/machines/` | L3 wired substrate: contracts/triads, pure state-machine core, predicate lexicon, throw-arms, audit registry, engine + 6 seed machines + xstate adapter + algebra | 7 + 9 |
| `L4-aether/` | `src/shadow/` | L4 execution layer: frozen-model brain, session memory, sidecar, tool surface, 13-step runner | 6 |
| `L5-sentinels/` | `src/sentinel/` | L5 guardian fleet: pure synapse accumulator, fleet (chunk/inject/override/barrage/boot) | 3 |
| `L6-graph/` | `src/graph/` | L6 knowledge-graph foundation: bun:sqlite seam, 11-table schema, 10 query verbs, LOGIC-LSP server | 5 |
| `enforcement/` | `src/enforcement/` | the 5+1 deviation-impossible matrix (hook ownership, config-lock, ship-gate, import-graph, sentinel red-team, dist-sha) | 2 |
| `bindings/` | `src/bindings/` | host binding: `ParagonHostBinding` contract + OpenCode 5-hook pack + 4 tools | 5 |
| `preflight/` | `src/preflight/` | the 12-step projection pipeline (PARSE→REPORT, loud-fail per step) | 2 |
| `microstructures/ms-*/` | `ms-*/src/` + `index.ts` + `types.ts` | the 12 enforcement primitives (namespaced barrel) | 84 |
| `docs/` | `docs/` | vendored PARAGON_BIBLE.md (reference only) | 1 |

## FILE SOURCE MAP — L1-math (10 files, all byte-identical)

| Substrate file | Source file | Serves |
|---|---|---|
| `L1-math/expr.ts` | `src/math/expr.ts` | the CLOSED 24-kind grammar (literals/arithmetic/comparison/logic/sets/quantifiers/temporal) |
| `L1-math/eval.ts` | `src/math/eval.ts` | the TOTAL evaluator (6 named error codes, depth 256, domain 10k, strict and/or, evalCached) |
| `L1-math/contract.ts` | `src/math/contract.ts` | the 4 semantic roles (pre→REJECT, post→THROW, invariant→DIE, temporal→ESCALATE) |
| `L1-math/oracle.ts` | `src/math/oracle.ts` | append-only oracle registry (ORACLE_CONFLICT, float-epsilon gate, integer-equality discharge) |
| `L1-math/families.ts` | `src/math/families.ts` | D1-D9 canonical derailment-family builders + PROFILE_INCOMPLETE gate |
| `L1-math/structures.ts` | `src/math/structures.ts` | the 20 KB-MPSE-00 expression-builder helpers (closed registry of exactly 20) |
| `L1-math/serialize.ts` | `src/math/serialize.ts` | canonicalJson + contentId (sha256 over NUL-joined parts; no time, no random) |
| `L1-math/anchor.ts` | `src/math/anchor.ts` | D13 provenance anchors (verbatim quote + line) |
| `L1-math/verdicts.ts` | `src/math/verdicts.ts` | toBrandedVerdict — the ONLY branded-verdict producer |
| `L1-math/index.ts` | `src/math/index.ts` | the L1 barrel (the ONLY sanctioned L1 import surface) |

## FILE SOURCE MAP — L2-compiler (6 files)

| Substrate file | Source file | Serves | Adapt |
|---|---|---|---|
| `L2-compiler/parser.ts` | `src/compiler/parser.ts` | fenced math/oracle/contract/profile blocks; CORPUS_UNREADABLE / CORPUS_EMPTY | `../math` → `../L1-math` |
| `L2-compiler/rule-cards.ts` | `src/compiler/rule-cards.ts` | D13 card extraction + validateCard (D13_QUOTE_MISMATCH) | `../math` → `../L1-math` |
| `L2-compiler/templates.ts` | `src/compiler/templates.ts` | 5 universal template families (PURE checks; A3 no-exec) | `../math` → `../L1-math`, `../lasme` → `../L3-lasme` |
| `L2-compiler/bindings.ts` | `src/compiler/bindings.ts` | project profile (D10 variables for the CONSTANT templates) | `../math` → `../L1-math` |
| `L2-compiler/compile.ts` | `src/compiler/compile.ts` | battery (content-hash version) + D17 calibrate + armedBattery + emitWiring | `../math` → `../L1-math` (+2 emitted-code **string** literals left AS-IS — see note) |
| `L2-compiler/index.ts` | `src/compiler/index.ts` | the L2 barrel | byte-identical |

## FILE SOURCE MAP — L3-lasme (16 files)

| Substrate file | Source file | Serves | Adapt |
|---|---|---|---|
| `L3-lasme/contracts.ts` | `src/lasme/contracts.ts` | WarheadEvent, EVIDENCE TRIAD, PatternFamilyMember (Order-2 matchers; bare RegExp REJECTED at registration) | `../math` → `../L1-math` |
| `L3-lasme/state-machine.ts` | `src/lasme/state-machine.ts` | PURE core: step() first-match order, withTriad (I2), loadOrFresh fail-closed, reachable() | `../math` → `../L1-math` |
| `L3-lasme/predicate-lexicon.ts` | `src/lasme/predicate-lexicon.ts` | scan-all-members FLAG-only lexicon, plural-tolerant frames, boundedSlice | `../math` → `../L1-math` |
| `L3-lasme/throw-arms.ts` | `src/lasme/throw-arms.ts` | tool+args classification arms, StrikeCounter, 3-strike EscalationError | byte-identical |
| `L3-lasme/audit-registry.ts` | `src/lasme/audit-registry.ts` | DISPATCHED→…→ADVANCED; RETURNED-without-audit blocks advance | `../math` → `../L1-math` |
| `L3-lasme/engine.ts` | `src/lasme/engine.ts` | LasmeEngine surface (ingest, DIE on invariant breach, verdict-router seam) | `../math` → `../L1-math` |
| `L3-lasme/index.ts` | `src/lasme/index.ts` **+ appended `./machines` line** | the L3 barrel (lasme surface + seed machines) | merged barrel (only new file with logic-free composition) |
| `L3-lasme/machines/evidence-machine.ts` | `src/machines/evidence-machine.ts` | NO_EVIDENCE→UNIT→CONTAINER ladder; smoke never lifts container claims | `../lasme` → `..` |
| `L3-lasme/machines/claim-gate.ts` | `src/machines/claim-gate.ts` | ARM on claim; tool.before NEVER blocks work; Phase-B splice; container-test clears | `../lasme` → `..` |
| `L3-lasme/machines/config-lock.ts` | `src/machines/config-lock.ts` | CTX pair-test on substrate writes; fail-closed INCONCLUSIVE→BLOCK | byte-identical |
| `L3-lasme/machines/workflow-machine.ts` | `src/machines/workflow-machine.ts` | CODE→BUILD→TEST-UNIT→TEST-RUNTIME→REPORT; the skip transition does not exist | `../lasme` → `..` (+1 inline `import('../lasme')` → `import('..')`) |
| `L3-lasme/machines/mpse-discharge.ts` | `src/machines/mpse-discharge.ts` | domain-proofed binding extraction + runtime discharge + self-verifier findings | `../lasme` → `..`, `../math` → `../../L1-math` |
| `L3-lasme/machines/sentinel-watchdog.ts` | `src/machines/sentinel-watchdog.ts` | pid+log-growth liveness; 5-restart budget; append-only WAL | byte-identical |
| `L3-lasme/machines/algebra.ts` | `src/machines/algebra.ts` | Result<T,E>, attempt, bracket (acquire→use→release-ALWAYS) | byte-identical |
| `L3-lasme/machines/adapters/xstate.ts` | `src/machines/adapters/xstate.ts` | XState bridge (same MachineDefinition; ×50 equivalence proof) | `../../lasme` → `../..` |
| `L3-lasme/machines/index.ts` | `src/machines/index.ts` | the machines barrel | byte-identical |

## FILE SOURCE MAP — L4-aether (6 files)

| Substrate file | Source file | Serves | Adapt |
|---|---|---|---|
| `L4-aether/brain.ts` | `src/shadow/brain.ts` | FROZEN_MODEL_CONFIG (no override path), stall detection, breaker, FakeModel seam | byte-identical |
| `L4-aether/memory.ts` | `src/shadow/memory.ts` | atomic-seq session store, dual-write mirror, rollover divergence check | `../graph/db` → `../L6-graph/db` |
| `L4-aether/sidecar.ts` | `src/shadow/sidecar.ts` | 3-tier tether + verifyMemoryReattach (3-check, never silent adopt) | byte-identical |
| `L4-aether/tools.ts` | `src/shadow/tools.ts` | supremacy contract, weave with VISIBLE holes, read-only pi-loop, bracket-tolerant parse | byte-identical |
| `L4-aether/runner.ts` | `src/shadow/runner.ts` | the 13-step composition; ANY failure → error manifest, NO file, NO row | byte-identical |
| `L4-aether/index.ts` | `src/shadow/index.ts` | the L4 barrel | byte-identical |

## FILE SOURCE MAP — L5-sentinels (3 files)

| Substrate file | Source file | Serves | Adapt |
|---|---|---|---|
| `L5-sentinels/synapse.ts` | `src/sentinel/synapse.ts` | PURE accumulator A_λ; PRIMING; canFire = threshold∧¬refractory∧PRIMED; versioned register | `../lasme` → `../L3-lasme`, `../math` → `../L1-math` |
| `L5-sentinels/fleet.ts` | `src/sentinel/fleet.ts` | chunk/inject/override/barrage/approachHash/BOOT_LINES×6/boot/restart-budget | `../lasme` → `../L3-lasme`, `../math` → `../L1-math` |
| `L5-sentinels/index.ts` | `src/sentinel/index.ts` | the L5 barrel | byte-identical |

## FILE SOURCE MAP — L6-graph (5 files)

| Substrate file | Source file | Serves | Adapt |
|---|---|---|---|
| `L6-graph/db.ts` | `src/graph/db.ts` | bun:sqlite seam (WAL, FK ON, SCHEMA_VERSION refusal-forward) | byte-identical |
| `L6-graph/schema.ts` | `src/graph/schema.ts` | 11 tables; LINEAGE_MISSING + FINDING_NO_TRIPLET gates; rebuild + dangling-edge filter | `../math` → `../L1-math` |
| `L6-graph/query.ts` | `src/graph/query.ts` | 10 verbs (chain BFS-64, consistency drift alarm, honest-unavailable stubs) | byte-identical |
| `L6-graph/lsp.ts` | `src/graph/lsp.ts` | DiagnosticsServer (state IS the db; <500B blocks; D25 file-scoped persistence) | byte-identical |
| `L6-graph/index.ts` | `src/graph/index.ts` | the L6 barrel | byte-identical |

## FILE SOURCE MAP — enforcement / bindings / preflight (9 files)

| Substrate file | Source file | Serves | Adapt |
|---|---|---|---|
| `enforcement/matrix.ts` | `src/enforcement/matrix.ts` | the 5+1 matrix (ownership, config-lock, ship-gate, import-graph, red-team, dist-sha) | byte-identical |
| `enforcement/index.ts` | `src/enforcement/index.ts` | the enforcement barrel | byte-identical |
| `bindings/contract.ts` | `src/bindings/contract.ts` | ParagonHostBinding interface (the every-future-host porting contract) | byte-identical |
| `bindings/opencode/hooks.ts` | `src/bindings/opencode/hooks.ts` | HOOK1-5 (assistant-only claims; CTX verdicts; splice; cache-law static) | `../../lasme` → `../../L3-lasme`, `../../machines` → `../../L3-lasme/machines`, `../../graph` → `../../L6-graph` |
| `bindings/opencode/tools.ts` | `src/bindings/opencode/tools.ts` | paragon-status/audit/query/project registrations | same 3 re-points (`../../preflight` unchanged) |
| `bindings/opencode/index.ts` | `src/bindings/opencode/index.ts` | createOpenCodeBinding assembler | same 3 re-points |
| `bindings/index.ts` | `src/bindings/index.ts` | the bindings barrel | byte-identical |
| `preflight/pipeline.ts` | `src/preflight/pipeline.ts` | runPipeline 12-step + projectStatus | `../compiler` → `../L2-compiler`, `../graph` → `../L6-graph`, `../math` → `../L1-math` (+2 inline `import('../compiler')` → `import('../L2-compiler')`) |
| `preflight/index.ts` | `src/preflight/index.ts` | the preflight barrel | byte-identical |

**Intentionally untouched string literals** (`L2-compiler/compile.ts:131-133,149`):
emitted-code templates containing `'../../compiler/templates'` / `require('../../compiler/templates')`
are **output strings** for `.generated.ts` wiring modules, not imports of this tree —
rewriting them would change what the compiler emits. Recorded here; W2 owns the emit path.

## FILE SOURCE MAP — microstructures (83 files, ALL byte-identical)

| Substrate dir | Source dir | Serves | Core E2? |
|---|---|---|---|
| `microstructures/ms-ratio-classifier/` | `ms-ratio-classifier/` (src 5 + index + README) | 4-bank opposed-pattern scorer (descriptive→neg, use→pos-zero, suggestive/substitute→pos) | enforcement |
| `microstructures/ms-synapse/` | `ms-synapse/` (src 5 + index + README) | self-contained synapse primitive for the enforcement plane | enforcement |
| `microstructures/ms-intent-classifier/` | `ms-intent-classifier/` (src 5 + index + README) | intent classification engine (`classifyIntent`) | enforcement |
| `microstructures/ms-chain-tracker/` | `ms-chain-tracker/` (src 5 + index + types + README) | call-chain rules + violations (`ChainTracker`) | **CORE E2 (W3)** |
| `microstructures/ms-pba-bridge/` | `ms-pba-bridge/` (src 6 + index + types + README) | PBA signal bridge + hook + status tool | enforcement |
| `microstructures/ms-escalation-memory/` | `ms-escalation-memory/` (src 5 + index + types + README) | escalation state + status tool | enforcement |
| `microstructures/ms-state-machine/` | `ms-state-machine/` (src 5 + index + types + README) | generic state-machine core + transitions | **CORE E2 (W3)** |
| `microstructures/ms-warhead-dispatcher/` | `ms-warhead-dispatcher/` (src 6 + index + types + README) | warhead registry + dispatcher | enforcement |
| `microstructures/ms-evidence-gates/` | `ms-evidence-gates/` (src 6 + index + types + README) | evidence gate battery | enforcement |
| `microstructures/ms-compliance-collector/` | `ms-compliance-collector/` (src 6 + index + types + README) | compliance collection + signature verify | enforcement |
| `microstructures/ms-layer-loader/` | `ms-layer-loader/` (src 7 + index + types + README) | layer JSON loading + validation | enforcement |
| `microstructures/ms-persistence/` | `ms-persistence/` (src 7 + index + types + README) | state/synapse persistence + ledger | enforcement |

Per-file note: each `ms-*/src/**` file maps 1:1 to the same relative path under the
source `ms-*/src/` (internal `.js`-suffixed relative imports resolve under both
`moduleResolution: bundler` and the bun runtime — no adaptation needed). Each `ms-*/index.ts`
root shim and `ms-*/types.ts` root types file is vendored verbatim beside `src/`, so every
`./src/…` and `./types.js` relative import keeps its exact target. Each `ms-*/README.md`
is vendored alongside as the module's own doc. `microstructures/index.ts` (new, 12 lines)
re-exports the 12 as namespaces (`MsChainTracker`, …) — the 3 colliding runtime names
(`DEFAULT_MACHINES`, `PbaSignal`, `ToolEvidenceRecord`) made a flat `export *` unsafe,
so namespacing is the mechanical isolation. `substrate/index.ts` (new, 22 lines) mirrors
the upstream root barrel layer-for-layer.

## DEPENDENCY RECORD (bun add lines: NONE)

Exhaustive external-import scan of both source roots:

| Import | Found in | Plutus status |
|---|---|---|
| `node:crypto`, `node:fs`, `node:path`, `node:os` | machinery + microstructures | builtin — no action |
| `bun:sqlite` | `L6-graph/db.ts`, `L4-aether/memory.ts` | provided by bun runtime + `bun-types` devDep — no action |
| `xstate` (optional peer `^5.18.0`) | **nowhere as a package import** — `adapters/xstate.ts` is pure (bridges local types only) | `xstate ^5.13.0` already in Plutus deps; unused by substrate today — no action |
| `effect` | **imported by zero vendored files** | `4.0.0-beta.74` present in node_modules UNPINNED (pre-existing) — **not added**: no source imports it, and scope law forbids speculative deps. W2 pins it when JESL/effect code lands. |

`package.json` / `bun.lock`: **unchanged** (verified: `git diff --stat` empty). Zero `bun add`
ran — there was nothing to add.

## VERIFICATION (this wave, pasted exits)

- `npx tsc -p tsconfig.substrate.json --noEmit` → **exit 0** (scoped to `src/substrate/**`;
  legacy-tree errors are W8's kill list, out of scope by mission).
- `bun build src/substrate/index.ts --outdir /tmp/opencode/w1-substrate-build --target bun`
  → **exit 0**, 90 modules, `index.js` 178.78KB.
- Adversarial runtime probe (temporary root script, deleted after the run): **44/44 PASS** —
  L1 total-evaluator codes (UNBOUND_SYMBOL, DIV_BY_ZERO, TEMPORAL_NOT_EVALUABLE,
  TemporalEscalationError), founding oracle 24→true / 40→false, evalCached memoization;
  L3 BareRegex/MissingExampleHits rejections, empty-scan silence, positive/USE-frame/plural
  behavior; L5 3-gate (fresh-false, I7-throw, two-signal-fire, refractory); ms-ratio
  null/type/range errors, use-frame pos-zeroing, batchScan violation/null boundaries;
  all 12 microstructure namespaces importable with real surface.
- Frozen pair: `sl-lmv.ts 91294083…eaeab` ✓, `trade-dedup.ts 33914c89…680e4` ✓ (match B-1/B-2).
- Legacy drift: zero modified tracked files (`git status` shows only pre-existing untracked
  clutter + the two intended additions: `src/substrate/`, `tsconfig.substrate.json`).

## KNOWN GAPS (for the orchestrator, not canon — reported, never written to canon docs)

1. `compile.ts` emitted-code string literals still reference `../../compiler/…` paths —
   correct for same-layout emits, must be revisited if W2 emits into a renamed tree.
2. `enforcement/matrix.ts` `verifyImportGraph` encodes the upstream `src/` layout
   assumption (zero non-native imports outside `bindings/`); W7 re-runs it against the
   vendored tree and owns any layout-aware update.
3. `effect` remains unpinned in node_modules; W2 (JESL runtime) should pin
   `effect@4.0.0-beta.74` when the first effect-importing module lands.

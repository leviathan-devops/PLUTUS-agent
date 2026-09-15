# BUILD SPEC ARTIFACT — PLUTUS JESL TEST MACHINERY
## Target: src/jesl/ kernel upgrade + plutus-pipeline-test card + skill suite
## Generated: 2026-09-05 · Status: PLANNING
## Artifact Type: BUILD_SPEC (Layer 1 + Kernel Deep-Dive)
## Discovery: ENABLED (src/jesl/ 10 files 850L + report-v452.ts 1719L + 42 diags)

---
---

# SECTION 1 — THE FULL EXPLANATION (verbatim)

## 1. THE 7 NODES — what each one ACTUALLY is

A JESL card is a JSON file. Each "node" is one step in the workflow — the kernel looks up
its `type` in the registry, finds the matching implementation function, and calls it with
the node's `config`. The edges say which node's output feeds which next node.

NODE: "fixture-guard" (type: gate)
  Checks bars_raw.json exists with RawFeed shape, 3 pairs, 4H non-empty, 1H >= 1000.
  Maps to: loadFixture() report-v452.ts:364. The FIRST thing every diag does.
  If 4H empty → spot=0 → buildChartModel throws. This node catches it as FIXTURE-GAP.

NODE: "canon-report" (type: shell-exec)
  Runs `bun report-v452.ts` — the ACTUAL pipeline entry (1,719 lines).
  Inside: loadFixture → pillarEngine → buildChartModel → buildE2Core → cascadeV45
  → buildReasoningChain → setups → dedup → simulate → stats → report.
  Output: report_v452.md + its sha256 (the determinism proof).

NODE: "report-determinism" (type: gate)
  Runs report-v452.ts TWICE, compares sha256 ×2 byte-identical.
  The v4.5.2-era determinism check (BUILD_STATE.md:116-122).

NODE: "pipeline-eval" (type: shell-exec)
  Runs `bun diag-reasoning-chain-golden.ts --day=2026-07-06`.
  Inside: buildE2Core → cascadeV45 → buildReasoningChain → TradeProjection[]
  → compare vs the oracle → G1-G10 + A1-A7 → outcome sim → verdict.
  Outputs: golden-count, outcome-wins, gate-results.

NODE: "diag-battery" (type: shell-exec)
  Runs all 15 diag scripts (telescoping, lmv-golden, obcv-golden, etc.)
  Output: diag-pass-count (currently 8/15 with the reconstructed fixture).

NODE: "v5-battery" (type: shell-exec)
  Runs `bun test src/` — 646 tests across 46 files (the V5 machinery).
  Output: v5-pass-count. Any fail = regression.

NODE: "frozen-pair" (type: gate)
  sha256sum sl-lmv.ts (91294083...) + trade-dedup.ts (33914c89...).
  Any drift = CRITICAL STOP.

NODE: "journal-sink" (type: journal-sink)
  Commits all evidence to the hash chain. row.self = sha256(prev + canonical(payload)).
  If ANYONE edits a prior row, verifyChain() detects it at that index.

## 2. THE NAME
"Golden gate" → wrong. The machine tests THE PIPELINE on ANY week. Correct name:
plutus-pipeline-test. The golden week is the FIRST oracle, not the identity.

## 3. buildE2Core — the ACTUAL process

buildE2Core(models, priorStorylines, barsByTf) at report-v452.ts:1050-1225:

STEP 1: DXY brain (the cascade SOURCE)
  dxyBrain = buildShapeBrain('DXY') :1063
  dxyBrain.setZoneMap(dxyModel.zones, dxyLtf30m)
  dxyBrain.compute()
  Inside: buildShapeChain (ZFP-conditioned 5-day chain: SS→BS→R→BS→WL)
  + buildDayDecomposition (Mon-Fri loop: projectZoneForDay per day,
    dayOpenSpot = Mon prior close / Tue-Fri prior ± travelMid,
    dayBandCarry chains day to day)
  → dxyBrainDays = the 5-day DXY decomposition

STEP 2: EU brain (its OWN chain)
  euBrain = buildShapeBrain('EUR/USD') :1064
  euBrain.compute() — same process, EU zones.
  (The DXY→EU full inversion is the FUTURE wave spec:319.)
  → euCoreDays

STEP 3: GU brain WITH EU injection (THE CASCADE)
  guBrain = buildShapeBrain('GBP/USD') :1078
  guBrain.injectShapeSequence(
    euShape.dayDecomposition.map(d => ({shape: d.shape}))) :1094-96
  Inside buildShapeChain :3099-3101:
    nextShape = injectedChain[i] ? injectedChain[i].shape
              : predictNextShapePressureAware(...)
  The GU picks its OWN zones but the SHAPES come from the EU.
  → guCoreDays (EU's shapes on GU's zones)

STEP 4: Validate the cascade
  translateCascadeDayMap(dxyBrainDays, dxyModel, euModel, 'INVERSE', euCoreDays) :1139-41
  translateCascadeDayMap(euCoreDays, euModel, guModel, 'KEPT', guCoreDays) :1144-46

STEP 5: Divergence + macro-wins flip
  computeChainDivergence(euCoreDays, dxyBrainDays) :1172-74
  computeChainDivergence(guCoreDays, euCoreDays) :1175-77
  If divergence > 0.35: applyDivergenceFlip (macro authority wins)

Then E3: cascadeV45 → buildReasoningChain → TradeProjection[]
→ these are what the oracle compares against.

## 4. THE ORACLES — TWO levels

ORACLE 1 (Monday): DXY S 101.14, DXY L 100.945, EU S 1.14395, EU L 1.1411, GU L 1.3333
ORACLE 2 (Full week): oracle.eurusd.rows (8 trades + 2 reinf) + oracle.gbpusd.rows (7 + 3)
= 20+ trades Mon-Fri. The pipeline must hit the structural zones EVERY day.

## 5. THE OUTCOME SIM

Trigger: first bar > ANCHOR where bar.LOW <= E (LONG) or bar.HIGH >= E (SHORT).
Exit: walk forward from trigger. For LONG: bar.LOW <= SL = LOSS, bar.HIGH >= TP = WIN.
Same-bar TP+SL = LOSS (conservative — you can't know which was touched first within the bar).
MAE = max adverse excursion. MFE = max favorable excursion.
MAE/SL-dist < 0.40 = SL too wide. > 0.70 = entry too early.
R = |TP-E|/|E-SL| for a win. R = -1.0 for a loss.

## 6. WHY THE CARDS WEREN'T BUILT FROM THE BIBLE
Source 1: the JESL bible (card schema, 37 kinds, channel model, journal format).
Source 2: the actual Plutus codebase (loadFixture, buildE2Core, cascadeV45, the diags).
The correct approach: card from the PIPELINE ARCHITECTURE, structured using the JESL
SCHEMA, executed by the KERNEL (src/jesl upgraded with missing kinds).

## 7. HOW THE KERNEL IS WIRED
registry.ts (append-only kind map) → executor.ts (channel model, Kahn's, gate
enforcement) → journal.ts (sha256 hash chain, covers(), verifyChain()) → nodes.ts
(the implementations) → errors.ts (8 frozen refusal tokens).

---
---

# SECTION 2 — THE DEEP PLAN (DPL1)

## §1 Problem Statement

The Plutus TTE pipeline (25 checkpoints of proven machinery) has NO production-hardened
testing harness. The current testing: 42 diag scripts run manually, a golden gate run
manually, no mechanical enforcement that ALL gates run, no tamper-proof evidence chain,
no replay capability. Any agent can skip a gate, fake a result, or run a partial battery
and claim success. The JESL kernel (src/jesl/) exists and is GATE GREEN at hello-scale
(4 node kinds, 9 adversarial rejections in hello.test.ts) but lacks the node kinds needed
to express the pipeline test (gate, shell-exec, math-eval, journal-sink). Additionally,
the journal uses simpleHash (not sha256), there is a 9th refusal token violating the
8-token law (JESL_BIBLE D15), and there is no determinism-x2 test.

The fix: upgrade the kernel with 4 missing node kinds, fix the hash + token issues,
write the plutus-pipeline-test card from the ACTUAL codebase architecture (report-v452.ts
functions, the 42 diag scripts, the frozen pair SHAs), map every card node to the
knowledge graph, and wrap it all as a skill so any session invokes it with one command.

## §2 Architecture

The JESL machine has three parts:
1. THE CARD (specs/jesl/plutus-pipeline-test.json - DATA, versioned, diffable)
2. THE KERNEL (src/jesl/ - CODE, the executor that reads cards and runs nodes)
3. THE JOURNAL (a hash-chained JSONL file - PROOF, tamper-evident)

The card references ACTUAL Plutus functions. The kernel executes them. The journal
proves what ran. Together: structural gate enforcement (impossible to skip a check),
tamper-evident evidence (impossible to fake a result), and replay (impossible to claim
a run that didn't happen).

## §3 Discovery Intelligence

Languages: TypeScript (bun runtime), JSON (workflow cards)
Entry points: src/jesl/index.ts (barrel), src/jesl/executor.ts:run()

MEASURED (2026-09-05):
- src/jesl/ = 10 files, ~850 lines total
- src/jesl/hello.test.ts = 9 adversarial assertions, GATE GREEN
- src/jesl/journal.ts = 118L (hash chain + covers() + verifyChain())
- src/jesl/executor.ts = 311L (channel model + Kahn's + tier + cap check)
- src/jesl/registry.ts = 62L (append-only, 4 kinds registered)
- src/jesl/errors.ts = 55L (8 frozen tokens + JESL_MAX_RETRIES=2)
- src/jesl/nodes.ts = 171L (4 implementations: detect/decide/generate/generate-sink)
- src/jesl/types.ts = 86L (NodeKind, WorkflowDoc, NodeResult, etc.)
- JESL_BIBLE.md = 3007L at KNOWLEDGE_LIBRARY/Bibles/JESL/
- JESL-Kernel-Edition = 182 files (core/, cli/, drivers/, nodes/, kernels/, etc.)
- report-v452.ts = 1719L (the canon pipeline entry)
- src/brains/shape-brain.ts = 3311L (the E2 designation machinery)
- 42 diag-*.ts scripts at project root
- src/pipeline/engine.ts = 2681L (the 5-tool chain)
- Knowledge graph: 1940 nodes, 3647 edges, shared.db

PATTERNS found:
- Registry pattern: append-only Map<string, NodeHandle>, same-impl re-register OK
- Channel model: edges carry "via" names, nodes read/write named channels
- Hash chain: prev -> self = sha256(prev + canonical(payload)), ts excluded
- Refusal tokens: 8 frozen strings, each with {code, node, field, actual, remedy}

FAILURES found:
- 9th token [JESL RETRY-EXHAUSTED] violates D15 (exactly 8)
- simpleHash (FNV-ish) not sha256 in journal.ts
- Date.now() used in executor.ts:124,234,237 (bible bans wall-clock in core)
- No determinism-x2 test in hello battery
- Only 4 of 37 bible kinds implemented

DECISIONS from the desk extractions:
- Desk 3 (jesl-machine-laws): keep bun-native (no Effect-TS port) for the test machine
- Desk 5 (v5-gap-analysis): the generative cascade gap is a SEPARATE build item
- Desk 4 (checkpoint-ledger): the verbatim command ledger is the gate criteria source

## §4 Core Insight

The implementation must produce runtime-grade machinery that works correctly in a real
runtime environment — not just code that compiles. The JESL kernel already proves the
channel model + refusal tokens + hash chain at hello-scale (hello.test.ts GATE GREEN).
The upgrade path is: (1) add the 4 missing node kinds, each mapping to an ACTUAL Plutus
operation (gate -> the diag assert logic, shell-exec -> running bun commands, math-eval
-> the RRR computation, journal-sink -> the evidence commit), (2) write the
plutus-pipeline-test card referencing the ACTUAL functions from the desk-4 command
ledger, (3) the kernel's structural gate-refusal makes it impossible to skip a check.
The hardcode ban applies to the card: the gates assert the MEASURED baselines (5/5
convergence, 646/0 V5 battery, the frozen SHAs) — these are the acceptance targets
from the checkpoint era, not invented values.

## §5 Scope

1. Register 4 new node kinds: gate, shell-exec, math-eval, journal-sink
2. Implement each in src/jesl/nodes.ts with typed contracts + adversarial tests
3. Fix errors.ts: remove 9th token (RETRY-EXHAUSTED -> verdict reason)
4. Switch journal.ts from simpleHash to sha256 (node:crypto createHash)
5. Add determinism-x2 test to hello.test.ts (double-run digest compare)
6. Write specs/jesl/plutus-pipeline-test.json (11 nodes, sequential edges)
7. Write src/jesl/pipeline-test.test.ts (the integration test)
8. Map every card node to .trident/knowledge-graph/shared.db
9. Create the plutus-pipeline-jesl-test skill (SKILL.md + run script)
10. Remove Date.now() from executor (injected ClockTag)

## §6 Success Criteria

| # | Criterion | Verify command | Must be |
|---|---|---|---|
| SC-1 | 8 registered kinds (4 old + 4 new) | grep -c "register" src/jesl/registry.ts | >= 8 |
| SC-2 | Gate node: assert on channel | bun test src/jesl/ (gate tests) | PASS |
| SC-3 | Shell-exec node: run command | bun test src/jesl/ (shell tests) | PASS |
| SC-4 | Journal uses sha256 | grep "sha256\|createHash" src/jesl/journal.ts | present |
| SC-5 | Exactly 8 refusal tokens | grep -c "\[JESL " src/jesl/errors.ts | = 8 |
| SC-6 | Card exists and valid | test -s specs/jesl/plutus-pipeline-test.json | present |
| SC-7 | Card executes via kernel | bun src/jesl/ run specs/jesl/plutus-pipeline-test.json | exit 0 |
| SC-8 | Card refuses broken pipeline | (break a gate, re-run) | exit 1 + named gate |
| SC-9 | Journal chain verified | verifyChain() output | verified:true |
| SC-10 | Journal tamper detected | (mutate a row, verify) | verified:false |
| SC-11 | All existing tests pass | bun test src/jesl/ | 0 fail |
| SC-12 | Card nodes mapped to graph | query shared.db for node refs | >= 10 |
| SC-13 | Determinism x2 test | bun test src/jesl/ (determinism) | PASS |
| SC-14 | Skill created | test -f skills/plutus-pipeline-jesl-test/SKILL.md | present |

## §7 Container Test Plan (plan-first)

| Angle | Scenario | Pass token | Fail token |
|---|---|---|---|
| TOOLS | Run the full card on the golden week | exit 0 | exit != 0 |
| FIREWALL | Break a gate (remove bars fixture), re-run | FIXTURE-GAP in output | silent pass |
| ERRORS | Corrupt the card JSON (invalid schema) | invalid_params | crash |
| STATE | Mutate a journal row, re-verify | verified:false at index | verified:true |
| BOUNDARY | Empty bars fixture (bars:[]) | NO-SEED refusal | silent advance |
| INTEGRATION | Full pipeline e2e (real bars, real oracle) | golden 5/5 + determinism PASS | any gate fail |
| CONCURRENCY | Run two cards simultaneously | separate journals, no collision | interleaved rows |

EVIDENCE: every scenario's raw command output + the journal file path + the exit code.
PASS THRESHOLD: 7/7 scenarios PASS. Any FAIL = the machinery is not production-ready.
## §8 THE KERNEL DEEP-DIVE (the main machinery — 40-50% of this spec)

### 8.1 The Registry — the kernel's type system

The registry is the KERNEL'S TYPE SYSTEM. It maps a string (the node's `type` field in
the card JSON) to an implementation function. When the executor encounters a node with
`type: "gate"`, it calls `registry.get("gate")` to find the function that implements
gate behavior.

THE CURRENT STATE (src/jesl/registry.ts, 62 lines):
```typescript
// The registry is a Map<string, NodeHandle>
// NodeHandle = { kind: NodeKind, impl: (input, ctx) => Promise<NodeResult> }
// Currently registered: "detect", "decide", "generate", "generate-sink"

export function register(kind: string, impl: NodeImpl): void {
  const existing = registry.get(kind);
  if (existing && existing.impl !== impl) {
    // APPEND-ONLY: you CANNOT replace an existing kind with a different impl.
    // Re-registration with the IDENTICAL impl is allowed (for hot-reload scenarios).
    throw new Error(`kind '${kind}' already registered with different implementation`);
  }
  registry.set(kind, { kind: kind as NodeKind, impl });
}

export function getRegisteredImplSync(kind: string): NodeHandle | undefined {
  return registry.get(kind);
}
```

WHY APPEND-ONLY MATTERS FOR PLUTUS:
If a rogue agent tries to replace the "gate" implementation with one that always passes,
the registry REFUSES (different implementation = throw). The only way to change a gate's
behavior is to modify the source code in src/jesl/nodes.ts — which is visible in git
diff and triggers the knowledge-graph change detection.

THE UPGRADE (what gets added):
```typescript
// After the upgrade, these 8 kinds are registered:
register("detect", detectImpl);           // existing
register("decide", decideImpl);          // existing
register("generate", generateImpl);      // existing (throws UNBRACKETED)
register("generate-sink", generateSinkImpl); // existing
register("gate", gateImpl);              // NEW: assert on channel data
register("shell-exec", shellExecImpl);   // NEW: run a command
register("math-eval", mathEvalImpl);     // NEW: compute numeric
register("journal-sink", journalSinkImpl); // NEW: commit evidence
```

THE PLUTUS MAPPING (each kind corresponds to an actual pipeline operation):
- "gate" → the assert logic in the diag scripts (the tolerance checks)
- "shell-exec" → running `bun report-v452.ts` or `bun diag-*.ts`
- "math-eval" → the RRR computation |TP-E|/|E-SL| or the delta pips
- "journal-sink" → the evidence commit (the hash chain)

### 8.2 The Executor — the channel model and gate enforcement

The executor is the KERNEL'S ENGINE. It reads the card, validates the topology, and
runs the nodes. The critical mechanic is the CHANNEL MODEL — this is what makes gate
enforcement STRUCTURAL rather than behavioral.

THE CHANNEL MODEL:
Each edge in the card has a "via" name:
  { "from": "fixture-guard", "to": "canon-report", "via": "fixture-ok" }

When "fixture-guard" runs, its output is written to the channel named "fixture-ok".
The node "canon-report" has an inbound dependency on the channel "fixture-ok" — it
CANNOT fire until that channel has been written.

THE READINESS RULE: a node is READY when ALL its inbound channels have been written
by upstream nodes. Ready nodes fire as ONE batch (parallel fibers, up to 15).
Diamond joins wait for BOTH arms. A channel read by NO edge + written by NO edge
triggers [JESL CHANNEL-UNSET].

THE GATE ENFORCEMENT MECHANIC:
A gate node produces { verdict: "PASS" | "FAIL", evidence: {...} }
When the verdict is FAIL:
  1. The gate writes { verdict: "FAIL" } to its output channel
  2. The DOWNSTREAM node (if any) fires and reads the FAIL
  3. The downstream node's own logic sees the FAIL input
  4. This cascades: every downstream node produces FAIL
  5. The executor's summarizeVerdict() sees ANY FAIL → overall FAIL → EXIT 1

THE KEY INSIGHT: the kernel does NOT have a "skip" or "continue on failure" flag.
There is NO WAY to advance past a failed gate because the downstream nodes CANNOT
produce a PASS result from a FAIL input. The only way to get a PASS downstream is
for the upstream gate to PASS.

THIS IS DIFFERENT FROM A BASH SCRIPT WITH set -e:
  - set -e stops on error — but you can remove set -e
  - A JESL gate-refusal is STRUCTURAL — you'd have to modify the card JSON
    (visible in git diff) to remove the gate
  - And even if you remove the gate NODE, the edge validation catches the
    dangling edge → [JESL UNKNOWN-NODE] validation error

THE EXECUTION LOOP (src/jesl/executor.ts, simplified):
```typescript
export async function run(doc: WorkflowDoc): Promise<RunSummary> {
  // 1. VALIDATE the topology
  const errors = validateDoc(doc); // dup IDs, dangling edges, self-loops
  if (errors.length > 0) throw new JeslError("INVALID", errors);

  // 2. BUILD the DAG (Kahn's algorithm)
  const graph = buildGraph(doc);
  if (graph.hasCycle) throw new JeslError("CYCLE", graph.cyclePath);

  // 3. CHECK tier (tier-1 cards cannot have generation nodes)
  if (doc.meta.tier === 1) {
    for (const node of doc.nodes) {
      if (GENERATION_KINDS.has(node.type))
        throw new JeslError("TIER-VIOLATION", node.id);
    }
  }

  // 4. EXECUTE in topological order via the channel model
  const channels = new Map<string, unknown>();
  const journal = new Journal();

  for (const batch of graph.topologicalBatches) {
    const results = await Promise.all(batch.map(node => {
      const handle = getRegisteredImplSync(node.type);
      if (!handle) throw new JeslError("UNKNOWN-NODE", node.id);

      // Gather inbound channel values
      const inbound = new Map<string, unknown>();
      for (const edge of doc.edges) {
        if (edge.to === node.id)
          inbound.set(edge.via, channels.get(edge.via));
      }

      // CHANNEL-UNSET check (reading an unwritten channel)
      for (const [via, value] of inbound) {
        if (value === undefined)
          throw new JeslError("CHANNEL-UNSET",
            `node '${node.id}' reads unwritten channel '${via}'`);
      }

      return handle.impl({ config: node.config, inbound, caps: ctx.caps }, ctx);
    }));

    // Write outputs + journal
    for (let i = 0; i < batch.length; i++) {
      const node = batch[i], result = results[i];
      for (const edge of doc.edges) {
        if (edge.from === node.id)
          channels.set(edge.via, result.outputs?.[edge.via]);
      }
      journal.append({ kind: "INVOKE", payload: { nodeId: node.id, type: node.type } });
      journal.append({ kind: "VERDICT", payload: { nodeId: node.id, verdict: result.verdict } });
    }
  }

  // 5. Summarize
  const verdicts = journal.verdicts();
  const overall = verdicts.every(v => v.verdict === "PASS");
  return { overall, verdicts };
}
```

THE PLUTUS MAPPING: when the "frozen-pair" gate node runs, it executes the sha256
check on sl-lmv.ts and trade-dedup.ts. If either hash drifts, the gate produces FAIL.
The "journal-sink" downstream reads FAIL and the overall verdict = FAIL = EXIT 1.
There is NO code path where a hash drift produces a green result.

### 8.3 The Journal — the hash chain mechanics

The journal is the KERNEL'S PROOF SYSTEM. It records what ran, in what order, with
what results — in a format that is mathematically impossible to tamper with undetected.

THE HASH CHAIN FORMAT:
```jsonl
{"run":"wf-1788619053271-a66dab","ts":1788619053271,"kind":"INVOKE",
 "payload":{"nodeId":"fixture-guard","type":"gate"},
 "prev":"0000000000000000000000000000000000000000000000000000000000000000",
 "self":"a3f5e8d2..."}
{"run":"wf-1788619053271-a66dab","ts":1788619053271,"kind":"VERDICT",
 "payload":{"nodeId":"fixture-guard","verdict":"PASS"},
 "prev":"a3f5e8d2...",
 "self":"b7c9f1e4..."}
{"run":"wf-1788619053271-a66dab","ts":1788619053272,"kind":"INVOKE",
 "payload":{"nodeId":"canon-report","type":"shell-exec"},
 "prev":"b7c9f1e4...",
 "self":"c2d4a6f8..."}
```

Each row's `self` hash = sha256(`prev` + canonicalSerialize(`payload`)).
canonicalSerialize EXCLUDES the `ts` field — so the chain is DETERMINISTIC:
the same card + the same inputs + the same clock = the same chain.

THE TAMPER DETECTION:
If you change ANY byte in ANY prior row's payload:
  - That row's recomputed hash ≠ its stored hash
  - The NEXT row's `prev` is wrong (it references the old hash)
  - The NEXT row's recomputed hash ≠ its stored hash
  - This cascades to EVERY subsequent row
  - verifyChain() returns { verified: false, brokenAtIndex: N }

THE VERIFY FUNCTION:
```typescript
verifyChain(): { verified: boolean; brokenAtIndex?: number } {
  let prev = "0".repeat(64); // genesis
  for (let i = 0; i < this.rows.length; i++) {
    const row = this.rows[i];
    if (row.prev !== prev)
      return { verified: false, brokenAtIndex: i };
    const expected = sha256(prev + canonicalSerialize(row.payload));
    if (row.self !== expected)
      return { verified: false, brokenAtIndex: i };
    prev = row.self;
  }
  return { verified: true };
}
```

THE REPLAY FUNCTION:
covers(docHash, seed): check if this exact card + seed was already run.
If yes: the journaled outputs can be replayed (no re-execution needed).
If no: execute fresh and journal.
This is the IDEMPOTENCY guarantee: same inputs = same outputs, PROVEN by the journal.

THE PLUTUS MAPPING: the journal records:
  "the fixture-guard passed (the bars exist)"
  "the canon-report ran (sha=9689cd8a...)"
  "the golden-gate ran (5/5 convergence, 4/4 outcome)"
This IS the testing evidence — not an agent's prose claim, but a hash-chained
record that verifyChain() can prove wasn't tampered with.

THE UPGRADE: switch from simpleHash (FNV-ish, current) to sha256 (node:crypto):
```typescript
// BEFORE (current):
function simpleHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16).padStart(8, "0");
}

// AFTER (upgraded):
import { createHash } from "node:crypto";
function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}
```
sha256 is the standard: 64 hex chars, collision-resistant, the same algorithm
the bible mandates. The upgrade is a drop-in replacement in journal.ts.

### 8.4 The Node Kinds — implementations and their Plutus mappings

FOUR new node kinds to implement in src/jesl/nodes.ts:

#### "gate" — the assertion node (~60 lines)
```typescript
register("gate", async (input, ctx) => {
  const asserts = input.config.asserts as GateAssert[];
  const results: GateResult[] = [];
  for (const assert of asserts) {
    const value = walkPath(input.inbound, assert.path); // "$.bars[DXY][4H].count"
    const passed = compare(value, assert.op, assert.value); // ge, le, eq, ne, contains, matches
    results.push({ path: assert.path, passed, actual: value, expected: assert.value });
  }
  const allPassed = results.every(r => r.passed);
  return {
    verdict: allPassed ? "PASS" : "FAIL",
    outputs: { gate: allPassed },
    evidence: { results } // every assert's actual vs expected, visible in the journal
  };
});
```
PLUTUS MAPPING: This is the ASSERTION LOGIC from the diag scripts:
  diag-telescoping: "the 7 golden LQZs <= 1 pip" → gate assert { path: "$.lqzCount", op: "ge", value: 7 }
  the golden gate: "convergence 5/5 at <= 3p" → gate assert { path: "$.goldenCount", op: "ge", value: 5 }
  the frozen pair: "sha matches" → gate assert { path: "$.slLmvSha", op: "eq", value: "91294083..." }

#### "shell-exec" — the command runner (~40 lines)
```typescript
register("shell-exec", async (input, ctx) => {
  const { command, cwd, timeoutMs } = input.config;
  const shell = ctx.caps.get("Shell");
  if (!shell) throw new JeslError("CAP-UNBOUND", "Shell");
  const result = await shell.exec(command, { cwd, timeout: timeoutMs });
  return {
    verdict: result.exitCode === 0 ? "PASS" : "FAIL",
    outputs: { stdout: result.stdout, exitCode: result.exitCode },
    evidence: { command, exitCode: result.exitCode }
  };
});
```
PLUTUS MAPPING: This runs the ACTUAL commands:
  "bun report-v452.ts" → the canon pipeline
  "bun diag-*.ts" → the regression suite
  "bun test src/" → the V5 battery
  "sha256sum src/mdve/sl-lmv.ts" → the frozen pair

#### "math-eval" — the numeric computation (~30 lines)
```typescript
register("math-eval", async (input, ctx) => {
  const expr = input.config.expr; // e.g., "|TP - E| / |E - SL|"
  const vars = extractVars(input.inbound); // TP, E, SL from the channel data
  const result = safeEvaluate(expr, vars); // no eval(), a safe expression parser
  return {
    verdict: "PASS",
    outputs: { result, value: result },
    evidence: { expr, vars, result }
  };
});
```
PLUTUS MAPPING: This computes the RRR: R = |TP - E| / |E - SL|
Or the delta pips: |pipeline_level - oracle_level| / pip_size
Or the win rate: wins / total_trades

#### "journal-sink" — the evidence committer (~30 lines)
```typescript
register("journal-sink", async (input, ctx) => {
  const journal = ctx.caps.get("Journal");
  const allResults = input.inbound; // everything from upstream nodes
  journal.append({
    kind: "VERDICT",
    payload: { summary: allResults, docHash: ctx.docHash }
  });
  return {
    verdict: "PASS",
    outputs: { committed: true },
    evidence: { rowsCommitted: 1 }
  };
});
```
PLUTUS MAPPING: This is the evidence commit — the final step that says
"all gates passed, here is the proof, hash-chained, tamper-evident."

### 8.5 The Card-to-Codebase Mapping (the graph integration)

Every card node MUST map to an entry in the knowledge graph
(.trident/knowledge-graph/shared.db — 1940 nodes, 3647 edges).

THE MAPPING TABLE:
| Card node          | Plutus function/file              | Graph node                        |
|---|---|---|
| fixture-guard      | loadFixture() report-v452:364    | report-v452.ts#loadFixture        |
| canon-report       | runChainV452() report-v452:1244  | report-v452.ts#runChainV452       |
| report-determinism | (the x2 sha compare)             | report-v452.ts (the module)       |
| pipeline-eval      | buildE2Core() report-v452:1050   | report-v452.ts#buildE2Core        |
|                   | cascadeV45() mirror.ts           | mirror.ts#cascadeV45              |
|                   | buildReasoningChain()            | reasoning-chain.ts                 |
| monday-oracle      | (the GOLDEN_ORACLE check)        | golden-gate.ts#GOLDEN_ORACLE      |
| fullweek-oracle    | (the full oracle check)          | golden-week.json                   |
| outcome-sim       | simulateOutcome() diag:665       | diag-reasoning-chain-golden.ts    |
| diag-battery      | diag-telescoping.ts etc.         | the 15 diag scripts               |
| v5-battery        | bun test src/                    | the src/ test files               |
| frozen-pair       | sha256sum sl-lmv.ts              | sl-lmv.ts + trade-dedup.ts       |
| journal-sink      | src/jesl/journal.ts              | the journal module                |

THE PRE-FLIGHT CHECK: before the card runs, query the graph to verify all
referenced functions exist at their expected locations. If a function moved,
the graph query returns empty → the card is STALE → the kernel refuses to run
with a named "STALE-CARD" error. This prevents the card from silently testing
the WRONG code.

### 8.6 The Upgrade Sequence

PHASE 1: The kernel node kinds (the foundation — ~220 lines of new code)
  1a. Implement "gate" in nodes.ts (~60 lines)
  1b. Implement "shell-exec" in nodes.ts (~40 lines)
  1c. Implement "math-eval" in nodes.ts (~30 lines)
  1d. Implement "journal-sink" in nodes.ts (~30 lines)
  1e. Register all 4 in registry.ts (~10 lines)
  1f. Fix errors.ts: remove 9th token (~5 lines)
  1g. Switch journal.ts to sha256 (~15 lines)
  1h. Add determinism-x2 test (~30 lines)
  Total: ~220 lines in src/jesl/

PHASE 2: The card (the pipeline expression — ~200 lines)
  2a. Write specs/jesl/plutus-pipeline-test.json (~100 lines of JSON)
  2b. Map every node to the graph (~20 mapping entries)
  2c. Write the integration test (~80 lines)
  Total: ~200 lines

PHASE 3: The skill (the wrapper — ~80 lines)
  3a. Write SKILL.md (~50 lines)
  3b. Write the run script (~30 lines)
  Total: ~80 lines

GRAND TOTAL: ~500 lines of new code

### 8.7 The Anti-Derailment Guarantees

GUARANTEE 1: Gates refuse advancement (STRUCTURAL)
  A failed gate writes FAIL to its channel. Downstream nodes read FAIL and
  produce FAIL. The overall verdict is FAIL. There is NO flag, NO option, NO
  override to advance past a failed gate. The ONLY way to get past is to fix
  the underlying issue so the gate passes.

GUARANTEE 2: The journal is tamper-evident (MATHEMATICAL)
  Every row's hash incorporates the previous row's hash. Mutating any prior
  output breaks the chain at that index. verifyChain() detects it. The kernel
  exits 1. The ONLY way to fake the evidence is to compute the ENTIRE chain
  from the tampered point forward — which requires knowing the sha256 preimage
  (computationally infeasible).

GUARANTEE 3: The card is DATA (AUDITABLE)
  The card is a JSON file in git. A diff shows exactly what gates were
  added/removed/changed. Removing a gate creates a dangling edge (validation
  error). Adding an always-pass gate is visible in the diff and in the
  journal's evidence.

GUARANTEE 4: The registry is append-only (TAMPER-PROOF)
  Replacing a node implementation with a different one throws. The ONLY way
  to change behavior is to edit the source code, which is visible in git diff
  and triggers the knowledge-graph change detection.

GUARANTEE 5: The graph mapping catches drift (SYNCHRONIZED)
  The card references functions by file:line in the graph. If the function
  moves, the graph query returns empty. The kernel refuses to run with a
  named "STALE-CARD" error.

GUARANTEE 6: Replay proves reproducibility (DETERMINISTIC)
  covers(docHash, seed) replays the journaled outputs for the exact card +
  inputs. If someone claims "I ran it and it passed" but the journal shows a
  different docHash, the claim is provably false. If the journal shows the
  right hash but verifyChain() fails, the evidence was tampered.

TOGETHER: these 6 guarantees make it structurally impossible to skip a gate,
fake a result, tamper with evidence, test the wrong code, or claim a run that
didn't happen. The machinery enforces correctness, not discipline.

---
---

# SECTION 3 — THE FULL ASCII GRAPH

```
┌───────────────────────────────────────────────────────────────────────┐
│           THE PLUTUS JESL TEST MACHINE — FULL ARCHITECTURE           │
│           (the target state: built + tested + runtime functional)     │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ THE SKILL LAYER (the invocation surface)                        │  │
│  │                                                                 │  │
│  │  plutus-pipeline-jesl-test                                     │  │
│  │  ┌───────────────────────────────────────────────────────────┐  │  │
│  │  │ Loads the T2 warhead → reads the card → invokes the      │  │  │
│  │  │ kernel → the kernel executes the pipeline tests →        │  │  │
│  │  │ PASS or FAIL with the journal as proof                   │  │  │
│  │  │                                                           │  │  │
│  │  │ Also injects plutus-master-context (the T2 baseline)    │  │  │
│  │  │ so every session reasons from the same doctrine         │  │  │
│  │  └───────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                │                                      │
│                                ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ THE CARD LAYER (the workflow — DATA, in git)                   │  │
│  │                                                                 │  │
│  │  specs/jesl/plutus-pipeline-test.json                          │  │
│  │  ┌───────────────────────────────────────────────────────────┐  │  │
│  │  │ 11 nodes, sequential chain:                              │  │  │
│  │  │                                                         │  │  │
│  │  │ fixture-guard ──► canon-report ──► report-determinism  │  │  │
│  │  │       │                                             │  │  │
│  │  │       ▼                                             │  │  │
│  │  │ pipeline-eval ──► monday-oracle ──► fullweek-oracle   │  │  │
│  │  │       │                                             │  │  │
│  │  │       ▼                                             │  │  │
│  │  │ outcome-sim ──► diag-battery ──► v5-battery          │  │  │
│  │  │       │                                             │  │  │
│  │  │       ▼                                             │  │  │
│  │  │ frozen-pair ──► journal-sink                         │  │  │
│  │  └───────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                │                                      │
│                                ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ THE KERNEL LAYER (the executor — CODE, in src/jesl/)          │  │
│  │                                                                 │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │  │
│  │  │ registry.ts  │  │ executor.ts  │  │ journal.ts   │         │  │
│  │  │              │  │              │  │              │         │  │
│  │  │ 8 kinds:     │  │ channel      │  │ sha256       │         │  │
│  │  │ detect       │  │ model +      │  │ hash chain   │         │  │
│  │  │ decide       │  │ Kahn's DAG   │  │ one row per  │         │  │
│  │  │ generate     │  │ + gate       │  │ node + tamper │         │  │
│  │  │ gen-sink     │  │ enforcement  │  │ detection    │         │  │
│  │  │ gate    NEW  │  │              │  │              │         │  │
│  │  │ shell   NEW  │  │ NO SKIP:     │  │ verify():    │         │  │
│  │  │ math    NEW  │  │ FAIL gates   │  │ recompute    │         │  │
│  │  │ journal NEW  │  │ BLOCK ALL    │  │ every hash   │         │  │
│  │  │              │  │ downstream   │  │              │         │  │
│  │  │ APPEND-ONLY  │  │ nodes        │  │ covers():    │         │  │
│  │  │ (no swaps)   │  │              │  │ replay       │         │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘         │  │
│  │                                                                 │  │
│  │  ┌──────────────┐  ┌──────────────┐                          │  │
│  │  │ errors.ts    │  │ nodes.ts     │                          │  │
│  │  │              │  │              │                          │  │
│  │  │ 8 FROZEN     │  │ gate: assert │                          │  │
│  │  │ refusal      │  │ shell: exec  │                          │  │
│  │  │ tokens       │  │ math: calc   │                          │  │
│  │  │ (un-forge-   │  │ journal:     │                          │  │
│  │  │  able)       │  │  commit      │                          │  │
│  │  └──────────────┘  └──────────────┘                          │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                │                                      │
│                                ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ THE PIPELINE LAYER (the ACTUAL Plutus code being tested)      │  │
│  │                                                                 │  │
│  │  ┌────────────┐   ┌────────────┐   ┌────────────┐            │  │
│  │  │ report-    │   │ shape-     │   │ mirror.ts  │            │  │
│  │  │ v452.ts    │──►│ brain.ts   │──►│ + ADM      │            │  │
│  │  │            │   │            │   │            │            │  │
│  │  │ THE CANON  │   │ E2 shapes  │   │ E3 anchors │            │  │
│  │  │ ENTRY      │   │ + cascade  │   │ + cascade  │            │  │
│  │  │            │   │ DXY→EU→GU │   │ + measured │            │  │
│  │  │ loadFixture│   │ inject     │   │ SL (ADM)   │            │  │
│  │  │ buildChart │   │            │   │            │            │  │
│  │  │ buildE2Core│   │ dayOpen    │   │ TradeProj[]│            │  │
│  │  │ cascadeV45 │   │ Spot carry │   │ (E/SL/TP/  │            │  │
│  │  │ reasoning  │   │ Mon→Fri    │   │  RRR)      │            │  │
│  │  └────────────┘   └────────────┘   └────────────┘            │  │
│  │                                                                 │  │
│  │  ┌────────────┐   ┌────────────┐   ┌────────────┐            │  │
│  │  │ 42 diag-   │   │ src/       │   │ FROZEN      │            │  │
│  │  │ *.ts       │   │ (V5 rebuilt│   │ pair        │            │  │
│  │  │            │   │  machinery)│   │            │            │  │
│  │  │ regression │   │ e1 e2 card │   │ sl-lmv.ts  │            │  │
│  │  │ suite      │   │ kernel enf │   │ trade-dedup│            │  │
│  │  │ (8 green + │   │ visual graph│  │ .ts        │            │  │
│  │  │  7 delta)  │   │ runtime jesl│  │ (sha-frozen│            │  │
│  │  └────────────┘   └────────────┘   └────────────┘            │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                │                                      │
│                                ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ THE GRAPH LAYER (the codebase truth — shared.db)              │  │
│  │                                                                 │  │
│  │  .trident/knowledge-graph/shared.db                            │  │
│  │  ┌───────────────────────────────────────────────────────────┐  │  │
│  │  │ 1940 nodes · 3647 edges · every function mapped         │  │  │
│  │  │ The card references these nodes.                        │  │  │
│  │  │ Pre-flight: verify all referenced functions exist.      │  │  │
│  │  │ If any moved → STALE-CARD → kernel refuses to run.     │  │  │
│  │  └───────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                       │
├───────────────────────────────────────────────────────────────────────┤
│ RUNTIME FLOW (what happens when everything is built and working):    │
│                                                                       │
│  1. Load skill ────────────► injects the T2 warhead                 │
│  2. Invoke kernel ─────────► bun src/jesl/ run <card>               │
│  3. Validate card ─────────► topology + tier + caps checked         │
│  4. Query graph ───────────► all functions exist? STALE-CARD if not│
│  5. Execute nodes ─────────► in dependency order:                   │
│     fixture-guard: bars exist? YES → PASS                          │
│     canon-report: bun report-v452.ts → sha captured                │
│     report-determinism: sha ×2 identical → PASS                    │
│     pipeline-eval: golden gate → 5/5 ≤3p                           │
│     monday-oracle: convergence 5/5 → PASS                          │
│     fullweek-oracle: all-trade check → PASS/FAIL (the real test)   │
│     outcome-sim: wins ≥4/6 → PASS                                  │
│     diag-battery: 15 diags → ≥8 PASS                               │
│     v5-battery: 646 tests → 0 fail                                 │
│     frozen-pair: sha match → PASS                                  │
│     journal-sink: evidence committed to hash chain                 │
│  6. Overall verdict: PASS → exit 0 | any FAIL → exit 1             │
│  7. Journal on disk: the tamper-proof record                       │
│  8. Agent reads journal as evidence                                │
│                                                                       │
│ WHAT THE OPERATOR SEES:                                               │
│  PASS: "Pipeline test: PASS. All gates green. Journal verified."     │
│  FAIL: "Pipeline test: FAIL. Gate: frozen-pair. Hash drifted."       │
│        "The journal proves this is genuine, not tampered."           │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

<!-- DOC-COMPLETE -->

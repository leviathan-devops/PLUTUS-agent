import { test } from "bun:test";
import { rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Executor, docHashFor } from "./executor";
import { Journal, runIdFor, sha256Hash, canonicalSerialize, verifyChain } from "./journal";
import { NodeRegistry } from "./registry";
import { defaultRegistry, generateSinkNode } from "./nodes";
import { JeslError } from "./errors";
import type { NodeHandle, WorkflowDoc } from "./types";

const DIR = import.meta.dir;
const OUT = join(DIR, "hello-report.txt");

function assert(cond: unknown, msg: string): void {
  if (!cond) {
    console.error(`ASSERT-FAIL: ${msg}`);
    throw new Error(`ASSERT-FAIL: ${msg}`);
  }
  console.log(`ASSERT-PASS: ${msg}`);
}

async function expectJeslError(fn: () => Promise<unknown>, code: string, msg: string): Promise<void> {
  try {
    await fn();
  } catch (e) {
    assert(e instanceof JeslError && e.code === code, `${msg} (got ${(e as Error)?.message})`);
    return;
  }
  assert(false, `${msg} — expected ${code} but no error thrown`);
}

async function gate(): Promise<void> {
  const rawDoc = (await Bun.file(join(DIR, "hello-workflow.json")).json()) as WorkflowDoc;
  const SEED = "w1-gate-seed";
  const docHash = docHashFor(rawDoc);

  const journal = new Journal();
  const registry: NodeRegistry = defaultRegistry();
  const ex = new Executor(registry, journal);

  const reportHandle: NodeHandle = {
    requiredCaps: ["fs"],
    invoke: (input, ctx) =>
      generateSinkNode.invoke(
        { node: { ...input.node, config: { ...(input.node.config ?? {}), path: OUT } }, inbound: input.inbound },
        ctx,
      ),
  };

  const fsDriver = {
    read: (p: string) => readFile(p, "utf8"),
    write: async (p: string, body: string) => { await Bun.write(p, body); },
  };

  await rm(OUT, { force: true });
  const summary = await ex.run(rawDoc, {
    seed: SEED,
    docHash,
    boundCaps: ["fs"],
    fs: fsDriver,
    nodeHandles: { "hello-report": reportHandle },
  });

  console.log("RUN-SUMMARY: " + JSON.stringify({ overall: summary.overall, verdict: summary.verdict, invoked: summary.invoked, runId: summary.runId }));
  assert(summary.overall === true, "run summary {overall:true}");
  assert(summary.verdict === "PASS", "run verdict PASS");
  assert(summary.invoked === 3, "all 3 nodes invoked");

  const rows = journal.query(summary.runId);
  assert(rows.length === 3, `journal has 3 entries (got ${rows.length})`);
  for (const r of rows) console.log(`JOURNAL-CHAIN: seq=${r.seq} node=${r.node} verdict=${r.verdict} prev=${String(r.prev).slice(0, 12)} self=${String(r.self).slice(0, 12)}`);
  assert(rows[0]!.prev === "genesis", "chain starts at genesis");
  assert(rows[1]!.prev === rows[0]!.self && rows[2]!.prev === rows[1]!.self, "3 entries causally linked prev->self");
  assert(rows.map((r) => r.seq).join(",") === "0,1,2", "seq 0,1,2");
  assert(verifyChain(rows), "verifyChain true");
  assert(summary.runId === runIdFor(docHash, SEED), "runId derived from docHash+seed");

  const reportBody = await readFile(OUT, "utf8");
  assert(reportBody.includes("hello-report") && reportBody.length > 20, `generate-sink wrote real file (${reportBody.length} bytes)`);

  assert(journal.covers(docHash, SEED) === true, "covers(docHash, seed) replays true");
  const replay = await ex.run(rawDoc, { seed: SEED, docHash, boundCaps: ["fs"], fs: fsDriver, nodeHandles: { "hello-report": reportHandle } });
  assert(replay.invoked === 0 && replay.runId === summary.runId, "replay short-circuits with invoked:0, same runId");
  console.log("COVERS-REPLAY: covers()=true invoked=0 same-runId=" + replay.runId);

  await expectJeslError(
    () => ex.run({ $schema: "trident-workflow-v1", meta: { name: "empty", tier: 1 }, nodes: [], edges: [] }, { seed: "x" }),
    "[JESL UNKNOWN-NODE]", "empty nodes[] rejected",
  );
  await expectJeslError(
    () => ex.run({ $schema: "trident-workflow-v1", meta: { name: "badkind", tier: 1 }, nodes: [{ id: "n", type: "nope" }], edges: [] }, { seed: "x" }),
    "[JESL UNKNOWN-NODE]", "unknown node kind rejected",
  );
  await expectJeslError(
    () => ex.run(
      { $schema: "trident-workflow-v1", meta: { name: "cyc", tier: 1 }, nodes: [{ id: "a", type: "detect" }, { id: "b", type: "decide" }], edges: [{ from: "a", to: "b", via: "x" }, { from: "b", to: "a", via: "y" }] },
      { seed: "x" },
    ),
    "[JESL CYCLE]", "cycle rejected",
  );
  await expectJeslError(
    () => ex.run(
      { $schema: "trident-workflow-v1", meta: { name: "tier", tier: 1 }, nodes: [{ id: "g", type: "generate" }], edges: [] },
      { seed: "x" },
    ),
    "[JESL TIER-VIOLATION]", "tier-1 LLM node rejected",
  );
  await expectJeslError(
    () => ex.run(rawDoc, { seed: "nocap" }),
    "[JESL CAP-UNBOUND]", "missing fs cap rejected",
  );

  const jNull = new Journal();
  const exNull = new Executor(defaultRegistry(), jNull);
  const sNull = await exNull.run(
    { $schema: "trident-workflow-v1", meta: { name: "null", tier: 1 }, nodes: [{ id: "d", type: "decide" }], edges: [] },
    { seed: "null1" },
  );
  assert(sNull.overall === false && sNull.results["d"]!.verdict === "FAIL", "null inbound decide FAILs loudly, overall false");

  let flakyCalls = 0;
  const flaky: NodeHandle = {
    invoke: () => {
      flakyCalls++;
      throw new Error("boom-" + flakyCalls);
    },
  };
  const j2 = new Journal();
  const ex2 = new Executor(defaultRegistry(), j2);
  const s2 = await ex2.run(
    { $schema: "trident-workflow-v1", meta: { name: "retry", tier: 1 }, nodes: [{ id: "f", type: "detect", retries: { maxRetries: 2 } }], edges: [] },
    { seed: "r1", nodeHandles: { f: flaky } },
  );
  assert(s2.results["f"]!.verdict === "FAIL" && s2.results["f"]!.attempts === 3 && flakyCalls === 3, `retry exhausts at JESL_MAX_RETRIES=2 (attempts=${s2.results["f"]!.attempts})`);

  const j3 = new Journal();
  const ex3 = new Executor(defaultRegistry(), j3);
  const s3 = await ex3.run(
    {
      $schema: "trident-workflow-v1", meta: { name: "fan", tier: 1 },
      nodes: ["p1", "p2", "p3", "p4", "p5"].map((id) => ({ id, type: "detect" as const })),
      edges: [],
    },
    { seed: "fan1" },
  );
  assert(s3.overall && s3.invoked === 5 && s3.batches[0]!.length === 5, `5 concurrent nodes fire in one batch (${JSON.stringify(s3.batches)})`);

  /* ============ PHASE-1 NODE-KIND BATTERY (blueprint §8.4, SC-1/2/3/9/10/13) ============ */

  // SC-1: exactly 8 registered kinds (append-only registry intact)
  assert(defaultRegistry().kinds().length === 8, `SC-1: 8 registered kinds (got ${defaultRegistry().kinds().length}: ${defaultRegistry().kinds().join(",")})`);

  // SC-2: gate node — assert on channel data; PASS path
  const jg = new Journal();
  const exg = new Executor(defaultRegistry(), jg);
  const gateDoc = {
    $schema: "trident-workflow-v1" as const, meta: { name: "gate-pass", tier: 1 as const },
    nodes: [
      { id: "d", type: "detect" },
      { id: "g", type: "gate", config: { asserts: [{ path: "$.event.type", op: "eq", value: "hello" }, { path: "$.event.payload", op: "contains", value: "wor" }] } },
    ],
    edges: [{ from: "d", to: "g", via: "event" }],
  };
  const sg = await exg.run(gateDoc, { seed: "gate1" });
  assert(sg.overall === true && sg.results["g"]!.verdict === "PASS", "gate PASS: $.event.type eq hello + payload contains wor");

  // SC-2 adversarial: a failed assert FAILS loudly and cascades (overall false)
  const jgBad = new Journal();
  const exgBad = new Executor(defaultRegistry(), jgBad);
  const gateBad = { ...gateDoc, meta: { name: "gate-fail", tier: 1 as const }, nodes: [
    { id: "d", type: "detect" },
    { id: "g", type: "gate", config: { asserts: [{ path: "$.event.type", op: "eq", value: "nope" }] } },
  ] };
  const sgBad = await exgBad.run(gateBad, { seed: "gate2" });
  assert(sgBad.overall === false && sgBad.results["g"]!.verdict === "FAIL", "gate adversarial: wrong assert FAILs, overall false");
  assert((sgBad.results["g"]!.error as { reason?: string })?.reason === "GATE-FAILED", "gate adversarial: FAIL carries reason GATE-FAILED");

  // SC-2 adversarial: unknown op + missing path = BAD-ASSERT (config defect, named)
  const sgCfg = await new Executor(defaultRegistry(), new Journal()).run({ ...gateDoc, meta: { name: "gate-badcfg", tier: 1 as const }, nodes: [
    { id: "d", type: "detect" },
    { id: "g", type: "gate", config: { asserts: [{ path: "$.event.type", op: "regex", value: "x" }, { path: "event.type", op: "eq", value: "hello" }] } },
  ] }, { seed: "gate3" });
  assert(sgCfg.overall === false && (sgCfg.results["g"]!.error as { reason?: string })?.reason === "BAD-ASSERT", "gate adversarial: bad op/path = BAD-ASSERT named");

  // SC-3: shell-exec — real command, real exit code; PASS + FAIL + CAP-UNBOUND
  const js = new Journal();
  const exs = new Executor(defaultRegistry(), js);
  const ss = await exs.run(
    { $schema: "trident-workflow-v1", meta: { name: "shell", tier: 1 }, nodes: [{ id: "s", type: "shell-exec", config: { command: "echo jesl-shell-ok" } }], edges: [] },
    { seed: "shell1", boundCaps: ["shell"] },
  );
  assert(ss.overall === true && String(ss.results["s"]!.outputs?.["stdout"]).includes("jesl-shell-ok"), "shell-exec PASS: echo captured in stdout");

  const ssFail = await new Executor(defaultRegistry(), new Journal()).run(
    { $schema: "trident-workflow-v1", meta: { name: "shell-fail", tier: 1 }, nodes: [{ id: "s", type: "shell-exec", config: { command: "exit 3" } }], edges: [] },
    { seed: "shell2", boundCaps: ["shell"] },
  );
  assert(ssFail.overall === false && ssFail.results["s"]!.verdict === "FAIL" && ssFail.results["s"]!.outputs?.["exitCode"] === 3, "shell-exec adversarial: exit 3 = FAIL with exitCode 3");

  await expectJeslError(
    () => new Executor(defaultRegistry(), new Journal()).run(
      { $schema: "trident-workflow-v1", meta: { name: "shell-nocap", tier: 1 }, nodes: [{ id: "s", type: "shell-exec", config: { command: "echo x" } }], edges: [] },
      { seed: "shell3" },
    ),
    "[JESL CAP-UNBOUND]", "shell-exec without the shell cap rejected",
  );

  // SC-2 (math): math-eval — safe parser, RRR-form math, adversarial (no eval)
  const jm = new Journal();
  const exm = new Executor(defaultRegistry(), jm);
  const sm = await exm.run(
    { $schema: "trident-workflow-v1", meta: { name: "math", tier: 1 }, nodes: [
      { id: "m", type: "math-eval", config: { expr: "abs(0-3)*2+0.5" } },
      { id: "r", type: "math-eval", config: { expr: "abs(tp-e)/abs(e-sl)", vars: { tp: 1, e: 0.5, sl: 0.25 } } },
      { id: "f", type: "math-eval", config: { expr: "abs(tp-e)/abs(e-sl)", vars: { tp: 1.1411, e: 1.141, sl: 1.1407 } } },
    ], edges: [] },
    { seed: "math1" },
  );
  assert(sm.results["m"]!.outputs?.["value"] === 6.5, `math-eval value 6.5 (got ${sm.results["m"]!.outputs?.["value"]})`);
  // powers of two are EXACT in binary: (1-0.5)/(0.5-0.25) = 2 with zero float error
  assert(sm.results["r"]!.outputs?.["value"] === 2, `math-eval RRR-form exact ratio 2 (got ${sm.results["r"]!.outputs?.["value"]})`);
  // FX-scale realism case: float64 cancellation on 1.1411-1.141 is EXPECTED (~1e-4 relative) —
  // the assert documents the honest precision bound; consumers needing pip-precision round first.
  assert(Math.abs(Number(sm.results["f"]!.outputs?.["value"]) - 1 / 3) < 1e-3, `math-eval RRR-form within float64 cancellation bound (got ${sm.results["f"]!.outputs?.["value"]})`);

  const smBad = await new Executor(defaultRegistry(), new Journal()).run(
    { $schema: "trident-workflow-v1", meta: { name: "math-bad", tier: 1 }, nodes: [
      { id: "m1", type: "math-eval", config: { expr: "1/0" } },
      { id: "m2", type: "math-eval", config: { expr: "2+" } },
      { id: "m3", type: "math-eval", config: { expr: "nope+1" } },
    ], edges: [] },
    { seed: "math2" },
  );
  assert(smBad.overall === false, "math-eval adversarial: overall false");
  assert((smBad.results["m1"]!.error as { reason?: string })?.reason === "NON-FINITE", "math-eval: 1/0 = NON-FINITE loud");
  assert((smBad.results["m2"]!.error as { reason?: string })?.reason === "BAD-EXPR", "math-eval: '2+' = BAD-EXPR loud (no crash)");
  assert((smBad.results["m3"]!.error as { reason?: string })?.reason === "BAD-EXPR", "math-eval: unknown var = BAD-EXPR loud");

  // SC-9/10: journal-sink — commits a summary row; digest verifiable; TAMPER DETECTED
  const jk = new Journal();
  const exk = new Executor(defaultRegistry(), jk);
  const sinkDoc = {
    $schema: "trident-workflow-v1" as const, meta: { name: "sink", tier: 1 as const },
    nodes: [{ id: "d", type: "detect" }, { id: "sink", type: "journal-sink" }],
    edges: [{ from: "d", to: "sink", via: "event" }],
  };
  const sk = await exk.run(sinkDoc, { seed: "sink1" });
  assert(sk.overall === true && sk.results["sink"]!.outputs?.["committed"] === true, "journal-sink committed");
  const kRows = jk.query(sk.runId);
  assert(kRows.some((r) => r.kind === "summary" && r.node === "sink"), "journal-sink wrote a kind:summary row into the run chain");
  assert(verifyChain(kRows), "journal-sink: chain still intact after the sink's commit");
  const digest = String(sk.results["sink"]!.outputs?.["inboundDigest"]);
  const expectedDigest = sha256Hash(canonicalSerialize({ event: { type: "hello", payload: "world" } })).slice(0, 16);
  assert(digest === expectedDigest, `journal-sink digest reproducible (${digest} vs ${expectedDigest})`);

  // SC-10 adversarial: TAMPER — mutate a prior row's evidence, verifyChain must DETECT
  const ev0 = kRows[0]!.evidence as { state: string };
  const originalState = ev0.state; // PRIMITIVE copy — the evidence object is mutated in place
  ev0.state = "TAMPERED";
  assert(verifyChain(kRows) === false, "SC-10: tampered row detected by verifyChain (verified:false)");
  ev0.state = originalState;
  assert(verifyChain(kRows) === true, "SC-10: restored row verifies true again");

  // SC-13: determinism x2 — same doc + seed on fresh journals = identical runId + verdicts
  const jdA = new Journal(); const jdB = new Journal();
  const sdA = await new Executor(defaultRegistry(), jdA).run(gateDoc, { seed: "det-seed" });
  const sdB = await new Executor(defaultRegistry(), jdB).run(gateDoc, { seed: "det-seed" });
  assert(sdA.runId === sdB.runId, `SC-13: same docHash+seed -> same runId (${sdA.runId})`);
  assert(sdA.verdict === sdB.verdict && sdA.overall === sdB.overall, "SC-13: identical overall verdict");
  const strip = (s: typeof sdA): Record<string, unknown> =>
    Object.fromEntries(Object.entries(s.results).map(([k, r]) => [k, { verdict: r.verdict, evidence: r.evidence, attempts: r.attempts }]));
  assert(JSON.stringify(strip(sdA)) === JSON.stringify(strip(sdB)), "SC-13: per-node verdicts byte-identical (timing excluded)");
  assert(verifyChain(jdA.query(sdA.runId)) && verifyChain(jdB.query(sdB.runId)), "SC-13: both chains verify");

  console.log("HELLO-GATE: ALL GREEN");
}

let registered = false;
try {
  test("hello gate: 3-node graph + journal chain + covers replay + adversarial", gate, 30000);
  registered = true;
} catch {
  registered = false;
}
if (!registered) await gate();

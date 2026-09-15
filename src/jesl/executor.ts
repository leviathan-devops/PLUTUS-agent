import { JeslError, JESL_MAX_RETRIES } from "./errors";
import type {
  EdgeDecl, FsDriver, NodeHandle, NodeInput, NodeResult, RunDriverCtx,
  RunSummary, Verdict, WorkflowDoc,
} from "./types";
import { Journal, canonicalSerialize, runIdFor, sha256Hash, verifyChain } from "./journal";
import type { NodeRegistry } from "./registry";

const LLM_TOUCHING_KINDS = new Set(["prompt", "shadow-agent", "subagent-dispatch", "generation", "generate", "llm"]);
const MAX_NODES_FIRING = 15;
const RUN_DEADLINE_MS = 60000;

export function docHashFor(doc: WorkflowDoc): string {
  return sha256Hash(canonicalSerialize({ nodes: doc.nodes, edges: doc.edges, meta: doc.meta }));
}

export function decodeDoc(input: unknown): WorkflowDoc {
  const err = (field: string, actual: string): JeslError =>
    new JeslError({
      code: "[JESL UNKNOWN-NODE]", node: "workflow", field,
      expected: "valid WorkflowDoc: $schema='trident-workflow-v1', meta{name,tier}, nodes[] non-empty unique ids, edges[] from/to/via",
      actual: actual.slice(0, 300), remedy: "fix the document to match the schema",
    });
  if (typeof input !== "object" || input === null) throw err("workflow", String(input));
  const d = input as Record<string, unknown>;
  if (d["$schema"] !== "trident-workflow-v1") throw err("$schema", String(d["$schema"]));
  const metaRaw: unknown = d["meta"];
  if (typeof metaRaw !== "object" || metaRaw === null) throw err("meta", JSON.stringify(metaRaw ?? null));
  const meta = metaRaw as { name: unknown; tier: unknown };
  if (typeof meta.name !== "string") throw err("meta", JSON.stringify(metaRaw));
  if (meta.tier !== 1 && meta.tier !== 2) throw err("meta.tier", String(meta.tier));
  const nodes: unknown = d["nodes"];
  if (!Array.isArray(nodes) || nodes.length === 0) throw err("nodes", "empty or missing nodes[]");
  const seen = new Set<string>();
  for (const n of nodes) {
    const nn = n as Record<string, unknown>;
    if (typeof nn["id"] !== "string" || typeof nn["type"] !== "string") throw err("nodes[]", JSON.stringify(n));
    const id = nn["id"] as string;
    if (seen.has(id)) throw err("nodes[id]", `duplicate id '${id}'`);
    seen.add(id);
  }
  const edges: unknown = d["edges"];
  if (!Array.isArray(edges)) throw err("edges", "missing edges[]");
  for (const e of edges as EdgeDecl[]) {
    if (typeof e.from !== "string" || typeof e.to !== "string" || typeof e.via !== "string") throw err("edges[]", JSON.stringify(e));
    if (!seen.has(e.from)) throw err("edges[from]", `unknown node '${e.from}'`);
    if (!seen.has(e.to)) throw err("edges[to]", `unknown node '${e.to}'`);
  }
  return d as unknown as WorkflowDoc;
}

export function validateDoc(doc: WorkflowDoc, isKnownKind: (kind: string) => boolean): void {
  for (const n of doc.nodes) {
    if (!isKnownKind(n.type)) {
      throw new JeslError({
        code: "[JESL UNKNOWN-NODE]", node: n.id, field: "type",
        expected: "a registered registry kind", actual: n.type,
        remedy: "fix the typo or register the kind (append-only)",
      });
    }
  }
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of doc.nodes) { indeg.set(n.id, 0); adj.set(n.id, []); }
  for (const e of doc.edges) {
    if (e.from === e.to) {
      throw new JeslError({
        code: "[JESL CYCLE]", node: e.from, field: "edges",
        expected: "acyclic channel graph", actual: `cycle through [${e.from}→${e.from}]`,
        remedy: "break the cycle with a gate",
      });
    }
    adj.get(e.from)!.push(e.to);
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  }
  const queue = doc.nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0).map((n) => n.id);
  const order: string[] = [];
  for (let qi = 0; qi < queue.length; qi++) {
    const u = queue[qi]!;
    order.push(u);
    for (const v of adj.get(u) ?? []) {
      const dd = (indeg.get(v) ?? 0) - 1;
      indeg.set(v, dd);
      if (dd === 0) queue.push(v);
    }
  }
  if (order.length < doc.nodes.length) {
    const cyc = doc.nodes.filter((n) => (indeg.get(n.id) ?? 0) > 0).map((n) => n.id);
    throw new JeslError({
      code: "[JESL CYCLE]", node: cyc[0] ?? doc.nodes[0]!.id, field: "edges",
      expected: "acyclic channel graph", actual: `cycle through [${cyc.join("→")}]`,
      remedy: "break the cycle with a gate, or re-arm via event-reactivate",
    });
  }
  if (doc.meta.tier === 1) {
    for (const n of doc.nodes) {
      if (LLM_TOUCHING_KINDS.has(n.type)) {
        throw new JeslError({
          code: "[JESL TIER-VIOLATION]", node: n.id, field: "meta.tier",
          expected: "tier 2 (bracketed generation) or tier 1 with no LLM-touching nodes",
          actual: `tier 1 with generation node ${n.id} (type=${n.type})`,
          remedy: "raise meta.tier to 2 or replace the generator with a deterministic kind",
        });
      }
    }
  }
}

function summarizeVerdict(results: Record<string, NodeResult>): Verdict {
  const vals = Object.values(results);
  if (vals.some((r) => r.verdict === "FAIL")) return "FAIL";
  if (vals.some((r) => r.verdict === "INCONCLUSIVE")) return "INCONCLUSIVE";
  if (vals.length > 0 && vals.every((r) => r.verdict === "READY_FALSE")) return "READY_FALSE";
  return "PASS";
}

async function invokeWithRetry(
  handle: NodeHandle | undefined,
  input: NodeInput,
  ctx: RunDriverCtx,
  nodeId: string,
  wfName: string,
): Promise<NodeResult> {
  const startMs = Date.now();
  const maxRetries = input.node.retries?.maxRetries ?? JESL_MAX_RETRIES;
  if (!handle) {
    const endMs = Date.now();
    return {
      verdict: "PASS",
      evidence: { pattern: "executor.invoke", state: "FIRED", anchor: `workflow/${wfName}/${nodeId}` },
      timing: { startMs, endMs }, attempts: 1,
    };
  }
  let attempt = 0;
  let lastThrown: unknown = undefined;
  while (attempt <= maxRetries) {
    try {
      const r = await handle.invoke(input, ctx);
      if (!r || !r.verdict || !r.evidence) {
        throw new Error(`node ${nodeId} returned a malformed NodeResult`);
      }
      return { ...r, attempts: attempt + 1 };
    } catch (e) {
      lastThrown = e;
      if (e instanceof JeslError) throw e;
      attempt++;
      if (attempt > maxRetries) break;
    }
  }
  const endMs = Date.now();
  const msg = lastThrown instanceof Error ? lastThrown.message : String(lastThrown);
  return {
    verdict: "FAIL",
    // "RETRY-EXHAUSTED" is a verdict REASON, NOT a JeslCode refusal token
    // (exactly-8 law, SC-5): refusals throw and block the run; exhaustion
    // produces a loud FAIL result with the underlying error message.
    error: { reason: "RETRY-EXHAUSTED", message: msg },
    evidence: { pattern: "executor.retry", state: "EXHAUSTED", anchor: `workflow/${wfName}/${nodeId}:exhausted` },
    timing: { startMs, endMs }, attempts: maxRetries + 1,
  };
}

export interface RunOptions {
  readonly seed?: string;
  readonly vars?: Record<string, unknown>;
  readonly boundCaps?: ReadonlyArray<string>;
  readonly fs?: FsDriver;
  readonly nodeHandles?: Record<string, NodeHandle>;
  readonly docHash?: string;
}

export class Executor {
  constructor(
    private readonly registry: NodeRegistry,
    private readonly journal: Journal,
  ) {
    if (!registry) throw new Error("Executor: missing NodeRegistry");
    if (!journal) throw new Error("Executor: missing Journal");
  }

  get nodeRegistry(): NodeRegistry { return this.registry; }
  get journalService(): Journal { return this.journal; }

  async run(rawDoc: unknown, opts: RunOptions = {}): Promise<RunSummary> {
    const doc = decodeDoc(rawDoc);
    validateDoc(doc, (k) => this.registry.isKnownKind(k));
    const wfName = doc.meta.name;
    const seed = opts.seed ?? "";
    const docHash = opts.docHash ?? docHashFor(doc);
    const runId = runIdFor(docHash, seed);
    const existing = this.journal.query(runId);
    if (existing.length > 0) {
      if (!verifyChain(existing)) {
        throw new JeslError({
          code: "[JESL ORACLE-MISSING]", node: wfName, field: "journal",
          expected: "an intact journal chain for replay", actual: `corrupt chain for run ${runId}`,
          remedy: "clear the journal and re-run — never consume a corrupt replay",
        });
      }
      if (this.journal.covers(docHash, seed)) {
        const results: Record<string, NodeResult> = {};
        for (const r of existing) {
          if (r.kind !== "verdict" || !r.verdict) continue;
          if (!results[r.node]) {
            results[r.node] = {
              verdict: r.verdict,
              evidence: r.evidence ?? { pattern: "replay", state: r.verdict, anchor: `${r.node}:replay` },
              timing: { startMs: r.ts, endMs: r.ts }, attempts: 0,
            };
          }
        }
        const verdict = summarizeVerdict(results);
        return { runId, verdict, overall: verdict === "PASS", invoked: 0, results, batches: [], rows: existing };
      }
    }

    const inbound = new Map<string, Set<string>>();
    const outbound = new Map<string, Array<{ to: string; via: string }>>();
    for (const n of doc.nodes) { inbound.set(n.id, new Set()); outbound.set(n.id, []); }
    for (const e of doc.edges) {
      inbound.get(e.to)?.add(e.via);
      outbound.get(e.from)?.push({ to: e.to, via: e.via });
    }
    const nodeMap = new Map(doc.nodes.map((n) => [n.id, n] as const));
    const written = new Map<string, unknown>();
    const seedVars: Record<string, unknown> = { ...(doc.vars ?? {}), ...(opts.vars ?? {}) };
    if (seed) seedVars["seed"] = seed;
    for (const [k, v] of Object.entries(seedVars)) written.set(k, v);

    const bound = new Set(opts.boundCaps ?? []);
    if (opts.fs) bound.add("fs");
    // journal rides ctx so journal-sink nodes can commit evidence rows into
    // the SAME run's hash chain (one chain per run — no forked evidence).
    const ctxBase: RunDriverCtx = { runId, doc, fs: opts.fs, journal: this.journal, boundCaps: bound, vars: seedVars };

    const completed = new Set<string>();
    const results: Record<string, NodeResult> = {};
    const batches: string[][] = [];
    const startedAt = Date.now();

    while (completed.size < doc.nodes.length) {
      if (Date.now() - startedAt > RUN_DEADLINE_MS) {
        throw new JeslError({
          code: "[JESL CYCLE]", node: wfName, field: "run",
          expected: "all nodes to fire before the deadline", actual: `stalled with ${doc.nodes.length - completed.size} unfired`,
          remedy: "check for unwritten channels — a node fires only when ALL inbound channels are written",
        });
      }
      const ready: string[] = [];
      for (const n of doc.nodes) {
        if (completed.has(n.id)) continue;
        const req = inbound.get(n.id) ?? new Set();
        let ok = true;
        for (const ch of req) {
          if (!written.has(ch)) { ok = false; break; }
        }
        if (ok) ready.push(n.id);
      }
      if (ready.length === 0) {
        const pending = doc.nodes.filter((n) => !completed.has(n.id)).map((n) => n.id);
        throw new JeslError({
          code: "[JESL CHANNEL-UNSET]", node: pending[0] ?? wfName, field: "channels",
          expected: "written channels for all inbound edges", actual: `deadlock: no ready node among [${pending.join(",")}]`,
          remedy: "seed the missing channel (--in / driver channel) or fix the edge.via name",
        });
      }
      const batch = ready.slice(0, MAX_NODES_FIRING);
      batches.push([...batch]);
      for (const nodeId of batch) {
        const node = nodeMap.get(nodeId)!;
        const impl = this.registry.get(node.type);
        const handle: NodeHandle | undefined = opts.nodeHandles?.[nodeId] ?? (impl ? { invoke: impl.invoke, requiredCaps: impl.requiredCaps } : undefined);
        const reqCaps = handle?.requiredCaps ?? [];
        for (const cap of reqCaps) {
          if (!bound.has(cap)) {
            throw new JeslError({
              code: "[JESL CAP-UNBOUND]", node: nodeId, field: "caps",
              expected: `driver Layer providing ${cap}`, actual: cap,
              remedy: "run under a driver that binds the cap, or drop the node",
            });
          }
        }
        const req = inbound.get(nodeId) ?? new Set();
        const inboundData: Record<string, unknown> = {};
        for (const ch of req) {
          if (!written.has(ch)) {
            throw new JeslError({
              code: "[JESL CHANNEL-UNSET]", node: nodeId, field: ch,
              expected: "a written channel", actual: "unset",
              remedy: "seed it (--in / driver channel) or fix the edge.via name",
            });
          }
          inboundData[ch] = written.get(ch);
        }
        const input: NodeInput = { node, inbound: inboundData };
        const nr = await invokeWithRetry(handle, input, ctxBase, nodeId, wfName);
        this.journal.append({
          run: runId, node: nodeId, kind: "verdict", verdict: nr.verdict,
          evidence: nr.evidence, source: `workflow/${wfName}/${nodeId}`,
        });
        const outs = outbound.get(nodeId) ?? [];
        for (const e of outs) {
          const val = (nr.outputs as Record<string, unknown> | undefined)?.[e.via]
            ?? (nr.outputs as Record<string, unknown> | undefined)?.["default"]
            ?? { ok: 1 };
          written.set(e.via, val);
        }
        results[nodeId] = nr;
        completed.add(nodeId);
      }
    }
    const rows = this.journal.query(runId);
    const verdict = summarizeVerdict(results);
    return { runId, verdict, overall: verdict === "PASS", invoked: Object.keys(results).length, results, batches, rows };
  }
}

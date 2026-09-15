import type { NodeInput, NodeResult, Triplet } from "./types";
import { JeslError } from "./errors";
import type { NodeImpl } from "./registry";
import { NodeRegistry } from "./registry";
import { canonicalSerialize, sha256Hash } from "./journal";

function matchGlob(pattern: string, value: string): boolean {
  if (pattern === "*") return true;
  const esc = pattern.replace(/[-[\]{}()+?.\\^$|]/g, "\\$&");
  return new RegExp(`^${esc.replace(/\*/g, ".*")}$`).test(value);
}

export const detectNode: NodeImpl = {
  kind: "detect",
  family: "detect",
  requiredCaps: [],
  invoke: (input: NodeInput): NodeResult => {
    const t = Date.now();
    const cfg = (input.node.config ?? {}) as { pattern?: string; event?: unknown; channel?: string };
    const pattern = cfg.pattern ?? "*";
    const inboundVals = Object.values(input.inbound);
    const ev = cfg.event ?? inboundVals[0] ?? { type: "hello", payload: "world" };
    if (ev === null || ev === undefined) {
      return {
        verdict: "READY_FALSE",
        evidence: { pattern: `detect:${pattern}`, state: "READY_FALSE", anchor: `${input.node.id}:no-event` },
        timing: { startMs: t, endMs: t },
      };
    }
    if (typeof ev === "object" && (ev as Record<string, unknown>)["type"] !== undefined) {
      const type = String((ev as Record<string, unknown>)["type"]);
      if (!matchGlob(pattern, type)) {
        return {
          verdict: "READY_FALSE",
          evidence: { pattern: `detect:${pattern}`, state: "DROPPED", anchor: `${input.node.id}:drop` },
          timing: { startMs: t, endMs: t },
        };
      }
    }
    return {
      verdict: "PASS",
      evidence: { pattern: `detect:${pattern}`, state: "MATCHED", anchor: `${input.node.id}:matched` },
      timing: { startMs: t, endMs: t },
      outputs: { greeting: typeof ev === "string" ? ev : JSON.stringify(ev), event: ev },
    };
  },
};

export const decideNode: NodeImpl = {
  kind: "decide",
  family: "decide",
  requiredCaps: [],
  invoke: (input: NodeInput): NodeResult => {
    const t = Date.now();
    const cfg = (input.node.config ?? {}) as { rule?: string; threshold?: number; field?: string };
    const inboundVals = Object.values(input.inbound);
    const raw = inboundVals[0];
    if (raw === null || raw === undefined) {
      return {
        verdict: "FAIL",
        error: { message: `decide ${input.node.id}: no inbound value` },
        evidence: { pattern: "decide", state: "FAIL", anchor: `${input.node.id}:no-input` },
        timing: { startMs: t, endMs: t },
      };
    }
    const text = typeof raw === "string" ? raw : JSON.stringify(raw);
    const rule = cfg.rule ?? "non-empty";
    let pass: boolean;
    if (rule === "non-empty") pass = text.length > 0;
    else if (rule === "contains" && typeof cfg.field === "string") pass = text.includes(cfg.field);
    else if (rule === "min-length" && typeof cfg.threshold === "number") pass = text.length >= cfg.threshold;
    else pass = text.length > 0;
    if (!pass) {
      return {
        verdict: "FAIL",
        error: { message: `decide ${input.node.id}: rule '${rule}' rejected input` },
        evidence: { pattern: "decide", state: "REJECTED", anchor: `${input.node.id}:rejected` },
        timing: { startMs: t, endMs: t },
      };
    }
    return {
      verdict: "PASS",
      evidence: { pattern: "decide", state: "DECIDED", anchor: `${input.node.id}:decided` },
      timing: { startMs: t, endMs: t },
      outputs: { decision: `accept:${text.slice(0, 120)}`, approved: true },
    };
  },
};

export const generateNode: NodeImpl = {
  kind: "generate",
  family: "generate",
  requiredCaps: ["llm"],
  invoke: (input: NodeInput): NodeResult => {
    const t = Date.now();
    throw new JeslError({
      code: "[JESL UNBRACKETED-GENERATION]", node: input.node.id, field: "type",
      expected: "a bracketed Activity with an Llm cap (tier 2)", actual: "bare generate invoke with no model driver",
      remedy: "run under a tier-2 driver binding jesl/Llm, or use generate-sink for file output",
    });
  },
};

export const generateSinkNode: NodeImpl = {
  kind: "generate-sink",
  family: "generate",
  requiredCaps: ["fs"],
  invoke: async (input: NodeInput, ctx): Promise<NodeResult> => {
    const startMs = Date.now();
    const cfg = (input.node.config ?? {}) as { path?: string; template?: string };
    const inboundVals = Object.values(input.inbound);
    const decision = inboundVals[0];
    if (decision === null || decision === undefined) {
      const t = Date.now();
      return {
        verdict: "FAIL",
        error: { message: `generate-sink ${input.node.id}: no inbound decision` },
        evidence: { pattern: "generate-sink", state: "FAIL", anchor: `${input.node.id}:no-input` },
        timing: { startMs, endMs: t },
      };
    }
    const path = cfg.path ?? (typeof (input.inbound as Record<string, unknown>)["path"] === "string"
      ? (input.inbound as Record<string, unknown>)["path"] as string
      : undefined);
    if (!path) {
      const t = Date.now();
      return {
        verdict: "FAIL",
        error: { message: `generate-sink ${input.node.id}: missing path` },
        evidence: { pattern: "generate-sink", state: "FAIL", anchor: `${input.node.id}:missing-path` },
        timing: { startMs, endMs: t },
      };
    }
    if (!ctx.fs) {
      throw new JeslError({
        code: "[JESL CAP-UNBOUND]", node: input.node.id, field: "caps",
        expected: "driver Layer providing fs", actual: "fs",
        remedy: "run under a driver that binds the fs cap, or drop the node",
      });
    }
    const text = typeof decision === "string" ? decision : JSON.stringify(decision, null, 2);
    const body = (cfg.template ?? "hello-report\n============\n{decision}\n").replace("{decision}", text);
    try {
      await ctx.fs.write(path, body);
    } catch (e) {
      const t = Date.now();
      const msg = e instanceof Error ? e.message : String(e);
      return {
        verdict: "FAIL",
        error: { message: `generate-sink write failed: ${msg}` },
        evidence: { pattern: "generate-sink.write", state: "FAIL", anchor: `${input.node.id}:${path}` },
        timing: { startMs, endMs: t },
      };
    }
    const endMs = Date.now();
    return {
      verdict: "PASS",
      evidence: { pattern: "generate-sink.write", state: "PASS", anchor: `${input.node.id}:${path}` },
      timing: { startMs, endMs },
      outputs: { path, bytesWritten: body.length, report: body },
    };
  },
};

export function defaultRegistry(): NodeRegistry {
  const r = new NodeRegistry();
  r.register(detectNode);
  r.register(decideNode);
  r.register(generateNode);
  r.register(generateSinkNode);
  r.register(gateNode);
  r.register(shellExecNode);
  r.register(mathEvalNode);
  r.register(journalSinkNode);
  return r;
}

/* ============================================================
 * PHASE-1 NODE KINDS (Plutus_JESL_Blueprints.md §8.4)
 * gate / shell-exec / math-eval / journal-sink — each maps a
 * REAL Plutus operation: assertion gates (diag asserts), command
 * runs (bun report-v452.ts, bun test, sha256sum), numeric oracles
 * (RRR = |TP-E|/|E-SL|), and the evidence commit (hash chain).
 *
 * ISE NOTE: the regexes below are MECHANICAL DETECTORS only (the
 * path-segment splitter and the arithmetic lexer) — classification
 * is structural: gate asserts are typed members {path,op,value}
 * resolved by walking the REAL object graph (Order-2), each emitting
 * a per-assert evidence record {path,actual,expected,passed,why};
 * the node verdict is the emitted state. No regex decides anything.
 * ============================================================ */

/** Output-capture calibration: kernel journal rows stay bounded (a runaway command cannot flood the evidence chain). */
const MAX_STDOUT_CAPTURE = 8000;
const MAX_STDERR_CAPTURE = 2000;
/** Digest length for content-commit anchors (16 hex of the sha256 — collision-safe for evidence pointers). */
const DIGEST_LEN = 16;

/** Resolve "$.channel.seg[0].seg" against the inbound channel map. Returns { ok, value } — never throws. */
function resolvePath(inbound: Record<string, unknown>, path: string): { ok: boolean; value?: unknown; why?: string } {
  if (typeof path !== "string" || !path.startsWith("$.")) {
    return { ok: false, why: `path must start with '$.' (got ${JSON.stringify(path)})` };
  }
  const segs = path.slice(2).split(".").filter((s) => s.length > 0);
  if (segs.length === 0) return { ok: false, why: "empty path after '$.'" };
  let cur: unknown = inbound;
  for (const seg of segs) {
    const bracket = seg.match(/^([^[\]]*)\[(.+)\]$/);
    const keys: string[] = [];
    if (bracket) {
      if (bracket[1]) keys.push(bracket[1]!);
      keys.push(bracket[2]!);
    } else {
      keys.push(seg);
    }
    for (const k of keys) {
      if (cur === null || cur === undefined) return { ok: false, why: `segment '${k}': parent is ${String(cur)}` };
      if (Array.isArray(cur)) {
        const idx = Number(k);
        if (!Number.isInteger(idx) || idx < 0 || idx >= cur.length) {
          return { ok: false, why: `index '${k}' out of bounds (len ${cur.length})` };
        }
        cur = cur[idx];
      } else if (typeof cur === "object") {
        const rec = cur as Record<string, unknown>;
        if (!(k in rec)) return { ok: false, why: `key '${k}' absent` };
        cur = rec[k];
      } else {
        return { ok: false, why: `segment '${k}': parent is primitive ${typeof cur}` };
      }
    }
  }
  return { ok: true, value: cur };
}

function compare(op: string, actual: unknown, expected: unknown): { pass: boolean; why?: string } {
  switch (op) {
    case "eq": return { pass: actual === expected };
    case "ne": return { pass: actual !== expected };
    case "ge":
    case "le":
    case "gt":
    case "lt": {
      const a = Number(actual);
      const b = Number(expected);
      if (Number.isNaN(a) || Number.isNaN(b)) return { pass: false, why: `non-numeric operand for '${op}'` };
      if (op === "ge") return { pass: a >= b };
      if (op === "le") return { pass: a <= b };
      if (op === "gt") return { pass: a > b };
      return { pass: a < b };
    }
    case "contains": {
      if (typeof actual === "string" && typeof expected === "string") return { pass: actual.includes(expected) };
      if (Array.isArray(actual)) return { pass: actual.includes(expected) };
      return { pass: false, why: "contains requires string|string or array|value" };
    }
    case "matches": {
      if (typeof actual !== "string") return { pass: false, why: "matches requires a string actual" };
      try {
        return { pass: new RegExp(String(expected)).test(actual) };
      } catch (e) {
        return { pass: false, why: `invalid pattern: ${e instanceof Error ? e.message : String(e)}` };
      }
    }
    default:
      return { pass: false, why: `unknown op '${op}' (use eq|ne|ge|le|gt|lt|contains|matches)` };
  }
}

/** "gate" — assert on channel data (blueprint §8.4). The diag-assert logic as a node. */
export const gateNode: NodeImpl = {
  kind: "gate",
  family: "gate",
  requiredCaps: [],
  invoke: (input: NodeInput): NodeResult => {
    const t = Date.now();
    const cfg = (input.node.config ?? {}) as {
      asserts?: ReadonlyArray<{ path?: string; op?: string; value?: unknown }>;
    };
    const asserts = cfg.asserts ?? [];
    if (asserts.length === 0) {
      return {
        verdict: "FAIL",
        error: { reason: "BAD-ASSERT", message: `gate ${input.node.id}: config.asserts is empty — a gate with no asserts is theater` },
        evidence: { pattern: "gate", state: "BAD-ASSERT", anchor: `${input.node.id}:no-asserts` },
        timing: { startMs: t, endMs: t },
      };
    }
    const results = asserts.map((a) => {
      const path = a.path ?? "";
      const res = resolvePath(input.inbound, path);
      if (!res.ok) {
        return { path, op: a.op ?? "", expected: a.value, actual: undefined, passed: false, why: res.why };
      }
      const cmp = compare(a.op ?? "eq", res.value, a.value);
      return { path, op: a.op ?? "eq", expected: a.value, actual: res.value, passed: cmp.pass, why: cmp.why };
    });
    const failed = results.filter((r) => !r.passed);
    if (failed.length > 0) {
      return {
        verdict: "FAIL",
        error: {
          reason: failed.some((f) => f.why && (f.why.startsWith("unknown op") || f.why.startsWith("path must") || f.why.startsWith("empty path"))) ? "BAD-ASSERT" : "GATE-FAILED",
          message: `gate ${input.node.id}: ${failed.length}/${results.length} asserts failed — ` +
            failed.map((f) => `${f.path} ${f.op} ${JSON.stringify(f.expected)} (actual ${JSON.stringify(f.actual)})${f.why ? ` [${f.why}]` : ""}`).join("; "),
          failed,
        },
        evidence: { pattern: "gate", state: "FAIL", anchor: `${input.node.id}:${failed.length}-failed` },
        timing: { startMs: t, endMs: t },
        outputs: { gate: false, results },
      };
    }
    return {
      verdict: "PASS",
      evidence: { pattern: "gate", state: "PASS", anchor: `${input.node.id}:${results.length}-asserts` },
      timing: { startMs: t, endMs: t },
      outputs: { gate: true, results },
    };
  },
};

/** "shell-exec" — run a command (blueprint §8.4). REQUIRED cap: "shell". */
export const shellExecNode: NodeImpl = {
  kind: "shell-exec",
  family: "effect",
  requiredCaps: ["shell"],
  invoke: async (input: NodeInput): Promise<NodeResult> => {
    const startMs = Date.now();
    const cfg = (input.node.config ?? {}) as { command?: unknown; timeoutMs?: number; cwd?: string };
    if (typeof cfg.command !== "string" || cfg.command.trim().length === 0) {
      const t = Date.now();
      return {
        verdict: "FAIL",
        error: { reason: "BAD-CONFIG", message: `shell-exec ${input.node.id}: config.command must be a non-empty string` },
        evidence: { pattern: "shell-exec", state: "BAD-CONFIG", anchor: `${input.node.id}:no-command` },
        timing: { startMs, endMs: t },
      };
    }
    const proc = Bun.spawn(["bash", "-c", cfg.command], {
      cwd: cfg.cwd,
      stdout: "pipe",
      stderr: "pipe",
      stdin: "ignore",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    const endMs = Date.now();
    const pass = exitCode === 0;
    return {
      verdict: pass ? "PASS" : "FAIL",
      error: pass ? undefined : { reason: "COMMAND-FAILED", message: `shell-exec ${input.node.id}: exit ${exitCode} — ${stderr.slice(0, 500)}`, exitCode },
      evidence: { pattern: "shell-exec", state: pass ? "PASS" : "FAIL", anchor: `${input.node.id}:exit-${exitCode}` },
      timing: { startMs, endMs },
      outputs: { stdout: stdout.slice(0, MAX_STDOUT_CAPTURE), stderr: stderr.slice(0, MAX_STDERR_CAPTURE), exitCode, command: cfg.command },
    };
  },
};

/* ---------- math-eval: a safe recursive-descent arithmetic parser. NO eval(). ---------- */

type Tok = { t: "num"; v: number } | { t: "id"; v: string } | { t: "op"; v: string };

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j]!)) j++;
      const v = Number(src.slice(i, j));
      if (Number.isNaN(v)) throw new Error(`bad number literal at ${i}: '${src.slice(i, j)}'`);
      toks.push({ t: "num", v });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[a-zA-Z0-9_]/.test(src[j]!)) j++;
      toks.push({ t: "id", v: src.slice(i, j) });
      i = j;
      continue;
    }
    if ("+-*/%^(),".includes(c)) {
      toks.push({ t: "op", v: c });
      i++;
      continue;
    }
    throw new Error(`illegal character '${c}' at ${i}`);
  }
  return toks;
}

const MATH_FNS: Record<string, (...args: number[]) => number> = {
  abs: Math.abs, sqrt: Math.sqrt, min: Math.min, max: Math.max,
  round: Math.round, floor: Math.floor, ceil: Math.ceil,
};

function evalExpr(src: string, vars: Record<string, unknown>): number {
  const toks = tokenize(src);
  let pos = 0;
  const peek = (): Tok | undefined => toks[pos];
  const eat = (v: string): void => {
    const tok = toks[pos];
    if (!tok || tok.t !== "op" || tok.v !== v) throw new Error(`expected '${v}' at token ${pos}`);
    pos++;
  };
  const parseExpr = (): number => {
    let left = parseTerm();
    for (;;) {
      const tok = peek();
      if (tok && tok.t === "op" && (tok.v === "+" || tok.v === "-")) {
        pos++;
        const right = parseTerm();
        left = tok.v === "+" ? left + right : left - right;
      } else return left;
    }
  };
  const parseTerm = (): number => {
    let left = parseFactor();
    for (;;) {
      const tok = peek();
      if (tok && tok.t === "op" && (tok.v === "*" || tok.v === "/" || tok.v === "%")) {
        pos++;
        const right = parseFactor();
        left = tok.v === "*" ? left * right : tok.v === "/" ? left / right : left % right;
      } else return left;
    }
  };
  const parseFactor = (): number => {
    const base = parseUnary();
    const tok = peek();
    if (tok && tok.t === "op" && tok.v === "^") {
      pos++;
      return Math.pow(base, parseFactor()); // right-assoc
    }
    return base;
  };
  const parseUnary = (): number => {
    const tok = peek();
    if (tok && tok.t === "op" && (tok.v === "-" || tok.v === "+")) {
      pos++;
      const v = parseUnary();
      return tok.v === "-" ? -v : v;
    }
    return parsePrimary();
  };
  const parsePrimary = (): number => {
    const tok = peek();
    if (!tok) throw new Error("unexpected end of expression");
    if (tok.t === "num") { pos++; return tok.v; }
    if (tok.t === "id") {
      pos++;
      const name = tok.v;
      const next = peek();
      if (next && next.t === "op" && next.v === "(") {
        const fn = MATH_FNS[name];
        if (!fn) throw new Error(`unknown function '${name}'`);
        eat("(");
        const args: number[] = [];
        const first = peek();
        if (!(first && first.t === "op" && first.v === ")")) {
          args.push(parseExpr());
          while (peek() && peek()!.t === "op" && peek()!.v === ",") { pos++; args.push(parseExpr()); }
        }
        eat(")");
        return fn(...args);
      }
      if (!(name in vars)) throw new Error(`unknown variable '${name}'`);
      const v = Number(vars[name]);
      if (Number.isNaN(v)) throw new Error(`variable '${name}' is not numeric (${JSON.stringify(vars[name])})`);
      return v;
    }
    if (tok.t === "op" && tok.v === "(") {
      pos++;
      const v = parseExpr();
      eat(")");
      return v;
    }
    throw new Error(`unexpected token '${JSON.stringify(tok)}' at ${pos}`);
  };
  const result = parseExpr();
  if (pos !== toks.length) throw new Error(`trailing tokens from ${pos} (of ${toks.length})`);
  return result;
}

/** "math-eval" — safe numeric computation (blueprint §8.4). The RRR / delta-pips oracle math. */
export const mathEvalNode: NodeImpl = {
  kind: "math-eval",
  family: "math",
  requiredCaps: [],
  invoke: (input: NodeInput): NodeResult => {
    const t = Date.now();
    const cfg = (input.node.config ?? {}) as { expr?: unknown; vars?: Record<string, unknown> };
    if (typeof cfg.expr !== "string" || cfg.expr.trim().length === 0) {
      return {
        verdict: "FAIL",
        error: { reason: "BAD-CONFIG", message: `math-eval ${input.node.id}: config.expr must be a non-empty string` },
        evidence: { pattern: "math-eval", state: "BAD-CONFIG", anchor: `${input.node.id}:no-expr` },
        timing: { startMs: t, endMs: t },
      };
    }
    // variable scope: config.vars win, then merged inbound object values
    const merged: Record<string, unknown> = {};
    for (const v of Object.values(input.inbound)) {
      if (v !== null && typeof v === "object" && !Array.isArray(v)) Object.assign(merged, v);
    }
    Object.assign(merged, cfg.vars ?? {});
    try {
      const value = evalExpr(cfg.expr, merged);
      if (!Number.isFinite(value)) {
        return {
          verdict: "FAIL",
          error: { reason: "NON-FINITE", message: `math-eval ${input.node.id}: '${cfg.expr}' evaluated to ${value}` },
          evidence: { pattern: "math-eval", state: "NON-FINITE", anchor: `${input.node.id}:non-finite` },
          timing: { startMs: t, endMs: t },
        };
      }
      return {
        verdict: "PASS",
        evidence: { pattern: "math-eval", state: "PASS", anchor: `${input.node.id}=${value}` },
        timing: { startMs: t, endMs: t },
        outputs: { value, expr: cfg.expr },
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        verdict: "FAIL",
        error: { reason: "BAD-EXPR", message: `math-eval ${input.node.id}: '${cfg.expr}' — ${msg}` },
        evidence: { pattern: "math-eval", state: "BAD-EXPR", anchor: `${input.node.id}:bad-expr` },
        timing: { startMs: t, endMs: t },
      };
    }
  },
};

/** "journal-sink" — commit the run's evidence into the hash chain (blueprint §8.4). */
export const journalSinkNode: NodeImpl = {
  kind: "journal-sink",
  family: "effect",
  requiredCaps: [],
  invoke: (input: NodeInput, ctx): NodeResult => {
    const t = Date.now();
    if (!ctx.journal) {
      throw new JeslError({
        code: "[JESL CAP-UNBOUND]", node: input.node.id, field: "journal",
        expected: "an executor-provided Journal on ctx (the run's own chain)", actual: "ctx.journal is absent",
        remedy: "run under an Executor (it binds ctx.journal automatically), not a bare handle",
      });
    }
    const channels = Object.keys(input.inbound);
    if (channels.length === 0) {
      return {
        verdict: "FAIL",
        error: { reason: "NO-INBOUND", message: `journal-sink ${input.node.id}: nothing inbound to commit — a sink with no upstream evidence is a card defect` },
        evidence: { pattern: "journal-sink", state: "NO-INBOUND", anchor: `${input.node.id}:no-inbound` },
        timing: { startMs: t, endMs: t },
      };
    }
    // content digest: the committed evidence is tamper-evident on CONTENT,
    // not just on the row — recomputing this digest verifies what was committed.
    const digest = sha256Hash(canonicalSerialize(input.inbound)).slice(0, DIGEST_LEN);
    const triplet: Triplet = { pattern: "journal-sink", state: "COMMITTED", anchor: `${input.node.id}:${digest}` };
    ctx.journal.append({
      run: ctx.runId,
      node: input.node.id,
      kind: "summary",
      evidence: triplet,
      source: `workflow/${ctx.doc.meta.name}/${input.node.id}`,
    });
    return {
      verdict: "PASS",
      evidence: triplet,
      timing: { startMs: t, endMs: Date.now() },
      outputs: { committed: true, inboundDigest: digest, inboundChannels: channels },
    };
  },
};

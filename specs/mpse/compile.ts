// specs/mpse/compile.ts — the W0 gate harness, step 1.
//
// Parses every specs/mpse/S-*.md per the S-FILE FORMAT CONTRACT (wave-plan.md):
// file header `# S-<n> — <title>`, file keys spec:/form:/sources:, then
// `### B-<n>-<slug> — <title>` blocks carrying fixed-order key lines
// quote:/anchor:/kind:/expr:/oracle:/fixtures:.
//
// D13 is enforced MECHANICALLY here: a block without a non-empty quote or a
// doc:line anchor is a D13_VIOLATION and compile FAILS LOUD naming the block.
// Output: specs/mpse/battery.json {fingerprint, blockCount, predicateCount,
// predicates:[{id, spec, block, kind, oracle, fixtures}]} with the invariant
// predicateCount === blockCount (1:1). fingerprint = sha256 over the
// concatenated block ids + quotes (deterministic: files alphabetical, blocks in
// document order; no timestamps anywhere).
//
// Usage: bun specs/mpse/compile.ts [files...] [--out <path>] [--help]
//   no files  → compile specs/mpse/S-*.md (the gate path, O-0.5)
//   explicit  → compile exactly those files (the selftest path)
// Exit: 0 = battery written; 1 = LOUD named failure. No external deps.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve, basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUT = join(SCRIPT_DIR, "battery.json");

const FORM_KINDS = new Set(["piecewise", "forall", "predicate-family", "process"]);
const BLOCK_KINDS = new Set([
  "piecewise", "forall", "exists-unique", "equality",
  "inequality", "recurrence", "subset", "process",
]);

export interface PredicateDescriptor {
  id: string;
  spec: string;
  block: string;
  kind: string;
  oracle: string;
  fixtures: string[];
}

interface ParsedBlock extends PredicateDescriptor {
  quote: string;
}

export class CompileError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "CompileError";
  }
}

function printHelp(): void {
  console.log(`compile.ts — S-file parser + D13 gate + battery.json writer (W0 harness)
usage: bun specs/mpse/compile.ts [files...] [--out <path>]
  files      explicit S-files to compile (default: specs/mpse/S-*.md)
  --out      battery output path (default: specs/mpse/battery.json)
contract: '# S-<n> — <title>' + spec:/form: + '### B-<n>-<slug> — <title>'
  blocks carrying quote:/anchor:/kind:/expr:/oracle:/fixtures: lines.
  A block without a non-empty quote + doc:line anchor = D13_VIOLATION, exit 1.
exit 0 = battery written with predicateCount == blockCount.`);
}

function parseSFile(path: string): { spec: string; blocks: ParsedBlock[] } {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (err) {
    throw new CompileError(`file not readable '${path}': ${(err as Error).message}`);
  }
  const lines = text.split("\n").map((l) => (l.endsWith("\r") ? l.slice(0, -1) : l));

  const headerIdx = lines.findIndex((l) => l.startsWith("# "));
  if (headerIdx === -1) throw new CompileError(`'${path}': missing '# S-<n> — <title>' header`);
  const headerMatch = /^#\s+(S-\d+)\s+—\s+(.+)$/.exec(lines[headerIdx]!.trim());
  if (!headerMatch) throw new CompileError(`'${path}': malformed header '${lines[headerIdx]!.trim()}'`);
  const spec = headerMatch[1] as string;

  let specLine: string | null = null;
  let formLine: string | null = null;
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("spec:")) specLine = t.slice("spec:".length).trim();
    else if (t.startsWith("form:")) formLine = t.slice("form:".length).trim();
    if (specLine !== null && formLine !== null) break;
  }
  if (specLine === null) throw new CompileError(`'${path}': missing 'spec: S-<n>' line`);
  if (specLine !== spec) {
    throw new CompileError(`'${path}': spec line '${specLine}' disagrees with header '${spec}'`);
  }
  if (formLine === null || !FORM_KINDS.has(formLine)) {
    throw new CompileError(`'${path}': missing/invalid 'form:' line (want one of ${[...FORM_KINDS].join("|")})`);
  }

  // Split blocks on '### ' headers; '## Blocks' never collides ('## ' prefix).
  const rawParts: string[][] = [];
  let current: string[] | null = null;
  for (const line of lines) {
    if (line.startsWith("### ")) {
      if (current !== null) rawParts.push(current);
      current = [line];
    } else if (current !== null) {
      current.push(line);
    }
  }
  if (current !== null) rawParts.push(current);
  if (rawParts.length === 0) throw new CompileError(`'${path}': zero '### B-<n>-<slug> — <title>' blocks`);

  const blocks: ParsedBlock[] = [];
  for (const part of rawParts) {
    const headLine = (part[0] as string).slice("### ".length).trim();
    const headMatch = /^(B-\d+-[A-Za-z0-9_-]+)\s+—\s+(.+)$/.exec(headLine);
    if (!headMatch) throw new CompileError(`'${path}': malformed block header '### ${headLine}'`);
    const blockId = headMatch[1] as string;

    const fields = new Map<string, string>();
    for (const line of part.slice(1)) {
      const t = line.trim();
      if (t.length === 0) continue;
      const kv = /^(quote|anchor|kind|expr|oracle|fixtures):\s?(.*)$/.exec(t);
      if (!kv) {
        throw new CompileError(`'${path}' block ${blockId}: malformed line '${t}' (want key: value, keys quote|anchor|kind|expr|oracle|fixtures)`);
      }
      const key = kv[1] as string;
      if (fields.has(key)) throw new CompileError(`'${path}' block ${blockId}: duplicate '${key}:' line`);
      fields.set(key, (kv[2] as string).trim());
    }

    // D13 gate: non-empty quote + doc:line anchor, or LOUD fail naming the block.
    const rawQuote = fields.get("quote");
    if (rawQuote === undefined) throw new CompileError(`D13_VIOLATION '${path}' block ${blockId}: missing quote: line`);
    const quoteMatch = /^"(.+)"$/.exec(rawQuote);
    const quote = quoteMatch ? (quoteMatch[1] as string).trim() : "";
    if (quote.length === 0) {
      throw new CompileError(`D13_VIOLATION '${path}' block ${blockId}: empty quote (doctrine is QUOTED, never synthesized)`);
    }
    const rawAnchor = fields.get("anchor");
    if (rawAnchor === undefined || rawAnchor.length === 0) {
      throw new CompileError(`D13_VIOLATION '${path}' block ${blockId}: missing anchor: line`);
    }
    for (const anchorPart of rawAnchor.split(",")) {
      if (!/.+:\d+$/.test(anchorPart.trim())) {
        throw new CompileError(`D13_VIOLATION '${path}' block ${blockId}: malformed anchor '${anchorPart.trim()}' (want doc:line)`);
      }
    }
    const kind = fields.get("kind");
    if (kind === undefined || !BLOCK_KINDS.has(kind)) {
      throw new CompileError(`'${path}' block ${blockId}: missing/invalid kind: (want one of ${[...BLOCK_KINDS].join("|")})`);
    }
    const expr = fields.get("expr");
    if (expr === undefined || expr.length === 0) {
      throw new CompileError(`'${path}' block ${blockId}: missing expr:`);
    }
    const oracle = fields.get("oracle");
    if (oracle === undefined || oracle.length === 0) {
      throw new CompileError(`'${path}' block ${blockId}: missing oracle:`);
    }
    const rawFixtures = fields.get("fixtures");
    if (rawFixtures === undefined || !/^\[.*\]$/.test(rawFixtures)) {
      throw new CompileError(`'${path}' block ${blockId}: missing/malformed fixtures: [..]`);
    }
    const fixtures = rawFixtures
      .slice(1, -1)
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    blocks.push({ id: `${spec}/${blockId}`, spec, block: blockId, kind, oracle, fixtures, quote });
  }
  return { spec, blocks };
}

export function compileFiles(files: string[]): { fingerprint: string; predicates: PredicateDescriptor[] } {
  const seen = new Set<string>();
  const all: ParsedBlock[] = [];
  const ordered = [...files].sort();
  for (const f of ordered) {
    const { blocks } = parseSFile(f);
    for (const b of blocks) {
      if (seen.has(b.id)) throw new CompileError(`duplicate block id '${b.id}' (in '${f}')`);
      seen.add(b.id);
      all.push(b);
    }
  }
  const hash = createHash("sha256");
  for (const b of all) hash.update(`${b.id}\n${b.quote}\n`);
  const fingerprint = hash.digest("hex");
  const predicates: PredicateDescriptor[] = all.map((b) => ({
    id: b.id,
    spec: b.spec,
    block: b.block,
    kind: b.kind,
    oracle: b.oracle,
    fixtures: b.fixtures,
  }));
  return { fingerprint, predicates };
}

function run(argv: string[]): number {
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return 0;
  }
  const args = [...argv];
  let out = DEFAULT_OUT;
  const outIdx = args.indexOf("--out");
  if (outIdx !== -1) {
    if (outIdx + 1 >= args.length) {
      console.error("COMPILE_FAIL: missing value for --out");
      return 1;
    }
    out = resolve(args[outIdx + 1] as string);
    args.splice(outIdx, 2);
  }
  let files = args.map((a) => resolve(a));
  if (files.length === 0) {
    let entries: string[];
    try {
      entries = readdirSync(SCRIPT_DIR)
        .filter((e) => /^S-.*\.md$/.test(e))
        .map((e) => join(SCRIPT_DIR, e));
    } catch (err) {
      console.error(`COMPILE_FAIL: cannot list '${SCRIPT_DIR}': ${(err as Error).message}`);
      return 1;
    }
    files = entries.sort();
    if (files.length === 0) {
      console.error(`COMPILE_FAIL: no S-*.md files in '${SCRIPT_DIR}'`);
      return 1;
    }
  } else {
    for (const f of files) {
      if (!existsSync(f)) {
        console.error(`COMPILE_FAIL: file not found '${f}'`);
        return 1;
      }
    }
  }

  let compiled: { fingerprint: string; predicates: PredicateDescriptor[] };
  try {
    compiled = compileFiles(files);
  } catch (err) {
    console.error(`COMPILE_FAIL: ${(err as Error).message}`);
    return 1;
  }
  if (compiled.predicates.length === 0) {
    console.error("COMPILE_FAIL: integrity invariant broken: zero predicates compiled");
    return 1;
  }
  const battery = {
    fingerprint: compiled.fingerprint,
    blockCount: compiled.predicates.length,
    predicateCount: compiled.predicates.length,
    predicates: compiled.predicates,
  };
  try {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, `${JSON.stringify(battery, null, 2)}\n`);
  } catch (err) {
    console.error(`COMPILE_FAIL: cannot write '${out}': ${(err as Error).message}`);
    return 1;
  }
  console.log(`COMPILE_OK: ${battery.blockCount} blocks → ${battery.predicateCount} predicates, fingerprint ${battery.fingerprint}`);
  console.log(`battery: ${out} (inputs: ${files.map((f) => basename(f)).join(", ")})`);
  return 0;
}

process.exitCode = run(process.argv.slice(2));

// specs/mpse/jspec-check.ts — the W0 shared format checker (landed FIRST by the orchestrator).
// ISE NAMING (the warhead's requirement): the regexes here are the mechanical DETECTOR layer
// ONLY — the contract being checked is line-oriented text (the S-FILE FORMAT CONTRACT is
// literally fixed-order `key: value` lines), so structural matchers over lines ARE the
// Order-2 mechanism; there is no AST to confirm because the artifact IS text, not code.
// The DECISION layer is the named-failure verdict list below (each failure names its block
// and its contract clause) — a fail-state list, never a default-pass: exit 1 on ANY named
// failure, exit 0 only when every block carries every required key. That is the
// INCONCLUSIVE-never-PASS discipline in checker form.
// Every W0 S-author runs this against their output files and pastes the report — the
// execution-class verification for the spec corpus. Loud-fail-or-clear-pass: exit 0 = the
// file conforms; exit 1 = the named failures.
// Usage: bun specs/mpse/jspec-check.ts <file.md> [more.md ...]
//        bun specs/mpse/jspec-check.ts --json <file.json> [more.json ...]
import { readFileSync, existsSync } from "node:fs";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("USAGE: bun specs/mpse/jspec-check.ts [--json] <file> [...]");
  process.exit(1);
}
const jsonMode = args[0] === "--json";
const files = jsonMode ? args.slice(1) : args;

let failed = false;
for (const f of files) {
  if (!existsSync(f)) {
    console.error(`FAIL ${f}: FILE NOT FOUND`);
    failed = true;
    continue;
  }
  const text = readFileSync(f, "utf8");
  if (jsonMode) {
    try {
      const parsed = JSON.parse(text);
      const keys = Object.keys(parsed);
      console.log(`PASS ${f}: valid JSON, top-level keys=[${keys.join(",")}]`);
    } catch (e) {
      console.error(`FAIL ${f}: invalid JSON — ${(e as Error).message}`);
      failed = true;
    }
    continue;
  }
  // md mode: the S-FILE FORMAT CONTRACT
  const failures: string[] = [];
  const headerOk = /^# S-\d+ — /.test(text);
  if (!headerOk) failures.push("no '# S-<n> — <title>' header");
  const specLine = /^spec: S-\d+$/m.test(text);
  if (!specLine) failures.push("no 'spec: S-<n>' line");
  const formLine = /^form: (piecewise|forall|predicate-family|process)$/m.test(text);
  if (!formLine) failures.push("no valid 'form:' line");
  const blockRe = /^### (B-\d+-[\w-]+) — (.+)$/gm;
  const blocks = [...text.matchAll(blockRe)];
  if (blocks.length < 1) failures.push("zero '### B-<n>-<slug> — <title>' blocks");
  // per-block required keys: split the text by block headers
  const parts = text.split(/^### /gm).slice(1);
  let qi = 0, ai = 0, proposed = 0;
  for (const p of parts) {
    const name = p.split(" — ")[0];
    if (!/^quote: ".+"$/m.test(p)) failures.push(`block ${name}: missing/malformed quote: line (D13)`);
    else qi++;
    if (!/^anchor: .+:\d+/m.test(p)) failures.push(`block ${name}: missing/malformed anchor: (doc:line)`);
    else ai++;
    if (!/^kind: /m.test(p)) failures.push(`block ${name}: missing kind:`);
    if (!/^expr: /m.test(p)) failures.push(`block ${name}: missing expr:`);
    if (!/^oracle: /m.test(p)) failures.push(`block ${name}: missing oracle:`);
    if (!/^fixtures: \[/m.test(p)) failures.push(`block ${name}: missing fixtures: [..]`);
  }
  proposed = (text.match(/PROPOSED/g) ?? []).length;
  if (proposed > 0) failures.push(`PROPOSED appears ${proposed}x — D-R2 ratified ALL thresholds; zero PROPOSED allowed`);
  if (failures.length > 0) {
    console.error(`FAIL ${f}: ${failures.length} violation(s)`);
    for (const x of failures) console.error(`  - ${x}`);
    failed = true;
  } else {
    console.log(`PASS ${f}: ${blocks.length} block(s), ${qi} quote(s), ${ai} anchor(s), 0 PROPOSED`);
  }
}
process.exit(failed ? 1 : 0);

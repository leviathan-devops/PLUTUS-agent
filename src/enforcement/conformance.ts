// PROVENANCE: ported from plutus/pre-v5-overlay @ f5ee436 (src/enforcement/conformance.ts).
// Single rewrite: ../graph/client.js -> ./graph-client.js (vendored kernel copy); all else identical.
// No threshold tuning: callers use resolveThreshold with explicit calibrated 1.0 / profile binding.
// CONFORMANCE — conformanceZero(fileSet) -> the typed findings manifest (spec §B.W7 gate
// SC-24: "Bug Hunter conformanceZero on the wave's touched files").
// CALIBRATION: numericThreshold resolves explicit-opt > profile.yaml's
// domain.numeric-threshold binding (READ-ONLY read, never edited); tolerancePips defaults
// to the spec §6 acceptance criterion (<=3p). A zero-findings run is EARNED: an empty file
// set throws (vacuous zero refused), unreadable content yields INCONCLUSIVE (never PASS),
// and the suite carries the planted-violation negative control. KG reads go through the
// landed src/graph client verbs (openGraph + violations), best-effort with loud notes.
import { readFileSync } from "node:fs";
import {
  LexiconRegistry,
  classifySource,
  extractNumericThreshold,
} from "./lexicon-engine.js";
import type { LexiconFinding } from "./lexicon-engine.js";
import { EscalationLadder } from "./escalation.js";
import type { TierDecision } from "./escalation.js";
import { openGraph } from "./graph-client.js";

export type ConformanceVerdict = "CONFORMANT" | "NONCONFORMANT" | "INCONCLUSIVE";

export interface ScannedFile {
  path: string;
  content: string | null | undefined;
}

export interface ConformanceManifest {
  scannedFiles: string[];
  scannedLines: number;
  findings: LexiconFinding[];
  tiers: TierDecision[];
  verdict: ConformanceVerdict;
  inconclusiveReasons: string[];
  graphNotes: string[];
  numericThreshold: number;
}

export interface ConformanceOptions {
  numericThreshold?: number;
  profileYamlPath?: string;
  tolerancePips?: number;
  graphDbPath?: string;
}

export function resolveThreshold(opts: ConformanceOptions): number {
  if (opts.numericThreshold !== undefined) {
    if (typeof opts.numericThreshold !== "number" || !Number.isFinite(opts.numericThreshold)) {
      throw new TypeError(
        `CONFORMANCE_BAD_THRESHOLD: numericThreshold must be a finite number, got ${String(opts.numericThreshold)}`
      );
    }
    return opts.numericThreshold;
  }
  if (typeof opts.profileYamlPath !== "string" || opts.profileYamlPath.length === 0) {
    throw new Error(
      "CONFORMANCE_NO_THRESHOLD: pass numericThreshold explicitly or point profileYamlPath at profile.yaml (READ-ONLY)"
    );
  }
  let raw: string;
  try {
    raw = readFileSync(opts.profileYamlPath, "utf8");
  } catch (error) {
    throw new Error(
      `CONFORMANCE_PROFILE_UNREADABLE: cannot read ${opts.profileYamlPath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  return extractNumericThreshold(raw);
}

function consultGraph(graphDbPath: string, scannedFiles: string[]): { notes: string[]; extra: LexiconFinding[] } {
  const notes: string[] = [];
  const extra: LexiconFinding[] = [];
  let client: ReturnType<typeof openGraph> | null = null;
  try {
    client = openGraph(graphDbPath);
  } catch (error) {
    notes.push(`GRAPH_CONSULT_FAILED: cannot open ${graphDbPath}: ${error instanceof Error ? error.message : String(error)}`);
    return { notes, extra };
  }
  try {
    const rows = client.violations({ limit: 500 });
    const wanted = new Set(scannedFiles);
    for (const row of rows) {
      if (!wanted.has(row.file)) continue;
      extra.push({
        familyId: `graph:${row.ruleId}`,
        kind: "domain.numeric-threshold",
        severity: "HIGH",
        message: `graph violation ${row.ruleId} at ${row.file}:${String(row.line)}`,
        remediationHook: "graph-triage",
        triad: {
          pattern: `graph:${row.ruleId}`,
          state: "EVIDENCED",
          evidence: { file: row.file, line: row.line ?? 0, quote: row.verdict },
        },
      });
    }
    notes.push(`GRAPH_CONSULT_OK: ${String(rows.length)} latest-run rows scanned, ${String(extra.length)} hit the file set`);
  } catch (error) {
    notes.push(`GRAPH_CONSULT_FAILED: violations query failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  try {
    client.close();
  } catch (error) {
    notes.push(`GRAPH_CLOSE_FAILED: ${error instanceof Error ? error.message : String(error)}`);
  }
  return { notes, extra };
}

export function conformanceZero(files: ScannedFile[], opts: ConformanceOptions = {}): ConformanceManifest {
  if (!Array.isArray(files) || files.length === 0) {
    throw new RangeError("CONFORMANCE_EMPTY_FILESET: file set must be a non-empty array — zero over nothing is unfalsifiable");
  }
  const numericThreshold = resolveThreshold(opts);
  const tolerancePips = opts.tolerancePips ?? 3;
  const registry = new LexiconRegistry({ numericThreshold, tolerancePips });
  const ladder = new EscalationLadder();
  const findings: LexiconFinding[] = [];
  const tiers: TierDecision[] = [];
  const inconclusiveReasons: string[] = [];
  const scannedFiles: string[] = [];
  let scannedLines = 0;
  for (const entry of files) {
    if (!entry || typeof entry.path !== "string" || entry.path.length === 0) {
      inconclusiveReasons.push("CONFORMANCE_BAD_ENTRY: file entry without a path");
      continue;
    }
    scannedFiles.push(entry.path);
    if (typeof entry.content !== "string") {
      inconclusiveReasons.push(`CONFORMANCE_UNREADABLE: ${entry.path} content is not a string — INCONCLUSIVE, never PASS`);
      continue;
    }
    const outcome = classifySource(entry.path, entry.content, registry);
    if (outcome.state === "INCONCLUSIVE") {
      inconclusiveReasons.push(`CONFORMANCE_CLASSIFY_FAILED: ${entry.path} classified INCONCLUSIVE`);
      continue;
    }
    scannedLines += outcome.scannedLines;
    for (const finding of outcome.findings) {
      findings.push(finding);
      tiers.push(
        ladder.decide(`${finding.familyId}::${finding.triad.evidence.file}:${finding.triad.evidence.line}`, 1)
      );
    }
  }
  const graphNotes: string[] = [];
  if (typeof opts.graphDbPath === "string" && opts.graphDbPath.length > 0) {
    const consult = consultGraph(opts.graphDbPath, scannedFiles);
    graphNotes.push(...consult.notes);
    for (const finding of consult.extra) {
      findings.push(finding);
      tiers.push(
        ladder.decide(`${finding.familyId}::${finding.triad.evidence.file}:${finding.triad.evidence.line}`, 1)
      );
    }
  }
  const verdict: ConformanceVerdict =
    inconclusiveReasons.length > 0 ? "INCONCLUSIVE" : findings.length > 0 ? "NONCONFORMANT" : "CONFORMANT";
  return { scannedFiles, scannedLines, findings, tiers, verdict, inconclusiveReasons, graphNotes, numericThreshold };
}

export function conformanceZeroOnDisk(paths: string[], opts: ConformanceOptions = {}): ConformanceManifest {
  if (!Array.isArray(paths) || paths.length === 0) {
    throw new RangeError("CONFORMANCE_EMPTY_FILESET: path set must be a non-empty array — zero over nothing is unfalsifiable");
  }
  const files: ScannedFile[] = paths.map((path) => {
    if (typeof path !== "string" || path.length === 0) return { path: String(path), content: null };
    try {
      return { path, content: readFileSync(path, "utf8") };
    } catch {
      return { path, content: null };
    }
  });
  return conformanceZero(files, opts);
}

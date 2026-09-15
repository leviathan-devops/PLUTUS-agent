import { createHash } from "node:crypto";
import type { JournalRow, Triplet, Verdict } from "./types";

const SEP = "|jesl|";

export function canonicalSerialize(value: unknown): string {
  if (value === null) return "null";
  if (typeof value !== "object") return JSON.stringify(value) as string;
  if (Array.isArray(value)) return "[" + (value as unknown[]).map(canonicalSerialize).join(",") + "]";
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const parts: string[] = [];
  for (const k of keys) {
    if (k === "self") continue;
    if (k === "ts") continue;
    const v = obj[k];
    if (v === undefined) continue;
    parts.push(JSON.stringify(k) + ":" + canonicalSerialize(v));
  }
  return "{" + parts.join(",") + "}";
}

/**
 * sha256 hex digest — the journal's row-hash primitive (blueprint SC-4).
 * Replaces the legacy FNV-style simpleHash: collision-resistant, 64 hex chars,
 * preimage-infeasible — the tamper-evidence guarantee rests on this.
 */
export function sha256Hash(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function runIdFor(docHash: string, seed: string): string {
  return sha256Hash(docHash + SEP + seed).slice(0, 16);
}

export type JournalRowDraft = {
  readonly run: string;
  readonly node: string;
  readonly kind: "invoke" | "verdict" | "summary";
  readonly verdict?: Verdict;
  readonly evidence?: Triplet;
  readonly source: string;
};

function computeSelf(base: Omit<JournalRow, "self">): string {
  return sha256Hash(canonicalSerialize(base) + SEP + base.prev);
}

export class Journal {
  private byRun = new Map<string, JournalRow[]>();
  private global: JournalRow[] = [];

  append(draft: JournalRowDraft): JournalRow {
    if (!draft.run) throw new Error("Journal.append: missing run");
    if (!draft.node) throw new Error("Journal.append: missing node");
    if (!draft.source) throw new Error("Journal.append: missing source");
    const list = this.byRun.get(draft.run) ?? [];
    const seq = list.length;
    const prev = seq === 0 ? "genesis" : list[list.length - 1]!.self;
    const base: Omit<JournalRow, "self"> = {
      seq,
      ts: Date.now(),
      run: draft.run,
      node: draft.node,
      kind: draft.kind,
      verdict: draft.verdict,
      evidence: draft.evidence,
      source: draft.source,
      prev,
    };
    const row: JournalRow = { ...base, self: computeSelf(base) };
    this.byRun.set(draft.run, [...list, row]);
    this.global = [...this.global, row];
    return row;
  }

  query(run?: string): ReadonlyArray<JournalRow> {
    if (run === undefined) return this.global;
    return this.byRun.get(run) ?? [];
  }

  verifyChain(run: string): boolean {
    return verifyChain(this.query(run));
  }

  covers(docHash: string, seed: string): boolean {
    if (!docHash) throw new Error("Journal.covers: missing docHash");
    const run = runIdFor(docHash, seed);
    const rows = this.query(run);
    if (rows.length === 0) return false;
    return verifyChain(rows);
  }

  clear(): void {
    this.byRun = new Map();
    this.global = [];
  }
}

export function verifyChain(rows: ReadonlyArray<JournalRow>): boolean {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    const expectedPrev = i === 0 ? "genesis" : rows[i - 1]!.self;
    if (r.prev !== expectedPrev) return false;
    if (r.seq !== i) return false;
    const base: Omit<JournalRow, "self"> = {
      seq: r.seq, ts: r.ts, run: r.run, node: r.node, kind: r.kind,
      verdict: r.verdict, evidence: r.evidence, source: r.source, prev: r.prev,
    };
    if (computeSelf(base) !== r.self) return false;
  }
  return true;
}

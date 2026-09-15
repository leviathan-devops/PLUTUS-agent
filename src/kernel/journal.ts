import { createHash } from "node:crypto";

export const KERNEL_JOURNAL_GENESIS = "GENESIS";

export interface KernelJournalAppendInput {
  causationId: string;
  kind: string;
  payload: unknown;
  timestampMs: number;
}

export interface KernelJournalEntry {
  seq: number;
  causationId: string;
  kind: string;
  payload: string;
  timestampMs: number;
  prevHash: string;
  entryHash: string;
}

export class JournalCorruptError extends Error {
  readonly code = "JOURNAL_CORRUPT" as const;
  readonly seq: number | null;
  constructor(detail: string, seq: number | null = null) {
    super(`[JOURNAL_CORRUPT] ${detail}`);
    this.name = "JournalCorruptError";
    this.seq = seq;
  }
}

function sha256Hex(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function hashEntry(
  seq: number,
  causationId: string,
  kind: string,
  payload: string,
  timestampMs: number,
  prevHash: string,
): string {
  return sha256Hex(`${seq}|${causationId}|${kind}|${payload}|${timestampMs}|${prevHash}`);
}

function copyRow(row: KernelJournalEntry): KernelJournalEntry {
  return { ...row };
}

export class KernelJournal {
  private rows: KernelJournalEntry[] = [];

  append(input: KernelJournalAppendInput): KernelJournalEntry {
    if (typeof input !== "object" || input === null) {
      throw new JournalCorruptError("append refused: input must be an object");
    }
    if (typeof input.causationId !== "string" || input.causationId.length === 0) {
      throw new JournalCorruptError("append refused: empty causationId");
    }
    if (typeof input.kind !== "string" || input.kind.length === 0) {
      throw new JournalCorruptError("append refused: empty kind");
    }
    if (typeof input.timestampMs !== "number" || !Number.isFinite(input.timestampMs)) {
      throw new JournalCorruptError("append refused: timestampMs must be a finite injected number — wall-clock is banned");
    }
    const payload = JSON.stringify(input.payload ?? null);
    const prevHash = this.rows.length === 0
      ? KERNEL_JOURNAL_GENESIS
      : (this.rows[this.rows.length - 1] as KernelJournalEntry).entryHash;
    const seq = this.rows.length;
    const entry: KernelJournalEntry = {
      seq,
      causationId: input.causationId,
      kind: input.kind,
      payload,
      timestampMs: input.timestampMs,
      prevHash,
      entryHash: hashEntry(seq, input.causationId, input.kind, payload, input.timestampMs, prevHash),
    };
    this.rows.push(entry);
    return copyRow(entry);
  }

  query(causationId: string): readonly KernelJournalEntry[] {
    return this.rows.filter((r) => r.causationId === causationId).map(copyRow);
  }

  all(): readonly KernelJournalEntry[] {
    return this.rows.map(copyRow);
  }

  checkIntegrity(): void {
    let prev = KERNEL_JOURNAL_GENESIS;
    for (const row of this.rows) {
      if (row.prevHash !== prev) {
        throw new JournalCorruptError(
          `chain break at seq ${row.seq}: prevHash mismatch`,
          row.seq,
        );
      }
      const recomputed = hashEntry(row.seq, row.causationId, row.kind, row.payload, row.timestampMs, row.prevHash);
      if (recomputed !== row.entryHash) {
        throw new JournalCorruptError(
          `chain break at seq ${row.seq}: entryHash mismatch`,
          row.seq,
        );
      }
      prev = row.entryHash;
    }
  }

  corruptForTest(seq: number, patch: Partial<KernelJournalEntry>): void {
    const idx = this.rows.findIndex((r) => r.seq === seq);
    if (idx === -1) return;
    this.rows[idx] = { ...(this.rows[idx] as KernelJournalEntry), ...patch };
  }
}

export function createKernelJournal(): KernelJournal {
  return new KernelJournal();
}

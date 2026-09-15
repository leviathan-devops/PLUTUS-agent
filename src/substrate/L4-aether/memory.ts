// src/shadow/memory.ts — the session store (spec §4.6; shadow-memory.ts:691-733 lineage)
// Atomic seq insert (WAL-safe); dual-write JSON mirror; <1ms write budget.

import { openDb, type SqliteDriver, type DbClose } from '../L6-graph/db';
import { appendFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

export interface ShadowMemoryEvent {
  readonly sessionKey: string;
  readonly role: 'user' | 'assistant' | 'system' | 'shadow';
  readonly content: string;
  readonly atUnixMs: number;
  readonly epoch: number;
}

export interface EpochSummary {
  readonly count: number;
  readonly avgLines: number;
  readonly epoch: number;
}

export class ShadowMemory {
  private readonly db: SqliteDriver & DbClose;
  private readonly mirrorPath: string;

  constructor(root: string, project: string, sessionKey: string) {
    const dir = join(root, project, sessionKey);
    mkdirSync(dirname(join(dir, 'x')), { recursive: true });
    this.db = openDb(join(dir, 'memory.db'));
    this.db.exec(`CREATE TABLE IF NOT EXISTS shadow_messages (
      seq INTEGER PRIMARY KEY,
      sessionKey TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      atUnixMs INTEGER NOT NULL,
      epoch INTEGER NOT NULL
    )`);
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_shadow_session ON shadow_messages(sessionKey, seq)');
    this.mirrorPath = join(dir, 'messages.jsonl');
  }

  /** appendPrompt — the ATOMIC seq insert (two concurrent writers cannot mint the same seq). */
  appendPrompt(ev: ShadowMemoryEvent): number {
    const row = this.db.prepare(
      `INSERT INTO shadow_messages (seq, sessionKey, role, content, atUnixMs, epoch)
       VALUES ((SELECT COALESCE(MAX(seq),0)+1 FROM shadow_messages WHERE sessionKey = ?), ?, ?, ?, ?, ?)
       RETURNING seq`,
    ).get(ev.sessionKey, ev.sessionKey, ev.role, ev.content, ev.atUnixMs, ev.epoch) as { seq: number };
    // THE DUAL-WRITE MIRROR (crash recovery; divergence detected at epoch rollover)
    appendFileSync(this.mirrorPath, `${JSON.stringify({ seq: row.seq, ...ev })}\n`);
    return row.seq;
  }

  lastPrompts(n: number): readonly ShadowMemoryEvent[] {
    const rows = this.db.prepare(
      'SELECT sessionKey, role, content, atUnixMs, epoch FROM shadow_messages ORDER BY seq DESC LIMIT ?',
    ).all(n) as ShadowMemoryEvent[];
    return rows.reverse();
  }

  nextSeq(): number {
    const r = this.db.prepare('SELECT COALESCE(MAX(seq),0)+1 AS n FROM shadow_messages').get() as { n: number };
    return r.n;
  }

  epochSummary(): EpochSummary {
    const r = this.db.prepare(
      'SELECT COUNT(*) AS count, COALESCE(AVG(length(content) - length(replace(content, char(10), \'\')) + 1), 0) AS avgLines, COALESCE(MAX(epoch), 0) AS epoch FROM shadow_messages',
    ).get() as { count: number; avgLines: number; epoch: number };
    return { count: r.count, avgLines: Math.round(r.avgLines), epoch: r.epoch };
  }

  advanceEpoch(trigger: string): number {
    const cur = this.epochSummary().epoch;
    this.db.prepare('UPDATE shadow_messages SET epoch = ? WHERE epoch = ?').run(cur + 1, cur);
    appendFileSync(this.mirrorPath, `${JSON.stringify({ epochRoll: cur + 1, trigger })}\n`);
    return cur + 1;
  }

  /** mirrorDivergence — the dual-write check at epoch rollover (LOUD, never silently resolved). */
  mirrorDivergence(): { diverged: boolean; dbCount: number; mirrorCount: number } {
    const dbCount = (this.db.prepare('SELECT COUNT(*) AS c FROM shadow_messages').get() as { c: number }).c;
    let mirrorCount = 0;
    if (existsSync(this.mirrorPath)) {
      mirrorCount = readFileSync(this.mirrorPath, 'utf8').split('\n').filter((l) => l.trim().length > 0 && !l.includes('epochRoll')).length;
    }
    return { diverged: dbCount !== mirrorCount, dbCount, mirrorCount };
  }

  close(): void {
    this.db.close();
  }
}

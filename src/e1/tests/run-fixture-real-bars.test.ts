// Plutus V5 W2 — src/e1/tests/run-fixture-real-bars.test.ts
// WAVE 2 e1 seam on real OHLC: drives the SHIPPED run-fixture entry
// (bun src/e1/run-fixture.ts --out <tmp file>) and asserts the live path
// decodes /tmp/opencode/bars_raw.json via decodeMarketData — synth is
// fallback only. Spawns the real script; never reimplements loadRealBars.
// 30m/15m feeds are GAP on disk; the fixture runs the 1H feeds only.
// bun test src/e1/tests/run-fixture-real-bars.test.ts
import { describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BARS_RAW = join('/tmp', 'opencode', 'bars_raw.json');
const SCRIPT = join(import.meta.dir, '..', 'run-fixture.ts');

describe('run-fixture real-bars seam (shipped entry)', () => {
  test('bun src/e1/run-fixture.ts --out <tmp>: bars_raw via decodeMarketData, 3 pairs, chain valid', async () => {
    expect(existsSync(BARS_RAW)).toBe(true);
    expect(existsSync(SCRIPT)).toBe(true);
    const dir = mkdtempSync(join(tmpdir(), 'e1-fixture-'));
    const outFile = join(dir, 'e1-snapshot.json');
    try {
      const proc = Bun.spawn(['bun', SCRIPT, '--out', outFile], {
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const [exit, sout, serr] = await Promise.all([
        proc.exited,
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);
      expect(`${sout}\n${serr}`.trim()).toContain('[run-fixture]');
      expect(exit).toBe(0);
      expect(existsSync(outFile)).toBe(true);
      const artifact = JSON.parse(readFileSync(outFile, 'utf8')) as {
        meta: { barsSource: string; journalChainValid: boolean };
        snapshots: Record<string, { barsSource: string; bars: number }>;
        totals: { pairs: number };
      };
      expect(artifact.meta.barsSource).toContain('decodeMarketData');
      expect(artifact.meta.barsSource).toContain('bars_raw');
      expect(artifact.meta.journalChainValid).toBe(true);
      expect(artifact.totals.pairs).toBe(3);
      expect(Object.keys(artifact.snapshots).length).toBe(3);
      for (const key of Object.keys(artifact.snapshots)) {
        expect(artifact.snapshots[key]!.barsSource).toBe('bars_raw');
        expect(artifact.snapshots[key]!.bars).toBeGreaterThan(0);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60000);
});

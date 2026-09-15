import { describe, expect, test } from 'bun:test';
import { generateMdReport } from '../report/md-report-generator';
import { validateReport } from './report-validator';

// SC-23 armed cases. R29: zero price constants in this file — the generator
// is fed NULL snapshots (every section renders its "No data available"
// branch, md-report-generator.ts:6-7), so no numeric literal here is, or
// could be read as, a price. The only numerals are week dates, section
// numbers under test, and line numbers.

/** Real generator output — the validator's true target contract. */
function validReport(): string {
  return generateMdReport({
    weekStart: '2026-07-06',
    setups: [],
    zoneMapSnapshot: null,
    shapeSnapshot: null,
    harvestData: null,
    screenshots: [],
  });
}

/** Remove the whole `## N. ...` block (heading through the line before the
 *  next `## ` heading) — simulates a generator run that dropped a section. */
function withoutSection(md: string, n: number): string {
  const lines = md.split('\n');
  const head = new RegExp(`^##\\s+${n}\\.\\s`);
  const start = lines.findIndex((l) => head.test(l));
  if (start === -1) throw new Error(`fixture has no section ${n}`);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i] as string)) {
      end = i;
      break;
    }
  }
  return [...lines.slice(0, start), ...lines.slice(end)].join('\n');
}

/** Swap two section heading lines — simulates misordered assembly. */
function withHeadingsSwapped(md: string, a: number, b: number): string {
  const lines = md.split('\n');
  const at = (n: number): number => {
    const re = new RegExp(`^##\\s+${n}\\.\\s`);
    return lines.findIndex((l) => re.test(l));
  };
  const ai = at(a);
  const bi = at(b);
  if (ai === -1 || bi === -1) throw new Error('fixture missing swap section');
  const tmp = lines[ai] as string;
  lines[ai] = lines[bi] as string;
  lines[bi] = tmp;
  return lines.join('\n');
}

describe('report-validator: SC-23 gate', () => {
  test('real generator output (null snapshots, all 25 sections) → PASS', () => {
    const md = validReport();
    expect(md).toContain('## 25. Cross-Pair Setup Matrix');
    const result = validateReport(md);
    expect(result.failures).toEqual([]);
    expect(result.pass).toBe(true);
  });

  test('deleted section 12 → FAIL naming the section', () => {
    const result = validateReport(withoutSection(validReport(), 12));
    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.includes('missing section 12'))).toBe(true);
    expect(result.failures.some((f) => f.includes('EUR/USD Shape Chain'))).toBe(true);
  });

  test('injected wall-clock liveness line → FAIL', () => {
    const poisoned = `${validReport()}\n> **Note:** Desk view — prices are live as of now.\n`;
    const result = validateReport(poisoned);
    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.includes('wall-clock'))).toBe(true);
  });

  test('swapped sections 12/13 → FAIL on order', () => {
    const result = validateReport(withHeadingsSwapped(validReport(), 12, 13));
    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.includes('section order violated'))).toBe(true);
  });

  test('empty string → FAIL, never throws', () => {
    let threw = false;
    let result = { pass: true, failures: [] as string[] };
    try {
      result = validateReport('');
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.includes('empty report'))).toBe(true);
  });
});

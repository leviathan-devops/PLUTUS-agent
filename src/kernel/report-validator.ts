// Report Validator (SC-23) — validates a generated MARKDOWN Leviathan report.
//
// Target contract: the markdown emitted by src/report/md-report-generator.ts
// (`generateMdReport`), whose 25 numbered sections mirror the kernel section
// model in src/kernel/report-model.ts (SECTION_COUNT = 25, REPORT_SECTIONS
// ids 1..25) and the 52 formatting rules in src/kernel/report-rules.ts.
//
// Doctrine — quoted verbatim (D13: "Doctrine is QUOTED, never synthesized...
// Anything that can't be quoted, doesn't get built"
// — MASTER_CONTEXT/PLUTUS_MASTER_CONTEXT_INJECTOR.md:5):
// - R3: "E3 is not permitted to override pre-existing E1/E2 data architecture"
//   (MASTER_CONTEXT/PLUTUS_MASTER_CONTEXT_INJECTOR.md:30; source MACRO:21).
//   Hence this file imports NOTHING from src/e1 or src/e2 — its only kernel
//   coupling is the section model below plus the card schema at the boundary.
// - R29: "NOTHING SHOULD BE PRICE ANCHORED EVER… ZONE ANCHORED"
//   (MASTER_CONTEXT/PLUTUS_MASTER_CONTEXT_INJECTOR.md:56; source DEBUG:1231).
//   Hence zero price constants in this file: sections are matched by NAME
//   stems, never by numeric levels.
// - R33: "golden tolerance 3 pips after EVERY change — not 30, not 10, THREE"
//   (MASTER_CONTEXT/PLUTUS_MASTER_CONTEXT_INJECTOR.md:60; source
//   golden-gate.ts:18-20). This desk changes no golden-path code (two new
//   files only), so no gate re-run is owed.
//
// Determinism: pure string matching only — no wall-clock, no randomness, no
// network. Every failure names the exact violated rule.
//
// Honest boundaries (not gaps-as-bugs):
// - The generator emits NO card hash and NO frozen SHAs anywhere
//   (grep "cardHash|sha256|91294083|33914c89" over
//   src/report/md-report-generator.ts = zero hits outside this comment), so
//   the validator requires none. It requires only the cover provenance the
//   generator DOES emit (title / Week of / Engine).
// - The 52 PDF-layout rules (page size, margins, padding — report-rules.ts)
//   are not observable in markdown text and are NOT checked here; they belong
//   to the PDF render path via evaluateRules, not to a text validator.
// - Section 26 (MDVE Mirror Cascade) and Appendix A render ONLY when their
//   inputs are present, so extras are permitted, never required.

import { REPORT_SECTIONS, SECTION_COUNT } from './report-model';

export interface ReportValidation {
  pass: boolean;
  failures: string[];
}

interface RequiredSection {
  n: number;
  stem: string;
}

// Verbatim heading stems from src/report/md-report-generator.ts:
// sections 1-8 (generateOtcSummary :298, generateIpZoneMap :364,
// generateZoneSynthesis :436, generate4hClassification :546,
// generateEconomicCalendar :610, generateMissingDataLog :685,
// generateShapeChain :769, generateVolatilityTriggers :859),
// FX sections 9-23 (generateFxPairZoneSynthesis :1116,
// generateFxPairClassification :1179, generateFxPairCommentary :1240,
// generateFxPairShapeChain :1314, generateFxPairVolatility :1358),
// sections 24-25 (generateDataQualitySummary :1407,
// generateCrossPairMatrix :1499), assembled 1..25 by
// generateMdReport (:1710-1806). REAL COUNT = 25, matching SECTION_COUNT.
const REQUIRED_SECTIONS: readonly RequiredSection[] = [
  { n: 1, stem: 'DXY OTC Option' },
  { n: 2, stem: 'DXY IP Zone Map' },
  { n: 3, stem: 'DXY Zone Synthesis' },
  { n: 4, stem: 'DXY 4H Zone Classification' },
  { n: 5, stem: 'Economic Calendar' },
  { n: 6, stem: 'Missing Data Log' },
  { n: 7, stem: 'DXY Macro Shape Chain' },
  { n: 8, stem: 'DXY Volatility Triggers' },
  { n: 9, stem: 'EUR/USD Zone Synthesis' },
  { n: 10, stem: 'EUR/USD 4H Classification' },
  { n: 11, stem: 'EUR/USD Commentary' },
  { n: 12, stem: 'EUR/USD Shape Chain' },
  { n: 13, stem: 'EUR/USD Volatility' },
  { n: 14, stem: 'GBP/USD Zone Synthesis' },
  { n: 15, stem: 'GBP/USD 4H Classification' },
  { n: 16, stem: 'GBP/USD Commentary' },
  { n: 17, stem: 'GBP/USD Shape Chain' },
  { n: 18, stem: 'GBP/USD Volatility' },
  { n: 19, stem: 'AUD/USD Zone Synthesis' },
  { n: 20, stem: 'AUD/USD 4H Classification' },
  { n: 21, stem: 'AUD/USD Commentary' },
  { n: 22, stem: 'AUD/USD Shape Chain' },
  { n: 23, stem: 'AUD/USD Volatility' },
  { n: 24, stem: 'Data Quality Summary' },
  { n: 25, stem: 'Cross-Pair Setup Matrix' },
];

// Unnumbered per-pair blocks always emitted by generatePairSetupsSection
// (md-report-generator.ts:1095), even with zero setups for the pair.
const TRADE_SETUP_PAIRS: readonly string[] = ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD'];

// Cover provenance emitted by generateCoverPage (md-report-generator.ts:223-227).
const COVER_TITLE_RE = /^#\s+PLUTUS TTE\b/m;
const WEEK_LINE = '**Week of:**';
const ENGINE_LINE = '**Engine:**';

interface WallClockPattern {
  id: string;
  re: RegExp;
}

// Wall-clock liveness tokens. Each pattern pairs a clock/date token with a
// now-ness claim so legitimate data dates (week header, OTC day dates,
// calendar rows such as "14:30 UTC", ISO Generated provenance) never match:
// none of those lines carry a liveness word.
const WALL_CLOCK_PATTERNS: readonly WallClockPattern[] = [
  { id: 'REALTIME_CLAIM', re: /\breal-?time\b/i },
  { id: 'LIVE_FEED_CLAIM', re: /\blive\b[^\n]{0,60}\b(prices?|market|quotes?|feed|data)\b/i },
  { id: 'LIVE_FEED_CLAIM_REV', re: /\b(prices?|market|quotes?|feed)\b[^\n]{0,60}\blive\b/i },
  { id: 'AS_OF_NOW', re: /\bas\s+of\s+(now|this\s+(morning|moment|minute|second)|today)\b/i },
  { id: 'AS_OF_CLOCK', re: /\bas\s+of\s+\d{1,2}:\d{2}(:\d{2})?(\s*(AM|PM|UTC|ET|EST|EDT|GMT))?\b/i },
  { id: 'NOW_CLAIM', re: /\b(right\s+now|just\s+now|at\s+the\s+moment|up-to-the-minute|tick-by-tick)\b/i },
  {
    id: 'CURRENT_MARKET_CLAIM',
    re: /\bcurrent\s+(prices?|market(\s+price)?|quotes?|time|timestamp)\b/i,
  },
  {
    id: 'GENERATED_AT_CLOCK',
    re: /generated\s+at\s+\d{1,2}:\d{2}(:\d{2})?(\s*(AM|PM|UTC|ET))?\b/i,
  },
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function headingIndex(input: string, n: number, stem: string): number {
  const re = new RegExp(`^##\\s+${n}\\.\\s+[^\\n]*${escapeRegExp(stem)}`, 'm');
  const m = re.exec(input);
  return m === null ? -1 : m.index;
}

export function validateReport(input: string): ReportValidation {
  if (typeof input !== 'string' || input.trim().length === 0) {
    return {
      pass: false,
      failures: ['empty report: no content to validate (refusing to PASS an empty stub)'],
    };
  }
  const failures: string[] = [];

  // 0. Model cross-check: the kernel section model must agree with the
  // markdown contract below; drift fails LOUD instead of silently passing.
  if (SECTION_COUNT !== REQUIRED_SECTIONS.length) {
    failures.push(
      `contract drift: report-model SECTION_COUNT is ${SECTION_COUNT}, validator requires ${REQUIRED_SECTIONS.length} (src/kernel/report-model.ts vs src/report/md-report-generator.ts)`,
    );
  }
  if (REPORT_SECTIONS.length !== REQUIRED_SECTIONS.length) {
    failures.push(
      `contract drift: report-model REPORT_SECTIONS holds ${REPORT_SECTIONS.length} entries, validator requires ${REQUIRED_SECTIONS.length}`,
    );
  }

  // 1. Cover provenance — required ONLY because generateCoverPage emits it.
  if (!COVER_TITLE_RE.test(input)) {
    failures.push('missing cover title: expected `# PLUTUS TTE ...` (generateCoverPage, md-report-generator.ts:223)');
  }
  if (!input.includes(WEEK_LINE)) {
    failures.push(`missing cover provenance line '${WEEK_LINE}' (generateCoverPage, md-report-generator.ts:225)`);
  }
  if (!input.includes(ENGINE_LINE)) {
    failures.push(`missing cover provenance line '${ENGINE_LINE}' (generateCoverPage, md-report-generator.ts:226)`);
  }

  // 2. Numbered sections present, each named on absence.
  const positions: number[] = new Array(REQUIRED_SECTIONS.length).fill(-1);
  for (let i = 0; i < REQUIRED_SECTIONS.length; i++) {
    const s = REQUIRED_SECTIONS[i] as RequiredSection;
    const at = headingIndex(input, s.n, s.stem);
    if (at === -1) {
      failures.push(`missing section ${s.n} (${s.stem}): required '## ${s.n}. ...' heading absent`);
    } else {
      positions[i] = at;
    }
  }

  // 3. Contiguous document order 1..25 (assembly order of generateMdReport).
  if (!positions.includes(-1)) {
    const inDocOrder = positions
      .map((at, idx) => ({ n: idx + 1, at }))
      .sort((a, b) => a.at - b.at)
      .map((e) => e.n);
    for (let i = 0; i < inDocOrder.length; i++) {
      if (inDocOrder[i] !== i + 1) {
        failures.push(
          `section order violated: document order is ${inDocOrder.join(',')}, expected 1..${REQUIRED_SECTIONS.length} contiguous (generateMdReport assembly, md-report-generator.ts:1710-1806)`,
        );
        break;
      }
    }
  }

  // 4. Unnumbered TRADE SETUPS blocks, one per pair.
  for (const pair of TRADE_SETUP_PAIRS) {
    const re = new RegExp(`^##\\s+TRADE SETUPS\\b[^\\n]*${escapeRegExp(pair)}`, 'm');
    if (!re.test(input)) {
      failures.push(`missing TRADE SETUPS block for ${pair} (generatePairSetupsSection, md-report-generator.ts:1095)`);
    }
  }

  // 5. Wall-clock liveness tokens refused (each failure names pattern + line).
  const lines = input.split('\n');
  for (const p of WALL_CLOCK_PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      if (p.re.test(line)) {
        failures.push(`wall-clock token refused (${p.id}): line ${i + 1}: "${line.slice(0, 120)}"`);
        break;
      }
    }
  }

  return { pass: failures.length === 0, failures };
}

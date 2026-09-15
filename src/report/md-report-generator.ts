/**
 * MD Report Generator — Clean Markdown report for PLUTUS TTE trading engine.
 *
 * Replaces the garbled PDF/report output with a professional .md file
 * matching the Leviathan Report Template structure. The report is
 * self-contained: every section renders even when data is missing
 * ("No data available" is emitted — sections are never skipped).
 *
 * Pair ordering is ALWAYS: DXY → EUR/USD → GBP/USD → AUD/USD.
 *
 * USAGE:
 *   import { generateMdReport, writeMdReport } from './report/md-report-generator.js';
 *   const md = generateMdReport(input);
 *   const path = writeMdReport(input, '/path/to/report.md');
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import {
  TradeDirection,
} from '../types.js';
import type {
  TradeSetup,
  ZoneMapSnapshot,
  ShapePredictionSnapshot,
  DXYZone,
  ShapeChain,
  ShapePrediction,
  ZoneType,
  SessionWindow,
  SetupCategory,
  ShapeCode,
} from '../types.js';
import type { MacroCalendarEntry } from '../pipeline/types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL TYPES — HarvestData & Input
// ═══════════════════════════════════════════════════════════════════════════════

/** OTC FX option expiry for a single day. */
export interface OTCExpiry {
  pair: string;
  strike: number;
  notional: string;          // "Modest" | "Notable" | "LARGE" | "$1.5B"
  classification: string;     // "SIGNIFICANT MAGNET" | "CRITICAL OPTION WALL"
  spotRelation: string;
  technicalContext: string;
}

/** Per-day OTC expiry bundle. */
export interface DailyOTC {
  day: string;                // "Monday"
  date: string;               // "March 30, 2026"
  note?: string;
  expiries: OTCExpiry[];
  filterCheckpoint?: string;
}

/** Harvested raw data from external sources. */
export interface HarvestData {
  spots?: Record<string, number>;
  calendar?: MacroCalendarEntry[];
  otcExpiries?: DailyOTC[];
  analystBias?: Record<string, string>;
  provenance?: Array<{
    dataPoint: string;
    source: string;
    method: string;
    confidence: string;
  }>;
}

/** Screenshot artifact (simplified for report embedding). */
export interface ScreenshotRef {
  pair: string;
  timeframe: string;
  path: string;
}

/** Top-level input to the report generator. */
export interface MdReportInput {
  weekStart: string;
  setups: TradeSetup[];
  zoneMapSnapshot: ZoneMapSnapshot | null;
  shapeSnapshot: ShapePredictionSnapshot | null;
  /** W6-3: per-pair dedicated shape chains. FX shape-chain sections render
   *  the pair's OWN chain (falling back to shapeSnapshot when absent). */
  shapeByPair?: Record<string, ShapePredictionSnapshot> | null;
  harvestData: HarvestData | null;
  screenshots: ScreenshotRef[];
  /** v4.4 MDVE+mirror stage summary — when present, Section 26 renders the
   *  deterministic lane's floor counts, f(T) firewall, casualties and the
   *  §8.1 anchor-gate accounting. Absent = the stage didn't run (fail-safe
   *  emergent-only path). */
  mirror?: import('../pipeline/mdve-stage.js').MdveStageSummary | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const PAIR_ORDER = ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD'] as const;

const PRICE_DECIMALS: Record<string, number> = {
  'DXY': 2,
  'EUR/USD': 4,
  'GBP/USD': 4,
  'AUD/USD': 4,
};

const REPORT_TITLE = 'PLUTUS TTE — Weekly Institutional Liquidity Report';
const ENGINE_VERSION = 'TTE v5.3.3 / Engine 3 v8';

const HORIZONTAL_RULE = '\n---\n\n';

// ═══════════════════════════════════════════════════════════════════════════════
// FORMATTING HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Format a price value to the correct number of decimal places for the pair. */
function fmtPrice(pair: string, value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  const dp = PRICE_DECIMALS[pair] ?? 4;
  return value.toFixed(dp);
}

/** Format a price range like "104.50-104.80". */
function fmtRange(pair: string, floor: number, ceiling: number): string {
  return `${fmtPrice(pair, floor)}-${fmtPrice(pair, ceiling)}`;
}

/** Format a percentage from a 0-100 value. */
function fmtPct(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return `${value.toFixed(0)}%`;
}

/** Format a 0-1 probability/confidence as a percentage. */
function fmtPct01(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return `${(value * 100).toFixed(0)}%`;
}

/** Format a confidence score (0-100) as a number. */
function fmtConf(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return value.toFixed(0);
}

/** Format an RRR as "4.2x". */
function fmtRrr(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return `${value.toFixed(1)}x`;
}

/** Format a direction enum value as bold. */
function fmtDirection(dir: TradeDirection | string): string {
  const d = String(dir).toUpperCase();
  if (d === 'LONG') return '**LONG**';
  if (d === 'SHORT') return '**SHORT**';
  return `**${d}**`;
}

/** Format a session window for display. */
function fmtSession(session: SessionWindow | string): string {
  return String(session);
}

/** Truncate a string for table cells. */
function trunc(s: string | undefined | null, max: number = 40): string {
  if (!s) return '—';
  if (s.length <= max) return s;
  return s.substring(0, max - 1) + '…';
}

/** Format a shape code for display. */
function fmtShape(shape: ShapeCode | string | undefined): string {
  if (!shape) return '—';
  return String(shape);
}

/** Format the week start date for the header. */
function fmtWeekHeader(weekStart: string): string {
  try {
    const d = new Date(weekStart + 'T00:00:00Z');
    const end = new Date(d);
    end.setUTCDate(end.getUTCDate() + 4); // Friday
    const fmt = (dt: Date) =>
      dt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      });
    return `${fmt(d)} – ${fmt(end)}`;
  } catch {
    return weekStart;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABLE BUILDERS — produce aligned markdown pipe tables
// ═══════════════════════════════════════════════════════════════════════════════

/** Build a markdown table from headers and rows. */
function buildTable(headers: string[], rows: string[][]): string {
  if (rows.length === 0) return '*No rows.*';
  const headerLine = `| ${headers.join(' | ')} |`;
  const sepLine = `| ${headers.map(() => '---').join(' | ')} |`;
  const dataLines = rows.map((r) => `| ${r.join(' | ')} |`);
  return [headerLine, sepLine, ...dataLines].join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: COVER PAGE
// ═══════════════════════════════════════════════════════════════════════════════

function generateCoverPage(input: MdReportInput): string {
  const { weekStart, setups, zoneMapSnapshot, shapeSnapshot, harvestData } = input;
  const lines: string[] = [];

  lines.push(`# ${REPORT_TITLE}`);
  lines.push('');
  lines.push(`**Week of:** ${fmtWeekHeader(weekStart)}  `);
  lines.push(`**Engine:** ${ENGINE_VERSION}  `);
  lines.push(`**Generated:** ${new Date().toISOString()}  `);
  lines.push('');

  // ── Spot prices ──
  const spots: Record<string, number> = {};
  if (zoneMapSnapshot?.spots) Object.assign(spots, zoneMapSnapshot.spots);
  if (harvestData?.spots) Object.assign(spots, harvestData.spots);

  if (Object.keys(spots).length > 0) {
    lines.push('### Spot Prices');
    lines.push('');
    const spotRows = PAIR_ORDER
      .filter((p) => spots[p] !== undefined)
      .map((p) => [p, fmtPrice(p, spots[p])]);
    if (spotRows.length > 0) {
      lines.push(buildTable(['Pair', 'Spot'], spotRows));
    } else {
      // Show any spots available
      const anyRows = Object.entries(spots).map(([k, v]) => [k, fmtPrice(k, v)]);
      lines.push(buildTable(['Pair', 'Spot'], anyRows));
    }
    lines.push('');
  }

  // ── Engine summary ──
  lines.push('### Engine Summary');
  lines.push('');

  const zoneCount = zoneMapSnapshot?.zones?.length ?? 0;
  const dxySetups = setups.filter((s) => s.pair === 'DXY').length;
  const fxSetups = setups.filter((s) => s.pair !== 'DXY').length;
  const totalSetups = setups.length;

  const storyBias = shapeSnapshot?.shapeChain?.storylineBias ?? '—';
  const currentShape = shapeSnapshot?.shapeChain?.currentShape ?? '—';

  const summaryRows: string[][] = [
    ['Instrument (Zone Map)', zoneMapSnapshot?.instrument ?? '—'],
    ['Zones Identified', String(zoneCount)],
    ['Shape Storyline Bias', String(storyBias)],
    ['Current Shape', fmtShape(currentShape)],
    ['DXY Setups', String(dxySetups)],
    ['FX Pair Setups', String(fxSetups)],
    ['Total Setups', String(totalSetups)],
  ];
  lines.push(buildTable(['Metric', 'Value'], summaryRows));
  lines.push('');

  // ── Setup count by pair ──
  if (totalSetups > 0) {
    lines.push('### Setups by Pair');
    lines.push('');
    const pairRows = PAIR_ORDER.map((p) => {
      const count = setups.filter((s) => s.pair === p).length;
      const longs = setups.filter((s) => s.pair === p && s.direction === TradeDirection.LONG).length;
      const shorts = setups.filter((s) => s.pair === p && s.direction === TradeDirection.SHORT).length;
      return [p, String(count), String(longs), String(shorts)];
    });
    lines.push(buildTable(['Pair', 'Setups', 'Longs', 'Shorts'], pairRows));
    lines.push('');
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: DXY OTC OPTION SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

function generateOtcSummary(harvestData: HarvestData | null): string {
  const lines: string[] = [];
  lines.push('## 1. DXY OTC Option Summary');
  lines.push('');

  const otcDays = harvestData?.otcExpiries;

  if (!otcDays || otcDays.length === 0) {
    lines.push('*No OTC option data available.*');
    lines.push('');
    return lines.join('\n');
  }

  let totalExpiries = 0;
  let significantCount = 0;

  for (const day of otcDays) {
    lines.push(`### ${day.day} — ${day.date}`);
    if (day.note) {
      lines.push(`*${day.note}*`);
    }
    lines.push('');

    if (day.expiries.length === 0) {
      lines.push('*No notable expiries.*');
      lines.push('');
      continue;
    }

    const rows = day.expiries.map((e) => {
      totalExpiries++;
      if (e.classification.includes('SIGNIFICANT') || e.classification.includes('CRITICAL')) {
        significantCount++;
      }
      return [
        fmtPrice(e.pair, e.strike),
        e.notional,
        e.classification,
        trunc(e.spotRelation, 30),
        trunc(e.technicalContext, 50),
      ];
    });

    lines.push(buildTable(
      ['Strike', 'Notional', 'Classification', 'Spot Relation', 'Context'],
      rows,
    ));
    lines.push('');

    if (day.filterCheckpoint) {
      lines.push(`> ${day.filterCheckpoint}`);
      lines.push('');
    }
  }

  // Summary line
  lines.push(`**Total:** ${totalExpiries} expiry strike(s) across ${otcDays.length} day(s) — ${significantCount} significant.`);
  lines.push('');

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: DXY IP ZONE MAP (Pillar Breakdown)
// ═══════════════════════════════════════════════════════════════════════════════

function generateIpZoneMap(zoneMap: ZoneMapSnapshot | null): string {
  const lines: string[] = [];
  lines.push('## 2. DXY IP Zone Map (Pillar Breakdown)');
  lines.push('');

  if (!zoneMap || !zoneMap.zones || zoneMap.zones.length === 0) {
    lines.push('*No IP zone data available.*');
    lines.push('');
    return lines.join('\n');
  }

  const zones = zoneMap.zones;
  const spot = zoneMap.spots?.['DXY'];

  // ── Main zone table ──
  lines.push('### Zone Inventory');
  lines.push('');

  const zoneRows = zones.map((z) => {
    const relativePos = spot !== undefined
      ? z.ceiling < spot ? 'Below' : z.floor > spot ? 'Above' : 'At Spot'
      : '—';
    return [
      z.zoneName || z.id,
      fmtRange('DXY', z.floor, z.ceiling),
      String(z.type),
      z.isBoM ? 'BoM' : 'MoM',
      relativePos,
      String(z.reactionCount),
      fmtPct(z.zfp),
      String(z.confluence),
    ];
  });

  lines.push(buildTable(
    ['Zone', 'Range', 'Type', 'BoM/MoM', 'vs Spot', 'Reactions', 'ZFP', 'Confluence'],
    zoneRows,
  ));
  lines.push('');

  // ── Pillar scores ──
  lines.push('### 9-Pillar Breakdown');
  lines.push('');

  const hasPillars = zones.some((z) => z.pillars && z.pillars.length > 0);
  if (!hasPillars) {
    lines.push('*No pillar score data available.*');
    lines.push('');
  } else {
    const pillarHeaders = ['Zone', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'Sum'];
    const pillarRows = zones.map((z) => {
      const pillars = z.pillars ?? [];
      const sum = pillars.reduce((a, b) => a + b, 0);
      const padded = [...pillars];
      while (padded.length < 9) padded.push(0 as number);
      return [
        z.zoneName || z.id,
        ...padded.slice(0, 9).map((p) => String(p)),
        String(sum),
      ];
    });
    lines.push(buildTable(pillarHeaders, pillarRows));
    lines.push('');
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: DXY ZONE SYNTHESIS
// ═══════════════════════════════════════════════════════════════════════════════

function generateZoneSynthesis(zoneMap: ZoneMapSnapshot | null): string {
  const lines: string[] = [];
  lines.push('## 3. DXY Zone Synthesis');
  lines.push('');

  if (!zoneMap || !zoneMap.zones || zoneMap.zones.length === 0) {
    lines.push('*No zone synthesis data available.*');
    lines.push('');
    return lines.join('\n');
  }

  const zones = zoneMap.zones;
  const spot = zoneMap.spots?.['DXY'];

  // ── Pressure classification ──
  const pressureFromZfp = (zfp: number): string => {
    if (zfp >= 70) return 'EXTREME';
    if (zfp >= 55) return 'HEAVY';
    if (zfp >= 40) return 'MODERATE';
    if (zfp >= 25) return 'LIGHT';
    return 'MINIMAL';
  };

  // ── Key drivers extraction ──
  const keyDrivers = (z: DXYZone): string => {
    const drivers: string[] = [];
    if (z.notionalB && z.notionalB > 0) drivers.push(`${z.notionalB.toFixed(1)}B options`);
    if (z.defenseStatus) drivers.push(z.defenseStatus);
    if (z.sdFresh) drivers.push(`Fresh: ${z.sdFresh}`);
    if (z.sdOverlap && z.sdOverlap !== 'none') drivers.push(`Overlap: ${z.sdOverlap}`);
    if (z.liquidityScore !== undefined) drivers.push(`Liq: ${z.liquidityScore.toFixed(0)}/10`);
    return drivers.length > 0 ? drivers.join(', ') : '—';
  };

  const rows = zones.map((z) => {
    const category = spot !== undefined
      ? z.ceiling < spot
        ? 'Support'
        : z.floor > spot
          ? 'Resistance'
          : 'Equilibrium'
      : '—';
    return [
      z.zoneName || z.id,
      fmtRange('DXY', z.floor, z.ceiling),
      pressureFromZfp(z.zfp),
      String(z.confluence),
      fmtPct(z.zfp),
      String(z.type),
      category,
      keyDrivers(z),
    ];
  });

  lines.push(buildTable(
    ['Zone', 'Range', 'Pressure', 'Score', 'ZFP', 'Type', 'Category', 'Key Drivers'],
    rows,
  ));
  lines.push('');

  // ── Per-zone detail ──
  lines.push('### Zone Details');
  lines.push('');

  for (const z of zones) {
    const name = z.zoneName || z.id;
    lines.push(`#### ${name} (${fmtRange('DXY', z.floor, z.ceiling)})`);
    lines.push('');
    lines.push(`- **Type:** ${z.type}`);
    lines.push(`- **Mechanism:** ${z.isBoM ? 'Beginning of Move' : 'Middle of Move'}`);
    lines.push(`- **ZFP:** ${fmtPct(z.zfp)} — Pressure: ${pressureFromZfp(z.zfp)}`);
    lines.push(`- **Confluence Score:** ${z.confluence}`);
    lines.push(`- **Reactions:** ${z.reactionCount}${z.reactionStatus ? ` (${z.reactionStatus})` : ''}`);

    if (z.sdType) lines.push(`- **SD Type:** ${z.sdType}`);
    if (z.sdFresh) lines.push(`- **Freshness:** ${z.sdFresh}`);
    if (z.sdOverlap && z.sdOverlap !== 'none') lines.push(`- **Overlap:** ${z.sdOverlap}`);
    if (z.defenseStatus) lines.push(`- **Defense:** ${z.defenseStatus}`);
    if (z.notionalB && z.notionalB > 0) lines.push(`- **Options Notional:** ${z.notionalB.toFixed(2)}B`);
    if (z.liquidityScore !== undefined) lines.push(`- **Liquidity Score:** ${z.liquidityScore.toFixed(1)}/10`);
    if (z.engine3Status) lines.push(`- **Engine 3 Status:** ${z.engine3Status}`);
    if (z.refinedLabel) lines.push(`- **Refined Label:** ${z.refinedLabel}`);

    // Intra-zone levels
    if (z.intraLevels && z.intraLevels.length > 0) {
      lines.push('');
      lines.push('  **Intra-Zone Levels:**');
      lines.push('');
      const intraRows = z.intraLevels.map((il) => [
        fmtPrice('DXY', il.price),
        il.type,
        il.strength.toFixed(2),
        il.source || '—',
      ]);
      lines.push('  ' + buildTable(
        ['Price', 'Type', 'Strength', 'Source'],
        intraRows,
      ).replace(/\n/g, '\n  '));
    }

    lines.push('');
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: DXY 4H ZONE CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

function generate4hClassification(zoneMap: ZoneMapSnapshot | null): string {
  const lines: string[] = [];
  lines.push('## 4. DXY 4H Zone Classification');
  lines.push('');

  if (!zoneMap || !zoneMap.zones || zoneMap.zones.length === 0) {
    lines.push('*No 4H zone classification data available.*');
    lines.push('');
    return lines.join('\n');
  }

  const zones = zoneMap.zones;
  const spot = zoneMap.spots?.['DXY'];

  const rows = zones.map((z) => {
    const category = spot !== undefined
      ? z.ceiling < spot
        ? 'SUP'
        : z.floor > spot
          ? 'RES'
          : 'MID'
      : '—';

    const sdClassification =
      z.sdType ?? (z.isBoM ? 'BoM' : 'MoM');

    const engineRole = z.engine3Status ?? '—';

    return [
      z.zoneName || z.id,
      fmtRange('DXY', z.floor, z.ceiling),
      String(z.type),
      category,
      sdClassification,
      z.sdFresh ?? '—',
      z.sdOverlap ?? '—',
      String(z.reactionCount),
      engineRole,
    ];
  });

  lines.push(buildTable(
    [
      'Zone',
      'Range',
      'Type',
      'Category',
      'SD Type',
      'Freshness',
      'Overlap',
      'Reactions',
      'Engine 3 Role',
    ],
    rows,
  ));
  lines.push('');

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: ECONOMIC CALENDAR
// ═══════════════════════════════════════════════════════════════════════════════

function generateEconomicCalendar(harvestData: HarvestData | null): string {
  const lines: string[] = [];
  lines.push('## 5. Economic Calendar');
  lines.push('');

  const calendar = harvestData?.calendar;

  if (!calendar || calendar.length === 0) {
    lines.push('*No economic calendar data available.*');
    lines.push('');
    return lines.join('\n');
  }

  // Sort by timestamp
  const sorted = [...calendar].sort((a, b) => a.timestamp - b.timestamp);

  // Filter to HIGH and MEDIUM only for the report (LOW is noise)
  const significant = sorted.filter(
    (e) => e.impact === 'HIGH' || e.impact === 'MEDIUM',
  );

  if (significant.length === 0) {
    lines.push('*No HIGH/MEDIUM impact events this week.*');
    lines.push('');
    return lines.join('\n');
  }

  const rows = significant.map((e) => {
    const dt = new Date(e.timestamp);
    const dateStr = dt.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
    const timeStr = dt.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      hour12: false,
    });
    const impactBadge = e.impact === 'HIGH'
      ? '**HIGH**'
      : e.impact === 'MEDIUM'
        ? 'MEDIUM'
        : 'LOW';
    return [
      dateStr,
      timeStr + ' UTC',
      e.currency,
      e.event,
      impactBadge,
    ];
  });

  lines.push(buildTable(
    ['Date', 'Time', 'Ccy', 'Event', 'Impact'],
    rows,
  ));
  lines.push('');

  // Highlight red-folder events
  const redFolders = significant.filter((e) => e.impact === 'HIGH');
  if (redFolders.length > 0) {
    lines.push(`> **Red Fences:** ${redFolders.length} HIGH-impact event(s) this week. All trades within ±30 min of these events are suppressed.`);
    lines.push('');
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: MISSING DATA LOG
// ═══════════════════════════════════════════════════════════════════════════════

function generateMissingDataLog(input: MdReportInput): string {
  const lines: string[] = [];
  lines.push('## 6. Missing Data Log');
  lines.push('');

  const missing: string[][] = [];

  // Check zone map
  if (!input.zoneMapSnapshot) {
    missing.push(['Zone Map Snapshot', 'Not provided', 'Zone analysis will be incomplete']);
  } else if (!input.zoneMapSnapshot.zones || input.zoneMapSnapshot.zones.length === 0) {
    missing.push(['Zone Map Snapshot', 'Empty zones array', 'No zones detected']);
  }

  // Check shape snapshot
  if (!input.shapeSnapshot) {
    missing.push(['Shape Prediction Snapshot', 'Not provided', 'Shape chain unavailable']);
  } else if (!input.shapeSnapshot.shapeChain) {
    missing.push(['Shape Prediction Snapshot', 'Missing shapeChain', 'Shape chain unavailable']);
  }

  // Check harvest data
  if (!input.harvestData) {
    missing.push(['Harvest Data', 'Not provided', 'Calendar, OTC options unavailable']);
  } else {
    if (!input.harvestData.calendar || input.harvestData.calendar.length === 0) {
      missing.push(['Economic Calendar', 'Empty or missing', 'Red fence detection inactive']);
    }
    if (!input.harvestData.otcExpiries || input.harvestData.otcExpiries.length === 0) {
      missing.push(['OTC Options', 'Empty or missing', 'Options magnet analysis unavailable']);
    }
    if (!input.harvestData.spots || Object.keys(input.harvestData.spots).length === 0) {
      missing.push(['Spot Prices', 'Not in harvest data', 'Spot references from zone map only']);
    }
  }

  // Check screenshots
  if (!input.screenshots || input.screenshots.length === 0) {
    missing.push(['Screenshots', 'None captured', 'Visual verification unavailable']);
  }

  // Check per-pair setup gaps
  for (const pair of PAIR_ORDER) {
    const count = input.setups.filter((s) => s.pair === pair).length;
    if (count === 0) {
      missing.push([`${pair} Setups`, 'No setups generated', `${pair} trade map empty`]);
    }
  }

  // Check per-setup data quality
  const setupsMissingEntries = input.setups.filter(
    (s) => s.entry1 === undefined && s.entry2 === undefined && s.entry3 === undefined,
  );
  if (setupsMissingEntries.length > 0) {
    missing.push([
      'Staggered Entries',
      `${setupsMissingEntries.length} setup(s) missing entry1/2/3`,
      'Falling back to single entry',
    ]);
  }

  const setupsMissingBlended = input.setups.filter((s) => s.blendedRrr === undefined);
  if (setupsMissingBlended.length > 0) {
    missing.push([
      'Blended RRR',
      `${setupsMissingBlended.length} setup(s) missing blendedRrr`,
      'Using base RRR only',
    ]);
  }

  if (missing.length === 0) {
    lines.push('*All data sources present and complete. No missing data detected.*');
  } else {
    lines.push(buildTable(['Data Source', 'Issue', 'Impact'], missing));
  }
  lines.push('');

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: DXY MACRO SHAPE CHAIN (Engine 2)
// ═══════════════════════════════════════════════════════════════════════════════

function generateShapeChain(shapeSnapshot: ShapePredictionSnapshot | null): string {
  const lines: string[] = [];
  lines.push('## 7. DXY Macro Shape Chain (Engine 2)');
  lines.push('');

  if (!shapeSnapshot || !shapeSnapshot.shapeChain) {
    lines.push('*No shape chain data available.*');
    lines.push('');
    return lines.join('\n');
  }

  const chain: ShapeChain = shapeSnapshot.shapeChain;

  // ── Chain overview ──
  lines.push('### Chain Overview');
  lines.push('');
  lines.push(`- **Storyline Bias:** ${chain.storylineBias}`);
  lines.push(`- **Current Shape:** ${fmtShape(chain.currentShape)}`);
  lines.push(`- **Current Context:** ${chain.currentContext || '—'}`);
  lines.push(`- **Consolidation Phase:** ${chain.consolidationPhase || '—'}`);
  lines.push(`- **Breakout Watch:** ${chain.breakoutWatch || '—'}`);
  lines.push(`- **Trading Speed Adjustment:** ${chain.tradingSpeedAdjustment || '—'}`);
  if (chain.weeklyVisualization) {
    lines.push('');
    lines.push('**Weekly Visualization:**');
    lines.push('');
    lines.push('```');
    lines.push(chain.weeklyVisualization);
    lines.push('```');
  }
  lines.push('');

  // ── Shape chain table ──
  lines.push('### Forward Shape Map');
  lines.push('');

  if (!chain.chain || chain.chain.length === 0) {
    lines.push('*No shape chain steps available.*');
    lines.push('');
  } else {
    const rows = chain.chain.map((step: ShapePrediction) => [
      step.day || `Step ${step.step}`,
      fmtShape(step.shape),
      step.context || '—',
      step.keyTransitionTime || '—',
      fmtPct01(step.confidence),
      fmtPct(step.zfpFloor),
      fmtPct(step.zfpCeiling),
      step.transitionProb || '—',
    ]);

    lines.push(buildTable(
      ['Day', 'Shape', 'Context', 'Key Transition', 'Confidence', 'ZFP Floor', 'ZFP Ceiling', 'Transition Prob'],
      rows,
    ));
    lines.push('');
  }

  // ── Day decomposition ──
  if (chain.dayDecomposition && chain.dayDecomposition.length > 0) {
    lines.push('### Day-by-Day Decomposition');
    lines.push('');

    const dayRows = chain.dayDecomposition.map((d) => [
      d.day,
      fmtShape(d.shape),
      d.direction ?? '—',
      d.keyZone ?? '—',
      d.rationale ?? '—',
      fmtPct01(d.confidence),
    ]);

    lines.push(buildTable(
      ['Day', 'Shape', 'Direction', 'Key Zone', 'Rationale', 'Confidence'],
      dayRows,
    ));
    lines.push('');
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: DXY VOLATILITY TRIGGERS
// ═══════════════════════════════════════════════════════════════════════════════

function generateVolatilityTriggers(
  zoneMap: ZoneMapSnapshot | null,
  shapeSnapshot: ShapePredictionSnapshot | null,
  harvestData: HarvestData | null,
): string {
  const lines: string[] = [];
  lines.push('## 8. DXY Volatility Triggers');
  lines.push('');

  const triggers: string[][] = [];

  // High-ZFP zones
  if (zoneMap?.zones) {
    const highZfp = zoneMap.zones.filter((z) => z.zfp >= 55);
    for (const z of highZfp) {
      triggers.push([
        `${z.zoneName || z.id} (${fmtRange('DXY', z.floor, z.ceiling)})`,
        `ZFP ${fmtPct(z.zfp)}`,
        'High failure probability — expect strong reaction',
      ]);
    }
  }

  // Breakout watch from shape chain
  if (shapeSnapshot?.shapeChain?.breakoutWatch) {
    triggers.push([
      'Shape Chain Breakout Watch',
      'Directional',
      shapeSnapshot.shapeChain.breakoutWatch,
    ]);
  }

  // Options magnets
  if (harvestData?.otcExpiries) {
    for (const day of harvestData.otcExpiries) {
      const critical = day.expiries.filter(
        (e) => e.classification.includes('CRITICAL') || e.classification.includes('SIGNIFICANT'),
      );
      for (const c of critical) {
        triggers.push([
          `Options ${day.day} @ ${fmtPrice(c.pair, c.strike)}`,
          c.notional,
          trunc(c.technicalContext, 60),
        ]);
      }
    }
  }

  // Red folder events
  if (harvestData?.calendar) {
    const redFolders = harvestData.calendar.filter((e) => e.impact === 'HIGH');
    for (const e of redFolders) {
      const dt = new Date(e.timestamp);
      triggers.push([
        `${e.currency}: ${e.event}`,
        dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }),
        'Red fence — trading suppressed ±30 min',
      ]);
    }
  }

  if (triggers.length === 0) {
    lines.push('*No significant volatility triggers identified.*');
  } else {
    lines.push(buildTable(['Trigger', 'Signal', 'Context'], triggers));
  }
  lines.push('');

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: TRADE SETUPS TABLE
// ═══════════════════════════════════════════════════════════════════════════════

function generateSetupsTable(pair: string, setups: TradeSetup[]): string {
  const lines: string[] = [];

  if (setups.length === 0) {
    lines.push('*No setups for this pair.*');
    lines.push('');
    return lines.join('\n');
  }

  // Sort by confidence descending
  const sorted = [...setups].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));

  const rows = sorted.map((s, idx) => {
    const entry1 = s.entry1 ?? s.entryFront ?? s.entry;
    const entry2 = s.entry2;
    const entry3 = s.entry3 ?? s.entryBack;
    const baseRrr = s.rrr;
    const blended = s.blendedRrr ?? s.combinedRRR;
    const quality = s.quality ?? 'STANDARD';
    const chainedFrom = s.chainedFrom ?? '—';

    return [
      String(idx + 1),
      fmtDirection(s.direction),
      s.day || '—',
      trunc(fmtSession(s.session), 25),
      fmtPrice(pair, entry1),
      entry2 !== undefined ? fmtPrice(pair, entry2) : '—',
      entry3 !== undefined ? fmtPrice(pair, entry3) : '—',
      fmtPrice(pair, s.sl),
      fmtPrice(pair, s.tp),
      fmtRrr(baseRrr),
      fmtRrr(blended),
      fmtConf(s.confidence),
      quality,
      s.zoneName || '—',
      trunc(s.shapeTrigger, 20),
      trunc(chainedFrom, 15),
    ];
  });

  lines.push(buildTable(
    [
      '#',
      'Dir',
      'Day',
      'Session',
      'Entry 1',
      'Entry 2',
      'Entry 3',
      'SL',
      'TP',
      'RRR',
      'Blend RRR',
      'Conf',
      'Quality',
      'Zone',
      'Shape Trigger',
      'Chained From',
    ],
    rows,
  ));
  lines.push('');

  // ── Setup detail annotations ──
  const hasDetails = sorted.some(
    (s) =>
      s.notes ||
      s.multiTfConfluence ||
      s.refinedLabel ||
      s.cascadeSource ||
      s.mirrorOf ||
      s.entryEdge ||
      s.proximityPips !== undefined ||
      s.slDistancePips !== undefined ||
      s.timesfmQualityGrade ||
      s.dualBrainGrade,
  );

  if (hasDetails) {
    lines.push('### Setup Annotations');
    lines.push('');

    sorted.forEach((s, idx) => {
      const annotations: string[] = [];

      if (s.category) annotations.push(`**Category:** ${s.category}`);
      if (s.slPips !== undefined) annotations.push(`**SL Distance:** ${s.slPips.toFixed(0)} pips`);
      if (s.slDistancePips !== undefined) annotations.push(`**SL (v8):** ${s.slDistancePips.toFixed(0)} pips`);
      if (s.entryEdge) annotations.push(`**Entry Edge:** ${s.entryEdge}`);
      if (s.proximityPips !== undefined) {
        annotations.push(`**Proximity:** ${s.proximityPips.toFixed(0)} pips (${s.proximityStatus ?? '—'})`);
      }
      if (s.isBoMEntry) annotations.push('**BoM Entry:** Yes');
      if (s.cascadeSource) annotations.push(`**Cascade:** ${s.cascadeSource}`);
      if (s.mirrorOf) annotations.push(`**Mirror (§9.6):** deterministic mirror of \`${s.mirrorOf}\``);
      if (s.refinedLabel) annotations.push(`**Refined:** ${s.refinedLabel}`);
      if (s.isZoC) annotations.push(`**Zone of Conquest** (score: ${s.zocScore ?? '—'})`);

      // Multi-TF confluence
      if (s.multiTfConfluence) {
        const mtc = s.multiTfConfluence;
        annotations.push(`**Multi-TF:** ${mtc.htfZone} + ${mtc.ltfZones.join(', ')} (${mtc.confluenceScore} TF zones)`);
      }

      // LTF entry zone
      if (s.ltfEntryZone) {
        annotations.push(`**LTF Zone:** ${s.ltfEntryZone.label} (${s.ltfEntryZone.timeframe})`);
      }

      // Fib levels
      if (s.fibLevels && s.fibLevels.length > 0) {
        const fibStr = s.fibLevels.map((f) => `${f.level.toFixed(3)}@${fmtPrice(pair, f.price)}`).join(', ');
        annotations.push(`**Fib:** ${fibStr}`);
      }

      // Reinforcement levels
      if (s.reinforcementLevels && s.reinforcementLevels.length > 0) {
        const rStr = s.reinforcementLevels.map((r) => `R${r.fibLevel.toFixed(3)}@${fmtPrice(pair, r.price)}`).join(' ');
        annotations.push(`**Reinforcement:** ${rStr}`);
      }

      // Dual-brain
      if (s.dualBrainGrade) {
        annotations.push(`**Dual-Brain:** ${s.dualBrainGrade}${s.dualBrainAgreement ? ` (${s.dualBrainAgreement})` : ''}`);
      }

      // TimesFM
      if (s.timesfmQualityGrade) {
        annotations.push(`**TimesFM:** ${s.timesfmQualityGrade}`);
        if (s.shapeDelta !== undefined) {
          annotations.push(`**Shape Δ:** ${s.shapeDelta > 0 ? '+' : ''}${s.shapeDelta} (${s.shapeDeltaLevel ?? '—'})`);
        }
      }

      // VLM
      if (s.vlmStatus) {
        annotations.push(`**VLM:** ${s.vlmStatus}${s.vlmNotes ? ` — ${trunc(s.vlmNotes, 40)}` : ''}`);
      }

      // Chain
      if (s.chainId) {
        annotations.push(`**Chain:** ${s.chainId} (pos ${s.chainPosition ?? '—'})`);
      }
      if (s.chainShape) {
        annotations.push(`**Chain Shape:** ${s.chainShape}`);
      }

      // Notes
      if (s.notes) {
        annotations.push(`**Notes:** ${trunc(s.notes, 80)}`);
      }

      if (annotations.length > 0) {
        lines.push(`**#${idx + 1}** — ${annotations.join(' | ')}`);
      }
    });
    lines.push('');
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: PAIR HEADER + TRADE SETUPS
// ═══════════════════════════════════════════════════════════════════════════════

function generatePairSetupsSection(pair: string, setups: TradeSetup[]): string {
  const lines: string[] = [];
  lines.push(`## TRADE SETUPS — ${pair}`);
  lines.push('');

  lines.push(generateSetupsTable(pair, setups));

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: FX PAIR ANALYSIS (Zones, Shapes, Commentary, Volatility)
// ═══════════════════════════════════════════════════════════════════════════════

function generateFxPairZoneSynthesis(
  pair: string,
  sectionNum: number,
  setups: TradeSetup[],
  zoneMap: ZoneMapSnapshot | null,
): string {
  const lines: string[] = [];
  lines.push(`## ${sectionNum}. ${pair} Zone Synthesis`);
  lines.push('');

  // Extract unique zones from setups
  const zoneMapByPair = new Map<string, { zoneName: string; zoneType: string; entries: number[]; sl: number; tp: number; setups: number }>();

  for (const s of setups) {
    const zName = s.zoneName || '—';
    if (!zoneMapByPair.has(zName)) {
      zoneMapByPair.set(zName, {
        zoneName: zName,
        zoneType: s.zoneType ? String(s.zoneType) : '—',
        entries: [],
        sl: s.sl,
        tp: s.tp,
        setups: 0,
      });
    }
    const entry = zoneMapByPair.get(zName)!;
    entry.setups++;
    if (s.entry1 !== undefined) entry.entries.push(s.entry1);
    if (s.entry2 !== undefined) entry.entries.push(s.entry2);
    if (s.entry3 !== undefined) entry.entries.push(s.entry3);
    if (s.entry !== undefined && entry.entries.length === 0) entry.entries.push(s.entry);
  }

  if (zoneMapByPair.size === 0) {
    lines.push('*No zone synthesis data available for this pair.*');
    lines.push('');
    return lines.join('\n');
  }

  const rows = Array.from(zoneMapByPair.values()).map((z) => {
    const minEntry = z.entries.length > 0 ? Math.min(...z.entries) : undefined;
    const maxEntry = z.entries.length > 0 ? Math.max(...z.entries) : undefined;
    const range = minEntry !== undefined && maxEntry !== undefined
      ? fmtRange(pair, minEntry, maxEntry)
      : '—';
    return [
      z.zoneName,
      range,
      z.zoneType,
      String(z.setups),
      fmtPrice(pair, z.sl),
      fmtPrice(pair, z.tp),
    ];
  });

  lines.push(buildTable(
    ['Zone', 'Entry Range', 'Type', 'Setups', 'SL', 'TP'],
    rows,
  ));
  lines.push('');

  return lines.join('\n');
}

function generateFxPairClassification(
  pair: string,
  sectionNum: number,
  setups: TradeSetup[],
): string {
  const lines: string[] = [];
  lines.push(`## ${sectionNum}. ${pair} 4H Classification`);
  lines.push('');

  if (setups.length === 0) {
    lines.push('*No 4H classification data available for this pair.*');
    lines.push('');
    return lines.join('\n');
  }

  // Group by direction
  const longs = setups.filter((s) => s.direction === TradeDirection.LONG);
  const shorts = setups.filter((s) => s.direction === TradeDirection.SHORT);
  const neutral = setups.filter(
    (s) => s.direction !== TradeDirection.LONG && s.direction !== TradeDirection.SHORT,
  );

  lines.push(`- **Longs:** ${longs.length}`);
  lines.push(`- **Shorts:** ${shorts.length}`);
  if (neutral.length > 0) lines.push(`- **Neutral/Other:** ${neutral.length}`);
  lines.push('');

  // Quality breakdown
  const qualityBreakdown = new Map<string, number>();
  for (const s of setups) {
    const q = s.quality ?? 'STANDARD';
    qualityBreakdown.set(q, (qualityBreakdown.get(q) ?? 0) + 1);
  }

  if (qualityBreakdown.size > 0) {
    lines.push('**Quality Distribution:**');
    lines.push('');
    const qRows = Array.from(qualityBreakdown.entries()).map(([q, count]) => [q, String(count)]);
    lines.push(buildTable(['Quality', 'Count'], qRows));
    lines.push('');
  }

  // Session distribution
  const sessionBreakdown = new Map<string, number>();
  for (const s of setups) {
    const sess = String(s.session).split(' ')[0]; // first word
    sessionBreakdown.set(sess, (sessionBreakdown.get(sess) ?? 0) + 1);
  }

  if (sessionBreakdown.size > 0) {
    lines.push('**Session Distribution:**');
    lines.push('');
    const sRows = Array.from(sessionBreakdown.entries()).map(([sess, count]) => [sess, String(count)]);
    lines.push(buildTable(['Session', 'Count'], sRows));
    lines.push('');
  }

  return lines.join('\n');
}

function generateFxPairCommentary(
  pair: string,
  sectionNum: number,
  setups: TradeSetup[],
  harvestData: HarvestData | null,
): string {
  const lines: string[] = [];
  lines.push(`## ${sectionNum}. ${pair} Commentary`);
  lines.push('');

  if (setups.length === 0) {
    lines.push('*No commentary available — no setups generated for this pair.*');
    lines.push('');
    return lines.join('\n');
  }

  // Bias
  const longs = setups.filter((s) => s.direction === TradeDirection.LONG).length;
  const shorts = setups.filter((s) => s.direction === TradeDirection.SHORT).length;
  const bias = longs > shorts
    ? `**Directional bias:** BULLISH (${longs} long vs ${shorts} short)`
    : shorts > longs
      ? `**Directional bias:** BEARISH (${shorts} short vs ${longs} long)`
      : `**Directional bias:** NEUTRAL (${longs} long, ${shorts} short)`;
  lines.push(bias);
  lines.push('');

  // Average confidence
  const avgConf = setups.reduce((sum, s) => sum + (s.confidence ?? 0), 0) / setups.length;
  lines.push(`**Average confidence:** ${avgConf.toFixed(1)}/100`);
  lines.push('');

  // Best setup
  const best = [...setups].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0];
  if (best) {
    lines.push(
      `**Highest-conviction setup:** ${fmtDirection(best.direction)} at ${fmtPrice(pair, best.entry1 ?? best.entry)} (conf ${fmtConf(best.confidence)}, ${best.quality ?? 'STANDARD'})`,
    );
    lines.push('');
  }

  // Dominant shapes
  const shapeBreakdown = new Map<string, number>();
  for (const s of setups) {
    const sh = s.shapeTrigger || s.shapeAlignment ? String(s.shapeAlignment) : '—';
    shapeBreakdown.set(sh, (shapeBreakdown.get(sh) ?? 0) + 1);
  }
  if (shapeBreakdown.size > 0) {
    const topShapes = Array.from(shapeBreakdown.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    lines.push(`**Dominant shapes:** ${topShapes.map(([sh, c]) => `${sh} (${c})`).join(', ')}`);
    lines.push('');
  }

  // Analyst bias from harvest data
  if (harvestData?.analystBias?.[pair]) {
    lines.push(`**External analyst bias:** ${harvestData.analystBias[pair]}`);
    lines.push('');
  }

  // Key zones referenced
  const zones = new Set<string>();
  for (const s of setups) {
    if (s.zoneName) zones.add(s.zoneName);
  }
  if (zones.size > 0) {
    lines.push(`**Zones in play:** ${Array.from(zones).join(', ')}`);
    lines.push('');
  }

  return lines.join('\n');
}

function generateFxPairShapeChain(
  pair: string,
  sectionNum: number,
  setups: TradeSetup[],
  shapeSnapshot: ShapePredictionSnapshot | null,
): string {
  const lines: string[] = [];
  lines.push(`## ${sectionNum}. ${pair} Shape Chain`);
  lines.push('');

  // W6-3: renders the pair's OWN dedicated shape chain (per-pair Engine 2
  // output). DXY macro direction reaches this pair via the injected cascade
  // bias in Engine 3, not via a relabeled DXY chain.
  if (shapeSnapshot?.shapeChain) {
    const chain = shapeSnapshot.shapeChain;
    lines.push(`**Current Shape:** ${chain.currentShape}`);
    lines.push(`**Storyline Bias:** ${chain.storylineBias}`);
    lines.push('');
    lines.push(`*${pair} shape chain computed from dedicated ${pair} zones against ${pair} spot. DXY macro direction applied as inverse cascade bias (Part 6.5).*`);
    lines.push('');

    // Show shapes referenced in setups
    const setupShapes = new Map<string, number>();
    for (const s of setups) {
      const trigger = s.shapeTrigger ?? (s.shapeAlignment ? String(s.shapeAlignment) : null);
      if (trigger) {
        setupShapes.set(trigger, (setupShapes.get(trigger) ?? 0) + 1);
      }
    }

    if (setupShapes.size > 0) {
      const rows = Array.from(setupShapes.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([shape, count]) => [fmtShape(shape), String(count)]);
      lines.push(buildTable(['Shape', 'Setups Using'], rows));
      lines.push('');
    }
  } else {
    lines.push('*No shape chain data available for this pair.*');
    lines.push('');
  }

  return lines.join('\n');
}

function generateFxPairVolatility(
  pair: string,
  sectionNum: number,
  setups: TradeSetup[],
): string {
  const lines: string[] = [];
  lines.push(`## ${sectionNum}. ${pair} Volatility`);
  lines.push('');

  if (setups.length === 0) {
    lines.push('*No volatility data available for this pair.*');
    lines.push('');
    return lines.join('\n');
  }

  // SL distance distribution as volatility proxy
  const slPips = setups
    .map((s) => s.slPips ?? s.slDistancePips)
    .filter((v): v is number => v !== undefined && !Number.isNaN(v));

  if (slPips.length > 0) {
    const avg = slPips.reduce((a, b) => a + b, 0) / slPips.length;
    const min = Math.min(...slPips);
    const max = Math.max(...slPips);
    lines.push(`- **Avg SL distance:** ${avg.toFixed(0)} pips`);
    lines.push(`- **Min SL distance:** ${min.toFixed(0)} pips`);
    lines.push(`- **Max SL distance:** ${max.toFixed(0)} pips`);
    lines.push('');

    if (max > avg * 2) {
      lines.push('> **Note:** Wide SL range detected — volatility regime may be shifting.');
      lines.push('');
    }
  } else {
    lines.push('*SL distance data not available — cannot assess volatility.*');
    lines.push('');
  }

  // RRR distribution
  const rrrs = setups.map((s) => s.blendedRrr ?? s.rrr).filter((v): v is number => v !== undefined);
  if (rrrs.length > 0) {
    const avgRrr = rrrs.reduce((a, b) => a + b, 0) / rrrs.length;
    lines.push(`- **Avg Blend RRR:** ${avgRrr.toFixed(1)}x`);
    lines.push('');
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 24: DATA QUALITY SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

function generateDataQualitySummary(input: MdReportInput): string {
  const lines: string[] = [];
  lines.push('## 24. Data Quality Summary');
  lines.push('');

  const rows: string[][] = [];

  // Zone map quality
  const zoneCount = input.zoneMapSnapshot?.zones?.length ?? 0;
  rows.push([
    'Zone Map',
    zoneCount > 0 ? 'PRESENT' : 'MISSING',
    `${zoneCount} zones`,
    zoneCount > 0 ? 'GOOD' : 'CRITICAL',
  ]);

  // Shape chain quality
  const chainSteps = input.shapeSnapshot?.shapeChain?.chain?.length ?? 0;
  rows.push([
    'Shape Chain',
    chainSteps > 0 ? 'PRESENT' : 'MISSING',
    `${chainSteps} steps`,
    chainSteps > 0 ? 'GOOD' : 'CRITICAL',
  ]);

  // Calendar
  const calCount = input.harvestData?.calendar?.length ?? 0;
  rows.push([
    'Economic Calendar',
    calCount > 0 ? 'PRESENT' : 'MISSING',
    `${calCount} events`,
    calCount > 0 ? 'GOOD' : 'WARN',
  ]);

  // OTC options
  const otcDays = input.harvestData?.otcExpiries?.length ?? 0;
  rows.push([
    'OTC Options',
    otcDays > 0 ? 'PRESENT' : 'MISSING',
    `${otcDays} days`,
    otcDays > 0 ? 'GOOD' : 'WARN',
  ]);

  // Setups
  rows.push([
    'Trade Setups',
    input.setups.length > 0 ? 'PRESENT' : 'EMPTY',
    `${input.setups.length} setups`,
    input.setups.length > 0 ? 'GOOD' : 'CRITICAL',
  ]);

  // Screenshots
  rows.push([
    'Screenshots',
    input.screenshots.length > 0 ? 'PRESENT' : 'MISSING',
    `${input.screenshots.length} images`,
    input.screenshots.length > 0 ? 'GOOD' : 'WARN',
  ]);

  // Setups with staggered entries
  const withEntries = input.setups.filter(
    (s) => s.entry1 !== undefined || s.entry2 !== undefined || s.entry3 !== undefined,
  ).length;
  rows.push([
    'Staggered Entries',
    withEntries > 0 ? 'PARTIAL' : 'MISSING',
    `${withEntries}/${input.setups.length} setups`,
    withEntries === input.setups.length ? 'GOOD' : withEntries > 0 ? 'WARN' : 'CRITICAL',
  ]);

  // Setups with blended RRR
  const withBlended = input.setups.filter((s) => s.blendedRrr !== undefined).length;
  rows.push([
    'Blended RRR',
    withBlended > 0 ? 'PARTIAL' : 'MISSING',
    `${withBlended}/${input.setups.length} setups`,
    withBlended === input.setups.length ? 'GOOD' : withBlended > 0 ? 'WARN' : 'WARN',
  ]);

  lines.push(buildTable(
    ['Data Source', 'Status', 'Detail', 'Quality'],
    rows,
  ));
  lines.push('');

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 25: CROSS-PAIR SETUP MATRIX
// ═══════════════════════════════════════════════════════════════════════════════

function generateCrossPairMatrix(input: MdReportInput): string {
  const lines: string[] = [];
  lines.push('## 25. Cross-Pair Setup Matrix');
  lines.push('');

  if (input.setups.length === 0) {
    lines.push('*No setups generated — matrix is empty.*');
    lines.push('');
    return lines.join('\n');
  }

  // Rank all setups by confidence
  const ranked = [...input.setups].sort((a, b) => {
    // Sort by quality tier first, then confidence
    const qOrder: Record<string, number> = {
      GOD_TIER: 0, HIGH: 1, STANDARD: 2, CONDITIONAL: 3, REJECTED: 4,
    };
    const qa = qOrder[a.quality ?? 'STANDARD'] ?? 3;
    const qb = qOrder[b.quality ?? 'STANDARD'] ?? 3;
    if (qa !== qb) return qa - qb;
    return (b.confidence ?? 0) - (a.confidence ?? 0);
  });

  const rows = ranked.map((s, idx) => {
    const entry = s.entry1 ?? s.entryFront ?? s.entry;
    const blended = s.blendedRrr ?? s.combinedRRR;
    return [
      String(idx + 1),
      s.pair,
      fmtDirection(s.direction),
      s.day || '—',
      trunc(fmtSession(s.session), 20),
      fmtPrice(s.pair, entry),
      fmtPrice(s.pair, s.sl),
      fmtPrice(s.pair, s.tp),
      fmtRrr(blended ?? s.rrr),
      fmtConf(s.confidence),
      s.quality ?? 'STANDARD',
      s.zoneName || '—',
    ];
  });

  lines.push(buildTable(
    [
      'Rank',
      'Pair',
      'Dir',
      'Day',
      'Session',
      'Entry',
      'SL',
      'TP',
      'Blend RRR',
      'Conf',
      'Quality',
      'Zone',
    ],
    rows,
  ));
  lines.push('');

  // Summary by pair
  lines.push('### Pair Summary');
  lines.push('');

  const summaryRows = PAIR_ORDER.map((pair) => {
    const pairSetups = ranked.filter((s) => s.pair === pair);
    const count = pairSetups.length;
    const avgConf = count > 0
      ? (pairSetups.reduce((sum, s) => sum + (s.confidence ?? 0), 0) / count).toFixed(0)
      : '—';
    const bestQuality = pairSetups
      .map((s) => s.quality ?? 'STANDARD')
      .sort((a, b) => {
        const order: Record<string, number> = { GOD_TIER: 0, HIGH: 1, STANDARD: 2, CONDITIONAL: 3, REJECTED: 4 };
        return (order[a] ?? 3) - (order[b] ?? 3);
      })[0] ?? '—';
    const avgRrr = count > 0
      ? (() => {
        const rrrs = pairSetups.map((s) => s.blendedRrr ?? s.rrr).filter((v): v is number => v !== undefined);
        return rrrs.length > 0 ? `${(rrrs.reduce((a, b) => a + b, 0) / rrrs.length).toFixed(1)}x` : '—';
      })()
      : '—';

    return [pair, String(count), avgConf, bestQuality, avgRrr];
  });

  lines.push(buildTable(
    ['Pair', 'Setups', 'Avg Conf', 'Best Quality', 'Avg Blend RRR'],
    summaryRows,
  ));
  lines.push('');

  // Execution priority
  lines.push('### Execution Priority');
  lines.push('');

  const top3 = ranked.slice(0, 3);
  if (top3.length > 0) {
    lines.push('Top 3 setups to execute first:');
    lines.push('');
    top3.forEach((s, i) => {
      lines.push(
        `${i + 1}. **${s.pair}** ${fmtDirection(s.direction)} — ${s.day} ${trunc(fmtSession(s.session), 25)} — Conf ${fmtConf(s.confidence)} (${s.quality ?? 'STANDARD'})`,
      );
    });
    lines.push('');
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: SCREENSHOTS INDEX
// ═══════════════════════════════════════════════════════════════════════════════

function generateScreenshotsIndex(screenshots: ScreenshotRef[]): string {
  const lines: string[] = [];

  if (screenshots.length === 0) return '';

  lines.push('## Appendix A: Screenshots Index');
  lines.push('');

  const rows = screenshots.map((s) => [s.pair, s.timeframe, `\`${s.path}\``]);
  lines.push(buildTable(['Pair', 'Timeframe', 'Path'], rows));
  lines.push('');

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN: generateMdReport
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate the complete Markdown report as a string.
 *
 * The report follows the Leviathan Report Template structure:
 *
 *   COVER PAGE (unnumbered)
 *   DXY MASTER (Sections 1-8)
 *   TRADE SETUPS — DXY
 *   EUR/USD (Sections 9-13) + TRADE SETUPS
 *   GBP/USD (Sections 14-18) + TRADE SETUPS
 *   AUD/USD (Sections 19-23) + TRADE SETUPS
 *   CROSS-PAIR (Sections 24-25)
 *   APPENDIX: Screenshots
 */
// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 26: MDVE MIRROR CASCADE (v4.4 deterministic lane)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Render the MDVE+mirror stage's evidence: the floor counts, the f(T)
 * firewall evaluation, the §11 mirror-floor verdict, the documented
 * casualties (§11 temporal clause — every discard carries its reason,
 * forever) and the §8.1 anchor-gate accounting. Rendered ONLY when the
 * stage ran (MdReportInput.mirror present) — the fail-safe emergent-only
 * path omits the section entirely (honest absence, never a blank table).
 */
function generateMdveMirrorSection(mirror: import('../pipeline/mdve-stage.js').MdveStageSummary): string {
  const lines: string[] = [];
  lines.push('## 26. MDVE Mirror Cascade (Deterministic Lane — §8/§9/§11)');
  lines.push('');
  lines.push('Zero pixels, zero LLM — computed from the harvested bars only. The mirror lane is the doctrine\'s PRIMARY setup floor; the emergent lane merges on top after the §8.1 structural-anchor gate.');
  lines.push('');
  lines.push('### Mirror Floor (§9.6 cascade output)');
  lines.push('');
  lines.push('| Lane | ACTIVE | Constructed |');
  lines.push('|------|--------|-------------|');
  lines.push(`| DXY source (§8) | ${mirror.dxySourceCount} | ${mirror.dxySourceCount} |`);
  lines.push(`| EUR/USD mirrors | ${mirror.euActive} | ${mirror.euConstructed} |`);
  lines.push(`| GBP/USD mirrors | ${mirror.guActive} | ${mirror.guConstructed} |`);
  lines.push('');
  lines.push(`**§11 mirror-floor:** ${mirror.floorOk ? 'OK' : '⚠ VIOLATION'}`);
  lines.push('');
  if (!mirror.floorOk) {
    for (const v of mirror.floorViolations) lines.push(`- ⚠ ${v}`);
    lines.push('');
  }
  lines.push('### f(T) Firewall');
  lines.push('');
  lines.push('```');
  for (const l of mirror.firewallLog) lines.push(l);
  lines.push('```');
  lines.push('');
  if (mirror.casualties.length > 0) {
    lines.push(`### Documented Casualties (${mirror.casualties.length})`);
    lines.push('');
    for (const c of mirror.casualties) lines.push(`- **${c.pair}** \`${c.sourceSetupId}\` [${c.status}] — ${c.reason}`);
    lines.push('');
  }
  if (mirror.failedAnchors.length > 0) {
    lines.push(`### Failed Anchors (${mirror.failedAnchors.length}) — honest, emergent lane covers`);
    lines.push('');
    for (const f of mirror.failedAnchors) lines.push(`- \`${f.sourceSetupId}\` → ${f.targetPair}: ${f.reason}`);
    lines.push('');
  }
  lines.push('### §8.1 Anchor Gate + Merge Accounting');
  lines.push('');
  lines.push(`- Emergent setups before the gate: **${mirror.emergentBefore}**`);
  lines.push(`- Anchor-gated emergent surplus: **${mirror.emergentAfterGate}** (${mirror.passiveSlopDropped} passive-anchor / unbattled dropped — the DXY=39 slop-killer)`);
  lines.push(`- Cross-lane duplicates removed (§8.4 identity: same zone + day + session): **${mirror.duplicatesDropped}**`);
  lines.push(`- **Merged total: ${mirror.mergedTotal} setups** (mirror floor + surplus)`);
  lines.push('');
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN REPORT ASSEMBLY
// ═══════════════════════════════════════════════════════════════════════════════

export function generateMdReport(input: MdReportInput): string {
  const { weekStart, setups, zoneMapSnapshot, shapeSnapshot, harvestData, screenshots } = input;

  const sections: string[] = [];

  // ── COVER PAGE ──
  sections.push(generateCoverPage(input));
  sections.push(HORIZONTAL_RULE);

  // ═══════════════════════════════════════════════════════════════════════════
  // DXY MASTER
  // ═══════════════════════════════════════════════════════════════════════════

  // Section 1: OTC Option Summary
  sections.push(generateOtcSummary(harvestData));

  // Section 2: IP Zone Map
  sections.push(generateIpZoneMap(zoneMapSnapshot));

  // Section 3: Zone Synthesis
  sections.push(generateZoneSynthesis(zoneMapSnapshot));

  // Section 4: 4H Zone Classification
  sections.push(generate4hClassification(zoneMapSnapshot));

  // Section 5: Economic Calendar
  sections.push(generateEconomicCalendar(harvestData));

  // Section 6: Missing Data Log
  sections.push(generateMissingDataLog(input));

  // Section 7: Macro Shape Chain
  sections.push(generateShapeChain(shapeSnapshot));

  // Section 8: Volatility Triggers
  sections.push(generateVolatilityTriggers(zoneMapSnapshot, shapeSnapshot, harvestData));

  sections.push(HORIZONTAL_RULE);

  // ── TRADE SETUPS — DXY ──
  const dxySetups = setups.filter((s) => s.pair === 'DXY');
  sections.push(generatePairSetupsSection('DXY', dxySetups));

  sections.push(HORIZONTAL_RULE);

  // ═══════════════════════════════════════════════════════════════════════════
  // FX PAIRS
  // ═══════════════════════════════════════════════════════════════════════════

  // ── EUR/USD (Sections 9-13) ──
  {
    const pair = 'EUR/USD';
    const pairSetups = setups.filter((s) => s.pair === pair);
    sections.push(generateFxPairZoneSynthesis(pair, 9, pairSetups, zoneMapSnapshot));
    sections.push(generateFxPairClassification(pair, 10, pairSetups));
    sections.push(generateFxPairCommentary(pair, 11, pairSetups, harvestData));
    sections.push(generateFxPairShapeChain(pair, 12, pairSetups, input.shapeByPair?.[pair] ?? shapeSnapshot));
    sections.push(generateFxPairVolatility(pair, 13, pairSetups));
    sections.push(generatePairSetupsSection(pair, pairSetups));
    sections.push(HORIZONTAL_RULE);
  }

  // ── GBP/USD (Sections 14-18) ──
  {
    const pair = 'GBP/USD';
    const pairSetups = setups.filter((s) => s.pair === pair);
    sections.push(generateFxPairZoneSynthesis(pair, 14, pairSetups, zoneMapSnapshot));
    sections.push(generateFxPairClassification(pair, 15, pairSetups));
    sections.push(generateFxPairCommentary(pair, 16, pairSetups, harvestData));
    sections.push(generateFxPairShapeChain(pair, 17, pairSetups, input.shapeByPair?.[pair] ?? shapeSnapshot));
    sections.push(generateFxPairVolatility(pair, 18, pairSetups));
    sections.push(generatePairSetupsSection(pair, pairSetups));
    sections.push(HORIZONTAL_RULE);
  }

  // ── AUD/USD (Sections 19-23) ──
  {
    const pair = 'AUD/USD';
    const pairSetups = setups.filter((s) => s.pair === pair);
    sections.push(generateFxPairZoneSynthesis(pair, 19, pairSetups, zoneMapSnapshot));
    sections.push(generateFxPairClassification(pair, 20, pairSetups));
    sections.push(generateFxPairCommentary(pair, 21, pairSetups, harvestData));
    sections.push(generateFxPairShapeChain(pair, 22, pairSetups, input.shapeByPair?.[pair] ?? shapeSnapshot));
    sections.push(generateFxPairVolatility(pair, 23, pairSetups));
    sections.push(generatePairSetupsSection(pair, pairSetups));
    sections.push(HORIZONTAL_RULE);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CROSS-PAIR
  // ═══════════════════════════════════════════════════════════════════════════

  // Section 24: Data Quality Summary
  sections.push(generateDataQualitySummary(input));

  // Section 25: Cross-Pair Setup Matrix
  sections.push(generateCrossPairMatrix(input));

  // Section 26: MDVE Mirror Cascade (v4.4 deterministic lane — only when the stage ran)
  if (input.mirror) {
    sections.push(generateMdveMirrorSection(input.mirror));
  }

  // ── Appendix ──
  const appendix = generateScreenshotsIndex(screenshots);
  if (appendix) {
    sections.push(HORIZONTAL_RULE);
    sections.push(appendix);
  }

  // ── Footer ──
  sections.push(HORIZONTAL_RULE);
  sections.push(`*Report generated by ${ENGINE_VERSION} at ${new Date().toISOString()}*`);
  sections.push('');

  return sections.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN: writeMdReport
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate the report and write it to disk.
 *
 * @param input - Report input data
 * @param outputPath - Absolute path to the output .md file
 * @returns The output path (same as input)
 */
export function writeMdReport(input: MdReportInput, outputPath: string): string {
  const md = generateMdReport(input);

  // Ensure the parent directory exists
  const dir = dirname(outputPath);
  mkdirSync(dir, { recursive: true });

  writeFileSync(outputPath, md, 'utf-8');

  return outputPath;
}

// RECONCILE-AT-INTEGRATION against w5-trade-computer's export.
// See report-model.ts header. The local TradeProjection mirror below tracks
// spec L1 §4 + B.W5.2 §3e (pair, direction, entry, sl, tp, rrr, confidence,
// anchors with e1ZoneId + e2ProjectionId, provenance ids, day, session,
// setupId). Reconcile field-for-field when trade-computer.ts lands.

import { REPORT_SECTIONS, sectionIds, validateSectionOrder } from './report-model';
import { evaluateRules, type RuleContext } from './report-rules';

export type ReportPair = 'DXY' | 'EUR/USD' | 'GBP/USD' | 'AUD/USD';
export type ReportDirection = 'LONG' | 'SHORT';
export type ProjectionSource = 'NATIVE' | 'CASCADE';

export interface ProjectionAnchor {
  price: number;
  e1ZoneId: string;
  e2ProjectionId: string;
  method: string;
}

export interface ReportTradeProjection {
  pair: ReportPair;
  direction: ReportDirection;
  entry: number;
  sl: number;
  tp: number;
  rrr: number;
  confidence: number;
  anchors: ProjectionAnchor[];
  e1ZoneId: string;
  e2DesignationId: string;
  day: string;
  session: string;
  setupId: string;
  pressureRead?: string;
  chainContextRef?: string;
  source?: ProjectionSource;
}

export interface ReportProjectionInput {
  meta: {
    week: string;
    analysisPointMs: number;
    pairs: ReportPair[];
    generated: string;
    spots: Record<string, number>;
  };
  projections: ReportTradeProjection[];
}

export type ReportRenderCode =
  | 'MISSING_PROJECTION'
  | 'INVALID_META'
  | 'INVALID_PROJECTION'
  | 'CONTRACT_VIOLATION';

export class ReportRenderError extends Error {
  readonly code: ReportRenderCode;
  constructor(code: ReportRenderCode, detail: string) {
    super(`[REPORT-RENDER:${code}] ${detail}`);
    this.name = 'ReportRenderError';
    this.code = code;
  }
}

export interface RenderedSection {
  id: number;
  title: string;
  rows: string[];
  ruleMarks: string[];
}

export interface RenderedReport {
  week: string;
  analysisPointMs: number;
  sectionOrder: number[];
  sections: RenderedSection[];
  ruleFailures: { ruleId: number; messages: string[] }[];
  tradeValid: boolean;
}

export const RRR_FLOOR = 2.5;
const RRR_EPS = 1e-9;

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function nonEmpty(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function computedRrr(p: ReportTradeProjection): number {
  const risk = Math.abs(p.entry - p.sl);
  const reward = Math.abs(p.tp - p.entry);
  if (risk <= 0) return NaN;
  return reward / risk;
}

function assertProjection(p: ReportTradeProjection, index: number): string[] {
  const marks: string[] = [];
  if (!isFiniteNumber(p.entry) || !isFiniteNumber(p.sl) || !isFiniteNumber(p.tp)) {
    throw new ReportRenderError('INVALID_PROJECTION', `projection ${index} has non-finite E/SL/TP`);
  }
  if (!isFiniteNumber(p.rrr) || !isFiniteNumber(p.confidence)) {
    throw new ReportRenderError('INVALID_PROJECTION', `projection ${index} has non-finite rrr/confidence`);
  }
  if (!nonEmpty(p.e1ZoneId) || !nonEmpty(p.e2DesignationId)) {
    throw new ReportRenderError('INVALID_PROJECTION', `projection ${index} missing provenance ids`);
  }
  if (!nonEmpty(p.day) || !nonEmpty(p.session) || !nonEmpty(p.setupId)) {
    throw new ReportRenderError('INVALID_PROJECTION', `projection ${index} missing day/session/setupId`);
  }
  if (!Array.isArray(p.anchors) || p.anchors.length === 0) {
    throw new ReportRenderError('INVALID_PROJECTION', `projection ${index} has no anchors`);
  }
  for (const a of p.anchors) {
    if (!nonEmpty(a.e1ZoneId) || !nonEmpty(a.e2ProjectionId) || !isFiniteNumber(a.price)) {
      throw new ReportRenderError('INVALID_PROJECTION', `projection ${index} has an anchor without e1ZoneId/e2ProjectionId/price`);
    }
  }
  if (p.direction === 'LONG' && !(p.sl < p.entry && p.entry < p.tp)) {
    marks.push(`projection ${index} violates DIRECTION_ORDER (LONG needs sl<entry<tp): ${p.sl}/${p.entry}/${p.tp}`);
  }
  if (p.direction === 'SHORT' && !(p.tp < p.entry && p.entry < p.sl)) {
    marks.push(`projection ${index} violates DIRECTION_ORDER (SHORT needs tp<entry<sl): ${p.tp}/${p.entry}/${p.sl}`);
  }
  const want = computedRrr(p);
  if (Number.isNaN(want)) {
    marks.push(`projection ${index} has zero risk width (entry==sl)`);
  } else if (Math.abs(want - p.rrr) > 1e-6) {
    marks.push(`projection ${index} rrr mismatch: stated ${p.rrr}, computed ${want}`);
  }
  if (want < RRR_FLOOR - RRR_EPS) marks.push(`projection ${index} below RRR floor ${RRR_FLOOR}: ${want}`);
  if (p.confidence < 0 || p.confidence > 1) {
    marks.push(`projection ${index} confidence out of range: ${p.confidence}`);
  }
  return marks;
}

function defaultRuleContext(): RuleContext {
  return {
    sectionIds: sectionIds(),
    pageSize: 'letter',
    marginsIn: 0.5,
    condPageBreakPt: 140,
    cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
    centerAligned: true,
    valignMiddle: true,
    keepTogetherSections: sectionIds(),
    pageBreakBeforePairs: true,
    maxTableWidthIn: 6.55,
    pairBreakSections: [9, 14, 19],
  };
}

function sectionRowsFor(id: number, input: ReportProjectionInput): string[] {
  const trades = input.projections.filter((p) => {
    if (id >= 1 && id <= 8) return p.pair === 'DXY';
    if (id >= 9 && id <= 13) return p.pair === 'EUR/USD';
    if (id >= 14 && id <= 18) return p.pair === 'GBP/USD';
    if (id >= 19 && id <= 23) return p.pair === 'AUD/USD';
    return true;
  });
  const rows = trades.map(
    (p) => `${p.setupId}|${p.pair}|${p.direction}|E=${p.entry}|SL=${p.sl}|TP=${p.tp}|RRR=${p.rrr}|conf=${p.confidence}|${p.day}|${p.session}`,
  );
  if (id === 24) {
    rows.push(`coverage: ${input.projections.length} projections across ${input.meta.pairs.join(',')}`);
  }
  if (id === 25) {
    rows.push(`matrix: ${input.projections.map((p) => p.setupId).join(',')}`);
  }
  return rows;
}

export function render(input: ReportProjectionInput | null | undefined): RenderedReport {
  if (input === null || input === undefined) {
    throw new ReportRenderError('MISSING_PROJECTION', 'no projection supplied: refusing to emit a stub report');
  }
  if (typeof input !== 'object' || input.meta === null || input.meta === undefined) {
    throw new ReportRenderError('MISSING_PROJECTION', 'projection envelope has no meta: refusing to emit a stub report');
  }
  const meta = input.meta;
  if (!nonEmpty(meta.week) || !isFiniteNumber(meta.analysisPointMs) || !nonEmpty(meta.generated)) {
    throw new ReportRenderError('INVALID_META', 'meta.week/analysisPointMs/generated must be present (timestamps come from projection data, never wall-clock)');
  }
  if (!Array.isArray(meta.pairs) || meta.pairs.length === 0) {
    throw new ReportRenderError('INVALID_META', 'meta.pairs must be a non-empty array');
  }
  if (typeof meta.spots !== 'object' || meta.spots === null) {
    throw new ReportRenderError('INVALID_META', 'meta.spots must be present');
  }
  if (!Array.isArray(input.projections) || input.projections.length === 0) {
    throw new ReportRenderError('MISSING_PROJECTION', 'projections array is empty: refusing to emit a stub report');
  }
  const contractMarks: string[] = [];
  input.projections.forEach((p, i) => {
    contractMarks.push(...assertProjection(p, i));
  });
  const ids = sectionIds();
  validateSectionOrder(ids);
  const evals = evaluateRules(defaultRuleContext());
  const ruleFailures = evals.filter((e) => !e.passed).map((e) => ({ ruleId: e.ruleId, messages: e.messages }));
  const sections: RenderedSection[] = REPORT_SECTIONS.map((s) => ({
    id: s.id,
    title: s.title,
    rows: sectionRowsFor(s.id, input),
    ruleMarks: contractMarks.filter((m) => s.id === 25 || s.id <= 8),
  }));
  return {
    week: meta.week,
    analysisPointMs: meta.analysisPointMs,
    sectionOrder: ids,
    sections,
    ruleFailures,
    tradeValid: contractMarks.length === 0 && ruleFailures.length === 0,
  };
}

export function renderToJson(input: ReportProjectionInput | null | undefined): string {
  const report = render(input);
  return JSON.stringify(sortKeys(report), null, 2);
}

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (typeof v === 'object' && v !== null) {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      out[k] = sortKeys((v as Record<string, unknown>)[k]);
    }
    return out;
  }
  return v;
}

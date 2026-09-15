// RECONCILE-AT-INTEGRATION against w5-trade-computer's export.
// ReportProjectionInput below is a LOCAL mirror of spec B.W5.2 / L1 §4
// TradeProjection (pair, direction, entry, sl, tp, rrr, confidence,
// anchors, day, session, setupId + provenance ids). Do NOT import
// trade-computer.ts here — it is Wave 2's file. At integration the local
// mirror must be reconciled field-for-field against the landed export.

export type SectionKind = 'cover' | 'dxy-master' | 'pair' | 'cross-pair';

export type PairAccent = 'navy' | 'eu' | 'gu' | 'au';

export interface SectionNode {
  id: number;
  title: string;
  kind: SectionKind;
  accent: PairAccent;
  requiredFields: string[];
  keepTogether: boolean;
  pageBreakBefore: boolean;
  condPageBreakPt: number | null;
}

export const SECTION_COUNT = 25;
export const COND_PAGE_BREAK_PT = 140;

export class UnknownSectionError extends Error {
  readonly code = 'UNKNOWN_SECTION';
  readonly sectionId: number;
  constructor(sectionId: number) {
    super(`[REPORT-MODEL] unknown section id refused: ${sectionId}`);
    this.name = 'UnknownSectionError';
    this.sectionId = sectionId;
  }
}

export class SectionOrderError extends Error {
  readonly code = 'SECTION_ORDER_BREAK';
  constructor(detail: string) {
    super(`[REPORT-MODEL] section order break refused: ${detail}`);
    this.name = 'SectionOrderError';
  }
}

function n(
  id: number, title: string, kind: SectionKind, accent: PairAccent,
  requiredFields: string[], opts?: { pageBreakBefore?: boolean; headingOnly?: boolean },
): SectionNode {
  return {
    id, title, kind, accent, requiredFields,
    keepTogether: true,
    pageBreakBefore: opts?.pageBreakBefore ?? false,
    condPageBreakPt: id === 1 ? null : COND_PAGE_BREAK_PT,
  };
}

export const REPORT_SECTIONS: readonly SectionNode[] = [
  n(1, 'DXY OTC FX Option Expiry Summary (Protocol A)', 'dxy-master', 'navy', ['expiryDays', 'kFactorAudit']),
  n(2, 'DXY Institutional Pressure Zone Map — 9-Pillar 6D Hybrid System', 'dxy-master', 'navy', ['pivots', 'maGrid', 'strikeToDxy', 'commentary', 'extremes', 'magnets']),
  n(3, 'DXY Institutional Pressure Zone Map — Synthesis', 'dxy-master', 'navy', ['zones', 'zoneDetails', 'lszSummary', 'spotPosition']),
  n(4, 'DXY 4H Zone Classification Overlay Summary', 'dxy-master', 'navy', ['classifications']),
  n(5, 'Economic Calendar and Red Folder Time-Locks (Protocol F)', 'dxy-master', 'navy', ['events', 'timeLocks']),
  n(6, 'Missing Data Log', 'dxy-master', 'navy', ['entries']),
  n(7, 'DXY Macro Shape Chain Map (Engine 2)', 'dxy-master', 'navy', ['step1', 'step2', 'step3', 'step4', 'weeklyChain']),
  n(8, 'DXY Volatility Trigger Summary', 'dxy-master', 'navy', ['triggers']),
  n(9, 'EUR/USD IP Zone Map Synthesis (Structural Equivalence)', 'pair', 'eu', ['zones', 'zoneDetails', 'lszSummary', 'spotPosition'], { pageBreakBefore: true }),
  n(10, 'EUR/USD 4H Zone Classification Overlay Summary', 'pair', 'eu', ['classifications']),
  n(11, 'EUR/USD Institutional Commentary (Layer 2 Verified)', 'pair', 'eu', ['commentary', 'maSignal']),
  n(12, 'EUR/USD Weekly Shape Chain Visualization', 'pair', 'eu', ['weeklyChain']),
  n(13, 'EUR/USD Volatility Trigger Summary', 'pair', 'eu', ['triggers']),
  n(14, 'GBP/USD IP Zone Map Synthesis (Structural Equivalence)', 'pair', 'gu', ['zones', 'zoneDetails', 'lszSummary', 'spotPosition'], { pageBreakBefore: true }),
  n(15, 'GBP/USD 4H Zone Classification Overlay Summary', 'pair', 'gu', ['classifications']),
  n(16, 'GBP/USD Institutional Commentary (Layer 2 Verified)', 'pair', 'gu', ['commentary', 'maSignal']),
  n(17, 'GBP/USD Weekly Shape Chain Visualization', 'pair', 'gu', ['weeklyChain']),
  n(18, 'GBP/USD Volatility Trigger Summary', 'pair', 'gu', ['triggers']),
  n(19, 'AUD/USD IP Zone Map Synthesis (Structural Equivalence)', 'pair', 'au', ['zones', 'zoneDetails', 'lszSummary', 'spotPosition'], { pageBreakBefore: true }),
  n(20, 'AUD/USD 4H Zone Classification Overlay Summary', 'pair', 'au', ['classifications']),
  n(21, 'AUD/USD Institutional Commentary (Layer 2 Verified)', 'pair', 'au', ['commentary', 'maSignal']),
  n(22, 'AUD/USD Weekly Shape Chain Visualization', 'pair', 'au', ['weeklyChain']),
  n(23, 'AUD/USD Volatility Trigger Summary', 'pair', 'au', ['triggers']),
  n(24, 'Data Quality & Verification Summary', 'cross-pair', 'navy', ['euVerification', 'guVerification', 'auVerification', 'correctionAudit']),
  n(25, 'Cross-Pair Comparison Matrix', 'cross-pair', 'navy', ['matrix', 'spotSummary', 'biasSummary', 'keyInsight']),
];

export function sectionById(id: number): SectionNode {
  const found = REPORT_SECTIONS.find((s) => s.id === id);
  if (found === undefined) throw new UnknownSectionError(id);
  return found;
}

export function requiredFieldsFor(id: number): string[] {
  return sectionById(id).requiredFields;
}

export function validateSectionOrder(ids: number[]): void {
  if (ids.length === 0) throw new SectionOrderError('empty section list');
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] !== i + 1) {
      throw new SectionOrderError(`position ${i} holds section ${String(ids[i])}, expected ${String(i + 1)}`);
    }
  }
}

export function sectionIds(): number[] {
  return REPORT_SECTIONS.map((s) => s.id);
}

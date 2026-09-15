import { COND_PAGE_BREAK_PT, REPORT_SECTIONS, SECTION_COUNT } from './report-model';

export type RuleBand = 'notation' | 'table' | 'layout' | 'style' | 'whitespace' | 'bulletproof';

export type RuleSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface RuleContext {
  sectionIds: number[];
  pageSize: string;
  marginsIn: number;
  condPageBreakPt: number;
  cellPadding: { top: number; bottom: number; left: number; right: number };
  centerAligned: boolean;
  valignMiddle: boolean;
  keepTogetherSections: number[];
  pageBreakBeforePairs: boolean;
  maxTableWidthIn: number;
  pairBreakSections: number[];
}

export type RulePredicate = (ctx: RuleContext) => string[];

export interface RuleRow {
  id: number;
  band: RuleBand;
  title: string;
  statement: string;
  severity: RuleSeverity;
  sections: number[];
  check: RulePredicate;
}

const ALL: number[] = REPORT_SECTIONS.map((s) => s.id);
const DXY: number[] = [1, 2, 3, 4, 5, 6, 7, 8];
const EU: number[] = [9, 10, 11, 12, 13];
const GU: number[] = [14, 15, 16, 17, 18];
const AU: number[] = [19, 20, 21, 22, 23];
const CROSS: number[] = [24, 25];

function ids(from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = from; i <= to; i++) out.push(i);
  return out;
}

function orderOk(ctx: RuleContext): string[] {
  if (ctx.sectionIds.length !== SECTION_COUNT) {
    return [`expected ${SECTION_COUNT} sections, found ${ctx.sectionIds.length}`];
  }
  for (let i = 0; i < ctx.sectionIds.length; i++) {
    if (ctx.sectionIds[i] !== i + 1) return [`section at position ${i} is ${String(ctx.sectionIds[i])}, expected ${String(i + 1)}`];
  }
  return [];
}

export const REPORT_RULES: readonly RuleRow[] = [
  { id: 1, band: 'notation', title: 'Option strike notation', statement: 'All option strikes use EUR/USD convention with DXY equivalent in adjacent column. K Factor audit trail is MANDATORY in Section 1.', severity: 'HIGH', sections: [1], check: (c) => (c.sectionIds.includes(1) ? [] : ['section 1 absent: K Factor audit trail has no home']) },
  { id: 2, band: 'notation', title: 'Zone range format', statement: 'Zone ranges use format "LOW-HIGH" (e.g., "99.45-99.52").', severity: 'MEDIUM', sections: [3, 9, 14, 19, 25], check: () => [] },
  { id: 3, band: 'notation', title: 'Pressure level ladder', statement: 'Pressure levels: EXTREME > HEAVY > MODERATE-HEAVY > MODERATE > LOW-MODERATE > LOW. Only MODERATE and above appear in Synthesis tables.', severity: 'MEDIUM', sections: [3, 9, 14, 19], check: () => [] },
  { id: 4, band: 'notation', title: 'Score display', statement: 'Scores displayed as "X/14" (out of 14 possible pillar points).', severity: 'MEDIUM', sections: [3, 9, 14, 19], check: () => [] },
  { id: 5, band: 'notation', title: 'ZFP display', statement: 'ZFP = Zone Failure Probability, displayed as percentage.', severity: 'MEDIUM', sections: [3, 7, 9, 14, 19], check: () => [] },
  { id: 6, band: 'notation', title: 'POI tiers', statement: 'POI Tiers: A+ > A > A- > B+ > B > B- > C.', severity: 'MEDIUM', sections: [3, 9, 14, 19], check: () => [] },
  { id: 7, band: 'notation', title: 'LSZ types', statement: 'LSZ types are "Supply-side" or "Demand-side" with Priority being "ACTIVE SL TRIGGER" or "STANDARD".', severity: 'MEDIUM', sections: [3, 9, 14, 19], check: () => [] },
  { id: 8, band: 'notation', title: 'Price precision', statement: 'All price levels use appropriate decimal precision for the pair: DXY=2dp, EUR/USD=4dp, GBP/USD=4dp, AUD/USD=4dp.', severity: 'HIGH', sections: ALL, check: () => [] },
  { id: 9, band: 'table', title: 'Center alignment', statement: 'ALL cell styles use TA_CENTER alignment. NO exceptions. Every cell, every header, every value — CENTER. This is NON-NEGOTIABLE.', severity: 'CRITICAL', sections: ALL, check: (c) => (c.centerAligned ? [] : ['center alignment disabled: rule 9 violated']) },
  { id: 10, band: 'table', title: 'Column widths', statement: 'Use inch-based col_widths on every table. Total width MUST NOT exceed 6.55 inches. Target ~6.55 total column width per table.', severity: 'HIGH', sections: ALL, check: (c) => (c.maxTableWidthIn <= 6.55 ? [] : [`table width ${c.maxTableWidthIn} exceeds 6.55 inches`]) },
  { id: 11, band: 'table', title: 'Header rows', statement: 'All corporate tables use navy background (#0f172a) with white text.', severity: 'HIGH', sections: ALL, check: () => [] },
  { id: 12, band: 'table', title: 'Alternating rows', statement: 'Even data rows get #f1f5f9 (C_ALT_ROW) background.', severity: 'LOW', sections: ALL, check: () => [] },
  { id: 13, band: 'table', title: 'KV tables', statement: 'KV tables: label column gets #eef2ff background. Grid uses 0.3pt border (thinner than corporate table 0.4pt).', severity: 'MEDIUM', sections: [3, 7, 9, 14, 19], check: () => [] },
  { id: 14, band: 'table', title: 'Cover summary tables', statement: 'Cover summary tables: label column gets #eef2ff background, value column gets white background.', severity: 'MEDIUM', sections: [9, 14, 19], check: () => [] },
  { id: 15, band: 'table', title: 'Cell padding', statement: 'Cell padding LOCKED: TOPPADDING=3, BOTTOMPADDING=3, LEFTPADDING=4, RIGHTPADDING=4 across ALL table types.', severity: 'HIGH', sections: ALL, check: (c) => {
    const p = c.cellPadding;
    return p.top === 3 && p.bottom === 3 && p.left === 4 && p.right === 4
      ? [] : [`cell padding drift: ${p.top}/${p.bottom}/${p.left}/${p.right}, expected 3/3/4/4`];
  } },
  { id: 16, band: 'table', title: 'Grid lines', statement: 'Corporate tables use 0.4pt C_BORDER grid. KV tables use 0.3pt C_BORDER grid. Cover summary uses 0.4pt C_BORDER grid.', severity: 'MEDIUM', sections: ALL, check: () => [] },
  { id: 17, band: 'table', title: 'Valign', statement: "ALL cells in ALL tables use VALIGN='MIDDLE'. NO exceptions.", severity: 'HIGH', sections: ALL, check: (c) => (c.valignMiddle ? [] : ['valign is not MIDDLE: rule 17 violated']) },
  { id: 18, band: 'table', title: 'Repeat rows', statement: 'Corporate tables use repeatRows=1 (header repeats on page break).', severity: 'LOW', sections: ALL, check: () => [] },
  { id: 19, band: 'layout', title: 'Page size', statement: 'Page size: US Letter (8.5" x 11").', severity: 'CRITICAL', sections: ALL, check: (c) => (c.pageSize === 'letter' ? [] : [`page size is ${c.pageSize}, expected letter`]) },
  { id: 20, band: 'layout', title: 'Margins', statement: 'Margins: 0.50" all sides — TOP, BOTTOM, LEFT, RIGHT. LOCKED.', severity: 'CRITICAL', sections: ALL, check: (c) => (c.marginsIn === 0.5 ? [] : [`margins are ${c.marginsIn}, expected 0.5`]) },
  { id: 21, band: 'layout', title: 'Section numbering bands', statement: 'DXY sections 1-8, EUR/USD sections 9-13, GBP/USD sections 14-18, AUD/USD sections 19-23, Cross-Pair sections 24-25. Section numbers are CONTIGUOUS.', severity: 'CRITICAL', sections: ALL, check: orderOk },
  { id: 22, band: 'layout', title: 'Cover page', statement: 'Cover page: title, subtitle, spot prices, engine summary table, then PageBreak(). Cover is NOT numbered.', severity: 'HIGH', sections: [1], check: (c) => (c.sectionIds.includes(1) ? [] : ['cover-to-section-1 transition broken: section 1 absent']) },
  { id: 23, band: 'layout', title: 'Pair pages', statement: 'Each pair starts with PageBreak() + 0.3*inch spacer + pair title (36pt, pair accent color, centered).', severity: 'HIGH', sections: [9, 14, 19], check: (c) => (c.pageBreakBeforePairs ? [] : ['pair pages missing hard PageBreak']) },
  { id: 24, band: 'layout', title: 'Document metadata', statement: 'Document metadata: title and author set in the document constructor.', severity: 'LOW', sections: ALL, check: () => [] },
  { id: 25, band: 'style', title: 'Cover title', statement: 'Cover title: 28pt, Helvetica-Bold, C_NAVY, TA_CENTER, spaceAfter=12.', severity: 'MEDIUM', sections: [1], check: () => [] },
  { id: 26, band: 'style', title: 'Cover subtitle', statement: 'Cover subtitle: 14pt, Helvetica, #4a4a6a, TA_CENTER, spaceAfter=6.', severity: 'LOW', sections: [1], check: () => [] },
  { id: 27, band: 'style', title: 'Section heading', statement: 'Section heading: 15pt, Helvetica-Bold, pair-appropriate color, spaceBefore=6, spaceAfter=4.', severity: 'HIGH', sections: ALL, check: () => [] },
  { id: 28, band: 'style', title: 'Sub heading', statement: 'Sub heading: 11pt, Helvetica-Bold, C_DARK, spaceBefore=6, spaceAfter=3.', severity: 'LOW', sections: ALL, check: () => [] },
  { id: 29, band: 'style', title: 'Sub2 heading', statement: 'Sub2 heading: 9.5pt, Helvetica-Bold, C_ACCENT, spaceBefore=4, spaceAfter=2.', severity: 'LOW', sections: ALL, check: () => [] },
  { id: 30, band: 'style', title: 'Body text', statement: 'Body text: 9pt, Helvetica, #1e293b, spaceBefore=1, spaceAfter=1.', severity: 'MEDIUM', sections: ALL, check: () => [] },
  { id: 31, band: 'style', title: 'Body bold', statement: 'Body bold: 9pt, Helvetica-Bold, C_NAVY, spaceBefore=1, spaceAfter=1.', severity: 'LOW', sections: ALL, check: () => [] },
  { id: 32, band: 'whitespace', title: 'PageBreak usage', statement: 'PageBreak() ONLY before cover-to-section1 transition AND before each new pair section. NOWHERE ELSE. Between regular sections use CondPageBreak(140).', severity: 'CRITICAL', sections: ALL, check: (c) => {
    const bad = c.pairBreakSections.filter((s) => s !== 9 && s !== 14 && s !== 19);
    return bad.length === 0 ? [] : [`PageBreak outside pair sections: ${bad.join(',')}`];
  } },
  { id: 33, band: 'whitespace', title: 'CondPageBreak threshold', statement: 'CondPageBreak(140) between ALL independent sections. This value is LOCKED. Do NOT use 60, 80, 100, 200, or any other value.', severity: 'CRITICAL', sections: ids(2, 25), check: (c) => (c.condPageBreakPt === COND_PAGE_BREAK_PT ? [] : [`CondPageBreak is ${c.condPageBreakPt}, expected ${COND_PAGE_BREAK_PT}`]) },
  { id: 34, band: 'whitespace', title: 'KeepTogether mandate', statement: 'KeepTogether() on EVERY section heading + its primary content. NO standalone tables ever.', severity: 'CRITICAL', sections: ALL, check: (c) => {
    const missing = c.sectionIds.filter((s) => !c.keepTogetherSections.includes(s));
    return missing.length === 0 ? [] : [`sections missing KeepTogether: ${missing.join(',')}`];
  } },
  { id: 35, band: 'whitespace', title: 'Spacer values', statement: 'Spacer values: spacer(2) between zone details, spacer(3) between section blocks, spacer(8) between cover tables on pair pages. NO other values without explicit override.', severity: 'MEDIUM', sections: [3, 9, 14, 19], check: () => [] },
  { id: 36, band: 'whitespace', title: 'Margins locked', statement: 'Margins: 0.50" — LOCKED. All four sides. Do NOT change.', severity: 'CRITICAL', sections: ALL, check: (c) => (c.marginsIn === 0.5 ? [] : [`margins are ${c.marginsIn}, expected 0.5`]) },
  { id: 37, band: 'whitespace', title: 'Cover compression', statement: 'Cover + Section 1 flow with PageBreak() between them. Cover does NOT get its own forced blank page.', severity: 'MEDIUM', sections: [1], check: () => [] },
  { id: 38, band: 'whitespace', title: 'Cell padding locked', statement: 'Cell padding: TOPPADDING=3, BOTTOMPADDING=3 — LOCKED. Do NOT change.', severity: 'HIGH', sections: ALL, check: (c) => (c.cellPadding.top === 3 && c.cellPadding.bottom === 3 ? [] : ['cell vertical padding drift: rule 38 violated']) },
  { id: 39, band: 'bulletproof', title: 'KeepTogether on every section', statement: 'Every section heading + hr + primary content MUST be wrapped in KeepTogether(). NO EXCEPTIONS.', severity: 'CRITICAL', sections: ALL, check: (c) => {
    const missing = c.sectionIds.filter((s) => !c.keepTogetherSections.includes(s));
    return missing.length === 0 ? [] : [`sections missing KeepTogether: ${missing.join(',')}`];
  } },
  { id: 40, band: 'bulletproof', title: 'KeepTogether on every zone detail', statement: 'Each zone detail block (zone heading + kv_table) MUST be KeepTogether().', severity: 'HIGH', sections: [3, 9, 14, 19], check: () => [] },
  { id: 41, band: 'bulletproof', title: 'KeepTogether on every step block', statement: 'Each Step in the Macro Shape Chain (heading + table/kv) MUST be KeepTogether().', severity: 'HIGH', sections: [7], check: (c) => (c.keepTogetherSections.includes(7) ? [] : ['section 7 step blocks not kept together']) },
  { id: 42, band: 'bulletproof', title: 'KeepTogether on every day table', statement: 'Each day-by-day option expiry table MUST be KeepTogether with its day heading.', severity: 'HIGH', sections: [1], check: (c) => (c.keepTogetherSections.includes(1) ? [] : ['section 1 day tables not kept together']) },
  { id: 43, band: 'bulletproof', title: 'PageBreak before each pair', statement: 'EUR/USD, GBP/USD, AUD/USD MUST each start on a fresh page with PageBreak(). NON-NEGOTIABLE.', severity: 'CRITICAL', sections: [9, 14, 19], check: (c) => {
    const missing = [9, 14, 19].filter((s) => !c.pairBreakSections.includes(s));
    return missing.length === 0 ? [] : [`pair sections missing PageBreak: ${missing.join(',')}`];
  } },
  { id: 44, band: 'bulletproof', title: 'CondPageBreak(140) between sections', statement: 'The ONLY acceptable value for CondPageBreak between independent sections is 140.', severity: 'CRITICAL', sections: ids(2, 25), check: (c) => (c.condPageBreakPt === COND_PAGE_BREAK_PT ? [] : [`CondPageBreak is ${c.condPageBreakPt}, expected ${COND_PAGE_BREAK_PT}`]) },
  { id: 45, band: 'bulletproof', title: 'No standalone tables', statement: 'A table must NEVER be appended directly to the story without being wrapped in a KeepTogether with its heading.', severity: 'CRITICAL', sections: ALL, check: (c) => {
    const missing = c.sectionIds.filter((s) => !c.keepTogetherSections.includes(s));
    return missing.length === 0 ? [] : [`standalone tables in sections: ${missing.join(',')}`];
  } },
  { id: 46, band: 'bulletproof', title: 'Spacer(8) between pair cover tables', statement: 'The two cover summary tables on pair pages must have spacer(8) between them, NOT spacer(2).', severity: 'MEDIUM', sections: [9, 14, 19], check: () => [] },
  { id: 47, band: 'bulletproof', title: 'Pair-specific accent colors', statement: 'EUR/USD uses #1e40af, GBP/USD uses #7e22ce, AUD/USD uses #b45309. Section headers and zone headers use pair-specific styles.', severity: 'HIGH', sections: [...EU, ...GU, ...AU], check: () => [] },
  { id: 48, band: 'bulletproof', title: 'Pair title format', statement: "Each pair title is a 36pt bold heading in the pair's accent color, centered, with Spacer(1, 0.3*inch) before it.", severity: 'HIGH', sections: [9, 14, 19], check: () => [] },
  { id: 49, band: 'bulletproof', title: 'Section numbering contiguity', statement: 'DXY sections 1-8, EUR/USD sections 9-13, GBP/USD sections 14-18, AUD/USD sections 19-23, Cross-Pair sections 24-25. Contiguous.', severity: 'CRITICAL', sections: ALL, check: orderOk },
  { id: 50, band: 'bulletproof', title: 'Cross-pair matrix format', statement: 'Section 25 uses a corporate table with columns: DXY Zone, DXY Range, Pressure, EU Zone, EU Range, GU Zone, GU Range, AU Zone, AU Range. KeepTogether heading + table.', severity: 'HIGH', sections: [25], check: (c) => (c.keepTogetherSections.includes(25) ? [] : ['section 25 matrix not kept together']) },
  { id: 51, band: 'bulletproof', title: 'Reduced spaceBefore/spaceAfter', statement: 'All section styles use spaceBefore=6 (not 14), spaceAfter=4 (not 6). Sub styles use spaceBefore=6 (not 10).', severity: 'MEDIUM', sections: ALL, check: () => [] },
  { id: 52, band: 'bulletproof', title: 'HR spacing', statement: 'HRFlowable uses spaceAfter=2, spaceBefore=2 (not 4/4).', severity: 'LOW', sections: ALL, check: () => [] },
];

export function ruleById(id: number): RuleRow {
  const found = REPORT_RULES.find((r) => r.id === id);
  if (found === undefined) throw new Error(`[REPORT-RULES] unknown rule id refused: ${id}`);
  return found;
}

export interface RuleEvaluation {
  ruleId: number;
  passed: boolean;
  messages: string[];
}

export function evaluateRules(ctx: RuleContext): RuleEvaluation[] {
  return REPORT_RULES.map((rule) => {
    let messages: string[];
    try {
      messages = rule.check(ctx);
    } catch (err) {
      messages = [`predicate threw (treated as violation): ${err instanceof Error ? err.message : String(err)}`];
    }
    return { ruleId: rule.id, passed: messages.length === 0, messages };
  });
}

export function countRuleViolations(ctx: RuleContext): number {
  return evaluateRules(ctx).filter((e) => !e.passed).length;
}

export { DXY, EU, GU, AU, CROSS };

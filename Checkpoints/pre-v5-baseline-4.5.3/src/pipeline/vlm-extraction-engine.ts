/**
 * VlmExtractionEngine — 3-pass option data extraction with reconciliation.
 *
 * TTE v5.3.3 Protocol A mandates a 3-pass extraction for OTC FX option
 * data embedded in images. The three passes are:
 *
 *   PASS 1 (Full Extraction): VLM extracts ALL strikes + notionals in one shot.
 *   PASS 2 (Targeted Verification): VLM is asked to re-read specific rows
 *           (one strike at a time) to verify each value independently.
 *   PASS 3 (Cross-Check): VLM is asked to identify the MAXIMUM notional
 *           strike and the TOTAL notional sum — structural checks that
 *           must be consistent with Pass 1+2.
 *
 * Reconciliation applies the 2/3 agreement rule: a value is ACCEPTED
 * only if at least 2 of the 3 passes agree (within tolerance).
 * Disputed values are marked [UNCLEAR] and excluded from scoring.
 *
 * FIX-001 / GAP-001 — CRITICAL.
 */

import type { OptionStrike } from '../clients/investinglive-client.js';
import { Logger } from '../utils/logger.js';
import {
  VLM_NOTIONAL_TOLERANCE_PCT,
  VLM_STRIKE_TOLERANCE,
  VLM_AGREEMENT_ACCEPT_THRESHOLD,
  VLM_AGREEMENT_DISPUTE_THRESHOLD,
  VLM_MAX_EXTRACTION_PASSES,
  VLM_STRIKE_KEY_PRECISION,
} from '../constants/trading-constants.js';

const log = new Logger('VlmExtractionEngine');

// ── Types ──

export interface VlmExtractionPass {
  passNumber: 1 | 2 | 3;
  passType: 'full' | 'targeted' | 'crosscheck';
  prompt: string;
  result: ExtractedStrike[] | CrossCheckResult;
  rawResponse: string;
  durationMs: number;
}

export interface ExtractedStrike {
  pair: string;
  strike: number;
  notional: number;      // in billions USD
  expiry: string;        // ISO date
  confidence: number;    // 0.0–1.0, VLM self-reported
}

export interface CrossCheckResult {
  maxNotionalStrike: number;   // the strike with highest notional
  totalNotional: number;       // sum of all notionals
  strikeCount: number;
}

export interface ReconciledStrike {
  pair: string;
  strike: number;
  notional: number;
  expiry: string;
  agreement: number;           // 0, 1, 2, or 3 (how many passes agree)
  status: 'ACCEPTED' | 'DISPUTED' | 'REJECTED';
  disputeNote?: string;        // e.g. "[UNCLEAR] Pass 1=1.8B, Pass 2=1.2B"
}

export interface ReconciliationResult {
  accepted: ReconciledStrike[];   // agreement >= 2
  disputed: ReconciledStrike[];   // agreement = 1
  rejected: ReconciledStrike[];   // agreement = 0
  totalNotional: number;          // sum of accepted only
  maxPainPrice: number;           // computed from accepted
  auditTrail: VlmExtractionPass[];
}

// ── Tolerance for agreement checking ──

// (Constants now sourced from trading-constants.ts)

// ── Prompt Templates ──

export const PASS1_PROMPT = `You are extracting OTC FX option expiry data from a
financial table image. Extract ALL option strikes visible in the image. For each
strike, provide: pair (EUR/USD, GBP/USD, AUD/USD), strike (numeric price level),
notional (in BILLIONS USD, e.g. 1.5 for $1.5B), expiry (YYYY-MM-DD). Return as a
JSON array. If a value is illegible, use null.`;

export const PASS2_PROMPT = (strike: number, pair: string): string =>
  `Look at the row for ${pair} strike ${strike}. Read ONLY the notional value for
this specific row. Return JSON: { "pair": "${pair}", "strike": ${strike},
"notional": <number_in_billions>, "legible": true|false }`;

export const PASS3_PROMPT = `From this option expiry table image, answer three
questions: (1) Which strike has the HIGHEST notional value? Return the strike
price. (2) What is the TOTAL sum of all notionals? Return in billions. (3) How
many total strikes are visible? Return JSON: { "maxNotionalStrike": <number>,
"totalNotional": <number_in_billions>, "strikeCount": <number> }`;

// ── Engine ──

export class VlmExtractionEngine {

  /**
   * Run the full 3-pass extraction pipeline.
   *
   * @param imageDataUrl - Base64-encoded image of the option expiry table
   * @param vlmAnalyzeFn - Injected VLM analyze function (visual-cortex proxy)
   * @returns Reconciliation result with accepted/disputed/rejected strikes
   */
  async extract(
    imageDataUrl: string,
    vlmAnalyzeFn: (image: string, prompt: string) => Promise<string>,
  ): Promise<ReconciliationResult> {

    const auditTrail: VlmExtractionPass[] = [];

    // ── PASS 1: Full Extraction ──
    log.info('VLM Pass 1/3: Full extraction');
    const pass1Start = Date.now();
    const pass1Raw = await vlmAnalyzeFn(imageDataUrl, PASS1_PROMPT);
    const pass1: ExtractedStrike[] = this.parseStrikeArray(pass1Raw);
    auditTrail.push({
      passNumber: 1, passType: 'full', prompt: PASS1_PROMPT,
      result: pass1, rawResponse: pass1Raw, durationMs: Date.now() - pass1Start,
    });
    log.info(`Pass 1: extracted ${pass1.length} strikes`);

    if (pass1.length === 0) {
      log.warn('Pass 1 returned zero strikes — aborting 3-pass pipeline');
      return {
        accepted: [], disputed: [], rejected: [],
        totalNotional: 0, maxPainPrice: 0, auditTrail,
      };
    }

    // ── PASS 2: Targeted Verification ──
    log.info('VLM Pass 2/3: Targeted verification');
    const pass2Start = Date.now();
    const pass2Results: ExtractedStrike[] = [];
    for (const s of pass1) {
      const p2Raw = await vlmAnalyzeFn(imageDataUrl, PASS2_PROMPT(s.strike, s.pair));
      const p2Parsed = this.parseSingleStrike(p2Raw);
      if (p2Parsed) pass2Results.push(p2Parsed);
    }
    auditTrail.push({
      passNumber: 2, passType: 'targeted', prompt: '(per-strike)',
      result: pass2Results, rawResponse: '(concatenated)',
      durationMs: Date.now() - pass2Start,
    });
    log.info(`Pass 2: verified ${pass2Results.length} strikes`);

    // ── PASS 3: Cross-Check ──
    log.info('VLM Pass 3/3: Cross-check');
    const pass3Start = Date.now();
    const pass3Raw = await vlmAnalyzeFn(imageDataUrl, PASS3_PROMPT);
    const pass3: CrossCheckResult = this.parseCrossCheck(pass3Raw);
    auditTrail.push({
      passNumber: 3, passType: 'crosscheck', prompt: PASS3_PROMPT,
      result: pass3, rawResponse: pass3Raw, durationMs: Date.now() - pass3Start,
    });
    log.info(`Pass 3: maxNotional=${pass3.maxNotionalStrike}, total=$${pass3.totalNotional}B`);

    // ── Reconciliation: 2/3 agreement rule ──
    const reconciled = this.reconcile(pass1, pass2Results, pass3);
    reconciled.auditTrail = auditTrail;
    return reconciled;
  }

  /**
   * Apply the 2/3 agreement rule across all three passes.
   * For each unique (pair, strike) key: count agreements; ACCEPT if >=2 agree.
   */
  private reconcile(
    pass1: ExtractedStrike[],
    pass2: ExtractedStrike[],
    pass3: CrossCheckResult,
  ): ReconciliationResult {

    const keyMap = new Map<string, ExtractedStrike[]>();

    for (const s of pass1) {
      const key = this.strikeKey(s.pair, s.strike);
      if (!keyMap.has(key)) keyMap.set(key, []);
      keyMap.get(key)!.push(s);
    }
    for (const s of pass2) {
      const key = this.strikeKey(s.pair, s.strike);
      if (!keyMap.has(key)) keyMap.set(key, []);
      keyMap.get(key)!.push(s);
    }

    const accepted: ReconciledStrike[] = [];
    const disputed: ReconciledStrike[] = [];
    const rejected: ReconciledStrike[] = [];

    for (const [key, entries] of keyMap) {
      const pass3Consistent = this.checkPass3Consistency(entries, pass3);
      const agreement = this.countAgreement(entries, pass3Consistent);

      const [pair] = key.split('@');
      const representative = entries[0];
      const reconciled: ReconciledStrike = {
        pair,
        strike: representative.strike,
        notional: representative.notional,
        expiry: representative.expiry,
        agreement,
        status: agreement >= VLM_AGREEMENT_ACCEPT_THRESHOLD ? 'ACCEPTED' : agreement === VLM_AGREEMENT_DISPUTE_THRESHOLD ? 'DISPUTED' : 'REJECTED',
      };

      if (agreement < VLM_AGREEMENT_ACCEPT_THRESHOLD) {
        reconciled.disputeNote = `[UNCLEAR] ${entries.length} readings, agreement=${agreement}/${VLM_MAX_EXTRACTION_PASSES}`;
      }

      if (agreement >= VLM_AGREEMENT_ACCEPT_THRESHOLD) accepted.push(reconciled);
      else if (agreement === VLM_AGREEMENT_DISPUTE_THRESHOLD) disputed.push(reconciled);
      else rejected.push(reconciled);
    }

    const totalNotional = accepted.reduce((sum: number, s: ReconciledStrike) => sum + s.notional, 0);
    const maxPainPrice = this.computeMaxPain(accepted);

    log.info(`Reconciliation: ${accepted.length} accepted, ${disputed.length} disputed, ${rejected.length} rejected`);

    return { accepted, disputed, rejected, totalNotional, maxPainPrice, auditTrail: [] };
  }

  /** Normalize a (pair, strike) into a tolerance-keyed string. */
  private strikeKey(pair: string, strike: number): string {
    const rounded = Math.round(strike / VLM_STRIKE_TOLERANCE) * VLM_STRIKE_TOLERANCE;
    return `${pair}@${rounded.toFixed(VLM_STRIKE_KEY_PRECISION)}`;
  }

  /** Count how many of the readings agree on notional value. */
  private countAgreement(entries: ExtractedStrike[], pass3Ok: boolean): number {
    if (entries.length === 0) return 0;
    const notionals = entries.map((e: ExtractedStrike) => e.notional);
    let bestAgreement = 1;
    for (let i = 0; i < notionals.length; i++) {
      let count = 1;
      for (let j = i + 1; j < notionals.length; j++) {
        if (this.notionalsAgree(notionals[i], notionals[j])) count++;
      }
      bestAgreement = Math.max(bestAgreement, count);
    }
    if (pass3Ok) bestAgreement++;
    return Math.min(bestAgreement, VLM_MAX_EXTRACTION_PASSES);
  }

  /** Check if two notional values agree within tolerance. */
  private notionalsAgree(a: number, b: number): boolean {
    if (a === 0 && b === 0) return true;
    const larger = Math.max(Math.abs(a), Math.abs(b));
    return Math.abs(a - b) <= larger * VLM_NOTIONAL_TOLERANCE_PCT;
  }

  /** Check consistency against Pass 3 cross-check. */
  private checkPass3Consistency(entries: ExtractedStrike[], pass3: CrossCheckResult): boolean {
    if (entries.length === 0) return false;
    const maxEntry = entries.reduce((max: ExtractedStrike, e: ExtractedStrike) => e.notional > max.notional ? e : max, entries[0]);
    const isMax = Math.abs(maxEntry.strike - pass3.maxNotionalStrike) < VLM_STRIKE_TOLERANCE;
    return isMax;
  }

  /** Compute max pain: strike with highest cumulative notional. */
  private computeMaxPain(strikes: ReconciledStrike[]): number {
    if (strikes.length === 0) return 0;
    const sorted = [...strikes].sort((a: ReconciledStrike, b: ReconciledStrike) => b.notional - a.notional);
    return sorted[0].strike;
  }

  // ── JSON parsers with defensive error handling ──

  private parseStrikeArray(raw: string): ExtractedStrike[] {
    try {
      const json = this.extractJson(raw);
      const arr = JSON.parse(json) as unknown;
      if (!Array.isArray(arr)) return [];
      return arr.filter((s: unknown) => this.isValidStrike(s));
    } catch (e) {
      log.error(`Pass 1 parse failed: ${e instanceof Error ? e.message : String(e)}`);
      return [];
    }
  }

  private parseSingleStrike(raw: string): ExtractedStrike | null {
    try {
      const json = this.extractJson(raw);
      const obj = JSON.parse(json) as unknown;
      if (!this.isValidStrike(obj)) return null;
      return obj as ExtractedStrike;
    } catch (e) {
      log.error(`Pass 2 parse failed: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }

  private parseCrossCheck(raw: string): CrossCheckResult {
    try {
      const json = this.extractJson(raw);
      const obj = JSON.parse(json) as Record<string, unknown>;
      return {
        maxNotionalStrike: Number(obj.maxNotionalStrike) || 0,
        totalNotional: Number(obj.totalNotional) || 0,
        strikeCount: Number(obj.strikeCount) || 0,
      };
    } catch (e) {
      log.error(`Pass 3 parse failed: ${e instanceof Error ? e.message : String(e)}`);
      return { maxNotionalStrike: 0, totalNotional: 0, strikeCount: 0 };
    }
  }

  /** Extract the first JSON object/array from a text response. */
  private extractJson(raw: string): string {
    const openChar = raw.includes('[') ? '[' : '{';
    const start = raw.indexOf(openChar);
    if (start === -1) throw new Error('No JSON found in response');
    const closeChar = openChar === '[' ? ']' : '}';
    let depth = 0;
    for (let i = start; i < raw.length; i++) {
      if (raw[i] === openChar) depth++;
      if (raw[i] === closeChar) { depth--; if (depth === 0) return raw.slice(start, i + 1); }
    }
    return raw.slice(start);
  }

  private isValidStrike(obj: unknown): obj is ExtractedStrike {
    if (typeof obj !== 'object' || obj === null) return false;
    const o = obj as Record<string, unknown>;
    return typeof o.pair === 'string' &&
           typeof o.strike === 'number' &&
           typeof o.notional === 'number' &&
           typeof o.expiry === 'string';
  }

  /**
   * Convert a ReconciliationResult into OptionStrike[] for downstream consumption.
   * Only ACCEPTED strikes (agreement >= 2) are returned.
   */
  toOptionStrikes(result: ReconciliationResult): OptionStrike[] {
    return result.accepted.map((s: ReconciledStrike) => ({
      pair: s.pair,
      strike: s.strike,
      notional: s.notional,
      expiry: s.expiry,
      type: 'unknown' as const,
    }));
  }
}

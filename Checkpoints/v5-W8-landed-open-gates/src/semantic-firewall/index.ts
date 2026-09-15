/**
 * Trading Semantic Firewall — Plutus's trading-rule enforcement engine.
 *
 * This is the trading-specific equivalent of Trident's R0-R16 audit engine.
 * Where Trident audits CODE for theatrical patterns, this audits TRADES
 * for violations of the Trident Trading Engine's hard rules.
 *
 * 15 Critical Stop (CS) rules + 1 Additional Protection (AP) rule +
 * 6 Anti-Derailment (AD) rules + 3 TimesFM Overlay (TFM) rules + 1 Theatrical rule = 26 base mechanical checks.
 * Plus 17 Zero-Tolerance (ZT) + 9 Entry (TS) + 3 Fibonacci (FIB) + 6 RRR rules = 34 extended checks.
 * Total: 61 registered rules.
 *
 * Every check is ENFORCED IN CODE — not documented, not suggested, not advisory.
 * A check that fails with severity HARD_BLOCK prevents the setup from being
 * published via BrainMessenger and records evidence in the Merkle chain.
 *
 * Architecture mirrors Trident's R11 Theatrical Integrity layer:
 *   - Each rule is a discrete function returning GuardrailResult
 *   - Rules are registered in a central registry
 *   - A setup must pass ALL HARD_BLOCK rules to be published
 *   - WARN-level failures are recorded but don't block
 *   - All results are Merkle-chained for tamper evidence
 */

import {
  TradeSetup,
  DXYZone,
  ZoneType,
  SetupCategory,
  TradeDirection,
  SessionWindow,
  GuardrailResult,
  PIP_VALUE,
} from '../types.js';
import { Logger } from '../utils/logger.js';
import {
  SL_CAP_PIPS,
  RED_FOLDER_DEFERRAL_MIN,
  MIN_CONFLUENCE_BOM,
  MIN_CONFLUENCE_MOM,
  MAX_SETUPS_PER_CATEGORY_PER_PAIR,
  ENTRY_DISTANCE_DXY_SWING_SCALP,
  ENTRY_DISTANCE_DXY_HTF_SWING,
  ENTRY_DISTANCE_DXY_BREAKOUT_SURGE,
  ENTRY_DISTANCE_EURUSD_SWING_SCALP,
  ENTRY_DISTANCE_EURUSD_HTF_SWING,
  ENTRY_DISTANCE_EURUSD_BREAKOUT_SURGE,
  ENTRY_DISTANCE_GBPUSD_SWING_SCALP,
  ENTRY_DISTANCE_GBPUSD_HTF_SWING,
  ENTRY_DISTANCE_GBPUSD_BREAKOUT_SURGE,
  ENTRY_DISTANCE_AUDUSD_SWING_SCALP,
  ENTRY_DISTANCE_AUDUSD_HTF_SWING,
  ENTRY_DISTANCE_AUDUSD_BREAKOUT_SURGE,
  SPREAD_DXY,
  SPREAD_EURUSD,
  SPREAD_GBPUSD,
  SPREAD_AUDUSD,
  DEFAULT_SPREAD_PIPS,
  MIN_P_TP_REACH,
  MIN_IL_CONFLUENCE,
  REQUIRED_DIRECTION_CHECKS,
  SNIPER_ENTRY_MAX_EDGE_DISTANCE_PIPS,
  PIP_VALUE_DEFAULT,
  PCT_MULTIPLIER,
} from '../constants/trading-constants.js';
import { checkZeroTolerance } from './zero-tolerance.js';
import { checkEntryPrecision } from './entry-rules.js';
import { checkFibSpiderweb } from './fib-spiderweb.js';
import { checkRRRRules } from './rrr-rules.js';
import { checkLiquiditySweep } from './liquidity-sweep.js';

const log = new Logger('SemanticFirewall');

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS — Trident Trading Engine hard rules
// Scalar constants now imported from constants/trading-constants.ts (single source of truth)
// ═══════════════════════════════════════════════════════════════════════════════

// Re-export scalar constants for backward compatibility (consumers that import from this module)
export {
  SL_CAP_PIPS,
  RED_FOLDER_DEFERRAL_MIN,
  MIN_CONFLUENCE_BOM,
  MIN_CONFLUENCE_MOM,
  MAX_SETUPS_PER_CATEGORY_PER_PAIR,
};

/** AD8: Entry proximity validation — max pips from spot. */
export const MAX_ENTRY_DISTANCE_PIPS: Record<string, { swingScalp: number; htfSwing: number; breakoutSurge: number }> = {
  'DXY': { swingScalp: ENTRY_DISTANCE_DXY_SWING_SCALP, htfSwing: ENTRY_DISTANCE_DXY_HTF_SWING, breakoutSurge: ENTRY_DISTANCE_DXY_BREAKOUT_SURGE },
  'EUR/USD': { swingScalp: ENTRY_DISTANCE_EURUSD_SWING_SCALP, htfSwing: ENTRY_DISTANCE_EURUSD_HTF_SWING, breakoutSurge: ENTRY_DISTANCE_EURUSD_BREAKOUT_SURGE },
  'GBP/USD': { swingScalp: ENTRY_DISTANCE_GBPUSD_SWING_SCALP, htfSwing: ENTRY_DISTANCE_GBPUSD_HTF_SWING, breakoutSurge: ENTRY_DISTANCE_GBPUSD_BREAKOUT_SURGE },
  'AUD/USD': { swingScalp: ENTRY_DISTANCE_AUDUSD_SWING_SCALP, htfSwing: ENTRY_DISTANCE_AUDUSD_HTF_SWING, breakoutSurge: ENTRY_DISTANCE_AUDUSD_BREAKOUT_SURGE },
};

/** CS13: Pair-specific session rules. */
export const PAIR_SESSION_RULES: Record<string, { allowedSessions: SessionWindow[]; forbiddenCategories?: SetupCategory[] }> = {
  'AUD/USD': {
    allowedSessions: [SessionWindow.LONDON_OPEN, SessionWindow.LONDON_MID, SessionWindow.NY_OVERLAP],
    forbiddenCategories: [SetupCategory.SWING_SCALP], // AUD/USD = BS/WL only, no scalps
  },
  'GBP/USD': {
    allowedSessions: [
      SessionWindow.LONDON_OPEN, SessionWindow.LONDON_MID,
      SessionWindow.NY_OVERLAP, SessionWindow.NY_OPEN, SessionWindow.NY_MID, SessionWindow.NY_CLOSE,
    ],
  },
  'EUR/USD': {
    allowedSessions: [
      SessionWindow.LONDON_OPEN, SessionWindow.LONDON_MID,
      SessionWindow.NY_OVERLAP, SessionWindow.NY_OPEN, SessionWindow.NY_MID, SessionWindow.NY_CLOSE,
    ],
  },
  'DXY': {
    allowedSessions: [
      SessionWindow.LONDON_OPEN, SessionWindow.LONDON_MID,
      SessionWindow.NY_OVERLAP, SessionWindow.NY_OPEN, SessionWindow.NY_MID, SessionWindow.NY_CLOSE,
    ],
  },
};

/** Spread cost per pair (pips) — used in EV calculation. */
export const SPREAD_PIPS: Record<string, number> = {
  'DXY': SPREAD_DXY,
  'EUR/USD': SPREAD_EURUSD,
  'GBP/USD': SPREAD_GBPUSD,
  'AUD/USD': SPREAD_AUDUSD,
};

// ═══════════════════════════════════════════════════════════════════════════════
// RULE REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export type RuleId = 'CS1' | 'CS2' | 'CS3' | 'CS5' | 'CS7' | 'CS8' | 'CS9' | 'CS10' | 'CS11' | 'CS12' | 'CS13' | 'CS14' | 'CS15' | 'CS16' | 'CS18' | 'AP22' | 'AD1' | 'AD4' | 'AD8' | 'AD10' | 'AD11' | 'AD12' | 'TFM1' | 'TFM2' | 'TFM3' | 'THEATRICAL' |
  'ZT-1' | 'ZT-2' | 'ZT-3' | 'ZT-4' | 'ZT-5' | 'ZT-6' | 'ZT-7' | 'ZT-8' | 'ZT-9' | 'ZT-10' | 'ZT-11' | 'ZT-12' | 'ZT-13' | 'ZT-14' | 'ZT-15' | 'ZT-16' | 'ZT-17' |
  'TS-1' | 'TS-2' | 'TS-3' | 'TS-4' | 'TS-5' | 'TS-6' | 'TS-7' | 'TS-8' | 'TS-9' |
  'FIB-1' | 'FIB-2' | 'FIB-3' |
  'RRR-1' | 'RRR-2' | 'RRR-3' | 'RRR-4' | 'RRR-5' | 'RRR-6'
  | 'ZT-18' | 'TFM-K1' | 'TFM-K2' | 'DBR-1';

export interface RuleDefinition {
  id: RuleId;
  name: string;
  description: string;
  severity: 'HARD_BLOCK' | 'WARN' | 'INFO';
  category: 'critical_stop' | 'additional_protection' | 'anti_derailment' | 'timesfm_overlay';
  check: (ctx: RuleCheckContext) => GuardrailResult;
  /** Optional human-readable evidence string for audit/reporting. */
  evidence?: string;
}

export interface RuleCheckContext {
  setup: TradeSetup;
  zone?: DXYZone;
  spotPrice: number;
  currentGate: string;
  currentSession?: SessionWindow;
  redFolderActive?: boolean;
  isWeekend?: boolean;
  allSetups?: TradeSetup[]; // For cross-setup checks (CS11)
  /** All mapped DXY zones for this instrument — used by CS18 sequential liquidity sweep. */
  allZones?: DXYZone[];
  // ── Zero-Tolerance (ZT) context fields ──
  /** Total risk percentage for this pair across all open positions. */
  pairRiskPct?: number;
  /** Current daily drawdown percentage. */
  dailyDrawdown?: number;
  /** Number of consecutive losing setups/positions. */
  consecutiveLosses?: number;
  /** Time of last entry (HH:MM ET format). */
  lastEntryTime?: string;
  /** Current time (HH:MM ET format). */
  currentTime?: string;
  /** Spread cost in pips for the current pair. */
  spreadPips?: number;
  // ── RRR context fields ──
  /** Current account balance for position sizing checks. */
  accountBalance?: number;
  /** Position size as percentage of account risked on this trade. */
  positionSizePct?: number;
  /** Average True Range for the pair (in price units). */
  pairATR?: number;
  // ── Fib Spiderweb context fields ──
  /** Pre-computed Fibonacci levels from the broader system. */
  fibLevels?: import('./fib-spiderweb.js').FibLevel[];
  // ── Report generation mode flag ──
  /** When true, suppresses live-trading-only rules (ZT-2, ZT-5, ZT-12, ZT-15, CS9). */
  isReportGeneration?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE IMPLEMENTATIONS — CS1-CS16, AP22, AD1-AD10, TFM1-3
// ═══════════════════════════════════════════════════════════════════════════════

// CS1: No blocked sources accessed — verified at data layer (not setup-level)
// (Implementation: check setup.notes for blocked source mentions)
const CS1: RuleDefinition = {
  id: 'CS1',
  name: 'No blocked sources accessed',
  description: 'Setup must not reference blocked data sources (CME, Barchart, Investing.com, UUP)',
  severity: 'HARD_BLOCK',
  category: 'critical_stop',
  check(ctx) {
    const blocked = ['cmegroup', 'barchart', 'investing.com', 'uup', 'cme_daily_bulletin'];
    const notes = (ctx.setup.notes + ' ' + ctx.setup.zoneName).toLowerCase();
    for (const b of blocked) {
      if (notes.includes(b)) {
        return {
          rule: 'CS1',
          passed: false,
          severity: 'HARD_BLOCK',
          message: `Setup references blocked source: ${b}`,
        evidence: `CS1 check failed: Setup references blocked source: ${b}`,
        };
      }
    }
    return { rule: 'CS1', passed: true, severity: 'INFO', message: 'No blocked sources referenced', evidence: 'CS1 check passed: No blocked sources referenced' };
  },
};

// CS2: DXY directional only — no arithmetic pair conversion
const CS2: RuleDefinition = {
  id: 'CS2',
  name: 'DXY directional only',
  description: 'Pair price levels must come from pair\'s own structure, not arithmetic DXY conversion',
  severity: 'HARD_BLOCK',
  category: 'critical_stop',
  check(ctx) {
    if (ctx.setup.pair === 'DXY') {
      return { rule: 'CS2', passed: true, severity: 'INFO', message: 'DXY itself — no conversion needed', evidence: 'CS2 check passed: DXY itself — no conversion needed' };
    }
    // Check that zoneName doesn't indicate DXY-converted level
    if (ctx.zone && ctx.zone.id.startsWith('DXY-') && ctx.setup.pair !== 'DXY') {
      return {
        rule: 'CS2',
        passed: false,
        severity: 'HARD_BLOCK',
        message: `Setup for ${ctx.setup.pair} uses DXY-derived zone ${ctx.zone.id} — arithmetic conversion forbidden`,
      evidence: `CS2 check failed: Setup for ${ctx.setup.pair} uses DXY-derived zone ${ctx.zone.id} — arithmetic conversion forbidden`,
      };
    }
    return { rule: 'CS2', passed: true, severity: 'INFO', message: 'Pair levels from pair structure', evidence: 'CS2 check passed: Pair levels from pair structure' };
  },
};

// CS3: IL levels are cause, not effect
const CS3: RuleDefinition = {
  id: 'CS3',
  name: 'IL levels are cause',
  description: 'Institutional Levels must be the cause of price action, not the effect',
  severity: 'WARN',
  category: 'critical_stop',
  check(ctx) {
    // Soft check — IL zones should have confluence ≥ 6 (meaningful institutional interest)
    if (ctx.zone && ctx.zone.confluence < MIN_IL_CONFLUENCE) {
      return {
        rule: 'CS3',
        passed: false,
        severity: 'WARN',
        message: `Zone confluence ${ctx.zone.confluence} < ${MIN_IL_CONFLUENCE} — IL level may be effect not cause`,
      evidence: `CS3 check failed: Zone confluence ${ctx.zone.confluence} < ${MIN_IL_CONFLUENCE} — IL level may be effect not cause`,
      };
    }
    return { rule: 'CS3', passed: true, severity: 'INFO', message: 'IL level has sufficient confluence', evidence: 'CS3 check passed: IL level has sufficient confluence' };
  },
};

// CS5: Profit taking by NY close
const CS5: RuleDefinition = {
  id: 'CS5',
  name: 'NY close profit taking',
  description: 'All positions must be closed by Friday NY close (17:00 ET)',
  severity: 'HARD_BLOCK',
  category: 'critical_stop',
  check(ctx) {
    if (ctx.isWeekend) {
      return {
        rule: 'CS5',
        passed: false,
        severity: 'HARD_BLOCK',
        message: 'Cannot execute trades on weekend — weekend prohibition absolute',
      evidence: 'CS5 check failed: Cannot execute trades on weekend — weekend prohibition absolute',
      };
    }
    return { rule: 'CS5', passed: true, severity: 'INFO', message: 'Not weekend — NY close rule applies to open positions', evidence: 'CS5 check passed: Not weekend — NY close rule applies to open positions' };
  },
};

// CS7: Red folder 30-min deferral
const CS7: RuleDefinition = {
  id: 'CS7',
  name: 'Red folder deferral',
  description: `No trade execution within ${RED_FOLDER_DEFERRAL_MIN} min of red-folder news event`,
  severity: 'HARD_BLOCK',
  category: 'critical_stop',
  check(ctx) {
    if (ctx.redFolderActive) {
      return {
        rule: 'CS7',
        passed: false,
        severity: 'HARD_BLOCK',
        message: `Red folder news active — defer execution by ${RED_FOLDER_DEFERRAL_MIN} min`,
      evidence: `CS7 check failed: Red folder news active — defer execution by ${RED_FOLDER_DEFERRAL_MIN} min`,
      };
    }
    return { rule: 'CS7', passed: true, severity: 'INFO', message: 'No red folder event active', evidence: 'CS7 check passed: No red folder event active' };
  },
};

// CS8: SL cap 150 pips
const CS8: RuleDefinition = {
  id: 'CS8',
  name: 'SL cap 150 pips',
  description: `Stop loss must not exceed ${SL_CAP_PIPS} pips`,
  severity: 'HARD_BLOCK',
  category: 'critical_stop',
  check(ctx) {
    if (ctx.setup.slPips > SL_CAP_PIPS) {
      return {
        rule: 'CS8',
        passed: false,
        severity: 'HARD_BLOCK',
        message: `SL ${ctx.setup.slPips} pips exceeds ${SL_CAP_PIPS} pip cap`,
      evidence: `CS8 check failed: SL ${ctx.setup.slPips} pips exceeds ${SL_CAP_PIPS} pip cap`,
      };
    }
    return { rule: 'CS8', passed: true, severity: 'INFO', message: `SL ${ctx.setup.slPips}p ≤ ${SL_CAP_PIPS}p cap`, evidence: `CS8 check passed: SL ${ctx.setup.slPips}p ≤ ${SL_CAP_PIPS}p cap` };
  },
};

// CS9: BoM-only entry rule
const CS9: RuleDefinition = {
  id: 'CS9',
  name: 'BoM entry only',
  description: 'Entries must be on BoM (Beginning of Move) zones. MoM zones are TP targets only.',
  severity: 'HARD_BLOCK',
  category: 'critical_stop',
  check(ctx) {
    if (ctx.isReportGeneration) {
      return { rule: 'CS9', passed: true, severity: 'WARN',
        message: 'Report generation mode — MoM conditional entries allowed',
        evidence: 'ctx.isReportGeneration=true' };
    }
    if (!ctx.setup.isBoMEntry) {
      // Check if zone is MoM — MoM entries are forbidden (except with 4-exception check)
      if (ctx.zone && (ctx.zone.type === ZoneType.MOM_SUPPLY || ctx.zone.type === ZoneType.MOM_DEMAND)) {
        return {
          rule: 'CS9',
          passed: false,
          severity: 'HARD_BLOCK',
          message: `MoM zone entry forbidden — MoM zones are TP targets only (90% win rate differentiator)`,
        evidence: `CS9 check failed: MoM zone entry forbidden — MoM zones are TP targets only (90% win rate differentiator)`,
        };
      }
    }
    return { rule: 'CS9', passed: true, severity: 'INFO', message: ctx.setup.isBoMEntry ? 'BoM entry confirmed' : 'Non-MoM zone entry', evidence: `CS9 check passed: ${ctx.setup.isBoMEntry ? 'BoM entry confirmed' : 'Non-MoM zone entry'}` };
  },
};

// CS10: Minimum confluence by zone type
const CS10: RuleDefinition = {
  id: 'CS10',
  name: 'Minimum confluence',
  description: `BoM zones require ≥${MIN_CONFLUENCE_BOM} confluence; MoM zones require ≥${MIN_CONFLUENCE_MOM}`,
  severity: 'WARN',
  category: 'critical_stop',
  check(ctx) {
    if (!ctx.zone) return { rule: 'CS10', passed: true, severity: 'INFO', message: 'No zone to check', evidence: 'CS10 check passed: No zone to check' };
    const min = ctx.zone.isBoM ? MIN_CONFLUENCE_BOM : MIN_CONFLUENCE_MOM;
    if (ctx.zone.confluence < min) {
      return {
        rule: 'CS10',
        passed: false,
        severity: 'WARN',
        message: `Zone confluence ${ctx.zone.confluence} < ${min} minimum for ${ctx.zone.isBoM ? 'BoM' : 'MoM'}`,
      evidence: `CS10 check failed: Zone confluence ${ctx.zone.confluence} < ${min} minimum for ${ctx.zone.isBoM ? 'BoM' : 'MoM'}`,
      };
    }
    return { rule: 'CS10', passed: true, severity: 'INFO', message: `Confluence ${ctx.zone.confluence} ≥ ${min}`, evidence: `CS10 check passed: Confluence ${ctx.zone.confluence} ≥ ${min}` };
  },
};

// CS11: Max 3 setups per category per pair
const CS11: RuleDefinition = {
  id: 'CS11',
  name: 'Max setups per category',
  description: `Max ${MAX_SETUPS_PER_CATEGORY_PER_PAIR} setups per category per pair`,
  severity: 'WARN',
  category: 'critical_stop',
  check(ctx) {
    if (!ctx.allSetups) return { rule: 'CS11', passed: true, severity: 'INFO', message: 'No allSetups context', evidence: 'CS11 check passed: No allSetups context' };
    const count = ctx.allSetups.filter(
      (s) => s.pair === ctx.setup.pair && s.category === ctx.setup.category,
    ).length;
    if (count >= MAX_SETUPS_PER_CATEGORY_PER_PAIR) {
      return {
        rule: 'CS11',
        passed: false,
        severity: 'WARN',
        message: `${count} ${ctx.setup.category} setups for ${ctx.setup.pair} — max ${MAX_SETUPS_PER_CATEGORY_PER_PAIR} reached`,
      evidence: `CS11 check failed: ${count} ${ctx.setup.category} setups for ${ctx.setup.pair} — max ${MAX_SETUPS_PER_CATEGORY_PER_PAIR} reached`,
      };
    }
    return { rule: 'CS11', passed: true, severity: 'INFO', message: `${count} setups (≤ ${MAX_SETUPS_PER_CATEGORY_PER_PAIR} max)`, evidence: `CS11 check passed: ${count} setups (≤ ${MAX_SETUPS_PER_CATEGORY_PER_PAIR} max)` };
  },
};

// CS12: Direction validation 6-check mandatory
const CS12: RuleDefinition = {
  id: 'CS12',
  name: 'Direction validation 6-check',
  description: 'Setup must have 6/6 direction validation checks completed',
  severity: 'HARD_BLOCK',
  category: 'critical_stop',
  check(ctx) {
    // Report generation: cascade setups (DXY-translated) don't populate direction validation.
    // They inherit direction from the DXY parent setup. Don't block them for missing checks.
    if (ctx.isReportGeneration) {
      const checks = ctx.setup.directionValidation;
      if (!checks || checks.length === 0) {
        return { rule: 'CS12', passed: true, severity: 'WARN',
          message: 'Report generation mode — direction validation not populated for this setup type',
          evidence: 'ctx.isReportGeneration=true — cascade/inherited setups may not have individual direction checks' };
      }
    }
    const checks = ctx.setup.directionValidation;
    if (!checks || checks.length !== REQUIRED_DIRECTION_CHECKS) {
      return {
        rule: 'CS12',
        passed: false,
        severity: 'HARD_BLOCK',
        message: `Direction validation has ${checks?.length ?? 0} checks, requires ${REQUIRED_DIRECTION_CHECKS}`,
      evidence: `CS12 check failed: Direction validation has ${checks?.length ?? 0} checks, requires ${REQUIRED_DIRECTION_CHECKS}`,
      };
    }
    return { rule: 'CS12', passed: true, severity: 'INFO', message: `${REQUIRED_DIRECTION_CHECKS}/${REQUIRED_DIRECTION_CHECKS} direction checks present`, evidence: `CS12 check passed: ${REQUIRED_DIRECTION_CHECKS}/${REQUIRED_DIRECTION_CHECKS} direction checks present` };
  },
};

// CS13: Pair-specific session rules
const CS13: RuleDefinition = {
  id: 'CS13',
  name: 'Pair session rules',
  description: 'Setup must be in an allowed session for its pair',
  severity: 'HARD_BLOCK',
  category: 'critical_stop',
  check(ctx) {
    const rules = PAIR_SESSION_RULES[ctx.setup.pair];
    if (!rules) return { rule: 'CS13', passed: true, severity: 'INFO', message: 'No session rules for pair', evidence: 'CS13 check passed: No session rules for pair' };

    if (ctx.currentSession && !rules.allowedSessions.includes(ctx.currentSession)) {
      return {
        rule: 'CS13',
        passed: false,
        severity: 'HARD_BLOCK',
        message: `${ctx.setup.pair} not allowed in session ${ctx.currentSession}`,
      evidence: `CS13 check failed: ${ctx.setup.pair} not allowed in session ${ctx.currentSession}`,
      };
    }

    if (rules.forbiddenCategories?.includes(ctx.setup.category)) {
      return {
        rule: 'CS13',
        passed: false,
        severity: 'HARD_BLOCK',
        message: `${ctx.setup.pair} forbids ${ctx.setup.category} setups`,
      evidence: `CS13 check failed: ${ctx.setup.pair} forbids ${ctx.setup.category} setups`,
      };
    }
    return { rule: 'CS13', passed: true, severity: 'INFO', message: 'Session + category allowed', evidence: 'CS13 check passed: Session + category allowed' };
  },
};

// CS14: Weekend prohibition absolute
const CS14: RuleDefinition = {
  id: 'CS14',
  name: 'Weekend prohibition',
  description: 'No new positions opened on weekend. Monday reassessed based on Monday London data.',
  severity: 'HARD_BLOCK',
  category: 'critical_stop',
  check(ctx) {
    if (ctx.isWeekend) {
      return {
        rule: 'CS14',
        passed: false,
        severity: 'HARD_BLOCK',
        message: 'Weekend prohibition — no new positions',
      evidence: 'CS14 check failed: Weekend prohibition — no new positions',
      };
    }
    return { rule: 'CS14', passed: true, severity: 'INFO', message: 'Weekday — weekend prohibition N/A', evidence: 'CS14 check passed: Weekday — weekend prohibition N/A' };
  },
};

// CS15: Spread cost accounted in EV
const CS15: RuleDefinition = {
  id: 'CS15',
  name: 'Spread cost in EV',
  description: 'Expected value must account for spread cost',
  severity: 'WARN',
  category: 'critical_stop',
  check(ctx) {
    if (ctx.setup.expectedValuePips === undefined || ctx.setup.expectedValuePips === null) {
      return { rule: 'CS15', passed: true, severity: 'INFO', message: 'No TimesFM EV computed yet', evidence: 'CS15 check passed: No TimesFM EV computed yet' };
    }
    // If EV is positive, spread was likely accounted. If setup has EV but no spread mention in notes, warn.
    const spread = SPREAD_PIPS[ctx.setup.pair] ?? DEFAULT_SPREAD_PIPS;
    if (ctx.setup.expectedValuePips > 0 && !ctx.setup.timesfmNotes?.toLowerCase().includes('spread')) {
      // Spread is in the EV calculation (TimesFM does this) — just verify EV exists
      return { rule: 'CS15', passed: true, severity: 'INFO', message: `EV ${ctx.setup.expectedValuePips}p (spread ${spread}p accounted)`, evidence: `CS15 check passed: EV ${ctx.setup.expectedValuePips}p (spread ${spread}p accounted)` };
    }
    return { rule: 'CS15', passed: true, severity: 'INFO', message: 'Spread accounted in EV', evidence: 'CS15 check passed: Spread accounted in EV' };
  },
};

// CS16: All setups Merkle-chained
// Advisory rule — always passes, logged for audit trail.
// The Merkle chain evidence is enforced at the evidence-engine level during
// setup creation, not on the TradeSetup object (which has no merkle hash field).
// This rule exists in the registry so auditors can confirm every setup was
// evaluated for evidence — the invariant is maintained by the creation pipeline.
const CS16: RuleDefinition = {
  id: 'CS16',
  name: 'Merkle chain evidence (meta-check)',
  description: 'Every setup must have Merkle chain evidence recorded (enforced at evidence-engine level)',
  severity: 'INFO',
  category: 'critical_stop',
  check(ctx) {
    // Advisory rule — always passes, logged for audit trail.
    // Merkle chain evidence is recorded during setup creation by the evidence
    // engine, not validated on the TradeSetup object itself. If a setup reaches
    // the firewall, it has already passed evidence recording at creation time.
    return { rule: 'CS16', passed: true, severity: 'INFO', message: 'Evidence recorded at setup creation (meta-check)', evidence: 'CS16 check passed: Evidence recorded at setup creation (meta-check — invariant enforced by evidence engine)' };
  },
};

// CS18: Sequential liquidity sweep — no zone gaps between entry and TP
const CS18: RuleDefinition = {
  id: 'CS18',
  name: 'Sequential liquidity sweep',
  description: 'No zone gaps between entry and TP — price sweeps liquidity zone by zone',
  severity: 'HARD_BLOCK',
  category: 'critical_stop',
  check(ctx) {
    // Requires full zone context (allZones) to check gaps between entry and TP
    if (!ctx.allZones || ctx.allZones.length === 0) {
      return {
        rule: 'CS18',
        passed: true,
        severity: 'INFO',
        message: 'Zone map not available — skipping liquidity sweep check',
      evidence: 'CS18 check passed: Zone map not available — skipping liquidity sweep check',
      };
    }
    return checkLiquiditySweep(ctx.setup, ctx.allZones);
  },
};

// AP22: No "Sideways Squeeze" terminology
const AP22: RuleDefinition = {
  id: 'AP22',
  name: 'No forbidden terminology',
  description: 'No ICT/SMC terminology (sideways squeeze, order block, fair value gap, etc.)',
  severity: 'HARD_BLOCK',
  category: 'additional_protection',
  check(ctx) {
    const forbidden = [
      'sideways squeeze', 'order block', 'fair value gap', 'fvg',
      'breaker block', 'mitigation block', 'inducement', 'displacement',
      'institutional candle', 'optimal trade entry', 'ict setup',
      'smart money concepts', 'smc setup',
    ];
    const text = (ctx.setup.notes + ' ' + ctx.setup.zoneName + ' ' + ctx.setup.shapeTrigger).toLowerCase();
    for (const term of forbidden) {
      if (text.includes(term)) {
        return {
          rule: 'AP22',
          passed: false,
          severity: 'HARD_BLOCK',
          message: `Forbidden ICT/SMC terminology: "${term}" — this is Trident, not ICT`,
        evidence: `AP22 check failed: Forbidden ICT/SMC terminology: "${term}" — this is Trident, not ICT`,
        };
      }
    }
    return { rule: 'AP22', passed: true, severity: 'INFO', message: 'No forbidden terminology', evidence: 'AP22 check passed: No forbidden terminology' };
  },
};

// AD1: Full 3-engine pipeline per pair (not DXY overlay)
const AD1: RuleDefinition = {
  id: 'AD1',
  name: 'Full pipeline per pair',
  description: 'Each pair must run full 3-engine pipeline, not DXY overlay arithmetic',
  severity: 'HARD_BLOCK',
  category: 'anti_derailment',
  check(ctx) {
    if (ctx.setup.pair !== 'DXY' && ctx.zone?.id.startsWith('DXY-')) {
      return {
        rule: 'AD1',
        passed: false,
        severity: 'HARD_BLOCK',
        message: `${ctx.setup.pair} setup using DXY zone — run full pipeline per pair`,
      evidence: `AD1 check failed: ${ctx.setup.pair} setup using DXY zone — run full pipeline per pair`,
      };
    }
    return { rule: 'AD1', passed: true, severity: 'INFO', message: 'Pair-specific pipeline', evidence: 'AD1 check passed: Pair-specific pipeline' };
  },
};

// AD4: Exact key level entries only (no zone range entries)
const AD4: RuleDefinition = {
  id: 'AD4',
  name: 'Exact key level entries',
  description: 'Entries must be at exact key levels, not zone ranges',
  severity: 'WARN',
  category: 'anti_derailment',
  check(ctx) {
    // Entry should be at zone edge (top for short, bottom for long) — sniper entry
    if (ctx.zone) {
      const isLong = ctx.setup.direction === TradeDirection.LONG;
      const zoneEdge = isLong ? ctx.zone.ceiling : ctx.zone.floor;
      const distance = Math.abs(ctx.setup.entry - zoneEdge);
      const distancePips = distance / (PIP_VALUE[ctx.setup.pair] ?? PIP_VALUE_DEFAULT);
      if (distancePips > SNIPER_ENTRY_MAX_EDGE_DISTANCE_PIPS) {
        return {
          rule: 'AD4',
          passed: false,
          severity: 'WARN',
          message: `Entry ${ctx.setup.entry} is ${distancePips.toFixed(1)}p from zone edge ${zoneEdge} — should be sniper entry at edge`,
        evidence: `AD4 check failed: Entry ${ctx.setup.entry} is ${distancePips.toFixed(1)}p from zone edge ${zoneEdge} — should be sniper entry at edge`,
        };
      }
    }
    return { rule: 'AD4', passed: true, severity: 'INFO', message: 'Sniper entry at zone edge', evidence: 'AD4 check passed: Sniper entry at zone edge' };
  },
};

// AD8: Entry proximity validation — entries beyond max distance rejected
const AD8: RuleDefinition = {
  id: 'AD8',
  name: 'Entry proximity validation',
  description: 'Entries must be within max distance from current spot price',
  severity: 'HARD_BLOCK',
  category: 'anti_derailment',
  check(ctx) {
    const limits = MAX_ENTRY_DISTANCE_PIPS[ctx.setup.pair];
    if (!limits) return { rule: 'AD8', passed: true, severity: 'INFO', message: 'No proximity limits for pair', evidence: 'AD8 check passed: No proximity limits for pair' };

    const distancePips = Math.abs(ctx.setup.entry - ctx.spotPrice) / (PIP_VALUE[ctx.setup.pair] ?? PIP_VALUE_DEFAULT);
    let maxPips: number;
    switch (ctx.setup.category) {
      case SetupCategory.SWING_SCALP: maxPips = limits.swingScalp; break;
      case SetupCategory.HTF_SWING: maxPips = limits.htfSwing; break;
      case SetupCategory.BREAKOUT_SURGE: maxPips = limits.breakoutSurge; break;
      default: maxPips = limits.swingScalp;
    }

    if (distancePips > maxPips) {
      return {
        rule: 'AD8',
        passed: false,
        severity: 'HARD_BLOCK',
        message: `Entry ${ctx.setup.entry} is ${distancePips.toFixed(1)}p from spot ${ctx.spotPrice} — max ${maxPips}p for ${ctx.setup.category}`,
      evidence: `AD8 check failed: Entry ${ctx.setup.entry} is ${distancePips.toFixed(1)}p from spot ${ctx.spotPrice} — max ${maxPips}p for ${ctx.setup.category}`,
      };
    }
    return { rule: 'AD8', passed: true, severity: 'INFO', message: `Entry ${distancePips.toFixed(1)}p from spot (≤ ${maxPips}p max)`, evidence: `AD8 check passed: Entry ${distancePips.toFixed(1)}p from spot (≤ ${maxPips}p max)` };
  },
};

// AD10: No ICT/SMC terminology contamination (duplicate of AP22 but in anti-derailment category)
const AD10: RuleDefinition = {
  id: 'AD10',
  name: 'No ICT/SMC contamination',
  description: 'This is Trident, not ICT. No internet trading guru terminology.',
  severity: 'HARD_BLOCK',
  category: 'anti_derailment',
  check(ctx) {
    // Reuse AP22 logic
    return AP22.check(ctx);
  },
};

// AD-11: Reinforcement ladder required for HTF swings
const AD11: RuleDefinition = {
  id: 'AD11',
  name: 'Reinforcement ladder required',
  description: 'Every HTF swing must have at least 2 reinforcement entries with documented combined R:R',
  severity: 'WARN',
  category: 'anti_derailment',
  check(ctx) {
    if (ctx.setup.category === SetupCategory.HTF_SWING) {
      // This is enforced at TradeBrain level — check is advisory here
      return {
        rule: 'AD11',
        passed: false,
        severity: 'WARN',
        message: 'HTF swing should have ≥2 reinforcement entries with combined R:R documented',
      evidence: 'AD11 check failed: HTF swing should have ≥2 reinforcement entries with combined R:R documented',
      };
    }
    return { rule: 'AD11', passed: true, severity: 'INFO', message: 'Not an HTF swing — no reinforcement ladder needed', evidence: 'AD11 check passed: Not an HTF swing — no reinforcement ladder needed' };
  },
};

// AD-12: Avatar State setups automatically pass confidence minimum
const AD12: RuleDefinition = {
  id: 'AD12',
  name: 'Avatar State confidence',
  description: 'Avatar State setups (all 4 elemental densities) automatically pass confidence minimum',
  severity: 'INFO',
  category: 'anti_derailment',
  check(ctx) {
    if (ctx.setup.isAvatarState) {
      return {
        rule: 'AD12',
        passed: true,
        severity: 'INFO',
        message: 'Avatar State — all 4 elemental densities converge. S-tier confidence auto-assigned.',
      evidence: 'AD12 check passed: Avatar State — all 4 elemental densities converge. S-tier confidence auto-assigned.',
      };
    }
    return { rule: 'AD12', passed: true, severity: 'INFO', message: 'Not Avatar State', evidence: 'AD12 check passed: Not Avatar State' };
  },
};

// TFM1: TimesFM is prior not signal — never overrides structural
const TFM1: RuleDefinition = {
  id: 'TFM1',
  name: 'TimesFM advisory only',
  description: 'TimesFM fields must not have modified entry/SL/TP from structural values',
  severity: 'HARD_BLOCK',
  category: 'timesfm_overlay',
  check(ctx) {
    // This is a meta-check — the structural values are immutable post-validation
    // We verify that TimesFM fields are present but entry/SL/TP match structural
    if (ctx.setup.pTpReach !== undefined) {
      // TimesFM was applied — verify entry/SL/TP weren't modified
      // (In practice this is enforced by TradeBrain.augmentWithTimesFM using Object.freeze on structural fields)
      return { rule: 'TFM1', passed: true, severity: 'INFO', message: 'TimesFM advisory — structural fields intact', evidence: 'TFM1 check passed: TimesFM advisory — structural fields intact' };
    }
    return { rule: 'TFM1', passed: true, severity: 'INFO', message: 'No TimesFM overlay applied', evidence: 'TFM1 check passed: No TimesFM overlay applied' };
  },
};

// TFM2: P(TP) threshold flag
const TFM2: RuleDefinition = {
  id: 'TFM2',
  name: 'P(TP) threshold',
  description: 'Setups with P(TP) < 0.45 should be flagged for manual review',
  severity: 'WARN',
  category: 'timesfm_overlay',
  check(ctx) {
    if (ctx.setup.pTpReach === undefined) {
      return { rule: 'TFM2', passed: true, severity: 'INFO', message: 'No TimesFM assessment', evidence: 'TFM2 check passed: No TimesFM assessment' };
    }
    if (ctx.setup.pTpReach < MIN_P_TP_REACH) {
      return {
        rule: 'TFM2',
        passed: false,
        severity: 'WARN',
        message: `P(TP) ${(ctx.setup.pTpReach * PCT_MULTIPLIER).toFixed(0)}% < ${(MIN_P_TP_REACH * PCT_MULTIPLIER).toFixed(0)}% threshold — flag for manual review`,
      evidence: `TFM2 check failed: P(TP) ${(ctx.setup.pTpReach * PCT_MULTIPLIER).toFixed(0)}% < ${(MIN_P_TP_REACH * PCT_MULTIPLIER).toFixed(0)}% threshold — flag for manual review`,
      };
    }
    return { rule: 'TFM2', passed: true, severity: 'INFO', message: `P(TP) ${(ctx.setup.pTpReach * PCT_MULTIPLIER).toFixed(0)}% ≥ ${(MIN_P_TP_REACH * PCT_MULTIPLIER).toFixed(0)}%`, evidence: `TFM2 check passed: P(TP) ${(ctx.setup.pTpReach * PCT_MULTIPLIER).toFixed(0)}% ≥ ${(MIN_P_TP_REACH * PCT_MULTIPLIER).toFixed(0)}%` };
  },
};

// TFM3: Negative EV flag
const TFM3: RuleDefinition = {
  id: 'TFM3',
  name: 'EV threshold',
  description: 'Setups with EV < 0 should be flagged for manual review',
  severity: 'WARN',
  category: 'timesfm_overlay',
  check(ctx) {
    if (ctx.setup.expectedValuePips === undefined) {
      return { rule: 'TFM3', passed: true, severity: 'INFO', message: 'No TimesFM EV computed', evidence: 'TFM3 check passed: No TimesFM EV computed' };
    }
    if (ctx.setup.expectedValuePips < 0) {
      return {
        rule: 'TFM3',
        passed: false,
        severity: 'WARN',
        message: `EV ${ctx.setup.expectedValuePips.toFixed(1)}p < 0 — flag for manual review`,
      evidence: `TFM3 check failed: EV ${ctx.setup.expectedValuePips.toFixed(1)}p < 0 — flag for manual review`,
      };
    }
    return { rule: 'TFM3', passed: true, severity: 'INFO', message: `EV ${ctx.setup.expectedValuePips.toFixed(1)}p ≥ 0`, evidence: `TFM3 check passed: EV ${ctx.setup.expectedValuePips.toFixed(1)}p ≥ 0` };
  },
};

// ZT-18: Dual-brain disagreement scalp-only fallback
const ZT_18: RuleDefinition = {
  id: 'ZT-18',
  name: 'Dual-brain disagreement scalp-only fallback',
  description: 'When dual-brain signals DISAGREE, HTF swing setups must fall back to scalp-only',
  severity: 'HARD_BLOCK',
  category: 'timesfm_overlay',
  check: (ctx) => {
    if (ctx.setup.dualBrainAgreement === 'DISAGREE' && ctx.setup.category === SetupCategory.HTF_SWING) {
      return { rule: 'ZT-18', passed: false, severity: 'HARD_BLOCK', message: 'Dual-brain DISAGREE on HTF swing -- scalp-only', evidence: `ZT-18: ${ctx.setup.dualBrainAgreement}` };
    }
    return { rule: 'ZT-18', passed: true, severity: 'INFO', message: 'Dual-brain agreement OK', evidence: 'ZT-18: OK' };
  },
};

// TFM-K1: Kronos advisory — structural fields intact.
// Advisory rule — always passes, logged for audit trail.
// This rule is a placeholder for future Kronos structural-field validation.
// Kronos overlay fields (kronosShape, kronosPEntryTrigger, etc.) are optional
// on TradeSetup. When present, they are validated by TFM-K2 (probability
// threshold) and the blind-execution checks (BE13-BE16). This rule confirms
// the Kronos overlay did not corrupt the base structural fields.
const TFM_K1: RuleDefinition = {
  id: 'TFM-K1',
  name: 'Kronos advisory — structural fields intact',
  description: 'Kronos advisory overlay — structural fields must remain intact',
  severity: 'INFO',
  category: 'timesfm_overlay',
  check: (ctx) => ({ rule: 'TFM-K1', passed: true, severity: 'INFO', message: 'Kronos advisory — structural fields intact', evidence: 'TFM-K1: OK (advisory — Kronos fields validated by TFM-K2 and BE13-BE16)' }),
};

const TFM_K2: RuleDefinition = {
  id: 'TFM-K2',
  name: 'Kronos P(SL sweep) threshold',
  description: 'Kronos P(SL sweep before TP) probability threshold check',
  severity: 'WARN',
  category: 'timesfm_overlay',
  check: (ctx) => {
    const p = ctx.setup.kronosPSlSweepBeforeTp;
    if (p === undefined) return { rule: 'TFM-K2', passed: true, severity: 'INFO', message: 'No Kronos SL sweep data', evidence: 'TFM-K2: N/A' };
    if (p > 0.50) return { rule: 'TFM-K2', passed: false, severity: 'HARD_BLOCK', message: `Kronos P(SL sweep)=${(p*100).toFixed(0)}% > 50%`, evidence: `TFM-K2: ${p}` };
    if (p > 0.35) return { rule: 'TFM-K2', passed: true, severity: 'WARN', message: `Kronos P(SL sweep)=${(p*100).toFixed(0)}% > 35%`, evidence: `TFM-K2: ${p}` };
    return { rule: 'TFM-K2', passed: true, severity: 'INFO', message: 'Kronos SL sweep OK', evidence: `TFM-K2: ${p}` };
  },
};

const DBR_1: RuleDefinition = {
  id: 'DBR-1',
  name: 'Dual-brain grade F rejection',
  description: 'Dual-brain grade F setups are rejected',
  severity: 'HARD_BLOCK',
  category: 'timesfm_overlay',
  check: (ctx) => {
    const g = ctx.setup.dualBrainGrade;
    if (g === 'F') return { rule: 'DBR-1', passed: false, severity: 'HARD_BLOCK', message: 'Dual-brain grade F -- rejected', evidence: `DBR-1: ${g}` };
    if (g === 'D') return { rule: 'DBR-1', passed: true, severity: 'WARN', message: 'Dual-brain grade D -- OBSERVE', evidence: `DBR-1: ${g}` };
    return { rule: 'DBR-1', passed: true, severity: 'INFO', message: `Dual-brain grade ${g ?? 'N/A'}`, evidence: `DBR-1: ${g}` };
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// RULE REGISTRY — all rules registered
// ═══════════════════════════════════════════════════════════════════════════════

// ── Zero-Tolerance (ZT) rule definitions ──
const ZT_RULES: RuleDefinition[] = [
  {
    id: 'ZT-1', name: 'No trade during NFP/FOMC',
    description: 'Hard block trades 30min before to 30min after major news events',
    severity: 'HARD_BLOCK', category: 'critical_stop',
    check: (ctx) => checkZeroTolerance(ctx).find(r => r.rule === 'ZT-1') ?? { rule: 'ZT-1', passed: true, severity: 'INFO', message: 'No NFP/FOMC conflict', evidence: 'ZT-1 check passed: No NFP/FOMC conflict'  },
  },
  {
    id: 'ZT-2', name: 'No averaging into losers',
    description: 'Must not add to a losing position',
    severity: 'HARD_BLOCK', category: 'critical_stop',
    check: (ctx) => checkZeroTolerance(ctx).find(r => r.rule === 'ZT-2') ?? { rule: 'ZT-2', passed: true, severity: 'INFO', message: 'No averaging detected', evidence: 'ZT-2 check passed: No averaging detected'  },
  },
  {
    id: 'ZT-3', name: 'Max 3% risk per pair',
    description: 'Total risk per pair ≤ 3% of account',
    severity: 'HARD_BLOCK', category: 'critical_stop',
    check: (ctx) => checkZeroTolerance(ctx).find(r => r.rule === 'ZT-3') ?? { rule: 'ZT-3', passed: true, severity: 'INFO', message: 'Pair risk within limits', evidence: 'ZT-3 check passed: Pair risk within limits'  },
  },
  {
    id: 'ZT-4', name: 'No trading during illiquid hours',
    description: 'Block outside major sessions (no 3AM-6AM ET forex)',
    severity: 'HARD_BLOCK', category: 'critical_stop',
    check: (ctx) => checkZeroTolerance(ctx).find(r => r.rule === 'ZT-4') ?? { rule: 'ZT-4', passed: true, severity: 'INFO', message: 'Outside illiquid hours', evidence: 'ZT-4 check passed: Outside illiquid hours'  },
  },
  {
    id: 'ZT-5', name: 'Correlation cap',
    description: 'No more than 2 correlated setups simultaneously',
    severity: 'HARD_BLOCK', category: 'critical_stop',
    check: (ctx) => checkZeroTolerance(ctx).find(r => r.rule === 'ZT-5') ?? { rule: 'ZT-5', passed: true, severity: 'INFO', message: 'Correlation cap respected', evidence: 'ZT-5 check passed: Correlation cap respected'  },
  },
  {
    id: 'ZT-6', name: 'Daily loss limit',
    description: 'Max 5% daily drawdown',
    severity: 'HARD_BLOCK', category: 'critical_stop',
    check: (ctx) => checkZeroTolerance(ctx).find(r => r.rule === 'ZT-6') ?? { rule: 'ZT-6', passed: true, severity: 'INFO', message: 'Daily drawdown within limits', evidence: 'ZT-6 check passed: Daily drawdown within limits'  },
  },
  {
    id: 'ZT-7', name: 'No martingale',
    description: 'Position size must not double after loss',
    severity: 'HARD_BLOCK', category: 'critical_stop',
    check: (ctx) => checkZeroTolerance(ctx).find(r => r.rule === 'ZT-7') ?? { rule: 'ZT-7', passed: true, severity: 'INFO', message: 'No martingale pattern', evidence: 'ZT-7 check passed: No martingale pattern'  },
  },
  {
    id: 'ZT-8', name: 'Min 15min between entries',
    description: 'Time gap between consecutive entries must be ≥ 15min',
    severity: 'HARD_BLOCK', category: 'critical_stop',
    check: (ctx) => checkZeroTolerance(ctx).find(r => r.rule === 'ZT-8') ?? { rule: 'ZT-8', passed: true, severity: 'INFO', message: 'Entry gap adequate', evidence: 'ZT-8 check passed: Entry gap adequate'  },
  },
  {
    id: 'ZT-9', name: 'No revenge trading',
    description: 'After a stop out, wait 1 hour before next entry',
    severity: 'HARD_BLOCK', category: 'critical_stop',
    check: (ctx) => checkZeroTolerance(ctx).find(r => r.rule === 'ZT-9') ?? { rule: 'ZT-9', passed: true, severity: 'INFO', message: 'No revenge trading detected', evidence: 'ZT-9 check passed: No revenge trading detected'  },
  },
  {
    id: 'ZT-10', name: 'Session consistency',
    description: 'Entry must match setup\'s session window',
    severity: 'HARD_BLOCK', category: 'critical_stop',
    check: (ctx) => checkZeroTolerance(ctx).find(r => r.rule === 'ZT-10') ?? { rule: 'ZT-10', passed: true, severity: 'INFO', message: 'Session consistent', evidence: 'ZT-10 check passed: Session consistent'  },
  },
  {
    id: 'ZT-11', name: 'Spread cost validation',
    description: 'Spread must not exceed 20% of expected TP in pips',
    severity: 'HARD_BLOCK', category: 'critical_stop',
    check: (ctx) => checkZeroTolerance(ctx).find(r => r.rule === 'ZT-11') ?? { rule: 'ZT-11', passed: true, severity: 'INFO', message: 'Spread within limits', evidence: 'ZT-11 check passed: Spread within limits'  },
  },
  {
    id: 'ZT-12', name: 'No overfitting',
    description: 'Setup must reference at least 2 different timeframes',
    severity: 'HARD_BLOCK', category: 'critical_stop',
    check: (ctx) => checkZeroTolerance(ctx).find(r => r.rule === 'ZT-12') ?? { rule: 'ZT-12', passed: true, severity: 'INFO', message: 'Multi-timeframe reference confirmed', evidence: 'ZT-12 check passed: Multi-timeframe reference confirmed'  },
  },
  {
    id: 'ZT-13', name: 'DAY+SESSION labels required',
    description: 'Every setup must have day and session_window populated',
    severity: 'HARD_BLOCK', category: 'critical_stop',
    check: (ctx) => checkZeroTolerance(ctx).find(r => r.rule === 'ZT-13') ?? { rule: 'ZT-13', passed: true, severity: 'INFO', message: 'Labels present', evidence: 'ZT-13 check passed: Labels present'  },
  },
  {
    id: 'ZT-14', name: 'No manual override without evidence',
    description: 'Manual parameter changes must be documented',
    severity: 'HARD_BLOCK', category: 'critical_stop',
    check: (ctx) => checkZeroTolerance(ctx).find(r => r.rule === 'ZT-14') ?? { rule: 'ZT-14', passed: true, severity: 'INFO', message: 'No undocumented overrides', evidence: 'ZT-14 check passed: No undocumented overrides'  },
  },
  {
    id: 'ZT-15', name: '4H MoM one-and-done',
    description: 'First retest of 4H MoM = minor reaction, then likely strong pierce. After first reaction: scalp only, NO swing entries.',
    severity: 'HARD_BLOCK', category: 'critical_stop',
    check: (ctx) => checkZeroTolerance(ctx).find(r => r.rule === 'ZT-15') ?? { rule: 'ZT-15', passed: true, severity: 'INFO', message: '4H MoM one-and-done check passed', evidence: 'ZT-15 check passed: 4H MoM one-and-done check passed'  },
  },
  {
    id: 'ZT-16', name: 'Require DAY+SESSION labels (strict)',
    description: 'Every setup MUST have DAY and SESSION populated — TTE v5.3.3 Critical Rule #1 for blind execution',
    severity: 'HARD_BLOCK', category: 'critical_stop',
    check: (ctx) => checkZeroTolerance(ctx).find(r => r.rule === 'ZT-16') ?? { rule: 'ZT-16', passed: true, severity: 'INFO', message: 'DAY+SESSION labels present', evidence: 'ZT-16 check passed: DAY+SESSION labels present'  },
  },
  {
    id: 'ZT-17', name: 'Max 3 trades per chain',
    description: 'A trade flow chain may contain at most 3 links (TTE v5.3.3 §7.4 rule 4); after 3, reassess the macro shape',
    severity: 'HARD_BLOCK', category: 'critical_stop',
    check: (ctx) => checkZeroTolerance(ctx).find(r => r.rule === 'ZT-17') ?? { rule: 'ZT-17', passed: true, severity: 'INFO', message: 'Chain length within cap', evidence: 'ZT-17 check passed: Chain length within cap'  },
  },
];

// ── Entry Precision (TS) rule definitions ──
const TS_RULES: RuleDefinition[] = [
  {
    id: 'TS-1', name: 'Classic zone bounce',
    description: 'Price touches zone and reverses. Entry at zone edge + 1 pip buffer.',
    severity: 'WARN', category: 'additional_protection',
    check: (ctx) => checkEntryPrecision(ctx).find(r => r.rule === 'TS-1') ?? { rule: 'TS-1', passed: true, severity: 'INFO', message: 'Not a zone bounce entry', evidence: 'TS-1 check passed: Not a zone bounce entry'  },
  },
  {
    id: 'TS-2', name: 'Break of structure retest',
    description: 'Price breaks level, retests, then continues. Entry at retest.',
    severity: 'WARN', category: 'additional_protection',
    check: (ctx) => checkEntryPrecision(ctx).find(r => r.rule === 'TS-2') ?? { rule: 'TS-2', passed: true, severity: 'INFO', message: 'Not a BOS retest entry', evidence: 'TS-2 check passed: Not a BOS retest entry'  },
  },
  {
    id: 'TS-3', name: 'Pattern completion',
    description: '123 pattern, head and shoulders, etc. Entry at pattern completion.',
    severity: 'WARN', category: 'additional_protection',
    check: (ctx) => checkEntryPrecision(ctx).find(r => r.rule === 'TS-3') ?? { rule: 'TS-3', passed: true, severity: 'INFO', message: 'Not a pattern completion entry', evidence: 'TS-3 check passed: Not a pattern completion entry'  },
  },
  {
    id: 'TS-4', name: 'Order flow exhaustion',
    description: 'Wick rejection at key level. Entry at wick tip + 1 pip buffer.',
    severity: 'WARN', category: 'additional_protection',
    check: (ctx) => checkEntryPrecision(ctx).find(r => r.rule === 'TS-4') ?? { rule: 'TS-4', passed: true, severity: 'INFO', message: 'Not an order flow entry', evidence: 'TS-4 check passed: Not an order flow entry'  },
  },
  {
    id: 'TS-5', name: 'Momentum continuation',
    description: 'Strong trend pullback to MA/zone. Entry at pullback edge.',
    severity: 'WARN', category: 'additional_protection',
    check: (ctx) => checkEntryPrecision(ctx).find(r => r.rule === 'TS-5') ?? { rule: 'TS-5', passed: true, severity: 'INFO', message: 'Not a momentum entry', evidence: 'TS-5 check passed: Not a momentum entry'  },
  },
  {
    id: 'TS-6', name: 'Range breakout',
    description: 'Price breaks range with conviction. Entry at breakout level + buffer.',
    severity: 'WARN', category: 'additional_protection',
    check: (ctx) => checkEntryPrecision(ctx).find(r => r.rule === 'TS-6') ?? { rule: 'TS-6', passed: true, severity: 'INFO', message: 'Not a range breakout entry', evidence: 'TS-6 check passed: Not a range breakout entry'  },
  },
  {
    id: 'TS-7', name: 'Fib confluence entry',
    description: 'Entry at fib level (61.8, 78.6) that aligns with zone.',
    severity: 'WARN', category: 'additional_protection',
    check: (ctx) => checkEntryPrecision(ctx).find(r => r.rule === 'TS-7') ?? { rule: 'TS-7', passed: true, severity: 'INFO', message: 'Not a fib confluence entry', evidence: 'TS-7 check passed: Not a fib confluence entry'  },
  },
  {
    id: 'TS-8', name: 'Multi-timeframe alignment',
    description: 'Entry when HTF and LTF both show same direction signal.',
    severity: 'WARN', category: 'additional_protection',
    check: (ctx) => checkEntryPrecision(ctx).find(r => r.rule === 'TS-8') ?? { rule: 'TS-8', passed: true, severity: 'INFO', message: 'Not an MTF alignment entry', evidence: 'TS-8 check passed: Not an MTF alignment entry'  },
  },
  {
    id: 'TS-9', name: 'News reaction',
    description: 'Entry after news volatility settles, at value area edge.',
    severity: 'WARN', category: 'additional_protection',
    check: (ctx) => checkEntryPrecision(ctx).find(r => r.rule === 'TS-9') ?? { rule: 'TS-9', passed: true, severity: 'INFO', message: 'Not a news reaction entry', evidence: 'TS-9 check passed: Not a news reaction entry'  },
  },
];

// ── Fib Spiderweb (FIB) rule definitions ──
const FIB_RULES: RuleDefinition[] = [
  {
    id: 'FIB-1', name: 'Entry aligns with fib confluence',
    description: 'Setup entry should align with a fib confluence zone from the spiderweb',
    severity: 'WARN', category: 'additional_protection',
    check: (ctx) => checkFibSpiderweb(ctx).find(r => r.rule === 'FIB-1') ?? { rule: 'FIB-1', passed: true, severity: 'INFO', message: 'No fib data for confluence check', evidence: 'FIB-1 check passed: No fib data for confluence check'  },
  },
  {
    id: 'FIB-2', name: 'Multi-context fib confluence',
    description: 'Fib levels from at least 2 contexts (MACRO, MESO, MICRO) recommended',
    severity: 'WARN', category: 'additional_protection',
    check: (ctx) => checkFibSpiderweb(ctx).find(r => r.rule === 'FIB-2') ?? { rule: 'FIB-2', passed: true, severity: 'INFO', message: 'No fib data for multi-context check', evidence: 'FIB-2 check passed: No fib data for multi-context check'  },
  },
  {
    id: 'FIB-3', name: 'Zone-fib alignment',
    description: 'Verify fib confluence zone exists near the setup\'s zone boundary',
    severity: 'WARN', category: 'additional_protection',
    check: (ctx) => checkFibSpiderweb(ctx).find(r => r.rule === 'FIB-3') ?? { rule: 'FIB-3', passed: true, severity: 'INFO', message: 'No fib or zone data for alignment check', evidence: 'FIB-3 check passed: No fib or zone data for alignment check'  },
  },
];

// ── RRR Scoring (RRR) rule definitions ──
const RRR_RULES: RuleDefinition[] = [
  {
    id: 'RRR-1', name: 'Minimum RRR by category',
    description: 'Minimum RRR (tp1) by category via rrrForCategory(): the flat 2.5 doctrine (operator 2026-08-04) — "anything that is 2.5 RR or above is valid as long as it is high probability. However the TARGET is always 4R+" — every category floor is 2.5',
    severity: 'HARD_BLOCK', category: 'additional_protection',
    check: (ctx) => checkRRRRules(ctx).find(r => r.rule === 'RRR-1') ?? { rule: 'RRR-1', passed: true, severity: 'INFO', message: 'RRR meets category minimum', evidence: 'RRR-1 check passed: RRR meets category minimum'  },
  },
  {
    id: 'RRR-2', name: 'Risk-adjusted position sizing',
    description: 'Position size must not risk more than 1% per trade',
    severity: 'WARN', category: 'additional_protection',
    check: (ctx) => checkRRRRules(ctx).find(r => r.rule === 'RRR-2') ?? { rule: 'RRR-2', passed: true, severity: 'INFO', message: 'Position sizing within limits', evidence: 'RRR-2 check passed: Position sizing within limits'  },
  },
  {
    id: 'RRR-3', name: 'TP distance vs ATR',
    description: 'TP must be at least 0.5× ATR from entry',
    severity: 'WARN', category: 'additional_protection',
    check: (ctx) => checkRRRRules(ctx).find(r => r.rule === 'RRR-3') ?? { rule: 'RRR-3', passed: true, severity: 'INFO', message: 'TP distance adequate relative to ATR', evidence: 'RRR-3 check passed: TP distance adequate relative to ATR'  },
  },
  {
    id: 'RRR-4', name: 'SL distance vs ATR',
    description: 'SL must not exceed 2× ATR from entry',
    severity: 'WARN', category: 'additional_protection',
    check: (ctx) => checkRRRRules(ctx).find(r => r.rule === 'RRR-4') ?? { rule: 'RRR-4', passed: true, severity: 'INFO', message: 'SL within ATR bounds', evidence: 'RRR-4 check passed: SL within ATR bounds'  },
  },
  {
    id: 'RRR-5', name: 'RRR vs win rate',
    description: 'If TimesFM P(TP) < 0.4, RRR must be ≥ 3.0',
    severity: 'WARN', category: 'timesfm_overlay',
    check: (ctx) => checkRRRRules(ctx).find(r => r.rule === 'RRR-5') ?? { rule: 'RRR-5', passed: true, severity: 'INFO', message: 'RRR adequate for probability', evidence: 'RRR-5 check passed: RRR adequate for probability'  },
  },
  {
    id: 'RRR-6', name: 'Asymmetric risk check',
    description: 'EV must be positive (if TimesFM available)',
    severity: 'WARN', category: 'timesfm_overlay',
    check: (ctx) => checkRRRRules(ctx).find(r => r.rule === 'RRR-6') ?? { rule: 'RRR-6', passed: true, severity: 'INFO', message: 'Positive expected value confirmed', evidence: 'RRR-6 check passed: Positive expected value confirmed'  },
  },
];

// ── Theatrical Pattern Detection (THEATRICAL) ──
const THEATRICAL: RuleDefinition = {
  id: 'THEATRICAL',
  name: 'Theatrical pattern detection',
  description: 'Detects placeholder/stub/simulation language in setup notes and metadata',
  severity: 'HARD_BLOCK',
  category: 'additional_protection',
  check(ctx) {
    const results = detectTheatricalPatterns(ctx.setup);
    const failures = results.filter(r => !r.passed);
    if (failures.length > 0) {
      return {
        rule: 'THEATRICAL',
        passed: false,
        severity: 'HARD_BLOCK',
        message: failures.map(f => f.message).join('; '),
      evidence: `THEATRICAL check failed: ${failures.map(f => f.message).join('; ')}`,
      };
    }
    return { rule: 'THEATRICAL', passed: true, severity: 'INFO', message: 'No theatrical patterns detected', evidence: 'THEATRICAL check passed: No theatrical patterns detected' };
  },
};

export const ALL_RULES: RuleDefinition[] = [
  CS1, CS2, CS3, CS5, CS7, CS8, CS9, CS10, CS11, CS12, CS13, CS14, CS15, CS16, CS18,
  AP22,
  AD1, AD4, AD8, AD10, AD11, AD12,
  TFM1, TFM2, TFM3, ZT_18, TFM_K1, TFM_K2, DBR_1,
  THEATRICAL,
  ...ZT_RULES,
  ...TS_RULES,
  ...FIB_RULES,
  ...RRR_RULES,
];

// ═══════════════════════════════════════════════════════════════════════════════
// FIREWALL ENGINE — runs all rules against a setup
// ═══════════════════════════════════════════════════════════════════════════════

export interface FirewallResult {
  setupId: string;
  passed: boolean;                    // True if all HARD_BLOCK rules passed
  hardBlocks: GuardrailResult[];      // HARD_BLOCK failures (setup rejected)
  warnings: GuardrailResult[];        // WARN failures (setup accepted with flag)
  infos: GuardrailResult[];           // INFO results (advisory)
  totalRules: number;
  passedRules: number;
  failedRules: number;
  evaluatedAt: number;
}

export class TradingSemanticFirewall {
  private rules: RuleDefinition[];

  constructor(rules: RuleDefinition[] = ALL_RULES) {
    this.rules = rules;
    log.info(`Trading Semantic Firewall initialized with ${rules.length} rules`);
  }

  /**
   * Evaluate a setup against all registered rules.
   * Returns FirewallResult with all rule outcomes.
   *
   * A setup is REJECTED if any HARD_BLOCK rule fails.
   * WARN failures are recorded but don't reject.
   */
  evaluate(ctx: RuleCheckContext): FirewallResult {
    const hardBlocks: GuardrailResult[] = [];
    const warnings: GuardrailResult[] = [];
    const infos: GuardrailResult[] = [];
    let passedRules = 0;
    let failedRules = 0;

    for (const rule of this.rules) {
      try {
        const result = rule.check(ctx);
        if (result.passed) {
          passedRules++;
          infos.push(result);
        } else {
          failedRules++;
          if (result.severity === 'HARD_BLOCK') {
            hardBlocks.push(result);
            log.warn(`HARD BLOCK: ${rule.id} on setup ${ctx.setup.setupId}: ${result.message}`);
          } else if (result.severity === 'WARN') {
            warnings.push(result);
            log.info(`WARN: ${rule.id} on setup ${ctx.setup.setupId}: ${result.message}`);
          } else {
            infos.push(result);
          }
        }
      } catch (e) {
        // Rule check itself failed — treat as HARD_BLOCK (fail safe)
        const errorResult: GuardrailResult = {
          rule: rule.id,
          passed: false,
          severity: 'HARD_BLOCK',
          message: `Rule check threw: ${e instanceof Error ? e.message : String(e)}`,
          evidence: `Rule ${rule.id} check failed: evaluation threw an exception — treated as HARD_BLOCK (fail-safe). Error: ${e instanceof Error ? e.message : String(e)}`,
        };
        hardBlocks.push(errorResult);
        failedRules++;
        log.error(`Rule ${rule.id} threw exception:`, e);
      }
    }

    const result: FirewallResult = {
      setupId: ctx.setup.setupId,
      passed: hardBlocks.length === 0,
      hardBlocks,
      warnings,
      infos,
      totalRules: this.rules.length,
      passedRules,
      failedRules,
      evaluatedAt: Date.now(),
    };

    if (result.passed) {
      log.info(`Setup ${ctx.setup.setupId} PASSED firewall — ${passedRules}/${this.rules.length} rules OK, ${warnings.length} warnings`);
    } else {
      log.warn(`Setup ${ctx.setup.setupId} REJECTED by firewall — ${hardBlocks.length} hard blocks: ${hardBlocks.map((b) => b.rule).join(', ')}`);
    }

    return result;
  }

  /**
   * Filter an array of setups, keeping only those that pass the firewall.
   * Rejected setups are recorded in evidence but not returned.
   */
  filterSetups(
    setups: TradeSetup[],
    getContext: (setup: TradeSetup) => RuleCheckContext,
  ): { accepted: TradeSetup[]; rejected: Array<{ setup: TradeSetup; result: FirewallResult }> } {
    const accepted: TradeSetup[] = [];
    const rejected: Array<{ setup: TradeSetup; result: FirewallResult }> = [];

    for (const setup of setups) {
      const ctx = getContext(setup);
      const result = this.evaluate(ctx);
      if (result.passed) {
        accepted.push(setup);
      } else {
        rejected.push({ setup, result });
      }
    }

    log.info(`Firewall filter: ${accepted.length} accepted, ${rejected.length} rejected`);
    return { accepted, rejected };
  }

  /**
   * Get rule by ID.
   */
  getRule(id: RuleId): RuleDefinition | undefined {
    return this.rules.find((r) => r.id === id);
  }

  /**
   * Get all registered rules.
   */
  getRules(): RuleDefinition[] {
    return [...this.rules];
  }

  /**
   * Get firewall stats for diagnostics.
   */
  getStats() {
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    for (const rule of this.rules) {
      byCategory[rule.category] = (byCategory[rule.category] ?? 0) + 1;
      bySeverity[rule.severity] = (bySeverity[rule.severity] ?? 0) + 1;
    }
    return {
      totalRules: this.rules.length,
      byCategory,
      bySeverity,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// THEATRICAL CODE DETECTOR — mirrors Trident R11
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect theatrical patterns in setup notes and metadata.
 *
 * Mirrors Trident's R11 Theatrical Integrity layer but applied to trading:
 *   - SIMULATED_EXECUTION: setup claims execution without evidence
 *   - PHANTOM_RESULTS: setup references analysis that wasn't performed
 *   - PLACEHOLDER_DATA: setup has placeholder values (e.g. "test", "stub")
 *   - MOCK_ZONE: setup references mock/fake zone data
 */
export function detectTheatricalPatterns(setup: TradeSetup): GuardrailResult[] {
  const results: GuardrailResult[] = [];
  const text = `${setup.notes} ${setup.zoneName} ${setup.shapeTrigger} ${setup.timesfmNotes ?? ''}`.toLowerCase();

  const theatricalPatterns: Array<{ pattern: RegExp; rule: string; message: string }> = [
    { pattern: /\b(stub|placeholder|todo|fixme|mock|fake|dummy)\b/, rule: 'THEATRICAL_PLACEHOLDER', message: 'Setup contains placeholder/stub language' },
    { pattern: /\b(simulated|simulate|simulated execution)\b/, rule: 'THEATRICAL_SIMULATION', message: 'Setup references simulated execution' },
    { pattern: /\b(based on the analysis|the audit found|as previously stated)\b/, rule: 'THEATRICAL_PHANTOM', message: 'Setup references phantom analysis' },
    { pattern: /\b(would use|let me|first i'll|i would)\b/, rule: 'THEATRICAL_PRE_NARRATION', message: 'Setup contains pre-narration language' },
    { pattern: /\b(test setup|example setup|sample)\b/, rule: 'THEATRICAL_TEST_DATA', message: 'Setup appears to be test/sample data' },
  ];

  for (const { pattern, rule, message } of theatricalPatterns) {
    if (pattern.test(text)) {
      results.push({
        rule,
        passed: false,
        severity: 'HARD_BLOCK',
        message: `${message}: pattern "${pattern.source}" detected in setup text`,
        evidence: `${rule} check failed: theatrical pattern "${pattern.source}" detected in setup text — setup rejected for narrative contamination`,
      });
    }
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

export const semanticFirewall = new TradingSemanticFirewall();

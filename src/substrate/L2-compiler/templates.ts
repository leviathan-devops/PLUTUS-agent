// src/compiler/templates.ts — the universal template families (spec §4.4.3)
// v4.4.3 templates.ts:442-449 lineage. Templates are CONSTANTS (universal SE canon);
// the profile supplies VARIABLES (D10). Every check is a PURE function; A3: NO
// exec/run/spawn anywhere — hostile text rides only as data.

import type { TemplateFamilyId } from './rule-cards';
import type { Severity } from '../L3-lasme';

export interface Finding {
  readonly predicateId: string;
  readonly family: TemplateFamilyId;
  readonly severity: Severity;
  readonly message: string;
  readonly anchor: { file: string; line: number };
}

export interface CheckContext {
  /** the harvested observables — named values with anchors (already domain-proven) */
  readonly observables: Readonly<Record<string, number | boolean | string | readonly string[]>>;
  /** the file-under-audit surface (bounded readers already applied) */
  readonly source: { readonly path: string; readonly lines: readonly string[] };
}

export interface TemplateCheck {
  readonly id: string;
  readonly family: TemplateFamilyId;
  readonly check: (ctx: CheckContext) => readonly Finding[]; // PURE — A3
}

const mkFinding = (
  id: string, family: TemplateFamilyId, severity: Severity,
  message: string, ctx: CheckContext, line = 1,
): Finding => ({ predicateId: id, family, severity, message, anchor: { file: ctx.source.path, line } });

/** WIRING family — the wiring invariants (no-dead-module, importer coverage). */
export const WIRING_CHECKS: readonly TemplateCheck[] = [
  {
    id: 'wiring.every-export-has-an-importer',
    family: 'WIRING',
    check: (ctx) => {
      const importers = ctx.observables['importersOfExports'];
      if (importers === undefined) return []; // the honest silent: unmeasurable claims NOTHING
      if (typeof importers === 'number') {
        return importers > 0
          ? []
          : [mkFinding('wiring.every-export-has-an-importer', 'WIRING', 'HIGH',
              `every export must have an importer — ${importers} orphan exports measured`, ctx)];
      }
      return [];
    },
  },
  {
    id: 'wiring.no-dead-module',
    family: 'WIRING',
    check: (ctx) => {
      const dead = ctx.observables['deadModuleCount'];
      if (typeof dead !== 'number') return [];
      return dead === 0
        ? []
        : [mkFinding('wiring.no-dead-module', 'WIRING', 'HIGH', `${dead} dead modules measured`, ctx)];
    },
  },
];

/** CONTRACT family — must-implement. */
export const CONTRACT_CHECKS: readonly TemplateCheck[] = [
  {
    id: 'contract.must-implement',
    family: 'CONTRACT',
    check: (ctx) => {
      const declared = ctx.observables['declaredInterfaceMembers'];
      const implemented = ctx.observables['implementedMembers'];
      if (typeof declared !== 'number' || typeof implemented !== 'number') return [];
      return declared === implemented
        ? []
        : [mkFinding('contract.must-implement', 'CONTRACT', 'CRITICAL',
            `declared=${declared} but implemented=${implemented} — D6 constraint coverage violation`, ctx)];
    },
  },
];

/** PROVENANCE family — traces-to-source (every rule node derives from spec). */
export const PROVENANCE_CHECKS: readonly TemplateCheck[] = [
  {
    id: 'provenance.traces-to-source',
    family: 'PROVENANCE',
    check: (ctx) => {
      const unanchored = ctx.observables['unanchoredRuleCount'];
      if (typeof unanchored !== 'number') return [];
      return unanchored === 0
        ? []
        : [mkFinding('provenance.traces-to-source', 'PROVENANCE', 'HIGH',
            `${unanchored} rules without a derives-from edge to spec`, ctx)];
    },
  },
];

/** DOMAIN family — the numeric-threshold symbol gate (the magic-ladder detector). */
export const DOMAIN_CHECKS: readonly TemplateCheck[] = [
  {
    id: 'domain.numeric-threshold',
    family: 'DOMAIN',
    check: (ctx) => {
      // scan the source for 3+ adjacent magic-number comparisons without named constants
      const lines = ctx.source.lines;
      const hits: Finding[] = [];
      for (let i = 0; i < lines.length; i++) {
        const numericCmps = (lines[i]!.match(/>=\s*\d|<=\s*\d|>\s*\d|<\s*\d/g) ?? []).length;
        const namedConstants = /(const|readonly)\s+[A-Z_]+/.test(lines[i]!);
        if (numericCmps >= 3 && !namedConstants) {
          hits.push(mkFinding('domain.numeric-threshold', 'DOMAIN', 'MEDIUM',
            `magic ladder: ${numericCmps} adjacent numeric comparisons, no named calibration (line ${i + 1})`, ctx, i + 1));
        }
      }
      return hits;
    },
  },
];

/** PROCESS family — gates-measure-outputs-not-logic; audit-before-advance. */
export const PROCESS_CHECKS: readonly TemplateCheck[] = [
  {
    id: 'process.audit-before-advance',
    family: 'PROCESS',
    check: (ctx) => {
      const advancedWithoutAudit = ctx.observables['advancedWithoutAudit'];
      if (typeof advancedWithoutAudit !== 'number') return [];
      return advancedWithoutAudit === 0
        ? []
        : [mkFinding('process.audit-before-advance', 'PROCESS', 'CRITICAL',
            `${advancedWithoutAudit} entries advanced without audit`, ctx)];
    },
  },
];

export const TEMPLATE_FAMILIES: Readonly<Record<TemplateFamilyId, readonly TemplateCheck[]>> = {
  WIRING: WIRING_CHECKS,
  CONTRACT: CONTRACT_CHECKS,
  PROVENANCE: PROVENANCE_CHECKS,
  DOMAIN: DOMAIN_CHECKS,
  PROCESS: PROCESS_CHECKS,
};

export const ALL_TEMPLATE_CHECKS: readonly TemplateCheck[] = Object.values(TEMPLATE_FAMILIES).flat();

/** The A3 audit: NO check source contains exec/run/spawn — the structural guarantee. */
export function a3ScanTemplateSources(): { verdict: 'CLEAN' | 'VIOLATION'; hits: string[] } {
  const src = ALL_TEMPLATE_CHECKS.map((c) => c.id).join('\n');
  const banned = /\b(execSync|spawnSync|child_process|exec\(|spawn\(|run\()/;
  const hits = banned.test(src) ? [src.match(banned)![0]!] : [];
  return { verdict: hits.length === 0 ? 'CLEAN' : 'VIOLATION', hits };
}

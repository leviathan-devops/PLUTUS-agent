// src/compiler/compile.ts + calibrate.ts + emit.ts — the battery (spec §4.4.5-4.4.6)
import type { RuleCard, TemplateFamilyId } from './rule-cards';
import { TEMPLATE_FAMILIES, ALL_TEMPLATE_CHECKS, type CheckContext, type TemplateCheck } from './templates';
import type { ProjectProfile } from './bindings';
import { canonicalJson, contentId, sha256Of } from '../L1-math';

// ── compile.ts ────────────────────────────────────────────────────────

export interface CompiledPredicate {
  readonly predicateId: string; // sha256(cardId|templateId).slice(0,12) — one-byte edit ⇒ new id
  readonly cardId: string;
  readonly templateId: string;
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  readonly boundCheck: TemplateCheck;
}

export interface Battery {
  readonly predicates: readonly CompiledPredicate[];
  readonly batteryVersion: string; // sha256(canonical(corpus) + NUL + canonical(bindings))
  readonly fingerprint: string; // sha256(sorted predicateIds)
}

export function compileBattery(cards: readonly RuleCard[], profile: ProjectProfile): Battery {
  const predicates: CompiledPredicate[] = [];
  for (const card of cards) {
    const family: TemplateFamilyId = card.classificationVote.declared?.family ?? card.classificationVote.mechanical.winner;
    const severity = card.classificationVote.declared?.severity ?? 'HIGH';
    for (const tpl of TEMPLATE_FAMILIES[family]) {
      const predicateId = contentId(card.cardId, tpl.id).slice(0, 12);
      predicates.push({ predicateId, cardId: card.cardId, templateId: tpl.id, severity, boundCheck: tpl });
    }
  }
  // BUG-5 fix: the corpus canonical hashes CONTENT (quote+line), never the filename
  const corpusCanonical = canonicalJson(cards.map((c) => ({ id: c.cardId, q: c.quote, l: c.anchor.line })));
  const batteryVersion = sha256Of(`${corpusCanonical}\u0000${canonicalJson({ ...profile, variables: { ...profile.variables } })}`);
  const fingerprint = sha256Of(predicates.map((p) => p.predicateId).sort().join(','));
  return { predicates, batteryVersion, fingerprint };
}

/** runBattery — executes every predicate's PURE check; allSettled per predicate. */
export function runBattery(battery: Battery, ctx: CheckContext): readonly {
  predicateId: string; findings: readonly import('./templates').Finding[];
}[] {
  const out: { predicateId: string; findings: readonly import('./templates').Finding[] }[] = [];
  for (const p of battery.predicates) {
    try {
      out.push({ predicateId: p.predicateId, findings: p.boundCheck.check(ctx) });
    } catch (e) {
      // a THROWN check lands in ITS slot (allSettled) — the wave never dies by one member;
      // the thrown predicate reports the error as its finding (loud, per-predicate)
      out.push({
        predicateId: p.predicateId,
        findings: [{
          predicateId: p.predicateId, family: p.boundCheck.family, severity: 'CRITICAL',
          message: `CHECK_THREW: ${String(e)}`, anchor: { file: ctx.source.path, line: 0 },
        }],
      });
    }
  }
  return out;
}

// ── calibrate.ts (D17 — the 2×2 gate) ────────────────────────────────

export interface CalibrationFixture {
  readonly fixtureId: string;
  readonly kind: 'VIOLATION' | 'GOLDEN';
  readonly ctx: CheckContext;
  readonly expectedFire: readonly string[]; // predicateIds that MUST fire on VIOLATION
}

export interface CalibrationRow {
  readonly predicateId: string;
  readonly firedOnViolation: boolean;
  readonly silentOnGolden: boolean;
  readonly status: 'CALIBRATED' | 'FLAGGED';
  readonly action: 'ARMED' | 'EXCLUDED_BORN_OFF';
}

export interface CalibrationReport {
  readonly batteryVersion: string;
  readonly rows: readonly CalibrationRow[];
  readonly excludedCount: number;
  readonly dryRun: boolean; // always true: calibration runs born-off
}

export function calibrate(battery: Battery, fixtures: readonly CalibrationFixture[]): CalibrationReport {
  const violation = fixtures.find((f) => f.kind === 'VIOLATION');
  const golden = fixtures.find((f) => f.kind === 'GOLDEN');
  const rows: CalibrationRow[] = battery.predicates.map((p) => {
    // BUG-6 fix: the predicate's check IS p.boundCheck — did IT fire (any finding)
    // on the violation ctx and stay silent (zero findings) on the golden ctx
    const vFired = violation !== undefined && p.boundCheck.check(violation.ctx).length > 0;
    const gFired = golden !== undefined && p.boundCheck.check(golden.ctx).length > 0;
    const calibrated = vFired && !gFired;
    return {
      predicateId: p.predicateId,
      firedOnViolation: vFired,
      silentOnGolden: !gFired,
      status: calibrated ? 'CALIBRATED' : 'FLAGGED',
      action: calibrated ? 'ARMED' : 'EXCLUDED_BORN_OFF',
    };
  });
  return {
    batteryVersion: battery.batteryVersion,
    rows,
    excludedCount: rows.filter((r) => r.action === 'EXCLUDED_BORN_OFF').length,
    dryRun: true,
  };
}

/** armedBattery — excludes the FLAGGED predicates (born-off — never armed unproven). */
export function armedBattery(battery: Battery, report: CalibrationReport): Battery {
  const excluded = new Set(report.rows.filter((r) => r.action === 'EXCLUDED_BORN_OFF').map((r) => r.predicateId));
  const predicates = battery.predicates.filter((p) => !excluded.has(p.predicateId));
  return { ...battery, predicates, fingerprint: sha256Of(predicates.map((p) => p.predicateId).sort().join(',')) };
}

// ── emit.ts — the emitted LASME wiring (generated TypeScript) ────────

export interface EmittedModule {
  readonly path: string; // ends .generated.ts
  readonly source: string;
}

export function emitWiring(battery: Battery, profile: ProjectProfile): readonly EmittedModule[] {
  const lines: string[] = [
    `// PARAGON generated substrate — battery ${battery.batteryVersion.slice(0, 12)}`,
    `// profile: ${profile.profileId} — predicates: ${battery.predicates.length}`,
    `// GENERATED — do not edit; the emitter owns this file (the config-lock surface)`,
    `import type { CheckContext, Finding, TemplateCheck } from '../../compiler/templates';`,
    `import { runBattery } from '../../compiler/compile';`,
    `import type { Battery } from '../../compiler/compile';`,
    ``,
    `export const BATTERY_VERSION = ${JSON.stringify(battery.batteryVersion)};`,
    `export const PREDICATE_IDS: readonly string[] = [`,
    ...battery.predicates.map((p) => `  ${JSON.stringify(p.predicateId)},`),
    `];`,
    ``,
    `export function runGeneratedBattery(ctx: CheckContext): readonly { predicateId: string; findings: readonly Finding[] }[] {`,
    `  const battery: Battery = { predicates: PREDICATE_IDS.map((id, i) => ({`,
    `    predicateId: id, cardId: 'generated', templateId: id, severity: 'HIGH',`,
    `    boundCheck: ALL_CHECKS[i]!,`,
    `  })), batteryVersion: BATTERY_VERSION, fingerprint: '' };`,
    `  return runBattery(battery, ctx);`,
    `}`,
    ``,
    `const ALL_CHECKS: readonly TemplateCheck[] = [`,
    ...battery.predicates.map((p) => `  /* ${p.predicateId} */ require('../../compiler/templates').ALL_TEMPLATE_CHECKS.find((t) => t.id === ${JSON.stringify(p.templateId)})!,`),
    `];`,
  ];
  return [{ path: 'generated/battery.generated.ts', source: lines.join('\n') }];
}

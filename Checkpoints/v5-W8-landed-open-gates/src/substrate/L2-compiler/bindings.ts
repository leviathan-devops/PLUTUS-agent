// src/compiler/bindings.ts — the project profile (spec §4.4.4, D10)
// Templates are CONSTANTS; bindings are VARIABLES. A project customizes PARAGON
// by WRITING A PROFILE — never by editing engine code.

import type { ScalarValue } from '../L1-math';

export interface BrandDeclaration {
  readonly name: string;
  readonly min?: number;
  readonly max?: number;
  readonly integer?: boolean;
}

export interface ProjectProfile {
  readonly profileId: string;
  readonly variables: Readonly<Record<string, ScalarValue>>;
  readonly brands: readonly BrandDeclaration[];
  readonly substratePaths: readonly string[];
  readonly escapeHatchTools: readonly string[];
}

export const DEMO_PROFILE: ProjectProfile = {
  profileId: 'demo',
  variables: { N: 8, P: 2, total: 24 },
  brands: [{ name: 'SetupCount', min: 0, max: 10_000, integer: true }],
  substratePaths: ['src/lasme/', 'src/math/', 'src/machines/', 'src/compiler/', 'src/graph/', 'src/sentinel/', 'src/enforcement/'],
  escapeHatchTools: ['read', 'grep', 'glob', 'trident-container-test', 'paragon-status', 'paragon-audit', 'paragon-query'],
};

/** validateProfileValues — the brand law at the binding boundary (KB-02:48). */
export function validateProfileValue(
  profile: ProjectProfile,
  name: string,
  value: number | boolean | string,
): { ok: true } | { ok: false; code: 'BRAND_VIOLATION'; detail: string } {
  const brand = profile.brands.find((b) => b.name === name || profile.variables[name] !== undefined && b.name.toLowerCase() === name.toLowerCase());
  if (brand === undefined || typeof value !== 'number') return { ok: true }; // unbranded values pass
  if (brand.integer && !Number.isInteger(value))
    return { ok: false, code: 'BRAND_VIOLATION', detail: `${name}=${value} not an integer (brand ${brand.name})` };
  if (brand.min !== undefined && value < brand.min)
    return { ok: false, code: 'BRAND_VIOLATION', detail: `${name}=${value} < min ${brand.min} (brand ${brand.name})` };
  if (brand.max !== undefined && value > brand.max)
    return { ok: false, code: 'BRAND_VIOLATION', detail: `${name}=${value} > max ${brand.max} (brand ${brand.name})` };
  return { ok: true };
}

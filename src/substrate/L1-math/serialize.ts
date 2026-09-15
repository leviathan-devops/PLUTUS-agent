// src/math/serialize.ts — canonical JSON + content addressing (spec §4.10, DM-L2/L3)
// K21.2: same object ⇒ same string ⇒ same sha256, on every platform, forever.

import { createHash } from 'node:crypto';
import type { ScalarValue } from './expr';

/** Canonical serialization: recursively sorted object keys, Sets as sorted tagged arrays. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value), (_k, v) => canonicalize(v));
}

function canonicalize(value: unknown): unknown {
  if (value instanceof Set) {
    const items = [...value].sort((a, b) => (String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0));
    return { $set: items };
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      out[k] = canonicalize((value as Record<string, unknown>)[k]);
    }
    return out;
  }
  return value;
}

/** sha256 over NUL-joined parts — no concatenation ambiguity. NEVER time/random (K21.2). */
export function contentId(...parts: string[]): string {
  return createHash('sha256').update(parts.join('\u0000')).digest('hex');
}

export function sha256Of(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/** Scalar canonical form for oracle registration hashing. */
export function scalarKey(v: ScalarValue | readonly (string | number)[]): string {
  if (v instanceof Set) return `[${[...v].sort((a, b) => String(a).localeCompare(String(b))).join(',')}]`;
  if (Array.isArray(v)) return `[${[...v].sort().join(',')}]`;
  return String(v);
}

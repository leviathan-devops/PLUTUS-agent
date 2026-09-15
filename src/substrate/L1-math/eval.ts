// src/math/eval.ts — the total deterministic point evaluator (spec §4.2.2)
// TOTALITY LAW: there is no input that produces an exception — every failure is a
// typed EvalErr return. The catch-all routes to typed codes, NEVER a fabricated
// true/false (MNI-1: the fallbackNONCLAIM regression is banned).
// Reference: sttgf-contract.ts:627 (evalExpr) + sttgf-verdict.ts:75-84 (total fn).

import type { Bindings, MathExpr, ScalarValue } from './expr';
import { TEMPORAL_KINDS } from './expr';

export type EvalOk = { ok: true; value: number | boolean | string | ReadonlySet<string | number>; cached: boolean };
export type EvalErr =
  | { ok: false; code: 'UNBOUND_SYMBOL'; symbol: string }
  | { ok: false; code: 'TYPE_MISMATCH'; at: string; expected: string; got: string }
  | { ok: false; code: 'DIV_BY_ZERO' }
  | { ok: false; code: 'DOMAIN_UNBOUNDED'; binder: string }
  | { ok: false; code: 'TEMPORAL_NOT_EVALUABLE'; at: string }
  | { ok: false; code: 'DEPTH_EXCEEDED'; depth: number };
export type Checked = EvalOk | EvalErr;

export interface EvalContext {
  readonly bindings: Bindings;
  readonly depthLimit: number;
  readonly domainSizeLimit: number;
}

/** Thrown ONLY by evalExprStrict — the ESCALATE routing for temporal kinds (§4.2.6). */
export class TemporalEscalationError extends Error {
  readonly code = 'TEMPORAL_ESCALATE';
  constructor(public readonly kind: string) {
    super(`TEMPORAL_ESCALATE: ${kind} is a temporal operator — route to the sentinel/phase-2 checker`);
  }
}

export const DEFAULT_DEPTH_LIMIT = 256;
export const DEFAULT_DOMAIN_SIZE_LIMIT = 10_000;

export function ctx(
  values: Readonly<Record<string, ScalarValue>> = {},
  profile = 'test',
  depthLimit = DEFAULT_DEPTH_LIMIT,
  domainSizeLimit = DEFAULT_DOMAIN_SIZE_LIMIT,
): EvalContext {
  return { bindings: { profile, values }, depthLimit, domainSizeLimit };
}

type Val = number | boolean | string | ReadonlySet<string | number>;

export function evalExpr(e: MathExpr, c: EvalContext, depth = 0): Checked {
  if (depth > c.depthLimit) return { ok: false, code: 'DEPTH_EXCEEDED', depth };
  switch (e.kind) {
    case 'num':
      if (typeof e.value !== 'number' || !Number.isFinite(e.value))
        return { ok: false, code: 'TYPE_MISMATCH', at: 'num', expected: 'finite number', got: String(e.value) };
      return ok(e.value);
    case 'bool':
      return ok(e.value);
    case 'sym': {
      const v = c.bindings.values[e.name];
      if (v === undefined) return { ok: false, code: 'UNBOUND_SYMBOL', symbol: e.name };
      return okVal(v);
    }

    case 'add': case 'sub': case 'mul': case 'div': case 'mod': {
      const l = evalExpr(e.l, c, depth + 1);
      if (!l.ok) return l;
      const r = evalExpr(e.r, c, depth + 1);
      if (!r.ok) return r;
      if (typeof l.value !== 'number' || typeof r.value !== 'number')
        return { ok: false, code: 'TYPE_MISMATCH', at: e.kind, expected: 'number', got: typeName(l.value, r.value) };
      if ((e.kind === 'div' || e.kind === 'mod') && r.value === 0)
        return { ok: false, code: 'DIV_BY_ZERO' };
      const out = NUMOP[e.kind](l.value, r.value);
      if (!Number.isFinite(out))
        return { ok: false, code: 'TYPE_MISMATCH', at: e.kind, expected: 'finite result', got: String(out) };
      return ok(out);
    }

    case 'lt': case 'le': case 'gt': case 'ge': case 'eq': case 'ne': {
      const l = evalExpr(e.l, c, depth + 1);
      if (!l.ok) return l;
      const r = evalExpr(e.r, c, depth + 1);
      if (!r.ok) return r;
      if (typeof l.value !== 'number' || typeof r.value !== 'number')
        return { ok: false, code: 'TYPE_MISMATCH', at: e.kind, expected: 'number', got: typeName(l.value, r.value) };
      return ok(CMP[e.kind](l.value, r.value));
    }

    case 'and': case 'or': {
      // STRICT evaluation: both sides always evaluate — an error on the right is
      // NEVER hidden by a short-circuit (silent-skipped errors are the UNVERIFIED-
      // hiding class; determinism is identical, error visibility is not).
      const l = evalExpr(e.l, c, depth + 1);
      if (!l.ok) return l;
      const r = evalExpr(e.r, c, depth + 1);
      if (!r.ok) return r;
      if (typeof l.value !== 'boolean' || typeof r.value !== 'boolean')
        return { ok: false, code: 'TYPE_MISMATCH', at: e.kind, expected: 'boolean', got: typeName(l.value, r.value) };
      return ok(e.kind === 'and' ? l.value && r.value : l.value || r.value);
    }

    case 'not': {
      const v = evalExpr(e.e, c, depth + 1);
      if (!v.ok) return v;
      if (typeof v.value !== 'boolean')
        return { ok: false, code: 'TYPE_MISMATCH', at: 'not', expected: 'boolean', got: typeof v.value };
      return ok(!v.value);
    }

    case 'if': {
      const cv = evalExpr(e.c, c, depth + 1);
      if (!cv.ok) return cv;
      if (typeof cv.value !== 'boolean')
        return { ok: false, code: 'TYPE_MISMATCH', at: 'if', expected: 'boolean condition', got: typeof cv.value };
      const branch = cv.value ? evalExpr(e.t, c, depth + 1) : evalExpr(e.f, c, depth + 1);
      return branch;
    }

    case 'setLit': {
      const out = new Set<string | number>();
      for (const el of e.elems) {
        const v = evalExpr(el, c, depth + 1);
        if (!v.ok) return v;
        if (typeof v.value !== 'number' && typeof v.value !== 'string' && !(v.value instanceof Set))
          return { ok: false, code: 'TYPE_MISMATCH', at: 'setLit', expected: 'string|number', got: typeof v.value };
        if (v.value instanceof Set) {
          for (const m of v.value) out.add(m);
        } else out.add(v.value);
      }
      if (out.size > c.domainSizeLimit)
        return { ok: false, code: 'DOMAIN_UNBOUNDED', binder: '(setLit)' };
      return ok(out);
    }

    case 'card': {
      const s = evalExpr(e.set, c, depth + 1);
      if (!s.ok) return s;
      if (!(s.value instanceof Set))
        return { ok: false, code: 'TYPE_MISMATCH', at: 'card', expected: 'set', got: typeof s.value };
      return ok(s.value.size);
    }
    case 'sum': case 'max': case 'min': {
      const s = evalExpr(e.set, c, depth + 1);
      if (!s.ok) return s;
      if (!(s.value instanceof Set))
        return { ok: false, code: 'TYPE_MISMATCH', at: e.kind, expected: 'set', got: typeof s.value };
      const nums: number[] = [];
      for (const m of s.value) {
        if (typeof m !== 'number')
          return { ok: false, code: 'TYPE_MISMATCH', at: e.kind, expected: 'set of numbers', got: `set containing ${typeof m}` };
        nums.push(m);
      }
      if (e.kind === 'sum') return ok(nums.reduce((a, b) => a + b, 0));
      if (nums.length === 0)
        return { ok: false, code: 'TYPE_MISMATCH', at: e.kind, expected: 'non-empty set', got: 'empty set' };
      return ok(e.kind === 'max' ? Math.max(...nums) : Math.min(...nums));
    }

    case 'member': {
      const ev = evalExpr(e.elem, c, depth + 1);
      if (!ev.ok) return ev;
      const s = evalExpr(e.set, c, depth + 1);
      if (!s.ok) return s;
      if (typeof ev.value !== 'number' && typeof ev.value !== 'string')
        return { ok: false, code: 'TYPE_MISMATCH', at: 'member', expected: 'string|number elem', got: typeof ev.value };
      if (!(s.value instanceof Set))
        return { ok: false, code: 'TYPE_MISMATCH', at: 'member', expected: 'set', got: typeof s.value };
      return ok(s.value.has(ev.value));
    }

    case 'subset': {
      const a = evalExpr(e.sub, c, depth + 1);
      if (!a.ok) return a;
      const b = evalExpr(e.sup, c, depth + 1);
      if (!b.ok) return b;
      if (!(a.value instanceof Set) || !(b.value instanceof Set))
        return { ok: false, code: 'TYPE_MISMATCH', at: 'subset', expected: 'sets', got: typeName(a.value, b.value) };
      for (const m of a.value) if (!b.value.has(m)) return ok(false);
      return ok(true);
    }

    case 'forall': case 'exists': {
      // Q-B4: bounded-domain only. The domain must evaluate to a finite Set within
      // the size limit; an unresolvable/non-set/oversized domain is DOMAIN_UNBOUNDED.
      const d = evalExpr(e.domain, c, depth + 1);
      if (!d.ok) {
        if (d.code === 'UNBOUND_SYMBOL') return { ok: false, code: 'DOMAIN_UNBOUNDED', binder: e.binder };
        return d;
      }
      if (!(d.value instanceof Set))
        return { ok: false, code: 'DOMAIN_UNBOUNDED', binder: e.binder };
      if (d.value.size > c.domainSizeLimit)
        return { ok: false, code: 'DOMAIN_UNBOUNDED', binder: e.binder };
      let saw = false;
      for (const m of d.value) {
        const body = evalExpr(e.body, { ...c, bindings: { ...c.bindings, values: { ...c.bindings.values, [e.binder]: m } } }, depth + 1);
        if (!body.ok) return body;
        if (typeof body.value !== 'boolean')
          return { ok: false, code: 'TYPE_MISMATCH', at: e.kind, expected: 'boolean body', got: typeof body.value };
        if (e.kind === 'exists' && body.value) return ok(true);
        if (e.kind === 'forall' && !body.value) return ok(false);
        saw = true;
      }
      // empty domain: ∀ = true (vacuous), ∃ = false — and SEEN tracks non-emptiness
      return ok(e.kind === 'forall');
    }

    case 'prev': case 'eventually': case 'globally': case 'until':
      // The temporal wall (§4.2.1): carried by the grammar, NEVER point-evaluated.
      return { ok: false, code: 'TEMPORAL_NOT_EVALUABLE', at: e.kind };
  }
}

/** The strict wrapper: routes temporal results to the typed ESCALATE throw (§4.2.6). */
export function evalExprStrict(e: MathExpr, c: EvalContext): Checked {
  const r = evalExpr(e, c);
  if (!r.ok && r.code === 'TEMPORAL_NOT_EVALUABLE') throw new TemporalEscalationError(r.at);
  return r;
}

// ── evalCached (spec §4.2.2 — memoized, K21.2-safe) ──────────────────
import { canonicalJson } from './serialize';

export function evalCached(
  e: MathExpr,
  c: EvalContext,
  memo: Map<string, Checked> = new Map(),
): Checked {
  const key = canonicalJson(e) + '|' + c.bindings.profile + '|' + canonicalJson(redactValues(c.bindings.values));
  const hit = memo.get(key);
  if (hit !== undefined) return hit.ok ? { ...hit, cached: true } : hit;
  const out = evalExpr(e, c);
  memo.set(key, out);
  return out;
}

function redactValues(v: Readonly<Record<string, ScalarValue>>): Readonly<Record<string, ScalarValue>> {
  // Sets serialize canonically via canonicalJson's set handling — no redaction needed.
  return v;
}

// ── helpers ──────────────────────────────────────────────────────────
function ok(v: Val): Checked { return { ok: true, value: v, cached: false }; }
function okVal(v: ScalarValue): Checked {
  return { ok: true, value: v, cached: false };
}
function typeName(a: Val, b?: Val): string {
  const t = (v: Val) => (v instanceof Set ? 'set' : typeof v);
  return b === undefined ? t(a) : `${t(a)}|${t(b)}`;
}
const NUMOP = {
  add: (a: number, b: number) => a + b,
  sub: (a: number, b: number) => a - b,
  mul: (a: number, b: number) => a * b,
  div: (a: number, b: number) => a / b,
  mod: (a: number, b: number) => a % b,
} as const;
const CMP = {
  lt: (a: number, b: number) => a < b,
  le: (a: number, b: number) => a <= b,
  gt: (a: number, b: number) => a > b,
  ge: (a: number, b: number) => a >= b,
  eq: (a: number, b: number) => a === b,
  ne: (a: number, b: number) => a !== b,
} as const;

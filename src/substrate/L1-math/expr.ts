// src/math/expr.ts — THE CLOSED GRAMMAR (spec §4.2.1)
// Adding a member REQUIRES an evalExpr branch + an oracle binding rule + a battery
// fixture. Otherwise tsc fails (exhaustive switch). MATH_VERSION bumps on union change.

export const MATH_VERSION = 1;

export type ScalarValue = number | boolean | string | ReadonlySet<string | number>;

export type MathExpr =
  // ── literals ──────────────────────────────────────────────────────
  | { kind: 'num'; value: number }
  | { kind: 'bool'; value: boolean }
  | { kind: 'sym'; name: string } // binding reference
  // ── arithmetic ────────────────────────────────────────────────────
  | { kind: 'add' | 'sub' | 'mul' | 'div' | 'mod'; l: MathExpr; r: MathExpr }
  // ── comparisons ───────────────────────────────────────────────────
  | { kind: 'lt' | 'le' | 'gt' | 'ge' | 'eq' | 'ne'; l: MathExpr; r: MathExpr }
  // ── logic ────────────────────────────────────────────────────────
  | { kind: 'and' | 'or'; l: MathExpr; r: MathExpr }
  | { kind: 'not'; e: MathExpr }
  | { kind: 'if'; c: MathExpr; t: MathExpr; f: MathExpr }
  // ── set operations ───────────────────────────────────────────────
  | { kind: 'setLit'; elems: readonly MathExpr[] }
  | { kind: 'card' | 'sum' | 'max' | 'min'; set: MathExpr }
  | { kind: 'member'; elem: MathExpr; set: MathExpr }
  | { kind: 'subset'; sub: MathExpr; sup: MathExpr }
  // ── quantifiers (bounded-domain only; Q-B4) ──────────────────────
  | { kind: 'forall' | 'exists'; binder: string; domain: MathExpr; body: MathExpr }
  // ── the LTL trio + until (TEMPORAL: never point-evaluated) ───────
  | { kind: 'prev'; e: MathExpr }
  | { kind: 'eventually'; e: MathExpr }
  | { kind: 'globally'; e: MathExpr }
  | { kind: 'until'; l: MathExpr; r: MathExpr };

export type ExprKind = MathExpr['kind'];
export const TEMPORAL_KINDS: ReadonlySet<ExprKind> = new Set<ExprKind>([
  'prev', 'eventually', 'globally', 'until',
]);

// ── branded scalars (spec §4.2.3 — the brand law, KB-02:48) ─────────
export type Brand<T, B extends string> = T & { readonly __brand: B };
export type SlPips = Brand<number, 'SlPips'>; // ≥ 0, ≤ 500 — the canonical example
export type Rr = Brand<number, 'Rr'>; // reward:risk, > 0
export type SetupCount = Brand<number, 'SetupCount'>; // integer ≥ 0

// ── bindings ────────────────────────────────────────────────────────
export interface Bindings {
  readonly profile: string; // the D10 project profile id
  readonly values: Readonly<Record<string, ScalarValue>>;
}

// ── expression builder conveniences (spec-authoring surface) ────────
export const lit = (value: number): MathExpr => ({ kind: 'num', value });
export const bool = (value: boolean): MathExpr => ({ kind: 'bool', value });
export const ref = (name: string): MathExpr => ({ kind: 'sym', name });
export const setLit = (elems: readonly MathExpr[]): MathExpr => ({ kind: 'setLit', elems });
export const add = (l: MathExpr, r: MathExpr): MathExpr => ({ kind: 'add', l, r });
export const sub = (l: MathExpr, r: MathExpr): MathExpr => ({ kind: 'sub', l, r });
export const mul = (l: MathExpr, r: MathExpr): MathExpr => ({ kind: 'mul', l, r });
export const eq = (l: MathExpr, r: MathExpr): MathExpr => ({ kind: 'eq', l, r });
export const ne = (l: MathExpr, r: MathExpr): MathExpr => ({ kind: 'ne', l, r });
export const lt = (l: MathExpr, r: MathExpr): MathExpr => ({ kind: 'lt', l, r });
export const le = (l: MathExpr, r: MathExpr): MathExpr => ({ kind: 'le', l, r });
export const gt = (l: MathExpr, r: MathExpr): MathExpr => ({ kind: 'gt', l, r });
export const ge = (l: MathExpr, r: MathExpr): MathExpr => ({ kind: 'ge', l, r });
export const and = (l: MathExpr, r: MathExpr): MathExpr => ({ kind: 'and', l, r });
export const or = (l: MathExpr, r: MathExpr): MathExpr => ({ kind: 'or', l, r });
export const not = (e: MathExpr): MathExpr => ({ kind: 'not', e });
export const card = (set: MathExpr): MathExpr => ({ kind: 'card', set });
export const sum = (set: MathExpr): MathExpr => ({ kind: 'sum', set });
export const member = (elem: MathExpr, set: MathExpr): MathExpr => ({ kind: 'member', elem, set });
export const subset = (sub: MathExpr, sup: MathExpr): MathExpr => ({ kind: 'subset', sub, sup });
export const forall = (binder: string, domain: MathExpr, body: MathExpr): MathExpr =>
  ({ kind: 'forall', binder, domain, body });
export const exists = (binder: string, domain: MathExpr, body: MathExpr): MathExpr =>
  ({ kind: 'exists', binder, domain, body });

/** fold a binary op over a list (left-to-right) — for family builders */
export const foldAdd = (parts: readonly MathExpr[]): MathExpr =>
  parts.reduce((acc, p) => add(acc, p));
export const foldAnd = (clauses: readonly MathExpr[]): MathExpr =>
  clauses.reduce((acc, c) => and(acc, c));
export const div = (l: MathExpr, r: MathExpr): MathExpr => ({ kind: 'div', l, r });
export const mod = (l: MathExpr, r: MathExpr): MathExpr => ({ kind: 'mod', l, r });
export const max = (set: MathExpr): MathExpr => ({ kind: 'max', set });
export const min = (set: MathExpr): MathExpr => ({ kind: 'min', set });
export const ifThen = (c: MathExpr, t: MathExpr, f: MathExpr): MathExpr => ({ kind: 'if', c, t, f });
export const prev = (e: MathExpr): MathExpr => ({ kind: 'prev', e });
export const eventually = (e: MathExpr): MathExpr => ({ kind: 'eventually', e });
export const globally = (e: MathExpr): MathExpr => ({ kind: 'globally', e });
export const until = (l: MathExpr, r: MathExpr): MathExpr => ({ kind: 'until', l, r });

export const JESL_MAX_RETRIES = 2;

export type JeslCode =
  | "[JESL UNKNOWN-NODE]"
  | "[JESL CYCLE]"
  | "[JESL TIER-VIOLATION]"
  | "[JESL UNBRACKETED-GENERATION]"
  | "[JESL CAP-UNBOUND]"
  | "[JESL ORACLE-MISSING]"
  | "[JESL CHANNEL-UNSET]"
  | "[JESL NO-SEED]";
// EXACTLY 8 tokens (JESL_BIBLE D15 law — SC-5). Retry exhaustion is a VERDICT
// REASON (NodeResult.error.reason = "RETRY-EXHAUSTED"), never a refusal token:
// refusals block runs; exhaustion produces a loud FAIL result.

export interface JeslErrorFields {
  code: JeslCode;
  node: string;
  field: string;
  expected: string;
  actual: string;
  remedy: string;
}

export class JeslError extends Error {
  readonly code: JeslCode;
  readonly node: string;
  readonly field: string;
  readonly expected: string;
  readonly actual: string;
  readonly remedy: string;
  constructor(f: JeslErrorFields) {
    super(`${f.code} node=${f.node} field=${f.field} expected=${f.expected} actual=${f.actual} remedy=${f.remedy}`);
    this.name = "JeslError";
    this.code = f.code;
    this.node = f.node;
    this.field = f.field;
    this.expected = f.expected;
    this.actual = f.actual;
    this.remedy = f.remedy;
  }
}

export const JESL_TOKENS = {
  UNKNOWN_NODE: "[JESL UNKNOWN-NODE]",
  CYCLE: "[JESL CYCLE]",
  TIER_VIOLATION: "[JESL TIER-VIOLATION]",
  UNBRACKETED_GENERATION: "[JESL UNBRACKETED-GENERATION]",
  CAP_UNBOUND: "[JESL CAP-UNBOUND]",
  ORACLE_MISSING: "[JESL ORACLE-MISSING]",
  CHANNEL_UNSET: "[JESL CHANNEL-UNSET]",
  NO_SEED: "[JESL NO-SEED]",
} as const;

export function isJeslError(e: unknown): e is JeslError {
  return e instanceof JeslError;
}

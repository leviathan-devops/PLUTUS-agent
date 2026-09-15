// src/math/index.ts — the module barrel (the ONLY sanctioned import surface).
// Deep imports from outside src/math are banned (the barrel law, spec §5.4).

export type {
  MathExpr, ExprKind, ScalarValue, Bindings, Brand, SlPips, Rr, SetupCount,
} from './expr';
export {
  MATH_VERSION, TEMPORAL_KINDS,
  lit, bool, ref, setLit, add, sub, mul, div, mod, eq, ne, lt, le, gt, ge, and, or, not,
  card, sum, max, min, member, subset, forall, exists, foldAdd, foldAnd, ifThen,
  prev, eventually, globally, until,
} from './expr';

export type { Checked, EvalOk, EvalErr, EvalContext } from './eval';
export {
  evalExpr, evalExprStrict, evalCached, ctx,
  TemporalEscalationError, DEFAULT_DEPTH_LIMIT, DEFAULT_DOMAIN_SIZE_LIMIT,
} from './eval';

export type { MathContract, ContractRole, ContractStage, ContractCheckResult } from './contract';
export { ROLE_FOR_STAGE, contractId, checkContract } from './contract';

export type { OracleDeclaration } from './oracle';
export { OracleRegistry, OracleConflictError, OracleEpsilonError } from './oracle';

export type { ProvenanceAnchor } from './anchor';
export { anchorQuoteMatches } from './anchor';

export type { BrandedVerdict, DischargeBasis, BrandedResult } from './verdicts';
export { toBrandedVerdict, isDecided } from './verdicts';

export type { DerailmentFamilyId, FamilyProfile, FamilyBuildResult } from './families';
export {
  FAMILY_BUILDERS, REQUIRED_PROFILE_FIELDS, buildFamilyInvariant, foundingCaseContract,
} from './families';

export type { StructureId, StructureHelper, StructureRegistry } from './structures';
export { createStructureRegistry, registerStructures } from './structures';

export { canonicalJson, contentId, sha256Of, scalarKey } from './serialize';

// src/compiler/index.ts — the compiler barrel
export type { SpecBlock, SpecDocument } from './parser';
export { parseSpec, anchorFor, CorpusUnreadableError, CorpusEmptyError, OracleMissingError } from './parser';
export type {
  RuleCard, ClassEstimate, DeclaredMetadata, TemplateFamilyId,
} from './rule-cards';
export { extractRuleCards, validateCard, D13QuoteMismatchError } from './rule-cards';
export type { CheckContext, Finding, TemplateCheck } from './templates';
export {
  TEMPLATE_FAMILIES, ALL_TEMPLATE_CHECKS, a3ScanTemplateSources,
} from './templates';
export type { ProjectProfile, BrandDeclaration } from './bindings';
export { DEMO_PROFILE, validateProfileValue } from './bindings';
export type {
  CompiledPredicate, Battery, CalibrationFixture, CalibrationRow,
  CalibrationReport, EmittedModule,
} from './compile';
export {
  compileBattery, runBattery, calibrate, armedBattery, emitWiring,
} from './compile';

// src/enforcement/index.ts
export type { MatrixMechanism, MatrixVerdict } from './matrix';
export {
  substrateSha, verifyDistSha, verifyImportGraph, verifyMatrix,
  HookOwnershipRegistry, SubstrateDriftError,
} from './matrix';

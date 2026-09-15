// src/substrate/microstructures/index.ts — the 12 enforcement microstructures (namespaced).
// Each ms-* module is self-contained with ZERO cross-MS dependencies; the namespace
// re-export keeps the 3 known colliding names (DEFAULT_MACHINES, PbaSignal,
// ToolEvidenceRecord) from star-export shadowing. Source: Paragon_Microstructures/ms-*/.
export * as MsChainTracker from './ms-chain-tracker';
export * as MsComplianceCollector from './ms-compliance-collector';
export * as MsEscalationMemory from './ms-escalation-memory';
export * as MsEvidenceGates from './ms-evidence-gates';
export * as MsIntentClassifier from './ms-intent-classifier';
export * as MsLayerLoader from './ms-layer-loader';
export * as MsPbaBridge from './ms-pba-bridge';
export * as MsPersistence from './ms-persistence';
export * as MsRatioClassifier from './ms-ratio-classifier';
export * as MsStateMachine from './ms-state-machine';
export * as MsSynapse from './ms-synapse';
export * as MsWarheadDispatcher from './ms-warhead-dispatcher';

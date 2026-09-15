// src/substrate/index.ts — THE PARAGON SUBSTRATE public surface (the library root barrel).
// Mirrors Paragon_V1_Backend_Machinery/src/index.ts layer-for-layer; the directory names
// carry the L1-L6 layer tags (L4 lives in L4-aether/ — the shadow execution layer).
// The 12 microstructures ride namespaced (MsChainTracker, …) — see microstructures/index.ts.

// L1 THE SPEC LAYER (MPSE math)
export * from './L1-math';

// L3 THE LASME LAYER (wired substrate; includes the seed machines via L3-lasme/index.ts)
export * from './L3-lasme';

// L3' THE SEED MACHINES (also reachable as L3-lasme/machines — same declarations)
export * from './L3-lasme/machines';

// L2 THE PROJECTION COMPILER (MPSE math → LASME wiring)
export * from './L2-compiler';

// L6 THE GRAPH FOUNDATION (knowledge-graph + LOGIC-LSP)
export * from './L6-graph';

// L4 THE SHADOW EXECUTION LAYER (model assists, code is master)
export * from './L4-aether';

// L5 THE SENTINEL FLEET (guardian supervision)
export * from './L5-sentinels';

// THE SEAM (pre-flight pipeline)
export * from './preflight';

// THE HOST BINDING (OpenCode pack + ParagonHostBinding contract)
export * from './bindings';

// THE ENFORCEMENT RING (deviation-impossible matrix)
export * from './enforcement';

// THE 12 ENFORCEMENT MICROSTRUCTURES (namespaced — no star-export shadowing)
export * as Microstructures from './microstructures';

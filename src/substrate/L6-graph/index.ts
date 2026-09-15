// src/graph/index.ts — the graph barrel
export type { SqliteDriver, PreparedStatement, DriverFactory, DbClose } from './db';
export { openDb, setDriverFactory, SCHEMA_VERSION } from './db';
export type { NodeInput, EdgeInput } from './schema';
export {
  GraphStore, DDL, nodeIdOf, LineageMissingError, FindingNoTriadError,
} from './schema';
export { TEN_VERBS, CHAIN_DEPTH_BOUND, query } from './query';
export type { QueryVerb, QueryResult } from './query';
export { SemanticUnavailableError, DocsUnavailableError } from './query';
export { DiagnosticsServer, extractTouchedFile, LOGIC_LSP_BYTE_COST } from './lsp';

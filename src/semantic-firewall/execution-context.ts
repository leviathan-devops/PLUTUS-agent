/**
 * Execution Context — Context object for write-time gate enforcement.
 * Tracks current gate phase, project scope, and allowed operations.
 */

import { Logger } from '../utils/logger.js';

const log = new Logger('ExecutionContext');

export class ExecutionContext {
  currentGate: string = 'ANALYZE';
  projectRoot: string;
  allowedPaths: Set<string>;
  readonly gateToolAllowlist: Map<string, Set<string>>;
  private _semanticFirewall: unknown = null;
  private _merkleChain: unknown = null;
  private _hookRegistry: unknown = null;
  private _agent: string = '';
  private _editHistory: Map<string, string[]> = new Map();

  constructor(projectRoot?: string) {
    // Empty string falls through to process.cwd() (consistent with the
    // PLUTUS_PROJECT_ROOT env / cwd fallback the hooks rely on).
    this.projectRoot = projectRoot && projectRoot.length > 0
      ? projectRoot
      : process.cwd();
    this.allowedPaths = new Set([this.projectRoot]);
    this.gateToolAllowlist = new Map([
      ['ANALYZE', new Set(['read', 'glob', 'grep', 'list', 'search', 'bash', 'terminal'])],
      ['VERIFY_ZONES', new Set(['read', 'glob', 'grep'])],
      ['PREDICT', new Set(['read', 'glob', 'grep', 'timesfm'])],
      ['SCORE', new Set(['read', 'glob', 'grep', 'bash', 'terminal'])],
      ['VALIDATE', new Set(['read', 'glob', 'grep', 'bash', 'terminal'])],
      ['EXECUTE', new Set(['read', 'write', 'edit', 'bash', 'terminal', 'plutus-execute'])],
      ['AUDIT', new Set(['read', 'glob', 'grep', 'audit', 'bash', 'terminal'])],
      ['PLAN', new Set(['read', 'glob', 'grep', 'list', 'search'])],
      ['BUILD', new Set(['read', 'write', 'edit', 'bash', 'terminal'])],
      ['TEST', new Set(['read', 'bash', 'terminal', 'test', 'plutus-test-runner'])],
      ['VERIFY', new Set(['read', 'glob', 'grep', 'audit', 'review'])],
      ['DELIVERY', new Set(['read', 'deliver', 'ship', 'deploy', 'verify'])],
    ]);
  }

  setGate(gate: string): void {
    this.currentGate = gate.toUpperCase();
    log.info(`Execution context gate → ${this.currentGate}`);
  }

  isPlutusProjectFile(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, '/');
    return normalized.startsWith(this.projectRoot.replace(/\\/g, '/'));
  }

  isOperationAllowedForGate(toolName: string, _filePath?: string): boolean {
    const allowed = this.gateToolAllowlist.get(this.currentGate);
    if (!allowed) return true; // No restrictions for unknown gates
    return allowed.has(toolName.toLowerCase()) || allowed.has(toolName);
  }

  setSemanticFirewall(sf: unknown): void {
    this._semanticFirewall = sf;
  }

  setMerkleChain(mc: unknown): void {
    this._merkleChain = mc;
  }

  setHookRegistry(hr: unknown): void {
    this._hookRegistry = hr;
  }

  setAgent(agent: string): void {
    this._agent = agent;
    log.info(`ExecutionContext agent → ${agent}`);
  }

  recordEdit(toolName: string, filePath: string): void {
    // Only mutating operations (edit/write) count as edits that justify a
    // subsequent build. Read-only operations like bash/grep are ignored.
    const tool = toolName.toLowerCase();
    if (tool !== 'edit' && tool !== 'write') return;
    const edits = this._editHistory.get(filePath) ?? [];
    edits.push(`${toolName}@${Date.now()}`);
    this._editHistory.set(filePath, edits);
    log.debug(`Edit recorded: ${toolName} → ${filePath}`);
  }

  /** Whether any recent edit/write has been recorded. */
  hasRecentEdit(): boolean {
    for (const edits of this._editHistory.values()) {
      if (edits.length > 0) return true;
    }
    return false;
  }

  /** Project root this context is scoped to. */
  getProjectRoot(): string {
    return this.projectRoot;
  }

  /** Currently bound agent name (set via setAgent). */
  getAgent(): string {
    return this._agent;
  }
}

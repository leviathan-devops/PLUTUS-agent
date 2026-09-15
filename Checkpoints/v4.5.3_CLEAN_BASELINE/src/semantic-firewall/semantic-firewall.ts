/**
 * Semantic Firewall (Code Analysis) — Write-time and post-write enforcement.
 *
 * DIFFERENT from the trading guardrail firewall in semantic-firewall/index.ts.
 * That firewall checks trade setups. This firewall checks CODE being written.
 *
 * Bible section 1: Uses Analysis Orders 0-5 for semantic code analysis.
 * Bible section 2: Pre-write enforcement (blocks bad code before disk).
 */

import { Logger } from '../utils/logger.js';
import { AnalysisOrderDispatcher, type AnalysisResult, type AnalysisFinding } from '../v1-compat.js';
import type { RuleConfig, AnalysisPhase } from './types.js';

const log = new Logger('SemanticFirewall');

export class StructuredBlockError extends Error {
  readonly level: string;
  readonly lobe: string;
  readonly findingId: string;
  readonly correction?: string;

  constructor(opts: {
    level: string;
    lobe: string;
    findingId: string;
    message: string;
    correction?: string;
  }) {
    super(opts.message);
    this.name = 'StructuredBlockError';
    this.level = opts.level;
    this.lobe = opts.lobe;
    this.findingId = opts.findingId;
    this.correction = opts.correction;
  }
}

export class SemanticFirewall {
  private dispatcher: AnalysisOrderDispatcher;
  private rules: Map<string, RuleConfig> = new Map();
  private enabled: boolean = true;

  constructor(dispatcher?: AnalysisOrderDispatcher) {
    this.dispatcher = dispatcher ?? new AnalysisOrderDispatcher();
    this.registerBuiltinRules();
    log.info('Semantic Firewall initialized with code analysis rules');
  }

  private registerBuiltinRules(): void {
    const builtins: RuleConfig[] = [
      { name: 'no-empty-catch', severity: 'HIGH', enabled: true, orders: 2 },
      { name: 'no-unsafe-cast', severity: 'HIGH', enabled: true, orders: 3 },
      { name: 'no-floating-promises', severity: 'MEDIUM', enabled: true, orders: 4 },
      { name: 'evidence-bearing-results', severity: 'HIGH', enabled: true, orders: 2 },
      { name: 'no-hardcoded-paths', severity: 'MEDIUM', enabled: true, orders: 2 },
      { name: 'cleanup-paired-intervals', severity: 'HIGH', enabled: true, orders: 2 },
      { name: 'handle-zero-length', severity: 'LOW', enabled: true, orders: 2 },
      { name: 'dead-export', severity: 'MEDIUM', enabled: true, orders: 3 },
      { name: 'scope-violation', severity: 'HIGH', enabled: true, orders: 5 },
      { name: 'no-theatrical-return', severity: 'MEDIUM', enabled: true, orders: 2 },
      { name: 'no-empty-handler', severity: 'HIGH', enabled: true, orders: 2 },
    ];

    for (const rule of builtins) {
      this.rules.set(rule.name, rule);
    }

    for (const rule of builtins) {
      this.dispatcher.registerRule({
        name: rule.name,
        order: rule.orders as 0 | 1 | 2 | 3 | 4 | 5,
        severity: rule.severity,
        enabled: rule.enabled,
        check: (content: string) => this.runRuleCheck(rule.name, content),
      });
    }
  }

  private runRuleCheck(ruleName: string, content: string): AnalysisFinding | null {
    switch (ruleName) {
      case 'no-empty-catch': {
        if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(content)) {
          return { order: 2, rule: ruleName, severity: 'HIGH', message: 'Empty catch block detected' };
        }
        break;
      }
      case 'no-theatrical-return': {
        if (/return\s+(?:null|undefined|\[\]|\{\})\s*;?\s*\/\/.*(todo|fixme)/i.test(content)) {
          return { order: 2, rule: ruleName, severity: 'MEDIUM', message: 'Theatrical return with TODO comment' };
        }
        break;
      }
      case 'no-empty-handler': {
        if (/=>\s*\{\s*\}/.test(content) && !/=>\s*\{\s*\/\//.test(content)) {
          return { order: 2, rule: ruleName, severity: 'HIGH', message: 'Empty handler function' };
        }
        break;
      }
      case 'evidence-bearing-results': {
        if (/Result\.err\(.*(not.yet|coming.soon|later)/i.test(content)) {
          return { order: 2, rule: ruleName, severity: 'HIGH', message: 'Non-evidence-bearing error result' };
        }
        break;
      }
      case 'cleanup-paired-intervals': {
        if (/setInterval\(/.test(content) && !/clearInterval\(/.test(content)) {
          return { order: 2, rule: ruleName, severity: 'HIGH', message: 'setInterval without clearInterval' };
        }
        break;
      }
      case 'no-unsafe-cast': {
        // Detect `as any` and `as unknown as` casts
        if (/\bas\s+any\b/.test(content) || /\bas\s+unknown\s+as\b/.test(content)) {
          return { order: 2, rule: ruleName, severity: 'HIGH', message: 'Unsafe type cast detected — use proper type guards' };
        }
        break;
      }
      case 'no-floating-promises': {
        // Detect function calls that return promises without await/.then/catch
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // Skip comments and type imports
          if (/^\s*(\/\/|\/\*|\*)/.test(line)) continue;
          // Check for async function call without await
          if (/\basync\b/.test(line) && /\w+\(.*\)/.test(line) && !/\bawait\b/.test(line) && !/async\s+function/.test(line) && !/async\s*\(/.test(line) && !/\breturn\b/.test(line)) {
            // Only flag if it looks like a bare async call
            if (/^\s*\w+\.\w+\(.*\).*$/.test(line) && !/await|\.then|\.catch|\.finally|void/.test(line)) {
              return { order: 4, rule: ruleName, severity: 'MEDIUM', message: `Possible floating promise at line ${i + 1}` };
            }
          }
        }
        break;
      }
      case 'no-hardcoded-paths': {
        // Detect absolute paths that should be configurable
        if (/['"]\/(?:home|Users|root|tmp|var|opt|etc)\//.test(content) && !/process\.env/.test(content.slice(Math.max(0, content.indexOf('/home') - 100), content.indexOf('/home') + 100))) {
          return { order: 2, rule: ruleName, severity: 'MEDIUM', message: 'Hardcoded filesystem path — use config or process.env' };
        }
        break;
      }
      case 'handle-zero-length': {
        // Detect array access without length check in risk paths
        if (/\[0\]/.test(content) && !/\.length\s*[>!?]/.test(content) && !/if\s*\(.+length/.test(content)) {
          // Only flag if in a function that handles arrays
          if (/function|=>|method/.test(content.slice(0, 200))) {
            return { order: 2, rule: ruleName, severity: 'LOW', message: 'Array index access without length check' };
          }
        }
        break;
      }
      case 'dead-export': {
        // Detect exported functions/types that are never imported elsewhere
        // Order 3 check — would need cross-file analysis for full implementation
        // At minimum, flag exports with empty bodies
        if (/export\s+(?:async\s+)?function\s+\w+\s*\([^)]*\)\s*(?::\s*\S+)?\s*\{\s*\}/.test(content)) {
          return { order: 3, rule: ruleName, severity: 'MEDIUM', message: 'Exported function with empty body' };
        }
        break;
      }
      case 'scope-violation': {
        // Detect writes outside project directory
        if (/writeFileSync\s*\(\s*['"]\/(?!tmp|root|home)/.test(content) || /mkdirSync\s*\(\s*['"]\/(?!tmp|root|home)/.test(content)) {
          return { order: 5, rule: ruleName, severity: 'HIGH', message: 'Filesystem write outside project scope' };
        }
        break;
      }
    }
    return null;
  }

  analyze(content: string, phaseOrRules?: AnalysisPhase | RuleConfig[]): AnalysisResult {
    if (!this.enabled) {
      return { findings: [], diagnostics: [], passed: true, ordersRun: [0] };
    }
    const context: Record<string, unknown> = {};
    if (phaseOrRules) {
      if (typeof phaseOrRules === 'string') {
        context.phase = phaseOrRules;
      } else if (Array.isArray(phaseOrRules)) {
        context.phase = content;
        // Register provided rules temporarily for this analysis
        for (const rule of phaseOrRules) {
          if (!this.rules.has(rule.name)) {
            this.dispatcher.registerRule({
              name: rule.name,
              order: rule.orders as 0 | 1 | 2 | 3 | 4 | 5,
              severity: rule.severity,
              enabled: rule.enabled,
              check: (c: string) => this.runRuleCheck(rule.name, c),
            });
          }
        }
      }
    }
    const result = this.dispatcher.analyze(content, context);
    return { ...result, diagnostics: result.findings };
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Extract code content from tool args/output across multiple property names.
   * Handles write (content), edit (newString/oldString), bash (command), and patch formats.
   */
  private extractContent(args: unknown): string {
    if (!args || typeof args !== 'object') return '';
    const rec = args as Record<string, unknown>;
    return String(
      rec.content ?? rec.newString ?? rec.command ?? rec.code ??
      rec.text ?? rec.source ?? rec.patch ?? ''
    );
  }

  setGate(gate: string): void {
    log.info(`SemanticFirewall gate → ${gate}`);
  }

  async evaluateBefore(toolName: string, args: unknown): Promise<Array<{ allowed: boolean; level: string; message: string; rule: string; severity: string; lobe: string; findingId: string; correction?: string }>> {
    const content = this.extractContent(args);
    const result = this.analyze(content);
    return result.findings.map((f: AnalysisFinding) => ({
      allowed: f.severity !== 'CRITICAL' && f.severity !== 'HIGH',
      level: f.severity,
      message: f.message,
      rule: f.rule,
      severity: f.severity,
      lobe: 'semantic-firewall',
      findingId: `SF-${f.rule.toUpperCase()}`,
    }));
  }

  async evaluateAfter(toolName: string, args: unknown, output?: unknown): Promise<Array<{ allowed: boolean; level: string; message: string; rule: string; severity: string; lobe: string; findingId: string; correction?: string }>> {
    const content = this.extractContent(args) || this.extractContent(output);
    const result = this.analyze(content);
    return result.findings.map((f: AnalysisFinding) => ({
      allowed: f.severity !== 'CRITICAL' && f.severity !== 'HIGH',
      level: f.severity,
      message: f.message,
      rule: f.rule,
      severity: f.severity,
      lobe: 'semantic-firewall',
      findingId: `SF-${f.rule.toUpperCase()}`,
    }));
  }

  fireContextUpdate(key: string, value: unknown): void {
    log.debug(`fireContextUpdate: ${key}`);
  }

  setAnalysisDispatcher(dispatcher: AnalysisOrderDispatcher): void {
    this.dispatcher = dispatcher;
    log.info('AnalysisOrderDispatcher wired into SemanticFirewall');
  }

  getRuleCount(): number {
    return this.rules.size;
  }

  isRuleEnabled(name: string): boolean {
    const rule = this.rules.get(name);
    return rule?.enabled ?? false;
  }
}

export type EnforcementBrain = SemanticFirewall;

export { AnalysisOrderDispatcher };

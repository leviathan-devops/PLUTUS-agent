/**
 * Semantic Firewall Types — Rule configuration and analysis phases for code analysis.
 * (Separate from the trading guardrail types in types.ts)
 */

export type AnalysisPhase =
  | 'pre-write'
  | 'post-write'
  | 'pre-execute'
  | 'post-execute'
  | 'gate-transition'
  | 'compaction';

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface RuleConfig {
  name: string;
  severity: Severity;
  enabled: boolean;
  orders: number;  // Analysis order (0-5)
}

export interface EnforcementResult {
  allowed: boolean;
  level: Severity;
  message: string;
  findings: Array<{
    rule: string;
    severity: Severity;
    message: string;
  }>;
  phase: AnalysisPhase;
}

export type GatePhase =
  | 'analyze'
  | 'verify_zones'
  | 'predict'
  | 'score'
  | 'validate'
  | 'execute'
  | 'audit'
  | 'plan'
  | 'build'
  | 'test'
  | 'verify'
  | 'delivery';

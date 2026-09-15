// src/bindings/opencode/tools.ts + init — the 4 tools + the binding assembly
import type { HostToolRegistration } from '../contract';
import type { LasmeEngine } from '../../L3-lasme';
import type { ClaimGate } from '../../L3-lasme/machines';
import { projectStatus, type ProjectionReport } from '../../preflight';

export interface ToolDeps {
  readonly engine: LasmeEngine;
  readonly claimGate: ClaimGate;
  readonly workspaceRoot: string;
  readonly runAudit?: (scope: string) => { findings: number; artifact: string };
  readonly runProjection?: (specPath: string, targetPath: string) => ProjectionReport;
  readonly graphQuery?: (verb: string, q: Record<string, unknown>) => unknown;
}

/** The four tool registrations — every tool returns the structured, grep-verifiable record. */
export function registerTools(deps: ToolDeps): readonly HostToolRegistration[] {
  return [
    {
      name: 'paragon-status',
      description: 'PARAGON substrate state: engine machines, arms, lexicon members, battery version (grep-verifiable)',
      args: {},
      handler: () => {
        const status = deps.engine.statusReport();
        const proj = projectStatus(deps.workspaceRoot);
        return {
          paragon: 'online' as const,
          machines: status.machines,
          arms: status.arms,
          members: status.members,
          seamWired: status.seamWired,
          verdictRouterWired: status.verdictRouterWired,
          projection: proj,
        };
      },
    },
    {
      name: 'paragon-audit',
      description: 'Run the compiled battery against a scope; findings carry EVIDENCE TRIADs',
      args: { scope: 'string (file or dir, required)' },
      handler: (args) => {
        const scope = String(args['scope'] ?? '');
        if (scope.trim() === '') return { error: 'ARGUMENT_VALIDATION_FAILED', detail: 'scope is required' };
        if (deps.runAudit === undefined) return { error: 'AUDIT_UNWIRED', detail: 'the battery runner is not wired in this host' };
        return deps.runAudit(scope);
      },
    },
    {
      name: 'paragon-query',
      description: 'The 10-verb knowledge-graph query surface (typed empties, named errors)',
      args: { verb: 'string', q: 'object' },
      handler: (args) => {
        const verb = String(args['verb'] ?? '');
        if (deps.graphQuery === undefined) return { error: 'QUERY_UNWIRED', detail: 'the graph is not wired in this host' };
        try {
          return deps.graphQuery(verb, (args['q'] as Record<string, unknown>) ?? {});
        } catch (e) {
          return { error: String((e as Error).message) };
        }
      },
    },
    {
      name: 'paragon-project',
      description: 'Pre-flight: compile + project the substrate into a target workspace',
      args: { specPath: 'string', targetPath: 'string', profileId: 'string' },
      handler: (args) => {
        const specPath = String(args['specPath'] ?? '');
        if (specPath.trim() === '') return { error: 'ARGUMENT_VALIDATION_FAILED', detail: 'specPath is required' };
        if (deps.runProjection === undefined) return { error: 'PROJECTION_UNWIRED', detail: 'the pipeline is not wired in this host' };
        return deps.runProjection(specPath, String(args['targetPath'] ?? deps.workspaceRoot));
      },
    },
  ];
}

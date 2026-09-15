/**
 * PLUTUS AGENT v4.0 — Autonomous 3-Engine Trading Intelligence
 *
 * Architecture:
 *   - 4 hooks: system.transform (identity + TVI guidance), tool.execute.before
 *     (allowlist + VEB pre-action gates), tool.execute.after (manual-step
 *     injection + VEB post-action gates/recorders), chat.message (session
 *     tracking), compacting (context survival)
 *   - config hook: registers agent with proper instructions
 *   - 5-tool pipeline chain + omni-vision + status + tv_ MCP tools
 *   - TVI subsystem (V4.3): VKG (106 nodes) + VCM + VST + VGS + VEB + orchestrator
 *
 * CRITICAL: Tool creation is wrapped in try-catch. If any
 * component fails to initialize, the hooks STILL register so identity
 * injection works. The specific tool that failed will error when called.
 */

import type { PluginInput, Hooks } from '@opencode-ai/plugin';
import { Logger } from './utils/logger.js';
import { setIdentityBaseDir } from './identity/index.js';
import { isPlutusAgent } from './identity/agent-identity.js';
import { createSystemTransformHook } from './hooks/system-transform.js';
import { createToolBeforeHook } from './hooks/tool-allowlist.js';
import { createChatMessageHook } from './hooks/chat-message.js';
import { createCompactingHook } from './hooks/compacting.js';
import { getAgentConfigs } from './agents/definitions.js';
import { plutusOmniVisionTool } from './tools/plutus-omni-vision.js';
import { createToolAfterHook } from './hooks/tool-after.js';
import { vkgNodes } from './tvi/vkg/nodes.js';
import { createVCM } from './tvi/vcm.js';
import { VisualStateTracker, DEFAULT_VST_DB_PATH } from './tvi/vst.js';
import { VisualGuidanceSystem } from './tvi/vgs.js';
import { VisualEnforcementBrain } from './tvi/veb.js';
import { TVIOrchestrator } from './tvi/orchestrator.js';
import type { AgentState, TVIFinding } from './tvi/types.js';
import { createVeiHooks } from './vei/wire.js';
import { tradingViewProfile } from './vei/profiles/tradingview.js';

const log = new Logger('PlutusAgent');

// ── VEI micro-harness (V4.4) — the HANDS of the triad ──
// Observe+guide only: watches GUI tool calls, knows environment ground truth,
// injects corrective guidance. Zero LLM, zero pipeline mutation, fail-silent-off.
// getPipelineContext is a forward hook (MDVE lands later): v4.4.0 observes the
// temporal anchor + scaffoldLadders from the tool stream itself (read-only).
const vei = createVeiHooks(tradingViewProfile, () => ({}), (msg) => log.info(msg));

// ── TVI subsystem handle (V4.3) ──
// Initialized ONCE at plugin load (same scope as setSdkClient/setIdentityBaseDir).
// null when initialization failed — hooks then pass through without TVI
// enforcement so identity injection and the pipeline still work.
interface TVISubsystem {
  vst: VisualStateTracker;
  vcm: ReturnType<typeof createVCM>;
  vgs: VisualGuidanceSystem;
  veb: VisualEnforcementBrain;
  orchestrator: TVIOrchestrator;
}

/**
 * Build the AgentState snapshot for VCM matching on the current context.
 * Session-scoped state (screenshots read, zones drawn) is tracked by the
 * VEB/VST as tools execute; this snapshot provides the baseline context
 * for guidance synthesis on system.transform.
 */
function buildTviAgentState(tvi: TVISubsystem): AgentState {
  return {
    task: 'zone_identification',
    pair: '',
    timeframe: '4H',
    spot: 0,
    zonesDrawn: 0,
    screenshotsRead: [],
    agentHasReadScreenshot: tvi.vst.getImageReadCount('') > 0,
    currentShape: '',
    dayShape: '',
  };
}

export default async function PlutusAgent(input: PluginInput): Promise<Hooks> {
  // ── Cross-plugin isolation guard ──
  const runtimeAgent = (input as any)?.session?.agentName
    ?? (input as any)?.agent
    ?? '';
  if (runtimeAgent && !isPlutusAgent(runtimeAgent)) {
    log.info(`Skipping initialization — agent "${runtimeAgent}" is not a Plutus agent.`);
    return {} as Hooks;
  }

  log.info('PLUTUS AGENT v3.0 — Autonomous 3-Engine Trading Intelligence initializing...');

  // ── Set identity base directory ──
  setIdentityBaseDir('/root/.config/opencode/plugins/plutus-agent/identity');

  // ── TVI SUBSYSTEM (V4.3) — initialize ONCE at plugin load ──
  // Wrapped in try-catch per the file's resilience doctrine: if TVI fails
  // to initialize, hooks STILL register (identity injection must survive);
  // the pipeline then runs without TVI enforcement.
  let tvi: TVISubsystem | null = null;
  try {
    const vst = new VisualStateTracker(DEFAULT_VST_DB_PATH); // src/tvi/state/tvi-state.db (VST creates the dir)
    const vcm = createVCM(vkgNodes);
    const vgs = new VisualGuidanceSystem();
    const veb = new VisualEnforcementBrain({ vcm, vst, vgs });
    const orchestrator = new TVIOrchestrator();
    tvi = { vst, vcm, vgs, veb, orchestrator };
    log.info(`PLUTUS AGENT v4.3 — TVI initialized (${vkgNodes.length} VKG nodes, VEB armed, DB: ${DEFAULT_VST_DB_PATH}).`);
  } catch (e) {
    log.info(`PLUTUS AGENT v4.3 — TVI initialization failed (pipeline continues without TVI): ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── Create tools — wrapped in try-catch so hook registration survives ──
  // If playwright-core or any data client fails, hooks STILL register.
  // The identity system MUST work even if tools fail to initialize.
  let tools: Record<string, any> = {};
  try {
    // Dynamic import to prevent playwright-core from crashing module load
    const { createPlutusTools } = await import('./tools/plutus-tools.js');
    tools = createPlutusTools(input);

    // ── PLUTUS 4.0: Register the 5-tool mechanical chain ──
    const { createPipeline4Tools, setSdkClient } = await import('./pipeline/engine.js');
    setSdkClient(input.client); // Bridge SDK client for VLM analysis (agent IS the VLM)
    const pipeline4Tools = createPipeline4Tools();
    tools = { ...tools, ...pipeline4Tools };

    // ── Register omni-vision tool for VLM analysis ──
    tools['plutus-omni-vision'] = plutusOmniVisionTool;

    log.info(`PLUTUS AGENT v4.0 — ${Object.keys(tools).length} tools registered (${Object.keys(pipeline4Tools).length} pipeline-4.0 tools)${tvi ? ` + TVI (${vkgNodes.length} nodes, VEB armed)` : ''}.`);
  } catch (e) {
    log.info(`PLUTUS AGENT v4.0 — Tool initialization failed (hooks will still register): ${e instanceof Error ? e.message : String(e)}`);
    // Provide fallback tools that return error messages
    const { tool } = await import('@opencode-ai/plugin');
    tools = {
      'plutus-pipeline-harvest': tool({
        description: 'Start the 5-tool pipeline. Tool initialization failed — check plugin logs.',
        args: {},
        async execute() {
          return { output: 'ERROR: Pipeline failed to initialize. Check plugin logs for details.' };
        },
      }),
      'plutus-status': tool({
        description: 'Engine diagnostics.',
        args: {},
        async execute() {
          return { output: JSON.stringify({ status: 'degraded', error: 'Tool initialization failed' }) };
        },
      }),
    };
  }

  log.info('PLUTUS AGENT v3.0 ready — hooks registering (identity, allowlist, compacting, config).');

  // ── Compose hooks: existing behavior FIRST, TVI enforcement alongside (spec §5.3) ──
  const baseSystemTransform = createSystemTransformHook();
  const baseToolBefore = createToolBeforeHook();
  const baseToolAfter = createToolAfterHook();

  return {
    tool: tools,
    'experimental.chat.system.transform': async (input, output) => {
      // Existing identity injection (CLEAR+REBUILD) runs first.
      await baseSystemTransform?.(input, output);

      // TVI guidance appends AFTER identity (spec §5.3 + §8.3 single gateway).
      const systemOut = output as { system?: string[] };
      if (tvi && systemOut && Array.isArray(systemOut.system)) {
        try {
          const matched = tvi.vcm.match(buildTviAgentState(tvi));
          const findings: TVIFinding[] = matched.map((m) => ({
            priority: m.node.priority,
            bullet: m.node.bullet,
            gate: m.node.id,
            reason: `VKG node ${m.node.id} matched current context (score ${m.score})`,
          }));
          const guidance = tvi.orchestrator.synthesize(findings);
          if (guidance) systemOut.system.push(guidance);
        } catch (e) {
          log.info(`[TVI] guidance synthesis failed (non-fatal): ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      // VEI L3 sitrep injection (spec §10 messages.transform): a pending
      // sitrep block rides the next inference as system context.
      if (systemOut && Array.isArray(systemOut.system)) {
        try {
          const sitrep = vei.onMessagesTransform((input as any)?.sessionID as string | undefined);
          if (sitrep) systemOut.system.push(sitrep);
        } catch (e) {
          log.info(`[VEI] sitrep injection failed (non-fatal): ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    },
    'tool.execute.before': async (input, output) => {
      // Existing allowlist + browser firewall runs first.
      await baseToolBefore?.(input, output);

      // VEB pre-action gates (spec §5.3) — the VEB throws on block.
      //
      // HOOK CONTRACT (verified against opencode 1.14.43 binary): the BEFORE
      // trigger is `trigger("tool.execute.before", {tool, sessionID, callID}, {args})`
      // — the tool args live in the OUTPUT parameter, NOT the input. The input
      // has only {tool, sessionID, callID}. Reading input.args yields undefined
      // (7 container iterations of "MINIMUM_ZONES: 0/3 … Saw: ." traced to this).
      if (tvi && ((input as any)?.tool as string) === 'plutus-pipeline-setups') {
        await tvi.veb.preActionGates(
          ((output as any)?.args ?? (input as any)?.args ?? input) as Record<string, unknown>,
          'plutus-pipeline-setups',
        );
      }

      // VEI intent recording (spec §10) — runs AFTER the TVI VEB before-hook
      // gates. Same K-contract arg chain as index.ts:189 above. Observe-only:
      // never throws, never blocks (fail-silent-off, §12 law 6).
      try {
        vei.onToolBefore(
          ((input as any)?.tool as string) || '',
          ((output as any)?.args ?? (input as any)?.args ?? input) as unknown,
          ((input as any)?.sessionID as string) || 'unknown',
        );
      } catch (e) {
        log.info(`[VEI] before-hook failed (non-fatal): ${e instanceof Error ? e.message : String(e)}`);
      }
    },
    'tool.execute.after': async (input, output) => {
      const toolName = ((input as any)?.tool as string) || '';

      // VEI outcome recording + guidance (spec §10) — runs BEFORE the
      // tool.after Manual Step pushes so corrective intelligence lands first.
      // Args live in input per the binary evidence for the AFTER trigger.
      try {
        const guidance = vei.onToolAfter(
          toolName,
          ((input as any)?.args ?? (output as any)?.args ?? {}) as unknown,
          output,
          ((input as any)?.sessionID as string) || 'unknown',
        );
        if (guidance && typeof (output as any)?.output === 'string') {
          (output as any).output += guidance;
        }
      } catch (e) {
        log.info(`[VEI] after-hook failed (non-fatal): ${e instanceof Error ? e.message : String(e)}`);
      }

      // Existing omni-vision chain + manual-step injection runs next.
      await baseToolAfter?.(input, output);

      // VEB post-action gates + recorders (spec §5.3).
      if (!tvi) return;
      if (toolName === 'plutus-pipeline-setups') {
        await tvi.veb.postActionGates(input, output);
      }
      if (toolName === 'plutus-pipeline-charts') {
        await tvi.veb.recordScreenshots(input, output);
      }
      if (toolName === 'read') {
        await tvi.veb.recordImageRead(input, output);
      }
    },
    'chat.message': createChatMessageHook(),
    'experimental.session.compacting': createCompactingHook(),
    config: async (opencodeConfig: Record<string, any>) => {
      const agentConfigs = getAgentConfigs();
      if (!opencodeConfig.agent) {
        opencodeConfig.agent = {};
      }
      for (const [agentId, config] of Object.entries(agentConfigs)) {
        opencodeConfig.agent[agentId] = {
          name: config.name,
          description: config.description,
          instructions: config.instructions,
          mode: config.mode,
          color: config.color,
          permission: config.permission,
        };
      }
      log.info(`PLUTUS AGENT v3.0 — registered ${Object.keys(agentConfigs).length} agent(s) via config hook.`);
    },
  } as Hooks;
}

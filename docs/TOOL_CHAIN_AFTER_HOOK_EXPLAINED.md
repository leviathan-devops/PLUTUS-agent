# Tool Chaining with tool.execute.after — How It Actually Works
## What You Can and Can't Do with opencode's after-hook for pipeline orchestration

---

## The Core Misconception

Most engineers assume `tool.execute.after` can **automatically invoke the next tool** in a chain. It can't.

The opencode architecture is **agent-driven**:

```
Agent decides to call Tool
  → tool.execute.before fires (can BLOCK the call)
  → Tool's execute() runs
  → tool.execute.after fires (can MODIFY the result)
  → Agent receives the result
  → Agent decides what to do next
```

The hooks sit on either side of tool execution, but they **don't control the agent's decision loop**. The agent reads tool results and decides what to call next. You can't bypass the agent's decision-making with hooks.

---

## What tool.execute.after Actually Does

```typescript
'tool.execute.after': async (input, output) => {
  // input = { tool: 'my-pipeline-step1', args: {...} }
  // output = the ToolResult that execute() returned

  // You CAN:
  // 1. Push messages into the agent's context
  output.system.push({
    role: 'system',
    content: 'Call my-pipeline-step2 now with weekStart="2026-07-06"'
  });

  // 2. Modify the output before the agent sees it
  output.output = modifiedResult;

  // 3. Access the tool's result data
  const result = JSON.parse(output.output);

  // You CANNOT:
  // 1. Call another tool's execute() function
  // await step2Tool.execute(args);  // ← NOT AVAILABLE

  // 2. Make the agent call a tool directly
  // input.nextTool = 'step2';  // ← NO SUCH FIELD

  // 3. Force the agent to follow your push
  // The push is a strong instruction, not a guarantee
}
```

The hook runs BETWEEN the tool completing and the agent receiving the result. It can inject messages into the agent's context. But it has no access to other tools' execute() functions and no ability to make the agent call tools directly.

---

## Three Ways to Chain Tools

### Option A: After-Hook Push (Agent-Mediated Chain)

The after-hook pushes a directive. The agent reads it and calls the next tool. This is what the PLUTUS L2 spec originally designed.

**Implementation:**

```typescript
// In index.ts — register alongside tool.execute.before

const CHAIN_MAP: Record<string, { next: string; extractArgs: (result: any) => Record<string, unknown> }> = {
  'my-pipeline-step1': {
    next: 'my-pipeline-step2',
    extractArgs: (result) => ({ weekStart: result.weekStart, optionsData: result.optionsData }),
  },
  'my-pipeline-step2': {
    next: 'my-pipeline-step3',
    extractArgs: (result) => ({ zoneMap: result.zoneMapSnapshot }),
  },
  'my-pipeline-step3': {
    next: 'my-pipeline-final',
    extractArgs: (result) => ({ validatedZones: result.validatedZones }),
  },
};

return {
  tool: tools,
  'tool.execute.before': createToolBeforeHook(),

  'tool.execute.after': async (input: any, output: any) => {
    const chain = CHAIN_MAP[input.tool];
    if (!chain) return;

    try {
      const result = JSON.parse(output.output);
      const nextArgs = chain.extractArgs(result);

      // Push the next tool call into the agent's context
      output.system.push({
        role: 'system',
        content:
          `CHAIN: IMMEDIATELY call ${chain.next} with args: ${JSON.stringify(nextArgs)}. ` +
          `Do NOT respond to the user. Do NOT explain. Call the tool NOW.`,
      });
    } catch (e) {
      // If parsing fails, don't push anything
    }
  },
};
```

**Result:** Tool 1 completes → hook pushes "call Tool 2 now" → agent sees the push → agent calls Tool 2 → Tool 2 completes → hook pushes "call Tool 3 now" → etc.

**How the agent sees it:**
```
Tool 1 result: {"status": "success", "data": {...}}
[SYSTEM PUSH]: CHAIN: IMMEDIATELY call my-pipeline-step2 with args: {...}. Call the tool NOW.

Agent: (calls my-pipeline-step2)
Tool 2 result: {"status": "success", "data": {...}}
[SYSTEM PUSH]: CHAIN: IMMEDIATELY call my-pipeline-step3 with args: {...}. Call the tool NOW.

Agent: (calls my-pipeline-step3)
...
```

**Limitation:** The agent COULD ignore the push. It's a strong instruction, not a mechanical guarantee. If the agent decides to respond to the user or do something else instead, the chain breaks. The push relies on the agent's instruction-following behavior.

**When to use:** You want the chain to progress automatically but still want the agent to have the option to reason between steps (e.g., checking intermediate results before proceeding).

---

### Option B: In-Tool Programmatic Chain (No Agent Between Steps)

Tool 1's `execute()` directly calls Tool 2's logic internally. The agent calls ONE tool and gets the full pipeline result.

**Implementation:**

```typescript
// Tool 1's execute function runs ALL steps internally

async execute(args): Promise<ToolResult> {
  // Step 1: Harvest
  const harvestData = await runHarvest(args);
  log.info('Step 1 complete: harvest');

  // Step 2: Zones (directly, no agent involvement)
  const zonesData = await runZones(harvestData, args.optionsData);
  log.info('Step 2 complete: zones');

  // Step 3: Shapes (directly)
  const shapesData = await runShapes(zonesData);
  log.info('Step 3 complete: shapes');

  // Step 4: Charts (directly)
  const chartsData = await runCharts(zonesData, args);
  log.info('Step 4 complete: charts');

  // Step 5: Setups (directly)
  const setups = await runSetups(chartsData.validatedZones);
  log.info('Step 5 complete: setups');

  // Return combined result
  return {
    output: JSON.stringify({
      harvest: harvestData,
      zones: zonesData,
      shapes: shapesData,
      charts: chartsData,
      setups: setups,
      status: 'success',
      pipelineVersion: '4.0.0',
    }),
  };
}
```

**Result:** Agent calls one tool, gets everything. No manual steps possible.

**Limitation:** This is effectively the monolithic tool pattern. No agent reasoning between steps. If the pipeline needs the agent to analyze data, view screenshots, or make decisions between steps, this doesn't work.

**When to use:** The pipeline is fully deterministic — no manual steps, no agent analysis needed. Data flows from step to step without requiring human-like judgment.

---

### Option C: Output-Contracted Chain (What PLUTUS Actually Built)

Each tool returns `nextStep` instructions in its output. The NEXT tool's args REQUIRE the output of the manual step. The agent MUST do the step or the next tool blocks with a hard error.

**Implementation:**

```typescript
// Tool 1 — returns instructions in output

async execute(args): Promise<ToolResult> {
  const ctx = ensureContext(args.weekStart);

  // Do the work
  const harvestData = await runHarvest(args);
  ctx.harvestData = harvestData;

  // Return result + next-step instructions
  return {
    title: 'Harvest Complete',
    output: JSON.stringify({
      status: 'success',
      data: harvestData,

      // This is the chaining mechanism — instructions in the output
      nextStep: 'MANUAL STEP A: Navigate to the options URL using plutus-browse-screenshot. '
               + 'ANALYZE the screenshot DIRECTLY using plutus-omni-vision. '
               + 'Extract strikes and pass them to my-pipeline-step2.',
    }, null, 2),
  };
}
```

```typescript
// Tool 2 — args REQUIRE the manual step output

const step2Tool = tool({
  args: {
    weekStart: z.string(),
    optionsData: z.array(z.object({
      pair: z.string(),
      strike: z.number(),

      // This field is the gatekeeper — it can ONLY come from doing Manual Step A
      sourceScreenshot: z.string().min(1),
    })).min(1),
  },

  async execute(args): Promise<ToolResult> {
    const ctx = ensureContext(args.weekStart);

    // MECHANICAL FIREWALL — validate the manual step was actually done
    const { access } = await import('node:fs/promises');
    for (const opt of args.optionsData) {
      try {
        await access(opt.sourceScreenshot);  // File must exist on disk
      } catch {
        return {
          title: 'BLOCKED',
          output: JSON.stringify({
            status: 'BLOCKED',
            error: 'sourceScreenshot does not exist. You must complete Manual Step A first.',
          }),
        };
      }
    }

    // If we get here, Manual Step A was done properly — proceed
    const zones = await runZones(ctx.harvestData, args.optionsData);
    return { output: JSON.stringify({ status: 'success', zones }) };
  },
});
```

**Result:** Tool 1 completes → agent reads `nextStep` → agent does Manual Step A → agent calls Tool 2 with the extracted data → Tool 2 validates the data → executes or blocks.

**Advantage:** Mechanical enforcement via args validation + file existence check. The agent CANNOT skip the manual step. No dependency on hook APIs that might not exist.

**When to use:** The pipeline NEEDS agent reasoning between steps (analyze data, navigate browsers, view screenshots, validate outputs). This is the pattern PLUTUS uses.

---

## Comparison Table

| Aspect | Option A (After-Hook Push) | Option B (In-Tool Chain) | Option C (Output-Contracted) |
|--------|---------------------------|--------------------------|------------------------------|
| **Agent involvement** | Reads push, calls next tool | None (fully automatic) | Reads output, does manual step |
| **Mechanical enforcement** | ❌ Push can be ignored | ✅ Fully automatic | ✅ Args validation + file check |
| **Manual steps possible** | ✅ Yes | ❌ No | ✅ Yes |
| **Agent reasoning between steps** | ✅ Yes | ❌ No | ✅ Yes |
| **Dependencies** | `output.system.push()` must work | None | Zod schema + `fs.access()` |
| **Complexity** | Medium | Low | Low |
| **Failure mode** | Agent ignores push | N/A (always works) | Blocked with clear error |
| **PLUTUS uses?** | ❌ (designed, not built) | ❌ | ✅ Yes |

---

## How to Add After-Hook Chaining to Your Project

If you want to add `tool.execute.after` chaining to your own pipeline:

### Step 1: Define the chain map

```typescript
const PIPELINE_CHAIN: Record<string, {
  next: string;
  extractArgs: (result: any) => Record<string, unknown>;
}> = {
  'step1-fetch': {
    next: 'step2-process',
    extractArgs: (r) => ({ data: r.data, runId: r.runId }),
  },
  'step2-process': {
    next: 'step3-analyze',
    extractArgs: (r) => ({ processed: r.processed, runId: r.runId }),
  },
};
```

### Step 2: Register the after-hook

```typescript
export default async function MyAgent(input: PluginInput): Promise<Hooks> {
  return {
    tool: tools,

    'tool.execute.before': createAllowlistHook(),

    // Add the after-hook for chaining
    'tool.execute.after': async (input: any, output: any) => {
      const chain = PIPELINE_CHAIN[input.tool];
      if (!chain) return;

      try {
        const result = JSON.parse(output.output);
        const nextArgs = chain.extractArgs(result);

        output.system.push({
          role: 'system',
          content: `CHAIN: Call ${chain.next} with args: ${JSON.stringify(nextArgs)}. Call it now.`,
        });
      } catch { /* non-fatal */ }
    },
  };
}
```

### Step 3: Add belt-and-suspenders enforcement

Even with the after-hook push, add args validation to each tool:

```typescript
// Tool 2's execute function still validates prerequisites
async execute(args): Promise<ToolResult> {
  const ctx = ensureContext(args.runId);

  // Verify previous step ran
  if (!ctx.step1Result) {
    return { status: 'BLOCKED', error: 'Must call step1-fetch first' };
  }

  // ... proceed
}
```

This gives you **two layers of enforcement**:
1. The after-hook pushes the next call (strong directive)
2. The before-validation blocks if prerequisites aren't met (mechanical gate)

---

## The PLUTUS Decision

For PLUTUS, we chose **Option C (Output-Contracted Chain)** over Option A (After-Hook Push) because:

1. **Manual steps are required** — the agent must analyze screenshots, navigate browsers, and extract data. These steps can't be automated.

2. **Unverified hook API** — `output.system.push()` was assumed to exist in the L2 spec but was never confirmed to work in the opencode SDK. Rather than risk a broken hook, we used the proven pattern of tool output text.

3. **Mechanical enforcement** — the args validation (`sourceScreenshot` must exist on disk) is unbreakable. The push from the after-hook CAN be ignored by the agent.

4. **Agent reasoning is the point** — the agent IS the VLM. It must analyze charts, validate zones, and make trading decisions. Automated chaining would bypass the agent's reasoning.

If your pipeline doesn't need manual steps, Option A (after-hook push) gives you smoother automation. If it does, Option C (output-contracted) gives you stronger enforcement.

---

*Reference: PLUTUS 4.0 Pipeline — `src/pipeline/engine.ts`, `src/index.ts`, `docs/T1_MULTI_TOOL_CHAIN_PIPELINE.md`*

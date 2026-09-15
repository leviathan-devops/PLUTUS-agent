# T1 REFERENCE MANUAL — Hook-Wired Multi-Tool Chain Pipeline
## How to Engineer a Sequential Tool Pipeline with Mechanical Enforcement in opencode

**Classification**: T1 (Tier 1 Reference) — Primary engineering reference for multi-tool pipeline architecture  
**Version**: 2.0 — Updated post-build with proven patterns from PLUTUS 4.0  
**Date**: 2026-07-20  
**Status**: PROVEN WORKING — 6 trade setups generated end-to-end, mechanical firewalls enforced, VLM analysis confirmed

---

## 1. THE PROBLEM THIS SOLVES

A monolithic tool (`do-everything-tool`) runs ALL logic inside a single `execute()` function. The agent calls it once and gets a result. This has three critical flaws:

1. **No agent reasoning between steps** — the agent can't inspect intermediate output, catch errors, or adjust course
2. **No enforcement of manual steps** — the agent can skip required human-in-the-loop analysis
3. **VLM analysis is external** — if the tool needs vision analysis, it calls an external API instead of the agent doing it directly

The multi-tool chain solves this by splitting the work into N separate tools. The agent calls them sequentially, with reasoning steps between each call. Each tool validates the previous step's output before executing — making it **mechanically impossible** to skip steps or fabricate data.

---

## 2. ARCHITECTURE OVERVIEW

```
Agent (TUI)
  │
  ├── Calls Tool 1 ──→ Tool executes ──→ Returns data + "NEXT: do Manual Step A"
  │                                                        │
  │     AGENT REASONS (reads output, does analysis) ◄──────┘
  │                                                        │
  ├── Calls Tool 2 ──→ BEFORE HOOK validates Manual Step A output exists
  │                   Tool executes ──→ Returns data + "NEXT: do Manual Step B"
  │                                                        │
  │     AGENT REASONS ◄────────────────────────────────────┘
  │                                                        │
  ├── Calls Tool 3 ──→ BEFORE HOOK validates Manual Step B
  │                   Tool executes ──→ Returns data
  │                                                        │
  │     AGENT REASONS ◄────────────────────────────────────┘
  │                                                        │
  └── Calls Tool N ──→ BEFORE HOOK validates Manual Step N-1
                      Tool executes ──→ Returns FINAL result
```

**Key principle**: The agent is NOT a passive caller. Between each tool call, the agent performs reasoning that is REQUIRED for the next tool to function. The next tool's arguments MUST contain the output of that reasoning.

---

## 3. THE FIVE MECHANISMS

### 3.1 Global Pipeline Context (Module-Level State)

Tools in a chain need to share state. Rather than passing everything through tool arguments (which gets unwieldy), use a module-level context object:

```typescript
// src/pipeline/engine.ts

interface PipelineRunContext {
  weekStart: string;
  temporalAnchor: number;
  harvestData: null | { ohlc: Record<string, OHLCBar[]>; spots: Record<string, number>; };
  zoneMapSnapshot: null | ZoneMapSnapshot;
  shapeSnapshot: null | ShapePredictionSnapshot;
  screenshots: Array<{ pair: string; timeframe: string; path: string; capturedAt: number }>;
  validatedZones: any[];
  errors: any[];
  startedAt: number;
}

let currentRun: PipelineRunContext | null = null;

function ensureContext(runId: string): PipelineRunContext {
  if (!currentRun || currentRun.weekStart !== runId) {
    currentRun = { weekStart: runId, /* ... defaults ... */ startedAt: Date.now() };
  }
  return currentRun;
}
```

**Why module-level?** opencode tools are functions. There's no class instance or dependency injection between tool calls. A module-level variable is the simplest way to share state across calls within a single agent session.

**Reset on completion**: The last tool in the chain calls `resetContext()` to clean up:

```typescript
function resetContext(): void {
  currentRun = null;
}
```

### 3.2 Tool Registration via Factory Function

All tools in the chain are created inside a single factory function and registered as a group:

```typescript
export function createPipeline4Tools(): Record<string, ReturnType<typeof tool>> {
  return {
    'my-pipeline-step1': step1Tool,
    'my-pipeline-step2': step2Tool,
    'my-pipeline-step3': step3Tool,
    'my-pipeline-final': finalTool,
  };
}
```

In the plugin entry point (`src/index.ts`), this factory is called and merged with existing tools:

```typescript
export default async function MyAgent(input: PluginInput): Promise<Hooks> {
  let tools: Record<string, any> = {};
  
  // Existing tools
  const { createExistingTools } = await import('./tools/existing.js');
  tools = createExistingTools(input);
  
  // Pipeline 4.0 tools — the multi-tool chain
  const { createPipeline4Tools, setSdkClient } = await import('./pipeline/engine.js');
  setSdkClient(input.client);  // Bridge for VLM analysis
  const pipelineTools = createPipeline4Tools();
  tools = { ...tools, ...pipelineTools };
  
  return {
    tool: tools,
    'tool.execute.before': createToolBeforeHook(),  // Allowlist + firewall
    // ... other hooks
  };
}
```

### 3.3 Mechanical Firewalls (The Key Innovation)

A mechanical firewall is code inside a tool's `execute()` function that validates the PREVIOUS step's output BEFORE doing any work. If validation fails, the tool returns a BLOCKED status — it does NOT execute its logic.

**Three layers of validation:**

#### Layer 1: File Existence Check (Mechanical)

```typescript
const { access } = await import('node:fs/promises');
for (const item of args.data) {
  try {
    await access(item.sourceFile);  // Throws if file doesn't exist
  } catch {
    return {
      title: 'BLOCKED — File does not exist',
      output: JSON.stringify({
        status: 'BLOCKED',
        error: `File "${item.sourceFile}" does not exist. FABRICATED DATA IS BLOCKED.`,
      }),
    };
  }
}
```

This makes it impossible to fabricate data. The agent MUST have called the previous tool (which created a real file) before this tool will execute.

#### Layer 2: Semantic Content Check (Vision-Based)

```typescript
if (sdkClient) {
  const imageData = await readFile(args.data[0].sourceFile);
  const base64 = imageData.toString('base64');
  
  // Ask the model: "Is this actually what it claims to be?"
  const session = await sdkClient.session.create({ body: { title: 'firewall-check' } });
  const result = await sdkClient.prompt({
    id: session.id,
    body: { parts: [
      { type: 'text', text: 'Does this image contain an options table with strike prices? YES or NO only.' },
      { type: 'file', mime: 'image/jpeg', url: `data:image/jpeg;base64,${base64}` },
    ]},
  });
  
  if (!answer.includes('YES')) {
    return { status: 'BLOCKED', error: 'Screenshot does not contain expected content' };
  }
}
```

The model verifies the screenshot CONTENT — not just that a file exists. A screenshot of the wrong page (e.g., a website footer instead of an options table) is BLOCKED.

#### Layer 3: Format Validation (Schema-Based)

```typescript
// Require specific price references in evidence strings
const hasPriceRef = /\d+\.\d{3,}/.test(item.visualEvidence);
if (!hasPriceRef) {
  return { status: 'BLOCKED', error: 'Evidence must contain specific price levels' };
}

// Reject generic strings
const GENERIC = ['zone confirmed', 'order block', 'valid zone'];
if (GENERIC.some(g => evidence === g || evidence.length < 20)) {
  return { status: 'BLOCKED', error: 'Evidence is too generic' };
}
```

### 3.4 Tool Output with Embedded Next-Step Instructions

Each tool's output includes explicit instructions for what the agent must do next. This isn't a hook push — it's text in the tool result that the agent reads:

```typescript
return {
  title: `Harvest Complete — 1,875 bars`,
  output: JSON.stringify({
    status: 'success',
    barsHarvested: 1875,
    optionsDateLink: { url: 'https://...' },
    nextStep: 'MANUAL STEP A: Use plutus-browse-screenshot to navigate to the URL above, '
             + 'then ANALYZE the screenshot DIRECTLY using your own vision. '
             + 'Extract the data and pass it to the next tool.',
  }, null, 2),
};
```

The agent reads `nextStep` and follows it. The next tool's args validate that the agent did the work.

### 3.5 SDK Client Bridge (For Vision/Multimodal Analysis)

The opencode SDK client (`input.client`) is needed by pipeline tools for:
- VLM analysis (sending images to the model)
- Semantic firewall checks (verifying screenshot content)
- Self-contained vision tools (plutus-omni-vision)

Bridge it via a module-level setter:

```typescript
// In engine.ts
let sdkClient: any = null;

export function setSdkClient(client: any): void {
  sdkClient = client;
}

// In index.ts (plugin entry point)
const { setSdkClient } = await import('./pipeline/engine.js');
setSdkClient(input.client);
```

Now any tool in the chain can use `sdkClient` for model invocations — the agent IS the VLM, using its own multimodal capabilities through the SDK.

---

## 4. THE PLUTUS EXAMPLE — COMPLETE IMPLEMENTATION

### 4.1 The 5-Tool Chain

```
Tool 1: plutus-pipeline-harvest
  → Fetches OHLC data via Python tvDatafeed
  → Returns: bars, spots, dynamic date links
  → Next: Agent must extract options data (Manual Step A)

Tool 2: plutus-pipeline-zones
  → FIREWALL: Verifies options screenshot exists + content is valid
  → Constructs Engine 1 zones (9-pillar + S/D + LQZ)
  → Returns: ZoneMapSnapshot (823 zones)
  → Next: Agent reviews zone map textually (Manual Step B)

Tool 3: plutus-pipeline-shapes
  → FIREWALL: Verifies Manual Step B output
  → Computes shape chain (curated top 20 zones)
  → Returns: 4-day prediction
  → Next: Agent reviews shapes (Manual Step C)

Tool 4: plutus-pipeline-charts
  → FIREWALL: Verifies Manual Step C output
  → Navigates TradingView, draws zones, captures 16 screenshots
  → VLM analysis via SDK client (split: supply + demand prompts)
  → Returns: screenshots + validatedZones
  → Next: Agent analyzes screenshots (Manual Step D)

Tool 5: plutus-pipeline-setups
  → FIREWALL: Verifies validatedZones have real screenshots + evidence
  → Supplements with Engine 1 zones for TP targeting
  → Generates trade setups via VisualSetupGenerator
  → Returns: final setups + report path
```

### 4.2 Tool 1: Harvest (Data Collection)

```typescript
const plutusPipelineHarvest = tool({
  description: 'Tool 1/5: Harvest data. After this returns, do Manual Step A.',
  args: {
    weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  },
  async execute(args): Promise<ToolResult> {
    const ctx = ensureContext(args.weekStart);
    
    // Call Python script for OHLC data
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execAsync = promisify(execFile);
    const { stdout } = await execAsync('python3', ['/root/scripts/tv_fetch.py'], {
      timeout: 120_000, maxBuffer: 50 * 1024 * 1024,
    });
    
    // Parse JSON output
    const results = JSON.parse(stdout);
    // ... process bars, compute spots, build optionsDateLink
    
    // Store in context for next tool
    ctx.harvestData = { ohlc, spots, optionsDateLink, ... };
    
    return {
      title: `Harvest Complete`,
      output: JSON.stringify({
        status: 'success',
        data: { /* ... */ },
        nextStep: 'MANUAL STEP A: Navigate to the options URL, screenshot the table, '
                + 'extract strikes, then call plutus-pipeline-zones.',
      }),
    };
  },
});
```

**Key pattern**: The tool stores its output in `ctx.harvestData` so Tool 2 can access it without the agent passing it through args. The agent's next task (Manual Step A) is described in `nextStep`.

### 4.3 Tool 2: Zones (With Mechanical Firewall)

```typescript
const plutusPipelineZones = tool({
  description: 'Tool 2/5: Construct zones. REQUIRES options data from Manual Step A.',
  args: {
    weekStart: z.string(),
    optionsData: z.array(z.object({
      pair: z.string(),
      strike: z.number(),
      sourceScreenshot: z.string().min(1),  // REQUIRED — proves real extraction
    })).min(1),
  },
  async execute(args): Promise<ToolResult> {
    const ctx = ensureContext(args.weekStart);
    
    // ── MECHANICAL FIREWALL ──
    
    // Layer 1: File existence
    const { access } = await import('node:fs/promises');
    for (const opt of args.optionsData) {
      try { await access(opt.sourceScreenshot); }
      catch { return { status: 'BLOCKED', error: 'Screenshot file does not exist' }; }
    }
    
    // Layer 2: Semantic content verification
    if (sdkClient) {
      const imgData = await readFile(args.optionsData[0].sourceScreenshot);
      const b64 = imgData.toString('base64');
      const session = await sdkClient.session.create({ body: { title: 'firewall' } });
      const result = await sdkClient.prompt({
        id: session.id,
        body: { parts: [
          { type: 'text', text: 'Is this an options table? YES or NO.' },
          { type: 'file', mime: 'image/jpeg', url: `data:image/jpeg;base64,${b64}` },
        ]},
      });
      if (!extractText(result).includes('YES')) {
        return { status: 'BLOCKED', error: 'Screenshot is NOT an options table' };
      }
    }
    
    log.info('FIREWALL PASSED — executing zone construction');
    
    // ── TOOL LOGIC ──
    const { pillarEngine } = await import('../brains/9-pillar-lobe.js');
    const { construct4HZones } = await import('../brains/4h-sd-lobe.js');
    const { detectLiquidityZones } = await import('../brains/lqz-lobe.js');
    
    for (const pair of pairs) {
      const bars = ctx.harvestData.ohlc[pair];
      const pillarZones = pillarEngine({ instrument: pair, bars, currentPrice: spot });
      const sdZones = construct4HZones({ bars, instrument: pair, spot, pipValue });
      const lqzZones = detectLiquidityZones(pair, bars);
      zonesByPair[pair] = [...pillarZones, ...sdZones, ...lqzZones];
    }
    
    ctx.zoneMapSnapshot = { version: 4, timestamp: Date.now(), zones, spots };
    
    return { title: 'Zones Complete', output: JSON.stringify({ /* ... */ }) };
  },
});
```

**Key pattern**: The firewall runs BEFORE any zone logic. If it fails, the tool returns immediately without executing. The agent must fix the issue (get a real screenshot) and retry.

### 4.4 Tool 5: Setups (Final Tool with Reset)

```typescript
const plutusPipelineSetups = tool({
  description: 'Tool 5/5: Generate trade setups. REQUIRES validatedZones.',
  args: {
    weekStart: z.string(),
    validatedZones: z.array(z.object({
      pair: z.string(),
      type: z.enum(['SUPPLY', 'DEMAND', 'LIQUIDITY']),
      sourceScreenshot: z.string().min(5),     // Must exist on disk
      visualEvidence: z.string().min(20),       // Must be specific
    })).min(3),
  },
  async execute(args): Promise<ToolResult> {
    const ctx = ensureContext(args.weekStart);
    
    // ── FIREWALL: File existence + price reference + generic rejection ──
    for (const vz of args.validatedZones) {
      await access(vz.sourceScreenshot);  // File must exist
      if (!/\d+\.\d{3,}/.test(vz.visualEvidence)) {
        return { status: 'BLOCKED', error: 'Evidence must cite specific prices' };
      }
    }
    
    // ── ENGINE 1 SUPPLEMENTATION ──
    // If VLM only produced supply zones, add demand zones from Engine 1
    for (const pair of pairs) {
      const hasSupply = pairValidated.some(v => v.type === 'SUPPLY');
      const hasDemand = pairValidated.some(v => v.type === 'DEMAND');
      if (!hasSupply || !hasDemand) {
        // Pull missing type from zoneMapSnapshot
        const engine1Zones = ctx.zoneMapSnapshot.zones
          .filter(z => /* match pair + missing type */)
          .slice(0, 5);
        pairValidated.push(...engine1Zones.map(/* convert to validated format */));
      }
    }
    
    // ── SETUP GENERATION ──
    const generator = new VisualSetupGenerator();
    for (const pair of pairs) {
      const setups = generator.generateSetups(
        ctx.zoneMapSnapshot, ctx.shapeSnapshot,
        pairValidated, pair, spot, counter, 'NEUTRAL',
      );
      allSetups.push(...setups);
    }
    
    // ── CLEAN UP ──
    resetContext();  // Important: clear module-level state
    
    return { title: `Pipeline COMPLETE — ${allSetups.length} setups`, output: JSON.stringify(result) };
  },
});
```

**Key pattern**: The final tool calls `resetContext()` to clean up. This ensures the next pipeline run starts fresh.

---

## 5. TOOL ALLOWLIST INTEGRATION

The opencode `tool.execute.before` hook fires on EVERY tool call. It checks the tool name against an allowlist:

```typescript
// src/hooks/tool-allowlist.ts

const ALLOWED_PREFIXES = [
  'my-pipeline-',     // Pipeline tools
  'plutus-',          // Other plutus tools
  'tv_',              // MCP tools (direct names)
  'tv-browser_',      // MCP tools (opencode server-prefixed)
  'read', 'write', 'edit', 'bash', 'glob', 'grep', 'webfetch',
];

const BLOCKED_PREFIXES = [
  'trident-', 'manta-', 'shark-',  // Other agents' tools
];

function isToolAllowed(toolName: string): boolean {
  if (BLOCKED_TOOLS.includes(toolName)) return false;
  for (const prefix of BLOCKED_PREFIXES) {
    if (toolName.startsWith(prefix)) return false;
  }
  for (const prefix of ALLOWED_PREFIXES) {
    if (toolName.startsWith(prefix)) return true;
  }
  return false;  // Default: BLOCKED
}

export function createToolBeforeHook(): Hooks['tool.execute.before'] {
  return async (input: Record<string, unknown>) => {
    const toolName = (input as any)?.tool || (input as any)?.name || '';
    if (!isToolAllowed(toolName)) {
      throw new Error(`[TOOL BLOCK] "${toolName}" is not allowed.`);
    }
  };
}
```

**Critical**: MCP tools registered via opencode's MCP config get prefixed with the server name. If the MCP server is named `tv-browser`, the tools become `tv-browser_tv_launch` — NOT just `tv_launch`. The allowlist must include the server-prefixed form.

---

## 6. THE GLOBAL CONTEXT SHARING PATTERN

### 6.1 Why Module-Level State

opencode tools are plain functions. There's no constructor, no dependency injection, no request-scoped container. When the agent calls Tool 1 and then later calls Tool 2, they're separate function invocations with no shared state except:

1. **Tool arguments** (what the agent passes)
2. **Module-level variables** (what the code retains)
3. **File system** (what's written to disk)

Module-level state is the cleanest option for pipeline-internal data (OHLC bars, zone maps, screenshots) that's too large to pass through tool args.

### 6.2 The Context Object

```typescript
interface PipelineRunContext {
  // Identity
  runId: string;
  startedAt: number;
  
  // Phase outputs (each tool stores its result here)
  phaseResults: {
    harvest: null | HarvestData;
    zones: null | ZoneMapSnapshot;
    shapes: null | ShapePredictionSnapshot;
    charts: null | ChartData;
  };
  
  // Accumulated state
  screenshots: Screenshot[];
  validatedZones: VisualZone[];
  errors: PipelineError[];
  
  // Manual step tracking
  manualStepOutputs: Record<string, unknown>;
}
```

### 6.3 Context Lifecycle

```
Tool 1 called → ensureContext(runId) → creates new context
Tool 2 called → ensureContext(runId) → returns same context (same runId)
Tool 3 called → ensureContext(runId) → returns same context
...
Tool N called → executes → resetContext() → context destroyed
```

If the agent calls Tool 1 with a different `runId` (e.g., different weekStart), a NEW context is created. This supports multiple pipeline runs in sequence.

---

## 7. MANUAL STEP ENFORCEMENT

### 7.1 The Problem

Between Tool 1 and Tool 2, the agent must perform "Manual Step A" — extract options data from a website. If the agent skips this and calls Tool 2 with fabricated data, the pipeline produces garbage.

### 7.2 The Solution: Output-Contracted Args

Tool 2's args REQUIRE a field that can ONLY be populated by doing Manual Step A:

```typescript
args: {
  optionsData: z.array(z.object({
    pair: z.string(),
    strike: z.number(),
    sourceScreenshot: z.string().min(1),  // ← This field is the gatekeeper
  })).min(1),
}
```

The `sourceScreenshot` field must contain a file path. The tool verifies:
1. The file EXISTS on disk (`fs.access()`)
2. The file CONTAINS the right content (vision check)
3. The content MATCHES expected format (price references in evidence)

If the agent fabricates a path like `/tmp/fake.png`, `fs.access()` throws → BLOCKED.

### 7.3 The Instruction Chain

Each tool's output includes `nextStep` text that tells the agent exactly what to do:

```json
{
  "status": "success",
  "nextStep": "MANUAL STEP A: Navigate to https://investinglive.com/orders/... "
            + "Use plutus-browse-screenshot to capture the options table. "
            + "Then ANALYZE the screenshot DIRECTLY using plutus-omni-vision. "
            + "Extract strikes and pass them to plutus-pipeline-zones."
}
```

The agent reads this, performs the step, and calls the next tool with the required output.

---

## 8. VLM INTEGRATION — THE AGENT IS THE VLM

### 8.1 The Architecture Decision

The old pipeline called an external API (`https://opencode.ai/zen/v1/chat/completions`) with a hardcoded API key. This was wrong because:

1. The model received NO identity context (no system prompt, no domain knowledge)
2. The model was a blank slate trying to analyze charts without trading expertise
3. The call bypassed the agent's conversation context

### 8.2 The Fix: SDK Client Bridge

The opencode SDK client (`input.client`) provides model access WITH full conversation context — including the system prompt that contains the agent's identity, laws, and methodology.

```typescript
// Bridge in index.ts
setSdkClient(input.client);

// Usage in pipeline tools
const session = await sdkClient.session.create({ body: { title: 'chart-analysis' } });
const result = await sdkClient.prompt({
  id: session.id,
  body: {
    parts: [
      { type: 'text', text: 'You are PLUTUS TTE. Analyze this chart...' },
      { type: 'file', mime: 'image/png', url: `data:image/png;base64,${base64}` },
    ],
  },
});
```

The model sees the system prompt (Plutus identity + 37 laws) AND the screenshot. It produces analysis as if it IS the trading expert — because it IS.

### 8.3 Self-Contained Vision Tool

For the agent to view ANY image in its primary reasoning context (not just through tool-mediated calls), create a dedicated vision tool:

```typescript
const plutusOmniVision = tool({
  description: 'Analyze ANY image file using your own visual capabilities.',
  args: {
    file_path: z.string(),
    prompt: z.string(),
  },
  async execute(args) {
    const imageData = await readFile(args.file_path);
    const base64 = imageData.toString('base64');
    const session = await sdkClient.session.create({ body: { title: 'vision' } });
    const result = await sdkClient.prompt({
      id: session.id,
      body: { parts: [
        { type: 'text', text: args.prompt },
        { type: 'file', mime: 'image/png', url: `data:image/png;base64,${base64}` },
      ]},
    });
    return { output: extractText(result) };
  },
});
```

The agent calls `plutus-omni-vision` directly in its reasoning chain. The image analysis flows INTO the agent's primary context as tool output.

---

## 9. BROWSE-SCREENSHOT TOOL (Idiot-Proof Browser Interaction)

### 9.1 Purpose

The agent needs to navigate websites, capture screenshots, and extract data. Rather than giving the agent raw `bash` access to Chrome CDP commands (which it will misuse), provide a dedicated tool:

### 9.2 Implementation

```typescript
const plutusBrowseScreenshot = tool({
  description: 'Navigate Chrome to a URL, screenshot, OCR, return text + image path.',
  args: {
    url: z.string().url(),
    scrollPixels: z.number().int().default(0),
    zoomSelector: z.string().optional(),
  },
  async execute(args) {
    // 1. Create new Chrome tab via CDP HTTP API
    const resp = await fetch(`http://127.0.0.1:9333/json/new?${encodeURIComponent(args.url)}`, { method: 'PUT' });
    
    // 2. Open WebSocket to the tab
    const ws = new WebSocket(tabInfo.webSocketDebuggerUrl);
    
    // 3. Wait for page render (4 seconds)
    await sleep(4000);
    
    // 4. Scroll if requested
    if (args.scrollPixels > 0) {
      await sendCdp('Runtime.evaluate', { expression: `window.scrollTo(0, ${args.scrollPixels})` });
    }
    
    // 5. Capture screenshot as JPEG (10x smaller than PNG)
    const shot = await sendCdp('Page.captureScreenshot', { format: 'jpeg', quality: 70 });
    
    // 6. Resize via Python Pillow + OCR via tesseract
    const ocrScript = `
      from PIL import Image; import pytesseract, sys
      img = Image.open(sys.argv[1])
      if img.width > 800: img = img.resize((800, int(img.height*800/img.width)), Image.LANCZOS)
      img.save(sys.argv[2], 'JPEG', quality=75)
      print(pytesseract.image_to_string(img))
    `;
    const { stdout: ocrText } = await execAsync('python3', ['-c', ocrScript, rawPath, resizedPath]);
    
    // 7. Return BOTH the image path AND the OCR text
    return {
      output: JSON.stringify({
        screenshotPath: resizedPath,
        ocrText: ocrText,
        url: args.url,
      }),
    };
  },
});
```

### 9.3 Why OCR Alongside Image

MiMo v2.5 free tier can't process large PNG images (hangs indefinitely). The OCR text gives the agent the CONTENT without needing to process the image. The resized JPEG (800px max) is small enough for the model if visual analysis IS needed.

---

## 10. BACKTESTING TOOL (Verify Results Against Reality)

The final tool in a pipeline chain should verify its own output:

```typescript
const plutusBacktestSetups = tool({
  description: 'Verify setups against actual OHLC data. WIN/LOSS/NOT_TRIGGERED.',
  args: {
    weekStart: z.string(),
    setups: z.array(z.object({
      pair: z.string(), direction: z.string(),
      entry: z.number(), sl: z.number(), tp: z.number(),
    })),
  },
  async execute(args) {
    // 1. Fetch actual 1H bars for the week
    const bars = await fetchBars(pair, weekStart);
    
    // 2. For each setup, check if entry was triggered
    for (const setup of args.setups) {
      const dayBars = bars.filter(b => isSameDay(b.timestamp, setup.day));
      
      // LONG: triggered when bar.low <= entry
      // SHORT: triggered when bar.high >= entry
      const triggered = setup.direction === 'LONG'
        ? dayBars.some(b => b.low <= setup.entry)
        : dayBars.some(b => b.high >= setup.entry);
      
      if (!triggered) { result = 'NOT_TRIGGERED'; continue; }
      
      // 3. Scan forward: did TP or SL hit first?
      for (const bar of remainingBars) {
        if (setup.direction === 'LONG') {
          if (bar.high >= setup.tp) { result = 'WIN'; break; }
          if (bar.low <= setup.sl) { result = 'LOSS'; break; }
        } else { /* inverse */ }
      }
    }
    
    return { output: JSON.stringify({ winRate, wins, losses, results }) };
  },
});
```

---

## 11. LESSONS LEARNED (From Building PLUTUS 4.0)

### 11.1 What Worked

1. **Module-level context** — Simple, reliable, no framework overhead
2. **Mechanical firewalls** — File existence checks are unbreakable. Semantic checks (vision) add content verification
3. **Output-contracted args** — Forcing `sourceScreenshot` in args makes the agent do the manual step
4. **SDK client bridge** — Agent uses its own model for VLM, no external API calls
5. **Tool allowlist** — Hard gate that blocks unauthorized tools
6. **Python execFile for data** — tvDatafeed, Pillow, tesseract all called via `python3 -c` — leverages Python ecosystem without npm dependencies

### 11.2 What Didn't Work

1. **Hardcoded pixel coordinates for TradingView UI** — Button positions change with viewport size. Must use DOM queries (`aria-label`) via MCP
2. **JavaScript chart API (`createMultipointShape`)** — Returns a Promise that rejects with `TypeError: e.map is not a function`. The API is broken for programmatic drawing. Must use CDP mouse events instead
3. **Xvfb without compositor** — CDP mouse events don't reach WebGL canvas. Must use Weston + XWayland for pointer event synthesis
4. **External API calls for VLM** — The model has no context without the system prompt. Must use SDK client
5. **Single VLM prompt for both supply and demand** — Model focuses on one side. Must split into two explicit prompts

### 11.3 Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Module-level state (not class) | opencode tools are functions, not methods. No DI framework. |
| File-existence firewall | Unbreakable — `fs.access()` can't be bypassed by the agent |
| Vision-based semantic firewall | Content verification — catches screenshots of wrong pages |
| Python via execFile | Leverages Python ecosystem (tvDatafeed, Pillow, tesseract) without npm deps |
| SDK client bridge | Agent IS the VLM — same model, same context, no external calls |
| MCP for TradingView drawing | DOM queries find buttons dynamically. Hardcoded coords don't work. |
| Weston + XWayland in Docker | Only compositor proven to synthesize WebGL pointer events in headless env |

---

## 12. FILE STRUCTURE

```
src/
├── index.ts                      # Plugin entry — registers tools + hooks
├── hooks/
│   └── tool-allowlist.ts         # ALLOWED_PREFIXES + BLOCKED_PREFIXES
├── pipeline/
│   ├── engine.ts                 # ALL tool definitions + context + firewalls
│   ├── types.ts                  # PhaseResult, PipelineError, VisualSDZone
│   ├── hooks.ts                  # ManualStepDescriptor, ManualStepMissingError
│   ├── errors.ts                 # TemporalAnchorViolation, CDPTimeoutError
│   ├── temporal-anchor.ts        # Dynamic date computation
│   ├── manual-step-push.ts       # Next-step instruction builders
│   ├── defense-rules.ts          # 23 defense rules with check functions
│   ├── error-sink.ts             # recordPipelineError, hasFatalError
│   ├── merkle-chain.ts           # SHA-256 tamper-evident chain
│   └── pipeline.test-harness.ts  # T1-T20 test specs
```

---

## 13. RECIPE — How to Build Your Own Multi-Tool Chain

1. **Define the pipeline steps** — What data transformations happen? What manual steps does the agent need to perform between them?

2. **Create the context object** — What state needs to be shared across tools?

3. **Write each tool** — Each tool has:
   - Args that include the PREVIOUS manual step's output (with a file-path gatekeeper)
   - A firewall that validates the file exists + content is correct
   - Logic that processes data and stores results in context
   - Output that includes `nextStep` instructions

4. **Create the factory function** — `createPipelineTools()` returns all tools as a record

5. **Wire into plugin entry** — Call the factory in `index.ts`, merge with existing tools

6. **Update the allowlist** — Add your tool name prefix to ALLOWED_PREFIXES

7. **Bridge the SDK client** — If you need VLM, call `setSdkClient(input.client)`

8. **Test with TUI** — Deploy to container, send tasks via tmux, verify each step

9. **Add defense rules** — Write check functions that validate pipeline output

10. **Add backtesting** — Final tool verifies results against ground truth

---

*End of T1 Reference Manual — Hook-Wired Multi-Tool Chain Pipeline Architecture.*

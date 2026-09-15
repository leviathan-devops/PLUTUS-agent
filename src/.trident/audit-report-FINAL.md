# TRIDENT v4.3 — RUNTIME GRADE DEVOPS AUDIT

**Score:** 79/100 — NEEDS FIXES
**Target:** /home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident_Agent/Active_Projects/Plutus_Agent/src (src)
**Agent:** 
**Files Scanned:** 434 source files
**Findings:** 13 CRITICAL | 19 HIGH | 474 MEDIUM | 1 LOW
**Layers:** 14/17 active

---

## Mechanical Evidence (PREFLIGHT)

| Check | Result | Detail |
|-------|--------|--------|
| type-check | FAIL | No build:check script — cannot verify types |
| build | FAIL | No build script — cannot verify build |
| dist-exists | PASS | dist/index.js exists (1398.5KB) |
| dist-single-file | FAIL | Multi-file dist — 4 .js files, relative imports found |
| source-map | PASS | Source map present |

## Confidence Distribution

| Confidence | Count | % of Total |
|------------|-------|-----------|
| 0.95-1.00 (Definite) | 19 | 3.7% |
| 0.85-0.94 (High) | 17 | 3.4% |
| 0.70-0.84 (Moderate) | 462 | 91.1% |
| < 0.70 (Low/Noise) | 9 | 1.8% |

*(Findings below 0.70 confidence are excluded from scoring)*

## CRITICAL — Prevents First-Attempt Deployment

### [R2] r2.empty-catch — CRITICAL (confidence: 1.00 — CRITICAL)

**File:** `tools/plutus-omni-vision.ts:123`
**Evidence:** `catch { /* best-effort cleanup */ }`
**Problem:** Empty catch block swallows the error silently — catch { /* best-effort cleanup */ }
**Runtime Impact:** Lexicon r2.empty-catch flagged a pattern in the R2 layer (conf: 0.95)
**Fix:** Log the error (tridentLog) + rethrow or handle it — never swallow silently

**Cross-Project Evidence:** This pattern occurred 25 times across: Kraken v1.2.
**Proven Fix:** Add console.error("[Component] operation failed:", err) in every catch block. Never swallow errors silently.
**Source:** KRAKEN_V1.2_FORENSIC: "25+ instances of catch {} — Docker failures, brain wiring errors ALL hidden"

### [R2] r2.empty-catch — CRITICAL (confidence: 1.00 — CRITICAL)

**File:** `tools/plutus-omni-vision.ts:129`
**Evidence:** `catch { /* best-effort cleanup */ }`
**Problem:** Empty catch block swallows the error silently — catch { /* best-effort cleanup */ }
**Runtime Impact:** Lexicon r2.empty-catch flagged a pattern in the R2 layer (conf: 0.95)
**Fix:** Log the error (tridentLog) + rethrow or handle it — never swallow silently

**Cross-Project Evidence:** This pattern occurred 25 times across: Kraken v1.2.
**Proven Fix:** Add console.error("[Component] operation failed:", err) in every catch block. Never swallow errors silently.
**Source:** KRAKEN_V1.2_FORENSIC: "25+ instances of catch {} — Docker failures, brain wiring errors ALL hidden"

### [R2] r2.empty-catch — CRITICAL (confidence: 1.00 — CRITICAL)

**File:** `mdve/reasoning-chain.ts:1135`
**Evidence:** `catch {
      // a lexicon predicate error is never a pipeline error — the chain
      // proceeds with the deterministi`
**Problem:** Empty catch block swallows the error silently — catch {
      // a lexicon predicate error is never a pipeline error — the chain
      // proceeds with the deterministi
**Runtime Impact:** Lexicon r2.empty-catch flagged a pattern in the R2 layer (conf: 0.95)
**Fix:** Log the error (tridentLog) + rethrow or handle it — never swallow silently

**Cross-Project Evidence:** This pattern occurred 25 times across: Kraken v1.2.
**Proven Fix:** Add console.error("[Component] operation failed:", err) in every catch block. Never swallow errors silently.
**Source:** KRAKEN_V1.2_FORENSIC: "25+ instances of catch {} — Docker failures, brain wiring errors ALL hidden"

### [R2] r2.empty-catch — CRITICAL (confidence: 1.00 — CRITICAL)

**File:** `mdve/mirror.ts:808`
**Evidence:** `catch { /* non-fatal */ }`
**Problem:** Empty catch block swallows the error silently — catch { /* non-fatal */ }
**Runtime Impact:** Lexicon r2.empty-catch flagged a pattern in the R2 layer (conf: 0.95)
**Fix:** Log the error (tridentLog) + rethrow or handle it — never swallow silently

**Cross-Project Evidence:** This pattern occurred 25 times across: Kraken v1.2.
**Proven Fix:** Add console.error("[Component] operation failed:", err) in every catch block. Never swallow errors silently.
**Source:** KRAKEN_V1.2_FORENSIC: "25+ instances of catch {} — Docker failures, brain wiring errors ALL hidden"

### [R2] r2.empty-catch — CRITICAL (confidence: 1.00 — CRITICAL)

**File:** `mdve/mirror.ts:829`
**Evidence:** `catch { /* non-fatal — a log failure never kills the pipeline */ }`
**Problem:** Empty catch block swallows the error silently — catch { /* non-fatal — a log failure never kills the pipeline */ }
**Runtime Impact:** Lexicon r2.empty-catch flagged a pattern in the R2 layer (conf: 0.95)
**Fix:** Log the error (tridentLog) + rethrow or handle it — never swallow silently

**Cross-Project Evidence:** This pattern occurred 25 times across: Kraken v1.2.
**Proven Fix:** Add console.error("[Component] operation failed:", err) in every catch block. Never swallow errors silently.
**Source:** KRAKEN_V1.2_FORENSIC: "25+ instances of catch {} — Docker failures, brain wiring errors ALL hidden"

### [R2] r2.empty-catch — CRITICAL (confidence: 1.00 — CRITICAL)

**File:** `pipeline/engine.ts:2046`
**Evidence:** `catch {}`
**Problem:** Empty catch block swallows the error silently — catch {}
**Runtime Impact:** Lexicon r2.empty-catch flagged a pattern in the R2 layer (conf: 0.95)
**Fix:** Log the error (tridentLog) + rethrow or handle it — never swallow silently

**Cross-Project Evidence:** This pattern occurred 25 times across: Kraken v1.2.
**Proven Fix:** Add console.error("[Component] operation failed:", err) in every catch block. Never swallow errors silently.
**Source:** KRAKEN_V1.2_FORENSIC: "25+ instances of catch {} — Docker failures, brain wiring errors ALL hidden"

### [R2] r2.empty-catch — CRITICAL (confidence: 1.00 — CRITICAL)

**File:** `pipeline/engine.ts:2082`
**Evidence:** `catch { /* page mid-navigation — retry */ }`
**Problem:** Empty catch block swallows the error silently — catch { /* page mid-navigation — retry */ }
**Runtime Impact:** Lexicon r2.empty-catch flagged a pattern in the R2 layer (conf: 0.95)
**Fix:** Log the error (tridentLog) + rethrow or handle it — never swallow silently

**Cross-Project Evidence:** This pattern occurred 25 times across: Kraken v1.2.
**Proven Fix:** Add console.error("[Component] operation failed:", err) in every catch block. Never swallow errors silently.
**Source:** KRAKEN_V1.2_FORENSIC: "25+ instances of catch {} — Docker failures, brain wiring errors ALL hidden"

### [R2] r2.empty-catch — CRITICAL (confidence: 1.00 — CRITICAL)

**File:** `pipeline/engine.ts:2279`
**Evidence:** `catch {}`
**Problem:** Empty catch block swallows the error silently — catch {}
**Runtime Impact:** Lexicon r2.empty-catch flagged a pattern in the R2 layer (conf: 0.95)
**Fix:** Log the error (tridentLog) + rethrow or handle it — never swallow silently

**Cross-Project Evidence:** This pattern occurred 25 times across: Kraken v1.2.
**Proven Fix:** Add console.error("[Component] operation failed:", err) in every catch block. Never swallow errors silently.
**Source:** KRAKEN_V1.2_FORENSIC: "25+ instances of catch {} — Docker failures, brain wiring errors ALL hidden"

### [R2] r2.empty-catch — CRITICAL (confidence: 1.00 — CRITICAL)

**File:** `pipeline/engine.ts:2281`
**Evidence:** `catch {}`
**Problem:** Empty catch block swallows the error silently — catch {}
**Runtime Impact:** Lexicon r2.empty-catch flagged a pattern in the R2 layer (conf: 0.95)
**Fix:** Log the error (tridentLog) + rethrow or handle it — never swallow silently

**Cross-Project Evidence:** This pattern occurred 25 times across: Kraken v1.2.
**Proven Fix:** Add console.error("[Component] operation failed:", err) in every catch block. Never swallow errors silently.
**Source:** KRAKEN_V1.2_FORENSIC: "25+ instances of catch {} — Docker failures, brain wiring errors ALL hidden"

### [R2] r2.empty-catch — CRITICAL (confidence: 1.00 — CRITICAL)

**File:** `machines/algebra.ts:46`
**Evidence:** `catch {
      // release failure on a failed use: swallowed ONLY because the primary error
      // is the signal; on a `
**Problem:** Empty catch block swallows the error silently — catch {
      // release failure on a failed use: swallowed ONLY because the primary error
      // is the signal; on a 
**Runtime Impact:** Lexicon r2.empty-catch flagged a pattern in the R2 layer (conf: 0.95)
**Fix:** Log the error (tridentLog) + rethrow or handle it — never swallow silently

**Cross-Project Evidence:** This pattern occurred 25 times across: Kraken v1.2.
**Proven Fix:** Add console.error("[Component] operation failed:", err) in every catch block. Never swallow errors silently.
**Source:** KRAKEN_V1.2_FORENSIC: "25+ instances of catch {} — Docker failures, brain wiring errors ALL hidden"

### [R2] r2.empty-catch — CRITICAL (confidence: 1.00 — CRITICAL)

**File:** `engine/plutus-tte-pipeline.ts:3043`
**Evidence:** `catch (e) { /* non-blocking diagnostic */ }`
**Problem:** Empty catch block swallows the error silently — catch (e) { /* non-blocking diagnostic */ }
**Runtime Impact:** Lexicon r2.empty-catch flagged a pattern in the R2 layer (conf: 0.95)
**Fix:** Log the error (tridentLog) + rethrow or handle it — never swallow silently

**Cross-Project Evidence:** This pattern occurred 25 times across: Kraken v1.2.
**Proven Fix:** Add console.error("[Component] operation failed:", err) in every catch block. Never swallow errors silently.
**Source:** KRAKEN_V1.2_FORENSIC: "25+ instances of catch {} — Docker failures, brain wiring errors ALL hidden"

### [R2] r2.empty-catch — CRITICAL (confidence: 1.00 — CRITICAL)

**File:** `pipeline/defense-rules.ts:51`
**Evidence:** `catch { /* skip */ }`
**Problem:** Empty catch block swallows the error silently — catch { /* skip */ }
**Runtime Impact:** Lexicon r2.empty-catch flagged a pattern in the R2 layer (conf: 0.95)
**Fix:** Log the error (tridentLog) + rethrow or handle it — never swallow silently

**Cross-Project Evidence:** This pattern occurred 25 times across: Kraken v1.2.
**Proven Fix:** Add console.error("[Component] operation failed:", err) in every catch block. Never swallow errors silently.
**Source:** KRAKEN_V1.2_FORENSIC: "25+ instances of catch {} — Docker failures, brain wiring errors ALL hidden"

### [R2] r2.empty-catch — CRITICAL (confidence: 1.00 — CRITICAL)

**File:** `pipeline/defense-rules.ts:94`
**Evidence:** `catch { /* skip */ }`
**Problem:** Empty catch block swallows the error silently — catch { /* skip */ }
**Runtime Impact:** Lexicon r2.empty-catch flagged a pattern in the R2 layer (conf: 0.95)
**Fix:** Log the error (tridentLog) + rethrow or handle it — never swallow silently

**Cross-Project Evidence:** This pattern occurred 25 times across: Kraken v1.2.
**Proven Fix:** Add console.error("[Component] operation failed:", err) in every catch block. Never swallow errors silently.
**Source:** KRAKEN_V1.2_FORENSIC: "25+ instances of catch {} — Docker failures, brain wiring errors ALL hidden"

## HIGH — Will Fail Container Test

### [R5] r5.fake-return — HIGH (confidence: 1.00 — CRITICAL)

**File:** `tools/plutus-omni-vision.ts:75`
**Evidence:** `function fileExists(filePath: string): boolean {
  try {
    const fs = require('node:fs');
    return fs.existsSync(fil`
**Problem:** Function returns a hardcoded success without doing the work — function fileExists(filePath: string): boolean {
  try {
    const fs = require('node:fs');
    return fs.existsSync(fil
**Runtime Impact:** Lexicon r5.fake-return flagged a pattern in the R5 layer (conf: 0.90)
**Fix:** Perform the real work + return the real result — never a fake success

### [R5] r5.fake-return — HIGH (confidence: 1.00 — CRITICAL)

**File:** `report/pdf-generator.ts:220`
**Evidence:** `function hasTool(tool: string): boolean {
  try {
    execSync(`which ${tool} 2>/dev/null`, { encoding: 'utf8', stdio: '`
**Problem:** Function returns a hardcoded success without doing the work — function hasTool(tool: string): boolean {
  try {
    execSync(`which ${tool} 2>/dev/null`, { encoding: 'utf8', stdio: '
**Runtime Impact:** Lexicon r5.fake-return flagged a pattern in the R5 layer (conf: 0.90)
**Fix:** Perform the real work + return the real result — never a fake success

### [R5] r5.fake-return — HIGH (confidence: 1.00 — CRITICAL)

**File:** `pipeline/defense-rules.ts:57`
**Evidence:** `function isMutterRunning(): boolean {
  try {
    execSync('pgrep -x Mutter', { encoding: 'utf-8', stdio: 'pipe' });
   `
**Problem:** Function returns a hardcoded success without doing the work — function isMutterRunning(): boolean {
  try {
    execSync('pgrep -x Mutter', { encoding: 'utf-8', stdio: 'pipe' });
   
**Runtime Impact:** Lexicon r5.fake-return flagged a pattern in the R5 layer (conf: 0.90)
**Fix:** Perform the real work + return the real result — never a fake success

### [R5] r5.fake-return — HIGH (confidence: 1.00 — CRITICAL)

**File:** `pipeline/defense-rules.ts:80`
**Evidence:** `function isForbiddenLibInstalled(pkg: string): boolean {
  try { pipeRequire.resolve(pkg); return true; } catch { return`
**Problem:** Function returns a hardcoded success without doing the work — function isForbiddenLibInstalled(pkg: string): boolean {
  try { pipeRequire.resolve(pkg); return true; } catch { return
**Runtime Impact:** Lexicon r5.fake-return flagged a pattern in the R5 layer (conf: 0.90)
**Fix:** Perform the real work + return the real result — never a fake success

**Cross-Project Evidence:** This pattern occurred 25 times across: Kraken v1.2.
**Proven Fix:** Add console.error("[Component] operation failed:", err) in every catch block. Never swallow errors silently.
**Source:** KRAKEN_V1.2_FORENSIC: "25+ instances of catch {} — Docker failures, brain wiring errors ALL hidden"

### [R18-lasme-lexicon] lexicon.missing.Contract — HIGH (confidence: 0.92 — CRITICAL)

**File:** `profiles/tradingview.ts:88`
**Evidence:** `if (tool.includes('navigate') || tool.includes('switch')) return 2000;`
**Problem:** lexicon.missing Contract at src/vei/profiles/tradingview.ts:88
**Runtime Impact:** Hydra gate finding — requires adjudication
**Fix:** PLUTUS_V4.4_VEI_SPEC.md:925 settleMs — Appendix A.4 SEL 2000/1000/300/200 table

### [R18-lasme-lexicon] lexicon.threshold.Contract — HIGH (confidence: 0.89 — HIGH)

**File:** `tvi/vcm.ts:102`
**Evidence:** `if (node.priority === 'block') score += 100;`
**Problem:** lexicon.threshold Contract at src/tvi/vcm.ts:102
**Runtime Impact:** Hydra gate finding — requires adjudication
**Fix:** PLUTUS_TVI_DESIGN_SPEC.md:4.1 relevance scoring block +100 | warn +50 | guide +25, category +30/20/15/10, disclosure +20/10/5

### [R18-lasme-lexicon] lexicon.threshold.Contract — HIGH (confidence: 0.88 — HIGH)

**File:** `pipeline/engine.ts:236`
**Evidence:** `if (confluence >= 12) return 10;  // EXTREME — nearly impregnable`
**Problem:** lexicon.threshold Contract at src/pipeline/engine.ts:236
**Runtime Impact:** Hydra gate finding — requires adjudication
**Fix:** PLUTUS_ARCHITECTURE_BIBLE_4.0.md:4.12 Pillar 9 pressure-degree → ZFP step 12→10,10→20,8→30,6→40,4→55 else 65

### [R18-lasme-lexicon] lexicon.threshold.Contract — HIGH (confidence: 0.90 — CRITICAL)

**File:** `vkg/validation.ts:62`
**Evidence:** `condition: (s) => isVerif(s) && s.zone !== undefined && s.zone.visualEvidence.length < 20,`
**Problem:** lexicon.threshold Contract at src/tvi/vkg/validation.ts:62
**Runtime Impact:** Hydra gate finding — requires adjudication
**Fix:** PLUTUS_TVI_DESIGN_SPEC.md:422 B-002 BLOCKED visualEvidence < 20 chars

### [R18-lasme-lexicon] lexicon.drift.Contract — HIGH (confidence: 0.87 — HIGH)

**File:** `vkg/validation.ts:20`
**Evidence:** `return /body/i.test(z.visualEvidence) && /(?:6[5-9]|[7-9]\d|100)\s*%/.test(z.visualEvidence);`
**Problem:** lexicon.drift Contract at src/tvi/vkg/validation.ts:20
**Runtime Impact:** Hydra gate finding — requires adjudication
**Fix:** PLUTUS_TVI_DESIGN_SPEC.md:3.2 B-014 BoM body ≥ 65% of range AND body-to-wick ≥ 3.0 AND prior move NONE/OPPOSITE

### [R21-lasme-engine] engine.silentDegrade.Contract — HIGH (confidence: 0.95 — CRITICAL)

**File:** `tools/plutus-tools.ts:23`
**Evidence:** `navigateHeadedBrowser('https://www.tradingview.com/chart/?symbol=OANDA:AUDUSD').catch(() => {}) // empty catch — failure vanishes, no log, no metric, `
**Problem:** engine.silentDegrade Contract at tools/plutus-tools.ts:23
**Runtime Impact:** Hydra gate finding — requires adjudication
**Fix:** spec/engine.md:22 Degrade/fallback branches must log + propagate or emit metric — silent swallow is forbidden

### [R21-lasme-engine] engine.unguardedWrite.Contract — HIGH (confidence: 0.90 — CRITICAL)

**File:** `tvi/vst.ts:89`
**Evidence:** `mkdirSync(dirname(dbPath), { recursive: true }); // no existence check, no try/catch, no permission check — constructor is engine-critical`
**Problem:** engine.unguardedWrite Contract at tvi/vst.ts:89
**Runtime Impact:** Hydra gate finding — requires adjudication
**Fix:** spec/engine.md:14 FS writes in critical paths must be guarded (existence check or try/catch log+rethrow or permission check with propagation)

### [R21-lasme-engine] engine.unguardedSideEffect.Contract — HIGH (confidence: 0.86 — HIGH)

**File:** `tools/plutus-omni-vision.ts:38`
**Evidence:** `return fs.readFileSync(filePath).toString('base64'); // readFileSync with no try/catch, no existence check — engine-critical VLM pipeline`
**Problem:** engine.unguardedSideEffect Contract at tools/plutus-omni-vision.ts:38
**Runtime Impact:** Hydra gate finding — requires adjudication
**Fix:** spec/engine.md:18 Engine-critical side effects must follow error-path-first discipline: catch must log+recover or propagate, never empty/unhandled

### [R22-lasme-adapter] adapter.snapshot-merge.Contract — HIGH (confidence: 0.88 — HIGH)

**File:** `tvi/veb.ts:172`
**Evidence:** `Object.assign(this.ctx, patch);`
**Problem:** adapter.snapshot-merge Contract at tvi/veb.ts:172
**Runtime Impact:** Hydra gate finding — requires adjudication
**Fix:** PLUTUS_TVI_DESIGN_SPEC.md:§5.3 VEB context bridge must guard snapshot merge against undefined overwrite — adapter snapshot-merge integrity

### [R22-lasme-adapter] adapter.snapshot-merge.Contract — HIGH (confidence: 0.84 — HIGH)

**File:** `vei/wire.ts:158`
**Evidence:** `return { ...observed, ...getPipelineContext() };`
**Problem:** adapter.snapshot-merge Contract at vei/wire.ts:158
**Runtime Impact:** Hydra gate finding — requires adjudication
**Fix:** PLUTUS_TVI_DESIGN_SPEC.md:§10.3 VEI observed context merge must guard against undefined overwrite

### [R23-lasme-mpse-threshold] mpse.threshold.Contract — HIGH (confidence: 0.88 — HIGH)

**File:** `vkg/validation.ts:101`
**Evidence:** `condition: (s) => isVerif(s) && s.zone !== undefined && s.pair !== 'DXY' && Math.abs(mid(s.zone) - s.spot) > 0.020,`
**Problem:** mpse.threshold Contract at src/tvi/vkg/validation.ts:101
**Runtime Impact:** Hydra gate finding — requires adjudication
**Fix:** src/tvi/veb.ts:24 FX_MAX_DIST=0.02 canonical (PLUTUS_TVI_DESIGN_SPEC §3.2 B-006 distance guard) — validation uses bare 0.020 without import and without calib: reconciliation

### [R23-lasme-mpse-threshold] mpse.threshold.Contract — HIGH (confidence: 0.88 — HIGH)

**File:** `vkg/validation.ts:108`
**Evidence:** `condition: (s) => isVerif(s) && s.zone !== undefined && s.pair === 'DXY' && Math.abs(mid(s.zone) - s.spot) > 2.00,`
**Problem:** mpse.threshold Contract at src/tvi/vkg/validation.ts:108
**Runtime Impact:** Hydra gate finding — requires adjudication
**Fix:** src/tvi/veb.ts:23 DXY_MAX_DIST=2.0 canonical (PLUTUS_TVI_DESIGN_SPEC §3.2 B-007) — validation uses bare 2.00 without named constant and without calib: comment

### [R18-lasme-meta] lasme-meta.append-only.TVIOrchestrator.synthesizeAndClear — HIGH (confidence: 0.92 — CRITICAL)

**File:** `tvi/orchestrator.ts:44`
**Evidence:** `findings.length = 0;`
**Problem:** lasme-meta.append-only TVIOrchestrator.synthesizeAndClear at /home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident_Agent/Active_Projects/Plutus_Agent/src/tvi/orchestrator.ts:44
**Runtime Impact:** Hydra gate finding — requires adjudication
**Fix:** THE ORCHESTRATOR LAW #5 APPEND-ONLY — you append to doc1/doc2; you never rewrite what a prior meta layer wrote

### [R18-lasme-meta] lasme-meta.append-only.VisualGuidanceSystem.drainFindings — HIGH (confidence: 0.90 — CRITICAL)

**File:** `tvi/vgs.ts:109`
**Evidence:** `this.findingsQueue = [];`
**Problem:** lasme-meta.append-only VisualGuidanceSystem.drainFindings at /home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident_Agent/Active_Projects/Plutus_Agent/src/tvi/vgs.ts:109
**Runtime Impact:** Hydra gate finding — requires adjudication
**Fix:** THE ORCHESTRATOR LAW #5 APPEND-ONLY and STITCH CONTRACT verbatim preservation — clearance truncates ledger instead of appending

### [R18-lasme-meta] lasme-meta.god-node.PipelineRunContext.currentRun — HIGH (confidence: 0.88 — HIGH)

**File:** `pipeline/engine.ts:98`
**Evidence:** `let currentRun: PipelineRunContext | null = null;`
**Problem:** lasme-meta.god-node PipelineRunContext.currentRun at /home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident_Agent/Active_Projects/Plutus_Agent/src/pipeline/engine.ts:98
**Runtime Impact:** Hydra gate finding — requires adjudication
**Fix:** GRAPH TOOLS USAGE LAW #6 god nodes are single points of failure + THE ORCHESTRATOR LAW #5 APPEND-ONLY — global mutable singleton overwritten per ensureContext/resetContext instead of append-only ledger

## MEDIUM — Quality Issues

- [R1] `identity/index.ts:68` — Hook handler missing the output contract — export function formatIdentityHeader(_bundle: IdentityBundle): string {
  return `[PLUTUS v3.0 IDENTITY BINDING]

You ar (conf: 0.60)
- [R1] `hooks/system-transform.ts:48` — Hook handler missing the output contract — export function createSystemTransformHook(): Hooks['experimental.chat.system.transform'] {
  return async (input: Record (conf: 0.60)
- [R1] `hooks/system-transform.ts:49` — Hook handler missing the output contract — async (input: Record<string, unknown>, output: Record<string, unknown>) => {
    const systemOut = output as { system?:  (conf: 0.60)
- [R1] `hooks/tool-allowlist.ts:95` — Hook handler missing the output contract — export function createToolBeforeHook(): Hooks['tool.execute.before'] {
  return async (input: Record<string, unknown>, _ (conf: 0.60)
- [R1] `hooks/chat-message.ts:5` — Hook handler missing the output contract — export function createChatMessageHook(): Hooks['chat.message'] {
  return async (input: Record<string, unknown>, _output (conf: 0.60)
- [R1] `src/index.ts:80` — Hook handler missing the output contract — export default async function PlutusAgent(input: PluginInput): Promise<Hooks> {
  // ── Cross-plugin isolation guard ──
 (conf: 0.60)
- [R1] `src/index.ts:196` — Hook handler missing the output contract — async (input, output) => {
      // Existing allowlist + browser firewall runs first.
      await baseToolBefore?.(input (conf: 0.60)
- [R1] `core/engine.ts:42` — Hook handler missing the output contract — export function dispatchDirective(body: string, adapter: PlatformAdapter): void {
  const prefixed = `[PTA GATE] ${body} (conf: 0.60)
- [R1] `hooks/bridge-hook.ts:6` — Hook handler missing the output contract — export function wireBridgeHooks(bridge: PbaBridgeImpl, opts?: { targetAgent?: string }) {
  const target = opts?.targetA (conf: 0.60)
- [R3] `pipeline/hooks.ts:102` — Export "getEscalatedPush" is defined but never imported by any file in the project (conf: 0.80)
- [R3] `brains/9-pillar-lobe.ts:1480` — Export "convertOptionStrikeToDXY" is defined but never imported by any file in the project (conf: 0.80)
- [R3] `lexicons/candle-pressure.ts:366` — Export "candleSideVote" is defined but never imported by any file in the project (conf: 0.80)
- [R3] `lexicons/zone-classification.ts:58` — Export "opposingProximityPips" is defined but never imported by any file in the project (conf: 0.80)
- [R3] `lexicons/zone-pressure.ts:270` — Export "pressureScoreOf" is defined but never imported by any file in the project (conf: 0.80)
- [R3] `lexicons/shape-chain.ts:223` — Export "unifiedMacroShape" is defined but never imported by any file in the project (conf: 0.80)
- [R3] `mdve/temporal.ts:84` — Export "dayOpenSpotAt" is defined but never imported by any file in the project (conf: 0.80)
- [R3] `mdve/temporal.ts:97` — Export "lockRunAnchor" is defined but never imported by any file in the project (conf: 0.80)
- [R3] `mdve/bom-mom.ts:169` — Export "displacementAfter" is defined but never imported by any file in the project (conf: 0.80)
- [R3] `mdve/bom-mom.ts:243` — Export "legEstablished" is defined but never imported by any file in the project (conf: 0.80)
- [R3] `mdve/bom-mom.ts:275` — Export "consolidationAnatomy" is defined but never imported by any file in the project (conf: 0.80)

... and 454 more medium findings

---

## Layer Summary

| Layer | Name | Findings | Avg Confidence | Evidence Suppressed |
|-------|------|----------|---------------|--------------------|
| R1 | Hook Contract | 9 | 0.60 | no |
| R2 | Error Handling | 13 | 0.95 | no |
| R3 | Source Hygiene | 433 | 0.80 | no |
| R4 | Data Flow Analysis | 23 | 0.75 | no |
| R5 | Theatrical Integrity (D1-D10) | 4 | 0.90 | no |
| r-lexicon | LASME Lexicon (structural) | 0 | 0.00 | no |
| r-actor | LASME Actor (structural) | 0 | 0.00 | no |
| r-state-machine | LASME State Machine (structural) | 0 | 0.00 | no |
| r-engine | LASME Engine (structural) | 0 | 0.00 | no |
| r-adapter | LASME Adapter (structural) | 0 | 0.00 | no |
| r-mpse | MPSE Contract | 0 | 0.00 | no |
| r-graph | SRO Graph Wiring (structural) | 0 | 0.00 | no |
| r-dh-feed | Hunter Feed (re-adjudicated) | 0 | 0.00 | no |
| r-provenance | Spec Provenance (TRACE_GAP) | 0 | 0.00 | no |

## Audit Meta — Transparency Report

| Metric | Value |
|--------|-------|
| Call Graph Coverage | 92% (21681/23664 resolved) |
| Type Checker | Available |
| Self-Audit | No |
| Suppressed Below Floor | 0 findings below 0.50 confidence |

### Known Blind Spots

- Oracle: calibratedPredicateRatio=1.00 oraclePassRate=0.96 immortalDensity=1.06 hydraMass=0.81 health=0.97

*Generated by Trident v4.3 AST-Powered Audit Engine*
*Confidence-weighted | Call-graph-aware | Mechanical-evidence-gated*


[FINAL]
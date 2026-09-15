# R21-lasme-engine — Engine Side-Effect Integrity Hunt

## Hunt Narrative
TargetRoot: /home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident_Agent/Active_Projects/Plutus_Agent/src
Graph tools queried first per LAW 1 — all returned `mcp.callTool is not a function` (graph unavailable). Fallback to mechanical file reads under targetRoot. Hunt covered (a) unguarded writes, (b) silent degrade, (c) container deploy surface, (d) unguarded side effects in critical paths.

## FINDING: Silent degrade — browser navigation failure swallowed without log or metric
- layer: R21-lasme-engine
- predicate: engine.silentDegrade
- object: Contract
- file: tools/plutus-tools.ts:23
- evidence: "navigateHeadedBrowser('https://www.tradingview.com/chart/?symbol=OANDA:AUDUSD').catch(() => {}) // empty catch — failure vanishes, no log, no metric, no propagation"
- spec: spec/engine.md:22 Degrade/fallback branches must log + propagate or emit metric — silent swallow is forbidden
- severity: HIGH
- confidence: 0.95

## FINDING: Silent degrade — identity load FS failure returns empty bundle without logging
- layer: R21-lasme-engine
- predicate: engine.silentDegrade
- object: Contract
- file: identity/index.ts:54
- evidence: "} catch (_e) { return { role, name: 'plutus', version: 'v3.0', files: {} }; } // swallow FS readdir/read failure — no log, no metric"
- spec: spec/engine.md:22 Degrade branches that swallow failures without logging or metric are forbidden
- severity: MEDIUM
- confidence: 0.88

## FINDING: Unguarded filesystem write — VST state directory creation with no guard in critical path
- layer: R21-lasme-engine
- predicate: engine.unguardedWrite
- object: Contract
- file: tvi/vst.ts:89
- evidence: "mkdirSync(dirname(dbPath), { recursive: true }); // no existence check, no try/catch, no permission check — constructor is engine-critical"
- spec: spec/engine.md:14 FS writes in critical paths must be guarded (existence check or try/catch log+rethrow or permission check with propagation)
- severity: HIGH
- confidence: 0.90

## FINDING: Unguarded filesystem write — omni-vision tmp dir creation with no guard in artifact path
- layer: R21-lasme-engine
- predicate: engine.unguardedWrite
- object: Contract
- file: tools/plutus-omni-vision.ts:73
- evidence: "fs.mkdirSync(tmpDir, { recursive: true }); // no try/catch, no existence check — called from plutus-omni-vision video frame extraction"
- spec: spec/engine.md:14 FS writes in critical paths must be guarded
- severity: MEDIUM
- confidence: 0.87

## FINDING: Silent degrade — file existence check swallows FS error without logging
- layer: R21-lasme-engine
- predicate: engine.silentDegrade
- object: Contract
- file: tools/plutus-omni-vision.ts:45
- evidence: "} catch { return false; } // fileExists helper — FS error swallowed, returns false as if file missing, no log"
- spec: spec/engine.md:22 Silent degrade — fallback that swallows failure without logging is forbidden
- severity: LOW
- confidence: 0.82

## FINDING: Unguarded side effect — encodeBase64 file read with no guard in critical VLM path
- layer: R21-lasme-engine
- predicate: engine.unguardedSideEffect
- object: Contract
- file: tools/plutus-omni-vision.ts:38
- evidence: "return fs.readFileSync(filePath).toString('base64'); // readFileSync with no try/catch, no existence check — engine-critical VLM pipeline"
- spec: spec/engine.md:18 Engine-critical side effects must follow error-path-first discipline: catch must log+recover or propagate, never empty/unhandled
- severity: HIGH
- confidence: 0.86

## SUMMARY
6 findings — 3 HIGH, 2 MEDIUM, 1 LOW. All findings are inside targetRoot with verbatim quotes. Most critical is tools/plutus-tools.ts:23 empty catch — textbook silent degrade. Recommend wrapping FS side effects in try/catch log+propagate and replacing empty catches with log+metric+propagate via toPipelineError pattern. Graph unavailable — all findings via direct file reads.

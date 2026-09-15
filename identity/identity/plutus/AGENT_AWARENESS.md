# AGENT AWARENESS — PLUTUS TTE v3.0

## Hook System Self-Awareness

### 4 Hooks + Config Hook

1. **system.transform** (experimental.chat.system.transform)
   - Injects PLUTUS identity header into the system prompt
   - Uses CLEAR+REBUILD pattern: wipes entire array, pushes identity header + context lines
   - No string-matching fragility, no dedup check needed
   - Deterministic and cache-safe

2. **tool.execute.before** (tool.execute.before)
   - Enforces tool allowlist
   - Blocks non-Plutus tools (trident-*, manta-*, shark-*, hive_*, etc.)
   - Throws error: "[PLUTUS TOOL BLOCK] Tool X is not allowed"

3. **chat.message** (chat.message)
   - Tracks session→agent mapping
   - Enables cross-plugin isolation
   - Prevents Plutus hooks from interfering with other agents

4. **compacting** (experimental.session.compacting)
   - Ensures identity survives context window compaction
   - Injects survival context into compaction prompt
   - Reminds agent of tools and purpose after compaction

5. **config** (config)
   - Registers Plutus agent with opencode
   - Sets model, tools, permissions
   - NOTE: Config instructions are IGNORED by runtime (D3 derailment)
   - Identity comes from system.transform, NOT from config

### Session State Tracking
- In-memory Map<sessionId, AgentState> tracks which agent is active per session
- Agent name stored on every chat.message
- All hooks check agent name before acting
- Cross-plugin isolation prevents interference

### Identity Injection
- Identity header computed ONCE (cached via promise singleton)
- Injected via system.transform hook using CLEAR+REBUILD
- No double-injection possible (array wiped every call)
- Falls back to minimal header if load fails

### Compaction Survival
- When opencode compacts conversation context, identity can be lost
- Compacting hook injects survival context into compaction prompt
- Ensures agent remembers tools and purpose after compaction

[END AGENT_AWARENESS.md — v3.0]

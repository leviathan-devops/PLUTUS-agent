# CHECKPOINT STRUCTURE — pre-v5-baseline-4.5.3

```
Checkpoints/pre-v5-baseline-4.5.3/
├── src/                         # 149 .ts — 4.5.3 working fork
├── hydra/                       # pin pack (MASTER PATHS SCOPE LAUNCH)
├── MASTER_CONTEXT/              # V5 spec + injector (docs)
├── specs/ mpse fixtures harness # empty lock roots
├── scripts/                     # empty lock root
├── wave-audit/ data/            # present as copied
├── package.json bun.lock tsconfig*.json .gitignore
├── report-v452.ts report_v452.md MANIFEST.md
├── PLUTUS_V4.5.2_BUILD_REPORT.md
├── PLUTUS_V4.5.2_ZR7C_E2E_WIRING_SPEC.md
├── PLUTUS_V4.5.3_BUILD_SPEC.md
├── diag-lmv-golden-fx.ts
├── CHECKPOINT_MANIFEST.md
└── CHECKPOINT_STRUCTURE.md      # this file
```

ABSENT on purpose (named in the manifest): dist/, context_management/, the 5 ship docs, node_modules, Checkpoints/ (no nesting), graphify-out, corbell-data, sqlite DBs.

File counts at write: src .ts = 149. Top-level dirs/files listed above. Empty hydra lock dirs carry `.keep` where otherwise git-untrackable.

State: pre-build snapshot. Honest gaps in the sibling manifest. Do not rebuild a running agent from this folder without first installing deps (`bun install`) and knowing dist is missing.

Counts at write:
- src .ts = 149
- checkpoint files ~250 before manifests
- frozen pair MATCH (see sibling manifest)

Recovery:
1. Copy this folder over a clean plutus/main checkout OR check it out from git.
2. bun install (node_modules not stored).
3. There is no dist. Do not claim a deployable.
4. Empty lock dirs are ownership markers for V5 waves, not missing src.

Honest gaps stay in CHECKPOINT_MANIFEST.md. This file is the map, not the verdict.

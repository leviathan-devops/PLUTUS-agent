# PLUTUS V5 HYDRA MASTER PROMPT — ORCHESTRATOR SPINE

Generated: 2026-09-15
Workspace: `/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/PLUTUS/agent`
Git: nested repo, HEAD `plutus/main` @ `282b1a3` (fork of Checkpoints/v4.5.3_CLEAN_BASELINE)
Overlay copy-source: `plutus/pre-v5-overlay` @ `f5ee436` (e1/e2/kernel/jesl live tree)
Parent Shared_Workspace git is `autoresearch/puffer-20250915` and IGNORES this tree.
Do not commit Plutus work into the puffer branch. Do not `git checkout` overlay onto main.

HONEST_CLASS=product_tui
DENSITY=multi_dimension
N=5
WAVES=10
Shape B MACRO

This file is the compaction-proof orchestrator spine. A fresh session reads
THIS + PATHS.md + the five SCOPE-*.md + MASTER_CONTEXT/PLUTUS_V5_FULL_BUILD_SPEC.md
§1-§8 + Checkpoints/v4.5.3_CLEAN_BASELINE/MANIFEST.md and can run without
renegotiating rulings.

## §0 ABSORB ORDER (first turn, no dispatch until done)

1. `hydra/MASTER_PROMPT.md` (this file) fully.
2. `hydra/PATHS.md` — lock write sets. Violating a write set is SCOPE-CREEP.
3. `hydra/SCOPE-foundation.md` `SCOPE-e1.md` `SCOPE-e2.md` `SCOPE-cardvis.md` `SCOPE-kernel.md`
4. `MASTER_CONTEXT/PLUTUS_MASTER_CONTEXT_INJECTOR.md` §0-§1 (R1-R34, D13).
5. `MASTER_CONTEXT/PLUTUS_V5_FULL_BUILD_SPEC.md` §1 problem, §2 two-machine split,
   §5 scope 20 items, §6 SC-1..SC-27, §7 container angles, §8 W0-W8.
6. `Checkpoints/v4.5.3_CLEAN_BASELINE/MANIFEST.md` — 12/21 ≤3p, 17 gates, frozen pair.
7. Re-verify frozen pair YOURSELF this turn (commands in §2). Red = stop.

Doctrine is QUOTED (D13). Anything unquotable does not get built.
R1: E3 is a natural RESULT of E1+E2. R2: E1→E2→E3 builds on the previous.
R3: E3 must not override E1/E2 data architecture.
Frozen pair is FROZEN. A lock that diffs sl-lmv.ts or trade-dedup.ts is FIREWALL red.

## §1 CURRENT STATE (measured 2026-09-15, re-verify on pin)

- Nested git root = this directory. GIT_DIR == GIT_COMMON (primary checkout, not a
  linked worktree of Shared_Workspace).
- `plutus/main` 282b1a3 = 4.5.3 src at repo root + V5 spec docs + package.json.
- `plutus/pre-v5-overlay` f5ee436 = migrated live tree (src/e1 e2 kernel jesl card).
  Copy-source only. Vendor-in per-wave, then rebuild to spec.
- src .ts on main = 149. No e1/e2/kernel/jesl files on HEAD (empty lock dirs
  were mkdir'd for hydra ownership; they are empty until waves land).
- bun install 169 packages. bun test = 0 test files (honest gap, not green).
- No dist/. No context_management/ on this checkout. No ship docs yet.
  Goal creates BUILD_REPORT.md + DEBUG_LOG.md on first audited wave.
- Feature worktrees live at `.worktrees/<name>` (gitignored). Optional.
  Default: implement on plutus/main. Feature branch: `git worktree add .worktrees/w2-e1 -b plutus/w2-e1`
- Session status bar showing `autoresearch/puffer-20250915` is the PARENT
  Shared_Workspace repo. It is not this repo. Ignore it for V5 work.

## §2 PREFLIGHT (goal re-runs YOURSELF; red stops launch)

```
git rev-parse --abbrev-ref HEAD
# expected: plutus/main

git rev-parse --short HEAD
# expected: 282b1a3  (or a descendant that still MATCHES frozen pair)

sha256sum src/mdve/sl-lmv.ts src/mdve/trade-dedup.ts
# expected:
# 912940832fac44bc838d53423cbb921eff501de60a9f2641bf20c1d1497eaeab  src/mdve/sl-lmv.ts
# 33914c897e7775402eefd7d13a5d3675667a2ace576b55a689bc864401a680e4  src/mdve/trade-dedup.ts

find src -name '*.ts' | wc -l
# expected at pin: 149  (grows after waves; never shrinks frozen files)

bun test
# expected at pin: 0 test files  (NOT a pass; W1 must land tests)

test -f MASTER_CONTEXT/PLUTUS_V5_FULL_BUILD_SPEC.md
# expected: 0
```

Red preflight = frozen mismatch OR not on plutus/main OR V5 spec missing.
Fix first. No dispatch on red.

After W1, GATE-CLASS must be invocable:

```
python3 scripts/rebuild-fixture.py --verify
bun report-v452.ts
bun diag-reasoning-chain-golden.ts --day=2026-07-06
sha256sum src/mdve/sl-lmv.ts src/mdve/trade-dedup.ts
```

Stop on first GATE-CLASS red. Diag-class: PASS count >= 8, no NEW fails vs
adjudicated set in plutus-pipeline-testing-scripts skill.

## §3 TWO-MACHINE LAW (the architecture the waves implement)

Machine 1 CARD GENERATOR = e1 lock + e2 lock + cardvis lock.
Output = plutus-card-v1.json (zod). Independently testable.

Machine 2 KERNEL = kernel lock.
Input = the card. Independently testable. Replayable journal.

ONLY coupling = the card schema. Kernel that re-derives E1 zones from raw
bars is a SPEC VIOLATION (R3). Card generator that emits prices on
designations is a SPEC VIOLATION (SC-7).

Substrate (foundation lock) is JESL + Paragon + MPSE specs. Domain code
imports L3 contracts and L1 math. NEVER imports L4 Aether except through
bracketed generate nodes (chart verifier, STEP A/B).

## §4 LOCKS (N=5) — file sets are PATHS.md

1. god-loop-foundation — specs + scripts + jesl/substrate/runtime
2. god-loop-e1 — src/e1
3. god-loop-e2 — src/e2
4. god-loop-cardvis — src/card src/visual src/aether
5. god-loop-kernel — src/kernel src/enforcement

The /goal NEVER writes those trees. The /goal writes hydra docs, ship docs,
Checkpoints/v5-*, and package.json only when a lock files a change-request.

## §5 WAVES (interface-first; concurrent where files disjoint)

WAVES: 10

- W0 foundation: S-1..S-7 markdown + battery.json + golden-week.json + mutants
  files: specs/mpse/** specs/fixtures/**
  gate: 7 S-files exist; battery.json parses; 40/13 mutant CONTRADICTED not PASS
  dep: none

- W1 foundation: run-battery.sh + jesl hello-workflow + harness tests
  files: scripts/** specs/harness/** src/jesl/** src/substrate/** src/runtime/**
  gate: test -x scripts/run-battery.sh; hello-workflow {verdict:PASS, chainVerified:true}
        OR explicit missing-token until workflow exists; bun test specs/harness not 0 files
  dep: W0

- W2 e1: core types+engine + 6 machines + adapter + OBCV + actors + properties.ts
  files: src/e1/**
  gate: SC-2 500-run; SC-3 snapshot journaled; SC-4 verdicts on every zone;
        SC-5 FUTURE_BAR_LEAK throws on known-bad fixture
  dep: W0 types/oracles (read specs; do not write them)

- W3 e2: five machines + workflow + MPSE computations
  files: src/e2/**
  gate: SC-6 totality 90; SC-7 no price field; SC-8 side-inversion D17;
        SC-9 EU #2 ≤3p; SC-10 golden ≥12/21
  dep: W2 interface (ZoneMapSnapshot types ONLY)

- W4 cardvis: TV adapter + drawer + screenshot + chart-verifier
  files: src/visual/** src/aether/**
  gate: SC-11 12 grades; SC-12 corrupt PNG → GRADE:FAIL + context (native read)
  dep: W2+W3 types

- W5 cardvis: schema.ts assembler.ts validator.ts STEP A/B grounding
  files: src/card/**
  gate: SC-13 zod exit 0; SC-14 orphan IDs=0; SC-15 W-1 fires
  dep: W4 (screenshots may be stubbed FAIL until TV live; schema must still validate)

- W6 kernel: card-loader + L1..L5 + trade-computer + journal
  files: src/kernel/*.ts except report-*
  gate: SC-16 provenance; SC-17 three golden rows ≤3p; SC-18 ≥14/21 + DXY 6/6;
        SC-19 frozen MATCH; SC-20 sha ×2; SC-21 Monday 5/5; SC-22 f(T) VALID
  dep: W5 card schema

- W7 kernel: report-generator + report-validator
  files: src/kernel/report-generator.ts src/kernel/report-validator.ts
  gate: SC-23 validator PASS
  dep: W6

- W8 kernel: PBA/PTA sentinels + hunt profile
  files: src/enforcement/**
  gate: SC-24 conformanceZero on touched kernel files
  dep: W6

- W9 orch (goal, not a lock): decommission killed heuristics + multi-week + checkpoint
  files: goal-owned (Checkpoints/v5-W9-*, grep of killed patterns)
  gate: SC-25 ≥15/21 + multi-week; SC-26 price-anchor findings=0; SC-27 killed patterns=0
  dep: W7 W8

W2 and W1 MAY run in parallel (disjoint files). W3 starts when W2 types exist
on disk (tsc of the interface), not when e1 is "done". W6 starts when card
schema exists on disk. Integration serializes at W9.

## §6 ORCHESTRATOR DUTIES (pinned into /goal — do in this order)

1. ABSORB §0 this turn. State current git SHA + frozen pair + empty-lock-dir truth.
2. PREFLIGHT §2 YOURSELF. Post the four command outputs. Red = stop.
3. DISPATCH via default.task ONE batch. First batch = W0 foundation desk only
   if specs missing; then W1+W2 parallel; never all 10 at once on empty dirs.
   Each task prompt is DPL1-grade: MISSION / READ FIRST / KNOWN STATE /
   TASKS WHAT-HOW-WHY / CONSTRAINTS / VERIFICATION / RETURN.
   Filepaths in the task MUST exist (lock dirs were mkdir'd).
4. BOUNDARIES: `bun run typecheck` (tsc --noEmit) on combined tree BEFORE
   firing a dependent lock. Red = wait/fix. Do not fire W3 if e1 types missing.
5. AUDIT: write `.trident/wave-audit/<wave>.md` per return. Hunk verdicts
   CORRECT / FLAWED / FITTED-TO-GOLDEN / SCOPE-CREEP. Returned-but-unaudited
   stays in_progress on default.todo.
6. RED-TEAM ≥3 before happy path (see §8). Findings → fix desks, not ignore.
7. VISION: chart PNGs graded by native `read` on the PNG. GRADE:PASS/FLAW/BLOCKED.
   External VLM is not the required path. Software-GL screenshots are void.
8. RECORD: append BUILD_REPORT.md + DEBUG_LOG.md after every audited wave.
   Checkpoint: `Checkpoints/v5-W<n>-<state>/` hyphens only, src copied, manifest
   with honest gaps. `git add Checkpoints/<TOKEN>` never `git add -A`.
9. STAMP COMPLETE only when SC-19 MATCH + SC-20 ×2 + SC-21 5/5 + SC-25 ≥15/21
   + SC-26 zero price-anchors + GATE-CLASS green. Anything else is a labeled
   status report. Never stamp Achieved on a sub-inner lock.
10. AUTONOMY: no "should I continue". Forks: (a) overlay vendor-in vs rewrite —
    default rewrite-to-spec after copy; (b) TV live vs stub screenshots —
    default stub FAIL until W4 gate can run headed; (c) report TS vs python —
    default TS. Surface only: gate fails 3×, architectural fork, or completion.

Mechanisms (OMP-native only): default.task, default.todo, default.hub,
default.bash (cwd=this repo, no cd), default.read/grep/glob,
default.container-testing for product_tui plugin proof AFTER GATE-CLASS green.
BANNED in this loop: trident-poseidon, trident-scout, trident-build,
trident-explore, trident-wave-manager, trident-preflight,
trident-container-test, trident-status, todowrite, /poseidon.

## §7 SHIP BAR (COMPLETE is all of these, nothing less)

- Frozen pair MATCH on HEAD.
- GATE-CLASS 0-3 green (fixture, report sha ×2, golden-gate day=2026-07-06, frozen).
- SC-6 totality 90. SC-7 no designation price field.
- SC-13 card zod exit 0 on golden-week.
- SC-16 journal provenance card→L5.
- SC-21 Monday 5/5 ≤3p.
- SC-25 golden ≥15/21 + at least one unrelated week OR honest residual named.
- SC-26 grep/hunter price-anchor findings = 0 on e2 selection + golden-gate.
- product_tui: container-testing action against OMP TUI showing plutus tools
  registered, after GATE-CLASS green. Dual FRESH. BR gate. Not a host-pytest ship.
- Checkpoints/v5-W9-* exists with src + manifest + honest gaps.
- BUILD_REPORT.md + DEBUG_LOG.md current.

## §8 ADVERSARIAL (tool-result tokens, never typed PASS)

1. FUTURE_BAR_LEAK: bar.timestamp > anchorMs → throw/token `FUTURE_BAR_LEAK`.
   Fail token: accepted-future-bar.
2. SIDE_INVERSION: v4.5.2 mutant → `SIDE_INVERSION_VIOLATION`. v4.5.3 row silent.
   Fail token: silent-on-mutant.
3. CARD_INVALID: malformed json missing e1.zones → schema refuse `CARD_INVALID`.
   Fail token: accepted-invalid-input.
4. FROZEN_FIREWALL: edit sl-lmv.ts in a lock → orchestrator sha mismatch HARD STOP.
   Fail token: file written / sha drift.
5. CHART_FAIL: truncated PNG → GRADE:FAIL + context. Fail token: GRADE:PASS on junk.
6. NO_DXY_INVERSE: EU trade without inverse mapping → L4 fail, trade not emitted.
   Fail token: trade emitted.

≥3 of these MUST run before any happy-path golden claim. A generic gate
preempting a specific token = UNOBSERVED, not PASS.

## §9 ANTI-PATTERNS (instant FAIL)

- Solo /goal writes src/e1 or src/kernel.
- Second /goal.
- One fat workflow for all five locks.
- Overlapping write sets.
- Thin-prompt dispatch (missing MISSION/VERIFY/RETURN).
- Sequential-brain W2 then W3 while W1 idle if files disjoint.
- Claim-without-rerun (trusting subagent exit codes).
- bun test 0 files sold as green.
- Smoke-as-ship.
- External-VLM-only chart grade.
- Stale trident tool names in a dispatch.
- git add -A (secrets, node_modules, parent puffer files).
- Merging overlay onto main.
- Hardcoded prices in e2 selection (G1/G2 class).
- E3/kernel overriding E1/E2 (R3).
- Committing OPENCODE keys. Keys from env only.

## §10 RESUME (compaction)

If compacted: read this file §0-§1, `git status` in this repo (not parent),
frozen pair, last `.trident/wave-audit/*`, BUILD_REPORT tail, then continue
the first wave whose gate is not on disk. Do not restart W0 if S-1..S-7 exist.

## §11 PARENT GIT vs THIS GIT (operator confusion, standing)

This OMP session cwd is Shared_Workspace. Its status bar shows
`autoresearch/puffer-20250915` because THAT is the parent repo branch.
Plutus V5 history is the nested repo at PLUTUS/agent on `plutus/main`.
`git worktree list` inside agent shows one checkout: this directory.
`.worktrees/` is where OPTIONAL extra branches of THIS nested repo go.
None of that changes the parent status bar. Do not try to "fix" the
status bar by committing Plutus into puffer.

## §12 COPY-SOURCE RULE

When a wave needs jesl/e1/e2/kernel code that already exists on overlay:

```
git show plutus/pre-v5-overlay:src/<path> > /tmp/ref
```

Read it. Port to the lock dir against V5 spec. Do not `git checkout overlay -- src/`
onto main (that would dump the whole live tree and undo the clean 4.5.3 line).

## §13 CHECKPOINT RULE (goal-owned)

Name: `v5-W<n>-<state>` hyphens only. Copy src (the then-current tree),
specs, hydra, V5 spec, MANIFEST with SHA + honest gaps. No spaces.
`git add "Checkpoints/<TOKEN>"` then commit on plutus/main.
Secret scan before commit. No `sk-` provider keys.

## §14 SUCCESS NUMBERS (from V5 spec + MANIFEST — not estimates)

- Frozen pair: 91294083… / 33914c89…
- Baseline grade to beat: 12/21 ≤3p, 16/21 ≤5p, 19/21 ≤10p, 17 gates
- Totality: 90 rows
- Monday: DXY S 101.140 / DXY L 100.945 / EU S 1.14395 / EU L 1.14110 / GU L 1.33330
- RRR planned ≥ 3.0 (spec S-5 floor 2.5)
- f(T)=N×(1+P)=24 oracle VALID
- Determinism: report sha ×2 identical

End of spine. Locks read their SCOPE. Goal never implements.

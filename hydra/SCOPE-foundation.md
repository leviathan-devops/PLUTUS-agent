# SCOPE — god-loop-foundation

WRITE: specs/mpse specs/fixtures specs/harness scripts src/jesl src/substrate src/runtime
NEVER: src/e1 src/e2 src/card src/visual src/aether src/kernel src/enforcement frozen pair package.json

## Deliverable
W0 math corpus S-1..S-7 + golden-week.json + mutants. W1 JESL hello-workflow
+ run-battery.sh that wraps the canon GATE-CLASS commands.

## Gates
- `ls specs/mpse/S-{1,2,3,4,5,6,7}-*.md` = 7 files
- `python3 -c "import json; json.load(open('specs/mpse/battery.json'))"` has fingerprint key
- `test -x scripts/run-battery.sh`
- known-bad: mutant battery row 40/13 must CONTRADICT not PASS
- `bun src/jesl` hello-workflow receipt `{verdict:PASS, chainVerified:true}` OR loud missing until W1 lands
- frozen pair sha MATCH after every write

## Copy-source
`git show plutus/pre-v5-overlay:src/jesl` is READ. Vendor-in then rebuild to V5 spec.
Do not checkout overlay onto main.

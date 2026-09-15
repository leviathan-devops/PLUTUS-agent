# WAVE 3 recapture — clipped bars_raw (bd09) this cycle

Not WAVE 4 stamp. Not /goal done.

## Feeds
- decision `/tmp/opencode/bars_raw.json` sha `bd09f2b88ccaffd66a1f034c1c05147703ab98cf8bf40fcd8ea1b37965cfeb5c` max_t=1783317600000 le_anchor
- week `/tmp/opencode/bars_raw.week.json` sha `24fe22c8…` outcome/G8 only
- BARS_FIXTURE=clipped for both orch pairs

## Golden orch sequential ×2
report sha `9689cd8a1237fe1f65af40d764dc8397a04fabf77641d2309cbd10c5bd282637` MATCH
Monday 5/5 ≤3p NATIVE from decision barsFor t<=anchor:
DXY LONG Δ2.7p · DXY SHORT Δ2.0p · EU SHORT Δ0.5p · EU LONG Δ1.5p (G1 ±2p) · GU LONG Δ1.3p
RRR 4.12 / 3.00 / 3.14 / 3.00 / 3.00 — all ≥3.0 (no RRR residual)
E2 Monday SS TRENCHES storyline in report_v452.md (honest-watch)

FEED-SPLIT: decision le_anchor=true · week FutureBarLeak THROW via shipped decodeMarketData

## Clipped-as-week experiment
BARS_WEEK_FIXTURE=bars_raw.json (clipped) → report sha IDENTICAL 9689cd8a.
This Monday report is insensitive to post-anchor 1H. 5/5 is not a week-24fe leak.

## G1/G4 — DOCUMENT not CLOSE
SC-5 named residuals: G1 EU fortress (no PHANTOM_BOM token; entry Δ1.5p still HIT) · G4 inversion (mirror YES, zone-elements opposed NO).
Storyline is SS TRENCHES not fortress. Inventing PHANTOM_BOM = fitted-to-golden. DIAG_EXIT=1 by design.
CLOSE=no ALLOWED_RESIDUAL=yes FITTED=banned
Evidence: `{SCRATCH}/g1g4-proof.txt`

## D13
emission comparators outside golden-gate.ts: 0
multiweek buildRowEvidence: fromBarsSupply last.C vs O, not row.dir (13/0 tests)
runPipeline no oracle
`{SCRATCH}/d13-grep.txt`

## Frozen / main
91294083… / 33914c89… · plutus/main e99377f · HEAD 898dd34

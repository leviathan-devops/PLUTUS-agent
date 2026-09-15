# S-6 — The Telescoping Law

spec: S-6
form: forall
sources: VISUAL_TELESCOPE_CHARTING_T2.md:2735, VISUAL_TELESCOPE_CHARTING_T2.md:1545, PLUTUS_V5_FULL_BUILD_SPEC.md:456, PLUTUS_V5_FULL_BUILD_SPEC.md:2009, PLUTUS_V4.5.3_BUILD_REPORT.md:160, VISUAL_TELESCOPE_CHARTING_T2.md:70

## Blocks

### B-1-nesting-subset — LTF zones nest inside HTF parents via ZoneModel.parent

quote: "4H zones define strategic direction. 1H/30m/15m zones refine it."
anchor: VISUAL_TELESCOPE_CHARTING_T2.md:2735
kind: subset
expr: FORALL z in {30m,1H} zones: parent(z) REQUIRED AND nested(z,parent(z)) where nested(a,b) <=> (a.floor>=b.floor AND a.ceiling<=b.ceiling) per VISUAL_TELESCOPE_CHARTING_T2.md:2744; chain 4H->1H->30m with a 4H ancestor for every 30m/1H zone; a nested LTF zone of the same type CANNOT contradict its HTF parent (VISUAL_TELESCOPE_CHARTING_T2.md:2736); kills F2 (maxBars=60 hid Jun-22 origins: without the 4H ancestor the nesting is unrepresentable)
oracle: O-0.3
fixtures: [golden-week]

### B-2-bom-origin-restriction — BoM origins on 4H and 1H only

quote: "BoM origins (4H/1H ONLY)"
anchor: PLUTUS_V5_FULL_BUILD_SPEC.md:456
kind: subset
expr: FORALL z with classification='BoM': z.tf IN {'4H','1H'}; equivalently (z.tf='4H' OR z.tf='1H') AND classification='BoM' is the ONLY admissible BoM-origin pair; a BoM claimed on 30m/15m is REJECT (reclassify MoM or reject per the zone-classification lexicon)
oracle: O-0.3
fixtures: [golden-week]

### B-3-thirty-minute-mom-only — 30m zones classify MoM only

quote: "30m MoM-only classification"
anchor: PLUTUS_V5_FULL_BUILD_SPEC.md:456
kind: subset
expr: FORALL z with z.tf='30m': z.classification='MoM'; 30m admits no BoM origins (by B-2) and no other classification on the BoM/MoM axis; the 30m Captain carries per-trade context, never move origins
oracle: O-0.3
fixtures: [golden-week]

### B-4-lqz-tf-mapping — LQZ detection on 1H/30m/15m rungs, never 4H

quote: "LQZ detection operates on 1H or 30m candlestick patterns — NEVER 4H"
anchor: PLUTUS_V5_FULL_BUILD_SPEC.md:2009
kind: subset
expr: lqzTFs={1H,30m,15m} (detector iterates exactly these three per VISUAL_TELESCOPE_CHARTING_T2.md:1545; 4H LQZ detection omitted: 4H is for BoM/MoM S/D, too coarse for wick clusters); rungs map 1H->30m->15m down the ladder; 4H LQZ = REJECT always
oracle: O-0.3
fixtures: [golden-week]

### B-5-hierarchy-authority — King/General/Captain set shape chain, setups, context; HTF outranks LTF

quote: "the 4H King (the E2 chain!) · the 1H General (the E3 setups!) · the 30m Captain (the per-trade context!) — HTF > LTF"
anchor: PLUTUS_V4.5.3_BUILD_REPORT.md:160
kind: subset
expr: authority(4H-King) > authority(1H-General) > authority(30m-Captain) > authority(15m-precision); the 4H King sets the E2 shape chain (per PLUTUS_V5_FULL_BUILD_SPEC.md:149 L1 HTF TELESCOPING 4H King->1H General->30m Captain->15m), the 1H General the trade setups, the 30m Captain the per-trade context, 15m the precision entries (entries at 1H/30m/15m edges, never 4H edges, per VISUAL_TELESCOPE_CHARTING_T2.md:70); pressure set by the HTF cascades down (PLUTUS_V4.5.3_BUILD_REPORT.md:161); THIN-SOURCE FLAG: the 15m Soldier label has no corpus anchor (zero hits in MASTER_CONTEXT) and is NOT asserted here
oracle: O-0.3
fixtures: [golden-week]

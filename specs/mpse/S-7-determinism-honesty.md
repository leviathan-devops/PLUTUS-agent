# S-7 — Determinism and Honesty

spec: S-7
form: process
sources: PLUTUS_V5_FULL_BUILD_SPEC.md:102, PLUTUS_V5_FULL_BUILD_SPEC.md:364, PLUTUS_V5_FULL_BUILD_SPEC.md:1601, PLUTUS_V5_FULL_BUILD_SPEC.md:615, PLUTUS_V5_FULL_BUILD_SPEC.md:272, PLUTUS_V5_FULL_BUILD_SPEC.md:273, DATA_PROVENANCE.md:219, DATA_PROVENANCE.md:133, PLUTUS_V5_FULL_BUILD_SPEC.md:804, PLUTUS_V5_FULL_BUILD_SPEC.md:1935

Declared W0, enforced W7: every block below binds all waves W1-W8. The process standing
criterion is SC-20 (same card → byte-identical report ×2) plus SC-19 (frozen pair
byte-identical through ALL waves). Error paths FIRST: every refusal below is a typed
Schema.TaggedError, never a silent skip.

## Blocks

### B-1-no-wall-clock — No wall-clock in any core

quote: "Determinism: same card → byte-identical report, sha256 ×2, no wall-clock"
anchor: PLUTUS_V5_FULL_BUILD_SPEC.md:102
kind: process
expr: FORBIDDEN in pipeline code: Date.now(), new Date(), performance.now(), Math.random() and any clock/entropy import (tsc-level import rule: grep Date.now|new Date|performance.now|Math.random over src/e1 src/e2 src/card src/kernel src/substrate => 0 hits); time enters ONLY as an injected parameter (anchorMs, runAnchorMs) threaded from the caller — the injected-clock rule; violation => typed REFUSAL at the Schema gate, never a quiet pass; error path: a core file importing a clock source fails the W7 LOGIC-LSP query (SC-23 gate) before any test runs
oracle: O-0.8
fixtures: [golden-week]

### B-2-content-hash — Every artifact is content-addressed

quote: "Frozen pair byte-identical through ALL waves"
anchor: PLUTUS_V5_FULL_BUILD_SPEC.md:272
kind: equality
expr: version(artifact) = sha256(bytes(artifact)); identity check: sha256(run1) == sha256(run2) == recorded (the SC-20 ×2 determinism statement); the frozen pair pins sha256 sl-lmv.ts = 912940832fac44bc838d53423cbb921eff501de60a9f2641bf20c1d1497eaeab and trade-dedup.ts = 33914c897e7775402eefd7d13a5d3675667a2ace576b55a689bc864401a680e4 (wave-plan B-1/B-2) — drift => FROZEN_FILE_TOUCHED FIRES and the wave STOPS; no version string is hand-assigned, every version is computed from the bytes
oracle: O-0.7
fixtures: [golden-week]

### B-3-honest-data — Zero fabricated fields, provenance or absence

quote: "IP lexicon family (honest zeros)"
anchor: PLUTUS_V5_FULL_BUILD_SPEC.md:615
kind: process
expr: FORALL emitted fields: value = measured(provenance) OR ABSENT-with-code (PILLAR_X_NO_DATA honest-zeros pattern; the reject path yields honest absence per spec:804, never a placeholder); the audit trail per measurement = {fixture SHA256, fetch timestamp ISO, broker per pair, run-anchor} (DATA_PROVENANCE.md:219); a measurement that cannot state all four facts is not auditable and is REFUSED; STALE-bucket honesty in stats: post-anchor bars are counted in the STALE bucket and reported as stale deltas, never folded into the live rate; error path: missing provenance => DESIGNATION_INCOMPLETE, never a zero-filled row dressed as data
oracle: O-0.3
fixtures: [golden-week]

### B-4-no-fabricated-defaults — The 0.5 confidence default dies

quote: "The `?? 0.5` confidence defaults                     → honest 0.05 + loud log"
anchor: PLUTUS_V5_FULL_BUILD_SPEC.md:1601
kind: equality
expr: confidenceUnknown() = 0.05 AND emit(LOUD manifest: AETHER_DEGRADE with causationId) — never `?? 0.5`; any `?? keyZoneId` fallback => DESIGNATION_INCOMPLETE, any `constructBasicSetups` fallback generator => capability-absence enforced, any NARRATIVE_SUPPRESSED path => reporting-layer dedup only (the B.W7.2 deletion list); UNVERIFIABLE is the terminal state when neither measurement nor honest default applies — the pipeline returns the UNVERIFIABLE token with its reason, never a confident-looking number; error path FIRST: the default branch logs + degrades before the happy path continues
oracle: O-0.3
fixtures: [golden-week]

### B-5-x2-determinism — Byte-identical across two runs or it did not happen

quote: "Determinism: same card → byte-identical report ×2"
anchor: PLUTUS_V5_FULL_BUILD_SPEC.md:273
kind: equality
expr: sha256(report(run1, card)) == sha256(report(run2, card)) byte-for-byte (the SC-20 standing criterion, W5+); run2 executes in a fresh process with only the card + anchorMs as inputs — no carried state, no cache, no wall-clock (binds B-1); mismatch => JOURNAL_CORRUPT or nondeterminism FIRES and the report is WITHHELD (a divergent report never ships as the current); tolerance claims are covered by the same law: any prose admitting looser pips than 3 => TOLERANCE_DRIFT FIRES (the 30-pip-tolerance mutant-7 row stays FIRE, never SILENT)
oracle: O-0.6
fixtures: [golden-week, tolerance-drift]

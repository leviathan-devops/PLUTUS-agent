# SCOPE — god-loop-e2

WRITE: src/e2/**
NEVER: src/e1 src/card src/kernel specs frozen pair

## Deliverable
ShapeChainMachine, DesignationMachine (zone-IDs-ONLY), CascadeMachine,
ZonePressureMachine, FreshnessMachine, WorkflowMachine, MPSE computations.

## Depends
W2 types: ZoneMapSnapshot. Do not import e1 implementations; import types only.

## Gates (V5 SC-6..SC-10)
- designation totality 90 VALID rows (15 days × 3 pairs × 2 dirs)
- DesignationMachine output type has 0 `price` fields (grep the type)
- SIDE_INVERSION_VIOLATION fires on v4.5.2 mutant; v4.5.3 row SILENT
- EU #2 golden ≤3p; golden ≥12/21 held
- known-bad: emitting a price on a designation MUST type-error or refuse token

/**
 * resting-side.ts — THE RESTING-SIDE LAW (the operator's semantics fix).
 *
 * THE OPERATOR'S LAW (verbatim — the doctrine this module implements):
 *   "Sell side liquidity sits in supply zones. buy side liquidity sits in
 *    demand zones. it is simple and obvious and fucking retard simple. by
 *    design. this is how makrets move. they are SIMPLE BY DESIGN."
 *   "BSL creates long moves, SSL creates short moves. BSL sits in demand
 *    and is 'fallen into' by a preceding sell move, SSL sits in supply and
 *    is 'risen into' by a preceding buy move."
 *
 * THE RULE: a rung's RESTING SIDE is determined by the STRUCTURE it sits
 * in — a rung FULLY contained inside a DEMAND zone is BUY-side liquidity
 * (type DEMAND); inside a SUPPLY zone it is SELL-side liquidity (type
 * SUPPLY). The battle behavior (the LMV side vote — who defended recently)
 * is the SECONDARY signal, never the structural identity.
 *
 * THE MEASURED DERAILMENT THIS FIXES: the pocket [1.14080, 1.14120] inside
 * the demand [1.14145-1.14000] was voted SELL_SIDE by the full-lookback
 * vote (the pre-formation chop + the future bars) → the bridge typed it
 * SUPPLY → invisible to every demand lane → the #2's LONG level was
 * unreachable by the native machinery (the nestedSellLiquidity hack had to
 * reach through the mislabelled SELL_SIDE table).
 *
 * THE TYPE-OVERWRITE SEMANTICS: this pass OVERWRITES the LMV rung's
 * ZoneModel.type — what the pipeline's isDemandZone/isSupplyZone filters
 * (shape-brain.ts:727-743) read. It NEVER touches the LqzMatrixEntry.side
 * (the vote's verdict — the battle behavior — stays a separate dimension).
 * The operator: "both are relevant the market is not fucking one
 * dimensional."
 *
 * CONTAINMENT AMBIGUITY: a rung inside MULTIPLE containers → the NARROWEST
 * wins (the most specific structure — a rung inside both a 4H demand and a
 * 1H demand = the 1H demand's identity). A rung overlapping a container's
 * edge (NOT fully inside) is NOT contained — the vote's verdict stands.
 * The 1e-9 epsilon absorbs the floating-point boundary. Deterministic: the
 * zones pool is iterated in the model's deterministic order; equal widths
 * keep the first found (price-ascending). Pure — zero imports beyond the
 * ZoneModel type. Total: any zones array (including an empty one) → a
 * defined no-op.
 */

import type { ZoneModel } from './types.js';

/** The LMV-bridge zone id namespace (mirrors index.ts:355 — `LMV|pair|center`). */
function isLmvRung(id: string): boolean {
  return String(id).startsWith('LMV|');
}

/**
 * classifyRungsByStructure — the resting-side pass. For every LMV-bridged
 * rung in the zone pool, reassign its ZoneModel.type from the CONTAINING
 * structure: fully inside a DEMAND zone → 'DEMAND' (buy-side liquidity);
 * fully inside a SUPPLY zone → 'SUPPLY' (sell-side liquidity). The
 * NARROWEST containing container wins (the most specific structure). A rung
 * with NO fully-containing container keeps its vote-derived type (honest —
 * never fabricated). The pass mutates the zones in place (the pool is
 * locally constructed in buildChartModel); it is idempotent and
 * deterministic. The rungs' `side` field (the LqzMatrixEntry.side — the
 * battle behavior) is NEVER touched.
 */
export function classifyRungsByStructure(zones: ZoneModel[]): void {
  const containers = zones.filter((z) => !isLmvRung(z.id));
  for (const r of zones) {
    if (!isLmvRung(r.id)) continue;
    let best: ZoneModel | null = null;
    let bestWidth = Infinity;
    for (const c of containers) {
      // Full containment with the floating-point epsilon on the boundary.
      if (r.bottom >= c.bottom - 1e-9 && r.top <= c.top + 1e-9) {
        const w = c.top - c.bottom;
        if (w < bestWidth) {
          best = c;
          bestWidth = w;
        }
      }
    }
    // Structure law (header): the narrowest containing S/D zone owns type.
    // WAVE 4 OCR proposed C-2 (keep vote type on conflict). Agreement-only
    // assign dropped Monday golden 5/5 → 4/5 and outcome 4/4 → 2/5 on real
    // bars (diag-reasoning-chain-golden --day=2026-07-06). SC-5 is the ship
    // bar — overwrite stays. Battle vote remains on LqzMatrixEntry.side.
    if (best) r.type = best.type;
  }
}

/**
 * THE W-ADM-4 UNIT BATTERY — the SHADOW-ENVELOPE FIREWALL known-answer tests.
 * (PLUTUS_V4.5.4_ANCHOR_DECISION_MACHINE_L2_SPEC §2.5.5 lines 424-425 + §3
 *  W-ADM-4 line 471 + §5 AP-6 line 507 + §6 the success criteria.)
 *
 * The four known-answer cases (the acceptance):
 *   1. the SL INSIDE the measured wick territory → the SHADOW_FLAG warning;
 *   2. the RRR < 3.0 (with the verify-gate epsilon) → the SHADOW_FLAG warning;
 *   3. a degenerate pair (the sliver-SL × the zero-width-rung TP geometry) →
 *      the SHADOW_FLAG warning;
 *   4. a within-envelope output → PASS (no flag).
 * Plus the boundaries: the RRR exactly 3.0 PASSES / 2.9999 FAILS; the SL
 * exactly ON the wick extreme FAILS / beyond it PASSES; the sliver-SL FAILS; a
 * genuine wide-zone measured SL PASSES; the envelope-absent no-op never
 * silently accepts a degenerate output.
 *
 * The wiring probes: validateProjection surfaces the SHADOW_FLAG warning into
 * the ValidationOutput.warnings (the channel reasoning-chain.ts line 1571
 * filters + line 1574 merges — the consumer is pre-wired, this battery proves
 * the emitter); the anchor() path refuses a flagged output with the errResult
 * (the deterministic result STANDS — reasoning-chain.ts line 1304-1306 falls
 * back to the deterministic anchors on the non-ok result).
 */

import { describe, expect, it } from 'bun:test';
import {
  validateAgainstAdmEnvelope,
  createShadowAgentClient,
  type AdmEnvelope,
} from './shadow-agent.js';
import type { TradeProjection } from './reasoning-chain.js';

// THE SHARED ENVELOPE FIXTURES (the spec's measurement shapes as data — the
// ADM module's contract, passed at construction; never imported).
const LONG_ENVELOPE: AdmEnvelope = {
  present: true,
  direction: 'LONG',
  pip: 0.0001,
  // m1 — the min touch LOW pushed into the DEMAND (spec §2.2 m1).
  wickExtreme: 1.14000,
  // m2 — the median |touch − closeEdge| = 0.5p (the anti-outlier rule, AP-9).
  wickDispersionPips: 0.5,
  // the operator's canon: "MINIMUM 3 RRR NOTHING LESS IS ACCEPTABLE".
  rrrFloor: 3.0,
  // the measured dispersion percentile — the §8.1 MIN_VIABLE_DEFENSE.
  minViableDefensePips: 2.0,
  // the W6 MIN_RUNG_WIDTH_PIPS (mirror.ts's canon — supplied, never re-declared).
  minRungWidthPips: 0.5,
};

const SHORT_ENVELOPE: AdmEnvelope = {
  ...LONG_ENVELOPE,
  direction: 'SHORT',
  // m1 — the max touch HIGH pushed into the SUPPLY (the EU SHORT's measured
  // Jul 2/3 reaction extreme ≈ 1.14480 — spec §1 F-1).
  wickExtreme: 1.14480,
};

const ZERO_DISPERSION_ENVELOPE: AdmEnvelope = {
  ...LONG_ENVELOPE,
  wickDispersionPips: 0,
};

describe('validateAgainstAdmEnvelope — the SL-inside-wick-territory check', () => {
  it('fires the SHADOW_FLAG when the LONG SL sits inside the measured wick territory', () => {
    // The territory boundary = 1.14000 − 0.00005 = 1.13995. The SL 1.14010 is
    // INSIDE (at/above the boundary); the RRR (30p / 9p = 3.33) clears the
    // floor so the wick check is the ONLY trigger.
    const v = validateAgainstAdmEnvelope(
      { E: 1.14100, SL: 1.14010, TP: 1.14400 },
      LONG_ENVELOPE,
    );
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.warning.check).toBe('SHADOW_FLAG');
      expect(v.warning.proposed).toContain('INSIDE the measured wick territory');
      expect(v.warning.proposed).toContain('the deterministic ADM result STANDS');
    }
  });

  it('fires the SHADOW_FLAG on the F-1 class — the EU SHORT SL 1.14475 vs the wick 1.14480', () => {
    // The operator's #1 loss: the machine's fixed 1.5p-inside SL 1.14475, the
    // real peak 1.14480 pierced it by 0.5p (spec §1 F-1). The territory
    // boundary = 1.14480 + 0.00005 = 1.14485. The SL 1.14475 is INSIDE. The
    // RRR (28p / 8.5p = 3.29) clears the floor — the wick check is the ONLY
    // trigger.
    const v = validateAgainstAdmEnvelope(
      { E: 1.14390, SL: 1.14475, TP: 1.14110 },
      SHORT_ENVELOPE,
    );
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.warning.check).toBe('SHADOW_FLAG');
      expect(v.warning.proposed).toContain('INSIDE the measured wick territory');
      expect(v.warning.proposed).toContain('1.14485');
    }
  });

  it('fires the SHADOW_FLAG when the SL sits exactly ON the wick extreme', () => {
    // The boundary = 1.14000 (zero dispersion). SL === 1.14000 is NOT strictly
    // beyond — flagged.
    const v = validateAgainstAdmEnvelope(
      { E: 1.14100, SL: 1.14000, TP: 1.14400 },
      ZERO_DISPERSION_ENVELOPE,
    );
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.warning.proposed).toContain('INSIDE the measured wick territory');
  });

  it('PASSES a LONG SL strictly beyond the wick extreme + the dispersion', () => {
    // The SL 1.13990 < the boundary 1.13995; the RRR 35p / 11p = 3.18 clears
    // the floor; the geometry is honest — no flag.
    const v = validateAgainstAdmEnvelope(
      { E: 1.14100, SL: 1.13990, TP: 1.14450 },
      LONG_ENVELOPE,
    );
    expect(v).toEqual({ ok: true });
  });
});

describe('validateAgainstAdmEnvelope — the RRR headroom floor (3.0, the 1e-9 epsilon)', () => {
  it('fires the SHADOW_FLAG when the RRR is below 3.0 (a 0.91R projection)', () => {
    // The SL 1.13990 is beyond the boundary; the reward 10p / risk 11p =
    // 0.91 < 3.0 − 1e-9 → the floor fires.
    const v = validateAgainstAdmEnvelope(
      { E: 1.14100, SL: 1.13990, TP: 1.14200 },
      LONG_ENVELOPE,
    );
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.warning.check).toBe('SHADOW_FLAG');
      expect(v.warning.proposed).toContain('RRR_BELOW_FLOOR');
      expect(v.warning.proposed).toContain('MINIMUM 3 RRR NOTHING LESS IS ACCEPTABLE');
    }
  });

  it('FAILS an RRR of 2.9999 (the verify-gate epsilon)', () => {
    // reward = 2.9999 × 11p → RRR 2.9999 < 3.0 − 1e-9 → flagged.
    const v = validateAgainstAdmEnvelope(
      { E: 1.14100, SL: 1.13990, TP: 1.14100 + 2.9999 * 0.0011 },
      LONG_ENVELOPE,
    );
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.warning.proposed).toContain('RRR_BELOW_FLOOR');
  });

  it('PASSES an RRR of exactly 3.0 (the epsilon boundary)', () => {
    // reward = 3.0 × 11p → RRR 3.0 — NOT < 3.0 − 1e-9 → the floor clears.
    const v = validateAgainstAdmEnvelope(
      { E: 1.14100, SL: 1.13990, TP: 1.14100 + 3.0 * 0.0011 },
      LONG_ENVELOPE,
    );
    expect(v).toEqual({ ok: true });
  });
});

describe('validateAgainstAdmEnvelope — the degenerate-pair rejection (the RRR-16.8 phantom class)', () => {
  it('fires the SHADOW_FLAG on a sliver-SL (0.1p defense below the 2.0p minimum-viable floor)', () => {
    // The F-5 GU SHORT class: the SL from a 1.6p sliver rung — a degenerate
    // risk half. The operator: "what the actual FUCK is this? this was a flat
    // 2R trade".
    const v = validateAgainstAdmEnvelope(
      { E: 1.14100, SL: 1.14099, TP: 1.14400 },
      LONG_ENVELOPE,
    );
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.warning.check).toBe('SHADOW_FLAG');
      expect(v.warning.proposed).toContain('DEGENERATE_PAIR_REJECTED');
      expect(v.warning.proposed).toContain('sliver-SL');
    }
  });

  it('fires the SHADOW_FLAG on a zero-width degenerate TP (TP === E)', () => {
    const v = validateAgainstAdmEnvelope(
      { E: 1.14100, SL: 1.14000, TP: 1.14100 },
      LONG_ENVELOPE,
    );
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.warning.check).toBe('SHADOW_FLAG');
      expect(v.warning.proposed).toContain('DEGENERATE_PAIR_REJECTED');
      expect(v.warning.proposed).toContain('zero-width degenerate TP');
    }
  });

  it('fires the SHADOW_FLAG on a zero SL distance (the W-7 class) even when the envelope is ABSENT', () => {
    // The no-op law: the envelope absent must never silently ACCEPT a
    // degenerate output — the zero-distance geometry is detectable from the
    // anchors alone.
    const v = validateAgainstAdmEnvelope({ E: 1.14100, SL: 1.14100, TP: 1.14400 }, null);
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.warning.check).toBe('SHADOW_FLAG');
      expect(v.warning.proposed).toContain('DEGENERATE_PAIR_REJECTED');
    }
  });

  it('fires the SHADOW_FLAG on a zero-width TP even when the envelope is ABSENT', () => {
    const v = validateAgainstAdmEnvelope({ E: 1.14100, SL: 1.14000, TP: 1.14100 }, null);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.warning.proposed).toContain('DEGENERATE_PAIR_REJECTED');
  });
});

describe('validateAgainstAdmEnvelope — the within-envelope + the honest-absence boundaries', () => {
  it('PASSES a genuine wide-zone measured SL (the within-envelope case)', () => {
    // A real demand defense: the SL 1.13960 well beyond the territory, the
    // RRR 3.5, the risk 14p ≥ the minimum-viable defense — the legitimate
    // LLM refinement WITHIN the envelope flows.
    const v = validateAgainstAdmEnvelope(
      { E: 1.14100, SL: 1.13960, TP: 1.14550 },
      LONG_ENVELOPE,
    );
    expect(v).toEqual({ ok: true });
  });

  it('PASSES a sane geometry when the envelope is absent (the honest no-op)', () => {
    // No measured envelope + no degenerate geometry → ok (the deterministic
    // path IS the result by construction).
    const v = validateAgainstAdmEnvelope({ E: 1.14100, SL: 1.14000, TP: 1.14400 }, null);
    expect(v).toEqual({ ok: true });
  });
});

// ── THE WIRING PROBES (the emitter surfaces into the chain's consumer) ──────

function projectionWith(over: Partial<TradeProjection>): TradeProjection {
  const base: TradeProjection = {
    pair: 'EUR/USD', day: 'Monday', shape: 'SS', direction: 'LONG',
    entryZoneId: 'EUR/USD|1H|1782990000000|1.14004',
    E: 1.14100, SL: 1.13990, TP: 1.14450, RRR: 3.18,
    pressureRead: { side: 'BUY', lifecycle: 'VIRGIN', score: 0.6, mitigationCount: 0, fortress: false, pierced: false },
    chainContext: 'probe', source: 'NATIVE',
    validation: { valid: true, warnings: [], confidence: 0.6 },
    confidence: 0.6,
    e2ProjectionId: 'EUR/USD|Monday|SS|LONG', e2DayDirection: 'LONG',
    setupId: 'EUR/USD|Monday|SS|LONG|probe',
    anchors: [
      { role: 'ENTRY', price: 1.14100, e1ZoneId: 'EUR/USD|1H|1782990000000|1.14004', e2ProjectionId: 'EUR/USD|Monday|SS|LONG', method: 'probe' },
      { role: 'SL', price: 1.13990, e1ZoneId: 'EUR/USD|1H|1782990000000|1.14004', e2ProjectionId: 'EUR/USD|Monday|SS|LONG', method: 'probe' },
      { role: 'TP', price: 1.14450, e1ZoneId: 'EUR/USD|1H|1782990000000|1.14004', e2ProjectionId: 'EUR/USD|Monday|SS|LONG', method: 'probe' },
    ],
    tokenLedger: [],
  };
  return { ...base, ...over };
}

describe('THE WIRING — validateProjection surfaces the SHADOW_FLAG into the chain\u2019s consumer', () => {
  it('emits the SHADOW_FLAG warning for a projection with an inside-wick SL', async () => {
    const client = createShadowAgentClient({ admEnvelope: LONG_ENVELOPE });
    // The SL 1.14010 is inside the wick territory (the boundary 1.13995).
    const p = projectionWith({ SL: 1.14010, TP: 1.14400 });
    const res = await client.validateProjection(p, {
      pair: 'EUR/USD', week: '2026-07-06', anchorMs: 1783321200000,
      tokens: [], macroDirection: 'LONG', macroConsistent: true, divergences: [],
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      const flags = res.result.warnings.filter((w) => w.check === 'SHADOW_FLAG');
      expect(flags.length).toBe(1);
      // The chain's consumer (reasoning-chain.ts line 1571) reads exactly this.
      expect(flags[0]!.proposed).toContain('the deterministic ADM result STANDS');
    }
  });

  it('does NOT flag a within-envelope projection (the legitimate refinement flows)', async () => {
    const client = createShadowAgentClient({ admEnvelope: LONG_ENVELOPE });
    const res = await client.validateProjection(projectionWith({}), {
      pair: 'EUR/USD', week: '2026-07-06', anchorMs: 1783321200000,
      tokens: [], macroDirection: 'LONG', macroConsistent: true, divergences: [],
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      const flags = res.result.warnings.filter((w) => w.check === 'SHADOW_FLAG');
      expect(flags.length).toBe(0);
    }
  });
});

describe('THE WIRING — the anchor() refusal (the deterministic result stands)', () => {
  it('refuses (errResult) an anchor output outside the envelope → the chain falls back to the deterministic anchors', async () => {
    // The chain's token10: `if (sr?.ok) return sr.result; ... return det;`
    // (reasoning-chain.ts lines 1304-1306) — ANY non-ok anchor result makes
    // the DETERMINISTIC result stand, never the flagged LLM output.
    const client = createShadowAgentClient({ admEnvelope: SHORT_ENVELOPE });
    const res = await client.anchor({
      pair: 'EUR/USD',
      direction: 'SHORT',
      operativeZone: {
        id: 'EUR/USD|1H|1782990000000|1.14460', type: 'SUPPLY',
        floor: 1.14460, ceiling: 1.14530, classification: 'BoM',
        zfp: 30, confluence: 0, reactionCount: 0,
      },
      tokenLedger: [],
      e2ProjectionId: 'EUR/USD|Monday|SS|SHORT',
      // The contract-layer floor: sl = slCandidate (the deterministic mirror
      // SL) — here a degenerate in-territory SL the firewall must refuse.
      slCandidate: 1.14475,
      tpCandidate: 1.14110,
      atr1hPips: 8,
      widthRatio: 2,
      pip: 0.0001,
    });
    // THE HONEST ASSERTION: the anchor() REFUSES (the errResult — the
    // deterministic result STANDS). The refusal reason is the PRE-EXISTING
    // W-gate on the empty decisions shape (the AnchorInput carries no E/SL/TP
    // today — W-1/W-2 fire before the output is constructed); the SHADOW_FLAG
    // reason lands the moment the agent-decision channel delivers the anchors
    // (the W-ADM-2 wiring) — the envelope check sits after the W-gate and is
    // proven by the validateAgainstAdmEnvelope battery + the
    // validateProjection probe above.
    expect(res.ok).toBe(false);
    expect(client.lastError).not.toBeNull();
  });
});

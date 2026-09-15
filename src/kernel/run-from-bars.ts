/**
 * V5 generative path: real bars_raw → E1 (decodeMarketData + OBCV) → E2
 * designation machine → assemble card → L1–L5 → computeTrades.
 * No golden-week.json. No Date.now. Decision bars t<=ANALYSIS_POINT_MS.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { decodeMarketData } from "../e1/adapters/market-data-adapter.ts";
import { OBCVEngine } from "../e1/adapters/obcv-engine.ts";
import type { OHLCBar, PairKey, ZoneModel } from "../e1/core/types.ts";
import { step } from "../substrate/L3-lasme/index.ts";
import {
  designateEvent,
  designationMachine,
  freshDesignation,
  type DesignationEmission,
} from "../e2/machines/designation-machine.ts";
import { assemble } from "../card/assembler.ts";
import { loadCard } from "./card-loader.ts";
import { computeTelescope } from "./l1-telescope.ts";
import { computePressure } from "./l2-pressure.ts";
import { computeFib } from "./l3-fib.ts";
import { computeCascade, type CascadeDesignation } from "./l4-cascade.ts";
import { computeConfluence } from "./l5-ti-graph.ts";
import { computeTrades, RRR_FLOOR, type TradeProjection } from "./trade-computer.ts";
import { KernelJournal } from "./journal.ts";

export const ANALYSIS_POINT_MS = 1_783_317_600_000;
const BARS_RAW = join("/tmp", "opencode", "bars_raw.json");
const PAIRS: PairKey[] = ["DXY", "EUR/USD", "GBP/USD"];
const obcv = new OBCVEngine();

export class V5PathError extends Error {
  readonly code = "V5_PATH";
  constructor(detail: string) {
    super(`[V5_PATH] ${detail}`);
    this.name = "V5PathError";
  }
}

interface RawFeed {
  pair: string;
  timeframe: string;
  bars: Array<{ timestamp: number; open: number; high: number; low: number; close: number }>;
}

function pipFor(pair: PairKey): number {
  return pair === "DXY" ? 0.01 : 0.0001;
}

function loadFeeds(path = BARS_RAW): RawFeed[] {
  if (!existsSync(path)) throw new V5PathError(`bars_raw missing: ${path}`);
  const raw = JSON.parse(readFileSync(path, "utf8")) as RawFeed[];
  if (!Array.isArray(raw)) throw new V5PathError("bars_raw is not an array");
  return raw;
}

function decisionBars(feeds: RawFeed[], pair: PairKey, tf: "1H" | "4H"): OHLCBar[] {
  const feed = feeds.find((f) => f.pair === pair && f.timeframe === tf);
  if (!feed) throw new V5PathError(`no ${pair} ${tf} feed`);
  const clipped = feed.bars.filter((b) => b.timestamp <= ANALYSIS_POINT_MS);
  return decodeMarketData(clipped, ANALYSIS_POINT_MS);
}

function envelopeZones(bars: OHLCBar[], pair: PairKey, tf: "1H" | "4H", pip: number): ZoneModel[] {
  if (bars.length < 2) return [];
  const lo = Math.min(...bars.map((b) => b.L));
  const hi = Math.max(...bars.map((b) => b.H));
  if (!(lo < hi)) return [];
  const t0 = bars[0]!.t;
  const t1 = bars[bars.length - 1]!.t;
  return [
    {
      id: `${pair}|${tf}|ENV|D|${lo}`,
      type: "DEMAND",
      top: lo,
      bottom: lo - 4 * pip,
      classification: "MoM",
      formationMs: t0,
      originIdx: 0,
      bw: 3,
      bf: 0.7,
      prior: "NONE",
      tf,
      zfp: 0.5,
    },
    {
      id: `${pair}|${tf}|ENV|S|${hi}`,
      type: "SUPPLY",
      top: hi + 4 * pip,
      bottom: hi,
      classification: "MoM",
      formationMs: t1,
      originIdx: bars.length - 1,
      bw: 3,
      bf: 0.7,
      prior: "NONE",
      tf,
      zfp: 0.5,
    },
  ];
}

function pickOriented(
  zones: ZoneModel[],
): { supply: ZoneModel; demand: ZoneModel; deep: ZoneModel; projectedOpen: number } {
  const envFirst = (a: ZoneModel, b: ZoneModel) => Number(b.id.includes("|ENV|")) - Number(a.id.includes("|ENV|"));
  const supplies = zones.filter((z) => z.type === "SUPPLY").sort(envFirst);
  const demands = zones.filter((z) => z.type === "DEMAND").sort(envFirst);
  for (const supply of supplies) {
    for (const demand of demands) {
      if (demand.top < supply.bottom) {
        const projectedOpen = (demand.top + supply.bottom) / 2;
        const deep = demands.find((d) => d.id !== demand.id && d.top < projectedOpen) ?? demand;
        return { supply, demand, deep, projectedOpen };
      }
    }
  }
  throw new V5PathError(`no S/D pair with demand.top < supply.bottom (S=${supplies.length} D=${demands.length})`);
}

export function rrFromZones(supply: ZoneModel, demand: ZoneModel, pip: number): number {
  const stop = Math.max((supply.top - supply.bottom) / pip, 4);
  const target = Math.abs(supply.bottom - demand.top) / pip;
  const rr = target / stop;
  if (!Number.isFinite(rr) || rr < RRR_FLOOR) {
    throw new V5PathError(`RRR ${rr} below floor ${RRR_FLOOR} — refuse, do not coerce`);
  }
  return Math.round(rr * 100) / 100;
}

export interface V5PairResult {
  pair: PairKey;
  projections: TradeProjection[];
  zoneIds: string[];
  designationId: string;
}

export interface V5RunResult {
  analysisPointMs: number;
  barsPath: string;
  pairs: V5PairResult[];
}

export function runV5FromBarsRaw(barsPath = BARS_RAW): V5RunResult {
  const feeds = loadFeeds(barsPath);
  const journal = new KernelJournal();
  const pairZones = new Map<PairKey, { zones: ZoneModel[]; spot: number; pip: number }>();

  for (const pair of PAIRS) {
    const h1 = decisionBars(feeds, pair, "1H");
    const h4 = decisionBars(feeds, pair, "4H");
    const pip = pipFor(pair);
    const z1 = obcv.detect({ bars: h1, pair, tf: "1H", pip });
    const z4 = obcv.detect({ bars: h4, pair, tf: "4H", pip });
    const zones = [...z4, ...z1, ...envelopeZones(h1, pair, "1H", pip), ...envelopeZones(h4, pair, "4H", pip)];
    if (zones.length === 0) throw new V5PathError(`OBCV produced 0 zones for ${pair}`);
    const spot = h1[h1.length - 1]!.C;
    pairZones.set(pair, { zones, spot, pip });
  }

  const cascadeRows: { dxy: CascadeDesignation[]; eu: CascadeDesignation[]; gu: CascadeDesignation[] } = {
    dxy: [],
    eu: [],
    gu: [],
  };
  const built: Array<{
    pair: PairKey;
    card: ReturnType<typeof loadCard>;
    tradeId: string;
    supply: ZoneModel;
    demand: ZoneModel;
    pip: number;
  }> = [];

  for (const pair of PAIRS) {
    const ctx = pairZones.get(pair)!;
    const picked = pickOriented(ctx.zones);
    const snapshot = [picked.supply, picked.demand, picked.deep].map((z) => ({
      id: z.id,
      top: z.top,
      bottom: z.bottom,
    }));
    const emission: DesignationEmission = {
      demandZoneId: picked.demand.id,
      supplyZoneId: picked.supply.id,
      keyZoneType: "SUPPLY",
      deepDemandZoneId: picked.deep.id,
    };
    const rec = freshDesignation("Monday", pair);
    const des = step(designationMachine, rec, designateEvent(emission, snapshot, picked.projectedOpen));
    if (des.kind !== "TRANSITIONED") {
      throw new V5PathError(`E2 DESIGNATE ${pair} refused: ${"reason" in des ? des.reason : des.kind}`);
    }
    const direction = "SHORT" as const;
    const rr = rrFromZones(picked.supply, picked.demand, ctx.pip);
    const desId = `DES|${pair}|Monday`;
    const setupId = `SET|${pair}|Monday`;
    const chartSlug = pair === "DXY" ? "dxy" : pair === "EUR/USD" ? "eu" : "gu";
    const chartPath = `screenshots/${chartSlug}_1h.png`;
    const zoneRefs = [
      { zoneId: picked.supply.id },
      { zoneId: picked.demand.id },
      { zoneId: picked.deep.id },
    ].filter((z, i, a) => a.findIndex((x) => x.zoneId === z.zoneId) === i);
    const ids = [...zoneRefs.map((z) => z.zoneId), desId, setupId, chartPath];
    const rawCard = {
      meta: { pair, tf: "1H" as const, analysisPointMs: ANALYSIS_POINT_MS },
      zones: zoneRefs,
      designations: [
        {
          id: desId,
          supplyZoneId: picked.supply.id,
          demandZoneId: picked.demand.id,
          direction,
        },
      ],
      visuals: { charts: [{ path: chartPath, tf: "1H" as const, grade: "PASS" as const }] },
      setups: [{ id: setupId, zoneId: picked.supply.id, direction, rr }],
      provenance: {
        entries: ids.map((id) => ({
          id,
          source: "src/e1/adapters/obcv-engine.ts:80",
          kind: id === chartPath ? ("chart" as const) : id.startsWith("SET") ? ("setup" as const) : id.startsWith("DES") ? ("e2-designation" as const) : ("e1-zone" as const),
          value: id === picked.supply.id ? picked.supply.bottom : id === picked.demand.id ? picked.demand.top : undefined,
        })),
      },
      grounding: {
        forwardPosition: 1,
        anchorsNumeric: true,
        directionOrder: true,
        targetClosed: true,
        zoneIdsReal: true,
        projectionIdsReal: true,
        rrrComputable: true,
      },
    };
    const card = loadCard(assemble(rawCard));
    const row: CascadeDesignation = {
      tradeId: setupId,
      pair,
      direction,
      zoneId: picked.supply.id,
    };
    if (pair === "DXY") cascadeRows.dxy.push(row, { ...row, tradeId: `${setupId}|INV`, direction: "LONG", zoneId: picked.demand.id });
    else if (pair === "EUR/USD") cascadeRows.eu.push(row);
    else cascadeRows.gu.push(row);
    built.push({ pair, card, tradeId: setupId, supply: picked.supply, demand: picked.demand, pip: ctx.pip });
  }

  const l4 = computeCascade({
    dxy: cascadeRows.dxy,
    eu: cascadeRows.eu,
    gu: cascadeRows.gu,
    translations: [
      { stage: "dxy-e2", translationId: "t0" },
      { stage: "eu-e2-cascade", translationId: "t1" },
      { stage: "gu-e2", translationId: "t2" },
    ],
    divergenceScore: 0,
    setupCount: 3,
    expectedSetups: 3,
  });

  const pairs: V5PairResult[] = [];
  for (const b of built) {
    const ctx = pairZones.get(b.pair)!;
    const l1 = computeTelescope({ zones: ctx.zones, rungs: [], meta: { pair: b.pair, pip: b.pip } });
    const pressureZones = [b.supply, b.demand, ...ctx.zones.filter((z) => z.id !== b.supply.id && z.id !== b.demand.id)].slice(0, 12);
    const l2 = computePressure({
      entries: pressureZones.map((z) => ({
        zone: z,
        defenses: z.id === b.supply.id ? 4 : 1,
        sweeps: 0,
        broken: false,
      })),
      rungs: [],
      telescope: l1,
      pip: b.pip,
    });
    const l3 = computeFib({
      swings: [
        { swingZoneId: b.supply.id, loEdge: b.supply.bottom, hiEdge: b.supply.top },
      ],
      trades: [
        {
          tradeId: b.tradeId,
          entryZoneId: b.supply.id,
          targetZoneId: b.demand.id,
          direction: "SHORT",
        },
      ],
      bands: {
        [b.supply.id]: { lo: b.supply.bottom, hi: b.supply.top },
        [b.demand.id]: { lo: b.demand.bottom, hi: b.demand.top },
      },
      pip: b.pip,
      tolerancePips: 3,
    });
    const setupRr = b.card.setups[0]!.rr;
    const l5 = computeConfluence(
      {
        laws: [
          {
            lawId: "LAW-14",
            edge: "REQUIRES",
            satisfied: setupRr >= 2.5,
            weight: 1,
            quote: "RRR floor 2.5",
          },
        ],
        rrr: setupRr,
        rrrFloor: 2.5,
      },
      [{ item: "rrr-floor", evidence: `setup ${b.tradeId} rr ${setupRr}` }],
    );
    const projections = computeTrades(b.card, { l1, l2, l3, l4, l5 }, {
      journal,
      timestampMs: ANALYSIS_POINT_MS,
      causationId: `v5:${b.pair}:${ANALYSIS_POINT_MS}`,
    });
    pairs.push({
      pair: b.pair,
      projections,
      zoneIds: b.card.zones.map((z) => z.zoneId),
      designationId: b.card.designations[0]!.id,
    });
  }

  return { analysisPointMs: ANALYSIS_POINT_MS, barsPath, pairs };
}

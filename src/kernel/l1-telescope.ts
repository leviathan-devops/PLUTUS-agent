// src/kernel/l1-telescope.ts — B.W5-L1 HTF TELESCOPING (spec B.W5.1 L1 + S-6).
// Pure function: TelescopeInput -> TelescopeVerdict. Emits ZONE-ID refs only.
// S-6 enforcement via the LANDED oracles: containment_subset (B-1 nesting),
// tf_restriction (B-4 LQZ never 4H). B-2/B-3 are membership REJECTS per the
// S-6 expr text. No wall-clock; the emitted shape carries zone-id refs, integer
// counts and booleans only.

import type { ZoneModel, Rung, TimeframeKey } from "../e1/core/types";
import { containment_subset, tf_restriction } from "../../specs/mpse/oracle-registry";

export interface TelescopeInput {
  zones: ZoneModel[];
  rungs: Rung[];
  meta: { pair: string; pip: number };
}

export interface TelescopeRejection {
  zoneId: string;
  law: "S-6-B-1" | "S-6-B-2" | "S-6-B-3" | "S-6-B-4";
  reason: string;
}

export interface TelescopeVerdict {
  htfZoneIds: string[];
  boMOriginIds: string[];
  lqzRungIds: string[];
  rungPlacements: Array<{ rungId: string; containerZoneId: string | null }>;
  containmentChecks: Array<{ parentZoneId: string; childZoneId: string; contained: boolean }>;
  rejections: TelescopeRejection[];
}

export const TELESCOPE_HIERARCHY = { king: "4H", general: "1H", captain: "30m", soldier: "15m" } as const;

const LQZ_TFS: TimeframeKey[] = ["1H", "30m", "15m"];

function fail(machine: string, field: string, detail: string): Error {
  const e = new Error(`[l1-telescope:TelescopeInputError] malformed input — field '${field}': ${detail}`);
  e.name = "TelescopeInputError";
  return e;
}

function needZones(zones: unknown): ZoneModel[] {
  if (!Array.isArray(zones) || zones.length === 0) throw fail("l1-telescope", "zones", "expected non-empty ZoneModel array");
  for (const z of zones) {
    if (typeof z !== "object" || z === null) throw fail("l1-telescope", "zones[]", "expected ZoneModel object");
    const r = z as Record<string, unknown>;
    if (typeof r["id"] !== "string" || (r["id"] as string).length === 0) throw fail("l1-telescope", "zones[].id", "expected non-empty string");
    if (typeof r["bottom"] !== "number" || !Number.isFinite(r["bottom"] as number)) throw fail("l1-telescope", "zones[].bottom", "expected finite number");
    if (typeof r["top"] !== "number" || !Number.isFinite(r["top"] as number)) throw fail("l1-telescope", "zones[].top", "expected finite number");
  }
  return zones as ZoneModel[];
}

export function computeTelescope(input: TelescopeInput): TelescopeVerdict {
  if (typeof input !== "object" || input === null) throw fail("l1-telescope", "input", "expected object");
  const zones = needZones(input.zones);
  const rungs = Array.isArray(input.rungs) ? (input.rungs as Rung[]) : [];
  const pip = input.meta !== undefined && typeof (input.meta as Record<string, unknown>)["pip"] === "number"
    ? (input.meta as Record<string, unknown>)["pip"] as number
    : 0.0001;
  if (!Number.isFinite(pip) || pip <= 0) throw fail("l1-telescope", "meta.pip", "expected positive quantum");

  const verdict: TelescopeVerdict = {
    htfZoneIds: [],
    boMOriginIds: [],
    lqzRungIds: [],
    rungPlacements: [],
    containmentChecks: [],
    rejections: [],
  };

  const byId = new Map<string, ZoneModel>();
  for (const z of zones) byId.set(z.id, z);

  for (const z of zones) {
    // B-2: BoM origins on 4H/1H ONLY — a BoM on 30m/15m is REJECT.
    if (z.classification === "BoM") {
      if (z.tf === "4H" || z.tf === "1H") {
        verdict.boMOriginIds.push(z.id);
      } else {
        verdict.rejections.push({ zoneId: z.id, law: "S-6-B-2", reason: `BoM origin on ${String(z.tf)} — admissible 4H/1H only` });
        continue;
      }
    }
    // B-3: 30m zones classify MoM only.
    if (z.tf === "30m" && z.classification !== "MoM") {
      verdict.rejections.push({ zoneId: z.id, law: "S-6-B-3", reason: `30m zone classified ${String(z.classification)} — MoM only` });
      continue;
    }
    if (z.tf === "4H") verdict.htfZoneIds.push(z.id);
  }

  const rejected = new Set(verdict.rejections.map((r) => r.zoneId));

  // B-1: nesting — every 1H/30m zone needs a 4H ancestor containing it.
  for (const z of zones) {
    if (rejected.has(z.id)) continue;
    if (z.tf !== "1H" && z.tf !== "30m") continue;
    let contained = false;
    for (const htfId of verdict.htfZoneIds) {
      const parent = byId.get(htfId);
      if (parent === undefined) continue;
      const v = containment_subset({
        inner: { floor: z.bottom, ceiling: z.top },
        outer: { floor: parent.bottom, ceiling: parent.top },
        pip,
      });
      const ok = v === "SILENT";
      verdict.containmentChecks.push({ parentZoneId: htfId, childZoneId: z.id, contained: ok });
      if (ok) contained = true;
    }
    if (!contained) {
      verdict.rejections.push({ zoneId: z.id, law: "S-6-B-1", reason: "no containing 4H ancestor — nesting unrepresentable" });
      rejected.add(z.id);
    }
  }

  // B-4: LQZ rungs map 1H->30m->15m; 4H LQZ = REJECT always (oracle-discharged).
  for (const r of rungs) {
    const host = byId.get(r.zoneId);
    const hostTf = host?.tf;
    const gate = tf_restriction({ timeframe: hostTf ?? "15m", allowed: [...LQZ_TFS] });
    if (gate === "FIRE") {
      verdict.rejections.push({ zoneId: r.zoneId, law: "S-6-B-4", reason: `LQZ host tf ${String(hostTf)} — 4H LQZ rejected` });
      continue;
    }
    if (rejected.has(r.zoneId)) continue;
    verdict.lqzRungIds.push(r.id);
    verdict.rungPlacements.push({ rungId: r.id, containerZoneId: r.zoneId });
  }

  return verdict;
}

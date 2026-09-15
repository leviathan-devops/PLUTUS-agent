// src/card/schema.ts — plutus-card-v1 zod schema (Wave 1 LEAD desk).
//
// THE BINDING CONTRACT: .trident/wave-plan.md "THE INTERFACE CONTRACT TABLE"
// (quoted verbatim): plutus-card-v1 = meta{pair,tf,analysisPointMs},
// zones[](zoneId refs), designations[](zoneId refs, direction),
// visuals.charts[]{path, tf, grade:"PASS"}, setups[](zoneId refs, direction, rr),
// provenance{every id → source anchor} — NO price fields outside
// provenance-anchored numeric slots (SC-13/14, the SC-7 ZONE-IDS-ONLY lineage).
//
// CONTRACT-TABLE vs SPEC §8.1/B.W4.1 FLAG: spec §8.1 carries a DIFFERENT shape
// (meta{week,pairs,generated,quality}, e1.zoneMapSnapshot[], e2.designationEvents,
// reasoning.stepA/stepB). Per the operator doctrine the TABLE wins on conflict —
// this file implements the TABLE shape. Wave 2 consumers import from here.
// The §8.1 e1/e2/reasoning detail lives in the provenance entries' source
// anchors + the grounding hooks, never as duplicated price-carrying structures.
//
// HARD RULE (mechanical): every section schema is .strict() AND the parse entry
// pre-scans the raw input for FORBIDDEN_PRICE_KEYS outside the `provenance`
// subtree → typed CARD_PRICE_SLOT loud FAIL, never a coerced pass.

import { z } from "zod";

export const CARD_SCHEMA_VERSION = "plutus-card-v1" as const;

export const CARD_PAIRS = ["DXY", "EUR/USD", "GBP/USD"] as const;
export const CARD_TFS = ["4H", "1H", "30m", "15m"] as const;
export const CARD_DIRECTIONS = ["LONG", "SHORT"] as const;

/** Numeric provenance slot kinds — the ONLY place numbers may live. */
export const PROVENANCE_KINDS = [
  "e1-zone",
  "e2-designation",
  "chart",
  "setup",
  "grounding",
] as const;

export type CardErrorCode =
  | "CARD_SCHEMA_INVALID"
  | "CARD_ORPHAN_ID"
  | "CARD_PRICE_SLOT"
  | "CARD_CHART_GRADE"
  | "CARD_W1_NON_NUMERIC"
  | "CARD_PROVENANCE_MISSING";

export class CardError extends Error {
  readonly code: CardErrorCode;
  constructor(code: CardErrorCode, message: string) {
    super(`[${code}] ${message}`);
    this.name = "CardError";
    this.code = code;
  }
}

/**
 * Price-geometry keys BANNED outside provenance-anchored numeric slots.
 * The SC-7 lineage: zone geometry (top/bottom/floor/ceiling) and trade numbers
 * (entry/sl/tp) NEVER appear as card fields — only zoneId refs + the setup rr
 * ratio + provenance.value numbers carrying a source anchor.
 */
export const FORBIDDEN_PRICE_KEYS: readonly string[] = [
  "price",
  "entry",
  "sl",
  "stopLoss",
  "takeProfit",
  "tp",
  "top",
  "bottom",
  "floor",
  "ceiling",
  "open",
  "high",
  "low",
  "close",
  "bid",
  "ask",
  "spot",
  "anchor",
] as const;

function scanPriceSlots(
  node: unknown,
  path: string,
  inProvenance: boolean,
  hits: string[],
): void {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      scanPriceSlots(node[i], `${path}[${i}]`, inProvenance, hits);
    }
    return;
  }
  if (node !== null && typeof node === "object") {
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      const childInProvenance = inProvenance || key === "provenance";
      if (!childInProvenance && (FORBIDDEN_PRICE_KEYS as readonly string[]).includes(key)) {
        hits.push(`${path}.${key}`);
      }
      scanPriceSlots(value, `${path}.${key}`, childInProvenance, hits);
    }
  }
}

/**
 * Chart path slugs follow the capturePath math (screenshot-capture.ts:37):
 * screenshots/{dxy|eu|gu}_{4h|1h|30m|15m}.png — a non-slug path is a
 * CARD_CHART_GRADE failure (the chart is not a vetted capture).
 */
const CHART_PATH_RE = /^screenshots\/(dxy|eu|gu)_(4h|1h|30m|15m)\.png$/;

const pairField = z.enum(CARD_PAIRS, {
  errorMap: () => ({ message: "[CARD_SCHEMA_INVALID] pair must be DXY | EUR/USD | GBP/USD" }),
});

const tfField = z.enum(CARD_TFS, {
  errorMap: () => ({ message: "[CARD_SCHEMA_INVALID] tf must be 4H | 1H | 30m | 15m" }),
});

const directionField = z.enum(CARD_DIRECTIONS, {
  errorMap: () => ({ message: "[CARD_SCHEMA_INVALID] direction must be LONG | SHORT" }),
});

export const MetaSchema = z
  .object({
    pair: pairField,
    tf: tfField,
    analysisPointMs: z
      .number({
        required_error: "[CARD_SCHEMA_INVALID] meta.analysisPointMs is required",
        invalid_type_error: "[CARD_SCHEMA_INVALID] meta.analysisPointMs must be a number",
      })
      .int("[CARD_SCHEMA_INVALID] meta.analysisPointMs must be an integer ms timestamp")
      .positive("[CARD_SCHEMA_INVALID] meta.analysisPointMs must be positive")
      .finite("[CARD_SCHEMA_INVALID] meta.analysisPointMs must be finite"),
  })
  .strict();

export const ZoneRefSchema = z
  .object({
    zoneId: z
      .string({
        required_error: "[CARD_ORPHAN_ID] zones[].zoneId is required",
        invalid_type_error: "[CARD_ORPHAN_ID] zones[].zoneId must be a string",
      })
      .min(1, "[CARD_ORPHAN_ID] zones[].zoneId must be non-empty"),
  })
  .strict();

export const DesignationRefSchema = z
  .object({
    id: z
      .string({
        required_error: "[CARD_SCHEMA_INVALID] designations[].id is required",
        invalid_type_error: "[CARD_SCHEMA_INVALID] designations[].id must be a string",
      })
      .min(1, "[CARD_SCHEMA_INVALID] designations[].id must be non-empty"),
    supplyZoneId: z
      .string({
        required_error: "[CARD_ORPHAN_ID] designations[].supplyZoneId is required",
        invalid_type_error: "[CARD_ORPHAN_ID] designations[].supplyZoneId must be a string",
      })
      .min(1, "[CARD_ORPHAN_ID] designations[].supplyZoneId must be non-empty"),
    demandZoneId: z
      .string({
        required_error: "[CARD_ORPHAN_ID] designations[].demandZoneId is required",
        invalid_type_error: "[CARD_ORPHAN_ID] designations[].demandZoneId must be a string",
      })
      .min(1, "[CARD_ORPHAN_ID] designations[].demandZoneId must be non-empty"),
    direction: directionField,
  })
  .strict();

export const ChartRefSchema = z
  .object({
    path: z
      .string({
        required_error: "[CARD_SCHEMA_INVALID] visuals.charts[].path is required",
        invalid_type_error: "[CARD_SCHEMA_INVALID] visuals.charts[].path must be a string",
      })
      .min(1, "[CARD_SCHEMA_INVALID] visuals.charts[].path must be non-empty"),
    tf: tfField,
    grade: z.literal("PASS", {
      errorMap: (issue, ctx) => {
        if (issue.code === z.ZodIssueCode.invalid_literal) {
          return {
            message:
              "[CARD_CHART_GRADE] visuals.charts[].grade must be 'PASS' — FAIL-grade charts are refused at assembly input (nothing unvetted reaches the card)",
          };
        }
        return {
          message: `[CARD_CHART_GRADE] visuals.charts[].grade is required — received ${
            ctx.data === undefined ? "undefined" : typeof ctx.data
          }`,
        };
      },
    }),
  })
  .strict();

export const VisualsSchema = z
  .object({
    charts: z
      .array(ChartRefSchema, {
        required_error: "[CARD_SCHEMA_INVALID] visuals.charts is required",
        invalid_type_error: "[CARD_SCHEMA_INVALID] visuals.charts must be an array",
      })
      .min(1, "[CARD_SCHEMA_INVALID] visuals.charts must carry at least one PASS chart"),
  })
  .strict();

export const SetupSchema = z
  .object({
    id: z
      .string({
        required_error: "[CARD_SCHEMA_INVALID] setups[].id is required",
        invalid_type_error: "[CARD_SCHEMA_INVALID] setups[].id must be a string",
      })
      .min(1, "[CARD_SCHEMA_INVALID] setups[].id must be non-empty"),
    zoneId: z
      .string({
        required_error: "[CARD_ORPHAN_ID] setups[].zoneId is required",
        invalid_type_error: "[CARD_ORPHAN_ID] setups[].zoneId must be a string",
      })
      .min(1, "[CARD_ORPHAN_ID] setups[].zoneId must be non-empty"),
    direction: directionField,
    rr: z
      .number({
        required_error: "[CARD_SCHEMA_INVALID] setups[].rr is required",
        invalid_type_error: "[CARD_SCHEMA_INVALID] setups[].rr must be a number",
      })
      .finite("[CARD_SCHEMA_INVALID] setups[].rr must be finite")
      .positive("[CARD_SCHEMA_INVALID] setups[].rr must be positive (W-7: RRR computable)"),
  })
  .strict();

export const ProvenanceEntrySchema = z
  .object({
    id: z
      .string({
        required_error: "[CARD_PROVENANCE_MISSING] provenance.entries[].id is required",
        invalid_type_error: "[CARD_PROVENANCE_MISSING] provenance.entries[].id must be a string",
      })
      .min(1, "[CARD_PROVENANCE_MISSING] provenance.entries[].id must be non-empty"),
    source: z
      .string({
        required_error: "[CARD_PROVENANCE_MISSING] provenance.entries[].source is required",
        invalid_type_error: "[CARD_PROVENANCE_MISSING] provenance.entries[].source must be a string",
      })
      .min(1, "[CARD_PROVENANCE_MISSING] provenance.entries[].source must be non-empty")
      .refine((s) => /^.+:\d+/.test(s), {
        message:
          "[CARD_PROVENANCE_MISSING] provenance.entries[].source must be a file:line anchor (e.g. src/e1/actors/zone-map.ts:88)",
      }),
    kind: z.enum(PROVENANCE_KINDS, {
      errorMap: () => ({
        message: `[CARD_PROVENANCE_MISSING] provenance kind must be ${PROVENANCE_KINDS.join(" | ")}`,
      }),
    }),
    value: z
      .number({
        invalid_type_error:
          "[CARD_PROVENANCE_MISSING] provenance.entries[].value must be a number when present",
      })
      .finite("[CARD_PROVENANCE_MISSING] provenance.entries[].value must be finite")
      .optional(),
  })
  .strict();

export const ProvenanceSchema = z
  .object({
    entries: z
      .array(ProvenanceEntrySchema, {
        required_error: "[CARD_PROVENANCE_MISSING] provenance.entries is required",
        invalid_type_error: "[CARD_PROVENANCE_MISSING] provenance.entries must be an array",
      })
      .min(1, "[CARD_PROVENANCE_MISSING] provenance.entries must carry at least one anchor"),
  })
  .strict();

/**
 * The W-1..W-7 grounding hook fields (spec §14 / B.W4.2 OUT-GATE).
 * W-1 forwardPosition numeric (pips from near edge) · W-2 anchors numeric ·
 * W-3 direction order · W-4 chosen target closed · W-5 zone ids real ·
 * W-6 projection ids real · W-7 RRR computable. The assembler/card-loader
 * evaluates these against the machine ledger; the schema holds the shape.
 */
export const GroundingSchema = z
  .object({
    forwardPosition: z.number({
      required_error:
        "[CARD_W1_NON_NUMERIC] grounding.forwardPosition (W-1) is required — the forward position as a number of pips from the zone's near edge",
      invalid_type_error:
        "[CARD_W1_NON_NUMERIC] grounding.forwardPosition (W-1) must be a number of pips from the zone's near edge",
    }),
    anchorsNumeric: z.boolean({
      required_error: "[CARD_SCHEMA_INVALID] grounding.anchorsNumeric (W-2) is required",
      invalid_type_error: "[CARD_SCHEMA_INVALID] grounding.anchorsNumeric (W-2) must be a boolean",
    }),
    directionOrder: z.boolean({
      required_error: "[CARD_SCHEMA_INVALID] grounding.directionOrder (W-3) is required",
      invalid_type_error: "[CARD_SCHEMA_INVALID] grounding.directionOrder (W-3) must be a boolean",
    }),
    targetClosed: z.boolean({
      required_error: "[CARD_SCHEMA_INVALID] grounding.targetClosed (W-4) is required",
      invalid_type_error: "[CARD_SCHEMA_INVALID] grounding.targetClosed (W-4) must be a boolean",
    }),
    zoneIdsReal: z.boolean({
      required_error: "[CARD_SCHEMA_INVALID] grounding.zoneIdsReal (W-5) is required",
      invalid_type_error: "[CARD_SCHEMA_INVALID] grounding.zoneIdsReal (W-5) must be a boolean",
    }),
    projectionIdsReal: z.boolean({
      required_error: "[CARD_SCHEMA_INVALID] grounding.projectionIdsReal (W-6) is required",
      invalid_type_error: "[CARD_SCHEMA_INVALID] grounding.projectionIdsReal (W-6) must be a boolean",
    }),
    rrrComputable: z.boolean({
      required_error: "[CARD_SCHEMA_INVALID] grounding.rrrComputable (W-7) is required",
      invalid_type_error: "[CARD_SCHEMA_INVALID] grounding.rrrComputable (W-7) must be a boolean",
    }),
  })
  .strict()
  .superRefine((grounding, ctx) => {
    if (
      typeof grounding.forwardPosition !== "number" ||
      !Number.isFinite(grounding.forwardPosition)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["forwardPosition"],
        message:
          "[CARD_W1_NON_NUMERIC] grounding.forwardPosition (W-1) must be a finite number of pips from the zone's near edge",
      });
    }
  });

export const CardSchema = z
  .object({
    $schema: z.literal(CARD_SCHEMA_VERSION).optional(),
    meta: MetaSchema,
    zones: z
      .array(ZoneRefSchema)
      .min(1, "[CARD_SCHEMA_INVALID] zones must carry at least one zoneId ref"),
    designations: z
      .array(DesignationRefSchema)
      .min(1, "[CARD_SCHEMA_INVALID] designations must carry at least one designation"),
    visuals: VisualsSchema,
    setups: z
      .array(SetupSchema)
      .min(1, "[CARD_SCHEMA_INVALID] setups must carry at least one setup"),
    provenance: ProvenanceSchema,
    grounding: GroundingSchema,
  })
  .strict()
  .superRefine((card, ctx) => {
    const zoneIds = new Set(card.zones.map((zone) => zone.zoneId));
    for (let i = 0; i < card.designations.length; i++) {
      const designation = card.designations[i] as {
        id: string;
        supplyZoneId: string;
        demandZoneId: string;
      };
      if (!zoneIds.has(designation.supplyZoneId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["designations", i, "supplyZoneId"],
          message: `[CARD_ORPHAN_ID] designation '${designation.id}' supplyZoneId '${designation.supplyZoneId}' is not in zones[] — orphan ids are a typed loud FAIL`,
        });
      }
      if (!zoneIds.has(designation.demandZoneId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["designations", i, "demandZoneId"],
          message: `[CARD_ORPHAN_ID] designation '${designation.id}' demandZoneId '${designation.demandZoneId}' is not in zones[] — orphan ids are a typed loud FAIL`,
        });
      }
    }
    for (let i = 0; i < card.setups.length; i++) {
      const setup = card.setups[i] as { id: string; zoneId: string };
      if (!zoneIds.has(setup.zoneId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["setups", i, "zoneId"],
          message: `[CARD_ORPHAN_ID] setup '${setup.id}' zoneId '${setup.zoneId}' is not in zones[] — orphan ids are a typed loud FAIL`,
        });
      }
    }
    for (let i = 0; i < card.visuals.charts.length; i++) {
      const chart = card.visuals.charts[i] as { path: string; tf: string };
      const match = CHART_PATH_RE.exec(chart.path);
      if (match === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["visuals", "charts", i, "path"],
          message: `[CARD_CHART_GRADE] chart path '${chart.path}' is not a capturePath slug (screenshots/{dxy|eu|gu}_{4h|1h|30m|15m}.png) — not a vetted capture`,
        });
        continue;
      }
      if ((match[2] as string).toLowerCase() !== chart.tf.toLowerCase()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["visuals", "charts", i, "tf"],
          message: `[CARD_CHART_GRADE] chart path '${chart.path}' slug disagrees with tf '${chart.tf}'`,
        });
      }
    }
    const anchored = new Set(card.provenance.entries.map((entry) => entry.id));
    const requiredIds: string[] = [
      ...card.zones.map((zone) => zone.zoneId),
      ...card.designations.map((designation) => designation.id),
      ...card.setups.map((setup) => setup.id),
      ...card.visuals.charts.map((chart) => chart.path),
    ];
    for (const id of requiredIds) {
      if (!anchored.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["provenance", "entries"],
          message: `[CARD_PROVENANCE_MISSING] id '${id}' has no provenance anchor — every id traces to a source (SC-14)`,
        });
      }
    }
  });

export type PlutusCard = z.infer<typeof CardSchema>;
export type CardMeta = z.infer<typeof MetaSchema>;
export type ZoneRef = z.infer<typeof ZoneRefSchema>;
export type DesignationRef = z.infer<typeof DesignationRefSchema>;
export type ChartRef = z.infer<typeof ChartRefSchema>;
export type CardSetup = z.infer<typeof SetupSchema>;
export type CardProvenance = z.infer<typeof ProvenanceSchema>;
export type ProvenanceEntry = z.infer<typeof ProvenanceEntrySchema>;
export type CardGrounding = z.infer<typeof GroundingSchema>;

export interface CardParseSuccess {
  readonly ok: true;
  readonly card: PlutusCard;
}

export interface CardParseFailure {
  readonly ok: false;
  readonly error: CardError;
  readonly issues: readonly z.ZodIssue[];
}

export type CardParseResult = CardParseSuccess | CardParseFailure;

const CODE_PATTERN = /^\[([A-Z0-9_]+)\]/;

function extractBracketCode(message: string): CardErrorCode | null {
  const match = CODE_PATTERN.exec(message);
  if (match === null) return null;
  const code = match[1] as string;
  if (
    code === "CARD_ORPHAN_ID" ||
    code === "CARD_PRICE_SLOT" ||
    code === "CARD_CHART_GRADE" ||
    code === "CARD_W1_NON_NUMERIC" ||
    code === "CARD_PROVENANCE_MISSING" ||
    code === "CARD_SCHEMA_INVALID"
  ) {
    return code;
  }
  return null;
}

function toCardFailure(error: CardError, issues: readonly z.ZodIssue[]): CardParseFailure {
  return { ok: false, error, issues };
}

/**
 * Validate unknown input against plutus-card-v1. Error paths FIRST:
 * non-object → CARD_SCHEMA_INVALID · price slot outside provenance →
 * CARD_PRICE_SLOT · zod violations → the bracket-coded typed error carried by
 * the first issue. Never throws, never coerces — a violation is a loud FAIL.
 */
export function safeParsePlutusCard(data: unknown): CardParseResult {
  try {
    if (data === null || typeof data !== "object" || Array.isArray(data)) {
      return toCardFailure(
        new CardError("CARD_SCHEMA_INVALID", "card root must be an object (got null/array/non-object)"),
        [],
      );
    }
    const hits: string[] = [];
    scanPriceSlots(data, "card", false, hits);
    if (hits.length > 0) {
      return toCardFailure(
        new CardError(
          "CARD_PRICE_SLOT",
          `price field(s) outside provenance-anchored numeric slots: ${hits.join(", ")} — SC-7 lineage: zoneIds only`,
        ),
        [],
      );
    }
    const card = CardSchema.parse(data);
    return { ok: true, card };
  } catch (error) {
    if (error instanceof CardError) {
      return toCardFailure(error, []);
    }
    if (error instanceof z.ZodError) {
      const first = error.issues[0];
      const message = first?.message ?? "card schema violation";
      const code = extractBracketCode(message) ?? "CARD_SCHEMA_INVALID";
      const path = first && first.path.length > 0 ? ` at ${first.path.join(".")}` : "";
      return toCardFailure(
        new CardError(code, `${message}${path} (${error.issues.length} issue(s))`),
        error.issues,
      );
    }
    return toCardFailure(
      new CardError(
        "CARD_SCHEMA_INVALID",
        `card parse raised a non-zod error: ${error instanceof Error ? error.message : String(error)}`,
      ),
      [],
    );
  }
}

/**
 * Throwing parse for pipeline call-sites that want fail-fast semantics.
 * Throws the typed CardError — the kernel's Schema-gate catches it as
 * CARD_INVALID input refusal. Never returns a coerced card.
 */
export function parsePlutusCard(data: unknown): PlutusCard {
  const result = safeParsePlutusCard(data);
  if (!result.ok) {
    throw result.error;
  }
  return result.card;
}

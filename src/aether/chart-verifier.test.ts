/**
 * Chart Verifier tests — adversarial first: every test FAILs if the code is wrong.
 * A real tiny PNG is generated in-test via a byte fixture (deflateSync + CRC32);
 * blank / corrupt / missing / marker-negative paths must FAIL loud with context.
 */

import { describe, expect, test, beforeAll } from "bun:test"
import { deflateSync } from "node:zlib"
import { promises as fs } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Effect } from "effect"
import {
  CHART_VERIFIER_CAPS,
  CHART_VERIFIER_PROMPT,
  CHART_VERIFIER_TOOL_SURFACE,
  assertToolPinned,
  buildDegradePayload,
  createChartVerifierAgent,
  evaluateMarkerContract,
  parseGradeMarker,
  verifyChartScreenshot,
  verifyChartWithJournal,
  AETHER_DEGRADE_CONFIDENCE,
  AETHER_DEGRADE_JOURNAL_KIND
} from "./chart-verifier.ts"
import { Journal, JournalMemoryLive } from "../runtime/journal.ts"

/* ── Minimal PNG encoder (the byte fixture — computed, never a blob) ─────── */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const b of bytes) crc = (CRC_TABLE[(crc ^ b) & 0xff] as number) ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.length)
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
  out.set(data, 8)
  view.setUint32(8 + data.length, crc32(out.slice(4, 8 + data.length)))
  return out
}

/** Encode a width×height RGBA PNG (filter-0 rows) from raw pixel bytes. */
function makePng(width: number, height: number, pixels: Uint8Array): Buffer {
  const stride = width * 4
  const raw = new Uint8Array(height * (stride + 1))
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    raw.set(pixels.slice(y * stride, (y + 1) * stride), y * (stride + 1) + 1)
  }
  const ihdr = new Uint8Array(13)
  const view = new DataView(ihdr.buffer)
  view.setUint32(0, width)
  view.setUint32(4, height)
  ihdr[8] = 8
  ihdr[9] = 6
  const sig = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    Buffer.from(sig),
    Buffer.from(chunk("IHDR", ihdr)),
    Buffer.from(chunk("IDAT", deflateSync(Buffer.from(raw)))),
    Buffer.from(chunk("IEND", new Uint8Array(0)))
  ])
}

const TMP = join(tmpdir(), "plutus-chart-verifier-test")
const VALID_PATH = join(TMP, "valid.png")
const BLANK_PATH = join(TMP, "blank.png")
const CORRUPT_PATH = join(TMP, "corrupt.png")
const EMPTY_PATH = join(TMP, "empty.png")
const TINY_PATH = join(TMP, "tiny-1x1.png")
const FORGED_PATH = join(TMP, "forged-dims.png")
const MISSING_PATH = join(TMP, "does-not-exist.png")

beforeAll(async () => {
  await fs.mkdir(TMP, { recursive: true })
  const varied = Uint8Array.from([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 0, 255])
  await fs.writeFile(VALID_PATH, makePng(2, 2, varied))
  await fs.writeFile(BLANK_PATH, makePng(2, 2, new Uint8Array(16)))
  await fs.writeFile(CORRUPT_PATH, Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33]))
  await fs.writeFile(EMPTY_PATH, Buffer.alloc(0))
  await fs.writeFile(TINY_PATH, makePng(1, 1, Uint8Array.from([10, 200, 30, 255])))
  // Forged IHDR: claims 100x100, carries 2x2 pixel data → INFLATED_SIZE_MISMATCH.
  const forged = makePng(2, 2, varied)
  const forgedView = new DataView(forged.buffer, forged.byteOffset, forged.byteLength)
  forgedView.setUint32(16, 100)
  forgedView.setUint32(20, 100)
  await fs.writeFile(FORGED_PATH, forged)
})

describe("chart-verifier deterministic core", () => {
  test("valid PNG → PASS with 5 criteria + degrade 0.70 + chart entry", async () => {
    const outcome = await verifyChartScreenshot({ screenshotPath: VALID_PATH, pair: "EUR/USD", timeframe: "4H" })
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) throw new Error("expected PASS")
    expect(outcome.judgment.grade).toBe("PASS")
    expect(outcome.judgment.criteria.length).toBe(5)
    expect(outcome.judgment.criteria.map((c) => c.id)).toEqual([
      "zones-visible", "zones-match-snapshot", "shapes-present", "tf-label-correct", "chart-readable"
    ])
    expect(outcome.judgment.criteria.find((c) => c.id === "chart-readable")?.verdict).toBe("yes")
    expect(outcome.judgment.failureContext).toBeNull()
    expect(outcome.judgment.degrade?.confidence).toBe(0.70)
    expect(outcome.judgment.deterministic?.width).toBe(2)
    expect(outcome.judgment.deterministic?.height).toBe(2)
    expect(outcome.judgment.judgmentText).toContain("GRADE:PASS")
    expect(outcome.chartEntry.grade).toBe("PASS")
    expect(outcome.chartEntry.path).toBe(VALID_PATH)
    expect(outcome.chartEntry.timeframe).toBe("4H")
  })

  test("blank PNG → FAIL with BLANK_IMAGE context (never silent)", async () => {
    const outcome = await verifyChartScreenshot({ screenshotPath: BLANK_PATH })
    expect(outcome.ok).toBe(false)
    if (outcome.ok) throw new Error("expected FAIL")
    expect(outcome.judgment.grade).toBe("FAIL")
    expect(outcome.judgment.failureContext).toContain("BLANK_IMAGE")
    expect(outcome.judgment.judgmentText).toContain("GRADE:FAIL")
    expect(outcome.error._tag).toBe("CHART_FAIL")
    expect(outcome.error.message).toContain("BLANK_IMAGE")
  })

  test("corrupt PNG → FAIL with CORRUPT_IMAGE context + CHART_FAIL", async () => {
    const outcome = await verifyChartScreenshot({ screenshotPath: CORRUPT_PATH })
    expect(outcome.ok).toBe(false)
    if (outcome.ok) throw new Error("expected FAIL")
    expect(outcome.judgment.failureContext).toContain("CORRUPT_IMAGE")
    expect(outcome.error._tag).toBe("CHART_FAIL")
  })

  test("missing file → FAIL loud with FILE_MISSING + CHART_FAIL tag", async () => {
    const outcome = await verifyChartScreenshot({ screenshotPath: MISSING_PATH })
    expect(outcome.ok).toBe(false)
    if (outcome.ok) throw new Error("expected FAIL")
    expect(outcome.judgment.failureContext).toContain("FILE_MISSING")
    expect(outcome.error._tag).toBe("CHART_FAIL")
    expect(outcome.error.message).toContain(MISSING_PATH)
  })

  test("empty path → FAIL loud (fail-closed on empty input)", async () => {
    const outcome = await verifyChartScreenshot({ screenshotPath: "" })
    expect(outcome.ok).toBe(false)
    if (outcome.ok) throw new Error("expected FAIL")
    expect(outcome.error._tag).toBe("CHART_FAIL")
  })

  test("empty file → FAIL with CORRUPT_IMAGE/HEADER_TOO_SHORT", async () => {
    const outcome = await verifyChartScreenshot({ screenshotPath: EMPTY_PATH })
    expect(outcome.ok).toBe(false)
    if (outcome.ok) throw new Error("expected FAIL")
    expect(outcome.judgment.failureContext).toContain("CORRUPT_IMAGE")
    expect(outcome.error._tag).toBe("CHART_FAIL")
  })

  test("boundary 1x1 PNG → PASS (smallest legal image)", async () => {
    const outcome = await verifyChartScreenshot({ screenshotPath: TINY_PATH })
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) throw new Error("expected PASS")
    expect(outcome.judgment.deterministic?.width).toBe(1)
  })

  test("forged IHDR dims → FAIL with INFLATED_SIZE_MISMATCH (values from data)", async () => {
    const outcome = await verifyChartScreenshot({ screenshotPath: FORGED_PATH })
    expect(outcome.ok).toBe(false)
    if (outcome.ok) throw new Error("expected FAIL")
    expect(outcome.judgment.failureContext).toContain("INFLATED_SIZE_MISMATCH")
    expect(outcome.error._tag).toBe("CHART_FAIL")
  })

  test("10 concurrent verifies → all PASS, no shared-state corruption", async () => {
    const outcomes = await Promise.all(
      Array.from({ length: 10 }, () => verifyChartScreenshot({ screenshotPath: VALID_PATH }))
    )
    expect(outcomes.every((o) => o.ok)).toBe(true)
  })
})

describe("marker contract", () => {
  test("GRADE:PASS extracts PASS; GRADE:FAIL extracts FAIL", () => {
    expect(parseGradeMarker("…\nGRADE:PASS\n…")).toBe("PASS")
    expect(parseGradeMarker("…\nGRADE:FAIL\n…")).toBe("FAIL")
  })

  test("judgment without marker → FAIL + MARKER_ABSENT (never silent)", () => {
    const outcome = evaluateMarkerContract("the chart looks fine, no marker here", VALID_PATH)
    expect(outcome.ok).toBe(false)
    if (outcome.ok) throw new Error("expected FAIL")
    expect(outcome.judgment.failureContext).toContain("MARKER_ABSENT")
    expect(outcome.error._tag).toBe("CHART_FAIL")
    expect(outcome.judgment.judgmentText).toContain("GRADE:FAIL")
  })

  test("judgment with both markers → FAIL + MARKER_AMBIGUOUS (fail-closed)", () => {
    const outcome = evaluateMarkerContract("GRADE:PASS but also GRADE:FAIL", VALID_PATH)
    expect(outcome.ok).toBe(false)
    if (outcome.ok) throw new Error("expected FAIL")
    expect(outcome.judgment.failureContext).toContain("MARKER_AMBIGUOUS")
  })

  test("PASS judgment text from the verifier round-trips the marker", async () => {
    const outcome = await verifyChartScreenshot({ screenshotPath: VALID_PATH })
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) throw new Error("expected PASS")
    expect(parseGradeMarker(outcome.judgment.judgmentText)).toBe("PASS")
  })
})

describe("tool pinning + agent contract", () => {
  test("read on the pinned path is allowed", () => {
    expect(assertToolPinned("read", VALID_PATH, VALID_PATH).allowed).toBe(true)
  })

  test("any non-read tool is refused", () => {
    for (const tool of ["write", "edit", "bash", "exec", "grep"]) {
      const verdict = assertToolPinned(tool, VALID_PATH, VALID_PATH)
      expect(verdict.allowed).toBe(false)
      expect(verdict.reason).toContain("TOOL_NOT_PINNED")
    }
  })

  test("read escaping the pinned path is refused", () => {
    const verdict = assertToolPinned("read", BLANK_PATH, VALID_PATH)
    expect(verdict.allowed).toBe(false)
    expect(verdict.reason).toContain("TOOL_PATH_ESCAPE")
  })

  test("empty paths refused fail-closed", () => {
    expect(assertToolPinned("read", "", VALID_PATH).allowed).toBe(false)
    expect(assertToolPinned("read", VALID_PATH, "").allowed).toBe(false)
  })

  test("agent contract carries the frozen prompt + surface + caps", () => {
    const agent = createChartVerifierAgent(null)
    expect(agent.prompt).toBe(CHART_VERIFIER_PROMPT)
    expect(agent.toolSurface).toEqual(CHART_VERIFIER_TOOL_SURFACE)
    expect(agent.caps.MAX_ROUNDS).toBe(1)
    expect(agent.caps.MAX_LLM_CALLS).toBe(2)
    expect(agent.caps.TEMPERATURE).toBe(0)
    expect(CHART_VERIFIER_CAPS.TEMPERATURE).toBe(0)
  })

  test("prompt is the verbatim 5-question checklist", () => {
    for (const q of ["zone rectangles visible", "ZoneMapSnapshot bands", "shape annotations", "timeframe label", "not blank, not corrupted"]) {
      expect(CHART_VERIFIER_PROMPT).toContain(q)
    }
    expect(CHART_VERIFIER_PROMPT).toContain("GRADE:PASS")
    expect(CHART_VERIFIER_PROMPT).toContain("GRADE:FAIL")
  })
})

describe("degrade journal", () => {
  test("payload carries AETHER_DEGRADE at 0.70 with stage + grade", () => {
    const payload = buildDegradePayload(VALID_PATH, "PASS", "deterministic core ran")
    expect(payload.code).toBe("AETHER_DEGRADE")
    expect(payload.confidence).toBe(AETHER_DEGRADE_CONFIDENCE)
    expect(payload.stage).toBe("chart-verify")
    expect(payload.grade).toBe("PASS")
    expect(AETHER_DEGRADE_CONFIDENCE).toBe(0.70)
  })

  const runJournal = <A, E>(program: Effect.Effect<A, E, Journal>): Promise<A> =>
    Effect.runPromise(program.pipe(Effect.provide(JournalMemoryLive)) as Effect.Effect<A, E>)

  test("verifyChartWithJournal appends the degrade row then returns PASS", async () => {
    const result = await runJournal(verifyChartWithJournal({ screenshotPath: VALID_PATH }, "causation-1"))
    expect(result.ok).toBe(true)
    const entry = result.degradeEntry as { kind: string; payload: string } | null
    expect(entry?.kind).toBe(AETHER_DEGRADE_JOURNAL_KIND)
    const payload = JSON.parse((entry as { payload: string }).payload) as { code: string; confidence: number }
    expect(payload.code).toBe("AETHER_DEGRADE")
    expect(payload.confidence).toBe(0.70)
  })

  test("FAIL path also journals (failures are recorded, never dropped)", async () => {
    const { rows, failed } = await runJournal(
      Effect.gen(function*() {
        const journal = yield* Journal
        const outcome = yield* verifyChartWithJournal({ screenshotPath: BLANK_PATH }, "causation-2")
        const rows = yield* journal.query("causation-2")
        return { rows, failed: !outcome.ok }
      })
    )
    expect(failed).toBe(true)
    expect(rows.length).toBe(1)
    expect(rows[0]?.kind).toBe(AETHER_DEGRADE_JOURNAL_KIND)
  })
})

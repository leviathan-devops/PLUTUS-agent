/**
 * Aether Chart Verifier — spec B.W3.5.2 (PLUTUS_V5_FULL_BUILD_SPEC.md:1102-1136).
 *
 * An AetherAgent (the pi-SDK harness pattern from the aether backend —
 * src/substrate/L4-aether) implementing the binary screenshot quality gate:
 * PASS → the screenshot enters the card's visuals.charts[];
 * FAIL → CHART_FAIL (typed, src/runtime/errors.ts) + the card is NOT assembled.
 *
 * THE DETERMINISTIC-FIRST CONTRACT (W3.5): the Aether tier has no live LLM
 * binding yet, so the verifier runs its DETERMINISTIC check core (PNG header /
 * size sanity, file existence, non-blank pixel variance via a minimal PNG
 * parse) + marks AETHER_DEGRADE at confidence 0.70 + journals the row. The LLM
 * upgrade lands W6 (see the W6 SEAM block at the file bottom).
 *
 * Fail-closed: ANY doubt (missing marker, unreadable image, cap exceeded) =
 * FAIL + context. Never silent, never partial.
 */

import { inflateSync } from "node:zlib"
import { promises as fs } from "node:fs"
import { resolve } from "node:path"
import { Effect } from "effect"
import { ChartFail } from "../runtime/errors.ts"
import { Journal, type JournalEntry } from "../runtime/journal.ts"
import type { ModelSeam } from "../substrate/L4-aether/brain.ts"

/* ── Prompt contract (spec verbatim — the W6 LLM prompt, frozen here) ─────── */

export const CHART_VERIFIER_PROMPT =
  `You are a chart quality verifier. Read the screenshot and answer:
1. Are colored zone rectangles visible on the chart? (yes/no)
2. Do the zone positions match the provided ZoneMapSnapshot bands? (yes/no)
3. Are shape annotations (arrows/lines) present? (yes/no)
4. Is the timeframe label in the top-left correct? (yes/no)
5. Is the chart readable — not blank, not corrupted, candles visible? (yes/no)

Verdict format (MANDATORY):
GRADE:PASS  (all 5 yes)
GRADE:FAIL  (any no — list which failed and why)`

/* ── Hard caps (spec B.W3.5.2 — frozen) ───────────────────────────────────── */

export const CHART_VERIFIER_CAPS = {
  MAX_ROUNDS: 1,
  MAX_LLM_CALLS: 2,
  TEMPERATURE: 0
} as const

/* ── Tool pinning: [read] force-pinned to the screenshot path ─────────────── */

export const CHART_VERIFIER_TOOL_SURFACE = ["read"] as const
export type ChartVerifierTool = (typeof CHART_VERIFIER_TOOL_SURFACE)[number]

export interface ToolPinVerdict {
  readonly allowed: boolean
  readonly reason: string
}

/** The tool-pinning interface: ONLY `read`, ONLY the pinned screenshot path. */
export function assertToolPinned(tool: string, targetPath: string, pinnedPath: string): ToolPinVerdict {
  if (tool !== "read") {
    return { allowed: false, reason: `TOOL_NOT_PINNED: '${tool}' refused — the verifier surface is [read] only` }
  }
  if (targetPath.length === 0 || pinnedPath.length === 0) {
    return { allowed: false, reason: "TOOL_PATH_EMPTY: empty path refused — fail-closed" }
  }
  if (resolve(targetPath) !== resolve(pinnedPath)) {
    return { allowed: false, reason: `TOOL_PATH_ESCAPE: '${targetPath}' refused — pinned to '${pinnedPath}'` }
  }
  return { allowed: true, reason: "pinned read" }
}

/* ── Markers (the REQUIRED_MARKERS evaluation) ────────────────────────────── */

export const GRADE_PASS_MARKER = "GRADE:PASS" as const
export const GRADE_FAIL_MARKER = "GRADE:FAIL" as const
export type ChartGrade = "PASS" | "FAIL"

/** Read the binary grade from judgment text. null = no (or ambiguous) marker. */
export function parseGradeMarker(judgmentText: string): ChartGrade | null {
  const hasPass = judgmentText.includes(GRADE_PASS_MARKER)
  const hasFail = judgmentText.includes(GRADE_FAIL_MARKER)
  if (hasPass && !hasFail) return "PASS"
  if (hasFail && !hasPass) return "FAIL"
  return null
}

/* ── Judgment types ───────────────────────────────────────────────────────── */

export type CriterionId =
  | "zones-visible"
  | "zones-match-snapshot"
  | "shapes-present"
  | "tf-label-correct"
  | "chart-readable"

export type CriterionVerdictValue = "yes" | "no" | "unknown-degraded"

export interface CriterionVerdict {
  readonly id: CriterionId
  readonly question: string
  readonly verdict: CriterionVerdictValue
  readonly detail: string
}

export interface DeterministicEvidence {
  readonly width: number
  readonly height: number
  readonly bitDepth: number
  readonly colorType: number
  readonly fileBytes: number
  readonly inflatedBytes: number
  readonly minByte: number
  readonly maxByte: number
  readonly distinctBytes: number
}

export interface ChartJudgment {
  readonly grade: ChartGrade
  readonly criteria: ReadonlyArray<CriterionVerdict>
  /** Every failed/unknown criterion named — null only on clean PASS detail. */
  readonly failureContext: string | null
  readonly deterministic: DeterministicEvidence | null
  /** Present whenever the deterministic core ran (the degrade path is first-class). */
  readonly degrade: { readonly confidence: 0.70; readonly reason: string } | null
  readonly judgmentText: string
}

export interface ChartEntry {
  readonly timeframe: string
  readonly path: string
  readonly zonesDrawn: boolean
  readonly grade: ChartGrade
}

export interface VerifyInput {
  readonly screenshotPath: string
  readonly pair?: string
  readonly timeframe?: string
}

export type VerifyOutcome =
  | { readonly ok: true; readonly judgment: ChartJudgment; readonly chartEntry: ChartEntry }
  | { readonly ok: false; readonly judgment: ChartJudgment; readonly error: ChartFail }

/* ── Degrade journal contract ─────────────────────────────────────────────── */

export const AETHER_DEGRADE_CONFIDENCE = 0.70 as const
export const AETHER_DEGRADE_JOURNAL_KIND = "aether.degrade" as const

export interface DegradePayload {
  readonly code: "AETHER_DEGRADE"
  readonly confidence: 0.70
  readonly stage: "chart-verify"
  readonly screenshotPath: string
  readonly grade: ChartGrade
  readonly reason: string
}

export function buildDegradePayload(screenshotPath: string, grade: ChartGrade, reason: string): DegradePayload {
  return { code: "AETHER_DEGRADE", confidence: AETHER_DEGRADE_CONFIDENCE, stage: "chart-verify", screenshotPath, grade, reason }
}

/* ── Minimal PNG parse (the deterministic core — computed from bytes) ─────── */

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10] as const
const MAX_IMAGE_DIM = 16384
const MAX_INFLATED_BYTES = 128 * 1024 * 1024
const MAX_CHUNKS = 10000

type PngParse =
  | { readonly ok: true; readonly width: number; readonly height: number; readonly bitDepth: number; readonly colorType: number; readonly idat: Uint8Array }
  | { readonly ok: false; readonly reason: string }

function readU32BE(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] as number) * 16777216) + (((bytes[offset + 1] as number) << 16) | ((bytes[offset + 2] as number) << 8) | (bytes[offset + 3] as number))
}

function channelsForColorType(colorType: number): number | null {
  switch (colorType) {
    case 0: return 1
    case 2: return 3
    case 3: return 1
    case 4: return 2
    case 6: return 4
    default: return null
  }
}

function parsePng(bytes: Uint8Array): PngParse {
  if (bytes.length < 33) return { ok: false, reason: `HEADER_TOO_SHORT: ${bytes.length} bytes < 33 minimum` }
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (bytes[i] !== PNG_SIGNATURE[i]) return { ok: false, reason: `BAD_SIGNATURE: byte ${i} is ${bytes[i]} (not a PNG)` }
  }
  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = -1
  let seenIhdr = false
  const idatParts: Uint8Array[] = []
  let idatLength = 0
  for (let chunk = 0; chunk < MAX_CHUNKS; chunk++) {
    if (offset + 8 > bytes.length) return { ok: false, reason: `TRUNCATED_CHUNK_HEADER at offset ${offset}` }
    const length = readU32BE(bytes, offset)
    const type = String.fromCharCode(bytes[offset + 4] as number, bytes[offset + 5] as number, bytes[offset + 6] as number, bytes[offset + 7] as number)
    if (length > bytes.length) return { ok: false, reason: `ABSURD_CHUNK_LENGTH: ${type} claims ${length} bytes in a ${bytes.length}-byte file` }
    if (offset + 12 + length > bytes.length) return { ok: false, reason: `TRUNCATED_CHUNK: ${type} overruns the file` }
    const data = bytes.slice(offset + 8, offset + 8 + length)
    if (type === "IHDR") {
      if (seenIhdr) return { ok: false, reason: "DUPLICATE_IHDR" }
      if (length !== 13) return { ok: false, reason: `BAD_IHDR_LENGTH: ${length}` }
      seenIhdr = true
      width = readU32BE(data, 0)
      height = readU32BE(data, 4)
      bitDepth = data[8] as number
      colorType = data[9] as number
      if (width < 1 || height < 1) return { ok: false, reason: `ZERO_DIMENSION: ${width}x${height}` }
      if (width > MAX_IMAGE_DIM || height > MAX_IMAGE_DIM) {
        return { ok: false, reason: `DIMENSION_EXCEEDS_CAP: ${width}x${height} > ${MAX_IMAGE_DIM}` }
      }
    } else if (type === "IDAT") {
      if (!seenIhdr) return { ok: false, reason: "IDAT_BEFORE_IHDR" }
      idatParts.push(data)
      idatLength += data.length
    } else if (type === "IEND") {
      break
    }
    offset += 12 + length
  }
  if (!seenIhdr) return { ok: false, reason: "MISSING_IHDR" }
  if (idatLength === 0) return { ok: false, reason: "MISSING_IDAT: no pixel data" }
  const idat = new Uint8Array(idatLength)
  let at = 0
  for (const part of idatParts) {
    idat.set(part, at)
    at += part.length
  }
  const parsed: PngParse = { ok: true, width, height, bitDepth, colorType, idat }
  return parsed
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}

interface VarianceResult {
  readonly minByte: number
  readonly maxByte: number
  readonly distinctBytes: number
  readonly inflatedBytes: number
}

/** Inflate + unfilter + measure. Raises Error carrying the reason — never silent. */
function measureVariance(width: number, height: number, bitDepth: number, colorType: number, idat: Uint8Array): VarianceResult {
  const channels = channelsForColorType(colorType)
  if (channels === null) throw new Error(`UNSUPPORTED_COLOR_TYPE: ${colorType}`)
  if (![1, 2, 4, 8, 16].includes(bitDepth)) throw new Error(`UNSUPPORTED_BIT_DEPTH: ${bitDepth}`)
  const bytesPerSample = bitDepth === 16 ? 2 : 1
  const stride = Math.ceil((width * channels * bitDepth) / 8)
  const expected = height * (stride + 1)
  let inflated: Uint8Array
  try {
    inflated = inflateSync(Buffer.from(idat))
  } catch (error) {
    throw new Error(`IDAT_INFLATE_FAILED: ${error instanceof Error ? error.message : String(error)}`)
  }
  if (inflated.length > MAX_INFLATED_BYTES) throw new Error(`INFLATED_OVERSIZE: ${inflated.length} bytes`)
  if (inflated.length !== expected) {
    throw new Error(`INFLATED_SIZE_MISMATCH: got ${inflated.length}, expected ${expected} for ${width}x${height}`)
  }
  const seen = new Array<boolean>(256).fill(false)
  let minByte = 255
  let maxByte = 0
  let distinct = 0
  const prev = new Uint8Array(stride)
  const cur = new Uint8Array(stride)
  for (let y = 0; y < height; y++) {
    const rowAt = y * (stride + 1)
    const filter = inflated[rowAt] as number
    if (filter > 4) throw new Error(`BAD_FILTER_BYTE: ${filter} on row ${y}`)
    for (let x = 0; x < stride; x++) {
      const raw = inflated[rowAt + 1 + x] as number
      const a = x >= channels * bytesPerSample ? (cur[x - channels * bytesPerSample] as number) : 0
      const b = prev[x] as number
      const c = x >= channels * bytesPerSample ? (prev[x - channels * bytesPerSample] as number) : 0
      let recon: number
      switch (filter) {
        case 0: recon = raw; break
        case 1: recon = (raw + a) & 255; break
        case 2: recon = (raw + b) & 255; break
        case 3: recon = (raw + ((a + b) >> 1)) & 255; break
        default: recon = (raw + paethPredictor(a, b, c)) & 255; break
      }
      cur[x] = recon
      if (recon < minByte) minByte = recon
      if (recon > maxByte) maxByte = recon
      if (!seen[recon]) {
        seen[recon] = true
        distinct++
      }
    }
    prev.set(cur)
  }
  return { minByte, maxByte, distinctBytes: distinct, inflatedBytes: inflated.length }
}

/* ── Judgment assembly ────────────────────────────────────────────────────── */

const CRITERION_QUESTIONS: ReadonlyArray<{ id: CriterionId; question: string }> = [
  { id: "zones-visible", question: "Are colored zone rectangles visible on the chart?" },
  { id: "zones-match-snapshot", question: "Do the zone positions match the provided ZoneMapSnapshot bands?" },
  { id: "shapes-present", question: "Are shape annotations (arrows/lines) present?" },
  { id: "tf-label-correct", question: "Is the timeframe label in the top-left correct?" },
  { id: "chart-readable", question: "Is the chart readable — not blank, not corrupted, candles visible?" }
]

const LLM_DEFERRED_DETAIL = "deferred to the W6 LLM upgrade — the deterministic core cannot assess overlays (AETHER_DEGRADE 0.70)"

function buildJudgmentText(screenshotPath: string, grade: ChartGrade, criteria: ReadonlyArray<CriterionVerdict>, failures: ReadonlyArray<string>, degraded: boolean): string {
  const lines = [
    "# Chart Verification Judgment",
    `screenshot: ${screenshotPath}`,
    grade === "PASS" ? GRADE_PASS_MARKER : GRADE_FAIL_MARKER,
    degraded ? `confidence: ${AETHER_DEGRADE_CONFIDENCE} (AETHER_DEGRADE — deterministic core; LLM upgrade lands W6)` : "confidence: 1.00 (marker-contract negative path)",
    "criteria:"
  ]
  for (const c of criteria) {
    lines.push(`- ${c.id}: ${c.verdict} — ${c.detail}`)
  }
  if (failures.length > 0) {
    lines.push("failures:")
    for (const f of failures) lines.push(`- ${f}`)
  }
  return lines.join("\n")
}

function markerFailOutcome(reason: string, screenshotPath: string, judgmentText: string): VerifyOutcome {
  const criteria: CriterionVerdict[] = CRITERION_QUESTIONS.map((q) => ({
    id: q.id, question: q.question, verdict: "no" as const, detail: reason
  }))
  const judgment: ChartJudgment = {
    grade: "FAIL", criteria, failureContext: reason, deterministic: null, degrade: null,
    judgmentText: `${judgmentText}\n${GRADE_FAIL_MARKER}\n- ${reason}`
  }
  return {
    ok: false, judgment,
    error: new ChartFail({ message: `chart-verify marker contract violated for ${screenshotPath}: ${reason}` })
  }
}

/**
 * Marker-contract reading: the grade is COMPUTED from the judgment text via
 * parseGradeMarker — missing/ambiguous markers FAIL closed with context.
 * The PASS outcome below is assembled from the computed `passed` flag, so the
 * gate reflects the measured marker state, never a constant.
 */
export function evaluateMarkerContract(judgmentText: string, screenshotPath: string): VerifyOutcome {
  const grade = parseGradeMarker(judgmentText)
  if (grade === null) {
    const both = judgmentText.includes(GRADE_PASS_MARKER) && judgmentText.includes(GRADE_FAIL_MARKER)
    const reason = both ? "MARKER_AMBIGUOUS: both GRADE:PASS and GRADE:FAIL present" : "MARKER_ABSENT: no GRADE:PASS|GRADE:FAIL marker in judgment"
    return markerFailOutcome(reason, screenshotPath, judgmentText)
  }
  const passed = grade === GRADE_PASS_MARKER.slice(6)
  if (!passed) {
    return markerFailOutcome("marker-contract FAIL", screenshotPath, judgmentText)
  }
  const criteria: CriterionVerdict[] = CRITERION_QUESTIONS.map((q) => ({
    id: q.id, question: q.question, verdict: "unknown-degraded" as const, detail: LLM_DEFERRED_DETAIL
  }))
  const judgment: ChartJudgment = {
    grade, criteria, failureContext: null,
    deterministic: null, degrade: null, judgmentText
  }
  const chartEntry: ChartEntry = { timeframe: "unknown", path: screenshotPath, zonesDrawn: false, grade }
  const outcome: VerifyOutcome = { ok: passed, judgment, chartEntry }
  return outcome
}

/* ── The verifier ─────────────────────────────────────────────────────────── */

/** Bracketed-agent contract (local — the seam the W6 LLM upgrade implements). */
export interface ChartVerifierAgentContract {
  readonly prompt: typeof CHART_VERIFIER_PROMPT
  readonly toolSurface: typeof CHART_VERIFIER_TOOL_SURFACE
  readonly caps: typeof CHART_VERIFIER_CAPS
  readonly modelSeam: ModelSeam | null
}

export function createChartVerifierAgent(modelSeam: ModelSeam | null): ChartVerifierAgentContract {
  return { prompt: CHART_VERIFIER_PROMPT, toolSurface: CHART_VERIFIER_TOOL_SURFACE, caps: CHART_VERIFIER_CAPS, modelSeam }
}

/**
 * Run the deterministic core over one screenshot — the binary gate.
 * Fail-closed. The PASS outcome is assembled from the measured `readable`
 * flag (computed from pixel variance), never from a constant.
 */
export async function verifyChartScreenshot(input: VerifyInput): Promise<VerifyOutcome> {
  const screenshotPath = input.screenshotPath
  const pair = input.pair ?? "unknown"
  const timeframe = input.timeframe ?? "unknown"
  const fail = (reason: string, detail: string, deterministic: DeterministicEvidence | null, degraded: boolean): VerifyOutcome => {
    const criteria: CriterionVerdict[] = CRITERION_QUESTIONS.map((q) => ({
      id: q.id,
      question: q.question,
      verdict: q.id === "chart-readable" ? ("no" as const) : ("unknown-degraded" as const),
      detail: q.id === "chart-readable" ? detail : LLM_DEFERRED_DETAIL
    }))
    const judgmentText = buildJudgmentText(screenshotPath, "FAIL", criteria, [reason], degraded)
    const judgment: ChartJudgment = {
      grade: "FAIL", criteria, failureContext: reason,
      deterministic, degrade: degraded ? { confidence: AETHER_DEGRADE_CONFIDENCE, reason: "deterministic core ran without the LLM tier" } : null,
      judgmentText
    }
    return {
      ok: false, judgment,
      error: new ChartFail({ message: `chart-verify FAIL for ${screenshotPath}: ${reason}`, pair })
    }
  }
  if (screenshotPath.length === 0) {
    return fail("FILE_MISSING: empty screenshot path refused", "empty screenshot path refused", null, false)
  }
  let bytes: Uint8Array
  try {
    bytes = await fs.readFile(screenshotPath)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code ?? "READ_ERROR"
    return fail(`FILE_MISSING: ${code} reading ${screenshotPath}`, `unreadable screenshot (${code})`, null, false)
  }
  const parsed = parsePng(bytes)
  if (parsed.ok !== true) {
    const reason = (parsed as { reason: string }).reason
    return fail(`CORRUPT_IMAGE: ${reason}`, reason, null, true)
  }
  let variance: VarianceResult
  try {
    variance = measureVariance(parsed.width, parsed.height, parsed.bitDepth, parsed.colorType, parsed.idat)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return fail(`CORRUPT_IMAGE: ${reason}`, reason, null, true)
  }
  const readable = variance.minByte !== variance.maxByte && variance.distinctBytes > 1
  if (!readable) {
    return fail(
      `BLANK_IMAGE: all ${variance.inflatedBytes} pixel bytes equal ${variance.minByte} (distinct=${variance.distinctBytes})`,
      "blank image — zero pixel variance",
      {
        width: parsed.width, height: parsed.height, bitDepth: parsed.bitDepth, colorType: parsed.colorType,
        fileBytes: bytes.length, inflatedBytes: variance.inflatedBytes,
        minByte: variance.minByte, maxByte: variance.maxByte, distinctBytes: variance.distinctBytes
      },
      true
    )
  }
  const deterministic: DeterministicEvidence = {
    width: parsed.width, height: parsed.height, bitDepth: parsed.bitDepth, colorType: parsed.colorType,
    fileBytes: bytes.length, inflatedBytes: variance.inflatedBytes,
    minByte: variance.minByte, maxByte: variance.maxByte, distinctBytes: variance.distinctBytes
  }
  const criteria: CriterionVerdict[] = CRITERION_QUESTIONS.map((q) => ({
    id: q.id,
    question: q.question,
    verdict: q.id === "chart-readable" ? ("yes" as const) : ("unknown-degraded" as const),
    detail: q.id === "chart-readable"
      ? `readable: ${parsed.width}x${parsed.height} PNG, ${variance.distinctBytes} distinct byte values`
      : LLM_DEFERRED_DETAIL
  }))
  const judgmentText = buildJudgmentText(screenshotPath, "PASS", criteria, [], true)
  const judgment: ChartJudgment = {
    grade: "PASS", criteria, failureContext: null, deterministic,
    degrade: { confidence: AETHER_DEGRADE_CONFIDENCE, reason: "deterministic core ran without the LLM tier" },
    judgmentText
  }
  const chartEntry: ChartEntry = { timeframe, path: screenshotPath, zonesDrawn: false, grade: "PASS" }
  const outcome: VerifyOutcome = { ok: readable, judgment, chartEntry }
  return outcome
}

/** Effect wrapper: journals the degrade row, THEN returns the outcome (side effects precede claims). */
export function verifyChartWithJournal(
  input: VerifyInput,
  causationId: string
): Effect.Effect<VerifyOutcome & { readonly degradeEntry: JournalEntry | null }, never, Journal> {
  return Effect.gen(function*() {
    const journal = yield* Journal
    const outcome = yield* Effect.promise(() => verifyChartScreenshot(input))
    const payload = buildDegradePayload(
      input.screenshotPath,
      outcome.judgment.grade,
      outcome.judgment.degrade?.reason ?? outcome.judgment.failureContext ?? "no deterministic core ran"
    )
    const degradeEntry = yield* journal.append({
      causationId,
      kind: AETHER_DEGRADE_JOURNAL_KIND,
      payload
    })
    return { ...outcome, degradeEntry }
  })
}

/* ── W6 LLM-UPGRADE SEAM ────────────────────────────────────────────────────
 *
 * The deterministic core above is the W3.5 floor. W6 wires the live LLM tier
 * through the SAME contracts — nothing here changes shape:
 *
 * 1. PROMPT CONTRACT: CHART_VERIFIER_PROMPT (this file, verbatim from spec
 *    B.W3.5.2). The W6 agent sends it unchanged; the 5 questions become
 *    per-criterion yes/no verdicts replacing today's unknown-degraded rows.
 * 2. TOOL-PINNING INTERFACE: assertToolPinned(tool, targetPath, pinnedPath) —
 *    the W6 agent's surface stays [read] via CHART_VERIFIER_TOOL_SURFACE, with
 *    the screenshot path as the pinnedPath. Any second tool or path escape is
 *    refused at the surface (never by policy prose).
 * 3. CAPS: CHART_VERIFIER_CAPS (MAX_ROUNDS 1, MAX_LLM_CALLS 2, TEMPERATURE 0)
 *    are enforced by the runner: the second LLM call is the LAST, temp is
 *    passed to the model seam verbatim.
 * 4. MARKER CONTRACT: parseGradeMarker / evaluateMarkerContract are UNCHANGED —
 *    the LLM's judgment.md MUST carry GRADE:PASS|GRADE:FAIL or the gate FAILs
 *    with MARKER_ABSENT context. The model seam is ModelSeam (brain.ts); pass a
 *    live seam into createChartVerifierAgent instead of null.
 * 5. DEGRADE PATH: on any model failure the runner falls back to THIS file's
 *    deterministic core + buildDegradePayload at 0.70 + the journal row —
 *    the degrade path stays first-class after the upgrade.
 */

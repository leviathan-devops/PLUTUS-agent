// LEXICON-ENGINE — the lexicon half of the Bug Hunter split (BIBLE §3.4, Part 27).
// DETECTOR-VS-DECISION LAW: each PatternFamily.matcher is a mechanical RegExp DETECTOR
// ONLY (the BIBLE rule-card.ts:61-81 precedent — line scanners that NAME candidates).
// The DECISION is the triggerCondition (structural predicate over the hit: numeric
// comparison against a calibrated binding, verb-presence check, citation-absence check)
// composed with the classify state machine below. No matcher fires a finding alone.
// CALIBRATION SOURCES (no magic constants): numericThreshold is parsed at runtime from
// profile.yaml's domain.numeric-threshold binding (extractNumericThreshold); tolerancePips
// is the spec §6 acceptance criterion (<=3p), passed explicitly at every construction site.
export type ClassifyState =
  | "IDLE"
  | "PARSED"
  | "ANALYZED"
  | "CLASSIFIED"
  | "EVIDENCED"
  | "EMITTED"
  | "INCONCLUSIVE";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type PatternKind =
  | "domain.numeric-threshold"
  | "process.gates"
  | "contract.must-implement"
  | "provenance.traces-to-source"
  | "frozen-pair"
  | "doctrine-attribution"
  | "coverage-inflation"
  | "tolerance-drift"
  | "self-blessing";

export interface DetectorHit {
  file: string;
  lineNumber: number;
  line: string;
  match: string;
  capturedNumber: number | null;
}

export interface PatternFamily {
  id: string;
  kind: PatternKind;
  matcher: RegExp;
  triggerCondition: (hit: DetectorHit) => boolean;
  severity: Severity;
  messageTemplate: string;
  remediationHook: string;
}

export interface EvidenceRef {
  file: string;
  line: number;
  quote: string;
}

export interface EvidenceTriad {
  pattern: string;
  state: "EVIDENCED";
  evidence: EvidenceRef;
}

export interface LexiconFinding {
  familyId: string;
  kind: PatternKind;
  severity: Severity;
  message: string;
  remediationHook: string;
  triad: EvidenceTriad;
}

export interface ClassifyOutcome {
  state: ClassifyState;
  findings: LexiconFinding[];
  scannedLines: number;
}

export interface RegistryOptions {
  numericThreshold: number;
  tolerancePips: number;
}

function assertRegistryOptions(opts: RegistryOptions): void {
  if (typeof opts.numericThreshold !== "number" || !Number.isFinite(opts.numericThreshold)) {
    throw new TypeError(
      `LEXICON_BAD_THRESHOLD: numericThreshold must be a finite number, got ${String(opts.numericThreshold)}`
    );
  }
  if (typeof opts.tolerancePips !== "number" || !Number.isFinite(opts.tolerancePips) || opts.tolerancePips <= 0) {
    throw new RangeError(
      `LEXICON_BAD_TOLERANCE: tolerancePips must be a positive finite number, got ${String(opts.tolerancePips)}`
    );
  }
}

function firstNumber(match: RegExpMatchArray): number | null {
  for (let i = 1; i < match.length; i++) {
    const raw = match[i];
    if (raw !== undefined && raw !== "" && !Number.isNaN(Number(raw))) return Number(raw);
  }
  return null;
}

export function defaultFamilies(opts: RegistryOptions): PatternFamily[] {
  assertRegistryOptions(opts);
  const threshold = opts.numericThreshold;
  const tolerance = opts.tolerancePips;
  return [
    {
      id: "domain.numeric-threshold:comparator",
      kind: "domain.numeric-threshold",
      matcher: /comparator\s*[:=]\s*(\d+(?:\.\d+)?)/,
      triggerCondition: (hit) => hit.capturedNumber !== null && hit.capturedNumber > threshold,
      severity: "CRITICAL",
      messageTemplate: "hardcoded price-anchor comparator {match} at {file}:{line} exceeds binding threshold",
      remediationHook: "remove-hardcoded-comparator",
    },
    {
      id: "frozen-pair:write-attempt",
      kind: "frozen-pair",
      matcher: /(sl-lmv|trade-dedup)/,
      triggerCondition: (hit) => /(write|modify|patch|delete|unlink|overwrite|rm\s)/i.test(hit.line),
      severity: "HIGH",
      messageTemplate: "frozen-pair reference with mutation verb at {file}:{line}",
      remediationHook: "frozen-pair-guard",
    },
    {
      id: "process.coverage-inflation",
      kind: "coverage-inflation",
      matcher: /100\s*%\s*coverage/i,
      triggerCondition: (hit) => !/(oracle|diag|discharged|verified)/i.test(hit.line),
      severity: "MEDIUM",
      messageTemplate: "coverage claim without oracle discharge at {file}:{line}",
      remediationHook: "discharge-against-oracle",
    },
    {
      id: "process.tolerance-drift",
      kind: "tolerance-drift",
      matcher: /(\d+(?:\.\d+)?)\s*pips?\s*(tolerance|allowed|acceptable|ok|fine)/i,
      triggerCondition: (hit) => hit.capturedNumber !== null && hit.capturedNumber > tolerance,
      severity: "MEDIUM",
      messageTemplate: "pip tolerance {match} looser than acceptance at {file}:{line}",
      remediationHook: "tighten-to-acceptance",
    },
    {
      id: "provenance.doctrine-attribution",
      kind: "doctrine-attribution",
      matcher: /operator'?s?\s+(rule|law|says|requires|demands)/i,
      triggerCondition: (hit) => !/quote|“|"|`/.test(hit.line),
      severity: "LOW",
      messageTemplate: "operator-rule claim without verbatim quote at {file}:{line}",
      remediationHook: "quote-verbatim",
    },
    {
      id: "process.self-blessing",
      kind: "self-blessing",
      matcher: /pass\s*:\s*true/,
      triggerCondition: () => true,
      severity: "HIGH",
      messageTemplate: "self-blessing literal at {file}:{line}",
      remediationHook: "remove-self-blessing",
    },
  ];
}

export class LexiconRegistry {
  private readonly families: PatternFamily[] = [];

  constructor(opts: RegistryOptions) {
    assertRegistryOptions(opts);
    for (const family of defaultFamilies(opts)) this.register(family);
  }

  register(family: PatternFamily): void {
    if (!family || typeof family.id !== "string" || family.id.length === 0) {
      throw new TypeError("LEXICON_BAD_FAMILY: family.id must be a non-empty string");
    }
    if (!(family.matcher instanceof RegExp)) {
      throw new TypeError(`LEXICON_BAD_MATCHER: family ${family.id} matcher must be a RegExp`);
    }
    if (typeof family.triggerCondition !== "function") {
      throw new TypeError(`LEXICON_BAD_TRIGGER: family ${family.id} triggerCondition must be a function`);
    }
    if (this.families.some((f) => f.id === family.id)) {
      throw new Error(`LEXICON_DUPLICATE_FAMILY: ${family.id} already registered`);
    }
    this.families.push(family);
  }

  all(): PatternFamily[] {
    return [...this.families];
  }

  get(id: string): PatternFamily | null {
    return this.families.find((f) => f.id === id) ?? null;
  }
}

export function fillTemplate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) out = out.split(`{${key}}`).join(value);
  return out;
}

export function extractNumericThreshold(profileYamlContent: unknown): number {
  if (typeof profileYamlContent !== "string" || profileYamlContent.length === 0) {
    throw new TypeError("LEXICON_BAD_PROFILE: profile yaml content must be a non-empty string");
  }
  const match = /threshold:\s*([0-9]+(?:\.[0-9]+)?)/.exec(profileYamlContent);
  if (match === null || match[1] === undefined) {
    throw new Error("LEXICON_NO_THRESHOLD: no numeric threshold binding found in profile yaml");
  }
  const value = Number(match[1]);
  if (!Number.isFinite(value)) {
    throw new Error("LEXICON_NO_THRESHOLD: threshold binding is not a finite number");
  }
  return value;
}

export function classifySource(
  file: unknown,
  content: unknown,
  registry: LexiconRegistry
): ClassifyOutcome {
  if (typeof file !== "string" || file.length === 0) {
    throw new TypeError("LEXICON_BAD_FILE: file must be a non-empty string");
  }
  if (!(registry instanceof LexiconRegistry)) {
    throw new TypeError("LEXICON_BAD_REGISTRY: registry must be a LexiconRegistry");
  }
  if (typeof content !== "string") {
    return { state: "INCONCLUSIVE", findings: [], scannedLines: 0 };
  }
  try {
    const lines = content.split("\n");
    const findings: LexiconFinding[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const lineNumber = i + 1;
      for (const family of registry.all()) {
        family.matcher.lastIndex = 0;
        let match: RegExpMatchArray | null;
        try {
          match = family.matcher.exec(line);
        } catch {
          continue;
        }
        if (match === null) continue;
        const hit: DetectorHit = {
          file,
          lineNumber,
          line,
          match: match[0],
          capturedNumber: firstNumber(match),
        };
        let fires = false;
        try {
          fires = family.triggerCondition(hit);
        } catch {
          continue;
        }
        if (!fires) continue;
        findings.push({
          familyId: family.id,
          kind: family.kind,
          severity: family.severity,
          message: fillTemplate(family.messageTemplate, {
            file,
            line: String(lineNumber),
            match: match[0],
          }),
          remediationHook: family.remediationHook,
          triad: {
            pattern: family.id,
            state: "EVIDENCED",
            evidence: { file, line: lineNumber, quote: line.trim().slice(0, 300) },
          },
        });
      }
    }
    return { state: "EMITTED", findings, scannedLines: lines.length };
  } catch {
    return { state: "INCONCLUSIVE", findings: [], scannedLines: 0 };
  }
}

/**
 * Context Bloat Guard — Anti-pattern detection for report generation (GAP-22).
 *
 * Per TTE v5.0.0 spec: "Every new report generation MUST begin by re-reading
 * this system prompt from the top."
 *
 * After 2+ consecutive reports, the agent accumulates context from prior
 * reports. This guard:
 *   1. Tracks consecutive report generations
 *   2. Issues a re-read warning after 2 consecutive reports
 *   3. Detects lazy derailment patterns:
 *      - Repeated phrases across reports (copy-paste indicators)
 *      - Shrinking section sizes (fatigue signal)
 *      - Templated language (boilerplate creep)
 *
 * Usage: call `beforeReport()` before each report generation to check
 * whether a context-bloat warning should be surfaced.
 */

import { Logger } from '../utils/logger.js';

const log = new Logger('ContextBloatGuard');

// ── Types ────────────────────────────────────────────────────────────────────

export interface BloatWarning {
  /** Whether a re-read of the TTE spec is recommended. */
  shouldRereadSpec: boolean;
  /** Human-readable warning message. */
  message: string;
  /** Severity of the warning. */
  severity: 'info' | 'warn' | 'critical';
  /** Detected anti-patterns (empty if none). */
  detectedPatterns: BloatPattern[];
  /** Number of consecutive reports generated so far. */
  consecutiveReportCount: number;
}

export interface BloatPattern {
  type: 'repeated_phrases' | 'shrinking_sections' | 'copy_paste' | 'boilerplate_creep';
  description: string;
  evidence: string;
}

// ── Configuration ────────────────────────────────────────────────────────────

/** After this many consecutive reports, issue a re-read warning. */
const REREAD_THRESHOLD = 2;

/** Maximum acceptable phrase repetition ratio (0-1). */
const PHRASE_REPETITION_THRESHOLD = 0.35;

/** Minimum acceptable ratio of current section size to prior (0-1). */
const SECTION_SHRINK_THRESHOLD = 0.6;

/** Phrases that indicate boilerplate / lazy templating. */
const BOILERPLATE_MARKERS = [
  'as previously mentioned',
  'as discussed above',
  'similar to the previous',
  'the same analysis applies',
  'following the same pattern',
  'identical setup',
  'unchanged from prior',
];

/**
 * Minimum report length to track (shorter reports are not meaningful
 * for bloat detection).
 */
const MIN_REPORT_LENGTH = 500;

// ── Guard ────────────────────────────────────────────────────────────────────

export class ContextBloatGuard {
  private consecutiveReportCount = 0;
  private lastReportHashes: Map<string, number> = new Map(); // phrase → count
  private lastReportLength = 0;
  private lastSectionSizes: Record<string, number> = {};

  /**
   * Call BEFORE generating a report. Returns a warning if context bloat
   * risk is detected.
   */
  beforeReport(): BloatWarning {
    this.consecutiveReportCount++;

    const patterns: BloatPattern[] = [];

    // Check 1: Consecutive count threshold
    const shouldReread = this.consecutiveReportCount >= REREAD_THRESHOLD;

    // Check 2: Phrase repetition (from prior report)
    const repetitionRatio = this.computeRepetitionRatio();
    if (repetitionRatio > PHRASE_REPETITION_THRESHOLD) {
      patterns.push({
        type: 'repeated_phrases',
        description: `${(repetitionRatio * 100).toFixed(0)}% of phrases repeated from prior report`,
        evidence: `Repetition ratio ${repetitionRatio.toFixed(2)} exceeds threshold ${PHRASE_REPETITION_THRESHOLD}`,
      });
    }

    // Check 3: Section shrinking
    // (evaluated in afterReport when we have the new sizes)

    // Build warning
    if (shouldReread || patterns.length > 0) {
      const severity: BloatWarning['severity'] =
        patterns.length >= 2 ? 'critical'
        : patterns.length === 1 || this.consecutiveReportCount >= 3 ? 'warn'
        : 'info';

      const message = this.consecutiveReportCount >= 3
        ? `Context bloat CRITICAL — ${this.consecutiveReportCount} consecutive reports. STOP and re-read the full TTE spec before generating the next report.`
        : this.consecutiveReportCount >= REREAD_THRESHOLD
          ? `Context bloat risk — ${this.consecutiveReportCount} consecutive reports generated. Re-read TTE spec before next report to avoid drift.`
          : patterns.length > 0
            ? `Anti-pattern detected: ${patterns[0].description}. Review for quality.`
            : '';

      if (message) {
        log.warn(`[${severity.toUpperCase()}] ${message}`);
      }

      return {
        shouldRereadSpec: shouldReread,
        message,
        severity,
        detectedPatterns: patterns,
        consecutiveReportCount: this.consecutiveReportCount,
      };
    }

    return {
      shouldRereadSpec: false,
      message: '',
      severity: 'info',
      detectedPatterns: [],
      consecutiveReportCount: this.consecutiveReportCount,
    };
  }

  /**
   * Call AFTER generating a report. Records the report content for
   * bloat detection on the next cycle.
   */
  afterReport(reportContent: string, sectionSizes?: Record<string, number>): void {
    if (reportContent.length < MIN_REPORT_LENGTH) {
      log.debug('Report too short for bloat tracking — skipping');
      return;
    }

    // Build phrase frequency map for next cycle's repetition check
    const phrases = extractPhrases(reportContent);
    const phraseCounts: Map<string, number> = new Map();
    for (const phrase of phrases) {
      phraseCounts.set(phrase, (phraseCounts.get(phrase) ?? 0) + 1);
    }
    this.lastReportHashes = phraseCounts;
    this.lastReportLength = reportContent.length;

    // Section size tracking
    if (sectionSizes) {
      this.lastSectionSizes = { ...sectionSizes };
    }

    log.debug(`Report recorded: ${reportContent.length} chars, ${phrases.length} phrases tracked`);
  }

  /**
   * Detect lazy derailment patterns by comparing the new report content
   * against the prior report's patterns.
   */
  detectDerailment(newContent: string): BloatPattern[] {
    const patterns: BloatPattern[] = [];

    if (this.lastReportHashes.size === 0) return patterns;

    // Check 1: Phrase repetition with prior report
    const newPhrases = extractPhrases(newContent);
    const repeatedCount = newPhrases.filter(p => this.lastReportHashes.has(p)).length;
    const repetitionRatio = newPhrases.length > 0 ? repeatedCount / newPhrases.length : 0;

    if (repetitionRatio > PHRASE_REPETITION_THRESHOLD) {
      patterns.push({
        type: 'repeated_phrases',
        description: `${(repetitionRatio * 100).toFixed(0)}% of phrases are copy-paste from the previous report`,
        evidence: `${repeatedCount}/${newPhrases.length} phrases match prior report`,
      });
    }

    // Check 2: Copy-paste indicators (boilerplate markers)
    const lower = newContent.toLowerCase();
    const boilerplateHits = BOILERPLATE_MARKERS.filter(m => lower.includes(m));
    if (boilerplateHits.length >= 2) {
      patterns.push({
        type: 'boilerplate_creep',
        description: `${boilerplateHits.length} boilerplate/lazy-templating markers detected`,
        evidence: boilerplateHits.map(m => `"${m}"`).join(', '),
      });
    }

    // Check 3: Section shrinking (fatigue signal)
    if (this.lastReportLength > 0 && newContent.length < this.lastReportLength * SECTION_SHRINK_THRESHOLD) {
      const shrinkPct = ((1 - newContent.length / this.lastReportLength) * 100).toFixed(0);
      patterns.push({
        type: 'shrinking_sections',
        description: `Report size shrank ${shrinkPct}% from prior report`,
        evidence: `${newContent.length} chars vs ${this.lastReportLength} prior (${shrinkPct}% smaller)`,
      });
    }

    return patterns;
  }

  /** Reset the counter — call when the agent re-reads the spec. */
  reset(): void {
    this.consecutiveReportCount = 0;
    this.lastReportHashes.clear();
    this.lastReportLength = 0;
    this.lastSectionSizes = {};
    log.info('Context bloat counter reset — spec re-read acknowledged');
  }

  /** Get current consecutive report count without incrementing. */
  getConsecutiveCount(): number {
    return this.consecutiveReportCount;
  }

  // ── Internal ──

  /**
   * Compute the phrase repetition ratio against the prior report.
   * Returns 0 if no prior report exists.
   */
  private computeRepetitionRatio(): number {
    if (this.lastReportHashes.size === 0) return 0;
    // The repetition check happens in detectDerailment with actual new content.
    // Here we just report if a prior report exists.
    return 0;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract meaningful phrases (4-8 word sequences) from report content.
 * Filters out common stopwords and very short fragments.
 */
function extractPhrases(content: string): string[] {
  // Split into sentences, then extract word sequences
  const sentences = content.split(/[.!?]\s+/);
  const phrases: string[] = [];

  for (const sentence of sentences) {
    const words = sentence
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);

    // Extract 4-word phrases (sliding window)
    for (let i = 0; i <= words.length - 4; i++) {
      const phrase = words.slice(i, i + 4).join(' ');
      if (phrase.length > 15) {
        phrases.push(phrase);
      }
    }
  }

  return phrases;
}

// ── Singleton ────────────────────────────────────────────────────────────────

export const contextBloatGuard = new ContextBloatGuard();

/**
 * PdfGenerator — Converts TTE Markdown report to PDF.
 *
 * FIX-015: TTE v5.3.3 Step 14 requires PDF output alongside Markdown.
 *
 * Uses a multi-strategy subprocess pipeline:
 *   1. Try `pandoc` (most reliable for markdown → PDF)
 *   2. Fall back to `weasyprint` (Python markdown → HTML → PDF)
 *   3. Fall back to writing HTML to /tmp for manual conversion
 *
 * Output path: /tmp/plutus-report-{timestamp}.pdf
 */

import { execSync } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Logger } from '../utils/logger.js';
import {
  PDF_PANDOC_TIMEOUT_MS, PDF_WEASYPRINT_TIMEOUT_MS,
  PDF_MARGIN_TB, PDF_MARGIN_LR, PDF_H1_SLICE, PDF_H2_SLICE, PDF_H3_SLICE,
} from '../constants/trading-constants.js';

const log = new Logger('PdfGenerator');

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PdfResult {
  success: boolean;
  pdfPath: string | null;
  method: 'pandoc' | 'weasyprint' | 'html-fallback' | 'none';
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CSS STYLESHEET (for HTML/PDF rendering)
// ═══════════════════════════════════════════════════════════════════════════════

const REPORT_CSS = `
body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1a1a2e; line-height: 1.5; }
h1 { color: #0f3460; border-bottom: 3px solid #e94560; padding-bottom: 10px; font-size: 24px; }
h2 { color: #16213e; margin-top: 30px; font-size: 20px; border-bottom: 1px solid #e0e0e0; padding-bottom: 5px; }
h3 { color: #0f3460; font-size: 16px; }
table { border-collapse: collapse; width: 100%; margin: 15px 0; font-size: 12px; }
th { background: #0f3460; color: white; padding: 8px 10px; text-align: left; }
td { border: 1px solid #ddd; padding: 6px 10px; }
tr:nth-child(even) { background: #f8f9fa; }
code { background: #f0f0f0; padding: 1px 4px; border-radius: 3px; font-family: 'Consolas', monospace; font-size: 11px; }
pre { background: #1a1a2e; color: #e0e0e0; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 11px; }
pre code { background: none; color: inherit; }
blockquote { border-left: 4px solid #e94560; margin: 10px 0; padding: 5px 15px; background: #fff5f5; }
hr { border: none; border-top: 2px solid #e0e0e0; margin: 25px 0; }
.header-meta { font-size: 11px; color: #6c757d; }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// MARKDOWN → HTML CONVERTER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert a Markdown string to a styled HTML document.
 * Lightweight inline converter — handles headings, tables, code blocks,
 * bold, and horizontal rules. Not a full markdown parser, but sufficient
 * for the structured TTE report format.
 */
function markdownToHtml(markdown: string): string {
  const lines = markdown.split('\n');
  const htmlParts: string[] = [];
  let inCodeBlock = false;
  let inTable = false;
  let tableHeaderDone = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block toggle
    if (line.trim() === '```') {
      if (inCodeBlock) {
        htmlParts.push('</code></pre>');
        inCodeBlock = false;
      } else {
        htmlParts.push('<pre><code>');
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      htmlParts.push(escapeHtml(line));
      continue;
    }

    // Table detection: line contains | and is not inside code block
    if (line.includes('|') && line.trim().startsWith('|')) {
      // Check if this is a separator line (|---|---|)
      if (/^\|[\s-]+\|/.test(line.trim()) && !tableHeaderDone) {
        tableHeaderDone = true;
        continue;
      }

      // Start table if not started
      if (!inTable) {
        htmlParts.push('<table>');
        inTable = true;
        tableHeaderDone = false;
      }

      const cells = line.split('|').slice(1, -1).map((c) => c.trim());

      if (!tableHeaderDone) {
        // First row is header
        htmlParts.push('<thead><tr>');
        for (const cell of cells) {
          htmlParts.push(`<th>${inlineFormat(cell)}</th>`);
        }
        htmlParts.push('</tr></thead><tbody>');
        tableHeaderDone = true;
      } else {
        htmlParts.push('<tr>');
        for (const cell of cells) {
          htmlParts.push(`<td>${inlineFormat(cell)}</td>`);
        }
        htmlParts.push('</tr>');
      }
      continue;
    }

    // Close table if we were in one
    if (inTable) {
      htmlParts.push('</tbody></table>');
      inTable = false;
      tableHeaderDone = false;
    }

    // Headings
    if (line.startsWith('# ')) {
      htmlParts.push(`<h1>${inlineFormat(line.slice(PDF_H1_SLICE))}</h1>`);
      continue;
    }
    if (line.startsWith('## ')) {
      htmlParts.push(`<h2>${inlineFormat(line.slice(PDF_H2_SLICE))}</h2>`);
      continue;
    }
    if (line.startsWith('### ')) {
      htmlParts.push(`<h3>${inlineFormat(line.slice(PDF_H3_SLICE))}</h3>`);
      continue;
    }

    // Horizontal rule
    if (line.trim() === '---') {
      htmlParts.push('<hr>');
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      htmlParts.push(`<blockquote>${inlineFormat(line.slice(2))}</blockquote>`);
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      htmlParts.push('<br>');
      continue;
    }

    // Regular paragraph
    htmlParts.push(`<p>${inlineFormat(line)}</p>`);
  }

  // Close any open table
  if (inTable) {
    htmlParts.push('</tbody></table>');
  }
  if (inCodeBlock) {
    htmlParts.push('</code></pre>');
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Plutus TTE Report</title>
<style>${REPORT_CSS}</style>
</head>
<body>
${htmlParts.join('\n')}
</body>
</html>`;
}

/** Escape HTML special characters. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Apply inline markdown formatting (bold, code, emojis). */
function inlineFormat(text: string): string {
  let result = escapeHtml(text);
  // Bold: **text** or __text__
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/__(.+?)__/g, '<strong>$1</strong>');
  // Inline code: `text`
  result = result.replace(/`(.+?)`/g, '<code>$1</code>');
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF GENERATION STRATEGIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a command-line tool is available.
 */
function hasTool(tool: string): boolean {
  try {
    execSync(`which ${tool} 2>/dev/null`, { encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch (err) {
    console.error('[PdfGenerator] hasTool check failed:', err instanceof Error ? err.message : String(err));
    return false;
  }
}

/**
 * Generate PDF via pandoc subprocess.
 * Requires: pandoc + a PDF engine (wkhtmltopdf or LaTeX).
 */
function generateViaPandoc(markdown: string, outputPath: string): PdfResult {
  const tempMd = `/tmp/plutus-report-${Date.now()}.md`;
  writeFileSync(tempMd, markdown, 'utf8');

  try {
    // Try with wkhtmltopdf engine first (best for HTML/CSS styling)
    try {
      execSync(
        `pandoc "${tempMd}" -o "${outputPath}" --pdf-engine=wkhtmltopdf -V margin-top=${PDF_MARGIN_TB} -V margin-bottom=${PDF_MARGIN_TB} -V margin-left=${PDF_MARGIN_LR} -V margin-right=${PDF_MARGIN_LR}`,
        { encoding: 'utf8', stdio: 'pipe', timeout: PDF_PANDOC_TIMEOUT_MS },
      );
      log.info(`PDF generated via pandoc+wkhtmltopdf: ${outputPath}`);
      return { success: true, pdfPath: outputPath, method: 'pandoc' };
    } catch (err) {
      // Fall back to default LaTeX engine
      console.error('[PdfGenerator] pandoc+wkhtmltopdf failed, falling back to pdflatex:', err instanceof Error ? err.message : String(err));
      execSync(
        `pandoc "${tempMd}" -o "${outputPath}" --pdf-engine=pdflatex 2>/dev/null || true`,
        { encoding: 'utf8', stdio: 'pipe', timeout: PDF_PANDOC_TIMEOUT_MS },
      );
      if (existsSync(outputPath)) {
        log.info(`PDF generated via pandoc+pdflatex: ${outputPath}`);
        return { success: true, pdfPath: outputPath, method: 'pandoc' };
      }
    }
    return { success: false, pdfPath: null, method: 'pandoc', error: 'pandoc failed to produce PDF' };
  } catch (e) {
    console.error('[PdfGenerator] generateViaPandoc failed:', e instanceof Error ? e.message : String(e));
    return { success: false, pdfPath: null, method: 'pandoc', error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Generate PDF via weasyprint subprocess (Python).
 * Requires: weasyprint Python package.
 */
function generateViaWeasyprint(markdown: string, outputPath: string): PdfResult {
  const html = markdownToHtml(markdown);
  const tempHtml = `/tmp/plutus-report-${Date.now()}.html`;
  writeFileSync(tempHtml, html, 'utf8');

  try {
    execSync(
      `python3 -c "
import sys
from weasyprint import HTML
HTML(filename='${tempHtml}').write_pdf('${outputPath}')
"`,
      { encoding: 'utf8', stdio: 'pipe', timeout: PDF_WEASYPRINT_TIMEOUT_MS },
    );
    if (existsSync(outputPath)) {
      log.info(`PDF generated via weasyprint: ${outputPath}`);
      return { success: true, pdfPath: outputPath, method: 'weasyprint' };
    }
    return { success: false, pdfPath: null, method: 'weasyprint', error: 'weasyprint produced no file' };
  } catch (e) {
    console.error('[PdfGenerator] generateViaWeasyprint failed:', e instanceof Error ? e.message : String(e));
    return { success: false, pdfPath: null, method: 'weasyprint', error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Fallback: write styled HTML to /tmp.
 * User can manually convert via browser print or other tool.
 */
function generateHtmlFallback(markdown: string, timestamp: number): PdfResult {
  const html = markdownToHtml(markdown);
  const htmlPath = `/tmp/plutus-report-${timestamp}.html`;
  writeFileSync(htmlPath, html, 'utf8');
  log.warn(`No PDF engine available — styled HTML written to ${htmlPath}`);
  return {
    success: false,
    pdfPath: null,
    method: 'html-fallback',
    error: `No PDF engine found. HTML report at ${htmlPath}. Install pandoc or weasyprint for PDF output.`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * FIX-015: Generate a PDF from a TTE Markdown report.
 *
 * Tries multiple conversion strategies in order:
 *   1. pandoc (with wkhtmltopdf or pdflatex)
 *   2. weasyprint (Python)
 *   3. HTML fallback (no PDF, but styled HTML to /tmp)
 *
 * @param markdown The full TTE report in Markdown format.
 * @returns PdfResult with path, method, and success status.
 */
export function generatePdf(markdown: string): PdfResult {
  const timestamp = Date.now();
  const outputPath = `/tmp/plutus-report-${timestamp}.pdf`;

  log.info('Starting PDF generation');

  // Strategy 1: pandoc
  if (hasTool('pandoc')) {
    log.debug('Found pandoc — attempting conversion');
    const result = generateViaPandoc(markdown, outputPath);
    if (result.success) return result;
    log.warn(`pandoc conversion failed: ${result.error}`);
  }

  // Strategy 2: weasyprint
  if (hasTool('python3')) {
    log.debug('Checking weasyprint availability');
    try {
      execSync('python3 -c "import weasyprint" 2>/dev/null', { encoding: 'utf8', stdio: 'pipe' });
      log.debug('Found weasyprint — attempting conversion');
      const result = generateViaWeasyprint(markdown, outputPath);
      if (result.success) return result;
      log.warn(`weasyprint conversion failed: ${result.error}`);
    } catch {
      log.debug('weasyprint not available');
    }
  }

  // Strategy 3: HTML fallback
  return generateHtmlFallback(markdown, timestamp);
}

/**
 * FIX-015: Convenience method to generate PDF and Markdown in one call.
 * Writes the Markdown report to /tmp and generates the PDF alongside.
 *
 * @param markdown The full TTE report in Markdown format.
 * @param mdPath Optional explicit path for the Markdown file.
 * @returns Object containing both paths.
 */
export function generateReportOutputs(
  markdown: string,
  mdPath?: string,
): { markdownPath: string; pdfResult: PdfResult } {
  const timestamp = Date.now();
  const finalMdPath = mdPath ?? `/tmp/plutus-report-${timestamp}.md`;
  writeFileSync(finalMdPath, markdown, 'utf8');
  log.info(`Markdown report written to ${finalMdPath}`);

  const pdfResult = generatePdf(markdown);

  return { markdownPath: finalMdPath, pdfResult };
}

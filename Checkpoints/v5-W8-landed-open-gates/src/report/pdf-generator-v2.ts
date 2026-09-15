/**
 * PDF Generator v2 — Chrome CDP Page.printToPDF
 *
 * Converts markdown report to styled HTML matching Leviathan Report Template v2.0
 * design rules (52 ironclad formatting rules), then uses Chrome's print engine
 * via CDP to produce professional corporate PDFs.
 *
 * Design: Navy headers (#0f172a), alternating rows (#f1f5f9), Helvetica,
 * US Letter, 0.5" margins, center-aligned cells.
 */

import { Logger } from '../utils/logger.js';
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const log = new Logger('PdfGeneratorV2');
const CDP_BASE = 'http://localhost:9228';

/** Convert markdown report to styled HTML with Leviathan corporate design. */
function markdownToHtml(markdown: string, weekStart: string): string {
  const lines = markdown.split('\n');
  let html = '';
  let tableRows: string[][] = [];
  let inTable = false;

  const flushTable = () => {
    if (tableRows.length === 0) return;
    const header = tableRows[0];
    const body = tableRows.slice(1).filter(r => !r.every(c => c.match(/^\s*[-:]+\s*$/)));
    html += '<table class="corp">\n<thead><tr>';
    header.forEach(c => html += `<th>${c.replace(/\*\*/g, '').trim()}</th>`);
    html += '</tr></thead>\n<tbody>\n';
    body.forEach((row, i) => {
      html += `<tr${i % 2 === 1 ? ' class="alt"' : ''}>`;
      row.forEach(c => {
        const text = c.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').trim();
        html += `<td>${text}</td>`;
      });
      html += '</tr>\n';
    });
    html += '</tbody></table>\n';
    tableRows = [];
  };

  for (const line of lines) {
    if (line.startsWith('|') && line.endsWith('|')) {
      if (line.match(/^\|[\s\-:]+\|/)) continue;
      tableRows.push(line.split('|').slice(1, -1));
      inTable = true;
      continue;
    }
    if (inTable) { flushTable(); inTable = false; }

    if (line.startsWith('# ')) {
      html += `<h1 class="cover">${line.substring(2)}</h1>\n`;
    } else if (line.startsWith('## ')) {
      const text = line.substring(3).replace(/\*\*/g, '');
      if (text.toUpperCase().includes('PAGE')) html += '<div class="pb"></div>\n';
      html += `<h2>${text}</h2>\n`;
    } else if (line.startsWith('### ')) {
      html += `<h3>${line.substring(4).replace(/\*\*/g, '')}</h3>\n`;
    } else if (line.startsWith('_') && line.endsWith('_')) {
      html += `<p class="cap">${line.replace(/_/g, '')}</p>\n`;
    } else if (line.trim() === '') {
      // skip
    } else {
      const text = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      html += `<p>${text}</p>\n`;
    }
  }
  if (inTable) flushTable();

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>TTE Report ${weekStart}</title>
<style>
@page{size:letter;margin:0.5in}
body{font-family:Helvetica,Arial,sans-serif;font-size:9pt;color:#1e293b;margin:0;line-height:1.4}
.cover{font-size:28pt;font-weight:bold;color:#0f172a;text-align:center;margin-bottom:12pt}
h2{font-size:15pt;font-weight:bold;color:#0f172a;margin-top:6pt;margin-bottom:4pt;page-break-after:avoid}
h3{font-size:11pt;font-weight:bold;color:#1e293b;margin-top:6pt;margin-bottom:3pt;page-break-after:avoid}
p{font-size:9pt;margin:1pt 0}
.cap{font-size:8pt;font-style:italic;color:#64748b;margin:2pt 0 4pt}
table.corp{width:100%;border-collapse:collapse;font-size:8.5pt;margin:4pt 0 8pt;page-break-inside:avoid}
table.corp th{background:#0f172a;color:#fff;text-align:center;padding:3pt 4pt;border:0.4pt solid #0f172a;font-weight:bold;vertical-align:middle}
table.corp td{text-align:center;padding:3pt 4pt;border:0.4pt solid #cbd5e1;vertical-align:middle}
table.corp tr.alt td{background:#f1f5f9}
.pb{page-break-before:always}
strong{color:#0f172a}
h2+table.corp,h3+table.corp{page-break-inside:avoid}
</style></head><body>${html}</body></html>`;
}

/**
 * Generate PDF from markdown via Chrome CDP Page.printToPDF.
 *
 * Retries up to 3 times on failure (2-second wait between attempts).
 * Falls back to saving the HTML file directly if all CDP attempts fail.
 */
export async function generatePdfViaCDP(markdownPath: string, outputDir: string, weekStart: string): Promise<string | null> {
  const markdown = readFileSync(markdownPath, 'utf8');
  const html = markdownToHtml(markdown, weekStart);

  // Write HTML to outputDir so it persists (also serves as fallback artifact).
  const htmlPath = join(outputDir, `TTE_Report_${weekStart}.html`);
  writeFileSync(htmlPath, html);
  log.info(`HTML: ${htmlPath} (${html.length} chars)`);

  // ── CDP printToPDF with retries ──────────────────────────────────────────
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const pdfData = await printToPdfViaCDP(`file://${htmlPath}`);
      if (pdfData) {
        const pdfPath = join(outputDir, `TTE_Report_${weekStart}.pdf`);
        writeFileSync(pdfPath, Buffer.from(pdfData, 'base64'));
        log.info(`PDF: ${pdfPath} (${(pdfData.length * 0.75 / 1024).toFixed(0)}KB) on attempt ${attempt}/3`);
        return pdfPath;
      }
      log.warn(`printToPdfViaCDP attempt ${attempt}/3 returned null`);
    } catch (err) {
      log.warn(`printToPdfViaCDP attempt ${attempt}/3 failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (attempt < 3) {
      log.info('Waiting 2s before retry...');
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // ── Fallback: HTML file is already saved and still useful ─────────────────
  log.info(`PDF generation failed after 3 attempts — HTML fallback saved to ${htmlPath}`);
  return htmlPath;
}

/**
 * Check if the browser tab is responsive by evaluating a simple expression
 * via CDP Runtime.evaluate before calling the heavier Page.printToPDF.
 */
async function checkBrowserResponsive(wsUrl: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let resolved = false;
    const done = (r: boolean) => { if (resolved) return; resolved = true; try { ws.close(); } catch (wsErr) { log.warn(`CDP WebSocket close failed during browser check: ${(wsErr as Error).message}`); } resolve(r); };
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 100,
        method: 'Runtime.evaluate',
        params: { expression: '1+1', returnByValue: true },
      }));
    };
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data as string) as Record<string, unknown>;
      if (msg.id === 100) {
        const result = msg.result as Record<string, unknown> | undefined;
        const innerResult = result?.result as Record<string, unknown> | undefined;
        done(innerResult?.value === 2);
      }
    };
    ws.onerror = () => done(false);
    setTimeout(() => done(false), 10_000);
  });
}

/**
 * Chrome CDP Page.printToPDF — renders URL as professional PDF.
 *
 * Includes a pre-flight responsiveness check (Runtime.evaluate) to ensure
 * the browser tab is ready before sending the printToPDF command.
 */
async function printToPdfViaCDP(url: string): Promise<string | null> {
  let tabId: string | null = null;
  try {
    const tabResp = await fetch(`${CDP_BASE}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
    if (!tabResp.ok) { log.warn(`CDP tab failed: ${tabResp.status}`); return null; }
    const tab = await tabResp.json() as { id: string; webSocketDebuggerUrl: string };
    tabId = tab.id;

    await new Promise(r => setTimeout(r, 3000));

    // Pre-flight: verify the browser tab is responsive before printToPDF
    const responsive = await checkBrowserResponsive(tab.webSocketDebuggerUrl);
    if (!responsive) {
      log.warn('Browser tab not responsive (Runtime.evaluate failed) — aborting printToPDF');
      if (tabId) await fetch(`${CDP_BASE}/json/close/${tabId}`).catch(() => {});
      return null;
    }
    log.debug('Browser tab responsive — proceeding to printToPDF');

    const pdfData = await new Promise<string | null>((resolve) => {
      const ws = new WebSocket(tab.webSocketDebuggerUrl);
      let resolved = false;
      const done = (r: string | null) => { if (resolved) return; resolved = true; try { ws.close(); } catch (wsErr) { log.warn(`CDP WebSocket close failed during page navigation: ${(wsErr as Error).message}`); } resolve(r); };

      ws.onopen = () => {
        ws.send(JSON.stringify({ id: 1, method: 'Page.enable' }));
        setTimeout(() => {
          ws.send(JSON.stringify({
            id: 2, method: 'Page.printToPDF',
            params: {
              paperWidth: 8.5, paperHeight: 11,
              marginTop: 0.5, marginBottom: 0.5, marginLeft: 0.5, marginRight: 0.5,
              printBackground: true, preferCSSPageSize: true,
            },
          }));
        }, 2000);
      };
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data as string) as Record<string, unknown>;
        if (msg.id === 2) {
          const result = msg.result as Record<string, unknown> | undefined;
          if (result && typeof result.data === 'string') done(result.data);
        }
      };
      ws.onerror = () => done(null);
      setTimeout(() => done(null), 30_000);
    });

    if (tabId) await fetch(`${CDP_BASE}/json/close/${tabId}`).catch(() => {});
    return pdfData;
  } catch (err) {
    log.warn(`printToPdfViaCDP: ${err instanceof Error ? err.message : String(err)}`);
    if (tabId) await fetch(`${CDP_BASE}/json/close/${tabId}`).catch(() => {});
    return null;
  }
}

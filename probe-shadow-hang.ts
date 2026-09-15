// PROBE: the shadow-agent callModel HANG investigation.
// Uses the EXACT body the agent sends (deepseek-v4-flash, effort max, max_tokens 128000)
// with an AbortController at 90s. Measures: does the server respond? does abort fire?
import { readFileSync } from 'node:fs';

const bashrc = readFileSync(process.env.HOME + '/.bashrc', 'utf8');
const m = bashrc.match(/OPENCODE_API_KEY=("?)([^"\n]+)\1/);
if (!m) {
  console.log('NO KEY');
  process.exit(1);
}
const apiKey = m[2];
const endpoint = 'https://opencode.ai/zen/go/v1/chat/completions';

const body = {
  model: 'deepseek-v4-flash',
  temperature: 0.2,
  max_tokens: 128000,
  reasoning_options: { effort: 'max' },
  messages: [
    { role: 'system', content: 'You are the shadow-enhanced reasoning brain of the Plutus trading pipeline. Output ONLY the requested JSON object. No prose. No preamble. No markdown fences.' },
    { role: 'user', content: 'Token ledger: [zone-identification] PHANTOM_BOM EXEMPT on EUR/USD|1H|1782990000000|1.14004. Return the projection JSON: {pair, direction, E, SL, TP, RRR, chosenTarget, reasonTrace}.' },
  ],
};

const controller = new AbortController();
const timer = setTimeout(() => {
  console.log(`[abort firing at 90s] state=${controller.signal.aborted}`);
  controller.abort();
}, 90_000);

const t0 = Date.now();
try {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
    signal: controller.signal,
  });
  console.log(`[headers received] HTTP ${res.status} after ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  const json = await res.json().catch(() => null);
  console.log(`[body received] after ${((Date.now() - t0) / 1000).toFixed(1)}s | choices=${json?.choices?.length ?? 0} keys=${json ? Object.keys(json).join(',') : 'null'}`);
  const msg = json?.choices?.[0]?.message;
  if (msg) {
    const c = msg.content;
    console.log(`content typeof=${typeof c} len=${typeof c === 'string' ? c.length : Array.isArray(c) ? c.length : 'n/a'} reasoning=${typeof msg.reasoning_content === 'string' ? msg.reasoning_content.length : 'n/a'} finish=${json?.choices?.[0]?.finish_reason ?? 'n/a'}`);
    console.log(`usage=${JSON.stringify(json?.usage ?? {})}`);
  }
} catch (e) {
  console.log(`[caught] after ${((Date.now() - t0) / 1000).toFixed(1)}s: ${e instanceof Error ? e.name + ': ' + e.message.slice(0, 200) : String(e)}`);
} finally {
  clearTimeout(timer);
}
console.log(`[done] total ${((Date.now() - t0) / 1000).toFixed(1)}s`);

// PROBE: the REAL latency curve of the shadow's actual prompt scale.
// The diag sends the FULL token ledger + candle groups + targets + macro.
// Measure: (a) a realistic-size prompt (2-3K tokens) at effort max — does it
// exceed 600s? (b) the same prompt at effort medium — the latency delta.
import { readFileSync } from 'node:fs';

const bashrc = readFileSync(process.env.HOME + '/.bashrc', 'utf8');
const m = bashrc.match(/OPENCODE_API_KEY=("?)([^"\n]+)\1/);
if (!m) {
  console.log('NO KEY');
  process.exit(1);
}
const apiKey = m[2];
const endpoint = 'https://opencode.ai/zen/go/v1/chat/completions';

// A realistic shadow prompt: the token ledger (11 tokens) + zones + targets.
const ledger = [
  '[zone-identification] PHANTOM_BOM EXEMPT on EUR/USD|1H|1782990000000|1.14004 (conf 0.69)',
  '[pressure-status] BUY VIRGIN score 0.54 mitigations 0 (conf 0.54)',
  '[liquidity] nested 3 below 30 above 142 nearest LMV-1.14030 (conf 0.8)',
  '[break-validation] UNBROKEN wick-reclaim (conf 0.8)',
  '[strength-comparison] SELL delta 0.01 impulse 0.98 (conf 0.3)',
  '[reaction-count] mitigations 0 (conf 0.75)',
  '[chain-progress] SS day 1/5 (conf 0.4)',
  '[forward-position] NOT_FORWARD @ 1.14045 target 1.14150 (conf 0.4)',
  '[chaining] chained E = prior TP 1.14102 (conf 0.5)',
  '[anchors] E 1.14102 SL 1.13917 TP 1.14403 RRR 1.62 (conf 0.4)',
  '[validation] REFINED(1): RRR_BELOW_GATE (conf 0.4)',
].join('\n');

const userPrompt = [
  'THE TOKEN LEDGER (the deterministic tokens 1-7, FIXED):',
  ledger,
  '',
  'THE OPERATIVE ZONE: EUR/USD|1H|1782990000000|1.14004 (DEMAND, floor 1.14000, ceiling 1.14145, PHANTOM_BOM)',
  'THE DAY OPEN SPOT: 1.14205',
  'THE CONTINUATION TARGETS (CLOSED SET — choose ONE): 1.14150, 1.14205, 1.14395, 1.14460',
  'THE MACRO: EUR/USD LONG (the DXY SHORT inverted — the mirror law)',
  'THE WIDTH RATIO: 1.62 (zone width / ATR1h)',
  'THE CANDLE GROUPS: touches [1.14110x3, 1.14020x2] pre-touch [1.14390, 1.14305, 1.14295] post-reaction [1.14150, 1.14210]',
  '',
  'REFINE THE FORWARD-POSITION TOKEN. Return ONLY JSON: {"forwardPosition":number,"chosenTarget":number,"positionVerdict":"FORWARD"|"NOT_FORWARD","reasonTrace":[string]}',
].join('\n');

async function call(effort: string, label: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 200_000);
  const t0 = Date.now();
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        temperature: 0.2,
        max_tokens: 128000,
        reasoning_options: { effort },
        messages: [
          { role: 'system', content: 'You are the shadow-enhanced reasoning brain of the Plutus trading pipeline. Output ONLY the requested JSON object. No prose. No preamble. No markdown fences.' },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });
    const dt = (Date.now() - t0) / 1000;
    if (!res.ok) {
      console.log(`[${label}] HTTP ${res.status} after ${dt.toFixed(1)}s`);
      return;
    }
    const json = (await res.json().catch(() => null)) as any;
    console.log(`[${label}] 200 after ${dt.toFixed(1)}s | finish=${json?.choices?.[0]?.finish_reason ?? 'n/a'} | completion_tokens=${json?.usage?.completion_tokens ?? 'n/a'} | reasoning_tokens=${json?.usage?.completion_tokens_details?.reasoning_tokens ?? 'n/a'} | content_len=${typeof json?.choices?.[0]?.message?.content === 'string' ? json.choices[0].message.content.length : 'n/a'}`);
  } catch (e) {
    console.log(`[${label}] ABORT/ERROR after ${((Date.now() - t0) / 1000).toFixed(1)}s: ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`);
  } finally {
    clearTimeout(timer);
  }
}

console.log('=== effort=max (the current setting) ===');
await call('max', 'effort-max');
console.log('=== effort=medium (the comparison) ===');
await call('medium', 'effort-medium');

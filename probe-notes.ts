import { runChainV452 } from './report-v452.js';
const r = await runChainV452();
for (const s of r.dxySource) {
  if (s.setupId.includes('100_935') || s.setupId.includes('100_949') || s.setupId.includes('100_779')) {
    console.log(`--- ${s.setupId}`);
    console.log(`  E=${s.entry.toFixed(5)} SL=${s.sl.toFixed(5)} TP=${s.tp.toFixed(5)} RRR=${s.rrr.toFixed(2)}`);
    console.log(`  notes: ${s.notes}`);
  }
}

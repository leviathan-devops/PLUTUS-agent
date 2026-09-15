import { runChainV452 } from './report-v452.js';
const c = await runChainV452();
for (const s of c.dxySource) {
  if (s.setupId.includes('LQZ_M_100_949')) {
    console.log(`\n[${s.setupId}]`);
    console.log(`  E=${s.entry.toFixed(5)} SL=${s.sl.toFixed(5)} TP=${s.tp.toFixed(5)} rrr=${s.rrr.toFixed(2)}`);
    console.log(`  NOTES: ${s.notes}`);
  }
}

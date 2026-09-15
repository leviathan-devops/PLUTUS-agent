import { runChainV452 } from './report-v452.js';
const c = await runChainV452();
console.log(`=== dxySource (${c.dxySource.length}) ===`);
for (const s of c.dxySource) console.log(`${s.setupId} ${s.direction} E=${s.entry} SL=${s.sl} TP=${s.tp} rrr=${s.rrr} day=${s.day} sess=${s.session} notes=${s.notes.slice(0,80)}`);

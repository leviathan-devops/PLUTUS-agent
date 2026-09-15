import { runChainV452 } from './report-v452.js';
const r = await runChainV452();
console.log('=== DXY SOURCE SETUPS (report pipeline, IP zones) ===');
for (const s of r.dxySource) {
  console.log(`${s.setupId} | ${s.day} ${s.direction} E=${s.entry.toFixed(5)} SL=${s.sl.toFixed(5)} TP=${s.tp.toFixed(5)} RRR=${s.rrr.toFixed(2)} | ${s.shapeTrigger}`);
}
console.log('=== DXY DEDUP TRADES (report pipeline) ===');
for (const t of r.dedup.uniqueTrades.filter(t => t.pair === 'DXY')) {
  console.log(`${t.trade_id} | ${t.day} ${t.direction} E=${t.entry.toFixed(5)} SL=${t.sl.toFixed(5)} TP=${t.tp.toFixed(5)} | ${t.provenance}`);
}
console.log('=== SIMS ===');
for (const [id, sim] of r.sims) {
  if (id.startsWith('DXY|LONG|3365')) console.log(`${id} outcome=${sim.outcome} trigger=${sim.triggerMs ? new Date(sim.triggerMs).toISOString() : 'null'} exit=${sim.exitMs ? new Date(sim.exitMs).toISOString() : 'null'} exitPrice=${sim.exitPrice} detail=${sim.detail} fillLeg=${sim.fillLeg}`);
}

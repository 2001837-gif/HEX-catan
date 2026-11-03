'use strict';
// Tuning helper: plays C&K bot games and prints how often the island falls.
const { CKGame } = require('../server/ck');
const { botAction, pendingActors } = require('../server/bot');
const N = +process.argv[2] || 30; let won = 0, lost = 0, turns = 0, vps = [], fin = 0;
for (let k = 0; k < N; k++) {
  const g = new CKGame({ vp: 13, barbSteps: 7, progress: true }, Array.from({ length: 4 }, (_, i) => ({ name: 'B' + i, color: ['red', 'blue', 'orange', 'white'][i], bot: true, diff: ['medium', 'hard', 'medium', 'hard'][i] })));
  const att = []; const orig = g.attack.bind(g); g.attack = () => { orig(); att.push(g.lastAttack.won); };
  let st = 0;
  while (g.phase !== 'ended' && st++ < 30000) { let did = false; for (const i of pendingActors(g)) { const a = botAction(g, i); if (!a) continue; let e = g.act(i, a); if (e && g.turn === i && g.phase === 'main') e = g.act(i, { type: 'end' }); if (e) throw new Error(JSON.stringify(a) + e); did = true; break; } if (!did) throw new Error('stall'); }
  if (g.phase === 'ended') { fin++; vps.push(g.vp(g.winner, true)); } turns += g.turnNo;
  att.forEach(w => (w ? won++ : lost++));
}
console.log(`games finished ${fin}/${N}, avg turns ${(turns / N).toFixed(0)}, raids held ${won}, lost ${lost} (${(100 * lost / Math.max(1, won + lost)).toFixed(0)}% lost)`);

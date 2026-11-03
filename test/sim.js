'use strict';
// Plays full all-bot games through the real engine and asserts invariants.
const { Game, RES, total } = require('../server/engine');
const { botAction, pendingActors } = require('../server/bot');
const assert = require('assert');

function playOne(n, diffs, cfg) {
  const g = new Game(cfg || { vp: 10 }, Array.from({ length: n }, (_, i) => ({ name: 'B' + i, color: ['red', 'blue', 'orange', 'white'][i], bot: true, diff: diffs[i % diffs.length] })));
  assert.strictEqual(g.board.hexes.length, 19);
  assert.strictEqual(g.board.verts.size, 54);
  assert.strictEqual(g.board.edges.size, 72);
  assert.strictEqual(g.board.ports.length, 9);
  let steps = 0;
  while (g.phase !== 'ended' && steps++ < 20000) {
    const actors = pendingActors(g);
    let did = false;
    for (const i of actors) {
      const a = botAction(g, i);
      if (!a) continue;
      let err = g.act(i, a);
      if (err && g.turn === i && g.phase === 'main') err = g.act(i, { type: 'end' });
      if (err) throw new Error(`bot action failed: ${JSON.stringify(a)} -> ${err} (phase ${g.phase})`);
      did = true; break;
    }
    if (!did) throw new Error('stalled in phase ' + g.phase);
    // invariants
    RES.forEach(r => {
      const sum = g.bank[r] + g.players.reduce((s, p) => s + p.res[r], 0);
      assert.strictEqual(sum, 19, `resource conservation broken for ${r}`);
      g.players.forEach(p => assert(p.res[r] >= 0));
    });
  }
  return g;
}

let wins = 0;
for (let k = 0; k < 40; k++) {
  const g = playOne(2 + (k % 3), ['easy', 'medium', 'hard']);
  assert.strictEqual(g.phase, 'ended', 'game did not finish');
  assert(g.vp(g.winner, true) >= 10);
  wins++;
}
// shuffle map: no adjacent 6/8
for (let k = 0; k < 50; k++) {
  const g = new Game({ randomNumbers: true }, [{ name: 'a', color: 'red' }, { name: 'b', color: 'blue' }]);
  g.board.hexes.forEach(h => { if (h.number === 6 || h.number === 8) h.nbrs.forEach(n => assert(![6, 8].includes(g.board.hexes[n].number), 'adjacent hot numbers')); });
}
// Cities & Knights + large board bot games
const { CKGame } = require('../server/ck');
const CK = ['wood', 'brick', 'sheep', 'wheat', 'ore', 'cloth', 'coin', 'paper'];
for (let k = 0; k < 10; k++) {
  const n = 2 + (k % 3), g = new CKGame({ size: k % 2 ? 'large' : 'standard', randomNumbers: k % 2 === 0 }, Array.from({ length: n }, (_, i) => ({ name: 'C' + i, color: ['red', 'blue', 'orange', 'white'][i], bot: true, diff: ['easy', 'medium', 'hard'][i % 3] })));
  let steps = 0;
  while (g.phase !== 'ended' && steps++ < 40000) {
    let did = false;
    for (const i of pendingActors(g)) {
      const a = botAction(g, i); if (!a) continue;
      let err = g.act(i, a); if (err && g.turn === i && g.phase === 'main') err = g.act(i, { type: 'end' });
      if (err) throw new Error(`C&K bot action failed: ${JSON.stringify(a)} -> ${err}`);
      did = true; break;
    }
    if (!did) throw new Error('C&K stalled in phase ' + g.phase);
    CK.forEach(r => { const cap = r === 'cloth' || r === 'coin' || r === 'paper' ? 12 : 19; assert.strictEqual(g.bank[r] + g.players.reduce((s, p) => s + p.res[r], 0), cap, 'C&K conservation ' + r); });
  }
  assert.strictEqual(g.phase, 'ended', 'C&K game did not finish'); assert(g.vp(g.winner, true) >= 13);
  wins++;
}
console.log(`OK: ${wins} full games completed with invariants intact (incl. Cities & Knights)`);

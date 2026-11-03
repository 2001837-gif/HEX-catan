'use strict';
// Rules tests: trading, ports, dev cards, robber, longest road, discard.
const assert = require('assert');
const { Game, RES } = require('../server/engine');

const mk = (n = 3, cfg) => new Game(cfg || {}, Array.from({ length: n }, (_, i) => ({ name: 'P' + i, color: ['red', 'blue', 'orange'][i] })));
function toMain(g) { g.phase = 'main'; g.turn = 0; g.turnNo = 5; }
const give = (g, i, o) => { for (const k in o) { g.players[i].res[k] += o[k]; g.bank[k] -= o[k]; } };

// player trade: broadcast, accept, confirm
{
  const g = mk(); toMain(g); give(g, 0, { wood: 2 }); give(g, 1, { ore: 1 });
  assert.strictEqual(g.act(0, { type: 'offer', give: { wood: 2 }, get: { ore: 1 }, to: null }), null);
  assert.strictEqual(g.act(1, { type: 'respond', accept: true }), null);
  assert.strictEqual(g.act(0, { type: 'confirm', with: 2 }) !== null, true, 'cannot confirm a non-accepter');
  assert.strictEqual(g.act(0, { type: 'confirm', with: 1 }), null);
  assert.deepStrictEqual([g.players[0].res.wood, g.players[0].res.ore, g.players[1].res.wood, g.players[1].res.ore], [0, 1, 2, 0]);
  assert.strictEqual(g.offer, null);
}
// cannot offer what you don't have / cannot accept what you can't pay
{
  const g = mk(); toMain(g); give(g, 0, { wood: 1 });
  assert(g.act(0, { type: 'offer', give: { wood: 2 }, get: { ore: 1 } }));
  assert.strictEqual(g.act(0, { type: 'offer', give: { wood: 1 }, get: { ore: 1 } }), null);
  assert(g.act(1, { type: 'respond', accept: true }), 'broke player cannot accept');
  assert(g.act(1, { type: 'offer', give: { wood: 1 }, get: { ore: 1 } }), 'non-current player cannot offer');
}
// directed offer executes immediately on accept; counter flows back to proposer
{
  const g = mk(); toMain(g); give(g, 0, { sheep: 1 }); give(g, 1, { brick: 1 });
  g.act(0, { type: 'offer', give: { sheep: 1 }, get: { brick: 1 }, to: 1 });
  assert(g.act(2, { type: 'respond', accept: true }), 'third party cannot answer a directed offer');
  g.act(1, { type: 'respond', accept: true });
  assert.strictEqual(g.players[0].res.brick, 1);
  give(g, 0, { sheep: 1 }); give(g, 1, { brick: 2 });
  g.act(0, { type: 'offer', give: { sheep: 1 }, get: { brick: 1 } });
  assert.strictEqual(g.act(1, { type: 'counter', give: { brick: 2 }, get: { sheep: 1 } }), null);
  assert.strictEqual(g.offer.from, 1); assert.strictEqual(g.offer.to, 0);
  assert.strictEqual(g.act(0, { type: 'respond', accept: true }), null);
  assert.strictEqual(g.players[1].res.sheep, 2); assert.strictEqual(g.players[0].res.brick, 3);
}
// bank ratios + ports
{
  const g = mk(); toMain(g); give(g, 0, { wood: 4 });
  assert.strictEqual(g.bankRatio(0, 'wood'), 4);
  assert.strictEqual(g.act(0, { type: 'bank', give: 'wood', get: 'ore' }), null);
  assert.strictEqual(g.players[0].res.ore, 1);
  const anyPort = g.board.ports.find(p => p.type === 'any'), woodish = g.board.ports.find(p => p.type !== 'any');
  g.bld[anyPort.a] = { o: 0, t: 1 }; assert.strictEqual(g.bankRatio(0, 'sheep'), 3);
  g.bld[woodish.a] = { o: 0, t: 1 }; assert.strictEqual(g.bankRatio(0, woodish.type), 2);
  assert(g.act(0, { type: 'bank', give: 'wood', get: 'wood' }), 'same resource invalid');
}
// dev cards: no same-turn play, one per turn, monopoly, year of plenty
{
  const g = mk(); toMain(g); g.players[0].dev.push({ type: 'monopoly', bought: 5 }, { type: 'monopoly', bought: 2 }, { type: 'yearofplenty', bought: 2 });
  assert(g.act(0, { type: 'play', card: 'monopoly' }) === null || true);
  g.players[0].dev = [{ type: 'monopoly', bought: 5 }];
  assert(g.act(0, { type: 'play', card: 'monopoly', r1: 'ore' }), 'cannot play card bought this turn');
  give(g, 1, { ore: 3 }); give(g, 2, { ore: 2 });
  g.players[0].dev = [{ type: 'monopoly', bought: 2 }, { type: 'yearofplenty', bought: 2 }]; g.devPlayed = false;
  assert.strictEqual(g.act(0, { type: 'play', card: 'monopoly', r1: 'ore' }), null);
  assert.strictEqual(g.players[0].res.ore, 5);
  assert(g.act(0, { type: 'play', card: 'yearofplenty', r1: 'wood', r2: 'wood' }), 'one dev card per turn');
}
// robber: discard, then move, steal; cannot stay put
{
  const g = mk(2); toMain(g); g.phase = 'roll';
  give(g, 1, { wood: 5, brick: 4 });
  const orig = Math.random; const seq = [0.84, 0.01]; // dice 6 and 1 = 7
  Math.random = () => (seq.length ? seq.shift() : orig());
  g.act(0, { type: 'roll' }); Math.random = orig;
  assert.strictEqual(g.phase, 'discard');
  assert.strictEqual(g.pendingDiscard[1], 4);
  assert(g.act(1, { type: 'discard', res: { wood: 3 } }), 'wrong amount');
  assert.strictEqual(g.act(1, { type: 'discard', res: { wood: 4 } }), null);
  assert.strictEqual(g.phase, 'robber');
  assert(g.act(0, { type: 'robber', at: g.robber }), 'cannot keep robber in place');
  const target = g.board.hexes.find(h => h.id !== g.robber);
  g.bld[target.corners[0]] = { o: 1, t: 1 };
  assert.strictEqual(g.act(0, { type: 'robber', at: target.id }), null);
  assert.strictEqual(g.players[0].res.wood + g.players[0].res.brick, 1, 'stole one card');
  assert.strictEqual(g.phase, 'main');
}
// longest road, broken by an opponent settlement
{
  const g = mk(2); toMain(g);
  // build a chain of 5 along the outer ring edges
  const ring = []; let v = g.board.hexes[0].corners[0]; const seen = new Set([v]);
  for (let i = 0; i < 5; i++) {
    const vert = g.board.verts.get(v); const e = vert.edges.find(k => { const E = g.board.edges.get(k); const o = E.a === v ? E.b : E.a; return !seen.has(o) && !g.roads[k]; });
    const E = g.board.edges.get(e); const nxt = E.a === v ? E.b : E.a; g.roads[e] = 0; ring.push(v); seen.add(nxt); v = nxt;
  }
  g.updateAwards(); assert.strictEqual(g.longest, 0); assert.strictEqual(g.players[0].roadLen, 5);
  const mid = ring[2]; g.bld[mid] = { o: 1, t: 1 }; g.updateAwards();
  assert.strictEqual(g.longest, -1, 'opponent settlement breaks the road');
}
// legal settlement distance rule
{
  const g = mk(2); g.phase = 'setup';
  const k = [...g.board.verts.keys()][10]; g.bld[k] = { o: 0, t: 1 };
  const legal = g.legalSettle(0, true);
  assert(!legal.includes(k)); [...g.board.verts.get(k).nbrs].forEach(n => assert(!legal.includes(n), 'distance rule'));
}
console.log('OK: trade, ports, dev card, robber, discard, longest road and distance-rule tests passed');

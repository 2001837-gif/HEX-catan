'use strict';
// Rules tests for the Cities & Knights layer + large board.
const assert = require('assert');
const { CKGame, ALL } = require('../server/ck');
const { Game, buildBoard } = require('../server/engine');
const { botAction, pendingActors } = require('../server/bot');

const mk = (n = 3, cfg) => new CKGame(Object.assign({ progress: true }, cfg || {}), Array.from({ length: n }, (_, i) => ({ name: 'P' + i, color: ['red', 'blue', 'orange', 'white'][i] })));
const give = (g, i, o) => { for (const k in o) { g.players[i].res[k] += o[k]; g.bank[k] -= o[k]; } };
const toMain = g => { g.phase = 'main'; g.turn = 0; g.turnNo = 5; };
const vk = g => [...g.board.verts.keys()];
// a connected corridor of 3 roads for player i starting at vertex index s
function corridor(g, i, n = 3) {
  const first = [...g.board.verts.values()].find(v => v.hexes.length === 3);
  const path = [first.key]; let v = first;
  for (let k = 0; k < n; k++) {
    const e = v.edges.find(x => g.roads[x] === undefined && !path.includes(g.board.edges.get(x).a === v.key ? g.board.edges.get(x).b : g.board.edges.get(x).a));
    const E = g.board.edges.get(e); g.roads[e] = i; const w = E.a === v.key ? E.b : E.a; path.push(w); v = g.board.verts.get(w);
  }
  return path;
}

// ---- boards ----
for (const size of ['standard', 'large']) {
  const b = buildBoard(false, size), want = size === 'large' ? [37, 12] : [19, 9];
  assert.strictEqual(b.hexes.length, want[0]); assert.strictEqual(b.ports.length, want[1]);
  assert(b.hexes.every(h => h.terrain === 'desert' || h.number > 0));
  b.hexes.forEach(h => { if (h.number === 6 || h.number === 8) h.nbrs.forEach(n => assert(![6, 8].includes(b.hexes[n].number), size + ': adjacent hot numbers')); });
  const used = new Set(); b.ports.forEach(p => { assert(!used.has(p.a) && !used.has(p.b), 'ports overlap'); used.add(p.a); used.add(p.b); });
}
{ // the base game plays on the large board too
  const g = new Game({ size: 'large' }, [{ name: 'a', color: 'red' }, { name: 'b', color: 'blue' }]);
  assert.strictEqual(g.board.hexes.length, 37); assert.strictEqual(g.board.verts.size, 96);
}

// ---- setup: second placement is a city, commodities exist ----
{
  const g = mk(2);
  assert.strictEqual(g.players[0].res.cloth, 0); assert.strictEqual(g.bank.coin, 12);
  const a = g.legalSettle(0, true)[0];
  assert.strictEqual(g.act(0, { type: 'settlement', at: a }), null); assert.strictEqual(g.bld[a].t, 1);
}

// ---- production: a city on forest gives wood + paper ----
{
  const g = mk(2); toMain(g);
  const h = g.board.hexes.find(x => x.terrain === 'forest' && x.number); const c = h.corners[0];
  g.bld[c] = { o: 0, t: 2 }; g.robber = g.desert;
  const before = { wood: g.players[0].res.wood, paper: g.players[0].res.paper };
  g.produce(h.number);
  assert(g.players[0].res.wood >= before.wood + 1 && g.players[0].res.paper >= before.paper + 1, 'forest city yields wood and paper');
  const h2 = g.board.hexes.find(x => x.terrain === 'hills' && x.number && x.id !== h.id); const c2 = h2.corners[0];
  g.bld[c2] = { o: 1, t: 2 }; const b0 = g.players[1].res.brick; g.produce(h2.number);
  assert(g.players[1].res.brick >= b0 + 2, 'hills city yields 2 brick');
}

// ---- improvements, abilities, metropolis ----
{
  const g = mk(3); toMain(g);
  const city = vk(g)[0]; g.bld[city] = { o: 0, t: 2 };
  assert(g.act(0, { type: 'improve', track: 'trade' }), 'needs cloth');
  give(g, 0, { cloth: 1 }); assert.strictEqual(g.act(0, { type: 'improve', track: 'trade' }), null); assert.strictEqual(g.players[0].imp.trade, 1);
  give(g, 0, { cloth: 2 }); assert.strictEqual(g.act(0, { type: 'improve', track: 'trade' }), null);
  give(g, 0, { cloth: 3 }); g.act(0, { type: 'improve', track: 'trade' });
  assert.strictEqual(g.ratio(0, 'cloth'), 2, 'trading house gives 2:1 commodities');
  give(g, 0, { cloth: 4 }); g.act(0, { type: 'improve', track: 'trade' });
  assert.strictEqual(g.metro.trade && g.metro.trade.o, 0, 'level 4 founds a metropolis'); assert.strictEqual(g.vp(0, false), 2 + 2);
  // another player needs level 5 and more than the holder to steal it
  const c2 = vk(g)[30]; g.bld[c2] = { o: 1, t: 2 }; g.players[1].imp.trade = 4; g.checkMetro(1, 'trade'); assert.strictEqual(g.metro.trade.o, 0, 'level 4 cannot take it');
  g.players[1].imp.trade = 5; g.checkMetro(1, 'trade'); assert.strictEqual(g.metro.trade.o, 1, 'level 5 steals it');
  assert(g.act(0, { type: 'improve', track: 'science' }) !== null, 'wrong turn state is rejected or lacks commodities');
}

// ---- knights ----
{
  const g = mk(2); toMain(g);
  const path = corridor(g, 0, 3);
  give(g, 0, { sheep: 4, ore: 4, wheat: 2 });
  assert(g.act(0, { type: 'kbuild', at: vk(g).find(k => !path.includes(k) && !g.board.verts.get(k).edges.some(e => g.roads[e] === 0)) }), 'must connect to own road');
  assert.strictEqual(g.act(0, { type: 'kbuild', at: path[0] }), null);
  assert.strictEqual(g.act(0, { type: 'kbuild', at: path[1] }), null);
  assert(g.act(0, { type: 'kbuild', at: path[2] }), 'only two basic knights');
  assert.strictEqual(g.kn[path[0]].active, false);
  assert.strictEqual(g.act(0, { type: 'kact', at: path[0] }), null); assert.strictEqual(g.defense(0), 1);
  assert.strictEqual(g.act(0, { type: 'kup', at: path[0] }), null); assert.strictEqual(g.defense(0), 2);
  assert.strictEqual(g.act(0, { type: 'kup', at: path[0] }) !== null, true, 'mighty needs the politics fortress');
  g.players[0].imp.politics = 3; give(g, 0, { sheep: 1, ore: 1 });
  assert.strictEqual(g.act(0, { type: 'kup', at: path[0] }), null); assert.strictEqual(g.defense(0), 3);
  // moving: active knight travels along own roads, becomes inactive
  assert(g.act(0, { type: 'kmove', from: path[1], to: path[3] }), 'inactive knights cannot move');
  assert.strictEqual(g.act(0, { type: 'kmove', from: path[0], to: path[3] }), null);
  assert(g.kn[path[3]] && !g.kn[path[0]] && g.kn[path[3]].active === false && g.kn[path[3]].lvl === 3);
  // displacement: a stronger active knight drives off a weaker enemy knight
  g.kn[path[3]].active = true; g.kn[path[1]].o = 1; g.kn[path[1]].lvl = 1; g.kn[path[1]].active = false;
  assert.strictEqual(g.act(0, { type: 'kmove', from: path[3], to: path[1] }), null);
  assert.strictEqual(g.kn[path[1]].o, 0, 'displaced the enemy');
  // enemy knights block roads and settlements through that vertex
  g.kn[path[2]] = { o: 1, lvl: 1, active: false };
  assert(!g.legalSettle(0, false).includes(path[2]));
}

// ---- barbarians ----
{
  const g = mk(3, { barbSteps: 4 }); toMain(g);
  const spots = vk(g); const cities = [spots[0], spots[40], spots[80]];
  cities.forEach((c, i) => { g.bld[c] = { o: i, t: 2 }; });
  // knights: player 0 strong enough alone
  const kn = vk(g)[10]; g.kn[kn] = { o: 0, lvl: 3, active: true };
  g.barb.pos = 3; g.attack();
  assert(g.lastAttack.won, 'defended: 3 cities vs 3 knight strength'); assert.strictEqual(g.players[0].xvp, 1, 'sole top defender earns a victory point');
  assert.strictEqual(g.barb.pos, 0); assert(g.robberOn); assert.strictEqual(g.kn[kn].active, false, 'knights deactivate after an attack');
  // a loss: everyone has 0 defence, each loses a city, metropolis city survives
  g.metro.science = { o: 1, at: cities[1] };
  g.attack();
  assert(!g.lastAttack.won); assert.strictEqual(g.bld[cities[0]].t, 1); assert.strictEqual(g.bld[cities[2]].t, 1); assert.strictEqual(g.bld[cities[1]].t, 2, 'metropolis is protected');
}
// robber stays asleep before the first attack
{
  const g = mk(2); g.phase = 'roll'; g.turn = 0; g.turnNo = 3; g.fixed = [3, 4];
  g.act(0, { type: 'roll' });
  assert(g.phase === 'main' || g.phase === 'discard');
  assert.strictEqual(g.robberOn, false);
}
// ---- walls and discard limits ----
{
  const g = mk(2); toMain(g); const city = vk(g)[3]; g.bld[city] = { o: 0, t: 2 };
  give(g, 0, { brick: 2 }); assert.strictEqual(g.act(0, { type: 'wall', at: city }), null); assert.strictEqual(g.limit(0), 9);
  give(g, 0, { brick: 2 }); assert(g.act(0, { type: 'wall', at: city }), 'one wall per city');
}
// ---- progress cards ----
{
  const g = mk(3); toMain(g);
  g.players[0].pc = [{ type: 'resmonopoly', track: 'trade' }, { type: 'trademonopoly', track: 'trade' }, { type: 'mastermerchant', track: 'trade' }, { type: 'wedding', track: 'politics' }];
  give(g, 1, { ore: 3, coin: 2 }); give(g, 2, { ore: 1, coin: 1 });
  assert.strictEqual(g.act(0, { type: 'pplay', card: 'resmonopoly', res: 'ore' }), null); assert.strictEqual(g.players[0].res.ore, 3);
  assert.strictEqual(g.act(0, { type: 'pplay', card: 'trademonopoly', res: 'coin' }), null); assert.strictEqual(g.players[0].res.coin, 2);
  assert.strictEqual(g.act(0, { type: 'pplay', card: 'wedding' }), null);
  assert(g.act(0, { type: 'pplay', card: 'alchemist' }), 'cannot play a card you do not hold');
  const g2 = mk(2); g2.phase = 'roll'; g2.turn = 0; g2.turnNo = 3; g2.players[0].pc = [{ type: 'alchemist', track: 'science' }];
  assert.strictEqual(g2.act(0, { type: 'pplay', card: 'alchemist', y: 3, r: 4 }), null); g2.act(0, { type: 'roll' }); assert.deepStrictEqual(g2.dice, [3, 4]);
  // victory-point cards are revealed immediately
  const g3 = mk(2); g3.pdeck.science = ['printer']; g3.drawProgress(0, 'science'); assert.strictEqual(g3.players[0].xvp, 1);
  // gate die: improvement level must reach the red die
  const g4 = mk(2); g4.players[0].imp.science = 2; g4.pdeck.science = ['crane', 'crane', 'crane']; g4.awardProgress('science', 3); assert.strictEqual(g4.players[0].pc.length, 0); g4.awardProgress('science', 2); assert.strictEqual(g4.players[0].pc.length, 1);
}
// ---- views hide other players' progress cards and hands ----
{
  const g = mk(2); give(g, 1, { coin: 2 }); g.players[1].pc = [{ type: 'crane', track: 'science' }];
  const v = g.view(0); assert.strictEqual(v.pc.length, 0); assert.strictEqual(v.players[1].pcCount, 1); assert.strictEqual(v.players[1].cards, 2); assert(!('hand' in v.players[1]));
  assert.strictEqual(typeof v.barb.strength, 'number');
}
console.log('OK: Cities & Knights tests passed (boards, production, improvements, metropolis, knights, barbarians, walls, progress cards)');

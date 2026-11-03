'use strict';
// Weighted heuristic bot. Returns one legal action per call (or null if nothing to do).
const { RES, COST, total, pip, rnd, TERR_RES, shuffle } = require('./engine');
const { COMM, TRACKS, TRACK_COM } = require('./ck');

function vertexScore(g, vk, diff) {
  const v = g.board.verts.get(vk);
  let s = 0; const kinds = new Set();
  v.hexes.forEach(h => {
    const H = g.board.hexes[h];
    s += pip(H.number);
    if (TERR_RES[H.terrain]) kinds.add(TERR_RES[H.terrain]);
  });
  s += kinds.size * (diff === 'easy' ? 0.5 : 2);
  if (g.board.portAt[vk]) s += diff === 'hard' ? 1.5 : 0.5;
  const noise = diff === 'easy' ? 6 : diff === 'medium' ? 1.5 : 0.3;
  return s + Math.random() * noise;
}
function best(list, f) {
  let b = null, bs = -Infinity;
  list.forEach(x => { const s = f(x); if (s > bs) { bs = s; b = x; } });
  return b;
}
function pickRoad(g, i, list) {
  // prefer roads that lead to a legal settlement spot / more open vertices
  return best(list, e => {
    const E = g.board.edges.get(e);
    let s = Math.random();
    [E.a, E.b].forEach(v => {
      if (!g.bld[v] && ![...g.board.verts.get(v).nbrs].some(n => g.bld[n])) s += vertexScore(g, v, 'medium') * 0.3;
    });
    return s;
  });
}

function botAction(g, i) {
  if (g.phase === 'ended') return null;
  const p = g.players[i], diff = p.diff;
  if (g.ck && g.pendAq && g.pendAq[i]) { const need = RES.filter(r => g.bank[r] > 0).sort((a, b) => p.res[a] - p.res[b])[0]; if (need) return { type: 'aqueduct', res: need }; }
  if (g.phase === 'discard') {
    const need = g.pendingDiscard[i];
    if (!need) return null;
    const res = {}; const pool = [];
    g.RS.forEach(r => { for (let k = 0; k < p.res[r]; k++) pool.push(r); });
    for (let k = 0; k < need; k++) { const j = rnd(pool.length); const r = pool.splice(j, 1)[0]; res[r] = (res[r] || 0) + 1; }
    return { type: 'discard', res };
  }
  // respond to trade offers
  const o = g.offer;
  if (o && o.from !== i && !o.resp[i] && (o.to === null || o.to === i)) {
    const give = Object.values(o.get).reduce((a, b) => a + b, 0);
    const recv = Object.values(o.give).reduce((a, b) => a + b, 0);
    const leader = g.players.reduce((m, q) => Math.max(m, g.vp(q.idx, false)), 0);
    const ok = diff !== 'easy' && g.has(p, o.get) && recv >= give && g.vp(o.from, false) < Math.max(leader, 6) && Math.random() < 0.7;
    return { type: 'respond', accept: !!ok };
  }
  if (g.turn !== i) return null;

  switch (g.phase) {
    case 'setup': {
      if (g.setup.sub === 'settlement') return { type: 'settlement', at: best(g.legalSettle(i, true), v => vertexScore(g, v, diff)) };
      return { type: 'road', at: pickRoad(g, i, g.legalRoad(i)) };
    }
    case 'roll': return { type: 'roll' };
    case 'robber': {
      const targets = g.robberTargets(i);
      return {
        type: 'robber', at: best(targets, h => {
          const owners = g.hexOwners(h);
          if (owners.includes(i)) return -100;
          const H = g.board.hexes[h];
          let s = pip(H.number) * 2 + Math.random();
          owners.forEach(o => { s += g.vp(o, false); });
          return s;
        }),
      };
    }
    case 'steal': return { type: 'steal', from: g.legalFor(i).steal[0] };
    case 'main': {
      if (g.freeRoads > 0) return { type: 'road', at: pickRoad(g, i, g.legalRoad(i)) };
      const L = g.legalFor(i);
      if (L.city.length) return { type: 'city', at: best(L.city, v => vertexScore(g, v, 'hard')) };
      if (L.settlement.length) return { type: 'settlement', at: best(L.settlement, v => vertexScore(g, v, diff)) };
      if (g.ck) { const x = ckMain(g, i, L, diff); if (x) return x; }
      const hasKnight = p.dev.some(d => d.type === 'knight' && d.bought < g.turnNo);
      if (!g.devPlayed && hasKnight && (g.hexOwners(g.robber).includes(i) || Math.random() < 0.4)) return { type: 'play', card: 'knight' };
      if (!g.devPlayed) {
        const rb = p.dev.find(d => d.type === 'roadbuilding' && d.bought < g.turnNo);
        if (rb && L.road.length) return { type: 'play', card: 'roadbuilding' };
        const mo = p.dev.find(d => d.type === 'monopoly' && d.bought < g.turnNo);
        if (mo) return { type: 'play', card: 'monopoly', r1: best(RES, r => -p.res[r] + Math.random()) };
        const yp = p.dev.find(d => d.type === 'yearofplenty' && d.bought < g.turnNo);
        if (yp) { const need = RES.slice().sort((a, b) => p.res[a] - p.res[b]); return { type: 'play', card: 'yearofplenty', r1: need[0], r2: need[1] }; }
      }
      if (g.has(p, COST.dev) && g.deck.length && (diff !== 'easy' || Math.random() < 0.5)) return { type: 'buydev' };
      const settleSpots = g.legalSettle(i, false).length;
      if (L.road.length && g.count(i, 'road') < 13 && (settleSpots === 0 || Math.random() < (diff === 'easy' ? 0.5 : 0.25)) && (diff !== 'hard' || settleSpots === 0 || Math.random() < 0.3))
        return { type: 'road', at: pickRoad(g, i, L.road) };
      // bank trade surplus toward what we lack
      g._bt = g._bt || {};
      const key = g.turnNo + ':' + i;
      if ((g._bt[key] || 0) < 3 && diff !== 'easy') {
        const give = RES.filter(r => p.res[r] >= g.bankRatio(i, r)).sort((a, b) => p.res[b] - p.res[a])[0];
        const need = RES.filter(r => r !== give && p.res[r] === 0 && g.bank[r] > 0)[0];
        if (give && need && p.res[give] - g.bankRatio(i, give) >= 0 && total(p.res) >= 5) { g._bt[key] = (g._bt[key] || 0) + 1; return { type: 'bank', give, get: need }; }
      }
      return { type: 'end' };
    }
  }
  return null;
}

// ---------- Cities & Knights additions ----------
function ckMain(g, i, L, diff) {
  const p = g.players[i], steps = g.cfg.barbSteps;
  const danger = g.barb.pos >= steps - 3;
  const mine = g.knightsOf(i), act = mine.filter(k => g.kn[k].active).length;
  if (L.kAct.length && p.res.wheat >= 1 && (diff !== 'easy' || danger) && (danger || act === 0)) return { type: 'kact', at: L.kAct[0] };
  if (L.kBuild.length && mine.length < (danger ? 4 : 2) && (diff !== 'easy' || danger || Math.random() < 0.4)) return { type: 'kbuild', at: best(L.kBuild, v => vertexScore(g, v, 'medium')) };
  if (L.kUp.length && danger) return { type: 'kup', at: L.kUp[0] };
  if (g.count(i, 'city') > 0 && (diff !== 'easy' || Math.random() < 0.3)) {
    const order = diff === 'hard' ? ['science', 'politics', 'trade'] : shuffle(TRACKS);
    for (const t of order) if (p.imp[t] < 5 && p.res[TRACK_COM[t]] >= p.imp[t] + 1) return { type: 'improve', track: t };
  }
  const c = botCard(g, i, L);
  if (c) return c;
  if ((g._bt2 = g._bt2 || {})[g.turnNo + ':' + i] === undefined) g._bt2[g.turnNo + ':' + i] = 0;
  if (g._bt2[g.turnNo + ':' + i] < 2) {
    const give = COMM.find(c2 => p.res[c2] >= Math.max(5, g.ratio(i, c2)));
    const need = RES.find(r => p.res[r] === 0 && g.bank[r] > 0);
    if (give && need) { g._bt2[g.turnNo + ':' + i]++; return { type: 'bank', give, get: need }; }
  }
  return null;
}
function botCard(g, i, L) {
  const p = g.players[i];
  const has = t => p.pc.some(c => c.type === t);
  const opps = g.players.map((_, k) => k).filter(k => k !== i);
  const myVp = g.vp(i, false);
  if (has('crane') && g.count(i, 'city') > 0 && TRACKS.some(t => p.imp[t] < 5 && p.res[TRACK_COM[t]] >= p.imp[t])) return { type: 'pplay', card: 'crane' };
  if (has('engineer') && L.cityNoWall.length) return { type: 'pplay', card: 'engineer', at: L.cityNoWall[0] };
  if (has('medicine') && L.settleOwn.length && p.res.wheat >= 2 && p.res.ore >= 1 && g.count(i, 'city') < 4) return { type: 'pplay', card: 'medicine', at: L.settleOwn[0] };
  for (const [card, terr] of [['irrigation', 'fields'], ['mining', 'mountains']]) {
    if (has(card)) { const near = Object.keys(g.bld).some(k => g.bld[k].o === i && g.board.verts.get(k).hexes.some(h => g.board.hexes[h].terrain === terr)); if (near) return { type: 'pplay', card }; }
  }
  if (has('roadbuilding') && L.road.length && g.count(i, 'road') < 12) return { type: 'pplay', card: 'roadbuilding' };
  if (has('smith') && L.kUpAny.length) return { type: 'pplay', card: 'smith', at1: L.kUpAny[0], at2: L.kUpAny[1] };
  if (has('resmonopoly')) return { type: 'pplay', card: 'resmonopoly', res: RES.slice().sort((a, b) => p.res[a] - p.res[b])[0] };
  if (has('trademonopoly')) return { type: 'pplay', card: 'trademonopoly', res: COMM.slice().sort((a, b) => p.res[a] - p.res[b])[0] };
  if (has('mastermerchant')) { const t = opps.find(k => g.vp(k, false) > myVp && g.tot(g.players[k].res) > 1); if (t !== undefined) return { type: 'pplay', card: 'mastermerchant', from: t }; }
  if (has('wedding') && opps.some(k => g.vp(k, false) > myVp)) return { type: 'pplay', card: 'wedding' };
  if (has('saboteur') && opps.some(k => g.vp(k, false) >= myVp && g.tot(g.players[k].res) >= 4)) return { type: 'pplay', card: 'saboteur' };
  if (has('spy')) { const t = opps.find(k => g.players[k].pc.length > 0); if (t !== undefined && p.pc.length < 4) return { type: 'pplay', card: 'spy', from: t }; }
  if (has('warlord') && g.knightsOf(i).filter(k => !g.kn[k].active).length >= 2) return { type: 'pplay', card: 'warlord' };
  if (has('bishop') && g.robberOn) return { type: 'pplay', card: 'bishop' };
  if (has('intrigue') && L.intrigue.length) return { type: 'pplay', card: 'intrigue', at: L.intrigue[0] };
  if (has('merchantfleet')) { const r = RES.concat(COMM).find(x => p.res[x] >= 2 && g.bank[RES[0]] > 0 && !(x === 'wheat')); if (r && p.res[r] >= 2 && p.res[r] < 4) return { type: 'pplay', card: 'merchantfleet', res: r }; }
  return null;
}

// Which players currently owe the game an action?
function pendingActors(g) {
  if (g.phase === 'ended') return [];
  if (g.phase === 'discard') return Object.keys(g.pendingDiscard).map(Number);
  const out = [g.turn];
  if (g.pendAq) Object.keys(g.pendAq).map(Number).forEach(k => { if (!out.includes(k)) out.push(k); });
  if (g.offer && g.phase === 'main') {
    g.players.forEach(p => { if (p.idx !== g.offer.from && !g.offer.resp[p.idx] && (g.offer.to === null || g.offer.to === p.idx)) out.push(p.idx); });
  }
  return out;
}

module.exports = { botAction, pendingActors };

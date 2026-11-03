'use strict';
// Server-authoritative game engine. No I/O; pure rules.
const RES = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
const COST = {
  road: { wood: 1, brick: 1 },
  settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1 },
  city: { wheat: 2, ore: 3 },
  dev: { sheep: 1, wheat: 1, ore: 1 },
};
const TERR_RES = { forest: 'wood', hills: 'brick', pasture: 'sheep', fields: 'wheat', mountains: 'ore' };
const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const LIMITS = { road: 15, settlement: 5, city: 4 };
const rnd = n => Math.floor(Math.random() * n);
const pip = n => (n ? 6 - Math.abs(7 - n) : 0);
function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const emptyRes = () => ({ wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 });
const total = r => RES.reduce((s, k) => s + (r[k] || 0), 0);

function ring(k) {
  if (k === 0) return [[0, 0]];
  let q = DIRS[4][0] * k, r = DIRS[4][1] * k;
  const out = [];
  for (let i = 0; i < 6; i++) for (let j = 0; j < k; j++) { out.push([q, r]); q += DIRS[i][0]; r += DIRS[i][1]; }
  return out;
}

function buildBoard(randomNumbers, size) {
  const R = size === 'large' ? 3 : 2;
  const coords = [];
  for (let q = -R; q <= R; q++) for (let r = -R; r <= R; r++) if (Math.abs(q + r) <= R) coords.push([q, r]);
  const terr = shuffle(R === 3 ? [
    ...Array(7).fill('forest'), ...Array(7).fill('pasture'), ...Array(7).fill('fields'),
    ...Array(6).fill('hills'), ...Array(6).fill('mountains'), 'desert', 'desert',
  ] : [
    ...Array(4).fill('forest'), ...Array(4).fill('pasture'), ...Array(4).fill('fields'),
    ...Array(3).fill('hills'), ...Array(3).fill('mountains'), 'desert',
  ]);
  const hexes = coords.map(([q, r], i) => ({ id: i, q, r, terrain: terr[i], number: 0, cx: Math.sqrt(3) * (q + r / 2), cy: 1.5 * r }));
  const byQR = new Map(hexes.map(h => [h.q + ',' + h.r, h]));
  hexes.forEach(h => { h.nbrs = DIRS.map(d => byQR.get((h.q + d[0]) + ',' + (h.r + d[1]))).filter(Boolean).map(x => x.id); });

  const nums18 = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11];
  const nums = R === 3 ? nums18.concat(nums18).slice(0, 35) : nums18;
  if (!randomNumbers && R === 2) {
    const spiral = [...ring(2), ...ring(1), ...ring(0)].map(([q, r]) => byQR.get(q + ',' + r)).filter(h => h.terrain !== 'desert');
    spiral.forEach((h, i) => { h.number = nums[i]; });
  } else {
    const land = hexes.filter(h => h.terrain !== 'desert');
    for (let tries = 0; tries < 2000; tries++) {
      const s = shuffle(nums);
      land.forEach((h, i) => { h.number = s[i]; });
      const bad = land.some(h => (h.number === 6 || h.number === 8) && h.nbrs.some(n => { const m = hexes[n].number; return m === 6 || m === 8; }));
      if (!bad) break;
    }
  }

  const verts = new Map(), edges = new Map();
  const vk = (x, y) => Math.round(x * 100) + ',' + Math.round(y * 100);
  hexes.forEach(h => {
    h.corners = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (60 * i - 30);
      const x = h.cx + Math.cos(a), y = h.cy + Math.sin(a), k = vk(x, y);
      if (!verts.has(k)) verts.set(k, { key: k, x, y, hexes: [], nbrs: new Set(), edges: [] });
      verts.get(k).hexes.push(h.id);
      h.corners.push(k);
    }
  });
  hexes.forEach(h => {
    for (let i = 0; i < 6; i++) {
      const a = h.corners[i], b = h.corners[(i + 1) % 6];
      const ek = a < b ? a + '|' + b : b + '|' + a;
      if (!edges.has(ek)) {
        edges.set(ek, { key: ek, a, b, hexes: [] });
        verts.get(a).nbrs.add(b); verts.get(b).nbrs.add(a);
        verts.get(a).edges.push(ek); verts.get(b).edges.push(ek);
      }
      edges.get(ek).hexes.push(h.id);
    }
  });

  // ports spread around the coast (9 on the standard board, 12 on the large one)
  const coast = [...edges.values()].filter(e => e.hexes.length === 1).map(e => {
    const A = verts.get(e.a), B = verts.get(e.b);
    return { e, ang: Math.atan2((A.y + B.y) / 2, (A.x + B.x) / 2) };
  }).sort((p, q) => p.ang - q.ang).map(p => p.e);
  const idxs = R === 3 ? Array.from({ length: 12 }, (_, i) => Math.round(i * coast.length / 12)) : [0, 3, 6, 10, 13, 16, 20, 23, 26];
  const ptypes = shuffle(R === 3 ? [...Array(7).fill('any'), 'wood', 'brick', 'sheep', 'wheat', 'ore'] : ['any', 'any', 'any', 'any', 'wood', 'brick', 'sheep', 'wheat', 'ore']);
  const ports = idxs.map((ci, i) => ({ type: ptypes[i], a: coast[ci].a, b: coast[ci].b }));
  const portAt = {};
  ports.forEach(p => { portAt[p.a] = p.type; portAt[p.b] = p.type; });
  return { hexes, verts, edges, ports, portAt };
}

class Game {
  constructor(cfg, plist) {
    this.cfg = Object.assign({ vp: 10, discardLimit: 7, randomNumbers: false, friendlyRobber: false, timer: 0, size: 'standard' }, cfg);
    this.RS = RES;
    this.board = buildBoard(this.cfg.randomNumbers || this.cfg.size === 'large', this.cfg.size);
    this.n = plist.length;
    this.players = plist.map((p, i) => ({
      idx: i, name: p.name, color: p.color, bot: !!p.bot, diff: p.diff || 'medium',
      res: emptyRes(), dev: [], knights: 0, roadLen: 0, connected: true,
      st: { gained: 0, spent: 0, roads: 0, settlements: 0, cities: 0, devs: 0 },
    }));
    this.bld = {}; this.roads = {};
    this.robber = this.board.hexes.find(h => h.terrain === 'desert').id;
    this.deck = shuffle([...Array(14).fill('knight'), ...Array(5).fill('vp'), 'roadbuilding', 'roadbuilding', 'yearofplenty', 'yearofplenty', 'monopoly', 'monopoly']);
    this.bank = { wood: 19, brick: 19, sheep: 19, wheat: 19, ore: 19 };
    this.phase = 'setup';
    const order = [...Array(this.n).keys()];
    this.setup = { order: [...order, ...order.slice().reverse()], i: 0, sub: 'settlement', last: null };
    this.turn = this.setup.order[0]; this.turnNo = 0;
    this.dice = null; this.diceHist = Array(13).fill(0);
    this.logs = []; this.ver = 0;
    this.longest = -1; this.army = -1; this.winner = -1;
    this.offer = null; this.offerSeq = 0;
    this.pendingDiscard = {}; this.freeRoads = 0; this.devPlayed = false; this.afterRobber = 'main';
    this.startTime = Date.now(); this.endTime = 0;
    this.log(`Game started. First to ${this.cfg.vp} victory points wins.`, 'sys');
  }

  log(m, k = 'info') { this.logs.push({ t: Date.now(), m, k }); if (this.logs.length > 300) this.logs.shift(); }
  nm(i) { return this.players[i].name; }
  count(idx, type) {
    if (type === 'road') return Object.values(this.roads).filter(o => o === idx).length;
    const t = type === 'settlement' ? 1 : 2;
    return Object.values(this.bld).filter(b => b.o === idx && b.t === t).length;
  }
  tot(r) { return this.RS.reduce((s, k) => s + (r[k] || 0), 0); }
  afterDiscard() { return 'robber'; }
  occupied() { return false; }
  blockedFor(v, idx) { const b = this.bld[v]; return !!(b && b.o !== idx); }
  has(p, cost) { return Object.keys(cost).every(k => p.res[k] >= cost[k]); }
  pay(p, cost) { for (const k in cost) { p.res[k] -= cost[k]; this.bank[k] += cost[k]; p.st.spent += cost[k]; } }
  vp(i, hidden) {
    const p = this.players[i];
    let v = this.count(i, 'settlement') + 2 * this.count(i, 'city');
    if (this.longest === i) v += 2;
    if (this.army === i) v += 2;
    if (hidden) v += p.dev.filter(d => d.type === 'vp').length;
    return v;
  }

  // ---------- legality ----------
  legalSettle(idx, setup) {
    const out = [];
    for (const [k, v] of this.board.verts) {
      if (this.bld[k] || this.occupied(k)) continue;
      if ([...v.nbrs].some(n => this.bld[n])) continue;
      if (!setup && !v.edges.some(e => this.roads[e] === idx)) continue;
      out.push(k);
    }
    return out;
  }
  connected(idx, vk) {
    const b = this.bld[vk];
    if (b) return b.o === idx;
    return this.board.verts.get(vk).edges.some(e => this.roads[e] === idx);
  }
  legalRoad(idx) {
    const out = [];
    if (this.phase === 'setup') {
      const v = this.board.verts.get(this.setup.last);
      return v.edges.filter(e => !this.roads[e]);
    }
    for (const [k, e] of this.board.edges) {
      if (this.roads[k] !== undefined) continue;
      if (this.connected(idx, e.a) || this.connected(idx, e.b)) out.push(k);
    }
    return out;
  }
  legalCity(idx) { return Object.keys(this.bld).filter(k => this.bld[k].o === idx && this.bld[k].t === 1); }
  robberTargets(idx) {
    const out = [];
    for (const h of this.board.hexes) {
      if (h.id === this.robber) continue;
      if (this.cfg.friendlyRobber) {
        const owners = this.hexOwners(h.id).filter(o => o !== idx);
        if (owners.length && owners.every(o => this.vp(o, false) <= 2)) continue;
      }
      out.push(h.id);
    }
    return out;
  }
  hexOwners(hid) {
    const s = new Set();
    this.board.hexes[hid].corners.forEach(c => { if (this.bld[c]) s.add(this.bld[c].o); });
    return [...s];
  }
  bankRatio(idx, res) {
    let r = 4;
    for (const k in this.bld) {
      if (this.bld[k].o !== idx) continue;
      const t = this.board.portAt[k];
      if (t === 'any') r = Math.min(r, 3);
      else if (t === res) r = Math.min(r, 2);
    }
    return r;
  }

  // ---------- awards ----------
  roadLen(idx) {
    const adj = {};
    for (const e in this.roads) {
      if (this.roads[e] !== idx) continue;
      const E = this.board.edges.get(e);
      (adj[E.a] = adj[E.a] || []).push([e, E.b]);
      (adj[E.b] = adj[E.b] || []).push([e, E.a]);
    }
    let best = 0;
    const dfs = (v, used, len) => {
      if (len > best) best = len;
      if (len > 0 && this.blockedFor(v, idx)) return;
      for (const [e, w] of adj[v] || []) if (!used.has(e)) { used.add(e); dfs(w, used, len + 1); used.delete(e); }
    };
    Object.keys(adj).forEach(v => dfs(v, new Set(), 0));
    return best;
  }
  updateAwards() {
    const lens = this.players.map((p, i) => (p.roadLen = this.roadLen(i)));
    const max = Math.max(...lens);
    const prev = this.longest;
    if (max >= 5) {
      const top = lens.map((l, i) => (l === max ? i : -1)).filter(i => i >= 0);
      if (top.length === 1) this.longest = top[0];
      else if (!top.includes(this.longest)) this.longest = -1;
    } else this.longest = -1;
    if (this.longest !== prev && this.longest >= 0) this.log(`${this.nm(this.longest)} takes Longest Road (${max}).`, 'award');
    const prevA = this.army;
    this.players.forEach((p, i) => {
      if (p.knights >= 3 && (this.army < 0 || p.knights > this.players[this.army].knights)) this.army = i;
    });
    if (this.army !== prevA) this.log(`${this.nm(this.army)} takes Largest Army.`, 'award');
  }
  checkWin() {
    if (this.phase === 'ended') return;
    const i = this.turn;
    if (this.vp(i, true) >= this.cfg.vp) {
      this.phase = 'ended'; this.winner = i; this.endTime = Date.now(); this.offer = null;
      this.log(`${this.nm(i)} wins the game with ${this.vp(i, true)} victory points!`, 'win');
    }
  }

  // ---------- actions ----------
  act(idx, a) {
    if (this.phase === 'ended') return 'Game is over';
    const err = this._act(idx, a);
    if (!err) { this.updateAwards(); this.checkWin(); this.ver++; }
    return err || null;
  }

  _act(idx, a) {
    const p = this.players[idx];
    if (!p) return 'Spectators cannot act';
    const cur = idx === this.turn;
    switch (a.type) {
      case 'settlement': return this.doSettlement(idx, a.at);
      case 'road': return this.doRoad(idx, a.at);
      case 'city': return this.doCity(idx, a.at);
      case 'roll': {
        if (!cur || this.phase !== 'roll') return 'You cannot roll now';
        const d1 = 1 + rnd(6), d2 = 1 + rnd(6), s = d1 + d2;
        this.dice = [d1, d2]; this.diceHist[s]++;
        this.log(`${p.name} rolled ${d1} + ${d2} = ${s}`, 'dice');
        if (s === 7) {
          this.pendingDiscard = {};
          this.players.forEach((q, i) => { const t = this.tot(q.res); if (t > this.cfg.discardLimit) this.pendingDiscard[i] = Math.floor(t / 2); });
          this.afterRobber = 'main';
          this.phase = Object.keys(this.pendingDiscard).length ? 'discard' : 'robber';
        } else { this.produce(s); this.phase = 'main'; }
        return null;
      }
      case 'discard': {
        if (this.phase !== 'discard' || !this.pendingDiscard[idx]) return 'You do not need to discard';
        const need = this.pendingDiscard[idx], g = a.res || {};
        let sum = 0;
        for (const k of this.RS) { const v = g[k] | 0; if (v < 0 || v > p.res[k]) return 'Invalid discard'; sum += v; }
        if (sum !== need) return `Discard exactly ${need} cards`;
        for (const k of this.RS) { p.res[k] -= g[k] | 0; this.bank[k] += g[k] | 0; }
        delete this.pendingDiscard[idx];
        this.log(`${p.name} discarded ${need} cards`, 'robber');
        if (!Object.keys(this.pendingDiscard).length) this.phase = this.afterDiscard();
        return null;
      }
      case 'robber': {
        if (!cur || this.phase !== 'robber') return 'You cannot move the robber now';
        if (!this.robberTargets(idx).includes(a.at)) return 'Illegal robber destination';
        this.robber = a.at;
        const h = this.board.hexes[a.at];
        this.log(`${p.name} moved the robber to ${h.terrain}${h.number ? ' ' + h.number : ''}`, 'robber');
        const victims = this.hexOwners(a.at).filter(o => o !== idx && this.tot(this.players[o].res) > 0);
        if (victims.length === 0) this.phase = this.afterRobber;
        else if (victims.length === 1) { this.steal(idx, victims[0]); this.phase = this.afterRobber; }
        else this.phase = 'steal';
        return null;
      }
      case 'steal': {
        if (!cur || this.phase !== 'steal') return 'Nothing to steal now';
        const victims = this.hexOwners(this.robber).filter(o => o !== idx && this.tot(this.players[o].res) > 0);
        if (!victims.includes(a.from)) return 'Cannot steal from that player';
        this.steal(idx, a.from); this.phase = this.afterRobber;
        return null;
      }
      case 'buydev': {
        if (!cur || this.phase !== 'main') return 'Not now';
        if (!this.deck.length) return 'No development cards left';
        if (!this.has(p, COST.dev)) return 'Not enough resources';
        this.pay(p, COST.dev);
        const type = this.deck.pop();
        p.dev.push({ type, bought: this.turnNo });
        p.st.devs++;
        this.log(`${p.name} bought a development card`, 'dev');
        return null;
      }
      case 'play': return this.playDev(idx, a);
      case 'bank': {
        if (!cur || this.phase !== 'main') return 'Not now';
        const { give, get } = a;
        if (!RES.includes(give) || !RES.includes(get) || give === get) return 'Invalid bank trade';
        const r = this.bankRatio(idx, give);
        if (p.res[give] < r) return `You need ${r} ${give}`;
        if (this.bank[get] < 1) return `Bank has no ${get}`;
        p.res[give] -= r; this.bank[give] += r; p.res[get]++; this.bank[get]--;
        p.st.spent += r; p.st.gained++;
        this.log(`${p.name} traded ${r} ${give} for 1 ${get} with the bank`, 'trade');
        return null;
      }
      case 'offer': {
        if (this.phase !== 'main') return 'Trading is only open during the main phase';
        if (!cur) return 'Only the current player can offer';
        return this.makeOffer(idx, a.give, a.get, a.to);
      }
      case 'counter': {
        if (this.phase !== 'main' || !this.offer || this.offer.from !== this.turn || idx === this.turn) return 'Cannot counter';
        return this.makeOffer(idx, a.give, a.get, this.turn);
      }
      case 'respond': {
        const o = this.offer;
        if (!o || o.from === idx) return 'No offer to respond to';
        if (o.to !== null && o.to !== idx) return 'This offer is not for you';
        if (a.accept) {
          if (!this.has(p, o.get)) return 'You cannot afford that';
          o.resp[idx] = 'accept';
          if (o.to === idx) return this.execTrade(o, idx);
        } else {
          o.resp[idx] = 'reject';
          if (o.to === idx) { this.log(`${p.name} rejected the offer`, 'trade'); this.offer = null; }
        }
        return null;
      }
      case 'confirm': {
        const o = this.offer;
        if (!o || o.from !== idx) return 'No offer to confirm';
        if (o.resp[a.with] !== 'accept') return 'That player has not accepted';
        return this.execTrade(o, a.with);
      }
      case 'cancel': {
        if (!this.offer || this.offer.from !== idx) return 'No offer to cancel';
        this.offer = null; return null;
      }
      case 'end': {
        if (!cur || this.phase !== 'main') return 'You cannot end your turn now';
        if (this.freeRoads > 0) return 'Place your free roads first';
        this.offer = null; this.devPlayed = false;
        this.turn = (this.turn + 1) % this.n; this.turnNo++; this.phase = 'roll'; this.dice = null;
        return null;
      }
    }
    return 'Unknown action';
  }

  doSettlement(idx, at) {
    const p = this.players[idx], setup = this.phase === 'setup';
    if (idx !== this.turn) return 'Not your turn';
    if (setup) { if (this.setup.sub !== 'settlement') return 'Place a road'; }
    else {
      if (this.phase !== 'main') return 'Not now';
      if (this.freeRoads > 0) return 'Place your free roads first';
      if (!this.has(p, COST.settlement)) return 'Not enough resources';
      if (this.count(idx, 'settlement') >= LIMITS.settlement) return 'No settlements left';
    }
    if (!this.legalSettle(idx, setup).includes(at)) return 'Illegal settlement location';
    if (!setup) this.pay(p, COST.settlement);
    this.bld[at] = { o: idx, t: 1 };
    p.st.settlements++;
    this.log(`${p.name} built a settlement`, 'build');
    if (setup) {
      this.setup.sub = 'road'; this.setup.last = at;
      if (this.setup.i >= this.n) {
        const got = [];
        this.board.verts.get(at).hexes.forEach(h => {
          const r = TERR_RES[this.board.hexes[h].terrain];
          if (r && this.bank[r] > 0) { p.res[r]++; this.bank[r]--; p.st.gained++; got.push(r); }
        });
        if (got.length) this.log(`${p.name} received ${got.join(', ')}`, 'prod');
      }
    }
    return null;
  }
  doRoad(idx, at) {
    const p = this.players[idx];
    if (idx !== this.turn) return 'Not your turn';
    const setup = this.phase === 'setup', free = this.freeRoads > 0;
    if (setup) { if (this.setup.sub !== 'road') return 'Place a settlement'; }
    else {
      if (this.phase !== 'main') return 'Not now';
      if (!free && !this.has(p, COST.road)) return 'Not enough resources';
      if (this.count(idx, 'road') >= LIMITS.road) return 'No roads left';
    }
    if (!this.legalRoad(idx).includes(at)) return 'Illegal road location';
    if (!setup && !free) this.pay(p, COST.road);
    this.roads[at] = idx; p.st.roads++;
    this.log(`${p.name} built a road`, 'build');
    if (setup) {
      this.setup.i++; this.setup.sub = 'settlement'; this.setup.last = null;
      if (this.setup.i >= this.setup.order.length) { this.phase = 'roll'; this.turn = 0; this.turnNo = 1; }
      else this.turn = this.setup.order[this.setup.i];
    } else if (free) {
      this.freeRoads--;
      if (this.freeRoads > 0 && (!this.legalRoad(idx).length || this.count(idx, 'road') >= LIMITS.road)) this.freeRoads = 0;
    }
    return null;
  }
  doCity(idx, at) {
    const p = this.players[idx];
    if (idx !== this.turn || this.phase !== 'main') return 'Not now';
    if (this.freeRoads > 0) return 'Place your free roads first';
    if (!this.has(p, COST.city)) return 'Not enough resources';
    if (this.count(idx, 'city') >= LIMITS.city) return 'No cities left';
    if (!this.legalCity(idx).includes(at)) return 'You can only upgrade your own settlement';
    this.pay(p, COST.city);
    this.bld[at].t = 2; p.st.cities++;
    this.log(`${p.name} upgraded a settlement to a city`, 'build');
    return null;
  }

  produce(s) {
    const want = {};
    this.board.hexes.forEach(h => {
      if (h.number !== s || h.id === this.robber) return;
      const r = TERR_RES[h.terrain];
      h.corners.forEach(c => {
        const b = this.bld[c];
        if (!b) return;
        (want[r] = want[r] || {})[b.o] = (want[r][b.o] || 0) + b.t;
      });
    });
    const parts = {};
    for (const r in want) {
      const who = Object.keys(want[r]), sum = who.reduce((a, o) => a + want[r][o], 0);
      if (sum <= this.bank[r]) who.forEach(o => this.give(o, r, want[r][o], parts));
      else if (who.length === 1) this.give(who[0], r, this.bank[r], parts);
      else this.log(`Bank cannot supply enough ${r}; nobody receives it`, 'prod');
    }
    const msgs = Object.keys(parts).map(o => `${this.nm(o)} +${Object.entries(parts[o]).map(([r, n]) => n + ' ' + r).join(', ')}`);
    this.log(msgs.length ? 'Production: ' + msgs.join(' · ') : 'No resources produced', 'prod');
  }
  give(o, r, n, parts) {
    if (n <= 0) return;
    this.players[o].res[r] += n; this.bank[r] -= n; this.players[o].st.gained += n;
    (parts[o] = parts[o] || {})[r] = n;
  }
  steal(thief, victim) {
    const v = this.players[victim], pool = [];
    this.RS.forEach(r => { for (let i = 0; i < v.res[r]; i++) pool.push(r); });
    if (!pool.length) return;
    const r = pool[rnd(pool.length)];
    v.res[r]--; this.players[thief].res[r]++;
    this.players[thief].lastSteal = r;
    this.log(`${this.nm(thief)} stole a card from ${this.nm(victim)}`, 'robber');
  }

  playDev(idx, a) {
    const p = this.players[idx];
    if (idx !== this.turn) return 'Not your turn';
    if (this.devPlayed) return 'Only one development card per turn';
    const ok = this.phase === 'main' || (this.phase === 'roll' && a.card === 'knight');
    if (!ok) return 'Not now';
    if (this.freeRoads > 0) return 'Place your free roads first';
    const ci = p.dev.findIndex(d => d.type === a.card && d.bought < this.turnNo);
    if (ci < 0 || a.card === 'vp') return 'You cannot play that card';
    if (a.card === 'yearofplenty') {
      const [x, y] = [a.r1, a.r2];
      if (!RES.includes(x) || !RES.includes(y)) return 'Choose two resources';
      const need = {}; need[x] = (need[x] || 0) + 1; need[y] = (need[y] || 0) + 1;
      if (Object.keys(need).some(k => this.bank[k] < need[k])) return 'Bank does not have those resources';
      p.dev.splice(ci, 1); this.devPlayed = true;
      p.res[x]++; p.res[y]++; this.bank[x]--; this.bank[y]--; p.st.gained += 2;
      this.log(`${p.name} played Year of Plenty (${x}, ${y})`, 'dev');
    } else if (a.card === 'monopoly') {
      if (!RES.includes(a.r1)) return 'Choose a resource';
      p.dev.splice(ci, 1); this.devPlayed = true;
      let got = 0;
      this.players.forEach((q, i) => { if (i !== idx) { got += q.res[a.r1]; q.res[a.r1] = 0; } });
      p.res[a.r1] += got; p.st.gained += got;
      this.log(`${p.name} played Monopoly on ${a.r1} and took ${got}`, 'dev');
    } else if (a.card === 'roadbuilding') {
      if (!this.legalRoad(idx).length || this.count(idx, 'road') >= LIMITS.road) return 'No legal road placements';
      p.dev.splice(ci, 1); this.devPlayed = true;
      this.freeRoads = Math.min(2, LIMITS.road - this.count(idx, 'road'));
      this.log(`${p.name} played Road Building`, 'dev');
    } else if (a.card === 'knight') {
      p.dev.splice(ci, 1); this.devPlayed = true; p.knights++;
      this.afterRobber = this.phase; this.phase = 'robber';
      this.log(`${p.name} played a Knight`, 'dev');
    } else return 'Unknown card';
    return null;
  }

  makeOffer(idx, give, get, to) {
    const p = this.players[idx];
    const clean = o => { const r = {}; this.RS.forEach(k => { const v = (o && o[k]) | 0; if (v < 0) throw 0; if (v) r[k] = v; }); return r; };
    let g, w;
    try { g = clean(give); w = clean(get); } catch (e) { return 'Invalid offer'; }
    if (!this.tot(g) || !this.tot(w)) return 'Offer something and request something';
    if (this.RS.some(k => g[k] && w[k])) return 'Cannot offer and request the same resource';
    if (!this.has(p, g)) return 'You do not have those resources';
    if (to !== null && to !== undefined && (to === idx || !this.players[to])) return 'Invalid recipient';
    this.offer = { id: ++this.offerSeq, from: idx, give: g, get: w, to: to === undefined ? null : to, resp: {} };
    this.log(`${p.name} offers ${fmt(g)} for ${fmt(w)}${this.offer.to !== null ? ' to ' + this.nm(this.offer.to) : ''}`, 'trade');
    return null;
  }
  execTrade(o, other) {
    const a = this.players[o.from], b = this.players[other];
    if (!this.has(a, o.give) || !this.has(b, o.get)) { this.offer = null; return 'Trade no longer possible'; }
    for (const k in o.give) { a.res[k] -= o.give[k]; b.res[k] += o.give[k]; }
    for (const k in o.get) { b.res[k] -= o.get[k]; a.res[k] += o.get[k]; }
    this.log(`${a.name} traded ${fmt(o.give)} for ${fmt(o.get)} with ${b.name}`, 'trade');
    this.offer = null;
    return null;
  }

  // ---------- views ----------
  boardPublic() {
    const B = this.board;
    return {
      hexes: B.hexes.map(h => ({ id: h.id, terrain: h.terrain, number: h.number, cx: h.cx, cy: h.cy, corners: h.corners })),
      verts: Object.fromEntries([...B.verts].map(([k, v]) => [k, { x: v.x, y: v.y }])),
      edges: [...B.edges.values()].map(e => ({ key: e.key, a: e.a, b: e.b })),
      ports: B.ports,
    };
  }
  legalFor(idx) {
    const L = { settlement: [], city: [], road: [], robber: [], steal: [] };
    if (idx < 0 || idx !== this.turn) return L;
    const p = this.players[idx];
    if (this.phase === 'setup') {
      if (this.setup.sub === 'settlement') L.settlement = this.legalSettle(idx, true);
      else L.road = this.legalRoad(idx);
    } else if (this.phase === 'main') {
      if (this.freeRoads > 0) L.road = this.legalRoad(idx);
      else {
        if (this.has(p, COST.settlement) && this.count(idx, 'settlement') < LIMITS.settlement) L.settlement = this.legalSettle(idx, false);
        if (this.has(p, COST.city) && this.count(idx, 'city') < LIMITS.city) L.city = this.legalCity(idx);
        if (this.has(p, COST.road) && this.count(idx, 'road') < LIMITS.road) L.road = this.legalRoad(idx);
      }
    } else if (this.phase === 'robber') L.robber = this.robberTargets(idx);
    else if (this.phase === 'steal') L.steal = this.hexOwners(this.robber).filter(o => o !== idx && this.tot(this.players[o].res) > 0);
    return L;
  }
  view(idx) {
    const ended = this.phase === 'ended';
    const B = this.board;
    const ports = {};
    if (idx >= 0) RES.forEach(r => { ports[r] = this.bankRatio(idx, r); });
    return {
      phase: this.phase, turn: this.turn, turnNo: this.turnNo, dice: this.dice, robber: this.robber,
      cfg: this.cfg, me: idx, winner: this.winner, ver: this.ver,
      bld: this.bld, roads: this.roads, bank: this.bank, deckLeft: this.deck.length,
      freeRoads: this.freeRoads, setupSub: this.phase === 'setup' ? this.setup.sub : null,
      players: this.players.map((p, i) => ({
        idx: i, name: p.name, color: p.color, bot: p.bot, connected: p.connected,
        vp: this.vp(i, ended || i === idx), cards: this.tot(p.res), devCount: p.dev.length,
        knights: p.knights, roadLen: p.roadLen, longest: this.longest === i, army: this.army === i,
        pieces: { road: LIMITS.road - this.count(i, 'road'), settlement: LIMITS.settlement - this.count(i, 'settlement'), city: LIMITS.city - this.count(i, 'city') },
      })),
      hand: idx >= 0 ? this.players[idx].res : null,
      devs: idx >= 0 ? this.players[idx].dev.map(d => ({ type: d.type, fresh: d.bought >= this.turnNo })) : [],
      devPlayed: this.devPlayed,
      ratios: ports,
      legal: this.legalFor(idx),
      discard: idx >= 0 ? this.pendingDiscard[idx] || 0 : 0,
      waitingDiscard: Object.keys(this.pendingDiscard).map(Number),
      offer: this.offer,
      log: this.logs.slice(-80),
      stats: ended ? this.finalStats() : null,
    };
  }
  finalStats() {
    return {
      duration: Math.round((this.endTime - this.startTime) / 1000),
      diceHist: this.diceHist, turns: this.turnNo,
      players: this.players.map((p, i) => ({ name: p.name, color: p.color, vp: this.vp(i, true), roadLen: p.roadLen, knights: p.knights, longest: this.longest === i, army: this.army === i, ...p.st })),
    };
  }
}
function fmt(o) { return Object.entries(o).map(([k, v]) => v + ' ' + k).join(' + '); }

module.exports = { Game, RES, COST, total, pip, shuffle, rnd, TERR_RES, LIMITS, buildBoard };

'use strict';
// Cities & Knights style expansion rules, layered on the base engine.
// Original implementation: commodities, an event die, barbarians, knights, city improvements,
// metropolises, city walls and a progress-card deck. Server-authoritative like the base game.
const { Game, RES, shuffle, rnd, LIMITS } = require('./engine');

const COMM = ['cloth', 'coin', 'paper'];
const ALL = [...RES, ...COMM];
const TRACKS = ['trade', 'politics', 'science'];
const TRACK_COM = { trade: 'cloth', politics: 'coin', science: 'paper' };
const GATE = { 4: 'trade', 5: 'politics', 6: 'science' };
const COM_FROM = { forest: 'paper', pasture: 'cloth', mountains: 'coin' }; // a city here yields 1 resource + 1 commodity
const KCOST = { sheep: 1, ore: 1 };
const DECKS = {
  science: { alchemist: 2, crane: 2, engineer: 1, inventor: 2, irrigation: 2, medicine: 2, mining: 2, printer: 1, roadbuilding: 2, smith: 2 },
  trade: { merchantfleet: 4, resmonopoly: 5, trademonopoly: 5, mastermerchant: 4 },
  politics: { bishop: 3, constitution: 1, deserter: 2, intrigue: 2, saboteur: 3, spy: 3, warlord: 2, wedding: 2 },
};
const CARD_TRACK = {};
Object.keys(DECKS).forEach(t => Object.keys(DECKS[t]).forEach(c => { CARD_TRACK[c] = t; }));
const AUTO_VP = ['printer', 'constitution'];
const MAX_PC = 4;

class CKGame extends Game {
  constructor(cfg, plist) {
    super(Object.assign({ vp: 13, barbSteps: 7, progress: true }, cfg), plist);
    this.cfg.ck = true;
    this.cfg.barbSteps = Math.min(12, Math.max(4, this.cfg.barbSteps | 0 || 7));
    this.ck = true; this.RS = ALL;
    COMM.forEach(c => { this.bank[c] = 12; });
    this.players.forEach(p => { COMM.forEach(c => { p.res[c] = 0; }); p.imp = { trade: 0, politics: 0, science: 0 }; p.pc = []; p.xvp = 0; p.st.knightsBuilt = 0; });
    this.deck = [];
    this.kn = {}; this.walls = {};
    this.metro = { trade: null, politics: null, science: null };
    this.barb = { pos: 0, attacks: 0 }; this.robberOn = false; this.lastAttack = null;
    this.pdeck = {};
    TRACKS.forEach(t => {
      const cards = [];
      if (this.cfg.progress !== false) Object.keys(DECKS[t]).forEach(c => { for (let i = 0; i < DECKS[t][c]; i++) cards.push(c); });
      this.pdeck[t] = shuffle(cards);
    });
    this.ev = null; this.fixed = null; this.crane = false; this.fleet = null; this.pendAq = {}; this.multiSteal = false;
    this.desert = this.board.hexes.find(h => h.terrain === 'desert').id;
    this.log(`Cities & Knights rules: barbarians land after ${this.cfg.barbSteps} ships. The robber stays asleep until the first attack.`, 'sys');
  }

  // ---------- hooks ----------
  afterDiscard() { return this.robberOn ? 'robber' : 'main'; }
  occupied(k) { return !!this.kn[k]; }
  blockedFor(v, idx) {
    const b = this.bld[v]; if (b && b.o !== idx) return true;
    const k = this.kn[v]; return !!(k && k.o !== idx);
  }
  connected(idx, vk) {
    const k = this.kn[vk];
    if (k) return k.o === idx && this.board.verts.get(vk).edges.some(e => this.roads[e] === idx);
    return super.connected(idx, vk);
  }
  vp(i, hidden) {
    let v = super.vp(i, hidden);
    v += this.players[i].xvp;
    TRACKS.forEach(t => { if (this.metro[t] && this.metro[t].o === i) v += 2; });
    return v;
  }
  limit(i) { return this.cfg.discardLimit + 2 * this.wallsOf(i); }
  wallsOf(i) { return Object.keys(this.walls).filter(k => this.bld[k] && this.bld[k].o === i).length; }
  knightsOf(i, lvl) { return Object.keys(this.kn).filter(k => this.kn[k].o === i && (!lvl || this.kn[k].lvl === lvl)); }
  defense(i) { return Object.keys(this.kn).reduce((s, k) => s + (this.kn[k].o === i && this.kn[k].active ? this.kn[k].lvl : 0), 0); }
  cities() { return Object.keys(this.bld).filter(k => this.bld[k].t === 2); }
  isMetro(k) { return TRACKS.some(t => this.metro[t] && this.metro[t].at === k); }
  ratio(idx, res) {
    let r = COMM.includes(res) ? (this.players[idx].imp.trade >= 3 ? 2 : 4) : this.bankRatio(idx, res);
    if (this.fleet === res) r = Math.min(r, 2);
    return r;
  }

  // ---------- setup: the second placement is a city ----------
  doSettlement(idx, at) {
    const second = this.phase === 'setup' && this.setup.i >= this.n;
    const e = super.doSettlement(idx, at);
    if (!e && second && this.bld[at]) {
      this.bld[at].t = 2; this.players[idx].st.cities++; this.players[idx].st.settlements--;
      this.log(`${this.nm(idx)}'s second start piece is a city`, 'build');
    }
    return e;
  }

  // ---------- knights: geometry ----------
  knightSpots(idx) {
    const out = [];
    for (const [k, v] of this.board.verts) {
      if (this.bld[k] || this.kn[k]) continue;
      if (v.edges.some(e => this.roads[e] === idx)) out.push(k);
    }
    return out;
  }
  // vertices a knight may move to (empty, or occupied by a weaker enemy knight), travelling on own roads
  moveDests(idx, from) {
    const seen = new Set([from]), q = [from], out = [], me = this.kn[from];
    while (q.length) {
      const v = q.shift();
      for (const e of this.board.verts.get(v).edges) {
        if (this.roads[e] !== idx) continue;
        const E = this.board.edges.get(e), w = E.a === v ? E.b : E.a;
        if (seen.has(w)) continue; seen.add(w);
        const b = this.bld[w], k = this.kn[w];
        if (b && b.o !== idx) continue;               // enemy buildings block the way
        if (k && k.o !== idx) { if (k.lvl < me.lvl) out.push(w); continue; } // enemy knight: can only be displaced, not passed
        if (!b && !k) out.push(w);
        q.push(w);
      }
    }
    return out;
  }
  relocate(k, owner) {
    // an displaced knight steps to an empty neighbouring intersection along its owner's roads, else is lost
    const kn = this.kn[k]; delete this.kn[k];
    for (const e of this.board.verts.get(k).edges) {
      if (this.roads[e] !== owner) continue;
      const E = this.board.edges.get(e), w = E.a === k ? E.b : E.a;
      if (!this.bld[w] && !this.kn[w]) { this.kn[w] = kn; return true; }
    }
    return false;
  }
  adjacentToRobber(idx) {
    const H = this.board.hexes[this.robber];
    return H.corners.filter(c => this.kn[c] && this.kn[c].o === idx && this.kn[c].active);
  }

  // ---------- legal move lists for the client ----------
  upgradable(idx, free) {
    const p = this.players[idx];
    return this.knightsOf(idx).filter(k => {
      const kn = this.kn[k]; if (kn.lvl >= 3) return false;
      if (kn.lvl === 2 && p.imp.politics < 3) return false;
      if (this.knightsOf(idx, kn.lvl + 1).length >= 2) return false;
      return free || this.has(p, KCOST);
    });
  }
  legalFor(idx) {
    const L = super.legalFor(idx);
    Object.assign(L, { kBuild: [], kUp: [], kAct: [], kMove: {}, kChase: [], wall: [], cityNoWall: [], settleOwn: [], kSpots: [], kUpAny: [], oppKn: [], intrigue: [] });
    if (idx < 0 || idx !== this.turn || this.phase !== 'main' || this.freeRoads > 0) return L;
    const p = this.players[idx];
    const spots = this.knightSpots(idx);
    L.kSpots = spots;
    if (this.has(p, KCOST) && this.knightsOf(idx, 1).length < 2) L.kBuild = spots;
    L.kUp = this.upgradable(idx, false); L.kUpAny = this.upgradable(idx, true);
    if (p.res.wheat >= 1) L.kAct = this.knightsOf(idx).filter(k => !this.kn[k].active);
    this.knightsOf(idx).filter(k => this.kn[k].active).forEach(k => { const d = this.moveDests(idx, k); if (d.length) L.kMove[k] = d; });
    if (this.robberOn && this.robber !== this.desert) L.kChase = this.adjacentToRobber(idx);
    const cities = Object.keys(this.bld).filter(k => this.bld[k].o === idx && this.bld[k].t === 2 && !this.walls[k]);
    L.cityNoWall = this.wallsOf(idx) < 3 ? cities : [];
    if (this.has(p, { brick: 2 })) L.wall = L.cityNoWall;
    L.settleOwn = Object.keys(this.bld).filter(k => this.bld[k].o === idx && this.bld[k].t === 1);
    L.oppKn = Object.keys(this.kn).filter(k => this.kn[k].o !== idx);
    L.intrigue = L.oppKn.filter(k => this.board.verts.get(k).edges.some(e => this.roads[e] === idx));
    return L;
  }

  // ---------- progress cards ----------
  drawProgress(idx, track) {
    const d = this.pdeck[track]; if (!d || !d.length) return false;
    const p = this.players[idx], card = d[d.length - 1];
    if (AUTO_VP.includes(card)) {
      d.pop(); p.xvp++; this.log(`${p.name} revealed ${card === 'printer' ? 'Printer' : 'Constitution'}: +1 victory point`, 'award'); return true;
    }
    if (p.pc.length >= MAX_PC) return false;
    d.pop(); p.pc.push({ type: card, track, got: this.turnNo });
    this.log(`${p.name} drew a ${track} progress card`, 'dev');
    return true;
  }
  awardProgress(track, red) {
    this.players.forEach((q, i) => { if (q.imp[track] >= 1 && red <= q.imp[track]) this.drawProgress(i, track); });
  }

  // ---------- barbarians ----------
  attack() {
    const strength = this.cities().length;
    const def = this.players.map((_, i) => this.defense(i)), sum = def.reduce((a, b) => a + b, 0), won = sum >= strength;
    this.barb.attacks++; this.barb.pos = 0; this.robberOn = true;
    this.lastAttack = { strength, defense: sum, won, n: this.barb.attacks, lost: [], hero: -1 };
    this.log(`Barbarians attack! Strength ${strength} vs knights ${sum}: ${won ? 'the island holds' : 'the barbarians win'}`, 'barb');
    if (won) {
      const mx = Math.max(...def), tops = def.map((d, i) => (d === mx && mx > 0 ? i : -1)).filter(i => i >= 0);
      if (tops.length === 1) { this.players[tops[0]].xvp++; this.lastAttack.hero = tops[0]; this.log(`${this.nm(tops[0])} is Defender of the Island: +1 victory point`, 'award'); }
      else tops.forEach(i => { const t = TRACKS[rnd(3)]; this.drawProgress(i, t) || TRACKS.some(x => this.drawProgress(i, x)); this.log(`${this.nm(i)} shares the defence and draws a progress card`, 'barb'); });
    } else {
      const elig = this.players.map((_, i) => i).filter(i => Object.keys(this.bld).some(k => this.bld[k].o === i && this.bld[k].t === 2));
      const min = Math.min(...elig.map(i => def[i]));
      elig.filter(i => def[i] === min).forEach(i => {
        const city = Object.keys(this.bld).filter(k => this.bld[k].o === i && this.bld[k].t === 2 && !this.isMetro(k))[0];
        if (!city) { this.log(`${this.nm(i)}'s cities are metropolises and cannot be plundered`, 'barb'); return; }
        delete this.walls[city];
        if (this.count(i, 'settlement') >= LIMITS.settlement) delete this.bld[city]; else this.bld[city].t = 1;
        this.lastAttack.lost.push(i);
        this.log(`${this.nm(i)} loses a city to the barbarians`, 'barb');
      });
    }
    Object.keys(this.kn).forEach(k => { this.kn[k].active = false; });
  }

  // ---------- metropolises ----------
  checkMetro(idx, t) {
    const L = this.players[idx].imp[t], m = this.metro[t];
    if (L < 4) return;
    const cities = Object.keys(this.bld).filter(k => this.bld[k].o === idx && this.bld[k].t === 2 && !this.isMetro(k));
    if (!cities.length) return;
    const pickCity = () => cities.slice().sort((a, b) => this.cityValue(b) - this.cityValue(a))[0];
    if (!m) { this.metro[t] = { o: idx, at: pickCity() }; this.log(`${this.nm(idx)} founds the ${t} metropolis (+2 victory points)`, 'award'); }
    else if (m.o !== idx && L === 5 && this.players[m.o].imp[t] < 5) { this.metro[t] = { o: idx, at: pickCity() }; this.log(`${this.nm(idx)} takes the ${t} metropolis from ${this.nm(m.o)}`, 'award'); }
  }
  cityValue(k) { return this.board.verts.get(k).hexes.reduce((s, h) => s + (6 - Math.abs(7 - this.board.hexes[h].number)), 0); }

  // ---------- production ----------
  produce(s) {
    const want = {};
    const add = (r, o, n) => { (want[r] = want[r] || {})[o] = (want[r][o] || 0) + n; };
    this.board.hexes.forEach(h => {
      if (h.number !== s || h.id === this.robber) return;
      const r = { forest: 'wood', hills: 'brick', pasture: 'sheep', fields: 'wheat', mountains: 'ore' }[h.terrain];
      h.corners.forEach(c => {
        const b = this.bld[c]; if (!b) return;
        if (b.t === 1) add(r, b.o, 1);
        else if (COM_FROM[h.terrain]) { add(r, b.o, 1); add(COM_FROM[h.terrain], b.o, 1); }
        else add(r, b.o, 2);
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
    this.players.forEach((p, i) => { if (p.imp.science >= 3 && !parts[i] && this.cities().length) { this.pendAq[i] = 1; this.log(`${p.name}'s aqueduct provides a free resource`, 'prod'); } });
  }
  resolveAq() {
    Object.keys(this.pendAq).map(Number).forEach(i => {
      const p = this.players[i], need = RES.filter(r => this.bank[r] > 0).sort((a, b) => p.res[a] - p.res[b])[0];
      if (need) { p.res[need]++; this.bank[need]--; p.st.gained++; }
      delete this.pendAq[i];
    });
  }

  // ---------- actions ----------
  _act(idx, a) {
    const p = this.players[idx];
    if (!p) return 'Spectators cannot act';
    const cur = idx === this.turn, main = cur && this.phase === 'main' && !(this.freeRoads > 0);
    switch (a.type) {
      case 'roll': return this.doRoll(idx);
      case 'buydev': return 'This mode uses progress cards instead of development cards';
      case 'play': return 'Play progress cards instead';
      case 'bank': return this.doBank(idx, a);
      case 'robber': return this.doRobber(idx, a);
      case 'aqueduct': {
        if (!this.pendAq[idx]) return 'No aqueduct bonus waiting';
        if (!RES.includes(a.res) || this.bank[a.res] < 1) return 'Choose an available resource';
        p.res[a.res]++; this.bank[a.res]--; p.st.gained++; delete this.pendAq[idx];
        this.log(`${p.name} takes ${a.res} from the aqueduct`, 'prod'); return null;
      }
      case 'kbuild': {
        if (!main) return 'Not now';
        if (!this.has(p, KCOST)) return 'A knight costs 1 sheep and 1 ore';
        if (this.knightsOf(idx, 1).length >= 2) return 'You have no basic knights left';
        if (!this.knightSpots(idx).includes(a.at)) return 'A knight must sit on an empty intersection connected to your roads';
        this.pay(p, KCOST); this.kn[a.at] = { o: idx, lvl: 1, active: false }; p.st.knightsBuilt++;
        this.log(`${p.name} recruits a knight`, 'build'); return null;
      }
      case 'kup': {
        if (!main) return 'Not now';
        const kn = this.kn[a.at]; if (!kn || kn.o !== idx) return 'Pick one of your knights';
        if (!this.upgradable(idx, true).includes(a.at)) return kn.lvl >= 3 ? 'Already a mighty knight' : kn.lvl === 2 && p.imp.politics < 3 ? 'Mighty knights need Politics level 3 (fortress)' : 'No knights of that level left';
        if (!this.has(p, KCOST)) return 'Promotion costs 1 sheep and 1 ore';
        this.pay(p, KCOST); kn.lvl++; this.log(`${p.name} promotes a knight to ${['', 'basic', 'strong', 'mighty'][kn.lvl]}`, 'build'); return null;
      }
      case 'kact': {
        if (!main) return 'Not now';
        const kn = this.kn[a.at]; if (!kn || kn.o !== idx) return 'Pick one of your knights';
        if (kn.active) return 'Already active';
        if (p.res.wheat < 1) return 'Activating costs 1 wheat';
        this.pay(p, { wheat: 1 }); kn.active = true; this.log(`${p.name} activates a knight`, 'build'); return null;
      }
      case 'kmove': {
        if (!main) return 'Not now';
        const kn = this.kn[a.from]; if (!kn || kn.o !== idx) return 'Pick one of your knights';
        if (!kn.active) return 'Only active knights can act';
        if (!this.moveDests(idx, a.from).includes(a.to)) return 'That knight cannot go there';
        const tgt = this.kn[a.to];
        delete this.kn[a.from];
        if (tgt) {
          const kept = this.relocate(a.to, tgt.o);
          this.log(`${p.name}'s knight drives off a knight of ${this.nm(tgt.o)}${kept ? '' : ' (it is lost)'}`, 'barb');
        }
        this.kn[a.to] = { o: idx, lvl: kn.lvl, active: false };
        if (!tgt) this.log(`${p.name} moves a knight`, 'build');
        return null;
      }
      case 'kchase': {
        if (!main) return 'Not now';
        if (!this.robberOn || this.robber === this.desert) return 'No robber to chase away';
        const kn = this.kn[a.at];
        if (!kn || kn.o !== idx || !kn.active || !this.adjacentToRobber(idx).includes(a.at)) return 'Needs an active knight next to the robber';
        kn.active = false; this.robber = this.desert; this.log(`${p.name}'s knight chases the robber away`, 'robber'); return null;
      }
      case 'improve': {
        if (!main) return 'Not now';
        const t = a.track; if (!TRACKS.includes(t)) return 'Unknown improvement track';
        const lvl = p.imp[t]; if (lvl >= 5) return 'That track is complete';
        if (!Object.keys(this.bld).some(k => this.bld[k].o === idx && this.bld[k].t === 2)) return 'You need a city to improve';
        const com = TRACK_COM[t]; let cost = lvl + 1; if (this.crane) cost = Math.max(0, cost - 1);
        if (p.res[com] < cost) return `You need ${cost} ${com}`;
        if (cost) this.pay(p, { [com]: cost });
        this.crane = false; p.imp[t] = lvl + 1;
        this.log(`${p.name} improves ${t} to level ${lvl + 1}`, 'build');
        this.checkMetro(idx, t); return null;
      }
      case 'wall': {
        if (!main) return 'Not now';
        if (!this.legalFor(idx).wall.includes(a.at)) return 'Walls need 2 brick, an unwalled city of yours and fewer than 3 walls';
        this.pay(p, { brick: 2 }); this.walls[a.at] = 1; this.log(`${p.name} builds a city wall (+2 hand size)`, 'build'); return null;
      }
      case 'pplay': return this.playProgress(idx, a);
      case 'end': {
        const e = super._act(idx, a);
        if (!e) { this.crane = false; this.fleet = null; this.fixed = null; this.resolveAq(); }
        return e;
      }
      default: return super._act(idx, a);
    }
  }

  doRoll(idx) {
    const p = this.players[idx];
    if (idx !== this.turn || this.phase !== 'roll') return 'You cannot roll now';
    let y, r;
    if (this.fixed) { [y, r] = this.fixed; this.fixed = null; } else { y = 1 + rnd(6); r = 1 + rnd(6); }
    const e = 1 + rnd(6), ev = e <= 3 ? 'ship' : GATE[e], s = y + r;
    this.dice = [y, r]; this.ev = ev; this.diceHist[s]++;
    this.log(`${p.name} rolled ${y} + ${r} = ${s} (event: ${ev === 'ship' ? 'barbarian ship' : ev + ' gate'})`, 'dice');
    if (ev === 'ship') { this.barb.pos++; if (this.barb.pos >= this.cfg.barbSteps) this.attack(); }
    else if (this.cfg.progress !== false) this.awardProgress(ev, r);
    if (s === 7) {
      this.pendingDiscard = {};
      this.players.forEach((q, i) => { const t = this.tot(q.res); if (t > this.limit(i)) this.pendingDiscard[i] = Math.floor(t / 2); });
      this.afterRobber = 'main';
      this.phase = Object.keys(this.pendingDiscard).length ? 'discard' : this.afterDiscard();
    } else { this.produce(s); this.phase = 'main'; }
    return null;
  }

  doBank(idx, a) {
    if (idx !== this.turn || this.phase !== 'main') return 'Not now';
    const p = this.players[idx], { give, get } = a;
    if (!ALL.includes(give) || !ALL.includes(get) || give === get) return 'Invalid bank trade';
    const r = this.ratio(idx, give);
    if (p.res[give] < r) return `You need ${r} ${give}`;
    if (this.bank[get] < 1) return `Bank has no ${get}`;
    p.res[give] -= r; this.bank[give] += r; p.res[get]++; this.bank[get]--; p.st.spent += r; p.st.gained++;
    this.log(`${p.name} traded ${r} ${give} for 1 ${get} with the bank`, 'trade'); return null;
  }

  doRobber(idx, a) {
    const p = this.players[idx];
    if (idx !== this.turn || this.phase !== 'robber') return 'You cannot move the robber now';
    if (!this.robberTargets(idx).includes(a.at)) return 'Illegal robber destination';
    this.robber = a.at;
    const h = this.board.hexes[a.at];
    this.log(`${p.name} moved the robber to ${h.terrain}${h.number ? ' ' + h.number : ''}`, 'robber');
    const victims = this.hexOwners(a.at).filter(o => o !== idx && this.tot(this.players[o].res) > 0);
    if (this.multiSteal) { this.multiSteal = false; victims.forEach(v => this.steal(idx, v)); this.phase = this.afterRobber; }
    else if (victims.length === 0) this.phase = this.afterRobber;
    else if (victims.length === 1) { this.steal(idx, victims[0]); this.phase = this.afterRobber; }
    else this.phase = 'steal';
    return null;
  }

  // ---------- progress card effects ----------
  takeRandom(from, to, n) {
    const f = this.players[from], t = this.players[to], pool = [];
    ALL.forEach(r => { for (let i = 0; i < f.res[r]; i++) pool.push(r); });
    let got = 0;
    for (let i = 0; i < n && pool.length; i++) { const r = pool.splice(rnd(pool.length), 1)[0]; f.res[r]--; t.res[r]++; got++; }
    return got;
  }
  discardRandom(i, n) {
    const q = this.players[i], pool = [];
    ALL.forEach(r => { for (let k = 0; k < q.res[r]; k++) pool.push(r); });
    for (let k = 0; k < n && pool.length; k++) { const r = pool.splice(rnd(pool.length), 1)[0]; q.res[r]--; this.bank[r]++; }
  }
  playProgress(idx, a) {
    const p = this.players[idx];
    if (idx !== this.turn) return 'Not your turn';
    const ci = p.pc.findIndex(c => c.type === a.card);
    if (ci < 0) return 'You do not hold that card';
    const card = a.card, ph = this.phase;
    if (this.freeRoads > 0) return 'Place your free roads first';
    if (card === 'alchemist') { if (ph !== 'roll') return 'Play the Alchemist before rolling'; }
    else if (ph !== 'main') return 'Play progress cards during your main phase';
    const others = this.players.map((_, i) => i).filter(i => i !== idx);
    const spend = () => { p.pc.splice(ci, 1); this.log(`${p.name} plays ${card}`, 'dev'); };
    switch (card) {
      case 'alchemist': {
        const y = a.y | 0, r = a.r | 0;
        if (y < 1 || y > 6 || r < 1 || r > 6) return 'Choose two dice values from 1 to 6';
        spend(); this.fixed = [y, r]; return null;
      }
      case 'crane': spend(); this.crane = true; return null;
      case 'engineer': {
        if (!this.legalFor(idx).cityNoWall.includes(a.at)) return 'Pick one of your unwalled cities';
        spend(); this.walls[a.at] = 1; return null;
      }
      case 'inventor': {
        const h1 = this.board.hexes[a.h1], h2 = this.board.hexes[a.h2];
        if (!h1 || !h2 || h1 === h2) return 'Pick two different hexes';
        if ([0, 2, 6, 8, 12].includes(h1.number) || [0, 2, 6, 8, 12].includes(h2.number)) return 'The 2, 6, 8, 12 and desert cannot be swapped';
        spend(); const t = h1.number; h1.number = h2.number; h2.number = t; return null;
      }
      case 'irrigation': case 'mining': {
        const terr = card === 'irrigation' ? 'fields' : 'mountains', res = card === 'irrigation' ? 'wheat' : 'ore';
        const hs = new Set(); Object.keys(this.bld).forEach(k => { if (this.bld[k].o === idx) this.board.verts.get(k).hexes.forEach(h => { if (this.board.hexes[h].terrain === terr) hs.add(h); }); });
        spend(); const n = Math.min(2 * hs.size, this.bank[res]); p.res[res] += n; this.bank[res] -= n; p.st.gained += n;
        this.log(`${p.name} gains ${n} ${res}`, 'prod'); return null;
      }
      case 'medicine': {
        if (!this.legalFor(idx).settleOwn.includes(a.at)) return 'Pick one of your settlements';
        if (!this.has(p, { wheat: 2, ore: 1 })) return 'Medicine needs 2 wheat and 1 ore';
        if (this.count(idx, 'city') >= LIMITS.city) return 'No cities left';
        spend(); this.pay(p, { wheat: 2, ore: 1 }); this.bld[a.at].t = 2; p.st.cities++; return null;
      }
      case 'roadbuilding': {
        if (!this.legalRoad(idx).length || this.count(idx, 'road') >= LIMITS.road) return 'No legal road placements';
        spend(); this.freeRoads = Math.min(2, LIMITS.road - this.count(idx, 'road')); return null;
      }
      case 'smith': {
        const picks = [a.at1, a.at2].filter(Boolean);
        if (!picks.length) return 'Pick a knight to promote';
        const sim = JSON.parse(JSON.stringify(this.kn));
        for (const k of picks) {
          const kn = sim[k];
          if (!kn || kn.o !== idx || kn.lvl >= 3 || (kn.lvl === 2 && p.imp.politics < 3)) return 'That knight cannot be promoted';
          if (Object.keys(sim).filter(x => sim[x].o === idx && sim[x].lvl === kn.lvl + 1).length >= 2) return 'No knights of that level left';
          kn.lvl++;
        }
        spend(); picks.forEach(k => { this.kn[k].lvl++; }); return null;
      }
      case 'merchantfleet': {
        if (!ALL.includes(a.res)) return 'Choose a resource or commodity';
        spend(); this.fleet = a.res; return null;
      }
      case 'resmonopoly': {
        if (!RES.includes(a.res)) return 'Choose a resource';
        spend(); let got = 0; others.forEach(i => { const n = Math.min(2, this.players[i].res[a.res]); this.players[i].res[a.res] -= n; got += n; }); p.res[a.res] += got;
        this.log(`${p.name} takes ${got} ${a.res}`, 'dev'); return null;
      }
      case 'trademonopoly': {
        if (!COMM.includes(a.res)) return 'Choose a commodity';
        spend(); let got = 0; others.forEach(i => { const n = Math.min(1, this.players[i].res[a.res]); this.players[i].res[a.res] -= n; got += n; }); p.res[a.res] += got;
        this.log(`${p.name} takes ${got} ${a.res}`, 'dev'); return null;
      }
      case 'mastermerchant': {
        if (!others.includes(a.from) || this.vp(a.from, false) <= this.vp(idx, false)) return 'Choose a player with more victory points';
        spend(); this.takeRandom(a.from, idx, 2); return null;
      }
      case 'bishop': {
        if (!this.robberOn) return 'The robber has not awakened yet (wait for the first barbarian attack)';
        spend(); this.multiSteal = true; this.afterRobber = 'main'; this.phase = 'robber'; return null;
      }
      case 'deserter': {
        const kn = this.kn[a.at];
        if (!kn || kn.o === idx) return 'Pick an enemy knight';
        if (!this.knightSpots(idx).includes(a.to)) return 'Place your new knight on an empty intersection connected to your roads';
        if (this.knightsOf(idx, kn.lvl).length >= 2) return 'You have no knights of that level left';
        spend(); delete this.kn[a.at]; this.kn[a.to] = { o: idx, lvl: kn.lvl, active: false }; return null;
      }
      case 'intrigue': {
        const kn = this.kn[a.at];
        if (!kn || kn.o === idx || !this.board.verts.get(a.at).edges.some(e => this.roads[e] === idx)) return 'Pick an enemy knight touching your road';
        spend(); this.relocate(a.at, kn.o); return null;
      }
      case 'saboteur': {
        spend(); others.forEach(i => { if (this.vp(i, false) >= this.vp(idx, false)) this.discardRandom(i, Math.floor(this.tot(this.players[i].res) / 2)); }); return null;
      }
      case 'spy': {
        if (!others.includes(a.from) || !this.players[a.from].pc.length) return 'Choose a player who holds progress cards';
        const f = this.players[a.from], c = f.pc.splice(rnd(f.pc.length), 1)[0];
        if (p.pc.length - 1 >= MAX_PC) { f.pc.push(c); return 'Your hand of progress cards is full'; }
        spend(); p.pc.push(c); return null;
      }
      case 'warlord': {
        const ks = this.knightsOf(idx); if (!ks.some(k => !this.kn[k].active)) return 'You have no inactive knights';
        spend(); ks.forEach(k => { this.kn[k].active = true; }); return null;
      }
      case 'wedding': {
        spend(); others.forEach(i => { if (this.vp(i, false) > this.vp(idx, false)) this.takeRandom(i, idx, 2); }); return null;
      }
    }
    return 'Unknown progress card';
  }

  // ---------- views ----------
  view(idx) {
    const v = super.view(idx);
    const strength = this.cities().length, def = this.players.map((_, i) => this.defense(i));
    v.ck = true;
    v.nums = this.board.hexes.map(h => h.number);
    v.ratios = {}; if (idx >= 0) ALL.forEach(r => { v.ratios[r] = this.ratio(idx, r); });
    v.kn = this.kn; v.walls = this.walls; v.metro = this.metro; v.ev = this.ev;
    v.barb = { pos: this.barb.pos, steps: this.cfg.barbSteps, attacks: this.barb.attacks, strength, defense: def.reduce((a, b) => a + b, 0), robberOn: this.robberOn, last: this.lastAttack };
    v.desert = this.desert; v.crane = this.crane; v.fleet = this.fleet; v.fixed = !!this.fixed;
    v.pc = idx >= 0 ? this.players[idx].pc.map(c => ({ type: c.type, track: c.track })) : [];
    v.pdeck = Object.fromEntries(TRACKS.map(t => [t, this.pdeck[t].length]));
    v.aq = idx >= 0 ? !!this.pendAq[idx] : false;
    v.limit = idx >= 0 ? this.limit(idx) : this.cfg.discardLimit;
    v.players.forEach((q, i) => {
      const P = this.players[i];
      q.imp = P.imp; q.pcCount = P.pc.length; q.xvp = P.xvp; q.walls = this.wallsOf(i); q.def = def[i];
      q.kn = { 1: this.knightsOf(i, 1).length, 2: this.knightsOf(i, 2).length, 3: this.knightsOf(i, 3).length, active: this.knightsOf(i).filter(k => this.kn[k].active).length };
      q.metros = TRACKS.filter(t => this.metro[t] && this.metro[t].o === i);
    });
    return v;
  }
  finalStats() {
    const s = super.finalStats();
    s.players.forEach((q, i) => { const P = this.players[i]; q.imp = P.imp; q.knightsBuilt = P.st.knightsBuilt; q.metros = TRACKS.filter(t => this.metro[t] && this.metro[t].o === i).length; q.xvp = P.xvp; });
    s.attacks = this.barb.attacks;
    return s;
  }
}

module.exports = { CKGame, COMM, ALL, TRACKS, TRACK_COM, DECKS, CARD_TRACK, KCOST };

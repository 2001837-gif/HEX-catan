'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
let WebSocketServer;
try { ({ WebSocketServer } = require('ws')); } catch (e) { ({ WebSocketServer } = require('./ws-lite')); } // dependency-free fallback
const { Game } = require('./engine');
const { CKGame } = require('./ck');
const { botAction, pendingActors } = require('./bot');

const PORT = process.env.PORT || 3000;
const PUB = path.join(__dirname, '..', 'public');
const COLORS = ['red', 'blue', 'orange', 'white', 'green', 'purple'];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };

// Mode presets. Every mode sets its own rule configuration.
const MODES = {
  beginner: { label: 'Beginner', max: 4, vp: 10, timer: 0, map: 'classic', fillBots: 3, diff: 'easy', discard: 7 },
  duel: { label: '1v1', max: 2, vp: 10, timer: 90, map: 'classic', discard: 7 },
  classic4: { label: '4 Player', max: 4, vp: 10, timer: 120, map: 'classic', discard: 7 },
  shuffle: { label: 'Shuffle', max: 4, vp: 10, timer: 120, map: 'shuffle', discard: 7 },
  bots: { label: 'Bot Game', max: 4, vp: 10, timer: 0, map: 'classic', fillBots: 3, diff: 'medium', discard: 7 },
  casual: { label: 'Casual', max: 4, vp: 10, timer: 90, map: 'classic', discard: 7, friendly: true },
  rush: { label: 'Rush', max: 4, vp: 8, timer: 30, map: 'shuffle', discard: 7 },
  custom: { label: 'Custom', max: 4, vp: 10, timer: 0, map: 'classic', discard: 7 },
  big: { label: 'Big Island', max: 4, vp: 12, timer: 0, map: 'shuffle', discard: 7, size: 'large' },
  ck: { label: 'Cities & Knights', max: 4, vp: 13, timer: 0, map: 'classic', discard: 7, ck: true, size: 'standard', barb: 7 },
  ckbots: { label: 'C&K vs Bots', max: 4, vp: 13, timer: 0, map: 'classic', discard: 7, ck: true, size: 'standard', barb: 7, fillBots: 3, diff: 'medium' },
  ckbig: { label: 'Cities & Knights XL', max: 4, vp: 16, timer: 0, map: 'shuffle', discard: 7, ck: true, size: 'large', barb: 8 },
};

const users = new Map();   // token -> user
const rooms = new Map();   // code -> room
let uid = 0;

const send = (ws, o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
const code = () => { let c; do { c = Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[crypto.randomInt(24)]).join(''); } while (rooms.has(c)); return c; };
const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);

function roomSummary(r) {
  return {
    code: r.code, name: r.name, mode: r.mode, map: r.map, status: r.status, vp: r.vp, timer: r.timer, ck: r.ck, size: r.size,
    players: r.slots.filter(s => s.uid || s.bot).length, max: r.max, host: userName(r.host), pub: r.pub,
  };
}
const userName = id => { for (const u of users.values()) if (u.id === id) return u.name; return '—'; };
const userById = id => { for (const u of users.values()) if (u.id === id) return u; return null; };

function lobbyView(r) {
  return {
    code: r.code, name: r.name, host: r.host, pub: r.pub, mode: r.mode, map: r.map, max: r.max, vp: r.vp,
    timer: r.timer, discard: r.discard, friendly: r.friendly, status: r.status, ck: r.ck, size: r.size, barb: r.barb, progress: r.progress,
    slots: r.slots.map(s => ({ uid: s.uid, name: s.name, bot: s.bot, diff: s.diff, color: s.color, ready: s.ready, connected: s.bot || !!(userById(s.uid) && userById(s.uid).ws) })),
    chat: r.chat.slice(-60),
  };
}
function broadcastRoom(r) {
  const msg = { t: 'room', room: lobbyView(r) };
  members(r).forEach(u => send(u.ws, msg));
}
function members(r) {
  const out = [];
  r.slots.forEach(s => { if (s.uid) { const u = userById(s.uid); if (u) out.push(u); } });
  r.spectators.forEach(id => { const u = userById(id); if (u) out.push(u); });
  return out;
}
function broadcastGame(r, full) {
  if (!r.game) return;
  const g = r.game;
  const key = `${g.phase}:${g.turnNo}:${g.turn}:${Object.keys(g.pendingDiscard).join()}`;
  if (key !== r.lastKey) { r.lastKey = key; r.deadline = g.cfg.timer && g.phase !== 'ended' ? Date.now() + g.cfg.timer * 1000 : 0; }
  g.players.forEach((p, i) => { const s = r.seatSlot[i]; p.connected = s.bot || !!(userById(s.uid) && userById(s.uid).ws); });
  members(r).forEach(u => {
    const idx = r.seatSlot.findIndex(s => s.uid === u.id);
    const m = { t: 'game', view: g.view(idx), left: r.deadline ? Math.max(0, r.deadline - Date.now()) : 0, chat: r.chat.slice(-60) };
    if (full) m.board = g.boardPublic();
    send(u.ws, m);
  });
  scheduleBots(r);
}

function scheduleBots(r) {
  clearTimeout(r.botTimer);
  const g = r.game;
  if (!g || g.phase === 'ended') { clearTimeout(r.timeoutTimer); return; }
  const actors = pendingActors(g);
  const auto = actors.filter(i => { const s = r.seatSlot[i]; return s.bot; });
  const gone = actors.filter(i => { const s = r.seatSlot[i]; const u = userById(s.uid); return !s.bot && !(u && u.ws); });
  if (auto.length || gone.length) {
    r.botTimer = setTimeout(() => runAuto(r, auto.length ? auto : gone), auto.length ? 650 : 4000);
  }
  clearTimeout(r.timeoutTimer);
  if (r.deadline) {
    r.timeoutTimer = setTimeout(() => {
      const humans = pendingActors(g).filter(i => !r.seatSlot[i].bot);
      if (humans.length) { r.autoStreak = r.autoStreak || {}; runAuto(r, humans, true); }
    }, Math.max(0, r.deadline - Date.now()) + 50);
  }
}
function runAuto(r, idxs, timeout) {
  const g = r.game;
  if (!g || g.phase === 'ended') return;
  // run one action for each pending auto player
  const i = idxs[0];
  let a = botAction(g, i);
  if (timeout && a && a.type === 'respond') a = { type: 'respond', accept: false };
  let err = a ? g.act(i, a) : 'none';
  if (err) {
    // fall back so the game can never stall
    if (g.turn === i && g.phase === 'main') err = g.act(i, { type: 'end' });
    if (err && g.turn === i && g.freeRoads > 0) g.freeRoads = 0;
  }
  if (timeout) r.deadline = 0; // reset timer after a forced move
  if (timeout) r.lastKey = '';
  broadcastGame(r, false);
}

function leaveRoom(u) {
  const r = u.room && rooms.get(u.room);
  u.room = null;
  if (!r) return;
  r.spectators = r.spectators.filter(id => id !== u.id);
  const slot = r.slots.find(s => s.uid === u.id);
  if (slot) {
    if (r.status === 'lobby') {
      slot.uid = null; slot.name = ''; slot.ready = false;
      if (r.host === u.id) {
        const next = r.slots.find(s => s.uid);
        if (next) r.host = next.uid; else { destroyRoom(r); return; }
      }
      if (!r.slots.some(s => s.uid)) { destroyRoom(r); return; }
    } else {
      // in a running game the seat stays; auto-play covers it if they never return
      slot.uid = slot.uid; // keep for rejoin
    }
  }
  if (r.status !== 'lobby' && !members(r).length) { setTimeout(() => { if (!members(r).length) destroyRoom(r); }, 5 * 60 * 1000); }
  broadcastRoom(r);
  if (r.game) broadcastGame(r, false);
}
function destroyRoom(r) { clearTimeout(r.botTimer); clearTimeout(r.timeoutTimer); rooms.delete(r.code); }

function newRoom(u, o) {
  const mode = MODES[o.mode] ? o.mode : 'custom';
  const M = MODES[mode];
  const r = {
    code: code(), name: clean(o.name, 28) || `${u.name}'s room`, host: u.id, pub: o.pub !== false, mode,
    map: o.map === 'shuffle' ? 'shuffle' : M.map, max: Math.min(4, Math.max(2, +o.max || M.max)), vp: Math.min(20, Math.max(3, +o.vp || M.vp)),
    timer: [0, 30, 60, 90, 120, 180].includes(+o.timer) ? +o.timer : M.timer,
    discard: Math.min(15, Math.max(4, +o.discard || M.discard)), friendly: !!(o.friendly != null ? o.friendly : M.friendly),
    ck: !!(o.ck != null ? o.ck : M.ck), size: (o.size || M.size) === 'large' ? 'large' : 'standard', barb: Math.min(12, Math.max(4, +o.barb || M.barb || 7)), progress: o.progress != null ? !!o.progress : true,
    status: 'lobby', slots: [], spectators: [], chat: [], game: null, seatSlot: [], lastKey: '', deadline: 0,
  };
  if (mode === 'duel') r.max = 2;
  for (let i = 0; i < r.max; i++) r.slots.push({ uid: null, name: '', bot: false, diff: 'medium', color: COLORS[i], ready: false });
  rooms.set(r.code, r);
  joinSlot(r, u);
  if (M.fillBots) for (let i = 1; i < r.max && i <= M.fillBots; i++) { const s = r.slots[i]; s.bot = true; s.name = 'Bot ' + i; s.diff = M.diff; s.ready = true; }
  return r;
}
function joinSlot(r, u) {
  const existing = r.slots.find(s => s.uid === u.id);
  if (!existing) {
    const s = r.slots.find(s => !s.uid && !s.bot);
    if (!s) return false;
    s.uid = u.id; s.name = u.name; s.ready = r.host === u.id;
  }
  u.room = r.code;
  return true;
}
function applySettings(r, o) {
  if (o.mode && MODES[o.mode]) {
    const M = MODES[o.mode];
    r.mode = o.mode; r.vp = M.vp; r.timer = M.timer; r.map = M.map; r.discard = M.discard; r.friendly = !!M.friendly; r.ck = !!M.ck; r.size = M.size === 'large' ? 'large' : 'standard'; r.barb = M.barb || 7;
    resize(r, o.mode === 'duel' ? 2 : Math.max(M.max, r.slots.filter(s => s.uid || s.bot).length > 2 ? Math.min(4, r.slots.filter(s => s.uid || s.bot).length) : M.max));
    if (M.fillBots) { r.slots.forEach((s, i) => { if (i > 0 && !s.uid && !s.bot && i <= M.fillBots) { s.bot = true; s.name = 'Bot ' + i; s.diff = M.diff; s.ready = true; } }); }
  }
  if (o.map) r.map = o.map === 'shuffle' ? 'shuffle' : 'classic';
  if (o.vp != null) r.vp = Math.min(20, Math.max(3, +o.vp | 0));
  if (o.timer != null && [0, 30, 60, 90, 120, 180].includes(+o.timer)) r.timer = +o.timer;
  if (o.discard != null) r.discard = Math.min(15, Math.max(4, +o.discard | 0));
  if (o.friendly != null) r.friendly = !!o.friendly;
  if (o.ck != null) { r.ck = !!o.ck; if (o.vp == null && r.mode === 'custom') r.vp = r.ck ? 13 : 10; }
  if (o.size) r.size = o.size === 'large' ? 'large' : 'standard';
  if (o.barb != null) r.barb = Math.min(12, Math.max(4, +o.barb | 0));
  if (o.progress != null) r.progress = !!o.progress;
  if (o.pub != null) r.pub = !!o.pub;
  if (o.name != null) r.name = clean(o.name, 28) || r.name;
  if (o.max != null && r.mode !== 'duel') resize(r, Math.min(4, Math.max(2, +o.max | 0)));
}
function resize(r, n) {
  n = Math.min(4, Math.max(2, n));
  while (r.slots.length > n) {
    const i = r.slots.length - 1, s = r.slots[i];
    if (s.uid) { const empty = r.slots.findIndex((x, k) => k < n && !x.uid && !x.bot); if (empty < 0) return; Object.assign(r.slots[empty], { uid: s.uid, name: s.name, ready: s.ready }); }
    r.slots.pop();
  }
  while (r.slots.length < n) r.slots.push({ uid: null, name: '', bot: false, diff: 'medium', color: COLORS.find(c => !r.slots.some(s => s.color === c)), ready: false });
  r.max = n;
}
function canStart(r) {
  const filled = r.slots.filter(s => s.uid || s.bot);
  if (filled.length < 2) return 'Need at least 2 players (add a bot)';
  if (r.mode === 'duel' && filled.length !== 2) return '1v1 needs exactly 2 players';
  if (filled.some(s => s.uid && !s.ready)) return 'All players must be ready';
  return null;
}
function startGame(r) {
  const filled = r.slots.filter(s => s.uid || s.bot);
  const seats = filled.map(s => s);
  for (let i = seats.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [seats[i], seats[j]] = [seats[j], seats[i]]; }
  r.seatSlot = seats;
  const G = r.ck ? CKGame : Game;
  r.game = new G({ vp: r.vp, discardLimit: r.discard, randomNumbers: r.map === 'shuffle', friendlyRobber: r.friendly, timer: r.timer, size: r.size, barbSteps: r.barb, progress: r.progress },
    seats.map(s => ({ name: s.name, color: s.color, bot: s.bot, diff: s.diff })));
  r.status = 'playing'; r.lastKey = '';
  members(r).forEach(u => send(u.ws, { t: 'started', code: r.code }));
  broadcastRoom(r);
  broadcastGame(r, true);
}

function handle(u, ws, m) {
  const r = u.room && rooms.get(u.room);
  switch (m.t) {
    case 'name': u.name = clean(m.name, 18) || u.name; send(ws, { t: 'hello', id: u.id, name: u.name, token: u.token }); if (r) { const s = r.slots.find(s => s.uid === u.id); if (s && r.status === 'lobby') s.name = u.name; broadcastRoom(r); } break;
    case 'rooms': {
      const list = [...rooms.values()].filter(x => x.pub).map(roomSummary);
      send(ws, { t: 'rooms', rooms: list, online: [...users.values()].filter(x => x.ws).length, games: totalGames });
      break;
    }
    case 'create': { if (r) leaveRoom(u); const nr = newRoom(u, m.opts || {}); send(ws, { t: 'joined', code: nr.code }); broadcastRoom(nr); break; }
    case 'join': {
      const c = clean(m.code, 8).toUpperCase().replace(/^.*\//, '');
      const target = rooms.get(c);
      if (!target) return send(ws, { t: 'err', m: 'Room not found. Check the code and try again.' });
      if (r && r.code !== c) leaveRoom(u);
      const already = target.slots.some(s => s.uid === u.id);
      if (target.status !== 'lobby' && !already) {
        target.spectators.push(u.id); u.room = c;
        send(ws, { t: 'joined', code: c, spectator: true }); broadcastRoom(target); broadcastGame(target, true);
        return;
      }
      if (!joinSlot(target, u)) return send(ws, { t: 'err', m: 'That room is full.' });
      send(ws, { t: 'joined', code: c });
      broadcastRoom(target);
      if (target.game) { broadcastGame(target, true); }
      break;
    }
    case 'spectate': {
      const target = rooms.get(clean(m.code, 8).toUpperCase());
      if (!target) return send(ws, { t: 'err', m: 'Room not found.' });
      if (r) leaveRoom(u);
      if (!target.slots.some(s => s.uid === u.id)) target.spectators.push(u.id);
      u.room = target.code;
      send(ws, { t: 'joined', code: target.code, spectator: true });
      broadcastRoom(target); if (target.game) broadcastGame(target, true);
      break;
    }
    case 'sync': if (r) { send(ws, { t: 'joined', code: r.code, spectator: !r.slots.some(s => s.uid === u.id) }); send(ws, { t: 'room', room: lobbyView(r) }); if (r.game) { const idx = r.seatSlot.findIndex(s => s.uid === u.id); send(ws, { t: 'game', view: r.game.view(idx), board: r.game.boardPublic(), left: r.deadline ? Math.max(0, r.deadline - Date.now()) : 0, chat: r.chat.slice(-60) }); } } else send(ws, { t: 'nogame' }); break;
    case 'leave': leaveRoom(u); send(ws, { t: 'left' }); break;
    case 'ready': { if (!r || r.status !== 'lobby') return; const s = r.slots.find(s => s.uid === u.id); if (s && r.host !== u.id) { s.ready = !s.ready; broadcastRoom(r); } break; }
    case 'color': { if (!r || r.status !== 'lobby') return; const s = r.slots.find(s => s.uid === u.id); if (!s || !COLORS.includes(m.color)) return; if (r.slots.some(x => x !== s && x.color === m.color)) return send(ws, { t: 'err', m: 'Colour already taken.' }); s.color = m.color; broadcastRoom(r); break; }
    case 'settings': { if (!r || r.host !== u.id || r.status !== 'lobby') return; applySettings(r, m.opts || {}); broadcastRoom(r); break; }
    case 'addbot': {
      if (!r || r.host !== u.id || r.status !== 'lobby') return;
      const s = r.slots.find(s => !s.uid && !s.bot); if (!s) return send(ws, { t: 'err', m: 'No empty slot.' });
      const d = ['easy', 'medium', 'hard'].includes(m.diff) ? m.diff : 'medium';
      s.bot = true; s.diff = d; s.ready = true; s.name = 'Bot ' + (r.slots.indexOf(s) + 1) + ' (' + d + ')';
      broadcastRoom(r); break;
    }
    case 'kick': {
      if (!r || r.host !== u.id || r.status !== 'lobby') return;
      const s = r.slots[m.slot | 0]; if (!s || s.uid === u.id) return;
      if (s.uid) { const k = userById(s.uid); if (k) { k.room = null; send(k.ws, { t: 'left', m: 'You were removed from the room.' }); } }
      Object.assign(s, { uid: null, bot: false, name: '', ready: false }); broadcastRoom(r); break;
    }
    case 'move': { // host reorders seats
      if (!r || r.host !== u.id || r.status !== 'lobby') return;
      const a = m.from | 0, b = m.to | 0; if (!r.slots[a] || !r.slots[b]) return;
      const A = r.slots[a], B = r.slots[b];
      ['uid', 'name', 'bot', 'diff', 'ready'].forEach(k => { const t = A[k]; A[k] = B[k]; B[k] = t; });
      broadcastRoom(r); break;
    }
    case 'start': {
      if (!r || r.host !== u.id || r.status !== 'lobby') return;
      const e = canStart(r); if (e) return send(ws, { t: 'err', m: e });
      startGame(r); totalGames++; break;
    }
    case 'chat': {
      if (!r) return; const text = clean(m.text, 200); if (!text) return;
      r.chat.push({ t: Date.now(), n: u.name, m: text }); if (r.chat.length > 200) r.chat.shift();
      members(r).forEach(x => send(x.ws, { t: 'chat', msg: r.chat[r.chat.length - 1] }));
      break;
    }
    case 'act': {
      if (!r || !r.game) return;
      const idx = r.seatSlot.findIndex(s => s.uid === u.id);
      if (idx < 0) return send(ws, { t: 'err', m: 'Spectators cannot act.' });
      const a = m.a || {};
      if (m.seq && u.lastSeq === m.seq) return; // duplicate protection
      u.lastSeq = m.seq;
      const err = r.game.act(idx, a);
      if (err) return send(ws, { t: 'err', m: err });
      if (r.game.phase === 'ended') { r.status = 'ended'; }
      broadcastGame(r, false);
      break;
    }
    case 'rematch': {
      if (!r || r.host !== u.id || r.status !== 'ended') return;
      r.status = 'lobby'; r.game = null; r.seatSlot = [];
      r.slots.forEach(s => { s.ready = !!s.bot || s.uid === r.host; });
      members(r).forEach(x => send(x.ws, { t: 'rematch', code: r.code })); broadcastRoom(r); break;
    }
  }
}
let totalGames = 0;

// ---------- http + ws ----------
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(PUB, path.normalize(p).replace(/^(\.\.[\/\\])+/, ''));
  if (!f.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, d) => {
    if (e) { fs.readFile(path.join(PUB, 'index.html'), (e2, d2) => { res.writeHead(e2 ? 404 : 200, { 'Content-Type': 'text/html' }); res.end(d2); }); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(d);
  });
});
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 16 * 1024 });
wss.on('connection', ws => {
  let u = null;
  const rate = { n: 0, t: Date.now() };
  ws.on('message', raw => {
    const now = Date.now(); if (now - rate.t > 2000) { rate.t = now; rate.n = 0; } if (++rate.n > 40) return;
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (m.t === 'hello') {
      u = (m.token && users.get(m.token)) || null;
      if (!u) { const token = crypto.randomBytes(16).toString('hex'); u = { id: ++uid, token, name: clean(m.name, 18) || 'Guest' + (1000 + crypto.randomInt(9000)), ws: null, room: null }; users.set(token, u); }
      else if (m.name) u.name = clean(m.name, 18) || u.name;
      if (u.ws && u.ws !== ws) try { u.ws.close(); } catch (e) { }
      u.ws = ws;
      send(ws, { t: 'hello', id: u.id, name: u.name, token: u.token });
      if (u.room && rooms.get(u.room)) { const r = rooms.get(u.room); broadcastRoom(r); if (r.game) broadcastGame(r, true); } else u.room = null;
      return;
    }
    if (!u) return;
    try { handle(u, ws, m); } catch (e) { console.error(e); send(ws, { t: 'err', m: 'Server error' }); }
  });
  ws.on('close', () => {
    if (!u || u.ws !== ws) return;
    u.ws = null;
    const r = u.room && rooms.get(u.room);
    if (r) {
      broadcastRoom(r); if (r.game) broadcastGame(r, false);
      if (r.status === 'lobby') setTimeout(() => { if (!u.ws && u.room === r.code) leaveRoom(u); }, 30000);
    }
  });
});
if (require.main === module) server.listen(PORT, '0.0.0.0', () => console.log(`HexColony listening on http://localhost:${PORT}`));
module.exports = { server, MODES };

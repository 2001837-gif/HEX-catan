'use strict';
// End-to-end: real server, real WebSockets. Two humans + spectator play a full game; a third scenario checks bot rooms and invalid actions.
const assert = require('assert');
const { server } = require('../server/index.js');

function client(port, name) {
  const c = { name, view: null, room: null, errors: [], got: [], code: null, spectator: false };
  c.ws = new WebSocket(`ws://localhost:${port}/ws`);
  c.send = o => c.ws.send(JSON.stringify(o));
  c.act = a => c.send({ t: 'act', seq: Math.random() + '', a });
  c.ready = new Promise(res => {
    c.ws.onmessage = ev => {
      const m = JSON.parse(ev.data); c.got.push(m.t);
      if (m.t === 'hello') { c.id = m.id; c.token = m.token; res(); }
      if (m.t === 'joined') { c.code = m.code; c.spectator = !!m.spectator; }
      if (m.t === 'room') c.room = m.room;
      if (m.t === 'game') { c.view = m.view; if (m.board) c.board = m.board; c.onGame && c.onGame(); }
      if (m.t === 'err') c.errors.push(m.m);
    };
    c.ws.onopen = () => c.send({ t: 'hello', name });
  });
  return c;
}
const wait = (f, ms = 8000) => new Promise((res, rej) => { const t0 = Date.now(); const i = setInterval(() => { try { if (f()) { clearInterval(i); res(); } } catch (e) { clearInterval(i); rej(e); } if (Date.now() - t0 > ms) { clearInterval(i); rej(new Error('timeout waiting: ' + f)); } }, 20); });

function step(c) {
  const v = c.view; if (!v || v.phase === 'ended' || v.me < 0) return;
  const mine = v.me === v.turn, L = v.legal;
  if (v.phase === 'discard' && v.discard) {
    const res = {}; let need = v.discard; for (const r of Object.keys(v.hand)) { const n = Math.min(need, v.hand[r]); if (n) { res[r] = n; need -= n; } }
    return c.act({ type: 'discard', res });
  }
  if (!mine) return;
  if (v.phase === 'setup') return c.act(v.setupSub === 'settlement' ? { type: 'settlement', at: L.settlement[0] } : { type: 'road', at: L.road[0] });
  if (v.phase === 'roll') return c.act({ type: 'roll' });
  if (v.phase === 'robber') return c.act({ type: 'robber', at: L.robber[0] });
  if (v.phase === 'steal') return c.act({ type: 'steal', from: L.steal[0] });
  if (v.phase === 'main') {
    if (L.city.length) return c.act({ type: 'city', at: L.city[0] });
    if (L.settlement.length) return c.act({ type: 'settlement', at: L.settlement[0] });
    if (L.road.length) return c.act({ type: 'road', at: L.road[Math.floor(Math.random() * L.road.length)] });
    return c.act({ type: 'end' });
  }
}

server.listen(0, async () => {
  const port = server.address().port;
  try {
    const A = client(port, 'Alice'), B = client(port, 'Bob'), S = client(port, 'Spec');
    await Promise.all([A.ready, B.ready, S.ready]);

    // invalid join
    B.send({ t: 'join', code: 'ZZZZZ' }); await wait(() => B.errors.some(e => /not found/i.test(e)));

    // create room (custom, low VP so the game ends quickly)
    A.send({ t: 'create', opts: { name: 'Test', mode: 'custom', max: 2, vp: 4, timer: 0 } });
    await wait(() => A.code && A.room);
    assert.strictEqual(A.room.slots.length, 2); assert.strictEqual(A.room.vp, 4);
    B.send({ t: 'join', code: A.code }); await wait(() => B.room && B.room.slots.filter(s => s.uid).length === 2);

    // a third player gets a "full" room as spectator after start, "full" error before start
    S.send({ t: 'join', code: A.code }); await wait(() => S.errors.some(e => /full/i.test(e)));

    // start must be blocked until Bob is ready, and only the host can start
    A.send({ t: 'start' }); await wait(() => A.errors.some(e => /ready/i.test(e)));
    B.send({ t: 'start' }); await new Promise(r => setTimeout(r, 150)); assert(!B.view, 'non-host cannot start');
    B.send({ t: 'ready' }); await wait(() => A.room.slots.every(s => s.ready));
    // settings must reach the room
    A.send({ t: 'settings', opts: { vp: 5, discard: 9, friendly: true } }); await wait(() => B.room.vp === 5 && B.room.discard === 9 && B.room.friendly);
    A.send({ t: 'settings', opts: { vp: 4 } }); await wait(() => B.room.vp === 4);
    B.send({ t: 'settings', opts: { vp: 20 } }); await new Promise(r => setTimeout(r, 100)); assert.strictEqual(A.room.vp, 4, 'non-host cannot change settings');

    A.send({ t: 'start' }); await wait(() => A.view && B.view);
    assert.strictEqual(A.view.cfg.vp, 4); assert.strictEqual(A.view.cfg.discardLimit, 9); assert.strictEqual(A.view.cfg.friendlyRobber, true);
    S.send({ t: 'spectate', code: A.code }); await wait(() => S.view);
    assert.strictEqual(S.view.me, -1); assert.strictEqual(S.view.hand, null, 'spectator sees no hand');

    // anti-cheat: acting out of turn / illegal placement is rejected
    const idle = A.view.turn === A.view.me ? B : A;
    idle.errors.length = 0; idle.act({ type: 'roll' }); await wait(() => idle.errors.length);
    const cur = idle === A ? B : A;
    cur.errors.length = 0; cur.act({ type: 'settlement', at: '0,0' }); await wait(() => cur.errors.length);

    // hidden info: opponent's resources are counts only
    assert.strictEqual(typeof A.view.players[0].cards, 'number');
    assert(!('hand' in A.view.players[0]));

    // play out the full game
    const players = [A, B]; let ended = false;
    for (let i = 0; i < 15000 && !ended; i++) {
      players.forEach(step);
      await new Promise(r => setTimeout(r, 4));
      ended = A.view.phase === 'ended' && B.view.phase === 'ended';
    }
    assert(ended, 'game should finish');
    assert(A.view.stats && A.view.stats.players.length === 2);
    const win = A.view.players[A.view.winner];
    assert(win.vp >= 4);
    await wait(() => S.view.phase === 'ended');

    // reconnect with token restores seat
    const A2 = client(port, 'x'); A2.ws.close();
    const A3 = new WebSocket(`ws://localhost:${port}/ws`); let restored = false, roomStatus = '';
    A3.onmessage = ev => { const m = JSON.parse(ev.data); if (m.t === 'game' && m.view.me >= 0) restored = true; if (m.t === 'room') roomStatus = m.room.status; };
    A3.onopen = () => A3.send(JSON.stringify({ t: 'hello', token: A.token }));
    await wait(() => restored);

    // rematch returns to lobby
    A3.send(JSON.stringify({ t: 'rematch' })); await wait(() => roomStatus === 'lobby'); A3.close();

    // bot room: one human + 3 bots; bots advance on their own
    const H = client(port, 'Human'); await H.ready;
    H.send({ t: 'create', opts: { mode: 'bots' } }); await wait(() => H.room && H.room.slots.filter(s => s.bot).length === 3);
    H.send({ t: 'start' }); await wait(() => H.view);
    let steps = 0; const t0 = Date.now();
    while (H.view.phase !== 'ended' && steps < 4000 && Date.now() - t0 < 30000) { step(H); await new Promise(r => setTimeout(r, 8)); steps++; if (H.view.turnNo >= 6 && H.view.phase !== 'setup') break; }
    assert(H.view.turnNo >= 6, 'bots keep the game moving (reached turn ' + H.view.turnNo + ')');
    console.log('OK: websocket e2e — lobby, validation, hidden info, full 2-human game, spectator, reconnect, rematch, bot room');
  } catch (e) { console.error('FAIL', e); process.exitCode = 1; }
  setTimeout(() => process.exit(process.exitCode || 0), 100);
});

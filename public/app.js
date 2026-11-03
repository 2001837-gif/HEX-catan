(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const RES5 = ['wood', 'brick', 'sheep', 'wheat', 'ore'], COMM = ['cloth', 'coin', 'paper'], RES8 = RES5.concat(COMM);
let RES = RES5;
const RNAME = { wood: 'Wood', brick: 'Brick', sheep: 'Sheep', wheat: 'Wheat', ore: 'Ore', cloth: 'Cloth', coin: 'Coin', paper: 'Paper' };
const RCOL = { wood: '#2f8a3a', brick: '#d4663a', sheep: '#8cc63f', wheat: '#f0c52e', ore: '#8d99a6', cloth: '#b45fd0', coin: '#3f7fe0', paper: '#17a89a' };
const TRK = { trade: { n: 'Trade', c: 'cloth', col: '#b45fd0', lv: ['Trading Post', 'Market', 'Trading House', 'Exchange', 'Guildhall'], ab: 'Level 3: trade commodities 2:1 with the bank' }, politics: { n: 'Politics', c: 'coin', col: '#3f7fe0', lv: ['Town Hall', 'Courthouse', 'Fortress', 'Cathedral', 'Parliament'], ab: 'Level 3: knights can be promoted to Mighty (level 3)' }, science: { n: 'Science', c: 'paper', col: '#17a89a', lv: ['Library', 'Scriptorium', 'Aqueduct', 'Observatory', 'Academy'], ab: 'Level 3: Aqueduct, take a free resource when a roll pays you nothing' } };
const TRACKS = ['trade', 'politics', 'science'];
const TCOL = { forest: '#2f8a3a', pasture: '#8cc63f', fields: '#f0c52e', hills: '#d4663a', mountains: '#9ba7b4', desert: '#e8d8a2' };
const OCEAN = '#2379bf';
const PCOL = { red: '#d9453d', blue: '#3b7dd8', orange: '#e8943a', white: '#eceff1', green: '#4caf6a', purple: '#8a5cc2' };
const PCOL_CB = { red: '#d55e00', blue: '#0072b2', orange: '#e69f00', white: '#f5f5f5', green: '#009e73', purple: '#cc79a7' };
const PCOL_STD = Object.assign({}, PCOL);
try { if (localStorage.cb === '1') Object.assign(PCOL, PCOL_CB); } catch (e) { /* defaults */ }
const COLORS = Object.keys(PCOL);
const DEVN = { knight: 'Knight', roadbuilding: 'Road Building', yearofplenty: 'Year of Plenty', monopoly: 'Monopoly', vp: 'Victory Point' };
const DEVD = { knight: 'Move the robber and steal a card', roadbuilding: 'Build 2 roads for free', yearofplenty: 'Take any 2 resources from the bank', monopoly: 'Take all of one resource from everyone', vp: 'Worth 1 victory point (hidden)' };
const COST = { road: { wood: 1, brick: 1 }, settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1 }, city: { wheat: 2, ore: 3 }, dev: { sheep: 1, wheat: 1, ore: 1 } };
const ICON = {
  wood: '<path d="M12 2L5 12h4l-3 6h5v4h2v-4h5l-3-6h4z"/>',
  brick: '<rect x="3" y="6" width="18" height="12" rx="1"/><path d="M3 12h18M9 6v6M15 12v6" stroke="#0005" fill="none"/>',
  sheep: '<circle cx="9" cy="11" r="4"/><circle cx="14" cy="10" r="4"/><circle cx="12" cy="14" r="4"/><rect x="7" y="16" width="2" height="5"/><rect x="14" y="16" width="2" height="5"/>',
  wheat: '<path d="M12 22V8M12 8c-3-1-4-3-4-5 3 0 4 2 4 5zM12 8c3-1 4-3 4-5-3 0-4 2-4 5zM12 14c-3-1-4-3-4-5 3 0 4 2 4 5zM12 14c3-1 4-3 4-5-3 0-4 2-4 5z"/>',
  ore: '<path d="M12 2l8 8-8 12-8-12z"/>',
  cloth: '<rect x="3.500" y="3" width="17" height="4.200" rx="2.100"/><rect x="3.500" y="16.800" width="17" height="4.200" rx="2.100"/><rect x="6.500" y="7" width="11" height="10"/><path d="M6.500 10l11 2.400M6.500 13.200l11 2.400" stroke="#0006" stroke-width="1.200" fill="none"/>',
  coin: '<circle cx="12" cy="12" r="9.500"/><circle cx="12" cy="12" r="6.500" fill="none" stroke="#0006" stroke-width="1.300"/><path d="M12 7.500v9M9.700 10c0-2 4.600-2 4.600 0s-4.600 1-4.600 3.200 4.600 2 4.600 0" stroke="#0008" fill="none" stroke-width="1.400"/>',
  paper: '<path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M9 8h7M9 11.500h7M9 15h4.500" stroke="#0007" stroke-width="1.500" fill="none" stroke-linecap="round"/>',
};
const ic = (r, s = 16) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="${RCOL[r]}" stroke="#0007" stroke-width=".8" aria-label="${RNAME[r]}"><title>${RNAME[r]}</title>${ICON[r]}</svg>`;
const costHtml = c => Object.keys(c).map(r => `${c[r]}${ic(r, 12)}`).join(' ');
const resLine = o => Object.keys(o).map(r => `${o[r]}${ic(r, 16)}`).join(' ');

const MODES = [
  { id: 'beginner', name: 'Beginner', ico: 'NEW', desc: 'Learn the game against three easy bots. No timer.', players: '1 + 3 bots', turn: 'Untimed', map: 'Classic', diff: 'Easy' },
  { id: 'duel', name: '1v1', ico: '1v1', desc: 'Head-to-head on the standard board. 90 second turns.', players: '2', turn: '90s', map: 'Classic', diff: '—' },
  { id: 'classic4', name: '4 Player', ico: '4P', desc: 'The standard game for up to four players.', players: '2–4', turn: '120s', map: 'Classic', diff: '—' },
  { id: 'shuffle', name: 'Shuffle', ico: 'SHF', desc: 'Randomised number tokens, validated so 6s and 8s never touch.', players: '2–4', turn: '120s', map: 'Shuffled', diff: '—' },
  { id: 'bots', name: 'Bot Game', ico: 'BOT', desc: 'Play against three medium bots. Swap difficulty in the waiting room.', players: '1 + 3 bots', turn: 'Untimed', map: 'Classic', diff: 'Medium' },
  { id: 'casual', name: 'Casual', ico: 'CAS', desc: 'Relaxed multiplayer with the friendly robber rule.', players: '2–4', turn: '90s', map: 'Classic', diff: '—' },
  { id: 'rush', name: 'Rush', ico: 'RSH', desc: 'Fast game: 30 second turns, 8 victory points, shuffled map.', players: '2–4', turn: '30s', map: 'Shuffled', diff: '—' },
  { id: 'big', name: 'Big Island', ico: 'XL', desc: 'A 37-hex island with 12 harbours: more room, more roads, 12 victory points.', players: '2–4', turn: 'Untimed', map: 'Large · Shuffled', diff: '—', big: 1 },
  { id: 'ck', name: 'Cities & Knights', ico: 'C&K', desc: 'Commodities, city improvements, knights and barbarian raids. First to 13 points.', players: '2–4', turn: 'Untimed', map: 'Classic', diff: '—', ck: 1 },
  { id: 'ckbig', name: 'Cities & Knights XL', ico: 'XLK', desc: 'The full expansion on the large island: 16 points, longer barbarian track.', players: '2–4', turn: 'Untimed', map: 'Large · Shuffled', diff: '—', ck: 1, big: 1 },
  { id: 'ckbots', name: 'C&K vs Bots', ico: 'C&K', desc: 'Cities & Knights against three medium bots. Fastest way to try the expansion solo.', players: '1 + 3 bots', turn: 'Untimed', map: 'Classic', diff: 'Medium', ck: 1 },
  { id: 'custom', name: 'Custom', ico: 'CUS', desc: 'Set every rule yourself: points, timer, discard limit, map.', players: '2–4', turn: 'Your choice', map: 'Your choice', diff: '—' },
  { id: 'r1', name: 'Ranked 1v1', ico: 'R1', locked: 'Needs accounts and ratings (not built yet)', desc: 'Rated duels.', players: '2', turn: '—', map: 'Classic', diff: '—' },
  { id: 'r4', name: 'Ranked 4 Player', ico: 'R4', locked: 'Needs accounts and ratings (not built yet)', desc: 'Rated four-player games.', players: '4', turn: '—', map: 'Classic', diff: '—' },
  { id: 'sf', name: 'Seafarers', ico: 'SEA', locked: 'Expansion not implemented yet', desc: 'Ships, islands and exploration.', players: '—', turn: '—', map: '—', diff: '—' },
];
const RULES = [
  ['Goal', 'Be the first player to reach the victory point target (10 by default) on your own turn.'],
  ['Victory points', 'Settlement = 1, city = 2, Longest Road = 2, Largest Army = 2, each Victory Point card = 1.'],
  ['Setup', 'Players place a settlement then a road in turn order, then again in reverse order. Your second settlement pays one resource for each adjacent producing hex.'],
  ['Rolling', 'On your turn roll two dice. Every settlement next to a hex showing that number produces 1 resource, every city produces 2.'],
  ['Building costs', 'Road: wood + brick. Settlement: wood + brick + sheep + wheat. City: 3 ore + 2 wheat (replaces a settlement). Development card: sheep + wheat + ore.'],
  ['Distance rule', 'A settlement may not be placed on an intersection adjacent to another settlement or city, and must connect to one of your roads.'],
  ['Rolling a 7', 'Nobody produces. Anyone holding more than the discard limit (7) discards half (rounded down). Then the roller moves the robber and steals one card from a player on that hex.'],
  ['The robber', 'A hex with the robber produces nothing. The robber must move to a different hex. With the friendly robber rule it cannot target players with 2 or fewer visible points.'],
  ['Player trading', 'On your turn you may offer a trade to everyone or one player. A player may accept, reject or counter. For offers to everyone you choose which accepter to trade with.'],
  ['Bank trading', '4 of one resource for 1 of another. A 3:1 port gives 3 for 1 on any resource. A 2:1 port gives 2 for 1 on its resource. Ports apply when you own a settlement or city on them.'],
  ['Development cards', 'Knight, Road Building, Year of Plenty, Monopoly, Victory Point. You may play one per turn, never on the turn you bought it (Victory Points count automatically). A Knight may be played before rolling.'],
  ['Longest Road', 'First to have a continuous road of 5 or more. An opponent settlement can break a road. Taken only by a strictly longer road.'],
  ['Largest Army', 'First to play 3 knights. Taken only by playing strictly more.'],
  ['Cities & Knights', 'An expansion mode (choose Cities & Knights, or switch it on in any room). Cities now also yield commodities, there is no Development deck, and the game is played to 13 points by default.'],
  ['Commodities', 'A city on a Forest pays 1 wood + 1 paper, on Pasture 1 sheep + 1 cloth, on Mountains 1 ore + 1 coin. Hills and Fields cities pay 2 resources as normal. Commodities are traded with players and the bank (4:1) but never build roads or settlements.'],
  ['Event die', 'Each roll also has an event die. Three faces move the barbarian ship one step. The other three are the Trade, Politics and Science gates: if your improvement level in that track is at least the red die, you draw a progress card.'],
  ['City improvements', 'Spend commodities to raise Trade (cloth), Politics (coin) or Science (paper). Level N costs N commodities. Level 3 unlocks the track ability. Level 4 founds a Metropolis (+2 points, protects that city from pillage). Level 5 takes a Metropolis from a player below level 5.'],
  ['Knights', 'Build up to 2 knights of each level (1-3) on intersections connected to your roads (sheep + ore). Activate a knight with 1 wheat. Promote with sheep + ore. Mighty (level 3) needs Politics level 3. An active knight can move along your roads, drive off a weaker enemy knight, or chase away the robber. Moving or chasing makes it inactive.'],
  ['Barbarians', 'When the ship reaches the island, barbarian strength equals the number of cities on the board. Defence is the combined level of active knights. If defence is at least strength, the island holds: the top defender earns a point. Otherwise each lowest defender loses a city to a settlement (Metropolis cities are safe). All knights then go inactive.'],
  ['City walls', 'Pay 2 brick to wall one of your cities (max 3 walls). Each wall raises your discard limit by 2.'],
  ['Robber in C&K', 'The robber sleeps until the first barbarian attack. After that a 7 moves it as usual.'],
  ['Progress cards', 'Trade, Politics and Science cards: Alchemist, Crane, Engineer, Inventor, Irrigation, Medicine, Mining, Printer, Road Building, Smith, Merchant Fleet, monopolies, Master Merchant, Bishop, Constitution, Deserter, Intrigue, Saboteur, Spy, Warlord and Wedding. You can hold 4. Play them in your main phase (Alchemist before the roll).'],
  ['Large board', 'The large island has 37 hexes and 12 harbours. Everything else plays the same, but expect longer games and bigger roads.'],
  ['Bank limits', 'The bank holds 19 of each resource. If it cannot pay everyone, nobody gets that resource unless only one player is owed it.'],
];

// ---------- state ----------
const S = {
  me: null, rooms: [], online: 0, games: 0, room: null, game: null, board: null, deadline: 0, chat: [],
  wsReady: false, pendingNav: false, auto: null, joining: '', lastOffer: 0, shown: '',
  ui: { build: null, mv: null, pick: null, lastAtk: undefined, modal: null, zoom: 1, px: 0, py: 0, tab: 'chat', mute: localStorage.mute === '1', prev: null, muted: new Set(), qf: { q: '', mode: '', map: '', spaces: false }, rulesQ: '', endTab: 'stats', dismissedDiscard: 0, noAnim: localStorage.noAnim === '1', muteAll: false },
  mode: localStorage.mode || 'classic4',
};
let ws, seq = 0, retry = 0;
window.__reconnect = () => { try { ws.close(); } catch (e) { /* closed */ } S.room = null; S.game = null; S.board = null; };
function connect() {
  ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
  ws.onopen = () => { retry = 0; send({ t: 'hello', token: localStorage.token, name: localStorage.name }); };
  ws.onmessage = e => onMsg(JSON.parse(e.data));
  ws.onclose = () => { S.wsReady = false; banner('Connection lost — reconnecting…'); setTimeout(connect, Math.min(5000, 400 * ++retry)); };
}
const send = o => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); else toast('Not connected yet — retrying…'); };
const act = a => send({ t: 'act', seq: Date.now() + '-' + (++seq), a });
function banner(t) { const b = $('#banner'); b.textContent = t || ''; b.hidden = !t; }
function toast(m, ok) { const d = document.createElement('div'); d.className = 'toast' + (ok ? ' ok' : ''); d.textContent = m; $('#toasts').appendChild(d); setTimeout(() => d.remove(), 3600); }
const route = () => { const h = location.hash.replace(/^#\/?/, '').split('/'); return { page: h[0] || 'home', arg: (h[1] || '').toUpperCase() }; };
const go = h => { location.hash = h; };
const inviteLink = c => location.origin + '/#/room/' + c;

function onMsg(m) {
  switch (m.t) {
    case 'hello':
      S.me = { id: m.id, name: m.name }; localStorage.token = m.token; localStorage.name = m.name; S.wsReady = true; banner('');
      { const r = route(); if ((r.page === 'room' || r.page === 'game') && r.arg) { S.joining = r.arg; send({ t: 'join', code: r.arg }); } else send({ t: 'sync' }); }
      send({ t: 'rooms' }); renderAll(); break;
    case 'rooms': S.rooms = m.rooms; S.online = m.online; S.games = m.games; if (route().page === 'lobby') drawRoomTable(); if (route().page === 'home') drawHomeStats(); break;
    case 'joined': S.joining = ''; if (S.pendingNav) { S.pendingNav = false; go('#/room/' + m.code); } else if (!S.room || S.room.code !== m.code) { if (route().page !== 'room' && route().page !== 'game') { /* restored session: stay put, header offers resume */ } } renderAll(); break;
    case 'room':
      S.room = m.room; S.chat = m.room.chat;
      if (S.auto === 'start' && S.me && S.room.host === S.me.id && S.room.status === 'lobby') { S.auto = null; send({ t: 'start' }); }
      if (S.room.status === 'lobby' && route().page === 'game') go('#/room/' + S.room.code);
      renderAll(); break;
    case 'started': S.game = null; S.board = null; S.ui.modal = null; S.ui.dismissedDiscard = 0; S.ui.prev = null; S.ui.hand = null; S.ui.deltas = {}; S.ui.feed = []; S.ui.logT = undefined; S.ui.lastTk = null; S.ui.lastAtk = undefined; S.ui.mv = null; S.ui.pick = null; go('#/game/' + m.code); break;
    case 'game': S.game = m.view; RES = m.view.ck ? RES8 : RES5; if (m.board) S.board = m.board; S.deadline = m.left ? Date.now() + m.left : 0; S.chat = m.chat; if (route().page === 'room' && S.room && S.room.status !== 'lobby') go('#/game/' + S.room.code); renderAll(); break;
    case 'chat': S.chat.push(m.msg); drawChat(); break;
    case 'err': S.joining = ''; S.pendingNav = false; toast(m.m); if (m.m.startsWith('Room not found') && ['room', 'game'].includes(route().page)) go('#/lobby'); break;
    case 'left': S.room = null; S.game = null; S.board = null; if (m.m) toast(m.m); go('#/lobby'); break;
    case 'rematch': S.game = null; S.board = null; S.ui.modal = null; go('#/room/' + m.code); break;
    case 'nogame': if (['room', 'game'].includes(route().page) && !S.joining) { S.room = null; go('#/lobby'); } break;
  }
}

// ---------- shell ----------
const NAV = [['home', 'Home'], ['play', 'Play'], ['lobby', 'Lobby'], ['customise', 'Customise'], ['rules', 'Rules'], ['settings', 'Settings']];
function header() {
  const r = route();
  const resume = S.room && S.room.status !== 'lobby' && r.page !== 'game' ? `<a class="resume" href="#/game/${S.room.code}">Resume game</a>` : S.room && S.room.status === 'lobby' && r.page !== 'room' ? `<a class="resume" href="#/room/${S.room.code}">Back to room</a>` : '';
  return `<header id="top"><a class="logo" href="#/home"><svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 1l9.5 5.5v11L12 23l-9.5-5.5v-11z" fill="#2f80ed"/><path d="M12 7l4.5 2.6v5.2L12 17.4l-4.5-2.6V9.6z" fill="#fff"/></svg>HexColony</a>
  <nav>${NAV.map(([p, n]) => `<a href="#/${p}" class="${r.page === p || (p === 'lobby' && r.page === 'room') ? 'on' : ''}">${n}</a>`).join('')}</nav>
  <div class="acct">${resume}<a class="chip" href="#/settings" title="Guest session — change name in Settings">${esc(S.me ? S.me.name : '…')} · Guest</a></div></header>`;
}
function renderAll() {
  const r = route();
  if ((r.page === 'room' || r.page === 'game') && r.arg && S.wsReady && (!S.room || S.room.code !== r.arg) && S.joining !== r.arg) { S.joining = r.arg; send({ t: 'join', code: r.arg }); }
  const key = r.page + ':' + r.arg;
  const app = $('#app');
  if (S.shown !== key || !$('#view')) {
    S.shown = key; S.ui.build = null;
    app.innerHTML = header() + '<main id="view" style="display:contents"></main>';
    drawPage();
    return;
  }
  const h = $('#top'); if (h) h.outerHTML = header();
  if (r.page === 'room') drawRoom(); else if (r.page === 'game') drawGame(); else if (r.page === 'lobby') drawRoomTable();
}
window.addEventListener('hashchange', renderAll);
function drawPage() {
  const r = route(), v = $('#view');
  document.title = 'HexColony';
  const fn = { home: pageHome, play: pagePlay, lobby: pageLobby, customise: pageCustomise, rules: pageRules, settings: pageSettings, room: pageRoom, game: pageGame }[r.page];
  if (!fn) { go('#/home'); return; }
  fn(v);
}


// ---------- sound (synthesised, no audio files) ----------
let AC;
function snd(kind) {
  if (S.ui.mute) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const t = AC.currentTime;
    const tone = (type, f0, f1, t0, dur, vol) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + dur); o.connect(g); g.connect(AC.destination); o.start(t0); o.stop(t0 + dur + .02); };
    if (kind === 'place') { tone('triangle', 240, 80, t, .16, .35); tone('square', 900, 300, t, .05, .06); }
    else if (kind === 'dice') for (let i = 0; i < 6; i++) tone('square', 280 + Math.random() * 500, 0, t + i * .055, .045, .07);
    else if (kind === 'err') tone('sawtooth', 150, 90, t, .16, .14);
    else if (kind === 'road') { tone('square', 520, 180, t, .06, .1); tone('triangle', 200, 90, t + .03, .12, .25); }
    else if (kind === 'card') { tone('sine', 880, 1320, t, .09, .12); }
    else if (kind === 'horn') { tone('sawtooth', 110, 98, t, .55, .22); tone('sawtooth', 165, 147, t, .55, .12); tone('sawtooth', 110, 98, t + .65, .7, .22); }
    else if (kind === 'win') [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, 0, t + i * .14, .3, .22));
    else if (kind === 'ding') { tone('sine', 660, 0, t, .2, .2); tone('sine', 880, 0, t + .09, .26, .2); }
  } catch (e) { /* audio unavailable */ }
}
const PIECE = { 1: 'M-9,7 L-9,-2 L0,-10 L9,-2 L9,7 Z', 2: 'M-12,8 L-12,-2 L-4,-2 L-4,-9 L2,-15 L8,-9 L8,-2 L12,-2 L12,8 Z' };

// ---------- customisation (cosmetic, saved on this device) ----------
const SKIN_DEF = [
  { k: 'settle', t: 'Settlements', d: 'Your small buildings', n: ['Classic house', 'Cabin', 'Round tower', 'Tent', 'Barn'] },
  { k: 'city', t: 'Cities', d: 'Upgraded buildings', n: ['Classic', 'Castle', 'Skyline', 'Cathedral', 'Windmill'] },
  { k: 'road', t: 'Roads', d: 'How roads are drawn', n: ['Classic', 'Cobblestone', 'Railway', 'Planks', 'Neon glow'] },
  { k: 'robber', t: 'Robber', d: 'The piece that blocks a hex', n: ['Pawn', 'Ghost', 'Bandit', 'Knight helm', 'Black cat'] },
  { k: 'token', t: 'Number tokens', d: 'The discs showing dice numbers', n: ['Parchment', 'Oak wood', 'Stone', 'Gold', 'Midnight'] },
  { k: 'dice', t: 'Dice', d: 'The two dice you roll', n: ['Ivory', 'Ruby', 'Onyx', 'Gold', 'Ice'] },
  { k: 'knight', t: 'Knights', d: 'Defenders in Cities & Knights', n: ['Helmet', 'Shield', 'Spearman', 'Banner', 'Charger'] },
  { k: 'wall', t: 'City walls', d: 'Fortifications around a city', n: ['Stone', 'Palisade', 'Gilded', 'Ice blocks', 'Hedge'] },
  { k: 'ship', t: 'Barbarian ship', d: 'The raiders sailing toward the island', n: ['Longship', 'Galleon', 'Raft', 'Ghost ship', 'Dragon boat'] },
  { k: 'metro', t: 'Metropolis crown', d: 'Marks a metropolis city', n: ['Crown', 'Star', 'Flame', 'Gem', 'Laurel'] },
  { k: 'theme', t: 'Board theme', d: 'Sea and island colours', n: ['Classic ocean', 'Sunset bay', 'Midnight', 'Lagoon', 'Arctic'] },
];
const THEMES = [
  { o: ['#3fa0de', '#1a5c9a'], halo: '#f4e6b0', edge: '#f6e8b4', under: '#8a6a2e' },
  { o: ['#ffb26b', '#a63d6e'], halo: '#ffe3b0', edge: '#ffe7c2', under: '#7a4a2e' },
  { o: ['#27478a', '#0a1230'], halo: '#8d9bd0', edge: '#d4dcf5', under: '#161d36' },
  { o: ['#62e3d2', '#12979f'], halo: '#fff1c4', edge: '#fff6d6', under: '#8a7a3e' },
  { o: ['#c9eafa', '#6aa6d4'], halo: '#ffffff', edge: '#ffffff', under: '#7a92a8' },
];
const TOKS = [
  { a: '#fffaf0', b: '#e8d6a4', st: '#9a7b3c', tx: '#222', hot: '#c0392b' },
  { a: '#dca46a', b: '#9a6430', st: '#5a3a18', tx: '#2b1a0a', hot: '#8f1d12' },
  { a: '#e6eaee', b: '#9aa4ae', st: '#5c6670', tx: '#1f2933', hot: '#b3261e' },
  { a: '#fff0a8', b: '#e1b021', st: '#8a6508', tx: '#3a2800', hot: '#b3261e' },
  { a: '#3c4d74', b: '#1b2540', st: '#0c1224', tx: '#f2f5ff', hot: '#ff8f85' },
];
const DICEP = [
  { f: '#f6f6f4', s: '#9aa6b2', p: '#222' }, { f: '#d93a3a', s: '#8f1f1f', p: '#fff' }, { f: '#2a2d33', s: '#0e0f12', p: '#f2f2f2' }, { f: '#f2c94c', s: '#a67c00', p: '#3a2800' }, { f: '#d8f1ff', s: '#6fb1d8', p: '#17609b' },
];
const SK = { settle: 0, city: 0, road: 0, robber: 0, token: 0, dice: 0, theme: 0, knight: 0, wall: 0, ship: 0, metro: 0 };
try { const j = JSON.parse(localStorage.skin || '{}'); Object.keys(SK).forEach(k => { if (Number.isInteger(j[k]) && j[k] >= 0 && j[k] < 5) SK[k] = j[k]; }); } catch (e) { /* defaults */ }
const TH = () => THEMES[SK.theme], TK = () => TOKS[SK.token];

// ---------- original illustrations ----------
const mkDefs = () => `<defs>
<radialGradient id="g-forest" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#52b24f"/><stop offset="1" stop-color="#23722d"/></radialGradient>
<radialGradient id="g-pasture" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#b0e25c"/><stop offset="1" stop-color="#71ad2c"/></radialGradient>
<radialGradient id="g-fields" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#fbe04f"/><stop offset="1" stop-color="#dfab1a"/></radialGradient>
<radialGradient id="g-hills" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#ea8955"/><stop offset="1" stop-color="#b94c25"/></radialGradient>
<radialGradient id="g-mountains" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#bac5d0"/><stop offset="1" stop-color="#7a8795"/></radialGradient>
<radialGradient id="g-desert" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#f6e9b8"/><stop offset="1" stop-color="#d9c383"/></radialGradient>
<radialGradient id="oc" cx=".5" cy=".5" r=".75"><stop offset="0" stop-color="${TH().o[0]}"/><stop offset="1" stop-color="${TH().o[1]}"/></radialGradient>
<pattern id="wv" width="64" height="32" patternUnits="userSpaceOnUse"><path d="M0 16Q16 6 32 16T64 16" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="2.2"/></pattern>
<radialGradient id="tok" cx=".4" cy=".35" r=".85"><stop offset="0" stop-color="${TK().a}"/><stop offset="1" stop-color="${TK().b}"/></radialGradient>
<filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="3.5" flood-color="#06223d" flood-opacity=".5"/></filter>
<filter id="sh2" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#000" flood-opacity=".45"/></filter>
</defs>`;
let DEFS = mkDefs();
function shade(h, f) { const n = parseInt(h.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const t = f < 0 ? 0 : 255, q = Math.abs(f); r = Math.round((t - r) * q + r); g = Math.round((t - g) * q + g); b = Math.round((t - b) * q + b); return `rgb(${r},${g},${b})`; }
const tree = (x, y, k, a, b) => `<g transform="translate(${x} ${y}) scale(${k})"><rect x="-1.8" y="8" width="3.6" height="6" rx="1" fill="#6b4524"/><polygon points="0,-16 -9,-3 9,-3" fill="${a}"/><polygon points="0,-9 -11,5 11,5" fill="${b}"/><polygon points="0,-2 -13,11 13,11" fill="${a}"/><polygon points="0,-16 0,-3 9,-3" fill="#0003"/><polygon points="0,-9 0,5 11,5" fill="#0002"/></g>`;
const sheep = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})"><rect x="-7" y="6" width="2.6" height="6" rx="1" fill="#33333a"/><rect x="2" y="6" width="2.6" height="6" rx="1" fill="#33333a"/><circle cx="-7" cy="1" r="5" fill="#fff"/><circle cx="-1" cy="-2" r="6" fill="#fff"/><circle cx="5" cy="1" r="5" fill="#fff"/><circle cx="-2" cy="4" r="5.5" fill="#f1f3f0"/><ellipse cx="10" cy="0" rx="3.8" ry="4.4" fill="#34343b"/><circle cx="11" cy="-1" r=".9" fill="#fff"/></g>`;
function art(t, x, y, k) {
  k = k || 1; let g = '';
  if (t === 'forest') g = tree(-15, 5, .68, '#1d6029', '#277a34') + tree(15, 5, .68, '#1d6029', '#277a34') + tree(0, -1, 1, '#1f6a2c', '#2d8a3b');
  else if (t === 'hills') { const row = (y0, xs) => xs.map((x0, i) => `<rect x="${x0}" y="${y0}" width="14" height="7.5" rx="1.4" fill="${i % 2 ? '#b64b2a' : '#cf5c33'}" stroke="#6e2a14" stroke-width="1"/><rect x="${x0 + 1.5}" y="${y0 + 1}" width="9" height="1.6" rx=".8" fill="#fff" fill-opacity=".28"/>`).join(''); g = row(-10, [-15, 1]) + row(-1.5, [-22, -7, 8]).replace(/x="-22"/g, 'x="-22"') + row(7, [-15, 1]); }
  else if (t === 'pasture') g = sheep(-9, 3, .95) + sheep(8, -1, .72);
  else if (t === 'fields') { let st = ''; for (let i = -2; i <= 2; i++) { const bx = i * 5.5, tx = i * 8; st += `<path d="M${bx},15 Q${bx},3 ${tx},-9" stroke="#a87812" stroke-width="1.8" fill="none" stroke-linecap="round"/>`; for (let j = 0; j < 4; j++) { const yy = -9 + j * 4.2, xx = tx - (tx - bx) * (j * 4.2 / 24); st += `<ellipse cx="${(xx - 2.6).toFixed(1)}" cy="${yy}" rx="1.9" ry="3.1" transform="rotate(-28 ${(xx - 2.6).toFixed(1)} ${yy})" fill="#c98f12" stroke="#8c610b" stroke-width=".5"/><ellipse cx="${(xx + 2.6).toFixed(1)}" cy="${yy}" rx="1.9" ry="3.1" transform="rotate(28 ${(xx + 2.6).toFixed(1)} ${yy})" fill="#d9a21e" stroke="#8c610b" stroke-width=".5"/>`; } } g = st + '<path d="M-14,10 Q0,5 14,10" stroke="#7a5409" stroke-width="2.4" fill="none" stroke-linecap="round"/>'; }
  else if (t === 'mountains') g = '<polygon points="-19,13 -6,-12 8,13" fill="#7b8896"/><polygon points="-6,-12 8,13 -2,13 -7,3" fill="#5c6977"/><polygon points="-6,-12 -11.5,-2 -8,-4 -5.5,-0.5 -3,-4 -0.5,-2" fill="#fff"/><polygon points="3,13 14,-5 25,13" fill="#8795a3"/><polygon points="14,-5 25,13 17,13 13,4" fill="#667383"/><polygon points="14,-5 9.5,2 12,0.5 14,3.5 16.5,0.5 18.5,2" fill="#fff"/>';
  else g = '<path d="M-20,12 Q-10,2 0,10 Q10,2 20,12 Z" fill="#cfb56a"/><path d="M-20,12 Q-10,2 0,10" stroke="#a88c3e" stroke-width="1.6" fill="none"/><rect x="8" y="-13" width="6" height="19" rx="3" fill="#4f9a4a" stroke="#2f6b2c" stroke-width="1"/><rect x="2.5" y="-6" width="5.5" height="3.6" rx="1.8" fill="#4f9a4a" stroke="#2f6b2c" stroke-width="1"/><rect x="14" y="-9" width="5.5" height="3.6" rx="1.8" fill="#4f9a4a" stroke="#2f6b2c" stroke-width="1"/><circle cx="-10" cy="-5" r="5" fill="#f4c542" fill-opacity=".85"/>';
  return `<g transform="translate(${x} ${y}) scale(${k})" style="pointer-events:none" filter="url(#sh2)">${g}</g>`;
}
function pieceArt(t, c, cls, sty) {
  const d = shade(c, -.34), l = shade(c, .35), ln = '#1d1d1d', st = sty == null ? (t === 1 ? SK.settle : SK.city) : sty;
  const W = `stroke="${ln}" stroke-width="2" stroke-linejoin="round"`, S1 = '<ellipse cx="0" cy="9" rx="13" ry="3.6" fill="#0006"/>', S2 = '<ellipse cx="0" cy="9" rx="16" ry="4" fill="#0006"/>', dk = 'fill="#1d1d1d" fill-opacity=".6"';
  let g;
  if (t === 1) g = [
    `${S1}<path d="M-9,8 V-1 H9 V8Z" fill="${c}" ${W}/><path d="M-12.5,0 L0,-13 L12.5,0Z" fill="${d}" ${W}/><rect x="-2.4" y="2.5" width="4.8" height="5.5" ${dk}/><path d="M-7,1.8 H-3.5" stroke="${l}" stroke-width="2" stroke-linecap="round"/>`,
    `${S1}<rect x="3" y="-13" width="4.5" height="9" fill="${l}" ${W}/><path d="M-10,8 V-1 H10 V8Z" fill="${c}" ${W}/><path d="M-13,0 L-8,-8 H8 L13,0Z" fill="${d}" ${W}/><rect x="-3" y="2" width="6" height="6" ${dk}/>`,
    `${S1}<path d="M-7,8 V-3 H7 V8Z" fill="${c}" ${W}/><path d="M-10,-3 L0,-16 L10,-3Z" fill="${d}" ${W}/><path d="M-3,8 V3 A3,3 0 0 1 3,3 V8Z" ${dk}/><path d="M-4.5,-1 V4" stroke="${l}" stroke-width="2" stroke-linecap="round"/>`,
    `${S1}<path d="M0,-12 V-17" stroke="${ln}" stroke-width="1.8"/><path d="M0,-17 L7,-15 L0,-13Z" fill="#fff" stroke="${ln}" stroke-width="1.2"/><path d="M-13,8 L0,-12 L13,8Z" fill="${c}" ${W}/><path d="M0,-12 L-4.5,8 H4.5Z" fill="${d}" ${W}/>`,
    `${S1}<path d="M-10,8 V-2 L-7,-9 H7 L10,-2 V8Z" fill="${c}" ${W}/><path d="M-10,-2 H10" stroke="${d}" stroke-width="2.5"/><rect x="-4" y="1" width="8" height="7" fill="#fff" fill-opacity=".85" stroke="${ln}" stroke-width="1.4"/><path d="M-4,1 L4,8 M4,1 L-4,8" stroke="${ln}" stroke-width="1.3"/>`,
  ][st];
  else g = [
    `${S2}<path d="M-13,8 V-4 H-3 V8Z" fill="${c}" ${W}/><path d="M-15,-4 L-8,-14 L-1,-4Z" fill="${d}" ${W}/><path d="M-3,8 V0 H13 V8Z" fill="${c}" ${W}/><path d="M-4.5,0 L4.5,-8 L14.5,0Z" fill="${d}" ${W}/><rect x="-10" y="-1" width="4" height="4.5" fill="#fff" fill-opacity=".8"/><rect x="5" y="3" width="3.5" height="5" ${dk}/><path d="M-11.5,6 H-5" stroke="${l}" stroke-width="1.8" stroke-linecap="round"/>`,
    `${S2}<rect x="-6" y="-4" width="12" height="12" fill="${c}" ${W}/><rect x="-15" y="-12" width="9" height="20" fill="${c}" ${W}/><rect x="6" y="-12" width="9" height="20" fill="${c}" ${W}/>${[-15, -11.8, -8.6, 6, 9.2, 12.4].map(x => `<rect x="${x}" y="-15.5" width="2.6" height="3.5" fill="${d}" stroke="${ln}" stroke-width="1.2"/>`).join('')}<path d="M-3.5,8 V1 A3.5,3.5 0 0 1 3.5,1 V8Z" ${dk}/><rect x="-11" y="-6" width="2" height="4" ${dk}/><rect x="9" y="-6" width="2" height="4" ${dk}/>`,
    `${S2}<rect x="-14" y="-3" width="9" height="11" fill="${c}" ${W}/><rect x="-4.5" y="-13" width="9" height="21" fill="${d}" ${W}/><rect x="5" y="-7" width="9" height="15" fill="${c}" ${W}/><path d="M0,-13 V-18" stroke="${ln}" stroke-width="1.6"/>${[[-12, 0], [-9, 0], [-12, 4], [-9, 4], [-2, -10], [1, -10], [-2, -5], [1, -5], [-2, 0], [1, 0], [7, -4], [10, -4], [7, 1], [10, 1]].map(([x, y]) => `<rect x="${x}" y="${y}" width="2" height="2.2" fill="#fff" fill-opacity=".85"/>`).join('')}`,
    `${S2}<rect x="-12" y="-2" width="24" height="10" fill="${c}" ${W}/><rect x="-4.5" y="-10" width="9" height="8.5" fill="${c}" ${W}/><path d="M-5.5,-10 L0,-20 L5.5,-10Z" fill="${d}" ${W}/><path d="M0,-20 V-24 M-2,-22.2 H2" stroke="${ln}" stroke-width="1.5"/><path d="M-3,8 V3 A3,3 0 0 1 3,3 V8Z" ${dk}/><circle cx="0" cy="-6" r="1.8" fill="#fff" fill-opacity=".9"/><rect x="-10" y="1" width="3" height="4" ${dk}/><rect x="7" y="1" width="3" height="4" ${dk}/>`,
    `${S2}<path d="M-7,8 L-4.500,-4 H4.500 L7,8Z" fill="${c}" ${W}/><path d="M-5.500,-4 L0,-11 L5.500,-4Z" fill="${d}" ${W}/><g transform="translate(0 -5) rotate(25)"><rect x="-1.600" y="-12" width="3.200" height="24" rx="1" fill="${l}" ${W} stroke-width="1.400"/><rect x="-12" y="-1.600" width="24" height="3.200" rx="1" fill="${l}" ${W} stroke-width="1.400"/><circle r="2.200" fill="${d}" ${W} stroke-width="1.400"/></g><path d="M-2,8 V3.500 A2,2 0 0 1 2,3.500 V8Z" ${dk}/>`,
  ][st];
  return `<g class="${cls || ''}">${g}</g>`;
}
function roadArt(x1, y1, x2, y2, c, sty, cls) {
  const L = `x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"`, dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len * 3.4, ny = dx / len * 3.4, off = (k) => `x1="${x1 + nx * k}" y1="${y1 + ny * k}" x2="${x2 + nx * k}" y2="${y2 + ny * k}"`;
  let g;
  if (sty === 1) g = `<line ${L} stroke="#1d1d1d" stroke-width="11" stroke-linecap="round"/><line ${L} stroke="${shade(c, -.12)}" stroke-width="7.500" stroke-linecap="round"/><line ${L} stroke="#fff" stroke-opacity=".5" stroke-width="7.500" stroke-dasharray="5 3"/>`;
  else if (sty === 2) g = `<line ${L} stroke="#fff" stroke-opacity=".4" stroke-width="12" stroke-linecap="round"/><line ${L} stroke="#4a3320" stroke-width="11" stroke-dasharray="2.600 4.400"/><line ${off(1)} stroke="#1d1d1d" stroke-width="4"/><line ${off(-1)} stroke="#1d1d1d" stroke-width="4"/><line ${off(1)} stroke="${c}" stroke-width="2.400"/><line ${off(-1)} stroke="${c}" stroke-width="2.400"/>`;
  else if (sty === 3) g = `<line ${L} stroke="#1d1d1d" stroke-width="11" stroke-linecap="round"/><line ${L} stroke="${c}" stroke-width="8" stroke-dasharray="6 2"/><line ${L} stroke="#fff" stroke-opacity=".28" stroke-width="2" stroke-dasharray="6 2"/>`;
  else if (sty === 4) g = `<line ${L} stroke="#0b1020" stroke-opacity=".55" stroke-width="13" stroke-linecap="round"/><line ${L} stroke="${c}" stroke-opacity=".35" stroke-width="17" stroke-linecap="round"/><line ${L} stroke="${c}" stroke-opacity=".75" stroke-width="9" stroke-linecap="round"/><line ${L} stroke="#fff" stroke-width="3.200" stroke-linecap="round"/>`;
  else g = `<line ${L} stroke="#1d1d1d" stroke-width="11" stroke-linecap="round"/><line ${L} stroke="${c}" stroke-width="7" stroke-linecap="round"/><line x1="${x1}" y1="${y1 - 1.6}" x2="${x2}" y2="${y2 - 1.6}" stroke="#fff" stroke-opacity=".38" stroke-width="2" stroke-linecap="round"/>`;
  return `<g class="${cls || ''}">${g}</g>`;
}
function robberArt(x, y, sty) {
  const sh = '<ellipse cx="0" cy="0" rx="12" ry="4.500" fill="#0006"/>', W = 'stroke="#fff" stroke-width="1.800" stroke-linejoin="round"';
  const g = [
    `${sh}<path d="M-11,0 C-11,-14 -4,-16 -3.500,-24 A6.500,6.500 0 1 1 3.500,-24 C4,-16 11,-14 11,0Z" fill="#2b2b33" ${W}/><path d="M-5,-7 Q0,-11 5,-7" stroke="#ffffff55" stroke-width="2" fill="none"/>`,
    `${sh}<path d="M-10,0 V-14 A10,10 0 0 1 10,-14 V0 L6.700,-4 L3.300,0 L0,-4 L-3.300,0 L-6.700,-4Z" fill="#f4f6ff" stroke="#6f7aa0" stroke-width="1.800" stroke-linejoin="round"/><ellipse cx="-3.500" cy="-16" rx="1.800" ry="2.600" fill="#222"/><ellipse cx="3.500" cy="-16" rx="1.800" ry="2.600" fill="#222"/><ellipse cx="0" cy="-10.500" rx="2" ry="2.600" fill="#222"/>`,
    `${sh}<path d="M-11,0 C-11,-14 -4,-16 -3.500,-24 A6.500,6.500 0 1 1 3.500,-24 C4,-16 11,-14 11,0Z" fill="#2b2b33" ${W}/><rect x="-6.500" y="-27" width="13" height="4.500" fill="#c0392b"/><ellipse cx="0" cy="-30" rx="10.500" ry="2.600" fill="#16161b" ${W}/><rect x="-5.500" y="-38" width="11" height="8.500" rx="2" fill="#16161b" ${W}/>`,
    `${sh}<path d="M-9,0 V-14 C-9,-27 9,-27 9,-14 V0Z" fill="#aab4c0" stroke="#3a4452" stroke-width="1.800" stroke-linejoin="round"/><rect x="-6.500" y="-17" width="13" height="3.200" fill="#1d2430"/><path d="M0,-25 C-6,-35 6,-38 9,-29 C5,-29 2,-27 0,-25Z" fill="#d9453d" stroke="#fff" stroke-width="1.200"/>`,
    `${sh}<path d="M7,-3 C16,-3 16,-14 10,-15" stroke="#1e1e24" stroke-width="3.400" fill="none" stroke-linecap="round"/><ellipse cx="0" cy="-7" rx="8.500" ry="8" fill="#1e1e24" ${W}/><circle cx="0" cy="-19" r="6.800" fill="#1e1e24" ${W}/><path d="M-6.800,-21 L-6,-29 L-1.500,-24Z M6.800,-21 L6,-29 L1.500,-24Z" fill="#1e1e24" ${W}/><circle cx="-2.600" cy="-19.500" r="1.700" fill="#7CFC8A"/><circle cx="2.600" cy="-19.500" r="1.700" fill="#7CFC8A"/>`,
  ][sty];
  return `<g transform="translate(${x} ${y})">${g}</g>`;
}

// ---------- Cities & Knights illustrations ----------
function mix(a, b, t) { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16), f = (x, y) => Math.round(x + (y - x) * t); return '#' + ((1 << 24) + (f(A >> 16, B >> 16) << 16) + (f((A >> 8) & 255, (B >> 8) & 255) << 8) + f(A & 255, B & 255)).toString(16).slice(1); }
function knightArt(c, lvl, active, sty, cls) {
  const ln = '#1d1d1d', W = `stroke="${ln}" stroke-width="2" stroke-linejoin="round"`, b = active ? c : mix(c, '#8c939b', .62), d = shade(b, -.34), l = shade(b, .38), sh = '<ellipse cx="0" cy="10" rx="12" ry="3.4" fill="#0006"/>';
  const g = [
    `${sh}<path d="M-9,9 V-3 C-9,-15 9,-15 9,-3 V9Z" fill="${b}" ${W}/><rect x="-6" y="-6" width="12" height="3.400" fill="${ln}"/><path d="M0,-14 C-4,-22 5,-24 8,-18 C4,-18 2,-16 0,-14Z" fill="${active ? '#ffd86b' : d}" stroke="${ln}" stroke-width="1.200"/><path d="M-5,2 H5" stroke="${l}" stroke-width="2" stroke-linecap="round"/>`,
    `${sh}<path d="M-10,-12 H10 V-1 C10,6 4,9 0,12 C-4,9 -10,6 -10,-1Z" fill="${b}" ${W}/><path d="M0,-12 V11 M-10,-3 H10" stroke="${d}" stroke-width="3"/><path d="M-10,-12 H10 V-1 C10,6 4,9 0,12 C-4,9 -10,6 -10,-1Z" fill="none" ${W}/>`,
    `${sh}<path d="M9,10 V-21" stroke="${ln}" stroke-width="3" stroke-linecap="round"/><path d="M9,-22 l-3.200,6.500 h6.400z" fill="#dfe6ee" stroke="${ln}" stroke-width="1.200"/><path d="M-9,9 V0 C-9,-6 -4,-8 -1,-8 C3,-8 6,-6 6,0 V9Z" fill="${b}" ${W}/><circle cx="-1.500" cy="-13" r="5" fill="${l}" ${W}/>`,
    `${sh}<path d="M-7,10 V-22" stroke="${ln}" stroke-width="2.400" stroke-linecap="round"/><path d="M-7,-22 H11 L7,-16 L11,-10 H-7Z" fill="${b}" ${W}/><path d="M-7,-4 H8 V10 H-7Z" fill="${d}" ${W}/><path d="M0.500,-1 v8 M-3,3 h7" stroke="${l}" stroke-width="1.800"/>`,
    `${sh}<path d="M-9,10 C-9,3 -4,2 -3,-3 C-6,-3 -9,-5 -9,-8 L-3,-15 L-2,-20 L1,-16 C8,-15 11,-9 10,-3 C9,2 8,6 9,10Z" fill="${b}" ${W}/><circle cx="3" cy="-10" r="1.500" fill="#fff"/><path d="M-3,-14 C-8,-10 -8,-4 -6,0" stroke="${d}" stroke-width="2.400" fill="none"/>`,
  ][sty];
  const badge = `<g transform="translate(11 -15)"><circle r="6.800" fill="${lvl === 3 ? '#ffd86b' : '#fff'}" stroke="${ln}" stroke-width="1.700"/><text y="3.700" text-anchor="middle" font-size="10" font-weight="900" fill="${ln}">${lvl}</text></g>`;
  return `<g class="${cls || ''}">${active ? '<ellipse cx="0" cy="10" rx="16" ry="5.400" fill="#7CFC8A" fill-opacity=".28" stroke="#7CFC8A" stroke-width="2.400"/>' : ''}${g}${badge}${active ? '' : '<text x="-12" y="-8" font-size="9" font-weight="900" fill="#fff" stroke="#1d1d1d" stroke-width="2" paint-order="stroke">z</text>'}</g>`;
}
function wallArt(sty) {
  const [f, s] = [['#c9c2b1', '#6e6757'], ['#a9783f', '#4a3320'], ['#f0d27a', '#8a6508'], ['#d9f1ff', '#5e9cc4'], ['#5fae4f', '#2c6b2a']][sty];
  if (sty === 1) return `<g>${[-16, -11, -6, -1, 4, 9, 14].map(x => `<path d="M${x - 2.4},12 V3 L${x},-1 L${x + 2.4},3 V12Z" fill="${f}" stroke="${s}" stroke-width="1.400"/>`).join('')}</g>`;
  if (sty === 4) return `<g>${[-16, -10, -4, 2, 8, 14].map((x, i) => `<circle cx="${x}" cy="${7 + (i % 2)}" r="5.400" fill="${f}" stroke="${s}" stroke-width="1.400"/>`).join('')}</g>`;
  return `<g><path d="M-20,8 Q-20,2 0,2 Q20,2 20,8 Q20,15 0,15 Q-20,15 -20,8Z" fill="${f}" stroke="${s}" stroke-width="2"/>${[-16, -10, -4, 2, 8, 14].map(x => `<rect x="${x - 2}" y="-1.500" width="4.200" height="5" fill="${f}" stroke="${s}" stroke-width="1.200"/>`).join('')}<path d="M-20,8 Q-20,15 0,15 Q20,15 20,8" fill="none" stroke="${s}" stroke-width="2"/></g>`;
}
function shipArt(sty) {
  const ln = '#1d1d1d';
  return [
    `<path d="M-18,4 Q0,14 18,4 L14,-1 H-14Z" fill="#6b4524" stroke="${ln}" stroke-width="1.600" stroke-linejoin="round"/><path d="M-18,4 C-22,0 -22,-6 -18,-9 C-18,-4 -16,-1 -14,-1" fill="#6b4524" stroke="${ln}" stroke-width="1.400"/><path d="M0,-1 V-20" stroke="${ln}" stroke-width="2"/><path d="M0,-19 L13,-14 V-4 L0,-3Z" fill="#c0392b" stroke="${ln}" stroke-width="1.400"/><path d="M4.300,-17.500 V-3.500 M8.600,-16 V-4" stroke="#fff" stroke-opacity=".7" stroke-width="1.600"/>`,
    `<path d="M-17,3 Q0,13 17,3 L13,-3 H-13Z" fill="#4a3320" stroke="${ln}" stroke-width="1.600"/><path d="M-6,-3 V-22 M6,-3 V-18" stroke="${ln}" stroke-width="1.800"/><path d="M-6,-21 L-14,-12 H-6Z M-6,-21 L3,-12 H-6Z" fill="#f4efe0" stroke="${ln}" stroke-width="1.200"/><path d="M6,-17 L0,-9 H6Z M6,-17 L13,-9 H6Z" fill="#f4efe0" stroke="${ln}" stroke-width="1.200"/><path d="M-6,-22 l7,-2 -7,-2z" fill="${ln}"/>`,
    `<rect x="-16" y="0" width="32" height="5" rx="2" fill="#a9783f" stroke="${ln}" stroke-width="1.400"/><path d="M-10,0 V5 M-3,0 V5 M4,0 V5 M11,0 V5" stroke="${ln}" stroke-width="1"/><path d="M0,0 V-16" stroke="${ln}" stroke-width="2"/><path d="M0,-16 L10,-10 L0,-6Z" fill="#e9dfc2" stroke="${ln}" stroke-width="1.200"/>`,
    `<g opacity=".9"><path d="M-17,3 Q0,13 17,3 L13,-3 H-13Z" fill="#cfe9df" stroke="#5aa58f" stroke-width="1.600"/><path d="M0,-3 V-20" stroke="#5aa58f" stroke-width="2"/><path d="M0,-19 L13,-14 L10,-9 L13,-4 L0,-3Z" fill="#e6fff6" stroke="#5aa58f" stroke-width="1.400"/><circle cx="3" cy="-11" r="1.600" fill="#2e7d67"/><circle cx="8" cy="-10" r="1.300" fill="#2e7d67"/></g>`,
    `<path d="M-19,3 Q0,12 19,3 L15,-2 H-15Z" fill="#b6322b" stroke="${ln}" stroke-width="1.600"/><path d="M-19,3 C-24,-2 -22,-10 -17,-12 C-18,-7 -16,-3 -15,-2 M19,3 C23,-1 22,-8 18,-10 C18,-6 16,-3 15,-2" fill="#b6322b" stroke="${ln}" stroke-width="1.400"/><path d="M-8,-2 V-11 M0,-2 V-11 M8,-2 V-11" stroke="${ln}" stroke-width="1.400"/>${[-8, 0, 8].map(x => `<circle cx="${x}" cy="-13" r="2.600" fill="#ffd86b" stroke="${ln}" stroke-width="1"/>`).join('')}`,
  ][sty];
}
function crownArt(sty, col) {
  const ln = '#1d1d1d', W = `stroke="${ln}" stroke-width="1.600" stroke-linejoin="round"`;
  return [
    `<path d="M-9,5 L-10,-6 L-5,-1 L0,-9 L5,-1 L10,-6 L9,5Z" fill="#ffd86b" ${W}/><rect x="-9" y="3" width="18" height="3" fill="${col}" ${W}/>`,
    `<path d="M0,-11 L3,-3 L11,-3 L5,2 L7,10 L0,5 L-7,10 L-5,2 L-11,-3 L-3,-3Z" fill="${col}" ${W}/>`,
    `<path d="M0,-12 C6,-6 8,-1 5,4 C3,7 -3,7 -5,4 C-8,-1 -3,-5 0,-12Z" fill="${col}" ${W}/><path d="M0,-3 C3,0 3,3 0,5 C-3,3 -3,0 0,-3Z" fill="#ffd86b"/>`,
    `<path d="M-8,-3 L-4,-9 H4 L8,-3 L0,9Z" fill="${col}" ${W}/><path d="M-8,-3 H8 M-4,-9 L-2,-3 L0,9 L2,-3 L4,-9" stroke="#fff" stroke-opacity=".6" stroke-width="1" fill="none"/>`,
    `<path d="M-1,7 C-10,5 -11,-4 -7,-9 M1,7 C10,5 11,-4 7,-9" stroke="#2f8a3a" stroke-width="3.400" fill="none" stroke-linecap="round"/><path d="M-1,7 C-10,5 -11,-4 -7,-9 M1,7 C10,5 11,-4 7,-9" stroke="${ln}" stroke-width="1" fill="none"/><circle cx="0" cy="-2" r="4" fill="${col}" ${W}/>`,
  ][sty];
}
function die(n, pi) {
  const DP = DICEP[pi == null ? SK.dice : pi];
  const P = { 1: [[5, 5]], 2: [[2.5, 2.5], [7.5, 7.5]], 3: [[2.5, 2.5], [5, 5], [7.5, 7.5]], 4: [[2.5, 2.5], [7.5, 2.5], [2.5, 7.5], [7.5, 7.5]], 5: [[2.5, 2.5], [7.5, 2.5], [5, 5], [2.5, 7.5], [7.5, 7.5]], 6: [[2.5, 2.5], [7.5, 2.5], [2.5, 5], [7.5, 5], [2.5, 7.5], [7.5, 7.5]] };
  return `<svg class="die2" viewBox="0 0 10 10"><rect x=".4" y=".4" width="9.2" height="9.2" rx="2" fill="${DP.f}" stroke="${DP.s}" stroke-width=".5"/>${(P[n] || []).map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".85" fill="${DP.p}"/>`).join('')}</svg>`;
}
const TI = {
  road: '<svg viewBox="0 0 24 24"><path d="M5 19L19 5" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/></svg>',
  settlement: '<svg viewBox="0 0 24 24"><path d="M4 20V10l8-7 8 7v10z" fill="#fff"/></svg>',
  city: '<svg viewBox="0 0 24 24"><path d="M2 21V12h7V6l5-4 5 4v6h3v9z" fill="#fff"/></svg>',
  dev: '<svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2.5" fill="#fff"/><text x="12" y="16.5" text-anchor="middle" font-size="12" font-weight="800" fill="#2f9fd6">?</text></svg>',
  trade: '<svg viewBox="0 0 24 24"><path d="M3 8h14l-4-4M21 16H7l4 4" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  bank: '<svg viewBox="0 0 24 24"><path d="M2 9l10-6 10 6zM4 11h3v8H4zM10.5 11h3v8h-3zM17 11h3v8h-3zM2 21h20v-2H2z" fill="#fff"/></svg>',
  dice: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4" fill="#fff"/><circle cx="8.5" cy="8.5" r="1.8" fill="#2f9fd6"/><circle cx="15.5" cy="15.5" r="1.8" fill="#2f9fd6"/><circle cx="12" cy="12" r="1.8" fill="#2f9fd6"/></svg>',
  knight: '<svg viewBox="0 0 24 24"><path d="M12 2l8 3v6c0 5-3.500 9-8 11-4.500-2-8-6-8-11V5z" fill="#fff"/><path d="M12 6v12M7 10h10" stroke="#2f9fd6" stroke-width="2"/></svg>',
  wall: '<svg viewBox="0 0 24 24"><path d="M2 21V9h3V6h3v3h2V6h4v3h2V6h3v3h3v12z" fill="#fff"/><path d="M2 15h20M8 9v6M14 15v6" stroke="#2f9fd6" stroke-width="1.500"/></svg>',
  improve: '<svg viewBox="0 0 24 24"><path d="M3 21V15h4.500v6zM9.700 21V9.500h4.500V21zM16.500 21V3h4.500v18z" fill="#fff"/></svg>',
  cards: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="12" height="16" rx="2" fill="#fff" transform="rotate(-12 9 14)"/><rect x="9" y="3" width="12" height="16" rx="2" fill="#fff" stroke="#2f9fd6" stroke-width="1.500"/><path d="M15 8l1.200 2.500 2.800.3-2 2 .6 2.700L15 14l-2.600 1.500.6-2.700-2-2 2.800-.3z" fill="#2f9fd6"/></svg>',
  end: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7" stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

// ---------- customise page ----------
function skinOpt(k, i) {
  const c = '#d9453d', bl = '#3b7dd8';
  let inner;
  if (k === 'settle') inner = `<g transform="scale(2) translate(0 -2)">${pieceArt(1, c, '', i)}</g>`;
  else if (k === 'city') inner = `<g transform="scale(1.7) translate(0 -2)">${pieceArt(2, bl, '', i)}</g>`;
  else if (k === 'road') inner = `<rect x="-32" y="-30" width="64" height="56" fill="#8cc63f"/>${roadArt(-22, 12, 22, -12, c, i)}`;
  else if (k === 'robber') inner = `<rect x="-32" y="-30" width="64" height="56" fill="#e8d8a2"/><g transform="scale(1.35) translate(0 12)">${robberArt(0, 0, i)}</g>`;
  else if (k === 'token') { const T = TOKS[i]; inner = `<defs><radialGradient id="pt${i}" cx=".4" cy=".35" r=".85"><stop offset="0" stop-color="${T.a}"/><stop offset="1" stop-color="${T.b}"/></radialGradient></defs><circle r="19" fill="url(#pt${i})" stroke="${T.st}" stroke-width="2"/><text y="7" text-anchor="middle" font-size="21" font-weight="800" fill="${T.tx}">8</text><text y="-9" text-anchor="middle" font-size="6" fill="${T.hot}">•••••</text>`; }
  else if (k === 'dice') inner = `<g transform="translate(-27 -13) scale(2.2)">${die(5, i).replace('<svg class="die2" viewBox="0 0 10 10">', '<svg width="10" height="10" viewBox="0 0 10 10">')}</g>`;
  else if (k === 'knight') inner = `<rect x="-32" y="-30" width="64" height="56" fill="#8cc63f"/><g transform="translate(-13 6) scale(1.5)">${knightArt(c, 2, true, i)}</g><g transform="translate(15 6) scale(1.15)">${knightArt(bl, 1, false, i)}</g>`;
  else if (k === 'wall') inner = `<g transform="translate(0 6) scale(1.55)">${wallArt(i)}${pieceArt(2, bl, '', SK.city)}</g>`;
  else if (k === 'ship') inner = `<rect x="-32" y="-30" width="64" height="56" fill="#2f7fc0"/><path d="M-32,14 Q-24,9 -16,14 T0,14 T16,14 T32,14" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2"/><g transform="translate(0 6) scale(1.5)">${shipArt(i)}</g>`;
  else if (k === 'metro') inner = `<g transform="translate(0 9) scale(1.15)">${pieceArt(2, bl, '', SK.city)}</g><g transform="translate(0 -19) scale(1.1)">${crownArt(i, '#b45fd0')}</g>`;
  else { const T = THEMES[i]; inner = `<defs><radialGradient id="pth${i}" cx=".5" cy=".5" r=".8"><stop offset="0" stop-color="${T.o[0]}"/><stop offset="1" stop-color="${T.o[1]}"/></radialGradient></defs><rect x="-32" y="-30" width="64" height="56" fill="url(#pth${i})"/><polygon points="0,-20 17,-10 17,10 0,20 -17,10 -17,-10" transform="translate(0 4)" fill="${T.under}"/><polygon points="0,-20 17,-10 17,10 0,20 -17,10 -17,-10" fill="#8cc63f" stroke="${T.edge}" stroke-width="2.500"/>`; }
  return `<svg viewBox="-32 -30 64 56" width="100%" height="76">${inner}</svg>`;
}
function previewBoard() {
  const hv = (cx, cy, k) => { const a = Math.PI / 180 * (60 * k - 30); return [cx + 50 * Math.cos(a), cy + 50 * Math.sin(a)]; };
  const hexes = [[120, 100, 'forest', 5], [207, 100, 'hills', 8], [163, 176, 'fields', 6]];
  const pts = (cx, cy) => [0, 1, 2, 3, 4, 5].map(k => hv(cx, cy, k).map(n => n.toFixed(1)).join(',')).join(' ');
  const T = TH(), tk = TK();
  let o = `${DEFS}<rect width="360" height="270" fill="url(#oc)"/><rect width="360" height="270" fill="url(#wv)"/><g opacity=".3">${hexes.map(([x, y]) => `<polygon points="${pts(x, y)}" fill="${T.halo}" stroke="${T.halo}" stroke-width="30" stroke-linejoin="round"/>`).join('')}</g>`;
  o += `<g filter="url(#sh)">${hexes.map(([x, y]) => `<polygon points="${pts(x, y)}" transform="translate(0 7)" fill="${T.under}" stroke="${T.under}" stroke-width="4" stroke-linejoin="round"/>`).join('')}</g>`;
  hexes.forEach(([x, y, t, n]) => { o += `<polygon points="${pts(x, y)}" fill="url(#g-${t})" stroke="${T.edge}" stroke-width="3.500" stroke-linejoin="round"/>${art(t, x, y - 31, .62)}${art(t, x, y + 32, .62)}<circle cx="${x}" cy="${y}" r="16" fill="url(#tok)" stroke="${tk.st}" stroke-width="1.500" filter="url(#sh2)"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-weight="800" font-size="16" fill="${n === 6 || n === 8 ? tk.hot : tk.tx}">${n}</text>`; });
  const a1 = hv(120, 100, 2), a2 = hv(120, 100, 1), b1 = hv(207, 100, 1), b2 = hv(207, 100, 2), s1 = hv(120, 100, 3), c1 = hv(207, 100, 0);
  o += roadArt(a1[0], a1[1], a2[0], a2[1], '#d9453d', SK.road) + roadArt(b1[0], b1[1], b2[0], b2[1], '#3b7dd8', SK.road) + roadArt(s1[0], s1[1], a1[0], a1[1], '#d9453d', SK.road);
  const k1 = hv(163, 176, 5);
  o += `<g transform="translate(${s1[0]} ${s1[1]}) scale(1.3)">${pieceArt(1, '#d9453d')}</g><g transform="translate(${c1[0]} ${c1[1]}) scale(1.3)">${wallArt(SK.wall)}${pieceArt(2, '#3b7dd8')}</g><g transform="translate(${c1[0]} ${c1[1] - 30}) scale(1.1)">${crownArt(SK.metro, '#b45fd0')}</g><g transform="translate(${k1[0]} ${k1[1]}) scale(1.25)">${knightArt('#d9453d', 2, true, SK.knight)}</g><g transform="translate(58 238) scale(1.25)">${shipArt(SK.ship)}</g>`;
  o += `<g filter="url(#sh2)">${robberArt(176, 222, SK.robber)}</g>`;
  o += `<g transform="translate(262 196)">${die(4).replace('class="die2"', 'width="38" height="38"')}</g><g transform="translate(306 196)">${die(3).replace('class="die2"', 'width="38" height="38"')}</g>`;
  return `<svg viewBox="0 0 360 270" role="img" aria-label="Live preview of your pieces">${o}</svg>`;
}
function pageCustomise(v) {
  v.innerHTML = `<div class="page"><h1>Customise your game</h1><p class="lead">Pick a look for every part of the board. Changes show instantly in the preview and are saved on this device. They only change how <b>you</b> see the game.</p>
  <div class="cgrid"><div class="cprev"><div class="cpv">${previewBoard()}</div><div class="row" style="margin-top:10px"><button class="btn cta" data-a="go" data-h="#/play">&#9654; Play now</button><button class="btn sec" data-a="skinrand">&#127922; Surprise me</button><button class="btn sec" data-a="skinreset">Reset</button></div></div>
  <div class="csecs">${SKIN_DEF.map(sec => `<section class="csec"><div class="chead"><h2>${sec.t}</h2><span class="muted">${sec.d}</span><span class="cur">${sec.n[SK[sec.k]]}</span></div><div class="copts">${sec.n.map((nm, i) => `<button class="opt ${SK[sec.k] === i ? 'on' : ''}" data-a="skin" data-k="${sec.k}" data-i="${i}" title="${nm}">${skinOpt(sec.k, i)}<span>${nm}</span></button>`).join('')}</div></section>`).join('')}</div></div></div>`;
}
function saveSkin() { try { localStorage.skin = JSON.stringify(SK); } catch (e) { /* storage unavailable */ } DEFS = mkDefs(); const v = $('#view'), y = window.scrollY; if (route().page === 'customise') { pageCustomise(v); window.scrollTo(0, y); } }

// ---------- home ----------
function miniBoard() {
  const t = ['forest', 'pasture', 'fields', 'hills', 'mountains', 'desert', 'forest', 'fields', 'pasture', 'hills', 'mountains', 'forest', 'pasture', 'fields', 'hills', 'mountains', 'fields', 'pasture', 'forest'];
  const n = [5, 2, 6, 3, 8, 0, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11, 10]; let i = 0, halo = '', under = '', tops = '', toks = '';
  for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) {
    if (Math.abs(q + r) > 2) continue;
    const cx = 50 * Math.sqrt(3) * (q + r / 2) + 260, cy = 75 * r + 190, pts = [0, 1, 2, 3, 4, 5].map(k => { const a = Math.PI / 180 * (60 * k - 30); return (cx + 50 * Math.cos(a)).toFixed(1) + ',' + (cy + 50 * Math.sin(a)).toFixed(1); }).join(' ');
    halo += `<polygon points="${pts}" fill="${TH().halo}" stroke="${TH().halo}" stroke-width="30" stroke-linejoin="round"/>`;
    under += `<polygon points="${pts}" transform="translate(0 7)" fill="${TH().under}" stroke="${TH().under}" stroke-width="4" stroke-linejoin="round"/>`;
    tops += `<polygon points="${pts}" fill="url(#g-${t[i]})" stroke="${TH().edge}" stroke-width="3.5" stroke-linejoin="round"/>` + art(t[i], cx, cy - 31, .62) + art(t[i], cx, cy + 32, .62);
    if (n[i]) toks += `<circle cx="${cx}" cy="${cy}" r="16" fill="url(#tok)" stroke="${TK().st}" stroke-width="1.5" filter="url(#sh2)"/><text x="${cx}" y="${cy + 5}" text-anchor="middle" font-weight="800" font-size="16" fill="${n[i] === 6 || n[i] === 8 ? TK().hot : TK().tx}">${n[i]}</text>`;
    i++;
  }
  const houses = [[205, 150, '#d9453d', 1], [300, 130, '#3b7dd8', 2], [330, 250, '#e8943a', 1], [215, 255, '#eceff1', 1]].map(([x, y, c, k]) => `<g transform="translate(${x} ${y}) scale(1.25)">${pieceArt(k, c)}</g>`).join('');
  return `<svg viewBox="0 -20 520 420" role="img" aria-label="Game board illustration">${DEFS}<rect y="-20" width="520" height="420" rx="14" fill="url(#oc)"/><rect y="-20" width="520" height="420" rx="14" fill="url(#wv)"/><g opacity=".3">${halo}</g><g filter="url(#sh)">${under}</g>${tops}${toks}${houses}</svg>`;
}
const MI = {
  beginner: '<path d="M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6L12 16.7 6.7 19.6l1.1-6L3.4 9.4l6-.8z" fill="#ffd86b"/>',
  duel: '<circle cx="8" cy="8" r="3.4" fill="#fff"/><circle cx="16" cy="8" r="3.4" fill="#ffd86b"/><path d="M2.5 20c.6-4 3-6 5.5-6s4.9 2 5.5 6zM10.5 20c.6-4 3-6 5.5-6s4.9 2 5.5 6z" fill="#fff" fill-opacity=".9"/>',
  classic4: '<circle cx="7" cy="7" r="3.2" fill="#ff8a80"/><circle cx="17" cy="7" r="3.2" fill="#82b1ff"/><circle cx="7" cy="17" r="3.2" fill="#ffd86b"/><circle cx="17" cy="17" r="3.2" fill="#fff"/>',
  shuffle: '<path d="M3 7h4c4 0 5 10 9 10h3M3 17h4c1.6 0 2.700-1 3.600-2.400M13.400 9.400C14.200 8 15.200 7 16 7h3M16 4l3 3-3 3M16 14l3 3-3 3" stroke="#fff" stroke-width="2.200" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  bots: '<rect x="4.500" y="8" width="15" height="11" rx="3" fill="#fff"/><circle cx="9.500" cy="13.500" r="1.800" fill="#17609b"/><circle cx="14.500" cy="13.500" r="1.800" fill="#17609b"/><path d="M12 8V4.500" stroke="#fff" stroke-width="2"/><circle cx="12" cy="3.600" r="1.500" fill="#ffd86b"/>',
  casual: '<path d="M5 9h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4zM16 10h2a2.500 2.500 0 0 1 0 5h-2" stroke="#fff" stroke-width="2" fill="#ffffff30"/><path d="M8 3v3M12 3v3" stroke="#ffd86b" stroke-width="2" stroke-linecap="round"/>',
  rush: '<path d="M13 2L4.500 13.500H11L10 22l9-12h-6.500z" fill="#ffd86b"/>',
  custom: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9M4 12h16" stroke="#fff" stroke-width="2.200" stroke-linecap="round"/><circle cx="15" cy="7" r="2.400" fill="#ffd86b"/><circle cx="9" cy="17" r="2.400" fill="#ffd86b"/><circle cx="12" cy="12" r="2.400" fill="#fff"/>',
};
const modeIco = m => MI[m.id] ? `<svg viewBox="0 0 24 24" width="26" height="26">${MI[m.id]}</svg>` : esc(m.ico);
function modeCard(m, sel, play) {
  const locked = !!m.locked;
  return `<div class="mode ${sel ? 'sel' : ''} ${locked ? 'locked' : ''}" data-a="pickmode" data-m="${m.id}" ${locked ? `title="${esc(m.locked)}"` : ''}>
    <span class="check"></span><div class="row"><div class="ico">${modeIco(m)}</div><h3>${esc(m.name)}</h3></div>
    <div class="muted">${esc(m.desc)}</div>
    <div class="meta"><span class="tag">${esc(m.players)} players</span><span class="tag">Turn: ${esc(m.turn)}</span><span class="tag">Map: ${esc(m.map)}</span>${m.diff !== '—' ? `<span class="tag">Bots: ${esc(m.diff)}</span>` : ''}${locked ? `<span class="tag lock">Locked</span>` : `<span class="tag" style="background:#cdeedb;color:#1c6b3d">Available</span>`}</div>
    ${play ? (locked ? `<div class="muted" style="font-size:11px">${esc(m.locked)}</div>` : `<button class="btn sm" data-a="playmode" data-m="${m.id}">Play ${esc(m.name)}</button>`) : ''}</div>`;
}
function resGuide() {
  const rows = [['wood', 'forest', 'Forest', 'Road · Settlement'], ['brick', 'hills', 'Hills', 'Road · Settlement'], ['sheep', 'pasture', 'Pasture', 'Settlement · Dev card'], ['wheat', 'fields', 'Fields', 'Settlement · City · Dev card'], ['ore', 'mountains', 'Mountains', 'City · Dev card']];
  return rows.map(([r, t, tn, use]) => `<div class="rg"><svg viewBox="-56 -56 112 124" width="84" height="92">${DEFS}<polygon points="0,-50 43,-25 43,25 0,50 -43,25 -43,-25" transform="translate(0 6)" fill="#8a6a2e"/><polygon points="0,-50 43,-25 43,25 0,50 -43,25 -43,-25" fill="url(#g-${t})" stroke="#f6e8b4" stroke-width="3.500" stroke-linejoin="round"/>${art(t, 0, -4, 1.45)}</svg><div><b>${RNAME[r]}</b><span class="muted">from ${tn}</span><div class="use">${use}</div></div></div>`).join('');
}
function ckShowcase() {
  const cm = COMM.map(c => `<div class="cmc" style="--c:${RCOL[c]}"><span>${ic(c, 30).replace(RCOL[c], '#fff')}</span><b>${RNAME[c]}</b><small>${{ cloth: 'City on Pasture', coin: 'City on Mountains', paper: 'City on Forest' }[c]}</small></div>`).join('');
  const art = `<svg class="art" viewBox="0 0 440 230" role="img" aria-label="A walled city with a crown, two knights and a barbarian ship">${DEFS}<rect width="440" height="230" fill="url(#oc)"/><rect width="440" height="230" fill="url(#wv)"/><ellipse cx="150" cy="150" rx="128" ry="52" fill="${TH().halo}" opacity=".5"/><ellipse cx="150" cy="150" rx="116" ry="44" fill="#8cc63f" stroke="${TH().edge}" stroke-width="4"/>
  <g transform="translate(150 142) scale(2.3)">${wallArt(SK.wall)}${pieceArt(2, '#3b7dd8')}</g><g transform="translate(150 84) scale(1.7)" filter="url(#sh2)">${crownArt(SK.metro, '#b45fd0')}</g>
  <g transform="translate(70 158) scale(1.8)">${knightArt('#d9453d', 2, true, SK.knight)}</g><g transform="translate(232 160) scale(1.8)">${knightArt('#e8943a', 3, true, SK.knight)}</g>
  <g transform="translate(350 120) scale(2.5)">${shipArt(SK.ship)}</g><path d="M300 170 Q320 158 340 170 T380 170 T420 170" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3"/>
  <g transform="translate(262 40)"><rect width="168" height="26" rx="13" fill="#10203a" opacity=".85"/><text x="84" y="17.500" text-anchor="middle" font-size="12" font-weight="800" fill="#ff9b6a">BARBARIANS INCOMING</text></g></svg>`;
  return `<h2 class="sec-title">New: Cities &amp; Knights</h2><section class="ckshow"><div>${art}</div><div><h2>Defend the island, build a metropolis</h2><p>Play the expansion with up to 4 players, on the standard board or a huge 37-hex island. Every part of it is customisable.</p><ul><li><b>Commodities:</b> cities also yield cloth, coin and paper.</li><li><b>Improvements:</b> three tracks, five levels each, with metropolises worth 2 points.</li><li><b>Knights &amp; barbarians:</b> keep active knights stronger than the raiders, or lose cities.</li><li><b>22 progress cards</b> from the Trade, Politics and Science decks.</li></ul><div class="cmrow">${cm}</div><div class="row" style="margin-top:12px"><button class="btn lg cta" data-a="playmode" data-m="ckbots">&#9654; Play C&amp;K vs bots</button><button class="btn lg ghostb" data-a="playmode" data-m="ckbig">XL island</button><button class="btn lg ghostb" data-a="go" data-h="#/customise">&#127912; Customise</button></div></div></section>`;
}
function pageHome(v) {
  const dice = [3, 4].map(die).join(''), road = `<svg viewBox="-16 -12 32 24" width="46" height="36"><line x1="-11" y1="7" x2="11" y2="-7" stroke="#1d1d1d" stroke-width="11" stroke-linecap="round"/><line x1="-11" y1="7" x2="11" y2="-7" stroke="#d9453d" stroke-width="7" stroke-linecap="round"/></svg>`;
  const step = (n, title, art2, txt) => `<div class="step"><span class="num">${n}</span><div class="sart">${art2}</div><h3>${title}</h3><p>${txt}</p></div>`;
  const cost = (name, art2, c, vp, note) => `<div class="costc"><div class="ca">${art2}</div><div><b>${name}</b><div class="cr">${c}</div><span class="muted">${note}</span></div><div class="vpb" title="Victory points">${vp}<small>VP</small></div></div>`;
  v.innerHTML = `<div class="page"><section class="hero"><div><span class="eyebrow">Free to play · no sign-up</span><h1>Build. Trade. <em>Settle.</em></h1><p>A fast online strategy game on a hexagonal island. Gather five resources, expand your roads, upgrade to cities and outwit your rivals — in your browser, with friends or bots.</p>
  <div class="row"><button class="btn lg cta" data-a="go" data-h="#/lobby">&#9654; Play online</button><button class="btn lg sec" data-a="playmode" data-m="bots">Play against bots</button><button class="btn lg ghostb" data-a="playmode" data-m="beginner">New? Try the tutorial game</button><button class="btn lg ghostb" data-a="go" data-h="#/customise">&#127912; Customise pieces</button></div>
  <div class="stats"><div><b id="st-on">${S.online || '…'}</b>players online</div><div><b id="st-games">${S.games}</b>games started</div><div><b>10</b>victory points to win</div></div></div><div class="heroart">${miniBoard()}</div></section>
  <h2 class="sec-title">How a turn works</h2><div class="steps">${step(1, 'Roll', `<span class="dd">${dice}</span>`, 'Roll two dice. Every hex showing that number pays out to players with a building on its corner.')
    + step(2, 'Collect', ['wood', 'brick', 'wheat'].map(r => `<span class="rcm" style="--c:${RCOL[r]}">${ic(r, 24).replace(RCOL[r], '#fff')}</span>`).join(''), 'Resource cards go to your hand: wood, brick, sheep, wheat and ore.')
    + step(3, 'Trade', `<svg viewBox="0 0 24 24" width="46" height="46"><path d="M3 8h14l-4-4M21 16H7l4 4" stroke="#ffd86b" stroke-width="2.600" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`, 'Swap cards with other players, or with the bank at 4:1 (better with a port).')
    + step(4, 'Build', road + `<svg viewBox="-16 -16 32 28" width="46" height="42">${pieceArt(1, '#3b7dd8')}</svg>`, 'Spend cards on roads, settlements and cities. First to 10 victory points wins.')}</div>
  ${ckShowcase()}<h2 class="sec-title">Game modes</h2><div class="cols4">${['beginner', 'classic4', 'bots', 'shuffle', 'big', 'ck', 'ckbots', 'ckbig'].map(id => MODES.find(m => m.id === id)).map(m => modeCard(m, S.mode === m.id, true)).join('')}</div>
  <div class="row" style="margin-top:10px"><a class="btn sec" href="#/play">All modes</a></div>
  <h2 class="sec-title">What each resource does</h2><div class="rgrid">${resGuide()}</div>
  <h2 class="sec-title">Building costs</h2><div class="cols4">${cost('Road', road, costHtml(COST.road), '0', 'Connects your buildings. 5+ in a row can win Longest Road.')
    + cost('Settlement', `<svg viewBox="-16 -16 32 28" width="46" height="42">${pieceArt(1, '#d9453d')}</svg>`, costHtml(COST.settlement), '1', 'Needs a free corner, 2 away from any building.')
    + cost('City', `<svg viewBox="-18 -18 36 30" width="50" height="42">${pieceArt(2, '#e8943a')}</svg>`, costHtml(COST.city), '2', 'Upgrade a settlement. Pays double.')
    + cost('Dev card', `<svg viewBox="0 0 24 24" width="42" height="42"><rect x="5" y="2" width="14" height="20" rx="2.500" fill="#f5efe0" stroke="#b9a56a" stroke-width="1.500"/><text x="12" y="16.500" text-anchor="middle" font-size="12" font-weight="800" fill="#8a6a2e">?</text></svg>`, costHtml(COST.dev), '?', 'Knights, free roads, monopoly, hidden points.')}</div>
  <h2 class="sec-title">Play your way</h2><div class="cols3"><div class="panel"><h2>Play with friends</h2><span class="muted">Create a private room and send the invitation link. <a href="#/lobby" style="text-decoration:underline">Open the lobby</a>.</span></div><div class="panel"><h2>Rules</h2><span class="muted">Searchable rules reference, also available in-game.</span><div style="margin-top:8px"><a class="btn sm sec" href="#/rules">Read the rules</a></div></div><div class="panel"><h2>Community</h2><span class="muted">Accounts, ranked play and leaderboards are planned but not built in this version. Everyone plays as a guest.</span></div></div></div>
  <footer>HexColony — original code and artwork. Not affiliated with any commercial board game.</footer>`;
  send({ t: 'rooms' });
}
function drawHomeStats() { const a = $('#st-on'), b = $('#st-games'); if (a) a.textContent = S.online; if (b) b.textContent = S.games; }

// ---------- play (mode selector) ----------
function pagePlay(v) {
  v.innerHTML = `<div class="page"><h1>Choose a game mode</h1><div class="cols4">${MODES.map(m => modeCard(m, S.mode === m.id, true)).join('')}</div><div class="row" style="margin-top:12px"><button class="btn lg" data-a="playmode" data-m="${S.mode}">Play selected mode</button><a class="btn lg sec" href="#/lobby">Browse rooms</a><a class="btn lg ghostb" href="#/customise">&#127912; Customise pieces</a></div></div>`;
}
function createFromMode(id, extra) {
  const m = MODES.find(x => x.id === id);
  if (!m || m.locked) return toast(m && m.locked ? m.locked : 'Unknown mode');
  S.mode = id; localStorage.mode = id;
  S.pendingNav = true; S.auto = (id === 'beginner' || id === 'bots' || id === 'ckbots') ? 'start' : null;
  send({ t: 'create', opts: Object.assign({ mode: id, pub: id !== 'beginner' && id !== 'bots' && id !== 'ckbots' }, extra || {}) });
}

// ---------- lobby ----------
function pageLobby(v) {
  const f = S.ui.qf;
  v.innerHTML = `<div class="page"><h1>Lobby</h1><div id="mp"></div><div class="panel"><div class="filters">
  <label class="f">Search<input id="f-q" value="${esc(f.q)}" placeholder="Room or host"></label>
  <label class="f">Mode<select id="f-mode"><option value="">Any</option>${MODES.filter(m => !m.locked).map(m => `<option value="${m.id}" ${f.mode === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}</select></label>
  <label class="f">Map<select id="f-map"><option value="">Any</option><option value="classic" ${f.map === 'classic' ? 'selected' : ''}>Classic</option><option value="shuffle" ${f.map === 'shuffle' ? 'selected' : ''}>Shuffled</option></select></label>
  <label class="f">Turn timer<select id="f-timer"><option value="">Any</option><option value="0">Untimed</option><option value="30">30s</option><option value="60">60s</option><option value="90">90s</option><option value="120">120s</option></select></label>
  <label class="f" style="flex-direction:row;align-items:center;gap:5px"><input type="checkbox" id="f-spaces" ${f.spaces ? 'checked' : ''}>Open seats only</label>
  <span class="grow"></span><button class="btn sec" data-a="refresh">Refresh</button><button class="btn" data-a="createmodal">Create room</button></div>
  <div class="row" style="margin-bottom:8px"><input id="joincode" placeholder="Room code or invite link" style="width:240px"><button class="btn sec" data-a="joincode">Join room</button></div>
  <table><thead><tr><th>Room</th><th>Mode</th><th>Map</th><th>Players</th><th>Timer</th><th>Host</th><th>Status</th><th></th></tr></thead><tbody id="rooms"></tbody></table></div></div>`;
  send({ t: 'rooms' }); drawRoomTable(); drawMp();
}
function drawMp() {
  const el = $('#mp'), M = window.__mp; if (!el || !M) { if (el) el.remove(); return; }
  const st = S.mpState || {};
  let body;
  if (M.role === 'host') body = `<b>You are hosting online.</b> Your code is <span class="mpcode">${esc(M.code)}</span>. Keep this tab open: it runs the game for everyone. Create a room below, then tell friends: open the page, go to Lobby, type this code under "Join a friend", then press Join on your room.`;
  else if (M.role === 'guest') body = `<b>Connected to host ${esc(M.code)}.</b> You see the host's lobby below: press Join on their room, or ask them for its code.`;
  else body = `<div class="row"><button class="btn" data-a="mphost">Host an online game</button><span class="muted">or</span><input id="mpcode" placeholder="Friend's code" maxlength="8" style="width:130px;text-transform:uppercase"><button class="btn sec" data-a="mpjoin">Join a friend</button></div>${st.err ? `<div class="mperr">${esc(st.err)}</div>` : ''}<div class="muted" style="margin-top:6px">Play with friends with no server: needs everyone signed in to claude.ai with Contributor access to this page. The host's tab must stay open.</div>`;
  el.innerHTML = `<div class="panel mppanel"><h2>&#127760; Play online with friends</h2>${body}</div>`;
}
function modeName(id) { const m = MODES.find(x => x.id === id); return m ? m.name : id; }
function drawRoomTable() {
  const tb = $('#rooms'); if (!tb) return;
  const f = S.ui.qf, tm = $('#f-timer') ? $('#f-timer').value : '';
  const list = S.rooms.filter(r => (!f.q || (r.name + ' ' + r.host).toLowerCase().includes(f.q.toLowerCase())) && (!f.mode || r.mode === f.mode) && (!f.map || r.map === f.map) && (tm === '' || String(r.timer) === tm) && (!f.spaces || (r.status === 'lobby' && r.players < r.max)));
  tb.innerHTML = list.length ? list.map(r => `<tr><td><b>${esc(r.name)}</b><div class="muted" style="font-size:11px">${r.code}</div></td><td>${esc(modeName(r.mode))}</td><td>${r.map === 'shuffle' ? 'Shuffled' : 'Classic'}${r.size === 'large' ? ' · Large' : ''}${r.ck ? ' · C&amp;K' : ''}</td><td>${r.players}/${r.max}</td><td>${r.timer ? r.timer + 's' : 'Off'}</td><td>${esc(r.host)}</td><td><span class="badge ${r.status === 'lobby' ? 'ok' : ''}">${r.status === 'lobby' ? 'Waiting' : r.status === 'playing' ? 'In game' : 'Finished'}</span></td>
  <td style="text-align:right">${r.status === 'lobby' && r.players < r.max ? `<button class="btn sm" data-a="join" data-c="${r.code}">Join</button>` : `<button class="btn sm sec" data-a="spectate" data-c="${r.code}">Spectate</button>`}</td></tr>`).join('') : `<tr><td colspan="8" class="muted" style="padding:20px;text-align:center">No rooms match. Create one!</td></tr>`;
}
function createModal() {
  const m = MODES.find(x => x.id === S.mode && !x.locked) || MODES[2];
  S.ui.modal = { type: 'create', mode: m.id, ck: !!m.ck, size: m.big ? 'large' : 'standard' };
  drawLobbyModal();
}
const VPDEF = { rush: 8, big: 12, ck: 13, ckbots: 13, ckbig: 16 };
function lmKeep() { const o = {}; document.querySelectorAll('#lmodal [id^="c-"]').forEach(e => { o[e.id] = e.type === 'checkbox' ? e.checked : e.value; }); return o; }
function lmRestore(o) { Object.keys(o).forEach(k => { const e = $('#' + k); if (e) { if (e.type === 'checkbox') e.checked = o[k]; else e.value = o[k]; } }); }
function drawLobbyModal() {
  let o = $('#lmodal'); if (!o) { o = document.createElement('div'); o.id = 'lmodal'; document.body.appendChild(o); }
  const m = S.ui.modal;
  if (!m || m.type !== 'create') { o.remove(); return; }
  const M = MODES.find(x => x.id === m.mode);
  o.innerHTML = `<div class="overlay"><div class="modal"><h2>Create room <button class="x" data-a="closelm">×</button></h2>
  <div class="cols3" style="grid-template-columns:1fr 1fr;margin-bottom:8px">
  <label class="f">Room name<input id="c-name" maxlength="28" placeholder="${esc((S.me || {}).name || 'Guest')}'s room"></label>
  <label class="f">Mode<select id="c-mode">${MODES.filter(x => !x.locked).map(x => `<option value="${x.id}" ${x.id === m.mode ? 'selected' : ''}>${x.name}</option>`).join('')}</select></label>
  <label class="f">Rules<select id="c-ck"><option value="0" ${m.ck ? '' : 'selected'}>Base game</option><option value="1" ${m.ck ? 'selected' : ''}>Cities &amp; Knights</option></select></label>
  <label class="f">Board size<select id="c-size"><option value="standard" ${m.size === 'standard' ? 'selected' : ''}>Standard · 19 hexes</option><option value="large" ${m.size === 'large' ? 'selected' : ''}>Large · 37 hexes</option></select></label>
  <label class="f">Map<select id="c-map"><option value="classic" ${M.map.startsWith('Classic') ? 'selected' : ''}>Classic</option><option value="shuffle" ${M.map.includes('Shuffled') ? 'selected' : ''}>Shuffled</option></select></label>
  <label class="f">Max players<select id="c-max">${[2, 3, 4].map(n => `<option ${n === (m.mode === 'duel' ? 2 : 4) ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
  <label class="f">Victory points<input id="c-vp" type="number" min="3" max="20" value="${VPDEF[m.mode] || 10}"></label>
  <label class="f">Turn timer<select id="c-timer">${[0, 30, 60, 90, 120, 180].map(t => `<option value="${t}">${t ? t + 's' : 'Off'}</option>`).join('')}</select></label>
  <label class="f">Discard limit<input id="c-discard" type="number" min="4" max="15" value="7"></label>
  ${m.ck ? `<label class="f">Barbarian steps<input id="c-barb" type="number" min="4" max="12" value="${m.mode === 'ckbig' ? 8 : 7}" title="Ship steps before an attack. Fewer steps means raids come sooner."></label>
  <label class="f" style="flex-direction:row;align-items:center;gap:6px;margin-top:16px"><input id="c-progress" type="checkbox" checked>Progress cards</label>` : ''}
  <label class="f" style="flex-direction:row;align-items:center;gap:6px;margin-top:16px"><input id="c-friendly" type="checkbox" ${m.mode === 'casual' ? 'checked' : ''}>Friendly robber</label>
  <label class="f" style="flex-direction:row;align-items:center;gap:6px"><input id="c-pub" type="checkbox" checked>Public room</label></div>
  <div class="row"><button class="btn" data-a="createroom">Create</button><button class="btn sec" data-a="closelm">Cancel</button></div></div></div>`;
  const t = $('#c-timer'); t.value = String(({ duel: 90, classic4: 120, shuffle: 120, casual: 90, rush: 30 })[m.mode] || 0);
}

// ---------- rules / settings ----------
function pageRules(v) {
  v.innerHTML = `<div class="page"><h1>Rules</h1><div class="panel"><input id="rq" placeholder="Search rules…" style="width:100%;margin-bottom:8px"><div id="rlist"></div></div></div>`;
  drawRules('#rlist', '');
}
function drawRules(sel, q) { const l = $(sel); if (!l) return; q = q.toLowerCase(); const r = RULES.filter(([t, b]) => !q || (t + ' ' + b).toLowerCase().includes(q)); l.innerHTML = r.length ? r.map(([t, b]) => `<div style="margin-bottom:10px"><b>${esc(t)}</b><div>${esc(b)}</div></div>`).join('') : '<div class="muted">No rules match.</div>'; }
function pageSettings(v) {
  v.innerHTML = `<div class="page"><h1>Settings</h1><div class="panel" style="max-width:520px"><label class="f">Display name<div class="row"><input id="s-name" maxlength="18" value="${esc(S.me ? S.me.name : '')}"><button class="btn" data-a="savename">Save</button></div></label>
  <div style="margin:12px 0"><label><input type="checkbox" id="s-cb" ${localStorage.cb === '1' ? 'checked' : ''}> Colour-blind friendly player colours</label></div>
  <div style="margin:12px 0"><label><input type="checkbox" id="s-anim" ${S.ui.noAnim ? '' : 'checked'}> Animations</label></div>
  <div class="muted">You are playing as a guest. Your session is kept in this browser so you can reconnect to a running game after a refresh. Accounts, profiles, friends and leaderboards are not part of this version.</div></div></div>`;
}

// ---------- room (waiting lobby) ----------
function pageRoom(v) {
  v.innerHTML = `<div class="page"><div id="roomhead"></div><div class="roomgrid"><div><div class="panel"><h2>Players</h2><div id="slots"></div></div><div class="panel" style="margin-top:12px"><h2>Chat</h2><div class="chatbox" id="rchat"></div><form id="chatform" class="row"><input class="grow" id="chatin" maxlength="200" placeholder="Say something…" autocomplete="off"><button class="btn">Send</button></form></div></div><div class="panel" id="settings"></div></div></div>`;
  drawRoom();
}
function isHost() { return S.room && S.me && S.room.host === S.me.id; }
function mySlot() { return S.room && S.me ? S.room.slots.findIndex(s => s.uid === S.me.id) : -1; }
function startReason(R) {
  const f = R.slots.filter(s => s.uid || s.bot);
  if (f.length < 2) return 'Need at least 2 players — add a bot';
  if (R.mode === 'duel' && f.length !== 2) return '1v1 needs exactly 2 players';
  if (f.some(s => s.uid && !s.ready)) return 'Waiting for players to ready up';
  return '';
}
function thumb(kind) {
  if (kind === 'large') {
    let o = '', i = 0; const tc = ['#7fb36f', '#a9cf6a', '#e7c85a', '#d98b5a', '#a9b3bd'];
    for (let q = -3; q <= 3; q++) for (let r = -3; r <= 3; r++) {
      if (Math.abs(q + r) > 3) continue; const cx = 10.5 * Math.sqrt(3) * (q + r / 2) + 100, cy = 15.75 * r + 55;
      o += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="6.8" fill="${tc[(i * 7 + q * 3 + r) % 5 < 0 ? 0 : (i * 7 + q * 3 + r) % 5]}"/>`; i++;
    }
    return `<svg viewBox="0 0 200 110">${o}</svg>`;
  }
  let o = ''; const n1 = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11, 0], n2 = [9, 4, 11, 6, 3, 5, 10, 8, 2, 12, 9, 5, 4, 3, 11, 10, 6, 8, 0]; const n = kind === 'shuffle' ? n2 : n1; let i = 0;
  for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) {
    if (Math.abs(q + r) > 2) continue; const cx = 14 * Math.sqrt(3) * (q + r / 2) + 100, cy = 21 * r + 55;
    o += `<circle cx="${cx}" cy="${cy}" r="9" fill="${i === 18 ? '#e0cf9a' : '#9bb98b'}"/><text x="${cx}" y="${cy + 3}" font-size="9" font-weight="700" text-anchor="middle" fill="${n[i] === 6 || n[i] === 8 ? '#c0392b' : '#222'}">${n[i] || ''}</text>`; i++;
  }
  return `<svg viewBox="0 0 200 110">${o}</svg>`;
}
function drawRoom() {
  const R = S.room; if (!R || !$('#slots')) return;
  const host = isHost(), mine = mySlot();
  document.title = 'Room ' + R.code;
  $('#roomhead').innerHTML = `<h1 class="hl-text" style="margin-bottom:6px">${esc(R.name)}</h1><div class="row" style="margin-bottom:10px;color:#c7d6e8"><span>Code <b style="color:#fff;letter-spacing:2px">${R.code}</b></span><button class="btn sm sec" data-a="copyinvite">Copy invitation link</button><a class="btn sm sec" href="#/customise">&#127912; Customise pieces</a><span class="grow"></span><button class="btn sm sec" data-a="leave">Leave room</button></div>`;
  $('#slots').innerHTML = R.slots.map((s, i) => {
    const filled = s.uid || s.bot;
    if (!filled) return `<div class="slot empty"><div class="av" style="background:#fff;color:#999;border-style:dashed">+</div><span class="grow">Open seat</span>${host ? ['easy', 'medium', 'hard'].map(d => `<button class="btn sm sec" data-a="addbot" data-d="${d}">Bot ${d}</button>`).join('') : ''}</div>`;
    const isMe = i === mine;
    return `<div class="slot"><div class="av" style="background:${PCOL[s.color]};${s.color === 'white' ? 'color:#222' : ''}">${esc((s.name || '?')[0].toUpperCase())}</div>
    <div class="grow"><b>${esc(s.name)}</b>${isMe ? ' <span class="muted">(you)</span>' : ''}<div class="row" style="gap:4px;margin-top:2px">${s.uid === R.host ? '<span class="badge host">Host</span>' : ''}${s.bot ? `<span class="badge bot">Bot · ${s.diff}</span>` : s.ready || s.uid === R.host ? '<span class="badge ok">Ready</span>' : '<span class="badge">Not ready</span>'}${!s.connected ? '<span class="badge off">Offline</span>' : ''}</div></div>
    ${isMe ? `<div class="row" style="gap:3px;max-width:96px">${COLORS.map(c => `<button class="sw ${c === s.color ? 'on' : ''}" style="background:${PCOL[c]}" data-a="color" data-c="${c}" title="${c}"></button>`).join('')}</div>` : `<span class="sw" style="background:${PCOL[s.color]};cursor:default"></span>`}
    ${host ? `<div class="row" style="gap:3px">${i > 0 ? `<button class="btn sm sec" data-a="move" data-f="${i}" data-t="${i - 1}" title="Move up">↑</button>` : ''}${i < R.slots.length - 1 ? `<button class="btn sm sec" data-a="move" data-f="${i}" data-t="${i + 1}" title="Move down">↓</button>` : ''}${s.uid !== R.host ? `<button class="btn sm danger" data-a="kick" data-i="${i}">Remove</button>` : ''}</div>` : ''}</div>`;
  }).join('') + `<div class="row" style="margin-top:8px">${host ? '' : (mine >= 0 ? `<button class="btn ${R.slots[mine].ready ? 'sec' : 'ok'}" data-a="ready">${R.slots[mine].ready ? 'Not ready' : 'Ready'}</button>` : '')}
    ${host ? (() => { const why = startReason(R); return `<button class="btn ok lg" data-a="start" ${why ? 'disabled' : ''} title="${esc(why)}">Start game</button>${why ? `<span class="muted">${esc(why)}</span>` : ''}`; })() : '<span class="muted">Waiting for the host to start…</span>'}</div>`;
  // settings
  const ro = host ? '' : 'disabled';
  $('#settings').innerHTML = `<h2>Game settings</h2>
  <div class="muted" style="margin-bottom:4px;font-weight:600">Mode</div><div class="row" style="margin-bottom:10px">${MODES.filter(m => !m.locked).map(m => `<button class="btn sm ${R.mode === m.id ? '' : 'sec'}" data-a="setmode" data-m="${m.id}" ${ro}>${m.name}</button>`).join('')}</div>
  <div class="muted" style="margin-bottom:4px;font-weight:600">Map</div><div class="row" style="margin-bottom:10px;flex-wrap:nowrap"><div class="mapcard ${R.map === 'classic' ? 'sel' : ''}" data-a="setmap" data-m="classic">${thumb('classic')}<b>Classic</b><div class="muted" style="font-size:11px">Standard number order</div></div><div class="mapcard ${R.map === 'shuffle' ? 'sel' : ''}" data-a="setmap" data-m="shuffle">${thumb('shuffle')}<b>Shuffled</b><div class="muted" style="font-size:11px">Random numbers, no touching 6/8</div></div></div>
  <div class="muted" style="margin-bottom:4px;font-weight:600">Board size</div><div class="row" style="margin-bottom:10px;flex-wrap:nowrap"><div class="mapcard ${R.size !== 'large' ? 'sel' : ''}" data-a="setsize" data-m="standard">${thumb('classic')}<b>Standard</b><div class="muted" style="font-size:11px">19 hexes · 9 harbours</div></div><div class="mapcard ${R.size === 'large' ? 'sel' : ''}" data-a="setsize" data-m="large">${thumb('large')}<b>Large island</b><div class="muted" style="font-size:11px">37 hexes · 12 harbours</div></div></div>
  <div class="muted" style="margin-bottom:4px;font-weight:600">Rules</div><div class="row" style="margin-bottom:8px"><label class="f" style="flex:1">Ruleset<select data-a="setck" ${ro}><option value="0" ${R.ck ? '' : 'selected'}>Base game</option><option value="1" ${R.ck ? 'selected' : ''}>Cities &amp; Knights</option></select></label>${R.ck ? `<label class="f" style="width:130px">Barbarian steps<input type="number" min="4" max="12" value="${R.barb || 7}" data-a="setbarb" ${ro} title="Ship steps before each attack"></label>` : ''}</div>
  ${R.ck ? `<label style="display:block;margin-bottom:8px"><input type="checkbox" data-a="setprogress" ${R.progress !== false ? 'checked' : ''} ${ro}> Progress cards (Trade, Politics and Science decks)</label>` : ''}<label style="display:block;margin-bottom:10px"><input type="checkbox" data-a="setfriendly" ${R.friendly ? 'checked' : ''} ${ro}> Friendly robber (cannot target players with 2 or fewer points)</label>
  <div class="muted" style="margin-bottom:4px;font-weight:600">Advanced</div>
  <div class="cols3" style="grid-template-columns:1fr 1fr;margin-bottom:8px">
  <label class="f">Turn timer<select data-a="settimer" ${ro}>${[0, 30, 60, 90, 120, 180].map(t => `<option value="${t}" ${R.timer === t ? 'selected' : ''}>${t ? t + 's' : 'Off'}</option>`).join('')}</select></label>
  <label class="f">Max players<select data-a="setmax" ${ro || (R.mode === 'duel' ? 'disabled' : '')}>${[2, 3, 4].map(n => `<option ${R.max === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
  <label class="f">Victory points<input type="number" min="3" max="20" value="${R.vp}" data-a="setvp" ${ro}></label>
  <label class="f">Discard limit<input type="number" min="4" max="15" value="${R.discard}" data-a="setdiscard" ${ro}></label></div>
  <label><input type="checkbox" data-a="setpub" ${R.pub ? 'checked' : ''} ${ro}> Public room (listed in the lobby)</label>${host ? '' : '<div class="muted" style="margin-top:8px">Only the host can change settings.</div>'}`;
  drawChat();
}
function chatHtml() {
  return S.chat.filter(c => !S.ui.muteAll && !S.ui.muted.has(c.n)).map(c => `<div><span class="muted">${new Date(c.t).toTimeString().slice(0, 5)}</span> <b data-a="mute" data-n="${esc(c.n)}" title="Click to mute/unmute">${esc(c.n)}</b>: ${esc(c.m)}</div>`).join('');
}
function drawChat() {
  ['#rchat', '#gchat-list'].forEach(s => { const b = $(s); if (b) { b.innerHTML = chatHtml(); b.scrollTop = b.scrollHeight; } });
}

// ---------- game page ----------
function pageGame(v) {
  v.innerHTML = `<div id="game"><div class="gmain"><div class="boardwrap"><svg id="board" xmlns="http://www.w3.org/2000/svg"></svg>
  <div class="rail"><button data-a="leavegame" title="Leave game">&#8249;</button><button data-a="modal" data-m="player" title="Players and stats">&#9776;</button><button data-a="modal" data-m="settings" title="Game info">&#9881;</button><button data-a="modal" data-m="rules" title="Rules">?</button><button data-a="sound" id="sndbtn" title="Sound on/off">&#9835;</button></div>
  <div id="ckpane" class="ckpane" style="display:none"></div><div id="status" class="statuspill">Loading…</div><div id="feed"></div><div id="dice" class="dicebox"></div>
  <div class="zoomctl"><button data-a="zoom" data-d="1.2">+</button><button data-a="zoom" data-d="0.83">−</button><button data-a="zoom" data-d="0" title="Reset view">⟲</button></div><div id="offerpane"></div></div>
  <aside class="side"><div class="shead"><span>Players</span><span class="muted" id="goal"></span></div><div id="players"></div><div class="tabs"><button data-a="tab" data-t="chat" id="tb-chat">&#128172; Chat</button><button data-a="tab" data-t="log" id="tb-log">&#128220; Game log</button></div><div id="logbox"></div>
  <div id="gchat" style="display:none;flex-direction:column"><div id="gchat-list" class="chatbox" style="flex:1;height:auto"></div><div class="chips">${['Good luck!', 'Nice roll', 'Trade?', 'Thanks', 'Sorry!'].map(t => `<button data-a="quick" data-t="${t}">${t}</button>`).join('')}</div><div class="chips">${['😀', '😂', '😮', '👍', '😢'].map(t => `<button class="em" data-a="quick" data-t="${t}">${t}</button>`).join('')}<button data-a="muteall" class="mute">Mute all</button></div><form id="chatform"><input class="grow" id="chatin" maxlength="200" autocomplete="off" placeholder="Say something…"><button class="send" title="Send">&#10148;</button></form></div></aside></div>
  <div class="gbottom" id="bottom"></div><div id="gmodal"></div></div>`;
  initBoardEvents();
  drawGame();
}
function drawGame() {
  const v = S.game;
  if (!$('#game')) return;
  if (!v || !S.board) { $('#status').textContent = 'Connecting to game…'; return; }
  document.title = 'Game ' + (S.room ? S.room.code : '');
  if (!(mineTurn(v) && v.phase === 'main')) { S.ui.mv = null; S.ui.pick = null; if (S.ui.build === 'knight' || S.ui.build === 'wall') S.ui.build = null; }
  if (v.ck) { const L0 = v.barb.last; if (S.ui.lastAtk === undefined) S.ui.lastAtk = L0 ? L0.n : 0; else if (L0 && L0.n !== S.ui.lastAtk) { S.ui.lastAtk = L0.n; S.ui.modal = { type: 'attack' }; snd('horn'); } }
  { const sum = v.dice ? v.dice[0] + v.dice[1] : 0, k = sum + ':' + v.turnNo + ':' + (v.dice || []).join(''); if (v.dice && v.phase !== 'roll' && S.ui.flashK !== k) { if (S.ui.flashK !== undefined && sum !== 7) { S.ui.flash = sum; S.ui.flashT = Date.now() + 2600; setTimeout(() => { if ($('#game') && S.game) drawBoard(); }, 2700); } S.ui.flashK = k; } if (v.phase === 'roll') S.ui.flashK = S.ui.flashK === undefined ? null : S.ui.flashK; }
  drawTop(); drawBoard(); drawCK(); drawFeed(); drawPlayers(); drawLog(); drawBottom(); drawOffer(); drawModal(); drawChat(); tabs();
}
function tabs() { const t = S.ui.tab; $('#tb-log').className = t === 'log' ? 'on' : ''; $('#tb-chat').className = t === 'chat' ? 'on' : ''; $('#logbox').style.display = t === 'log' ? '' : 'none'; const g = $('#gchat'); g.style.display = t === 'chat' ? 'flex' : 'none'; }
const mineTurn = v => v.me >= 0 && v.me === v.turn;
function statusText(v) {
  const cur = v.players[v.turn], m = mineTurn(v);
  switch (v.phase) {
    case 'setup': return m ? (v.setupSub === 'settlement' ? 'Your turn: place a settlement' : 'Your turn: place a road next to it') : `${cur.name} is placing a ${v.setupSub}…`;
    case 'roll': return m ? 'Your turn: roll the dice' : `${cur.name} is rolling…`;
    case 'discard': return v.discard ? `Discard ${v.discard} cards` : 'Waiting for players to discard…';
    case 'robber': return m ? 'Move the robber: click a highlighted hex' : `${cur.name} is moving the robber…`;
    case 'steal': return m ? 'Choose a player to steal from' : `${cur.name} is choosing who to rob…`;
    case 'main': return m ? (v.freeRoads ? `Place ${v.freeRoads} free road${v.freeRoads > 1 ? 's' : ''}` : 'Your turn: build, trade or end turn') : `${cur.name}'s turn`;
    case 'ended': return `${v.players[v.winner].name} wins!`;
  }
  return '';
}
function guide(v) {
  const P = v.players, cur = P[v.turn], m = mineTurn(v), me = v.me, nm = esc(cur.name);
  const myS = Object.values(v.bld).filter(b => b.o === me).length, myR = Object.values(v.roads).filter(o => o === me).length;
  const bn = { road: 'Road', settlement: 'Settlement', city: 'City', knight: 'Knight', wall: 'City wall' };
  if (v.phase === 'ended') return { i: 'end', t: `${esc(P[v.winner].name)} wins!`, s: 'Game over: open the menu (☰) to see the results.' };
  if (v.phase === 'discard') return v.discard ? { mine: true, i: 'trade', t: `Discard ${v.discard} cards`, s: 'A 7 was rolled and you hold too many cards. Choose which to give up.' } : { i: 'dice', t: 'A 7 was rolled', s: 'Waiting for players with too many cards to discard…' };
  if (!m) { const s = { setup: `placing a ${v.setupSub}…`, roll: 'rolling the dice…', robber: 'moving the robber…', steal: 'choosing who to rob…', main: 'building and trading…' }[v.phase] || ''; return { i: 'dice', t: `${nm}'s turn`, s: s ? `${nm} is ${s}` : '' }; }
  if (v.phase === 'setup' && v.ck && v.setupSub === 'settlement' && myS >= 1) return { mine: true, i: 'city', t: 'Place your first city', s: 'In Cities & Knights your second piece is a city: it pays out now and counts 2 points.', step: `Setup ${myS + myR + 1}/4` };
  if (v.phase === 'setup') { const n = myS + myR + 1; return v.setupSub === 'settlement' ? { mine: true, i: 'settlement', t: 'Place a settlement', s: 'Click any glowing circle on the board. It must be 2+ corners from other buildings.', step: `Setup ${n}/4` } : { mine: true, i: 'road', t: 'Now place a road', s: 'Click a glowing edge touching the settlement you just placed.', step: `Setup ${n}/4` }; }
  if (v.phase === 'roll') return { mine: true, i: 'dice', t: 'Roll the dice', s: 'Click the dice on the board or the ROLL button below.' };
  if (v.phase === 'robber') return { mine: true, i: 'dice', t: 'Move the robber', s: 'Click a highlighted hex. It stops that hex producing, and you steal a card.' };
  if (v.phase === 'steal') return { mine: true, i: 'trade', t: 'Choose who to steal from', s: 'Pick a player next to the robber in the popup.' };
  if (v.freeRoads) return { mine: true, i: 'road', t: `Place ${v.freeRoads} free road${v.freeRoads > 1 ? 's' : ''}`, s: 'Click a glowing edge on the board.' };
  if (S.ui.pick) { const pk = S.ui.pick, st = pk.steps[pk.i]; return { mine: true, i: 'cards', t: PCARD[pk.card].n, s: st.label + (st.optional ? ' (or press Skip)' : '') + '. Esc cancels.', cancel: true, skip: !!st.optional }; }
  if (S.ui.mv) return { mine: true, i: 'knight', t: 'Move your knight', s: 'Click a glowing spot along your roads. The knight becomes inactive afterwards. Esc cancels.', cancel: true };
  if (S.ui.build === 'knight') return { mine: true, i: 'knight', t: 'Recruit a knight', s: 'Click a glowing intersection connected to your roads. Costs 1 sheep + 1 ore. Esc cancels.', cancel: true };
  if (S.ui.build === 'wall') return { mine: true, i: 'wall', t: 'Build a city wall', s: 'Click one of your glowing cities. Costs 2 brick; raises your hand limit by 2. Esc cancels.', cancel: true };
  if (S.ui.build) return { mine: true, i: S.ui.build, t: `Building a ${bn[S.ui.build]}`, s: 'Click a glowing spot on the board to place it. Esc cancels.', cancel: true };
  return { mine: true, i: 'end', t: 'Your turn', s: v.ck ? 'Build, recruit knights, improve your cities, play progress cards, trade, then End Turn.' : 'Build (Road, Settlement, City), buy a card, trade, then End Turn.' };
}
function drawTop() {
  const v = S.game, m = mineTurn(v) || (v.phase === 'discard' && v.discard), g = guide(v);
  const st = $('#status'); st.innerHTML = `<span class="gi" style="--pc:${v.phase === 'ended' ? '#f0a030' : PCOL[v.players[v.turn].color]}">${TI[g.i] || TI.dice}</span><span class="gt"><b>${g.t}</b><small>${g.s}${v.me < 0 ? ' (spectating)' : ''}</small></span>${g.step ? `<span class="gstep">${g.step}</span>` : ''}${g.skip ? '<button class="gx" data-a="pickskip">Skip</button>' : ''}${g.cancel ? '<button class="gx" data-a="cancelbuild">Cancel ✕</button>' : ''}`; st.className = 'statuspill' + (m ? ' mine' : '');
  const tk = v.phase + v.turn + v.turnNo + (v.setupSub || ''); if (S.ui.lastTk !== tk) { if (S.ui.lastTk && m && v.phase !== 'ended') snd('ding'); S.ui.lastTk = tk; }
  const d = $('#dice'), canRoll = mineTurn(v) && v.phase === 'roll', key = (v.dice ? v.dice.join('') : '-') + v.turnNo + canRoll + (v.ev || '');
  if (d.dataset.k !== key) {
    d.dataset.k = key; if (v.dice && S.ui.prev) snd('dice'); const a = v.dice || [1, 1];
    d.innerHTML = die(a[0]) + die(a[1]) + (v.ck ? evDie(v.dice ? v.ev : null) : ''); d.className = 'dicebox' + (canRoll ? ' rollme' : '') + (!v.dice ? ' idle' : '') + (v.dice && !S.ui.noAnim ? ' rolled' : '');
    if (canRoll) { d.dataset.a = 'roll'; d.title = 'Click to roll'; } else { delete d.dataset.a; d.title = v.dice ? 'Total ' + (v.dice[0] + v.dice[1]) : ''; }
  }
}
// board
const SC = 64;
function boardBounds() { const vs = Object.values(S.board.verts); let a = 1e9, b = -1e9, c = 1e9, d = -1e9; vs.forEach(p => { a = Math.min(a, p.x); b = Math.max(b, p.x); c = Math.min(c, p.y); d = Math.max(d, p.y); }); const m = 2.2; return [(a - m) * SC, (c - m) * SC - 70, (b - a + 2 * m) * SC, (d - c + 2 * m) * SC + 70]; }
function highlightMode(v) {
  if (v.me < 0 || v.me !== v.turn) return null;
  if (v.phase === 'setup') return v.setupSub === 'settlement' ? 'settlement' : 'road';
  if (v.phase === 'robber') return 'robber';
  if (v.phase === 'main') return v.freeRoads ? 'road' : S.ui.pick ? 'pick' : S.ui.mv ? 'kmove' : S.ui.build;
  return null;
}
function drawBoard() {
  const v = S.game, B = S.board, svg = $('#board'), P = v.players;
  const vb = boardBounds(); svg.setAttribute('viewBox', vb.join(' '));
  const px = k => B.verts[k].x * SC, py = k => B.verts[k].y * SC;
  let o = `${DEFS}<rect x="${vb[0] - 600}" y="${vb[1] - 600}" width="${vb[2] + 1200}" height="${vb[3] + 1200}" fill="url(#oc)"/><rect x="${vb[0] - 600}" y="${vb[1] - 600}" width="${vb[2] + 1200}" height="${vb[3] + 1200}" fill="url(#wv)"/><g transform="translate(${S.ui.px} ${S.ui.py}) scale(${S.ui.zoom})" style="transform-origin:${vb[0] + vb[2] / 2}px ${vb[1] + vb[3] / 2}px;transform-box:view-box">`;
  // ports (boats + clear ratio badge)
  B.ports.forEach(p => {
    const ax = px(p.a), ay = py(p.a), bx = px(p.b), by = py(p.b), mx = (ax + bx) / 2, my = (ay + by) / 2, L = Math.hypot(mx, my) || 1, dx = mx / L, dy = my / L, tx = mx + dx * SC * 1.0, ty = my + dy * SC * 1.0, any = p.type === 'any';
    const mine = v.me >= 0 && [p.a, p.b].some(k => v.bld[k] && v.bld[k].o === v.me), col = any ? '#f4f6f8' : RCOL[p.type], ratio = any ? '3:1' : '2:1';
    const tip = any ? 'Harbor 3:1 — trade any 3 identical resources for 1 of anything' : `Harbor 2:1 ${RNAME[p.type]} — trade 2 ${RNAME[p.type]} for 1 of anything`;
    const pips = any ? RES5.map((r, i) => `<circle cx="${-16 + i * 8}" cy="0" r="3.4" fill="${RCOL[r]}" stroke="#0005" stroke-width=".7"/>`).join('') : `<g transform="translate(-23 -6) scale(.8)">${ic(p.type, 24).replace(RCOL[p.type], '#fff')}</g>`;
    o += `<line x1="${ax}" y1="${ay}" x2="${tx}" y2="${ty}" stroke="${mine ? '#ffd86b' : '#ffffffa0'}" stroke-width="${mine ? 4 : 2.5}" stroke-dasharray="${mine ? '0' : '4 4'}"/><line x1="${bx}" y1="${by}" x2="${tx}" y2="${ty}" stroke="${mine ? '#ffd86b' : '#ffffffa0'}" stroke-width="${mine ? 4 : 2.5}" stroke-dasharray="${mine ? '0' : '4 4'}"/>
    <g transform="translate(${tx} ${ty})"><title>${tip}${mine ? ' (you have this port)' : ''}</title>
    <g transform="translate(0 -6) scale(1.3)"><path d="M-16,2 L16,2 L11,11 L-11,11Z" fill="#9a7048" stroke="#4d3722" stroke-width="1.3"/><line x1="0" y1="2" x2="0" y2="-17" stroke="#4d3722" stroke-width="1.6"/><polygon points="1.5,-16 1.5,0 14,0" fill="#fff" stroke="#c9d3dd" stroke-width=".8"/><polygon points="-1.5,-12 -1.5,0 -10,0" fill="#f2f2f2" stroke="#c9d3dd" stroke-width=".8"/></g>
    <g transform="translate(0 33) scale(1.12)" filter="url(#sh2)"><rect x="-27" y="-13" width="54" height="${any ? 33 : 36}" rx="9" fill="${col}" stroke="${mine ? '#ffd86b' : '#17324f'}" stroke-width="${mine ? 3.5 : 2}"/>
    <text x="${any ? 0 : 8}" y="${any ? 2 : 8}" text-anchor="middle" font-size="15" font-weight="900" fill="${any ? '#17324f' : '#fff'}">${ratio}</text>${any ? '' : pips}
    ${any ? `<g transform="translate(0 10)">${pips.replace(/cy="0"/g, 'cy="2"')}</g>` : ''}
    <text x="0" y="${any ? 10 : 19}" text-anchor="middle" font-size="9" font-weight="800" letter-spacing=".6" fill="${any ? '#17324f' : '#fff'}" ${any ? 'display="none"' : ''}>${any ? '' : RNAME[p.type].toUpperCase()}</text></g></g>`;
  });
  // hexes: beach halo, raised edge with shadow, shaded top, picture, token
  const hp = h => h.corners.map(k => px(k) + ',' + py(k)).join(' ');
  o += `<g opacity=".32" style="pointer-events:none">${B.hexes.map(h => `<polygon points="${hp(h)}" fill="${TH().halo}" stroke="${TH().halo}" stroke-width="34" stroke-linejoin="round"/>`).join('')}</g>`;
  o += `<g filter="url(#sh)" style="pointer-events:none">${B.hexes.map(h => `<polygon points="${hp(h)}" transform="translate(0 8)" fill="${TH().under}" stroke="${TH().under}" stroke-width="5" stroke-linejoin="round"/>`).join('')}</g>`;
  B.hexes.forEach((h, hi) => {
    const pts = hp(h), cx = h.cx * SC, cy = h.cy * SC, num = v.nums ? v.nums[hi] : h.number;
    const hot = S.ui.flash && Date.now() < S.ui.flashT && num === S.ui.flash && hi !== v.robber;
    o += `<polygon class="hexp${hot ? ' flash' : ''}" points="${pts}" fill="url(#g-${h.terrain})" stroke="${TH().edge}" stroke-width="4" stroke-linejoin="round"><title>${h.terrain[0].toUpperCase() + h.terrain.slice(1)}${num ? ' · ' + num + ' · ' + (6 - Math.abs(7 - num)) + '/36 per roll' : ''}</title></polygon>`;
    o += art(h.terrain, cx, cy - SC * .5, .85) + art(h.terrain, cx, cy + SC * .52, .85);
    if (num) { const hot = num === 6 || num === 8; o += `<circle cx="${cx}" cy="${cy}" r="${SC * .34}" fill="url(#tok)" stroke="${TK().st}" stroke-width="1.6" filter="url(#sh2)" style="pointer-events:none"/><text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="${SC * .34}" font-weight="800" fill="${hot ? TK().hot : TK().tx}" style="pointer-events:none">${num}</text><text x="${cx}" y="${cy + 17}" text-anchor="middle" font-size="8" fill="${hot ? TK().hot : TK().tx}" style="pointer-events:none">${'•'.repeat(6 - Math.abs(7 - num))}</text>`; }
  });
  // robber
  const rh = B.hexes[v.robber];
  o += `<g style="pointer-events:none" filter="url(#sh2)" opacity="${v.ck && !v.barb.robberOn ? .4 : 1}"><title>${v.ck && !v.barb.robberOn ? 'The robber sleeps until the first barbarian attack' : 'Robber'}</title>${robberArt(rh.cx * SC, rh.cy * SC + SC * .6, SK.robber)}</g>`;
  // roads and buildings (new ones pop in)
  const prev = S.ui.prev, nb = {}, nr = {}; let fresh = false;
  Object.keys(v.roads).forEach(e => { const E = B.edges.find(x => x.key === e), c = PCOL[P[v.roads[e]].color]; nr[e] = 1; const f = prev && !prev.r[e]; if (f) fresh = true; o += roadArt(px(E.a), py(E.a), px(E.b), py(E.b), c, SK.road, f ? 'roadpop' : ''); });
  Object.keys(v.bld).forEach(k => { const b = v.bld[k], c = PCOL[P[b.o].color], wl = v.walls && v.walls[k], key = b.o + ':' + b.t + (wl ? 'w' : ''); nb[k] = key; const f = prev && prev.b[k] !== key; if (f) fresh = true; o += `<g transform="translate(${px(k)} ${py(k)})"><title>${esc(P[b.o].name)} · ${b.t === 1 ? 'Settlement' : 'City'}${wl ? ' with a wall' : ''}</title>${wl ? wallArt(SK.wall) : ''}${pieceArt(b.t, c, f ? 'popin' : '')}</g>`; });
  if (v.ck) {
    const own = mineTurn(v) && v.phase === 'main' && !v.freeRoads && !S.ui.pick && !S.ui.mv && !S.ui.build;
    TRACKS.forEach(t => { const mt = v.metro[t]; if (mt) o += `<g transform="translate(${px(mt.at)} ${py(mt.at) - 31})" style="pointer-events:none" filter="url(#sh2)"><title>${esc(P[mt.o].name)} · ${TRK[t].n} metropolis</title>${crownArt(SK.metro, TRK[t].col)}</g>`; });
    Object.keys(v.kn).forEach(k => { const n = v.kn[k], c = PCOL[P[n.o].color], key = 'k' + n.o + n.lvl + n.active; nb[k + 'k'] = key; const f = prev && prev.b[k + 'k'] !== key; if (f) fresh = true; const click = own && n.o === v.me; o += `<g class="kn ${click ? 'ownk' : ''}" ${click ? `data-kn="${k}"` : ''} transform="translate(${px(k)} ${py(k)}) scale(1.15)"><title>${esc(P[n.o].name)} · ${KNAME[n.lvl]} · ${n.active ? 'active (defends the island)' : 'inactive (needs 1 wheat to activate)'}${click ? ' — click for actions' : ''}</title><circle r="18" fill="#fff" fill-opacity=".001"/>${knightArt(c, n.lvl, n.active, SK.knight, f ? 'popin' : '')}</g>`; });
  }
  if (prev && fresh) snd('place');
  S.ui.prev = { b: nb, r: nr };
  // highlights
  const mode = highlightMode(v), L = v.legal;
  const mc = v.me >= 0 ? PCOL[P[v.me].color] : '#fff';
  if (mode === 'settlement' || mode === 'city') (L[mode] || []).forEach(k => { o += `<g class="ghost" data-v="${k}" transform="translate(${px(k)} ${py(k)})"><circle r="17" fill="#fff" fill-opacity=".001"/><circle class="ring" r="6"/>${pieceArt(mode === 'city' || (v.phase === 'setup' && v.ck && Object.values(v.bld).some(b => b.o === v.me)) ? 2 : 1, mc, 'piece')}</g>`; });
  if (mode === 'road') (L.road || []).forEach(e => { const E = B.edges.find(x => x.key === e); o += `<g class="ghost road" data-e="${e}"><line x1="${px(E.a)}" y1="${py(E.a)}" x2="${px(E.b)}" y2="${py(E.b)}" stroke="#fff" stroke-opacity=".001" stroke-width="22" stroke-linecap="round"/><line class="rd" x1="${px(E.a)}" y1="${py(E.a)}" x2="${px(E.b)}" y2="${py(E.b)}" stroke="#1d1d1d" stroke-width="11" stroke-linecap="round"/><line class="rd" x1="${px(E.a)}" y1="${py(E.a)}" x2="${px(E.b)}" y2="${py(E.b)}" stroke="${mc}" stroke-width="7" stroke-linecap="round"/></g>`; });
  if (mode === 'robber') (L.robber || []).forEach(id => { const h = B.hexes[id]; o += `<polygon class="hl h" data-h="${id}" points="${h.corners.map(k => px(k) + ',' + py(k)).join(' ')}"/>`; });
  if (mode === 'knight') lk('kBuild').forEach(k => { o += `<g class="ghost" data-kb="${k}" transform="translate(${px(k)} ${py(k)}) scale(1.15)"><circle r="17" fill="#fff" fill-opacity=".001"/><circle class="ring" r="6"/>${knightArt(mc, 1, true, SK.knight, 'piece')}</g>`; });
  if (mode === 'wall') lk('wall').forEach(k => { o += `<g class="ghost" data-kw="${k}" transform="translate(${px(k)} ${py(k)})"><circle r="24" fill="#fff" fill-opacity=".001"/><g class="piece">${wallArt(SK.wall)}</g><circle class="ring" r="9" cy="-14"/></g>`; });
  if (mode === 'kmove' && S.ui.mv) { const from = S.ui.mv; o += `<circle cx="${px(from)}" cy="${py(from)}" r="23" fill="none" stroke="#7CFC8A" stroke-width="3.500" stroke-dasharray="6 4" style="pointer-events:none"/>`; ((L.kMove || {})[from] || []).forEach(k => { o += `<g class="ghost" data-kmv="${k}" transform="translate(${px(k)} ${py(k)}) scale(1.15)"><circle r="17" fill="#fff" fill-opacity=".001"/><circle class="ring" r="6"/>${knightArt(mc, (v.kn[from] || {}).lvl || 1, false, SK.knight, 'piece')}</g>`; }); }
  if (mode === 'pick' && S.ui.pick) { const isHex = S.ui.pick.steps[S.ui.pick.i].list === 'hex'; pickItems(v).forEach(x => { if (isHex) o += `<polygon class="hl h" data-ph="${x}" points="${B.hexes[x].corners.map(k => px(k) + ',' + py(k)).join(' ')}"/>`; else o += `<g class="ghost" data-pv="${x}" transform="translate(${px(x)} ${py(x)})"><circle r="20" fill="#fff" fill-opacity=".001"/><circle class="ring" r="9"/></g>`; }); }
  o += '</g>';
  svg.innerHTML = o;
  svg.parentNode.classList.toggle('placing', !!mode && mode !== 'robber');
}
let drag = null;
function initBoardEvents() {
  const svg = $('#board');
  svg.addEventListener('wheel', e => { e.preventDefault(); S.ui.zoom = Math.min(3, Math.max(.5, S.ui.zoom * (e.deltaY < 0 ? 1.1 : .9))); drawBoard(); }, { passive: false });
  svg.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, px: S.ui.px, py: S.ui.py, moved: false }; });
  svg.addEventListener('pointermove', e => {
    if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return; drag.moved = true;
    const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, k = Math.max(vb.width / r.width, vb.height / r.height);
    S.ui.px = drag.px + dx * k; S.ui.py = drag.py + dy * k; drawBoard();
  });
  window.addEventListener('pointerup', () => { setTimeout(() => { drag = null; }, 0); });
  svg.addEventListener('click', e => {
    if (drag && drag.moved) return;
    const t = e.target.closest('[data-v],[data-e],[data-h],[data-kn],[data-kb],[data-kw],[data-kmv],[data-pv],[data-ph]'); const v = S.game;
    if (!t) { if (v && highlightMode(v)) { snd('err'); const sp = $('#status'); sp.classList.remove('shake'); void sp.offsetWidth; sp.classList.add('shake'); } return; }
    if (!v) return;
    if (t.dataset.v) { const kind = v.phase === 'setup' ? 'settlement' : S.ui.build; act({ type: kind, at: t.dataset.v }); S.ui.build = null; }
    else if (t.dataset.e) { act({ type: 'road', at: t.dataset.e }); if (!v.freeRoads) S.ui.build = null; }
    else if (t.dataset.h) act({ type: 'robber', at: +t.dataset.h });
    else if (t.dataset.kn) openModal('knight', { at: t.dataset.kn });
    else if (t.dataset.kb) { act({ type: 'kbuild', at: t.dataset.kb }); S.ui.build = null; }
    else if (t.dataset.kw) { act({ type: 'wall', at: t.dataset.kw }); S.ui.build = null; }
    else if (t.dataset.kmv) { act({ type: 'kmove', from: S.ui.mv, to: t.dataset.kmv }); S.ui.mv = null; }
    else if (t.dataset.pv) pickDone(t.dataset.pv);
    else if (t.dataset.ph) pickDone(t.dataset.ph);
  });
}
function drawPlayers() {
  const v = S.game, g = $('#goal'); if (g) g.textContent = 'First to ' + v.cfg.vp + ' VP';
  const order = v.players.slice().sort((a, b) => (b.idx === v.me) - (a.idx === v.me) || a.idx - b.idx);
  $('#players').innerHTML = order.map(p => `<div class="pl ${p.idx === v.turn && v.phase !== 'ended' ? 'turn' : ''} ${p.idx === v.me ? 'me' : ''}" style="--pc:${PCOL[p.color]}" data-a="modal" data-m="player" data-i="${p.idx}">
  <div class="av" style="background:${PCOL[p.color]};${p.color === 'white' ? 'color:#222' : ''}">${esc(p.name[0].toUpperCase())}${p.idx === v.turn && v.phase !== 'ended' ? '<span class="tdot" title="Their turn"></span>' : ''}</div>
  <div class="pi"><div class="pn">${esc(p.name)}${p.idx === v.me ? '<em>you</em>' : ''}${p.bot ? '<span class="badge bot">Bot</span>' : ''}${!p.connected ? '<span class="badge off">Offline</span>' : ''}</div>
  <div class="pstats"><span title="Resource cards in hand"><i class="mini card"></i>${p.cards}</span>${v.ck ? '' : `<span title="Development cards"><i class="mini dv"></i>${p.devCount}</span><span title="Knights played">&#9876; ${p.knights}</span>`}<span title="Longest road length">&#9055; ${p.roadLen}</span></div>
  ${v.ck ? `<div class="pstats ck"><span title="Improvement levels: Trade / Politics / Science">${TRACKS.map(t => `<i class="lv" style="background:${TRK[t].col}" title="${TRK[t].n} level ${p.imp[t]}">${p.imp[t]}</i>`).join('')}</span><span title="Knights: active of total · defence strength">&#9876; ${p.kn.active}/${p.kn[1] + p.kn[2] + p.kn[3]} · ${p.def}</span><span title="Progress cards in hand">&#127183; ${p.pcCount}</span>${p.walls ? `<span title="City walls">&#9632; ${p.walls}</span>` : ''}${p.metros.map(t => `<span title="${TRK[t].n} metropolis" style="color:${TRK[t].col}">&#9819;</span>`).join('')}</div>` : ''}
  ${p.longest || p.army ? `<div class="awards">${p.longest ? '<span class="badge host">&#9733; Longest road</span>' : ''}${p.army ? '<span class="badge host">&#9733; Largest army</span>' : ''}</div>` : ''}</div>
  <div class="vp" title="Victory points">${p.vp}<small>VP</small></div></div>`).join('');
}
function drawFeed() {
  const v = S.game, el = $('#feed'); if (!el) return; const lg = v.log || [];
  if (S.ui.logT === undefined) S.ui.logT = lg.length ? lg[lg.length - 1].t : 0;
  S.ui.feed = S.ui.feed || [];
  lg.forEach(l => { if (l.t > S.ui.logT) { S.ui.feed.push({ k: l.k, m: l.m, t: Date.now() }); S.ui.logT = l.t; } });
  S.ui.feed = S.ui.feed.filter(f => Date.now() - f.t < 7000).slice(-4);
  el.innerHTML = S.ui.feed.map(f => `<div class="fi k-${f.k}">${esc(f.m)}</div>`).join('');
  if (S.ui.feed.length) { clearTimeout(S.ui.ft); S.ui.ft = setTimeout(() => { if ($('#feed') && S.game) drawFeed(); }, 7100 - (Date.now() - S.ui.feed[0].t)); }
}
function drawLog() {
  const b = $('#logbox'), near = b.scrollHeight - b.scrollTop - b.clientHeight < 40;
  b.innerHTML = S.game.log.map(l => `<div class="k-${l.k}">${esc(l.m)}</div>`).join('');
  if (near) b.scrollTop = b.scrollHeight;
}
function afford(c) { const h = S.game.hand; return h && Object.keys(c).every(r => h[r] >= c[r]); }
function drawBottom() {
  const v = S.game, el = $('#bottom');
  const cur = v.players[v.turn]; el.classList.toggle('ckb', !!v.ck);
  const label = `<div class="turnlabel" style="--pc:${PCOL[cur.color]}"><b>${v.phase === 'ended' ? esc(v.players[v.winner].name) + ' won' : esc(cur.name) + "'s Turn"}</b><span id="timer"></span></div>`;
  if (v.me < 0) { el.innerHTML = '<span style="color:#fff;font-weight:700">You are spectating this game.</span><span class="spacer"></span>' + label; return; }
  const m = mineTurn(v), main = m && v.phase === 'main' && !v.freeRoads, L = v.legal, h = v.hand, ck = !!v.ck;
  S.ui.deltas = S.ui.deltas || {}; const pv = S.ui.hand;
  const gained = []; if (pv) RES.forEach(r => { const d = h[r] - (pv[r] || 0); if (d) S.ui.deltas[r] = { n: d, t: Date.now() }; if (d > 0) gained.push([r, Math.min(d, 4)]); });
  S.ui.hand = Object.assign({}, h);
  const cards = RES.map(r => { const dl = S.ui.deltas[r], showD = dl && Date.now() - dl.t < 2600; return `<div class="rc ${h[r] ? '' : 'zero'}" style="--c:${RCOL[r]}" title="${RNAME[r]}${COMM.includes(r) ? ' (commodity)' : ''}"><span class="rn">${RNAME[r]}</span>${ic(r, 26).replace(RCOL[r], '#fff')}<b>${h[r]}</b>${showD ? `<i class="dlt ${dl.n > 0 ? 'up' : 'dn'}">${dl.n > 0 ? '+' : ''}${dl.n}</i>` : ''}</div>`; }).join('');
  const tot = RES.reduce((s2, r) => s2 + (h[r] || 0), 0), hl = ck ? `<div class="hlim ${tot > v.limit ? 'over' : ''}" title="Cards in hand / discard limit. Rolling a 7 makes you discard half if you hold more than the limit. City walls raise it by 2.">${tot}<small>/${v.limit}</small><span>hand</span></div>` : '';
  if (Object.values(S.ui.deltas).some(d => Date.now() - d.t < 2600)) { clearTimeout(S.ui.dt); S.ui.dt = setTimeout(() => { if ($('#bottom') && S.game) drawBottom(); }, 2700); }
  const rsn = !m ? 'Not your turn' : v.phase === 'roll' ? 'Roll the dice first' : v.freeRoads ? 'Place your free roads first' : 'Not enough resources, or no legal spot';
  const SHORT = { 'Roll dice': 'ROLL', Road: 'Road', Settlement: 'Settlement', City: 'City', 'Development card': 'Dev Card', 'Trade with players': 'Trade', 'Trade with the bank': 'Bank', 'End turn': 'End Turn' };
  const tile = (a, label, icon, cost, ok, on, extra) => `<button class="tile ${on ? 'on' : ''} ${a === 'roll' ? 'big' : ''} ${a === 'end' ? 'endt' : ''}" data-a="${a}" ${extra || ''} ${ok ? '' : 'disabled'} title="${label}${cost && !['Trade', 'Bank', 'Improve'].includes(cost) ? ' — costs ' + cost.replace(/<[^>]+>/g, ' ').trim() : ''}${ok ? '' : ' (' + rsn + ')'}">${icon}<span class="tl">${SHORT[label] || label}</span><span class="tc">${a === 'roll' || a === 'end' ? '&nbsp;' : (cost && !['Trade', 'Bank', 'Improve'].includes(cost) ? cost : '&nbsp;')}</span></button>`;
  let devHtml = '';
  if (ck) devHtml = v.pc.map(c => { const M = PCARD[c.type] || { n: c.type, d: '' }, can = m && !v.freeRoads && !S.ui.pick && (c.type === 'alchemist' ? v.phase === 'roll' : v.phase === 'main'); return `<div class="dev pc ${c.track} ${can ? '' : 'dis'}" ${can ? `data-a="pcplay" data-t="${c.type}"` : ''} title="${esc(M.n + ': ' + M.d)}"><b>${M.n}</b><small>${TRK[c.track].n} · ${can ? 'click to play' : 'not now'}</small></div>`; }).join('') || '<div class="nocards">No progress cards yet.<small>Roll a gate on the event die</small></div>';
  else { const devs = {}; v.devs.forEach(d => { const k = d.type + (d.fresh ? '*' : ''); devs[k] = (devs[k] || 0) + 1; }); devHtml = Object.keys(devs).map(k => { const t = k.replace('*', ''), fresh = k.endsWith('*'); const can = m && !v.devPlayed && !fresh && t !== 'vp' && !v.freeRoads && (v.phase === 'main' || (v.phase === 'roll' && t === 'knight')); return `<div class="dev ${can ? '' : 'dis'}" ${can ? `data-a="playdev" data-t="${t}"` : ''} title="${esc(DEVD[t])}">${DEVN[t]} ×${devs[k]}<small>${t === 'vp' ? 'hidden point' : fresh ? 'bought this turn' : can ? 'click to play' : v.devPlayed ? 'one per turn' : 'not now'}</small></div>`; }).join(''); }
  const hasCity = Object.values(v.bld).some(b => b.o === v.me && b.t === 2);
  const mid = ck ? tile('build', 'Knight', TI.knight, costHtml({ sheep: 1, ore: 1 }), main && lk('kBuild').length, S.ui.build === 'knight', 'data-k="knight"') + tile('build', 'Wall', TI.wall, costHtml({ brick: 2 }), main && lk('wall').length, S.ui.build === 'wall', 'data-k="wall"') + tile('modal', 'Improve', TI.improve, 'Improve', main && hasCity, false, 'data-m="improve"') : tile('buydev', 'Development card', TI.dev, costHtml(COST.dev), main && afford(COST.dev) && v.deckLeft > 0, false);
  el.innerHTML = `<div class="grp res ${ck ? 'ck' : ''}">${cards}${hl}</div><div class="grp devs ${ck ? 'pcs' : ''}">${devHtml}</div><span class="spacer"></span>
  <div class="grp tiles">${m && v.phase === 'roll' ? tile('roll', 'Roll dice', TI.dice, 'Roll', true, true) : ''}
  ${tile('build', 'Road', TI.road, costHtml(COST.road), main && L.road.length, S.ui.build === 'road', 'data-k="road"')}${tile('build', 'Settlement', TI.settlement, costHtml(COST.settlement), main && L.settlement.length, S.ui.build === 'settlement', 'data-k="settlement"')}${tile('build', 'City', TI.city, costHtml(COST.city), main && L.city.length, S.ui.build === 'city', 'data-k="city"')}${mid}${tile('modal', 'Trade with players', TI.trade, 'Trade', main, false, 'data-m="trade"')}${tile('modal', 'Trade with the bank', TI.bank, 'Bank', main, false, 'data-m="bank"')}${main ? tile('end', 'End turn', TI.end, 'End turn', true, true) : ''}</div>${label}`;
  if (gained.length && !S.ui.noAnim) flyChips(gained);
}
function flyChips(list) {
  const src = $('#dice') || $('#board'); if (!src) return; const a = src.getBoundingClientRect(); let n = 0; snd('card');
  list.forEach(([r, k]) => { const i = RES.indexOf(r), dst = document.querySelectorAll('#bottom .rc')[i]; if (!dst) return; const b = dst.getBoundingClientRect();
    for (let j = 0; j < k; j++) { const c = document.createElement('div'); c.className = 'flychip'; c.style.background = RCOL[r]; c.innerHTML = ic(r, 18).replace(RCOL[r], '#fff'); document.body.appendChild(c);
      const x0 = a.left + a.width / 2 - 16 + (Math.random() - .5) * 40, y0 = a.top + a.height / 2 - 20 + (Math.random() - .5) * 40, x1 = b.left + b.width / 2 - 16, y1 = b.top + 10;
      const an = c.animate([{ transform: `translate(${x0}px,${y0}px) scale(.6)`, opacity: 0 }, { transform: `translate(${x0}px,${y0 - 30}px) scale(1.1)`, opacity: 1, offset: .25 }, { transform: `translate(${x1}px,${y1}px) scale(.8)`, opacity: .9 }], { duration: 750 + (n++) * 90, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }); an.onfinish = () => c.remove(); }
  });
}
function drawOffer() {
  const v = S.game, p = $('#offerpane'), o = v.offer;
  if (!o) { p.innerHTML = ''; return; }
  const P = v.players, isNew = S.lastOffer !== o.id; S.lastOffer = o.id;
  let body = `<b>${esc(P[o.from].name)}</b> offers<div class="res-line">${resLine(o.give)}</div>for<div class="res-line">${resLine(o.get)}</div>${o.to !== null ? `<div class="muted">to ${esc(P[o.to].name)}</div>` : '<div class="muted">to everyone</div>'}`;
  if (v.me === o.from) {
    body += P.map(q => { if (q.idx === o.from || (o.to !== null && o.to !== q.idx)) return ''; const r = o.resp[q.idx]; return `<div class="row" style="margin-top:4px"><span class="grow">${esc(q.name)}: ${r === 'accept' ? '✓ accepted' : r === 'reject' ? '✗ rejected' : '… waiting'}</span>${r === 'accept' && o.to === null ? `<button class="btn sm ok" data-a="confirm" data-w="${q.idx}">Trade</button>` : ''}</div>`; }).join('');
    body += `<div class="row" style="margin-top:6px"><button class="btn sm sec" data-a="canceloffer">Cancel offer</button><button class="btn sm sec" data-a="modal" data-m="trade" data-edit="1">Edit</button></div>`;
  } else if (v.me >= 0 && (o.to === null || o.to === v.me)) {
    const r = o.resp[v.me], can = RES.every(k => !o.get[k] || v.hand[k] >= o.get[k]);
    body += `<div class="row" style="margin-top:6px">${r === 'accept' ? '<span>✓ You accepted — waiting…</span>' : r === 'reject' ? '<span>✗ You rejected</span>' : `<button class="btn sm ok" data-a="respond" data-y="1" ${can ? '' : 'disabled title="You cannot afford this"'}>Accept</button><button class="btn sm danger" data-a="respond" data-y="0">Reject</button><button class="btn sm sec" data-a="modal" data-m="trade" data-counter="1">Counter</button>`}</div>`;
  }
  p.innerHTML = `<div class="offer ${isNew && !S.ui.noAnim ? 'new' : ''}">${body}</div>`;
}


// ---------- Cities & Knights helpers ----------
const PCARD = {
  alchemist: { n: 'Alchemist', t: 'science', d: 'Before you roll: choose the value of both dice.' },
  crane: { n: 'Crane', t: 'science', d: 'Your next city improvement costs 1 commodity less.' },
  engineer: { n: 'Engineer', t: 'science', d: 'Build a city wall for free.' },
  inventor: { n: 'Inventor', t: 'science', d: 'Swap two number tokens (not 2, 6, 8, 12 or the desert).' },
  irrigation: { n: 'Irrigation', t: 'science', d: 'Gain 2 wheat for every Fields hex next to your buildings.' },
  medicine: { n: 'Medicine', t: 'science', d: 'Upgrade a settlement to a city for 2 wheat + 1 ore.' },
  mining: { n: 'Mining', t: 'science', d: 'Gain 2 ore for every Mountains hex next to your buildings.' },
  printer: { n: 'Printer', t: 'science', d: '+1 victory point (revealed at once).' },
  roadbuilding: { n: 'Road Building', t: 'science', d: 'Build 2 roads for free.' },
  smith: { n: 'Smith', t: 'science', d: 'Promote up to 2 knights for free.' },
  merchantfleet: { n: 'Merchant Fleet', t: 'trade', d: 'This turn, trade one chosen resource or commodity 2:1 with the bank.' },
  resmonopoly: { n: 'Resource Monopoly', t: 'trade', d: 'Name a resource: every player gives you up to 2 of it.' },
  trademonopoly: { n: 'Trade Monopoly', t: 'trade', d: 'Name a commodity: every player gives you 1 of it.' },
  mastermerchant: { n: 'Master Merchant', t: 'trade', d: 'Take 2 random cards from a player with more points than you.' },
  bishop: { n: 'Bishop', t: 'politics', d: 'Move the robber and steal a card from everyone next to it.' },
  constitution: { n: 'Constitution', t: 'politics', d: '+1 victory point (revealed at once).' },
  deserter: { n: 'Deserter', t: 'politics', d: 'Remove an enemy knight; place one of the same level for yourself.' },
  intrigue: { n: 'Intrigue', t: 'politics', d: 'Drive away an enemy knight standing on a spot touching your road.' },
  saboteur: { n: 'Saboteur', t: 'politics', d: 'Players with as many points as you or more discard half their cards.' },
  spy: { n: 'Spy', t: 'politics', d: "Steal a progress card from another player's hand." },
  warlord: { n: 'Warlord', t: 'politics', d: 'Activate all your knights for free.' },
  wedding: { n: 'Wedding', t: 'politics', d: 'Every player with more points than you gives you 2 cards.' },
};
const KNAME = ['', 'Knight', 'Strong knight', 'Mighty knight'];
const lk = k => (S.game && S.game.legal && S.game.legal[k]) || [];
function evDie(ev) {
  if (!ev) return '';
  const T = ev === 'ship' ? { c: '#1c2b45', t: 'Barbarian ship: the raiders move one step closer', g: `<svg viewBox="-24 -26 48 38" width="40" height="32">${shipArt(SK.ship)}</svg>` } : { c: TRK[ev].col, t: TRK[ev].n + ' gate: if your ' + TRK[ev].n + ' level is at least the red die, draw a ' + TRK[ev].n + ' progress card', g: ic(TRK[ev].c, 30).replace(RCOL[TRK[ev].c], '#fff') };
  return `<div class="evd" style="--c:${T.c}" title="${esc(T.t)}">${T.g}<small>${ev === 'ship' ? 'SHIP' : ev.toUpperCase()}</small></div>`;
}
function pickItems(v) {
  const pk = S.ui.pick; if (!pk) return [];
  const st = pk.steps[pk.i];
  if (st.list === 'hex') { const bad = [0, 2, 6, 8, 12]; return S.board.hexes.map((h, i) => i).filter(i => { const n = v.nums ? v.nums[i] : S.board.hexes[i].number; return !bad.includes(n) && !Object.values(pk.got).includes(i); }); }
  return lk(st.list).filter(x => !Object.values(pk.got).includes(x));
}
function startPick(card, steps) {
  S.ui.build = null; S.ui.mv = null; S.ui.modal = null; S.ui.pick = { card, steps, got: {}, i: 0 };
  if (!pickItems(S.game).length) { S.ui.pick = null; toast('No legal target for ' + PCARD[card].n); }
  drawGame();
}
function pickDone(val) {
  const pk = S.ui.pick; if (!pk) return;
  pk.got[pk.steps[pk.i].key] = pk.steps[pk.i].list === 'hex' ? +val : val; pk.i++;
  if (pk.i < pk.steps.length && pk.steps[pk.i].optional && !pickItems(S.game).length) pk.i = pk.steps.length;
  if (pk.i >= pk.steps.length) { act(Object.assign({ type: 'pplay', card: pk.card }, pk.got)); S.ui.pick = null; }
  drawGame();
}
function clearModes() { S.ui.build = null; S.ui.mv = null; S.ui.pick = null; if (S.game && $('#game')) drawGame(); }
function drawCK() {
  const v = S.game, el = $('#ckpane'); if (!el) return;
  if (!v.ck) { el.innerHTML = ''; el.style.display = 'none'; return; }
  el.style.display = '';
  const b = v.barb, left = Math.max(0, b.steps - b.pos), safe = b.defense >= b.strength;
  let track = ''; for (let i = 0; i < b.steps; i++) track += `<i class="${i < b.pos ? 'f' : ''} ${i === b.pos - 1 ? 'cur' : ''}"></i>`;
  el.innerHTML = `<div class="bhead"><svg viewBox="-24 -26 48 38" width="46" height="36">${shipArt(SK.ship)}</svg><div><b>Barbarians</b><small>${left <= 1 ? 'Raid on the next ship!' : 'Raid in ' + left + ' ships'}</small></div></div>
  <div class="btrack ${left <= 2 ? 'hot' : ''}">${track}<svg class="isle" viewBox="0 0 18 14" width="20" height="16"><path d="M1 13 Q9 0 17 13Z" fill="#8cc63f" stroke="#1d1d1d" stroke-width="1.200"/></svg></div>
  <div class="bvs ${safe ? 'safe' : 'danger'}"><div title="Barbarian strength = number of cities on the board"><span>${b.strength}</span><small>Barbarians</small></div><em>${safe ? '≥' : '<'}</em><div title="Defence = total level of all active knights"><span>${b.defense}</span><small>Knights</small></div></div>
  <div class="bnote">${safe ? 'The island would hold' : 'The island would fall'}<br>${b.robberOn ? 'Robber is awake' : 'Robber sleeps until the first raid'}</div>`;
}

// ---------- game modals ----------
function openModal(t, d) { S.ui.modal = Object.assign({ type: t }, d || {}); drawModal(); }
function closeModal() { const m = S.ui.modal; if (m && m.type === 'discard') S.ui.dismissedDiscard = S.game.turnNo + 1; S.ui.modal = null; drawModal(); }
function stepper(kind, r, val, max) { return `<div class="stepper">${ic(r, 18)}<span style="width:54px">${RNAME[r]}</span><button data-a="step" data-k="${kind}" data-r="${r}" data-d="-1">−</button><b>${val}</b><button data-a="step" data-k="${kind}" data-r="${r}" data-d="1" ${val >= max ? 'disabled' : ''}>+</button></div>`; }
function drawModal() {
  const box = $('#gmodal'); if (!box) return;
  const v = S.game; let m = S.ui.modal;
  // automatic modals driven by game state
  if (v) {
    if (v.phase === 'discard' && v.discard && S.ui.dismissedDiscard !== v.turnNo + 1 && (!m || m.type !== 'discard')) m = S.ui.modal = { type: 'discard', sel: {} };
    if (v.phase === 'steal' && mineTurn(v)) m = S.ui.modal = { type: 'steal' };
    if (m && m.type === 'steal' && !(v.phase === 'steal' && mineTurn(v))) m = S.ui.modal = null;
    if (m && m.type === 'discard' && !v.discard) m = S.ui.modal = null;
    if (v.phase === 'ended' && !S.ui.endSeen && (!m || m.type !== 'end')) { m = S.ui.modal = { type: 'end' }; S.ui.endSeen = true; snd('win'); }
    if (v.phase !== 'ended') S.ui.endSeen = false;
    if (v.ck && v.aq && (!m || m.type !== 'aq')) m = S.ui.modal = { type: 'aq' };
    if (m && m.type === 'aq' && !(v.ck && v.aq)) m = S.ui.modal = null;
    if (m && m.type === 'knight' && !(v.kn && v.kn[m.at] && v.kn[m.at].o === v.me && mineTurn(v) && v.phase === 'main')) m = S.ui.modal = null;
    if (m && m.type === 'improve' && !(v.me >= 0 && mineTurn(v) && v.phase === 'main')) m = S.ui.modal = null;
  }
  if (!m || !v) { box.innerHTML = ''; return; }
  let body = '', title = '', wide = false, closable = true;
  const h = v.hand || {}, P = v.players;
  switch (m.type) {
    case 'trade': {
      m.give = m.give || {}; m.get = m.get || {};
      title = m.counter ? 'Counter offer' : 'Trade with players';
      const gv = RES.reduce((s, r) => s + (m.give[r] || 0), 0), tv = RES.reduce((s, r) => s + (m.get[r] || 0), 0), same = RES.some(r => m.give[r] && m.get[r]);
      const targets = P.filter(p => p.idx !== v.me);
      const to = m.counter ? v.turn : (m.to === undefined ? null : m.to);
      body = `<div class="cols3" style="grid-template-columns:1fr 1fr"><div><b>You give</b><div class="muted" style="margin-bottom:4px">Your hand caps each amount</div>${RES.map(r => stepper('give', r, m.give[r] || 0, h[r])).join('')}</div><div><b>You get</b><div class="muted" style="margin-bottom:4px">Request any amount</div>${RES.map(r => stepper('get', r, m.get[r] || 0, 9)).join('')}</div></div>
      ${m.counter ? `<div class="muted">Sent to ${esc(P[v.turn].name)}</div>` : `<b>Send to</b><div class="pick"><button class="${to === null ? 'on' : ''}" data-a="tto" data-i="">Everyone</button>${targets.map(p => `<button class="${to === p.idx ? 'on' : ''}" data-a="tto" data-i="${p.idx}"><span class="sw" style="background:${PCOL[p.color]};cursor:default;display:inline-block"></span>${esc(p.name)}</button>`).join('')}</div>`}
      <div class="row" style="margin-top:8px"><button class="btn" data-a="sendoffer" ${gv && tv && !same ? '' : 'disabled'}>${m.counter ? 'Send counter' : 'Send offer'}</button><button class="btn sec" data-a="closemodal">Cancel</button>${same ? '<span style="color:var(--error)">Cannot offer and request the same resource</span>' : ''}</div>`;
      break;
    }
    case 'bank': {
      title = 'Trade with the bank';
      const ratio = r => (v.ratios && v.ratios[r]) || 4;
      body = `<div class="muted">Ports you own improve your ratio automatically.</div><b>Give</b><div class="pick">${RES.map(r => `<button class="${m.give === r ? 'on' : ''}" data-a="bgive" data-r="${r}" ${h[r] >= ratio(r) ? '' : 'disabled'}>${ic(r, 18)}${RNAME[r]} <span class="tag">${ratio(r)}:1</span> <span class="muted">(have ${h[r]})</span></button>`).join('')}</div>
      <b>Get</b><div class="pick">${RES.map(r => `<button class="${m.get === r ? 'on' : ''}" data-a="bget" data-r="${r}" ${r === m.give || v.bank[r] < 1 ? 'disabled' : ''}>${ic(r, 18)}${RNAME[r]} <span class="muted">(bank ${v.bank[r]})</span></button>`).join('')}</div>
      <div class="row"><button class="btn" data-a="dobank" ${m.give && m.get ? '' : 'disabled'}>${m.give && m.get ? `Trade ${ratio(m.give)} ${RNAME[m.give]} for 1 ${RNAME[m.get]}` : 'Choose resources'}</button><button class="btn sec" data-a="closemodal">Close</button></div>`;
      break;
    }
    case 'discard': {
      m.sel = m.sel || {}; const sum = RES.reduce((s, r) => s + (m.sel[r] || 0), 0); title = `Robber! Discard ${v.discard} cards`; closable = false;
      body = `<div class="muted" style="margin-bottom:6px">Selected ${sum} of ${v.discard}</div>${RES.map(r => stepper('disc', r, m.sel[r] || 0, Math.min(h[r], 99))).join('')}<button class="btn" data-a="dodiscard" ${sum === v.discard ? '' : 'disabled'}>Discard</button>`;
      break;
    }
    case 'steal': title = 'Steal a card'; closable = false; body = `<div class="pick">${v.legal.steal.map(i => `<button data-a="dosteal" data-i="${i}"><span class="sw" style="background:${PCOL[P[i].color]};cursor:default;display:inline-block"></span>${esc(P[i].name)} · ${P[i].cards} cards</button>`).join('')}</div>`; break;
    case 'monopoly': title = 'Monopoly: choose a resource'; body = `<div class="pick">${RES5.map(r => `<button data-a="domono" data-r="${r}">${ic(r, 18)}${RNAME[r]}</button>`).join('')}</div>`; break;
    case 'yop': { m.sel = m.sel || []; title = 'Year of Plenty: pick 2 resources'; body = `<div class="pick">${RES5.map(r => `<button data-a="yoppick" data-r="${r}" ${v.bank[r] < 1 ? 'disabled' : ''}>${ic(r, 18)}${RNAME[r]}</button>`).join('')}</div><div class="row">Chosen: ${m.sel.map(r => ic(r, 18)).join(' ') || '—'} <button class="btn" data-a="doyop" ${m.sel.length === 2 ? '' : 'disabled'}>Take</button></div>`; break; }
    case 'player': {
      title = 'Players'; wide = true; const me = v.me >= 0, ck = !!v.ck;
      const tr = ck ? p => `<tr ${m.i === p.idx ? 'style="background:#fff6d6"' : ''}><td><span class="sw" style="background:${PCOL[p.color]};cursor:default;display:inline-block"></span> ${esc(p.name)}${p.bot ? ' <span class="badge bot">bot</span>' : ''}${p.connected ? '' : ' <span class="badge off">offline</span>'}</td><td>${p.vp}</td><td>${p.cards}</td><td>${p.pcCount}</td><td>${TRACKS.map(t => `<i class="lv" style="background:${TRK[t].col}">${p.imp[t]}</i>`).join('')}</td><td>${p.kn[1]}/${p.kn[2]}/${p.kn[3]}</td><td>${p.def}</td><td>${p.walls}</td><td>${p.metros.length}</td><td>${p.roadLen}</td><td>${p.pieces.settlement}/${p.pieces.city}</td></tr>` : p => `<tr ${m.i === p.idx ? 'style="background:#fff6d6"' : ''}><td><span class="sw" style="background:${PCOL[p.color]};cursor:default;display:inline-block"></span> ${esc(p.name)}${p.bot ? ' <span class="badge bot">bot</span>' : ''}${p.connected ? '' : ' <span class="badge off">offline</span>'}</td><td>${p.vp}</td><td>${p.cards}</td><td>${p.devCount}</td><td>${p.knights}</td><td>${p.roadLen}</td><td>${p.pieces.road}</td><td>${p.pieces.settlement}</td><td>${p.pieces.city}</td></tr>`;
      body = `<table><thead>${ck ? '<tr><th>Player</th><th>VP</th><th>Cards</th><th>Progress</th><th title="Trade / Politics / Science">Improve</th><th title="Knights of level 1 / 2 / 3">Knights</th><th title="Active knight strength">Defence</th><th>Walls</th><th>Metro.</th><th>Road</th><th title="Settlements / cities left">Left S/C</th></tr>' : '<tr><th>Player</th><th>VP</th><th>Cards</th><th>Dev</th><th>Knights</th><th>Road</th><th>Roads left</th><th>Settl. left</th><th>Cities left</th></tr>'}</thead><tbody>${P.map(tr).join('')}</tbody></table><div class="muted" style="margin-top:6px">Other players' hidden points stay secret until the game ends. Bank: ${RES.map(r => `${v.bank[r]}${ic(r, 12)}`).join(' ')}${ck ? '' : ' · Dev cards left: ' + v.deckLeft}${ck ? ' · Progress decks: ' + TRACKS.map(t => `${TRK[t].n} ${v.pdeck[t]}`).join(', ') : ''}</div>${me ? `<div style="margin-top:6px"><b>Your bank ratios:</b> ${RES.map(r => `${ic(r, 14)}${v.ratios[r]}:1`).join(' &nbsp; ')}</div>` : ''}`;
      break;
    }
    case 'aq': {
      title = 'Aqueduct: take a free resource'; closable = false;
      body = `<div class="muted" style="margin-bottom:6px">Nothing was produced for you this roll, so your Aqueduct (Science level 3) pays out. Choose one resource.</div><div class="pick">${RES5.map(r => `<button data-a="aqpick" data-r="${r}" ${v.bank[r] < 1 ? 'disabled' : ''}>${ic(r, 18)}${RNAME[r]}</button>`).join('')}</div>`;
      break;
    }
    case 'knight': {
      const k = v.kn[m.at], c = PCOL[P[v.me].color], L = v.legal, can = key => (L[key] || []).includes(m.at), mv = (L.kMove || {})[m.at] || [], imp = P[v.me].imp;
      title = KNAME[k.lvl] + (k.active ? ' · active' : ' · inactive');
      const why = { act: k.active ? 'Already active.' : 'Needs 1 wheat.', up: k.lvl === 3 ? 'Already a Mighty knight.' : k.lvl === 2 && imp.politics < 3 ? 'Mighty knights need Politics level 3.' : 'Needs 1 sheep + 1 ore, and a free knight slot of the next level.', mv: !k.active ? 'Only active knights can move.' : 'No free spot reachable along your roads.', ch: 'Needs an active knight next to an awake robber.' };
      body = `<div class="kview"><svg viewBox="-20 -28 40 44" width="90" height="98">${knightArt(c, k.lvl, k.active, SK.knight)}</svg><div><b>${k.active ? 'Defends the island with strength ' + k.lvl : 'Not defending: activate it before barbarians arrive'}</b><div class="muted">Moving, chasing the robber or a barbarian attack all make a knight inactive.</div></div></div>
      <div class="kacts"><button class="btn" data-a="kact" ${can('kAct') ? '' : 'disabled'}>Activate <span class="cst">1${ic('wheat', 14)}</span></button><button class="btn" data-a="kup" ${can('kUp') ? '' : 'disabled'}>Promote <span class="cst">1${ic('sheep', 14)}1${ic('ore', 14)}</span></button><button class="btn" data-a="kmovestart" ${mv.length ? '' : 'disabled'}>Move</button><button class="btn" data-a="kchase" ${can('kChase') ? '' : 'disabled'}>Chase robber</button></div>
      <ul class="why">${can('kAct') ? '' : `<li><b>Activate:</b> ${why.act}</li>`}${can('kUp') ? '' : `<li><b>Promote:</b> ${why.up}</li>`}${mv.length ? '' : `<li><b>Move:</b> ${why.mv}</li>`}${can('kChase') ? '' : `<li><b>Chase:</b> ${why.ch}</li>`}</ul>`;
      break;
    }
    case 'improve': {
      title = 'City improvements'; wide = true;
      const mine = P[v.me].imp, hasCity = Object.values(v.bld).some(b => b.o === v.me && b.t === 2);
      body = `<div class="muted" style="margin-bottom:8px">Spend commodities to raise a track. Level N costs N commodities${v.crane ? ' <b style="color:#17794a">(Crane active: 1 less)</b>' : ''}. Level 4 founds a Metropolis (+2 points); level 5 can steal one from a player below level 5.${hasCity ? '' : ' <b>You need a city to improve.</b>'}</div>` + TRACKS.map(t => {
        const T = TRK[t], lvl = mine[t], cost = Math.max(0, lvl + 1 - (v.crane ? 1 : 0)), ok = hasCity && lvl < 5 && h[T.c] >= cost, mt = v.metro[t];
        const boxes = [0, 1, 2, 3, 4].map(i => `<div class="lvbox ${i < lvl ? 'on' : ''} ${i === lvl ? 'next' : ''}" style="--c:${T.col}"><b>${i + 1}</b><span>${T.lv[i]}</span>${i === 3 ? `<em title="Level 4 founds a metropolis">${'&#9819;'}</em>` : ''}<div class="dots">${P.map(q => q.imp[t] === i + 1 ? `<i style="background:${PCOL[q.color]}" title="${esc(q.name)}"></i>` : '').join('')}</div></div>`).join('');
        return `<section class="trk" style="--c:${T.col}"><div class="th"><span class="ti">${ic(T.c, 26).replace(RCOL[T.c], '#fff')}</span><div><b>${T.n}</b><small>${T.ab}</small></div><span class="grow"></span>${mt ? `<span class="mtag" title="Metropolis owner">&#9819; ${esc(P[mt.o].name)}</span>` : ''}<button class="btn sm ${ok ? '' : 'sec'}" data-a="improve" data-t="${t}" ${ok ? '' : 'disabled'}>${lvl >= 5 ? 'Complete' : `Level ${lvl + 1}: ${cost} ${RNAME[T.c]} (have ${h[T.c]})`}</button></div><div class="lvrow">${boxes}</div></section>`;
      }).join('');
      break;
    }
    case 'pcres': { title = PCARD[m.card].n + ': choose one'; body = `<div class="muted" style="margin-bottom:6px">${PCARD[m.card].d}</div><div class="pick">${m.list.map(r => `<button data-a="pcpick" data-r="${r}">${ic(r, 18)}${RNAME[r]}</button>`).join('')}</div>`; break; }
    case 'pcplayer': {
      title = PCARD[m.card].n + ': choose a player'; const meVp = P[v.me].vp;
      const tg = P.filter(q => q.idx !== v.me && (m.card === 'spy' ? q.pcCount > 0 : q.vp > meVp && q.cards > 0));
      body = `<div class="muted" style="margin-bottom:6px">${PCARD[m.card].d}</div><div class="pick">${tg.map(q => `<button data-a="pcfrom" data-i="${q.idx}"><span class="sw" style="background:${PCOL[q.color]};cursor:default;display:inline-block"></span>${esc(q.name)} · ${m.card === 'spy' ? q.pcCount + ' card' + (q.pcCount === 1 ? '' : 's') : q.vp + ' VP'}</button>`).join('') || '<span class="muted">Nobody is a legal target right now.</span>'}</div>`;
      break;
    }
    case 'alch': {
      m.y = m.y || 1; m.r = m.r || 1; title = 'Alchemist: choose your dice';
      body = `<div class="muted" style="margin-bottom:6px">Your next roll will show exactly these values (the event die is still random).</div>${[['y', 'Yellow'], ['r', 'Red']].map(([w, nm]) => `<div style="margin:6px 0"><b>${nm} die</b> <span class="muted">${w === 'r' ? '(also the gate check)' : ''}</span><div class="pick">${[1, 2, 3, 4, 5, 6].map(n => `<button class="${m[w] === n ? 'on' : ''}" data-a="alchset" data-w="${w}" data-n="${n}" style="padding:2px 6px">${die(n, w === 'r' ? 1 : 0).replace('class="die2"', 'width="34" height="34"')}</button>`).join('')}</div></div>`).join('')}<div class="row"><button class="btn" data-a="alchgo">Set dice to ${m.y} + ${m.r}</button></div>`;
      break;
    }
    case 'attack': {
      const a = v.barb && v.barb.last; if (!a) { m = S.ui.modal = null; box.innerHTML = ''; return; }
      title = a.won ? '🛡 The island holds!' : '🔥 Barbarians pillage the island!';
      const sub = a.won ? (a.hero >= 0 ? `<b>${esc(P[a.hero].name)}</b> is Defender of the Island and earns <b>+1 victory point</b>.` : 'The best defenders tied, so each of them draws a progress card (or nobody had an active knight).') : (a.lost.length ? a.lost.map(i => `<b>${esc(P[i].name)}</b>`).join(', ') + (a.lost.length > 1 ? ' each' : '') + ' lost a city to the raiders. It is now a settlement.' : 'Every city was a metropolis, so nothing could be plundered.');
      body = `<div class="atk ${a.won ? 'won' : 'lost'}"><svg viewBox="-24 -26 48 38" width="130" height="102">${shipArt(SK.ship)}</svg><div class="bvs ${a.won ? 'safe' : 'danger'}"><div><span>${a.strength}</span><small>Barbarians</small></div><em>${a.won ? '≤' : '>'}</em><div><span>${a.defense}</span><small>Knights</small></div></div></div><div class="pop" style="margin:8px 0">${sub}</div><div class="muted" style="margin-bottom:8px">Raid #${a.n}. Every knight is now inactive, and the robber has awoken.</div><button class="btn" data-a="closemodal">Continue</button>`;
      break;
    }
    case 'rules': title = 'Rules'; body = `<input id="mrq" placeholder="Search rules…" style="width:100%;margin-bottom:8px" value="${esc(S.ui.rulesQ)}"><div id="mrlist"></div>`; break;
    case 'settings': { const c = v.cfg; title = 'Game info'; body = `<table><tbody><tr><td>Victory points</td><td>${c.vp}</td></tr><tr><td>Discard limit</td><td>${c.discardLimit}</td></tr><tr><td>Map</td><td>${c.randomNumbers ? 'Shuffled' : 'Classic'}</td></tr><tr><td>Board</td><td>${c.size === 'large' ? 'Large island · 37 hexes' : 'Standard · 19 hexes'}</td></tr><tr><td>Ruleset</td><td>${v.ck ? 'Cities &amp; Knights' : 'Base game'}</td></tr>${v.ck ? `<tr><td>Barbarian steps</td><td>${c.barbSteps}</td></tr><tr><td>Progress cards</td><td>${c.progress === false ? 'Off' : 'On'}</td></tr>` : ''}<tr><td>Friendly robber</td><td>${c.friendlyRobber ? 'On' : 'Off'}</td></tr><tr><td>Turn timer</td><td>${c.timer ? c.timer + 's' : 'Off'}</td></tr></tbody></table><div class="muted" style="margin:8px 0">Rules are fixed once a game starts so every player sees the same game. Personal options:</div><label><input type="checkbox" data-a="toganim" ${S.ui.noAnim ? '' : 'checked'}> Animations</label><div style="margin-top:8px"><button class="btn sm sec" data-a="copyinvite">Copy invitation link</button></div>`; break; }
    case 'end': {
      title = v.winner === v.me ? '🏆 Victory!' : `${P[v.winner].name} wins!`; wide = true; const st = v.stats, tab = S.ui.endTab;
      const max = Math.max(1, ...st.diceHist);
      const mmss = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
      body = `<div class="pop" style="font-size:15px;margin-bottom:8px"><b style="color:${PCOL[P[v.winner].color] === '#eceff1' ? '#333' : PCOL[P[v.winner].color]}">${esc(P[v.winner].name)}</b> won with ${P[v.winner].vp} points · ${mmss(st.duration)} · ${st.turns} turns</div>
      <div class="tabs" style="margin-bottom:8px"><button data-a="endtab" data-t="stats" class="${tab === 'stats' ? 'on' : ''}">Statistics</button><button data-a="endtab" data-t="hist" class="${tab === 'hist' ? 'on' : ''}">Game history</button></div>
      ${tab === 'stats' ? `<table><thead><tr><th>Player</th><th>VP</th><th>Gained</th><th>Spent</th><th>Roads</th><th>Settl.</th><th>Cities</th><th>Dev</th><th>Knights</th>${v.ck ? '<th>Improve</th><th>Metro.</th>' : ''}<th>Awards</th></tr></thead><tbody>${st.players.slice().sort((a, b) => b.vp - a.vp).map(p => `<tr><td><span class="sw" style="background:${PCOL[p.color]};cursor:default;display:inline-block"></span> ${esc(p.name)}</td><td><b>${p.vp}</b></td><td>${p.gained}</td><td>${p.spent}</td><td>${p.roads}</td><td>${p.settlements}</td><td>${p.cities}</td><td>${p.devs}</td><td>${p.knights}</td>${v.ck ? `<td>${TRACKS.map(t => p.imp[t]).join('/')}</td><td>${p.metros}</td>` : ''}<td>${p.longest ? 'Longest road (' + p.roadLen + ') ' : ''}${p.army ? 'Largest army' : ''}</td></tr>`).join('')}</tbody></table>
      <b style="display:block;margin:10px 0 4px">Dice rolls</b><div class="hist">${st.diceHist.map((n, i) => i < 2 ? '' : `<div><div style="height:${Math.round(n / max * 70)}px" class="bar"></div>${i}<br><b>${n}</b></div>`).join('')}</div>` : `<div style="max-height:300px;overflow:auto;background:#fff;padding:6px;border-radius:4px">${v.log.map(l => `<div class="k-${l.k}">${esc(l.m)}</div>`).join('')}</div>`}
      <div class="row" style="margin-top:12px">${S.room && S.me && S.room.host === S.me.id ? '<button class="btn ok" data-a="rematch">Play again</button>' : '<span class="muted">The host can start a rematch</span>'}<button class="btn sec" data-a="copyinvite">Invite friends</button><button class="btn sec" data-a="closemodal">View board</button><button class="btn sec" data-a="leavegame">Return home</button></div>`;
      break;
    }
  }
  box.innerHTML = `<div class="overlay" data-a="${closable ? 'overlayclose' : ''}"><div class="modal ${wide ? 'wide' : ''}"><h2>${title}${closable ? '<button class="x" data-a="closemodal">×</button>' : ''}</h2>${body}</div></div>`;
  if (m.type === 'rules') drawRules('#mrlist', S.ui.rulesQ);
}

// ---------- events ----------
const A = {
  go: t => go(t.dataset.h),
  pickmode: t => { const m = MODES.find(x => x.id === t.dataset.m); if (m.locked) return toast(m.locked); S.mode = m.id; localStorage.mode = m.id; document.querySelectorAll('.mode').forEach(c => c.classList.toggle('sel', c.dataset.m === m.id)); },
  playmode: t => createFromMode(t.dataset.m),
  refresh: () => send({ t: 'rooms' }),
  mphost: () => { S.mpState = { err: '' }; window.__mp.host((err, code) => { if (err) S.mpState = { err }; else { navigator.clipboard && navigator.clipboard.writeText(code).catch(() => 0); toast('Hosting online. Code: ' + code, true); } drawMp(); }); },
  mpjoin: () => { const c = ($('#mpcode') || {}).value; window.__mp.join(c, (err) => { if (err) { S.mpState = { err }; drawMp(); } else { S.mpState = {}; window.__reconnect(); setTimeout(() => { send({ t: 'rooms' }); drawMp(); }, 900); toast('Connected to host ' + window.__mp.code, true); } }); },
  createmodal: createModal,
  closelm: () => { S.ui.modal = null; drawLobbyModal(); },
  createroom: () => {
    const g = id => $('#' + id);
    S.pendingNav = true; S.auto = null;
    send({ t: 'create', opts: { name: g('c-name').value, mode: g('c-mode').value, map: g('c-map').value, max: +g('c-max').value, vp: +g('c-vp').value, timer: +g('c-timer').value, discard: +g('c-discard').value, friendly: g('c-friendly').checked, pub: g('c-pub').checked, ck: g('c-ck').value === '1', size: g('c-size').value, barb: g('c-barb') ? +g('c-barb').value : undefined, progress: g('c-progress') ? g('c-progress').checked : undefined } });
    S.ui.modal = null; drawLobbyModal();
  },
  joincode: () => { const c = $('#joincode').value.trim(); if (!c) return toast('Enter a room code or invitation link'); S.pendingNav = true; send({ t: 'join', code: c.replace(/^.*\/room\//i, '').replace(/^.*\/game\//i, '') }); },
  join: t => { S.pendingNav = true; send({ t: 'join', code: t.dataset.c }); },
  spectate: t => { S.pendingNav = true; send({ t: 'spectate', code: t.dataset.c }); setTimeout(() => { if (S.room && S.room.status !== 'lobby') go('#/game/' + S.room.code); }, 300); },
  savename: () => { const n = $('#s-name').value.trim(); if (n) { send({ t: 'name', name: n }); toast('Name saved', true); } },
  copyinvite: () => { const c = S.room && S.room.code; if (!c) return; (navigator.clipboard ? navigator.clipboard.writeText(inviteLink(c)) : Promise.reject()).then(() => toast('Invitation link copied', true), () => toast(inviteLink(c))); },
  leave: () => send({ t: 'leave' }),
  leavegame: () => { if (S.game && S.game.phase !== 'ended' && S.game.me >= 0 && !confirm('Leave the game? Your seat will be played automatically.')) return; send({ t: 'leave' }); go('#/home'); },
  ready: () => send({ t: 'ready' }),
  color: t => send({ t: 'color', color: t.dataset.c }),
  addbot: t => send({ t: 'addbot', diff: t.dataset.d }),
  kick: t => send({ t: 'kick', slot: +t.dataset.i }),
  move: t => send({ t: 'move', from: +t.dataset.f, to: +t.dataset.t }),
  start: () => send({ t: 'start' }),
  setmode: t => send({ t: 'settings', opts: { mode: t.dataset.m } }),
  setmap: t => send({ t: 'settings', opts: { map: t.dataset.m } }),
  setsize: t => send({ t: 'settings', opts: { size: t.dataset.m } }),
  mute: t => { const n = t.dataset.n; S.ui.muted.has(n) ? S.ui.muted.delete(n) : S.ui.muted.add(n); drawChat(); },
  muteall: () => { S.ui.muteAll = !S.ui.muteAll; drawChat(); toast(S.ui.muteAll ? 'Chat muted' : 'Chat unmuted', true); },
  quick: t => send({ t: 'chat', text: t.dataset.t }),
  tab: t => { S.ui.tab = t.dataset.t; tabs(); },
  zoom: t => { const d = +t.dataset.d; if (!d) { S.ui.zoom = 1; S.ui.px = 0; S.ui.py = 0; } else S.ui.zoom = Math.min(3, Math.max(.5, S.ui.zoom * d)); drawBoard(); },
  modal: t => { const d = {}; if (t.dataset.m === 'player' && t.dataset.i) d.i = +t.dataset.i; if (t.dataset.m === 'trade') { const o = S.game.offer; if (t.dataset.counter && o) { d.counter = true; d.give = Object.assign({}, o.get); d.get = Object.assign({}, o.give); } else if (t.dataset.edit && o) { d.give = Object.assign({}, o.give); d.get = Object.assign({}, o.get); d.to = o.to; } } openModal(t.dataset.m, d); },
  closemodal: closeModal,
  overlayclose: (t, e) => { if (e.target === t) closeModal(); },
  build: t => { const k = t.dataset.k; S.ui.mv = null; S.ui.pick = null; S.ui.build = S.ui.build === k ? null : k; drawTop(); drawBoard(); drawBottom(); },
  skin: t => { SK[t.dataset.k] = +t.dataset.i; saveSkin(); snd('place'); },
  skinrand: () => { SKIN_DEF.forEach(x => { SK[x.k] = Math.floor(Math.random() * 5); }); saveSkin(); },
  skinreset: () => { Object.keys(SK).forEach(k => { SK[k] = 0; }); saveSkin(); },
  cancelbuild: () => clearModes(),
  roll: () => act({ type: 'roll' }),
  end: () => act({ type: 'end' }),
  buydev: () => act({ type: 'buydev' }),
  playdev: t => { const k = t.dataset.t; if (k === 'monopoly') openModal('monopoly'); else if (k === 'yearofplenty') openModal('yop'); else act({ type: 'play', card: k }); },
  domono: t => { act({ type: 'play', card: 'monopoly', r1: t.dataset.r }); closeModal(); },
  yoppick: t => { const m = S.ui.modal; if (m.sel.length < 2) m.sel.push(t.dataset.r); else m.sel = [t.dataset.r]; drawModal(); },
  doyop: () => { const m = S.ui.modal; act({ type: 'play', card: 'yearofplenty', r1: m.sel[0], r2: m.sel[1] }); closeModal(); },
  step: t => { const m = S.ui.modal, k = t.dataset.k, r = t.dataset.r, d = +t.dataset.d, map = k === 'give' ? m.give : k === 'get' ? m.get : m.sel; const cap = k === 'give' ? S.game.hand[r] : k === 'disc' ? S.game.hand[r] : 9; map[r] = Math.max(0, Math.min(cap, (map[r] || 0) + d)); drawModal(); },
  tto: t => { S.ui.modal.to = t.dataset.i === '' ? null : +t.dataset.i; drawModal(); },
  sendoffer: () => { const m = S.ui.modal; act(m.counter ? { type: 'counter', give: m.give, get: m.get } : { type: 'offer', give: m.give, get: m.get, to: m.to === undefined ? null : m.to }); S.ui.modal = null; drawModal(); },
  respond: t => act({ type: 'respond', accept: t.dataset.y === '1' }),
  confirm: t => act({ type: 'confirm', with: +t.dataset.w }),
  canceloffer: () => act({ type: 'cancel' }),
  bgive: t => { const m = S.ui.modal; m.give = t.dataset.r; if (m.get === m.give) m.get = null; drawModal(); },
  bget: t => { S.ui.modal.get = t.dataset.r; drawModal(); },
  dobank: () => { const m = S.ui.modal; act({ type: 'bank', give: m.give, get: m.get }); m.get = null; drawModal(); },
  dodiscard: () => { act({ type: 'discard', res: S.ui.modal.sel }); S.ui.modal = null; },
  dosteal: t => { act({ type: 'steal', from: +t.dataset.i }); S.ui.modal = null; },
  endtab: t => { S.ui.endTab = t.dataset.t; drawModal(); },
  aqpick: t => act({ type: 'aqueduct', res: t.dataset.r }),
  kact: () => { act({ type: 'kact', at: S.ui.modal.at }); S.ui.modal = null; drawModal(); },
  kup: () => { act({ type: 'kup', at: S.ui.modal.at }); S.ui.modal = null; drawModal(); },
  kchase: () => { act({ type: 'kchase', at: S.ui.modal.at }); S.ui.modal = null; drawModal(); },
  kmovestart: () => { S.ui.mv = S.ui.modal.at; S.ui.modal = null; S.ui.build = null; drawGame(); },
  improve: t => act({ type: 'improve', track: t.dataset.t }),
  pcplay: t => {
    const c = t.dataset.t;
    if (c === 'alchemist') openModal('alch', { y: 1, r: 1 });
    else if (c === 'resmonopoly') openModal('pcres', { card: c, list: RES5 });
    else if (c === 'trademonopoly') openModal('pcres', { card: c, list: COMM });
    else if (c === 'merchantfleet') openModal('pcres', { card: c, list: RES8 });
    else if (c === 'mastermerchant' || c === 'spy') openModal('pcplayer', { card: c });
    else if (c === 'engineer') startPick(c, [{ key: 'at', list: 'cityNoWall', label: 'Click one of your cities to fortify' }]);
    else if (c === 'medicine') startPick(c, [{ key: 'at', list: 'settleOwn', label: 'Click a settlement to upgrade to a city' }]);
    else if (c === 'intrigue') startPick(c, [{ key: 'at', list: 'intrigue', label: 'Click an enemy knight touching your road' }]);
    else if (c === 'deserter') startPick(c, [{ key: 'at', list: 'oppKn', label: 'Click the enemy knight to turn' }, { key: 'to', list: 'kSpots', label: 'Click where your new knight will stand' }]);
    else if (c === 'smith') startPick(c, [{ key: 'at1', list: 'kUpAny', label: 'Click a knight to promote' }, { key: 'at2', list: 'kUpAny', label: 'Click a second knight', optional: true }]);
    else if (c === 'inventor') startPick(c, [{ key: 'h1', list: 'hex', label: 'Click the first number token' }, { key: 'h2', list: 'hex', label: 'Click the second number token' }]);
    else act({ type: 'pplay', card: c });
  },
  pcpick: t => { const m = S.ui.modal; act({ type: 'pplay', card: m.card, res: t.dataset.r }); closeModal(); },
  pcfrom: t => { const m = S.ui.modal; act({ type: 'pplay', card: m.card, from: +t.dataset.i }); closeModal(); },
  alchset: t => { S.ui.modal[t.dataset.w] = +t.dataset.n; drawModal(); },
  alchgo: () => { const m = S.ui.modal; act({ type: 'pplay', card: 'alchemist', y: m.y, r: m.r }); closeModal(); },
  pickskip: () => { const pk = S.ui.pick; if (!pk) return; act(Object.assign({ type: 'pplay', card: pk.card }, pk.got)); S.ui.pick = null; drawGame(); },
  rematch: () => send({ t: 'rematch' }),
  sound: () => { S.ui.mute = !S.ui.mute; localStorage.mute = S.ui.mute ? '1' : '0'; const b = $('#sndbtn'); if (b) b.style.opacity = S.ui.mute ? .45 : 1; toast(S.ui.mute ? 'Sound off' : 'Sound on', true); if (!S.ui.mute) snd('ding'); },
  toganim: t => { S.ui.noAnim = !t.checked; localStorage.noAnim = S.ui.noAnim ? '1' : '0'; document.body.classList.toggle('noanim', S.ui.noAnim); },
};
document.addEventListener('click', e => {
  const t = e.target.closest('[data-a]'); if (!t || t.tagName === 'SELECT' || (t.tagName === 'INPUT' && t.type !== 'checkbox')) return;
  if (t.tagName === 'INPUT' && t.type === 'checkbox') return;
  const f = A[t.dataset.a]; if (f && !t.disabled) f(t, e);
});
document.addEventListener('change', e => {
  const t = e.target, a = t.dataset && t.dataset.a, id = t.id;
  if (id === 'f-mode') { S.ui.qf.mode = t.value; drawRoomTable(); } else if (id === 'f-map') { S.ui.qf.map = t.value; drawRoomTable(); } else if (id === 'f-timer') drawRoomTable(); else if (id === 'f-spaces') { S.ui.qf.spaces = t.checked; drawRoomTable(); }
  else if (id === 'c-mode' && S.ui.modal) { const M = MODES.find(x => x.id === t.value); S.ui.modal.mode = t.value; S.ui.modal.ck = !!M.ck; S.ui.modal.size = M.big ? 'large' : 'standard'; const keep = $('#c-name').value; drawLobbyModal(); $('#c-name').value = keep; }
  else if ((id === 'c-ck' || id === 'c-size') && S.ui.modal) { const k = lmKeep(); S.ui.modal.ck = k['c-ck'] === '1'; S.ui.modal.size = k['c-size']; if (id === 'c-ck' && +k['c-vp'] === (S.ui.modal.ck ? 10 : 13)) k['c-vp'] = S.ui.modal.ck ? 13 : 10; drawLobbyModal(); lmRestore(k); }
  else if (a === 'setck') send({ t: 'settings', opts: { ck: t.value === '1' } });
  else if (a === 'setsizesel') send({ t: 'settings', opts: { size: t.value } });
  else if (a === 'setbarb') send({ t: 'settings', opts: { barb: +t.value } });
  else if (a === 'setprogress') send({ t: 'settings', opts: { progress: t.checked } });
  else if (id === 's-anim') { A.toganim(t); }
  else if (id === 's-cb') { try { localStorage.cb = t.checked ? '1' : '0'; } catch (e) { /* ignore */ } Object.assign(PCOL, t.checked ? PCOL_CB : PCOL_STD); toast(t.checked ? 'Colour-blind palette on' : 'Standard colours', true); }
  else if (a === 'settimer') send({ t: 'settings', opts: { timer: +t.value } });
  else if (a === 'setmax') send({ t: 'settings', opts: { max: +t.value } });
  else if (a === 'setvp') send({ t: 'settings', opts: { vp: +t.value } });
  else if (a === 'setdiscard') send({ t: 'settings', opts: { discard: +t.value } });
  else if (a === 'setfriendly') send({ t: 'settings', opts: { friendly: t.checked } });
  else if (a === 'setpub') send({ t: 'settings', opts: { pub: t.checked } });
  else if (a === 'toganim') A.toganim(t);
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'f-q') { S.ui.qf.q = t.value; drawRoomTable(); }
  else if (t.id === 'rq') drawRules('#rlist', t.value);
  else if (t.id === 'mrq') { S.ui.rulesQ = t.value; drawRules('#mrlist', t.value); }
});
document.addEventListener('submit', e => {
  if (e.target.id === 'chatform') { e.preventDefault(); const i = $('#chatin'); if (i.value.trim()) { send({ t: 'chat', text: i.value }); i.value = ''; } }
});
document.addEventListener('keydown', e => {
  if ($('#game') && S.game && !S.ui.modal && !/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '') && !e.ctrlKey && !e.metaKey) {
    const k = e.key.toLowerCase(), v = S.game;
    if (k === 'r' && mineTurn(v) && v.phase === 'roll') { act({ type: 'roll' }); return; }
    if (k === 'e' && mineTurn(v) && v.phase === 'main' && !v.freeRoads) { act({ type: 'end' }); return; }
    const bk = { '1': 'road', '2': 'settlement', '3': 'city', '4': v.ck ? 'knight' : null, '5': v.ck ? 'wall' : null }[k];
    if (bk && mineTurn(v) && v.phase === 'main' && !v.freeRoads) { const t = document.querySelector(`.tile[data-k="${bk}"]:not([disabled])`); if (t) A.build(t); return; }
    if (k === 't' && mineTurn(v) && v.phase === 'main') { openModal('trade'); return; }
  } if (e.key === 'Escape' && (S.ui.build || S.ui.mv || S.ui.pick) && !S.ui.modal && $('#game')) { clearModes(); return; } if (e.key === 'Escape' && S.ui.modal && S.ui.modal.type !== 'discard' && S.ui.modal.type !== 'steal' && S.ui.modal.type !== 'aq') { if ($('#gmodal')) closeModal(); else A.closelm(); } });
setInterval(() => { const el = $('#timer'); if (!el) return; if (!S.deadline || !S.game || S.game.phase === 'ended') { el.textContent = S.game && S.game.cfg.timer ? '' : ''; el.style.display = 'none'; return; } el.style.display = ''; const s = Math.max(0, Math.round((S.deadline - Date.now()) / 1000)); el.textContent = '⏱ ' + s + 's'; el.style.color = s <= 10 ? '#ff8d8d' : ''; }, 400);
document.body.classList.toggle('noanim', S.ui.noAnim);
connect();
})();

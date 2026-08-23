'use strict';

console.log('Numberjack game.js loaded');

// ============== Audio ==============
class Audio {
  constructor() { this.ctx = null; this.master = null; this.muted = false; this.musicOn = false; }
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.4;
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.5;
      this.sfxGain.connect(this.master);
    } catch(e) { console.warn('Audio failed', e); }
  }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  toggle() { this.muted = !this.muted; if (this.master) this.master.gain.value = this.muted ? 0 : 0.5; return this.muted; }
  tone(f, d, t='sine', v=0.3, s=0) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = t;
    o.frequency.setValueAtTime(f, now);
    if (s) o.frequency.exponentialRampToValueAtTime(Math.max(20, f+s), now + d);
    o.connect(g); g.connect(this.sfxGain);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(v, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, now + d);
    o.start(now); o.stop(now + d + 0.05);
  }
  noise(d, f=1500, v=0.2, t='highpass') {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const len = this.ctx.sampleRate * d;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random()*2-1) * 0.5;
    const s = this.ctx.createBufferSource(); s.buffer = buf;
    const fl = this.ctx.createBiquadFilter(); fl.type = t; fl.frequency.value = f;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(v, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + d);
    s.connect(fl); fl.connect(g); g.connect(this.sfxGain);
    s.start(now);
  }
  deal() { this.noise(0.12, 800, 0.25, 'bandpass'); this.tone(280, 0.08, 'sine', 0.15, -150); }
  flip() { this.noise(0.18, 2400, 0.15, 'highpass'); setTimeout(() => this.tone(440, 0.06, 'triangle', 0.25, 200), 40); }
  chip() { this.tone(800, 0.18, 'sine', 0.25, -300); setTimeout(() => this.tone(1200, 0.1, 'sine', 0.15, -400), 50); }
  click() { this.tone(600, 0.05, 'square', 0.18, -200); }
  correct() { [523.25, 659.25, 783.99].forEach((f,i) => setTimeout(() => this.tone(f, 0.25, 'sine', 0.2, -50), i*80)); }
  wrong() { this.tone(180, 0.2, 'sawtooth', 0.25, -80); }
  timeout() { this.tone(440, 0.3, 'sine', 0.3, -300); setTimeout(() => this.tone(220, 0.4, 'sine', 0.25, -150), 150); }
  win() { [523.25, 659.25, 783.99, 1046.5].forEach((f,i) => setTimeout(() => this.tone(f, 0.3, 'triangle', 0.2, -30), i*70)); }
  lose() { [440, 369.99, 293.66, 246.94].forEach((f,i) => setTimeout(() => this.tone(f, 0.3, 'sine', 0.18, -20), i*90)); }
  bust() { this.noise(0.4, 600, 0.4, 'lowpass'); this.tone(110, 0.5, 'sawtooth', 0.3, -50); }
  blackjack() { [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f,i) => setTimeout(() => { this.tone(f, 0.4, 'sine', 0.25, -50); this.tone(f/2, 0.4, 'triangle', 0.15, -30); }, i*60)); }
  countdown() { this.tone(880, 0.08, 'square', 0.2); }
  shuffle() { for (let i = 0; i < 6; i++) setTimeout(() => this.noise(0.1, 1500 - i*100, 0.2, 'bandpass'), i*60); }
  startMusic() {
    if (!this.ctx || this.musicOn || this.muted) return;
    this.musicOn = true;
    // Gentle classical waltz progression (I - V - vi - IV in C major), arpeggiated softly
    const chords = [
      [261.63, 329.63, 392.00, 523.25],  // C major
      [196.00, 246.94, 293.66, 392.00],  // G major
      [220.00, 261.63, 329.63, 440.00],  // A minor
      [174.61, 220.00, 261.63, 349.23],  // F major
    ];
    const bass = [130.81, 98.00, 110.00, 87.31];
    let ci = 0, ni = 0, bi = 0;
    const beat = 60/76, ndur = beat * 0.62; // slow, waltz-ish tempo, played softly in the background
    const playN = () => {
      if (!this.musicOn || this.muted || !this.ctx) return;
      const c = chords[ci % chords.length];
      const n = c[ni % c.length];
      const now = this.ctx.currentTime;
      // soft piano-like tone: sine fundamental + faint triangle overtone
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'sine'; o.frequency.value = n;
      g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.16, now+0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now+ndur*1.4);
      o.connect(g); g.connect(this.musicGain); o.start(now); o.stop(now+ndur*1.4);
      const o2 = this.ctx.createOscillator(), g2 = this.ctx.createGain();
      o2.type = 'triangle'; o2.frequency.value = n*2;
      g2.gain.setValueAtTime(0, now); g2.gain.linearRampToValueAtTime(0.035, now+0.02);
      g2.gain.exponentialRampToValueAtTime(0.001, now+ndur*0.8);
      o2.connect(g2); g2.connect(this.musicGain); o2.start(now); o2.stop(now+ndur*0.8);
      ni++; if (ni >= c.length*3) { ni = 0; ci++; }
    };
    const playB = () => {
      if (!this.musicOn || this.muted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'triangle'; o.frequency.value = bass[bi % bass.length];
      g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.12, now+0.03);
      g.gain.exponentialRampToValueAtTime(0.001, now+beat*3*0.9);
      o.connect(g); g.connect(this.musicGain); o.start(now); o.stop(now+beat*3);
      bi++;
    };
    playN();
    this.mInt1 = setInterval(playN, ndur*1000);
    this.mInt2 = setInterval(playB, beat*3*1000);
  }
  stopMusic() { this.musicOn = false; if (this.mInt1) clearInterval(this.mInt1); if (this.mInt2) clearInterval(this.mInt2); }
}
const audio = new Audio();

// ============== Game state ==============
const SUITS = [{s:'♠',r:false},{s:'♣',r:false},{s:'♥',r:true},{s:'♦',r:true}];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const SEATS = 5, START = 1000, CHIPS = [10,25,50,100], TIME = 60, PEN = 20;
const FREE_ATTEMPTS = 3, OVER_LIMIT_PENALTY = 30, DECISION_TIME = 30;
const TOPIC_LABELS = (typeof TOPICS !== 'undefined')
  ? Object.fromEntries(TOPICS.map(t => [t.key, t.label]))
  : { pureexp: 'Pure Exponents', explog: 'Exponential and Logarithm', trig: 'Trigonometry' };

const G = {
  seats: Array(SEATS).fill(null),
  dealer: { cards:[], hole:false, status:'STANDBY' },
  shoe: makeShoe(),
  phase: 'betting',
  turn: -1,
  round: 0, count: 0,
  msg: 'Take a seat.',
  diff: 'medium',
  topic: 'pureexp',
  me: -1, isHost: false,
  hostId: null, code: null,
  peer: null, conns: new Map(), hostConn: null, myId: null,
  answers: new Map(),
  turnDeadline: null
};

function makeShoe() {
  const s = [];
  for (let i = 0; i < 6; i++) for (const su of SUITS) for (const r of RANKS) s.push({rank:r, suit:su.s, red:su.r});
  for (let i = s.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [s[i],s[j]] = [s[j],s[i]]; }
  return s;
}
function cv(c) { if (c.rank==='A') return 11; if ('JQK'.includes(c.rank)) return 10; return +c.rank; }
function ht(c) { let t = c.reduce((s,x)=>s+cv(x),0), a = c.filter(x=>x.rank==='A').length; while (t>21 && a>0) {t-=10;a--;} return t; }
function isBJ(c) { return c.length===2 && ht(c)===21; }
function pickQuestion(n) {
  const topicKey = G.topic || 'pureexp';
  const label = TOPIC_LABELS[topicKey] || 'Math';
  const pool = (typeof QUESTION_BANK !== 'undefined' && QUESTION_BANK[topicKey] && QUESTION_BANK[topicKey][n]) || [];
  if (!pool.length) { console.warn('Empty question pool for', topicKey, n); return { label, html: `${n} = ?`, answer: n }; }
  const q = pool[Math.floor(Math.random() * pool.length)];
  return { label, html: q.html, answer: q.answer, difficulty: q.difficulty };
}

// ============== DOM ==============
const $ = id => { const el = document.getElementById(id); if (!el) console.warn('Missing element:', id); return el; };
const lobby = $('lobby');
const tableRoom = $('tableRoom');
const speech = $('speech');
const dealerHand = $('dealerHand');
const dealerTotal = $('dealerTotal');
const seatsEl = $('seats');
const balanceEl = $('balance');
const roomLabel = $('roomLabel');
const copyRoomBtn = $('copyRoomBtn');
const topicLabel = $('topicLabel');
const topicSelect = $('topicSelect');
const statusEl = $('status');
const shareUrlEl = $('shareUrl');
const roomBox = $('roomBox');
const roomCodeEl = $('roomCode');
const qrBox = $('qrBox');
const mpStatus = $('mpStatus');
const mpStatusTable = $('mpStatusTable');
const tabCreate = $('tabCreate');
const tabJoin = $('tabJoin');
const panelCreate = $('panelCreate');
const panelJoin = $('panelJoin');
const createBtn = $('createBtn');
const joinBtn = $('joinBtn');
const createName = $('createName');
const joinCode = $('joinCode');
const joinName = $('joinName');
const leaveBtn = $('leaveBtn');
const dealBtn = $('dealBtn');
const hitBtn = $('hitBtn');
const standBtn = $('standBtn');
const doubleBtn = $('doubleBtn');
const clearBetBtn = $('clearBet');
const mathModal = $('mathModal');
const mathCard = $('mathCard');
const mathTopic = $('mathTopic');
const mathPrompt = $('mathPrompt');
const mathInput = $('mathInput');
const mathFeedback = $('mathFeedback');
const mathForm = $('mathForm');
const timerFill = $('timerFill');
const timerVal = $('timerVal');
const scratchBtn = $('scratchBtn');
const scratchPad = $('scratchPad');
const scratchArea = $('scratchArea');
const scratchCloseBtn = $('scratchCloseBtn');
const scratchClearBtn = $('scratchClearBtn');
const soundBtn = $('soundBtn');
const messageRail = $('messageRail');
const resultBanner = $('resultBanner');
const resultBannerText = $('resultBannerText');
const resultBannerSub = $('resultBannerSub');
const catEyeL = $('catEyeL');
const catEyeR = $('catEyeR');
const cheekL = $('cheekL');
const cheekR = $('cheekR');
const catMouth = $('catMouth');
const catWrap = $('catWrap');

console.log('DOM refs:', {lobby: !!lobby, tableRoom: !!tableRoom, createBtn: !!createBtn, joinBtn: !!joinBtn});

// ============== Init: show cover screen first, lobby after curtain opens ==============
const coverScreen = $('coverScreen');
const coverStage = $('coverStage');
const coverEnterBtn = $('coverEnterBtn');
const curtainL = $('curtainL');
const curtainR = $('curtainR');
const aboutBtn = $('aboutBtn');
const aboutModal = $('aboutModal');
const aboutCloseBtn = $('aboutCloseBtn');
const aboutGotItBtn = $('aboutGotItBtn');
const theoryBtn = $('theoryBtn');
const theoryModal = $('theoryModal');
const theoryCloseBtn = $('theoryCloseBtn');

if (coverScreen) coverScreen.hidden = false;
if (lobby) lobby.hidden = true;
if (tableRoom) tableRoom.hidden = true;

if (coverEnterBtn) {
  coverEnterBtn.onclick = () => {
    audio.init();
    audio.resume();
    audio.click();
    coverEnterBtn.disabled = true;
    if (curtainL) curtainL.classList.add('open');
    if (curtainR) curtainR.classList.add('open');
    if (coverStage) coverStage.classList.add('leaving');
    setTimeout(() => {
      if (coverScreen) coverScreen.hidden = true;
      if (lobby) lobby.hidden = false;
      audio.startMusic();
    }, 850);
  };
}

// ============== About Numberjack (strategy guide, reachable from the cover screen) ==============
function closeAbout() { if (aboutModal) aboutModal.hidden = true; }
if (aboutBtn) {
  aboutBtn.onclick = () => {
    audio.init();
    audio.resume();
    audio.click();
    if (aboutModal) aboutModal.hidden = false;
  };
}
if (aboutCloseBtn) aboutCloseBtn.onclick = () => { audio.click(); closeAbout(); };
if (aboutGotItBtn) aboutGotItBtn.onclick = () => { audio.click(); closeAbout(); };
if (aboutModal) {
  aboutModal.onclick = e => { if (e.target === aboutModal) closeAbout(); };
}

// ============== Deep theory page (nested dialog opened from the teacher cat's "Click") ==============
function closeTheory() { if (theoryModal) theoryModal.hidden = true; }
if (theoryBtn) {
  theoryBtn.onclick = () => {
    audio.init();
    audio.resume();
    audio.click();
    if (theoryModal) theoryModal.hidden = false;
  };
}
if (theoryCloseBtn) theoryCloseBtn.onclick = () => { audio.click(); closeTheory(); };
if (theoryModal) {
  theoryModal.onclick = e => { if (e.target === theoryModal) closeTheory(); };
}
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  // Theory is the nested (topmost) dialog — close it first if open, leaving the
  // about modal underneath still open, same as any layered-dialog Escape behavior.
  if (theoryModal && !theoryModal.hidden) closeTheory();
  else if (aboutModal && !aboutModal.hidden) closeAbout();
});

// ============== Tabs ==============
tabCreate.onclick = () => {
  tabCreate.classList.add('active');
  tabJoin.classList.remove('active');
  panelCreate.hidden = false; panelJoin.hidden = true;
};
tabJoin.onclick = () => {
  tabJoin.classList.add('active');
  tabCreate.classList.remove('active');
  panelJoin.hidden = false; panelCreate.hidden = true;
};

// ============== Topic select (room creator only) ==============
let selectedTopic = 'pureexp';
if (topicSelect) {
  topicSelect.querySelectorAll('.topic-opt').forEach(btn => {
    btn.onclick = () => {
      audio.click();
      selectedTopic = btn.dataset.topic;
      topicSelect.querySelectorAll('.topic-opt').forEach(b => b.classList.toggle('active', b === btn));
    };
  });
}

// ============== Sound ==============
soundBtn.onclick = () => {
  audio.init();
  audio.resume();
  const muted = audio.toggle();
  soundBtn.textContent = muted ? '🔇' : '🔊';
  soundBtn.classList.toggle('muted', muted);
  if (!muted) { audio.startMusic(); audio.click(); }
  else audio.stopMusic();
};

// ============== Cat eye follow ==============
document.addEventListener('mousemove', e => {
  if (!catWrap || tableRoom.hidden) return;
  const r = catWrap.getBoundingClientRect();
  const cx = r.left + r.width/2, cy = r.top + r.height/2;
  const dx = e.clientX - cx, dy = e.clientY - cy;
  const dist = Math.hypot(dx, dy) || 1;
  const max = 2.5;
  const ox = (dx/dist) * Math.min(max, dist/50);
  const oy = (dy/dist) * Math.min(max, dist/50);
  [catEyeL, catEyeR].forEach(eye => {
    if (!eye) return;
    const pupils = eye.querySelectorAll('ellipse, circle');
    if (pupils[0]) pupils[0].setAttribute('cx', 50 + ox*4);
    if (pupils[1]) pupils[1].setAttribute('cy', 70 + oy*4);
    if (pupils[2]) pupils[2].setAttribute('cx', 50 + ox*4);
    if (pupils[2]) pupils[2].setAttribute('cy', 70 + oy*4);
  });
});

function setCatMood(mood) {
  if (!cheekL) return;
  cheekL.classList.toggle('blush', mood === 'happy');
  cheekR.classList.toggle('blush', mood === 'happy');
  if (mood === 'happy') catMouth.style.transform = 'scaleY(1.4)';
  else if (mood === 'sad') catMouth.style.transform = 'scaleY(0.4) rotate(180deg)';
  else catMouth.style.transform = 'scaleY(1)';
}

// ============== Render ==============
function render() {
  if (G.me < 0) return;
  const seat = G.seats[G.me];
  balanceEl.textContent = seat ? '★' + seat.balance : '—';
  roomLabel.textContent = (G.code || '—') + (G.phase !== 'betting' ? ' 🔒' : '');
  if (topicLabel) topicLabel.textContent = 'Topic: ' + (TOPIC_LABELS[G.topic] || '—');
  speech.textContent = G.msg;
  messageRail.textContent = G.msg;
  renderDealer();
  renderSeats();
  renderControls();
  renderResultBanner(seat);
  syncMath();
}

function renderResultBanner(seat) {
  if (!resultBanner) return;
  if (G.phase === 'settling' && seat && seat.result) {
    const info = {
      win:       { text: 'YOU WIN!',   sub: '+★' + seat.bet * 2 },
      blackjack: { text: 'BLACKJACK!', sub: '+★' + (seat.bet + Math.floor(seat.bet * 1.5)) },
      push:      { text: 'PUSH',       sub: 'Bet returned' },
      lose:      { text: 'YOU LOSE',   sub: '−★' + seat.bet },
    }[seat.result];
    if (info) {
      resultBannerText.textContent = info.text;
      resultBannerText.className = 'result-banner-text ' + seat.result;
      resultBannerSub.textContent = info.sub;
      resultBanner.hidden = false;
      return;
    }
  }
  resultBanner.hidden = true;
}

function makeCardEl(c) {
  const el = document.createElement('div');
  el.className = 'card-slot' + (c.flipped ? ' flipped' : '');
  if (c.mystery && !c.solved) {
    el.innerHTML = '<div class="card-inner"><div class="card-face front mystery">?</div><div class="card-face back"></div></div>';
    el.querySelector('.mystery').onclick = () => openMath(c);
    return el;
  }
  if (c.hidden) {
    el.innerHTML = '<div class="card-inner"><div class="card-face front back">★</div><div class="card-face back"></div></div>';
    return el;
  }
  const red = c.red ? ' red' : '';
  el.innerHTML = `<div class="card-inner">
    <div class="card-face back"></div>
    <div class="card-face front${red}">
      <div class="card-rank">${c.rank}</div>
      <div class="card-suit">${c.suit}</div>
      <div class="card-rank-bot">${c.rank}</div>
    </div>
  </div>`;
  if (c.flipped) el.classList.add('flipped');
  return el;
}

function renderDealer() {
  const d = G.dealer;
  dealerHand.innerHTML = '';
  d.cards.forEach((c, i) => {
    if (i === 1 && !d.hole) dealerHand.appendChild(makeCardEl({hidden: true}));
    else dealerHand.appendChild(makeCardEl({...c, flipped: true}));
  });
  let total = '';
  if (d.hole) {
    const t = ht(d.cards);
    total = isBJ(d.cards) && d.cards.length===2 ? 'BLACKJACK' : String(t);
  } else if (d.cards.length) {
    const up = cv(d.cards[0]);
    total = 'showing ' + (up===11 ? 'A' : up);
  }
  dealerTotal.textContent = total;
}

function renderSeats() {
  seatsEl.innerHTML = '';
  G.seats.forEach((s, i) => {
    const el = document.createElement('div');
    el.className = 'seat' + (s ? '' : ' empty') + (i === G.me ? ' me' : '') + (G.turn === i && G.phase === 'player' ? ' turn' : '');
    if (s) {
      const cardsHtml = s.hand.map(c => {
        const temp = document.createElement('div');
        temp.style.display = 'inline-block';
        temp.appendChild(makeCardEl({...c, flipped: true}));
        return temp.outerHTML;
      }).join('');
      const solvedAll = s.hand.length && !s.hand.some(c => c.mystery && !c.solved);
      let totalHtml = '';
      if (solvedAll) {
        const t = ht(s.hand);
        totalHtml = `<div class="seat-total">${isBJ(s.hand) && s.hand.length===2 ? 'BLACKJACK' : (t > 21 ? t + ' · BUST' : t)}</div>`;
      }
      let timerHtml = '';
      if (G.turn === i && G.phase === 'player' && G.turnDeadline) {
        const secs = Math.max(0, Math.ceil((G.turnDeadline - Date.now()) / 1000));
        timerHtml = `<div class="seat-timer${secs<=10?' low':''}">⏱ ${secs}s</div>`;
      }
      el.innerHTML = `<div class="seat-name">${esc(s.name)}${s.peerId===G.hostId?' 👑':''}${i===G.me?' ★':''}</div>
        <div class="seat-bal">★${s.balance}${s.bet>0?' · bet '+s.bet:''}</div>
        <div class="seat-cards">${cardsHtml}</div>
        ${totalHtml}
        ${timerHtml}`;
      if (G.isHost && i !== G.me) {
        const kickBtn = document.createElement('button');
        kickBtn.type = 'button';
        kickBtn.className = 'seat-kick';
        kickBtn.textContent = '✕';
        kickBtn.title = 'Kick from seat';
        kickBtn.onclick = () => kickSeat(i);
        el.appendChild(kickBtn);
      }
    } else {
      el.textContent = `Seat ${i+1} · open`;
    }
    seatsEl.appendChild(el);
  });
}

// Only patch the countdown text in place — calling render() here would tear down and
// rebuild every seat/card each second, replaying the "deal" fly-in animation on
// everything at the table and making the whole board look like it's bouncing.
setInterval(() => {
  if (!G.turnDeadline || G.me < 0) return;
  const timerEl = seatsEl.querySelector('.seat.turn .seat-timer');
  if (!timerEl) return;
  const secs = Math.max(0, Math.ceil((G.turnDeadline - Date.now()) / 1000));
  timerEl.textContent = '⏱ ' + secs + 's';
  timerEl.classList.toggle('low', secs <= 10);
}, 1000);

function renderControls() {
  const seat = G.seats[G.me];
  if (!seat) {
    [dealBtn,hitBtn,standBtn,doubleBtn].forEach(b=>{ if(b) b.disabled = true; });
    if (clearBetBtn) clearBetBtn.disabled = true;
    return;
  }
  const myTurn = G.turn === G.me && G.phase === 'player';
  const active = myTurn ? seat.hand : null;
  const blocked = active && active.some(c => c.mystery && !c.solved);
  dealBtn.disabled = !(G.isHost && G.phase==='betting' && G.seats.some(s=>s && s.bet>0));
  hitBtn.disabled = !myTurn || blocked;
  standBtn.disabled = !myTurn || blocked;
  doubleBtn.disabled = !myTurn || blocked || !active || active.length!==2 || seat.balance < seat.bet;
  clearBetBtn.disabled = G.phase !== 'betting';
}

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ============== Networking ==============
function shortCode() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random()*c.length)];
  return s;
}

function setStatus(msg, ok) {
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.className = 'status' + (ok ? ' ok' : '');
}

const MP_STATUS_TEXT = {
  connecting: '🟡 Connecting to multiplayer…',
  connected: '🟢 Multiplayer connected — friends can join',
  failed: '🔴 Multiplayer unavailable — solo mode only (reload to retry)',
};
// Short form for the topbar pill, which sits in a tight column next to the brand —
// the full sentence above wraps to two lines there and crowds the NUMBERJACK title.
const MP_STATUS_TEXT_SHORT = {
  connecting: '🟡 Connecting…',
  connected: '🟢 Multiplayer on',
  failed: '🔴 Solo mode only',
};
let mpConnectTimeout = null;
function setMpStatus(state) {
  G.mpConnState = state;
  if (mpStatus) { mpStatus.textContent = MP_STATUS_TEXT[state] || ''; mpStatus.className = 'mp-status ' + state; }
  if (mpStatusTable) {
    mpStatusTable.textContent = MP_STATUS_TEXT_SHORT[state] || '';
    mpStatusTable.title = MP_STATUS_TEXT[state] || '';
    mpStatusTable.className = 'stat-l mp-status-inline ' + state;
    mpStatusTable.hidden = false;
  }
  if (state !== 'connecting' && mpConnectTimeout) { clearTimeout(mpConnectTimeout); mpConnectTimeout = null; }
}

createBtn.onclick = () => {
  audio.init();
  audio.resume();
  const name = createName.value.trim() || 'Host';
  const code = shortCode();
  G.code = code;
  G.isHost = true;
  G.topic = selectedTopic;
  if (roomCodeEl) roomCodeEl.textContent = code;
  if (roomBox) roomBox.hidden = false;
  const joinUrl = location.origin + location.pathname + '?room=' + code;
  if (shareUrlEl) { shareUrlEl.textContent = joinUrl; shareUrlEl.hidden = false; }
  if (qrBox) {
    qrBox.hidden = false;
    if (typeof QRCode !== 'undefined') {
      QRCode.toCanvas(joinUrl, { width: 140, margin: 1 }, (err, canvas) => {
        if (err) { qrBox.textContent = 'QR error'; return; }
        qrBox.innerHTML = '';
        qrBox.appendChild(canvas);
      });
    }
  }
  audio.click();
  audio.startMusic();
  // Always go solo for now
  G.seats[0] = { name, balance: START, bet: 0, hand: [], peerId: 'local', connected: true };
  G.me = 0;
  G.hostId = 'local';
  enterTable();
  setStatus('Solo mode. Code: ' + code, true);
  setMpStatus('connecting');

  // Try multiplayer on top
  if (typeof Peer !== 'undefined') {
    try {
      G.peer = new Peer('numberjack-mp-' + code, { debug: 0 });
      mpConnectTimeout = setTimeout(() => {
        if (G.mpConnState === 'connecting') setMpStatus('failed');
      }, 7000);
      G.peer.on('open', id => {
        G.myId = id;
        G.seats[0].peerId = id;
        G.hostId = id;
        setMpStatus('connected');
      });
      G.peer.on('connection', c => {
        G.conns.set(c.peer, c);
        c.on('open', () => { try { c.send({type:'state', state: getState()}); } catch(_){} });
        c.on('data', d => onHostData(c, d));
        c.on('close', () => {
          const idx = G.seats.findIndex(s => s && s.peerId === c.peer);
          G.conns.delete(c.peer);
          if (idx < 0) return;
          const wasTurn = G.turn === idx && G.phase === 'player';
          if (G.phase === 'betting' || G.phase === 'settling') {
            G.seats[idx] = null;
          } else {
            G.seats[idx].connected = false;
          }
          if (wasTurn) { clearDecisionTimer(); nextTurn(idx + 1); }
          else { broadcast(); render(); }
        });
      });
      G.peer.on('error', e => {
        console.warn('Host peer error:', e);
        setMpStatus('failed');
      });
    } catch(e) { console.warn(e); setMpStatus('failed'); }
  } else {
    setMpStatus('failed');
  }
};

let joinInFlight = false;
function resetJoinBtn() {
  joinInFlight = false;
  joinBtn.disabled = false;
  joinBtn.textContent = 'Sit down';
}
joinBtn.onclick = () => {
  if (joinInFlight) return; // guards against a double-tap firing two separate connections
  audio.init();
  audio.resume();
  const code = joinCode.value.trim().toUpperCase();
  const name = joinName.value.trim() || 'Guest';
  if (!code) { setStatus('Enter room code'); return; }
  joinInFlight = true;
  joinBtn.disabled = true;
  joinBtn.textContent = 'Sitting down…';
  G.code = code;
  G.isHost = false;
  G.wasKicked = false;
  audio.click();
  if (typeof Peer !== 'undefined') {
    try {
      G.peer = new Peer(undefined, { debug: 0 });
      G.peer.on('open', () => {
        const c = G.peer.connect('numberjack-mp-' + code, { reliable: true });
        G.hostConn = c;
        c.on('open', () => {
          c.send({type:'join', name, seatIndex: null});
        });
        c.on('data', d => {
          if (d.type === 'state') applyState(d.state);
          if (d.type === 'error') { setStatus(d.text); resetJoinBtn(); }
          if (d.type === 'you') { G.me = d.seatIndex; enterTable(); }
          if (d.type === 'kicked') {
            G.me = -1;
            G.wasKicked = true;
            audio.stopMusic();
            closeMath();
            if (tableRoom) tableRoom.hidden = true;
            if (lobby) lobby.hidden = false;
            setStatus('The host removed you from your seat.', false);
          }
        });
        c.on('close', () => { if (!G.wasKicked) setStatus('Host disconnected', false); resetJoinBtn(); });
        c.on('error', e => { setStatus('Connection failed: ' + e.type, false); resetJoinBtn(); });
      });
      G.peer.on('error', e => {
        resetJoinBtn();
        if (e.type === 'peer-unavailable') setStatus('Room not found: ' + code, false);
        else setStatus('Error: ' + e.type, false);
      });
    } catch(e) { setStatus('Network error', false); resetJoinBtn(); }
  } else {
    setStatus('PeerJS not loaded', false);
    resetJoinBtn();
  }
};

function onHostData(conn, d) {
  if (d.type === 'join') {
    // A connection that already holds a seat (retry, reconnect) just gets re-confirmed --
    // never given a second seat.
    const existingIdx = G.seats.findIndex(s => s && s.peerId === conn.peer);
    if (existingIdx >= 0) { conn.send({type:'you', seatIndex: existingIdx}); return; }
    if (G.phase !== 'betting') { conn.send({type:'error', text:'Room locked — a hand is in progress. Try again after this round.'}); return; }
    const name = d.name.slice(0,16) || 'Guest';
    let idx = G.seats.findIndex(s => !s);
    if (idx < 0) idx = G.seats.findIndex(s => s && !s.connected);
    if (idx < 0) { conn.send({type:'error', text:'Table full'}); return; }
    G.seats[idx] = { name, balance: START, bet: 0, hand: [], peerId: conn.peer, connected: true };
    conn.send({type:'you', seatIndex: idx});
    broadcast();
    render();
  } else if (d.type === 'action') {
    handleAction(d.action, d.payload, conn.peer);
  } else if (d.type === 'bet') {
    if (G.phase !== 'betting') return;
    const s = G.seats.find(x => x && x.peerId === conn.peer);
    if (s && CHIPS.includes(d.amount) && s.bet + d.amount <= s.balance) {
      s.bet += d.amount;
      audio.chip();
      broadcast();
      render();
    }
  } else if (d.type === 'clearBet') {
    const s = G.seats.find(x => x && x.peerId === conn.peer);
    if (s) { s.bet = 0; broadcast(); render(); }
  } else if (d.type === 'startRound') {
    if (G.phase === 'betting') startRound();
  } else if (d.type === 'leaveSeat') {
    const idx = G.seats.findIndex(s => s && s.peerId === conn.peer);
    if (idx >= 0) { G.seats[idx] = null; broadcast(); render(); }
  }
}

// ============== Admin: kick a player from their seat ==============
function kickSeat(i) {
  if (!G.isHost) return;
  const seat = G.seats[i];
  if (!seat || i === G.me) return;
  const wasTurn = G.turn === i && G.phase === 'player';
  const conn = G.conns.get(seat.peerId);
  G.seats[i] = null;
  if (conn) {
    try { conn.send({type:'kicked'}); } catch(_){}
    setTimeout(() => { try { conn.close(); } catch(_){} }, 50);
    G.conns.delete(seat.peerId);
  }
  if (wasTurn) { clearDecisionTimer(); nextTurn(i + 1); }
  else { broadcast(); render(); }
}

function enterTable() {
  if (lobby) lobby.hidden = true;
  if (tableRoom) tableRoom.hidden = false;
  render();
}

function broadcast() {
  if (!G.isHost) return;
  for (const c of G.conns.values()) {
    try { c.send({type:'state', state: getState()}); } catch(_){}
  }
}

function getState() {
  return {
    seats: G.seats.map(s => s ? {
      name: s.name, balance: s.balance, bet: s.bet, result: s.result,
      hand: s.hand.map(c => ({id:c.id,rank:c.rank,suit:c.suit,red:c.red,mystery:c.mystery,solved:c.solved,attempts:c.attempts||0,
        math: c.mystery && !c.solved ? {label:c.math.label, html:c.math.html} : undefined})),
      peerId: s.peerId, connected: s.connected
    } : null),
    dealer: { cards: G.dealer.cards.map((c,i) => i===1 && !G.dealer.hole ? {hidden:true} : {rank:c.rank,suit:c.suit,red:c.red}), hole: G.dealer.hole, status: G.dealer.status },
    phase: G.phase, turn: G.turn, msg: G.msg, hostId: G.hostId, code: G.code, topic: G.topic,
    turnDeadline: G.turnDeadline
  };
}

function applyState(st) {
  G.seats = st.seats.map(s => s ? {
    name: s.name, balance: s.balance, bet: s.bet, result: s.result,
    hand: s.hand.map(c => c.hidden ? {hidden:true} : {id:c.id,rank:c.rank,suit:c.suit,red:c.red,mystery:c.mystery,solved:c.solved,attempts:c.attempts||0,math:c.math}),
    peerId: s.peerId, connected: s.connected
  } : null);
  G.dealer = { cards: st.dealer.cards.map(c => c.hidden ? {hidden:true} : {rank:c.rank,suit:c.suit,red:c.red}), hole: st.dealer.hole, status: st.dealer.status };
  G.phase = st.phase;
  G.turn = st.turn;
  G.msg = st.msg;
  G.hostId = st.hostId;
  G.code = st.code;
  G.topic = st.topic;
  G.turnDeadline = st.turnDeadline;
  render();
}

// ============== Game actions ==============
function drawCard(forPlayer) {
  if (G.shoe.length < 6*52*0.25) { G.shoe = makeShoe(); audio.shuffle(); }
  const c = G.shoe.pop();
  c.id = 'r' + G.round + '-c' + (G.count++);
  if (forPlayer && !'AJQK'.includes(c.rank)) {
    const n = +c.rank;
    const p = pickQuestion(n);
    c.mystery = true;
    c.solved = false;
    c.attempts = 0;
    c.math = p;
    c.deadline = Date.now() + TIME*1000;
    G.answers.set(c.id, p.answer);
  }
  return c;
}

function startRound() {
  if (G.phase !== 'betting') return;
  if (!G.seats.some(s => s && s.bet>0)) return;
  clearDecisionTimer();
  G.round++;
  G.count = 0;
  G.answers.clear();
  G.phase = 'dealing';
  G.dealer = { cards: [], hole: false, status: 'DEALING' };
  G.seats.forEach(s => {
    if (!s) return;
    s.balance -= s.bet;
    s.hand = [];
  });
  broadcast(); render();
  const order = [];
  G.seats.forEach((s,i) => { if (s) order.push({k:'p', i}); });
  order.push({k:'d'});
  G.seats.forEach((s,i) => { if (s) order.push({k:'p', i}); });
  order.push({k:'d'});
  let idx = 0;
  const next = () => {
    if (idx >= order.length) { setTimeout(afterDeal, 500); return; }
    const step = order[idx++];
    if (step.k === 'p') G.seats[step.i].hand.push(drawCard(true));
    else G.dealer.cards.push(drawCard(false));
    audio.deal();
    broadcast(); render();
    setTimeout(next, 280);
  };
  next();
}

function afterDeal() {
  if (isBJ(G.dealer.cards)) {
    G.dealer.hole = true;
    G.dealer.status = 'BLACKJACK';
    audio.blackjack();
    G.msg = 'Mister Whisker has BLACKJACK!';
    setCatMood('sad');
    G.seats.forEach(s => s && s.hand.forEach(c => c.mystery && (c.solved=true)));
    broadcast(); render();
    setTimeout(settle, 1000);
    return;
  }
  G.dealer.status = 'WATCHING';
  G.seats.forEach(s => {
    if (!s) return;
    if (!s.hand.some(c => c.mystery && !c.solved) && isBJ(s.hand)) {
      audio.blackjack();
      G.msg = s.name + ' has BLACKJACK!';
      setCatMood('happy');
    }
  });
  nextTurn(0);
}

// ============== Turn decision timer (host-only) ==============
// If a seated player doesn't hit/stand/double within DECISION_TIME, they're auto-stood.
let decisionTimerHandle = null;
function clearDecisionTimer() {
  if (decisionTimerHandle) { clearTimeout(decisionTimerHandle); decisionTimerHandle = null; }
  G.turnDeadline = null;
}
function maybeStartDecisionTimer() {
  clearDecisionTimer();
  if (!G.isHost || G.phase !== 'player' || G.turn < 0) return;
  const seatIdx = G.turn;
  const seat = G.seats[seatIdx];
  if (!seat || seat.hand.some(c => c.mystery && !c.solved)) return; // math modal handles its own timer
  G.turnDeadline = Date.now() + DECISION_TIME * 1000;
  decisionTimerHandle = setTimeout(() => {
    const s = G.seats[seatIdx];
    if (s && G.turn === seatIdx && G.phase === 'player') handleAction('stand', null, s.peerId);
  }, DECISION_TIME * 1000);
}

function nextTurn(from) {
  for (let i = from; i < SEATS; i++) {
    const s = G.seats[i];
    if (s && s.hand.length) {
      G.turn = i;
      G.phase = 'player';
      maybeStartDecisionTimer();
      broadcast(); render();
      return;
    }
  }
  clearDecisionTimer();
  runDealer();
}

function runDealer() {
  G.phase = 'dealer';
  G.dealer.hole = true;
  G.dealer.status = 'REVEALING';
  G.msg = 'Le chat deals…';
  setCatMood('normal');
  broadcast(); render();
  setTimeout(dealerStep, 700);
}

function dealerStep() {
  const t = ht(G.dealer.cards);
  if (t < 17) {
    G.dealer.cards.push(drawCard(false));
    audio.deal();
    broadcast(); render();
    setTimeout(dealerStep, 650);
  } else {
    setTimeout(settle, 700);
  }
}

function settle() {
  const dt = ht(G.dealer.cards);
  const dBJ = isBJ(G.dealer.cards);
  const dBust = !dBJ && dt > 21;
  let anyWin = false, anyLose = false;
  G.seats.forEach(s => {
    if (!s) return;
    const h = s.hand;
    if (!h.length) { s.result = null; return; }
    const pBJ = isBJ(h);
    if (dBJ && pBJ) { s.balance += s.bet; s.result = 'push'; }
    else if (pBJ) { s.balance += s.bet + Math.floor(s.bet*1.5); anyWin = true; s.result = 'blackjack'; }
    else if (!dBJ) {
      const pt = ht(h);
      if (pt > 21) { anyLose = true; s.result = 'lose'; }
      else if (dBust || pt > dt) { s.balance += s.bet*2; anyWin = true; s.result = 'win'; }
      else if (pt === dt) { s.balance += s.bet; s.result = 'push'; }
      else { anyLose = true; s.result = 'lose'; }
    } else { anyLose = true; s.result = 'lose'; }
  });
  G.dealer.status = dBJ ? 'BLACKJACK' : dBust ? 'BUST' : 'STAND '+dt;
  if (dBJ) G.msg = 'Mister Whisker wins. Better luck!';
  else if (dBust) G.msg = 'Busted! Players win!';
  else G.msg = 'Mister Whisker stands on ' + dt;
  setCatMood(dBust || anyWin ? 'happy' : 'sad');
  if (dBust) audio.bust();
  else if (anyWin && !anyLose) audio.win();
  else if (anyLose && !anyWin) audio.lose();
  G.phase = 'settling';
  broadcast(); render();
  setTimeout(() => {
    clearDecisionTimer();
    G.seats.forEach((s,i) => { if (s) { s.bet = 0; s.hand = []; s.result = null; if (!s.connected) G.seats[i] = null; } });
    G.dealer = { cards: [], hole: false, status: 'STANDBY' };
    G.phase = 'betting';
    G.turn = -1;
    G.msg = 'Place your bets, everyone!';
    setCatMood('normal');
    broadcast(); render();
  }, 5000);
}

function handleAction(action, payload, peerId) {
  const idx = G.seats.findIndex(s => s && s.peerId === peerId);
  const s = idx >= 0 ? G.seats[idx] : G.seats[G.me];
  if (!s) return;
  const isMath = action === 'mathAnswer' || action === 'mathTimeout';
  if (!isMath && G.turn !== idx) return;
  const hand = s.hand;
  if (!hand) return;
  if (!isMath && hand.some(c => c.mystery && !c.solved)) return;

  if (!isMath) { audio.click(); clearDecisionTimer(); }
  if (action === 'stand') {
    nextTurn(G.seats.indexOf(s) + 1);
  } else if (action === 'hit') {
    hand.push(drawCard(true));
    if (!hand.some(c => c.mystery && !c.solved)) {
      const t = ht(hand);
      if (t > 21) nextTurn(G.seats.indexOf(s) + 1);
      else { maybeStartDecisionTimer(); broadcast(); render(); }
    } else { broadcast(); render(); }
  } else if (action === 'double') {
    if (s.balance < s.bet) return;
    s.balance -= s.bet;
    s.bet *= 2;
    const card = drawCard(true);
    hand.push(card);
    if (card.mystery) s.doublePending = true;
    if (!hand.some(c => c.mystery && !c.solved)) nextTurn(G.seats.indexOf(s) + 1);
    else { broadcast(); render(); }
  } else if (action === 'mathAnswer') {
    const card = hand.find(c => c.id === payload.cardId);
    if (!card || !card.mystery || card.solved) return;
    if (+payload.value === G.answers.get(payload.cardId)) {
      // CORRECT — instant feedback
      card.solved = true;
      G.answers.delete(payload.cardId);
      audio.correct();
      mathFeedback.textContent = '✓ Correct! Flipping…';
      mathFeedback.className = 'modal-feedback correct';
      setTimeout(() => {
        closeMath();
        if (!hand.some(c => c.mystery && !c.solved)) {
          const t = ht(hand);
          if (t > 21 || s.doublePending) { s.doublePending = false; nextTurn(G.seats.indexOf(s) + 1); }
          else if (G.turn === G.seats.indexOf(s)) maybeStartDecisionTimer();
        }
        broadcast(); render();
      }, 700);
    } else {
      card.attempts = (card.attempts || 0) + 1;
      audio.wrong();
      if (card.attempts > FREE_ATTEMPTS) {
        const cost = Math.min(OVER_LIMIT_PENALTY, s.balance);
        s.balance -= cost;
        mathFeedback.textContent = `✗ Wrong — over ${FREE_ATTEMPTS} free tries, −${cost}★`;
      } else {
        mathFeedback.textContent = `✗ Try again! (${card.attempts}/${FREE_ATTEMPTS} free tries used)`;
      }
      mathFeedback.className = 'modal-feedback wrong';
      mathCard.classList.remove('shake');
      void mathCard.offsetWidth;
      mathCard.classList.add('shake');
      mathInput.select();
    }
    broadcast(); render();
  } else if (action === 'mathTimeout') {
    const card = hand.find(c => c.id === payload.cardId);
    if (!card || !card.mystery || card.solved) return;
    const amt = Math.min(PEN, s.balance);
    s.balance -= amt;
    card.solved = true;
    G.answers.delete(payload.cardId);
    audio.timeout();
    mathFeedback.textContent = `⏱ Time's up — -${amt}★`;
    mathFeedback.className = 'modal-feedback timeout';
    setTimeout(() => {
      closeMath();
      if (!hand.some(c => c.mystery && !c.solved)) {
        const t = ht(hand);
        if (t > 21 || s.doublePending) { s.doublePending = false; nextTurn(G.seats.indexOf(s) + 1); }
        else if (G.turn === G.seats.indexOf(s)) maybeStartDecisionTimer();
      }
      broadcast(); render();
    }, 1000);
  }
}

// ============== Math modal ==============
let openCard = null;
let tickerHandle = null;
let lastBeep = 0;

function openMath(card) {
  openCard = card;
  mathModal.hidden = false;
  mathTopic.textContent = card.math.label;
  mathPrompt.innerHTML = card.math.html;
  mathInput.value = '';
  mathFeedback.textContent = '';
  mathFeedback.className = 'modal-feedback';
  if (scratchArea) scratchArea.value = '';
  if (scratchPad) scratchPad.hidden = true;
  startTicker(card);
  setTimeout(() => mathInput.focus(), 100);
}

function closeMath() {
  mathModal.hidden = true;
  openCard = null;
  if (tickerHandle) { clearInterval(tickerHandle); tickerHandle = null; }
  lastBeep = 0;
  if (scratchPad) scratchPad.hidden = true;
}

// ============== Scratch pad ==============
if (scratchBtn) {
  scratchBtn.onclick = () => {
    audio.click();
    scratchPad.hidden = !scratchPad.hidden;
    if (!scratchPad.hidden) setTimeout(() => scratchArea.focus(), 50);
  };
}
if (scratchCloseBtn) scratchCloseBtn.onclick = () => { scratchPad.hidden = true; };
if (scratchClearBtn) scratchClearBtn.onclick = () => { scratchArea.value = ''; scratchArea.focus(); };

function startTicker(card) {
  if (tickerHandle) clearInterval(tickerHandle);
  const tick = () => {
    if (!openCard || openCard.id !== card.id) { if (tickerHandle) clearInterval(tickerHandle); return; }
    const rem = Math.max(0, card.deadline - Date.now());
    const total = TIME*1000;
    const ratio = rem/total;
    const secs = Math.ceil(rem/1000);
    timerVal.textContent = secs + 's';
    timerFill.style.width = (ratio*100) + '%';
    timerFill.classList.toggle('mid', ratio < 0.5 && ratio >= 0.25);
    timerFill.classList.toggle('low', ratio < 0.25);
    if (secs <= 5 && secs > 0 && secs !== lastBeep) { audio.countdown(); lastBeep = secs; }
    if (rem <= 0) {
      if (tickerHandle) clearInterval(tickerHandle);
      if (G.isHost) handleAction('mathTimeout', { cardId: card.id }, G.myId || 'local');
      else if (G.hostConn) G.hostConn.send({type:'action', action:'mathTimeout', payload:{cardId:card.id}});
    }
  };
  tick();
  tickerHandle = setInterval(tick, 100);
}

const shownAttempts = new Map();
function syncMath() {
  if (G.me < 0) return;
  const seat = G.seats[G.me];
  if (!seat) return;
  const pending = seat.hand && seat.hand.find(c => c.mystery && !c.solved);
  if (!pending) { closeMath(); return; }
  if (!openCard || openCard.id !== pending.id) {
    openMath(pending);
    shownAttempts.set(pending.id, pending.attempts || 0);
    return;
  }
  // Guests don't run handleAction locally, so catch up on wrong-answer feedback
  // by noticing the attempts count changed since the last broadcast state.
  if (!G.isHost) {
    const shown = shownAttempts.get(pending.id) || 0;
    const cur = pending.attempts || 0;
    if (cur > shown) {
      shownAttempts.set(pending.id, cur);
      audio.wrong();
      mathFeedback.textContent = cur > FREE_ATTEMPTS
        ? `✗ Wrong — over ${FREE_ATTEMPTS} free tries, −${OVER_LIMIT_PENALTY}★`
        : `✗ Try again! (${cur}/${FREE_ATTEMPTS} free tries used)`;
      mathFeedback.className = 'modal-feedback wrong';
      mathCard.classList.remove('shake');
      void mathCard.offsetWidth;
      mathCard.classList.add('shake');
      mathInput.select();
    }
  }
}

mathForm.onsubmit = e => {
  e.preventDefault();
  if (!openCard) return;
  const v = +mathInput.value;
  if (G.isHost) {
    handleAction('mathAnswer', { cardId: openCard.id, value: v }, G.myId || 'local');
  } else if (G.hostConn) {
    G.hostConn.send({type:'action', action:'mathAnswer', payload:{cardId:openCard.id, value:v}});
  }
};

// ============== Buttons ==============
dealBtn.onclick = () => { if (G.isHost) startRound(); else if (G.hostConn) G.hostConn.send({type:'startRound'}); };
hitBtn.onclick = () => { if (G.isHost) handleAction('hit', null, G.myId || 'local'); else if (G.hostConn) G.hostConn.send({type:'action', action:'hit'}); };
standBtn.onclick = () => { if (G.isHost) handleAction('stand', null, G.myId || 'local'); else if (G.hostConn) G.hostConn.send({type:'action', action:'stand'}); };
doubleBtn.onclick = () => { if (G.isHost) handleAction('double', null, G.myId || 'local'); else if (G.hostConn) G.hostConn.send({type:'action', action:'double'}); };

document.querySelectorAll('.chip[data-v]').forEach(c => {
  c.onclick = () => {
    if (G.phase !== 'betting') return;
    const seat = G.seats[G.me];
    if (!seat) return;
    const v = +c.dataset.v;
    if (seat.bet + v > seat.balance) return;
    seat.bet += v;
    audio.chip();
    if (G.isHost) { broadcast(); render(); }
    else if (G.hostConn) G.hostConn.send({type:'bet', amount: v});
  };
});

clearBetBtn.onclick = () => {
  const seat = G.seats[G.me];
  if (!seat) return;
  seat.bet = 0;
  audio.click();
  if (G.isHost) { broadcast(); render(); }
  else if (G.hostConn) G.hostConn.send({type:'clearBet'});
};

if (copyRoomBtn) {
  let copyResetHandle = null;
  copyRoomBtn.onclick = () => {
    if (!G.code) return;
    audio.click();
    const done = ok => {
      if (copyResetHandle) clearTimeout(copyResetHandle);
      copyRoomBtn.textContent = ok ? '✓' : '✕';
      copyRoomBtn.classList.toggle('copied', ok);
      copyResetHandle = setTimeout(() => {
        copyRoomBtn.textContent = '📋';
        copyRoomBtn.classList.remove('copied');
      }, 1200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(G.code).then(() => done(true), () => done(false));
    } else {
      // Fallback for browsers/contexts without the async Clipboard API.
      const ta = document.createElement('textarea');
      ta.value = G.code;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch(_) {}
      document.body.removeChild(ta);
      done(ok);
    }
  };
}

leaveBtn.onclick = () => {
  if (G.isHost) {
    const idx = G.seats.findIndex(s => s && s.peerId === G.myId);
    if (idx >= 0) G.seats[idx] = null;
    broadcast();
  } else if (G.hostConn) {
    G.hostConn.send({type:'leaveSeat'});
  }
  G.me = -1;
  audio.stopMusic();
  tableRoom.hidden = true;
  lobby.hidden = false;
  statusEl.textContent = '';
};

// URL pre-fill
const urlRoom = new URLSearchParams(location.search).get('room');
if (urlRoom) {
  tabJoin.click();
  joinCode.value = urlRoom.toUpperCase();
}

document.addEventListener('click', () => { audio.init(); audio.resume(); }, { once: true });
document.addEventListener('keydown', () => { audio.init(); audio.resume(); }, { once: true });

console.log('Numberjack ready!');
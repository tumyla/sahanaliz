// app.js — orchestration + UI for ŞahAnaliz.

import { Chess } from './chess.js';
import { Engine } from './engine.js';
import { fetchChessComGame, loadPgnGame } from './chesscom.js';
import { CLASS, cpToWin, moveAccuracy, materialWhiteMinusBlack, classifyMove, analyzeOpenings, MATE_CP } from './analysis.js';

/* ------------------------------- state -------------------------------- */
let game = null;            // { moves:[{san,uci}], fens:[...], meta }
let evals = [];             // per node: { cpWhite, mate, bestUci, pv2, terminal? }
let classifications = [];   // per move index
let accuracies = [];        // per move index
let curPly = 0;             // 0 = initial; shows fens[curPly]
let flipped = false;
let engine = null;
let analyzing = false;
let opening = null;
let depthLevel = 'balanced';
let runToken = 0;           // cancels a stale analysis loop

const DEPTHS = { fast: 11, balanced: 14, deep: 16 };
const DEPTH_NOTE = {
  fast: '~ hızlı · kaba değerlendirme',
  balanced: '~ orta hız · iyi doğruluk',
  deep: '~ yavaş · en yüksek doğruluk',
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const PIECE = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* --------------------------- sample (Opera Game) ---------------------- */
const SAMPLE_PGN = `[Event "Paris Opera"]
[Site "Paris"]
[Date "1858.??.??"]
[White "Paul Morphy"]
[Black "Duke / Count"]
[Result "1-0"]
[WhiteElo "2500"]
[BlackElo "2200"]
[TimeControl "Klasik"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7
8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8
13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;

/* ------------------------------ UI: panes ----------------------------- */
function setMode(mode) {
  document.querySelectorAll('#seg button').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
  $('pane-link').style.display = mode === 'link' ? '' : 'none';
  $('pane-pgn').style.display = mode === 'pgn' ? '' : 'none';
}
function showError(msg) { $('errMsg').textContent = msg; $('err').classList.add('show'); }
function clearError() { $('err').classList.remove('show'); }

function showIntro() {
  $('boardPage').classList.remove('show');
  $('intro').style.display = '';
  $('newGameBtn').style.display = 'none';
}
function showBoardPage() {
  $('intro').style.display = 'none';
  $('boardPage').classList.add('show');
  $('newGameBtn').style.display = '';
}
function resetToIntro() { runToken++; analyzing = false; showIntro(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

/* ----------------------------- FEN helpers ---------------------------- */
function parseFEN(fen) {
  const rows = fen.split(' ')[0].split('/');
  const b = [];
  for (let r = 0; r < 8; r++) {
    const row = [];
    for (const ch of rows[r]) {
      if (ch >= '1' && ch <= '8') { const n = +ch; for (let k = 0; k < n; k++) row.push(null); }
      else row.push(ch);
    }
    b.push(row);
  }
  return b;
}
function findKing(b, stm) {
  const target = stm === 'w' ? 'K' : 'k';
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) if (b[r][f] === target) return FILES[f] + (8 - r);
  return null;
}

/* ------------------------------ rendering ----------------------------- */
function renderBoard() {
  const fen = game.fens[curPly];
  const b = parseFEN(fen);
  const board = $('board');
  board.innerHTML = '';

  let fromSq = null, toSq = null;
  if (curPly > 0) { const u = game.moves[curPly - 1].uci; fromSq = u.slice(0, 2); toSq = u.slice(2, 4); }

  let checkSq = null;
  try { const c = new Chess(fen); if (c.isCheck && c.isCheck()) checkSq = findKing(b, fen.split(' ')[1]); } catch (e) {}

  const rows = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const cols = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  for (let vr = 0; vr < 8; vr++) {
    for (let vc = 0; vc < 8; vc++) {
      const r = rows[vr], f = cols[vc];
      const rankNum = 8 - r, fileChar = FILES[f], sq = fileChar + rankNum;
      const light = (f + rankNum) % 2 === 0;
      const div = document.createElement('div');
      div.className = 'sq ' + (light ? 'light' : 'dark');
      if (sq === fromSq || sq === toSq) div.classList.add('hl');
      if (sq === checkSq) div.classList.add('check');
      if (vr === 7) { const c = document.createElement('span'); c.className = 'co f'; c.textContent = fileChar; div.appendChild(c); }
      if (vc === 0) { const c = document.createElement('span'); c.className = 'co r'; c.textContent = rankNum; div.appendChild(c); }
      const cell = b[r][f];
      if (cell) {
        const white = cell === cell.toUpperCase();
        const p = document.createElement('span');
        p.className = 'pc ' + (white ? 'w' : 'b');
        p.textContent = PIECE[cell.toLowerCase()];
        div.appendChild(p);
      }
      if (sq === toSq && curPly > 0) {
        const key = classifications[curPly - 1];
        if (key) { const meta = CLASS[key]; const badge = document.createElement('div'); badge.className = 'badge'; badge.style.background = meta.color; badge.textContent = meta.sym; div.appendChild(badge); }
      }
      board.appendChild(div);
    }
  }
}

function fmtEval(ev) {
  if (!ev) return '';
  if (ev.terminal === 'mate') return '#';
  if (ev.terminal === 'draw') return '½';
  if (ev.mate != null) { const w = ev.mate; return (w > 0 ? 'M' : '-M') + Math.abs(w); }
  const v = ev.cpWhite / 100;
  return (v >= 0 ? '+' : '') + v.toFixed(1);
}

function renderEvalBar() {
  const ev = evals[curPly];
  const white = $('evalWhite'), top = $('evalTop'), bot = $('evalBot');
  let pct = 50, txt = '', whiteLeads = true;
  if (ev) { pct = Math.max(2, Math.min(98, cpToWin(ev.cpWhite))); txt = fmtEval(ev); whiteLeads = ev.cpWhite >= 0; }

  if (flipped) { white.style.top = '0'; white.style.bottom = 'auto'; }
  else { white.style.bottom = '0'; white.style.top = 'auto'; }
  white.style.height = pct + '%';

  top.textContent = ''; bot.textContent = '';
  const onBottom = flipped ? !whiteLeads : whiteLeads;
  const el = onBottom ? bot : top;
  el.textContent = txt;
  el.style.color = whiteLeads ? '#2b2b29' : '#e6e6e2';
}

function renderGraph() {
  const holder = $('graphHolder');
  const N = game.fens.length;
  const W = 100, H = 40;
  const xs = (i) => (N <= 1 ? 0 : (i * W) / (N - 1));
  const ys = (win) => H - (win / 100) * H;

  let last = 50;
  const pts = [];
  for (let i = 0; i < N; i++) {
    let win = last;
    if (evals[i]) { win = cpToWin(evals[i].cpWhite); last = win; }
    pts.push([xs(i), ys(win)]);
  }
  let area = `M 0,${H} `;
  for (const p of pts) area += `L ${p[0].toFixed(2)},${p[1].toFixed(2)} `;
  area += `L ${W},${H} Z`;
  let edge = `M ${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)} ` + pts.slice(1).map((p) => `L ${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
  const cx = xs(curPly).toFixed(2);

  holder.innerHTML =
    `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" id="evalSvg">
      <rect x="0" y="0" width="${W}" height="${H}" fill="#2b2b29"/>
      <path d="${area}" fill="#e9e9e3"/>
      <path d="${edge}" fill="none" stroke="#b9bdc2" stroke-width="0.5" vector-effect="non-scaling-stroke"/>
      <line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" stroke="#6b6864" stroke-width="0.5" stroke-dasharray="2 2" vector-effect="non-scaling-stroke"/>
      <line x1="${cx}" y1="0" x2="${cx}" y2="${H}" stroke="#9bd45f" stroke-width="1.4" vector-effect="non-scaling-stroke"/>
    </svg>`;

  const svg = $('evalSvg');
  svg.addEventListener('click', (e) => {
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let i = N <= 1 ? 0 : Math.round((x / W) * (N - 1));
    gotoPly(Math.max(0, Math.min(N - 1, i)));
  });
}

function moveCell(i) {
  const ply = i + 1;
  const d = document.createElement('div');
  d.className = 'mv';
  d.dataset.ply = ply;
  applyGlyph(d, classifications[i]);
  const s = document.createElement('span'); s.className = 'san'; s.textContent = game.moves[i].san; d.appendChild(s);
  d.addEventListener('click', () => gotoPly(ply));
  return d;
}
function applyGlyph(cell, key) {
  const old = cell.querySelector('.g'); if (old) old.remove();
  if (!key) return;
  const meta = CLASS[key];
  const g = document.createElement('span'); g.className = 'g'; g.style.background = meta.color; g.textContent = meta.sym;
  cell.insertBefore(g, cell.firstChild);
}
function renderMoves() {
  const ml = $('moveList'); ml.innerHTML = '';
  for (let i = 0; i < game.moves.length; i += 2) {
    const row = document.createElement('div'); row.className = 'mrow';
    const no = document.createElement('div'); no.className = 'no'; no.textContent = (i / 2 + 1) + '.'; row.appendChild(no);
    row.appendChild(moveCell(i));
    if (i + 1 < game.moves.length) row.appendChild(moveCell(i + 1));
    else { const e = document.createElement('div'); e.className = 'mv empty'; row.appendChild(e); }
    ml.appendChild(row);
  }
  highlightMove();
}
function updateGlyph(i) { const cell = document.querySelector(`.mv[data-ply="${i + 1}"]`); if (cell) applyGlyph(cell, classifications[i]); }
function highlightMove() {
  document.querySelectorAll('.mv.cur').forEach((e) => e.classList.remove('cur'));
  if (curPly > 0) { const cell = document.querySelector(`.mv[data-ply="${curPly}"]`); if (cell) { cell.classList.add('cur'); cell.scrollIntoView({ block: 'nearest' }); } }
}

function renderHeader() {
  const m = game.meta, gh = $('gameHeader'); gh.innerHTML = '';
  const res = document.createElement('div'); res.className = 'res'; res.textContent = m.result || '*'; gh.appendChild(res);
  const names = document.createElement('div');
  names.innerHTML = `<div style="font-family:var(--font-display);font-weight:600;font-size:15px">${esc(m.white)} <span class="vs">${m.whiteElo ? '(' + esc(m.whiteElo) + ')' : ''}</span> &nbsp;—&nbsp; ${esc(m.black)} <span class="vs">${m.blackElo ? '(' + esc(m.blackElo) + ')' : ''}</span></div>`;
  gh.appendChild(names);
  const meta = document.createElement('div'); meta.className = 'meta';
  const bits = [];
  if (m.event) bits.push(m.event);
  if (m.date && !/\?\?/.test(m.date)) bits.push(m.date);
  if (m.timeClass) bits.push(m.timeClass);
  meta.innerHTML = bits.map((b) => `<span class="pill">${esc(String(b))}</span>`).join('');
  gh.appendChild(meta);
  const back = document.createElement('button'); back.className = 'ghost-btn back'; back.textContent = '↺ Yeni'; back.onclick = resetToIntro; gh.appendChild(back);
}

function renderOpening() {
  if (opening && (opening.name || opening.eco)) {
    $('openingBox').style.display = '';
    $('openingEco').textContent = opening.eco || '';
    $('openingName').textContent = opening.name || 'Açılış';
  } else $('openingBox').style.display = 'none';
}

function renderSummary() {
  const wA = [], bA = [];
  for (let i = 0; i < accuracies.length; i++) { if (accuracies[i] == null) continue; (i % 2 === 0 ? wA : bA).push(accuracies[i]); }
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  $('accW').textContent = wA.length ? avg(wA).toFixed(1) : '—';
  $('accB').textContent = bA.length ? avg(bA).toFixed(1) : '—';
  $('accWhoW').textContent = game.meta.white;
  $('accWhoB').textContent = game.meta.black;

  const order = ['brilliant', 'great', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'miss', 'blunder'];
  const cw = {}, cb = {}; order.forEach((k) => { cw[k] = 0; cb[k] = 0; });
  for (let i = 0; i < classifications.length; i++) { const k = classifications[i]; if (!k) continue; (i % 2 === 0 ? cw : cb)[k]++; }

  const C = $('counts'); C.innerHTML = '';
  const cell = (cls, txt) => { const d = document.createElement('div'); d.className = cls; d.textContent = txt; return d; };
  C.appendChild(cell('c-w hdr', truncate(game.meta.white, 9)));
  C.appendChild(cell('c-name hdr', ''));
  C.appendChild(cell('c-b hdr', truncate(game.meta.black, 9)));
  for (const k of order) {
    const meta = CLASS[k];
    C.appendChild(cell('c-w', cw[k]));
    const name = document.createElement('div'); name.className = 'c-name';
    const g = document.createElement('span'); g.className = 'g'; g.style.background = meta.color; g.textContent = meta.sym;
    const t = document.createElement('span'); t.textContent = meta.tr;
    name.appendChild(g); name.appendChild(t); C.appendChild(name);
    C.appendChild(cell('c-b', cb[k]));
  }
}
function truncate(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

/* ----------------------------- navigation ----------------------------- */
function updateNav() {
  const last = game.fens.length - 1;
  $('navStart').disabled = curPly <= 0;
  $('navPrev').disabled = curPly <= 0;
  $('navNext').disabled = curPly >= last;
  $('navEnd').disabled = curPly >= last;
}
function gotoPly(n) {
  if (!game) return;
  curPly = Math.max(0, Math.min(game.fens.length - 1, n));
  renderBoard(); renderEvalBar(); renderGraph(); highlightMove(); updateNav();
}

/* ------------------------------- engine ------------------------------- */
function terminalEval(fen) {
  let c; try { c = new Chess(fen); } catch (e) { return null; }
  if (c.isCheckmate && c.isCheckmate()) {
    const stmWhite = fen.split(' ')[1] === 'w';
    return { cpWhite: stmWhite ? -MATE_CP : MATE_CP, mate: stmWhite ? -1 : 1, bestUci: null, pv2: null, terminal: 'mate' };
  }
  const draw = (c.isStalemate && c.isStalemate()) || (c.isInsufficientMaterial && c.isInsufficientMaterial()) ||
               (c.isThreefoldRepetition && c.isThreefoldRepetition()) || (c.isDraw && c.isDraw());
  if (draw) return { cpWhite: 0, mate: null, bestUci: null, pv2: null, terminal: 'draw' };
  return null;
}
async function evalNode(i) {
  const fen = game.fens[i];
  const term = terminalEval(fen);
  if (term) return term;
  return engine.analyse(fen, DEPTHS[depthLevel]);
}

function detectSacrifice(i, moverWhite, afterMover) {
  const matBeforeW = materialWhiteMinusBlack(game.fens[i]);
  const matBefore = moverWhite ? matBeforeW : -matBeforeW;
  const oppBest = evals[i + 1] && evals[i + 1].bestUci;
  if (!oppBest) return false;
  try {
    const c = new Chess(game.fens[i + 1]);
    const mv = c.move({ from: oppBest.slice(0, 2), to: oppBest.slice(2, 4), promotion: oppBest.slice(4, 5) || undefined });
    if (!mv) return false;
    const w = materialWhiteMinusBlack(c.fen());
    const matAfter = moverWhite ? w : -w;
    return (matBefore - matAfter) >= 1.5 && afterMover > -40;
  } catch (e) { return false; }
}

function classifyAt(i) {
  const moverWhite = i % 2 === 0;
  const before = evals[i], after = evals[i + 1];
  const bestMover = moverWhite ? before.cpWhite : -before.cpWhite;
  const afterMover = moverWhite ? after.cpWhite : -after.cpWhite;
  const winBefore = cpToWin(bestMover);
  const winAfter = cpToWin(afterMover);
  const isBest = !!(before.bestUci && game.moves[i].uci === before.bestUci);
  let pv2WinBefore = null;
  if (before.pv2) { const pv2Mover = moverWhite ? before.pv2.cpWhite : -before.pv2.cpWhite; pv2WinBefore = cpToWin(pv2Mover); }
  const isSac = isBest ? detectSacrifice(i, moverWhite, afterMover) : false;
  const cls = classifyMove({ isBest, isSac, winBefore, winAfter, pv2WinBefore, afterCpMover: afterMover });
  const acc = moveAccuracy(Math.max(0, winBefore - winAfter));
  return { cls, acc };
}

async function runAnalysis() {
  const token = ++runToken;
  analyzing = true;
  const N = game.fens.length;
  evals = new Array(N).fill(null);
  classifications = new Array(game.moves.length).fill(null);
  accuracies = new Array(game.moves.length).fill(null);

  // openings (instant)
  opening = analyzeOpenings(game.moves.map((m) => m.san));
  renderOpening();
  if (opening) for (let k = 0; k <= opening.deepestBookPly; k++) { classifications[k] = 'book'; accuracies[k] = 100; }

  $('progCard').style.display = '';
  $('reviewCard').style.display = 'none';
  $('graphCard').style.display = '';
  $('movesCard').style.display = '';
  renderMoves(); renderGraph();

  // engine
  $('progText').textContent = 'Motor hazırlanıyor…';
  $('progSub').textContent = 'Stockfish tarayıcıda yükleniyor (ilk seferde birkaç saniye).';
  if (!engine) { engine = new Engine(); await engine.init(2); }
  if (token !== runToken) return;

  $('progSub').textContent = 'Stockfish her konumu değerlendiriyor. Bu sırada hamlelerde gezinebilirsin.';

  const total = game.moves.length;
  for (let i = 0; i < total; i++) {
    if (token !== runToken) return;
    if (!evals[i]) { evals[i] = await evalNode(i); if (i === 0) { renderEvalBar(); renderGraph(); } }
    if (token !== runToken) return;
    if (!evals[i + 1]) evals[i + 1] = await evalNode(i + 1);
    if (token !== runToken) return;

    if (classifications[i] !== 'book') { const { cls, acc } = classifyAt(i); classifications[i] = cls; accuracies[i] = acc; }
    updateGlyph(i);
    if (curPly === i || curPly === i + 1) renderBoard();

    const pct = Math.round(((i + 1) / total) * 100);
    $('progFill').style.width = pct + '%';
    $('progPct').textContent = pct + '%';
    $('progText').textContent = `Hamle ${i + 1} / ${total}`;
    renderGraph();

    if (i % 3 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  if (token !== runToken) return;

  renderSummary();
  $('reviewCard').style.display = '';
  $('progCard').style.display = 'none';
  analyzing = false;
}

/* ------------------------------- start -------------------------------- */
function startGame(g) {
  game = g; curPly = 0; flipped = false; opening = null;
  evals = []; classifications = []; accuracies = [];
  clearError();
  showBoardPage();
  renderHeader();
  renderBoard(); renderEvalBar(); updateNav();
  runAnalysis();
}

async function handleLink() {
  const url = $('urlInput').value;
  if (!url.trim()) { showError('Önce bir oyun linki yapıştır.'); return; }
  clearError();
  const btn = $('goLink'); const orig = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span>Çekiliyor…</span>';
  try {
    const g = await fetchChessComGame(url);
    startGame(g);
  } catch (e) {
    showError(e.message || 'Oyun çekilemedi.');
  } finally { btn.disabled = false; btn.innerHTML = orig; }
}

function handlePgn() {
  const pgn = $('pgnInput').value;
  if (!pgn.trim()) { showError('Önce PGN metnini yapıştır.'); return; }
  try { const g = loadPgnGame(pgn); startGame(g); }
  catch (e) { showError('PGN okunamadı. Tam ve geçerli bir PGN yapıştırdığından emin ol.'); }
}

function loadSample() { clearError(); try { startGame(loadPgnGame(SAMPLE_PGN)); } catch (e) { showError('Örnek yüklenemedi.'); } }

/* ------------------------------- wiring ------------------------------- */
function wire() {
  document.querySelectorAll('#seg button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  document.querySelectorAll('#depth button').forEach((b) => b.addEventListener('click', () => {
    depthLevel = b.dataset.d;
    document.querySelectorAll('#depth button').forEach((x) => x.classList.toggle('active', x === b));
    $('depthNote').textContent = DEPTH_NOTE[depthLevel];
  }));
  $('goLink').addEventListener('click', handleLink);
  $('urlInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') handleLink(); });
  $('goPgn').addEventListener('click', handlePgn);
  $('sampleLink').addEventListener('click', loadSample);
  $('newGameBtn').addEventListener('click', resetToIntro);

  $('navStart').addEventListener('click', () => gotoPly(0));
  $('navPrev').addEventListener('click', () => gotoPly(curPly - 1));
  $('navNext').addEventListener('click', () => gotoPly(curPly + 1));
  $('navEnd').addEventListener('click', () => gotoPly(game ? game.fens.length - 1 : 0));
  $('navFlip').addEventListener('click', () => { flipped = !flipped; renderBoard(); renderEvalBar(); });

  document.addEventListener('keydown', (e) => {
    if (!$('boardPage').classList.contains('show')) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
    if (e.key === 'ArrowLeft') gotoPly(curPly - 1);
    else if (e.key === 'ArrowRight') gotoPly(curPly + 1);
    else if (e.key === 'ArrowUp') gotoPly(0);
    else if (e.key === 'ArrowDown') gotoPly(game ? game.fens.length - 1 : 0);
    else if (e.key.toLowerCase() === 'f') { flipped = !flipped; renderBoard(); renderEvalBar(); }
  });
}

wire();
setMode('link');
$('depthNote').textContent = DEPTH_NOTE[depthLevel];

// chesscom.js — turn a chess.com link (or pasted PGN) into a normalized game.
// Output shape: { moves:[{san,uci}], fens:[...N+1 FENs], meta:{...} }

import { Chess } from './chess.js';

/* ----------------------------- TCN decoding ----------------------------- */
const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?{~}(^)[_]@#$,./&-*++=';
const PROMO = 'qnrbkp';

function idxToSq(i) {
  const f = i % 8, r = Math.floor(i / 8) + 1;
  const fc = ALPHABET[f];
  return fc ? fc + r : '';
}

export function decodeTCN(s) {
  const out = [];
  for (let i = 0; i < s.length; i += 2) {
    const c1 = ALPHABET.indexOf(s[i]);
    let c2 = ALPHABET.indexOf(s[i + 1]);
    const m = {};
    if (c2 > 63) {
      m.promotion = PROMO[Math.floor((c2 - 64) / 3)];
      c2 = c1 + (c1 < 16 ? -8 : 8) + (((c2 - 1) % 3) - 1);
    }
    if (c1 > 75) m.drop = PROMO[c1 - 79];
    else m.from = idxToSq(c1);
    m.to = idxToSq(c2);
    out.push(m);
  }
  return out;
}

/* --------------------------- URL / id parsing --------------------------- */
export function parseGameUrl(input) {
  const s = (input || '').trim();
  if (!s) return null;
  if (/^\d{5,}$/.test(s)) return { type: 'live', id: s };
  let m = s.match(/(live|daily|rapid|blitz|bullet)\/(?:game\/)?(\d{4,})/i);
  if (m) { let t = m[1].toLowerCase(); if (t !== 'daily') t = 'live'; return { type: t, id: m[2] }; }
  m = s.match(/game\/(?:live|daily)?\/?(\d{4,})/i);
  if (m) return { type: /daily/i.test(s) ? 'daily' : 'live', id: m[1] };
  m = s.match(/(\d{6,})/);
  if (m) return { type: 'live', id: m[1] };
  return null;
}

/* ------------------------------ proxy fetch ----------------------------- */
// chess.com's callback endpoint does not send CORS headers, so we relay
// through public CORS proxies (with fallbacks).
const PROXIES = [
  (u) => 'https://corsproxy.io/?url=' + encodeURIComponent(u),
  (u) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
  (u) => 'https://thingproxy.freeboard.io/fetch/' + u,
  (u) => 'https://api.codetabs.com/v1/proxy/?quest=' + encodeURIComponent(u),
];

async function fetchText(url) {
  let lastErr;
  for (const make of PROXIES) {
    try {
      const ctrl = new AbortController();
      const tm = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch(make(url), { signal: ctrl.signal });
      clearTimeout(tm);
      if (!res.ok) { lastErr = new Error('HTTP ' + res.status); continue; }
      const text = await res.text();
      if (text && text.length > 2) return text;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('proxy failed');
}

/* --------------------------- build from moves --------------------------- */
function buildFromDecoded(decoded) {
  const c = new Chess();
  for (const mv of decoded) {
    const r = c.move({ from: mv.from, to: mv.to, promotion: mv.promotion });
    if (!r) throw new Error('illegal move while decoding');
  }
  return historyToGame(c);
}

function historyToGame(chess) {
  const h = chess.history({ verbose: true });
  if (!h.length) throw new Error('no moves');
  const fens = [h[0].before];
  const moves = [];
  for (const x of h) {
    fens.push(x.after);
    moves.push({ san: x.san, uci: x.lan });
  }
  return { moves, fens };
}

/* ------------------------------ public API ------------------------------ */
export async function fetchChessComGame(input) {
  const parsed = parseGameUrl(input);
  if (!parsed) throw new Error('Linkten oyun numarası çıkaramadım. Bağlantıyı kontrol et ya da PGN yapıştır.');

  const types = parsed.type === 'daily' ? ['daily', 'live'] : ['live', 'daily'];
  let data = null, usedType = null;
  for (const t of types) {
    const api = 'https://www.chess.com/callback/' + t + '/game/' + parsed.id;
    let text;
    try { text = await fetchText(api); } catch (e) { continue; }
    let json; try { json = JSON.parse(text); } catch (e) { continue; }
    if (json && json.game && json.game.moveList) { data = json; usedType = t; break; }
  }
  if (!data) throw new Error('Oyun çekilemedi. Oyun gizli olabilir veya proxy geçici olarak engelli. PGN yapıştırmayı dene — her zaman çalışır.');

  const g = data.game;
  const head = g.pgnHeaders || {};
  const players = data.players || {};
  const top = players.top || {}, bottom = players.bottom || {};

  const built = buildFromDecoded(decodeTCN(g.moveList));
  const meta = {
    white: head.White || bottom.username || 'Beyaz',
    black: head.Black || top.username || 'Siyah',
    whiteElo: head.WhiteElo || bottom.rating || '',
    blackElo: head.BlackElo || top.rating || '',
    result: head.Result || (g.colorOfWinner ? (g.colorOfWinner === 'white' ? '1-0' : '0-1') : '*'),
    timeClass: head.TimeControl || g.timeClass || usedType,
    date: head.Date || (g.endTime ? new Date(g.endTime * 1000).toISOString().slice(0, 10) : ''),
    event: 'chess.com',
    source: 'link',
  };
  return { ...built, meta };
}

export function loadPgnGame(pgn) {
  const c = new Chess();
  try { c.loadPgn(pgn); }
  catch (e) {
    // retry: strip annotations/comments/clock that some exports include
    const cleaned = pgn
      .replace(/\{[^}]*\}/g, '')
      .replace(/\$\d+/g, '')
      .replace(/\([^()]*\)/g, '')
      .replace(/\b\d+\.\.\./g, '');
    const c2 = new Chess();
    c2.loadPgn(cleaned);
    return finalizePgn(c2);
  }
  return finalizePgn(c);
}

function finalizePgn(chess) {
  const headers = (typeof chess.header === 'function') ? chess.header() : {};
  const game = historyToGame(chess);
  game.meta = {
    white: headers.White || 'Beyaz',
    black: headers.Black || 'Siyah',
    whiteElo: headers.WhiteElo || '',
    blackElo: headers.BlackElo || '',
    result: headers.Result || '*',
    timeClass: headers.TimeControl || '',
    date: headers.Date || '',
    event: headers.Event || 'PGN',
    source: 'pgn',
  };
  return game;
}

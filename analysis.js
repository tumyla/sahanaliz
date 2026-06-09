// analysis.js — move classification, accuracy and opening detection.

import { OPENINGS } from './openings.js';

export const MATE_CP = 100000;

// classification metadata (Turkish labels + own glyphs/colors)
export const CLASS = {
  brilliant:  { tr: 'Muhteşem',  sym: '!!', color: 'var(--c-brilliant)' },
  great:      { tr: 'Harika',    sym: '!',  color: 'var(--c-great)' },
  best:       { tr: 'En İyi',    sym: '★',  color: 'var(--c-best)' },
  excellent:  { tr: 'Mükemmel',  sym: '✓',  color: 'var(--c-excellent)' },
  good:       { tr: 'İyi',       sym: '✓',  color: 'var(--c-good)' },
  book:       { tr: 'Kitap',     sym: '◆',  color: 'var(--c-book)' },
  forced:     { tr: 'Zorunlu',   sym: '⊡',  color: 'var(--c-forced)' },
  inaccuracy: { tr: 'Yanlışlık', sym: '?!', color: 'var(--c-inaccuracy)' },
  mistake:    { tr: 'Hata',      sym: '?',  color: 'var(--c-mistake)' },
  miss:       { tr: 'Kaçırılan', sym: '✗',  color: 'var(--c-miss)' },
  blunder:    { tr: 'Gaf',       sym: '??', color: 'var(--c-blunder)' },
};

// Logistic: centipawns (one side's perspective) -> that side's win% (0..100)
export function cpToWin(cp) {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

// Per-move accuracy from win% drop (CAPS-like curve)
export function moveAccuracy(winLoss) {
  const a = 103.1668 * Math.exp(-0.04354 * Math.max(0, winLoss)) - 3.1669;
  return Math.max(0, Math.min(100, a));
}

const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
export function materialWhiteMinusBlack(fen) {
  const board = fen.split(' ')[0];
  let s = 0;
  for (const ch of board) {
    if (ch >= 'A' && ch <= 'Z') { const v = VAL[ch.toLowerCase()]; if (v) s += v; }
    else if (ch >= 'a' && ch <= 'z') { const v = VAL[ch]; if (v) s -= v; }
  }
  return s;
}

// Core classifier. All win% values are from the MOVER's perspective.
// sacAmount = net material (in pawns) the mover gives up after the opponent's
// best reply (0 if the move is not a sacrifice).
export function classifyMove(o) {
  const { isBest, sacAmount, winBefore, winAfter, pv2WinBefore, afterCpMover } = o;
  const loss = Math.max(0, winBefore - winAfter);

  if (isBest) {
    // Brilliant: a sound sacrifice that stays good for the mover.
    // - if not already crushing: any real sacrifice (>=1.5) qualifies
    // - if already winning: needs a bigger sacrifice (>=2.0, i.e. a piece+)
    const realSac = sacAmount >= 1.5;
    const bigSac = sacAmount >= 2.0;
    if (winAfter >= 48 && (winBefore < 90 ? realSac : bigSac)) return 'brilliant';
    // Great: clearly the single strong move (big gap to the 2nd-best).
    if (pv2WinBefore != null && (winBefore - pv2WinBefore) >= 12 && winBefore >= 20 && winBefore <= 92) return 'great';
    return 'best';
  }

  if (loss <= 2) return 'excellent';
  if (loss <= 5) return 'good';
  if (loss <= 10) return 'inaccuracy';

  const missCond = winBefore >= 55 && afterCpMover > -120; // was better, didn't fall into a lost game
  if (loss <= 20) return missCond ? 'miss' : 'mistake';
  return missCond ? 'miss' : 'blunder';
}

// Opening detection over a list of SAN moves (chess.js canonical SAN).
export function analyzeOpenings(sanList) {
  if (!sanList.length) return null;
  const seqAt = [];
  let acc = '';
  for (let k = 0; k < sanList.length; k++) { acc = k === 0 ? sanList[0] : acc + ' ' + sanList[k]; seqAt[k] = acc; }
  const fullGame = seqAt[seqAt.length - 1];

  let deepest = -1;
  const maxCheck = Math.min(sanList.length, 20);
  for (let k = 0; k < maxCheck; k++) {
    const s = seqAt[k];
    let inBook = false;
    for (let j = 0; j < OPENINGS.length; j++) {
      const os = OPENINGS[j][0];
      if (os.length < s.length) continue;
      if (os === s || os.startsWith(s + ' ')) { inBook = true; break; }
    }
    if (inBook) deepest = k; else break;
  }

  let name = null, eco = null, bestLen = -1;
  for (let j = 0; j < OPENINGS.length; j++) {
    const os = OPENINGS[j][0];
    if (os.length > fullGame.length) continue;
    if (fullGame === os || fullGame.startsWith(os + ' ')) {
      if (os.length > bestLen) { bestLen = os.length; name = OPENINGS[j][1]; eco = OPENINGS[j][2]; }
    }
  }
  if (deepest < 0 && !name) return null;
  return { deepestBookPly: deepest, name, eco };
}

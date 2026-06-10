// share.js — build a shareable result card (canvas) for Twitter/Instagram.
import { t } from './i18n.js';

const COL = {
  bg1: '#2b2926', bg2: '#1d1b19', panel: '#35322e', line: '#46423d',
  text: '#efece8', dim: '#a8a39d', green: '#81b64c', greenHi: '#9bd45f',
};
const CLS_COL = {
  brilliant: '#1bbfa6', great: '#5b9bd1', best: '#8bc34a', excellent: '#9fc15f',
  good: '#a7b59b', book: '#b08a5a', forced: '#6f8088', inaccuracy: '#f2c14e',
  mistake: '#e8923a', miss: '#e8693a', blunder: '#d34b46',
};
const CLS_SYM = {
  brilliant: '!!', great: '!', best: '★', excellent: '✓', good: '✓', book: '◆',
  forced: '⊡', inaccuracy: '?!', mistake: '?', miss: '✗', blunder: '??',
};
const ORDER = ['brilliant', 'great', 'best', 'excellent', 'good', 'book', 'forced', 'inaccuracy', 'mistake', 'miss', 'blunder'];

export async function openShareCard(data) {
  try { await document.fonts.ready; } catch (e) {}
  const canvas = drawCard(data);
  showModal(canvas);
}

function roundRect(x, c, X, y, w, h, r) {
  c.beginPath();
  c.moveTo(X + r, y); c.arcTo(X + w, y, X + w, y + h, r); c.arcTo(X + w, y + h, X, y + h, r);
  c.arcTo(X, y + h, X, y, r); c.arcTo(X, y, X + w, y, r); c.closePath();
}

function drawCard(d) {
  const W = 1080, H = 1350, P = 70;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');

  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, COL.bg1); g.addColorStop(1, COL.bg2);
  c.fillStyle = g; c.fillRect(0, 0, W, H);

  // header: logo tile + title
  c.fillStyle = COL.green; roundRect(0, c, P, P, 96, 96, 22); c.fill();
  c.fillStyle = '#1f3010'; c.font = '700 60px "Noto Sans Symbols 2", sans-serif';
  c.textBaseline = 'middle'; c.textAlign = 'center'; c.fillText('♞', P + 48, P + 50);
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.fillStyle = COL.text; c.font = '800 60px Sora, sans-serif';
  c.fillText('Şah', P + 120, P + 50);
  const wTitle = c.measureText('Şah').width;
  c.fillStyle = COL.greenHi; c.fillText('Analiz', P + 120 + wTitle, P + 50);
  c.fillStyle = COL.dim; c.font = '400 26px Outfit, sans-serif';
  c.fillText(t('reviewTitle'), P + 122, P + 86);

  // opening pill
  let y = P + 150;
  if (d.openingName) {
    const label = (d.eco ? d.eco + ' · ' : '') + d.openingName;
    c.font = '600 28px Outfit, sans-serif';
    const tw = Math.min(W - 2 * P, c.measureText(label).width + 44);
    c.fillStyle = 'rgba(176,138,90,.16)'; roundRect(0, c, P, y, tw, 50, 12); c.fill();
    c.fillStyle = '#d8b487'; c.textBaseline = 'middle';
    c.fillText(clip(c, label, W - 2 * P - 44), P + 22, y + 26);
    c.textBaseline = 'alphabetic';
    y += 86;
  } else { y += 20; }

  // accuracy panel
  const panelH = 250;
  c.fillStyle = COL.panel; roundRect(0, c, P, y, W - 2 * P, panelH, 24); c.fill();
  const colW = (W - 2 * P) / 2;
  drawPlayer(c, P, y, colW, panelH, d.white, d.whiteAcc, d.result === '1-0', d.whiteIsUser);
  drawPlayer(c, P + colW, y, colW, panelH, d.black, d.blackAcc, d.result === '0-1', d.blackIsUser);
  // center vs + result
  c.strokeStyle = COL.line; c.lineWidth = 2;
  c.beginPath(); c.moveTo(P + colW, y + 40); c.lineTo(P + colW, y + panelH - 40); c.stroke();
  c.fillStyle = COL.dim; c.font = '700 30px Sora, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = COL.green; roundRect(0, c, P + colW - 46, y + panelH / 2 - 28, 92, 56, 14); c.fill();
  c.fillStyle = '#fff'; c.font = '800 30px Sora, sans-serif'; c.fillText(d.result || 'vs', P + colW, y + panelH / 2);
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  y += panelH + 50;

  // counts: two columns
  c.fillStyle = COL.text; c.font = '700 30px Sora, sans-serif';
  const rows = ORDER.filter((k) => (d.counts.white[k] || 0) + (d.counts.black[k] || 0) > 0);
  const lineH = 58;
  for (let i = 0; i < rows.length; i++) {
    const k = rows[i];
    const ry = y + i * lineH;
    // dot + symbol
    c.fillStyle = CLS_COL[k]; c.beginPath(); c.arc(P + 22, ry + 18, 20, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.font = '800 22px "Noto Sans Symbols 2", Sora, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(CLS_SYM[k], P + 22, ry + 19);
    c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillStyle = COL.text; c.font = '600 30px Outfit, sans-serif';
    c.fillText(t('cls' + cap(k)), P + 58, ry + 19);
    // counts on right
    c.font = '700 30px Sora, sans-serif'; c.textAlign = 'right';
    c.fillStyle = COL.dim;
    c.fillText(String(d.counts.white[k] || 0), P + colW - 40, ry + 19);
    c.fillText(String(d.counts.black[k] || 0), P + 2 * colW - 40, ry + 19);
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
  }

  // footer
  c.fillStyle = COL.dim; c.font = '500 28px Outfit, sans-serif'; c.textAlign = 'center';
  c.fillText(t('shareFooter') + ' · tumyla.github.io/sahanaliz', W / 2, H - 56);
  c.textAlign = 'left';
  return cv;
}

function drawPlayer(c, x, y, w, h, name, acc, won, isUser) {
  const cx = x + w / 2;
  c.textAlign = 'center';
  c.fillStyle = won ? '#cfe6b0' : COL.dim;
  c.font = '600 30px Outfit, sans-serif'; c.textBaseline = 'alphabetic';
  c.fillText(clip(c, (isUser ? '★ ' : '') + (name || ''), w - 40), cx, y + 64);
  c.fillStyle = won ? COL.greenHi : COL.text;
  c.font = '800 96px Sora, sans-serif';
  c.fillText(acc != null ? String(acc) : '—', cx, y + 168);
  c.fillStyle = COL.dim; c.font = '600 26px Outfit, sans-serif';
  c.fillText(t('shareAccuracy'), cx, y + 206);
  c.textAlign = 'left';
}

function clip(c, s, maxW) {
  s = String(s == null ? '' : s);
  if (c.measureText(s).width <= maxW) return s;
  while (s.length > 1 && c.measureText(s + '…').width > maxW) s = s.slice(0, -1);
  return s + '…';
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function showModal(canvas) {
  const old = document.getElementById('shareModal'); if (old) old.remove();
  const overlay = document.createElement('div'); overlay.id = 'shareModal'; overlay.className = 'share-modal';
  const box = document.createElement('div'); box.className = 'share-box';
  const img = document.createElement('img'); img.className = 'share-img'; img.alt = t('shareTitle');
  img.src = canvas.toDataURL('image/png');
  const row = document.createElement('div'); row.className = 'share-actions';

  const saveBtn = document.createElement('button'); saveBtn.className = 'go'; saveBtn.innerHTML = '<span>' + t('shareBtnSave') + '</span>';
  saveBtn.onclick = () => canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'sahanaliz.png'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, 'image/png');

  const shareBtn = document.createElement('button'); shareBtn.className = 'ghost-btn'; shareBtn.textContent = t('shareBtnShare');
  shareBtn.onclick = () => canvas.toBlob(async (blob) => {
    const file = new File([blob], 'sahanaliz.png', { type: 'image/png' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'ŞahAnaliz', text: t('shareFooter') });
      } else { saveBtn.click(); }
    } catch (e) { /* user cancelled */ }
  }, 'image/png');

  const closeBtn = document.createElement('button'); closeBtn.className = 'ghost-btn'; closeBtn.textContent = t('shareBtnClose');
  closeBtn.onclick = () => overlay.remove();

  row.appendChild(saveBtn); row.appendChild(shareBtn); row.appendChild(closeBtn);
  box.appendChild(img); box.appendChild(row); overlay.appendChild(box);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

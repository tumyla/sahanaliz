// engine.js — Stockfish (WASM) Web Worker wrapper.
// Single-threaded build → no special headers needed on the host.

export class Engine {
  constructor() {
    this.worker = new Worker('stockfish.js');
    this.ready = false;
    this._listeners = [];
    this.worker.onmessage = (e) => {
      const line = typeof e.data === 'string' ? e.data : (e.data && e.data.data) || '';
      if (!line) return;
      for (const fn of this._listeners.slice()) fn(line);
    };
  }

  _send(cmd) { this.worker.postMessage(cmd); }
  _on(fn) { this._listeners.push(fn); return () => { this._listeners = this._listeners.filter((x) => x !== fn); }; }

  init(multipv = 2) {
    return new Promise((resolve) => {
      let uciok = false;
      const off = this._on((line) => {
        if (line.indexOf('uciok') === 0) {
          uciok = true;
          this._send('setoption name MultiPV value ' + multipv);
          this._send('setoption name Hash value 64');
          this._send('isready');
        } else if (uciok && line.indexOf('readyok') === 0) {
          off();
          this.ready = true;
          resolve();
        }
      });
      this._send('uci');
    });
  }

  // Analyse one FEN to a fixed depth.
  // Returns { cpWhite, mate, bestUci, pv2:{cpWhite,mate,uci}|null, depth }
  // All scores converted to WHITE's perspective (positive = good for White).
  analyse(fen, depth) {
    return new Promise((resolve) => {
      const stm = fen.split(' ')[1] === 'b' ? -1 : 1; // multiply stm-relative score by this -> white score
      const pv = { 1: null, 2: null };
      let lastDepth = 0;

      const mateToCp = (wm) => (wm > 0 ? (100000 - wm * 10) : (-100000 - wm * 10));

      const off = this._on((line) => {
        if (line.indexOf('info') === 0 && line.indexOf(' pv ') !== -1 && line.indexOf('score') !== -1) {
          const t = line.split(/\s+/);
          const mpIdx = t.indexOf('multipv');
          const mp = mpIdx >= 0 ? parseInt(t[mpIdx + 1], 10) : 1;
          const dIdx = t.indexOf('depth');
          const d = dIdx >= 0 ? parseInt(t[dIdx + 1], 10) : 0;
          const pvIdx = t.indexOf('pv');
          const uci = pvIdx >= 0 ? t[pvIdx + 1] : null;
          const sIdx = t.indexOf('score');
          const type = t[sIdx + 1];
          const val = parseInt(t[sIdx + 2], 10);
          let cpWhite, mate = null;
          if (type === 'mate') { const wm = val * stm; mate = wm; cpWhite = mateToCp(wm); }
          else { cpWhite = val * stm; }
          if (mp === 1 || mp === 2) pv[mp] = { cpWhite, mate, uci, depth: d };
          if (d > lastDepth) lastDepth = d;
        } else if (line.indexOf('bestmove') === 0) {
          off();
          const bm = line.split(/\s+/)[1];
          const best = pv[1] || { cpWhite: 0, mate: null, uci: (bm && bm !== '(none)') ? bm : null };
          resolve({
            cpWhite: best.cpWhite,
            mate: best.mate,
            bestUci: best.uci || ((bm && bm !== '(none)') ? bm : null),
            pv2: pv[2] ? { cpWhite: pv[2].cpWhite, mate: pv[2].mate, uci: pv[2].uci } : null,
            depth: lastDepth,
          });
        }
      });

      this._send('position fen ' + fen);
      this._send('go depth ' + depth);
    });
  }

  quit() { try { this._send('quit'); this.worker.terminate(); } catch (e) { /* noop */ } }
}

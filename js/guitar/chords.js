/* Doigtés d'accords de guitare + dessin des diagrammes (SVG et PDF). */
(function () {
  'use strict';
  const M = Music;
  const X = -1;

  // Accords ouverts courants : clé = "pc:type", cases de la 6e corde (Mi grave) à la 1re (Mi aigu)
  const OPEN = {
    '0:maj': [X, 3, 2, 0, 1, 0], '2:maj': [X, X, 0, 2, 3, 2], '4:maj': [0, 2, 2, 1, 0, 0], '7:maj': [3, 2, 0, 0, 0, 3],
    '9:maj': [X, 0, 2, 2, 2, 0], '5:maj': { f: [1, 3, 3, 2, 1, 1], barre: 1 },
    '9:min': [X, 0, 2, 2, 1, 0], '2:min': [X, X, 0, 2, 3, 1], '4:min': [0, 2, 2, 0, 0, 0], '11:min': { f: [X, 2, 4, 4, 3, 2], barre: 2 },
    '9:7': [X, 0, 2, 0, 2, 0], '11:7': [X, 2, 1, 2, 0, 2], '0:7': [X, 3, 2, 3, 1, 0], '2:7': [X, X, 0, 2, 1, 2],
    '4:7': [0, 2, 0, 1, 0, 0], '7:7': [3, 2, 0, 0, 0, 1],
    '9:maj7': [X, 0, 2, 1, 2, 0], '0:maj7': [X, 3, 2, 0, 0, 0], '2:maj7': [X, X, 0, 2, 2, 2], '4:maj7': [0, 2, 1, 1, 0, 0],
    '5:maj7': [X, X, 3, 2, 1, 0], '7:maj7': [3, 2, 0, 0, 0, 2],
    '9:m7': [X, 0, 2, 0, 1, 0], '2:m7': { f: [X, X, 0, 2, 1, 1], barre: 1 }, '4:m7': [0, 2, 0, 0, 0, 0],
    '9:sus4': [X, 0, 2, 2, 3, 0], '2:sus4': [X, X, 0, 2, 3, 3], '4:sus4': [0, 2, 2, 2, 0, 0],
    '9:sus2': [X, 0, 2, 2, 0, 0], '2:sus2': [X, X, 0, 2, 3, 0],
    '0:add9': [X, 3, 2, 0, 3, 0], '7:add9': [3, 0, 0, 2, 0, 3],
    '0:6': [X, 3, 2, 2, 1, 0], '9:6': [X, 0, 2, 2, 2, 2], '4:6': [0, 2, 2, 1, 2, 0], '7:6': [3, 2, 0, 0, 0, 0], '2:6': [X, X, 0, 2, 0, 2],
    '9:m6': [X, 0, 2, 2, 1, 2], '4:m6': [0, 2, 2, 0, 2, 0], '2:m6': [X, X, 0, 2, 0, 1],
    '4:5': [0, 2, 2, X, X, X], '9:5': [X, 0, 2, 2, X, X], '2:5': [X, X, 0, 2, 3, X],
    '4:9': [0, 2, 0, 1, 0, 2], '2:dim7': [X, X, 0, 1, 0, 1], '11:m7b5': [X, 2, 3, 2, 3, X]
  };

  // Formes mobiles (décalages par rapport à la case de la fondamentale)
  const E_SHAPES = {
    maj: [0, 2, 2, 1, 0, 0], min: [0, 2, 2, 0, 0, 0], '7': [0, 2, 0, 1, 0, 0], m7: [0, 2, 0, 0, 0, 0],
    maj7: [0, X, 1, 1, 0, X], m7b5: [0, X, 0, 0, -1, X], dim7: [0, X, -1, 0, -1, X], sus4: [0, 2, 2, 2, 0, 0],
    '5': [0, 2, 2, X, X, X], '9': [0, X, 0, 1, 0, 2], '6': [0, 2, 2, 1, 2, 0], m6: [0, 2, 2, 0, 2, 0],
    aug: [0, X, 2, 1, 1, 0], add9: [0, 2, 2, 1, 0, 2], dim: [0, 1, 2, 0, X, X], mMaj7: [0, 2, 1, 0, 0, 0], sus2: [0, 2, 4, 4, 0, 0]
  };
  const A_SHAPES = {
    maj: [X, 0, 2, 2, 2, 0], min: [X, 0, 2, 2, 1, 0], '7': [X, 0, 2, 0, 2, 0], m7: [X, 0, 2, 0, 1, 0],
    maj7: [X, 0, 2, 1, 2, 0], m7b5: [X, 0, 1, 0, 1, X], dim7: [X, 0, 1, -1, 1, X], sus4: [X, 0, 2, 2, 3, 0],
    sus2: [X, 0, 2, 2, 0, 0], '6': [X, 0, 2, 2, 2, 2], m6: [X, 0, 2, -1, 1, X], '9': [X, 0, -1, 0, 0, 0],
    aug: [X, 0, 3, 2, 2, X], dim: [X, 0, 1, 2, 1, X], '5': [X, 0, 2, 2, X, X], add9: [X, 0, 2, 4, 2, 0], mMaj7: [X, 0, 2, 1, 1, 0]
  };

  const TUNING = [40, 45, 50, 55, 59, 64]; // Mi La Ré Sol Si Mi

  function fromShape(shape, r, rootString) {
    const frets = shape.map((o) => (o === X ? X : r + o));
    if (frets.some((f, i) => shape[i] !== X && f < 0)) return null;
    const barre = r > 0 && frets[5] === r ? r : 0;
    return { frets, barre, barreFrom: rootString };
  }

  function voicing(ch) {
    const pc = M.pcOf(ch.root);
    const type = ch.type;
    const key = pc + ':' + type;
    const cands = [];
    if (OPEN[key]) {
      const o = OPEN[key];
      const v = Array.isArray(o) ? { frets: o, barre: 0 } : { frets: o.f, barre: o.barre };
      if (v.barre) v.barreFrom = v.frets.findIndex((f) => f === v.barre);
      cands.push(Object.assign(v, { score: Array.isArray(o) ? -10 : -2 }));
    }
    const rE = M.mod(pc - 4, 12);
    const rA = M.mod(pc - 9, 12);
    if (E_SHAPES[type]) { const v = fromShape(E_SHAPES[type], rE, 0); if (v) cands.push(Object.assign(v, { score: Math.max(...v.frets) })); }
    if (A_SHAPES[type]) { const v = fromShape(A_SHAPES[type], rA, 1); if (v) cands.push(Object.assign(v, { score: Math.max(...v.frets) + 0.5 })); }
    if (!cands.length) {
      // repli : triade correspondante
      const fallback = /^m/.test(type) && type !== 'maj7' ? 'min' : 'maj';
      return voicing({ root: ch.root, type: fallback });
    }
    cands.sort((a, b) => a.score - b.score);
    const v = cands[0];
    v.midis = v.frets.map((f, i) => (f === X ? null : TUNING[i] + f));
    if (ch.bass) {
      // basse imposée (accord « slash ») : on place la basse sur une des 3 cordes graves
      const bpc = M.pcOf(ch.bass);
      const ref = Math.min(...v.frets.filter((f) => f > 0).concat([5]));
      outer: for (let s = 0; s < 3; s++) {
        for (let f = 0; f <= 7; f++) {
          if (M.mod(TUNING[s] + f - bpc, 12) !== 0 || (f > 0 && Math.abs(f - ref) > 3)) continue;
          const fr = v.frets.slice();
          for (let k = 0; k < s; k++) fr[k] = X;
          fr[s] = f;
          v.frets = fr;
          v.barre = 0;
          v.midis = fr.map((ff, i) => (ff === X ? null : TUNING[i] + ff));
          break outer;
        }
      }
    }
    return v;
  }

  /** Primitives de dessin d'un diagramme dans une boîte de 60 x 78 unités. */
  function diagramPrims(name, v) {
    const p = [];
    const left = 8, right = 52, top = 22, fretH = 10.5, nFrets = 5;
    const sx = (s) => left + s * (right - left) / 5;
    const played = v.frets.filter((f) => f > 0);
    const maxF = played.length ? Math.max(...played) : 0;
    const minF = played.length ? Math.min(...played) : 0;
    const base = maxF <= 5 ? 1 : minF;
    p.push({ t: 'text', x: 30, y: 9, s: name, size: 9.5, bold: true, anchor: 'middle' });
    for (let s = 0; s < 6; s++) p.push({ t: 'line', x1: sx(s), y1: top, x2: sx(s), y2: top + fretH * nFrets, w: 0.6 });
    for (let f = 0; f <= nFrets; f++) p.push({ t: 'line', x1: left, y1: top + f * fretH, x2: right, y2: top + f * fretH, w: f === 0 && base === 1 ? 2.4 : 0.6 });
    if (base > 1) p.push({ t: 'text', x: right + 2, y: top + fretH * 0.7, s: base + 'fr', size: 6.5, anchor: 'start' });
    v.frets.forEach((f, s) => {
      if (f === X) p.push({ t: 'text', x: sx(s), y: top - 3, s: '×', size: 7.5, anchor: 'middle' });
      else if (f === 0) p.push({ t: 'circle', cx: sx(s), cy: top - 5, r: 2.2, fill: false });
    });
    if (v.barre) {
      const rel = v.barre - base;
      const last = 5;
      const from = v.barreFrom != null ? v.barreFrom : 0;
      p.push({ t: 'rect', x: sx(from) - 3, y: top + rel * fretH + 2, w: sx(last) - sx(from) + 6, h: fretH - 4, r: 3 });
    }
    v.frets.forEach((f, s) => {
      if (f > 0 && !(v.barre && f === v.barre && s >= (v.barreFrom || 0))) {
        p.push({ t: 'circle', cx: sx(s), cy: top + (f - base) * fretH + fretH / 2, r: 3.4, fill: true });
      }
    });
    return p;
  }

  function diagramSVG(name, v, cls) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 64 78');
    if (cls) svg.setAttribute('class', cls);
    diagramPrims(name, v).forEach((p) => {
      let e;
      if (p.t === 'line') {
        e = document.createElementNS(ns, 'line');
        ['x1', 'y1', 'x2', 'y2'].forEach((k) => e.setAttribute(k, p[k]));
        e.setAttribute('stroke-width', p.w);
      } else if (p.t === 'text') {
        e = document.createElementNS(ns, 'text');
        e.setAttribute('x', p.x); e.setAttribute('y', p.y);
        e.setAttribute('font-size', p.size);
        e.setAttribute('text-anchor', p.anchor);
        if (p.bold) e.setAttribute('font-weight', '700');
        e.textContent = p.s;
      } else if (p.t === 'circle') {
        e = document.createElementNS(ns, 'circle');
        e.setAttribute('cx', p.cx); e.setAttribute('cy', p.cy); e.setAttribute('r', p.r);
        e.setAttribute('class', p.fill ? 'finger' : '');
        if (!p.fill) { e.setAttribute('fill', 'none'); e.setAttribute('stroke', 'currentColor'); e.setAttribute('stroke-width', '0.8'); }
      } else if (p.t === 'rect') {
        e = document.createElementNS(ns, 'rect');
        e.setAttribute('x', p.x); e.setAttribute('y', p.y); e.setAttribute('width', p.w); e.setAttribute('height', p.h);
        e.setAttribute('rx', p.r);
        e.setAttribute('class', 'finger');
        e.setAttribute('style', 'fill:currentColor');
      }
      svg.appendChild(e);
    });
    return svg;
  }

  window.Chords = { voicing, diagramPrims, diagramSVG, TUNING, X };
})();

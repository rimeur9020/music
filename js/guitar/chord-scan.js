/*
 * Partition → accords : on envoie une photo, les accords surlignés sont lus (OCR Tesseract.js),
 * puis les boucles qui se répètent sont nommées A, B, C… et repérées sur l'image.
 */
(function () {
  'use strict';
  const { h } = App;

  const TESS_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
  const COLORS = ['#e8590c', '#1971c2', '#2f9e44', '#9c36b5', '#c2255c', '#0c8599', '#f08c00', '#5c940d'];

  /* ------------------------------------------------------------------ */
  /* Noms d'accords                                                      */
  /* ------------------------------------------------------------------ */
  /** Nom d'accord propre, ou null si ce n'est pas un accord (toutes les notations de la fiche : -7, +7, 7(b9,#5)…). */
  function cleanChord(t) {
    const sym = ChordSym.parse(t);
    if (!sym) return null;
    if (sym.name.length > 16) return null;
    return sym.name;
  }
  /** Corrige les confusions fréquentes de la lecture automatique. */
  function fixOcr(raw) {
    let t = ChordSym.normalize(raw).replace(/[|!]/g, '').replace(/^[.,:;'"`]+|[.,:;'"`]+$/g, '');
    if (!t) return null;
    const direct = cleanChord(t);
    if (direct) return { text: direct, sure: true };
    const first = { 8: 'B', 6: 'G', 0: 'D', O: 'D', Q: 'G', c: 'C', a: 'A', d: 'D', e: 'E', f: 'F', g: 'G', b: 'B', '€': 'E', '(': 'C', '[': 'C', '{': 'C' };
    const fixes = [
      (x) => x.replace(/^([A-G])\1/i, '$1'),
      (x) => x.replace(/[)}\]]+$/, ''),
      (x) => x.replace(/\(([^)]*)$/, '($1)'),
      (x) => x.replace(/[oOcC}\]]+$/, ''),
      (x) => x.replace(/^([A-G])(H|ff|tt|t)/, '$1#').replace(/H/g, '#'),
      (x) => x.replace(/^([A-G])[iIl1t]m/, '$1#m'),
      (x) => x.replace(/^([A-G][#b]?)(?:—|_|~)/, '$1-'),
      (x) => x.replace(/[iIl1|\\]([A-G][#b]?)$/, '/$1'),
      (x) => x.replace(/rn/g, 'm'),
      (x) => x.replace(/sus[dA]$/, 'sus4').replace(/sus[zZ]$/, 'sus2'),
      (x) => x.replace(/([A-G])\s*S(us)/, '$1s$2'),
      (x) => x.replace(/I/g, '1').replace(/l/g, '1')
    ];
    // on essaie chaque correction, sur le texte lu et sur le texte avec la 1re lettre corrigée
    const variants = [];
    [t, (first[t[0]] || t[0]) + t.slice(1)].forEach((base) => {
      variants.push(base);
      fixes.forEach((f) => variants.push(f(base)));
      fixes.forEach((f) => fixes.forEach((g) => { if (f !== g) variants.push(g(f(base))); }));
    });
    for (const v of variants) { const c = cleanChord(v); if (c) return { text: c, sure: false }; }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* Image : zones surlignées                                            */
  /* ------------------------------------------------------------------ */
  function loadImage(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => res({ img, url });
      img.onerror = () => rej(new Error('Image illisible'));
      img.src = url;
    });
  }
  /** Image redimensionnée sur un canvas de travail (max 1800 px de large). */
  function workCanvas(img) {
    const scale = Math.min(1, 1800 / img.naturalWidth);
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c;
  }
  /** Image en pleine résolution (max 4000 px) pour lire les petits accords. */
  function fullCanvas(img, work) {
    const scale = Math.min(1, 4000 / img.naturalWidth);
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return { canvas: c, k: c.width / work.width };
  }
  let satMin = 0.28;
  function isHighlight(r, g, b) {
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const v = max / 255, s = max ? (max - min) / max : 0;
    return s > satMin && v > 0.5;
  }
  /** Seuil de couleur adapté au papier : un papier jaunâtre ou une lumière chaude ne doivent pas compter comme du fluo. */
  function tuneThreshold(data) {
    const sats = [];
    for (let i = 0; i < data.length; i += 4 * 37) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      if (max > 140) sats.push(max ? (max - min) / max : 0);
    }
    sats.sort((a, b) => a - b);
    const paper = sats.length ? sats[Math.floor(sats.length * 0.5)] : 0;
    // les fluos pâles (rose, bleu clair) sont peu saturés : seuil bas, mais au-dessus du papier
    satMin = Math.max(0.16, Math.min(0.4, paper + 0.13));
  }
  /** Rectangles des zones surlignées (fluo jaune, vert, rose, orange, bleu…). */
  function findHighlights(c) {
    const W = c.width, H = c.height;
    const data = c.getContext('2d').getImageData(0, 0, W, H).data;
    tuneThreshold(data);
    const cell = 3; // on travaille sur une grille de 3 px pour aller vite
    const gw = Math.ceil(W / cell), gh = Math.ceil(H / cell);
    const grid = new Uint8Array(gw * gh);
    for (let gy = 0; gy < gh; gy++) {
      for (let gx = 0; gx < gw; gx++) {
        let n = 0, tot = 0;
        for (let y = gy * cell; y < Math.min(H, gy * cell + cell); y++) {
          for (let x = gx * cell; x < Math.min(W, gx * cell + cell); x++) {
            const i = (y * W + x) * 4;
            tot++;
            if (isHighlight(data[i], data[i + 1], data[i + 2])) n++;
          }
        }
        if (n / tot > 0.3) grid[gy * gw + gx] = 1;
      }
    }
    // composantes connexes (avec un peu de tolérance horizontale)
    const seen = new Uint8Array(gw * gh);
    const boxes = [];
    for (let i = 0; i < grid.length; i++) {
      if (!grid[i] || seen[i]) continue;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, count = 0;
      const stack = [i];
      seen[i] = 1;
      while (stack.length) {
        const k = stack.pop();
        const x = k % gw, y = (k - x) / gw;
        count++;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const nk = ny * gw + nx;
          if (grid[nk] && !seen[nk]) { seen[nk] = 1; stack.push(nk); }
        }
      }
      const bw = (x1 - x0 + 1) * cell, bh = (y1 - y0 + 1) * cell;
      if (count < 12 || bw < 12 || bh < 8 || bh > H * 0.15 || bw > W * 0.9) continue;
      // un vrai surlignage est une zone pleine de couleur ; les reflets colorés au bord
      // des lettres (photo, écran) donnent des zones très « creuses »
      const bx = x0 * cell, by = y0 * cell;
      let px = 0, area = 0;
      for (let y = by; y < Math.min(H, by + bh); y++) {
        for (let x = bx; x < Math.min(W, bx + bw); x++) {
          const k = (y * W + x) * 4;
          area++;
          if (isHighlight(data[k], data[k + 1], data[k + 2])) px++;
        }
      }
      if (px / area < 0.45) continue;
      boxes.push({ x: bx, y: by, w: bw, h: bh });
    }
    return orderBoxes(boxes);
  }
  /** Ordre de lecture : par lignes, puis de gauche à droite. */
  function orderBoxes(boxes) {
    if (!boxes.length) return boxes;
    const hs = boxes.map((b) => b.h).sort((a, b) => a - b);
    const tol = hs[Math.floor(hs.length / 2)] * 0.6;
    const sorted = boxes.slice().sort((a, b) => (a.y + a.h / 2) - (b.y + b.h / 2));
    const rows = [];
    sorted.forEach((b) => {
      const cy = b.y + b.h / 2;
      const row = rows.find((r) => Math.abs(r.cy - cy) < tol);
      if (row) { row.items.push(b); row.cy = (row.cy * (row.items.length - 1) + cy) / row.items.length; } else rows.push({ cy, items: [b] });
    });
    rows.sort((a, b) => a.cy - b.cy);
    return [].concat(...rows.map((r) => r.items.sort((a, b) => a.x - b.x)));
  }
  /** Découpe une zone, enlève la couleur du surligneur, agrandit : texte noir sur blanc. */
  function cropForOcr(c, b0, k, target) {
    // on découpe dans l'image en pleine résolution (k = rapport avec l'image de travail)
    k = k || 1;
    const b = { x: b0.x * k, y: b0.y * k, w: b0.w * k, h: b0.h * k };
    const padX = Math.max(3, Math.round(b.h * 0.15)), padY = Math.max(3, Math.round(b.h * 0.1));
    const x = Math.max(0, Math.round(b.x - padX)), y = Math.max(0, Math.round(b.y - padY));
    const w = Math.min(c.width - x, Math.round(b.w + padX * 2)), hh = Math.min(c.height - y, Math.round(b.h + padY * 2));
    const src = c.getContext('2d').getImageData(x, y, w, hh);
    const scale = Math.max(1.5, Math.min(6, (target || 120) / hh));
    const out = document.createElement('canvas');
    out.width = w * scale; out.height = hh * scale;
    const tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = hh;
    const d = src.data;
    // luminance + seuil d'Otsu : le texte (sombre) ressort, le fluo devient blanc
    const lum = new Float32Array(w * hh);
    const hist = new Array(256).fill(0);
    for (let i = 0; i < w * hh; i++) {
      const l = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
      lum[i] = l; hist[Math.round(l)]++;
    }
    let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
    let sumB = 0, wB = 0, best = 0, thr = 128;
    for (let t = 0; t < 256; t++) {
      wB += hist[t]; if (!wB) continue;
      const wF = w * hh - wB; if (!wF) break;
      sumB += t * hist[t];
      const mB = sumB / wB, mF = (sum - sumB) / wF;
      const between = wB * wF * (mB - mF) * (mB - mF);
      if (between > best) { best = between; thr = t; }
    }
    for (let i = 0; i < w * hh; i++) {
      const v = lum[i] < thr ? 0 : 255;
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255;
    }
    tmp.getContext('2d').putImageData(src, 0, 0);
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, out.width, out.height);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(tmp, 0, 0, out.width, out.height);
    // marge blanche autour (Tesseract lit mieux)
    const framed = document.createElement('canvas');
    framed.width = out.width + 40; framed.height = out.height + 40;
    const fc = framed.getContext('2d');
    fc.fillStyle = '#fff'; fc.fillRect(0, 0, framed.width, framed.height);
    fc.drawImage(out, 20, 20);
    return framed;
  }

  /* ------------------------------------------------------------------ */
  /* OCR                                                                 */
  /* ------------------------------------------------------------------ */
  let workerP = null;
  function getWorker(onProgress) {
    if (workerP) return workerP;
    workerP = (async () => {
      if (!window.Tesseract) {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = TESS_URL; s.onload = res; s.onerror = () => rej(new Error('Impossible de charger la lecture automatique (connexion internet ?)'));
          document.head.appendChild(s);
        });
      }
      const w = await Tesseract.createWorker('eng', 1, {
        logger: (m) => { if (onProgress && m.status && m.progress != null && /load|initial/i.test(m.status)) onProgress('Préparation de la lecture automatique… ' + Math.round(m.progress * 100) + ' %'); }
      });
      return w;
    })();
    workerP.catch(() => { workerP = null; });
    return workerP;
  }

  /** Lit chaque zone surlignée. Retourne [{ text, sure, box }]. */
  async function readBoxes(c, boxes, onProgress, full) {
    const w = await getWorker(onProgress);
    const WL = 'ABCDEFGabdegijlmnorsuMRSLéÉ0123456789#♯♭/()+-,°øΔ ';
    const out = [];
    let i = 0;
    const pass = async (img, psm, wl) => {
      await w.setParameters({ tessedit_pageseg_mode: psm, tessedit_char_whitelist: wl });
      const { data } = await w.recognize(img);
      // « 7(b9, #5) » : on recolle ce que la lecture a séparé autour des parenthèses et virgules
      const txt = (data.text || '').replace(/\s*([,(])\s*/g, '$1').replace(/\s+\)/g, ')');
      if (window.__scanDebug) console.log('OCR', i, psm, wl ? 'wl' : 'free', JSON.stringify(data.text), Math.round(data.confidence));
      return { data, txt, found: txt.split(/\s+/).filter(Boolean).map(fixOcr).filter(Boolean) };
    };
    for (i = 0; i < boxes.length; i++) {
      if (onProgress) onProgress(`Lecture des accords ${i + 1} / ${boxes.length}…`);
      // deux agrandissements : gros (lettres seules) et moyen (noms longs)
      const crop = (target) => (full ? cropForOcr(full.canvas, boxes[i], full.k, target) : cropForOcr(c, boxes[i], 1, target));
      const img = crop(120);
      let img2 = null;
      // plusieurs essais si la première lecture échoue ou hésite
      // on garde la lecture la plus sûre (accords reconnus + confiance de la lecture)
      const score = (x) => (x.found.length ? x.found.filter((f) => f.sure).length / x.found.length + x.data.confidence / 100 : -1);
      let r = await pass(img, '7', WL);
      const ok = (x) => x.found.length && x.found.every((f) => f.sure) && x.data.confidence >= 70;
      if (!ok(r)) {
        for (const [psm, wl, alt] of [['7', WL, true], ['6', WL], ['6', WL, true], ['8', WL], ['7', '']]) {
          if (alt && !img2) img2 = crop(70);
          const r2 = await pass(alt ? img2 : img, psm, wl);
          if (score(r2) > score(r)) r = r2;
          if (ok(r)) break;
        }
      }
      const { data, found } = r;
      if (found.length) found.forEach((f, k) => out.push({ text: f.text, sure: f.sure && data.confidence > 60, box: boxes[i], part: k, of: found.length }));
      else out.push({ text: (data.text || '').trim().slice(0, 10) || '?', sure: false, invalid: true, box: boxes[i] });
    }
    return out;
  }

  /** Sans surlignage : lit toute la page et garde les lignes qui sont des lignes d'accords. */
  async function readWholePage(c, onProgress) {
    const w = await getWorker(onProgress);
    await w.setParameters({ tessedit_pageseg_mode: '11', tessedit_char_whitelist: '' });
    if (onProgress) onProgress('Lecture de toute la page…');
    const { data } = await w.recognize(c);
    const out = [];
    (data.lines || []).forEach((line) => {
      const words = (line.words || []).filter((x) => x.text.trim());
      if (!words.length) return;
      const parsed = words.map((x) => ({ x, c: fixOcr(x.text) }));
      const ok = parsed.filter((p) => p.c && p.c.sure);
      // une ligne d'accords : la plupart des mots sont des accords (et pas des paroles)
      if (ok.length >= 1 && ok.length / words.length >= 0.6) {
        parsed.forEach((p) => {
          if (!p.c) return;
          const b = p.x.bbox;
          out.push({ text: p.c.text, sure: p.c.sure && p.x.confidence > 60, box: { x: b.x0, y: b.y0, w: b.x1 - b.x0, h: b.y1 - b.y0 } });
        });
      }
    });
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Boucles qui se répètent                                             */
  /* ------------------------------------------------------------------ */
  /**
   * Découpe la suite d'accords en parties qui se répètent.
   * Retourne { parts: [{ label, chords, occ: [[début, fin]] }], seq: [{ label, start, end }] }
   */
  function findLoops(chords) {
    const n = chords.length;
    const key = chords.map((c) => c.toLowerCase());
    const owner = new Array(n).fill(null);
    const parts = [];
    const free = (i, L) => { for (let k = i; k < i + L; k++) if (owner[k] !== null) return false; return true; };
    const eq = (i, j, L) => { for (let k = 0; k < L; k++) if (key[i + k] !== key[j + k]) return false; return true; };
    // 1. on cherche, encore et encore, le motif qui « explique » le plus d'accords
    //    (à égalité, le plus court : « A A B A A B » plutôt qu'un seul gros bloc)
    for (let guard = 0; guard < 26; guard++) {
      let best = null;
      for (let L = Math.min(16, Math.floor(n / 2)); L >= 2; L--) {
        for (let i = 0; i + L <= n; i++) {
          if (!free(i, L)) continue;
          // un motif qui n'est qu'une répétition d'un motif plus court sera trouvé avec ce motif plus court
          const occ = [i];
          let j = i + L;
          while (j + L <= n) {
            if (free(j, L) && eq(i, j, L)) { occ.push(j); j += L; } else j++;
          }
          if (occ.length < 2) continue;
          let period = L;
          for (let p = 1; p < L; p++) { if (L % p === 0) { let ok = true; for (let k = p; k < L; k++) if (key[i + k] !== key[i + k - p]) { ok = false; break; } if (ok) { period = p; break; } } }
          if (period < L && period >= 2) continue;
          const gain = L * (occ.length - 1);
          if (!best || gain > best.gain || (gain === best.gain && L < best.L)) best = { i, L, occ, gain };
        }
      }
      if (!best) break;
      const label = String.fromCharCode(65 + parts.length);
      parts.push({ label, chords: chords.slice(best.i, best.i + best.L), occ: best.occ.map((s) => [s, s + best.L - 1]) });
      best.occ.forEach((s) => { for (let k = s; k < s + best.L; k++) owner[k] = label; });
    }
    // 2. ce qui reste (passages joués une seule fois) : une partie par passage
    let i = 0;
    while (i < n) {
      if (owner[i] !== null) { i++; continue; }
      let j = i;
      while (j < n && owner[j] === null) j++;
      const seg = chords.slice(i, j);
      const same = parts.find((p) => p.chords.join('|').toLowerCase() === seg.join('|').toLowerCase());
      const label = same ? same.label : String.fromCharCode(65 + parts.length);
      if (same) same.occ.push([i, j - 1]); else parts.push({ label, chords: seg, occ: [[i, j - 1]], once: true });
      for (let k = i; k < j; k++) owner[k] = label;
      i = j;
    }
    // ordre d'apparition pour les lettres
    parts.sort((a, b) => a.occ[0][0] - b.occ[0][0]);
    const rename = {};
    parts.forEach((p, k) => { rename[p.label] = String.fromCharCode(65 + k); p.label = rename[p.label]; p.occ.sort((a, b) => a[0] - b[0]); });
    const seq = [];
    parts.forEach((p) => p.occ.forEach(([s, e]) => seq.push({ label: p.label, start: s, end: e })));
    seq.sort((a, b) => a.start - b.start);
    return { parts, seq };
  }
  /** « A ×2 – B – A ×2 » */
  function structureText(seq) {
    const out = [];
    seq.forEach((s) => {
      const last = out[out.length - 1];
      if (last && last.label === s.label) last.n++; else out.push({ label: s.label, n: 1 });
    });
    return out.map((x) => x.label + (x.n > 1 ? ' ×' + x.n : '')).join(' – ');
  }

  /* ------------------------------------------------------------------ */
  /* Page                                                                */
  /* ------------------------------------------------------------------ */
  function render(el) {
    const st = { imgUrl: null, canvas: null, items: App.store('scanChords', []), mode: App.store('scanMode', 'highlight'), alt: App.store('scanAlt', {}) };
    const fileIn = h('input', { type: 'file', accept: 'image/*', style: 'display:none' });
    const camIn = h('input', { type: 'file', accept: 'image/*', capture: 'environment', style: 'display:none' });
    const pick = h('button', { class: 'btn primary', text: '🖼️ Choisir une image' });
    const cam = h('button', { class: 'btn', text: '📷 Prendre une photo' });
    pick.addEventListener('click', () => fileIn.click());
    cam.addEventListener('click', () => camIn.click());
    const modeSeg = h('div', { class: 'segmented' });
    [['highlight', '🖍 Accords surlignés'], ['all', '🔎 Tous les accords de la page']].forEach(([id, l]) => {
      const b = h('button', { class: st.mode === id ? 'on' : '', text: l });
      b.addEventListener('click', () => { st.mode = id; App.save('scanMode', id); [...modeSeg.children].forEach((x) => x.classList.toggle('on', x === b)); });
      modeSeg.appendChild(b);
    });
    const msg = h('div');
    const imgBox = h('div', { class: 'scan-view' });
    const editBox = h('div');
    const partsBox = h('div');
    const guitarBox = h('div');
    el.appendChild(h('div', { class: 'panel' }, [
      h('h2', { style: 'margin-top:0', text: '1. La partition' }),
      h('p', { class: 'hint', html: 'Surligne les accords au fluo (jaune, vert, rose…) puis prends la partition en photo, bien à plat et bien éclairée. Sans surlignage, choisis « Tous les accords de la page » : le site garde les lignes qui ne contiennent que des accords. <b>La première lecture télécharge l’outil de lecture (~10 Mo), ensuite c’est plus rapide.</b>' }),
      h('div', { class: 'btn-row' }, [pick, cam, fileIn, camIn]),
      h('div', { style: 'margin-top:.6rem' }, [modeSeg]),
      msg
    ]));
    el.appendChild(imgBox);
    el.appendChild(editBox);
    el.appendChild(partsBox);
    el.appendChild(guitarBox);

    const onFile = async (f) => {
      if (!f) return;
      msg.innerHTML = '';
      const prog = h('div', { class: 'feedback info', text: 'Ouverture de l’image…' });
      msg.appendChild(prog);
      try {
        const { img, url } = await loadImage(f);
        if (st.imgUrl) URL.revokeObjectURL(st.imgUrl);
        st.imgUrl = url;
        st.canvas = workCanvas(img);
        st.full = fullCanvas(img, st.canvas);
        let items;
        if (st.mode === 'highlight') {
          prog.textContent = 'Recherche des zones surlignées…';
          await new Promise((r) => setTimeout(r, 30));
          const boxes = findHighlights(st.canvas);
          if (!boxes.length) {
            prog.className = 'notice warn';
            prog.textContent = 'Je ne vois pas de zones surlignées sur cette image. Vérifie que les accords sont bien surlignés au fluo, ou choisis « Tous les accords de la page ».';
            drawImage([]);
            return;
          }
          prog.textContent = boxes.length + ' zones surlignées trouvées. Lecture…';
          items = await readBoxes(st.canvas, boxes, (t) => { prog.textContent = t; }, st.full);
        } else {
          items = await readWholePage(st.canvas, (t) => { prog.textContent = t; });
        }
        msg.innerHTML = '';
        st.items = items.filter((x) => !x.invalid || st.mode === 'highlight');
        save();
        if (!st.items.length) msg.appendChild(h('div', { class: 'notice warn', text: 'Aucun accord n’a pu être lu. Essaie une photo plus nette et plus droite, ou ajoute les accords à la main ci-dessous.' }));
        drawAll();
      } catch (e) {
        msg.innerHTML = '';
        msg.appendChild(h('div', { class: 'notice warn', text: 'Erreur : ' + e.message }));
      }
    };
    fileIn.addEventListener('change', () => { onFile(fileIn.files[0]); fileIn.value = ''; });
    camIn.addEventListener('change', () => { onFile(camIn.files[0]); camIn.value = ''; });

    function save() { App.save('scanChords', st.items.map((x) => ({ text: x.text, sure: x.sure, invalid: x.invalid }))); }
    const validItems = () => st.items.filter((x) => !x.invalid && cleanChord(x.text));

    function drawImage(loopInfo) {
      imgBox.innerHTML = '';
      if (!st.canvas) return;
      const c = document.createElement('canvas');
      c.width = st.canvas.width; c.height = st.canvas.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(st.canvas, 0, 0);
      const valid = validItems();
      const lw = Math.max(2, c.width / 500);
      const font = Math.max(14, c.width / 70);
      ctx.font = `bold ${font}px system-ui, sans-serif`;
      const drawn = new Set();
      st.items.forEach((it) => {
        if (!it.box) return;
        const vi = valid.indexOf(it);
        let color = it.invalid ? '#c92a2a' : '#495057';
        let tag = vi >= 0 ? String(vi + 1) : '?';
        if (loopInfo && loopInfo.owner && vi >= 0) {
          const o = loopInfo.owner[vi];
          color = COLORS[(o.label.charCodeAt(0) - 65) % COLORS.length];
          tag = o.label + o.occ;
        }
        const bk = it.box.x + ',' + it.box.y;
        ctx.strokeStyle = color; ctx.lineWidth = lw;
        if (!drawn.has(bk)) ctx.strokeRect(it.box.x - 2, it.box.y - 2, it.box.w + 4, it.box.h + 4);
        drawn.add(bk);
        const tw = ctx.measureText(tag).width + 8;
        const tx = it.box.x - 2 + (it.part ? it.part * (tw + 2) : 0), ty = it.box.y - font - 6;
        ctx.fillStyle = color; ctx.fillRect(tx, Math.max(0, ty), tw, font + 4);
        ctx.fillStyle = '#fff'; ctx.fillText(tag, tx + 4, Math.max(font, ty + font));
      });
      imgBox.appendChild(h('div', { class: 'panel' }, [h('h2', { style: 'margin-top:0', text: '2. Ce que j’ai lu sur l’image' }),
        h('p', { class: 'hint', text: loopInfo ? 'Chaque accord porte le nom de sa partie et le numéro de son passage (A1 = 1er passage de la partie A, A2 = 2e passage…).' : 'Les numéros correspondent à la liste des accords ci-dessous.' }),
        h('div', { class: 'scan-img' }, [c])]));
    }

    function drawEditor() {
      editBox.innerHTML = '';
      const panel = h('div', { class: 'panel' });
      panel.appendChild(h('h2', { style: 'margin-top:0', text: '3. Les accords (dans l’ordre)' }));
      panel.appendChild(h('p', { class: 'hint', text: 'Vérifie : un accord en orange est incertain, en rouge illisible. Touche un accord pour le corriger, ✕ pour le supprimer. Tu peux aussi taper ou coller une suite d’accords.' }));
      const list = h('div', { class: 'scan-chords' });
      let num = 0;
      st.items.forEach((it, i) => {
        const valid = !it.invalid && cleanChord(it.text);
        if (valid) num++;
        const chip = h('span', { class: 'scan-chip' + (it.invalid || !valid ? ' bad' : it.sure ? '' : ' unsure') });
        if (valid) chip.appendChild(h('small', { text: String(num) }));
        const b = h('button', { class: 'scan-name', text: it.text });
        b.addEventListener('click', () => {
          const v = prompt('Accord (ex. Am, F#m7, -7, 7(b9,#5), G/B, Lam) — laisser vide pour supprimer :', it.text);
          if (v === null) return;
          if (!v.trim()) st.items.splice(i, 1);
          else { const c = cleanChord(v.trim().replace(/\s+/g, '')); if (!c) { alert('« ' + v + ' » n’est pas un nom d’accord reconnu.'); return; } it.text = c; it.sure = true; it.invalid = false; }
          save(); drawAll();
        });
        const x = h('button', { class: 'scan-x', text: '✕', title: 'Supprimer' });
        x.addEventListener('click', () => { st.items.splice(i, 1); save(); drawAll(); });
        chip.appendChild(b); chip.appendChild(x);
        list.appendChild(chip);
      });
      if (!st.items.length) list.appendChild(h('span', { class: 'muted', text: 'Aucun accord pour l’instant.' }));
      panel.appendChild(list);
      const add = h('input', { type: 'text', placeholder: 'Ajouter des accords à la fin : ex. C G Am F  ou  D-7 G7(b9) Cmaj7' });
      const addBtn = h('button', { class: 'btn small', text: '+ Ajouter' });
      const doAdd = () => {
        const toks = add.value.split(/[\s;|]+/).filter(Boolean);
        const bad = [];
        toks.forEach((t) => { const c = cleanChord(t); if (c) st.items.push({ text: c, sure: true }); else bad.push(t); });
        add.value = bad.join(' ');
        save(); drawAll();
        if (bad.length) alert('Non reconnu : ' + bad.join(', '));
      };
      addBtn.addEventListener('click', doAdd);
      add.addEventListener('keydown', (e) => { if (e.key === 'Enter') doAdd(); });
      const clear = h('button', { class: 'btn small', text: '🗑 Tout effacer' });
      clear.addEventListener('click', () => { if (confirm('Effacer tous les accords ?')) { st.items = []; save(); drawAll(); } });
      panel.appendChild(h('div', { class: 'free-search', style: 'margin-top:.6rem' }, [add, addBtn, clear]));
      editBox.appendChild(panel);
    }

    function drawParts() {
      partsBox.innerHTML = '';
      const chords = validItems().map((x) => x.text);
      if (chords.length < 2) { drawImage(null); return null; }
      const { parts, seq } = findLoops(chords);
      // pour l'image : partie + numéro de passage de chaque accord
      const owner = [];
      parts.forEach((p) => p.occ.forEach(([s, e], k) => { for (let i = s; i <= e; i++) owner[i] = { label: p.label, occ: k + 1 }; }));
      drawImage({ owner });

      const panel = h('div', { class: 'panel' });
      panel.appendChild(h('h2', { style: 'margin-top:0', text: '4. Les parties (boucles qui se répètent)' }));
      parts.forEach((p) => {
        const color = COLORS[(p.label.charCodeAt(0) - 65) % COLORS.length];
        const card = h('div', { class: 'loop-card', style: 'border-left-color:' + color });
        card.appendChild(h('div', { class: 'loop-head' }, [
          h('span', { class: 'loop-tag', style: 'background:' + color, text: p.label }),
          h('b', { text: p.occ.length > 1 ? `joué ${p.occ.length} fois` : 'joué 1 fois' }),
          h('span', { class: 'muted', text: ' · ' + p.chords.length + ' accord' + (p.chords.length > 1 ? 's' : '') })
        ]));
        card.appendChild(h('div', { class: 'loop-chords' }, p.chords.map((c) => chordCard(c, true))));
        const play = h('button', { class: 'btn small', text: '▶ Écouter' });
        play.addEventListener('click', () => playChords(p.chords));
        card.appendChild(play);
        panel.appendChild(card);
      });
      // zone « où ça se répète »
      const where = h('div', { class: 'loop-where' });
      where.appendChild(h('h3', { text: '📍 Où chaque partie revient' }));
      const ul = h('ul');
      parts.forEach((p) => {
        const places = p.occ.map(([s, e], k) => `${p.label}${k + 1} : accords n° ${s + 1} à ${e + 1}`);
        ul.appendChild(h('li', {}, [h('b', { text: p.label + ' → ' }), document.createTextNode(places.join(' · '))]));
      });
      where.appendChild(ul);
      where.appendChild(h('p', {}, [h('b', { text: 'Ordre du morceau : ' }), document.createTextNode(structureText(seq))]));
      where.appendChild(h('p', { class: 'hint', text: 'Les mêmes lettres sont dessinées sur l’image (A1, A2…) pour voir où chaque partie revient sur la partition.' }));
      panel.appendChild(where);
      const pdf = h('button', { class: 'btn primary', text: '⬇ Télécharger la grille (PDF)' });
      pdf.addEventListener('click', () => exportPdf(parts, seq));
      panel.appendChild(h('div', { class: 'btn-row' }, [pdf]));
      partsBox.appendChild(panel);
      return { parts, seq };
    }

    /** Doigté choisi pour un accord (le plus simple, ou celui choisi avec « autre doigté »). */
    function voicingOf(name) {
      const vs = ChordSym.voicings(ChordSym.parse(name));
      if (!vs.length) return null;
      return vs[(st.alt[name] || 0) % vs.length];
    }
    function strum(v, t) {
      v.midis.forEach((m, k) => { if (m != null) Audio2.guitar(m, t + k * 0.025, 1.4, 0.5); });
    }
    function playChords(names) {
      const t0 = Audio2.now() + 0.1;
      names.forEach((n, i) => { const v = voicingOf(n); if (v) strum(v, t0 + i * 1.2); });
    }
    /** Carte d'un accord : diagramme sur le manche, clic = écouter, ↻ = autre doigté. */
    function chordCard(name, small) {
      const card = h('div', { class: 'gchord' + (small ? ' small' : '') });
      const draw = () => {
        card.innerHTML = '';
        const vs = ChordSym.voicings(ChordSym.parse(name));
        const v = voicingOf(name);
        if (!v) { card.appendChild(h('div', { class: 'gchord-name', text: name })); card.appendChild(h('div', { class: 'muted', text: '?' })); return; }
        const btn = h('button', { class: 'gchord-btn', title: 'Écouter ' + name });
        btn.appendChild(ChordSym.diagram(name, v));
        btn.addEventListener('click', () => strum(v, Audio2.now() + 0.05));
        card.appendChild(btn);
        if (!small) card.appendChild(h('div', { class: 'gchord-label', text: v.label }));
        if (vs.length > 1) {
          const nx = h('button', { class: 'gchord-alt', text: small ? '↻' : '↻ autre doigté', title: 'Autre doigté' });
          nx.addEventListener('click', () => { st.alt[name] = ((st.alt[name] || 0) + 1) % vs.length; App.save('scanAlt', st.alt); drawAll(); });
          card.appendChild(nx);
        }
      };
      draw();
      return card;
    }
    function drawGuitar() {
      guitarBox.innerHTML = '';
      const names = [];
      validItems().forEach((x) => { if (names.indexOf(x.text) < 0) names.push(x.text); });
      if (!names.length) return;
      const panel = h('div', { class: 'panel' });
      panel.appendChild(h('h2', { style: 'margin-top:0', text: '🎸 Les accords du morceau sur la guitare' }));
      panel.appendChild(h('p', { class: 'hint', text: 'Le rond orange = la fondamentale (comme sur la fiche). Touche un diagramme pour l’entendre, ↻ pour un autre doigté. « 5fr » = la forme commence à la 5e case.' }));
      panel.appendChild(h('div', { class: 'gchord-grid' }, names.map((n) => chordCard(n, false))));
      guitarBox.appendChild(panel);
    }

    async function exportPdf(parts, seq) {
      if (!window.jspdf) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'vendor/jspdf.umd.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
      const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
      const ascii = (t) => t.replace(/é/g, 'e');
      let y = 20;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text('Grille d’accords', 15, y); y += 8;
      // diagrammes de tous les accords du morceau
      const names = [];
      parts.forEach((p) => p.chords.forEach((c) => { if (names.indexOf(c) < 0) names.push(c); }));
      const dw = 22, dh = 28, perRow = 8;
      names.forEach((n, i) => {
        const v = voicingOf(n);
        if (!v) return;
        const col = i % perRow;
        if (col === 0 && i > 0) y += dh + 2;
        if (y + dh > 285) { doc.addPage(); y = 20; }
        pdfDiagram(doc, Chords.diagramPrims(ascii(n), v), 15 + col * (dw + 1.5), y, dw / 64);
      });
      if (names.length) y += dh + 8;
      parts.forEach((p) => {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
        doc.text(`Partie ${p.label}  (jouée ${p.occ.length} fois)`, 15, y); y += 7;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(14);
        const line = p.chords.map(ascii).join('   |   ');
        doc.splitTextToSize('|   ' + line + '   |', 180).forEach((l) => { doc.text(l, 15, y); y += 7; });
        y += 4;
      });
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('Structure', 15, y); y += 7;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(14);
      doc.splitTextToSize(structureText(seq).replace(/–/g, '-').replace(/×/g, 'x'), 180).forEach((l) => { doc.text(l, 15, y); y += 7; });
      doc.save('grille-accords.pdf');
    }
    function pdfDiagram(doc, prims, x0, y0, k) {
      prims.forEach((p) => {
        if (p.t === 'line') { doc.setLineWidth(p.w * k); doc.setDrawColor(0); doc.line(x0 + p.x1 * k, y0 + p.y1 * k, x0 + p.x2 * k, y0 + p.y2 * k); }
        else if (p.t === 'text') {
          doc.setFont('helvetica', p.bold ? 'bold' : 'normal'); doc.setFontSize(p.size * k * 2.83);
          doc.setTextColor(p.light ? 255 : 0);
          doc.text(String(p.s).replace('×', 'x'), x0 + p.x * k, y0 + p.y * k, { align: p.anchor === 'middle' ? 'center' : p.anchor === 'end' ? 'right' : 'left' });
          doc.setTextColor(0);
        } else if (p.t === 'circle') {
          if (p.root) doc.setFillColor(217, 72, 15); else doc.setFillColor(0);
          doc.setLineWidth(0.8 * k);
          doc.circle(x0 + p.cx * k, y0 + p.cy * k, p.r * k, p.fill ? 'F' : 'S');
        } else if (p.t === 'rect') {
          doc.setFillColor(0);
          doc.roundedRect(x0 + p.x * k, y0 + p.y * k, p.w * k, p.h * k, p.r * k, p.r * k, 'F');
        }
      });
    }

    function drawAll() { drawEditor(); drawParts(); drawGuitar(); }
    drawAll();
  }

  App.register('/guitare/accompagnement', {
    title: 'Partition → accords',
    subtitle: 'Envoie une photo de ta partition avec les accords surlignés : je lis les accords, je trouve les boucles qui se répètent (A, B, C…) et je te montre où elles reviennent.',
    render
  });

  window.ChordScan = { cleanChord, fixOcr, findLoops, structureText, findHighlights };
})();

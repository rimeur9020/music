/*
 * Partition → accords.
 * 1. On trouve les accords écrits sur la photo de la partition (lecture automatique Tesseract.js).
 * 2. Chaque accord est dessiné sur la guitare avec la forme correspondante de la fiche d'accords
 *    (banque de formes, js/guitar/shape-bank.js), posée à la bonne case.
 */
(function () {
  'use strict';
  const { h } = App;
  const M = Music;
  const TESS_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
  const TUNING = [40, 45, 50, 55, 59, 64];

  /* ================================================================== */
  /* 1. Nom d'accord → notes                                             */
  /* ================================================================== */
  const ROOTS = '(?:[A-G]|Do|Ré|Re|Mi|Fa|Sol|La|Si)';
  const NAME_RE = new RegExp('^(' + ROOTS + ')([#b]?)(.*?)(?:/(' + ROOTS + ')([#b]?))?$');
  const FR = { Do: 'C', 'Ré': 'D', Re: 'D', Mi: 'E', Fa: 'F', Sol: 'G', La: 'A', Si: 'B' };
  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const pcOf = (l, acc) => M.mod(PC[FR[l] || l] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0), 12);
  const ALT = { b5: 6, '#5': 8, b6: 8, b9: 1, '#9': 3, '#11': 6, b13: 8 };
  const ADD = { 2: 2, 4: 5, 6: 9, 9: 2, 11: 5, 13: 9 };

  function normalize(t) {
    return String(t || '').trim().replace(/♯/g, '#').replace(/♭/g, 'b').replace(/[−–—]/g, '-').replace(/\s+/g, '');
  }

  /**
   * Comprend les notations classiques (Am7, F#m7b5, Cmaj7, Gsus4, D/F#, Lam…) et celles de la fiche :
   * -7, +, +7, -7(b5), -maj7, add2, -add4, -(b6), -6/9, 7(b9,#5), 7(9,13), -9+7, maj7(#5,#11), 13sus4…
   * Retourne { name, root, bass, ivs } ou null.
   */
  function parseChord(raw) {
    const t = normalize(raw);
    const m = NAME_RE.exec(t);
    if (!m) return null;
    const s = m[3];
    let third = 4, fifth = 7, sev = null, sus = null, power = false, majSev = false, minor = false;
    const ext = new Set();
    let i = 0;
    const eat = (re) => { const r = re.exec(s.slice(i)); if (r) { i += r[0].length; return r; } return null; };
    const num = (n) => {
      const sv = majSev ? 11 : 10;
      if (n === '5') power = true;
      else if (n === '6/9' || n === '69') { ext.add(9); ext.add(2); }
      else if (n === '6') ext.add(9);
      else if (n === '7') sev = sv;
      else if (n === '9') { sev = sv; ext.add(2); }
      else if (n === '11') { sev = sv; ext.add(2); ext.add(5); if (!minor) sus = 5; }
      else if (n === '13') { sev = sv; ext.add(2); ext.add(9); }
    };
    // qualité
    if (eat(/^(maj|Maj|MAJ|Δ|M(?!in|i))/)) { majSev = true; if (/Δ$/.test(s.slice(0, i)) && !/^[0-9]/.test(s.slice(i))) sev = 11; }
    else if (eat(/^(min|mi|m|-)/)) { minor = true; third = 3; }
    else if (eat(/^(dim|°)/)) { third = 3; fifth = 6; if (eat(/^7/)) sev = 9; }
    else if (eat(/^ø7?/)) { minor = true; third = 3; fifth = 6; sev = 10; }
    else if (eat(/^(aug|\+)/)) fifth = 8;
    if (minor && eat(/^\(?(maj|Maj|Δ|M)7?\)?/)) { majSev = true; if (!/^[0-9]/.test(s.slice(i))) sev = 11; }
    const n = eat(/^(6\/9|69|13|11|9|7|6|5)/);
    if (n) num(n[1]);
    while (i < s.length) {
      let r;
      if (eat(/^[(),]/)) continue;
      if ((r = eat(/^sus(2|4)?/))) { sus = r[1] === '2' ? 2 : 5; continue; }
      if ((r = eat(/^add(2|4|6|9|11|13)/))) { ext.add(ADD[r[1]]); continue; }
      if (eat(/^(maj7|Maj7|M7|Δ7?|\+7)/)) { sev = 11; continue; }
      if (eat(/^alt/)) { sev = sev || 10; ext.add(1); ext.add(3); ext.add(8); continue; }
      if ((r = eat(/^([b#+-])(5|6|9|11|13)/))) {
        const k = (r[1] === '+' ? '#' : r[1] === '-' ? 'b' : r[1]) + r[2];
        if (!(k in ALT)) return null;
        if (r[2] === '5') fifth = ALT[k]; else ext.add(ALT[k]);
        continue;
      }
      if ((r = eat(/^(13|11|9|7|6|4|2)/))) { if (r[1] === '7') sev = sev || 10; else ext.add(ADD[r[1]]); continue; }
      return null;
    }
    const ivs = new Set([0, fifth]);
    if (!power) ivs.add(sus != null ? sus : third);
    if (sev != null) ivs.add(sev);
    ext.forEach((x) => ivs.add(x));
    const root = pcOf(m[1], m[2]);
    const bass = m[4] ? pcOf(m[4], m[5]) : null;
    return { name: t, root, bass: bass === root ? null : bass, ivs: [...ivs].sort((a, b) => a - b), minor: third === 3 && sus == null };
  }

  /* ================================================================== */
  /* 2. Notes → forme de la fiche                                        */
  /* ================================================================== */
  const semis = (iv) => M.mod(M.parseInterval(iv).semis, 12);
  let SHAPES = null;
  function shapes() {
    if (!SHAPES) {
      SHAPES = [];
      ShapeBank.ALL.forEach((fam) => fam.shapes.forEach((sh) => {
        SHAPES.push(Object.assign({}, sh, { set: [...new Set(sh.formula.split(' ').map(semis))].sort((a, b) => a - b) }));
      }));
    }
    return SHAPES;
  }

  /**
   * Formes de la fiche pour cet accord, la meilleure d'abord.
   * Même notes → forme exacte. Sinon la forme la plus proche qui ne joue aucune note étrangère
   * (on peut perdre la quinte, ou une extension), sinon la forme majeure / mineure.
   */
  function shapesFor(ch) {
    const want = new Set(ch.ivs);
    const key = ch.ivs.join(',');
    if (key === '0,7') return powerChord(ch);
    // notes qu'on peut laisser de côté : la quinte, et les extensions « en dessous » de la plus haute
    const omissible = new Set([7]);
    if (want.has(9) && want.has(10)) { omissible.add(2); omissible.add(5); }
    if (want.has(5) && want.has(10)) omissible.add(2);
    let best = [], bestScore = Infinity;
    shapes().forEach((sh) => {
      if (sh.set.some((x) => !want.has(x))) return;
      let score = sh.set.join(',') === key ? 0 : 0.5;
      want.forEach((x) => { if (sh.set.indexOf(x) < 0) score += omissible.has(x) ? 0.3 : (x === 3 || x === 4) ? 10 : 1; });
      if (score < bestScore - 1e-9) { bestScore = score; best = [sh]; } else if (Math.abs(score - bestScore) < 1e-9 && best[0].name === sh.name) best.push(sh);
    });
    let simplified = bestScore >= 1;
    if (!best.length || bestScore >= 10) {
      const name = ch.minor ? 'Mineur (m)' : 'Majeur';
      best = shapes().filter((sh) => sh.name === name);
      simplified = true;
    }
    return best.map((sh) => place(sh, ch)).sort((a, b) => a.start - b.start).map((p) => Object.assign(p, { simplified }));
  }

  /** Accord de puissance (C5) : fondamentale + quinte, pris dans la forme majeure. */
  function powerChord(ch) {
    return shapes().filter((sh) => sh.name === 'Majeur').map((sh) => {
      let kept = 0;
      const strings = sh.strings.map((x) => (x && kept < 3 && [0, 7].indexOf(semis(x.iv)) >= 0 && !x.optional ? (kept++, x) : null));
      return place(Object.assign({}, sh, { name: '5 (puissance)', strings }), ch);
    }).sort((a, b) => a.start - b.start).map((p) => Object.assign(p, { simplified: false }));
  }

  /** Pose une forme sur la case de la fondamentale. */
  function place(sh, ch) {
    const rs = sh.rootString === 6 ? 0 : 1;
    const os = sh.strings.filter(Boolean).map((x) => x.o);
    let rf = M.mod(ch.root - TUNING[rs], 12);
    // jamais de corde à vide (pas d'accord ouvert, plus jazz) : la forme est toujours barrée / fermée
    if (rf + Math.min(...os) < 1) rf += 12;
    const frets = sh.strings.map((x) => (x ? rf + x.o : null));
    const played = frets.filter((f) => f != null);
    return { shape: sh, rootFret: rf, frets, start: Math.min(...played) };
  }

  /* ================================================================== */
  /* Dessin (même style que la banque de formes)                         */
  /* ================================================================== */
  function diagram(p) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 80 86');
    svg.setAttribute('class', 'sc-svg');
    const mk = (n, a, t) => { const e = document.createElementNS(ns, n); for (const k in a) e.setAttribute(k, a[k]); if (t != null) e.textContent = t; svg.appendChild(e); return e; };
    const sh = p.shape;
    const played = p.frets.filter((f) => f != null && f > 0);
    const first = played.length ? Math.max(1, Math.min(...played)) : 1;
    const base = Math.max(...played.concat([1])) <= 5 ? 1 : first;
    const left = 18, right = 68, top = 16, fh = 13, nf = 5;
    const sx = (s) => left + s * (right - left) / 5;
    const cy = (f) => top + (f - base) * fh + fh / 2;
    for (let s = 0; s < 6; s++) mk('line', { x1: sx(s), y1: top, x2: sx(s), y2: top + nf * fh, class: 'sh-line' });
    for (let f = 0; f <= nf; f++) mk('line', { x1: left, y1: top + f * fh, x2: right, y2: top + f * fh, class: 'sh-line', 'stroke-width': f === 0 && base === 1 ? 3 : 0.7 });
    if (base > 1) mk('text', { x: left - 4, y: top + fh * 0.72, class: 'sc-fret', 'text-anchor': 'end' }, base + 'fr');
    // barré : au moins 3 cordes sur la case la plus basse, dont la plus aiguë jouée
    const minF = played.length ? Math.min(...played) : 0;
    const atMin = p.frets.map((f, s) => (f === minF && f > 0 ? s : -1)).filter((s) => s >= 0);
    const last = p.frets.reduce((a, f, s) => (f != null ? s : a), -1);
    if (atMin.length >= 3 && atMin[atMin.length - 1] === last) {
      const a = sx(atMin[0]), b = sx(last), y = top + (minF - base) * fh - 1;
      mk('path', { d: `M ${a} ${y} Q ${(a + b) / 2} ${y - 9} ${b} ${y}`, class: 'sh-barre' });
    }
    sh.strings.forEach((x, s) => {
      const f = p.frets[s];
      if (!x) { mk('text', { x: sx(s), y: top - 4, class: 'sh-mute', 'text-anchor': 'middle' }, '×'); return; }
      const y = f === 0 ? top - 6 : cy(f);
      if (x.root) mk('circle', { cx: sx(s), cy: y, r: f === 0 ? 3.2 : 4.4, class: 'sh-root' });
      else if (f === 0) mk('circle', { cx: sx(s), cy: y, r: 3, class: 'sh-open' });
      else mk('circle', { cx: sx(s), cy: y, r: 4, class: 'sh-dot' });
      if (x.optional) mk('circle', { cx: sx(s), cy: y, r: 6, class: 'sh-opt' });
    });
    return svg;
  }

  function play(p) {
    const t = Audio2.now() + 0.05;
    let k = 0;
    p.shape.strings.forEach((x, s) => { if (x && !x.optional) Audio2.guitar(TUNING[s] + p.frets[s], t + k++ * 0.03, 2, 0.5); });
  }

  /* ================================================================== */
  /* 3. Trouver les accords sur la photo                                 */
  /* ================================================================== */
  /** Corrige les confusions fréquentes de la lecture (8→B, 0→D, rn→m, H→#…). Retourne { text, sure } ou null. */
  /**
   * Un nom d'accord « qui existe vraiment » : qualité, un chiffre principal, sus/add, altérations
   * (entre parenthèses ou non), basse. Refuse les suites de chiffres absurdes comme « B74556 ».
   */
  const ALTER = '[b#+-]?(?:5|6|9|11|13)';
  const PLAUSIBLE = new RegExp('^' + ROOTS + '[#b]?' +
    '(?:maj|Maj|M|Δ|min|mi|m|-|dim|°|ø|aug|\\+)?' +
    '(?:\\(?(?:maj|Maj|M|Δ)7?\\)?)?' +
    '(?:6/9|69|13|11|9|7|6|5)?' +
    '(?:sus[24]?|add(?:2|4|6|9|11|13))?' +
    '(?:\\((?:' + ALTER + '|maj7|\\+7|sus[24]?|add(?:2|4|9))(?:,(?:' + ALTER + '))*\\)|[b#](?:5|9|11|13)|\\+7|\\+5|alt|sus[24]?)*' +
    '(?:/' + ROOTS + '[#b]?)?$');
  function plausible(t) {
    t = normalize(t);
    return PLAUSIBLE.test(t) && !!parseChord(t);
  }

  function readChord(raw) {
    const t = normalize(raw).replace(/^[.,:;'"`|!]+|[.,:;'"`|!]+$/g, '');
    if (!t || t.length > 16) return null;
    if (plausible(t)) return { text: t, sure: true };
    const first = { 8: 'B', 6: 'G', 0: 'D', O: 'D', Q: 'G', c: 'C', a: 'A', d: 'D', e: 'E', f: 'F', g: 'G', b: 'B', '(': 'C', '[': 'C', '€': 'E' };
    const fixes = [
      (x) => x.replace(/^([A-G])\1/i, '$1'),
      (x) => x.replace(/[oOcC)\]}]+$/, ''),
      (x) => x.replace(/^([A-G])(H|ff|t)/, '$1#').replace(/H/g, '#'),
      (x) => x.replace(/^([A-G])[iIl1]m/, '$1#m'),
      (x) => x.replace(/[iIl1\\]([A-G][#b]?)$/, '/$1'),
      (x) => x.replace(/rn/g, 'm'),
      (x) => x.replace(/sus[dA]$/, 'sus4'),
      (x) => x.replace(/\(([^)]*)$/, '($1)'),
      (x) => x.replace(/I/g, '1').replace(/l/g, '1')
    ];
    const vs = [];
    for (const base of [t, (first[t[0]] || t[0]) + t.slice(1)]) {
      vs.push(base);
      fixes.forEach((f) => { vs.push(f(base)); fixes.forEach((g) => vs.push(g(f(base)))); });
    }
    for (const v of vs) if (plausible(v)) return { text: v, sure: false };
    // lisible mais bizarre (ex. « B74556 ») : on le garde pour le comparer aux autres accords du morceau
    for (const v of vs) if (parseChord(v)) return { text: v, sure: false, weird: true };
    return null;
  }

  function lev(a, b) {
    const d = [];
    for (let i = 0; i <= a.length; i++) d[i] = [i];
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    return d[a.length][b.length];
  }
  const rootOf = (t) => { const m = NAME_RE.exec(normalize(t)); return m ? (FR[m[1]] || m[1]) + (m[2] || '') : ''; };

  /**
   * Accords bizarres : on cherche parmi les autres accords du morceau (surtout ceux qui reviennent)
   * celui qui lui ressemble le plus, et on le recopie. Sinon on garde le début lisible (« B74556 » → « B7 »).
   */
  function fixWeird(list) {
    const count = {};
    list.forEach((it) => { if (plausible(it.text)) count[it.text] = (count[it.text] || 0) + 1; });
    const pool = Object.keys(count);
    return list.map((it) => {
      if (plausible(it.text)) return it;
      const w = normalize(it.text), root = rootOf(w);
      let best = null;
      pool.forEach((c) => {
        let pre = 0; while (pre < c.length && pre < w.length && c[pre] === w[pre]) pre++;
        const same = rootOf(c) === root;
        const score = pre * 2 - lev(w, c) + Math.log2(count[c]) + (same ? 3 : -3);
        if (!best || score > best.score) best = { c, score, same, pre, d: lev(w, c) };
      });
      if (best && (best.same || best.d <= Math.ceil(w.length * 0.5))) return { text: best.c, sure: false, was: it.text };
      // rien de ressemblant : le plus long début qui est un vrai accord
      for (let n = w.length - 1; n >= 1; n--) if (plausible(w.slice(0, n))) return { text: w.slice(0, n), sure: false, was: it.text };
      return Object.assign({}, it, { sure: false });
    });
  }

  function loadImage(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); res(img); };
      img.onerror = () => rej(new Error('Image illisible (essaie en JPG ou PNG).'));
      img.src = url;
    });
  }
  function toCanvas(img, maxW, minW) {
    let k = Math.min(1, maxW / img.naturalWidth);
    if (minW && img.naturalWidth * k < minW) k = minW / img.naturalWidth;
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c;
  }
  /**
   * Angle de la photo (en degrés) : on cherche la rotation pour laquelle les lignes de texte et de portée
   * sont le plus nettement horizontales (profil des lignes le plus « contrasté »).
   */
  function skewAngle(c) {
    const k = Math.min(1, 700 / c.width);
    const W = Math.round(c.width * k), H = Math.round(c.height * k);
    const t = document.createElement('canvas'); t.width = W; t.height = H;
    t.getContext('2d').drawImage(c, 0, 0, W, H);
    const d = t.getContext('2d').getImageData(0, 0, W, H).data;
    const pts = [];
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
      const i = (y * W + x) * 4;
      if (Math.max(d[i], d[i + 1], d[i + 2]) < 110) pts.push(x - W / 2, y - H / 2);
    }
    if (pts.length < 200) return 0;
    let best = 0, bestV = -1;
    for (let a = -6; a <= 6.001; a += 0.2) {
      const r = a * Math.PI / 180, sn = Math.sin(r), cs = Math.cos(r);
      const bins = new Float64Array(H * 2 + 2);
      for (let i = 0; i < pts.length; i += 2) bins[Math.round(pts[i + 1] * cs - pts[i] * sn + H)]++;
      let v = 0; for (let i = 0; i < bins.length; i++) v += bins[i] * bins[i];
      if (v > bestV) { bestV = v; best = a; }
    }
    return Math.abs(best) < 0.3 ? 0 : best;
  }
  function rotate(c, deg) {
    if (!deg) return c;
    const o = document.createElement('canvas'); o.width = c.width; o.height = c.height;
    const ctx = o.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, o.width, o.height);
    ctx.translate(o.width / 2, o.height / 2); ctx.rotate(-deg * Math.PI / 180); ctx.translate(-o.width / 2, -o.height / 2);
    ctx.drawImage(c, 0, 0);
    return o;
  }

  /** Niveaux de gris avec le canal le plus clair : le fluo, quelle que soit sa couleur, devient blanc ; l'encre reste noire. */
  function gray(c) {
    const o = document.createElement('canvas');
    o.width = c.width; o.height = c.height;
    const ctx = o.getContext('2d');
    ctx.drawImage(c, 0, 0);
    const im = ctx.getImageData(0, 0, o.width, o.height), d = im.data;
    for (let i = 0; i < d.length; i += 4) { const v = Math.max(d[i], d[i + 1], d[i + 2]); d[i] = d[i + 1] = d[i + 2] = v; }
    ctx.putImageData(im, 0, 0);
    return o;
  }

  /** Zones surlignées au fluo (s'il y en a) : rectangles en coordonnées de c. */
  function highlights(c) {
    const W = c.width, H = c.height, d = c.getContext('2d').getImageData(0, 0, W, H).data;
    const sat = (i) => { const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]); return { s: mx ? (mx - mn) / mx : 0, v: mx / 255 }; };
    // couleur du papier (médiane) pour ne pas prendre un papier jaunâtre pour du fluo
    const ss = [];
    for (let i = 0; i < d.length; i += 4 * 41) { const x = sat(i); if (x.v > 0.55) ss.push(x.s); }
    ss.sort((a, b) => a - b);
    const smin = Math.max(0.16, Math.min(0.4, (ss[ss.length >> 1] || 0) + 0.13));
    const hl = (i) => { const x = sat(i); return x.s > smin && x.v > 0.5; };
    const cell = 3, gw = Math.ceil(W / cell), gh = Math.ceil(H / cell), grid = new Uint8Array(gw * gh);
    for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
      let n = 0, tot = 0;
      for (let y = gy * cell; y < Math.min(H, gy * cell + cell); y++) for (let x = gx * cell; x < Math.min(W, gx * cell + cell); x++) { tot++; if (hl((y * W + x) * 4)) n++; }
      if (n / tot > 0.3) grid[gy * gw + gx] = 1;
    }
    const seen = new Uint8Array(gw * gh), boxes = [];
    for (let i = 0; i < grid.length; i++) {
      if (!grid[i] || seen[i]) continue;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, count = 0;
      const st = [i]; seen[i] = 1;
      while (st.length) {
        const k = st.pop(), x = k % gw, y = (k - x) / gw;
        count++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const nk = ny * gw + nx;
          if (grid[nk] && !seen[nk]) { seen[nk] = 1; st.push(nk); }
        }
      }
      const b = { x: x0 * cell, y: y0 * cell, w: (x1 - x0 + 1) * cell, h: (y1 - y0 + 1) * cell };
      if (count < 12 || b.w < 12 || b.h < 8 || b.h > H * 0.4 || b.w > W * 0.95) continue;
      // un vrai surlignage est une zone pleine (pas les reflets colorés au bord des lettres)
      let px = 0;
      for (let y = b.y; y < Math.min(H, b.y + b.h); y++) for (let x = b.x; x < Math.min(W, b.x + b.w); x++) if (hl((y * W + x) * 4)) px++;
      if (px / (b.w * b.h) >= 0.45) boxes.push(b);
    }
    return readingOrder(boxes);
  }
  function readingOrder(items) {
    if (!items.length) return items;
    const hs = items.map((b) => b.h).sort((a, b) => a - b);
    const tol = hs[hs.length >> 1] * 0.6;
    const rows = [];
    items.slice().sort((a, b) => (a.y + a.h / 2) - (b.y + b.h / 2)).forEach((b) => {
      const cy = b.y + b.h / 2;
      const r = rows.find((x) => Math.abs(x.cy - cy) < tol);
      if (r) { r.items.push(b); r.cy = (r.cy * (r.items.length - 1) + cy) / r.items.length; } else rows.push({ cy, items: [b] });
    });
    rows.sort((a, b) => a.cy - b.cy);
    return rows.map((r) => r.items.sort((a, b) => a.x - b.x));
  }

  /** Découpe une zone, la binarise (seuil d'Otsu) et l'agrandit. */
  function crop(c, b, target) {
    const px = Math.max(3, Math.round(b.h * 0.15)), py = Math.max(3, Math.round(b.h * 0.1));
    const x = Math.max(0, b.x - px), y = Math.max(0, b.y - py);
    const w = Math.min(c.width - x, b.w + 2 * px), hh = Math.min(c.height - y, b.h + 2 * py);
    const im = c.getContext('2d').getImageData(x, y, w, hh), d = im.data;
    const hist = new Array(256).fill(0), lum = new Uint8Array(w * hh);
    for (let i = 0; i < w * hh; i++) { lum[i] = Math.max(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]); hist[lum[i]]++; }
    let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
    let sB = 0, wB = 0, best = 0, thr = 128;
    for (let t = 0; t < 256; t++) {
      wB += hist[t]; if (!wB) continue;
      const wF = w * hh - wB; if (!wF) break;
      sB += t * hist[t];
      const between = wB * wF * Math.pow(sB / wB - (sum - sB) / wF, 2);
      if (between > best) { best = between; thr = t; }
    }
    for (let i = 0; i < w * hh; i++) { const v = lum[i] < thr ? 0 : 255; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
    const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = hh; tmp.getContext('2d').putImageData(im, 0, 0);
    const k = Math.max(1.5, Math.min(6, target / hh));
    const out = document.createElement('canvas'); out.width = Math.round(w * k) + 40; out.height = Math.round(hh * k) + 40;
    const o = out.getContext('2d'); o.fillStyle = '#fff'; o.fillRect(0, 0, out.width, out.height);
    o.drawImage(tmp, 20, 20, w * k, hh * k);
    return out;
  }

  let workerP = null;
  function worker(onStep) {
    if (!workerP) {
      workerP = (async () => {
        if (!window.Tesseract) {
          await new Promise((res, rej) => {
            const s = document.createElement('script');
            s.src = TESS_URL; s.onload = res;
            s.onerror = () => rej(new Error('Impossible de charger la lecture automatique : vérifie ta connexion internet.'));
            document.head.appendChild(s);
          });
        }
        return Tesseract.createWorker('eng', 1, { logger: (m) => { if (m.progress != null && /load|initial/i.test(m.status || '')) onStep('Préparation de la lecture… ' + Math.round(m.progress * 100) + ' %'); } });
      })();
      workerP.catch(() => { workerP = null; });
    }
    return workerP;
  }
  const WL = 'ABCDEFGabdegijlmnorsuMRSLéÉ0123456789#♯♭/()+-,°øΔ ';

  /** Accords surlignés : on lit chaque zone, en plusieurs essais si besoin, et on garde la lecture la plus sûre. */
  async function readHighlights(c, boxes, onStep) {
    const w = await worker(onStep);
    const out = [];
    for (let i = 0; i < boxes.length; i++) {
      onStep(`Lecture des accords surlignés : ${i + 1} / ${boxes.length}`);
      let best = null;
      for (const [target, psm, wl] of [[120, '7', WL], [70, '7', WL], [120, '6', WL], [120, '8', WL], [120, '7', '']]) {
        await w.setParameters({ tessedit_pageseg_mode: psm, tessedit_char_whitelist: wl });
        const { data } = await w.recognize(crop(c, boxes[i], target));
        const txt = (data.text || '').replace(/\s*([,(])\s*/g, '$1').replace(/\s+\)/g, ')');
        const found = txt.split(/\s+/).filter(Boolean).map(readChord).filter(Boolean);
        const score = found.length ? found.filter((f) => f.sure).length / found.length + data.confidence / 100 : -1;
        if (!best || score > best.score) best = { score, found, conf: data.confidence };
        if (found.length && found.every((f) => f.sure) && data.confidence >= 70) break;
      }
      best.found.forEach((f) => out.push({ text: f.text, sure: f.sure && best.conf >= 60 }));
    }
    return out;
  }

  /** Pas de surlignage : on lit toute la page et on garde les lignes faites d'accords (pas les paroles). */
  async function readPage(c, onStep) {
    const w = await worker(onStep);
    onStep('Recherche des accords sur toute la page…');
    await w.setParameters({ tessedit_pageseg_mode: '11', tessedit_char_whitelist: '' });
    const { data } = await w.recognize(gray(c));
    const words = (data.words || []).filter((x) => x.text.trim()).map((x) => ({ x: x.bbox.x0, y: x.bbox.y0, w: x.bbox.x1 - x.bbox.x0, h: x.bbox.y1 - x.bbox.y0, text: x.text, conf: x.confidence }));
    const out = [];
    if (window.__scDebug) readingOrder(words).forEach((row) => console.log('ROW', row.map((x) => x.text + '@' + Math.round(x.y) + ':' + Math.round(x.conf)).join(' ')));
    const rows = readingOrder(words).filter((row) => {
      // une ligne d'accords : au moins un accord sûr, et presque pas de vrais mots (paroles, titre…)
      const sure = row.filter((x) => { const c = readChord(x.text); return c && c.sure && x.conf >= 50; }).length;
      const prose = row.filter((x) => /^[a-zà-ÿ'’]{3,}$/i.test(x.text) && !parseChord(x.text)).length;
      return sure >= 1 && prose <= row.length * 0.25;
    });
    // chaque ligne d'accords est relue seule (les accords d'une seule lettre se perdent dans la page entière)
    const done = [];
    for (let r = 0; r < rows.length; r++) {
      onStep(`Lecture des lignes d'accords : ${r + 1} / ${rows.length}`);
      const row = rows[r];
      const hs = row.map((x) => x.h).sort((a, b) => a - b), hm = hs[hs.length >> 1];
      const y0 = Math.min(...row.map((x) => x.y)), y1 = Math.max(...row.map((x) => x.y + x.h));
      const band = { x: 0, y: Math.max(0, Math.round(y0 - hm * 0.2)), w: c.width, h: Math.round(y1 - y0 + hm * 0.4) };
      if (done.some((b) => band.y < b.y + b.h * 0.6 && band.y + band.h * 0.6 > b.y)) continue;
      done.push(band);
      const fromPage = row.filter((x) => x.conf >= 50).map((x) => readChord(x.text)).filter(Boolean);
      let best = { found: fromPage, score: fromPage.filter((f) => f.sure).length };
      for (const psm of ['7', '6']) {
        await w.setParameters({ tessedit_pageseg_mode: psm, tessedit_char_whitelist: WL });
        const { data } = await w.recognize(crop(c, band, 110));
        const txt = (data.text || '').replace(/\s*([,(])\s*/g, '$1').replace(/\s+\)/g, ')');
        const toks = txt.split(/\s+/).filter(Boolean);
        const found = toks.map(readChord).filter(Boolean);
        // on refuse une relecture pleine de déchets (bouts de portée lus comme du texte)
        if (found.length < toks.length * 0.7) continue;
        const score = found.filter((f) => f.sure).length + (data.confidence >= 60 ? 0.5 : 0);
        if (score > best.score) best = { found, score };
      }
      best.found.forEach((f) => out.push({ text: f.text, sure: f.sure }));
    }
    return out;
  }

  /* ================================================================== */
  /* Forme A A B A                                                       */
  /* ================================================================== */
  const simil = (x, y) => (x.length || y.length ? 1 - lev(x, y) / Math.max(x.length, y.length) : 1);
  /** Ressemblance de deux A : ils commencent pareil (la fin peut changer). */
  function similA(x, y) {
    let p = 0; while (p < x.length && p < y.length && x[p] === y[p]) p++;
    return 0.5 * simil(x, y) + 0.5 * p / Math.min(x.length, y.length);
  }

  /**
   * Cherche la forme jazz A A B A dans la suite d'accords.
   * Les A se ressemblent (ils peuvent finir un peu différemment), le B est différent.
   * Retourne { marks: [début 2e A, début B, début dernier A], score, ok } ou null.
   */
  function detectAABA(seq) {
    const k = seq.map((c) => normalize(c).toLowerCase());
    const N = k.length;
    if (N < 4) return null;
    let best = null;
    for (let a2 = 1; a2 <= N - 3; a2++) {
      const A1 = k.slice(0, a2), L = a2;
      const lo = Math.max(1, Math.floor(L * 0.6)), hi = Math.ceil(L * 1.4);
      for (let b = a2 + lo; b <= Math.min(N - 2, a2 + hi); b++) {
        const A2 = k.slice(a2, b);
        const s12 = similA(A1, A2);
        if (s12 < 0.3) continue;
        for (let a3 = b + 1; a3 <= N - 1; a3++) {
          const len3 = N - a3;
          if (len3 < lo || len3 > hi) continue;
          const B = k.slice(b, a3), A3 = k.slice(a3);
          const s13 = similA(A1, A3), s1b = simil(A1, B);
          // les trois A ont en général la même longueur ; le B est différent des A
          const score = (s12 + s13) / 2 - 0.35 * s1b - 0.15 * Math.abs(B.length - L) / L - 0.25 * (Math.abs(A2.length - L) + Math.abs(A3.length - L) + Math.abs(A2.length - A3.length)) / L;
          if (!best || score > best.score) best = { marks: [a2, b, a3], score, sA: (s12 + s13) / 2, sB: s1b };
        }
      }
    }
    if (!best) return null;
    best.ok = best.sA >= 0.6 && best.sB < 0.8;
    return best;
  }
  /** Les 4 parties à partir des 3 débuts. */
  function sections(seq, m) {
    return [['A', 0, m[0]], ['A', m[0], m[1]], ['B', m[1], m[2]], ['A', m[2], seq.length]]
      .map(([label, s, e], i) => ({ label, n: i, start: s, end: e, chords: seq.slice(s, e) }));
  }

  /* ================================================================== */
  /* PDF                                                                 */
  /* ================================================================== */
  function loadJsPdf() {
    if (window.jspdf) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'vendor/jspdf.umd.min.js'; s.onload = res; s.onerror = () => rej(new Error('jsPDF introuvable'));
      document.head.appendChild(s);
    });
  }
  const pdfText = (t) => String(t).replace(/♭/g, 'b').replace(/♯/g, '#').replace(/[×]/g, 'x');

  /** Diagramme dans le PDF, même dessin que sur la page. (x, y) = coin haut gauche, largeur ≈ 30 mm. */
  function pdfDiagram(doc, name, p, x, y) {
    const sw = 5, fh = 5.2, nf = 5, left = x + 4, top = y + 11;
    const sx = (s) => left + s * sw;
    const sh = p.shape;
    const played = p.frets.filter((f) => f != null && f > 0);
    const base = Math.max(...played.concat([1])) <= 5 ? 1 : Math.max(1, Math.min(...played));
    const cy = (f) => top + (f - base) * fh + fh / 2;
    doc.setTextColor(0); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text(pdfText(name), left + 2.5 * sw, y + 4, { align: 'center' });
    doc.setDrawColor(0); doc.setLineWidth(0.25);
    for (let s = 0; s < 6; s++) doc.line(sx(s), top, sx(s), top + nf * fh);
    for (let f = 0; f <= nf; f++) { doc.setLineWidth(f === 0 && base === 1 ? 1 : 0.25); doc.line(sx(0), top + f * fh, sx(5), top + f * fh); }
    if (base > 1) { doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text(base + 'fr', sx(0) - 1, top + fh * 0.7, { align: 'right' }); }
    // barré
    const minF = played.length ? Math.min(...played) : 0;
    const atMin = p.frets.map((f, s) => (f === minF && f > 0 ? s : -1)).filter((s) => s >= 0);
    const last = p.frets.reduce((a, f, s) => (f != null ? s : a), -1);
    if (atMin.length >= 3 && atMin[atMin.length - 1] === last) {
      doc.setLineWidth(0.5);
      const a = sx(atMin[0]), b = sx(last), yy = top + (minF - base) * fh - 0.4;
      doc.lines([[(b - a) * 0.25, -2.6, (b - a) * 0.75, -2.6, b - a, 0]], a, yy, [1, 1], 'S');
    }
    sh.strings.forEach((st, s) => {
      const f = p.frets[s];
      if (!st) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text('x', sx(s), top - 1.2, { align: 'center' }); return; }
      const yy = cy(f);
      if (st.root) { doc.setDrawColor(217, 72, 15); doc.setFillColor(255, 255, 255); doc.setLineWidth(0.7); doc.circle(sx(s), yy, 1.7, 'FD'); doc.setDrawColor(0); }
      else { doc.setFillColor(0); doc.circle(sx(s), yy, 1.5, 'F'); }
      if (st.optional) { doc.setLineWidth(0.2); doc.setLineDashPattern([0.6, 0.5], 0); doc.circle(sx(s), yy, 2.4, 'S'); doc.setLineDashPattern([], 0); }
    });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(110);
    doc.text(pdfText('forme ' + sh.name + (p.simplified ? ' (simpl.)' : '')), left + 2.5 * sw, top + nf * fh + 4, { align: 'center' });
    doc.setTextColor(0);
  }

  async function makePdf(title, seq, list, form) {
    await loadJsPdf();
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, M = 15;
    let y = 18;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
    doc.text(pdfText(title || 'Grille d’accords'), W / 2, y, { align: 'center' }); y += 10;
    // forme A A B A : résumé des parties
    if (form) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
      doc.text('Forme : A A B A', M, y); y += 6;
      [['A', form[0]], ['B', form[2]]].forEach(([l, sec]) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Partie ' + l + ' :', M, y);
        doc.setFont('helvetica', 'normal');
        doc.splitTextToSize(sec.chords.map(pdfText).join('  |  '), W - 2 * M - 22).forEach((ln) => { doc.text(ln, M + 22, y); y += 5.5; });
        y += 1;
      });
      y += 3;
    }
    // grille : 4 accords par ligne, comme des mesures (partie par partie si la forme est connue)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Grille', M, y); y += 3;
    const blocks = form ? form.map((sec) => ({ label: sec.label, chords: sec.chords })) : [{ label: '', chords: seq }];
    const lab = form ? 9 : 0, per = 4, cw = (W - 2 * M - lab) / per, rh = 9;
    blocks.forEach((bl) => {
      for (let i = 0; i < bl.chords.length; i += per) {
        if (y + rh > 280) { doc.addPage(); y = 18; }
        if (i === 0 && bl.label) { doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text(bl.label, M + 1, y + 6.5); }
        doc.setLineWidth(0.3);
        for (let k = 0; k <= per; k++) doc.line(M + lab + k * cw, y, M + lab + k * cw, y + rh);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
        bl.chords.slice(i, i + per).forEach((c, k) => doc.text(pdfText(c), M + lab + k * cw + 3, y + 6.3));
        y += rh + 1.5;
      }
      if (form) y += 2.5;
    });
    // les accords sur le manche
    y += 6;
    if (y > 240) { doc.addPage(); y = 18; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Les accords sur la guitare', M, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(110);
    doc.text('Rond orange = fondamentale, x = corde étouffée, pointillés = note facultative, « 5fr » = commence à la 5e case.', M, y + 4.5);
    doc.setTextColor(0);
    y += 8;
    const dw = 36, dh = 50, cols = Math.floor((W - 2 * M) / dw);
    list.forEach((it, i) => {
      if (!it.p) return;
      const col = i % cols;
      if (i > 0 && col === 0) y += dh;
      if (y + dh > 290) { doc.addPage(); y = 18; }
      pdfDiagram(doc, it.name, it.p, M + col * dw, y);
    });
    const file = (title || 'grille-accords').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'grille-accords';
    doc.save(file + '.pdf');
  }

  /* ================================================================== */
  /* Page                                                                */
  /* ================================================================== */
  /* ================================================================== */
  /* Piège : Bbm/Eb, Ab, Fm7, Bbm7                                       */
  /* ================================================================== */
  /** Fausse miniature : un tuto guitare jazz bien banal, avec un ▶ au centre (là où est celui de YouTube). */
  const FAKE_THUMB = `<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id="rrg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b2a3a"/><stop offset="1" stop-color="#3d2a1a"/></linearGradient></defs>
    <rect width="320" height="180" fill="url(#rrg)"/>
    <g transform="translate(205 18) rotate(8)">
      <rect width="90" height="150" rx="4" fill="#6b4423"/>
      ${[1, 2, 3, 4, 5].map((k) => `<line x1="0" x2="90" y1="${k * 26}" y2="${k * 26}" stroke="#d9c7a7" stroke-width="2"/>`).join('')}
      ${[0, 1, 2, 3, 4, 5].map((k) => `<line y1="0" y2="150" x1="${8 + k * 14.8}" x2="${8 + k * 14.8}" stroke="#eee" stroke-width="${1.6 - k * 0.15}"/>`).join('')}
      <circle cx="22.8" cy="13" r="7" fill="#e8590c"/><circle cx="52.4" cy="39" r="7" fill="#fff"/><circle cx="67.2" cy="39" r="7" fill="#fff"/><circle cx="37.6" cy="65" r="7" fill="#fff"/>
    </g>
    <text x="16" y="40" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="25" fill="#ffd43b">4 ACCORDS</text>
    <text x="16" y="68" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="25" fill="#fff">JAZZ 🔥</text>
    <rect x="14" y="118" width="172" height="22" rx="4" fill="#e8590c"/>
    <text x="22" y="134" font-family="Arial, sans-serif" font-weight="700" font-size="13" fill="#fff">Bbm/Eb · Ab · Fm7 · Bbm7</text>
    <text x="16" y="160" font-family="Arial, sans-serif" font-size="11" fill="#ced4da">Tuto guitare · débutant / intermédiaire</text>
    <rect x="270" y="152" width="40" height="18" rx="3" fill="rgba(0,0,0,.8)"/><text x="290" y="165" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#fff">8:14</text>
    <g transform="translate(160 90)"><rect x="-30" y="-21" width="60" height="42" rx="12" fill="#e03131"/><path d="M-9 -12 L14 0 L-9 12 Z" fill="#fff"/></g>
  </svg>`;

  let ytApi = null;
  function loadYT() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (!ytApi) {
      ytApi = new Promise((res, rej) => {
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => { if (prev) prev(); res(); };
        const sc = document.createElement('script');
        sc.src = 'https://www.youtube.com/iframe_api';
        sc.onerror = () => { ytApi = null; rej(new Error('YouTube indisponible')); };
        document.head.appendChild(sc);
      });
    }
    return ytApi;
  }

  /**
   * Le piège : d'abord un écran « normal » qui demande de lancer la vidéo pour voir les accords.
   * Le texte moqueur et l'animation n'arrivent QUE quand la chanson a vraiment commencé
   * (pas pendant une pub : on attend que la vidéo elle-même avance).
   */
  function rickroll() {
    const old = document.querySelector('.rr-overlay');
    if (old) old.remove();
    const VIDEO = 'dQw4w9WgXcQ'; // Rick Astley – Never Gonna Give You Up (clip officiel, ~3 min 32)
    let player = null, timer = null, started = false;

    const emojis = ['🫵', '😂', '🤣', '💀', '🫵', '😭', '🤡', '😂', '🫵', '🤣', '🕺', '😂'];
    const rain = h('div', { class: 'rr-rain' });
    const holder = h('div', { class: 'rr-video' }, [h('div', { id: 'rr-player' })]);
    // fausse miniature « tuto guitare » posée sur la vidéo : elle cache la vraie miniature, le titre,
    // les pubs… Elle laisse passer les touchers : appuyer sur son ▶ appuie sur celui de YouTube, juste dessous.
    const cover = h('div', { class: 'rr-cover', html: FAKE_THUMB });
    holder.appendChild(cover);
    const bait = h('div', { class: 'rr-bait' }, [
      h('div', { class: 'rr-bait-title', text: '🎵 Tes accords sont prêts !' }),
      h('p', { text: 'Lance la vidéo pour voir comment jouer ces accords sur la guitare 👇' })
    ]);
    const troll = h('div', { class: 'rr-troll' }, [
      h('div', { class: 'rr-point', text: '🫵😂' }),
      h('div', { class: 'rr-title', text: 'RICKROLLED YOU DUMASS' }),
      h('div', { class: 'rr-sub', text: '🫵😂🤣💀  Bbm/Eb – Ab – Fm7 – Bbm7… tu croyais vraiment que c’était du jazz ?  🤡😂🫵' })
    ]);
    const hint = h('p', { class: 'rr-hint', text: 'Appuie sur ▶ pour lancer le tuto.' });
    const close = h('button', { class: 'rr-close', text: '✕ Fermer' });
    const ov = h('div', { class: 'rr-overlay', role: 'dialog', 'aria-label': 'Tuto guitare' }, [rain, h('div', { class: 'rr-box' }, [bait, troll, holder, hint, close])]);

    function boom() {
      if (started) return;
      started = true;
      clearInterval(timer);
      ov.classList.add('rr-on');
      cover.remove();
      close.textContent = '✕ OK, je me suis fait avoir 😭';
      for (let i = 0; i < 28; i++) {
        const e = h('span', { text: emojis[i % emojis.length] });
        e.style.left = (Math.random() * 100) + '%';
        e.style.animationDelay = (Math.random() * 3) + 's';
        e.style.animationDuration = (2.5 + Math.random() * 2.5) + 's';
        e.style.fontSize = (1.6 + Math.random() * 2.4) + 'rem';
        rain.appendChild(e);
      }
    }
    function cleanup() {
      clearInterval(timer);
      try { if (player && player.destroy) player.destroy(); } catch (e) { /* rien */ }
      ov.remove();
    }
    close.addEventListener('click', cleanup);
    window.addEventListener('hashchange', cleanup, { once: true });
    document.body.appendChild(ov);

    // la chanson a-t-elle vraiment commencé ? (une pub ne fait pas avancer la vidéo elle-même)
    // on ne dévoile rien tant que la chanson elle-même n'a pas joué ~1,5 s d'affilée :
    // pendant une pub (bouton « Passer », aperçu de la vidéo suivante…), le cache reste en place
    let lastT = -1, lastAt = 0, good = 0;
    function watch() {
      clearInterval(timer);
      timer = setInterval(() => {
        if (!document.body.contains(ov)) { clearInterval(timer); return; }
        if (!player || !player.getPlayerState) return;
        let st, t, d, id;
        try { st = player.getPlayerState(); t = player.getCurrentTime(); d = player.getDuration(); id = (player.getVideoData() || {}).video_id; } catch (e) { return; }
        const now = Date.now();
        const isSong = st === 1 && (!id || id === VIDEO) && d > 200 && d < 230;
        // la vidéo avance au même rythme que l'horloge (une pub ne fait pas avancer la chanson)
        const step = lastT >= 0 ? t - lastT : 0, wall = (now - lastAt) / 1000;
        if (isSong && lastT >= 0 && step > wall * 0.5 && step < wall * 2 + 0.3) good++; else good = 0;
        lastT = isSong ? t : -1; lastAt = now;
        if (good >= 6 && t >= 1.5) boom();
      }, 250);
    }

    loadYT().then(() => {
      player = new YT.Player('rr-player', {
        videoId: VIDEO, width: '100%', height: '100%',
        playerVars: { rel: 0, playsinline: 1, modestbranding: 1, controls: 1, iv_load_policy: 3, disablekb: 1, fs: 0 },
        events: { onStateChange: watch }
      });
      watch();
    }).catch(() => {
      // pas d'API YouTube : simple lecteur intégré ; l'animation part peu après le clic
      holder.querySelector('#rr-player').replaceWith(h('iframe', {
        src: 'https://www.youtube.com/embed/' + VIDEO + '?playsinline=1&rel=0',
        allow: 'autoplay; encrypted-media', allowfullscreen: '', title: 'Vidéo'
      }));
    });

    // sans API YouTube, on ne peut pas suivre la lecture : on repère le toucher dans la vidéo
    window.addEventListener('blur', function onBlur() {
      if (!document.body.contains(ov)) { window.removeEventListener('blur', onBlur); return; }
      if (document.activeElement && document.activeElement.tagName === 'IFRAME' && !player) { window.removeEventListener('blur', onBlur); setTimeout(boom, 4000); }
    });
  }

  function render(el) {
    let items = App.store('scoreChords', []);
    const fileIn = h('input', { type: 'file', accept: 'image/*', style: 'display:none' });
    const pick = h('button', { class: 'btn primary', text: '📷 Choisir / prendre la photo de la partition' });
    pick.addEventListener('click', () => fileIn.click());
    const status = h('div');
    const result = h('div');
    el.appendChild(h('div', { class: 'panel' }, [
      h('p', { class: 'hint', html: 'Prends la partition en photo, bien à plat et bien éclairée. Si tu surlignes des accords au fluo, je ne lis que ceux-là ; sinon je cherche les accords sur toute la page. <b>La 1re fois, l’outil de lecture se télécharge (~10 Mo).</b>' }),
      h('div', { class: 'btn-row' }, [pick, fileIn]),
      status
    ]));
    el.appendChild(result);

    fileIn.addEventListener('change', async () => {
      const f = fileIn.files[0];
      fileIn.value = '';
      if (!f) return;
      status.innerHTML = '';
      const msg = h('div', { class: 'feedback info', text: 'Ouverture de la photo…' });
      status.appendChild(msg);
      const step = (t) => { msg.textContent = t; };
      try {
        const img = await loadImage(f);
        step('Redressement de la photo…');
        const angle = skewAngle(toCanvas(img, 1200));
        const small = rotate(toCanvas(img, 1200), angle);
        const big = rotate(toCanvas(img, 3000, 1600), angle);
        const k = big.width / small.width;
        const boxes = highlights(small).flat().map((b) => ({ x: Math.round(b.x * k), y: Math.round(b.y * k), w: Math.round(b.w * k), h: Math.round(b.h * k) }));
        let found = boxes.length ? await readHighlights(big, boxes, step) : [];
        if (!found.length) found = await readPage(big, step);
        items = fixWeird(found);
        App.save('scoreAB', { mode: 'auto', marks: null });
        App.save('scoreChords', items);
        status.innerHTML = '';
        if (!items.length) status.appendChild(h('div', { class: 'notice warn', text: 'Je n’ai trouvé aucun accord sur cette photo. Essaie une photo plus nette et plus droite, ou écris les accords ci-dessous.' }));
        draw();
      } catch (e) {
        status.innerHTML = '';
        status.appendChild(h('div', { class: 'notice warn', text: 'Erreur : ' + e.message }));
      }
    });

    /* ---------- parties A et B ---------- */
    const abState = () => Object.assign({ mode: 'auto', marks: null }, App.store('scoreAB', {}));
    const validMarks = (m, N) => m && m.length === 3 && m[0] >= 1 && m[0] < m[1] && m[1] < m[2] && m[2] < N;
    /** Les 4 parties retenues (choix manuel, sinon détection), ou null. */
    function currentForm() {
      const st = abState(), seq = items.map((x) => x.text);
      if (st.mode === 'no') return null;
      if (validMarks(st.marks, seq.length)) return sections(seq, st.marks);
      const d = detectAABA(seq);
      return d && (d.ok || st.mode === 'yes') ? sections(seq, d.marks) : null;
    }
    function formPanel() {
      const st = abState(), seq = items.map((x) => x.text), N = seq.length;
      const pan = h('div', { class: 'panel' });
      pan.appendChild(h('h2', { style: 'margin-top:0', text: '🧩 Parties A et B (forme A A B A)' }));
      if (N < 4) { pan.appendChild(h('p', { class: 'muted', text: 'Il faut au moins 4 accords.' })); return pan; }
      const setState = (o) => { App.save('scoreAB', Object.assign(abState(), o)); draw(); };
      // y a-t-il des parties A et B ?
      const seg = h('div', { class: 'segmented', style: 'margin-bottom:.6rem' });
      [['auto', '🤖 Trouve tout seul'], ['yes', '✅ Il y a A et B'], ['no', '❌ Pas de A / B']].forEach(([id, l]) => {
        const b = h('button', { class: st.mode === id ? 'on' : '', text: l });
        b.addEventListener('click', () => setState({ mode: id }));
        seg.appendChild(b);
      });
      pan.appendChild(seg);
      if (st.mode === 'no') { pan.appendChild(h('p', { class: 'hint', text: 'D’accord : pas de parties A / B pour ce morceau.' })); return pan; }
      const manual = validMarks(st.marks, N);
      const det = manual ? null : detectAABA(seq);
      const marks = manual ? st.marks : det && (det.ok || st.mode === 'yes') ? det.marks : null;
      if (!marks) {
        pan.appendChild(h('div', { class: 'notice warn', text: 'Je ne trouve pas de forme A A B A claire. Aide-moi : indique ci-dessous où commence chaque partie, ou dis-moi qu’il n’y a pas de A / B.' }));
      } else {
        const secs = sections(seq, marks);
        pan.appendChild(h('p', { class: 'hint', text: manual ? 'Parties placées par toi.' : 'Parties trouvées automatiquement : vérifie, et ajuste ci-dessous si besoin.' }));
        [['A', secs[0]], ['B', secs[2]]].forEach(([l, sec]) => {
          pan.appendChild(h('div', { class: 'ab-row' }, [h('span', { class: 'ab-tag ab-' + l, text: l }),
            h('div', { class: 'ab-chords' }, sec.chords.map((c) => h('span', { class: 'ab-chord', text: c })))]));
        });
        // les A qui ne sont pas exactement pareils
        const A1 = secs[0].chords.join(' ');
        [[secs[1], '2e A'], [secs[3], 'dernier A']].forEach(([sec, nm]) => {
          if (sec.chords.join(' ') !== A1) pan.appendChild(h('p', { class: 'hint', text: 'Le ' + nm + ' est un peu différent : ' + sec.chords.join(' – ') }));
        });
        pan.appendChild(h('p', { class: 'ab-order' }, secs.map((sc) => h('span', { class: 'ab-tag ab-' + sc.label, text: sc.label, title: `accords n° ${sc.start + 1} à ${sc.end}` }))));
        pan.appendChild(h('p', { class: 'hint', text: secs.map((sc, i) => `${['1er A', '2e A', 'B', 'dernier A'][i]} : accords n° ${sc.start + 1} à ${sc.end}`).join(' · ') }));
      }
      // outil pour aider à trouver les parties
      const tool = h('details', { class: 'ab-tool' });
      if (!marks || manual) tool.open = true;
      tool.appendChild(h('summary', { text: '✏️ Placer les parties moi-même' }));
      tool.appendChild(h('p', { class: 'hint', text: 'Choisis l’accord où commence chaque partie (le 1er A commence toujours au 1er accord).' }));
      const cur = marks || [Math.max(1, Math.round(N / 4)), Math.max(2, Math.round(N / 2)), Math.max(3, Math.round(3 * N / 4))];
      const sels = ['Le 2e A commence à', 'Le B commence à', 'Le dernier A commence à'].map((lbl, j) => {
        const sel = h('select');
        seq.forEach((c, i) => { if (i === 0) return; const o = h('option', { value: String(i), text: `n° ${i + 1} : ${c}` }); if (i === cur[j]) o.selected = true; sel.appendChild(o); });
        tool.appendChild(h('label', { class: 'ab-field' }, [h('span', { text: lbl }), sel]));
        return sel;
      });
      const ok = h('button', { class: 'btn primary small', text: 'Valider ces parties' });
      const errBox = h('div');
      ok.addEventListener('click', () => {
        const m = sels.map((x) => +x.value);
        if (!validMarks(m, N)) { errBox.innerHTML = ''; errBox.appendChild(h('div', { class: 'notice warn', text: 'Les parties doivent se suivre : 2e A, puis B, puis dernier A.' })); return; }
        setState({ marks: m, mode: 'yes' });
      });
      const reset = h('button', { class: 'btn small', text: '↺ Revenir à la détection automatique' });
      reset.addEventListener('click', () => setState({ marks: null, mode: 'auto' }));
      tool.appendChild(h('div', { class: 'btn-row' }, [ok, reset]));
      tool.appendChild(errBox);
      pan.appendChild(tool);
      return pan;
    }

    // passage secret : Em, G, Dsus4, A7sus4 → les guitares bizarres (seulement quand la liste vient de changer)
    const SECRET = 'em|g|dsus4|a7sus4';
    const RICK = 'bbm/eb|ab|fm7|bbm7';
    let lastKey = items.map((x) => normalize(x.text).toLowerCase()).join('|');
    function draw() {
      const key = items.map((x) => normalize(x.text).toLowerCase()).join('|');
      if (key !== lastKey) {
        lastKey = key;
        if (key === SECRET) { location.hash = '#/guitare/guitares-bizarres'; return; }
        if (key === RICK) rickroll();
      }
      result.innerHTML = '';
      const panel = h('div', { class: 'panel' });
      // liste des accords lus : chaque case se modifie directement
      panel.appendChild(h('h2', { style: 'margin-top:0', text: 'Accords trouvés' }));
      panel.appendChild(h('p', { class: 'hint', text: 'Si je me suis trompé, corrige directement dans les cases (ex. Am7, D-7, G7(b9), Bbmaj7…). ✕ supprime, ＋ insère un accord juste après. En orange : lecture incertaine, à vérifier. « lu … » : accord bizarre sur la photo, que j’ai remplacé par l’accord du morceau qui lui ressemble le plus.' }));
      const chips = h('div', { class: 'sc-chips' });
      const save = () => App.save('scoreChords', items);
      items.forEach((it, i) => {
        const chip = h('span', { class: 'sc-chip' + (it.sure ? '' : ' unsure') });
        chip.appendChild(h('small', { class: 'sc-num', text: String(i + 1) }));
        if (it.was) chip.title = 'Lu « ' + it.was + ' » sur la partition : remplacé par un accord du morceau qui lui ressemble.';
        const inp = h('input', { class: 'sc-edit', type: 'text', value: it.text, 'aria-label': 'Accord n° ' + (i + 1), autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false' });
        const fit = () => { inp.style.width = Math.max(2.5, inp.value.length + 1) + 'ch'; };
        fit();
        inp.addEventListener('input', () => { fit(); chip.classList.toggle('bad', !!inp.value.trim() && !parseChord(inp.value)); });
        const commit = () => {
          const v = inp.value.trim();
          if (v === it.text) return;
          if (!v) { items.splice(i, 1); save(); draw(); return; }
          if (!parseChord(v)) { chip.classList.add('bad'); return; }
          it.text = normalize(v); it.sure = true; delete it.was;
          save(); draw();
        };
        inp.addEventListener('change', commit);
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); });
        const plus = h('button', { class: 'sc-x', text: '＋', title: 'Insérer un accord après' });
        plus.addEventListener('click', () => {
          const v = prompt('Accord à insérer après « ' + it.text + ' » :', '');
          if (!v || !v.trim()) return;
          if (!parseChord(v)) { alert('« ' + v + ' » n’est pas un accord reconnu.'); return; }
          items.splice(i + 1, 0, { text: normalize(v), sure: true }); save(); draw();
        });
        const x = h('button', { class: 'sc-x', text: '✕', title: 'Supprimer' });
        x.addEventListener('click', () => { items.splice(i, 1); save(); draw(); });
        chip.appendChild(inp);
        if (it.was) chip.appendChild(h('small', { class: 'sc-was', text: '(lu « ' + it.was + ' »)' }));
        chip.appendChild(plus); chip.appendChild(x);
        chips.appendChild(chip);
      });
      if (!items.length) chips.appendChild(h('span', { class: 'muted', text: 'Aucun accord pour l’instant.' }));
      panel.appendChild(chips);
      const add = h('input', { type: 'text', placeholder: 'Ajouter à la fin : ex. C G Am F' });
      const addBtn = h('button', { class: 'btn small', text: '+ Ajouter' });
      const doAdd = () => {
        const bad = [];
        add.value.split(/[\s;|]+/).filter(Boolean).forEach((t) => { if (parseChord(t)) items.push({ text: normalize(t), sure: true }); else bad.push(t); });
        add.value = bad.join(' ');
        save(); draw();
        if (bad.length) alert('Non reconnu : ' + bad.join(', '));
      };
      addBtn.addEventListener('click', doAdd);
      add.addEventListener('keydown', (e) => { if (e.key === 'Enter') doAdd(); });
      const clear = h('button', { class: 'btn small', text: '🗑 Tout effacer' });
      clear.addEventListener('click', () => { if (confirm('Effacer tous les accords ?')) { items = []; save(); draw(); } });
      // petite explication + les deux suites « spéciales » à essayer
      const tryIt = (seq) => {
        if (items.length && !confirm('Remplacer tes accords par « ' + seq.join(' ') + ' » ?')) return;
        items = seq.map((t) => ({ text: t, sure: true }));
        save(); draw();
      };
      const ex = (label, seq) => {
        const b = h('button', { class: 'sc-example', text: seq.join(' – '), title: 'Essayer' });
        b.addEventListener('click', () => tryIt(seq));
        return h('span', { class: 'sc-ex-item' }, [h('span', { text: label }), b]);
      };
      panel.appendChild(h('div', { class: 'sc-explain' }, [
        h('p', { text: '✍️ Tu peux aussi écrire tes accords toi-même ici (séparés par des espaces), sans photo. Et certaines suites font quelque chose de spécial… essaie :' }),
        h('div', { class: 'sc-examples' }, [ex('🎸', ['Em', 'G', 'Dsus4', 'A7sus4']), ex('🎬', ['Bbm/Eb', 'Ab', 'Fm7', 'Bbm7'])])
      ]));
      panel.appendChild(h('div', { class: 'free-search', style: 'margin-top:.6rem' }, [add, addBtn, clear]));
      if (key === RICK) {
        const again = h('button', { class: 'btn', text: '🎬 Revoir le tuto vidéo' });
        again.addEventListener('click', rickroll);
        panel.appendChild(h('div', { class: 'btn-row', style: 'margin-top:.8rem' }, [again]));
      }
      // les accords secrets sont là : un bouton pour (re)visiter les guitares bizarres
      if (key === SECRET) {
        panel.appendChild(h('div', { class: 'btn-row', style: 'margin-top:.8rem' }, [
          h('a', { class: 'btn primary', href: '#/guitare/guitares-bizarres', text: '🎸 Voir les guitares bizarres' })
        ]));
      }
      result.appendChild(panel);
      result.appendChild(formPanel());

      // les accords sur la guitare (chacun une seule fois, dans l'ordre d'apparition)
      const names = [];
      items.forEach((x) => { if (names.indexOf(x.text) < 0) names.push(x.text); });
      if (!names.length) return;
      const gp = h('div', { class: 'panel' });
      gp.appendChild(h('h2', { style: 'margin-top:0', text: '🎸 Sur la guitare' }));
      gp.appendChild(h('p', { class: 'hint', text: 'Formes fermées de la fiche d’accords (jamais de cordes à vide, pour un son jazz). Rond orange = fondamentale, × = corde étouffée, pointillés = note facultative, « 5fr » = la forme commence à la 5e case. Touche un accord pour l’entendre, ↻ pour l’autre forme.' }));
      const grid = h('div', { class: 'sc-grid' });
      const choice = App.store('scoreShape', {});
      const chosen = {};
      names.forEach((n) => {
        const ch = parseChord(n);
        const opts = ch ? shapesFor(ch) : [];
        const card = h('div', { class: 'sc-card' });
        card.appendChild(h('div', { class: 'sc-title', text: n }));
        if (!opts.length) { card.appendChild(h('div', { class: 'muted', text: '?' })); grid.appendChild(card); return; }
        const p = opts[(choice[n] || 0) % opts.length];
        chosen[n] = p;
        const btn = h('button', { class: 'sc-btn', title: 'Écouter' }, [diagram(p)]);
        btn.addEventListener('click', () => play(p));
        card.appendChild(btn);
        const label = 'forme « ' + p.shape.name + ' »' + (p.simplified ? ' (simplifié)' : '');
        card.appendChild(h('div', { class: 'sc-info', text: label }));
        if (ch.bass != null) card.appendChild(h('div', { class: 'sc-info', text: 'basse : ' + n.split('/')[1] }));
        if (opts.length > 1) {
          const alt = h('button', { class: 'sc-alt', text: '↻ autre forme' });
          alt.addEventListener('click', () => { choice[n] = ((choice[n] || 0) + 1) % opts.length; App.save('scoreShape', choice); draw(); });
          card.appendChild(alt);
        }
        grid.appendChild(card);
      });
      gp.appendChild(grid);
      result.appendChild(gp);

      // PDF une fois les corrections terminées
      const pp = h('div', { class: 'panel' });
      pp.appendChild(h('h2', { style: 'margin-top:0', text: '📄 Faire le PDF' }));
      pp.appendChild(h('p', { class: 'hint', text: 'Quand tu as fini de corriger, donne un titre et télécharge la fiche : la grille des accords dans l’ordre, puis chaque accord sur le manche (les formes choisies ci-dessus).' }));
      const title = h('input', { type: 'text', placeholder: 'Titre du morceau (facultatif)', value: App.store('scoreTitle', '') });
      title.addEventListener('change', () => App.save('scoreTitle', title.value));
      const go = h('button', { class: 'btn primary', text: '⬇ Télécharger le PDF' });
      go.addEventListener('click', async () => {
        go.disabled = true; go.textContent = 'Création du PDF…';
        try { await makePdf(title.value.trim(), items.map((x) => x.text), names.map((n) => ({ name: n, p: chosen[n] })), currentForm()); }
        catch (e) { alert('Impossible de créer le PDF : ' + e.message); }
        go.disabled = false; go.textContent = '⬇ Télécharger le PDF';
      });
      pp.appendChild(h('div', { class: 'free-search' }, [title, go]));
      result.appendChild(pp);
    }
    draw();
  }

  App.register('/guitare/partition', {
    title: 'Partition → accords',
    subtitle: 'Envoie une photo de ta partition : je trouve les accords et je te les montre sur la guitare, avec les formes de ta fiche d’accords.',
    render
  });

  window.ScoreChords = { parseChord, shapesFor, readChord, plausible, fixWeird, detectAABA };
})();

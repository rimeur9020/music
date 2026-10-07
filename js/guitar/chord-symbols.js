/*
 * Noms d'accords → notes → doigté sur le manche.
 * Comprend les notations courantes ET celles de la fiche SongMaven :
 * -7 (mineur 7), + (augmenté), +7, -7(b5), -maj7, -(b6), -6/9, add2, -add4, 7(b9,#5), 7(9,13), -9+7, maj7(#5,#11)…
 * Les doigtés viennent d'abord des accords ouverts, sinon des formes de la banque (même fiche).
 */
(function () {
  'use strict';
  const M = Music;
  const X = -1;
  const ROOTS = '(?:[A-G]|Do|Ré|Re|Mi|Fa|Sol|La|Si)';
  const ROOT_RE = new RegExp('^(' + ROOTS + ')([#b]?)');
  const BASS_RE = new RegExp('/(' + ROOTS + ')([#b]?)$');
  const FR = { Do: 'C', 'Ré': 'D', Re: 'D', Mi: 'E', Fa: 'F', Sol: 'G', La: 'A', Si: 'B' };
  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  function pcOf(letter, acc) { return M.mod(PC[FR[letter] || letter] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0), 12); }

  function normalize(t) {
    return String(t || '').trim()
      .replace(/♯/g, '#').replace(/♭/g, 'b').replace(/[−–—]/g, '-')
      .replace(/\s+/g, '');
  }

  // altérations : b5 #5 b9 #9 #11 b13 (+ et - acceptés à la place de # et b)
  const ALT = { b5: 6, '#5': 8, b6: 8, '#6': 10, b9: 1, '#9': 3, '#11': 6, b11: 4, b13: 8, '#13': 10 };
  const PLAIN = { 2: 2, 4: 5, 6: 9, 9: 2, 11: 5, 13: 9 };

  /**
   * Analyse un nom d'accord. Retourne null s'il n'est pas reconnu, sinon
   * { name, root, rootName, bass, ivs: [demi-tons], minor }.
   */
  function parse(raw) {
    let t = normalize(raw);
    const r = ROOT_RE.exec(t);
    if (!r) return null;
    let s = t.slice(r[0].length);
    let bass = null;
    const b = BASS_RE.exec(s);
    if (b) { bass = pcOf(b[1], b[2]); s = s.slice(0, b.index); }
    const st = { third: 4, fifth: 7, sev: null, ext: new Set(), sus: null, noThird: false, minor: false, majSev: false };
    let i = 0;
    const eat = (re) => { const m = re.exec(s.slice(i)); if (m) { i += m[0].length; return m; } return null; };
    const seventh = () => (st.majSev ? 11 : st.dim7 ? 9 : 10);
    const number = (n) => {
      if (n === '5' && !st.sev && st.ext.size === 0 && i === s.length) { st.noThird = true; return; }
      if (n === '6/9' || n === '69') { st.ext.add(9); st.ext.add(2); return; }
      if (n === '6') { st.ext.add(9); return; }
      if (n === '7') { st.sev = seventh(); return; }
      if (n === '9') { st.sev = seventh(); st.ext.add(2); return; }
      // 11 majeur : en pratique on enlève la tierce (= 9sus4, comme sur la fiche)
      if (n === '11') { st.sev = seventh(); st.ext.add(2); st.ext.add(5); if (!st.minor) st.sus = 5; return; }
      if (n === '13') { st.sev = seventh(); st.ext.add(2); st.ext.add(9); if (st.minor) st.ext.add(5); return; }
      if (n === '2' || n === '4') { st.ext.add(PLAIN[n]); return; }
      throw new Error('nombre');
    };
    try {
      // 1. qualité
      if (eat(/^(maj|Maj|MAJ|ma(?=[0-9])|Δ|M(?!in))/)) { st.majSev = true; if (s[i - 1] === 'Δ' && !/^[0-9]/.test(s.slice(i))) st.sev = 11; }
      else if (eat(/^(min|mi|m|-)/)) { st.minor = true; st.third = 3; }
      else if (eat(/^(dim|°)/)) { st.third = 3; st.fifth = 6; st.dim7 = true; if (eat(/^7/)) st.sev = 9; st.dim7 = false; }
      else if (eat(/^ø/)) { st.minor = true; st.third = 3; st.fifth = 6; st.sev = 10; eat(/^7/); }
      else if (eat(/^(aug|\+)/)) { st.fifth = 8; }
      // mineur + maj7 : -maj7, m(maj7), mΔ, mM7
      if (st.minor && eat(/^\(?(maj|Maj|Δ|M|\+)7?\)?(?=$|[0-9(,])/)) { st.majSev = true; if (!/^[0-9]/.test(s.slice(i))) st.sev = 11; }
      // 2. chiffre principal
      const n = eat(/^(6\/9|69|13|11|9|7|6|5)/);
      if (n) number(n[1]);
      // 3. le reste : sus, add, altérations, extensions entre parenthèses
      while (i < s.length) {
        if (eat(/^[(),.]/)) continue;
        let m;
        if ((m = eat(/^sus(2|4)?/))) { st.sus = m[1] === '2' ? 2 : 5; continue; }
        if ((m = eat(/^add(b|#)?(2|4|6|9|11|13)/))) { st.ext.add(m[1] ? ALT[m[1] + m[2]] : PLAIN[m[2]]); continue; }
        if (eat(/^(maj7|Maj7|M7|Δ7?|\+7)/)) { st.sev = 11; continue; }
        if ((m = eat(/^(maj|Maj|M)(9|11|13)/))) { st.majSev = true; number(m[2]); continue; }
        if (eat(/^alt/)) { if (!st.sev) st.sev = 10; [1, 3, 8].forEach((x) => st.ext.add(x)); continue; }
        if (eat(/^(no|omit)3/)) { st.noThird = true; continue; }
        if ((m = eat(/^([b#+-])(5|6|9|11|13)/))) {
          const k = (m[1] === '+' ? '#' : m[1] === '-' ? 'b' : m[1]) + m[2];
          if (!(k in ALT)) throw new Error('alt');
          if (m[2] === '5') st.fifth = ALT[k]; else st.ext.add(ALT[k]);
          continue;
        }
        if ((m = eat(/^(13|11|9|7|6|4|2)/))) {
          if (m[1] === '7') st.sev = st.sev || 10;
          else st.ext.add(PLAIN[m[1]]);
          continue;
        }
        if (eat(/^5/)) continue;
        if (eat(/^(m|min)/) && !st.minor) { st.minor = true; st.third = 3; continue; }
        throw new Error('reste');
      }
    } catch (e) { return null; }
    const ivs = new Set([0, st.fifth]);
    if (st.sus != null) ivs.add(st.sus); else if (!st.noThird) ivs.add(st.third);
    if (st.sev != null) ivs.add(st.sev);
    st.ext.forEach((x) => ivs.add(x));
    if (st.noThird && st.sev == null && st.ext.size === 0) { ivs.clear(); ivs.add(0); ivs.add(7); }
    const root = pcOf(r[1], r[2]);
    return {
      name: t.replace(/^Re(?=[^a-z]|$)/, 'Ré'),
      root, rootName: (FR[r[1]] || r[1]) + (r[2] || ''),
      bass: bass != null && bass !== root ? bass : null,
      ivs: [...ivs].sort((a, b) => a - b), minor: st.third === 3 && st.sus == null
    };
  }

  /* ------------------------------------------------------------------ */
  /* Doigtés                                                             */
  /* ------------------------------------------------------------------ */
  const TYPE_IVS = {
    maj: [0, 4, 7], min: [0, 3, 7], '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], sus4: [0, 5, 7], sus2: [0, 2, 7],
    add9: [0, 2, 4, 7], '6': [0, 4, 7, 9], m6: [0, 3, 7, 9], '5': [0, 7], '9': [0, 2, 4, 7, 10], dim7: [0, 3, 6, 9], m7b5: [0, 3, 6, 10],
    dim: [0, 3, 6], aug: [0, 4, 8], mMaj7: [0, 3, 7, 11]
  };
  const key = (a) => a.slice().sort((x, y) => x - y).join(',');
  const semis = (iv) => M.mod(M.parseInterval(iv).semis, 12);

  function finish(frets, roots) {
    const played = frets.map((f, s) => (f > 0 ? s : -1)).filter((s) => s >= 0);
    const minF = played.length ? Math.min(...played.map((s) => frets[s])) : 0;
    const atMin = played.filter((s) => frets[s] === minF);
    let barre = 0, barreFrom = 0;
    if (atMin.length >= 3 && frets[5] === minF && frets.every((f, s) => s < atMin[0] || f === X || f >= minF)) {
      barre = minF; barreFrom = atMin[0];
      if (frets.slice(barreFrom).some((f) => f === X || f === 0)) barre = 0;
    }
    return { frets, barre, barreFrom, roots, midis: frets.map((f, s) => (f === X ? null : Chords.TUNING[s] + f)) };
  }

  /** Place une basse imposée (accord « slash ») sur une des cordes graves. */
  function withBass(v, bass) {
    const first = v.frets.findIndex((f) => f !== X);
    const fr = v.frets.filter((f) => f > 0);
    const lo = fr.length ? Math.min(...fr) : 0, hi = fr.length ? Math.max(...fr) : 3;
    for (let s = Math.min(first, 2); s >= 0; s--) {
      for (let f = 0; f <= 15; f++) {
        if (M.mod(Chords.TUNING[s] + f - bass, 12) !== 0) continue;
        if (f > 0 && (f < hi - 4 || f > lo + 4)) continue;
        const frets = v.frets.slice();
        for (let k = 0; k < s; k++) frets[k] = X;
        frets[s] = f;
        return finish(frets, v.roots.filter((r) => r > s));
      }
    }
    return v;
  }

  /**
   * Recherche libre d'un doigté jouable (4 cases max, cordes jouées contiguës, 4 doigts ou barré)
   * contenant toutes les notes indispensables. Sert quand aucune forme de la fiche ne convient.
   */
  function search(sym, want, essential) {
    const bassPc = sym.bass != null ? sym.bass : sym.root;
    let best = null;
    for (let p = 0; p <= 12; p++) {
      const opts = Chords.TUNING.map((open) => {
        const o = [X];
        for (let f = p === 0 ? 0 : p; f <= p + 3; f++) if (want.has(M.mod(open + f - sym.root, 12))) o.push(f);
        if (p > 0 && p <= 3 && want.has(M.mod(open - sym.root, 12))) o.push(0);
        return o;
      });
      const cur = [];
      const walk = (s) => {
        if (s === 6) {
          const played = cur.map((f, k) => (f === X ? -1 : k)).filter((k) => k >= 0);
          if (played.length < 4) return;
          const a = played[0], z = played[played.length - 1];
          if (z - a + 1 !== played.length) return;
          if (M.mod(Chords.TUNING[a] + cur[a] - bassPc, 12) !== 0) return;
          const notes = new Set(played.map((k) => M.mod(Chords.TUNING[k] + cur[k] - sym.root, 12)));
          for (const e of essential) if (!notes.has(e)) return;
          const fretted = played.filter((k) => cur[k] > 0);
          const minF = fretted.length ? Math.min(...fretted.map((k) => cur[k])) : 0;
          const atMin = fretted.filter((k) => cur[k] === minF).length;
          const fingers = fretted.length - (atMin >= 2 ? atMin - 1 : 0);
          if (fingers > 4) return;
          const span = fretted.length ? Math.max(...fretted.map((k) => cur[k])) - minF : 0;
          const opens = played.length - fretted.length;
          const score = 3 + span * 0.4 + p * 0.12 + (6 - played.length) * 0.3 + (atMin >= 2 && fretted.length > 4 ? 0.5 : 0) + (minF > 3 ? opens * 0.5 : 0);
          if (!best || score < best.score) best = { frets: cur.slice(), score };
          return;
        }
        for (const f of opts[s]) { cur[s] = f; walk(s + 1); }
      };
      walk(0);
    }
    if (!best) return null;
    const roots = best.frets.map((f, k) => (f !== X && M.mod(Chords.TUNING[k] + f - sym.root, 12) === 0 ? k : -1)).filter((k) => k >= 0);
    return { v: finish(best.frets, roots), score: best.score, label: 'Doigté calculé' };
  }

  const cache = new Map();
  /** Doigtés possibles pour un accord analysé, du plus simple au moins simple (3 au maximum). */
  function voicings(sym) {
    if (!sym) return [];
    const ck = sym.root + '|' + sym.ivs.join(',') + '|' + sym.bass;
    if (!cache.has(ck)) cache.set(ck, compute(sym));
    return cache.get(ck).map((v) => Object.assign({}, v));
  }
  function compute(sym) {
    const want = new Set(sym.ivs);
    const wantKey = key(sym.ivs);
    const cands = [];
    // a) accords ouverts (si l'accord est exactement l'un d'eux)
    Chords.openChords().forEach(({ chord, voicing }) => {
      if (M.pcOf(chord.root) !== sym.root) return;
      const iv = TYPE_IVS[chord.type];
      if (!iv || key(iv) !== wantKey) return;
      const roots = voicing.frets.map((f, s) => (f !== X && M.mod(Chords.TUNING[s] + f - sym.root, 12) === 0 ? s : -1)).filter((s) => s >= 0);
      cands.push({ v: finish(voicing.frets.slice(), roots), score: voicing.barre ? -1 : -5, label: 'Ouvert' });
    });
    // b) formes de la banque (fiche SongMaven)
    // la quinte peut manquer ; pour les accords de 13e, la 9e et la 11e aussi
    const omissible = new Set([7]);
    if (want.has(9) && (want.has(10) || want.has(11))) { omissible.add(2); omissible.add(5); }
    if (want.size >= 6) omissible.add(2);
    ShapeBank.ALL.forEach((fam) => fam.shapes.forEach((sh) => {
      const have = new Set(sh.strings.filter(Boolean).map((x) => semis(x.iv)));
      const fset = new Set(sh.formula.split(' ').map(semis));
      // la forme ne doit pas jouer de note étrangère à l'accord
      if ([...fset].some((x) => !want.has(x))) return;
      let miss = 0;
      want.forEach((x) => { if (!have.has(x)) miss += omissible.has(x) && want.size > 3 ? 0.4 : 3; });
      if (!have.has(sym.minor ? 3 : 4) && want.has(sym.minor ? 3 : 4)) miss += 5;
      const rs = sh.rootString === 6 ? 0 : 1;
      const os = sh.strings.filter(Boolean).map((x) => x.o);
      let rf = M.mod(sym.root - Chords.TUNING[rs], 12);
      if (rf + Math.min(...os) < 0) rf += 12;
      const frets = sh.strings.map((x) => (x ? rf + x.o : X));
      const roots = sh.strings.map((x, s) => (x && x.root ? s : -1)).filter((s) => s >= 0);
      const exact = key([...fset]) === wantKey;
      cands.push({ v: finish(frets, roots), score: (exact ? 0 : 2) + miss + rf * 0.08 + (sh.strings.filter((x) => x && x.optional).length ? 0.1 : 0), label: 'Fondamentale sur la ' + sh.rootString + 'e corde' });
    }));
    // aucune forme ne contient toutes les notes importantes : on calcule un doigté
    const essential = sym.ivs.filter((x) => !omissible.has(x));
    if (!cands.some((c) => c.score < 3) && wantKey !== '0,7') {
      const found = search(sym, want, essential);
      if (found) cands.push(found);
    }
    // accord de puissance (C5) : formes de Mi et de La
    if (wantKey === '0,7') {
      [[0, Chords.E_SHAPES['5']], [1, Chords.A_SHAPES['5']]].forEach(([rs, shape]) => {
        const rf = M.mod(sym.root - Chords.TUNING[rs], 12);
        cands.push({ v: finish(shape.map((o) => (o === X ? X : rf + o)), [rs]), score: rf * 0.08, label: 'Accord de puissance' });
      });
    }
    // dernier recours : la triade
    if (!cands.length) {
      const tri = parse(sym.rootName + (sym.minor ? 'm' : ''));
      if (tri && key(tri.ivs) !== wantKey) return compute(Object.assign(tri, { bass: sym.bass })).map((v) => Object.assign(v, { label: 'Simplifié (triade)' }));
    }
    cands.sort((a, b) => a.score - b.score);
    const out = [];
    cands.forEach((c) => {
      let v = c.v;
      if (sym.bass != null) v = withBass(v, sym.bass);
      if (!out.some((o) => o.frets.join() === v.frets.join()) && out.length < 3) out.push(Object.assign(v, { label: c.label }));
    });
    return out;
  }

  /** Diagramme SVG (le rond orange = fondamentale). */
  function diagram(name, v) {
    return Chords.diagramSVG(name, v, 'chord-svg');
  }

  window.ChordSym = { parse, voicings, diagram, normalize };
})();

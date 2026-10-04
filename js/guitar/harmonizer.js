/* Analyse tonale, harmonisation automatique et découpage en sections. */
(function () {
  'use strict';
  const M = Music;

  // Profils de Krumhansl-Kessler
  const MAJ_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const MIN_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

  function corr(a, b) {
    const ma = a.reduce((x, y) => x + y, 0) / 12;
    const mb = b.reduce((x, y) => x + y, 0) / 12;
    let n = 0, da = 0, db = 0;
    for (let i = 0; i < 12; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
    return da && db ? n / Math.sqrt(da * db) : 0;
  }

  function histogram(song) {
    const hst = new Array(12).fill(0);
    song.measures.forEach((m) => m.notes.forEach((n) => { hst[n.pc] += n.dur; }));
    return hst;
  }

  function tonicFromFifths(fifths) {
    let n = { letter: 0, acc: 0 };
    for (let i = 0; i < Math.abs(fifths); i++) n = M.transpose(n, fifths > 0 ? '5' : '4');
    return n;
  }

  function fifthsOfMajor(pc) {
    // tonalité majeure la plus simple pour une hauteur donnée
    return { 0: 0, 7: 1, 2: 2, 9: 3, 4: 4, 11: 5, 6: 6, 1: -5, 8: -4, 3: -3, 10: -2, 5: -1 }[pc];
  }

  function lastNotePc(song) {
    for (let i = song.measures.length - 1; i >= 0; i--) {
      const ns = song.measures[i].notes;
      if (ns.length) return ns.slice().sort((a, b) => a.start - b.start || a.midi - b.midi)[ns.length - 1].pc;
    }
    return null;
  }

  /** { tonic: note, mode: 'major'|'minor', fifths } */
  function detectKey(song) {
    const hst = histogram(song);
    const last = lastNotePc(song);
    const total = hst.reduce((a, b) => a + b, 0);
    const scoreKey = (pc, mode) => {
      const prof = mode === 'major' ? MAJ_PROFILE : MIN_PROFILE;
      const rot = prof.map((_, i) => prof[M.mod(i - pc, 12)]);
      let s = total ? corr(hst, rot) : 0;
      if (last === pc) s += 0.15;
      return s;
    };
    if (song.key && song.key.fifths != null) {
      const majT = tonicFromFifths(song.key.fifths);
      const minT = M.transpose(majT, '6');
      let mode = song.key.mode === 'minor' ? 'minor' : song.key.mode === 'major' ? 'major' : null;
      if (!mode) mode = scoreKey(M.pcOf(minT), 'minor') > scoreKey(M.pcOf(majT), 'major') ? 'minor' : 'major';
      return { tonic: mode === 'major' ? majT : minT, mode, fifths: song.key.fifths };
    }
    let best = null;
    for (let pc = 0; pc < 12; pc++) {
      ['major', 'minor'].forEach((mode) => {
        const s = scoreKey(pc, mode);
        if (!best || s > best.s) best = { pc, mode, s };
      });
    }
    const majPc = best.mode === 'major' ? best.pc : M.mod(best.pc + 3, 12);
    const fifths = fifthsOfMajor(majPc);
    const majT = tonicFromFifths(fifths);
    return { tonic: best.mode === 'major' ? majT : M.transpose(majT, '6'), mode: best.mode, fifths };
  }

  /* ------------------------------------------------------------------ */
  /* Candidats                                                           */
  /* ------------------------------------------------------------------ */
  const MAJ_IV = { 0: '1', 1: 'b2', 2: '2', 3: 'b3', 4: '3', 5: '4', 6: '#4', 7: '5', 8: 'b6', 9: '6', 10: 'b7', 11: '7' };
  const MIN_IV = { 0: '1', 1: 'b2', 2: '2', 3: 'b3', 4: '3', 5: '4', 6: 'b5', 7: '5', 8: 'b6', 9: '6', 10: 'b7', 11: '7' };

  function candidateSet(mode, style) {
    const jazzy = ['jazz', 'bossa', 'manouche'].indexOf(style) >= 0;
    const rocky = ['rock', 'blues', 'funk'].indexOf(style) >= 0;
    const folky = ['folk', 'chanson', 'country', 'classique', 'ballade'].indexOf(style) >= 0;
    let list;
    if (mode === 'major') {
      list = [
        { off: 0, q: 'maj', fn: 'T', roman: 'I', prior: 0 },
        { off: 2, q: 'min', fn: 'PD', roman: 'ii', prior: jazzy ? 0 : -0.3 },
        { off: 4, q: 'min', fn: 'T', roman: 'iii', prior: -0.9 },
        { off: 5, q: 'maj', fn: 'PD', roman: 'IV', prior: 0 },
        { off: 7, q: 'maj', fn: 'D', roman: 'V', prior: 0 },
        { off: 9, q: 'min', fn: 'T', roman: 'vi', prior: -0.2 },
        { off: 11, q: 'dim', fn: 'D', roman: 'vii°', prior: -2.2 },
        { off: 2, q: '7', fn: 'SD', target: 7, roman: 'V/V', prior: jazzy || folky ? -0.8 : -1.3 },
        { off: 4, q: '7', fn: 'SD', target: 9, roman: 'V/vi', prior: jazzy || folky ? -0.9 : -1.3 },
        { off: 9, q: '7', fn: 'SD', target: 2, roman: 'V/ii', prior: jazzy ? -0.9 : -1.6 },
        { off: 0, q: '7', fn: 'SD', target: 5, roman: 'V/IV', prior: style === 'blues' ? 0.3 : jazzy ? -1.1 : -1.7 },
        { off: 10, q: 'maj', fn: 'PD', roman: '♭VII', prior: rocky ? -0.6 : -1.5 },
        { off: 5, q: 'min', fn: 'PD', roman: 'iv', prior: ['ballade', 'pop'].indexOf(style) >= 0 ? -1.2 : -1.7 },
        { off: 8, q: 'maj', fn: 'PD', roman: '♭VI', prior: rocky ? -1.2 : -1.9 }
      ];
    } else {
      list = [
        { off: 0, q: 'min', fn: 'T', roman: 'i', prior: 0 },
        { off: 2, q: 'dim', fn: 'PD', roman: 'ii°', prior: jazzy ? -0.5 : -1.6 },
        { off: 3, q: 'maj', fn: 'T', roman: 'III', prior: -0.4 },
        { off: 5, q: 'min', fn: 'PD', roman: 'iv', prior: 0 },
        { off: 7, q: 'min', fn: 'D', roman: 'v', prior: rocky ? -0.5 : -1.0 },
        { off: 7, q: 'maj', fn: 'D', roman: 'V', prior: rocky ? -0.4 : -0.05 },
        { off: 8, q: 'maj', fn: 'PD', roman: 'VI', prior: -0.2 },
        { off: 10, q: 'maj', fn: 'D', roman: 'VII', prior: -0.4 },
        { off: 5, q: 'maj', fn: 'PD', roman: 'IV', prior: style === 'funk' ? -0.5 : -1.5 },
        { off: 3, q: '7', fn: 'SD', target: 8, roman: 'V/VI', prior: -1.6 },
        { off: 0, q: '7', fn: 'SD', target: 5, roman: 'V/iv', prior: jazzy ? -1.2 : -1.8 }
      ];
    }
    if (style === 'blues' && mode === 'major') {
      list.forEach((c) => { if (['I', 'IV', 'V'].indexOf(c.roman) < 0 && c.roman !== 'V/IV') c.prior -= 1; });
    }
    return list;
  }

  function spellCandidate(c, key) {
    const iv = (key.mode === 'major' ? MAJ_IV : MIN_IV)[c.off];
    return { root: M.transpose(key.tonic, iv), type: c.q };
  }

  /* ------------------------------------------------------------------ */
  /* Segments                                                            */
  /* ------------------------------------------------------------------ */
  function barLength(m) { return m.beats * 4 / m.beatType; }

  function splitPoints(m, rhythm) {
    const len = barLength(m);
    const ti = Rhythms.timeInfo(m.beats, m.beatType);
    if (rhythm === 'bar') return [0];
    if (ti.compound) return ti.pulses >= 2 ? [0, len / 2] : [0];
    if (m.beats === 3) return [0];
    if (m.beats % 2 === 0) return [0, len / 2];
    return [0];
  }

  function segmentNotes(m, from, to) {
    const out = [];
    m.notes.forEach((n) => {
      const s = Math.max(n.start, from);
      const e = Math.min(n.start + n.dur, to);
      if (e > s + 1e-6) out.push({ pc: n.pc, dur: e - s, onset: n.start >= from - 1e-6 ? n.start : from, beatPos: n.start - from, held: n.start < from - 1e-6 });
    });
    return out;
  }

  function fitScore(notes, pcs, rootPc, beatLen) {
    let s = 0;
    notes.forEach((n) => {
      let w = n.dur;
      if (Math.abs(n.beatPos) < 1e-6) w *= 1.5; // début du segment
      else if (Math.abs(n.beatPos / beatLen - Math.round(n.beatPos / beatLen)) < 1e-6) w *= 1.15; // sur un temps
      else w *= 0.75;
      if (n.held) w *= 0.8;
      if (pcs.indexOf(n.pc) >= 0) s += w * (n.pc === rootPc ? 1.15 : 1);
      else s -= w * 0.75;
    });
    return s;
  }

  function transitionScore(a, b, midBar) {
    if (a === b) return midBar ? 0.5 : 0.15;
    let s = midBar ? -1.3 : 0;
    const ca = a.cand, cb = b.cand;
    if (ca.fn === 'SD') s += (ca.target === cb.off && cb.q !== 'dim') ? 1.1 : -0.9;
    else if (ca.fn === 'D' && cb.fn === 'T') s += cb.off === 0 ? 1.0 : 0.5;
    else if (ca.fn === 'PD' && cb.fn === 'D') s += 0.7;
    else if (ca.fn === 'D' && cb.fn === 'PD') s -= 0.6;
    else if (ca.fn === 'PD' && cb.off === 0) s += 0.3;
    else s += 0.1;
    if (M.mod(cb.off - ca.off, 12) === 5) s += 0.3; // mouvement de quinte descendante
    if (ca.off === cb.off && ca.q !== cb.q) s -= 0.5;
    return s;
  }

  /**
   * Harmonise la suite de mesures (déjà « dépliée »).
   * Retourne pour chaque mesure : { chords: [{chord, roman, alts}], fromScore }
   */
  function harmonize(measures, key, opts) {
    opts = opts || {};
    const style = opts.style || 'pop';
    const cands = candidateSet(key.mode, style).map((c) => {
      const chord = spellCandidate(c, key);
      return { cand: c, chord, pcs: M.chordPcs(chord), rootPc: M.pcOf(chord.root) };
    });
    // Segments
    const segs = [];
    measures.forEach((m, mi) => {
      const pts = splitPoints(m, opts.rhythm || 'auto');
      const len = barLength(m);
      pts.forEach((p, k) => {
        const to = k + 1 < pts.length ? pts[k + 1] : len;
        segs.push({ mi, k, from: p, to, notes: segmentNotes(m, p, to), midBar: k > 0, beatLen: 4 / m.beatType * (Rhythms.timeInfo(m.beats, m.beatType).compound ? 3 : 1) });
      });
    });
    const N = segs.length;
    const S = cands.length;
    if (!N) return [];
    const local = segs.map((sg, i) => cands.map((c) => {
      let v = fitScore(sg.notes, c.pcs, c.rootPc, sg.beatLen) + c.cand.prior;
      if (i === 0) v += c.cand.off === 0 && c.cand.fn === 'T' ? 1.5 : -0.3;
      if (i === N - 1) v += c.cand.off === 0 && c.cand.fn === 'T' ? 2.0 : -0.5;
      // fins de phrase (toutes les 4 mesures) : cadence sur I ou V
      const m = sg.mi;
      if (sg.k === 0 && (m + 1) % 4 === 0 && i < N - 1) v += (c.cand.off === 0 && c.cand.fn === 'T') || c.cand.fn === 'D' ? 0.35 : 0;
      if (opts.forced && opts.forced[sg.mi]) {
        const f = opts.forced[sg.mi];
        const fc = f[Math.min(f.length - 1, sg.k)];
        if (fc) v += M.chordKey(fc) === M.chordKey(c.chord) ? 50 : -50;
      }
      return v;
    }));
    // Viterbi
    const dp = [local[0].slice()];
    const back = [new Array(S).fill(-1)];
    for (let i = 1; i < N; i++) {
      dp.push(new Array(S).fill(-Infinity));
      back.push(new Array(S).fill(0));
      for (let b = 0; b < S; b++) {
        for (let a = 0; a < S; a++) {
          const v = dp[i - 1][a] + transitionScore(cands[a], cands[b], segs[i].midBar) + local[i][b];
          if (v > dp[i][b]) { dp[i][b] = v; back[i][b] = a; }
        }
      }
    }
    let bi = 0;
    for (let b = 1; b < S; b++) if (dp[N - 1][b] > dp[N - 1][bi]) bi = b;
    const path = new Array(N);
    for (let i = N - 1; i >= 0; i--) { path[i] = bi; bi = back[i][bi]; }

    const out = measures.map(() => ({ chords: [] }));
    segs.forEach((sg, i) => {
      const c = cands[path[i]];
      const alts = cands.map((x, j) => ({ x, v: local[i][j] })).sort((p, q) => q.v - p.v).slice(0, 7).map((p) => p.x);
      const next = i + 1 < N ? cands[path[i + 1]] : null;
      const entry = { chord: colorize(c, key, style, opts.color, next), roman: c.cand.roman, alts: alts.map((a) => colorize(a, key, style, opts.color, null)) };
      const bar = out[sg.mi];
      const prev = bar.chords[bar.chords.length - 1];
      if (prev && M.chordKey(prev.chord) === M.chordKey(entry.chord)) return;
      bar.chords.push(entry);
    });
    return out;
  }

  /** Couleur des accords selon le style (triades, septièmes…). */
  function colorize(c, key, style, color, next) {
    const ch = { root: c.chord.root, type: c.chord.type };
    const cand = c.cand;
    let mode = color || 'auto';
    if (mode === 'auto') {
      mode = ['jazz', 'bossa'].indexOf(style) >= 0 ? 'jazz' : style === 'manouche' ? 'manouche' : style === 'blues' ? 'blues' : style === 'funk' ? 'funk' : 'simple';
    }
    const q = ch.type;
    if (mode === 'simple') {
      if (cand.fn === 'D' && q === 'maj' && next && next.cand.off === 0 && ['folk', 'chanson', 'country', 'classique', 'ballade', 'pop'].indexOf(style) >= 0) ch.type = '7';
    } else if (mode === 'rich') {
      if (q === 'maj') ch.type = cand.fn === 'D' ? '7' : (cand.off === 0 || cand.off === 5) ? 'maj7' : 'add9';
      if (q === 'min') ch.type = 'm7';
    } else if (mode === 'jazz') {
      if (q === 'maj') ch.type = cand.fn === 'D' || cand.off === 10 && key.mode === 'minor' ? '7' : 'maj7';
      if (q === 'min') ch.type = key.mode === 'minor' && cand.off === 0 ? 'm6' : 'm7';
      if (q === 'dim') ch.type = 'm7b5';
    } else if (mode === 'manouche') {
      if (q === 'maj') ch.type = cand.fn === 'D' ? '7' : '6';
      if (q === 'min') ch.type = cand.fn === 'T' || cand.off === 5 ? 'm6' : 'm7';
      if (q === 'dim') ch.type = 'm7b5';
    } else if (mode === 'blues') {
      if (q === 'maj') ch.type = '7';
      if (q === 'min') ch.type = 'm7';
    } else if (mode === 'funk') {
      if (q === 'maj') ch.type = cand.fn === 'D' || cand.off === 0 || cand.off === 5 ? '9' : '7';
      if (q === 'min') ch.type = 'm7';
    } else if (mode === 'power') {
      if (q === 'maj' || q === 'min') ch.type = '5';
    }
    return ch;
  }

  /** Accords présents dans la partition, répartis par mesure. */
  function scoreChords(measures) {
    let last = null;
    const any = measures.some((m) => m.harmonies && m.harmonies.length);
    if (!any) return null;
    return measures.map((m) => {
      const hs = (m.harmonies || []).slice().sort((a, b) => a.start - b.start);
      const len = barLength(m);
      if (!hs.length) return { chords: last ? [{ chord: last, fromScore: true }] : [] };
      const list = [];
      if (hs[0].start > 0.01 && last) list.push({ chord: last, fromScore: true });
      hs.forEach((x) => {
        if (x.start >= len) return;
        if (!list.length || M.chordKey(list[list.length - 1].chord) !== M.chordKey(x.chord)) list.push({ chord: x.chord, fromScore: true });
      });
      last = hs[hs.length - 1].chord;
      return { chords: list.slice(0, 4) };
    });
  }

  /* ------------------------------------------------------------------ */
  /* Sections                                                            */
  /* ------------------------------------------------------------------ */
  function barSignature(m) {
    return m.notes.map((n) => Math.round(n.start * 4) + ':' + n.midi);
  }
  function barSim(a, b) {
    if (!a.length && !b.length) return 1;
    const A = new Set(a), B = new Set(b);
    let inter = 0;
    A.forEach((x) => { if (B.has(x)) inter++; });
    return inter / (A.size + B.size - inter);
  }
  function chunkSim(ca, cb, measures) {
    const n = Math.min(ca.length, cb.length);
    if (!n) return 0;
    let s = 0;
    for (let i = 0; i < n; i++) s += barSim(barSignature(measures[ca[i]]), barSignature(measures[cb[i]]));
    return (s / n) * (n / Math.max(ca.length, cb.length));
  }

  /**
   * order : indices des mesures écrites dans l'ordre joué.
   * Retourne [{ label, length }] dans l'ordre joué (sans la levée).
   */
  function detectSections(measures, order) {
    let ord = order.slice();
    let pickup = false;
    if (ord.length && measures[ord[0]].implicit) { ord = ord.slice(1); pickup = true; }
    const N = ord.length;
    if (!N) return { parts: [], pickup };
    // repères de répétition (A, B…) écrits dans la partition
    if (measures.some((m) => m.rehearsal)) {
      const parts = [];
      let curLabel = null;
      let prevIdx = -1;
      ord.forEach((wi, k) => {
        let label = null;
        for (let j = wi; j >= 0; j--) if (measures[j].rehearsal) { label = measures[j].rehearsal; break; }
        label = (label || 'Intro').replace(/[^A-Za-z0-9']/g, '').toUpperCase() || 'A';
        const restart = wi <= prevIdx;
        if (label !== curLabel || restart || (measures[wi].rehearsal && k > 0)) {
          parts.push({ label, length: 1 });
          curLabel = label;
        } else parts[parts.length - 1].length++;
        prevIdx = wi;
      });
      return { parts, pickup };
    }
    const L = N >= 16 ? 8 : 4;
    const chunks = [];
    let cur = [];
    ord.forEach((wi, k) => {
      const prev = k > 0 ? ord[k - 1] : null;
      const jumped = prev != null && wi <= prev;
      const afterRepeat = prev != null && measures[prev].repeatEnd;
      const repStart = measures[wi].repeatStart && cur.length >= 2;
      if (cur.length && (cur.length >= L || jumped || afterRepeat || repStart)) { chunks.push(cur); cur = []; }
      cur.push(wi);
    });
    if (cur.length) chunks.push(cur);
    // fusionner un tout petit bout final avec le précédent
    if (chunks.length > 1 && chunks[chunks.length - 1].length <= 2) {
      const last = chunks.pop();
      chunks[chunks.length - 1] = chunks[chunks.length - 1].concat(last);
    }
    const labels = [];
    const reps = [];
    const letters = 'ABCDEFGH';
    chunks.forEach((c) => {
      let found = -1, best = 0;
      reps.forEach((r, i) => { const s = chunkSim(r, c, measures); if (s > best) { best = s; found = i; } });
      if (found >= 0 && best >= 0.55) labels.push(letters[found]);
      else { reps.push(c); labels.push(letters[Math.min(reps.length - 1, letters.length - 1)]); }
    });
    const parts = chunks.map((c, i) => ({ label: labels[i], length: c.length }));
    return { parts, pickup };
  }

  window.Harmonizer = { detectKey, harmonize, scoreChords, detectSections, colorize, tonicFromFifths, candidateSet, spellCandidate };
})();

/* Jeu : construire un accord sur le manche. */
(function () {
  'use strict';
  const { h } = App;
  const M = Music;
  const X = Chords.X;
  const TUNING = Chords.TUNING;
  const STRING_NAMES = ['Mi', 'La', 'Ré', 'Sol', 'Si', 'Mi'];
  const NF = 12;

  const LEVELS = [
    { name: 'Accords ouverts', desc: 'Les accords de base près du sillet : Do, Ré, Mi, Sol, La, Lam, Rém, Mim.',
      pool: [['C', 'maj'], ['D', 'maj'], ['E', 'maj'], ['G', 'maj'], ['A', 'maj'], ['A', 'min'], ['D', 'min'], ['E', 'min']] },
    { name: 'Majeurs et mineurs partout', desc: 'Toutes les toniques, majeur ou mineur. Pense aux formes barrées (forme de Mi, forme de La).', types: ['maj', 'min'] },
    { name: 'Septièmes', desc: 'Accords 7, maj7 et m7. La quinte peut être omise.', types: ['7', 'maj7', 'm7'] },
    { name: 'Expert', desc: 'Sus2, sus4, diminués, demi-diminués, sixtes… La quinte peut être omise sur les accords de 4 notes.', types: ['maj', 'min', '7', 'maj7', 'm7', 'sus2', 'sus4', 'm7b5', 'dim7', '6', 'm6'] }
  ];
  const COMMON_ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

  function render(el) {
    const st = Object.assign({ level: 0, rootBass: true, showNames: false, best: 0 }, App.store('chordGame', {}));
    const save = () => App.save('chordGame', st);
    let target = null;
    let frets = [X, X, X, X, X, X];
    let score = { ok: 0, total: 0, streak: 0 };
    let done = false;

    const top = h('div', { class: 'toolbar' });
    const desc = h('p', { class: 'level-desc' });
    const stats = h('div', { class: 'stats' });
    const prompt = h('div', { class: 'game-prompt' });
    const boardWrap = h('div', { class: 'fretboard-wrap' });
    const played = h('p', { class: 'hint' });
    const fb = h('div', { class: 'feedback info' });
    const btns = h('div', { class: 'btn-row' });
    [top, desc, stats, prompt, boardWrap, played, btns, fb].forEach((x) => el.appendChild(x));
    el.appendChild(h('div', { class: 'card', style: 'margin-top:1rem' }, [
      h('h3', { text: 'Comment jouer' }),
      h('ul', {}, [
        h('li', { text: 'Clique sur une case pour y poser un doigt (une seule note par corde). Clique à nouveau pour l’enlever.' }),
        h('li', { text: 'La zone à gauche du sillet joue la corde à vide (o). Une corde sans rien est étouffée (×).' }),
        h('li', { text: 'Il faut toutes les notes de l’accord, aucune note en trop, au moins 3 cordes, et un écart de 4 cases maximum entre les doigts.' }),
        h('li', { text: 'Bloqué ? « Indice » montre les notes de l’accord, « Solution » montre un doigté.' })
      ])
    ]));

    function drawTop() {
      top.innerHTML = '';
      top.appendChild(App.field('Niveau', App.select(LEVELS.map((l, i) => ({ value: i, label: (i + 1) + '. ' + l.name })), st.level, (v) => { st.level = +v; save(); score = { ok: 0, total: 0, streak: 0 }; next(); })));
      const cb = (key, label) => {
        const c = h('input', { type: 'checkbox' });
        c.checked = st[key];
        c.addEventListener('change', () => { st[key] = c.checked; save(); drawBoard(); });
        return h('label', { class: 'checkbox' }, [c, label]);
      };
      top.appendChild(cb('rootBass', 'La basse doit être la fondamentale'));
      top.appendChild(cb('showNames', 'Afficher le nom des notes'));
      desc.textContent = LEVELS[st.level].desc;
    }

    function drawStats() {
      stats.innerHTML = '';
      [['Score', score.ok + ' / ' + score.total], ['Série', score.streak], ['Record', st.best]].forEach(([l, v]) => stats.appendChild(h('div', { class: 'stat' }, [h('b', { text: String(v) }), h('span', { text: l })])));
    }

    function next() {
      const L = LEVELS[st.level];
      let t;
      do {
        if (L.pool) { const p = L.pool[Math.floor(Math.random() * L.pool.length)]; t = { root: M.parseNote(p[0]), type: p[1] }; }
        else t = { root: M.parseNote(COMMON_ROOTS[Math.floor(Math.random() * 12)]), type: L.types[Math.floor(Math.random() * L.types.length)] };
      } while (target && M.chordKey(t) === M.chordKey(target));
      target = t;
      frets = [X, X, X, X, X, X];
      done = false;
      drawTop();
      drawStats();
      prompt.innerHTML = '';
      prompt.appendChild(h('span', { class: 'muted', text: 'Construis : ' }));
      prompt.appendChild(h('b', { text: M.chordName(target) }));
      prompt.appendChild(h('span', { class: 'muted', text: ' (' + M.noteName(target.root) + ' ' + M.CHORD_TYPES[target.type].name + ')' }));
      fb.className = 'feedback info';
      fb.textContent = 'Pose tes doigts sur le manche, puis clique sur « Vérifier ».';
      drawBoard();
    }

    function drawBoard() {
      const fw = 58, sp = 30, left = 70, top0 = 22;
      const width = left + NF * fw + 16;
      const height = top0 + 5 * sp + 36;
      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svg.setAttribute('class', 'fretboard-svg game-board');
      const mk = (name, attrs, text, parent) => {
        const e = document.createElementNS(ns, name);
        for (const k in attrs) e.setAttribute(k, attrs[k]);
        if (text != null) e.textContent = text;
        (parent || svg).appendChild(e);
        return e;
      };
      const Y = (s) => top0 + (5 - s) * sp;
      const lineX = (f) => left + f * fw;
      const X0 = (f) => (f === 0 ? left - 22 : left + (f - 0.5) * fw);
      mk('rect', { x: left, y: Y(5) - 10, width: NF * fw, height: 5 * sp + 20, class: 'fb-wood', rx: 3 });
      [3, 5, 7, 9].forEach((f) => mk('circle', { cx: X0(f), cy: top0 + 2.5 * sp, r: 6, class: 'fb-inlay' }));
      mk('circle', { cx: X0(12), cy: top0 + 1.5 * sp, r: 6, class: 'fb-inlay' });
      mk('circle', { cx: X0(12), cy: top0 + 3.5 * sp, r: 6, class: 'fb-inlay' });
      for (let f = 0; f <= NF; f++) {
        mk('line', { x1: lineX(f), x2: lineX(f), y1: Y(5) - 10, y2: Y(0) + 10, class: f === 0 ? 'fb-nut' : 'fb-fret' });
        if (f > 0) mk('text', { x: X0(f), y: height - 6, class: 'fb-fretnum' }, String(f));
      }
      for (let s = 0; s < 6; s++) {
        mk('line', { x1: lineX(0), x2: lineX(NF), y1: Y(s), y2: Y(s), class: 'fb-string', 'stroke-width': 0.8 + (5 - s) * 0.35 });
        mk('text', { x: 12, y: Y(s) + 4, class: 'fb-fretnum', 'text-anchor': 'start' }, STRING_NAMES[s]);
        // zones cliquables
        for (let f = 0; f <= NF; f++) {
          const x = f === 0 ? left - 44 : lineX(f - 1);
          const r = mk('rect', { x, y: Y(s) - sp / 2, width: f === 0 ? 44 : fw, height: sp, fill: 'transparent', style: 'cursor:pointer' });
          r.addEventListener('click', () => {
            if (done) return;
            frets[s] = frets[s] === f ? X : f;
            const midi = TUNING[s] + f;
            if (frets[s] !== X) Audio2.guitar(midi, null, 1.2, 0.5);
            drawBoard();
          });
        }
        // marqueurs
        const f = frets[s];
        const isRootPc = (m) => M.mod(m - M.pcOf(target.root), 12) === 0;
        if (f === X) mk('text', { x: left - 22, y: Y(s) + 5, 'text-anchor': 'middle', class: 'game-mute' }, '×');
        else {
          const midi = TUNING[s] + f;
          const g = mk('g', { class: 'fb-dot', style: 'pointer-events:none' });
          const color = done && isRootPc(midi) ? 'var(--root)' : 'var(--guitar)';
          if (f === 0) mk('circle', { cx: X0(0), cy: Y(s), r: 10, fill: 'var(--surface)', stroke: color, 'stroke-width': 2.5 }, null, g);
          else mk('circle', { cx: X0(f), cy: Y(s), r: 11, fill: color }, null, g);
          if (st.showNames || done) {
            const nm = M.noteName(M.spellPc(midi, [3, 8, 10].indexOf(M.mod(midi, 12)) >= 0 && target.root.acc <= 0));
            mk('text', { x: X0(f), y: Y(s), style: 'fill:' + (f === 0 ? 'var(--text)' : '#fff') }, nm, g);
          }
        }
      }
      boardWrap.innerHTML = '';
      boardWrap.appendChild(svg);
      const midis = frets.map((f, i) => (f === X ? null : TUNING[i] + f)).filter((m) => m != null);
      played.textContent = midis.length ? 'Cases : ' + ChordDict.fretsText(frets) + (st.showNames ? '  ·  notes : ' + midis.map((m) => M.noteName(M.spellPc(m, false))).join(' ') : '') : 'Aucune corde jouée pour l’instant.';
    }

    function check() {
      if (done) { next(); return; }
      const chordPcs = M.chordPcs(target);
      const ivs = M.CHORD_TYPES[target.type].ivs;
      const fifthPc = ivs.indexOf('5') >= 0 && ivs.length >= 4 ? M.pcOf(M.transpose(target.root, '5')) : null;
      const midis = frets.map((f, i) => (f === X ? null : TUNING[i] + f)).filter((m) => m != null);
      const pcs = new Set(midis.map((m) => M.mod(m, 12)));
      const problems = [];
      if (midis.length < 3) problems.push('joue au moins 3 cordes');
      const missing = chordPcs.filter((pc) => !pcs.has(pc) && pc !== fifthPc);
      const extra = [...pcs].filter((pc) => chordPcs.indexOf(pc) < 0);
      const name = (pc) => M.noteName(M.chordNotes(target).find((n) => M.pcOf(n) === pc) || M.spellPc(pc, false));
      if (missing.length) problems.push('il manque ' + missing.map(name).join(', '));
      if (extra.length) problems.push('note(s) en trop : ' + extra.map((pc) => M.noteName(M.spellPc(pc, target.root.acc < 0))).join(', '));
      const fretted = frets.filter((f) => f > 0);
      if (fretted.length && Math.max(...fretted) - Math.min(...fretted) > 4) problems.push('les doigts sont trop écartés (plus de 4 cases)');
      if (st.rootBass && midis.length && M.mod(Math.min(...midis), 12) !== M.pcOf(target.root)) problems.push('la note la plus grave doit être ' + M.noteName(target.root));
      score.total++;
      if (!problems.length) {
        score.ok++;
        score.streak++;
        if (score.streak > st.best) { st.best = score.streak; save(); }
        done = true;
        fb.className = 'feedback good';
        fb.textContent = '✔ Bravo, c’est bien un ' + M.chordName(target) + ' ! (fondamentales en orange)';
        strumCurrent();
      } else {
        score.streak = 0;
        fb.className = 'feedback bad';
        fb.textContent = '✘ Pas encore : ' + problems.join(' ; ') + '.';
      }
      drawStats();
      drawBoard();
      checkBtn.textContent = done ? 'Accord suivant →' : 'Vérifier';
    }

    function strumCurrent() {
      const t = Audio2.now() + 0.05;
      frets.forEach((f, i) => { if (f !== X) Audio2.guitar(TUNING[i] + f, t + i * 0.03, 2, 0.5); });
    }

    const checkBtn = h('button', { class: 'btn primary', text: 'Vérifier' });
    checkBtn.addEventListener('click', check);
    const listen = h('button', { class: 'btn', text: '▶ Écouter mon accord' });
    listen.addEventListener('click', strumCurrent);
    const clear = h('button', { class: 'btn', text: 'Effacer' });
    clear.addEventListener('click', () => { if (!done) { frets = [X, X, X, X, X, X]; drawBoard(); } });
    const hint = h('button', { class: 'btn', text: '💡 Indice' });
    hint.addEventListener('click', () => {
      fb.className = 'feedback info';
      fb.textContent = 'Notes de ' + M.chordName(target) + ' : ' + M.chordNotes(target).map((n) => M.noteName(n)).join(' – ') + ' (' + M.CHORD_TYPES[target.type].ivs.map(M.intervalLabel).join(' ') + ')';
    });
    const sol = h('button', { class: 'btn', text: '👀 Solution' });
    sol.addEventListener('click', () => {
      const v = Chords.voicing(target);
      frets = v.frets.slice();
      if (!done) { score.total++; score.streak = 0; }
      done = true;
      fb.className = 'feedback info';
      fb.textContent = 'Un doigté possible pour ' + M.chordName(target) + ' : ' + ChordDict.fretsText(frets) + '. Il en existe d’autres ailleurs sur le manche !';
      checkBtn.textContent = 'Accord suivant →';
      drawStats();
      drawBoard();
      strumCurrent();
    });
    [checkBtn, listen, clear, hint, sol].forEach((b) => btns.appendChild(b));

    const origNext = next;
    next = function () { checkBtn.textContent = 'Vérifier'; origNext(); };
    next();
  }

  App.register('/guitare/jeu-accords', {
    title: 'Jeu : construis l’accord',
    subtitle: 'Un nom d’accord s’affiche : pose les doigts sur le manche pour le jouer. Le jeu vérifie les notes, pas un doigté précis : toutes les bonnes solutions comptent.',
    render
  });
})();

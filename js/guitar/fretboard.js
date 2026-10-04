/* Les gammes sur le manche de guitare. */
(function () {
  'use strict';
  const { h } = App;
  const M = Music;
  const TUNING = Chords.TUNING;
  const STRING_NAMES = ['Mi', 'La', 'Ré', 'Sol', 'Si', 'Mi'];

  /** Calcule les positions (boîtes) d'une gamme. Retourne [{ name, notes: Set("s:f") }] */
  function positions(rootPc, scale) {
    const ivSemis = scale.intervals.map((iv) => M.mod(M.parseInterval(iv).semis, 12));
    const n = ivSemis.length;
    const pcs = new Set(ivSemis.map((s) => M.mod(rootPc + s, 12)));
    const out = [];
    for (let i = 0; i < n; i++) {
      const degPc = M.mod(rootPc + ivSemis[i], 12);
      let f0 = M.mod(degPc - TUNING[0], 12);
      let set = null;
      let lo = 99, hi = -1;
      if (n === 5 || n === 7) {
        const nps = n === 5 ? 2 : 3;
        for (let attempt = 0; attempt < 2 && !set; attempt++) {
          const start = TUNING[0] + f0;
          const seq = [];
          for (let m = start; seq.length < nps * 6; m++) if (pcs.has(M.mod(m, 12))) seq.push(m);
          const cand = new Set();
          let ok = true;
          lo = 99; hi = -1;
          for (let s = 0; s < 6; s++) {
            for (let k = 0; k < nps; k++) {
              const f = seq[s * nps + k] - TUNING[s];
              if (f < 0) ok = false;
              cand.add(s + ':' + f);
              lo = Math.min(lo, f); hi = Math.max(hi, f);
            }
          }
          if (ok) set = cand; else f0 += 12;
        }
      } else {
        set = new Set();
        let a = f0 - 1;
        if (a < 0) { a += 12; f0 += 12; }
        for (let s = 0; s < 6; s++) {
          for (let f = a; f <= f0 + 3; f++) {
            if (pcs.has(M.mod(TUNING[s] + f, 12))) { set.add(s + ':' + f); lo = Math.min(lo, f); hi = Math.max(hi, f); }
          }
        }
      }
      out.push({ name: 'Position ' + (i + 1), lo, hi, notes: set, startDegree: i });
    }
    out.sort((a, b) => a.lo - b.lo);
    // la position 1 commence sur la fondamentale (6e corde), comme dans les méthodes
    const r0 = out.findIndex((p) => p.startDegree === 0);
    out.push(...out.splice(0, r0));
    out.forEach((p, i) => { p.name = 'Position ' + (i + 1) + ' (cases ' + p.lo + '–' + p.hi + ')'; });
    return out;
  }

  function render(el) {
    const sel = Object.assign({ scale: 'pentatonic-minor', root: 'A', position: 'all', label: 'notes', highlight: 'root', frets: 15, rootsOnly: false, fade: true, lefty: false }, App.store('fretSel', {}));
    const save = () => App.save('fretSel', sel);

    const scaleOpts = M.SCALES.map((s) => ({ value: s.id, label: s.name }));
    const controls = h('div', { class: 'toolbar' });
    const info = h('div', { class: 'notice' });
    const board = h('div', { class: 'fretboard-wrap' });
    const legend = h('div', { class: 'legend' });
    const posBtns = h('div', { class: 'btn-row' });
    el.appendChild(controls);
    el.appendChild(info);
    el.appendChild(posBtns);
    el.appendChild(board);
    el.appendChild(legend);
    const tips = h('div', { class: 'card', style: 'margin-top:1rem' });
    el.appendChild(tips);

    function build() {
      controls.innerHTML = '';
      controls.appendChild(App.field('Tonique', App.select(M.ROOTS.map((r) => ({ value: r, label: M.noteName(M.parseNote(r)) })), sel.root, (v) => { sel.root = v; sel.position = 'all'; save(); draw(); })));
      controls.appendChild(App.field('Gamme', App.select(scaleOpts, sel.scale, (v) => { sel.scale = v; sel.position = 'all'; save(); draw(); })));
      controls.appendChild(App.field('Afficher', App.select([
        { value: 'notes', label: 'Nom des notes' }, { value: 'intervals', label: 'Intervalles (1, ♭3, 5…)' }, { value: 'degrees', label: 'Degrés (1 à 7)' }, { value: 'none', label: 'Rien (points)' }
      ], sel.label, (v) => { sel.label = v; save(); draw(); })));
      controls.appendChild(App.field('Couleurs', App.select([
        { value: 'root', label: 'Fondamentales en évidence' }, { value: 'triad', label: 'Fondamentale + tierce + quinte' }
      ], sel.highlight, (v) => { sel.highlight = v; save(); draw(); })));
      controls.appendChild(App.field('Cases', App.select([{ value: 12, label: '12' }, { value: 15, label: '15' }, { value: 22, label: '22' }], sel.frets, (v) => { sel.frets = +v; save(); draw(); })));
      const cb = (key, label) => {
        const c = h('input', { type: 'checkbox' });
        c.checked = sel[key];
        c.addEventListener('change', () => { sel[key] = c.checked; save(); draw(); });
        return h('label', { class: 'checkbox' }, [c, label]);
      };
      controls.appendChild(cb('rootsOnly', 'Seulement les fondamentales'));
      controls.appendChild(cb('fade', 'Reste du manche en transparence'));
      controls.appendChild(cb('lefty', 'Gaucher'));
    }

    function draw() {
      const scale = M.scaleById(sel.scale) || M.SCALES[0];
      const root = M.parseNote(sel.root);
      const rootPc = M.pcOf(root);
      const notes = M.scaleNotes(root, scale);
      const byPc = {};
      notes.forEach((n, i) => { byPc[M.pcOf(n)] = { note: n, iv: scale.intervals[i], deg: i + 1 }; });
      const pos = positions(rootPc, scale);
      if (sel.position !== 'all' && !pos[+sel.position]) sel.position = 'all';

      info.innerHTML = '';
      info.appendChild(h('b', { text: M.noteName(root) + ' ' + scale.name.toLowerCase() + ' : ' }));
      info.appendChild(document.createTextNode(notes.map((n) => M.noteName(n)).join(' – ') + '  ·  formule ' + scale.intervals.map(M.intervalLabel).join(' ')));
      const more = h('a', { href: '#/theorie/gammes', text: ' · explication de la gamme →' });
      more.addEventListener('click', () => App.save('scaleSel', { id: scale.id, root: sel.root }));
      info.appendChild(more);

      posBtns.innerHTML = '';
      const mk = (value, label) => {
        const b = h('button', { class: 'btn small' + (String(sel.position) === String(value) ? ' primary' : ''), text: label });
        b.addEventListener('click', () => { sel.position = value; save(); draw(); });
        posBtns.appendChild(b);
      };
      mk('all', 'Tout le manche');
      pos.forEach((p, i) => mk(i, p.name));
      const playBtn = h('button', { class: 'btn small', text: '▶ Jouer' });
      posBtns.appendChild(playBtn);

      // Dessin
      const nF = sel.position === 'all' ? sel.frets : Math.max(sel.frets, pos[+sel.position].hi + 1);
      const fw = 52, sp = 26, left = 66, top = 22;
      const width = left + nF * fw + 20;
      const height = top + 5 * sp + 40;
      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svg.setAttribute('class', 'fretboard-svg');
      svg.style.minWidth = Math.max(600, nF * 46) + 'px';
      const mkEl = (name, attrs, text) => {
        const e = document.createElementNS(ns, name);
        for (const k in attrs) e.setAttribute(k, attrs[k]);
        if (text != null) e.textContent = text;
        svg.appendChild(e);
        return e;
      };
      const X = (f) => {
        const x = f === 0 ? left - 18 : left + (f - 0.5) * fw;
        return sel.lefty ? width - x : x;
      };
      const Y = (s) => top + (5 - s) * sp;
      const lineX = (f) => (sel.lefty ? width - (left + f * fw) : left + f * fw);
      mkEl('rect', { x: Math.min(lineX(0), lineX(nF)), y: Y(5) - 8, width: nF * fw, height: 5 * sp + 16, class: 'fb-wood', rx: 3 });
      [3, 5, 7, 9, 15, 17, 19, 21].filter((f) => f <= nF).forEach((f) => mkEl('circle', { cx: X(f), cy: top + 2.5 * sp, r: 6, class: 'fb-inlay' }));
      [12].filter((f) => f <= nF).forEach((f) => { mkEl('circle', { cx: X(f), cy: top + 1.5 * sp, r: 6, class: 'fb-inlay' }); mkEl('circle', { cx: X(f), cy: top + 3.5 * sp, r: 6, class: 'fb-inlay' }); });
      for (let f = 0; f <= nF; f++) {
        mkEl('line', { x1: lineX(f), x2: lineX(f), y1: Y(5) - 8, y2: Y(0) + 8, class: f === 0 ? 'fb-nut' : 'fb-fret' });
        if (f > 0) mkEl('text', { x: X(f), y: height - 8, class: 'fb-fretnum' }, String(f));
      }
      for (let s = 0; s < 6; s++) {
        mkEl('line', { x1: lineX(0), x2: lineX(nF), y1: Y(s), y2: Y(s), class: 'fb-string', 'stroke-width': 0.8 + (5 - s) * 0.35 });
        mkEl('text', { x: sel.lefty ? width - 8 : 8, y: Y(s) + 4, class: 'fb-fretnum', 'text-anchor': sel.lefty ? 'end' : 'start' }, STRING_NAMES[s]);
      }

      const active = sel.position === 'all' ? null : pos[+sel.position].notes;
      const toPlay = [];
      for (let s = 0; s < 6; s++) {
        for (let f = 0; f <= nF; f++) {
          const midi = TUNING[s] + f;
          const info2 = byPc[M.mod(midi, 12)];
          if (!info2) continue;
          const isRoot = info2.deg === 1;
          if (sel.rootsOnly && !isRoot) continue;
          const inPos = !active || active.has(s + ':' + f);
          if (!inPos && !sel.fade) continue;
          let color = 'var(--note)';
          if (isRoot) color = 'var(--root)';
          else if (sel.highlight === 'triad' && /^b?3$/.test(info2.iv)) color = 'var(--third)';
          else if (sel.highlight === 'triad' && info2.iv === '5') color = 'var(--fifth)';
          const g = document.createElementNS(ns, 'g');
          g.setAttribute('class', 'fb-dot' + (inPos ? '' : ' faded'));
          const c = document.createElementNS(ns, 'circle');
          c.setAttribute('cx', X(f)); c.setAttribute('cy', Y(s)); c.setAttribute('r', isRoot ? 11.5 : 10);
          c.setAttribute('fill', color);
          g.appendChild(c);
          if (isRoot) {
            const ring = document.createElementNS(ns, 'circle');
            ring.setAttribute('cx', X(f)); ring.setAttribute('cy', Y(s)); ring.setAttribute('r', 14);
            ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', 'var(--root)'); ring.setAttribute('stroke-width', '1.5');
            g.appendChild(ring);
          }
          const label = sel.label === 'notes' ? M.noteName(info2.note) : sel.label === 'intervals' ? M.intervalLabel(info2.iv) : sel.label === 'degrees' ? String(info2.deg) : '';
          if (label) {
            const t = document.createElementNS(ns, 'text');
            t.setAttribute('x', X(f)); t.setAttribute('y', Y(s));
            if (label.length > 2) t.setAttribute('font-size', '8.5');
            t.textContent = label;
            g.appendChild(t);
          }
          g.addEventListener('click', () => Audio2.play(midi, { instrument: 'guitar' }));
          svg.appendChild(g);
          if (inPos) toPlay.push(midi);
        }
      }
      board.innerHTML = '';
      board.appendChild(svg);

      playBtn.addEventListener('click', () => {
        let seq = [...new Set(toPlay)].sort((a, b) => a - b);
        if (!active) {
          // tout le manche : une octave et demie depuis la fondamentale la plus grave
          const first = seq.find((m) => M.mod(m, 12) === rootPc);
          seq = seq.filter((m) => m >= first && m <= first + 12);
        }
        Audio2.playSequence(seq.concat(seq.slice(0, -1).reverse()), { gap: 0.22, dur: 0.5, instrument: 'guitar' });
      });

      legend.innerHTML = '';
      legend.appendChild(h('span', {}, [h('i', { style: 'background:var(--root)' }), 'Fondamentale (' + M.noteName(root) + ')']));
      if (sel.highlight === 'triad') {
        legend.appendChild(h('span', {}, [h('i', { style: 'background:var(--third)' }), 'Tierce']));
        legend.appendChild(h('span', {}, [h('i', { style: 'background:var(--fifth)' }), 'Quinte']));
      }
      legend.appendChild(h('span', {}, [h('i', { style: 'background:var(--note)' }), 'Autres notes de la gamme']));
      legend.appendChild(h('span', { text: 'Clique sur une note pour l’entendre.' }));

      tips.innerHTML = '';
      tips.appendChild(h('h3', { text: 'Repérer les fondamentales' }));
      const ul = h('ul');
      [
        'Sur les cordes de Mi grave et de La, c’est là qu’on cherche la fondamentale en premier : la position commence souvent sur celle de la 6e corde.',
        'Forme d’octave : depuis une fondamentale sur la 6e ou la 5e corde, la même note est 2 cordes plus haut et 2 cases plus loin.',
        'Depuis la 4e ou la 3e corde : 2 cordes plus haut et 3 cases plus loin (à cause de l’accordage de la corde de Si).',
        'Les deux cordes de Mi (6e et 1re) ont toujours les mêmes notes aux mêmes cases.',
        'Coche « Seulement les fondamentales » pour t’entraîner à les trouver de mémoire, puis ajoute les autres notes.'
      ].forEach((t) => ul.appendChild(h('li', { text: t })));
      tips.appendChild(ul);
      if (scale.intervals.length === 7) tips.appendChild(h('p', { class: 'hint', text: 'Positions à 3 notes par corde : elles se chevauchent et couvrent tout le manche ; chaque position commence sur une note différente de la gamme.' }));
      if (scale.intervals.length === 5) tips.appendChild(h('p', { class: 'hint', text: 'Les 5 « boîtes » pentatoniques (2 notes par corde) s’enchaînent : la fin d’une boîte est le début de la suivante.' }));
    }

    build();
    draw();
  }

  App.register('/guitare/manche', {
    title: 'Gammes sur le manche',
    subtitle: 'Choisis une tonique et une gamme : les fondamentales sont entourées en orange. Affiche tout le manche ou une position à la fois.',
    render
  });

  window.Fretboard = { positions };
})();

/* Rythme : croches, doubles croches, notes pointées, syncopes. Explications + exercices. */
(function () {
  'use strict';
  const { h } = App;

  /*
   * Cellules rythmiques (unité = double croche, 4 par temps).
   * ev : [durée, silence?] ; beats : nombre de temps occupés ; beam : notes ligaturées.
   */
  const CELLS = {
    q: { beats: 1, ev: [[4]], name: 'noire', count: '1' },
    Q: { beats: 1, ev: [[4, 1]], name: 'soupir (silence d’un temps)', count: '(1)' },
    h: { beats: 2, ev: [[8]], name: 'blanche', count: '1 – 2' },
    ee: { beats: 1, ev: [[2], [2]], beam: true, name: '2 croches', count: '1 et' },
    re: { beats: 1, ev: [[2, 1], [2]], name: 'demi-soupir + croche (contretemps)', count: '(1) et' },
    ssss: { beats: 1, ev: [[1], [1], [1], [1]], beam: true, name: '4 doubles croches', count: '1 i et a' },
    ess: { beats: 1, ev: [[2], [1], [1]], beam: true, name: 'croche + 2 doubles', count: '1 et a' },
    sse: { beats: 1, ev: [[1], [1], [2]], beam: true, name: '2 doubles + croche', count: '1 i et' },
    ses: { beats: 1, ev: [[1], [2], [1]], beam: true, name: 'double – croche – double (syncope)', count: '1 i (et) a' },
    eds: { beats: 1, ev: [[3], [1]], beam: true, name: 'croche pointée + double', count: '1 (i et) a' },
    sed: { beats: 1, ev: [[1], [3]], beam: true, name: 'double + croche pointée', count: '1 i' },
    eqe: { beats: 2, ev: [[2], [4], [2]], name: 'croche – noire – croche (syncope)', count: '1 et (2) et' },
    qd: { beats: 2, ev: [[6], [2]], name: 'noire pointée + croche', count: '1 (et 2) et' }
  };

  const LEVELS = [
    { name: 'Noires et croches', cells: ['q', 'q', 'ee', 'ee', 'Q', 'h'], desc: 'Noire = 1 temps, croche = ½ temps. Compte « 1 et 2 et 3 et 4 et ».' },
    { name: 'Doubles croches', cells: ['q', 'ee', 'ssss', 'ess', 'sse', 'Q'], desc: 'Double croche = ¼ de temps. Compte « 1 i et a ».' },
    { name: 'Pointées et contretemps', cells: ['q', 'ee', 'eds', 'qd', 're', 'ess', 'sse'], desc: 'Le point ajoute la moitié de la valeur. Le contretemps tombe sur le « et ».' },
    { name: 'Syncopes', cells: ['q', 'ee', 'eqe', 'ses', 're', 'eds', 'qd', 'ssss'], desc: 'Une syncope : une note attaquée sur un temps faible (ou un « et ») et tenue par-dessus le temps suivant.' }
  ];

  /** Mesure de 4 temps = suite de cellules. */
  function randomBar(level) {
    const L = LEVELS[level];
    const out = [];
    let beats = 0;
    while (beats < 4) {
      const c = L.cells[Math.floor(Math.random() * L.cells.length)];
      if (beats + CELLS[c].beats > 4) continue;
      out.push(c);
      beats += CELLS[c].beats;
    }
    // au moins une note sur le premier temps pour que ce soit lisible
    if (CELLS[out[0]].ev[0][1]) out[0] = 'q';
    return out;
  }

  function events(bar) {
    const ev = [];
    let pos = 0;
    bar.forEach((c, ci) => {
      CELLS[c].ev.forEach(([dur, rest]) => {
        ev.push({ start: pos, dur, rest: !!rest, cell: ci });
        pos += dur;
      });
    });
    return ev;
  }

  /* ------------------------------------------------------------------ */
  /* Dessin (portée à une ligne)                                         */
  /* ------------------------------------------------------------------ */
  function drawBar(bar, opts) {
    opts = opts || {};
    const beatW = opts.beatW || 80;
    const nBeats = bar.reduce((a, c) => a + CELLS[c].beats, 0);
    const left = 22, lineY = 52, stemH = 34;
    const width = left + nBeats * beatW + 16;
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} 92`);
    svg.setAttribute('class', 'rhythm-svg');
    const mk = (n, a, t) => { const e = document.createElementNS(ns, n); for (const k in a) e.setAttribute(k, a[k]); if (t != null) e.textContent = t; svg.appendChild(e); return e; };
    mk('line', { x1: 6, x2: width - 6, y1: lineY, y2: lineY, class: 'rh-line' });
    if (opts.barlines !== false) {
      mk('line', { x1: 6, x2: 6, y1: lineY - 14, y2: lineY + 14, class: 'rh-line' });
      mk('line', { x1: width - 6, x2: width - 6, y1: lineY - 14, y2: lineY + 14, class: 'rh-line' });
    }
    const ev = events(bar);
    const xOf = (pos) => left + (pos / 4) * beatW + 8;
    // repères de temps
    if (opts.counts !== false) for (let b = 0; b < nBeats; b++) mk('text', { x: xOf(b * 4), y: 86, class: 'rh-count' }, String(b + 1));
    const groups = {};
    ev.forEach((e, i) => {
      e.x = xOf(e.start);
      e.cls = opts.marks && opts.marks[i] ? ' ' + opts.marks[i] : '';
      if (e.rest) {
        const glyph = e.dur >= 4 ? '\u{1D13D}' : e.dur >= 2 ? '\u{1D13E}' : '\u{1D13F}';
        mk('text', { x: e.x - 4, y: lineY + (e.dur >= 4 ? 10 : 8), class: 'rh-rest' + e.cls, 'font-size': 30 }, glyph);
        return;
      }
      const hollow = e.dur >= 8;
      mk('ellipse', { cx: e.x, cy: lineY, rx: 7, ry: 5.2, transform: `rotate(-20 ${e.x} ${lineY})`, class: 'rh-head' + (hollow ? ' hollow' : '') + e.cls });
      if (e.dur === 3 || e.dur === 6) mk('circle', { cx: e.x + 11, cy: lineY - 3, r: 1.8, class: 'rh-dot' + e.cls });
      if (e.dur < 16) mk('line', { x1: e.x + 6.4, x2: e.x + 6.4, y1: lineY - 2, y2: lineY - stemH, class: 'rh-stem' + e.cls });
      const cell = CELLS[bar[e.cell]];
      if (e.dur < 4 && cell.beam) (groups[e.cell] = groups[e.cell] || []).push(e);
      else if (e.dur < 4) {
        // croche isolée : crochet
        const sx = e.x + 6.4, sy = lineY - stemH;
        mk('path', { d: `M ${sx} ${sy} q 2 8 9 12 q -3 -4 -9 -7`, class: 'rh-flag' + e.cls });
        if (e.dur === 1) mk('path', { d: `M ${sx} ${sy + 6} q 2 8 9 12 q -3 -4 -9 -7`, class: 'rh-flag' + e.cls });
      }
    });
    Object.values(groups).forEach((g) => {
      if (g.length < 2) return;
      const y1 = lineY - stemH;
      mk('rect', { x: g[0].x + 5.6, y: y1, width: g[g.length - 1].x - g[0].x + 1.6, height: 4.5, class: 'rh-beam' });
      // deuxième barre pour les doubles croches
      g.forEach((e, i) => {
        if (e.dur !== 1) return;
        const next = g[i + 1], prev = g[i - 1];
        if (next && next.dur === 1) mk('rect', { x: e.x + 5.6, y: y1 + 7, width: next.x - e.x + 1.6, height: 4.5, class: 'rh-beam' });
        else if (!(prev && prev.dur === 1)) {
          // double isolée dans le groupe : demi-barre vers la voisine
          const dir = next ? 1 : -1;
          mk('rect', { x: dir > 0 ? e.x + 5.6 : e.x - 4.4, y: y1 + 7, width: 11, height: 4.5, class: 'rh-beam' });
        }
      });
    });
    return svg;
  }

  /* ------------------------------------------------------------------ */
  /* Son                                                                 */
  /* ------------------------------------------------------------------ */
  /* Repère visuel des temps : « 1 2 3 4 » du décompte puis les temps de la mesure. */
  let lights = null;
  function makeLights() {
    const box = h('div', { class: 'beat-lights' });
    const label = h('span', { class: 'beat-label' });
    const dots = [0, 1, 2, 3].map((i) => h('span', { class: 'beat-dot', text: String(i + 1) }));
    box.appendChild(label);
    dots.forEach((d) => box.appendChild(d));
    let timers = [];
    const api = {
      el: box,
      clear() { timers.forEach(clearTimeout); timers = []; dots.forEach((d) => d.classList.remove('on', 'count')); label.textContent = ''; },
      run(t0, beat, countIn, nBeats) {
        api.clear();
        const at = (t, fn) => timers.push(setTimeout(fn, Math.max(0, (t - Audio2.now()) * 1000)));
        for (let b = 0; b < countIn + nBeats; b++) {
          const isCount = b < countIn;
          const i = (isCount ? b : b - countIn) % 4;
          at(t0 + b * beat, () => {
            label.textContent = isCount ? 'Décompte' : 'Mesure';
            dots.forEach((d, j) => { d.classList.toggle('on', j === i); d.classList.toggle('count', isCount); });
          });
        }
        at(t0 + (countIn + nBeats) * beat, () => api.clear());
      }
    };
    lights = api;
    return box;
  }

  function playBar(bar, tempo, opts) {
    opts = opts || {};
    const beat = 60 / tempo;
    const six = beat / 4;
    const countIn = opts.countIn ? 4 : 0;
    const t0 = Audio2.now() + 0.15;
    for (let b = 0; b < countIn; b++) Audio2.click(t0 + b * beat, b === 0);
    const start = t0 + countIn * beat;
    const nBeats = Math.max(4, bar.reduce((a, c) => a + CELLS[c].beats, 0));
    if (opts.metronome) for (let b = 0; b < nBeats; b++) Audio2.click(start + b * beat, b === 0);
    if (lights && !opts.noLights) lights.run(t0, beat, countIn, opts.metronome || opts.showBeats ? nBeats : 0);
    events(bar).forEach((e) => { if (!e.rest) Audio2.piano(76, start + e.start * six, Math.max(0.15, e.dur * six * 0.9), 0.6); });
    return { start, six, end: start + nBeats * beat };
  }

  /* ------------------------------------------------------------------ */
  /* Page                                                                */
  /* ------------------------------------------------------------------ */
  function render(el) {
    const st = Object.assign({ level: 0, tempo: 70, mode: 'listen', best: 0 }, App.store('rhythmEx', {}));
    const save = () => App.save('rhythmEx', st);
    let cleanup = [];

    const ex = h('div', { class: 'card' });
    el.appendChild(ex);

    function drawEx() {
      cleanup.forEach((f) => f());
      cleanup = [];
      ex.innerHTML = '';
      ex.appendChild(h('h2', { style: 'margin-top:0', text: '🥁 Exercices' }));
      const seg = h('div', { class: 'segmented' });
      [['listen', '👂 Reconnais le rythme'], ['tap', '👆 Tape le rythme']].forEach(([id, l]) => {
        const b = h('button', { class: st.mode === id ? 'on' : '', text: l });
        b.addEventListener('click', () => { st.mode = id; save(); drawEx(); });
        seg.appendChild(b);
      });
      const tempo = h('input', { type: 'number', min: 40, max: 160, value: st.tempo });
      tempo.addEventListener('change', () => { st.tempo = Math.min(160, Math.max(40, parseInt(tempo.value, 10) || 70)); save(); });
      ex.appendChild(h('div', { class: 'toolbar' }, [
        App.field('Exercice', seg),
        App.field('Niveau', App.select(LEVELS.map((l, i) => ({ value: i, label: (i + 1) + '. ' + l.name })), st.level, (v) => { st.level = +v; save(); drawEx(); })),
        App.field('Tempo (noires / min)', tempo)
      ]));
      ex.appendChild(h('p', { class: 'level-desc', text: LEVELS[st.level].desc }));
      ex.appendChild(h('p', { class: 'hint', text: '🔈 Pas de son ? Monte le volume, et sur iPhone désactive le mode silencieux (le petit bouton sur le côté) : il coupe le son des sites web.' }));
      const area = h('div');
      ex.appendChild(area);
      if (st.mode === 'listen') listenEx(area); else tapEx(area);
    }

    /* --- Reconnaître à l'oreille --- */
    function listenEx(area) {
      let score = { ok: 0, total: 0, streak: 0 };
      let target, options, answered;
      const stats = h('div', { class: 'stats' });
      const metro = h('input', { type: 'checkbox' });
      metro.checked = true;
      const btns = h('div', { class: 'btn-row' });
      const grid = h('div', { class: 'rhythm-options' });
      const fb = h('div', { class: 'feedback info' });
      [stats, btns, makeLights(), grid, fb].forEach((x) => area.appendChild(x));
      const play = h('button', { class: 'btn primary', text: '▶ Écouter' });
      play.addEventListener('click', () => playBar(target, st.tempo, { countIn: true, metronome: metro.checked }));
      const next = h('button', { class: 'btn', text: 'Suivant →' });
      next.addEventListener('click', newQ);
      btns.appendChild(play);
      btns.appendChild(next);
      btns.appendChild(h('label', { class: 'checkbox' }, [metro, 'Métronome pendant la mesure']));

      function drawStats() {
        stats.innerHTML = '';
        [['Score', score.ok + ' / ' + score.total], ['Série', score.streak], ['Record', st.best]].forEach(([l, v]) => stats.appendChild(h('div', { class: 'stat' }, [h('b', { text: String(v) }), h('span', { text: l })])));
      }
      function newQ() {
        answered = false;
        target = randomBar(st.level);
        const key = (b) => b.join(',');
        options = [target];
        let guard = 0;
        while (options.length < 4 && guard++ < 200) {
          const o = randomBar(st.level);
          if (!options.some((x) => key(x) === key(o))) options.push(o);
        }
        options.sort(() => Math.random() - 0.5);
        grid.innerHTML = '';
        options.forEach((o, i) => {
          const b = h('button', { class: 'rhythm-option' }, [h('span', { class: 'opt-letter', text: 'ABCD'[i] }), drawBar(o, { beatW: 64, counts: false })]);
          b.addEventListener('click', () => {
            if (answered) { playBar(o, st.tempo, { metronome: metro.checked }); return; }
            answered = true;
            score.total++;
            const ok = key(o) === key(target);
            if (ok) { score.ok++; score.streak++; if (score.streak > st.best) { st.best = score.streak; save(); } } else score.streak = 0;
            [...grid.children].forEach((c, j) => { if (key(options[j]) === key(target)) c.classList.add('correct'); else if (c === b) c.classList.add('wrong'); });
            fb.className = 'feedback ' + (ok ? 'good' : 'bad');
            fb.textContent = ok ? '✔ Bravo ! Clique sur un rythme pour l’écouter, ou « Suivant ».' : '✘ C’était le rythme en vert. Clique sur les rythmes pour comparer.';
            drawStats();
          });
          grid.appendChild(b);
        });
        fb.className = 'feedback info';
        fb.textContent = 'Écoute (4 clics de décompte, puis le rythme) et choisis le bon.';
        drawStats();
        playBar(target, st.tempo, { countIn: true, metronome: metro.checked });
      }
      drawStats();
      fb.textContent = 'Appuie sur « Suivant » pour commencer.';
      next.textContent = 'Commencer →';
      next.addEventListener('click', () => { next.textContent = 'Suivant →'; }, { once: true });
    }

    /* --- Taper le rythme --- */
    function tapEx(area) {
      let bar = randomBar(st.level);
      let taps = [];
      let run = null;
      const view = h('div', { class: 'rhythm-big' });
      const fb = h('div', { class: 'feedback info', text: 'Lis le rythme, puis « Go » : 4 clics de décompte, et tape chaque note (barre espace, touche, ou gros bouton).' });
      const tapBtn = h('button', { class: 'tap-pad', text: 'TAPE' });
      const go = h('button', { class: 'btn primary', text: '▶ Go' });
      const listen = h('button', { class: 'btn', text: '👂 Écouter le modèle' });
      const next = h('button', { class: 'btn', text: 'Nouveau rythme →' });
      const metroCb = h('input', { type: 'checkbox' });
      metroCb.checked = true;
      area.appendChild(view);
      area.appendChild(makeLights());
      area.appendChild(h('div', { class: 'btn-row' }, [go, listen, next, h('label', { class: 'checkbox' }, [metroCb, 'Métronome pendant la mesure'])]));
      area.appendChild(tapBtn);
      area.appendChild(fb);
      const draw = (marks) => { view.innerHTML = ''; view.appendChild(drawBar(bar, { beatW: 110, marks })); };
      draw();

      function tap(e) {
        if (e) e.preventDefault();
        tapBtn.classList.add('hit');
        setTimeout(() => tapBtn.classList.remove('hit'), 90);
        if (run) taps.push(Audio2.now());
      }
      function onKey(e) {
        if (e.repeat || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
        if (e.code === 'Space' || (e.key && e.key.length === 1)) tap(e);
      }
      tapBtn.addEventListener('pointerdown', tap);
      document.addEventListener('keydown', onKey);
      cleanup.push(() => document.removeEventListener('keydown', onKey));

      go.addEventListener('click', () => {
        taps = [];
        const info = playBar([], st.tempo, { countIn: true, showBeats: true });
        // on joue seulement le décompte + métronome, l'élève tape
        const beat = 60 / st.tempo;
        const start = info.start;
        if (metroCb.checked) for (let b = 0; b < 4; b++) Audio2.click(start + b * beat, b === 0);
        run = { start, six: beat / 4, end: start + 4 * beat };
        fb.className = 'feedback info';
        fb.textContent = 'Décompte… puis tape !';
        const ms = (run.end - Audio2.now() + 0.25) * 1000;
        const timer = setTimeout(evaluate, ms);
        cleanup.push(() => clearTimeout(timer));
      });
      listen.addEventListener('click', () => playBar(bar, st.tempo, { countIn: true, metronome: true }));
      next.addEventListener('click', () => { bar = randomBar(st.level); run = null; draw(); fb.className = 'feedback info'; fb.textContent = 'Nouveau rythme : lis-le, puis « Go ».'; });

      function evaluate() {
        if (!run) return;
        const ev = events(bar);
        const tol = Math.min(0.14, Math.max(0.07, run.six * 0.55));
        const used = new Set();
        const marks = [];
        let good = 0, total = 0, offs = [];
        ev.forEach((e, i) => {
          if (e.rest) return;
          total++;
          const t = run.start + e.start * run.six;
          let best = -1, bd = 1e9;
          taps.forEach((tp, j) => { if (!used.has(j) && Math.abs(tp - t) < bd) { bd = Math.abs(tp - t); best = j; } });
          if (best >= 0 && bd <= tol) { used.add(best); good++; marks[i] = 'good'; offs.push(taps[best] - t); } else marks[i] = 'bad';
        });
        const extra = taps.filter((tp, j) => !used.has(j) && tp > run.start - tol && tp < run.end).length;
        draw(marks);
        run = null;
        const avg = offs.length ? offs.reduce((a, b) => a + b, 0) / offs.length * 1000 : 0;
        const perfect = good === total && extra === 0;
        fb.className = 'feedback ' + (perfect ? 'good' : good >= total * 0.7 ? 'info' : 'bad');
        let msg = `${good} / ${total} notes justes` + (extra ? `, ${extra} coup(s) en trop` : '') + '.';
        if (offs.length) msg += Math.abs(avg) < 25 ? ' Bien en place !' : avg > 0 ? ` Tu as tendance à être en retard (${Math.round(avg)} ms).` : ` Tu as tendance à être en avance (${Math.round(-avg)} ms).`;
        if (perfect) msg = '✔ Parfait ! ' + msg + ' Clique « Nouveau rythme » ou monte le tempo.';
        fb.textContent = msg;
      }
    }

    drawEx();
    cleanup.push(() => lights && lights.clear());

    /* ---------------- Explications ---------------- */
    const sec = (title, children) => el.appendChild(h('div', { class: 'card', style: 'margin-top:1rem' }, [h('h2', { style: 'margin-top:0', text: title })].concat(children)));
    const example = (cells, label, extra) => {
      const b = h('button', { class: 'btn small', text: '▶' });
      b.addEventListener('click', () => playBar(cells, 70, { countIn: false, metronome: true, noLights: true }));
      return h('div', { class: 'rh-example' }, [drawBar(cells, { beatW: 70, counts: false }), h('div', {}, [h('b', { text: label }), extra ? h('div', { class: 'hint', text: extra }) : null]), b]);
    };

    sec('1. La pulsation et les valeurs', [
      h('p', { html: 'La <b>pulsation</b> (le « temps »), c’est ce que tu tapes du pied. En 4/4 il y a 4 temps par mesure. Chaque figure de note dure un certain nombre de temps :' }),
      h('div', { class: 'rh-examples' }, [
        example(['h', 'h'], 'Blanche = 2 temps', 'creuse, avec une hampe'),
        example(['q', 'q', 'q', 'q'], 'Noire = 1 temps', 'pleine, avec une hampe'),
        example(['ee', 'ee', 'ee', 'ee'], 'Croche = ½ temps', '2 croches par temps, reliées par une barre'),
        example(['ssss', 'ssss', 'ssss', 'ssss'], 'Double croche = ¼ de temps', '4 par temps, reliées par 2 barres')
      ]),
      h('p', { class: 'hint', html: 'Silences : le <b>soupir</b> (𝄽) vaut une noire, le <b>demi-soupir</b> (𝄾) une croche, le <b>quart de soupir</b> (𝄿) une double croche. Ronde = 4 temps, pause = silence de 4 temps.' })
    ]);
    sec('2. Compter à voix haute', [
      h('ul', {}, [
        h('li', { html: '<b>Noires</b> : « <b>1</b> – <b>2</b> – <b>3</b> – <b>4</b> »' }),
        h('li', { html: '<b>Croches</b> : « <b>1</b> et <b>2</b> et <b>3</b> et <b>4</b> et » — le chiffre tombe sur le temps (main vers le bas à la guitare), le « et » entre deux temps (main vers le haut).' }),
        h('li', { html: '<b>Doubles croches</b> : « <b>1</b> i et a <b>2</b> i et a… » — 4 syllabes régulières par temps (ou « ta-ka-ta-ka »).' })
      ]),
      h('div', { class: 'rh-examples' }, [
        example(['ess', 'ess', 'ess', 'ess'], 'Croche + 2 doubles', '« 1 – et a »  (le galop)'),
        example(['sse', 'sse', 'sse', 'sse'], '2 doubles + croche', '« 1 i et – »')
      ]),
      h('p', { class: 'hint', text: 'Astuce : garde toujours le pied (ou la main) régulier sur les temps, même pendant les silences.' })
    ]);
    sec('3. Les notes pointées', [
      h('p', { html: 'Un <b>point</b> après une note ajoute <b>la moitié de sa valeur</b> : noire pointée = 1 + ½ = 1 temps ½ ; croche pointée = ½ + ¼ = ¾ de temps.' }),
      h('div', { class: 'rh-examples' }, [
        example(['qd', 'qd'], 'Noire pointée + croche', '« 1 (et 2) et » — très fréquent en pop'),
        example(['eds', 'eds', 'eds', 'eds'], 'Croche pointée + double', '« 1 (i et) a » — rythme sautillant')
      ])
    ]);
    sec('4. Contretemps et syncopes', [
      h('p', { html: 'Le <b>contretemps</b> : une note jouée sur le « et », juste après un silence sur le temps.' }),
      h('p', { html: 'La <b>syncope</b> : une note attaquée sur un temps faible (ou un « et ») et <b>tenue par-dessus le temps suivant</b>. Le temps fort n’est plus joué, il est « sauté » : c’est ce qui donne l’impression que ça « décale » et que ça groove (funk, reggae, bossa, pop…).' }),
      h('div', { class: 'rh-examples' }, [
        example(['re', 're', 're', 're'], 'Contretemps', '« (1) et (2) et… » — le skank reggae'),
        example(['eqe', 'eqe'], 'Syncope croche – noire – croche', '« 1 et (2) et » — la noire commence sur le « et » et passe par-dessus le 2'),
        example(['ses', 'ses', 'ses', 'ses'], 'Syncope dans le temps', '« 1 i (et) a » — la croche du milieu saute le « et »')
      ]),
      h('p', { class: 'hint', text: 'Méthode : compte d’abord tout en croches (ou doubles), tape toutes les subdivisions, puis ne joue plus que les notes écrites tout en continuant à compter dans ta tête.' })
    ]);

    return { destroy() { cleanup.forEach((f) => f()); } };
  }

  let inst = null;
  App.register('/theorie/rythme', {
    title: 'Le rythme',
    subtitle: 'Croches, doubles croches, notes pointées et syncopes : explications avec exemples à écouter, et deux exercices (reconnaître à l’oreille, taper en rythme).',
    render(el) { inst = render(el); },
    destroy() { inst && inst.destroy(); }
  });

  window.Rhythm = { CELLS, drawBar, events, randomBar };
})();

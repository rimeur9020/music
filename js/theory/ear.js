/* Entraînement de l'oreille : notes, intervalles, accords. */
(function () {
  'use strict';
  const { h } = App;
  const M = Music;

  const CHROMA = [
    { pc: 0, n: 'C' }, { pc: 1, n: 'C#', alt: 'Db' }, { pc: 2, n: 'D' }, { pc: 3, n: 'D#', alt: 'Eb' }, { pc: 4, n: 'E' },
    { pc: 5, n: 'F' }, { pc: 6, n: 'F#', alt: 'Gb' }, { pc: 7, n: 'G' }, { pc: 8, n: 'G#', alt: 'Ab' }, { pc: 9, n: 'A' },
    { pc: 10, n: 'A#', alt: 'Bb' }, { pc: 11, n: 'B' }
  ];

  function pcLabel(pc) {
    const c = CHROMA[pc];
    const a = M.noteName(M.parseNote(c.n));
    return c.alt ? a + '/' + M.noteName(M.parseNote(c.alt)) : a;
  }

  const NOTE_LEVELS = [
    { name: 'Débutant', pcs: [0, 2, 4], octaves: [4], ref: true, desc: 'Trois notes : Do, Ré, Mi. Le Do de référence est joué avant.' },
    { name: 'Facile', pcs: [0, 2, 4, 5, 7], octaves: [4], ref: true, desc: 'Cinq notes de Do à Sol, avec référence.' },
    { name: 'Moyen', pcs: [0, 2, 4, 5, 7, 9, 11], octaves: [4], ref: true, desc: 'Les 7 notes naturelles (touches blanches), avec référence.' },
    { name: 'Difficile', pcs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], octaves: [4], ref: true, desc: 'Les 12 notes chromatiques, avec référence.' },
    { name: 'Expert', pcs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], octaves: [3, 4, 5], ref: false, desc: 'Les 12 notes sur 3 octaves, sans référence (oreille absolue).' }
  ];

  const INTERVALS = [
    { s: 1, n: '2de m' }, { s: 2, n: '2de M' }, { s: 3, n: '3ce m' }, { s: 4, n: '3ce M' }, { s: 5, n: '4te J' },
    { s: 6, n: 'Triton' }, { s: 7, n: '5te J' }, { s: 8, n: '6te m' }, { s: 9, n: '6te M' }, { s: 10, n: '7e m' },
    { s: 11, n: '7e M' }, { s: 12, n: 'Octave' }
  ];
  const INTERVAL_HINTS = {
    1: 'Les Dents de la mer', 2: 'Frère Jacques (Fr-è)', 3: 'Smoke on the Water (2 premières notes)', 4: 'Oh When the Saints',
    5: 'La Marseillaise (Al-lons)', 6: 'Les Simpson (The Sim-)', 7: 'Star Wars (thème)', 8: 'The Entertainer (descendant fin)',
    9: 'My Bonnie (My Bon-)', 10: 'Star Trek (thème original)', 11: 'Take On Me (sur le refrain, 1→7)', 12: 'Over the Rainbow (Some-where)'
  };
  const INTERVAL_LEVELS = [
    { name: 'Débutant', set: [4, 7, 12], desc: 'Tierce majeure, quinte juste, octave.' },
    { name: 'Facile', set: [2, 3, 4, 5, 7, 12], desc: 'Ajoute la seconde majeure, la tierce mineure et la quarte.' },
    { name: 'Moyen', set: [2, 3, 4, 5, 7, 8, 9, 10, 11, 12], desc: 'Ajoute les sixtes et les septièmes.' },
    { name: 'Difficile', set: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], desc: 'Tous les intervalles jusqu’à l’octave.' }
  ];

  const CHORDS = [
    { id: 'maj', n: 'Majeur', iv: [0, 4, 7] }, { id: 'min', n: 'Mineur', iv: [0, 3, 7] },
    { id: 'dim', n: 'Diminué', iv: [0, 3, 6] }, { id: 'aug', n: 'Augmenté', iv: [0, 4, 8] },
    { id: '7', n: '7 (dominante)', iv: [0, 4, 7, 10] }, { id: 'maj7', n: 'Maj7', iv: [0, 4, 7, 11] },
    { id: 'm7', n: 'm7', iv: [0, 3, 7, 10] }, { id: 'sus2', n: 'sus2', iv: [0, 2, 7] }, { id: 'sus4', n: 'sus4', iv: [0, 5, 7] },
    { id: 'm7b5', n: 'm7♭5', iv: [0, 3, 6, 10] }, { id: 'dim7', n: 'dim7', iv: [0, 3, 6, 9] }
  ];
  const CHORD_LEVELS = [
    { name: 'Débutant', set: ['maj', 'min'], desc: 'Majeur ou mineur ?' },
    { name: 'Facile', set: ['maj', 'min', 'dim', 'aug'], desc: 'Les 4 triades.' },
    { name: 'Moyen', set: ['maj', 'min', '7', 'maj7', 'm7'], desc: 'Triades et accords de septième courants.' },
    { name: 'Difficile', set: ['maj', 'min', 'dim', 'aug', '7', 'maj7', 'm7', 'sus2', 'sus4', 'm7b5', 'dim7'], desc: 'Tous les accords.' }
  ];

  const state = App.store('ear', { mode: 'notes', level: 0, ref: null, dir: 'up', instrument: 'piano', auto: true, best: {} });

  function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function buildKeyboard(onPick, enabledPcs) {
    const kb = h('div', { class: 'keyboard' });
    const whites = [0, 2, 4, 5, 7, 9, 11];
    const blacks = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 };
    const w = 100 / 7;
    const keys = {};
    whites.forEach((pc, i) => {
      const k = h('div', { class: 'key white', style: `left:${i * w}%;width:${w}%`, 'data-pc': pc, text: pcLabel(pc) });
      keys[pc] = k;
      kb.appendChild(k);
    });
    Object.keys(blacks).forEach((pcs) => {
      const pc = +pcs;
      const i = blacks[pc];
      const k = h('div', { class: 'key black', style: `left:${(i + 1) * w - w * 0.3}%;width:${w * 0.6}%`, 'data-pc': pc });
      k.innerHTML = pcLabel(pc).replace('/', '<br>');
      keys[pc] = k;
      kb.appendChild(k);
    });
    Object.values(keys).forEach((k) => {
      const pc = +k.dataset.pc;
      if (enabledPcs.indexOf(pc) < 0) k.classList.add('disabled');
      k.addEventListener('click', () => { if (!k.classList.contains('disabled')) onPick(pc, k); });
    });
    kb.keys = keys;
    return kb;
  }

  function render(el) {
    let question = null;
    let answered = false;
    let score = { ok: 0, total: 0, streak: 0 };
    const per = {};
    let nextTimer = null;

    const modeSeg = h('div', { class: 'segmented' });
    [['notes', 'Notes'], ['intervals', 'Intervalles'], ['chords', 'Accords']].forEach(([id, label]) => {
      const b = h('button', { text: label, class: state.mode === id ? 'on' : '' });
      b.addEventListener('click', () => { state.mode = id; state.level = 0; state.ref = null; App.save('ear', state); rebuild(); });
      modeSeg.appendChild(b);
    });

    const top = h('div', { class: 'toolbar' }, [App.field('Exercice', modeSeg)]);
    const body = h('div', { class: 'trainer' });
    el.appendChild(top);
    el.appendChild(body);

    function levels() { return state.mode === 'notes' ? NOTE_LEVELS : state.mode === 'intervals' ? INTERVAL_LEVELS : CHORD_LEVELS; }

    function rebuild() {
      clearTimeout(nextTimer);
      [...modeSeg.children].forEach((b, i) => b.classList.toggle('on', ['notes', 'intervals', 'chords'][i] === state.mode));
      body.innerHTML = '';
      question = null;
      answered = false;
      score = { ok: 0, total: 0, streak: 0 };
      Object.keys(per).forEach((k) => delete per[k]);
      const lv = levels()[state.level] || levels()[0];

      const controls = h('div', { class: 'toolbar' });
      controls.appendChild(App.field('Niveau', App.select(levels().map((l, i) => ({ value: i, label: (i + 1) + '. ' + l.name })), state.level, (v) => {
        state.level = +v; state.ref = null; App.save('ear', state); rebuild();
      })));
      controls.appendChild(App.field('Son', App.select([{ value: 'piano', label: 'Piano' }, { value: 'guitar', label: 'Guitare' }], state.instrument, (v) => { state.instrument = v; App.save('ear', state); })));
      if (state.mode === 'notes') {
        const refOn = state.ref == null ? lv.ref : state.ref;
        const cb = h('input', { type: 'checkbox' });
        cb.checked = refOn;
        cb.addEventListener('change', () => { state.ref = cb.checked; App.save('ear', state); });
        controls.appendChild(h('label', { class: 'checkbox' }, [cb, 'Jouer le Do de référence avant']));
      }
      if (state.mode === 'intervals') {
        controls.appendChild(App.field('Direction', App.select([
          { value: 'up', label: 'Montant' }, { value: 'down', label: 'Descendant' }, { value: 'harm', label: 'Harmonique (ensemble)' }, { value: 'mix', label: 'Mélangé' }
        ], state.dir, (v) => { state.dir = v; App.save('ear', state); })));
      }
      const autoCb = h('input', { type: 'checkbox' });
      autoCb.checked = state.auto;
      autoCb.addEventListener('change', () => { state.auto = autoCb.checked; App.save('ear', state); });
      controls.appendChild(h('label', { class: 'checkbox' }, [autoCb, 'Question suivante automatique']));
      body.appendChild(controls);
      body.appendChild(h('p', { class: 'level-desc', text: lv.desc }));

      const stats = h('div', { class: 'stats' });
      body.appendChild(stats);
      const playBtn = h('button', { class: 'btn primary big-play', text: '▶ Commencer' });
      const replayBtn = h('button', { class: 'btn', text: '↻ Réécouter', disabled: true });
      const nextBtn = h('button', { class: 'btn', text: 'Suivant →', disabled: true });
      body.appendChild(h('div', { class: 'btn-row' }, [playBtn, replayBtn, nextBtn]));
      const fb = h('div', { class: 'feedback info', text: 'Appuie sur « Commencer » puis écoute.' });
      body.appendChild(fb);
      const answersBox = h('div');
      body.appendChild(answersBox);
      const heat = h('div', { class: 'heat' });
      body.appendChild(h('div', {}, [h('h3', { text: 'Réussite par réponse' }), heat]));

      const bestKey = state.mode + state.level;
      function updateStats() {
        const best = state.best[bestKey] || 0;
        stats.innerHTML = '';
        [['Score', score.ok + ' / ' + score.total], ['Réussite', score.total ? Math.round(100 * score.ok / score.total) + ' %' : '–'],
          ['Série', score.streak], ['Record de série', best]].forEach(([l, v]) => {
          stats.appendChild(h('div', { class: 'stat' }, [h('b', { text: String(v) }), h('span', { text: l })]));
        });
        heat.innerHTML = '';
        Object.keys(per).forEach((k) => {
          const p = per[k];
          const ratio = p.ok / p.total;
          const span = h('span', { text: `${p.label} : ${p.ok}/${p.total}` });
          span.style.background = ratio >= 0.8 ? 'var(--good-soft)' : ratio < 0.5 ? 'var(--bad-soft)' : '';
          heat.appendChild(span);
        });
        if (!Object.keys(per).length) heat.appendChild(h('span', { class: 'muted', text: 'Pas encore de réponse.' }));
      }

      // ----- Réponses -----
      let answerEls = {};
      if (state.mode === 'notes') {
        const kb = buildKeyboard((pc) => answer(pc), lv.pcs);
        answerEls = kb.keys;
        answersBox.appendChild(kb);
      } else {
        const box = h('div', { class: 'answers' });
        const items = state.mode === 'intervals'
          ? INTERVALS.filter((i) => lv.set.indexOf(i.s) >= 0).map((i) => ({ id: i.s, label: i.n }))
          : CHORDS.filter((c) => lv.set.indexOf(c.id) >= 0).map((c) => ({ id: c.id, label: c.n }));
        items.forEach((it) => {
          const b = h('button', { class: 'btn', text: it.label });
          b.addEventListener('click', () => answer(it.id));
          answerEls[it.id] = b;
          box.appendChild(b);
        });
        answersBox.appendChild(box);
      }

      function labelOf(id) {
        if (state.mode === 'notes') return pcLabel(id);
        if (state.mode === 'intervals') return INTERVALS.find((i) => i.s === id).n;
        return CHORDS.find((c) => c.id === id).n;
      }

      function newQuestion() {
        clearTimeout(nextTimer);
        answered = false;
        Object.values(answerEls).forEach((e) => e.classList.remove('correct', 'wrong'));
        if (state.mode === 'notes') {
          let pc;
          do { pc = rand(lv.pcs); } while (question && lv.pcs.length > 2 && question.id === pc && Math.random() < 0.7);
          const oct = rand(lv.octaves);
          question = { id: pc, midi: 12 * (oct + 1) + pc };
        } else if (state.mode === 'intervals') {
          const s = rand(lv.set);
          const dir = state.dir === 'mix' ? rand(['up', 'down', 'harm']) : state.dir;
          const low = 52 + Math.floor(Math.random() * 14);
          question = { id: s, dir, low, high: low + s };
        } else {
          const c = CHORDS.find((x) => x.id === rand(lv.set));
          const root = 48 + Math.floor(Math.random() * 12);
          question = { id: c.id, notes: c.iv.map((i) => root + i) };
        }
        fb.className = 'feedback info';
        fb.textContent = state.mode === 'notes' ? 'Quelle est cette note ?' : state.mode === 'intervals' ? 'Quel est cet intervalle ?' : 'Quel est cet accord ?';
        playQuestion();
        playBtn.textContent = '▶ Nouvelle question';
        replayBtn.disabled = false;
        nextBtn.disabled = true;
      }

      function playQuestion() {
        if (!question) return;
        const ins = { instrument: state.instrument };
        const t = Audio2.now() + 0.05;
        if (state.mode === 'notes') {
          const refOn = state.ref == null ? lv.ref : state.ref;
          if (refOn) {
            Audio2.play(60, Object.assign({ when: t, dur: 0.8 }, ins));
            Audio2.play(question.midi, Object.assign({ when: t + 1.1, dur: 1.4 }, ins));
          } else {
            Audio2.play(question.midi, Object.assign({ when: t, dur: 1.4 }, ins));
          }
        } else if (state.mode === 'intervals') {
          const q = question;
          if (q.dir === 'harm') {
            Audio2.play(q.low, Object.assign({ when: t, dur: 1.6 }, ins));
            Audio2.play(q.high, Object.assign({ when: t, dur: 1.6 }, ins));
          } else {
            const [a, b] = q.dir === 'down' ? [q.high, q.low] : [q.low, q.high];
            Audio2.play(a, Object.assign({ when: t, dur: 1 }, ins));
            Audio2.play(b, Object.assign({ when: t + 0.8, dur: 1.4 }, ins));
          }
        } else {
          question.notes.forEach((n, i) => Audio2.play(n, Object.assign({ when: t + i * 0.03, dur: 2 }, ins)));
        }
      }

      function answer(id) {
        if (!question || answered) {
          // Hors question : on fait juste entendre la réponse cliquée
          if (state.mode === 'notes') Audio2.play(60 + id, { instrument: state.instrument });
          return;
        }
        answered = true;
        const ok = id === question.id;
        score.total++;
        const key = String(question.id);
        per[key] = per[key] || { label: labelOf(question.id), ok: 0, total: 0 };
        per[key].total++;
        if (ok) {
          score.ok++;
          score.streak++;
          per[key].ok++;
          if (score.streak > (state.best[bestKey] || 0)) { state.best[bestKey] = score.streak; App.save('ear', state); }
          fb.className = 'feedback good';
          fb.textContent = '✔ Bravo : ' + labelOf(question.id);
          answerEls[id] && answerEls[id].classList.add('correct');
          if (state.auto) nextTimer = setTimeout(newQuestion, 1100);
        } else {
          score.streak = 0;
          fb.className = 'feedback bad';
          let txt = '✘ C’était : ' + labelOf(question.id) + ' (tu as répondu ' + labelOf(id) + ')';
          if (state.mode === 'intervals' && INTERVAL_HINTS[question.id]) txt += ' — astuce : « ' + INTERVAL_HINTS[question.id] + ' »';
          fb.textContent = txt;
          answerEls[id] && answerEls[id].classList.add('wrong');
          answerEls[question.id] && answerEls[question.id].classList.add('correct');
          if (state.mode === 'notes') Audio2.play(question.midi, { instrument: state.instrument, when: Audio2.now() + 0.3 });
        }
        nextBtn.disabled = false;
        updateStats();
      }

      playBtn.addEventListener('click', newQuestion);
      replayBtn.addEventListener('click', playQuestion);
      nextBtn.addEventListener('click', newQuestion);
      updateStats();
    }

    rebuild();
    return { destroy() { clearTimeout(nextTimer); } };
  }

  let inst = null;
  App.register('/theorie/oreille', {
    title: 'Entraînement de l’oreille',
    subtitle: 'Écoute, puis trouve la note, l’intervalle ou l’accord. Commence au niveau Débutant et monte quand tu dépasses 80 % de réussite.',
    render(el) { inst = render(el); },
    destroy() { inst && inst.destroy(); }
  });
})();

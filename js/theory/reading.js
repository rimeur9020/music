/* Lecture de notes en clé de sol / clé de fa. */
(function () {
  'use strict';
  const { h } = App;
  const M = Music;

  // Plages exprimées en "pas" depuis la première ligne (0 = ligne du bas, 8 = ligne du haut)
  const LEVELS = [
    { name: 'Débutant', min: 0, max: 8, acc: false, desc: 'Notes sur les lignes et dans les interlignes de la portée.' },
    { name: 'Facile', min: -2, max: 10, acc: false, desc: 'Ajoute la première ligne supplémentaire en dessous et au-dessus.' },
    { name: 'Moyen', min: -5, max: 13, acc: false, desc: 'Jusqu’à 2-3 lignes supplémentaires.' },
    { name: 'Difficile', min: -2, max: 10, acc: true, desc: 'Avec dièses et bémols (♯ ♭).' },
    { name: 'Expert', min: -6, max: 14, acc: true, desc: 'Grande tessiture, altérations, et chrono de 60 secondes.' , timed: true }
  ];

  const state = App.store('reading', { clef: 'treble', level: 0, octaveCheck: false, sound: true });

  function render(el) {
    let current = null;
    let alter = 0;
    let answered = false;
    let score = { ok: 0, total: 0, streak: 0, times: [] };
    let tStart = 0;
    let timer = null;
    let timeLeft = 0;

    const clefSeg = h('div', { class: 'segmented' });
    [['treble', 'Clé de sol'], ['bass', 'Clé de fa'], ['both', 'Les deux']].forEach(([id, l]) => {
      const b = h('button', { text: l, class: state.clef === id ? 'on' : '' });
      b.addEventListener('click', () => { state.clef = id; App.save('reading', state); [...clefSeg.children].forEach((x) => x.classList.toggle('on', x === b)); reset(); });
      clefSeg.appendChild(b);
    });
    const levelSel = App.select(LEVELS.map((l, i) => ({ value: i, label: (i + 1) + '. ' + l.name })), state.level, (v) => { state.level = +v; App.save('reading', state); reset(); });
    const soundCb = h('input', { type: 'checkbox' });
    soundCb.checked = state.sound;
    soundCb.addEventListener('change', () => { state.sound = soundCb.checked; App.save('reading', state); });

    el.appendChild(h('div', { class: 'toolbar' }, [
      App.field('Clé', clefSeg), App.field('Niveau', levelSel),
      h('label', { class: 'checkbox' }, [soundCb, 'Entendre la note après la réponse'])
    ]));
    const desc = h('p', { class: 'level-desc' });
    el.appendChild(desc);
    const stats = h('div', { class: 'stats' });
    el.appendChild(stats);
    const staffBox = h('div', { class: 'staff-box' });
    el.appendChild(staffBox);
    const fb = h('div', { class: 'feedback info' });
    el.appendChild(fb);

    const altRow = h('div', { class: 'alter-row' });
    const altBtns = {};
    [[-1, '♭ bémol'], [0, '♮ naturel'], [1, '♯ dièse']].forEach(([a, l]) => {
      const b = h('button', { class: 'btn small', text: l });
      b.addEventListener('click', () => setAlter(a));
      altBtns[a] = b;
      altRow.appendChild(b);
    });
    const answers = h('div', { class: 'answers' });
    const noteBtns = [];
    for (let i = 0; i < 7; i++) {
      const b = h('button', { class: 'btn' });
      b.addEventListener('click', () => answer(i));
      noteBtns.push(b);
      answers.appendChild(b);
    }
    const startBtn = h('button', { class: 'btn primary', text: '▶ Démarrer le chrono (60 s)' });
    startBtn.addEventListener('click', startTimed);
    el.appendChild(h('div', { class: 'trainer' }, [altRow, answers, startBtn, h('p', { class: 'hint', text: 'Raccourcis clavier : C D E F G A B (ou 1 à 7 pour Do…Si), + pour dièse, - pour bémol.' })]));

    function setAlter(a) {
      alter = a;
      Object.keys(altBtns).forEach((k) => altBtns[k].classList.toggle('primary', +k === a));
    }

    function lv() { return LEVELS[state.level] || LEVELS[0]; }

    function updateStats() {
      stats.innerHTML = '';
      const avg = score.times.length ? (score.times.reduce((a, b) => a + b, 0) / score.times.length / 1000).toFixed(1) + ' s' : '–';
      const items = [['Score', score.ok + ' / ' + score.total], ['Réussite', score.total ? Math.round(100 * score.ok / score.total) + ' %' : '–'], ['Série', score.streak], ['Temps moyen', avg]];
      if (lv().timed) items.push(['Temps restant', timer ? timeLeft + ' s' : '–']);
      items.forEach(([l, v]) => stats.appendChild(h('div', { class: 'stat' }, [h('b', { text: String(v) }), h('span', { text: l })])));
    }

    function newNote() {
      const L = lv();
      const clef = state.clef === 'both' ? (Math.random() < 0.5 ? 'treble' : 'bass') : state.clef;
      const bottom = Staff.CLEFS[clef].bottomDia;
      let step;
      do { step = L.min + Math.floor(Math.random() * (L.max - L.min + 1)); }
      while (current && current.step === step && current.clef === clef);
      const d = bottom + step;
      const note = { letter: M.mod(d, 7), acc: L.acc ? [-1, 0, 0, 1][Math.floor(Math.random() * 4)] : 0 };
      // éviter les cas exotiques Mi♯, Si♯, Fa♭, Do♭ aux niveaux non-experts
      if (state.level < 4 && ((note.acc === 1 && (note.letter === 2 || note.letter === 6)) || (note.acc === -1 && (note.letter === 3 || note.letter === 0)))) note.acc = 0;
      current = { clef, step, note, octave: Math.floor(d / 7) };
      answered = false;
      setAlter(0);
      Staff.render(staffBox, [{ note: current.note, octave: current.octave }], { clef, width: 260, spacing: 60 });
      fb.className = 'feedback info';
      fb.textContent = 'Quelle est cette note ? ' + (clef === 'bass' ? '(clé de fa)' : '(clé de sol)');
      tStart = performance.now();
    }

    function answer(letter) {
      if (!current) return;
      if (answered) { newNote(); return; }
      answered = true;
      const ok = letter === current.note.letter && alter === current.note.acc;
      score.total++;
      const midi = M.noteToMidi(current.note, current.octave);
      if (ok) {
        score.ok++;
        score.streak++;
        score.times.push(performance.now() - tStart);
        fb.className = 'feedback good';
        fb.textContent = '✔ ' + M.noteName(current.note);
        Staff.render(staffBox, [{ note: current.note, octave: current.octave, cls: 'good', label: M.noteName(current.note) }], { clef: current.clef, width: 260, spacing: 60 });
        if (state.sound) Audio2.play(midi);
        setTimeout(() => { if (answered) newNote(); }, lv().timed ? 350 : 800);
      } else {
        score.streak = 0;
        fb.className = 'feedback bad';
        fb.textContent = '✘ C’était ' + M.noteName(current.note) + ' (tu as répondu ' + M.noteName({ letter, acc: alter }) + '). Clique une note pour continuer.';
        Staff.render(staffBox, [{ note: current.note, octave: current.octave, cls: 'bad', label: M.noteName(current.note) }], { clef: current.clef, width: 260, spacing: 60 });
        if (state.sound) Audio2.play(midi);
        if (lv().timed && timer) setTimeout(() => { if (answered) newNote(); }, 900);
      }
      updateStats();
    }

    function startTimed() {
      score = { ok: 0, total: 0, streak: 0, times: [] };
      timeLeft = 60;
      clearInterval(timer);
      timer = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
          clearInterval(timer);
          timer = null;
          current = null;
          fb.className = 'feedback info';
          fb.textContent = `Temps écoulé ! ${score.ok} bonnes réponses sur ${score.total}.`;
        }
        updateStats();
      }, 1000);
      newNote();
      updateStats();
    }

    function reset() {
      clearInterval(timer);
      timer = null;
      score = { ok: 0, total: 0, streak: 0, times: [] };
      const L = lv();
      desc.textContent = L.desc;
      altRow.style.display = L.acc ? '' : 'none';
      startBtn.style.display = L.timed ? '' : 'none';
      noteBtns.forEach((b, i) => { b.textContent = M.noteName({ letter: i, acc: 0 }); });
      current = null;
      if (L.timed) {
        Staff.render(staffBox, [], { clef: state.clef === 'bass' ? 'bass' : 'treble', width: 260 });
        fb.className = 'feedback info';
        fb.textContent = 'Lance le chrono : un maximum de bonnes réponses en 60 secondes.';
      } else newNote();
      updateStats();
    }

    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      const k = e.key.toUpperCase();
      const li = M.LETTERS.indexOf(k);
      if (li >= 0) answer(li);
      else if (/^[1-7]$/.test(k)) answer(+k - 1);
      else if (k === '+' || k === '#') setAlter(alter === 1 ? 0 : 1);
      else if (k === '-') setAlter(alter === -1 ? 0 : -1);
    }
    document.addEventListener('keydown', onKey);
    reset();
    return { destroy() { clearInterval(timer); document.removeEventListener('keydown', onKey); } };
  }

  let inst = null;
  App.register('/theorie/lecture', {
    title: 'Lecture de notes',
    subtitle: 'Une note s’affiche sur la portée : donne son nom le plus vite possible.',
    render(el) { inst = render(el); },
    destroy() { inst && inst.destroy(); }
  });
})();

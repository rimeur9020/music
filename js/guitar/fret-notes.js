/* Mémoriser les notes du manche (cases 0 à 12) : explications + jeu. */
(function () {
  'use strict';
  const { h } = App;
  const M = Music;
  const TUNING = Chords.TUNING;
  const STRING_NAMES = ['Mi grave (6)', 'La (5)', 'Ré (4)', 'Sol (3)', 'Si (2)', 'Mi aigu (1)'];
  const SHORT = ['Mi', 'La', 'Ré', 'Sol', 'Si', 'Mi'];
  const NF = 12;
  const NATURALS = [0, 2, 4, 5, 7, 9, 11];

  function pcLabel(pc) {
    const s = M.spellPc(pc, false), f = M.spellPc(pc, true);
    return s.letter === f.letter && s.acc === f.acc ? M.noteName(s) : M.noteName(s) + '/' + M.noteName(f);
  }

  /** Dessine un manche 0-12. opts: { marks: [{s,f,cls,label}], onClick(s,f) } */
  function board(container, opts) {
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
      mk('text', { x: X0(f), y: height - 6, class: 'fb-fretnum' }, f === 0 ? 'vide' : String(f));
    }
    for (let s = 0; s < 6; s++) {
      const dim = opts.strings && opts.strings.indexOf(s) < 0;
      mk('line', { x1: lineX(0), x2: lineX(NF), y1: Y(s), y2: Y(s), class: 'fb-string', 'stroke-width': 0.8 + (5 - s) * 0.35, opacity: dim ? 0.35 : 1 });
      mk('text', { x: 12, y: Y(s) + 4, class: 'fb-fretnum', 'text-anchor': 'start' }, SHORT[s]);
      if (opts.onClick) {
        for (let f = 0; f <= NF; f++) {
          const x = f === 0 ? left - 44 : lineX(f - 1);
          const r = mk('rect', { x, y: Y(s) - sp / 2, width: f === 0 ? 44 : fw, height: sp, fill: 'transparent', style: 'cursor:pointer' });
          r.addEventListener('click', () => opts.onClick(s, f));
        }
      }
    }
    (opts.marks || []).forEach((m) => {
      const g = mk('g', { class: 'fb-dot ' + (m.cls || ''), style: 'pointer-events:none' });
      mk('circle', { cx: X0(m.f), cy: Y(m.s), r: m.big ? 13 : 11, style: 'fill:' + (m.color || 'var(--guitar)') }, null, g);
      if (m.label) mk('text', { x: X0(m.f), y: Y(m.s), style: m.label.length > 3 ? 'font-size:8px' : '' }, m.label, g);
    });
    container.innerHTML = '';
    container.appendChild(svg);
  }

  function render(el) {
    const st = Object.assign({ mode: 'name', strings: [0, 1], naturals: true, maxFret: 12, best: 0 }, App.store('fretNotes', {}));
    const save = () => App.save('fretNotes', st);

    /* ---------------- Jeu ---------------- */
    const game = h('div', { class: 'card' });
    el.appendChild(game);
    let q = null;
    let answered = false;
    let found = [];
    let score = { ok: 0, total: 0, streak: 0 };
    const per = {}; // réussite par case
    let timer = null, timeLeft = 0;

    const controls = h('div', { class: 'toolbar' });
    const stats = h('div', { class: 'stats' });
    const prompt = h('div', { class: 'game-prompt' });
    const boardBox = h('div', { class: 'fretboard-wrap' });
    const fb = h('div', { class: 'feedback info' });
    const answers = h('div', { class: 'answers' });
    const actions = h('div', { class: 'btn-row' });
    game.appendChild(h('h2', { style: 'margin-top:0', text: '🎮 Jeu : les notes du manche' }));
    [controls, stats, prompt, boardBox, answers, fb, actions].forEach((x) => game.appendChild(x));

    function drawControls() {
      controls.innerHTML = '';
      const seg = h('div', { class: 'segmented' });
      [['name', 'Quelle est cette note ?'], ['find', 'Trouve la case'], ['all', 'Trouve toutes les notes']].forEach(([id, l]) => {
        const b = h('button', { class: st.mode === id ? 'on' : '', text: l });
        b.addEventListener('click', () => { st.mode = id; save(); restart(); });
        seg.appendChild(b);
      });
      controls.appendChild(App.field('Mode', seg));
      const strBox = h('div', { class: 'btn-row' });
      for (let s = 5; s >= 0; s--) {
        const b = h('button', { class: 'btn small' + (st.strings.indexOf(s) >= 0 ? ' primary' : ''), text: SHORT[s] + ' (' + (6 - s) + ')' });
        b.addEventListener('click', () => {
          const i = st.strings.indexOf(s);
          if (i >= 0 && st.strings.length > 1) st.strings.splice(i, 1); else if (i < 0) st.strings.push(s);
          save(); restart();
        });
        strBox.appendChild(b);
      }
      controls.appendChild(App.field('Cordes travaillées', strBox));
      controls.appendChild(App.field('Notes', App.select([{ value: 'nat', label: 'Naturelles (Do Ré Mi…)' }, { value: 'all', label: 'Toutes (avec ♯ / ♭)' }], st.naturals ? 'nat' : 'all', (v) => { st.naturals = v === 'nat'; save(); restart(); })));
      controls.appendChild(App.field('Cases', App.select([{ value: 5, label: '0 à 5' }, { value: 7, label: '0 à 7' }, { value: 12, label: '0 à 12' }], st.maxFret, (v) => { st.maxFret = +v; save(); restart(); })));
    }

    function drawStats() {
      stats.innerHTML = '';
      const items = [['Score', score.ok + ' / ' + score.total], ['Série', score.streak], ['Record', st.best]];
      if (timer) items.push(['Temps', timeLeft + ' s']);
      items.forEach(([l, v]) => stats.appendChild(h('div', { class: 'stat' }, [h('b', { text: String(v) }), h('span', { text: l })])));
    }

    function candidates() {
      const out = [];
      st.strings.forEach((s) => {
        for (let f = 0; f <= st.maxFret; f++) {
          const pc = M.mod(TUNING[s] + f, 12);
          if (!st.naturals || NATURALS.indexOf(pc) >= 0) out.push({ s, f, pc });
        }
      });
      return out;
    }

    function pick() {
      const c = candidates();
      // privilégie les cases souvent ratées
      const weights = c.map((x) => { const p = per[x.s + ':' + x.f]; return p ? 1 + 3 * (1 - p.ok / p.total) : 1.5; });
      let r = Math.random() * weights.reduce((a, b) => a + b, 0);
      for (let i = 0; i < c.length; i++) { r -= weights[i]; if (r <= 0) return c[i]; }
      return c[c.length - 1];
    }

    function newQ() {
      let n;
      do { n = pick(); } while (q && n.s === q.s && n.f === q.f && candidates().length > 1);
      q = n;
      answered = false;
      found = [];
      prompt.innerHTML = '';
      if (st.mode === 'name') {
        prompt.appendChild(h('span', { class: 'muted', text: 'Quelle note est entourée ? ' }));
        prompt.appendChild(h('span', { class: 'muted', text: '(corde de ' + STRING_NAMES[q.s] + ', case ' + q.f + ')' }));
      } else if (st.mode === 'find') {
        prompt.appendChild(h('span', { class: 'muted', text: 'Trouve ' }));
        prompt.appendChild(h('b', { text: pcLabel(q.pc) }));
        prompt.appendChild(h('span', { class: 'muted', text: ' sur la corde de ' + STRING_NAMES[q.s] }));
      } else {
        prompt.appendChild(h('span', { class: 'muted', text: 'Trouve tous les ' }));
        prompt.appendChild(h('b', { text: pcLabel(q.pc) }));
        prompt.appendChild(h('span', { class: 'muted', text: ' (cordes en surbrillance, cases 0 à ' + st.maxFret + ')' }));
      }
      fb.className = 'feedback info';
      fb.textContent = st.mode === 'name' ? 'Clique sur le bon nom de note.' : 'Clique sur le manche.';
      drawBoard();
      drawAnswers();
    }

    function targets() {
      const out = [];
      st.strings.forEach((s) => { for (let f = 0; f <= st.maxFret; f++) if (M.mod(TUNING[s] + f, 12) === q.pc) out.push({ s, f }); });
      return out;
    }

    function drawBoard(extra) {
      const marks = [];
      if (st.mode === 'name' && q) marks.push({ s: q.s, f: q.f, big: true, color: answered ? (extra === 'bad' ? 'var(--bad)' : 'var(--good)') : 'var(--guitar)', label: answered ? pcLabel(q.pc) : '?' });
      if (st.mode === 'find' && answered) marks.push({ s: q.s, f: q.f, color: 'var(--good)', label: pcLabel(q.pc) });
      if (st.mode === 'all') {
        found.forEach((x) => marks.push({ s: x.s, f: x.f, color: 'var(--good)', label: pcLabel(q.pc) }));
        if (answered) targets().filter((t) => !found.some((x) => x.s === t.s && x.f === t.f)).forEach((t) => marks.push({ s: t.s, f: t.f, color: 'var(--bad)', label: pcLabel(q.pc) }));
      }
      if (extra && extra.s != null) marks.push({ s: extra.s, f: extra.f, color: 'var(--bad)', label: pcLabel(M.mod(TUNING[extra.s] + extra.f, 12)) });
      board(boardBox, { strings: st.strings, marks, onClick: st.mode === 'name' ? null : onBoardClick });
    }

    function drawAnswers() {
      answers.innerHTML = '';
      if (st.mode !== 'name') return;
      const pcs = st.naturals ? NATURALS : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      pcs.forEach((pc) => {
        const b = h('button', { class: 'btn', text: pcLabel(pc) });
        b.addEventListener('click', () => onName(pc, b));
        answers.appendChild(b);
      });
    }

    function record(ok, key) {
      score.total++;
      const p = per[key] = per[key] || { ok: 0, total: 0 };
      p.total++;
      if (ok) {
        p.ok++; score.ok++; score.streak++;
        if (score.streak > st.best) { st.best = score.streak; save(); }
      } else score.streak = 0;
      drawStats();
    }

    function onName(pc, btn) {
      if (answered) { newQ(); return; }
      answered = true;
      const ok = pc === q.pc;
      record(ok, q.s + ':' + q.f);
      Audio2.guitar(TUNING[q.s] + q.f, null, 1.2, 0.5);
      if (ok) {
        btn.classList.add('correct');
        fb.className = 'feedback good';
        fb.textContent = '✔ ' + pcLabel(q.pc);
        drawBoard('good');
        setTimeout(() => { if (answered) newQ(); }, 700);
      } else {
        btn.classList.add('wrong');
        fb.className = 'feedback bad';
        fb.textContent = '✘ C’était ' + pcLabel(q.pc) + '. Clique une note pour continuer.';
        drawBoard('bad');
      }
    }

    function onBoardClick(s, f) {
      const pc = M.mod(TUNING[s] + f, 12);
      Audio2.guitar(TUNING[s] + f, null, 1, 0.5);
      if (answered) { newQ(); return; }
      if (st.mode === 'find') {
        if (s !== q.s) { fb.className = 'feedback info'; fb.textContent = 'Reste sur la corde de ' + STRING_NAMES[q.s] + ' !'; return; }
        answered = true;
        const ok = pc === q.pc;
        record(ok, q.s + ':' + q.f);
        if (ok) {
          q.f = f;
          fb.className = 'feedback good';
          fb.textContent = '✔ Oui, case ' + f + '.';
          drawBoard();
          setTimeout(() => { if (answered) newQ(); }, 700);
        } else {
          const t = targets().filter((x) => x.s === q.s).map((x) => x.f);
          q.f = t[0];
          fb.className = 'feedback bad';
          fb.textContent = '✘ Là c’est ' + pcLabel(pc) + '. ' + pcLabel(q.pc) + ' est en case ' + t.join(' et ') + '. Clique pour continuer.';
          drawBoard({ s, f });
        }
      } else {
        if (!st.strings.includes(s) || f > st.maxFret) return;
        if (found.some((x) => x.s === s && x.f === f)) return;
        if (pc === q.pc) {
          found.push({ s, f });
          const all = targets();
          if (found.length === all.length) {
            answered = true;
            record(true, 'all:' + q.pc);
            fb.className = 'feedback good';
            fb.textContent = '✔ Bravo, tu as trouvé les ' + all.length + ' ' + pcLabel(q.pc) + ' !';
            setTimeout(() => { if (answered) newQ(); }, 1000);
          } else {
            fb.className = 'feedback good';
            fb.textContent = 'Oui ! Encore ' + (all.length - found.length) + '…';
          }
          drawBoard();
        } else {
          answered = true;
          record(false, 'all:' + q.pc);
          fb.className = 'feedback bad';
          fb.textContent = '✘ Là c’est ' + pcLabel(pc) + '. En rouge, les ' + pcLabel(q.pc) + ' qui manquaient. Clique pour continuer.';
          drawBoard({ s, f });
        }
      }
    }

    const skip = h('button', { class: 'btn', text: 'Passer →' });
    skip.addEventListener('click', newQ);
    const chrono = h('button', { class: 'btn primary', text: '⏱ Défi 60 secondes' });
    chrono.addEventListener('click', () => {
      clearInterval(timer);
      score = { ok: 0, total: 0, streak: 0 };
      timeLeft = 60;
      timer = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
          clearInterval(timer);
          timer = null;
          answered = true;
          fb.className = 'feedback info';
          fb.textContent = `Temps écoulé : ${score.ok} bonnes réponses sur ${score.total} !`;
        }
        drawStats();
      }, 1000);
      newQ();
      drawStats();
    });
    actions.appendChild(skip);
    actions.appendChild(chrono);

    function restart() {
      clearInterval(timer);
      timer = null;
      score = { ok: 0, total: 0, streak: 0 };
      q = null;
      drawControls();
      drawStats();
      newQ();
    }
    restart();

    /* ---------------- Explications ---------------- */
    const sec = (title, children) => el.appendChild(h('div', { class: 'card', style: 'margin-top:1rem' }, [h('h2', { style: 'margin-top:0', text: title })].concat(children)));

    const refBox = h('div', { class: 'fretboard-wrap', style: 'margin-top:.5rem' });
    const refMarks = [];
    for (let s = 0; s < 6; s++) for (let f = 0; f <= NF; f++) {
      const pc = M.mod(TUNING[s] + f, 12);
      if (NATURALS.indexOf(pc) >= 0) refMarks.push({ s, f, label: M.noteName({ letter: NATURALS.indexOf(pc), acc: 0 }), color: pc === 0 ? 'var(--root)' : 'var(--note)' });
    }
    sec('1. Les cordes à vide', [
      h('p', { html: 'De la plus grave (6e corde) à la plus aiguë (1re) : <b>Mi – La – Ré – Sol – Si – Mi</b>. Phrase mnémotechnique : « <i>Mi La Ré Sol, Si Mi</i> » — ou en anglais E A D G B E : « <i>Eddie Ate Dynamite, Good Bye Eddie</i> ».' })
    ]);
    sec('2. La règle d’or : les demi-tons', [
      h('p', { html: 'Une case = un <b>demi-ton</b>. Entre deux notes naturelles, il y a <b>2 cases</b> (un ton)… <b>sauf</b> entre <b>Mi et Fa</b> et entre <b>Si et Do</b> : là, elles sont collées (1 seule case).' }),
      h('p', { class: 'steps', style: 'font-size:1.05rem', html: 'Do · <span class="muted">Do♯</span> · Ré · <span class="muted">Ré♯</span> · Mi · Fa · <span class="muted">Fa♯</span> · Sol · <span class="muted">Sol♯</span> · La · <span class="muted">La♯</span> · Si · Do' }),
      h('p', { html: 'Donc pour trouver une note, on part de la corde à vide et on compte : sur la corde de La, Si est en case 2, Do en case 3 (collé à Si), Ré en case 5, Mi en 7, Fa en 8 (collé à Mi), Sol en 10, La en 12.' }),
      h('p', { html: 'Les <b>dièses ♯</b> sont une case plus loin (vers le corps), les <b>bémols ♭</b> une case plus près du sillet. Fa♯ et Sol♭ sont la même case.' })
    ]);
    sec('3. La case 12 = l’octave', [
      h('p', { html: 'En case 12 (le double point), on retrouve exactement les notes des cordes à vide, une octave plus haut. Après la case 12, tout recommence : la case 15 = la case 3, etc. Il suffit donc de connaître les <b>12 premières cases</b>.' })
    ]);
    sec('4. Tous les repères (notes naturelles)', [
      h('p', { text: 'Les Do sont en orange : repère-les en premier, puis le reste de la gamme autour.' }),
      refBox
    ]);
    board(refBox, { marks: refMarks });
    sec('5. Astuces pour mémoriser vite', [
      h('ul', {}, [
        h('li', { html: '<b>Commence par les cordes de Mi grave et de La</b> : ce sont celles des fondamentales des accords barrés et des power chords. Le jeu est réglé sur elles par défaut.' }),
        h('li', { html: '<b>Les points du manche</b> : sur la corde de Mi grave, case 3 = Sol, 5 = La, 7 = Si, 9 = Do♯, 12 = Mi. Sur la corde de La : 3 = Do, 5 = Ré, 7 = Mi, 9 = Fa♯, 12 = La.' }),
        h('li', { html: '<b>Case 5 = corde suivante à vide</b> (c’est comme ça qu’on s’accorde) : case 5 du Mi grave = La, case 5 du La = Ré, case 5 du Ré = Sol, <b>case 4</b> du Sol = Si (exception), case 5 du Si = Mi.' }),
        h('li', { html: '<b>Les deux Mi</b> (6e et 1re corde) ont les mêmes notes aux mêmes cases : tu en apprends une, tu connais les deux.' }),
        h('li', { html: '<b>Les octaves</b> : depuis la 6e ou la 5e corde, la même note est <b>2 cordes plus haut et 2 cases plus loin</b>. Depuis la 4e ou la 3e corde : 2 cordes plus haut et <b>3 cases</b> plus loin (à cause de la corde de Si).' }),
        h('li', { html: '<b>Une note à la fois</b> : choisis une note (par ex. Sol) et cherche-la sur les 6 cordes en disant son nom à voix haute. Mode « Trouve toutes les notes » du jeu.' }),
        h('li', { html: '<b>5 minutes par jour</b> valent mieux qu’une heure par semaine. Ajoute une corde dès que tu dépasses 90 % de réussite.' })
      ])
    ]);

    return { destroy() { clearInterval(timer); } };
  }

  let inst = null;
  App.register('/guitare/notes-manche', {
    title: 'Les notes du manche',
    subtitle: 'Apprends où sont les notes sur les 12 premières cases : explications, repères et un jeu qui insiste sur les notes que tu rates.',
    render(el) { inst = render(el); },
    destroy() { inst && inst.destroy(); }
  });
})();

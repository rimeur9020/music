/* Construction des accords (partie théorie). */
(function () {
  'use strict';
  const { h } = App;
  const M = Music;

  const GROUPS = [
    { title: 'Triades', types: ['maj', 'min', 'dim', 'aug'] },
    { title: 'Suspendus & power chord', types: ['sus2', 'sus4', '5'] },
    { title: 'Septièmes', types: ['7', 'maj7', 'm7', 'm7b5', 'dim7', 'mMaj7', '7sus4'] },
    { title: 'Sixtes & extensions', types: ['6', 'm6', 'add9', '9', 'maj9', 'm9', '11', '13'] }
  ];

  const INFO = {
    maj: { sound: 'Stable, joyeux, lumineux.', use: 'L’accord de base de la plupart des chansons (I, IV, V en majeur).' },
    min: { sound: 'Triste, doux, mélancolique.', use: 'Tonique des morceaux en mineur ; ii, iii, vi en majeur.' },
    dim: { sound: 'Tendu, instable, inquiétant.', use: 'Accord de passage ; VIIe degré en majeur, IIe degré en mineur.' },
    aug: { sound: 'Flottant, étrange, « en suspens ».', use: 'Accord de passage entre I et IV (C – C+ – F), musique de film.' },
    sus2: { sound: 'Ouvert, aérien, ni majeur ni mineur.', use: 'Pop, rock : couleur ou ornement d’un accord majeur.' },
    sus4: { sound: 'Suspendu, qui veut se résoudre sur l’accord majeur.', use: 'Juste avant l’accord majeur (Dsus4 → D), ou avant une dominante.' },
    '5': { sound: 'Puissant, neutre (ni majeur ni mineur).', use: 'Rock, metal, punk, surtout avec saturation.' },
    '7': { sound: 'Tendu, bluesy, qui appelle la suite.', use: 'Dominante (V7 → I) et tous les accords d’un blues.' },
    maj7: { sound: 'Doux, rêveur, sophistiqué.', use: 'I et IV en jazz, bossa, soul, pop « chill ».' },
    m7: { sound: 'Mineur adouci, cool.', use: 'ii, iii, vi en jazz / funk ; II de l’enchaînement II-V-I.' },
    m7b5: { sound: 'Sombre et tendu.', use: 'IIe degré en mineur (II-V-I mineur), VIIe degré en majeur.' },
    dim7: { sound: 'Très tendu, dramatique, symétrique.', use: 'Accord de passage, dominante de substitution, musique classique.' },
    mMaj7: { sound: 'Mystérieux, « film noir ».', use: 'Ligne chromatique Am – Am(maj7) – Am7 – Am6, James Bond.' },
    '7sus4': { sound: 'Dominante adoucie, ouverte.', use: 'Avant un V7 ou à la place, funk, gospel.' },
    '6': { sound: 'Rétro, chaleureux, swing.', use: 'Tonique en swing / manouche, rock’n’roll.' },
    m6: { sound: 'Mineur élégant, manouche.', use: 'Tonique mineure en jazz manouche, bossa.' },
    add9: { sound: 'Brillant, ouvert, moderne.', use: 'Pop, folk : remplace un accord majeur.' },
    '9': { sound: 'Dominante riche, funky.', use: 'Funk (James Brown), blues, jazz.' },
    maj9: { sound: 'Très doux, soyeux.', use: 'Soul, R&B, jazz, néo-soul.' },
    m9: { sound: 'Mineur velouté.', use: 'Funk, soul, jazz.' },
    '11': { sound: 'Dominante suspendue, moderne.', use: 'Jazz, fusion (souvent sans la tierce).' },
    '13': { sound: 'Dominante très riche.', use: 'Jazz, blues, funk.' }
  };

  const SEMI_NAMES = { 1: '½ ton', 2: '1 ton', 3: '3ce m (1 ton ½)', 4: '3ce M (2 tons)', 5: '4te (2 tons ½)', 6: 'triton' };

  function stackDesc(ch) {
    const t = M.CHORD_TYPES[ch.type];
    const semis = t.ivs.map((iv) => M.parseInterval(iv).semis);
    const out = [];
    for (let i = 1; i < semis.length; i++) {
      const d = semis[i] - semis[i - 1];
      out.push(SEMI_NAMES[d] || d + ' demi-tons');
    }
    return out.join(' + ');
  }

  function chordMidis(ch, inversion) {
    const notes = M.chordNotes(ch);
    const semis = M.CHORD_TYPES[ch.type].ivs.map((iv) => M.parseInterval(iv).semis);
    let base = M.noteToMidi(ch.root, 4);
    if (base > 65) base -= 12;
    let list = notes.map((n, i) => ({ note: n, midi: base + semis[i] }));
    for (let k = 0; k < inversion; k++) {
      const first = list.shift();
      first.midi += 12;
      while (first.midi <= list[list.length - 1].midi) first.midi += 12;
      list.push(first);
    }
    return list;
  }

  function render(el) {
    const sel = Object.assign({ root: 'C', type: 'maj', inv: 0 }, App.store('chordSel', {}));
    const save = () => App.save('chordSel', sel);

    /* ---------- Constructeur ---------- */
    const builder = h('div', { class: 'card' });
    el.appendChild(builder);

    function drawBuilder() {
      builder.innerHTML = '';
      const t = M.CHORD_TYPES[sel.type];
      const ch = { root: M.parseNote(sel.root), type: sel.type };
      const nInv = t.ivs.length;
      if (sel.inv >= nInv) sel.inv = 0;
      const typeOpts = [];
      GROUPS.forEach((g) => g.types.forEach((ty) => typeOpts.push({ value: ty, label: g.title + ' · ' + (M.CHORD_TYPES[ty].suffix || 'majeur') + ' (' + M.CHORD_TYPES[ty].name + ')' })));
      builder.appendChild(h('h2', { style: 'margin-top:0', text: 'Construire un accord' }));
      builder.appendChild(h('div', { class: 'toolbar' }, [
        App.field('Fondamentale', App.select(M.ROOTS.map((r) => ({ value: r, label: M.noteName(M.parseNote(r)) })), sel.root, (v) => { sel.root = v; save(); drawBuilder(); })),
        App.field('Type d’accord', App.select(typeOpts, sel.type, (v) => { sel.type = v; sel.inv = 0; save(); drawBuilder(); }))
      ]));
      builder.appendChild(h('div', { style: 'font-size:1.6rem;font-weight:800;margin:.2rem 0 .6rem', text: M.chordName(ch) + '  ·  ' + M.noteName(ch.root) + ' ' + t.name }));
      const chips = h('div', { class: 'chips' });
      M.chordNotes(ch).forEach((n, i) => chips.appendChild(h('div', { class: 'chip' + (i === 0 ? ' root' : '') }, [h('b', { text: M.noteName(n) }), h('small', { text: M.intervalLabel(t.ivs[i]) })])));
      builder.appendChild(chips);
      const info = INFO[sel.type] || {};
      builder.appendChild(h('dl', { class: 'facts' }, [
        h('dt', { text: 'Formule' }), h('dd', { text: t.ivs.map(M.intervalLabel).join(' – ') }),
        h('dt', { text: 'Empilement' }), h('dd', { text: stackDesc(ch) }),
        h('dt', { text: 'Son' }), h('dd', { text: info.sound || '' }),
        h('dt', { text: 'Utilisation' }), h('dd', { text: info.use || '' })
      ]));

      // Renversements
      const invRow = h('div', { class: 'btn-row', style: 'margin-bottom:.6rem' });
      ['État fondamental', '1er renversement', '2e renversement', '3e renversement', '4e renversement', '5e renversement'].slice(0, Math.min(nInv, 4)).forEach((l, i) => {
        const b = h('button', { class: 'btn small' + (sel.inv === i ? ' primary' : ''), text: l });
        b.addEventListener('click', () => { sel.inv = i; save(); drawBuilder(); });
        invRow.appendChild(b);
      });
      builder.appendChild(invRow);
      const list = chordMidis(ch, sel.inv);
      const bass = list[0].note;
      if (sel.inv > 0) builder.appendChild(h('p', { class: 'hint', text: `Basse = ${M.noteName(bass)} : on l’écrit ${M.chordName(Object.assign({}, ch, { bass }))}.` }));
      const staffBox = h('div', { class: 'staff-box' });
      builder.appendChild(staffBox);
      const octOf = (x) => Math.round((x.midi - M.NATURAL_PC[x.note.letter] - x.note.acc) / 12) - 1;
      const col = (x) => (M.pcOf(x.note) === M.pcOf(ch.root) ? 'var(--root)' : null);
      const stacked = list.map((x, i) => ({ note: x.note, octave: octOf(x), col: 0, accShift: i % 2 ? 12 : 0, color: col(x) }));
      // secondes dans l'accord : on décale la tête de note vers la droite
      stacked.forEach((n, i) => {
        const prev = stacked[i - 1];
        if (prev && !prev.xShift && Staff.dia(n.note, n.octave) - Staff.dia(prev.note, prev.octave) === 1) n.xShift = 15;
      });
      const spread = list.map((x, i) => ({ note: x.note, octave: octOf(x), col: i + 1.4, label: M.noteName(x.note), color: col(x) }));
      Staff.render(staffBox, stacked.concat(spread), { clef: 'treble', spacing: 46, stems: false });
      const playTog = h('button', { class: 'btn primary', text: '▶ Ensemble' });
      playTog.addEventListener('click', () => list.forEach((x) => Audio2.play(x.midi, { dur: 1.8 })));
      const playArp = h('button', { class: 'btn', text: '▶ Arpège' });
      playArp.addEventListener('click', () => Audio2.playSequence(list.map((x) => x.midi), { gap: 0.3, dur: 0.9 }));
      const gtr = h('a', { class: 'btn', href: '#/guitare/accords', text: '🎸 Doigtés à la guitare' });
      gtr.addEventListener('click', () => App.save('dictSel', Object.assign(App.store('dictSel', {}), { tab: 'all', root: sel.root, type: sel.type })));
      builder.appendChild(h('div', { class: 'btn-row', style: 'margin-top:.75rem' }, [playTog, playArp, gtr]));
    }
    drawBuilder();

    /* ---------- Explications ---------- */
    const sec = (title, children) => el.appendChild(h('div', { class: 'card', style: 'margin-top:1rem' }, [h('h2', { style: 'margin-top:0', text: title })].concat(children)));
    const table = (head, rows) => h('div', { class: 'table-scroll' }, [h('table', { class: 'simple' }, [h('tr', {}, head.map((x) => h('th', { text: x })))].concat(rows.map((r) => h('tr', {}, r.map((x) => h('td', { html: x }))))))]);

    sec('1. Le principe : empiler des tierces', [
      h('p', { html: 'Un accord, c’est au moins <b>trois notes jouées ensemble</b>. On le construit en partant de la <b>fondamentale</b> (la note qui donne son nom à l’accord) et en ajoutant une note sur deux de la gamme : c’est un empilement de <b>tierces</b>.' }),
      h('p', { html: 'Il existe deux sortes de tierces : la <b>tierce majeure</b> (2 tons = 4 demi-tons, ex. Do → Mi) et la <b>tierce mineure</b> (1 ton ½ = 3 demi-tons, ex. Mi → Sol). C’est leur ordre qui donne la couleur de l’accord.' }),
      h('p', { html: 'Exemple dans la gamme de Do : <b>Do</b> (1) – Ré – <b>Mi</b> (3) – Fa – <b>Sol</b> (5) → Do majeur = Do Mi Sol.' })
    ]);
    sec('2. Les 4 triades', [
      table(['Accord', 'Formule', 'Empilement', 'Exemple (Do)', 'Son'], [
        ['Majeur', '1 – 3 – 5', '3ce M + 3ce m', 'Do Mi Sol', INFO.maj.sound],
        ['Mineur', '1 – ♭3 – 5', '3ce m + 3ce M', 'Do Mi♭ Sol', INFO.min.sound],
        ['Diminué', '1 – ♭3 – ♭5', '3ce m + 3ce m', 'Do Mi♭ Sol♭', INFO.dim.sound],
        ['Augmenté', '1 – 3 – ♯5', '3ce M + 3ce M', 'Do Mi Sol♯', INFO.aug.sound]
      ]),
      h('p', { class: 'hint', html: 'Astuce : entre majeur et mineur, <b>une seule note change</b> : la tierce descend d’un demi-ton.' })
    ]);
    sec('3. Accords suspendus et power chords', [
      h('p', { html: 'Dans un accord <b>sus</b>, on remplace la tierce par la <b>seconde</b> (sus2 : Do Ré Sol) ou la <b>quarte</b> (sus4 : Do Fa Sol). Sans tierce, l’accord n’est ni majeur ni mineur : il est « suspendu » et veut souvent se résoudre sur l’accord normal.' }),
      h('p', { html: 'Le <b>power chord</b> (C5) ne garde que la fondamentale et la quinte (Do Sol), souvent doublée à l’octave. Très utilisé avec la saturation, car il reste net.' })
    ]);
    sec('4. Les accords de septième', [
      h('p', { html: 'On ajoute une quatrième note, encore une tierce au-dessus : la <b>septième</b>. Elle peut être majeure (7 : Si sur Do) ou mineure (♭7 : Si♭ sur Do).' }),
      table(['Accord', 'Symbole', 'Formule', 'Exemple (Do)', 'Rôle'], [
        ['Septième (de dominante)', 'C7', '1 3 5 ♭7', 'Do Mi Sol Si♭', INFO['7'].use],
        ['Septième majeure', 'Cmaj7, CΔ, C7M', '1 3 5 7', 'Do Mi Sol Si', INFO.maj7.use],
        ['Mineur septième', 'Cm7, C-7', '1 ♭3 5 ♭7', 'Do Mi♭ Sol Si♭', INFO.m7.use],
        ['Demi-diminué', 'Cm7♭5, Cø', '1 ♭3 ♭5 ♭7', 'Do Mi♭ Sol♭ Si♭', INFO.m7b5.use],
        ['Diminué septième', 'Cdim7, C°7', '1 ♭3 ♭5 𝄫7', 'Do Mi♭ Sol♭ Si𝄫 (= La)', INFO.dim7.use],
        ['Mineur 7e majeure', 'Cm(maj7)', '1 ♭3 5 7', 'Do Mi♭ Sol Si', INFO.mMaj7.use]
      ]),
      h('p', { class: 'hint', html: 'Attention au piège : <b>C7</b> a une septième <i>mineure</i> (Si♭). Pour la septième majeure il faut écrire <b>maj7</b> (ou 7M en France).' })
    ]);
    sec('5. Sixtes, add et extensions (9, 11, 13)', [
      h('p', { html: 'Au-delà de l’octave, les notes de la gamme prennent un nouveau numéro : <b>9 = 2</b>, <b>11 = 4</b>, <b>13 = 6</b> (une octave plus haut).' }),
      h('ul', {}, [
        h('li', { html: '<b>6</b> et <b>m6</b> : on ajoute la sixte, sans septième (C6 = Do Mi Sol La).' }),
        h('li', { html: '<b>add9</b> : on ajoute seulement la neuvième, <i>sans</i> septième (Cadd9 = Do Mi Sol Ré).' }),
        h('li', { html: '<b>9, 11, 13</b> : la septième est <i>sous-entendue</i> (C9 = Do Mi Sol Si♭ Ré). Maj9 et m9 suivent la même logique.' }),
        h('li', { html: 'À la guitare, on ne peut pas jouer 6 ou 7 notes : on <b>enlève la quinte</b> (et souvent la fondamentale si un bassiste la joue). La tierce et la septième, elles, sont essentielles.' })
      ])
    ]);
    sec('6. Les renversements', [
      h('p', { html: 'Un accord garde son nom même si ses notes changent d’ordre. Ce qui compte, c’est la note <b>la plus grave</b> (la basse) :' }),
      table(['Position', 'Basse', 'Do majeur', 'Notation'], [
        ['État fondamental', 'la fondamentale', 'Do – Mi – Sol', 'C'],
        ['1er renversement', 'la tierce', 'Mi – Sol – Do', 'C/E'],
        ['2e renversement', 'la quinte', 'Sol – Do – Mi', 'C/G']
      ]),
      h('p', { class: 'hint', text: 'La barre oblique (slash) indique la note de basse : C/E se lit « Do avec Mi à la basse ». Utilisez les boutons de renversement du constructeur pour les entendre.' })
    ]);
    sec('7. Lire un nom d’accord', [
      table(['Symbole', 'Signifie', 'En français'], [
        ['C', 'majeur', 'Do'], ['Cm, C-, Cmin', 'mineur', 'Dom'], ['C7', 'septième (♭7)', 'Do7'],
        ['Cmaj7, CM7, CΔ', 'septième majeure', 'Do7M'], ['Cm7, C-7', 'mineur septième', 'Dom7'],
        ['Cø, Cm7♭5', 'demi-diminué', 'Dom7♭5'], ['C°, Cdim', 'diminué', 'Do dim'], ['C+, Caug', 'augmenté', 'Do aug / Do5♯'],
        ['Csus4, Csus2', 'suspendu', 'Do sus4'], ['Cadd9', 'ajout de la 9e', 'Do add9'], ['C/E', 'Do avec Mi à la basse', 'Do/Mi']
      ])
    ]);

    /* ---------- Quiz ---------- */
    const quiz = h('div', { class: 'card', style: 'margin-top:1rem' });
    el.appendChild(quiz);
    const qState = { level: 0, cur: null, picked: new Set(), ok: 0, total: 0 };
    const LEVELS = [
      { name: 'Triades majeures et mineures', types: ['maj', 'min'], roots: ['C', 'D', 'E', 'F', 'G', 'A'] },
      { name: 'Les 4 triades, toutes les toniques', types: ['maj', 'min', 'dim', 'aug'], roots: M.ROOTS },
      { name: 'Septièmes', types: ['7', 'maj7', 'm7', 'm7b5'], roots: M.ROOTS },
      { name: 'Tout', types: ['maj', 'min', 'dim', 'aug', 'sus2', 'sus4', '7', 'maj7', 'm7', 'm7b5', 'dim7', '6', 'm6', 'add9'], roots: M.ROOTS }
    ];
    function newQ() {
      const L = LEVELS[qState.level];
      qState.cur = { root: M.parseNote(L.roots[Math.floor(Math.random() * L.roots.length)]), type: L.types[Math.floor(Math.random() * L.types.length)] };
      qState.picked = new Set();
      drawQuiz();
    }
    function drawQuiz(result) {
      quiz.innerHTML = '';
      quiz.appendChild(h('h2', { style: 'margin-top:0', text: '🎯 Quiz : trouve les notes de l’accord' }));
      quiz.appendChild(h('div', { class: 'toolbar' }, [
        App.field('Niveau', App.select(LEVELS.map((l, i) => ({ value: i, label: (i + 1) + '. ' + l.name })), qState.level, (v) => { qState.level = +v; newQ(); })),
        h('div', { class: 'stat' }, [h('b', { text: qState.ok + ' / ' + qState.total }), h('span', { text: 'Score' })])
      ]));
      const ch = qState.cur;
      quiz.appendChild(h('p', { style: 'font-size:1.4rem;font-weight:800', text: 'Quelles sont les notes de ' + M.chordName(ch) + ' ?' }));
      const correct = new Set(M.chordPcs(ch));
      const box = h('div', { class: 'answers' });
      for (let pc = 0; pc < 12; pc++) {
        const sharp = M.spellPc(pc, false), flat = M.spellPc(pc, true);
        const label = M.noteName(sharp) + (flat.letter !== sharp.letter ? '/' + M.noteName(flat) : '');
        const b = h('button', { class: 'btn' + (qState.picked.has(pc) ? ' primary' : ''), text: label });
        if (result) {
          if (correct.has(pc)) b.classList.add('correct');
          else if (qState.picked.has(pc)) b.classList.add('wrong');
        }
        b.addEventListener('click', () => {
          if (result) return;
          if (qState.picked.has(pc)) qState.picked.delete(pc); else qState.picked.add(pc);
          drawQuiz();
        });
        box.appendChild(b);
      }
      quiz.appendChild(box);
      const check = h('button', { class: 'btn primary', text: result ? 'Accord suivant →' : 'Vérifier' });
      check.addEventListener('click', () => {
        if (result) { newQ(); return; }
        qState.total++;
        const good = qState.picked.size === correct.size && [...correct].every((x) => qState.picked.has(x));
        if (good) qState.ok++;
        drawQuiz(good ? 'good' : 'bad');
        const list = chordMidis(ch, 0);
        list.forEach((x) => Audio2.play(x.midi, { dur: 1.5 }));
      });
      quiz.appendChild(h('div', { class: 'btn-row', style: 'margin-top:.75rem' }, [check]));
      if (result) {
        quiz.appendChild(h('div', { class: 'feedback ' + result, style: 'margin-top:.75rem', text: (result === 'good' ? '✔ Bravo ! ' : '✘ Pas tout à fait. ') + M.chordName(ch) + ' = ' + M.chordNotes(ch).map((n) => M.noteName(n)).join(' – ') + ' (' + M.CHORD_TYPES[ch.type].ivs.map(M.intervalLabel).join(' ') + ')' }));
      }
    }
    newQ();
  }

  App.register('/theorie/accords', {
    title: 'Les accords',
    subtitle: 'Comment on construit un accord, les différents types, les renversements et comment lire leur nom. Avec un constructeur interactif et un quiz.',
    render
  });
})();

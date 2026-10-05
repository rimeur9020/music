/* Dictionnaire d'accords de guitare : mes accords, accords ouverts, tous les accords. */
(function () {
  'use strict';
  const { h } = App;
  const M = Music;
  const X = Chords.X;

  function parseFrets(str) {
    const s = String(str).trim().toLowerCase();
    const parts = /\s|,|-/.test(s) ? s.split(/[\s,\-]+/).filter(Boolean) : s.split('');
    if (parts.length !== 6) return null;
    const frets = parts.map((p) => (p === 'x' ? X : parseInt(p, 10)));
    if (frets.some((f) => f !== X && (isNaN(f) || f < 0 || f > 24))) return null;
    return frets;
  }

  function fretsText(frets) {
    const big = frets.some((f) => f > 9);
    return frets.map((f) => (f === X ? 'x' : String(f))).join(big ? ' ' : '');
  }

  function makeVoicing(frets) {
    const played = frets.filter((f) => f > 0);
    const minF = played.length ? Math.min(...played) : 0;
    const atMin = frets.map((f, i) => (f === minF ? i : -1)).filter((i) => i >= 0);
    let barre = 0, barreFrom = 0;
    // barré si la même case la plus basse est sur au moins 3 cordes dont la 1re corde
    if (minF > 0 && atMin.length >= 3 && frets[5] === minF) {
      barreFrom = atMin[0];
      if (frets.slice(barreFrom).every((f) => f === X || f >= minF)) barre = minF;
    }
    return { frets, barre, barreFrom, midis: frets.map((f, i) => (f === X ? null : Chords.TUNING[i] + f)) };
  }

  function strum(v) {
    const t = Audio2.now() + 0.05;
    v.midis.forEach((m, i) => { if (m != null) Audio2.guitar(m, t + i * 0.025, 2, 0.5); });
  }

  function notesOf(v) {
    const seen = [];
    v.midis.forEach((m) => { if (m != null && seen.indexOf(m % 12) < 0) seen.push(m % 12); });
    return seen.map((pc) => M.noteName(M.spellPc(pc, [3, 8, 10].indexOf(pc) >= 0))).join(' ');
  }

  function card(title, v, extra) {
    const d = h('div', { class: 'diagram dict', title: 'Cliquer pour écouter' });
    d.appendChild(Chords.diagramSVG(title, v));
    d.appendChild(h('div', { class: 'frets', text: fretsText(v.frets) }));
    if (extra) d.appendChild(extra);
    d.addEventListener('click', (e) => { if (e.target.tagName !== 'BUTTON') strum(v); });
    return d;
  }

  const OPEN_GROUPS = [
    { title: 'Majeurs', types: ['maj'] }, { title: 'Mineurs', types: ['min'] }, { title: 'Septièmes (7)', types: ['7'] },
    { title: 'Septièmes majeures (maj7)', types: ['maj7'] }, { title: 'Mineurs septièmes (m7)', types: ['m7'] },
    { title: 'Suspendus', types: ['sus2', 'sus4'] }, { title: 'Sixtes, add9, 9', types: ['6', 'm6', 'add9', '9'] },
    { title: 'Autres (power chords, diminués…)', types: ['5', 'dim7', 'm7b5'] }
  ];

  function render(el) {
    const sel = Object.assign({ tab: 'open', root: 'C', type: 'maj', q: '' }, App.store('dictSel', {}));
    const save = () => App.save('dictSel', sel);
    const tabs = h('div', { class: 'segmented', style: 'margin-bottom:1rem' });
    const body = h('div');
    el.appendChild(tabs);
    el.appendChild(body);
    const TABS = [['mine', '⭐ Mes accords'], ['open', '🎸 Accords ouverts'], ['all', '🔎 Tous les accords']];

    function draw() {
      tabs.innerHTML = '';
      TABS.forEach(([id, l]) => {
        const b = h('button', { class: sel.tab === id ? 'on' : '', text: l });
        b.addEventListener('click', () => { sel.tab = id; save(); draw(); });
        tabs.appendChild(b);
      });
      body.innerHTML = '';
      if (sel.tab === 'mine') drawMine();
      else if (sel.tab === 'open') drawOpen();
      else drawAll();
    }

    function drawMine() {
      const fixed = (window.MY_CHORDS || []).map((c) => Object.assign({ fixed: true }, c));
      const user = App.store('myChords', []);
      const all = fixed.concat(user);
      body.appendChild(h('p', { class: 'lead', text: 'Ta collection personnelle. Ajoute un accord avec son nom et ses cases (de la grosse corde de Mi à la fine), il est enregistré dans ce navigateur.' }));
      const name = h('input', { type: 'text', placeholder: 'ex. Cadd9 ou Mon accord' });
      const frets = h('input', { type: 'text', placeholder: 'ex. x32030' });
      const note = h('input', { type: 'text', placeholder: 'facultatif (morceau, astuce…)' });
      const msg = h('div', { class: 'hint' });
      const add = h('button', { class: 'btn primary', text: '+ Ajouter' });
      add.addEventListener('click', () => {
        const f = parseFrets(frets.value);
        if (!name.value.trim()) { msg.textContent = 'Donne un nom à l’accord.'; return; }
        if (!f) { msg.textContent = 'Cases invalides : écris 6 valeurs, par ex. x32010 ou « x 10 12 12 12 10 ».'; return; }
        user.push({ name: name.value.trim(), frets: fretsText(f), note: note.value.trim() });
        App.save('myChords', user);
        draw();
      });
      frets.addEventListener('input', () => {
        const f = parseFrets(frets.value);
        msg.textContent = f ? 'Notes : ' + notesOf(makeVoicing(f)) : '';
      });
      body.appendChild(h('div', { class: 'panel' }, [
        h('div', { class: 'toolbar' }, [App.field('Nom', name), App.field('Cases (6e → 1re corde)', frets), App.field('Note', note), add]), msg
      ]));
      if (!all.length) {
        body.appendChild(h('div', { class: 'notice', text: 'Aucun accord pour l’instant. Ajoute les tiens avec le formulaire ci-dessus, ou envoie-les à Claude pour qu’ils soient intégrés au site.' }));
        return;
      }
      const grid = h('div', { class: 'diagrams' });
      all.forEach((c) => {
        const f = parseFrets(c.frets);
        if (!f) return;
        const extra = h('div', { class: 'dict-extra' });
        if (c.note) extra.appendChild(h('small', { class: 'hint', text: c.note }));
        if (!c.fixed) {
          const del = h('button', { class: 'btn small', text: 'Supprimer' });
          del.addEventListener('click', () => {
            const i = user.indexOf(c);
            if (i >= 0 && confirm('Supprimer ' + c.name + ' ?')) { user.splice(i, 1); App.save('myChords', user); draw(); }
          });
          extra.appendChild(del);
        }
        grid.appendChild(card(c.name, makeVoicing(f), extra));
      });
      body.appendChild(grid);
    }

    function drawOpen() {
      body.appendChild(h('p', { class: 'lead', text: 'Les accords ouverts utilisent des cordes à vide (o) : ce sont les premiers à apprendre, ils sonnent pleins et sont faciles à enchaîner.' }));
      const list = Chords.openChords().filter((c) => !(c.voicing.barre && c.voicing.frets.indexOf(0) < 0));
      OPEN_GROUPS.forEach((g) => {
        const items = list.filter((c) => g.types.indexOf(c.chord.type) >= 0)
          .sort((a, b) => M.mod(M.pcOf(a.chord.root) - 0, 12) - M.mod(M.pcOf(b.chord.root) - 0, 12));
        if (!items.length) return;
        const grid = h('div', { class: 'diagrams' });
        items.forEach((c) => grid.appendChild(card(M.chordName(c.chord), c.voicing)));
        body.appendChild(h('div', { class: 'card', style: 'margin-bottom:1rem' }, [h('h3', { text: g.title }), grid]));
      });
      body.appendChild(h('p', { class: 'hint', text: 'Le Fa (F) et le Si mineur (Bm) se jouent avec un barré : tu les trouveras dans « Tous les accords ».' }));
    }

    function drawAll() {
      const types = Object.keys(M.CHORD_TYPES).filter((t) => Chords.E_SHAPES[t] || Chords.A_SHAPES[t]);
      body.appendChild(h('div', { class: 'toolbar' }, [
        App.field('Fondamentale', App.select(M.ROOTS.map((r) => ({ value: r, label: M.noteName(M.parseNote(r)) })), sel.root, (v) => { sel.root = v; save(); draw(); })),
        App.field('Type', App.select(types.map((t) => ({ value: t, label: (M.CHORD_TYPES[t].suffix ? M.CHORD_TYPES[t].suffix + ' — ' : '') + M.CHORD_TYPES[t].name })), types.indexOf(sel.type) >= 0 ? sel.type : 'maj', (v) => { sel.type = v; save(); draw(); }))
      ]));
      const ch = { root: M.parseNote(sel.root), type: types.indexOf(sel.type) >= 0 ? sel.type : 'maj' };
      body.appendChild(h('p', {}, [h('b', { style: 'font-size:1.3rem', text: M.chordName(ch) }), document.createTextNode('  ·  notes : ' + M.chordNotes(ch).map((n) => M.noteName(n)).join(' – ') + '  ·  formule ' + M.CHORD_TYPES[ch.type].ivs.map(M.intervalLabel).join(' '))]));
      const grid = h('div', { class: 'diagrams' });
      Chords.allVoicings(ch).forEach((v) => grid.appendChild(card(M.chordName(ch), v, h('small', { class: 'hint', text: v.label }))));
      body.appendChild(grid);
      const link = h('a', { href: '#/theorie/accords', text: 'Comment est construit cet accord ? →' });
      link.addEventListener('click', () => App.save('chordSel', { root: sel.root, type: ch.type, inv: 0 }));
      body.appendChild(h('p', { style: 'margin-top:1rem' }, [link]));
      body.appendChild(h('p', { class: 'hint', text: 'Les formes barrées se déplacent sur tout le manche : la fondamentale est sur la 6e corde (forme de Mi) ou sur la 5e corde (forme de La).' }));
    }

    draw();
  }

  App.register('/guitare/accords', {
    title: 'Dictionnaire d’accords',
    subtitle: 'Tes accords, les accords ouverts, et n’importe quel accord dans toutes les tonalités. Clique sur un diagramme pour l’écouter.',
    render
  });

  window.ChordDict = { parseFrets, makeVoicing, fretsText };
})();

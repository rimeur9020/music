/* Encyclopédie des gammes (partie théorie). */
(function () {
  'use strict';
  const { h } = App;
  const M = Music;

  const MAJOR = ['1', '2', '3', '4', '5', '6', '7'];

  function differences(scale) {
    if (scale.id === 'major') return 'C’est la référence.';
    const diffs = [];
    const byDeg = {};
    scale.intervals.forEach((iv) => { const d = M.parseInterval(iv).deg; (byDeg[d] = byDeg[d] || []).push(iv); });
    for (let d = 1; d <= 7; d++) {
      const ivs = byDeg[d] || [];
      if (!ivs.length) diffs.push('sans ' + d);
      ivs.forEach((iv) => { if (iv !== MAJOR[d - 1]) diffs.push(M.intervalLabel(iv)); });
    }
    return 'Par rapport à la gamme majeure : ' + diffs.join(', ') + '.';
  }

  function render(el) {
    const sel = App.store('scaleSel', { id: 'major', root: 'C' });
    const layout = h('div', { class: 'scale-layout' });
    const list = h('nav', { class: 'scale-list', 'aria-label': 'Gammes' });
    const detail = h('div');
    layout.appendChild(list);
    layout.appendChild(detail);
    el.appendChild(layout);

    let fam = null;
    M.SCALES.forEach((s) => {
      if (s.family !== fam) { fam = s.family; list.appendChild(h('div', { class: 'family', text: fam })); }
      const b = h('button', { text: s.name, 'data-id': s.id });
      b.addEventListener('click', () => { sel.id = s.id; App.save('scaleSel', sel); draw(); detail.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
      list.appendChild(b);
    });

    function draw() {
      const scale = M.scaleById(sel.id) || M.SCALES[0];
      [...list.querySelectorAll('button')].forEach((b) => b.classList.toggle('on', b.dataset.id === scale.id));
      const notes = M.scaleNotes(sel.root, scale);
      detail.innerHTML = '';
      const rootSel = App.select(M.ROOTS.map((r) => ({ value: r, label: M.noteName(M.parseNote(r)) })), sel.root, (v) => { sel.root = v; App.save('scaleSel', sel); draw(); });
      detail.appendChild(h('div', { class: 'card' }, [
        h('div', { class: 'toolbar' }, [
          h('div', {}, [h('h2', { style: 'margin:0', text: M.noteName(M.parseNote(sel.root)) + ' ' + scale.name.toLowerCase() }), scale.alias ? h('div', { class: 'muted', text: scale.alias }) : null]),
          App.field('Tonique', rootSel)
        ]),
        h('p', { text: scale.desc }),
        (() => {
          const chips = h('div', { class: 'chips' });
          notes.forEach((n, i) => chips.appendChild(h('div', { class: 'chip' + (i === 0 ? ' root' : '') }, [h('b', { text: M.noteName(n) }), h('small', { text: M.intervalLabel(scale.intervals[i]) })])));
          return chips;
        })(),
        h('dl', { class: 'facts' }, [
          h('dt', { text: 'Formule' }), h('dd', { class: 'steps', text: M.scaleSteps(scale).join(' – ') }),
          h('dt', { text: 'Intervalles' }), h('dd', { text: scale.intervals.map(M.intervalLabel).join(' ') }),
          h('dt', { text: 'Différence' }), h('dd', { text: differences(scale) }),
          h('dt', { text: 'Couleur' }), h('dd', { text: scale.mood }),
          h('dt', { text: 'Styles' }), h('dd', { text: scale.usage }),
          h('dt', { text: 'Sur quels accords' }), h('dd', { text: scale.chords }),
          h('dt', { text: 'Astuce' }), h('dd', { text: scale.tip })
        ])
      ]));

      // Portée + écoute
      let oct = 4;
      const staffNotes = [];
      let prevMidi = -1;
      notes.concat([notes[0]]).forEach((n, i) => {
        let m = M.noteToMidi(n, oct);
        while (m <= prevMidi) { oct++; m = M.noteToMidi(n, oct); }
        if (i === 0 && m > 66) { oct--; m = M.noteToMidi(n, oct); }
        prevMidi = m;
        staffNotes.push({ note: n, octave: oct, midi: m, label: M.noteName(n), color: i === 0 || i === notes.length ? 'var(--root)' : null });
      });
      const staffBox = h('div', { class: 'staff-box', style: 'max-width:none' });
      const playUp = h('button', { class: 'btn primary', text: '▶ Écouter (montante)' });
      const playDown = h('button', { class: 'btn', text: '▶ Descendante' });
      playUp.addEventListener('click', () => Audio2.playSequence(staffNotes.map((n) => n.midi), { gap: 0.35, dur: 0.6 }));
      playDown.addEventListener('click', () => Audio2.playSequence(staffNotes.map((n) => n.midi).reverse(), { gap: 0.35, dur: 0.6 }));
      const fretLink = h('a', { class: 'btn', href: '#/guitare/manche', text: '🎸 Voir sur le manche' });
      fretLink.addEventListener('click', () => App.save('fretSel', Object.assign(App.store('fretSel', {}), { scale: scale.id, root: sel.root, position: 'all' })));
      detail.appendChild(h('div', { class: 'card', style: 'margin-top:1rem' }, [
        h('h3', { text: 'Sur la portée' }), staffBox, h('div', { class: 'btn-row', style: 'margin-top:.75rem' }, [playUp, playDown, fretLink])
      ]));
      Staff.render(staffBox, staffNotes, { clef: 'treble', spacing: 44, stems: false });

      // Accords de la gamme
      if (scale.intervals.length === 7) {
        const triads = M.diatonicChords(sel.root, scale, false);
        const sevenths = M.diatonicChords(sel.root, scale, true);
        const table = h('table', { class: 'simple' });
        table.appendChild(h('tr', {}, ['Degré', 'Triade', 'Septième', ''].map((t) => h('th', { text: t }))));
        triads.forEach((c, i) => {
          const play = h('button', { class: 'btn small', text: '▶' });
          play.addEventListener('click', () => {
            const ch = sevenths[i];
            let base = M.noteToMidi(ch.root, 3);
            if (base < 48) base += 12;
            const pcs = M.chordPcs(ch.type === 'mMaj7' ? { root: ch.root, type: 'min' } : ch);
            const r = M.pcOf(ch.root);
            Audio2.playSequence([pcs.map((pc) => base + M.mod(pc - r, 12))], { dur: 1.6 });
          });
          table.appendChild(h('tr', {}, [
            h('td', { text: c.roman }), h('td', { text: M.chordName(c) }),
            h('td', { text: sevenths[i].type === 'mMaj7' ? M.noteName(sevenths[i].root) + 'm(maj7)' : M.chordName(sevenths[i]) }),
            h('td', {}, [play])
          ]));
        });
        detail.appendChild(h('div', { class: 'card', style: 'margin-top:1rem' }, [
          h('h3', { text: 'Accords construits sur la gamme' }),
          h('p', { class: 'hint', text: 'On empile une note sur deux de la gamme (tierces). Ce sont les accords « naturels » d’un morceau dans cette tonalité.' }),
          h('div', { class: 'table-scroll' }, [table])
        ]));
      }

      // Rappel modes
      if (scale.family === 'Majeure & modes') {
        const t = h('table', { class: 'simple' });
        t.appendChild(h('tr', {}, ['Degré', 'Mode', 'Exemple (notes de Do majeur)', 'Couleur'].map((x) => h('th', { text: x }))));
        M.SCALES.filter((s) => s.family === 'Majeure & modes').map((s) => s).sort((a, b) => modeIndex(a) - modeIndex(b)).forEach((s) => {
          const i = modeIndex(s);
          t.appendChild(h('tr', { style: s.id === scale.id ? 'font-weight:700' : '' }, [
            h('td', { text: String(i + 1) }), h('td', { text: s.name }),
            h('td', { text: M.noteName({ letter: i, acc: 0 }) + ' → ' + M.noteName({ letter: i, acc: 0 }) }), h('td', { text: s.mood })
          ]));
        });
        detail.appendChild(h('div', { class: 'card', style: 'margin-top:1rem' }, [
          h('h3', { text: 'Les 7 modes de la gamme majeure' }),
          h('p', { class: 'hint', text: 'Mêmes notes, point de départ différent : chaque mode a sa propre couleur parce que la fondamentale change.' }),
          h('div', { class: 'table-scroll' }, [t])
        ]));
      }
    }

    function modeIndex(s) { return ['major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'minor', 'locrian'].indexOf(s.id); }

    draw();
  }

  App.register('/theorie/gammes', {
    title: 'Les gammes',
    subtitle: 'Chaque gamme expliquée : formule, intervalles, couleur, quand l’utiliser. Choisis la tonique pour voir les notes.',
    render
  });
})();

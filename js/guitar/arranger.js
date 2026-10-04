/* Partition -> accompagnement guitare (accords + rythmique + PDF). */
(function () {
  'use strict';
  const { h } = App;
  const M = Music;

  const EXAMPLE = [
    '// Au clair de la lune — une ligne par partie, mesures séparées par |',
    'A: do do do ré | mi:2 ré:2 | do mi ré ré | do:4',
    'A: do do do ré | mi:2 ré:2 | do mi ré ré | do:4',
    'B: ré ré ré ré | la:2 la:2 | ré do si la | sol:4',
    'A: do do do ré | mi:2 ré:2 | do mi ré ré | do:4'
  ].join('\n');

  const st = {
    tab: 'scan', song: null, order: [], key: null, bars: null, parts: [], pickup: false, overrides: {},
    imageUrl: null, imageType: null, text: '', errors: [], patternId: null, player: null,
    settings: Object.assign({ title: '', composer: '', style: 'pop', tempo: 90, beats: 4, beatType: 4, rhythm: 'auto', color: 'auto', useScoreChords: true, tonic: null, mode: null }, App.store('arrSettings', {}))
  };

  function saveSettings() {
    const s = Object.assign({}, st.settings);
    delete s.title; delete s.composer; delete s.tonic; delete s.mode;
    App.save('arrSettings', s);
  }

  function name(ch, ascii) { return M.chordName(ch, ascii ? { ascii: true } : undefined); }

  function render(el) {
    st.text = st.text || App.store('arrText', '');

    /* ---------------- 1. Partition ---------------- */
    const p1 = h('section', { class: 'panel' });
    const p2 = h('section', { class: 'panel' });
    const p3 = h('section', { class: 'panel' });
    const p4 = h('section', { class: 'panel' });
    el.appendChild(p1); el.appendChild(p2); el.appendChild(p3); el.appendChild(p4);

    function drawSource() {
      p1.innerHTML = '';
      p1.appendChild(h('h2', { text: '1. La partition' }));
      const tabs = h('div', { class: 'segmented', style: 'margin-bottom:1rem' });
      [['scan', '📷 Scanner / photo'], ['xml', '📄 Fichier MusicXML'], ['text', '⌨️ Saisie des notes']].forEach(([id, l]) => {
        const b = h('button', { class: st.tab === id ? 'on' : '', text: l });
        b.addEventListener('click', () => { st.tab = id; drawSource(); });
        tabs.appendChild(b);
      });
      p1.appendChild(tabs);
      if (st.tab === 'scan') drawScanTab();
      else if (st.tab === 'xml') drawXmlTab();
      else drawTextTab(p1);
    }

    function fileInput(accept, onFile, label, capture) {
      const inp = h('input', { type: 'file', accept, style: 'display:none' });
      if (capture) inp.setAttribute('capture', 'environment');
      inp.addEventListener('change', () => { if (inp.files[0]) onFile(inp.files[0]); inp.value = ''; });
      const btn = h('button', { class: 'btn primary', text: label });
      btn.addEventListener('click', () => inp.click());
      return h('span', {}, [inp, btn]);
    }

    function dropzone(onFile, text) {
      const dz = h('div', { class: 'dropzone', text });
      dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('drag'); });
      dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
      dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('drag'); if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]); });
      return dz;
    }

    function onAnyFile(file) {
      if (/\.(musicxml|xml|mxl)$/i.test(file.name)) { st.tab = 'xml'; loadXml(file); return; }
      if (st.imageUrl) URL.revokeObjectURL(st.imageUrl);
      st.imageUrl = URL.createObjectURL(file);
      st.imageType = file.type;
      st.tab = 'scan';
      drawSource();
    }

    function drawScanTab() {
      p1.appendChild(h('div', { class: 'notice' }, [
        h('b', { text: 'Comment scanner ta partition : ' }),
        document.createTextNode('prends la partition en photo (ou choisis un PDF / une image). La lecture automatique des notes d’une photo demande un logiciel de reconnaissance de partition (OMR). Deux possibilités :'),
        h('ol', {}, [
          h('li', { html: '<b>Automatique</b> : passe la photo dans une appli de scan de partition (par ex. <i>PlayScore 2</i>, <i>SmartScore NoteReader</i> ou <i>Newzik</i> sur téléphone, <i>Audiveris</i> gratuit sur ordinateur), exporte en <b>MusicXML</b>, puis importe le fichier dans l’onglet « Fichier MusicXML ».' }),
          h('li', { html: '<b>À la main</b> : la photo reste affichée ici, recopie la mélodie dans la zone de saisie à côté (c’est rapide, une ligne par partie).' })
        ])
      ]));
      p1.appendChild(h('div', { class: 'btn-row', style: 'margin-bottom:1rem' }, [
        fileInput('image/*', onAnyFile, '📷 Prendre une photo', true),
        fileInput('image/*,application/pdf,.musicxml,.xml,.mxl', onAnyFile, '🖼️ Choisir une image / un PDF')
      ]));
      const split = h('div', { class: 'split' });
      const prev = h('div', { class: 'scan-preview' });
      if (st.imageUrl) {
        if (/pdf/.test(st.imageType)) prev.appendChild(h('object', { data: st.imageUrl, type: 'application/pdf' }));
        else prev.appendChild(h('img', { src: st.imageUrl, alt: 'Partition scannée' }));
      } else prev.appendChild(dropzone(onAnyFile, 'Dépose ici une photo, un PDF ou un fichier MusicXML'));
      split.appendChild(prev);
      const right = h('div');
      drawTextTab(right, true);
      split.appendChild(right);
      p1.appendChild(split);
    }

    function drawXmlTab() {
      p1.appendChild(h('p', { class: 'hint', text: 'Formats acceptés : .musicxml, .xml, .mxl (exportés par MuseScore, Sibelius, Finale, Dorico, Guitar Pro, ou par une appli de scan de partition).' }));
      p1.appendChild(h('div', { class: 'btn-row', style: 'margin-bottom:1rem' }, [fileInput('.musicxml,.xml,.mxl,application/vnd.recordare.musicxml+xml,application/vnd.recordare.musicxml', loadXml, '📄 Choisir un fichier MusicXML')]));
      p1.appendChild(dropzone((f) => loadXml(f), 'ou dépose le fichier ici'));
      if (st.song && st.song.source === 'musicxml') {
        const s = st.song;
        const nh = s.measures.reduce((a, m) => a + m.harmonies.length, 0);
        p1.appendChild(h('div', { class: 'notice', style: 'margin-top:1rem' }, [
          h('b', { text: '✔ Partition chargée : ' }),
          document.createTextNode(`${s.title || 'sans titre'} — ${s.measures.length} mesures, ${s.beats}/${s.beatType}` + (nh ? `, ${nh} accords trouvés dans la partition` : ', pas d’accords écrits (ils seront proposés)') + '.')
        ]));
        if (s.parts.length > 1) {
          p1.appendChild(App.field('Partie à analyser (mélodie)', App.select(s.parts.map((p, i) => ({ value: i, label: p })), s.partIndex, (v) => {
            try { st.song = ScoreImport.parseMusicXML(st.xmlText, +v); afterLoad(); } catch (e) { alert(e.message); }
          })));
        }
      }
    }

    function drawTextTab(container, compact) {
      container.appendChild(h('p', { class: 'hint', html: 'Mesures séparées par <b>|</b>. Notes : <b>do ré mi fa sol la si</b> (ou C D E F G A B), avec <b>#</b> ou <b>b</b> (sib, fa#), octave facultative (do5). Durée en temps avec « : » (sol:2) — sinon la mesure est partagée en parts égales. <b>-</b> = silence, <b>%</b> = répéter la mesure précédente, <b>[Am]</b> = imposer un accord. Commence une ligne par <b>A:</b> ou <b>B:</b> pour nommer la partie.' }));
      const ta = h('textarea', { placeholder: EXAMPLE, rows: compact ? 10 : 8, spellcheck: 'false' });
      ta.value = st.text;
      ta.addEventListener('input', () => { st.text = ta.value; App.save('arrText', st.text); });
      container.appendChild(ta);
      const row = h('div', { class: 'toolbar', style: 'margin-top:.6rem' });
      const beats = h('input', { type: 'number', min: 1, max: 12, value: st.settings.beats });
      const bt = App.select([2, 4, 8].map((x) => ({ value: x, label: String(x) })), st.settings.beatType);
      row.appendChild(App.field('Temps par mesure', beats));
      row.appendChild(App.field('Unité', bt));
      const go = h('button', { class: 'btn primary', text: 'Analyser ces notes →' });
      go.addEventListener('click', () => {
        st.settings.beats = parseInt(beats.value, 10) || 4;
        st.settings.beatType = parseInt(bt.value, 10) || 4;
        const { song, errors } = ScoreImport.parseText(st.text || '', st.settings.beats, st.settings.beatType);
        st.errors = errors;
        if (!song.measures.length) { alert('Aucune mesure trouvée. Exemple :\n\n' + EXAMPLE); return; }
        song.title = st.settings.title;
        st.song = song;
        afterLoad();
      });
      const ex = h('button', { class: 'btn', text: 'Charger un exemple' });
      ex.addEventListener('click', () => {
        st.text = EXAMPLE; ta.value = EXAMPLE; st.settings.title = 'Au clair de la lune'; st.settings.composer = 'Traditionnel';
        st.settings.beats = 4; st.settings.beatType = 4; beats.value = 4; bt.value = 4;
      });
      row.appendChild(go);
      row.appendChild(ex);
      container.appendChild(row);
      if (st.errors.length) container.appendChild(h('div', { class: 'notice warn', text: st.errors.slice(0, 5).join(' · ') }));
    }

    async function loadXml(file) {
      try {
        st.xmlText = await ScoreImport.fileToXmlText(file);
        st.song = ScoreImport.parseMusicXML(st.xmlText);
        afterLoad();
      } catch (e) {
        alert('Impossible de lire ce fichier : ' + e.message);
      }
    }

    /* ---------------- Analyse ---------------- */
    function afterLoad() {
      const s = st.song;
      st.settings.title = s.title || st.settings.title || '';
      if (s.composer) st.settings.composer = s.composer;
      if (s.source === 'musicxml') { st.settings.beats = s.beats; st.settings.beatType = s.beatType; }
      if (s.tempo) st.settings.tempo = s.tempo;
      const k = Harmonizer.detectKey(s);
      st.settings.tonic = M.noteId(k.tonic);
      st.settings.mode = k.mode;
      st.order = ScoreImport.unfold(s.measures);
      const sec = Harmonizer.detectSections(s.measures, st.order);
      st.parts = sec.parts;
      st.pickup = sec.pickup;
      st.overrides = {};
      st.patternId = null;
      analyse();
      drawSource();
      drawSettings();
      p2.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function currentKey() {
      const tonic = M.parseNote(st.settings.tonic || 'C');
      return { tonic, mode: st.settings.mode || 'major' };
    }

    function analyse() {
      if (!st.song) return;
      const measures = st.order.map((i) => st.song.measures[i]);
      const fromScore = st.settings.useScoreChords ? Harmonizer.scoreChords(measures) : null;
      st.bars = fromScore || Harmonizer.harmonize(measures, currentKey(), { style: st.settings.style, rhythm: st.settings.rhythm, color: st.settings.color });
      st.barsFromScore = !!fromScore;
      drawSections();
      drawResult();
    }

    /* ---------------- 2. Réglages ---------------- */
    function drawSettings() {
      p2.innerHTML = '';
      p2.appendChild(h('h2', { text: '2. Réglages' }));
      if (!st.song) { p2.appendChild(h('p', { class: 'muted', text: 'Charge d’abord une partition (étape 1).' })); return; }
      const g = h('div', { class: 'form-grid' });
      const t = h('input', { type: 'text', value: st.settings.title || '' });
      t.addEventListener('input', () => { st.settings.title = t.value; });
      t.addEventListener('change', drawResult);
      const c = h('input', { type: 'text', value: st.settings.composer || '' });
      c.addEventListener('input', () => { st.settings.composer = c.value; });
      c.addEventListener('change', drawResult);
      g.appendChild(App.field('Titre', t));
      g.appendChild(App.field('Compositeur / interprète', c));
      g.appendChild(App.field('Tonalité', App.select(M.ROOTS.map((r) => ({ value: r, label: M.noteName(M.parseNote(r)) })), st.settings.tonic, (v) => { st.settings.tonic = v; analyse(); })));
      g.appendChild(App.field('Mode', App.select([{ value: 'major', label: 'Majeur' }, { value: 'minor', label: 'Mineur' }], st.settings.mode, (v) => { st.settings.mode = v; analyse(); })));
      g.appendChild(App.field('Style', App.select(Rhythms.STYLES.map((s) => ({ value: s.id, label: s.name })), st.settings.style, (v) => { st.settings.style = v; st.patternId = null; saveSettings(); analyse(); })));
      const tempo = h('input', { type: 'number', min: 30, max: 260, value: st.settings.tempo });
      tempo.addEventListener('change', () => { st.settings.tempo = parseInt(tempo.value, 10) || 90; st.patternId = null; drawResult(); });
      const ti = Rhythms.timeInfo(st.settings.beats, st.settings.beatType);
      g.appendChild(App.field('Tempo (pulsations / min)', tempo, ti.compound ? 'pulsation = noire pointée' : st.settings.beatType === 2 ? 'pulsation = blanche' : 'pulsation = noire'));
      g.appendChild(App.field('Accords par mesure', App.select([
        { value: 'auto', label: 'Auto (1 ou 2)' }, { value: 'bar', label: '1 par mesure' }, { value: 'half', label: '2 par mesure' }
      ], st.settings.rhythm, (v) => { st.settings.rhythm = v; saveSettings(); analyse(); })));
      g.appendChild(App.field('Couleur des accords', App.select([
        { value: 'auto', label: 'Selon le style' }, { value: 'simple', label: 'Simple (triades)' }, { value: 'rich', label: 'Enrichie (7e, add9)' },
        { value: 'jazz', label: 'Jazz (7e partout)' }, { value: 'power', label: 'Power chords (rock)' }
      ], st.settings.color, (v) => { st.settings.color = v; saveSettings(); analyse(); })));
      p2.appendChild(g);
      const has = st.song.measures.some((m) => m.harmonies.length);
      if (has) {
        const cb = h('input', { type: 'checkbox' });
        cb.checked = st.settings.useScoreChords;
        cb.addEventListener('change', () => { st.settings.useScoreChords = cb.checked; saveSettings(); st.overrides = {}; analyse(); });
        p2.appendChild(h('label', { class: 'checkbox', style: 'margin-top:.8rem' }, [cb, 'Utiliser les accords écrits sur la partition (décocher pour une nouvelle proposition)']));
      }
    }

    /* ---------------- 3. Sections ---------------- */
    function drawSections() {
      p3.innerHTML = '';
      p3.appendChild(h('h2', { text: '3. Parties du morceau' }));
      if (!st.song) { p3.appendChild(h('p', { class: 'muted', text: 'Les parties (A, B…) seront détectées automatiquement.' })); return; }
      const total = st.order.length - (st.pickup ? 1 : 0);
      p3.appendChild(h('p', { class: 'hint', text: `Découpage détecté automatiquement dans l’ordre où l’on joue le morceau (${total} mesures` + (st.pickup ? ', sans compter la levée' : '') + '). Corrige les lettres ou les longueurs si besoin : les accords de chaque lettre sont pris à sa première apparition.' }));
      const table = h('table', { class: 'simple sections-table' });
      table.appendChild(h('tr', {}, ['#', 'Partie', 'Mesures', ''].map((x) => h('th', { text: x }))));
      let sum = 0;
      st.parts.forEach((p, i) => {
        sum += p.length;
        const lab = h('input', { type: 'text', value: p.label, maxlength: 6 });
        lab.addEventListener('change', () => { p.label = lab.value.trim().toUpperCase() || 'A'; drawSections(); drawResult(); });
        const len = h('input', { type: 'number', min: 1, max: 64, value: p.length });
        len.addEventListener('change', () => { p.length = Math.max(1, parseInt(len.value, 10) || 1); drawSections(); drawResult(); });
        const del = h('button', { class: 'btn small', text: '✕', title: 'Supprimer' });
        del.addEventListener('click', () => { st.parts.splice(i, 1); drawSections(); drawResult(); });
        table.appendChild(h('tr', {}, [h('td', { text: String(i + 1) }), h('td', {}, [lab]), h('td', {}, [len]), h('td', {}, [del])]));
      });
      p3.appendChild(h('div', { class: 'table-scroll' }, [table]));
      const add = h('button', { class: 'btn small', text: '+ Ajouter une partie' });
      add.addEventListener('click', () => { st.parts.push({ label: 'A', length: Math.max(1, total - sum) }); drawSections(); drawResult(); });
      const redetect = h('button', { class: 'btn small', text: '↻ Redétecter' });
      redetect.addEventListener('click', () => { const s = Harmonizer.detectSections(st.song.measures, st.order); st.parts = s.parts; drawSections(); drawResult(); });
      p3.appendChild(h('div', { class: 'btn-row', style: 'margin-top:.6rem' }, [add, redetect]));
      if (sum !== total) p3.appendChild(h('div', { class: 'notice warn', style: 'margin-top:.6rem', text: `Attention : les parties totalisent ${sum} mesures alors que le morceau en compte ${total}.` }));
    }

    /* ---------------- 4. Résultat ---------------- */
    function sectionsData() {
      // première apparition de chaque lettre
      const out = [];
      const seen = {};
      let idx = st.pickup ? 1 : 0;
      st.parts.forEach((p) => {
        if (!seen[p.label]) {
          const bars = [];
          for (let k = 0; k < p.length; k++) {
            const ov = st.overrides[p.label + ':' + k];
            const b = st.bars[idx + k];
            bars.push(ov || (b ? b.chords.map((c) => c.chord) : []));
          }
          seen[p.label] = { label: p.label, bars, start: idx, alts: bars.map((_, k) => (st.bars[idx + k] ? [].concat(...st.bars[idx + k].chords.map((c) => c.alts || [])) : [])) };
          out.push(seen[p.label]);
        }
        idx += p.length;
      });
      return out;
    }

    function patterns() {
      return Rhythms.candidates(st.settings.style, st.settings.beats, st.settings.beatType, st.settings.tempo);
    }
    function currentPattern() {
      const list = patterns();
      return list.find((p) => p.id === st.patternId) || list[0];
    }

    function usedChords(secs) {
      const map = new Map();
      secs.forEach((s) => s.bars.forEach((b) => b.forEach((ch) => { const k = M.chordKey(ch); if (!map.has(k)) map.set(k, ch); })));
      return [...map.values()];
    }

    function capoAdvice(chords) {
      if (!chords.length) return null;
      const isOpen = (ch) => Chords.voicing(ch).score <= -10;
      const base = chords.filter(isOpen).length;
      let best = null;
      for (let capo = 1; capo <= 7; capo++) {
        const shifted = chords.map((ch) => {
          const pc = M.mod(M.pcOf(ch.root) - capo, 12);
          return { root: M.spellPc(pc, [3, 8, 10].indexOf(pc) >= 0), type: ch.type };
        });
        const n = shifted.filter(isOpen).length;
        if (n > base + 1 && (!best || n > best.n)) best = { capo, n, shapes: shifted };
      }
      return best;
    }

    function keyName() {
      const k = currentKey();
      return M.noteName(k.tonic, { ascii: true }) + (k.mode === 'major' ? ' majeur' : ' mineur');
    }

    function buildTips(secs, chords) {
      const tips = [];
      const capo = capoAdvice(chords);
      if (capo) tips.push(`Astuce : capodastre en case ${capo.capo} et joue les formes ${capo.shapes.map((c) => name(c, true)).filter((v, i, a) => a.indexOf(v) === i).join(', ')}`);
      if (st.pickup) tips.push('Le morceau commence par une levée : démarre l’accompagnement sur la 1re mesure complète');
      const style = st.settings.style;
      const styleTips = {
        rock: 'En rock, tu peux jouer les accords en power chords (fondamentale + quinte)',
        reggae: 'Reggae : étouffe chaque accord juste après l’avoir joué, la basse et la batterie font le reste',
        ska: 'Ska : coups secs sur les contretemps, main droite très régulière',
        jazz: 'Jazz : accords courts, laisse de l’espace à la mélodie',
        manouche: 'Manouche : la « pompe », temps 2 et 4 plus courts et étouffés',
        bossa: 'Bossa : joue aux doigts, pouce régulier, doigts légers',
        blues: 'Blues : croches ternaires, appuie la fin de chaque grille avant de reprendre',
        funk: 'Funk : la main droite ne s’arrête jamais, la main gauche fait les silences'
      };
      if (styleTips[style]) tips.push(styleTips[style]);
      tips.push(`Entraîne-toi d’abord à ${Math.max(40, Math.round(st.settings.tempo * 0.7))} puis monte jusqu’à ${st.settings.tempo}`);
      if (!st.barsFromScore) tips.push('Accords proposés automatiquement d’après la mélodie : fais confiance à ton oreille et modifie-les si besoin');
      return tips;
    }

    function structure() {
      const s = st.parts.map((p) => p.label);
      return (st.pickup ? ['Levée'] : []).concat(s);
    }

    function drawResult() {
      stopPlayer();
      p4.innerHTML = '';
      p4.appendChild(h('h2', { text: '4. Accompagnement proposé' }));
      if (!st.song || !st.bars) { p4.appendChild(h('p', { class: 'muted', text: 'Le résultat apparaîtra ici, avec un PDF d’une page à télécharger.' })); return; }
      const secs = sectionsData();
      const pat = currentPattern();
      const k = currentKey();
      p4.appendChild(h('p', {}, [
        h('b', { text: 'Tonalité : ' }), document.createTextNode(M.noteName(k.tonic) + (k.mode === 'major' ? ' majeur' : ' mineur') + '   ·   '),
        h('b', { text: 'Mesure : ' }), document.createTextNode(st.settings.beats + '/' + st.settings.beatType + '   ·   '),
        h('b', { text: 'Tempo : ' }), document.createTextNode(String(st.settings.tempo)),
        st.barsFromScore ? h('span', { class: 'muted', text: '   ·   accords de la partition' }) : null
      ]));

      // Rythmique
      const pats = patterns();
      const rhythmBox = h('div', { class: 'card', style: 'margin-bottom:1rem' });
      rhythmBox.appendChild(h('div', { class: 'toolbar' }, [
        App.field('Rythmique', App.select(pats.map((p) => ({ value: p.id, label: p.name })), pat.id, (v) => { st.patternId = v; drawResult(); }))
      ]));
      const grid = h('div', { class: 'rhythm-grid' });
      const cnt = Rhythms.counts(pat, st.settings.beats, st.settings.beatType);
      const bs = Rhythms.beatStarts(pat, st.settings.beats, st.settings.beatType);
      pat.slots.forEach((s, i) => grid.appendChild(h('div', { class: 'slot' + (bs[i] ? ' beat' : '') }, [h('div', { class: 'sym', text: Rhythms.symbolText(s) }), h('div', { class: 'cnt', text: cnt[i] })])));
      rhythmBox.appendChild(grid);
      rhythmBox.appendChild(h('p', { style: 'margin:.6rem 0 .2rem', text: pat.desc + (pat.feel ? ' Croches ' + (pat.feel === 'shuffle' ? 'shuffle' : 'swing') + ' (longue-courte).' : '') }));
      rhythmBox.appendChild(h('p', { class: 'hint', text: Rhythms.legend(pat).join(' · ') }));
      const playPat = h('button', { class: 'btn small', text: '▶ Écouter la rythmique (accord de tonique)' });
      playPat.addEventListener('click', () => {
        const tonicChord = secs[0] && secs[0].bars[0] && secs[0].bars[0][0] ? secs[0].bars[0][0] : { root: k.tonic, type: k.mode === 'major' ? 'maj' : 'min' };
        const v = Chords.voicing(tonicChord).midis;
        play([{ chords: [v] }, { chords: [v] }], grid);
      });
      rhythmBox.appendChild(playPat);
      p4.appendChild(rhythmBox);

      // Sections
      secs.forEach((sec) => {
        const box = h('div', { class: 'card', style: 'margin-bottom:1rem' });
        const playSec = h('button', { class: 'btn small', text: '▶ Écouter' });
        playSec.addEventListener('click', () => play(sec.bars.map((b) => ({ chords: b.map((c) => Chords.voicing(c).midis) })), grid));
        box.appendChild(h('div', { class: 'toolbar', style: 'align-items:center' }, [
          h('div', {}, [h('span', { class: 'section-tag', text: sec.label }), h('b', { text: 'Partie ' + sec.label }), h('span', { class: 'muted', text: ' · ' + sec.bars.length + ' mesures' })]),
          playSec
        ]));
        const cg = h('div', { class: 'chord-grid' });
        sec.bars.forEach((b, bi) => {
          const bar = h('div', { class: 'bar' }, [h('span', { class: 'num', text: String(bi + 1) })]);
          if (!b.length) b = [];
          const prevSame = bi > 0 && sec.bars[bi - 1].map(M.chordKey).join() === b.map(M.chordKey).join();
          (b.length ? b : [null]).forEach((ch) => {
            const btn = h('button', { class: 'chord' + (prevSame ? ' repeat' : ''), text: ch ? name(ch) : '—', title: 'Cliquer pour changer' });
            btn.addEventListener('click', (e) => openMenu(e, sec, bi));
            bar.appendChild(btn);
          });
          cg.appendChild(bar);
        });
        box.appendChild(cg);
        p4.appendChild(box);
      });

      // Diagrammes
      const chords = usedChords(secs);
      const dg = h('div', { class: 'diagrams' });
      chords.forEach((ch) => {
        const d = h('div', { class: 'diagram' });
        d.appendChild(Chords.diagramSVG(name(ch), Chords.voicing(ch)));
        d.addEventListener('click', () => { const v = Chords.voicing(ch); v.midis.forEach((m, i) => m != null && Audio2.guitar(m, Audio2.now() + 0.05 + i * 0.02, 1.8, 0.5)); });
        d.style.cursor = 'pointer';
        dg.appendChild(d);
      });
      p4.appendChild(h('div', { class: 'card', style: 'margin-bottom:1rem' }, [h('h3', { text: 'Accords à connaître' }), h('p', { class: 'hint', text: 'Clique sur un diagramme pour l’entendre.' }), dg]));

      const struct = structure();
      const tips = buildTips(secs, chords);
      p4.appendChild(h('div', { class: 'card', style: 'margin-bottom:1rem' }, [
        h('h3', { text: 'Structure' }), h('p', { style: 'font-size:1.3rem;font-weight:700', text: struct.join(' – ') }),
        h('ul', {}, tips.map((t) => h('li', { text: t })))
      ]));

      const playAll = h('button', { class: 'btn', text: '▶ Écouter tout le morceau' });
      playAll.addEventListener('click', () => {
        const bars = [];
        const bySec = {};
        secs.forEach((s) => { bySec[s.label] = s; });
        st.parts.forEach((p) => {
          const s = bySec[p.label];
          for (let i = 0; i < p.length; i++) {
            const b = s.bars[Math.min(i, s.bars.length - 1)] || [];
            bars.push({ chords: b.map((c) => Chords.voicing(c).midis) });
          }
        });
        play(bars, grid);
      });
      const stop = h('button', { class: 'btn', text: '■ Stop' });
      stop.addEventListener('click', stopPlayer);
      const pdfBtn = h('button', { class: 'btn primary', text: '⬇ Télécharger le PDF' });
      pdfBtn.addEventListener('click', async () => {
        const doc = await makePdf(secs, chords, pat, struct, tips);
        doc.save(((st.settings.title || 'accompagnement').replace(/[^\w\- àâäéèêëïîôöùûüç]/gi, '').trim() || 'accompagnement') + ' - guitare.pdf');
      });
      const prevBtn = h('button', { class: 'btn', text: '👁 Aperçu du PDF' });
      prevBtn.addEventListener('click', async () => {
        const win = window.open('', '_blank');
        const doc = await makePdf(secs, chords, pat, struct, tips);
        const url = doc.output('bloburl');
        if (win) win.location.href = url; else location.href = url;
      });
      p4.appendChild(h('div', { class: 'btn-row' }, [pdfBtn, prevBtn, playAll, stop]));
    }

    async function makePdf(secs, chords, pat, struct, tips) {
      if (!window.jspdf) await ScoreImport.loadScript('vendor/jspdf.umd.min.js');
      const ti = Rhythms.timeInfo(st.settings.beats, st.settings.beatType);
      const sheet = {
        title: st.settings.title, composer: st.settings.composer,
        info: [
          ['Tonalité', keyName()], ['Mesure', st.settings.beats + '/' + st.settings.beatType],
          ['Tempo', st.settings.tempo + (ti.compound ? ' (noire pointée)' : st.settings.beatType === 2 ? ' (blanche)' : ' (noire)')],
          ['Style', (Rhythms.STYLES.find((s) => s.id === st.settings.style) || {}).name || '']
        ],
        pattern: pat, patternDesc: pat.desc, counts: Rhythms.counts(pat, st.settings.beats, st.settings.beatType),
        beatStarts: Rhythms.beatStarts(pat, st.settings.beats, st.settings.beatType), legend: Rhythms.legend(pat, true),
        sections: secs.map((s) => ({ label: s.label, bars: s.bars.map((b) => b.map((c) => name(c, true))) })),
        structure: struct, chords: chords.map((c) => ({ name: name(c, true), voicing: Chords.voicing(c) })), tips
      };
      return SheetPDF.build(sheet);
    }

    function play(bars, grid) {
      stopPlayer();
      const pat = currentPattern();
      st.player = Rhythms.playBars(bars, pat, {
        beats: st.settings.beats, beatType: st.settings.beatType, tempo: st.settings.tempo,
        onSlot(bi, i) { [...grid.children].forEach((c, j) => c.classList.toggle('active', j === i)); },
        onEnd() { [...grid.children].forEach((c) => c.classList.remove('active')); }
      });
    }
    function stopPlayer() { if (st.player) { st.player.stop(); st.player = null; } }

    let menu = null;
    function closeMenu() { if (menu) { menu.remove(); menu = null; document.removeEventListener('click', outside, true); } }
    function outside(e) { if (menu && !menu.contains(e.target)) closeMenu(); }
    function openMenu(e, sec, bi) {
      closeMenu();
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      menu = h('div', { class: 'chord-menu' });
      menu.style.left = Math.min(window.scrollX + rect.left, window.scrollX + document.documentElement.clientWidth - 330) + 'px';
      menu.style.top = (window.scrollY + rect.bottom + 4) + 'px';
      const set = (chords) => { st.overrides[sec.label + ':' + bi] = chords; closeMenu(); drawResult(); };
      const seen = new Set();
      const cur = sec.bars[bi];
      const alts = (sec.alts[bi] || []).filter((c) => { const kk = M.chordKey(c); if (seen.has(kk)) return false; seen.add(kk); return true; });
      alts.forEach((c, i) => {
        const b = h('button', { class: i === 0 ? 'best' : '', text: name(c) });
        b.addEventListener('click', () => set([c]));
        menu.appendChild(b);
      });
      const inp = h('input', { type: 'text', value: cur.map((c) => name(c, true)).join(' '), placeholder: 'ex. Am7 ou C G' });
      const ok = h('button', { text: 'OK' });
      const apply = () => {
        const parts = inp.value.trim().split(/\s+/).filter(Boolean);
        const chords = parts.map((p) => ScoreImport.parseChord(p));
        if (!parts.length || chords.some((c) => !c)) { inp.style.borderColor = 'var(--bad)'; return; }
        set(chords);
      };
      ok.addEventListener('click', apply);
      inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') apply(); });
      menu.appendChild(h('div', { style: 'width:100%;display:flex;gap:.3rem;margin-top:.3rem' }, [inp, ok]));
      menu.appendChild(h('small', { class: 'hint', text: 'Plusieurs accords dans la mesure : sépare-les par un espace.' }));
      if (st.overrides[sec.label + ':' + bi]) {
        const reset = h('button', { text: '↺ Proposition d’origine' });
        reset.addEventListener('click', () => { delete st.overrides[sec.label + ':' + bi]; closeMenu(); drawResult(); });
        menu.appendChild(reset);
      }
      document.body.appendChild(menu);
      inp.focus();
      setTimeout(() => document.addEventListener('click', outside, true), 0);
    }

    drawSource();
    drawSettings();
    drawSections();
    drawResult();
    return { destroy() { stopPlayer(); closeMenu(); } };
  }

  let inst = null;
  App.register('/guitare/accompagnement', {
    title: 'Partition → accompagnement guitare',
    subtitle: 'Scanne ou importe une partition : le site propose des accords et une rythmique adaptée au style et au tempo, puis crée une fiche PDF d’une page.',
    render(el) { inst = render(el); },
    destroy() { inst && inst.destroy(); }
  });

  window.Arranger = { EXAMPLE };
})();

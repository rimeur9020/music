/* Lecture de partitions : MusicXML (.musicxml / .xml / .mxl) et saisie texte. */
(function () {
  'use strict';
  const M = Music;

  const STEP_LETTER = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

  const KIND_MAP = {
    major: 'maj', minor: 'min', augmented: 'aug', diminished: 'dim', dominant: '7', 'major-seventh': 'maj7',
    'minor-seventh': 'm7', 'diminished-seventh': 'dim7', 'augmented-seventh': 'aug', 'half-diminished': 'm7b5',
    'major-minor': 'mMaj7', 'major-sixth': '6', 'minor-sixth': 'm6', 'dominant-ninth': '9', 'major-ninth': 'maj7',
    'minor-ninth': 'm7', 'dominant-11th': '7', 'dominant-13th': '7', 'major-11th': 'maj7', 'minor-11th': 'm7',
    'major-13th': 'maj7', 'minor-13th': 'm7', 'suspended-second': 'sus2', 'suspended-fourth': 'sus4', power: '5'
  };

  function txt(el, sel) {
    const e = el.querySelector(sel);
    return e ? e.textContent.trim() : null;
  }
  function kids(el, name) { return [...el.children].filter((c) => c.localName === name); }

  /** Texte XML d'un fichier .musicxml/.xml ou d'une archive compressée .mxl */
  async function fileToXmlText(file) {
    if (!file.name.toLowerCase().endsWith('.mxl')) return file.text();
    if (!window.JSZip) await loadScript('vendor/jszip.min.js');
    const zip = await JSZip.loadAsync(file);
    let path = null;
    const container = zip.file('META-INF/container.xml');
    if (container) {
      const c = new DOMParser().parseFromString(await container.async('string'), 'application/xml');
      const rf = c.querySelector('rootfile');
      path = rf && rf.getAttribute('full-path');
    }
    if (!path || !zip.file(path)) path = Object.keys(zip.files).find((f) => /\.(musicxml|xml)$/i.test(f) && !f.startsWith('META-INF'));
    if (!path) throw new Error('Archive .mxl sans partition.');
    return zip.file(path).async('string');
  }

  async function readFile(file) {
    return parseMusicXML(await fileToXmlText(file));
  }

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = () => rej(new Error('Impossible de charger ' + src));
      document.head.appendChild(s);
    });
  }

  /** Analyse un document MusicXML (partwise). */
  function parseMusicXML(text, partIndex) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('Le fichier n’est pas un MusicXML valide.');
    const root = doc.documentElement;
    if (root.localName === 'score-timewise') throw new Error('Format MusicXML « timewise » non pris en charge : réexporte en « partwise » (format standard).');
    const song = {
      title: txt(root, 'work > work-title') || txt(root, 'movement-title') || '',
      composer: '',
      key: null, beats: 4, beatType: 4, tempo: null, measures: [], parts: [], source: 'musicxml'
    };
    root.querySelectorAll('identification > creator').forEach((c) => {
      if (!song.composer && (c.getAttribute('type') === 'composer' || !c.getAttribute('type'))) song.composer = c.textContent.trim();
    });
    if (!song.title) {
      const credits = [...root.querySelectorAll('credit-words')].map((c) => c.textContent.trim()).filter(Boolean);
      if (credits.length) song.title = credits[0];
    }
    const scoreParts = [...root.querySelectorAll('part-list > score-part')];
    song.parts = scoreParts.map((p, i) => txt(p, 'part-name') || 'Partie ' + (i + 1));
    const parts = kids(root, 'part');
    if (!parts.length) throw new Error('Aucune partie trouvée dans la partition.');
    // par défaut : la partie qui contient le plus de notes (souvent la mélodie / le chant)
    let pi = partIndex;
    if (pi == null) {
      pi = 0;
      let best = -1;
      parts.forEach((p, i) => {
        const n = p.querySelectorAll('note > pitch').length + 3 * p.querySelectorAll('harmony').length;
        if (i === 0) best = n * 1.3; // légère préférence pour la première partie
        else if (n > best) { best = n; pi = i; }
      });
    }
    song.partIndex = pi;
    let divisions = 1;
    let beats = 4, beatType = 4;
    let tempoQ = null;
    kids(parts[pi], 'measure').forEach((mEl, mi) => {
      const meas = {
        number: mEl.getAttribute('number'), implicit: mEl.getAttribute('implicit') === 'yes',
        notes: [], harmonies: [], rehearsal: null, repeatStart: false, repeatEnd: 0, endings: [], beats, beatType, length: 0
      };
      let pos = 0;
      let maxPos = 0;
      let lastStart = 0;
      [...mEl.children].forEach((c) => {
        switch (c.localName) {
          case 'attributes': {
            const d = txt(c, 'divisions');
            if (d) divisions = parseFloat(d);
            const fifths = txt(c, 'key > fifths');
            if (fifths != null && !song.key) song.key = { fifths: parseInt(fifths, 10), mode: txt(c, 'key > mode') };
            const b = txt(c, 'time > beats');
            const bt = txt(c, 'time > beat-type');
            if (b && bt) {
              beats = parseInt(b, 10); beatType = parseInt(bt, 10);
              meas.beats = beats; meas.beatType = beatType;
              if (!song._timeSet) { song.beats = beats; song.beatType = beatType; song._timeSet = true; }
            }
            break;
          }
          case 'direction': {
            const r = txt(c, 'rehearsal');
            if (r) meas.rehearsal = r;
            const snd = c.querySelector('sound[tempo]');
            if (snd && tempoQ == null) tempoQ = parseFloat(snd.getAttribute('tempo'));
            const metro = c.querySelector('metronome per-minute');
            if (metro && tempoQ == null) {
              const unit = txt(c, 'metronome beat-unit');
              const dotted = !!c.querySelector('metronome beat-unit-dot');
              const mult = { whole: 4, half: 2, quarter: 1, eighth: 0.5 }[unit] || 1;
              tempoQ = parseFloat(metro.textContent) * mult * (dotted ? 1.5 : 1);
            }
            break;
          }
          case 'sound':
            if (c.getAttribute('tempo') && tempoQ == null) tempoQ = parseFloat(c.getAttribute('tempo'));
            break;
          case 'harmony': {
            const step = txt(c, 'root > root-step');
            if (!step) break;
            const alter = parseFloat(txt(c, 'root > root-alter') || '0');
            const kindEl = c.querySelector('kind');
            const kind = kindEl ? kindEl.textContent.trim() : 'major';
            if (kind === 'none') break;
            let type = KIND_MAP[kind] || 'maj';
            const kt = kindEl && kindEl.getAttribute('text');
            if (kt) { const p = parseChord('C' + kt); if (p) type = p.type; }
            const ch = { root: { letter: STEP_LETTER[step], acc: Math.round(alter) }, type };
            const bstep = txt(c, 'bass > bass-step');
            if (bstep) ch.bass = { letter: STEP_LETTER[bstep], acc: Math.round(parseFloat(txt(c, 'bass > bass-alter') || '0')) };
            const off = txt(c, 'offset');
            meas.harmonies.push({ start: (pos + (off ? parseFloat(off) : 0)) / divisions, chord: ch });
            break;
          }
          case 'backup': pos -= parseFloat(txt(c, 'duration') || '0'); break;
          case 'forward': pos += parseFloat(txt(c, 'duration') || '0'); maxPos = Math.max(maxPos, pos); break;
          case 'note': {
            const dur = parseFloat(txt(c, 'duration') || '0');
            const isChord = !!kids(c, 'chord').length;
            const start = isChord ? lastStart : pos;
            if (c.querySelector('grace')) break;
            const pitch = kids(c, 'pitch')[0];
            if (pitch) {
              const step2 = txt(pitch, 'step');
              const alter2 = parseFloat(txt(pitch, 'alter') || '0');
              const oct = parseInt(txt(pitch, 'octave'), 10);
              const note = { letter: STEP_LETTER[step2], acc: Math.round(alter2) };
              const midi = M.noteToMidi(note, oct);
              const tie = [...c.querySelectorAll('tie')].map((t) => t.getAttribute('type'));
              meas.notes.push({
                midi, pc: M.mod(midi, 12), note, start: start / divisions, dur: dur / divisions,
                staff: parseInt(txt(c, 'staff') || '1', 10), voice: txt(c, 'voice') || '1', tieStop: tie.indexOf('stop') >= 0
              });
            }
            if (!isChord) { lastStart = pos; pos += dur; maxPos = Math.max(maxPos, pos); }
            break;
          }
          case 'barline': {
            const rep = c.querySelector('repeat');
            if (rep) {
              if (rep.getAttribute('direction') === 'forward') meas.repeatStart = true;
              else meas.repeatEnd = parseInt(rep.getAttribute('times') || '2', 10);
            }
            const end = c.querySelector('ending');
            if (end && (end.getAttribute('type') === 'start' || !meas.endings.length)) {
              const nums = (end.getAttribute('number') || '').split(/[ ,]+/).map((x) => parseInt(x, 10)).filter((x) => !isNaN(x));
              if (nums.length) meas.endings = nums;
            }
            break;
          }
          default: break;
        }
      });
      meas.length = maxPos / divisions || (meas.beats * 4 / meas.beatType);
      song.measures.push(meas);
    });
    // propager les reprises de « volta » sur les mesures suivantes de la même fin
    let curEnding = null;
    parts[pi].querySelectorAll('measure').forEach((mEl, i) => {
      const meas = song.measures[i];
      const ends = [...mEl.querySelectorAll('barline ending')];
      if (meas.endings.length) curEnding = meas.endings;
      else if (curEnding) meas.endings = curEnding;
      if (ends.some((e) => e.getAttribute('type') === 'stop' || e.getAttribute('type') === 'discontinue')) curEnding = null;
    });
    // les accords des autres parties (souvent une ligne d'accords à part)
    if (!song.measures.some((m) => m.harmonies.length)) {
      parts.forEach((p, idx) => {
        if (idx === pi) return;
        const other = parseMusicXMLPart(p);
        other.forEach((hs, i) => { if (song.measures[i] && hs.length) song.measures[i].harmonies = hs; });
      });
    }
    if (tempoQ) {
      const ti = Rhythms.timeInfo(song.beats, song.beatType);
      song.tempo = Math.round(ti.compound ? tempoQ / 1.5 : song.beatType === 2 ? tempoQ / 2 : song.beatType === 8 ? tempoQ * 2 : tempoQ);
    }
    if (song.measures.length > 1 && song.measures[0].implicit === false) {
      const m0 = song.measures[0];
      const full = m0.beats * 4 / m0.beatType;
      if (m0.length < full - 1e-6 && m0.number === '0') m0.implicit = true;
    }
    return song;
  }

  function parseMusicXMLPart(partEl) {
    return kids(partEl, 'measure').map((mEl) => {
      const hs = [];
      let pos = 0;
      let divisions = 1;
      [...mEl.children].forEach((c) => {
        if (c.localName === 'attributes' && txt(c, 'divisions')) divisions = parseFloat(txt(c, 'divisions'));
        if (c.localName === 'note' && !kids(c, 'chord').length) pos += parseFloat(txt(c, 'duration') || '0');
        if (c.localName === 'backup') pos -= parseFloat(txt(c, 'duration') || '0');
        if (c.localName === 'forward') pos += parseFloat(txt(c, 'duration') || '0');
        if (c.localName === 'harmony') {
          const step = txt(c, 'root > root-step');
          const kind = txt(c, 'kind') || 'major';
          if (!step || kind === 'none') return;
          hs.push({ start: pos / divisions, chord: { root: { letter: STEP_LETTER[step], acc: Math.round(parseFloat(txt(c, 'root > root-alter') || '0')) }, type: KIND_MAP[kind] || 'maj' } });
        }
      });
      return hs;
    });
  }

  /** Ordre de lecture en tenant compte des reprises et des 1re / 2e fois. */
  function unfold(measures) {
    const order = [];
    let i = 0, start = 0, pass = 1, guard = 0, jumpedTo = -1;
    while (i < measures.length && guard++ < 5000) {
      const m = measures[i];
      if (m.repeatStart && i !== jumpedTo) { start = i; pass = 1; }
      if (i !== jumpedTo) jumpedTo = -1;
      if (m.endings.length && m.endings.indexOf(pass) < 0) { i++; continue; }
      order.push(i);
      if (m.repeatEnd && pass < m.repeatEnd) { pass++; i = start; jumpedTo = start; continue; }
      if (m.repeatEnd || (m.endings.length && (i + 1 >= measures.length || !measures[i + 1].endings.length || measures[i + 1].endings.join() !== m.endings.join()))) {
        if (m.repeatEnd || m.endings.length) { start = i + 1; pass = 1; }
      }
      i++;
    }
    return order;
  }

  /* ------------------------------------------------------------------ */
  /* Saisie texte                                                        */
  /* ------------------------------------------------------------------ */
  const FR = { do: 0, re: 1, 'ré': 1, mi: 2, fa: 3, sol: 4, la: 5, si: 6 };

  function parseNoteToken(tok) {
    const t = tok.trim();
    let m = /^(do|ré|re|mi|fa|sol|la|si)(#|♯|b|♭)?(\d)?$/i.exec(t);
    let letter, accS, oct;
    if (m) { letter = FR[m[1].toLowerCase()]; accS = m[2]; oct = m[3]; }
    else {
      m = /^([A-Ga-g])(#|♯|b|♭)?(\d)?$/.exec(t);
      if (!m) return null;
      letter = STEP_LETTER[m[1].toUpperCase()]; accS = m[2]; oct = m[3];
    }
    const acc = !accS ? 0 : accS === '#' || accS === '♯' ? 1 : -1;
    return { note: { letter, acc }, octave: oct != null ? parseInt(oct, 10) : null };
  }

  const SUFFIXES = [
    [/^(maj7|M7|7M|Δ7?|ma7)$/, 'maj7'], [/^(m7b5|m7♭5|ø7?|-7b5)$/, 'm7b5'], [/^(dim7|°7|o7)$/, 'dim7'], [/^(dim|°|o)$/, 'dim'],
    [/^(m\(?maj7\)?|mM7|-maj7)$/, 'mMaj7'], [/^(m7|min7|-7)$/, 'm7'], [/^(m6|min6|-6)$/, 'm6'], [/^(m|min|-)$/, 'min'],
    [/^(aug|\+|\+5|#5)$/, 'aug'], [/^(sus2)$/, 'sus2'], [/^(sus4|sus)$/, 'sus4'], [/^(7sus4|7sus)$/, 'sus4'], [/^(add9|add2)$/, 'add9'],
    [/^(9|7\(9\)|13|11)$/, '9'], [/^(m9|m11)$/, 'm7'], [/^(maj9|M9)$/, 'maj7'], [/^(6|69|6\/9)$/, '6'], [/^(7|7b9|7#9|7#5|7b5|7alt)$/, '7'],
    [/^(5)$/, '5'], [/^(M|maj)?$/, 'maj']
  ];

  /** "Am7", "F#m", "Bb/D", "Lam", "Sol7", "Ré" ... */
  function parseChord(str) {
    const s = String(str).trim().replace('♯', '#').replace('♭', 'b');
    const tries = [];
    const fr = /^(Do|Ré|Re|Mi|Fa|Sol|La|Si)(#|b)?(.*)$/i.exec(s);
    if (fr) tries.push({ letter: FR[fr[1].toLowerCase()], accS: fr[2], rest: fr[3] || '' });
    const en = /^([A-G])(#|b)?(.*)$/.exec(s);
    if (en) tries.push({ letter: STEP_LETTER[en[1]], accS: en[2], rest: en[3] || '' });
    for (const t of tries) {
      let rest = t.rest;
      let bass = null;
      const slash = rest.lastIndexOf('/');
      if (slash >= 0 && !/6\/9$/.test(rest)) {
        const b = parseNoteToken(rest.slice(slash + 1));
        if (!b) continue;
        bass = b.note;
        rest = rest.slice(0, slash);
      }
      const suffix = SUFFIXES.find(([re]) => re.test(rest));
      if (!suffix) continue;
      const ch = { root: { letter: t.letter, acc: t.accS === '#' ? 1 : t.accS === 'b' ? -1 : 0 }, type: suffix[1] };
      if (bass) ch.bass = bass;
      return ch;
    }
    return null;
  }

  /**
   * Format : mesures séparées par « | ». Notes : do ré mi… ou C D E… (+ # ou b, + octave facultative),
   * durée facultative en temps avec « : » (sol:2). « - » = silence. [Am] = accord imposé.
   * Une ligne peut commencer par « A: » ou « B: » pour indiquer une section.
   */
  function parseText(text, beats, beatType) {
    const barLen = beats * 4 / beatType;
    const measures = [];
    const errors = [];
    let prevMidi = 64;
    text.split(/\n/).forEach((line, li) => {
      let l = line.replace(/\/\/.*$/, '').trim();
      if (!l) return;
      let rehearsal = null;
      const sec = /^([A-Za-z][0-9']?)\s*:\s*/.exec(l);
      if (sec && !/^(do|re|ré|mi|fa|la|si|sol)$/i.test(sec[1])) { rehearsal = sec[1].toUpperCase(); l = l.slice(sec[0].length); }
      const bars = l.split('|').map((b) => b.trim());
      if (bars.length && bars[0] === '') bars.shift();
      if (bars.length && bars[bars.length - 1] === '') bars.pop();
      bars.forEach((bar, bi) => {
        const meas = { number: String(measures.length + 1), implicit: false, notes: [], harmonies: [], rehearsal: bi === 0 ? rehearsal : null, repeatStart: false, repeatEnd: 0, endings: [], beats, beatType, length: barLen };
        const tokens = bar.split(/\s+/).filter(Boolean);
        const items = [];
        tokens.forEach((tok) => {
          const ch = /^\[(.+)\]$/.exec(tok) || /^"(.+)"$/.exec(tok);
          if (ch) {
            const c = parseChord(ch[1]);
            if (c) items.push({ chord: c }); else errors.push(`Ligne ${li + 1} : accord « ${ch[1]} » non reconnu`);
            return;
          }
          if (tok === '%') { items.push({ repeatBar: true }); return; }
          const [nt, d] = tok.split(':');
          const dur = d ? parseFloat(d.replace(',', '.')) : null;
          if (/^(-|r|s|silence|x)$/i.test(nt)) { items.push({ rest: true, dur }); return; }
          const p = parseNoteToken(nt);
          if (!p) { errors.push(`Ligne ${li + 1} : « ${tok} » n’est pas une note`); return; }
          items.push({ p, dur });
        });
        const timed = items.filter((it) => !it.chord && !it.repeatBar);
        const fixed = timed.reduce((a, it) => a + (it.dur || 0), 0);
        const free = timed.filter((it) => !it.dur).length;
        const each = free ? Math.max(barLen - fixed, 0.25 * free) / free : 0;
        let pos = 0;
        items.forEach((it) => {
          if (it.chord) { meas.harmonies.push({ start: pos, chord: it.chord }); return; }
          if (it.repeatBar) { meas.copyPrev = true; return; }
          const dur = it.dur || each;
          if (it.p) {
            let midi;
            if (it.p.octave != null) midi = M.noteToMidi(it.p.note, it.p.octave);
            else {
              const pc = M.pcOf(it.p.note);
              midi = prevMidi - 6 + M.mod(pc - (prevMidi - 6), 12);
              const base = M.noteToMidi(it.p.note, 4);
              midi = base + 12 * Math.round((midi - base) / 12);
            }
            prevMidi = midi;
            meas.notes.push({ midi, pc: M.mod(midi, 12), note: it.p.note, start: pos, dur });
          }
          pos += dur;
        });
        if (meas.copyPrev && measures.length) {
          const prev = measures[measures.length - 1];
          meas.notes = prev.notes.slice();
          if (!meas.harmonies.length) meas.harmonies = prev.harmonies.slice();
        }
        measures.push(meas);
      });
    });
    return { song: { title: '', composer: '', key: null, beats, beatType, tempo: null, measures, parts: [], source: 'text' }, errors };
  }

  window.ScoreImport = { readFile, fileToXmlText, parseMusicXML, parseText, parseChord, unfold, loadScript };
})();

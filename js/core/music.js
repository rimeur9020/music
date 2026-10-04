/* Noyau théorique : notes, intervalles, gammes, accords. */
(function () {
  'use strict';

  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const FR_LETTERS = ['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
  const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11];
  const MAJOR_DEGREE_SEMIS = [0, 2, 4, 5, 7, 9, 11];

  // Racines proposées dans les menus (avec l'orthographe usuelle).
  const ROOTS = ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  const settings = {
    get notation() {
      try { return localStorage.getItem('notation') || 'fr'; } catch (e) { return 'fr'; }
    },
    set notation(v) {
      try { localStorage.setItem('notation', v); } catch (e) { /* ignore */ }
    }
  };

  function mod(n, m) { return ((n % m) + m) % m; }

  /** Note orthographiée : { letter: 0..6, acc: -2..2 } */
  function parseNote(name) {
    const m = /^([A-Ga-g])(##|bb|#|b|x)?$/.exec(name.trim());
    if (!m) throw new Error('Note invalide : ' + name);
    const letter = LETTERS.indexOf(m[1].toUpperCase());
    const accStr = m[2] || '';
    const acc = { '': 0, '#': 1, '##': 2, x: 2, b: -1, bb: -2 }[accStr];
    return { letter, acc };
  }

  function pcOf(note) { return mod(NATURAL_PC[note.letter] + note.acc, 12); }

  function accText(acc, ascii) {
    if (ascii) return acc > 0 ? '#'.repeat(acc) : 'b'.repeat(-acc);
    return { '-2': '𝄫', '-1': '♭', 0: '', 1: '♯', 2: '𝄪' }[acc];
  }

  /** Nom affichable selon la notation choisie. opts.ascii pour le PDF. */
  function noteName(note, opts) {
    opts = opts || {};
    const notation = opts.notation || settings.notation;
    const base = notation === 'fr' ? FR_LETTERS[note.letter] : LETTERS[note.letter];
    return base + accText(note.acc, opts.ascii);
  }

  function noteId(note) { return LETTERS[note.letter] + accText(note.acc, true); }

  /** Intervalle de type "b3", "#4", "5", "bb7", "9" ... -> { deg, semis } */
  function parseInterval(iv) {
    const m = /^(bb|b|#|##)?(\d+)$/.exec(iv);
    const deg = parseInt(m[2], 10);
    const alter = { undefined: 0, b: -1, bb: -2, '#': 1, '##': 2 }[m[1]];
    const d0 = (deg - 1) % 7;
    const oct = Math.floor((deg - 1) / 7);
    return { deg, steps: deg - 1, semis: MAJOR_DEGREE_SEMIS[d0] + 12 * oct + alter };
  }

  function transpose(note, iv) {
    const { steps, semis } = parseInterval(iv);
    const letter = mod(note.letter + steps, 7);
    const target = mod(pcOf(note) + semis, 12);
    let acc = target - NATURAL_PC[letter];
    if (acc > 6) acc -= 12;
    if (acc < -6) acc += 12;
    return { letter, acc };
  }

  /** Noms des intervalles en français */
  const INTERVAL_NAMES = {
    '1': 'Fondamentale', 'b2': 'Seconde mineure', '2': 'Seconde majeure', '#2': 'Seconde augmentée',
    'b3': 'Tierce mineure', '3': 'Tierce majeure', '4': 'Quarte juste', '#4': 'Quarte augmentée',
    'b5': 'Quinte diminuée', '5': 'Quinte juste', '#5': 'Quinte augmentée', 'b6': 'Sixte mineure',
    '6': 'Sixte majeure', 'bb7': 'Septième diminuée', 'b7': 'Septième mineure', '7': 'Septième majeure'
  };

  function intervalLabel(iv) {
    return iv.replace('bb', '𝄫').replace('b', '♭').replace('#', '♯');
  }

  /* ------------------------------------------------------------------ */
  /* Gammes                                                              */
  /* ------------------------------------------------------------------ */
  const SCALES = [
    {
      id: 'major', name: 'Majeure', alias: 'Ionien (mode de Do)', family: 'Majeure & modes',
      intervals: ['1', '2', '3', '4', '5', '6', '7'], mood: 'Joyeuse, stable, lumineuse.',
      desc: "La gamme de référence : toutes les autres se décrivent en la comparant à elle. Formée de deux tétracordes identiques (T T ½) séparés par un ton.",
      usage: 'Pop, folk, chanson, classique, country. Pour improviser sur un morceau en tonalité majeure.',
      chords: 'Sur l’accord du Ier degré (Imaj7) et sur toute la grille diatonique.',
      tip: 'Repère : la 4 et la 7 sont les notes « à tension » (la 7 veut monter vers la fondamentale).'
    },
    {
      id: 'dorian', name: 'Dorien', alias: '2e mode de la gamme majeure', family: 'Majeure & modes',
      intervals: ['1', '2', 'b3', '4', '5', '6', 'b7'], mood: 'Mineur mais lumineux, « cool », funky.',
      desc: "Une gamme mineure naturelle avec une sixte majeure. C'est cette 6 majeure qui lui donne sa couleur.",
      usage: 'Funk, jazz modal (So What), rock (Santana), soul, musique celtique.',
      chords: 'Sur un accord m7 ou m6, surtout quand il dure (vamp) ou dans un II-V (sur le IIm7).',
      tip: 'Ré dorien = les notes de Do majeur en partant de Ré.'
    },
    {
      id: 'phrygian', name: 'Phrygien', alias: '3e mode de la gamme majeure', family: 'Majeure & modes',
      intervals: ['1', 'b2', 'b3', '4', '5', 'b6', 'b7'], mood: 'Sombre, espagnol, tendu.',
      desc: 'Mineur avec une seconde mineure : le demi-ton au-dessus de la fondamentale donne la couleur flamenco / metal.',
      usage: 'Flamenco, metal, musique de film.',
      chords: 'Sur un accord mineur (m7) ou un accord sus(b9).',
      tip: 'Mi phrygien = les notes de Do majeur en partant de Mi.'
    },
    {
      id: 'lydian', name: 'Lydien', alias: '4e mode de la gamme majeure', family: 'Majeure & modes',
      intervals: ['1', '2', '3', '#4', '5', '6', '7'], mood: 'Majeur, rêveur, flottant.',
      desc: 'Une gamme majeure avec une quarte augmentée (#4) qui supprime la « tension » de la 4 et donne un son aérien.',
      usage: 'Musique de film (John Williams), jazz, rock instrumental (Satriani, Vai).',
      chords: 'Sur un accord maj7 ou maj7(#11), notamment le IVe degré.',
      tip: 'Fa lydien = les notes de Do majeur en partant de Fa.'
    },
    {
      id: 'mixolydian', name: 'Mixolydien', alias: '5e mode de la gamme majeure', family: 'Majeure & modes',
      intervals: ['1', '2', '3', '4', '5', '6', 'b7'], mood: 'Majeur, bluesy, rock.',
      desc: 'Une gamme majeure avec une septième mineure. C’est la gamme naturelle des accords de septième de dominante (7).',
      usage: 'Rock, blues, funk, country, musique irlandaise.',
      chords: 'Sur un accord 7 (dominante) : V7, ou les accords d’un blues.',
      tip: 'Sol mixolydien = les notes de Do majeur en partant de Sol.'
    },
    {
      id: 'minor', name: 'Mineure naturelle', alias: 'Éolien (6e mode)', family: 'Majeure & modes',
      intervals: ['1', '2', 'b3', '4', '5', 'b6', 'b7'], mood: 'Triste, mélancolique, sérieuse.',
      desc: 'La gamme mineure « de base ». Elle partage ses notes avec la gamme majeure relative (La mineur = Do majeur).',
      usage: 'Pop, rock, metal, chanson. Pour improviser sur un morceau en tonalité mineure.',
      chords: 'Sur Im7 et sur la grille mineure (i, iv, v, VI, VII…).',
      tip: 'La relative majeure se trouve une tierce mineure au-dessus (La mineur → Do majeur).'
    },
    {
      id: 'locrian', name: 'Locrien', alias: '7e mode de la gamme majeure', family: 'Majeure & modes',
      intervals: ['1', 'b2', 'b3', '4', 'b5', 'b6', 'b7'], mood: 'Instable, très sombre.',
      desc: 'Le seul mode avec une quinte diminuée : la fondamentale ne sonne jamais « posée ».',
      usage: 'Jazz (sur m7b5), metal.',
      chords: 'Sur un accord demi-diminué (m7♭5), par exemple le IIe degré en mineur.',
      tip: 'Si locrien = les notes de Do majeur en partant de Si.'
    },
    {
      id: 'harmonic-minor', name: 'Mineure harmonique', alias: '', family: 'Mineures',
      intervals: ['1', '2', 'b3', '4', '5', 'b6', '7'], mood: 'Orientale, dramatique, classique.',
      desc: 'Mineure naturelle avec une septième majeure : on obtient une vraie sensible et un accord de dominante majeur (V7). L’écart b6 → 7 (un ton et demi) donne la couleur orientale.',
      usage: 'Classique, néo-classique (Malmsteen), musique de l’Est, flamenco, tango.',
      chords: 'Sur le V7 d’une tonalité mineure (ex. Mi7 → Lam) et sur ImMaj7.',
      tip: 'Pour l’entendre : comparez La mineur naturelle et la même avec Sol♯.'
    },
    {
      id: 'melodic-minor', name: 'Mineure mélodique', alias: '(jazz, forme ascendante)', family: 'Mineures',
      intervals: ['1', '2', 'b3', '4', '5', '6', '7'], mood: 'Mineur sophistiqué, jazz.',
      desc: 'Une gamme majeure avec une tierce mineure. En classique elle redevient naturelle en descendant ; en jazz on la garde identique dans les deux sens.',
      usage: 'Jazz, fusion, classique.',
      chords: 'Sur m6, mMaj7. Ses modes donnent l’altérée et le lydien b7.',
      tip: 'Ne diffère de la majeure que par une seule note : la tierce.'
    },
    {
      id: 'phrygian-dominant', name: 'Phrygien dominant', alias: '5e mode de la mineure harmonique', family: 'Mineures',
      intervals: ['1', 'b2', '3', '4', '5', 'b6', 'b7'], mood: 'Espagnol, oriental, arabisant.',
      desc: 'Comme le phrygien mais avec une tierce majeure : c’est la couleur flamenco / klezmer par excellence.',
      usage: 'Flamenco, musique orientale, metal.',
      chords: 'Sur le V7 d’une tonalité mineure (Mi7 en La mineur).',
      tip: 'Mi phrygien dominant = La mineure harmonique en partant de Mi.'
    },
    {
      id: 'pentatonic-major', name: 'Pentatonique majeure', alias: '', family: 'Pentatoniques & blues',
      intervals: ['1', '2', '3', '5', '6'], mood: 'Joyeuse, ouverte, sans « fausse note ».',
      desc: 'La gamme majeure sans la 4 et la 7 (les notes à demi-ton). Très facile à utiliser : presque aucune note ne frotte.',
      usage: 'Country, pop, rock sudiste, folk, musiques du monde.',
      chords: 'Sur les accords majeurs, notamment le Ier degré.',
      tip: 'Elle a les mêmes notes que la pentatonique mineure de sa relative (Do pent. maj = La pent. min).'
    },
    {
      id: 'pentatonic-minor', name: 'Pentatonique mineure', alias: '', family: 'Pentatoniques & blues',
      intervals: ['1', 'b3', '4', '5', 'b7'], mood: 'Rock, blues, directe.',
      desc: 'La gamme la plus jouée à la guitare rock/blues. Mineure naturelle sans la 2 et la b6.',
      usage: 'Blues, rock, hard rock, funk, pop.',
      chords: 'Sur un accord mineur, ou sur tout un blues (même en majeur, pour un son « crade »).',
      tip: 'La « boîte 1 » (position 1) est la forme la plus connue de toute la guitare.'
    },
    {
      id: 'blues', name: 'Blues (mineure)', alias: 'pentatonique mineure + quinte diminuée', family: 'Pentatoniques & blues',
      intervals: ['1', 'b3', '4', 'b5', '5', 'b7'], mood: 'Blues, expressive.',
      desc: 'La pentatonique mineure à laquelle on ajoute la « blue note » (b5), utilisée en note de passage.',
      usage: 'Blues, rock, jazz, funk.',
      chords: 'Sur un blues (I7 - IV7 - V7) ou un accord mineur.',
      tip: 'La b5 ne se tient pas longtemps : on glisse dessus vers la 4 ou la 5.'
    },
    {
      id: 'blues-major', name: 'Blues majeure', alias: 'pentatonique majeure + tierce mineure', family: 'Pentatoniques & blues',
      intervals: ['1', '2', 'b3', '3', '5', '6'], mood: 'Blues joyeux, country.',
      desc: 'La pentatonique majeure avec une blue note (b3) en note de passage vers la tierce majeure.',
      usage: 'Country, blues, rock’n’roll, BB King.',
      chords: 'Sur les accords majeurs / 7 d’un blues.',
      tip: 'Faites glisser ou tirer la b3 vers la 3.'
    },
    {
      id: 'whole-tone', name: 'Par tons', alias: 'gamme hexatonique', family: 'Symétriques',
      intervals: ['1', '2', '3', '#4', '#5', 'b7'], mood: 'Flottante, irréelle, onirique.',
      desc: 'Six notes séparées uniquement par des tons entiers. Il n’en existe que deux différentes !',
      usage: 'Debussy, jazz, effets de rêve au cinéma.',
      chords: 'Sur les accords 7(#5) / augmentés.',
      tip: 'Sur le manche, la forme se répète tous les 2 frets.'
    },
    {
      id: 'diminished-hw', name: 'Diminuée demi-ton / ton', alias: 'gamme octatonique', family: 'Symétriques',
      intervals: ['1', 'b2', '#2', '3', '#4', '5', '6', 'b7'], mood: 'Tendue, jazz, mystérieuse.',
      desc: 'Huit notes en alternant demi-ton / ton. Symétrique : elle se répète toutes les tierces mineures.',
      usage: 'Jazz (sur 7(b9)), metal, musique de film.',
      chords: 'Sur un accord de dominante 7(b9).',
      tip: 'La version ton / demi-ton s’utilise sur les accords diminués (dim7).'
    }
  ];

  function scaleById(id) { return SCALES.find((s) => s.id === id); }

  function scaleNotes(rootName, scale) {
    const root = typeof rootName === 'string' ? parseNote(rootName) : rootName;
    return scale.intervals.map((iv) => transpose(root, iv));
  }

  function scaleSteps(scale) {
    const semis = scale.intervals.map((iv) => parseInterval(iv).semis);
    semis.push(12);
    const out = [];
    for (let i = 1; i < semis.length; i++) {
      const d = semis[i] - semis[i - 1];
      out.push(d === 1 ? '½' : d === 2 ? 'T' : d === 3 ? '1T½' : d + '');
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Accords                                                             */
  /* ------------------------------------------------------------------ */
  const CHORD_TYPES = {
    maj: { suffix: '', ivs: ['1', '3', '5'], name: 'majeur' },
    min: { suffix: 'm', ivs: ['1', 'b3', '5'], name: 'mineur' },
    dim: { suffix: 'dim', ivs: ['1', 'b3', 'b5'], name: 'diminué' },
    aug: { suffix: 'aug', ivs: ['1', '3', '#5'], name: 'augmenté' },
    '5': { suffix: '5', ivs: ['1', '5'], name: 'power chord' },
    sus2: { suffix: 'sus2', ivs: ['1', '2', '5'], name: 'sus2' },
    sus4: { suffix: 'sus4', ivs: ['1', '4', '5'], name: 'sus4' },
    '6': { suffix: '6', ivs: ['1', '3', '5', '6'], name: 'sixte' },
    m6: { suffix: 'm6', ivs: ['1', 'b3', '5', '6'], name: 'mineur sixte' },
    '7': { suffix: '7', ivs: ['1', '3', '5', 'b7'], name: 'septième' },
    maj7: { suffix: 'maj7', ivs: ['1', '3', '5', '7'], name: 'septième majeure' },
    m7: { suffix: 'm7', ivs: ['1', 'b3', '5', 'b7'], name: 'mineur septième' },
    m7b5: { suffix: 'm7b5', ivs: ['1', 'b3', 'b5', 'b7'], name: 'demi-diminué' },
    dim7: { suffix: 'dim7', ivs: ['1', 'b3', 'b5', 'bb7'], name: 'diminué septième' },
    '9': { suffix: '9', ivs: ['1', '3', '5', 'b7', '9'], name: 'neuvième' },
    add9: { suffix: 'add9', ivs: ['1', '3', '5', '9'], name: 'add9' },
    mMaj7: { suffix: 'm(maj7)', ivs: ['1', 'b3', '5', '7'], name: 'mineur septième majeure' }
  };

  /** Chord: { root: note, type: key of CHORD_TYPES, bass?: note } */
  function chordName(ch, opts) {
    opts = opts || {};
    const t = CHORD_TYPES[ch.type] || { suffix: ch.type };
    let s = noteName(ch.root, opts) + (opts.ascii ? t.suffix : t.suffix.replace('b5', '♭5'));
    if (ch.bass) s += '/' + noteName(ch.bass, opts);
    return s;
  }

  function chordPcs(ch) {
    return (CHORD_TYPES[ch.type] || CHORD_TYPES.maj).ivs.map((iv) => pcOf(transpose(ch.root, iv)));
  }

  function chordNotes(ch) {
    return (CHORD_TYPES[ch.type] || CHORD_TYPES.maj).ivs.map((iv) => transpose(ch.root, iv));
  }

  function chordKey(ch) { return noteId(ch.root) + ':' + ch.type + (ch.bass ? '/' + noteId(ch.bass) : ''); }

  /** Accords diatoniques par empilement de tierces */
  function diatonicChords(rootName, scale, sevenths) {
    if (scale.intervals.length !== 7) return [];
    const notes = scaleNotes(rootName, scale);
    const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
    return notes.map((n, i) => {
      const third = notes[(i + 2) % 7];
      const fifth = notes[(i + 4) % 7];
      const seventh = notes[(i + 6) % 7];
      const iv3 = mod(pcOf(third) - pcOf(n), 12);
      const iv5 = mod(pcOf(fifth) - pcOf(n), 12);
      const iv7 = mod(pcOf(seventh) - pcOf(n), 12);
      let type;
      if (iv3 === 4 && iv5 === 7) type = sevenths ? (iv7 === 11 ? 'maj7' : '7') : 'maj';
      else if (iv3 === 3 && iv5 === 7) type = sevenths ? (iv7 === 10 ? 'm7' : 'm') : 'min';
      else if (iv3 === 3 && iv5 === 6) type = sevenths ? (iv7 === 10 ? 'm7b5' : 'dim7') : 'dim';
      else if (iv3 === 4 && iv5 === 8) type = 'aug';
      else type = 'maj';
      if (sevenths && iv3 === 3 && iv5 === 7 && iv7 === 11) type = 'mMaj7';
      let roman = romans[i];
      if (iv3 === 3) roman = roman.toLowerCase();
      if (type === 'dim' || type === 'dim7') roman += '°';
      if (type === 'm7b5') roman += 'ø';
      if (type === 'aug') roman += '+';
      return { root: n, type, roman };
    });
  }

  /* ------------------------------------------------------------------ */
  /* MIDI                                                                */
  /* ------------------------------------------------------------------ */
  function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  /** midi -> orthographe par défaut (dièses ou bémols) */
  const SHARP_SPELL = [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [3, 0], [3, 1], [4, 0], [4, 1], [5, 0], [5, 1], [6, 0]];
  const FLAT_SPELL = [[0, 0], [1, -1], [1, 0], [2, -1], [2, 0], [3, 0], [4, -1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0]];
  function spellPc(pc, preferFlats) {
    const s = (preferFlats ? FLAT_SPELL : SHARP_SPELL)[mod(pc, 12)];
    return { letter: s[0], acc: s[1] };
  }

  function noteToMidi(note, octave) {
    return 12 * (octave + 1) + NATURAL_PC[note.letter] + note.acc;
  }

  window.Music = {
    LETTERS, FR_LETTERS, NATURAL_PC, ROOTS, SCALES, CHORD_TYPES, INTERVAL_NAMES, settings,
    mod, parseNote, pcOf, noteName, noteId, accText, parseInterval, transpose, intervalLabel,
    scaleById, scaleNotes, scaleSteps, chordName, chordPcs, chordNotes, chordKey, diatonicChords,
    midiToFreq, spellPc, noteToMidi
  };
})();

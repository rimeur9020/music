/* Rythmiques de guitare par style + lecture audio. */
(function () {
  'use strict';
  const M = Music;

  const STYLES = [
    { id: 'pop', name: 'Pop' }, { id: 'rock', name: 'Rock' }, { id: 'folk', name: 'Folk' },
    { id: 'ballade', name: 'Ballade' }, { id: 'chanson', name: 'Chanson française' }, { id: 'country', name: 'Country' },
    { id: 'blues', name: 'Blues' }, { id: 'jazz', name: 'Jazz / swing' }, { id: 'manouche', name: 'Jazz manouche' },
    { id: 'bossa', name: 'Bossa nova' }, { id: 'reggae', name: 'Reggae' }, { id: 'ska', name: 'Ska' },
    { id: 'funk', name: 'Funk / soul' }, { id: 'classique', name: 'Classique / musique de film' }
  ];

  /*
   * Symboles :
   *  D = grattage vers le bas, U = vers le haut, X / x = coup étouffé bas / haut,
   *  C = « chop » (accord bref et étouffé), B = basse (fondamentale), b = basse alternée,
   *  P = pincé des 3 cordes aiguës, 1 2 3 = corde aiguë seule (1 = Mi aigu),
   *  « > » = accent, « + » = joué ensemble, vide = la main passe sans toucher.
   */
  const PATTERNS = [
    { id: 'pop', name: 'Pop / folk (bas, bas-haut, haut-bas-haut)', time: '4/4', styles: ['pop', 'folk', 'rock', 'country', 'chanson'], tempo: [70, 150],
      slots: ['D', '', 'D', 'U', '', 'U', 'D', 'U'], desc: 'Le grand classique. La main fait des allers-retours réguliers en croches et ne touche pas les cordes sur les cases vides.' },
    { id: 'beginner', name: 'Débutant (un coup par temps)', time: '4/4', styles: ['*'], tempo: [30, 240],
      slots: ['D', '', 'D', '', 'D', '', 'D', ''], desc: 'Un coup vers le bas sur chaque temps : parfait pour apprendre les changements d’accords.' },
    { id: 'rock8', name: 'Rock en croches', time: '4/4', styles: ['rock'], tempo: [100, 220],
      slots: ['D', 'D', 'D>', 'D', 'D', 'D', 'D>', 'D'], desc: 'Croches toutes vers le bas, cordes graves légèrement étouffées avec la paume (palm mute), accents sur 2 et 4. Idéal en power chords.' },
    { id: 'rock-sync', name: 'Rock / pop syncopé', time: '4/4', styles: ['rock', 'pop'], tempo: [90, 170],
      slots: ['D', '', 'D', 'U', 'X', 'U', 'D', 'U'], desc: 'Le coup étouffé (✕) sur le temps 3 fait office de caisse claire.' },
    { id: 'pop16', name: 'Ballade pop en doubles-croches', time: '4/4', styles: ['pop', 'ballade'], tempo: [55, 90],
      slots: ['D', '', 'D', 'U', '', 'U', 'D', 'U', 'D', '', 'D', 'U', '', 'U', 'D', 'U'], desc: 'Le motif pop joué deux fois par mesure, pour les tempos lents.' },
    { id: 'ballad-arp', name: 'Arpège ballade', time: '4/4', styles: ['ballade', 'pop', 'folk', 'chanson', 'classique'], tempo: [45, 100],
      slots: ['B', '3', '2', '3', '1', '3', '2', '3'], desc: 'Pouce sur la basse de l’accord, puis index (corde de Sol = 3), majeur (Si = 2), annulaire (Mi aigu = 1).' },
    { id: 'travis', name: 'Travis picking', time: '4/4', styles: ['folk', 'country', 'chanson'], tempo: [80, 150],
      slots: ['B+1', '', 'b', '2', 'B', '1', 'b', '2'], desc: 'Le pouce alterne deux basses sur chaque temps (B puis b), les doigts jouent entre les temps.' },
    { id: 'country', name: 'Boom-chick', time: '4/4', styles: ['country', 'folk'], tempo: [90, 200],
      slots: ['B', '', 'D', 'U', 'b', '', 'D', 'U'], desc: 'Basse seule sur 1 et 3 (en alternant deux basses), grattage sur 2 et 4.' },
    { id: 'reggae', name: 'Skank reggae (one drop)', time: '4/4', styles: ['reggae'], tempo: [55, 100],
      slots: ['', '', 'C', '', '', '', 'C', ''], desc: 'Accord bref sur les temps 2 et 4 seulement, étouffé tout de suite avec la main gauche. Rien sur les temps 1 et 3.' },
    { id: 'ska', name: 'Ska / reggae rapide', time: '4/4', styles: ['ska', 'reggae'], tempo: [95, 220],
      slots: ['', 'C', '', 'C', '', 'C', '', 'C'], desc: 'Un accord bref et étouffé sur chaque contretemps (« et »).' },
    { id: 'funk16', name: 'Funk en doubles-croches', time: '4/4', styles: ['funk'], tempo: [80, 125],
      slots: ['D>', 'x', 'X', 'U', 'X', 'x', 'D', 'U', 'X', 'x', 'D>', 'x', 'X', 'U', 'X', 'x'], desc: 'La main ne s’arrête jamais (bas sur les temps, haut entre). La main gauche relâche les cordes pour les coups étouffés ✕.' },
    { id: 'bossa', name: 'Bossa nova (simplifiée)', time: '4/4', styles: ['bossa'], tempo: [90, 160],
      slots: ['B+P', '', 'b', 'P', 'B', 'P', 'b', ''], desc: 'Le pouce joue régulièrement la basse sur chaque temps, les doigts pincent l’accord de façon syncopée. Jouer doux, sans médiator.' },
    { id: 'swing4', name: 'Swing 4 temps (« pompe »)', time: '4/4', styles: ['jazz', 'manouche'], tempo: [90, 260], feel: 'swing',
      slots: ['D', 'D>', 'D', 'D>'], desc: 'Un accord court sur chaque temps, accentué sur 2 et 4. En manouche, on étouffe juste après chaque coup.' },
    { id: 'charleston', name: 'Comping « Charleston »', time: '4/4', styles: ['jazz'], tempo: [100, 240], feel: 'swing',
      slots: ['D', '', '', 'D>', '', '', '', ''], desc: 'Un accord sur 1 et sur le « et » de 2 (croches swing). Laisse respirer la mélodie.' },
    { id: 'shuffle', name: 'Shuffle blues', time: '4/4', styles: ['blues', 'rock'], tempo: [70, 150], feel: 'shuffle',
      slots: ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'], desc: 'Croches ternaires (« longue-courte »). Sur les cordes graves, alterne quinte et sixte (forme 5-6 à la Chuck Berry).' },
    // 3/4
    { id: 'waltz', name: 'Valse « boum-tchac-tchac »', time: '3/4', styles: ['*'], tempo: [60, 200],
      slots: ['B', '', 'D', '', 'D', ''], desc: 'La basse sur le 1, un accord bref sur 2 et 3.' },
    { id: 'waltz-strum', name: 'Valse grattée', time: '3/4', styles: ['pop', 'folk', 'rock', 'country', 'chanson'], tempo: [70, 180],
      slots: ['B', '', 'D', 'U', 'D', 'U'], desc: 'Basse sur le 1, puis allers-retours en croches.' },
    { id: 'waltz-arp', name: 'Arpège 3 temps', time: '3/4', styles: ['ballade', 'classique', 'folk', 'chanson', 'pop'], tempo: [40, 120],
      slots: ['B', '3', '2', '1', '2', '3'], desc: 'Pouce sur la basse, puis Sol – Si – Mi – Si – Sol.' },
    // 6/8
    { id: '68-arp', name: 'Arpège 6/8', time: '6/8', styles: ['*'], tempo: [40, 90],
      slots: ['B', '3', '2', '1', '2', '3'], desc: 'Deux pulsations par mesure (1 et 4). Pouce sur la basse puis Sol – Si – Mi – Si – Sol.' },
    { id: '68-strum', name: '6/8 gratté', time: '6/8', styles: ['pop', 'rock', 'folk', 'country', 'blues', 'chanson'], tempo: [40, 140],
      slots: ['D>', 'D', 'D', 'D>', 'D', 'D'], desc: 'Six croches vers le bas, accents sur 1 et 4.' },
    // 12/8
    { id: '128-blues', name: 'Blues lent 12/8', time: '12/8', styles: ['*'], tempo: [40, 90],
      slots: ['D>', 'D', 'D', 'D>', 'D', 'D', 'D>', 'D', 'D', 'D>', 'D', 'D'], desc: 'Quatre pulsations de trois croches. Accent sur chaque pulsation.' },
    { id: '128-arp', name: 'Arpège 12/8', time: '12/8', styles: ['ballade', 'pop', 'classique'], tempo: [40, 80],
      slots: ['B', '3', '2', '1', '2', '3', 'b', '3', '2', '1', '2', '3'], desc: 'Arpège ternaire, une basse sur 1 et une basse alternée sur 3.' }
  ];

  function timeInfo(beats, beatType) {
    const compound = beatType === 8 && beats % 3 === 0 && beats > 3;
    return { beats, beatType, compound, pulses: compound ? beats / 3 : beats };
  }

  /** Motifs compatibles avec la mesure, triés selon le style et le tempo. */
  function candidates(style, beats, beatType, tempo) {
    let key = beats + '/' + beatType;
    if (key === '2/2' || key === '4/2') key = '4/4';
    let list = PATTERNS.filter((p) => p.time === key);
    if (key === '2/4') {
      list = PATTERNS.filter((p) => p.time === '4/4' && p.slots.length % 2 === 0).map((p) => Object.assign({}, p, { id: p.id + '-half', time: '2/4', slots: p.slots.slice(0, p.slots.length / 2) }));
    }
    if (!list.length) {
      const n = beats;
      const slots = [];
      for (let i = 0; i < n; i++) slots.push(i === 0 ? 'D>' : 'D');
      list = [{ id: 'generic', name: 'Un coup par temps', time: key, styles: ['*'], tempo: [20, 300], slots, desc: 'Un coup vers le bas sur chaque temps, accent sur le premier.' }];
    }
    const score = (p) => {
      let s = p.styles.indexOf(style) >= 0 ? 10 - p.styles.indexOf(style) * 0.5 : p.styles.indexOf('*') >= 0 ? 3 : 0;
      if (tempo) {
        if (tempo >= p.tempo[0] && tempo <= p.tempo[1]) s += 3;
        else s -= Math.min(Math.abs(tempo - p.tempo[0]), Math.abs(tempo - p.tempo[1])) / 15;
      }
      if (p.id === 'beginner') s -= 2;
      return s;
    };
    return list.slice().sort((a, b) => score(b) - score(a));
  }

  /** Étiquettes de comptage sous chaque case. */
  function counts(pattern, beats, beatType) {
    const n = pattern.slots.length;
    const ti = timeInfo(beats, beatType);
    if (ti.compound || beatType === 8) return pattern.slots.map((_, i) => String(i + 1));
    const per = n / beats;
    const sub = per === 4 ? ['', 'e', '&', 'a'] : per === 2 ? ['', '&'] : per === 3 ? ['', 'tri', 'let'] : [''];
    return pattern.slots.map((_, i) => (i % per === 0 ? String(i / per + 1) : sub[i % per] || ''));
  }

  function beatStarts(pattern, beats, beatType) {
    const n = pattern.slots.length;
    const ti = timeInfo(beats, beatType);
    const per = ti.compound ? n / ti.pulses : n / beats;
    return pattern.slots.map((_, i) => Math.abs(i % per) < 1e-9);
  }

  const SYMBOL_TEXT = { D: '↓', U: '↑', X: '✕↓', x: '✕↑', C: '↓·', B: 'B', b: 'b', P: 'P', 1: '1', 2: '2', 3: '3' };
  function symbolText(sym) {
    if (!sym) return '';
    const accent = sym.endsWith('>');
    const s = sym.replace('>', '');
    return s.split('+').map((p) => SYMBOL_TEXT[p] || p).join('+') + (accent ? '>' : '');
  }

  const LEGEND = {
    D: '↓ grattage vers le bas', U: '↑ vers le haut', X: '✕ coup étouffé', x: '✕ coup étouffé', C: '↓· accord bref (étouffé aussitôt)',
    B: 'B = basse (fondamentale)', b: 'b = basse alternée', P: 'P = pincer les 3 cordes aiguës', 1: '1 2 3 = cordes Mi aigu, Si, Sol',
    2: '1 2 3 = cordes Mi aigu, Si, Sol', 3: '1 2 3 = cordes Mi aigu, Si, Sol', '>': '> = accent'
  };
  const LEGEND_PDF = {
    D: 'flèche bas = grattage vers le bas', U: 'flèche haut = vers le haut', X: 'croix = coup étouffé', x: 'croix = coup étouffé',
    C: 'flèche courte + point = accord bref étouffé aussitôt'
  };
  function legend(pattern, forPdf) {
    const set = new Set();
    pattern.slots.forEach((s) => {
      if (!s) return;
      if (s.endsWith('>')) set.add(LEGEND['>']);
      s.replace('>', '').split('+').forEach((p) => {
        const txt = (forPdf && LEGEND_PDF[p]) || LEGEND[p];
        if (txt) set.add(txt);
      });
    });
    set.add('case vide = la main passe sans toucher');
    return [...set];
  }

  /* ------------------------------------------------------------------ */
  /* Lecture audio                                                       */
  /* ------------------------------------------------------------------ */
  function playSlot(sym, midis, t, slotSec) {
    if (!sym) return;
    const accent = sym.endsWith('>');
    const vel = accent ? 0.75 : 0.5;
    const strings = midis.map((m, i) => ({ m, i })).filter((x) => x.m != null);
    if (!strings.length) return;
    const ring = Math.max(slotSec * 2.2, 0.5);
    sym.replace('>', '').split('+').forEach((p) => {
      switch (p) {
        case 'D':
          strings.forEach((s, k) => Audio2.guitar(s.m, t + k * 0.012, ring, vel * 0.8));
          break;
        case 'U':
          strings.slice(-4).reverse().forEach((s, k) => Audio2.guitar(s.m, t + k * 0.01, ring, vel * 0.55));
          break;
        case 'X': case 'x':
          Audio2.mute(t, vel);
          break;
        case 'C':
          strings.slice(-4).forEach((s, k) => Audio2.guitar(s.m, t + k * 0.006, 0.13, vel * 0.8));
          Audio2.mute(t + 0.11, 0.25);
          break;
        case 'B':
          Audio2.guitar(strings[0].m, t, ring * 1.5, vel);
          break;
        case 'b':
          Audio2.guitar((strings[1] || strings[0]).m, t, ring * 1.5, vel);
          break;
        case 'P':
          strings.slice(-3).forEach((s) => Audio2.guitar(s.m, t, ring, vel * 0.7));
          break;
        default: {
          const idx = 6 - parseInt(p, 10);
          const s = midis[idx] != null ? midis[idx] : strings[strings.length - 1].m;
          Audio2.guitar(s, t, ring * 1.5, vel * 0.7);
        }
      }
    });
  }

  /**
   * bars : [{ chords: [voicing midis per half] }] — chaque mesure a 1 ou plusieurs accords répartis également.
   * Retourne un objet { stop(), onSlot } pour le surlignage.
   */
  function playBars(bars, pattern, opts) {
    const ti = timeInfo(opts.beats, opts.beatType);
    const barSec = ti.pulses * 60 / opts.tempo;
    const n = pattern.slots.length;
    const slotSec = barSec / n;
    const t0 = Audio2.now() + 0.15;
    const swing = pattern.feel === 'swing' || pattern.feel === 'shuffle' || opts.swing;
    const events = [];
    bars.forEach((bar, bi) => {
      for (let i = 0; i < n; i++) {
        let off = i * slotSec;
        if (swing && n % 2 === 0 && i % 2 === 1) off = (i - 1) * slotSec + slotSec * 4 / 3;
        const chordIdx = Math.min(bar.chords.length - 1, Math.floor(i / (n / bar.chords.length)));
        events.push({ t: t0 + bi * barSec + off, bi, i, chordIdx, midis: bar.chords[chordIdx] });
      }
    });
    const end = t0 + bars.length * barSec;
    let k = 0;
    let stopped = false;
    const timers = [];
    // Programmation progressive (on peut arrêter à tout moment)
    const iv = setInterval(() => {
      const horizon = Audio2.now() + 0.3;
      while (k < events.length && events[k].t < horizon) {
        const e = events[k++];
        if (e.midis) playSlot(pattern.slots[e.i], e.midis, e.t, slotSec);
        if (opts.onSlot) timers.push(setTimeout(() => { if (!stopped) opts.onSlot(e.bi, e.i, e.chordIdx); }, Math.max(0, (e.t - Audio2.now()) * 1000)));
      }
      if (Audio2.now() > end + 0.2) stop();
    }, 50);
    function stop() {
      if (stopped) return;
      stopped = true;
      clearInterval(iv);
      timers.forEach(clearTimeout);
      if (opts.onEnd) opts.onEnd();
    }
    return { stop };
  }

  window.Rhythms = { STYLES, PATTERNS, candidates, counts, beatStarts, symbolText, legend, timeInfo, playBars };
})();

/* « Trouver le son » : réglages pour s'approcher d'un son avec SON matériel. */
(function () {
  'use strict';
  const { h } = App;

  /* ------------------------------------------------------------------ */
  /* Matériel                                                            */
  /* ------------------------------------------------------------------ */
  const GUITARS = {
    sss: { name: 'Type Stratocaster (3 simples)', pos: ['neck', 'neck+middle', 'middle', 'middle+bridge', 'bridge'], type: () => 'single' },
    hss: { name: 'Strat HSS (humbucker au chevalet)', pos: ['neck', 'neck+middle', 'middle', 'middle+bridge', 'bridge'], type: (p) => (p === 'bridge' ? 'humbucker' : 'single') },
    tele: { name: 'Type Telecaster (2 simples)', pos: ['neck', 'both', 'bridge'], type: () => 'single' },
    hh: { name: 'Type Les Paul / SG (2 humbuckers)', pos: ['neck', 'both', 'bridge'], type: () => 'humbucker' },
    hsh: { name: 'Superstrat HSH (Ibanez, etc.)', pos: ['neck', 'neck+middle', 'middle', 'middle+bridge', 'bridge'], type: (p) => (p === 'neck' || p === 'bridge' ? 'humbucker' : 'single') },
    p90: { name: 'Micros P-90', pos: ['neck', 'both', 'bridge'], type: () => 'p90' },
    hollow: { name: 'Demi-caisse / jazz (humbuckers)', pos: ['neck', 'both', 'bridge'], type: () => 'humbucker' },
    acoustic: { name: 'Électro-acoustique', pos: ['piezo'], type: () => 'acoustic' }
  };
  const POS_LABEL = {
    neck: 'micro manche', 'neck+middle': 'manche + milieu (position 4)', middle: 'micro du milieu (position 3)',
    'middle+bridge': 'milieu + chevalet (position 2)', bridge: 'micro chevalet', both: 'position du milieu (les deux micros)', piezo: 'capteur'
  };
  const AMPS = {
    fender: { name: 'Clair « américain » (Fender, Blues Jr, Deluxe…)', model: 'Fender / « Black-face »' },
    marshall: { name: 'Britannique crunch (Marshall, Orange, Laney…)', model: 'Marshall / « British »' },
    vox: { name: 'Vox / « chimey » (AC15, AC30, Valvetronix…)', model: 'Vox AC30' },
    highgain: { name: 'Haute saturation (Mesa, Peavey 5150, EVH, Engl…)', model: 'Mesa / 5150 « High gain »' },
    practice: { name: 'Petit ampli à transistors (d’entraînement)', model: '' },
    modeling: { name: 'Ampli à modélisation (Katana, Mustang, Spark…)', model: '' },
    none: { name: 'Pas d’ampli : multi-effet / appli / casque', model: '' }
  };
  const PEDALS = [
    ['comp', 'Compresseur'], ['boost', 'Booster'], ['od', 'Overdrive (type Tube Screamer)'], ['dist', 'Distorsion (DS-1, RAT…)'],
    ['fuzz', 'Fuzz (Big Muff, Fuzz Face…)'], ['wah', 'Wah'], ['octave', 'Octaver / Whammy'], ['chorus', 'Chorus'], ['phaser', 'Phaser'],
    ['flanger', 'Flanger'], ['vibe', 'Uni-Vibe / rotary'], ['tremolo', 'Trémolo'], ['delay', 'Delay'], ['reverb', 'Reverb (pédale)'],
    ['multi', 'Multi-effet (contient tout)']
  ];
  const DEFAULT_GEAR = { guitar: 'sss', coilSplit: false, amp: 'fender', channels: 2, knobs: { gain: true, bass: true, mid: true, treble: true, presence: false, reverb: true }, loop: false, pedals: ['od'] };

  /* ------------------------------------------------------------------ */
  /* Moteur                                                              */
  /* ------------------------------------------------------------------ */
  const clamp = (v) => Math.max(0, Math.min(10, Math.round(v * 2) / 2));
  const clock = (v) => { const t = 7 + v; const hh = Math.floor(t); return hh + 'h' + (t - hh >= 0.5 ? '30' : ''); };

  function pickPosition(g, target) {
    const G = GUITARS[g.guitar];
    if (G.pos.indexOf(target) >= 0) return target;
    const fallback = { 'neck+middle': ['both', 'neck'], middle: ['both', 'neck'], 'middle+bridge': ['both', 'bridge'], both: ['neck+middle', 'middle'], neck: ['neck'], bridge: ['bridge'] }[target] || ['bridge'];
    return fallback.find((p) => G.pos.indexOf(p) >= 0) || G.pos[0];
  }

  function compute(ref, gear) {
    const G = GUITARS[gear.guitar];
    const has = (p) => gear.pedals.indexOf(p) >= 0 || gear.pedals.indexOf('multi') >= 0 || gear.amp === 'modeling' || gear.amp === 'none';
    const hasReal = (p) => gear.pedals.indexOf(p) >= 0;
    const notes = [];
    let gain = ref.gain;
    const eq = Object.assign({ bass: 5, mid: 5, treble: 5, presence: 5 }, ref.eq);

    /* --- Guitare --- */
    const guitar = { lines: [] };
    if (gear.guitar === 'acoustic') {
      notes.push('Avec une électro-acoustique, on ne peut pas vraiment imiter un son électrique saturé : garde les effets (chorus, delay, reverb) et un son clair.');
    }
    const pos = pickPosition(gear, ref.pickup);
    let userType = G.type(pos);
    const want = ref.pickupType;
    let tone = ref.guitarTone;
    if (pos !== ref.pickup && gear.guitar !== 'acoustic') notes.push(`Le son original utilise le ${POS_LABEL[ref.pickup]} : ta guitare n’a pas cette position, la ${POS_LABEL[pos]} est la plus proche.`);
    if (want === 'single' && userType === 'humbucker') {
      if (gear.coilSplit) { userType = 'single'; guitar.lines.push('Active le split (coil split) pour passer le humbucker en simple bobinage.'); }
      else { gain -= 1; eq.treble += 1; eq.bass -= 1; tone = Math.min(tone, 8); notes.push('Son original en micros simples : avec tes humbuckers, on baisse un peu le gain et les basses, et on remonte les aigus.'); }
    } else if (want === 'humbucker' && userType === 'single') {
      gain += 1; eq.mid += 1; eq.bass += 0.5; notes.push('Son original en humbucker : avec des micros simples, on remonte un peu le gain et les médiums pour épaissir.');
    } else if (want === 'single' && userType === 'p90') { gain -= 0.5; eq.treble += 0.5; }
    else if (want === 'humbucker' && userType === 'p90') { gain += 0.5; eq.mid += 0.5; }
    guitar.pos = pos;
    guitar.vol = ref.guitarVol;
    guitar.tone = tone;

    /* --- Saturation : qui la fournit ? --- */
    const amp = gear.amp;
    const multiAmp = amp === 'modeling' || amp === 'none';
    const hasDriveCh = multiAmp || amp === 'highgain' || gear.channels >= 2;
    const chain = []; // pédales avant l'ampli
    const fxChain = []; // modulation / temps
    let channel = 'clair';
    let ampGain = 3;
    let modelName = '';
    const drive = ref.drive;
    const g = gain;

    const pedal = (id, name, knobs, extra) => ({ id, name, knobs, owned: hasReal(id), extra });

    if (multiAmp) {
      modelName = drive === 'highgain' || (drive === 'distortion' && g >= 7.5) ? AMPS.highgain.model
        : drive === 'clean' || drive === 'fuzz' ? AMPS.fender.model : AMPS.marshall.model;
      if (['brian-may', 'streets', 'the-edge'].indexOf(ref.id) >= 0) modelName = AMPS.vox.model;
    }

    if (drive === 'clean') {
      channel = 'clair';
      ampGain = amp === 'marshall' || amp === 'vox' ? 2 : 3;
      if (ref.fx && ref.fx.comp && !has('comp')) notes.push('Pas de compresseur : attaque de façon très régulière, et baisse un peu le volume de la guitare pour lisser.');
    } else if (drive === 'edge') {
      if (has('od') && (amp === 'fender' || amp === 'practice' || amp === 'highgain')) {
        channel = 'clair'; ampGain = amp === 'fender' ? 4 : 3;
        chain.push(pedal('od', 'Overdrive', { Drive: clamp(g - 2), Tone: clamp(eq.treble - 0.5), Level: 6.5 }));
      } else {
        channel = amp === 'highgain' ? 'clair (gain haut)' : 'clair';
        ampGain = clamp(amp === 'vox' || amp === 'marshall' ? g + 0.5 : g + 2);
        if (amp === 'practice') notes.push('Un petit ampli à transistors sature mal « juste un peu » : monte le gain du canal clair au maximum ou utilise une overdrive douce.');
      }
    } else if (drive === 'crunch' || drive === 'overdrive') {
      const strong = drive === 'overdrive';
      if (amp === 'marshall' || amp === 'vox' || (multiAmp)) {
        channel = hasDriveCh ? 'saturé (crunch)' : 'unique, gain poussé';
        ampGain = clamp(g - (strong ? 0.5 : 0));
        if (strong && has('od')) chain.push(pedal('od', 'Overdrive (en boost)', { Drive: 1.5, Tone: 5.5, Level: 7.5 }, 'Elle pousse l’ampli : plus de sustain, graves plus serrés.'));
      } else if (amp === 'highgain') {
        channel = 'saturé'; ampGain = clamp(g * 0.55);
      } else if (has('od')) {
        channel = 'clair'; ampGain = 3.5;
        chain.push(pedal('od', 'Overdrive', { Drive: clamp(g - 0.5), Tone: clamp(eq.treble), Level: 6 }));
      } else if (has('dist')) {
        channel = 'clair'; ampGain = 3;
        chain.push(pedal('dist', 'Distorsion (réglée basse)', { Gain: clamp(g - 3), Tone: clamp(eq.treble - 1), Level: 6 }));
      } else if (hasDriveCh) {
        channel = 'saturé'; ampGain = clamp(amp === 'practice' ? g * 0.75 : g - 1);
      } else {
        channel = 'clair, volume fort'; ampGain = 10;
        notes.push('Ton ampli n’a ni canal saturé ni pédale de saturation : monte le gain/volume au maximum. Une overdrive t’aiderait beaucoup pour ce son.');
      }
    } else if (drive === 'distortion' || drive === 'highgain') {
      const high = drive === 'highgain';
      if (amp === 'highgain' || (multiAmp && high)) {
        channel = 'saturé (lead)'; ampGain = clamp(g * (high ? 0.7 : 0.6));
        if (high && has('od')) chain.push(pedal('od', 'Overdrive (en boost)', { Drive: 0, Tone: 6, Level: 8 }, 'Gain à zéro, niveau haut : resserre les graves de l’ampli.'));
      } else if (has('dist')) {
        channel = 'clair'; ampGain = amp === 'marshall' || amp === 'vox' ? 3 : 3.5;
        chain.push(pedal('dist', 'Distorsion', { Gain: clamp(g - (high ? 0 : 1)), Tone: clamp(eq.treble - 0.5), Level: 6 }));
        if (high && has('od')) chain.unshift(pedal('od', 'Overdrive (en boost)', { Drive: 0, Tone: 6, Level: 7 }, 'Avant la distorsion : plus de précision.'));
      } else if ((amp === 'marshall' || multiAmp) && hasDriveCh) {
        channel = 'saturé'; ampGain = clamp(g + (high ? 0.5 : 0));
        if (has('od')) chain.push(pedal('od', 'Overdrive (en boost)', { Drive: 2, Tone: 6, Level: 8 }));
      } else if (has('od') && hasDriveCh) {
        channel = 'saturé'; ampGain = clamp(g - 1);
        chain.push(pedal('od', 'Overdrive (en boost)', { Drive: 3, Tone: 6, Level: 7 }));
      } else if (has('od')) {
        channel = 'clair, poussé'; ampGain = 6;
        chain.push(pedal('od', 'Overdrive (à fond)', { Drive: 10, Tone: clamp(eq.treble), Level: 6 }));
        notes.push('Une overdrive seule ne donne pas assez de saturation pour ce son : il manque une distorsion (ou un canal saturé).');
      } else if (hasDriveCh) {
        channel = 'saturé'; ampGain = clamp(amp === 'practice' ? g * 0.85 : g);
      } else {
        channel = 'clair'; ampGain = 10;
        notes.push('Il te faut une pédale de distorsion (ou un ampli avec canal saturé) pour ce son.');
      }
    } else if (drive === 'fuzz') {
      channel = amp === 'highgain' ? 'clair' : 'clair (légèrement poussé)'; ampGain = amp === 'marshall' || amp === 'vox' ? 4 : 4.5;
      if (has('fuzz')) chain.push(pedal('fuzz', 'Fuzz', { Fuzz: clamp(g), Tone: clamp(eq.treble - 0.5), Volume: 6 }));
      else if (has('dist')) {
        chain.push(pedal('dist', 'Distorsion (pour imiter la fuzz)', { Gain: 9, Tone: clamp(eq.treble - 2), Level: 6 }));
        notes.push('Pas de fuzz : une distorsion gain à fond et tonalité assez fermée s’en approche (en moins « baveux »).');
      } else if (has('od')) {
        chain.push(pedal('od', 'Overdrive (pour imiter la fuzz)', { Drive: 10, Tone: clamp(eq.treble - 1), Level: 6 }));
        if (hasDriveCh) { channel = 'saturé'; ampGain = 5; }
        notes.push('Pas de fuzz ni de distorsion : overdrive à fond, sur le canal saturé si possible. On sera loin du grain fuzz, mais ça tient.');
      } else if (hasDriveCh) { channel = 'saturé'; ampGain = clamp(g); notes.push('Pas de fuzz : utilise le canal saturé gain élevé, aigus un peu baissés.'); eq.treble -= 1; }
      else { notes.push('Ce son repose sur une pédale fuzz, que tu n’as pas.'); }
    }
    if (amp === 'practice' && channel !== 'clair' && /satur/.test(channel)) notes.push('Sur un petit ampli à transistors, garde le gain un cran plus bas que ce que tu crois : ça évite le son « bourdon ».');

    /* --- Égalisation selon l'ampli --- */
    if (amp === 'fender' && eq.mid >= 6) eq.mid += 1;
    if (amp === 'fender') eq.treble -= 0.5;
    if (amp === 'marshall') { eq.treble -= 0.5; eq.presence -= 0.5; }
    if (amp === 'vox') eq.treble -= 1;
    if (amp === 'practice' && drive !== 'clean') { eq.bass -= 1; eq.treble -= 1; }
    if (amp === 'highgain' && /satur/.test(channel)) eq.bass -= 0.5;
    const k = gear.knobs;
    const ampKnobs = [];
    if (k.gain) ampKnobs.push(['Gain', clamp(ampGain)]);
    ampKnobs.push(['Volume', null]);
    if (k.bass) ampKnobs.push(['Basses', clamp(eq.bass)]);
    if (k.mid) ampKnobs.push(['Médiums', clamp(eq.mid)]);
    else if (eq.mid >= 7 || eq.mid <= 3.5) notes.push(eq.mid >= 7 ? 'Ton ampli n’a pas de réglage de médiums : pour les « remonter », baisse un peu basses et aigus.' : 'Pas de bouton médiums : pour les creuser, monte un peu basses et aigus.');
    if (k.treble) ampKnobs.push(['Aigus', clamp(k.presence ? eq.treble : eq.treble + (eq.presence - 5) * 0.5)]);
    if (k.presence) ampKnobs.push(['Presence', clamp(eq.presence)]);
    if (!k.gain && channel !== 'clair') notes.push('Pas de bouton gain : c’est le volume de l’ampli qui fait saturer (plus fort = plus saturé).');

    /* --- Effets --- */
    const fx = ref.fx || {};
    const pre = [];
    if (fx.comp) {
      if (has('comp')) pre.push(pedal('comp', 'Compresseur', { Sustain: clamp(fx.comp), Level: 6, Attack: 5 }));
    }
    if (fx.wah) {
      if (has('wah')) pre.push(pedal('wah', 'Wah', {}, 'Utilisation : ' + fx.wah + '.'));
      else notes.push('Pas de wah : ' + (/mi-course/.test(fx.wah) ? 'baisse la tonalité de la guitare vers 4-5 et monte les médiums de l’ampli pour un effet « nasal ».' : 'tu peux t’en passer, elle sert aux effets.'));
    }
    if (fx.octave) {
      if (has('octave')) pre.push(pedal('octave', 'Octaver', { [fx.octave === 'down' ? 'Octave basse' : 'Octave haute']: 7, Direct: 6 }));
      else notes.push(fx.octave === 'down' ? 'Pas d’octaver : joue le riff une octave plus bas si c’est possible.' : 'Pas d’octaver : l’effet d’octave aiguë n’a pas d’équivalent simple, ce n’est pas grave.');
    }
    // ordre classique : compresseur, wah, octaver, fuzz, overdrive, distorsion
    const order = { comp: 0, wah: 1, octave: 2, fuzz: 3, boost: 4, od: 5, dist: 6 };
    const allPre = pre.concat(chain);
    allPre.sort((a, b) => order[a.id] - order[b.id]);

    const mod = (id, label, knobs, alt) => {
      if (has(id)) return pedal(id, label, knobs);
      for (const [aid, alabel, aknobs, why] of alt || []) if (hasReal(aid)) { notes.push(why); return pedal(aid, alabel, aknobs); }
      return null;
    };
    if (fx.chorus) {
      const p = mod('chorus', 'Chorus' + (fx.chorus.when ? ' (' + fx.chorus.when + ')' : ''), { Rate: fx.chorus.rate, Depth: fx.chorus.depth },
        [['flanger', 'Flanger (en chorus)', { Rate: fx.chorus.rate, Depth: Math.min(fx.chorus.depth, 5), Feedback: 1 }, 'Pas de chorus : un flanger lent avec peu de feedback s’en approche.'],
          ['vibe', 'Uni-Vibe (en chorus)', { Speed: fx.chorus.rate, Intensity: 4 }, 'Pas de chorus : le vibe, mode chorus, s’en approche.']]);
      if (p) fxChain.push(p); else if (!fx.chorus.optional) notes.push('Pas de chorus : ce n’est pas indispensable, monte un peu la reverb.');
    }
    if (fx.vibe) {
      const p = mod('vibe', 'Uni-Vibe', { Speed: fx.vibe.speed, Intensity: fx.vibe.depth },
        [['phaser', 'Phaser (en vibe)', { Speed: Math.max(1, fx.vibe.speed - 1), Depth: 6 }, 'Pas d’Uni-Vibe : un phaser lent s’en approche.'],
          ['chorus', 'Chorus (en vibe)', { Rate: fx.vibe.speed, Depth: 8 }, 'Pas d’Uni-Vibe : un chorus profond et assez rapide s’en approche.']]);
      if (p) fxChain.push(p); else notes.push('Pas d’Uni-Vibe (ni phaser ou chorus) : ce n’est pas indispensable.');
    }
    if (fx.phaser) { const p = mod('phaser', 'Phaser', { Speed: fx.phaser.speed, Depth: fx.phaser.depth }, [['vibe', 'Uni-Vibe', { Speed: fx.phaser.speed, Intensity: 5 }, 'Pas de phaser : le vibe donne un effet voisin.']]); if (p) fxChain.push(p); else notes.push('Pas de phaser : pas grave, c’est une couleur.'); }
    if (fx.flanger) { const p = mod('flanger', 'Flanger', { Rate: fx.flanger.rate, Depth: fx.flanger.depth, Feedback: 5 }); if (p) fxChain.push(p); }
    if (fx.tremolo) { const p = mod('tremolo', 'Trémolo', { Speed: fx.tremolo.speed, Depth: fx.tremolo.depth }); if (p) fxChain.push(p); }
    let reverb = fx.reverb || 0;
    if (fx.delay) {
      const ms = fx.delay.ms || Math.round(0.75 * 60000 / (fx.delay.bpm || 120));
      const timeTxt = fx.delay.note ? `${ms} ms (${fx.delay.note} à ${fx.delay.bpm} BPM)` : `${ms} ms`;
      if (has('delay')) fxChain.push(pedal('delay', 'Delay', { Mix: fx.delay.mix, Repeats: fx.delay.repeats }, 'Temps : ' + timeTxt + (fx.delay.note ? ' — ou tape le tempo avec le tap tempo, en croche pointée.' : '.')));
      else { reverb += 1.5; notes.push('Pas de delay : monte la reverb un peu plus. C’est le plus gros manque pour ce son.'); }
    }
    if (reverb > 0) {
      if (hasReal('reverb') || ((multiAmp || hasReal('multi')) && !k.reverb)) fxChain.push(pedal('reverb', 'Reverb', { Mix: clamp(reverb), Decay: clamp(reverb + 1) }));
      else if (k.reverb) ampKnobs.push(['Reverb', clamp(reverb)]);
      else if (reverb >= 3) notes.push('Pas de reverb : le son sera plus sec que l’original.');
    } else if (k.reverb) ampKnobs.push(['Reverb', 0]);

    const loop = gear.loop && /satur/.test(channel) && fxChain.length;
    return { ref, guitar, channel, modelName, ampKnobs, pre: allPre, post: fxChain, loop, notes, eq };
  }

  /* ------------------------------------------------------------------ */
  /* Rendu                                                               */
  /* ------------------------------------------------------------------ */
  function knob(label, value, pedalStyle) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 50 50');
    svg.setAttribute('class', 'knob-svg');
    const mk = (n, a) => { const e = document.createElementNS(ns, n); for (const k in a) e.setAttribute(k, a[k]); svg.appendChild(e); return e; };
    mk('circle', { cx: 25, cy: 25, r: 17, class: 'knob-body' });
    if (value != null) {
      const ang = (-135 + value * 27) * Math.PI / 180;
      mk('line', { x1: 25, y1: 25, x2: 25 + Math.sin(ang) * 15, y2: 25 - Math.cos(ang) * 15, class: 'knob-pointer' });
    }
    for (let i = 0; i <= 10; i++) {
      const a = (-135 + i * 27) * Math.PI / 180;
      mk('line', { x1: 25 + Math.sin(a) * 20, y1: 25 - Math.cos(a) * 20, x2: 25 + Math.sin(a) * 23, y2: 25 - Math.cos(a) * 23, class: 'knob-tick' });
    }
    return h('div', { class: 'knob' }, [svg, h('b', { text: value == null ? 'à ton goût' : String(value).replace('.', ',') }),
      pedalStyle && value != null ? h('small', { text: clock(value) }) : null, h('span', { text: label })]);
  }

  function pedalBox(p) {
    const knobs = h('div', { class: 'knob-row' });
    Object.keys(p.knobs).forEach((k) => knobs.appendChild(knob(k, p.knobs[k], true)));
    return h('div', { class: 'pedal ' + p.id }, [
      h('div', { class: 'pedal-name', text: p.name }),
      p.owned ? null : h('div', { class: 'pedal-sub', text: 'dans ton multi-effet / ampli' }),
      knobs, p.extra ? h('small', { class: 'hint', text: p.extra }) : null
    ]);
  }

  const norm = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ').trim();

  /** Références de la liste qui correspondent à la recherche (chanson, artiste, style). */
  function localMatches(query) {
    const toks = norm(query).split(/[^a-z0-9]+/).filter((t) => t.length >= 2 && ['the', 'le', 'la', 'les', 'de', 'du', 'des', 'of'].indexOf(t) < 0);
    if (!toks.length) return [];
    const scored = [];
    window.TONE_REFS.forEach((r) => {
      const title = norm(r.title), artist = norm(r.artist || '');
      const hay = title + ' ' + artist;
      if (!toks.every((t) => hay.indexOf(t) >= 0)) return;
      let sc = toks.every((t) => title.indexOf(t) >= 0) ? 3 : 1;
      if (r.kind === 'artist') sc += 1;
      if (r.kind === 'style') sc -= 1;
      if (title === norm(query) || title.split(' (')[0] === norm(query)) sc += 5;
      scored.push({ r, sc });
    });
    return scored.sort((x, y) => y.sc - x.sc).map((x) => x.r.id);
  }

  const GENRES = [
    [/shoegaze/, 'st-shoegaze', 'shoegaze'], [/post-rock|ambient/, 'st-ambient', 'post-rock / ambient'],
    [/grunge/, 'st-grunge', 'grunge'], [/metal/, 'st-metal', 'metal'], [/punk/, 'st-punk', 'punk'],
    [/reggae|\bska\b/, 'st-reggae', 'reggae'], [/funk|disco/, 'st-funk', 'funk'], [/jazz|swing/, 'st-jazz', 'jazz'],
    [/country|bluegrass/, 'st-country', 'country'], [/hard rock/, 'st-classic-rock', 'hard rock'], [/blues/, 'st-blues', 'blues'],
    [/rock independant|indie|garage|rock alternatif|britpop/, 'st-indie', 'rock indé'],
    [/rock/, 'st-classic-rock', 'rock'], [/pop|chanson|variete|folk|soul|r&b/, 'st-clean-pop', 'pop / chanson']
  ];

  /** Pour une chanson ou un artiste absent de la liste : on lit Wikipédia pour trouver l'artiste ou le genre. */
  async function guessFromWikipedia(query) {
    if (!window.Wiki) return null;
    const titles = await Wiki.search('fr', query);
    if (!titles.length) return null;
    const page = await Wiki.page('fr', titles[0]);
    if (!page || !page.text) return null;
    const text = norm(page.text.slice(0, 2500));
    // même artiste qu'une référence connue ?
    const artistRef = window.TONE_REFS.filter((r) => r.kind !== 'style').find((r) => {
      const names = (r.kind === 'artist' ? [r.title.split(' (')[0], r.artist] : [r.artist.split(' – ')[0], r.artist.split(' – ')[1]]).filter(Boolean).map(norm);
      return names.some((n) => n.length > 3 && text.indexOf(n) >= 0);
    });
    if (artistRef) return { refId: artistRef.id, banner: `« ${page.title.replace(/ \(.*\)$/, '')} » n’est pas dans ma liste, mais d’après Wikipédia c’est lié à ${artistRef.kind === 'artist' ? artistRef.title : artistRef.artist} : voici les réglages de « ${artistRef.title} », le son le plus proche.` };
    const g = GENRES.find(([re]) => re.test(text));
    if (g) return { refId: g[1], banner: `« ${page.title.replace(/ \(.*\)$/, '')} » n’est pas dans ma liste. D’après Wikipédia, c’est du ${g[2]} : voici les réglages typiques de ce style.` };
    return null;
  }

  function gearSummary(gear) {
    const pedals = gear.pedals.map((id) => (PEDALS.find((p) => p[0] === id) || [id, id])[1].split(' (')[0]);
    return [GUITARS[gear.guitar].name, AMPS[gear.amp].name.split(' (')[0] + (gear.amp !== 'modeling' && gear.amp !== 'none' ? ', ' + gear.channels + (gear.channels > 1 ? ' canaux' : ' canal') : ''),
      pedals.length ? pedals.join(', ') : 'pas de pédale'].join(' · ');
  }

  function render(el) {
    const stored = App.store('gear', null);
    const gear = Object.assign({}, DEFAULT_GEAR, stored || {});
    gear.knobs = Object.assign({}, DEFAULT_GEAR.knobs, gear.knobs);
    let state = App.store('toneState', null); // { query, refId, banner, others }
    let editing = !stored;
    const saveGear = () => App.save('gear', gear);

    const gearBox = h('div', { class: 'panel' });
    const left = h('div');
    const input = h('input', { type: 'text', placeholder: 'Une chanson, un artiste ou un style (ex. Back in Black, Nirvana, funk…)' });
    const btn = h('button', { class: 'btn primary', text: 'Trouver les réglages' });
    const msg = h('div');
    const result = h('div');
    el.appendChild(gearBox);
    el.appendChild(h('div', { class: 'panel' }, [
      h('h2', { style: 'margin-top:0', text: '🎯 Le son que tu veux' }),
      h('div', { class: 'free-search' }, [input, btn]),
      h('p', { class: 'hint', text: 'Réglages de départ : chaque matériel sonne différemment, ajuste à l’oreille (commence par le gain, puis les médiums).' }),
      msg
    ]));
    el.appendChild(result);

    function drawGearBox() {
      gearBox.innerHTML = '';
      if (!editing) {
        const edit = h('button', { class: 'btn small', text: '✏️ Modifier' });
        edit.addEventListener('click', () => { editing = true; drawGearBox(); });
        gearBox.appendChild(h('div', { class: 'gear-summary' }, [
          h('div', {}, [h('b', { text: '🎛 Ton matériel (enregistré) : ' }), document.createTextNode(gearSummary(gear))]), edit
        ]));
        return;
      }
      gearBox.appendChild(left);
      drawGear();
      const done = h('button', { class: 'btn primary', text: '✔ Enregistrer mon matériel' });
      done.addEventListener('click', () => { saveGear(); editing = false; drawGearBox(); drawResult(); });
      gearBox.appendChild(h('div', { style: 'margin-top:.6rem' }, [done]));
    }

    async function find(q) {
      q = (q || '').trim();
      if (!q) return;
      msg.innerHTML = '';
      const ids = localMatches(q);
      if (ids.length) {
        state = { query: q, refId: ids[0], others: ids.slice(1, 6) };
        App.save('toneState', state);
        drawResult();
        return;
      }
      msg.appendChild(h('div', { class: 'feedback info', text: 'Pas dans ma liste : je cherche sur Wikipédia…' }));
      let guess = null;
      try { guess = await guessFromWikipedia(q); } catch (e) { guess = null; }
      msg.innerHTML = '';
      if (guess) {
        state = Object.assign({ query: q }, guess);
        App.save('toneState', state);
        drawResult();
        return;
      }
      result.innerHTML = '';
      msg.appendChild(h('div', { class: 'notice warn', text: 'Je n’ai pas trouvé « ' + q + ' ». Essaie le nom de l’artiste, ou un style : ' + window.TONE_REFS.filter((r) => r.kind === 'style').map((r) => r.title.toLowerCase()).join(', ') + '. Tu peux aussi me demander d’ajouter ce son.' }));
    }
    btn.addEventListener('click', () => find(input.value));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') find(input.value); });

    function drawGear() {
      left.innerHTML = '';
      left.appendChild(h('h2', { style: 'margin-top:0', text: '🎛 Ton matériel' }));
      left.appendChild(App.field('Guitare', App.select(Object.keys(GUITARS).map((k) => ({ value: k, label: GUITARS[k].name })), gear.guitar, (v) => { gear.guitar = v; saveGear(); drawGear(); drawResult(); })));
      if (['hss', 'hh', 'hsh', 'hollow'].indexOf(gear.guitar) >= 0) {
        const cb = h('input', { type: 'checkbox' }); cb.checked = gear.coilSplit;
        cb.addEventListener('change', () => { gear.coilSplit = cb.checked; saveGear(); drawResult(); });
        left.appendChild(h('label', { class: 'checkbox' }, [cb, 'Mes humbuckers ont un coil split']));
      }
      left.appendChild(App.field('Ampli', App.select(Object.keys(AMPS).map((k) => ({ value: k, label: AMPS[k].name })), gear.amp, (v) => { gear.amp = v; saveGear(); drawGear(); drawResult(); })));
      if (gear.amp !== 'modeling' && gear.amp !== 'none') {
        left.appendChild(App.field('Canaux', App.select([{ value: 1, label: '1 canal' }, { value: 2, label: '2 canaux (clair + saturé)' }, { value: 3, label: '3 canaux ou plus' }], gear.channels, (v) => { gear.channels = +v; saveGear(); drawResult(); })));
      }
      const kb = h('div', { class: 'check-grid' });
      [['gain', 'Gain'], ['bass', 'Basses'], ['mid', 'Médiums'], ['treble', 'Aigus'], ['presence', 'Presence'], ['reverb', 'Reverb']].forEach(([id, l]) => {
        const c = h('input', { type: 'checkbox' }); c.checked = gear.knobs[id];
        c.addEventListener('change', () => { gear.knobs[id] = c.checked; saveGear(); drawResult(); });
        kb.appendChild(h('label', { class: 'checkbox' }, [c, l]));
      });
      left.appendChild(App.field('Boutons de l’ampli', kb));
      const lc = h('input', { type: 'checkbox' }); lc.checked = gear.loop;
      lc.addEventListener('change', () => { gear.loop = lc.checked; saveGear(); drawResult(); });
      left.appendChild(h('label', { class: 'checkbox' }, [lc, 'Mon ampli a une boucle d’effets (FX loop)']));
      const pg = h('div', { class: 'check-grid' });
      PEDALS.forEach(([id, l]) => {
        const c = h('input', { type: 'checkbox' }); c.checked = gear.pedals.indexOf(id) >= 0;
        c.addEventListener('change', () => {
          gear.pedals = gear.pedals.filter((x) => x !== id);
          if (c.checked) gear.pedals.push(id);
          saveGear(); drawResult();
        });
        pg.appendChild(h('label', { class: 'checkbox' }, [c, l]));
      });
      left.appendChild(App.field('Mes pédales', pg));
      left.appendChild(h('p', { class: 'hint', text: 'Chaque changement est enregistré dans ce navigateur : tu le retrouveras à ta prochaine visite.' }));
    }

    function drawResult() {
      if (!state) return;
      const ref = window.TONE_REFS.find((x) => x.id === state.refId);
      if (!ref) return;
      const r = compute(ref, gear);
      result.innerHTML = '';
      const card = h('div', { class: 'panel tone-result' });
      if (state.banner) card.appendChild(h('div', { class: 'notice', text: state.banner }));
      card.appendChild(h('h2', { text: ref.title + (ref.artist && ref.kind !== 'artist' ? ' — ' + ref.artist : '') }));
      card.appendChild(h('p', { text: ref.desc }));
      if (ref.tuning && ref.tuning !== 'Standard') card.appendChild(h('div', { class: 'notice', html: '<b>Accordage :</b> ' + ref.tuning }));

      // Guitare
      const gk = h('div', { class: 'knob-row' }, [knob('Volume', r.guitar.vol), knob('Tonalité', r.guitar.tone)]);
      card.appendChild(h('h3', { text: '1. Guitare' }));
      card.appendChild(h('p', {}, [h('b', { text: 'Sélecteur : ' }), document.createTextNode(POS_LABEL[r.guitar.pos])]));
      r.guitar.lines.forEach((l) => card.appendChild(h('p', { class: 'hint', text: l })));
      card.appendChild(gk);

      // Chaîne
      card.appendChild(h('h3', { text: '2. Branchements et pédales' }));
      const chain = h('div', { class: 'signal-chain' });
      const step = (txt, cls) => h('div', { class: 'chain-step ' + (cls || ''), text: txt });
      const arrow = () => h('div', { class: 'chain-arrow', text: '→' });
      chain.appendChild(step('🎸 Guitare'));
      r.pre.forEach((p) => { chain.appendChild(arrow()); chain.appendChild(step(p.name, 'ped')); });
      if (!r.loop) r.post.forEach((p) => { chain.appendChild(arrow()); chain.appendChild(step(p.name, 'ped mod')); });
      chain.appendChild(arrow());
      chain.appendChild(step(gear.amp === 'none' ? '🎧 Casque / sortie' : '🔊 Ampli', 'amp'));
      if (r.loop) r.post.forEach((p) => { chain.appendChild(arrow()); chain.appendChild(step(p.name + ' (boucle)', 'ped mod')); });
      card.appendChild(chain);
      if (r.loop) card.appendChild(h('p', { class: 'hint', text: 'Les effets de modulation et d’écho vont dans la boucle d’effets (send → pédales → return) : ils restent nets derrière la saturation.' }));
      if (!r.pre.length && !r.post.length) card.appendChild(h('p', { class: 'muted', text: 'Aucune pédale nécessaire : guitare directement dans l’ampli.' }));
      const pedals = h('div', { class: 'pedal-grid' });
      r.pre.concat(r.post).forEach((p) => pedals.appendChild(pedalBox(p)));
      card.appendChild(pedals);
      if (r.pre.length || r.post.length) card.appendChild(h('p', { class: 'hint', text: 'Sous chaque bouton de pédale : la position en heures (7h = minimum, 12h = milieu, 17h = maximum).' }));

      // Ampli
      card.appendChild(h('h3', { text: '3. Ampli' }));
      const modelTxt = r.modelName ? ' — modèle conseillé : ' + r.modelName : '';
      card.appendChild(h('p', {}, [h('b', { text: 'Canal : ' }), document.createTextNode(r.channel + modelTxt)]));
      const ak = h('div', { class: 'knob-row' });
      r.ampKnobs.forEach(([l, v]) => ak.appendChild(knob(l, v)));
      card.appendChild(ak);
      card.appendChild(h('p', { class: 'hint', text: 'Volume : selon la pièce. À faible volume, monte les basses d’un cran ; à fort volume, baisse-les un peu.' }));

      // Conseils
      const tips = (ref.tips || []).concat(r.notes);
      if (tips.length) {
        card.appendChild(h('h3', { text: '4. Conseils et adaptations à ton matériel' }));
        card.appendChild(h('ul', {}, tips.map((t) => h('li', { text: t }))));
      }
      if (state.others && state.others.length) {
        card.appendChild(h('p', { class: 'hint', text: 'Autres résultats :' }));
        card.appendChild(h('div', { class: 'chips' }, state.others.map((id) => {
          const o = window.TONE_REFS.find((x) => x.id === id);
          const bt = h('button', { class: 'btn small', text: o.title + (o.artist && o.kind === 'song' ? ' (' + o.artist.split(' – ')[0] + ')' : '') });
          bt.addEventListener('click', () => { state = { query: state.query, refId: id, others: state.others.filter((x) => x !== id).concat([state.refId]) }; App.save('toneState', state); drawResult(); });
          return bt;
        })));
      }
      result.appendChild(card);
    }

    drawGearBox();
    if (state) { input.value = state.query || ''; drawResult(); }
    else input.focus();
  }

  App.register('/guitare/son', {
    title: 'Trouver le son',
    subtitle: 'Enregistre ton matériel une fois, puis tape une chanson, un artiste ou un style : tu obtiens les réglages de guitare, pédales et ampli pour t’en approcher.',
    render
  });

  window.ToneMatch = { compute, GUITARS, AMPS };
})();

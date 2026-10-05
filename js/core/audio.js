/* Synthèse sonore légère (Web Audio) : piano, guitare, étouffé. */
(function () {
  'use strict';

  let ctx = null;
  let master = null;

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createDynamicsCompressor();
      master.threshold.value = -12;
      const vol = ctx.createGain();
      vol.gain.value = 0.8;
      master.connect(vol);
      vol.connect(ctx.destination);
    }
    // iOS / iPadOS : l'état peut être « suspended » ou « interrupted »
    if (ctx.state !== 'running' && ctx.resume) ctx.resume().catch(() => {});
    return ctx;
  }

  /* ------------------------------------------------------------------ */
  /* Déblocage du son sur iPhone / iPad                                  */
  /* ------------------------------------------------------------------ */
  // Safari iOS coupe le son des sites en mode silencieux et n'autorise l'audio qu'après un geste.
  // On (1) demande la catégorie « lecture » (comme une appli de musique), (2) joue un son muet
  // dans le geste de l'utilisateur, (3) garde un élément <audio> silencieux pour ignorer le mode silencieux.
  let silentEl = null;
  function silentWavUrl() {
    const n = 4410; // 0,1 s à 44,1 kHz, 8 bits mono
    const buf = new ArrayBuffer(44 + n);
    const v = new DataView(buf);
    const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 44100, true); v.setUint32(28, 44100, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
    str(36, 'data'); v.setUint32(40, n, true);
    for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
    return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  }

  function unlock() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* ignore */ }
    const c = ac();
    try {
      const b = c.createBuffer(1, 1, 22050);
      const s = c.createBufferSource();
      s.buffer = b;
      s.connect(c.destination);
      s.start(0);
    } catch (e) { /* ignore */ }
    const isIOS = /iP(hone|ad|od)|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document;
    if (!silentEl && isIOS) {
      try {
        silentEl = document.createElement('audio');
        silentEl.setAttribute('playsinline', '');
        silentEl.setAttribute('x-webkit-airplay', 'deny');
        silentEl.loop = true;
        silentEl.preload = 'auto';
        silentEl.src = silentWavUrl();
        const p = silentEl.play();
        if (p && p.catch) p.catch(() => { silentEl = null; });
      } catch (e) { silentEl = null; }
    }
    if (c.state === 'running' && (silentEl || !isIOS)) {
      ['touchstart', 'touchend', 'pointerdown', 'mousedown', 'keydown'].forEach((ev) => document.removeEventListener(ev, unlock, true));
    }
  }
  ['touchstart', 'touchend', 'pointerdown', 'mousedown', 'keydown'].forEach((ev) => document.addEventListener(ev, unlock, true));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
  });

  function now() { return ac().currentTime; }

  /** Son de piano simple : partiels sinusoïdaux à décroissance exponentielle. */
  function piano(midi, when, dur, vel) {
    const c = ac();
    const t = when == null ? c.currentTime + 0.02 : when;
    dur = dur || 1.2;
    vel = vel == null ? 0.5 : vel;
    const f = Music.midiToFreq(midi);
    const out = c.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(vel * 0.35, t + 0.005);
    out.gain.exponentialRampToValueAtTime(vel * 0.12, t + 0.4);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.6);
    out.connect(master);
    const partials = [[1, 1], [2, 0.45], [3, 0.2], [4, 0.12], [5, 0.05]];
    partials.forEach(([h, a]) => {
      if (f * h > 12000) return;
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * h * (1 + 0.0004 * h * h);
      const g = c.createGain();
      g.gain.setValueAtTime(a, t);
      g.gain.exponentialRampToValueAtTime(a * 0.02, t + dur / h + 0.3);
      o.connect(g);
      g.connect(out);
      o.start(t);
      o.stop(t + dur + 0.7);
    });
  }

  /** Corde pincée : dent de scie filtrée, filtre qui se referme. */
  function guitar(midi, when, dur, vel) {
    const c = ac();
    const t = when == null ? c.currentTime + 0.02 : when;
    dur = dur || 1.5;
    vel = vel == null ? 0.5 : vel;
    const f = Music.midiToFreq(midi);
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    const o2 = c.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = f * 1.002;
    const filt = c.createBiquadFilter();
    filt.type = 'lowpass';
    filt.Q.value = 1;
    filt.frequency.setValueAtTime(Math.min(f * 8, 9000), t);
    filt.frequency.exponentialRampToValueAtTime(Math.max(f * 1.2, 200), t + 0.5);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel * 0.28, t + 0.004);
    g.gain.exponentialRampToValueAtTime(vel * 0.08, t + 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(filt);
    o2.connect(filt);
    filt.connect(g);
    g.connect(master);
    o.start(t);
    o2.start(t);
    o.stop(t + dur + 0.05);
    o2.stop(t + dur + 0.05);
  }

  /** Coup étouffé (chuck) : bruit filtré très court. */
  function mute(when, vel) {
    const c = ac();
    const t = when == null ? c.currentTime + 0.02 : when;
    const len = Math.floor(c.sampleRate * 0.06);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = c.createBufferSource();
    src.buffer = buf;
    const filt = c.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = 1800;
    filt.Q.value = 0.8;
    const g = c.createGain();
    g.gain.value = (vel == null ? 0.5 : vel) * 0.9;
    src.connect(filt);
    filt.connect(g);
    g.connect(master);
    src.start(t);
  }

  /** Métronome : « toc » de bloc de bois, bien audible même sur un haut-parleur de téléphone. */
  function click(when, accent) {
    const c = ac();
    const t = when == null ? c.currentTime + 0.02 : when;
    const peak = accent ? 1.0 : 0.7;
    // corps du son : onde carrée filtrée avec une petite chute de hauteur
    const o = c.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(accent ? 1900 : 1400, t);
    o.frequency.exponentialRampToValueAtTime(accent ? 1300 : 950, t + 0.03);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = accent ? 2000 : 1500;
    bp.Q.value = 3;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(bp);
    bp.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 0.1);
    // attaque : petit bruit très court
    const len = Math.floor(c.sampleRate * 0.012);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const n = c.createBufferSource();
    n.buffer = buf;
    const ng = c.createGain();
    ng.gain.value = peak * 0.6;
    n.connect(ng);
    ng.connect(master);
    n.start(t);
  }

  function play(midi, opts) {
    opts = opts || {};
    const fn = opts.instrument === 'guitar' ? guitar : piano;
    fn(midi, opts.when, opts.dur, opts.vel);
  }

  function playSequence(midis, opts) {
    opts = opts || {};
    const gap = opts.gap || 0.5;
    const t0 = now() + 0.05;
    midis.forEach((m, i) => {
      if (Array.isArray(m)) m.forEach((x) => play(x, Object.assign({}, opts, { when: t0 + i * gap })));
      else play(m, Object.assign({}, opts, { when: t0 + i * gap }));
    });
    return t0 + midis.length * gap;
  }

  window.Audio2 = { ac, now, piano, guitar, mute, click, play, playSequence };
})();

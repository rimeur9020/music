/* Banque de formes d'accords mobiles : la forme donne le type d'accord, le rond la fondamentale. */
(function () {
  'use strict';
  const { h } = App;
  const M = Music;

  // Écart (en demi-tons) de chaque corde à vide par rapport à la fondamentale.
  const BASE = { 6: [0, 5, 10, 15, 19, 24], 5: [-5, 0, 5, 10, 14, 19] };

  /*
   * Chaque forme : type, formule, corde de la fondamentale (6 ou 5) et intervalle joué sur chaque corde
   * (de la 6e à la 1re). « - » = corde étouffée, « ? » = note facultative.
   */
  const FAMILIES = [
    { title: 'Accords de base', shapes: [
      ['Majeur', '1 3 5', 6, '1 5 1 3 5 1'], ['Majeur', '1 3 5', 5, '- 1 5 1 3 5?'],
      ['Mineur (m)', '1 b3 5', 6, '1 5 1 b3 5 1'], ['Mineur (m)', '1 b3 5', 5, '- 1 5 1 b3 5?'],
      ['7', '1 3 5 b7', 6, '1 5 b7 3 5 1?'], ['7', '1 3 5 b7', 5, '- 1 5 b7 3 5?'], ['7', '1 3 5 b7', 6, '1 - b7 3 - -'],
      ['maj7', '1 3 5 7', 6, '1 - 7 3 5 -'], ['maj7', '1 3 5 7', 5, '- 1 5 7 3 5?'],
      ['m7', '1 b3 5 b7', 6, '1 5 b7 b3 5 1?'], ['m7', '1 b3 5 b7', 5, '- 1 5 b7 b3 5?'], ['m7', '1 b3 5 b7', 6, '1 - b7 b3 - -']
    ] },
    { title: 'Diminués et augmentés', shapes: [
      ['m7♭5', '1 b3 b5 b7', 6, '1 - b7 b3 b5 -'], ['m7♭5', '1 b3 b5 b7', 5, '- 1 b5 b7 b3 -'],
      ['dim', '1 b3 b5', 6, '1 b5 1 b3 - -'], ['dim', '1 b3 b5', 5, '- 1 b5 1 b3 -'],
      ['dim7', '1 b3 b5 bb7', 6, '1 - bb7 b3 b5 -'], ['dim7', '1 b3 b5 bb7', 5, '- 1 b5 bb7 b3 -'],
      ['aug (+)', '1 3 #5', 6, '1 - 1 3 #5 -'], ['aug (+)', '1 3 #5', 5, '- 1 3 #5 1 -'],
      ['7(♯5)', '1 3 #5 b7', 6, '1 - b7 3 #5 -'], ['7(♯5)', '1 3 #5 b7', 5, '- 1 - b7 3 #5']
    ] },
    { title: 'Sus et add', shapes: [
      ['sus2', '1 2 5', 6, '1 5 1 2 5 1?'], ['sus2', '1 2 5', 5, '- 1 5 1 2 5?'],
      ['sus4', '1 4 5', 6, '1 5 1 4 5 1'], ['sus4', '1 4 5', 5, '- 1 5 1 4 5?'],
      ['add9', '1 3 5 9', 6, '1 5 9 3 - -'], ['add9', '1 3 5 9', 5, '- 1 5 9 3 -'],
      ['m(add9)', '1 b3 5 9', 6, '1 5 9 b3 - -'], ['m(add9)', '1 b3 5 9', 5, '- 1 5 9 b3 -'],
      ['7sus4', '1 4 5 b7', 6, '1 5 b7 4 5 1?'], ['7sus4', '1 4 5 b7', 5, '- 1 5 b7 4 5?'],
      ['7sus2', '1 2 5 b7', 6, '1 - b7 2 5 -'], ['7sus2', '1 2 5 b7', 5, '- 1 5 b7 2 5?']
    ] },
    { title: 'Sixtes', shapes: [
      ['6', '1 3 5 6', 6, '1 - 6 3 5 -'], ['6', '1 3 5 6', 5, '- 1 5 6 3 -'],
      ['m6', '1 b3 5 6', 6, '1 - 6 b3 5 -'], ['m6', '1 b3 5 6', 5, '- 1 5 6 b3 -'],
      ['m♭6', '1 b3 5 b6', 6, '1 - b6 b3 5 -'],
      ['6/9', '1 3 5 6 9', 5, '- 1 3 6 9 5?'], ['m6/9', '1 b3 5 6 9', 5, '- 1 b3 6 9 5?']
    ] },
    { title: 'Septièmes enrichies', shapes: [
      ['m(maj7)', '1 b3 5 7', 6, '1 - 7 b3 5 -'], ['m(maj7)', '1 b3 5 7', 5, '- 1 5 7 b3 -'],
      ['7(♭5)', '1 3 b5 b7', 6, '1 - b7 3 b5 -'], ['7(♭5)', '1 3 b5 b7', 5, '- 1 b5 b7 3 -'],
      ['m7(♯5)', '1 b3 #5 b7', 5, '- 1 - b7 b3 #5'],
      ['maj7(♭5)', '1 3 b5 7', 6, '1 - 7 3 b5 -'], ['maj7(♯5)', '1 3 #5 7', 6, '1 - 7 3 #5 -'],
      ['maj7(♯11)', '1 3 5 7 #11', 5, '- 1 - 7 3 #11'], ['maj7(13)', '1 3 5 7 13', 6, '1 - 7 3 13 -']
    ] },
    { title: '9, 11 et 13', shapes: [
      ['9', '1 3 5 b7 9', 6, '1 - b7 3 5 9'], ['9', '1 3 5 b7 9', 5, '- 1 3 b7 9 5?'],
      ['m9', '1 b3 5 b7 9', 6, '1 - b7 b3 5 9'], ['m9', '1 b3 5 b7 9', 5, '- 1 b3 b7 9 -'],
      ['maj9', '1 3 5 7 9', 6, '1 - 7 3 5 9'], ['maj9', '1 3 5 7 9', 5, '- 1 3 7 9 -'],
      ['m9(maj7)', '1 b3 5 7 9', 5, '- 1 b3 7 9 -'],
      ['9sus4 (11)', '1 4 5 b7 9', 5, '- 1 4 b7 9 -'], ['m11', '1 b3 5 b7 11', 5, '- 1 11 b7 b3 5?'],
      ['9(♯5)', '1 3 #5 b7 9', 6, '1 - b7 3 #5 9'], ['9(♯11)', '1 3 5 b7 9 #11', 5, '- 1 3 b7 9 #11'],
      ['13', '1 3 5 b7 9 13', 6, '1 - b7 3 13 -'], ['13', '1 3 5 b7 9 13', 5, '- 1 - b7 3 13'],
      ['13sus4', '1 4 5 b7 9 13', 6, '1 - b7 4 13 -'], ['13(♭9)', '1 3 5 b7 b9 13', 6, '1 - b7 3 13 b9']
    ] },
    { title: 'Accords altérés (jazz, blues)', shapes: [
      ['7(♭9)', '1 3 5 b7 b9', 6, '1 - b7 3 - b9'], ['7(♭9)', '1 3 5 b7 b9', 5, '- 1 3 b7 b9 -'],
      ['7(♯9)', '1 3 5 b7 #9', 6, '1 - b7 3 - #9'], ['7(♯9)', '1 3 5 b7 #9', 5, '- 1 3 b7 #9 -'],
      ['7(♯11)', '1 3 5 b7 #11', 5, '- 1 - b7 3 #11'], ['7(♭13)', '1 3 5 b7 b13', 5, '- 1 - b7 3 b13'],
      ['7(♯9 ♭13)', '1 3 b7 #9 b13', 5, '- 1 3 b7 #9 b13'], ['7(♭9 ♭13)', '1 3 b7 b9 b13', 5, '- 1 3 b7 b9 b13']
    ] }
  ];

  function semis(iv) { return M.mod(M.parseInterval(iv).semis, 12); }

  /** Calcule les cases relatives (0 = case de la fondamentale) et vérifie la forme. */
  function build([name, formula, rootString, voicing]) {
    const base = BASE[rootString];
    const strings = voicing.split(/\s+/).map((tok, s) => {
      if (tok === '-') return null;
      const optional = tok.endsWith('?');
      const iv = tok.replace('?', '');
      let o = semis(iv) - base[s];
      while (o < -3) o += 12;
      while (o > 4) o -= 12;
      return { iv, o, optional, root: semis(iv) === 0 };
    });
    // vérification : toutes les notes appartiennent à l'accord, rien d'important ne manque
    const f = formula.split(' ');
    const fs = new Set(f.map(semis));
    const played = strings.filter(Boolean);
    const have = new Set(played.map((x) => semis(x.iv)));
    const omissible = new Set(['5'].concat(f.indexOf('13') >= 0 ? ['9', '11'] : []).map(semis));
    const problems = [];
    played.forEach((x) => { if (!fs.has(semis(x.iv))) problems.push('note étrangère ' + x.iv); });
    f.forEach((iv) => { if (!have.has(semis(iv)) && !omissible.has(semis(iv))) problems.push('manque ' + iv); });
    const os = played.map((x) => x.o);
    if (Math.max(...os) - Math.min(...os) > 4) problems.push('trop écarté');
    if (strings[rootString === 6 ? 0 : 1] == null || strings[rootString === 6 ? 0 : 1].o !== 0) problems.push('basse');
    return { name, formula, rootString, strings, problems };
  }

  const ALL = FAMILIES.map((fam) => ({ title: fam.title, shapes: fam.shapes.map(build) }));

  /* ------------------------------------------------------------------ */
  /* Diagramme                                                           */
  /* ------------------------------------------------------------------ */
  function diagram(sh) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 70 84');
    svg.setAttribute('class', 'shape-svg');
    const mk = (n, a, t) => { const e = document.createElementNS(ns, n); for (const k in a) e.setAttribute(k, a[k]); if (t != null) e.textContent = t; svg.appendChild(e); return e; };
    const played = sh.strings.filter(Boolean);
    const minO = Math.min(...played.map((x) => x.o));
    const left = 10, right = 60, top = 18, fh = 12, nf = 5;
    const sx = (s) => left + s * (right - left) / 5;
    const row = (o) => o - minO; // 0 = première case affichée
    const cy = (o) => top + row(o) * fh + fh / 2;
    for (let s = 0; s < 6; s++) mk('line', { x1: sx(s), y1: top, x2: sx(s), y2: top + nf * fh, class: 'sh-line' });
    for (let f = 0; f <= nf; f++) mk('line', { x1: left, y1: top + f * fh, x2: right, y2: top + f * fh, class: 'sh-line' });
    // barré : au moins 3 cordes sur la case la plus basse, dont la plus aiguë jouée
    const atMin = sh.strings.map((x, s) => (x && x.o === minO ? s : -1)).filter((s) => s >= 0);
    const lastPlayed = sh.strings.reduce((a, x, s) => (x ? s : a), -1);
    if (atMin.length >= 3 && atMin[atMin.length - 1] === lastPlayed) {
      const a = sx(atMin[0]), b = sx(lastPlayed), y = top + row(minO) * fh - 1;
      mk('path', { d: `M ${a} ${y} Q ${(a + b) / 2} ${y - 9} ${b} ${y}`, class: 'sh-barre' });
    }
    sh.strings.forEach((x, s) => {
      if (!x) { mk('text', { x: sx(s), y: top - 4, class: 'sh-mute', 'text-anchor': 'middle' }, '×'); return; }
      if (x.root) {
        mk('circle', { cx: sx(s), cy: cy(x.o), r: 4.2, class: 'sh-root' + (x.optional ? ' opt' : '') });
      } else {
        mk('circle', { cx: sx(s), cy: cy(x.o), r: 3.8, class: 'sh-dot' });
        if (x.optional) mk('circle', { cx: sx(s), cy: cy(x.o), r: 5.6, class: 'sh-opt' });
      }
      if (x.root && x.optional) mk('circle', { cx: sx(s), cy: cy(x.o), r: 6, class: 'sh-opt' });
    });
    return svg;
  }

  function play(sh) {
    // exemple sonore : fondamentale La (6e corde case 5) ou Ré (5e corde case 5)
    const rootFret = 5;
    const tuning = Chords.TUNING;
    const t = Audio2.now() + 0.05;
    let k = 0;
    sh.strings.forEach((x, s) => {
      if (!x || x.optional) return;
      Audio2.guitar(tuning[s] + rootFret + x.o, t + k++ * 0.03, 2, 0.5);
    });
  }

  function render(el) {
    const sel = Object.assign({ root: 'all' }, App.store('shapeSel', {}));
    el.appendChild(h('div', { class: 'legend shape-legend' }, [
      h('span', { html: '<svg viewBox="0 0 14 14" width="16" height="16"><circle cx="7" cy="7" r="5" class="sh-root"/></svg> fondamentale' }),
      h('span', { html: '<svg viewBox="0 0 14 14" width="16" height="16"><circle cx="7" cy="7" r="3.5" class="sh-dot"/><circle cx="7" cy="7" r="6" class="sh-opt"/></svg> note facultative' }),
      h('span', { html: '<svg viewBox="0 0 24 12" width="26" height="14"><path d="M2 10 Q12 1 22 10" class="sh-barre"/></svg> barré' }),
      h('span', { text: '× corde étouffée' })
    ]));
    el.appendChild(h('p', { class: 'hint', text: 'Pose le rond orange sur la note qui donne son nom à l’accord (sur la 6e ou la 5e corde) : la forme te donne le type d’accord. Clique sur une forme pour l’entendre.' }));
    const seg = h('div', { class: 'segmented', style: 'margin-bottom:1rem' });
    el.appendChild(seg);
    const body = h('div');
    el.appendChild(body);

    function draw() {
      seg.innerHTML = '';
      [['all', 'Toutes'], ['6', 'Fondamentale sur la 6e corde'], ['5', 'Fondamentale sur la 5e corde']].forEach(([id, l]) => {
        const b = h('button', { class: sel.root === id ? 'on' : '', text: l });
        b.addEventListener('click', () => { sel.root = id; App.save('shapeSel', sel); draw(); });
        seg.appendChild(b);
      });
      body.innerHTML = '';
      ALL.forEach((fam) => {
        const list = fam.shapes.filter((x) => sel.root === 'all' || String(x.rootString) === sel.root);
        if (!list.length) return;
        const grid = h('div', { class: 'shape-grid' });
        list.forEach((sh) => {
          const c = h('button', { class: 'shape-card', title: 'Écouter' }, [
            h('div', { class: 'shape-name', text: sh.name }), diagram(sh),
            h('div', { class: 'shape-root', text: 'R sur la ' + sh.rootString + 'e corde' })
          ]);
          c.addEventListener('click', () => play(sh));
          grid.appendChild(c);
        });
        body.appendChild(h('section', { class: 'card', style: 'margin-bottom:1rem' }, [h('h2', { style: 'margin-top:0', text: fam.title }), grid]));
      });
    }
    draw();
  }

  App.register('/guitare/formes-accords', {
    title: 'Banque de formes d’accords',
    subtitle: 'Chaque forme correspond à un type d’accord. Le rond orange est la fondamentale, toujours sur une des deux cordes graves : déplace la forme pour la poser sur la note voulue.',
    render
  });

  window.ShapeBank = { ALL, build };
})();

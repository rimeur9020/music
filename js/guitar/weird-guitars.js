/*
 * Page secrète : les guitares bizarres.
 * On y arrive en tapant Em, G, Dsus4, A7sus4 dans « Accords trouvés » (page Partition → accords).
 * Pas dans le menu. Toutes les guitares sont dessinées en SVG.
 */
(function () {
  'use strict';
  const { h } = App;
  const NS = 'http://www.w3.org/2000/svg';

  function svg(draw) {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 200 260');
    s.setAttribute('class', 'wg-svg');
    const mk = (n, a, parent) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); (parent || s).appendChild(e); return e; };
    draw(mk, s);
    return s;
  }

  /** Un manche droit : de (x, y) vers le haut, longueur len, rotation rot (degrés), n cordes. */
  function neck(mk, x, y, len, rot, n, color) {
    const g = mk('g', { transform: `rotate(${rot} ${x} ${y})` });
    const w = 8 + n * 2;
    mk('rect', { x: x - w / 2, y: y - len, width: w, height: len, rx: 2, fill: '#8a5a2b', stroke: '#3b2412', 'stroke-width': 1.2 }, g);
    for (let f = 1; f < 10; f++) mk('line', { x1: x - w / 2, x2: x + w / 2, y1: y - f * len / 10, y2: y - f * len / 10, stroke: '#d9d0c0', 'stroke-width': 1 }, g);
    mk('rect', { x: x - w / 2 - 3, y: y - len - 22, width: w + 6, height: 24, rx: 5, fill: color || '#3b2412' }, g);
    for (let i = 0; i < n; i++) {
      const sx = x - w / 2 + 4 + i * (w - 8) / Math.max(1, n - 1);
      mk('line', { x1: sx, x2: sx, y1: y - len - 14, y2: y + 40, stroke: '#eee', 'stroke-width': 0.6 }, g);
      mk('circle', { cx: i % 2 ? x + w / 2 + 5 : x - w / 2 - 5, cy: y - len - 18 + (i >> 1) * 7, r: 2.6, fill: '#c9c9c9', stroke: '#555', 'stroke-width': 0.6 }, g);
    }
    return g;
  }
  const hole = (mk, x, y, r) => { mk('circle', { cx: x, cy: y, r, fill: '#1d1b18' }); mk('circle', { cx: x, cy: y, r: r + 3, fill: 'none', stroke: '#f2d58b', 'stroke-width': 2 }); };
  const bridge = (mk, x, y, w) => mk('rect', { x: x - w / 2, y, width: w, height: 6, rx: 2, fill: '#3b2412' });

  const GUITARS = [
    {
      name: 'La Triple-Manche', desc: 'Pour jouer le couplet, le refrain et le solo en même temps. Il faut juste six mains.',
      draw: (mk) => {
        neck(mk, 100, 150, 95, 0, 6); neck(mk, 100, 150, 85, -32, 6, '#b03a2e'); neck(mk, 100, 150, 85, 32, 12, '#1971c2');
        mk('path', { d: 'M100 140 C55 135 40 175 60 200 C35 230 70 258 100 252 C130 258 165 230 140 200 C160 175 145 135 100 140 Z', fill: '#e8590c', stroke: '#3b2412', 'stroke-width': 2 });
        hole(mk, 100, 190, 13); bridge(mk, 100, 225, 34);
      }
    },
    {
      name: 'La Spirale', desc: 'Le manche fait trois tours. Le 24e frette est juste à côté du 1er : pratique pour les grands écarts.',
      draw: (mk) => {
        mk('path', { d: 'M100 150 C100 110 150 110 150 80 C150 40 90 30 70 60 C55 85 85 105 105 90 C120 78 110 60 98 64', fill: 'none', stroke: '#8a5a2b', 'stroke-width': 16, 'stroke-linecap': 'round' });
        mk('path', { d: 'M100 150 C100 110 150 110 150 80 C150 40 90 30 70 60 C55 85 85 105 105 90 C120 78 110 60 98 64', fill: 'none', stroke: '#eee', 'stroke-width': 1, 'stroke-dasharray': '1 5' });
        mk('circle', { cx: 98, cy: 64, r: 9, fill: '#3b2412' });
        mk('ellipse', { cx: 100, cy: 200, rx: 52, ry: 55, fill: '#2f9e44', stroke: '#14421d', 'stroke-width': 2 });
        hole(mk, 100, 190, 12); bridge(mk, 100, 225, 30);
      }
    },
    {
      name: 'Le Chat-Caster', desc: 'Ronronne quand on joue en Mi mineur. Griffe si on oublie de l’accorder.',
      draw: (mk) => {
        neck(mk, 100, 140, 90, 0, 6, '#495057');
        mk('path', { d: 'M48 150 L52 112 L78 138 Q100 130 122 138 L148 112 L152 150 Q170 205 100 250 Q30 205 48 150 Z', fill: '#f08c00', stroke: '#5c3600', 'stroke-width': 2 });
        mk('ellipse', { cx: 78, cy: 175, rx: 8, ry: 11, fill: '#fff' }); mk('ellipse', { cx: 122, cy: 175, rx: 8, ry: 11, fill: '#fff' });
        mk('ellipse', { cx: 79, cy: 177, rx: 3, ry: 8, fill: '#1d1b18' }); mk('ellipse', { cx: 123, cy: 177, rx: 3, ry: 8, fill: '#1d1b18' });
        mk('path', { d: 'M94 198 L106 198 L100 205 Z', fill: '#c2255c' });
        mk('path', { d: 'M100 205 Q92 214 84 208 M100 205 Q108 214 116 208', fill: 'none', stroke: '#5c3600', 'stroke-width': 1.5 });
        ['M60 200 L28 194', 'M60 206 L28 210', 'M140 200 L172 194', 'M140 206 L172 210'].forEach((d) => mk('path', { d, stroke: '#5c3600', 'stroke-width': 1.2 }));
        bridge(mk, 100, 228, 30);
      }
    },
    {
      name: 'La Fourchette', desc: 'Quatre manches pour piquer les accords. Idéale pour les spaghettis… pardon, les arpèges.',
      draw: (mk) => {
        [70, 90, 110, 130].forEach((x) => neck(mk, x, 150, 110, 0, 2, '#868e96'));
        mk('path', { d: 'M60 145 L140 145 L140 170 Q140 200 112 205 L112 250 L88 250 L88 205 Q60 200 60 170 Z', fill: '#adb5bd', stroke: '#343a40', 'stroke-width': 2 });
        hole(mk, 100, 172, 9); bridge(mk, 100, 236, 20);
      }
    },
    {
      name: 'La 37 cordes', desc: 'Un accord de Sol avec 37 notes. Comptez 4 heures pour l’accorder.',
      draw: (mk) => {
        const g = mk('g', {});
        mk('rect', { x: 55, y: 18, width: 90, height: 120, rx: 4, fill: '#8a5a2b', stroke: '#3b2412', 'stroke-width': 1.5 }, g);
        for (let f = 1; f < 8; f++) mk('line', { x1: 55, x2: 145, y1: 18 + f * 15, y2: 18 + f * 15, stroke: '#d9d0c0' }, g);
        for (let i = 0; i < 37; i++) mk('line', { x1: 58 + i * 2.33, x2: 58 + i * 2.33, y1: 8, y2: 232, stroke: '#eee', 'stroke-width': 0.4 });
        mk('rect', { x: 50, y: 0, width: 100, height: 20, rx: 6, fill: '#3b2412' });
        mk('path', { d: 'M45 135 L155 135 Q195 190 150 245 L50 245 Q5 190 45 135 Z', fill: '#9c36b5', stroke: '#3b0f48', 'stroke-width': 2 });
        hole(mk, 100, 180, 15); bridge(mk, 100, 225, 96);
      }
    },
    {
      name: 'La Nuage', desc: 'Très légère : elle flotte. Il faut l’attacher pour les concerts en plein air.',
      draw: (mk) => {
        neck(mk, 100, 140, 95, -8, 6, '#74c0fc');
        mk('path', { d: 'M55 175 Q40 145 72 145 Q80 122 106 132 Q128 115 140 142 Q170 140 160 172 Q182 195 155 212 Q150 245 118 232 Q100 252 82 232 Q48 240 50 210 Q25 195 55 175 Z', fill: '#e7f5ff', stroke: '#4dabf7', 'stroke-width': 2.5 });
        hole(mk, 100, 182, 12); bridge(mk, 100, 212, 30);
        mk('path', { d: 'M70 252 l-3 6 M95 255 l-3 6 M120 252 l-3 6', stroke: '#4dabf7', 'stroke-width': 2 });
      }
    },
    {
      name: 'La Banane', desc: 'Bio, courbée et riche en potassium. Se joue en position « pelée ».',
      draw: (mk) => {
        neck(mk, 92, 128, 95, 14, 6, '#5c940d');
        mk('path', { d: 'M60 120 Q20 200 90 245 Q150 270 170 230 Q120 235 95 200 Q75 165 85 125 Z', fill: '#ffd43b', stroke: '#a07800', 'stroke-width': 2 });
        mk('path', { d: 'M70 150 Q60 200 100 230', fill: 'none', stroke: '#e0b400', 'stroke-width': 3 });
        mk('circle', { cx: 112, cy: 214, r: 8, fill: '#1d1b18' });
        mk('path', { d: 'M168 232 l10 4', stroke: '#5c3600', 'stroke-width': 4, 'stroke-linecap': 'round' });
      }
    },
    {
      name: 'L’Escalier', desc: 'Chaque case est une marche. Pour monter dans les aigus, on monte vraiment.',
      draw: (mk) => {
        mk('path', { d: 'M92 140 L92 115 L72 115 L72 90 L92 90 L92 65 L72 65 L72 40 L92 40 L92 20 L108 20 L108 40 L88 40 L88 65 L108 65 L108 90 L88 90 L88 115 L108 115 L108 140 Z', fill: '#8a5a2b', stroke: '#3b2412', 'stroke-width': 1.5 });
        mk('rect', { x: 86, y: 2, width: 28, height: 20, rx: 5, fill: '#3b2412' });
        mk('path', { d: 'M60 140 L140 140 L160 165 L140 190 L160 215 L140 250 L60 250 L40 215 L60 190 L40 165 Z', fill: '#c2255c', stroke: '#5a0f2a', 'stroke-width': 2 });
        hole(mk, 100, 180, 12); bridge(mk, 100, 225, 30);
      }
    }
  ];

  function wiggle(i) {
    // un petit accord (Em, G, Dsus4, A7sus4 — évidemment) joué à la guitare
    const CH = [[40, 47, 52, 55, 59, 64], [43, 47, 50, 55, 59, 67], [50, 57, 62, 67], [45, 52, 55, 62, 64]];
    const ch = CH[i % CH.length];
    try {
      const t = Audio2.now() + 0.05;
      ch.forEach((m, k) => Audio2.guitar(m, t + k * 0.04, 1.6, 0.45));
    } catch (e) { /* pas de son : tant pis */ }
  }

  function render(el) {
    el.appendChild(h('div', { class: 'notice', html: '🎉 <b>Bravo, tu as trouvé le passage secret !</b> (Em – G – Dsus4 – A7sus4… ça te dit quelque chose ?) Touche une guitare pour l’entendre.' }));
    const grid = h('div', { class: 'wg-grid' });
    GUITARS.forEach((g, i) => {
      const card = h('button', { class: 'wg-card', title: 'Écouter' }, [svg(g.draw), h('div', { class: 'wg-name', text: g.name }), h('div', { class: 'wg-desc', text: g.desc })]);
      card.style.animationDelay = (i * 0.37) + 's';
      card.addEventListener('click', () => { wiggle(i); card.classList.remove('wg-boing'); void card.offsetWidth; card.classList.add('wg-boing'); });
      grid.appendChild(card);
    });
    el.appendChild(grid);
    const back = h('a', { class: 'btn', href: '#/guitare/partition', text: '← Retour à Partition → accords' });
    el.appendChild(h('div', { class: 'btn-row', style: 'margin-top:1rem' }, [back]));
  }

  App.register('/guitare/guitares-bizarres', {
    title: 'Les guitares bizarres',
    subtitle: 'Une collection d’instruments que personne n’aurait dû fabriquer.',
    render
  });
})();

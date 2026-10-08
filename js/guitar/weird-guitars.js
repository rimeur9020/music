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
    const mk = (n, a, parent) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); (parent && parent.appendChild ? parent : s).appendChild(e); return e; };
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
    }    ,
    {
      name: 'La Pizza-Caster', desc: 'Quatre fromages, six cordes. Le pepperoni sert de micro.',
      draw: (mk) => {
        neck(mk, 100, 140, 95, 0, 6, '#c92a2a');
        mk('circle', { cx: 100, cy: 190, r: 62, fill: '#e8a33d', stroke: '#8a4b08', 'stroke-width': 4 });
        mk('circle', { cx: 100, cy: 190, r: 54, fill: '#ffd8a8' });
        mk('circle', { cx: 100, cy: 190, r: 52, fill: '#fab005', opacity: 0.55 });
        [[75, 170], [128, 168], [80, 215], [122, 222], [100, 245], [140, 196], [60, 195]].forEach(([x, y]) => mk('circle', { cx: x, cy: y, r: 9, fill: '#c92a2a', stroke: '#8a1c1c' }));
        [[95, 160], [110, 205], [70, 230], [135, 230]].forEach(([x, y]) => mk('ellipse', { cx: x, cy: y, rx: 5, ry: 2.5, fill: '#2b8a3e', transform: `rotate(30 ${x} ${y})` }));
        hole(mk, 100, 190, 9);
      }
    },
    {
      name: 'Le Poisson-Basse', desc: 'Joue faux hors de l’eau. Fait des bulles dans les graves.',
      draw: (mk) => {
        neck(mk, 100, 140, 90, 0, 4, '#0c8599');
        mk('path', { d: 'M100 138 Q160 150 160 195 Q160 235 100 245 Q40 235 40 195 Q40 150 100 138 Z', fill: '#3bc9db', stroke: '#0b7285', 'stroke-width': 2 });
        mk('path', { d: 'M100 243 L72 262 L128 262 Z', fill: '#15aabf', stroke: '#0b7285', 'stroke-width': 2 });
        mk('path', { d: 'M60 180 Q75 170 82 186 M118 186 Q125 170 140 180', fill: 'none', stroke: '#0b7285', 'stroke-width': 2 });
        mk('circle', { cx: 72, cy: 165, r: 7, fill: '#fff' }); mk('circle', { cx: 74, cy: 166, r: 3, fill: '#000' });
        [[150, 120, 5], [162, 100, 7], [150, 76, 4]].forEach(([x, y, r]) => mk('circle', { cx: x, cy: y, r, fill: 'none', stroke: '#74c0fc', 'stroke-width': 1.5, class: 'wg-bubble' }));
        hole(mk, 100, 205, 11);
      }
    },
    {
      name: 'La Double-Face', desc: 'Un corps à chaque bout. Personne ne sait de quel côté on la tient.',
      draw: (mk) => {
        mk('rect', { x: 92, y: 70, width: 16, height: 120, fill: '#8a5a2b', stroke: '#3b2412' });
        for (let f = 1; f < 10; f++) mk('line', { x1: 92, x2: 108, y1: 70 + f * 12, y2: 70 + f * 12, stroke: '#d9d0c0' });
        mk('ellipse', { cx: 100, cy: 45, rx: 44, ry: 40, fill: '#7950f2', stroke: '#3b1f9e', 'stroke-width': 2 });
        mk('ellipse', { cx: 100, cy: 215, rx: 44, ry: 40, fill: '#7950f2', stroke: '#3b1f9e', 'stroke-width': 2 });
        hole(mk, 100, 45, 10); hole(mk, 100, 215, 10);
        for (let i = 0; i < 6; i++) mk('line', { x1: 94 + i * 2.4, x2: 94 + i * 2.4, y1: 30, y2: 230, stroke: '#eee', 'stroke-width': 0.5 });
      }
    },
    {
      name: 'La Fantôme', cls: 'wg-ghost', desc: 'Elle apparaît et disparaît. On l’entend jouer la nuit, toute seule.',
      draw: (mk) => {
        neck(mk, 100, 140, 95, 0, 6, '#dee2e6');
        mk('path', { d: 'M48 250 L48 175 Q48 135 100 135 Q152 135 152 175 L152 250 L139 238 L126 250 L113 238 L100 250 L87 238 L74 250 L61 238 Z', fill: '#f8f9fa', stroke: '#adb5bd', 'stroke-width': 2 });
        mk('ellipse', { cx: 82, cy: 180, rx: 7, ry: 10, fill: '#212529' }); mk('ellipse', { cx: 118, cy: 180, rx: 7, ry: 10, fill: '#212529' });
        mk('ellipse', { cx: 100, cy: 210, rx: 9, ry: 12, fill: '#212529' });
      }
    },
    {
      name: 'La Fuyante', cls: 'wg-flee', desc: 'Très timide : elle s’enfuit quand on veut la toucher. (Essaie quand même.)',
      draw: (mk) => {
        neck(mk, 100, 140, 95, 10, 6, '#2b8a3e');
        mk('path', { d: 'M100 140 C60 135 45 170 62 195 C40 225 70 255 100 250 C130 255 160 225 138 195 C155 170 140 135 100 140 Z', fill: '#51cf66', stroke: '#2b8a3e', 'stroke-width': 2 });
        mk('path', { d: 'M150 200 l20 -4 M150 210 l24 0 M150 220 l20 4', stroke: '#868e96', 'stroke-width': 2, 'stroke-linecap': 'round' });
        mk('circle', { cx: 88, cy: 185, r: 4, fill: '#000' }); mk('circle', { cx: 112, cy: 185, r: 4, fill: '#000' });
        mk('ellipse', { cx: 100, cy: 210, rx: 6, ry: 8, fill: '#000' });
      }
    },
    {
      name: 'La Fusée', cls: 'wg-rocket', desc: 'Décolle au premier power chord. Prévoir un casque.',
      draw: (mk) => {
        mk('path', { d: 'M100 10 Q130 50 130 120 L130 200 L70 200 L70 120 Q70 50 100 10 Z', fill: '#e9ecef', stroke: '#495057', 'stroke-width': 2 });
        mk('circle', { cx: 100, cy: 80, r: 14, fill: '#74c0fc', stroke: '#495057', 'stroke-width': 2 });
        mk('path', { d: 'M70 150 L45 205 L70 200 Z M130 150 L155 205 L130 200 Z', fill: '#e03131', stroke: '#495057', 'stroke-width': 2 });
        for (let i = 0; i < 6; i++) mk('line', { x1: 85 + i * 6, x2: 85 + i * 6, y1: 105, y2: 195, stroke: '#495057', 'stroke-width': 0.7 });
        mk('rect', { x: 80, y: 180, width: 40, height: 6, fill: '#3b2412' });
        mk('path', { d: 'M78 202 Q100 262 122 202 Z', fill: '#ff922b', class: 'wg-flame' });
        mk('path', { d: 'M88 202 Q100 240 112 202 Z', fill: '#ffe066', class: 'wg-flame' });
      }
    },
    {
      name: 'La Pieuvre', desc: 'Huit manches, huit fois plus de solos. Crache de l’encre sur les fausses notes.',
      draw: (mk) => {
        [-60, -40, -20, 0, 20, 40, 60].forEach((r, i) => neck(mk, 100, 150, 70 + (i % 2) * 15, r, 3, '#c2255c'));
        mk('ellipse', { cx: 100, cy: 185, rx: 52, ry: 48, fill: '#e64980', stroke: '#a61e4d', 'stroke-width': 2 });
        mk('circle', { cx: 82, cy: 175, r: 9, fill: '#fff' }); mk('circle', { cx: 118, cy: 175, r: 9, fill: '#fff' });
        mk('circle', { cx: 84, cy: 177, r: 4, fill: '#000' }); mk('circle', { cx: 116, cy: 177, r: 4, fill: '#000' });
        ['M60 220 q-10 25 5 35', 'M80 228 q-5 22 8 30', 'M120 228 q5 22 -8 30', 'M140 220 q10 25 -5 35'].forEach((d) => mk('path', { d, fill: 'none', stroke: '#e64980', 'stroke-width': 8, 'stroke-linecap': 'round' }));
        mk('path', { d: 'M90 200 Q100 210 110 200', fill: 'none', stroke: '#a61e4d', 'stroke-width': 2 });
      }
    },
    {
      name: 'La Tête-en-bas', cls: 'wg-upside', desc: 'Conçue en Australie. Les graves sont en haut, les aigus en bas, le public aussi.',
      draw: (mk) => {
        neck(mk, 100, 140, 95, 0, 6, '#f08c00');
        mk('path', { d: 'M100 140 C60 135 45 170 62 195 C40 225 70 255 100 250 C130 255 160 225 138 195 C155 170 140 135 100 140 Z', fill: '#ffa94d', stroke: '#d9480f', 'stroke-width': 2 });
        hole(mk, 100, 190, 12); bridge(mk, 100, 225, 30);
      }
    },
    {
      name: 'La Minuscule', desc: 'La plus petite guitare du monde. Se joue avec un cure-dent.',
      draw: (mk) => {
        const g = mk('g', { transform: 'translate(85 165) scale(0.15)' });
        mk('rect', { x: 96, y: 60, width: 8, height: 80, fill: '#8a5a2b' }, g);
        mk('ellipse', { cx: 100, cy: 175, rx: 45, ry: 50, fill: '#e8590c' }, g);
        mk('circle', { cx: 100, cy: 170, r: 12, fill: '#1d1b18' }, g);
        mk('path', { d: 'M40 230 Q100 200 101 188', fill: 'none', stroke: '#868e96', 'stroke-width': 1, 'stroke-dasharray': '3 3' });
        mk('text', { x: 40, y: 245, 'font-size': 11, fill: '#868e96' }, 'elle est là ↗').textContent = 'elle est là ↗';
      }
    },
    {
      name: 'La Hamburger', desc: 'Corps en pain brioché, micros au cheddar. Garantie sans cornichons.',
      draw: (mk) => {
        neck(mk, 100, 140, 95, 0, 6, '#a0522d');
        mk('path', { d: 'M45 180 Q45 135 100 135 Q155 135 155 180 Z', fill: '#e8a33d', stroke: '#8a4b08', 'stroke-width': 2 });
        [[72, 152], [100, 146], [128, 152], [86, 165], [116, 165]].forEach(([x, y]) => mk('ellipse', { cx: x, cy: y, rx: 3, ry: 1.6, fill: '#fff3bf' }));
        mk('path', { d: 'M40 182 Q55 196 70 184 Q85 198 100 184 Q115 198 130 184 Q145 196 160 182 L160 190 L40 190 Z', fill: '#69db7c' });
        mk('path', { d: 'M42 190 L158 190 L150 205 L50 205 Z', fill: '#ffd43b' });
        mk('rect', { x: 44, y: 205, width: 112, height: 18, rx: 8, fill: '#862e2e' });
        mk('path', { d: 'M45 225 L155 225 Q155 250 100 250 Q45 250 45 225 Z', fill: '#e8a33d', stroke: '#8a4b08', 'stroke-width': 2 });
        for (let i = 0; i < 6; i++) mk('line', { x1: 94 + i * 2.4, x2: 94 + i * 2.4, y1: 140, y2: 248, stroke: '#fff', 'stroke-width': 0.5 });
      }
    },
    {
      name: 'La Donut', desc: 'Un trou si grand que le son tombe dedans. Glaçage rose, vermicelles inclus.',
      draw: (mk) => {
        neck(mk, 100, 140, 95, 0, 6, '#e64980');
        mk('circle', { cx: 100, cy: 195, r: 58, fill: '#e8a33d', stroke: '#8a4b08', 'stroke-width': 2 });
        mk('path', { d: 'M48 190 Q50 140 100 138 Q150 140 152 190 Q148 205 138 200 Q130 215 120 205 Q105 222 92 207 Q78 220 68 204 Q55 212 48 190 Z', fill: '#f783ac' });
        mk('circle', { cx: 100, cy: 195, r: 22, fill: 'var(--surface)', stroke: '#8a4b08', 'stroke-width': 2 });
        [['#fab005', 70, 160, 20], ['#4dabf7', 128, 158, -30], ['#69db7c', 60, 185, 60], ['#fff', 140, 182, 10], ['#9775fa', 96, 152, 80], ['#ff6b6b', 116, 172, -60]].forEach(([c, x, y, r]) => mk('rect', { x, y, width: 8, height: 2.5, rx: 1, fill: c, transform: `rotate(${r} ${x} ${y})` }));
      }
    },
    {
      name: 'La Cubiste', desc: 'Peinte par Picasso un lundi matin. Chaque accord sonne en morceaux.',
      draw: (mk) => {
        mk('polygon', { points: '92,10 112,18 108,140 88,128', fill: '#8a5a2b', stroke: '#3b2412', 'stroke-width': 1.5 });
        mk('polygon', { points: '84,4 116,0 120,22 86,26', fill: '#3b2412' });
        mk('polygon', { points: '100,130 160,150 145,200 100,190', fill: '#4263eb', stroke: '#1d1b18', 'stroke-width': 2 });
        mk('polygon', { points: '100,130 40,160 60,205 100,190', fill: '#f59f00', stroke: '#1d1b18', 'stroke-width': 2 });
        mk('polygon', { points: '60,205 100,190 145,200 130,255 70,248', fill: '#e03131', stroke: '#1d1b18', 'stroke-width': 2 });
        mk('polygon', { points: '92,175 112,172 116,192 96,198', fill: '#1d1b18' });
        mk('circle', { cx: 75, cy: 180, r: 5, fill: '#fff', stroke: '#000' }); mk('circle', { cx: 76, cy: 181, r: 2, fill: '#000' });
        for (let i = 0; i < 6; i++) mk('line', { x1: 92 + i * 3, x2: 85 + i * 9, y1: 20, y2: 240, stroke: '#eee', 'stroke-width': 0.6 });
      }
    },
    {
      name: 'L’Arc-en-ciel', cls: 'wg-rainbow', desc: 'Change de couleur à chaque note. Ne pas regarder trop longtemps.',
      draw: (mk) => {
        neck(mk, 100, 140, 95, 0, 6, '#7950f2');
        mk('path', { d: 'M100 140 C60 135 45 170 62 195 C40 225 70 255 100 250 C130 255 160 225 138 195 C155 170 140 135 100 140 Z', fill: '#ff6b6b', stroke: '#1d1b18', 'stroke-width': 2 });
        ['#ff922b', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'].forEach((c, i) => mk('path', { d: `M${55 + i * 2} ${198 + i * 9} Q100 ${150 + i * 9} ${145 - i * 2} ${198 + i * 9}`, fill: 'none', stroke: c, 'stroke-width': 6 }));
        hole(mk, 100, 175, 10);
      }
    },
    {
      name: 'L’Escargot', desc: 'Le tempo le plus lent du monde : 2 battements par minute. Laisse une trace brillante.',
      draw: (mk) => {
        neck(mk, 70, 160, 80, -25, 6, '#5c940d');
        mk('path', { d: 'M20 240 Q20 215 60 215 L170 215 Q185 215 185 235 L185 240 Z', fill: '#c0eb75', stroke: '#5c940d', 'stroke-width': 2 });
        mk('path', { d: 'M178 215 L172 185 M184 215 L190 186', stroke: '#5c940d', 'stroke-width': 3 });
        mk('circle', { cx: 172, cy: 183, r: 4, fill: '#000' }); mk('circle', { cx: 190, cy: 184, r: 4, fill: '#000' });
        mk('circle', { cx: 112, cy: 180, r: 48, fill: '#d9480f', stroke: '#5c1f00', 'stroke-width': 2 });
        mk('path', { d: 'M112 180 m0 -6 a6 6 0 1 1 -6 6 a12 12 0 1 1 12 12 a20 20 0 1 1 -20 -20 a30 30 0 1 1 30 30', fill: 'none', stroke: '#5c1f00', 'stroke-width': 3 });
        mk('path', { d: 'M5 248 L60 248', stroke: '#e7f5ff', 'stroke-width': 3, opacity: 0.8 });
      }
    },
    {
      name: 'La Dino-Strat', desc: 'Retrouvée dans un fossile du Jurassique. Joue uniquement du rock préhistorique.',
      draw: (mk) => {
        neck(mk, 120, 120, 80, 25, 6, '#2b8a3e');
        mk('path', { d: 'M60 120 Q60 90 95 92 Q125 95 120 120 L118 135 Q140 150 145 190 Q150 225 175 250 L50 250 Q65 230 62 200 Q40 190 45 170 Q60 160 62 140 Z', fill: '#69db7c', stroke: '#2b8a3e', 'stroke-width': 2 });
        mk('circle', { cx: 100, cy: 108, r: 5, fill: '#fff' }); mk('circle', { cx: 101, cy: 108, r: 2.5, fill: '#000' });
        mk('path', { d: 'M70 125 L112 125 M76 125 l3 5 l3 -5 l3 5 l3 -5 l3 5 l3 -5', stroke: '#2b8a3e', fill: 'none', 'stroke-width': 1.5 });
        mk('path', { d: 'M55 165 l-8 6 M58 172 l-8 6', stroke: '#2b8a3e', 'stroke-width': 3, 'stroke-linecap': 'round' });
        [[85, 150], [100, 175], [118, 200], [130, 225]].forEach(([x, y]) => mk('path', { d: `M${x} ${y} l12 -8 l2 12 z`, fill: '#2f9e44' }));
        hole(mk, 92, 205, 11);
      }
    },
    {
      name: 'La Guitare-Piano', desc: 'Des touches à la place des frettes. Les pianistes la détestent, les guitaristes aussi.',
      draw: (mk) => {
        mk('rect', { x: 84, y: 10, width: 32, height: 130, fill: '#fff', stroke: '#1d1b18', 'stroke-width': 1.5 });
        for (let k = 0; k < 13; k++) mk('line', { x1: 84, x2: 116, y1: 10 + k * 10, y2: 10 + k * 10, stroke: '#1d1b18', 'stroke-width': 0.8 });
        [1, 2, 4, 5, 6, 8, 9, 11, 12].forEach((k) => mk('rect', { x: 84, y: 10 + k * 10 - 3, width: 20, height: 6, fill: '#1d1b18' }));
        mk('rect', { x: 80, y: 0, width: 40, height: 12, rx: 4, fill: '#1d1b18' });
        mk('path', { d: 'M100 140 C60 135 45 170 62 195 C40 225 70 255 100 250 C130 255 160 225 138 195 C155 170 140 135 100 140 Z', fill: '#1d1b18', stroke: '#000', 'stroke-width': 2 });
        for (let k = 0; k < 7; k++) mk('rect', { x: 62 + k * 11, y: 185, width: 10, height: 34, fill: '#fff', stroke: '#1d1b18' });
        [0, 1, 3, 4, 5].forEach((k) => mk('rect', { x: 69 + k * 11, y: 185, width: 7, height: 20, fill: '#1d1b18' }));
      }
    },
    {
      name: 'L’Infinie', desc: 'Le manche ne s’arrête jamais. Le 1 000 000e frette est quelque part par là ↑',
      draw: (mk) => {
        for (let k = 0; k < 7; k++) {
          const w = 18 * Math.pow(0.78, k), y = 140 - (1 - Math.pow(0.78, k)) / 0.22 * 30;
          mk('rect', { x: 100 - w / 2, y: y - 30 * Math.pow(0.78, k), width: w, height: 30 * Math.pow(0.78, k), fill: '#8a5a2b', stroke: '#3b2412', 'stroke-width': 0.6 });
        }
        mk('text', { x: 100, y: 12, 'text-anchor': 'middle', 'font-size': 16, fill: '#868e96' }, '∞').textContent = '∞';
        mk('path', { d: 'M100 140 C60 135 45 170 62 195 C40 225 70 255 100 250 C130 255 160 225 138 195 C155 170 140 135 100 140 Z', fill: '#1098ad', stroke: '#0b7285', 'stroke-width': 2 });
        hole(mk, 100, 190, 12); bridge(mk, 100, 225, 30);
      }
    },
    {
      name: 'La Chaussette', desc: 'Retrouvée derrière l’ampli. Sent un peu le vieux concert.',
      draw: (mk) => {
        neck(mk, 92, 125, 90, 0, 6, '#495057');
        mk('path', { d: 'M62 120 L122 120 L122 190 Q122 205 140 210 L165 218 Q185 228 172 248 Q160 258 130 250 L80 238 Q60 232 62 210 Z', fill: '#e64980', stroke: '#a61e4d', 'stroke-width': 2 });
        mk('rect', { x: 60, y: 118, width: 64, height: 16, fill: '#fff', stroke: '#a61e4d' });
        [140, 160, 180, 200].forEach((y) => mk('line', { x1: 62, x2: 122, y1: y, y2: y, stroke: '#fcc2d7', 'stroke-width': 4 }));
        mk('circle', { cx: 150, cy: 236, r: 5, fill: '#fff', stroke: '#a61e4d' });
        ['M150 140 q4 -8 0 -16', 'M160 150 q4 -8 0 -16', 'M140 152 q4 -8 0 -16'].forEach((d) => mk('path', { d, fill: 'none', stroke: '#82c91e', 'stroke-width': 2 }));
      }
    },
    {
      name: 'La Une-Corde', desc: 'Une seule corde, une seule note. Mais elle la joue TRÈS bien.',
      draw: (mk) => {
        mk('rect', { x: 96, y: 15, width: 8, height: 130, fill: '#8a5a2b', stroke: '#3b2412' });
        mk('rect', { x: 93, y: 5, width: 14, height: 14, rx: 3, fill: '#3b2412' });
        mk('circle', { cx: 112, cy: 12, r: 3, fill: '#c9c9c9', stroke: '#555' });
        mk('rect', { x: 70, y: 140, width: 60, height: 110, rx: 4, fill: '#ced4da', stroke: '#495057', 'stroke-width': 2 });
        mk('text', { x: 100, y: 200, 'text-anchor': 'middle', 'font-size': 10, fill: '#495057', 'font-weight': 700 }, 'BOÎTE DE').textContent = 'BOÎTE DE';
        mk('text', { x: 100, y: 214, 'text-anchor': 'middle', 'font-size': 10, fill: '#495057', 'font-weight': 700 }, 'CONSERVE').textContent = 'CONSERVE';
        [150, 240].forEach((y) => mk('line', { x1: 70, x2: 130, y1: y, y2: y, stroke: '#868e96', 'stroke-width': 2 }));
        mk('line', { x1: 100, x2: 100, y1: 12, y2: 230, stroke: '#eee', 'stroke-width': 1 });
      }
    },
    {
      name: 'La Sushi', desc: 'Corps en riz, manche en baguette. Se joue avec un peu de wasabi.',
      draw: (mk) => {
        mk('rect', { x: 96, y: 5, width: 8, height: 150, rx: 3, fill: '#d9a066', stroke: '#8a5a2b', transform: 'rotate(-4 100 80)' });
        mk('rect', { x: 108, y: 5, width: 7, height: 150, rx: 3, fill: '#d9a066', stroke: '#8a5a2b', transform: 'rotate(5 110 80)' });
        mk('ellipse', { cx: 100, cy: 200, rx: 62, ry: 46, fill: '#fff', stroke: '#ced4da', 'stroke-width': 2 });
        mk('path', { d: 'M45 190 Q100 140 155 190 Q100 175 45 190 Z', fill: '#ff8787' });
        [60, 80, 100, 120, 140].forEach((x) => mk('path', { d: `M${x - 10} ${180 - Math.abs(100 - x) * 0.1} q10 -8 20 0`, fill: 'none', stroke: '#fff', 'stroke-width': 2 }));
        mk('rect', { x: 92, y: 158, width: 16, height: 86, fill: '#2b3d2b' });
        mk('circle', { cx: 160, cy: 245, r: 9, fill: '#94d82d' });
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

  /** Sons bizarres pour certaines guitares. */
  function weirdSound(kind) {
    try {
      const t = Audio2.now() + 0.05;
      if (kind === 'wg-rocket') for (let k = 0; k < 14; k++) Audio2.guitar(40 + k * 3, t + k * 0.05, 0.4, 0.4); // décollage
      else if (kind === 'wg-ghost') [76, 75, 74, 73, 72].forEach((m, k) => Audio2.guitar(m, t + k * 0.3, 1.5, 0.25)); // hou-hou
      else if (kind === 'wg-upside') [64, 59, 55, 50, 45, 40].forEach((m, k) => Audio2.guitar(m, t + k * 0.04, 1.6, 0.45)); // accord à l'envers
      else for (let k = 0; k < 6; k++) Audio2.guitar(40 + Math.floor(Math.random() * 36), t + k * 0.06, 1.2, 0.35); // n'importe quoi
    } catch (e) { /* pas de son */ }
  }

  function render(el) {
    el.appendChild(h('div', { class: 'notice', html: '🎉 <b>Bravo, tu as trouvé le passage secret !</b> (Em – G – Dsus4 – A7sus4… ça te dit quelque chose ?) Touche une guitare pour l’entendre. ' + GUITARS.length + ' instruments que personne n’aurait dû fabriquer.' }));
    const chaos = h('button', { class: 'btn', text: '🌀 Mode chaos' });
    const grid = h('div', { class: 'wg-grid' });
    let chaosTimer = null;
    chaos.addEventListener('click', () => {
      const on = grid.classList.toggle('wg-chaos');
      chaos.textContent = on ? '🧘 Calme-toi' : '🌀 Mode chaos';
      clearInterval(chaosTimer);
      if (on) chaosTimer = setInterval(() => { if (!document.body.contains(grid)) { clearInterval(chaosTimer); return; } weirdSound('chaos'); }, 700);
    });
    el.appendChild(h('div', { class: 'btn-row' }, [chaos]));
    GUITARS.forEach((g, i) => {
      const card = h('button', { class: 'wg-card' + (g.cls ? ' ' + g.cls : ''), title: 'Écouter' }, [svg(g.draw), h('div', { class: 'wg-name', text: g.name }), h('div', { class: 'wg-desc', text: g.desc })]);
      card.style.animationDelay = (i * 0.37) + 's';
      card.addEventListener('click', () => {
        if (g.cls && g.cls !== 'wg-flee' && g.cls !== 'wg-rainbow') weirdSound(g.cls); else wiggle(i);
        card.classList.remove('wg-boing'); void card.offsetWidth; card.classList.add('wg-boing');
      });
      if (g.cls === 'wg-flee') {
        // elle s'enfuit… sauf une fois sur cinq
        let tries = 0;
        const flee = () => {
          if (++tries % 5 === 0) { card.style.transform = ''; return; }
          const dx = (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 90), dy = (Math.random() - 0.5) * 120;
          card.style.transform = `translate(${dx}px, ${dy}px) rotate(${(Math.random() - 0.5) * 40}deg)`;
        };
        card.addEventListener('pointerenter', flee);
        card.addEventListener('touchstart', (e) => { if (tries % 5 !== 4) { e.preventDefault(); flee(); } else tries++; }, { passive: false });
      }
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

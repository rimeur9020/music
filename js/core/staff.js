/* Rendu d'une portée en SVG (clé de sol / clé de fa). */
(function () {
  'use strict';

  const SP = 12; // espace entre deux lignes
  const CLEFS = {
    treble: { bottomDia: 4 * 7 + 2, glyph: '\u{1D11E}', size: SP * 4.2, dy: SP * 1 }, // E4 = première ligne
    bass: { bottomDia: 2 * 7 + 4, glyph: '\u{1D122}', size: SP * 4.2, dy: 0 } // G2 = première ligne
  };

  function dia(note, octave) { return octave * 7 + note.letter; }

  function el(name, attrs, text) {
    const e = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  /**
   * notes : [{ note: {letter, acc}, octave, color?, label? }]
   * opts : { clef: 'treble'|'bass', width, spacing }
   */
  function render(container, notes, opts) {
    opts = opts || {};
    const clef = CLEFS[opts.clef || 'treble'];
    const spacing = opts.spacing || 46;
    const left = 70;
    const cols = notes.reduce((a, n, i) => Math.max(a, (n.col != null ? n.col : i) + 1), 0);
    const width = opts.width || Math.max(240, left + 30 + cols * spacing);
    const top = SP * 5; // place pour les lignes supplémentaires
    const height = top + SP * 4 + SP * 5;
    const bottomY = top + SP * 4;
    const svg = el('svg', {
      viewBox: `0 0 ${width} ${height}`, class: 'staff-svg', role: 'img',
      'aria-label': 'Portée en clé de ' + (opts.clef === 'bass' ? 'fa' : 'sol')
    });
    const g = el('g', { class: 'staff' });
    svg.appendChild(g);
    for (let i = 0; i < 5; i++) {
      g.appendChild(el('line', { x1: 8, x2: width - 8, y1: top + i * SP, y2: top + i * SP, class: 'staff-line' }));
    }
    g.appendChild(el('line', { x1: 8, x2: 8, y1: top, y2: bottomY, class: 'staff-line' }));
    g.appendChild(el('line', { x1: width - 8, x2: width - 8, y1: top, y2: bottomY, class: 'staff-line' }));
    g.appendChild(el('text', {
      x: 14, y: bottomY + clef.dy, class: 'clef', 'font-size': clef.size
    }, clef.glyph));

    notes.forEach((n, i) => {
      const x = left + spacing / 2 + (n.col != null ? n.col : i) * spacing + (n.xShift || 0);
      const d = dia(n.note, n.octave);
      const step = d - clef.bottomDia; // 0 = première ligne, 1 = 1er interligne...
      const y = bottomY - step * SP / 2;
      const ng = el('g', { class: 'note' + (n.cls ? ' ' + n.cls : '') });
      // lignes supplémentaires
      for (let s = -2; s >= step; s -= 2) {
        const ly = bottomY - s * SP / 2;
        ng.appendChild(el('line', { x1: x - 13, x2: x + 13, y1: ly, y2: ly, class: 'ledger' }));
      }
      for (let s = 10; s <= step; s += 2) {
        const ly = bottomY - s * SP / 2;
        ng.appendChild(el('line', { x1: x - 13, x2: x + 13, y1: ly, y2: ly, class: 'ledger' }));
      }
      ng.appendChild(el('ellipse', {
        cx: x, cy: y, rx: SP * 0.66, ry: SP * 0.48, transform: `rotate(-20 ${x} ${y})`,
        class: 'notehead', style: n.color ? `fill:${n.color}` : ''
      }));
      if (opts.stems !== false) {
        const up = step < 4;
        const sx = up ? x + SP * 0.6 : x - SP * 0.6;
        ng.appendChild(el('line', {
          x1: sx, x2: sx, y1: y, y2: up ? y - SP * 3.4 : y + SP * 3.4, class: 'stem',
          style: n.color ? `stroke:${n.color}` : ''
        }));
      }
      if (n.note.acc) {
        const glyph = { '-2': '\u{1D12B}', '-1': '♭', 1: '♯', 2: '\u{1D12A}' }[n.note.acc];
        ng.appendChild(el('text', { x: x - SP * 1.9 - (n.accShift || 0), y: y + SP * 0.45, class: 'accidental', 'font-size': SP * 2.1 }, glyph));
      }
      if (n.label) {
        ng.appendChild(el('text', { x, y: height - 6, class: 'note-label', 'text-anchor': 'middle' }, n.label));
      }
      g.appendChild(ng);
    });

    container.innerHTML = '';
    container.appendChild(svg);
    return svg;
  }

  window.Staff = { render, CLEFS, dia };
})();

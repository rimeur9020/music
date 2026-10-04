/* Fiche d'accompagnement guitare en PDF d'une page (A4). */
(function () {
  'use strict';

  const ACCENT = [194, 65, 12];
  const INK = [29, 27, 24];
  const MUTED = [110, 104, 95];
  const LIGHT = [221, 215, 203];

  function arrow(doc, x, y1, y2, up) {
    const head = 1.6;
    doc.setLineWidth(0.45);
    if (!up) {
      doc.line(x, y1, x, y2 - head);
      doc.triangle(x - 1.15, y2 - head - 0.2, x + 1.15, y2 - head - 0.2, x, y2, 'F');
    } else {
      doc.line(x, y1 + head, x, y2);
      doc.triangle(x - 1.15, y1 + head + 0.2, x + 1.15, y1 + head + 0.2, x, y1, 'F');
    }
  }

  function drawSymbol(doc, sym, cx, top, h) {
    if (!sym) return;
    const accent = sym.endsWith('>');
    const parts = sym.replace('>', '').split('+');
    const y1 = top + 1.5, y2 = top + h - 1.5;
    if (accent) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('>', cx, top - 0.6, { align: 'center' });
    }
    const textParts = [];
    parts.forEach((p) => {
      if (p === 'D' || p === 'X' || p === 'C') {
        arrow(doc, cx, y1, p === 'C' ? y2 - 2.2 : y2, false);
        if (p === 'X') { doc.setLineWidth(0.5); doc.line(cx - 1.6, top + h / 2 - 1.6, cx + 1.6, top + h / 2 + 1.6); doc.line(cx - 1.6, top + h / 2 + 1.6, cx + 1.6, top + h / 2 - 1.6); }
        if (p === 'C') doc.circle(cx, y2 - 0.4, 0.55, 'F');
      } else if (p === 'U' || p === 'x') {
        arrow(doc, cx, y1, y2, true);
        if (p === 'x') { doc.setLineWidth(0.5); doc.line(cx - 1.6, top + h / 2 - 1.6, cx + 1.6, top + h / 2 + 1.6); doc.line(cx - 1.6, top + h / 2 + 1.6, cx + 1.6, top + h / 2 - 1.6); }
      } else textParts.push(p);
    });
    if (textParts.length) {
      doc.setFont('helvetica', 'bold');
      const t = textParts.join('+');
      doc.setFontSize(t.length > 2 ? 7.5 : 10);
      doc.text(t, cx, top + h / 2 + 1.3, { align: 'center' });
    }
  }

  function drawDiagram(doc, prims, x, y, scale) {
    prims.forEach((p) => {
      if (p.t === 'line') {
        doc.setLineWidth(Math.max(0.15, p.w * scale * 0.9));
        doc.line(x + p.x1 * scale, y + p.y1 * scale, x + p.x2 * scale, y + p.y2 * scale);
      } else if (p.t === 'text') {
        doc.setFont('helvetica', p.bold ? 'bold' : 'normal');
        doc.setFontSize(p.size * scale * 2.6);
        const s = p.s === '×' ? 'x' : p.s;
        doc.text(s, x + p.x * scale, y + p.y * scale, { align: p.anchor === 'middle' ? 'center' : 'left' });
      } else if (p.t === 'circle') {
        doc.setLineWidth(0.2);
        doc.circle(x + p.cx * scale, y + p.cy * scale, p.r * scale, p.fill ? 'F' : 'S');
      } else if (p.t === 'rect') {
        doc.roundedRect(x + p.x * scale, y + p.y * scale, p.w * scale, p.h * scale, p.r * scale, p.r * scale, 'F');
      }
    });
  }

  /**
   * sheet : { title, composer, info: [[label, value]], pattern, counts, beatStarts, legend, patternDesc,
   *           sections: [{ label, bars: [[name…]] , firstBar }], structure: [label…], pickup, chords: [{ name, voicing }], tips: [] }
   */
  function build(sheet) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, H = 297, mx = 14;
    const cw = W - 2 * mx;

    // --- hauteur nécessaire pour adapter l'échelle ---
    const totalRows = sheet.sections.reduce((a, s) => a + Math.ceil(s.bars.length / 4), 0);
    const diagPerRow = 9;
    const diagRows = Math.ceil(sheet.chords.length / diagPerRow);
    const fixed = 30 + 36 + 9 * sheet.sections.length + diagRows * 27 + 34;
    let rowH = Math.min(13, Math.max(7.5, (H - 16 - fixed) / Math.max(1, totalRows)));
    let barsPerRow = 4;
    if ((H - 16 - fixed) / Math.max(1, totalRows) < 7.5) {
      barsPerRow = 8;
      const rows8 = sheet.sections.reduce((a, s) => a + Math.ceil(s.bars.length / 8), 0);
      rowH = Math.min(12, Math.max(6.5, (H - 16 - fixed) / Math.max(1, rows8)));
    }

    // --- En-tête ---
    let y = 18;
    doc.setTextColor(...INK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    const title = sheet.title || 'Sans titre';
    doc.text(doc.splitTextToSize(title, cw - 70)[0], mx, y);
    if (sheet.composer) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(...MUTED);
      doc.text(sheet.composer, mx, y + 6);
    }
    // encadré infos
    const boxW = 66;
    const bx = W - mx - boxW;
    doc.setDrawColor(...LIGHT);
    doc.setLineWidth(0.3);
    doc.roundedRect(bx, 9, boxW, 4.6 * sheet.info.length + 3.5, 2, 2, 'S');
    sheet.info.forEach(([l, v], i) => {
      const yy = 14 + i * 4.6;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
      doc.text(l, bx + 3, yy);
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...INK);
      doc.text(String(v), bx + 23, yy);
    });
    y = Math.max(y + 12, 9 + 4.6 * sheet.info.length + 9);
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.8);
    doc.line(mx, y - 3, W - mx, y - 3);

    // --- Rythmique ---
    doc.setTextColor(...ACCENT);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('RYTHMIQUE', mx, y + 2);
    doc.setTextColor(...INK);
    doc.setFontSize(10);
    doc.text(sheet.pattern.name + (sheet.pattern.feel ? '  (croches ' + (sheet.pattern.feel === 'shuffle' ? 'shuffle' : 'swing') + ')' : ''), mx + 27, y + 2);
    const slots = sheet.pattern.slots;
    const sw = Math.min(11, 96 / slots.length);
    const gx = mx, gy = y + 7, gh = 10;
    doc.setDrawColor(...INK);
    slots.forEach((s, i) => {
      const x = gx + i * sw;
      doc.setDrawColor(...(sheet.beatStarts[i] ? INK : LIGHT));
      doc.setLineWidth(sheet.beatStarts[i] ? 0.5 : 0.2);
      doc.line(x, gy, x, gy + gh + 5);
      doc.setTextColor(...INK);
      doc.setDrawColor(...INK);
      doc.setFillColor(...INK);
      drawSymbol(doc, s, x + sw / 2, gy, gh);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text(sheet.counts[i] || '', x + sw / 2, gy + gh + 4, { align: 'center' });
    });
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.5);
    doc.line(gx + slots.length * sw, gy, gx + slots.length * sw, gy + gh + 5);
    doc.setLineWidth(0.2);
    doc.setDrawColor(...LIGHT);
    doc.line(gx, gy + gh + 1, gx + slots.length * sw, gy + gh + 1);
    // description
    const dx = gx + slots.length * sw + 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    const descLines = doc.splitTextToSize(sheet.patternDesc, W - mx - dx);
    doc.text(descLines.slice(0, 5), dx, gy + 2);
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    const legendLines = doc.splitTextToSize('Légende : ' + sheet.legend.join(' · '), cw);
    const ly = Math.max(gy + gh + 9, gy + 2 + descLines.slice(0, 5).length * 3.6 + 1);
    doc.text(legendLines.slice(0, 2), mx, ly);
    y = ly + legendLines.slice(0, 2).length * 3.3 + 4;

    // --- Sections ---
    sheet.sections.forEach((sec) => {
      doc.setFillColor(...ACCENT);
      doc.roundedRect(mx, y - 4.6, 7, 6.4, 1.2, 1.2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(sec.label.length > 1 ? 8 : 11.5);
      doc.text(sec.label, mx + 3.5, y - 0.2, { align: 'center' });
      doc.setTextColor(...INK);
      doc.setFontSize(11);
      doc.text('Partie ' + sec.label, mx + 10, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      doc.text(sec.bars.length + ' mesure' + (sec.bars.length > 1 ? 's' : ''), mx + 10 + doc.getTextWidth('Partie ' + sec.label) * 11 / 8.5 + 3, y);
      y += 3;
      const bw = cw / barsPerRow;
      const rows = Math.ceil(sec.bars.length / barsPerRow);
      for (let r = 0; r < rows; r++) {
        const top = y + r * rowH;
        doc.setDrawColor(...LIGHT);
        doc.setLineWidth(0.2);
        doc.line(mx, top, mx + cw, top);
        doc.line(mx, top + rowH, mx + cw, top + rowH);
        for (let c = 0; c < barsPerRow; c++) {
          const idx = r * barsPerRow + c;
          const x = mx + c * bw;
          doc.setDrawColor(...INK);
          doc.setLineWidth(c === 0 ? 0.6 : 0.35);
          if (idx <= sec.bars.length) doc.line(x, top, x, top + rowH);
          if (idx >= sec.bars.length) continue;
          const chords = sec.bars[idx];
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6);
          doc.setTextColor(...MUTED);
          doc.text(String(idx + 1), x + 1, top + 2.6);
          doc.setTextColor(...INK);
          doc.setFont('helvetica', 'bold');
          const n = Math.max(1, chords.length);
          const fs = Math.min(rowH * 1.25, n > 2 ? 9 : n > 1 ? 11.5 : 14);
          doc.setFontSize(fs);
          chords.forEach((name, k) => {
            const cx = x + bw * (k + 0.5) / n;
            doc.text(name, cx, top + rowH / 2 + fs * 0.13, { align: 'center' });
            if (k > 0) {
              doc.setDrawColor(...LIGHT);
              doc.setLineWidth(0.25);
              doc.line(x + bw * k / n - 0.8, top + rowH - 2, x + bw * k / n + 0.8, top + 2);
            }
          });
          if (!chords.length) doc.text('—', x + bw / 2, top + rowH / 2 + 1.5, { align: 'center' });
        }
        const endIdx = Math.min(sec.bars.length, (r + 1) * barsPerRow);
        const ex = mx + (endIdx - r * barsPerRow) * bw;
        doc.setDrawColor(...INK);
        doc.setLineWidth(r === rows - 1 ? 1.1 : 0.35);
        doc.line(ex, top, ex, top + rowH);
      }
      y += rows * rowH + 8;
    });

    // --- Diagrammes ---
    if (sheet.chords.length) {
      doc.setTextColor(...ACCENT);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('ACCORDS', mx, y);
      y += 2;
      const scale = 19 / 64;
      sheet.chords.forEach((c, i) => {
        const col = i % diagPerRow;
        const row = Math.floor(i / diagPerRow);
        doc.setTextColor(...INK);
        doc.setDrawColor(...INK);
        doc.setFillColor(...INK);
        drawDiagram(doc, Chords.diagramPrims(c.name, c.voicing), mx + col * (cw / diagPerRow), y + row * 27, scale);
      });
      y += diagRows * 27 + 2;
    }

    // --- Structure (bas de page) ---
    const fy = Math.max(y + 2, H - 30);
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.8);
    doc.line(mx, fy - 5, W - mx, fy - 5);
    doc.setTextColor(...ACCENT);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('STRUCTURE', mx, fy + 1);
    doc.setTextColor(...INK);
    doc.setFontSize(13);
    const struct = sheet.structure.join('  -  ');
    const sl = doc.splitTextToSize(struct, cw - 30);
    doc.text(sl.slice(0, 2), mx + 30, fy + 1);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const notes = (sheet.tips || []).slice();
    const tl = doc.splitTextToSize(notes.join('   ·   '), cw);
    doc.text(tl.slice(0, 3), mx, fy + 1 + sl.slice(0, 2).length * 5 + 1.5);
    return doc;
  }

  window.SheetPDF = { build };
})();

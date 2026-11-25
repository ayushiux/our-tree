function wrapText(ctx, value, maximum) {
  const result = [];
  for (const paragraph of value.replace(/\r/g, '').split('\n')) {
    if (!paragraph.trim()) { result.push(''); continue; }
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? line + ' ' + word : word;
      if (ctx.measureText(candidate).width <= maximum) { line = candidate; continue; }
      if (line) { result.push(line); line = ''; }
      if (ctx.measureText(word).width <= maximum) { line = word; continue; }
      const chars = typeof Intl.Segmenter === 'function' ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(word), v => v.segment) : Array.from(word);
      for (const c of chars) { if (line && ctx.measureText(line + c).width > maximum) { result.push(line); line = c; } else line += c; }
    }
    result.push(line);
  }
  return result;
}
function star(ctx, x, y, r, color) { ctx.fillStyle = color; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, length = i % 2 ? r * .23 : r; const xx = x + Math.cos(a) * length, yy = y + Math.sin(a) * length; if (!i) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); } ctx.closePath(); ctx.fill(); }
export async function renderPostcardCanvas(scene, card, options = {}) {
  const width = options.width || 1800, height = options.height || 1200;
  const art = await scene.capture(Math.round(810 * width / 1800), Math.round(1080 * height / 1200), options);
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d'); ctx.scale(width / 1800, height / 1200);
  ctx.fillStyle = '#fcf7ed'; ctx.fillRect(0, 0, 1800, 1200);
  ctx.strokeStyle = '#d2c3a2'; ctx.lineWidth = 2; ctx.strokeRect(36, 36, 1728, 1128);
  ctx.strokeStyle = '#e2d8c1'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(815, 148); ctx.lineTo(815, 1054); ctx.stroke();
  ctx.drawImage(art, 60, 73, 725, 967);
  star(ctx, 136, 107, 18, '#c39c56'); star(ctx, 685, 157, 12, '#c39c56'); star(ctx, 720, 1060, 12, '#c39c56'); star(ctx, 135, 1050, 9, '#c39c56');
  ctx.fillStyle = '#61705c'; ctx.font = 'italic 26px Georgia'; ctx.textAlign = 'center'; ctx.fillText('A little Christmas magic, made just for you.', 432, 1112); ctx.textAlign = 'left';
  ctx.strokeStyle = '#c39c56'; ctx.lineWidth = 1.5; ctx.strokeRect(1590, 86, 99, 119); star(ctx, 1639, 131, 22, '#c39c56'); ctx.fillStyle = '#9d7d44'; ctx.font = '14px Arial'; ctx.textAlign = 'center'; ctx.fillText('CHRISTMAS', 1639, 181); ctx.textAlign = 'left';
  const recipient = card.to.trim() ? 'For ' + card.to.trim() : 'For someone wonderful';
  ctx.fillStyle = '#68765f'; ctx.font = '27px Georgia';
  const recipientLines = wrapText(ctx, recipient, 680); recipientLines.forEach((line, i) => ctx.fillText(line, 874, 229 + i * 34));
  ctx.fillStyle = '#a43a34'; ctx.font = 'italic 108px Georgia'; ctx.fillText('Merry', 870, 370); ctx.fillText('Christmas', 870, 484);
  ctx.strokeStyle = '#bf9b58'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(878, 531); ctx.lineTo(1001, 531); ctx.stroke(); star(ctx, 1020, 531, 8, '#bf9b58');
  const message = card.message.trim().replace(/\s+/g, ' ');
  let size = 40, lines;
  do { ctx.font = `italic ${size}px Georgia`; lines = wrapText(ctx, message, 735); if (lines.length * size * 1.45 <= 372) break; size--; } while (size >= 22);
  ctx.fillStyle = '#2d4737'; lines.forEach((line, i) => ctx.fillText(line, 878, 621 + i * size * 1.45));
  const sender = card.from.trim() ? 'With love, ' + card.from.trim() : 'With a little Christmas love';
  ctx.fillStyle = '#6a765e'; ctx.font = 'italic 27px Georgia'; wrapText(ctx, sender, 735).slice(0, 2).forEach((line, i) => ctx.fillText(line, 878, 1050 + i * 35));
  return canvas;
}
export async function renderPostcard(scene, card) {
  const canvas = await renderPostcardCanvas(scene, card);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Postcard export failed');
  return { canvas, blob };
}

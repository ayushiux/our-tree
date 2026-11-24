import { makeTreeScene } from './scene.js';
import { renderPostcard } from './postcard.js';

const $ = id => document.getElementById(id), colors = ['#b64038', '#d5ab57', '#e4adad', '#567363', '#d2dce1', '#eee3c9'];
const shapes = { bauble: ['Bauble', '<circle cx="16" cy="19" r="10"/><path d="M13 5h6v5h-6z" fill="#bd985c"/><path d="M16 5V1" stroke="#bd985c" fill="none"/>'], star: ['Star', '<path d="m16 2 4.2 9 9.8 1.4-7.1 6.9 1.7 9.7-8.6-4.6-8.6 4.6 1.7-9.7L2 12.4l9.8-1.4z"/>'], heart: ['Heart', '<path d="M16 28C-7 11 10-5 16 7c6-12 23 4 0 21z"/>'], bell: ['Bell', '<path d="M7 25h18c-5-5-3-10-5-15-2-6-7-6-9 0-2 5 0 10-4 15z"/><circle cx="16" cy="27" r="2" fill="#bd985c"/><path d="M16 4V1" stroke="#bd985c"/>'], candy: ['Candy cane', '<path d="M10 29V10a7 7 0 0 1 14 0" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><path d="m8 14 4-2m-4 9 4-2m-4 9 4-2m8-21 4 2" stroke="#fff0d3" stroke-width="3"/>'], bow: ['Bow', '<path d="M15 16C-3-4-4 33 15 16m2 0c19-20 20 17 0 0M15 17l-7 13h6l3-13m0 0 7 13h-6l-3-13z"/><circle cx="16" cy="16" r="3" fill="#bd985c"/>'] };
const icon = (shape, color, size = 32) => `<svg width="${size}" height="${size}" viewBox="0 0 32 32" style="color:${color}" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${shapes[shape][1]}</svg>`;
const DEFAULT_MESSAGE = 'Wishing you a season full of cosy moments, small surprises and people you love.';
const KEY = 'our-tree-postcard-v1';
let selection = { shape: 'bauble', color: colors[0], size: 1 }, ornaments = [], lights = true;
let card = { to: '', from: '', message: DEFAULT_MESSAGE }, undoStack = [], postcardCache = null, creating = false;
const uid = () => crypto.randomUUID().replaceAll('-', '');
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (saved) {
    ornaments = (Array.isArray(saved.ornaments) ? saved.ornaments : []).filter(o => typeof o.id === 'string' && shapes[o.shape] && colors.includes(o.color) && Number.isFinite(o.x) && Number.isFinite(o.y) && Math.abs(o.x) <= .92 && o.y >= .1 && o.y <= .92 && [.75, 1, 1.25].includes(o.size)).slice(0, 150);
    card = { to: String(saved.card?.to || '').slice(0, 48), from: String(saved.card?.from || '').slice(0, 48), message: String(saved.card?.message ?? DEFAULT_MESSAGE).slice(0, 240) };
    lights = saved.lights !== false;
  }
} catch (_) { /* A postcard can still be made when browser storage is unavailable. */ }
function toast(text) { $('toast').textContent = text; $('toast').classList.add('show'); setTimeout(() => $('toast').classList.remove('show'), 2800); }
function invalidateCard() { if (postcardCache) URL.revokeObjectURL(postcardCache.url); postcardCache = null; }
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify({ ornaments, card, lights })); $('save-status').textContent = 'Saved in this browser'; }
  catch (_) { $('save-status').textContent = 'Download your postcard to keep it'; }
  invalidateCard();
}
function checkpoint() { undoStack.push(ornaments.map(o => ({ ...o }))); if (undoStack.length > 30) undoStack.shift(); }
function updateTree() { scene.setOrnaments(ornaments); $('ornament-counter').textContent = `${ornaments.length} ornament${ornaments.length === 1 ? '' : 's'}`; $('tree-count').textContent = ornaments.length ? `${ornaments.length} little touches of Christmas magic` : 'Make the first ornament yours.'; $('undo').disabled = undoStack.length === 0; persist(); }
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } }));
const scene = makeTreeScene($('scene'), pick => {
  checkpoint();
  if (pick.existing) { ornaments = ornaments.filter(o => o.id !== pick.existing.id); toast('Ornament removed. Undo brings it back.'); }
  else {
    if (ornaments.length >= 150) { undoStack.pop(); toast('Your tree is full of Christmas magic. Time for a postcard!'); return; }
    ornaments.push({ ...pick.position, ...selection, id: uid() }); toast(`${shapes[selection.shape][0]} hung. A little more Christmas magic.`);
  }
  updateTree();
});
function select() { scene.setSelection(selection); $('scene-help').textContent = `Tap a branch to hang your ${shapes[selection.shape][0].toLowerCase()}. Tap an ornament to remove it.`; }
for (const [shape, data] of Object.entries(shapes)) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'shape-button' + (shape === selection.shape ? ' selected' : ''); b.dataset.shape = shape; b.innerHTML = icon(shape, '#a83c38') + `<span>${data[0]}</span>`; b.setAttribute('aria-pressed', String(shape === selection.shape));
  b.addEventListener('click', () => { selection.shape = shape; document.querySelectorAll('[data-shape]').forEach(n => { n.classList.toggle('selected', n.dataset.shape === shape); n.setAttribute('aria-pressed', String(n.dataset.shape === shape)); }); select(); if (innerWidth < 760) document.querySelector('.tree-panel').scrollIntoView({ block: 'center', behavior: 'auto' }); }); $('shape-grid').appendChild(b);
}
for (const [i, color] of colors.entries()) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'swatch' + (i === 0 ? ' selected' : ''); b.style.setProperty('--swatch', color); b.dataset.color = color; b.setAttribute('aria-label', ['Christmas red', 'Gold', 'Soft pink', 'Forest green', 'Winter blue', 'Warm ivory'][i]); b.setAttribute('aria-pressed', String(i === 0));
  b.addEventListener('click', () => { selection.color = color; document.querySelectorAll('[data-color]').forEach(n => { n.classList.toggle('selected', n.dataset.color === color); n.setAttribute('aria-pressed', String(n.dataset.color === color)); }); select(); }); $('colors').appendChild(b);
}
document.querySelectorAll('[data-size]').forEach(b => b.addEventListener('click', () => { selection.size = Number(b.dataset.size); document.querySelectorAll('[data-size]').forEach(n => { n.classList.toggle('selected', n === b); n.setAttribute('aria-pressed', String(n === b)); }); select(); }));
$('undo').addEventListener('click', () => { if (!undoStack.length) return; ornaments = undoStack.pop(); updateTree(); toast('One little step back.'); });
$('lights').addEventListener('click', () => { lights = !lights; scene.lights(lights); $('lights').textContent = lights ? 'Lights on ✧' : 'Lights off'; $('lights').setAttribute('aria-pressed', String(lights)); persist(); });
for (const key of ['to', 'from', 'message']) { $('card-' + key).value = card[key]; $('card-' + key).addEventListener('input', e => { card[key] = e.target.value; persist(); }); }
function setCreating(on) { creating = on; for (const id of ['make-card', 'preview-card']) { $(id).disabled = on; } }
async function preview() {
  if (creating) return;
  setCreating(true); $('postcard-error').textContent = '';
  try {
    if (!postcardCache) {
      const { blob, canvas } = await renderPostcard(scene, card);
      const file = new File([blob], 'christmas-postcard.png', { type: 'image/png' });
      postcardCache = { blob, file, url: URL.createObjectURL(blob), width: canvas.width, height: canvas.height };
    }
    $('postcard-image').src = postcardCache.url;
    $('postcard-image').alt = `Christmas postcard for ${card.to || 'someone you love'}. ${card.message}. From ${card.from || 'you'}.`;
    $('share-postcard').hidden = !(navigator.share && navigator.canShare && navigator.canShare({ files: [postcardCache.file] }));
    $('postcard-dialog').showModal();
  } catch (_) { toast('The postcard couldn’t be made this time. Please try again.'); }
  finally { setCreating(false); }
}
$('make-card').addEventListener('click', preview); $('preview-card').addEventListener('click', preview);
$('download-postcard').addEventListener('click', () => { if (!postcardCache) return; const a = document.createElement('a'); a.href = postcardCache.url; a.download = 'christmas-postcard.png'; document.body.appendChild(a); a.click(); a.remove(); toast('Postcard downloaded. Send a little Christmas love.'); });
$('share-postcard').addEventListener('click', () => {
  if (!postcardCache || !navigator.share) return;
  navigator.share({ files: [postcardCache.file], title: 'A little Christmas love' }).catch(e => { if (e.name !== 'AbortError') $('postcard-error').textContent = 'Sharing isn’t available here. Download the postcard and attach it to your message.'; });
});
$('start-over').addEventListener('click', () => $('reset-dialog').showModal());
$('keep-tree').addEventListener('click', () => $('reset-dialog').close());
$('confirm-reset').addEventListener('click', () => { ornaments = []; undoStack = []; card = { to: '', from: '', message: DEFAULT_MESSAGE }; lights = true; scene.lights(true); $('lights').textContent = 'Lights on ✧'; $('lights').setAttribute('aria-pressed', 'true'); for (const key of ['to', 'from', 'message']) $('card-' + key).value = card[key]; updateTree(); $('reset-dialog').close(); toast('A fresh tree. A new little Christmas.'); });
if (location.hash.startsWith('#t=')) history.replaceState(null, '', location.pathname + location.search);
scene.lights(lights); $('lights').textContent = lights ? 'Lights on ✧' : 'Lights off'; $('lights').setAttribute('aria-pressed', String(lights)); updateTree();
window.treeDebug = () => ({ mode: 'postcard', ornamentCount: ornaments.length, selection: { ...selection }, rendered: scene.count(), lights, postcard: postcardCache ? { width: postcardCache.width, height: postcardCache.height, bytes: postcardCache.blob.size } : null });

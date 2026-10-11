// usage: node _contrast_mc.mjs <light|dark> <out.json>
import { chromium } from '@playwright/test';
import fs from 'fs';
const [, , scheme, out] = process.argv;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme, reducedMotion: 'reduce' });
await p.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 60000 });
const scan = () => p.evaluate(() => {
  const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const rgba = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = '#000'; cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); const d = cv.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const lum = ([r, g, b]) => { const f = v => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (el) => { const layers = []; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage !== 'none' && !cs.backgroundImage.startsWith('url(data')) return null; const c = rgba(cs.backgroundColor); if (c[3] > 0) { layers.push(c); if (c[3] >= 0.99) break; } } let out = [255, 255, 255]; for (const c of layers.reverse()) out = out.map((v, i) => v * (1 - c[3]) + c[i] * c[3]); return out; };
  const res = [];
  for (const el of document.querySelectorAll('body *')) {
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const cls = typeof el.className === 'string' ? el.className : '';
    const id = el.getAttribute('data-cg'); if (!id) continue;
    const m = [null, (cls.match(/(?:^|\s)(text-(?:slate|gray)-\d+)(?=\s|$)/) || [, ''])[1]];
    if (el.closest('button[disabled]')) continue;
    const bg = bgOf(el); if (!bg) continue;
    const fg = rgba(cs.color); const fgc = fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]));
    const L1 = lum(fgc), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700; const need = (size >= 24 || (size >= 18.66 && bold)) ? 3 : 4.5;
    res.push({ id, token: m[1], cls, ratio: +ratio.toFixed(2), need, bgL: +lum(bg).toFixed(3), text: el.innerText.trim().slice(0, 30) });
  }
  return res;
});
const all = new Map();
const add = (list) => list.forEach(x => all.set(x.id + '|' + x.text + '|' + x.bgL, x));
add(await scan());
await p.getByRole('button', { name: /Sign In to Dashboard/ }).click();
await p.waitForFunction(() => !document.getElementById('biometric-auth-overlay'), null, { timeout: 20000 });
for (const t of ['Home', 'Explore', 'Hive AI', 'Vault', 'Journey']) {
  const s = p.getByRole('button', { name: /^Skip$/ }); if (await s.count()) await s.first().click().catch(() => {});
  await p.getByRole('button', { name: new RegExp('^' + t + '$') }).last().click({ timeout: 4000 }).catch(() => {});
  await p.waitForTimeout(700);
  const s2 = p.getByRole('button', { name: /^Skip$/ }); if (await s2.count()) await s2.first().click().catch(() => {});
  for (let y = 0; y < 8000; y += 500) {
    const more = await p.evaluate((y) => { const s = [...document.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight + 100 && /auto|scroll/.test(getComputedStyle(e).overflowY)).sort((a, b) => b.clientHeight - a.clientHeight)[0]; if (!s) return false; s.scrollTop = y; return y < s.scrollHeight; }, y);
    await p.waitForTimeout(150); add(await scan()); if (!more) break;
  }
}
for (const [btn, sel] of [['Open Settings', '#settings-panel-modal'], ['Open Notifications', '#notification-center-panel']]) {
  await p.getByRole('button', { name: /^Home$/ }).last().click().catch(() => {}); await p.waitForTimeout(400);
  await p.getByRole('button', { name: btn }).click().catch(() => {}); await p.waitForTimeout(800);
  for (let y = 0; y < 6000; y += 500) { await p.evaluate(([sel, y]) => { const r = document.querySelector(sel); r && r.querySelectorAll('*').forEach(e => { if (e.scrollHeight > e.clientHeight + 50) e.scrollTop = y; }); }, [sel, y]); await p.waitForTimeout(120); add(await scan()); }
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
}
const list = [...all.values()];
fs.writeFileSync(out, JSON.stringify(list, null, 1));
console.log(scheme, 'instances:', list.length, ' ids:', new Set(list.map(x => x.id)).size, ' failing:', list.filter(x => x.ratio < x.need).length);
await b.close();

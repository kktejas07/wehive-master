// Counts text that overflows its box (clipped or spilling) on each screen, light mode.
import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
await p.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 60000 });
await p.getByRole('button', { name: /Sign In to Dashboard/ }).click();
await p.waitForFunction(() => !document.getElementById('biometric-auth-overlay'), null, { timeout: 20000 });
const measure = () => p.evaluate(() => {
  const bad = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!el.childNodes.length || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const over = el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0 && !/auto|scroll/.test(cs.overflowX) && cs.textOverflow !== 'ellipsis';
    const r = el.getBoundingClientRect(); const pr = el.parentElement?.getBoundingClientRect();
    const spill = pr && r.width > 0 && (r.right > pr.right + 2 || r.left < pr.left - 2) && getComputedStyle(el.parentElement).overflowX === 'visible' && cs.position === 'static';
    if (over || spill) bad.push((el.innerText || '').trim().slice(0, 24));
  }
  return bad;
});
const res = {};
for (const t of ['Home', 'Explore', 'Hive AI', 'Vault', 'Journey']) {
  const s = p.getByRole('button', { name: /^Skip$/ }); if (await s.count()) await s.first().click().catch(() => {});
  await p.getByRole('button', { name: new RegExp('^' + t + '$') }).last().click({ timeout: 4000 }).catch(() => {});
  await p.waitForTimeout(800);
  const s2 = p.getByRole('button', { name: /^Skip$/ }); if (await s2.count()) await s2.first().click().catch(() => {});
  res[t] = await measure();
}
console.log(JSON.stringify(Object.fromEntries(Object.entries(res).map(([k, v]) => [k, { n: v.length, sample: v.slice(0, 6) }]))));
await b.close();

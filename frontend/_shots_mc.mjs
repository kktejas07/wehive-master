// usage: node _shots_mc.mjs <outdir> <light|dark>
import { chromium } from '@playwright/test';
const [, , out, scheme] = process.argv;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme, deviceScaleFactor: 1, reducedMotion: 'reduce' });
await p.addInitScript(() => { Math.random = () => 0.42; });
const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 100)));
await p.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 60000 });
const shot = async (name) => { await p.waitForTimeout(900); await p.screenshot({ path: `${out}/${scheme}-${name}.png`, fullPage: false, animations: 'disabled', mask: [p.locator('text=/\\d{1,2}:\\d{2}/')] }); };
await shot('0-login');
await p.getByRole('button', { name: /Sign In to Dashboard/ }).click();
await p.waitForFunction(() => !document.getElementById('biometric-auth-overlay'), null, { timeout: 15000 }).catch(() => {});
const skipTour = async () => { const s = p.getByRole('button', { name: /^Skip$/ }); if (await s.count()) await s.first().click().catch(() => {}); };
for (const t of ['Home', 'Explore', 'Hive AI', 'Vault', 'Journey']) {
  await skipTour();
  await p.getByRole('button', { name: new RegExp('^' + t + '$') }).last().click({ timeout: 5000 }).catch(() => console.log('nav fail', t));
  await p.waitForTimeout(600); await skipTour();
  await p.evaluate(() => document.querySelectorAll('*').forEach(e => { if (e.scrollTop) e.scrollTop = 0; }));
  await shot('tab-' + t.replace(' ', ''));
  // also capture a scrolled view of the main scroller
  await p.evaluate(() => { const s = [...document.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight + 200 && /auto|scroll/.test(getComputedStyle(e).overflowY)).sort((a, b) => b.clientHeight - a.clientHeight)[0]; if (s) s.scrollTop = 700; });
  await shot('tab-' + t.replace(' ', '') + '-scrolled');
}
await p.getByRole('button', { name: /^Home$/ }).last().click().catch(() => {});
await p.getByRole('button', { name: 'Open Settings' }).click().catch(() => {}); await shot('settings');
await p.keyboard.press('Escape');
await p.getByRole('button', { name: 'Open Notifications' }).click().catch(() => {}); await shot('notifications');
console.log(scheme, 'done; page errors:', [...new Set(errs)].length);
await b.close();

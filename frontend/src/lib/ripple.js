// App-wide click ripple: a soft circle spreads from the pointer inside any
// button or button-like link. White on navy/red fills, navy on light ones.
// Skipped for reduced motion and disabled controls. Styles live in index.css.
const TARGET = 'button, [role="button"], a[class*="rounded"], input[type="submit"]';

function isDark(el) {
  const cs = getComputedStyle(el);
  if (cs.backgroundImage.includes('gradient')) return true;
  const [r, g, b, a = 1] = (cs.backgroundColor.match(/[\d.]+/g) || []).map(Number);
  if (a < 0.5) return false;
  return 0.299 * r + 0.587 * g + 0.114 * b < 150;
}

export function installRipple() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.addEventListener('pointerdown', (e) => {
    if (reduce.matches || e.button !== 0) return;
    const el = e.target.closest(TARGET);
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;

    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const host = document.createElement('span');
    host.className = 'ripple-host';
    const dot = document.createElement('span');
    dot.className = 'ripple-dot';
    dot.style.width = dot.style.height = `${size}px`;
    dot.style.left = `${e.clientX - rect.left - size / 2}px`;
    dot.style.top = `${e.clientY - rect.top - size / 2}px`;
    dot.style.background = isDark(el) ? 'rgba(255,255,255,0.55)' : 'rgba(1,28,181,0.18)';
    host.appendChild(dot);
    el.appendChild(host);
    dot.addEventListener('animationend', () => host.remove());
  }, { passive: true });
}

import { useEffect, useRef } from 'react';

// Keyboard/screen-reader behaviour for hand-rolled modals: Escape closes,
// Tab is trapped inside, focus moves in on open and is restored on close.
// Spread the returned props onto the dialog panel element.
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const stack = [];

export function useDialogA11y(open, onClose) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const token = {};
    stack.push(token);
    const prev = document.activeElement;
    const focusables = () => (ref.current ? [...ref.current.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length) : []);
    if (ref.current && !ref.current.contains(document.activeElement)) (focusables()[0] || ref.current).focus({ preventScroll: true });

    const onKey = (e) => {
      if (stack[stack.length - 1] !== token) return;
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current?.(); return; }
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (!f.length) { e.preventDefault(); return; }
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || !ref.current.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      stack.splice(stack.indexOf(token), 1);
      if (prev && document.contains(prev)) prev.focus({ preventScroll: true });
    };
  }, [open]);

  return { ref, role: 'dialog', 'aria-modal': true, tabIndex: -1 };
}

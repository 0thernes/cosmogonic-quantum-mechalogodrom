/**
 * Toolbar keyboard navigation + scroll shell.
 *
 * Wraps #bar in a compact scroll shell with ‹ › buttons (no fat horizontal scrollbar) and adds roving
 * tabindex so keyboard users can move between buttons with arrow keys, Home, and End.
 */

const SHELL_ID = 'bar-shell';

/** Wrap #bar once in a scroll shell with prev/next buttons. Idempotent. */
export function initToolbarScroll(doc: Document = document): void {
  const bar = doc.getElementById('bar');
  if (!bar || doc.getElementById(SHELL_ID)) return;

  const shell = doc.createElement('div');
  shell.id = SHELL_ID;
  shell.setAttribute('aria-label', 'Simulation toolbar scroll');

  const mkScrollBtn = (label: string, title: string, dir: -1 | 1): HTMLButtonElement => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.className = 'bar-scroll-btn';
    b.textContent = label;
    b.title = title;
    b.setAttribute('aria-label', title);
    b.addEventListener('click', () => {
      bar.scrollBy({ left: dir * Math.max(120, bar.clientWidth * 0.55), behavior: 'smooth' });
    });
    return b;
  };

  const prev = mkScrollBtn('‹', 'Scroll toolbar left', -1);
  const next = mkScrollBtn('›', 'Scroll toolbar right', 1);

  bar.parentNode?.insertBefore(shell, bar);
  shell.append(prev, bar, next);
}

/** Initialize roving tabindex on the toolbar. Idempotent. */
export function initToolbarKeyboard(doc: Document = document): void {
  const bar = doc.getElementById('bar');
  if (!bar) return;

  const buttons = Array.from(bar.querySelectorAll('button'));
  if (buttons.length === 0) return;

  buttons.forEach((b, i) => b.setAttribute('tabindex', i === 0 ? '0' : '-1'));

  const focusAt = (idx: number): void => {
    const i = Math.max(0, Math.min(buttons.length - 1, idx));
    buttons.forEach((b, j) => b.setAttribute('tabindex', j === i ? '0' : '-1'));
    buttons[i]?.focus();
  };

  const currentIndex = (): number => {
    const active = doc.activeElement;
    return active instanceof HTMLElement ? buttons.indexOf(active as HTMLButtonElement) : -1;
  };

  bar.addEventListener('keydown', (e) => {
    const idx = currentIndex();
    if (idx === -1) return;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        focusAt(idx + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        focusAt(idx - 1);
        break;
      case 'Home':
        e.preventDefault();
        focusAt(0);
        break;
      case 'End':
        e.preventDefault();
        focusAt(buttons.length - 1);
        break;
    }
  });
}

if (typeof document !== 'undefined') {
  initToolbarScroll(document);
  initToolbarKeyboard(document);
}

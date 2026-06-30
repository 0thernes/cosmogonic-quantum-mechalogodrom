/**
 * Toolbar keyboard navigation + scroll shell.
 *
 * Wraps #bar in a compact scroll shell with ‹ › buttons (no fat horizontal scrollbar) and adds roving
 * tabindex so keyboard users can move between buttons with arrow keys, Home, and End.
 */
import { dockBottomBar } from './bottom-dock';

const SHELL_ID = 'bar-shell';

function wireScrollButtons(
  bar: HTMLElement,
  shell: HTMLElement,
  mkScrollBtn: (label: string, title: string, dir: -1 | 1) => HTMLButtonElement,
): void {
  let btns = shell.querySelectorAll<HTMLButtonElement>('.bar-scroll-btn');
  if (btns.length < 2) {
    shell.insertBefore(mkScrollBtn('‹', 'Scroll toolbar left', -1), bar);
    shell.appendChild(mkScrollBtn('›', 'Scroll toolbar right', 1));
    btns = shell.querySelectorAll<HTMLButtonElement>('.bar-scroll-btn');
  }
  btns.forEach((b, i) => {
    if (b.dataset['scrollWired']) return;
    b.dataset['scrollWired'] = '1';
    const dir: -1 | 1 = i === 0 ? -1 : 1;
    b.addEventListener('click', () => {
      bar.scrollBy({ left: dir * Math.max(120, bar.clientWidth * 0.55), behavior: 'smooth' });
    });
  });
}

/** Wrap #bar once in a scroll shell with prev/next buttons. Idempotent. */
export function initToolbarScroll(doc: Document = document): void {
  const bar = doc.getElementById('bar');
  if (!bar) return;

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

  let shell = doc.getElementById(SHELL_ID);
  if (!shell) {
    shell = doc.createElement('div');
    shell.id = SHELL_ID;
    shell.setAttribute('aria-label', 'Simulation toolbar scroll');
    bar.parentNode?.insertBefore(shell, bar);
    shell.append(
      mkScrollBtn('‹', 'Scroll toolbar left', -1),
      bar,
      mkScrollBtn('›', 'Scroll toolbar right', 1),
    );
  } else {
    if (bar.parentElement !== shell)
      shell.insertBefore(bar, shell.querySelector('.bar-scroll-btn:last-of-type'));
    wireScrollButtons(bar, shell, mkScrollBtn);
  }
  dockBottomBar(shell, doc);
}

/** Initialize roving tabindex on the toolbar. Idempotent. */
export function initToolbarKeyboard(doc: Document = document): void {
  const bar = doc.getElementById('bar');
  if (!bar) return;

  const buttons = Array.from(bar.querySelectorAll('button'));
  if (buttons.length === 0) return;
  // Idempotency guard (mirrors initToolbarScroll's `kbWired` pattern): this runs both at module
  // import (toolbar.ts) AND from main.ts, so without a guard two identical keydown listeners attach
  // and every arrow press moves focus TWICE (skips a button). Bind exactly once.
  if (bar.dataset['kbWired'] === '1') return;
  bar.dataset['kbWired'] = '1';

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

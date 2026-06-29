/**
 * Unified bottom dock stack (V86): Docs/Spec/Lab/Access/Set, panel launcher, and toolbar
 * share one centered column with tight spacing — no overlap, no misaligned fixed layers.
 */
const STACK_ID = 'cqm-bottom-stack';

export function mountBottomDock(doc: Document = document): HTMLElement {
  let stack = doc.getElementById(STACK_ID);
  if (!stack) {
    stack = doc.createElement('div');
    stack.id = STACK_ID;
    stack.setAttribute('aria-label', 'Bottom navigation and toolbar');
    doc.body.appendChild(stack);
  }
  return stack;
}

/** Move a bottom bar into the shared stack (idempotent). */
export function dockBottomBar(el: HTMLElement | null, doc: Document = document): void {
  if (!el) return;
  const stack = mountBottomDock(doc);
  stack.appendChild(el);
  reorderBottomDock(doc);
}

const BOTTOM_DOCK_ORDER = ['cqm-persist-nav', 'cqm-hud-nav', 'bar-shell'] as const;

/** Keep persist → launcher → toolbar top-to-bottom in one centered column. */
export function reorderBottomDock(doc: Document = document): void {
  const stack = doc.getElementById(STACK_ID);
  if (!stack) return;
  for (const id of BOTTOM_DOCK_ORDER) {
    const el = doc.getElementById(id);
    if (el?.parentElement === stack) stack.appendChild(el);
  }
  syncBottomDockHeight(doc);
}

/** Measure stack height + fixed readout strip for #ui padding and HUD clearance. */
export function syncBottomDockHeight(doc: Document = document): void {
  const stack = doc.getElementById(STACK_ID);
  if (!stack) return;
  const h = stack.getBoundingClientRect().height;
  const bottom = parseFloat(getComputedStyle(stack).bottom) || 4;
  let readoutStrip = 0;
  for (const id of ['perf-hud', 'hud-vsr', 'alg']) {
    const el = doc.getElementById(id);
    if (!el) continue;
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed') continue;
    const rh = el.getBoundingClientRect().height;
    if (rh > 8) readoutStrip = Math.max(readoutStrip, rh);
  }
  const dockH = Math.ceil(h + bottom + 8);
  const stripGap = readoutStrip > 0 ? readoutStrip + 6 : 0;
  doc.documentElement.style.setProperty('--cqm-dock-h', `${dockH}px`);
  doc.documentElement.style.setProperty(
    '--cqm-readout-strip-h',
    `${Math.ceil(readoutStrip || 112)}px`,
  );
  doc.documentElement.style.setProperty('--cqm-bottom-h', `${dockH + stripGap}px`);
}

if (typeof document !== 'undefined') {
  const run = (): void => {
    syncBottomDockHeight();
    window.addEventListener('resize', () => syncBottomDockHeight(), { passive: true });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
}

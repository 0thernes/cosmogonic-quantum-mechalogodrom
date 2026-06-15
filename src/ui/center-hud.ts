/**
 * CENTER HUD (V56) — unifies the six inspector panels (✦ AI · ❓ HELP · 🗒 AUDIT · ⊞ NEURAL · ⊙ MARKET ·
 * ⬢ ARCHITECT) into ONE same-size, fit-to-window pop-up CENTERED on screen that you CYCLE through (the
 * ‹ › arrows or the tab strip) instead of tap-close-tap-open. A ◐ button fades it transparent so you can
 * see the simulation behind it; ✕ closes. It fits any aspect ratio + works on touch — the slot is
 * `min(94vw,760px) × min(82vh,780px)`, always centered. This also permanently fixes "NEURAL overlaps the
 * menu bars": nothing opens at the bottom anymore.
 *
 * It does NOT rewrite the six panels — it drives each one's EXISTING dock toggle (so the panel's own
 * open/close + repaint logic runs), re-homes them to a centered `!important` slot, and enforces
 * one-open-at-a-time. UI shell only; no sim coupling, no rng.
 */

interface Slot {
  name: string;
  icon: string;
  panel: string; // panel element id
  toggle: string; // its dock toggle id
  open: string; // the class its toggle sets when shown
}

const SLOTS: readonly Slot[] = [
  { name: 'AI', icon: '✦', panel: 'cqm-cop-panel', toggle: 'cqm-cop-toggle', open: 'open' },
  { name: 'HELP', icon: '❓', panel: 'cqm-help-panel', toggle: 'cqm-help-toggle', open: 'open' },
  { name: 'AUDIT', icon: '🗒', panel: 'aP', toggle: 'cqm-aud-toggle', open: 'audit-on' },
  { name: 'NEURAL', icon: '⊞', panel: 'cqm-nhi-panel', toggle: 'cqm-nhi-toggle', open: 'open' },
  { name: 'MARKET', icon: '⊙', panel: 'cqm-mkt-panel', toggle: 'cqm-mkt-toggle', open: 'open' },
  { name: 'ARCHITECT', icon: '⬢', panel: 'cqm-sup-panel', toggle: 'cqm-sup-toggle', open: 'open' },
];

const PANEL_SEL = SLOTS.map((s) => '#' + s.panel).join(',');

const STYLE = `
/* Centered, fit-to-window slot — every inspector panel snaps here when shown (same size, any aspect
   ratio). !important wins over each panel's own right/bottom/width regardless of selector specificity. */
${PANEL_SEL} {
  position: fixed !important;
  inset: auto !important;
  left: 50% !important;
  top: 50% !important;
  transform: translate(-50%, -50%) !important;
  width: min(94vw, 760px) !important;
  max-width: none !important;
  /* Centered, but bounded so it never touches the top nav strip (~58px) or the bottom dock (can wrap to
     2 rows ≈151px from the bottom) + toolbar: max-height leaves 310px total so it clears both even on
     short screens, capped at 780 on tall ones. */
  height: min(80vh, 780px) !important;
  max-height: calc(100vh - 310px) !important;
  z-index: 71 !important;
}
/* Transparent mode — peek at the simulation behind the HUD. */
body.cqm-hud-ghost ${PANEL_SEL.split(',')
  .map((s) => s + '.cqm-hud-vis')
  .join(',')} {
  opacity: 0.45;
}
/* The HUD chrome: a centered tab + cycle strip, just above the slot. */
#cqm-hud-nav {
  position: fixed;
  left: 50%;
  top: max(8px, 2vh);
  transform: translateX(-50%);
  z-index: 73;
  display: none;
  align-items: center;
  gap: 4px;
  max-width: calc(100vw - 16px);
  overflow-x: auto;
  scrollbar-width: thin;
  padding: 5px 8px;
  border-radius: 18px;
  border: 1px solid rgba(150, 180, 230, 0.3);
  background: rgba(8, 11, 22, 0.82);
  backdrop-filter: blur(10px);
  box-shadow: 0 6px 26px rgba(0, 0, 0, 0.6);
}
#cqm-hud-nav.on {
  display: flex;
}
.cqm-hud-btn {
  flex: 0 0 auto;
  height: 30px;
  min-width: 30px;
  padding: 0 9px;
  border-radius: 15px;
  border: 1px solid rgba(150, 180, 230, 0.22);
  background: rgba(16, 22, 38, 0.7);
  color: #cfe0fb;
  font: 600 11px/1 var(--font-mono, ui-monospace, monospace);
  letter-spacing: 0.06em;
  cursor: pointer;
  white-space: nowrap;
  transition:
    transform 0.12s,
    background 0.12s;
}
.cqm-hud-btn:hover {
  transform: scale(1.06);
  background: rgba(28, 38, 64, 0.9);
}
.cqm-hud-btn:focus-visible {
  outline: 2px solid #6aa6ff;
  outline-offset: 1px;
}
.cqm-hud-tab.active {
  background: rgba(60, 90, 160, 0.92);
  border-color: rgba(150, 190, 255, 0.85);
  color: #fff;
}
.cqm-hud-sep {
  width: 1px;
  height: 20px;
  background: rgba(150, 180, 230, 0.25);
  margin: 0 2px;
  flex: 0 0 auto;
}
`;

let active = -1; // index of the visible panel, or -1 when the HUD is closed
let busy = false; // re-entrancy guard while we drive sibling toggles
let nav: HTMLElement | null = null;
let tabs: HTMLButtonElement[] = [];

function panelEl(s: Slot): HTMLElement | null {
  return document.getElementById(s.panel);
}
function isOpen(s: Slot): boolean {
  const el = panelEl(s);
  return !!el && el.classList.contains(s.open);
}
/** Open/close a panel through its OWN dock toggle, so the panel's repaint logic runs. */
function drive(s: Slot, want: boolean): void {
  if (isOpen(s) === want) return;
  document.getElementById(s.toggle)?.click();
}

/** Make exactly panel `i` visible (or i<0 → close all). Marks the visible one for the ghost rule. */
function showOnly(i: number): void {
  busy = true;
  for (let j = 0; j < SLOTS.length; j++) {
    const sj = SLOTS[j];
    if (!sj) continue;
    drive(sj, j === i);
    panelEl(sj)?.classList.toggle('cqm-hud-vis', j === i);
  }
  busy = false;
  const si = i >= 0 ? SLOTS[i] : undefined;
  active = si && isOpen(si) ? i : -1;
  render();
}

function cycle(dir: number): void {
  const start = active < 0 ? (dir > 0 ? -1 : 0) : active;
  showOnly((start + dir + SLOTS.length) % SLOTS.length);
}

function render(): void {
  if (nav) nav.classList.toggle('on', active >= 0);
  tabs.forEach((t, i) => t.classList.toggle('active', i === active));
}

/** Build the chrome: ‹ prev · [tabs] · next › · ◐ transparency · ✕ close. */
function buildNav(doc: Document): void {
  doc.getElementById('cqm-hud-nav')?.remove();
  nav = doc.createElement('nav');
  nav.id = 'cqm-hud-nav';
  nav.setAttribute('aria-label', 'Center HUD — cycle panels');

  const mk = (label: string, title: string, cls: string, fn: () => void): HTMLButtonElement => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.className = 'cqm-hud-btn ' + cls;
    b.textContent = label;
    b.title = title;
    b.setAttribute('aria-label', title);
    b.addEventListener('click', fn);
    return b;
  };

  nav.appendChild(mk('‹', 'Previous panel', 'cqm-hud-prev', () => cycle(-1)));
  tabs = SLOTS.map((s, i) =>
    mk(s.icon + ' ' + s.name, s.name, 'cqm-hud-tab', () => showOnly(active === i ? -1 : i)),
  );
  tabs.forEach((t) => nav!.appendChild(t));
  nav.appendChild(mk('›', 'Next panel', 'cqm-hud-next', () => cycle(1)));
  const sep = doc.createElement('span');
  sep.className = 'cqm-hud-sep';
  nav.appendChild(sep);
  nav.appendChild(
    mk('◐', 'Toggle see-through (peek at the simulation)', 'cqm-hud-ghost-btn', () => {
      doc.body.classList.toggle('cqm-hud-ghost');
    }),
  );
  nav.appendChild(mk('✕', 'Close', 'cqm-hud-close', () => showOnly(-1)));
  doc.body.appendChild(nav);
}

/** Each dock toggle still opens "its" panel — but centered, and closing the others (single-open). */
function wireDockToggles(): void {
  SLOTS.forEach((s, i) => {
    const t = document.getElementById(s.toggle);
    if (!t || t.dataset['hudWired']) return;
    t.dataset['hudWired'] = '1';
    // Fires AFTER the panel's own toggle handler (added earlier at mount), so the panel has already
    // toggled itself; we read that result, close the others, and sync the chrome.
    t.addEventListener('click', () => {
      if (busy) return;
      busy = true;
      const nowOpen = isOpen(s);
      for (let j = 0; j < SLOTS.length; j++) {
        const sj = SLOTS[j];
        if (!sj) continue;
        if (j !== i) drive(sj, false);
        panelEl(sj)?.classList.toggle('cqm-hud-vis', j === i && nowOpen);
      }
      busy = false;
      active = nowOpen ? i : -1;
      render();
    });
  });
}

let started = false;
/** Idempotent init — call once after the six panels have mounted (end of main.ts boot). */
export function initCenterHud(doc: Document = document): void {
  if (started && doc.getElementById('cqm-hud-nav')) return;
  started = true;
  if (!doc.getElementById('cqm-hud-style')) {
    const style = doc.createElement('style');
    style.id = 'cqm-hud-style';
    style.textContent = STYLE;
    doc.head.appendChild(style);
  }
  buildNav(doc);
  wireDockToggles();
  // Close the HUD on Escape.
  doc.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && active >= 0) showOnly(-1);
  });
  render();
}

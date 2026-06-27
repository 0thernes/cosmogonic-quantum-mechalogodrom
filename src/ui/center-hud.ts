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
  // The ⟁ ARCHITECTURE pantheon cycler (101 super creatures + brood + the apex ς Quantum Brain).
  // Lives in the launcher next to ARCHITECT (its toggle is otherwise hidden — #cqm-dock is display:none).
  {
    name: 'ARCHITECTURE',
    icon: '⟁',
    panel: 'cqm-arch-panel',
    toggle: 'cqm-arch-toggle',
    open: 'open',
  },
];

const PANEL_SEL = SLOTS.map((s) => '#' + s.panel).join(',');
/** The open+visible panel selectors — the base (solid) opacity rule. */
const VIS_SEL = SLOTS.map((s) => '#' + s.panel + '.cqm-hud-vis').join(',');

const STYLE = `
/* V69: the HUD fits the grid's CENTRE column — between the side panels (Telemetry/Sorting on the left,
   Observatory/Control on the right) and ABOVE both bottom bars, so NOTHING overlaps and the ecosystem
   shows around it. The --cqm-hud-* vars are measured live from the real side-panel edges (see fitHud),
   with clamp() fallbacks that track the app.css grid columns when JS hasn't measured yet. Resizes +
   re-centres on every viewport change. !important wins over each panel's own right/bottom/width. */
${PANEL_SEL} {
  position: fixed !important;
  inset: auto !important;
  left: var(--cqm-hud-left, calc(clamp(180px, 19vw, 260px) + 16px)) !important;
  right: var(--cqm-hud-right, calc(clamp(220px, 23vw, 340px) + 16px)) !important;
  width: auto !important;
  max-width: none !important;
  transform: none !important;
  bottom: var(--cqm-hud-bottom, 96px) !important;
  top: auto !important;
  height: var(--cqm-hud-height, clamp(176px, 30vh, 380px)) !important;
  max-height: calc(100vh - 210px) !important;
  z-index: 71 !important;
}
/* TRANSPARENCY (◐): the open panel is SOLID by default. The see-through state is applied as an INLINE
   opacity !important on the active panel (see applyGhost) — inline !important beats ANY panel's own
   stylesheet opacity rule, so the toggle works uniformly for every panel (a stylesheet rule lost the
   specificity war against some panels' own CSS). NO opacity transition here — a couple of panels carry
   their own opacity transition that fought the toggle (it lagged / never settled), so the snap is
   instant + reliable. */
${VIS_SEL} {
  opacity: 1 !important;
}
/* The old 2nd dock bar is REDUNDANT — the always-on nav launcher below replaces it. Hide it. */
#cqm-dock {
  display: none !important;
}
/* The nav LAUNCHER: anchored to the SAME gap fitHud measures between the side panels
   (--cqm-hud-left / --cqm-hud-right), then it HUGS its content (width:max-content) and CENTRES in that
   gap via auto inline-margins — so the six tabs + Docs/Spec/Lab read dead-centre of the open play-area,
   the glass pill never spans empty space, and it can't reach the side panels or the corner readouts.
   chooseNavMode() measures the content against the live gap width and shows the named tabs only when
   they fit, else the clean ‹ CURRENT › cycler — so it never clips. */
#cqm-hud-nav {
  position: fixed;
  left: var(--cqm-hud-left, 8px);
  right: var(--cqm-hud-right, 8px);
  width: max-content;
  max-width: calc(100vw - 16px);
  margin-inline: auto;
  /* V79: 66px clears the #bar toolbar (bottom:6 + ~56px tall ⇒ its top sits ~62px off the bottom);
     the old 50px let the launcher pill sink ~12px INTO the toolbar on a short landscape window (the
     1920×1080 deploy) — the two glass bars overlapped. They now stack with a 4px gap. */
  bottom: var(--cqm-nav-bottom, 66px);
  z-index: 73;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
  gap: 3px;
  overflow: hidden;
  padding: 4px 7px;
  border-radius: 18px;
  border: 1px solid rgba(150, 180, 230, 0.32);
  background: rgba(8, 11, 22, 0.9);
  backdrop-filter: blur(12px);
  box-shadow: 0 6px 28px rgba(0, 0, 0, 0.66);
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
  letter-spacing: 0.05em;
  cursor: pointer;
  white-space: nowrap;
  transition:
    transform 0.12s,
    background 0.12s,
    border-color 0.12s;
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
.cqm-hud-ghost-btn.active {
  background: rgba(116, 86, 178, 0.92);
  border-color: rgba(190, 160, 255, 0.9);
  color: #fff;
}
.cqm-hud-sep {
  width: 1px;
  height: 20px;
  background: rgba(150, 180, 230, 0.25);
  margin: 0 3px;
  flex: 0 0 auto;
}
/* The cycler label — the DEFAULT launcher control (clean ‹ CURRENT › on most widths). */
.cqm-hud-label {
  display: inline-block;
  font: 700 12px/1 var(--font-mono, ui-monospace, monospace);
  color: #cfe0fb;
  padding: 0 8px;
  min-width: 116px;
  text-align: center;
  white-space: nowrap;
  letter-spacing: 0.08em;
}
/* The six labelled tabs are an ENHANCEMENT shown ONLY when they genuinely fit the centre column —
   chooseNavMode() measures the real fit live and toggles .cqm-hud-tabs, so they can NEVER clip or
   scroll; otherwise the clean ‹ CURRENT › cycler shows (also the default before JS runs / on touch). */
.cqm-hud-tab {
  display: none;
}
#cqm-hud-nav.cqm-hud-tabs .cqm-hud-tab {
  display: inline-flex;
  align-items: center;
}
/* Tabs mode packs up to nine controls into the centre band, so the buttons run a touch tighter than the
   roomy cycler — still comfortably clickable on the fine pointer this mode is gated to. Buys ~70px so
   the six NAMED tabs + Docs/Spec/Lab fit the gap at common desktop widths before any tier is dropped. */
#cqm-hud-nav.cqm-hud-tabs .cqm-hud-btn {
  padding: 0 6px;
  letter-spacing: 0.02em;
}
#cqm-hud-nav.cqm-hud-tabs .cqm-hud-sep {
  margin: 0 1px;
}
#cqm-hud-nav.cqm-hud-tabs .cqm-hud-label {
  display: none;
}
/* The secondary Docs/Spec/Lab links drop the moment the launcher would otherwise overflow its centre-
   column band — chooseNavMode() adds .cqm-hud-nolinks after MEASURING (covers the narrow-desktop band
   ~769-840px the fixed breakpoint missed), with a ≤520px fallback for the pre-JS frame. */
#cqm-hud-nav.cqm-hud-nolinks .cqm-hud-link {
  display: none;
}
/* V80c: DOCS / SPEC / LAB are flat in-flow buttons at the end of the centred launcher (the user's "just
   stick them in the dock, in the centre, like before" — reverts the V80 above-tabs stacking). The
   id-scoped position:static OVERRIDES their source 'fixed' utility so they can NEVER float back to the
   bottom-right corner; they stay visible in BOTH tabs + cycler mode and drop only on the genuinely-narrow
   tiers (the .cqm-hud-nolinks rule above + the ≤520px media below). */
#cqm-hud-nav .cqm-hud-link {
  position: static;
  display: inline-flex;
  align-items: center;
}
@media (max-width: 520px) {
  #cqm-hud-nav .cqm-hud-link {
    display: none;
  }
}
/* TOUCH: the launcher controls meet the ≥44px tap target the project's V3.4 contract mandates (the nav
   has no fixed height + centres its items, so it just grows; fitHud reads its live top for the inset). */
@media (pointer: coarse) {
  .cqm-hud-btn {
    min-height: 44px;
  }
  .cqm-hud-label {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
}
/* SMALL / portrait / touch — the app.css grid collapses to edge sheets, so the side columns are gone:
   the HUD spans (almost) full width + sits clear of the bars, still with the cycler. V78: the portrait
   term also requires (max-width: 1024px) to MATCH app.css — a WIDE fine-pointer portrait desktop
   (the user's 1440×2560 QHD) keeps the desktop grid + side panels, so the HUD must stay in the centre
   column there, NOT span full width (which would overlap the restored side panels). */
@media (max-width: 768px), (orientation: portrait) and (max-width: 1024px), (pointer: coarse) {
  ${PANEL_SEL} {
    left: 8px !important;
    right: 8px !important;
    bottom: var(--cqm-hud-bottom, 104px) !important;
    height: var(--cqm-hud-height, clamp(190px, 40vh, 540px)) !important;
    border-radius: 14px 14px 0 0 !important;
  }
  #cqm-hud-nav {
    left: 6px;
    right: 6px;
    bottom: var(--cqm-nav-bottom, 56px);
  }
}
`;

let active = -1; // index of the visible panel, or -1 when the HUD is closed
let busy = false; // re-entrancy guard while we drive sibling toggles
let nav: HTMLElement | null = null;
let tabs: HTMLButtonElement[] = [];
let label: HTMLElement | null = null; // V67: the mobile ‹ CURRENT › cycler label
let ghostOn = false; // V69: see-through (◐) state — applied inline to the active panel

/**
 * Apply the transparency state to the panels. The active+visible panel gets an INLINE `opacity:0.4
 * !important` when ghost is on (inline !important beats every panel's own stylesheet opacity, so it is
 * uniform); all others have the inline opacity cleared (falling back to the solid stylesheet rule).
 */
function applyGhost(): void {
  for (const s of SLOTS) {
    const el = panelEl(s);
    if (!el) continue;
    if (ghostOn && el.classList.contains('cqm-hud-vis')) {
      el.style.setProperty('opacity', '0.4', 'important');
    } else {
      el.style.removeProperty('opacity');
    }
  }
}

/** The six HUD panel ids — excluded from the side-column measurement so they never skew the fit. */
const HUD_IDS = new Set(SLOTS.map((s) => s.panel));
/** Breathing room (px) between the HUD and the side panels / bars. */
const GUTTER = 16;

/**
 * V69: measure the LIVE layout and pin the HUD + nav to fit EXACTLY inside the grid's centre column
 * (between the real side panels) and just above the bars — re-run on every resize so it adapts in
 * real time. When the grid has collapsed to edge-sheets (mobile/portrait/touch) the side columns are
 * gone, so we clear the horizontal vars and let the CSS media query own the (near full-width) layout.
 * Pure DOM measurement, no rng, no sim coupling.
 */
function fitHud(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const ui = document.getElementById('ui');
  const sheetMode =
    typeof matchMedia === 'function' &&
    matchMedia(
      '(max-width: 768px), (orientation: portrait) and (max-width: 1024px), (pointer: coarse)',
    ).matches;
  if (sheetMode || !ui || getComputedStyle(ui).display !== 'grid') {
    root.style.removeProperty('--cqm-hud-left');
    root.style.removeProperty('--cqm-hud-right');
  } else {
    const vw = window.innerWidth;
    const mid = vw / 2;
    let leftR = 0; // right edge of the left column (Telemetry / Sorting Fields)
    let rightL = vw; // left edge of the right column (Observatory / Control)
    for (const el of Array.from(ui.children)) {
      if (!(el instanceof HTMLElement) || HUD_IDS.has(el.id)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue; // hidden / zero-box
      if (r.right <= mid) leftR = Math.max(leftR, r.right);
      else if (r.left >= mid) rightL = Math.min(rightL, r.left);
    }
    root.style.setProperty('--cqm-hud-left', `${Math.round((leftR > 0 ? leftR : 0) + GUTTER)}px`);
    root.style.setProperty(
      '--cqm-hud-right',
      `${Math.round((rightL < vw ? vw - rightL : 0) + GUTTER)}px`,
    );
  }
  // Vertical: sit the HUD just above the HIGHEST bar (nav launcher / toolbar) — adapts if a bar grows.
  const vh = window.innerHeight;
  let barsTop = vh;
  for (const id of ['cqm-hud-nav', 'bar']) {
    const el = document.getElementById(id);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.height > 4) barsTop = Math.min(barsTop, r.top);
  }
  if (barsTop < vh)
    root.style.setProperty('--cqm-hud-bottom', `${Math.round(vh - barsTop + 10)}px`);
  else root.style.removeProperty('--cqm-hud-bottom');
  chooseNavMode();
}

/**
 * V70: the GAP the nav may occupy — the centre band between the side panels, read from the very vars
 * fitHud just measured (defaults to near-full width before they're set / on mobile). The nav hugs its
 * content (width:max-content), so we compare its natural content width to THIS, not to its own box.
 */
function navGapWidth(): number {
  const cs = getComputedStyle(document.documentElement);
  const L = parseFloat(cs.getPropertyValue('--cqm-hud-left')) || 8;
  const R = parseFloat(cs.getPropertyValue('--cqm-hud-right')) || 8;
  return Math.max(120, window.innerWidth - L - R);
}

/**
 * V69/V70: pick the WIDEST launcher layout that still fits the live gap between the side panels —
 * measured live (the nav is content-hugging, so scrollWidth === its natural width), so it can never
 * clip or scroll. Three graceful tiers on fine-pointer landscape, narrowest-loses:
 *   1. six NAMED tabs + the Docs/Spec/Lab links,
 *   2. six NAMED tabs alone (drop the secondary links first — names matter more),
 *   3. the clean ‹ CURRENT › cycler (touch / portrait / a very narrow centre column always land here).
 * Even the cycler drops its links if the column is impossibly tight, so the core controls never clip.
 */
function chooseNavMode(): void {
  if (!nav) return;
  const gap = navGapWidth();
  const fineLandscape =
    typeof matchMedia === 'function' &&
    matchMedia('(pointer: fine) and (orientation: landscape)').matches;
  if (fineLandscape) {
    nav.classList.add('cqm-hud-tabs');
    nav.classList.remove('cqm-hud-nolinks'); // tier 1: tabs + links
    if (nav.scrollWidth <= gap) return;
    nav.classList.add('cqm-hud-nolinks'); // tier 2: tabs, no links
    if (nav.scrollWidth <= gap) return;
    nav.classList.remove('cqm-hud-tabs'); // tier 3: cycler
  } else {
    nav.classList.remove('cqm-hud-tabs');
  }
  nav.classList.remove('cqm-hud-nolinks'); // cycler with links…
  if (nav.scrollWidth > gap) nav.classList.add('cqm-hud-nolinks'); // …unless even that won't fit
}

let fitScheduled = false;
/** rAF-debounced {@link fitHud} — cheap to call from resize / open / orientation events. */
function scheduleFit(): void {
  if (fitScheduled || typeof requestAnimationFrame !== 'function') return;
  fitScheduled = true;
  requestAnimationFrame(() => {
    fitScheduled = false;
    fitHud();
  });
}

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
  // V67: the nav strip is ALWAYS visible (it's the launcher). Highlight the active tab, flag the
  // open state for the readout-hide rule, and update the mobile cycler label.
  tabs.forEach((t, i) => t.classList.toggle('active', i === active));
  document.body.classList.toggle('cqm-hud-open', active >= 0);
  if (label) {
    const s = active >= 0 ? SLOTS[active] : undefined;
    label.textContent = s ? `${s.icon} ${s.name}` : '⊕ PANELS';
  }
  applyGhost(); // V69: carry the see-through state onto the newly-active panel (clear it off the rest)
  scheduleFit(); // re-fit the centre-column slot whenever the HUD state changes
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
  // V67: the mobile cycler label (sits between the tabs and the › arrow; shown only on small screens).
  label = doc.createElement('span');
  label.className = 'cqm-hud-label';
  label.textContent = '⊕ PANELS';
  nav.appendChild(label);
  nav.appendChild(mk('›', 'Next panel', 'cqm-hud-next', () => cycle(1)));
  const sep = doc.createElement('span');
  sep.className = 'cqm-hud-sep';
  nav.appendChild(sep);
  // ◐ transparency — toggles see-through AND reflects its own pressed state (the V69 toggle fix).
  const ghostBtn = mk(
    '◐',
    'Toggle see-through (peek at the simulation behind the HUD)',
    'cqm-hud-ghost-btn',
    () => {
      ghostOn = !ghostOn;
      doc.body.classList.toggle('cqm-hud-ghost', ghostOn);
      ghostBtn.classList.toggle('active', ghostOn);
      ghostBtn.setAttribute('aria-pressed', String(ghostOn));
      applyGhost();
    },
  );
  ghostBtn.classList.toggle('active', ghostOn); // reflect state across HMR rebuilds
  ghostBtn.setAttribute('aria-pressed', String(ghostOn));
  nav.appendChild(ghostBtn);
  nav.appendChild(mk('✕', 'Close', 'cqm-hud-close', () => showOnly(-1)));
  // V80c: DOCS / SPEC / LAB as flat in-flow buttons at the end of the centred launcher — the user's
  // "just stick them in the dock, in the centre, like before". CSS forces them position:static so they
  // can NEVER float back to their source bottom-right corner (their `fixed` utility otherwise wins).
  const lsep = doc.createElement('span');
  lsep.className = 'cqm-hud-sep';
  nav.appendChild(lsep);
  // Adopt by `data-nav` (NOT href): build-pages.ts rewrites the absolute /docs /spec /lab hrefs to
  // subpath-relative for the GitHub Pages deploy, so the old href query matched NOTHING there — the links
  // were never pulled into the launcher and stayed stranded in their source bottom-right corner (the bug
  // the user kept reporting). The data-nav attribute survives the rewrite, so the dock gets them on Pages
  // too. center-hud is now their single owner (panel-dock.ts no longer competes for these nodes).
  for (const key of ['docs', 'spec', 'lab']) {
    const a = doc.querySelector<HTMLAnchorElement>(`a[data-nav="${key}"]`);
    if (a) {
      a.classList.add('cqm-hud-btn', 'cqm-hud-link');
      nav.appendChild(a);
    }
  }
  // ⛓ ACCESS — the cryptographic terminal (access-puzzle.ts: "only the Romans know" 3455456754) that
  // unlocks the playable 2nd super creature. Its self-mounted toggle is buried in the hidden #cqm-dock
  // (display:none), so it was invisible (the owner's "secret password isn't showing up" report). We add
  // a FRESH launcher button here that opens it — created anew each buildNav, so it survives HMR re-init
  // (moving the dock node would lose it when the old nav is removed). The modal lives outside the HUD.
  const accToggle = doc.getElementById('cqm-acc-toggle');
  if (accToggle) {
    nav.appendChild(
      mk(
        '⛓ ACCESS',
        'Cryptographic access terminal — unlock the playable super creature ("only the Romans know")',
        'cqm-hud-link',
        () => accToggle.click(),
      ),
    );
  }
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

/** Escape closes the HUD. Named so HMR can cleanly remove the OLD module's binding on hot-replace. */
function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && active >= 0) showOnly(-1);
}

/**
 * Build (or REBUILD) the HUD chrome. Idempotent + hot-reload-safe: it ALWAYS replaces its stylesheet
 * and rebuilds the nav, and re-binds its listeners cleanly (remove-then-add) — so edits to this module
 * apply in the dev browser without a full page reload. (The old guard skipped re-injecting the style
 * when one already existed, which left hot-reloads showing the STALE layout — the bug the user hit.)
 * Call after the six panels have mounted (end of main.ts boot).
 */
export function initCenterHud(doc: Document = document): void {
  doc.getElementById('cqm-hud-style')?.remove();
  const style = doc.createElement('style');
  style.id = 'cqm-hud-style';
  style.textContent = STYLE;
  doc.head.appendChild(style);
  buildNav(doc); // removes the old nav + rebuilds with the current code
  wireDockToggles(); // dataset-guarded: binds each toggle once
  doc.removeEventListener('keydown', onKeydown);
  doc.addEventListener('keydown', onKeydown);
  // V69: keep the centre-column fit live — re-measure on resize / orientation change (re-bound cleanly
  // so a hot-reload never stacks duplicate listeners).
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', scheduleFit);
    window.removeEventListener('orientationchange', scheduleFit);
    window.addEventListener('resize', scheduleFit);
    window.addEventListener('orientationchange', scheduleFit);
  }
  render();
  // V74: fit SYNCHRONOUSLY here (not only via the rAF-debounced scheduleFit) so the centre-column vars
  // are set + the named tabs chosen on this very frame. The panels are already mounted + laid out by the
  // time main.ts calls this, so getBoundingClientRect measures correctly. Without it, the launcher stays
  // on the ‹ CURRENT › cycler until the next animation frame — and under heavy HMR churn (a co-editor
  // saving repeatedly) that frame can be starved by back-to-back reboots, leaving it stuck on the cycler.
  fitHud();
}

// HMR — hot-replace the HUD IN PLACE (re-inject the new CSS + rebuild the nav) without a full page
// reload or a costly main.ts re-boot, so center-HUD edits actually reach the running browser. Bun makes
// `import.meta.hot` a getter that throws if aliased, so it is touched INLINE here.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', scheduleFit);
      window.removeEventListener('orientationchange', scheduleFit);
    }
    if (typeof document !== 'undefined') document.removeEventListener('keydown', onKeydown);
  });
  import.meta.hot.accept();
  // On a hot UPDATE the nav already exists → re-init with the new code now; on the FIRST import it does
  // not (main.ts calls initCenterHud after the panels mount), so we don't double-build at startup.
  if (typeof document !== 'undefined' && document.getElementById('cqm-hud-nav')) initCenterHud();
}

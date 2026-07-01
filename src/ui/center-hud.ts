/**
 * CENTER HUD (V56) — unifies the six inspector panels (✦ AI · ❓ HELP · 🗒 AUDIT · ⊞ NEURAL · ⊙ MARKET ·
 * ⬢ ARCHITECT) into ONE same-size, fit-to-window pop-up CENTERED on screen that you CYCLE through (the
 * ‹ › arrows or the tab strip) instead of tap-close-tap-open. A ◐ button fades it transparent so you can
 * see the simulation behind it; ✕ closes. It fits any aspect ratio + works on touch — the slot is a
 * tall readable centre column, not the old shallow strip. This also permanently fixes "NEURAL overlaps
 * the menu bars": nothing opens at the bottom anymore.
 *
 * It does NOT rewrite the six panels — it drives each one's EXISTING dock toggle (so the panel's own
 * open/close + repaint logic runs), re-homes them to a centered `!important` slot, and enforces
 * one-open-at-a-time. UI shell only; no sim coupling, no rng.
 */
import { dockBottomBar, syncBottomDockHeight, reorderBottomDock } from './bottom-dock';

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

/** Desktop/fine-pointer center HUD height: tall enough for Architecture/Architect data, still bounded. */
export const CENTER_HUD_DESKTOP_HEIGHT = 'clamp(300px, 56vh, 660px)';
/** Touch/sheet-mode center HUD height: lets popups breathe without covering the full world. */
export const CENTER_HUD_TOUCH_HEIGHT = 'clamp(320px, 64vh, 720px)';

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
  bottom: var(--cqm-hud-bottom, calc(var(--cqm-bottom-h, 108px) + 130px)) !important;
  top: var(--cqm-hud-top, auto) !important;
  height: min(var(--cqm-hud-height, ${CENTER_HUD_DESKTOP_HEIGHT}), var(--cqm-hud-max-height, calc(100vh - 156px))) !important;
  max-height: var(--cqm-hud-max-height, calc(100vh - 156px)) !important;
  z-index: 71 !important;
}
/* Desktop / landscape grid: anchor panels from the TOP so fullscreen never clips above the viewport. */
html[data-cqm-hud-anchor='top'] ${PANEL_SEL} {
  top: var(--cqm-hud-top, 52px) !important;
  bottom: auto !important;
  height: var(--cqm-hud-max-height, calc(100vh - 156px)) !important;
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
.cqm-hud-panel-chrome {
  position: absolute;
  top: 8px;
  right: 10px;
  z-index: 100;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  pointer-events: auto;
  padding: 4px 6px;
  border-radius: 10px;
  background: rgba(10, 8, 24, 0.92);
  border: 1px solid rgba(160, 190, 255, 0.28);
  box-shadow: 0 2px 12px rgba(0,0,0,.5);
}
.cqm-hud-panel-chrome button {
  width: 28px;
  height: 26px;
  border-radius: 7px;
  border: 1px solid rgba(160, 190, 255, 0.34);
  background: rgba(6, 10, 24, 0.82);
  color: #e9f1ff;
  font: 800 12px/1 var(--font-mono, ui-monospace, monospace);
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0,0,0,.45);
  transition: background .12s, border-color .12s, transform .12s;
}
.cqm-hud-panel-chrome button:hover {
  background: rgba(45, 65, 120, 0.95);
  border-color: rgba(160, 210, 255, 0.85);
  transform: translateY(-1px);
}
/* V84: panel toggles cycle through the center HUD — hide them from the legacy dock bar (settings +
   access live in the HUD launcher instead). The dock itself stays hidden when the HUD nav is active. */
#cqm-dock > #cqm-cop-toggle,
#cqm-dock > #cqm-help-toggle,
#cqm-dock > #cqm-aud-toggle,
#cqm-dock > #cqm-nhi-toggle,
#cqm-dock > #cqm-mkt-toggle,
#cqm-dock > #cqm-sup-toggle,
#cqm-dock > #cqm-arch-toggle,
#cqm-dock > #cqm-settings-toggle,
#cqm-dock > #cqm-acc-toggle,
#cqm-dock > a.cqm-dock-nav {
  display: none !important;
}
body:has(#cqm-hud-nav) #cqm-dock {
  display: none !important;
}
/* The nav LAUNCHER: anchored to the SAME gap fitHud measures between the side panels
   (--cqm-hud-left / --cqm-hud-right), then it HUGS its content (width:max-content) and CENTRES in that
   gap via auto inline-margins — so the six tabs + Docs/Spec/Lab read dead-centre of the open play-area,
   the glass pill never spans empty space, and it can't reach the side panels or the corner readouts.
   chooseNavMode() measures the content against the live gap width and shows the named tabs only when
   they fit, else the clean ‹ CURRENT › cycler — so it never clips. */
#cqm-hud-nav {
  position: static;
  width: max-content;
  max-width: calc(100vw - 16px);
  margin-inline: auto;
  bottom: auto;
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
/* V85: persistent Docs/Spec/Lab/Access/Set — lives in #cqm-bottom-stack (app.css), never hidden. */
#cqm-persist-nav {
  position: static;
  transform: none;
  bottom: auto;
  left: auto;
  z-index: auto;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
  gap: 4px;
  max-width: calc(100vw - 12px);
  padding: 4px 10px;
  border-radius: 18px;
  border: 1px solid rgba(120, 160, 220, 0.38);
  background: rgba(6, 10, 22, 0.94);
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.55);
  pointer-events: auto;
}
#cqm-persist-nav .cqm-persist-btn {
  position: static;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  padding: 0 11px;
  border-radius: 15px;
  border: 1px solid rgba(120, 160, 220, 0.32);
  background: rgba(14, 22, 42, 0.88);
  color: #cfe0fb;
  font: 600 12px/1 var(--font-mono, ui-monospace, monospace);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition:
    transform 0.12s,
    background 0.12s,
    border-color 0.12s;
}
#cqm-persist-nav .cqm-persist-btn:hover {
  transform: scale(1.05);
  background: rgba(28, 40, 72, 0.95);
  border-color: rgba(150, 190, 255, 0.55);
}
#cqm-persist-nav .cqm-persist-btn[data-nav='spec'] {
  border-color: rgba(220, 120, 255, 0.35);
  color: #f0c8ff;
}
#cqm-persist-nav .cqm-persist-btn.cqm-persist-sim {
  border-color: rgba(255, 160, 80, 0.42);
  color: #ffd4a8;
  padding: 0 8px;
  font-size: 11px;
}
#cqm-persist-nav .cqm-persist-btn.cqm-persist-transport {
  border-color: rgba(100, 220, 180, 0.38);
  color: #b8f5dc;
  padding: 0 8px;
}
#cqm-persist-nav .cqm-persist-btn:focus-visible {
  outline: 2px solid rgba(120, 180, 255, 0.75);
  outline-offset: 1px;
}
/* V108: 3-row dock layout. Rows stack vertically; each row is a centred horizontal band. */
#cqm-persist-nav.cqm-persist-rows {
  flex-direction: column;
  gap: 3px;
}
#cqm-persist-nav .cqm-persist-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-wrap: wrap;
  width: 100%;
}
#cqm-persist-nav .cqm-persist-row--sim,
#cqm-persist-nav .cqm-persist-row--panels {
  max-width: min(100%, 760px);
}
#cqm-persist-nav .cqm-persist-row--sim .cqm-persist-btn,
#cqm-persist-nav .cqm-persist-row--panels .cqm-persist-btn,
#cqm-persist-nav .cqm-persist-panel {
  height: 28px;
  padding-inline: 8px;
  font-size: 11px;
  letter-spacing: 0.04em;
}
#cqm-persist-nav .cqm-persist-row--docs .cqm-persist-btn {
  border-color: rgba(120, 160, 220, 0.32);
}
#cqm-persist-nav .cqm-persist-row--panels .cqm-persist-btn,
#cqm-persist-nav .cqm-persist-row--docs .cqm-persist-panel,
#cqm-persist-nav .cqm-persist-panel {
  border-color: rgba(180, 120, 255, 0.42);
}
#cqm-persist-nav .cqm-persist-row--sim .cqm-persist-btn {
  border-color: rgba(255, 160, 80, 0.38);
}
#cqm-persist-nav .cqm-persist-row--sim .cqm-persist-transport {
  border-color: rgba(100, 220, 180, 0.38);
}
#cqm-persist-nav .cqm-persist-audio {
  border-color: rgba(255, 100, 120, 0.38);
  color: #ff9aa5;
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
    top: auto !important;
    bottom: var(--cqm-hud-bottom, calc(var(--cqm-bottom-h, 108px) + 130px)) !important;
    height: var(--cqm-hud-height, ${CENTER_HUD_TOUCH_HEIGHT}) !important;
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
    const leftCol = document.getElementById('ui-col-left');
    const rightCol = document.getElementById('ui-col-right');
    if (leftCol) {
      const r = leftCol.getBoundingClientRect();
      if (r.width > 8) leftR = Math.max(leftR, r.right);
    }
    if (rightCol) {
      const r = rightCol.getBoundingClientRect();
      if (r.width > 8) rightL = Math.min(rightL, r.left);
    }
    for (const el of Array.from(ui.children)) {
      if (!(el instanceof HTMLElement) || HUD_IDS.has(el.id)) continue;
      if (el.id === 'ui-col-left' || el.id === 'ui-col-right') continue;
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
  // Vertical: sit the HUD just above the HIGHEST bar (nav launcher / toolbar / readout strip).
  const vh = window.innerHeight;
  let barsTop = vh;
  for (const id of ['perf-hud', 'hud-vsr', 'alg', 'cqm-bottom-stack']) {
    const el = document.getElementById(id);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.height > 4) barsTop = Math.min(barsTop, r.top);
  }
  syncBottomDockHeight();
  const fs = typeof document !== 'undefined' && !!document.fullscreenElement;
  const topInset = fs ? 10 : 52;
  const bottomPx = barsTop < vh ? Math.round(vh - barsTop + 10) : 130;
  const maxH = Math.max(120, Math.min(barsTop - topInset - 14, vh - topInset - bottomPx - 8));
  root.style.setProperty('--cqm-hud-max-height', `${Math.round(maxH)}px`);
  if (sheetMode) {
    root.dataset.cqmHudAnchor = 'bottom';
    root.style.removeProperty('--cqm-hud-top');
  } else {
    root.dataset.cqmHudAnchor = 'top';
    root.style.setProperty('--cqm-hud-top', `${topInset}px`);
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

function ensurePanelChrome(el: HTMLElement, index: number): void {
  if (el.querySelector('.cqm-hud-panel-chrome')) return;
  const chrome = document.createElement('div');
  chrome.className = 'cqm-hud-panel-chrome';
  const mk = (label: string, title: string, fn: () => void): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.title = title;
    b.setAttribute('aria-label', title);
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      fn();
    });
    return b;
  };
  chrome.append(
    mk('‹', 'Previous panel', () => showOnly((index - 1 + SLOTS.length) % SLOTS.length)),
    mk('›', 'Next panel', () => showOnly((index + 1) % SLOTS.length)),
    mk('_', 'Minimize panel', () => showOnly(-1)),
    mk('✕', 'Close panel', () => showOnly(-1)),
  );
  el.appendChild(chrome);
}

/** Make exactly panel `i` visible (or i<0 → close all). Marks the visible one for the ghost rule. */
function showOnly(i: number): void {
  busy = true;
  for (let j = 0; j < SLOTS.length; j++) {
    const sj = SLOTS[j];
    if (!sj) continue;
    const el = panelEl(sj);
    if (el) ensurePanelChrome(el, j);
    drive(sj, j === i);
    el?.classList.toggle('cqm-hud-vis', j === i);
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
  nav.appendChild(mk('−', 'Minimize current panel', 'cqm-hud-min', () => showOnly(-1)));
  nav.appendChild(mk('✕', 'Close', 'cqm-hud-close', () => showOnly(-1)));
  doc.body.appendChild(nav);
  dockBottomBar(nav, doc);
}

/** V85/V111: always-visible dock. Row 1: docs/access/settings. Row 2: sim/gameplay.
 *  Row 3: direct panel launchers. Toolbar still carries transport/audio/view controls. */
function buildPersistentNav(doc: Document): void {
  let strip = doc.getElementById('cqm-persist-nav');
  if (!strip) {
    strip = doc.createElement('nav');
    strip.id = 'cqm-persist-nav';
    strip.setAttribute('aria-label', 'Documentation, lab, simulation controls, and settings');
  } else {
    strip.replaceChildren();
  }
  strip.removeAttribute('hidden');
  strip.classList.add('cqm-persist-rows');

  const mkBtn = (label: string, title: string, fn: () => void, extra = ''): HTMLButtonElement => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.className = 'cqm-persist-btn' + (extra ? ' ' + extra : '');
    b.textContent = label;
    b.title = title;
    b.setAttribute('aria-label', title);
    b.addEventListener('click', fn);
    return b;
  };

  const mkAct = (label: string, title: string, action: string, extra = ''): HTMLButtonElement => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.className = 'cqm-persist-btn' + (extra ? ' ' + extra : '');
    b.dataset.action = action;
    b.textContent = label;
    b.title = title;
    b.setAttribute('aria-label', title);
    return b;
  };

  const mkRow = (cls = ''): HTMLElement => {
    const row = doc.createElement('div');
    row.className = 'cqm-persist-row' + (cls ? ' ' + cls : '');
    return row;
  };

  const rowDocs = mkRow('cqm-persist-row--docs');
  for (const key of ['docs', 'spec', 'bible', 'lab']) {
    const a = doc.querySelector<HTMLAnchorElement>(`a[data-nav="${key}"]`);
    if (a) {
      a.classList.add('cqm-persist-btn');
      rowDocs.appendChild(a);
    }
  }
  const accToggle = doc.getElementById('cqm-acc-toggle');
  if (accToggle) {
    rowDocs.appendChild(
      mkBtn('⛓ ACCESS', 'Cryptographic access terminal — unlock the playable super creature', () =>
        accToggle.click(),
      ),
    );
  }
  rowDocs.appendChild(
    mkBtn('⚙ SET', 'Simulation settings', () => {
      const w = doc.defaultView as typeof window & { cqmToggleSettings?: () => void };
      if (typeof w?.cqmToggleSettings === 'function') {
        w.cqmToggleSettings();
      } else {
        const toggleBtn = doc.getElementById('cqm-settings-toggle');
        toggleBtn?.click();
      }
    }),
  );
  // De-dup (owner UX): MUTE + PAUSE live in the green bottom toolbar (index.html #bar) ONLY — they were
  // duplicated here. Removed from this row so each control appears exactly once (both docks showed them).
  // V112: panel launchers are direct children of the docs/access row so each button sits
  // next to ACCESS. They wrap naturally; the row's max-width keeps them centred.
  const rowSim = mkRow('cqm-persist-row--sim');
  // De-dup (owner UX): ENV/SING/RENDER/N1-N2/ENT/CHAOS/APOC/NHI all live in the green bottom toolbar
  // (index.html #bar) — removed from this row to kill the duplicate copies. Only the spawn/mutate
  // actions that are NOT on the bottom toolbar remain here, so nothing becomes unreachable.
  for (const [action, label, title, extra] of [
    ['split', '⇄ SPLIT', 'Split mature entities', 'cqm-persist-sim'],
    ['burst', '✦ BURST', 'Burst-spawn entities', 'cqm-persist-sim'],
    ['mutate', '☢ MUTATE', 'Mutate all entities', 'cqm-persist-sim'],
    ['chaos', '⚡ CHAOS+', 'Boost chaos', 'cqm-persist-sim'],
  ] as const) {
    rowSim.appendChild(mkAct(label, title, action, extra));
  }
  strip.appendChild(rowSim);

  const panelLabels = [
    'COPILOT AI LLM',
    'HELP ME NOW',
    'AUDIT',
    'NHI OBS',
    'MARKET',
    'ARCHON GODFORMS',
    'PANTHEONS',
  ] as const;
  for (let i = 0; i < SLOTS.length; i++) {
    const s = SLOTS[i];
    if (!s) continue;
    rowDocs.appendChild(
      mkBtn(
        panelLabels[i] ?? s.name,
        `Open ${panelLabels[i] ?? s.name}`,
        () => showOnly(active === i ? -1 : i),
        'cqm-persist-panel',
      ),
    );
  }
  // USER: the standalone APEX button was REMOVED — it was redundant with the PANTHEONS (⟁ ARCHITECTURE)
  // panel, which already cycles the apex ς Quantum Brain through its own in-panel tabs. One launcher per
  // panel; APEX is reached via PANTHEONS.
  strip.appendChild(rowDocs);

  if (!strip.parentElement) doc.body.appendChild(strip);
  dockBottomBar(strip, doc);
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
        const el = panelEl(sj);
        if (el) ensurePanelChrome(el, j);
        el?.classList.toggle('cqm-hud-vis', j === i && nowOpen);
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

/** The green-bottom PANEL button dispatches `cqm:open-master-panel` (world.ts → openMasterPanel), but
 *  NOTHING listened for it, so the button did nothing. Wire it here: toggle the centre-HUD panel cycler
 *  open on the first panel. Named so HMR can cleanly remove the OLD binding on hot-replace. */
function onOpenMasterPanel(): void {
  showOnly(active < 0 ? 0 : -1);
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
  buildNav(doc);
  buildPersistentNav(doc);
  reorderBottomDock(doc);
  wireDockToggles();
  doc.removeEventListener('keydown', onKeydown);
  doc.addEventListener('keydown', onKeydown);
  if (typeof window !== 'undefined') {
    // Make the green-bottom PANEL button actually work: open the panel cycler when openMasterPanel fires.
    window.removeEventListener('cqm:open-master-panel', onOpenMasterPanel);
    window.addEventListener('cqm:open-master-panel', onOpenMasterPanel);
  }
  // V69: keep the centre-column fit live — re-measure on resize / orientation change (re-bound cleanly
  // so a hot-reload never stacks duplicate listeners).
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', scheduleFit);
    window.removeEventListener('orientationchange', scheduleFit);
    document.removeEventListener('fullscreenchange', scheduleFit);
    window.addEventListener('resize', scheduleFit);
    window.addEventListener('orientationchange', scheduleFit);
    document.addEventListener('fullscreenchange', scheduleFit);
  }
  render();
  // V74: fit SYNCHRONOUSLY here (not only via the rAF-debounced scheduleFit) so the centre-column vars
  // are set + the named tabs chosen on this very frame. The panels are already mounted + laid out by the
  // time main.ts calls this, so getBoundingClientRect measures correctly. Without it, the launcher stays
  // on the ‹ CURRENT › cycler until the next animation frame — and under heavy HMR churn (a co-editor
  // saving repeatedly) that frame can be starved by back-to-back reboots, leaving it stuck on the cycler.
  fitHud();
  syncBottomDockHeight();
}

// HMR — hot-replace the HUD IN PLACE (re-inject the new CSS + rebuild the nav) without a full page
// reload or a costly main.ts re-boot, so center-HUD edits actually reach the running browser. Bun makes
// `import.meta.hot` a getter that throws if aliased, so it is touched INLINE here.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', scheduleFit);
      window.removeEventListener('orientationchange', scheduleFit);
      document.removeEventListener('fullscreenchange', scheduleFit);
    }
    if (typeof document !== 'undefined') document.removeEventListener('keydown', onKeydown);
  });
  import.meta.hot.accept();
  // On a hot UPDATE the nav already exists → re-init with the new code now; on the FIRST import it does
  // not (main.ts calls initCenterHud after the panels mount), so we don't double-build at startup.
  if (typeof document !== 'undefined' && document.getElementById('cqm-hud-nav')) initCenterHud();
}

/**
 * The PANEL DOCK (V33) — one self-mounting bottom-right MENU BAR that every floating inspector toggle
 * lives in, instead of four buttons scattered at different `right:` offsets (which crowded the corner
 * and overlapped the Docs/Spec links + the ✦ AI toggle). Each panel calls {@link mountToggle} with its
 * toggle button; the dock lazily builds one glass bar, neutralises the button's own fixed positioning
 * (a CSS override that keeps its styling), and lays them out in a tidy wrapping row. (The DOCS/SPEC/LAB
 * nav links USED to be adopted here too, but center-hud.ts is now their single owner.) UI shell only —
 * no sim coupling, no rng.
 *
 * Why a shared bar: the directive's UI/UX fix — "move ARCHITECT, NEURAL, MARKET, DOCS, and SPECS into
 * the bottom menu bar … keep panels readable, touchable, responsive, and intentional."
 */
const DOCK_ID = 'cqm-dock';

const STYLE = `
/* V71: ONE long, centered, SINGLE-ROW menu bar above the toolbar (#bar) — no more 2-row wrap that
   made it lopsided + ate vertical space. nowrap keeps it a tidy single line (it fits ~10 named
   controls on any normal width); if a narrow window can't hold it, it scrolls horizontally instead of
   wrapping. justify-content:center keeps the whole row — toggles AND the Docs/Spec/Lab links —
   centered as one balanced group (fixes "DOCS SPEC LAB not centered"). */
#${DOCK_ID}{position:fixed;left:50%;transform:translateX(-50%);bottom:62px;z-index:60;display:flex;
  align-items:center;gap:5px;flex-wrap:nowrap;justify-content:center;max-width:calc(100vw - 16px);
  overflow-x:auto;overflow-y:hidden;scrollbar-width:thin;
  padding:4px 9px;border-radius:24px;border:1px solid rgba(120,150,210,.24);background:rgba(8,11,20,.7);
  backdrop-filter:blur(10px);box-shadow:0 4px 22px rgba(0,0,0,.55)}
/* Neutralise each child's own fixed positioning so the flex bar lays them out (styling is preserved). */
#${DOCK_ID} > button{position:static!important;inset:auto!important;margin:0!important;flex:0 0 auto}
/* V53 mobile: on small/portrait/touch viewports the 10 toggles wrapped to ~6 rows (~323px tall) and
   ate ~40% of the screen — and the pop-up panels opened INSIDE that band. Make the dock a single
   COMPACT horizontally-scrollable row (a standard mobile tab-bar), so it stays ~52px and the panels
   above it (bottom:128) clear it. Swipe to reach every control. */
@media (max-width: 768px), (orientation: portrait), (pointer: coarse) {
  #${DOCK_ID}{flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;justify-content:flex-start;
    max-width:calc(100vw - 12px);scrollbar-width:thin;-webkit-overflow-scrolling:touch}
  #${DOCK_ID} > *{flex:0 0 auto}
}
`;

/** Lazily build (or fetch) the dock bar, adopting the standalone Docs + Spec nav links the first time. */
export function getDock(doc: Document = document): HTMLElement {
  const existing = doc.getElementById(DOCK_ID);
  if (existing) return existing;
  const style = doc.createElement('style');
  style.id = DOCK_ID + '-style';
  style.textContent = STYLE;
  doc.head.appendChild(style);
  const dock = doc.createElement('nav');
  dock.id = DOCK_ID;
  dock.setAttribute('aria-label', 'Panel and navigation dock');
  doc.body.appendChild(dock);
  // NOTE: the DOCS / SPEC / LAB nav links are NOT adopted here anymore — the center-HUD launcher
  // (center-hud.ts) is their SINGLE owner. It adopts them by the rewrite-proof `data-nav` attribute
  // (the old `a.fixed[href="/docs"]` selector silently failed on the deployed Pages site, where
  // build-pages.ts rewrites the absolute hrefs to subpath-relative — stranding the links in the
  // bottom-right corner). A second owner here would just race for the same nodes; this dock now holds
  // ONLY the panel toggles (which center-hud drives, hidden behind the launcher).
  return dock;
}

/** Move a panel's toggle button into the shared dock bar (creating the bar on the first call). */
export function mountToggle(toggle: HTMLElement, doc: Document = document): void {
  getDock(doc).appendChild(toggle);
}

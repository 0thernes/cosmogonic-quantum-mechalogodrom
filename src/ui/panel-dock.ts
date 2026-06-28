/**
 * The PANEL DOCK (V33) — one self-mounting bottom-right MENU BAR that every floating inspector toggle
 * lives in, instead of four buttons scattered at different `right:` offsets (which crowded the corner
 * and overlapped the Docs/Spec links + the ✦ AI toggle). Each panel calls {@link mountToggle} with its
 * toggle button; the dock lazily builds one glass bar, neutralises the button's own fixed positioning
 * (a CSS override that keeps its styling), and lays them out in a tidy wrapping row.
 *
 * Why a shared bar: the directive's UI/UX fix — "move ARCHITECT, NEURAL, MARKET, DOCS, and SPECS into
 * the bottom menu bar … keep panels readable, touchable, responsive, and intentional."
 */
const DOCK_ID = 'cqm-dock';

const STYLE = `
/* V83: ONE centered single-row pill dock above the toolbar (#bar). The bar itself is clickable
   (pointer-events:auto) — the V82 pass-through experiment let clicks fall through gaps AND fought
   onboarding's ghost overlay bug; children still neutralise their own fixed positioning. */
#${DOCK_ID}{position:fixed;left:50%;transform:translateX(-50%);bottom:48px;z-index:75;display:flex;
  align-items:center;gap:6px;flex-wrap:nowrap;justify-content:center;width:max-content;
  max-width:calc(100vw - 16px);overflow:hidden;scrollbar-width:none;
  padding:5px 10px;border-radius:26px;border:1px solid rgba(120,150,210,.32);
  background:linear-gradient(180deg,rgba(12,16,28,.92),rgba(6,8,16,.88));
  backdrop-filter:blur(12px);box-shadow:0 6px 28px rgba(0,0,0,.62),inset 0 1px 0 rgba(180,200,255,.08);
  pointer-events:auto}
/* Neutralise each child's own fixed positioning so the flex bar lays them out (styling is preserved). */
#${DOCK_ID} > *{position:static!important;inset:auto!important;margin:0!important;flex:0 0 auto;
  pointer-events:auto}
/* Docs / Spec / Lab — same pill chrome as the panel toggles once adopted into the dock. */
#${DOCK_ID} > a.cqm-dock-nav{display:inline-flex;align-items:center;justify-content:center;height:42px;
  padding:0 14px;border-radius:21px;border:1px solid rgba(120,160,220,.38);
  background:rgba(8,14,30,.86);color:#cfe0fb;font:600 11px/1 var(--font-mono,ui-monospace,monospace);
  letter-spacing:.12em;text-transform:uppercase;text-decoration:none;white-space:nowrap;
  backdrop-filter:blur(6px);box-shadow:0 2px 14px rgba(0,0,0,.45);transition:transform .15s,background .15s,border-color .15s}
#${DOCK_ID} > a.cqm-dock-nav:hover{transform:scale(1.06);background:rgba(14,24,48,.95);border-color:rgba(120,180,255,.55)}
#${DOCK_ID} > a.cqm-dock-nav:focus-visible{outline:2px solid rgba(120,180,255,.75);outline-offset:2px}
#${DOCK_ID} > a.cqm-dock-nav[data-nav="spec"]{border-color:rgba(220,120,255,.35);color:#f0c8ff}
#${DOCK_ID} > a.cqm-dock-nav[data-nav="spec"]:hover{background:rgba(40,16,54,.92);border-color:rgba(220,120,255,.55)}
@media (max-width: 768px), (orientation: portrait), (pointer: coarse) {
  #${DOCK_ID}{flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;justify-content:flex-start;
    max-width:calc(100vw - 12px);scrollbar-width:thin;-webkit-overflow-scrolling:touch;bottom:56px}
  #${DOCK_ID} > *{flex:0 0 auto}
}
`;

/** Lazily build (or fetch) the dock bar, adopting the standalone Docs + Spec nav links the first time. */
export function getDock(doc: Document = document): HTMLElement {
  const styleId = DOCK_ID + '-style';
  let style = doc.getElementById(styleId) as HTMLStyleElement | null;
  if (!style) {
    style = doc.createElement('style');
    style.id = styleId;
    doc.head.appendChild(style);
  }
  style.textContent = STYLE;

  const existing = doc.getElementById(DOCK_ID);
  if (existing) return existing;
  const dock = doc.createElement('nav');
  dock.id = DOCK_ID;
  dock.setAttribute('aria-label', 'Panel and navigation dock');
  doc.body.appendChild(dock);
  // Adopt DOCS / SPEC / LAB by `data-nav` (rewrite-proof on GitHub Pages).
  for (const key of ['docs', 'spec', 'lab']) {
    const a = doc.querySelector<HTMLAnchorElement>(`a[data-nav="${key}"]`);
    if (a) {
      a.classList.add('cqm-dock-nav');
      dock.appendChild(a);
    }
  }
  return dock;
}

/** Move a panel's toggle button into the shared dock bar (creating the bar on the first call). */
export function mountToggle(toggle: HTMLElement, doc: Document = document): void {
  getDock(doc).appendChild(toggle);
}

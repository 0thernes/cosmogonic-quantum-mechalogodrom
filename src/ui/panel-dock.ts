/**
 * The PANEL DOCK (V33) — one self-mounting bottom-right MENU BAR that every floating inspector toggle
 * lives in, instead of four buttons scattered at different `right:` offsets (which crowded the corner
 * and overlapped the Docs/Spec links + the ✦ AI toggle). Each panel calls {@link mountToggle} with its
 * toggle button; the dock lazily builds one glass bar, neutralises the button's own fixed positioning
 * (a CSS override that keeps its styling), and lays them out in a tidy wrapping row. The two static
 * Docs/Spec nav links are adopted into the same bar. UI shell only — no sim coupling, no rng.
 *
 * Why a shared bar: the directive's UI/UX fix — "move ARCHITECT, NEURAL, MARKET, DOCS, and SPECS into
 * the bottom menu bar … keep panels readable, touchable, responsive, and intentional."
 */
const DOCK_ID = 'cqm-dock';

const STYLE = `
#${DOCK_ID}{position:fixed;right:10px;bottom:10px;z-index:60;display:flex;align-items:center;gap:6px;
  flex-wrap:wrap;justify-content:flex-end;max-width:calc(100vw - 20px);padding:5px 7px;border-radius:24px;
  border:1px solid rgba(120,150,210,.24);background:rgba(8,11,20,.62);backdrop-filter:blur(10px);
  box-shadow:0 4px 22px rgba(0,0,0,.5)}
/* Neutralise each child's own fixed positioning so the flex bar lays them out (styling is preserved). */
#${DOCK_ID} > button,#${DOCK_ID} > a{position:static!important;inset:auto!important;margin:0!important}
#${DOCK_ID} > a{order:10} /* push the Docs/Spec nav links to the end of the bar */
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
  // Adopt the standalone (fixed-positioned) Docs + Spec links — the `.fixed` class distinguishes them
  // from the in-toolbar Spec link (which is `.flex`), so the #bar nav is left untouched.
  doc.querySelectorAll<HTMLElement>('a.fixed[href="/docs"], a.fixed[href="/spec"]').forEach((a) => {
    a.classList.remove('fixed');
    dock.appendChild(a);
  });
  return dock;
}

/** Move a panel's toggle button into the shared dock bar (creating the bar on the first call). */
export function mountToggle(toggle: HTMLElement, doc: Document = document): void {
  getDock(doc).appendChild(toggle);
}

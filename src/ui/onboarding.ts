/**
 * ONBOARDING OVERLAY (V81) — a one-time, dismissible first-run hint.
 *
 * Most users land on the 3D world with no idea the app is interactive. This card explains the
 * essentials: look/zoom/fly controls, the grouped toolbar, the access puzzle, and the superhero
 * flow. It records a `localStorage` flag so returning users are not nagged, and it respects
 * `prefers-reduced-motion`.
 */

import { injectPanelBaseCSS, overlayPanel, panelHeader, wireClose } from './panel-shell';

const STYLE = `
#cqm-onboarding.on{opacity:1}
@media (prefers-reduced-motion:reduce){#cqm-onboarding{transition:none}}
#cqm-onboarding[aria-hidden="true"]{display:none}
.cqm-onb-body{display:flex;flex-direction:column;gap:12px}
.cqm-onb-row{display:flex;gap:14px;align-items:flex-start}
.cqm-onb-row i{font-style:normal;font-size:20px;min-width:28px;text-align:center;color:#8fe0ff}
.cqm-onb-row span{flex:1}
.cqm-onb-row strong{display:block;color:#f0e8ff;margin-bottom:2px;font-size:12px;text-transform:uppercase;letter-spacing:.06em}
.cqm-onb-foot{margin-top:18px;display:flex;justify-content:space-between;align-items:center;gap:12px}
.cqm-onb-foot label{font-size:11px;color:#a99fce;display:flex;align-items:center;gap:6px;cursor:pointer}
.cqm-onb-foot input{margin:0}
.cqm-onb-go{padding:8px 18px;border-radius:8px;border:1px solid rgba(150,120,255,.5);background:rgba(80,50,160,.45);
  color:#f0e8ff;font:600 12px var(--font-mono,ui-monospace,monospace);cursor:pointer}
.cqm-onb-go:hover{background:rgba(120,80,220,.55)}
`;

const KEY = 'cqm.onboarding.dismissed';

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export class OnboardingOverlay {
  private readonly root: HTMLElement;
  private readonly visible: boolean;

  constructor(doc: Document = document) {
    const store = storage();
    this.visible = store ? store.getItem(KEY) !== '1' : false;

    injectPanelBaseCSS(doc);
    const style = doc.createElement('style');
    style.textContent = STYLE;
    doc.head.appendChild(style);

    const { root, box } = overlayPanel({
      id: 'cqm-onboarding',
      width: 'min(92vw,520px)',
      zIndex: 120,
      doc,
    });
    this.root = root;
    this.root.setAttribute('aria-label', 'Welcome to Cosmogonic Quantum Mechalogodrom');
    if (!this.visible) {
      this.root.setAttribute('aria-hidden', 'true');
    }

    box.appendChild(
      panelHeader({
        title: '⬡ COSMOGONIC',
        closeLabel: 'Close welcome',
        onClose: () => this.close(),
        doc,
      }),
    );
    const body = doc.createElement('div');
    body.className = 'cqm-onb-body';
    body.innerHTML =
      `<div class="cqm-onb-row"><i>🖱</i><span><strong>Look & Zoom</strong>Drag to rotate the camera. Scroll/pinch to zoom. WASD, arrows, and Q/E fly the free camera.</span></div>` +
      `<div class="cqm-onb-row"><i>🎛</i><span><strong>Toolbar</strong>Audio · World · Visual · Creative · Special. Each button toggles or cycles a real simulation setting.</span></div>` +
      `<div class="cqm-onb-row"><i>⛓</i><span><strong>Access Terminal</strong>Open the bottom-right ACCESS button, count the tally lines, and speak them in Roman numerals to unlock the 2nd super creature.</span></div>` +
      `<div class="cqm-onb-row"><i>⬢</i><span><strong>Superhero Mode</strong>Once ACCESS is granted, you become the creature. A top HUD gives life, energy, powers, and a D-pad for touch flight.</span></div>`;
    box.appendChild(body);
    const foot = doc.createElement('div');
    foot.className = 'cqm-onb-foot';
    foot.innerHTML =
      `<label><input type="checkbox" data-again /> Don't show again</label>` +
      `<button class="cqm-onb-go" type="button" data-go>Enter the world</button>`;
    box.appendChild(foot);

    const close = (): void => {
      const again =
        (this.root.querySelector('[data-again]') as HTMLInputElement | null)?.checked ?? true;
      if (again && store) store.setItem(KEY, '1');
      this.close();
    };

    (this.root.querySelector('[data-go]') as HTMLElement).addEventListener('click', close);
    wireClose(this.root, close);

    if (this.visible) {
      // One frame delay so the opacity transition fires after append.
      requestAnimationFrame(() => {
        this.root.style.display = 'flex';
        this.root.classList.add('on');
      });
    }
  }

  close(): void {
    this.root.setAttribute('aria-hidden', 'true');
    this.root.classList.remove('on');
    this.root.style.opacity = '0';
  }
}

/** Self-mount the onboarding overlay once. Safe to import in non-browser contexts. */
export function mountOnboarding(doc: Document = document): void {
  new OnboardingOverlay(doc);
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  mountOnboarding(document);
}

/**
 * SETTINGS PANEL (V81) — a single place for the persistent simulation controls.
 *
 * Replaces the scattered toolbar toggles with a focused modal: audio, render, view, weather, and
 * reset. Buttons use the same `[data-action]` contract as the toolbar, so the InputSystem handles them
 * without any extra wiring. The panel self-mounts a gear icon into the shared dock.
 */

import { dockToggle, glassPanel, injectPanelBaseCSS, panelHeader, wireClose } from './panel-shell';
import { mountToggle } from './panel-dock';

const STYLE = #cqm-settings-modal{pointer-events:auto;align-items:flex-end;justify-content:center;padding:12px 8px calc(var(--cqm-bottom-h,108px) + 12px)}
#cqm-settings-modal::before{content:'';position:absolute;inset:0;pointer-events:none;opacity:.12;
  background:repeating-linear-gradient(0deg,transparent 0 2px,rgba(120,160,255,.5) 2px 3px)}
#cqm-settings-modal .cqm-panel-box{max-height:min(48vh,calc(100vh - var(--cqm-bottom-h,108px) - 28px));overflow-y:auto;scrollbar-width:thin;
  scrollbar-color:rgba(120,160,255,.4) transparent;padding:12px 14px;border:1px solid rgba(199,155,255,.4);background:linear-gradient(180deg,rgba(18,14,36,.98),rgba(8,6,20,.98))}
.cqm-set-gr{margin-bottom:10px}
.cqm-set-gr h3{margin:0 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#d4b0ff;font-weight:700;font-family:var(--font-sans,system-ui,sans-serif);text-shadow:0 0 8px rgba(199,155,255,.3)}
.cqm-set-row{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.cqm-set-btn{pointer-events:auto;border:1px solid rgba(199,155,255,.25);border-radius:6px;background:rgba(30,24,60,.4);
  color:#f0ebff;padding:6px 8px;cursor:pointer;font:700 12px/1.3 var(--font-sans,system-ui,sans-serif);text-align:center;
  transition:background .15s,border-color .15s,transform .1s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:0.02em}
.cqm-set-btn:hover{border-color:rgba(199,155,255,.6);background:rgba(50,38,100,.65);transform:translateY(-1px)}
.cqm-set-btn:active{transform:translateY(0)}
.cqm-set-btn[data-action="apoc"]{border-color:rgba(255,80,80,.4);color:#ffd9d9;background:rgba(80,20,20,.35)}
.cqm-set-btn[data-action="apoc"]:hover{border-color:rgba(255,80,80,.7);background:rgba(140,30,30,.5)}
.cqm-set-btn[data-action="cosmo"]{border-color:rgba(255,200,80,.4);color:#ffe3b3;background:rgba(60,40,10,.35)}
.cqm-set-btn[data-action="cosmo"]:hover{border-color:rgba(255,200,80,.7);background:rgba(110,80,20,.5)}
.cqm-set-btn[data-action="nhi"]{border-color:rgba(180,100,255,.4);color:#ebd6ff;background:rgba(45,20,80,.35)}
.cqm-set-btn[data-action="nhi"]:hover{border-color:rgba(180,100,255,.7);background:rgba(85,35,135,.5)}
.cqm-set-btn[data-action="chaosmode"]{border-color:rgba(255,160,40,.4);color:#ffe5cc;background:rgba(70,40,10,.35)}
.cqm-set-btn[data-action="chaosmode"]:hover{border-color:rgba(255,160,40,.7);background:rgba(120,70,20,.5)}
.cqm-set-btn[data-action="entropy"]{border-color:rgba(255,100,60,.4);color:#ffd2cc;background:rgba(70,25,15,.35)}
.cqm-set-btn[data-action="entropy"]:hover{border-color:rgba(255,100,60,.7);background:rgba(120,45,25,.5)}
#cqm-settings-modal .cqm-panel-box{width:min(88vw,360px)}
.cqm-set-legend{margin-top:12px;padding-top:12px;border-top:1px solid rgba(199,155,255,.25)}
.cqm-set-hint{margin:0 0 10px;font:500 12px/1.45 var(--font-sans,system-ui,sans-serif);color:rgba(220,210,250,.8);letter-spacing:0.01em}
.cqm-set-kbd{width:100%;border-collapse:collapse;font:600 11px var(--font-mono,ui-monospace,monospace)}
.cqm-set-kbd td{padding:4px 6px;vertical-align:middle}
.cqm-set-kbd kbd{display:inline-block;min-width:2.4em;padding:3px 6px;border-radius:4px;border:1px solid rgba(199,155,255,.4);
  background:rgba(50,30,100,.3);color:#e2c5ff;font:inherit;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.25)}
.cqm-set-kbd .cqm-set-kbd-act{color:rgba(230,225,255,.9);font-family:var(--font-sans,system-ui,sans-serif);font-size:12px;letter-spacing:0.01em}
`;

const GROUPS = [
  {
    title: 'Controls',
    buttons: [
      { action: 'pause', label: '⏸ Pause' },
      { action: 'time', label: '⏱ Speed' },
      { action: 'split', label: '⇄ Split' },
      { action: 'burst', label: '✦ Burst' },
      { action: 'mutate', label: '☢ Mutate' },
      { action: 'chaos', label: '⚡ Chaos' },
    ],
  },
  {
    title: 'Audio',
    buttons: [
      { action: 'music', label: '♪ Music' },
      { action: 'sfx', label: '♫ SFX' },
      { action: 'mute', label: '🔇 Mute' },
      { action: 'song', label: '▶ Next Song' },
      { action: 'sfxcycle', label: '🔔 Preview SFX' },
    ],
  },
  {
    title: 'Visual',
    buttons: [
      { action: 'wire', label: '◐ Render' },
      { action: 'view', label: '👁 View' },
      { action: 'space', label: '⬡ Space' },
      { action: 'weather', label: '☁ Weather' },
    ],
  },
  {
    // Pause + time-scale live in the Controls group above — not duplicated here (V110 de-dup).
    title: 'World',
    buttons: [
      { action: 'sim', label: '⇄ Sim N1/N2' },
      { action: 'reset', label: '↻ Reset' },
      { action: 'apoc', label: '☠ Apocalypse' },
    ],
  },
  {
    title: 'Cosmos',
    buttons: [
      { action: 'cosmo', label: '★ Singularity' },
      { action: 'nhi', label: '◈ Launch NHI' },
    ],
  },
  {
    title: 'Chaos',
    buttons: [
      { action: 'chaosmode', label: '⚡ Chaos Mode' },
      { action: 'entropy', label: '🔥 Entropy' },
    ],
  },
];

const MOVEMENT_KEYS: readonly [string, string][] = [
  ['W / ↑', 'Move forward'],
  ['S / ↓', 'Move backward'],
  ['A / ←', 'Strafe left'],
  ['D / →', 'Strafe right'],
  ['Q', 'Ascend'],
  ['E', 'Descend'],
  ['Z', 'Roll left'],
  ['X', 'Roll right'],
  ['R', 'Tilt up'],
  ['F', 'Tilt down'],
  ['C', 'Yaw left'],
  ['V', 'Yaw right'],
];

const SIM_HOLD_KEYS: readonly [string, string][] = [
  ['Shift (hold)', 'Split mature entities'],
  ['Space (hold)', 'Burst-spawn'],
  ['M (hold)', 'Mutate all'],
  ['Tab (hold)', 'Boost chaos'],
];

function renderKbdTable(rows: readonly [string, string][]): string {
  return (
    `<table class="cqm-set-kbd"><tbody>` +
    rows
      .map(([k, act]) => `<tr><td><kbd>${k}</kbd></td><td class="cqm-set-kbd-act">${act}</td></tr>`)
      .join('') +
    `</tbody></table>`
  );
}

class SettingsPanel {
  private readonly modal: HTMLElement;
  private openState = false;

  constructor(doc: Document = document) {
    injectPanelBaseCSS(doc);
    const style = doc.createElement('style');
    style.textContent = STYLE;
    doc.head.appendChild(style);

    const toggle = dockToggle({
      id: 'cqm-settings-toggle',
      label: '⚙',
      title: 'Settings',
      ariaLabel: 'Open settings',
      onClick: () => this.toggle(),
      doc,
    });
    mountToggle(toggle, doc);

    const { root, box } = glassPanel({
      id: 'cqm-settings-modal',
      width: 'min(88vw,320px)',
      zIndex: 250,
      doc,
    });
    this.modal = root;
    this.modal.setAttribute('aria-label', 'Simulation settings');
    this.modal.tabIndex = -1;
    box.appendChild(panelHeader({ title: '⚙ SETTINGS', onClose: () => this.close(), doc }));
    for (const g of GROUPS) {
      const gr = doc.createElement('div');
      gr.className = 'cqm-set-gr';
      gr.innerHTML =
        `<h3>${g.title}</h3><div class="cqm-set-row">` +
        g.buttons
          .map(
            (b) =>
              `<button class="cqm-set-btn" type="button" data-action="${b.action}" aria-label="${b.label}">${b.label}</button>`,
          )
          .join('') +
        `</div>`;
      box.appendChild(gr);
    }
    const legend = doc.createElement('div');
    legend.className = 'cqm-set-gr cqm-set-legend';
    legend.innerHTML =
      `<h3>Movement &amp; camera</h3>` +
      `<p class="cqm-set-hint">Drag to orbit · scroll to zoom. Keys work while this window is closed.</p>` +
      renderKbdTable(MOVEMENT_KEYS) +
      `<h3 style="margin-top:8px">Sim actions (hold key)</h3>` +
      renderKbdTable(SIM_HOLD_KEYS);
    box.appendChild(legend);
    wireClose(this.modal, () => this.close());

    if (typeof window !== 'undefined' && doc === document) {
      (window as any).cqmToggleSettings = () => this.toggle();
    }
  }

  toggle(): void {
    if (this.openState) this.close();
    else this.open();
  }

  open(): void {
    this.modal.style.display = 'flex';
    this.openState = true;
    this.modal.focus();
  }

  close(): void {
    this.modal.style.display = 'none';
    this.openState = false;
  }
}

/** Self-mount the settings panel. Safe to import in non-browser contexts. */
export function mountSettingsPanel(doc: Document = document): void {
  new SettingsPanel(doc);
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  mountSettingsPanel(document);
}

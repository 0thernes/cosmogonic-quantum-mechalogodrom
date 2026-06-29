/**
 * SETTINGS PANEL (V81) — a single place for the persistent simulation controls.
 *
 * Replaces the scattered toolbar toggles with a focused modal: audio, render, view, weather, and
 * reset. Buttons use the same `[data-action]` contract as the toolbar, so the InputSystem handles them
 * without any extra wiring. The panel self-mounts a gear icon into the shared dock.
 */

import { dockToggle, glassPanel, injectPanelBaseCSS, panelHeader, wireClose } from './panel-shell';
import { mountToggle } from './panel-dock';

const STYLE = `
#cqm-settings-modal::before{content:'';position:absolute;inset:0;pointer-events:none;opacity:.12;
  background:repeating-linear-gradient(0deg,transparent 0 2px,rgba(120,160,255,.5) 2px 3px)}
#cqm-settings-modal .glass-box{max-height:62vh;overflow-y:auto;scrollbar-width:thin;
  scrollbar-color:rgba(120,160,255,.4) transparent;padding:6px 8px}
.cqm-set-gr{margin-bottom:4px}
.cqm-set-gr h3{margin:0 0 2px;font-size:7px;letter-spacing:.1em;text-transform:uppercase;color:#a99fce;font-weight:600}
.cqm-set-row{display:grid;grid-template-columns:repeat(3,1fr);gap:2px}
.cqm-set-btn{pointer-events:auto;border:1px solid rgba(120,160,255,.35);border-radius:5px;background:rgba(30,40,80,.45);
  color:#e6dcff;padding:2px 4px;cursor:pointer;font:8px var(--font-mono,ui-monospace,monospace);text-align:center;
  transition:background .12s,border-color .12s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cqm-set-btn:hover{border-color:rgba(120,160,255,.6);background:rgba(50,70,130,.6)}
.cqm-set-btn[data-action="apoc"]{border-color:rgba(255,80,80,.35);color:#ffb3b3}
.cqm-set-btn[data-action="apoc"]:hover{border-color:rgba(255,80,80,.6);background:rgba(120,30,30,.5)}
.cqm-set-btn[data-action="cosmo"]{border-color:rgba(255,200,80,.35);color:#ffd9a0}
.cqm-set-btn[data-action="cosmo"]:hover{border-color:rgba(255,200,80,.6);background:rgba(80,60,20,.5)}
.cqm-set-btn[data-action="nhi"]{border-color:rgba(180,100,255,.35);color:#d4b0ff}
.cqm-set-btn[data-action="nhi"]:hover{border-color:rgba(180,100,255,.6);background:rgba(60,30,90,.5)}
.cqm-set-btn[data-action="chaosmode"]{border-color:rgba(255,160,40,.35);color:#ffcc88}
.cqm-set-btn[data-action="chaosmode"]:hover{border-color:rgba(255,160,40,.6);background:rgba(100,60,20,.5)}
.cqm-set-btn[data-action="entropy"]{border-color:rgba(255,100,60,.35);color:#ffaa88}
.cqm-set-btn[data-action="entropy"]:hover{border-color:rgba(255,100,60,.6);background:rgba(100,40,20,.5)}
`;

const GROUPS = [
  {
    title: 'Controls',
    buttons: [
      { action: 'pause', label: '⏸ Pause' },
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
    title: 'World',
    buttons: [
      { action: 'pause', label: '⏸ Pause' },
      { action: 'time', label: '⏱ Time' },
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

class SettingsPanel {
  private readonly modal: HTMLElement;

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
      onClick: () => this.open(),
      doc,
    });
    mountToggle(toggle, doc);

    const { root, box } = glassPanel({
      id: 'cqm-settings-modal',
      width: 'min(82vw,260px)',
      zIndex: 200,
      doc,
    });
    this.modal = root;
    this.modal.setAttribute('aria-label', 'Simulation settings');
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
    wireClose(this.modal, () => this.close());
  }

  open(): void {
    this.modal.style.display = 'flex';
  }

  close(): void {
    this.modal.style.display = 'none';
  }
}

/** Self-mount the settings panel. Safe to import in non-browser contexts. */
export function mountSettingsPanel(doc: Document = document): void {
  new SettingsPanel(doc);
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  mountSettingsPanel(document);
}

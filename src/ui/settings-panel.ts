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
.cqm-set-gr{margin-bottom:16px}
.cqm-set-gr h3{margin:0 0 8px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#a99fce;font-weight:600}
.cqm-set-row{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
.cqm-set-btn{pointer-events:auto;border:1px solid rgba(120,160,255,.35);border-radius:8px;background:rgba(30,40,80,.45);
  color:#e6dcff;padding:8px 10px;cursor:pointer;font:11px var(--font-mono,ui-monospace,monospace);text-align:left;
  transition:background .12s,border-color .12s}
.cqm-set-btn:hover{border-color:rgba(120,160,255,.6);background:rgba(50,70,130,.6)}
.cqm-set-btn[data-action="apoc"]{border-color:rgba(255,80,80,.35);color:#ffb3b3}
.cqm-set-btn[data-action="apoc"]:hover{border-color:rgba(255,80,80,.6);background:rgba(120,30,30,.5)}
`;

const GROUPS = [
  {
    title: 'Audio',
    buttons: [
      { action: 'music', label: 'Toggle Music' },
      { action: 'sfx', label: 'Toggle SFX' },
      { action: 'song', label: 'Next Song' },
      { action: 'sfxcycle', label: 'Preview SFX' },
    ],
  },
  {
    title: 'Visual',
    buttons: [
      { action: 'wire', label: 'Cycle Render' },
      { action: 'view', label: 'Cycle View' },
      { action: 'algo', label: 'Cycle Algo' },
      { action: 'weather', label: 'Cycle Weather' },
    ],
  },
  {
    title: 'World',
    buttons: [
      { action: 'time', label: 'Time Scale' },
      { action: 'sim', label: 'Sim Variant' },
      { action: 'reset', label: 'Reset World' },
      { action: 'apoc', label: 'Apocalypse' },
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
      width: 'min(92vw,420px)',
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

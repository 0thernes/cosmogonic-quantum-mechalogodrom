/**
 * AUDIT dock toggle (V51) — moves the audit trail OFF the crowded left column (where it squeezed
 * SORTING FIELDS) and INTO the bottom menu bar, as a 🗒 AUDIT toggle that shows/hides the existing
 * `#aP` panel (now a fixed bottom-right overlay; see app.css) WITHOUT disturbing its HTMX polling
 * (`hx-trigger="load, every 5s"` keeps running whether the panel is shown or not). UI shell only — it
 * never imports or touches sim state. Self-mounts on import (`import './ui/audit-dock'` in main.ts),
 * which runs before the engine boots, so the toggle exists even if WebGL fails.
 */
import { mountToggle } from './panel-dock';

const STYLE = `
#cqm-aud-toggle{height:42px;padding:0 12px;border-radius:21px;border:1px solid rgba(120,170,200,.5);
  background:rgba(8,16,20,.84);color:#bfe6f2;font:600 11px/1 var(--font-mono,ui-monospace,monospace);
  letter-spacing:.12em;cursor:pointer;white-space:nowrap;transition:transform .15s,background .15s}
#cqm-aud-toggle:hover{transform:scale(1.06);background:rgba(16,30,38,.94)}
#cqm-aud-toggle:focus-visible{outline:2px solid #5cc6e0;outline-offset:2px}
#cqm-aud-toggle.on{background:rgba(20,40,50,.95);border-color:rgba(120,200,230,.8);color:#e6f7ff}
`;

/** Build the 🗒 AUDIT toggle into the dock and wire it to the existing `#aP` overlay. Idempotent (HMR). */
function mountAuditToggle(doc: Document = document): void {
  if (doc.getElementById('cqm-aud-toggle')) return;
  const panel = doc.getElementById('aP');
  if (!panel) return; // index.html not present (e.g. a non-app context) — nothing to toggle

  const style = doc.createElement('style');
  style.id = 'cqm-aud-style';
  style.textContent = STYLE;
  doc.head.appendChild(style);

  const toggle = doc.createElement('button');
  toggle.id = 'cqm-aud-toggle';
  toggle.type = 'button';
  toggle.textContent = '🗒 AUDIT';
  toggle.setAttribute('aria-label', 'Open or close the audit trail');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.addEventListener('click', () => {
    const open = panel.classList.toggle('audit-on');
    toggle.classList.toggle('on', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  mountToggle(toggle, doc);
}

mountAuditToggle();

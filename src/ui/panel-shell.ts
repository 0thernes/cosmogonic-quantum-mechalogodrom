/**
 * PANEL SHELL (V81) — shared chrome for self-mounting UI panels.
 *
 * Every self-mounting panel used to carry its own copy of the glass-panel CSS, close-button styles,
 * z-index logic, and dock-toggle construction. This module centralizes those primitives so new panels
 * share one visual language and one accessibility contract.
 *
 * Primitives:
 * - injectCSS: idempotent <style> injection with a stable id.
 * - glassPanel: a fixed-position, rounded, blurred glass panel with optional max-width/height.
 * - panelHeader: a reusable header with title + close button (aria-label + Escape support).
 * - dockToggle: the standard bottom-dock toggle button used by access-puzzle, settings, etc.
 */

export interface GlassPanelOptions {
  id: string;
  className?: string;
  width?: string;
  maxHeight?: string;
  zIndex?: number;
  doc?: Document;
}

export interface PanelHeaderOptions {
  title: string;
  closeLabel?: string;
  onClose: () => void;
  doc?: Document;
}

export interface DockToggleOptions {
  id: string;
  label: string;
  title: string;
  ariaLabel: string;
  onClick: () => void;
  doc?: Document;
}

const BASE_CSS = `
.cqm-panel{position:fixed;display:flex;align-items:center;justify-content:center;inset:0;z-index:150;pointer-events:none}
.cqm-overlay{position:fixed;display:flex;align-items:center;justify-content:center;inset:0;pointer-events:auto}
.cqm-panel-box{position:relative;width:min(92vw,520px);max-height:92vh;overflow:auto;border:1px solid rgba(120,160,220,.35);border-radius:16px;
  background:linear-gradient(180deg,rgba(12,10,28,.96),rgba(6,5,16,.96));box-shadow:0 20px 60px rgba(0,0,0,.6),inset 0 0 40px rgba(80,60,160,.12);
  padding:22px 26px;color:#e9e3ff;font:13px/1.55 var(--font-sans,system-ui,sans-serif);pointer-events:auto}
.cqm-panel-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
.cqm-panel-top b{font-size:16px;letter-spacing:.04em;color:#c79bff}
.cqm-panel-x{background:rgba(0,0,0,.4);color:#a99fce;border:1px solid rgba(150,120,255,.3);border-radius:6px;padding:4px 10px;cursor:pointer;font:12px var(--font-mono,ui-monospace,monospace)}
.cqm-panel-x:hover{background:rgba(70,42,130,.5);color:#fff}
.cqm-dock-toggle{border:1px solid rgba(120,160,220,.4);background:rgba(8,14,30,.86);color:#cfe0fb;font:600 11px/1 var(--font-mono,ui-monospace,monospace);letter-spacing:.1em;height:42px;padding:0 12px;border-radius:21px;cursor:pointer;backdrop-filter:blur(6px);box-shadow:0 2px 14px rgba(0,0,0,.5);transition:transform .15s,background .15s}
.cqm-dock-toggle:hover{transform:scale(1.06);background:rgba(14,24,48,.95)}
`;

/** Inject a <style> block once; if an id is provided, any existing style with that id is replaced. */
export function injectCSS(css: string, id?: string, doc: Document = document): void {
  if (id) doc.getElementById(id)?.remove();
  const style = doc.createElement('style');
  if (id) style.id = id;
  style.textContent = css;
  doc.head.appendChild(style);
}

/** Inject the base panel-shell CSS. Idempotent. */
export function injectPanelBaseCSS(doc: Document = document): void {
  injectCSS(BASE_CSS, 'cqm-panel-shell-base', doc);
}

/** Create a fixed, centered glass panel container with the standard box styling. */
export function glassPanel(opts: GlassPanelOptions): { root: HTMLElement; box: HTMLElement } {
  const doc = opts.doc ?? (typeof document !== 'undefined' ? document : null);
  if (!doc) throw new Error('glassPanel requires a document');
  doc.getElementById(opts.id)?.remove();
  const root = doc.createElement('div');
  root.id = opts.id;
  root.className = 'cqm-panel' + (opts.className ? ' ' + opts.className : '');
  root.style.zIndex = String(opts.zIndex ?? 150);
  root.style.display = 'none';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  const box = doc.createElement('div');
  box.className = 'cqm-panel-box';
  if (opts.width) box.style.width = opts.width;
  if (opts.maxHeight) box.style.maxHeight = opts.maxHeight;
  root.appendChild(box);
  doc.body.appendChild(root);
  return { root, box };
}

/** Create a standard panel header with a title and a close button. */
export function panelHeader(opts: PanelHeaderOptions): HTMLElement {
  const doc = opts.doc ?? (typeof document !== 'undefined' ? document : null);
  if (!doc) throw new Error('panelHeader requires a document');
  const header = doc.createElement('div');
  header.className = 'cqm-panel-top';
  const title = doc.createElement('b');
  title.textContent = opts.title;
  const close = doc.createElement('button');
  close.type = 'button';
  close.className = 'cqm-panel-x';
  close.textContent = '✕';
  close.setAttribute('aria-label', opts.closeLabel ?? 'Close');
  close.addEventListener('click', opts.onClose);
  header.appendChild(title);
  header.appendChild(close);
  return header;
}

/** Create a standard bottom-dock toggle button. */
export function dockToggle(opts: DockToggleOptions): HTMLButtonElement {
  const doc = opts.doc ?? (typeof document !== 'undefined' ? document : null);
  if (!doc) throw new Error('dockToggle requires a document');
  doc.getElementById(opts.id)?.remove();
  const btn = doc.createElement('button');
  btn.id = opts.id;
  btn.type = 'button';
  btn.className = 'cqm-dock-toggle';
  btn.textContent = opts.label;
  btn.title = opts.title;
  btn.setAttribute('aria-label', opts.ariaLabel);
  btn.addEventListener('click', opts.onClick);
  return btn;
}

/**
 * Full-screen overlay panel (e.g., onboarding) with a backdrop gradient and an opacity fade.
 * Returns root + box. The caller must add the `.on` class and set `display: flex` to show it.
 */
export function overlayPanel(opts: GlassPanelOptions): { root: HTMLElement; box: HTMLElement } {
  const { root, box } = glassPanel(opts);
  root.classList.remove('cqm-panel');
  root.classList.add('cqm-overlay');
  root.style.display = 'none';
  root.style.opacity = '0';
  root.style.transition = 'opacity 350ms ease';
  root.style.background =
    'radial-gradient(120% 120% at 50% 30%, rgba(2,6,14,.78), rgba(0,0,0,.92))';
  return { root, box };
}

/** Wire Escape to close the dialog and a click on the backdrop to close it. */
export function wireClose(root: HTMLElement, close: () => void): void {
  root.addEventListener('click', (e) => {
    if (e.target === root) close();
  });
  root.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Escape') close();
  });
}

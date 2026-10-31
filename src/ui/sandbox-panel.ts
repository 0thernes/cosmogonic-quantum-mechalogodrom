/**
 * SANDBOX PANEL — a live options pop-up over EVERY kind of thing in the world.
 *
 * The list is not hand-picked: it is the {@link SandboxController} registry, which enumerates the
 * running World by reflection (every scene-owning / stepping system, every instanced pool inside it,
 * the organism population and each phylum). Each row has an on/off toggle and a 0–300 % level in 10 %
 * steps; 100 % is exactly the shipped behaviour. Changes apply live, persist to localStorage, and
 * "Reset to default" restores everything. A live fps + entity readout sits at the top.
 *
 * Also mounts the always-visible MINI WORLD entry ("Enter Mini World — full glory") and, inside Mini
 * World, the clear way back to the full-size cosmos.
 */

import {
  dockToggle,
  glassPanel,
  injectCSS,
  injectPanelBaseCSS,
  panelHeader,
  wireClose,
} from './panel-shell';
import { mountToggle } from './panel-dock';
import {
  SANDBOX_PCT_MAX,
  SANDBOX_PCT_MIN,
  SANDBOX_PCT_STEP,
  levelOf,
  loadSettings,
  normalizeSettings,
  saveSettings,
  snapPct,
  type SandboxEntry,
  type SandboxSettings,
} from '../sim/sandbox';
import { IS_MINI_WORLD } from '../sim/constants';

/** The slice of World the panel drives (World exposes these; see world.ts). */
export interface SandboxHost {
  getSandbox(): { entries: readonly SandboxEntry[] };
  applySandbox(s: SandboxSettings): void;
  sandboxStats(): { organisms: number; target: number; capacity: number };
}

/** Pure: next level after a ± step press, clamped to [0, 300] on the 10 % grid. */
export function stepPct(cur: number, dir: 1 | -1): number {
  return snapPct(cur + dir * SANDBOX_PCT_STEP);
}

/** Pure: the URL that enters (or leaves) Mini World from `href`, keeping every other query param. */
export function miniWorldHref(href: string, enter: boolean): string {
  const u = new URL(href);
  if (enter) u.searchParams.set('world', 'mini');
  else u.searchParams.delete('world');
  return u.toString();
}

/** Pure: settings after changing one entry (normalised so defaults are never stored). */
export function withLevel(
  s: SandboxSettings,
  id: string,
  on: boolean,
  pct: number,
): SandboxSettings {
  return normalizeSettings({ ...s, [id]: { on, pct: snapPct(pct) } });
}

const KIND_TITLE: Record<SandboxEntry['kind'], string> = {
  population: 'Population',
  phylum: 'Phyla',
  system: 'World systems',
  pool: 'Instanced pools',
};

const STYLE = `#cqm-sandbox-modal{pointer-events:auto;align-items:center;justify-content:center}
#cqm-sandbox-modal .cqm-panel-box{width:min(94vw,520px);max-height:80vh;overflow-y:auto;padding:12px 14px}
.cqm-sb-perf{font:600 12px var(--font-mono,ui-monospace,monospace);color:#bff;margin:4px 0 8px}
.cqm-sb-bar{display:flex;gap:6px;margin-bottom:8px}
.cqm-sb-bar input{flex:1;min-width:0;background:rgba(20,16,40,.8);color:#eef;border:1px solid rgba(199,155,255,.35);border-radius:6px;padding:4px 6px}
.cqm-sb-btn{border:1px solid rgba(199,155,255,.35);border-radius:6px;background:rgba(30,24,60,.5);color:#f0ebff;padding:3px 8px;cursor:pointer;font:700 12px var(--font-ui,system-ui,sans-serif)}
.cqm-sb-h{margin:10px 0 4px;font:700 12px var(--font-ui,system-ui,sans-serif);letter-spacing:.08em;text-transform:uppercase;color:#d4b0ff}
.cqm-sb-row{display:grid;grid-template-columns:20px 1fr 26px 44px 26px;gap:4px;align-items:center;font:500 12px var(--font-ui,system-ui,sans-serif);color:#e8e2ff;padding:1px 0}
.cqm-sb-row.cqm-sb-pool{padding-left:14px;opacity:.9}
.cqm-sb-row .cqm-sb-pct{text-align:center;font-family:var(--font-mono,ui-monospace,monospace)}
.cqm-sb-row.cqm-sb-off .cqm-sb-lbl{opacity:.45;text-decoration:line-through}
#cqm-mini-entry{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:240;pointer-events:auto;cursor:pointer;
  border:1px solid rgba(255,210,120,.6);border-radius:999px;padding:7px 16px;font:800 13px var(--font-ui,system-ui,sans-serif);
  letter-spacing:.04em;color:#fff4d6;background:linear-gradient(90deg,rgba(90,40,140,.85),rgba(160,90,20,.85));box-shadow:0 0 18px rgba(255,190,90,.45)}
#cqm-mini-entry:hover{box-shadow:0 0 28px rgba(255,210,120,.75)}`;

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function host(): SandboxHost | null {
  const w = (globalThis as unknown as { world?: Partial<SandboxHost> }).world;
  return w && typeof w.getSandbox === 'function' ? (w as SandboxHost) : null;
}

export class SandboxPanel {
  private readonly modal: HTMLElement;
  private readonly list: HTMLElement;
  private readonly perf: HTMLElement;
  private readonly filter: HTMLInputElement;
  private settings: SandboxSettings;
  private frames = 0;
  private lastT = 0;
  private fps = 0;
  private perfTimer: number | null = null;

  constructor(doc: Document = document) {
    injectPanelBaseCSS(doc);
    injectCSS(STYLE, 'cqm-sandbox-css', doc);
    this.settings = loadSettings(storage());
    mountToggle(
      dockToggle({
        id: 'cqm-sandbox-toggle',
        label: '🧪',
        title: 'Sandbox',
        ariaLabel: 'Open sandbox',
        onClick: () => this.toggle(),
        doc,
      }),
      doc,
    );
    const { root, box } = glassPanel({
      id: 'cqm-sandbox-modal',
      width: 'min(94vw,520px)',
      zIndex: 260,
      doc,
    });
    this.modal = root;
    this.modal.setAttribute('aria-label', 'Sandbox options');
    box.appendChild(
      panelHeader({
        title: IS_MINI_WORLD ? '🧪 SANDBOX — MINI WORLD' : '🧪 SANDBOX',
        onClose: () => this.close(),
        doc,
      }),
    );
    this.perf = doc.createElement('div');
    this.perf.className = 'cqm-sb-perf';
    box.appendChild(this.perf);
    const bar = doc.createElement('div');
    bar.className = 'cqm-sb-bar';
    this.filter = doc.createElement('input');
    this.filter.placeholder = 'Filter…';
    this.filter.addEventListener('input', () => this.render());
    const reset = doc.createElement('button');
    reset.className = 'cqm-sb-btn';
    reset.textContent = 'Reset to default';
    reset.addEventListener('click', () => this.commit({}));
    bar.append(this.filter, reset);
    box.appendChild(bar);
    this.list = doc.createElement('div');
    box.appendChild(this.list);
    this.list.addEventListener('click', (e) => this.onClick(e));
    this.list.addEventListener('change', (e) => this.onClick(e));
    wireClose(this.modal, () => this.close());
  }

  private commit(next: SandboxSettings): void {
    this.settings = normalizeSettings(next);
    saveSettings(storage(), this.settings);
    host()?.applySandbox(this.settings);
    this.render();
  }

  private onClick(e: Event): void {
    const t = e.target as HTMLElement;
    const row = t.closest<HTMLElement>('[data-id]');
    if (!row) return;
    const id = row.dataset.id!;
    const cur = levelOf(this.settings, id);
    const act = t.dataset.act;
    if (act === 'on' && e.type === 'change')
      this.commit(withLevel(this.settings, id, (t as HTMLInputElement).checked, cur.pct));
    else if (act === 'dn' && e.type === 'click')
      this.commit(withLevel(this.settings, id, cur.on, stepPct(cur.pct, -1)));
    else if (act === 'up' && e.type === 'click')
      this.commit(withLevel(this.settings, id, cur.on, stepPct(cur.pct, 1)));
  }

  private render(): void {
    const h = host();
    if (!h) {
      this.list.textContent = 'World not ready yet…';
      return;
    }
    const q = this.filter.value.trim().toLowerCase();
    const entries = h
      .getSandbox()
      .entries.filter((e) => !q || e.label.toLowerCase().includes(q) || e.id.includes(q));
    const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
    let html = '';
    for (const kind of ['population', 'phylum', 'system'] as const) {
      const top = entries.filter((e) => e.kind === kind);
      if (top.length === 0) continue;
      html += `<div class="cqm-sb-h">${KIND_TITLE[kind]} (${top.length})</div>`;
      for (const e of top) {
        html += this.row(e, esc);
        if (kind === 'system')
          for (const p of entries)
            if (p.kind === 'pool' && p.parent === e.id) html += this.row(p, esc);
      }
    }
    this.list.innerHTML = html;
  }

  private row(e: SandboxEntry, esc: (s: string) => string): string {
    const l = levelOf(this.settings, e.id);
    return (
      `<div class="cqm-sb-row${e.kind === 'pool' ? ' cqm-sb-pool' : ''}${l.on ? '' : ' cqm-sb-off'}" data-id="${esc(e.id)}">` +
      `<input type="checkbox" data-act="on" aria-label="Enable ${esc(e.label)}"${l.on ? ' checked' : ''}>` +
      `<span class="cqm-sb-lbl" title="${esc(e.id)}">${esc(e.label)}</span>` +
      `<button class="cqm-sb-btn" data-act="dn" aria-label="Less"${l.pct <= SANDBOX_PCT_MIN ? ' disabled' : ''}>−</button>` +
      `<span class="cqm-sb-pct">${l.pct}%</span>` +
      `<button class="cqm-sb-btn" data-act="up" aria-label="More"${l.pct >= SANDBOX_PCT_MAX ? ' disabled' : ''}>+</button></div>`
    );
  }

  private tickPerf = (t: number): void => {
    if (this.modal.style.display !== 'flex') {
      this.perfTimer = null;
      return;
    }
    this.frames++;
    if (t - this.lastT >= 500) {
      this.fps = (this.frames * 1000) / Math.max(1, t - this.lastT);
      this.frames = 0;
      this.lastT = t;
      const s = host()?.sandboxStats();
      this.perf.textContent = s
        ? `${this.fps.toFixed(0)} fps · ${s.organisms} organisms (target ${s.target}, cap ${s.capacity})`
        : `${this.fps.toFixed(0)} fps`;
    }
    this.perfTimer = requestAnimationFrame(this.tickPerf);
  };

  toggle(): void {
    if (this.modal.style.display === 'flex') this.close();
    else this.open();
  }

  open(): void {
    this.modal.style.display = 'flex';
    this.render();
    if (this.perfTimer === null) this.perfTimer = requestAnimationFrame(this.tickPerf);
  }

  close(): void {
    this.modal.style.display = 'none';
  }
}

/** The always-visible Mini World entry / exit pill. */
export function mountMiniWorldEntry(doc: Document = document): HTMLAnchorElement {
  const a = doc.createElement('a');
  a.id = 'cqm-mini-entry';
  a.href = miniWorldHref(doc.location.href, !IS_MINI_WORLD);
  a.textContent = IS_MINI_WORLD
    ? '← Back to the full-size world'
    : '✦ Enter Mini World — full glory';
  a.title = IS_MINI_WORLD
    ? 'Leave Mini World and return to the full-size cosmos'
    : 'Everything at 1/10 scale with maximum intelligence and maximum visuals';
  doc.body.appendChild(a);
  return a;
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  new SandboxPanel(document);
  mountMiniWorldEntry(document);
}

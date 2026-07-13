/**
 * XENOMIMICS data-visual window — the ◈ XENOMIMIC panel (slice 2b). A self-building HUD readout that
 * makes the ground-fauna swarm INSPECTABLE the way the ⬢ ARCHITECT panel makes the Archons inspectable.
 *
 * The owner's directive was explicit: "a new Window like with the Archon GodForms but it's for the
 * Xenomimics data visuals … DO NOT CHANGE the wireframing or ui/ux spacing/padding of the window box.
 * Just use that template." So this reuses the EXACT window-box geometry from {@link ./super-panel}
 * (position, header padding `7px 10px`, body flex, id-column padding `7px 12px`, bar grid
 * `72px 1fr 42px`, minimized/open states) verbatim — only the id prefix (`cqm-xno-*`) and the accent
 * palette differ (amber/hot-pink for the entangled twin-fauna, not the Archons' violet). The center-HUD
 * launcher adopts its `◈ XENOMIMIC` toggle into the horizontal dock strip like every other panel.
 *
 * UI shell only: it never imports or mutates sim state; the world pushes a {@link XenomimicTelemetry}
 * each Observatory cadence via {@link update}. No rng, no coupling.
 */
import type { XenomimicTelemetry } from '../sim/xenomimics';
import { mountToggle } from './panel-dock';
import { injectPanelBaseCSS } from './panel-shell';

/**
 * The ten species, mirrored 1:1 from {@link ./../sim/xenomimics-render}'s `speciesGeometry` +
 * `SPECIES_HUE` so the panel's chips read the SAME colour + kind the player sees on the ground.
 */
interface SpeciesDef {
  hue: number; // 0..1, identical to SPECIES_HUE in the renderer
  name: string; // the evocative "10 different kinds" label
  glyph: string; // a compact geometry cue (octahedron … möbius … kakeya shard)
}
const SPECIES: readonly SpeciesDef[] = [
  { hue: 0.02, name: 'VERTEX WRAITH', glyph: '◇' }, // OctahedronGeometry(1,0)
  { hue: 0.09, name: 'SHARD CULT', glyph: '△' }, // TetrahedronGeometry(1.15,0)
  { hue: 0.15, name: 'STELLATE HOWLER', glyph: '✶' }, // OctahedronGeometry(1,1) subdivided
  { hue: 0.33, name: 'MANDALA CREEP', glyph: '⬠' }, // IcosahedronGeometry(0.95,0)
  { hue: 0.46, name: 'PENTACELL', glyph: '⬡' }, // DodecahedronGeometry(0.9,0)
  { hue: 0.53, name: 'SPIRE MAW', glyph: '⏶' }, // ConeGeometry — spiky pentagonal
  { hue: 0.61, name: 'TESSERACT CELL', glyph: '⬛' }, // BoxGeometry — tesseract-cube cell
  { hue: 0.72, name: 'MÖBIUS COIL', glyph: '◯' }, // TorusGeometry — mobius-ish ring
  { hue: 0.83, name: 'KAKEYA SPLINTER', glyph: '⧨' }, // TetrahedronGeometry(1.1,1) shard
  { hue: 0.94, name: 'BEAD ORACLE', glyph: '❂' }, // IcosahedronGeometry(0.9,1) bead-mandala
];

/** A species chip's live colour — same hue as the renderer, shifted only in lightness for legibility. */
const speciesColor = (hue: number): string => `hsl(${Math.round(hue * 360)},82%,62%)`;

/**
 * The window-box geometry is cloned from super-panel's STYLE (the ⬢ ARCHITECT box) UNCHANGED — same
 * fixed anchoring, same paddings, same header/body/bar grids, same minimized/open behaviour. Only the
 * accent colours change (amber `#ffb347` + hot-pink `#ff6ab0` for the psychotic twin-fauna).
 */
const STYLE = `
#cqm-xno-toggle{border-color:rgba(255,168,71,.58);background:linear-gradient(180deg,rgba(34,20,10,.92),rgba(22,12,6,.88));color:#ffd8a6;
  animation:cqm-xno-breathe 3.1s ease-in-out infinite}
@keyframes cqm-xno-breathe{0%,100%{box-shadow:0 2px 14px rgba(220,120,40,.32)}50%{box-shadow:0 2px 22px rgba(255,170,80,.66)}}
#cqm-xno-toggle:hover{transform:scale(1.06);background:rgba(54,30,14,.95)}
#cqm-xno-toggle:focus-visible{outline:2px solid #ffb347;outline-offset:2px}
#cqm-xno-panel{position:fixed;left:var(--cqm-hud-left,calc(clamp(180px,19vw,260px) + 16px));
  right:var(--cqm-hud-right,calc(clamp(220px,23vw,340px) + 16px));
  top:auto;bottom:var(--cqm-hud-bottom,calc(var(--cqm-bottom-h,108px) + 130px));transform:none;
  z-index:71;width:auto;max-width:none;max-height:var(--cqm-hud-height,min(84vh,1040px));display:none;flex-direction:column;
  border:1px solid rgba(255,168,71,.34);border-radius:12px;background:rgba(14,9,5,.96);backdrop-filter:blur(12px);
  box-shadow:0 10px 46px rgba(0,0,0,.7);font:11px/1.45 var(--font-mono,ui-monospace,monospace);color:#ffeede;overflow:hidden}
#cqm-xno-panel{max-height:min(84vh,1040px)}
@media (max-width:640px){#cqm-xno-panel{max-height:min(80vh,900px)}}
#cqm-xno-panel.open{display:flex}
@media (max-width:640px){
#cqm-xno-panel{left:auto;top:auto;right:10px;bottom:calc(var(--cqm-bottom-h,108px) + 130px);transform:none;width:min(94vw,326px);max-height:min(66vh,480px)}
}
.cqm-xno-head{display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid rgba(255,168,71,.24);background:rgba(46,26,10,.8)}
.cqm-xno-head b{font-size:13px;letter-spacing:.12em;color:#ffcf8a;white-space:nowrap}
.cqm-xno-head .plan{margin-left:auto;font-weight:700;letter-spacing:.1em;padding:1px 8px;border-radius:9px;background:rgba(0,0,0,.35);color:#ff9f43}
.cqm-xno-x,.cqm-xno-min{background:rgba(12,7,3,.9);color:#ffd8a6;border:1px solid rgba(255,168,71,.3);border-radius:5px;
  font:11px var(--font-mono,ui-monospace,monospace);padding:2px 7px;cursor:pointer}
.cqm-xno-x:focus-visible,.cqm-xno-min:focus-visible{outline:1px solid #ffb347}
#cqm-xno-panel.minimized{height:auto !important;max-height:52px !important;min-height:0 !important}
#cqm-xno-panel.minimized .cqm-xno-body,
#cqm-xno-panel.minimized .cqm-xno-species{display:none}
#cqm-xno-panel.minimized .cqm-xno-head{border-bottom:none}
.cqm-xno-body{flex:1 1 auto;min-height:0;display:flex;flex-direction:row;gap:10px;overflow:auto;align-items:stretch}
.cqm-xno-id{flex:0 0 auto;padding:7px 12px;border-right:1px solid rgba(255,168,71,.14);display:grid;
  grid-template-columns:auto minmax(0,1fr);gap:3px 12px;align-items:baseline;min-width:210px;max-width:320px}
.cqm-xno-id .k{color:#d8b088;font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
.cqm-xno-id .v{color:#fff3e6;text-align:right;font-variant-numeric:tabular-nums;font-size:12px;
  line-height:1.35;overflow-wrap:anywhere;word-break:break-word}
.cqm-xno-bars{flex:1 1 auto;padding:10px 12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:8px 16px;align-content:stretch;min-width:0}
.cqm-xno-bar{display:grid;grid-template-columns:72px 1fr 42px;align-items:center;gap:8px;min-width:0}
.cqm-xno-bar .lab{color:#e8c4a0;font-size:12px;letter-spacing:.04em;text-transform:uppercase;font-weight:600}
.cqm-xno-bar .track{height:11px;border-radius:5px;background:rgba(255,168,71,.14);overflow:hidden}
.cqm-xno-bar .fill{height:100%;width:0;border-radius:5px;transition:width .25s ease}
.cqm-xno-bar .num{color:#fff3e6;text-align:right;font-size:13px;font-variant-numeric:tabular-nums;font-weight:600}
.cqm-xno-species{flex:0 0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px 12px;
  padding:10px 14px 12px;border-top:1px solid rgba(255,168,71,.18)}
.cqm-xno-sp{display:grid;grid-template-columns:14px 1fr auto;align-items:center;gap:7px;font-size:11px}
.cqm-xno-sp .dot{width:11px;height:11px;border-radius:3px;box-shadow:0 0 6px currentColor;transform:rotate(45deg)}
.cqm-xno-sp .nm{color:#e8d3bd;letter-spacing:.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cqm-xno-sp .ct{color:#fff3e6;font-variant-numeric:tabular-nums;font-weight:600}
.cqm-xno-sp.dominant .nm{color:#ffcf8a}
.cqm-xno-sp.dominant{text-shadow:0 0 8px rgba(255,170,80,.4)}
`;

/** One labelled meter; returns the fill + number nodes so {@link XenoPanel.update} can set them. */
function bar(
  parent: HTMLElement,
  label: string,
  color: string,
  doc: Document,
): { fill: HTMLElement; num: HTMLElement } {
  const row = doc.createElement('div');
  row.className = 'cqm-xno-bar';
  const lab = doc.createElement('div');
  lab.className = 'lab';
  lab.textContent = label;
  const track = doc.createElement('div');
  track.className = 'track';
  const fill = doc.createElement('div');
  fill.className = 'fill';
  fill.style.background = color;
  track.appendChild(fill);
  const num = doc.createElement('div');
  num.className = 'num';
  num.textContent = '—';
  row.append(lab, track, num);
  parent.appendChild(row);
  return { fill, num };
}

/** One id row (key/value); returns the value node. */
function idRow(parent: HTMLElement, key: string, doc: Document): HTMLElement {
  const k = doc.createElement('div');
  k.className = 'k';
  k.textContent = key;
  const v = doc.createElement('div');
  v.className = 'v';
  v.textContent = '—';
  parent.append(k, v);
  return v;
}

/** Owns the self-mounted panel. Construct ONCE (world.ts); call {@link update} each cadence. */
export class XenoPanel {
  private readonly panel: HTMLElement;
  private readonly statusEl: HTMLElement;
  private readonly id: Record<string, HTMLElement> = {};
  private readonly meter: Record<string, { fill: HTMLElement; num: HTMLElement }> = {};
  private readonly speciesRows: Array<{ row: HTMLElement; count: HTMLElement }> = [];
  private open = false;
  private minimized = false;
  private readonly doc: Document;

  constructor(doc: Document = document) {
    this.doc = doc;
    doc.getElementById('cqm-xno-toggle')?.remove();
    doc.getElementById('cqm-xno-panel')?.remove();
    injectPanelBaseCSS(doc);
    const style = doc.createElement('style');
    style.textContent = STYLE;
    doc.head.appendChild(style);

    const toggle = doc.createElement('button');
    toggle.id = 'cqm-xno-toggle';
    toggle.type = 'button';
    toggle.className = 'cqm-dock-toggle';
    toggle.textContent = '◈ XENOMIMIC';
    toggle.setAttribute('aria-label', 'Open the xenomimic ground-fauna telemetry');
    toggle.addEventListener('click', () => this.setOpen(!this.open));
    mountToggle(toggle, doc);

    const panel = doc.createElement('section');
    panel.id = 'cqm-xno-panel';
    panel.setAttribute('aria-label', 'Xenomimics (entangled ground fauna) telemetry');
    panel.innerHTML =
      `<div class="cqm-xno-head"><b>◈ 10 XENOMIMIC SPECIES</b><span class="plan" data-status>—</span>` +
      `<button class="cqm-xno-min" data-min aria-label="Minimize">MINIMIZE</button>` +
      `<button class="cqm-xno-x" data-close aria-label="Close">EXIT</button></div>` +
      `<div class="cqm-xno-body"><div class="cqm-xno-id" data-id></div>` +
      `<div class="cqm-xno-bars" data-bars></div></div>` +
      `<div class="cqm-xno-species" data-species></div>`;
    doc.body.appendChild(panel);
    this.panel = panel;
    this.statusEl = panel.querySelector('[data-status]') as HTMLElement;
    (panel.querySelector('[data-close]') as HTMLElement).addEventListener('click', () =>
      this.setOpen(false),
    );
    (panel.querySelector('[data-min]') as HTMLElement).addEventListener('click', () =>
      this.toggleMinimize(),
    );

    const id = panel.querySelector('[data-id]') as HTMLElement;
    this.id.population = idRow(id, 'Live', doc);
    this.id.pairs = idRow(id, 'Twin pairs', doc);
    this.id.dominant = idRow(id, 'Dominant', doc);
    this.id.growth = idRow(id, 'Growth →', doc);
    this.id.births = idRow(id, 'Births', doc);
    this.id.deaths = idRow(id, 'Deaths', doc);
    this.id.eaten = idRow(id, 'Eaten', doc);
    this.id.teleports = idRow(id, 'Teleports', doc);

    const bars = panel.querySelector('[data-bars]') as HTMLElement;
    // The four coupled consciousness-theory beats + the swarm's mean vitality.
    this.meter.coherence = bar(bars, 'Coherence', '#6bd5ff', doc); // quantum superposition
    this.meter.bondTension = bar(bars, 'Tug-of-war', '#ff6ab0', doc); // mimic↔anti tension
    this.meter.integration = bar(bars, 'Φ Integ', '#5ad1c4', doc); // IIT twin MI
    this.meter.freeEnergy = bar(bars, 'FEP Surprise', '#ffd166', doc); // free-energy surprise
    this.meter.meanEnergy = bar(bars, 'Vitality', '#6bff9e', doc); // mean creature energy

    const sp = panel.querySelector('[data-species]') as HTMLElement;
    for (let i = 0; i < SPECIES.length; i++) {
      const def = SPECIES[i]!;
      const row = doc.createElement('div');
      row.className = 'cqm-xno-sp';
      const color = speciesColor(def.hue);
      const dot = doc.createElement('span');
      dot.className = 'dot';
      dot.style.background = color;
      dot.style.color = color;
      const nm = doc.createElement('span');
      nm.className = 'nm';
      nm.textContent = `${def.glyph} ${def.name}`;
      const ct = doc.createElement('span');
      ct.className = 'ct';
      ct.textContent = '0';
      row.append(dot, nm, ct);
      sp.appendChild(row);
      this.speciesRows.push({ row, count: ct });
    }
  }

  get isOpen(): boolean {
    return this.open;
  }

  private setOpen(v: boolean): void {
    this.open = v;
    this.panel.classList.toggle('open', v);
  }

  private toggleMinimize(): void {
    this.minimized = !this.minimized;
    this.panel.classList.toggle('minimized', this.minimized);
  }

  /** Push one telemetry beat. Pure DOM writes; clamps every fraction into [0,1] for the bar widths. */
  update(t: XenomimicTelemetry): void {
    const clamp01 = (v: number): number => (!Number.isFinite(v) ? 0 : v < 0 ? 0 : v > 1 ? 1 : v);
    const domName = SPECIES[t.dominantSpecies]?.name ?? '—';
    this.statusEl.textContent = `${t.population} / ${t.growthTarget}`;

    this.id.population!.textContent = `${t.population}`;
    this.id.pairs!.textContent = `${t.pairs}`;
    this.id.dominant!.textContent = domName;
    this.id.growth!.textContent = `${t.growthTarget}`;
    this.id.births!.textContent = `${t.births}`;
    this.id.deaths!.textContent = `${t.deaths}`;
    this.id.eaten!.textContent = `${t.eaten}`;
    this.id.teleports!.textContent = `${t.teleports}`;

    const setBar = (key: string, frac: number): void => {
      const m = this.meter[key];
      if (!m) return;
      const f = clamp01(frac);
      m.fill.style.width = `${(f * 100).toFixed(1)}%`;
      m.num.textContent = f.toFixed(2);
    };
    setBar('coherence', t.coherence);
    setBar('bondTension', t.bondTension);
    setBar('integration', t.integration);
    setBar('freeEnergy', t.freeEnergy);
    setBar('meanEnergy', t.meanEnergy);

    for (let i = 0; i < this.speciesRows.length; i++) {
      const r = this.speciesRows[i]!;
      r.count.textContent = `${t.speciesCounts[i] ?? 0}`;
      r.row.classList.toggle('dominant', i === t.dominantSpecies && t.population > 0);
    }
  }

  dispose(): void {
    this.doc.getElementById('cqm-xno-toggle')?.remove();
    this.panel.remove();
  }
}

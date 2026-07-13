/**
 * XENOMIMIC inspector — a live cockpit over the canonical entangled-twin ground fauna.
 *
 * The panel deliberately consumes telemetry (and an optional read-only body sample) rather than
 * mutating simulation objects. The population's classical statevector, twin mutual-information, and
 * workspace-broadcast values are displayed as bounded computational indicators only: they are not
 * evidence of sentience, experience, or physical quantum effects. Animation is presentation-only —
 * it is driven by the requestAnimationFrame timestamp and telemetry, never by the seeded sim RNG,
 * so it cannot perturb determinism.
 */
import { XENO_BRAIN_HIDDEN, XENO_BRAIN_INPUTS, XENO_BRAIN_OUTPUTS } from '../sim/xenomimic-brain';
import { XENOMIMIC_MAX, XENOMIMIC_SPECIES, type XenomimicTelemetry } from '../sim/xenomimics';
import { mountToggle } from './panel-dock';
import { injectPanelBaseCSS } from './panel-shell';

/** Exact trainable width of the canonical 6→8→5 MLP: 48 + 8 + 40 + 5 = 101. */
export const XENOMIMIC_BRAIN_PARAMETERS =
  XENO_BRAIN_INPUTS * XENO_BRAIN_HIDDEN +
  XENO_BRAIN_HIDDEN +
  XENO_BRAIN_OUTPUTS * XENO_BRAIN_HIDDEN +
  XENO_BRAIN_OUTPUTS;

/** Ten bounded operational lanes drawn by the inspector radar. Asterisks denote explicit proxies. */
export const XENOMIMIC_INDICATOR_CHANNELS = [
  'POP',
  'ENER',
  'COH',
  'TWIN',
  'IIT*',
  'GWT*',
  'DIV',
  'LIFE',
  'BIRTH',
  'PORT',
] as const;

/** Per-species base hue (0..1). Shared by the swarm map, the species spectrum, and the bond lines. */
const SPECIES_HUE = [0.02, 0.09, 0.15, 0.33, 0.46, 0.53, 0.61, 0.72, 0.83, 0.94] as const;

/** One read-only body position for the live swarm map. World fills a reusable buffer; no allocation. */
export interface XenomimicBodySample {
  x: number;
  z: number;
  species: number;
  /** 0 = mimic (filled diamond), 1 = anti (hollow ring). */
  role: 0 | 1;
  pairId: number;
  /** Bounded metabolic energy 0..1. */
  energy: number;
}

/**
 * Canonical population telemetry plus optional presentation context supplied by World later.
 * Optional values never invent simulation state: absent fields render as an em dash or zero.
 */
export interface XenomimicPanelTelemetry extends XenomimicTelemetry {
  /** Explicit maximum used by the population meter. Missing values use {@link XENOMIMIC_MAX}. */
  maxPopulation?: number;
  /** Optional aggregate body activation, normalized 0..1. */
  activity?: number;
  /** Optional aggregate prediction error, normalized 0..1. */
  predictionError?: number;
  /** Optional environment context. */
  weather?: string;
  temperature?: number;
  wind?: number;
  /** Optional cross-substrate link receipt once a canonical connectome is wired. */
  links?: number;
  /** Optional caller-computed lanes, ordered like {@link XENOMIMIC_INDICATOR_CHANNELS}. */
  indicatorScores?: ArrayLike<number>;
  /** Optional live body sample for the swarm map (read-only; only the first {@link bodyCount} used). */
  bodies?: ArrayLike<XenomimicBodySample>;
  /** How many entries of {@link bodies} are valid this frame. */
  bodyCount?: number;
  /** World half-extent used to project body x/z into the map. */
  worldRadius?: number;
}

interface XenomimicPanelLifecycleHost {
  __cqmXenomimicPanelDispose?: () => void;
}

const STYLE_ID = 'cqm-xenomimic-panel-style';
const TOGGLE_ID = 'cqm-xenomimic-toggle';
const PANEL_ID = 'cqm-xenomimic-panel';
const INDICATOR_COUNT = XENOMIMIC_INDICATOR_CHANNELS.length;
const HISTORY = 160;

const STYLE = `
#cqm-xenomimic-toggle{border-color:rgba(255,120,80,.58);background:linear-gradient(180deg,rgba(34,12,10,.92),rgba(18,6,8,.88));color:#ffd0c0;
  animation:cqm-xenomimic-breathe 3.4s ease-in-out infinite}
@keyframes cqm-xenomimic-breathe{0%,100%{box-shadow:0 2px 14px rgba(220,80,40,.35)}50%{box-shadow:0 2px 22px rgba(255,120,60,.7)}}
#cqm-xenomimic-toggle:hover{transform:scale(1.06);background:rgba(48,16,12,.95)}
#cqm-xenomimic-toggle:focus-visible{outline:2px solid #ff7848;outline-offset:2px}
#cqm-xenomimic-panel{position:fixed;left:var(--cqm-hud-left,calc(clamp(180px,19vw,260px) + 16px));
  right:var(--cqm-hud-right,calc(clamp(220px,23vw,340px) + 16px));
  top:auto;bottom:var(--cqm-hud-bottom,calc(var(--cqm-bottom-h,108px) + 130px));transform:none;
  z-index:71;width:auto;max-width:none;max-height:var(--cqm-hud-height,min(84vh,1040px));display:none;flex-direction:column;
  border:1px solid rgba(255,120,80,.34);border-radius:12px;background:rgba(12,5,8,.96);backdrop-filter:blur(12px);
  box-shadow:0 10px 46px rgba(0,0,0,.7);font:11px/1.45 var(--font-mono,ui-monospace,monospace);color:#ffe8e0;overflow:hidden}
#cqm-xenomimic-panel:not(.neural){max-height:min(84vh,1040px)}
@media (max-width:640px){#cqm-xenomimic-panel:not(.neural){max-height:min(80vh,900px)}}
#cqm-xenomimic-panel.open{display:flex}
@media (max-width:640px){
#cqm-xenomimic-panel{left:auto;top:auto;right:10px;bottom:calc(var(--cqm-bottom-h,108px) + 130px);transform:none;width:min(94vw,326px);max-height:min(66vh,480px)}
}
.cqm-xenomimic-head{display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid rgba(255,120,80,.24);background:rgba(46,14,12,.8)}
.cqm-xenomimic-head b{font-size:13px;letter-spacing:.12em;color:#ffb090;white-space:nowrap}
.cqm-xenomimic-head .tag{margin-left:auto;font-weight:700;letter-spacing:.1em;padding:1px 8px;border-radius:9px;background:rgba(0,0,0,.35);color:#ffc8a0}
.cqm-xenomimic-x,.cqm-xenomimic-min{background:rgba(12,4,6,.9);color:#ffd0c0;border:1px solid rgba(255,120,80,.3);border-radius:5px;
  font:11px var(--font-mono,ui-monospace,monospace);padding:2px 7px;cursor:pointer}
.cqm-xenomimic-x:focus-visible,.cqm-xenomimic-min:focus-visible{outline:1px solid #ff7848}
#cqm-xenomimic-panel.minimized{height:auto !important;max-height:52px !important;min-height:0 !important}
#cqm-xenomimic-panel.minimized .cqm-xenomimic-body{display:none}
#cqm-xenomimic-panel.minimized .cqm-xenomimic-head{border-bottom:none}
.cqm-xenomimic-body{flex:1 1 auto;min-height:0;display:flex;flex-direction:row;gap:10px;overflow:auto;align-items:stretch;padding:10px}
.cqm-xenomimic-stage{flex:1.7 1 0;min-width:0;min-height:340px;display:flex;flex-direction:column;gap:10px}
.cqm-xenomimic-mapwrap{position:relative;flex:1 1 auto;min-height:210px;border:1px solid rgba(255,120,80,.22);border-radius:10px;
  background:radial-gradient(circle at 50% 46%,rgba(255,92,44,.12),rgba(2,0,6,.86));overflow:hidden}
.cqm-xenomimic-map{display:block;width:100%;height:100%}
.cqm-xenomimic-strip{flex:0 0 auto;display:grid;grid-template-columns:1.3fr 1.3fr 1fr;gap:10px}
.cqm-xenomimic-cell{position:relative;min-height:120px;border:1px solid rgba(255,120,80,.18);border-radius:9px;
  background:linear-gradient(180deg,rgba(30,10,10,.5),rgba(6,2,5,.72));overflow:hidden}
.cqm-xenomimic-cell canvas{display:block;width:100%;height:100%}
.cqm-xenomimic-cell .celllab{position:absolute;top:5px;left:8px;font-size:9px;letter-spacing:.14em;color:#ffb89c;
  text-transform:uppercase;opacity:.8;pointer-events:none}
.cqm-xenomimic-side{flex:1 1 0;min-width:230px;max-width:360px;display:flex;flex-direction:column;gap:10px;overflow:auto}
.cqm-xenomimic-id{flex:0 0 auto;padding:7px 12px;border:1px solid rgba(255,120,80,.16);border-radius:9px;display:grid;
  grid-template-columns:auto minmax(0,1fr);gap:3px 12px;align-items:baseline;min-width:210px}
.cqm-xenomimic-id .k{color:#c89a88;font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
.cqm-xenomimic-id .v{color:#fff0e8;text-align:right;font-variant-numeric:tabular-nums;font-size:12px;
  line-height:1.35;overflow-wrap:anywhere;word-break:break-word}
.cqm-xenomimic-bars{flex:1 1 auto;padding:10px 12px;border:1px solid rgba(255,120,80,.16);border-radius:9px;
  display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:8px 16px;align-content:start;min-width:0}
.cqm-xenomimic-bar{display:grid;grid-template-columns:72px 1fr 42px;align-items:center;gap:8px;min-width:0}
.cqm-xenomimic-bar .lab{color:#e8b8a0;font-size:12px;letter-spacing:.04em;text-transform:uppercase;font-weight:600}
.cqm-xenomimic-bar .track{height:11px;border-radius:5px;background:rgba(255,120,80,.14);overflow:hidden}
.cqm-xenomimic-bar .fill{height:100%;width:0;border-radius:5px;transition:width .25s ease;background:linear-gradient(90deg,#ff6a3a,#ffc070)}
.cqm-xenomimic-bar .num{color:#fff0e8;text-align:right;font-size:13px;font-variant-numeric:tabular-nums;font-weight:600}
.cqm-xenomimic-radar-wrap{grid-column:1/-1;position:relative;height:132px;min-height:132px;border:1px solid rgba(255,120,80,.18);
  border-radius:8px;background:radial-gradient(circle at 50% 52%,rgba(255,92,44,.1),rgba(2,0,5,.72));overflow:hidden}
.cqm-xenomimic-radar{display:block;width:100%;height:100%}
.cqm-xenomimic-foot{padding:6px 12px;border-top:1px solid rgba(255,120,80,.18);color:#c89880;font-size:10px;letter-spacing:.04em}
`;

function finite01(value: number | undefined, fallback = 0): number {
  const n = value !== undefined && Number.isFinite(value) ? value : fallback;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function hsla(h: number, s: number, l: number, a: number): string {
  return `hsla(${(h * 360).toFixed(0)},${(s * 100).toFixed(0)}%,${(l * 100).toFixed(0)}%,${a})`;
}

/**
 * Project canonical telemetry into ten finite, bounded operational lanes without allocation. O(10).
 * Caller-supplied scores override individual fallbacks. These are explanatory indicators only.
 */
export function projectXenomimicIndicators(
  telemetry: XenomimicPanelTelemetry,
  out: Float32Array,
): Float32Array {
  if (out.length < INDICATOR_COUNT) {
    throw new RangeError(`Xenomimic indicator output needs ${INDICATOR_COUNT} lanes`);
  }
  const max = Math.max(1, telemetry.maxPopulation ?? XENOMIMIC_MAX);
  const population = finite01(telemetry.population / max);
  const energy = finite01(telemetry.meanEnergy);
  const coherence = finite01(telemetry.coherence);
  const tension = finite01(telemetry.bondTension);
  const integration = finite01(telemetry.integration);
  const broadcast = finite01(tension * integration);
  const species = telemetry.speciesCounts;
  let occupied = 0;
  for (let i = 0; i < XENOMIMIC_SPECIES; i++) if ((species[i] ?? 0) > 0) occupied++;
  const diversity = finite01(occupied / XENOMIMIC_SPECIES);
  const lifecycle = finite01(
    1 - telemetry.deaths / Math.max(1, telemetry.births + telemetry.deaths),
  );
  const births = finite01(telemetry.births / Math.max(1, max));
  const teleports = finite01(telemetry.teleports / Math.max(1, telemetry.population));
  const fallback = [
    population,
    energy,
    coherence,
    tension,
    integration,
    broadcast,
    diversity,
    lifecycle,
    births,
    teleports,
  ];
  for (let i = 0; i < INDICATOR_COUNT; i++) {
    out[i] = finite01(telemetry.indicatorScores?.[i], fallback[i] ?? 0);
  }
  return out;
}

function el<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  cls?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = doc.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function bar(
  doc: Document,
  label: string,
): { root: HTMLElement; fill: HTMLElement; num: HTMLElement } {
  const root = el(doc, 'div', 'cqm-xenomimic-bar');
  root.appendChild(el(doc, 'span', 'lab', label));
  const track = el(doc, 'div', 'track');
  const fill = el(doc, 'div', 'fill');
  track.appendChild(fill);
  root.appendChild(track);
  const num = el(doc, 'span', 'num', '—');
  root.appendChild(num);
  return { root, fill, num };
}

function setBar(ref: { fill: HTMLElement; num: HTMLElement }, value: number, label: string): void {
  const bounded = finite01(value);
  ref.fill.style.width = `${(bounded * 100).toFixed(0)}%`;
  ref.num.textContent = label;
}

/** Fit a canvas's backing store to its CSS box at device resolution; returns CSS-pixel size. */
function fitCanvas(cv: HTMLCanvasElement, dpr: number): { w: number; h: number } {
  const w = cv.clientWidth || cv.width;
  const h = cv.clientHeight || cv.height;
  const bw = Math.max(1, Math.round(w * dpr));
  const bh = Math.max(1, Math.round(h * dpr));
  if (cv.width !== bw) cv.width = bw;
  if (cv.height !== bh) cv.height = bh;
  return { w, h };
}

/** Lifecycle-owned XENOMIMIC dock toggle and live cockpit inspector. */
export class XenomimicPanel {
  private readonly ac = new AbortController();
  private readonly doc: Document | null;
  private readonly view: (Window & typeof globalThis) | null;
  private readonly lifecycleHost: XenomimicPanelLifecycleHost | null;
  private readonly disposeHook = (): void => this.dispose();
  private readonly panel: HTMLElement | null;
  private readonly toggle: HTMLButtonElement | null;
  private readonly style: HTMLStyleElement | null;
  private readonly idVals: HTMLElement[] = [];
  private readonly bars: ReturnType<typeof bar>[] = [];
  private readonly foot: HTMLElement | null;
  private readonly map: HTMLCanvasElement | null;
  private readonly speciesCanvas: HTMLCanvasElement | null;
  private readonly spark: HTMLCanvasElement | null;
  private readonly life: HTMLCanvasElement | null;
  private readonly radar: HTMLCanvasElement | null;
  private readonly indicatorScratch = new Float32Array(INDICATOR_COUNT);
  private readonly radarAnim = new Float32Array(INDICATOR_COUNT);
  private readonly speciesAnim = new Float32Array(XENOMIMIC_SPECIES);
  private readonly popHist = new Float32Array(HISTORY);
  private readonly tgtHist = new Float32Array(HISTORY);
  private histLen = 0;
  private dpr = 1;
  private raf = 0;
  private last: XenomimicPanelTelemetry | null = null;
  private disposed = false;

  constructor(doc?: Document) {
    this.doc = doc ?? (typeof document !== 'undefined' ? document : null);
    if (!this.doc) {
      this.view = null;
      this.lifecycleHost = null;
      this.panel = null;
      this.toggle = null;
      this.style = null;
      this.foot = null;
      this.map = null;
      this.speciesCanvas = null;
      this.spark = null;
      this.life = null;
      this.radar = null;
      return;
    }

    const owner = this.doc.defaultView ?? globalThis;
    this.view = owner as Window & typeof globalThis;
    this.dpr = Math.min(2, this.view.devicePixelRatio || 1);
    this.lifecycleHost = owner as unknown as XenomimicPanelLifecycleHost;
    this.lifecycleHost.__cqmXenomimicPanelDispose?.();
    this.doc.getElementById(TOGGLE_ID)?.remove();
    this.doc.getElementById(PANEL_ID)?.remove();
    this.doc.getElementById(STYLE_ID)?.remove();

    injectPanelBaseCSS(this.doc);
    const style = this.doc.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLE;
    this.doc.head.appendChild(style);
    this.style = style;

    const toggle = this.doc.createElement('button');
    toggle.id = TOGGLE_ID;
    toggle.type = 'button';
    toggle.className = 'cqm-dock-toggle';
    toggle.textContent = '◈ XENOMIMIC';
    toggle.title = 'Inspect the canonical Xenomimic twin swarm';
    toggle.setAttribute('aria-label', 'Open Xenomimic inspector');
    toggle.setAttribute('aria-expanded', 'false');
    mountToggle(toggle, this.doc);
    this.toggle = toggle;

    const panel = el(this.doc, 'section');
    panel.id = PANEL_ID;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Xenomimic entangled-twin fauna inspector');
    this.doc.body.appendChild(panel);
    this.panel = panel;

    const head = el(this.doc, 'div', 'cqm-xenomimic-head');
    head.appendChild(el(this.doc, 'b', undefined, '◈ XENOMIMIC'));
    head.appendChild(el(this.doc, 'span', 'tag', 'INDICATOR ONLY'));
    const min = el(this.doc, 'button', 'cqm-xenomimic-min', 'MINIMIZE');
    min.type = 'button';
    min.setAttribute('aria-label', 'Minimize Xenomimic inspector');
    const close = el(this.doc, 'button', 'cqm-xenomimic-x', 'EXIT');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close Xenomimic inspector');
    head.append(min, close);
    panel.appendChild(head);

    const body = el(this.doc, 'div', 'cqm-xenomimic-body');

    // ── Hero stage: live swarm map + a strip of species / population / lifecycle cells ──
    const stage = el(this.doc, 'div', 'cqm-xenomimic-stage');
    const mapWrap = el(this.doc, 'div', 'cqm-xenomimic-mapwrap');
    const map = el(this.doc, 'canvas', 'cqm-xenomimic-map');
    map.setAttribute('role', 'img');
    map.setAttribute(
      'aria-label',
      'Live top-down map of the entangled twin swarm; mimic and anti bodies of each pair are joined by a bond line',
    );
    mapWrap.appendChild(map);
    mapWrap.appendChild(el(this.doc, 'span', 'celllab', 'ENTANGLED SWARM'));
    stage.appendChild(mapWrap);
    this.map = map;

    const strip = el(this.doc, 'div', 'cqm-xenomimic-strip');
    const speciesCell = el(this.doc, 'div', 'cqm-xenomimic-cell');
    const speciesCanvas = el(this.doc, 'canvas');
    speciesCell.appendChild(speciesCanvas);
    speciesCell.appendChild(el(this.doc, 'span', 'celllab', 'Species Spectrum'));
    const sparkCell = el(this.doc, 'div', 'cqm-xenomimic-cell');
    const spark = el(this.doc, 'canvas');
    sparkCell.appendChild(spark);
    sparkCell.appendChild(el(this.doc, 'span', 'celllab', 'Population · Target'));
    const lifeCell = el(this.doc, 'div', 'cqm-xenomimic-cell');
    const life = el(this.doc, 'canvas');
    lifeCell.appendChild(life);
    lifeCell.appendChild(el(this.doc, 'span', 'celllab', 'Lifecycle Flow'));
    strip.append(speciesCell, sparkCell, lifeCell);
    stage.appendChild(strip);
    this.speciesCanvas = speciesCanvas;
    this.spark = spark;
    this.life = life;
    body.appendChild(stage);

    // ── Side rail: vitals readout, energetics bars, and the bounded honest radar ──
    const side = el(this.doc, 'div', 'cqm-xenomimic-side');
    const identity = el(this.doc, 'div', 'cqm-xenomimic-id');
    for (const key of [
      'Living',
      'Pairs',
      'Target',
      'Species',
      'Brain',
      'Dominant',
      'Eaten',
      'Teleports',
      'Weather',
    ]) {
      identity.appendChild(el(this.doc, 'span', 'k', key));
      const value = el(this.doc, 'span', 'v', '—');
      identity.appendChild(value);
      this.idVals.push(value);
    }
    side.appendChild(identity);

    const bars = el(this.doc, 'div', 'cqm-xenomimic-bars');
    for (const label of ['POP', 'ENERGY', 'COHER', 'TENSION', 'INTEGR', 'FEP', 'GROWTH']) {
      const meter = bar(this.doc, label);
      bars.appendChild(meter.root);
      this.bars.push(meter);
    }
    const radarWrap = el(this.doc, 'div', 'cqm-xenomimic-radar-wrap');
    const radar = el(this.doc, 'canvas', 'cqm-xenomimic-radar');
    radar.setAttribute('role', 'img');
    radar.setAttribute(
      'aria-label',
      'Ten bounded computational indicators for the canonical Xenomimic population; not evidence of sentience or physical quantum effects',
    );
    radarWrap.appendChild(radar);
    bars.appendChild(radarWrap);
    this.radar = radar;
    side.appendChild(bars);
    body.appendChild(side);
    panel.appendChild(body);

    this.foot = el(
      this.doc,
      'div',
      'cqm-xenomimic-foot',
      'indicator only · deterministic classical statevector · no sentience claim',
    );
    panel.appendChild(this.foot);

    toggle.addEventListener('click', () => this.setOpen(!panel.classList.contains('open')), {
      signal: this.ac.signal,
    });
    min.addEventListener('click', () => this.onMinimize(), {
      signal: this.ac.signal,
    });
    close.addEventListener('click', () => this.setOpen(false), { signal: this.ac.signal });
    this.lifecycleHost.__cqmXenomimicPanelDispose = this.disposeHook;
  }

  private onMinimize(): void {
    if (!this.panel) return;
    const minimized = this.panel.classList.toggle('minimized');
    if (minimized) this.stopLoop();
    else if (this.panel.classList.contains('open')) this.startLoop();
  }

  private setOpen(open: boolean): void {
    if (!this.panel || !this.toggle || this.disposed) return;
    this.panel.classList.toggle('open', open);
    this.panel.classList.toggle('cqm-hud-vis', open);
    this.panel.classList.remove('minimized');
    this.toggle.classList.toggle('on', open);
    this.toggle.setAttribute('aria-expanded', String(open));
    if (open) this.startLoop();
    else this.stopLoop();
  }

  /** Whether the cockpit is live — World gates the (cheap) body sample on this. */
  isOpen(): boolean {
    return !!this.panel?.classList.contains('open') && !this.disposed;
  }

  private startLoop(): void {
    if (this.raf || !this.view || typeof this.view.requestAnimationFrame !== 'function') return;
    const frame = (ts: number): void => {
      this.raf = 0;
      if (this.disposed || !this.isOpen()) return;
      this.paint(ts);
      this.raf = this.view!.requestAnimationFrame(frame);
    };
    this.raf = this.view.requestAnimationFrame(frame);
  }

  private stopLoop(): void {
    if (this.raf && this.view?.cancelAnimationFrame) this.view.cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** Refresh DOM readouts and push the sparkline history at the sim cadence. O(species). */
  update(telemetry: XenomimicPanelTelemetry): void {
    this.last = telemetry;
    if (!this.panel?.classList.contains('open') || this.disposed) return;
    const values = this.idVals;
    values[0]!.textContent = `${telemetry.population}/${telemetry.maxPopulation ?? XENOMIMIC_MAX}`;
    values[1]!.textContent = String(telemetry.pairs);
    values[2]!.textContent = String(telemetry.growthTarget);
    values[3]!.textContent = String(XENOMIMIC_SPECIES);
    values[4]!.textContent = `${XENOMIMIC_BRAIN_PARAMETERS}p · 3q classical`;
    values[5]!.textContent = String(telemetry.dominantSpecies);
    values[6]!.textContent = String(telemetry.eaten);
    values[7]!.textContent = String(telemetry.teleports);
    values[8]!.textContent = telemetry.weather ?? '—';
    const max = Math.max(1, telemetry.maxPopulation ?? XENOMIMIC_MAX);
    setBar(this.bars[0]!, telemetry.population / max, String(telemetry.population));
    setBar(this.bars[1]!, telemetry.meanEnergy, telemetry.meanEnergy.toFixed(2));
    setBar(this.bars[2]!, telemetry.coherence, telemetry.coherence.toFixed(2));
    setBar(this.bars[3]!, telemetry.bondTension, telemetry.bondTension.toFixed(2));
    setBar(this.bars[4]!, telemetry.integration, telemetry.integration.toFixed(2));
    setBar(this.bars[5]!, telemetry.freeEnergy, telemetry.freeEnergy.toFixed(2));
    setBar(this.bars[6]!, telemetry.growthTarget / max, String(telemetry.growthTarget));
    // Roll the population/target history ring for the sparkline.
    const idx = this.histLen % HISTORY;
    this.popHist[idx] = telemetry.population;
    this.tgtHist[idx] = telemetry.growthTarget;
    this.histLen++;
    if (this.foot) {
      this.foot.textContent =
        `indicator only · ${telemetry.population} live · ${telemetry.pairs} pairs · ` +
        `B${telemetry.births}/D${telemetry.deaths}/E${telemetry.eaten} · ` +
        `${telemetry.teleports} Born-rule teleports · FEP ${telemetry.freeEnergy.toFixed(2)} · ` +
        `${XENOMIMIC_BRAIN_PARAMETERS}p shared twin brain`;
    }
    if (!this.raf) this.startLoop();
  }

  /** One presentation frame: all five canvases. Timestamp is rAF-supplied, never sim RNG. */
  private paint(ts: number): void {
    if (this.dpr <= 0 && this.view) this.dpr = Math.min(2, this.view.devicePixelRatio || 1);
    const t = ts / 1000;
    if (this.last) {
      this.drawSwarm(t, this.last);
      this.drawSpecies(this.last);
      this.drawSpark(this.last);
      this.drawLifecycle(t, this.last);
      this.drawRadar(this.last, t);
    }
  }

  /** Live top-down swarm map: ground-wave field, twin bond lines, mimic/anti glyphs, radar sweep. */
  private drawSwarm(t: number, telemetry: XenomimicPanelTelemetry): void {
    const canvas = this.map;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { w, h } = fitCanvas(canvas, this.dpr);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(3,0,7,.9)';
    ctx.fillRect(0, 0, w, h);
    const cx = w * 0.5;
    const cy = h * 0.5;
    const R = Math.max(40, telemetry.worldRadius ?? 600);
    const scale = (Math.min(w, h) * 0.46) / R;

    // Ground-wave field — a faint animated lattice conveying the terrain the swarm rides.
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,120,70,.05)';
    const step = Math.max(18, Math.min(w, h) / 12);
    for (let gx = (cx % step) - step; gx < w; gx += step) {
      const wob = Math.sin(gx * 0.04 + t * 0.9) * 3;
      ctx.beginPath();
      ctx.moveTo(gx + wob, 0);
      ctx.lineTo(gx - wob, h);
      ctx.stroke();
    }
    for (let gy = (cy % step) - step; gy < h; gy += step) {
      const wob = Math.cos(gy * 0.04 + t * 0.7) * 3;
      ctx.beginPath();
      ctx.moveTo(0, gy + wob);
      ctx.lineTo(w, gy - wob);
      ctx.stroke();
    }

    const bodies = telemetry.bodies;
    const count = Math.min(telemetry.bodyCount ?? 0, bodies?.length ?? 0);
    const coherence = finite01(telemetry.coherence);
    if (bodies && count > 0) {
      // Pair the bodies by id so mimic↔anti bond lines can be drawn. Reused map, ≤count entries.
      const byPair = new Map<number, { x: number; y: number }>();
      for (let i = 0; i < count; i++) {
        const b = bodies[i]!;
        const px = cx + b.x * scale;
        const py = cy + b.z * scale;
        const existing = byPair.get(b.pairId);
        if (existing) {
          const hue = SPECIES_HUE[b.species % XENOMIMIC_SPECIES] ?? 0.05;
          const grad = ctx.createLinearGradient(existing.x, existing.y, px, py);
          grad.addColorStop(0, hsla(hue, 0.9, 0.6, 0.15 + coherence * 0.5));
          grad.addColorStop(0.5, hsla(hue + 0.5, 0.9, 0.72, 0.1 + coherence * 0.55));
          grad.addColorStop(1, hsla(hue, 0.9, 0.6, 0.15 + coherence * 0.5));
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1 + coherence * 1.6;
          ctx.beginPath();
          ctx.moveTo(existing.x, existing.y);
          ctx.lineTo(px, py);
          ctx.stroke();
          byPair.delete(b.pairId);
        } else {
          byPair.set(b.pairId, { x: px, y: py });
        }
      }
      // Glyphs: mimic (role 0) = filled diamond, anti (role 1) = hollow ring.
      for (let i = 0; i < count; i++) {
        const b = bodies[i]!;
        const px = cx + b.x * scale;
        const py = cy + b.z * scale;
        const hue = SPECIES_HUE[b.species % XENOMIMIC_SPECIES] ?? 0.05;
        const e = finite01(b.energy);
        const size = 2.4 + e * 4.2;
        ctx.shadowColor = hsla(hue, 0.95, 0.6, 0.9);
        ctx.shadowBlur = 6 + e * 8;
        if (b.role === 0) {
          ctx.fillStyle = hsla(hue, 0.95, 0.5 + e * 0.25, 0.95);
          ctx.beginPath();
          ctx.moveTo(px, py - size);
          ctx.lineTo(px + size, py);
          ctx.lineTo(px, py + size);
          ctx.lineTo(px - size, py);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.strokeStyle = hsla(hue + 0.02, 0.95, 0.66 + e * 0.2, 0.95);
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = 'rgba(255,190,170,.4)';
      ctx.font = '12px ui-monospace,monospace';
      ctx.textAlign = 'center';
      ctx.fillText('streaming the live swarm…', cx, cy);
      ctx.textAlign = 'left';
    }

    // Rotating radar sweep — decorative, phase from the rAF clock only.
    const sweep = t * 0.6;
    const sweepGrad = ctx.createConicGradient(sweep, cx, cy);
    sweepGrad.addColorStop(0, 'rgba(255,120,60,.16)');
    sweepGrad.addColorStop(0.08, 'rgba(255,120,60,0)');
    sweepGrad.addColorStop(1, 'rgba(255,120,60,0)');
    ctx.fillStyle = sweepGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(w, h) * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,220,205,.85)';
    ctx.font = '10px ui-monospace,monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${count} bodies · ${telemetry.pairs} pairs`, w - 8, h - 7);
    ctx.textAlign = 'left';
  }

  /** Ten species columns, height eased toward live count; the dominant species pulses. */
  private drawSpecies(telemetry: XenomimicPanelTelemetry): void {
    const canvas = this.speciesCanvas;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { w, h } = fitCanvas(canvas, this.dpr);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const counts = telemetry.speciesCounts;
    let maxc = 1;
    for (let i = 0; i < XENOMIMIC_SPECIES; i++) maxc = Math.max(maxc, counts[i] ?? 0);
    const padL = 6;
    const padB = 16;
    const padT = 18;
    const gap = 3;
    const bw = (w - padL * 2 - gap * (XENOMIMIC_SPECIES - 1)) / XENOMIMIC_SPECIES;
    const base = h - padB;
    const usable = base - padT;
    for (let i = 0; i < XENOMIMIC_SPECIES; i++) {
      const target = (counts[i] ?? 0) / maxc;
      this.speciesAnim[i] =
        (this.speciesAnim[i] ?? 0) + (target - (this.speciesAnim[i] ?? 0)) * 0.14;
      const bh = Math.max(1, (this.speciesAnim[i] ?? 0) * usable);
      const x = padL + i * (bw + gap);
      const hue = SPECIES_HUE[i] ?? 0.05;
      const dominant = i === telemetry.dominantSpecies;
      ctx.fillStyle = hsla(hue, 0.85, dominant ? 0.62 : 0.5, dominant ? 0.98 : 0.82);
      ctx.fillRect(x, base - bh, bw, bh);
      if (dominant) {
        ctx.strokeStyle = 'rgba(255,240,225,.9)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 0.5, base - bh - 0.5, bw + 1, bh + 1);
      }
      ctx.fillStyle = 'rgba(255,220,205,.7)';
      ctx.font = '8px ui-monospace,monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(counts[i] ?? 0), x + bw / 2, base + 11);
    }
    ctx.textAlign = 'left';
  }

  /** Population vs growth-target sparkline over the rolling history ring. */
  private drawSpark(telemetry: XenomimicPanelTelemetry): void {
    const canvas = this.spark;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { w, h } = fitCanvas(canvas, this.dpr);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const n = Math.min(this.histLen, HISTORY);
    if (n < 2) return;
    const padT = 18;
    const padB = 8;
    const padX = 6;
    const usable = h - padT - padB;
    const max = Math.max(1, telemetry.maxPopulation ?? XENOMIMIC_MAX);
    const at = (ring: Float32Array, k: number): number => {
      const start = this.histLen <= HISTORY ? 0 : this.histLen % HISTORY;
      return ring[(start + k) % HISTORY] ?? 0;
    };
    const xOf = (k: number): number => padX + (k / (n - 1)) * (w - padX * 2);
    const yOf = (v: number): number => padT + usable - finite01(v / max) * usable;

    // Growth-target guide (dashed).
    ctx.strokeStyle = 'rgba(120,200,255,.45)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k < n; k++) {
      const x = xOf(k);
      const y = yOf(at(this.tgtHist, k));
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Population — filled area + line.
    ctx.beginPath();
    ctx.moveTo(xOf(0), h - padB);
    for (let k = 0; k < n; k++) ctx.lineTo(xOf(k), yOf(at(this.popHist, k)));
    ctx.lineTo(xOf(n - 1), h - padB);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padT, 0, h - padB);
    grad.addColorStop(0, 'rgba(255,120,60,.4)');
    grad.addColorStop(1, 'rgba(255,120,60,.02)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,150,90,.95)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let k = 0; k < n; k++) {
      const x = xOf(k);
      const y = yOf(at(this.popHist, k));
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Current head marker.
    const hx = xOf(n - 1);
    const hy = yOf(at(this.popHist, n - 1));
    ctx.fillStyle = 'rgba(255,225,205,1)';
    ctx.beginPath();
    ctx.arc(hx, hy, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,220,205,.85)';
    ctx.font = '9px ui-monospace,monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${telemetry.population} / ${telemetry.growthTarget}`, w - 6, h - 10);
    ctx.textAlign = 'left';
  }

  /** Four lifecycle gauges (births / deaths / eaten / teleports) with a flowing highlight. */
  private drawLifecycle(t: number, telemetry: XenomimicPanelTelemetry): void {
    const canvas = this.life;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { w, h } = fitCanvas(canvas, this.dpr);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const rows: { lab: string; val: number; hue: number }[] = [
      { lab: 'BIRTH', val: telemetry.births, hue: 0.33 },
      { lab: 'DEATH', val: telemetry.deaths, hue: 0.0 },
      { lab: 'EATEN', val: telemetry.eaten, hue: 0.08 },
      { lab: 'PORT', val: telemetry.teleports, hue: 0.55 },
    ];
    let maxv = 1;
    for (const r of rows) maxv = Math.max(maxv, r.val);
    const padT = 20;
    const padX = 8;
    const rowH = (h - padT - 6) / rows.length;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!;
      const y = padT + i * rowH + rowH * 0.5;
      const trackW = w - padX * 2 - 46;
      const x0 = padX + 40;
      ctx.fillStyle = 'rgba(255,190,170,.85)';
      ctx.font = '9px ui-monospace,monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(r.lab, padX, y);
      ctx.fillStyle = 'rgba(255,120,80,.12)';
      ctx.fillRect(x0, y - 4, trackW, 8);
      const frac = r.val / maxv;
      const fw = Math.max(1, frac * trackW);
      ctx.fillStyle = hsla(r.hue, 0.85, 0.55, 0.92);
      ctx.fillRect(x0, y - 4, fw, 8);
      // Flowing highlight along the filled portion.
      const flow = ((t * 0.35 + i * 0.25) % 1) * fw;
      ctx.fillStyle = 'rgba(255,255,240,.55)';
      ctx.fillRect(x0 + flow, y - 4, 3, 8);
      ctx.fillStyle = 'rgba(255,230,215,.95)';
      ctx.textAlign = 'right';
      ctx.fillText(String(r.val), w - padX, y);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  /** Draw the ten bounded indicators; pulse and sweep are rAF-clock only, never sim RNG. */
  private drawRadar(telemetry: XenomimicPanelTelemetry, t = 0): void {
    const canvas = this.radar;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    projectXenomimicIndicators(telemetry, this.indicatorScratch);
    const { w, h } = fitCanvas(canvas, this.dpr);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const cx = w * 0.5;
    const cy = h * 0.55;
    const radius = Math.min(w * 0.34, h * 0.36);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(3,0,7,.82)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,150,110,.16)';
    ctx.lineWidth = 1;
    for (let ring = 1; ring <= 4; ring++) {
      ctx.beginPath();
      for (let i = 0; i < INDICATOR_COUNT; i++) {
        const angle = -Math.PI / 2 + (i / INDICATOR_COUNT) * Math.PI * 2;
        const rr = radius * (ring / 4);
        const x = cx + Math.cos(angle) * rr;
        const y = cy + Math.sin(angle) * rr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
    // Ease the drawn polygon toward the true indicators so it breathes with the data.
    const pulse = 0.97 + Math.sin(t * 1.6) * 0.03;
    ctx.strokeStyle = 'rgba(255,110,62,.95)';
    ctx.fillStyle = 'rgba(255,82,42,.24)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255,110,60,.55)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let i = 0; i < INDICATOR_COUNT; i++) {
      const target = this.indicatorScratch[i]!;
      this.radarAnim[i] = (this.radarAnim[i] ?? 0) + (target - (this.radarAnim[i] ?? 0)) * 0.16;
      const angle = -Math.PI / 2 + (i / INDICATOR_COUNT) * Math.PI * 2;
      const rr = radius * (this.radarAnim[i] ?? 0) * pulse;
      const x = cx + Math.cos(angle) * rr;
      const y = cy + Math.sin(angle) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Rotating highlight spoke.
    const spoke = (-Math.PI / 2 + t * 0.5) % (Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,210,180,.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(spoke) * radius, cy + Math.sin(spoke) * radius);
    ctx.stroke();
    ctx.font = '10px ui-monospace,monospace';
    ctx.fillStyle = 'rgba(255,218,202,.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < INDICATOR_COUNT; i++) {
      const angle = -Math.PI / 2 + (i / INDICATOR_COUNT) * Math.PI * 2;
      ctx.fillText(
        XENOMIMIC_INDICATOR_CHANNELS[i]!,
        cx + Math.cos(angle) * radius * 1.24,
        cy + Math.sin(angle) * radius * 1.24,
      );
    }
    ctx.font = '9px ui-monospace,monospace';
    ctx.fillStyle = 'rgba(255,210,192,.82)';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('INDICATOR ONLY | CLASSICAL SIMULATION | NOT SENTIENCE', cx, 11);
    ctx.textAlign = 'left';
  }

  /** Last telemetry reference, for diagnostics and focused tests. */
  lastTelemetry(): XenomimicPanelTelemetry | null {
    return this.last;
  }

  /** Idempotently remove listeners and every stable-id node/style owned by this panel. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopLoop();
    this.ac.abort();
    this.panel?.remove();
    this.toggle?.remove();
    this.style?.remove();
    if (this.lifecycleHost?.__cqmXenomimicPanelDispose === this.disposeHook) {
      delete this.lifecycleHost.__cqmXenomimicPanelDispose;
    }
  }
}

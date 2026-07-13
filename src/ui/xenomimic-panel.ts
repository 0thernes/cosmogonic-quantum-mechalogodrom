/**
 * XENOMIMIC inspector — a read-only view of the canonical entangled-twin ground fauna.
 *
 * The panel deliberately consumes telemetry rather than simulation objects. The population's
 * classical statevector, twin mutual-information, and workspace-broadcast values are displayed as
 * bounded computational indicators only: they are not evidence of sentience, experience, or physical
 * quantum effects.
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
}

interface XenomimicPanelLifecycleHost {
  __cqmXenomimicPanelDispose?: () => void;
}

const STYLE_ID = 'cqm-xenomimic-panel-style';
const TOGGLE_ID = 'cqm-xenomimic-toggle';
const PANEL_ID = 'cqm-xenomimic-panel';
const INDICATOR_COUNT = XENOMIMIC_INDICATOR_CHANNELS.length;

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
.cqm-xenomimic-body{flex:1 1 auto;min-height:0;display:flex;flex-direction:row;gap:10px;overflow:auto;align-items:stretch}
.cqm-xenomimic-id{flex:0 0 auto;padding:7px 12px;border-right:1px solid rgba(255,120,80,.14);display:grid;
  grid-template-columns:auto minmax(0,1fr);gap:3px 12px;align-items:baseline;min-width:210px;max-width:320px}
.cqm-xenomimic-id .k{color:#c89a88;font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
.cqm-xenomimic-id .v{color:#fff0e8;text-align:right;font-variant-numeric:tabular-nums;font-size:12px;
  line-height:1.35;overflow-wrap:anywhere;word-break:break-word}
.cqm-xenomimic-bars{flex:1 1 auto;padding:10px 12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:8px 16px;align-content:stretch;min-width:0}
.cqm-xenomimic-bar{display:grid;grid-template-columns:72px 1fr 42px;align-items:center;gap:8px;min-width:0}
.cqm-xenomimic-bar .lab{color:#e8b8a0;font-size:12px;letter-spacing:.04em;text-transform:uppercase;font-weight:600}
.cqm-xenomimic-bar .track{height:11px;border-radius:5px;background:rgba(255,120,80,.14);overflow:hidden}
.cqm-xenomimic-bar .fill{height:100%;width:0;border-radius:5px;transition:width .25s ease;background:linear-gradient(90deg,#ff6a3a,#ffc070)}
.cqm-xenomimic-bar .num{color:#fff0e8;text-align:right;font-size:13px;font-variant-numeric:tabular-nums;font-weight:600}
.cqm-xenomimic-radar-wrap{grid-column:1/-1;position:relative;height:132px;min-height:132px;border:1px solid rgba(255,120,80,.18);
  border-radius:8px;background:radial-gradient(circle at 50% 52%,rgba(255,92,44,.1),rgba(2,0,5,.72));overflow:hidden}
.cqm-xenomimic-radar{display:block;width:100%;height:132px}
.cqm-xenomimic-foot{padding:6px 12px;border-top:1px solid rgba(255,120,80,.18);color:#c89880;font-size:10px;letter-spacing:.04em}
`;

function finite01(value: number | undefined, fallback = 0): number {
  const n = value !== undefined && Number.isFinite(value) ? value : fallback;
  return n < 0 ? 0 : n > 1 ? 1 : n;
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

/** Lifecycle-owned XENOMIMIC dock toggle and read-only inspector. */
export class XenomimicPanel {
  private readonly ac = new AbortController();
  private readonly doc: Document | null;
  private readonly lifecycleHost: XenomimicPanelLifecycleHost | null;
  private readonly disposeHook = (): void => this.dispose();
  private readonly panel: HTMLElement | null;
  private readonly toggle: HTMLButtonElement | null;
  private readonly style: HTMLStyleElement | null;
  private readonly idVals: HTMLElement[] = [];
  private readonly bars: ReturnType<typeof bar>[] = [];
  private readonly foot: HTMLElement | null;
  private readonly radar: HTMLCanvasElement | null;
  private readonly indicatorScratch = new Float32Array(INDICATOR_COUNT);
  private last: XenomimicPanelTelemetry | null = null;
  private disposed = false;

  constructor(doc?: Document) {
    this.doc = doc ?? (typeof document !== 'undefined' ? document : null);
    if (!this.doc) {
      this.lifecycleHost = null;
      this.panel = null;
      this.toggle = null;
      this.style = null;
      this.foot = null;
      this.radar = null;
      return;
    }

    const owner = this.doc.defaultView ?? globalThis;
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
    toggle.title = 'Inspect canonical Xenomimic twin telemetry';
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
    body.appendChild(identity);

    const bars = el(this.doc, 'div', 'cqm-xenomimic-bars');
    for (const label of ['POP', 'ENERGY', 'COHER', 'TENSION', 'INTEGR', 'FEP', 'GROWTH']) {
      const meter = bar(this.doc, label);
      bars.appendChild(meter.root);
      this.bars.push(meter);
    }
    const radarWrap = el(this.doc, 'div', 'cqm-xenomimic-radar-wrap');
    const radar = el(this.doc, 'canvas', 'cqm-xenomimic-radar');
    radar.width = 640;
    radar.height = 264;
    radar.setAttribute('role', 'img');
    radar.setAttribute(
      'aria-label',
      'Ten bounded computational indicators for the canonical Xenomimic population; not evidence of sentience or physical quantum effects',
    );
    radarWrap.appendChild(radar);
    bars.appendChild(radarWrap);
    this.radar = radar;
    body.appendChild(bars);
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
    min.addEventListener('click', () => panel.classList.toggle('minimized'), {
      signal: this.ac.signal,
    });
    close.addEventListener('click', () => this.setOpen(false), { signal: this.ac.signal });
    this.lifecycleHost.__cqmXenomimicPanelDispose = this.disposeHook;
  }

  private setOpen(open: boolean): void {
    if (!this.panel || !this.toggle || this.disposed) return;
    this.panel.classList.toggle('open', open);
    this.panel.classList.toggle('cqm-hud-vis', open);
    this.toggle.classList.toggle('on', open);
    this.toggle.setAttribute('aria-expanded', String(open));
    if (open && this.last) this.drawRadar(this.last);
  }

  /** Update visible values and the bounded radar. O(10) outside the DOM writes. */
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
    this.drawRadar(telemetry);
    if (this.foot) {
      this.foot.textContent =
        `indicator only · ${telemetry.population} live · ${telemetry.pairs} pairs · ` +
        `B${telemetry.births}/D${telemetry.deaths}/E${telemetry.eaten} · ` +
        `${telemetry.teleports} Born-rule teleports · FEP ${telemetry.freeEnergy.toFixed(2)} · ` +
        `${XENOMIMIC_BRAIN_PARAMETERS}p shared twin brain`;
    }
  }

  /** Draw deterministic telemetry only; there is no decorative clock or random animation. */
  private drawRadar(telemetry: XenomimicPanelTelemetry): void {
    const canvas = this.radar;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    projectXenomimicIndicators(telemetry, this.indicatorScratch);
    const width = canvas.width;
    const height = canvas.height;
    const cx = width * 0.5;
    const cy = height * 0.53;
    const radius = Math.min(width * 0.31, height * 0.34);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(3,0,7,.82)';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255,150,110,.16)';
    ctx.lineWidth = 2;
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
    ctx.strokeStyle = 'rgba(255,110,62,.92)';
    ctx.fillStyle = 'rgba(255,82,42,.25)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < INDICATOR_COUNT; i++) {
      const angle = -Math.PI / 2 + (i / INDICATOR_COUNT) * Math.PI * 2;
      const rr = radius * this.indicatorScratch[i]!;
      const x = cx + Math.cos(angle) * rr;
      const y = cy + Math.sin(angle) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.font = '19px ui-monospace,monospace';
    ctx.fillStyle = 'rgba(255,218,202,.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < INDICATOR_COUNT; i++) {
      const angle = -Math.PI / 2 + (i / INDICATOR_COUNT) * Math.PI * 2;
      ctx.fillText(
        XENOMIMIC_INDICATOR_CHANNELS[i]!,
        cx + Math.cos(angle) * radius * 1.28,
        cy + Math.sin(angle) * radius * 1.28,
      );
    }
    ctx.font = '17px ui-monospace,monospace';
    ctx.fillStyle = 'rgba(255,210,192,.82)';
    ctx.fillText('INDICATOR ONLY | CLASSICAL SIMULATION | NOT SENTIENCE', cx, 17);
  }

  /** Last telemetry reference, for diagnostics and focused tests. */
  lastTelemetry(): XenomimicPanelTelemetry | null {
    return this.last;
  }

  /** Idempotently remove listeners and every stable-id node/style owned by this panel. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.ac.abort();
    this.panel?.remove();
    this.toggle?.remove();
    this.style?.remove();
    if (this.lifecycleHost?.__cqmXenomimicPanelDispose === this.disposeHook) {
      delete this.lifecycleHost.__cqmXenomimicPanelDispose;
    }
  }
}

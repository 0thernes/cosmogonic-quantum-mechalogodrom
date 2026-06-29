/**
 * ⟁ ARCHITECTURE — the Dome's super-creature architecture cycler (GOAL: "101 Super Creatures …
 * cycled through with their dynamics and data visuals … in a separate button for the Architecture
 * Button in the Dome"). A self-mounting, ominous inspector that lets you walk the entire pantheon —
 * the 50 SISTERS, the 50 BROTHERS, and the lone APEX ς — and the BROOD of freak children begotten by
 * the asexual/inbred/hybrid game-theory mating ritual, each rendered as LIVE DYNAMICS (its de Jong
 * strange attractor, its π₁ winding loop, its Blaschke boundary) beside its DATA genome (umbral
 * spectrum, homotopy invariants, Lyapunov exponent, ritual equilibrium, rarity).
 *
 * All maths lives in `sim/pantheon-breeding.ts`; this is a UI shell — three.js-free, canvas-2D only,
 * no sim coupling. It reads the deterministic breeding module directly, so the world only has to
 * construct it (one line). Randomness for the rites flows through a seeded {@link mulberry32}; no
 * `Math.random` / `Date.now`, so a session's brood is reproducible. NOT sentient — a data viewer.
 */
import {
  PANTHEON_TOTAL,
  breed,
  breedAt,
  randomBreeding,
  lineageAt,
  isApex,
  apexTranscendence,
  babyAttractorPath,
  babyLoopPath,
  babyBlaschkeImage,
  babyUmbralCoeffs,
  type BabyGenome,
  type LineageGlyph,
} from '../sim/pantheon-breeding';
import {
  createApexBrain,
  type ApexBrainSnapshot,
  APEX_BRAIN_ROADMAP_PARAMS,
  APEX_BRAIN_START_PARAMS,
  PANTHEON_GLYPH_BRAIN_PARAMS,
} from '../sim/apex-brain';
import { mulberry32, type Rng } from '../math/rng';
import { mountToggle } from './panel-dock';

type View = 'lineage' | 'brood';
type VizMode = 'attractor' | 'loop' | 'blaschke' | 'brain4d';

const RANK_COLOR: Record<string, string> = {
  COMMON: '#7d8aa0',
  RARE: '#5ad1c4',
  MYTHIC: '#a04bff',
  FORBIDDEN: '#ff3b4e',
};

/** Responsive canvas height for the Architecture dynamics viewport. */
export const ARCHITECTURE_PANEL_CANVAS_HEIGHT = 'clamp(170px, 30vh, 280px)';
/** Minimum usable data well; prevents the table from becoming the old thin strip. */
export const ARCHITECTURE_PANEL_DATA_MIN_HEIGHT = '180px';
/** Keep the canvas inside the panel box; the clamp controls its height. */
export const ARCHITECTURE_PANEL_CANVAS_FLEX = '0 0 auto';
/** Let the data well consume the bounded panel body and scroll internally. */
export const ARCHITECTURE_PANEL_DATA_HEIGHT = '100%';

const STYLE = `
#cqm-arch-toggle{height:42px;padding:0 12px;border-radius:21px;border:1px solid rgba(255,59,78,.5);
  background:rgba(10,4,8,.9);color:#ffb3bd;font:600 11px/1 var(--font-mono,ui-monospace,monospace);
  letter-spacing:.12em;cursor:pointer;backdrop-filter:blur(6px);box-shadow:0 2px 14px rgba(0,0,0,.6);
  transition:transform .15s,background .15s;animation:cqm-arch-pulse 4.2s ease-in-out infinite}
@keyframes cqm-arch-pulse{0%,100%{box-shadow:0 2px 14px rgba(160,40,80,.3)}50%{box-shadow:0 2px 22px rgba(255,59,78,.6)}}
#cqm-arch-toggle:hover{transform:scale(1.06);background:rgba(26,6,14,.96)}
#cqm-arch-toggle:focus-visible{outline:2px solid #ff3b4e;outline-offset:2px}
#cqm-arch-panel{position:fixed;right:10px;bottom:calc(var(--cqm-bottom-h,108px) + 130px);z-index:71;width:min(95vw,720px);display:none;
  flex-direction:column;border:1px solid rgba(255,59,78,.32);border-radius:12px;background:rgba(4,3,7,.97);
  backdrop-filter:blur(12px);box-shadow:0 10px 48px rgba(0,0,0,.78);color:#d8cce6;overflow:hidden;
  font:12px/1.5 var(--font-mono,ui-monospace,monospace)}
#cqm-arch-panel.open{display:flex}
/* center-hud owns this panel's geometry (it's a launcher SLOT): it re-homes the panel into the centred
   HUD slot with !important left/right/bottom/height. We deliberately DON'T fight that height here (an
   earlier .live override was higher-specificity and broke the slot fit); the body scrolls instead. */
.cqm-arch-head{display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid rgba(255,59,78,.22);
  background:linear-gradient(90deg,rgba(34,6,14,.9),rgba(20,4,30,.85))}
.cqm-arch-head b{font-size:11px;letter-spacing:.16em;color:#ff8a98;white-space:nowrap}
.cqm-arch-head .rank{margin-left:auto;font-weight:700;letter-spacing:.1em;padding:1px 8px;border-radius:9px;background:rgba(0,0,0,.4)}
.cqm-arch-x{background:rgba(6,4,8,.9);color:#ffb3bd;border:1px solid rgba(255,59,78,.3);border-radius:5px;
  font:11px var(--font-mono,ui-monospace,monospace);padding:2px 7px;cursor:pointer}
.cqm-arch-x:focus-visible{outline:1px solid #ff3b4e}
.cqm-arch-subj{display:flex;align-items:center;gap:8px;padding:6px 10px;border-bottom:1px solid rgba(255,59,78,.14)}
.cqm-arch-glyph{font-size:30px;line-height:1;width:46px;text-align:center;text-shadow:0 0 14px currentColor}
.cqm-arch-idwrap{flex:1 1 auto;min-width:0}
.cqm-arch-name{font-weight:700;color:#f3e9ff;letter-spacing:.06em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cqm-arch-sub{font-size:9.5px;color:#9b8fb4;letter-spacing:.04em}
.cqm-arch-nav{display:flex;gap:4px}
.cqm-arch-btn{background:rgba(20,6,14,.92);color:#ffb3bd;border:1px solid rgba(255,90,107,.4);border-radius:5px;
  font:600 11px/1 var(--font-mono,ui-monospace,monospace);padding:5px 8px;cursor:pointer;white-space:nowrap}
.cqm-arch-btn:hover{background:rgba(40,10,22,.96)}
.cqm-arch-btn:focus-visible{outline:1px solid #ff5a6b}
.cqm-arch-btn.on{background:rgba(80,16,40,.96);color:#fff}
.cqm-arch-bar{display:flex;gap:4px;padding:6px 10px;flex-wrap:wrap;border-bottom:1px solid rgba(255,59,78,.12)}
.cqm-arch-main{flex:1 1 0;min-height:0;display:flex;flex-wrap:wrap;align-items:stretch;overflow:hidden}
.cqm-arch-viz{flex:1 1 320px;min-width:min(100%,280px);min-height:0;display:flex;flex-direction:column;overflow:hidden;
  border-right:1px solid rgba(255,59,78,.12);background:rgba(10,3,12,.45)}
.cqm-arch-canvas{display:block;width:100%;height:${ARCHITECTURE_PANEL_CANVAS_HEIGHT};max-height:${ARCHITECTURE_PANEL_CANVAS_HEIGHT};min-height:170px;
  flex:${ARCHITECTURE_PANEL_CANVAS_FLEX};background:radial-gradient(120% 90% at 50% 0%,rgba(30,4,18,.6),rgba(2,2,5,1));border-bottom:1px solid rgba(255,59,78,.14)}
.cqm-arch-mode{display:flex;gap:4px;padding:6px 10px;border-bottom:1px solid rgba(255,59,78,.12);flex:0 0 auto}
.cqm-arch-data{flex:1 1 270px;min-width:min(100%,250px);min-height:${ARCHITECTURE_PANEL_DATA_MIN_HEIGHT};height:${ARCHITECTURE_PANEL_DATA_HEIGHT};max-height:100%;overflow-y:auto;
  padding:8px 12px 12px;display:grid;grid-template-columns:auto minmax(90px,1fr);gap:3px 12px;align-items:baseline}
.cqm-arch-data .k{color:#9b7fb4;font-size:9.5px;letter-spacing:.04em;text-transform:uppercase}
.cqm-arch-data .v{color:#ece2ff;text-align:right;font-variant-numeric:tabular-nums;font-size:10px}
.cqm-arch-data .sec{grid-column:1/-1;margin-top:5px;color:#ff8a98;font-size:9px;letter-spacing:.18em;
  border-bottom:1px dotted rgba(255,90,107,.25);padding-bottom:2px}
@media (max-width:900px){
  .cqm-arch-main{overflow-y:auto;display:block;align-items:initial}
  .cqm-arch-viz{border-right:0;border-bottom:1px solid rgba(255,59,78,.12)}
  .cqm-arch-canvas{height:clamp(150px,28vh,220px);max-height:none;flex:none}
  .cqm-arch-data{height:auto;max-height:none;min-height:220px;overflow:visible}
}
`;

/** Make an element with optional class + text. */
function el<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  cls?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = doc.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/**
 * The self-mounting ⟁ ARCHITECTURE cycler. Construct ONCE (world.ts). It builds its own dock toggle
 * and panel, breeds children on demand, and animates the current subject's dynamics while open.
 */
export class PantheonArchitecturePanel {
  private readonly panel: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly styleEl: HTMLStyleElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly glyphEl: HTMLElement;
  private readonly nameEl: HTMLElement;
  private readonly subEl: HTMLElement;
  private readonly rankEl: HTMLElement;
  private readonly data: HTMLElement;
  private readonly viewBtns: Record<View, HTMLElement> = {} as Record<View, HTMLElement>;
  private readonly modeBtns: Record<VizMode, HTMLElement> = {} as Record<VizMode, HTMLElement>;

  private readonly rng: Rng = mulberry32(0x5161_4d41); // "ΣQMA" — deterministic rite stream
  private nonce = 1;
  private readonly brood: BabyGenome[] = [];
  private view: View = 'lineage';
  private lineageIdx = 100; // open on the APEX ς
  private broodIdx = 0;
  private mode: VizMode = 'attractor';
  /** When the apex ς is selected, its warmed Entropic-Tesseract-Hydra brain snapshot (else null). */
  private apexSnap: ApexBrainSnapshot | null = null;

  // Animation buffers for the current subject (widened to ArrayBufferLike for the viz returns).
  private attractor: Float64Array = new Float64Array(0);
  private loop: Float64Array = new Float64Array(0);
  private blaschke: Float64Array = new Float64Array(0);
  private reveal = 0;
  private hue = 0;
  private open = false;
  private raf = 0;

  constructor(doc: Document = document) {
    doc.getElementById('cqm-arch-toggle')?.remove();
    doc.getElementById('cqm-arch-panel')?.remove();
    const style = doc.createElement('style');
    style.textContent = STYLE;
    doc.head.appendChild(style);
    this.styleEl = style;

    const toggle = el(doc, 'button', undefined, '⟁ ARCHITECTURE');
    toggle.id = 'cqm-arch-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Open the super-creature Architecture cycler');
    toggle.addEventListener('click', () => this.setOpen(!this.open));
    mountToggle(toggle, doc);

    const panel = el(doc, 'section');
    panel.id = 'cqm-arch-panel';
    panel.setAttribute('aria-label', '101 Super Creatures — architecture, dynamics and brood');
    this.panel = panel;

    // Header
    const head = el(doc, 'div', 'cqm-arch-head');
    head.appendChild(el(doc, 'b', undefined, '⟁ ARCHITECTURE'));
    this.rankEl = el(doc, 'span', 'rank', '—');
    const close = el(doc, 'button', 'cqm-arch-x', '✕');
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', () => this.setOpen(false));
    head.append(this.rankEl, close);
    panel.appendChild(head);

    // Subject row: ◀  glyph  name/sub  ▶
    const subj = el(doc, 'div', 'cqm-arch-subj');
    const prev = el(doc, 'button', 'cqm-arch-btn', '◀');
    prev.setAttribute('aria-label', 'Previous creature');
    prev.addEventListener('click', () => this.step(-1));
    this.glyphEl = el(doc, 'div', 'cqm-arch-glyph', 'ς');
    const idwrap = el(doc, 'div', 'cqm-arch-idwrap');
    this.nameEl = el(doc, 'div', 'cqm-arch-name', '—');
    this.subEl = el(doc, 'div', 'cqm-arch-sub', '—');
    idwrap.append(this.nameEl, this.subEl);
    const next = el(doc, 'button', 'cqm-arch-btn', '▶');
    next.setAttribute('aria-label', 'Next creature');
    next.addEventListener('click', () => this.step(1));
    subj.append(prev, this.glyphEl, idwrap, next);
    panel.appendChild(subj);

    // View + ritual controls
    const bar = el(doc, 'div', 'cqm-arch-bar');
    this.viewBtns.lineage = this.makeToggle(doc, 'PANTHEON', () => this.setView('lineage'));
    this.viewBtns.brood = this.makeToggle(doc, 'BROOD 0', () => this.setView('brood'));
    const mate = el(doc, 'button', 'cqm-arch-btn', '⚯ MATE');
    mate.title = 'Breed the selected creature by the game-theory rite';
    mate.addEventListener('click', () => this.mate());
    const storm = el(doc, 'button', 'cqm-arch-btn', '⚯ STORM ×6');
    storm.title = 'Loose six random rites into the brood';
    storm.addEventListener('click', () => this.storm(6));
    bar.append(this.viewBtns.lineage, this.viewBtns.brood, mate, storm);
    panel.appendChild(bar);

    // Main body: dynamics viewport + readable data well.
    const main = el(doc, 'div', 'cqm-arch-main');
    const viz = el(doc, 'div', 'cqm-arch-viz');

    // Dynamics canvas
    this.canvas = el(doc, 'canvas', 'cqm-arch-canvas');
    this.canvas.width = 372;
    this.canvas.height = 160;
    this.ctx = this.canvas.getContext('2d');
    viz.appendChild(this.canvas);

    // Viz-mode switch
    const modeRow = el(doc, 'div', 'cqm-arch-mode');
    this.modeBtns.attractor = this.makeToggle(doc, 'ATTRACTOR', () => this.setMode('attractor'));
    this.modeBtns.loop = this.makeToggle(doc, 'WINDING', () => this.setMode('loop'));
    this.modeBtns.blaschke = this.makeToggle(doc, 'BLASCHKE', () => this.setMode('blaschke'));
    this.modeBtns.brain4d = this.makeToggle(doc, '⬡ MEGA 4D', () => this.setMode('brain4d'));
    modeRow.append(
      this.modeBtns.attractor,
      this.modeBtns.loop,
      this.modeBtns.blaschke,
      this.modeBtns.brain4d,
    );
    viz.appendChild(modeRow);

    // Data grid
    this.data = el(doc, 'div', 'cqm-arch-data');
    main.append(viz, this.data);
    panel.appendChild(main);

    doc.body.appendChild(panel);
    this.syncToggles();
    this.select();
  }

  private makeToggle(doc: Document, label: string, on: () => void): HTMLElement {
    const b = el(doc, 'button', 'cqm-arch-btn', label);
    b.type = 'button';
    b.addEventListener('click', on);
    return b;
  }

  get isOpen(): boolean {
    return this.open;
  }

  private setOpen(v: boolean): void {
    this.open = v;
    this.panel.classList.toggle('open', v);
    if (v) this.startAnim();
    else this.stopAnim();
  }

  private setView(v: View): void {
    this.view = v;
    this.syncToggles();
    this.select();
  }
  private setMode(m: VizMode): void {
    this.mode = m;
    this.reveal = 0;
    this.syncToggles();
  }

  private syncToggles(): void {
    this.viewBtns.lineage.classList.toggle('on', this.view === 'lineage');
    this.viewBtns.brood.classList.toggle('on', this.view === 'brood');
    this.viewBtns.brood.textContent = `BROOD ${this.brood.length}`;
    for (const m of ['attractor', 'loop', 'blaschke', 'brain4d'] as VizMode[]) {
      this.modeBtns[m].classList.toggle('on', this.mode === m);
    }
  }

  /** Step the current collection's cursor by `d` (wraps). */
  private step(d: number): void {
    if (this.view === 'lineage') {
      this.lineageIdx =
        (((this.lineageIdx + d) % PANTHEON_TOTAL) + PANTHEON_TOTAL) % PANTHEON_TOTAL;
    } else if (this.brood.length > 0) {
      this.broodIdx =
        (((this.broodIdx + d) % this.brood.length) + this.brood.length) % this.brood.length;
    }
    this.select();
  }

  /** Ring-cap the brood before adding `incoming` more so a long MATE/STORM session can't grow it
   * without bound (each entry retains four genome sub-structures). Oldest rites fall off the front. */
  private capBrood(incoming: number): void {
    const over = this.brood.length + incoming - 256;
    if (over > 0) this.brood.splice(0, over);
  }

  /** Breed the selected lineage creature with a panel-rng partner; show the child. */
  private mate(): void {
    const a =
      this.view === 'lineage' ? this.lineageIdx : (this.brood[this.broodIdx]?.parents[0] ?? 0);
    const child = this.makeChild(a);
    this.capBrood(1);
    this.brood.push(child);
    this.broodIdx = this.brood.length - 1;
    this.view = 'brood';
    this.syncToggles();
    this.select();
  }

  /** A rite anchored on parent index `a` with a partner drawn from the seeded stream. */
  private makeChild(a: number): BabyGenome {
    const roll = this.rng();
    let b: number;
    if (roll < 0.16)
      b = a; // asexual self-rite
    else if (roll < 0.5) {
      // inbred — same kin block (sisters 0..49 share, brothers 50..99 share)
      const block = a < 50 ? 0 : a < 100 ? 50 : 0;
      b = a >= 100 ? Math.floor(this.rng() * 100) : block + Math.floor(this.rng() * 50);
    } else b = Math.floor(this.rng() * PANTHEON_TOTAL); // hybrid (may pull the apex)
    return breedAt(a, b, this.nonce++);
  }

  /** Loose `n` random rites into the brood and jump to the rarest of them. */
  private storm(n: number): void {
    this.capBrood(n);
    let rarest = -1;
    let rarestRarity = -1;
    for (let i = 0; i < n; i++) {
      const child = randomBreeding(this.rng);
      this.brood.push(child);
      if (child.rarity > rarestRarity) {
        rarestRarity = child.rarity;
        rarest = this.brood.length - 1;
      }
    }
    this.broodIdx = rarest >= 0 ? rarest : this.brood.length - 1;
    this.view = 'brood';
    this.syncToggles();
    this.select();
  }

  /** The genome currently being inspected — a lineage self-portrait, or a brood child. */
  private currentGenome(): { genome: BabyGenome; glyph: string; title: string; sub: string } {
    if (this.view === 'brood' && this.brood.length > 0) {
      const g = this.brood[this.broodIdx]!;
      const rite = g.ritual.asexual ? 'ASEXUAL' : g.ritual.inbreeding >= 0.45 ? 'INBRED' : 'HYBRID';
      return {
        genome: g,
        glyph: g.glyphs[0] + g.glyphs[1],
        title: g.name,
        sub: `${rite} · ${g.ritual.archetype} · child ${this.broodIdx + 1}/${this.brood.length}`,
      };
    }
    // Lineage view: a deterministic asexual self-portrait gives every creature its own dynamics.
    const ln: LineageGlyph = lineageAt(this.lineageIdx);
    const genome = breed(ln, ln, 0);
    let sub = `${ln.kin.toUpperCase()} · ${ln.script} · #${ln.index + 1}/101`;
    if (isApex(ln)) {
      const t = apexTranscendence(0);
      sub = `APEX ABOMINATION · Sim ${t.simulation} · →1B neurons @ LV1000`;
    }
    return { genome, glyph: ln.glyph, title: isApex(ln) ? 'ς · FINAL SIGMA' : ln.name, sub };
  }

  /** Refresh the subject: rebuild data + animation buffers. */
  private select(): void {
    const { genome, glyph, title, sub } = this.currentGenome();
    this.glyphEl.textContent = glyph;
    this.hue = genome.hue;
    const col = `hsl(${(genome.hue * 360).toFixed(0)},85%,66%)`;
    this.glyphEl.style.color = col;
    this.nameEl.textContent = title;
    this.subEl.textContent = sub;
    this.rankEl.textContent = genome.rank;
    const rc = RANK_COLOR[genome.rank] ?? '#aaa';
    this.rankEl.style.color = rc;
    this.rankEl.style.background = rc + '22';

    this.attractor = babyAttractorPath(genome, 6000);
    this.loop = babyLoopPath(genome, 360);
    this.blaschke = babyBlaschkeImage(genome, 360);
    this.reveal = 0;

    // The apex ς carries its own brain — THE ENTROPIC TESSERACT HYDRA. Warm it deterministically so
    // the cycler shows live organ telemetry (level ramps toward the Sim-3 transcendence threshold).
    this.apexSnap = null;
    if (this.view === 'lineage' && isApex(lineageAt(this.lineageIdx))) {
      const brain = createApexBrain();
      for (let i = 0; i < 64; i++) {
        brain.tick({
          threat: 0.4 + 0.3 * Math.sin(i * 0.2),
          energy: 0.6,
          chaos: 0.5 + 0.4 * Math.cos(i * 0.17),
          novelty: 0.5 + 0.4 * Math.sin(i * 0.09),
          level: i * 15,
        });
      }
      this.apexSnap = brain.snapshot();
    }
    this.renderData(genome);
  }

  private renderData(g: BabyGenome): void {
    const rows: Array<[string, string] | string> = [
      'RITUAL — EVOLUTIONARY GAME',
      ['game', g.ritual.archetype],
      ['cooperate x*', g.ritual.cooperate.toFixed(3)],
      ['entropy', g.ritual.entropy.toFixed(3)],
      ['inbreeding F', g.ritual.inbreeding.toFixed(2) + (g.ritual.asexual ? ' (asexual)' : '')],
      ['blend → A', g.blend.toFixed(3)],
      'UMBRAL — TOUCHARD / BELL',
      ['degree n', String(g.umbral.degree)],
      ['Bell B(n)', String(g.umbral.bell)],
      ['S(n,k)', babyUmbralCoeffs(g).join(' ')],
      ['Tₙ(x)', g.umbral.evaluation.toFixed(2) + ` @x=${g.umbral.x.toFixed(2)}`],
      'HOMOTOPY — π₁ & LINKING',
      ['winding', signed(g.homotopy.winding)],
      ['linking', signed(g.homotopy.linking)],
      'CHAOS — DE JONG / LYAPUNOV',
      ['λ (Lyapunov)', g.chaos.lyapunov.toFixed(4) + (g.chaos.chaotic ? ' ✦chaotic' : '')],
      ['a,b,c,d', `${g.chaos.a} ${g.chaos.b} ${g.chaos.c} ${g.chaos.d}`],
      'BLASEAN — BLASCHKE PRODUCT',
      ['degree d', String(g.blaschke.degree)],
      ['|B|=1 err', g.blaschke.boundaryError.toExponential(1)],
      'BRAIN — PARAMETER BUDGET',
      [
        'designed',
        this.lineageIdx >= 100
          ? `${bigNum(APEX_BRAIN_START_PARAMS)} start · →${bigNum(APEX_BRAIN_ROADMAP_PARAMS)} roadmap`
          : `${bigNum(PANTHEON_GLYPH_BRAIN_PARAMS)} · visual dome swarm`,
      ],
      'VERDICT',
      ['rarity', (g.rarity * 100).toFixed(0) + '%'],
      ['rank', g.rank],
    ];
    if (this.apexSnap) for (const r of apexRows(this.apexSnap)) rows.push(r);
    const doc = this.data.ownerDocument;
    this.data.replaceChildren();
    for (const r of rows) {
      if (typeof r === 'string') {
        this.data.appendChild(el(doc, 'div', 'sec', r));
      } else {
        this.data.appendChild(el(doc, 'div', 'k', r[0]));
        this.data.appendChild(el(doc, 'div', 'v', r[1]));
      }
    }
  }

  private startAnim(): void {
    if (this.raf) return;
    const tick = (): void => {
      this.frame();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
  private stopAnim(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** One animation frame — draw the current viz mode with an ominous trail. */
  private frame(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    this.resizeCanvas();
    const w = this.canvas.width;
    const h = this.canvas.height;
    // Ominous fade trail.
    ctx.fillStyle = 'rgba(2,2,5,0.16)';
    ctx.fillRect(0, 0, w, h);
    const col = `hsl(${(this.hue * 360).toFixed(0)},90%,62%)`;
    if (this.mode === 'attractor') this.drawAttractor(ctx, w, h, col);
    else if (this.mode === 'loop') this.drawLoop(ctx, w, h, col);
    else if (this.mode === 'brain4d') this.drawBrain4d(ctx, w, h);
    else this.drawBlaschke(ctx, w, h, col);
  }

  /** Match the backing canvas to the readable CSS box whenever the HUD grants more space. */
  private resizeCanvas(): void {
    const w = Math.max(260, Math.floor(this.canvas.clientWidth || this.canvas.width));
    const h = Math.max(150, Math.floor(this.canvas.clientHeight || this.canvas.height));
    if (this.canvas.width === w && this.canvas.height === h) return;
    this.canvas.width = w;
    this.canvas.height = h;
  }

  private drawAttractor(ctx: CanvasRenderingContext2D, w: number, h: number, col: string): void {
    const pts = this.attractor;
    const n = pts.length / 2;
    if (n === 0) return;
    const pad = 16;
    const sx = (w - 2 * pad) / 4; // de Jong domain ≈ [−2,2]
    const sy = (h - 2 * pad) / 4;
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.55;
    const batch = 220;
    for (let k = 0; k < batch; k++) {
      const i = (this.reveal + k) % n;
      const x = pad + (pts[2 * i]! + 2) * sx;
      const y = pad + (pts[2 * i + 1]! + 2) * sy;
      ctx.fillRect(x, y, 1.3, 1.3);
    }
    ctx.globalAlpha = 1;
    this.reveal = (this.reveal + batch) % n;
  }

  private drawLoop(ctx: CanvasRenderingContext2D, w: number, h: number, col: string): void {
    const pts = this.loop;
    const n = pts.length / 2;
    if (n === 0) return;
    const cx = w / 2;
    const cy = h / 2;
    const s = Math.min(w, h) * 0.32;
    // Axes / origin (the point winding is measured about).
    ctx.strokeStyle = 'rgba(255,90,107,0.18)';
    ctx.beginPath();
    ctx.moveTo(cx - s * 1.4, cy);
    ctx.lineTo(cx + s * 1.4, cy);
    ctx.moveTo(cx, cy - s * 1.4);
    ctx.lineTo(cx, cy + s * 1.4);
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const j = i % n;
      const x = cx + pts[2 * j]! * s;
      const y = cy - pts[2 * j + 1]! * s;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // A tracer bead sweeping the loop.
    const t = this.reveal % n;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx + pts[2 * t]! * s, cy - pts[2 * t + 1]! * s, 3, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,59,78,0.9)';
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, 2 * Math.PI);
    ctx.fill();
    this.reveal = (this.reveal + 3) % n;
  }

  private drawBlaschke(ctx: CanvasRenderingContext2D, w: number, h: number, col: string): void {
    const pts = this.blaschke;
    const n = pts.length / 2;
    if (n === 0) return;
    const cx = w / 2;
    const cy = h / 2;
    const s = Math.min(w, h) * 0.4;
    // Unit circle (B maps it to itself).
    ctx.strokeStyle = 'rgba(160,75,255,0.3)';
    ctx.beginPath();
    ctx.arc(cx, cy, s, 0, 2 * Math.PI);
    ctx.stroke();
    // The boundary image B(e^{it}) — winds `degree` times around the circle.
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const upto = Math.min(n, this.reveal);
    for (let i = 0; i <= upto; i++) {
      const j = i % n;
      const x = cx + pts[2 * j]! * s;
      const y = cy - pts[2 * j + 1]! * s;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    if (upto < n) this.reveal += 6;
    else this.reveal = 0;
  }

  /** 4D spiking tesseract — bound to apex brain vitality / chaos when warmed, else genome chaos. */
  private drawBrain4d(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.fillStyle = 'rgba(2,1,8,0.35)';
    ctx.fillRect(0, 0, w, h);
    const t = this.reveal * 0.02;
    const cx = w / 2;
    const cy = h / 2;
    const scale = Math.min(w, h) * 0.36;
    const snap = this.apexSnap;
    const drive = snap
      ? clamp01(
          snap.thought.vitality * 0.4 + snap.thought.agony * 0.3 + snap.quantum.coherence * 0.3,
        )
      : clamp01(this.hue);
    const N = 96;
    const pts: { x: number; y: number; d: number; a: number; hue: number }[] = [];
    for (let i = 0; i < N; i++) {
      const u = (i + 0.5) / N;
      const th = 2 * Math.PI * u;
      const ph = Math.acos(2 * ((i * 0.618) % 1) - 1);
      const r = 0.55 + 0.45 * Math.sin(i * 0.19 + t * 1.4);
      const x4 = r * Math.sin(ph) * Math.cos(th);
      const y4 = r * Math.sin(ph) * Math.sin(th);
      const z4 = r * Math.cos(ph);
      const w4 = r * Math.sin(t * 0.47 + i * 0.11);
      const cw = Math.cos(t * 0.36);
      const sw = Math.sin(t * 0.36);
      const x3 = x4 + w4 * cw * 0.5;
      const y3 = y4 + w4 * sw * 0.44;
      const z3 = z4 + w4 * 0.25;
      const ang = t * 0.28 + w4 * 0.4;
      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);
      const x2 = x3 * cosA - z3 * sinA;
      const z2 = x3 * sinA + z3 * cosA;
      const d = 1 / (2.8 + z2);
      const px = cx + x2 * scale * d;
      const py = cy + y3 * scale * d;
      const spike = Math.max(0, Math.sin(t * 7 + i * 0.41) * 0.5 + 0.5);
      const a = clamp01(drive * 0.5 + spike * 0.45 + Math.abs(Math.sin(i * 0.31 + t)) * 0.2);
      pts.push({ x: px, y: py, d, a, hue: (i * 47 + t * 80) % 360 });
    }
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        if (((i ^ j) & 15) > 3) continue;
        const s = (pts[i]!.a + pts[j]!.a) * 0.5;
        if (s < 0.1) continue;
        const near = (pts[i]!.d + pts[j]!.d) * 0.5;
        ctx.strokeStyle = `hsla(${pts[i]!.hue},100%,55%,${(s * 0.45 * near).toFixed(2)})`;
        ctx.lineWidth = 0.5 + s * 1.8 * near;
        ctx.beginPath();
        ctx.moveTo(pts[i]!.x, pts[i]!.y);
        ctx.lineTo(pts[j]!.x, pts[j]!.y);
        ctx.stroke();
      }
    }
    for (const p of pts) {
      const near = Math.min(1, p.d * 1.2);
      if (p.a > 0.5 && near > 0.25) {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 4 + p.a * 12 * near);
        g.addColorStop(0, `hsla(${p.hue},100%,75%,${(0.35 + p.a * 0.5).toFixed(2)})`);
        g.addColorStop(1, `hsla(${p.hue},100%,50%,0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 + p.a * 12 * near, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = `hsla(${p.hue},100%,${(42 + p.a * 38).toFixed(0)}%,${(0.6 + p.a * 0.4).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.2 + p.a * 2.5 * near, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,255,220,0.85)';
    ctx.font = '600 9px ui-monospace,monospace';
    ctx.fillText('MEGA GODLIKE BRAIN · 4D tesseract · live spikes', 8, 8);
    this.reveal = (this.reveal + 1) % 10000;
  }

  dispose(): void {
    this.stopAnim();
    this.panel.remove();
    this.styleEl.remove();
    document.getElementById('cqm-arch-toggle')?.remove();
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Format a signed integer with an explicit + sign for readability. */
function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

/** Compact billions/millions formatter for the neuron counts. */
function bigNum(v: number): string {
  if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'k';
  return String(v);
}

/** Render the apex ς brain (Entropic Tesseract Hydra) snapshot as data rows for the cycler. */
function apexRows(s: ApexBrainSnapshot): Array<[string, string] | string> {
  const t = s.thought;
  return [
    'APEX BRAIN — ENTROPIC TESSERACT HYDRA',
    ['plan', `${t.plan}${t.superposed ? ' (superposed)' : ''}`],
    ['simulation', `Sim ${t.simulation} · ${(t.transcendence * 100).toFixed(0)}% → Sim 3`],
    ['vitality / agony', `${(t.vitality * 100).toFixed(0)}% / ${(t.agony * 100).toFixed(0)}%`],
    [
      'neurons',
      `${bigNum(APEX_BRAIN_START_PARAMS)} start · ${bigNum(s.designedNeurons)} designed · ${bigNum(s.liveNeurons)} live · →${bigNum(APEX_BRAIN_ROADMAP_PARAMS)} (${s.scaleName})`,
    ],
    [
      '0 quantum brain',
      `${s.quantum.qubits}q · ‖ψ‖${s.quantum.norm.toFixed(2)} · coh ${s.quantum.coherence.toFixed(2)} · ent ${s.quantum.entanglement.toFixed(2)}`,
    ],
    [
      '  ·qgt/magic',
      `QGT ${s.quantum.qgtVolume.toFixed(2)} · magic ${s.quantum.magic.toFixed(2)} · ${s.quantum.collapsed ? 'COLLAPSED' : 'superposed'}`,
    ],
    [
      '1 loom',
      `${s.loom.activeEdges}/${s.loom.builtEdges} edges · allergy ${(s.loom.allergy * 100).toFixed(0)}%`,
    ],
    ['2 drum', `E ${s.drum.energy.toFixed(2)} · mode ${s.drum.dominantMode}`],
    [
      '3 necro',
      `live ${(s.necro.liveFraction * 100).toFixed(0)}% · budget ${s.necro.budget}${s.necro.brainDead ? ' · DEAD' : ''}`,
    ],
    ['4 klein', `fold ${s.klein.headTailCorr.toFixed(2)} · seam ${s.klein.seamFlux.toFixed(2)}`],
    [
      '5 hive',
      `λ ${s.hive.lyapunov.toFixed(3)}${s.hive.chaotic ? ' ✦' : ''} · R ${s.hive.order.toFixed(2)}`,
    ],
    ['6 hydra', `${s.hydra.heads} heads · conflict ${s.hydra.conflict.toFixed(2)}`],
    ['7 wraith', `dissonance ${s.wraith.dissonance.toFixed(2)} · core ${s.wraith.core.toFixed(2)}`],
    ['8 tunnel', `${s.tunnel.manifested} edges · H ${s.tunnel.entropy.toFixed(2)}`],
    ['9 thermo', `heat ${s.thermo.totalHeat.toFixed(1)} · necrotic ${s.thermo.necrotic}`],
    [
      '10 ouroboros',
      `${s.ouroboros.limbs}/${s.ouroboros.cap} limbs · weird ${s.ouroboros.weirdness.toFixed(2)}`,
    ],
    [
      'meta',
      `resid ${s.meta.godelResidual.toFixed(3)} · |z−zT| ${s.meta.distanceToTarget.toFixed(2)} · dust ${s.meta.cantorPoints}`,
    ],
  ];
}

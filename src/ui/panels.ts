/**
 * Telemetry panel renderer + collapsible panel toggles.
 *
 * Port of the legacy stats block (lines 855-874) with Known Bug 4 fixed (all element refs are
 * cached once instead of `getElementById` every tick) and Known Bug 14 fixed (the previously
 * write-only `mutations` counter is surfaced on row `#v8`). CONTRACTS V2 adds the rows `#v9`
 * (graph-mind tribes), `#v10` (population trend per minute), and `#v11` (quantum entropy).
 */
import type { TelemetrySnapshot } from '../types';
import { sentienceTier } from '../math/scalar';
import { Sparkline } from './graphs';

/** Resolve a required element by id, failing loudly on integration mistakes. */
function mustGet(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`TelemetryPanel: missing required element #${id}`);
  return el;
}

/** Resolve a required `<canvas>` by id. */
function mustGetCanvas(id: string): HTMLCanvasElement {
  const el = mustGet(id);
  if (!(el instanceof HTMLCanvasElement)) {
    throw new Error(`TelemetryPanel: #${id} is not a <canvas>`);
  }
  return el;
}

/**
 * Sparkline redraw cadence in `update()` calls. `update` runs every ~8th frame, so every 3rd
 * call ≈ every 24 frames — the closest call-count approximation of the legacy `fc % 18` redraw.
 */
const REDRAW_EVERY = 3;

/**
 * Renders a `TelemetrySnapshot` into the stat rows `#v0..#v11` (V2 adds `#v9` TRIBES,
 * `#v10` TREND, `#v11` QBIT-S), the environment rows `#ew #ewi #et #es #ep`, and the four
 * sparklines `#g0..#g3`.
 */
export class TelemetryPanel {
  private readonly rows: readonly [
    HTMLElement, // v0 entities/max
    HTMLElement, // v1 chaos
    HTMLElement, // v2 energy
    HTMLElement, // v3 connectome links
    HTMLElement, // v4 morphs/100
    HTMLElement, // v5 algorithm
    HTMLElement, // v6 quantum
    HTMLElement, // v7 song
    HTMLElement, // v8 mutations (Known Bug 14)
    HTMLElement, // v9 tribes (V2: graph-mind communities)
    HTMLElement, // v10 trend (V2: population slope per minute)
    HTMLElement, // v11 qbit-s (V2: quantum register entropy)
  ];
  private readonly ew: HTMLElement;
  private readonly ewi: HTMLElement;
  private readonly et: HTMLElement;
  private readonly es: HTMLElement;
  private readonly ep: HTMLElement;
  /** V3: titan count row. */
  private readonly etn: HTMLElement;
  /** V4: biome sentience index row (rendered as a percentage). */
  private readonly snt: HTMLElement;
  /** V13: NHI super-mind tally row. */
  private readonly nhic: HTMLElement;
  private readonly xno: HTMLElement;
  /** V13: bottom-right View / Speed / Render readout box. */
  private readonly hudView: HTMLElement;
  private readonly hudSpeed: HTMLElement;
  private readonly hudRender: HTMLElement;
  private readonly hudMusic: HTMLElement;
  private readonly hudSfx: HTMLElement;
  private readonly hudResets: HTMLElement;
  private readonly telSim: HTMLElement;
  private readonly telSing: HTMLElement;
  /** V13 economy rows: dominant money, FX, commodity prices, wealth Gini. */
  private readonly ecd: HTMLElement;
  private readonly ecf: HTMLElement;
  private readonly ecp: HTMLElement;
  private readonly ecg: HTMLElement;
  private readonly gEntities: Sparkline;
  private readonly gChaos: Sparkline;
  private readonly gEnergy: Sparkline;
  private readonly gLinks: Sparkline;
  private tick = 0;

  /** Caches `#v0..#v11`, `#ew #ewi #et #es #ep` and builds the 4 sparklines (`#g0..#g3`). */
  constructor() {
    this.rows = [
      mustGet('v0'),
      mustGet('v1'),
      mustGet('v2'),
      mustGet('v3'),
      mustGet('v4'),
      mustGet('v5'),
      mustGet('v6'),
      mustGet('v7'),
      mustGet('v8'),
      mustGet('v9'),
      mustGet('v10'),
      mustGet('v11'),
    ];
    this.ew = mustGet('ew');
    this.ewi = mustGet('ewi');
    this.et = mustGet('et');
    this.es = mustGet('es');
    this.ep = mustGet('ep');
    this.etn = mustGet('etn');
    this.snt = mustGet('snt');
    this.nhic = mustGet('nhic');
    this.xno = mustGet('xno');
    this.hudView = mustGet('hud-view');
    this.hudSpeed = mustGet('hud-speed');
    this.hudRender = mustGet('hud-render');
    this.hudMusic = mustGet('hud-music');
    this.hudSfx = mustGet('hud-sfx');
    this.hudResets = mustGet('hud-resets');
    this.telSim = mustGet('tel-sim');
    this.telSing = mustGet('tel-sing');
    this.ecd = mustGet('ecd');
    this.ecf = mustGet('ecf');
    this.ecp = mustGet('ecp');
    this.ecg = mustGet('ecg');
    // Colors and fixed maxes mirror the legacy drawGraph calls (lines 872-873). The
    // quality-dependent maxes (MAX_E, MNN) are not known at construction time; they are kept
    // current from each snapshot in update().
    this.gEntities = new Sparkline(mustGetCanvas('g0'), 'rgba(0,200,255,1)');
    this.gChaos = new Sparkline(mustGetCanvas('g1'), 'rgba(255,80,0,1)', 100);
    this.gEnergy = new Sparkline(mustGetCanvas('g2'), 'rgba(100,255,100,1)', 0); // auto-scale
    this.gLinks = new Sparkline(mustGetCanvas('g3'), 'rgba(255,255,0,1)');
  }

  /**
   * Render one snapshot. Call ~every 8th frame (legacy `fc % 8` stats cadence); sparklines push
   * every call and redraw every {@link REDRAW_EVERY}rd call. O(1) per call plus O(samples)
   * sparkline redraws; the only allocations are the label strings the DOM requires.
   */
  update(s: TelemetrySnapshot): void {
    const r = this.rows;
    r[0].textContent = `${s.entities}/${s.maxEntities}`;
    // V62: flag CHAOS MODE (the Lorenz quantum storm) right on the chaos row.
    r[1].textContent = s.chaosMode ? `${s.chaos.toFixed(1)} ⚡STORM` : s.chaos.toFixed(1);
    r[2].textContent = s.energy.toFixed(0);
    r[3].textContent = String(s.links);
    r[4].textContent = `${s.morphs}/${s.morphTotal}`; // V3: 250 in phylum mode
    r[5].textContent = s.algoName;
    r[6].textContent = s.quantum.toFixed(3);
    r[7].textContent = s.songName;
    r[8].textContent = String(s.mutations); // Known Bug 14: surface the mutations counter
    r[9].textContent = String(s.tribes); // V2: graph-mind community count
    // V2: population trend, always signed (`+x.x/m` / `-x.x/m`). Round first so values in
    // (-0.05, 0) render as `+0.0/m` rather than `-0.0/m`.
    const trend = Math.round(s.trend * 10) / 10;
    r[10].textContent = `${trend >= 0 ? '+' : ''}${trend.toFixed(1)}/m`;
    r[11].textContent = s.qEntropy.toFixed(2); // V2: quantum register entropy 0..1
    this.ew.textContent = s.weather;
    this.ewi.textContent = s.wind.toFixed(1);
    this.et.textContent = `${s.temperature.toFixed(0)}C`;
    this.es.textContent = String(s.shoggoths);
    this.ep.textContent = String(s.puppeteers);
    this.etn.textContent = String(s.titans); // V3+: titan colossi roster
    this.nhic.textContent = String(s.nhi); // V13: launched NHI super-minds
    this.xno.textContent = String(s.xenomimics); // XENOMIMIC: live ground-fauna tally (below Entities)
    // V4 aliveness as a %, plus its named tier (F-SENTIENCE-VAR: DORMANT…TRANSCENDENT).
    this.snt.textContent = `${Math.round(s.sentience * 100)}% ${sentienceTier(s.sentience)}`;
    // V13: bottom-right View / Speed / Render box (uppercased name + ×-suffixed speed).
    this.hudView.textContent = s.viewName;
    this.hudSpeed.textContent = s.timeScale === 0 ? 'PAUSE' : `${s.timeScale}×`;
    this.hudRender.textContent = s.renderName;
    // V57: audio on/off + reset count (HUD box); sim variant + active singularity (telemetry box).
    this.hudMusic.textContent = s.musicOn ? 'ON' : 'OFF';
    this.hudSfx.textContent = s.sfxOn ? 'ON' : 'OFF';
    this.hudResets.textContent = String(s.resetCount);
    this.telSim.textContent = `N(${s.sim})`;
    this.telSing.textContent = s.singularity || '—';
    // V13 economy: dominant money + its share, FX, commodity prices, wealth Gini.
    const ec = s.econ;
    const domGlyph = ec.dominant === 'AURUM' ? '☉' : '☾';
    const domShare = ec.dominant === 'AURUM' ? ec.aurumShare : 1 - ec.aurumShare;
    this.ecd.textContent = `${domGlyph} ${Math.round(domShare * 100)}%`;
    this.ecf.textContent = ec.fx.toFixed(2);
    this.ecp.textContent = `${ec.pQuanta.toFixed(1)}/${ec.pIchor.toFixed(1)}`;
    this.ecg.textContent = ec.gini.toFixed(2);
    // Full-scale tracking: both graphs scale to the active tier's caps, which
    // the snapshot now carries directly (V3 — no more derived pairing table).
    this.gEntities.max = s.maxEntities;
    this.gLinks.max = s.maxLinks;
    // Legacy pushG calls (line 869): entities, chaos*10, energy, links.
    this.gEntities.push(s.entities);
    this.gChaos.push(s.chaos * 10);
    this.gEnergy.push(s.energy);
    this.gLinks.push(s.links);
    this.tick = (this.tick + 1) % REDRAW_EVERY;
    if (this.tick === 0) {
      this.gEntities.draw();
      this.gChaos.draw();
      this.gEnergy.draw();
      this.gLinks.draw();
    }
  }
}

/**
 * Wire up collapsible panel headers: clicking any `[data-panel-toggle]` element toggles the
 * `col` class on its parent panel (legacy `tp(id)`, line 598, minus the inline `onclick`).
 * Call once after the DOM is ready.
 */
export function bindPanelToggles(): void {
  document.querySelectorAll<HTMLElement>('[data-panel-toggle]').forEach((el) => {
    el.addEventListener('click', () => {
      el.parentElement?.classList.toggle('col');
    });
  });
}

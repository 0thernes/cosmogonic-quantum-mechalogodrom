/**
 * SUPER CREATURES (5 / pantheon) telemetry — the ⬢ ARCHITECT panel (V31+GOAL5). A self-building HUD readout that makes the
 * apex mind INSPECTABLE: identity (name · generation · 1444-param deep mind), scale (½ Titan, ~100×
 * power), the committed GOAP plan, the live emotion meters (valence / arousal / dominance), the
 * prediction-loop SURPRISE, the offspring tally, the raw intent drives, and its wallet — so the brief's
 * "it must appear in telemetry" holds. UI shell only: it never imports or mutates sim state; the world
 * pushes a {@link SuperSnapshot} + net worth each Observatory cadence via {@link update}.
 */
import type { SuperSnapshot, SuperPlan } from '../sim/super-creature';
import { SUPER_PLANS } from '../sim/super-creature';
import type { SuperMindSnapshot } from '../sim/super-mind';
import type { EvoView } from '../sim/super-evolution';
import { mountToggle } from './panel-dock';
import { injectPanelBaseCSS } from './panel-shell';
import { SuperNeural } from './super-neural';

/** Primordial petri dish telemetry — digital biologics soup, not chat. */
export interface PetriTelemetry {
  soupLive: number;
  soupCatalysis: number;
  petriBiomass: number;
  petriPhi: number;
  petriAliveness: number;
  wiringFraction: number;
  ulgResonance: number;
}

/** Plan → accent colour, so the committed goal reads at a glance (hunt-red … rest-grey). */
const PLAN_COLOR: Record<SuperPlan, string> = {
  HUNT: '#ff5a6b',
  FLEE: '#ffd166',
  DOMINATE: '#c06bff',
  DECEIVE: '#6bd5ff',
  SPAWN: '#6bff9e',
  EXPLORE: '#9fb6dd',
  REST: '#8a8aa0',
};

const STYLE = `
#cqm-sup-toggle{border-color:rgba(196,120,255,.58);background:linear-gradient(180deg,rgba(20,10,34,.92),rgba(12,6,22,.88));color:#e9c8ff;
  animation:cqm-sup-breathe 3.4s ease-in-out infinite}
@keyframes cqm-sup-breathe{0%,100%{box-shadow:0 2px 14px rgba(140,60,220,.35)}50%{box-shadow:0 2px 22px rgba(196,120,255,.7)}}
#cqm-sup-toggle:hover{transform:scale(1.06);background:rgba(34,16,54,.95)}
#cqm-sup-toggle:focus-visible{outline:2px solid #c478ff;outline-offset:2px}
#cqm-sup-panel{position:fixed;left:var(--cqm-hud-left,calc(clamp(180px,19vw,260px) + 16px));
  right:var(--cqm-hud-right,calc(clamp(220px,23vw,340px) + 16px));
  top:auto;bottom:var(--cqm-hud-bottom,calc(var(--cqm-bottom-h,108px) + 130px));transform:none;
  z-index:71;width:auto;max-width:none;max-height:var(--cqm-hud-height,min(64vh,520px));display:none;flex-direction:column;
  border:1px solid rgba(196,120,255,.34);border-radius:12px;background:rgba(8,5,16,.96);backdrop-filter:blur(12px);
  box-shadow:0 10px 46px rgba(0,0,0,.7);font:11px/1.45 var(--font-mono,ui-monospace,monospace);color:#ece2ff;overflow:hidden}
#cqm-sup-panel:not(.neural){max-height:220px}
@media (max-width:640px){#cqm-sup-panel:not(.neural){max-height:200px}}
#cqm-sup-panel.open{display:flex}
@media (max-width:640px){
#cqm-sup-panel{left:auto;top:auto;right:10px;bottom:calc(var(--cqm-bottom-h,108px) + 130px);transform:none;width:min(94vw,326px);max-height:min(66vh,480px)}
}
.cqm-sup-head{display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid rgba(196,120,255,.24);background:rgba(28,14,46,.8)}
.cqm-sup-head b{font-size:11px;letter-spacing:.14em;color:#d8a8ff;white-space:nowrap}
.cqm-sup-head .plan{margin-left:auto;font-weight:700;letter-spacing:.1em;padding:1px 8px;border-radius:9px;background:rgba(0,0,0,.35)}
.cqm-sup-neu{background:rgba(20,8,36,.9);color:#d8b8ff;border:1px solid rgba(180,120,255,.45);border-radius:5px;
  font:600 10px/1 var(--font-mono,ui-monospace,monospace);letter-spacing:.08em;padding:3px 7px;cursor:pointer;white-space:nowrap}
.cqm-sup-neu:hover{background:rgba(40,16,64,.95)}
.cqm-sup-neu:focus-visible{outline:1px solid #b98cff}
.cqm-sup-x{background:rgba(6,4,12,.9);color:#e9c8ff;border:1px solid rgba(196,120,255,.3);border-radius:5px;
  font:11px var(--font-mono,ui-monospace,monospace);padding:2px 7px;cursor:pointer}
.cqm-sup-min{background:rgba(6,4,12,.9);color:#e9c8ff;border:1px solid rgba(196,120,255,.3);border-radius:5px;
  font:11px var(--font-mono,ui-monospace,monospace);padding:2px 7px;cursor:pointer}
#cqm-sup-panel.minimized{height:auto !important;max-height:52px !important;min-height:0 !important}
#cqm-sup-panel.minimized .cqm-sup-body,
#cqm-sup-panel.minimized .cqm-sup-neural-host,
#cqm-sup-panel.minimized .cqm-sup-archons{display:none}
#cqm-sup-panel.minimized .cqm-sup-head{border-bottom:none}
.cqm-sup-x:focus-visible{outline:1px solid #c478ff}
/* V70: the data area lays out HORIZONTALLY so the short HUD strip never needs a vertical scrollbar.
   Identity column on the left; the bars wrap into a compact multi-column grid on the right. */
.cqm-sup-body{flex:1 1 auto;min-height:0;display:flex;flex-direction:row;gap:10px;overflow-x:auto;overflow-y:hidden;align-items:stretch}
.cqm-sup-id{flex:0 0 auto;padding:6px 10px;border-right:1px solid rgba(196,120,255,.14);display:grid;
  grid-template-columns:auto 1fr;gap:2px 10px;align-items:baseline;min-width:160px;max-width:220px;overflow:hidden}
.cqm-sup-id .k{color:#a98fce;font-size:10px;letter-spacing:.05em;text-transform:uppercase}
.cqm-sup-id .v{color:#f3ecff;text-align:right;font-variant-numeric:tabular-nums}
.cqm-sup-bars{flex:1 1 auto;padding:7px 10px;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:6px 14px;align-content:start;min-width:0}
.cqm-sup-bar{display:grid;grid-template-columns:58px 1fr 34px;align-items:center;gap:7px;min-width:0}
.cqm-sup-bar .lab{color:#a98fce;font-size:10px;letter-spacing:.04em;text-transform:uppercase}
.cqm-sup-bar .track{height:7px;border-radius:4px;background:rgba(196,120,255,.12);overflow:hidden}
.cqm-sup-bar .fill{height:100%;width:0;border-radius:4px;transition:width .25s ease}
.cqm-sup-bar .num{color:#f3ecff;text-align:right;font-size:10px;font-variant-numeric:tabular-nums}
/* V75: the NEURAL observatory lives in the SAME box — toggling it grows this panel and swaps the
   telemetry body for the 4-tab / 27-visual + BRAIN observatory (no second window). */
.cqm-sup-neural-host{display:none;flex:1 1 auto;min-height:0;flex-direction:column}
/* center-hud owns the shared panel slot; the .neural class lifts specificity (0,1,1,0 > 0,1,0,0)
   so the 4-tab / 27-visual observatory can temporarily expand even further when needed. Capped so it
   never runs off the viewport. */
#cqm-sup-panel.neural{height:min(var(--cqm-hud-max-height,calc(100vh - 156px)),640px)!important;
  max-height:var(--cqm-hud-max-height,calc(100vh - 156px))!important;min-height:0!important}
#cqm-sup-panel.neural .cqm-sup-body{display:none}
#cqm-sup-panel.neural .cqm-sup-neural-host{display:flex}
#cqm-sup-panel.neural .cqm-sup-neu{background:rgba(52,20,82,.95);color:#f3ecff}
`;

/** One labelled meter; returns the fill + number nodes so {@link SuperPanel.update} can set them. */
function bar(
  parent: HTMLElement,
  label: string,
  color: string,
  doc: Document,
): { fill: HTMLElement; num: HTMLElement } {
  const row = doc.createElement('div');
  row.className = 'cqm-sup-bar';
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
export class SuperPanel {
  private readonly panel: HTMLElement;
  private readonly planEl: HTMLElement;
  private readonly id: Record<string, HTMLElement> = {};
  private readonly meter: Record<string, { fill: HTMLElement; num: HTMLElement }> = {};
  /** V75: the apex creature's NEURAL observatory — now mounted INSIDE this same box (not a window). */
  private readonly neural: SuperNeural;
  private open = false;
  private minimized = false;
  private neuralOn = false;
  // GOAL5: rows for all 5 Archons (name + plan) for first-class telemetry (not just prime)
  private archonRows: Array<{ nm: HTMLElement; pl: HTMLElement }> = [];

  constructor(doc: Document = document) {
    doc.getElementById('cqm-sup-toggle')?.remove();
    doc.getElementById('cqm-sup-panel')?.remove();
    injectPanelBaseCSS(doc);
    const style = doc.createElement('style');
    style.textContent = STYLE;
    doc.head.appendChild(style);

    const toggle = doc.createElement('button');
    toggle.id = 'cqm-sup-toggle';
    toggle.type = 'button';
    toggle.className = 'cqm-dock-toggle';
    toggle.textContent = '⬢ ARCHITECT';
    toggle.setAttribute('aria-label', 'Open the Super Creature telemetry');
    toggle.addEventListener('click', () => this.setOpen(!this.open));
    mountToggle(toggle, doc); // V33: live in the shared bottom dock bar, not a floating fixed button

    const panel = doc.createElement('section');
    panel.id = 'cqm-sup-panel';
    panel.setAttribute('aria-label', 'Super Creatures (5 Archons/Godforms) telemetry');
    panel.innerHTML =
      `<div class="cqm-sup-head"><b>⬢ 5 ARCHONS / GODFORMS</b><span class="plan" data-plan>—</span>` +
      `<button class="cqm-sup-neu" data-neu aria-label="Toggle the Archon neural observatories" title="Toggle neural for focused Archon">⊞ NEURAL</button>` +
      `<button class="cqm-sup-min" data-min aria-label="Minimize">MINIMIZE</button>` +
      `<button class="cqm-sup-x" data-close aria-label="Close">EXIT</button></div>` +
      `<div class="cqm-sup-body"><div class="cqm-sup-id" data-id></div>` +
      `<div class="cqm-sup-bars" data-bars></div></div>` +
      `<div class="cqm-sup-neural-host" data-neural></div>` +
      `<div class="cqm-sup-archons" data-archons style="font-size:9px;margin-top:4px;opacity:0.8">ORACLE-Σ · STARKILLER-Ω · MANHATTAN-Φ · BROLY-Ψ · VOID-Λ</div>`;
    doc.body.appendChild(panel);
    this.panel = panel;
    this.planEl = panel.querySelector('[data-plan]') as HTMLElement;
    // V75: the neural observatory mounts INSIDE this box's host — one box, not a second window.
    this.neural = new SuperNeural(panel.querySelector('[data-neural]') as HTMLElement, doc);
    (panel.querySelector('[data-close]') as HTMLElement).addEventListener('click', () =>
      this.setOpen(false),
    );
    (panel.querySelector('[data-min]') as HTMLElement).addEventListener('click', () =>
      this.toggleMinimize(),
    );
    (panel.querySelector('[data-neu]') as HTMLElement).addEventListener('click', () =>
      this.toggleNeural(),
    );

    const id = panel.querySelector('[data-id]') as HTMLElement;
    this.id.name = idRow(id, 'Designate', doc);
    this.id.mind = idRow(id, 'Mind', doc);
    this.id.scale = idRow(id, 'Scale', doc);
    this.id.offspring = idRow(id, 'Twins', doc);
    this.id.wallet = idRow(id, 'Wallet', doc);
    this.id.brain = idRow(id, 'Conscious', doc); // V46: the live ~10k-param composite mind
    this.id.substrate = idRow(id, 'Substrate', doc); // V84 + Ralph 10x: ported Tsotchke (Eshkol QRNG/AD/GWT + Moonlab tensor/Clifford + QGT + libirrep sym + quake + mpo + ulg) substrates live in 5 Archons. See facade + full corpus.
    this.id.cognition = idRow(id, 'Cognition', doc); // V1.1: reservoir · active-inference · metacognition
    this.id.resonance = idRow(id, 'Resonance', doc); // #59: standing-wave coherence binding the assembly
    this.id.power = idRow(id, 'Power', doc); // V48: the evolution — level / stage / power / day

    // GOAL5: 5 Archons/Godforms telemetry (first-class, distinct from prime singular) — rows built in ctor for live per-Archetype plan inspect
    // (full: name/archetype/plan visible for all 5; senses drive plan, memory/quantum/body in neural tab for focused)
    void panel.querySelector('[data-archons]'); // rows populated live in update()

    const bars = panel.querySelector('[data-bars]') as HTMLElement;
    this.meter.valence = bar(bars, 'Valence', '#6bff9e', doc);
    this.meter.arousal = bar(bars, 'Arousal', '#ff9f43', doc);
    this.meter.dominance = bar(bars, 'Dominance', '#c06bff', doc);
    this.meter.surprise = bar(bars, 'Surprise', '#6bd5ff', doc);
    this.meter.aggression = bar(bars, 'Aggress', '#ff5a6b', doc);
    this.meter.deception = bar(bars, 'Deceive', '#d8a8ff', doc);
    this.meter.curiosity = bar(bars, 'Curiosity', '#9fb6dd', doc);
    // V46 — the SUPER MIND's consciousness meters (dream / hallucinate / reason / self-aware / novelty).
    this.meter.dreaming = bar(bars, 'Dream', '#b98cff', doc);
    this.meter.hallucinating = bar(bars, 'Hallucin', '#ff6ab0', doc);
    this.meter.reasoning = bar(bars, 'Reason', '#6cdfff', doc);
    this.meter.selfAware = bar(bars, 'Self-aware', '#ffd166', doc);
    this.meter.novelty = bar(bars, 'Novelty', '#8dff9e', doc);
    // V89 — Super Creature 1.1: the two leading SCIENTIFIC theories of consciousness, measured live.
    this.meter.ignition = bar(bars, 'Ignition', '#ff7a45', doc); // Global Workspace broadcast (GNW)
    this.meter.phi = bar(bars, 'Φ integ', '#5ad1c4', doc); // Integrated-Information proxy (IIT)
    this.meter.confidence = bar(bars, 'Confidence', '#ffa3d1', doc); // V92 · metacognitive executive (HOT)

    // GOAL5: 5 Archons first-class inspect list (name/archetype/plan/senses proxy via plan color; full quantum/mem via neural for focused)
    const archonsWrap = panel.querySelector('[data-archons]') as HTMLElement;
    archonsWrap.innerHTML = '';
    archonsWrap.style.fontSize = '9px';
    archonsWrap.style.lineHeight = '1.2';
    archonsWrap.style.marginTop = '3px';
    archonsWrap.style.opacity = '0.95';
    this.archonRows = [];
    for (let k = 0; k < 5; k++) {
      const row = doc.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '4px';
      row.style.alignItems = 'center';
      row.style.margin = '1px 0';
      const nm = doc.createElement('span');
      nm.style.color = '#d8a8ff';
      nm.style.minWidth = '78px';
      const pl = doc.createElement('span');
      pl.style.fontWeight = '700';
      pl.style.padding = '0 3px';
      pl.style.borderRadius = '3px';
      row.append(nm, pl);
      archonsWrap.appendChild(row);
      this.archonRows.push({ nm, pl });
    }
  }

  get isOpen(): boolean {
    return this.open;
  }

  private setOpen(v: boolean): void {
    this.open = v;
    this.panel.classList.toggle('open', v);
    if (!v) this.setNeural(false); // closing the box also stops the observatory's rAF loop
  }

  /** Collapse the Super Creature panel to a compact header bar or restore it. */
  private toggleMinimize(): void {
    this.minimized = !this.minimized;
    this.panel.classList.toggle('minimized', this.minimized);
    const minBtn = this.panel.querySelector('[data-min]');
    if (minBtn) {
      minBtn.textContent = this.minimized ? 'RESTORE' : 'MINIMIZE';
    }
  }

  /** V75: flip the box between the telemetry readout and the in-box neural observatory. */
  private toggleNeural(): void {
    this.setNeural(!this.neuralOn);
  }
  private setNeural(v: boolean): void {
    this.neuralOn = v;
    this.panel.classList.toggle('neural', v);
    this.neural.setActive(v);
  }

  /**
   * Push the latest mind snapshot + wallet. Always cheap; repaints only when open. Null-safe (the
   * creature is always-active, so `snap` should be present, but we tolerate a missing beat).
   * GOAL5: 5th param carries all 5 for full first-class inspect (archetype+plan visible for every Archon).
   */
  update(
    snap: SuperSnapshot | null,
    netWorth: number,
    mind?: SuperMindSnapshot | null,
    evo?: EvoView | null,
    archons?: Array<{ archetype: string; plan: string }> | null,
    petri?: PetriTelemetry | null,
  ): void {
    // GOAL5: 5 Archons first-class (all 5 names/archetypes/plans live; prime gets deep + neural; senses/quantum/body via per mind)
    // Feed the deeper neural box FIRST — it animates independently of whether this readout is open.
    this.neural.update(mind ?? null);
    // populate live 5-archon mini-inspect (name/archetype/plan + color for full visibility)
    if (this.archonRows.length && archons && archons.length === 5) {
      for (let k = 0; k < 5; k++) {
        const row = this.archonRows[k];
        const info = archons[k];
        if (row && info) {
          row.nm.textContent = info.archetype;
          const pc = PLAN_COLOR[info.plan as SuperPlan] || '#aaa';
          row.pl.textContent = info.plan;
          row.pl.style.background = pc + '33';
          row.pl.style.color = pc;
        }
      }
    }
    // TSOTCHKE 10x: show full Eshkol consciousness (logic/inference/workspace from corpus CONSCIOUSNESS_ENGINE) + Moonlab etc for focused Archon.
    if (mind && mind.eshkolConsciousness && this.archonRows.length) {
      const ec = mind.eshkolConsciousness;
      const ecStr = `Eshkol L:${ec.logic.toFixed(1)} I:${ec.inference.toFixed(1)} W:${ec.workspace.toFixed(1)}`;
      const r0 = this.archonRows[0];
      if (r0 && r0.nm) r0.nm.title = ecStr; // attach to first for focused telemetry
    }
    // Heartbeat small: Moonlab/Eshkol note for 5 Archons telemetry.
    if (!this.open || !snap) return;
    const c = PLAN_COLOR[snap.plan];
    this.planEl.textContent = snap.plan;
    this.planEl.style.color = c;

    this.id.name!.textContent = `${snap.name} · g${snap.generation}`;
    this.id.mind!.textContent = `${snap.paramCount}p deep`;
    this.id.scale!.textContent = `½ Titan · ×${snap.power}`;
    this.id.offspring!.textContent = `${snap.offspring} / 3`;
    this.id.wallet!.textContent = fmt(netWorth);

    // Valence is bipolar (−1..1) → map to 0..1 for the bar but tint by sign.
    this.setBar('valence', (snap.emotion.valence + 1) / 2, snap.emotion.valence);
    this.setBar('arousal', snap.emotion.arousal);
    this.setBar('dominance', snap.emotion.dominance);
    this.setBar('surprise', snap.surprise);
    this.setBar('aggression', snap.intent.aggression);
    this.setBar('deception', snap.intent.deception);
    this.setBar('curiosity', snap.intent.curiosity);

    // V46 — the live ~10k-param composite consciousness (the SUPER MIND).
    if (mind) {
      this.id.brain!.textContent = `${mind.paramCount}p · ${mind.stages}st×${mind.depths}d×${mind.variants}v`;
      const k = mind.consciousness;
      this.setBar('dreaming', k.dreaming);
      this.setBar('hallucinating', k.hallucinating);
      this.setBar('reasoning', k.reasoning);
      this.setBar('selfAware', k.selfAware);
      this.setBar('novelty', k.novelty);
      this.setBar('ignition', k.ignition ?? 0); // V89 · GWT broadcast
      this.setBar('phi', k.phi ?? 0); // V89 · IIT Φ proxy
      this.setBar('confidence', mind.metacog?.confidence ?? 0); // V92 · metacognitive confidence (HOT)
      // V84+ Ralph Tsotchke corpus wiring: Eshkol (full local Eshkol/eshkol_repo AD/arena/HoTT/consciousness + QRNG), Moonlab (tensor/MPO/CA-MPS), libirrep symmetry, ulg/quantum-quake. See audit. The Eshkol qubit-RNG it
      // collapses thoughts through, the QGTL geometry (curvature of its thought-space), and the
      // spin-glass instinct (the behavioural archetype its Hopfield/Ising lattice recalled this beat).
      const geo = mind.qubits.geometry;
      const sp = mind.spin;
      const instinct = sp.bestPattern >= 0 ? (SUPER_PLANS[sp.bestPattern] ?? '—') : '—';
      const petriStr = petri
        ? ` · Petri ${petri.soupLive} strains cat${(petri.soupCatalysis * 100).toFixed(0)}% ` +
          `bio${(petri.petriBiomass * 100).toFixed(0)}% φ${(petri.petriPhi * 100).toFixed(0)}% ` +
          `alive${(petri.petriAliveness * 100).toFixed(0)}% wire${(petri.wiringFraction * 100).toFixed(0)}% ` +
          `ulg${(petri.ulgResonance * 100).toFixed(0)}%`
        : '';
      this.id.substrate!.textContent =
        `Eshkol H${mind.eshkol.entropyEstimate.toFixed(2)} · ` +
        `QGT vol ${geo.scalar.toFixed(2)} κ${geo.curvature.toFixed(3)} · ` +
        `Spin→${instinct} ${(sp.bestOverlap * 100).toFixed(0)}%` +
        petriStr;
      // V1.1 — the new cognition substrates: reservoir echo/novelty · active-inference free-energy +
      // belief entropy · the metacognitive executive's second-order confidence.
      // V96 — empowerment: the channel-capacity AGENCY the mind feels + the plan it judges most steering.
      // V97 — holographic memory: the plan the VSA trace analogically recalls for the current context.
      const emp = mind.empowerment;
      const empPlan = emp.bestAction >= 0 ? (SUPER_PLANS[emp.bestAction] ?? '—') : '—';
      const holo = mind.holographic;
      const holoPlan = holo.recalledPlan >= 0 ? (SUPER_PLANS[holo.recalledPlan] ?? '—') : '—';
      this.id.cognition!.textContent =
        `Echo ${(mind.reservoir.echo * 100).toFixed(0)}% nov ${mind.reservoir.novelty.toFixed(2)} · ` +
        `FE ${mind.aif.freeEnergy.toFixed(2)} H${mind.aif.beliefEntropy.toFixed(2)} · ` +
        `Conf ${(mind.metacog.confidence * 100).toFixed(0)}% · ` +
        `EMP ${(emp.empowerment * 100).toFixed(0)}%→${empPlan} · ` +
        `HOLO ${(holo.confidence * 100).toFixed(0)}%→${holoPlan} · ` +
        // V98 — quantum deliberation: how decohered (decisive) the open-system decider is this beat.
        `QDEC ${(mind.deliberation.decisiveness * 100).toFixed(0)}%${mind.deliberation.committed ? '✦' : ''}`;
      // #59 — resonance integrator: the standing-wave coherence binding the consciousness assembly by
      // synchrony, whether it crossed into a BOUND (ignited) moment, how many faculties phase-lock, and
      // the adaptive-coupling homeostat's self-tuned coupling K + responsiveness (proximity to the
      // sensitive operating point of the synchronization transition).
      const reso = mind.resonance;
      const homeo = reso.homeostat
        ? ` · resp ${(reso.homeostat.responsiveness * 100).toFixed(0)}% K${reso.homeostat.coupling.toFixed(2)}`
        : '';
      this.id.resonance!.textContent =
        `Coherence ${(reso.order * 100).toFixed(0)}%${reso.ignited ? ' ✦ BOUND' : ''} · ` +
        `${reso.coupled} faculties${homeo} · bcast ${(mind.broadcast * 100).toFixed(0)}%`;
    }

    // V48 — the self-evolution: level · stage · power · day (it grows like Vegeta/Goku).
    // V63 — show the LV/100 cap, the godlike-power tally (one per 10 levels), and the ascension mark.
    if (evo) {
      const god = `${evo.powers.length}/10⚡`;
      const cap = evo.ascended ? 'ASCENDED ✦' : `${evo.stageName} ${god}`;
      this.id.power!.textContent = `LV${evo.level}/${evo.maxLevel} ${cap} · ${fmt(evo.power)} · d${evo.day}`;
    }
  }

  /** Set a meter's fill width (0..1) + numeric label (showing `signed` when bipolar). */
  private setBar(key: string, frac: number, signed?: number): void {
    const m = this.meter[key];
    if (!m) return;
    const f = frac < 0 ? 0 : frac > 1 ? 1 : frac;
    m.fill.style.width = (f * 100).toFixed(0) + '%';
    m.num.textContent = signed !== undefined ? signed.toFixed(2) : f.toFixed(2);
  }
}

/** Compact human number (1.2k, 3.4M) for the wallet readout. */
function fmt(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (a >= 1e3) return (v / 1e3).toFixed(1) + 'k';
  return v.toFixed(0);
}

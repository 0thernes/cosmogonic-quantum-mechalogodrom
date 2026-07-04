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
import { APEX_INDIVIDUATED } from '../sim/godform';
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

/** One Archon/Godform card in the Architect panel. */
interface ArchonInfo {
  archetype: string;
  plan: SuperPlan;
  emotion: { valence: number; arousal: number; dominance: number };
  surprise: number;
  intent: { aggression: number; deception: number; curiosity: number };
  consciousness: {
    dreaming: number;
    hallucinating: number;
    reasoning: number;
    selfAware: number;
    novelty: number;
    ignition: number;
    phi: number;
    workspace: number;
  };
  confidence: number;
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
  z-index:71;width:auto;max-width:none;max-height:var(--cqm-hud-height,min(84vh,1040px));display:none;flex-direction:column;
  border:1px solid rgba(196,120,255,.34);border-radius:12px;background:rgba(8,5,16,.96);backdrop-filter:blur(12px);
  box-shadow:0 10px 46px rgba(0,0,0,.7);font:11px/1.45 var(--font-mono,ui-monospace,monospace);color:#ece2ff;overflow:hidden}
#cqm-sup-panel:not(.neural){max-height:min(84vh,1040px)} /* V122 (USER #1): 2× taller */
@media (max-width:640px){#cqm-sup-panel:not(.neural){max-height:min(80vh,900px)}}
#cqm-sup-panel.open{display:flex}
@media (max-width:640px){
#cqm-sup-panel{left:auto;top:auto;right:10px;bottom:calc(var(--cqm-bottom-h,108px) + 130px);transform:none;width:min(94vw,326px);max-height:min(66vh,480px)}
}
.cqm-sup-head{display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid rgba(196,120,255,.24);background:rgba(28,14,46,.8)}
.cqm-sup-head b{font-size:13px;letter-spacing:.12em;color:#d8a8ff;white-space:nowrap}
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
/* V112: use the available panel height. Identity column on the left; meters wrap into a dense grid. */
.cqm-sup-body{flex:1 1 auto;min-height:0;display:flex;flex-direction:row;gap:10px;overflow:auto;align-items:stretch}
/* V123 (USER #5): the left ID column was clipped — a 160-220px box with overflow:hidden chopped the
   long values ("ARCHITECT-Ω · g0", "10081p · 5st×5d×25v") mid-token. Widen it, let values wrap
   cleanly on their own line under a full-width layout, and never clip. */
.cqm-sup-id{flex:0 0 auto;padding:7px 12px;border-right:1px solid rgba(196,120,255,.14);display:grid;
  grid-template-columns:auto minmax(0,1fr);gap:3px 12px;align-items:baseline;min-width:210px;max-width:320px}
.cqm-sup-id .k{color:#a98fce;font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
.cqm-sup-id .v{color:#f3ecff;text-align:right;font-variant-numeric:tabular-nums;font-size:12px;
  line-height:1.35;overflow-wrap:anywhere;word-break:break-word}
.cqm-sup-bars{flex:1 1 auto;padding:10px 12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:8px 16px;align-content:stretch;min-width:0}
.cqm-sup-bar{display:grid;grid-template-columns:72px 1fr 42px;align-items:center;gap:8px;min-width:0}
.cqm-sup-bar .lab{color:#c4a8e8;font-size:12px;letter-spacing:.04em;text-transform:uppercase;font-weight:600}
.cqm-sup-bar .track{height:11px;border-radius:5px;background:rgba(196,120,255,.14);overflow:hidden}
.cqm-sup-bar .fill{height:100%;width:0;border-radius:5px;transition:width .25s ease}
.cqm-sup-bar .num{color:#f3ecff;text-align:right;font-size:13px;font-variant-numeric:tabular-nums;font-weight:600}
/* V121 (USER #4): the Archon grid FILLS the remaining panel height (flex, no fixed 220px cap) and
   the cards flow responsively — all info fits the window instead of hiding behind a scroll cut. */
.cqm-sup-archons {
  flex: 1 1 300px;
  min-height: 260px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
  gap: 10px;
  padding: 10px 14px 12px;
  border-top: 1px solid rgba(196, 120, 255, 0.18);
  background: linear-gradient(180deg, rgba(20, 8, 36, 0.45), rgba(8, 5, 16, 0.7));
  overflow-y: auto;
  align-content: start;
}
/* V122 (USER #5): the cards were "squished like sandwiches" — a floated radar overlapped the stat
   grid and the name row. Proper wireframe now: explicit grid areas (name/plan left, radar right,
   telemetry full-width below) — nothing can overlap at any width. */
.cqm-sup-archons > div {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 88px;
  grid-template-areas:
    'head radar'
    'plan radar'
    'tel  tel';
  align-content: start;
  gap: 5px 10px;
  margin: 0;
  padding: 10px 12px;
  border: 1px solid rgba(196, 120, 255, 0.22);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.4);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition:
    border-color 0.2s,
    background 0.2s;
}
.cqm-sup-archons > div:hover {
  border-color: rgba(196, 120, 255, 0.45);
  background: rgba(28, 14, 46, 0.35);
}
.cqm-sup-archons .archon-name {
  grid-area: head;
  align-self: end;
  color: #e0bdff !important;
  font: 800 13px var(--font-mono, ui-monospace, monospace);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cqm-sup-archons .archon-plan {
  grid-area: plan;
  align-self: start;
  display: inline-block;
  font: 700 10px var(--font-mono, ui-monospace, monospace);
  text-align: center;
  padding: 2px 8px;
  border-radius: 4px;
  letter-spacing: 0.08em;
  width: fit-content;
  max-width: 100%;
}
.cqm-sup-archons .archon-radar {
  grid-area: radar;
  width: 88px;
  height: 88px;
  margin: 0;
  opacity: 0.95;
}
.cqm-sup-archons .archon-telemetry {
  grid-area: tel;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px 10px;
  margin-top: 2px;
  border-top: 1px solid rgba(196, 120, 255, 0.1);
  padding-top: 6px;
}
.cqm-sup-archons .archon-stat {
  display: flex;
  justify-content: space-between;
  gap: 4px;
  font: 10.5px/1.3 var(--font-mono, ui-monospace, monospace);
  color: #b9a2dd;
}
.cqm-sup-archons .archon-stat span:first-child {
  opacity: 0.85;
}
.cqm-sup-archons .archon-stat span:last-child {
  color: #ece2ff;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
@media (max-width: 720px) {
  .cqm-sup-archons {
    grid-template-columns: 1fr;
  }
  .cqm-sup-archons .archon-telemetry {
    grid-template-columns: repeat(3, 1fr);
  }
}
/* V75: the NEURAL observatory lives in the SAME box — toggling it grows this panel and swaps the
   telemetry body for the 4-tab / 27-visual + BRAIN observatory (no second window). */
.cqm-sup-neural-host{display:none;flex:1 1 auto;min-height:0;flex-direction:column}
/* center-hud owns the shared panel slot; the .neural class lifts specificity (0,1,1,0 > 0,1,0,0)
   so the 4-tab / 27-visual observatory can temporarily expand even further when needed. Capped so it
   never runs off the viewport. */
/* V123 (USER #1): the NEURAL tab used to cap at 640px while the telemetry tab ran to 1040px, so the
   window visibly SHORTENED when you switched tabs. Both tabs now flex to the SAME full managed
   height, so the panel stays the same size and MORE info shows in either view. */
#cqm-sup-panel.neural{height:var(--cqm-hud-height,min(84vh,1040px))!important;
  max-height:var(--cqm-hud-max-height,calc(100vh - 156px))!important;min-height:0!important}
#cqm-sup-panel.neural .cqm-sup-body{display:none}
/* In neural mode the archon strip yields to the observatory so the 9 cells get the full height. */
#cqm-sup-panel.neural .cqm-sup-archons{display:none}
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
  // GOAL5: rows for all 5 Archons (name + plan + full affect dimensions) for first-class telemetry
  private archonRows: Array<{
    nm: HTMLElement;
    pl: HTMLElement;
    val: HTMLElement;
    aro: HTMLElement;
    dom: HTMLElement;
    sur: HTMLElement;
    agg: HTMLElement;
    dec: HTMLElement;
    cur: HTMLElement;
    dre: HTMLElement;
    hal: HTMLElement;
    rea: HTMLElement;
    saw: HTMLElement;
    nov: HTMLElement;
    ign: HTMLElement;
    integrity: HTMLElement;
    integration: HTMLElement;
    conf: HTMLElement;
    /** USER #5: per-Archon 16-spoke radar chart — a live visual signature of each godform's mind. */
    radar: CanvasRenderingContext2D | null;
  }> = [];
  // V121 (USER #4): the radars ANIMATE — real snapshot vectors are ingest TARGETS; an rAF loop (open
  // panel only) eases the displayed polygon toward them and spins a sweep whose rate ∝ mean activity.
  private readonly radarTargets: number[][] = [];
  private readonly radarShown: number[][] = [];
  private readonly radarColors: string[] = [];
  private readonly doc: Document;

  constructor(doc: Document = document) {
    this.doc = doc;
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

    // GOAL5 + USER #5: 5 Archons/Godforms — FILLED SPACE, BIGGER TYPO, FULL PARAMS (VALENCE AROUSAL DOMINANCE SURPRISE AGGRESS DECEIVE CURIOSITY DREAM HALLUCINATE REASON SELF AWARE NOVELTY IGNITION INTEGRITY INTEGRATION CONFIDENCE) + graphs via stats.
    // No dead open space. Legible, bigger fonts, use the box. 5 distinct with live data + mini telemetry.
    void panel.querySelector('[data-archons]');

    const bars = panel.querySelector('[data-bars]') as HTMLElement;
    this.meter.valence = bar(bars, 'Valence', '#6bff9e', doc);
    this.meter.arousal = bar(bars, 'Arousal', '#ff9f43', doc);
    this.meter.dominance = bar(bars, 'Dominance', '#c06bff', doc);
    this.meter.surprise = bar(bars, 'Surprise', '#6bd5ff', doc); // surprise
    this.meter.aggression = bar(bars, 'Aggress', '#ff5a6b', doc); // aggression
    this.meter.deception = bar(bars, 'Deceive', '#d8a8ff', doc); // deception
    this.meter.curiosity = bar(bars, 'Curiosity', '#9fb6dd', doc); // curiosity
    this.meter.dreaming = bar(bars, 'Dream', '#b98cff', doc); // dreaming
    this.meter.hallucinating = bar(bars, 'Hallucin', '#ff6ab0', doc); // hallucinating
    this.meter.reasoning = bar(bars, 'Reason', '#6cdfff', doc); // reasoning
    this.meter.selfAware = bar(bars, 'Self-aware', '#ffd166', doc); // selfAware
    this.meter.novelty = bar(bars, 'Novelty', '#8dff9e', doc); // novelty
    this.meter.ignition = bar(bars, 'Ignition', '#ff7a45', doc); // ignition
    this.meter.phi = bar(bars, 'Φ integ', '#5ad1c4', doc);
    this.meter.confidence = bar(bars, 'Confidence', '#ffa3d1', doc); // confidence

    // 5 Archons: bigger, legible, filled. Full params (VALENCE AROUSAL ... CONFIDENCE per user). No tiny 9px dead space.
    const archonsWrap = panel.querySelector('[data-archons]') as HTMLElement;
    archonsWrap.style.cssText = 'font-size:12px;margin-top:8px;opacity:1;line-height:1.35';
    archonsWrap.innerHTML = '';
    this.archonRows = [];
    const makeStat = (label: string): HTMLElement => {
      const el = doc.createElement('div');
      el.className = 'archon-stat';
      el.innerHTML = `<span>${label}:</span><span>—</span>`;
      return el;
    };
    for (let k = 0; k < APEX_INDIVIDUATED; k++) {
      const card = doc.createElement('div');
      const nm = doc.createElement('span');
      nm.className = 'archon-name';
      const pl = doc.createElement('span');
      pl.className = 'archon-plan';
      const tel = doc.createElement('div');
      tel.className = 'archon-telemetry';
      // USER #5: every Archon Godform card now shows all 16 live affect/cognition dimensions the
      // owner listed (valence → confidence), each fed real per-archon data by the update loop below,
      // filling the previously empty card space. The earlier 9 cells included 6 placeholders
      // (PLE/DIS/EXC/CAL/TEN/REL) that were never wired to the row and left `sSur…sCnf` undefined.
      const sVal = makeStat('VAL');
      const sAro = makeStat('ARO');
      const sDom = makeStat('DOM');
      const sSur = makeStat('SUR');
      const sAgg = makeStat('AGG');
      const sDec = makeStat('DEC');
      const sCur = makeStat('CUR');
      const sDre = makeStat('DRE');
      const sHal = makeStat('HAL');
      const sRea = makeStat('REA');
      const sSAw = makeStat('SAW');
      const sNov = makeStat('NOV');
      const sIgn = makeStat('IGN');
      const sInt = makeStat('INTG');
      const sIgr = makeStat('PHI');
      const sCnf = makeStat('CONF');
      // prettier-ignore
      tel.append(
        sVal, sAro, sDom, sSur, sAgg, sDec, sCur, sDre,
        sHal, sRea, sSAw, sNov, sIgn, sInt, sIgr, sCnf,
      );
      // USER #5: a live radar chart per Archon — fills the card's dead space with a real per-godform
      // affect/cognition signature (16 spokes), so the 5 Archons read as visually DISTINCT at a glance.
      const radarCanvas = doc.createElement('canvas');
      radarCanvas.className = 'archon-radar';
      radarCanvas.width = 128;
      radarCanvas.height = 128;
      radarCanvas.setAttribute('aria-hidden', 'true');
      card.append(nm, pl, radarCanvas, tel);
      archonsWrap.appendChild(card);
      this.archonRows.push({
        nm,
        pl,
        radar: radarCanvas.getContext('2d'),
        val: sVal.querySelector('span:last-child') as HTMLElement,
        aro: sAro.querySelector('span:last-child') as HTMLElement,
        dom: sDom.querySelector('span:last-child') as HTMLElement,
        sur: sSur.querySelector('span:last-child') as HTMLElement,
        agg: sAgg.querySelector('span:last-child') as HTMLElement,
        dec: sDec.querySelector('span:last-child') as HTMLElement,
        cur: sCur.querySelector('span:last-child') as HTMLElement,
        dre: sDre.querySelector('span:last-child') as HTMLElement,
        hal: sHal.querySelector('span:last-child') as HTMLElement,
        rea: sRea.querySelector('span:last-child') as HTMLElement,
        saw: sSAw.querySelector('span:last-child') as HTMLElement,
        nov: sNov.querySelector('span:last-child') as HTMLElement,
        ign: sIgn.querySelector('span:last-child') as HTMLElement,
        integrity: sInt.querySelector('span:last-child') as HTMLElement,
        integration: sIgr.querySelector('span:last-child') as HTMLElement,
        conf: sCnf.querySelector('span:last-child') as HTMLElement,
      });
      this.radarTargets.push(Array.from({ length: 16 }, () => 0));
      this.radarShown.push(Array.from({ length: 16 }, () => 0));
      this.radarColors.push('#c478ff');
    }

    // V121 (USER #4): the radar loop — runs only while the panel is OPEN (not minimized / not in
    // neural mode) and the tab visible; every 2nd rAF frame it eases each displayed 16-vector toward
    // its REAL ingest target (~0.3 s) and spins a sweep whose rate ∝ that archon's mean activity.
    // Presentation only: it never fabricates a value, it interpolates between real snapshots.
    if (typeof requestAnimationFrame === 'function') {
      let tick = 0;
      const radarLoop = (): void => {
        requestAnimationFrame(radarLoop);
        if (!this.open || this.minimized || this.neuralOn || this.doc.hidden) return;
        if (++tick % 2 !== 0) return;
        const now = typeof performance !== 'undefined' ? performance.now() / 1000 : 0;
        for (let k = 0; k < this.archonRows.length; k++) {
          const tgt = this.radarTargets[k];
          const shown = this.radarShown[k];
          const row = this.archonRows[k];
          if (!tgt || !shown || !row) continue;
          let mean = 0;
          for (let i = 0; i < tgt.length; i++) {
            const t = tgt[i] ?? 0;
            shown[i] = (shown[i] ?? 0) + (t - (shown[i] ?? 0)) * 0.14;
            mean += shown[i] ?? 0;
          }
          mean /= Math.max(1, tgt.length);
          this.drawArchonRadar(
            row.radar,
            shown,
            this.radarColors[k] ?? '#c478ff',
            now * (0.5 + mean * 1.8) + k * 1.3,
          );
        }
      };
      requestAnimationFrame(radarLoop);
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
    archons?: ArchonInfo[] | null,
    petri?: PetriTelemetry | null,
  ): void {
    // GOAL5: 5 Archons first-class (all 5 names/archetypes/plans live; prime gets deep + neural; senses/quantum/body via per mind)
    // Feed the deeper neural box FIRST — it animates independently of whether this readout is open.
    this.neural.update(mind ?? null);
    // populate the live individuated-apex mini-inspect (name/archetype/plan + color for full visibility)
    // V121 perf: skip the ~80 archon DOM writes + radar ingest while the panel is CLOSED or
    // minimized — the next open refills them on the following cadence (≤0.3 s), nothing is lost.
    if (
      this.open &&
      !this.minimized &&
      this.archonRows.length &&
      archons &&
      archons.length === APEX_INDIVIDUATED
    ) {
      for (let k = 0; k < APEX_INDIVIDUATED; k++) {
        const row = this.archonRows[k];
        const info = archons[k];
        if (row && info) {
          row.nm.textContent = info.archetype;
          const pc = PLAN_COLOR[info.plan as SuperPlan] || '#aaa';
          row.pl.textContent = info.plan;
          row.pl.style.background = pc + '22';
          row.pl.style.color = pc;

          // V116: full per-Archon telemetry from real SuperCreature + SuperMind snapshots.
          const em = info.emotion;
          const v = em.valence;
          const a = em.arousal;
          const d = em.dominance;
          const c = info.consciousness;
          const integrity = clamp01((c.phi + info.confidence + (1 - info.surprise)) / 3);
          row.val.textContent = v.toFixed(2);
          row.aro.textContent = a.toFixed(2);
          row.dom.textContent = d.toFixed(2);
          row.sur.textContent = info.surprise.toFixed(2);
          row.agg.textContent = info.intent.aggression.toFixed(2);
          row.dec.textContent = info.intent.deception.toFixed(2);
          row.cur.textContent = info.intent.curiosity.toFixed(2);
          row.dre.textContent = c.dreaming.toFixed(2);
          row.hal.textContent = c.hallucinating.toFixed(2);
          row.rea.textContent = c.reasoning.toFixed(2);
          row.saw.textContent = c.selfAware.toFixed(2);
          row.nov.textContent = c.novelty.toFixed(2);
          row.ign.textContent = c.ignition.toFixed(2);
          row.integrity.textContent = integrity.toFixed(2);
          row.integration.textContent = c.phi.toFixed(2);
          row.conf.textContent = info.confidence.toFixed(2);
          // USER #5→V121: the live 16-spoke signature is now an INGEST TARGET — the constructor's
          // rAF loop eases the drawn polygon toward it and spins the activity sweep (always moving).
          this.radarTargets[k] = [
            (v + 1) / 2,
            a,
            d,
            info.surprise,
            info.intent.aggression,
            info.intent.deception,
            info.intent.curiosity,
            c.dreaming,
            c.hallucinating,
            c.reasoning,
            c.selfAware,
            c.novelty,
            c.ignition,
            integrity,
            c.phi,
            info.confidence,
          ];
          this.radarColors[k] = pc;
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
      this.setBar(
        'integrity',
        clamp01(((k.phi ?? 0) + (mind.metacog?.confidence ?? 0) + (1 - (snap.surprise ?? 0))) / 3),
      );
      this.setBar('integration', k.phi ?? 0);
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

    // V48/V63+ — self-evolution: LV100 is the first ascension summit; levels keep climbing beyond it.
    if (evo) {
      const god = `${evo.powers.length}/10⚡`;
      const cap = evo.ascended ? 'ASCENDED ✦' : `${evo.stageName} ${god}`;
      const summit = evo.ascended ? `${evo.maxLevel}+` : `${evo.maxLevel}`;
      this.id.power!.textContent = `LV${evo.level}/${summit} ${cap} · ${fmt(evo.power)} · d${evo.day}`;
    }
  }

  /**
   * USER #5: paint a live 16-spoke radar of one Archon's affect/cognition vector (all values 0..1).
   * Concentric grid rings + a filled polygon in the Archon's plan colour give each of the 5 godforms a
   * distinct, at-a-glance visual signature. V121: an optional SWEEP (rotating scan line + trail whose
   * rate ∝ mean activity) keeps the chart visibly alive between snapshots. Allocation-light, no rng.
   */
  private drawArchonRadar(
    ctx: CanvasRenderingContext2D | null,
    vals: readonly number[],
    color: string,
    sweep?: number,
  ): void {
    if (!ctx) return;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const rad = Math.min(cx, cy) - 8;
    const n = vals.length;
    ctx.clearRect(0, 0, w, h);
    // Concentric grid rings (3 levels).
    ctx.strokeStyle = 'rgba(120,160,220,0.16)';
    ctx.lineWidth = 1;
    for (let ring = 1; ring <= 3; ring++) {
      const rr = (rad * ring) / 3;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(ang) * rr;
        const y = cy + Math.sin(ang) * rr;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    // Data polygon.
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const j = i % n;
      const ang = (j / n) * Math.PI * 2 - Math.PI / 2;
      const rr = rad * clamp01(vals[j] ?? 0);
      const x = cx + Math.cos(ang) * rr;
      const y = cy + Math.sin(ang) * rr;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = color + '33';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.fill();
    ctx.stroke();
    // Vertex dots.
    ctx.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
      const rr = rad * clamp01(vals[i] ?? 0);
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // V121: rotating activity sweep — a bright scan line with a fading trail. Its rotation rate is
    // driven by the archon's REAL mean activity (set by the caller), so a hot mind scans fast.
    if (sweep !== undefined) {
      const ang = (sweep % (Math.PI * 2)) - Math.PI / 2;
      for (let trail = 0; trail < 4; trail++) {
        const ta = ang - trail * 0.09;
        ctx.strokeStyle = trail === 0 ? color : `rgba(196,140,255,${(0.28 * (4 - trail)) / 4})`;
        ctx.lineWidth = trail === 0 ? 1.2 : 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(ta) * rad, cy + Math.sin(ta) * rad);
        ctx.stroke();
      }
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

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * SUPER CREATURE telemetry — the ⬢ ARCHITECT panel (V31). A self-building HUD readout that makes the
 * apex mind INSPECTABLE: identity (name · generation · 1444-param deep mind), scale (½ Titan, ~100×
 * power), the committed GOAP plan, the live emotion meters (valence / arousal / dominance), the
 * prediction-loop SURPRISE, the offspring tally, the raw intent drives, and its wallet — so the brief's
 * "it must appear in telemetry" holds. UI shell only: it never imports or mutates sim state; the world
 * pushes a {@link SuperSnapshot} + net worth each Observatory cadence via {@link update}.
 */
import type { SuperSnapshot, SuperPlan } from '../sim/super-creature';
import type { SuperMindSnapshot } from '../sim/super-mind';
import type { EvoView } from '../sim/super-evolution';
import { mountToggle } from './panel-dock';

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
#cqm-sup-toggle{position:fixed;right:330px;bottom:10px;z-index:60;height:42px;padding:0 12px;border-radius:21px;
  border:1px solid rgba(196,120,255,.55);background:rgba(16,8,28,.86);color:#e9c8ff;font:600 11px/1 var(--font-mono,ui-monospace,monospace);
  letter-spacing:.12em;cursor:pointer;backdrop-filter:blur(6px);box-shadow:0 2px 14px rgba(0,0,0,.5);
  transition:transform .15s,background .15s;animation:cqm-sup-breathe 3.4s ease-in-out infinite}
@keyframes cqm-sup-breathe{0%,100%{box-shadow:0 2px 14px rgba(140,60,220,.35)}50%{box-shadow:0 2px 22px rgba(196,120,255,.7)}}
#cqm-sup-toggle:hover{transform:scale(1.06);background:rgba(34,16,54,.95)}
#cqm-sup-toggle:focus-visible{outline:2px solid #c478ff;outline-offset:2px}
#cqm-sup-panel{position:fixed;right:10px;bottom:128px;z-index:59;width:min(94vw,326px);display:none;flex-direction:column;
  border:1px solid rgba(196,120,255,.34);border-radius:12px;background:rgba(8,5,16,.96);backdrop-filter:blur(12px);
  box-shadow:0 10px 46px rgba(0,0,0,.7);font:11px/1.5 var(--font-mono,ui-monospace,monospace);color:#ece2ff;overflow:hidden}
#cqm-sup-panel.open{display:flex}
.cqm-sup-head{display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid rgba(196,120,255,.24);background:rgba(28,14,46,.8)}
.cqm-sup-head b{font-size:11px;letter-spacing:.14em;color:#d8a8ff;white-space:nowrap}
.cqm-sup-head .plan{margin-left:auto;font-weight:700;letter-spacing:.1em;padding:1px 8px;border-radius:9px;background:rgba(0,0,0,.35)}
.cqm-sup-x{background:rgba(6,4,12,.9);color:#e9c8ff;border:1px solid rgba(196,120,255,.3);border-radius:5px;
  font:11px var(--font-mono,ui-monospace,monospace);padding:2px 7px;cursor:pointer}
.cqm-sup-x:focus-visible{outline:1px solid #c478ff}
.cqm-sup-id{padding:6px 10px;border-bottom:1px solid rgba(196,120,255,.14);display:grid;grid-template-columns:auto 1fr;gap:1px 10px}
.cqm-sup-id .k{color:#a98fce;font-size:10px;letter-spacing:.05em;text-transform:uppercase}
.cqm-sup-id .v{color:#f3ecff;text-align:right;font-variant-numeric:tabular-nums}
.cqm-sup-bars{padding:7px 10px;display:flex;flex-direction:column;gap:5px}
.cqm-sup-bar{display:grid;grid-template-columns:62px 1fr 40px;align-items:center;gap:8px}
.cqm-sup-bar .lab{color:#a98fce;font-size:10px;letter-spacing:.04em;text-transform:uppercase}
.cqm-sup-bar .track{height:7px;border-radius:4px;background:rgba(196,120,255,.12);overflow:hidden}
.cqm-sup-bar .fill{height:100%;width:0;border-radius:4px;transition:width .25s ease}
.cqm-sup-bar .num{color:#f3ecff;text-align:right;font-size:10px;font-variant-numeric:tabular-nums}
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
  private open = false;

  constructor(doc: Document = document) {
    doc.getElementById('cqm-sup-toggle')?.remove();
    doc.getElementById('cqm-sup-panel')?.remove();
    const style = doc.createElement('style');
    style.textContent = STYLE;
    doc.head.appendChild(style);

    const toggle = doc.createElement('button');
    toggle.id = 'cqm-sup-toggle';
    toggle.type = 'button';
    toggle.textContent = '⬢ ARCHITECT';
    toggle.setAttribute('aria-label', 'Open the Super Creature telemetry');
    toggle.addEventListener('click', () => this.setOpen(!this.open));
    mountToggle(toggle, doc); // V33: live in the shared bottom dock bar, not a floating fixed button

    const panel = doc.createElement('section');
    panel.id = 'cqm-sup-panel';
    panel.setAttribute('aria-label', 'Super Creature telemetry');
    panel.innerHTML =
      `<div class="cqm-sup-head"><b>⬢ SUPER CREATURE</b><span class="plan" data-plan>—</span>` +
      `<button class="cqm-sup-x" data-close aria-label="Close">✕</button></div>` +
      `<div class="cqm-sup-id" data-id></div><div class="cqm-sup-bars" data-bars></div>`;
    doc.body.appendChild(panel);
    this.panel = panel;
    this.planEl = panel.querySelector('[data-plan]') as HTMLElement;
    (panel.querySelector('[data-close]') as HTMLElement).addEventListener('click', () =>
      this.setOpen(false),
    );

    const id = panel.querySelector('[data-id]') as HTMLElement;
    this.id.name = idRow(id, 'Designate', doc);
    this.id.mind = idRow(id, 'Mind', doc);
    this.id.scale = idRow(id, 'Scale', doc);
    this.id.offspring = idRow(id, 'Twins', doc);
    this.id.wallet = idRow(id, 'Wallet', doc);
    this.id.brain = idRow(id, 'Conscious', doc); // V46: the live ~10k-param composite mind
    this.id.power = idRow(id, 'Power', doc); // V48: the evolution — level / stage / power / day

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
  }

  get isOpen(): boolean {
    return this.open;
  }

  private setOpen(v: boolean): void {
    this.open = v;
    this.panel.classList.toggle('open', v);
  }

  /**
   * Push the latest mind snapshot + wallet. Always cheap; repaints only when open. Null-safe (the
   * creature is always-active, so `snap` should be present, but we tolerate a missing beat).
   */
  update(
    snap: SuperSnapshot | null,
    netWorth: number,
    mind?: SuperMindSnapshot | null,
    evo?: EvoView | null,
  ): void {
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
    }

    // V48 — the self-evolution: level · stage · power · day (it grows like Vegeta/Goku).
    if (evo) {
      this.id.power!.textContent = `LV${evo.level} ${evo.stageName} · ${fmt(evo.power)} · d${evo.day}`;
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

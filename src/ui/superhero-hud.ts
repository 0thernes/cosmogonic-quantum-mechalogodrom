/**
 * SUPERHERO HUD (V35) — the player-as-creature overlay the access puzzle unlocks. When ACCESS GRANTED
 * fires, the player BECOMES the 2nd super creature, and this top-center game band slides in: LIFE +
 * ENERGY + XP/LEVEL bars, live stats (power · dominance · plan), the WALLET, the NEURAL state (the
 * mind's emotion meters), an INVENTORY, four quantum POWERS, and VISION / CAMERA controls — every
 * field a real read of the hero's deep-mind snapshot + the {@link SuperheroState} progression model.
 *
 * UI shell only: the world ticks the state, pushes a {@link HeroHudView} each cadence via
 * {@link update}, and applies the powers — the buttons here just dispatch `cqm:hero-power` /
 * `cqm:hero-vision` / `cqm:hero-cam` window events. Self-mounting; hidden until {@link activate}.
 */
import { HERO_POWERS, type SuperheroView } from './superhero-state';

/** Everything the HUD paints each beat — the world assembles it from the hero creature + its state. */
export interface HeroHudView extends SuperheroView {
  name: string;
  power: number; // ×Titan
  plan: string;
  emotion: { valence: number; arousal: number; dominance: number };
  wallet: { aurum: number; umbra: number; quanta: number; ichor: number };
  world: { entities: number; frame: number };
}

/** Starter inventory — quantum relics (cosmetic slots for now; the kit the hero carries). */
const INVENTORY = ['◈', '❄', '⚛', '✶', '☍', '⬡'];

const STYLE = `
#cqm-hero{position:fixed;top:calc(38px + env(safe-area-inset-top,0px));left:var(--cqm-hud-left,calc(clamp(220px,21vw,300px) + 14px));
  right:var(--cqm-hud-right,calc(clamp(280px,27vw,420px) + 14px));
  width:auto;max-width:none;max-height:min(28vh,180px);overflow:hidden;
  transform:translateY(-150%);z-index:24;
  transition:transform .55s cubic-bezier(.2,.9,.3,1);font-size:11px;line-height:1.4;font-family:var(--font-mono,ui-monospace,monospace);
  color:#e9e3ff;pointer-events:none}
#cqm-hero.on{transform:translateY(0)}
#cqm-hero.on.min .cqm-hero-box{display:none}
#cqm-hero.on.min .cqm-hero-fab{display:grid}
#cqm-hero:not(.min) .cqm-hero-fab{display:none}
.cqm-hero-fab{pointer-events:auto;display:none;position:absolute;top:0;right:0;width:36px;height:36px;border-radius:50%;
  border:1px solid rgba(150,120,255,.55);background:linear-gradient(180deg,rgba(24,14,48,.95),rgba(10,8,22,.92));
  color:#d4b8ff;font-size:16px;cursor:pointer;place-items:center;box-shadow:0 4px 18px rgba(0,0,0,.55);
  transition:transform .12s,background .12s}
.cqm-hero-fab:hover{background:rgba(60,36,110,.85);transform:scale(1.06)}
.cqm-hero-min{pointer-events:auto;margin-left:auto;border:1px solid rgba(150,120,255,.35);border-radius:6px;
  background:rgba(30,18,60,.55);color:#cbb0ff;font:600 10px/1 var(--font-mono,ui-monospace,monospace);padding:2px 7px;cursor:pointer}
.cqm-hero-min:hover{background:rgba(50,32,95,.75)}
.cqm-hero-head{display:flex;align-items:center;gap:6px;width:100%}
@media (max-width:599px){#cqm-hero{left:6px;right:6px;top:calc(52px + env(safe-area-inset-top,0px));font-size:10px;max-height:34vh}}
@media (max-width:640px){#cqm-hero{left:4px;right:4px;top:calc(48px + env(safe-area-inset-top,0px));font-size:9px}}
@media (min-width:769px) and (max-width:1400px){
  #cqm-hero{left:calc(clamp(120px,20vw,190px) + 10px);right:calc(clamp(120px,22vw,210px) + 10px);
    top:calc(42px + env(safe-area-inset-top,0px));max-height:min(18vh,108px);font-size:8px}
  .cqm-hero-box{padding:4px 7px;gap:3px;max-width:100%}
  .cqm-hero-r{gap:4px}
  .cqm-hero-bar{min-width:60px}
  .cqm-hero-bar .lab{width:28px;font-size:7px}
  .cqm-hero-bar .trk{min-width:42px;height:6px}
  .cqm-hero-bar .num{width:26px;font-size:7px}
  .cqm-hero-sec{padding:1px 3px;gap:3px}
  .cqm-hero-sec .v{font-size:8px}
  .cqm-hero-pw{gap:2px}
  .cqm-hero-btn{padding:2px 4px;font-size:6px}
  .cqm-hero-glyph{font-size:14px}
  .cqm-hero-slot{width:14px;height:14px;font-size:9px}
}
/* V101: tablet landscape 600-1400px — same column values as app.css (already set above for 769-1400).
   For 600-768px tablets, match the same clamp values so the HUD sits between the grid columns. */
@media (min-width:600px) and (max-width:768px) and (orientation:landscape){
  #cqm-hero{left:calc(clamp(120px,20vw,190px) + 10px);right:calc(clamp(120px,22vw,210px) + 10px);
    top:4px;max-height:none;overflow:hidden}
}
/* V100: very narrow landscape (rotated phone / small tablet) — stack vertically, don't overlap */
@media (max-height:520px) and (orientation:landscape){
  #cqm-hero{left:6px;right:6px;top:3px;font-size:9px;max-height:none;overflow:hidden}
  .cqm-hero-box{padding:5px 7px;gap:4px}
  .cqm-hero-r{gap:4px}
}
.cqm-hero-box{pointer-events:auto;border:1px solid rgba(150,120,255,.4);border-radius:14px;
  background:linear-gradient(180deg,rgba(14,9,28,.95),rgba(8,6,18,.92));backdrop-filter:blur(12px);
  box-shadow:0 10px 40px rgba(0,0,0,.6),inset 0 0 30px rgba(80,40,160,.18);padding:5px 8px;
  display:flex;flex-flow:column nowrap;align-items:stretch;gap:3px;max-height:inherit;overflow:hidden;
  transform-origin:top center;will-change:transform}
@media (max-width:599px){.cqm-hero-box{padding:5px 7px;border-radius:10px}}
.cqm-hero-r{display:flex;align-items:center;gap:8px;flex-wrap:nowrap;flex:0 0 auto}
.cqm-hero-av{display:flex;align-items:center;gap:8px;white-space:nowrap}
.cqm-hero-glyph{font-size:20px;color:#c79bff;text-shadow:0 0 12px rgba(170,110,255,.8);animation:cqm-hero-pulse 2.4s ease-in-out infinite}
@keyframes cqm-hero-pulse{0%,100%{text-shadow:0 0 10px rgba(170,110,255,.55)}50%{text-shadow:0 0 22px rgba(200,150,255,.95)}}
@media (prefers-reduced-motion:reduce){.cqm-hero-glyph{animation:none}}
.cqm-hero-name{font-weight:700;letter-spacing:.12em;color:#f0e8ff}
.cqm-hero-lvl{font-size:9px;letter-spacing:.1em;color:#bda4ff;border:1px solid rgba(150,120,255,.4);border-radius:8px;padding:1px 6px}
.cqm-hero-bar{display:flex;align-items:center;gap:6px;min-width:120px;flex:1}
.cqm-hero-bar .lab{font-size:9px;letter-spacing:.08em;width:46px;text-transform:uppercase;color:#a99fce}
.cqm-hero-bar .trk{flex:1;height:9px;border-radius:5px;background:rgba(150,120,255,.14);overflow:hidden;min-width:60px}
.cqm-hero-bar .fil{height:100%;width:0;border-radius:5px;transition:width .3s ease}
.cqm-hero-bar .num{font-size:9px;color:#d8ccff;width:42px;text-align:right;font-variant-numeric:tabular-nums}
.cqm-hero-sec{display:flex;align-items:center;gap:6px;padding:2px 8px;border-radius:8px;background:rgba(80,50,140,.16);white-space:nowrap}
.cqm-hero-sec .t{font-size:8px;letter-spacing:.1em;color:#a99fce;text-transform:uppercase}
.cqm-hero-sec .v{font-size:11px;color:#f0e8ff;font-variant-numeric:tabular-nums}
.cqm-hero-dot{display:inline-block;width:34px;height:5px;border-radius:3px;background:rgba(150,120,255,.16);overflow:hidden;vertical-align:middle}
.cqm-hero-dot i{display:block;height:100%;width:0}
.cqm-hero-inv{display:flex;gap:3px}
.cqm-hero-slot{width:20px;height:20px;display:grid;place-items:center;border:1px solid rgba(150,120,255,.28);border-radius:5px;background:rgba(0,0,0,.3);font-size:12px;color:#c9b6ff}
.cqm-hero-pw{display:flex;gap:5px;flex-wrap:wrap}
.cqm-hero-btn{pointer-events:auto;border:1px solid rgba(150,120,255,.45);border-radius:7px;background:rgba(40,24,80,.5);
  color:#e6dcff;font:600 9px/1 var(--font-mono,ui-monospace,monospace);letter-spacing:.06em;padding:5px 8px;cursor:pointer;
  transition:transform .1s,background .12s,opacity .12s;white-space:nowrap}
.cqm-hero-btn:hover{background:rgba(70,42,130,.7);transform:translateY(-1px)}
.cqm-hero-btn:active{transform:translateY(0)}
.cqm-hero-btn .c{color:#8fe0ff;margin-left:4px}
.cqm-hero-btn.flash{background:rgba(150,110,255,.85);color:#fff}
.cqm-hero-btn.alt{border-color:rgba(110,200,255,.45);color:#cdecff}
.cqm-hero-btn:disabled,.cqm-hero-btn-disabled{opacity:.45;cursor:not-allowed;transform:none;pointer-events:none}
.cqm-hero-dpad{display:grid;grid-template-columns:repeat(3,44px);gap:2px}
.cqm-hero-pad{pointer-events:auto;width:44px;height:44px;display:grid;place-items:center;border:1px solid rgba(110,200,255,.4);
  border-radius:5px;background:rgba(30,40,70,.55);color:#cdecff;font-size:14px;cursor:pointer;user-select:none;touch-action:none}
.cqm-hero-pad:hover{background:rgba(50,70,120,.8)}
.cqm-hero-pad:focus-visible{outline:2px solid rgba(140,200,255,.85);outline-offset:2px;background:rgba(50,70,120,.8)}
.cqm-hero-pad:active{background:rgba(120,110,255,.85);color:#fff}
.cqm-hero-inv[title]{cursor:help}
`;

/** Pin the hero HUD between measured left/right column edges (ResizeObserver + resize). */
function syncHeroHudGutters(doc: Document): void {
  const left = doc.querySelector('.ui-col-left');
  const right = doc.querySelector('.ui-col-right');
  const root = doc.documentElement;
  if (left instanceof HTMLElement) {
    const r = left.getBoundingClientRect();
    root.style.setProperty('--cqm-hud-left', `${Math.round(r.right + 8)}px`);
  }
  if (right instanceof HTMLElement) {
    const r = right.getBoundingClientRect();
    root.style.setProperty(
      '--cqm-hud-right',
      `${Math.round(doc.defaultView?.innerWidth ?? 0) - r.left + 8}px`,
    );
  }
}

/** Scale the hero band to fit its column — no horizontal scrollbar. */
function fitHeroBox(box: HTMLElement): void {
  box.style.transform = '';
  const host = box.parentElement;
  if (!host) return;
  const budget = host.clientWidth - 12;
  // Find the widest row — the box is column layout, so scrollWidth is the max row width.
  let need = 0;
  for (const child of box.children) {
    if (child instanceof HTMLElement) {
      need = Math.max(need, child.scrollWidth);
    }
  }
  if (need > budget && need > 0) {
    box.style.transform = `scale(${Math.max(0.45, budget / need)})`;
  }
}

function bar(
  parent: HTMLElement,
  label: string,
  color: string,
  doc: Document,
): { fil: HTMLElement; num: HTMLElement } {
  const wrap = doc.createElement('div');
  wrap.className = 'cqm-hero-bar';
  const lab = doc.createElement('span');
  lab.className = 'lab';
  lab.textContent = label;
  const trk = doc.createElement('div');
  trk.className = 'trk';
  const fil = doc.createElement('div');
  fil.className = 'fil';
  fil.style.background = color;
  trk.appendChild(fil);
  const num = doc.createElement('span');
  num.className = 'num';
  num.textContent = '—';
  wrap.append(lab, trk, num);
  parent.appendChild(wrap);
  return { fil, num };
}

function stat(parent: HTMLElement, title: string, doc: Document): HTMLElement {
  const sec = doc.createElement('div');
  sec.className = 'cqm-hero-sec';
  const t = doc.createElement('span');
  t.className = 't';
  t.textContent = title;
  const v = doc.createElement('span');
  v.className = 'v';
  v.textContent = '—';
  sec.append(t, v);
  parent.appendChild(sec);
  return v;
}

/** The player HUD. Self-mounts hidden; the world calls {@link activate} on unlock + {@link update} each cadence. */
export class SuperheroHud {
  private readonly root: HTMLElement;
  private readonly bars: Record<string, { fil: HTMLElement; num: HTMLElement }> = {};
  private readonly stats: Record<string, HTMLElement> = {};
  private readonly dots: Record<string, HTMLElement> = {};
  private readonly powers: Record<string, { btn: HTMLElement; cost: number }> = {};
  private readonly nameEl: HTMLElement;
  private readonly lvlEl: HTMLElement;
  private pilotBtn!: HTMLElement; // V41: shows + cycles the control mode (autopilot/assist/manual)
  private camBtn!: HTMLElement; // V41: shows + cycles the camera rig (orbit/3rd/1st)
  private active = false;

  constructor(doc: Document = document) {
    doc.getElementById('cqm-hero')?.remove();
    const style = doc.createElement('style');
    style.textContent = STYLE;
    doc.head.appendChild(style);

    this.root = doc.createElement('div');
    this.root.id = 'cqm-hero';
    this.root.setAttribute('role', 'region');
    this.root.setAttribute('aria-label', 'Superhero player HUD');
    const box = doc.createElement('div');
    box.className = 'cqm-hero-box';

    const fab = doc.createElement('button');
    fab.type = 'button';
    fab.className = 'cqm-hero-fab';
    fab.setAttribute('aria-label', 'Expand superhero HUD');
    fab.title = 'Show hero HUD';
    fab.textContent = '⬢';
    fab.addEventListener('click', () => this.root.classList.remove('min'));
    this.root.appendChild(fab);

    const minBtn = doc.createElement('button');
    minBtn.type = 'button';
    minBtn.className = 'cqm-hero-min';
    minBtn.setAttribute('aria-label', 'Minimize superhero HUD');
    minBtn.title = 'Minimize hero HUD';
    minBtn.textContent = '−';
    minBtn.addEventListener('click', () => this.root.classList.add('min'));

    this.root.appendChild(box);

    // Row A — identity + vitals
    const rowA = doc.createElement('div');
    rowA.className = 'cqm-hero-r cqm-hero-head';
    const av = doc.createElement('div');
    av.className = 'cqm-hero-av';
    av.innerHTML = `<span class="cqm-hero-glyph">⬢</span>`;
    this.nameEl = doc.createElement('span');
    this.nameEl.className = 'cqm-hero-name';
    this.nameEl.textContent = 'SUPERHERO';
    this.lvlEl = doc.createElement('span');
    this.lvlEl.className = 'cqm-hero-lvl';
    this.lvlEl.textContent = 'LV 1';
    av.append(this.nameEl, this.lvlEl);
    rowA.appendChild(av);
    rowA.appendChild(minBtn);
    this.bars.life = bar(rowA, 'Life', '#ff5a6b', doc);
    this.bars.energy = bar(rowA, 'Energy', '#39d6ff', doc);
    this.bars.xp = bar(rowA, 'XP', '#c79bff', doc);
    box.appendChild(rowA);

    // Row B — kit: stats · wallet · neural · inventory · powers · vision/cam
    const rowB = doc.createElement('div');
    rowB.className = 'cqm-hero-r';
    this.stats.power = stat(rowB, 'PWR', doc);
    this.stats.plan = stat(rowB, 'PLAN', doc);
    this.stats.wallet = stat(rowB, 'WALLET', doc);
    // neural emotion dots
    const neu = doc.createElement('div');
    neu.className = 'cqm-hero-sec';
    neu.innerHTML = `<span class="t">NEURAL</span>`;
    for (const [k, col] of [
      ['valence', '#6bff9e'],
      ['arousal', '#ff9f43'],
      ['dominance', '#c06bff'],
    ] as const) {
      const d = doc.createElement('span');
      d.className = 'cqm-hero-dot';
      const i = doc.createElement('i');
      i.style.background = col;
      d.appendChild(i);
      neu.appendChild(d);
      this.dots[k] = i;
    }
    rowB.appendChild(neu);
    // inventory (cosmetic relics until active power-ups land in V42)
    const inv = doc.createElement('div');
    inv.className = 'cqm-hero-inv';
    inv.setAttribute(
      'title',
      'Relic inventory — cosmetic slots for now; active powers coming in V42',
    );
    inv.setAttribute('aria-label', 'Relic inventory');
    for (const g of INVENTORY) {
      const s = doc.createElement('div');
      s.className = 'cqm-hero-slot';
      s.textContent = g;
      inv.appendChild(s);
    }
    rowB.appendChild(inv);
    box.appendChild(rowB);

    // Row C — powers + vision/camera + world data
    const rowC = doc.createElement('div');
    rowC.className = 'cqm-hero-r';
    const pw = doc.createElement('div');
    pw.className = 'cqm-hero-pw';
    for (const p of HERO_POWERS) {
      const b = doc.createElement('button');
      b.type = 'button';
      b.className = 'cqm-hero-btn';
      b.innerHTML = `${p.name}<span class="c">${Math.round(p.cost * 100)}⚡</span>`;
      b.title = p.desc;
      b.setAttribute('aria-label', `${p.name}: ${p.desc} (${Math.round(p.cost * 100)} energy)`);
      b.addEventListener('click', () => {
        b.classList.add('flash');
        setTimeout(() => b.classList.remove('flash'), 180);
        window.dispatchEvent(new CustomEvent('cqm:hero-power', { detail: { id: p.id } }));
      });
      pw.appendChild(b);
      this.powers[p.id] = { btn: b, cost: p.cost };
    }
    rowC.appendChild(pw);
    // V41 — PILOT mode + VISION + CAMERA controls (the PILOT/CAM labels refresh each beat in update()).
    this.pilotBtn = actionBtn(rowC, 'PILOT · AUTO', 'cqm:hero-mode', doc);
    actionBtn(rowC, 'VISION ▣', 'cqm:hero-vision', doc);
    this.camBtn = actionBtn(rowC, 'CAM · ORBIT', 'cqm:hero-cam', doc);
    // V41 — on-screen D-pad for touch / click navigation (keyboard WASD/QE + arrows also fly the avatar).
    buildDpad(rowC, doc);
    this.stats.world = stat(rowC, 'WORLD', doc);
    box.appendChild(rowC);

    doc.body.appendChild(this.root);

    const sync = (): void => {
      syncHeroHudGutters(doc);
      fitHeroBox(box);
    };
    sync();
    doc.defaultView?.addEventListener('resize', sync, { passive: true });
    const ui = doc.getElementById('ui');
    if (ui && typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(sync).observe(ui);
    }
    new ResizeObserver(() => fitHeroBox(box)).observe(box);
  }

  get isActive(): boolean {
    return this.active;
  }

  /** Reveal the HUD (the player has become the 2nd super creature). */
  activate(): void {
    this.active = true;
    this.root.classList.add('on');
    const box = this.root.querySelector('.cqm-hero-box');
    if (box instanceof HTMLElement) fitHeroBox(box);
  }

  /** Repaint from the latest hero view. Cheap; world calls it on the telemetry cadence. */
  update(v: HeroHudView): void {
    if (!this.active) return;
    this.nameEl.textContent = v.name;
    this.lvlEl.textContent = `LV ${v.level}`;
    this.setBar('life', v.life, `${Math.round(v.life * 100)}%`);
    this.setBar('energy', v.energy, `${Math.round(v.energy * 100)}%`);
    this.setBar(
      'xp',
      v.xpForNext > 0 ? v.xp / v.xpForNext : 0,
      `${Math.round(v.xp)}/${v.xpForNext}`,
    );
    this.stats.power!.textContent = `×${v.power}`;
    this.stats.plan!.textContent = v.plan;
    this.stats.wallet!.setAttribute('title', 'Aurum ☉ · Umbra ☾ · Quanta ◇ · Ichor ❖');
    this.stats.wallet!.textContent = `☉${fmt(v.wallet.aurum)} · ☾${fmt(v.wallet.umbra)} · ◇${fmt(v.wallet.quanta)} · ❖${fmt(v.wallet.ichor)}`;
    this.stats.world!.textContent = `${v.world.entities} entities · f${v.world.frame}`;
    for (const id of Object.keys(this.powers)) {
      const { btn, cost } = this.powers[id]!;
      const canAfford = v.energy >= cost;
      btn.classList.toggle('cqm-hero-btn-disabled', !canAfford);
      (btn as HTMLButtonElement).disabled = !canAfford;
      btn.setAttribute('aria-disabled', String(!canAfford));
    }
    this.pilotBtn.textContent = 'PILOT · ' + v.controlMode.toUpperCase();
    this.camBtn.textContent =
      'CAM · ' + (v.camMode === 'orbit' ? 'ORBIT' : v.camMode === 'third' ? '3RD' : '1ST');
    // Clamp to [0,1] so an out-of-range emotion value can't blow the dot width past the track.
    this.dots.valence!.style.width = `${Math.max(0, Math.min(1, (v.emotion.valence + 1) / 2)) * 100}%`;
    this.dots.arousal!.style.width = `${Math.max(0, Math.min(1, v.emotion.arousal)) * 100}%`;
    this.dots.dominance!.style.width = `${Math.max(0, Math.min(1, v.emotion.dominance)) * 100}%`;
  }

  private setBar(key: string, frac: number, label: string): void {
    const b = this.bars[key];
    if (!b) return;
    const f = frac < 0 ? 0 : frac > 1 ? 1 : frac;
    b.fil.style.width = `${(f * 100).toFixed(0)}%`;
    b.num.textContent = label;
  }
}

/** A pill button that dispatches a window CustomEvent on click; returns it so labels can refresh. */
function actionBtn(parent: HTMLElement, label: string, event: string, doc: Document): HTMLElement {
  const b = doc.createElement('button');
  b.type = 'button';
  b.className = 'cqm-hero-btn alt';
  b.textContent = label;
  b.addEventListener('click', () => window.dispatchEvent(new CustomEvent(event)));
  parent.appendChild(b);
  return b;
}

/** V41 — a 6-way on-screen D-pad; press dispatches a held `cqm:hero-move` steer, release zeroes it. */
function buildDpad(parent: HTMLElement, doc: Document): void {
  const pad = doc.createElement('div');
  pad.className = 'cqm-hero-dpad';
  pad.setAttribute('role', 'group');
  pad.setAttribute('aria-label', 'Hero movement pad');
  // row 1: strafe-left · forward · strafe-right   row 2: descend · back · ascend
  const dirs: readonly [string, number, number, number, string][] = [
    ['◀', -1, 0, 0, 'Strafe left'],
    ['▲', 0, 0, 1, 'Forward'],
    ['▶', 1, 0, 0, 'Strafe right'],
    ['⤓', 0, -1, 0, 'Descend'],
    ['▼', 0, 0, -1, 'Back'],
    ['⤒', 0, 1, 0, 'Ascend'],
  ];
  const move = (x: number, y: number, z: number): void =>
    void window.dispatchEvent(new CustomEvent('cqm:hero-move', { detail: { x, y, z } }));
  for (const [glyph, x, y, z, title] of dirs) {
    const b = doc.createElement('button');
    b.type = 'button';
    b.className = 'cqm-hero-pad';
    b.textContent = glyph;
    b.title = title;
    b.setAttribute('aria-label', title);
    let active = false;
    const start = (): void => {
      active = true;
      move(x, y, z);
    };
    const stop = (): void => {
      if (!active) return;
      active = false;
      move(0, 0, 0);
    };
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      start();
    });
    b.addEventListener('pointerup', stop);
    b.addEventListener('pointerleave', stop);
    b.addEventListener('pointercancel', stop);
    // Keyboard activation: Tab to the pad, Enter/Space to press, release to stop.
    b.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        start();
      }
    });
    b.addEventListener('keyup', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        stop();
      }
    });
    b.addEventListener('blur', stop); // release if focus leaves while pressed
    pad.appendChild(b);
  }
  parent.appendChild(pad);
}

/** Compact human number for the wallet readout. */
function fmt(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (a >= 1e3) return (v / 1e3).toFixed(1) + 'k';
  return v.toFixed(0);
}

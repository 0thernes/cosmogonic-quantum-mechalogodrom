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
#cqm-hero{position:fixed;top:calc(42px + env(safe-area-inset-top,0px));left:50%;
  width:min(94vw,760px);max-height:min(78vh,580px);overflow:visible;
  transform:translate(-50%,-150%);z-index:150;
  transition:transform .55s cubic-bezier(.2,.9,.3,1);font-size:13px;line-height:1.45;font-family:var(--font-mono,ui-monospace,monospace);
  color:#e9e3ff;pointer-events:none;
  display:flex;justify-content:center;align-items:flex-start}
#cqm-hero.on{transform:translate(-50%,0)}
#cqm-hero.on.closed{transform:translate(-50%,-150%)}
#cqm-hero.on.min .cqm-hero-box{display:none}
#cqm-hero.on.min .cqm-hero-fab{display:grid}
#cqm-hero:not(.min) .cqm-hero-fab{display:none}
.cqm-hero-fab{pointer-events:auto;display:none;width:150px;height:30px;border-radius:15px;
  border:1px solid rgba(150,120,255,.55);background:linear-gradient(180deg,rgba(24,14,48,.95),rgba(10,8,22,.92));
  color:#d4b8ff;font-size:10px;font-weight:600;letter-spacing:0.08em;cursor:pointer;place-items:center;
  box-shadow:0 4px 18px rgba(0,0,0,.55),0 0 12px rgba(150,120,255,0.3);
  transition:transform .12s,background .12s,border-color .12s}
.cqm-hero-fab:hover{background:rgba(60,36,110,.85);transform:scale(1.05);border-color:#39d6ff}
.cqm-hero-header{display:flex;align-items:center;justify-content:space-between;width:100%;padding-bottom:10px;border-bottom:1px solid rgba(150,120,255,0.22);gap:12px;flex:0 0 auto}
.cqm-hero-chrome{display:flex;align-items:center;gap:6px;pointer-events:auto}
.cqm-hero-min,.cqm-hero-close{pointer-events:auto;border:1px solid rgba(150,120,255,.4);border-radius:8px;
  background:rgba(40,24,80,.92);color:#f1e9ff;font:700 12px/1 var(--font-mono,ui-monospace,monospace);padding:5px 11px;min-width:30px;cursor:pointer;
  transition:background .15s,color .15s,border-color .15s}
.cqm-hero-min:hover,.cqm-hero-close:hover{background:rgba(50,32,95,.75);color:#fff;border-color:rgba(150,120,255,.75)}
.cqm-hero-vitals{display:flex;align-items:center;gap:12px;width:100%;flex-wrap:wrap;flex:0 0 auto}
@media (max-width:599px){#cqm-hero{left:6px;right:6px;top:calc(52px + env(safe-area-inset-top,0px));font-size:11px;max-height:58vh}}
@media (max-width:640px){#cqm-hero{left:4px;right:4px;top:calc(48px + env(safe-area-inset-top,0px));font-size:11px}}
@media (min-width:769px) and (max-width:1400px){
  #cqm-hero{left:calc(clamp(120px,20vw,190px) + 10px);right:calc(clamp(120px,22vw,210px) + 10px);
    top:calc(42px + env(safe-area-inset-top,0px));max-height:min(45vh,350px);font-size:12px}
  .cqm-hero-box{padding:10px 14px;gap:10px;max-width:100%}
  .cqm-hero-r{gap:8px}
  .cqm-hero-bar{min-width:100px}
  .cqm-hero-bar .lab{width:42px;font-size:10px}
  .cqm-hero-bar .trk{min-width:60px;height:10px}
  .cqm-hero-bar .num{width:40px;font-size:10px}
  .cqm-hero-sec{padding:4px 8px;gap:4px}
  .cqm-hero-sec .v{font-size:11px}
  .cqm-hero-pw{gap:5px}
  .cqm-hero-btn{padding:4px 8px;font-size:9px}
  .cqm-hero-glyph{font-size:18px}
  .cqm-hero-slot{width:18px;height:18px;font-size:11px}
  .cqm-hero-dpad{grid-template-columns:repeat(3,40px);gap:3px}
  .cqm-hero-pad{width:40px;height:40px;font-size:13px}
}
/* V101: tablet landscape 600-1400px — same column values as app.css (already set above for 769-1400).
   For 600-768px tablets, match the same clamp values so the HUD sits between the grid columns. */
@media (min-width:600px) and (max-width:768px) and (orientation:landscape){
  #cqm-hero{left:50%;top:4px;max-height:none;overflow:hidden}
}
/* V100: very narrow landscape (rotated phone / small tablet) — stack vertically, don't overlap */
@media (max-height:520px) and (orientation:landscape){
  #cqm-hero{left:50%;top:3px;font-size:10px;max-height:none;overflow:hidden}
  .cqm-hero-box{padding:8px 10px;gap:8px}
  .cqm-hero-r{gap:6px}
}
.cqm-hero-box{pointer-events:auto;border:1px solid rgba(150,120,255,.4);border-radius:14px;
  background:linear-gradient(180deg,rgba(14,9,28,.95),rgba(8,6,18,.92));backdrop-filter:blur(12px);
  box-shadow:0 10px 40px rgba(0,0,0,.6),inset 0 0 30px rgba(80,40,160,.18);padding:18px 20px;
  display:flex;flex-flow:column nowrap;align-items:stretch;gap:14px;max-height:inherit;position:relative;
  transform-origin:top center;will-change:transform;width:100%;min-width:300px;max-width:min(100%,1080px)}
@media (max-width:599px){.cqm-hero-box{padding:12px 14px;border-radius:10px}}
.cqm-hero-content{display:flex;flex-flow:column nowrap;gap:14px;overflow-y:auto;max-height:min(58vh,420px);padding-right:6px;scrollbar-width:thin}
.cqm-hero-r{display:flex;align-items:center;gap:12px;flex-wrap:wrap;flex:0 0 auto}
.cqm-hero-av{display:flex;align-items:center;gap:10px;white-space:nowrap}
.cqm-hero-glyph{font-size:22px;color:#c79bff;text-shadow:0 0 12px rgba(170,110,255,.8);animation:cqm-hero-pulse 2.4s ease-in-out infinite}
@keyframes cqm-hero-pulse{0%,100%{text-shadow:0 0 10px rgba(170,110,255,.55)}50%{text-shadow:0 0 22px rgba(200,150,255,.95)}}
@media (prefers-reduced-motion:reduce){.cqm-hero-glyph{animation:none}}
.cqm-hero-name{font-weight:700;letter-spacing:.12em;color:#f0e8ff}
.cqm-hero-lvl{font-size:10px;letter-spacing:.1em;color:#bda4ff;border:1px solid rgba(150,120,255,.4);border-radius:8px;padding:1px 6px}
.cqm-hero-bar{display:flex;align-items:center;gap:8px;min-width:160px;flex:1 1 180px}
.cqm-hero-bar .lab{font-size:11px;letter-spacing:.08em;width:52px;text-transform:uppercase;color:#a99fce}
.cqm-hero-bar .trk{flex:1;height:12px;border-radius:6px;background:rgba(150,120,255,.14);overflow:hidden;min-width:80px}
.cqm-hero-bar .fil{height:100%;width:0;border-radius:6px;transition:width .3s ease}
.cqm-hero-bar .num{font-size:11px;color:#d8ccff;width:50px;text-align:right;font-variant-numeric:tabular-nums}
.cqm-hero-sec{display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:8px;background:rgba(80,50,140,.16);white-space:nowrap}
.cqm-hero-sec .t{font-size:10px;letter-spacing:.1em;color:#a99fce;text-transform:uppercase}
.cqm-hero-sec .v{font-size:14px;color:#f0e8ff;font-variant-numeric:tabular-nums}
.cqm-hero-dot{display:inline-block;width:34px;height:5px;border-radius:3px;background:rgba(150,120,255,.16);overflow:hidden;vertical-align:middle}
.cqm-hero-dot i{display:block;height:100%;width:0}
.cqm-hero-inv{display:flex;gap:4px}
.cqm-hero-slot{width:22px;height:22px;display:grid;place-items:center;border:1px solid rgba(150,120,255,.28);border-radius:5px;background:rgba(0,0,0,.3);font-size:13px;color:#c9b6ff}
.cqm-hero-pw{display:flex;gap:6px;flex-wrap:wrap}
.cqm-hero-btn{pointer-events:auto;border:1px solid rgba(150,120,255,.45);border-radius:7px;background:rgba(40,24,80,.5);
  color:#e6dcff;font:600 11px/1 var(--font-mono,ui-monospace,monospace);letter-spacing:.06em;padding:8px 12px;cursor:pointer;
  transition:transform .1s,background .12s,opacity .12s;white-space:nowrap}
.cqm-hero-btn:hover{background:rgba(70,42,130,.7);transform:translateY(-1px)}
.cqm-hero-btn:active{transform:translateY(0)}
.cqm-hero-btn .c{color:#8fe0ff;margin-left:4px}
.cqm-hero-btn.flash{background:rgba(150,110,255,.85);color:#fff}
.cqm-hero-btn.alt{border-color:rgba(110,200,255,.45);color:#cdecff}
.cqm-hero-btn:disabled,.cqm-hero-btn-disabled{opacity:.45;cursor:not-allowed;transform:none;pointer-events:none}
.cqm-hero-dpad{display:grid;grid-template-columns:repeat(3,48px);gap:4px}
.cqm-hero-pad{pointer-events:auto;width:48px;height:48px;display:grid;place-items:center;border:1px solid rgba(110,200,255,.4);
  border-radius:6px;background:rgba(30,40,70,.55);color:#cdecff;font-size:16px;cursor:pointer;user-select:none;touch-action:none}
.cqm-hero-pad:hover{background:rgba(50,70,120,.8)}
.cqm-hero-pad:focus-visible{outline:2px solid rgba(140,200,255,.85);outline-offset:2px;background:rgba(50,70,120,.8)}
.cqm-hero-pad:active{background:rgba(120,110,255,.85);color:#fff}
.cqm-hero-pad.action{background:rgba(180,40,120,.45);border-color:rgba(255,120,200,.55);color:#ffd8f0}
.cqm-hero-pad.action:active{background:rgba(255,80,160,.85);color:#fff}
@media (pointer:coarse),(max-width:640px){
  .cqm-hero-dpad{grid-template-columns:repeat(3,52px);gap:4px}
  .cqm-hero-pad{width:52px;height:52px;font-size:18px}
}
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

/** Scale the hero band only as a last resort — never shrink below 0.85 so text stays legible. */
function fitHeroBox(box: HTMLElement): void {
  box.style.transform = '';
  const host = box.parentElement;
  if (!host) return;
  const budget = host.clientWidth - 12;
  let need = 0;
  for (const child of box.children) {
    if (child instanceof HTMLElement) {
      need = Math.max(need, child.scrollWidth);
    }
  }
  if (need > budget && need > 0) {
    box.style.transform = `scale(${Math.max(0.85, budget / need)})`;
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
  private readonly styleEl: HTMLStyleElement;
  private readonly resizeTarget: Window | null;
  private readonly resizeHandler: () => void;
  private readonly resizeObservers: ResizeObserver[] = [];
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
    doc.getElementById('cqm-hero-style')?.remove();
    const style = doc.createElement('style');
    style.id = 'cqm-hero-style';
    style.textContent = STYLE;
    doc.head.appendChild(style);
    this.styleEl = style;

    this.root = doc.createElement('div');
    this.root.id = 'cqm-hero';
    this.root.setAttribute('role', 'region');
    this.root.setAttribute('aria-label', 'Superhero player HUD');
    this.root.tabIndex = -1; // focusable for keyboard Escape handling
    const box = doc.createElement('div');
    box.className = 'cqm-hero-box';

    const fab = doc.createElement('button');
    fab.type = 'button';
    fab.className = 'cqm-hero-fab';
    fab.setAttribute('aria-label', 'Expand superhero HUD');
    fab.title = 'Show hero HUD';
    fab.textContent = '▲ SHOW HERO HUD ▲';
    fab.addEventListener('click', () => this.root.classList.remove('min'));
    this.root.appendChild(fab);

    const minBtn = doc.createElement('button');
    minBtn.type = 'button';
    minBtn.className = 'cqm-hero-min';
    minBtn.setAttribute('aria-label', 'Minimize superhero HUD');
    minBtn.title = 'Minimize hero HUD';
    minBtn.textContent = '_';
    minBtn.addEventListener('click', () => this.minimize());

    const closeBtn = doc.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'cqm-hero-close';
    closeBtn.setAttribute('aria-label', 'Close superhero HUD');
    closeBtn.title = 'Close hero HUD; press ACCESS to reopen';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => this.close());

    const chrome = doc.createElement('div');
    chrome.className = 'cqm-hero-chrome';
    chrome.append(minBtn, closeBtn);

    this.root.appendChild(box);

    // V86 Dedicated non-absolute top header row containing identity on left and chrome on right
    const header = doc.createElement('div');
    header.className = 'cqm-hero-header';

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
    header.appendChild(av);
    header.appendChild(chrome);
    box.appendChild(header);

    // Scrolling content area inside box
    const content = doc.createElement('div');
    content.className = 'cqm-hero-content';
    box.appendChild(content);

    // Vitals Row — Dedicated layout for LIFE + ENERGY + XP bars
    const vitalsRow = doc.createElement('div');
    vitalsRow.className = 'cqm-hero-vitals';
    this.bars.life = bar(vitalsRow, 'Life', '#ff5a6b', doc);
    this.bars.energy = bar(vitalsRow, 'Energy', '#39d6ff', doc);
    this.bars.xp = bar(vitalsRow, 'XP', '#c79bff', doc);
    content.appendChild(vitalsRow);

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
    content.appendChild(rowB);

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
    content.appendChild(rowC);

    doc.body.appendChild(this.root);

    // V114: Escape minimizes the hero HUD; Shift+Escape closes it entirely.
    doc.addEventListener('keydown', (e) => {
      if (!this.active || this.root.classList.contains('closed')) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (e.shiftKey) this.close();
        else this.minimize();
      }
    });

    const sync = (): void => {
      syncHeroHudGutters(doc);
      fitHeroBox(box);
    };
    this.resizeTarget = doc.defaultView;
    this.resizeHandler = sync;
    sync();
    this.resizeTarget?.addEventListener('resize', this.resizeHandler, { passive: true });
    const ui = doc.getElementById('ui');
    if (ui && typeof ResizeObserver !== 'undefined') {
      const uiObserver = new ResizeObserver(sync);
      uiObserver.observe(ui);
      this.resizeObservers.push(uiObserver);
    }
    if (typeof ResizeObserver !== 'undefined') {
      const boxObserver = new ResizeObserver(() => fitHeroBox(box));
      boxObserver.observe(box);
      this.resizeObservers.push(boxObserver);
    }
  }

  get isActive(): boolean {
    return this.active;
  }

  dispose(): void {
    this.resizeTarget?.removeEventListener('resize', this.resizeHandler);
    for (const observer of this.resizeObservers) observer.disconnect();
    this.resizeObservers.length = 0;
    this.root.remove();
    this.styleEl.remove();
  }

  /** Reveal the HUD (the player has become the 2nd super creature). */
  activate(): void {
    this.active = true;
    this.root.classList.add('on', 'min');
    this.root.classList.remove('closed');
    const box = this.root.querySelector('.cqm-hero-box');
    if (box instanceof HTMLElement) fitHeroBox(box);
    this.root.focus({ preventScroll: true });
  }

  /** Collapse to the compact open button; the simulation keeps running. */
  minimize(): void {
    if (!this.active) return;
    this.root.classList.add('min');
    this.root.classList.remove('closed');
  }

  /** Hide the HUD band entirely until ACCESS toggles it back. */
  close(): void {
    if (!this.active) return;
    this.root.classList.add('closed', 'min');
  }

  /** ACCESS-button behavior after unlock: closed/minimized ↔ open full HUD. */
  toggleOpen(): void {
    if (!this.active) return;
    if (this.root.classList.contains('closed') || this.root.classList.contains('min')) {
      this.root.classList.add('on');
      this.root.classList.remove('closed', 'min');
      this.root.focus({ preventScroll: true });
    } else {
      this.minimize();
    }
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

/** V41 — a 7-way on-screen D-pad; 6 held movement buttons + 1 center action tap. */
function buildDpad(parent: HTMLElement, doc: Document): void {
  const pad = doc.createElement('div');
  pad.className = 'cqm-hero-dpad';
  pad.setAttribute('role', 'group');
  pad.setAttribute('aria-label', 'Hero movement pad');
  // Grid order (3 columns): ◀ ▲ ▶ / ⤓ ✦ ⤒ / ▼ · ·
  const dirs: readonly [string, number, number, number, string, boolean][] = [
    ['◀', -1, 0, 0, 'Strafe left', false],
    ['▲', 0, 0, 1, 'Forward', false],
    ['▶', 1, 0, 0, 'Strafe right', false],
    ['⤓', 0, -1, 0, 'Descend', false],
    ['✦', 0, 0, 0, 'Phase action', true],
    ['⤒', 0, 1, 0, 'Ascend', false],
    ['▼', 0, 0, -1, 'Back', false],
  ];
  const move = (x: number, y: number, z: number): void =>
    void window.dispatchEvent(new CustomEvent('cqm:hero-move', { detail: { x, y, z } }));
  const fire = (id: string): void => {
    window.dispatchEvent(new CustomEvent('cqm:hero-power', { detail: { id } }));
  };
  for (const [glyph, x, y, z, title, isAction] of dirs) {
    const b = doc.createElement('button');
    b.type = 'button';
    b.className = 'cqm-hero-pad' + (isAction ? ' action' : '');
    b.textContent = glyph;
    b.title = title;
    b.setAttribute('aria-label', title);
    if (isAction) {
      // Action buttons are one-shot taps, not held movement.
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        b.classList.add('flash');
        setTimeout(() => b.classList.remove('flash'), 180);
        fire('phase');
      });
      b.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
          e.preventDefault();
          fire('phase');
        }
      });
      pad.appendChild(b);
      continue;
    }
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

/**
 * STAGE 1 — perf HUD (render / UI layer — NOT src/sim, NOT src/math).
 *
 * A tiny always-on chip (bottom-left) showing live FPS, the frame-governor's current quality level
 * (full → dpr-shed → fx-off → shadows-off), and the active tier, plus one-tap tier switching (sets
 * `?tier=` and reloads). It makes the Stage-0 crash-proofing VISIBLE — you can watch the governor
 * shed/restore under load — and CONTROLLABLE without hand-editing the URL.
 *
 * DETERMINISM-SAFE: reads only render-layer signals (the rAF dt → FPS, the governor level), never sim
 * state/RNG; uses no Math.random/Date.now. Headless-safe: with no DOM it returns a no-op updater.
 */
import { Level } from '../core/frame-governor';

const TIERS = ['phone', 'laptop', 'desktop', 'ultra', 'mega'] as const;

/** Governor level → short human label. Pure. */
export function qualityLabel(level: Level): string {
  switch (level) {
    case Level.FULL:
      return 'full';
    case Level.DPR_85:
      return 'dpr 85%';
    case Level.DPR_65:
      return 'dpr 65%';
    case Level.FX_OFF:
      return 'fx off';
    case Level.SHADOWS_OFF:
      return 'shadows off';
    default:
      return '—';
  }
}

/** FPS → status bucket (drives the readout colour). Pure. */
export function fpsBucket(fps: number): 'good' | 'ok' | 'bad' {
  if (fps >= 50) return 'good';
  if (fps >= 25) return 'ok';
  return 'bad';
}

const BUCKET_COLOR: Record<'good' | 'ok' | 'bad', string> = {
  good: '#5fe39a',
  ok: '#ffce6b',
  bad: '#ff6b6b',
};

export interface PerfHud {
  /** Update the readout from this frame's FPS + the governor level. O(1) text writes only. */
  update(fps: number, level: Level): void;
}

const NOOP: PerfHud = { update: () => undefined };

/**
 * Mount the perf chip into the document and return an updater. Headless-safe: returns a no-op updater
 * when there is no DOM (e.g. under `bun test`), so importing/calling this never throws off-browser.
 */
export function mountPerfHud(currentTier: string): PerfHud {
  if (typeof document === 'undefined' || !document.body) return NOOP;

  const el = document.createElement('div');
  el.id = 'perf-hud';

  const mountParent = document.getElementById('perf-slot') ?? document.body;

  const fpsEl = document.createElement('span');
  const qEl = document.createElement('span');
  qEl.className = 'perf-hud-quality';
  const line1 = document.createElement('div');
  line1.appendChild(fpsEl);
  line1.appendChild(document.createTextNode(' · '));
  line1.appendChild(qEl);

  const tierRow = document.createElement('div');
  tierRow.className = 'perf-hud-row';
  for (const t of TIERS) {
    const b = document.createElement('button');
    b.textContent = t === currentTier ? `[${t}]` : t;
    b.title = `Switch to the ${t} tier (reloads)`;
    b.className = 'perf-hud-tier' + (t === currentTier ? ' current' : '');
    b.addEventListener('click', () => {
      const u = new URL(window.location.href);
      u.searchParams.set('tier', t);
      window.location.href = u.toString();
    });
    tierRow.appendChild(b);
  }

  // Stage 2: surface the (already-built) free-fly camera — it works in the default 'free' view but
  // was undiscoverable. drag = look, scroll = zoom, WASD/arrows = fly.
  const hint = document.createElement('div');
  hint.className = 'perf-hud-hint';
  hint.textContent = 'fly: drag · scroll · WASD';

  el.appendChild(line1);
  el.appendChild(tierRow);
  el.appendChild(hint);
  mountParent.appendChild(el);

  return {
    update(fps: number, level: Level): void {
      const bucket = fpsBucket(fps);
      fpsEl.textContent = `${Math.round(fps)} fps`;
      fpsEl.style.color = BUCKET_COLOR[bucket];
      qEl.textContent = `q: ${qualityLabel(level)}`;
    },
  };
}

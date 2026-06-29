/**
 * SATELLITE MUSIC (V102) — keeps the procedural soundtrack alive on Docs / Spec / Lab pages.
 * Reads the same persisted `cqm.state` as the dome; mounts a compact bar in `.sat-header-inner`.
 * Self-mounting on import; safe to include from bundled HTML entries or `/satellite-music.js`.
 */
import { AudioEngine } from './audio/engine';
import { MemoryStore } from './memory/store';
import { mulberry32 } from './math/rng';
import { SONGS } from './audio/songs';
import type { SimState } from './types';

const STYLE_ID = 'cqm-sat-music-style';
const STYLE = `
.cqm-sat-music{display:inline-flex;align-items:center;gap:6px;margin-left:auto;flex-shrink:0}
.cqm-sat-music-btn{border:1px solid rgba(120,160,255,.35);background:rgba(8,14,30,.85);color:#cfe0fb;
  border-radius:6px;padding:4px 8px;font:600 9px/1 var(--font-mono,ui-monospace,monospace);
  letter-spacing:.06em;cursor:pointer;white-space:nowrap;transition:border-color .12s,background .12s}
.cqm-sat-music-btn:hover{border-color:rgba(0,238,255,.55);background:rgba(20,40,70,.9)}
.cqm-sat-music-btn.on{border-color:rgba(0,238,255,.65);color:#fff;background:rgba(0,70,110,.45)}
.cqm-sat-music-lab{font:500 9px var(--font-mono,monospace);color:#7f93b8;max-width:8em;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media (max-width:640px){.cqm-sat-music-lab{display:none}}
`;

/** Minimal sim slice — AudioEngine only reads `songIdx` for scheduling. */
function miniState(songIdx: number): SimState {
  return { songIdx } as SimState;
}

function mountSatelliteMusic(doc: Document = document): void {
  if (doc.getElementById('cqm-sat-music')) return;

  const store = new MemoryStore();
  const persisted = store.load() ?? store.defaults();
  const state = miniState(persisted.songIdx % SONGS.length);
  const audio = new AudioEngine(state, mulberry32((persisted.seed ^ 0xa0d10) >>> 0 || 1));

  let style = doc.getElementById(STYLE_ID);
  if (!style) {
    style = doc.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLE;
    doc.head.appendChild(style);
  }

  const wrap = doc.createElement('div');
  wrap.id = 'cqm-sat-music';
  wrap.className = 'cqm-sat-music';
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', 'Background music');

  const toggle = doc.createElement('button');
  toggle.type = 'button';
  toggle.className = 'cqm-sat-music-btn' + (persisted.musicOn ? ' on' : '');
  toggle.textContent = persisted.musicOn ? '♫ ON' : '♫ OFF';
  toggle.title = 'Toggle background music (synced with the dome)';

  const cycle = doc.createElement('button');
  cycle.type = 'button';
  cycle.className = 'cqm-sat-music-btn';
  cycle.textContent = '⇄ Song';
  cycle.title = 'Cycle song';

  const label = doc.createElement('span');
  label.className = 'cqm-sat-music-lab';
  label.textContent = SONGS[state.songIdx]?.name ?? 'Song';

  const persist = (): void => {
    persisted.musicOn = audio.musicOn;
    persisted.songIdx = state.songIdx;
    store.save(persisted);
  };

  const unlock = (): void => {
    audio.init();
    if (persisted.musicOn) audio.setMusicOn(true);
    label.textContent = SONGS[state.songIdx]?.name ?? 'Song';
  };

  toggle.addEventListener('click', () => {
    audio.init();
    audio.toggleMusic();
    toggle.classList.toggle('on', audio.musicOn);
    toggle.textContent = audio.musicOn ? '♫ ON' : '♫ OFF';
    persist();
  });

  cycle.addEventListener('click', () => {
    audio.init();
    audio.cycleSong();
    label.textContent = SONGS[state.songIdx]?.name ?? 'Song';
    if (!audio.musicOn) {
      audio.toggleMusic();
      toggle.classList.add('on');
      toggle.textContent = '♫ ON';
    }
    persist();
  });

  wrap.append(toggle, cycle, label);

  const host = doc.querySelector('.sat-header-inner') ?? doc.querySelector('header') ?? doc.body;
  host.appendChild(wrap);

  // First gesture unlocks Web Audio (browser policy).
  doc.addEventListener('pointerdown', unlock, { once: true });
  doc.addEventListener('keydown', unlock, { once: true });
  if (persisted.musicOn) {
    // If the user already opted in, try immediately (may still need gesture).
    unlock();
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => mountSatelliteMusic(), { once: true });
  } else {
    mountSatelliteMusic();
  }
}

export { mountSatelliteMusic };

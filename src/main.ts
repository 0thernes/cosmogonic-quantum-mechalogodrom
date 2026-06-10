/**
 * Browser entrypoint: htmx activation, quality detection, engine boot,
 * persisted-state load, world construction, and the requestAnimationFrame loop.
 */
import 'htmx.org';
import * as THREE from 'three';
import { detectQuality } from './core/quality';
import { Engine } from './core/engine';
import { MemoryStore } from './memory/store';
import { AuditTrail } from './logging/audit';
import { createLogger } from './logging/logger';
import { World } from './world';

// Legacy r128 color fidelity: the original rendered without color management;
// disable it BEFORE any THREE.Color is constructed (audit finding, 0.2.1).
THREE.ColorManagement.enabled = false;

const log = createLogger('main');

const canvas = document.getElementById('c');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('boot failure: #c canvas element is missing');
}

const quality = detectQuality();
const engine = new Engine(canvas, quality);

const store = new MemoryStore();
const persisted = store.load() ?? store.defaults();
persisted.sessions += 1;
store.save(persisted);

const audit = new AuditTrail();
const world = new World({ engine, quality, persisted, store, audit });

window.addEventListener('resize', () => engine.onResize());

// Legacy parity: any first gesture unlocks audio (and restores persisted SFX).
const unlock = (): void => world.unlock();
document.addEventListener('pointerdown', unlock, { once: true, passive: true });
document.addEventListener('click', unlock, { once: true, passive: true });

audit.record('boot', { session: persisted.sessions, seed: persisted.seed });
log.info('boot', {
  seed: persisted.seed,
  session: persisted.sessions,
  mobile: quality.isMobile,
  maxEntities: quality.maxEntities,
});

// rAF-timestamp delta; world.step clamps to 50ms so tab-switch gaps are safe.
// The first callback's timestamp can precede a performance.now() taken at
// module eval, so dt is floored at 0 to keep the very first frame sane.
let last = performance.now();
function frame(now: number): void {
  requestAnimationFrame(frame);
  const dt = Math.max(0, now - last) / 1000;
  last = now;
  world.step(dt);
}
requestAnimationFrame(frame);

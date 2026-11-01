/**
 * Mini World flora fills its exact 1/10 target (6,000 desktop / 2,080 phone). Before the fix the
 * unscaled glade clearings covered the 1/10-area field and only ~35% of the plants were placed.
 * Runs in a child process because WORLD_SCALE is fixed at module load from `location.search`.
 */
import { describe, expect, test } from 'bun:test';

const PROBE = `
globalThis.location = { search: '?world=mini' };
const THREE = await import('three');
const m = await import('./src/sim/alien-flora.ts');
const out = [];
for (const isMobile of [false, true]) {
  const f = new m.AlienFlora({ scene: new THREE.Scene(), quality: { isMobile } });
  out.push([f.instanceCount, isMobile ? m.ALIEN_FLORA_TARGET_MOBILE : m.ALIEN_FLORA_TARGET_DESKTOP]);
}
console.log(JSON.stringify(out));
`;

describe('Mini World alien flora', () => {
  test('places exactly its scaled desktop and phone targets', () => {
    const r = Bun.spawnSync([process.execPath, '-e', PROBE], { cwd: process.cwd() });
    expect(r.exitCode).toBe(0);
    const out = JSON.parse(r.stdout.toString().trim().split('\n').pop()!) as [number, number][];
    expect(out).toEqual([
      [6000, 6000],
      [2080, 2080],
    ]);
  }, 60_000);
});

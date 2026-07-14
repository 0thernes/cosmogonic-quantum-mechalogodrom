/**
 * Crystal/Big Tree ecosystem benchmark — runnable standalone
 * (`bun bench/crystal-ecosystem.bench.ts`) or aggregated via `bun bench/index.ts`.
 *
 * Measures one full production-census `update()`: ~30k instanced canopy sync, the 20k-item edible
 * registry clock, 250 neural residents (6→6→4 TinyMLP inference + state machines + food
 * transactions) and 99 ambient fauna. Reference machine: ≈ 0.77 ms median (2026-07-14) — ≤ 5% of a
 * 16.67 ms frame. The matching regression guard lives in tests/crystal-ecosystem-perf.test.ts.
 *
 * Deterministic fixture: seeded construction, fixed frame inputs; the bench advances sim time so
 * respawn clocks, resident cadences, and canopy motion all stay on their live paths.
 */
import { bench, group, run } from 'mitata';
import * as THREE from 'three';
import { CrystalEcosystem, type CrystalEcosystemFrame } from '../src/sim/crystal-ecosystem';

const tree = new CrystalEcosystem(new THREE.Scene(), 0xc7ee, new THREE.Vector3(0, 0, 0));
const frame: CrystalEcosystemFrame = {
  dt: 1 / 60,
  visualDt: 1 / 60,
  time: 0,
  chaos: 0.4,
  entropy: 0.3,
  windX: 1.5,
  windZ: -0.75,
  weather: 0.6,
};
// Warm the state machines past boot transients so the bench measures steady state.
for (let i = 0; i < 30; i++) {
  frame.time += 1 / 60;
  tree.update(frame);
}

group('crystal-ecosystem', () => {
  bench('full-census update (30k canopy · 20k food · 349 beings)', () => {
    frame.time += 1 / 60;
    tree.update(frame);
  });
});

if (import.meta.main) {
  await run();
}

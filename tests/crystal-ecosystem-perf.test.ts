/**
 * Crystal/Big Tree measured frame-cost guard (Master File III: "if it is not measured, it is not
 * real"). The full production census — ~30k instanced canopy, 20k edible resources, 250 neural
 * residents + 99 ambient fauna — runs one update() in ≈ 0.77 ms median on the reference machine
 * (see bench/crystal-ecosystem.bench.ts). The generous 20 ms ceiling (~26× slack) never flakes on
 * a loaded CI runner, yet a structural regression — a per-frame allocation storm, an accidental
 * full-pool scan, or an O(n²) resident coupling — would balloon far past it.
 *
 * Wall-clock budgets are only falsifiable without coverage instrumentation; under the instrumented
 * gate child this asserts a finite positive sample instead (tests/coverage-mode.ts).
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { CrystalEcosystem, type CrystalEcosystemFrame } from '../src/sim/crystal-ecosystem';
import { expectWallBudgetMs } from './coverage-mode';

const CRYSTAL_FULL_BUDGET_MS = 20;

function median(xs: readonly number[]): number {
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

describe('CrystalEcosystem — full-census perf guard', () => {
  test(`production-census update stays under ${CRYSTAL_FULL_BUDGET_MS}ms/frame (median)`, () => {
    const scene = new THREE.Scene();
    const tree = new CrystalEcosystem(scene, 0xc7ee, new THREE.Vector3(0, 0, 0));
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
    const step = (): number => {
      const t0 = performance.now();
      frame.time += 1 / 60;
      tree.update(frame);
      return performance.now() - t0;
    };
    for (let i = 0; i < 20; i++) step(); // warm the JIT + state machines
    // Confirm the HEAVY path was measured: the full authored census is live, not a stub.
    const stats = tree.stats();
    expect(stats.quantumCreatures).toBeGreaterThanOrEqual(250);
    expect(stats.leaves + stats.fruits).toBeGreaterThanOrEqual(20_000);
    const samples: number[] = [];
    for (let i = 0; i < 40; i++) samples.push(step());
    expectWallBudgetMs(median(samples), CRYSTAL_FULL_BUDGET_MS);
    tree.dispose();
  }, 60_000);
});

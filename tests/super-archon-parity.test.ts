/**
 * ARCHON PARITY (GOAL) — every one of the 5 Super Creatures must carry its OWN 100-robot wingman escort
 * AND its OWN evolution arc, so all five level up + ascend SEPARATELY (dynamically off their own state) —
 * not just the prime (Archon 0), which was the bug: a single `wingSwarm` + single `superEvo` were wired to
 * `superBodies[0]` only, leaving the other four apexes escort-less and frozen at BASE.
 *
 * World itself is not unit-instantiable (THREE/canvas), so this gates the per-instance properties the
 * world.ts fix now relies on: five INDEPENDENT {@link SuperEvolution}s and five INDEPENDENT
 * {@link WingmanSwarm}s (one per Archon), each escort a real 100 × ~250-param brain pool.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { WingmanSwarm, WINGMAN_COUNT, WINGMAN_PARAMS_EACH } from '../src/sim/super-wingmen';
import { SuperEvolution, MAX_LEVEL } from '../src/sim/super-evolution';

const ARCHONS = 5;
const Q = [0, 0, 0, 0, 0, 0, 0, 0.4, 0, 0.5]; // a sample quantum-aspect vector (reactive/adaptive live)

/** Build the 5 Archon swarms the way world.ts does: one per Archon, each on its own mindSeed-derived rng. */
function buildSwarms(): WingmanSwarm[] {
  const master = 0x5e1f3d11;
  return Array.from({ length: ARCHONS }, (_, i) => {
    const mindSeed = (master + i * 0x9e3779b1) >>> 0 || 1 + i;
    return new WingmanSwarm(WINGMAN_COUNT, mulberry32((mindSeed ^ 0x77149abc) >>> 0 || 1));
  });
}

describe('Archon parity — every apex gets its own 100-robot wingman escort', () => {
  test('all 5 Archons carry a full 100-robot escort (500 robots, ~250 params each)', () => {
    const swarms = buildSwarms();
    expect(swarms).toHaveLength(ARCHONS);
    let totalRobots = 0;
    for (const sw of swarms) {
      expect(sw.count).toBe(100); // NOT just the prime — every Archon's swarm is full
      expect(sw.positions).toHaveLength(300);
      expect(WINGMAN_PARAMS_EACH).toBeGreaterThanOrEqual(200);
      expect(WINGMAN_PARAMS_EACH).toBeLessThanOrEqual(300);
      totalRobots += sw.count;
    }
    expect(totalRobots).toBe(ARCHONS * WINGMAN_COUNT); // 500 across the pantheon
  });

  test('the 5 escorts are INDEPENDENT — distinct brains steer to distinct formations', () => {
    const swarms = buildSwarms();
    // fly each swarm around its own (distinct) Archon centre for a while.
    for (let f = 0; f < 40; f++) {
      for (let a = 0; a < ARCHONS; a++) {
        const cx = Math.cos((a / ARCHONS) * 6.283) * 40;
        const cz = Math.sin((a / ARCHONS) * 6.283) * 40;
        swarms[a]!.update(cx, 14, cz, 0.6 + 0.05 * a, Q, f / 60, 1 / 60);
      }
    }
    // no two swarms share a position buffer (each is its own escort, not one shared swarm)
    for (let a = 0; a < ARCHONS; a++) {
      for (let b = a + 1; b < ARCHONS; b++) {
        expect(Array.from(swarms[a]!.positions)).not.toEqual(Array.from(swarms[b]!.positions));
      }
    }
  });

  test('each escort is deterministic and NaN-free (per-Archon replay from its seed)', () => {
    const a = buildSwarms();
    const b = buildSwarms();
    for (let f = 0; f < 30; f++) {
      for (let k = 0; k < ARCHONS; k++) {
        a[k]!.update(10 * k, 12, -10 * k, 0.7, Q, f / 60, 1 / 60);
        b[k]!.update(10 * k, 12, -10 * k, 0.7, Q, f / 60, 1 / 60);
      }
    }
    for (let k = 0; k < ARCHONS; k++) {
      expect(Array.from(a[k]!.positions)).toEqual(Array.from(b[k]!.positions));
      for (const v of a[k]!.positions) expect(Number.isFinite(v)).toBe(true);
    }
  });
});

describe('Archon parity — every apex levels up + ascends SEPARATELY', () => {
  test('five independent evolutions ticked at distinct vitalities reach distinct levels (all progress)', () => {
    const evos = Array.from({ length: ARCHONS }, () => new SuperEvolution());
    const vit = [0.15, 0.35, 0.55, 0.75, 1.0]; // each Archon lives at a different dominance/novelty
    for (let f = 0; f < 6000; f++) {
      for (let a = 0; a < ARCHONS; a++) evos[a]!.tick(1 / 60, vit[a]!);
    }
    const levels = evos.map((e) => e.level);
    // every Archon advanced past BASE — none is frozen (the bug left 4 of 5 stuck at level 1)
    for (const lv of levels) expect(lv).toBeGreaterThan(1);
    // and they are genuinely SEPARATE arcs: a livelier Archon out-levels a dormant one, monotonically.
    for (let a = 1; a < ARCHONS; a++) expect(levels[a]!).toBeGreaterThan(levels[a - 1]!);
    expect(new Set(levels).size).toBeGreaterThan(1); // not all identical — independent progression
  });

  test('a high-vitality Archon ASCENDS (LV100) while a dormant one does not — separate summits', () => {
    const hot = new SuperEvolution();
    const cold = new SuperEvolution();
    const rng = mulberry32(0xa5ce);
    hot.applyDays(150, rng); // a lively Archon trains through the hyperbolic field to the summit
    cold.applyDays(4, rng); // a dormant peer barely stirs
    expect(hot.level).toBeGreaterThanOrEqual(MAX_LEVEL);
    expect(hot.ascended).toBe(true); // it reaches its OWN ascension
    expect(cold.ascended).toBe(false); // independently of the peer, which has not
    expect(hot.powers().length).toBeGreaterThan(cold.powers().length); // godlike powers accrue per-Archon
  });

  test('per-Archon evolution is deterministic (same vitality stream ⇒ same arc)', () => {
    const a = new SuperEvolution();
    const b = new SuperEvolution();
    for (let f = 0; f < 3000; f++) {
      a.tick(1 / 60, 0.8);
      b.tick(1 / 60, 0.8);
    }
    expect(a.level).toBe(b.level);
    expect(a.view().power).toBe(b.view().power);
  });
});

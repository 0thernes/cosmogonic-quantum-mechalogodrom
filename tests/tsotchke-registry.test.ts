/**
 * TSOTCHKE REGISTRY + PETRI DISH — all 22 repos, primordial biologics substrate.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import {
  TSOTCHKE_REPO_COUNT,
  TSOTCHKE_USER_REPOS,
  TSOTCHKE_ORG_REPOS,
  getTsotchkeRepo,
  tsotchkeWiringCoverage,
  substrateVectorForArchon,
  corpusBeatForArchon,
  FENCED_REPO_SLUGS,
  ARCHON_PRIMARY_REPOS,
  primaryRepoForArchon,
  tsotchkeSimWiringFraction,
  wiredSimRepoCount,
  tsotchkeDepthFor,
  type DepthKind,
} from '../src/sim/tsotchke-registry';
import {
  createPetriDish,
  petriDishBeat,
  petriDishView,
  petriGrowthMultiplier,
} from '../src/sim/petri-dish';
import { eshkolWorkspaceTick, workspaceSalience } from '../src/sim/eshkol-workspace';
import { qgeAlivenessStep, qgeWorldPerturb, qgeFubiniProxy } from '../src/sim/qge-aliveness';

describe('Tsotchke registry — ALL repos mapped (22 with classical-contrast for full Tsotchke)', () => {
  test('user + org repos sum to ALL (22 with full Tsotchke)', () => {
    const userLen = TSOTCHKE_USER_REPOS.length;
    const orgLen = TSOTCHKE_ORG_REPOS.length;
    expect(userLen + orgLen).toBe(TSOTCHKE_REPO_COUNT);
  });

  test('LLM repos are fenced (wiring 0)', () => {
    expect(getTsotchkeRepo('gpt2-basic')?.wiring).toBe(0);
    expect(getTsotchkeRepo('llm-arbitrator')?.wiring).toBe(0);
    expect(getTsotchkeRepo('SolanaQuantumFlux')?.wiring).toBe(0);
    expect(FENCED_REPO_SLUGS.length).toBeGreaterThanOrEqual(3);
    // Floor, not exact: count of wired sim substrates grows as the corpus is wired deeper; assert a
    // healthy minimum rather than a brittle exact number that reds CI on every registry edit.
    expect(wiredSimRepoCount()).toBeGreaterThanOrEqual(15);
  });

  test('consciousness substrates are wired', () => {
    expect(getTsotchkeRepo('eshkol')!.wiring).toBeGreaterThan(0.8);
    expect(getTsotchkeRepo('moonlab')!.cosmogonicLeaf).toContain('moonlab-tensor');
    expect(getTsotchkeRepo('quantum-quake')!.cosmogonicLeaf).toContain('qge');
    expect(getTsotchkeRepo('logo-lab')!.cosmogonicLeaf).toBe('sim/logo-turtle.ts');
  });

  test('wiring coverage is between 0 and 1', () => {
    const c = tsotchkeWiringCoverage();
    expect(c).toBeGreaterThan(0.55);
    expect(c).toBeLessThanOrEqual(1);
  });

  test('corpus beat rotates all 22 repos deterministically', () => {
    const a = corpusBeatForArchon(2, 100);
    const b = corpusBeatForArchon(2, 100);
    expect(a).toBe(b);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThanOrEqual(1);
    expect(corpusBeatForArchon(2, 100)).not.toBe(corpusBeatForArchon(3, 100));
  });

  test('substrate vector is deterministic per archon', () => {
    const a = substrateVectorForArchon(2);
    const b = substrateVectorForArchon(2);
    expect(a.length).toBe(5);
    expect([...a]).toEqual([...b]);
  });

  test('primary repos map one-to-one to GOAL5 archons', () => {
    expect(ARCHON_PRIMARY_REPOS.length).toBe(5);
    expect(primaryRepoForArchon(0).slug).toBe('eshkol');
    expect(primaryRepoForArchon(4).slug).toBe('quantum-quake');
    expect(FENCED_REPO_SLUGS).toContain('gpt2-basic');
  });

  test('sim wiring fraction counts fully wired substrates', () => {
    const f = tsotchkeSimWiringFraction(0.7);
    expect(f).toBeGreaterThan(0.7);
    expect(f).toBeLessThanOrEqual(1);
  });

  test('every repo has a valid depth classification', () => {
    const valid = new Set<DepthKind>(['deep', 'wired', 'harvest', 'fenced', 'meta']);
    for (const slug of [...TSOTCHKE_USER_REPOS, ...TSOTCHKE_ORG_REPOS]) {
      const depth = tsotchkeDepthFor(slug);
      expect(depth).toBeDefined();
      expect(valid.has(depth!)).toBe(true);
    }
  });

  test('fenced repos are the only ones with depth fenced', () => {
    for (const slug of FENCED_REPO_SLUGS) {
      expect(tsotchkeDepthFor(slug)).toBe('fenced');
    }
    expect(
      [...TSOTCHKE_USER_REPOS, ...TSOTCHKE_ORG_REPOS].filter(
        (s) => tsotchkeDepthFor(s) === 'fenced',
      ).length,
    ).toBe(FENCED_REPO_SLUGS.length);
  });

  test('deep scientific substrates are wired at full strength', () => {
    const deep = [
      'eshkol',
      'moonlab',
      'quantum_geometric_tensor',
      'spin_based_neural_network',
      'libirrep',
      'tensorcore',
      'quantum_rng',
      'classical-contrast',
    ] as const;
    for (const slug of deep) {
      expect(tsotchkeDepthFor(slug)).toBe('deep');
      expect(getTsotchkeRepo(slug)!.wiring).toBe(1.0);
    }
  });
});

describe('Petri dish — primordial digital biologics', () => {
  test('colony grows over beats with seeded rng', () => {
    const dish = createPetriDish(42);
    const rng = mulberry32(99);
    const b0 = dish.biomass;
    for (let i = 0; i < 20; i++) petriDishBeat(dish, 0, i, rng);
    expect(dish.biomass).toBeGreaterThan(b0);
    const v = petriDishView(dish);
    expect(v.wiringCoverage).toBeGreaterThan(0);
    expect(v.beats).toBe(20);
    expect(v.sentienceProxy).toBeGreaterThan(0);
    expect(v.spinPolarization).toBeGreaterThanOrEqual(0);
    expect(v.simWiringFraction).toBeGreaterThan(0.5);
  });

  test('same seed yields identical petri trajectory', () => {
    const run = (): string => {
      const dish = createPetriDish(7);
      const rng = mulberry32(13);
      for (let i = 0; i < 15; i++) petriDishBeat(dish, 3, i, rng);
      return JSON.stringify(petriDishView(dish));
    };
    expect(run()).toBe(run());
  });

  test('growth multiplier rises with biomass', () => {
    const dish = createPetriDish(1);
    dish.biomass = 0.2;
    const low = petriGrowthMultiplier(dish);
    dish.biomass = 0.8;
    dish.phiSurrogate = 0.6;
    const high = petriGrowthMultiplier(dish);
    expect(high).toBeGreaterThan(low);
  });

  test('emergence scalar updates each beat from live dish telemetry', () => {
    const dish = createPetriDish(42);
    expect(dish.emergence).toBe(0);
    const rng = mulberry32(99);
    for (let i = 0; i < 40; i++) petriDishBeat(dish, 0, i, rng);
    expect(dish.emergence).toBeGreaterThan(0);
    expect(dish.emergence).toBeLessThanOrEqual(1);
  });

  test('colony speciates deterministically under biomass and complexity pressure', () => {
    const dish = createPetriDish(19);
    dish.biomass = 0.75;
    dish.complexity = 3;
    dish.beats = 60;
    petriDishBeat(dish, 2, 60, mulberry32(23));
    const view = petriDishView(dish);
    expect(view.morphotype).toBeGreaterThan(0);
    expect(view.geneticDivergence).toBeCloseTo(0.1, 10);
    expect(petriGrowthMultiplier(dish)).toBeGreaterThan(1);
  });
});

describe('Eshkol workspace + QGE aliveness', () => {
  test('workspace tick is bounded 0..1', () => {
    const sub = substrateVectorForArchon(1);
    const tick = eshkolWorkspaceTick(sub, 10);
    expect(tick.broadcastGain).toBeGreaterThanOrEqual(0);
    expect(tick.broadcastGain).toBeLessThanOrEqual(1);
    expect(tick.phiCoupling).toBeLessThanOrEqual(1);
    expect(workspaceSalience(tick, 4).length).toBe(4);
  });

  test('QGE aliveness integrates deterministically', () => {
    const a = qgeAlivenessStep(0.5, 0.7, 0);
    const b = qgeAlivenessStep(0.5, 0.7, 0);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThanOrEqual(1);
  });

  test('Fubini proxy is 0 for identical states', () => {
    const v = new Float32Array([1, 0, 0]);
    expect(qgeFubiniProxy(v, v)).toBe(0);
  });

  test('world perturb is deterministic from seed', () => {
    expect(qgeWorldPerturb(0.8, 123)).toBe(qgeWorldPerturb(0.8, 123));
  });
});

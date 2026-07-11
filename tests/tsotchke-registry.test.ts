/**
 * TSOTCHKE REGISTRY + PETRI DISH — 22 external repos plus separate internal controls.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import {
  TSOTCHKE_REPO_COUNT,
  TSOTCHKE_USER_REPOS,
  TSOTCHKE_ORG_REPOS,
  TSOTCHKE_BRAIN_CHANNELS,
  TSOTCHKE_INTERNAL_CONTROLS,
  getTsotchkeRepo,
  getTsotchkeRepoByIndex,
  tsotchkeWiringCoverage,
  tsotchkeWiredSubstrateFraction,
  substrateVectorForArchon,
  corpusBeatForArchon,
  biologicProgramFingerprint,
  FENCED_REPO_SLUGS,
  ARCHON_PRIMARY_REPOS,
  primaryRepoForArchon,
  tsotchkeSimWiringFraction,
  wiredSimRepoCount,
  tsotchkeBrainChannelFor,
  tsotchkeBrainChannelIndex,
  tsotchkeDepthFor,
  type DepthKind,
  type TsotchkeBrainChannel,
  type TsotchkeIntegrationMode,
  type TsotchkeRepoSlug,
} from '../src/sim/tsotchke-registry';
import {
  createPetriDish,
  petriDishBeat,
  petriDishView,
  petriGrowthMultiplier,
} from '../src/sim/petri-dish';
import { eshkolWorkspaceTick, workspaceSalience } from '../src/sim/eshkol-workspace';
import { qgeAlivenessStep, qgeWorldPerturb, qgeFubiniProxy } from '../src/sim/qge-aliveness';

const EXPECTED_USER_REPOS = [
  'eshkol',
  'moonlab',
  'tensorcore',
  'libirrep',
  'spin_based_neural_network',
  'quantum_geometric_tensor',
  'quantum_rng',
  'gpt2-basic',
  'homebrew-eshkol',
  'llm-arbitrator',
  'simple_mnist',
  'asteroids',
  'classical_rng',
  'PINN',
  'PIMC',
] as const;

const EXPECTED_ORG_REPOS = [
  'ulg',
  'logo-lab',
  'quantum-quake',
  'SolanaQuantumFlux',
  'Quantum-RNG-API',
  'OBLITERATUS',
  '.github',
] as const;

const EXPECTED_BRAIN_CHANNELS = [
  ['eshkol', 'resource'],
  ['moonlab', 'social'],
  ['tensorcore', 'resource'],
  ['libirrep', 'social'],
  ['spin_based_neural_network', 'threat'],
  ['quantum_geometric_tensor', 'exploration'],
  ['quantum_rng', 'exploration'],
  ['gpt2-basic', null],
  ['homebrew-eshkol', 'resource'],
  ['llm-arbitrator', null],
  ['simple_mnist', 'threat'],
  ['asteroids', 'threat'],
  ['classical_rng', 'exploration'],
  ['PINN', 'resource'],
  ['PIMC', 'exploration'],
  ['ulg', 'social'],
  ['logo-lab', 'resource'],
  ['quantum-quake', 'threat'],
  ['SolanaQuantumFlux', null],
  ['Quantum-RNG-API', 'exploration'],
  ['OBLITERATUS', null],
  ['.github', null],
] as const satisfies readonly (readonly [TsotchkeRepoSlug, TsotchkeBrainChannel | null])[];

describe('Tsotchke registry — exact external ledger and internal-control boundary', () => {
  test('live external parity is exactly 15 user + 7 org repositories', () => {
    expect(TSOTCHKE_USER_REPOS).toEqual(EXPECTED_USER_REPOS);
    expect(TSOTCHKE_ORG_REPOS).toEqual(EXPECTED_ORG_REPOS);
    expect(TSOTCHKE_USER_REPOS).toHaveLength(15);
    expect(TSOTCHKE_ORG_REPOS).toHaveLength(7);
    expect(TSOTCHKE_REPO_COUNT).toBe(22);
    expect(TSOTCHKE_USER_REPOS.length + TSOTCHKE_ORG_REPOS.length).toBe(TSOTCHKE_REPO_COUNT);
    expect(
      Array.from({ length: TSOTCHKE_REPO_COUNT }, (_, i) => getTsotchkeRepoByIndex(i).slug),
    ).toEqual([...EXPECTED_USER_REPOS, ...EXPECTED_ORG_REPOS]);
  });

  test('classical contrast remains operational without inflating the external ledger', () => {
    expect(TSOTCHKE_INTERNAL_CONTROLS).toHaveLength(1);
    expect(TSOTCHKE_INTERNAL_CONTROLS[0]).toMatchObject({
      id: 'classical-contrast',
      cosmogonicLeaf: 'sim/classical-contrast.ts',
      operational: true,
    });
    expect([...TSOTCHKE_USER_REPOS, ...TSOTCHKE_ORG_REPOS]).not.toContain(
      TSOTCHKE_INTERNAL_CONTROLS[0].id,
    );
    expect(getTsotchkeRepo(TSOTCHKE_INTERNAL_CONTROLS[0].id as TsotchkeRepoSlug)).toBeUndefined();
  });

  test('the reviewed semantic brain-channel mapping and channel counts are exact', () => {
    const actual = Array.from({ length: TSOTCHKE_REPO_COUNT }, (_, index) => {
      const repo = getTsotchkeRepoByIndex(index);
      return [repo.slug, repo.brainChannel] as const;
    });
    expect(actual).toEqual([...EXPECTED_BRAIN_CHANNELS]);

    const counts: Record<TsotchkeBrainChannel, number> & { excluded: number } = {
      resource: 0,
      threat: 0,
      exploration: 0,
      social: 0,
      excluded: 0,
    };
    for (const [, channel] of actual) {
      if (channel === null) counts.excluded++;
      else counts[channel]++;
    }
    expect(counts).toEqual({ resource: 5, threat: 4, exploration: 5, social: 3, excluded: 5 });
    expect(TSOTCHKE_BRAIN_CHANNELS).toEqual(['resource', 'threat', 'exploration', 'social']);
    expect(TSOTCHKE_BRAIN_CHANNELS.map(tsotchkeBrainChannelIndex)).toEqual([0, 1, 2, 3]);
    for (const [slug, channel] of EXPECTED_BRAIN_CHANNELS) {
      expect(tsotchkeBrainChannelFor(slug)).toBe(channel);
    }
  });

  test('every wired row is mapped while fenced and metadata rows remain unmapped', () => {
    for (let index = 0; index < TSOTCHKE_REPO_COUNT; index++) {
      const repo = getTsotchkeRepoByIndex(index);
      if (repo.wiring > 0) expect(repo.brainChannel).not.toBeNull();
      if (repo.depth === 'fenced' || repo.depth === 'meta') {
        expect(repo.brainChannel).toBeNull();
      }
    }
  });

  test('all legacy registry helpers weight hue by wiring so fences and metadata are inert', () => {
    for (let i = 0; i < TSOTCHKE_REPO_COUNT; i++) {
      const e0 = getTsotchkeRepoByIndex(i);
      const e1 = getTsotchkeRepoByIndex(i + 7);
      const e2 = getTsotchkeRepoByIndex(i + 14);
      const vector = substrateVectorForArchon(i);
      const expectedVector = [
        e0.wiring,
        e1.wiring * e1.hue,
        e2.wiring * e2.hue,
        e0.wiring * e0.hue,
        e1.wiring,
      ];
      for (let k = 0; k < expectedVector.length; k++) {
        expect(vector[k]).toBeCloseTo(expectedVector[k]!, 6);
      }

      const f1 = getTsotchkeRepoByIndex(i + 3);
      const f2 = getTsotchkeRepoByIndex(i + 9);
      const seed = 0x51a7;
      const expected =
        ((e0.wiring * 1000 + f1.wiring * f1.hue * 100 + f2.wiring) ^ seed) % 0xffffff;
      expect(biologicProgramFingerprint(i, seed)).toBe(expected);
    }
    expect(getTsotchkeRepo('.github')?.hue).toBe(0);
  });

  test('all four deliberately excluded repos are fenced with zero wiring', () => {
    expect(getTsotchkeRepo('gpt2-basic')?.wiring).toBe(0);
    expect(getTsotchkeRepo('llm-arbitrator')?.wiring).toBe(0);
    expect(getTsotchkeRepo('SolanaQuantumFlux')?.wiring).toBe(0);
    expect(getTsotchkeRepo('OBLITERATUS')?.wiring).toBe(0);
    expect(FENCED_REPO_SLUGS).toEqual([
      'gpt2-basic',
      'llm-arbitrator',
      'SolanaQuantumFlux',
      'OBLITERATUS',
    ]);
  });

  test('OBLITERATUS records its AGPL and non-LLM boundary with no runtime leaf', () => {
    const obliteratus = getTsotchkeRepo('OBLITERATUS')!;
    expect(obliteratus.origin).toBe('org');
    expect(obliteratus.substrate).toBe('fenced-refusal-toolkit');
    expect(obliteratus.depth).toBe('fenced');
    expect(obliteratus.integrationMode).toBe('fenced');
    expect(obliteratus.cosmogonicLeaf).toBe('');
    expect(obliteratus.sourceBoundary).toContain('AGPL-3.0');
    expect(obliteratus.sourceBoundary).toContain('non-LLM');
  });

  test('consciousness substrates are wired', () => {
    expect(getTsotchkeRepo('eshkol')!.wiring).toBeGreaterThan(0.8);
    expect(getTsotchkeRepo('moonlab')!.cosmogonicLeaf).toContain('moonlab-tensor');
    expect(getTsotchkeRepo('quantum-quake')!.cosmogonicLeaf).toContain('qge');
    expect(getTsotchkeRepo('logo-lab')!.cosmogonicLeaf).toBe('sim/logo-turtle.ts');
  });

  test('quantum_rng is truthfully ledgered as a deterministic facade/adaptation', () => {
    const qrng = getTsotchkeRepo('quantum_rng')!;
    expect(qrng.integrationMode).toBe('deterministic-facade');
    expect(qrng.sourceBoundary).toContain('state-vector adaptation');
    expect(qrng.sourceBoundary).toContain('not a direct port');
    expect(qrng.sourceBoundary).toContain('hardware entropy');
  });

  test('wiring coverage is between 0 and 1', () => {
    const c = tsotchkeWiringCoverage();
    expect(c).toBeGreaterThan(0.55);
    expect(c).toBeLessThanOrEqual(1);
  });

  test('depth tally and non-meta integration fraction are exact and de-inflated', () => {
    const counts: Record<DepthKind, number> = {
      deep: 0,
      wired: 0,
      harvest: 0,
      fenced: 0,
      meta: 0,
    };
    for (const slug of [...TSOTCHKE_USER_REPOS, ...TSOTCHKE_ORG_REPOS]) {
      counts[getTsotchkeRepo(slug)!.depth] += 1;
    }
    expect(counts).toEqual({ deep: 8, wired: 7, harvest: 2, fenced: 4, meta: 1 });
    expect(wiredSimRepoCount()).toBe(17);
    expect(tsotchkeWiredSubstrateFraction()).toBe(17 / 21);
    expect(getTsotchkeRepo('.github')!.wiring).toBe(0);
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

  test('every external entry declares an integration mode and source boundary', () => {
    const valid = new Set<TsotchkeIntegrationMode>([
      'direct-port',
      'deterministic-facade',
      'harvest',
      'fenced',
      'meta',
    ]);
    for (const slug of [...TSOTCHKE_USER_REPOS, ...TSOTCHKE_ORG_REPOS]) {
      const entry = getTsotchkeRepo(slug)!;
      expect(valid.has(entry.integrationMode)).toBe(true);
      expect(entry.sourceBoundary.trim().length).toBeGreaterThan(0);
      if (entry.depth === 'fenced' || entry.depth === 'meta') {
        expect(entry.integrationMode).toBe(entry.depth);
        expect(entry.wiring).toBe(0);
      }
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
      'classical_rng',
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

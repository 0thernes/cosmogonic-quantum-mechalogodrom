import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import {
  GENOME_LEN,
  TRAIT_GENES,
  BRAIN_GENES,
  BRAIN_IN,
  BRAIN_HIDDEN,
  BRAIN_OUT,
  randomGenome,
  crossover,
  mutate,
  breed,
  decodeTraits,
  brainWeightsView,
  brainOf,
  geneDistance,
  recombine,
} from '../src/sim/genome';

describe('genome layout', () => {
  test('length is trait region + brain region', () => {
    expect(TRAIT_GENES).toBe(10);
    expect(BRAIN_GENES).toBe(BRAIN_HIDDEN * (BRAIN_IN + 1) + BRAIN_OUT * (BRAIN_HIDDEN + 1));
    expect(GENOME_LEN).toBe(TRAIT_GENES + BRAIN_GENES);
  });
});

describe('randomGenome', () => {
  test('is deterministic for the same seed', () => {
    expect(Array.from(randomGenome(mulberry32(5)))).toEqual(
      Array.from(randomGenome(mulberry32(5))),
    );
  });
  test('trait region in [0,1], brain region in [-1,1]', () => {
    const g = randomGenome(mulberry32(123));
    expect(g.length).toBe(GENOME_LEN);
    for (let i = 0; i < TRAIT_GENES; i++) {
      expect(g[i]).toBeGreaterThanOrEqual(0);
      expect(g[i]).toBeLessThanOrEqual(1);
    }
    for (let i = TRAIT_GENES; i < GENOME_LEN; i++) {
      expect(g[i]).toBeGreaterThanOrEqual(-1);
      expect(g[i]).toBeLessThanOrEqual(1);
    }
  });
});

describe('crossover', () => {
  test('every child gene comes from one of the parents; length preserved; deterministic', () => {
    const a = randomGenome(mulberry32(1));
    const b = randomGenome(mulberry32(2));
    const c1 = crossover(a, b, mulberry32(9));
    const c2 = crossover(a, b, mulberry32(9));
    expect(c1.length).toBe(GENOME_LEN);
    expect(Array.from(c1)).toEqual(Array.from(c2));
    for (let i = 0; i < GENOME_LEN; i++) expect(c1[i] === a[i] || c1[i] === b[i]).toBe(true);
  });
  test('does not mutate the parents', () => {
    const a = randomGenome(mulberry32(1));
    const b = randomGenome(mulberry32(2));
    const aSnap = Array.from(a);
    const bSnap = Array.from(b);
    crossover(a, b, mulberry32(3));
    expect(Array.from(a)).toEqual(aSnap);
    expect(Array.from(b)).toEqual(bSnap);
  });
});

describe('mutate', () => {
  test('rate 0 leaves the genome untouched', () => {
    const g = randomGenome(mulberry32(7));
    const snap = Array.from(g);
    mutate(g, mulberry32(7), 0);
    expect(Array.from(g)).toEqual(snap);
  });
  test('is deterministic for the same seed', () => {
    const g1 = randomGenome(mulberry32(7));
    const g2 = randomGenome(mulberry32(7));
    mutate(g1, mulberry32(11), 0.5, 0.3);
    mutate(g2, mulberry32(11), 0.5, 0.3);
    expect(Array.from(g1)).toEqual(Array.from(g2));
  });
  test('keeps traits in [0,1] and brain in [-1,1] even under huge mutation', () => {
    const g = randomGenome(mulberry32(2));
    mutate(g, mulberry32(99), 1, 5); // every gene, big kicks → must clamp
    for (let i = 0; i < TRAIT_GENES; i++) {
      expect(g[i]).toBeGreaterThanOrEqual(0);
      expect(g[i]).toBeLessThanOrEqual(1);
    }
    for (let i = TRAIT_GENES; i < GENOME_LEN; i++) {
      expect(g[i]).toBeGreaterThanOrEqual(-1);
      expect(g[i]).toBeLessThanOrEqual(1);
    }
  });
});

describe('breed + decodeTraits', () => {
  test('breed is deterministic', () => {
    const a = randomGenome(mulberry32(1));
    const b = randomGenome(mulberry32(2));
    const c1 = breed(a, b, mulberry32(4));
    const c2 = breed(a, b, mulberry32(4));
    expect(Array.from(c1)).toEqual(Array.from(c2));
  });
  test('decoded traits land in their declared ranges', () => {
    for (let seed = 0; seed < 50; seed++) {
      const tr = decodeTraits(randomGenome(mulberry32(seed + 1)));
      expect(tr.speed).toBeGreaterThanOrEqual(0.4);
      expect(tr.speed).toBeLessThanOrEqual(1.6);
      expect(tr.lifespan).toBeGreaterThanOrEqual(300);
      expect(tr.lifespan).toBeLessThanOrEqual(1500);
      expect(tr.sentience).toBeGreaterThanOrEqual(0);
      expect(tr.sentience).toBeLessThanOrEqual(4);
      expect(Number.isInteger(tr.sentience)).toBe(true);
      expect(tr.hue).toBeGreaterThanOrEqual(0);
      expect(tr.hue).toBeLessThan(1);
    }
  });
});

describe('brain views', () => {
  test('brainWeightsView shares the genome buffer (no copy)', () => {
    const g = randomGenome(mulberry32(8));
    const view = brainWeightsView(g);
    expect(view.length).toBe(BRAIN_GENES);
    view[0] = 0.4242;
    expect(g[TRAIT_GENES]).toBeCloseTo(0.4242, 6); // mutating the view mutates the genome
  });
  test('brainOf builds a forward-capable MLP on the shared weights', () => {
    const g = randomGenome(mulberry32(8));
    const net = brainOf(g);
    expect(net.nIn).toBe(BRAIN_IN);
    expect(net.nHidden).toBe(BRAIN_HIDDEN);
    expect(net.nOut).toBe(BRAIN_OUT);
    const h = new Float32Array(BRAIN_HIDDEN);
    const out = new Float32Array(BRAIN_OUT);
    net.forward(new Float32Array(BRAIN_IN).fill(0.5), h, out);
    for (let i = 0; i < BRAIN_OUT; i++) {
      expect(out[i]).toBeGreaterThanOrEqual(-1); // tanh range
      expect(out[i]).toBeLessThanOrEqual(1);
    }
  });
});

describe('geneDistance', () => {
  test('identical genomes have distance 0; different > 0; symmetric', () => {
    const a = randomGenome(mulberry32(1));
    const b = randomGenome(mulberry32(2));
    expect(geneDistance(a, a)).toBe(0);
    expect(geneDistance(a, b)).toBeGreaterThan(0);
    expect(geneDistance(a, b)).toBeCloseTo(geneDistance(b, a), 9);
  });
});

describe('recombine (generic arbitrary-length heredity)', () => {
  test('child is deterministic from seed and inherits parental genes', () => {
    const a = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);
    const b = new Float32Array([0.6, 0.7, 0.8, 0.9, 1.0]);
    const c1 = recombine(a, b, mulberry32(7), 0, 0); // rate 0 ⇒ pure crossover, no mutation
    const c2 = recombine(a, b, mulberry32(7), 0, 0);
    expect(Array.from(c1)).toEqual(Array.from(c2)); // deterministic
    // With no mutation, every gene must come from one of the two parents.
    for (let i = 0; i < c1.length; i++) {
      expect(c1[i] === a[i] || c1[i] === b[i]).toBe(true);
    }
  });

  test('a child of two parents is closer to them than a random stranger (heredity signal)', () => {
    const a = new Float32Array([0.05, 0.05, 0.05, 0.05, 0.05, 0.05]);
    const b = new Float32Array([0.1, 0.1, 0.1, 0.1, 0.1, 0.1]);
    const stranger = new Float32Array([0.95, 0.9, 0.92, 0.88, 0.9, 0.91]);
    const child = recombine(a, b, mulberry32(42), 0.1, 0.05);
    const dParents = (geneDistance(child, a) + geneDistance(child, b)) / 2;
    const dStranger = geneDistance(child, stranger);
    expect(dParents).toBeLessThan(dStranger); // offspring resembles its lineage
  });

  test('genes stay clamped to [0,1] even under mutation', () => {
    const a = new Float32Array([0.99, 0.0, 0.5]);
    const b = new Float32Array([1.0, 0.01, 0.5]);
    const child = recombine(a, b, mulberry32(99), 1.0, 2.0); // force heavy mutation
    for (const g of child) {
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThanOrEqual(1);
    }
  });
});

import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { XylosMind, type XylosPercept } from '../src/sim/xylos-mind';

const quiet: XylosPercept = { nutrient: 0, hazard: 0, signal: 0, gradientX: 0, gradientZ: 0 };
const field: XylosPercept = {
  nutrient: 0.65,
  hazard: 0.15,
  signal: 0.35,
  gradientX: 0.2,
  gradientZ: -0.1,
};

describe('Xylos bounded autonomous manifold', () => {
  test('fixed sparse topology has distinct incoming edges and a genuine disk embedding', () => {
    const { view } = new XylosMind(71);
    expect(view.activity.length).toBe(48);
    expect(view.coordinates.length).toBe(96);
    expect(view.sources.length).toBe(192);
    expect(view.weights.length).toBe(192);
    for (let target = 0; target < 48; target++) {
      const incoming = Array.from(view.sources.slice(target * 4, target * 4 + 4));
      expect(new Set(incoming).size).toBe(4);
      expect(incoming).not.toContain(target);
      expect(
        Math.hypot(view.coordinates[2 * target]!, view.coordinates[2 * target + 1]!),
      ).toBeLessThan(0.8);
    }
  });

  test('runs without prompts or sensory stimulation and reuses all borrowed storage', () => {
    const mind = new XylosMind(9);
    const view = mind.view;
    const activity = view.activity,
      workspace = view.workspace,
      sources = view.sources;
    for (let i = 0; i < 200; i++) expect(mind.tick(quiet)).toBe(view);
    expect(view.activity).toBe(activity);
    expect(view.workspace).toBe(workspace);
    expect(view.sources).toBe(sources);
    expect(view.activity.some((n) => Math.abs(n) > 0.02)).toBe(true);
    expect(Math.hypot(view.x - 0.18, view.z - 0.12)).toBeGreaterThan(0.03);
    expect(view.phase).toBeGreaterThan(0);
  });

  test('identical seed and input tape replay exactly; changed injected noise changes the brain', () => {
    const a = new XylosMind(110),
      b = new XylosMind(110),
      c = new XylosMind(110);
    for (let tick = 0; tick < 300; tick++) {
      const noise = Math.sin(tick * 1.2);
      a.tick(field, noise);
      b.tick(field, noise);
      c.tick(field, -noise);
    }
    expect(a.view).toEqual(b.view);
    expect(Array.from(a.view.activity)).not.toEqual(Array.from(c.view.activity));
  });

  test('all input errors are rejected before state changes or random draws', () => {
    const mind = new XylosMind(17),
      control = new XylosMind(17);
    for (let i = 0; i < 39; i++) {
      mind.tick(field);
      control.tick(field);
    }
    for (const key of Object.keys(field) as (keyof XylosPercept)[]) {
      for (const value of [NaN, Infinity, -Infinity, 1.01, -1.01])
        expect(() => mind.tick({ ...field, [key]: value })).toThrow(RangeError);
    }
    expect(() => mind.tick({ ...field, nutrient: -0.01 })).toThrow(RangeError);
    expect(() => mind.tick({ ...field, hazard: -0.01 })).toThrow(RangeError);
    expect(() => mind.tick({ ...field, signal: -0.01 })).toThrow(RangeError);
    for (const noise of [NaN, Infinity, -Infinity, -1.01, 1.01])
      expect(() => mind.tick(field, noise)).toThrow(RangeError);
    mind.tick(field);
    control.tick(field);
    expect(mind.view).toEqual(control.view);
    expect(() => new XylosMind(NaN)).toThrow(RangeError);
    expect(() => new XylosMind(-1)).toThrow(RangeError);
    expect(() => new XylosMind(1, { learningRate: NaN })).toThrow(RangeError);
  });

  test('two-slot admission is a real content bottleneck and broadcast affects every group', () => {
    const full = new XylosMind(123),
      cut = new XylosMind(123, { broadcast: false });
    full.tick(field);
    cut.tick(field);
    expect(full.view).toEqual(cut.view); // no prior broadcast at boot
    expect(new Set(full.view.admitted).size).toBe(2);
    for (let g = 0; g < 6; g++)
      if (!full.view.admitted.includes(g)) expect(full.view.workspace[g]).toBe(0);
    full.tick(field);
    cut.tick(field);
    for (let g = 0; g < 6; g++) {
      let difference = 0;
      for (let i = g * 8; i < (g + 1) * 8; i++)
        difference += Math.abs(full.view.activity[i]! - cut.view.activity[i]!);
      expect(difference).toBeGreaterThan(1e-5);
    }
  });

  test('recurrent history and plasticity are causal interventions, not telemetry-only values', () => {
    const full = new XylosMind(51),
      cut = new XylosMind(51, { recurrence: false });
    const fixed = new XylosMind(51, { plasticity: false });
    const originalWeights = Array.from(fixed.view.weights);
    for (let i = 0; i < 600; i++) {
      full.tick(field);
      cut.tick(field);
      fixed.tick(field);
    }
    expect(Array.from(full.view.activity)).not.toEqual(Array.from(cut.view.activity));
    expect(Array.from(full.view.weights)).not.toEqual(originalWeights);
    expect(Array.from(fixed.view.weights)).toEqual(originalWeights);
    expect(fixed.view.rewires).toBe(0);
    expect(full.view.rewires).toBeGreaterThan(0);
  });

  test('online forecasts outperform frozen learning on a stationary sensory source', () => {
    const trained = new XylosMind(81),
      frozen = new XylosMind(81, { learningRate: 0 });
    for (let i = 0; i < 300; i++) {
      trained.tick(field);
      frozen.tick(field);
    }
    expect(trained.view.predictionError).toBeLessThan(frozen.view.predictionError * 0.1);
    expect(trained.view.prediction[0]).toBeCloseTo(field.nutrient, 4);
    expect(trained.view.confidence).toBeGreaterThan(0.95);
  });

  test('learned reliability discriminates unpredictable observations and governs perceptual updates', () => {
    const clean = new XylosMind(211),
      noisy = new XylosMind(211);
    const cut = new XylosMind(211, { metacognition: false });
    const rng = mulberry32(117);
    for (let i = 0; i < 400; i++) {
      const corrupted = { ...field, signal: rng() };
      clean.tick(field);
      noisy.tick(corrupted);
      cut.tick(corrupted);
    }
    expect(clean.view.reliability[2]!).toBeGreaterThan(noisy.view.reliability[2]! + 0.2);
    expect(Array.from(noisy.view.activity)).not.toEqual(Array.from(cut.view.activity));
  });

  test('a learned attention transition forecast influences future admission', () => {
    const full = new XylosMind(109),
      cut = new XylosMind(109, { attentionModel: false });
    let different = 0;
    for (let tick = 0; tick < 400; tick++) {
      const stimulus = { ...field, hazard: 0.5 + 0.45 * Math.sin(tick * 0.08) };
      full.tick(stimulus);
      cut.tick(stimulus);
      if (full.view.attention !== cut.view.attention) different++;
    }
    expect(different).toBeGreaterThan(10);
    expect(full.view.attentionError).toBeGreaterThanOrEqual(0);
    expect(full.view.attentionError).toBeLessThanOrEqual(1);
  });

  test('learned action consequences influence choices on an identical numeric outcome tape', () => {
    const full = new XylosMind(73),
      cut = new XylosMind(73, { actionModel: false });
    let changedActions = 0;
    for (let tick = 0; tick < 500; tick++) {
      const stimulus = {
        ...field,
        nutrient: 0.5 + 0.4 * Math.sin(tick * 0.2),
        gradientX: 0,
        gradientZ: 0,
      };
      full.tick(stimulus);
      cut.tick(stimulus);
      if (full.view.action !== cut.view.action) changedActions++;
    }
    expect(changedActions).toBeGreaterThan(20);
    expect(full.view.modelError).toBeGreaterThan(0);
    expect(full.view.modelError).toBeLessThan(0.2);
  });

  test('action-conditioned prediction improves in an actual output-input feedback environment', () => {
    const trained = new XylosMind(71);
    const frozen = new XylosMind(71, { learningRate: 0 });
    let trainedError = 0;
    let frozenError = 0;
    for (let tick = 0; tick < 1000; tick++) {
      for (const mind of [trained, frozen]) {
        // The simulator responds to each creature's previous selected action; this is not
        // a prerecorded reward trace. External variation prevents a trivial constant fit.
        const angle = (mind.view.action * Math.PI) / 4;
        mind.tick({
          nutrient: 0.5 + 0.15 * Math.sin(tick * 0.04) + 0.15 * Math.cos(angle),
          hazard: 0.35 + 0.15 * Math.sin(angle),
          signal: 0.5,
          gradientX: 0,
          gradientZ: 0,
        });
      }
      if (tick > 500) {
        trainedError += trained.view.modelError;
        frozenError += frozen.view.modelError;
      }
    }
    // A system-level learning comparison on different live trajectories, alongside the
    // identical-tape action-model ablation above; neither is a full AE-2 certification.
    expect(trainedError).toBeLessThan(frozenError * 0.95);
  });

  test('soft quality coding responds continuously to small input changes', () => {
    const a = new XylosMind(57),
      b = new XylosMind(57);
    for (let i = 0; i < 10; i++) {
      a.tick(field);
      b.tick(field);
    }
    a.tick(field);
    b.tick({ ...field, nutrient: field.nutrient + 1e-5 });
    for (let g = 0; g < 6; g++)
      expect(Math.abs(a.view.quality[g]! - b.view.quality[g]!)).toBeLessThan(1e-4);
    expect(a.view.quality.some((x) => x === 0)).toBe(true);
  });

  test('long noisy soak retains finite bounded state, topology caps and position limits', () => {
    const mind = new XylosMind(0xffffffff),
      rng = mulberry32(980);
    const input = { ...field };
    let pulseReached = false;
    for (let i = 0; i < 12000; i++) {
      input.nutrient = rng();
      input.hazard = rng();
      input.signal = rng();
      input.gradientX = rng() * 2 - 1;
      input.gradientZ = rng() * 2 - 1;
      const view = mind.tick(input, rng() * 2 - 1);
      if (view.pulse > 0.25) pulseReached = true;
      if (i % 100 === 0) {
        for (const value of [
          view.energy,
          view.confidence,
          view.coherence,
          view.pulse,
          view.predictionError,
        ]) {
          expect(Number.isFinite(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        }
        expect(Math.abs(view.x)).toBeLessThanOrEqual(0.85);
        expect(Math.abs(view.z)).toBeLessThanOrEqual(0.85);
        expect(view.activity.every((x) => Number.isFinite(x) && Math.abs(x) <= 1)).toBe(true);
        expect(view.weights.every((x) => Number.isFinite(x) && Math.abs(x) <= 0.900001)).toBe(true);
        expect(view.workspace.filter((x) => x !== 0).length).toBeLessThanOrEqual(2);
      }
    }
    expect(pulseReached).toBe(true);
    expect(mind.view.sources.length).toBe(192);
    for (let target = 0; target < 48; target++) {
      const incoming = Array.from(mind.view.sources.slice(target * 4, target * 4 + 4));
      expect(new Set(incoming).size).toBe(4);
      expect(incoming).not.toContain(target);
    }
  });
});

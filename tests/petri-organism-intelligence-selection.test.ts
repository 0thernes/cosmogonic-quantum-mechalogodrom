/**
 * GATE-PETRI-CORPUS-SELECTION — the live shared organism field must alter full digital-biologic
 * fitness through strain-specific ecology affinity. This is deterministic proxy/control behavior,
 * not evidence of consciousness, sentience, or numeric score uplift.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import type { OrganismIntelligenceSignal } from '../src/types';
import type { Biologic, BiologicFormKind } from '../src/sim/digital-biologics';
import {
  biologicSemanticAffinity,
  createPetriDish,
  petriBiologicSelectionFlux,
  petriDishBeat,
  petriDishView,
} from '../src/sim/petri-dish';

function signal(
  lanes: Partial<
    Pick<
      OrganismIntelligenceSignal,
      'resourcePressure' | 'threatResponse' | 'exploration' | 'socialDrive'
    >
  > = {},
  enabled = true,
): OrganismIntelligenceSignal {
  return {
    enabled,
    indicatorOnly: true,
    revision: 42,
    resourcePressure: lanes.resourcePressure ?? 0,
    threatResponse: lanes.threatResponse ?? 0,
    exploration: lanes.exploration ?? 0,
    socialDrive: lanes.socialDrive ?? 0,
    plasticity: 0.5,
    forecast: 0.5,
    confidence: 0.8,
    corpusDrive: 0.5,
    ecologyRisk: 0.5,
    ecologySurprise: 0,
    channels: new Float32Array(4),
    integratedRepoCount: 17,
    diagnosticAlert: false,
  };
}

function biologic(id: number, form: BiologicFormKind): Biologic {
  return {
    id,
    form,
    program: id,
    adFitness: 0.4,
    gwtIgnition: 0.1,
    spinOrder: 0.1,
    qgtCurvature: 0.1,
    irrepSymmetry: 0.1,
    quakeAliveness: 0.1,
    ulgLawfulness: 0.1,
    logoMorph: 0.1,
    metalCompute: 0.1,
    qrngEntropy: 0.1,
    pinnResidual: 0.1,
    pimcPath: 0.1,
    asteroidDynamics: 0.1,
    consciousness: 0.4,
    alive: true,
    generation: 0,
    speciation: 0,
    fitnessWeights: [0.4, 0.4, 0.4],
  };
}

function specialists(): [Biologic, Biologic] {
  const resource = biologic(0xf001, 'PINN_PHYSICS');
  resource.adFitness = 1.8;
  resource.pinnResidual = 1;
  resource.metalCompute = 1;

  const explorer = biologic(0xf002, 'QRNG_ENTROPY');
  explorer.adFitness = 0.1;
  explorer.qrngEntropy = 1;
  explorer.pimcPath = 1;
  explorer.logoMorph = 1;
  explorer.asteroidDynamics = 1;
  return [resource, explorer];
}

describe('Petri digital biologics consume the shared ecology field in differential selection', () => {
  test('the four named lanes favor different existing strain traits', () => {
    const [resource, explorer] = specialists();
    const scarce = signal({ resourcePressure: 1 });
    const frontier = signal({ exploration: 1 });

    expect(biologicSemanticAffinity(resource, scarce)).toBeGreaterThan(
      biologicSemanticAffinity(explorer, scarce) + 0.7,
    );
    expect(biologicSemanticAffinity(explorer, frontier)).toBeGreaterThan(
      biologicSemanticAffinity(resource, frontier) + 0.7,
    );
    expect(petriBiologicSelectionFlux(0.5, resource, scarce)).toBeGreaterThan(
      petriBiologicSelectionFlux(0.5, explorer, scarce),
    );
  });

  test('an enabled field with zero semantic evidence is exactly neutral to strain fitness', () => {
    const [resource] = specialists();
    const zero = signal({}, true);
    expect(biologicSemanticAffinity(resource, zero)).toBe(0.5);
    expect(petriBiologicSelectionFlux(1, resource, zero)).toBe(1);
    expect(petriBiologicSelectionFlux(1.5, resource, zero)).toBe(1.5);

    const enabled = createPetriDish(0x0e10);
    const disabled = createPetriDish(0x0e10);
    enabled.biologics = specialists();
    disabled.biologics = specialists();
    const a = mulberry32(0x0e10);
    const b = mulberry32(0x0e10);
    for (let beat = 0; beat < 30; beat++) {
      petriDishBeat(enabled, 0, beat, a, zero);
      petriDishBeat(disabled, 0, beat, b, signal({}, false));
    }
    expect(enabled.biologics).toEqual(disabled.biologics);
    expect(enabled.organismSelectionPressure).toBe(0);
  });

  test('matched signal/ablation changes adFitness and speciation in the favored strain', () => {
    const operational = createPetriDish(0x51ec7);
    const ablated = createPetriDish(0x51ec7);
    operational.biologics = specialists();
    ablated.biologics = specialists();
    const operationalRng = mulberry32(0xa11f1e);
    const ablatedRng = mulberry32(0xa11f1e);
    const scarce = signal({ resourcePressure: 1 });
    const off = signal({ resourcePressure: 1 }, false);

    for (let beat = 0; beat < 80; beat++) {
      petriDishBeat(operational, 0, beat, operationalRng, scarce);
      petriDishBeat(ablated, 0, beat, ablatedRng, off);
    }

    const operationalResource = operational.biologics.find((entry) => entry.id === 0xf001)!;
    const ablatedResource = ablated.biologics.find((entry) => entry.id === 0xf001)!;
    const operationalExplorer = operational.biologics.find((entry) => entry.id === 0xf002)!;
    const ablatedExplorer = ablated.biologics.find((entry) => entry.id === 0xf002)!;

    expect(operationalResource.adFitness).toBeGreaterThan(ablatedResource.adFitness!);
    expect(operationalResource.speciation).toBeGreaterThan(ablatedResource.speciation!);
    expect(operationalExplorer.adFitness).toBeLessThan(ablatedExplorer.adFitness!);
    expect(petriDishView(operational).organismIntelligenceRevision).toBe(42);
    expect(petriDishView(operational).organismSelectionPressure).toBeGreaterThan(0);
    expect(petriDishView(ablated).organismSelectionPressure).toBe(0);
  });

  test('omitted and explicitly disabled signals preserve the exact legacy trajectory', () => {
    const omitted = createPetriDish(91);
    const disabled = createPetriDish(91);
    omitted.biologics = specialists();
    disabled.biologics = specialists();
    const a = mulberry32(0xbeef);
    const b = mulberry32(0xbeef);
    const off = signal({ resourcePressure: 1, exploration: 1 }, false);

    for (let beat = 0; beat < 30; beat++) {
      petriDishBeat(omitted, 2, beat, a);
      petriDishBeat(disabled, 2, beat, b, off);
    }
    expect(disabled).toEqual(omitted);
  });
});

/**
 * GATE-VQE-RESOLVE — proves the variational-quantum drive resolver (`sim/vqe-drive-resolver.ts`) is a
 * REAL, operational cognitive faculty, not decoration:
 *
 *   1. CONVERGES: a real VQE (exact parameter-shift gradient through the Eshkol AD tape) reaches the
 *      EXACT diagonal ground energy of the drive Hamiltonian — the whole quantum-classical path works.
 *   2. RESOLVES CONFLICT: under two antagonistic drives it DROPS the weaker one instead of the greedy
 *      "commit both" baseline, and reports a positive decisionCoherence for the energy it actually saved.
 *   3. IS CAUSAL: the resolved commitment changes a real organism's trajectory through the production
 *      `EntityManager.update` loop — the adaptive arm seeks differently from the frozen (ablation) arm.
 *   4. IS HONEST: the ablation arm resolves nothing (coherence 0); a disabled/absent signal is a no-op
 *      (commit factor exactly 1 ⇒ byte-identical to the pre-resolver world); everything is deterministic.
 *
 * Determinism only: no Math.random / Date.now anywhere in the resolver or this gate.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import {
  VqeDriveResolver,
  buildDriveHamiltonian,
  resolverCommitFactor,
  type DriveVector,
} from '../src/sim/vqe-drive-resolver';
import { diagonalGroundEnergy, vqeMinimize, type QuantumCircuit } from '../src/math/quantum-ad';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { getQuantizationConfig } from '../src/math/quantization';
import { EntityManager } from '../src/sim/entities';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import type { AuditTrail } from '../src/logging/audit';
import type { DriveResolutionSignal, Entity, SimContext, SimState } from '../src/types';

const ANSATZ = [
  { kind: 'rot', gate: 'ry', target: 0, param: 0 },
  { kind: 'rot', gate: 'ry', target: 1, param: 1 },
  { kind: 'rot', gate: 'ry', target: 2, param: 2 },
  { kind: 'rot', gate: 'ry', target: 3, param: 3 },
] as const;

function circuitFor(drives: DriveVector): QuantumCircuit {
  return {
    qubits: 4,
    ops: ANSATZ as unknown as QuantumCircuit['ops'],
    hamiltonian: buildDriveHamiltonian(drives),
    paramCount: 4,
  };
}
const warm = (x: number): number => Math.PI * (0.2 + 0.6 * x);

describe('GATE-VQE-RESOLVE: a real VQE resolves competing drives into a coherent commitment', () => {
  test('CONVERGES: VQE reaches the EXACT diagonal ground energy on a cleanly-separated instance', () => {
    // Two strong non-conflicting drives; the two weak ones are firmly DROPPED by their active conflict
    // with the strong pair — a unique, strongly-separated ground state the product ansatz reaches exactly.
    const cases: DriveVector[] = [
      { resource: 0.9, threat: 0.9, exploration: 0.05, social: 0.05 },
      { resource: 0.05, threat: 0.05, exploration: 0.9, social: 0.9 },
    ];
    for (const d of cases) {
      const circuit = circuitFor(d);
      const ground = diagonalGroundEnergy(circuit);
      const theta0 = [warm(d.resource), warm(d.threat), warm(d.exploration), warm(d.social)];
      const result = vqeMinimize(circuit, theta0, 0.5, 48);
      // Exact — the parameter-shift gradient drives the product ansatz onto the ground basis state.
      expect(Math.abs(result.energy - ground)).toBeLessThan(1e-6);
    }
  });

  test('RESOLVES CONFLICT: drops the weaker antagonist the greedy baseline would keep', () => {
    // threat ≫ explore, both above the greedy ½ cutoff → greedy commits BOTH (frustrated). The
    // resolver must keep threat and DROP explore, and claim the energy it saved.
    const drives: DriveVector = { resource: 0.2, threat: 0.95, exploration: 0.7, social: 0.15 };
    const s = new VqeDriveResolver().step(drives, 0, true);
    expect(s.threatCommit).toBeGreaterThan(0.9); // keeps the stronger drive
    expect(s.exploreCommit).toBeLessThan(0.1); // drops the weaker antagonist (greedy would keep it)
    expect(s.decisionCoherence).toBeGreaterThan(0.05); // genuine conflict was resolved
    expect(s.actionBias).toBeLessThan(0.5); // exploit-leaning: it committed to the non-explore drive
  });

  test('ABLATION: the frozen arm resolves nothing and differs from the adaptive arm under conflict', () => {
    const drives: DriveVector = { resource: 0.2, threat: 0.95, exploration: 0.7, social: 0.15 };
    const adaptive = new VqeDriveResolver({ adaptive: true }).step(drives, 0, true);
    const frozen = new VqeDriveResolver({ adaptive: false }).step(drives, 0, true);
    // The greedy baseline keeps BOTH antagonists; adaptive drops explore.
    expect(frozen.exploreCommit).toBe(1);
    expect(adaptive.exploreCommit).toBeLessThan(0.1);
    expect(frozen.decisionCoherence).toBe(0); // nothing resolved beyond greedy
    expect(adaptive.decisionCoherence).toBeGreaterThan(frozen.decisionCoherence);
  });

  test('DETERMINISTIC: identical drives ⇒ byte-identical signal fields', () => {
    const drives: DriveVector = { resource: 0.61, threat: 0.44, exploration: 0.83, social: 0.29 };
    const a = new VqeDriveResolver().step(drives, 0, true);
    const b = new VqeDriveResolver().step(drives, 0, true);
    for (const k of [
      'resourceCommit',
      'threatCommit',
      'exploreCommit',
      'socialCommit',
      'actionBias',
      'decisionCoherence',
    ] as const) {
      expect(a[k]).toBe(b[k]);
    }
  });

  test('BOUNDED + HONEST NO-OP: all outputs in [0,1]; disabled/absent ⇒ commit factor exactly 1', () => {
    const s = new VqeDriveResolver().step(
      { resource: 0.85, threat: 0.85, exploration: 0.85, social: 0.85 },
      0,
      true,
    );
    for (const v of [
      s.resourceCommit,
      s.threatCommit,
      s.exploreCommit,
      s.socialCommit,
      s.actionBias,
      s.decisionCoherence,
    ]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    // The seam is a true no-op until real conflict is resolved.
    expect(resolverCommitFactor(undefined)).toBe(1);
    const disabled = new VqeDriveResolver({ enabled: false });
    expect(resolverCommitFactor(disabled.signal)).toBe(1);
    const zeroCoherence: DriveResolutionSignal = { ...s, decisionCoherence: 0 };
    expect(resolverCommitFactor(zeroCoherence)).toBe(1);
  });

  test('CADENCE: holds the resolved signal between resolves, recomputes on the cadence boundary', () => {
    const r = new VqeDriveResolver({ cadenceFrames: 12 });
    const first = r.step({ resource: 0.9, threat: 0.1, exploration: 0.1, social: 0.1 }, 0);
    const rev0 = first.revision;
    r.step({ resource: 0.1, threat: 0.9, exploration: 0.9, social: 0.1 }, 5); // within cadence → held
    expect(r.signal.revision).toBe(rev0);
    r.step({ resource: 0.1, threat: 0.9, exploration: 0.9, social: 0.1 }, 12); // boundary → recompute
    expect(r.signal.revision).toBe(rev0 + 1);
  });

  // ── Layer 3: the resolved commitment is CAUSAL in the live production entity loop ──────────────
  test('CAUSAL: the resolved commitment changes a real organism trajectory through EntityManager', () => {
    const coherentExploit: DriveResolutionSignal = {
      enabled: true,
      indicatorOnly: true,
      adaptive: true,
      revision: 1,
      resourceCommit: 1,
      threatCommit: 0,
      exploreCommit: 0,
      socialCommit: 0,
      actionBias: 0.1, // strongly exploit-leaning
      decisionCoherence: 0.9, // and confidently resolved ⇒ commit factor > 1
    };
    const neutral: DriveResolutionSignal = {
      ...coherentExploit,
      actionBias: 0.5,
      decisionCoherence: 0,
    };
    // Sanity: the seam actually separates these two before we spend a full entity tick on it.
    expect(resolverCommitFactor(coherentExploit)).toBeGreaterThan(1.05);
    expect(resolverCommitFactor(neutral)).toBe(1);

    const run = (signal: DriveResolutionSignal): { x: number; vx: number } => {
      const ctx = makeCtx(0xc4e607a1, signal);
      const entities = new EntityManager(ctx);
      const organism = entities.spawn(new THREE.Vector3(50, 0, 0), 0);
      if (!organism) throw new Error('resolver fixture failed to spawn its organism');
      organism.userData.energy = 0;
      organism.userData.age = 0;
      organism.userData.life = 1_000_000;
      organism.userData.sT = Number.POSITIVE_INFINITY;
      organism.userData.payoff = 0;
      organism.userData.vel.set(0, 0, 0);
      // A resource goal to the -x side WITHIN the ~92u seek reach (organism at x=50) so the seek force —
      // the exact branch the resolver scales — actually fires. No flora gradient ⇒ chemotaxis stays inert.
      entities.attachFloraComfort(() => ({ x: 10, y: 0, z: 0, strength: 1 }));
      ctx.grid.insert(organism);
      entities.update(1 / 60, 0);
      return { x: organism.position.x, vx: organism.userData.vel.x };
    };

    const committed = run(coherentExploit);
    const baseline = run(neutral);
    // Exploit-leaning + coherent ⇒ a STRONGER pull toward the -x resource goal than the neutral arm.
    expect(committed.vx).toBeLessThan(baseline.vx - 1e-4);
    expect(committed.x).toBeLessThan(baseline.x - 1e-6);
    // Determinism through the production loop.
    expect(run(coherentExploit)).toEqual(committed);
  });
});

function makeState(): SimState {
  return {
    chaos: 0,
    entropy: 0,
    mutations: 0,
    timeScale: 1,
    renderMode: 'solid',
    sim: 1,
    weatherIdx: 0,
    temperature: 20,
    wind: { x: 0, z: 0 },
    viewIdx: 0,
    algoIdx: 0,
    songIdx: 0,
    algoStep: 0,
    algoMode: 'single',
    algoTimer: 0,
    frame: 0,
    elapsed: 0,
  };
}

function makeCtx(seed: number, driveResolution: DriveResolutionSignal): SimContext {
  const rng = mulberry32(seed);
  const geos = createGeometryCache();
  return {
    scene: new THREE.Scene(),
    quality: {
      tier: 'phone',
      isMobile: true,
      instanced: false,
      dprCap: 1.25,
      maxEntities: 1,
      targetEntities: 1,
      quantumCount: 1,
      maxLinks: 1,
      shadows: false,
      starCount: 1,
      quantization: getQuantizationConfig('phone'),
      simRate: 60,
    },
    rng,
    grid: new SpatialHash<Entity>(8),
    morphs: createMorphotypes(rng, geos.length),
    geos,
    state: makeState(),
    driveResolution,
    audit: { record: () => undefined, entries: () => [] } as unknown as AuditTrail,
    sfx: () => undefined,
  };
}

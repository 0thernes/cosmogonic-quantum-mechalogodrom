import { describe, expect, test } from 'bun:test';
import {
  computeRicciScalarField,
  curvatureAwareNaturalGradient2x2,
  curvatureAwareNaturalGradientField,
} from '../src/math/curvature-aware-qng';
import { DeterministicStatevectorRng } from '../src/math/deterministic-statevector-rng';
import { SP80090B_APT_WINDOW_BINARY } from '../src/math/nist-sp800-90b';
import {
  adBackward,
  adConst,
  adDiv,
  adGradient,
  adHvp,
  adPow,
  adTapeNew,
  adVar,
} from '../src/math/eshkol-ad';
import { EshkolQrng } from '../src/math/eshkol-qrng';
import { makeRng } from '../src/math/rng';
import { createDualModeRng, isWildEntropyMode, setWildEntropyMode } from '../src/math/wild-entropy';
import { deriveComputeCadence, RenderGovernor } from '../src/core/frame-governor';
import { GlyphBrainBatch } from '../src/sim/glyph-brain';
import { executeSimulationWorkerKernel } from '../src/workers/simulation-worker';
import { EshkolProgramEvolution, HigherOrderEmergence } from '../src/sim/emergence-angles';
import { EmergentLanguage } from '../src/sim/emergent-language';
import {
  encodeRosetteWireEnvelope,
  evaluateBonsaiFidelity,
  evaluateEshkolCyclotomic8CliffordT,
  evaluateEshkolDbspDeltaStream,
  evaluateEshkolTaylorCalculus,
  evaluateLibirrepBdgSkyrmionMzm,
  evaluateMoonlabIsingAnnealer,
  evaluateMoonlabQwzChernInsulator,
  evaluatePqConsensusRound,
  evaluateQgtlGeometricSuppression,
  evaluateQrngQuantumChaosStream,
  evaluateSbnnMinsrStep,
  refineGeometricSimplex,
  stepOct2026WaveSubstrates,
  TSOTCHKE_FULL_27_REPO_CATALOG,
  TSOTCHKE_OCT2026_ALL_PUBLIC_REPOS,
  TSOTCHKE_OCT2026_ORG_PUBLIC_COUNT,
  TSOTCHKE_OCT2026_ORG_PUBLIC_REPOS,
  TSOTCHKE_OCT2026_PUBLIC_REPO_COUNT,
  TSOTCHKE_OCT2026_USER_PUBLIC_COUNT,
  TSOTCHKE_OCT2026_USER_PUBLIC_REPOS,
  TSOTCHKE_OCT2026_WAVE2_REPOS,
  TSOTCHKE_WEBSITES,
  TSOTCHKE_X_ACCOUNTS,
} from '../src/sim/tsotchke-facade';

describe('Tsotchke October 21, 2026 Full Ecosystem Census & Wave-2 Substrates', () => {
  test('27-public-repository census matches 17 personal + 10 corporate accounts', () => {
    expect(TSOTCHKE_OCT2026_USER_PUBLIC_REPOS.length).toBe(TSOTCHKE_OCT2026_USER_PUBLIC_COUNT);
    expect(TSOTCHKE_OCT2026_ORG_PUBLIC_REPOS.length).toBe(TSOTCHKE_OCT2026_ORG_PUBLIC_COUNT);
    expect(TSOTCHKE_OCT2026_ALL_PUBLIC_REPOS.length).toBe(TSOTCHKE_OCT2026_PUBLIC_REPO_COUNT);
    expect(TSOTCHKE_OCT2026_PUBLIC_REPO_COUNT).toBe(27);

    expect(TSOTCHKE_OCT2026_USER_PUBLIC_REPOS).toContain('rosette-wire');
    expect(TSOTCHKE_OCT2026_USER_PUBLIC_REPOS).toContain('homebrew-moonlab');
    expect(TSOTCHKE_OCT2026_USER_PUBLIC_REPOS).toContain('homebrew-eshkol');
    expect(TSOTCHKE_OCT2026_ORG_PUBLIC_REPOS).toContain('bonsai-fidelity-study');
    expect(TSOTCHKE_OCT2026_ORG_PUBLIC_REPOS).toContain('pq-consensus-bandwidth');
    expect(TSOTCHKE_OCT2026_ORG_PUBLIC_REPOS).toContain('GeoRefine');
    expect(TSOTCHKE_OCT2026_WAVE2_REPOS.length).toBe(4);
  });

  test('4 official websites and 2 official X accounts are cataloged', () => {
    expect(TSOTCHKE_WEBSITES.map((w) => w.url)).toEqual([
      'https://eshkol.ai',
      'https://tsotchke.org',
      'https://tsotchke.net',
      'https://api.tsotchke.net',
    ]);
    expect(TSOTCHKE_X_ACCOUNTS.map((x) => x.url)).toEqual([
      'https://x.com/tsotchke',
      'https://x.com/tsotchkecorp',
    ]);
  });

  test('rosette-wire canonical envelope frames header + Zig FNV-1a 64-bit digest', () => {
    const env = encodeRosetteWireEnvelope(0x1234, 'hello-rosette');
    expect(env.magic).toBe('RSTE');
    expect(env.version).toBe(1);
    expect(env.schemaTag).toBe(0x1234);
    expect(env.payloadByteLength).toBe(13);
    expect(env.framedBytes.byteLength).toBe(24);
    expect(env.fnv1a64Hex).toMatch(/^[0-9a-f]{16}$/);
  });

  test('pq-consensus-bandwidth evaluates ML-DSA-65, Falcon-512, and SLH-DSA-128f rounds', () => {
    const mlDsa = evaluatePqConsensusRound(32, 0, 8);
    const falcon = evaluatePqConsensusRound(32, 1, 8);
    const slhDsa = evaluatePqConsensusRound(32, 2, 8);

    expect(falcon.wireBytes).toBeLessThan(mlDsa.wireBytes);
    expect(mlDsa.wireBytes).toBeLessThan(slhDsa.wireBytes);
    expect(mlDsa.compressionRatio).toBeLessThan(1);
    expect(mlDsa.estimatedRoundMs).toBeGreaterThan(0);
  });

  test('GeoRefine verifies simplex orientation and computes equilateral aspect quality ~ 1', () => {
    const eq = refineGeometricSimplex(0, 0, 1, 0, 0.5, Math.sqrt(3) / 2);
    expect(eq.certified).toBe(true);
    expect(eq.orientation).toBe('ccw');
    expect(eq.aspectQuality).toBeCloseTo(1.0, 6);
  });

  test('bonsai-fidelity-study tracks retained fidelity and active branch survival', () => {
    const shallow = evaluateBonsaiFidelity(10, 4, 32, 1e-3);
    const deep = evaluateBonsaiFidelity(10, 24, 8, 1e-2);
    expect(shallow.retainedFidelity).toBeGreaterThan(deep.retainedFidelity);
    expect(shallow.activeBranchRatio).toBeGreaterThan(deep.activeBranchRatio);
  });

  test('stepOct2026WaveSubstrates produces deterministic telemetry receipt', () => {
    const a = stepOct2026WaveSubstrates(42, 0.82, 0.18, 64);
    const b = stepOct2026WaveSubstrates(42, 0.82, 0.18, 64);
    expect(a).toEqual(b);
    expect(a.zigWasmReady).toBe(true);
    expect(a.publicRepoCount).toBe(27);
    expect(TSOTCHKE_FULL_27_REPO_CATALOG).toHaveLength(27);
  });

  test('Flagship Zig WASM evaluators (Moonlab Ising, QGTL 2D, Eshkol Taylor/Curl, QRNG Chaos) + Dual-Mode & 30-60 FPS Cadence', () => {
    const moonlab = evaluateMoonlabIsingAnnealer(0.85, 0.2, 2);
    expect(moonlab.expectedEnergy).toBeLessThan(0);
    expect(moonlab.groundOverlap).toBeGreaterThan(0.1);

    const qgtl = evaluateQgtlGeometricSuppression(1.1, 0.4, 0.04);
    expect(qgtl.gMuMu).toBeCloseTo(0.25, 6);
    expect(qgtl.oEps2Suppression).toBeLessThan(1.0);

    const eshkol = evaluateEshkolTaylorCalculus(0.5, 0.3, -0.2);
    expect(Number.isFinite(eshkol.d4)).toBe(true);
    expect(Number.isFinite(eshkol.divergence)).toBe(true);
    expect(eshkol.curlMagnitude).toBeGreaterThan(0);

    const dbsp = evaluateEshkolDbspDeltaStream(0.85, 0.25);
    expect(dbsp.exactnessResidual).toBeLessThan(1e-14);
    expect(dbsp.linearTermNorm).toBeGreaterThan(0);

    const cyc = evaluateEshkolCyclotomic8CliffordT([1n, 1n, 0n, 0n], [1n, 0n, 0n, 0n]);
    expect(cyc.exactFieldNorm).toBe(2n);

    const qwz = evaluateMoonlabQwzChernInsulator(-1.0, 10);
    expect(qwz.quantizedChern).toBe(-1);

    const bdg = evaluateLibirrepBdgSkyrmionMzm(12, 2, -3.0, 4.0, 1.0);
    expect(bdg.mzmCount).toBe(4);
    expect(bdg.topologicalProtected).toBe(true);

    const minsr = evaluateSbnnMinsrStep(0.85, 0.2, 1e-2, 0.05);
    expect(minsr.updateNorm).toBeGreaterThan(0);
    expect(minsr.traceT).toBeGreaterThan(0);

    const qrngSeeded = evaluateQrngQuantumChaosStream(77, false);
    expect(qrngSeeded.wildMode).toBe(false);
    expect(qrngSeeded.wordHex).toMatch(/^[0-9a-f]{16}$/);

    // Dual-Mode RNG + EshkolQrng.nextZigBatch
    expect(isWildEntropyMode()).toBe(false);
    setWildEntropyMode(true);
    expect(isWildEntropyMode()).toBe(true);
    const wildRng = createDualModeRng(12345, true);
    const wSample = wildRng();
    expect(wSample).toBeGreaterThanOrEqual(0);
    expect(wSample).toBeLessThan(1);
    setWildEntropyMode(false);
    expect(isWildEntropyMode()).toBe(false);

    const qrng = new EshkolQrng(makeRng(99));
    const batch = new Float64Array(8);
    const word = qrng.nextZigBatch(batch, false);
    expect(word).not.toBe(0n);

    // 30-60 FPS Adaptive Compute Cadence & GlyphBrainBatch.thinkCohort + Worker Simulation Kernel
    expect(deriveComputeCadence(12).glyphCohortStride).toBe(2);
    expect(deriveComputeCadence(22).glyphCohortStride).toBe(4);
    expect(deriveComputeCadence(22).connectomeRebuildStride).toBe(3);
    expect(deriveComputeCadence(34).glyphCohortStride).toBe(5);
    const gov = new RenderGovernor(true);
    gov.observe(0.025);
    expect(gov.computeCadence().glyphCohortStride).toBeGreaterThanOrEqual(2);

    const glyphBatch = new GlyphBrainBatch(42);
    const percept = new Float32Array(16).fill(0.25);
    const cohortSnaps = glyphBatch.thinkCohort(percept, 4);
    expect(cohortSnaps).toHaveLength(100);

    const workerOut = executeSimulationWorkerKernel(new Float32Array([42, 0.82, 0.18, 64]), 777);
    expect(workerOut).toHaveLength(12);
    expect(workerOut[11]).toBe(1);
  });
});

describe('Deep-Dive Assessment Report Regression Suite (H-2, H-3, H-6, H-7, M-4)', () => {
  test('H-2: eshkol-ad guards division by zero and includes mixed exponent-tangent term in adHvp', () => {
    const tape = adTapeNew(64);
    const x = adVar(tape, 2.0);
    const zero = adConst(tape, 0.0);
    const divNode = adDiv(tape, x, zero);
    adBackward(tape, divNode);
    expect(adGradient(tape, x)).toBe(0);

    // f(u, v) = u^v at u = 2, v = 3 with tangent (du=1, dv=1).
    // Mixed second derivative d^2(u^v)/(du dv) = u^(v-1) * (1 + v ln u) = 4 * (1 + 3 ln 2).
    const tape2 = adTapeNew(64);
    const uNode = adVar(tape2, 2.0);
    const vNode = adVar(tape2, 3.0);
    const powNode = adPow(tape2, uNode, vNode);
    const dir = new Float64Array(tape2.len);
    dir[uNode] = 1.0;
    dir[vNode] = 1.0;
    const hvpScratch = adHvp(tape2, powNode, dir);
    const u = 2.0;
    const v = 3.0;
    const d2uu = v * (v - 1) * Math.pow(u, v - 2);
    const d2uv = Math.pow(u, v - 1) * (1 + v * Math.log(u));
    expect(hvpScratch.adjDot[uNode]!).toBeCloseTo(d2uu + d2uv, 9);
  });

  test('H-3: DeterministicStatevectorRng and EshkolQrng default to 1024-bit NIST SP 800-90B APT window', () => {
    const dRng = new DeterministicStatevectorRng(makeRng(7));
    const qRng = new EshkolQrng(makeRng(7));
    expect(dRng.health().windowCapacityBits).toBe(SP80090B_APT_WINDOW_BINARY);
    expect(qRng.snapshot().health.windowCapacityBits).toBe(SP80090B_APT_WINDOW_BINARY);
  });

  test('H-6: computeRicciScalarField captures Riemann derivatives and 2x2 QNG is anisotropic', () => {
    // 2-sphere metric ds^2 = d(theta)^2 + sin^2(theta) d(phi)^2 has scalar curvature R = 2
    const sphereMetric = (theta: ArrayLike<number>) => {
      const t = theta[0]!;
      const s = Math.sin(t);
      return [
        [1, 0],
        [0, s * s],
      ];
    };
    const r = computeRicciScalarField(sphereMetric, [1.1, 0.4]);
    expect(r).toBeCloseTo(2.0, 2);

    const fieldOut = curvatureAwareNaturalGradientField(sphereMetric, [1.1, 0.4], [0.5, -0.3]);
    expect(fieldOut.length).toBe(2);
    expect(Number.isFinite(fieldOut[0]!)).toBe(true);

    const step2x2 = new Float64Array(2);
    curvatureAwareNaturalGradient2x2(1.5, 0.2, 0.5, 1.0, 1.0, 0.5, 1e-4, step2x2);
    // Anisotropic preconditioning means step2x2[0] !== step2x2[1] when g00 !== g11
    expect(Math.abs(step2x2[0]! - step2x2[1]!)).toBeGreaterThan(1e-4);
  });

  test('H-7: EshkolProgramEvolution mutates parenthesized tokens and HigherOrderEmergence detects constructive synergy', () => {
    const evo = new EshkolProgramEvolution(1.0);
    let mutatedParenthesizedState = false;
    const inputs = new Float32Array([0.1]);
    for (let i = 0; i < 20; i++) {
      const m = evo.evolve(`prog-${i}`, 0.9, inputs);
      if (m.includes('(+ state 0.01))') || m.includes('(compute')) {
        mutatedParenthesizedState = true;
      }
      // Parentheses must remain balanced
      const opens = (m.match(/\(/g) ?? []).length;
      const closes = (m.match(/\)/g) ?? []).length;
      expect(opens).toBe(closes);
    }
    expect(mutatedParenthesizedState).toBe(true);

    const hoe = new HigherOrderEmergence(4, 0.7);
    hoe.aggregate('agent-0', new Float32Array([1, 1, 0, 0]));
    hoe.aggregate('agent-1', new Float32Array([1, 1, 0, 0]));
    expect(hoe.getSynergy()).toBeGreaterThan(0);
    expect(hoe.getCollectiveIntelligence()).toBe(1);
  });

  test('M-4: EmergentLanguage reinforce updates signId and signalId mappings when reinforcing', () => {
    const lang = new EmergentLanguage({ learningRate: 0.4, minStrength: 0.3 });
    lang.reinforce(1, 10);
    lang.reinforce(1, 20);
    expect(lang.encode(1)).toBe(20);
    expect(lang.decode(20)).toBe(1);
  });
});

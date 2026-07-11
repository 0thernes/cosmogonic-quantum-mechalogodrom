import { describe, expect, test } from 'bun:test';
import {
  runV4NumericalSafety,
  V4_NUMERICAL_FAULT_CLASSES,
  V4_NUMERICAL_FAULT_INPUTS,
  V4_SEMANTIC_FAULT_INPUTS,
} from '../scripts/organism-intelligence-v4/numerical-safety';

describe('V4 numerical-safety harness', () => {
  test('keeps diagnostic prefixes bounded and replayable without granting the frozen gate', () => {
    const result = runV4NumericalSafety(256);
    expect(result).toMatchObject({
      forcedSteps: 256,
      replayCheckedSteps: 256,
      faultStepCount: 256,
      faultEventCount: 256,
      violationCount: 0,
      replayViolationCount: 0,
      allFiniteAndBounded: true,
      replayMatched: true,
      finalFieldRevision: 256,
      semanticReadyCount: 256,
      snapshotRoundTripCount: 256,
      thinkCount: 256,
      sampleCountsMatch: true,
      semanticStorageBytesPerEntity: 17,
      genomeStorageBytesPerEntity: 320,
      genomeStorageKind: 'fp32',
      gateMet: false,
      accepted: false,
    });
    expect(result.traceSha256).toBe(result.replayTraceSha256);
    expect(result.familyScopes.sharedOrdinaryPredictor).toMatchObject({
      replayMatched: true,
      gateMet: false,
      accepted: false,
    });
    expect(result.familyScopes.petri).toMatchObject({
      replayMatched: true,
      gateMet: false,
      accepted: false,
    });
    expect(result.familyScopes.titans).toMatchObject({
      replayMatched: true,
      gateMet: false,
      accepted: false,
    });
    expect(result.traceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(result.contentSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  test('executes and internally replays the exact frozen 10,000-step gate', () => {
    const result = runV4NumericalSafety();
    expect(result).toMatchObject({
      forcedSteps: 10_000,
      replayCheckedSteps: 10_000,
      faultStepCount: 10_000,
      faultEventCount: 10_000,
      faultCoverageComplete: true,
      violationCount: 0,
      replayViolationCount: 0,
      allFiniteAndBounded: true,
      replayMatched: true,
      finalFieldRevision: 10_000,
      semanticReadyCount: 10_000,
      snapshotRoundTripCount: 10_000,
      thinkCount: 10_000,
      sampleCountsMatch: true,
      signalSamples: 140_000,
      semanticStateSamples: 40_000,
      adaptiveStateSamples: 50_000,
      predictorParameterSamples: 250_000,
      predictorStateSamples: 90_000,
      genomeParameterSamples: 800_000,
      actionSamples: 30_000,
      outcomeSamples: 10_000,
      activationSamples: 10_000,
      snapshotSamples: 10_000,
      semanticStorageBytesPerEntity: 17,
      genomeStorageBytesPerEntity: 320,
      genomeStorageKind: 'fp32',
      gateMet: true,
      accepted: true,
    });
    expect(result.expectedSampleCounts).toEqual({
      signal: 140_000,
      semanticState: 40_000,
      adaptiveState: 50_000,
      predictorParameter: 250_000,
      predictorState: 90_000,
      genomeParameter: 800_000,
      action: 30_000,
      outcome: 10_000,
      activation: 10_000,
      snapshot: 10_000,
    });
    expect(result.faultInputOrder).toEqual(V4_NUMERICAL_FAULT_INPUTS);
    expect(result.faultClassOrder).toEqual(V4_NUMERICAL_FAULT_CLASSES);
    expect(result.faultCoverageMatrix).toHaveLength(7);
    expect(result.faultCoverageMatrix.flat()).toHaveLength(35);
    expect(result.faultCoverageMatrix.flat().reduce((sum, count) => sum + count, 0)).toBe(10_000);
    expect(result.faultCoverageMatrix.flat().every((count) => count === 285 || count === 286)).toBe(
      true,
    );
    const sharedScope = result.familyScopes.sharedOrdinaryPredictor;
    const petriScope = result.familyScopes.petri;
    const titanScope = result.familyScopes.titans;
    for (const scope of [sharedScope, petriScope, titanScope]) {
      expect(scope).toMatchObject({
        replayViolationCount: 0,
        replayMatched: true,
        gateMet: true,
        accepted: true,
      });
      expect(scope.campaign).toMatchObject({
        forcedSteps: 10_000,
        faultStepCount: 10_000,
        faultEventCount: 10_000,
        faultCoverageComplete: true,
        sampleCountsMatch: true,
        violationCount: 0,
        allFiniteAndBounded: true,
      });
      expect(scope.campaign.traceSha256).toBe(scope.replayTraceSha256);
      expect(scope.campaign.traceSha256).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(petriScope.campaign).toMatchObject({
      semanticLaneOrder: ['resource', 'threat', 'exploration', 'social'],
      faultClassOrder: V4_NUMERICAL_FAULT_CLASSES,
      sanitizedSignalSamples: 140_000,
      stateSamples: 340_000,
      parameterSamples: 60_000,
      actionSamples: 20_000,
      outcomeSamples: 10_000,
      snapshotSamples: 10_000,
      snapshotRoundTripCount: 10_000,
      expectedSampleCounts: {
        sanitizedSignal: 140_000,
        state: 340_000,
        parameter: 60_000,
        action: 20_000,
        outcome: 10_000,
        snapshot: 10_000,
      },
    });
    expect(titanScope.campaign).toMatchObject({
      semanticLaneOrder: ['resource', 'threat', 'exploration', 'social'],
      faultClassOrder: V4_NUMERICAL_FAULT_CLASSES,
      sanitizedSignalSamples: 140_000,
      stateSamples: 200_000,
      actionSamples: 20_000,
      payoffSamples: 20_000,
      outcomeSamples: 10_000,
      snapshotSamples: 10_000,
      snapshotRoundTripCount: 10_000,
      environmentRngDrawCount: 20_000,
      expectedSampleCounts: {
        sanitizedSignal: 140_000,
        state: 200_000,
        action: 20_000,
        payoff: 20_000,
        outcome: 10_000,
        snapshot: 10_000,
        environmentRngDraw: 20_000,
      },
    });
    for (const matrix of [
      petriScope.campaign.faultCoverageMatrix,
      titanScope.campaign.faultCoverageMatrix,
    ]) {
      expect(matrix).toHaveLength(4);
      expect(matrix.flat()).toHaveLength(20);
      expect(matrix.flat().reduce((sum, count) => sum + count, 0)).toBe(10_000);
      expect(matrix.flat().every((count) => count === 500)).toBe(true);
    }
    expect(petriScope.campaign.semanticLaneOrder).toEqual(V4_SEMANTIC_FAULT_INPUTS);
    expect(titanScope.campaign.semanticLaneOrder).toEqual(V4_SEMANTIC_FAULT_INPUTS);
    expect(result.traceSha256).toBe(result.replayTraceSha256);
    expect(result.minimumOutcome).toBeGreaterThanOrEqual(0);
    expect(result.maximumOutcome).toBeLessThanOrEqual(1);
    expect(result.maximumAbsoluteActionComponent).toBeLessThanOrEqual(
      result.actionBounds.absoluteComponent,
    );
    expect(result.maximumAbsoluteGoalProjection).toBeLessThanOrEqual(
      result.actionBounds.absoluteGoalProjection,
    );
    expect(result.maximumHorizontalActionMagnitude).toBeLessThanOrEqual(
      result.actionBounds.horizontalRadialDerived,
    );
    expect(result.maximumSpatialActionMagnitude).toBeLessThanOrEqual(
      result.actionBounds.spatialRadialDerived,
    );
    expect(result.maximumAbsolutePredictorParameter).toBeLessThanOrEqual(
      result.predictorParameterAbsoluteBound,
    );
    expect(result.maximumAbsoluteGenomeParameter).toBeLessThanOrEqual(1);
    expect(result.maximumActivation).toBeLessThanOrEqual(result.activationBound);
  }, 30_000);

  test('rejects invalid diagnostic lengths', () => {
    expect(() => runV4NumericalSafety(0)).toThrow();
    expect(() => runV4NumericalSafety(10_001)).toThrow();
    expect(() => runV4NumericalSafety(1.5)).toThrow();
  });
});

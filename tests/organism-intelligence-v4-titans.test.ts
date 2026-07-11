import { describe, expect, test } from 'bun:test';
import { REL_TRUCE, REL_WAR } from '../src/sim/titans';
import { mulberry32 } from '../src/math/rng';
import {
  calibrateTitanV4Surrogate,
  evaluateTitanV4,
  evaluateTitanV4Seed,
  TITAN_V4_ARMS,
} from '../scripts/organism-intelligence-v4/titans';
import {
  v4DerivedSeed,
  V4_EVALUATION_SEEDS,
  V4_FAMILY_FIXTURES,
} from '../scripts/organism-intelligence-v4-protocol';

function sha256(value: unknown): string {
  return new Bun.CryptoHasher('sha256').update(JSON.stringify(value)).digest('hex');
}

function expectedTitanInitialStateSha256(): string {
  const fixture = V4_FAMILY_FIXTURES.titans;
  const regimeHashes = fixture.regimes.map((regime) =>
    sha256({
      titans: regime.strategies.map((strategy, index) => ({
        energy: fixture.initialState.energy[index]!,
        matter: fixture.initialState.matter[index]!,
        entropy: fixture.initialState.entropy[index]!,
        strategy: strategy === 'ALWAYS-DEFECT' ? 3 : 0,
        warCount: 0,
      })),
      history: fixture.initialState.histories,
      strategyFitness: fixture.initialState.strategyFitness,
      relation: REL_TRUCE,
      externalEconomyDisabled: fixture.initialState.externalEconomyDisabled,
    }),
  );
  return sha256(regimeHashes);
}

describe('V4 Titan family evaluator', () => {
  test('freezes one pooled non-regime-conditioned action-rate calibration', () => {
    expect(Object.isFrozen(TITAN_V4_ARMS)).toBe(true);
    const calibration = calibrateTitanV4Surrogate();
    expect(calibration.sourceMoveCount).toBe(960);
    expect(calibration.cooperationRate).toBe(0.2125);
    expect(calibration.sourceMovesSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(calibration.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(calibrateTitanV4Surrogate()).toEqual(calibration);
  });

  test('runs all declared arms with identical initial state and environment RNG tapes', () => {
    const seed = 3957713710;
    const calibration = calibrateTitanV4Surrogate();
    const rows = evaluateTitanV4Seed(seed, calibration);
    expect(rows.map(({ arm }) => arm)).toEqual([...TITAN_V4_ARMS]);
    expect(rows).toEqual(evaluateTitanV4Seed(seed, calibration));
    expect(new Set(rows.map(({ hashes }) => hashes.initialStateSha256)).size).toBe(1);
    expect(new Set(rows.map(({ hashes }) => hashes.perceptSha256)).size).toBe(1);
    expect(new Set(rows.map(({ hashes }) => hashes.goalScheduleSha256)).size).toBe(1);
    expect(new Set(rows.map(({ hashes }) => hashes.environmentRngTapeSha256)).size).toBe(1);
    expect(
      rows.every(({ secondaryOutcomes }) => secondaryOutcomes.environmentRngDrawCount === 60),
    ).toBe(true);
    expect(rows.every(({ primaryOutcome }) => primaryOutcome >= 0 && primaryOutcome <= 1)).toBe(
      true,
    );

    const surrogate = rows.find(({ arm }) => arm === 'action-rate-matched-policy-surrogate')!;
    expect(surrogate.secondaryOutcomes.surrogateRngDrawCount).toBe(60);
    expect(surrogate.hashes.surrogateRngTapeSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(surrogate.hashes.surrogateRngTapeSha256).toBe(
      'b772f03733cb3a74fc7c7a829efb4deea60070cff6f9ad4d8cbe5722a088fcd8',
    );
    expect(
      rows
        .filter(({ arm }) => arm !== 'action-rate-matched-policy-surrogate')
        .every(({ hashes }) => hashes.surrogateRngTapeSha256 === null),
    ).toBe(true);
    expect(surrogate.hashes.policySurrogateCalibrationSha256).toBe(calibration.contentHash);
    expect(
      rows
        .filter(({ arm }) => arm !== 'action-rate-matched-policy-surrogate')
        .every(({ hashes }) => hashes.policySurrogateCalibrationSha256 === null),
    ).toBe(true);
  });

  test('writes the semantic policy into actual move, payoff, energy, fitness, and relation state', () => {
    const rows = evaluateTitanV4Seed(3957713710, calibrateTitanV4Surrogate());
    const full = rows.find(({ arm }) => arm === 'full-intelligence-diplomacy')!;
    const disabled = rows.find(({ arm }) => arm === 'shared-field-disabled')!;
    const cyclic = rows.find(({ arm }) => arm === 'semantic-channel-cyclic-permutation')!;
    expect(full.primaryOutcome).toBeGreaterThan(disabled.primaryOutcome);
    expect(full.primaryOutcome).toBeGreaterThan(cyclic.primaryOutcome);
    expect(full.secondaryOutcomes.finalEnergy).not.toEqual(disabled.secondaryOutcomes.finalEnergy);
    expect(full.secondaryOutcomes.finalRelations).not.toEqual(
      disabled.secondaryOutcomes.finalRelations,
    );
    expect(full.secondaryOutcomes.strategyFitness).not.toEqual(
      disabled.secondaryOutcomes.strategyFitness,
    );
  });

  test('reports pair payoff for each regime and the exact pooled aggregate', () => {
    const rows = evaluateTitanV4Seed(3957713710, calibrateTitanV4Surrogate());

    for (const row of rows) {
      const payoff = row.secondaryOutcomes.pairPayoff;
      expect(payoff.perRegime.map(({ regimeId }) => regimeId)).toEqual([
        'social-cooperation',
        'defensive-pressure',
      ]);
      for (const regime of payoff.perRegime) {
        expect(regime.rounds).toBe(15);
        expect(regime.pairTotal).toBe(regime.titanA + regime.titanB);
        expect(regime.pairMeanPerRound).toBe(regime.pairTotal / regime.rounds);
        expect(regime.meanPerPlayedMove).toBe(regime.pairTotal / (regime.rounds * 2));
      }
      expect(payoff.aggregate.rounds).toBe(30);
      expect(payoff.aggregate.titanA).toBe(payoff.perRegime[0].titanA + payoff.perRegime[1].titanA);
      expect(payoff.aggregate.titanB).toBe(payoff.perRegime[0].titanB + payoff.perRegime[1].titanB);
      expect(payoff.aggregate.pairTotal).toBe(
        payoff.perRegime[0].pairTotal + payoff.perRegime[1].pairTotal,
      );
      expect(payoff.aggregate.pairMeanPerRound).toBe(payoff.aggregate.pairTotal / 30);
      expect(payoff.aggregate.meanPerPlayedMove).toBe(payoff.aggregate.pairTotal / 60);
    }

    const full = rows.find(({ arm }) => arm === 'full-intelligence-diplomacy')!;
    const disabled = rows.find(({ arm }) => arm === 'shared-field-disabled')!;
    expect(full.secondaryOutcomes.pairPayoff.perRegime.map(({ pairTotal }) => pairTotal)).toEqual([
      56, 30,
    ]);
    expect(full.secondaryOutcomes.pairPayoff.aggregate.pairTotal).toBe(86);
    expect(
      disabled.secondaryOutcomes.pairPayoff.perRegime.map(({ pairTotal }) => pairTotal),
    ).toEqual([30, 90]);
    expect(disabled.secondaryOutcomes.pairPayoff.aggregate.pairTotal).toBe(120);
  });

  test('seals all 64 matched tapes, frozen initial state, and live relation write-through', () => {
    const evaluation = evaluateTitanV4();
    expect(evaluation.rows).toHaveLength(V4_EVALUATION_SEEDS.length * TITAN_V4_ARMS.length);
    const expectedInitialState = expectedTitanInitialStateSha256();

    for (const seed of V4_EVALUATION_SEEDS) {
      const rows = evaluation.rows.filter((row) => row.seed === seed);
      expect(rows).toHaveLength(TITAN_V4_ARMS.length);
      expect(new Set(rows.map(({ hashes }) => hashes.initialStateSha256))).toEqual(
        new Set([expectedInitialState]),
      );
      expect(new Set(rows.map(({ hashes }) => hashes.perceptSha256)).size).toBe(1);
      expect(new Set(rows.map(({ hashes }) => hashes.goalScheduleSha256)).size).toBe(1);

      const environmentDraws = [0, 1].flatMap((regimeIndex) => {
        const rng = mulberry32(v4DerivedSeed(seed, 'titanEnvironment', regimeIndex));
        return Array.from({ length: 30 }, () => rng());
      });
      expect(new Set(rows.map(({ hashes }) => hashes.environmentRngTapeSha256))).toEqual(
        new Set([sha256(environmentDraws)]),
      );

      const surrogateRng = mulberry32(v4DerivedSeed(seed, 'titanSurrogate'));
      const surrogateDraws = Array.from({ length: 60 }, () => surrogateRng());
      const surrogate = rows.find(({ arm }) => arm === 'action-rate-matched-policy-surrogate')!;
      expect(surrogate.hashes.surrogateRngTapeSha256).toBe(sha256(surrogateDraws));

      for (const row of rows) {
        row.secondaryOutcomes.finalRelations.forEach((relation, regimeIndex) => {
          const expectedWarCount = relation === REL_WAR ? 1 : 0;
          expect(row.secondaryOutcomes.finalWarCounts[regimeIndex]).toEqual([
            expectedWarCount,
            expectedWarCount,
          ]);
        });
      }
    }

    const mean = (arm: (typeof TITAN_V4_ARMS)[number]): number => {
      const outcomes = evaluation.rows
        .filter((row) => row.arm === arm)
        .map(({ primaryOutcome }) => primaryOutcome);
      return outcomes.reduce((sum, value) => sum + value, 0) / outcomes.length;
    };
    expect(mean('full-intelligence-diplomacy')).toBeCloseTo(0.613802083333333, 15);
    expect(mean('shared-field-disabled')).toBe(0);
    expect(mean('semantic-channel-cyclic-permutation')).toBeCloseTo(0.3460937500000001, 15);
    expect(mean('action-rate-matched-policy-surrogate')).toBeCloseTo(0.5088541666666666, 15);
  });

  test('rejects ad hoc seeds, altered calibrations, and partial publication batches', () => {
    const calibration = calibrateTitanV4Surrogate();
    expect(() => evaluateTitanV4Seed(1, calibration)).toThrow('64 frozen V4 evaluation seeds');
    expect(() =>
      evaluateTitanV4Seed(3957713710, {
        ...calibration,
        cooperationRate: calibration.cooperationRate + 0.01,
      }),
    ).toThrow('exact frozen pooled-policy calibration');
    expect(() => evaluateTitanV4([3957713710])).toThrow('exact ordered 64-seed family');
  });
});

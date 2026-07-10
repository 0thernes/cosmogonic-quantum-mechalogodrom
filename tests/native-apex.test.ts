import { describe, expect, test } from 'bun:test';
import { apexGoldenVectors } from '../src/sim/apex-native-backend';
import { apexReproductionProblems, parseNativeApexOutput } from '../scripts/verify-native-apex';

const SEEDS = [1, 7, 12345, 0xabcdef] as const;

describe('native APEX cross-language receipt', () => {
  test('parses the native table and matches the live TypeScript oracle', () => {
    const output = [
      'seed primeSieve statevector heatGrid pendulum',
      ...SEEDS.map((seed) => {
        const row = apexGoldenVectors(seed);
        return `${row.seed} ${row.primeSieve} ${row.statevector} ${row.heatGrid} ${row.pendulum}`;
      }),
    ].join('\n');
    expect(apexReproductionProblems(parseNativeApexOutput(output))).toEqual([]);
  });

  test('reports one-sided native drift instead of self-validating stale constants', () => {
    const rows = SEEDS.map((seed) => apexGoldenVectors(seed));
    rows[0] = { ...rows[0]!, pendulum: (rows[0]!.pendulum + 1) >>> 0 };
    expect(apexReproductionProblems(rows)).toContain(
      `seed 1 pendulum: native ${rows[0]!.pendulum} != TypeScript ${apexGoldenVectors(1).pendulum}`,
    );
  });

  test('rejects output without numeric vector rows', () => {
    expect(() => parseNativeApexOutput('not a vector table')).toThrow(/no vector rows/);
  });
});

/**
 * Cross-language APEX reproduction gate. Runs the built C++ vector executable and compares every
 * value to the current TypeScript oracle, so either side changing alone fails CI.
 */

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { apexGoldenVectors, type ApexGoldenVectors } from '../src/sim/apex-native-backend';

const PROBE_SEEDS = [1, 7, 12345, 0xabcdef] as const;

export function parseNativeApexOutput(output: string): ApexGoldenVectors[] {
  const rows: ApexGoldenVectors[] = [];
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$/);
    if (!match) continue;
    const values = match.slice(1).map(Number);
    if (values.length !== 5 || values.some((value) => !Number.isSafeInteger(value))) continue;
    const [seed, primeSieve, statevector, heatGrid, pendulum] = values;
    if (
      seed === undefined ||
      primeSieve === undefined ||
      statevector === undefined ||
      heatGrid === undefined ||
      pendulum === undefined
    ) {
      continue;
    }
    rows.push({ seed, primeSieve, statevector, heatGrid, pendulum });
  }
  if (rows.length === 0) throw new Error('native APEX executable produced no vector rows');
  return rows;
}

export function apexReproductionProblems(rows: readonly ApexGoldenVectors[]): string[] {
  const problems: string[] = [];
  const bySeed = new Map<number, ApexGoldenVectors>();
  for (const row of rows) {
    if (bySeed.has(row.seed)) problems.push(`duplicate native vector for seed ${row.seed}`);
    bySeed.set(row.seed, row);
  }
  for (const seed of PROBE_SEEDS) {
    const expected = apexGoldenVectors(seed);
    const actual = bySeed.get(expected.seed);
    if (!actual) {
      problems.push(`missing native vector for seed ${expected.seed}`);
      continue;
    }
    for (const key of ['primeSieve', 'statevector', 'heatGrid', 'pendulum'] as const) {
      if (actual[key] !== expected[key]) {
        problems.push(
          `seed ${expected.seed} ${key}: native ${actual[key]} != TypeScript ${expected[key]}`,
        );
      }
    }
  }
  for (const seed of bySeed.keys()) {
    if (!PROBE_SEEDS.includes(seed as (typeof PROBE_SEEDS)[number])) {
      problems.push(`unexpected native vector seed ${seed}`);
    }
  }
  return problems;
}

function main(): void {
  const path = process.argv[2];
  if (!path)
    throw new Error('usage: bun scripts/verify-native-apex.ts <cqm_apex_golden executable>');
  const executable = resolve(path);
  const result = spawnSync(executable, [], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `native APEX executable failed with status ${String(result.status)}: ${result.stderr.trim()}`,
    );
  }
  const problems = apexReproductionProblems(parseNativeApexOutput(result.stdout));
  if (problems.length > 0) {
    throw new Error(`native APEX reproduction drift:\n - ${problems.join('\n - ')}`);
  }
  console.log(
    `native APEX reproduction: ${PROBE_SEEDS.length} seeds match the live TypeScript oracle`,
  );
}

if (import.meta.main) main();

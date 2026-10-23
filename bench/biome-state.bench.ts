/** Bounded CPU-only pool cost and pinned allocation-refactor control; excludes World/rendering. */
import { cpus, platform, release } from 'node:os';
import { resolve, join } from 'node:path';
import { mkdir, unlink } from 'node:fs/promises';
import { OrganismBioStatePool, evaluateOrganismLifeStage } from '../src/sim/biome-strata';
import { prepareParallelCounterSeed } from '../src/math/wild-entropy';

const root = resolve(import.meta.dir, '..');
const output = join(root, 'output/biome-state', new Date().toISOString().replace(/[:.]/g, '-'));
await mkdir(output, { recursive: true });
const sources = ['src/sim/biome-strata.ts', 'src/math/wild-entropy.ts'];
async function hashes() {
  return Object.fromEntries(
    await Promise.all(
      sources.map(async (file) => [
        file,
        new Bun.CryptoHasher('sha256')
          .update(await Bun.file(join(root, file)).arrayBuffer())
          .digest('hex'),
      ]),
    ),
  );
}
function fixture(count: number) {
  const y = new Float32Array(count);
  const energies = new Float32Array(count);
  const ages = new Float32Array(count);
  const lives = new Float32Array(count).fill(1000);
  const acts = new Float32Array(count);
  const ids = new Uint32Array(count);
  for (let i = 0; i < count; i++) {
    y[i] = -40 + (i % 100);
    energies[i] = 20 + (i % 80);
    ages[i] = i % 1000;
    acts[i] = Math.sin(i * 0.031) * 2;
    ids[i] = i + 1;
  }
  return {
    y,
    energies,
    ages,
    lives,
    acts,
    ids,
    velocity: new Float32Array(count),
    energy: new Float32Array(count),
    scale: new Float32Array(count),
  };
}
function step(
  pool: OrganismBioStatePool,
  f: ReturnType<typeof fixture>,
  seed: number,
  tick: number,
  dt: number,
) {
  pool.stepShard(
    f.y,
    f.energies,
    f.ages,
    f.lives,
    f.acts,
    f.velocity,
    f.energy,
    f.scale,
    0,
    f.y.length,
    seed,
    tick,
    2.5,
    dt,
    false,
    f.y.length,
    f.ids,
  );
}
const sourceSha256 = await hashes();
const cases = [];
for (const count of [10000, 50000]) {
  for (const wild of [false, true]) {
    const pool = new OrganismBioStatePool(count);
    const input = fixture(count);
    for (let i = 0; i < 4; i++) step(pool, input, prepareParallelCounterSeed(173, i, wild), i, 0.2);
    const samplesMs = [];
    for (let i = 0; i < 12; i++) {
      const start = performance.now();
      const seed = prepareParallelCounterSeed(173, i + 4, wild);
      step(pool, input, seed, i + 4, 0.2);
      samplesMs.push(performance.now() - start);
    }
    const sorted = [...samplesMs].sort((a, b) => a - b);
    cases.push({
      count,
      mode: wild ? 'one-salt-wild-batch' : 'seeded',
      warmups: 4,
      sampleCount: 12,
      elapsedSimulationDt: 0.2,
      samplesMs,
      medianMs: (sorted[5]! + sorted[6]!) / 2,
      p95Ms: sorted[11],
      finite: [
        ...pool.dopamine,
        ...pool.serotonin,
        ...pool.noradrenaline,
        ...pool.memoryTrace,
        ...input.velocity,
        ...input.energy,
        ...input.scale,
      ].every(Number.isFinite),
    });
  }
}

// Pinned pre-repair source is only an oracle for the unchanged 16ms profile and deterministic kernel.
// Timing above never executes the old per-organism wild entropy path.
const old = Bun.spawnSync(['git', 'show', '7ae20238:src/sim/biome-strata.ts'], { cwd: root });
if (old.exitCode !== 0) throw new Error('Could not read pinned profile reference');
const oldSource = old.stdout
  .toString()
  .replaceAll("'../math/scalar'", JSON.stringify(join(root, 'src/math/scalar.ts')))
  .replaceAll("'../math/wild-entropy'", JSON.stringify(join(root, 'src/math/wild-entropy.ts')));
const oraclePath = join(output, 'biome-reference.generated.ts');
await Bun.write(oraclePath, oldSource);
let regression;
try {
  const oracle = await import(oraclePath);
  let profiles = 0;
  for (const age of [-1, 0, 50, 149, 150, 300, 450, 600, 800, 900, 1000, NaN]) {
    for (const energy of [0, 30, 45, 60, 85, 100, NaN]) {
      for (const act of [0, 2, -3, NaN]) {
        const current = evaluateOrganismLifeStage(age, 1000, energy, act);
        const expected = oracle.evaluateOrganismLifeStage(age, 1000, energy, act);
        if (JSON.stringify(current) !== JSON.stringify(expected))
          throw new Error('Profile regression');
        profiles++;
      }
    }
  }
  const before = new oracle.OrganismBioStatePool(128);
  const after = new OrganismBioStatePool(128);
  const f0 = fixture(128);
  const f1 = fixture(128);
  // Legacy slot counter ID is deliberately retained for this pure allocation-refactor comparison.
  for (let i = 0; i < 128; i++) f1.ids[i] = i;
  before.stepShard(
    f0.y,
    f0.energies,
    f0.ages,
    f0.lives,
    f0.acts,
    f0.velocity,
    f0.energy,
    f0.scale,
    0,
    128,
    173,
    73,
    2.5,
    0.016,
    false,
  );
  step(after, f1, 173, 73, 0.016);
  let maxAbsError = 0;
  for (const name of [
    'dopamine',
    'serotonin',
    'noradrenaline',
    'prevEnergy',
    'memoryTrace',
    'stratumIndex',
    'lifeStageIndex',
  ] as const) {
    for (let i = 0; i < after[name].length; i++)
      maxAbsError = Math.max(maxAbsError, Math.abs(after[name][i]! - before[name][i]!));
  }
  for (const name of ['velocity', 'energy', 'scale'] as const) {
    for (let i = 0; i < 128; i++)
      maxAbsError = Math.max(maxAbsError, Math.abs(f1[name][i]! - f0[name][i]!));
  }
  if (maxAbsError > 1e-7) throw new Error(`16ms kernel mismatch ${maxAbsError}`);
  regression = {
    oracleCommit: '7ae20238',
    profileCases: profiles,
    profileMatch: 'exact',
    kernelEntities: 128,
    kernelDt: 0.016,
    maxAbsError,
    tolerance: 1e-7,
  };
} finally {
  await unlink(oraclePath);
}
const afterHashes = await hashes();
const report = {
  schemaVersion: 1,
  measuredAt: new Date().toISOString(),
  measurement: 'bio-pool-only-synchronous-CPU-not-world-FPS',
  bun: Bun.version,
  os: `${platform()} ${release()}`,
  cpu: cpus()[0]?.model,
  logicalCores: cpus().length,
  conditions:
    'Reusable arrays, mixed strata/life stages, 4 warmups and 12 samples, dt=.2, one complete serial range. Wild salt preparation included; telemetry summarization, rendering, brain controllers, construction and fixture setup excluded.',
  sourceSha256,
  sourcesUnchanged: JSON.stringify(sourceSha256) === JSON.stringify(afterHashes),
  cases,
  regression,
};
if (!report.sourcesUnchanged || cases.some((c) => !c.finite))
  throw new Error('Unstable or nonfinite benchmark');
const path = join(output, 'biome-measurement.json');
await Bun.write(path, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    { path, cases: cases.map(({ samplesMs: _samplesMs, ...c }) => c), regression },
    null,
    2,
  ),
);

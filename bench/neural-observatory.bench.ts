/**
 * Fixed-snapshot observation-builder CPU costs; no browser or frame-rate claims.
 * Run: bun bench/neural-observatory.bench.ts [--output-dir DIRECTORY]
 * Optional receipts are written only to the explicitly supplied directory. No runtime network access.
 */
import { cpus, totalmem, release, platform } from 'node:os';
import { readFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { SuperMind, type SuperMindSnapshot } from '../src/sim/super-mind';
import { mulberry32 } from '../src/math/rng';
import { buildNeuralCards, NeuralHistory, type NeuralCard } from '../src/ui/super-neural-data';
import { buildBrainGraph, type BrainGraph } from '../src/ui/super-neural-brain';

const repo = resolve(import.meta.dir, '..');
const outputFlag = process.argv.indexOf('--output-dir');
const outputDir = outputFlag < 0 ? undefined : process.argv[outputFlag + 1];
if (outputFlag >= 0 && (!outputDir || outputDir.startsWith('--')))
  throw new Error('Usage: bun bench/neural-observatory.bench.ts [--output-dir DIRECTORY]');
const warmup = 48;
const measured = 200;
const seed = 42;
const beats = 96;
const tracked = [
  'src/ui/super-neural-data.ts',
  'src/ui/super-neural-brain.ts',
  'src/math/qubit-pair-info.ts',
  'src/sim/super-mind.ts',
  'src/sim/super-qubits.ts',
  'src/math/rng.ts',
  'bench/neural-observatory.bench.ts',
];
const digest = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const hashes = () =>
  Object.fromEntries(
    tracked.map((file) => [
      file,
      createHash('sha256')
        .update(readFileSync(join(repo, file)))
        .digest('hex'),
    ]),
  );
const hashesBefore = hashes();
const percept = {
  energy: 0.65,
  threat: 0.2,
  crowding: 0.3,
  chaos: 0.4,
  wealthRel: 0.55,
  preyClose: 0.35,
  rivalClose: 0.15,
  pull: 0.1,
  light: 0.7,
  sound: 0.25,
  phase: 0.125,
};
const states = (['full', 'echo'] as const).map((mode) => {
  const mind = new SuperMind(mulberry32(seed));
  const history = new NeuralHistory();
  let snapshot!: SuperMindSnapshot;
  for (let i = 0; i < beats; i++) {
    mind.think(percept, mode);
    snapshot = mind.snapshot();
    history.ingest(snapshot);
  }
  return { mode, snapshot, history };
});
const before = states.map((s) => ({
  mode: s.mode,
  snapshot: digest(s.snapshot),
  history: digest(s.history.samples),
  cards: digest(buildNeuralCards(s.snapshot, s.history)),
  graph: digest(buildBrainGraph(s.snapshot)),
}));
const cases = states.flatMap((s) => [
  {
    name: s.mode + ': buildNeuralCards',
    mode: s.mode,
    kind: 'cards',
    run: () => buildNeuralCards(s.snapshot, s.history),
    ms: [] as number[],
  },
  {
    name: s.mode + ': buildBrainGraph',
    mode: s.mode,
    kind: 'graph',
    run: () => buildBrainGraph(s.snapshot),
    ms: [] as number[],
  },
  {
    name: s.mode + ': both builders',
    mode: s.mode,
    kind: 'combined',
    run: () => [buildNeuralCards(s.snapshot, s.history), buildBrainGraph(s.snapshot)] as const,
    ms: [] as number[],
  },
]);
let sink = 0;
type BuilderOutput = NeuralCard[][] | BrainGraph | readonly [NeuralCard[][], BrainGraph];
const consume = (c: (typeof cases)[number], result: BuilderOutput) => {
  if (c.kind === 'cards') sink += (result as NeuralCard[][]).flat().length;
  else if (c.kind === 'graph') {
    const graph = result as BrainGraph;
    sink += graph.modules.length + graph.edges.length;
  } else {
    const [cards, graph] = result as readonly [NeuralCard[][], BrainGraph];
    sink += cards.flat().length + graph.modules.length + graph.edges.length;
  }
};
for (let i = 0; i < warmup; i++)
  for (let j = 0; j < cases.length; j++) {
    const c = cases[(i + j) % cases.length]!;
    consume(c, c.run());
  }
const startedAt = new Date().toISOString();
for (let i = 0; i < measured; i++)
  for (let j = 0; j < cases.length; j++) {
    const c = cases[(i + j) % cases.length]!;
    const start = performance.now();
    const result = c.run();
    c.ms.push(performance.now() - start);
    consume(c, result);
  }
function stats(ms: number[]) {
  const sorted = [...ms].sort((a, b) => a - b);
  const percentile = (q: number) => sorted[Math.max(0, Math.ceil(q * sorted.length) - 1)]!;
  return {
    count: ms.length,
    meanMs: ms.reduce((a, b) => a + b, 0) / ms.length,
    medianMs: percentile(0.5),
    p95Ms: percentile(0.95),
    minMs: sorted[0]!,
    maxMs: sorted.at(-1)!,
  };
}
const after = states.map((s) => ({
  mode: s.mode,
  snapshot: digest(s.snapshot),
  history: digest(s.history.samples),
  cards: digest(buildNeuralCards(s.snapshot, s.history)),
  graph: digest(buildBrainGraph(s.snapshot)),
}));
const hashesAfter = hashes();
const result = {
  startedAt,
  endedAt: new Date().toISOString(),
  repo,
  head: execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  scope:
    'Current working tree; native Bun CPU fixed-snapshot builder microbenchmark. No browser, canvas rendering, cognition, snapshot construction, FPS or before/after performance claim.',
  runtime: {
    bun: Bun.version,
    revision: Bun.revision,
    arch: process.arch,
    platform: platform(),
    release: release(),
  },
  host: { cpu: cpus()[0]?.model, logicalProcessors: cpus().length, memoryBytes: totalmem() },
  conditions: {
    seed,
    rng: 'Injected mulberry32(seed)',
    preparationBeats: beats,
    warmupPerCondition: warmup,
    measuredPerCondition: measured,
    input: percept,
    historySamples: 96,
    fullAndEcho:
      'Separate identically seeded minds, each advanced 96 times only in its indicated mode; then both snapshots held fixed.',
    timer:
      'performance.now(), monotonic milliseconds; timestamp overhead included; checksum consumption outside the timed region.',
    order:
      'Six conditions interleaved, rotated by one each iteration; combined condition calls cards then graph.',
    isolation:
      'Ordinary desktop session; no CPU pinning, process isolation, forced GC, browser or power measurement.',
    replication:
      '200 timing samples per condition, not independent scientific replications. Allocations and ordinary GC included.',
    exclusions:
      'Construction, cognition, snapshot acquisition, history ingestion, digesting, JSON export, file I/O and canvas drawing are untimed.',
  },
  shapes: states.map((s) => {
    const cards = buildNeuralCards(s.snapshot, s.history).flat();
    const graph = buildBrainGraph(s.snapshot);
    return {
      mode: s.mode,
      tick: s.snapshot.observatory.tick,
      historySamples: s.history.samples.length,
      cards: cards.length,
      cardScalarValues: cards.reduce(
        (sum, c) => sum + c.series.reduce((n, row) => n + row.values.length, 0),
        0,
      ),
      graphModules: graph.modules.length,
      graphEdges: graph.edges.length,
      quantumDimensions: s.snapshot.qubits.probs.length,
    };
  }),
  sourceHashesBefore: hashesBefore,
  sourceHashesAfter: hashesAfter,
  sourceUnchangedDuringRun: JSON.stringify(hashesBefore) === JSON.stringify(hashesAfter),
  pure: {
    before,
    after,
    snapshotsHistoriesAndOutputsUnchanged: JSON.stringify(before) === JSON.stringify(after),
  },
  results: cases.map((c) => ({ name: c.name, ...stats(c.ms), rawMs: c.ms })),
  sink,
};
if (outputDir) {
  mkdirSync(outputDir, { recursive: true });
  await Bun.write(
    join(outputDir, 'builder-cost-benchmark.json'),
    JSON.stringify(result, null, 2) + '\n',
  );
  const rows = result.results
    .map(
      (r) =>
        `| ${r.name} | ${r.meanMs.toFixed(4)} | ${r.medianMs.toFixed(4)} | ${r.p95Ms.toFixed(4)} |`,
    )
    .join('\n');
  await Bun.write(
    join(outputDir, 'builder-cost-benchmark.md'),
    `# Current observation-builder costs\n\nMeasured ${startedAt} against HEAD ${result.head}, with the current working-tree hashes recorded in the adjacent JSON.\n\n${result.scope}\n\n${result.host.cpu}; ${result.host.logicalProcessors} logical processors; ${result.runtime.platform} ${result.runtime.release}; Bun ${result.runtime.bun} (${result.runtime.revision}).\n\nSeparate seeded (42) full and echo minds were advanced 96 beats using the recorded constant percept. Each fixed completed snapshot was then reused with its actual 96-sample history. There were ${warmup} warmups and ${measured} measured iterations per condition; six conditions were interleaved with rotating order. The timed region includes the requested builder calls and allocations, with checksum consumption outside the timer. There was no CPU pinning or forced GC. These are repeated timing samples, not independent experimental replications.\n\n| Condition | Mean ms | Median ms | p95 ms |\n|---|---:|---:|---:|\n${rows}\n\nSource hashes unchanged during run: ${result.sourceUnchangedDuringRun}. Snapshot, history and output digests unchanged: ${result.pure.snapshotsHistoriesAndOutputsUnchanged}. Raw samples, clock details, shapes and SHA-256 provenance are retained in builder-cost-benchmark.json. The numbers do not establish delivered frame rates or a performance improvement.\n`,
  );
}
console.log(
  JSON.stringify(
    { ...result, results: result.results.map(({ rawMs: _rawMs, ...summary }) => summary) },
    null,
    2,
  ),
);
if (!result.sourceUnchangedDuringRun || !result.pure.snapshotsHistoriesAndOutputsUnchanged)
  process.exitCode = 1;

/**
 * Apex open-endedness report: runs the seeded novelty archive (src/sim/apex-novelty.ts) over a
 * seed ensemble and prints the archive size, spread and the four health flags (not a monoculture,
 * not frozen, bounded, reproducible). Offline instrument by design: running whole ensembles live
 * would cost frames, so it stays a report. Exit code 1 if any health flag fails.
 *
 *   bun run report:apex-novelty [seeds=12] [beats=80]
 */
import { noveltyReport } from '../src/sim/apex-novelty';

const seeds = Number(process.argv[2] ?? 12);
const beats = Number(process.argv[3] ?? 80);
const r = noveltyReport(seeds, beats);
console.log(JSON.stringify(r, null, 2));
const healthy = r.notMonoculture && r.notFrozen && r.bounded && r.reproducible;
console.log(healthy ? 'apex novelty: healthy' : 'apex novelty: FAILED a health flag');
process.exit(healthy ? 0 : 1);

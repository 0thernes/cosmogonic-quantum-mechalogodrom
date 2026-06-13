/**
 * Aggregated benchmark entrypoint — `bun bench/index.ts` (a.k.a. `bun run bench`).
 *
 * Each suite registers its mitata groups at import time and only invokes run() itself when
 * executed standalone (`import.meta.main`), so importing the six suites here composes them
 * into a single report. Import order is report order.
 */
import './rng.bench';
import './scalar.bench';
import './heap.bench';
import './spatial-hash.bench';
import './algorithms.bench';
import './quantum.bench';
import './reaction-diffusion.bench';
import { run } from 'mitata';

await run();

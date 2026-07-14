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
import './games.bench';
import './quantum.bench';
import './quantum-classical.bench';
import './reaction-diffusion.bench';
import './super-mind.bench';
import './eshkol-ad.bench';
import './quantization.bench';
import './motion-interpolation.bench';
import './perceptual-priority.bench';
import './crystal-ecosystem.bench';
import { run } from 'mitata';

await run();
process.exit(0);

/**
 * Generate the deterministic JSON feed consumed by the static Consciousness Lab page.
 * The output is tracked because GitHub Pages can serve it without a live server.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { generateConsciousnessDashboardData } from '../src/sim/consciousness-adapters';

const OUT = new URL('../lab/consciousness-data.json', import.meta.url);
const data = generateConsciousnessDashboardData();
const prettierConfig =
  (await resolveConfig(fileURLToPath(new URL('../.prettierrc', import.meta.url)))) ?? {};

await mkdir(new URL('../lab/', import.meta.url), { recursive: true });
await writeFile(
  OUT,
  await format(JSON.stringify(data), { ...prettierConfig, parser: 'json' }),
  'utf8',
);

console.log(
  `consciousness lab data -> lab/consciousness-data.json (${data.entityRecords.length} entity adapters · ${data.frameworks.length} frameworks)`,
);

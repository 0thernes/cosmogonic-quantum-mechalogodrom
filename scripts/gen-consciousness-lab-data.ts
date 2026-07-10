/**
 * Generate the deterministic JSON feeds consumed by the static Consciousness/Sentience Lab pages.
 * The output is tracked because GitHub Pages can serve it without a live server.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { generateConsciousnessDashboardData } from '../src/sim/consciousness-adapters';
import { generateSentienceLabData } from '../src/sim/sentience-lab';
import { labDataJsonReplacer } from './lab-data-json';

const CONSCIOUSNESS_OUT = new URL('../lab/consciousness-data.json', import.meta.url);
const SENTIENCE_OUT = new URL('../lab/sentience-data.json', import.meta.url);

export async function generateLabDataArtifacts(): Promise<void> {
  const consciousnessData = generateConsciousnessDashboardData();
  const sentienceData = generateSentienceLabData();
  const prettierConfig =
    (await resolveConfig(fileURLToPath(new URL('../.prettierrc', import.meta.url)))) ?? {};

  await mkdir(new URL('../lab/', import.meta.url), { recursive: true });
  await writeFile(
    CONSCIOUSNESS_OUT,
    await format(JSON.stringify(consciousnessData, labDataJsonReplacer), {
      ...prettierConfig,
      parser: 'json',
    }),
    'utf8',
  );
  await writeFile(
    SENTIENCE_OUT,
    await format(JSON.stringify(sentienceData, labDataJsonReplacer), {
      ...prettierConfig,
      parser: 'json',
    }),
    'utf8',
  );

  console.log(
    `consciousness lab data -> lab/consciousness-data.json (${consciousnessData.entityRecords.length} entity adapters · ${consciousnessData.frameworks.length} frameworks)`,
  );
  console.log(
    `sentience lab data -> lab/sentience-data.json (${sentienceData.sweep.runs} seed runs · ${sentienceData.entityTelemetry.length} entity traces)`,
  );
}

if (import.meta.main) await generateLabDataArtifacts();

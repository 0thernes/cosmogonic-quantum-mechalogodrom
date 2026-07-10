/** Fail when deterministic build/file-map generators changed a tracked source artifact. CI/release only. */

import { spawnSync } from 'node:child_process';

export const GENERATED_ARTIFACTS = [
  'src/generated/alife-svg-embed.ts',
  'bible.html',
  'lab/consciousness-data.json',
  'lab/sentience-data.json',
  'alife-gallery.js',
  'docs/FILE-MAP.md',
] as const;

export function checkGeneratedArtifacts(): number {
  const result = spawnSync('git', ['diff', '--exit-code', '--', ...GENERATED_ARTIFACTS], {
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error('generated:check failed — regenerate and commit the artifacts listed above');
    return result.status ?? 1;
  }
  console.log(`generated:check: ${GENERATED_ARTIFACTS.length} tracked artifacts are current`);
  return 0;
}

if (import.meta.main) {
  process.exitCode = checkGeneratedArtifacts();
}

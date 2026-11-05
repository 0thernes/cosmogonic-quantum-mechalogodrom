/** Fail when deterministic build/file-map generators changed a tracked source artifact. CI/release only. */

import { spawnSync } from 'node:child_process';

export const GENERATED_ARTIFACTS = [
  'src/generated/alife-svg-embed.ts',
  'docs/alife/cqm-capability-profile.html',
  'docs/alife/cqm-capability-profile.md',
  'docs/reports/assets/alife-axis-correlation.svg',
  'docs/reports/assets/alife-axis-heatmap.svg',
  'docs/reports/assets/alife-breadth-ranked.svg',
  'docs/reports/assets/alife-breadth-vs-maturity.svg',
  'docs/reports/assets/alife-capability-profile-25.svg',
  'docs/reports/assets/alife-codeground.json',
  'docs/reports/assets/alife-dendrogram.svg',
  'docs/reports/assets/alife-distance-matrix.svg',
  'docs/reports/assets/alife-entropy.svg',
  'docs/reports/assets/alife-geometry.json',
  'docs/reports/assets/alife-landscape-index.html',
  'docs/reports/assets/alife-nearest-neighbors.svg',
  'docs/reports/assets/alife-pareto.svg',
  'docs/reports/assets/alife-pca.svg',
  'docs/reports/assets/alife-radar-profile.svg',
  'docs/reports/assets/alife-stats.json',
  'docs.html',
  'specs.html',
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

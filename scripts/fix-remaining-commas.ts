/**
 * Fix remaining double commas in test files.
 */

import { readFileSync, writeFileSync } from 'fs';

const files = [
  'tests/atmosphere.test.ts',
  'tests/behaviors.test.ts',
  'tests/collision-bounce.test.ts',
  'tests/connectome.test.ts',
  'tests/determinism.test.ts',
  'tests/dome-feeding.test.ts',
  'tests/entities-death.test.ts',
  'tests/entities-dynamism.test.ts',
  'tests/entity-heredity.test.ts',
  'tests/entity-metabolic-luminance.test.ts',
  'tests/entity-vitals.test.ts',
  'tests/entity-vitals.test.ts',
  'tests/entity-vitals.test.ts',
  'tests/environment.test.ts',
  'tests/feature-determinism.test.ts',
  'tests/graph-mind.test.ts',
  'tests/qcircuit.test.ts',
  'tests/quantum-cloud.test.ts',
  'tests/reaction-diffusion.test.ts',
  'tests/shoggoths.test.ts',
  'tests/singularities.test.ts',
  'tests/super-hunt.test.ts',
  'tests/titans.test.ts',
  'tests/portal-death.test.ts',
  'tests/portal-death.test.ts',
  'tests/puppet-masters.test.ts',
  'tests/analytics.test.ts',
];

for (const file of files) {
  try {
    let content = readFileSync(file, 'utf-8');
    const original = content;

    // Fix double commas: starCount: N,, quantization:
    content = content.replace(
      /starCount:\s*(\d+),,\s*quantization:/g,
      'starCount: $1,\n      quantization:',
    );

    // Fix malformed quality object starts: quality: {tier:
    content = content.replace(/quality:\s*\{tier:/g, 'quality: {\n      tier:');

    // Fix malformed quality object ends: quantization: getQuantizationConfig(...),},
    content = content.replace(
      /quantization:\s*getQuantizationConfig\([^)]+\),\s*\},\s*(rng|grid)/g,
      'quantization: getQuantizationConfig($1),\n    $2',
    );

    // Remove "as any" from getQuantizationConfig calls
    content = content.replace(
      /getQuantizationConfig\([^)]+\)\s+as\s+any/g,
      'getQuantizationConfig($1)',
    );

    if (content !== original) {
      writeFileSync(file, content, 'utf-8');
      console.log(`Fixed: ${file}`);
    }
  } catch (error) {
    console.error(`Error fixing ${file}:`, error);
  }
}

console.log('Done fixing remaining commas');

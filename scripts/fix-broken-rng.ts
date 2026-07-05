/**
 * Fix broken rng property names that were corrupted by the previous script.
 */

import { readFileSync, writeFileSync } from 'fs';

const files = [
  'tests/entity-vitals2.test.ts',
  'tests/entity-vitals3.test.ts',
  'tests/environment.test.ts',
  'tests/feature-determinism.test.ts',
  'tests/graph-mind.test.ts',
  'tests/portal-death-fauna.test.ts',
  'tests/portal-death.test.ts',
  'tests/puppet-masters.test.ts',
  'tests/qcircuit.test.ts',
  'tests/quantum-cloud.test.ts',
  'tests/reaction-diffusion.test.ts',
  'tests/shoggoths.test.ts',
  'tests/singularities.test.ts',
  'tests/super-hunt.test.ts',
  'tests/titans.test.ts',
  'tests/viz3d.test.ts',
];

for (const file of files) {
  try {
    let content = readFileSync(file, 'utf-8');
    const original = content;

    // Fix broken rng property names like $2, $3, etc.
    content = content.replace(/\$\d+:\s*mulberry32/g, 'rng: mulberry32');

    // Fix broken quality object structure
    content = content.replace(
      /quantization:\s*getQuantizationConfig\([^)]+\),\s*\}/g,
      'quantization: getQuantizationConfig($1),\n    }',
    );

    if (content !== original) {
      writeFileSync(file, content, 'utf-8');
      console.log(`Fixed: ${file}`);
    }
  } catch (error) {
    console.error(`Error fixing ${file}:`, error);
  }
}

console.log('Done fixing broken rng property names');

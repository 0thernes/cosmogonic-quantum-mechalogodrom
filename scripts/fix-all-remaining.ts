/**
 * Fix all remaining syntax errors in test files.
 */

import { readFileSync, writeFileSync } from 'fs';

const files = [
  'tests/entity-metabolic-luminance.test.ts',
  'tests/environment.test.ts',
  'tests/feature-determinism.test.ts',
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

    // Fix broken quality object structure: quantization: getQuantizationConfig(rng),
    content = content.replace(
      /quantization:\s*getQuantizationConfig\([^)]*\),\s*(rng|grid|morphs)/g,
      'quantization: getQuantizationConfig($1),\n    $2',
    );

    // Fix broken quality object structure with tier variable
    content = content.replace(
      /quantization:\s*getQuantizationConfig\([^)]*\),\s*\}/g,
      'quantization: getQuantizationConfig($1),\n    }',
    );

    // Fix broken quality object structure: quantization: getQuantizationConfig(tier),
    content = content.replace(
      /quantization:\s*getQuantizationConfig\([^)]*\),\s*\$(\d+)/g,
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

console.log('Done fixing all remaining syntax errors');

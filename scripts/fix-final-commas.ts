/**
 * Fix final remaining double commas in test files.
 */

import { readFileSync, writeFileSync } from 'fs';

const files = [
  'tests/spawn-budget.test.ts',
  'tests/entity-brutalism.test.ts',
  'tests/viz3d.test.ts',
  'tests/singularities-fidelity.test.ts',
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

console.log('Done fixing final commas');

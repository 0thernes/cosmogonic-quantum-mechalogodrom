/**
 * Add missing quantization property to QualityProfile objects.
 */

import { readFileSync, writeFileSync } from 'fs';

const files = [
  'tests/spawn-budget.test.ts',
  'tests/entity-brutalism.test.ts',
  'tests/singularities-fidelity.test.ts',
];

for (const file of files) {
  try {
    let content = readFileSync(file, 'utf-8');
    const original = content;

    // Add quantization property after starCount
    content = content.replace(
      /(starCount:\s*\d+,)\s*(maxLinks|shadows)/g,
      "$1\n      quantization: getQuantizationConfig('laptop'),\n      $2",
    );

    if (content !== original) {
      writeFileSync(file, content, 'utf-8');
      console.log(`Fixed: ${file}`);
    }
  } catch (error) {
    console.error(`Error fixing ${file}:`, error);
  }
}

console.log('Done adding missing quantization properties');

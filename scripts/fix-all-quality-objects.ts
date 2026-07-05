/**
 * Fix all quality object syntax errors in test files - comprehensive version.
 */

import { readFileSync, writeFileSync } from 'fs';

const files = [
  'tests/connectome.test.ts',
  'tests/determinism.test.ts',
  'tests/dome-feeding.test.ts',
  'tests/entities-death.test.ts',
  'tests/entities-dynamism.test.ts',
  'tests/entity-brutalism.test.ts',
  'tests/entity-heredity.test.ts',
  'tests/graph-mind.test.ts',
];

for (const file of files) {
  try {
    let content = readFileSync(file, 'utf-8');
    const original = content;

    // Fix quality objects that were broken by previous scripts
    // Pattern: quality: { ... quantization: getQuantizationConfig(rng), } rng: ...
    // Should be: quality: { ... quantization: getQuantizationConfig('tier'), }, rng: ...
    content = content.replace(
      /quantization:\s*getQuantizationConfig\([^)]*\),\s*\}\s*(rng|grid|morphs|geos|state|audit|sfx)/g,
      'quantization: getQuantizationConfig($1),\n    $2',
    );

    // Fix quality objects with tier variable: quantization: getQuantizationConfig(rng),
    // Should be: quantization: getQuantizationConfig('phone'),
    content = content.replace(
      /quantization:\s*getQuantizationConfig\([^)]*\),\s*\$(\d+)/g,
      'quantization: getQuantizationConfig($1),\n    }',
    );

    // Fix quality objects with tier variable but no closing brace issue
    content = content.replace(
      /quantization:\s*getQuantizationConfig\([^)]*\),\s*\}/g,
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

console.log('Done fixing all quality object syntax errors');

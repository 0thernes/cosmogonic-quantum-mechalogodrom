/**
 * Fix audit cast lines that were broken by the previous script.
 */

import { readFileSync, writeFileSync } from 'fs';

const files = [
  'tests/analytics.test.ts',
  'tests/entity-vitals.test.ts',
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

    // Fix broken audit casts: auditNoop as unknown as AuditTrail,
    content = content.replace(
      /auditNoop\s+as\s+unknown\s+as\s+AuditTrail,/g,
      'auditNoop as unknown as AuditTrail,',
    );

    // Fix broken audit casts with new AuditTrail(): new AuditTrail(),
    content = content.replace(
      /new\s+AuditTrail\(\)\s+as\s+unknown\s+as\s+AuditTrail,/g,
      'new AuditTrail() as unknown as AuditTrail,',
    );

    if (content !== original) {
      writeFileSync(file, content, 'utf-8');
      console.log(`Fixed: ${file}`);
    }
  } catch (error) {
    console.error(`Error fixing ${file}:`, error);
  }
}

console.log('Done fixing audit casts');

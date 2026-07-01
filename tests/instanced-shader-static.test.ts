/**
 * `gl_InstanceID` is a VERTEX-only GLSL built-in. Referencing it in the FRAGMENT shader fails to
 * compile AT RUNTIME (the gate cannot compile GLSL, so it ships silently) — which broke the entity
 * instanced material and turned the scene black ("screen goes total black"). This source-level seal
 * (same rationale as tests/ui-lifecycle-static.test.ts) pins the fix: the LIVING HUE DRIFT fragment
 * code must read the hoisted `vInstId` varying, never `gl_InstanceID` directly.
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(import.meta.dir, '..', 'src/sim/instanced-entities.ts'), 'utf8');

describe('instanced entity shader — gl_InstanceID hoisted to a varying', () => {
  test('the fragment hue-drift reads vInstId, not the vertex-only gl_InstanceID', () => {
    expect(src).not.toContain('float idPh = float(gl_InstanceID)');
    expect(src).toContain('float idPh = vInstId');
  });

  test('vInstId is declared varying in both stages and set from gl_InstanceID in the vertex', () => {
    expect(src).toContain('vInstId = float(gl_InstanceID)');
    expect((src.match(/varying float vInstId;/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});

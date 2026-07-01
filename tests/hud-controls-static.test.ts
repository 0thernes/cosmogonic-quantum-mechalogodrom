/**
 * Owner directive #4 — the PAUSE button (freeze the sim to roam/inspect) and the PANELS launcher
 * must exist in the always-visible dock and stay wired to the real actions. The PAUSE button was
 * silently relocated out of the dock once before and the owner lost it; these source-level seals
 * (Bun's test runtime has no DOM here — same rationale as tests/ui-lifecycle-static.test.ts) make
 * that regression fail the gate instead of shipping.
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const src = (p: string): string => readFileSync(resolve(root, p), 'utf8');

describe('HUD control buttons (owner directive #4)', () => {
  test('the persistent dock renders a PAUSE button dispatched to the pause action', () => {
    const code = src('src/ui/center-hud.ts');
    expect(code).toContain('⏸ PAUSE');
    // Dispatched via [data-action="pause"] (mkAct sets dataset.action) → InputSystem → togglePause.
    expect(code).toMatch(/mkAct\(\s*['"]⏸ PAUSE['"][\s\S]*?['"]pause['"]/);
  });

  test('the persistent dock renders a PANELS launcher next to ACCESS', () => {
    const code = src('src/ui/center-hud.ts');
    expect(code).toContain('⊞ PANELS');
    // It lives in the docs/access row (rowDocs), i.e. adjacent to the ⛓ ACCESS button.
    const rowDocsStart = code.indexOf('const rowDocs =');
    const accessIdx = code.indexOf('⛓ ACCESS', rowDocsStart);
    const panelsIdx = code.indexOf('⊞ PANELS', rowDocsStart);
    expect(accessIdx).toBeGreaterThan(-1);
    expect(panelsIdx).toBeGreaterThan(accessIdx);
  });

  test('the [data-action] dispatch table maps pause → togglePause and time → cycleTimeScale', () => {
    const code = src('src/ui/input.ts');
    expect(code).toMatch(/pause:\s*['"]togglePause['"]/);
    expect(code).toMatch(/time:\s*['"]cycleTimeScale['"]/);
  });
});

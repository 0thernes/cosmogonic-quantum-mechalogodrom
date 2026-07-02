/**
 * GOAL6 UI LIVENESS seals (V121). Bun's test runtime has no DOM, so these source-level checks pin
 * the contracts behind USER items #4/#5/#6:
 *  - the 3 BRAINS slots run an autonomous rAF render loop that EASES toward real snapshot targets
 *    (ingest/render split — never fabricates data, skips hidden tabs);
 *  - the ARCHON GODFORMS radars animate on an open-panel-only rAF loop with an activity sweep, and
 *    the archon DOM writes are skipped while the panel is closed;
 *  - the BOOT LOADER page exists with all 8 REAL metric tiles, compositor-driven animations, and
 *    main.ts feeds it staged measurements then retires it on first light;
 *  - the world dispatches brain snapshots on the faster 6f/12f cadence.
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');

function src(path: string): string {
  return readFileSync(resolve(root, path), 'utf8');
}

describe('GOAL6 — 3 Brains live visualizers (USER #5)', () => {
  test('ingest/render split with an autonomous eased rAF loop', () => {
    const code = src('src/ui/brain-slots.ts');
    expect(code).toContain('function ingestSlots');
    expect(code).toContain('function renderSlot');
    expect(code).toContain('function easeShown');
    expect(code).toContain('requestAnimationFrame(loop)');
    expect(code).toContain('doc.hidden'); // hidden tabs skip drawing
    expect(code).not.toContain('Date.now()');
  });

  test('world pushes brain snapshots on the faster 6f/12f cadence', () => {
    const world = src('src/world.ts');
    expect(world).toContain('this.quality.isMobile ? 12 : 6');
    expect(world).toContain('cqm:brain-snapshots');
  });
});

describe('GOAL6 — Archon Godforms panel liveness (USER #4)', () => {
  test('radars ease toward real ingest targets on an open-panel-only rAF loop with a sweep', () => {
    const code = src('src/ui/super-panel.ts');
    expect(code).toContain('radarTargets');
    expect(code).toContain('radarShown');
    expect(code).toContain('const radarLoop');
    expect(code).toContain('!this.open || this.minimized || this.neuralOn || this.doc.hidden');
    expect(code).toContain('sweep?: number');
  });

  test('archon grid fills the panel (flex, no fixed 220px cap) and DOM writes gate on open', () => {
    const code = src('src/ui/super-panel.ts');
    expect(code).toContain('flex: 1 1 300px'); // V122: grew with the 2× taller panels
    expect(code).not.toContain('max-height: 220px');
    expect(code).toContain('this.open &&\n      !this.minimized &&\n      this.archonRows.length');
  });
});

describe('GOAL6 — boot loading page (USER #6)', () => {
  test('index.html carries the overlay with all 8 real metric tiles', () => {
    const html = src('index.html');
    expect(html).toContain('id="cqm-boot"');
    for (const tile of [
      'shell',
      'quality',
      'engine',
      'seed',
      'world',
      'entities',
      'pantheon',
      'firstlight',
    ]) {
      expect(html).toContain(`data-boot="${tile}"`);
    }
    // Compositor-driven keyframes (transform/opacity) so the page animates through the world block.
    expect(html).toContain('cqm-boot-spin');
    expect(html).toContain('prefers-reduced-motion');
  });

  test('main.ts stages the boot with real timings and retires the page on first light', () => {
    const main = src('src/main.ts');
    expect(main).toContain("bootStage('engine'");
    expect(main).toContain("bootStage('world'");
    expect(main).toContain("bootStage('firstlight'");
    expect(main).toContain('await bootPaint()');
    expect(main).toContain('bootDone()');
    expect(main).toContain('bootAbort()'); // the WebGL recovery card never sits under the overlay
  });
});

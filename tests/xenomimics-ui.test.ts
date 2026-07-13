/**
 * GATE-XENOMIMIC-UI — seals the slice-2 wiring that surfaces the xenomimic ground fauna to the player:
 * the XNO spawn button, the ◈ XENOMIMIC focus button, and the "Xenomimics" telemetry row below Entities.
 * The substrate ({@link ../src/sim/xenomimics}) is owned by another lane; here we pin (a) the new public
 * `spawnAt` entry point the XNO button drives, and (b) the full DOM→input→UiAction→world→panel chain as
 * source-level seals (Bun has no DOM), so a regression that unhooks any link fails the gate.
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { XenomimicPopulation, XENOMIMIC_MAX } from '../src/sim/xenomimics';

const root = resolve(import.meta.dir, '..');
const src = (p: string): string => readFileSync(resolve(root, p), 'utf8');

describe('GATE-XENOMIMIC-UI: spawnAt entry point (the XNO button)', () => {
  test('spawnAt adds exactly one entangled pair (2 creatures) and grows the population', () => {
    const pop = new XenomimicPopulation(1234);
    const before = pop.population();
    const added = pop.spawnAt(20, -35);
    expect(added).toBe(2);
    expect(pop.population()).toBe(before + 2);
    expect(pop.pairCount()).toBeGreaterThanOrEqual(2);
  });

  test('spawnAt is deterministic under a fixed seed', () => {
    const a = new XenomimicPopulation(77);
    const b = new XenomimicPopulation(77);
    expect(a.spawnAt(10, 10)).toBe(b.spawnAt(10, 10));
    expect(a.population()).toBe(b.population());
  });

  test('spawnAt places the new pair AT the requested point (world.launchXenoBeing passes the camera XZ)', () => {
    const pop = new XenomimicPopulation(9);
    const before = pop.pairCount();
    pop.spawnAt(60, -40);
    expect(pop.pairCount()).toBe(before + 1);
    // Exactly the two fresh twins land beside the requested point (a small bonded twin offset).
    let near = 0;
    pop.forEach((c) => {
      if (Math.hypot(c.x - 60, c.z + 40) < 12) near++;
    });
    expect(near).toBe(2);
  });

  test('the population never exceeds the hard cap', () => {
    const pop = new XenomimicPopulation(3);
    for (let i = 0; i < 800; i++) pop.spawnAt(0, 0); // hammer the spawn button past capacity
    expect(pop.population()).toBeLessThanOrEqual(XENOMIMIC_MAX);
    expect(pop.spawnAt(0, 0)).toBe(0); // at cap → adds nothing
  });
});

describe('GATE-XENOMIMIC-UI: DOM → input → UiAction → world → panel chain is fully wired', () => {
  test('index.html carries the XNO spawn button and the Xenomimics telemetry span', () => {
    const html = src('index.html');
    expect(html).toContain('data-action="xno"');
    expect(html).toContain('id="xno"');
    // The telemetry row sits just below the Entities row (its #v0 span precedes #xno in source order).
    expect(html.indexOf('id="v0"')).toBeLessThan(html.indexOf('id="xno"'));
  });

  test('input.ts maps the xno + focusXenomimics toolbar actions to their UiActions', () => {
    const code = src('src/ui/input.ts');
    expect(code).toContain("xno: 'launchXeno'");
    expect(code).toContain("focusXenomimics: 'focusXenomimics'");
  });

  test('types.ts declares the launchXeno + focusXenomimics UiActions and the xenomimics telemetry field', () => {
    const code = src('src/types.ts');
    expect(code).toContain('launchXeno(): number;');
    expect(code).toContain('focusXenomimics(): void;');
    expect(code).toContain('xenomimics: number;');
  });

  test('world.ts implements the spawn + focus methods and publishes the live tally', () => {
    const code = src('src/world.ts');
    expect(code).toContain('launchXenoBeing()');
    expect(code).toContain('focusXenomimics()');
    expect(code).toContain('spawnAt(cam.position.x, cam.position.z)');
    expect(code).toContain('sn.xenomimics = this.xenomimics.population()');
  });

  test('center-hud registers the ◈ XENOMIMIC focus button and panels.ts writes the tally', () => {
    expect(src('src/ui/center-hud.ts')).toContain("'focusXenomimics'");
    expect(src('src/ui/panels.ts')).toContain("mustGet('xno')");
    expect(src('src/ui/panels.ts')).toContain('s.xenomimics');
  });
});

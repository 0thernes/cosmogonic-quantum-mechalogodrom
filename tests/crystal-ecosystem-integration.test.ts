import { describe, expect, test } from 'bun:test';

const WORLD = await Bun.file(new URL('../src/world.ts', import.meta.url)).text();
const TYPES = await Bun.file(new URL('../src/types.ts', import.meta.url)).text();
const INPUT = await Bun.file(new URL('../src/ui/input.ts', import.meta.url)).text();
const HUD = await Bun.file(new URL('../src/ui/center-hud.ts', import.meta.url)).text();

function methodBody(signature: string): string {
  const start = WORLD.indexOf(signature);
  const end = WORLD.indexOf('\n  /**', start + signature.length);
  expect(start, signature).toBeGreaterThanOrEqual(0);
  expect(end, signature).toBeGreaterThan(start);
  return WORLD.slice(start, end);
}

describe('Crystal ecosystem World lifecycle wiring', () => {
  test('builds after GOD and derives equal skyline height from shared terrain', () => {
    const godAt = WORLD.indexOf('this.godColossus = new GodColossus');
    const ecosystemAt = WORLD.indexOf('this.crystalEcosystem = new CrystalEcosystem');
    expect(godAt).toBeGreaterThanOrEqual(0);
    expect(ecosystemAt).toBeGreaterThan(godAt);
    const construction = WORLD.slice(godAt, ecosystemAt + 500);
    expect(construction).toContain(
      'baseTerrainHeightAt(CRYSTAL_TREE_ORIGIN_X, CRYSTAL_TREE_ORIGIN_Z)',
    );
    expect(construction).toContain('this.godColossus.center.y + this.godColossus.viewRadius');
    expect(construction).toContain('(godTop - crystalBase) / 1.02');
  });

  test('running and suspended paths drive it, while frozen mode advances nothing', () => {
    const runningStart = WORLD.indexOf('  step(rawDt: number): void');
    const frozenStart = WORLD.indexOf('  private stepFrozen');
    const suspendedStart = WORLD.indexOf('  private stepSuspended');
    expect(runningStart).toBeGreaterThanOrEqual(0);
    expect(frozenStart).toBeGreaterThan(runningStart);
    expect(suspendedStart).toBeGreaterThan(frozenStart);
    const running = WORLD.slice(runningStart, frozenStart);
    const frozen = WORLD.slice(frozenStart, suspendedStart);
    const suspended = methodBody('  private stepSuspended');
    expect(running).toContain('this.updateCrystalEcosystem(dt, uiDt, t, false);');
    expect(suspended).toContain('this.updateCrystalEcosystem(0, uiDt, vt, true);');
    expect(frozen).not.toContain('updateCrystalEcosystem');
  });

  test('maps live weather/terrain into one reused frame and updates the planted root', () => {
    const body = methodBody('  private updateCrystalEcosystem');
    expect(body).toContain('this.crystalEcosystem.setRootHeight(');
    expect(body).toContain('terrainDisplacementAt(');
    for (const assignment of [
      'frame.dt = dt',
      'frame.visualDt = visualDt',
      'frame.time = time',
      'frame.chaos = chaos',
      'frame.entropy = entropy',
      'frame.windX = s.wind.x',
      'frame.windZ = s.wind.z',
      'frame.weather =',
      'frame.visualOnly = visualOnly',
    ]) {
      expect(body).toContain(assignment);
    }
    expect(body).toContain('this.crystalEcosystem.update(frame);');
  });

  test('tree view, focus action, and lifecycle disposal are all reachable', () => {
    expect(WORLD).toContain("} else if (mode === 'tree') {");
    expect(WORLD).toContain('private focusEcosystem(): void');
    expect(WORLD).toContain('focusEcosystem: () => this.focusEcosystem()');
    expect(WORLD).toContain('this.crystalEcosystem.dispose()');

    expect(TYPES).toContain('focusEcosystem(): void;');
    expect(INPUT).toContain("focusEcosystem: 'focusEcosystem'");
    expect(HUD).toContain("'♧ LIFE TREE'");
  });
});

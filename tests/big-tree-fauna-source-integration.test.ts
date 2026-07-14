import { describe, expect, test } from 'bun:test';

const FILES = [
  ['shoggoths.ts', 'ShoggothSystem', 'shoggoth'],
  ['titans.ts', 'TitanSystem', 'titan'],
  ['leviathans.ts', 'LeviathanSystem', 'leviathan'],
  ['puppet-masters.ts', 'PuppetMasterSystem', 'puppet'],
  ['super-body.ts', 'SuperBodySystem', 'apex'],
] as const;

describe('Big Tree production fauna sources', () => {
  test.each(FILES)(
    '%s exposes the canonical lifecycle and nutrition contract',
    async (file, name, kind) => {
      const source = await Bun.file(new URL(`../src/sim/${file}`, import.meta.url)).text();
      expect(source).toMatch(new RegExp(`class ${name} implements [^{]*BigTreeActorSource`));
      expect(source).toContain('get bigTreeActorCount()');
      expect(source).toContain('readBigTreeActor(');
      expect(source).toContain('writeBigTreeActor(');
      expect(source).toContain('nourishBigTreeActor(');
      expect(source).toContain('setBigTreeActorControlled(');
      expect(source).toContain(`out.category = '${kind}'`);
      expect(source).toContain('out.moveSpeed =');
      expect(source).toMatch(/bigTreeControlled\s*=\s*false/);
    },
  );

  test('native hostile or autonomous intent yields while the canonical visitor owns locomotion', async () => {
    const shoggoths = await Bun.file(new URL('../src/sim/shoggoths.ts', import.meta.url)).text();
    const titans = await Bun.file(new URL('../src/sim/titans.ts', import.meta.url)).text();
    const puppets = await Bun.file(new URL('../src/sim/puppet-masters.ts', import.meta.url)).text();
    const leviathans = await Bun.file(new URL('../src/sim/leviathans.ts', import.meta.url)).text();
    const apex = await Bun.file(new URL('../src/sim/super-body.ts', import.meta.url)).text();
    const hunt = await Bun.file(new URL('../src/sim/super-hunt.ts', import.meta.url)).text();

    expect(shoggoths).toContain('if (!sg.bigTreeControlled)');
    expect(shoggoths).toContain('sg.bigTreeControlled || this.sanctuary?.');
    expect(titans).toContain('if (!ti.bigTreeControlled)');
    expect(titans).toContain('return titan.bigTreeControlled || this.isProtectedAt');
    expect(puppets).toContain('if (pm.bigTreeControlled)');
    expect(puppets).toContain('return pm.bigTreeControlled || this.isProtectedAt');
    expect(leviathans).toContain('if (!lv.bigTreeControlled)');
    expect(apex).toContain('if (this.bigTreeControlled)');
    expect(apex).toContain('if (this.disposed || this.bigTreeControlled) return;');
    expect(hunt).toContain('isBigTreeActorControlled()');
  });

  test('portal and teardown paths release visitor ownership instead of retaining stale controls', async () => {
    for (const [file] of FILES) {
      const source = await Bun.file(new URL(`../src/sim/${file}`, import.meta.url)).text();
      expect(source).toMatch(/bigTreeControlled\s*=\s*false/);
    }
    const world = await Bun.file(new URL('../src/world.ts', import.meta.url)).text();
    const dispose = world.indexOf('  dispose(): void {');
    const faunaReset = world.indexOf('this.bigTreeFaunaVisitors.reset();', dispose);
    const shoggothDispose = world.indexOf('this.shoggoths.dispose();', dispose);
    expect(faunaReset).toBeGreaterThan(dispose);
    expect(shoggothDispose).toBeGreaterThan(faunaReset);
  });
});

import { describe, expect, test } from 'bun:test';

// Migration split (2026-07-14): shoggoths/titans/puppeteers speak the narrow
// BigTreeFaunaSource visitor bridge; leviathans and the apex still speak the
// original BigTreeActorSource ownership contract. Both halves stay sealed.
const ACTOR_SOURCE_FILES = [
  ['leviathans.ts', 'LeviathanSystem', 'leviathan'],
  ['super-body.ts', 'SuperBodySystem', 'apex'],
] as const;

const FAUNA_SOURCE_FILES = [
  ['shoggoths.ts', 'ShoggothSystem'],
  ['titans.ts', 'TitanSystem'],
  ['puppet-masters.ts', 'PuppetMasterSystem'],
] as const;

describe('Big Tree production fauna sources', () => {
  test.each(ACTOR_SOURCE_FILES)(
    '%s exposes the canonical lifecycle and nutrition contract',
    async (file, name, kind) => {
      const raw = await Bun.file(new URL(`../src/sim/${file}`, import.meta.url)).text();
      // Whitespace-normalized so prettier wrapping of the implements clause cannot break the seal.
      const source = raw.replace(/\s+/g, ' ');
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

  test.each(FAUNA_SOURCE_FILES)(
    '%s exposes the narrow visitor bridge contract',
    async (file, name) => {
      const raw = await Bun.file(new URL(`../src/sim/${file}`, import.meta.url)).text();
      const source = raw.replace(/\s+/g, ' ');
      expect(source).toMatch(new RegExp(`class ${name} implements [^{]*BigTreeFaunaSource`));
      expect(source).toContain('bigTreeVisitorSlotCount');
      expect(source).toContain('readBigTreeVisitor(');
      expect(source).toContain('setBigTreeVisitorIntent(');
      expect(source).toContain('nourishBigTreeVisitor(');
      expect(source).toContain('clearBigTreeVisitorIntent(');
      // Release restores the Normal intent mode (the migrated ownership vocabulary).
      expect(source).toContain('= BigTreeFaunaIntentMode.Normal;');
    },
  );

  test('native hostile or autonomous intent yields while the canonical visitor owns locomotion', async () => {
    const shoggoths = await Bun.file(new URL('../src/sim/shoggoths.ts', import.meta.url)).text();
    const titans = await Bun.file(new URL('../src/sim/titans.ts', import.meta.url)).text();
    const puppets = await Bun.file(new URL('../src/sim/puppet-masters.ts', import.meta.url)).text();
    const leviathans = await Bun.file(new URL('../src/sim/leviathans.ts', import.meta.url)).text();
    const apex = await Bun.file(new URL('../src/sim/super-body.ts', import.meta.url)).text();
    const hunt = await Bun.file(new URL('../src/sim/super-hunt.ts', import.meta.url)).text();

    // Migrated systems yield native intent whenever the visitor coordinator holds a non-Normal
    // intent mode; leviathans and the apex still yield through the bigTreeControlled flag.
    expect(shoggoths).toContain('if (visitMode === BigTreeFaunaIntentMode.Normal) {');
    expect(shoggoths).toContain('visitMode !== BigTreeFaunaIntentMode.Normal || memberProtected');
    expect(titans).toContain('BigTreeFaunaIntentMode.Normal');
    expect(puppets).toContain('if (visitMode === BigTreeFaunaIntentMode.Normal) {');
    expect(leviathans).toContain('if (!lv.bigTreeControlled)');
    expect(apex).toContain('if (this.bigTreeControlled)');
    expect(apex).toContain('if (this.disposed || this.bigTreeControlled) return;');
    expect(hunt).toContain('isBigTreeActorControlled()');
  });

  test('portal and teardown paths release visitor ownership instead of retaining stale controls', async () => {
    for (const [file] of ACTOR_SOURCE_FILES) {
      const source = await Bun.file(new URL(`../src/sim/${file}`, import.meta.url)).text();
      expect(source).toMatch(/bigTreeControlled\s*=\s*false/);
    }
    for (const [file] of FAUNA_SOURCE_FILES) {
      const source = await Bun.file(new URL(`../src/sim/${file}`, import.meta.url)).text();
      expect(source).toContain('= BigTreeFaunaIntentMode.Normal;');
    }
    const world = await Bun.file(new URL('../src/world.ts', import.meta.url)).text();
    const dispose = world.indexOf('  dispose(): void {');
    const faunaReset = world.indexOf('this.bigTreeFaunaVisitors.reset();', dispose);
    const shoggothDispose = world.indexOf('this.shoggoths.dispose();', dispose);
    expect(faunaReset).toBeGreaterThan(dispose);
    expect(shoggothDispose).toBeGreaterThan(faunaReset);
  });
});

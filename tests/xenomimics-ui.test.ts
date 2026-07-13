/** Consolidation seals for the one canonical Xenomimic UI/ecology/audio path. */
import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { XENOMIMIC_MAX, XenomimicPopulation } from '../src/sim/xenomimics';

const root = resolve(import.meta.dir, '..');
const src = (path: string): string => readFileSync(resolve(root, path), 'utf8');

describe('GATE-XENOMIMIC-UI: XNO exact-one contract', () => {
  test('each activation adds one body and consecutive presses retain shared-brain pairing', () => {
    const population = new XenomimicPopulation(1234);
    const beforeBodies = population.population();
    const beforePairs = population.pairCount();
    expect(population.spawnAt(20, -35)).toBe(1);
    expect(population.population()).toBe(beforeBodies + 1);
    expect(population.pairCount()).toBe(beforePairs + 1);
    expect(population.spawnAt(21, -34)).toBe(1);
    expect(population.population()).toBe(beforeBodies + 2);
    expect(population.pairCount()).toBe(beforePairs + 1);
  });

  test('the hard cap is absolute', () => {
    const population = new XenomimicPopulation(3);
    for (let i = 0; i < XENOMIMIC_MAX + 32; i++) population.spawnAt(0, 0);
    expect(population.population()).toBe(XENOMIMIC_MAX);
    expect(population.spawnAt(0, 0)).toBe(0);
  });
});

describe('GATE-XENOMIMIC-UI: one DOM to World chain', () => {
  test('the shell, input, action interface, world, telemetry, and center dock use one name', () => {
    const html = src('index.html');
    const input = src('src/ui/input.ts');
    const types = src('src/types.ts');
    const world = src('src/world.ts');
    const centerHud = src('src/ui/center-hud.ts');
    const panels = src('src/ui/panels.ts');
    expect(html).toContain('data-action="xno"');
    expect(html).toContain('id="xenomimic-count"');
    expect(input).toContain("xno: 'launchXenomimic'");
    expect((input.match(/xno:/g) ?? []).length).toBe(1);
    expect(types).toContain('launchXenomimic(): number;');
    expect(types).not.toContain('launchXeno(): number;');
    expect(world).toContain('private launchXenomimic(): number');
    expect(world).toContain('return this.launchXenomimic()');
    expect(centerHud).toContain("toggle: 'cqm-xenomimic-toggle'");
    expect(centerHud).toContain("panel: 'cqm-xenomimic-panel'");
    expect(panels).toContain("document.getElementById('xenomimic-count')");
  });

  test('there is one lifecycle-owned inspector module, not two self-mounting panels', () => {
    const world = src('src/world.ts');
    expect(existsSync(resolve(root, 'src/ui/xeno-panel.ts'))).toBe(false);
    expect(world).toContain("from './ui/xenomimic-panel'");
    expect((world.match(/new XenomimicPanel\(/g) ?? []).length).toBe(1);
    expect(world).toContain('this.xenomimicPanel.update(this.syncXenomimicPanelData())');
    expect(world).toContain('this.xenomimicPanel.dispose()');
  });
});

describe('GATE-XENOMIMIC-COUPLING: bounded causal ecology', () => {
  test('World uses real flora, terrain, sampled Entity activation, and bounded nearest predation', () => {
    const world = src('src/world.ts');
    expect(world).toContain('grazeAt: this.xenomimicGrazeAt');
    expect(world).toContain('surfaceAt: this.xenomimicSurfaceAt');
    expect(world).toContain('entityActivation = Math.max(');
    expect(world).toContain('this.xenomimics.consumeNearest(');
    expect(world).toContain('entity.userData.energy = Math.min(100');
    expect(world).not.toContain('runXenomimicPredation');
  });

  test('one bounded audio field carries FEP, tension, environment, and strict pause silence', () => {
    const engine = src('src/audio/engine.ts');
    const world = src('src/world.ts');
    expect(engine).toContain('new XenomimicAudioBus(');
    expect((engine.match(/new XenomimicAudioBus\(/g) ?? []).length).toBe(1);
    expect(engine).not.toContain('buildXenoBus');
    expect(engine).not.toContain('setXenoTonality');
    expect(world).toContain('audio.predictionError = telemetry.freeEnergy');
    expect(world).toContain('this.audio.setXenomimicField(audio)');
  });
});

describe('GATE-XENOMIMIC-DOCS: the swarm is documented across the player-facing surfaces (slice 3b/1)', () => {
  test('README, in-app Help, the technical spec, the SPEC page and the CHANGELOG all describe the Xenomimics', () => {
    // README front-door feature bullet.
    expect(src('README.md')).toMatch(/\*\*(?:Canonical )?Xenomimics\*\*/);
    // ❓ HELP ME NOW knowledge base entry (also indexed by the ✦ Copilot, which reads docs + KB).
    const help = src('src/ui/help-knowledge.ts');
    expect(help).toContain("id: 'xenomimics'");
    expect(help).toContain('ENTANGLED TWINS');
    // Technical specification architecture section.
    expect(src('docs/TECHNICAL-SPECIFICATION-2026-06-26.md')).toContain('Xenomimics');
    // Public SPEC page roster.
    expect(src('specs.html')).toContain('Xenomimics');
    // CHANGELOG [Unreleased] — the version surface on GitHub.
    expect(src('CHANGELOG.md')).toContain('Xenomimics');
  });

  test('the Observatory surfaces the live xenomimic tally in its accessible summary', () => {
    const obs = src('src/ui/observatory.ts');
    // The snapshot carries the field and the screen-reader summary line reads it.
    expect(obs).toContain('xenomimics?: number');
    expect(obs).toContain('const xenomimicSummary = hasXenomimic');
    expect(obs).toContain('${Math.round(this.xenomimicLivingLatest)} Xenomimics');
    // world.snapshot() already populates it (slice 2a) and pushes the same object to the Observatory.
    expect(src('src/world.ts')).toContain('sn.xenomimics = xenomimic.population');
    expect(src('src/world.ts')).toContain('this.observatory.push(this.snapshot())');
  });
});

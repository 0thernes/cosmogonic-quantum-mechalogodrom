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
import type { Xenomimic } from '../src/sim/xenomimics';

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

describe('GATE-XENOMIMIC-UI: the ◈ XENOMIMIC data window (slice 2b) reuses the Archon box template', () => {
  test('xeno-panel.ts self-mounts a dock toggle + a fixed window box built on the shared panel shell', () => {
    const code = src('src/ui/xeno-panel.ts');
    // Same mounting contract as the ⬢ ARCHITECT panel: shared base CSS + the bottom-dock toggle.
    expect(code).toContain("import { mountToggle } from './panel-dock'");
    expect(code).toContain("import { injectPanelBaseCSS } from './panel-shell'");
    expect(code).toContain("id = 'cqm-xno-toggle'");
    expect(code).toContain('#cqm-xno-panel');
    // The window-box geometry is cloned UNCHANGED from super-panel (owner: "do not change the wireframing
    // or ui/ux spacing/padding of the window box") — pin the load-bearing paddings + the bar grid.
    expect(code).toContain('padding:7px 10px'); // header padding, verbatim from the Archon box
    expect(code).toContain('grid-template-columns:72px 1fr 42px'); // bar row grid, verbatim
  });

  test('the panel surfaces all 10 species and reads the four coupled consciousness-theory beats', () => {
    const code = src('src/ui/xeno-panel.ts');
    // Exactly ten SpeciesDef entries (one per renderer geometry / hue).
    const hueCount = (code.match(/hue:\s*0\./g) ?? []).length;
    expect(hueCount).toBe(10);
    // The beats the substrate publishes: quantum coherence, tug-of-war, IIT Φ, FEP surprise.
    expect(code).toContain('t.coherence');
    expect(code).toContain('t.bondTension');
    expect(code).toContain('t.integration');
    expect(code).toContain('t.freeEnergy');
  });

  test('the panel is a pure UI shell — it imports the telemetry TYPE, never the population class', () => {
    const code = src('src/ui/xeno-panel.ts');
    expect(code).toContain('type { XenomimicTelemetry }');
    expect(code).not.toContain('new XenomimicPopulation');
  });

  test('center-hud adds the XENOMIMIC launcher slot and hides its raw dock toggle', () => {
    const code = src('src/ui/center-hud.ts');
    expect(code).toContain("name: 'XENOMIMIC'");
    expect(code).toContain("toggle: 'cqm-xno-toggle'");
    expect(code).toContain('#cqm-dock > #cqm-xno-toggle');
  });

  test('world.ts constructs, feeds, and disposes the XenoPanel on the shared cadence', () => {
    const code = src('src/world.ts');
    expect(code).toContain("import { XenoPanel } from './ui/xeno-panel'");
    expect(code).toContain('new XenoPanel()');
    expect(code).toContain('const xtel = this.xenomimics.telemetry()');
    expect(code).toContain('this.xenoPanel.update(xtel)');
    expect(code).toContain('this.xenoPanel.dispose()');
  });
});

describe('GATE-XENOMIMIC-COUPLING: predation (5s respawn) + entity-connectome neural linkage (slice 2c)', () => {
  test('consume() — a being grazing a ground creature drops it now and yields energy to graze', () => {
    const pop = new XenomimicPopulation(2024);
    // Grow a few pairs so there is a live creature to graze.
    for (let i = 0; i < 5; i++) pop.spawnAt(i * 4, i * 4);
    const before = pop.population();
    let victim: Xenomimic | null = null;
    pop.forEach((c) => {
      if (!victim) victim = c;
    });
    expect(victim).not.toBeNull();
    const yield_ = pop.consume(victim!);
    expect(yield_).toBeGreaterThan(0); // grazing returns food energy
    expect(pop.population()).toBe(before - 1); // the creature is down immediately
    expect(pop.telemetry().eaten).toBeGreaterThanOrEqual(1); // and the counter ticks
  });

  test('consume() on an already-down creature is a no-op (idempotent, yields nothing)', () => {
    const pop = new XenomimicPopulation(2025);
    pop.spawnAt(0, 0);
    let victim: Xenomimic | null = null;
    pop.forEach((c) => {
      if (!victim) victim = c;
    });
    pop.consume(victim!);
    const afterFirst = pop.population();
    expect(pop.consume(victim!)).toBe(0);
    expect(pop.population()).toBe(afterFirst); // no double-kill
  });

  test('the substrate threads `chaos` into the twin brain sense vector (the link is a real input)', () => {
    // The world drives `chaos` from the entity connectome's firing density; prove the substrate actually
    // SENSES it (not a decorative pass-through) — chaos must reach the 6-input sense vector.
    const code = src('src/sim/xenomimics.ts');
    expect(code).toContain('chaos');
    // senses() returns [food, crowding, threat, chaos, twinDist, energy] — chaos is a brain input.
    expect(code).toMatch(/\[\s*food\s*,\s*crowding\s*,\s*threat\s*,\s*chaos/);
  });

  test('world.ts couples the entity connectome to the swarm and grazes it via the entity grid', () => {
    const code = src('src/world.ts');
    // Neural linkage: connectome firing density → the swarm's `chaos` sense.
    expect(code).toContain('this.connectome.links / Math.max(1, this.connectome.pairCount * 8)');
    expect(code).toMatch(/chaos:\s*clamp\(/);
    // Predation: fresh entity grid → consume overlapping ground creatures, bounded per tick.
    expect(code).toContain('runXenomimicPredation');
    expect(code).toContain('this.xenomimics.consume(c)');
    expect(code).toContain('this.grid.query(c.x, c.z, R)');
  });
});

describe('GATE-XENOMIMIC-AUDIO: the eerie entangled-twin tonality bus (slice 3)', () => {
  test('engine.ts builds a dedicated twin-oscillator xeno bus and a clamped setXenoTonality driver', () => {
    const code = src('src/audio/engine.ts');
    // A dedicated bus (silent at rest) with the two entangled-twin oscillators + shimmer wash.
    expect(code).toContain('buildXenoBus');
    expect(code).toContain('twinA');
    expect(code).toContain('twinB');
    expect(code).toContain('setXenoTonality');
    // The driver clamps its inputs and drives the twin detune SPREAD from the tug-of-war dissonance.
    expect(code).toMatch(/const d = Math\.max\(0, Math\.min\(1, dissonance\)\)/);
    expect(code).toContain('b.twinA.detune.setTargetAtTime(-spread');
    // It is silent when the ground is empty (presence 0 → gain 0).
    expect(code).toContain('p > 0.02 ?');
    // …and it is torn down with the other oscillators.
    expect(code).toContain('xeno.twinA?.stop()');
  });

  test('world.ts drives the tonality from the swarm telemetry on the shared cadence', () => {
    const code = src('src/world.ts');
    expect(code).toMatch(
      /this\.audio\.setXenoTonality\(\s*xtel\.population \/ XENOMIMIC_MAX,\s*xtel\.freeEnergy,\s*xtel\.bondTension/,
    );
  });
});

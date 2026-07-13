/**
 * Seals for the XENOMIMIC overhaul: XNO births a visible TWIN PAIR, the inspector is a live cockpit
 * (swarm map + animated radar + species/population/lifecycle), and the swarm reacts to weather + waste.
 * These are behavioural + source seals over the one canonical path — no second panel, no overclaim.
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { XENOMIMIC_MAX, XenomimicPopulation } from '../src/sim/xenomimics';
import {
  XenomimicPanel,
  projectXenomimicIndicators,
  type XenomimicBodySample,
  type XenomimicPanelTelemetry,
} from '../src/ui/xenomimic-panel';

const root = resolve(import.meta.dir, '..');
const src = (path: string): string => readFileSync(resolve(root, path), 'utf8');

function xzDistance(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

describe('GATE-XENOMIMIC-TWINS: XNO births a visible entangled pair', () => {
  test('spawnTwinAt adds exactly two live bodies of one shared-brain pair', () => {
    const pop = new XenomimicPopulation(4242);
    const bodiesBefore = pop.population();
    const pairsBefore = pop.pairCount();
    expect(pop.spawnTwinAt(60, -40)).toBe(2);
    expect(pop.population()).toBe(bodiesBefore + 2);
    expect(pop.pairCount()).toBe(pairsBefore + 1);
    const twins = pop.bodyView().slice(-2);
    expect(twins).toHaveLength(2);
    // Same entangled pair, opposite roles (mimic 0 + anti 1).
    expect(twins[0]!.pairId).toBe(twins[1]!.pairId);
    expect(twins[0]!.role + twins[1]!.role).toBe(1);
  });

  test('the two twins are born visibly apart, not stacked into one blob', () => {
    const pop = new XenomimicPopulation(99);
    expect(pop.spawnTwinAt(0, 0, 12)).toBe(2);
    const twins = pop.bodyView().slice(-2);
    // Requested separation 12 → the halves sit ~12u apart in the ground plane.
    expect(xzDistance(twins[0]!, twins[1]!)).toBeGreaterThan(6);
  });

  test('the hard cap is respected — no twin spills past XENOMIMIC_MAX', () => {
    const pop = new XenomimicPopulation(7);
    for (let i = 0; i < XENOMIMIC_MAX + 8; i++) pop.spawnAt(i, -i);
    expect(pop.population()).toBe(XENOMIMIC_MAX);
    expect(pop.spawnTwinAt(0, 0)).toBe(0);
    expect(pop.population()).toBe(XENOMIMIC_MAX);
  });

  test('spawnTwinAt is deterministic for a given seed and call sequence', () => {
    const a = new XenomimicPopulation(2026);
    const b = new XenomimicPopulation(2026);
    a.spawnTwinAt(30, 30);
    b.spawnTwinAt(30, 30);
    const ta = a.bodyView().slice(-2);
    const tb = b.bodyView().slice(-2);
    expect(ta[0]!.x).toBeCloseTo(tb[0]!.x, 10);
    expect(ta[0]!.z).toBeCloseTo(tb[0]!.z, 10);
    expect(ta[1]!.x).toBeCloseTo(tb[1]!.x, 10);
  });
});

describe('GATE-XENOMIMIC-COCKPIT: the inspector is a live data cockpit', () => {
  const source = src('src/ui/xenomimic-panel.ts');

  test('renders a live swarm map, animated radar, and the species/population/lifecycle cells', () => {
    expect(source).toContain("el(this.doc, 'canvas', 'cqm-xenomimic-map')");
    expect(source).toContain('private drawSwarm(');
    expect(source).toContain('private drawSpecies(');
    expect(source).toContain('private drawSpark(');
    expect(source).toContain('private drawLifecycle(');
    // Animation is real (rAF) but presentation-only — never sim RNG, never a wall clock.
    expect(source).toContain('requestAnimationFrame');
    expect(source).not.toContain('Date.now()');
    expect(source).not.toContain('Math.random()');
  });

  test('the swarm map consumes an optional read-only body sample without inventing state', () => {
    expect(source).toContain('bodies?: ArrayLike<XenomimicBodySample>');
    expect(source).toContain('bodyCount?: number');
    expect(source).toContain('worldRadius?: number');
  });

  test('headless update accepts the enriched telemetry and stays bounded', () => {
    const bodies: XenomimicBodySample[] = [
      { x: 10, z: 5, species: 0, role: 0, pairId: 1, energy: 0.7 },
      { x: -8, z: 12, species: 3, role: 1, pairId: 1, energy: 0.4 },
    ];
    const telemetry: XenomimicPanelTelemetry = {
      population: 2,
      pairs: 1,
      births: 2,
      deaths: 0,
      eaten: 0,
      teleports: 0,
      meanEnergy: 0.55,
      coherence: 0.8,
      bondTension: 0.3,
      integration: 0.6,
      freeEnergy: 0.2,
      quantumSpread: 0.1,
      rngQuality: 0.99,
      speciesCounts: [1, 0, 0, 1, 0, 0, 0, 0, 0, 0],
      dominantSpecies: 0,
      growthTarget: 8,
      bodies,
      bodyCount: 2,
      worldRadius: 180,
    };
    const panel = new XenomimicPanel(undefined);
    expect(() => panel.update(telemetry)).not.toThrow();
    expect(panel.lastTelemetry()).toBe(telemetry);
    const out = projectXenomimicIndicators(telemetry, new Float32Array(10));
    for (const v of out) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(() => panel.dispose()).not.toThrow();
  });
});

describe('GATE-XENOMIMIC-REACTIVE: the swarm reads weather, waste, and streams to the cockpit', () => {
  const world = src('src/world.ts');

  test('the XNO button births a twin pair through spawnTwinAt', () => {
    expect(world).toContain('this.xenomimics.spawnTwinAt(');
    expect(world).toContain('TWIN');
    expect(world).toContain('private launchXenomimic(): number');
  });

  test('World couples the swarm to per-weather agitation and local metabolic waste', () => {
    expect(world).toContain('XENO_WEATHER_AGITATION');
    expect(world).toContain('this.wasteEcology.regrowBoost(camPos.x, camPos.z)');
    expect(world).toContain('weatherAgit');
  });

  test('World streams a live body sample and the arena extent to the cockpit only when open', () => {
    expect(world).toContain('this.xenomimicPanel.isOpen()');
    expect(world).toContain('this.xenomimics.bodyView()');
    expect(world).toContain('target.bodies = buf');
    expect(world).toContain('target.worldRadius = this.xenomimics.bounds()');
  });
});

/**
 * Xenomimic cosmetics: no physical twin tethers; RENDER + BRUTAL APIs exist and differ from entities.
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { XenomimicConnectome } from '../src/sim/xenomimic-connectome';
import { XENOMIMIC_BRUTAL_STYLES, XenomimicRenderer } from '../src/sim/xenomimics-render';
import { XenomimicPopulation } from '../src/sim/xenomimics';

describe('xenomimic twin bond is psionic (no tether lines)', () => {
  test('XenomimicConnectome never exposes visible lines', () => {
    const scene = new THREE.Scene();
    const xc = new XenomimicConnectome(scene);
    expect(xc.visible).toBe(false);
    xc.setVisible(true);
    expect(xc.visible).toBe(false);
    const lines = scene.children.filter((c) => c instanceof THREE.LineSegments);
    expect(lines.length).toBe(0);
    const sys = new XenomimicPopulation(1);
    xc.sync(sys, [], 0);
    expect(xc.linkCount).toBeGreaterThanOrEqual(0);
    xc.dispose();
  });
});

describe('xenomimic RENDER + BRUTAL skins are unique APIs', () => {
  test('brutal styles are named xeno skins not concrete/archon', () => {
    const names = XENOMIMIC_BRUTAL_STYLES.map((s) => s.name);
    expect(names).toContain('PSIONIC-VOID');
    expect(names).toContain('ICHOR-GLASS');
    expect(names).toContain('ANTIMATTER-HULL');
    expect(names.join(',')).not.toContain('BRUTALISM');
  });

  test('renderer accepts all RENDER modes and brutal styles', () => {
    const scene = new THREE.Scene();
    const r = new XenomimicRenderer(scene);
    r.setRenderMode('wire');
    r.setRenderMode('neon');
    r.setRenderMode('plasma');
    r.setRenderMode('solid');
    r.setBrutalStyle(0);
    expect(r.brutalStyleName).toBe('PSIONIC-VOID');
    r.setBrutalStyle(-1);
    expect(r.brutalStyleName).toBe('off');
    r.setMorphWave(1, 3);
    r.dispose();
  });

  test('world wires render mode + brutal to xenomimic renderer and purges tethers', () => {
    const src = readFileSync('src/world.ts', 'utf8');
    expect(src.includes('xenomimicsRender.setRenderMode')).toBe(true);
    expect(src.includes('xenomimicsRender.setBrutalStyle')).toBe(true);
    expect(src.includes('xenomimicConnectome.setVisible(false)')).toBe(true);
    expect(src.includes('private purgeOrphanXenomimicTethers()')).toBe(true);
    // Must never re-enable cosmetic tethers via NEURAL WEB.
    expect(src.includes('xenomimicConnectome.setVisible(on)')).toBe(false);
  });
});

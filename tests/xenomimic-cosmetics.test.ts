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
    const sys = new XenomimicPopulation(1);
    xc.sync(sys, [], 0);
    expect(xc.linkCount).toBeGreaterThanOrEqual(0);
    const lines: THREE.Object3D[] = [];
    scene.traverse((object) => {
      if (
        object instanceof THREE.LineSegments ||
        object instanceof THREE.LineLoop ||
        object instanceof THREE.Line
      ) {
        lines.push(object);
      }
    });
    expect(lines).toHaveLength(0);
    expect(scene.getObjectByName('XenomimicCausalConnectome')).toBeUndefined();
    xc.dispose();
  });

  test('source and cockpit contain no Xenomimic line-renderer construction path', () => {
    const connectome = readFileSync('src/sim/xenomimic-connectome.ts', 'utf8');
    const panel = readFileSync('src/ui/xenomimic-panel.ts', 'utf8');
    expect(connectome).not.toContain('new THREE.LineSegments');
    expect(connectome).not.toContain('LineBasicMaterial');
    expect(connectome).not.toContain('scene.add(');
    expect(panel).not.toContain('joined by a bond line');
    expect(panel).not.toContain('const byPair = new Map');
    expect(panel).not.toContain('ctx.moveTo(existing.x, existing.y)');
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
    // Scoped transition seal: the NEURAL WEB toggle itself must force xenomimic invisibility,
    // re-purge legacy lines, and construct no line primitive of its own — whole-file pins alone
    // cannot catch a toggle-local regression drawing xenomimic lines through another object.
    const toggleStart = src.indexOf('toggleConnectomeWeb');
    expect(toggleStart).toBeGreaterThan(0);
    const toggleBody = src.slice(toggleStart, src.indexOf('return false;', toggleStart));
    expect(toggleBody).toContain('this.xenomimicConnectome.setVisible(false)');
    expect(toggleBody).toContain('this.purgeOrphanXenomimicTethers()');
    expect(toggleBody).not.toContain('new THREE.Line');
    expect(toggleBody).not.toContain('LineSegments');
    // Owner 2026-07-14: the ENTITY axon-web lines are retired too — the key can only re-assert
    // invisibility, never draw connection lines of any kind again.
    expect(toggleBody).toContain('this.connectome.setWebVisible(false)');
    expect(toggleBody).not.toContain('setWebVisible(on)');
  });
});

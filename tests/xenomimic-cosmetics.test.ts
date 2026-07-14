/**
 * Xenomimic cosmetics: no physical twin tethers; RENDER + BRUTAL APIs exist and differ from entities.
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { XenomimicConnectome } from '../src/sim/xenomimic-connectome';
import {
  isLegacyXenomimicTetherName,
  purgeLegacyXenomimicTethers,
} from '../src/sim/xenomimic-tether-purge';
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

  test('planted legacy tether lines are removed AND their GPU resources disposed; live bodies survive', () => {
    const scene = new THREE.Scene();
    // Three legacy tethers in every line flavor — one with a material ARRAY (the branchy path).
    const cord = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial());
    cord.name = 'XenomimicCausalConnectome';
    const twin = new THREE.Line(new THREE.BufferGeometry(), [
      new THREE.LineBasicMaterial(),
      new THREE.LineBasicMaterial(),
    ]);
    twin.name = 'xeno-twin-cord';
    const loop = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial());
    loop.name = 'mimic bond link';
    // Survivors: a legit instanced xenomimic body (a MESH, same name stem) and a non-xeno line.
    const body = new THREE.InstancedMesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial(),
      4,
    );
    body.name = 'xenomimic-species-3';
    const axon = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial());
    axon.name = 'entity-axon-web';
    scene.add(cord, twin, loop, body, axon);

    let disposedGeometries = 0;
    let disposedMaterials = 0;
    for (const doomedObject of [cord, twin, loop]) {
      doomedObject.geometry.addEventListener('dispose', () => disposedGeometries++);
      const mats = Array.isArray(doomedObject.material)
        ? doomedObject.material
        : [doomedObject.material];
      for (const mat of mats) mat.addEventListener('dispose', () => disposedMaterials++);
    }

    expect(purgeLegacyXenomimicTethers(scene)).toBe(3);
    expect(scene.children).toEqual([body, axon]);
    expect(disposedGeometries).toBe(3);
    expect(disposedMaterials).toBe(4); // 1 + array of 2 + 1
    // Idempotent: a second sweep finds nothing.
    expect(purgeLegacyXenomimicTethers(scene)).toBe(0);
  });

  test('the legacy-name predicate matches every historic tether name and no live body name', () => {
    for (const doomedName of [
      'XenomimicCausalConnectome',
      'xenomimic-connectome',
      'xenoConnectome',
      'xeno-twin-cord',
      'mimic bond link',
      'XENO tether 7',
    ]) {
      expect(isLegacyXenomimicTetherName(doomedName)).toBe(true);
    }
    for (const liveName of ['', 'xenomimic-species-3', 'entity-axon-web', 'twin-cord', 'xeno']) {
      // species meshes carry the xeno stem but no tether word; non-xeno lines carry no xeno stem.
      expect(isLegacyXenomimicTetherName(liveName)).toBe(false);
    }
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
    const toggleBody = src.slice(toggleStart, src.indexOf('return on;', toggleStart));
    expect(toggleBody).toContain('this.xenomimicConnectome.setVisible(false)');
    expect(toggleBody).toContain('this.purgeOrphanXenomimicTethers()');
    expect(toggleBody).not.toContain('new THREE.Line');
    expect(toggleBody).not.toContain('LineSegments');
  });
});

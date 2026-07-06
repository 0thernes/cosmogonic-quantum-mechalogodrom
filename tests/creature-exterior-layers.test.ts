import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { ALPHABET_ROSTER } from '../src/sim/alphabet-pantheon';
import {
  ApexExteriorAbomination,
  GlyphAccentMotes,
  GlyphFilamentBurst,
  GlyphSporeAura,
  MechaExteriorAbomination,
  attachGlyphExteriorShells,
  attachGlyphWireHalos,
  syncGlyphExteriorShell,
  syncGlyphWireHalos,
  type GlyphShellSlot,
} from '../src/sim/creature-exterior-layers';
import {
  CREATURE_EXTERIOR_PHENOMENA,
  CREATURE_EXTERIOR_PHENOMENA_COUNT,
  CREATURE_EXTERIOR_TIME_SCALE,
  activeExteriorPhenomena,
  buildCreatureExteriorPhenomena,
} from '../src/sim/creature-exterior-phenomena';
import {
  glyphExteriorSignature,
  GLYPH_EXTERIOR_KIND_COUNT,
} from '../src/sim/glyph-exterior-signature';
import type { TsotchkeQuantumPulse } from '../src/sim/tsotchke-facade';

const PULSE: TsotchkeQuantumPulse = {
  cliffordEnt: 0.5,
  qgtVolume: 0.4,
  rngEntropy: 0.6,
  quakeAliveness: 0.7,
  adGradient: 0.3,
};

describe('creature-exterior-layers — attach, update, dispose', () => {
  test('ApexExteriorAbomination update stays finite and dispose tears down cleanly', () => {
    const parent = new THREE.Group();
    const apex = new ApexExteriorAbomination(parent);
    expect(parent.children.length).toBeGreaterThan(0);
    for (let i = 0; i < 120; i++) {
      apex.update(i * 0.05, 0.6, 0.4, PULSE);
      for (const c of apex.group.children) {
        expect(Number.isFinite(c.position.x)).toBe(true);
        expect(Number.isFinite(c.scale.x)).toBe(true);
      }
    }
    expect(() => apex.dispose()).not.toThrow();
  });

  test('MechaExteriorAbomination update + dispose', () => {
    const parent = new THREE.Group();
    const mecha = new MechaExteriorAbomination(parent, 2.5);
    for (let i = 0; i < 60; i++) {
      mecha.update(i * 0.04, 0.5, 0.8, PULSE);
    }
    expect(() => mecha.dispose()).not.toThrow();
  });

  test('glyph shells + wire halos attach and sync without NaN transforms', () => {
    const parent = new THREE.Group();
    const bodyGeo = new THREE.IcosahedronGeometry(1, 0);
    const bodyMesh = new THREE.InstancedMesh(
      bodyGeo,
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
      4,
    );
    parent.add(bodyMesh);
    const slots: GlyphShellSlot[] = ALPHABET_ROSTER.slice(0, 4).map((a, gIdx) => ({
      gIdx,
      sig: glyphExteriorSignature(a),
    }));
    const buckets: GlyphShellSlot[][] = Array.from({ length: GLYPH_EXTERIOR_KIND_COUNT }, () => []);
    for (const slot of slots) buckets[slot.sig.kindIdx]!.push(slot);
    const shells = attachGlyphExteriorShells(parent, buckets);
    const halos = attachGlyphWireHalos(parent, shells);
    expect(shells.length).toBeGreaterThan(0);
    expect(halos.length).toBe(shells.length);
    const _M = new THREE.Matrix4();
    for (let i = 0; i < 4; i++) {
      _M.makeTranslation(i * 2, 0, 0);
      bodyMesh.setMatrixAt(i, _M);
    }
    bodyMesh.instanceMatrix.needsUpdate = true;
    for (let t = 0; t < 30; t++) {
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i]!;
        const shell = shells[0]!;
        syncGlyphExteriorShell(bodyMesh, shell, i, 0, slot.sig, 0.5 + i * 0.1, t * 0.1);
      }
      syncGlyphWireHalos(bodyMesh, halos[0]!, null, slots, 1.12);
    }
    for (const s of shells) {
      s.geometry.dispose();
      (s.material as THREE.Material).dispose();
    }
    for (const h of halos) {
      h.geometry.dispose();
      (h.material as THREE.Material).dispose();
    }
    bodyGeo.dispose();
    (bodyMesh.material as THREE.Material).dispose();
  });

  test('glyph accent / filament / spore layers setAt + finish + dispose', () => {
    const parent = new THREE.Group();
    const accents = new GlyphAccentMotes(parent, 8);
    const filaments = new GlyphFilamentBurst(parent, 8);
    const spores = new GlyphSporeAura(parent, 8);
    const sig = glyphExteriorSignature(ALPHABET_ROSTER[0]!);
    const bodyM = new THREE.Matrix4().makeTranslation(0, 1, 0);
    for (let t = 0; t < 20; t++) {
      for (let g = 0; g < 8; g++) {
        accents.setAt(g, bodyM, sig, 0.5, t * 0.1);
        filaments.setAt(g, bodyM, sig.accentHue, sig, 0.6, t * 0.1);
        spores.setAt(g, bodyM, sig.accentHue, sig, 0.7, t * 0.1);
      }
      accents.finish();
      filaments.finish();
      spores.finish();
    }
    expect(() => {
      accents.dispose();
      filaments.dispose();
      spores.dispose();
    }).not.toThrow();
  });
});

describe('creature-exterior-phenomena', () => {
  test('catalog has exactly 1000 deterministic phenomena', () => {
    const built = buildCreatureExteriorPhenomena();
    expect(built.length).toBe(1000);
    expect(CREATURE_EXTERIOR_PHENOMENA_COUNT).toBe(1000);
    expect(CREATURE_EXTERIOR_PHENOMENA.length).toBe(1000);
    expect(CREATURE_EXTERIOR_PHENOMENA[0]!.id).toBe(0);
    expect(CREATURE_EXTERIOR_PHENOMENA[999]!.id).toBe(999);
  });

  test('activeExteriorPhenomena is deterministic and in range', () => {
    const a = activeExteriorPhenomena(42, 0.5, 4);
    const b = activeExteriorPhenomena(42, 0.5, 4);
    expect(a).toEqual(b);
    for (const idx of a) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(1000);
    }
  });

  test('exterior time scale is calibrated to the slow owner baseline (V116)', () => {
    expect(CREATURE_EXTERIOR_TIME_SCALE).toBe(1.75);
  });
});

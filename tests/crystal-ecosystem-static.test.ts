import { describe, expect, test } from 'bun:test';

const SOURCE = await Bun.file(new URL('../src/sim/crystal-ecosystem.ts', import.meta.url)).text();

describe('Crystal ecosystem source laws', () => {
  test('retains the complete authored home census rather than reducing the tree to decoration', () => {
    expect(SOURCE).toMatch(/CRYSTAL_TREE_DOME_BRANCHES\s*=\s*500/);
    expect(SOURCE).toMatch(/CRYSTAL_TREE_BONSAI_BRANCHES\s*=\s*1000/);
    expect(SOURCE).toMatch(/CRYSTAL_TREE_LEAVES\s*=\s*10_000/);
    expect(SOURCE).toMatch(/CRYSTAL_TREE_FRUITS\s*=\s*10_000/);
    expect(SOURCE).toMatch(/CRYSTAL_TREE_FLOWERS\s*=\s*10_000/);
    expect(SOURCE).toMatch(/CRYSTAL_TREE_CREATURES_PER_SPECIES\s*=\s*25/);
    expect(SOURCE).toMatch(/CRYSTAL_TREE_AMBIENT_CREATURES\s*=\s*99/);
    expect(SOURCE).toMatch(/CRYSTAL_TREE_MOTES\s*=\s*5000/);
    expect(SOURCE).toMatch(/CRYSTAL_TREE_RELICS\s*=\s*50/);
  });

  test('keeps all ten distinct beings and all ten honest quantum-inspired traits', () => {
    const speciesBlock = SOURCE.slice(
      SOURCE.indexOf('export const CRYSTAL_SPECIES'),
      SOURCE.indexOf('export interface CrystalEcosystemFrame'),
    );
    for (const name of [
      'Lumivore',
      'Crystalith',
      'Nebulark',
      'Voidmoth',
      'Thornspike',
      'Glinteel',
      'Shadowcrawl',
      'Prismfly',
      'Coralspore',
      'Riftweaver',
    ]) {
      expect(speciesBlock).toContain(`name: '${name}'`);
    }
    for (const trait of [
      'superposition',
      'entanglement',
      'tunneling',
      'waveCollapse',
      'spin',
      'decoherence',
      'interference',
      'uncertainty',
      'phaseShift',
      'zeroPoint',
    ]) {
      expect(SOURCE).toContain(`'${trait}'`);
    }
    // Documentation is explicit: these are classical metaphors, not physical-quantum claims.
    expect(SOURCE).toContain('deterministic classical state/visual metaphors');
  });

  test('uses one deterministic local stream and cannot revive the worker/two-renderer regression', () => {
    expect(SOURCE).toContain('mulberry32');
    expect(SOURCE).not.toContain('Math.random(');
    expect(SOURCE).not.toMatch(/new\s+(?:Worker|SharedWorker)\s*\(/);
    expect(SOURCE).not.toMatch(/new\s+THREE\.(?:WebGLRenderer|WebGPURenderer)\s*\(/);
    expect(SOURCE).not.toMatch(/new\s+THREE\.(?:PerspectiveCamera|OrthographicCamera)\s*\(/);
    expect(SOURCE).not.toContain("from 'tone'");
    expect(SOURCE).not.toContain('Tone.');
  });

  test('declares hard full-census draw and triangle ceilings', () => {
    expect(SOURCE).toMatch(/CRYSTAL_TREE_DRAW_CALL_BUDGET\s*=\s*36/);
    expect(SOURCE).toMatch(/CRYSTAL_TREE_TRIANGLE_BUDGET\s*=\s*1_200_000/);
    expect(SOURCE).toContain('new THREE.InstancedMesh');
    expect(SOURCE).toContain('new THREE.InstancedBufferAttribute');
    expect(SOURCE).not.toContain('.toNonIndexed(');
  });

  test('keeps source-smooth curves while avoiding hidden shadow/light multiplication', () => {
    expect(SOURCE).toContain('new THREE.CatmullRomCurve3(points)');
    expect(SOURCE).toContain('curve.getPoints(14)');
    expect(SOURCE).toContain('subCurve.getPoints(6)');
    expect(SOURCE).toContain('new THREE.CatmullRomCurve3(points).getPoints(16)');
    expect(SOURCE).toContain('this.branches.castShadow = false');
    expect(SOURCE).not.toContain('new THREE.PointLight');
    expect(SOURCE).toContain('canopyArtifactTriangles');
  });
});

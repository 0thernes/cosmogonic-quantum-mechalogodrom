/**
 * FLOATING MONOLITHS — suspended abomination-architecture adrift in the dome.
 *
 * Sparse, deliberate megaliths hanging in the dome air (NOT the neon V11 lattices, NOT the
 * ground temple): greebled obelisks, fractured cubes, broken slabs, crystal shards and a ring-arch,
 * each slowly bobbing, swaying and tumbling so the volume reads as inhabited architecture rather
 * than empty space. Kept FEW and well-spaced (the owner: "not too many to destroy visuals… still
 * open spacing, but enough to give it life and materialism"), and held off the central column so
 * the Mechalogodrom crown + temple stay framed.
 *
 * RENDER: each megalith is its own small Group (so it can drift independently for an O(count)
 * per-frame transform update, NOT O(panels)); inside, a shared unit-box geometry + shared material
 * draw ~180 instanced greeble panels encrusting the core, plus one lit core mesh. Panels carry
 * per-instance albedo (instanceColor) with rare neon accents. Total ≈ 16 cores + 16 instanced
 * panel meshes ≈ a few dozen draw calls for thousands of boxes.
 *
 * REACTIVITY (defensible, not decoration): the shared emissive glow is a monotone readout of world
 * chaos — pin chaos to 0 and the megaliths go cold stone; agitate it and their accents kindle. The
 * drift/tumble is pure deterministic trig of `t`.
 *
 * DETERMINISM (ADR 0004): positions + per-instance params from a pure positional hash — ZERO rng
 * draws, no Date.now — boot-stream-neutral (additive scene dressing, like {@link GoldLattice}). It
 * reads world chaos but never writes sim state, so the population golden stays byte-identical.
 */
import * as THREE from 'three';
import { ARENA_RADIUS } from './constants';

const COUNT = 16;
const PANELS_PER = 180;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Deterministic positional hash → [0,1). No bitwise, no rng. */
function hash(n: number): number {
  const s = Math.sin(n * 41.17 + 13.91) * 24634.6345;
  return s - Math.floor(s);
}

/** Archetype core forms; `bx/by/bz` are the half-extents the greeble shell is scattered over. */
interface Archetype {
  readonly geo: THREE.BufferGeometry;
  readonly bx: number;
  readonly by: number;
  readonly bz: number;
  /** Greeble the bounding shell? (false for the ring-arch, which reads cleaner bare). */
  readonly greeble: boolean;
}

interface Megalith {
  readonly group: THREE.Group;
  readonly panels: THREE.InstancedMesh | null;
  readonly baseX: number;
  readonly baseY: number;
  readonly baseZ: number;
  readonly bobAmp: number;
  readonly bobFreq: number;
  readonly phase: number;
  readonly swayAmp: number;
  readonly spinX: number;
  readonly spinY: number;
  readonly spinZ: number;
}

export class FloatingMonoliths {
  private readonly scene: THREE.Scene;
  private readonly megaliths: Megalith[] = [];
  private readonly archetypes: Archetype[];
  private readonly boxGeo = new THREE.BoxGeometry(1, 1, 1);
  private readonly panelMat: THREE.MeshStandardMaterial;
  private readonly coreMat: THREE.MeshStandardMaterial;
  // V109: energy beam materials — one shared cylinder geo + additive material per beam
  private readonly beamGeo: THREE.CylinderGeometry;
  private readonly beamMat: THREE.MeshBasicMaterial;
  private readonly beams: THREE.Mesh[] = [];
  /** Total instanced greeble panels placed (telemetry/tests). */
  readonly panelCount: number;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.archetypes = [
      { geo: new THREE.BoxGeometry(3, 16, 3), bx: 1.5, by: 8, bz: 1.5, greeble: true }, // obelisk
      { geo: new THREE.BoxGeometry(8, 8, 8), bx: 4, by: 4, bz: 4, greeble: true }, // fractured cube
      { geo: new THREE.BoxGeometry(13, 3.4, 7), bx: 6.5, by: 1.7, bz: 3.5, greeble: true }, // slab
      { geo: this.makeCrystal(), bx: 4, by: 7.2, bz: 4, greeble: true }, // crystal shard
      { geo: new THREE.BoxGeometry(6, 11, 6), bx: 3, by: 5.5, bz: 3, greeble: true }, // stepped chunk
      { geo: new THREE.TorusGeometry(7, 1.5, 10, 36), bx: 8.5, by: 8.5, bz: 2, greeble: false }, // ring-arch
    ];

    this.panelMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, // per-instance via instanceColor
      roughness: 0.74,
      metalness: 0.34,
      emissive: 0x101010, // strict monochrome (rebuild V124) — grey, no blue/violet tint
      emissiveIntensity: 0.3,
    });
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0x0d0d0d,
      roughness: 0.55,
      metalness: 0.5,
      emissive: 0x111111,
      emissiveIntensity: 0.45,
    });
    // V109: energy beam — thin additive cylinder from each monolith to ground (scanning/energizing)
    this.beamGeo = new THREE.CylinderGeometry(0.12, 0.06, 1, 6, 1, true);
    this.beamMat = new THREE.MeshBasicMaterial({
      color: 0xb0b0b0, // strict monochrome (rebuild V124) — silver beam, no blue
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    const col = new THREE.Color();
    let panels = 0;

    for (let i = 0; i < COUNT; i++) {
      const archIdx = i % this.archetypes.length;
      const arch = this.archetypes[archIdx]!;
      const group = new THREE.Group();

      // Dome placement: golden-angle ring, mid-to-outer radius, varied height, centre column clear.
      const th = i * GOLDEN_ANGLE + hash(i * 5 + 1) * 0.6;
      const r = ARENA_RADIUS * (0.36 + 0.52 * hash(i * 3 + 2));
      const baseX = Math.cos(th) * r;
      const baseZ = Math.sin(th) * r;
      const baseY = 60 + hash(i * 7 + 3) * 175; // float between the canopy and the crown
      const size = 1.4 + hash(i * 11 + 4) * 3.0;
      group.position.set(baseX, baseY, baseZ);
      group.scale.setScalar(size);
      group.rotation.set(hash(i * 2 + 5) * 6.28, hash(i * 4 + 6) * 6.28, hash(i * 6 + 7) * 6.28);

      // Core form.
      const core = new THREE.Mesh(arch.geo, this.coreMat);
      core.frustumCulled = false;
      group.add(core);

      // Greeble shell (encrust the bounding box faces) — skipped for the bare ring-arch.
      let panelMesh: THREE.InstancedMesh | null = null;
      if (arch.greeble) {
        panelMesh = new THREE.InstancedMesh(this.boxGeo, this.panelMat, PANELS_PER);
        panelMesh.frustumCulled = false;
        for (let p = 0; p < PANELS_PER; p++) {
          const salt = i * 1000 + p;
          const face = Math.floor(hash(salt * 2.3 + 11) * 6); // 0..5 : ±x ±y ±z
          const pd = 0.25 + hash(salt * 5 + 7) * 1.1; // protrusion
          const a = 0.5 + hash(salt * 6 + 13) * 2.4; // in-face size a
          const b = 0.5 + hash(salt * 9 + 17) * 2.4; // in-face size b
          const uo = (hash(salt * 3 + 23) - 0.5) * 1.8;
          const vo = (hash(salt * 4 + 29) - 0.5) * 1.8;
          if (face === 0) {
            pos.set(arch.bx + pd / 2, vo * arch.by, uo * arch.bz);
            scl.set(pd, b, a);
          } else if (face === 1) {
            pos.set(-arch.bx - pd / 2, vo * arch.by, uo * arch.bz);
            scl.set(pd, b, a);
          } else if (face === 2) {
            pos.set(uo * arch.bx, arch.by + pd / 2, vo * arch.bz);
            scl.set(a, pd, b);
          } else if (face === 3) {
            pos.set(uo * arch.bx, -arch.by - pd / 2, vo * arch.bz);
            scl.set(a, pd, b);
          } else if (face === 4) {
            pos.set(uo * arch.bx, vo * arch.by, arch.bz + pd / 2);
            scl.set(a, b, pd);
          } else {
            pos.set(uo * arch.bx, vo * arch.by, -arch.bz - pd / 2);
            scl.set(a, b, pd);
          }
          e.set(
            (hash(salt) - 0.5) * 0.12,
            (hash(salt + 1) - 0.5) * 0.12,
            (hash(salt + 2) - 0.5) * 0.12,
          );
          q.setFromEuler(e);
          m.compose(pos, q, scl);
          panelMesh.setMatrixAt(p, m);
          // Strict MONOCHROME (rebuild V124): a rare panel glints brighter silver over dark grey —
          // the drifting megaliths match the black/white/silver Monolith Megalith, zero hue.
          const accent = hash(salt * 7 + 31) > 0.9;
          const lit = accent ? 0.64 : 0.12 + hash(salt * 3) * 0.14;
          col.setRGB(lit, lit, lit);
          panelMesh.setColorAt(p, col);
          panels++;
        }
        panelMesh.instanceMatrix.needsUpdate = true;
        if (panelMesh.instanceColor) panelMesh.instanceColor.needsUpdate = true;
        group.add(panelMesh);
      }

      // V109: energy beam from monolith to ground — gives floating megaliths PURPOSE
      // as scanning/energizing nodes, not just decoration.
      const beam = new THREE.Mesh(this.beamGeo, this.beamMat);
      beam.frustumCulled = false;
      beam.position.set(baseX, baseY * 0.5, baseZ);
      beam.scale.y = baseY;
      this.scene.add(beam);
      this.beams.push(beam);

      this.scene.add(group);
      this.megaliths.push({
        group,
        panels: panelMesh,
        baseX,
        baseY,
        baseZ,
        bobAmp: 4 + hash(i * 17 + 8) * 12,
        bobFreq: 0.08 + hash(i * 19 + 9) * 0.22,
        phase: hash(i * 23 + 10) * 6.28,
        swayAmp: 3 + hash(i * 29 + 11) * 9,
        spinX: (hash(i * 31 + 12) - 0.5) * 0.06,
        spinY: (hash(i * 37 + 13) - 0.5) * 0.1,
        spinZ: (hash(i * 41 + 14) - 0.5) * 0.05,
      });
    }
    this.panelCount = panels;
  }

  private makeCrystal(): THREE.BufferGeometry {
    const g = new THREE.OctahedronGeometry(5.5, 0);
    g.scale(0.78, 1.45, 0.78);
    return g;
  }

  /** Drift + tumble each megalith; kindle the shared emissive with world chaos. O(COUNT). */
  update(t: number, chaos: number): void {
    const c = chaos < 0 ? 0 : chaos > 1 ? 1 : chaos;
    for (let i = 0; i < this.megaliths.length; i++) {
      const mg = this.megaliths[i]!;
      const g = mg.group;
      g.position.y = mg.baseY + Math.sin(t * mg.bobFreq + mg.phase) * mg.bobAmp;
      g.position.x = mg.baseX + Math.sin(t * mg.bobFreq * 0.7 + mg.phase * 1.3) * mg.swayAmp;
      g.position.z = mg.baseZ + Math.cos(t * mg.bobFreq * 0.6 + mg.phase) * mg.swayAmp;
      g.rotation.x += mg.spinX * (0.5 + c);
      g.rotation.y += mg.spinY * (0.5 + c);
      g.rotation.z += mg.spinZ * (0.5 + c);
      // V109: sync beam to monolith position + pulse opacity with chaos
      const beam = this.beams[i];
      if (beam) {
        beam.position.x = g.position.x;
        beam.position.z = g.position.z;
        beam.position.y = g.position.y * 0.5;
        beam.scale.y = g.position.y;
      }
    }
    this.panelMat.emissiveIntensity = 0.24 + c * 0.85;
    this.coreMat.emissiveIntensity = 0.35 + c * 0.7;
    // V109: pulse beam opacity with chaos — more energy when world is agitated
    this.beamMat.opacity = 0.08 + c * 0.22;
  }

  /** Free every owned geometry + material and detach all megaliths. */
  dispose(): void {
    for (const mg of this.megaliths) {
      this.scene.remove(mg.group);
      mg.panels?.dispose();
    }
    for (const b of this.beams) this.scene.remove(b);
    this.beams.length = 0;
    this.megaliths.length = 0;
    for (const a of this.archetypes) a.geo.dispose();
    this.boxGeo.dispose();
    this.beamGeo.dispose();
    this.panelMat.dispose();
    this.coreMat.dispose();
    this.beamMat.dispose();
  }
}

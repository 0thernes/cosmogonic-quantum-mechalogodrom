/**
 * ABOMINATION ARCHITECTURE — sparse suspended megastructure around the dome.
 *
 * The temple owns the ascension portal; this system owns the open-space materialism around it:
 * floating circuit-slabs, megalith ribs, and long additive bridge-lines inspired by alien city /
 * labyrinth references. It is intentionally SPARSE: enough architecture to make the dome feel built,
 * not so much that it occludes the creatures.
 *
 * Determinism: no rng, no clock at construction. Placement is pure index math; update reads only
 * elapsed time plus normalized world scalars. Hot path mutates a fixed InstancedMesh and one
 * LineSegments buffer: O(ARCH_COUNT + BRIDGE_COUNT), allocation-free.
 */
import * as THREE from 'three';
import { clamp } from '../math/scalar';
import { ARENA_RADIUS } from './constants';

const ARCH_COUNT = 72;
const BRIDGE_COUNT = 96;
const RING_R = ARENA_RADIUS * 1.42;

interface ArchSeed {
  readonly a: number;
  readonly y: number;
  readonly r: number;
  readonly sx: number;
  readonly sy: number;
  readonly sz: number;
  readonly phase: number;
  readonly hue: number;
}

const TMP_M = new THREE.Matrix4();
const TMP_Q = new THREE.Quaternion();
const TMP_E = new THREE.Euler();
const TMP_P = new THREE.Vector3();
const TMP_S = new THREE.Vector3();
const TMP_C = new THREE.Color();

export class AbominationArchitecture {
  private readonly group = new THREE.Group();
  private readonly seeds: ArchSeed[] = [];
  private readonly slabs: THREE.InstancedMesh;
  private readonly slabMat: THREE.MeshBasicMaterial;
  private readonly bridgeGeo: THREE.BufferGeometry;
  private readonly bridgeMat: THREE.LineBasicMaterial;
  private readonly bridgePos: Float32Array;
  private readonly bridgeColor: Float32Array;
  private readonly bridgePosAttr: THREE.BufferAttribute;
  private readonly bridgeColorAttr: THREE.BufferAttribute;
  private chaos = 0;
  private entropy = 0;
  private crowding = 0;

  constructor(scene: THREE.Scene) {
    this.slabMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.slabs = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1, 2, 2, 2),
      this.slabMat,
      ARCH_COUNT,
    );
    this.slabs.frustumCulled = false;

    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < ARCH_COUNT; i++) {
      const band = i % 6;
      const a = i * golden;
      const y = 42 + band * 27 + Math.sin(i * 1.7) * 18;
      const r = RING_R * (0.72 + (band % 3) * 0.12 + ((i * 11) % 7) * 0.012);
      this.seeds.push({
        a,
        y,
        r,
        sx: 10 + (i % 5) * 7,
        sy: 1.2 + (i % 7) * 1.1,
        sz: 2 + (i % 4) * 1.9,
        phase: ((i * 137) % 628) / 100,
        hue: (0.53 + ((i * 0.021) % 0.44)) % 1,
      });
    }
    this.group.add(this.slabs);

    this.bridgePos = new Float32Array(BRIDGE_COUNT * 6);
    this.bridgeColor = new Float32Array(BRIDGE_COUNT * 6);
    this.bridgeGeo = new THREE.BufferGeometry();
    this.bridgePosAttr = new THREE.BufferAttribute(this.bridgePos, 3);
    this.bridgeColorAttr = new THREE.BufferAttribute(this.bridgeColor, 3);
    this.bridgeGeo.setAttribute('position', this.bridgePosAttr);
    this.bridgeGeo.setAttribute('color', this.bridgeColorAttr);
    this.bridgeMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.36,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.group.add(new THREE.LineSegments(this.bridgeGeo, this.bridgeMat));

    scene.add(this.group);
    this.update(0);
  }

  /** Feed normalized world scalars. Values are clamped and never written back to simulation state. */
  setReactivity(chaos: number, entropy: number, crowding: number): void {
    this.chaos = clamp(Number.isFinite(chaos) ? chaos : 0, 0, 1);
    this.entropy = clamp(Number.isFinite(entropy) ? entropy : 0, 0, 1);
    this.crowding = clamp(Number.isFinite(crowding) ? crowding : 0, 0, 1);
  }

  /** Animate slabs + bridge lines. Allocation-free; O(ARCH_COUNT + BRIDGE_COUNT). */
  update(t: number): void {
    const safeT = Number.isFinite(t) ? t : 0;
    const drive = 0.2 + this.chaos * 0.45 + this.entropy * 0.2 + this.crowding * 0.15;
    for (let i = 0; i < this.seeds.length; i++) {
      const s = this.seeds[i]!;
      const wobble = Math.sin(safeT * (0.17 + (i % 5) * 0.025) + s.phase);
      // USER: the abomination brain was PINNED to a fixed ring doing the same wobble → add a slow DRIFT
      // so the whole structure migrates: a continuous ring-rotation, a ±28% radial breathe, and a vertical
      // bob. Reads as a living, roaming colossus instead of a static installation. Pure trig — no rng.
      const angleDrift =
        safeT * 0.014 * (i % 2 === 0 ? 1 : -1) + Math.sin(safeT * 0.035 + s.phase * 0.7) * 0.5;
      const radiusDrift = 1 + Math.sin(safeT * 0.04 + s.phase) * 0.28;
      const a = s.a + angleDrift + Math.sin(safeT * 0.033 + s.phase) * 0.05 * drive;
      const r = s.r * radiusDrift * (1 + wobble * 0.025 * drive);
      const yDrift = Math.sin(safeT * 0.05 + s.phase * 1.3) * 34;
      TMP_P.set(Math.cos(a) * r, s.y + yDrift + wobble * 9 * drive, Math.sin(a) * r);
      TMP_E.set(
        Math.sin(safeT * 0.07 + s.phase) * 0.22,
        -a + Math.PI / 2 + safeT * 0.025 * (i % 2 === 0 ? 1 : -1),
        Math.cos(safeT * 0.05 + s.phase) * 0.18,
      );
      TMP_Q.setFromEuler(TMP_E);
      TMP_S.set(
        s.sx * (1 + this.entropy * 0.4),
        s.sy * (1 + drive * 0.7),
        s.sz * (1 + this.chaos * 0.6),
      );
      TMP_M.compose(TMP_P, TMP_Q, TMP_S);
      this.slabs.setMatrixAt(i, TMP_M);
      // USER: dimmer, darker slabs so the apex brain no longer sums to a blinding white halo.
      TMP_C.setHSL((s.hue + this.chaos * 0.08 + wobble * 0.02 + 1) % 1, 0.92, 0.28 + drive * 0.1);
      this.slabs.setColorAt(i, TMP_C);
    }
    this.slabs.instanceMatrix.needsUpdate = true;
    if (this.slabs.instanceColor) this.slabs.instanceColor.needsUpdate = true;
    this.slabMat.opacity = 0.09 + drive * 0.13;

    for (let i = 0; i < BRIDGE_COUNT; i++) {
      const a = this.seeds[(i * 5) % ARCH_COUNT]!;
      const b = this.seeds[(i * 11 + 17) % ARCH_COUNT]!;
      const w = Math.sin(safeT * 0.11 + i * 0.23) * drive;
      const ao = a.a + w * 0.04;
      const bo = b.a - w * 0.03;
      const o = i * 6;
      this.bridgePos[o] = Math.cos(ao) * a.r;
      this.bridgePos[o + 1] = a.y + w * 11;
      this.bridgePos[o + 2] = Math.sin(ao) * a.r;
      this.bridgePos[o + 3] = Math.cos(bo) * b.r;
      this.bridgePos[o + 4] = b.y - w * 9;
      this.bridgePos[o + 5] = Math.sin(bo) * b.r;
      TMP_C.setHSL((a.hue + b.hue + this.entropy * 0.12) % 1, 1, 0.26 + drive * 0.1);
      this.bridgeColor[o] = TMP_C.r;
      this.bridgeColor[o + 1] = TMP_C.g;
      this.bridgeColor[o + 2] = TMP_C.b;
      this.bridgeColor[o + 3] = TMP_C.r;
      this.bridgeColor[o + 4] = TMP_C.g;
      this.bridgeColor[o + 5] = TMP_C.b;
    }
    this.bridgePosAttr.needsUpdate = true;
    this.bridgeColorAttr.needsUpdate = true;
    this.bridgeMat.opacity = 0.05 + drive * 0.12;
  }

  get count(): number {
    return ARCH_COUNT;
  }

  dispose(): void {
    this.slabs.geometry.dispose();
    this.slabMat.dispose();
    this.slabs.dispose();
    this.bridgeGeo.dispose();
    this.bridgeMat.dispose();
    this.group.removeFromParent();
  }
}

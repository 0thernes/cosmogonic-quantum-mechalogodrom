/**
 * CREATURE EXTERIOR LAYERS — Three.js physical-outside abomination meshes.
 *
 * Attaches to the live bodies of:
 *   • Glyph pantheon (100 unique letter shells + wire halos + accent motes)
 *   • Apex ς capstone (#101) — portal vortex + stellated swarm + god rays + mandala
 *   • Mechalogodrom — beam vortex + glyph discs + crimson nebula meat + CRT canyon
 *
 * Visual-only; deterministic; no rng. Brains/Tsotchke drive intensity via setters.
 */
import * as THREE from 'three';
import { clamp } from '../math/scalar';
import {
  activeExteriorPhenomena,
  CREATURE_EXTERIOR_PHENOMENA,
  CREATURE_EXTERIOR_TIME_SCALE,
  tsotchkeExteriorHue,
  type CreatureExteriorPhenomenon,
} from './creature-exterior-phenomena';
import { GLYPH_EXTERIOR_KIND_COUNT, type GlyphExteriorSignature } from './glyph-exterior-signature';
import type { TsotchkeQuantumPulse } from './tsotchke-facade';

const TAU = Math.PI * 2;

function shellGeoForKind(kindIdx: number): THREE.BufferGeometry {
  switch (kindIdx % GLYPH_EXTERIOR_KIND_COUNT) {
    case 0: {
      const g = new THREE.BoxGeometry(1.15, 1.15, 1.15);
      const e = new THREE.EdgesGeometry(g);
      g.dispose();
      return e;
    }
    case 1: {
      const g = new THREE.OctahedronGeometry(1, 0);
      const e = new THREE.EdgesGeometry(g);
      g.dispose();
      return e;
    }
    case 2: {
      const g = new THREE.DodecahedronGeometry(1, 0);
      const e = new THREE.EdgesGeometry(g);
      g.dispose();
      return e;
    }
    case 3: {
      const g = new THREE.TorusGeometry(0.85, 0.06, 6, 24);
      const e = new THREE.EdgesGeometry(g);
      g.dispose();
      return e;
    }
    case 4: {
      const g = new THREE.TorusKnotGeometry(0.55, 0.14, 48, 6, 2, 3);
      const e = new THREE.EdgesGeometry(g);
      g.dispose();
      return e;
    }
    case 5: {
      const g = new THREE.SphereGeometry(0.72, 8, 6);
      const e = new THREE.EdgesGeometry(g);
      g.dispose();
      return e;
    }
    case 6: {
      const g = new THREE.PlaneGeometry(1.4, 1.4, 1, 1);
      const e = new THREE.EdgesGeometry(g);
      g.dispose();
      return e;
    }
    case 7: {
      const g = new THREE.IcosahedronGeometry(0.9, 0);
      const e = new THREE.EdgesGeometry(g);
      g.dispose();
      return e;
    }
    case 8: {
      const g = new THREE.BoxGeometry(1.5, 0.35, 1.1);
      const e = new THREE.EdgesGeometry(g);
      g.dispose();
      return e;
    }
    case 10: {
      const g = new THREE.IcosahedronGeometry(0.95, 1);
      const e = new THREE.EdgesGeometry(g);
      g.dispose();
      return e;
    }
    case 11: {
      const arr = new Float32Array(36 * 6);
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * TAU;
        const o = i * 6;
        arr[o] = 0;
        arr[o + 1] = 0;
        arr[o + 2] = 0;
        arr[o + 3] = Math.cos(a) * (0.6 + (i % 5) * 0.15);
        arr[o + 4] = Math.sin(a * 1.7) * 0.5;
        arr[o + 5] = Math.sin(a) * (0.6 + (i % 3) * 0.12);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      return geo;
    }
    case 12: {
      const g = new THREE.TorusGeometry(0.9, 0.12, 6, 32);
      const e = new THREE.EdgesGeometry(g);
      g.dispose();
      return e;
    }
    case 13: {
      const g = new THREE.SphereGeometry(0.78, 10, 8);
      const e = new THREE.EdgesGeometry(g);
      g.dispose();
      return e;
    }
    case 14: {
      const g = new THREE.BoxGeometry(1.35, 1.35, 0.14);
      const e = new THREE.EdgesGeometry(g);
      g.dispose();
      return e;
    }
    default: {
      const g = new THREE.RingGeometry(0.55, 0.95, 16);
      const e = new THREE.EdgesGeometry(g);
      g.dispose();
      return e;
    }
  }
}

// ── Apex ς exterior (mandala + tesseract + nebula + zebra void) ───────────────

export class ApexExteriorAbomination {
  readonly group = new THREE.Group();
  private readonly tesseract: THREE.LineSegments[] = [];
  private readonly nebula: THREE.Points;
  private readonly filaments: THREE.LineSegments;
  private readonly mandala: THREE.LineSegments;
  private readonly voidSquares: THREE.LineSegments[] = [];
  private readonly cornerOrbs: THREE.Mesh[] = [];
  private readonly portalFrame: THREE.LineSegments;
  private readonly vortexSpiral: THREE.LineSegments;
  private readonly godRays: THREE.LineSegments;
  private readonly stellatedSwarm: THREE.InstancedMesh;
  private readonly neuralTethers: THREE.LineSegments;
  private readonly zigguratStack: THREE.LineSegments;
  private readonly matWire = new THREE.LineBasicMaterial({
    color: 0xaaccff,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  private readonly matFil = new THREE.LineBasicMaterial({
    color: 0x44ffcc,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  private readonly matMandala = new THREE.LineBasicMaterial({
    color: 0x9966ff,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  constructor(parent: THREE.Object3D) {
    parent.add(this.group);
    for (let layer = 0; layer < 5; layer++) {
      const s = 1.2 + layer * 0.55;
      const geo = new THREE.BoxGeometry(s, s, s);
      const edges = new THREE.EdgesGeometry(geo);
      geo.dispose();
      const lines = new THREE.LineSegments(edges, this.matWire.clone());
      lines.rotation.set(layer * 0.31, layer * 0.47, layer * 0.19);
      this.tesseract.push(lines);
      this.group.add(lines);
    }
    const mN = 8;
    const mArr = new Float32Array(mN * 6);
    for (let i = 0; i < mN; i++) {
      const a = (i / mN) * TAU;
      const o = i * 6;
      mArr[o] = Math.cos(a) * 2.2;
      mArr[o + 1] = Math.sin(a) * 2.2;
      mArr[o + 2] = 0;
      mArr[o + 3] = Math.cos(a + Math.PI / 4) * 3.8;
      mArr[o + 4] = Math.sin(a + Math.PI / 4) * 3.8;
      mArr[o + 5] = Math.sin(a * 2) * 0.4;
    }
    const mGeo = new THREE.BufferGeometry();
    mGeo.setAttribute('position', new THREE.BufferAttribute(mArr, 3));
    this.mandala = new THREE.LineSegments(mGeo, this.matMandala);
    this.group.add(this.mandala);
    for (let z = 0; z < 4; z++) {
      const s = 0.9 + z * 0.35;
      const g = new THREE.PlaneGeometry(s, s);
      const e = new THREE.EdgesGeometry(g);
      g.dispose();
      const sq = new THREE.LineSegments(
        e,
        new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.12,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      sq.rotation.set(z * 0.4, z * 0.55, z * 0.3);
      this.voidSquares.push(sq);
      this.group.add(sq);
    }
    const orbMat = new THREE.MeshBasicMaterial({
      color: 0xccddee,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let c = 0; c < 4; c++) {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), orbMat.clone());
      orb.position.set(c % 2 === 0 ? 2.6 : -2.6, c < 2 ? 2.6 : -2.6, 0.8);
      this.cornerOrbs.push(orb);
      this.group.add(orb);
    }
    const N = 640;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const th = (i / N) * TAU * 3;
      const r = 2 + (i % 17) * 0.08;
      pos[i * 3] = Math.cos(th) * r;
      pos[i * 3 + 1] = Math.sin(th * 1.7) * r * 0.6;
      pos[i * 3 + 2] = Math.sin(th) * r;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.nebula = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        color: 0x22ffaa,
        size: 0.35,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    this.group.add(this.nebula);
    const fN = 120;
    const fArr = new Float32Array(fN * 6);
    for (let i = 0; i < fN; i++) {
      const a = (i / fN) * TAU;
      const o = i * 6;
      fArr[o] = 0;
      fArr[o + 1] = 0;
      fArr[o + 2] = 0;
      fArr[o + 3] = Math.cos(a) * (3 + (i % 7));
      fArr[o + 4] = Math.sin(a * 2.1) * 2;
      fArr[o + 5] = Math.sin(a) * (3 + (i % 5));
    }
    const fGeo = new THREE.BufferGeometry();
    fGeo.setAttribute('position', new THREE.BufferAttribute(fArr, 3));
    this.filaments = new THREE.LineSegments(fGeo, this.matFil);
    this.group.add(this.filaments);
    const pfG = new THREE.BoxGeometry(4.8, 4.8, 0.18);
    const pfE = new THREE.EdgesGeometry(pfG);
    pfG.dispose();
    this.portalFrame = new THREE.LineSegments(
      pfE,
      new THREE.LineBasicMaterial({
        color: 0xdddddd,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.group.add(this.portalFrame);
    const spN = 64;
    const spArr = new Float32Array(spN * 3);
    for (let i = 0; i < spN; i++) {
      const th = (i / spN) * TAU * 2.5;
      const r = 0.15 + (i / spN) * 2.8;
      spArr[i * 3] = Math.cos(th) * r;
      spArr[i * 3 + 1] = Math.sin(th) * r;
      spArr[i * 3 + 2] = (i / spN - 0.5) * 1.2;
    }
    const spGeo = new THREE.BufferGeometry();
    spGeo.setAttribute('position', new THREE.BufferAttribute(spArr, 3));
    this.vortexSpiral = new THREE.LineSegments(
      spGeo,
      new THREE.LineBasicMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.group.add(this.vortexSpiral);
    const rayN = 20;
    const rayArr = new Float32Array(rayN * 6);
    for (let i = 0; i < rayN; i++) {
      const a = (i / rayN) * TAU;
      const o = i * 6;
      rayArr[o] = 0;
      rayArr[o + 1] = 0;
      rayArr[o + 2] = -0.5;
      rayArr[o + 3] = Math.cos(a) * 5.5;
      rayArr[o + 4] = Math.sin(a) * 5.5;
      rayArr[o + 5] = 0.2;
    }
    const rayGeo = new THREE.BufferGeometry();
    rayGeo.setAttribute('position', new THREE.BufferAttribute(rayArr, 3));
    this.godRays = new THREE.LineSegments(
      rayGeo,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.group.add(this.godRays);
    const swarmN = 20;
    const swarmGeo = new THREE.IcosahedronGeometry(0.28, 0);
    this.stellatedSwarm = new THREE.InstancedMesh(
      swarmGeo,
      new THREE.MeshBasicMaterial({
        color: 0x8899aa,
        wireframe: true,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      swarmN,
    );
    const sM = new THREE.Matrix4();
    const sP = new THREE.Vector3();
    const sQ = new THREE.Quaternion();
    const sS = new THREE.Vector3();
    for (let i = 0; i < swarmN; i++) {
      const th = (i / swarmN) * TAU;
      const r = 1.2 + (i % 4) * 0.45;
      sP.set(Math.cos(th) * r, Math.sin(th * 1.3) * r * 0.6, Math.sin(th) * r * 0.5);
      sQ.setFromEuler(new THREE.Euler(i * 0.4, i * 0.55, i * 0.31));
      sS.setScalar(0.5 + (i % 5) * 0.18);
      sM.compose(sP, sQ, sS);
      this.stellatedSwarm.setMatrixAt(i, sM);
    }
    this.stellatedSwarm.instanceMatrix.needsUpdate = true;
    this.group.add(this.stellatedSwarm);
    const tetherN = 24;
    const tetherArr = new Float32Array(tetherN * 6);
    for (let i = 0; i < tetherN; i++) {
      const a = (i / tetherN) * TAU;
      const o = i * 6;
      tetherArr[o] = Math.cos(a) * 1.2;
      tetherArr[o + 1] = Math.sin(a * 1.4) * 0.8;
      tetherArr[o + 2] = Math.sin(a) * 1.2;
      tetherArr[o + 3] = Math.cos(a) * 4.5;
      tetherArr[o + 4] = Math.sin(a * 0.9) * 3.2;
      tetherArr[o + 5] = Math.sin(a) * 4.5;
    }
    const tetherGeo = new THREE.BufferGeometry();
    tetherGeo.setAttribute('position', new THREE.BufferAttribute(tetherArr, 3));
    this.neuralTethers = new THREE.LineSegments(
      tetherGeo,
      new THREE.LineBasicMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.group.add(this.neuralTethers);
    const zN = 32;
    const zArr = new Float32Array(zN * 6);
    for (let i = 0; i < zN; i++) {
      const layer = i % 4;
      const s = 1.5 - layer * 0.25;
      const o = i * 6;
      zArr[o] = -s;
      zArr[o + 1] = layer * 0.5 - 1;
      zArr[o + 2] = 0;
      zArr[o + 3] = s;
      zArr[o + 4] = layer * 0.5 - 1;
      zArr[o + 5] = 0;
    }
    const zGeo = new THREE.BufferGeometry();
    zGeo.setAttribute('position', new THREE.BufferAttribute(zArr, 3));
    this.zigguratStack = new THREE.LineSegments(
      zGeo,
      new THREE.LineBasicMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.group.add(this.zigguratStack);
  }

  update(t: number, transcendence: number, vitality: number, pulse: TsotchkeQuantumPulse): void {
    const st = t * CREATURE_EXTERIOR_TIME_SCALE;
    const hue = tsotchkeExteriorHue(pulse, 0.55 + transcendence * 0.2);
    const c = new THREE.Color().setHSL(hue, 0.85, 0.5 + vitality * 0.2);
    for (let i = 0; i < this.tesseract.length; i++) {
      const box = this.tesseract[i]!;
      box.rotation.x = st * (0.08 + i * 0.02) + Math.sin(st * 0.3 + i) * 0.15;
      box.rotation.y = st * (0.11 + i * 0.015);
      box.scale.setScalar(1 + 0.08 * Math.sin(st * 0.5 + i) + transcendence * 0.12);
      (box.material as THREE.LineBasicMaterial).color.copy(c);
      (box.material as THREE.LineBasicMaterial).opacity = 0.15 + 0.25 * vitality;
    }
    this.mandala.rotation.z = st * 0.04;
    this.matMandala.color.setHSL((hue + 0.15) % 1, 0.9, 0.55);
    this.matMandala.opacity = 0.12 + 0.22 * transcendence;
    for (let i = 0; i < this.voidSquares.length; i++) {
      const sq = this.voidSquares[i]!;
      sq.rotation.z = st * (0.03 + i * 0.008) + Math.sin(st * 0.2 + i) * 0.12;
      sq.scale.setScalar(1 + 0.06 * Math.sin(st * 0.35 + i) + vitality * 0.08);
    }
    for (let i = 0; i < this.cornerOrbs.length; i++) {
      const orb = this.cornerOrbs[i]!;
      orb.scale.setScalar(0.8 + 0.35 * Math.sin(st * 0.45 + i) + vitality * 0.25);
      (orb.material as THREE.MeshBasicMaterial).color.setHSL((hue + i * 0.08) % 1, 0.85, 0.6);
    }
    this.nebula.rotation.y = st * 0.06;
    (this.nebula.material as THREE.PointsMaterial).color.setHSL(hue + 0.08, 0.9, 0.55);
    this.filaments.rotation.z = st * 0.04;
    this.matFil.opacity = 0.1 + 0.2 * transcendence;
    this.portalFrame.rotation.z = st * 0.025;
    (this.portalFrame.material as THREE.LineBasicMaterial).opacity = 0.1 + 0.18 * vitality;
    this.vortexSpiral.rotation.y = st * 0.06;
    this.vortexSpiral.scale.setScalar(1 + 0.08 * Math.sin(st * 0.35) + transcendence * 0.1);
    (this.vortexSpiral.material as THREE.LineBasicMaterial).opacity = 0.12 + 0.2 * transcendence;
    this.godRays.rotation.z = st * 0.018;
    (this.godRays.material as THREE.LineBasicMaterial).opacity =
      (0.04 + 0.1 * vitality) * (0.7 + 0.3 * Math.sin(st * 0.5));
    const sM = new THREE.Matrix4();
    const sP = new THREE.Vector3();
    const sQ = new THREE.Quaternion();
    const sS = new THREE.Vector3();
    const sE = new THREE.Euler();
    for (let i = 0; i < this.stellatedSwarm.count; i++) {
      this.stellatedSwarm.getMatrixAt(i, sM);
      sM.decompose(sP, sQ, sS);
      sE.setFromQuaternion(sQ);
      sE.y += st * (0.015 + (i % 3) * 0.004);
      sQ.setFromEuler(sE);
      sP.z += Math.sin(st * 0.2 + i) * 0.04 * vitality;
      sM.compose(sP, sQ, sS);
      this.stellatedSwarm.setMatrixAt(i, sM);
    }
    this.stellatedSwarm.instanceMatrix.needsUpdate = true;
    this.neuralTethers.rotation.y = st * 0.02;
    (this.neuralTethers.material as THREE.LineBasicMaterial).opacity = 0.1 + 0.18 * vitality;
    this.zigguratStack.rotation.x = st * 0.015;
    this.zigguratStack.scale.setScalar(1 + 0.06 * transcendence);
    (this.zigguratStack.material as THREE.LineBasicMaterial).color.setHSL(hue + 0.1, 0.8, 0.5);
  }

  dispose(): void {
    for (const l of this.tesseract) {
      l.geometry.dispose();
      (l.material as THREE.Material).dispose();
    }
    this.mandala.geometry.dispose();
    this.matMandala.dispose();
    for (const sq of this.voidSquares) {
      sq.geometry.dispose();
      (sq.material as THREE.Material).dispose();
    }
    for (const o of this.cornerOrbs) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
    this.nebula.geometry.dispose();
    (this.nebula.material as THREE.Material).dispose();
    this.filaments.geometry.dispose();
    this.matFil.dispose();
    this.portalFrame.geometry.dispose();
    (this.portalFrame.material as THREE.Material).dispose();
    this.vortexSpiral.geometry.dispose();
    (this.vortexSpiral.material as THREE.Material).dispose();
    this.godRays.geometry.dispose();
    (this.godRays.material as THREE.Material).dispose();
    this.stellatedSwarm.geometry.dispose();
    (this.stellatedSwarm.material as THREE.Material).dispose();
    this.neuralTethers.geometry.dispose();
    (this.neuralTethers.material as THREE.Material).dispose();
    this.zigguratStack.geometry.dispose();
    (this.zigguratStack.material as THREE.Material).dispose();
    this.matWire.dispose();
  }
}

// ── Mechalogodrom exterior (CRT + cube swarm + prismatic arcs) ────────────────

export class MechaExteriorAbomination {
  readonly group = new THREE.Group();
  private readonly crtColumns: THREE.LineSegments[] = [];
  private readonly tunnel: THREE.LineSegments[] = [];
  private readonly cubeSwarm: THREE.InstancedMesh;
  private readonly prismaticArcs: THREE.LineSegments;
  private readonly beamVortex: THREE.LineSegments;
  private readonly glyphDiscs: THREE.LineSegments[] = [];
  private readonly nebulaMeat: THREE.Points;
  private readonly fractalGold: THREE.InstancedMesh;
  private readonly crystalField: THREE.Points;
  private readonly shardMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  private beat = 0;
  private activity = 0;
  private phenIndices: number[] = [0, 137, 274, 411];

  constructor(parent: THREE.Object3D, coreR: number) {
    parent.add(this.group);
    const cols = 6;
    const rows = 8;
    const boxGeo = new THREE.BoxGeometry(coreR * 0.14, coreR * 0.1, coreR * 0.06);
    const edges = new THREE.EdgesGeometry(boxGeo);
    boxGeo.dispose();
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const seg = new THREE.LineSegments(edges, this.shardMat.clone());
        seg.position.set(
          (c - cols / 2) * coreR * 0.35,
          (r - rows / 2) * coreR * 0.28,
          coreR * 1.8 + c * 0.2,
        );
        this.crtColumns.push(seg);
        this.group.add(seg);
      }
    }
    edges.dispose();
    for (let z = 0; z < 6; z++) {
      const s = 1.4 + z * 0.45;
      const g = new THREE.BoxGeometry(s, s, s);
      const e = new THREE.EdgesGeometry(g);
      g.dispose();
      const ln = new THREE.LineSegments(
        e,
        new THREE.LineBasicMaterial({
          color: 0x88ccff,
          transparent: true,
          opacity: 0.12,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      this.tunnel.push(ln);
      this.group.add(ln);
    }
    const swarmN = 48;
    const cubeG = new THREE.BoxGeometry(coreR * 0.08, coreR * 0.08, coreR * 0.08);
    this.cubeSwarm = new THREE.InstancedMesh(
      cubeG,
      new THREE.MeshBasicMaterial({
        color: 0x111111,
        transparent: true,
        opacity: 0.85,
        blending: THREE.NormalBlending,
      }),
      swarmN,
    );
    const M = new THREE.Matrix4();
    const P = new THREE.Vector3();
    const Q = new THREE.Quaternion();
    const S = new THREE.Vector3();
    for (let i = 0; i < swarmN; i++) {
      P.set(
        (i % 8) * coreR * 0.12 - coreR * 0.42,
        ((i / 8) | 0) * coreR * 0.1 - coreR * 0.28,
        coreR * 0.6 + (i % 5) * 0.15,
      );
      Q.setFromEuler(new THREE.Euler(i * 0.31, i * 0.47, i * 0.19));
      S.setScalar(0.4 + (i % 7) * 0.12);
      M.compose(P, Q, S);
      this.cubeSwarm.setMatrixAt(i, M);
    }
    this.cubeSwarm.instanceMatrix.needsUpdate = true;
    this.group.add(this.cubeSwarm);
    const arcN = 24;
    const arcArr = new Float32Array(arcN * 6);
    for (let i = 0; i < arcN; i++) {
      const a0 = (i / arcN) * Math.PI;
      const a1 = a0 + Math.PI / arcN;
      const r = coreR * 0.55;
      const o = i * 6;
      arcArr[o] = Math.cos(a0) * r;
      arcArr[o + 1] = Math.sin(a0) * r * 0.6;
      arcArr[o + 2] = coreR * 0.3;
      arcArr[o + 3] = Math.cos(a1) * r;
      arcArr[o + 4] = Math.sin(a1) * r * 0.6;
      arcArr[o + 5] = coreR * 0.3;
    }
    const arcGeo = new THREE.BufferGeometry();
    arcGeo.setAttribute('position', new THREE.BufferAttribute(arcArr, 3));
    this.prismaticArcs = new THREE.LineSegments(
      arcGeo,
      new THREE.LineBasicMaterial({
        color: 0xff66cc,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.group.add(this.prismaticArcs);
    const bN = 52;
    const bArr = new Float32Array(bN * 6);
    for (let i = 0; i < bN; i++) {
      const a = (i / bN) * TAU;
      const tilt = (i % 7) * 0.22;
      const len = coreR * (0.4 + (i % 9) * 0.08);
      const o = i * 6;
      bArr[o] = Math.cos(a) * 0.2;
      bArr[o + 1] = Math.sin(tilt) * 0.2;
      bArr[o + 2] = Math.sin(a) * 0.2;
      bArr[o + 3] = Math.cos(a + tilt) * len;
      bArr[o + 4] = Math.sin(a * 1.4 + tilt) * len * 0.7;
      bArr[o + 5] = Math.sin(a + tilt * 2) * len;
    }
    const bGeo = new THREE.BufferGeometry();
    bGeo.setAttribute('position', new THREE.BufferAttribute(bArr, 3));
    this.beamVortex = new THREE.LineSegments(
      bGeo,
      new THREE.LineBasicMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.group.add(this.beamVortex);
    for (let d = 0; d < 5; d++) {
      const tg = new THREE.TorusGeometry(coreR * (0.35 + d * 0.12), coreR * 0.02, 4, 28);
      const te = new THREE.EdgesGeometry(tg);
      tg.dispose();
      const disc = new THREE.LineSegments(
        te,
        new THREE.LineBasicMaterial({
          color: 0xaa8888,
          transparent: true,
          opacity: 0.14,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      disc.rotation.set(d * 0.35, d * 0.5, d * 0.28);
      this.glyphDiscs.push(disc);
      this.group.add(disc);
    }
    const meatN = 280;
    const meatPos = new Float32Array(meatN * 3);
    for (let i = 0; i < meatN; i++) {
      const th = (i / meatN) * TAU * 4;
      const r = coreR * (0.2 + (i % 13) * 0.04);
      meatPos[i * 3] = Math.cos(th) * r;
      meatPos[i * 3 + 1] = Math.sin(th * 1.6) * r * 0.55;
      meatPos[i * 3 + 2] = Math.sin(th) * r + coreR * 0.4;
    }
    const meatGeo = new THREE.BufferGeometry();
    meatGeo.setAttribute('position', new THREE.BufferAttribute(meatPos, 3));
    this.nebulaMeat = new THREE.Points(
      meatGeo,
      new THREE.PointsMaterial({
        color: 0xcc2244,
        size: coreR * 0.035,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    this.group.add(this.nebulaMeat);
    const goldN = 32;
    const goldG = new THREE.BoxGeometry(coreR * 0.06, coreR * 0.06, coreR * 0.06);
    this.fractalGold = new THREE.InstancedMesh(
      goldG,
      new THREE.MeshBasicMaterial({
        color: 0xffcc44,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      goldN,
    );
    for (let i = 0; i < goldN; i++) {
      P.set(
        (i % 6) * coreR * 0.14 - coreR * 0.35,
        ((i / 6) | 0) * coreR * 0.12 - coreR * 0.25,
        coreR * 0.45 + (i % 4) * 0.12,
      );
      Q.setFromEuler(new THREE.Euler(i * 0.5, i * 0.35, i * 0.28));
      S.setScalar(0.3 + (i % 5) * 0.15);
      M.compose(P, Q, S);
      this.fractalGold.setMatrixAt(i, M);
    }
    this.fractalGold.instanceMatrix.needsUpdate = true;
    this.group.add(this.fractalGold);
    const cryN = 160;
    const cryPos = new Float32Array(cryN * 3);
    for (let i = 0; i < cryN; i++) {
      const th = (i / cryN) * TAU * 2;
      cryPos[i * 3] = Math.cos(th) * coreR * (0.15 + (i % 9) * 0.03);
      cryPos[i * 3 + 1] = Math.sin(th * 2.1) * coreR * 0.2 - coreR * 0.35;
      cryPos[i * 3 + 2] = Math.sin(th) * coreR * 0.25;
    }
    const cryGeo = new THREE.BufferGeometry();
    cryGeo.setAttribute('position', new THREE.BufferAttribute(cryPos, 3));
    this.crystalField = new THREE.Points(
      cryGeo,
      new THREE.PointsMaterial({
        color: 0x44ddcc,
        size: coreR * 0.025,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    this.group.add(this.crystalField);
  }

  setMind(beat: number, activity: number): void {
    this.beat = beat;
    this.activity = clamp(activity, 0, 1);
    this.phenIndices = activeExteriorPhenomena(beat, activity, 8);
  }

  update(t: number, fusion: number, drive: number, pulse: TsotchkeQuantumPulse): void {
    const st = t * CREATURE_EXTERIOR_TIME_SCALE;
    const hue = tsotchkeExteriorHue(pulse, this.phenIndices[0]! / 1000 + this.activity * 0.05);
    const phen = CREATURE_EXTERIOR_PHENOMENA[this.phenIndices[0]!]!;
    const phen2 = CREATURE_EXTERIOR_PHENOMENA[this.phenIndices[1]!]!;
    this.applyPhenomenonColors(phen, hue, fusion, drive);
    for (let i = 0; i < this.crtColumns.length; i++) {
      const col = this.crtColumns[i]!;
      const flick = 0.5 + 0.5 * Math.sin(st * 2.1 + i * 0.7 + this.beat * 0.02);
      col.position.z =
        col.position.z * 0.98 + 0.02 * (1.6 + fusion * 0.8 + Math.sin(st * 0.4 + i) * 0.3);
      (col.material as THREE.LineBasicMaterial).opacity =
        (0.08 + 0.35 * flick * drive * (0.65 + this.activity * 0.35)) * fusion;
      col.rotation.y = Math.sin(st * 0.15 + i) * 0.08;
    }
    for (let i = 0; i < this.tunnel.length; i++) {
      const ln = this.tunnel[i]!;
      ln.rotation.x = st * (0.05 + i * 0.01);
      ln.rotation.y = -st * (0.07 + i * 0.012);
      ln.scale.setScalar(0.85 + fusion * 0.35 + 0.05 * Math.sin(st + i));
    }
    const M = new THREE.Matrix4();
    const P = new THREE.Vector3();
    const Q = new THREE.Quaternion();
    const S = new THREE.Vector3();
    const E = new THREE.Euler();
    for (let i = 0; i < this.cubeSwarm.count; i++) {
      this.cubeSwarm.getMatrixAt(i, M);
      M.decompose(P, Q, S);
      E.setFromQuaternion(Q);
      E.x += Math.sin(st * 0.08 + i * 0.4) * 0.002;
      E.y += st * 0.012 + i * 0.003;
      E.z += Math.cos(st * 0.06 + i * 0.35) * 0.002;
      Q.setFromEuler(E);
      const sc = S.x * (0.95 + 0.08 * Math.sin(st * 0.25 + i));
      S.set(sc, sc, sc);
      P.z += Math.sin(st * 0.11 + i) * 0.15 * fusion;
      M.compose(P, Q, S);
      this.cubeSwarm.setMatrixAt(i, M);
    }
    this.cubeSwarm.instanceMatrix.needsUpdate = true;
    this.prismaticArcs.rotation.y = st * 0.05 * (1 + drive);
    (this.prismaticArcs.material as THREE.LineBasicMaterial).color.setHSL(
      (hue + phen2.hue) * 0.5,
      0.95,
      0.5 + this.activity * 0.2,
    );
    (this.prismaticArcs.material as THREE.LineBasicMaterial).opacity = 0.15 + 0.35 * fusion * drive;
    this.beamVortex.rotation.x = st * 0.04 * (1 + drive);
    this.beamVortex.rotation.y = -st * 0.03;
    (this.beamVortex.material as THREE.LineBasicMaterial).opacity =
      0.1 + 0.22 * fusion * this.activity;
    for (let i = 0; i < this.glyphDiscs.length; i++) {
      const disc = this.glyphDiscs[i]!;
      disc.rotation.z = st * (0.025 + i * 0.006) * (i % 2 === 0 ? 1 : -1);
      disc.scale.setScalar(0.9 + fusion * 0.25 + 0.04 * Math.sin(st + i));
      (disc.material as THREE.LineBasicMaterial).opacity = 0.08 + 0.2 * drive;
    }
    this.nebulaMeat.rotation.y = st * 0.035;
    (this.nebulaMeat.material as THREE.PointsMaterial).opacity =
      0.25 + 0.35 * this.activity * fusion + 0.1 * pulse.quakeAliveness;
    (this.nebulaMeat.material as THREE.PointsMaterial).color.setHSL(
      (hue + 0.02) % 1,
      0.85,
      0.42 + drive * 0.15,
    );
    for (let i = 0; i < this.fractalGold.count; i++) {
      this.fractalGold.getMatrixAt(i, M);
      M.decompose(P, Q, S);
      E.setFromQuaternion(Q);
      E.y += st * 0.008 + i * 0.002;
      Q.setFromEuler(E);
      S.multiplyScalar(0.98 + 0.04 * Math.sin(st * 0.2 + i));
      M.compose(P, Q, S);
      this.fractalGold.setMatrixAt(i, M);
    }
    this.fractalGold.instanceMatrix.needsUpdate = true;
    (this.fractalGold.material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.35 * fusion * drive;
    this.crystalField.rotation.x = st * 0.025;
    (this.crystalField.material as THREE.PointsMaterial).opacity =
      0.2 + 0.3 * this.activity + pulse.adGradient * 0.15;
    this.group.rotation.y = st * 0.015 * (1 + drive * 0.4 + this.activity * 0.12);
  }

  private applyPhenomenonColors(
    phen: CreatureExteriorPhenomenon,
    hue: number,
    fusion: number,
    drive: number,
  ): void {
    const c = new THREE.Color().setHSL(phen.hue * 0.3 + hue * 0.7, 0.9, 0.45 + drive * 0.2);
    this.shardMat.color.copy(c);
    for (const col of this.crtColumns) (col.material as THREE.LineBasicMaterial).color.copy(c);
    for (const ln of this.tunnel) {
      (ln.material as THREE.LineBasicMaterial).color.setHSL(
        (hue + phen.hue) * 0.5,
        0.8,
        0.4 + fusion * 0.2,
      );
    }
  }

  dispose(): void {
    for (const c of this.crtColumns) {
      c.geometry.dispose();
      (c.material as THREE.Material).dispose();
    }
    for (const ln of this.tunnel) {
      ln.geometry.dispose();
      (ln.material as THREE.Material).dispose();
    }
    this.cubeSwarm.geometry.dispose();
    (this.cubeSwarm.material as THREE.Material).dispose();
    this.prismaticArcs.geometry.dispose();
    (this.prismaticArcs.material as THREE.Material).dispose();
    this.beamVortex.geometry.dispose();
    (this.beamVortex.material as THREE.Material).dispose();
    for (const d of this.glyphDiscs) {
      d.geometry.dispose();
      (d.material as THREE.Material).dispose();
    }
    this.nebulaMeat.geometry.dispose();
    (this.nebulaMeat.material as THREE.Material).dispose();
    this.fractalGold.geometry.dispose();
    (this.fractalGold.material as THREE.Material).dispose();
    this.crystalField.geometry.dispose();
    (this.crystalField.material as THREE.Material).dispose();
    this.shardMat.dispose();
  }
}

// ── Glyph unique exterior shells (15 topology kinds × instanced) ──────────────

export interface GlyphShellSlot {
  readonly gIdx: number;
  readonly sig: GlyphExteriorSignature;
}

export function attachGlyphExteriorShells(
  parent: THREE.Group,
  buckets: GlyphShellSlot[][],
): THREE.InstancedMesh[] {
  const shells: THREE.InstancedMesh[] = [];
  const baseMat = new THREE.MeshBasicMaterial({
    color: 0x88ccff,
    wireframe: true,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  for (let k = 0; k < buckets.length; k++) {
    const slots = buckets[k]!;
    if (slots.length === 0) continue;
    const geo = shellGeoForKind(k);
    const mesh = new THREE.InstancedMesh(geo, baseMat.clone(), slots.length);
    mesh.frustumCulled = false;
    mesh.renderOrder = 12;
    for (let i = 0; i < slots.length; i++) {
      const sig = slots[i]!.sig;
      const c = new THREE.Color().setHSL(sig.accentHue, 0.75, 0.52);
      mesh.setColorAt(i, c);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    parent.add(mesh);
    shells.push(mesh);
  }
  return shells;
}

const _M = new THREE.Matrix4();
const _P = new THREE.Vector3();
const _Q = new THREE.Quaternion();
const _S = new THREE.Vector3();
const _E = new THREE.Euler();

/** Sync unique exterior shell to body transform + per-glyph signature skew. */
export function syncGlyphExteriorShell(
  bodyMesh: THREE.InstancedMesh,
  shellMesh: THREE.InstancedMesh,
  bodySlot: number,
  shellSlot: number,
  sig: GlyphExteriorSignature,
  activity: number,
  t: number,
): void {
  bodyMesh.getMatrixAt(bodySlot, _M);
  _M.decompose(_P, _Q, _S);
  _E.setFromQuaternion(_Q);
  _E.x += sig.rotBias * 0.08;
  _E.y += Math.sin(t * CREATURE_EXTERIOR_TIME_SCALE * sig.wanderAx) * 0.06;
  _Q.setFromEuler(_E);
  _S.x *= sig.scaleX * sig.shellScale * (1 + activity * 0.08);
  _S.y *= sig.scaleY * sig.shellScale * (1 + activity * 0.06);
  _S.z *= sig.scaleZ * sig.shellScale * (1 + activity * 0.08);
  _M.compose(_P, _Q, _S);
  shellMesh.setMatrixAt(shellSlot, _M);
  const hue = (sig.accentHue + activity * 0.06) % 1;
  shellMesh.setColorAt(
    shellSlot,
    new THREE.Color().setHSL(hue < 0 ? hue + 1 : hue, 0.8, 0.48 + activity * 0.12),
  );
}

// ── Per-glyph stellated accent motes (100 unique micro-shells) ────────────────

/** Compound of two dual tetrahedra — a stella octangula (8-pointed star). */
function stellaOctangulaGeometry(): THREE.BufferGeometry {
  const positions = new Float32Array([
    // Tetrahedron A (product +1)
    1, 1, 1, 1, -1, -1, -1, 1, -1, -1, -1, 1,
    // Tetrahedron B (product -1)
    -1, -1, -1, -1, 1, 1, 1, -1, 1, 1, 1, -1,
  ]);
  const indices = new Uint16Array([
    0, 1, 2, 0, 3, 1, 0, 2, 3, 1, 3, 2, 4, 6, 5, 4, 5, 7, 4, 7, 6, 5, 6, 7,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  geo.computeVertexNormals();
  return geo;
}

export class GlyphAccentMotes {
  readonly mesh: THREE.InstancedMesh;
  private readonly scratch = new THREE.Color();
  private readonly identity = new THREE.Matrix4();
  private dirty = false;

  constructor(parent: THREE.Group, count = 100) {
    this.mesh = new THREE.InstancedMesh(
      stellaOctangulaGeometry(),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      count,
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 15;
    for (let i = 0; i < count; i++) {
      this.mesh.setMatrixAt(i, this.identity);
    }
    parent.add(this.mesh);
  }

  setAt(
    gIdx: number,
    bodyMatrix: THREE.Matrix4,
    sig: GlyphExteriorSignature,
    activity: number,
    t: number,
  ): void {
    const st = t * CREATURE_EXTERIOR_TIME_SCALE;
    bodyMatrix.decompose(_P, _Q, _S);
    // Each mote orbits its glyph on a signature-driven ellipse.
    const orbitR = 0.8 + sig.accentScale * 0.55;
    const th = st * sig.wanderAz + sig.wanderPhase;
    const phi = st * sig.wanderAy * 0.7 + sig.rotBias;
    const offX = Math.cos(th) * orbitR;
    const offY = Math.sin(phi) * orbitR * 0.55;
    const offZ = Math.sin(th) * orbitR;
    _P.x += _S.x * 0.16 * offX;
    _P.y += _S.y * 0.16 * offY;
    _P.z += _S.z * 0.16 * offZ;
    _E.setFromQuaternion(_Q);
    _E.x += st * 0.12 + sig.rotBias;
    _E.y += st * 0.18;
    _E.z += st * 0.08;
    _Q.setFromEuler(_E);
    const sc = 0.22 * sig.accentScale * (1 + activity * 0.35);
    _S.set(_S.x * sc, _S.y * sc, _S.z * sc);
    _M.compose(_P, _Q, _S);
    this.mesh.setMatrixAt(gIdx, _M);
    this.scratch.setHSL((sig.accentHue + activity * 0.08) % 1, 0.9, 0.55);
    this.mesh.setColorAt(gIdx, this.scratch);
    this.dirty = true;
  }

  finish(): void {
    if (this.dirty) {
      this.mesh.instanceMatrix.needsUpdate = true;
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
      this.dirty = false;
    }
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

// ── Per-glyph energy filaments + spore motes (image-ref colour layers) ────────

export class GlyphFilamentBurst {
  readonly mesh: THREE.InstancedMesh;
  private readonly scratch = new THREE.Color();
  private dirty = false;

  constructor(parent: THREE.Group, count = 100) {
    this.mesh = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.04, 0.55, 4),
      new THREE.MeshBasicMaterial({
        color: 0xaaddff,
        wireframe: true,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      count,
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 16;
    parent.add(this.mesh);
  }

  setAt(
    gIdx: number,
    bodyMatrix: THREE.Matrix4,
    filamentHue: number,
    sig: GlyphExteriorSignature,
    activity: number,
    t: number,
  ): void {
    const st = t * CREATURE_EXTERIOR_TIME_SCALE;
    bodyMatrix.decompose(_P, _Q, _S);
    _E.setFromQuaternion(_Q);
    _E.x += Math.sin(st * sig.wanderAx + sig.rotBias) * 0.4;
    _E.y += st * 0.08 + sig.wanderPhase;
    _E.z += Math.cos(st * sig.wanderAz + sig.rotBias) * 0.35;
    _Q.setFromEuler(_E);
    const sc = 0.35 + sig.accentScale * 0.25 + activity * 0.2;
    _S.set(_S.x * sc * 0.08, _S.y * sc * 0.35, _S.z * sc * 0.08);
    _M.compose(_P, _Q, _S);
    this.mesh.setMatrixAt(gIdx, _M);
    this.scratch.setHSL(filamentHue % 1, 0.75, 0.55 + activity * 0.15);
    this.mesh.setColorAt(gIdx, this.scratch);
    this.dirty = true;
  }

  finish(): void {
    if (this.dirty) {
      this.mesh.instanceMatrix.needsUpdate = true;
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
      this.dirty = false;
    }
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

export class GlyphSporeAura {
  readonly mesh: THREE.InstancedMesh;
  private readonly scratch = new THREE.Color();
  private dirty = false;

  constructor(parent: THREE.Group, count = 100) {
    this.mesh = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.12, 0),
      new THREE.MeshBasicMaterial({
        color: 0x44ccaa,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      count,
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 13;
    parent.add(this.mesh);
  }

  setAt(
    gIdx: number,
    bodyMatrix: THREE.Matrix4,
    sporeHue: number,
    sig: GlyphExteriorSignature,
    activity: number,
    t: number,
  ): void {
    const st = t * CREATURE_EXTERIOR_TIME_SCALE;
    bodyMatrix.decompose(_P, _Q, _S);
    const th = st * 0.06 + sig.wanderPhase + gIdx * 0.04;
    _P.x += Math.cos(th) * _S.x * 0.22;
    _P.y += Math.sin(th * 1.3) * _S.y * 0.18;
    _P.z += Math.sin(th) * _S.z * 0.2;
    const sc = 0.4 + sig.accentScale * 0.3 + activity * 0.25;
    _S.setScalar(sc * 0.15);
    _M.compose(_P, _Q, _S);
    this.mesh.setMatrixAt(gIdx, _M);
    this.scratch.setHSL(sporeHue % 1, 0.7, 0.48 + activity * 0.12);
    this.mesh.setColorAt(gIdx, this.scratch);
    this.dirty = true;
  }

  finish(): void {
    if (this.dirty) {
      this.mesh.instanceMatrix.needsUpdate = true;
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
      this.dirty = false;
    }
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

export function attachGlyphWireHalos(
  parent: THREE.Group,
  meshes: THREE.InstancedMesh[],
): THREE.InstancedMesh[] {
  const halos: THREE.InstancedMesh[] = [];
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0x66aaff,
    wireframe: true,
    transparent: true,
    opacity: 0.14,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  for (const src of meshes) {
    const halo = new THREE.InstancedMesh(src.geometry, haloMat.clone(), src.count);
    halo.frustumCulled = false;
    halo.renderOrder = src.renderOrder + 1;
    parent.add(halo);
    halos.push(halo);
  }
  return halos;
}

/** Copy instanced transforms to wire halos with per-glyph scale skew. */
export function syncGlyphWireHalos(
  src: THREE.InstancedMesh,
  halo: THREE.InstancedMesh,
  activity: Float32Array | null,
  bodies?: readonly { gIdx: number; sig?: GlyphExteriorSignature }[],
  scaleBoost = 1.12,
): void {
  for (let i = 0; i < src.count; i++) {
    src.getMatrixAt(i, _M);
    _M.decompose(_P, _Q, _S);
    const gIdx = bodies?.[i]?.gIdx ?? i;
    const sig = bodies?.[i]?.sig;
    const ba = activity?.[gIdx] ?? 0;
    if (sig) {
      _S.x *= sig.scaleX * scaleBoost * (1 + ba * 0.1);
      _S.y *= sig.scaleY * scaleBoost * (1 + ba * 0.08);
      _S.z *= sig.scaleZ * scaleBoost * (1 + ba * 0.1);
    } else {
      _S.multiplyScalar(scaleBoost + ba * 0.12);
    }
    _M.compose(_P, _Q, _S);
    halo.setMatrixAt(i, _M);
  }
  halo.instanceMatrix.needsUpdate = true;
}

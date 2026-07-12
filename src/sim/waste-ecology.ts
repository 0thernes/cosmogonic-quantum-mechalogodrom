/**
 * XENO WASTE ECOLOGY — metabolic pollution as fertilizer + self-building alien constructs.
 *
 * Pipeline (not earthly compost):
 *  1. Beings graze → wasteLoad accrues (excretion / phase-sludge).
 *  2. Waste drains into a world grid as pollution (gas + ground slurry).
 *  3. Flora regrow is boosted by local waste (fertilizer); waste is partially consumed.
 *  4. High waste nucleates / grows bizarro self-building constructs that adapt:
 *     - grow with feedstock, shrink when starved
 *     - thrash/react to nearby contact pressure
 *     - mutate form tier as they mature (unknown-phenomena look, not trees)
 *
 * DETERMINISM: positional hash for appearance; deposits from entity state only.
 * No Math.random / Date.now. O(grid + constructs + strided deposits).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PLATFORM_HALF } from './constants';
import { baseTerrainHeightAt } from './terrain-profile';

const GRID_N = 56;
const CELL = (PLATFORM_HALF * 2) / GRID_N;
const MAX_CONSTRUCTS = 72;

function hash(n: number): number {
  const s = Math.sin(n * 91.7 + 17.3 + 0x5eede001 * 0.00001) * 43758.5453;
  return s - Math.floor(s);
}

function adopt(g: THREE.BufferGeometry): THREE.BufferGeometry {
  if (!g.index) return g;
  const ni = g.toNonIndexed();
  g.dispose();
  return ni;
}

function mergeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const a = parts.map(adopt);
  const m = mergeGeometries(a);
  for (const p of a) if (p !== m) p.dispose();
  return m ?? new THREE.BoxGeometry(1, 1, 1);
}

/** Tier-0: sludge mound (early nucleation). */
function makeTier0(seed: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const n = 3 + Math.floor(hash(seed) * 3);
  for (let i = 0; i < n; i++) {
    const b = new THREE.BoxGeometry(
      0.8 + hash(seed + i) * 1.2,
      0.6 + hash(seed + i * 2) * 0.9,
      0.7 + hash(seed + i * 3) * 1.0,
    );
    b.rotateY(hash(seed + i * 5) * 6.28);
    b.translate((hash(seed + i * 7) - 0.5) * 1.4, 0.4 + i * 0.5, (hash(seed + i * 9) - 0.5) * 1.4);
    parts.push(b);
  }
  return mergeParts(parts);
}

/** Tier-1: knotted spine + lobes (maturing). */
function makeTier1(seed: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const w = 0.5 + Math.sin(t * Math.PI) * 1.2 + hash(seed + i) * 0.6;
    const b = new THREE.BoxGeometry(w, 0.85, w * 0.7);
    b.rotateY(i * 0.7 + hash(seed) * 2);
    b.rotateZ((hash(seed + i) - 0.5) * 0.6);
    b.translate((hash(seed + i * 3) - 0.5) * 0.9, t * 4.2, (hash(seed + i * 5) - 0.5) * 0.9);
    parts.push(b);
  }
  const k = new THREE.TorusKnotGeometry(0.85, 0.26, 48, 6, 2, 3);
  k.translate(0, 2.4, 0);
  k.rotateX(0.4 + hash(seed) * 0.8);
  parts.push(k);
  return mergeParts(parts);
}

/** Tier-2: full xeno abomination (mature — multi-knot + crystals). */
function makeTier2(seed: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const w = 0.7 + Math.sin(t * Math.PI) * 1.5 + hash(seed + i * 2) * 0.8;
    const b = new THREE.BoxGeometry(w, 1.0, w * (0.55 + hash(seed + i) * 0.5));
    b.rotateY(i * 0.55);
    b.rotateZ((hash(seed + i * 3) - 0.5) * 0.7);
    b.translate((hash(seed + i * 7) - 0.5) * 1.3, t * 5.5, (hash(seed + i * 11) - 0.5) * 1.3);
    parts.push(b);
  }
  const k1 = new THREE.TorusKnotGeometry(1.1, 0.32, 56, 7, 3, 2);
  k1.translate(0, 2.8, 0);
  k1.rotateZ(0.5);
  parts.push(k1);
  const k2 = new THREE.TorusKnotGeometry(0.7, 0.2, 40, 6, 2, 5);
  k2.translate(0.6, 4.2, -0.4);
  k2.rotateX(1.1);
  parts.push(k2);
  const o = new THREE.OctahedronGeometry(0.9 + hash(seed) * 0.5, 0);
  o.translate(0, 5.8, 0);
  parts.push(o);
  const ring = new THREE.TorusGeometry(1.4, 0.12, 6, 20);
  ring.rotateX(Math.PI / 2 + 0.3);
  ring.translate(0, 3.5, 0);
  parts.push(ring);
  return mergeParts(parts);
}

interface Construct {
  mesh: THREE.Mesh;
  x: number;
  z: number;
  growth: number;
  target: number;
  hue: number;
  sat: number;
  light: number;
  tier: number;
  phase: number;
  react: number;
}

export class WasteEcology {
  private readonly waste: Float32Array;
  private readonly gas: Float32Array;
  private readonly gridN = GRID_N;
  private readonly half = PLATFORM_HALF;
  private readonly constructs: Construct[] = [];
  private readonly geos: THREE.BufferGeometry[][] = [[], [], []];
  private readonly baseMat: THREE.MeshStandardMaterial;
  private readonly scene: THREE.Scene;
  private strideCursor = 0;
  private contactX = 99999;
  private contactZ = 99999;
  private contactS = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.waste = new Float32Array(GRID_N * GRID_N);
    this.gas = new Float32Array(GRID_N * GRID_N);
    this.baseMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.48,
      metalness: 0.42,
      emissive: 0x1a0810,
      emissiveIntensity: 0.55,
      flatShading: true,
    });
    for (let i = 0; i < 6; i++) {
      this.geos[0]!.push(makeTier0(i * 97 + 3));
      this.geos[1]!.push(makeTier1(i * 91 + 11));
      this.geos[2]!.push(makeTier2(i * 83 + 19));
    }
  }

  /** Optional being-contact seed so constructs thrash when touched. */
  setContact(x: number, z: number, strength: number): void {
    this.contactX = x;
    this.contactZ = z;
    this.contactS = strength < 0 ? 0 : strength > 1 ? 1 : strength;
  }

  fertilizerAt(x: number, z: number): number {
    const i = this.indexAt(x, z);
    if (i < 0) return 0;
    const w = (this.waste[i] ?? 0) * 0.75 + (this.gas[i] ?? 0) * 0.35;
    return w < 0 ? 0 : w > 1 ? 1 : w;
  }

  /** Flora regrow multiplier ~0.7..2.2 from local pollution. */
  regrowBoost(x: number, z: number): number {
    const f = this.fertilizerAt(x, z);
    return 0.72 + f * 1.45;
  }

  deposit(x: number, z: number, amount: number): void {
    if (!Number.isFinite(amount) || amount === 0) return;
    const i = this.indexAt(x, z);
    if (i < 0) return;
    const a = amount > 0.4 ? 0.4 : amount < -0.55 ? -0.55 : amount;
    // Split deposit: ground slurry + airborne phase gas (weird, not earthly compost).
    const ground = a * 0.62;
    const air = a * 0.38;
    const w = (this.waste[i] ?? 0) + ground;
    const g = (this.gas[i] ?? 0) + air;
    this.waste[i] = w < 0 ? 0 : w > 1 ? 1 : w;
    this.gas[i] = g < 0 ? 0 : g > 1 ? 1 : g;
  }

  update(
    dt: number,
    list: ReadonlyArray<{
      position: { x: number; y: number; z: number };
      userData: { wasteLoad?: number; energy?: number };
    }>,
    t: number,
  ): void {
    const h = dt > 0.05 ? 0.05 : dt > 0 ? dt : 0;
    if (h <= 0) return;

    const n = list.length;
    const stride = Math.max(1, Math.floor(n / 100));
    const start = this.strideCursor % stride;
    this.strideCursor = (this.strideCursor + 1) % stride;
    for (let i = start; i < n; i += stride) {
      const e = list[i];
      if (!e) continue;
      const u = e.userData;
      let load = u.wasteLoad ?? 0;
      // Passive metabolic bleed when energy high (pee/gas of the rich).
      const energy = typeof u.energy === 'number' ? u.energy : 50;
      if (energy > 70) load = Math.min(1, load + (energy - 70) * 0.0008 * h * 8);
      if (load < 0.015) {
        u.wasteLoad = load;
        continue;
      }
      const dump = Math.min(load, 0.15 * h * 10);
      this.deposit(e.position.x, e.position.z, dump);
      u.wasteLoad = load - dump;
    }

    // Diffuse gas slightly (weird airborne pollution field) + decay both layers.
    const cells = this.waste.length;
    const gn = this.gridN;
    for (let i = 0; i < cells; i++) {
      let w = this.waste[i] ?? 0;
      let g = this.gas[i] ?? 0;
      if (w < 1e-5 && g < 1e-5) continue;
      // Neighbor gas bleed (not full PDE — cheap halo).
      const ix = i % gn;
      const iz = (i / gn) | 0;
      let gSum = g;
      let gc = 1;
      if (ix > 0) {
        gSum += this.gas[i - 1] ?? 0;
        gc++;
      }
      if (ix < gn - 1) {
        gSum += this.gas[i + 1] ?? 0;
        gc++;
      }
      if (iz > 0) {
        gSum += this.gas[i - gn] ?? 0;
        gc++;
      }
      if (iz < gn - 1) {
        gSum += this.gas[i + gn] ?? 0;
        gc++;
      }
      const gMean = gSum / gc;
      g = g * 0.82 + gMean * 0.18;
      w *= Math.exp(-0.055 * h);
      g *= Math.exp(-0.12 * h);
      this.waste[i] = w;
      this.gas[i] = g < 0 ? 0 : g > 1 ? 1 : g;

      const density = w * 0.7 + g * 0.45;
      if (
        density > 0.48 &&
        this.constructs.length < MAX_CONSTRUCTS &&
        hash(i * 13 + Math.floor(t * 0.7)) > 0.988
      ) {
        this.trySpawn(i);
      }
    }

    // Grow / adapt / thrash constructs.
    for (let c = this.constructs.length - 1; c >= 0; c--) {
      const con = this.constructs[c]!;
      const fert = this.fertilizerAt(con.x, con.z);
      const grow = (0.1 + fert * 0.55) * h * (1 + con.react * 0.4);
      con.growth = Math.min(con.target, con.growth + grow);
      this.deposit(con.x, con.z, -grow * 0.42);

      // Contact thrash (being nearby → reactive morph amp).
      const dx = con.x - this.contactX;
      const dz = con.z - this.contactZ;
      const d2 = dx * dx + dz * dz;
      const near = d2 < 22 * 22 ? this.contactS * (1 - Math.sqrt(d2) / 22) : 0;
      con.react += (near - con.react) * Math.min(1, h * 4);

      // Tier evolution as growth matures (self-adaptation of form).
      const wantTier = con.growth > con.target * 0.72 ? 2 : con.growth > con.target * 0.38 ? 1 : 0;
      if (wantTier !== con.tier) this.setTier(con, wantTier);

      const bob = Math.sin(t * (1.2 + con.phase) + con.hue * 8) * (0.15 + con.react * 0.55);
      const y = baseTerrainHeightAt(con.x, con.z) + con.growth * 0.55 + bob;
      con.mesh.position.set(con.x, y, con.z);
      const s = 0.3 + con.growth * (0.85 + con.react * 0.35);
      const squash = 1 - con.react * 0.12;
      con.mesh.scale.set(s * squash * (0.9 + 0.1 * Math.sin(t + con.phase)), s, s * squash);
      con.mesh.rotation.y = t * (0.12 + con.phase * 0.2) * (0.5 + con.hue) + con.react * 1.8;
      con.mesh.rotation.z = Math.sin(t * 2 + con.phase) * con.react * 0.35;

      const mat = con.mesh.material as THREE.MeshStandardMaterial;
      // Living chroma: pollution + growth shifts hue/sat (unknown phenomena, not brown dirt).
      const hLive = (con.hue + t * 0.02 * (0.3 + fert) + con.react * 0.08) % 1;
      const sLive = Math.min(1, con.sat + fert * 0.25 + con.react * 0.2);
      const lLive = Math.min(0.48, con.light + con.growth * 0.04 + fert * 0.08);
      mat.color.setHSL(hLive, sLive, lLive);
      mat.emissive.setHSL((hLive + 0.15) % 1, Math.min(1, sLive + 0.1), 0.12 + fert * 0.2);
      mat.emissiveIntensity = 0.35 + fert * 0.9 + con.react * 0.7 + con.growth * 0.15;

      if (con.growth >= con.target - 0.02 && fert < 0.04) {
        con.target *= 0.94;
        if (con.target < 0.35) {
          this.scene.remove(con.mesh);
          (con.mesh.material as THREE.Material).dispose();
          this.constructs.splice(c, 1);
        }
      }
    }
  }

  private setTier(con: Construct, tier: number): void {
    const bank = this.geos[tier]!;
    const geo = bank[Math.floor(hash(con.x * 3 + con.z * 7 + tier * 17) * bank.length)]!;
    con.mesh.geometry = geo;
    con.tier = tier;
  }

  private trySpawn(cell: number): void {
    const ix = cell % this.gridN;
    const iz = (cell / this.gridN) | 0;
    const x = -this.half + (ix + 0.5) * CELL;
    const z = -this.half + (iz + 0.5) * CELL;
    for (const c of this.constructs) {
      const dx = c.x - x;
      const dz = c.z - z;
      if (dx * dx + dz * dz < 12 * 12) return;
    }
    // Alien pigment — never grey/brown sludge: teal/magenta/void-gold/violet/blood.
    const palette = [
      [0.52, 0.9, 0.22],
      [0.88, 0.95, 0.28],
      [0.12, 0.92, 0.2],
      [0.72, 0.85, 0.18],
      [0.05, 0.88, 0.25],
      [0.42, 0.7, 0.16],
    ] as const;
    const pig = palette[Math.floor(hash(cell * 11) * palette.length)]!;
    const mat = this.baseMat.clone();
    mat.color.setHSL(pig[0]!, pig[1]!, pig[2]!);
    mat.emissive.setHSL((pig[0]! + 0.12) % 1, 0.9, 0.14);
    const geo = this.geos[0]![Math.floor(hash(cell * 3) * this.geos[0]!.length)]!;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, baseTerrainHeightAt(x, z), z);
    mesh.scale.setScalar(0.15);
    mesh.frustumCulled = true;
    this.scene.add(mesh);
    this.constructs.push({
      mesh,
      x,
      z,
      growth: 0.12,
      target: 1.4 + hash(cell * 13) * 2.8,
      hue: pig[0]!,
      sat: pig[1]!,
      light: pig[2]!,
      tier: 0,
      phase: hash(cell * 19),
      react: 0,
    });
    this.waste[cell] = Math.max(0, (this.waste[cell] ?? 0) - 0.32);
    this.gas[cell] = Math.max(0, (this.gas[cell] ?? 0) - 0.18);
  }

  private indexAt(x: number, z: number): number {
    const ix = Math.floor((x + this.half) / CELL);
    const iz = Math.floor((z + this.half) / CELL);
    if (ix < 0 || iz < 0 || ix >= this.gridN || iz >= this.gridN) return -1;
    return iz * this.gridN + ix;
  }

  dispose(): void {
    for (const c of this.constructs) {
      this.scene.remove(c.mesh);
      (c.mesh.material as THREE.Material).dispose();
    }
    this.constructs.length = 0;
    for (const bank of this.geos) {
      for (const g of bank) g.dispose();
      bank.length = 0;
    }
    this.baseMat.dispose();
  }
}

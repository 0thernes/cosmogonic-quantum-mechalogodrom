import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp } from '../math/scalar';
import { mulberry32 } from '../math/rng';
import { GROUND_EXTENT } from './constants';

const SPECIES_COUNT = 50;
const PLANT_COUNT = 10000;
const GRID_RES = 100;
const CELL_SIZE = GROUND_EXTENT / GRID_RES;
const GROUND_CLEAR_RADIUS = 55;
const GROUND_CLEAR_RADIUS2 = GROUND_CLEAR_RADIUS * GROUND_CLEAR_RADIUS;
const GROUND_Y = 0;
const WIND_SPEED = 1.2;
const MAX_LEAN = 0.45;

const TAU = Math.PI * 2;

function hash11(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function hash12(i: number, j: number): number {
  return hash11(i * 31.1 + j * 17.7 + 5.3);
}

interface PlantSpecies {
  readonly geo: THREE.BufferGeometry;
  readonly mat: THREE.MeshStandardMaterial;
  readonly mesh: THREE.InstancedMesh;
  readonly maxHeight: number;
  readonly stiffness: number;
  readonly baseColor: THREE.Color;
  readonly seed: number;
  count: number;
}

interface Plant {
  readonly species: number;
  readonly slot: number;
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
  readonly scale: number;
  readonly phase: number;
  leanX: number; // for touch physics response (user #16)
  leanZ: number;
}

/** Ground height sampler for attaching plants to moving/ deformed ground (user #15). */
export type GroundSampler = (x: number, z: number) => number;
/** Normal for slope angle accurate orientation. */
export type GroundNormalSampler = (x: number, z: number) => { nx: number; ny: number; nz: number };

/** Alien corkscrew vine top — a curved TubeGeometry around a rising helix. */
function corkscrewGeo(stemR: number, stemH: number): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const ang = t * Math.PI * 6;
    const r = stemR * (1.5 - 0.8 * t);
    pts.push(new THREE.Vector3(Math.cos(ang) * r, t * stemH * 0.65, Math.sin(ang) * r));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, stemR * 0.45, 6, false);
}

function buildSpeciesGeometry(seed: number): {
  geo: THREE.BufferGeometry;
  maxHeight: number;
  stiffness: number;
  baseColor: THREE.Color;
} {
  const rng = mulberry32(seed);
  const kind = Math.floor(rng() * 10);
  const hue = rng();
  const sat = 0.5 + rng() * 0.5;
  const lit = 0.25 + rng() * 0.45;
  const color = new THREE.Color().setHSL(hue, sat, lit);
  const stemH = 2.5 + rng() * 10.5;
  const stemR = 0.15 + rng() * 0.5;
  const stiffness = 0.15 + rng() * 0.85;

  const stem = new THREE.CylinderGeometry(stemR * 0.6, stemR, stemH, 8, 4);
  let top: THREE.BufferGeometry;
  switch (kind) {
    case 0:
      top = new THREE.ConeGeometry(stemR * 4, stemH * 0.6, 9, 4);
      break;
    case 1:
      top = new THREE.SphereGeometry(stemR * 3, 10, 8);
      break;
    case 2:
      top = new THREE.IcosahedronGeometry(stemR * 3.2, 1);
      break;
    case 3:
      top = new THREE.TorusGeometry(stemR * 2, stemR * 0.6, 8, 18);
      break;
    case 4:
      top = new THREE.BoxGeometry(stemR * 5, stemH * 0.35, stemR * 1.6);
      break;
    case 5:
      top = new THREE.OctahedronGeometry(stemR * 2.8, 1);
      break;
    case 6:
      top = new THREE.DodecahedronGeometry(stemR * 2.6, 0);
      break;
    // USER #15/16: freakier alien flora shapes.
    case 7:
      top = corkscrewGeo(stemR, stemH);
      break;
    case 8:
      top = new THREE.TorusKnotGeometry(stemR * 2.2, stemR * 0.45, 48, 8, 2, 3);
      break;
    default: {
      // Bell / urn lathe profile.
      const profile: THREE.Vector2[] = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const x = stemR * (0.5 + 3.5 * Math.sin(t * Math.PI));
        const y = t * stemH * 0.55;
        profile.push(new THREE.Vector2(x, y));
      }
      top = new THREE.LatheGeometry(profile, 12);
    }
  }
  top.translate(0, stemH * 0.5, 0);
  const stemGeo = stem.index ? stem.toNonIndexed() : stem;
  const topGeo = top.index ? top.toNonIndexed() : top;
  const merged = mergeGeometries([stemGeo, topGeo]);
  const geo = (merged ?? stem) as THREE.BufferGeometry;
  geo.translate(0, stemH * 0.5, 0);
  // toNonIndexed() always returns a NEW BufferGeometry distinct from its source when indexed, and
  // mergeGeometries() does not dispose its inputs — without this, every species build orphaned up to
  // 4 GPU geometries (stem/top + their toNonIndexed copies) that Vegetation.dispose() can never reach,
  // since only the final `geo` is kept on the species record.
  for (const g of new Set([stem, top, stemGeo, topGeo])) {
    if (g !== geo) g.dispose();
  }

  const box = new THREE.Box3().setFromObject(new THREE.Mesh(geo));
  const maxHeight = box.max.y - box.min.y;
  return { geo, maxHeight, stiffness, baseColor: color };
}

function buildSpecies(seed: number, maxCount: number): PlantSpecies {
  const { geo, maxHeight, stiffness, baseColor } = buildSpeciesGeometry(seed);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.55,
    metalness: 0.12,
    emissive: baseColor,
    emissiveIntensity: 0.18,
  });
  (mat as any).userData = { uniforms: { uTime: { value: 0 } } };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = (mat as any).userData.uniforms.uTime;
    shader.vertexShader = `
      uniform float uTime;
      varying vec3 vWorldPos;
      ${shader.vertexShader}
    `.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      vWorldPos = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
      // Alien vegetation pulsing and twisting
      float pulse = sin(uTime * 2.0 + vWorldPos.x * 0.1 + vWorldPos.z * 0.1) * 0.1;
      transformed.x += sin(transformed.y * 3.0 + uTime) * pulse;
      transformed.z += cos(transformed.y * 3.0 + uTime) * pulse;
      `,
    );
    shader.fragmentShader = `
      uniform float uTime;
      varying vec3 vWorldPos;
      ${shader.fragmentShader}
    `.replace(
      '#include <emissivemap_fragment>',
      `
      #include <emissivemap_fragment>
      // Alien bioluminescence waves
      float bioWave = sin(uTime * 3.0 - vWorldPos.y * 0.5 + vWorldPos.x * 0.2) * 0.5 + 0.5;
      totalEmissiveRadiance *= (0.5 + bioWave * 2.5);
      `,
    );
  };
  const mesh = new THREE.InstancedMesh(geo, mat, maxCount);
  mesh.frustumCulled = true;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  return {
    geo,
    mat,
    mesh,
    maxHeight,
    stiffness,
    baseColor,
    seed,
    count: 0,
  };
}

export class Vegetation {
  private readonly group = new THREE.Group();
  private readonly species: PlantSpecies[];
  private readonly plants: Plant[];
  private readonly speciesSlots: number[];
  private readonly tmpColor = new THREE.Color();
  private readonly M = new THREE.Matrix4();
  private readonly Q = new THREE.Quaternion();
  private readonly slopeQ = new THREE.Quaternion();
  private readonly slopeN = new THREE.Vector3(0, 1, 0);
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly E = new THREE.Euler();
  private readonly P = new THREE.Vector3();
  private readonly S = new THREE.Vector3();
  private groundSampler: GroundSampler | null = null;
  private groundNormalSampler: GroundNormalSampler | null = null;
  private windTime = 0;
  private windStrength = 0.3;
  private chaos = 0;

  constructor(scene: THREE.Scene) {
    const rng = mulberry32(0xca1e3);
    this.species = [];
    for (let i = 0; i < SPECIES_COUNT; i++) {
      this.species.push(buildSpecies(0x9e3779b9 + i * 0x61c88647, PLANT_COUNT));
    }
    this.speciesSlots = Array.from({ length: SPECIES_COUNT }, () => 0);
    this.plants = [];

    const half = GROUND_EXTENT / 2;
    const min = -half + CELL_SIZE * 0.5;
    for (let i = 0; i < GRID_RES; i++) {
      for (let j = 0; j < GRID_RES; j++) {
        const gx = min + i * CELL_SIZE;
        const gz = min + j * CELL_SIZE;
        const r2 = gx * gx + gz * gz;
        if (r2 < GROUND_CLEAR_RADIUS2) continue;
        const gap = hash12(i, j);
        if (gap < 0.12) continue;
        if (gap > 0.92) continue;
        const path = Math.abs(i - GRID_RES / 2) < 2 || Math.abs(j - GRID_RES / 2) < 2;
        if (path && gap < 0.5) continue;
        const x = gx + (rng() - 0.5) * CELL_SIZE * 0.75;
        const z = gz + (rng() - 0.5) * CELL_SIZE * 0.75;
        const speciesIdx =
          Math.floor(hash12(i * 3 + j * 7, i * 11 + j * 13) * SPECIES_COUNT) % SPECIES_COUNT;
        const s = this.species[speciesIdx]!;
        const slot = this.speciesSlots[speciesIdx]!;
        if (slot >= PLANT_COUNT) continue;
        const scale = 0.55 + (rng() * 0.7 + hash12(i + j, j)) * 0.75;
        const yaw = rng() * TAU;
        const phase = rng() * TAU;
        const plant: Plant = {
          species: speciesIdx,
          slot,
          x,
          z,
          yaw,
          scale,
          phase,
          leanX: 0,
          leanZ: 0,
        };
        this.plants.push(plant);
        this.speciesSlots[speciesIdx] = slot + 1;
        s.count = slot + 1;
        s.mesh.setColorAt(slot, this.tintColor(s.baseColor, rng() * 0.14));
      }
    }
    for (const s of this.species) {
      s.mesh.count = s.count;
      if (s.mesh.instanceColor) s.mesh.instanceColor.needsUpdate = true;
    }
    this.update(0, 0);
    for (const s of this.species) {
      this.group.add(s.mesh);
    }
    scene.add(this.group);
  }

  private tintColor(base: THREE.Color, shift: number): THREE.Color {
    const h = { h: 0, s: 0, l: 0 };
    base.getHSL(h);
    return this.tmpColor.setHSL(
      (h.h + shift) % 1,
      clamp(h.s + shift * 0.3, 0, 1),
      clamp(h.l + shift * 0.2, 0, 1),
    );
  }

  setWindStrength(w: number): void {
    this.windStrength = clamp(w, 0, 2);
  }

  setChaos(c: number): void {
    this.chaos = clamp(c, 0, 1);
  }

  update(t: number, _dt: number): void {
    this.windTime = t * WIND_SPEED * (1 + this.chaos * 2.5);
    for (const s of this.species) {
      if ((s.mat as any).userData?.uniforms) {
        (s.mat as any).userData.uniforms.uTime.value = t;
      }
    }
    for (let i = 0; i < this.plants.length; i++) {
      const p = this.plants[i]!;
      const s = this.species[p.species]!;
      const wind =
        Math.sin(this.windTime + p.x * 0.018 + p.z * 0.012) * 0.5 +
        Math.sin(this.windTime * 1.7 + p.x * 0.041 - p.z * 0.027) * 0.3;
      const lean =
        (wind * this.windStrength * (1 - s.stiffness * 0.6) +
          Math.sin(p.phase + this.windTime * 0.5) * 0.08) *
        (1 + this.chaos * 0.6);
      // USER #15/#16: combine wind lean with contact physics lean, and use ground sampler for height
      const contactX = p.leanX || 0;
      const contactZ = p.leanZ || 0;
      const totalLeanX = clamp(lean * Math.cos(p.yaw + 0.7) + contactX, -MAX_LEAN, MAX_LEAN);
      const totalLeanZ = clamp(lean * Math.sin(p.yaw + 0.7) + contactZ, -MAX_LEAN, MAX_LEAN);
      this.E.set(totalLeanX, p.yaw, totalLeanZ);
      this.Q.setFromEuler(this.E);
      let gy = GROUND_Y;
      if (this.groundSampler) gy = this.groundSampler(p.x, p.z);
      if (this.groundNormalSampler) {
        const n = this.groundNormalSampler(p.x, p.z);
        this.slopeN.set(n.nx, n.ny, n.nz).normalize();
        this.slopeQ.setFromUnitVectors(this.up, this.slopeN);
        this.Q.premultiply(this.slopeQ);
      }
      this.P.set(p.x, gy + s.maxHeight * 0.02 * p.scale, p.z);
      this.S.set(p.scale, p.scale, p.scale);
      this.M.compose(this.P, this.Q, this.S);
      s.mesh.setMatrixAt(p.slot, this.M);
      // damp contact lean (ragdoll spring back — stiffness-aware)
      const stiff = s.stiffness;
      p.leanX = contactX * (0.9 + stiff * 0.05);
      p.leanZ = contactZ * (0.9 + stiff * 0.05);
    }
    for (const s of this.species) {
      s.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  dispose(): void {
    for (const s of this.species) {
      s.geo.dispose();
      s.mat.dispose();
      s.mesh.dispose();
    }
    this.group.removeFromParent();
  }

  // USER #15/#16: ground attachment + touch response (ragdoll-ish, angle accurate, alien flora)
  // Called from world after construction. Plants now move with ground deformation and react to entity contact.
  attachGround(sampler: GroundSampler, normal?: GroundNormalSampler): void {
    this.groundSampler = sampler;
    this.groundNormalSampler = normal ?? null;
  }

  applyContact(x: number, z: number, strength: number): void {
    // simple impulse on lean for nearby plants (wired in update)
    for (const p of this.plants) {
      const dx = p.x - x,
        dz = p.z - z;
      const d2 = dx * dx + dz * dz;
      if (d2 < 144 && d2 > 0.01) {
        const f = strength * (1 - d2 / 144);
        p.leanX = (p.leanX || 0) + dx * f * 0.07;
        p.leanZ = (p.leanZ || 0) + dz * f * 0.07;
      }
    }
  }
}

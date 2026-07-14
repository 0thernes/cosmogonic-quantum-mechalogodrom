/**
 * CRYSTAL ECOSYSTEM — the supplied Crystal Ecosystem V9 tree, rebuilt as one native world subsystem.
 *
 * The source JSX owned a second renderer/camera/terrain and expressed one visible branch as one Mesh.
 * At its full census that meant 6,000–9,000 branch draws plus ~1,100 fauna draws, repeated full-buffer
 * foliage uploads, and global Math.random decisions. This implementation keeps the authored ecosystem
 * and exact headline census while changing the delivery mechanism:
 *
 * - one indexed trunk draw + one indexed merged roots/branches draw;
 * - exactly 10k leaves, 10k fruits, and 10k flowers in three fixed pooled InstancedMeshes;
 * - 250 classical, quantum-inspired tree beings in ten instanced species pools;
 * - 99 ambient beings in five instanced pools, 5,000 GPU-animated motes, 50 crystal relics;
 * - five local pulse lights, an upper-canopy hex sigil, eight lightning wisps, and four haze veils;
 * - pooled fruit and leaf depletion/regrowth, peaceful reserved feeding, observation/collapse,
 *   entangled partner reactions, climbing, orbiting, swarming, fluttering, tunnelling, and tree shake;
 * - one isolated seeded stream, no Worker/Promise boundary, no React/Tone/second AudioContext.
 *
 * The ten "quantum" traits are deterministic classical state/visual metaphors. They are not physical
 * quantum effects or evidence of consciousness. World owns time, pause, input, camera, audio, and render.
 */
import * as THREE from 'three';
import { mulberry32, type Rng } from '../math/rng';
import { ARENA_RADIUS, CRYSTAL_TREE_ORIGIN_X, CRYSTAL_TREE_ORIGIN_Z } from './constants';
import {
  EdibleResourceRegistry,
  type EdibleReservation,
  type EdibleResource,
  type EdibleResourceDefinition,
  type EdibleResourceKind,
} from './edible-resource';
import {
  createTreeCreatureAction,
  TREE_CREATURE_ACTIVITY,
  TREE_CREATURE_BRAIN_HIDDEN,
  TREE_CREATURE_BRAIN_INPUTS,
  TREE_CREATURE_BRAIN_OUTPUTS,
  TREE_CREATURE_BRAIN_PARAMETERS,
  TreeCreatureBrain,
  type TreeCreatureAction,
  type TreeCreatureActivity,
  type TreeCreatureFallbackReason,
  type TreeCreaturePercept,
} from './tree-creature-brain';
export { CRYSTAL_TREE_ORIGIN_X, CRYSTAL_TREE_ORIGIN_Z } from './constants';

// The source's highest bonsai tips reach 1.02× its nominal trunk height. At the platform floor this
// puts the crown at ~566u, matching the God-Colossus' authoritative ~565.5u skyline.
export const CRYSTAL_TREE_HEIGHT = ARENA_RADIUS * 1.69;
export const CRYSTAL_TREE_DOME_BRANCHES = 500;
export const CRYSTAL_TREE_BONSAI_BRANCHES = 1000;
export const CRYSTAL_TREE_MAIN_BRANCHES = CRYSTAL_TREE_DOME_BRANCHES + CRYSTAL_TREE_BONSAI_BRANCHES;
export const CRYSTAL_TREE_LEAVES = 10_000;
export const CRYSTAL_TREE_FRUITS = 10_000;
export const CRYSTAL_TREE_FLOWERS = 10_000;
export const CRYSTAL_TREE_SPECIES = 10;
export const CRYSTAL_TREE_CREATURES_PER_SPECIES = 25;
export const CRYSTAL_TREE_CREATURES = CRYSTAL_TREE_SPECIES * CRYSTAL_TREE_CREATURES_PER_SPECIES;
export const CRYSTAL_TREE_AMBIENT_CREATURES = 99;
export const CRYSTAL_TREE_MOTES = 5000;
export const CRYSTAL_TREE_RELICS = 50;
export const CRYSTAL_TREE_DRAW_CALL_BUDGET = 36;
export const CRYSTAL_TREE_TRIANGLE_BUDGET = 1_200_000;

const SOURCE_HEIGHT = 260;
const SCALE = CRYSTAL_TREE_HEIGHT / SOURCE_HEIGHT;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const TAU = Math.PI * 2;
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const TMP_POS = new THREE.Vector3();
const TMP_OBJECT = new THREE.Object3D();
const TMP_COLOR = new THREE.Color();
const FOOD_APPROACH_SLOTS = 48;
const FOOD_LEASE_SECONDS = 12;
const COMPATIBILITY_CONSUMER_ID = -2_147_483_647;
const TREE_CREATURE_OWNER_BASE = -1_000_000;

const P = {
  bark: 0x1a0e28,
  barkMid: 0x241438,
  barkWarm: 0x3a2255,
  barkRich: 0x4a2d66,
  crystalBlue: 0x4488dd,
  neonPurple: 0x9944ee,
  gold: 0xddaa33,
  silver: 0xaabbdd,
  darkGold: 0x997722,
  iceBlue: 0x55aaff,
  cosmicPink: 0xcc44bb,
  ember: 0xff6633,
  deepBlue: 0x2244aa,
  leafGold: 0xeebb44,
  neuralGlow: 0x66ddff,
} as const;
const COLOR_NEURAL_GLOW = new THREE.Color(P.neuralGlow);
const COLOR_GOLD = new THREE.Color(P.gold);
const COLOR_WHITE = new THREE.Color(0xffffff);
const COLOR_LIGHTNING_WHITE = new THREE.Color(0xd8eeff);

const LEAF_COLORS = [
  P.leafGold,
  P.iceBlue,
  0x228855,
  0x33aa99,
  0x88cc22,
  P.crystalBlue,
  P.neonPurple,
  P.gold,
  P.neuralGlow,
  0x115533,
] as const;
const FRUIT_COLORS = [
  0xcc2244, 0xffaa22, 0x8833aa, 0x22cc88, 0xddccff, 0xeecc33, 0x2255cc, 0xff4466, 0x44ddaa,
  0xffcc88,
] as const;
const FLOWER_COLORS = [
  0xff22aa, 0xaa33ff, 0x33aaff, 0xff6655, 0xeeddff, 0x44ffdd, 0xffdd22, 0xff88cc, 0x88aaff,
  0xffaa88,
] as const;
const BRANCH_COLORS = [P.crystalBlue, P.neonPurple, P.deepBlue, P.neuralGlow, P.iceBlue] as const;

export const CRYSTAL_QUANTUM_ATTRIBUTES = [
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
] as const;
export type CrystalQuantumAttribute = (typeof CRYSTAL_QUANTUM_ATTRIBUTES)[number];
type CreatureBehavior = 'orbit' | 'climb' | 'swarm' | 'flutter' | 'pause' | 'seek';

export interface CrystalSpecies {
  readonly name: string;
  readonly geometry:
    | 'ico'
    | 'octa'
    | 'torus'
    | 'plane'
    | 'cone'
    | 'torusKnot'
    | 'dodeca'
    | 'tetra'
    | 'sphere'
    | 'ring';
  readonly color: number;
  readonly emissive: number;
  readonly size: number;
  readonly behavior: Exclude<CreatureBehavior, 'pause' | 'seek'>;
  readonly wingSpan: number;
  readonly description: string;
  readonly quantum: readonly [CrystalQuantumAttribute, CrystalQuantumAttribute];
}

export const CRYSTAL_SPECIES: readonly CrystalSpecies[] = [
  {
    name: 'Lumivore',
    geometry: 'ico',
    color: 0x66ffcc,
    emissive: 0x33ddaa,
    size: 0.6,
    behavior: 'orbit',
    wingSpan: 2,
    description: 'Photosynthetic orbiter',
    quantum: ['superposition', 'interference'],
  },
  {
    name: 'Crystalith',
    geometry: 'octa',
    color: 0xaaaaff,
    emissive: 0x6666dd,
    size: 0.8,
    behavior: 'climb',
    wingSpan: 0,
    description: 'Mineral feeder',
    quantum: ['tunneling', 'decoherence'],
  },
  {
    name: 'Nebulark',
    geometry: 'torus',
    color: 0xff66aa,
    emissive: 0xcc3388,
    size: 0.5,
    behavior: 'swarm',
    wingSpan: 1.5,
    description: 'Spore navigator',
    quantum: ['entanglement', 'phaseShift'],
  },
  {
    name: 'Voidmoth',
    geometry: 'plane',
    color: 0xccddff,
    emissive: 0x88aadd,
    size: 0.7,
    behavior: 'flutter',
    wingSpan: 3,
    description: 'Dimensional drifter',
    quantum: ['uncertainty', 'zeroPoint'],
  },
  {
    name: 'Thornspike',
    geometry: 'cone',
    color: 0xddaa33,
    emissive: 0xaa7711,
    size: 0.9,
    behavior: 'climb',
    wingSpan: 0,
    description: 'Crystallivore',
    quantum: ['waveCollapse', 'spin'],
  },
  {
    name: 'Glinteel',
    geometry: 'torusKnot',
    color: 0x33ffaa,
    emissive: 0x11cc77,
    size: 0.4,
    behavior: 'orbit',
    wingSpan: 1,
    description: 'Luminescent eel',
    quantum: ['interference', 'tunneling'],
  },
  {
    name: 'Shadowcrawl',
    geometry: 'dodeca',
    color: 0x553366,
    emissive: 0x331144,
    size: 1,
    behavior: 'climb',
    wingSpan: 0,
    description: 'Trunk predator',
    quantum: ['decoherence', 'waveCollapse'],
  },
  {
    name: 'Prismfly',
    geometry: 'tetra',
    color: 0xff33ff,
    emissive: 0xcc11cc,
    size: 0.35,
    behavior: 'flutter',
    wingSpan: 2.5,
    description: 'Light-bender',
    quantum: ['superposition', 'phaseShift'],
  },
  {
    name: 'Coralspore',
    geometry: 'sphere',
    color: 0xff8855,
    emissive: 0xdd5522,
    size: 0.55,
    behavior: 'swarm',
    wingSpan: 0.5,
    description: 'Colonial body',
    quantum: ['entanglement', 'zeroPoint'],
  },
  {
    name: 'Riftweaver',
    geometry: 'ring',
    color: 0x44ddff,
    emissive: 0x22aacc,
    size: 0.7,
    behavior: 'orbit',
    wingSpan: 2,
    description: 'Spatial entity',
    quantum: ['uncertainty', 'spin'],
  },
] as const;

export interface CrystalEcosystemFrame {
  dt: number;
  visualDt: number;
  time: number;
  chaos: number;
  entropy: number;
  windX: number;
  windZ: number;
  weather: number;
  visualOnly?: boolean;
}

export interface CrystalEcosystemStats {
  readonly mainBranches: number;
  readonly subBranches: number;
  readonly leaves: number;
  readonly fruits: number;
  readonly flowers: number;
  readonly availableFruit: number;
  readonly availableLeaves: number;
  readonly quantumCreatures: number;
  readonly ambientCreatures: number;
  readonly motes: number;
  readonly relics: number;
  readonly consumedFruit: number;
  readonly consumedLeaves: number;
  readonly contests: number;
  readonly observations: number;
  readonly teleports: number;
  readonly neuralControllers: number;
  readonly neuralDecisions: number;
  readonly neuralFallbacks: number;
  readonly neuralModelReady: boolean;
  readonly neuralLastActivity: TreeCreatureActivity;
  readonly drawCalls: number;
  readonly triangles: number;
}

export interface CrystalTreeNeuralStatus {
  readonly controllerCount: number;
  readonly inputCount: number;
  readonly hiddenCount: number;
  readonly outputCount: number;
  readonly parametersPerController: number;
  readonly totalParameters: number;
  readonly modelReady: boolean;
  readonly decisions: number;
  readonly fallbackCount: number;
  readonly lastFallbackReason: TreeCreatureFallbackReason;
  readonly lastActivity: TreeCreatureActivity;
  readonly lastMotorX: number;
  readonly lastMotorZ: number;
  readonly lastSocialDrive: number;
  readonly visitorCount: number;
  readonly visitorPresence: number;
  readonly visitorSocialActivity: number;
}

export interface CrystalInteraction {
  readonly kind: 'creature' | 'tree';
  readonly audio: 'observe' | 'shake';
  readonly message: string;
  readonly species?: string;
  readonly energy?: number;
  readonly disposition?: 'friendly';
  readonly quantum?: readonly string[];
}

export interface CrystalEcosystemConfig {
  readonly domeBranches: number;
  readonly bonsaiBranches: number;
  readonly leaves: number;
  readonly fruits: number;
  readonly flowers: number;
  readonly creaturesPerSpecies: number;
  readonly ambientCreatures: number;
  readonly motes: number;
  readonly relics: number;
  readonly height: number;
}

const PRODUCTION_CONFIG: CrystalEcosystemConfig = {
  domeBranches: CRYSTAL_TREE_DOME_BRANCHES,
  bonsaiBranches: CRYSTAL_TREE_BONSAI_BRANCHES,
  leaves: CRYSTAL_TREE_LEAVES,
  fruits: CRYSTAL_TREE_FRUITS,
  flowers: CRYSTAL_TREE_FLOWERS,
  creaturesPerSpecies: CRYSTAL_TREE_CREATURES_PER_SPECIES,
  ambientCreatures: CRYSTAL_TREE_AMBIENT_CREATURES,
  motes: CRYSTAL_TREE_MOTES,
  relics: CRYSTAL_TREE_RELICS,
  height: CRYSTAL_TREE_HEIGHT,
};

function hash(n: number): number {
  const s = Math.sin(n) * 43758.5453;
  return s - Math.floor(s);
}

function fbm(x: number, octaves = 5): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let i = 0; i < octaves; i++) {
    const floor = Math.floor(x * frequency);
    const frac = x * frequency - floor;
    const smooth = frac * frac * (3 - 2 * frac);
    value += amplitude * (hash(floor) * (1 - smooth) + hash(floor + 1) * smooth);
    frequency *= 2;
    amplitude *= 0.5;
  }
  return value;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function quantumBit(attribute: CrystalQuantumAttribute): number {
  return 1 << CRYSTAL_QUANTUM_ATTRIBUTES.indexOf(attribute);
}

function hasQuantum(mask: number, attribute: CrystalQuantumAttribute): boolean {
  return (mask & quantumBit(attribute)) !== 0;
}

function createLeafGeometry(size = 0.8 * SCALE): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, -size * 0.5);
  shape.bezierCurveTo(size * 0.25, -size * 0.3, size * 0.35, -size * 0.05, size * 0.3, size * 0.15);
  shape.bezierCurveTo(size * 0.22, size * 0.35, size * 0.1, size * 0.45, 0, size * 0.5);
  shape.bezierCurveTo(
    -size * 0.1,
    size * 0.45,
    -size * 0.22,
    size * 0.35,
    -size * 0.3,
    size * 0.15,
  );
  shape.bezierCurveTo(-size * 0.35, -size * 0.05, -size * 0.25, -size * 0.3, 0, -size * 0.5);
  return new THREE.ShapeGeometry(shape, 3);
}

function createSpine(height: number): THREE.CatmullRomCurve3 {
  const s = height / SOURCE_HEIGHT;
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(2 * s, height * 0.08, 1 * s),
    new THREE.Vector3(0.5 * s, height * 0.2, 1.5 * s),
    new THREE.Vector3(-1.5 * s, height * 0.35, 0.3 * s),
    new THREE.Vector3(-0.5 * s, height * 0.5, -1 * s),
    new THREE.Vector3(1 * s, height * 0.65, -0.3 * s),
    new THREE.Vector3(0.3 * s, height * 0.8, 0.5 * s),
    new THREE.Vector3(0, height * 0.92, 0.2 * s),
    new THREE.Vector3(-0.3 * s, height, 0),
  ]);
}

function createTrunkGeometry(height: number): THREE.BufferGeometry {
  const spine = createSpine(height);
  const heightSegments = 70;
  const radialSegments = 20;
  const baseRadius = height * (22 / SOURCE_HEIGHT);
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const tangent = new THREE.Vector3();
  const right = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const point = new THREE.Vector3();
  const color = new THREE.Color();

  for (let h = 0; h <= heightSegments; h++) {
    const t = h / heightSegments;
    spine.getPoint(t, point);
    spine.getTangent(t, tangent).normalize();
    right.crossVectors(tangent, Y_AXIS).normalize();
    if (right.lengthSq() < 0.0001) right.set(1, 0, 0);
    forward.crossVectors(right, tangent).normalize();
    let radius =
      baseRadius *
      Math.pow(Math.max(0.01, 1 - t), 0.667) *
      (t < 0.08 ? 1 + 0.7 * (1 - t / 0.08) ** 2 : 1) *
      (1 + 0.1 * Math.sin(t * Math.PI * 0.8));
    radius = Math.max(radius, (3 * (1 - t) + 0.5) * (height / SOURCE_HEIGHT));
    for (let ri = 0; ri <= radialSegments; ri++) {
      const theta = (ri / radialSegments) * TAU;
      const displacement =
        fbm(theta * 8 + t * 20, 4) * 0.06 * radius +
        (t < 0.15 ? Math.abs(Math.sin(theta * 4 + 0.5)) * 0.2 * radius * (1 - t / 0.15) ** 2 : 0);
      const finalRadius = radius + displacement;
      const cs = Math.cos(theta);
      const sn = Math.sin(theta);
      positions.push(
        point.x + right.x * cs * finalRadius + forward.x * sn * finalRadius,
        point.y + right.y * cs * finalRadius + forward.y * sn * finalRadius,
        point.z + right.z * cs * finalRadius + forward.z * sn * finalRadius,
      );
      normals.push(
        right.x * cs + forward.x * sn,
        right.y * cs + forward.y * sn,
        right.z * cs + forward.z * sn,
      );
      if (t < 0.3) color.set(P.bark).lerp(TMP_COLOR.set(P.barkMid), t / 0.3);
      else if (t < 0.7) color.set(P.barkMid).lerp(TMP_COLOR.set(P.barkWarm), (t - 0.3) / 0.4);
      else color.set(P.barkWarm).lerp(TMP_COLOR.set(P.barkRich), (t - 0.7) / 0.3);
      const glow = Math.sin(t * 12 + theta * 5) * 0.02;
      if (glow > 0.01) color.lerp(TMP_COLOR.set(P.neonPurple), glow);
      colors.push(color.r, color.g, color.b);
    }
  }
  for (let h = 0; h < heightSegments; h++) {
    for (let ri = 0; ri < radialSegments; ri++) {
      const a = h * (radialSegments + 1) + ri;
      const b = a + radialSegments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

class TubeBuilder {
  readonly positions: number[] = [];
  readonly normals: number[] = [];
  readonly colors: number[] = [];
  readonly indices: number[] = [];
  triangles = 0;

  append(
    points: readonly THREE.Vector3[],
    radius: number,
    colorValue: number,
    radialSegments: number,
  ): void {
    if (points.length < 2) return;
    const base = this.positions.length / 3;
    const tangent = new THREE.Vector3();
    const normalA = new THREE.Vector3();
    const normalB = new THREE.Vector3();
    const color = new THREE.Color(colorValue);
    for (let i = 0; i < points.length; i++) {
      const point = points[i]!;
      const prev = points[Math.max(0, i - 1)]!;
      const next = points[Math.min(points.length - 1, i + 1)]!;
      tangent.subVectors(next, prev).normalize();
      const reference = Math.abs(tangent.y) < 0.9 ? Y_AXIS : TMP_POS.set(1, 0, 0);
      normalA.crossVectors(tangent, reference).normalize();
      normalB.crossVectors(tangent, normalA).normalize();
      const t = i / (points.length - 1);
      const ringRadius = Math.max(radius * 0.1, radius * (1 - t * 0.84));
      for (let r = 0; r < radialSegments; r++) {
        const angle = (r / radialSegments) * TAU;
        const cs = Math.cos(angle);
        const sn = Math.sin(angle);
        const nx = normalA.x * cs + normalB.x * sn;
        const ny = normalA.y * cs + normalB.y * sn;
        const nz = normalA.z * cs + normalB.z * sn;
        positionsPush(
          this.positions,
          point.x + nx * ringRadius,
          point.y + ny * ringRadius,
          point.z + nz * ringRadius,
        );
        positionsPush(this.normals, nx, ny, nz);
        this.colors.push(color.r, color.g, color.b);
      }
    }
    for (let i = 0; i < points.length - 1; i++) {
      const ring = base + i * radialSegments;
      const nextRing = ring + radialSegments;
      for (let r = 0; r < radialSegments; r++) {
        const rn = (r + 1) % radialSegments;
        this.indices.push(
          ring + r,
          nextRing + r,
          ring + rn,
          nextRing + r,
          nextRing + rn,
          ring + rn,
        );
        this.triangles += 2;
      }
    }
  }

  build(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(new THREE.Uint32BufferAttribute(this.indices, 1));
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  }
}

function positionsPush(target: number[], x: number, y: number, z: number): void {
  target.push(x, y, z);
}

function makeCreatureGeometry(species: CrystalSpecies, scale: number): THREE.BufferGeometry {
  const size = species.size * scale * 1.25;
  switch (species.geometry) {
    case 'ico':
      return new THREE.IcosahedronGeometry(size, 1);
    case 'octa':
      return new THREE.OctahedronGeometry(size, 0);
    case 'torus':
      return new THREE.TorusGeometry(size * 0.5, size * 0.15, 6, 8);
    case 'plane':
      return new THREE.PlaneGeometry(size * Math.max(1, species.wingSpan), size, 3, 2);
    case 'cone':
      return new THREE.ConeGeometry(size * 0.3, size * 1.5, 5);
    case 'torusKnot':
      return new THREE.TorusKnotGeometry(size * 0.3, size * 0.1, 24, 5, 2, 3);
    case 'dodeca':
      return new THREE.DodecahedronGeometry(size, 0);
    case 'tetra':
      return new THREE.TetrahedronGeometry(size, 0);
    case 'sphere':
      return new THREE.SphereGeometry(size * 0.5, 8, 6);
    case 'ring':
      return new THREE.RingGeometry(size * 0.2, size * 0.6, 6);
  }
}

interface ShaderLike {
  uniforms: Record<string, { value: unknown }>;
  vertexShader: string;
}

interface MotionUniforms {
  time: { value: number };
  shake: { value: number };
  wind: { value: THREE.Vector2 };
}

function patchMotionMaterial(
  material: THREE.MeshStandardMaterial,
  kind: 'leaf' | 'fruit' | 'flower',
  uniforms: MotionUniforms,
): void {
  material.onBeforeCompile = (shader): void => {
    const s = shader as unknown as ShaderLike;
    s.uniforms['uCrystalTime'] = uniforms.time;
    s.uniforms['uCrystalShake'] = uniforms.shake;
    s.uniforms['uCrystalWind'] = uniforms.wind;
    s.vertexShader = s.vertexShader
      .replace(
        '#include <common>',
        `#include <common>\nattribute vec2 aCrystalMotion;\nuniform float uCrystalTime;\nuniform float uCrystalShake;\nuniform vec2 uCrystalWind;`,
      )
      .replace(
        '#include <begin_vertex>',
        `vec3 transformed = vec3(position);
         float cWave = sin(uCrystalTime * aCrystalMotion.y + aCrystalMotion.x);
         float cWind = length(uCrystalWind);
         ${
           kind === 'leaf'
             ? 'transformed.x += cWave * (0.10 + cWind * 0.06); transformed.y += cos(uCrystalTime * 0.7 + aCrystalMotion.x) * 0.08; transformed.z += (cWave * 0.06 + uCrystalShake * sin(uCrystalTime * 19.0 + aCrystalMotion.x) * 0.24);'
             : kind === 'fruit'
               ? 'transformed.y += cWave * 0.12 - uCrystalShake * 0.18; transformed.x += uCrystalShake * sin(uCrystalTime * 17.0 + aCrystalMotion.x) * 0.12;'
               : 'transformed.y += cWave * 0.08; transformed.xz += vec2(cos(uCrystalTime * 0.35 + aCrystalMotion.x), sin(uCrystalTime * 0.35 + aCrystalMotion.x)) * 0.05;'
         }`,
      );
  };
  material.customProgramCacheKey = () => `crystal-motion-${kind}-v1`;
}

interface BranchLayout {
  readonly geometry: THREE.BufferGeometry;
  readonly routes: readonly Float32Array[];
  readonly leafPoints: readonly THREE.Vector3[];
  readonly fruitPoints: readonly THREE.Vector3[];
  readonly flowerPoints: readonly THREE.Vector3[];
  readonly subBranches: number;
  readonly triangles: number;
}

function createBranchLayout(config: CrystalEcosystemConfig, rng: Rng): BranchLayout {
  const height = config.height;
  const scale = height / SOURCE_HEIGHT;
  const spine = createSpine(height);
  const builder = new TubeBuilder();
  const routes: Float32Array[] = [];
  const leafPoints: THREE.Vector3[] = [];
  const fruitPoints: THREE.Vector3[] = [];
  const flowerPoints: THREE.Vector3[] = [];
  const centerY = height * 0.45;
  const crownRadius = 120 * scale;
  const crownHeight = 140 * scale;
  const crownTop = centerY + crownHeight * 0.6;
  const crownBottom = centerY - crownHeight * 0.4;
  let subBranches = 0;

  // Fourteen authored root tendrils, merged into the same branch draw.
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * TAU + (rng() - 0.5) * 0.25;
    const length = (30 + rng() * 45) * scale;
    const anchor = spine.getPoint(0.02);
    const points: THREE.Vector3[] = [];
    for (let j = 0; j < 10; j++) {
      const t = j / 9;
      const radius = 22 * scale * 0.85 * Math.pow(1 - t * 0.3, 0.5) + Math.pow(t, 0.6) * length;
      points.push(
        new THREE.Vector3(
          anchor.x + Math.cos(angle) * radius,
          anchor.y +
            ((1 - Math.pow(t, 0.6)) * 10 -
              t * t * 5 +
              Math.sin(t * 6 + i * 2) * 0.8 * (1 - t * 0.5)) *
              scale,
          anchor.z + Math.sin(angle) * radius,
        ),
      );
    }
    builder.append(
      new THREE.CatmullRomCurve3(points).getPoints(16),
      (2 + rng() * 3) * scale,
      P.barkMid,
      5,
    );
  }

  const addCandidates = (
    points: readonly THREE.Vector3[],
    fruitChance: number,
    flowerChance: number,
  ): void => {
    for (let i = 0; i < points.length; i++) {
      const p = points[i]!;
      leafPoints.push(p.clone());
      if (rng() < fruitChance) fruitPoints.push(p.clone());
      if (rng() < flowerChance) flowerPoints.push(p.clone());
    }
  };

  const addMain = (
    azimuth: number,
    target: THREE.Vector3,
    anchor: THREE.Vector3,
    thickness: number,
    branchIndex: number,
    bonsai: boolean,
  ): void => {
    const length = target.distanceTo(anchor);
    if (length < 2 * scale) return;
    const crownT = clamp01((anchor.y - crownBottom) / (crownTop - crownBottom));
    const points: THREE.Vector3[] = [];
    for (let j = 0; j < 10; j++) {
      const f = j / 9;
      const baseX = anchor.x + (target.x - anchor.x) * f;
      const baseY = anchor.y + (target.y - anchor.y) * f;
      const baseZ = anchor.z + (target.z - anchor.z) * f;
      const wave1 = Math.sin(f * 7 + branchIndex * 1.7) * 2.5 * f * scale;
      const wave2 = Math.sin(f * 11 + branchIndex * 3.1) * 1.5 * f * scale;
      const wave3 = Math.cos(f * 9 + branchIndex * 2.3) * 2 * f * scale;
      const droop = bonsai ? 0.1 : Math.max(0, (1 - crownT) * 0.35) * length * 0.003;
      const lift = crownT > 0.5 && !bonsai ? crownT * f * f * 1.2 * scale : 0;
      points.push(
        new THREE.Vector3(
          baseX + wave1 * Math.cos(azimuth + Math.PI / 2) + wave2 * Math.sin(azimuth),
          baseY -
            droop * Math.sin(f * Math.PI) * f +
            lift +
            (bonsai ? Math.sin(f * Math.PI) * 1.5 * (1 - f) * scale : 0) +
            wave3 * 0.3,
          baseZ + wave3 * Math.sin(azimuth + Math.PI / 2) + wave1 * Math.cos(azimuth),
        ),
      );
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const renderedPoints = curve.getPoints(14);
    builder.append(
      renderedPoints,
      thickness,
      BRANCH_COLORS[branchIndex % BRANCH_COLORS.length]!,
      4,
    );
    if (routes.length < 500) {
      const packed = new Float32Array(renderedPoints.length * 3);
      for (let i = 0; i < renderedPoints.length; i++) {
        const p = renderedPoints[i]!;
        packed[i * 3] = p.x;
        packed[i * 3 + 1] = p.y;
        packed[i * 3 + 2] = p.z;
      }
      routes.push(packed);
    }
    // Stratified along the whole curve rather than the source's first-10k prefix bias.
    const sampled: THREE.Vector3[] = [];
    for (let t = 0.3; t <= 1; t += 0.08) sampled.push(curve.getPoint(t));
    addCandidates(sampled, 0.35, 0.35);

    const subCount = 3 + Math.floor(rng() * 3);
    subBranches += subCount;
    for (let sb = 0; sb < subCount; sb++) {
      const startT = 0.15 + rng() * 0.65;
      const start = curve.getPoint(startT);
      const subLength = length * 0.12 * (0.5 + rng() * 0.5);
      const subAngle = azimuth + (rng() - 0.5) * 2.5;
      const sub: THREE.Vector3[] = [];
      for (let si = 0; si < 6; si++) {
        const f = si / 5;
        sub.push(
          new THREE.Vector3(
            start.x +
              Math.cos(subAngle) * f * subLength +
              Math.sin(f * 6 + sb * 2) * 1.5 * f * scale,
            start.y +
              (crownT > 0.5 ? 1 : -0.3) * f * scale +
              Math.sin(f * Math.PI) * 1.5 * scale +
              Math.cos(f * 5) * 0.8 * f * scale,
            start.z +
              Math.sin(subAngle) * f * subLength +
              Math.cos(f * 6 + sb * 2) * 1.5 * f * scale,
          ),
        );
      }
      const subCurve = new THREE.CatmullRomCurve3(sub);
      builder.append(
        subCurve.getPoints(6),
        thickness * 0.25,
        BRANCH_COLORS[branchIndex % BRANCH_COLORS.length]!,
        3,
      );
      const subCandidates: THREE.Vector3[] = [];
      for (let t = 0.15; t <= 1; t += 0.1) subCandidates.push(subCurve.getPoint(t));
      addCandidates(subCandidates, 0.3, 0.3);
    }
  };

  for (let i = 0; i < config.domeBranches; i++) {
    const t = 0.15 + (i / Math.max(1, config.domeBranches)) * 0.8;
    const azimuth = i * GOLDEN_ANGLE;
    const anchor = spine.getPoint(t);
    const crownT = clamp01((anchor.y - crownBottom) / (crownTop - crownBottom));
    const elevation = (-0.15 + crownT * 1.1) * (Math.PI / 2) + (rng() - 0.5) * 0.2;
    const radial = crownRadius * Math.cos(elevation) * (0.85 + rng() * 0.3);
    const targetY = (centerY + crownHeight * 0.5 * Math.sin(elevation)) * (0.9 + rng() * 0.2);
    addMain(
      azimuth,
      new THREE.Vector3(
        anchor.x + Math.cos(azimuth) * radial,
        targetY,
        anchor.z + Math.sin(azimuth) * radial,
      ),
      anchor,
      Math.max(0.08 * scale, 1.3 * scale * (1 - crownT * 0.6)),
      i,
      false,
    );
  }

  const layers = [
    { y: height * 0.88, radius: 65 * scale },
    { y: height * 0.92, radius: 55 * scale },
    { y: height * 0.95, radius: 45 * scale },
    { y: height * 0.98, radius: 35 * scale },
    { y: height * 1.02, radius: 22 * scale },
  ];
  let branchIndex = config.domeBranches;
  let remaining = config.bonsaiBranches;
  for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
    const layer = layers[layerIndex]!;
    const count = Math.floor(remaining / (layers.length - layerIndex));
    remaining -= count;
    for (let i = 0; i < count; i++) {
      const azimuth = i * GOLDEN_ANGLE * 1.618 + layer.y;
      const anchor = spine.getPoint(Math.min(0.98, layer.y / height));
      const spread = layer.radius * (0.6 + rng() * 0.8);
      addMain(
        azimuth,
        new THREE.Vector3(
          anchor.x + Math.cos(azimuth) * spread,
          layer.y + (rng() - 0.3) * 6 * scale,
          anchor.z + Math.sin(azimuth) * spread,
        ),
        anchor,
        Math.max(0.05 * scale, 0.4 * scale * (1 - (i / Math.max(1, count)) * 0.5)),
        branchIndex++,
        true,
      );
    }
  }

  return {
    geometry: builder.build(),
    routes,
    leafPoints,
    fruitPoints,
    flowerPoints,
    subBranches,
    triangles: builder.triangles,
  };
}

interface ResourcePool {
  readonly mesh: THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  readonly positions: Float32Array;
  readonly rotations: Float32Array;
  readonly scales: Float32Array;
}

function pickStratifiedPoint(
  points: readonly THREE.Vector3[],
  index: number,
  count: number,
  rng: Rng,
): THREE.Vector3 {
  if (points.length === 0) return TMP_POS.set(0, CRYSTAL_TREE_HEIGHT * 0.5, 0);
  // Deterministic whole-canopy sampling: each instance owns a stratum over the complete candidate list.
  const at = Math.min(
    points.length - 1,
    Math.floor(((index + rng()) / Math.max(1, count)) * points.length),
  );
  return points[at]!;
}

function makeResourcePool(
  geometry: THREE.BufferGeometry,
  material: THREE.MeshStandardMaterial,
  count: number,
  points: readonly THREE.Vector3[],
  colors: readonly number[],
  rng: Rng,
  kind: 'leaf' | 'fruit' | 'flower',
  worldScale: number,
): ResourcePool {
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = kind === 'leaf' ? 'crystal-leaves' : `crystal-${kind}s`;
  mesh.instanceMatrix.setUsage(kind === 'flower' ? THREE.StaticDrawUsage : THREE.DynamicDrawUsage);
  const positions = new Float32Array(count * 3);
  const rotations = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const motion = new Float32Array(count * 2);
  geometry.setAttribute('aCrystalMotion', new THREE.InstancedBufferAttribute(motion, 2));

  for (let i = 0; i < count; i++) {
    const point = pickStratifiedPoint(points, i, count, rng);
    const jitter = kind === 'leaf' ? 3 : 2;
    const yOffset = kind === 'fruit' ? -0.3 : 0;
    const p3 = i * 3;
    const x = point.x + (rng() - 0.5) * jitter * worldScale;
    const y =
      point.y + (rng() - 0.5) * (kind === 'leaf' ? 2 : 1.5) * worldScale + yOffset * worldScale;
    const z = point.z + (rng() - 0.5) * jitter * worldScale;
    positions[p3] = x;
    positions[p3 + 1] = y;
    positions[p3 + 2] = z;
    const rx =
      kind === 'fruit'
        ? 0
        : rng() * (kind === 'flower' ? Math.PI : 1.5) - (kind === 'flower' ? Math.PI / 2 : 0.75);
    const ry = rng() * TAU;
    const rz = kind === 'fruit' ? 0 : (rng() - 0.5) * (kind === 'leaf' ? 0.6 : 0.5);
    rotations[p3] = rx;
    rotations[p3 + 1] = ry;
    rotations[p3 + 2] = rz;
    const scale =
      kind === 'leaf' ? 0.5 + rng() * 0.9 : kind === 'fruit' ? 0.5 + rng() * 1.2 : 0.4 + rng();
    scales[i] = scale;
    motion[i * 2] = rng() * TAU;
    motion[i * 2 + 1] =
      kind === 'leaf'
        ? 0.3 + rng() * 0.8
        : kind === 'fruit'
          ? 0.2 + rng() * 0.5
          : 0.15 + rng() * 0.4;

    TMP_OBJECT.position.set(x, y, z);
    TMP_OBJECT.rotation.set(rx, ry, rz);
    TMP_OBJECT.scale.setScalar(scale);
    TMP_OBJECT.updateMatrix();
    mesh.setMatrixAt(i, TMP_OBJECT.matrix);
    const base = colors[i % colors.length]!;
    TMP_COLOR.set(base);
    if (kind === 'leaf') {
      TMP_COLOR.r = clamp01(TMP_COLOR.r + rng() * 0.1 - 0.05);
      TMP_COLOR.g = clamp01(TMP_COLOR.g + rng() * 0.1 - 0.05);
      TMP_COLOR.b = clamp01(TMP_COLOR.b + rng() * 0.1 - 0.05);
    }
    mesh.setColorAt(i, TMP_COLOR);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
  return { mesh, positions, rotations, scales };
}

function foodResourceId(kind: EdibleResourceKind, index: number, fruitCount: number): number {
  return kind === 'fruit' ? index : fruitCount + index;
}

function makeEdibleDefinitions(
  fruits: ResourcePool,
  leaves: ResourcePool,
  config: CrystalEcosystemConfig,
  origin: THREE.Vector3,
): EdibleResourceDefinition[] {
  const total = config.fruits + config.leaves;
  const definitions = Array.from({ length: total }) as EdibleResourceDefinition[];
  const worldScale = config.height / SOURCE_HEIGHT;
  let write = 0;
  const append = (kind: EdibleResourceKind, pool: ResourcePool, count: number): void => {
    for (let index = 0; index < count; index++) {
      const p3 = index * 3;
      const ordinal = kind === 'fruit' ? index : config.fruits + index;
      const slot = ordinal % FOOD_APPROACH_SLOTS;
      const ring = Math.floor(ordinal / FOOD_APPROACH_SLOTS) % 3;
      const angle = (slot / FOOD_APPROACH_SLOTS) * TAU + (kind === 'leaf' ? GOLDEN_ANGLE * 0.5 : 0);
      const interactionRadius = (36 + ring * 12) * worldScale;
      definitions[write++] = {
        id: foodResourceId(kind, index, config.fruits),
        kind,
        position: {
          x: origin.x + (pool.positions[p3] ?? 0),
          y: origin.y + (pool.positions[p3 + 1] ?? 0),
          z: origin.z + (pool.positions[p3 + 2] ?? 0),
        },
        interactionPoint: {
          x: origin.x + Math.cos(angle) * interactionRadius,
          y: origin.y,
          z: origin.z + Math.sin(angle) * interactionRadius,
        },
        nourishment: kind === 'fruit' ? 28 : 14,
      };
    }
  };
  append('fruit', fruits, config.fruits);
  append('leaf', leaves, config.leaves);
  return definitions;
}

interface TreeCreature {
  readonly index: number;
  readonly species: number;
  readonly slot: number;
  x: number;
  y: number;
  z: number;
  angle: number;
  radius: number;
  baseY: number;
  speed: number;
  verticalSpeed: number;
  phase: number;
  state: CreatureBehavior;
  stateTimer: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  climbRoute: number;
  climbT: number;
  climbDirection: number;
  climbSpeed: number;
  wingPhase: number;
  quantumMask: number;
  decoherence: number;
  tunnelTimer: number;
  tunnelAt: number;
  ghostX: number;
  ghostY: number;
  ghostZ: number;
  collapsed: number;
  startled: number;
  entangledWith: number;
  energy: number;
  targetFoodId: number;
  targetFoodGeneration: number;
  foodCooldownUntil: number;
  personality: number;
  neuralSteerX: number;
  neuralSteerZ: number;
  neuralSpeed: number;
  neuralActivity: TreeCreatureActivity;
  interference: number;
}

interface AmbientCreature {
  readonly family: number;
  readonly slot: number;
  radius: number;
  speed: number;
  phase: number;
  bobSpeed: number;
  bobAmount: number;
  spin: number;
  baseY: number;
  scale: number;
}

interface PulseArtifact {
  readonly color: number;
  readonly base: number;
  readonly phase: number;
  readonly position: THREE.Vector3;
  readonly scale: number;
}

function createAmbientGeometry(family: number, scale: number): THREE.BufferGeometry {
  switch (family) {
    case 0:
      return new THREE.ConeGeometry(0.3 * scale, 2 * scale, 4);
    case 1:
      return new THREE.IcosahedronGeometry(0.5 * scale, 1);
    case 2:
      return new THREE.OctahedronGeometry(0.6 * scale, 0);
    case 3:
      return new THREE.DodecahedronGeometry(0.4 * scale, 1);
    default:
      return new THREE.TorusGeometry(0.5 * scale, 0.12 * scale, 6, 8);
  }
}

function routePoint(route: Float32Array, t: number, out: THREE.Vector3): THREE.Vector3 {
  const count = route.length / 3;
  if (count < 2) return out.set(0, 0, 0);
  const scaled = clamp01(t) * (count - 1);
  const index = Math.min(count - 2, Math.floor(scaled));
  const frac = scaled - index;
  const a = index * 3;
  const b = a + 3;
  return out.set(
    (route[a] ?? 0) + ((route[b] ?? 0) - (route[a] ?? 0)) * frac,
    (route[a + 1] ?? 0) + ((route[b + 1] ?? 0) - (route[a + 1] ?? 0)) * frac,
    (route[a + 2] ?? 0) + ((route[b + 2] ?? 0) - (route[a + 2] ?? 0)) * frac,
  );
}

function geometryTriangles(geometry: THREE.BufferGeometry): number {
  return geometry.index ? geometry.index.count / 3 : geometry.getAttribute('position').count / 3;
}

/**
 * One lifecycle-owned, tree-local habitat. Construction is deterministic and boot-only; steady-state
 * updates mutate only the 250+99 fauna matrices and a food matrix when fruit or a leaf is eaten.
 */
export class CrystalEcosystem {
  private readonly scene: THREE.Scene;
  private readonly root = new THREE.Group();
  private readonly rng: Rng;
  private readonly config: CrystalEcosystemConfig;
  private readonly ownedGeometries: THREE.BufferGeometry[] = [];
  private readonly ownedMaterials: THREE.Material[] = [];
  private readonly trunk: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>;
  private readonly branches: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  private readonly leaves: ResourcePool;
  private readonly fruits: ResourcePool;
  private readonly flowers: ResourcePool;
  /** Canonical fixed-pool food registry shared by tree fauna and every external living-being adapter. */
  readonly edibleResources: EdibleResourceRegistry;
  private readonly routes: readonly Float32Array[];
  private readonly creatures: TreeCreature[] = [];
  private readonly treeBrains: TreeCreatureBrain[] = [];
  private readonly treeBrainActions: TreeCreatureAction[] = [];
  private readonly treeBrainReady: Uint8Array;
  private readonly brainPercept: TreeCreaturePercept = {
    energy: 1,
    foodDirectionX: 0,
    foodDirectionZ: 0,
    foodDistance: 1,
    socialDensity: 0,
    threat: 0,
    safeZoneCalm: 1,
    phase: 0,
    personality: 0.5,
  };
  private readonly creatureMeshes: THREE.InstancedMesh<
    THREE.BufferGeometry,
    THREE.MeshStandardMaterial
  >[] = [];
  private readonly wingMeshes: (THREE.InstancedMesh<
    THREE.BufferGeometry,
    THREE.MeshStandardMaterial
  > | null)[] = [];
  private readonly eyeMesh: THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private readonly ambient: AmbientCreature[] = [];
  private readonly ambientMeshes: THREE.InstancedMesh<
    THREE.BufferGeometry,
    THREE.MeshStandardMaterial
  >[] = [];
  private readonly pulseArtifacts: PulseArtifact[] = [];
  private lightningMesh!: THREE.InstancedMesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private lightningBase = new Float32Array(0);
  private lightningPhase = new Float32Array(0);
  private lightningInterval = new Float32Array(0);
  private veilMesh!: THREE.InstancedMesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private hexRing!: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private readonly motionUniforms: MotionUniforms = {
    time: { value: 0 },
    shake: { value: 0 },
    wind: { value: new THREE.Vector2() },
  };
  private readonly motesUniform = { value: 0 };
  private readonly crownSphere: THREE.Sphere;
  private readonly trunkStart = new THREE.Vector3();
  private readonly trunkEnd: THREE.Vector3;
  private readonly localRay = new THREE.Ray();
  private readonly inverseRoot = new THREE.Matrix4();
  private simTime = 0;
  private wingVisualTime = 0;
  private shakeTime = 0;
  private disposed = false;
  private consumedFruit = 0;
  private consumedLeaves = 0;
  private availableFruit: number;
  private availableLeaves: number;
  private observations = 0;
  private teleports = 0;
  private neuralDecisions = 0;
  private neuralFallbacks = 0;
  private neuralLastFallbackReason: TreeCreatureFallbackReason = 'none';
  private neuralLastActivity: TreeCreatureActivity = TREE_CREATURE_ACTIVITY.REST;
  private neuralLastMotorX = 0;
  private neuralLastMotorZ = 0;
  private neuralLastSocialDrive = 0;
  private unreadyTreeBrains = 0;
  private visitorCount = 0;
  private visitorPresence = 0;
  private visitorSocialActivity = 0;
  private readonly mainBranches: number;
  private readonly subBranches: number;
  private readonly drawCalls: number;
  private readonly triangles: number;

  /** World-space camera target near the living crown. */
  readonly focusPoint = new THREE.Vector3();
  /** Whole-home framing radius, including ambient orbiters and relic field. */
  readonly viewRadius: number;

  constructor(
    scene: THREE.Scene,
    seed: number,
    origin = new THREE.Vector3(CRYSTAL_TREE_ORIGIN_X, 6, CRYSTAL_TREE_ORIGIN_Z),
    overrides: Partial<CrystalEcosystemConfig> = {},
  ) {
    this.scene = scene;
    this.rng = mulberry32((seed ^ 0xc7eec05) >>> 0 || 1);
    this.config = { ...PRODUCTION_CONFIG, ...overrides };
    this.treeBrainReady = new Uint8Array(CRYSTAL_SPECIES.length * this.config.creaturesPerSpecies);
    this.root.name = 'crystal-ecosystem-home';
    this.root.position.copy(origin);
    scene.add(this.root);

    const scale = this.config.height / SOURCE_HEIGHT;
    const crownRadius = 120 * scale;
    this.viewRadius = Math.max(210 * scale, this.config.height * 0.72);
    this.focusPoint.set(origin.x, origin.y + this.config.height * 0.57, origin.z);
    this.crownSphere = new THREE.Sphere(
      new THREE.Vector3(0, this.config.height * 0.58, 0),
      crownRadius * 1.2,
    );
    this.trunkEnd = new THREE.Vector3(0, this.config.height, 0);

    const trunkGeometry = createTrunkGeometry(this.config.height);
    const trunkMaterial = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      metalness: 0.35,
      roughness: 0.55,
      emissive: P.neonPurple,
      emissiveIntensity: 0.09,
      clearcoat: 0.1,
      clearcoatRoughness: 0.8,
    });
    this.trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    this.trunk.name = 'crystal-tree-trunk';
    this.trunk.castShadow = true;
    this.trunk.receiveShadow = true;
    this.root.add(this.trunk);
    this.own(trunkGeometry, trunkMaterial);

    const layout = createBranchLayout(this.config, this.rng);
    this.routes = layout.routes;
    this.mainBranches = this.config.domeBranches + this.config.bonsaiBranches;
    this.subBranches = layout.subBranches;
    const branchMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      emissive: P.neonPurple,
      emissiveIntensity: 0.24,
      metalness: 0.58,
      roughness: 0.24,
      transparent: false,
      side: THREE.FrontSide,
    });
    this.branches = new THREE.Mesh(layout.geometry, branchMaterial);
    this.branches.name = 'crystal-tree-roots-and-branches';
    // The merged crown is already emissive and self-layering. Casting all ~385k branch triangles into
    // the directional shadow map duplicates its heaviest pass for almost no visible return; the solid
    // trunk remains the tree's authored shadow caster.
    this.branches.castShadow = false;
    this.root.add(this.branches);
    this.own(layout.geometry, branchMaterial);

    const leafGeometry = createLeafGeometry(0.8 * scale);
    const leafMaterial = new THREE.MeshStandardMaterial({
      color: P.leafGold,
      metalness: 0.3,
      roughness: 0.3,
      emissive: P.darkGold,
      emissiveIntensity: 0.15,
      transparent: false,
      opacity: 0.78,
      alphaHash: true,
      depthWrite: true,
      side: THREE.DoubleSide,
    });
    leafMaterial.forceSinglePass = true;
    patchMotionMaterial(leafMaterial, 'leaf', this.motionUniforms);
    this.leaves = makeResourcePool(
      leafGeometry,
      leafMaterial,
      this.config.leaves,
      layout.leafPoints,
      LEAF_COLORS,
      this.rng,
      'leaf',
      scale,
    );
    this.root.add(this.leaves.mesh);
    this.own(leafGeometry, leafMaterial);

    const fruitGeometry = new THREE.SphereGeometry(0.25 * scale, 6, 5);
    const fruitMaterial = new THREE.MeshStandardMaterial({
      color: 0xcc2244,
      metalness: 0.3,
      roughness: 0.1,
      emissive: 0xcc2244,
      emissiveIntensity: 0.4,
      transparent: false,
      opacity: 0.88,
      alphaHash: true,
      depthWrite: true,
    });
    fruitMaterial.forceSinglePass = true;
    patchMotionMaterial(fruitMaterial, 'fruit', this.motionUniforms);
    this.fruits = makeResourcePool(
      fruitGeometry,
      fruitMaterial,
      this.config.fruits,
      layout.fruitPoints,
      FRUIT_COLORS,
      this.rng,
      'fruit',
      scale,
    );
    this.root.add(this.fruits.mesh);
    this.own(fruitGeometry, fruitMaterial);
    this.availableFruit = this.config.fruits;
    this.availableLeaves = this.config.leaves;
    this.edibleResources = new EdibleResourceRegistry(
      makeEdibleDefinitions(this.fruits, this.leaves, this.config, origin),
      {
        onUnavailable: (resource): void => {
          this.writeEdibleMatrix(resource, false);
          if (resource.kind === 'fruit') {
            this.availableFruit--;
            this.consumedFruit++;
          } else {
            this.availableLeaves--;
            this.consumedLeaves++;
          }
        },
        // Restore the authored matrix before the registry publishes the slot as available.
        onRestore: (resource): void => {
          this.writeEdibleMatrix(resource, true);
          if (resource.kind === 'fruit') this.availableFruit++;
          else this.availableLeaves++;
        },
      },
    );

    const flowerGeometry = new THREE.ConeGeometry(0.2 * scale, 0.5 * scale, 4);
    const flowerMaterial = new THREE.MeshStandardMaterial({
      color: 0xff22aa,
      metalness: 0.4,
      roughness: 0.1,
      emissive: 0xff22aa,
      emissiveIntensity: 0.35,
      transparent: false,
      opacity: 0.82,
      alphaHash: true,
      depthWrite: true,
      side: THREE.FrontSide,
    });
    flowerMaterial.forceSinglePass = true;
    patchMotionMaterial(flowerMaterial, 'flower', this.motionUniforms);
    this.flowers = makeResourcePool(
      flowerGeometry,
      flowerMaterial,
      this.config.flowers,
      layout.flowerPoints,
      FLOWER_COLORS,
      this.rng,
      'flower',
      scale,
    );
    this.root.add(this.flowers.mesh);
    this.own(flowerGeometry, flowerMaterial);

    this.buildCreatures(scale);
    this.eyeMesh = this.buildEyes();
    this.buildAmbient(scale);
    const moteTriangles = this.buildMotes(scale);
    const relicTriangles = this.buildRelics(scale);
    const canopyArtifactTriangles = this.buildCanopyArtifacts(scale);
    this.syncCreatureVisuals(0, 0);
    this.syncAmbientVisuals(0);
    this.syncCanopyArtifacts(0, 0, 0);

    this.drawCalls =
      2 +
      3 +
      this.creatureMeshes.length +
      this.wingMeshes.filter(Boolean).length +
      1 +
      this.ambientMeshes.length +
      1 +
      1 +
      1 +
      1 +
      1 +
      (this.trunk.castShadow ? 1 : 0);
    let creatureTriangles = 0;
    for (const mesh of this.creatureMeshes)
      creatureTriangles += geometryTriangles(mesh.geometry) * mesh.count;
    for (const mesh of this.wingMeshes)
      if (mesh) creatureTriangles += geometryTriangles(mesh.geometry) * mesh.count;
    let ambientTriangles = 0;
    for (const mesh of this.ambientMeshes)
      ambientTriangles += geometryTriangles(mesh.geometry) * mesh.count;
    const trunkTriangles = geometryTriangles(trunkGeometry);
    this.triangles =
      trunkTriangles +
      // Honest worst-case processing count: the trunk is rendered once into the shadow map too.
      (this.trunk.castShadow ? trunkTriangles : 0) +
      layout.triangles +
      geometryTriangles(leafGeometry) * this.config.leaves +
      geometryTriangles(fruitGeometry) * this.config.fruits +
      geometryTriangles(flowerGeometry) * this.config.flowers +
      creatureTriangles +
      geometryTriangles(this.eyeMesh.geometry) * this.eyeMesh.count +
      ambientTriangles +
      moteTriangles +
      relicTriangles +
      canopyArtifactTriangles;
  }

  private own(geometry: THREE.BufferGeometry, material: THREE.Material): void {
    this.ownedGeometries.push(geometry);
    this.ownedMaterials.push(material);
  }

  private buildCreatures(scale: number): void {
    let globalIndex = 0;
    for (let speciesIndex = 0; speciesIndex < CRYSTAL_SPECIES.length; speciesIndex++) {
      const species = CRYSTAL_SPECIES[speciesIndex]!;
      // Preserve one isolated main-stream draw per species, then derive a compact exclusive controller
      // for each resident without perturbing the authored creature/visual RNG sequence.
      const speciesBrainSeed = Math.floor(this.rng() * 0x1_0000_0000) >>> 0;
      const geometry = makeCreatureGeometry(species, scale);
      const material = new THREE.MeshStandardMaterial({
        color: species.color,
        emissive: species.emissive,
        emissiveIntensity: 0.5,
        metalness: 0.5,
        roughness: 0.15,
        transparent: false,
        opacity: 1,
        depthWrite: true,
        side:
          species.geometry === 'plane' || species.geometry === 'ring'
            ? THREE.DoubleSide
            : THREE.FrontSide,
      });
      material.forceSinglePass = true;
      const mesh = new THREE.InstancedMesh(geometry, material, this.config.creaturesPerSpecies);
      mesh.name = `crystal-beings-${species.name.toLowerCase()}`;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.userData['crystalSpecies'] = speciesIndex;
      mesh.boundingSphere = new THREE.Sphere(
        new THREE.Vector3(0, this.config.height * 0.52, 0),
        this.viewRadius,
      );
      this.creatureMeshes.push(mesh);
      this.root.add(mesh);
      this.own(geometry, material);

      let wingMesh: THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> | null =
        null;
      if (species.wingSpan > 0) {
        const wingGeometry = new THREE.PlaneGeometry(
          species.wingSpan * species.size * scale,
          species.size * 0.62 * scale,
          2,
          1,
        );
        const wingMaterial = new THREE.MeshStandardMaterial({
          color: species.color,
          emissive: species.emissive,
          emissiveIntensity: 0.32,
          transparent: false,
          opacity: 0.46,
          alphaHash: true,
          depthWrite: false,
          metalness: 0.25,
          roughness: 0.25,
          side: THREE.DoubleSide,
        });
        wingMaterial.forceSinglePass = true;
        wingMesh = new THREE.InstancedMesh(
          wingGeometry,
          wingMaterial,
          this.config.creaturesPerSpecies * 2,
        );
        wingMesh.name = `crystal-wings-${species.name.toLowerCase()}`;
        wingMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        wingMesh.boundingSphere = mesh.boundingSphere.clone();
        this.root.add(wingMesh);
        this.own(wingGeometry, wingMaterial);
      }
      this.wingMeshes.push(wingMesh);

      for (let slot = 0; slot < this.config.creaturesPerSpecies; slot++) {
        const creatureIndex = globalIndex++;
        const brainSeed =
          (speciesBrainSeed ^ Math.imul(slot + 1, 0x9e37_79b1) ^ creatureIndex) >>> 0;
        this.treeBrains.push(new TreeCreatureBrain(brainSeed || creatureIndex + 1));
        this.treeBrainActions.push(createTreeCreatureAction());
        this.treeBrainReady[creatureIndex] = 1;
        const angle = this.rng() * TAU;
        const radius = (10 + this.rng() * 130) * scale;
        const baseY = (5 + this.rng() * 240) * scale;
        let mask = 0;
        for (const trait of species.quantum) mask |= quantumBit(trait);
        this.creatures.push({
          index: creatureIndex,
          species: speciesIndex,
          slot,
          x: Math.cos(angle) * radius,
          y: baseY,
          z: Math.sin(angle) * radius,
          angle,
          radius,
          baseY,
          speed: 0.2 + this.rng() * 0.8,
          verticalSpeed: 0.5 + this.rng() * 1.5,
          phase: this.rng() * TAU,
          state: species.behavior,
          stateTimer: 1 + this.rng() * 6,
          targetX: (this.rng() - 0.5) * 80 * scale,
          targetY: (60 + this.rng() * 150) * scale,
          targetZ: (this.rng() - 0.5) * 80 * scale,
          climbRoute: Math.floor(this.rng() * Math.max(1, this.routes.length)),
          climbT: this.rng(),
          climbDirection: this.rng() > 0.5 ? 1 : -1,
          climbSpeed: 0.05 + this.rng() * 0.15,
          wingPhase: this.rng() * TAU,
          quantumMask: mask,
          decoherence: hasQuantum(mask, 'decoherence') ? 45 + this.rng() * 90 : 0,
          tunnelTimer: 2 + this.rng() * 8,
          tunnelAt: 0,
          ghostX: (this.rng() - 0.5) * 100 * scale,
          ghostY: (40 + this.rng() * 180) * scale,
          ghostZ: (this.rng() - 0.5) * 100 * scale,
          collapsed: 0,
          startled: 0,
          entangledWith: -1,
          energy: 50 + this.rng() * 50,
          targetFoodId: -1,
          targetFoodGeneration: 0,
          foodCooldownUntil: 0,
          personality: this.rng(),
          neuralSteerX: 0,
          neuralSteerZ: 0,
          neuralSpeed: 0,
          neuralActivity: TREE_CREATURE_ACTIVITY.REST,
          interference: 0,
        });
      }
    }

    // Pairs are local to an entanglement-capable species. Odd populations deliberately leave one
    // unpaired individual rather than inventing a cross-species partner.
    for (let speciesIndex = 0; speciesIndex < CRYSTAL_SPECIES.length; speciesIndex++) {
      const species = CRYSTAL_SPECIES[speciesIndex]!;
      if (!species.quantum.includes('entanglement')) continue;
      const start = speciesIndex * this.config.creaturesPerSpecies;
      for (let slot = 0; slot + 1 < this.config.creaturesPerSpecies; slot += 2) {
        const a = this.creatures[start + slot];
        const b = this.creatures[start + slot + 1];
        if (!a || !b) continue;
        a.entangledWith = b.index;
        b.entangledWith = a.index;
      }
    }
  }

  private buildEyes(): THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> {
    const scale = this.config.height / SOURCE_HEIGHT;
    const geometry = new THREE.SphereGeometry(0.1 * scale, 4, 3);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    const mesh = new THREE.InstancedMesh(geometry, material, this.creatures.length * 2);
    mesh.name = 'crystal-being-eyes';
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(0, this.config.height * 0.52, 0),
      this.viewRadius,
    );
    this.root.add(mesh);
    this.own(geometry, material);
    return mesh;
  }

  private buildAmbient(scale: number): void {
    const familyCounts = new Uint16Array(5);
    for (let i = 0; i < this.config.ambientCreatures; i++) familyCounts[i % 5]!++;
    const familySlots = new Uint16Array(5);
    const colors = [P.crystalBlue, P.neonPurple, P.gold, P.silver, P.iceBlue] as const;
    for (let family = 0; family < 5; family++) {
      const geometry = createAmbientGeometry(family, scale);
      const color = colors[family]!;
      const material = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.28,
        metalness: 0.5,
        roughness: 0.16,
        transparent: false,
        opacity: 1,
        depthWrite: true,
        side: THREE.FrontSide,
      });
      material.forceSinglePass = true;
      const mesh = new THREE.InstancedMesh(geometry, material, familyCounts[family] ?? 0);
      mesh.name = `crystal-ambient-family-${family}`;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.boundingSphere = new THREE.Sphere(
        new THREE.Vector3(0, this.config.height * 0.48, 0),
        this.viewRadius,
      );
      this.ambientMeshes.push(mesh);
      this.root.add(mesh);
      this.own(geometry, material);
    }
    for (let i = 0; i < this.config.ambientCreatures; i++) {
      const family = i % 5;
      const slot = familySlots[family] ?? 0;
      familySlots[family] = slot + 1;
      this.ambient.push({
        family,
        slot,
        radius: (30 + this.rng() * 180) * scale,
        speed: 0.03 + this.rng() * 0.12,
        phase: this.rng() * TAU,
        bobSpeed: 0.4 + this.rng() * 2,
        bobAmount: (0.4 + this.rng() * 2) * scale,
        spin: (this.rng() - 0.5) * 2,
        baseY: (5 + this.rng() * 255) * scale,
        scale: 0.65 + this.rng() * 0.9,
      });
    }
  }

  private buildMotes(scale: number): number {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.config.motes * 3);
    const colors = new Float32Array(this.config.motes * 3);
    const phases = new Float32Array(this.config.motes);
    const palette = [
      P.crystalBlue,
      P.gold,
      P.iceBlue,
      P.silver,
      P.neonPurple,
      P.neuralGlow,
    ] as const;
    const radius = Math.min(220 * scale, this.viewRadius * 0.8);
    for (let i = 0; i < this.config.motes; i++) {
      const angle = this.rng() * TAU;
      const radial = Math.sqrt(this.rng()) * radius;
      positions[i * 3] = Math.cos(angle) * radial;
      positions[i * 3 + 1] = this.rng() * this.config.height * 1.05;
      positions[i * 3 + 2] = Math.sin(angle) * radial;
      TMP_COLOR.set(palette[Math.floor(this.rng() * palette.length)]!);
      colors[i * 3] = TMP_COLOR.r;
      colors[i * 3 + 1] = TMP_COLOR.g;
      colors[i * 3 + 2] = TMP_COLOR.b;
      phases[i] = this.rng() * TAU;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geometry.computeBoundingSphere();
    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: this.motesUniform },
      vertexColors: true,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      vertexShader: `
        attribute float aPhase;
        varying vec3 vColor;
        varying float vPulse;
        uniform float uTime;
        void main() {
          vColor = color;
          vPulse = 0.55 + 0.45 * sin(uTime * 1.7 + aPhase);
          vec3 p = position;
          p.y += sin(uTime * 0.35 + aPhase) * 1.2;
          p.xz += vec2(cos(aPhase), sin(aPhase)) * sin(uTime * 0.22 + aPhase) * 0.7;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = clamp((1.4 + vPulse * 2.2) * (300.0 / max(1.0, -mv.z)), 1.0, 7.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vPulse;
        void main() {
          vec2 q = gl_PointCoord - 0.5;
          float alpha = smoothstep(0.25, 0.0, dot(q, q)) * vPulse;
          if (alpha < 0.02) discard;
          gl_FragColor = vec4(vColor * (1.0 + vPulse), alpha * 0.72);
        }
      `,
    });
    const motes = new THREE.Points(geometry, material);
    motes.name = 'crystal-home-motes';
    this.root.add(motes);
    this.own(geometry, material);
    return 0;
  }

  private buildRelics(scale: number): number {
    const geometry = new THREE.CylinderGeometry(0.7 * scale, 1.3 * scale, 18 * scale, 6);
    const material = new THREE.MeshStandardMaterial({
      color: P.gold,
      emissive: P.neonPurple,
      emissiveIntensity: 0.24,
      metalness: 0.8,
      roughness: 0.12,
      transparent: false,
      opacity: 0.64,
      alphaHash: true,
      vertexColors: true,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, this.config.relics);
    mesh.name = 'crystal-tree-relic-garden';
    for (let i = 0; i < this.config.relics; i++) {
      const height = (8 + this.rng() * 40) * scale;
      const radius = (40 + this.rng() * 150) * scale;
      const angle = this.rng() * TAU;
      TMP_OBJECT.position.set(Math.cos(angle) * radius, height * 0.5, Math.sin(angle) * radius);
      TMP_OBJECT.rotation.set((this.rng() - 0.5) * 0.12, angle, (this.rng() - 0.5) * 0.12);
      TMP_OBJECT.scale.set(
        0.45 + this.rng() * 0.55,
        height / (18 * scale),
        0.45 + this.rng() * 0.55,
      );
      TMP_OBJECT.updateMatrix();
      mesh.setMatrixAt(i, TMP_OBJECT.matrix);
      mesh.setColorAt(i, TMP_COLOR.set(i % 2 === 0 ? P.gold : P.crystalBlue));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    this.root.add(mesh);
    this.own(geometry, material);
    return geometryTriangles(geometry) * this.config.relics;
  }

  private buildCanopyArtifacts(scale: number): number {
    const lightSpecs = [
      [P.neonPurple, 2.5, -30, 150, -20, 300],
      [P.gold, 1.8, 25, 100, 30, 250],
      [P.crystalBlue, 1.5, 0, 255, 0, 450],
      [P.cosmicPink, 1.2, -60, 80, 60, 200],
      [P.neuralGlow, 1.8, 50, 200, -50, 300],
    ] as const;
    for (const [color, intensity, x, y, z] of lightSpecs) {
      this.pulseArtifacts.push({
        color,
        base: intensity,
        phase: this.rng() * TAU,
        position: new THREE.Vector3(x * scale, y * scale, z * scale),
        scale: (2.2 + intensity * 0.7) / 2.4,
      });
    }

    const ringGeometry = new THREE.RingGeometry(58 * scale, 82 * scale, 6, 1);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: P.crystalBlue,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    this.hexRing = new THREE.Mesh(ringGeometry, ringMaterial);
    this.hexRing.name = 'crystal-canopy-hex-sigil';
    this.hexRing.rotation.x = -Math.PI / 2;
    this.hexRing.position.y = this.config.height * 1.025;
    this.root.add(this.hexRing);
    this.own(ringGeometry, ringMaterial);

    const veilGeometry = new THREE.PlaneGeometry(220 * scale, 220 * scale);
    const veilMaterial = new THREE.MeshBasicMaterial({
      color: P.crystalBlue,
      transparent: true,
      opacity: 0.025,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    this.veilMesh = new THREE.InstancedMesh(veilGeometry, veilMaterial, 4);
    this.veilMesh.name = 'crystal-canopy-haze-veils';
    for (let i = 0; i < 4; i++) {
      TMP_OBJECT.position.set(0, this.config.height * (0.62 + i * 0.085), 0);
      TMP_OBJECT.rotation.set(-Math.PI / 2, i * 0.37, 0);
      TMP_OBJECT.scale.setScalar(0.85 + i * 0.09);
      TMP_OBJECT.updateMatrix();
      this.veilMesh.setMatrixAt(i, TMP_OBJECT.matrix);
    }
    this.veilMesh.instanceMatrix.needsUpdate = true;
    this.root.add(this.veilMesh);
    this.own(veilGeometry, veilMaterial);

    const lightningGeometry = new THREE.SphereGeometry(2.4 * scale, 6, 4);
    const lightningMaterial = new THREE.MeshBasicMaterial({
      color: 0xa0c8ff,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      toneMapped: false,
    });
    this.lightningMesh = new THREE.InstancedMesh(
      lightningGeometry,
      lightningMaterial,
      this.pulseArtifacts.length + 8,
    );
    this.lightningMesh.name = 'crystal-canopy-pulse-lights-and-lightning-wisps';
    this.lightningMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.lightningBase = new Float32Array(8 * 3);
    this.lightningPhase = new Float32Array(8);
    this.lightningInterval = new Float32Array(8);
    for (let i = 0; i < 8; i++) {
      const angle = this.rng() * TAU;
      const radius = (45 + this.rng() * 95) * scale;
      this.lightningBase[i * 3] = Math.cos(angle) * radius;
      this.lightningBase[i * 3 + 1] = this.config.height * (0.62 + this.rng() * 0.42);
      this.lightningBase[i * 3 + 2] = Math.sin(angle) * radius;
      this.lightningPhase[i] = this.rng() * TAU;
      this.lightningInterval[i] = 4 + this.rng() * 8;
    }
    this.root.add(this.lightningMesh);
    this.own(lightningGeometry, lightningMaterial);
    return (
      geometryTriangles(ringGeometry) +
      geometryTriangles(veilGeometry) * this.veilMesh.count +
      geometryTriangles(lightningGeometry) * this.lightningMesh.count
    );
  }

  /** Advance logical ecology on scaled time and presentation effects on World's visual clock. */
  update(frame: CrystalEcosystemFrame): void {
    if (this.disposed) return;
    const visualDt = Number.isFinite(frame.visualDt)
      ? Math.max(0, Math.min(0.1, frame.visualDt))
      : 0;
    // Food leases/respawns follow the full scaled simulation delta. Creature locomotion remains
    // bounded to one stable 100 ms integration step so a speed change or hitch cannot cause a jump.
    const simulationDt = frame.visualOnly || !Number.isFinite(frame.dt) ? 0 : Math.max(0, frame.dt);
    const dt = Math.min(0.1, simulationDt);
    const time = Number.isFinite(frame.time) ? frame.time : this.simTime;
    const chaos = clamp01(Number.isFinite(frame.chaos) ? frame.chaos : 0);
    const entropy = clamp01(Number.isFinite(frame.entropy) ? frame.entropy : 0);
    const weather = clamp01(Number.isFinite(frame.weather) ? frame.weather : 0);
    const windX = Number.isFinite(frame.windX) ? frame.windX : 0;
    const windZ = Number.isFinite(frame.windZ) ? frame.windZ : 0;

    this.motionUniforms.time.value = time;
    this.motionUniforms.wind.value.set(windX, windZ);
    this.motesUniform.value = time;
    this.wingVisualTime += visualDt;
    if (simulationDt > 0) {
      this.simTime += simulationDt;
      this.edibleResources.update(this.simTime);
      if (dt > 0) this.stepCreatures(dt, chaos, entropy);
    }

    this.shakeTime = Math.max(0, this.shakeTime - visualDt);
    const shake = clamp01(this.shakeTime / 0.65);
    this.motionUniforms.shake.value = shake;
    const shakeAngle = Math.sin(time * 31) * shake * 0.008;
    this.root.rotation.set(Math.cos(time * 27) * shake * 0.004, 0, shakeAngle);
    this.trunk.material.emissiveIntensity = 0.09 + chaos * 0.09 + shake * 0.12;
    this.branches.material.emissiveIntensity = 0.23 + entropy * 0.09 + shake * 0.12;
    this.syncCreatureVisuals(time, this.wingVisualTime);
    // Ambient fauna orbit on scaled ecological time: pause freezes travel instead of letting the
    // presentation clock silently carry all 99 bodies around the tree.
    this.syncAmbientVisuals(this.simTime);
    this.syncCanopyArtifacts(time, weather, shake);
  }

  private stepCreatures(dt: number, chaos: number, entropy: number): void {
    const scale = this.config.height / SOURCE_HEIGHT;
    const maxRadius = 210 * scale;
    for (const creature of this.creatures) {
      const species = CRYSTAL_SPECIES[creature.species]!;
      creature.phase += dt * (0.55 + creature.speed * 0.7);
      creature.stateTimer -= dt;
      creature.collapsed = Math.max(0, creature.collapsed - dt);
      creature.startled = Math.max(0, creature.startled - dt);
      creature.energy = Math.max(0, creature.energy - dt * (0.22 + chaos * 0.18));
      this.runTreeNeuralController(creature, scale, chaos, entropy);

      if (hasQuantum(creature.quantumMask, 'decoherence') && creature.decoherence > 0) {
        creature.decoherence -= dt * (0.5 + entropy);
        if (creature.decoherence <= 0) {
          creature.quantumMask = quantumBit('decoherence');
          creature.interference = 0;
        }
      }

      creature.tunnelTimer -= dt;
      if (
        creature.collapsed <= 0 &&
        hasQuantum(creature.quantumMask, 'tunneling') &&
        creature.tunnelTimer <= 0
      ) {
        const route = this.routes[Math.floor(this.rng() * Math.max(1, this.routes.length))];
        if (route) {
          routePoint(route, this.rng(), TMP_POS);
          creature.x = TMP_POS.x;
          creature.y = TMP_POS.y;
          creature.z = TMP_POS.z;
        } else {
          creature.x = -creature.x;
          creature.z = -creature.z;
        }
        creature.tunnelAt = this.simTime;
        creature.tunnelTimer = 4 + this.rng() * 12;
        this.teleports++;
      }

      if (creature.stateTimer <= 0) this.chooseCreatureState(creature, species, scale);
      if (creature.collapsed > 0) continue;

      if (creature.startled > 0) {
        creature.x += Math.sin(this.simTime * 20 + creature.phase) * 8 * scale * dt;
        creature.y += Math.cos(this.simTime * 15 + creature.phase) * 10 * scale * dt;
        creature.z += Math.sin(this.simTime * 18 + creature.phase + 1) * 8 * scale * dt;
      } else {
        switch (creature.state) {
          case 'seek':
            this.stepSeeking(creature, dt, scale);
            break;
          case 'climb': {
            const route = this.routes[creature.climbRoute % Math.max(1, this.routes.length)];
            if (!route) {
              creature.state = 'orbit';
              break;
            }
            creature.climbT += creature.climbDirection * creature.climbSpeed * dt;
            if (creature.climbT >= 1 || creature.climbT <= 0) {
              creature.climbT = clamp01(creature.climbT);
              creature.climbDirection *= -1;
            }
            routePoint(route, creature.climbT, TMP_POS);
            creature.x = TMP_POS.x;
            creature.y = TMP_POS.y + Math.sin(creature.phase * 3) * 0.35 * scale;
            creature.z = TMP_POS.z;
            break;
          }
          case 'swarm': {
            const response = 1 - Math.exp(-dt * (0.7 + creature.speed));
            creature.x += (creature.targetX - creature.x) * response;
            creature.y += (creature.targetY - creature.y) * response;
            creature.z += (creature.targetZ - creature.z) * response;
            if (
              Math.abs(creature.targetX - creature.x) +
                Math.abs(creature.targetY - creature.y) +
                Math.abs(creature.targetZ - creature.z) <
              3 * scale
            ) {
              this.setRandomWaypoint(creature, scale);
            }
            break;
          }
          case 'flutter':
            creature.angle += dt * (0.14 + creature.speed * 0.12);
            creature.x = Math.cos(creature.angle) * creature.radius;
            creature.z = Math.sin(creature.angle * 1.07) * creature.radius;
            creature.y =
              creature.baseY +
              Math.sin(this.simTime * creature.verticalSpeed + creature.phase) * 8 * scale;
            break;
          case 'orbit':
            creature.angle += dt * (0.08 + creature.speed * 0.1);
            creature.x = Math.cos(creature.angle) * creature.radius;
            creature.z = Math.sin(creature.angle) * creature.radius;
            creature.y =
              creature.baseY +
              Math.sin(this.simTime * creature.verticalSpeed + creature.phase) * 2.4 * scale;
            break;
          case 'pause':
            break;
        }

        // The canonical TinyMLP motor axes are a real bounded locomotion contribution. Survival
        // seeking remains dominant so a friendly neural bias cannot pull a creature off its meal.
        const neuralAuthority = creature.state === 'seek' ? 0.2 : 1;
        const neuralStep =
          (0.3 + creature.neuralSpeed * 0.7) * (2 + creature.speed * 2) * scale * dt;
        creature.x += creature.neuralSteerX * neuralStep * neuralAuthority;
        creature.z += creature.neuralSteerZ * neuralStep * neuralAuthority;

        // Social output gathers residents onto a calm authored welcome ring. It never targets a
        // visitor, so tree residents cannot follow, swarm, or trap a departing being.
        if (creature.neuralActivity === TREE_CREATURE_ACTIVITY.SOCIAL && this.visitorPresence > 0) {
          const radial = Math.hypot(creature.x, creature.z);
          if (radial > 1e-6) {
            const welcomeRadius = 55 * scale;
            const correction = Math.max(-1, Math.min(1, (welcomeRadius - radial) / welcomeRadius));
            const welcomeStep =
              correction *
              this.visitorPresence *
              (0.4 + this.visitorSocialActivity * 0.6) *
              scale *
              dt;
            creature.x += (creature.x / radial) * welcomeStep;
            creature.z += (creature.z / radial) * welcomeStep;
          }
        }
      }

      creature.y = Math.max(1.5 * scale, Math.min(this.config.height * 1.045, creature.y));
      const radial = Math.hypot(creature.x, creature.z);
      if (radial > maxRadius) {
        const pull = maxRadius / radial;
        creature.x *= pull;
        creature.z *= pull;
      }
    }

    // Same-species constructive/destructive fields are bounded to 25×25 per pool, not 250².
    for (let speciesIndex = 0; speciesIndex < CRYSTAL_SPECIES.length; speciesIndex++) {
      const start = speciesIndex * this.config.creaturesPerSpecies;
      const end = start + this.config.creaturesPerSpecies;
      for (let i = start; i < end; i++) {
        const a = this.creatures[i];
        if (!a || !hasQuantum(a.quantumMask, 'interference')) continue;
        let field = 0;
        for (let j = start; j < end; j++) {
          if (i === j) continue;
          const b = this.creatures[j];
          if (!b) continue;
          const d2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
          if (d2 < (24 * scale) ** 2) field += Math.cos(a.phase - b.phase) / (1 + d2 * 0.01);
        }
        a.interference += (Math.max(-1, Math.min(1, field)) - a.interference) * Math.min(1, dt * 3);
      }
    }

    // Bipolar twins share the same deterministic state vocabulary while curving in opposite spatial
    // directions. Each pair is solved once, preserving a bounded, dt-correct tug rather than mirroring
    // by per-frame assignment.
    for (const a of this.creatures) {
      if (a.entangledWith <= a.index) continue;
      const b = this.creatures[a.entangledWith];
      if (!b) continue;
      const response = Math.min(0.18, dt * 0.7);
      b.x += (-a.x - b.x) * response;
      b.z += (-a.z - b.z) * response;
      const sharedY = (a.y + b.y) * 0.5;
      a.y += (sharedY - a.y) * response;
      b.y += (sharedY - b.y) * response;
    }
  }

  private runTreeNeuralController(
    creature: TreeCreature,
    scale: number,
    chaos: number,
    entropy: number,
  ): void {
    const brain = this.treeBrains[creature.index];
    const actionBuffer = this.treeBrainActions[creature.index];
    if (!brain || !actionBuffer) {
      creature.neuralSteerX = 0;
      creature.neuralSteerZ = 0;
      creature.neuralSpeed = 0;
      creature.neuralActivity = TREE_CREATURE_ACTIVITY.REST;
      return;
    }

    let foodDirectionX = 0;
    let foodDirectionZ = 0;
    let foodDistance = 1;
    const resource = this.edibleResources.get(creature.targetFoodId);
    if (
      resource &&
      resource.ownerId === TREE_CREATURE_OWNER_BASE - creature.index &&
      resource.generation === creature.targetFoodGeneration &&
      resource.state === 'reserved'
    ) {
      const targetIndex =
        resource.kind === 'fruit' ? resource.id : resource.id - this.config.fruits;
      const targetPool = resource.kind === 'fruit' ? this.fruits : this.leaves;
      const p3 = targetIndex * 3;
      const dx = (targetPool.positions[p3] ?? creature.x) - creature.x;
      const dz = (targetPool.positions[p3 + 2] ?? creature.z) - creature.z;
      const distance = Math.hypot(dx, dz);
      if (distance > 1e-8) {
        foodDirectionX = dx / distance;
        foodDirectionZ = dz / distance;
      }
      foodDistance = clamp01(distance / Math.max(1, this.viewRadius));
    }

    let nearby = 0;
    const start = creature.species * this.config.creaturesPerSpecies;
    const end = start + this.config.creaturesPerSpecies;
    const socialRadiusSq = (24 * scale) ** 2;
    for (let index = start; index < end; index++) {
      const other = this.creatures[index];
      if (!other || other.index === creature.index) continue;
      const dx = other.x - creature.x;
      const dy = other.y - creature.y;
      const dz = other.z - creature.z;
      if (dx * dx + dy * dy + dz * dz <= socialRadiusSq) nearby++;
    }

    const percept = this.brainPercept;
    percept.energy = clamp01(creature.energy / 100);
    percept.foodDirectionX = foodDirectionX;
    percept.foodDirectionZ = foodDirectionZ;
    percept.foodDistance = foodDistance;
    percept.socialDensity = clamp01(
      nearby / 8 + this.visitorPresence * (0.45 + this.visitorSocialActivity * 0.25),
    );
    // Residents live entirely inside the sanctuary where hostile action is suppressed by design, so
    // the threat channel is honestly constant-zero here — the input exists for detached/test
    // harnesses and any future off-tree deployment, not as a decorative production signal.
    percept.threat = 0;
    percept.safeZoneCalm = clamp01(
      1 - chaos * 0.12 - entropy * 0.15 + this.visitorSocialActivity * 0.12,
    );
    percept.phase = creature.phase + chaos * 0.7 + entropy * 1.1;
    percept.personality = creature.personality;

    const action = brain.decide(percept, actionBuffer);
    this.neuralDecisions++;
    if (action.usedFallback) {
      this.neuralFallbacks++;
      if (this.treeBrainReady[creature.index] !== 0) {
        this.treeBrainReady[creature.index] = 0;
        this.unreadyTreeBrains++;
      }
      if (this.neuralLastFallbackReason === 'none') {
        // All runtime percepts above are finite, so an unannounced fallback can only be a bad model
        // output (explicit invalid model loads set `invalid-weights` in the loading API).
        this.neuralLastFallbackReason = 'invalid-output';
      }
    }
    creature.neuralSteerX = action.steerX;
    creature.neuralSteerZ = action.steerZ;
    creature.neuralSpeed = action.speed;
    creature.neuralActivity = action.activity;
    this.neuralLastActivity = action.activity;
    this.neuralLastMotorX = action.motorX;
    this.neuralLastMotorZ = action.motorZ;
    this.neuralLastSocialDrive = action.socialDrive;
  }

  private chooseCreatureState(
    creature: TreeCreature,
    species: CrystalSpecies,
    scale: number,
  ): void {
    if (creature.targetFoodId >= 0) this.releaseCreatureFood(creature, 2);
    creature.stateTimer = 3 + this.rng() * 7;
    const survivalHunger = creature.energy < 45;
    const neuralHunger =
      creature.energy < 62 && creature.neuralActivity === TREE_CREATURE_ACTIVITY.EAT;
    if ((survivalHunger || neuralHunger) && this.simTime >= creature.foodCooldownUntil) {
      const ownerId = TREE_CREATURE_OWNER_BASE - creature.index;
      const preferred: EdibleResourceKind = creature.index % 2 === 0 ? 'fruit' : 'leaf';
      const reservation =
        this.edibleResources.reserveAny(ownerId, this.simTime, FOOD_LEASE_SECONDS, preferred) ??
        this.edibleResources.reserveAny(
          ownerId,
          this.simTime,
          FOOD_LEASE_SECONDS,
          preferred === 'fruit' ? 'leaf' : 'fruit',
        );
      if (reservation) {
        creature.state = 'seek';
        creature.stateTimer = 8 + this.rng() * 3;
        creature.targetFoodId = reservation.id;
        creature.targetFoodGeneration = reservation.generation;
        return;
      }
      creature.foodCooldownUntil = this.simTime + 1.5 + this.rng() * 1.5;
    }
    if (!survivalHunger && creature.neuralActivity === TREE_CREATURE_ACTIVITY.REST) {
      creature.state = 'pause';
      creature.stateTimer = 1.5 + this.rng() * 2.5;
      return;
    }
    if (creature.neuralActivity === TREE_CREATURE_ACTIVITY.SOCIAL && this.visitorPresence > 0) {
      creature.state = 'orbit';
      creature.radius += (55 * scale - creature.radius) * 0.2;
      creature.stateTimer = 2 + this.rng() * 4;
      return;
    }
    if (hasQuantum(creature.quantumMask, 'phaseShift') && Math.sin(creature.phase) > 0.3) {
      creature.state = species.behavior === 'climb' ? 'orbit' : 'climb';
    } else if (species.behavior === 'climb') {
      creature.state = this.rng() > 0.28 ? 'climb' : 'pause';
    } else {
      creature.state = species.behavior;
    }
    if (creature.state === 'climb') {
      creature.climbRoute = Math.floor(this.rng() * Math.max(1, this.routes.length));
      creature.climbT = this.rng();
      creature.climbDirection = this.rng() > 0.5 ? 1 : -1;
    } else if (creature.state === 'swarm') {
      this.setRandomWaypoint(creature, scale);
    }
  }

  private setRandomWaypoint(creature: TreeCreature, scale: number): void {
    creature.targetX = (this.rng() - 0.5) * 90 * scale;
    creature.targetY = (45 + this.rng() * 175) * scale;
    creature.targetZ = (this.rng() - 0.5) * 90 * scale;
  }

  private stepSeeking(creature: TreeCreature, dt: number, scale: number): void {
    const ownerId = TREE_CREATURE_OWNER_BASE - creature.index;
    const resource = this.edibleResources.get(creature.targetFoodId);
    if (
      !resource ||
      resource.generation !== creature.targetFoodGeneration ||
      resource.ownerId !== ownerId ||
      resource.state !== 'reserved'
    ) {
      this.releaseCreatureFood(creature, 1.5);
      creature.state = CRYSTAL_SPECIES[creature.species]!.behavior;
      creature.stateTimer = 1 + this.rng() * 2;
      return;
    }
    // Tree dwellers fly to the authored canopy instance. Ground-based external adapters use the
    // registry's interactionX/Y/Z approach slots instead of trying to path into the crown.
    const targetIndex = resource.kind === 'fruit' ? resource.id : resource.id - this.config.fruits;
    const targetPool = resource.kind === 'fruit' ? this.fruits : this.leaves;
    const p3 = targetIndex * 3;
    const tx = targetPool.positions[p3] ?? 0;
    const ty = targetPool.positions[p3 + 1] ?? 0;
    const tz = targetPool.positions[p3 + 2] ?? 0;
    const dx = tx - creature.x;
    const dy = ty - creature.y;
    const dz = tz - creature.z;
    const distance = Math.hypot(dx, dy, dz);
    if (distance <= 1.6 * scale) {
      const began = this.edibleResources.beginConsumption(
        resource.id,
        creature.targetFoodGeneration,
        ownerId,
        this.simTime,
      );
      const nourishment = began
        ? this.edibleResources.completeConsumption(
            resource.id,
            creature.targetFoodGeneration,
            ownerId,
            this.simTime,
          )
        : 0;
      if (nourishment > 0) creature.energy = Math.min(100, creature.energy + nourishment);
      else this.edibleResources.cancel(resource.id, creature.targetFoodGeneration, ownerId);
      creature.targetFoodId = -1;
      creature.targetFoodGeneration = 0;
      creature.foodCooldownUntil = this.simTime + 3 + this.rng() * 4;
      creature.state = CRYSTAL_SPECIES[creature.species]!.behavior;
      creature.stateTimer = 2 + this.rng() * 4;
      return;
    }
    if (distance > 0.0001) {
      const step = Math.min(distance, (5 + creature.speed * 5) * scale * dt);
      creature.x += (dx / distance) * step;
      creature.y += (dy / distance) * step;
      creature.z += (dz / distance) * step;
    }
  }

  private releaseCreatureFood(creature: TreeCreature, cooldownSeconds: number): void {
    if (creature.targetFoodId >= 0) {
      this.edibleResources.cancel(
        creature.targetFoodId,
        creature.targetFoodGeneration,
        TREE_CREATURE_OWNER_BASE - creature.index,
      );
    }
    creature.targetFoodId = -1;
    creature.targetFoodGeneration = 0;
    creature.foodCooldownUntil = Math.max(
      creature.foodCooldownUntil,
      this.simTime + cooldownSeconds,
    );
  }

  /** Allocation-free live visitor signal for calm social responsiveness inside the safe zone. */
  setVisitorPresence(count: number, socialActivity = 0): void {
    this.visitorCount = Number.isFinite(count) ? Math.max(0, Math.min(64, Math.floor(count))) : 0;
    this.visitorPresence = clamp01(this.visitorCount / 32);
    this.visitorSocialActivity = Number.isFinite(socialActivity) ? clamp01(socialActivity) : 0;
  }

  /** Allocation-free availability signal for species visit scoring. */
  availableTreeFood(): number {
    return this.availableFruit + this.availableLeaves;
  }

  /** Development/model-loader hook. Direct non-finite mutation is detected on the next inference. */
  treeBrainWeights(creatureIndex: number): Float32Array | null {
    if (!Number.isInteger(creatureIndex) || creatureIndex < 0) return null;
    return this.treeBrains[creatureIndex]?.weightsView() ?? null;
  }

  /** Validate and install one resident's fixed-size model without replacing runtime buffers. */
  loadTreeBrainWeights(creatureIndex: number, weights: ArrayLike<number>): boolean {
    if (!Number.isInteger(creatureIndex) || creatureIndex < 0) return false;
    const brain = this.treeBrains[creatureIndex];
    if (!brain) return false;
    const loaded = brain.loadWeights(weights);
    const wasReady = this.treeBrainReady[creatureIndex] !== 0;
    if (loaded) {
      if (!wasReady) this.unreadyTreeBrains = Math.max(0, this.unreadyTreeBrains - 1);
      this.treeBrainReady[creatureIndex] = 1;
    } else {
      if (wasReady) this.unreadyTreeBrains++;
      this.treeBrainReady[creatureIndex] = 0;
      this.neuralLastFallbackReason = 'invalid-weights';
    }
    return loaded;
  }

  /** Low-cadence, development-facing proof that the neural path is loaded and executing. */
  neuralStatus(): CrystalTreeNeuralStatus {
    return {
      controllerCount: this.treeBrains.length,
      inputCount: TREE_CREATURE_BRAIN_INPUTS,
      hiddenCount: TREE_CREATURE_BRAIN_HIDDEN,
      outputCount: TREE_CREATURE_BRAIN_OUTPUTS,
      parametersPerController: TREE_CREATURE_BRAIN_PARAMETERS,
      totalParameters: TREE_CREATURE_BRAIN_PARAMETERS * this.treeBrains.length,
      modelReady: this.unreadyTreeBrains === 0,
      decisions: this.neuralDecisions,
      fallbackCount: this.neuralFallbacks,
      lastFallbackReason: this.neuralLastFallbackReason,
      lastActivity: this.neuralLastActivity,
      lastMotorX: this.neuralLastMotorX,
      lastMotorZ: this.neuralLastMotorZ,
      lastSocialDrive: this.neuralLastSocialDrive,
      visitorCount: this.visitorCount,
      visitorPresence: this.visitorPresence,
      visitorSocialActivity: this.visitorSocialActivity,
    };
  }

  /** Stable ID for an authored food instance, or null for an invalid index. */
  foodResourceId(kind: EdibleResourceKind, index: number): number | null {
    const count = kind === 'fruit' ? this.config.fruits : this.config.leaves;
    if (!Number.isInteger(index) || index < 0 || index >= count) return null;
    return foodResourceId(kind, index, this.config.fruits);
  }

  /** Current scaled ecological clock used for leases and the exact five-second respawn. */
  get foodTime(): number {
    return this.simTime;
  }

  reserveFood(
    ownerId: number,
    leaseSeconds = FOOD_LEASE_SECONDS,
    kind?: EdibleResourceKind,
  ): EdibleReservation | null {
    if (this.disposed) return null;
    return this.edibleResources.reserveAny(ownerId, this.simTime, leaseSeconds, kind);
  }

  reserveFoodById(
    resourceId: number,
    ownerId: number,
    leaseSeconds = FOOD_LEASE_SECONDS,
  ): EdibleReservation | null {
    if (this.disposed) return null;
    return this.edibleResources.reserveById(resourceId, ownerId, this.simTime, leaseSeconds);
  }

  renewFood(reservation: EdibleReservation, leaseSeconds = FOOD_LEASE_SECONDS): boolean {
    if (this.disposed) return false;
    return this.edibleResources.renewLease(
      reservation.id,
      reservation.generation,
      reservation.ownerId,
      this.simTime,
      leaseSeconds,
    );
  }

  beginFoodConsumption(reservation: EdibleReservation): boolean {
    if (this.disposed) return false;
    return this.edibleResources.beginConsumption(
      reservation.id,
      reservation.generation,
      reservation.ownerId,
      this.simTime,
    );
  }

  completeFoodConsumption(reservation: EdibleReservation): number {
    if (this.disposed) return 0;
    return this.edibleResources.completeConsumption(
      reservation.id,
      reservation.generation,
      reservation.ownerId,
      this.simTime,
    );
  }

  cancelFood(reservation: EdibleReservation): boolean {
    return this.edibleResources.cancel(reservation.id, reservation.generation, reservation.ownerId);
  }

  releaseFoodOwner(ownerId: number): number {
    return this.edibleResources.releaseOwner(ownerId);
  }

  /**
   * Genesis/reset lifecycle: invalidate every reservation, restore hidden matrices, and clear all
   * tree-creature target handles. Registry reset preserves restore-before-available ordering.
   */
  resetFood(now = 0): void {
    if (!Number.isFinite(now) || now < 0) throw new RangeError('now must be a finite number >= 0');
    this.simTime = now;
    this.edibleResources.reset(now);
    this.availableFruit = this.config.fruits;
    this.availableLeaves = this.config.leaves;
    this.consumedFruit = 0;
    this.consumedLeaves = 0;
    this.visitorCount = 0;
    this.visitorPresence = 0;
    this.visitorSocialActivity = 0;
    this.neuralDecisions = 0;
    this.neuralFallbacks = 0;
    this.neuralLastActivity = TREE_CREATURE_ACTIVITY.REST;
    this.neuralLastMotorX = 0;
    this.neuralLastMotorZ = 0;
    this.neuralLastSocialDrive = 0;
    if (this.unreadyTreeBrains === 0) this.neuralLastFallbackReason = 'none';
    for (const creature of this.creatures) {
      creature.targetFoodId = -1;
      creature.targetFoodGeneration = 0;
      creature.foodCooldownUntil = now;
      creature.neuralSteerX = 0;
      creature.neuralSteerZ = 0;
      creature.neuralSpeed = 0;
      creature.neuralActivity = TREE_CREATURE_ACTIVITY.REST;
      if (creature.state === 'seek') {
        creature.state = CRYSTAL_SPECIES[creature.species]!.behavior;
        creature.stateTimer = 1 + (creature.index % 5) * 0.2;
      }
    }
  }

  /** Compatibility helper; still executes the canonical reserve -> consume transaction. */
  consumeFruit(index: number): boolean {
    return this.consumeFoodIndex('fruit', index);
  }

  /** Leaves are first-class pooled food and follow the same transaction and clock. */
  consumeLeaf(index: number): boolean {
    return this.consumeFoodIndex('leaf', index);
  }

  private consumeFoodIndex(kind: EdibleResourceKind, index: number): boolean {
    const id = this.foodResourceId(kind, index);
    if (this.disposed || id === null) return false;
    const reservation = this.edibleResources.reserveById(
      id,
      COMPATIBILITY_CONSUMER_ID,
      this.simTime,
      0.5,
    );
    if (!reservation) return false;
    if (!this.beginFoodConsumption(reservation)) {
      this.cancelFood(reservation);
      return false;
    }
    return this.completeFoodConsumption(reservation) > 0;
  }

  private writeEdibleMatrix(resource: EdibleResource, visible: boolean): void {
    const index = resource.kind === 'fruit' ? resource.id : resource.id - this.config.fruits;
    this.writeResourceMatrix(resource.kind === 'fruit' ? this.fruits : this.leaves, index, visible);
  }

  private writeResourceMatrix(pool: ResourcePool, index: number, visible: boolean): void {
    const p3 = index * 3;
    TMP_OBJECT.position.set(
      pool.positions[p3] ?? 0,
      pool.positions[p3 + 1] ?? 0,
      pool.positions[p3 + 2] ?? 0,
    );
    TMP_OBJECT.rotation.set(
      pool.rotations[p3] ?? 0,
      pool.rotations[p3 + 1] ?? 0,
      pool.rotations[p3 + 2] ?? 0,
    );
    TMP_OBJECT.scale.setScalar(visible ? (pool.scales[index] ?? 1) : 0);
    TMP_OBJECT.updateMatrix();
    pool.mesh.setMatrixAt(index, TMP_OBJECT.matrix);
    pool.mesh.instanceMatrix.needsUpdate = true;
  }

  private syncCreatureVisuals(time: number, wingTime: number): void {
    const scale = this.config.height / SOURCE_HEIGHT;
    for (const creature of this.creatures) {
      const species = CRYSTAL_SPECIES[creature.species]!;
      let x = creature.x;
      let y = creature.y;
      let z = creature.z;
      const uncertain = hasQuantum(creature.quantumMask, 'uncertainty') && creature.collapsed <= 0;
      if (uncertain) {
        x += Math.sin(time * 13 + creature.phase) * 0.42 * scale;
        y += Math.cos(time * 11 + creature.phase * 1.3) * 0.28 * scale;
        z += Math.sin(time * 17 + creature.phase * 0.7) * 0.42 * scale;
      }
      const inGhost =
        hasQuantum(creature.quantumMask, 'superposition') &&
        creature.collapsed <= 0 &&
        Math.sin(time * 2.7 + creature.phase) > 0.72;
      if (inGhost) {
        x += (creature.ghostX - x) * 0.26;
        y += (creature.ghostY - y) * 0.26;
        z += (creature.ghostZ - z) * 0.26;
      }
      if (hasQuantum(creature.quantumMask, 'zeroPoint')) {
        x += Math.sin(time * 19 + creature.phase) * 0.16 * scale;
        y += Math.cos(time * 23 + creature.phase) * 0.12 * scale;
      }

      const spin = hasQuantum(creature.quantumMask, 'spin')
        ? time * (1.5 + creature.speed)
        : creature.angle + Math.PI / 2;
      const pulse = 1 + creature.interference * 0.12;
      const collapseScale = creature.collapsed > 0 ? 1.18 : 1;
      TMP_OBJECT.position.set(x, y, z);
      TMP_OBJECT.rotation.set(
        creature.startled > 0 ? time * 8 + creature.phase : Math.sin(creature.phase) * 0.15,
        spin,
        creature.startled > 0 ? time * 6 : Math.cos(creature.phase) * 0.12,
      );
      TMP_OBJECT.scale.setScalar(pulse * collapseScale);
      TMP_OBJECT.updateMatrix();
      const bodyMesh = this.creatureMeshes[creature.species]!;
      bodyMesh.setMatrixAt(creature.slot, TMP_OBJECT.matrix);
      TMP_COLOR.set(species.color);
      if (inGhost) TMP_COLOR.lerp(COLOR_NEURAL_GLOW, 0.55);
      if (creature.collapsed > 0) TMP_COLOR.lerp(COLOR_GOLD, 0.62);
      if (creature.interference < -0.25) TMP_COLOR.multiplyScalar(0.55);
      else if (creature.interference > 0.25) TMP_COLOR.lerp(COLOR_WHITE, 0.32);
      bodyMesh.setColorAt(creature.slot, TMP_COLOR);

      const sideX = Math.cos(spin);
      const sideZ = -Math.sin(spin);
      const wingMesh = this.wingMeshes[creature.species];
      if (wingMesh) {
        const flap =
          Math.sin(creature.wingPhase + wingTime * (4 + creature.verticalSpeed * 1.5)) * 0.72;
        for (let side = 0; side < 2; side++) {
          const direction = side === 0 ? -1 : 1;
          TMP_OBJECT.position.set(
            x + sideX * direction * species.size * scale * 0.48,
            y,
            z + sideZ * direction * species.size * scale * 0.48,
          );
          TMP_OBJECT.rotation.set(
            direction * flap,
            spin,
            direction * (Math.PI * 0.16 + flap * 0.3),
          );
          TMP_OBJECT.scale.setScalar(pulse);
          TMP_OBJECT.updateMatrix();
          wingMesh.setMatrixAt(creature.slot * 2 + side, TMP_OBJECT.matrix);
        }
      }

      const forwardX = Math.sin(spin);
      const forwardZ = Math.cos(spin);
      for (let eye = 0; eye < 2; eye++) {
        const side = eye === 0 ? -1 : 1;
        TMP_OBJECT.position.set(
          x + sideX * side * species.size * scale * 0.2 + forwardX * species.size * scale * 0.36,
          y + species.size * scale * 0.2,
          z + sideZ * side * species.size * scale * 0.2 + forwardZ * species.size * scale * 0.36,
        );
        TMP_OBJECT.rotation.set(0, spin, 0);
        TMP_OBJECT.scale.setScalar(creature.collapsed > 0 ? 1.6 : 1);
        TMP_OBJECT.updateMatrix();
        this.eyeMesh.setMatrixAt(creature.index * 2 + eye, TMP_OBJECT.matrix);
      }
    }
    for (const mesh of this.creatureMeshes) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    for (const mesh of this.wingMeshes) if (mesh) mesh.instanceMatrix.needsUpdate = true;
    this.eyeMesh.instanceMatrix.needsUpdate = true;
  }

  private syncAmbientVisuals(time: number): void {
    for (const creature of this.ambient) {
      const angle = creature.phase + time * creature.speed;
      TMP_OBJECT.position.set(
        Math.cos(angle) * creature.radius,
        creature.baseY + Math.sin(time * creature.bobSpeed + creature.phase) * creature.bobAmount,
        Math.sin(angle) * creature.radius,
      );
      TMP_OBJECT.rotation.set(
        time * creature.spin * 0.3,
        angle + time * creature.spin,
        time * creature.spin * 0.2,
      );
      TMP_OBJECT.scale.setScalar(creature.scale);
      TMP_OBJECT.updateMatrix();
      this.ambientMeshes[creature.family]!.setMatrixAt(creature.slot, TMP_OBJECT.matrix);
    }
    for (const mesh of this.ambientMeshes) mesh.instanceMatrix.needsUpdate = true;
  }

  private syncCanopyArtifacts(time: number, weather: number, shake: number): void {
    for (let i = 0; i < this.pulseArtifacts.length; i++) {
      const pulse = this.pulseArtifacts[i]!;
      const glow = 0.74 + Math.sin(time * 0.8 + pulse.phase) * 0.2 + weather * 0.24 + shake * 0.3;
      const energy = glow * (0.72 + pulse.base * 0.12);
      TMP_OBJECT.position.copy(pulse.position);
      TMP_OBJECT.rotation.set(time * 0.11 + pulse.phase, time * 0.17, -pulse.phase);
      TMP_OBJECT.scale.setScalar(pulse.scale * (0.78 + energy * 0.28));
      TMP_OBJECT.updateMatrix();
      this.lightningMesh.setMatrixAt(i, TMP_OBJECT.matrix);
      this.lightningMesh.setColorAt(
        i,
        TMP_COLOR.set(pulse.color).lerp(COLOR_WHITE, clamp01((energy - 0.54) * 0.58)),
      );
    }
    this.hexRing.rotation.z = time * 0.035;
    this.hexRing.material.opacity = 0.1 + weather * 0.08 + shake * 0.08;
    for (let i = 0; i < this.veilMesh.count; i++) {
      TMP_OBJECT.position.set(
        Math.sin(time * 0.08 + i) * 2.5,
        this.config.height * (0.62 + i * 0.085),
        Math.cos(time * 0.07 + i) * 2.5,
      );
      TMP_OBJECT.rotation.set(-Math.PI / 2, i * 0.37 + time * (i % 2 === 0 ? 0.008 : -0.008), 0);
      TMP_OBJECT.scale.setScalar(0.85 + i * 0.09 + Math.sin(time * 0.12 + i) * 0.02);
      TMP_OBJECT.updateMatrix();
      this.veilMesh.setMatrixAt(i, TMP_OBJECT.matrix);
    }
    this.veilMesh.instanceMatrix.needsUpdate = true;

    const lightningOffset = this.pulseArtifacts.length;
    for (let i = 0; i < this.lightningPhase.length; i++) {
      const phase = this.lightningPhase[i] ?? 0;
      const interval = this.lightningInterval[i] ?? 6;
      const cycle = (((time + phase) % interval) + interval) % interval;
      const flash =
        cycle < 0.15 ? 1 - cycle / 0.15 : 0.03 + Math.max(0, Math.sin(time * 1.9 + phase)) * 0.05;
      const scale = 0.08 + flash * (1.4 + weather * 1.2 + shake);
      TMP_OBJECT.position.set(
        (this.lightningBase[i * 3] ?? 0) + Math.sin(time * 2 + phase) * 1.5,
        (this.lightningBase[i * 3 + 1] ?? 0) + Math.cos(time * 2.4 + phase) * 2,
        (this.lightningBase[i * 3 + 2] ?? 0) + Math.cos(time * 1.7 + phase) * 1.5,
      );
      TMP_OBJECT.rotation.set(phase, time * 0.7 + phase, -phase);
      TMP_OBJECT.scale.set(scale * 0.45, scale * 2.8, scale * 0.45);
      TMP_OBJECT.updateMatrix();
      const slot = lightningOffset + i;
      this.lightningMesh.setMatrixAt(slot, TMP_OBJECT.matrix);
      this.lightningMesh.setColorAt(
        slot,
        TMP_COLOR.set(0x648cb4).lerp(COLOR_LIGHTNING_WHITE, flash),
      );
    }
    this.lightningMesh.instanceMatrix.needsUpdate = true;
    if (this.lightningMesh.instanceColor) this.lightningMesh.instanceColor.needsUpdate = true;
  }

  /** Keep the whole habitat seated on the living, vertically deforming host terrain. */
  setRootHeight(y: number): void {
    if (this.disposed || !Number.isFinite(y)) return;
    this.root.position.y = y;
    this.focusPoint.y = y + this.config.height * 0.57;
  }

  /** Observe an instanced being, or shake the coarse trunk/crown proxy. */
  interact(raycaster: THREE.Raycaster): CrystalInteraction | null {
    if (this.disposed) return null;
    const hits = raycaster.intersectObjects(this.creatureMeshes, false);
    const first = hits[0];
    if (first?.instanceId !== undefined) {
      const speciesIndex = Number(first.object.userData['crystalSpecies']);
      const creature =
        this.creatures[speciesIndex * this.config.creaturesPerSpecies + first.instanceId];
      const species = CRYSTAL_SPECIES[speciesIndex];
      if (creature && species) {
        creature.startled = Math.max(creature.startled, 1.5);
        if (hasQuantum(creature.quantumMask, 'waveCollapse')) creature.collapsed = 4;
        if (creature.entangledWith >= 0) {
          const partner = this.creatures[creature.entangledWith];
          if (partner) partner.startled = Math.max(partner.startled, 1.5);
        }
        this.observations++;
        const quantum = CRYSTAL_QUANTUM_ATTRIBUTES.filter((trait) =>
          hasQuantum(creature.quantumMask, trait),
        );
        return {
          kind: 'creature',
          audio: 'observe',
          species: species.name,
          energy: Math.round(creature.energy),
          disposition: 'friendly',
          quantum,
          message: `${species.name} observed · energy ${Math.round(creature.energy)} · friendly · ${quantum.join(' / ')}`,
        };
      }
    }

    this.inverseRoot.copy(this.root.matrixWorld).invert();
    this.localRay.copy(raycaster.ray).applyMatrix4(this.inverseRoot);
    const trunkDistance = this.localRay.distanceSqToSegment(this.trunkStart, this.trunkEnd);
    if (
      trunkDistance <= (this.config.height * 0.07) ** 2 ||
      this.localRay.intersectsSphere(this.crownSphere)
    ) {
      this.shake();
      return {
        kind: 'tree',
        audio: 'shake',
        message: 'CRYSTAL LIFE TREE SHAKEN · fauna startled · fruit lattice resonating',
      };
    }
    return null;
  }

  /** User-driven disturbance remains available while suspended; it does not advance autonomous RNG. */
  shake(): void {
    if (this.disposed) return;
    this.shakeTime = Math.max(this.shakeTime, 0.65);
    for (const creature of this.creatures) {
      creature.startled = Math.max(creature.startled, 0.9 + (creature.index % 9) * 0.08);
    }
  }

  stats(): CrystalEcosystemStats {
    return {
      mainBranches: this.mainBranches,
      subBranches: this.subBranches,
      leaves: this.config.leaves,
      fruits: this.config.fruits,
      flowers: this.config.flowers,
      availableFruit: this.availableFruit,
      availableLeaves: this.availableLeaves,
      quantumCreatures: this.creatures.length,
      ambientCreatures: this.ambient.length,
      motes: this.config.motes,
      relics: this.config.relics,
      consumedFruit: this.consumedFruit,
      consumedLeaves: this.consumedLeaves,
      contests: 0,
      observations: this.observations,
      teleports: this.teleports,
      neuralControllers: this.treeBrains.length,
      neuralDecisions: this.neuralDecisions,
      neuralFallbacks: this.neuralFallbacks,
      neuralModelReady: this.unreadyTreeBrains === 0,
      neuralLastActivity: this.neuralLastActivity,
      drawCalls: this.drawCalls,
      triangles: Math.round(this.triangles),
    };
  }

  /** Stable logical checksum for deterministic tests/audits; presentation-only time is excluded. */
  stateChecksum(): number {
    let hashValue = 2166136261 >>> 0;
    const mix = (value: number): void => {
      hashValue ^= value | 0;
      hashValue = Math.imul(hashValue, 16777619) >>> 0;
    };
    mix(Math.round(this.simTime * 1000));
    const food = this.edibleResources.stats();
    mix(food.available);
    mix(food.reserved);
    mix(food.consuming);
    mix(food.respawning);
    mix(this.consumedFruit);
    mix(this.consumedLeaves);
    mix(this.teleports);
    mix(this.neuralDecisions);
    mix(this.neuralFallbacks);
    mix(Math.round(this.visitorPresence * 1000));
    mix(Math.round(this.visitorSocialActivity * 1000));
    for (const creature of this.creatures) {
      mix(Math.round(creature.x * 100));
      mix(Math.round(creature.y * 100));
      mix(Math.round(creature.z * 100));
      mix(Math.round(creature.energy * 10));
      mix(creature.quantumMask);
      mix(creature.targetFoodId);
      mix(creature.targetFoodGeneration);
      mix(Math.round(creature.neuralSteerX * 1000));
      mix(Math.round(creature.neuralSteerZ * 1000));
      mix(Math.round(creature.neuralSpeed * 1000));
    }
    return hashValue >>> 0;
  }

  dispose(): void {
    if (this.disposed) return;
    // Retire every lease/deadline even if an external observer keeps the public registry reference.
    this.resetFood(this.simTime);
    this.disposed = true;
    this.scene.remove(this.root);
    // InstancedMesh owns its instanceMatrix/instanceColor GL buffers (mesh attributes, not geometry
    // attributes), so geometry.dispose() alone leaks them — release every instanced draw explicitly.
    this.root.traverse((object) => {
      if (object instanceof THREE.InstancedMesh) object.dispose();
    });
    for (const geometry of this.ownedGeometries) geometry.dispose();
    for (const material of this.ownedMaterials) material.dispose();
    this.ownedGeometries.length = 0;
    this.ownedMaterials.length = 0;
    this.root.clear();
  }
}

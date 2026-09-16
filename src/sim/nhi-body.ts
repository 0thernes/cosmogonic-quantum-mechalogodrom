/**
 * Alien NHI bodies (CONTRACTS V10 viz) — a dedicated, menacing, morphing form for each launched NHI
 * (reference: the biomechanical red-eyed uncanny alien), rendered OUTSIDE the instanced organism
 * pool so it can carry unique geometry + a wet biomechanical material the organism pools can't.
 * Shared ring/spike appendages have their own exact instanced pools: body-local matrices, per-being
 * diffuse/emissive colour, component counts, and the parent body's live morph transform are preserved.
 *
 * Additive + deterministic-by-index (no rng, no sim coupling): each body's world position is copied
 * from its NHI entity every frame; the morph (non-uniform scale wobble), spin, and glow pulse are
 * pure trig of the sim clock + an index-derived phase. The world owns it: {@link spawn} on launch,
 * {@link update} each frame (which also disposes a body once its NHI dies), {@link clear} on reset.
 * Standard materials only (no hand-written GLSL), so it compiles clean and degrades to "invisible"
 * rather than "broken" if anything is off.
 */
import * as THREE from 'three';
import {
  PLATFORM_CEIL,
  PLATFORM_FLOOR,
  PLATFORM_HEIGHT,
  PLATFORM_MID_Y,
  SOCIAL_NHI_BODY_R,
} from './constants';
import { NHI_SYSTEM_MIND_CAP } from './nhi-system';

interface BatchedPartPool {
  readonly mesh: THREE.InstancedMesh;
  readonly emissive: THREE.InstancedBufferAttribute;
  readonly partsPerBlock: number;
  readonly usedBlocks: Uint8Array;
  readonly freeBlocks: number[];
  highWaterBlocks: number;
  liveInstances: number;
  matrixDirty: boolean;
  emissiveDirty: boolean;
  colorDirty: boolean;
}

interface Body {
  group: THREE.Group;
  coreMat: THREE.MeshStandardMaterial;
  ringMat: THREE.MeshStandardMaterial;
  /** Shared material for both ocular points; owned by the body so it is disposed on death. */
  eyeMat: THREE.MeshStandardMaterial;
  /** Owned tube geometries for organic tendrils (disposed with the body). */
  readonly tendrilGeos: THREE.BufferGeometry[];
  /** Golden-angle phase from the spawn index — even, rng-free variation between bodies. */
  phase: number;
  /** Per-being CORE shader uniforms for the V-NHI-EXPANDED suite (driven from real state each frame). */
  u: NhiUniforms;
  /** Reused nearest-kin proximity scalar for this frame. */
  social: number;
  /** Stable block in the two-ring instanced pool for this being's lifetime. */
  ringBlock: number;
  /** Stable block in the selected spike-geometry pool for this being's lifetime. */
  spikeBlock: number;
  /** Which of the three exact spike geometries this being owns. */
  spikePoolIndex: number;
  /** Exact body-local matrices formerly carried by individual ring Mesh children. */
  readonly ringLocals: readonly THREE.Matrix4[];
  /** Exact body-local matrices formerly carried by individual spike Mesh children. */
  readonly spikeLocals: readonly THREE.Matrix4[];
}

/** Silhouette radius of an NHI body — large enough to read as a colossus, not an organism. */
const R = 3.4;
/** Maximum physical rings and spikes declared by the deterministic morphology recipe. */
const RINGS_PER_BODY = 2;
const SPIKES_PER_BODY = 12;
/** Zero-scale tombstone for a released instanced slot. */
const ZERO_PART_MATRIX = new THREE.Matrix4().makeScale(0, 0, 0);

/**
 * Preserve MeshStandardMaterial's exact ring/spike BRDF while replacing its uniform emissive colour
 * with the per-instance value the old per-being material supplied. Diffuse colour remains Three's
 * native `instanceColor × material.color` path. No surface term, light, tone mapping, or colour-space
 * stage is changed.
 */
function patchNhiBatchedPartMaterial(mat: THREE.MeshStandardMaterial): void {
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute vec3 instNhiEmissive;\nvarying vec3 vNhiEmissive;',
      )
      .replace(
        '#include <color_vertex>',
        '#include <color_vertex>\nvNhiEmissive = instNhiEmissive;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vNhiEmissive;')
      .replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\ntotalEmissiveRadiance = vNhiEmissive;',
      );
  };
  mat.customProgramCacheKey = () => 'nhiBatchedPartEmissiveV1';
}

/** Capture Three's exact Object3D compose order for an immutable body-local appendage transform. */
function capturePartMatrix(part: THREE.Object3D): THREE.Matrix4 {
  part.updateMatrix();
  return part.matrix.clone();
}

/**
 * USER #7: NHI colour signatures — a curated DARK-ALIEN / OLD-MONEY / "Annihilation-shimmer" palette
 * that RETIRES the old full-rainbow neon (every hue at S≈0.96–0.98 = the "cute/girlie neon" read the
 * owner called out). Each entry is a deep, muted-but-RICH species tone — oxblood, aubergine, antique
 * brass, petrol teal, bruised indigo, ember rust, sickly Annihilation-olive, cold slate — so a being
 * reads as ominous, sophisticated, and OTHER: near-black bodies with a bright RIM glow (kept), never
 * flat-TRON, never bland. Structure / metalness / geometry are untouched — ONLY the colours, exactly as
 * the directive says. `[hue, sat]` per role; saturation is pulled from ~0.96 down to 0.30–0.58 and the
 * lightness is set per role below (rich glow, not blown-out candy). The EYE hue is deliberately an
 * eerie complement (an amber body wears a cold-cyan eye; an olive body an unsettling magenta eye).
 */
const NHI_SPECIES: ReadonlyArray<{
  bodyH: number;
  bodyS: number;
  ringH: number;
  ringS: number;
  eyeH: number;
  eyeS: number;
  eyeL: number;
}> = [
  { bodyH: 0.99, bodyS: 0.56, ringH: 0.02, ringS: 0.5, eyeH: 0.06, eyeS: 0.48, eyeL: 0.56 }, // oxblood · amber eye
  { bodyH: 0.8, bodyS: 0.46, ringH: 0.86, ringS: 0.42, eyeH: 0.52, eyeS: 0.32, eyeL: 0.6 }, // aubergine · cold-cyan eye
  { bodyH: 0.11, bodyS: 0.52, ringH: 0.09, ringS: 0.46, eyeH: 0.55, eyeS: 0.3, eyeL: 0.56 }, // antique brass · steel eye
  { bodyH: 0.52, bodyS: 0.44, ringH: 0.55, ringS: 0.4, eyeH: 0.03, eyeS: 0.5, eyeL: 0.54 }, // petrol teal · rust eye
  { bodyH: 0.66, bodyS: 0.46, ringH: 0.7, ringS: 0.42, eyeH: 0.14, eyeS: 0.42, eyeL: 0.56 }, // bruised indigo · ochre eye
  { bodyH: 0.045, bodyS: 0.56, ringH: 0.02, ringS: 0.5, eyeH: 0.55, eyeS: 0.32, eyeL: 0.56 }, // ember rust · cold eye
  { bodyH: 0.19, bodyS: 0.4, ringH: 0.22, ringS: 0.36, eyeH: 0.85, eyeS: 0.4, eyeL: 0.56 }, // Annihilation-olive · eerie magenta eye
  { bodyH: 0.55, bodyS: 0.32, ringH: 0.58, ringS: 0.32, eyeH: 0.09, eyeS: 0.44, eyeL: 0.55 }, // cold slate · amber eye
];

/**
 * Resolve a being's four material colours from its spawn index — a deterministic pick from
 * {@link NHI_SPECIES} plus a small, index-seeded hue/sat jitter so two beings of the same "species"
 * still differ subtly (no rng — a `sin` hash of the index). Roles: core emissive glow (the bright
 * dark-body rim), the dark ring/spike/tendril armour base, its brighter emissive, and the ocular glow.
 */
function nhiSpecies(idx: number): {
  coreEm: THREE.Color;
  ringCol: THREE.Color;
  ringEm: THREE.Color;
  eyeEm: THREE.Color;
} {
  const sp = NHI_SPECIES[idx % NHI_SPECIES.length]!;
  const j = Math.sin(idx * 12.9898) * 0.5; // deterministic jitter in [-0.5, 0.5]
  const H = (h: number): number => (((h + j * 0.03) % 1) + 1) % 1; // ±0.015 hue drift
  const S = (s: number): number => Math.max(0, Math.min(1, s * (1 + j * 0.12))); // ±6% sat
  return {
    coreEm: new THREE.Color().setHSL(H(sp.bodyH), S(sp.bodyS), 0.46), // bright rim glow, muted hue
    ringCol: new THREE.Color().setHSL(H(sp.ringH), S(sp.ringS * 0.8), 0.16), // near-black armour base
    ringEm: new THREE.Color().setHSL(H(sp.ringH), S(sp.ringS), 0.38), // armour glow
    eyeEm: new THREE.Color().setHSL(H(sp.eyeH), S(sp.eyeS), sp.eyeL), // eerie ocular glow
  };
}

/**
 * Map a launched being's REAL height (world Y) to a `[0,1]` ascension signal — drives the hyperspace
 * dimensionality lattice (a being flying high shimmers with tesseract light). Finite-guarded, clamped.
 * Pure, no rng. O(1). See tests/nhi-body-ascension.test.ts.
 */
export function nhiAscension(y: number): number {
  const a = ((Number.isFinite(y) ? y : PLATFORM_FLOOR) - PLATFORM_FLOOR) / PLATFORM_HEIGHT;
  return a < 0 ? 0 : a > 1 ? 1 : a;
}

/** Exported reference levels make the visual contract explicit and easy to seal headlessly. */
export const NHI_ASCENSION_LEVELS = {
  floor: PLATFORM_FLOOR,
  middle: PLATFORM_MID_Y,
  ceiling: PLATFORM_CEIL,
} as const;

/** Per-being CORE shader uniforms driven from real state (uSocial = proximity, uAsc = height). */
interface NhiUniforms {
  uTime: THREE.IUniform<number>;
  uSocial: THREE.IUniform<number>;
  uAsc: THREE.IUniform<number>;
}

/** GLSL header injected after the NHI core body's fragment `<common>` — varyings, uniforms, fBm. */
const NHI_FRAG_HEADER = /* glsl */ `
varying vec3 vNObjP;
uniform float uTime; uniform float uSocial; uniform float uAsc;
float nHash(vec3 p){ return fract(sin(dot(p, vec3(27.17, 61.31, 11.71))) * 43758.5453); }
float nNoise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(nHash(i), nHash(i + vec3(1,0,0)), f.x), mix(nHash(i + vec3(0,1,0)), nHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(nHash(i + vec3(0,0,1)), nHash(i + vec3(1,0,1)), f.x), mix(nHash(i + vec3(0,1,1)), nHash(i + vec3(1,1,1)), f.x), f.y), f.z); }
float nFbm(vec3 p){ float a = 0.5, s = 0.0; for (int k = 0; k < 4; k++){ s += a * nNoise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
`;

/**
 * Patch a launched being's CORE body with the V-NHI-EXPANDED named-effect suite: 6 GPU effects, each a
 * FALSIFIABLE readout of the being's REAL state — social proximity (`uSocial`, flares when two beings
 * meet) drives vision-bloom / neuralmimetic-web / plasma / singulrosity / bit-glitch, and ascension
 * height (`uAsc`) drives the hyperspace-dimensionality tesseract lattice. GPU-only, no rng: a solitary
 * grounded being is dark, a high-flying being amid a congregation blazes with alien light.
 */
function patchNhiCore(mat: THREE.MeshStandardMaterial, u: NhiUniforms): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms['uTime'] = u.uTime;
    shader.uniforms['uSocial'] = u.uSocial;
    shader.uniforms['uAsc'] = u.uAsc;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vNObjP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvNObjP = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>${NHI_FRAG_HEADER}`)
      .replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `#include <emissivemap_fragment>
        // V123 (USER #7): the social/ascension FLARES recoloured to the ALIEN OLD-MONEY / ANNIHILATION
        // oil-slick spectrum (complements the nhiSpecies material palette) — tarnished teal / oxblood /
        // bruise violet / patina gold, and the bright MATRIX-GREEN bit-glitch retired for a sickly
        // gunmetal moss ('like Matrix but not Green'). Ominous, not neon-toy.
        float nFres = pow(1.0 - max(dot(normalize(vViewPosition), normalize(normal)), 0.0), 3.0);
        float nF = nFbm(vNObjP * 0.4);
        // VISION EXPANDED (social) — ocular bloom flares, deep oxblood, when the being meets another.
        totalEmissiveRadiance += vec3(0.55, 0.12, 0.14) * pow(nFres, 1.5) * uSocial * 1.5;
        // NEURALMIMETIC WEB (social) — a mimetic neural web crawls the skin in tarnished teal.
        float nWeb = step(0.7, nFbm(vNObjP * 6.0 + uTime * 0.05));
        totalEmissiveRadiance += vec3(0.16, 0.42, 0.40) * nWeb * uSocial * 1.15;
        // PLASMA EXPANDED (social) — plasma veins race the being in bruise violet.
        float nPlasma = pow(0.5 + 0.5 * sin(vNObjP.y * 10.0 + uTime * 6.0 + nF * 6.2831), 8.0);
        totalEmissiveRadiance += vec3(0.40, 0.18, 0.46) * nPlasma * uSocial * 1.4;
        // HYPERSPACE DIMENSIONALITY (ascension) — a tesseract lattice shimmers cold gunmetal at altitude.
        float nLat = pow(0.5 + 0.5 * sin(vNObjP.x * 14.0) * sin(vNObjP.y * 14.0) * sin(vNObjP.z * 14.0 + uTime * 2.0), 4.0);
        totalEmissiveRadiance += vec3(0.22, 0.44, 0.52) * nLat * uAsc * 0.85;
        // SINGULROSITY BLOOM (social) — a smouldering patina-gold halo on a congregating being.
        totalEmissiveRadiance += vec3(0.5, 0.36, 0.14) * pow(1.0 - nFres, 3.0) * uSocial * 0.95;
        // BIT-GLITCH (social) — glitch blocks in a sickly desaturated moss, NOT matrix green.
        float nGlitch = floor((nF + sin(uTime * 9.0) * 0.2) * 5.0) / 5.0;
        totalEmissiveRadiance += vec3(0.20, 0.30, 0.20) * nGlitch * uSocial * 0.35;`,
      );
  };
  mat.customProgramCacheKey = () => 'nhiExpandedV2'; // V123: bumped for the oil-slick flare recolor
}

/** A morphing, red-eyed, biomechanical body per launched NHI. */
export class NhiBodySystem {
  private readonly root = new THREE.Group();
  private readonly bodies = new Map<number, Body>();
  /** Per-NHI CORE morphology set — the index picks a genuinely different alien "species" body. */
  private readonly coreGeos: THREE.BufferGeometry[];
  private readonly ringGeo: THREE.TorusGeometry;
  private readonly eyeGeo: THREE.SphereGeometry;
  /** Per-NHI SPIKE/blade/barb morphology set — the index picks a different protrusion form. */
  private readonly spikeGeos: THREE.BufferGeometry[];
  /** Exact shared-geometry appendage pools: one ring draw + one draw per spike morphology. */
  private readonly ringPool: BatchedPartPool;
  private readonly spikePools: readonly BatchedPartPool[];
  /** Reused world-matrix product for body matrix × immutable part-local matrix. */
  private readonly partWorld = new THREE.Matrix4();
  private spawnIndex = 0;
  /** Reused snapshot of the live bodies for the staggered pairwise social scan (no per-frame alloc). */
  private readonly pairScratch: Body[] = [];
  /** Rotating anchor cursor: which slice of pair-space the social scan covers this frame. */
  private pairCursor = 0;

  constructor(scene: THREE.Scene) {
    scene.add(this.root);
    // USER #7 morphicbiofuckery: each NHI is a genuinely DIFFERENT alien species — the CORE morphology,
    // the spike/blade form, and the appendage COUNTS all vary by spawn index (deterministic, rng-free),
    // instead of every body being the same sphere+rings+spikes just phase-shifted. The geometries are a
    // small SHARED set (memory-flat); only the assembly + the per-body tendril tubes are unique.
    this.coreGeos = [
      new THREE.SphereGeometry(R, 6, 5), // low-poly orb
      new THREE.IcosahedronGeometry(R, 1), // faceted crystal skull
      new THREE.OctahedronGeometry(R * 1.06, 0), // sharp diamond
      new THREE.DodecahedronGeometry(R * 0.98, 0), // brutal dodeca
      new THREE.TorusKnotGeometry(R * 0.6, R * 0.27, 72, 9, 2, 3), // knotted wormform
    ];
    this.ringGeo = new THREE.TorusGeometry(R * 1.35, R * 0.12, 8, 28);
    this.eyeGeo = new THREE.SphereGeometry(R * 0.16, 12, 12);
    this.spikeGeos = [
      new THREE.ConeGeometry(R * 0.13, R * 1.15, 7, 1), // needle
      new THREE.ConeGeometry(R * 0.22, R * 0.72, 4, 1), // blade
      new THREE.CylinderGeometry(R * 0.04, R * 0.15, R * 1.3, 6), // barb
    ];
    this.ringPool = this.createPartPool(this.ringGeo, RINGS_PER_BODY, 'NHI-RINGS');
    this.spikePools = this.spikeGeos.map((geometry, index) =>
      this.createPartPool(geometry, SPIKES_PER_BODY, `NHI-SPIKES-${index}`),
    );
  }

  /**
   * Create one fixed-capacity instanced pool. Capacity is a hard consequence of the NHI mind cap;
   * blocks are claimed/released only at lifecycle boundaries and never move while their being lives.
   */
  private createPartPool(
    geometry: THREE.BufferGeometry,
    partsPerBlock: number,
    name: string,
  ): BatchedPartPool {
    const capacity = NHI_SYSTEM_MIND_CAP * partsPerBlock;
    const emissive = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    emissive.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('instNhiEmissive', emissive);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x000000,
      emissiveIntensity: 1,
      metalness: 0.95,
      roughness: 0.2,
    });
    patchNhiBatchedPartMaterial(material);
    const mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.name = name;
    mesh.count = 0;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Instances roam across the whole habitat. A stale aggregate bounds calculation must never make
    // a live appendage disappear; exact conservative per-instance culling belongs in a later renderer pass.
    mesh.frustumCulled = false;
    this.root.add(mesh);
    return {
      mesh,
      emissive,
      partsPerBlock,
      usedBlocks: new Uint8Array(NHI_SYSTEM_MIND_CAP),
      freeBlocks: [],
      highWaterBlocks: 0,
      liveInstances: 0,
      matrixDirty: false,
      emissiveDirty: false,
      colorDirty: false,
    };
  }

  /** Claim one stable per-being block; throws only if the composition-root cap was violated. */
  private claimPartBlock(pool: BatchedPartPool, liveParts: number): number {
    let block = pool.freeBlocks.pop();
    if (block === undefined) {
      block = pool.highWaterBlocks;
      if (block >= pool.usedBlocks.length) {
        throw new RangeError(`NHI batched-part pool exceeded ${NHI_SYSTEM_MIND_CAP} live blocks`);
      }
    }
    pool.usedBlocks[block] = 1;
    if (block >= pool.highWaterBlocks) pool.highWaterBlocks = block + 1;
    pool.liveInstances += liveParts;
    pool.mesh.count = pool.highWaterBlocks * pool.partsPerBlock;
    return block;
  }

  /** Release one block, zeroing every physical slot before it can be reused or drawn as a hole. */
  private releasePartBlock(pool: BatchedPartPool, block: number, liveParts: number): void {
    if (block < 0 || block >= pool.usedBlocks.length || pool.usedBlocks[block] === 0) return;
    const first = block * pool.partsPerBlock;
    for (let i = 0; i < pool.partsPerBlock; i++) {
      const slot = first + i;
      pool.mesh.setMatrixAt(slot, ZERO_PART_MATRIX);
      pool.emissive.setXYZ(slot, 0, 0, 0);
    }
    pool.usedBlocks[block] = 0;
    pool.freeBlocks.push(block);
    pool.liveInstances = Math.max(0, pool.liveInstances - liveParts);
    while (pool.highWaterBlocks > 0 && pool.usedBlocks[pool.highWaterBlocks - 1] === 0) {
      pool.highWaterBlocks--;
    }
    pool.mesh.count = pool.liveInstances > 0 ? pool.highWaterBlocks * pool.partsPerBlock : 0;
    pool.matrixDirty = true;
    pool.emissiveDirty = true;
  }

  /** Write all exact ring/spike transforms and the per-being material lanes into stable pool slots. */
  private syncBatchedParts(body: Body, writeColor: boolean): void {
    this.writePoolParts(this.ringPool, body.ringBlock, body.ringLocals, body, writeColor);
    const spikePool = this.spikePools[body.spikePoolIndex];
    if (spikePool) {
      this.writePoolParts(spikePool, body.spikeBlock, body.spikeLocals, body, writeColor);
    }
  }

  private writePoolParts(
    pool: BatchedPartPool,
    block: number,
    locals: readonly THREE.Matrix4[],
    body: Body,
    writeColor: boolean,
  ): void {
    const groupMatrix = body.group.matrix;
    const color = body.ringMat.color;
    const emissive = body.ringMat.emissive;
    const emissiveIntensity = body.ringMat.emissiveIntensity;
    const first = block * pool.partsPerBlock;
    for (let i = 0; i < locals.length; i++) {
      const local = locals[i];
      if (!local) continue;
      const slot = first + i;
      this.partWorld.multiplyMatrices(groupMatrix, local);
      pool.mesh.setMatrixAt(slot, this.partWorld);
      pool.emissive.setXYZ(
        slot,
        emissive.r * emissiveIntensity,
        emissive.g * emissiveIntensity,
        emissive.b * emissiveIntensity,
      );
      if (writeColor) pool.mesh.setColorAt(slot, color);
    }
    pool.matrixDirty = true;
    pool.emissiveDirty = true;
    if (writeColor) pool.colorDirty = true;
  }

  /** Publish only populated prefixes; called after a spawn/removal or once after the frame batch. */
  private publishPartPools(): void {
    this.publishPartPool(this.ringPool);
    for (const pool of this.spikePools) this.publishPartPool(pool);
  }

  private publishPartPool(pool: BatchedPartPool): void {
    const count = pool.mesh.count;
    if (pool.matrixDirty) {
      pool.mesh.instanceMatrix.clearUpdateRanges();
      if (count > 0) pool.mesh.instanceMatrix.addUpdateRange(0, count * 16);
      pool.mesh.instanceMatrix.needsUpdate = true;
      pool.matrixDirty = false;
    }
    if (pool.emissiveDirty) {
      pool.emissive.clearUpdateRanges();
      if (count > 0) pool.emissive.addUpdateRange(0, count * 3);
      pool.emissive.needsUpdate = true;
      pool.emissiveDirty = false;
    }
    const instanceColor = pool.mesh.instanceColor;
    if (pool.colorDirty && instanceColor) {
      instanceColor.clearUpdateRanges();
      if (count > 0) instanceColor.addUpdateRange(0, count * 3);
      instanceColor.needsUpdate = true;
      pool.colorDirty = false;
    }
  }

  /** Birth an alien body for NHI `id` at (x,y,z). Idempotent per id. */
  spawn(id: number, x: number, y: number, z: number): void {
    if (this.bodies.has(id)) return;
    const si = this.spawnIndex;
    const group = new THREE.Group();
    const tendrilGeos: THREE.BufferGeometry[] = [];
    let coreMat: THREE.MeshStandardMaterial | undefined;
    let ringMat: THREE.MeshStandardMaterial | undefined;
    let eyeMat: THREE.MeshStandardMaterial | undefined;
    let ringBlock = -1;
    let spikeBlock = -1;
    const spikePoolIndex = si % this.spikeGeos.length;
    const ringLocals: THREE.Matrix4[] = [];
    const spikeLocals: THREE.Matrix4[] = [];

    try {
      group.position.set(x, y, z);

      // USER #7: this NHI's SPECIES — a distinct core body, spike form, and appendage counts per index.
      const coreGeo = this.coreGeos[si % this.coreGeos.length]!;
      const ringCount = 1 + (si % 2); // 1..2 orbital rings
      const spikeCount = 6 + (si % 4) * 2; // 6/8/10/12 protrusions
      const tendrilCount = 3 + (si % 4); // 3..6 tendrils
      const eyeCount = 5 + (si % 4); // 5..8 ocular crown

      // V109: wider alien skin palette — each NHI gets a unique biomechanical "species" hue/texture.
      // USER #7: near-black base + bright RIM glow, but the hue is now a curated dark-alien / old-money /
      // Annihilation signature (nhiSpecies) instead of the old full-rainbow neon.
      const skin = nhiSpecies(si);
      coreMat = new THREE.MeshStandardMaterial({
        color: 0x050505, // near black
        emissive: skin.coreEm,
        emissiveIntensity: 1.4,
        metalness: 0.9,
        roughness: 0.15,
        flatShading: false, // smoother for bio look
      });
      // V-NHI-EXPANDED: patch the core with the named-effect suite, driven from real social + height.
      const u: NhiUniforms = {
        uTime: { value: 0 },
        uSocial: { value: 0 },
        uAsc: { value: 0 },
      };
      patchNhiCore(coreMat, u);
      group.add(new THREE.Mesh(coreGeo, coreMat));

      ringMat = new THREE.MeshStandardMaterial({
        color: skin.ringCol,
        emissive: skin.ringEm,
        emissiveIntensity: 1.05,
        metalness: 0.95,
        roughness: 0.2,
      });
      // The old child Mesh local matrices are captured bit-for-bit, then multiplied by the same live
      // parent matrix into the ring/spike pools every frame. Counts and every transform remain exact.
      const part = new THREE.Object3D();
      part.rotation.x = Math.PI / 2.4;
      ringLocals.push(capturePartMatrix(part));
      if (ringCount > 1) {
        part.rotation.set(Math.PI / 2.05, 0.4 + si * 0.31, 0.75);
        part.scale.set(0.72 + 0.14 * Math.sin(si), 1.18, 0.72 + 0.14 * Math.cos(si));
        ringLocals.push(capturePartMatrix(part));
      }
      for (let i = 0; i < spikeCount; i++) {
        const a = i * 2.399963229728653 + si * 0.41;
        part.position.set(
          Math.cos(a) * R * 0.78,
          Math.sin(a * 1.7) * R * 0.34,
          Math.sin(a) * R * 0.78,
        );
        part.rotation.set(Math.sin(a) * 1.2, a, Math.cos(a) * 1.2);
        part.scale.setScalar(0.55 + 0.35 * Math.sin(i * 1.9 + si));
        spikeLocals.push(capturePartMatrix(part));
      }

      for (let ti = 0; ti < tendrilCount; ti++) {
        const a = ti * 1.256637 + si * 0.37;
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(
            Math.cos(a) * R * 0.42,
            Math.sin(a * 2.1) * R * 0.28,
            Math.sin(a) * R * 0.42,
          ),
          new THREE.Vector3(
            Math.cos(a + 1.4) * R * 0.82,
            Math.sin(a * 3.2) * R * 0.38,
            Math.sin(a + 1.4) * R * 0.82,
          ),
          new THREE.Vector3(
            Math.cos(a + 2.6) * R * 1.05,
            -R * 0.18 + Math.sin(a) * R * 0.22,
            Math.sin(a + 2.6) * R * 1.05,
          ),
        ]);
        const geo = new THREE.TubeGeometry(curve, 10, R * (0.045 + (ti % 3) * 0.012), 6, false);
        tendrilGeos.push(geo);
        const tendril = new THREE.Mesh(geo, ringMat);
        tendril.rotation.y = a;
        tendril.rotation.x = Math.sin(a * 1.7) * 0.35;
        group.add(tendril);
      }

      // Ocular crown on the "face" (front +z) — weird but readable at distance.
      eyeMat = new THREE.MeshStandardMaterial({
        color: 0x05070c,
        emissive: skin.eyeEm,
        emissiveIntensity: 2.4,
      });
      for (let i = 0; i < eyeCount; i++) {
        const a = -0.95 + i * (1.9 / Math.max(1, eyeCount - 1));
        const eye = new THREE.Mesh(this.eyeGeo, eyeMat);
        eye.position.set(Math.sin(a) * R * 0.42, Math.cos(a * 1.7) * R * 0.22, R * 0.86);
        const sc = 0.65 + 0.35 * Math.sin(i * 2.1 + si);
        eye.scale.setScalar(sc);
        group.add(eye);
      }

      // Commit only after the complete body has been attached. The morphology index advances only
      // after the map mutation succeeds, so a failed launch is observationally equivalent to no launch.
      this.root.add(group);
      ringBlock = this.claimPartBlock(this.ringPool, ringLocals.length);
      const spikePool = this.spikePools[spikePoolIndex];
      if (!spikePool) throw new RangeError(`missing NHI spike pool ${spikePoolIndex}`);
      spikeBlock = this.claimPartBlock(spikePool, spikeLocals.length);
      const body: Body = {
        group,
        coreMat,
        ringMat,
        eyeMat,
        tendrilGeos,
        phase: si * 2.399963229728653,
        u,
        social: 0,
        ringBlock,
        spikeBlock,
        spikePoolIndex,
        ringLocals,
        spikeLocals,
      };
      group.updateMatrix();
      this.syncBatchedParts(body, true);
      this.publishPartPools();
      this.bodies.set(id, body);
      this.spawnIndex = si + 1;
    } catch (error) {
      // Construction and attachment form one transaction. Never dispose the shared morphology
      // geometries here: only resources allocated specifically for this attempted body are owned.
      this.bodies.delete(id);
      this.spawnIndex = si;
      this.releasePartBlock(this.ringPool, ringBlock, ringLocals.length);
      const spikePool = this.spikePools[spikePoolIndex];
      if (spikePool) this.releasePartBlock(spikePool, spikeBlock, spikeLocals.length);
      this.publishPartPools();
      this.disposePartialBody(group, coreMat, ringMat, eyeMat, tendrilGeos);
      throw error;
    }
  }

  /**
   * Per frame: each body follows its NHI (position via `posOf`), spins, breathes (non-uniform scale
   * wobble = the morph), and pulses its glow. A body whose NHI has died (`posOf` → null) is disposed.
   * Allocation-free. Position callbacks are O(bodies); pairwise visual proximity is
   * stagger-budgeted (full sweep ≤64 bodies; rotating anchor rows above that) so the cost stays
   * bounded at the composition root's launched-population cap of 1000 (owner 2026-07-15).
   *
   * @param onSocial optional callback fired when this body is within SOCIAL_NHI_BODY_R of another NHI; the scalar
   *   `0..1` is the social proximity level so callers can layer sound (e.g. NhiBodySystem emits no
   *   audio itself; AudioEngine is wired from world.ts).
   */
  update(
    t: number,
    posOf: (id: number) => THREE.Vector3 | null,
    onSocial?: (id: number, level: number) => void,
  ): void {
    // Resolve each backing position exactly once and retire missing bodies before pair evaluation.
    // Social DECAYS instead of hard-resetting so the staggered scan below can top it up smoothly
    // (a body not re-scanned this frame keeps a fading glow instead of flickering to zero).
    this.pairScratch.length = 0;
    for (const [id, b] of this.bodies) {
      const p = posOf(id);
      if (!p) {
        this.bodies.delete(id);
        this.disposeBody(b);
        continue;
      }
      b.group.position.copy(p);
      b.social *= 0.85;
      if (b.social < 0.01) b.social = 0;
      this.pairScratch.push(b);
    }

    // Pairwise social proximity, STAGGER-BUDGETED (owner 2026-07-15: cap raised 32 → 1000, where a
    // full O(n²/2) sweep would be ~500k pair visits per frame). Small populations (≤64) still get
    // the exact full sweep every frame; larger ones rotate through anchor rows so every body is
    // re-anchored at ≥⅛ of frame rate — plenty for a glow scalar riding the decay above.
    // Deterministic: the cursor advances per call, no rng.
    const bodiesArr = this.pairScratch;
    const n = bodiesArr.length;
    const anchorsPerFrame = n <= 64 ? n : Math.ceil(n / 8);
    const start = n > 0 ? this.pairCursor % n : 0;
    this.pairCursor = n > 0 ? (this.pairCursor + anchorsPerFrame) % n : 0;
    for (let k = 0; k < anchorsPerFrame; k++) {
      const i = (start + k) % n;
      const b = bodiesArr[i]!;
      const p = b.group.position;
      for (let j = i + 1; j < n; j++) {
        const other = bodiesArr[j]!;
        const op = other.group.position;
        const dx = p.x - op.x;
        const dy = p.y - op.y;
        const dz = p.z - op.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < SOCIAL_NHI_BODY_R * SOCIAL_NHI_BODY_R) {
          const proximity = 1 - Math.sqrt(d2) / SOCIAL_NHI_BODY_R;
          if (proximity > b.social) b.social = proximity;
          if (proximity > other.social) other.social = proximity;
        }
      }
    }

    for (const [id, b] of this.bodies) {
      const social = b.social;
      if (social > 0.4 && onSocial) onSocial(id, social);
      const g = b.group;
      const p = g.position;
      // V-NHI-EXPANDED: feed the real signals to the core named-effect suite (social = proximity,
      // asc = height). A solitary grounded being is dark; a high-flying, congregating one blazes.
      b.u.uTime.value = t;
      b.u.uSocial.value = social;
      b.u.uAsc.value = nhiAscension(p.y);
      // V109: more dynamic, restless alien motion — faster spin + irregular multi-frequency wobble.
      g.rotation.y = t * (0.32 + 0.12 * Math.sin(b.phase)) + b.phase;
      g.rotation.x = Math.sin(t * 0.58 + b.phase) * 0.62 + Math.sin(t * 1.3 + b.phase * 2.1) * 0.18;
      g.rotation.z =
        Math.sin(t * 0.41 + b.phase * 1.7) * 0.35 + Math.sin(t * 0.93 + b.phase) * 0.14;
      // Morph: a writhing, non-uniform breathing scale — reads as a living, shifting body.
      g.scale.set(
        1.12 +
          social * 0.18 +
          Math.sin(t * 1.17 + b.phase) * 0.26 +
          Math.sin(t * 2.7 + b.phase) * 0.08,
        1.18 +
          social * 0.25 +
          Math.sin(t * 1.61 + b.phase * 1.3) * 0.32 +
          Math.sin(t * 3.1 + b.phase * 0.8) * 0.1,
        1.08 +
          social * 0.16 +
          Math.sin(t * 1.39 + b.phase * 0.7) * 0.24 +
          Math.sin(t * 2.4 + b.phase * 1.2) * 0.07,
      );
      b.coreMat.emissiveIntensity =
        1.55 +
        Math.sin(t * 1.23 + b.phase) * 0.55 +
        Math.sin(t * 0.37 + b.phase) * 0.25 +
        Math.sin(t * 4.1 + b.phase) * 0.15 +
        social * 1.25;
      b.ringMat.emissiveIntensity =
        1.05 +
        Math.sin(t * 2.17 + b.phase) * 0.45 +
        Math.sin(t * 0.53 + b.phase) * 0.25 +
        Math.sin(t * 3.7 + b.phase) * 0.2 +
        social * 1.65;
      b.eyeMat.emissiveIntensity =
        1.85 +
        Math.sin(t * 2.5 + b.phase) * 0.45 +
        Math.sin(t * 6.0 + b.phase * 3.0) * 0.25 +
        social * 0.85;
      // Pool matrices receive the exact same parent compose and the exact same animated ring-material
      // emissive scalar as the retired child Meshes. `group.matrix` is local-to-root; root is identity.
      g.updateMatrix();
      this.syncBatchedParts(b, false);
    }
    this.publishPartPools();
  }

  /** Number of live alien bodies (telemetry). */
  get count(): number {
    return this.bodies.size;
  }

  /** Exact number of physical ring + spike components represented by the four pooled draws. */
  get batchedPartCount(): number {
    let total = this.ringPool.liveInstances;
    for (const pool of this.spikePools) total += pool.liveInstances;
    return total;
  }

  /** Active GPU draws for those components (one ring pool plus the populated spike morphologies). */
  get batchedPartDrawCalls(): number {
    let total = this.ringPool.liveInstances > 0 ? 1 : 0;
    for (const pool of this.spikePools) if (pool.liveInstances > 0) total++;
    return total;
  }

  /** O(1) membership probe used by lifecycle receipts and rollback verification. */
  has(id: number): boolean {
    return this.bodies.has(id);
  }

  /** Dispose one departed NHI body immediately. Idempotent and safe for an unknown id. */
  remove(id: number): boolean {
    const body = this.bodies.get(id);
    if (!body) return false;
    this.bodies.delete(id);
    this.disposeBody(body);
    this.publishPartPools();
    return true;
  }

  /** Dispose every body (e.g. on world reset). */
  clear(): void {
    const bodies = [...this.bodies.values()];
    this.bodies.clear();
    for (const b of bodies) this.disposeBody(b);
    this.resetPartPool(this.ringPool);
    for (const pool of this.spikePools) this.resetPartPool(pool);
    this.publishPartPools();
  }

  /** Free ALL GPU resources (live body materials via clear(), then the shared geometries) on world
   * teardown / HMR reload. Idempotent — geometry.dispose() is safe to call twice. */
  dispose(): void {
    this.clear();
    this.disposePartPool(this.ringPool);
    for (const pool of this.spikePools) this.disposePartPool(pool);
    for (const g of this.coreGeos) g.dispose();
    this.ringGeo.dispose();
    this.eyeGeo.dispose();
    for (const g of this.spikeGeos) g.dispose();
    this.root.removeFromParent();
  }

  private disposeBody(b: Body): void {
    this.releasePartBlock(this.ringPool, b.ringBlock, b.ringLocals.length);
    const spikePool = this.spikePools[b.spikePoolIndex];
    if (spikePool) this.releasePartBlock(spikePool, b.spikeBlock, b.spikeLocals.length);
    this.disposePartialBody(b.group, b.coreMat, b.ringMat, b.eyeMat, b.tendrilGeos);
  }

  private disposePartPool(pool: BatchedPartPool): void {
    try {
      this.root.remove(pool.mesh);
    } catch {
      // Continue through independent GPU resources.
    }
    try {
      pool.mesh.dispose();
    } catch {
      // Best effort.
    }
    try {
      (pool.mesh.material as THREE.Material).dispose();
    } catch {
      // Best effort.
    }
  }

  private resetPartPool(pool: BatchedPartPool): void {
    pool.usedBlocks.fill(0);
    pool.freeBlocks.length = 0;
    pool.highWaterBlocks = 0;
    pool.liveInstances = 0;
    pool.mesh.count = 0;
  }

  /** Best-effort, no-throw cleanup for both committed bodies and failed spawn transactions. */
  private disposePartialBody(
    group: THREE.Group,
    coreMat: THREE.MeshStandardMaterial | undefined,
    ringMat: THREE.MeshStandardMaterial | undefined,
    eyeMat: THREE.MeshStandardMaterial | undefined,
    tendrilGeos: readonly THREE.BufferGeometry[],
  ): void {
    try {
      this.root.remove(group);
    } catch {
      // Continue: one failed detach must not suppress disposal of independent owned resources.
    }
    try {
      coreMat?.dispose();
    } catch {
      // Best effort.
    }
    try {
      ringMat?.dispose();
    } catch {
      // Best effort.
    }
    try {
      eyeMat?.dispose();
    } catch {
      // Best effort.
    }
    for (const g of tendrilGeos) {
      try {
        g.dispose();
      } catch {
        // Best effort; continue through every independently owned tendril geometry.
      }
    }
  }
}

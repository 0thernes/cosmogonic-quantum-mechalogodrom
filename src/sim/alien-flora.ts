/**
 * ALIEN FLORA — a living vegetal ecology for the dead arena floor.
 *
 * The ground was barren. This grows ~15,000 plants drawn from 50 deterministic SPECIES across
 * six structural FAMILIES (spire, whip, pod, blade, coral, shard), distributed in biome PATCHES
 * with bare PATHS, open GLADES, and a clear CENTER so the temple/cosmic-crown stay framed — the
 * spacing of a real world, not a uniform lawn. Plants are NOT neural (no brain, no rng draws) —
 * they are a substrate the fauna reads through {@link EntityManager.attachFloraComfort}: creatures
 * find dense cover for rest / camouflage / mating / gathering using this module's {@link comfortAt}
 * spatial readout.
 *
 * RENDER: each family is ONE `InstancedMesh` (≤6 draw calls for 10k plants) sharing one
 * `ShaderMaterial`. The wind sway, the up-the-stalk bioluminescent pulse, and the fresnel rim are
 * all done in the vertex/fragment shader on the GPU, so the per-frame CPU cost is O(1) (three
 * uniform writes) — it never scales with plant count. Instance transforms are written ONCE at
 * construction. Per-instance variation (phase, sway frequency, glow, colour, height) rides custom
 * `aParams`/`aColor` instanced attributes, so no `setColorAt`/`setMatrixAt` churn per frame.
 *
 * REACTIVITY: `update(dt, t, chaos)` drives uWind/uChaos so the field leans and luminesces harder
 * as the world agitates — the flora visibly answers the weather/chaos field (a read-only coupling,
 * never a write-back). Sway amplitude grows toward the tip (`up²` weighting), the way a real stalk
 * bends; the glow rides up the plant and pulses, like bioluminescent tissue.
 *
 * DETERMINISM (ADR 0004): placement + per-instance params come from a pure positional hash seeded
 * by a fixed constant — ZERO draws from `ctx.rng`, so it is boot-stream-neutral (constructing it
 * cannot perturb the seeded entity stream; the golden replay stays byte-identical). No Date.now,
 * no Math.random. Construction is the only heavy cost; the hot path is allocation-free.
 *
 * BIOLOGY (defensible / falsifiable, NOT decorative): a plant's silhouette, palette, height, and
 * glow are a function of its species and its biome; species cluster into patches because biome is a
 * smooth function of position (like real edaphic zonation). The visible bioluminescence is a
 * monotone readout of the world chaos scalar — pin chaos to 0 and the field goes dark and still;
 * raise it and the canopy lights and thrashes. The claim "this responds to the environment" is
 * checkable frame-by-frame.
 *
 * @see src/sim/environment.ts (the ground these are seated on — height function mirrored here)
 */
import * as THREE from 'three';
import type { SimContext } from '../types';

const TAU = Math.PI * 2;

/** Nine structural families — distinct alien silhouettes built from single primitives. */
const FAMILY_COUNT = 9;
/** 50 deterministic species spread across the families + biomes. */
const SPECIES_COUNT = 50;
/** Smooth biome field resolution: how many edaphic zones the palette/species cluster into. */
const BIOME_COUNT = 7;
/** Target plant population (dense alien forest; still six instanced draw calls). */
const TARGET_DESKTOP = 15000;
const TARGET_MOBILE = 5200;
/** Plant SQUARE half-extent — USER: flora fills the WHOLE SQUARE platform (corners included), not a
 *  central circle. 540 = (GROUND_EXTENT/2)*0.9, a small inset inside the ±600 ground edge. */
const FIELD_HALF = 540;
/** Keep a clear circle at the centre (temple base + cosmic crown column). */
const CENTER_CLEAR = 78;
/** Fixed layout seed — flora is the same world every replay (decor, not heritable state). */
const FLORA_SEED = 0x5eedf10a;

/** Deterministic positional hash → [0,1). No bitwise, no rng stream. */
function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7 + FLORA_SEED * 0.000113) * 43758.5453;
  return s - Math.floor(s);
}

/** Ground surface height — MIRRORS EnvironmentSystem's displaced plane so plants sit on the dunes.
 *  World Y = mesh.y(-10) + planeZ displacement, with the −90° X rotation mapping (x,z)→(x,−z). */
function groundHeight(x: number, z: number): number {
  return -13 + 8 * Math.sin(0.012 * x) * Math.cos(0.01 * z) + 2 * Math.sin(0.04 * x - 0.03 * z);
}

/** Smooth biome zonation 0..BIOME_COUNT-1 — a continuous function of position ⇒ species cluster. */
function biomeAt(x: number, z: number): number {
  const f = Math.sin(x * 0.0042) * Math.cos(z * 0.0051) + Math.sin((x + z) * 0.0031 + 1.7) + 2; // ∈ [0,4]
  const b = Math.floor((f / 4) * BIOME_COUNT);
  return b < 0 ? 0 : b >= BIOME_COUNT ? BIOME_COUNT - 1 : b;
}

interface Species {
  readonly family: number;
  readonly biome: number;
  /** Base hue (turns 0..1) — biome-banded so a patch reads as one alien palette. */
  readonly hue: number;
  readonly sat: number;
  readonly light: number;
  /** Overall size multiplier. */
  readonly size: number;
  /** Sway oscillation frequency (rad/s of `t`). */
  readonly swayFreq: number;
  /** Bioluminescent intensity 0..1. */
  readonly glow: number;
}

/** One structural family's base geometry + the local height of its tallest vertex (for sway up-weighting). */
interface Family {
  readonly geo: THREE.BufferGeometry;
  readonly height: number;
}

const flora_vert = /* glsl */ `
  attribute vec4 aParams;   // x: phase, y: swayFreq, z: glow, w: localHeight
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uWind;
  uniform float uChaos;
  uniform vec2 uContactPos;
  uniform float uContact;
  varying vec3 vColor;
  varying float vGlow;
  varying float vUp;
  varying vec3 vNormalV;
  varying vec3 vViewDir;

  void main() {
    vColor = aColor;
    vGlow = aParams.z;
    float up = clamp(position.y / max(aParams.w, 0.001), 0.0, 1.0);
    vUp = up;

    float phase = aParams.x;
    float freq = aParams.y;
    float bend = up * up * (uWind + uChaos * 0.8);
    float turb = up * up * uChaos * 0.6;
    vec3 p = position;
    p.x += sin(uTime * freq + phase) * bend * 2.6 + sin(uTime * freq * 3.7 + phase * 2.1) * turb * 1.2;
    p.z += cos(uTime * freq * 0.8 + phase * 1.3) * bend * 2.1 + cos(uTime * freq * 2.9 + phase * 1.7) * turb * 1.0;
    p.y += sin(uTime * freq * 0.5 + phase) * up * 0.18 * (uWind + uChaos) + sin(uTime * freq * 4.3 + phase) * up * 0.05 * uChaos;

    vec4 worldPosition = instanceMatrix * vec4(p, 1.0);
    float wave =
      sin(worldPosition.x * 0.035 + uTime * (0.25 + uChaos * 0.35)) *
      cos(worldPosition.z * 0.031 - uTime * (0.22 + uChaos * 0.28));
    float tectonic =
      sin((worldPosition.x + worldPosition.z) * 0.011 + uTime * 0.11) *
      cos((worldPosition.x - worldPosition.z) * 0.009 - uTime * 0.13);
    float cellular =
      sin(worldPosition.x * 0.071 + sin(worldPosition.z * 0.019 + uTime * 0.2) * 2.0) *
      sin(worldPosition.z * 0.067 - cos(worldPosition.x * 0.017 - uTime * 0.17) * 2.0);
    float ridge = pow(abs(cellular), 1.6) * sign(cellular);
    vec2 away = worldPosition.xz - uContactPos;
    float contactD2 = max(dot(away, away), 1.0);
    float contact = uContact * smoothstep(5200.0, 0.0, contactD2);
    vec2 contactDir = away * inversesqrt(contactD2);
    worldPosition.xz += contactDir * contact * up * up * (9.0 + uChaos * 8.0);
    worldPosition.y += contact * up * (2.4 + uChaos * 3.2);
    worldPosition.y += sin(contact * 8.0 + uTime * 2.1) * contact * (1.5 + uChaos * 2.0);
    worldPosition.y += wave * (1.1 + uChaos * 3.1) + tectonic * (0.5 + uChaos * 2.3) + ridge * (0.75 + uChaos * 1.7);
    vec4 mvPosition = modelViewMatrix * worldPosition;
    vNormalV = normalize(normalMatrix * mat3(instanceMatrix) * normal);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const flora_frag = /* glsl */ `
  uniform float uTime;
  uniform float uChaos;
  varying vec3 vColor;
  varying float vGlow;
  varying float vUp;
  varying vec3 vNormalV;
  varying vec3 vViewDir;

  void main() {
    vec3 n = normalize(vNormalV);
    vec3 v = normalize(vViewDir);
    float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.5);
    // soft key from a fixed alien sun direction (view space approx) + ambient floor
    float key = 0.35 + 0.65 * clamp(dot(n, normalize(vec3(0.35, 0.8, 0.45))), 0.0, 1.0);
    vec3 base = vColor * key;
    // bioluminescence rides UP the stalk, pulses, and brightens with world chaos
    float pulse = 0.55 + 0.45 * sin(uTime * 1.7 + vUp * 6.2831);
    float glow = vGlow * (0.18 + 0.82 * vUp) * pulse * (0.5 + 0.9 * uChaos);
    vec3 glowCol = vColor * vec3(1.25, 1.55, 1.95) + vec3(0.04, 0.10, 0.16);
    vec3 col = base + glowCol * glow + vColor * fres * 0.55;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export interface FloraComfort {
  /** World position of the densest nearby grove cell centre. */
  x: number;
  y: number;
  z: number;
  /** 0..1 cover strength (normalized local plant density). */
  strength: number;
}

/**
 * The alien-flora field. Construct once with the {@link SimContext}; `update` each frame;
 * `comfortAt` queries cover density for the fauna.
 */
export class AlienFlora {
  /** One InstancedMesh per family that has ≥1 plant. */
  private readonly meshes: THREE.InstancedMesh[] = [];
  private readonly families: Family[];
  private readonly material: THREE.ShaderMaterial;
  private readonly scene: THREE.Scene;

  /** Total plants actually placed (after clearings/paths/glade rejections). */
  readonly instanceCount: number;
  readonly speciesCount = SPECIES_COUNT;

  // ── Coarse density grid for the ecology query (cover for rest/camo/mating). ──
  private readonly cell = 44;
  private readonly gridN: number;
  private readonly gridHalf: number;
  private readonly density: Float32Array;
  private readonly maxDensity: number;

  constructor(ctx: SimContext) {
    this.scene = ctx.scene;
    const target = ctx.quality.isMobile ? TARGET_MOBILE : TARGET_DESKTOP;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWind: { value: 0.4 },
        uChaos: { value: 0 },
        uContactPos: { value: new THREE.Vector2(99999, 99999) },
        uContact: { value: 0 },
      },
      vertexShader: flora_vert,
      fragmentShader: flora_frag,
    });

    this.families = AlienFlora.buildFamilies();
    const species = AlienFlora.buildSpecies();

    // Density grid spans the field; +1 cell margin so edge plants land in-bounds.
    this.gridN = Math.ceil((FIELD_HALF * 2) / this.cell) + 2;
    this.gridHalf = (this.gridN * this.cell) / 2;
    this.density = new Float32Array(this.gridN * this.gridN);

    // ── Placement: golden-angle spiral candidates, thinned by paths / glades / density. ──
    interface Placed {
      x: number;
      z: number;
      sp: number;
      scale: number;
      yaw: number;
      tilt: number;
    }
    const perFamily: Placed[][] = Array.from({ length: FAMILY_COUNT }, () => []);
    const candidates = Math.ceil(target * 3.2);
    // Three winding "bare paths" carved by low values of a smooth corridor field.
    let placed = 0;
    let maxD = 1;
    for (let k = 0; k < candidates && placed < target; k++) {
      // R2 plastic-constant low-discrepancy sequence → uniform SQUARE coverage incl. corners
      // (deterministic, no rng). Reuses the same per-k hash() draws (order/count unchanged).
      const u = (0.5 + 0.7548776662466927 * (k + 1)) % 1;
      const v = (0.5 + 0.5698402909980532 * (k + 1)) % 1;
      let x = (u * 2 - 1) * FIELD_HALF + (hash(k * 3 + 1) - 0.5) * this.cell * 1.3;
      let z = (v * 2 - 1) * FIELD_HALF + (hash(k * 3 + 2) - 0.5) * this.cell * 1.3;
      if (Math.hypot(x, z) < CENTER_CLEAR) continue; // keep the temple/crown centre clear

      // Winding RAVINES / VALLEYS / TRAILS: a ridged, phase-warped multi-octave field — low values are
      // bare meandering paths that wander corner-to-corner across the whole square.
      const trail = Math.abs(
        Math.sin(x * 0.009 + z * 0.005 + 1.3 * Math.sin(z * 0.004)) +
          0.65 * Math.sin(z * 0.017 - x * 0.006 + 0.9 * Math.sin(x * 0.008)) +
          0.35 * Math.sin((x - z) * 0.024),
      );
      if (trail < 0.22) continue;

      // Open glades: a few deterministic clearings.
      let inGlade = false;
      for (let g = 0; g < 7; g++) {
        const gx = (hash(g * 7 + 3) - 0.5) * FIELD_HALF * 1.9;
        const gz = (hash(g * 7 + 5) - 0.5) * FIELD_HALF * 1.9;
        const gr = 40 + hash(g * 7 + 9) * 70;
        const dx = x - gx;
        const dz = z - gz;
        if (dx * dx + dz * dz < gr * gr) {
          inGlade = true;
          break;
        }
      }
      if (inGlade) continue;

      // Density: patchy alien jungle — multi-octave positional noise makes dense groves and sparse
      // clearings spread across the WHOLE ground. USER #15: the old `(1 - 0.45*rr)` factor thinned the
      // edge and biased plants to the centre — REMOVED, so the outer land is as alive as the core.
      // Multi-octave grove field: big groves (low freq) modulated by brush (mid) + fine speckle (high),
      // with a LOW acceptance floor + gamma so brush zones genuinely thin and groves densify.
      const grove =
        Math.sin(x * 0.0055 + 0.7 * Math.sin(z * 0.003)) * Math.cos(z * 0.0061) +
        0.55 * Math.sin((x + z) * 0.013 + 2.1) +
        0.3 * Math.sin(x * 0.028 - z * 0.023) +
        0.18 * Math.sin(x * 0.061 + z * 0.057);
      const clump = 0.5 + 0.5 * Math.max(-1, Math.min(1, grove * 0.62));
      const accept = 0.06 + 0.94 * Math.pow(clump, 1.8);
      if (hash(k * 3) > accept) continue;

      // Species: drawn from this position's biome so patches read as one palette.
      const biome = biomeAt(x, z);
      const sp = AlienFlora.pickSpecies(biome, k);
      const s = species[sp]!;
      const giant = hash(k * 23 + 29) > 0.965 ? 2.4 + hash(k * 23 + 31) * 2.8 : 1;
      const scale = s.size * (0.44 + hash(k * 5 + 11) * 1.45) * giant;
      const yaw = hash(k * 5 + 13) * TAU;
      const tilt = (hash(k * 5 + 17) - 0.5) * (0.28 + hash(k * 5 + 19) * 0.42);
      perFamily[s.family]!.push({ x, z, sp, scale, yaw, tilt });
      placed++;

      // Density grid tally.
      const gi = this.gridIndex(x, z);
      if (gi >= 0) {
        const d = (this.density[gi]! += 1);
        if (d > maxD) maxD = d;
      }
    }
    this.instanceCount = placed;
    this.maxDensity = maxD;

    // ── Realize one InstancedMesh per non-empty family. ──
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    const col = new THREE.Color();
    for (let fam = 0; fam < FAMILY_COUNT; fam++) {
      const list = perFamily[fam]!;
      if (list.length === 0) continue;
      const fmly = this.families[fam]!;
      const geo = fmly.geo.clone(); // per-family clone so each owns its instanced attributes
      const n = list.length;
      const params = new Float32Array(n * 4);
      const colors = new Float32Array(n * 3);
      const mesh = new THREE.InstancedMesh(geo, this.material, n);
      mesh.frustumCulled = false;
      for (let i = 0; i < n; i++) {
        const pl = list[i]!;
        const s = species[pl.sp]!;
        const gy = groundHeight(pl.x, pl.z) - 0.5; // sink the base slightly into the soil
        pos.set(pl.x, gy, pl.z);
        // USER #15: vary based on the angle (ground slope) for accurate attachment to the terrain.
        // Finite difference approx of normal → additional tilt so plants follow the ground "dunes" slope.
        const dhx = groundHeight(pl.x + 1, pl.z) - groundHeight(pl.x - 1, pl.z);
        const dhz = groundHeight(pl.x, pl.z + 1) - groundHeight(pl.x, pl.z - 1);
        const groundTiltX = -dhz * 0.45;
        const groundTiltZ = dhx * 0.45;
        e.set(
          groundTiltX + Math.sin(pl.yaw) * pl.tilt,
          pl.yaw,
          groundTiltZ + Math.cos(pl.yaw) * pl.tilt,
        );
        q.setFromEuler(e);
        scl.setScalar(pl.scale);
        m.compose(pos, q, scl);
        mesh.setMatrixAt(i, m);
        // per-instance shader params + colour (hue jittered within the species band).
        const hueJit =
          (s.hue +
            (hash(pl.sp * 31 + i) - 0.5) * 0.16 +
            0.035 * Math.sin(pl.x * 0.009 + pl.z * 0.011) +
            1) %
          1;
        col.setHSL(
          hueJit,
          Math.min(0.98, s.sat + (hash(i * 97 + pl.sp) - 0.5) * 0.18),
          Math.min(0.72, s.light + hash(i * 101 + pl.sp) * 0.18),
        );
        const o4 = i * 4;
        params[o4] = hash(pl.sp * 13 + i * 7) * TAU; // phase
        params[o4 + 1] = s.swayFreq * (0.55 + hash(i * 73 + pl.sp) * 1.55);
        params[o4 + 2] = Math.min(1, s.glow + hash(i * 79 + pl.sp) * 0.38);
        params[o4 + 3] = fmly.height;
        const o3 = i * 3;
        colors[o3] = col.r;
        colors[o3 + 1] = col.g;
        colors[o3 + 2] = col.b;
      }
      geo.setAttribute('aParams', new THREE.InstancedBufferAttribute(params, 4));
      geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3));
      mesh.instanceMatrix.needsUpdate = true;
      this.scene.add(mesh);
      this.meshes.push(mesh);
    }
  }

  /** Map world (x,z) → density-grid index, or −1 if outside. */
  private gridIndex(x: number, z: number): number {
    const ix = Math.floor((x + this.gridHalf) / this.cell);
    const iz = Math.floor((z + this.gridHalf) / this.cell);
    if (ix < 0 || iz < 0 || ix >= this.gridN || iz >= this.gridN) return -1;
    return iz * this.gridN + ix;
  }

  /** Six alien silhouettes from single primitives, each translated so its BASE sits at local y=0. */
  private static buildFamilies(): Family[] {
    const fams: Family[] = [];
    // 0 spire — tall needle cone
    {
      const g = new THREE.ConeGeometry(0.55, 6, 6, 1);
      g.translate(0, 3, 0);
      fams.push({ geo: g, height: 6 });
    }
    // 1 whip — tapered tendril
    {
      const g = new THREE.CylinderGeometry(0.05, 0.42, 8, 5, 1);
      g.translate(0, 4, 0);
      fams.push({ geo: g, height: 8 });
    }
    // 2 pod — knobby ground bulb
    {
      const g = new THREE.IcosahedronGeometry(1.2, 1);
      g.scale(1, 1.15, 1);
      g.translate(0, 1.38, 0);
      fams.push({ geo: g, height: 2.76 });
    }
    // 3 blade — thin tall leaf
    {
      const g = new THREE.BoxGeometry(0.26, 5, 1.35, 1, 4, 1);
      g.translate(0, 2.5, 0);
      fams.push({ geo: g, height: 5 });
    }
    // 4 coral — tall spiky diamond
    {
      const g = new THREE.OctahedronGeometry(1.8, 1);
      g.scale(0.7, 2.2, 0.7);
      g.translate(0, 3.96, 0);
      fams.push({ geo: g, height: 7.92 });
    }
    // 5 shard — crystal tetra
    {
      const g = new THREE.TetrahedronGeometry(1.7, 0);
      g.scale(0.85, 2.0, 0.85);
      g.translate(0, 3.4, 0);
      fams.push({ geo: g, height: 6.8 });
    }
    // V109: 6 helix — twisted shell stalk
    {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 32; i++) {
        const y = (i / 32) * 5.5;
        const a = i * 0.55;
        const r = 0.35 * (1 - i / 32);
        pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
      }
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.16, 5, false);
      fams.push({ geo: g, height: 5.5 });
    }
    // V109: 7 bubble — clustered ground orbs
    {
      const g = new THREE.SphereGeometry(0.7, 8, 6);
      g.scale(1, 0.85, 1);
      g.translate(0, 0.75, 0);
      fams.push({ geo: g, height: 1.5 });
    }
    // V109: 8 fan — broad curved sail
    {
      const g = new THREE.CylinderGeometry(0.02, 1.6, 4.5, 3, 1, true);
      g.scale(1, 1, 0.25);
      g.translate(0, 2.25, 0);
      fams.push({ geo: g, height: 4.5 });
    }
    return fams;
  }

  /** 50 deterministic species, biome-banded so each zone has a coherent alien palette. */
  private static buildSpecies(): Species[] {
    const out: Species[] = [];
    for (let i = 0; i < SPECIES_COUNT; i++) {
      const biome = i % BIOME_COUNT;
      const family = Math.floor(hash(i * 17 + 101) * FAMILY_COUNT) % FAMILY_COUNT;
      // Each biome owns a hue band; species jitter within it.
      const band = biome / BIOME_COUNT;
      const hue = (band + (hash(i * 19 + 2) - 0.5) * 0.12 + 1) % 1;
      out.push({
        family,
        biome,
        hue,
        sat: 0.62 + hash(i * 23 + 3) * 0.36,
        light: 0.34 + hash(i * 29 + 5) * 0.28,
        size: 0.45 + hash(i * 31 + 7) * 2.4,
        swayFreq: 0.22 + hash(i * 37 + 11) * 2.2,
        glow: 0.25 + hash(i * 41 + 13) * 0.7,
      });
    }
    return out;
  }

  /** Choose a species whose biome matches the location; fall back across the band deterministically. */
  private static pickSpecies(biome: number, salt: number): number {
    // Species i has biome (i % BIOME_COUNT); gather that band and pick within it.
    const start = biome % BIOME_COUNT;
    const stride = BIOME_COUNT;
    const inBand: number[] = [];
    for (let i = start; i < SPECIES_COUNT; i += stride) inBand.push(i);
    if (inBand.length === 0) return 0;
    const pick = Math.floor(hash(salt * 7 + 53) * inBand.length) % inBand.length;
    return inBand[pick]!;
  }

  /**
   * Cover query for the fauna: the densest grove cell near (x,z). Creatures will steer here for
   * rest / camouflage / mating / gathering. Returns finite world coords + a 0..1 strength.
   */
  comfortAt(x: number, z: number): FloraComfort {
    const ix = Math.floor((x + this.gridHalf) / this.cell);
    const iz = Math.floor((z + this.gridHalf) / this.cell);
    let bestD = -1;
    let bx = x;
    let bz = z;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = ix + dx;
        const cz = iz + dz;
        if (cx < 0 || cz < 0 || cx >= this.gridN || cz >= this.gridN) continue;
        const d = this.density[cz * this.gridN + cx]!;
        if (d > bestD) {
          bestD = d;
          bx = cx * this.cell - this.gridHalf + this.cell / 2;
          bz = cz * this.cell - this.gridHalf + this.cell / 2;
        }
      }
    }
    const strength = bestD <= 0 ? 0 : bestD / this.maxDensity;
    return { x: bx, y: groundHeight(bx, bz), z: bz, strength };
  }

  /** Drive the wind/chaos uniforms — flora leans + luminesces with the world's agitation. O(1). */
  update(_dt: number, t: number, chaos: number): void {
    const c = chaos < 0 ? 0 : chaos > 1 ? 1 : chaos;
    const u = this.material.uniforms;
    u['uTime']!.value = t;
    u['uWind']!.value = 0.32 + 0.7 * c + 0.08 * Math.sin(t * 0.31);
    u['uChaos']!.value = c;
    u['uContact']!.value = (u['uContact']!.value as number) * 0.88;
  }

  /**
   * Visual contact response: plants near the supplied world XZ position bend away and lift.
   * Render-only and decaying; it never writes back into entity or terrain simulation state.
   */
  setContact(x: number, z: number, strength: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    const s = strength < 0 ? 0 : strength > 1 ? 1 : strength;
    const u = this.material.uniforms;
    (u['uContactPos']!.value as THREE.Vector2).set(x, z);
    u['uContact']!.value = Math.max(u['uContact']!.value as number, s);
  }

  /** Free every owned geometry + the shared material (HMR / world-reset safe). */
  dispose(): void {
    for (const mesh of this.meshes) {
      mesh.geometry.dispose();
      this.scene.remove(mesh);
      mesh.dispose();
    }
    this.meshes.length = 0;
    for (const f of this.families) f.geo.dispose();
    this.material.dispose();
  }
}

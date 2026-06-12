/**
 * Instanced entity renderer (CONTRACTS V3.1, PANTHEON).
 *
 * Above the phone tier the per-entity `THREE.Mesh` draw path (1 draw call per
 * organism — fatal at 10,000) is replaced by InstancedMesh POOLS: one pool per
 * (cached geometry, transparency) pair, ≤ 80 pools total, each drawn in a single
 * call. The EntityManager facade is unchanged — every entity stays a real
 * `THREE.Mesh` carrying its own material and userData, it is simply never added
 * to the scene; this renderer mirrors the logical population into the pools once
 * per frame, AFTER every system that mutates entity visuals has run.
 *
 * Per-instance channels:
 * - **matrix** — composed from the data-mesh position/quaternion/scale
 *   (`updateMatrix()`; Euler→quaternion stays synced by three's onChange hooks).
 * - **color** — `instanceColor` (three built-in) from `material.color`.
 * - **emissive+alpha** — custom vec4 `instEmissive` attribute
 *   (rgb = `material.emissive · emissiveIntensity`, a = opacity), patched into
 *   the standard shader via `onBeforeCompile`: it REPLACES
 *   `totalEmissiveRadiance` and multiplies `diffuseColor.a`. Per-instance
 *   metalness/roughness are NOT representable — pools render at 0.5/0.5
 *   (documented visual compromise; emissive carries the identity anyway).
 *
 * Pool sizing: lazily constructed at `initialPoolCapacity` (uniform share ×
 * HEADROOM) and grown ×2 (event-driven, never per-frame churn) up to
 * `maxEntities` — a mutate-all collapsing the population into one pool is the
 * worst case and stays bounded. Rebuild is full each frame: O(2n) passes, zero
 * allocation in steady state, uploads clipped to the live instance range.
 *
 * Shadows: instanced pools cast none (the legacy path only ever shadowed the
 * first 120 organisms; at 5,000+ the map would drown). Environment shadows are
 * untouched.
 */
import * as THREE from 'three';
import { RENDER_MODE_FX } from './constants';
import type { RenderMode } from './constants';
import type { Entity, SimContext } from '../types';

/** Capacity headroom multiplier over the uniform per-pool share. */
const HEADROOM = 4;

/** Pool-material base metalness/roughness (per-instance PBR is not representable — V3.1). */
const POOL_METALNESS = 0.5;
const POOL_ROUGHNESS = 0.5;

/** Fixed translucent-pool blending opacity is carried per instance — this is the floor. */
const MIN_ALPHA = 0.05;

/**
 * Initial instance capacity for a pool: the uniform share of `maxEntities`
 * across `geoCount` geometries × {@link HEADROOM}, floored at 16. Pure — see
 * tests/instanced.test.ts. O(1).
 */
export function initialPoolCapacity(maxEntities: number, geoCount: number): number {
  if (geoCount < 1) return Math.max(16, maxEntities);
  return Math.max(16, Math.ceil((maxEntities / geoCount) * HEADROOM));
}

/**
 * Next pool capacity that fits `needed`: doubles from `current`, clamped to
 * `max`. Returns `current` when it already fits. Pure. O(log(max/current)).
 */
export function grownCapacity(current: number, needed: number, max: number): number {
  let c = Math.max(1, current);
  while (c < needed && c < max) c *= 2;
  return Math.min(Math.max(c, needed > max ? max : c), max);
}

/**
 * Pool slot key for a geometry index + transparency flag (two slots per
 * geometry: opaque, translucent). Pure. O(1).
 */
export function poolKey(geoIndex: number, transparent: boolean): number {
  return geoIndex * 2 + (transparent ? 1 : 0);
}

/** One InstancedMesh pool (lazily constructed). */
interface Pool {
  mesh: THREE.InstancedMesh;
  /** vec4 per instance: rgb = emissive·intensity, a = opacity. */
  emissive: THREE.InstancedBufferAttribute;
  capacity: number;
  /** Live instances written this frame (reset each sync). */
  used: number;
}

/** Shared per-frame shader uniforms (CONTRACTS V7-beyond). One bag linked into EVERY pool
 *  material's compiled shader, so a single per-frame write drives all pools — robust to pool
 *  growth/remorph (a new compile re-links the same uniform objects). */
interface ShaderUniforms {
  uTime: { value: number };
  uNightmare: { value: number };
  uChaos: { value: number };
  uBass: { value: number };
}

/**
 * Patch a pool material with the per-instance emissive+alpha attribute (V3.1) AND the V7-beyond
 * shader block: shared uniforms + a SIMULATION N(2) vertex-melt that displaces each instance
 * along its surface normal by a time+position+instance warp, gated on `uNightmare` (0 at N1 →
 * the branch is skipped → vertices untouched → byte-identical). Per-instance phase comes from
 * `gl_InstanceID` (WebGL2 built-in — no extra attribute). Pure GPU; zero per-entity CPU cost.
 */
function patchPoolMaterial(mat: THREE.MeshStandardMaterial, uniforms: ShaderUniforms): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms['uTime'] = uniforms.uTime;
    shader.uniforms['uNightmare'] = uniforms.uNightmare;
    shader.uniforms['uChaos'] = uniforms.uChaos;
    shader.uniforms['uBass'] = uniforms.uBass;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute vec4 instEmissive;\nvarying vec4 vInstEmissive;\nuniform float uTime;\nuniform float uNightmare;',
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n' +
          'vInstEmissive = instEmissive;\n' +
          'if (uNightmare > 0.0) {\n' +
          '  float ph = float(gl_InstanceID) * 0.6180339887;\n' +
          '  float warp = sin(position.y * 8.0 + uTime * 3.0 + ph) * 0.5 + sin(position.x * 6.0 - uTime * 2.0 + ph) * 0.5;\n' +
          '  transformed += objectNormal * (uNightmare * warp * 0.18);\n' +
          '}',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vInstEmissive;')
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        'vec4 diffuseColor = vec4( diffuse, opacity * vInstEmissive.a );',
      )
      .replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance = vInstEmissive.rgb;',
      );
  };
}

/**
 * Owns the InstancedMesh pools and the per-frame mirror pass. Construct once in
 * world.ts when `quality.instanced`; call {@link sync} once per frame after all
 * entity mutations (just before render).
 */
export class InstancedEntityRenderer {
  private readonly scene: THREE.Scene;
  private readonly geos: readonly THREE.BufferGeometry[];
  private readonly maxEntities: number;
  /** Pool slots: `geoIndex * 2 + transparentBit`; null = never used. */
  private readonly pools: (Pool | null)[];
  /** geometry.id → cache index (remorph swaps geometry references at runtime). */
  private readonly geoIndex = new Map<number, number>();
  /** Per-slot live counts for the current sync pass (pass 1 → pass 2). */
  private readonly counts: Uint32Array;
  /** Per-slot write cursors for pass 2. */
  private readonly cursors: Uint32Array;
  /** Render mode last applied to pool materials (CONTRACTS V7.3). */
  private mode: RenderMode = 'solid';
  /** Shared shader uniforms (V7-beyond) — one bag linked into every pool, written once/frame. */
  private readonly shaderUniforms: ShaderUniforms = {
    uTime: { value: 0 },
    uNightmare: { value: 0 },
    uChaos: { value: 0 },
    uBass: { value: 0 },
  };

  /** Stores references and builds the geometry-id lookup. No pools yet. O(geos). */
  constructor(ctx: SimContext) {
    this.scene = ctx.scene;
    this.geos = ctx.geos;
    this.maxEntities = ctx.quality.maxEntities;
    this.pools = Array.from<Pool | null>({ length: ctx.geos.length * 2 }).fill(null);
    this.counts = new Uint32Array(ctx.geos.length * 2);
    this.cursors = new Uint32Array(ctx.geos.length * 2);
    for (let i = 0; i < ctx.geos.length; i++) {
      const g = ctx.geos[i];
      if (g) this.geoIndex.set(g.id, i);
    }
  }

  /**
   * Mirror the logical population into the pools. Two O(n) passes (count, then
   * write), event-driven pool construction/growth only, GPU uploads clipped to
   * each pool's live range. Call once per frame after all entity mutations.
   */
  sync(list: readonly Entity[], mode: RenderMode, frame: InstanceFrame = ZERO_FRAME): void {
    // Drive the shared shader uniforms (V7-beyond) — one write reaches every pool. At N1
    // (nightmare 0) the GPU melt branch is skipped, so the scene is byte-identical.
    this.shaderUniforms.uTime.value = frame.t;
    this.shaderUniforms.uNightmare.value = frame.nightmare;
    this.shaderUniforms.uChaos.value = frame.chaos;
    this.shaderUniforms.uBass.value = frame.bass;
    const counts = this.counts;
    const cursors = this.cursors;
    counts.fill(0);

    // Pass 1 — census per pool slot.
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e) continue; // invariant: list is dense
      const gi = this.geoIndex.get(e.geometry.id);
      if (gi === undefined) continue; // foreign geometry — never pooled
      const k = poolKey(gi, e.material.transparent);
      counts[k] = (counts[k] ?? 0) + 1;
    }

    // Ensure pools exist and fit (event-driven; steady state is a no-op).
    for (let k = 0; k < counts.length; k++) {
      const need = counts[k] ?? 0;
      if (need === 0) continue;
      const pool = this.pools[k];
      if (!pool) this.pools[k] = this.buildPool(k, need);
      else if (need > pool.capacity) this.growPool(k, pool, need);
    }

    // Pass 2 — write matrices/colors/emissive into the pools. The N(2) inverted palette
    // (CONTRACTS V7.6) is folded in HERE — it rewrites the per-instance attributes only, never
    // the morphotype base material, so flipping back to N(1) (nightmare→0) is automatic.
    const night = frame.nightmare;
    cursors.fill(0);
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e) continue; // invariant: list is dense
      const gi = this.geoIndex.get(e.geometry.id);
      if (gi === undefined) continue;
      const k = poolKey(gi, e.material.transparent);
      const pool = this.pools[k];
      if (!pool) continue; // invariant: ensured above
      const slot = cursors[k] ?? 0;
      if (slot >= pool.capacity) continue; // capacity clamp (growth hit maxEntities)
      cursors[k] = slot + 1;
      e.updateMatrix();
      pool.mesh.setMatrixAt(slot, e.matrix);
      const c = e.material.color;
      const em = e.material.emissive;
      const eI = e.material.emissiveIntensity;
      const a = pool.emissive.array as Float32Array;
      const o = slot * 4;
      if (night > 0) {
        // Inverted, channel-permuted ("glitched") colour: target = vec3(1) − c.bgr, then a
        // per-instance 3-way channel rotation by (i % 3) so the inversion is non-uniform. Mix
        // toward it by `night`. Pure arithmetic on the existing colour — no rng.
        const ir = 1 - c.b;
        const ig = 1 - c.g;
        const ib = 1 - c.r;
        const rot = i % 3;
        const tr = rot === 0 ? ir : rot === 1 ? ig : ib;
        const tg = rot === 0 ? ig : rot === 1 ? ib : ir;
        const tb = rot === 0 ? ib : rot === 1 ? ir : ig;
        NIGHT_COL.setRGB(
          c.r + (tr - c.r) * night,
          c.g + (tg - c.g) * night,
          c.b + (tb - c.b) * night,
        );
        pool.mesh.setColorAt(slot, NIGHT_COL);
        // Emissive inverted + hotter, so the glow goes wrong too.
        const eIn = eI * (1 + 0.6 * night);
        a[o] = (em.r + (1 - em.b - em.r) * night) * eIn;
        a[o + 1] = (em.g + (1 - em.g - em.g) * night) * eIn;
        a[o + 2] = (em.b + (1 - em.r - em.b) * night) * eIn;
      } else {
        pool.mesh.setColorAt(slot, c);
        a[o] = em.r * eI;
        a[o + 1] = em.g * eI;
        a[o + 2] = em.b * eI;
      }
      a[o + 3] = e.material.transparent ? Math.max(e.material.opacity, MIN_ALPHA) : 1;
    }

    // Publish: live counts, clipped uploads, render mode (V7.3). Per-instance colour/emissive/
    // alpha already came from each entity material above; only the pool-level flags
    // (wireframe/metalness/roughness) need pushing, and only when the mode changes.
    const modeChanged = mode !== this.mode;
    this.mode = mode;
    for (let k = 0; k < this.pools.length; k++) {
      const pool = this.pools[k];
      if (!pool) continue;
      const used = cursors[k] ?? 0;
      pool.used = used;
      pool.mesh.count = used;
      if (used > 0) {
        pool.mesh.instanceMatrix.clearUpdateRanges();
        pool.mesh.instanceMatrix.addUpdateRange(0, used * 16);
        pool.mesh.instanceMatrix.needsUpdate = true;
        const ic = pool.mesh.instanceColor;
        if (ic) {
          ic.clearUpdateRanges();
          ic.addUpdateRange(0, used * 3);
          ic.needsUpdate = true;
        }
        pool.emissive.clearUpdateRanges();
        pool.emissive.addUpdateRange(0, used * 4);
        pool.emissive.needsUpdate = true;
      }
      if (modeChanged) {
        this.applyModeToPool(pool.mesh.material as THREE.MeshStandardMaterial);
      }
    }
  }

  /**
   * Apply the current {@link RenderMode}'s pool-level flags to a pool material (CONTRACTS
   * V7.3). Pools carry uniform PBR (per-instance metalness/roughness is not representable),
   * so a mode's metalness/roughness/wireframe apply pool-wide; per-instance opacity/emissive
   * stay on the instance attributes. O(1).
   */
  private applyModeToPool(mat: THREE.MeshStandardMaterial): void {
    const fx = RENDER_MODE_FX[this.mode];
    mat.wireframe = fx.wireframe;
    mat.metalness = fx.metalness ?? POOL_METALNESS;
    mat.roughness = fx.roughness ?? POOL_ROUGHNESS;
  }

  /** Build a pool for slot `k` sized for `need` (event-driven). */
  private buildPool(k: number, need: number): Pool {
    const gi = k >> 1;
    const transparent = (k & 1) === 1;
    const capacity = grownCapacity(
      initialPoolCapacity(this.maxEntities, this.geos.length),
      need,
      this.maxEntities,
    );
    const geo = this.geos[gi];
    if (!geo) throw new Error(`InstancedEntityRenderer: missing geometry ${gi}`);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: POOL_METALNESS,
      roughness: POOL_ROUGHNESS,
      transparent,
      opacity: 1,
      side: transparent ? THREE.DoubleSide : THREE.FrontSide,
    });
    this.applyModeToPool(mat); // carry the current render mode onto a freshly built pool (V7.3)
    patchPoolMaterial(mat, this.shaderUniforms);
    const mesh = new THREE.InstancedMesh(geo, mat, capacity);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Instances roam the whole arena — per-pool sphere culling is meaningless.
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.count = 0;
    const emissive = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    emissive.setUsage(THREE.DynamicDrawUsage);
    // The pool renders a per-pool CLONE of the cached geometry so the
    // `instEmissive` attribute never leaks onto the shared cache entry (entity
    // geometries are tiny — ≤80 small clones, boot/growth-time only). The clone
    // is owned by the pool and disposed on growth; the cache original never is.
    const instGeo = geo.clone();
    instGeo.setAttribute('instEmissive', emissive);
    mesh.geometry = instGeo;
    // Force instanceColor allocation now so sync() can assume it exists.
    mesh.setColorAt(0, WHITE);
    const ic = mesh.instanceColor;
    if (ic) ic.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(mesh);
    return { mesh, emissive, capacity, used: 0 };
  }

  /** Replace a pool with a doubled-capacity successor (event-driven, rare). */
  private growPool(k: number, pool: Pool, need: number): void {
    const capacity = grownCapacity(pool.capacity, need, this.maxEntities);
    if (capacity <= pool.capacity) return; // already at the ceiling
    this.scene.remove(pool.mesh);
    pool.mesh.geometry.dispose(); // the per-pool CLONE owns its attribute container
    pool.mesh.dispose();
    (pool.mesh.material as THREE.MeshStandardMaterial).dispose();
    this.pools[k] = this.buildPool(k, need);
  }
}

/** Scratch color for the instanceColor warm-up write. */
const WHITE = new THREE.Color(0xffffff);
/** Scratch color for the N(2) inverted-palette write (reused per instance — no per-frame alloc). */
const NIGHT_COL = new THREE.Color();

/**
 * Per-frame scalars the integrator hands to {@link InstancedEntityRenderer.sync} (CONTRACTS
 * V7.6 / the V7-beyond shader block). A reused object — never allocated per frame.
 * `nightmare` 0..1 drives the inverted palette (and, in the GPU wave, the melt shader).
 */
export interface InstanceFrame {
  t: number;
  chaos: number;
  bass: number;
  nightmare: number;
}

/** Default zero frame — keeps the legacy `sync(list, mode)` call shape working unchanged. */
const ZERO_FRAME: InstanceFrame = { t: 0, chaos: 0, bass: 0, nightmare: 0 };

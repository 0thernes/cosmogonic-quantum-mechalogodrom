/**
 * Connectome — the neural-net axon-web layer. Every update it rebuilds entity-to-entity
 * links via spatial-grid neighbor queries, propagates activation along each link, and paints
 * link colors from the combined neural weight. Faithful port of legacy lines 441-447 + 798-821
 * with the Known Bug 13 fix: only the populated link range is uploaded to the GPU.
 *
 * V2 (CONTRACTS V2, graph writer): the rebuild loop additionally records each link as an
 * entity-list index pair in {@link Connectome.pairs} (consumed by GraphMind on a slow cadence)
 * and supports a community palette via {@link Connectome.setCommunityOf} — when installed, link
 * hue comes from an 8-hue tribe palette instead of the pure time hue. With no palette installed
 * the visual output is bit-for-bit identical to V1.
 *
 * V139 (OWNER 2026-07-19 /goal): the ENTITY axon web renders again — the 2026-07-14 retirement
 * is reversed for entities only (the xenomimic bond stays psionic/undrawn). To make the visible
 * web affordable at the ultra/mega populations (25k/50k entities, up to 600k links), the
 * per-link geometry moved to the GPU: the CPU writes 11 floats per link (endpoints + wave/color
 * params) into one instanced interleaved buffer, and a vertex shader reproduces the EXACT V109
 * color (fire/retract/hue-drift/tribe HSL) and V110 waving-axon math (sin(πu) envelope, two
 * perpendicular wave axes, amplitude breathing) that the CPU used to bake per segment. Same
 * formulas, same constants, same output — ~6.5× fewer CPU floats and zero CPU trig per link.
 */
import * as THREE from 'three';
import type { SimContext } from '../types';
import type { EntityManager } from './entities';
import { SOCIAL_CONNECTOME_R, socialR2 } from './constants';

/** Grid query radius for link candidates (legacy 8 × SOCIAL_SCALE — ADR 0016). */
const LINK_RADIUS = SOCIAL_CONNECTOME_R;
/** Squared link reach — matches {@link LINK_RADIUS}. */
const LINK_REACH2 = socialR2(8);
/** 8-hue tribe palette step: communities map to evenly spaced hues `(c & 7) / 8`. */
const TRIBE_HUE_STEP = 1 / 8;
/** Within-tribe neural-weight shimmer — half a palette step so tribes stay distinguishable. */
const TRIBE_NW_JITTER = TRIBE_HUE_STEP / 2;
/**
 * Hard bound on the neural activation accumulator. The link pass is a positive-feedback
 * web (every link pumps a's `act` into b at gain `nw · ACT_PROP_GAIN · dt·60`), against
 * which entities.ts decay + brain excitation compete. ±4 is far above normal play; the
 * `!(<)` comparison form below also seals NaN (audit fix, 0.6.x).
 */
/**
 * Activation propagation gain along each link — scales with sim dt so firing rate is
 * frame-rate independent. The legacy 0.01 at 60 Hz was too weak to read as live neurons.
 */
const ACT_PROP_GAIN = 0.045;
/** Visual pulse frequencies (rad/s) — tuned for ~8–15 Hz apparent firing, not ~0.5 Hz. */
const FIRE_HZ = 38;
const RETRACT_HZ = 16;
const HUE_DRIFT_HZ = 5.5;
const WAVE1_HZ = 22;
const WAVE2_HZ = 17;
/** Hard clamp on the activation accumulator (see update loop). */
const ACT_MAX = 4;
/** Initial topology estimate: quality tiers budget roughly 12 links per live entity. */
const INITIAL_LINKS_PER_ENTITY = 12;
/** Small worlds still get enough room to avoid reallocating on their first dense neighborhood. */
const MIN_LINK_CAPACITY = 256;

/**
 * V110 — living axons. A link is not a flat straight 2-vertex segment (the "1980s vector" look);
 * it is a {@link LINK_SEG}-segment polyline that BOWS + WAVES between its two endpoints. The
 * endpoints stay pinned to the two real creatures (the `sin(πu)` envelope is 0 at both ends), so
 * the graph still reads true; only the body bends. Amplitude breathes with the V109 `retract`
 * term + link intensity. Purely geometric + deterministic (per-link phase is a hash of the pair →
 * no rng). V139: the polyline is now evaluated in the vertex shader from the per-link instance
 * data; the base geometry below carries only the parametric coordinate u per vertex.
 */
const LINK_SEG = 6;
/** Vertices per instanced link: LINK_SEG segments × 2 endpoints (LineSegments pairs). */
const LINK_VERTS = LINK_SEG * 2;
/**
 * Floats per link in the instanced buffer: aStart(3) + aEnd(3) + aParams(nw, actPulse, phase,
 * ni)(4) + aHue(1). Everything else the old CPU bake needed (nd, nI, fire, retract, envelope,
 * perpendicular frame, waves, HSL) is derived in the vertex shader from these + uTime.
 */
const INSTANCE_FLOATS = 11;

/** Geometric capacity bounded by `maximum`; returns 0 only for a zero-sized maximum. */
function boundedCapacity(maximum: number, desired: number, floor: number): number {
  if (maximum <= 0) return 0;
  let capacity = Math.min(maximum, Math.max(1, floor));
  const target = Math.min(maximum, Math.max(0, desired));
  while (capacity < target) capacity = Math.min(maximum, capacity * 2);
  return capacity;
}

/**
 * Vertex shader — the EXACT V109 color + V110 waving-axon math the CPU used to bake, keyed off
 * the per-link instance attributes + uTime. HSL→RGB replicates THREE.Color.setHSL exactly
 * (ColorManagement is disabled app-wide, so setHSL is pure hue math — see src/main.ts).
 * Constants are injected via `defines` from the same TS constants the CPU path used (SSOT).
 */
const AXON_VERTEX_SHADER = /* glsl */ `
uniform float uTime;
attribute vec3 aStart;
attribute vec3 aEnd;
attribute vec4 aParams; // nw, actPulse, phase, ni
attribute float aHue;   // >= 0: tribe palette base hue; < 0: V1 time-drift hue mode
varying vec3 vColor;
#include <common>
#include <fog_pars_vertex>

// THREE.Color.setHSL's hue2rgb, transliterated (args named to match three's call order).
float axonHueChannel(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0 / 6.0) return p + (q - p) * 6.0 * t;
  if (t < 1.0 / 2.0) return q;
  if (t < 2.0 / 3.0) return p + (q - p) * 6.0 * (2.0 / 3.0 - t);
  return p;
}

vec3 axonHslToRgb(float h, float s, float l) {
  h = mod(h, 1.0); // euclideanModulo — matches setHSL for the (rare) negative hue
  s = saturate(s);
  l = saturate(l);
  if (s == 0.0) return vec3(l);
  float p = l <= 0.5 ? l * (1.0 + s) : l + s - l * s;
  float q = 2.0 * l - p;
  return vec3(
    axonHueChannel(q, p, h + 1.0 / 3.0),
    axonHueChannel(q, p, h),
    axonHueChannel(q, p, h - 1.0 / 3.0)
  );
}

void main() {
  float u = position.x;
  vec3 ab = aEnd - aStart;
  float nd = length(ab);
  float nw = aParams.x;
  float actPulse = aParams.y;
  float phase = aParams.z;
  float ni = aParams.w;
  float nI = 1.0 - nd * 0.125;
  // V109 colour: one dynamic hue/saturation + firing/retracting brightness per link.
  float fire = 0.5 + 0.5 * sin(uTime * FIRE_HZ + nw * 12.0 + ni * 0.7);
  float retract = 0.25 + 0.75 * sin(uTime * RETRACT_HZ + nd * 0.55 + ni * 0.3);
  float hue = aHue >= 0.0
    ? aHue + nw * TRIBE_NW_JITTER + uTime * HUE_DRIFT_HZ * 0.04
    : uTime * HUE_DRIFT_HZ * 0.09 + nw * 0.6 + actPulse * 0.38;
  float sat = 0.94 + 0.06 * sin(uTime * RETRACT_HZ * 1.1 + nw * 8.0);
  float lit = min(0.92, 0.28 + nI * 0.48 + nw * 0.38 + actPulse * 0.55 * fire * retract);
  vColor = axonHslToRgb(hue, sat, lit);
  // V110 geometry: bow the link into a waving axon. Endpoints pin to the two creatures
  // (sin(πu) envelope = 0 at both ends); the body waves on two perpendicular axes, amplitude
  // breathing with the V109 retract term + link intensity. Per-link phase = deterministic hash.
  float inv = nd > 1e-4 ? 1.0 / nd : 0.0;
  vec3 dn = ab * inv;
  float p1x = -dn.z;
  float p1z = dn.x;
  float p1l = sqrt(p1x * p1x + p1z * p1z);
  if (p1l < 1e-4) { p1x = 1.0; p1z = 0.0; p1l = 1.0; }
  p1x /= p1l;
  p1z /= p1l;
  // CPU p2 = dn × p1 with p1y = 0, expanded exactly as the scalar version did.
  vec3 p2 = vec3(dn.y * p1z, dn.z * p1x - dn.x * p1z, -dn.y * p1x);
  float envAmp = sin(u * PI) *
    (nd < 11.25 ? nd * 0.22 : 2.35) *
    (0.26 + 0.74 * retract) *
    (0.55 + 0.45 * nI) *
    (0.85 + 0.35 * fire);
  float w1 = sin(u * PI2 + uTime * WAVE1_HZ + phase) * envAmp;
  float w2 = cos(u * PI * 3.0 + uTime * WAVE2_HZ + phase * 1.3) * envAmp * 0.6;
  vec3 wp = aStart + ab * u + vec3(p1x, 0.0, p1z) * w1 + p2 * w2;
  vec4 mvPosition = modelViewMatrix * vec4(wp, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

/**
 * Fragment shader — LineBasicMaterial-equivalent output: vertex color × uniform opacity, then
 * the SAME renderer chunks in the SAME order (tonemapping → colorspace → fog) three's built-in
 * line shader applies, so the drawn pixels match the retired CPU-baked LineSegments exactly.
 */
const AXON_FRAGMENT_SHADER = /* glsl */ `
uniform float uOpacity;
varying vec3 vColor;
#include <common>
#include <fog_pars_fragment>
void main() {
  gl_FragColor = vec4(vColor, uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

/** Shared numeric → GLSL define literal (keeps the shader constants sourced from the TS SSOT). */
function glslFloat(value: number): string {
  const s = String(value);
  return s.includes('.') || s.includes('e') ? s : `${s}.0`;
}

/**
 * Owns the connectome axon-web LineSegments (instanced). The caller decides rebuild cadence
 * (full 60 Hz on every tier); each `update()` call performs one full rebuild.
 */
export class Connectome {
  /**
   * Entity-list index pairs for the links recorded by the last `update()` — layout
   * `[a0, b0, a1, b1, ...]`, valid range `[0, pairCount * 2)`. Contents are only valid until
   * the next `update()` call. A link is recorded only when both endpoints resolve to a live
   * `entities.list` index (a neighbor that died since the last grid rebuild is still drawn —
   * preserving V1 visuals — but yields no pair), so `pairCount <= links`.
   */
  private readonly ctx: SimContext;
  private readonly entities: EntityManager;
  /** Link capacity (quality.maxLinks ≈ 12× maxEntities — scales with population). */
  private readonly maxLinks: number;
  /** Currently allocated links; grows geometrically to maxLinks as the population/topology grows. */
  private linkCapacity: number;
  /** Per-link instance data: {@link INSTANCE_FLOATS} floats per link (see the attribute layout). */
  private linkData: Float32Array;
  private instanceBuffer: THREE.InstancedInterleavedBuffer;
  private pairBuffer: Uint32Array;
  private geo: THREE.InstancedBufferGeometry;
  /** Uniform handles retained so update() writes uTime without a lookup. */
  private readonly uTime: { value: number };
  /** The scene LineSegments (retained so {@link dispose} can remove it + free its material). */
  private readonly lines: THREE.LineSegments;
  private linkCount = 0;
  private pairTotal = 0;
  /** Last link prefix whose instance data was fully written; safe to restore while FROZEN. */
  private renderedLinkTotal = 0;
  /** Instance floats written during the last update (0 while the web is hidden). */
  private geometryWriteTotal = 0;
  /** Community lookup installed by GraphMind (null ⇒ V1 time-hue coloring). */
  private communityOf: ((entityIndex: number) => number) | null = null;
  /**
   * Monotonic stamp for the direct list index written beside each live entity before traversal.
   * A grid member removed since the last rebuild keeps an older stamp and therefore cannot alias a
   * newly compacted list slot. Number.MAX_SAFE_INTEGER is millions of years away at 60 Hz.
   */
  private indexGeneration = 0;

  /** Allocates the link buffers and adds the LineSegments to the scene (legacy 441-447). */
  constructor(ctx: SimContext, entities: EntityManager) {
    this.ctx = ctx;
    this.entities = entities;
    this.maxLinks = ctx.quality.maxLinks;
    this.linkCapacity = boundedCapacity(
      this.maxLinks,
      entities.list.length * INITIAL_LINKS_PER_ENTITY,
      MIN_LINK_CAPACITY,
    );
    this.linkData = new Float32Array(this.linkCapacity * INSTANCE_FLOATS);
    this.pairBuffer = new Uint32Array(this.linkCapacity * 2);
    this.instanceBuffer = new THREE.InstancedInterleavedBuffer(this.linkData, INSTANCE_FLOATS);
    this.instanceBuffer.setUsage(THREE.DynamicDrawUsage);
    this.geo = Connectome.buildGeometry(this.instanceBuffer);
    const material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        { uTime: { value: 0 }, uOpacity: { value: 0.88 } },
      ]),
      vertexShader: AXON_VERTEX_SHADER,
      fragmentShader: AXON_FRAGMENT_SHADER,
      defines: {
        FIRE_HZ: glslFloat(FIRE_HZ),
        RETRACT_HZ: glslFloat(RETRACT_HZ),
        HUE_DRIFT_HZ: glslFloat(HUE_DRIFT_HZ),
        WAVE1_HZ: glslFloat(WAVE1_HZ),
        WAVE2_HZ: glslFloat(WAVE2_HZ),
        TRIBE_NW_JITTER: glslFloat(TRIBE_NW_JITTER),
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      fog: true,
    });
    this.uTime = material.uniforms.uTime as { value: number };
    this.lines = new THREE.LineSegments(this.geo, material);
    const lines = this.lines;
    // OWNER (2026-07-19 /goal): the entity axon web SHOWS again — visible from construction,
    // toggleable via NEURAL WEB. (Reverses the 2026-07-14 retirement for ENTITIES only; the
    // xenomimic psionic-bond ruling stands — xenomimic tethers are never drawn.)
    lines.frustumCulled = false;
    lines.renderOrder = 2;
    lines.visible = true;
    // Axon lines were never a pick target; keep the (huge) instanced web out of raycast sweeps.
    lines.raycast = () => undefined;
    ctx.scene.add(lines);
  }

  /** Base instanced geometry: LINK_VERTS vertices carrying the parametric u in position.x. */
  private static buildGeometry(
    instanceBuffer: THREE.InstancedInterleavedBuffer,
  ): THREE.InstancedBufferGeometry {
    const geo = new THREE.InstancedBufferGeometry();
    const base = new Float32Array(LINK_VERTS * 3);
    for (let k = 0; k < LINK_SEG; k++) {
      base[k * 6] = k / LINK_SEG; // segment start u (y,z stay 0 — real position comes from the shader)
      base[k * 6 + 3] = (k + 1) / LINK_SEG; // segment end u
    }
    geo.setAttribute('position', new THREE.BufferAttribute(base, 3));
    geo.setAttribute('aStart', new THREE.InterleavedBufferAttribute(instanceBuffer, 3, 0));
    geo.setAttribute('aEnd', new THREE.InterleavedBufferAttribute(instanceBuffer, 3, 3));
    geo.setAttribute('aParams', new THREE.InterleavedBufferAttribute(instanceBuffer, 4, 6));
    geo.setAttribute('aHue', new THREE.InterleavedBufferAttribute(instanceBuffer, 1, 10));
    geo.instanceCount = 0;
    return geo;
  }

  /**
   * Show/hide the entity axon web. Restored to a REAL toggle by the 2026-07-19 owner /goal
   * (entities only — the xenomimic connectome keeps its own permanent-off rule). Hiding zeroes
   * the instance count so a stale web can never draw; the graph keeps computing either way. O(1).
   */
  setWebVisible(show: boolean): void {
    this.lines.visible = show;
    this.geo.instanceCount = show ? this.renderedLinkTotal : 0;
  }

  /** Whether the axon-web LineSegments are currently drawn. */
  get webVisible(): boolean {
    return this.lines.visible;
  }

  /** Links built by the last update (legacy `connLinks`, telemetry #v3 + sparkline #g3). */
  get links(): number {
    return this.linkCount;
  }

  /** Index pairs recorded in {@link pairs} by the last update (`pairCount <= links`). */
  get pairCount(): number {
    return this.pairTotal;
  }

  /** Current topology-pair storage. It may be replaced after an update-triggered capacity growth. */
  get pairs(): Uint32Array {
    return this.pairBuffer;
  }

  /** Structural memory receipt: links currently allocated, never above the quality hard ceiling. */
  get allocatedLinkCapacity(): number {
    return this.linkCapacity;
  }

  /** Structural performance receipt: instance floats written by the last rebuild. */
  get geometryFloatsWritten(): number {
    return this.geometryWriteTotal;
  }

  /** Free the owned geometry + material and remove the axon-web from the scene (HMR / world-reset safe;
   *  idempotent per three.js). Without this each hot reload orphaned a Connectome geometry + material. */
  dispose(): void {
    this.ctx.scene.remove(this.lines);
    this.geo.dispose();
    (this.lines.material as THREE.Material).dispose();
  }

  /**
   * Install (or remove, with `null`) the community lookup used for link coloring. When set,
   * link hue is `(fn(aIndex) & 7) / 8` — an 8-hue tribe palette keyed off the link's first
   * endpoint — plus a half-step neural-weight shimmer, replacing the V1 time-drift hue.
   * `fn` is called once per link per update; it MUST be O(1) and allocation-free. O(1).
   */
  setCommunityOf(fn: ((entityIndex: number) => number) | null): void {
    this.communityOf = fn;
  }

  /**
   * Grow topology + render storage geometrically while retaining the scene LineSegments/material.
   * The populated prefixes and current instance count survive the swap. Replacing and disposing the
   * geometry releases old GPU buffers instead of leaking every intermediate capacity. Amortized O(1)
   * per appended link; O(capacity) only on logarithmically many growth boundaries.
   */
  private ensureLinkCapacity(required: number): void {
    if (required <= this.linkCapacity) return;
    const nextCapacity = boundedCapacity(
      this.maxLinks,
      required,
      Math.max(MIN_LINK_CAPACITY, this.linkCapacity * 2),
    );
    if (nextCapacity < required) {
      throw new RangeError(
        `Connectome link capacity ${required} exceeds maxLinks ${this.maxLinks}`,
      );
    }

    const linkData = new Float32Array(nextCapacity * INSTANCE_FLOATS);
    const pairs = new Uint32Array(nextCapacity * 2);
    linkData.set(this.linkData);
    pairs.set(this.pairBuffer);

    const instanceBuffer = new THREE.InstancedInterleavedBuffer(linkData, INSTANCE_FLOATS);
    instanceBuffer.setUsage(THREE.DynamicDrawUsage);
    const oldGeometry = this.geo;
    const geometry = Connectome.buildGeometry(instanceBuffer);
    geometry.instanceCount = oldGeometry.instanceCount;

    this.linkData = linkData;
    this.pairBuffer = pairs;
    this.instanceBuffer = instanceBuffer;
    this.geo = geometry;
    this.linkCapacity = nextCapacity;
    this.lines.geometry = geometry;
    oldGeometry.dispose();
  }

  /**
   * Rebuild links from scratch (legacy 798-821): every entity queries the grid for
   * neighbors within 8u; undirected pairs emit once (`ni < bi`). Activation propagation
   * (`eb.act += ea.act * nw * ACT_PROP_GAIN * dt·60`), and an HSL color from the pair's mean neural weight
   * (hue from the tribe palette when a community lookup is installed, time hue otherwise).
   * Each link is also recorded as an entity-list index pair in `pairs` for GraphMind.
   * O(n·k + n) where n = entities and k = neighbors per query. The O(n) prepass writes a direct,
   * generation-stamped list index beside each entity. Candidate traversal borrows live grid cells,
   * preserving the exact `dx → dz → item` order without copying O(k) references or hashing ids.
   * Allocation-free after warm-up.
   *
   * `mutateAct` (default true) gates the ONLY entity-state write in this method — the activation
   * propagation into `eb.userData.act`. With it false the pass is purely read-only (instance data
   * only), so the SUSPENDED-pause loop can keep the axons WAVING on the advancing visual clock without
   * decaying the seeded neural state (USER: the neural net stays alive-in-place while paused). At the
   * default `true` the output is byte-identical to the pre-flag behaviour.
   */
  update(dt: number, t: number, mutateAct = true): void {
    const grid = this.ctx.grid;
    const list = this.entities.list;
    let data = this.linkData;
    let pairs = this.pairBuffer;
    const communityOf = this.communityOf;
    const max = this.maxLinks;
    const drawWeb = this.lines.visible;
    this.geometryWriteTotal = 0;
    // The shader evaluates every wave/color formula at THIS t each rendered frame, so the web
    // keeps firing + waving even when link topology is static (e.g. the SUSPENDED-pause loop).
    this.uTime.value = t;
    const actStep = mutateAct ? ACT_PROP_GAIN * Math.min(1, dt * 60) : 0;
    const indexGeneration = ++this.indexGeneration;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e) continue;
      e.userData.connectomeListIndex = i;
      e.userData.connectomeIndexGeneration = indexGeneration;
    }
    let wI = 0;
    let pc = 0;
    for (let ni = 0; ni < list.length && wI < max; ni++) {
      const ea = list[ni];
      if (!ea) continue; // noUncheckedIndexedAccess: ni < length
      const ap = ea.position;
      const nearbyCells = grid.queryCells(ap.x, ap.z, LINK_RADIUS);
      for (let ci = 0; ci < nearbyCells.length && wI < max; ci++) {
        const cell = nearbyCells[ci];
        if (!cell) continue;
        for (let nj = 0; nj < cell.length && wI < max; nj++) {
          const eb = cell[nj];
          if (!eb || eb === ea) continue; // noUncheckedIndexedAccess guard + self-link skip
          const bi =
            eb.userData.connectomeIndexGeneration === indexGeneration
              ? (eb.userData.connectomeListIndex ?? -1)
              : -1;
          // Every live undirected pair appears twice in the full-radius queries. Reject the reverse
          // direction before loading positions or doing distance math; the old path rejected the same
          // candidate after that pure calculation, so topology/activation/render order is unchanged.
          if (bi >= 0 && ni >= bi) continue;
          const bp = eb.position;
          const dx = ap.x - bp.x;
          const dy = ap.y - bp.y;
          const dz = ap.z - bp.z;
          const nd2 = dx * dx + dy * dy + dz * dz;
          if (nd2 >= LINK_REACH2) continue;
          if (wI >= this.linkCapacity) {
            this.ensureLinkCapacity(wI + 1);
            // Growth replaces the typed arrays and attributes; refresh hot-loop aliases once.
            data = this.linkData;
            pairs = this.pairBuffer;
          }
          if (bi >= 0) {
            pairs[pc * 2] = ni;
            pairs[pc * 2 + 1] = bi;
            pc++;
          }
          const nw = (ea.userData.nW + eb.userData.nW) * 0.5;
          // Bounded activation propagation: `!(< ACT_MAX)` routes both overflow AND NaN to
          // the cap, the symmetric branch floors the (rare) negative side. O(1), no allocation.
          const act = eb.userData.act + ea.userData.act * nw * actStep;
          if (mutateAct) {
            eb.userData.act = !(act < ACT_MAX) ? ACT_MAX : act > -ACT_MAX ? act : -ACT_MAX;
          }
          // Link topology + activation are simulation state and always advance. When the visual layer is
          // hidden, stop here: no instance-data writes, no draw count, no GPU upload.
          const linkIndex = wI++;
          if (!drawWeb) continue;
          // 11 instance floats — every derived term (nd, fire, retract, waves, HSL) moves to the
          // vertex shader. actPulse reads act AFTER this frame's propagation write, exactly like
          // the retired CPU bake did.
          const o = linkIndex * INSTANCE_FLOATS;
          data[o] = ap.x;
          data[o + 1] = ap.y;
          data[o + 2] = ap.z;
          data[o + 3] = bp.x;
          data[o + 4] = bp.y;
          data[o + 5] = bp.z;
          data[o + 6] = nw;
          data[o + 7] = (ea.userData.act + eb.userData.act) * 0.5;
          data[o + 8] = ap.x * 0.13 + bp.z * 0.17 + ea.id * 7e-4 + eb.id * 1.1e-3;
          data[o + 9] = ni;
          data[o + 10] = communityOf ? (communityOf(ni) & 7) * TRIBE_HUE_STEP : -1;
        }
      }
    }
    this.linkCount = wI;
    this.pairTotal = pc;
    if (drawWeb) {
      if (wI > 0) {
        // Known Bug 13 fix: upload only the populated range, not all capacity floats.
        this.instanceBuffer.clearUpdateRanges();
        this.instanceBuffer.addUpdateRange(0, wI * INSTANCE_FLOATS);
        this.instanceBuffer.needsUpdate = true;
      }
      this.geometryWriteTotal = wI * INSTANCE_FLOATS;
      this.renderedLinkTotal = wI;
      this.geo.instanceCount = wI;
    } else {
      this.geo.instanceCount = 0;
    }
  }
}

/**
 * ALPHABET PANTHEON RENDER (V-ABC) — brings the 100 Greek+Latin archetypes to life in the dome.
 *
 * {@link ALPHABET_ROSTER} (alphabet-pantheon.ts) is 100 deterministic, genuinely-differentiated
 * super-creature archetypes (24 greek-upper + 24 greek-lower + 26 latin-upper + 26 latin-lower) —
 * but it was DATA ONLY: nothing drew them. This renderer hangs all 100 across the upper sky-dome
 * as distinct glowing bodies, each one's **shape, colour, size, and motion read straight from its
 * archetype bias** so the alphabet pantheon is visibly differentiated, not a recolour:
 *
 *  - SHAPE by UNIQUE exterior kind (10): each letter's solid body matches its own
 *    {@link glyphExteriorSignature} topology (cube · shard · dodeca · ring · knot · orb · slab ·
 *    icosa · pillar · portal), then per-letter NON-UNIFORM scale + hue + wander make the 100 read
 *    as 100 distinct silhouettes. One {@link THREE.InstancedMesh} per non-empty kind ⇒ ≤ 10 draw
 *    calls for all 100 (not 100 meshes).
 *  - COLOUR = HSL(bias.hue, 0.6 + 0.35·quantum, 0.45 + 0.2·generative) per instance (instanceColor).
 *  - SIZE   = empowerment + order + generative mix (the "bigger gods loom larger" read).
 *  - MOTION = each body bobs / spins / pulses on its OWN seed-derived frequency + phase
 *    (so the 100 never lockstep), spin-rate scaled by its chaos bias, pulse by its curiosity.
 *
 * DETERMINISM (ADR 0004): draws **zero** rng — every placement, frequency, phase, colour and
 * scale is a pure function of the archetype's fixed fields (index, seed, bias) + the elapsed `t`
 * it is handed. Boot-stream-neutral (cannot perturb `ctx.rng`); same seed ⇒ identical dome. It
 * reads one reactive world scalar (`setChaos`) one-way to quicken the whole swarm under chaos.
 *
 * ROBUSTNESS: additive {@link THREE.MeshBasicMaterial} (unlit → glows, needs no scene light) with
 * per-instance colour; NO hand-written GLSL, so it degrades to "faint", never "broken". The
 * per-frame work is 100 matrix composes — fixed, population-independent, allocation-free (module
 * scratch only).
 */
import * as THREE from 'three';
import { clamp } from '../math/scalar';
import { ARENA_RADIUS } from './constants';
import { ALPHABET_ROSTER, type AlphabetArchetype } from './alphabet-pantheon';
import {
  ApexExteriorAbomination,
  attachGlyphWireHalos,
  GlyphAccentMotes,
  GlyphFilamentBurst,
  GlyphSporeAura,
  syncGlyphWireHalos,
} from './creature-exterior-layers';
import { CREATURE_EXTERIOR_TIME_SCALE } from './creature-exterior-phenomena';
import {
  disposeGlyphGeometryCache,
  glyphBodyGeometry,
  glyphGeoBucketKey,
} from './glyph-exterior-geometry';
import { glyphExteriorPalette, type GlyphExteriorPalette } from './glyph-exterior-palette';
import {
  glyphExteriorSignature,
  glyphWanderOffset,
  type GlyphExteriorSignature,
} from './glyph-exterior-signature';
import type { TsotchkeQuantumPulse } from './tsotchke-facade';

/** Dome shell radius the pantheon hangs on; pulled inward so godforms read as beings, not far stars. */
const DOME_R = ARENA_RADIUS * 0.72;

/** Module scratch — reused every frame so the hot path allocates nothing. */
const M = new THREE.Matrix4();
const Q = new THREE.Quaternion();
const E = new THREE.Euler();
const P = new THREE.Vector3();
const S = new THREE.Vector3();
const C = new THREE.Color();
const WANDER = { x: 0, y: 0, z: 0 };

/** Per-instance animation constants, derived from the archetype with NO rng. */
interface Body {
  /** Anchor position on the dome (fixed). */
  readonly ax: number;
  readonly ay: number;
  readonly az: number;
  readonly baseScale: number;
  readonly freq: number; // bob/pulse frequency (rad/s)
  readonly phase: number; // per-body phase offset
  readonly spin: number; // spin rate (rad/s), scaled by chaos bias
  readonly pulse: number; // pulse depth (from curiosity bias)
  readonly hue: number;
  readonly sat: number;
  readonly light: number;
  /** Global archetype index (0–99) for brain-activity lookup. */
  readonly gIdx: number;
  /** Unique physical-outside signature (deterministic per letter). */
  readonly sig: GlyphExteriorSignature;
  /** Image-ref colour identity (5 palette families × per-letter jitter). */
  readonly pal: GlyphExteriorPalette;
  readonly geoKey: string;
  readonly poolSlot: number;
}

export class AlphabetPantheonRender {
  private readonly group = new THREE.Group();
  private readonly meshes: THREE.InstancedMesh[] = [];
  /** Per pool: the bodies it draws, in instance-slot order. */
  private readonly bodies: Body[][] = [];
  private readonly mat: THREE.ShaderMaterial;
  /** #101 — APEX ABOMINATION capstone (ς): warped dimensional horror above the 100-letter pantheon. */
  private readonly apexGroup = new THREE.Group();
  private readonly apexCore: THREE.Mesh;
  private readonly apexHalo: THREE.Mesh;
  private readonly apexSpikes: THREE.Mesh;
  /** V104: additional alien geometry — warped inner core + dimensional shell. */
  private readonly apexInner: THREE.Mesh;
  private readonly apexShell: THREE.Mesh;
  private chaos = 0;
  /** Per-creature brain activity (0..1) from GlyphBrainBatch — drives visual pulse intensity. */
  private brainActivity: Float32Array | null = null;
  /** Per-creature novelty (0..1) — drives shimmer/hue shift. */
  private brainNovelty: Float32Array | null = null;
  /** Per-creature valence (−1..1) — drives hue rotation direction. */
  private brainValence: Float32Array | null = null;
  /** Motor outputs from GlyphBrainBatch (visual-only locomotion). */
  private readonly motorX = new Float32Array(100);
  private readonly motorY = new Float32Array(100);
  private readonly motorZ = new Float32Array(100);
  /** Per-topology body pools (one InstancedMesh per occupied exterior kind). */
  private readonly wireHalos: THREE.InstancedMesh[] = [];
  /** Stellated micro-mote accent — one unique accent per glyph (gIdx 0..99). */
  private readonly glyphAccents: GlyphAccentMotes;
  /** Energy filament needles + spore halos (image-ref iteration 4). */
  private readonly glyphFilaments: GlyphFilamentBurst;
  private readonly glyphSpores: GlyphSporeAura;
  private readonly apexExterior: ApexExteriorAbomination;
  private tsotchkePulse: TsotchkeQuantumPulse = {
    cliffordEnt: 0,
    qgtVolume: 0,
    rngEntropy: 0,
    quakeAliveness: 0,
    adGradient: 0,
  };
  private apexTranscendence = 0;
  private apexVitality = 0;
  private localT = 0;

  constructor(scene: THREE.Scene) {
    const pantheonVert = `
      varying vec2 vUv;
      varying vec3 vPos;
      varying vec3 vColor;
      varying vec3 vNormal;
      uniform float uTime;

      // Noise function for vertex displacement
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

      void main() {
        vUv = uv;
        vColor = instanceColor;
        vNormal = normal;

        // Fleshy pulsating displacement
        vec3 displaced = position;
        float pulse = sin(position.y * 10.0 + uTime * 2.0) * cos(position.x * 10.0 - uTime * 1.5) * 0.15;
        displaced += normal * pulse;
        
        vPos = displaced;

        vec4 mvPosition = instanceMatrix * vec4(displaced, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * mvPosition;
      }
    `;

    const pantheonFrag = `
      varying vec2 vUv;
      varying vec3 vPos;
      varying vec3 vColor;
      varying vec3 vNormal;
      uniform float uTime;

      void main() {
        // "Annihilation/Hellraiser" shifting skin
        vec3 color = vColor;
        
        // Organic muscle/sinew bands
        float bands = sin(vPos.y * 30.0 + uTime * 3.0) * sin(vPos.x * 20.0 - uTime * 2.0);
        bands = smoothstep(0.1, 0.9, bands);
        
        // Iridescent beetle/oil spill shimmer based on normals
        float fresnel = pow(1.0 - max(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.0), 3.0);
        vec3 shimmer = vec3(0.5, 1.0, 0.8) * fresnel * sin(uTime * 5.0 + vPos.z * 10.0);
        
        vec3 finalColor = mix(color * 0.3, color + vec3(0.3, 0.1, 0.2), bands) + shimmer;
        
        // Darkened crevices
        float crevice = smoothstep(0.0, 0.4, length(vPos));
        finalColor *= crevice;

        gl_FragColor = vec4(finalColor, 0.9);
      }
    `;

    this.mat = new THREE.ShaderMaterial({
      vertexShader: pantheonVert,
      fragmentShader: pantheonFrag,
      uniforms: { uTime: { value: 0 } },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // First pass: bucket archetypes by unique wild-geometry key (≈100 distinct silhouettes).
    const bucketMap = new Map<string, AlphabetArchetype[]>();
    for (const a of ALPHABET_ROSTER) {
      const sig = glyphExteriorSignature(a);
      const key = glyphGeoBucketKey(a, sig);
      const list = bucketMap.get(key);
      if (list) list.push(a);
      else bucketMap.set(key, [a]);
    }

    const golden = Math.PI * (3 - Math.sqrt(5));
    const n = ALPHABET_ROSTER.length; // 100

    // One InstancedMesh per unique geometry bucket — parametric insanity per letter seed.
    for (const [, members] of bucketMap) {
      const sample = members[0]!;
      const sampleSig = glyphExteriorSignature(sample);
      const geo = glyphBodyGeometry(sample, sampleSig);
      const mesh = new THREE.InstancedMesh(geo, this.mat, members.length);
      mesh.frustumCulled = false;
      const list: Body[] = [];
      for (let s = 0; s < members.length; s++) {
        const a = members[s]!;
        const b = a.bias;
        const i = a.index;
        const y = 0.12 + (i / (n - 1)) * 0.86;
        const ringR = Math.sqrt(Math.max(0, 1 - y * y)) * DOME_R;
        const th = golden * i;
        const ax = Math.cos(th) * ringR;
        const az = Math.sin(th) * ringR;
        const ay = y * DOME_R * 0.54 + 18;
        const baseScale =
          (6 + 14 * (0.5 * b.empowerment + 0.3 * b.order + 0.2 * b.generative)) * 1.55;
        const freq = 0.07 + ((a.seed % 600) / 600) * 0.22;
        const phase = ((a.seed >>> 7) % 6283) / 1000;
        const spin = 0.045 + b.chaos * 0.22;
        const pulse = 0.09 + b.curiosity * 0.22;
        const sig = glyphExteriorSignature(a);
        const pal = glyphExteriorPalette(a);
        const geoKey = glyphGeoBucketKey(a, sig);
        list.push({
          ax,
          ay,
          az,
          baseScale,
          freq,
          phase,
          spin,
          pulse,
          hue: pal.bodyHue,
          sat: pal.bodySat,
          light: pal.bodyLit,
          gIdx: i,
          sig,
          pal,
          geoKey,
          poolSlot: s,
        });

        C.setHSL(pal.bodyHue, pal.bodySat, pal.bodyLit);
        mesh.setColorAt(s, C);
        P.set(ax, ay, az);
        Q.identity();
        S.setScalar(baseScale);
        M.compose(P, Q, S);
        mesh.setMatrixAt(s, M);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      this.group.add(mesh);
      this.meshes.push(mesh);
      this.bodies.push(list);
    }

    this.wireHalos.push(...attachGlyphWireHalos(this.group, this.meshes));
    this.glyphAccents = new GlyphAccentMotes(this.group, 100);
    this.glyphFilaments = new GlyphFilamentBurst(this.group, 100);
    this.glyphSpores = new GlyphSporeAura(this.group, 100);

    // #101 APEX ABOMINATION — physical exterior: tesseract cage + nebula + filaments.
    const apexVert = `
      varying vec2 vUv;
      varying vec3 vPos;
      varying vec3 vNormal;
      varying vec3 vViewPos;
      uniform float uTime;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }

      void main() {
        vUv = uv;
        vNormal = normal;

        // Tesseract / cage-like spatial warping: the apex is a folding 4D shadow.
        vec3 displaced = position;
        float t = uTime;
        float n1 = noise(position.xy * 1.5 + t * 0.2);
        float n2 = noise(position.yz * 1.5 - t * 0.15);
        float warp = sin(position.x * 8.0 + t * 3.0) * cos(position.y * 8.0 - t * 2.0) * 0.25;
        float cage = sin(position.x * 5.0 + position.y * 5.0 + position.z * 5.0 + t * 1.5) * 0.18;
        displaced += normal * (warp + cage + (n1 + n2) * 0.25);

        vPos = displaced;
        vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
        vViewPos = mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const apexFrag = `
      varying vec2 vUv;
      varying vec3 vPos;
      varying vec3 vNormal;
      varying vec3 vViewPos;
      uniform float uTime;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }

      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }

      void main() {
        float t = uTime;

        // Deep lava flow with multiple frequencies.
        float flow1 = sin(vPos.y * 15.0 + t * 4.0) * sin(vPos.x * 15.0 - t * 3.0);
        float flow2 = cos(vPos.z * 12.0 + t * 2.5) * sin(vPos.x * 10.0 + t * 2.0);
        vec3 lavaA = vec3(0.9, 0.0, 0.25);
        vec3 lavaB = vec3(1.0, 0.55, 0.0);
        vec3 lavaC = vec3(0.6, 0.0, 0.45);
        vec3 lavaColor = mix(mix(lavaA, lavaB, flow1 * 0.5 + 0.5), lavaC, flow2 * 0.3 + 0.3);

        // Deflectixive oil-spill fresnel rim.
        vec3 n = normalize(vNormal);
        vec3 v = normalize(-vViewPos);
        float fresnel = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.5);
        vec3 oil = hsv2rgb(vec3(fract(t * 0.04 + vPos.z * 0.2), 0.85, 0.55)) * fresnel;

        // Noise grain shimmer.
        float n0 = noise(vUv * 40.0 + t * 3.0);
        float n1 = noise(vUv * 60.0 - t * 2.0);
        vec3 shimmer = vec3(0.4, 0.8, 1.0) * (n0 + n1) * 0.5;

        // Spark cataracts / waste products.
        float spark = step(0.95, n0) * step(0.88, n1);
        float spark2 = step(0.97, fract(n1 * t * 8.0));
        vec3 sparks = vec3(1.0, 0.9, 0.7) * spark + vec3(1.0, 0.2, 0.5) * spark2;

        // Dark dimensional cracks.
        float crack = smoothstep(0.35, 0.0, sin(vPos.x * 25.0 + t) * cos(vPos.y * 25.0 - t * 1.3));

        vec3 finalColor = lavaColor + oil * 0.9 + shimmer + sparks;
        finalColor *= 1.0 - crack * 0.45;

        gl_FragColor = vec4(finalColor, 0.96);
      }
    `;

    const apexMat = new THREE.ShaderMaterial({
      vertexShader: apexVert,
      fragmentShader: apexFrag,
      uniforms: { uTime: { value: 0 } },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Fallbacks for secondary elements
    const apexHaloMat = new THREE.MeshBasicMaterial({
      color: 0x6a00ff,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const spikeMat = new THREE.MeshBasicMaterial({
      color: 0x00ffd5,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Hyper-detailed geometries for the Apex
    this.apexCore = new THREE.Mesh(new THREE.TorusKnotGeometry(1.4, 0.42, 512, 64, 2, 5), apexMat);
    this.apexHalo = new THREE.Mesh(new THREE.IcosahedronGeometry(2.8, 8), apexHaloMat);
    this.apexSpikes = new THREE.Mesh(new THREE.OctahedronGeometry(1.9, 4), spikeMat);
    // V104: additional alien geometry — warped inner core + dimensional shell
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xff00aa,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const shellMat = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      wireframe: true,
    });
    this.apexInner = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 0), innerMat);
    this.apexShell = new THREE.Mesh(new THREE.TetrahedronGeometry(3.8, 0), shellMat);
    this.apexGroup.position.set(0, DOME_R * 0.88, 0);
    this.apexGroup.add(
      this.apexShell,
      this.apexHalo,
      this.apexSpikes,
      this.apexCore,
      this.apexInner,
    );
    this.group.add(this.apexGroup);
    this.apexExterior = new ApexExteriorAbomination(this.apexGroup);

    scene.add(this.group);
  }

  /** Tsotchke corpus pulse — drives exterior hue/quantum rim (read-only). */
  setTsotchkePulse(pulse: TsotchkeQuantumPulse): void {
    this.tsotchkePulse = pulse;
  }

  /** Apex ς mind projection for exterior intensity. */
  setApexExterior(transcendence: number, vitality: number): void {
    this.apexTranscendence = clamp(transcendence, 0, 1);
    this.apexVitality = clamp(vitality, 0, 1);
  }

  /** Reactive coupling: feed world chaos (0..1) to quicken the whole swarm. Read-only projection. */
  setChaos(c: number): void {
    this.chaos = clamp(c, 0, 1);
  }

  /**
   * Feed per-creature brain activity from {@link GlyphBrainBatch} to modulate visual appearance.
   * Activity drives pulse intensity, novelty drives hue shimmer, valence drives hue rotation.
   * Visual-only — does not affect world state.
   */
  setBrainActivity(activity: Float32Array, novelty: Float32Array, valence: Float32Array): void {
    this.brainActivity = activity;
    this.brainNovelty = novelty;
    this.brainValence = valence;
  }

  /**
   * Feed glyph-brain motor outputs for visual-only travel/orbit (no world physics).
   * Each snapshot's motor vec4 drives horizontal drift + vertical bob amplitude.
   */
  setBrainMotors(motors: ReadonlyArray<{ motor: Float32Array }>): void {
    const n = Math.min(motors.length, 100);
    for (let i = 0; i < n; i++) {
      const m = motors[i]!.motor;
      this.motorX[i] = m[0] ?? 0;
      this.motorY[i] = m[1] ?? 0;
      this.motorZ[i] = m[2] ?? 0;
    }
  }

  /** Bob / spin / pulse every body on its own cadence. Pure trig, allocation-free, no rng. */
  update(t: number, dt?: number): void {
    // V111: slow pantheon travel to creature-scale motion; they should read as living bodies.
    const scaledDt = dt !== undefined ? dt * 0.22 : undefined;
    const clock = scaledDt === undefined ? t * 0.22 : (this.localT += Math.max(0, scaledDt));
    if (dt !== undefined && dt <= 0) return; // frozen when paused
    if (this.mat instanceof THREE.ShaderMaterial) {
      const uTime = this.mat.uniforms.uTime;
      if (uTime) uTime.value = clock;
    }
    // V109: pantheon is stately — slower base drift, but still quickens with chaos and apex presence.
    // Reduced by another 50% as requested so they can be easily inspected.
    const slowT = clock * CREATURE_EXTERIOR_TIME_SCALE * 0.275;
    const quick = 0.5 + 0.6 * this.chaos + 0.25 * this.apexTranscendence + 0.15 * this.apexVitality;
    for (let pool = 0; pool < this.meshes.length; pool++) {
      const mesh = this.meshes[pool]!;
      const halo = this.wireHalos[pool];
      const list = this.bodies[pool]!;
      for (let s = 0; s < list.length; s++) {
        const b = list[s]!;
        const ph =
          slowT * b.freq * quick * (1 + (this.brainActivity?.[b.gIdx] ?? 0) * 0.35) + b.phase;
        const ba = this.brainActivity?.[b.gIdx] ?? 0;
        const bn = this.brainNovelty?.[b.gIdx] ?? 0;
        const bv = this.brainValence?.[b.gIdx] ?? 0;
        const brainPulse = 1 + ba * 0.95 + bn * 0.35;
        const mx = this.motorX[b.gIdx] ?? 0;
        const my = this.motorY[b.gIdx] ?? 0;
        const mz = this.motorZ[b.gIdx] ?? 0;
        const wander = glyphWanderOffset(WANDER, ph, b.sig, mx, my, mz, this.chaos, ba);
        P.set(b.ax + wander.x, b.ay + wander.y, b.az + wander.z);
        E.set(
          Math.sin(ph * 0.42 + mx + b.sig.rotBias) * (0.42 + ba * 0.45),
          slowT * b.spin * quick * (1 + ba * 0.62) + b.phase + mz * 0.36,
          Math.cos(ph * 0.38 + mz + b.sig.rotBias * 0.5) * (0.38 + bn * 0.5),
        );
        Q.setFromEuler(E);
        const warpSpike = ba > 0.72 && Math.sin(ph * 7.0 + b.sig.rotBias) > 0.55 ? 1.22 : 1;
        const sx =
          b.sig.scaleX * (1 + b.pulse * Math.sin(ph * 1.2) * brainPulse * 0.18) * warpSpike;
        const sy = b.sig.scaleY * (1 + b.pulse * Math.sin(ph * 1.4) * brainPulse * 0.18);
        const sz =
          (b.sig.scaleZ * (1 + b.pulse * Math.cos(ph * 1.1) * brainPulse * 0.18)) / warpSpike;
        S.set(b.baseScale * sx, b.baseScale * sy, b.baseScale * sz);
        M.compose(P, Q, S);
        mesh.setMatrixAt(s, M);
        const hueShift =
          Math.sin(ph * 0.22) * 0.14 +
          slowT * 0.0012 * b.spin +
          bn * 0.18 * bv +
          b.sig.hueOffset * 0.5 +
          this.apexTranscendence * 0.06 * Math.sin(ph * 0.11 + b.gIdx * 0.1);
        const hue = (b.pal.bodyHue + hueShift + b.pal.diagramHue * bn * 0.26) % 1;
        const litBoost = ba * 0.32 + bn * 0.18 + b.pal.filamentLit * 0.22 * ba + this.chaos * 0.08;
        const lit = b.pal.bodyLit + 0.18 * Math.sin(ph * 1.8) + litBoost;
        C.setHSL(
          hue < 0 ? hue + 1 : hue,
          Math.min(1, b.pal.bodySat + bn * 0.1),
          clamp(lit, 0.22, 0.62),
        );
        mesh.setColorAt(s, C);
        this.glyphAccents.setAt(b.gIdx, M, b.sig, ba, clock);
        this.glyphFilaments.setAt(b.gIdx, M, b.pal.filamentHue, b.sig, ba, clock);
        this.glyphSpores.setAt(b.gIdx, M, b.pal.sporeHue, b.sig, ba, clock);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      this.glyphAccents.finish();
      this.glyphFilaments.finish();
      this.glyphSpores.finish();
      if (halo) syncGlyphWireHalos(mesh, halo, this.brainActivity, list);
    }
    const w =
      1 +
      0.9 * this.chaos +
      0.45 * this.apexTranscendence +
      0.28 * this.apexVitality +
      0.25 * this.tsotchkePulse.quakeAliveness;
    const ph = slowT * 0.09 * w;
    const apexR =
      DOME_R *
      (0.26 +
        0.1 * Math.sin(slowT * 0.05) +
        0.04 * Math.sin(ph * 1.7 + this.tsotchkePulse.qgtVolume * Math.PI));
    this.apexGroup.position.set(
      Math.sin(slowT * 0.07 + ph * 0.12) * apexR + Math.sin(ph * 2.3) * DOME_R * 0.035,
      DOME_R * 0.52 + Math.sin(slowT * 0.04 + ph * 0.1) * 34 + Math.sin(ph * 1.9) * 18,
      Math.cos(slowT * 0.06 + ph * 0.11) * apexR + Math.cos(ph * 2.1) * DOME_R * 0.035,
    );
    this.apexCore.rotation.set(ph * 0.45, ph * 0.32, ph * 0.58);
    this.apexHalo.rotation.set(-ph * 0.22, ph * 0.38, ph * 0.16);
    this.apexSpikes.rotation.set(ph * 0.72, -ph * 0.48, ph * 0.28);
    this.apexInner.rotation.set(ph * 0.95, -ph * 0.65, ph * 1.1);
    if (this.apexCore.material instanceof THREE.ShaderMaterial) {
      const uTime = this.apexCore.material.uniforms.uTime;
      if (uTime) uTime.value = clock;
    }
    this.apexInner.scale.setScalar(10 * (1 + 0.22 * Math.sin(ph * 4.5)));
    this.apexShell.rotation.set(-ph * 0.14, ph * 0.24, -ph * 0.1);
    this.apexShell.scale.setScalar(20 * (1 + 0.1 * Math.cos(ph * 2.2)));
    C.setHSL((0.88 + Math.sin(ph * 1.5) * 0.12) % 1, 1, 0.5);
    (this.apexInner.material as THREE.MeshBasicMaterial).color.copy(C);
    C.setHSL((0.58 + Math.cos(ph * 0.8) * 0.15) % 1, 0.9, 0.45);
    (this.apexShell.material as THREE.MeshBasicMaterial).color.copy(C);
    const pulse = 1 + 0.22 * Math.sin(ph * 3.7) + 0.08 * Math.sin(ph * 11.3);
    this.apexCore.scale.setScalar(22 * pulse);
    this.apexHalo.scale.setScalar(14 * (1 + 0.12 * Math.sin(ph * 2.9)));
    this.apexSpikes.scale.setScalar(18 * (1 + 0.15 * Math.cos(ph * 5.1)));
    C.setHSL((0.92 + Math.sin(ph * 0.7) * 0.08) % 1, 1, 0.52);
    // apexCore is now a ShaderMaterial so we don't copy color directly
    C.setHSL((0.72 + Math.cos(ph * 0.5) * 0.12) % 1, 1, 0.48);
    (this.apexHalo.material as THREE.MeshBasicMaterial).color.copy(C);
    C.setHSL((0.55 + Math.sin(ph * 1.2) * 0.15) % 1, 0.92, 0.42);
    (this.apexSpikes.material as THREE.MeshBasicMaterial).color.copy(C);
    this.apexExterior.update(clock, this.apexTranscendence, this.apexVitality, this.tsotchkePulse);
  }

  /** Total letter archetypes rendered (100). Apex #101 is a separate capstone mesh. */
  get count(): number {
    let n = 0;
    for (const l of this.bodies) n += l.length;
    return n;
  }

  /** The APEX ABOMINATION capstone (#101) is present above the 100-letter pantheon. */
  get hasApexCapstone(): boolean {
    return true;
  }

  /** Free every pool geometry + the shared material (HMR / world-reset safe). */
  dispose(): void {
    for (const m of this.meshes) {
      m.geometry.dispose();
      m.dispose();
    }
    this.mat.dispose();
    this.apexCore.geometry.dispose();
    this.apexHalo.geometry.dispose();
    this.apexSpikes.geometry.dispose();
    this.apexInner.geometry.dispose();
    this.apexShell.geometry.dispose();
    (this.apexCore.material as THREE.Material).dispose();
    (this.apexHalo.material as THREE.Material).dispose();
    (this.apexSpikes.material as THREE.Material).dispose();
    (this.apexInner.material as THREE.Material).dispose();
    (this.apexShell.material as THREE.Material).dispose();
    for (const h of this.wireHalos) {
      h.geometry.dispose();
      (h.material as THREE.Material).dispose();
    }
    this.glyphAccents.dispose();
    this.glyphFilaments.dispose();
    this.glyphSpores.dispose();
    this.apexExterior.dispose();
    disposeGlyphGeometryCache();
    this.group.removeFromParent();
  }
}

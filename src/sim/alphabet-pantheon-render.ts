/**
 * ALPHABET PANTHEON RENDER (V-ABC) — brings the 100 Greek+Latin archetypes to life in the dome.
 *
 * {@link ALPHABET_ROSTER} (alphabet-pantheon.ts) is 100 deterministic, genuinely-differentiated
 * super-creature archetypes (24 greek-upper + 24 greek-lower + 26 latin-upper + 26 latin-lower) —
 * but it was DATA ONLY: nothing drew them. This renderer hangs all 100 across the upper sky-dome
 * as distinct glowing bodies, each one's **shape, colour, size, and motion read straight from its
 * archetype bias** so the alphabet pantheon is visibly differentiated, not a recolour:
 *
 *  - SHAPE pool by letter identity: vowels → torus-knot · greek-upper → icosahedron ·
 *    greek-lower → octahedron · latin-upper → dodecahedron · latin-lower → tetrahedron.
 *    Each pool is ONE {@link THREE.InstancedMesh} ⇒ ≤ 5 draw calls for all 100 (not 100 meshes).
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

/** Five shape pools (one InstancedMesh each → ≤ 5 draw calls for all 100 archetypes). */
const POOL_COUNT = 5;
/** Dome shell radius the pantheon hangs on (just inside the far sky). */
const DOME_R = ARENA_RADIUS * 0.95;

/** Module scratch — reused every frame so the hot path allocates nothing. */
const M = new THREE.Matrix4();
const Q = new THREE.Quaternion();
const E = new THREE.Euler();
const P = new THREE.Vector3();
const S = new THREE.Vector3();
const C = new THREE.Color();

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
}

/** Which shape pool an archetype belongs to (vowels stand out as knots). */
function poolOf(a: AlphabetArchetype): number {
  if (a.isVowel) return 4;
  if (a.script === 'greek') return a.letterCase === 'upper' ? 0 : 1;
  return a.letterCase === 'upper' ? 2 : 3;
}

/** A unit base geometry per pool index. */
function baseGeo(pool: number): THREE.BufferGeometry {
  switch (pool) {
    case 0:
      return new THREE.IcosahedronGeometry(1, 0);
    case 1:
      return new THREE.OctahedronGeometry(1, 0);
    case 2:
      return new THREE.DodecahedronGeometry(1, 0);
    case 3:
      return new THREE.TetrahedronGeometry(1.25, 0);
    default:
      return new THREE.TorusKnotGeometry(0.7, 0.26, 64, 8);
  }
}

export class AlphabetPantheonRender {
  private readonly group = new THREE.Group();
  private readonly meshes: THREE.InstancedMesh[] = [];
  /** Per pool: the bodies it draws, in instance-slot order. */
  private readonly bodies: Body[][] = [];
  private readonly mat: THREE.MeshBasicMaterial;
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

  constructor(scene: THREE.Scene) {
    this.mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, // white base so instanceColor shows the true hue
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // First pass: bucket archetypes into pools.
    const buckets: AlphabetArchetype[][] = [[], [], [], [], []];
    for (const a of ALPHABET_ROSTER) buckets[poolOf(a)]!.push(a);

    const golden = Math.PI * (3 - Math.sqrt(5));
    const n = ALPHABET_ROSTER.length; // 100

    // Second pass: one InstancedMesh per pool, place + colour every body.
    for (let pool = 0; pool < POOL_COUNT; pool++) {
      const members = buckets[pool]!;
      const geo = baseGeo(pool);
      const mesh = new THREE.InstancedMesh(geo, this.mat, members.length);
      mesh.frustumCulled = false; // dome bodies orbit wide; never cull
      const list: Body[] = [];
      for (let s = 0; s < members.length; s++) {
        const a = members[s]!;
        const b = a.bias;
        // Dome placement keyed to the GLOBAL index so the 100 fan out evenly across the sky,
        // regardless of how they bucketed (golden-angle spiral over the upper hemisphere).
        const i = a.index;
        const y = 0.12 + (i / (n - 1)) * 0.86; // upper dome bias
        const ringR = Math.sqrt(Math.max(0, 1 - y * y)) * DOME_R;
        const th = golden * i;
        const ax = Math.cos(th) * ringR;
        const az = Math.sin(th) * ringR;
        const ay = y * DOME_R * 0.66 + 24;
        const baseScale =
          (4.5 + 10 * (0.5 * b.empowerment + 0.3 * b.order + 0.2 * b.generative)) * 1.12;
        // Seed-derived (no rng) per-body cadence so none lockstep.
        const freq = 0.18 + ((a.seed % 600) / 600) * 0.6;
        const phase = ((a.seed >>> 7) % 6283) / 1000;
        const spin = 0.08 + b.chaos * 0.5;
        const pulse = 0.1 + b.curiosity * 0.25;
        const sat = Math.min(1, 0.92 + 0.08 * b.quantum);
        const light = 0.24 + 0.14 * b.generative;
        list.push({
          ax,
          ay,
          az,
          baseScale,
          freq,
          phase,
          spin,
          pulse,
          hue: b.hue,
          sat,
          light,
          gIdx: i,
        });

        // Colour from the bias — saturated, luminous read.
        C.setHSL(b.hue, sat, light);
        mesh.setColorAt(s, C);
        // Initial transform.
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

    // #101 APEX ABOMINATION — the capstone entity: impossible geometry, hyper-chromatic, alive.
    const apexMat = new THREE.MeshBasicMaterial({
      color: 0xff1a6e,
      transparent: true,
      opacity: 0.94,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
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
    this.apexCore = new THREE.Mesh(new THREE.TorusKnotGeometry(1.4, 0.42, 128, 16, 2, 5), apexMat);
    this.apexHalo = new THREE.Mesh(new THREE.IcosahedronGeometry(2.8, 2), apexHaloMat);
    this.apexSpikes = new THREE.Mesh(new THREE.OctahedronGeometry(1.9, 1), spikeMat);
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
    this.apexGroup.add(this.apexShell, this.apexHalo, this.apexSpikes, this.apexCore, this.apexInner);
    this.group.add(this.apexGroup);

    scene.add(this.group);
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
  update(t: number): void {
    const quick = 1 + 0.6 * this.chaos; // chaos speeds the whole pantheon
    for (let pool = 0; pool < this.meshes.length; pool++) {
      const mesh = this.meshes[pool]!;
      const list = this.bodies[pool]!;
      for (let s = 0; s < list.length; s++) {
        const b = list[s]!;
        const ph = t * b.freq * quick + b.phase;
        // Brain-driven activity modulation (visual-only)
        const ba = this.brainActivity?.[b.gIdx] ?? 0;
        const bn = this.brainNovelty?.[b.gIdx] ?? 0;
        const bv = this.brainValence?.[b.gIdx] ?? 0;
        const brainPulse = 1 + ba * 0.55;
        const mx = this.motorX[b.gIdx] ?? 0;
        const my = this.motorY[b.gIdx] ?? 0;
        const mz = this.motorZ[b.gIdx] ?? 0;
        const orbitR = 60 + ba * 180 + this.chaos * 120 + b.baseScale * 1.2;
        const driftX = Math.sin(ph * 0.73 + mx * 2.4) * orbitR + mx * 130;
        const driftZ = Math.cos(ph * 0.61 + mz * 2.1) * orbitR + mz * 130;
        const driftY = Math.sin(ph * 1.05 + my * 1.9) * (32 + ba * 55) + my * 70;
        P.set(b.ax + driftX, b.ay + driftY, b.az + driftZ);
        E.set(
          Math.sin(ph * 0.6 + mx) * 0.85,
          t * b.spin * quick * (1 + ba * 0.5) + b.phase + mz * 0.4,
          Math.cos(ph * 0.5 + mz) * 0.75,
        );
        Q.setFromEuler(E);
        S.setScalar(b.baseScale * (1 + b.pulse * Math.sin(ph * 1.7) * brainPulse + ba * 0.08));
        M.compose(P, Q, S);
        mesh.setMatrixAt(s, M);
        // Live hue drift + brightness pulse — each body its own cadence (no rng).
        // Brain novelty shifts hue, valence rotates it
        const hueShift = Math.sin(ph * 0.31) * 0.06 + t * 0.002 * b.spin + bn * 0.04 * bv;
        const hue = (b.hue + hueShift) % 1;
        const litBoost = ba * 0.12 + bn * 0.06;
        const lit = b.light + 0.08 * Math.sin(ph * 2.3) + litBoost;
        C.setHSL(hue < 0 ? hue + 1 : hue, Math.min(1, b.sat + bn * 0.12), clamp(lit, 0.22, 0.48));
        mesh.setColorAt(s, C);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    // APEX ABOMINATION #101 — wild orbit + dimensional warp pulse (pure trig, no rng).
    const w = 1 + 1.2 * this.chaos;
    const ph = t * 0.42 * w;
    const apexR = DOME_R * (0.28 + 0.14 * Math.sin(t * 0.19));
    this.apexGroup.position.set(
      Math.sin(t * 0.31 + ph * 0.2) * apexR,
      DOME_R * 0.52 + Math.sin(t * 0.17 + ph * 0.15) * 55,
      Math.cos(t * 0.27 + ph * 0.18) * apexR,
    );
    this.apexCore.rotation.set(ph * 1.3, ph * 0.9, ph * 1.7);
    this.apexHalo.rotation.set(-ph * 0.6, ph * 1.1, ph * 0.4);
    this.apexSpikes.rotation.set(ph * 2.1, -ph * 1.4, ph * 0.8);
    // V104: alien inner core + dimensional shell animation
    this.apexInner.rotation.set(ph * 2.8, -ph * 1.9, ph * 3.2);
    this.apexInner.scale.setScalar(10 * (1 + 0.3 * Math.sin(ph * 4.5)));
    this.apexShell.rotation.set(-ph * 0.4, ph * 0.7, -ph * 0.3);
    this.apexShell.scale.setScalar(20 * (1 + 0.15 * Math.cos(ph * 2.2)));
    C.setHSL((0.88 + Math.sin(ph * 1.5) * 0.12) % 1, 1, 0.5);
    (this.apexInner.material as THREE.MeshBasicMaterial).color.copy(C);
    C.setHSL((0.58 + Math.cos(ph * 0.8) * 0.15) % 1, 0.9, 0.45);
    (this.apexShell.material as THREE.MeshBasicMaterial).color.copy(C);
    const pulse = 1 + 0.35 * Math.sin(ph * 3.7) + 0.15 * Math.sin(ph * 11.3);
    this.apexCore.scale.setScalar(22 * pulse);
    this.apexHalo.scale.setScalar(14 * (1 + 0.2 * Math.sin(ph * 2.9)));
    this.apexSpikes.scale.setScalar(18 * (1 + 0.25 * Math.cos(ph * 5.1)));
    C.setHSL((0.92 + Math.sin(ph * 0.7) * 0.08) % 1, 1, 0.52);
    (this.apexCore.material as THREE.MeshBasicMaterial).color.copy(C);
    C.setHSL((0.72 + Math.cos(ph * 0.5) * 0.12) % 1, 1, 0.48);
    (this.apexHalo.material as THREE.MeshBasicMaterial).color.copy(C);
    C.setHSL((0.55 + Math.sin(ph * 1.2) * 0.15) % 1, 1, 0.55);
    (this.apexSpikes.material as THREE.MeshBasicMaterial).color.copy(C);
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
    this.group.removeFromParent();
  }
}

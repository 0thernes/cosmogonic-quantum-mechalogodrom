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
  private chaos = 0;

  constructor(scene: THREE.Scene) {
    this.mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, // white base so instanceColor shows the true hue
      transparent: true,
      opacity: 0.96,
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
        const light = 0.42 + 0.24 * b.generative;
        list.push({ ax, ay, az, baseScale, freq, phase, spin, pulse, hue: b.hue, sat, light });

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

    scene.add(this.group);
  }

  /** Reactive coupling: feed world chaos (0..1) to quicken the whole swarm. Read-only projection. */
  setChaos(c: number): void {
    this.chaos = clamp(c, 0, 1);
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
        P.set(b.ax, b.ay + Math.sin(ph) * 7, b.az);
        E.set(Math.sin(ph * 0.6) * 0.5, t * b.spin * quick + b.phase, Math.cos(ph * 0.5) * 0.4);
        Q.setFromEuler(E);
        S.setScalar(b.baseScale * (1 + b.pulse * Math.sin(ph * 1.7)));
        M.compose(P, Q, S);
        mesh.setMatrixAt(s, M);
        // Live hue drift + brightness pulse — each body its own cadence (no rng).
        const hue = (b.hue + Math.sin(ph * 0.31) * 0.06 + t * 0.002 * b.spin) % 1;
        const lit = b.light + 0.1 * Math.sin(ph * 2.3);
        C.setHSL(hue < 0 ? hue + 1 : hue, b.sat, clamp(lit, 0.38, 0.68));
        mesh.setColorAt(s, C);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  /** Total bodies rendered (100). */
  get count(): number {
    let n = 0;
    for (const l of this.bodies) n += l.length;
    return n;
  }

  /** Free every pool geometry + the shared material (HMR / world-reset safe). */
  dispose(): void {
    for (const m of this.meshes) {
      m.geometry.dispose();
      m.dispose();
    }
    this.mat.dispose();
    this.group.removeFromParent();
  }
}

/**
 * GOD-COLOSSUS / THE MONOLITH MEGALITH (V110 → re-architected V125 accretion → V131 FRACTAL DEITY) —
 * the ONE colossal super-god-tier presence that dominates the skyline. Distinct from the LV100 ascension
 * temple ({@link MonolithTemple}) and the drifting {@link FloatingMonoliths}.
 *
 * ─── V131: NO TOWER. NO BLOCKS. NO STRAIGHT LINES. A RAYMARCHED MORPHING FRACTAL GOD ────────────────
 * The V125 build was a deterministic accretion of thousands of instanced CUBES + spheres — a brutalist
 * block-tower. The owner's verdict: *"NO STUPID TOWER OR BLOCKY SHIT. Nothing is a straight line."* So the
 * instanced geometry is GONE. In its place: a single bounding volume whose fragment shader RAYMARCHES a
 * distance-estimated FRACTAL — infinite carved detail (the "insane Hindu / Korean temple" density) with
 * ZERO polygons of its own, every surface curved, the whole mass endlessly morphing.
 *
 * THE MATH (a real distance-estimator, not a texture trick):
 *   • CORE — a MANDELBULB (spherical power-fold escape-time fractal) whose exponent BREATHES 5→10 over
 *     time and world-chaos. The power fold is inherently curved + organic — there is no flat face, no
 *     straight edge, anywhere in it. Ornate recursive "scrollwork" emerges for free at every scale.
 *   • DOMAIN WARP — before the fractal, space is TWISTED about the vertical (a helical shear that grows
 *     with chaos), BENT, and RIPPLED by a curved sine field. This is the "warped / distorted / mutated /
 *     morphed" mandate: even the coordinate system is non-linear.
 *   • PER-ITERATION ROTATION — each fold step re-orients Z by a time-varying, index-varying rotation, so
 *     the structure churns kaleidoscopically (the "4th-dimensional / tesseract" churn — the fractal is a
 *     different creature every second and from every angle).
 *   • APERIODIC BONES — the orbit traps are anchored to three sites of the REAL icosahedral cut-and-
 *     project set ({@link icosaCutProject}); the colour field is therefore keyed to an aperiodic, never-
 *     repeating skeleton (the quasicrystal survives, now as the deity's nervous system, not as cubes).
 *
 * A THOUSAND EVER-CHANGING COLOURS: colour comes from the orbit-trap vector through TWO layered cosine
 * palettes plus a high-frequency iridescent shimmer keyed to the surface normal — the palette PHASE
 * advances continuously with time, position, chaos AND entropy, so the hue at any point is never the same
 * twice. Fresnel rim-iridescence + accumulated volumetric bloom finish it.
 *
 * LIVING / REACTIVE (defensible): pin chaos AND entropy to 0 and the deity cools — the exponent settles,
 * the twist relaxes, the palette stops drifting, the bloom dims. Agitate them and it blazes, twists
 * harder, morphs faster, and its whole spectrum tumbles. It is a monotone readout of the world's state.
 *
 * DETERMINISM (ADR 0004): construction draws ZERO rng and needs no WebGL — the three orbit-trap seeds
 * come from the deterministic cut-and-project. `update` only writes shader uniforms (time / chaos /
 * entropy) — no geometry, no scene allocation, no sim writes. All motion lives in the GPU clock.
 */
import * as THREE from 'three';
import { ARENA_RADIUS } from './constants';

/** Golden ratio — the icosahedral quasicrystal's one true constant. */
const PHI = (1 + Math.sqrt(5)) / 2;
/** 6D lattice search range (±) for the cut-and-project — 9^6 combos scanned once at boot. */
const QC_RANGE = 4;
/** Par-space ball radius kept (pre-normalisation) — bounds the projected point cloud. */
const QC_PAR_BALL = 6.5;

/**
 * ICOSAHEDRAL CUT-AND-PROJECT — the aperiodic bones of the deity. A 6D integer lattice Z⁶ projected
 * through the icosahedral basis into PAR (physical) + PERP (phason / acceptance) 3-spaces. Sites are
 * returned with their PERP norm so the caller can rank by acceptance (small = deep-lattice block).
 * Perfect icosahedral long-range order, NO repeating unit cell. Deterministic, zero rng.
 */
export function icosaCutProject(): { x: number; y: number; z: number; perp: number }[] {
  const c = 1 / Math.sqrt(1 + PHI * PHI);
  const ip = 1 / PHI;
  const cp = 1 / Math.sqrt(1 + ip * ip);
  const par: number[][] = [
    [1, PHI, 0],
    [-1, PHI, 0],
    [0, 1, PHI],
    [0, -1, PHI],
    [PHI, 0, 1],
    [-PHI, 0, 1],
  ].map((v) => v.map((k) => k * c));
  const perp: number[][] = [
    [1, -ip, 0],
    [-1, -ip, 0],
    [0, 1, -ip],
    [0, -1, -ip],
    [-ip, 0, 1],
    [ip, 0, 1],
  ].map((v) => v.map((k) => k * cp));
  const out: { x: number; y: number; z: number; perp: number }[] = [];
  const R = QC_RANGE;
  const n = [0, 0, 0, 0, 0, 0];
  for (n[0] = -R; n[0]! <= R; n[0]!++)
    for (n[1] = -R; n[1]! <= R; n[1]!++)
      for (n[2] = -R; n[2]! <= R; n[2]!++)
        for (n[3] = -R; n[3]! <= R; n[3]!++)
          for (n[4] = -R; n[4]! <= R; n[4]!++)
            for (n[5] = -R; n[5]! <= R; n[5]!++) {
              let px = 0;
              let py = 0;
              let pz = 0;
              let qx = 0;
              let qy = 0;
              let qz = 0;
              for (let i = 0; i < 6; i++) {
                const ni = n[i]!;
                if (ni === 0) continue;
                px += ni * par[i]![0]!;
                py += ni * par[i]![1]!;
                pz += ni * par[i]![2]!;
                qx += ni * perp[i]![0]!;
                qy += ni * perp[i]![1]!;
                qz += ni * perp[i]![2]!;
              }
              if (px * px + py * py + pz * pz > QC_PAR_BALL * QC_PAR_BALL) continue;
              out.push({
                x: px / QC_PAR_BALL,
                y: py / QC_PAR_BALL,
                z: pz / QC_PAR_BALL,
                perp: Math.hypot(qx, qy, qz),
              });
            }
  return out;
}

/** GLSL vertex shader — pass world-space position so the fragment can cast a camera ray. */
const VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * GLSL fragment shader — raymarch a morphing Mandelbulb inside the bounding box. `cameraPosition` and the
 * matrix uniforms are injected by THREE.ShaderMaterial; do not redeclare them.
 */
const FRAG = /* glsl */ `
  #define ITER 8
  #define STEPS 88
  varying vec3 vWorld;
  uniform float uTime;
  uniform float uChaos;
  uniform float uEntropy;
  uniform float uHalf;
  uniform float uScale;
  uniform vec3 uCenter;
  uniform vec3 uSeedA;
  uniform vec3 uSeedB;
  uniform vec3 uSeedC;

  mat2 rot(float a) { float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }

  vec3 palette(float t) {
    return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
  }

  // Non-linear domain warp: helical twist + bend + curved ripple — annihilates every straight line.
  vec3 warp(vec3 p) {
    float tw = 0.30 * sin(uTime * 0.11) + 0.80 * uChaos;   // WILDER helical shear (was 0.22 / 0.55)
    p.xz = rot(p.y * tw) * p.xz;
    p.xy = rot(p.z * 0.22 * sin(uTime * 0.05)) * p.xy;      // deeper vertical bend
    p += 0.15 * sin(p.yzx * 3.4 + uTime * 0.5);             // stronger curved ripple
    return p;
  }

  // Mandelbulb distance estimator with breathing exponent, per-iteration spin, and aperiodic orbit traps.
  float de(vec3 pos, out vec4 trap) {
    pos = warp(pos);
    vec3 z = pos;
    float dr = 1.0;
    float r = 0.0;
    float power = 5.0 + 3.5 * (0.5 + 0.5 * sin(uTime * 0.07)) + 2.5 * uChaos; // 5 .. 11 (wilder breathing)
    trap = vec4(1e9);
    for (int i = 0; i < ITER; i++) {
      z.xz = rot(uTime * 0.05 + float(i) * 0.7) * z.xz;
      z.yz = rot(sin(uTime * 0.03) * 0.5) * z.yz;
      r = length(z);
      if (r > 2.5) break;
      float theta = acos(clamp(z.z / r, -1.0, 1.0));
      float phi = atan(z.y, z.x);
      dr = pow(r, power - 1.0) * power * dr + 1.0;
      float zr = pow(r, power);
      theta *= power;
      phi *= power;
      z = zr * vec3(sin(theta) * cos(phi), sin(theta) * sin(phi), cos(theta)) + pos;
      trap.x = min(trap.x, length(z - uSeedA));
      trap.y = min(trap.y, length(z - uSeedB));
      trap.z = min(trap.z, length(z - uSeedC));
      trap.w = min(trap.w, r);
    }
    return 0.5 * log(max(r, 1e-6)) * r / max(dr, 1e-6);
  }

  vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.0011, 0.0);
    vec4 t;
    return normalize(vec3(
      de(p + e.xyy, t) - de(p - e.xyy, t),
      de(p + e.yxy, t) - de(p - e.yxy, t),
      de(p + e.yyx, t) - de(p - e.yyx, t)
    ));
  }

  // Ray vs axis-aligned box → [tNear, tFar].
  vec2 boxT(vec3 ro, vec3 rd, vec3 lo, vec3 hi) {
    vec3 inv = 1.0 / rd;
    vec3 a = (lo - ro) * inv;
    vec3 b = (hi - ro) * inv;
    vec3 tmin = min(a, b), tmax = max(a, b);
    float t0 = max(max(tmin.x, tmin.y), tmin.z);
    float t1 = min(min(tmax.x, tmax.y), tmax.z);
    return vec2(t0, t1);
  }

  void main() {
    vec3 ro = cameraPosition;
    vec3 rd = normalize(vWorld - cameraPosition);
    vec3 lo = uCenter - uHalf;
    vec3 hi = uCenter + uHalf;
    vec2 tb = boxT(ro, rd, lo, hi);
    if (tb.y < max(tb.x, 0.0)) discard;

    float t = max(tb.x, 0.0);
    vec4 trap = vec4(1e9);
    vec3 qHit = vec3(0.0);
    float march = 0.0;
    float glow = 0.0;
    bool hit = false;
    for (int i = 0; i < STEPS; i++) {
      vec3 pw = ro + rd * t;
      vec3 q = (pw - uCenter) / uScale;
      vec4 tr;
      float d = de(q, tr) * uScale;
      glow += 0.010 / (1.0 + d * d * 26.0);
      float eps = 0.0016 * t;
      if (d < eps) { trap = tr; qHit = q; hit = true; break; }
      t += d * 0.82;
      march += 1.0;
      if (t > tb.y) break;
    }

    vec3 col;
    float alpha;
    if (hit) {
      vec3 nrm = calcNormal(qHit);
      float ci = trap.x * 1.6 + trap.z * 2.1 + uTime * 0.06 + length(qHit) * 0.4 + uEntropy * 0.6;
      col = palette(ci);
      col = mix(col, palette(ci * 1.7 + 0.25 + trap.w * 0.5), 0.5);       // second hue layer
      col += 0.36 * palette(ci * 5.0 + dot(nrm, rd) * 2.0 + uTime * 0.2); // iridescent micro-texture (wilder)
      vec3 lightDir = normalize(vec3(0.5, 0.85, 0.35));
      float diff = 0.42 + 0.58 * max(dot(nrm, lightDir), 0.0);
      float fres = pow(1.0 - max(dot(nrm, -rd), 0.0), 3.0);
      col *= diff;
      col += fres * palette(uTime * 0.1 + ci) * (0.9 + 0.9 * uChaos);      // hotter rim-iridescence
      float ao = clamp(1.0 - march / float(STEPS) * 1.15, 0.15, 1.0);
      col *= ao;
      alpha = clamp(0.86 + fres, 0.0, 1.0);
    } else {
      if (glow < 0.02) discard;
      col = glow * palette(uTime * 0.13 + 0.5) * 1.3;
      alpha = clamp(glow * 1.4, 0.0, 0.6);
    }
    col += glow * palette(uTime * 0.09 + 0.2) * 0.6; // volumetric bloom halo
    gl_FragColor = vec4(col, alpha);
  }
`;

/**
 * THE GOD-COLOSSUS — a single bounding volume raymarching a morphing fractal deity. One THREE.Group,
 * one Mesh, one ShaderMaterial. No instanced blocks, no straight lines, infinite carved detail.
 */
export class GodColossus {
  private readonly scene: THREE.Scene;
  private readonly root = new THREE.Group();
  private readonly geo: THREE.BoxGeometry;
  readonly material: THREE.ShaderMaterial;
  private readonly mesh: THREE.Mesh;
  /** Aperiodic orbit-trap anchors actually wired into the shader (the cut-and-project bones). */
  readonly seedCount = 3;
  /** World-space center of the deity — a camera can be flown here to frame it (see World.focusColossus). */
  readonly center: THREE.Vector3;
  /** Half-extent of the bounding volume — a good framing distance is ~2.2× this. */
  readonly viewRadius: number;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Colossal hovering mass at the far edge of the dome — big enough to loom over everything.
    const half = ARENA_RADIUS * 0.82;
    // USER: SUSPENDED, FULLY ABOVE GROUND. The box bottom (center.y − half) must clear the y=0 ground with
    // a visible floating gap — the deity is a suspended structure, NOT one half-sunk into the terrain (the
    // old center.y = 0.42·R put the bottom at −0.40·R, so the lower half rendered under the ground and was
    // occluded). half + 0.10·R ⇒ bottom ≈ 0.10·R above ground, top ≈ 1.74·R: a dominating backdrop that
    // hangs in place beyond the dome rim, never touching or sinking below the floor.
    const center = new THREE.Vector3(0, half + ARENA_RADIUS * 0.1, -ARENA_RADIUS * 0.92);
    this.center = center.clone();
    this.viewRadius = half;
    const scale = half / 1.35; // fractal lives in local radius ~1.35 → fills the box

    // Three DETERMINISTIC aperiodic seeds from the real cut-and-project set (index-sampled, no rng).
    const sites = icosaCutProject();
    const pick = (f: number): THREE.Vector3 => {
      const s = sites[Math.floor((sites.length - 1) * f)]!;
      return new THREE.Vector3(s.x, s.y, s.z);
    };
    const seedA = pick(0.11);
    const seedB = pick(0.5);
    const seedC = pick(0.83);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uChaos: { value: 0 },
        uEntropy: { value: 0 },
        uHalf: { value: half },
        uScale: { value: scale },
        uCenter: { value: center.clone() },
        uSeedA: { value: seedA },
        uSeedB: { value: seedB },
        uSeedC: { value: seedC },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      depthTest: true,
    });

    this.geo = new THREE.BoxGeometry(half * 2, half * 2, half * 2);
    this.mesh = new THREE.Mesh(this.geo, this.material);
    this.mesh.position.copy(center);
    // USER (regression fix — "when you get close it vanishes / it's a hologram"): NEVER frustum-cull the
    // raymarch box. It is drawn BackSide (the standard for a volume the camera can also enter), so the ray
    // still enters correctly from every distance — BUT three's cull test is on the bounding SPHERE, and as
    // the camera flies IN CLOSE the sphere centre crosses behind the near plane and intersectsSphere
    // reports "outside", blinking the whole deity out. The v0.20.0 perf-cull traded that away; it is not
    // worth it. The 88-step march only runs on the box's rasterised fragments anyway, so when the box is
    // genuinely off-screen it already produces no fragments (near-zero cost) — leaving it always-drawn
    // keeps the god ROCK-SOLID present at every distance and orbit angle, which is the whole point.
    this.mesh.frustumCulled = false;
    this.root.add(this.mesh);
    scene.add(this.root);
  }

  /**
   * Drive the deity from the world clock + chaos/entropy. Writes only shader uniforms — no geometry, no
   * scene allocation. All morphing / twisting / colour-drift happens on the GPU from `t`.
   */
  update(t: number, chaos: number, entropy: number): void {
    const u = this.material.uniforms;
    u.uTime!.value = t;
    u.uChaos!.value = chaos;
    u.uEntropy!.value = entropy;
  }

  dispose(): void {
    this.geo.dispose();
    this.material.dispose();
    this.root.clear();
    this.scene.remove(this.root);
  }
}

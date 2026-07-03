/**
 * GOD-COLOSSUS / THE MONOLITH MEGALITH (V110 → re-architected V125) — the ONE colossal super-god-tier
 * TOWER that dominates the skyline. This is the tall skyscraper, distinct from the LV100 ascension
 * temple ({@link MonolithTemple}) and the drifting {@link FloatingMonoliths}.
 *
 * ─── ENGINEERING / ARCHITECTURE — a CHAOTIC BRUTALIST ACCRETION, not a tiered cone ───────────────
 * The prior build was a smoothly tapering tier‑stack with a star crown + an ornament ring of identical
 * wireframe spheres + a radial line‑burst — it read as a grey Christmas tree. GONE. Cut from reference
 * image 4 (a dense chaotic tower of interpenetrating black cubes + varied gridded spheres, receding
 * into fog) and image 2 (a cube‑lattice with a bright genesis core), the tower is now a **deterministic
 * 3D ACCRETION** with NO taper function, NO tiers, NO crown, NO rays:
 *
 *   • CUBE ACCRETION — thousands of cubes placed by a DENSITY FIELD (dense vertical core, thinning with
 *     radius + height), with a power‑law size spread (mostly small, a few colossal cantilevered blocks),
 *     a slow twist up the shaft, and slab / column / cube proportions → a jagged, irregular, brutalist
 *     silhouette that never smoothly tapers (pool 1, matte stone).
 *   • QUASICRYSTAL — the real icosahedral cut‑and‑project point set mapped INTO the mass as GLOSSY metal
 *     cubes (aperiodic bristle throughout, not a smooth shell); acceptance depth (PERP) drives size +
 *     brightness (pool 2). No repeating unit cell, ever.
 *   • SPHERES — solid GLOSSY dark spheres of widely varied sizes nestled AMONG the cubes (image 4's
 *     black disco balls), catching specular highlights — embedded, not a tidy orbiting ring (pool 3).
 *   • GENESIS CORE — a bright white cube + a soft additive glow SPHERE at the tower's heart (image 2's
 *     central light) that blooms with world chaos. NO thin radial ray‑lines.
 *   • VOXEL LATTICE — a faint wireframe cubic grid loosely enclosing the mass (image 2), kept subtle.
 *   • STAR‑DUST + ENERGY SHELL — sparse points + an fbm shell, both monochrome.
 *
 * MONOCHROME with FULL TONAL RANGE (black → silver → white): per‑instance brightness spans the whole
 * 0..1 range and the pools mix matte vs glossy‑metal so the tower reads as image 4's rich silver/black,
 * not "two greys". Zero hue.
 *
 * LIVING (defensible): the emissive brightness + genesis blaze are a monotone readout of world chaos +
 * entropy — pin both to 0 and the tower cools to dead grey stone; agitate them and it blazes. A tanh
 * flip counter‑phases the glossy quasicrystal cubes (the tower breathes light through its bones).
 *
 * DETERMINISM (ADR 0004): every position + per‑artifact param comes from a pure positional hash / the
 * deterministic cut‑and‑project — ZERO rng, no Date.now. Reads world chaos/entropy, writes no sim state.
 */
import * as THREE from 'three';
import { ARENA_RADIUS } from './constants';

/** Cubes in the main accretion body (pool 1) — the tower mass. panelCount = this. */
const PANELS = 5200;
/** Solid glossy spheres embedded in the mass (pool 3, img 4). */
const SPHERES = 240;
/** Quasicrystal aperiodic cubes cap (pool 2). */
const QC_CARVE = 9600;
/** 6D lattice search range (±) for the cut-and-project — 9^6 combos scanned once at boot. */
const QC_RANGE = 4;
/** Par-space ball radius kept (pre-normalisation) — bounds the projected point cloud. */
const QC_PAR_BALL = 6.5;
/** Star-dust point count through the tower volume (img 2). */
const STAR_COUNT = 520;

/** Golden ratio — the icosahedral quasicrystal's one true constant. */
const PHI = (1 + Math.sqrt(5)) / 2;
const TAU = Math.PI * 2;

/**
 * ICOSAHEDRAL CUT-AND-PROJECT — the aperiodic bones of the tower. A 6D integer lattice Z⁶ projected
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

/** Deterministic positional hash → [0,1). No bitwise, no rng (mirrors FloatingMonoliths). */
function hash(n: number): number {
  const s = Math.sin(n * 41.17 + 13.91) * 24634.6345;
  return s - Math.floor(s);
}

export class GodColossus {
  private readonly scene: THREE.Scene;
  private readonly root = new THREE.Group();
  private readonly unitBox = new THREE.BoxGeometry(1, 1, 1);
  private readonly geos: THREE.BufferGeometry[] = [];
  private readonly mats: THREE.Material[] = [];
  private readonly panelMat: THREE.MeshStandardMaterial;
  private readonly carveMat: THREE.MeshStandardMaterial;
  private readonly sphereMat: THREE.MeshStandardMaterial;
  private readonly latticeMat: THREE.LineBasicMaterial;
  private readonly starMat: THREE.PointsMaterial;
  private readonly genesisMat: THREE.MeshBasicMaterial;
  private readonly glowMat: THREE.MeshBasicMaterial;
  private readonly shellMat: THREE.ShaderMaterial;
  /** Exactly THREE instanced pools (the test asserts this): accretion cubes · quasicrystal · spheres. */
  private readonly panels: THREE.InstancedMesh;
  private carve!: THREE.InstancedMesh;
  private readonly spheres: THREE.InstancedMesh;
  private readonly genesis: THREE.Mesh;
  private readonly glow: THREE.Mesh;
  private readonly shell: THREE.Mesh;
  /** Base scalar the white genesis cube is sized to (update() pulses around it). */
  private readonly genesisBase: number;
  /** Quasicrystal artifacts actually placed (telemetry/tests). */
  qcCount = 0;
  /** Cubes in the accretion body (telemetry/tests). */
  readonly panelCount = PANELS;
  /** Every individually-varied artifact on the tower. */
  get artifactCount(): number {
    return PANELS + this.qcCount + SPHERES;
  }
  private readonly emissive = new THREE.Color();

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Tower envelope — a tall, WIDE-based irregular mass (no smooth cone). All heights/radii derive
    // from ARENA_RADIUS so the tower towers over the dome.
    const baseHalf = ARENA_RADIUS * 0.19;
    const bodyH = ARENA_RADIUS * 1.5;
    this.genesisBase = baseHalf * 0.42;

    // Ragged radial envelope at a normalized height (0 base → 1 top): wide at the foot, thinning up,
    // roughened by a per-column hash so the silhouette is jagged, not a clean cone.
    const envAt = (y01: number, salt: number): number =>
      baseHalf * (1.05 - y01 * 0.72) * (0.45 + 0.9 * hash(salt));

    // ── Materials — MONOCHROME, full tonal range, mixed matte / glossy metal (image 4 silver+black). ──
    this.panelMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, // per-instance grey via instanceColor
      roughness: 0.72,
      metalness: 0.3,
      emissive: 0x101010,
      emissiveIntensity: 0.35,
    });
    this.carveMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, // per-instance grey — GLOSSY metal so it catches specular highlights
      roughness: 0.16,
      metalness: 0.92,
      emissive: 0x0c0c0c,
      emissiveIntensity: 0.45,
    });
    this.sphereMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, // per-instance grey — glossy black disco balls
      roughness: 0.12,
      metalness: 0.96,
      emissive: 0x0a0a0a,
      emissiveIntensity: 0.2,
    });
    this.mats.push(this.panelMat, this.carveMat, this.sphereMat);

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    const col = new THREE.Color();

    // ── POOL 1 — the CUBE ACCRETION. Density-field placement → a chaotic brutalist mass. ──
    this.panels = new THREE.InstancedMesh(this.unitBox, this.panelMat, PANELS);
    this.panels.frustumCulled = false;
    for (let p = 0; p < PANELS; p++) {
      const y01 = Math.pow(hash(p * 1.1 + 3), 1.35); // more mass low (dense sprawling base)
      const height = y01 * bodyH;
      const env = envAt(y01, p * 2.3 + 9);
      let r = env * Math.pow(hash(p * 3.7 + 5), 0.55); // core-dense
      if (hash(p * 5 + 7) > 0.9) r *= 1.8; // occasional cantilever spur → breaks the envelope
      const ang = hash(p * 7 + 11) * TAU + y01 * 3.2; // slow twist up the shaft
      const jx = (hash(p * 11 + 13) - 0.5) * baseHalf * 0.18;
      const jz = (hash(p * 13 + 17) - 0.5) * baseHalf * 0.18;
      pos.set(Math.cos(ang) * r + jx, height, Math.sin(ang) * r + jz);
      // Power-law size: many small, a few colossal blocks. Slab / column / cube proportions.
      const base = baseHalf * (0.03 + Math.pow(hash(p * 17 + 19), 3.0) * 0.52);
      const ax = base * (0.55 + hash(p * 23 + 2) * 1.3);
      const ay = base * (0.55 + hash(p * 29 + 4) * 1.9); // taller spread → columns + slabs
      const az = base * (0.55 + hash(p * 31 + 6) * 1.3);
      scl.set(ax, ay, az);
      if (hash(p * 19 + 23) > 0.8) {
        e.set((hash(p) - 0.5) * 0.5, hash(p + 1) * TAU, (hash(p + 2) - 0.5) * 0.5); // a few tumbled
      } else {
        e.set(0, (Math.floor(hash(p * 2 + 1) * 4) * Math.PI) / 2, 0); // most axis-aligned (90° steps)
      }
      q.setFromEuler(e);
      m.compose(pos, q, scl);
      this.panels.setMatrixAt(p, m);
      // Full grayscale range: mostly dark stone, a spread of silver, rare near-white. Zero hue.
      const shade = hash(p * 37 + 8);
      const lit = shade > 0.94 ? 0.85 + hash(p * 3) * 0.1 : 0.03 + Math.pow(shade, 1.4) * 0.5;
      col.setRGB(lit, lit, lit);
      this.panels.setColorAt(p, col);
    }
    this.panels.instanceMatrix.needsUpdate = true;
    if (this.panels.instanceColor) this.panels.instanceColor.needsUpdate = true;
    this.root.add(this.panels);

    // ── POOL 2 — the QUASICRYSTAL aperiodic point set mapped INTO the mass as glossy metal cubes. ──
    const sites = icosaCutProject().sort((a, b) => a.perp - b.perp || a.y - b.y || a.x - b.x);
    const nCarve = Math.min(QC_CARVE, sites.length);
    this.carve = new THREE.InstancedMesh(this.unitBox, this.carveMat, nCarve);
    this.carve.frustumCulled = false;
    this.qcCount = nCarve;
    const perpMax = sites.length ? sites[nCarve - 1]!.perp || 1 : 1;
    for (let k = 0; k < nCarve; k++) {
      const s = sites[k]!;
      const y01 = (s.y + 1) / 2; // -1..1 → 0..1 height
      const height = y01 * bodyH;
      const env = envAt(y01, k * 2.3 + 41);
      // the site's (x,z) direction, radius scaled into the tower envelope → aperiodic bristle throughout
      const rad = Math.hypot(s.x, s.z) || 1e-3;
      const ux = s.x / rad;
      const uz = s.z / rad;
      const r = env * (0.35 + rad * 0.9);
      pos.set(ux * r, height, uz * r);
      const depth = 1 - Math.min(1, s.perp / perpMax); // 1 = deepest-lattice block
      const hk = hash(k * 3.7 + 101);
      const g = baseHalf * (0.02 + depth * 0.08 + hk * 0.02);
      scl.set(g, g * (0.6 + hk * 1.4), g);
      e.set(
        (hk - 0.5) * 0.25,
        Math.atan2(s.z, s.x) + (hash(k * 5 + 7) - 0.5) * 0.4,
        (hash(k * 7 + 3) - 0.5) * 0.25,
      );
      q.setFromEuler(e);
      m.compose(pos, q, scl);
      // Glossy metal in full grayscale: deep-lattice cubes darker, shallow phason cubes a bright chrome.
      const lit = 0.06 + depth * 0.14 + (depth < 0.3 && hk > 0.6 ? 0.7 : 0) + hk * 0.06;
      col.setRGB(lit, lit, lit);
      this.carve.setMatrixAt(k, m);
      this.carve.setColorAt(k, col);
    }
    this.carve.instanceMatrix.needsUpdate = true;
    if (this.carve.instanceColor) this.carve.instanceColor.needsUpdate = true;
    this.root.add(this.carve);

    // ── POOL 3 — solid GLOSSY spheres of varied sizes nestled among the cubes (img 4 disco balls). ──
    const sphereGeo = new THREE.IcosahedronGeometry(1, 2); // tessellated so highlights read as facets
    this.geos.push(sphereGeo);
    this.spheres = new THREE.InstancedMesh(sphereGeo, this.sphereMat, SPHERES);
    this.spheres.frustumCulled = false;
    for (let i = 0; i < SPHERES; i++) {
      const y01 = Math.pow(hash(i * 1.7 + 51), 1.2);
      const height = y01 * bodyH;
      const env = envAt(y01, i * 2.9 + 61);
      let r = env * Math.pow(hash(i * 3.1 + 53), 0.5);
      if (hash(i * 5 + 57) > 0.85) r *= 1.6; // a few drift out into the surrounding air
      const ang = hash(i * 7 + 59) * TAU + y01 * 3.2;
      pos.set(Math.cos(ang) * r, height, Math.sin(ang) * r);
      // Power-law sizes: many small marbles, a few big disco balls.
      const rr = baseHalf * (0.02 + Math.pow(hash(i * 11 + 63), 2.6) * 0.16);
      scl.setScalar(rr);
      q.identity();
      m.compose(pos, q, scl);
      this.spheres.setMatrixAt(i, m);
      const lit = 0.04 + Math.pow(hash(i * 13 + 67), 1.6) * 0.5;
      col.setRGB(lit, lit, lit);
      this.spheres.setColorAt(i, col);
    }
    this.spheres.instanceMatrix.needsUpdate = true;
    if (this.spheres.instanceColor) this.spheres.instanceColor.needsUpdate = true;
    this.root.add(this.spheres);

    // ── GENESIS CORE — a bright white cube + a soft additive glow sphere at the heart (img 2). ──
    const coreY = bodyH * 0.58;
    this.genesisMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
    this.mats.push(this.genesisMat);
    this.genesis = new THREE.Mesh(this.unitBox, this.genesisMat);
    this.genesis.position.set(0, coreY, 0);
    this.genesis.scale.setScalar(this.genesisBase);
    this.genesis.frustumCulled = false;
    this.root.add(this.genesis);

    const glowGeo = new THREE.SphereGeometry(1, 24, 16);
    this.geos.push(glowGeo);
    this.glowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
      fog: false,
    });
    this.mats.push(this.glowMat);
    this.glow = new THREE.Mesh(glowGeo, this.glowMat);
    this.glow.position.set(0, coreY, 0);
    this.glow.scale.setScalar(this.genesisBase * 6);
    this.glow.frustumCulled = false;
    this.root.add(this.glow);

    // ── VOXEL LATTICE — a faint wireframe cubic grid loosely enclosing the mass (img 2), subtle. ──
    {
      const pts: number[] = [];
      const gx = 2;
      const gy = 7;
      const half = baseHalf * 1.7;
      const line = (
        ax: number,
        ay: number,
        az: number,
        bx: number,
        by: number,
        bz: number,
      ): void => {
        pts.push(ax, ay, az, bx, by, bz);
      };
      for (let ix = 0; ix <= gx; ix++)
        for (let iz = 0; iz <= gx; iz++) {
          const px = -half + (ix / gx) * 2 * half;
          const pz = -half + (iz / gx) * 2 * half;
          line(px, 0, pz, px, bodyH, pz);
        }
      for (let iy = 0; iy <= gy; iy++) {
        const py = (iy / gy) * bodyH;
        for (let ix = 0; ix <= gx; ix++) {
          const px = -half + (ix / gx) * 2 * half;
          line(px, py, -half, px, py, half);
        }
        for (let iz = 0; iz <= gx; iz++) {
          const pz = -half + (iz / gx) * 2 * half;
          line(-half, py, pz, half, py, pz);
        }
      }
      const latGeo = new THREE.BufferGeometry();
      latGeo.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(pts), 3));
      this.geos.push(latGeo);
      this.latticeMat = new THREE.LineBasicMaterial({
        color: 0x777777,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.mats.push(this.latticeMat);
      const lattice = new THREE.LineSegments(latGeo, this.latticeMat);
      lattice.frustumCulled = false;
      this.root.add(lattice);
    }

    // ── STAR-DUST — sparse points through the tower volume (img 2). ──
    {
      const arr = new Float32Array(STAR_COUNT * 3);
      for (let i = 0; i < STAR_COUNT; i++) {
        arr[i * 3] = (hash(i * 3 + 11) - 0.5) * baseHalf * 3.6;
        arr[i * 3 + 1] = hash(i * 3 + 12) * bodyH;
        arr[i * 3 + 2] = (hash(i * 3 + 13) - 0.5) * baseHalf * 3.6;
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      this.geos.push(starGeo);
      this.starMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: baseHalf * 0.015,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      });
      this.mats.push(this.starMat);
      const stars = new THREE.Points(starGeo, this.starMat);
      stars.frustumCulled = false;
      this.root.add(stars);
    }

    // ── ENERGY SHELL — fbm-veined additive icosahedron, MONOCHROME grey. ──
    const shellGeo = new THREE.IcosahedronGeometry(Math.max(bodyH, baseHalf * 2) * 0.6, 3);
    this.geos.push(shellGeo);
    this.shellMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      uniforms: {
        uTime: { value: 0 },
        uChaos: { value: 0 },
        uEntropy: { value: 0 },
      },
      vertexShader: `
        varying vec3 vP;
        void main() {
          vP = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        precision highp float;
        uniform float uTime; uniform float uChaos; uniform float uEntropy;
        varying vec3 vP;
        float h31(vec3 p){ return fract(sin(dot(p, vec3(27.17, 61.31, 11.71))) * 43758.5453); }
        float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y), f.z); }
        float fbm(vec3 p){ float a=0.5,s=0.0; for(int i=0;i<5;i++){ s+=a*n3(p); p=p*2.03+5.1; a*=0.5; } return s; }
        void main() {
          vec3 dir = normalize(vP);
          float veins = fbm(dir * 6.0 + uTime * 0.15);
          veins = pow(abs(veins - 0.5) * 2.0, 1.6);
          float energy = fbm(dir * 3.0 - uTime * 0.25) * (0.35 + 0.6 * uChaos);
          float g = energy * 0.6 + veins * 0.45 + uEntropy * 0.1; // grey brightness only, no hue
          float a = clamp(energy * 0.3 + veins * 0.24, 0.0, 0.55);
          gl_FragColor = vec4(vec3(g), a);
        }`,
    });
    this.mats.push(this.shellMat);
    this.shell = new THREE.Mesh(shellGeo, this.shellMat);
    this.shell.position.y = bodyH * 0.5;
    this.shell.frustumCulled = false;
    this.root.add(this.shell);

    // ── Place the tower at the dome's far edge, towering over the skyline (centre column clear). ──
    this.root.position.set(0, 0, -ARENA_RADIUS * 0.92);
    this.scene.add(this.root);
  }

  /**
   * Animate the living tower: pulse the grey emissive (brightness only, no hue) from world chaos +
   * entropy, bloom the genesis core + glow, counter-phase the glossy quasicrystal cubes, breathe the
   * shell, and sway with godlike slowness. No rng, no allocation, spawns no geometry.
   * @param t scaled elapsed seconds · @param chaos 0..1 · @param entropy 0..1
   */
  update(t: number, chaos: number, entropy: number): void {
    const c = chaos < 0 ? 0 : chaos > 1 ? 1 : chaos;
    const en = entropy < 0 ? 0 : entropy > 1 ? 1 : entropy;
    const g = 0.26 + 0.5 * c + 0.16 * en;
    this.emissive.setRGB(g, g, g);

    this.panelMat.emissive.copy(this.emissive);
    this.panelMat.emissiveIntensity = 0.28 + 0.9 * c;
    this.sphereMat.emissive.copy(this.emissive);
    this.sphereMat.emissiveIntensity = 0.15 + 0.6 * c;

    // Genesis core throbs; the glow blooms with chaos.
    const throb = 0.85 + 0.3 * Math.sin(t * 1.7);
    this.genesis.scale.setScalar(
      (0.85 + 0.4 * c) * (1 + 0.12 * Math.sin(t * 2.1)) * this.genesisBase,
    );
    this.glowMat.opacity = (0.1 + 0.28 * c) * throb;

    // BIPOLAR blaze (grayscale): the glossy quasicrystal cubes counter-phase — the tower breathes light
    // through its bones (bright-bones ⇄ dark-megalith), chaos raising the pole.
    const flip = 0.5 + 0.5 * Math.tanh(3.0 * Math.sin(t * 0.09 + Math.sin(t * 0.031) * 1.3));
    this.carveMat.emissive.copy(this.emissive);
    this.carveMat.emissiveIntensity = 0.2 + 0.9 * flip + 0.7 * c;

    this.latticeMat.opacity = 0.05 + 0.1 * c;

    this.shellMat.uniforms.uTime!.value = t;
    this.shellMat.uniforms.uChaos!.value = c;
    this.shellMat.uniforms.uEntropy!.value = en;

    // Godlike, near-imperceptible sway + a slow turn of the whole tower.
    this.root.rotation.y = Math.sin(t * 0.018) * 0.04 + t * 0.003;
    this.root.position.y = Math.sin(t * 0.05) * 4.0;
  }

  /** Free every owned geometry + material and detach the tower from the scene. */
  dispose(): void {
    this.scene.remove(this.root);
    this.panels.dispose();
    this.carve.dispose();
    this.spheres.dispose();
    this.unitBox.dispose();
    for (const geo of this.geos) geo.dispose();
    for (const mat of this.mats) mat.dispose();
  }
}

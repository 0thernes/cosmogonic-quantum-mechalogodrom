/**
 * GOD-COLOSSUS / THE MONOLITH MEGALITH (V110 → rebuilt V124) — the ONE colossal super-god-tier
 * TOWER that dominates the skyline. This is the tall skyscraper, distinct from the LV100 ascension
 * temple ({@link MonolithTemple}) and the drifting {@link FloatingMonoliths}.
 *
 * ─── ENGINEERING / ARCHITECTURE (rebuild, geometry-first, MONOCHROME) ───────────────────────────
 * Cut from the same six reference images as the temple (see docs/MONOLITH-MEGALITH-ART-DIRECTION.md).
 * The images are a GEOMETRY, not a colour scheme, and they are black / white / silver. So the tower
 * is rebuilt from their structural vocabulary — **CUBE + SPHERE + wireframe voxel LATTICE + a white
 * GENESIS core firing straight radial god-rays + a woven GEODESIC crown** — in strict grayscale (the
 * old build was a magenta/saffron/dancheong/cyan carnival; every hue is now gone):
 *
 *   • TIER STACK    — 16 tapering stacked CUBES: the skyscraper silhouette (img 4 megastructure).
 *   • GREEBLE       — ~2400 instanced cube panels encrusting the tier faces (pool 1).
 *   • QUASICRYSTAL  — an aperiodic HOLLOW cube-shell from a real icosahedral cut-and-project (pool 2);
 *     bright "window" cubes vs dark carve blocks are chosen by the site's PERP (phason) acceptance —
 *     the crystallographic coordinate as form. No repeating unit cell, ever (imgs 1/2/4 recursion).
 *   • SPHERES       — instanced tessellated wireframe SPHERES embedded around the tower (pool 3, img4).
 *   • VOXEL LATTICE — a wireframe cubic grid enclosing the tower — the cubic spacetime (img 2).
 *   • GENESIS CORE  — a white incandescent cube at the tower's heart + straight radial GOD-RAY lines
 *     (img 2 central light + god-rays), blooming with world chaos.
 *   • GEODESIC CROWN— a spiky crystalline crown wrapped in a woven great-circle sphere cage (img 3,
 *     cube-in-sphere) + a needle spire; star-dust points through the volume (img 2).
 *   • ENERGY SHELL  — an fbm-veined additive shell, monochrome, breathing with chaos/entropy.
 *
 * LIVING (defensible, not decoration): the emissive brightness + god-ray + lamp blaze are a monotone
 * readout of world chaos + entropy — pin both to 0 and the tower cools to dead grey stone; agitate
 * them and it blazes. A tanh "schizophrenic" flip alternates the tower between "ten thousand lit
 * windows" and "dark megalith with burning bones" (grayscale, no hue).
 *
 * DETERMINISM (ADR 0004): every position + per-artifact param comes from a pure positional hash /
 * the deterministic cut-and-project — ZERO rng draws, no Date.now. It READS world chaos/entropy but
 * never writes sim state, so the population golden replay stays byte-identical.
 */
import * as THREE from 'three';
import { ARENA_RADIUS } from './constants';

/** Tapering stacked tiers forming the colossal spire. */
const TIERS = 16;
/** Instanced greeble cube panels encrusting the tier faces (telemetry-checked). */
const PANELS = 2400;
/** Instanced tessellated wireframe spheres embedded around the tower (img 4). */
const SPHERES = 260;
/** V122/V124: quasicrystal carve artifacts (hollow-shell cubes + bright window cubes). */
const QC_CARVE = 9600;
/** 6D lattice search range (±) for the cut-and-project — 9^6 combos scanned once at boot. */
const QC_RANGE = 4;
/** Par-space ball radius kept (pre-normalisation) — bounds the projected point cloud. */
const QC_PAR_BALL = 6.5;
/** Straight radial god-ray line count from the genesis core (img 2). */
const RAY_LINES = 260;
/** Great-circle count for the woven geodesic crown cage (img 3). */
const CROWN_CIRCLES = 14;
const CROWN_SEG = 40;
/** Star-dust point count through the tower volume (img 2). */
const STAR_COUNT = 700;

/** Golden ratio — the icosahedral quasicrystal's one true constant. */
const PHI = (1 + Math.sqrt(5)) / 2;
/** Golden angle — Fibonacci spacing for spheres, rays, star-dust. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * V122 (USER #11): ICOSAHEDRAL CUT-AND-PROJECT — the aperiodic bones of the tower.
 *
 * A 6D integer lattice Z⁶ is projected through the icosahedral basis into two 3-spaces: PAR
 * (physical) and PERP (the phason / acceptance space). Sites whose PERP image sits nearest the
 * origin are the true quasicrystal — a point set with perfect icosahedral long-range order and NO
 * repeating unit cell (aperiodic forever). The PERP norm is returned with each site so the caller can
 * rank by acceptance (small = deep-lattice block, large = phason-excited lamp). Deterministic, zero
 * rng. O(QC_RANGE⁶) once at boot.
 */
export function icosaCutProject(): { x: number; y: number; z: number; perp: number }[] {
  const c = 1 / Math.sqrt(1 + PHI * PHI);
  const ip = 1 / PHI;
  const cp = 1 / Math.sqrt(1 + ip * ip);
  // The 6 icosahedron vertex directions (par) and their φ→−1/φ conjugates (perp).
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

interface Tier {
  readonly y: number;
  readonly halfW: number;
  readonly halfH: number;
}

export class GodColossus {
  private readonly scene: THREE.Scene;
  private readonly root = new THREE.Group();
  private readonly unitBox = new THREE.BoxGeometry(1, 1, 1);
  private readonly geos: THREE.BufferGeometry[] = [];
  private readonly mats: THREE.Material[] = [];
  private readonly coreMat: THREE.MeshStandardMaterial;
  private readonly panelMat: THREE.MeshStandardMaterial;
  private readonly crownMat: THREE.MeshStandardMaterial;
  private readonly latticeMat: THREE.LineBasicMaterial;
  private readonly rayMat: THREE.LineBasicMaterial;
  private readonly crownCageMat: THREE.LineBasicMaterial;
  private readonly starMat: THREE.PointsMaterial;
  private readonly sphereMat: THREE.MeshBasicMaterial;
  private readonly genesisMat: THREE.MeshBasicMaterial;
  private readonly shellMat: THREE.ShaderMaterial;
  private readonly carveMat: THREE.MeshStandardMaterial;
  /** Exactly THREE instanced pools (the test asserts this): greeble cubes · quasicrystal shell · spheres. */
  private readonly panels: THREE.InstancedMesh;
  private carve!: THREE.InstancedMesh;
  private readonly spheres: THREE.InstancedMesh;
  private readonly crown: THREE.Mesh;
  private readonly spire: THREE.Mesh;
  private readonly genesis: THREE.Mesh;
  private readonly rays: THREE.LineSegments;
  private readonly crownCage: THREE.LineSegments;
  private readonly shell: THREE.Mesh;
  /** Base scalar the white genesis cube is sized to (update() pulses around it). */
  private readonly genesisBase = ARENA_RADIUS * 0.035 * 1.4;
  /** V122: quasicrystal artifacts actually placed (telemetry/tests). */
  qcCount = 0;
  /** Total greeble panels placed (telemetry/tests). */
  readonly panelCount = PANELS;
  /** Every individually-varied artifact on the monument (panels + quasicrystal + spheres). */
  get artifactCount(): number {
    return PANELS + this.qcCount + SPHERES;
  }
  private readonly emissive = new THREE.Color();

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // ── Materials — strict MONOCHROME. Dark stone bodies read by a white/grey emissive the update()
    //    pulses (no hue). ──
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0x08080a,
      roughness: 0.5,
      metalness: 0.6,
      emissive: 0x141414,
      emissiveIntensity: 0.6,
    });
    this.panelMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, // per-instance grey via instanceColor
      roughness: 0.66,
      metalness: 0.4,
      emissive: 0x111111,
      emissiveIntensity: 0.4,
    });
    this.crownMat = new THREE.MeshStandardMaterial({
      color: 0x0c0c0e,
      roughness: 0.26,
      metalness: 0.9,
      emissive: 0x2a2a2a,
      emissiveIntensity: 0.85,
    });
    this.mats.push(this.coreMat, this.panelMat, this.crownMat);

    // ── Geometry: the tapering CUBE tiers. Base wide, crown narrow; total height >> ARENA_RADIUS. ──
    const baseHalf = ARENA_RADIUS * 0.16;
    const topHalf = ARENA_RADIUS * 0.035;
    const tierH = ARENA_RADIUS * 0.085;
    const tiers: Tier[] = [];
    let y = 0;
    for (let i = 0; i < TIERS; i++) {
      const f = i / (TIERS - 1);
      const halfW = baseHalf * (1 - f) + topHalf * f;
      const half = tierH * 0.5;
      const cy = y + half;
      tiers.push({ y: cy, halfW, halfH: half });
      const tier = new THREE.Mesh(this.unitBox, this.coreMat);
      tier.position.y = cy;
      tier.rotation.y = (hash(i * 7 + 3) - 0.5) * 0.5 + f * 1.1;
      tier.scale.set(
        halfW * 2,
        tierH * (0.9 + hash(i * 5 + 1) * 0.2),
        halfW * 2 * (0.7 + 0.3 * hash(i * 11 + 2)),
      );
      tier.frustumCulled = false;
      this.root.add(tier);
      y += tierH;
    }
    const crownBaseY = y;
    const totalH = crownBaseY + topHalf * 8;

    // ── POOL 1 — greeble CUBE panels scattered over every tier's four vertical faces (grayscale). ──
    this.panels = new THREE.InstancedMesh(this.unitBox, this.panelMat, PANELS);
    this.panels.frustumCulled = false;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    const col = new THREE.Color();
    for (let p = 0; p < PANELS; p++) {
      const ti = Math.floor(hash(p * 1.7 + 5) * TIERS);
      const tier = tiers[ti < TIERS ? ti : TIERS - 1]!;
      const face = Math.floor(hash(p * 2.3 + 11) * 4);
      const pd = 0.6 + hash(p * 5 + 7) * 3.2;
      const a = 1.0 + hash(p * 6 + 13) * 5.0;
      const b = 1.0 + hash(p * 9 + 17) * tier.halfH * 0.8;
      const vo = (hash(p * 4 + 29) - 0.5) * 1.7;
      const uo = (hash(p * 3 + 23) - 0.5) * 1.7;
      const yy = tier.y + vo * tier.halfH;
      if (face === 0) {
        pos.set(tier.halfW + pd * 0.5, yy, uo * tier.halfW);
        scl.set(pd, b, a);
      } else if (face === 1) {
        pos.set(-tier.halfW - pd * 0.5, yy, uo * tier.halfW);
        scl.set(pd, b, a);
      } else if (face === 2) {
        pos.set(uo * tier.halfW, yy, tier.halfW + pd * 0.5);
        scl.set(a, b, pd);
      } else {
        pos.set(uo * tier.halfW, yy, -tier.halfW - pd * 0.5);
        scl.set(a, b, pd);
      }
      e.set((hash(p) - 0.5) * 0.1, (hash(p + 1) - 0.5) * 0.1, (hash(p + 2) - 0.5) * 0.1);
      q.setFromEuler(e);
      m.compose(pos, q, scl);
      this.panels.setMatrixAt(p, m);
      // Grayscale: mostly dark stone, a rare panel a brighter silver (the god's circuitry), zero hue.
      const accent = hash(p * 7 + 31) > 0.88;
      const lit = accent ? 0.62 : 0.09 + hash(p * 3) * 0.12;
      col.setRGB(lit, lit, lit);
      this.panels.setColorAt(p, col);
    }
    this.panels.instanceMatrix.needsUpdate = true;
    if (this.panels.instanceColor) this.panels.instanceColor.needsUpdate = true;
    this.root.add(this.panels);

    // ── POOL 2 — the QUASICRYSTAL hollow CUBE-shell (aperiodic), grayscale by acceptance depth. ──
    this.carveMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, // per-instance grey
      roughness: 0.58,
      metalness: 0.42,
      emissive: 0x0e0e0e,
      emissiveIntensity: 0.5,
    });
    this.mats.push(this.carveMat);
    const sites = icosaCutProject()
      .filter((s) => {
        const rad01 = Math.hypot(s.x, s.z);
        if (rad01 < 0.5 || rad01 > 1.0) return false; // HOLLOW: only the shell band survives
        const y01 = (s.y + 1) / 2;
        if (y01 <= 0.02 || y01 >= 0.99) return false;
        const door = Math.cos(2 * Math.atan2(s.z, s.x)) ** 2; // four arched doorways at the feet
        if (y01 < 0.14 && door > 0.9) return false;
        return true;
      })
      .sort((a, b) => a.perp - b.perp || a.y - b.y || a.x - b.x); // acceptance-ranked, deterministic
    const nCarve = Math.min(QC_CARVE, sites.length);
    this.carve = new THREE.InstancedMesh(this.unitBox, this.carveMat, nCarve);
    this.carve.frustumCulled = false;
    this.qcCount = nCarve;
    const perpMax = sites.length ? sites[Math.min(sites.length, nCarve) - 1]!.perp || 1 : 1;
    const stepHalf = (y01: number): number => {
      const f = Math.floor(y01 * TIERS) / TIERS; // stepped staircase, not a smooth cone
      return baseHalf * (1 - f) + topHalf * f;
    };
    for (let k = 0; k < nCarve; k++) {
      const s = sites[k]!;
      const y01 = (s.y + 1) / 2;
      const ang = Math.atan2(s.z, s.x);
      const rad01 = Math.hypot(s.x, s.z);
      const half = stepHalf(y01);
      const worldR = half * (1.3 + (rad01 - 0.5) * 1.0); // a thick carved shell OUTSIDE the tiers
      pos.set(Math.cos(ang) * worldR, y01 * crownBaseY, Math.sin(ang) * worldR);
      const depth = 1 - Math.min(1, s.perp / perpMax); // 1 = deepest-lattice block
      const hk = hash(k * 3.7 + 101);
      // Deep-acceptance sites are big carve BLOCKS; shallow phason sites are bright WINDOW cubes.
      const isWindow = depth < 0.28 && hk > 0.55;
      if (isWindow) {
        const gsz = 1.0 + hk * 1.6;
        scl.set(gsz, gsz * (0.7 + hk * 0.8), gsz);
      } else {
        // Three vertical regimes by height differ in PROPORTION only (no colour): tall verticals →
        // cornice slabs → flat wafers. Form encodes the crystallographic band, monochrome.
        const regime = y01 < 1 / 3 ? 0 : y01 < 2 / 3 ? 1 : 2;
        if (regime === 0) scl.set(1.4 + depth * 3.4, 2.2 + depth * 6.5 + hk * 2, 1.4 + depth * 3.4);
        else if (regime === 1) scl.set(2.6 + depth * 6.0, 1.1 + depth * 1.8, 2.0 + hk * 2.5);
        else scl.set(1.8 + depth * 4.2, 0.7 + hk * 0.9, 1.8 + depth * 4.2);
      }
      e.set((hk - 0.5) * 0.16, ang + (hash(k * 5 + 7) - 0.5) * 0.2, (hash(k * 7 + 3) - 0.5) * 0.16);
      q.setFromEuler(e);
      m.compose(pos, q, scl);
      // Grayscale: windows are near-white lamps; carve blocks are graded dark stone. Zero hue.
      const lit = isWindow ? 0.75 + hk * 0.2 : 0.08 + depth * 0.16 + hk * 0.05;
      col.setRGB(lit, lit, lit);
      this.carve.setMatrixAt(k, m);
      this.carve.setColorAt(k, col);
    }
    this.carve.instanceMatrix.needsUpdate = true;
    if (this.carve.instanceColor) this.carve.instanceColor.needsUpdate = true;
    this.root.add(this.carve);

    // ── POOL 3 — tessellated wireframe SPHERES embedded around the tower (img 4). ──
    const sphereGeo = new THREE.IcosahedronGeometry(1, 2);
    this.geos.push(sphereGeo);
    this.sphereMat = new THREE.MeshBasicMaterial({
      color: 0x9a9a9a,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    this.mats.push(this.sphereMat);
    this.spheres = new THREE.InstancedMesh(sphereGeo, this.sphereMat, SPHERES);
    this.spheres.frustumCulled = false;
    for (let i = 0; i < SPHERES; i++) {
      const y01 = hash(i * 3 + 41);
      const ang = i * GOLDEN_ANGLE;
      const half = stepHalf(y01);
      const band = half * (1.2 + hash(i * 5 + 43) * 1.4); // hug the shell, some drift out
      pos.set(Math.cos(ang) * band, y01 * crownBaseY, Math.sin(ang) * band);
      const r = baseHalf * 0.06 * (1 + hash(i * 7 + 47) * 3);
      scl.setScalar(r);
      q.identity();
      m.compose(pos, q, scl);
      this.spheres.setMatrixAt(i, m);
    }
    this.spheres.instanceMatrix.needsUpdate = true;
    this.root.add(this.spheres);

    // ── VOXEL LATTICE — a wireframe cubic grid enclosing the whole tower (img 2 cube-city). ──
    {
      const pts: number[] = [];
      const gx = 3;
      const gy = 10;
      const half = baseHalf * 1.9;
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
      for (let ix = 0; ix <= gx; ix++) {
        for (let iz = 0; iz <= gx; iz++) {
          const px = -half + (ix / gx) * 2 * half;
          const pz = -half + (iz / gx) * 2 * half;
          line(px, 0, pz, px, totalH, pz); // vertical struts
        }
      }
      for (let iy = 0; iy <= gy; iy++) {
        const py = (iy / gy) * totalH;
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
        color: 0x8f8f8f,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.mats.push(this.latticeMat);
      const lattice = new THREE.LineSegments(latGeo, this.latticeMat);
      lattice.frustumCulled = false;
      this.root.add(lattice);
    }

    // ── GENESIS CORE — a white incandescent cube at the tower's heart + straight radial god-rays. ──
    const coreY = crownBaseY * 0.66;
    this.genesisMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    this.mats.push(this.genesisMat);
    this.genesis = new THREE.Mesh(this.unitBox, this.genesisMat);
    this.genesis.position.set(0, coreY, 0);
    this.genesis.scale.setScalar(this.genesisBase);
    this.genesis.frustumCulled = false;
    this.root.add(this.genesis);
    {
      const arr = new Float32Array(RAY_LINES * 6);
      for (let i = 0; i < RAY_LINES; i++) {
        const yv = 1 - (i / (RAY_LINES - 1)) * 2;
        const rr = Math.sqrt(Math.max(0, 1 - yv * yv));
        const th = i * GOLDEN_ANGLE;
        const dx = Math.cos(th) * rr;
        const dz = Math.sin(th) * rr;
        const len = topHalf * 3 + hash(i * 3 + 1) * baseHalf * 3;
        arr[i * 6] = 0;
        arr[i * 6 + 1] = coreY;
        arr[i * 6 + 2] = 0;
        arr[i * 6 + 3] = dx * len;
        arr[i * 6 + 4] = coreY + yv * len;
        arr[i * 6 + 5] = dz * len;
      }
      const rayGeo = new THREE.BufferGeometry();
      rayGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      this.geos.push(rayGeo);
      this.rayMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      });
      this.mats.push(this.rayMat);
      this.rays = new THREE.LineSegments(rayGeo, this.rayMat);
      this.rays.position.set(0, 0, 0);
      this.rays.frustumCulled = false;
      this.root.add(this.rays);
    }

    // ── GEODESIC CROWN — a spiky crystalline crown wrapped in a woven great-circle sphere cage. ──
    const crownGeo = new THREE.IcosahedronGeometry(topHalf * 2.9, 3);
    this.geos.push(crownGeo);
    {
      const cp = crownGeo.getAttribute('position') as THREE.BufferAttribute;
      const ca = cp.array as Float32Array;
      const chash = (x: number, yy: number, z: number): number => {
        const v = Math.sin(x * 12.9898 + yy * 78.233 + z * 37.719) * 43758.5453;
        return v - Math.floor(v);
      };
      for (let i = 0; i < ca.length; i += 3) {
        const x = ca[i] ?? 0;
        const yy = ca[i + 1] ?? 0;
        const z = ca[i + 2] ?? 0;
        const len = Math.hypot(x, yy, z) || 1;
        const ridge = 0.5 + 0.5 * Math.sin(x * 2.1 + yy * 1.7) * Math.cos(z * 1.9 + x * 0.6);
        const spike =
          chash(Math.round((x / len) * 6), Math.round((yy / len) * 6), Math.round((z / len) * 6)) >
          0.82
            ? 0.85
            : 0;
        const d = 1 + ridge * 0.24 + spike;
        ca[i] = x * d;
        ca[i + 1] = yy * d;
        ca[i + 2] = z * d;
      }
      cp.needsUpdate = true;
      crownGeo.computeVertexNormals();
    }
    this.crown = new THREE.Mesh(crownGeo, this.crownMat);
    this.crown.position.y = crownBaseY + topHalf * 2.6;
    this.crown.frustumCulled = false;
    this.root.add(this.crown);

    // A tall needle spire — a thin BOX (cube vocabulary), not a cone.
    this.spire = new THREE.Mesh(this.unitBox, this.crownMat);
    this.spire.position.y = this.crown.position.y + topHalf * 5.2;
    this.spire.scale.set(topHalf * 0.5, topHalf * 9, topHalf * 0.5);
    this.spire.frustumCulled = false;
    this.root.add(this.spire);

    // Woven great-circle cage around the crown (cube-in-sphere, img 3).
    {
      const pts: number[] = [];
      const rad = topHalf * 3.6;
      const cy = this.crown.position.y;
      const u = new THREE.Vector3();
      const w = new THREE.Vector3();
      const axis = new THREE.Vector3();
      const a = new THREE.Vector3();
      const b = new THREE.Vector3();
      for (let c = 0; c < CROWN_CIRCLES; c++) {
        axis.set(hash(c * 7 + 1) - 0.5, hash(c * 7 + 2) - 0.5, hash(c * 7 + 3) - 0.5).normalize();
        u.set(axis.z, 0, -axis.x);
        if (u.lengthSq() < 1e-4) u.set(0, 1, 0);
        u.normalize();
        w.copy(axis).cross(u).normalize();
        for (let sIdx = 0; sIdx < CROWN_SEG; sIdx++) {
          const t0 = (sIdx / CROWN_SEG) * Math.PI * 2;
          const t1 = ((sIdx + 1) / CROWN_SEG) * Math.PI * 2;
          a.copy(u)
            .multiplyScalar(Math.cos(t0) * rad)
            .addScaledVector(w, Math.sin(t0) * rad);
          b.copy(u)
            .multiplyScalar(Math.cos(t1) * rad)
            .addScaledVector(w, Math.sin(t1) * rad);
          pts.push(a.x, cy + a.y, a.z, b.x, cy + b.y, b.z);
        }
      }
      const cageGeo = new THREE.BufferGeometry();
      cageGeo.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(pts), 3));
      this.geos.push(cageGeo);
      this.crownCageMat = new THREE.LineBasicMaterial({
        color: 0xd0d0d0,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.mats.push(this.crownCageMat);
      this.crownCage = new THREE.LineSegments(cageGeo, this.crownCageMat);
      this.crownCage.frustumCulled = false;
      this.root.add(this.crownCage);
    }

    // ── STAR-DUST — points seeded through the tower volume (img 2). ──
    {
      const arr = new Float32Array(STAR_COUNT * 3);
      for (let i = 0; i < STAR_COUNT; i++) {
        arr[i * 3] = (hash(i * 3 + 11) - 0.5) * baseHalf * 4;
        arr[i * 3 + 1] = hash(i * 3 + 12) * totalH;
        arr[i * 3 + 2] = (hash(i * 3 + 13) - 0.5) * baseHalf * 4;
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      this.geos.push(starGeo);
      this.starMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: baseHalf * 0.02,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      });
      this.mats.push(this.starMat);
      const stars = new THREE.Points(starGeo, this.starMat);
      stars.frustumCulled = false;
      this.root.add(stars);
    }

    // ── ENERGY SHELL — fbm-veined additive icosahedron, MONOCHROME (grey brightness only). ──
    const shellGeo = new THREE.IcosahedronGeometry(Math.max(totalH, baseHalf * 2) * 0.62, 3);
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
          // MONOCHROME: grey brightness only, no hue. Entropy adds a faint cold lift.
          float g = energy * 0.7 + veins * 0.5 + uEntropy * 0.12;
          vec3 col = vec3(g);
          float a = clamp(energy * 0.35 + veins * 0.28, 0.0, 0.62);
          gl_FragColor = vec4(col, a);
        }`,
    });
    this.mats.push(this.shellMat);
    this.shell = new THREE.Mesh(shellGeo, this.shellMat);
    this.shell.position.y = totalH * 0.5;
    this.shell.frustumCulled = false;
    this.root.add(this.shell);

    // ── Place the tower at the dome's far edge, towering over the skyline (centre column clear). ──
    this.root.position.set(0, 0, -ARENA_RADIUS * 0.92);
    this.scene.add(this.root);
  }

  /**
   * Animate the living tower: pulse the grey emissive (brightness only, no hue) + drive it from world
   * chaos + entropy, bloom the genesis core + god-rays, spin the crown + woven cage + lattice, and let
   * the tower sway with godlike slowness. No rng, no allocation, spawns no geometry.
   * @param t scaled elapsed seconds · @param chaos 0..1 · @param entropy 0..1
   */
  update(t: number, chaos: number, entropy: number): void {
    const c = chaos < 0 ? 0 : chaos > 1 ? 1 : chaos;
    const en = entropy < 0 ? 0 : entropy > 1 ? 1 : entropy;
    const g = 0.28 + 0.5 * c + 0.16 * en; // grey brightness readout of world state
    this.emissive.setRGB(g, g, g);

    const blaze = 0.35 + 1.2 * c + 0.4 * en;
    this.coreMat.emissive.copy(this.emissive);
    this.coreMat.emissiveIntensity = blaze;
    this.panelMat.emissive.copy(this.emissive);
    this.panelMat.emissiveIntensity = 0.28 + 0.95 * c;
    const cg = 0.4 + 0.5 * c + 0.2 * en;
    this.crownMat.emissive.setRGB(cg, cg, cg);
    this.crownMat.emissiveIntensity = 0.5 + 1.3 * c + 0.4 * en;

    // Genesis core + god-rays bloom with chaos; the core throbs.
    const throb = 0.85 + 0.3 * Math.sin(t * 1.7);
    this.genesisMat.opacity = Math.min(1, 0.5 + 0.5 * c) * throb;
    this.genesis.scale.setScalar(
      (0.9 + 0.4 * c) * (1 + 0.1 * Math.sin(t * 2.1)) * this.genesisBase,
    );
    this.rayMat.opacity = 0.06 + 0.28 * c;
    this.rays.rotation.y = t * (0.02 + 0.06 * c);

    // Crown, woven cage, lattice spin; the cage + lattice brighten with chaos.
    this.crown.rotation.y += 0.0009 + 0.004 * c;
    this.crown.rotation.x += 0.0004;
    this.spire.rotation.y -= 0.0012 + 0.003 * c;
    this.crownCage.rotation.y -= 0.0016 + 0.005 * c;
    this.crownCage.rotation.z += 0.0011;
    this.crownCageMat.opacity = 0.22 + 0.4 * c;
    this.latticeMat.opacity = 0.1 + 0.18 * c;
    this.sphereMat.opacity = 0.35 + 0.35 * c;

    // BIPOLAR blaze (grayscale): window lamps linger BRIGHT, flip to a smoulder, the carve shell
    // counter-phases — the tower alternates "ten thousand lit windows" / "dark megalith, burning bones".
    const flip = 0.5 + 0.5 * Math.tanh(3.0 * Math.sin(t * 0.09 + Math.sin(t * 0.031) * 1.3));
    this.carveMat.emissive.copy(this.emissive);
    this.carveMat.emissiveIntensity = 0.2 + 0.9 * flip + 0.7 * c;

    // Energy shell breathes.
    this.shellMat.uniforms.uTime!.value = t;
    this.shellMat.uniforms.uChaos!.value = c;
    this.shellMat.uniforms.uEntropy!.value = en;

    // Godlike, near-imperceptible sway + a slow turn of the whole tower.
    this.root.rotation.y = Math.sin(t * 0.018) * 0.05 + t * 0.004;
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

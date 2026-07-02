/**
 * GOD-COLOSSUS (V110) — the ONE massive super-god-tier structure that dominates the skyline.
 *
 * A single colossal tiered god-spire looming at the dome's far edge (Galactus / Dr-Manhattan /
 * Thanos scale): 16 tapering stacked tiers encrusted with ~2400 instanced greeble panels, a faceted
 * "godhead" crown ringed by three orbiting halos, two outstretched buttress-arms for a figure
 * silhouette, and a fbm "living-skin" energy shell enveloping the whole monument. It towers far above
 * the {@link ARENA_RADIUS} dome so it reads as an incomprehensible god, not set dressing.
 *
 * LIVING SKIN (defensible, not decoration): the monument is NEVER static — the structural emissive
 * cycles a slow "schizophrenic" hue while its intensity is a monotone readout of world chaos +
 * entropy (pin both to 0 and the god cools to dead stone; agitate them and it blazes and writhes).
 * The energy shell's fbm veins flow with time and bloom with chaos. The crown + halos counter-rotate.
 *
 * DETERMINISM (ADR 0004): every position + per-panel param comes from a pure positional hash — ZERO
 * rng draws, no Date.now — boot-stream-neutral additive scene dressing (like {@link FloatingMonoliths}
 * / GoldLattice). It READS world chaos/entropy but never writes sim state, so the population golden
 * replay stays byte-identical.
 */
import * as THREE from 'three';
import { ARENA_RADIUS } from './constants';

/** Tapering stacked tiers forming the colossal spire. */
const TIERS = 16;
/** Instanced greeble panels encrusting the tier faces (telemetry-checked). */
const PANELS = 2400;
/** Three orbiting halo rings around the godhead crown. */
const RINGS = 3;
/** V122 (USER #11): quasicrystal carve artifacts — hollow-shell blocks + window lamps. With PANELS
 *  the TOWER carries ~12,000 individually-varied instanced artifacts across 3 draw calls. */
const QC_CARVE = 7200;
const QC_GLOW = 2400;
/** 6D lattice search range (±) for the cut-and-project — 9^6 combos scanned once at boot. */
const QC_RANGE = 4;
/** Par-space ball radius kept (pre-normalisation) — bounds the projected point cloud. */
const QC_PAR_BALL = 6.5;

/** Golden ratio — the icosahedral quasicrystal's one true constant. */
const PHI = (1 + Math.sqrt(5)) / 2;

/**
 * V122 (USER #11): ICOSAHEDRAL CUT-AND-PROJECT — the aperiodic bones of the tower.
 *
 * A 6D integer lattice Z⁶ is projected through the icosahedral basis into two 3-spaces: PAR
 * (physical) and PERP (the phason / acceptance space). Sites whose PERP image sits nearest the
 * origin are the true quasicrystal — a point set with perfect icosahedral long-range order and NO
 * repeating unit cell (aperiodic forever: the structure literally never repeats, which is the
 * "geometry only an AI would understand" ask made real math). The PERP norm is returned with each
 * site so the caller can rank by acceptance (small = deep-lattice block, large = phason-excited
 * lamp) — the SAME coordinate crystallographers use, driving which sites become windows.
 * Deterministic, zero rng. O(QC_RANGE⁶) once at boot.
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
  private readonly coreMat: THREE.MeshStandardMaterial;
  private readonly panelMat: THREE.MeshStandardMaterial;
  private readonly crownMat: THREE.MeshStandardMaterial;
  private readonly ringMat: THREE.MeshStandardMaterial;
  private readonly shellMat: THREE.ShaderMaterial;
  private readonly crownGeo: THREE.BufferGeometry;
  private readonly ringGeos: THREE.BufferGeometry[] = [];
  private readonly shellGeo: THREE.BufferGeometry;
  private readonly spireGeo: THREE.BufferGeometry;
  private readonly panels: THREE.InstancedMesh;
  private readonly crown: THREE.Mesh;
  private readonly spire: THREE.Mesh;
  private readonly rings: THREE.Mesh[] = [];
  private readonly shell: THREE.Mesh;
  /** V122: the quasicrystal hollow-shell pools (carve blocks + window lamps). */
  private carve!: THREE.InstancedMesh;
  private glow!: THREE.InstancedMesh;
  private carveMat!: THREE.MeshStandardMaterial;
  private glowMat!: THREE.MeshBasicMaterial;
  /** V122: quasicrystal artifacts actually placed (telemetry/tests). */
  qcCount = 0;
  /** Total greeble panels placed (telemetry/tests). */
  readonly panelCount = PANELS;
  /** V122: every individually-varied artifact on the monument (panels + carve + lamps). */
  get artifactCount(): number {
    return PANELS + this.qcCount;
  }
  /** Base/structural hue the schizophrenic shift rotates around. */
  private hue = 0.74;
  private readonly emissiveColor = new THREE.Color();
  private readonly shellHue = new THREE.Color();

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // ── Materials. The structural skin is dark with a strong emissive the update() hue-shifts. ──
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0x07060f,
      roughness: 0.5,
      metalness: 0.62,
      emissive: 0x160a26,
      emissiveIntensity: 0.6,
    });
    this.panelMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, // per-instance via instanceColor
      roughness: 0.66,
      metalness: 0.4,
      emissive: 0x140a22,
      emissiveIntensity: 0.45,
    });
    this.crownMat = new THREE.MeshStandardMaterial({
      color: 0x0a0814,
      roughness: 0.28,
      metalness: 0.85,
      emissive: 0x2a1248,
      emissiveIntensity: 0.9,
    });
    this.ringMat = new THREE.MeshStandardMaterial({
      color: 0x12101c,
      roughness: 0.2,
      metalness: 0.95,
      emissive: 0x3a1c64,
      emissiveIntensity: 1.1,
    });

    // ── Geometry: the tapering tiers. Base wide, crown narrow; total height >> ARENA_RADIUS. ──
    const baseHalf = ARENA_RADIUS * 0.16; // ~52 half-width at the foot
    const topHalf = ARENA_RADIUS * 0.035; // ~11 half-width at the shoulders
    const tierH = ARENA_RADIUS * 0.085; // ~28 per tier → ~440 tall before the crown
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
      // Slight per-tier twist + jitter so the spire reads hand-built and unsettling, not a clean stack.
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

    // ── Greeble shell: ONE instanced mesh, panels scattered over every tier's four faces. ──
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
      const face = Math.floor(hash(p * 2.3 + 11) * 4); // 0..3 : ±x ±z (the four vertical faces)
      const pd = 0.6 + hash(p * 5 + 7) * 3.2; // protrusion depth
      const a = 1.0 + hash(p * 6 + 13) * 5.0; // in-face size a
      const b = 1.0 + hash(p * 9 + 17) * tier.halfH * 0.8; // in-face size b (vertical)
      const vo = (hash(p * 4 + 29) - 0.5) * 1.7; // vertical offset within the tier
      const uo = (hash(p * 3 + 23) - 0.5) * 1.7; // lateral offset along the face
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
      // Mostly dark stone with rare blazing veins — the accents trace the god's "circuitry".
      const accent = hash(p * 7 + 31) > 0.88;
      if (accent) col.setHSL((this.hue + hash(p) * 0.25) % 1, 0.95, 0.55);
      else col.setHSL((0.7 + hash(p * 2) * 0.14) % 1, 0.35, 0.1 + hash(p * 3) * 0.12);
      this.panels.setColorAt(p, col);
    }
    this.panels.instanceMatrix.needsUpdate = true;
    if (this.panels.instanceColor) this.panels.instanceColor.needsUpdate = true;
    this.root.add(this.panels);

    // ── V122 (USER #11): the QUASICRYSTAL CARVE — a HOLLOW aperiodic shell wrapping the whole
    //    spire. Sites come from the icosahedral cut-and-project (no repeating unit cell, perfect
    //    long-range order); the shell keeps only sites in a radial band OUTSIDE the tiers, so the
    //    gap between core and shell is a real carved hollow. Four arched doorways open the base.
    //    THREE regimes stack by height — HINDU gopuram golds, KOREAN dancheong bands, CHIPLET
    //    trace-glow substrate — and the site's PERP (phason) coordinate decides its role: deep
    //    acceptance = a big carve block, shallow = a window lamp. ~9,600 artifacts, 2 draw calls. ──
    this.carveMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, // per-instance
      roughness: 0.58,
      metalness: 0.42,
      emissive: 0x0c0616,
      emissiveIntensity: 0.5,
    });
    this.glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); // per-instance × scalar blaze
    const sites = icosaCutProject()
      .filter((s) => {
        const rad01 = Math.hypot(s.x, s.z);
        if (rad01 < 0.5 || rad01 > 1.0) return false; // HOLLOW: only the shell band survives
        const y01 = (s.y + 1) / 2;
        if (y01 <= 0.02 || y01 >= 0.99) return false;
        // Four arched doorways at the cardinal feet — the hollow interior is enterable, not sealed.
        const door = Math.cos(2 * Math.atan2(s.z, s.x)) ** 2;
        if (y01 < 0.14 && door > 0.9) return false;
        return true;
      })
      .sort((a, b) => a.perp - b.perp || a.y - b.y || a.x - b.x); // acceptance-ranked, fully deterministic
    const nCarve = Math.min(QC_CARVE, sites.length);
    const nGlow = Math.min(QC_GLOW, Math.max(0, sites.length - nCarve));
    this.carve = new THREE.InstancedMesh(this.unitBox, this.carveMat, nCarve);
    this.glow = new THREE.InstancedMesh(this.unitBox, this.glowMat, nGlow);
    this.carve.frustumCulled = false;
    this.glow.frustumCulled = false;
    this.qcCount = nCarve + nGlow;
    const perpMax = sites.length ? sites[Math.min(sites.length, nCarve + nGlow) - 1]!.perp || 1 : 1;
    const stepHalf = (y01: number): number => {
      const f = Math.floor(y01 * TIERS) / TIERS; // gopuram staircase, not a smooth cone
      return baseHalf * (1 - f) + topHalf * f;
    };
    for (let k = 0; k < nCarve + nGlow; k++) {
      const s = sites[k]!;
      const isGlow = k >= nCarve;
      const y01 = (s.y + 1) / 2;
      const ang = Math.atan2(s.z, s.x);
      const rad01 = Math.hypot(s.x, s.z); // 0.5..1 in the shell band
      const half = stepHalf(y01);
      const worldR = half * (1.3 + (rad01 - 0.5) * 1.0); // 1.3×..1.8× the tier — a thick carved shell
      pos.set(Math.cos(ang) * worldR, y01 * crownBaseY, Math.sin(ang) * worldR);
      // Acceptance depth (0 = deepest lattice) drives SIZE — the crystallographic coordinate as form.
      const depth = 1 - Math.min(1, s.perp / perpMax);
      const regime = y01 < 1 / 3 ? 0 : y01 < 2 / 3 ? 1 : 2; // HINDU · DANCHEONG · CHIPLET
      const hk = hash(k * 3.7 + 101);
      if (isGlow) {
        const g = 0.8 + depth * 1.6;
        scl.set(g, g * (0.7 + hk * 0.8), g);
      } else if (regime === 0) {
        scl.set(1.4 + depth * 3.4, 2.2 + depth * 6.5 + hk * 2, 1.4 + depth * 3.4); // gopuram verticals
      } else if (regime === 1) {
        scl.set(2.6 + depth * 6.0, 1.1 + depth * 1.8, 2.0 + hk * 2.5); // dancheong cornice slabs
      } else {
        scl.set(1.8 + depth * 4.2, 0.7 + hk * 0.9, 1.8 + depth * 4.2); // chiplet pin-grid wafers
      }
      e.set((hk - 0.5) * 0.16, ang + (hash(k * 5 + 7) - 0.5) * 0.2, (hash(k * 7 + 3) - 0.5) * 0.16);
      q.setFromEuler(e);
      m.compose(pos, q, scl);
      // Palette per regime — dark base + bright accents (the art-direction law), never flat TRON.
      if (regime === 0) {
        // HINDU gopuram: saffron / gold / vermillion, deep red accents.
        const acc = hk > 0.78;
        col.setHSL(
          acc ? 0.015 : 0.06 + hash(k * 11 + 5) * 0.07,
          0.88,
          acc ? 0.42 : 0.3 + hk * 0.22,
        );
      } else if (regime === 1) {
        // KOREAN dancheong: the five-colour obangsaek bands (green · cobalt · red · gold · white).
        const p5 = Math.floor(hash(k * 13 + 17) * 5);
        if (p5 === 0) col.setHSL(0.36, 0.75, 0.3);
        else if (p5 === 1) col.setHSL(0.58, 0.8, 0.34);
        else if (p5 === 2) col.setHSL(0.995, 0.82, 0.34);
        else if (p5 === 3) col.setHSL(0.12, 0.85, 0.42);
        else col.setHSL(0.12, 0.06, 0.8);
      } else {
        // CHIPLET: near-black substrate with cyan/magenta trace lights.
        const trace = hk > 0.72;
        col.setHSL(
          trace ? (hash(k * 17 + 23) > 0.5 ? 0.5 : 0.87) : 0.62,
          trace ? 0.95 : 0.15,
          trace ? 0.5 : 0.07,
        );
      }
      if (isGlow) {
        // Lamps brighten their regime hue — the tower's thousands of lit windows.
        col.offsetHSL(0, 0.05, 0.22);
        this.glow.setMatrixAt(k - nCarve, m);
        this.glow.setColorAt(k - nCarve, col);
      } else {
        this.carve.setMatrixAt(k, m);
        this.carve.setColorAt(k, col);
      }
    }
    this.carve.instanceMatrix.needsUpdate = true;
    if (this.carve.instanceColor) this.carve.instanceColor.needsUpdate = true;
    this.glow.instanceMatrix.needsUpdate = true;
    if (this.glow.instanceColor) this.glow.instanceColor.needsUpdate = true;
    this.root.add(this.carve);
    this.root.add(this.glow);

    // ── Outstretched buttress-arms (a figure silhouette) at the shoulders. ──
    const armY = crownBaseY * 0.78;
    const armLen = baseHalf * 1.6;
    for (let s = 0; s < 2; s++) {
      const arm = new THREE.Mesh(this.unitBox, this.coreMat);
      const dir = s === 0 ? 1 : -1;
      arm.position.set(dir * (topHalf + armLen * 0.5), armY, 0);
      arm.rotation.z = dir * -0.5;
      arm.scale.set(armLen, topHalf * 1.3, topHalf * 1.3);
      arm.frustumCulled = false;
      this.root.add(arm);
    }

    // ── Godhead crown (USER: the plain "orb + ring" read as a sex-toy — now a WILDER mathematical crown):
    //    a higher-detail faceted godhead + a tall crystalline SPIRE needling into the sky, ringed by
    //    counter-rotating KNOTTED torus-knots (complex (p,q) math loops) instead of flat hoops. ──
    // USER: the smooth "ball" is out — the godhead is now a SPIKY CRYSTALLINE FRACTAL. Displace each vertex
    // along its normal by a hash-driven ridge field + occasional long spikes → sharp mathematical corona,
    // not a featureless orb. Deterministic (hash + trig of the vertex), no rng. Built once at boot.
    this.crownGeo = new THREE.IcosahedronGeometry(topHalf * 2.9, 3);
    {
      const cp = this.crownGeo.getAttribute('position') as THREE.BufferAttribute;
      const ca = cp.array as Float32Array;
      const chash = (x: number, y: number, z: number): number => {
        const v = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
        return v - Math.floor(v);
      };
      for (let i = 0; i < ca.length; i += 3) {
        const x = ca[i] ?? 0;
        const y = ca[i + 1] ?? 0;
        const z = ca[i + 2] ?? 0;
        const len = Math.hypot(x, y, z) || 1;
        const ridge = 0.5 + 0.5 * Math.sin(x * 2.1 + y * 1.7) * Math.cos(z * 1.9 + x * 0.6);
        const spike =
          chash(Math.round((x / len) * 6), Math.round((y / len) * 6), Math.round((z / len) * 6)) >
          0.82
            ? 0.85
            : 0;
        const d = 1 + ridge * 0.24 + spike; // ridges everywhere + occasional long crystalline spikes
        ca[i] = x * d;
        ca[i + 1] = y * d;
        ca[i + 2] = z * d;
      }
      cp.needsUpdate = true;
      this.crownGeo.computeVertexNormals();
    }
    this.crown = new THREE.Mesh(this.crownGeo, this.crownMat);
    this.crown.position.y = crownBaseY + topHalf * 2.6;
    this.crown.frustumCulled = false;
    this.root.add(this.crown);

    // A tall crystalline spire above the crown — the monument needles far up into space.
    this.spireGeo = new THREE.ConeGeometry(topHalf * 0.7, topHalf * 9, 6, 1);
    this.spire = new THREE.Mesh(this.spireGeo, this.crownMat);
    this.spire.position.y = this.crown.position.y + topHalf * 5.2;
    this.spire.frustumCulled = false;
    this.root.add(this.spire);

    for (let r = 0; r < RINGS; r++) {
      // Knotted mathematical loop (p,q vary per ring) — reads as a wild orbital lattice, not a flat hoop.
      const rg = new THREE.TorusKnotGeometry(
        topHalf * (3.0 + r * 1.4),
        topHalf * 0.11,
        140,
        10,
        2 + r,
        3 + r,
      );
      this.ringGeos.push(rg);
      const ring = new THREE.Mesh(rg, this.ringMat);
      ring.position.y = this.crown.position.y;
      ring.rotation.x = Math.PI * 0.5 * hash(r * 13 + 4) + r * 0.6;
      ring.rotation.y = hash(r * 17 + 5) * Math.PI;
      ring.frustumCulled = false;
      this.rings.push(ring);
      this.root.add(ring);
    }

    // ── Living-skin energy shell: a big fbm-veined additive icosahedron enveloping the monument. ──
    const totalH = crownBaseY + topHalf * 5;
    this.shellGeo = new THREE.IcosahedronGeometry(Math.max(totalH, baseHalf * 2) * 0.62, 3);
    this.shellMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      uniforms: {
        uTime: { value: 0 },
        uChaos: { value: 0 },
        uEntropy: { value: 0 },
        uHue: { value: new THREE.Color(0.4, 0.2, 0.9) },
      },
      vertexShader: `
        varying vec3 vP;
        void main() {
          vP = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        precision highp float;
        uniform float uTime; uniform float uChaos; uniform float uEntropy; uniform vec3 uHue;
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
          vec3 col = uHue * (energy * 0.7 + veins * 0.5) + vec3(0.08, 0.04, 0.16) * uEntropy * 0.35;
          float a = clamp(energy * 0.35 + veins * 0.28, 0.0, 0.62);
          gl_FragColor = vec4(col, a);
        }`,
    });
    this.shell = new THREE.Mesh(this.shellGeo, this.shellMat);
    this.shell.position.y = totalH * 0.5;
    this.shell.frustumCulled = false;
    this.root.add(this.shell);

    // ── Place the colossus at the dome's far edge, towering over the skyline (centre column clear). ──
    this.root.position.set(0, 0, -ARENA_RADIUS * 0.92);
    this.scene.add(this.root);
  }

  /**
   * Animate the living skin: hue-shift the structural emissive (a slow "schizophrenic" rotation),
   * drive its intensity + the energy shell from world chaos + entropy, counter-rotate the crown +
   * halos, and let the colossus sway with godlike, almost-imperceptible slowness. O(RINGS). No rng,
   * no allocation, spawns no geometry.
   * @param t scaled elapsed seconds · @param chaos 0..1 · @param entropy 0..1
   */
  update(t: number, chaos: number, entropy: number): void {
    const c = chaos < 0 ? 0 : chaos > 1 ? 1 : chaos;
    const en = entropy < 0 ? 0 : entropy > 1 ? 1 : entropy;
    // Schizophrenic hue drift — the god never wears the same face twice.
    const h = (this.hue + t * 0.012 + c * 0.18) % 1;
    this.emissiveColor.setHSL(h, 0.7, 0.32 + 0.18 * c);
    // USER #11: intensities capped so the colossus stays a silhouette against the dome, not a flare.
    const blaze = 0.35 + 1.2 * c + 0.4 * en;
    this.coreMat.emissive.copy(this.emissiveColor);
    this.coreMat.emissiveIntensity = blaze;
    this.panelMat.emissive.copy(this.emissiveColor);
    this.panelMat.emissiveIntensity = 0.28 + 0.95 * c;
    this.crownMat.emissive.setHSL((h + 0.5) % 1, 0.85, 0.4 + 0.2 * c);
    this.crownMat.emissiveIntensity = 0.5 + 1.3 * c + 0.4 * en;
    this.ringMat.emissiveIntensity = 0.6 + 1.5 * c;

    // Crown + halos counter-rotate; faster as the world agitates.
    this.crown.rotation.y += 0.0009 + 0.004 * c;
    this.crown.rotation.x += 0.0004;
    this.spire.rotation.y -= 0.0012 + 0.003 * c; // the needle counter-spins into the sky
    for (let i = 0; i < this.rings.length; i++) {
      const ring = this.rings[i]!;
      const dir = i % 2 === 0 ? 1 : -1;
      ring.rotation.z += dir * (0.002 + 0.01 * c);
      ring.rotation.y += dir * 0.0015;
    }

    // V122 (USER #11): the BIPOLAR blaze — a tanh-sharpened slow flip (the schizo switch): the
    // window lamps linger BRIGHT, cross fast to a smoulder, linger, flip back; the carve shell's
    // emissive counter-phases so the tower alternates between "ten thousand lit windows" and
    // "dark megalith with burning bones". Chaos raises both poles — a real world coupling.
    const flip = 0.5 + 0.5 * Math.tanh(3.0 * Math.sin(t * 0.09 + Math.sin(t * 0.031) * 1.3));
    this.glowMat.color.setScalar(0.3 + 1.5 * flip + 0.8 * c);
    this.carveMat.emissive.copy(this.emissiveColor);
    this.carveMat.emissiveIntensity = 0.2 + 0.9 * (1 - flip) + 0.7 * c;

    // Energy shell breathes.
    this.shellMat.uniforms.uTime!.value = t;
    this.shellMat.uniforms.uChaos!.value = c;
    this.shellMat.uniforms.uEntropy!.value = en;
    this.shellHue.setHSL((h + 0.12) % 1, 0.85, 0.55);
    (this.shellMat.uniforms.uHue!.value as THREE.Color).copy(this.shellHue);

    // Godlike, near-imperceptible sway + a slow turn of the whole monument.
    this.root.rotation.y = Math.sin(t * 0.018) * 0.05 + t * 0.004;
    this.root.position.y = Math.sin(t * 0.05) * 4.0;
  }

  /** Free every owned geometry + material and detach the colossus from the scene. */
  dispose(): void {
    this.scene.remove(this.root);
    this.panels.dispose();
    this.carve.dispose();
    this.glow.dispose();
    this.carveMat.dispose();
    this.glowMat.dispose();
    this.unitBox.dispose();
    this.crownGeo.dispose();
    this.spireGeo.dispose();
    for (const g of this.ringGeos) g.dispose();
    this.shellGeo.dispose();
    this.coreMat.dispose();
    this.panelMat.dispose();
    this.crownMat.dispose();
    this.ringMat.dispose();
    this.shellMat.dispose();
  }
}

/**
 * THE MECHALOGODROM (V-MECHA) — the central fusion abomination.
 *
 * Ten **bipolar-variant titan shells** spawn on a wide ring and MIGRATE to the world centre,
 * where they interpenetrate and FUSE into one hybrid, meshy, warped super-monster: a black-hole
 * SHADOW-CORE (a true light-absorbing sphere) inside a glowing event-horizon rim, wrapped in a
 * CPU-warped writhing icosahedral mass (solid emissive + additive wireframe over the SAME
 * geometry), stabbed by radial spike-arms and orbited by three counter-rotating rings. The
 * surviving variant shells fuse into a corona around it.
 *
 * "Bipolar" is literal: each variant rides a slow two-pole oscillation (a manic↔depressive swing,
 * `sin` on its own frequency) that drives its scale, hue, and the pole it leans toward — so the
 * ten are never in lockstep and the mass churns between order and chaos. The "dioramagonic
 * cosmiterally dimensionality 99 → under-Λ −10" is surfaced as the `dimension` telemetry readout:
 * a deterministic power-curve sweep from 99 down past 0 to −10 as the thing finishes fusing and
 * its "strange vast power" climbs.
 *
 * DETERMINISM (ADR 0004): this system draws **zero** rng — every position, polarity, scale, hue,
 * and warp is a pure function of the element index + the elapsed `t` / frame `dt` it is handed
 * (exactly like {@link GoldLattice} / cosmic-web / quantum-lattice). It is therefore
 * boot-stream-neutral: constructing or ticking it cannot perturb the seeded `ctx.rng` order, so
 * the golden stays byte-identical. It only READS one reactive world scalar (`setChaos`) to
 * intensify the warp/flash — a read, never a write, so the projection stays one-way.
 *
 * ROBUSTNESS: the spectacle is built from Three's built-in materials (emissive `MeshStandard`,
 * additive `MeshBasic`/`LineBasic`, wireframe overlays) + per-frame CPU vertex displacement — NO
 * hand-written fragment GLSL, so a bad driver degrades it to "faint", never to "broken" (the same
 * discipline the V11 lattices follow). The warp BufferGeometry is shared by the solid + wireframe
 * meshes, so one displacement pass updates both with no per-frame allocation.
 *
 * COMPLEXITY: O(V) per frame for the warp (V = 642 icosa-detail-3 verts) + O(1) transforms for the
 * shells/rings/spikes — a fixed, population-independent cost (≈ a few thousand float writes), so it
 * never scales with the entity count. Allocation-free hot path (module + instance scratch only).
 */
import * as THREE from 'three';
import { TAU, clamp, lerp } from '../math/scalar';
import { ARENA_RADIUS } from './constants';
import { MechaExteriorAbomination } from './creature-exterior-layers';
import {
  createMechalogodromDarkStarMaterial,
  updateDarkStarUniforms,
} from './mechalogodrom-dark-star';
import { MechalogodromSatellites } from './mechalogodrom-satellites';
import type { TsotchkeQuantumPulse } from './tsotchke-facade';

/** The ten bipolar variant shells that converge and fuse. Fixed — the corona is sized for 10. */
const VARIANT_COUNT = 10;
/** Seconds the variants take to migrate from the spawn ring to the fused centre. */
const CONVERGE_SECONDS = 8;
/** Warp icosahedron subdivision (detail 4 ⇒ 2562 vertices ⇒ a rich, cheap mandelbulb writhe). */
const WARP_DETAIL = 4;
/** Radius of the fused mass at the world centre. */
const CORE_R = 30;
/** Spawn-ring radius for the ten variants (mid-far, framing the centre). */
const RING_R = ARENA_RADIUS * 0.72;
/** Intrinsic churn rate of the god's body, DOME-INDEPENDENT (localT advances at this × real time).
 *  V109: calibrated down from 60 to 38 so the orbiting satellites and body writhe read as stately,
 *  god-tier motion rather than a frantic buzz, while still staying unmistakably alive. */
const MECHA_TIME_SCALE = 16;
const MECHA_EXTERIOR_TIME_SCALE = 0.15;
const MECHA_SATELLITE_COUNT = 400;
const MECHA_CORE_SEGMENTS = 128;
/** Elevation of the whole abomination above the arena floor. Raised so its LOWEST extent (rings/halos)
 *  clears the LV100 MONOLITH TEMPLE's lintel top (~Y 113) with margin — it floats ABOVE the temple, a
 *  structurally-sensible cosmic crown rather than a ground prop. */
const ALTITUDE = 252;
/** Mandelbulb iteration budget for the per-vertex escape proxy (power-8 lobes; NaN-guarded). */
const BULB_ITERS = 4;

/** Read-only telemetry of the fusion abomination (built fresh each call — UI cadence only). */
export interface MechalogodromSnapshot {
  /** Convergence/fusion progress 0 (ten apart on the ring) → 1 (fully fused monster). */
  readonly fusion: number;
  /** The dioramagonic dimensionality readout: sweeps 99 → −10 as power climbs. */
  readonly dimension: number;
  /** "Strange vast power" scalar — a geometric climb past 9000 once fused. */
  readonly power: number;
  /** Live warp amplitude (how violently the mass is morphing this beat). */
  readonly warp: number;
  /** Number of variant shells still distinct (10 → drops toward 0 as they melt into the corona). */
  readonly variants: number;
  /** True once fusion ≥ 0.999 — the monster is whole. */
  readonly fused: boolean;
}

/** One bipolar variant shell: a wireframe polyhedron that migrates inward and oscillates manic↔depressive. */
interface Variant {
  readonly mesh: THREE.LineSegments;
  /** Spawn anchor on the ring (golden-angle placement). */
  readonly ax: number;
  readonly ay: number;
  readonly az: number;
  /** Bipolar oscillation frequency (rad/s) — each shell distinct so they never lockstep. */
  readonly freq: number;
  /** Hue poles this variant swings between (turns, 0..1). */
  readonly hueA: number;
  readonly hueB: number;
  /** Per-shell phase offset so the migration staggers. */
  readonly phase: number;
}

export class Mechalogodrom {
  private readonly group = new THREE.Group();
  private readonly variants: Variant[] = [];

  // The fused centre rig.
  private readonly core: THREE.Mesh; // dark star shader core
  private readonly coreMat: THREE.ShaderMaterial;
  private readonly rim: THREE.Mesh; // glowing event-horizon shell (additive, back-side)
  private readonly mass: THREE.Mesh; // warped emissive solid
  private readonly wire: THREE.Mesh; // additive wireframe (material.wireframe) over the SAME warped geometry
  private readonly spikes: THREE.LineSegments; // radial spike-arms
  private readonly rings: THREE.Mesh[] = []; // counter-rotating torus halos
  /** Quantum BEYOND Lab mesh: nested wire shells + orbiting nodes inside the fusion core. */
  private readonly labShells: THREE.LineSegments[] = [];
  private readonly satellites: MechalogodromSatellites;
  private readonly labMat: THREE.LineBasicMaterial;
  /** Outer EXO-CAGE: a large counter-rotating wireframe shell enclosing the whole abomination. */
  private readonly exoCage: THREE.LineSegments;
  private readonly exoMat: THREE.LineBasicMaterial;

  private readonly warpGeo: THREE.IcosahedronGeometry;
  private readonly basePos: Float32Array; // pristine icosa vertices (warp source of truth)
  private readonly rimMat: THREE.MeshBasicMaterial;
  private readonly massMat: THREE.MeshStandardMaterial;
  private readonly wireMat: THREE.MeshBasicMaterial;
  private readonly shellMat: THREE.LineBasicMaterial; // shared by all 10 variants
  private readonly spikeMat: THREE.LineBasicMaterial;
  private readonly ringMat: THREE.MeshBasicMaterial;

  private readonly tmpColor = new THREE.Color();

  private fusion = 0;
  private power = 0;
  private warp = 0;
  private chaos = 0;
  /** Apex (ς) brain projection — the Entropic Tesseract Hydra's live mind state drives THIS body. */
  private apexTranscend = 0;
  private apexVitality = 0;
  private apexAgony = 0;
  /** Combined chaos+apex arousal, recomputed each update; with no apex feed it equals `chaos`. */
  private drive = 0;
  private localT = 0;
  private worldTimeScale = 1;
  private normalsTick = 0;
  /** CRT canyon + tesseract tunnel — physical exterior shell (1000-phenomenon vocabulary). */
  private readonly mechaExterior: MechaExteriorAbomination;
  private tsotchkePulse: TsotchkeQuantumPulse = {
    cliffordEnt: 0,
    qgtVolume: 0,
    rngEntropy: 0,
    quakeAliveness: 0,
    adGradient: 0,
  };

  constructor(scene: THREE.Scene) {
    this.group.position.set(0, ALTITUDE, 0);

    this.coreMat = createMechalogodromDarkStarMaterial();
    this.core = new THREE.Mesh(
      new THREE.SphereGeometry(CORE_R * 0.62, MECHA_CORE_SEGMENTS, MECHA_CORE_SEGMENTS * 0.75),
      this.coreMat,
    );
    this.group.add(this.core);

    // ── Event-horizon rim: a back-side additive shell hugging the core → a thin bright halo. ────
    // USER: the 6 ADDITIVE core layers below summed to a blinding WHITE core. Fix = keep each a DIM,
    // DISTINCT colour (so the centre reads as a tiny multi-hue shimmer, not white) at much lower opacity
    // so the additive sum never blows out. Visual-only; no rng.
    this.rimMat = new THREE.MeshBasicMaterial({
      color: 0x3a0010,
      transparent: true,
      opacity: 0.14,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.rim = new THREE.Mesh(new THREE.SphereGeometry(CORE_R * 0.74, 32, 24), this.rimMat);
    this.group.add(this.rim);

    // ── Warped mass: ONE icosahedron geometry, displaced on the CPU each frame, shown twice —
    //    a translucent emissive solid + an additive wireframe — so it reads as a meshy freakshow. ─
    this.warpGeo = new THREE.IcosahedronGeometry(CORE_R, WARP_DETAIL);
    const pos = this.warpGeo.getAttribute('position') as THREE.BufferAttribute;
    this.basePos = new Float32Array(pos.array as ArrayLike<number>);
    this.massMat = new THREE.MeshStandardMaterial({
      color: 0x120016,
      emissive: 0x6a0030,
      emissiveIntensity: 1.4,
      roughness: 0.4,
      metalness: 0.6,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.mass = new THREE.Mesh(this.warpGeo, this.massMat);
    this.group.add(this.mass);
    this.wireMat = new THREE.MeshBasicMaterial({
      color: 0x0e4a5a,
      wireframe: true,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.wire = new THREE.Mesh(this.warpGeo, this.wireMat);
    this.group.add(this.wire);

    // ── Spike-arms: a radial burst of line segments from the centre (splay scales with power). ──
    this.spikeMat = new THREE.LineBasicMaterial({
      color: 0x5a4718,
      transparent: true,
      // USER: dim gold — was 0xffcc33 @0.32, a prime white-sum contributor.
      opacity: 0.09,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.spikes = new THREE.LineSegments(this.buildSpikeGeo(), this.spikeMat);
    this.group.add(this.spikes);

    // ── Three counter-rotating torus halos (additive, no GLSL). ─────────────────────────────────
    this.ringMat = new THREE.MeshBasicMaterial({
      color: 0x3a1656,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(CORE_R * (1.5 + i * 0.55), 0.9 + i * 0.4, 3, 96),
        this.ringMat,
      );
      ring.rotation.x = (i * TAU) / 5;
      ring.rotation.y = (i * TAU) / 7;
      this.group.add(ring);
      this.rings.push(ring);
    }

    // ── Quantum BEYOND Lab lattice: nested wire icosa shells + orbiting probe nodes (Mandelbrot-ish
    //    chaos read without GLSL — the inner cage writhes as the monster fuses). ────────────────
    this.labMat = new THREE.LineBasicMaterial({
      color: 0x0e5248,
      transparent: true,
      // USER: dim teal — was 0x00ffcc @0.24.
      opacity: 0.07,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let layer = 0; layer < 5; layer++) {
      const geo = new THREE.IcosahedronGeometry(CORE_R * (0.28 + layer * 0.11), 1);
      const wire = new THREE.WireframeGeometry(geo);
      geo.dispose();
      const shell = new THREE.LineSegments(wire, this.labMat);
      shell.rotation.set(layer * 0.4, layer * 0.55, layer * 0.31);
      this.group.add(shell);
      this.labShells.push(shell);
    }
    this.satellites = new MechalogodromSatellites(this.group, MECHA_SATELLITE_COUNT, CORE_R);

    // ── Outer EXO-CAGE: a colossal counter-rotating wireframe icosphere enclosing the whole monster,
    //    adding a fractal "sections" layer that tumbles against the inner rig (more parts, bizarro). ──
    this.exoMat = new THREE.LineBasicMaterial({
      color: 0x260a4a,
      transparent: true,
      opacity: 0.06,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const exoBase = new THREE.IcosahedronGeometry(CORE_R * 2.7, 1);
    const exoWire = new THREE.WireframeGeometry(exoBase);
    exoBase.dispose();
    this.exoCage = new THREE.LineSegments(exoWire, this.exoMat);
    this.group.add(this.exoCage);

    // ── The ten bipolar variant shells (golden-angle ring placement; varied platonic solids). ───
    this.shellMat = new THREE.LineBasicMaterial({
      // USER #14: no pure white additive lines; dark violet shell with per-instance hue drift below.
      color: 0x4a00a0,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < VARIANT_COUNT; i++) {
      const base =
        i % 4 === 0
          ? new THREE.OctahedronGeometry(1)
          : i % 4 === 1
            ? new THREE.IcosahedronGeometry(1)
            : i % 4 === 2
              ? new THREE.TetrahedronGeometry(1.3)
              : new THREE.DodecahedronGeometry(1);
      const wire = this.buildCurvedWireGeo(base, 0.22 + (i % 5) * 0.04);
      base.dispose();
      const seg = new THREE.LineSegments(wire, this.shellMat);
      const th = golden * i;
      const ylift = (1 - (i / (VARIANT_COUNT - 1)) * 2) * 70;
      const ax = Math.cos(th) * RING_R;
      const az = Math.sin(th) * RING_R;
      seg.position.set(ax, ylift, az);
      seg.scale.setScalar(10 + (i % 5) * 3);
      this.group.add(seg);
      this.variants.push({
        mesh: seg,
        ax,
        ay: ylift,
        az,
        freq: 0.18 + (i % VARIANT_COUNT) * 0.05, // each shell its own bipolar period
        hueA: (i / VARIANT_COUNT) % 1, // pole A
        hueB: (i / VARIANT_COUNT + 0.5) % 1, // pole B (opposite → manic vs depressive)
        phase: (i / VARIANT_COUNT) * TAU,
      });
    }

    this.mechaExterior = new MechaExteriorAbomination(this.group, CORE_R);
    scene.add(this.group);
  }

  /** Curved wire segments from a polyhedron — USER #14: less blocky 1980s straight edges. */
  private buildCurvedWireGeo(
    source: THREE.BufferGeometry,
    bendScale: number,
  ): THREE.BufferGeometry {
    const wire = new THREE.WireframeGeometry(source);
    const pos = wire.getAttribute('position') as THREE.BufferAttribute;
    const arr: number[] = [];
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const mid = new THREE.Vector3();
    const bend = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 2) {
      a.fromBufferAttribute(pos, i);
      b.fromBufferAttribute(pos, i + 1);
      mid.copy(a).add(b).multiplyScalar(0.5);
      bend
        .set(b.y - a.y, a.z - b.z, a.x - b.x)
        .normalize()
        .multiplyScalar(bendScale);
      const curve = new THREE.CatmullRomCurve3([
        a.clone(),
        a.clone().lerp(mid, 0.5).add(bend),
        b.clone().lerp(mid, 0.5).addScaledVector(bend, 0.65),
        b.clone(),
      ]);
      const pts = curve.getPoints(6);
      for (let j = 0; j < pts.length - 1; j++) {
        const p0 = pts[j]!;
        const p1 = pts[j + 1]!;
        arr.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
      }
    }
    wire.dispose();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(arr), 3));
    return g;
  }

  /** A fixed radial burst of curved spike segments (Catmull-Rom splines), reused; scaled live by power. */
  private buildSpikeGeo(): THREE.BufferGeometry {
    const N = 48;
    const SEG = 10;
    const arr: number[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    const dir = new THREE.Vector3();
    const bend = new THREE.Vector3();
    const p0 = new THREE.Vector3();
    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();
    const p3 = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = golden * i;
      dir.set(Math.cos(th) * r, y, Math.sin(th) * r).normalize();
      p0.copy(dir).multiplyScalar(CORE_R * 0.7);
      p3.copy(dir).multiplyScalar(CORE_R * 2.35);
      bend.set(-dir.z, dir.y * 0.35, dir.x).multiplyScalar(CORE_R * (0.12 + (i % 7) * 0.035));
      p1.copy(p0).add(bend);
      p2.copy(p3).addScaledVector(bend, 0.55 + 0.1 * Math.sin(i * 0.73));
      const curve = new THREE.CatmullRomCurve3([p0.clone(), p1.clone(), p2.clone(), p3.clone()]);
      const pts = curve.getPoints(SEG);
      for (let j = 0; j < pts.length - 1; j++) {
        const a = pts[j]!;
        const b = pts[j + 1]!;
        arr.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(arr), 3));
    return g;
  }

  /** Reactive coupling: feed the world chaos level (0..~1) so the warp/flash intensify with it. A READ-only projection. */
  setChaos(c: number): void {
    this.chaos = clamp(c, 0, 1);
  }

  /** Apex (ς) brain projection — the Entropic Tesseract Hydra's live mind state drives THIS body.
   *  `transcendence` quickens the warp (the mass writhes as the mind ascends), `vitality` boosts
   *  power + glow (the body blazes as the mind is alive), `agony` dampens both (pain dims it).
   *  All clamped 0..1; READ-only, one-way. */
  setApex(transcendence: number, vitality: number, agony: number): void {
    this.apexTranscend = clamp(transcendence, 0, 1);
    this.apexVitality = clamp(vitality, 0, 1);
    this.apexAgony = clamp(agony, 0, 1);
  }

  /** Fusion-brain beat + activity — selects active exterior phenomena (read-only). */
  setExteriorMind(beat: number, activity: number): void {
    this.mechaExterior.setMind(beat, activity);
  }

  /** Tsotchke corpus pulse — exterior hue + quantum rim intensity. */
  setTsotchkePulse(pulse: TsotchkeQuantumPulse): void {
    this.tsotchkePulse = pulse;
  }

  setTimeScale(timeScale: number): void {
    this.worldTimeScale = timeScale;
  }

  /**
   * Advance the migration + fusion + writhe. Pure function of (t, dt, chaos); draws no rng.
   * @param t elapsed seconds (s.elapsed) · @param dt clamped frame delta
   */
  update(_t: number, dt: number): void {
    const scale =
      this.worldTimeScale > 0 ? MECHA_TIME_SCALE * (0.5 + 0.5 * this.worldTimeScale) : 0;
    this.localT += dt * scale;
    const lt = this.localT;
    // Fusion is the ONE-TIME genesis intro — keep it on dome-real time (~CONVERGE_SECONDS), NOT the
    // 50× body churn, so the ten titans visibly fly in and fuse instead of snapping whole instantly.
    this.fusion = clamp(this.fusion + dt / CONVERGE_SECONDS, 0, 1);
    const f = this.fusion;
    const ease = f * f * f * (f * (f * 6 - 15) + 10);

    this.drive = clamp(
      this.chaos + this.apexTranscend * 0.42 + this.apexVitality * 0.28 - this.apexAgony * 0.12,
      0,
      1,
    );
    const d = this.drive;

    const surge = 0.5 + 0.5 * Math.sin(lt * 0.37) * Math.sin(lt * 0.11);
    this.power =
      ease *
      (1200 + 8200 * ease) *
      (0.7 + 0.6 * surge) *
      (1 + 0.8 * d) *
      (1 + 0.5 * this.apexVitality);

    this.warp = (0.08 + 0.5 * ease) * (0.6 + 0.9 * d);

    this.warpMass(lt);
    this.driveCentre(lt, ease);
    this.driveVariants(lt, ease);
  }

  /** Per-frame CPU vertex displacement of the shared mass geometry (writhing alien morph, no GLSL). */
  private warpMass(t: number): void {
    const st = t * MECHA_EXTERIOR_TIME_SCALE;
    const pos = this.warpGeo.getAttribute('position') as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const base = this.basePos;
    const w = this.warp;
    const n = arr.length;
    for (let i = 0; i < n; i += 3) {
      const bx = base[i] ?? 0;
      const by = base[i + 1] ?? 0;
      const bz = base[i + 2] ?? 0;
      // Layered trig of the direction → a de-Jong/implicit-field non-uniform writhe (deterministic).
      const d =
        Math.sin(bx * 0.22 + st * 1.3) +
        Math.sin(by * 0.19 - st * 0.9) +
        Math.sin(bz * 0.25 + st * 1.7) +
        0.6 * Math.sin((bx + by + bz) * 0.13 + st * 2.1) +
        0.45 * Math.sin(bx * by * 0.11 + bz * 0.09 + st * 1.1);
      // Triply-periodic minimal-surface terms (gyroid + Neovius proxy) make the surface look grown
      // from an alien spatial sense rather than smoothed noise. Pure f(position,time), bounded.
      const gx = bx * 0.105 + st * 0.43;
      const gy = by * 0.097 - st * 0.37;
      const gz = bz * 0.113 + st * 0.31;
      const gyroid =
        Math.sin(gx) * Math.cos(gy) + Math.sin(gy) * Math.cos(gz) + Math.sin(gz) * Math.cos(gx);
      const neovius =
        3 * (Math.cos(gx) + Math.cos(gy) + Math.cos(gz)) +
        4 * Math.cos(gx) * Math.cos(gy) * Math.cos(gz);
      // 3D MANDELBULB escape field (power-8, deterministic, NaN-guarded). The base vertex direction
      // (a point on the CORE_R sphere) seeds `c`; a slow `t` breathe drifts the set so the lobes
      // crawl. Vertices that stay BOUNDED (deep in the bulb) bulge OUT into fractal lobes; those that
      // escape recede — neighbouring verts land on opposite sides of the fractal boundary, creasing
      // the mass into the iconic bulbous mandelbulb freakshow. Iterations capped at BULB_ITERS.
      const inv = 1 / CORE_R;
      const sc = 1.05 + 0.18 * Math.sin(st * 0.06);
      const cbx = bx * inv * sc;
      const cby = by * inv * sc + 0.22 * Math.sin(st * 0.05);
      const cbz = bz * inv * sc;
      let zxb = cbx;
      let zyb = cby;
      let zzb = cbz;
      let escB = 1; // stays 1 ⇒ bounded (in-set) ⇒ a lobe; drops toward 0 the earlier it escapes
      for (let it = 0; it < BULB_ITERS; it++) {
        const r = Math.sqrt(zxb * zxb + zyb * zyb + zzb * zzb);
        if (r > 2) {
          escB = it / BULB_ITERS;
          break;
        }
        const rr = r > 1e-6 ? r : 1e-6;
        const theta = 8 * Math.acos(clamp(zzb / rr, -1, 1));
        const phi = 8 * Math.atan2(zyb, zxb);
        const zr = Math.pow(rr, 8); // rr ≤ 2 here ⇒ zr ≤ 256, finite
        const st = Math.sin(theta);
        zxb = zr * st * Math.cos(phi) + cbx;
        zyb = zr * st * Math.sin(phi) + cby;
        zzb = zr * Math.cos(theta) + cbz;
      }
      const mb = escB * 0.55 * w;
      const implicit = (gyroid * 0.19 + neovius * 0.025) * w;
      const s = 1 + w * 0.32 * d + mb + implicit;
      arr[i] = bx * s + Math.sin(by * 3.1 + st) * mb * 12 + gyroid * w * 5;
      arr[i + 1] = by * s + Math.cos(bx * 2.7 - st * 1.2) * mb * 10 + neovius * w * 0.7;
      arr[i + 2] = bz * s + Math.sin(bx * bz * 0.08 + st * 0.8) * mb * 12 - gyroid * w * 5;
    }
    pos.needsUpdate = true;
    // Recompute normals on a cadence so the emissive solid still catches a little scene light.
    if ((this.normalsTick = (this.normalsTick + 1) % 6) === 0) this.warpGeo.computeVertexNormals();
  }

  /** Spin/colour/flash the fused centre rig (core, rim, mass, wire, spikes, rings). */
  private driveCentre(t: number, ease: number): void {
    const st = t * MECHA_EXTERIOR_TIME_SCALE;
    // Neutral dark-star skin: mostly black/ultraviolet, with poisonous chroma bursts from Tsotchke
    // pulse and apex vitality. The black core remains true absence; the body around it bleeds color.
    const hue =
      (0.72 +
        st * 0.025 +
        this.tsotchkePulse.qgtVolume * 0.18 +
        this.tsotchkePulse.cliffordEnt * 0.11) %
      1;
    this.massMat.color.setHSL((hue + 0.55) % 1, 0.55, 0.035 + 0.025 * this.drive);
    this.massMat.emissive.setHSL(hue, 0.95, 0.1 + 0.14 * ease + 0.07 * this.apexVitality);
    // USER: the mecha CORE was the prime blinding-white blob — peak emissive cut from ~6.15 to ~2.6 so
    // it reads as a vivid SATURATED hue under ACES, never a white sphere when the camera nears it.
    this.massMat.emissiveIntensity =
      0.6 +
      1.1 * ease +
      0.6 * this.drive +
      0.4 * this.apexVitality +
      this.tsotchkePulse.quakeAliveness * 0.25;
    // USER: the 6 ADDITIVE core layers summed to a blinding WHITE core. Fix = keep each a DIM, saturated,
    // DISTINCT hue (low lightness) at a FRACTION of the old opacity, so the additive sum reads as a tiny
    // coloured SPARKLE — never a white blowout. The flash envelope still shimmers, just gently.
    this.wireMat.color.setHSL((hue + 0.42 + this.tsotchkePulse.adGradient * 0.16) % 1, 1, 0.24);
    // Flash envelope: sharp sparkle on a fast beat, stronger once fused + chaotic.
    const flash = 0.5 + 0.5 * Math.sin(st * 6.3) * Math.sin(st * 2.1);
    this.wireMat.opacity = 0.04 + 0.07 * flash * (0.4 + 0.6 * ease);
    this.mass.rotation.y = st * (0.28 + this.drive * 0.15);
    this.mass.rotation.x = Math.sin(st * 0.13) * (0.55 + this.drive * 0.35);
    this.mass.rotation.z = Math.sin(st * 0.071 + this.apexTranscend * Math.PI) * 0.42;
    this.wire.rotation.copy(this.mass.rotation);

    // Event horizon breathes; the shadow core stays black (a true absence).
    this.rim.scale.setScalar(1 + 0.1 * Math.sin(st * 1.7) + 0.16 * ease + 0.04 * this.drive);
    this.rimMat.color.setHSL((hue + 0.86) % 1, 1, 0.26 + 0.06 * flash);
    this.rimMat.opacity = 0.08 + 0.12 * ease + 0.06 * flash;
    this.core.scale.setScalar(0.85 + 0.18 * ease); // the hole widens as it powers up

    // Spike-arms splay outward with power; counter-rotate; flash.
    this.spikes.scale.setScalar(0.5 + 1.1 * ease);
    this.spikes.rotation.y = -st * 0.33;
    this.spikes.rotation.z = Math.sin(st * 0.27) * 0.6;
    this.spikeMat.opacity = (0.05 + 0.12 * ease) * flash;
    this.tmpColor.setHSL((hue + 0.12) % 1, 1, 0.3);
    this.spikeMat.color.copy(this.tmpColor);

    // Three counter-rotating halos.
    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      if (!r) continue;
      const dir = i % 2 === 0 ? 1 : -1;
      r.rotation.z = dir * st * (0.2 + i * 0.08 + this.drive * 0.08);
      r.rotation.x = (i * TAU) / 5 + Math.sin(st * 0.2 + i) * 0.3;
      r.scale.setScalar(0.6 + 0.56 * ease + 0.12 * Math.sin(st * 1.3 + i));
    }
    this.ringMat.opacity = 0.05 + 0.1 * ease;
    this.ringMat.color.setHSL((hue + 0.66) % 1, 0.9, 0.28);

    // Lab lattice: counter-rotating nested shells + orbiting probe nodes.
    for (let i = 0; i < this.labShells.length; i++) {
      const sh = this.labShells[i];
      if (!sh) continue;
      const dir = i % 2 === 0 ? 1 : -1;
      sh.rotation.x += dir * 0.004 * (1 + ease);
      sh.rotation.y += dir * 0.006 * (1 + 0.5 * this.chaos);
      sh.rotation.z += dir * 0.003;
      sh.scale.setScalar(0.85 + 0.22 * ease + 0.04 * Math.sin(st * 1.1 + i));
    }
    this.labMat.opacity = 0.06 + 0.12 * ease + 0.05 * flash;
    this.labMat.color.setHSL((hue + 0.33) % 1, 1, 0.28);
    this.satellites.update(t, this.power, this.warp, this.drive);
    updateDarkStarUniforms(this.coreMat, t, this.power, this.warp, this.drive, 0.5 + 0.5 * flash);

    // Outer exo-cage: a slow counter-tumble against the inner rig, breathing wider as power climbs.
    this.exoCage.rotation.x = -st * 0.05;
    this.exoCage.rotation.y = st * 0.07 + Math.sin(st * 0.13) * 0.4;
    this.exoCage.rotation.z = Math.cos(st * 0.09) * 0.3;
    this.exoCage.scale.setScalar(0.9 + 0.18 * ease + 0.05 * Math.sin(st * 0.8));
    this.exoMat.color.setHSL((hue + 0.78) % 1, 0.9, 0.28);
    this.exoMat.opacity = 0.04 + 0.08 * ease + 0.03 * flash;
    this.mechaExterior.update(t, ease, this.drive, this.tsotchkePulse);
  }

  /** Migrate + bipolar-oscillate the ten variant shells; melt them into the corona as fusion completes. */
  private driveVariants(t: number, ease: number): void {
    const st = t * MECHA_EXTERIOR_TIME_SCALE;
    for (let i = 0; i < this.variants.length; i++) {
      const v = this.variants[i];
      if (!v) continue;
      const bip = Math.sin(st * v.freq + v.phase);
      // Migration: from the spawn anchor toward a tight corona orbit at the centre.
      const orbitR = CORE_R * (1.15 + 0.12 * i);
      const oth = v.phase + st * (0.15 + 0.03 * i);
      const cx = Math.cos(oth) * orbitR;
      const cz = Math.sin(oth) * orbitR;
      const cy = Math.sin(st * 0.4 + v.phase) * CORE_R * 0.5;
      const k = ease; // 0 → at ring anchor, 1 → in the corona
      v.mesh.position.set(lerp(v.ax, cx, k), lerp(v.ay, cy, k), lerp(v.az, cz, k));
      // Manic pole → swells + brightens; depressive pole → shrinks + dims (the "bipolar variant").
      const manic = 0.5 + 0.5 * bip;
      const baseScale = lerp(10 + (i % 5) * 3, 4 + (i % 3) * 2, k); // shells shrink as they fuse in
      v.mesh.scale.setScalar(baseScale * (0.6 + 0.8 * manic));
      v.mesh.rotation.x = st * (0.3 + 0.1 * i) + bip;
      v.mesh.rotation.y = st * (0.2 + 0.07 * i);
      // Hue swings between the two poles; opacity flares with the manic phase and fades as it melts in.
      const hue = lerp(v.hueA, v.hueB, manic);
      // USER #14: keep the lightness low so the additive shell never blows out.
      this.tmpColor.setHSL(hue, 0.9, 0.28 + 0.12 * manic);
      // shellMat is shared → set per-mesh tint is not possible without per-mesh materials; instead
      // drive the SHARED material toward the loudest variant (variant 0) for a coherent corona pulse.
      if (i === 0) {
        this.shellMat.color.copy(this.tmpColor);
        this.shellMat.opacity = 0.18 + 0.22 * manic * (1 - 0.5 * k);
      }
    }
  }

  /** Build the read-only telemetry snapshot (call at UI cadence — allocates one object). */
  snapshot(): MechalogodromSnapshot {
    // Dioramagonic dimensionality: 99 at genesis → sweeps down past 0 to under-Λ −10 at full fusion.
    const dimension = 99 - this.fusion * 109;
    let live = 0;
    for (let i = 0; i < this.variants.length; i++) {
      // A shell counts as "distinct" until it has mostly melted into the corona.
      if (this.fusion < 0.85 + i * 0.012) live++;
    }
    return {
      fusion: this.fusion,
      dimension,
      power: this.power,
      warp: this.warp,
      variants: live,
      fused: this.fusion >= 0.999,
    };
  }

  /** Free every owned geometry + material (HMR / world-reset safe; idempotent per three.js). */
  dispose(): void {
    this.warpGeo.dispose();
    this.core.geometry.dispose();
    this.rim.geometry.dispose();
    this.spikes.geometry.dispose();
    for (const r of this.rings) r.geometry.dispose();
    for (const sh of this.labShells) sh.geometry.dispose();
    this.exoCage.geometry.dispose();
    this.satellites.dispose();
    for (const v of this.variants) v.mesh.geometry.dispose();
    this.coreMat.dispose();
    this.rimMat.dispose();
    this.massMat.dispose();
    this.wireMat.dispose();
    this.shellMat.dispose();
    this.spikeMat.dispose();
    this.ringMat.dispose();
    this.labMat.dispose();
    this.exoMat.dispose();
    this.mechaExterior.dispose();
    this.group.removeFromParent();
  }
}

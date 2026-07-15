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
 * rings/spikes + O(S) for the variant-shell morphs (S ≤ 4 shells × ≤2304 segments round-robin per
 * frame ≈ 0.4–0.6 ms, each shell's mathematics refreshed at ≥24 Hz) — a fixed,
 * population-independent cost, so it never scales with the entity count. Allocation-free hot path
 * (module + instance scratch only).
 *
 * VARIANT SHELLS (2026-07-14, owner directive): the ten shells are NAMED mathematical constructions
 * (Möbius–Escher · Poincaré · Mercator loxodrome · Kakeya · Collatz · Hopf · Clifford torus ·
 * Enneper · Aizawa · Weierstrass — see mechalogodrom-variant-geometry.ts), each morphed by its OWN
 * variant sub-brain's live activity/STDP-gain/blaze via {@link setVariantDrives}, and each feeding
 * its live measured invariant BACK to the fusion brain via {@link variantGeometrySignals} as that
 * sub-brain's ninth, embodied sense — a real, falsifiable, bidirectional mind⇄body loop.
 */
import * as THREE from 'three';
import { TAU, clamp, lerp } from '../math/scalar';
import { ARENA_RADIUS, HABITAT_XZ_SCALE, HABITAT_Y_SCALE } from './constants';
import { MechaExteriorAbomination } from './creature-exterior-layers';
import {
  createMechalogodromDarkStarMaterial,
  updateDarkStarUniforms,
} from './mechalogodrom-dark-star';
import { MechalogodromSatellites } from './mechalogodrom-satellites';
import {
  createVariantShellGeometries,
  VARIANT_SHELL_FLOATS,
  type VariantShellDrive,
  type VariantShellGeometry,
} from './mechalogodrom-variant-geometry';
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
const MECHA_TIME_SCALE = 3.5;
const MECHA_EXTERIOR_TIME_SCALE = 0.15;
const MECHA_SATELLITE_COUNT = 400;
const MECHA_CORE_SEGMENTS = 128;
/** Diameter multiplier for the whole abomination — matches the world's 2× HORIZONTAL expansion
 *  (HABITAT_XZ_SCALE) so the shiny spinning center-star grows WITH the enlarged world. Applied as a
 *  uniform group scale in the constructor (owner: "make it twice as big in diameter, the world expanded 2×2"). */
const DIAMETER_SCALE = HABITAT_XZ_SCALE; // ×2
/** Elevation of the whole abomination above the arena floor. Raised to 3× the original authored 252 =
 *  756, matching the world's 3× VERTICAL expansion (HABITAT_Y_SCALE) — owner: "the center star should be
 *  3× higher." The god now scales WITH the world on both axes (3× up, 2× wide) instead of sitting at its
 *  old authored height (this supersedes the brief God-Colossus mid-height alignment). */
const ALTITUDE = 252 * HABITAT_Y_SCALE; // = 756 — 3× higher
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

/** REFERENCE PALETTES (owner 2026-07-14, five reference images): chrome recursive vortex ·
 *  cobalt/emerald/gold nebula · kaleidoscopic stained-glass prism · glitterverse chrome ·
 *  glass caustics. Each shell owns an authored two-pole palette from one of the five families —
 *  dark-base + bright-rim discipline, never flat TRON — and its live measured INVARIANT picks the
 *  mix between the poles (the mathematics chooses the colour; falsifiable, not time-noise). */
interface ShellPalette {
  readonly hueA: number;
  readonly satA: number;
  readonly hueB: number;
  readonly satB: number;
  /** Fringe hue offset from the live core hue (the iridescent interference edge). */
  readonly fringeOff: number;
  readonly fringeSat: number;
  readonly glitterHue: number;
  readonly glitterSat: number;
}

const SHELL_PALETTES: readonly ShellPalette[] = [
  // 0 Möbius — CHROME VORTEX: champagne ↔ gunmetal steel, near-white glitter (ref 1).
  {
    hueA: 0.09,
    satA: 0.38,
    hueB: 0.58,
    satB: 0.24,
    fringeOff: 0.5,
    fringeSat: 0.55,
    glitterHue: 0.12,
    glitterSat: 0.08,
  },
  // 1 Poincaré — PRISM: teal ↔ magenta stained-glass panes, gold wire fringe (ref 3).
  {
    hueA: 0.47,
    satA: 0.95,
    hueB: 0.87,
    satB: 0.92,
    fringeOff: 0.28,
    fringeSat: 1,
    glitterHue: 0.12,
    glitterSat: 0.55,
  },
  // 2 Loxodrome — NEBULA: cobalt ↔ emerald marbled flow, gold filament fringe (ref 2).
  {
    hueA: 0.65,
    satA: 0.95,
    hueB: 0.38,
    satB: 0.95,
    fringeOff: -0.5,
    fringeSat: 0.95,
    glitterHue: 0.13,
    glitterSat: 0.4,
  },
  // 3 Kakeya — CAUSTIC: silver light-dapple, almost achromatic, pure white glitter (ref 5).
  {
    hueA: 0.58,
    satA: 0.08,
    hueB: 0.55,
    satB: 0.16,
    fringeOff: 0.03,
    fringeSat: 0.2,
    glitterHue: 0.6,
    glitterSat: 0.02,
  },
  // 4 Collatz — BRASS TUNNEL: brass ↔ copper recursive corridor warmth (ref 1 warm face).
  {
    hueA: 0.1,
    satA: 0.85,
    hueB: 0.05,
    satB: 0.75,
    fringeOff: 0.46,
    fringeSat: 0.5,
    glitterHue: 0.11,
    glitterSat: 0.3,
  },
  // 5 Hopf — PRISM B: violet ↔ orange kaleidoscope wedge, gold wire (ref 3).
  {
    hueA: 0.75,
    satA: 0.95,
    hueB: 0.07,
    satB: 0.95,
    fringeOff: 0.35,
    fringeSat: 1,
    glitterHue: 0.12,
    glitterSat: 0.5,
  },
  // 6 Clifford — GLITTERVERSE: steel-cyan ↔ amber streak-light chrome, icy glitter (ref 4).
  {
    hueA: 0.55,
    satA: 0.78,
    hueB: 0.1,
    satB: 0.85,
    fringeOff: 0.5,
    fringeSat: 0.7,
    glitterHue: 0.55,
    glitterSat: 0.15,
  },
  // 7 Enneper — NEBULA B: emerald ↔ gold vein bloom (ref 2).
  {
    hueA: 0.36,
    satA: 0.95,
    hueB: 0.13,
    satB: 0.9,
    fringeOff: 0.3,
    fringeSat: 0.9,
    glitterHue: 0.35,
    glitterSat: 0.35,
  },
  // 8 Aizawa — NEBULA C: deep cobalt ↔ aqua storm-cloud attractor (ref 2 blue wall).
  {
    hueA: 0.62,
    satA: 0.92,
    hueB: 0.5,
    satB: 0.88,
    fringeOff: -0.48,
    fringeSat: 0.85,
    glitterHue: 0.58,
    glitterSat: 0.25,
  },
  // 9 Weierstrass — PRISM C: pink-magenta ↔ teal shattered-plane roughness (ref 3).
  {
    hueA: 0.9,
    satA: 0.92,
    hueB: 0.46,
    satB: 0.9,
    fringeOff: 0.22,
    fringeSat: 1,
    glitterHue: 0.12,
    glitterSat: 0.45,
  },
];

/** One bipolar variant shell: a NAMED mathematical construction that migrates inward and morphs
 *  under its own sub-brain's live drive (owner 2026-07-14: "real math … hard wired into the neural
 *  network", never a decorative platonic wireframe). */
interface Variant {
  readonly mesh: THREE.LineSegments;
  /** USER #14: each shell owns its OWN line material so all 10 render in their OWN distinct colour
   * (a shared material could only ever show one hue — "multi-color defined lines for readability"). */
  readonly mat: THREE.LineBasicMaterial;
  /** Chimera layers sharing the SAME morphing geometry: iridescent fringe pass + glitter points. */
  readonly fringeMat: THREE.LineBasicMaterial;
  readonly sparkMat: THREE.PointsMaterial;
  /** Authored reference palette (see SHELL_PALETTES) — the invariant picks the pole mix live. */
  readonly pal: ShellPalette;
  /** RECURSIVE ECHOES (chrome-vortex/kaleidoscope refs): two nested self-similar copies of the
   *  live geometry, counter-spun by the sub-brain's STDP-learned gain — the infinite-tunnel read. */
  readonly echoA: THREE.LineSegments;
  readonly echoB: THREE.LineSegments;
  readonly echoMatA: THREE.LineBasicMaterial;
  readonly echoMatB: THREE.LineBasicMaterial;
  /** The shell's mathematical generator (Möbius/Poincaré/loxodrome/Kakeya/Collatz/Hopf/Clifford/
   *  Enneper/Aizawa/Weierstrass — see mechalogodrom-variant-geometry.ts). */
  readonly geo: VariantShellGeometry;
  /** Caller-owned morph buffer the generator writes segment endpoints into (also the GPU attribute array). */
  readonly buf: Float32Array;
  readonly posAttr: THREE.BufferAttribute;
  /** Reused drive scratch handed to the generator each morph (no per-frame allocation). */
  readonly drive: VariantShellDrive;
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
  /** Fusion-BRAIN → body (V-MECHA-MIND). This god's OWN 10-variant fusion mind ({@link MechalogodromBrain})
   *  drives its OWN body — a falsifiable readout, never decor:
   *  · `mindDominant` (0..9): which variant sub-brain WON the fusion workspace this beat — the physical
   *    variant shell of that index BLAZES (Global-Workspace "winning coalition lights up", made literal);
   *  · `mindConscious` (0..1): the consciousness-indicator proxy → the fused core's coherence glow;
   *  · `mindStrangeness` (0..1): dimensional alien-novelty → extra mandelbulb warp on the mass. */
  private mindDominant = 0;
  private mindConscious = 0;
  private mindStrangeness = 0;
  /** Per-shell workspace blaze (0..1), eased toward 1 for the dominant sub-brain's physical shell so the
   *  winner glides between shells as the mind's dominant coalition switches, instead of hard-flickering. */
  private readonly variantBlaze = new Float32Array(VARIANT_COUNT);
  /** Per-variant sub-brain drive (normalized activity + STDP gain) — set by setVariantDrives. */
  private readonly variantActivity = new Float32Array(VARIANT_COUNT).fill(0.5);
  private readonly variantGains = new Float32Array(VARIANT_COUNT).fill(1);
  /** Per-variant live measured mathematical invariant — the shells' embodied sense vector. */
  private readonly variantInvariants = new Float32Array(VARIANT_COUNT);
  /** Round-robin cursor: 4 of the 10 shells morph each frame (fixed cost, all live at ≥24 Hz). */
  private variantMorphCursor = 0;
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
    this.group.scale.setScalar(DIAMETER_SCALE); // ×2 diameter — the god grows with the 2×-wider world

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

    // ── The ten bipolar variant shells (golden-angle ring placement) — each a NAMED mathematical
    //    construction (Möbius–Escher · Poincaré hyperbolic · Mercator loxodrome · Kakeya sweep ·
    //    Collatz orbits · Hopf fibration · Clifford torus · Enneper minimal · Aizawa attractor ·
    //    Weierstrass roughness) that MORPHS under its own sub-brain's live drive and feeds its
    //    measured invariant BACK as that sub-brain's embodied sense. Owner 2026-07-14: real math,
    //    hard-wired into the neural network, falsifiable — never decorative platonic wire. ───────
    this.shellMat = new THREE.LineBasicMaterial({
      // USER #14: no pure white additive lines; dark violet shell with per-instance hue drift below.
      color: 0x4a00a0,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const golden = Math.PI * (3 - Math.sqrt(5));
    const shellGeometries = createVariantShellGeometries();
    for (let i = 0; i < VARIANT_COUNT; i++) {
      const shellGeo = shellGeometries[i]!;
      const buf = new Float32Array(VARIANT_SHELL_FLOATS);
      const drive: VariantShellDrive = { activity: 0.5, gain: 1, blaze: 0, bipolar: 0 };
      const used = shellGeo.write(buf, 0, drive);
      const posAttr = new THREE.BufferAttribute(buf, 3);
      posAttr.setUsage(THREE.DynamicDrawUsage);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', posAttr);
      geo.setDrawRange(0, used / 3);
      this.variantInvariants[i] = shellGeo.invariant(0, drive);
      // USER #14: clone the shared template into a PER-shell material so each of the 10 renders its
      // own bipolar hue (the shared material could only ever show one colour — the corona read as
      // monochrome). shellMat stays the template + is disposed with the rest.
      const mat = this.shellMat.clone();
      const seg = new THREE.LineSegments(geo, mat);
      // The generators rewrite vertices every morph; a stale bounding sphere would cull them mid-flight.
      seg.frustumCulled = false;
      // CHIMERA LAYERS (owner reference images: dense, glittering, iridescent, high-definition).
      // Both extra passes SHARE the morphing BufferGeometry — zero extra CPU per frame, two extra
      // draws: an offset-hue fringe (chromatic interference edge) and a glitter-point pass that
      // turns every vertex of the mathematics into a glinting particle.
      const fringeMat = new THREE.LineBasicMaterial({
        color: 0x220044,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const fringe = new THREE.LineSegments(geo, fringeMat);
      fringe.frustumCulled = false;
      fringe.scale.setScalar(1.018);
      seg.add(fringe);
      const sparkMat = new THREE.PointsMaterial({
        color: 0x8844ff,
        size: 4,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const spark = new THREE.Points(geo, sparkMat);
      spark.frustumCulled = false;
      seg.add(spark);
      // Recursive echo tunnel: two nested self-similar copies of the SAME live geometry (zero
      // extra CPU), each with its own dimmer material, counter-spun in driveVariants by the
      // sub-brain's learned gain — the reference images' infinite mirrored-corridor recursion.
      const echoMatA = this.shellMat.clone();
      const echoA = new THREE.LineSegments(geo, echoMatA);
      echoA.frustumCulled = false;
      echoA.scale.setScalar(0.55);
      seg.add(echoA);
      const echoMatB = this.shellMat.clone();
      const echoB = new THREE.LineSegments(geo, echoMatB);
      echoB.frustumCulled = false;
      echoB.scale.setScalar(0.32);
      seg.add(echoB);
      const th = golden * i;
      const ylift = (1 - (i / (VARIANT_COUNT - 1)) * 2) * 70;
      const ax = Math.cos(th) * RING_R;
      const az = Math.sin(th) * RING_R;
      seg.position.set(ax, ylift, az);
      seg.scale.setScalar(14 + (i % 5) * 4);
      this.group.add(seg);
      this.variants.push({
        mesh: seg,
        mat,
        fringeMat,
        sparkMat,
        pal: SHELL_PALETTES[i]!,
        echoA,
        echoB,
        echoMatA,
        echoMatB,
        geo: shellGeo,
        buf,
        posAttr,
        drive,
        ax,
        ay: ylift,
        az,
        freq: 0.18 + (i % VARIANT_COUNT) * 0.05, // each shell its own bipolar period
        // Colour poles now come from the AUTHORED reference palette (still 10 distinct pairs —
        // USER #14's per-shell readability holds; the palettes replace the generic hue wheel).
        hueA: SHELL_PALETTES[i]!.hueA,
        hueB: SHELL_PALETTES[i]!.hueB,
        phase: (i / VARIANT_COUNT) * TAU,
      });
    }

    this.mechaExterior = new MechaExteriorAbomination(this.group, CORE_R);
    scene.add(this.group);
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

  /**
   * MECHALOGODROM-BRAIN → BODY (V-MECHA-MIND). Feed this god's OWN fusion mind's live cognition so its
   * body reads out its thoughts, not decoration:
   * - `dominantVariant` (0..9): the variant sub-brain that WON the fusion workspace this beat. The
   *   PHYSICAL variant shell of that index ignites (brighter · larger · more saturated) — Global
   *   Workspace Theory's "winning coalition broadcast" made literally visible; when the mind switches
   *   its dominant coalition, the blaze migrates to the new shell.
   * - `consciousnessProxy` (0..1): the fusion mind's consciousness-indicator proxy (NOT sentience) →
   *   the fused core's coherence glow (emissive + rim).
   * - `strangeness` (0..1): dimensional alien-novelty → extra mandelbulb warp amplitude on the mass.
   * All READ-only, one-way (mind → body); clamped; draws no rng — determinism (ADR 0004) preserved.
   */
  setMind(dominantVariant: number, consciousnessProxy: number, strangeness: number): void {
    const d = Math.round(dominantVariant);
    this.mindDominant = d < 0 ? 0 : d > VARIANT_COUNT - 1 ? VARIANT_COUNT - 1 : d;
    this.mindConscious = clamp(consciousnessProxy, 0, 1);
    this.mindStrangeness = clamp(strangeness, 0, 1);
  }

  /**
   * MECHALOGODROM-BRAIN → SHELL MORPH (per-variant, honest wiring). Feed each variant sub-brain's
   * live normalized activity (0..1) and STDP-learned fusion gain (0.25..2.5) so ITS mathematical
   * shell morphs under ITS OWN cognition — Möbius stair count, hyperbolic chord skip, loxodrome
   * bearing, Kakeya sector count, Collatz seed window, Hopf base circle, Clifford rotor rates,
   * Enneper bloom radius, Aizawa parameter, Weierstrass octaves. READ-only, one-way, clamped;
   * draws no rng — determinism (ADR 0004) preserved.
   */
  setVariantDrives(activity: ArrayLike<number>, gains: ArrayLike<number>): void {
    for (let i = 0; i < VARIANT_COUNT; i++) {
      this.variantActivity[i] = clamp(activity[i] ?? 0.5, 0, 1);
      this.variantGains[i] = clamp(gains[i] ?? 1, 0.25, 2.5);
    }
  }

  /**
   * SHELL GEOMETRY → BRAIN (the reverse arc that makes the loop honest). Per-variant live measured
   * invariant of each shell's CURRENT morphed mathematics — discrete torsion (Möbius), Gauss–Bonnet
   * defect (Poincaré), measured rhumb bearing (Mercator), swept-area efficiency (Kakeya), mean
   * stopping time (Collatz), fiber dispersion (Hopf), projected inflation (Clifford), bloom depth
   * (Enneper), orbit RMS radius (Aizawa), total variation (Weierstrass) — refreshed on the same
   * staggered cadence as the morphs. The fusion brain consumes this vector as each sub-brain's
   * ninth, EMBODIED sense: the ten sub-brains genuinely perceive different worlds (their own bodies).
   */
  variantGeometrySignals(): Float32Array {
    return this.variantInvariants;
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
      this.worldTimeScale > 0 ? MECHA_TIME_SCALE * (0.3 + 0.7 * this.worldTimeScale) : 0;
    this.localT += dt * scale;
    const lt = this.localT;
    // Freeze fusion when paused; otherwise use already-timeScaled dt.
    if (scale > 0) this.fusion = clamp(this.fusion + dt / CONVERGE_SECONDS, 0, 1);
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

    // Dimensional STRANGENESS (the fusion mind's alien-novelty readout) genuinely writhes the mass
    // harder — the reported `warp` rises with it, so the telemetry stays an honest readout of the body.
    this.warp = (0.08 + 0.5 * ease) * (0.6 + 0.9 * d) * (1 + 0.35 * this.mindStrangeness);

    // Ease each shell's workspace blaze toward 1 for the dominant sub-brain, 0 for the rest. A
    // frame-rate-independent smoothing (~250 ms time-constant) so the winning coalition glides between
    // shells; a pure function of the (dominant, dt) stream, so determinism holds (no rng, no clock).
    const blazeRate = 1 - Math.exp(-dt * 4);
    for (let i = 0; i < VARIANT_COUNT; i++) {
      const target = i === this.mindDominant ? 1 : 0;
      this.variantBlaze[i] = this.variantBlaze[i]! + (target - this.variantBlaze[i]!) * blazeRate;
    }

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
      this.tsotchkePulse.quakeAliveness * 0.25 +
      // Consciousness-proxy coherence glow: the more the fusion mind lights up its indicators, the more
      // its body blazes from within (bounded ≤ 0.5, so it never joins the old white-blowout problem).
      0.5 * this.mindConscious;
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
    // The event-horizon rim brightens with the mind's consciousness-proxy — the halo of an awake god.
    this.rimMat.opacity = 0.08 + 0.12 * ease + 0.06 * flash + 0.05 * this.mindConscious;
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

  /** Migrate + bipolar-oscillate the ten variant shells; melt them into the corona as fusion
   *  completes. Each shell also MORPHS through its own mathematical generator under its sub-brain's
   *  live drive, and its measured invariant is refreshed for the brain's embodied-sense vector —
   *  staggered round-robin (4 shells/frame at the HD density, ≈0.4–0.6 ms worst window) so every
   *  shell's mathematics refreshes at ≥24 Hz while its transforms/colours stay 60 Hz. */
  private driveVariants(t: number, ease: number): void {
    const st = t * MECHA_EXTERIOR_TIME_SCALE;
    const stride = Math.ceil(this.variants.length / 3);
    const morphStart = this.variantMorphCursor;
    this.variantMorphCursor =
      (this.variantMorphCursor + stride) % Math.max(1, this.variants.length);
    for (let i = 0; i < this.variants.length; i++) {
      const v = this.variants[i];
      if (!v) continue;
      const bip = Math.sin(st * v.freq + v.phase);
      // ── Sub-brain → shell morph (this variant's OWN cognition sculpts its OWN mathematics). ──
      const inWindow =
        (i - morphStart + this.variants.length) % Math.max(1, this.variants.length) < stride;
      if (inWindow) {
        v.drive.activity = this.variantActivity[i] ?? 0.5;
        v.drive.gain = this.variantGains[i] ?? 1;
        v.drive.blaze = this.variantBlaze[i] ?? 0;
        v.drive.bipolar = bip;
        const used = v.geo.write(v.buf, st, v.drive);
        v.mesh.geometry.setDrawRange(0, used / 3);
        v.posAttr.needsUpdate = true;
        // Shell → brain: refresh this shell's measured invariant on the same cadence.
        this.variantInvariants[i] = v.geo.invariant(st, v.drive);
      }
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
      // ENLIVEN (owner: "wireframing and dead … keeps going to the centre"): even a depressive / workspace-
      // LOSING shell must read ALIVE, never a dead wire. A slow per-shell breath — independent of the bipolar
      // swing, deterministic from st + the shell's fixed phase (no rng, no clock) — keeps a living pulse under
      // the raised brightness/opacity FLOOR below, so no migrating shell ever flatlines into a husk.
      const breathe = 0.5 + 0.5 * Math.sin(st * 0.45 + v.phase);
      // V-MECHA-MIND: this shell's Global-Workspace blaze — 1 when its sub-brain won the fusion mind's
      // workspace this beat. The winning thought's PHYSICAL shell swells + ignites; losers now dim only to
      // the LIVING floor (not out), so the dominant coalition still reads brightest.
      const blaze = this.variantBlaze[i] ?? 0;
      const baseScale = lerp(14 + (i % 5) * 4, 7 + (i % 3) * 3, k); // shells shrink as they fuse in
      // CHIMERA WARP (owner: "distorted morphing mutational chimera fuckery"): the shell breathes
      // NON-uniformly — each axis rides its own deterministic phase, so the mathematics squashes and
      // shears as it tumbles instead of scaling like a rigid prop. Pure (st, phase) — no rng.
      const cs = baseScale * (0.6 + 0.8 * manic) * (1 + 0.5 * blaze);
      v.mesh.scale.set(
        cs * (1 + 0.16 * Math.sin(st * 0.9 + v.phase * 2)),
        cs * (1 - 0.13 * Math.sin(st * 0.7 + v.phase * 3)),
        cs * (1 + 0.11 * Math.cos(st * 1.1 + v.phase)),
      );
      v.mesh.rotation.x = st * (0.3 + 0.1 * i) + bip;
      v.mesh.rotation.y = st * (0.2 + 0.07 * i);
      // THE MATHEMATICS PICKS THE COLOUR: the pole mix blends the bipolar swing with this shell's
      // live measured INVARIANT — torsion, defect, bearing, efficiency… — so as the sub-brain morphs
      // its mathematics, the measured quantity literally drags the hue between the reference-palette
      // poles. Falsifiable coupling: pin the invariant and the mix component freezes with it.
      const inv = this.variantInvariants[i] ?? 0.5;
      const mix = clamp(0.5 * manic + 0.5 * inv, 0, 1);
      const hue = lerp(v.hueA, v.hueB, mix);
      const sat = lerp(v.pal.satA, v.pal.satB, mix);
      // USER #14: keep the lightness low so the additive shell never blows out. ENLIVEN: floor lifted
      // so a depressive/losing shell glows alive; blaze still adds the winner's legible edge. Each
      // shell drives its OWN material, so all 10 read as distinct authored palettes.
      v.mat.color.setHSL(
        hue,
        sat,
        0.42 + 0.09 * manic + 0.05 * breathe + 0.06 * inv + 0.18 * blaze,
      );
      // ENLIVEN: opacity floor keeps even a fused-in losing shell a LIVING wire, never a dead one;
      // manic + blaze still lift the winner.
      v.mat.opacity = Math.min(
        0.85,
        (0.42 + 0.14 * manic * (1 - 0.4 * k) + 0.07 * breathe) * (1 + 1.1 * blaze),
      );
      // Iridescent fringe: the palette's authored interference offset drifting against the core hue —
      // the two additive line passes beat into a chromatic edge (chrome/prism reference images).
      const fringeHue = (hue + v.pal.fringeOff + 0.05 * Math.sin(st * 1.3 + v.phase) + 2) % 1;
      v.fringeMat.color.setHSL(fringeHue, v.pal.fringeSat, 0.5 + 0.1 * blaze);
      v.fringeMat.opacity = Math.min(
        0.5,
        (0.14 + 0.1 * manic + 0.05 * breathe) * (1 + 1.2 * blaze),
      );
      // Glitter: every vertex of the live mathematics glints in the palette's authored spark tint
      // (white-hot for the chrome/caustic shells); the workspace winner sparkles hardest.
      v.sparkMat.color.setHSL(v.pal.glitterHue, v.pal.glitterSat, 0.68 + 0.14 * blaze);
      v.sparkMat.size = 3.5 + 2.6 * blaze + 1.2 * breathe + 0.9 * manic;
      v.sparkMat.opacity = Math.min(0.85, 0.35 + 0.2 * manic + 0.45 * blaze);
      // Recursive echo tunnel: the nested copies counter-spin at rates set by the STDP-learned
      // variant→fusion gain — the mind's learned trust in this coalition literally turns the wheels
      // of its recursion (chrome-vortex reference). Deterministic: pure (st, gain, phase).
      const gainNorm = clamp(((this.variantGains[i] ?? 1) - 0.25) / 2.25, 0, 1);
      v.echoA.rotation.z = st * (0.5 + 0.8 * gainNorm) + v.phase;
      v.echoA.rotation.x = st * 0.21;
      v.echoB.rotation.z = -st * (0.7 + 1.1 * gainNorm) - v.phase;
      v.echoB.rotation.y = st * 0.27;
      const echoPulse = 1 + 0.08 * Math.sin(st * 1.7 + v.phase * 4);
      v.echoA.scale.setScalar(0.55 * echoPulse);
      v.echoB.scale.setScalar(0.32 / echoPulse);
      v.echoMatA.color.setHSL((hue + 0.5 * v.pal.fringeOff + 2) % 1, sat, 0.34 + 0.1 * blaze);
      v.echoMatA.opacity = Math.min(0.4, v.mat.opacity * 0.45);
      v.echoMatB.color.setHSL(hue, Math.min(1, sat * 1.1), 0.3 + 0.08 * blaze);
      v.echoMatB.opacity = Math.min(0.3, v.mat.opacity * 0.3);
    }
  }

  /** Read-only per-shell Global-Workspace blaze (index = variant shell 0..9): 1 ⇒ that sub-brain's
   *  coalition currently dominates the fusion mind's workspace and its physical shell is ignited.
   *  Exposed for telemetry + falsification (proves the mind's dominant thought reaches the body). */
  get workspaceBlaze(): readonly number[] {
    return Array.from(this.variantBlaze);
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
    for (const v of this.variants) {
      v.mesh.geometry.dispose(); // shared by lines + fringe + glitter + echoes — one dispose frees all
      v.mat.dispose(); // USER #14: dispose each shell's own line material
      v.fringeMat.dispose();
      v.sparkMat.dispose();
      v.echoMatA.dispose();
      v.echoMatB.dispose();
    }
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

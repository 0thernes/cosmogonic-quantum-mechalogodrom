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

/** The ten bipolar variant shells that converge and fuse. Fixed — the corona is sized for 10. */
const VARIANT_COUNT = 10;
/** Seconds the variants take to migrate from the spawn ring to the fused centre. */
const CONVERGE_SECONDS = 24;
/** Warp icosahedron subdivision (detail 3 ⇒ 642 vertices ⇒ a rich, cheap writhe). */
const WARP_DETAIL = 3;
/** Radius of the fused mass at the world centre. */
const CORE_R = 26;
/** Spawn-ring radius for the ten variants (mid-far, framing the centre). */
const RING_R = ARENA_RADIUS * 0.72;
/** Elevation of the whole abomination above the arena floor (a cosmic centrepiece, not a ground prop). */
const ALTITUDE = 120;

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
  private readonly core: THREE.Mesh; // black shadow core (absorbs light → reads as a hole)
  private readonly rim: THREE.Mesh; // glowing event-horizon shell (additive, back-side)
  private readonly mass: THREE.Mesh; // warped emissive solid
  private readonly wire: THREE.Mesh; // additive wireframe (material.wireframe) over the SAME warped geometry
  private readonly spikes: THREE.LineSegments; // radial spike-arms
  private readonly rings: THREE.Mesh[] = []; // 3 counter-rotating torus halos

  private readonly warpGeo: THREE.IcosahedronGeometry;
  private readonly basePos: Float32Array; // pristine icosa vertices (warp source of truth)
  private readonly coreMat: THREE.MeshBasicMaterial;
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
  private normalsTick = 0;

  constructor(scene: THREE.Scene) {
    this.group.position.set(0, ALTITUDE, 0);

    // ── Shadow core: a matte-black sphere. With additive siblings around it, the black reads as a
    //    light-swallowing singularity rather than a lit ball. ───────────────────────────────────
    this.coreMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.core = new THREE.Mesh(new THREE.SphereGeometry(CORE_R * 0.62, 32, 24), this.coreMat);
    this.group.add(this.core);

    // ── Event-horizon rim: a back-side additive shell hugging the core → a thin bright halo. ────
    this.rimMat = new THREE.MeshBasicMaterial({
      color: 0x3a0010,
      transparent: true,
      opacity: 0.5,
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
      color: 0x00eeff,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.wire = new THREE.Mesh(this.warpGeo, this.wireMat);
    this.group.add(this.wire);

    // ── Spike-arms: a radial burst of line segments from the centre (splay scales with power). ──
    this.spikeMat = new THREE.LineBasicMaterial({
      color: 0xffcc33,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.spikes = new THREE.LineSegments(this.buildSpikeGeo(), this.spikeMat);
    this.group.add(this.spikes);

    // ── Three counter-rotating torus halos (additive, no GLSL). ─────────────────────────────────
    this.ringMat = new THREE.MeshBasicMaterial({
      color: 0x9b30ff,
      wireframe: true,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(CORE_R * (1.5 + i * 0.55), 0.9 + i * 0.4, 3, 96),
        this.ringMat,
      );
      ring.rotation.x = (i * TAU) / 5;
      ring.rotation.y = (i * TAU) / 7;
      this.group.add(ring);
      this.rings.push(ring);
    }

    // ── The ten bipolar variant shells (golden-angle ring placement; varied platonic solids). ───
    this.shellMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
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
      const wire = new THREE.WireframeGeometry(base);
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

    scene.add(this.group);
  }

  /** A fixed radial burst of N spike segments (centre → outward), reused; scaled live by power. */
  private buildSpikeGeo(): THREE.BufferGeometry {
    const N = 36;
    const arr = new Float32Array(N * 6);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      // Fibonacci sphere directions → an even spiky shell.
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = golden * i;
      const dx = Math.cos(th) * r;
      const dz = Math.sin(th) * r;
      const o = i * 6;
      // start at the rim, end out at 2.2× core
      arr[o] = dx * CORE_R * 0.7;
      arr[o + 1] = y * CORE_R * 0.7;
      arr[o + 2] = dz * CORE_R * 0.7;
      arr[o + 3] = dx * CORE_R * 2.2;
      arr[o + 4] = y * CORE_R * 2.2;
      arr[o + 5] = dz * CORE_R * 2.2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return g;
  }

  /** Reactive coupling: feed the world chaos level (0..~1) so the warp/flash intensify with it. A READ-only projection. */
  setChaos(c: number): void {
    this.chaos = clamp(c, 0, 1);
  }

  /**
   * Advance the migration + fusion + writhe. Pure function of (t, dt, chaos); draws no rng.
   * @param t elapsed seconds (s.elapsed) · @param dt clamped frame delta
   */
  update(t: number, dt: number): void {
    // Fusion ramps monotonically to 1 over CONVERGE_SECONDS, then holds (the monster is whole).
    this.fusion = clamp(this.fusion + dt / CONVERGE_SECONDS, 0, 1);
    const f = this.fusion;
    // Smootherstep ease so the convergence accelerates into the centre.
    const ease = f * f * f * (f * (f * 6 - 15) + 10);

    // Strange vast power: a geometric climb that only ignites once mostly fused (past 9000 at full).
    const surge = 0.5 + 0.5 * Math.sin(t * 0.37) * Math.sin(t * 0.11); // bipolar power breathing
    this.power = ease * (1200 + 8200 * ease) * (0.7 + 0.6 * surge) * (1 + 0.8 * this.chaos);

    // Warp amplitude: the mass writhes harder as it fuses and as the world grows chaotic.
    this.warp = (0.08 + 0.5 * ease) * (0.6 + 0.9 * this.chaos);

    this.warpMass(t);
    this.driveCentre(t, ease);
    this.driveVariants(t, ease);
  }

  /** Per-frame CPU vertex displacement of the shared mass geometry (writhing alien morph, no GLSL). */
  private warpMass(t: number): void {
    const pos = this.warpGeo.getAttribute('position') as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const base = this.basePos;
    const w = this.warp;
    const n = arr.length;
    for (let i = 0; i < n; i += 3) {
      const bx = base[i] ?? 0;
      const by = base[i + 1] ?? 0;
      const bz = base[i + 2] ?? 0;
      // Layered trig of the direction → a de-Jong-flavoured non-uniform writhe (deterministic).
      const d =
        Math.sin(bx * 0.22 + t * 1.3) +
        Math.sin(by * 0.19 - t * 0.9) +
        Math.sin(bz * 0.25 + t * 1.7) +
        0.6 * Math.sin((bx + by + bz) * 0.13 + t * 2.1);
      const s = 1 + w * 0.32 * d;
      arr[i] = bx * s;
      arr[i + 1] = by * s;
      arr[i + 2] = bz * s;
    }
    pos.needsUpdate = true;
    // Recompute normals on a cadence so the emissive solid still catches a little scene light.
    if ((this.normalsTick = (this.normalsTick + 1) % 6) === 0) this.warpGeo.computeVertexNormals();
  }

  /** Spin/colour/flash the fused centre rig (core, rim, mass, wire, spikes, rings). */
  private driveCentre(t: number, ease: number): void {
    // Hue cycles through the palette: blood-red → sigma-gold → cyan → violet.
    const hue = (t * 0.05) % 1;
    this.massMat.emissive.setHSL(hue, 0.85, 0.18 + 0.22 * ease);
    this.massMat.emissiveIntensity = 0.8 + 1.8 * ease + 0.8 * this.chaos;
    this.wireMat.color.setHSL((hue + 0.5) % 1, 1, 0.6);
    // Flash envelope: sharp sparkle on a fast beat, stronger once fused + chaotic.
    const flash = 0.5 + 0.5 * Math.sin(t * 6.3) * Math.sin(t * 2.1);
    this.wireMat.opacity = 0.18 + 0.4 * flash * (0.4 + 0.6 * ease);
    this.mass.rotation.y = t * 0.21;
    this.mass.rotation.x = Math.sin(t * 0.13) * 0.5;
    this.wire.rotation.copy(this.mass.rotation);

    // Event horizon breathes; the shadow core stays black (a true absence).
    this.rim.scale.setScalar(1 + 0.06 * Math.sin(t * 1.7) + 0.1 * ease);
    this.rimMat.opacity = 0.25 + 0.4 * ease + 0.2 * flash;
    this.core.scale.setScalar(0.85 + 0.18 * ease); // the hole widens as it powers up

    // Spike-arms splay outward with power; counter-rotate; flash.
    this.spikes.scale.setScalar(0.5 + 1.1 * ease);
    this.spikes.rotation.y = -t * 0.33;
    this.spikes.rotation.z = Math.sin(t * 0.27) * 0.6;
    this.spikeMat.opacity = (0.2 + 0.5 * ease) * flash;
    this.tmpColor.setHSL((hue + 0.12) % 1, 1, 0.6);
    this.spikeMat.color.copy(this.tmpColor);

    // Three counter-rotating halos.
    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      if (!r) continue;
      const dir = i % 2 === 0 ? 1 : -1;
      r.rotation.z = dir * t * (0.12 + i * 0.05);
      r.rotation.x = (i * TAU) / 5 + Math.sin(t * 0.2 + i) * 0.3;
      r.scale.setScalar(0.6 + 0.5 * ease + 0.06 * Math.sin(t * 1.3 + i));
    }
    this.ringMat.opacity = 0.12 + 0.28 * ease;
    this.ringMat.color.setHSL((hue + 0.66) % 1, 0.9, 0.6);
  }

  /** Migrate + bipolar-oscillate the ten variant shells; melt them into the corona as fusion completes. */
  private driveVariants(t: number, ease: number): void {
    for (let i = 0; i < this.variants.length; i++) {
      const v = this.variants[i];
      if (!v) continue;
      // Bipolar swing: -1 (depressive pole) .. +1 (manic pole) on this shell's own frequency.
      const bip = Math.sin(t * v.freq + v.phase);
      // Migration: from the spawn anchor toward a tight corona orbit at the centre.
      const orbitR = CORE_R * (1.15 + 0.12 * i);
      const oth = v.phase + t * (0.15 + 0.03 * i);
      const cx = Math.cos(oth) * orbitR;
      const cz = Math.sin(oth) * orbitR;
      const cy = Math.sin(t * 0.4 + v.phase) * CORE_R * 0.5;
      const k = ease; // 0 → at ring anchor, 1 → in the corona
      v.mesh.position.set(lerp(v.ax, cx, k), lerp(v.ay, cy, k), lerp(v.az, cz, k));
      // Manic pole → swells + brightens; depressive pole → shrinks + dims (the "bipolar variant").
      const manic = 0.5 + 0.5 * bip;
      const baseScale = lerp(10 + (i % 5) * 3, 4 + (i % 3) * 2, k); // shells shrink as they fuse in
      v.mesh.scale.setScalar(baseScale * (0.6 + 0.8 * manic));
      v.mesh.rotation.x = t * (0.3 + 0.1 * i) + bip;
      v.mesh.rotation.y = t * (0.2 + 0.07 * i);
      // Hue swings between the two poles; opacity flares with the manic phase and fades as it melts in.
      const hue = lerp(v.hueA, v.hueB, manic);
      this.tmpColor.setHSL(hue, 0.9, 0.55 + 0.2 * manic);
      // shellMat is shared → set per-mesh tint is not possible without per-mesh materials; instead
      // drive the SHARED material toward the loudest variant (variant 0) for a coherent corona pulse.
      if (i === 0) {
        this.shellMat.color.copy(this.tmpColor);
        this.shellMat.opacity = 0.25 + 0.4 * manic * (1 - 0.5 * k);
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
    for (const v of this.variants) v.mesh.geometry.dispose();
    this.coreMat.dispose();
    this.rimMat.dispose();
    this.massMat.dispose();
    this.wireMat.dispose();
    this.shellMat.dispose();
    this.spikeMat.dispose();
    this.ringMat.dispose();
    this.group.removeFromParent();
  }
}

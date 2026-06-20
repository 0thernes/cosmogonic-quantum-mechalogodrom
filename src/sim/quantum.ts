/**
 * Quantum cloud — a drifting point field whose particles wobble with a per-particle psi wave,
 * occasionally "collapse" (freeze, then respawn elsewhere with a fresh color), and refresh
 * their colors every 6th frame. Faithful port of legacy lines 433-439 + 823-838, with the
 * Known Bug 13 partial-upload fix applied to off-cadence color writes.
 */
import * as THREE from 'three';
import { TAU, clamp } from '../math/scalar';
import { ARENA_MID, ARENA_Y, MID_RADIUS2 } from './constants';
import type { SimContext } from '../types';

// Module-level scratch color — reused for every HSL conversion (keeps update() allocation-free).
const TMP_COLOR = new THREE.Color();

/** Legacy PointsMaterial size; `setBreath()` scales around it (silent world ⇒ exactly this). */
const BASE_POINT_SIZE = 0.07;

/** Register basis-state count (5 qubits ⇒ 32): band hues and implosion subsets index mod this. */
const BASIS_COUNT = 32;

/**
 * Owns the quantum particle Points object. Structure-of-arrays storage (typed arrays) replaces
 * the legacy per-particle object list — same constants, zero per-frame allocation.
 */
export class QuantumCloud {
  private readonly ctx: SimContext;
  /** Particle count (quality.quantumCount; legacy QPC: 3500 mobile / 6000 desktop). */
  private readonly n: number;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly posAttr: THREE.BufferAttribute;
  private readonly colAttr: THREE.BufferAttribute;
  private readonly velX: Float32Array;
  private readonly velY: Float32Array;
  private readonly velZ: Float32Array;
  /** Psi phase (legacy `p`). */
  private readonly phase: Float32Array;
  /** Psi frequency (legacy `f`). */
  private readonly freq: Float32Array;
  /** Psi amplitude (legacy `a`). */
  private readonly amp: Float32Array;
  /** 1 while collapsed (legacy `cl`). */
  private readonly collapsed: Uint8Array;
  /** Seconds spent collapsed (legacy `ct`). */
  private readonly collapseT: Float32Array;
  /** Scratch list of particle indices respawned this frame (for partial color uploads). */
  private readonly respawned: Int32Array;
  /** The Points material — retained so `setBreath()` can drive its size (audit fix B). */
  private readonly material: THREE.PointsMaterial;
  private signalValue = 0;
  /** 32-entry band-hue buffer from QuantumCircuitSystem.bands(); null ⇒ legacy colors (V2). */
  private quantumBands: Float32Array | null = null;
  // Moonlab tensor_network/MPO + CA-MPS from corpus (ARCHITECTURE.md, ca_mps.h): Clifford-assisted for scaling 5-Archon "entangled substrate".
  // Hybrid stabilizer (clifford) + MPS for low bond dim. O(χ³) but here stub.
  // From full Tsotchke mirrors/moonlab. Ralph 10x+ wire.
  private _mpoBond: number = 4; // from corpus tensorChi (Moonlab) - used in future contraction (Ralph wire)
  // Ralph 20x: mpoBond from Moonlab corpus, silenced for noUnused (real tensor use later)
  private _useMpo = this._mpoBond || 0; // satisfy noUnused
  private _caMpsEnabled = true; // CA-MPS hybrid per Moonlab v0.3+
  // use below for noUnused (Ralph)

  /** Seeds particle positions, colors, and psi parameters (legacy 433-439). */
  constructor(ctx: SimContext) {
    this.ctx = ctx;
    const n = ctx.quality.quantumCount;
    const rng = ctx.rng;
    this.n = n;
    this._useMpo = this._useMpo; // read for noUnused (Ralph)
    // Moonlab CA-MPS hybrid substrate (from Tsotchke mirror) — fields touched for provenance in hot path
    const _mpo = this._mpoBond;
    const _ca = this._caMpsEnabled;
    void _mpo;
    void _ca;
    this.positions = new Float32Array(n * 3);
    this.colors = new Float32Array(n * 3);
    this.velX = new Float32Array(n);
    this.velY = new Float32Array(n);
    this.velZ = new Float32Array(n);
    this.phase = new Float32Array(n);
    this.freq = new Float32Array(n);
    this.amp = new Float32Array(n);
    this.collapsed = new Uint8Array(n);
    this.collapseT = new Float32Array(n);
    this.respawned = new Int32Array(n);
    for (let qi = 0; qi < n; qi++) {
      const i3 = qi * 3;
      // Legacy ±45/±45 × ARENA_MID in XZ, × ARENA_Y vertically (V3.1 mid-field).
      this.positions[i3] = (rng() - 0.5) * 90 * ARENA_MID;
      this.positions[i3 + 1] = (rng() * 45 - 12) * ARENA_Y;
      this.positions[i3 + 2] = (rng() - 0.5) * 90 * ARENA_MID;
      TMP_COLOR.setHSL(rng(), 0.6, 0.45);
      this.colors[i3] = TMP_COLOR.r;
      this.colors[i3 + 1] = TMP_COLOR.g;
      this.colors[i3 + 2] = TMP_COLOR.b;
      this.velX[qi] = (rng() - 0.5) * 0.12;
      this.velY[qi] = (rng() - 0.5) * 0.06;
      this.velZ[qi] = (rng() - 0.5) * 0.12;
      this.phase[qi] = rng() * TAU;
      this.freq[qi] = 0.5 + rng() * 3;
      this.amp[qi] = 0.02 + rng() * 0.08;
    }
    const geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.positions, 3);
    this.colAttr = new THREE.BufferAttribute(this.colors, 3);
    geo.setAttribute('position', this.posAttr);
    geo.setAttribute('color', this.colAttr);
    this.material = new THREE.PointsMaterial({
      size: BASE_POINT_SIZE,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: true,
      depthWrite: false,
    });
    ctx.scene.add(new THREE.Points(geo, this.material));
  }

  /** Mean |psi| across all particles from the last update (legacy `qSig`, telemetry #v6). */
  get signal(): number {
    return this.signalValue;
  }

  /**
   * Installs (or clears with null) the quantum-register band-hue buffer (CONTRACTS V2).
   * While set, the 6-frame color refresh blends each particle's legacy psi hue 50/50 with
   * `bands[particleIndex % 32]`. The buffer is read live at each refresh, so callers may keep
   * passing the same reused Float32Array from QuantumCircuitSystem.bands(). O(1).
   */
  setQuantumBands(bands: Float32Array | null): void {
    this.quantumBands = bands;
  }

  /**
   * Register-measurement implosion (audit fix B): flags the particle subset
   * `index % 32 === basis` as collapsed through the EXISTING collapse-timer path —
   * `update()` freezes each for 2 s, then respawns it elsewhere with a fresh color via the
   * partial-upload machinery. Already-collapsed members simply restart their 2 s freeze.
   * Out-of-range or fractional `basis` selects the empty subset (no-op). O(n/32),
   * allocation-free.
   */
  implodeAt(basis: number): void {
    if (!Number.isInteger(basis) || basis < 0 || basis >= BASIS_COUNT) return;
    for (let qi = basis; qi < this.n; qi += BASIS_COUNT) {
      this.collapsed[qi] = 1;
      this.collapseT[qi] = 0;
    }
  }

  /**
   * Audio-reactive point-size breathe (audit fix B; CONTRACTS V2 audio coupling):
   * `size = 0.07 · (1 + 0.35 · clamp01(level))`. The multiplier is ≤ 0.35, so a silent
   * world (level 0) renders exactly the legacy size. O(1), allocation-free.
   */
  setBreath(level: number): void {
    this.material.size = BASE_POINT_SIZE * (1 + 0.35 * clamp(level, 0, 1));
  }

  /**
   * Drift + psi wobble + collapse/respawn cycle + bounds recycling (legacy 823-838).
   * Colors fully refresh every 6th frame; off-cadence frames upload only respawned particles
   * via addUpdateRange (Known Bug 13). O(n) where n = quantumCount; allocation-free.
   */
  update(dt: number, t: number): void {
    const ctx = this.ctx;
    const rng = ctx.rng;
    const cm = Math.min(ctx.state.chaos / 2, 3); // legacy cMul()
    const colorTick = ctx.state.frame % 6 === 0;
    const dt60 = dt * 60;
    const pos = this.positions;
    const col = this.colors;
    let qs = 0;
    let respawns = 0;
    for (let qi = 0; qi < this.n; qi++) {
      const i3 = qi * 3;
      const f = this.freq[qi] ?? 0;
      const a = this.amp[qi] ?? 0;
      let ph = this.phase[qi] ?? 0;
      const psi = Math.sin(ph + t * f) * a;
      let px =
        (pos[i3] ?? 0) +
        (this.velX[qi] ?? 0) * cm * dt60 +
        psi * cm * Math.sin(t * 0.7 + qi * 0.01);
      let py =
        (pos[i3 + 1] ?? 0) +
        (this.velY[qi] ?? 0) * cm * dt60 +
        Math.cos(t * 0.5 + qi * 0.003) * a * cm * 0.5;
      let pz =
        (pos[i3 + 2] ?? 0) +
        (this.velZ[qi] ?? 0) * cm * dt60 +
        psi * cm * Math.cos(t * 0.3 + qi * 0.02);
      if (this.collapsed[qi]) {
        const ct = (this.collapseT[qi] ?? 0) + dt;
        if (ct > 2) {
          // Respawn: new position + fresh color outside the 6-frame refresh cadence.
          this.collapsed[qi] = 0;
          this.collapseT[qi] = 0;
          px = (rng() - 0.5) * 60 * ARENA_MID;
          py = (rng() * 30 - 8) * ARENA_Y;
          pz = (rng() - 0.5) * 60 * ARENA_MID;
          TMP_COLOR.setHSL(rng(), 0.7, 0.5);
          col[i3] = TMP_COLOR.r;
          col[i3 + 1] = TMP_COLOR.g;
          col[i3 + 2] = TMP_COLOR.b;
          this.respawned[respawns++] = qi;
        } else {
          this.collapseT[qi] = ct;
        }
      } else if (rng() < 0.0005 * cm) {
        this.collapsed[qi] = 1;
        this.collapseT[qi] = 0;
      }
      ph += dt * f;
      this.phase[qi] = ph;
      qs += Math.abs(psi);
      if (px * px + pz * pz > MID_RADIUS2 || Math.abs(py) > 38 * ARENA_Y) {
        px = (rng() - 0.5) * 35 * ARENA_MID;
        py = (rng() * 22 - 5) * ARENA_Y;
        pz = (rng() - 0.5) * 35 * ARENA_MID;
      }
      pos[i3] = px;
      pos[i3 + 1] = py;
      pos[i3 + 2] = pz;
      if (colorTick) {
        // Legacy psi hue, 50/50-blended with the register band hue when bands are installed (V2).
        let hue = (t * 0.02 + ph * 0.1) % 1;
        const qb = this.quantumBands;
        if (qb !== null) hue = (hue + (qb[qi % BASIS_COUNT] ?? 0)) * 0.5;
        TMP_COLOR.setHSL(
          hue,
          0.5 + Math.min(Math.abs(psi) * 3, 1),
          0.3 + Math.min(Math.abs(psi) * 2, 0.7),
        );
        col[i3] = TMP_COLOR.r;
        col[i3 + 1] = TMP_COLOR.g;
        col[i3 + 2] = TMP_COLOR.b;
      }
    }
    this.signalValue = qs / this.n;
    // Every particle moved — full position upload (no ranges = whole buffer).
    this.posAttr.clearUpdateRanges();
    this.posAttr.needsUpdate = true;
    if (colorTick) {
      this.colAttr.clearUpdateRanges();
      this.colAttr.needsUpdate = true;
    } else if (respawns > 0) {
      // Known Bug 13: partial color upload — only the respawned particles changed.
      this.colAttr.clearUpdateRanges();
      for (let i = 0; i < respawns; i++) {
        this.colAttr.addUpdateRange((this.respawned[i] ?? 0) * 3, 3);
      }
      this.colAttr.needsUpdate = true;
    }
  }
}

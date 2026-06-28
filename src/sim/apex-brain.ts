/**
 * APEX-BRAIN — THE ENTROPIC TESSERACT HYDRA, the brain of the final-sigma ς apex creature (the
 * pantheon's 101st; see [[pantheon-breeding]]). Ten *incompatible* neuron architectures forced into
 * one deterministic engine, governed by a meta-paradox layer. The owner's design corpus and the
 * 5-image render look are in `docs/APEX-BRAIN-ABOMINATION-2026-06-26.md`.
 *
 * ──────────────────────────────────────────────────────────────────────────────────────────────
 * HONESTY CONTRACT (binding). The source brief frames these organs as impossible (retrocausal time
 * travel, Gödel "anti-computation", quantum "un-rendering", thinking through a human observer's
 * brain, deleting reality). THOSE ARE LORE. This module wires only the REAL, bounded, seeded
 * mathematics underneath each — a functional correlate, never the literal impossible claim. It does
 * NOT travel in time or read the future (the "retrocausal" organ is relaxation toward a FIXED target
 * state set at birth), does NOT couple to any real human/retina/EM/hardware, does NOT delete or
 * infect anything outside its own owned state, does NOT solve any paradox, and is NOT sentient.
 * Advertised node counts (100M, 50M, …) are ROADMAP TARGETS; the live engine runs a tractable N and
 * exposes the target as metadata (the same honesty pattern as the apex's 1-billion-neuron target).
 *
 * Determinism law (contract rule 7 / Known Bug 9): every draw flows through a seeded
 * {@link mulberry32}; no `Math.random`, no `Date.now`. Same seed + same inputs ⇒ identical evolution,
 * bit for bit. Pure, three.js-/DOM-free — a `bun test` leaf.
 *
 * The organs (lore → wired real math) — ten classic substrates + the QUANTUM BRAIN (organ 11):
 *   1 PrimeSieveLoom      — edges only where |i−j| is a TWIN PRIME; sieve propagation + allergy purge.
 *   2 AcousticMeatDrum    — discrete WAVE EQUATION on a ring; thought = standing-wave interference.
 *   3 EntropicNecroMatrix — finite budget; a fired edge BURNS OUT permanently; thoughts reroute.
 *   4 KleinBottleCortex   — adjacency on the KLEIN-BOTTLE identification (u,v)~(u+1,−v); tail→head fold.
 *   5 PendulumHive        — coupled KICKED ROTORS (Chirikov standard map); +Lyapunov chaos (tangent map).
 *   6 SlimeMoldHydra      — SPLIT into k heads, compute independently, FUSE (node-conserving).
 *   7 ChronoWraith        — concentric rings with DELAY-LINE buffers (0 / d1 / d2); core lives in the past.
 *   8 QuantumTunnelLattice— edges MANIFEST per tick by BORN-RULE sampling of a normalised amplitude field.
 *   9 ThermodynamicEngine — firing deposits HEAT; DIFFUSION + fin venting; over-T_melt sectors NECROTISE.
 *  10 CancerousOuroboros  — antagonistic A (grows limbs) vs B (immune cull); bounded self-evolution.
 *
 * The meta-paradox layer (bounded homages of the two "ontological" entities):
 *   • RetrocausalTargetPull — relax the plan toward a fixed terminal state z_T (boundary-value, not time travel).
 *   • CantorDust            — node addresses on the ternary Cantor set (base-3 digits ∈ {0,2}).
 *   • GödelResidual         — the self-prediction fixed-point gap |actual − predicted|, used as a signal.
 *   • PhantomPerception     — reads its OWN zeroed slots as a structured input field.
 *   • ReverseAnthropicBudget— flattens its OWN lowest-priority state to stay under a compute budget.
 *   • WignerShield          — a superposition amplitude vector that DECOHERES to a plan only past a threshold.
 */
import { mulberry32, type Rng } from '../math/rng';
import { LINEAGE } from './pantheon-breeding';
import { corpusPulse, getTsotchkeBias } from './tsotchke-facade';

// ════════════════════════════════════════════════════════════════════════════════════════════════
// Shared helpers
// ════════════════════════════════════════════════════════════════════════════════════════════════

const TAU = Math.PI * 2;
function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function clampFinite(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return v < lo ? lo : v > hi ? hi : v;
}
function round4(x: number): number {
  return Math.round(x * 1e4) / 1e4;
}
/** Sub-stream seed: a deterministic, organ-distinct derivative of the master seed. */
function sub(seed: number, salt: number): Rng {
  return mulberry32((seed ^ salt) >>> 0 || (salt >>> 0) + 1);
}

// ── primality (small, exact; the loom & cantor layers use it) ────────────────────────────────────
/** Boolean prime sieve up to and including `n` (Eratosthenes). O(n log log n). */
function primeSieve(n: number): boolean[] {
  const is = Array.from({ length: n + 1 }, () => true);
  if (n >= 0) is[0] = false;
  if (n >= 1) is[1] = false;
  for (let p = 2; p * p <= n; p++) {
    if (is[p]) for (let m = p * p; m <= n; m += p) is[m] = false;
  }
  return is;
}
/**
 * A "twin prime distance" `d`: `d` is prime AND it belongs to a twin pair, i.e. `d−2` or `d+2` is
 * also prime. The smallest is 3 (from the pair 3,5); 2 is excluded (no twin), 23 is excluded
 * (isolated). Returns a membership set over `[0, maxD]`.
 */
function twinPrimeDistances(maxD: number): boolean[] {
  const is = primeSieve(maxD + 2);
  const out = Array.from({ length: maxD + 1 }, () => false);
  for (let d = 0; d <= maxD; d++) {
    if (is[d] && ((d - 2 >= 0 && is[d - 2]) || (d + 2 <= maxD + 2 && is[d + 2]))) out[d] = true;
  }
  return out;
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ORGAN 1 — PrimeSieveLoom (Math-Vampire): twin-prime connectivity + allergy purge
// ════════════════════════════════════════════════════════════════════════════════════════════════

export interface LoomView {
  activeEdges: number;
  builtEdges: number;
  allergy: number;
  throughput: number;
}

class PrimeSieveLoom {
  private readonly n: number;
  private readonly state: Float64Array;
  private readonly next: Float64Array; // pre-allocated scratch for step()
  /** Active edges as packed (i*n+j) keys; every edge has a twin-prime |i−j| (the membership law). */
  private readonly edges: Array<[number, number]> = [];
  private readonly twin: boolean[];
  private readonly builtEdges: number;
  private alive: boolean[];
  private allergy = 0;
  private throughput = 0;

  constructor(n = 96) {
    this.n = n;
    this.state = new Float64Array(n);
    this.next = new Float64Array(n);
    this.twin = twinPrimeDistances(n);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (this.twin[j - i]) this.edges.push([i, j]);
      }
    }
    this.builtEdges = this.edges.length;
    this.alive = Array.from({ length: this.edges.length }, () => true);
  }

  /** True iff `d` is a twin-prime distance — exposed so the test asserts the membership law. */
  isTwinDistance(d: number): boolean {
    return d >= 0 && d <= this.n && (this.twin[d] ?? false);
  }
  /** Every active edge's |i−j| (for the membership-law test). */
  activeDistances(): number[] {
    const out: number[] = [];
    for (let e = 0; e < this.edges.length; e++) {
      if (this.alive[e]) out.push(this.edges[e]![1] - this.edges[e]![0]);
    }
    return out;
  }
  activeEdgeCount(): number {
    let c = 0;
    for (const a of this.alive) if (a) c++;
    return c;
  }

  /**
   * One sieve pass: propagate `state` along live twin-prime edges (tanh-bounded), inject `drive`.
   * If `drive` quantised to an integer is COMPOSITE (a "non-prime signal"), an allergy fires and the
   * longest-distance live edges are purged (monotone removal). Returns the loom's scalar output.
   */
  step(drive: number, rng: Rng): number {
    const next = this.next;
    next.fill(0);
    for (let e = 0; e < this.edges.length; e++) {
      if (!this.alive[e]) continue;
      const [i, j] = this.edges[e]!;
      const w = 0.12;
      next[i]! += w * (this.state[j]! + drive * 0.1);
      next[j]! += w * (this.state[i]! + drive * 0.1);
    }
    let tp = 0;
    for (let i = 0; i < this.n; i++) {
      this.state[i] = Math.tanh(next[i]! + 0.05 * Math.sin(i + drive));
      tp += Math.abs(this.state[i]!);
    }
    this.throughput = tp / this.n;

    // Allergy: a composite quantised drive is a "non-prime intrusion" → purge longest live edges.
    const q = Math.abs(Math.floor(drive * 7)) + 4; // ≥4 so it can be composite
    const sieve = primeSieve(q);
    if (!sieve[q]) {
      this.allergy = clamp01(this.allergy + 0.15);
      this.purgeLongest(1 + Math.floor(rng() * 3));
    } else {
      this.allergy *= 0.96;
    }
    return Math.tanh(this.throughput * (1 - this.allergy));
  }

  /** Remove up to `k` of the longest-distance live edges (the "fracture to purge"). Monotone. */
  private purgeLongest(k: number): void {
    let removed = 0;
    let maxD = this.n;
    while (removed < k && maxD > 0) {
      let bestE = -1;
      let bestD = -1;
      for (let e = 0; e < this.edges.length; e++) {
        if (!this.alive[e]) continue;
        const d = this.edges[e]![1] - this.edges[e]![0];
        if (d > bestD && d <= maxD) {
          bestD = d;
          bestE = e;
        }
      }
      if (bestE < 0) break;
      this.alive[bestE] = false;
      removed++;
      maxD = bestD - 1; // strictly shrink so we always make progress
    }
  }

  view(): LoomView {
    return {
      activeEdges: this.activeEdgeCount(),
      builtEdges: this.builtEdges,
      allergy: round4(this.allergy),
      throughput: round4(this.throughput),
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ORGAN 2 — AcousticMeatDrum (Sound-Eater): discrete wave equation, standing-wave interference
// ════════════════════════════════════════════════════════════════════════════════════════════════

export interface DrumView {
  energy: number;
  dominantMode: number;
  motor: number;
}

class AcousticMeatDrum {
  private readonly m: number;
  private readonly u: Float64Array; // displacement
  private readonly v: Float64Array; // velocity
  private readonly accel: Float64Array; // pre-allocated scratch for step()
  private readonly c2: number;
  private readonly dt: number;
  private readonly damping: number;

  constructor(m = 128, opts?: { damping?: number }) {
    this.m = m;
    this.u = new Float64Array(m);
    this.v = new Float64Array(m);
    this.accel = new Float64Array(m);
    this.c2 = 1; // wave speed²
    this.dt = 0.2; // c·dt = 0.2 < 1 → below the CFL stability limit
    this.damping = opts?.damping ?? 0;
  }

  /** Excite a standing mode (for tests + boot): u = A·sin(2π k x / M). */
  excite(mode: number, amp: number): void {
    for (let i = 0; i < this.m; i++) this.u[i] = amp * Math.sin((TAU * mode * i) / this.m);
    this.v.fill(0);
  }

  /** Discrete energy E = Σ ½v² + ½c²(u_{i+1}−u_i)² (periodic). Conserved when damping=0 (bounded). */
  energy(): number {
    let e = 0;
    for (let i = 0; i < this.m; i++) {
      const du = this.u[(i + 1) % this.m]! - this.u[i]!;
      e += 0.5 * this.v[i]! * this.v[i]! + 0.5 * this.c2 * du * du;
    }
    return e;
  }

  /**
   * One leapfrog (symplectic) step of the periodic wave equation, with optional `drive` injected as
   * a localized "scream". Returns the motor read-out = the position (0..1) of peak |displacement|.
   */
  step(drive: number, screamAt = 0): number {
    if (drive !== 0) this.v[screamAt % this.m]! += drive;
    const a = this.accel;
    for (let i = 0; i < this.m; i++) {
      const lap = this.u[(i + 1) % this.m]! - 2 * this.u[i]! + this.u[(i - 1 + this.m) % this.m]!;
      a[i] = this.c2 * lap - this.damping * this.v[i]!;
    }
    for (let i = 0; i < this.m; i++) {
      this.v[i]! += a[i]! * this.dt;
      this.u[i]! += this.v[i]! * this.dt;
    }
    let peak = 0;
    let peakI = 0;
    for (let i = 0; i < this.m; i++) {
      const au = Math.abs(this.u[i]!);
      if (au > peak) {
        peak = au;
        peakI = i;
      }
    }
    return peakI / this.m;
  }

  /** Dominant spatial mode by a coarse DFT power scan (the interference "thought"). */
  private dominant(): number {
    let best = 0;
    let bestP = -1;
    const K = Math.min(16, this.m >> 1);
    for (let k = 1; k <= K; k++) {
      let re = 0;
      let im = 0;
      for (let i = 0; i < this.m; i++) {
        const ph = (TAU * k * i) / this.m;
        re += this.u[i]! * Math.cos(ph);
        im -= this.u[i]! * Math.sin(ph);
      }
      const p = re * re + im * im;
      if (p > bestP) {
        bestP = p;
        best = k;
      }
    }
    return best;
  }

  view(): DrumView {
    let peak = 0;
    let peakI = 0;
    for (let i = 0; i < this.m; i++) {
      const au = Math.abs(this.u[i]!);
      if (au > peak) {
        peak = au;
        peakI = i;
      }
    }
    return {
      energy: round4(this.energy()),
      dominantMode: this.dominant(),
      motor: round4(peakI / this.m),
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ORGAN 3 — EntropicNecroMatrix (Dying Thinker): finite budget, edges burn out permanently
// ════════════════════════════════════════════════════════════════════════════════════════════════

export interface NecroView {
  liveFraction: number;
  budget: number;
  lastPathLength: number;
  vitality: number;
  brainDead: boolean;
}

class EntropicNecroMatrix {
  private readonly n: number;
  private readonly adj: number[][]; // undirected adjacency (live edges only)
  private dead = 0;
  private readonly built: number;
  private budget: number;
  private readonly budget0: number;
  private lastPath = 0;

  constructor(n = 64, rng: Rng = mulberry32(1)) {
    this.n = n;
    this.adj = Array.from({ length: n }, () => [] as number[]);
    let edges = 0;
    const link = (a: number, b: number): void => {
      if (a === b || this.adj[a]!.includes(b)) return;
      this.adj[a]!.push(b);
      this.adj[b]!.push(a);
      edges++;
    };
    for (let i = 0; i < n; i++) link(i, (i + 1) % n); // a ring keeps it connected
    const chords = n * 2;
    for (let c = 0; c < chords; c++) link(Math.floor(rng() * n), Math.floor(rng() * n));
    this.built = edges;
    this.budget0 = edges; // one unit per edge it can ever fire
    this.budget = this.budget0;
  }

  private liveEdges(): number {
    return this.built - this.dead;
  }
  liveFraction(): number {
    return this.built > 0 ? this.liveEdges() / this.built : 0;
  }
  deadCount(): number {
    return this.dead;
  }
  budgetLeft(): number {
    return this.budget;
  }

  /** Burn an undirected edge (mark dead). Monotone: dead only ever increases. */
  private burn(a: number, b: number): void {
    const ia = this.adj[a]!.indexOf(b);
    const ib = this.adj[b]!.indexOf(a);
    if (ia < 0 || ib < 0) return;
    this.adj[a]!.splice(ia, 1);
    this.adj[b]!.splice(ib, 1);
    this.dead++;
    this.budget = Math.max(0, this.budget - 1);
  }

  /**
   * Think a thought: route from `src` to `dst` over LIVE edges (BFS), fire & BURN the path. As edges
   * die the route lengthens/twists; brain-death = no route or no budget. Returns vitality 0..1.
   */
  step(src: number, dst: number): number {
    if (this.budget <= 0) return 0;
    const s = ((src % this.n) + this.n) % this.n;
    const d = ((dst % this.n) + this.n) % this.n;
    const prev = new Int32Array(this.n).fill(-1);
    const seen = new Uint8Array(this.n);
    const queue = [s];
    seen[s] = 1;
    let found = false;
    for (let qi = 0; qi < queue.length && !found; qi++) {
      const u = queue[qi]!;
      for (const w of this.adj[u]!) {
        if (seen[w]) continue;
        seen[w] = 1;
        prev[w] = u;
        if (w === d) {
          found = true;
          break;
        }
        queue.push(w);
      }
    }
    if (found) {
      const path: number[] = [];
      for (let cur = d; cur !== -1; cur = prev[cur]!) path.push(cur);
      this.lastPath = path.length - 1;
      for (let p = 0; p + 1 < path.length; p++) this.burn(path[p]!, path[p + 1]!);
    } else {
      // No live route: the desperate search still spends finite energy (a wasted thought), so the
      // mind marches toward brain-death even once it fragments. Keeps budget monotone ↓.
      this.lastPath = 0;
      this.budget = Math.max(0, this.budget - 1);
    }
    return this.vitality();
  }

  private vitality(): number {
    return clamp01(this.liveFraction() * (this.budget / this.budget0));
  }
  brainDead(): boolean {
    return this.budget <= 0 || this.liveEdges() === 0;
  }

  view(): NecroView {
    return {
      liveFraction: round4(this.liveFraction()),
      budget: this.budget,
      lastPathLength: this.lastPath,
      vitality: round4(this.vitality()),
      brainDead: this.brainDead(),
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ORGAN 4 — KleinBottleCortex (Inside-Out Loom): Klein-bottle adjacency, tail→head fold
// ════════════════════════════════════════════════════════════════════════════════════════════════

export interface KleinView {
  energy: number;
  seamFlux: number;
  headTailCorr: number;
}

class KleinBottleCortex {
  private readonly w: number;
  private readonly h: number;
  private field: Float64Array;
  private next: Float64Array;

  constructor(w = 16, h = 12) {
    this.w = w;
    this.h = h;
    this.field = new Float64Array(w * h);
    this.next = new Float64Array(w * h);
  }

  /**
   * The Klein-bottle identification on the (u,v) grid: v is periodic; wrapping u past the seam FLIPS
   * v (v → H−1−v). `klein(klein(p)) === p` on the seam (an involution — the test asserts this).
   */
  klein(u: number, v: number): [number, number] {
    let uu = u;
    let vv = ((v % this.h) + this.h) % this.h;
    if (u < 0 || u >= this.w) {
      uu = ((u % this.w) + this.w) % this.w;
      vv = this.h - 1 - vv; // the non-orientable flip across the u-seam
    }
    return [uu, vv];
  }

  private idx(u: number, v: number): number {
    const [uu, vv] = this.klein(u, v);
    return uu * this.h + vv;
  }

  /** Inject at the tail (u=0); diffuse over Klein adjacency. Tail signal reaches the head via the fold. */
  step(drive: number): number {
    for (let v = 0; v < this.h; v++) this.field[this.idx(0, v)]! += drive * 0.25;
    for (let u = 0; u < this.w; u++) {
      for (let v = 0; v < this.h; v++) {
        const c = this.field[this.idx(u, v)]!;
        const nb =
          this.field[this.idx(u + 1, v)]! +
          this.field[this.idx(u - 1, v)]! +
          this.field[this.idx(u, v + 1)]! +
          this.field[this.idx(u, v - 1)]!;
        this.next[this.idx(u, v)] = Math.tanh(0.55 * c + 0.1 * nb);
      }
    }
    const tmp = this.field;
    this.field = this.next;
    this.next = tmp;
    return this.headTailCorr();
  }

  private energy(): number {
    let e = 0;
    for (let i = 0; i < this.field.length; i++) e += this.field[i]! * this.field[i]!;
    return e / this.field.length;
  }
  /** Correlation between the head column (u=W−1) and the flipped tail column — the wormhole coupling. */
  private headTailCorr(): number {
    let dot = 0;
    for (let v = 0; v < this.h; v++) {
      dot += this.field[this.idx(this.w - 1, v)]! * this.field[this.idx(0, this.h - 1 - v)]!;
    }
    return Math.tanh(dot / this.h);
  }
  private seamFlux(): number {
    let f = 0;
    for (let v = 0; v < this.h; v++) f += Math.abs(this.field[this.idx(this.w - 1, v)]!);
    return f / this.h;
  }

  view(): KleinView {
    return {
      energy: round4(this.energy()),
      seamFlux: round4(this.seamFlux()),
      headTailCorr: round4(this.headTailCorr()),
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ORGAN 5 — PendulumHive (Gravity Clock): coupled kicked rotors (Chirikov standard map), +Lyapunov
// ════════════════════════════════════════════════════════════════════════════════════════════════

export interface HiveView {
  order: number;
  meanMomentum: number;
  lyapunov: number;
  chaotic: boolean;
  motor: number;
}

class PendulumHive {
  private readonly k: number;
  private readonly theta: Float64Array;
  private readonly mom: Float64Array;
  private readonly K: number; // kick strength (Chirikov); K≳1 ⇒ chaos
  private readonly coupling: number;

  constructor(k = 24, kick = 2.7, coupling = 0.15, rng: Rng = mulberry32(2)) {
    this.k = k;
    this.K = kick;
    this.coupling = coupling;
    this.theta = new Float64Array(k);
    this.mom = new Float64Array(k);
    for (let i = 0; i < k; i++) {
      this.theta[i] = rng() * TAU;
      this.mom[i] = (rng() - 0.5) * 0.6;
    }
  }

  /** One kicked-rotor step (toral standard map) per node + nearest-neighbour phase coupling. */
  step(drive: number): number {
    for (let i = 0; i < this.k; i++) {
      const left = this.theta[(i - 1 + this.k) % this.k]!;
      const right = this.theta[(i + 1) % this.k]!;
      const coup =
        this.coupling * (Math.sin(left - this.theta[i]!) + Math.sin(right - this.theta[i]!));
      let p = this.mom[i]! + this.K * Math.sin(this.theta[i]!) + coup + drive * 0.05;
      p = ((p % TAU) + TAU) % TAU;
      if (p > Math.PI) p -= TAU;
      let th = this.theta[i]! + p;
      th = ((th % TAU) + TAU) % TAU;
      this.mom[i] = p;
      this.theta[i] = th;
    }
    return Math.sin(this.theta[0]!);
  }

  /** Kuramoto order parameter R∈[0,1] — phase coherence of the hive. */
  private order(): number {
    let cr = 0;
    let ci = 0;
    for (let i = 0; i < this.k; i++) {
      cr += Math.cos(this.theta[i]!);
      ci += Math.sin(this.theta[i]!);
    }
    return Math.hypot(cr, ci) / this.k;
  }

  /**
   * Largest Lyapunov exponent of the single-node standard map via the TANGENT MAP (Benettin). The
   * Jacobian of (p'=p+K sinθ, θ'=θ+p') is [[1, K cosθ],[1, 1+K cosθ]] (det 1, area-preserving). For
   * K≳1 this is positive (chaos). Pure of the coupling — a clean per-node measure. O(steps).
   */
  lyapunov(steps = 1200): number {
    let th = 0.2;
    let p = 0.1;
    let wx = 1;
    let wy = 0;
    let sum = 0;
    const transient = 100;
    for (let s = 0; s < transient + steps; s++) {
      const c = this.K * Math.cos(th);
      // tangent: w ← J·w, J = [[1, c],[1, 1+c]]
      const nx = wx + c * wy;
      const ny = wx + (1 + c) * wy;
      // advance the base orbit (toral standard map)
      p = p + this.K * Math.sin(th);
      th = th + p;
      th = ((th % TAU) + TAU) % TAU;
      p = ((p % TAU) + TAU) % TAU;
      const norm = Math.hypot(nx, ny) || 1e-12;
      if (s >= transient) sum += Math.log(norm);
      wx = nx / norm;
      wy = ny / norm;
    }
    return sum / steps;
  }

  view(): HiveView {
    const lam = round4(this.lyapunov(800));
    let mp = 0;
    for (let i = 0; i < this.k; i++) mp += this.mom[i]!;
    return {
      order: round4(this.order()),
      meanMomentum: round4(mp / this.k),
      lyapunov: lam,
      chaotic: lam > 0,
      motor: round4(Math.sin(this.theta[0]!)),
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ORGAN 6 — SlimeMoldHydra (Brain-Shedder): split into k heads, compute, fuse (node-conserving)
// ════════════════════════════════════════════════════════════════════════════════════════════════

export interface HydraView {
  heads: number;
  conflict: number;
  coherence: number;
  nodes: number;
}

class SlimeMoldHydra {
  private readonly n: number;
  private readonly state: Float64Array;
  private heads = 1;
  private conflict = 0;

  constructor(n = 60) {
    this.n = n;
    this.state = new Float64Array(n);
    for (let i = 0; i < n; i++) this.state[i] = Math.sin(i * 0.7);
  }

  nodeCount(): number {
    return this.n;
  }

  /**
   * Split into `k` contiguous heads, each runs an independent local relaxation, then FUSE. Node count
   * is conserved (the partition is exact). Fusion injects a perturbation ∝ inter-head disagreement
   * (the "conflicting-memory cascade"). Deterministic.
   */
  step(k: number, drive: number, rng: Rng): number {
    const kk = Math.max(1, Math.min(this.n, Math.floor(k)));
    this.heads = kk;
    const size = Math.floor(this.n / kk);
    const means: number[] = [];
    for (let head = 0; head < kk; head++) {
      const lo = head * size;
      const hi = head === kk - 1 ? this.n : lo + size;
      let mean = 0;
      for (let i = lo; i < hi; i++) {
        this.state[i] = Math.tanh(0.8 * this.state[i]! + 0.1 * drive + 0.05 * (rng() - 0.5));
        mean += this.state[i]!;
      }
      means.push(hi > lo ? mean / (hi - lo) : 0);
    }
    // Conflict = variance of head means; fuse = nudge every node toward the global mean + conflict noise.
    const gMean = means.reduce((s, m) => s + m, 0) / kk;
    let varSum = 0;
    for (const m of means) varSum += (m - gMean) * (m - gMean);
    this.conflict = clamp01(Math.sqrt(varSum / kk));
    for (let i = 0; i < this.n; i++) {
      this.state[i] = clampFinite(
        this.state[i]! + 0.2 * (gMean - this.state[i]!) + this.conflict * 0.1 * Math.sin(i),
        -1,
        1,
      );
    }
    return this.conflict;
  }

  private coherence(): number {
    let mean = 0;
    for (let i = 0; i < this.n; i++) mean += this.state[i]!;
    mean /= this.n;
    let v = 0;
    for (let i = 0; i < this.n; i++) v += (this.state[i]! - mean) * (this.state[i]! - mean);
    return clamp01(1 - Math.sqrt(v / this.n));
  }

  view(): HydraView {
    return {
      heads: this.heads,
      conflict: round4(this.conflict),
      coherence: round4(this.coherence()),
      nodes: this.n,
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ORGAN 7 — ChronoWraith (Time-Echoer): concentric rings with delay-line buffers
// ════════════════════════════════════════════════════════════════════════════════════════════════

export interface WraithView {
  outer: number;
  mid: number;
  core: number;
  dissonance: number;
}

class ChronoWraith {
  private readonly buf: Float64Array;
  private readonly len: number;
  private head = 0;
  private readonly d1: number;
  private readonly d2: number;
  private outer = 0;
  private mid = 0;
  private core = 0;

  constructor(d1 = 5, d2 = 30) {
    this.d1 = d1;
    this.d2 = d2;
    this.len = d2 + 1;
    this.buf = new Float64Array(this.len);
  }

  delayCore(): number {
    return this.d2;
  }

  /** Push the present input; the rings read it at delays 0 / d1 / d2. Returns ring dissonance. */
  step(x: number): number {
    this.buf[this.head] = x;
    this.outer = x;
    this.mid = this.buf[(this.head - this.d1 + this.len) % this.len]!;
    this.core = this.buf[(this.head - this.d2 + this.len) % this.len]!;
    this.head = (this.head + 1) % this.len;
    return Math.abs(this.outer - this.core) + Math.abs(this.outer - this.mid);
  }
  /** The core's current value — equals the input from `d2` ticks ago (delay-correctness invariant). */
  coreValue(): number {
    return this.core;
  }

  view(): WraithView {
    return {
      outer: round4(this.outer),
      mid: round4(this.mid),
      core: round4(this.core),
      dissonance: round4(Math.abs(this.outer - this.core) + Math.abs(this.outer - this.mid)),
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ORGAN 8 — QuantumTunnelLattice (Teleporting Static): Born-rule manifested edges
// ════════════════════════════════════════════════════════════════════════════════════════════════

export interface TunnelView {
  manifested: number;
  entropy: number;
  displacement: number;
}

class QuantumTunnelLattice {
  private readonly n: number;
  private readonly amp: Float64Array; // amplitude field ψ[i*n+j]
  private manifest: Int32Array; // per node: the manifested target this tick (−1 none)
  private phase = 0;

  constructor(n = 48, rng: Rng = mulberry32(3)) {
    this.n = n;
    this.amp = new Float64Array(n * n);
    this.manifest = new Int32Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) this.amp[i * n + j] = rng();
    }
  }

  /** Born probabilities p(i→·): |ψ_ij|² normalised over j. Each row sums to 1 (the test asserts it). */
  rowProbabilities(i: number): number[] {
    let z = 0;
    const row: number[] = [];
    for (let j = 0; j < this.n; j++) {
      const a = this.amp[i * this.n + j]!;
      const p = a * a;
      row.push(p);
      z += p;
    }
    if (z <= 0) return row.map(() => 1 / this.n);
    return row.map((p) => p / z);
  }

  /** Evolve the amplitude field (deterministic phase rotation) and sample one manifested edge per node. */
  step(drive: number, rng: Rng): number {
    this.phase += 0.07 + 0.01 * drive;
    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.n; j++) {
        const k = i * this.n + j;
        this.amp[k] = 0.5 + 0.5 * Math.sin(this.amp[k]! * 3.1 + this.phase + i * 0.13 + j * 0.07);
      }
    }
    let manifested = 0;
    for (let i = 0; i < this.n; i++) {
      const probs = this.rowProbabilities(i);
      const r = rng();
      let cum = 0;
      let pick = -1;
      for (let j = 0; j < this.n; j++) {
        cum += probs[j]!;
        if (r <= cum) {
          pick = j;
          break;
        }
      }
      this.manifest[i] = pick;
      if (pick >= 0 && pick !== i) manifested++;
    }
    return manifested / this.n;
  }

  private entropy(): number {
    // Shannon entropy of node 0's distribution (normalised to [0,1] by log n).
    const p = this.rowProbabilities(0);
    let h = 0;
    for (const pi of p) if (pi > 0) h -= pi * Math.log(pi);
    return h / Math.log(this.n);
  }
  private displacement(): number {
    let d = 0;
    for (let i = 0; i < this.n; i++) {
      const t = this.manifest[i]!;
      if (t >= 0) d += Math.abs(t - i);
    }
    return d / (this.n * this.n);
  }

  view(): TunnelView {
    let m = 0;
    for (let i = 0; i < this.n; i++) if (this.manifest[i]! >= 0 && this.manifest[i]! !== i) m++;
    return {
      manifested: m,
      entropy: round4(this.entropy()),
      displacement: round4(this.displacement()),
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ORGAN 9 — ThermodynamicEngine (Heat Boiler): heat deposit + diffusion + venting + necrosis
// ════════════════════════════════════════════════════════════════════════════════════════════════

export interface ThermoView {
  totalHeat: number;
  hottest: number;
  necrotic: number;
  paralysis: number;
}

class ThermodynamicEngine {
  private readonly n: number;
  private heat: Float64Array;
  private readonly nextHeat: Float64Array; // pre-allocated scratch for step()
  private dead: Uint8Array;
  private readonly D = 0.2; // diffusion coeff (≤0.5 for explicit 1-D stability)
  private readonly tMelt = 6;
  private readonly vent = 0.08;
  private necrotic = 0;

  constructor(n = 64) {
    this.n = n;
    this.heat = new Float64Array(n);
    this.nextHeat = new Float64Array(n);
    this.dead = new Uint8Array(n);
  }

  totalHeat(): number {
    let t = 0;
    for (let i = 0; i < this.n; i++) t += this.heat[i]!;
    return t;
  }
  necroticCount(): number {
    return this.necrotic;
  }

  /**
   * `firing` (0..1 per sector) deposits heat; heat then DIFFUSES (1-D explicit) and the fin sectors
   * VENT; any sector over `tMelt` NECROTISES (permanent). With `firing` all-zero, total heat is
   * non-increasing (diffusion conserves, venting removes) — the test asserts this. Heat ≥ 0 always.
   */
  step(firing: (i: number) => number): number {
    for (let i = 0; i < this.n; i++) {
      if (this.dead[i]) continue;
      this.heat[i]! += 0.9 * clamp01(firing(i));
    }
    const next = this.nextHeat;
    for (let i = 0; i < this.n; i++) {
      const lap =
        this.heat[(i + 1) % this.n]! - 2 * this.heat[i]! + this.heat[(i - 1 + this.n) % this.n]!;
      let h = this.heat[i]! + this.D * lap;
      if (i % 8 === 0) h *= 1 - this.vent; // fins every 8th sector
      if (h < 0) h = 0;
      next[i] = h;
    }
    // Copy back (no per-step allocation — swap content into the persistent heat array)
    this.heat.set(next);
    for (let i = 0; i < this.n; i++) {
      if (!this.dead[i] && this.heat[i]! > this.tMelt) {
        this.dead[i] = 1;
        this.heat[i] = 0;
        this.necrotic++;
      }
    }
    return this.totalHeat();
  }

  view(): ThermoView {
    let hottest = 0;
    for (let i = 0; i < this.n; i++) hottest = Math.max(hottest, this.heat[i]!);
    return {
      totalHeat: round4(this.totalHeat()),
      hottest: round4(hottest),
      necrotic: this.necrotic,
      paralysis: round4(this.necrotic / this.n),
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ORGAN 10 — CancerousOuroboros (Self-Devourer): antagonistic A (grow) vs B (immune cull)
// ════════════════════════════════════════════════════════════════════════════════════════════════

export interface OuroborosView {
  limbs: number;
  cap: number;
  births: number;
  deaths: number;
  weirdness: number;
}

class CancerousOuroboros {
  private readonly cap: number;
  private readonly weird: number[] = []; // each living limb's "mutation score" (deviation)
  private births = 0;
  private deaths = 0;

  constructor(cap = 48) {
    this.cap = cap;
  }

  limbCount(): number {
    return this.weird.length;
  }
  capacity(): number {
    return this.cap;
  }

  /**
   * Network A grows ≤`growth` new limbs (mutated weirdness); network B (immune) culls every limb
   * whose weirdness exceeds an adaptive threshold (the cull is bounded by the population). Population
   * is hard-capped → bounded; A grows then B culls, so no node is both grown and culled the same tick.
   */
  step(growth: number, immunePressure: number, rng: Rng): number {
    this.births = 0;
    this.deaths = 0;
    const g = Math.max(0, Math.floor(growth));
    for (let i = 0; i < g && this.weird.length < this.cap; i++) {
      this.weird.push(clamp01(0.3 + 0.7 * rng()));
      this.births++;
    }
    // B: adaptive immune threshold falls as pressure rises → more aggressive culling.
    const thr = clamp01(1 - 0.6 * clamp01(immunePressure));
    for (let i = this.weird.length - 1; i >= 0; i--) {
      if ((this.weird[i] ?? 0) > thr) {
        this.weird.splice(i, 1);
        this.deaths++;
      }
    }
    return this.weird.length / this.cap;
  }

  private meanWeird(): number {
    if (this.weird.length === 0) return 0;
    let s = 0;
    for (const w of this.weird) s += w;
    return s / this.weird.length;
  }

  view(): OuroborosView {
    return {
      limbs: this.weird.length,
      cap: this.cap,
      births: this.births,
      deaths: this.deaths,
      weirdness: round4(this.meanWeird()),
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// META-PARADOX LAYER (bounded homages — see the honesty contract above)
// ════════════════════════════════════════════════════════════════════════════════════════════════

/** Cantor-set node addresses: the integers in [0, 3^L) whose base-3 digits are all in {0,2}. */
export function cantorDustAddresses(levels: number): number[] {
  const out: number[] = [];
  const total = 3 ** levels;
  for (let n = 0; n < total; n++) {
    let x = n;
    let ok = true;
    for (let d = 0; d < levels; d++) {
      if (x % 3 === 1) {
        ok = false;
        break;
      }
      x = Math.floor(x / 3);
    }
    if (ok) out.push(n);
  }
  return out;
}

export interface MetaView {
  distanceToTarget: number;
  godelResidual: number;
  phantom: number;
  superposed: boolean;
  superEntropy: number;
  decoheredPlan: number;
  budgetLoad: number;
  cantorPoints: number;
}

const APEX_PLANS = ['ASCEND', 'CONSUME', 'FRACTURE', 'DREAM', 'HUNT', 'TRANSCEND'] as const;
export type ApexPlan = (typeof APEX_PLANS)[number];
export const APEX_PLAN_NAMES: readonly ApexPlan[] = APEX_PLANS;

class MetaParadoxLayer {
  private readonly dim: number;
  private z: Float64Array; // the present plan-state
  private readonly zT: Float64Array; // the fixed terminal "future corpse" (boundary value)
  private readonly alpha = 0.04; // retrocausal relaxation rate
  private predicted: Float64Array;
  private residual = 0;
  private phantom = 0;
  private readonly psi: Float64Array; // superposition amplitudes over the plans
  private superposed = true;
  private decohered = -1;
  private readonly budget: number;
  private budgetLoad = 0;
  private readonly cantor: number[];

  constructor(seed: number, dim = APEX_PLANS.length) {
    this.dim = dim;
    const r = sub(seed, 0x5e7a11ad);
    this.z = new Float64Array(dim);
    this.zT = new Float64Array(dim);
    this.predicted = new Float64Array(dim);
    this.psi = new Float64Array(dim);
    for (let i = 0; i < dim; i++) {
      this.z[i] = r() - 0.5;
      this.zT[i] = r() - 0.5; // the fixed terminal state, set ONCE at birth
      this.psi[i] = r();
    }
    this.normalizePsi();
    this.budget = Math.max(1, dim - 1); // cap the superposition breadth (reverse-anthropic)
    this.cantor = cantorDustAddresses(5); // 2^5 = 32 dust points
  }

  private normalizePsi(): void {
    let z = 0;
    for (let i = 0; i < this.dim; i++) z += this.psi[i]! * this.psi[i]!;
    z = Math.sqrt(z) || 1;
    for (let i = 0; i < this.dim; i++) this.psi[i]! /= z;
  }
  /** Born probabilities |ψ|² (sum to 1 — tested). */
  planProbabilities(): number[] {
    return Array.from(this.psi, (a) => a * a);
  }
  distanceToTarget(): number {
    let d = 0;
    for (let i = 0; i < this.dim; i++) d += (this.z[i]! - this.zT[i]!) ** 2;
    return Math.sqrt(d);
  }

  /**
   * One meta beat. `signal` (per-plan drive from the organs) nudges ψ; the plan-state z RELAXES toward
   * the fixed terminal zT (retrocausal target-pull = boundary-value, NOT time travel); the Gödel
   * RESIDUAL is the gap between last beat's self-prediction and the new z; phantom perception reads
   * z's near-zero slots; ψ DECOHERES to a definite plan only when its peak probability passes a
   * threshold; the self-budget flattens z's smallest entry if the load exceeds budget.
   */
  step(signal: number[]): void {
    // Retrocausal relaxation toward the fixed future state (|z−zT| is non-increasing — tested).
    for (let i = 0; i < this.dim; i++) this.z[i]! += this.alpha * (this.zT[i]! - this.z[i]!);

    // Gödel self-reference residual: gap between the prior prediction and the realised z.
    let res = 0;
    for (let i = 0; i < this.dim; i++) res += Math.abs(this.z[i]! - this.predicted[i]!);
    this.residual = res / this.dim;
    // New self-prediction (a one-step linear self-model) — used next beat.
    for (let i = 0; i < this.dim; i++)
      this.predicted[i] = this.z[i]! + this.alpha * (this.zT[i]! - this.z[i]!);

    // Phantom perception: structured read of z's near-zero ("vacuum") slots.
    let zeros = 0;
    let ph = 0;
    for (let i = 0; i < this.dim; i++) {
      if (Math.abs(this.z[i]!) < 0.05) {
        zeros++;
        ph += Math.sin(i * 1.7 + this.residual);
      }
    }
    this.phantom = zeros > 0 ? Math.abs(ph) / zeros : 0;

    // Superposition update from the organ signal, then renormalise (Born bookkeeping).
    for (let i = 0; i < this.dim; i++) {
      this.psi[i]! = Math.abs(
        0.85 * this.psi[i]! + 0.15 * clamp01(signal[i] ?? 0) + 0.02 * this.residual,
      );
    }
    this.normalizePsi();
    const probs = this.planProbabilities();
    let maxP = 0;
    let arg = 0;
    for (let i = 0; i < this.dim; i++) {
      if (probs[i]! > maxP) {
        maxP = probs[i]!;
        arg = i;
      }
    }
    // Wigner shield: stay "smeared" until a measurement threshold is crossed, then decohere to argmax.
    if (maxP > 0.45) {
      this.superposed = false;
      this.decohered = arg;
    } else {
      this.superposed = true;
      this.decohered = -1;
    }

    // Reverse-anthropic self-budget: cap the BREADTH of its OWN superposition. If more than `budget`
    // plans carry non-trivial amplitude, prune (zero) the weakest and renormalise — it consumes its
    // own low-priority possibilities, never anything outside. The retrocausal plan-state z is left
    // untouched, so |z − zT| stays a clean monotone contraction.
    const floorP = 1 / (4 * this.dim);
    let active = 0;
    for (let i = 0; i < this.dim; i++) if (this.psi[i]! * this.psi[i]! > floorP) active++;
    this.budgetLoad = active;
    if (active > this.budget) {
      let minI = -1;
      let minV = Infinity;
      for (let i = 0; i < this.dim; i++) {
        const a = this.psi[i]!;
        if (a > 0 && a < minV) {
          minV = a;
          minI = i;
        }
      }
      if (minI >= 0) this.psi[minI] = 0;
      this.normalizePsi();
    }
  }

  superEntropy(): number {
    const p = this.planProbabilities();
    let h = 0;
    for (const pi of p) if (pi > 0) h -= pi * Math.log(pi);
    return h / Math.log(this.dim);
  }
  /** The committed plan once decohered, else the current argmax (telemetry only, while still smeared). */
  plan(): ApexPlan {
    if (this.decohered >= 0) return APEX_PLANS[this.decohered] ?? 'DREAM';
    const p = this.planProbabilities();
    let arg = 0;
    let mx = -1;
    for (let i = 0; i < this.dim; i++) {
      if (p[i]! > mx) {
        mx = p[i]!;
        arg = i;
      }
    }
    return APEX_PLANS[arg] ?? 'DREAM';
  }
  residualValue(): number {
    return this.residual;
  }
  isSuperposed(): boolean {
    return this.superposed;
  }

  view(): MetaView {
    return {
      distanceToTarget: round4(this.distanceToTarget()),
      godelResidual: round4(this.residual),
      phantom: round4(this.phantom),
      superposed: this.superposed,
      superEntropy: round4(this.superEntropy()),
      decoheredPlan: this.decohered,
      budgetLoad: round4(this.budgetLoad),
      cantorPoints: this.cantor.length,
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ORGAN 11 — QuantumBrainOrgan (the non-negotiable QUANTUM BRAIN): exact statevector + Tsotchke corpus
// ════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * A genuine exact statevector quantum register (the apex's "quantum geometry deliberation" organ,
 * doctrine organ #6 / master-report Layer 2). Unitary gates (Hadamard / RZ phase / CNOT) evolve a
 * dense 2^nQ amplitude vector, so ⟨ψ|ψ⟩ = 1 holds exactly (the tested invariant). Telemetry is real
 * quantum information: l1-coherence, single-qubit entanglement (linear entropy of the reduced ρ),
 * Born entropy, and — wired to the **real Tsotchke corpus** via {@link corpusPulse} / {@link
 * getTsotchkeBias} — QGT volume + non-stabilizerness ("magic"). The gate angles are driven by the
 * percept AND the Tsotchke pulse, so the quantum layer changes action (it folds a plan-bias into the
 * meta layer) — it is load-bearing, not decoration. This is exact classical *simulation* of quantum
 * dynamics (no QPU, no speedup claim — the honest frame from the corpus).
 */
export interface QuantumView {
  qubits: number;
  norm: number; // ⟨ψ|ψ⟩, must be ≈1
  coherence: number; // l1-coherence (0..1)
  entanglement: number; // 1-qubit linear entropy (0..1)
  bornEntropy: number; // Shannon entropy of |amp|² (0..1)
  qgtVolume: number; // Tsotchke QGT volume (real corpus)
  magic: number; // Tsotchke non-stabilizerness proxy (real corpus)
  collapsed: boolean;
  plan: number; // collapsed plan index, or −1 while superposed
}

class QuantumBrainOrgan {
  private readonly nQ: number;
  private readonly dim: number;
  private re: Float64Array;
  private im: Float64Array;
  private readonly formIdx: number;
  private qgtVolume = 0;
  private magic = 0;
  private collapsed = false;
  private collapseIdx = -1;

  constructor(nQ = 6, seed = 1) {
    this.nQ = nQ;
    this.dim = 1 << nQ;
    this.re = new Float64Array(this.dim);
    this.im = new Float64Array(this.dim);
    this.re[0] = 1; // |00…0⟩
    this.formIdx = (seed >>> 3) % 25; // which Tsotchke repo/archetype drives this register
    for (let q = 0; q < nQ; q++) this.hadamard(q); // boot into uniform superposition
  }

  qubitCount(): number {
    return this.nQ;
  }

  /** ⟨ψ|ψ⟩ — exactly 1 under unitary evolution (the tested invariant). */
  norm(): number {
    let s = 0;
    for (let i = 0; i < this.dim; i++) s += this.re[i]! * this.re[i]! + this.im[i]! * this.im[i]!;
    return s;
  }

  /** Born probabilities |amp_i|² (sum to 1). */
  bornProbabilities(): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.dim; i++)
      out.push(this.re[i]! * this.re[i]! + this.im[i]! * this.im[i]!);
    return out;
  }

  private hadamard(q: number): void {
    const bit = 1 << q;
    const inv = Math.SQRT1_2;
    for (let i = 0; i < this.dim; i++) {
      if ((i & bit) === 0) {
        const j = i | bit;
        const ar = this.re[i]!;
        const ai = this.im[i]!;
        const br = this.re[j]!;
        const bi = this.im[j]!;
        this.re[i] = (ar + br) * inv;
        this.im[i] = (ai + bi) * inv;
        this.re[j] = (ar - br) * inv;
        this.im[j] = (ai - bi) * inv;
      }
    }
  }

  /** RZ(θ): phase e^{∓iθ/2} on |0⟩/|1⟩ of qubit q. Phase-only → norm preserved. */
  private rz(q: number, theta: number): void {
    const bit = 1 << q;
    const c0 = Math.cos(-theta / 2);
    const s0 = Math.sin(-theta / 2);
    const c1 = Math.cos(theta / 2);
    const s1 = Math.sin(theta / 2);
    for (let i = 0; i < this.dim; i++) {
      const c = (i & bit) === 0 ? c0 : c1;
      const s = (i & bit) === 0 ? s0 : s1;
      const r = this.re[i]!;
      const m = this.im[i]!;
      this.re[i] = r * c - m * s;
      this.im[i] = r * s + m * c;
    }
  }

  /** CNOT(control,target): a basis permutation (toggles target where control=1) → unitary. */
  private cnot(control: number, target: number): void {
    const cb = 1 << control;
    const tb = 1 << target;
    for (let i = 0; i < this.dim; i++) {
      if ((i & cb) !== 0 && (i & tb) === 0) {
        const j = i | tb;
        const r = this.re[i]!;
        const m = this.im[i]!;
        this.re[i] = this.re[j]!;
        this.im[i] = this.im[j]!;
        this.re[j] = r;
        this.im[j] = m;
      }
    }
  }

  /**
   * One quantum beat: a unitary layer (RZ phases from the percept + Tsotchke pulse, a CNOT
   * entangling ring, then a Hadamard interference layer) evolves the register. Pulls real QGT
   * volume + magic from the Tsotchke corpus. Stays superposed (Wigner shield) unless `measure`
   * forces a collapse. Deterministic.
   */
  step(drive: number, seed: number): void {
    const pulse = corpusPulse(seed, this.formIdx);
    const bias = getTsotchkeBias(this.formIdx);
    this.qgtVolume = pulse.qgtVolume;
    this.magic = pulse.cliffordEnt;
    this.collapsed = false;
    this.collapseIdx = -1;
    for (let q = 0; q < this.nQ; q++) {
      const ang =
        (drive + pulse.qgtVolume + bias.cliffordWeight * 0.5) * (q + 1) * 0.7 + pulse.adGradient;
      this.rz(q, ang);
    }
    for (let q = 0; q < this.nQ; q++) this.cnot(q, (q + 1) % this.nQ); // entangling ring
    this.hadamard(this.nQ - 1); // turn accumulated phase into amplitude interference
    this.hadamard(0);
  }

  /** Collapse the register by Born sampling (Wigner measurement); sets a definite basis state. */
  measure(rng: Rng): number {
    const probs = this.bornProbabilities();
    const r = rng();
    let cum = 0;
    let idx = this.dim - 1;
    for (let i = 0; i < this.dim; i++) {
      cum += probs[i]!;
      if (r <= cum) {
        idx = i;
        break;
      }
    }
    this.re.fill(0);
    this.im.fill(0);
    this.re[idx] = 1;
    this.collapsed = true;
    this.collapseIdx = idx;
    return idx;
  }

  /** Born probabilities folded onto `nPlans` groups — the quantum plan-bias the meta layer consumes. */
  planBias(nPlans: number): number[] {
    const out = Array.from({ length: nPlans }, () => 0);
    const probs = this.bornProbabilities();
    for (let i = 0; i < this.dim; i++) out[i % nPlans]! += probs[i]!;
    return out;
  }

  /** l1-coherence of the pure state in the computational basis: (Σ|cᵢ|)² − 1, normalised by dim−1. */
  private coherence(): number {
    let s = 0;
    for (let i = 0; i < this.dim; i++) s += Math.hypot(this.re[i]!, this.im[i]!);
    const c = s * s - 1;
    return clamp01(c / (this.dim - 1));
  }

  view(): QuantumView {
    // single-qubit (q0) entanglement = linear entropy 2(1−tr ρ²) of the reduced density matrix.
    // reduced density matrix of qubit 0
    let r00 = 0;
    let r11 = 0;
    let oRe = 0;
    let oIm = 0;
    for (let i = 0; i < this.dim; i++) {
      const p = this.re[i]! * this.re[i]! + this.im[i]! * this.im[i]!;
      if ((i & 1) === 0) {
        r00 += p;
        const j = i | 1;
        // ρ01 += amp_i * conj(amp_j)
        oRe += this.re[i]! * this.re[j]! + this.im[i]! * this.im[j]!;
        oIm += this.im[i]! * this.re[j]! - this.re[i]! * this.im[j]!;
      } else {
        r11 += p;
      }
    }
    const purity = r00 * r00 + r11 * r11 + 2 * (oRe * oRe + oIm * oIm);
    const entanglement = clamp01(2 * (1 - purity));
    const probs = this.bornProbabilities();
    let h = 0;
    for (const pi of probs) if (pi > 0) h -= pi * Math.log(pi);
    return {
      qubits: this.nQ,
      norm: round4(this.norm()),
      coherence: round4(this.coherence()),
      entanglement: round4(entanglement),
      bornEntropy: round4(h / Math.log(this.dim)),
      qgtVolume: round4(this.qgtVolume),
      magic: round4(this.magic),
      collapsed: this.collapsed,
      plan: this.collapseIdx,
    };
  }
}

/** Organ classes exported so `tests/apex-brain.test.ts` can assert each organ's math directly. */
export {
  PrimeSieveLoom,
  AcousticMeatDrum,
  EntropicNecroMatrix,
  KleinBottleCortex,
  PendulumHive,
  SlimeMoldHydra,
  ChronoWraith,
  QuantumTunnelLattice,
  ThermodynamicEngine,
  CancerousOuroboros,
  MetaParadoxLayer,
  QuantumBrainOrgan,
};

// ════════════════════════════════════════════════════════════════════════════════════════════════
// THE COMPOSITE — ApexBrain (The Entropic Tesseract Hydra)
// ════════════════════════════════════════════════════════════════════════════════════════════════

/** Roadmap target neuron count for the apex (HONEST aspiration, not instantiated). */
export const APEX_BRAIN_TARGET_NEURONS = 1_000_000_000;

// ════════════════════════════════════════════════════════════════════════════════════════════════
// SCALING SCAFFOLDING — the architecture that scales from the live engine toward 1 BILLION neurons
// ════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Hard cap on the number of nodes ANY organ actually allocates in the JS/TS runtime. The DESIGNED
 * scale (per {@link ApexScale}) can declare millions per organ — that is the architecture target and
 * what a native C/C++/GPU backend (roadmap) would run — but the live deterministic engine only ever
 * allocates up to this cap, so a billion-neuron design still runs (capped) in the browser today. The
 * gap between designed and live is reported honestly (`designedNeurons` vs `liveNeurons`).
 */
export const LIVE_NODE_CAP = 4096;

/** Per-organ node budget. Drives both the designed-neuron accounting and the (capped) live allocation. */
export interface ApexScale {
  readonly name: string;
  readonly loom: number;
  readonly acoustic: number;
  readonly necro: number;
  readonly kleinW: number;
  readonly kleinH: number;
  readonly pendulum: number;
  readonly slime: number;
  readonly chronoD1: number;
  readonly chronoD2: number;
  readonly tunnel: number;
  readonly thermo: number;
  readonly ouroboros: number;
  readonly qubits: number;
}

/** The tractable live scale the engine boots at (every organ below the cap). */
export const SCALE_LIVE: ApexScale = {
  name: 'LIVE',
  loom: 96,
  acoustic: 128,
  necro: 64,
  kleinW: 16,
  kleinH: 12,
  pendulum: 24,
  slime: 60,
  chronoD1: 5,
  chronoD2: 30,
  tunnel: 48,
  thermo: 64,
  ouroboros: 48,
  qubits: 6,
};

/** A mid-tier scale (still browser-safe; organs at the cap). */
export const SCALE_MEDIUM: ApexScale = {
  name: 'MEDIUM',
  loom: 4096,
  acoustic: 2048,
  necro: 2048,
  kleinW: 64,
  kleinH: 64,
  pendulum: 1024,
  slime: 2048,
  chronoD1: 30,
  chronoD2: 180,
  tunnel: 2048,
  thermo: 2048,
  ouroboros: 2048,
  qubits: 10,
};

/**
 * The MASSIVE design scale — the brief's per-organ node targets. `apexDesignedNeurons(SCALE_MASSIVE)`
 * exceeds **one billion**, which is the apex's stated scaling target. The live engine still caps
 * actual allocation at {@link LIVE_NODE_CAP}; reaching the designed scale is the C/C++/GPU backend's
 * job (roadmap, see docs/APEX-BRAIN-ABOMINATION-2026-06-26.md). Numbers mirror the source brief: prime loom
 * 100M, acoustic ~100M, necro 50M, Klein-bottle centipede 30000², pendulum 10M, slime 30M, etc.
 */
export const SCALE_MASSIVE: ApexScale = {
  name: 'MASSIVE',
  loom: 100_000_000,
  acoustic: 100_000_000,
  necro: 50_000_000,
  kleinW: 30_000,
  kleinH: 30_000,
  pendulum: 10_000_000,
  slime: 30_000_000,
  chronoD1: 150,
  chronoD2: 900,
  tunnel: 120_000_000,
  thermo: 50_000_000,
  ouroboros: 50_000_000,
  qubits: 12,
};

/** The DESIGNED neuron count of a scale (the architecture target; ≥1e9 at {@link SCALE_MASSIVE}). */
export function apexDesignedNeurons(s: ApexScale): number {
  return (
    s.loom +
    s.acoustic +
    s.necro +
    s.kleinW * s.kleinH +
    s.pendulum +
    s.slime +
    (s.chronoD2 + 1) +
    s.tunnel +
    s.thermo +
    s.ouroboros +
    (1 << Math.min(30, s.qubits))
  );
}

/** Clamp a designed organ size down to what the live runtime will actually allocate. */
function liveSize(designed: number): number {
  return Math.max(1, Math.min(designed, LIVE_NODE_CAP));
}

/** What the apex perceives each beat (all 0..1 unless noted). */
export interface ApexPercept {
  threat: number;
  energy: number;
  chaos: number;
  novelty: number;
  /** Evolution level (0..∞) — drives the staged-simulation transcendence (Sim 3 past 1000). */
  level: number;
}

/** The unified read-out of one cognitive beat. */
export interface ApexThought {
  plan: ApexPlan;
  superposed: boolean;
  vitality: number; // 0..1 (necrosis + heat erosion)
  agony: number; // 0..1 (self-consumption pressure)
  transcendence: number; // 0..1 toward Simulation 3
  simulation: 1 | 2 | 3;
  motor: { x: number; y: number; z: number };
}

/** Full telemetry snapshot of all eleven organs + the meta layer. */
export interface ApexBrainSnapshot {
  beat: number;
  scaleName: string;
  targetNeurons: number;
  /** DESIGNED neurons at the current scale (the architecture target — ≥1e9 at MASSIVE). */
  designedNeurons: number;
  /** Neurons the live runtime actually allocates (capped at {@link LIVE_NODE_CAP}). */
  liveNeurons: number;
  /** Live state parameters actually held (floats across all organ buffers + the statevector). */
  parameterCount: number;
  thought: ApexThought;
  meta: MetaView;
  quantum: QuantumView;
  loom: LoomView;
  drum: DrumView;
  necro: NecroView;
  klein: KleinView;
  hive: HiveView;
  hydra: HydraView;
  wraith: WraithView;
  tunnel: TunnelView;
  thermo: ThermoView;
  ouroboros: OuroborosView;
}

export class ApexBrain {
  readonly seed: number;
  readonly targetNeurons = APEX_BRAIN_TARGET_NEURONS;
  readonly scale: ApexScale;
  /** DESIGNED neurons at this scale (architecture target; ≥1e9 at MASSIVE). */
  readonly designedNeurons: number;
  /** Neurons actually allocated in the live runtime (capped at {@link LIVE_NODE_CAP}). */
  readonly liveNeurons: number;
  private beat = 0;

  private readonly loom: PrimeSieveLoom;
  private readonly drum: AcousticMeatDrum;
  private readonly necro: EntropicNecroMatrix;
  private readonly klein: KleinBottleCortex;
  private readonly hive: PendulumHive;
  private readonly hydra: SlimeMoldHydra;
  private readonly wraith: ChronoWraith;
  private readonly tunnel: QuantumTunnelLattice;
  private readonly thermo: ThermodynamicEngine;
  private readonly ouroboros: CancerousOuroboros;
  private readonly quantum: QuantumBrainOrgan;
  private readonly meta: MetaParadoxLayer;

  // sub-streams reused per organ (deterministic draws each beat)
  private readonly rLoom: Rng;
  private readonly rHydra: Rng;
  private readonly rTunnel: Rng;
  private readonly rOuro: Rng;

  constructor(seed: number, opts?: { scale?: ApexScale }) {
    this.seed = seed >>> 0 || 1;
    const s = opts?.scale ?? SCALE_LIVE;
    this.scale = s;
    // Each organ allocates the CAPPED live size; the designed scale can be far larger (up to 1B).
    const loomN = liveSize(s.loom);
    const acousticN = liveSize(s.acoustic);
    const necroN = liveSize(s.necro);
    const kleinW = liveSize(Math.min(s.kleinW, 64));
    const kleinH = liveSize(Math.min(s.kleinH, 64));
    const pendulumN = liveSize(Math.min(s.pendulum, 64));
    const slimeN = liveSize(s.slime);
    const chronoD2 = liveSize(Math.min(s.chronoD2, 256));
    const chronoD1 = Math.max(1, Math.min(s.chronoD1, chronoD2 - 1));
    const tunnelN = liveSize(Math.min(s.tunnel, 96)); // O(n²) organ → tighter cap
    const thermoN = liveSize(s.thermo);
    const ouroN = liveSize(s.ouroboros);
    const qubits = Math.max(1, Math.min(s.qubits, 12)); // statevector = 2^q; cap at 4096 amplitudes

    this.loom = new PrimeSieveLoom(loomN);
    this.drum = new AcousticMeatDrum(acousticN);
    this.necro = new EntropicNecroMatrix(necroN, sub(this.seed, 0x03));
    this.klein = new KleinBottleCortex(kleinW, kleinH);
    this.hive = new PendulumHive(pendulumN, 2.7, 0.15, sub(this.seed, 0x05));
    this.hydra = new SlimeMoldHydra(slimeN);
    this.wraith = new ChronoWraith(chronoD1, chronoD2);
    this.tunnel = new QuantumTunnelLattice(tunnelN, sub(this.seed, 0x08));
    this.thermo = new ThermodynamicEngine(thermoN);
    this.ouroboros = new CancerousOuroboros(ouroN);
    this.quantum = new QuantumBrainOrgan(qubits, this.seed);
    this.meta = new MetaParadoxLayer(this.seed);
    this.rLoom = sub(this.seed, 0x1001);
    this.rHydra = sub(this.seed, 0x1006);
    this.rTunnel = sub(this.seed, 0x1008);
    this.rOuro = sub(this.seed, 0x100a);
    this.drum.excite(Math.min(3, acousticN - 1), 0.6); // a faint standing wave at boot

    this.designedNeurons = apexDesignedNeurons(s);
    this.liveNeurons =
      loomN +
      acousticN +
      necroN +
      kleinW * kleinH +
      pendulumN +
      slimeN +
      (chronoD2 + 1) +
      tunnelN +
      thermoN +
      ouroN +
      (1 << qubits) +
      APEX_PLANS.length;
  }

  /** DESIGNED neuron count at the current scale (the architecture target). */
  neuronCount(): number {
    return this.designedNeurons;
  }

  /**
   * Live state parameters actually held (floats across organ buffers + the 2·2^q statevector). This
   * is the honest "running parameter count" — far below {@link neuronCount} at large scales, because
   * the live runtime caps allocation and the full design awaits the native backend.
   */
  parameterCount(): number {
    const q = this.quantum.qubitCount();
    return this.liveNeurons + (1 << q) * 2; // statevector carries re+im per amplitude
  }

  /** One cognitive beat across all eleven organs + the meta layer. Deterministic. */
  tick(p: ApexPercept): ApexThought {
    this.beat++;
    this.lastLevel = p.level;
    const drive = clamp01(0.4 * p.threat + 0.3 * p.chaos + 0.3 * p.novelty);

    // 1 Loom — sieve the drive through twin-prime connectivity.
    const loomOut = this.loom.step(drive * 4, this.rLoom);
    // 2 Drum — the loom output screams into the acoustic chamber.
    const drumMotor = this.drum.step(loomOut * 0.5, (this.beat * 7) % 128);
    // 7 Wraith — the present drive enters the delay rings; the core answers from the past.
    const dissonance = this.wraith.step(drive);
    const corePast = this.wraith.coreValue();
    // 4 Klein — tail-inject the dissonance; read the head/tail fold coupling.
    const fold = this.klein.step(dissonance);
    // 5 Hive — chaotic kicked rotors driven by the fold.
    const hiveMotor = this.hive.step(fold);
    // 6 Hydra — split into heads sized by chaos, compute, fuse.
    const heads = 1 + Math.floor(clamp01(p.chaos) * 3);
    const conflict = this.hydra.step(heads, drive, this.rHydra);
    // 8 Tunnel — manifest probabilistic edges; teleport density.
    const tunnelDisp = this.tunnel.step(drive, this.rTunnel);
    // 9 Thermo — every organ's activity deposits heat; diffuse + vent + necrotise.
    const fireLevel = clamp01(loomOut + Math.abs(hiveMotor) + conflict + tunnelDisp) * 0.5;
    this.thermo.step((i) => ((i + this.beat) % 5 === 0 ? fireLevel : fireLevel * 0.2));
    // 3 Necro — think a thought along live edges; it burns out the path.
    const src = (this.beat * 13) % 64;
    const dst = (this.beat * 29 + 7) % 64;
    const necroVit = this.necro.step(src, dst);
    // 10 Ouroboros — grow limbs vs immune cull, pressure from heat + agony.
    const thermoView = this.thermo.view();
    const immune = clamp01(thermoView.paralysis + dissonance * 0.2);
    const limbFrac = this.ouroboros.step(1 + Math.floor(p.novelty * 3), immune, this.rOuro);
    // 11 QUANTUM BRAIN — evolve the exact statevector (Tsotchke-coupled) and read its plan-bias.
    this.quantum.step(drive, (this.seed ^ (this.beat * 0x9e3779b1)) >>> 0);
    const qBias = this.quantum.planBias(APEX_PLANS.length);

    // Aggregate per-plan signal for the meta layer (six plans); the quantum Born plan-bias is folded
    // in (≈30%), so the quantum register genuinely steers the committed plan — ablation-meaningful.
    const signal = [
      clamp01(p.level / 1000 + loomOut * 0.2), // ASCEND
      clamp01(limbFrac + drive * 0.2), // CONSUME
      clamp01(this.loom.view().allergy + immune), // FRACTURE
      clamp01(corePast * 0.5 + 0.5), // DREAM
      clamp01(p.threat + Math.abs(hiveMotor)), // HUNT
      clamp01(p.level / 1000), // TRANSCEND
    ].map((v, i) => clamp01(0.7 * v + 0.3 * (qBias[i] ?? 0) * APEX_PLANS.length));
    this.meta.step(signal);

    return this.assemble(p, { drumMotor, hiveMotor, fold, necroVit, limbFrac });
  }

  private assemble(
    p: ApexPercept,
    m: { drumMotor: number; hiveMotor: number; fold: number; necroVit: number; limbFrac: number },
  ): ApexThought {
    const thermo = this.thermo.view();
    const vitality = clamp01(m.necroVit * (1 - thermo.paralysis));
    const agony = clamp01(this.ouroboros.view().deaths / 8 + this.loom.view().allergy);
    const transcendence = clamp01(p.level / 1000);
    const simulation: 1 | 2 | 3 = transcendence >= 1 ? 3 : transcendence >= 0.5 ? 2 : 1;
    return {
      plan: this.meta.plan(),
      superposed: this.meta.isSuperposed(),
      vitality: round4(vitality),
      agony: round4(agony),
      transcendence: round4(transcendence),
      simulation,
      motor: {
        x: round4(m.hiveMotor),
        y: round4(m.drumMotor * 2 - 1),
        z: round4(m.fold),
      },
    };
  }

  snapshot(): ApexBrainSnapshot {
    const thought = this.assemble(
      { threat: 0, energy: 0, chaos: 0, novelty: 0, level: this.lastLevel },
      {
        drumMotor: this.drum.view().motor,
        hiveMotor: this.hive.view().motor,
        fold: this.klein.view().headTailCorr,
        necroVit: this.necro.view().vitality,
        limbFrac: this.ouroboros.view().limbs / this.ouroboros.capacity(),
      },
    );
    return {
      beat: this.beat,
      scaleName: this.scale.name,
      targetNeurons: this.targetNeurons,
      designedNeurons: this.designedNeurons,
      liveNeurons: this.liveNeurons,
      parameterCount: this.parameterCount(),
      thought,
      meta: this.meta.view(),
      quantum: this.quantum.view(),
      loom: this.loom.view(),
      drum: this.drum.view(),
      necro: this.necro.view(),
      klein: this.klein.view(),
      hive: this.hive.view(),
      hydra: this.hydra.view(),
      wraith: this.wraith.view(),
      tunnel: this.tunnel.view(),
      thermo: this.thermo.view(),
      ouroboros: this.ouroboros.view(),
    };
  }

  private lastLevel = 0;
}

/**
 * Construct the canonical apex brain, seeded from the final-sigma ς lineage glyph (index 100) so the
 * pantheon and the brain agree on the apex's identity. A clean one-way dependency
 * (apex-brain → pantheon-breeding); pantheon-breeding never imports this module.
 */
export function createApexBrain(seed: number = LINEAGE[100]!.seed): ApexBrain {
  return new ApexBrain(seed);
}

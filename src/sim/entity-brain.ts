/**
 * PER-ENTITY NEURAL CONTROLLER (V42) — the directive's "50–150 parameter neural network so it's alive
 * and can do shit" at chaos-biome scale. Every normal organism carries the genome's compact **70-param
 * brain** (a {@link TinyMLP} 6→6→4 from [genome.ts](./genome.ts)): each beat it PERCEIVES its own state
 * + the world (energy, age, speed, chaos, a stable personality bias, a phase clock), and STEERS itself
 * — a small, bounded velocity nudge layered on top of the morphotype's behavior field, so 50,000
 * entities each move with their own reactive, individual character instead of a single shared rule.
 *
 * EFFICIENT AT 50k: brains run round-robin — `SLICES` cohorts, one cohort per frame, so the per-frame
 * cost is `population / SLICES` tiny forward passes (≈6k×70 muls at the 50k ceiling). The genome pool is
 * one flat `Float32Array` (no per-entity objects); the forward pass is allocation-free.
 *
 * DETERMINISM-SAFE: the genomes are rolled ONCE from an INJECTED dedicated {@link Rng} sub-stream (never
 * the world's main rng), and the field is driven by {@link World} — NOT by the bare `EntityManager` the
 * golden determinism test exercises — so the pinned same-seed population trace stays byte-identical.
 * No `Math.random` / `Date.now`. Leaf module (depends only on `genome`, `Rng`, and the entity type).
 */
import type { Rng } from '../math/rng';
import type { Entity } from '../types';
import {
  randomGenome,
  BRAIN_IN,
  BRAIN_HIDDEN,
  BRAIN_OUT,
  GENOME_LEN,
  TRAIT,
  TRAIT_GENES,
} from './genome';

/** Cohort count — every entity thinks once per this many frames (bounds the 50k cost). */
const SLICES = 8;
/** Steering authority: the brain nudges velocity by at most ~this per think (a flavour, not a takeover). */
const STEER_GAIN = 0.045;

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

export class EntityBrainField {
  private readonly capacity: number;
  /** Flat genome pool: `capacity × GENOME_LEN` (trait region + brain weights), rolled once at boot. */
  private readonly genomes: Float32Array;
  // Allocation-free scratch reused every forward pass.
  private readonly senses = new Float32Array(BRAIN_IN);
  private readonly hidden = new Float32Array(BRAIN_HIDDEN);
  private readonly out = new Float32Array(BRAIN_OUT);
  private cursor = 0;

  /** Roll one deterministic genome per slot from the injected (dedicated) rng. O(capacity). */
  constructor(capacity: number, rng: Rng) {
    this.capacity = Math.max(0, capacity);
    this.genomes = new Float32Array(this.capacity * GENOME_LEN);
    for (let i = 0; i < this.capacity; i++) this.genomes.set(randomGenome(rng), i * GENOME_LEN);
  }

  /** A read-only view of slot `i`'s genome (for inspection / future inheritance). */
  genomeAt(i: number): Float32Array {
    return this.genomes.subarray(i * GENOME_LEN, (i + 1) * GENOME_LEN);
  }

  /**
   * V122 (USER #9): a BRUTAL morph mutation nudges every organism's BRAIN WEIGHTS by a tiny seeded
   * jitter (±amp, uniform) — a real, live neurological shift, not decoration: the 70-param policies
   * measurably drift so post-morph steering behaviour differs. Trait genes (the personality region)
   * are left untouched so identity survives the mutation; only cognition wobbles. Deterministic via
   * the injected rng (a user-gesture stream, like burst/mutate). O(capacity × brainGenes).
   */
  perturbBrains(rng: Rng, amp = 0.015): void {
    const g = this.genomes;
    for (let slot = 0; slot < this.capacity; slot++) {
      const base = slot * GENOME_LEN;
      for (let k = base + TRAIT_GENES; k < base + GENOME_LEN; k++) {
        g[k] = (g[k] ?? 0) + (rng() * 2 - 1) * amp;
      }
    }
  }

  /**
   * Drive one cohort of brains this frame: build each entity's senses, run its 70-param brain, and
   * apply the resulting bounded steering to its velocity. Returns how many entities thought. Pure
   * w.r.t. the world rng (touches only entity velocity); allocation-free. Launched NHIs are skipped
   * (they carry their own deep mind). `chaos` is the world disorder, `t` the sim clock (seconds).
   */
  think(list: ReadonlyArray<Entity | undefined>, chaos: number, t: number): number {
    const n = Math.min(list.length, this.capacity);
    if (n === 0) return 0;
    const start = this.cursor % SLICES;
    const s = this.senses;
    const chaosN = clamp01(chaos / 10);
    let thought = 0;
    for (let i = start; i < n; i += SLICES) {
      const e = list[i];
      if (!e) continue;
      const ud = e.userData;
      if (ud.isNhi) continue; // launched NHIs fly their own mind
      const base = i * GENOME_LEN;
      // ── PERCEPTION (6 senses, all bounded) ──
      s[0] = clamp01(ud.energy / 100); // health / wealth
      s[1] = clamp01(ud.age / (ud.life > 1 ? ud.life : 1)); // mortality (age toward death)
      const sp = Math.hypot(ud.vel.x, ud.vel.y, ud.vel.z);
      s[2] = clamp01(sp / 6); // own speed
      s[3] = chaosN; // world disorder
      s[4] = this.genomes[base + TRAIT.curiosity] ?? 0.5; // stable personality bias (diversity)
      s[5] = Math.sin(ud.ph + t * 0.6); // a phase clock (−1..1)
      // ── COGNITION (70-param brain, inline allocation-free forward) ──
      this.forward(base + TRAIT_GENES);
      const o = this.out;
      // ── ACTION: a small, bounded steer; out[3] is an excitation that scales the authority ──
      const gain = STEER_GAIN * (0.5 + 0.75 * ((o[3] ?? 0) + 1) * 0.5);
      ud.vel.x += (o[0] ?? 0) * gain;
      ud.vel.z += (o[1] ?? 0) * gain;
      ud.vel.y += (o[2] ?? 0) * gain * 0.5; // gentler vertical
      thought++;
    }
    this.cursor++;
    return thought;
  }

  /** Allocation-free MLP forward reading brain weights from the flat pool at `base` into `out`. */
  private forward(base: number): void {
    const g = this.genomes;
    const s = this.senses;
    const hid = this.hidden;
    const out = this.out;
    let w = base;
    for (let h = 0; h < BRAIN_HIDDEN; h++) {
      let acc = g[w++] ?? 0; // bias
      for (let i = 0; i < BRAIN_IN; i++) acc += (g[w++] ?? 0) * (s[i] ?? 0);
      hid[h] = Math.tanh(acc);
    }
    for (let o = 0; o < BRAIN_OUT; o++) {
      let acc = g[w++] ?? 0; // bias
      for (let h = 0; h < BRAIN_HIDDEN; h++) acc += (g[w++] ?? 0) * (hid[h] ?? 0);
      out[o] = Math.tanh(acc);
    }
  }
}

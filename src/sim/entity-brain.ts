/**
 * PER-ENTITY NEURAL CONTROLLER (V42) — the directive's "50–150 parameter neural network so it's alive
 * and can do shit" at chaos-biome scale. Every normal organism carries the genome's compact **70-param
 * brain** (a {@link TinyMLP} 6→6→4 from [genome.ts](./genome.ts)): each beat it PERCEIVES its own state
 * + the world (energy, age, speed, chaos, a stable personality bias, a phase clock), and STEERS itself
 * — a small, bounded velocity nudge layered on top of the morphotype's behavior field, so 50,000
 * entities each move with their own reactive, individual character instead of a single shared rule.
 *
 * EFFICIENT AT 50k: `World` uses full evaluation every frame to maintain visual quality. The genome
 * pool is one flat typed array; normal runtime tiers keep FP32 fidelity and use a direct FP32 hot path
 * for the allocation-free forward pass. Packed FP16/INT8 remain explicit opt-in formats for tools/tests.
 *
 * DETERMINISM-SAFE: the genomes are rolled ONCE from an INJECTED dedicated {@link Rng} sub-stream (never
 * the world's main rng), and the field is driven by {@link World} — NOT by the bare `EntityManager` the
 * golden determinism test exercises — so the pinned same-seed population trace stays byte-identical.
 * No `Math.random` / `Date.now`. Leaf module (depends only on `genome`, `Rng`, and the entity type).
 */
import type { Rng } from '../math/rng';
import type { Entity } from '../types';
import type { QuantizationConfig } from '../math/quantization';
import { fp16BitsToFp32, fp32ToFp16Bits, fp32ToInt8, int8ToFp32 } from '../math/quantization';
import {
  randomGenome,
  BRAIN_IN,
  BRAIN_HIDDEN,
  BRAIN_OUT,
  BRAIN_GENES,
  GENOME_LEN,
  TRAIT,
  TRAIT_GENES,
} from './genome';

/** Steering authority: the brain nudges velocity by at most ~this per think (a flavour, not a takeover). */
const STEER_GAIN = 0.045;
const DEFAULT_QUANTIZATION: QuantizationConfig = {
  useFp16: false,
  useInt8: false,
  int8MaxError: 0.01,
};

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
type GenomeStorage = Float32Array | Uint16Array | Uint8Array;
type GenomeStorageKind = 'fp32' | 'fp16' | 'int8';

export class EntityBrainField {
  private readonly capacity: number;
  /** Flat genome pool: `capacity × GENOME_LEN` (trait region + brain weights), rolled once at boot. */
  private readonly genomes: GenomeStorage;
  private readonly storageKind: GenomeStorageKind;
  /** Non-null in the normal full-fidelity runtime path; avoids a per-gene storage-kind branch. */
  private readonly fp32Genomes: Float32Array | null;
  // Allocation-free scratch reused every forward pass.
  private readonly senses = new Float32Array(BRAIN_IN);
  private readonly hidden = new Float32Array(BRAIN_HIDDEN);
  private readonly out = new Float32Array(BRAIN_OUT);

  /** Roll one deterministic genome per slot from the injected (dedicated) rng. O(capacity). */
  constructor(capacity: number, rng: Rng, quantization: QuantizationConfig = DEFAULT_QUANTIZATION) {
    this.capacity = Math.max(0, capacity);
    this.storageKind = quantization.useInt8 ? 'int8' : quantization.useFp16 ? 'fp16' : 'fp32';
    const totalGenes = this.capacity * GENOME_LEN;
    this.genomes =
      this.storageKind === 'fp32'
        ? new Float32Array(totalGenes)
        : this.storageKind === 'fp16'
          ? new Uint16Array(totalGenes)
          : new Uint8Array(totalGenes);
    this.fp32Genomes = this.storageKind === 'fp32' ? (this.genomes as Float32Array) : null;

    for (let i = 0; i < this.capacity; i++) {
      const g = randomGenome(rng);
      const base = i * GENOME_LEN;
      if (this.storageKind === 'fp32') {
        (this.genomes as Float32Array).set(g, base);
      } else {
        for (let k = 0; k < GENOME_LEN; k++) this.setGene(base + k, g[k] ?? 0);
      }
    }
  }

  /** Underlying genome storage bytes (used by perf receipts and memory budgets). */
  genomeStorageBytes(): number {
    return this.genomes.byteLength;
  }

  /** Storage representation selected for this field. */
  genomeStorageKind(): GenomeStorageKind {
    return this.storageKind;
  }

  /**
   * Return slot `i`'s genome. FP32 storage returns a live view; packed storage returns a dequantized
   * copy because subarray mutation cannot be reflected into packed integer buffers.
   */
  genomeAt(i: number): Float32Array {
    const base = i * GENOME_LEN;
    if (this.storageKind === 'fp32') {
      return (this.genomes as Float32Array).subarray(base, base + GENOME_LEN);
    }
    const out = new Float32Array(GENOME_LEN);
    for (let k = 0; k < GENOME_LEN; k++) out[k] = this.getGene(base + k);
    return out;
  }

  /**
   * V122 (USER #9): a BRUTAL morph mutation nudges every organism's BRAIN WEIGHTS by a tiny seeded
   * jitter (±amp, uniform) — a real, live neurological shift, not decoration: the 70-param policies
   * measurably drift so post-morph steering behaviour differs. Trait genes (the personality region)
   * are left untouched so identity survives the mutation; only cognition wobbles. Deterministic via
   * the injected rng (a user-gesture stream, like burst/mutate). O(capacity × brainGenes).
   */
  perturbBrains(rng: Rng, amp = 0.015): void {
    for (let slot = 0; slot < this.capacity; slot++) {
      const base = slot * GENOME_LEN;
      for (let k = base + TRAIT_GENES; k < base + GENOME_LEN; k++) {
        this.setGene(k, this.getGene(k) + (rng() * 2 - 1) * amp);
      }
    }
  }

  /**
   * Move one predator brain toward a prey brain while mutating the real backing storage. This replaces
   * callers mutating `genomeAt(...).subarray(...)`, which cannot work once storage is packed.
   */
  devourBrain(
    predatorSlot: number,
    preyBrain: ArrayLike<number>,
    alpha = 0.25,
  ): { mindDistance: number; transfer: number } {
    if (predatorSlot < 0 || predatorSlot >= this.capacity) {
      return { mindDistance: 0, transfer: 0 };
    }
    const base = predatorSlot * GENOME_LEN + TRAIT_GENES;
    let dist = 0;
    let moved = 0;
    for (let k = 0; k < BRAIN_GENES; k++) {
      const pk = this.getGene(base + k);
      const qk = preyBrain[k] ?? 0;
      const diff = qk - pk;
      dist += diff * diff;
      const delta = alpha * diff;
      this.setGene(base + k, pk + delta);
      moved += delta * delta;
    }
    return { mindDistance: Math.sqrt(dist), transfer: Math.sqrt(moved) };
  }

  /**
   * Drive every organism brain this frame: build each entity's senses, run its 70-param brain, and
   * apply the resulting bounded steering to its velocity. Returns how many entities thought. Pure
   * w.r.t. the world rng (touches only entity velocity); allocation-free. Launched NHIs are skipped
   * (they carry their own deep mind). `chaos` is the world disorder, `t` the sim clock (seconds).
   */
  think(list: ReadonlyArray<Entity | undefined>, chaos: number, t: number): number {
    const n = Math.min(list.length, this.capacity);
    if (n === 0) return 0;
    const chaosN = clamp01(chaos / 10);
    let thought = 0;
    for (let i = 0; i < n; i++) {
      const e = list[i];
      if (e && this.thinkSlot(e, i, chaosN, t)) thought++;
    }
    return thought;
  }

  /**
   * Drive the exact original entity slots chosen by a caller-owned priority system. Unlike `think`,
   * this does not compact the list or apply the internal round-robin cohort: each index still maps to
   * its matching genome slot, which keeps perceptual-priority scheduling from steering the wrong brain.
   */
  thinkIndices(
    list: ReadonlyArray<Entity | undefined>,
    indices: ReadonlyArray<number>,
    chaos: number,
    t: number,
  ): number {
    if (indices.length === 0 || this.capacity === 0) return 0;
    const chaosN = clamp01(chaos / 10);
    let thought = 0;
    for (const slot of indices) {
      if (!Number.isInteger(slot) || slot < 0 || slot >= this.capacity || slot >= list.length)
        continue;
      const e = list[slot];
      if (e && this.thinkSlot(e, slot, chaosN, t)) thought++;
    }
    return thought;
  }

  /**
   * Explicit full-quality alias: no slicing, no prioritization - every entity gets full brain evaluation.
   * Optional cameraPos enables perceptual priority cascades (distance-based LOD) for invisible optimization.
   */
  thinkAll(
    list: ReadonlyArray<Entity | undefined>,
    chaos: number,
    t: number,
    cameraPos?: { x: number; y: number; z: number },
  ): number {
    const chaosN = clamp01(chaos / 10);
    const n = Math.min(list.length, this.capacity);
    let thought = 0;
    for (let i = 0; i < n; i++) {
      const e = list[i];
      if (e && this.thinkSlot(e, i, chaosN, t, cameraPos)) thought++;
    }
    return thought;
  }

  private thinkSlot(
    e: Entity,
    slot: number,
    chaosN: number,
    t: number,
    cameraPos?: { x: number; y: number; z: number },
  ): boolean {
    const ud = e.userData;
    if (ud.isNhi) return false; // launched NHIs fly their own mind
    const base = slot * GENOME_LEN;
    const s = this.senses;
    // ── PERCEPTION (6 senses, all bounded) ──
    s[0] = clamp01(ud.energy / 100); // health / wealth
    s[1] = clamp01(ud.age / (ud.life > 1 ? ud.life : 1)); // mortality (age toward death)
    const sp = Math.hypot(ud.vel.x, ud.vel.y, ud.vel.z);
    s[2] = clamp01(sp / 6); // own speed
    s[3] = chaosN; // world disorder
    const fp32 = this.fp32Genomes;
    const curiosity = fp32
      ? (fp32[base + TRAIT.curiosity] ?? 0)
      : this.getGene(base + TRAIT.curiosity);
    s[4] = Number.isFinite(curiosity) ? curiosity : 0.5; // stable personality bias (diversity)
    s[5] = Math.sin(ud.ph + t * 0.6); // a phase clock (-1..1)
    // ── PERCEPTUAL PRIORITY CASCADE (Phase 1.2 optimization) ──
    // Distance-based LOD: distant entities get simplified brain evaluation
    // Invisible to user - distant entities are visually small anyway
    let useFullBrain = true;
    if (cameraPos) {
      const dx = e.position.x - cameraPos.x;
      const dy = e.position.y - cameraPos.y;
      const dz = e.position.z - cameraPos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      // Near (0-50): full 70-param brain
      // Mid (50-200): simplified 35-param brain (skip hidden layer)
      // Far (200+): minimal 10-param brain (direct sense→action)
      if (dist > 200) {
        useFullBrain = false;
        // Minimal brain: direct sense→action mapping (no hidden layer)
        const o = this.out;
        o[0] = s[0] * 0.5 + s[1] * 0.3 + s[2] * 0.2; // forward/back
        o[1] = s[3] * 0.5 + s[4] * 0.5; // left/right
        o[2] = s[5] * 0.5; // up/down
        o[3] = s[0] * 0.5; // excitation
      } else if (dist > 50) {
        useFullBrain = false;
        // Simplified brain: single hidden layer with fewer neurons
        this.forwardSimplified(base + TRAIT_GENES);
      }
    }
    // ── COGNITION (70-param brain, inline allocation-free forward) ──
    if (useFullBrain) {
      if (fp32) this.forwardFp32(base + TRAIT_GENES, fp32);
      else this.forward(base + TRAIT_GENES);
    }
    const o = this.out;
    // ── ACTION: a small, bounded steer; out[3] is an excitation that scales the authority ──
    const gain = STEER_GAIN * (0.5 + 0.75 * ((o[3] ?? 0) + 1) * 0.5);
    ud.vel.x += (o[0] ?? 0) * gain;
    ud.vel.z += (o[1] ?? 0) * gain;
    ud.vel.y += (o[2] ?? 0) * gain * 0.5; // gentler vertical
    return true;
  }

  /** Allocation-free MLP forward reading brain weights from the flat pool at `base` into `out`. */
  private forward(base: number): void {
    const s = this.senses;
    const hid = this.hidden;
    const out = this.out;
    let w = base;
    for (let h = 0; h < BRAIN_HIDDEN; h++) {
      let acc = this.getGene(w++); // bias
      for (let i = 0; i < BRAIN_IN; i++) acc += this.getGene(w++) * (s[i] ?? 0);
      hid[h] = Math.tanh(acc);
    }
    for (let o = 0; o < BRAIN_OUT; o++) {
      let acc = this.getGene(w++); // bias
      for (let h = 0; h < BRAIN_HIDDEN; h++) acc += this.getGene(w++) * (hid[h] ?? 0);
      out[o] = Math.tanh(acc);
    }
  }

  /** Simplified forward pass for mid-distance entities (perceptual priority cascade). */
  private forwardSimplified(base: number): void {
    const s = this.senses;
    const out = this.out;
    // Single hidden layer with 3 neurons instead of 6 (50% reduction)
    const hid = this.hidden;
    let w = base;
    for (let h = 0; h < 3; h++) {
      let acc = this.getGene(w++); // bias
      for (let i = 0; i < BRAIN_IN; i++) acc += this.getGene(w++) * (s[i] ?? 0);
      hid[h] = Math.tanh(acc);
    }
    for (let o = 0; o < BRAIN_OUT; o++) {
      let acc = this.getGene(w++); // bias
      for (let h = 0; h < 3; h++) acc += this.getGene(w++) * (hid[h] ?? 0);
      out[o] = Math.tanh(acc);
    }
  }

  /** Full-fidelity runtime fast path: same arithmetic/order as `forward`, minus packed-storage decode. */
  private forwardFp32(base: number, genes: Float32Array): void {
    const s = this.senses;
    const hid = this.hidden;
    const out = this.out;
    let w = base;
    for (let h = 0; h < BRAIN_HIDDEN; h++) {
      let acc = genes[w++] ?? 0; // bias
      for (let i = 0; i < BRAIN_IN; i++) acc += (genes[w++] ?? 0) * (s[i] ?? 0);
      hid[h] = Math.tanh(acc);
    }
    for (let o = 0; o < BRAIN_OUT; o++) {
      let acc = genes[w++] ?? 0; // bias
      for (let h = 0; h < BRAIN_HIDDEN; h++) acc += (genes[w++] ?? 0) * (hid[h] ?? 0);
      out[o] = Math.tanh(acc);
    }
  }

  private getGene(index: number): number {
    if (this.storageKind === 'fp32') return (this.genomes as Float32Array)[index] ?? 0;
    if (this.storageKind === 'fp16')
      return fp16BitsToFp32((this.genomes as Uint16Array)[index] ?? 0);
    const min = this.int8Min(index);
    return int8ToFp32((this.genomes as Uint8Array)[index] ?? 0, min, this.int8Max());
  }

  private setGene(index: number, value: number): void {
    if (this.storageKind === 'fp32') {
      (this.genomes as Float32Array)[index] = value;
      return;
    }
    if (this.storageKind === 'fp16') {
      (this.genomes as Uint16Array)[index] = fp32ToFp16Bits(value);
      return;
    }
    (this.genomes as Uint8Array)[index] = fp32ToInt8(value, this.int8Min(index), this.int8Max());
  }

  private int8Min(index: number): number {
    return index % GENOME_LEN < TRAIT_GENES ? 0 : -1;
  }

  private int8Max(): number {
    return 1;
  }
}

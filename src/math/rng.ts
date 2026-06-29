/**
 * Deterministic randomness (contract rule 7, Known Bug 9).
 *
 * The legacy monolith aliased the built-in unseeded generator (`var rng=Math.random`, line 143)
 * and sprinkled it everywhere, making runs non-reproducible. Every random draw in the port flows
 * through an injected `Rng` produced here, so a single uint32 seed reproduces a whole run and
 * keeps benchmarks stable.
 */

/** A pseudo-random number generator: each call yields a uniform sample in `[0, 1)`. */
export type Rng = () => number;

/**
 * Mulberry32 — fast 32-bit deterministic PRNG. Same seed ⇒ same sequence; the seed is coerced to
 * uint32, so `mulberry32(s)` and `mulberry32(s + 2**32)` are identical streams.
 * Each draw is O(1) and allocation-free.
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Compatibility alias for tests and corpus ports that name the seeded generator `makeRng`. */
export const makeRng = mulberry32;

/**
 * FNV-1a 32-bit string hash → uint32 seed for {@link mulberry32}. Lets human-readable run names
 * ("apocalypse-demo") map deterministically onto seeds. O(s.length).
 */
export function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Bug 9 fix: Provide exactly 3 isolated streams to prevent cross-contamination
 * between physics, AI, and UI events.
 */
export function createIsolatedStreams(seed: number) {
  return {
    physicsRng: mulberry32(seed),
    aiRng: mulberry32((seed ^ 0x12345678) >>> 0),
    uiRng: mulberry32((seed ^ 0x87654321) >>> 0),
  };
}

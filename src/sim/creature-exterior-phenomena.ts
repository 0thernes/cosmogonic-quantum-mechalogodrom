/**
 * CREATURE EXTERIOR PHENOMENA — 1000 deterministic wild-body behaviors for the Mechalogodrom
 * (and shared exterior vocabulary for Apex ς + 100 glyph pantheon shells).
 *
 * These drive the PHYSICAL OUTSIDE of the three super-creatures in Three.js — NOT brain/HUD panels.
 * Intelligence remains in Tsotchke + sim brains; this catalog names what the body *does* visually.
 *
 * @see docs/APEX-BRAIN-ABOMINATION-2026-06-26.md
 * @see docs/BRAIN-PARAMETER-SCALE-PLAN.md
 */

export const PHENOMENON_KINDS = [
  'glitch_moire',
  'fractal_void',
  'neural_lattice',
  'quantum_bloom',
  'organic_vein',
  'typo_swarm',
  'wire_cube',
  'iridescent_cross',
  'cantor_dust',
  'paradox_loop',
  'crt_canyon',
  'tesseract_tunnel',
  'nebula_claw',
  'exo_cage',
  'mandel_warp',
] as const;

export type PhenomenonKind = (typeof PHENOMENON_KINDS)[number];

export interface CreatureExteriorPhenomenon {
  readonly id: number;
  readonly name: string;
  readonly kind: PhenomenonKind;
  readonly hue: number;
  readonly speed: number;
  readonly density: number;
  readonly gameTag: string;
}

const PREFIXES = [
  'Void',
  'Quantum',
  'Glitch',
  'Cantor',
  'Paradox',
  'Warp',
  'Viral',
  'Cosmic',
  'Inductive',
  'Deductive',
] as const;

const CORES = [
  'Hydra',
  'Tunnel',
  'Fractal',
  'Lattice',
  'Moiré',
  'Tesseract',
  'Ouroboros',
  'Synapse',
  'Nebula',
  'Abomination',
] as const;

const SUFFIXES = [
  'Phase',
  'Fold',
  'Bloom',
  'Cascade',
  'Echo',
  'Rupture',
  'Dream',
  'Pulse',
  'Drift',
  'Singularity',
] as const;

const GAME_TAGS = [
  'nash',
  'pareto',
  'minimax',
  'replicator',
  'signaling',
  'coalition',
  'trembling',
  'correlated',
  'evolutionary',
  'mechanism',
] as const;

/** Build all 1000 exterior phenomena (deterministic, no rng). */
export function buildCreatureExteriorPhenomena(): readonly CreatureExteriorPhenomenon[] {
  const out: CreatureExteriorPhenomenon[] = [];
  let id = 0;
  for (let p = 0; p < PREFIXES.length; p++) {
    for (let c = 0; c < CORES.length; c++) {
      for (let s = 0; s < SUFFIXES.length; s++) {
        const kind = PHENOMENON_KINDS[(p + c + s) % PHENOMENON_KINDS.length]!;
        out.push({
          id,
          name: `${PREFIXES[p]!} ${CORES[c]!} ${SUFFIXES[s]!}`,
          kind,
          hue: ((p * 37 + c * 53 + s * 71) % 360) / 360,
          speed: 0.12 + ((p * 3 + c * 5 + s * 7) % 10) / 50,
          density: 0.2 + ((p + c + s) % 10) / 12,
          gameTag: GAME_TAGS[(p + c + s) % GAME_TAGS.length]!,
        });
        id++;
      }
    }
  }
  return out;
}

export const CREATURE_EXTERIOR_PHENOMENA = buildCreatureExteriorPhenomena();

export const CREATURE_EXTERIOR_PHENOMENA_COUNT = CREATURE_EXTERIOR_PHENOMENA.length;

/** Global exterior animation scale — slow, living, adaptive (glacial; no racing loops). */
export const CREATURE_EXTERIOR_TIME_SCALE = 0.12;

/** Pick active exterior phenomenon indices from beat + activity (deterministic). */
export function activeExteriorPhenomena(beat: number, activity: number, count = 8): number[] {
  const n = CREATURE_EXTERIOR_PHENOMENA.length;
  const base = (beat * 17 + Math.floor(activity * 1000)) % n;
  const step = 137;
  const indices: number[] = [];
  for (let i = 0; i < count; i++) indices.push((base + i * step) % n);
  return indices;
}

/** Tsotchke corpus pulse → exterior hue shift (read-only projection). */
export function tsotchkeExteriorHue(
  pulse: { qgtVolume: number; quakeAliveness: number; cliffordEnt: number },
  baseHue: number,
): number {
  return (
    (baseHue + pulse.qgtVolume * 0.12 + pulse.quakeAliveness * 0.08 + pulse.cliffordEnt * 0.05) % 1
  );
}

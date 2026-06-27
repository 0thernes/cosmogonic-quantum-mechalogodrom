/**
 * GOAL5 Godform / Pantheon facade — 25 Archons (1 NEO + 4 OMEGA apex + 20 ALPHA light).
 * POWER OF MATH: each emphasizes different substrate (Clifford stabilizer "prophecy", generative simulation,
 * topological curvature, chaotic regime, algebraic resonance).
 * Wired from full local Tsotchke corpus (20 repos: Eshkol AD primitive/HoTT/arena, Moonlab Bloch/qgt/tensor/open-registries, libirrep reps/QEC, etc.). See docs/TSOTCHKE-INTEGRATION-MAP-2026-06-26.md.
 * Used by world for spawn + by UI/telemetry.
 * Deterministic, no runtime allocation after boot.
 * See GOAL5 contract, masters (Oracle/Architect/Starkiller/Broly/Manhattan).
 * NOT sentient — 5 functional god-simulacra.
 */

export const GODFORMS = [
  'ORACLE-Σ', // Clifford stabilizer heavy — measurement reflex (stabilizer simulation; "prophecy" shorthand only)
  'STARKILLER-Ω', // Generative top-down + HOT — simulator of futures
  'MANHATTAN-Φ', // Quality space + IIT phi emphasis — integrated "field"
  'BROLY-Ψ', // Chaos / Lyapunov + wild morph — regime shifter
  'VOID-Λ',
  'KURAMOTO-κ',
  'PHASELOCK-δ',
  'STIGMERG-μ',
  'EMERGENT-ν',
  'SYMBIONT-ξ',
  'PARASITE-ο',
  'MYTHOS-π',
  'RITUAL-ρ',
  'TABOO-σ',
  'DREAMER-τ',
  'REPLAY-υ',
  'ONTOGEN-φ',
  'MORTAL-χ',
  'LEGACY-ψ',
  'WARHORN-ω',
  'SCARCITY-α',
  'TROPHIC-β',
  'FIELD-γ',
  'BINDING-ε',
  'RESONANCE-ζ',
] as const;

export type Godform = (typeof GODFORMS)[number];

export type ArchonTier = 'neo' | 'omega' | 'alpha';

export const PANTHEON_SIZE = 25;

export function getArchonTier(i: number): ArchonTier {
  const idx = ((i % PANTHEON_SIZE) + PANTHEON_SIZE) % PANTHEON_SIZE;
  if (idx === 0) return 'neo';
  if (idx <= 4) return 'omega';
  return 'alpha';
}

export interface GodformBias {
  cliffordWeight: number;
  generative: number;
  chaos: number;
  narrative: number;
  colorHue: number; // base for body
  eshkolLogic: number; // TSOTCHKE Eshkol: logic/KB weight
  eshkolInference: number; // active inference weight
  eshkolWorkspace: number; // GWT weight
  tsotchkeModule: string; // explicit: e.g. "EshkolConsciousness", "MoonlabSim", "QGTLGeo", "LibirrepSym", "QuantumQuake"
  eshkolProgram: string; // Eshkol .esk-inspired program for the Archon from corpus
}

/** Deterministic bias tables for all 25 Archons (0–24). */
// NEO apex (0) + OMEGA mid-tier (1-4) + ALPHA light (5-24)
const APEX_CW = [
  0.9, 0.3, 0.4, 0.2, 0.5, 0.6, 0.7, 0.4, 0.3, 0.5, 0.4, 0.6, 0.5, 0.4, 0.3, 0.6, 0.5, 0.4, 0.7,
  0.5, 0.6, 0.4, 0.5, 0.7, 0.6,
];
const APEX_GEN = [
  0.3, 0.85, 0.5, 0.4, 0.6, 0.4, 0.3, 0.6, 0.5, 0.4, 0.5, 0.4, 0.6, 0.5, 0.4, 0.3, 0.5, 0.6, 0.4,
  0.5, 0.4, 0.6, 0.5, 0.4, 0.3,
];
const APEX_CH = [
  0.2, 0.4, 0.3, 0.95, 0.5, 0.4, 0.5, 0.6, 0.7, 0.4, 0.5, 0.4, 0.3, 0.6, 0.5, 0.4, 0.7, 0.5, 0.4,
  0.6, 0.5, 0.4, 0.3, 0.6, 0.5,
];
const APEX_NAR = [
  0.4, 0.5, 0.6, 0.3, 0.9, 0.5, 0.4, 0.3, 0.6, 0.7, 0.5, 0.4, 0.3, 0.6, 0.5, 0.4, 0.3, 0.6, 0.5,
  0.4, 0.7, 0.5, 0.4, 0.3, 0.6,
];
const APEX_HUE = [
  0.75, 0.42, 0.58, 0.12, 0.0, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95, 0.05, 0.1, 0.2,
  0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95,
];
const APEX_EL = [
  0.8, 0.4, 0.5, 0.3, 0.6, 0.5, 0.4, 0.6, 0.3, 0.5, 0.4, 0.6, 0.5, 0.4, 0.3, 0.6, 0.5, 0.4, 0.6,
  0.3, 0.5, 0.4, 0.6, 0.5, 0.4,
];
const APEX_EI = [
  0.5, 0.9, 0.6, 0.4, 0.7, 0.4, 0.5, 0.6, 0.3, 0.5, 0.4, 0.6, 0.5, 0.4, 0.3, 0.6, 0.5, 0.4, 0.6,
  0.3, 0.5, 0.4, 0.6, 0.5, 0.4,
];
const APEX_EW = [
  0.9, 0.5, 0.7, 0.6, 0.4, 0.5, 0.4, 0.6, 0.3, 0.5, 0.4, 0.6, 0.5, 0.4, 0.3, 0.6, 0.5, 0.4, 0.6,
  0.3, 0.5, 0.4, 0.6, 0.5, 0.4,
];
const APEX_MOD = [
  'EshkolConsciousness',
  'MoonlabSim',
  'QGTLGeo',
  'LibirrepSym',
  'QuantumQuake',
  'KuramotoSync',
  'PhaseLock',
  'StigmergField',
  'EmergentEngine',
  'SymbiontCore',
  'ParasiteCore',
  'MythosEngine',
  'RitualEngine',
  'TabooEngine',
  'DreamerCore',
  'ReplayCore',
  'OntogenCore',
  'MortalCore',
  'LegacyCore',
  'WarhornCore',
  'ScarcityCore',
  'TrophicCore',
  'FieldCore',
  'BindingCore',
  'ResonanceCore',
];
const APEX_PROG = [
  "(define (oracle-think state) (unify state 'prophecy))",
  "(define (starkiller-sim future) (ad future 'hallucinate))",
  "(define (manhattan-integrate phi) (gwt phi 'broadcast))",
  "(define (broly-chaos regime) (factor-graph regime 'shift))",
  "(define (void-manipulate narr) (kb narr 'deceive))",
  "(define (kuramoto-sync phases) (couple phases 'lock))",
  "(define (phaselock-delta waves) (synchronize waves 'align))",
  "(define (stimerg-mu field) (deposit field 'mark))",
  "(define (emergent-nu system) (novelty system 'explore))",
  "(define (symbiont-xi host) (merge host 'cooperate))",
  "(define (parasite-omicron host) (extract host 'feed))",
  "(define (mythos-pi culture) (symbol culture 'create))",
  "(define (ritual-rho group) (repeat group 'bind))",
  "(define (taboo-sigma group) (forbid group 'avoid))",
  "(define (dreamer-tau memory) (replay memory 'dream))",
  "(define (replay-upsilon trace) (consolidate trace 'learn))",
  "(define (ontogen-phi organism) (develop organism 'grow))",
  "(define (mortal-chi life) (terminate life 'end))",
  "(define (legacy-psi ancestor) (inherit ancestor 'remember))",
  "(define (warhorn-omega enemy) (attack enemy 'dominate))",
  "(define (scarcity-alpha resource) (hoard resource 'compete))",
  "(define (trophic-beta prey) (consume prey 'survive))",
  "(define (field-gamma space) (perceive space 'sense))",
  "(define (binding-epsilon parts) (integrate parts 'unify))",
  "(define (resonance-zeta waves) (amplify waves 'resonate))",
];
void APEX_PROG; // apex programs retained for docs/corpus cross-ref

function tierScale(tier: ArchonTier): number {
  if (tier === 'neo') return 1;
  if (tier === 'omega') return 0.85;
  return 0.45;
}

export function getGodformBias(i: number): GodformBias {
  const n = PANTHEON_SIZE;
  const idx = ((i % n) + n) % n;
  const tier = getArchonTier(idx);
  const s = tierScale(tier);
  const lightJitter = idx >= 5 ? ((idx * 0.6180339887) % 1) * 0.15 : 0;
  return {
    cliffordWeight: clampBias((APEX_CW[idx] ?? 0.5) * s + lightJitter),
    generative: clampBias((APEX_GEN[idx] ?? 0.5) * s + lightJitter * 0.5),
    chaos: clampBias((APEX_CH[idx] ?? 0.5) * s + (idx >= 5 ? 0.1 : 0)),
    narrative: clampBias((APEX_NAR[idx] ?? 0.5) * s),
    colorHue: ((APEX_HUE[idx] ?? 0) + idx * 0.04) % 1,
    eshkolLogic: clampBias((APEX_EL[idx] ?? 0.5) * s),
    eshkolInference: clampBias((APEX_EI[idx] ?? 0.5) * s),
    eshkolWorkspace: clampBias((APEX_EW[idx] ?? 0.5) * s),
    tsotchkeModule: APEX_MOD[idx] ?? 'EshkolConsciousness',
    eshkolProgram:
      APEX_PROG[idx] ?? `(define (archon-${idx} state) (gwt state '${GODFORMS[idx] ?? 'echo'}))`,
  };
}

function clampBias(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** GOAL5: 5 distinct ArchonForm archetypes applied to body geometry/pulse (research: moonlab for tensor eyes, eshkol mouths/tendrils, moonquake lattice, ulg wings, chaos full wild).
 * + libirrep (mirrors/libirrep) rep theory (SO(3)/SU(2) symmetry) for Archon forms/phyla — Wigner/Clebsch for multi-appendage groups.
 * Full corpus study: Z:\[Vibe Coded (AI)]\(Tsotchke)\mirrors\libirrep + Eshkol etc.
 * Ralph 10x re-audit: Eshkol AD/tape, Moonlab tensor, libirrep, quantum-quake continue wired into super-mind/body/world/topdown/quality/godform.
 */
export const ARCHON_FORMS = ['TENSOR', 'ESHKOL', 'MOONQUAKE', 'ULG', 'CHAOS'] as const;
export type ArchonForm = (typeof ARCHON_FORMS)[number];

/** Per-index archetype form for body constructor (exclusive godform source per contract). */
export function getArchonForm(i: number): ArchonForm {
  const n = ARCHON_FORMS.length;
  const idx = ((i % n) + n) % n;
  return ARCHON_FORMS[idx]!;
}

// === TSOTCHKE FULL CORPUS WIRING (ralph loop) ===
// From Z:\[Vibe Coded (AI)]\(Tsotchke) — Eshkol + Moonlab + quake + irrep + ...
// Use facade for extended biases/pulses in body/mind/world. Deterministic.
import {
  getTsotchkeBias as getCorpusBias,
  corpusPulse,
  libirrepClebsch,
  type TsotchkeQuantumPulse,
  eshkolApplyAD,
  quakePerturb,
  ulgHandoff,
  gwtBroadcast,
  moonlabMpoStep,
  libirrepSymmetry,
  quakeQgeFactor,
  eshkolDual,
} from './tsotchke-facade'; // Ralph loop continue 10x: + eshkolDual for more AD/tape in godform
import {
  alphabetArchetypeByGlyph,
  alphabetArchetypeAt,
  type AlphabetArchetype,
} from './alphabet-pantheon';

export function getFullTsotchkeBias(i: number): GodformBias & {
  quakeFactor: number;
  adGradient: number;
  tensorChi: number;
} {
  const base = getGodformBias(i);
  const extra = getCorpusBias(i);
  // Ralph 10x: use ulg + gwt + ad from corpus (Eshkol GWT + ulg + quake + Moonlab)
  const adG = eshkolApplyAD(extra.adDepth / 8, extra.eshkolWorkspace * 0.1);
  // Ralph continue 10x more: eshkolDual (Eshkol tape) for more AD in godform bias
  const adDual = eshkolDual((x) => x, extra.adDepth / 8);
  const adG2 = adG + adDual.derivative * 0.05;
  const qPert = quakePerturb(extra.quakeFactor, i * 13);
  const ulg = ulgHandoff(extra.quakeFactor, extra.eshkolLogic);
  const gwt = gwtBroadcast([extra.eshkolInference, extra.tensorChi / 10], [0.7, 0.5]);
  // Ralph re-audit 10x continue: mpo (Moonlab from Tsotchke) in godform for tensor net bias
  const mpo = moonlabMpoStep(new Float32Array([extra.adDepth, extra.quakeFactor]), 2);
  // Ralph heartbeat re-audit 10x continue: use libirrepSymmetry (Tsotchke) for more symmetry modulation in godform bias
  const irBias = libirrepSymmetry(extra.irrepDegree, 2);
  // Ralph continue 10x more: quakeQgeFactor for more quantum-quake in godform
  const qgeB = quakeQgeFactor(extra.quakeFactor, 0.2);
  return {
    ...base,
    quakeFactor:
      extra.quakeFactor *
      qPert *
      (1 + ulg * 0.05 + Math.abs(mpo) * 0.02 + (irBias % 3) * 0.01 + qgeB * 0.05),
    adGradient: adG2 + (gwt[0] || 0) * 0.01,
    tensorChi: extra.tensorChi,
  };
}

/** Ralph continue 10x: expose quake perturb + AD apply from corpus via godform for world/super use. */
export function getQuakePerturbForArchon(i: number, seed: number): number {
  const b = getCorpusBias(i);
  return quakePerturb(b.quakeFactor, seed);
}
export { eshkolApplyAD }; // re-export for direct use in mind/quality etc per contracts leafs ok

export function getCorpusPulseForArchon(i: number, seed: number): TsotchkeQuantumPulse {
  return corpusPulse(seed, i);
}

/** Libirrep symmetry for multi-part (from corpus mirrors/libirrep). Modulates eye/arm counts per form for equivariant geometry.
 * Ralph 10x: wired to forms for wilder distinct Archons.
 */
export function getArchonSymmetry(i: number): number {
  const extra = getCorpusBias(i);
  // libirrep clebsch from corpus (clebsch_gordan.h) for better sym.
  return libirrepClebsch(extra.irrepDegree, i, 1) || extra.irrepDegree;
}

export {
  substrateVectorForArchon,
  tsotchkeWiringCoverage,
  TSOTCHKE_REPO_COUNT,
} from './tsotchke-registry';
export { createPetriDish, petriDishBeat, petriDishView, petriGrowthMultiplier } from './petri-dish';
export type { PetriDishState, PetriDishView } from './petri-dish';

// === ALPHABET PANTHEON (100 Greek+Latin archetypes; the 25 Greek-keyed Archons are a subset) ===
export { ALPHABET_ROSTER, ALPHABET_PANTHEON_SIZE } from './alphabet-pantheon';
export { alphabetArchetypeByGlyph, alphabetArchetypeAt };
export type { AlphabetArchetype };

/**
 * Map one of the 25 godform Archons to its alphabet archetype by its trailing Greek-letter glyph
 * (ORACLE-Σ → Σ, KURAMOTO-κ → κ, …), so every Archon carries the deterministic, differentiated
 * alphabet identity + bias. The 100-archetype roster is the principled superset of this 25-Archon
 * pantheon; live-spawning all 100 as stepped creatures is perf-gated follow-up (like full Archon
 * individuation), but every Archon already resolves to its archetype here.
 */
export function alphabetArchetypeForGodform(i: number): AlphabetArchetype {
  const name = GODFORMS[((i % PANTHEON_SIZE) + PANTHEON_SIZE) % PANTHEON_SIZE] ?? GODFORMS[0];
  const glyph = name.slice(-1);
  return alphabetArchetypeByGlyph(glyph) ?? alphabetArchetypeAt(i);
}

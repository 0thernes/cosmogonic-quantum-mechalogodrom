/**
 * PRIMORDIAL SOUP — full Tsotchke-wired digital biologics birth layer.
 * Deterministic scaffold for emergent strains; not a claim of sentience.
 */

import type { Rng } from '../math/rng';
import type { OrganismIntelligenceSignal } from '../types';
import { clamp } from '../math/scalar';
import {
  getEshkolProgramFingerprint,
  TSOTCHKE_HARVEST as _TSOTCHKE_HARVEST,
} from './generated-tsotchke-seeds'; // From real local Tsotchke Repo Folder harvest (builds with the folder)
import { corpusBeatForArchon, getTsotchkeRepoByIndex } from './tsotchke-registry';
import { grayScottResidual, pinnLoss } from './pinn-residual'; // DEEPEN: Tsotchke PINN (shallow telemetry -> decision) as physics-informed metabolism residual for vitality in soup. Real math from corpus.
import { recombine } from './genome'; // genuine seeded crossover+mutation — closes the heredity loop on rebirth

const clamp01 = (v: number): number => clamp(v, 0, 1);

export const SOUP_SLOTS = 128; // Expanded 0.16: depth-classed Tsotchke corpus (local Z:\[Vibe Coded (AI)]\(Tsotchke) + GH) — Eshkol .esk programs as native heritable DNA for digital biologics.
export const SOUP_GENOME_LEN = 24;
/** How far above the live-population mean vitality the fittest strain must stand to count as "emergent"
 *  in {@link PrimordialSoup.harvestEmergent} — a relative bar, robust to the metabolic-upkeep equilibrium. */
const HARVEST_MARGIN = 0.06;

/** Real Eshkol program DNA from corpus (gradient_descent_demo.esk core, AD-as-primitive). Used as heritable genome for soup strains. */
export const ESHKOL_NATIVE_DNA_EXAMPLE = `;; Eshkol AD/GWT DNA from Z:\\[Vibe Coded (AI)]\\(Tsotchke)\\Eshkol\\eshkol_repo\\examples\\gradient_descent_demo.esk
(define (model params x) (+ (* (vector-ref params 0) x x) (* (vector-ref params 1) x) (vector-ref params 2)))
(define (squared-error params) (/ (fold-left (lambda (acc pair) (let ((x (car pair)) (y (cadr pair))) (+ acc (* (- (model params x) y) (- (model params x) y))))) 0.0 '((-2.0 15.0) (-1.0 6.0) (0.0 1.0) (1.0 0.0) (2.0 3.0) (3.0 10.0))) 6))
;; gradient primitive is compiler-native in Eshkol (AD)
(define (train-step p lr) (let ((g (gradient squared-error p))) (vector (- (vector-ref p 0) (* lr (vector-ref g 0))) (- (vector-ref p 1) (* lr (vector-ref g 1))) (- (vector-ref p 2) (* lr (vector-ref g 2))))))`;

export interface SoupStrain {
  id: number;
  vitality: number;
  generation: number;
  hue: number;
  symmetry: number;
  consciousness: number;
  alive: boolean;
  eshkolProgram?: number | string;
}

export interface SoupSnapshot {
  tick: number;
  strains: SoupStrain[];
  liveCount: number;
  meanVitality: number;
  catalysis: number;
  eshkolBorn: number;
  /** Number of real .esk programs harvested at build/dev time from the local Tsotchke Repo Folder.
   * This is how Cosmogonic actually BUILDS WITH the Tsotchke corpus for digital biologics DNA.
   */
  tsotchkeEskHarvested: number;
}

export class PrimordialSoup {
  private readonly vitality = new Float32Array(SOUP_SLOTS);
  private readonly generation = new Uint16Array(SOUP_SLOTS);
  private readonly hue = new Float32Array(SOUP_SLOTS);
  private readonly symmetry = new Float32Array(SOUP_SLOTS);
  private readonly consciousness = new Float32Array(SOUP_SLOTS);
  private readonly alive = new Uint8Array(SOUP_SLOTS);
  private readonly eshkolPrograms: (number | string | undefined)[] = Array.from<
    number | string | undefined
  >({ length: SOUP_SLOTS });
  /** Per-slot heritable gene vector (SOUP_GENOME_LEN). The genetic substrate that is
   *  inherited-and-varied on rebirth via the genuine `recombine` operator. */
  private readonly genomes: Float32Array[] = Array.from<Float32Array>({ length: SOUP_SLOTS });
  private readonly rng: Rng;
  private tick = 0;

  constructor(seedOrRng: number | Rng, seedVitality = 0.18, seed = 0x50ff0001) {
    this.rng = typeof seedOrRng === 'function' ? seedOrRng : makeSoupRng(seedOrRng);
    const rngSeed = (typeof seedOrRng === 'number' ? seedOrRng : seed) >>> 0;
    for (let i = 0; i < SOUP_SLOTS; i++) {
      const s = ((rngSeed + i * 123456789) % 997) / 997;
      this.vitality[i] = 0.1 + s * 0.2;
      this.generation[i] = 0;
      this.hue[i] = s;
      this.symmetry[i] = (i % 5) / 4;
      this.consciousness[i] = 0.2 + s * 0.3;
      this.alive[i] = s > 0.3 || this.rng() < seedVitality ? 1 : 0;
      // Seed a deterministic founder genome for every slot (genes in [0,1]).
      const g = new Float32Array(SOUP_GENOME_LEN);
      for (let k = 0; k < SOUP_GENOME_LEN; k++) {
        g[k] = ((rngSeed + i * 2654435761 + k * 40503) % 997) / 997;
      }
      this.genomes[i] = g;
      if (this.alive[i]) {
        // Built from the actual local Tsotchke Repo Folder via scripts/harvest-tsotchke-corpus.ts
        // Real .esk programs from the generated harvest become heritable digital biologic DNA.
        this.eshkolPrograms[i] = i % 3 === 0 ? getEshkolProgramFingerprint(i) : (s * 10000) >>> 0;
      }
    }
  }

  /** Pick a living slot ≠ `exclude` by seeded scan; -1 if none. Used to choose a co-parent. */
  private pickLivingParent(exclude: number, rng: Rng): number {
    let live = 0;
    for (let i = 0; i < SOUP_SLOTS; i++) if (this.alive[i] && i !== exclude) live++;
    if (live === 0) return -1;
    let target = Math.floor(rng() * live);
    for (let i = 0; i < SOUP_SLOTS; i++) {
      if (this.alive[i] && i !== exclude) {
        if (target === 0) return i;
        target--;
      }
    }
    return -1;
  }

  update(
    input: number | Float32Array,
    beatOrDt = 0,
    rng: Rng = this.rng,
    intelligence?: OrganismIntelligenceSignal,
  ): void {
    this.tick++;
    const archonIdx = typeof input === 'number' ? input : Math.floor(((input[0] ?? 0) * 10) % 10);
    const beat = typeof input === 'number' ? beatOrDt : this.tick;
    const inputCatalysis = typeof input === 'number' ? 0 : vectorMean(input);
    const corpus = clamp01(corpusBeatForArchon(archonIdx, beat) + inputCatalysis * 0.25);
    const repo = getTsotchkeRepoByIndex(archonIdx % 10);
    const wiring = repo?.wiring ?? 0.5;

    for (let i = 0; i < SOUP_SLOTS; i++) {
      if (!this.alive[i]) {
        // REBIRTH WITH HEREDITY (ADR-0009): a dead slot has a per-tick chance to be re-seeded by
        // breeding two living parents via the genuine seeded `recombine` (inherit + vary), so the
        // digital-biologics evolution loop actually closes. This branch was previously *below* the
        // alive-guard and gated on `!eshkolPrograms[i]`; since a slot's program is not cleared on
        // death, a dead slot was skipped here every tick and could never recover — the documented
        // rebirth path was unreachable (it bred nothing at runtime).
        if (rng() < 0.01 * wiring) {
          const pa = i;
          const pb = this.pickLivingParent(i, rng);
          const ga = this.genomes[pa];
          const gb = pb >= 0 ? this.genomes[pb] : undefined;
          if (ga && gb) {
            const child = recombine(ga, gb, rng);
            this.genomes[i] = child;
            // Heritable phenotype derived from the bred genome (deterministic, bounded).
            this.hue[i] = child[0] ?? this.hue[i] ?? 0;
            this.symmetry[i] = child[1] ?? this.symmetry[i] ?? 0;
            this.vitality[i] = 0.1 + (child[3] ?? 0.5) * 0.2; // viable inherited starting vitality (mirrors init)
            // .esk program fingerprint inherited from the genome rather than a free hash.
            this.eshkolPrograms[i] = ((((child[2] ?? 0) * 1e6) >>> 0) ^ (beat + i)) >>> 0;
            this.generation[i] =
              Math.max(this.generation[pa] ?? 0, pb >= 0 ? (this.generation[pb] ?? 0) : 0) + 1;
          } else {
            // No living co-parent: founder rebirth (legacy fresh program + baseline vitality).
            this.eshkolPrograms[i] = ((beat + i) * 2654435761) >>> 0;
            this.vitality[i] = 0.15;
            this.generation[i] = (this.generation[i] ?? 0) + 1;
          }
          this.alive[i] = 1;
        }
        continue;
      }
      const v = this.vitality[i] ?? 0;
      const c = this.consciousness[i] ?? 0;
      const prog = this.eshkolPrograms[i];
      // Safe fingerprint for native .esk string DNA or number (prevents NaN on string %).
      const programBoost =
        prog === undefined
          ? 0
          : typeof prog === 'string'
            ? (prog.length % 997) / 997
            : (Number(prog) % 997) / 997;
      const growth =
        0.001 +
        (corpus + inputCatalysis * 0.25) * 0.002 * wiring +
        programBoost * 0.001 +
        (intelligence?.enabled
          ? intelligence.resourcePressure *
            intelligence.plasticity *
            (0.00015 + programBoost * 0.0001)
          : 0);
      // DEEP Tsotchke PINN wiring (promote telemetry): Gray-Scott residual as metabolism health -> vitality boost for digital biologics.
      // PINN from Tsotchke corpus provides physics-informed field residual; high loss = low health = selection pressure.
      const pinnHealth = pinnLoss(
        grayScottResidual(0.5 + (i % 5) * 0.1, 0.3, 0.5, 0.5, 0.5, 0.5, 0.04, 0.06),
      ); // full sig: u v L R U D feed kill; Tsotchke PINN real math for biologics metabolism (deepened)
      const pinnFactor = 0.0005 * (pinnHealth - 0.5); // signed modulation; positive health aids growth
      // Metabolic upkeep (leaky integrator): holding vitality costs a fixed fraction per beat. Without
      // it, growth (floor +0.001) + pinnFactor is unconditionally >0, so EVERY strain's vitality
      // ratchets monotonically to the clamp and pins at 1.0 — vitality stops carrying any fitness
      // signal (meanVitality→1, harvestEmergent ties, all strains indistinguishable). The leak gives a
      // FITNESS-DEPENDENT equilibrium v* ≈ growth/UPKEEP: the fittest (growth≈UPKEEP) still hold near
      // 1.0 so the 0.85 harvest threshold stays reachable, while weaker strains settle lower — vitality
      // spans its range again. The young-strain death cull below remains reachable via external drain
      // (brutal-release), which the strictly-increasing internal loop never triggered anyway. Pure &
      // deterministic (no rng), so per-seed telemetry stays identical.
      const UPKEEP = 0.004;
      this.vitality[i] = clamp01(v * (1 - UPKEEP) + growth + pinnFactor);
      this.consciousness[i] = clamp01(
        c * 0.98 +
          (corpus + (this.symmetry[i] ?? 0)) * 0.01 * wiring +
          (intelligence?.enabled
            ? (intelligence.socialDrive + intelligence.forecast) * 0.00035
            : 0),
      );
      if ((this.vitality[i] ?? 0) < 0.05 && (this.generation[i] ?? 0) < 5) {
        this.alive[i] = 0;
      }
    }
  }

  incubate(): void {
    this.update(0, this.tick, this.rng);
  }

  harvestEmergent(): SoupStrain | null {
    // Relative emergent criterion: the FITTEST live strain, harvested only when it stands clearly above
    // the live-population mean (HARVEST_MARGIN). The old fixed `vitality > 0.85` bar became UNREACHABLE
    // once the metabolic-upkeep leak de-ratcheted vitality to a sub-0.85 fitness-dependent equilibrium —
    // it then always returned null and the world's emergent-spawn silently fell back to the fitness-blind
    // slot 0. A relative bar is robust to the equilibrium level and still means "an individual that
    // genuinely emerged from the pack." Deterministic (single argmax + mean scan). Winner resets to 0.35
    // for turnover. Measured by tests/soup-harvest-selection.test.ts.
    let best = -1;
    let bestVitality = -Infinity;
    let sumV = 0;
    let live = 0;
    for (let i = 0; i < SOUP_SLOTS; i++) {
      if (!this.alive[i]) continue;
      const vitality = this.vitality[i] ?? 0;
      sumV += vitality;
      live++;
      if (vitality > bestVitality) {
        bestVitality = vitality;
        best = i;
      }
    }
    if (best < 0 || live === 0) return null;
    if (bestVitality <= sumV / live + HARVEST_MARGIN) return null;
    const strain = this.strainAt(best);
    this.vitality[best] = 0.35;
    return strain;
  }

  snapshot(): SoupSnapshot {
    let live = 0;
    let sumV = 0;
    let eshkolBorn = 0;
    const strains: SoupStrain[] = [];
    for (let i = 0; i < SOUP_SLOTS; i++) {
      if (this.alive[i]) {
        live++;
        sumV += this.vitality[i] ?? 0;
        if (this.eshkolPrograms[i]) eshkolBorn++;
      }
      strains.push(this.strainAt(i));
    }
    return {
      tick: this.tick,
      strains,
      liveCount: live,
      meanVitality: live ? sumV / live : 0,
      catalysis: sumV,
      eshkolBorn,
      tsotchkeEskHarvested: _TSOTCHKE_HARVEST.eskCount,
    };
  }

  private strainAt(i: number): SoupStrain {
    return {
      id: i,
      vitality: this.vitality[i] ?? 0,
      generation: this.generation[i] ?? 0,
      hue: this.hue[i] ?? 0,
      symmetry: this.symmetry[i] ?? 0,
      consciousness: this.consciousness[i] ?? 0,
      alive: !!this.alive[i],
      eshkolProgram: this.eshkolPrograms[i], // Tsotchke depth-ledger DNA (Eshkol .esk programs as heritable substrate)
    };
  }
}

function makeSoupRng(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function vectorMean(v: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] ?? 0;
  return v.length === 0 ? 0 : sum / v.length;
}

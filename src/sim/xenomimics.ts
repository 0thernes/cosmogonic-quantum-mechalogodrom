/**
 * XENOMIMIC POPULATION — the ground-dwelling cosmic-horror fauna (deterministic first-class citizens).
 *
 * Xenomimics are the "Entities, but for the ground and the plants": weird tessellated horrors that
 * skitter, hop, sprint and ride the ground waves, graze the flora, mate, die and respawn so the
 * population always balances. Every creature is one half of an ENTANGLED TWIN PAIR sharing a single
 * ~100-parameter {@link XenomimicBrain}; the two halves think with opposite curvature (mimic vs
 * anti-mimic — a Joker/Batman tug-of-war), and a Born-rule collapse can TELEPORT one of them.
 *
 * Lifecycle (all deterministic, seeded from a DEDICATED substream that NEVER touches the sim RNG, so
 * adding this system cannot perturb the EntityManager golden):
 *  - Start with ONE pair (2 creatures) and slowly multiply toward a logistic target ramping 2 → 1000.
 *  - Graze flora for energy (read-only sampling — no biomass write, keeping the flora golden intact).
 *  - Breed when well-fed (litter of 1–3 new pairs) while below the current growth target.
 *  - Die of old age or starvation → respawn after a few minutes; be EATEN by other beings
 *    ({@link consume}) → respawn in 5 seconds. Population self-balances near carrying capacity.
 *
 * Determinism: pure given the seed. Internal clock is an accumulated dt (seconds), never Date.now. The
 * only randomness is this population's own {@link mulberry32} substream. Movement is curve/wave
 * locomotion (heading integration + sinusoidal sway + parabolic hops) — cheetah-sprint / snail-crawl /
 * plane-glide / helicopter-bob blended per species. Creatures never rise above the ground-wave crest.
 */
import { mulberry32, hashSeed, type Rng } from '../math/rng';
import { XenomimicBrain, type XenomimicBeat, type XenomimicThought } from './xenomimic-brain';
import type { OrganismIntelligenceSignal } from '../types';

/** Number of visually + behaviourally distinct xenomimic species. */
export const XENOMIMIC_SPECIES = 10;
/** Hard cap on live creatures (owner: "population grows to 1000 total"). */
export const XENOMIMIC_MAX = 1000;

/** One xenomimic. Position rides the ground; `y` is derived (ground wave + hop), never free-floating. */
export interface Xenomimic {
  readonly pairId: number;
  /** 0 = mimic (leans into the world) · 1 = anti-mimic (leans against it). */
  readonly role: 0 | 1;
  readonly species: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  heading: number;
  /** Vertical hop state: height above ground and its velocity (parabolic, gravity-restored). */
  hopY: number;
  hopV: number;
  energy: number;
  age: number;
  alive: boolean;
  /** Sim-clock seconds at which a dead creature revives (age/starve = minutes, predation = 5s). */
  respawnAt: number;
  /** Per-creature gait/sway phases (deterministic, seeded) for wave locomotion + shimmer. */
  gaitPhase: number;
  swayPhase: number;
  shimmer: number;
  /** Seconds until this creature may teleport again (Born-rule collapse cooldown). */
  teleportCd: number;
}

interface Pair {
  readonly id: number;
  readonly species: number;
  readonly brain: XenomimicBrain;
  readonly mimic: Xenomimic;
  readonly anti: Xenomimic;
  beat: XenomimicBeat | null;
  beatClock: number;
}

export interface XenomimicOptions {
  /** Radius of the circular arena the fauna roam (world units). */
  arenaRadius?: number;
  /** Seconds a creature lives before old-age death (owner: "die after a few minutes"). */
  lifetime?: number;
  /** Seconds a naturally-dead creature stays down before respawn (owner: "respawn in few minutes"). */
  respawnDelay?: number;
  /** Seconds an EATEN creature stays down before respawn (owner: "respawn in 5 seconds"). */
  predationRespawn?: number;
  /** Seconds over which the growth target ramps 2 → {@link XENOMIMIC_MAX}. */
  growthRamp?: number;
  /** Beat cadence in seconds — how often each pair re-thinks (perf; behaviour holds between beats). */
  beatInterval?: number;
}

/** Telemetry snapshot — the public state the HUD/observatory/audit read. */
export interface XenomimicTelemetry {
  population: number;
  pairs: number;
  births: number;
  deaths: number;
  eaten: number;
  teleports: number;
  meanEnergy: number;
  /** Mean live quantum coherence across pairs in [0,1] — how superposed the swarm is. */
  coherence: number;
  /** Mean tug-of-war tension between mimic/anti basins in [0,1]. */
  bondTension: number;
  speciesCounts: number[];
  dominantSpecies: number;
  growthTarget: number;
}

const clamp01 = (v: number): number => (!Number.isFinite(v) || v <= 0 ? 0 : v >= 1 ? 1 : v);
const TWO_PI = Math.PI * 2;

/** Gentle deterministic ground-wave height at a world point (creatures ride this; never above its crest). */
export function xenoGroundHeight(x: number, z: number, t: number): number {
  return (
    Math.sin(x * 0.013 + t * 0.15) * 3.2 +
    Math.cos(z * 0.017 - t * 0.11) * 2.6 +
    Math.sin((x + z) * 0.008) * 1.8
  );
}

export class XenomimicPopulation {
  private readonly rng: Rng;
  private readonly pairs: Pair[] = [];
  private nextPairId = 0;
  private clock = 0;
  private readonly arenaRadius: number;
  private readonly lifetime: number;
  private readonly respawnDelay: number;
  private readonly predationRespawn: number;
  private readonly growthRamp: number;
  private readonly beatInterval: number;

  // Cumulative counters (telemetry).
  private births = 0;
  private deaths = 0;
  private eatenCount = 0;
  private teleports = 0;

  constructor(seed: number, options: XenomimicOptions = {}) {
    this.rng = mulberry32((hashSeed('xenomimic-population') ^ (seed >>> 0)) >>> 0 || 1);
    this.arenaRadius = options.arenaRadius ?? 180;
    this.lifetime = options.lifetime ?? 150;
    this.respawnDelay = options.respawnDelay ?? 120;
    this.predationRespawn = options.predationRespawn ?? 5;
    this.growthRamp = options.growthRamp ?? 200;
    this.beatInterval = options.beatInterval ?? 0.2;
    // Owner: "Starts at just 2 together" — one entangled pair.
    this.spawnPair(this.rng() * XENOMIMIC_SPECIES, 0, 0);
  }

  /** Current logistic growth target (creatures), ramping 2 → MAX over {@link growthRamp} seconds. */
  private growthTarget(): number {
    const t = clamp01(this.clock / this.growthRamp);
    // Smooth ease so the swarm "slowly multiplies" early and saturates near the cap.
    const eased = t * t * (3 - 2 * t);
    return Math.round(2 + eased * (XENOMIMIC_MAX - 2));
  }

  /** Live creature count. */
  population(): number {
    let n = 0;
    for (const p of this.pairs) {
      if (p.mimic.alive) n++;
      if (p.anti.alive) n++;
    }
    return n;
  }

  pairCount(): number {
    return this.pairs.length;
  }

  private makeCreature(
    pairId: number,
    role: 0 | 1,
    species: number,
    x: number,
    z: number,
  ): Xenomimic {
    return {
      pairId,
      role,
      species,
      x,
      y: xenoGroundHeight(x, z, this.clock),
      z,
      vx: 0,
      vz: 0,
      heading: this.rng() * TWO_PI,
      hopY: 0,
      hopV: 0,
      energy: 0.5 + this.rng() * 0.3,
      age: this.rng() * 8,
      alive: true,
      respawnAt: 0,
      gaitPhase: this.rng() * TWO_PI,
      swayPhase: this.rng() * TWO_PI,
      shimmer: 0,
      teleportCd: 0,
    };
  }

  private spawnPair(speciesFloat: number, cx: number, cz: number): Pair | null {
    if (this.pairs.length >= XENOMIMIC_MAX / 2) return null;
    const id = this.nextPairId++;
    const species = Math.min(XENOMIMIC_SPECIES - 1, Math.max(0, Math.floor(speciesFloat)));
    const brain = new XenomimicBrain((id * 0x9e3779b1) ^ hashSeed(`xeno-pair-${species}`));
    // Twins are born adjacent — a bonded pair sharing one point in the world.
    const a = this.rng() * TWO_PI;
    const r = 2 + this.rng() * 3;
    const mimic = this.makeCreature(id, 0, species, cx + Math.cos(a) * r, cz + Math.sin(a) * r);
    const anti = this.makeCreature(id, 1, species, cx - Math.cos(a) * r, cz - Math.sin(a) * r);
    const pair: Pair = { id, species, brain, mimic, anti, beat: null, beatClock: -1 };
    this.pairs.push(pair);
    this.births += 2;
    return pair;
  }

  /**
   * Advance the population by `dt` seconds. `foodAt` (read-only flora food sampler) and `intelligence`
   * (shared organism-intelligence signal) are optional couplings; passing neither yields a
   * self-contained but still living population. Draws only from this system's own substream.
   */
  step(
    dt: number,
    couplings: {
      foodAt?: (x: number, z: number) => number;
      intelligence?: OrganismIntelligenceSignal | null;
      chaos?: number;
      temperature?: number;
    } = {},
  ): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    this.clock += dt;
    const chaos = clamp01(couplings.chaos ?? 0.3);
    const threat = couplings.intelligence?.enabled
      ? clamp01(couplings.intelligence.threatResponse)
      : 0.2;
    const resource = couplings.intelligence?.enabled
      ? clamp01(couplings.intelligence.resourcePressure)
      : 0.4;
    const target = this.growthTarget();
    let alive = this.population();

    for (const pair of this.pairs) {
      // One shared entangled beat per pair on the cadence — both twins resolved together.
      if (this.clock - pair.beatClock >= this.beatInterval) {
        const sMimic = this.senses(
          pair.mimic,
          pair.anti,
          couplings.foodAt,
          threat,
          resource,
          chaos,
        );
        const sAnti = this.senses(pair.anti, pair.mimic, couplings.foodAt, threat, resource, chaos);
        pair.beat = pair.brain.beat(sMimic, sAnti, this.rng);
        pair.beatClock = this.clock;
      }
      const beat = pair.beat;
      if (beat) {
        this.integrate(pair.mimic, beat.mimic, dt, couplings.foodAt);
        this.integrate(pair.anti, beat.anti, dt, couplings.foodAt);
      }
      this.lifecycle(pair.mimic, dt);
      this.lifecycle(pair.anti, dt);
    }

    // Breeding: well-fed pairs spawn a litter of 1–3 new pairs while the swarm is below its target.
    if (alive < target) {
      for (const pair of this.pairs) {
        if (alive >= target || this.pairs.length >= XENOMIMIC_MAX / 2) break;
        const m = pair.mimic;
        const canMate =
          m.alive &&
          pair.anti.alive &&
          m.energy > 0.7 &&
          (pair.beat?.mimic.mate ?? 0) > 0.3 &&
          m.age > 6;
        if (!canMate) continue;
        const litter = 1 + Math.floor(this.rng() * 3);
        for (let k = 0; k < litter && alive < target; k++) {
          const child = this.spawnPair(
            this.rng() < 0.85 ? pair.species : this.rng() * XENOMIMIC_SPECIES,
            m.x + (this.rng() - 0.5) * 12,
            m.z + (this.rng() - 0.5) * 12,
          );
          if (!child) break;
          alive += 2;
        }
        m.energy -= 0.35;
        pair.anti.energy -= 0.2;
      }
    }
  }

  /** Build the 6-input sense vector for one twin (mate reads its partner's proximity + energy). */
  private senses(
    self: Xenomimic,
    twin: Xenomimic,
    foodAt: ((x: number, z: number) => number) | undefined,
    threat: number,
    resource: number,
    chaos: number,
  ): number[] {
    const food = foodAt ? clamp01(foodAt(self.x, self.z)) : 0.4;
    const dx = twin.x - self.x;
    const dz = twin.z - self.z;
    const twinDist = clamp01(1 - Math.sqrt(dx * dx + dz * dz) / (this.arenaRadius * 0.5));
    const crowding = clamp01((resource + threat) * 0.5);
    return [food, crowding, threat, chaos, twinDist, clamp01(self.energy)];
  }

  /** Move a creature under its resolved thought: heading + wave sway + hop + teleport, then eat. */
  private integrate(
    c: Xenomimic,
    thought: XenomimicThought,
    dt: number,
    foodAt: ((x: number, z: number) => number) | undefined,
  ): void {
    if (!c.alive) return;
    // Species set a locomotion personality: sprinters (cheetah) vs crawlers (snail).
    const gaitFast = 6 + (c.species % 4) * 5;
    c.gaitPhase = (c.gaitPhase + dt * (2 + thought.speed * 6)) % TWO_PI;
    c.swayPhase = (c.swayPhase + dt * 3) % TWO_PI;
    c.heading += thought.turn * dt * 2.5 + Math.sin(c.swayPhase) * dt * 0.6; // wave/curve locomotion
    const speed = thought.speed * gaitFast * (0.6 + 0.4 * Math.abs(Math.sin(c.gaitPhase))); // gait pulse
    c.vx = Math.cos(c.heading) * speed;
    c.vz = Math.sin(c.heading) * speed;
    c.x += c.vx * dt;
    c.z += c.vz * dt;

    // Hop (parabolic, gravity-restored) — they jump/leap but never clear the ground-wave crest by much.
    if (thought.jump > 0.6 && c.hopY <= 0.01) c.hopV = 4 + thought.jump * 6;
    c.hopV -= 22 * dt;
    c.hopY = Math.max(0, c.hopY + c.hopV * dt);

    // Teleport: a Born-rule collapse relocates a still-superposed creature a short distance instantly.
    c.teleportCd = Math.max(0, c.teleportCd - dt);
    if (thought.teleport && c.teleportCd <= 0) {
      const a = this.rng() * TWO_PI;
      const jump = 10 + this.rng() * 25;
      c.x += Math.cos(a) * jump;
      c.z += Math.sin(a) * jump;
      c.teleportCd = 2.5;
      this.teleports++;
    }

    // Keep them inside the arena and glued to the ground wave.
    const rr = Math.sqrt(c.x * c.x + c.z * c.z);
    if (rr > this.arenaRadius) {
      const s = this.arenaRadius / rr;
      c.x *= s;
      c.z *= s;
      c.heading += Math.PI; // turn back inward
    }
    c.y = xenoGroundHeight(c.x, c.z, this.clock) + c.hopY + 1.2;
    c.shimmer = thought.shimmer;

    // Eat: sample flora food (read-only — no biomass depletion, so the flora golden is untouched). A
    // baseline passive graze plus an appetite-driven bonus, so a well-fed creature reliably survives
    // regardless of its brain's random appetite bias, while a barren patch still starves it.
    if (foodAt) {
      const food = clamp01(foodAt(c.x, c.z));
      const graze = (0.35 + thought.eat * 0.65) * food;
      c.energy = clamp01(c.energy + graze * dt * 0.5);
    }
  }

  /** Age, metabolic drain, natural death, and timed respawn. */
  private lifecycle(c: Xenomimic, dt: number): void {
    if (c.alive) {
      c.age += dt;
      c.energy = clamp01(c.energy - dt * 0.02); // metabolic upkeep
      if (c.age > this.lifetime || c.energy <= 0) {
        c.alive = false;
        c.respawnAt = this.clock + this.respawnDelay;
        this.deaths++;
      }
    } else if (this.clock >= c.respawnAt) {
      this.revive(c);
    }
  }

  /** Bring a downed creature back near its arena, fresh. Balances the population. */
  private revive(c: Xenomimic): void {
    const a = this.rng() * TWO_PI;
    const r = this.rng() * this.arenaRadius * 0.8;
    c.x = Math.cos(a) * r;
    c.z = Math.sin(a) * r;
    c.y = xenoGroundHeight(c.x, c.z, this.clock) + 1.2;
    c.vx = 0;
    c.vz = 0;
    c.hopY = 0;
    c.hopV = 0;
    c.energy = 0.5 + this.rng() * 0.3;
    c.age = 0;
    c.alive = true;
    c.respawnAt = 0;
  }

  /**
   * Mark a creature EATEN by another being. It goes down and respawns in {@link predationRespawn}
   * seconds (owner: "consumed by other beings as food and they respawn in 5 seconds"). Returns the
   * energy yielded to the predator, or 0 if the target was already down.
   */
  consume(c: Xenomimic): number {
    if (!c.alive) return 0;
    const yield_ = 0.3 + c.energy * 0.5;
    c.alive = false;
    c.respawnAt = this.clock + this.predationRespawn;
    this.eatenCount++;
    this.deaths++;
    return yield_;
  }

  /** Iterate every LIVE creature (render + telemetry + external predation queries). */
  forEach(fn: (c: Xenomimic) => void): void {
    for (const p of this.pairs) {
      if (p.mimic.alive) fn(p.mimic);
      if (p.anti.alive) fn(p.anti);
    }
  }

  telemetry(): XenomimicTelemetry {
    const speciesCounts = Array.from({ length: XENOMIMIC_SPECIES }, () => 0);
    let energySum = 0;
    let n = 0;
    let coherenceSum = 0;
    let tensionSum = 0;
    let beated = 0;
    for (const p of this.pairs) {
      if (p.beat) {
        coherenceSum += p.beat.coherence;
        tensionSum += p.beat.bondTension;
        beated++;
      }
      for (const c of [p.mimic, p.anti]) {
        if (!c.alive) continue;
        speciesCounts[c.species] = (speciesCounts[c.species] ?? 0) + 1;
        energySum += c.energy;
        n++;
      }
    }
    let dominant = 0;
    for (let s = 1; s < XENOMIMIC_SPECIES; s++) {
      if ((speciesCounts[s] ?? 0) > (speciesCounts[dominant] ?? 0)) dominant = s;
    }
    return {
      population: n,
      pairs: this.pairs.length,
      births: this.births,
      deaths: this.deaths,
      eaten: this.eatenCount,
      teleports: this.teleports,
      meanEnergy: n > 0 ? energySum / n : 0,
      coherence: beated > 0 ? coherenceSum / beated : 0,
      bondTension: beated > 0 ? tensionSum / beated : 0,
      speciesCounts,
      dominantSpecies: dominant,
      growthTarget: this.growthTarget(),
    };
  }
}

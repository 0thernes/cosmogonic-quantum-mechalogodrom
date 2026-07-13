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
 *  - Graze flora through an injected mutation callback; the legacy read-only food signal remains a fallback.
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
import { measureRngProvenance, type RngProvenance } from '../core/rng-provenance';
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
  /**
   * Weighted-ragdoll fulcrum lean — the body is a damped pendulum balanced on its ground-contact point.
   * `leanX`/`leanZ` are pitch/roll angles (rad) with angular velocities `leanVX`/`leanVZ`; turning hard
   * and landing hops push it, a spring restores upright. Gives the movement organic weight.
   */
  leanX: number;
  leanZ: number;
  leanVX: number;
  leanVZ: number;
}

interface Pair {
  readonly id: number;
  readonly species: number;
  readonly brain: XenomimicBrain;
  readonly mimic: Xenomimic;
  readonly anti: Xenomimic;
  beat: XenomimicBeat | null;
  beatClock: number;
  /** Bit 0 = mimic has entered the world; bit 1 = anti has entered the world. */
  introducedMask: number;
}

/** Injected world-surface sampler. Non-finite results fall back to the canonical xeno wave. */
export type XenomimicSurfaceAt = (x: number, z: number, time: number) => number;

/**
 * Real flora-consumption boundary. `appetite` and `dt` are bounded requests; the return value is the
 * amount of food actually removed and made available to the creature.
 */
export type XenomimicGrazeAt = (x: number, z: number, appetite: number, dt: number) => number;

export type XenomimicLifecycleKind = 'none' | 'birth' | 'death' | 'eaten' | 'respawn' | 'teleport';

/** Ephemeral, allocation-free lifecycle view. A sink must copy fields it needs to retain. */
export interface XenomimicLifecycleEvent {
  sequence: number;
  kind: XenomimicLifecycleKind;
  time: number;
  pairId: number;
  role: 0 | 1;
  species: number;
  x: number;
  y: number;
  z: number;
  energy: number;
}

export type XenomimicLifecycleSink = (event: Readonly<XenomimicLifecycleEvent>) => void;

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
  /** Maximum due revivals materialized by one step (prevents a respawn burst). */
  respawnBudget?: number;
  /** Allocation-free lifecycle observer; every call receives the same reused event object. */
  lifecycleSink?: XenomimicLifecycleSink;
}

export interface XenomimicCouplings {
  /** Read-only food signal retained for brain sensing and backwards compatibility. */
  foodAt?: (x: number, z: number) => number;
  /** Real flora mutation boundary; preferred over the legacy read-only food gain when supplied. */
  grazeAt?: XenomimicGrazeAt;
  /** Real terrain/surface height under each body. */
  surfaceAt?: XenomimicSurfaceAt;
  intelligence?: OrganismIntelligenceSignal | null;
  /** Mean nearby Entity neural activation, supplied by the canonical Xenomimic connectome sample. */
  entityActivation?: number;
  chaos?: number;
  temperature?: number;
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
  /** Mean IIT-style integration (twin mutual information) across pairs in [0,1]. */
  integration: number;
  /** Mean Free-Energy-Principle surprise across pairs in [0,1] — how much the swarm's world is
   * violating its learned predictions (arousal). Falls as the population learns a stable environment. */
  freeEnergy: number;
  /** Mean live Schrödinger positional spread across beating pairs in [0,1] — the exploration cue's live
   * value (0 when the substrate is ablated). Observability for GATE-XENO-SCHRODINGER's substrate. */
  quantumSpread: number;
  /** Measured statistical quality in [0,1] of the seeded `mulberry32` generator underpinning this
   * population's determinism, from the real rng-stats battery ({@link measureRngProvenance}). A provenance
   * RECEIPT for reproducibility — measured, not assumed (Dr. Manhattan). Constant for a given seed. */
  rngQuality: number;
  speciesCounts: readonly number[];
  dominantSpecies: number;
  growthTarget: number;
}

const clamp01 = (v: number): number => (!Number.isFinite(v) || v <= 0 ? 0 : v >= 1 ? 1 : v);
const TWO_PI = Math.PI * 2;
/** Clamp a fulcrum-lean angle to a bounded, finite tilt (rad). */
const clampLean = (v: number): number =>
  !Number.isFinite(v) ? 0 : v < -0.7 ? -0.7 : v > 0.7 ? 0.7 : v;

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
  private readonly respawnBudget: number;
  private readonly lifecycleSink: XenomimicLifecycleSink | undefined;
  /** MEASURED provenance receipt for this population's own seeded generator (see {@link rngProvenanceReceipt}). */
  private readonly rngProvenance: RngProvenance;

  /** Introduced bodies only. The array and body identities remain stable for renderer/UI/connectome. */
  private readonly bodyState: Xenomimic[] = [];
  private readonly dueRespawns: Xenomimic[] = [];
  private readonly queuedRespawns = new Set<Xenomimic>();
  private dueRespawnHead = 0;
  private readonly lifecycleState: XenomimicLifecycleEvent = {
    sequence: 0,
    kind: 'none',
    time: 0,
    pairId: -1,
    role: 0,
    species: 0,
    x: 0,
    y: 0,
    z: 0,
    energy: 0,
  };
  private readonly telemetryState: XenomimicTelemetry & { speciesCounts: number[] } = {
    population: 0,
    pairs: 0,
    births: 0,
    deaths: 0,
    eaten: 0,
    teleports: 0,
    meanEnergy: 0,
    coherence: 0,
    bondTension: 0,
    integration: 0,
    freeEnergy: 0,
    quantumSpread: 0,
    rngQuality: 0,
    speciesCounts: Array.from({ length: XENOMIMIC_SPECIES }, () => 0),
    dominantSpecies: 0,
    growthTarget: 2,
  };

  // Cumulative counters (telemetry).
  private births = 0;
  private deaths = 0;
  private eatenCount = 0;
  private teleports = 0;

  constructor(seed: number, options: XenomimicOptions = {}) {
    const rngSeed = (hashSeed('xenomimic-population') ^ (seed >>> 0)) >>> 0 || 1;
    this.rng = mulberry32(rngSeed);
    // Provenance receipt: MEASURE (don't assume) the quality of the exact generator this population runs on,
    // from a dedicated sample so it never perturbs the live stream. Deterministic; constant for a given seed.
    this.rngProvenance = measureRngProvenance(rngSeed);
    this.arenaRadius = options.arenaRadius ?? 180;
    this.lifetime = options.lifetime ?? 150;
    this.respawnDelay = options.respawnDelay ?? 120;
    this.predationRespawn = options.predationRespawn ?? 5;
    this.growthRamp = options.growthRamp ?? 200;
    this.beatInterval = options.beatInterval ?? 0.2;
    const requestedRespawnBudget = options.respawnBudget ?? 16;
    this.respawnBudget = Number.isFinite(requestedRespawnBudget)
      ? Math.max(1, Math.min(XENOMIMIC_MAX, Math.floor(requestedRespawnBudget)))
      : 16;
    this.lifecycleSink = options.lifecycleSink;
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

  /**
   * Introduce exactly ONE live body at a world point — the "XNO" one-by-one spawn button. Consecutive
   * calls fill the two halves of one pair, so the bodies still share one entangled brain without a
   * button press silently doubling the requested population.
   */
  spawnAt(x: number, z: number): number {
    if (!Number.isFinite(x) || !Number.isFinite(z) || this.bodyState.length >= XENOMIMIC_MAX)
      return 0;
    for (const pair of this.pairs) {
      if ((pair.introducedMask & 1) === 0) {
        this.introduce(pair, pair.mimic, 1, x, z);
        return 1;
      }
      if ((pair.introducedMask & 2) === 0) {
        this.introduce(pair, pair.anti, 2, x, z);
        return 1;
      }
    }
    const pair = this.spawnPair(this.rng() * XENOMIMIC_SPECIES, x, z, 1);
    return pair ? 1 : 0;
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
      leanX: 0,
      leanZ: 0,
      leanVX: 0,
      leanVZ: 0,
    };
  }

  private spawnPair(
    speciesFloat: number,
    cx: number,
    cz: number,
    introducedBodies: 1 | 2 = 2,
  ): Pair | null {
    if (this.pairs.length >= XENOMIMIC_MAX / 2) return null;
    const id = this.nextPairId++;
    const species = Math.min(XENOMIMIC_SPECIES - 1, Math.max(0, Math.floor(speciesFloat)));
    const brain = new XenomimicBrain((id * 0x9e3779b1) ^ hashSeed(`xeno-pair-${species}`), species);
    // Twins are born adjacent — a bonded pair sharing one point in the world.
    const a = this.rng() * TWO_PI;
    const r = 2 + this.rng() * 3;
    const mimic = this.makeCreature(id, 0, species, cx + Math.cos(a) * r, cz + Math.sin(a) * r);
    const anti = this.makeCreature(id, 1, species, cx - Math.cos(a) * r, cz - Math.sin(a) * r);
    mimic.alive = false;
    anti.alive = false;
    mimic.respawnAt = Number.POSITIVE_INFINITY;
    anti.respawnAt = Number.POSITIVE_INFINITY;
    const pair: Pair = {
      id,
      species,
      brain,
      mimic,
      anti,
      beat: null,
      beatClock: -1,
      introducedMask: 0,
    };
    this.pairs.push(pair);
    if (introducedBodies === 1) {
      this.introduce(pair, mimic, 1, cx, cz);
    } else {
      this.introduce(pair, mimic, 1);
      this.introduce(pair, anti, 2);
    }
    return pair;
  }

  /** Materialize one previously-unintroduced half without constructing a second brain. */
  private introduce(pair: Pair, creature: Xenomimic, mask: 1 | 2, x?: number, z?: number): void {
    if ((pair.introducedMask & mask) !== 0) return;
    if (x !== undefined && z !== undefined) {
      creature.x = x;
      creature.z = z;
      creature.y = xenoGroundHeight(x, z, this.clock) + 1.2;
    }
    creature.alive = true;
    creature.respawnAt = 0;
    pair.introducedMask |= mask;
    this.bodyState.push(creature);
    this.births++;
    this.emitLifecycle('birth', creature);
  }

  private emitLifecycle(kind: XenomimicLifecycleKind, creature: Xenomimic): void {
    const event = this.lifecycleState;
    event.sequence++;
    event.kind = kind;
    event.time = this.clock;
    event.pairId = creature.pairId;
    event.role = creature.role;
    event.species = creature.species;
    event.x = creature.x;
    event.y = creature.y;
    event.z = creature.z;
    event.energy = creature.energy;
    this.lifecycleSink?.(event);
  }

  /**
   * Advance the population by `dt` seconds. Surface, real grazing, legacy food sampling, and shared
   * organism-intelligence are optional couplings; passing none yields a self-contained living
   * population. Draws only from this system's own substream.
   */
  step(dt: number, couplings: XenomimicCouplings = {}): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    this.clock += dt;
    const chaos = clamp01(couplings.chaos ?? 0.3);
    const sharedThreat = couplings.intelligence?.enabled
      ? clamp01(couplings.intelligence.threatResponse)
      : 0.2;
    const entityActivation = clamp01(couplings.entityActivation ?? 0);
    const threat = clamp01(sharedThreat * 0.78 + entityActivation * 0.22);
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
        this.integrate(
          pair.mimic,
          beat.mimic,
          dt,
          couplings.foodAt,
          couplings.grazeAt,
          couplings.surfaceAt,
        );
        this.integrate(
          pair.anti,
          beat.anti,
          dt,
          couplings.foodAt,
          couplings.grazeAt,
          couplings.surfaceAt,
        );
      }
      this.lifecycle(pair.mimic, dt);
      this.lifecycle(pair.anti, dt);
    }

    this.drainDueRespawns(this.respawnBudget, couplings.surfaceAt);

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
    grazeAt: XenomimicGrazeAt | undefined,
    surfaceAt: XenomimicSurfaceAt | undefined,
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

    // Weighted-ragdoll FULCRUM: the body is a damped pendulum on its ground-contact point. Turning hard
    // at speed rolls it (centripetal lean); a hop pitches it; a spring (K) restores upright, damped
    // (DAMP). Semi-implicit (symplectic) Euler keeps the underdamped oscillator bounded over long runs.
    const K = 42;
    const DAMP = 7.5;
    const normSpeed = speed / gaitFast; // [0, thought.speed]
    const lateral = thought.turn * normSpeed * 6; // centripetal roll drive
    c.leanVZ += (-K * c.leanZ - DAMP * c.leanVZ + lateral) * dt;
    c.leanZ = clampLean(c.leanZ + c.leanVZ * dt);
    const pitchTarget = -normSpeed * 0.14 - c.hopV * 0.015;
    c.leanVX += (-K * (c.leanX - pitchTarget) - DAMP * c.leanVX) * dt;
    c.leanX = clampLean(c.leanX + c.leanVX * dt);

    // Teleport: a Born-rule collapse relocates a still-superposed creature a short distance instantly.
    c.teleportCd = Math.max(0, c.teleportCd - dt);
    if (thought.teleport && c.teleportCd <= 0) {
      const a = this.rng() * TWO_PI;
      const jump = 10 + this.rng() * 25;
      c.x += Math.cos(a) * jump;
      c.z += Math.sin(a) * jump;
      c.teleportCd = 2.5;
      this.teleports++;
      this.emitLifecycle('teleport', c);
    }

    // Keep them inside the arena and glued to the ground wave.
    const rr = Math.sqrt(c.x * c.x + c.z * c.z);
    if (rr > this.arenaRadius) {
      const s = this.arenaRadius / rr;
      c.x *= s;
      c.z *= s;
      c.heading += Math.PI; // turn back inward
    }
    c.y = this.surfaceHeight(c.x, c.z, surfaceAt) + c.hopY + 1.2;
    c.shimmer = thought.shimmer;

    // Eat through the real flora mutation boundary when present. Legacy read-only food sampling stays
    // as a compatibility fallback for deterministic fixtures and detached/headless operation.
    if (grazeAt) {
      const appetite = clamp01(0.35 + thought.eat * 0.65);
      const consumed = clamp01(grazeAt(c.x, c.z, appetite, dt));
      c.energy = clamp01(c.energy + consumed);
    } else if (foodAt) {
      const food = clamp01(foodAt(c.x, c.z));
      const graze = (0.35 + thought.eat * 0.65) * food;
      c.energy = clamp01(c.energy + graze * dt * 0.5);
    }
  }

  private surfaceHeight(x: number, z: number, surfaceAt?: XenomimicSurfaceAt): number {
    const injected = surfaceAt?.(x, z, this.clock);
    return injected !== undefined && Number.isFinite(injected)
      ? injected
      : xenoGroundHeight(x, z, this.clock);
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
        this.emitLifecycle('death', c);
      }
    } else if (
      Number.isFinite(c.respawnAt) &&
      this.clock >= c.respawnAt &&
      !this.queuedRespawns.has(c)
    ) {
      this.queuedRespawns.add(c);
      this.dueRespawns.push(c);
    }
  }

  /**
   * Materialize at most the configured number of due revivals. The explicit `limit` can lower the
   * work for a caller, never raise it above the constructor's hard budget.
   */
  drainDueRespawns(limit = this.respawnBudget, surfaceAt?: XenomimicSurfaceAt): number {
    const bounded = Number.isFinite(limit)
      ? Math.max(0, Math.min(this.respawnBudget, Math.floor(limit)))
      : 0;
    let revived = 0;
    while (revived < bounded && this.dueRespawnHead < this.dueRespawns.length) {
      const creature = this.dueRespawns[this.dueRespawnHead++]!;
      this.queuedRespawns.delete(creature);
      if (!creature.alive && this.clock >= creature.respawnAt) {
        this.revive(creature, surfaceAt);
        revived++;
      }
    }
    if (this.dueRespawnHead === this.dueRespawns.length) {
      this.dueRespawns.length = 0;
      this.dueRespawnHead = 0;
    }
    return revived;
  }

  /** Bring a downed creature back near its arena, fresh. Balances the population. */
  private revive(c: Xenomimic, surfaceAt?: XenomimicSurfaceAt): void {
    const a = this.rng() * TWO_PI;
    const r = this.rng() * this.arenaRadius * 0.8;
    c.x = Math.cos(a) * r;
    c.z = Math.sin(a) * r;
    c.y = this.surfaceHeight(c.x, c.z, surfaceAt) + 1.2;
    c.vx = 0;
    c.vz = 0;
    c.hopY = 0;
    c.hopV = 0;
    c.leanX = 0;
    c.leanZ = 0;
    c.leanVX = 0;
    c.leanVZ = 0;
    c.energy = 0.5 + this.rng() * 0.3;
    c.age = 0;
    c.alive = true;
    c.respawnAt = 0;
    this.emitLifecycle('respawn', c);
  }

  /**
   * Mark a creature EATEN by another being. It goes down and respawns in {@link predationRespawn}
   * seconds (owner: "consumed by other beings as food and they respawn in 5 seconds"). Returns the
   * energy yielded to the predator, or 0 if the target was already down.
   */
  consume(c: Readonly<Xenomimic>): number {
    const creature = c as Xenomimic;
    if (!creature.alive) return 0;
    const yield_ = 0.3 + creature.energy * 0.5;
    creature.alive = false;
    creature.respawnAt = this.clock + this.predationRespawn;
    this.eatenCount++;
    this.deaths++;
    this.emitLifecycle('eaten', creature);
    return yield_;
  }

  /** Stable nearest-live-body query; ties resolve by permanent body insertion order. */
  nearestBody(
    x: number,
    z: number,
    maxDistance = Number.POSITIVE_INFINITY,
  ): Readonly<Xenomimic> | null {
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(z) ||
      (!(maxDistance > 0) && maxDistance !== Number.POSITIVE_INFINITY)
    ) {
      return null;
    }
    let nearest: Xenomimic | null = null;
    let nearestD2 = maxDistance * maxDistance;
    for (const creature of this.bodyState) {
      if (!creature.alive) continue;
      const dx = creature.x - x;
      const dz = creature.z - z;
      const d2 = dx * dx + dz * dz;
      if (d2 <= nearestD2) {
        if (d2 === nearestD2 && nearest !== null) continue;
        nearest = creature;
        nearestD2 = d2;
      }
    }
    return nearest;
  }

  /** Consume the nearest live body inside `maxDistance`; returns predator energy yield or zero. */
  consumeNearest(x: number, z: number, maxDistance: number): number {
    const nearest = this.nearestBody(x, z, maxDistance);
    return nearest ? this.consume(nearest) : 0;
  }

  /** Iterate every LIVE creature (render + telemetry + external predation queries). */
  forEach(fn: (c: Xenomimic) => void): void {
    for (const p of this.pairs) {
      if (p.mimic.alive) fn(p.mimic);
      if (p.anti.alive) fn(p.anti);
    }
  }

  /** Stable read-only body list. Introductions append in deterministic order; entries are never replaced. */
  bodyView(): readonly Xenomimic[] {
    return this.bodyState;
  }

  /** Last emitted lifecycle event. The object identity is reused for the lifetime of the population. */
  lifecycleEventView(): Readonly<XenomimicLifecycleEvent> {
    return this.lifecycleState;
  }

  /**
   * The MEASURED provenance receipt for this population's seeded generator — a reproducible statement about
   * the `mulberry32` quality underpinning its determinism (Dr. Manhattan: measured, not assumed). The receipt
   * carries its own seed, so a verifier can recompute {@link measureRngProvenance} and confirm fidelity.
   */
  rngProvenanceReceipt(): Readonly<RngProvenance> {
    return this.rngProvenance;
  }

  telemetry(): Readonly<XenomimicTelemetry> {
    const speciesCounts = this.telemetryState.speciesCounts;
    speciesCounts.fill(0);
    let energySum = 0;
    let n = 0;
    let coherenceSum = 0;
    let tensionSum = 0;
    let integrationSum = 0;
    let freeEnergySum = 0;
    let spreadSum = 0;
    let beated = 0;
    for (const p of this.pairs) {
      if (p.beat) {
        coherenceSum += p.beat.coherence;
        tensionSum += p.beat.bondTension;
        integrationSum += p.beat.integration;
        freeEnergySum += p.beat.freeEnergy;
        spreadSum += (p.beat.mimic.quantumSpread + p.beat.anti.quantumSpread) / 2;
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
    const telemetry = this.telemetryState;
    telemetry.population = n;
    telemetry.pairs = this.pairs.length;
    telemetry.births = this.births;
    telemetry.deaths = this.deaths;
    telemetry.eaten = this.eatenCount;
    telemetry.teleports = this.teleports;
    telemetry.meanEnergy = n > 0 ? energySum / n : 0;
    telemetry.coherence = beated > 0 ? coherenceSum / beated : 0;
    telemetry.bondTension = beated > 0 ? tensionSum / beated : 0;
    telemetry.integration = beated > 0 ? integrationSum / beated : 0;
    telemetry.freeEnergy = beated > 0 ? freeEnergySum / beated : 0;
    telemetry.quantumSpread = beated > 0 ? spreadSum / beated : 0;
    telemetry.rngQuality = this.rngProvenance.quality;
    telemetry.dominantSpecies = dominant;
    telemetry.growthTarget = this.growthTarget();
    return telemetry;
  }

  /** Stable telemetry alias for consumers that want the borrowing contract stated at the call site. */
  telemetryView(): Readonly<XenomimicTelemetry> {
    return this.telemetry();
  }
}

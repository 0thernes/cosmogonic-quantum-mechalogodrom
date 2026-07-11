/**
 * Pure, deterministic production effects for NHI target actions.
 *
 * This leaf owns no world/entity/Three.js state. It sanitizes a read-only snapshot and returns the
 * exact patch the composition root may apply. No RNG, clock, allocation-sized scan, or hidden global
 * state participates, so HUNT/MIMIC are directly unit-testable and replayable.
 */

export interface NhiEffectVector {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface NhiEffectBody {
  readonly position: NhiEffectVector;
  readonly velocity: NhiEffectVector;
  readonly energy: number;
  readonly strategy: number;
  readonly setGroup: number;
  readonly phylum: number;
  /** Missing means live, matching lightweight entity mocks. */
  readonly alive?: boolean;
}

/** Minimal structural surface used by the world's executable nearest-target selection. */
export interface NhiTargetCandidate {
  readonly position: NhiEffectVector;
  readonly userData: {
    readonly isNhi?: boolean;
    /** Missing means live, matching lightweight entity mocks and legacy entities. */
    readonly alive?: boolean;
  };
}

/** Minimal ordinary-organism identity surface used by targeted MANIPULATE. */
export interface NhiManipulationCandidate {
  readonly setGroup: number;
  readonly isNhi?: boolean;
  /** Missing means live, matching lightweight entity mocks and legacy entities. */
  readonly alive?: boolean;
}

export interface NhiTargetSelection<T extends NhiTargetCandidate> {
  readonly target: T | null;
  readonly distanceSquared: number;
}

export interface NhiHuntEffect {
  readonly applied: boolean;
  readonly captured: boolean;
  readonly distance: number | null;
  readonly energyTransferred: number;
  readonly selfEnergy: number;
  readonly targetEnergy: number;
  readonly selfVelocity: NhiEffectVector;
}

export interface NhiMimicEffect {
  readonly applied: boolean;
  readonly selfVelocity: NhiEffectVector;
  readonly strategy: 0 | 1;
  readonly setGroup: number;
  readonly phylum: number;
}

export const NHI_ENERGY_CAP = 100;
export const NHI_HUNT_CAPTURE_RADIUS = 5;
export const NHI_HUNT_MAX_TRANSFER = 8;
export const NHI_EFFECT_MAX_SPEED = 12;
const NHI_HUNT_STEER = 0.18;
const NHI_MIMIC_MAX_BLEND = 0.65;
const POSITION_LIMIT = 1_000_000;

/**
 * Whether an organism is a live ordinary member of the exact rival faction named by an NHI intent.
 * Invalid/unknown factions cannot accidentally satisfy a deception outcome.
 */
export function isNhiManipulationTarget(
  candidate: NhiManipulationCandidate,
  intendedFaction: number,
): boolean {
  return (
    Number.isSafeInteger(intendedFaction) &&
    intendedFaction >= 0 &&
    intendedFaction <= 1_000_000 &&
    candidate.alive !== false &&
    candidate.isNhi !== true &&
    candidate.setGroup === intendedFaction
  );
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Clamp finite and infinite numbers; treat NaN/other invalid values as the explicit fallback. */
function bounded(v: number, lo: number, hi: number, fallback = 0): number {
  if (Number.isNaN(v)) return fallback;
  if (v === Number.POSITIVE_INFINITY) return hi;
  if (v === Number.NEGATIVE_INFINITY) return lo;
  return Number.isFinite(v) ? clamp(v, lo, hi) : fallback;
}

function unit(v: number): number {
  return bounded(v, 0, 1);
}

function energy(v: number): number {
  return bounded(v, 0, NHI_ENERGY_CAP);
}

function position(v: NhiEffectVector): NhiEffectVector {
  return {
    x: bounded(v.x, -POSITION_LIMIT, POSITION_LIMIT),
    y: bounded(v.y, -POSITION_LIMIT, POSITION_LIMIT),
    z: bounded(v.z, -POSITION_LIMIT, POSITION_LIMIT),
  };
}

function velocity(v: NhiEffectVector): NhiEffectVector {
  let x = bounded(v.x, -NHI_EFFECT_MAX_SPEED, NHI_EFFECT_MAX_SPEED);
  let y = bounded(v.y, -NHI_EFFECT_MAX_SPEED, NHI_EFFECT_MAX_SPEED);
  let z = bounded(v.z, -NHI_EFFECT_MAX_SPEED, NHI_EFFECT_MAX_SPEED);
  const speed = Math.hypot(x, y, z);
  if (speed > NHI_EFFECT_MAX_SPEED) {
    const scale = NHI_EFFECT_MAX_SPEED / speed;
    x *= scale;
    y *= scale;
    z *= scale;
  }
  return { x, y, z };
}

function strategy(v: number): 0 | 1 {
  return bounded(v, 0, 1) >= 0.5 ? 1 : 0;
}

function integer(v: number, lo: number, hi: number, fallback: number): number {
  return Math.trunc(bounded(v, lo, hi, fallback));
}

/**
 * Select the exact nearest live ordinary candidate from an already-bounded candidate set. Ties retain
 * the previous target when it is still eligible, preventing identity flicker without depending on
 * iteration order. Invalid coordinates are ineligible rather than being coerced into a false nearest
 * neighbor. The returned squared distance lets the world decide whether its spatial-grid result is
 * globally exact or requires the existing rare full-scan fallback.
 */
export function selectNearestNhiTarget<T extends NhiTargetCandidate>(
  self: T,
  candidates: readonly (T | null | undefined)[],
  previous: T | null = null,
): NhiTargetSelection<T> {
  const origin = self.position;
  if (!Number.isFinite(origin.x) || !Number.isFinite(origin.y) || !Number.isFinite(origin.z)) {
    return { target: null, distanceSquared: Number.POSITIVE_INFINITY };
  }

  let target: T | null = null;
  let distanceSquared = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    if (
      !candidate ||
      candidate === self ||
      candidate.userData.isNhi === true ||
      candidate.userData.alive === false
    ) {
      continue;
    }
    const position = candidate.position;
    if (
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.y) ||
      !Number.isFinite(position.z)
    ) {
      continue;
    }
    const dx = origin.x - position.x;
    const dy = origin.y - position.y;
    const dz = origin.z - position.z;
    const nextDistanceSquared = dx * dx + dy * dy + dz * dz;
    if (
      nextDistanceSquared < distanceSquared ||
      (nextDistanceSquared === distanceSquared && candidate === previous)
    ) {
      target = candidate;
      distanceSquared = nextDistanceSquared;
    }
  }
  return { target, distanceSquared };
}

/**
 * Resolve a HUNT against the already-selected exact nearest ordinary target.
 *
 * A valid target always produces bounded steering. Energy moves only inside the fixed capture radius,
 * and the transfer is limited by magnitude, target balance, and the hunter's remaining capacity; the
 * two balances therefore cannot gain energy. Zero distance is a valid capture with no steering vector.
 */
export function resolveNhiHuntEffect(
  self: NhiEffectBody,
  target: NhiEffectBody | null,
  magnitude: number,
): NhiHuntEffect {
  const selfEnergy = energy(self.energy);
  const selfVelocity = velocity(self.velocity);
  const targetEnergy = target ? energy(target.energy) : 0;
  const gain = unit(magnitude);
  if (!target || target.alive === false || gain <= 0) {
    return {
      applied: false,
      captured: false,
      distance: null,
      energyTransferred: 0,
      selfEnergy,
      targetEnergy,
      selfVelocity,
    };
  }

  const from = position(self.position);
  const to = position(target.position);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const distance = Math.hypot(dx, dy, dz);
  let vx = selfVelocity.x;
  let vy = selfVelocity.y;
  let vz = selfVelocity.z;
  if (distance > Number.EPSILON) {
    const steer = (NHI_HUNT_STEER * gain) / distance;
    vx += dx * steer;
    vy += dy * steer;
    vz += dz * steer;
  }
  const steered = velocity({ x: vx, y: vy, z: vz });
  const captured = distance <= NHI_HUNT_CAPTURE_RADIUS;
  const energyTransferred = captured
    ? Math.min(NHI_HUNT_MAX_TRANSFER * gain, targetEnergy, NHI_ENERGY_CAP - selfEnergy)
    : 0;

  return {
    applied: true,
    captured,
    distance,
    energyTransferred,
    selfEnergy: selfEnergy + energyTransferred,
    targetEnergy: targetEnergy - energyTransferred,
    selfVelocity: steered,
  };
}

/**
 * Resolve MIMIC as a behavioral-classification and movement write. The target's live
 * strategy/community/phylum metadata is copied, while velocity approaches the target by a bounded
 * magnitude-scaled blend. Morphotype, body, material, appearance, and stable identity are unchanged.
 */
export function resolveNhiMimicEffect(
  self: NhiEffectBody,
  target: NhiEffectBody | null,
  magnitude: number,
): NhiMimicEffect {
  const ownVelocity = velocity(self.velocity);
  const ownStrategy = strategy(self.strategy);
  const ownSetGroup = integer(self.setGroup, -1_000_000, 1_000_000, 0);
  const ownPhylum = integer(self.phylum, -1, 9, -1);
  const gain = unit(magnitude);
  if (!target || target.alive === false || gain <= 0) {
    return {
      applied: false,
      selfVelocity: ownVelocity,
      strategy: ownStrategy,
      setGroup: ownSetGroup,
      phylum: ownPhylum,
    };
  }

  const targetVelocity = velocity(target.velocity);
  const blend = NHI_MIMIC_MAX_BLEND * gain;
  return {
    applied: true,
    selfVelocity: velocity({
      x: ownVelocity.x + (targetVelocity.x - ownVelocity.x) * blend,
      y: ownVelocity.y + (targetVelocity.y - ownVelocity.y) * blend,
      z: ownVelocity.z + (targetVelocity.z - ownVelocity.z) * blend,
    }),
    strategy: strategy(target.strategy),
    setGroup: integer(target.setGroup, -1_000_000, 1_000_000, 0),
    phylum: integer(target.phylum, -1, 9, -1),
  };
}

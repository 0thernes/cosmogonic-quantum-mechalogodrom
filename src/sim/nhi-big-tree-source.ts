/**
 * Narrow launched-NHI bridge into the canonical Big Tree fauna adapter.
 *
 * A launched NHI already has one material `Entity` body and one visual `NhiBodySystem` follower.
 * This registry retains only the material body; it never creates or registers a second body, visit
 * state machine, food resource, or timer. `BigTreeFaunaVisitors` continues to own visit routing and
 * the Crystal ecosystem continues to own the atomic edible transaction.
 */

import {
  BigTreeFaunaIntentMode,
  type BigTreeFaunaIntentMode as NhiTreeIntentMode,
  type BigTreeFaunaSource,
  type BigTreeFaunaVisitorSample,
} from './big-tree-fauna-visitors';

const NO_OWNER = -1;

/** Structural subset of the canonical backing `Entity`; deliberately excludes `NhiBodySystem`. */
export interface NhiBigTreeBody {
  readonly position: { x: number; y: number; z: number };
  readonly userData: {
    energy: number;
    alive?: boolean;
    isNhi?: boolean;
  };
}

/** Real, caller-owned NHI affect/social signals sampled without allocating. */
export interface NhiBigTreeSignals {
  stress: number;
  socialNeed: number;
  curiosity: number;
}

export type NhiBigTreeSignalReader = (ownerId: number, out: NhiBigTreeSignals) => boolean;

/** Caller-owned locomotion view consumed by the World after ordinary integration. */
export interface NhiBigTreeIntentView {
  mode: NhiTreeIntentMode;
  targetX: number;
  targetY: number;
  targetZ: number;
}

/**
 * Fixed-capacity source binding keyed by monotonic NHI mind id.
 *
 * Slots never move while registered, so another NHI's death cannot make an active visit follow the
 * wrong body. Empty slots are cheap: the launched-NHI cap is 1000 and the fauna adapter polls them on
 * its existing staggered cadence.
 */
export class NhiBigTreeSource implements BigTreeFaunaSource {
  private readonly ownerIds: Int32Array;
  private readonly bodies: (NhiBigTreeBody | null)[];
  private readonly intentModes: Uint8Array;
  private readonly targetXs: Float64Array;
  private readonly targetYs: Float64Array;
  private readonly targetZs: Float64Array;
  private readonly slotsByOwner = new Map<number, number>();
  private readonly signals: NhiBigTreeSignals = { stress: 0, socialNeed: 0, curiosity: 0 };

  constructor(
    capacity: number,
    private readonly readSignals: NhiBigTreeSignalReader,
  ) {
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 0x7fff) {
      throw new RangeError('NHI Big Tree capacity must be an integer in [1,32767]');
    }
    this.ownerIds = new Int32Array(capacity);
    this.ownerIds.fill(NO_OWNER);
    this.bodies = Array.from<NhiBigTreeBody | null>({ length: capacity }).fill(null);
    // Zero means no intent. Canonical intent enum values are stored as value + 1.
    this.intentModes = new Uint8Array(capacity);
    this.targetXs = new Float64Array(capacity);
    this.targetYs = new Float64Array(capacity);
    this.targetZs = new Float64Array(capacity);
  }

  get bigTreeVisitorSlotCount(): number {
    return this.ownerIds.length;
  }

  get registeredCount(): number {
    return this.slotsByOwner.size;
  }

  has(ownerId: number): boolean {
    return this.slotsByOwner.has(ownerId);
  }

  /** Register exactly one canonical backing Entity for a successfully launched NHI. */
  register(ownerId: number, body: NhiBigTreeBody): boolean {
    if (
      !Number.isInteger(ownerId) ||
      ownerId < 0 ||
      ownerId > 0x7fffffff ||
      !body ||
      body.userData.isNhi !== true ||
      body.userData.alive === false ||
      this.slotsByOwner.has(ownerId)
    ) {
      return false;
    }
    for (let slot = 0; slot < this.ownerIds.length; slot++) {
      if ((this.ownerIds[slot] ?? NO_OWNER) !== NO_OWNER) continue;
      this.ownerIds[slot] = ownerId;
      this.bodies[slot] = body;
      this.slotsByOwner.set(ownerId, slot);
      return true;
    }
    return false;
  }

  /** Drop the body and locomotion intent; the visit adapter releases food/visit ownership first. */
  unregister(ownerId: number): boolean {
    const slot = this.slotsByOwner.get(ownerId);
    if (slot === undefined) return false;
    this.slotsByOwner.delete(ownerId);
    this.ownerIds[slot] = NO_OWNER;
    this.bodies[slot] = null;
    this.clearSlot(slot);
    return true;
  }

  /** Teardown-only body-reference cleanup after the shared fauna adapter has cancelled its records. */
  reset(): void {
    this.slotsByOwner.clear();
    this.ownerIds.fill(NO_OWNER);
    this.bodies.fill(null);
    this.intentModes.fill(0);
    this.targetXs.fill(0);
    this.targetYs.fill(0);
    this.targetZs.fill(0);
  }

  readBigTreeVisitor(slot: number, out: BigTreeFaunaVisitorSample): boolean {
    if (!Number.isInteger(slot) || slot < 0 || slot >= this.ownerIds.length) return false;
    const ownerId = this.ownerIds[slot] ?? NO_OWNER;
    const body = this.bodies[slot] ?? null;
    if (
      ownerId < 0 ||
      body === null ||
      body.userData.isNhi !== true ||
      body.userData.alive === false
    ) {
      return false;
    }
    const p = body.position;
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) return false;
    const energy = this.unit(body.userData.energy / 100);
    const signals = this.signals;
    signals.stress = 0;
    signals.socialNeed = 0;
    signals.curiosity = 0;
    this.readSignals(ownerId, signals);
    out.ownerId = ownerId;
    out.alive = true;
    out.x = p.x;
    out.y = p.y;
    out.z = p.z;
    out.hunger = 1 - energy;
    // Launched NHIs expose energy but have no canonical fatigue/health state. Do not invent one.
    out.fatigue = 0;
    out.healthDeficit = 0;
    out.stress = this.unit(signals.stress);
    out.socialNeed = this.unit(signals.socialNeed);
    out.curiosity = this.unit(signals.curiosity);
    return true;
  }

  setBigTreeVisitorIntent(
    ownerId: number,
    mode: NhiTreeIntentMode,
    targetX: number,
    targetY: number,
    targetZ: number,
  ): boolean {
    const slot = this.slotsByOwner.get(ownerId);
    if (
      slot === undefined ||
      (mode !== BigTreeFaunaIntentMode.Travel &&
        mode !== BigTreeFaunaIntentMode.Calm &&
        mode !== BigTreeFaunaIntentMode.Social) ||
      !Number.isFinite(targetX) ||
      !Number.isFinite(targetY) ||
      !Number.isFinite(targetZ)
    ) {
      return false;
    }
    this.intentModes[slot] = mode + 1;
    this.targetXs[slot] = targetX;
    this.targetYs[slot] = targetY;
    this.targetZs[slot] = targetZ;
    return true;
  }

  nourishBigTreeVisitor(ownerId: number, nourishment: number): boolean {
    const slot = this.slotsByOwner.get(ownerId);
    const body = slot === undefined ? null : (this.bodies[slot] ?? null);
    if (
      body === null ||
      body.userData.isNhi !== true ||
      body.userData.alive === false ||
      !Number.isFinite(nourishment) ||
      nourishment <= 0
    ) {
      return false;
    }
    // This is the sole NHI nutrition sink. The canonical edible transaction invokes it once only
    // after completeConsumption succeeds, and clamps to the Entity energy contract.
    body.userData.energy = Math.min(
      100,
      Math.max(0, this.finite(body.userData.energy) + nourishment),
    );
    return true;
  }

  clearBigTreeVisitorIntent(ownerId: number): boolean {
    const slot = this.slotsByOwner.get(ownerId);
    if (slot === undefined) return false;
    this.clearSlot(slot);
    return true;
  }

  readIntent(ownerId: number, out: NhiBigTreeIntentView): boolean {
    const slot = this.slotsByOwner.get(ownerId);
    if (slot === undefined) return false;
    const encoded = this.intentModes[slot] ?? 0;
    if (encoded === 0) return false;
    out.mode = (encoded - 1) as NhiTreeIntentMode;
    out.targetX = this.targetXs[slot] ?? 0;
    out.targetY = this.targetYs[slot] ?? 0;
    out.targetZ = this.targetZs[slot] ?? 0;
    return true;
  }

  hasIntent(ownerId: number): boolean {
    const slot = this.slotsByOwner.get(ownerId);
    return slot !== undefined && (this.intentModes[slot] ?? 0) !== 0;
  }

  private clearSlot(slot: number): void {
    this.intentModes[slot] = 0;
    this.targetXs[slot] = 0;
    this.targetYs[slot] = 0;
    this.targetZs[slot] = 0;
  }

  private finite(value: number): number {
    return Number.isFinite(value) ? value : 0;
  }

  private unit(value: number): number {
    if (!Number.isFinite(value) || value <= 0) return 0;
    return value >= 1 ? 1 : value;
  }
}

/**
 * Apply the canonical visit locomotion after ambient entity integration.
 * Travel is a smooth final seek; Calm/Social settle the body without teleporting or snapping.
 */
export function applyNhiBigTreeIntent(
  intent: Readonly<NhiBigTreeIntentView>,
  position: Readonly<{ x: number; y: number; z: number }>,
  velocity: { x: number; y: number; z: number },
): void {
  if (
    intent.mode === BigTreeFaunaIntentMode.Calm ||
    intent.mode === BigTreeFaunaIntentMode.Social
  ) {
    velocity.x *= 0.72;
    velocity.y *= 0.72;
    velocity.z *= 0.72;
    return;
  }
  if (intent.mode !== BigTreeFaunaIntentMode.Travel) return;
  const dx = intent.targetX - position.x;
  const dy = intent.targetY - position.y;
  const dz = intent.targetZ - position.z;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (!(distance > 1e-6) || !Number.isFinite(distance)) {
    velocity.x *= 0.72;
    velocity.y *= 0.72;
    velocity.z *= 0.72;
    return;
  }
  const speed = 8;
  const blend = 0.28;
  velocity.x += ((dx / distance) * speed - velocity.x) * blend;
  velocity.y += ((dy / distance) * speed - velocity.y) * blend;
  velocity.z += ((dz / distance) * speed - velocity.z) * blend;
}

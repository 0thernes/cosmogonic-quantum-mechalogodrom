/**
 * Allocation-free bridge from independently owned fauna systems into the canonical Big Tree
 * visitor, sanctuary, and edible-resource architecture.
 *
 * A source retains ownership of position, velocity, nutrition, animation, and lifecycle state.
 * The visitor coordinator borrows one caller-owned scratch record, applies a bounded visit intent,
 * then commits only the mutable lanes through {@link writeBigTreeActor}. Stable numeric identities
 * prevent stale scratch state from being written into a different body after lifecycle changes.
 */

export const BIG_TREE_OWNER_SHOGGOTH = 3;
export const BIG_TREE_OWNER_TITAN = 4;
export const BIG_TREE_OWNER_LEVIATHAN = 5;
export const BIG_TREE_OWNER_PUPPET = 6;
export const BIG_TREE_OWNER_APEX = 7;

export type BigTreeFaunaOwnerKind =
  | typeof BIG_TREE_OWNER_SHOGGOTH
  | typeof BIG_TREE_OWNER_TITAN
  | typeof BIG_TREE_OWNER_LEVIATHAN
  | typeof BIG_TREE_OWNER_PUPPET
  | typeof BIG_TREE_OWNER_APEX;

export type BigTreeFaunaCategory = 'shoggoth' | 'titan' | 'leviathan' | 'puppet' | 'apex';
export type BigTreeFaunaLocomotion = 'ground' | 'flight';

/** Legacy fauna velocity is integrated by `dt * 60 * 0.14`; adapters expose world-units/second. */
export const BIG_TREE_FAUNA_VELOCITY_SCALE = 60 * 0.14;

/** Caller-owned mutable projection of one canonical fauna body. */
export interface BigTreeFaunaActor {
  ownerId: number;
  category: BigTreeFaunaCategory;
  locomotion: BigTreeFaunaLocomotion;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Species-native energy value and its corresponding positive maximum. */
  energy: number;
  maxEnergy: number;
  alive: boolean;
  /** Optional normalized need/situation lanes. Missing lanes remain honest zeroes. */
  fatigue?: number;
  socialDrive?: number;
  health?: number;
  maxHealth?: number;
  danger?: number;
  criticalNeed?: boolean;
  /** World-units/second target speed while the shared visitor controller owns locomotion. */
  moveSpeed?: number;
  /** READ-SIDE projection only: production sources report suppression here but do not persist a
   *  write-back — suppression is owned by `setBigTreeActorControlled` (the `bigTreeControlled`
   *  flag each kill vector checks). Relationship and faction state are never overwritten. */
  aggressionSuppressed?: boolean;
}

export interface BigTreeFaunaSource {
  /** Fixed or currently addressable population size. No snapshot array is allocated. */
  readonly bigTreeActorCount: number;

  /** Copy actor `index` into caller-owned scratch storage. */
  readBigTreeActor(index: number, out: BigTreeFaunaActor): boolean;

  /** Commit controller-owned velocity and energy lanes. Aggression suppression is NOT part of the
   *  write path — it rides `setBigTreeActorControlled` exclusively. */
  writeBigTreeActor(index: number, actor: Readonly<BigTreeFaunaActor>): boolean;

  /** Apply one normalized, exactly-once edible grant through the species' canonical energy state. */
  nourishBigTreeActor(index: number, normalizedNutrition: number): boolean;

  /** Yield or restore autonomous steering without teleporting or resetting animation state. */
  setBigTreeActorControlled(index: number, controlled: boolean): boolean;
}

/** Compatibility names kept local to the fauna bridge while the source systems migrate. */
export type BigTreeActorAdapter = BigTreeFaunaActor;
export type BigTreeActorSource = BigTreeFaunaSource;

export interface BigTreeFaunaSourceBinding {
  readonly ownerKind: BigTreeFaunaOwnerKind;
  readonly category: BigTreeFaunaCategory;
  readonly source: BigTreeFaunaSource;
}

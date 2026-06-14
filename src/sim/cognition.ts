/**
 * CREATURE COGNITION (CONTRACTS V24) — the pure decision kernel that turns a creature's PERCEPTION +
 * MEMORY into drives, so the 100 Shoggoths (and beyond) genuinely perceive, remember, flee, and hunt
 * rather than acting on a blind timer. Kept pure + DOM-free so it is unit-tested in isolation and the
 * sim layer (shoggoths.ts) just feeds it a percept and applies the drives. Real bounded math; no rng.
 */
import { clamp } from '../math/scalar';

/** What a creature senses + remembers this beat (all normalized to roughly 0..1, except boldness). */
export interface CreaturePercept {
  /** Local danger 0..1 — crowding by rivals + an active singularity's pull. */
  threat: number;
  /** Local prey/food density 0..1 — exploitable neighbors within reach. */
  prey: number;
  /** Memory of recent feeding success 0 (starving) .. 1 (gorged) — an EMA the caller maintains. */
  satiation: number;
  /** Economic boldness (wealth / peer mean), ~0.3..3 — the rich are emboldened, the broke timid. */
  boldness: number;
  /** Presence/closeness of a dealable neighbour 0 (alone) .. 1 (right alongside). Optional: when
   *  omitted (0) the social-economic drives (trade/ally) stay silent, so legacy callers are unchanged. */
  partner?: number;
  /** How wealth-comparable that neighbour is, 0 (a different stratum) .. 1 (a peer of equal means).
   *  Drives the trade-vs-ally split: you BARGAIN with the unlike, you ALLY with your equals. */
  peer?: number;
}

/** The drives the kernel emits; the caller maps them onto motion, feeding cadence, and display. */
export interface CreatureDrive {
  /** Urge to flee the threat 0..1 — scales an away-from-danger impulse + suppresses feeding. */
  flee: number;
  /** Urge to hunt 0..2 — scales feeding readiness (shorter effective interval, stronger tendrils). */
  hunt: number;
  /** Agitation 0..1 — restless eye-flicker + spin; rises with threat and hunger. */
  agitation: number;
  /** Urge to DECEIVE 0..1 — feign weakness when outmatched (dim glow, shrink, lay low) so a dominant
   *  rival overlooks you. High when threatened AND weak (low boldness); the dominant never bother. */
  deceive: number;
  /** Urge to BARGAIN/TRADE 0..1 — strike a deal with a nearby UNLIKE creature (different wealth →
   *  gains from exchange). Bargaining power scales with boldness, so the rich extract surplus from the
   *  poor: applying it transfers worth toward the wealthier party, WIDENING the spread. Safe-state only
   *  (danger kills the deal). 0 when no partner is sensed. */
  trade: number;
  /** Urge to ALLY 0..1 — form a coalition with a nearby PEER (comparable wealth) under THREAT. Allies
   *  pool risk: applying it transfers worth from the richer ally to the poorer, NARROWING the spread
   *  (solidarity / mutual insurance). The weaker need it slightly more. 0 when no peer is sensed. */
  ally: number;
}

/**
 * Map a {@link CreaturePercept} to {@link CreatureDrive}. The creature FLEES when threatened and
 * neither emboldened (wealth) nor sated; HUNTS when prey-rich, safe, hungry, and bold; and grows
 * AGITATED with danger + hunger. Monotone + bounded by construction — unit-tested at the corners.
 * O(1), allocation-free (returns a fresh small record; callers on a hot path may reuse via the
 * in-place variant below).
 */
export function creatureDrive(p: CreaturePercept): CreatureDrive {
  const t = clamp(p.threat, 0, 1);
  const pr = clamp(p.prey, 0, 1);
  const sat = clamp(p.satiation, 0, 1);
  const b = clamp(p.boldness, 0.3, 3);
  // Flee: danger, discounted by the courage wealth + a full belly buy.
  const flee = clamp(t * (1.3 - 0.45 * b) - 0.35 * sat, 0, 1);
  // Hunt: prey × boldness, killed off by danger and satiation.
  const hunt = clamp(pr * b * (1 - 0.6 * t) * (1.25 - sat), 0, 2);
  // Agitation: restless when in danger or starving.
  const agitation = clamp(0.25 + 0.7 * t + 0.35 * (1 - sat), 0, 1);
  // Deceive: feign weakness when in danger AND outmatched — the dominant (bold/rich) never bother.
  const deceive = clamp(t * (1.25 - 0.55 * b) - 0.2, 0, 1);
  // Social-economic drives — only fire when a partner is actually sensed (default 0 ⇒ silent).
  const partner = clamp(p.partner ?? 0, 0, 1);
  const peer = clamp(p.peer ?? 0, 0, 1);
  // Trade: deal with the UNLIKE (low peer), in safety, with leverage from boldness. The bargainer's
  // power ∝ wealth, so a bold creature drives a harder bargain (caller moves worth toward the richer).
  const trade = clamp(partner * (1 - peer) * b * (1 - 0.7 * t), 0, 1);
  // Ally: coalition with a PEER (high peer) under THREAT — the less bold lean on it a touch harder.
  const ally = clamp(partner * peer * t * (1.1 - 0.3 * b), 0, 1);
  return { flee, hunt, agitation, deceive, trade, ally };
}

/**
 * The production Socialize/Observe activity bridge: peaceful tree interactions must transfer REAL
 * state into each species' canonical lanes (ordinary: neural activation + payoff ledger; xenomimic:
 * shimmer animation), exactly once per invocation, clamped, and only with a live partner where the
 * spec requires one. world.ts delegates its BigTreeVisitorActivityCallbacks to this exact function
 * (sealed below), so these assertions cover the shipped runtime path — not a synthetic stand-in.
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { BigTreeActivity } from '../src/sim/big-tree-zone';
import {
  BIG_TREE_OWNER_ORDINARY,
  BIG_TREE_OWNER_XENOMIMIC,
  performBigTreeActivity,
  type BigTreeOrdinaryBody,
  type BigTreeXenomimicBody,
} from '../src/sim/big-tree-visitors';

function makeOrdinary(act = 0, payoff = 0): BigTreeOrdinaryBody {
  return {
    id: 7,
    position: { x: 0, z: 0 },
    userData: {
      ecologyId: 7,
      energy: 50,
      belly: 0,
      age: 1,
      life: 100,
      alive: true,
      act,
      payoff,
      vel: { x: 0, z: 0 },
    },
  };
}

function makeXenomimic(shimmer = 0): BigTreeXenomimicBody {
  return {
    pairId: 3,
    role: 0,
    x: 0,
    z: 0,
    vx: 0,
    vz: 0,
    heading: 0,
    energy: 0.5,
    age: 2,
    alive: true,
    shimmer,
  };
}

describe('big-tree production activity bridge', () => {
  test('socializing with a live partner raises ordinary activation and payoff, clamped to [-4,4]', () => {
    const body = makeOrdinary(0.5, 0.01);
    performBigTreeActivity(BIG_TREE_OWNER_ORDINARY, 42, body, BigTreeActivity.Socialize, 1);
    expect(body.userData.act).toBeCloseTo(1.2, 10);
    expect(body.userData.payoff).toBe(0.08);
    // A richer ledger is never clobbered down to the floor.
    const rich = makeOrdinary(0, 0.5);
    performBigTreeActivity(BIG_TREE_OWNER_ORDINARY, 42, rich, BigTreeActivity.Socialize, 1);
    expect(rich.userData.payoff).toBe(0.5);
    // Clamp: a saturated activation lane cannot exceed the entity-brain bound.
    const hot = makeOrdinary(3.9, 0);
    performBigTreeActivity(BIG_TREE_OWNER_ORDINARY, 42, hot, BigTreeActivity.Socialize, 10);
    expect(hot.userData.act).toBe(4);
  });

  test('socializing without a live partner transfers nothing (spec: requires a willing partner)', () => {
    const body = makeOrdinary(1, 0.02);
    performBigTreeActivity(BIG_TREE_OWNER_ORDINARY, -1, body, BigTreeActivity.Socialize, 1);
    expect(body.userData.act).toBe(1);
    expect(body.userData.payoff).toBe(0.02);
    const xeno = makeXenomimic(0.1);
    performBigTreeActivity(BIG_TREE_OWNER_XENOMIMIC, -1, xeno, BigTreeActivity.Socialize, 1);
    expect(xeno.shimmer).toBe(0.1);
  });

  test('observing raises activation gently for ordinary and shimmer for xenomimics', () => {
    const body = makeOrdinary(0, 0);
    performBigTreeActivity(BIG_TREE_OWNER_ORDINARY, -1, body, BigTreeActivity.Observe, 1);
    expect(body.userData.act).toBeCloseTo(0.18, 10);
    expect(body.userData.payoff).toBe(0);
    const xeno = makeXenomimic(0);
    performBigTreeActivity(BIG_TREE_OWNER_XENOMIMIC, -1, xeno, BigTreeActivity.Observe, 1);
    expect(xeno.shimmer).toBe(0.25);
  });

  test('xenomimic socialization expresses through the shimmer lane and never regresses it', () => {
    const xeno = makeXenomimic(0.9);
    performBigTreeActivity(BIG_TREE_OWNER_XENOMIMIC, 11, xeno, BigTreeActivity.Socialize, 1);
    expect(xeno.shimmer).toBe(0.9);
    const calm = makeXenomimic(0.1);
    performBigTreeActivity(BIG_TREE_OWNER_XENOMIMIC, 11, calm, BigTreeActivity.Socialize, 1);
    expect(calm.shimmer).toBe(0.75);
  });

  test('eat/rest/none activities leave the social lanes untouched (their state flows elsewhere)', () => {
    const body = makeOrdinary(1, 0.3);
    performBigTreeActivity(BIG_TREE_OWNER_ORDINARY, 42, body, BigTreeActivity.Eat, 1);
    performBigTreeActivity(BIG_TREE_OWNER_ORDINARY, 42, body, BigTreeActivity.Rest, 1);
    performBigTreeActivity(BIG_TREE_OWNER_ORDINARY, 42, body, BigTreeActivity.None, 1);
    expect(body.userData.act).toBe(1);
    expect(body.userData.payoff).toBe(0.3);
  });

  test('world.ts wires the exported bridge into its production activity callback (seal)', () => {
    const src = readFileSync('src/world.ts', 'utf8');
    const callbackStart = src.indexOf('bigTreeActivityCallbacks: BigTreeVisitorActivityCallbacks');
    expect(callbackStart).toBeGreaterThan(0);
    const callbackBody = src.slice(callbackStart, callbackStart + 700);
    expect(callbackBody).toContain(
      'performBigTreeActivity(ownerKind, partnerId, body, activity, dt)',
    );
    expect(src).toContain('this.bigTreeActivityCallbacks,');
  });
});

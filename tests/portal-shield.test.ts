/**
 * PORTAL SHIELD (V126, USER). The IMMUNE god-tier bodies (Super Creatures + APEX) don't die at the
 * ascension Portal — they shed a white hyperspeed sparkle shimmer while inside the flash radius, then
 * return to normal. Falsifiable:
 * - a body inside the flash radius shimmers (flash counter rises, the spark mesh turns visible);
 * - a body far away does NOT; disarmed (temple not revealed) does NOT; frozen dt (pause) does NOT;
 * - it is a VISUAL-only pass: it never mutates the bodies (they are just positions here).
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { PortalShield } from '../src/sim/portal-shield';
import type { SimContext } from '../src/types';

const ARENA_MID = 2.5;
const PORTAL = new THREE.Vector3(0, 24 * ARENA_MID, -40 * ARENA_MID - 0.5 * ARENA_MID);
const DT = 1 / 60;

/** Minimal ctx — PortalShield only touches `ctx.scene`. */
function makeCtx(): SimContext {
  return { scene: new THREE.Scene() } as unknown as SimContext;
}

describe('PortalShield', () => {
  test('an immune body inside the flash radius shimmers (visible sparks)', () => {
    const ctx = makeCtx();
    const shield = new PortalShield(ctx);
    shield.setActive(true);
    shield.react([PORTAL.clone()], 1, DT);
    expect(shield.stats().flashes).toBeGreaterThan(0);
    // the spark mesh became visible
    let visiblePoints = 0;
    ctx.scene.traverse((o) => {
      if ((o as THREE.Points).isPoints && o.visible) visiblePoints++;
    });
    expect(visiblePoints).toBe(1);
    shield.dispose();
  });

  test('a body far from the portal never shimmers', () => {
    const ctx = makeCtx();
    const shield = new PortalShield(ctx);
    shield.setActive(true);
    shield.react([new THREE.Vector3(400, 3, 400)], 1, DT);
    expect(shield.stats().flashes).toBe(0);
    shield.dispose();
  });

  test('disarmed (temple not revealed) never shimmers', () => {
    const ctx = makeCtx();
    const shield = new PortalShield(ctx);
    shield.setActive(false);
    shield.react([PORTAL.clone()], 1, DT);
    expect(shield.stats().flashes).toBe(0);
    shield.dispose();
  });

  test('frozen dt (pause) never shimmers even when armed at the portal', () => {
    const ctx = makeCtx();
    const shield = new PortalShield(ctx);
    shield.setActive(true);
    shield.react([PORTAL.clone()], 1, 0);
    expect(shield.stats().flashes).toBe(0);
    shield.dispose();
  });

  test('the shimmer fades out after the body leaves (sparks are transient)', () => {
    const ctx = makeCtx();
    const shield = new PortalShield(ctx);
    shield.setActive(true);
    let t = 0;
    shield.react([PORTAL.clone()], (t += DT), DT); // ignite
    // body leaves; advance ~1.5 s with no body near — sparks (LIFE≈0.55 s) must all die.
    for (let i = 0; i < 90; i++) shield.react([], (t += DT), DT);
    let anyVisible = false;
    ctx.scene.traverse((o) => {
      if ((o as THREE.Points).isPoints && o.visible) anyVisible = true;
    });
    expect(anyVisible).toBe(false);
    shield.dispose();
  });
});

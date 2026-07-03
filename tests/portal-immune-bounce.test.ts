/**
 * PORTAL IMMUNE BOUNCE (V126, USER "only Super Creatures and Pantheons bounce off it … white dazzling
 * sparkles … back to normal in 2 s"). The immune Pantheon RICOCHETS off the portal instead of dying:
 * - a companion drives each immune body's portalDeflect while armed, sparking on every bounce;
 * - disarmed / frozen-dt ⇒ nothing bounces;
 * - the pantheon ejects members inside the kill-cylinder (and sparks); members outside are untouched;
 * - the spark shower fades to nothing over ~2 s.
 *
 * Headless: the companion only touches ctx.scene, and AlphabetPantheonRender constructs from a bare Scene
 * (mirrors tests/pantheon-motion-continuity.test.ts).
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { AlphabetPantheonRender } from '../src/sim/alphabet-pantheon-render';
import { PortalImmuneBounce, type PortalImmune } from '../src/sim/portal-immune-bounce';
import type { SimContext } from '../src/types';

const DT = 1 / 60;
const PORTAL_Z = -40 * 2.5 - 0.5 * 2.5;
/** The companion only reads ctx.scene, so a bare scene stands in for the full context. */
const miniCtx = (): SimContext => ({ scene: new THREE.Scene() }) as unknown as SimContext;

describe('PortalImmuneBounce companion', () => {
  test('disarmed → no bounce; frozen dt → no bounce; armed → bounces and sparks', () => {
    const bounce = new PortalImmuneBounce(miniCtx());
    let deflects = 0;
    const immune: PortalImmune = {
      portalDeflect: (_ax, _az, _r2, onBounce): void => {
        deflects += 1;
        onBounce(0, 60, PORTAL_Z);
        onBounce(1, 60, PORTAL_Z);
      },
    };
    bounce.update(false, 1, DT, [immune]); // temple not revealed
    expect(deflects).toBe(0);
    bounce.update(true, 1, 0, [immune]); // frozen (pause)
    expect(deflects).toBe(0);
    bounce.update(true, 1, DT, [immune]); // armed + advancing
    expect(deflects).toBe(1);
    expect(bounce.bounces).toBe(2); // two onBounce → two spark showers
    expect(bounce.stats().bounces).toBe(2);
    bounce.dispose();
  });

  test('the spark shower fades to nothing over ~2 s without error', () => {
    const bounce = new PortalImmuneBounce(miniCtx());
    const immune: PortalImmune = {
      portalDeflect: (_ax, _az, _r2, onBounce): void => onBounce(0, 60, PORTAL_Z),
    };
    bounce.update(true, 1, DT, [immune]); // one bounce → a spark shower
    for (let f = 0; f < 150; f++) bounce.update(true, 2 + f * DT, DT, []); // advance ~2.5 s
    expect(bounce.bounces).toBe(1); // no new bounces (no immunes passed)
    bounce.dispose();
  });
});

describe('the Pantheon RICOCHETS off the portal (immune — never dies)', () => {
  test('members inside the cylinder are ejected + sparked', () => {
    const pantheon = new AlphabetPantheonRender(new THREE.Scene());
    let sparks = 0;
    // A huge cylinder offset from the origin → every member (wherever the nav placed it) ejects + sparks.
    pantheon.portalDeflect(50, 50, 1e12, () => (sparks += 1));
    expect(sparks).toBeGreaterThan(0);
    pantheon.dispose();
  });

  test('members far outside the cylinder are untouched (no bounce)', () => {
    const pantheon = new AlphabetPantheonRender(new THREE.Scene());
    let sparks = 0;
    pantheon.portalDeflect(1e6, 1e6, 100, () => (sparks += 1)); // tiny radius, far away
    expect(sparks).toBe(0);
    pantheon.dispose();
  });
});

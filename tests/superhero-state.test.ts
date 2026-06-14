/**
 * SUPERHERO STATE (V35) — the player-as-creature progression model. Pins the XP curve, the regen +
 * passive-XP tick, level-up roll-over, and the energy economy of powers.
 */
import { describe, expect, test } from 'bun:test';
import { SuperheroState, HERO_POWERS } from '../src/ui/superhero-state';

describe('SuperheroState', () => {
  test('inactive until activated; tick is a no-op while dormant', () => {
    const s = new SuperheroState();
    expect(s.active).toBe(false);
    s.energy = 0.5;
    s.tick(10, 1, 0);
    expect(s.energy).toBe(0.5); // unchanged — dormant
    s.activate();
    expect(s.active).toBe(true);
  });

  test('XP curve grows geometrically per level', () => {
    const s = new SuperheroState();
    expect(s.xpForNext()).toBe(50);
    s.level = 2;
    expect(s.xpForNext()).toBe(75);
    s.level = 3;
    expect(s.xpForNext()).toBe(113);
  });

  test('ticking regenerates energy + earns passive XP for a dominant apex', () => {
    const s = new SuperheroState();
    s.activate();
    s.energy = 0.2;
    s.tick(1, 1, 0); // 1s, full dominance, no threat
    expect(s.energy).toBeGreaterThan(0.2); // regenerated
    expect(s.xp + (s.level - 1) * 50).toBeGreaterThan(0); // earned XP (possibly leveled)
  });

  test('enough XP levels up and tops the bars back to full', () => {
    const s = new SuperheroState();
    s.activate();
    s.life = 0.3;
    s.energy = 0.1;
    s.gainXp(50); // exactly one level
    expect(s.level).toBe(2);
    expect(s.life).toBe(1);
    expect(s.energy).toBe(1);
  });

  test('threat bleeds life; calm restores it', () => {
    const s = new SuperheroState();
    s.activate();
    s.life = 0.5;
    s.tick(1, 0, 1); // heavy threat
    expect(s.life).toBeLessThan(0.5);
    const calm = new SuperheroState();
    calm.activate();
    calm.life = 0.5;
    calm.tick(1, 0, 0); // calm
    expect(calm.life).toBeGreaterThan(0.5);
  });

  test('powers spend energy and fail when too poor', () => {
    const s = new SuperheroState();
    s.activate();
    s.energy = 0.5;
    const fork = HERO_POWERS.find((p) => p.id === 'fork')!; // cost 0.6
    expect(s.use(fork.cost)).toBe(false); // can't afford
    expect(s.energy).toBe(0.5); // unchanged
    const phase = HERO_POWERS.find((p) => p.id === 'phase')!; // cost 0.22
    expect(s.use(phase.cost)).toBe(true);
    expect(s.energy).toBeCloseTo(0.28, 5);
  });
});

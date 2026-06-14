/**
 * SUPERHERO STATE (V35) — the pure, testable progression model behind the player-as-creature mode the
 * access puzzle unlocks. The player IS the 2nd super creature; this owns the game-layer the deep mind
 * doesn't: LIFE + ENERGY bars, an XP/LEVEL curve, and the quantum POWERS (each costs energy, grants
 * XP). DOM-free + deterministic (no rng, no clock — the world passes `dt`), so the HUD math is unit
 * tested independently of the browser. The HUD ([superhero-hud.ts](./superhero-hud.ts)) renders it;
 * the world ([world.ts]) ticks it and applies the powers' world-effects.
 */

/** A quantum-themed power: an energy cost + flavour. Activating one dispatches a `cqm:hero-power`. */
export interface HeroPower {
  id: 'phase' | 'dominion' | 'fork' | 'recall';
  name: string;
  cost: number; // energy in 0..1
  desc: string;
}
export type HeroPowerId = HeroPower['id'];

export const HERO_POWERS: readonly HeroPower[] = [
  {
    id: 'phase',
    name: 'PHASE SHIFT',
    cost: 0.22,
    desc: 'Slip between render-states of the world.',
  },
  {
    id: 'dominion',
    name: 'DOMINION PULSE',
    cost: 0.4,
    desc: 'Radiate dominance; the body blazes.',
  },
  { id: 'fork', name: 'QUANTUM FORK', cost: 0.6, desc: 'Sire another twin (up to the cap of 3).' },
  { id: 'recall', name: 'RECALL', cost: 0.15, desc: 'Summon the camera to your locus.' },
] as const;

/** A read-only view of the hero's game-state for the HUD. */
export interface SuperheroView {
  active: boolean;
  level: number;
  xp: number; // toward the next level
  xpForNext: number;
  life: number; // 0..1
  energy: number; // 0..1
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * The player's game-layer. `activate()` on ACCESS GRANTED; `tick(dt, dominance, threat)` each frame
 * (energy + life regen, passive XP from existing as an apex, life pressure from world threat); `use`
 * spends energy on a power and earns XP. The XP curve is geometric, and a level-up tops up the bars.
 */
export class SuperheroState {
  active = false;
  level = 1;
  xp = 0;
  life = 1;
  energy = 1;

  /** XP needed to clear the current level (geometric growth — 50, 75, 113, …). */
  xpForNext(): number {
    return Math.round(50 * Math.pow(1.5, this.level - 1));
  }

  activate(): void {
    this.active = true;
  }

  /**
   * One beat. Energy + life regenerate; existing as a dominant apex earns XP; sustained world threat
   * bleeds life (so the bar is live, not cosmetic). `dt` in seconds, `dominance`/`threat` in 0..1.
   */
  tick(dt: number, dominance: number, threat: number): void {
    if (!this.active) return;
    this.energy = clamp01(this.energy + dt * 0.09);
    this.life = clamp01(this.life + dt * (0.04 - 0.07 * threat));
    this.gainXp(dt * (4 + 8 * dominance));
  }

  /** Accumulate XP, rolling over level-ups (each tops up life + energy). */
  gainXp(amount: number): void {
    if (amount <= 0) return;
    this.xp += amount;
    let guard = 0;
    while (this.xp >= this.xpForNext() && guard++ < 1000) {
      this.xp -= this.xpForNext();
      this.level++;
      this.life = 1;
      this.energy = 1;
    }
  }

  /** Try to spend `cost` energy on a power. Returns true if it fired (energy spent, XP gained). */
  use(cost: number): boolean {
    if (!this.active || this.energy < cost) return false;
    this.energy -= cost;
    this.gainXp(6);
    return true;
  }

  /** Immutable snapshot for the HUD. */
  view(): SuperheroView {
    return {
      active: this.active,
      level: this.level,
      xp: this.xp,
      xpForNext: this.xpForNext(),
      life: this.life,
      energy: this.energy,
    };
  }
}

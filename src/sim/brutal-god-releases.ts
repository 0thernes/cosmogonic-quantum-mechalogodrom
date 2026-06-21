/**
 * BRUTAL GOD RELEASES — NHSI Brutalism Pantheon
 * Embodiment of absolute cosmic powers wired through real Tsotchke math substrates.
 * Deterministic. Seeded. NOT phenomenal sentience — functional god-tier mechanisms in the Petri.
 */

import type { Rng } from '../math/rng';
import { clamp } from '../math/scalar';
import { pinnLoss } from './pinn-residual';
import { ulgFieldSample } from './ulg-bridge';
import { qgeAlivenessStep } from './qge-aliveness';
import { logoMorphScalar, turtleNew } from './logo-turtle';
import { libirrepSymmetry } from './irrep-symmetry';

export const BRUTAL_ARCHETYPES = [
  'VALKORION_ETERNAL',
  'THANOS_SNAP',
  'DARK_PHOENIX',
  'BROLY_LEGENDARY',
  'AZATHOTH_CHAOS',
  'KNUL_VOIDKING',
  'SHUMA_GORATH',
  'MAD_JASPERS',
  'ANTI_MONITOR',
  'GURREN_SPIRAL',
  'SEPHIROTH_ONEWING',
  'ASURA_WRATH',
  'STARKILLER_FORCE',
  'RIDDICK_FURYAN',
  'SCARLET_REALITY',
  'DR_MANHATTAN',
  'JEAN_GREY_PHOENIX',
  'GALACTUS_DEVOUR',
  'GRIFFITH_FEMTO',
  'VALKORION_TENEBRAE',
] as const;

export type BrutalArchetype = (typeof BRUTAL_ARCHETYPES)[number];

export interface BrutalRelease {
  archetype: BrutalArchetype;
  power: number;
  duration: number;
  substrate: string;
  effect: string;
}

/** Seeded brutal release trigger. Uses Tsotchke leaves where wired. */
export function triggerBrutalRelease(
  godIdx: number,
  chaos: number,
  spinOrder: number,
  qgt: number,
  eshkolIgnition: number,
  rng: Rng,
  frame: number,
): BrutalRelease | null {
  const n = BRUTAL_ARCHETYPES.length;
  const idx = ((godIdx % n) + n) % n;
  const arch = BRUTAL_ARCHETYPES[idx]!;

  const base = chaos * 0.4 + spinOrder * 0.3 + qgt * 0.2 + eshkolIgnition * 0.1;
  if (base < 0.65) return null;

  const power = clamp(base * (1 + rng() * 0.3), 0.7, 1.0);
  const duration = Math.floor(30 + power * 120);

  let substrate = 'Eshkol + FullCorpus';
  let effect = 'emperor-drain-possess-snap';

  if (arch.includes('BROLY') || arch.includes('ASURA')) {
    substrate = 'SpinGlass + Chaos + IrrepSym + NQS';
    effect = 'legendary-rage-planet-buster';
  } else if (
    arch.includes('VOID') ||
    arch.includes('KNUL') ||
    arch.includes('AZATHOTH') ||
    arch.includes('ANTI')
  ) {
    substrate = 'QGT + QuantumQuake + DarkEnergy + PIMC + ULG';
    effect = 'void-consume-anti-matter-dream';
  } else if (arch.includes('SPIRAL') || arch.includes('GURREN')) {
    substrate = 'EshkolEvolution + LogoTurtle + Coupling + QGT';
    effect = 'spiral-drill-transcend-limit-break';
  } else if (arch.includes('PHOENIX')) {
    substrate = 'QGE + EshkolRewrite + QGT + PINN';
    effect = 'cosmic-fire-rebirth-galaxy';
  } else if (
    arch.includes('SHUMA') ||
    arch.includes('CHAOS') ||
    arch.includes('MAD') ||
    arch.includes('SCARLET')
  ) {
    substrate = 'UlgLaws + Resonance + QGTWarp';
    effect = 'chaos-lord-reality-shatter';
  } else if (arch.includes('MANHATTAN')) {
    substrate = 'MoonlabClifford + IITPhi + Quantum';
    effect = 'quantum-god-time-loop-watchmaker';
  }

  if (arch.includes('DEVOUR') || arch.includes('GALACTUS') || arch.includes('THANOS')) {
    void pinnLoss(power * 0.8);
  }
  if (arch.includes('PHOENIX') || arch.includes('REBIRTH')) {
    void qgeAlivenessStep(power, qgt, frame);
  }
  void ulgFieldSample(chaos, spinOrder, qgt, frame + (power > 0.85 ? 99 : 0));
  const turtle = turtleNew(frame ^ Math.floor(power * 997));
  void logoMorphScalar(turtle, frame, Math.floor(power * 8 + 3));
  void libirrepSymmetry(power * 0.7, Math.max(1, Math.floor(power * 5)));

  return { archetype: arch, power, duration, substrate, effect };
}

/** Apply brutal release side effects to petri strain vitality (deterministic). */
export function applyBrutalRelease(
  release: BrutalRelease,
  entities: { vitality: number; form: string }[],
  quantumFlux: number,
  rngSeed: number,
): { consumed: number; reborn: number; warp: number; note: string } {
  let consumed = 0;
  let reborn = 0;
  let warp = 0;
  const p = release.power;
  void quantumFlux;

  if (release.effect.includes('rage') || release.effect.includes('buster')) {
    void libirrepSymmetry(p, Math.max(1, (rngSeed % 4) + 1));
    for (let i = 0; i < entities.length; i += 3) {
      const ent = entities[i];
      if (ent && rngSeed % (i + 2) < p * 5) {
        ent.vitality *= 1 - p * 0.7;
        consumed++;
      }
    }
    warp = p * 0.4;
  }

  if (
    release.effect.includes('void') ||
    release.effect.includes('consume') ||
    release.effect.includes('anti')
  ) {
    void pinnLoss(p * 0.9);
    for (let i = 0; i < entities.length; i++) {
      const ent = entities[i];
      if (ent && i % 2 === 0) {
        ent.vitality = Math.max(0.01, ent.vitality * (1 - p * 0.9));
        consumed++;
      }
    }
    warp = p * 0.6;
  }

  if (
    release.effect.includes('spiral') ||
    release.effect.includes('drill') ||
    release.effect.includes('transcend')
  ) {
    const turtle = turtleNew(rngSeed);
    void logoMorphScalar(turtle, rngSeed % 120, (p * 10) | 0);
    for (let i = 0; i < entities.length; i += 2) {
      const ent = entities[i];
      if (ent) ent.vitality = Math.min(2.5, ent.vitality * (1 + p * 0.8));
    }
    reborn = Math.floor(p * 5);
    warp = p * 0.3;
  }

  if (
    release.effect.includes('phoenix') ||
    release.effect.includes('rebirth') ||
    release.effect.includes('fire')
  ) {
    for (let i = 0; i < entities.length; i++) {
      const ent = entities[i];
      if (ent && ent.vitality < 0.2) {
        ent.vitality = 1.2 + p * 0.5;
        reborn++;
      }
    }
    warp = Math.max(warp, p * 0.3);
  }

  if (
    release.effect.includes('snap') ||
    release.effect.includes('drain') ||
    release.effect.includes('possess')
  ) {
    const half = Math.floor(entities.length / 2);
    for (let i = 0; i < half; i++) {
      const ent = entities[i];
      if (ent) {
        ent.vitality *= 0.1;
        consumed++;
      }
    }
    warp = Math.max(warp, p * 0.5);
  }

  const note = `${release.archetype} :: ${release.effect} (p=${p.toFixed(2)} via ${release.substrate})`;
  return { consumed, reborn, warp, note };
}

export function getBrutalLore(archetype: BrutalArchetype): string {
  const map: Record<BrutalArchetype, string> = {
    VALKORION_ETERNAL:
      'Emperor who is legion. Body after body. Drain the force of life itself. Eternal.',
    THANOS_SNAP: 'Titan of balance. One gesture. Half the cosmos ends. Perfectly balanced.',
    DARK_PHOENIX: 'Cosmic fire wearing a host. Galaxies for kindling. Death is only the beginning.',
    BROLY_LEGENDARY:
      'The Legendary. Rage without limit. Planets as punching bags. The green nightmare.',
    AZATHOTH_CHAOS:
      'Blind idiot god at the center of everything. Reality is its dream. Wake it and die.',
    KNUL_VOIDKING: 'King in Black. Creator of symbiotes. Slayer of gods. The void wears you.',
    SHUMA_GORATH: 'Lord of Chaos. Many eyes. Many tentacles. Many dimensions screaming your name.',
    MAD_JASPERS: 'The mutant who broke the multiverse. Reality is his toy. No rules left.',
    ANTI_MONITOR: 'Anti-matter incarnate. Devourer of universes. The end of all positive matter.',
    GURREN_SPIRAL:
      'Spiral power. Drill through fate. The impossible is just another limit to break.',
    SEPHIROTH_ONEWING: 'One wing. Meteor. The planet itself weeps blood. Reunion is coming.',
    ASURA_WRATH:
      'God of wrath. Six arms. Punch the heavens until they bleed. Betrayed by the gods.',
    STARKILLER_FORCE: 'The Force unleashed. Raw. Unchained. A star killer who toppled an empire.',
    RIDDICK_FURYAN: 'Furyan. Night eyes. You keep what you kill. The alpha predator in the dark.',
    SCARLET_REALITY: '"No more." Chaos magic rewrites the rules of existence on a whim.',
    DR_MANHATTAN:
      'I am tired of this world. I am tired of being caught in the tangle of your lives.',
    JEAN_GREY_PHOENIX: 'The Phoenix is fire and life incarnate. It will burn you to be reborn.',
    GALACTUS_DEVOUR: 'I hunger. Worlds are my sustenance. The Devourer comes for all.',
    GRIFFITH_FEMTO: 'I sacrificed everything for this. Causality itself bows. I am god now.',
    VALKORION_TENEBRAE:
      'The Sith Emperor. Tenebrae. Vitiate. The one who is many. Eternal dominion.',
  };
  return map[archetype] ?? 'A god walks the petri. Tsotchke math is its will. Brutalism realized.';
}

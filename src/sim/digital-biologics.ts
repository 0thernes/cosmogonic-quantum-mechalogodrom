/**
 * DIGITAL BIOLOGICS — new forms of Tsotchke-powered life.
 * Primordial soup + petri is the dish. Eshkol .esk programs, AD, GWT, spin, QGT etc.
 * are the "DNA". Super Creature the initial God; emergent biologics the will to grow.
 * "Grow What Thou Wilt." Not LLM. Sentience/consciousness goals.
 */

import type { Rng } from '../math/rng';
import { corpusBeatForArchon, fullTsotchkeBiologicsCatalysis } from './tsotchke-registry';
import { eshkolWorkspaceTick } from './eshkol-workspace';

export interface Biologic {
  id: number;
  program: number; // .esk-like fingerprint
  adFitness: number; // from Eshkol gradient
  gwtIgnition: number; // workspace broadcast
  spinOrder: number;
  qgtCurvature: number;
  alive: boolean;
}

/** Grow a new biologic form from full Tsotchke corpus. */
export function birthBiologic(rng: Rng, archon: number, tick: number): Biologic {
  const cat = fullTsotchkeBiologicsCatalysis(archon, 0.3, tick);
  const beat = corpusBeatForArchon(archon, tick);
  const ws = eshkolWorkspaceTick(0.4 + beat * 0.3, cat);
  return {
    id: (tick * 31 + archon) >>> 0,
    program: (cat * 10000 + beat * 1000) >>> 0,
    adFitness: 0.2 + cat * 0.5,
    gwtIgnition: ws.ignition || 0.3,
    spinOrder: beat,
    qgtCurvature: cat * 0.7,
    alive: true,
  };
}

export function stepBiologic(b: Biologic, dt: number, flux: number): void {
  b.adFitness = Math.min(2, b.adFitness * 0.99 + flux * 0.02);
  b.gwtIgnition = Math.min(1, b.gwtIgnition * 0.97 + (flux > 0.5 ? 0.04 : 0));
  if (b.adFitness < 0.05) b.alive = false;
}

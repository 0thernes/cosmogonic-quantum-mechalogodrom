/**
 * Xenomimic connectome — topology accounting only (twin + entity proximity counts for HUD).
 *
 * VISUAL TETHER LINES ARE PERMANENTLY OFF (owner 2026-07-13): bipolar twins are **psionic**, not
 * physically wired. No LineSegments twin cords, no entity tethers, no scene attachment of lines.
 * Capture arrays stay fixed at construction so sync performs no collection or typed-array allocation.
 */
import { XENOMIMIC_MAX, type Xenomimic, type XenomimicPopulation } from './xenomimics';

export const XENOMIMIC_CONNECTOME_MAX_LINKS = 2500;
export const XENOMIMIC_CONNECTOME_MAX_ENTITY_BRIDGES = 48;

export interface XenomimicConnectomeEntity {
  readonly position: { readonly x: number; readonly y: number; readonly z: number };
  readonly userData?: { readonly act?: number };
}

const PAIR_CAP = XENOMIMIC_MAX / 2;

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export class XenomimicConnectome {
  private readonly creatures: Array<Xenomimic | null> = Array.from(
    { length: XENOMIMIC_MAX },
    () => null,
  );
  private readonly mimicByPair = new Int16Array(PAIR_CAP);
  private readonly antiByPair = new Int16Array(PAIR_CAP);
  private captured = 0;
  private links = 0;
  private disposed = false;

  /** Stable callback used by XenomimicPopulation.forEach without a per-sync closure. */
  private readonly captureCreature = (creature: Xenomimic): void => {
    if (this.captured >= XENOMIMIC_MAX) return;
    const slot = this.captured++;
    this.creatures[slot] = creature;
    const pair = Math.trunc(finite(creature.pairId));
    if (pair < 0 || pair >= PAIR_CAP) return;
    if (creature.role === 0) this.mimicByPair[pair] = slot;
    else this.antiByPair[pair] = slot;
  };

  constructor(_scene: unknown) {
    this.mimicByPair.fill(-1);
    this.antiByPair.fill(-1);
    // Scene intentionally unused — no GPU line geometry is created.
  }

  get linkCount(): number {
    return this.links;
  }

  /** No-op: lines never visible. Kept so world toggles compile. */
  get visible(): boolean {
    return false;
  }

  setVisible(_visible: boolean): void {
    /* permanently invisible — psionic bond only */
  }

  /**
   * Count twin pairs + nearby entity couplings without drawing anything.
   * Twin edges are still *logical* (psionic) but never rendered.
   */
  sync(
    population: XenomimicPopulation,
    entities: ArrayLike<XenomimicConnectomeEntity>,
    _time: number,
  ): void {
    if (this.disposed) return;
    this.captured = 0;
    this.mimicByPair.fill(-1);
    this.antiByPair.fill(-1);
    population.forEach(this.captureCreature);

    let n = 0;
    for (let pair = 0; pair < PAIR_CAP && n < XENOMIMIC_CONNECTOME_MAX_LINKS; pair++) {
      const mimicIndex = this.mimicByPair[pair] ?? -1;
      const antiIndex = this.antiByPair[pair] ?? -1;
      if (mimicIndex < 0 || antiIndex < 0) continue;
      const mimic = this.creatures[mimicIndex];
      const anti = this.creatures[antiIndex];
      if (!mimic || !anti) continue;
      n++;
    }

    const entityLimit = Math.min(
      Math.max(0, Math.trunc(finite(entities.length as number))),
      XENOMIMIC_CONNECTOME_MAX_ENTITY_BRIDGES,
    );
    const radius2 = 18 * 18;
    for (
      let entityIndex = 0;
      entityIndex < entityLimit && n < XENOMIMIC_CONNECTOME_MAX_LINKS;
      entityIndex++
    ) {
      const entity = entities[entityIndex];
      if (!entity) continue;
      let best = -1;
      let bestDistance = radius2;
      for (let i = 0; i < this.captured; i++) {
        const creature = this.creatures[i];
        if (!creature) continue;
        const dx = finite(creature.x) - finite(entity.position.x);
        const dy = finite(creature.y) - finite(entity.position.y);
        const dz = finite(creature.z) - finite(entity.position.z);
        const distance = dx * dx + dy * dy + dz * dz;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      }
      if (best < 0) continue;
      n++;
    }

    this.links = n;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.links = 0;
    this.captured = 0;
  }
}

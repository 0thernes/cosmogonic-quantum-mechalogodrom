/**
 * One-draw bounded topology for the published XenomimicPopulation.
 *
 * Every living reciprocal twin pair contributes one causal edge. A caller-owned, explicitly bounded
 * Entity sample may contribute one nearest Xenomimic bridge per entity. Capture arrays and line
 * buffers are fixed at construction, so sync performs no collection or typed-array allocation.
 */
import * as THREE from 'three';
import { XENOMIMIC_MAX, type Xenomimic, type XenomimicPopulation } from './xenomimics';

export const XENOMIMIC_CONNECTOME_MAX_LINKS = 2500;
export const XENOMIMIC_CONNECTOME_MAX_ENTITY_BRIDGES = 48;

export interface XenomimicConnectomeEntity {
  readonly position: { readonly x: number; readonly y: number; readonly z: number };
  readonly userData?: { readonly act?: number };
}

const PAIR_CAP = XENOMIMIC_MAX / 2;

function clamp01(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value >= 1 ? 1 : value;
}

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export class XenomimicConnectome {
  private readonly positions = new Float32Array(XENOMIMIC_CONNECTOME_MAX_LINKS * 6);
  private readonly colors = new Float32Array(XENOMIMIC_CONNECTOME_MAX_LINKS * 6);
  private readonly creatures: Array<Xenomimic | null> = Array.from(
    { length: XENOMIMIC_MAX },
    () => null,
  );
  private readonly mimicByPair = new Int16Array(PAIR_CAP);
  private readonly antiByPair = new Int16Array(PAIR_CAP);
  private readonly geometry = new THREE.BufferGeometry();
  private readonly positionAttr = new THREE.BufferAttribute(this.positions, 3);
  private readonly colorAttr = new THREE.BufferAttribute(this.colors, 3);
  private readonly material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.62,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  private readonly lines: THREE.LineSegments;
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

  constructor(scene: THREE.Scene) {
    this.mimicByPair.fill(-1);
    this.antiByPair.fill(-1);
    this.positionAttr.setUsage(THREE.DynamicDrawUsage);
    this.colorAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('position', this.positionAttr);
    this.geometry.setAttribute('color', this.colorAttr);
    this.geometry.setDrawRange(0, 0);
    this.lines = new THREE.LineSegments(this.geometry, this.material);
    this.lines.name = 'XenomimicCausalConnectome';
    this.lines.frustumCulled = false;
    this.lines.renderOrder = 17;
    scene.add(this.lines);
  }

  get linkCount(): number {
    return this.links;
  }

  get visible(): boolean {
    return this.lines.visible;
  }

  setVisible(visible: boolean): void {
    this.lines.visible = visible;
  }

  sync(
    population: XenomimicPopulation,
    entities: ArrayLike<XenomimicConnectomeEntity>,
    time: number,
  ): void {
    if (this.disposed) return;
    this.captured = 0;
    this.mimicByPair.fill(-1);
    this.antiByPair.fill(-1);
    population.forEach(this.captureCreature);

    let n = 0;
    const pulse = 0.5 + 0.5 * Math.sin(finite(time) * 2.1);
    for (let pair = 0; pair < PAIR_CAP && n < XENOMIMIC_CONNECTOME_MAX_LINKS; pair++) {
      const mimicIndex = this.mimicByPair[pair] ?? -1;
      const antiIndex = this.antiByPair[pair] ?? -1;
      if (mimicIndex < 0 || antiIndex < 0) continue;
      const mimic = this.creatures[mimicIndex];
      const anti = this.creatures[antiIndex];
      if (!mimic || !anti) continue;
      const tension = clamp01(
        Math.abs(mimic.shimmer - anti.shimmer) + Math.abs(mimic.energy - anti.energy),
      );
      this.writeLine(
        n++,
        mimic.x,
        mimic.y,
        mimic.z,
        anti.x,
        anti.y,
        anti.z,
        1,
        0.14 + tension * 0.5,
        0.04,
        0.08,
        0.55 + pulse * 0.35,
        1,
      );
    }

    const entityLimit = Math.min(
      Math.max(0, Math.trunc(finite(entities.length))),
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
      const creature = this.creatures[best]!;
      const activation = clamp01(
        creature.shimmer * 0.65 + finite(entity.userData?.act ?? 0) * 0.35,
      );
      this.writeLine(
        n++,
        creature.x,
        creature.y,
        creature.z,
        entity.position.x,
        entity.position.y,
        entity.position.z,
        1,
        0.25 + activation * 0.4,
        0.06,
        0.15,
        0.7 + activation * 0.3,
        1,
      );
    }

    this.links = n;
    this.geometry.setDrawRange(0, n * 2);
    if (n === 0) return;
    this.markRange(this.positionAttr, n * 6);
    this.markRange(this.colorAttr, n * 6);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.lines.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }

  private markRange(attribute: THREE.BufferAttribute, count: number): void {
    attribute.clearUpdateRanges();
    attribute.addUpdateRange(0, count);
    attribute.needsUpdate = true;
  }

  private writeLine(
    link: number,
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    ar: number,
    ag: number,
    ab: number,
    br: number,
    bg: number,
    bb: number,
  ): void {
    const offset = link * 6;
    this.positions[offset] = finite(ax);
    this.positions[offset + 1] = finite(ay);
    this.positions[offset + 2] = finite(az);
    this.positions[offset + 3] = finite(bx);
    this.positions[offset + 4] = finite(by);
    this.positions[offset + 5] = finite(bz);
    this.colors[offset] = ar;
    this.colors[offset + 1] = ag;
    this.colors[offset + 2] = ab;
    this.colors[offset + 3] = br;
    this.colors[offset + 4] = bg;
    this.colors[offset + 5] = bb;
  }
}

/**
 * Wilderness renderer (ADR 0010 Stage 3b) — draws the best-effort ambient population computed on
 * worker threads. NOT in the golden; 1-frame lag acceptable. Additive point sprites so the layer
 * reads as a distant neural haze without touching core entity fidelity.
 */
import * as THREE from 'three';
import type { WildernessPopulation } from './wilderness-population';

const MAX_POINTS = 16384;
const TMP = new THREE.Color();

export class WildernessRenderer {
  private readonly scene: THREE.Scene;
  private readonly positions = new Float32Array(MAX_POINTS * 3);
  private readonly colors = new Float32Array(MAX_POINTS * 3);
  private readonly geo = new THREE.BufferGeometry();
  private readonly posAttr: THREE.BufferAttribute;
  private readonly colAttr: THREE.BufferAttribute;
  private readonly points: THREE.Points;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.posAttr = new THREE.BufferAttribute(this.positions, 3);
    this.colAttr = new THREE.BufferAttribute(this.colors, 3);
    this.geo.setAttribute('position', this.posAttr);
    this.geo.setAttribute('color', this.colAttr);
    this.geo.setDrawRange(0, 0);
    this.points = new THREE.Points(
      this.geo,
      new THREE.PointsMaterial({
        size: 2.8,
        vertexColors: true,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        sizeAttenuation: true,
        fog: false,
      }),
    );
    this.points.frustumCulled = false;
    this.points.renderOrder = 1;
    scene.add(this.points);
  }

  /** Mirror wilderness entity positions into the GPU point pool. O(n) over ambient count only. */
  sync(population: WildernessPopulation, t: number): void {
    let w = 0;
    population.forEachEntity((e) => {
      if (w >= MAX_POINTS) return;
      const o = w * 3;
      this.positions[o] = e.x;
      this.positions[o + 1] = e.y + 0.6;
      this.positions[o + 2] = e.z;
      const hue = (e.type * 0.17 + e.seed * 1e-6 + t * 0.35) % 1;
      const fire = 0.55 + 0.45 * Math.sin(t * 22 + e.id * 0.13);
      TMP.setHSL(hue, 0.92, 0.42 + fire * 0.22);
      this.colors[o] = TMP.r;
      this.colors[o + 1] = TMP.g;
      this.colors[o + 2] = TMP.b;
      w++;
    });
    this.geo.setDrawRange(0, w);
    this.points.visible = w > 0;
    if (w > 0) {
      this.posAttr.clearUpdateRanges();
      this.posAttr.addUpdateRange(0, w * 3);
      this.posAttr.needsUpdate = true;
      this.colAttr.clearUpdateRanges();
      this.colAttr.addUpdateRange(0, w * 3);
      this.colAttr.needsUpdate = true;
    }
  }

  dispose(): void {
    this.scene.remove(this.points);
    this.geo.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}

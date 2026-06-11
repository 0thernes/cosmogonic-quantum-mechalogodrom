import * as THREE from 'three';
import { CAMERA_FAR, FOG_SCALE } from '../sim/constants';
import type { QualityProfile } from '../types';

/**
 * Owns the WebGL renderer, root scene and perspective camera
 * (legacy lines 182-194).
 *
 * Faithful constants: antialias on, `high-performance` power preference,
 * ACES filmic tone mapping at exposure 1.15, `FogExp2(0x020310, 0.003 · FOG_SCALE)`,
 * 68° FOV camera with near/far 0.1..CAMERA_FAR parked at (0, 50, 140). The far
 * plane and fog density carry the V3.1 ARENA scale (legacy 900 / 0.003 at 1×).
 *
 * r128 color-fidelity fix: `outputColorSpace` is forced to
 * `LinearSRGBColorSpace`. The legacy r128 monolith ran with the old default
 * (no sRGB output encode), so every emissive/HSL color value was authored
 * against a linear-out pipeline. Modern three defaults to `SRGBColorSpace`,
 * which double-encodes those already-tuned values and shifts the whole palette
 * brighter/desaturated. Keeping ACES tone mapping + exposure 1.15 on top of a
 * linear output buffer reproduces the legacy look exactly. NOTE: this pairs
 * with `THREE.ColorManagement.enabled = false`, which the integrator sets in
 * main.ts BEFORE constructing this Engine (ordering matters — see notes).
 */
export class Engine {
  /** WebGL renderer bound to the app canvas. */
  readonly renderer: THREE.WebGLRenderer;
  /** Root scene; `scene.fog` is mutated live by the WeatherSystem. */
  readonly scene: THREE.Scene;
  /** Main perspective camera; world.ts drives its position per view mode. */
  readonly camera: THREE.PerspectiveCamera;
  private readonly dprCap: number;

  /**
   * Build renderer/scene/camera against `canvas` using the resolved quality
   * profile. One-time setup; no per-frame cost.
   */
  constructor(canvas: HTMLCanvasElement, quality: QualityProfile) {
    this.dprCap = quality.dprCap;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.dprCap));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = quality.shadows;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x020310, 0.003 * FOG_SCALE);

    this.camera = new THREE.PerspectiveCamera(
      68,
      window.innerWidth / window.innerHeight,
      0.1,
      CAMERA_FAR,
    );
    this.camera.position.set(0, 50, 140);
  }

  /**
   * Resize to the current viewport AND reapply the capped device pixel ratio
   * (Known Bug 6 fix — legacy line 878 never reset DPR after a monitor move).
   * Pixel ratio is set BEFORE setSize so the drawing buffer is sized once.
   * Bind to `window` resize in main.ts. O(1).
   */
  onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.dprCap));
    this.renderer.setSize(w, h);
  }

  /** Render one frame (scene through camera). Allocation-free. */
  render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}

/**
 * Optional cinematic post-processing (CONTRACTS V11) — OFF by default, enabled with `?fx=1`.
 *
 * Adds an UnrealBloom pass over the emissive-heavy cosmos for a modern, glowing, "no-1980s" look.
 * Kept behind a flag because the effect graph interacts with the engine's deliberately non-standard
 * `LinearSRGBColorSpace` / ACES pipeline and must be verified on a real GPU before it becomes the
 * default. Fully self-contained + guarded by the caller: if building or rendering the composer ever
 * throws, the {@link Engine} permanently falls back to a plain `renderer.render()` — the working
 * default can never be broken by this opt-in path. Purely visual: no sim state, determinism-safe.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/** Read the `?fx` opt-in once (`?fx=1` / `?fx=true`). Safe when there is no DOM (SSR/tests). */
export function postFxRequested(): boolean {
  if (typeof window === 'undefined' || !window.location) return false;
  const v = new URLSearchParams(window.location.search).get('fx');
  return v === '1' || v === 'true' || v === 'on';
}

/** A thin EffectComposer wrapper: render-pass → UnrealBloom → output. Resizes with the viewport. */
export class PostFx {
  private readonly composer: EffectComposer;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    // strength, radius, threshold — tuned conservatively for the dark, emissive palette.
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.7,
      0.5,
      0.85,
    );
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    this.composer = composer;
  }

  /** Match the composer's render targets to the viewport. */
  setSize(w: number, h: number): void {
    this.composer.setSize(w, h);
  }

  /** Render the full effect chain to the screen. */
  render(): void {
    this.composer.render();
  }
}

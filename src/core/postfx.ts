/**
 * Post-processing (CONTRACTS V11 + V60) — a guarded EffectComposer chain.
 *
 * Two tiers, selected once at boot by {@link postFxMode}:
 * - **'lens'** (DEFAULT): RenderPass → {@link GravitationalLensPass} → OutputPass. The lens pass is a
 *   single full-screen shader that is a pixel-exact passthrough while no singularity is summoned
 *   (`strength === 0`), so the carefully-pinned `LinearSRGBColorSpace`/ACES look is preserved when
 *   the world is idle. When the chaos control summons a black/white/grey hole the integrator feeds
 *   the pass the hole's screen position + signed strength, and the screen bends light around it —
 *   real gravitational lensing (radial deflection, frame-drag swirl, chromatic dispersion, a dark
 *   shadow core). Cheap enough to leave on for everyone.
 * - **'cinematic'** (`?fx=1`): the lens chain PLUS an UnrealBloom pass over the emissive cosmos and a
 *   procedural environment map (set by the {@link Engine}) for glass/metal reflections. Heavier; kept
 *   opt-in because it changes the steady-state palette and must be verified per-GPU.
 *
 * Disable everything with `?fx=0` / `?fx=off` (the {@link Engine} then renders plainly).
 *
 * Fully self-contained + guarded by the caller: if building or rendering the composer ever throws,
 * the {@link Engine} permanently falls back to a plain `renderer.render()` — the working default can
 * never be broken by this path. Purely visual: no sim state mutated, determinism-safe.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/** Post-FX tiers. See the module header. */
export type PostFxMode = 'off' | 'lens' | 'cinematic';

/**
 * Resolve the post-FX tier from the URL once. `?fx=0|off|no` ⇒ 'off' (plain pipeline);
 * `?fx=1|true|on|cinematic` ⇒ 'cinematic' (lens + bloom + env); anything else (incl. no query)
 * ⇒ 'lens' (the default — lensing only, idle-identical to the plain look). Safe with no DOM.
 */
export function postFxMode(): PostFxMode {
  if (typeof window === 'undefined' || !window.location) return 'lens';
  const v = new URLSearchParams(window.location.search).get('fx');
  if (v === '0' || v === 'off' || v === 'no' || v === 'false') return 'off';
  if (v === '1' || v === 'true' || v === 'on' || v === 'cinematic') return 'cinematic';
  return 'lens';
}

/**
 * Black-hole lens shader. Bends the framebuffer around a screen point: a radial deflection that
 * peaks just outside the shadow and decays to nothing by the influence radius, a tangential swirl
 * (frame dragging), per-channel chromatic dispersion (blue bends more than red), and a darkened
 * shadow core. `uStrength` is signed: positive PINCHES light inward (absorbers — black/grey/strange
 * holes), negative BULGES it outward (emitters — white holes, the entropy swell). Identity at 0.
 */
const GRAVITATIONAL_LENS_SHADER: THREE.ShaderMaterialParameters & {
  uniforms: Record<string, THREE.IUniform>;
} = {
  uniforms: {
    tDiffuse: { value: null },
    uCenter: { value: new THREE.Vector2(0.5, 0.5) },
    uStrength: { value: 0 },
    uRadius: { value: 0.5 },
    uAspect: { value: 1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uCenter;
    uniform float uStrength;
    uniform float uRadius;
    uniform float uAspect;
    varying vec2 vUv;

    void main() {
      float s = uStrength;
      if (abs(s) < 0.0008) { gl_FragColor = texture2D(tDiffuse, vUv); return; }
      // Aspect-correct so the influence region is a circle, not an ellipse.
      vec2 d = vUv - uCenter;
      d.x *= uAspect;
      float r = length(d) + 1e-6;
      float rN = r / uRadius;
      // Smooth bell that peaks at the centre and vanishes by the influence radius.
      float bell = exp(-rN * rN * 2.2);
      vec2 dir = d / r;
      // Radial deflection (signed) + a little frame-drag swirl.
      float defl = s * bell * uRadius;
      float swirl = s * bell * 0.6;
      vec2 t = vec2(-dir.y, dir.x); // tangent
      vec2 off = dir * defl + t * swirl * uRadius;
      // Un-correct the aspect on the X component before sampling.
      vec2 sampleUv = vUv - vec2(off.x / uAspect, off.y);
      // Chromatic dispersion: shorter wavelengths bend more (blue sampled farther along the offset).
      vec2 ab = vec2(off.x / uAspect, off.y) * 0.35;
      float rC = texture2D(tDiffuse, sampleUv - ab).r;
      float gC = texture2D(tDiffuse, sampleUv).g;
      float bC = texture2D(tDiffuse, sampleUv + ab).b;
      vec3 col = vec3(rC, gC, bC);
      // Absorbers (s>0) eat light at the core; emitters (s<0) flare it.
      if (s > 0.0) col *= (smoothstep(0.0, 0.20, rN) * 0.7 + 0.3);
      else col += col * bell * 0.25;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

/**
 * A thin EffectComposer wrapper. Built once by {@link Engine}; resizes with the viewport. The
 * integrator drives {@link setLens} each frame so the lens tracks the active singularity.
 */
export class PostFx {
  private readonly composer: EffectComposer;
  private readonly lens: ShaderPass;
  /** The cinematic bloom pass (`?fx=1` only; null on the default 'lens' pipeline) — the one EXPENSIVE
   * post-FX pass, shed by the render governor under load while the cheap lens keeps running. */
  private readonly bloom: UnrealBloomPass | null;
  // Captured once from the lens pass's cloned uniform set so the per-frame setLens()/setSize() paths
  // mutate stable IUniform objects without index-signature `| undefined` noise (noUncheckedIndexedAccess).
  private readonly uCenter: THREE.IUniform<THREE.Vector2>;
  private readonly uStrength: THREE.IUniform<number>;
  private readonly uRadius: THREE.IUniform<number>;
  private readonly uAspect: THREE.IUniform<number>;
  private aspect = 1;

  /** Build the chain. `cinematic` adds the bloom pass (env map is the Engine's job). */
  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    cinematic: boolean,
  ) {
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    // The gravitational lens — first effect, so bloom (cinematic) blooms the already-bent light.
    this.lens = new ShaderPass(GRAVITATIONAL_LENS_SHADER);
    composer.addPass(this.lens);
    let bloom: UnrealBloomPass | null = null;
    if (cinematic) {
      // strength, radius, threshold — tuned conservatively for the dark, emissive palette.
      // Owner directive #11/#14: the bloom was the main source of the "blinding white shimmer".
      // Softer strength (0.7 → 0.45) + higher threshold (0.85 → 0.9) so ONLY genuinely bright
      // emitters (holes, APEX cores) glow, not every mid-tone — the halo stops washing the frame out.
      bloom = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.45,
        0.5,
        0.9,
      );
      composer.addPass(bloom);
    }
    this.bloom = bloom;
    composer.addPass(new OutputPass());
    this.composer = composer;
    // Invariant: these four uniforms are declared by GRAVITATIONAL_LENS_SHADER and cloned by ShaderPass.
    const u = this.lens.uniforms;
    this.uCenter = u.uCenter as THREE.IUniform<THREE.Vector2>;
    this.uStrength = u.uStrength as THREE.IUniform<number>;
    this.uRadius = u.uRadius as THREE.IUniform<number>;
    this.uAspect = u.uAspect as THREE.IUniform<number>;
    this.aspect = window.innerWidth / Math.max(1, window.innerHeight);
    this.uAspect.value = this.aspect;
  }

  /**
   * Aim the gravitational lens. `(cx, cy)` is the singularity's screen position in UV (0..1, origin
   * bottom-left); `strength` is signed (+pinch / −bulge, ~0.1–0.4 in practice, 0 = identity);
   * `radius` is the UV influence radius. Allocation-free; called once per frame by the integrator.
   */
  setLens(cx: number, cy: number, strength: number, radius: number): void {
    this.uCenter.value.set(cx, cy);
    this.uStrength.value = strength;
    this.uRadius.value = radius;
    this.uAspect.value = this.aspect;
  }

  /**
   * True while the gravitational lens is actually bending the screen — i.e. a singularity is summoned
   * and on-screen (signed strength ≠ 0). The {@link Engine} keeps the composer running for this even
   * when the render governor has otherwise suspended post-FX, so a singularity NEVER loses its
   * signature warp under load (the lens is one cheap full-screen pass; the heavy {@link setHeavySuspended}
   * bloom is shed instead). O(1).
   */
  get lensActive(): boolean {
    return this.uStrength.value !== 0;
  }

  /**
   * Render-governor hook: shed the EXPENSIVE post-FX (the cinematic UnrealBloom pass) under sustained
   * slow frames, while the cheap, physics-critical gravitational lens keeps running. A no-op on the
   * default 'lens' pipeline (no bloom built). Render-only — no sim state touched, determinism-safe. O(1).
   */
  setHeavySuspended(suspended: boolean): void {
    if (this.bloom) this.bloom.enabled = !suspended;
  }

  /** Match the composer's render targets to the viewport. */
  setSize(w: number, h: number): void {
    this.composer.setSize(w, h);
    this.aspect = w / Math.max(1, h);
    this.uAspect.value = this.aspect;
  }

  /** Render the full effect chain to the screen. */
  render(): void {
    this.composer.render();
  }

  /** Free the composer's render targets, every PASS's resources, and the lens material. */
  dispose(): void {
    try {
      // EffectComposer.dispose() frees only its OWN read/write targets — NOT the passes it holds. The
      // UnrealBloom pass (cinematic `?fx=1`) allocates a stack of render targets + materials that would
      // otherwise leak on every Engine.dispose / hot-reload. Dispose each pass first (a no-op where a
      // pass has none), then the composer.
      for (const pass of this.composer.passes) {
        (pass as { dispose?: () => void }).dispose?.();
      }
      this.composer.dispose();
    } catch {
      /* best-effort */
    }
    const mat = this.lens.material as THREE.Material | undefined;
    mat?.dispose?.();
  }
}

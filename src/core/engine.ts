import * as THREE from 'three';
import { CAMERA_FAR, FOG_SCALE } from '../sim/constants';
import type { QualityProfile } from '../types';
import { PostFx, postFxMode } from './postfx';

/**
 * Owns the WebGL renderer, root scene and perspective camera
 * (legacy lines 182-194).
 *
 * Faithful constants: antialias on, `high-performance` power preference,
 * ACES filmic tone mapping at exposure 0.95, `FogExp2(0x020310, 0.003 · FOG_SCALE)`,
 * 68° FOV camera with near/far 0.1..CAMERA_FAR parked at (0, 50, 140). The far
 * plane and fog density carry the V3.1 ARENA scale (legacy 900 / 0.003 at 1×).
 *
 * r128 color-fidelity fix: `outputColorSpace` is forced to
 * `LinearSRGBColorSpace`. The legacy r128 monolith ran with the old default
 * (no sRGB output encode), so every emissive/HSL color value was authored
 * against a linear-out pipeline. Modern three defaults to `SRGBColorSpace`,
 * which double-encodes those already-tuned values and shifts the whole palette
 * brighter/desaturated. Keeping ACES tone mapping + exposure 0.95 on top of a
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
  private dprScale = 1;
  private fxSuspended = false;
  private readonly bootShadows: boolean;
  /** True while the WebGL context is lost; `render()` no-ops until it returns. */
  private contextLost = false;
  /** Optional cinematic post-FX chain (`?fx=1`); null in the default pipeline. */
  private fx: PostFx | null = null;
  /** Drops the canvas context-loss listeners on {@link dispose} (so old Engines don't pile up on HMR). */
  private readonly ac = new AbortController();

  /**
   * Build renderer/scene/camera against `canvas` using the resolved quality
   * profile. One-time setup; no per-frame cost.
   */
  constructor(canvas: HTMLCanvasElement, quality: QualityProfile) {
    this.dprCap = quality.dprCap;
    this.bootShadows = quality.shadows;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, this.dprCap) * this.dprScale,
    );
    // V70: updateStyle=false — NEVER write inline width/height on the canvas, so the CSS `fixed inset-0`
    // always stretches it to fill the WHOLE window (no letterbox / aspect-ratio "encasing" if a resize
    // is ever missed). The drawing buffer is still sized to the viewport for a pixel-perfect render.
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.shadowMap.enabled = quality.shadows;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // USER #11: default exposure lowered so whites stop blowing out; ACES still handles HDR.
    this.renderer.toneMappingExposure = 0.62;
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x020310, 0.003 * FOG_SCALE);

    this.camera = new THREE.PerspectiveCamera(
      68,
      window.innerWidth / Math.max(1, window.innerHeight),
      0.1,
      CAMERA_FAR,
    );
    this.camera.position.set(0, 50, 140);

    // WebGL context-loss resilience. Mobile GPUs, driver resets, and tab
    // backgrounding can drop the GL context; calling render() on a lost context
    // throws. Calling preventDefault() on the loss event is what permits the
    // browser to later fire 'webglcontextrestored'. While lost we pause
    // rendering; on restore we reapply the size-dependent renderer state and
    // flag the shadow map for a rebuild (three re-uploads geometry/textures on
    // its own). One-time setup; no per-frame cost.
    canvas.addEventListener(
      'webglcontextlost',
      (e) => {
        e.preventDefault();
        this.contextLost = true;
      },
      { signal: this.ac.signal },
    );
    canvas.addEventListener(
      'webglcontextrestored',
      () => {
        this.renderer.setPixelRatio(
          Math.min(window.devicePixelRatio || 1, this.dprCap) * this.dprScale,
        );
        // V70: updateStyle=false — NEVER write inline width/height on the canvas, so the CSS `fixed inset-0`
        // always stretches it to fill the WHOLE window (no letterbox / aspect-ratio "encasing" if a resize
        // is ever missed). The drawing buffer is still sized to the viewport for a pixel-perfect render.
        this.renderer.setSize(window.innerWidth, window.innerHeight, false);
        if (this.renderer.shadowMap.enabled) this.renderer.shadowMap.needsUpdate = true;
        this.contextLost = false;
      },
      { signal: this.ac.signal },
    );

    // Post-FX (CONTRACTS V60). DEFAULT 'lens': a gravitational-lens composer that is a pixel-exact
    // passthrough while no singularity is summoned, so the pinned look is preserved when idle but the
    // chaos control's holes can bend the screen. 'cinematic' (`?fx=1`) additionally bakes a procedural
    // env-map for glass/metal reflections + an UnrealBloom glow. 'off' (`?fx=0`) keeps the plain
    // pipeline. Built once, GUARDED — anything throwing here leaves the plain pipeline intact.
    const mode = postFxMode();
    if (mode !== 'off') {
      try {
        if (mode === 'cinematic') this.scene.environment = buildCosmicEnvironment(this.renderer);
        this.fx = new PostFx(this.renderer, this.scene, this.camera, mode === 'cinematic');
      } catch {
        this.fx = null;
      }
    }
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
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, this.dprCap) * this.dprScale,
    );
    this.renderer.setSize(w, h, false); // updateStyle=false → CSS inset-0 fills the window (no letterbox)
    this.fx?.setSize(w, h);
  }

  /**
   * Render one frame (scene through camera). Allocation-free. No-op while the
   * WebGL context is lost — rendering on a dropped context throws.
   */
  render(): void {
    if (this.contextLost) return;
    if (this.fx && !this.fxSuspended) {
      try {
        this.fx.render();
        return;
      } catch {
        this.fx = null; // effect graph failed at runtime — fall back to the plain pipeline for good
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Aim the gravitational-lens post-FX pass at the active singularity (CONTRACTS V60). `(cx, cy)`
   * is its screen position in UV (0..1); `strength` is signed (+pinch absorbers / −bulge emitters,
   * 0 = identity); `radius` the UV influence radius. No-op when post-FX is off/failed. O(1).
   */
  setLens(cx: number, cy: number, strength: number, radius: number): void {
    this.fx?.setLens(cx, cy, strength, radius);
  }

  /** Master scene exposure (ACES filmic). O(1); does not touch sim state. */
  setExposure(exposure: number): void {
    // USER #11: clamped upper bound lowered so the scene never re-blows out at high exposure.
    this.renderer.toneMappingExposure = Math.max(0.35, Math.min(0.95, exposure));
  }

  getExposure(): number {
    return this.renderer.toneMappingExposure;
  }

  /**
   * Render-side governor knobs (driven by {@link RenderGovernor} in main.ts). DETERMINISM-SAFE: these
   * touch ONLY renderer settings, never sim state/RNG — so a degraded frame is byte-identical in the
   * sim, just cheaper to draw. They exist so the governor can shed GPU load before a frame gets heavy
   * enough to trip the driver watchdog (TDR / black-screen freeze). All O(1).
   */

  /** Scale the effective device-pixel-ratio (1 = full, &lt;1 = a cheaper backbuffer). O(1). */
  setPixelRatioScale(scale: number): void {
    this.dprScale = scale;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.dprCap) * scale);
    // Keep the post-FX composer's render targets in sync with the new pixel ratio (no stretch).
    this.fx?.setSize(window.innerWidth, window.innerHeight);
  }

  /** Suspend/restore the post-FX pass (honored in {@link render}). O(1). */
  setPostFxSuspended(suspended: boolean): void {
    this.fxSuspended = suspended;
  }

  /** Enable/disable shadows at runtime — only re-enables if the boot tier had shadows at all. O(1). */
  setShadowsEnabled(on: boolean): void {
    const want = on && this.bootShadows;
    if (this.renderer.shadowMap.enabled === want) return;
    this.renderer.shadowMap.enabled = want;
    if (want) this.renderer.shadowMap.needsUpdate = true;
  }

  /** Whether the WebGL context is currently lost (for callers/telemetry). O(1). */
  isContextLost(): boolean {
    return this.contextLost;
  }

  /**
   * Free the WebGL context + GPU resources. Call on teardown / hot-reload. CRITICAL for dev: a renderer
   * that is dropped without this LEAKS its WebGL context, which counts against the browser's hard cap
   * (~16 live contexts). After enough hot-reloads every `new WebGLRenderer` then fails with
   * "Error creating WebGL context" — even on a fresh load — until the GPU process restarts.
   * `forceContextLoss()` actively releases the context slot; `dispose()` frees programs/buffers.
   */
  dispose(): void {
    this.ac.abort(); // remove the canvas context-loss/restore listeners
    try {
      (this.fx as { dispose?: () => void } | null)?.dispose?.();
    } catch {
      /* fx teardown is best-effort */
    }
    this.fx = null;
    const env = this.scene.environment as { dispose?: () => void } | null;
    if (env) {
      try {
        env.dispose?.();
      } catch {
        /* ignore */
      }
      this.scene.environment = null;
    }
    try {
      this.renderer.dispose();
    } catch {
      /* ignore */
    }
    try {
      this.renderer.forceContextLoss();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Build a procedural cosmic environment map (PMREM-filtered) for image-based reflections — used only
 * on the `?fx=1` path so glass/metal organisms read as wet jewels. A back-side gradient sphere (deep
 * void → cyan horizon → amber crown + an off-axis fuchsia lobe) is captured once and discarded.
 * Determinism-safe: a one-time GPU bake, no rng/clock, no sim-state coupling.
 */
function buildCosmicEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const geo = new THREE.SphereGeometry(60, 32, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vDir;
      void main() {
        float h = vDir.y * 0.5 + 0.5;
        vec3 voidc = vec3(0.012, 0.020, 0.050);
        vec3 horizon = vec3(0.040, 0.320, 0.420);
        vec3 crown = vec3(0.560, 0.330, 0.110);
        vec3 col = mix(voidc, horizon, smoothstep(0.12, 0.55, h));
        col = mix(col, crown, smoothstep(0.62, 1.0, h));
        float lobe = pow(max(0.0, dot(vDir, normalize(vec3(0.6, 0.3, -0.5)))), 6.0);
        col += vec3(0.40, 0.08, 0.50) * lobe * 0.6;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sphere = new THREE.Mesh(geo, mat);
  envScene.add(sphere);
  const tex = pmrem.fromScene(envScene, 0).texture;
  geo.dispose();
  mat.dispose();
  pmrem.dispose();
  return tex;
}

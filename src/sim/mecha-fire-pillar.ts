/**
 * MECHA FIRE PILLAR (V128, USER stage B — visible-hazard polish) — a PERSISTENT flame column that
 * makes the Mechalogodrom's downward incineration cone ({@link MechaBlaze}) actually VISIBLE. The blaze
 * itself renders only kill‑embers, so between deaths the death zone is invisible and a pilot can't see
 * the hazard to avoid it. This hangs a real fire‑cone in exactly the blaze's burn region — narrow at the
 * god (BASE_R), fanning out as it falls, bottoming at BLAZE_FLOOR — so the roaring column reads as the
 * threat it is. The flames lick UPWARD toward the god and brighten with the god's agitation.
 *
 * PURE VFX: it kills nothing, owns no sim state, draws no rng, and needs no per‑frame allocation — just
 * two uniform writes. Its geometry MIRRORS mecha-blaze.ts's cone constants so the visible fire and the
 * real kill volume are the same shape (kept in sync by construction, documented here + there).
 *
 * DETERMINISM (ADR 0004): animated purely from a `uTime` uniform; no `Math.random`, no `Date.now`.
 */
import * as THREE from 'three';
import { ARENA_MID } from './constants';

// ── Mirror mecha-blaze.ts's burn cone so the visible flames == the kill volume. ──
const MECHA_Y = 756; // Mechalogodrom altitude (0, 756, 0) — lifted ×3 with the taller world
const BASE_R = 36 * ARENA_MID; // cone radius at the god (≈ 90) — god body size unchanged by the lift
const CONE_SPREAD = 0.34; // extra radius per world-unit of descent
const BLAZE_FLOOR = 450; // the cone bottoms out here (upper third of the column) — scaled ×3 with the god
const HEIGHT = MECHA_Y - BLAZE_FLOOR; // 306
const BOTTOM_R = BASE_R + HEIGHT * CONE_SPREAD; // ≈ 194 — wide at the fanned bottom

export class MechaFirePillar {
  private readonly scene: THREE.Scene;
  private readonly geo: THREE.CylinderGeometry;
  private readonly mat: THREE.ShaderMaterial;
  private readonly mesh: THREE.Mesh;
  private intensity = 0.5;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    // CylinderGeometry(radiusTop, radiusBottom, height) — narrow at the god, wide at the floor, open shell.
    this.geo = new THREE.CylinderGeometry(BASE_R, BOTTOM_R, HEIGHT, 40, 1, true);
    this.mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vUp;
        void main() {
          vUv = uv;
          vUp = uv.y; // 0 at the fanned floor, 1 at the god
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        precision highp float;
        uniform float uTime; uniform float uIntensity;
        varying vec2 vUv; varying float vUp;
        float h(vec2 p){ return fract(sin(dot(p, vec2(41.17, 289.9))) * 24634.63); }
        float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
        float fbm(vec2 p){ float a=0.5,s=0.0; for(int k=0;k<5;k++){ s+=a*n(p); p=p*2.03+3.1; a*=0.5; } return s; }
        void main() {
          // Flame licks RISE toward the god (pattern scrolls up the column), turbulent + wrapped seamlessly.
          float ang = vUv.x * 6.2831853;
          vec2 uv = vec2(cos(ang), sin(ang)) * 3.0 + vec2(0.0, vUv.y * 4.5 - uTime * 1.7);
          float flame = fbm(uv);
          float licks = pow(flame, 1.35);
          // Fire is fiercest at the god's mouth (top), streaming down; a soft rim glow throughout.
          float body = licks * (0.3 + vUp * 1.05);
          vec3 fire = mix(vec3(0.65, 0.07, 0.0), vec3(1.0, 0.45, 0.04), body);   // deep red → orange
          fire = mix(fire, vec3(1.0, 0.86, 0.32), pow(body, 2.2) * 0.7);          // gold lick tips
          float a = clamp(body * (0.22 + uIntensity) * (0.55 + vUp * 0.5), 0.0, 0.6);
          gl_FragColor = vec4(fire * (0.5 + uIntensity), a);
        }`,
    });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.position.set(0, (MECHA_Y + BLAZE_FLOOR) * 0.5, 0);
    // PERF (v0.20.0): frustum-cull the fire column. Its 5-octave fbm runs per fragment, but the vertex
    // shader does not displace (gl_Position from raw cylinder vertices), so the CylinderGeometry bounds
    // are exact — when the column is off-frustum the fbm is skipped with zero visual change.
    this.mesh.frustumCulled = true;
    this.mesh.renderOrder = 6;
    scene.add(this.mesh);
  }

  /** Feed the god's hunger/agitation (0..1) — brightens + thickens the column (same signal the blaze uses). */
  setIntensity(x: number): void {
    this.intensity = Number.isFinite(x) ? (x < 0 ? 0 : x > 1 ? 1 : x) : 0;
  }

  /** Breathe the flame. Pure uniform writes — O(1), no rng, no allocation. */
  update(t: number): void {
    this.mat.uniforms.uTime!.value = Number.isFinite(t) ? t : 0;
    this.mat.uniforms.uIntensity!.value = this.intensity;
  }

  /** Free the cone geometry + shader and detach from the scene. */
  dispose(): void {
    this.scene.remove(this.mesh);
    this.geo.dispose();
    this.mat.dispose();
  }
}

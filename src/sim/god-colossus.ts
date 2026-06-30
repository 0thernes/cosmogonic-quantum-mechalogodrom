/**
 * GOD-COLOSSUS (V110) — the ONE massive super-god-tier structure that dominates the skyline.
 *
 * A single colossal tiered god-spire looming at the dome's far edge (Galactus / Dr-Manhattan /
 * Thanos scale): 16 tapering stacked tiers encrusted with ~2400 instanced greeble panels, a faceted
 * "godhead" crown ringed by three orbiting halos, two outstretched buttress-arms for a figure
 * silhouette, and a fbm "living-skin" energy shell enveloping the whole monument. It towers far above
 * the {@link ARENA_RADIUS} dome so it reads as an incomprehensible god, not set dressing.
 *
 * LIVING SKIN (defensible, not decoration): the monument is NEVER static — the structural emissive
 * cycles a slow "schizophrenic" hue while its intensity is a monotone readout of world chaos +
 * entropy (pin both to 0 and the god cools to dead stone; agitate them and it blazes and writhes).
 * The energy shell's fbm veins flow with time and bloom with chaos. The crown + halos counter-rotate.
 *
 * DETERMINISM (ADR 0004): every position + per-panel param comes from a pure positional hash — ZERO
 * rng draws, no Date.now — boot-stream-neutral additive scene dressing (like {@link FloatingMonoliths}
 * / GoldLattice). It READS world chaos/entropy but never writes sim state, so the population golden
 * replay stays byte-identical.
 */
import * as THREE from 'three';
import { ARENA_RADIUS } from './constants';

/** Tapering stacked tiers forming the colossal spire. */
const TIERS = 16;
/** Instanced greeble panels encrusting the tier faces (telemetry-checked). */
const PANELS = 2400;
/** Three orbiting halo rings around the godhead crown. */
const RINGS = 3;

/** Deterministic positional hash → [0,1). No bitwise, no rng (mirrors FloatingMonoliths). */
function hash(n: number): number {
  const s = Math.sin(n * 41.17 + 13.91) * 24634.6345;
  return s - Math.floor(s);
}

interface Tier {
  readonly y: number;
  readonly halfW: number;
  readonly halfH: number;
}

export class GodColossus {
  private readonly scene: THREE.Scene;
  private readonly root = new THREE.Group();
  private readonly unitBox = new THREE.BoxGeometry(1, 1, 1);
  private readonly coreMat: THREE.MeshStandardMaterial;
  private readonly panelMat: THREE.MeshStandardMaterial;
  private readonly crownMat: THREE.MeshStandardMaterial;
  private readonly ringMat: THREE.MeshStandardMaterial;
  private readonly shellMat: THREE.ShaderMaterial;
  private readonly crownGeo: THREE.BufferGeometry;
  private readonly ringGeos: THREE.BufferGeometry[] = [];
  private readonly shellGeo: THREE.BufferGeometry;
  private readonly panels: THREE.InstancedMesh;
  private readonly crown: THREE.Mesh;
  private readonly rings: THREE.Mesh[] = [];
  private readonly shell: THREE.Mesh;
  /** Total greeble panels placed (telemetry/tests). */
  readonly panelCount = PANELS;
  /** Base/structural hue the schizophrenic shift rotates around. */
  private hue = 0.74;
  private readonly emissiveColor = new THREE.Color();
  private readonly shellHue = new THREE.Color();

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // ── Materials. The structural skin is dark with a strong emissive the update() hue-shifts. ──
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0x07060f,
      roughness: 0.5,
      metalness: 0.62,
      emissive: 0x160a26,
      emissiveIntensity: 0.6,
    });
    this.panelMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, // per-instance via instanceColor
      roughness: 0.66,
      metalness: 0.4,
      emissive: 0x140a22,
      emissiveIntensity: 0.45,
    });
    this.crownMat = new THREE.MeshStandardMaterial({
      color: 0x0a0814,
      roughness: 0.28,
      metalness: 0.85,
      emissive: 0x2a1248,
      emissiveIntensity: 0.9,
    });
    this.ringMat = new THREE.MeshStandardMaterial({
      color: 0x12101c,
      roughness: 0.2,
      metalness: 0.95,
      emissive: 0x3a1c64,
      emissiveIntensity: 1.1,
    });

    // ── Geometry: the tapering tiers. Base wide, crown narrow; total height >> ARENA_RADIUS. ──
    const baseHalf = ARENA_RADIUS * 0.16; // ~52 half-width at the foot
    const topHalf = ARENA_RADIUS * 0.035; // ~11 half-width at the shoulders
    const tierH = ARENA_RADIUS * 0.085; // ~28 per tier → ~440 tall before the crown
    const tiers: Tier[] = [];
    let y = 0;
    for (let i = 0; i < TIERS; i++) {
      const f = i / (TIERS - 1);
      const halfW = baseHalf * (1 - f) + topHalf * f;
      const half = tierH * 0.5;
      const cy = y + half;
      tiers.push({ y: cy, halfW, halfH: half });
      const tier = new THREE.Mesh(this.unitBox, this.coreMat);
      tier.position.y = cy;
      // Slight per-tier twist + jitter so the spire reads hand-built and unsettling, not a clean stack.
      tier.rotation.y = (hash(i * 7 + 3) - 0.5) * 0.5 + f * 1.1;
      tier.scale.set(
        halfW * 2,
        tierH * (0.9 + hash(i * 5 + 1) * 0.2),
        halfW * 2 * (0.7 + 0.3 * hash(i * 11 + 2)),
      );
      tier.frustumCulled = false;
      this.root.add(tier);
      y += tierH;
    }
    const crownBaseY = y;

    // ── Greeble shell: ONE instanced mesh, panels scattered over every tier's four faces. ──
    this.panels = new THREE.InstancedMesh(this.unitBox, this.panelMat, PANELS);
    this.panels.frustumCulled = false;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    const col = new THREE.Color();
    for (let p = 0; p < PANELS; p++) {
      const ti = Math.floor(hash(p * 1.7 + 5) * TIERS);
      const tier = tiers[ti < TIERS ? ti : TIERS - 1]!;
      const face = Math.floor(hash(p * 2.3 + 11) * 4); // 0..3 : ±x ±z (the four vertical faces)
      const pd = 0.6 + hash(p * 5 + 7) * 3.2; // protrusion depth
      const a = 1.0 + hash(p * 6 + 13) * 5.0; // in-face size a
      const b = 1.0 + hash(p * 9 + 17) * tier.halfH * 0.8; // in-face size b (vertical)
      const vo = (hash(p * 4 + 29) - 0.5) * 1.7; // vertical offset within the tier
      const uo = (hash(p * 3 + 23) - 0.5) * 1.7; // lateral offset along the face
      const yy = tier.y + vo * tier.halfH;
      if (face === 0) {
        pos.set(tier.halfW + pd * 0.5, yy, uo * tier.halfW);
        scl.set(pd, b, a);
      } else if (face === 1) {
        pos.set(-tier.halfW - pd * 0.5, yy, uo * tier.halfW);
        scl.set(pd, b, a);
      } else if (face === 2) {
        pos.set(uo * tier.halfW, yy, tier.halfW + pd * 0.5);
        scl.set(a, b, pd);
      } else {
        pos.set(uo * tier.halfW, yy, -tier.halfW - pd * 0.5);
        scl.set(a, b, pd);
      }
      e.set((hash(p) - 0.5) * 0.1, (hash(p + 1) - 0.5) * 0.1, (hash(p + 2) - 0.5) * 0.1);
      q.setFromEuler(e);
      m.compose(pos, q, scl);
      this.panels.setMatrixAt(p, m);
      // Mostly dark stone with rare blazing veins — the accents trace the god's "circuitry".
      const accent = hash(p * 7 + 31) > 0.88;
      if (accent) col.setHSL((this.hue + hash(p) * 0.25) % 1, 0.95, 0.55);
      else col.setHSL((0.7 + hash(p * 2) * 0.14) % 1, 0.35, 0.1 + hash(p * 3) * 0.12);
      this.panels.setColorAt(p, col);
    }
    this.panels.instanceMatrix.needsUpdate = true;
    if (this.panels.instanceColor) this.panels.instanceColor.needsUpdate = true;
    this.root.add(this.panels);

    // ── Outstretched buttress-arms (a figure silhouette) at the shoulders. ──
    const armY = crownBaseY * 0.78;
    const armLen = baseHalf * 1.6;
    for (let s = 0; s < 2; s++) {
      const arm = new THREE.Mesh(this.unitBox, this.coreMat);
      const dir = s === 0 ? 1 : -1;
      arm.position.set(dir * (topHalf + armLen * 0.5), armY, 0);
      arm.rotation.z = dir * -0.5;
      arm.scale.set(armLen, topHalf * 1.3, topHalf * 1.3);
      arm.frustumCulled = false;
      this.root.add(arm);
    }

    // ── Godhead crown: a faceted icosahedron + three orbiting halo rings. ──
    this.crownGeo = new THREE.IcosahedronGeometry(topHalf * 2.4, 1);
    this.crown = new THREE.Mesh(this.crownGeo, this.crownMat);
    this.crown.position.y = crownBaseY + topHalf * 2.6;
    this.crown.frustumCulled = false;
    this.root.add(this.crown);

    for (let r = 0; r < RINGS; r++) {
      const rg = new THREE.TorusGeometry(topHalf * (3.2 + r * 1.5), topHalf * 0.16, 8, 48);
      this.ringGeos.push(rg);
      const ring = new THREE.Mesh(rg, this.ringMat);
      ring.position.y = this.crown.position.y;
      ring.rotation.x = Math.PI * 0.5 * hash(r * 13 + 4) + r * 0.6;
      ring.rotation.y = hash(r * 17 + 5) * Math.PI;
      ring.frustumCulled = false;
      this.rings.push(ring);
      this.root.add(ring);
    }

    // ── Living-skin energy shell: a big fbm-veined additive icosahedron enveloping the monument. ──
    const totalH = crownBaseY + topHalf * 5;
    this.shellGeo = new THREE.IcosahedronGeometry(Math.max(totalH, baseHalf * 2) * 0.62, 3);
    this.shellMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      uniforms: {
        uTime: { value: 0 },
        uChaos: { value: 0 },
        uEntropy: { value: 0 },
        uHue: { value: new THREE.Color(0.4, 0.2, 0.9) },
      },
      vertexShader: `
        varying vec3 vP;
        void main() {
          vP = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        precision highp float;
        uniform float uTime; uniform float uChaos; uniform float uEntropy; uniform vec3 uHue;
        varying vec3 vP;
        float h31(vec3 p){ return fract(sin(dot(p, vec3(27.17, 61.31, 11.71))) * 43758.5453); }
        float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y), f.z); }
        float fbm(vec3 p){ float a=0.5,s=0.0; for(int i=0;i<5;i++){ s+=a*n3(p); p=p*2.03+5.1; a*=0.5; } return s; }
        void main() {
          vec3 dir = normalize(vP);
          float veins = fbm(dir * 6.0 + uTime * 0.15);
          veins = pow(abs(veins - 0.5) * 2.0, 1.6);
          float energy = fbm(dir * 3.0 - uTime * 0.25) * (0.45 + 0.9 * uChaos);
          vec3 col = uHue * (energy * 1.3 + veins * 0.9) + vec3(0.12, 0.05, 0.22) * uEntropy * 0.5;
          float a = clamp(energy * 0.55 + veins * 0.45, 0.0, 0.82);
          gl_FragColor = vec4(col, a);
        }`,
    });
    this.shell = new THREE.Mesh(this.shellGeo, this.shellMat);
    this.shell.position.y = totalH * 0.5;
    this.shell.frustumCulled = false;
    this.root.add(this.shell);

    // ── Place the colossus at the dome's far edge, towering over the skyline (centre column clear). ──
    this.root.position.set(0, 0, -ARENA_RADIUS * 0.92);
    this.scene.add(this.root);
  }

  /**
   * Animate the living skin: hue-shift the structural emissive (a slow "schizophrenic" rotation),
   * drive its intensity + the energy shell from world chaos + entropy, counter-rotate the crown +
   * halos, and let the colossus sway with godlike, almost-imperceptible slowness. O(RINGS). No rng,
   * no allocation, spawns no geometry.
   * @param t scaled elapsed seconds · @param chaos 0..1 · @param entropy 0..1
   */
  update(t: number, chaos: number, entropy: number): void {
    const c = chaos < 0 ? 0 : chaos > 1 ? 1 : chaos;
    const en = entropy < 0 ? 0 : entropy > 1 ? 1 : entropy;
    // Schizophrenic hue drift — the god never wears the same face twice.
    const h = (this.hue + t * 0.012 + c * 0.18) % 1;
    this.emissiveColor.setHSL(h, 0.7, 0.32 + 0.18 * c);
    const blaze = 0.4 + 2.4 * c + 0.8 * en;
    this.coreMat.emissive.copy(this.emissiveColor);
    this.coreMat.emissiveIntensity = blaze;
    this.panelMat.emissive.copy(this.emissiveColor);
    this.panelMat.emissiveIntensity = 0.35 + 1.9 * c;
    this.crownMat.emissive.setHSL((h + 0.5) % 1, 0.85, 0.4 + 0.2 * c);
    this.crownMat.emissiveIntensity = 0.7 + 2.6 * c + 0.6 * en;
    this.ringMat.emissiveIntensity = 0.9 + 3.0 * c;

    // Crown + halos counter-rotate; faster as the world agitates.
    this.crown.rotation.y += 0.0009 + 0.004 * c;
    this.crown.rotation.x += 0.0004;
    for (let i = 0; i < this.rings.length; i++) {
      const ring = this.rings[i]!;
      const dir = i % 2 === 0 ? 1 : -1;
      ring.rotation.z += dir * (0.002 + 0.01 * c);
      ring.rotation.y += dir * 0.0015;
    }

    // Energy shell breathes.
    this.shellMat.uniforms.uTime!.value = t;
    this.shellMat.uniforms.uChaos!.value = c;
    this.shellMat.uniforms.uEntropy!.value = en;
    this.shellHue.setHSL((h + 0.12) % 1, 0.85, 0.55);
    (this.shellMat.uniforms.uHue!.value as THREE.Color).copy(this.shellHue);

    // Godlike, near-imperceptible sway + a slow turn of the whole monument.
    this.root.rotation.y = Math.sin(t * 0.018) * 0.05 + t * 0.004;
    this.root.position.y = Math.sin(t * 0.05) * 4.0;
  }

  /** Free every owned geometry + material and detach the colossus from the scene. */
  dispose(): void {
    this.scene.remove(this.root);
    this.panels.dispose();
    this.unitBox.dispose();
    this.crownGeo.dispose();
    for (const g of this.ringGeos) g.dispose();
    this.shellGeo.dispose();
    this.coreMat.dispose();
    this.panelMat.dispose();
    this.crownMat.dispose();
    this.ringMat.dispose();
    this.shellMat.dispose();
  }
}

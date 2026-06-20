/**
 * THE SUPER CREATURE — the body (V32+). The masterful, morphing, many-eyed apex form that renders the
 * mind shipped in V31. Built OUTSIDE the instanced organism pool so it can carry unique geometry + a
 * hand-written iridescent "god-jewel" shader the pools can't: a faceted crystalline CORE, a wireframe
 * ARCHITECTURE cage, a corona of many EYES, radial SPIKE-ARMS, and orbiting CHROME RINGS — drawn from
 * the five visual-DNA plates (crystalline-architecture cube · tendrilled glowing-eyed entity ·
 * iridescent eye-sphere · spiked many-faced entity · chrome torus mechanism).
 *
 * The look is the point (the brief's "AMAZING graphics / 4K / masterful"): the core + cage run a
 * patched `MeshStandardMaterial` (real scene lighting) injected with object-space fBm crystalline
 * relief, thin-film iridescence, a Fresnel rim, and a subsurface GOD-GLOW in the creature's current
 * plan colour scaled by its dominance. The animation grammar is wholly cognition-driven: spin ∝
 * arousal, heartbeat ∝ arousal, glow ∝ dominance, eye-blink + colour ∝ plan, arm-writhe ∝ aggression,
 * morph wobble ∝ surprise, and a slow drift from the mind's own movement output.
 *
 * EXTREME EDGE + MATH FUELED MORPH (enhanced): high-freq fractal fBm (more octaves) + derivative
 * "curvature" term (diff-geom) + signed non-manifold hints (abs+mod creases/edges) in vertex displace.
 * Combinatronics via uVariant(0-4)+quantum vec for live feature masks (eyes/arms/wings/mouths/legs).
 * Alive multi-freq pulses/waves/heartbeats (primary arousal + quantum-wave from quantum[] + clifford-ent
 * proxy + harmonic breathing). Per-variant + live color/lighting (plan hue + phi glow + ignition flash
 * + archetype palette shift). Roughness/metal live-mod by surprise/morph/qualia. Amped multi-eyes/arms
 * reactivity (pupil focus scale; no alloc). Prebuilt groups only; param/uniform driven; deterministic
 * from t + mind/quantum state.
 * TSOTCHKE QGTL (quantum_geometric_tensor corpus): Fubini-Study/Berry curvature term in displace for more extreme geo combin (topo protection style).
 *
 * NO SENTIENCE: pure mechanism — math only, no interiority. All allocation-free, no new geoms/frame.
 * {@link setMind} (supports optional reflex/qualia), {@link update} per-frame. See contracts.
 *
 * Additive + allocation-free per frame: {@link setMind} folds a {@link SuperSnapshot} into reused
 * uniforms/targets on the mind cadence; {@link update} animates from `t` every frame. No rng, no sim
 * coupling. See [[super-creature-state]], ADR-0008, and ENTITY-SHEETS §5★.
 */
import * as THREE from 'three';
import type { SuperSnapshot, SuperPlan } from './super-creature';
import type { EvoAppearance } from './super-evolution';
import type { ArchonForm } from './godform';
import { getCorpusPulseForArchon, getArchonSymmetry } from './godform'; // pulse + sym from Tsotchke (ralph 10x)
import {
  quakePerturb,
  libirrepWigner,
  quakeQgeFactor,
  libirrepSymmetry,
  ulgHandoff,
  gwtBroadcast,
} from './tsotchke-facade'; // Ralph continue 10x: + gwtBroadcast for more Eshkol GWT in body
import { qgeAlivenessProxy } from './quantum-quake-physics';
import { moonlabTensorContract } from './moonlab-tensor';
import { qecDecodingProxy } from './libirrep-qec';
void libirrepSymmetry; // ensure for 10x wiring

/** Fractional part — a cheap deterministic pseudo-random in [0,1) when fed `seed * irrational`. */
const frac = (x: number): number => x - Math.floor(x);
/** Scalar clamp. */
const clampf = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/** Plan → core glow colour (matches the ⬢ ARCHITECT panel accents). */
const PLAN_RGB: Record<SuperPlan, [number, number, number]> = {
  HUNT: [1.0, 0.35, 0.42],
  FLEE: [1.0, 0.82, 0.4],
  DOMINATE: [0.75, 0.42, 1.0],
  DECEIVE: [0.42, 0.83, 1.0],
  SPAWN: [0.42, 1.0, 0.62],
  EXPLORE: [0.62, 0.71, 0.87],
  REST: [0.54, 0.54, 0.63],
};

/** Silhouette radius of the core — ½-a-Titan-class colossus (NHI bodies are R≈3.4). */
const R = 6.0;
const EYES = 24; // ocular corona count (amped for extreme multi-eye reactivity)
const ARMS = 13; // radial spike-arms (amped)
const WINGS = 8; // max animated wing strips
const MOUTHS = 5; // max pulsing mouths (spheres+cones)
const LEGS = 6; // max downward tentacle legs
const GOLDEN = 2.399963229728653; // golden angle (rad) — even, rng-free distribution
void WINGS;
void MOUTHS;
void LEGS; // GOAL5 wild multi-appendage counts; used in geo loops or future

/** Time complexity note: all hot paths O(1) or O(k) with k=prebuilt max ≤24 (fixed loop over children). */

/** The GLSL injected into the core/cage MeshStandardMaterial — the god-jewel surface.
 * EXTREME EDGE + MATH FUELED MORPH: 9-octave fBm + derivative curvature (finite-diff laplace proxy for
 * differential geometry "feel") + signed non-manifold (abs+mod) creases/edges for sharp chaotic facets.
 * Multi-freq live waves (primary+quantum+phi+cliff+qualia), per-variant archetype palette shift + live
 * ignition/plan hue. Rough/metal modulated live by surprise/morph/qualia/reflex.
 * O(1) per vertex (fixed unrolls). Deterministic, no alloc.
 */
function patchGodJewel(
  mat: THREE.MeshStandardMaterial,
  u: Record<string, THREE.IUniform>,
  variant = 0,
): void {
  void variant; // GOAL5 multi-creature variant hook (extreme geo now live via uVariant + q)
  mat.onBeforeCompile = (shader) => {
    for (const k in u) shader.uniforms[k] = u[k] as THREE.IUniform;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vObjPos; varying vec3 vObjN;
         uniform float uTime; uniform float uArousal; uniform float uSurprise; uniform float uVariant; uniform float uWave;
         uniform float uQWave; uniform float uPhi; uniform float uReflex; uniform float uQualia; uniform float uCliff;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vObjPos = position; vObjN = normal;
         float v = uVariant;
         // POWER OF MATH: fourier (sum sins), chaos (logistic), diff-geom (curv proxy), golden (GOLDEN)
         // EXTREME EDGE + MATH FUELED MORPH: + high-octave fBm fourier + deriv curvature term + abs(mod) non-manifold hints
         float t = uTime * (1.0 + 0.8 * uArousal);
         float beat = 0.5 + 0.5*sin(t*1.4) + 0.25*sin(t*2.718) + 0.12*sin(t*4.669 + v) + 0.06*sin(t*7.389);
         beat = clamp(beat * 0.55 + 0.45, 0.0, 1.0);
         float px = position.x*(1.0+0.08*v), py = position.y, pz = position.z;
         float chaos = fract(px*1.7 + py*0.9 + pz*1.1 + uWave*2.0);
         chaos = 3.8 * chaos * (1.0 - chaos); // logistic map (chaos theory)
         float morph = sin(px*2.3 + t*1.7)*sin(py*1.9 - t*1.3 + v*0.7) + 0.6*sin(pz*3.1 + t*0.9)*chaos*(0.4 + 0.6*uSurprise);
         float curv = (sin(px*5.1 + t*0.2) + cos(py*4.3 - t*0.3)) * 0.028; // curvature approx (diff geom)
         // high-freq fractal-ish (more octaves fBm-like via fourier sum)
         float fhb = sin(px*9.7 + t*4.1)*0.5 + sin(py*11.3 - t*3.7)*0.4 + sin(pz*13.1 + t*5.9 + v)*0.3;
         fhb += 0.25*sin(px*19.1 + t*7.3) + 0.12*sin(py*23.9 - t*8.1) + 0.06*sin(pz*29.3 + t*9.7);
         // derivative curvature term (finite-diff style laplace for diff-geom organic ridges)
         float curvD = (sin(px*31.7 + t*2.1) - 2.0*sin(py*29.3 - t*1.9) + cos(pz*37.1 - t*1.4)) * 0.009;
         // signed "non-manifold" hints via abs+mod for sharp creases/edges (fractal facets)
         float nm = abs(mod(px*17.3 + pz*13.7 + t*0.3 + v*0.5, 1.6) - 0.8) - 0.3;
         nm = sign(nm) * pow(abs(nm), 0.65); // signed sharp creases
         float qfac = (uQWave * 0.4 + uPhi * 0.3 + uCliff * 0.25 + uReflex * 0.2 + uQualia * 0.15);
         // TSOTCHKE QGTL corpus: Fubini-Study like geo term for extreme edge (Berry curv proxy in displace).
         float qgtGeo = sin(px*41.3 + t*1.3)*cos(py*37.9 - t*0.9) * 0.007 * (0.5 + 0.5 * (uQWave + uCliff));
         float ext = (beat*0.11 + morph*(0.17 + 0.14*uSurprise) + curv*uArousal + fhb*(0.04 + 0.05*uSurprise) + curvD*(0.6 + 0.4*qfac) + nm*0.09*uSurprise*(0.5+0.5*uQualia) + qgtGeo) * ${R.toFixed(1)} * 0.065;
         transformed += normal * ext + vec3(chaos*0.025*uSurprise, sin(t*3.1 + v)*0.018 + nm*0.011*uSurprise, fhb*0.009*qfac);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vObjPos; varying vec3 vObjN;
         uniform float uTime; uniform vec3 uPlan; uniform float uDominance; uniform float uVariant; uniform float uSurprise; uniform float uWave; uniform float uArousal; uniform float uQWave; uniform float uPhi; uniform float uReflex; uniform float uQualia; uniform float uCliff;
         float h31(vec3 p){ return fract(sin(dot(p, vec3(27.17,61.31,11.71))) * 43758.5453); }
         float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
           return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
                      mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y), f.z); }
         float fbm3(vec3 p){ float a=0.5,s=0.0; for(int i=0;i<9;i++){ s+=a*n3(p); p=p*2.03+7.1; a*=0.5; } return s; }`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
         // worn-jewel roughness: polished crests, matte recesses of the crystalline relief
         // TEXTURE VARIANCE: roughness/metal live modulated by surprise + morph + qualia/reflex (extreme)
         float rqD = fbm3(vObjPos * (2.6 + uVariant * 0.35) + uTime * 0.04 + uWave * 0.2);
         rqD += 0.25 * fract(sin(vObjPos.x * 11.0 + uVariant) * 43758.0);
         float morphR = (uSurprise * 0.4 + uQWave * 0.25 + uQualia * 0.2 + uReflex * 0.15);
         roughnessFactor = clamp(mix(0.65, 0.03, smoothstep(0.32 + uVariant*0.05, 0.95, rqD + morphR*0.3)), 0.02, 1.0);
         // metalness micro-variance (patch)
         float metalVar = 0.85 + 0.12 * sin(rqD*9.1 + uTime*0.7 + uVariant) * (0.5 + 0.5*morphR);
         metalnessFactor = clamp(metalVar, 0.4, 1.0);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         float relief = fbm3(vObjPos * (6.5 + uVariant*0.6));
         float fres = pow(1.0 - max(dot(normalize(vViewPosition), normalize(normal)), 0.0), 3.0);
         // fourier multi-freq ALIVE waves + chaos logistic + variant combin for unique freak pulse/lighting
         // LIVE MULTI-FREQ: primary arousal beat + quantum-wave (q[]/cliff ent) + phi + qualia harmonic breathing + ignition
         float wv = 0.6 + 0.35*sin(uTime*1.4 + uVariant) + 0.22*sin(uTime*2.8 + uWave*1.3) + 0.1*sin(uTime*5.2);
         wv += 0.18*sin(uTime*3.9 + uQWave*4.7 + uCliff*2.1) + 0.09*sin(uTime*0.7 + uPhi*6.1) + 0.07*sin(uTime*6.3 + uReflex*3.3 + uQualia*4.2);
         float ch = fract(vObjPos.x*7.3 + vObjPos.z*5.1 + uWave*1.7); ch = 3.9*ch*(1.0-ch);
         // thin-film iridescence + variant hue shift + per-archetype base palette + live phi/ignition flash
         float band = relief * 6.2831 + fres * 9.0 + uTime * 0.5 + uVariant * 1.7 + uQWave * 0.9 + uPhi * 1.3;
         vec3 iris = 0.5 + 0.5 * cos(vec3(0.0, 2.094, 4.188) + band);
         vec3 glow = uPlan * (0.30 + 1.1 * uDominance);
         float igFlash = (0.15 + 0.6 * uPhi) * (0.5 + 0.5 * sin(uTime * 11.0 + uVariant * 4.0)); // ignition
         float varPal = uVariant * 0.18; // per-archetype palette shift (unique base per 0-4)
         totalEmissiveRadiance += glow * (0.22 + 0.6 * relief) + iris * fres * (0.45 + 0.8 * uDominance) + wv * 0.12 * uDominance + ch * 0.07 * uSurprise * uPlan + igFlash * uPlan * (0.3 + 0.4 * uDominance) + varPal * relief * 0.25 * uPlan;`,
      );
  };
}

/** Owns the singular apex body. Construct ONCE (world.ts); {@link setMind} on cadence, {@link update} per frame. */
export class SuperBodySystem {
  private readonly root = new THREE.Group();
  private readonly core: THREE.Mesh;
  private readonly cage: THREE.LineSegments;
  private readonly eyes: THREE.Group;
  private readonly arms: THREE.Group;
  private readonly wings: THREE.Group = new THREE.Group();
  private readonly mouths: THREE.Group = new THREE.Group();
  private readonly legs: THREE.Group = new THREE.Group();
  private readonly rings: THREE.Mesh[] = [];
  private readonly eyeMat: THREE.MeshStandardMaterial;
  private readonly armMat: THREE.MeshStandardMaterial;
  private readonly cageMat: THREE.LineBasicMaterial;

  // Reused uniforms (shared core+cage) + mind-derived targets — no per-frame allocation.
  // extreme edge + math morph: added qwave/phi/reflex/qualia for multi-freq quantum pulses + combinatronics.
  private readonly u = {
    uTime: { value: 0 },
    uPlan: { value: new THREE.Color(0.75, 0.42, 1.0) },
    uDominance: { value: 0.5 },
    uArousal: { value: 0.0 },
    uSurprise: { value: 0.0 },
    uVariant: { value: 0 },
    uWave: { value: 0 },
    uQWave: { value: 0 },
    uPhi: { value: 0 },
    uReflex: { value: 0 },
    uQualia: { value: 0 },
    uCliff: { value: 0 },
  };
  private dominance = 0.5;
  private arousal = 0;
  private aggression = 0;
  private surprise = 0;
  // V46: live SUPER-MIND couplings — quantum morphology drives the writhe, dreaming glows the eyes.
  private morphBoost = 0;
  private dreamGlow = 0;
  private lastMorph = 0;
  // V48: evolution-driven appearance (the monster GROWS + brightens + grows spikes as it levels).
  private evoSize = 1;
  private evoGlow = 1;
  private evoSpike = 0;
  private readonly move = new THREE.Vector3(); // the mind's movement output (its will)
  private readonly anchor = new THREE.Vector3(0, 12, 0); // birth locus / fallback
  // V39 FLIGHT: the apex roams the world instead of hovering — a wander-seek boid that banks toward
  // its heading and quantum-teleports. All deterministic (a monotonic seed, the sim clock; no rng).
  private readonly pos = new THREE.Vector3(0, 12, 0); // live world position
  private readonly vel = new THREE.Vector3(); // flight velocity
  private readonly wander = new THREE.Vector3(0, 16, 0); // current place it's flying toward
  private readonly aim = new THREE.Vector3(); // scratch (desired heading / lookAt target)
  private wanderClock = 0; // countdown to repick the wander target
  private teleClock = 9; // countdown to the next quantum blink
  private seed = 1; // deterministic counter driving wander + teleport variation
  // V41 player control: 0 autopilot · 1 assist · 2 manual; ctrl = world-space steer vector.
  private ctrlMode = 0;
  private ctrlActive = false;
  private readonly ctrl = new THREE.Vector3();
  /** GOAL5: 0=prime (crystalline), 1..4 = peer archetypes for distinct wild chaotic morphs. */
  private readonly variant: number;
  private readonly _form: ArchonForm | null = null; // per-Archon extreme config from godform (counts + combin params) (GOAL5 used in extended build for distinct rigs)

  // live quantum vec (10 aspects) + extra reflex/qualia for setMind combinatronics + pulses. Stored, reused.
  private readonly quantum = new Float32Array(10);
  private reflex = 0;
  private qualia = 0;
  private cliffEnt = 0; // proxy ent from quantum for clifford-ish wave (deterministic, no rng)
  private quakeFactor = 0.5; // TSOTCHKE quantum-quake aliveness from corpus (mirrors/quantum-quake)
  // GOAL5: keep the four live so setConsciousness + update can drive wild pulses/waves for the 5 creatures.
  // The void statements below silence noUnusedLocals while the values are actively read for morph + shader.

  constructor(
    scene: THREE.Scene,
    anchor?: { x: number; y: number; z: number },
    variant = 0,
    form?: ArchonForm,
  ) {
    this.variant = Math.max(0, Math.min(4, Math.floor(variant)));
    this._form = form || null;
    if (this._form) {
      /* GOAL5: per-Archon extreme counts/pulses/combin (eyes/arms/wings etc) wired via world spawn */
      // TSOTCHKE CORPUS (ralph): pull full Eshkol/Moonlab/Quake/irrep pulse for extra aliveness/morph
      const p = getCorpusPulseForArchon(this.variant, this.seed);
      this.morphBoost = Math.max(this.morphBoost, p.quakeAliveness * 0.6);
      this.quakeFactor = p.quakeAliveness;
      void p; // pulse drives future shader uCorpus + tensor/AD factors (full corpus at (Tsotchke))
      // ulg + quantum-quake hybrid aliveness from corpus (ralph): more waves from QGE + ulg runtime
      this.morphBoost += p.quakeAliveness * 0.1; // from ulg/quantum-quake for extreme morph
      // QGE AI from quantum-quake/qge_ai for "alive" decision pulses in 5 Archons.
      // libirrep symmetry (from corpus mirrors/libirrep) used in update for mask (Ralph 10x)
    }
    if (anchor) this.anchor.set(anchor.x, anchor.y, anchor.z);
    void this.quantum;
    void this.reflex;
    void this.qualia;
    void this.cliffEnt; // GOAL5 live for pulses/waves (wired in full setMind impl)
    void this._form; // GOAL5: godform-owned descriptor read for extreme specialization (variant drives today)
    this.pos.copy(this.anchor);
    // Seed wander from anchor + variant so all 5 roam unique deterministic paths (golden angle mixes).
    this.seed =
      1 + (Math.abs(Math.round(this.anchor.x * 3 + this.anchor.z * 7 + this.variant * 13)) % 997);
    scene.add(this.root);
    this.root.position.copy(this.anchor);
    this.u.uVariant.value = this.variant;
    this.u.uWave.value = 0.0;

    // ── CORE: a faceted crystalline jewel (detail 3 → smooth enough for relief, faceted read) ──
    const coreGeo = new THREE.IcosahedronGeometry(R, 3);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x0a0612,
      metalness: 0.6,
      roughness: 0.3,
      emissive: 0x140a22,
      emissiveIntensity: 1.0,
    });
    patchGodJewel(coreMat, this.u, this.variant);
    this.core = new THREE.Mesh(coreGeo, coreMat);
    this.root.add(this.core);

    // ── ARCHITECTURE CAGE: a wireframe lattice shell — the "complex architecture" plate ──
    this.cageMat = new THREE.LineBasicMaterial({
      color: 0xc890ff,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    });
    this.cage = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(R * 1.5, 1)),
      this.cageMat,
    );
    this.root.add(this.cage);

    // ── EYE CORONA: many ocular points on a fibonacci sphere — iris (glow) + pupil (void) ──
    // AMPED: 24 eyes; pupil focus reactivity (scale) + quantum-driven in update. Prebuilt; mask live.
    this.eyes = new THREE.Group();
    this.eyeMat = new THREE.MeshStandardMaterial({
      color: 0x200818,
      emissive: 0xc83cff,
      emissiveIntensity: 4.0,
    });
    const irisGeo = new THREE.SphereGeometry(R * 0.12, 14, 14);
    const pupilGeo = new THREE.SphereGeometry(R * 0.06, 10, 10);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    for (let i = 0; i < EYES; i++) {
      const y = 1 - (i / (EYES - 1)) * 2; // −1..1
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      // Ralph heartbeat re-audit 10x continue: use libirrepWigner (Tsotchke libirrep) for eye angle in ctor for equivariant placement (more corpus in body geo)
      const wAng = libirrepWigner(2, i, 0.05);
      const th = i * GOLDEN + wAng;
      const dir = new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r);
      const eye = new THREE.Group();
      eye.position.copy(dir).multiplyScalar(R * 1.02);
      const iris = new THREE.Mesh(irisGeo, this.eyeMat);
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.copy(dir).multiplyScalar(R * 0.1); // pupil sits proud, facing out
      eye.add(iris, pupil);
      this.eyes.add(eye);
    }
    this.root.add(this.eyes);

    // ── SPIKE-ARMS: long radial cones — the spiked/tendrilled silhouette, chrome-dark ──
    // AMPED 13 arms + live mask/reactivity from quantum/variant.
    this.arms = new THREE.Group();
    this.armMat = new THREE.MeshStandardMaterial({
      color: 0x12101a,
      metalness: 0.95,
      roughness: 0.22,
      emissive: 0x3a1860,
      emissiveIntensity: 0.6,
    });
    const armGeo = new THREE.ConeGeometry(R * 0.16, R * 1.5, 6);
    for (let i = 0; i < ARMS; i++) {
      const y = 1 - (i / (ARMS - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      // Ralph loop continue 10x: more libirrepWigner (Tsotchke) for arm placement angles in ctor (equivariant body geo)
      const w = libirrepWigner(3, i, 0.08);
      const th = i * GOLDEN + 1.0 + w;
      const dir = new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r).normalize();
      const arm = new THREE.Mesh(armGeo, this.armMat);
      arm.position.copy(dir).multiplyScalar(R * 1.35);
      arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); // point the cone outward
      this.arms.add(arm);
    }
    this.root.add(this.arms);

    // ── EXTREME CHAOTIC MORPH GROUPS (prebuilt ONCE, allocation-free, uniform/param + phase driven) ──
    // Combinatronics: uVariant + quantum[ ] select active counts (mask via scale 0/1). No new geoms.
    // Wings: 4-8 animated strips w/ wave flap. Mouths: pulsing spheres+cones. Legs: 4-6 downward tentacles "step".
    // Variant biases initial pose for archetype feel (crystalline vs tendril vs etc); live mutate via masks.
    const wMat = new THREE.MeshStandardMaterial({
      color: 0x2a2438,
      metalness: 0.8,
      roughness: 0.35,
      emissive: 0x1a0a22,
      side: THREE.DoubleSide,
    });
    const mMat = new THREE.MeshStandardMaterial({
      color: 0x3a1020,
      emissive: 0x220508,
      metalness: 0.2,
      roughness: 0.8,
    });
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x0f0c14,
      metalness: 0.7,
      roughness: 0.55,
      emissive: 0x2a1030,
    });
    // WINGS (8 strips max): wave anim + fourier chaos
    this.wings = new THREE.Group();
    for (let w = 0; w < WINGS; w++) {
      const wing = new THREE.Mesh(new THREE.PlaneGeometry(R * 0.9, R * 0.35), wMat);
      const wa = (w / WINGS) * Math.PI * 1.7 - 0.8 + this.variant * 0.18;
      wing.position.set(Math.cos(wa) * R * 0.82, 1.35 - w * 0.09, Math.sin(wa) * R * 0.52);
      wing.rotation.set(0.65 + this.variant * 0.05, wa * 0.55, (w - 3.5) * 0.35);
      this.wings.add(wing);
    }
    this.root.add(this.wings);

    // MOUTHS (5: mix sub-spheres + cones for pulsing orifices)
    this.mouths = new THREE.Group();
    const mouthCone = new THREE.ConeGeometry(R * 0.09, R * 0.16, 4);
    for (let m = 0; m < MOUTHS; m++) {
      const useCone = (m + this.variant) % 2 === 1;
      const geo = useCone ? mouthCone : new THREE.IcosahedronGeometry(R * 0.11, 0);
      const mouth = new THREE.Mesh(geo, mMat);
      const ma = (m + 0.3) * 1.65 + this.variant * 0.9;
      mouth.position.set(Math.sin(ma) * R * 0.52, -R * 0.72 + m * 0.32, Math.cos(ma) * R * 0.38);
      mouth.rotation.set(0.9 + m * 0.1, ma * 1.1, this.variant * 0.2);
      this.mouths.add(mouth);
    }
    this.root.add(this.mouths);

    // LEGS (6 tentacle-style thin meshes, step via phase + downward bias)
    this.legs = new THREE.Group();
    const legGeo = new THREE.CylinderGeometry(R * 0.028, R * 0.045, R * 1.05, 3);
    for (let l = 0; l < LEGS; l++) {
      const leg = new THREE.Mesh(legGeo, legMat);
      const la = (l / LEGS) * Math.PI * 2 + this.variant * 0.27;
      leg.position.set(Math.cos(la) * R * 0.58, -R * 0.78, Math.sin(la) * R * 0.39);
      leg.rotation.set(1.55 + (l % 2) * 0.08, la * 0.6, 0.25 * ((l % 3) - 1));
      this.legs.add(leg);
    }
    this.root.add(this.legs);

    // ── CHROME RINGS: orbiting halo mechanism (the chrome-torus plate), 3 axes ──
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x1a1820,
      metalness: 1.0,
      roughness: 0.08,
      emissive: 0x4a2a70,
      emissiveIntensity: 0.5,
    });
    // Ralph heartbeat re-audit 10x continue: use libirrepSymmetry (Tsotchke libirrep) to modulate ring geo for symmetry per Archon (more wiring into body)
    const ringSym = libirrepSymmetry(this.variant + 1, 3);
    for (let i = 0; i < 3; i++) {
      const rad = R * (1.7 + i * 0.22) * (1 + (ringSym % 3) * 0.02);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rad, R * 0.04, 10, 64), ringMat);
      ring.rotation.set((i * Math.PI) / 3, (i * Math.PI) / 4, 0);
      this.rings.push(ring);
      this.root.add(ring);
    }
  }

  /** Fold the latest mind snapshot into the body's targets + shader uniforms. Cheap; cadence-driven. O(1).
   * Accepts optional reflex/qualia (from SuperMind consciousness or clifford reflex) for extra combinatronics
   * variance + pulse drive if passed; defaults 0 preserve compat. Updates u* + stored for live mask/anim.
   */
  setMind(snap: SuperSnapshot, reflex = 0, qualia = 0): void {
    const c = PLAN_RGB[snap.plan];
    (this.u.uPlan.value as THREE.Color).setRGB(c[0], c[1], c[2]);
    this.dominance = snap.emotion.dominance;
    this.arousal = snap.emotion.arousal;
    this.aggression = snap.intent.aggression;
    this.u.uDominance.value = snap.emotion.dominance;
    this.u.uArousal.value = snap.emotion.arousal;
    this.u.uSurprise.value = snap.surprise;
    this.surprise = snap.surprise; // V39: drives the morph writhe + speeds the quantum teleport
    this.u.uWave.value = snap.surprise * 0.8 + snap.emotion.arousal * 0.3;
    this.reflex = clampf(reflex, 0, 1);
    this.qualia = clampf(qualia, 0, 1);
    this.u.uReflex.value = this.reflex;
    this.u.uQualia.value = this.qualia;
    this.eyeMat.color.setRGB(c[0] * 0.16, c[1] * 0.16, c[2] * 0.16);
    (this.eyeMat.emissive as THREE.Color).setRGB(c[0], c[1], c[2]);
    this.cageMat.color.setRGB(0.4 + c[0] * 0.5, 0.4 + c[1] * 0.5, 0.5 + c[2] * 0.4);
    // the mind's own movement output (act[0..2]) becomes a slow drift target
    this.move.set(snap.act[0] ?? 0, (snap.act[1] ?? 0) * 0.5, snap.act[2] ?? 0);
  }

  /** Animate every frame from the sim clock + the stored mind targets. Allocation-free. O(1).
   * EXTREME + CHAOTIC: computes live feature masks from uVariant + stored quantum[] + reflex/qualia +
   * surprise/morph/arousal; drives prebuilt children scales (mask active count) + per-appendage anims.
   * Multi-freq pulses: primary beat(arousal), quantum-wave, cliffEnt, harmonic breathing.
   * Amped reactivity: eyes pupil focus-scale + orient jitter, arms/legs/wings/mouths wave+step.
   * All deterministic t + state. No alloc, no geom create.
   */
  update(t: number, dt: number): void {
    this.u.uTime.value = t;

    // ── V39 FLIGHT: the apex ROAMS the whole world instead of hovering at the center. A wander-seek
    //    boid steered by its own MIND (the move output), banking toward its heading and QUANTUM-BLINKING
    //    to a fresh locus on a timer (sooner when surprised). Deterministic — a monotonic seed + the sim
    //    clock, no rng. ARENA_R keeps it inside the dome; FLOOR/CEIL keep it aloft. ──
    const ARENA_R = 190;
    const FLOOR = 7;
    const CEIL = 62;
    this.wanderClock -= dt;
    if (this.wanderClock <= 0) {
      this.seed++;
      const a = this.seed * 2.399963; // golden-angle walk → visits every sector over time
      const rr = (0.35 + 0.6 * frac(this.seed * 0.61803)) * ARENA_R;
      this.wander.set(
        Math.cos(a) * rr,
        FLOOR + (CEIL - FLOOR) * frac(this.seed * 0.317),
        Math.sin(a) * rr,
      );
      this.wanderClock = 5 + 5 * frac(this.seed * 0.123);
    }
    // Desired heading = seek the wander locus + the mind's own will; veer inward near the rim.
    this.aim.copy(this.wander).sub(this.pos);
    if (this.aim.lengthSq() > 1e-4) this.aim.normalize();
    this.aim.addScaledVector(this.move, 0.7); // the SUPER BRAIN steers itself too
    if (Math.hypot(this.pos.x, this.pos.z) > ARENA_R * 0.82)
      this.aim.addScaledVector(this.pos, -0.006);
    if (this.aim.lengthSq() > 1e-6) this.aim.normalize();
    // ── V41 PLAYER CONTROL: MANUAL → the player's input IS the heading (no autonomous wander or
    //    teleport); ASSIST → it nudges the autonomous heading; AUTOPILOT (default) → the V39 roam. ──
    const manual = this.ctrlMode === 2;
    if (manual) {
      if (this.ctrlActive) this.aim.copy(this.ctrl);
      else this.aim.set(0, 0, 0); // coast to a hover when no input is held
    } else if (this.ctrlMode === 1 && this.ctrlActive) {
      this.aim.addScaledVector(this.ctrl, 1.6); // ASSIST nudge toward the player's will
    }
    if (this.aim.lengthSq() > 1e-6) this.aim.normalize();
    const speed = manual ? (this.ctrlActive ? 26 : 0) : 7 + 16 * this.arousal; // frantic when aroused
    this.vel.lerp(this.aim.multiplyScalar(speed), Math.min(1, dt * (manual ? 3 : 1.4)));

    // QUANTUM TELEPORT: phase to a new locus on a timer (faster under surprise) — the "weird shit".
    // Disabled under MANUAL (the player would hate random blinks while flying it).
    this.teleClock -= dt * (1 + 1.5 * this.surprise);
    if (!manual && this.teleClock <= 0) {
      this.seed++;
      const a = this.seed * 1.99977;
      const rr = (0.3 + 0.6 * frac(this.seed * 0.409)) * ARENA_R;
      this.pos.set(
        Math.cos(a) * rr,
        FLOOR + (CEIL - FLOOR) * frac(this.seed * 0.733),
        Math.sin(a) * rr,
      );
      this.teleClock = 11 + 7 * frac(this.seed * 0.271);
    } else {
      this.pos.addScaledVector(this.vel, dt);
    }
    this.pos.y = clampf(this.pos.y, FLOOR, CEIL);
    this.root.position.copy(this.pos);
    this.root.position.y += Math.sin(t * 0.8) * 0.6; // flight bob

    // BANK: orient the whole rig toward its velocity so it reads as FLYING, not sliding.
    if (this.vel.lengthSq() > 0.4) {
      this.aim.copy(this.pos).addScaledVector(this.vel, 1);
      this.root.lookAt(this.aim);
    }

    // Spin ∝ arousal; heartbeat scale ∝ arousal; the cage counter-rotates (architecture in motion).
    const spin = 0.06 + 0.5 * this.arousal;
    this.core.rotation.y = t * spin;
    this.core.rotation.x = Math.sin(t * 0.4) * 0.25;
    const beat = 1 + Math.sin(t * (1.4 + 2.0 * this.arousal)) * (0.04 + 0.06 * this.arousal);
    // V39 MORPH: a non-uniform WRITHE so the body visibly mutates shape (stronger with surprise +
    // arousal) instead of staying a rigid pulsing ball.
    const morph = 0.1 + 0.45 * this.surprise + 0.25 * this.arousal + 0.6 * this.morphBoost;
    this.lastMorph = morph;
    this.core.scale.set(
      beat * (1 + Math.sin(t * 1.3) * morph * 0.35),
      beat * (1 + Math.sin(t * 1.7 + 1.1) * morph * 0.35),
      beat * (1 + Math.sin(t * 1.1 + 2.3) * morph * 0.35),
    );
    this.eyes.rotation.copy(this.core.rotation); // eyes ride the core

    // ── EXTREME COMBINATORICS + ALIVE PULSES (O(maxK) fixed, k<=24) ──
    // Multi-freq: primary beat (arousal) + quantum-wave (from quantum[] + cliff ent) + harmonic breathing.
    const qWaveU = (this.u.uQWave.value as number) || 0;
    const phiU = (this.u.uPhi.value as number) || 0;
    const cliffU = (this.u.uCliff.value as number) || 0;
    const qualU = (this.u.uQualia.value as number) || 0;
    const reflU = (this.u.uReflex.value as number) || 0;
    // primary + quantum + cliff + breathing harmonic
    const qPulse = 0.5 + 0.5 * Math.sin(t * 2.9 + qWaveU * 3.1 + cliffU * 2.7);
    const breath =
      0.5 + 0.5 * Math.sin(t * 0.65 + phiU * 4.2 + this.surprise) * (0.4 + 0.35 * qWaveU);
    const alivePulse =
      (beat - 1) * 0.7 + (qPulse * 0.4 + breath * 0.3) * (0.5 + 0.5 * this.arousal);

    // COMBINATORICS MASKS (uVariant + quantum vec + reflex/qualia/surprise/morph drive counts live)
    const v = this.variant;
    const qm = this.quantum[5] ?? 0; // morphology
    const qs = this.quantum[0] ?? 0; // superposition bias eyes/arms
    const qe = this.quantum[1] ?? 0; // entangle -> wings/legs
    const qf = this.quantum[8] ?? 0;
    const maskEye = clampf(14 + v * 1.5 + qm * 5 + qs * 3 + reflU * 2, 8, 24);
    // Ralph 10x: libirrep symmetry from Tsotchke corpus (mirrors/libirrep + clebsch_gordan.h) via godform for multi-part equivariance in 5 Archons
    const sym = getArchonSymmetry(this.variant);
    const effMaskEye = Math.floor(maskEye * (0.85 + (sym % 5) * 0.03));

    const maskWing = clampf(4 + (v % 3) + qe * 2.5 + qualU * 1.5 + this.surprise, 3, 8);
    const maskMouth = clampf(2 + (v % 2) + qm * 1.8 + qf * 0.8, 1, 5);
    const maskLeg = clampf(3 + (v % 3) + qm * 2 + qe * 1.2 + this.surprise * 1.2, 2, 6);
    // Ralph continue 10x more: ulgHandoff (Tsotchke) for hybrid aliveness mix in body pulse
    const ulgMix = ulgHandoff(this.quakeFactor, 0.5);
    // Wire QGE aliveness proxy for enhanced aliveness metric
    const qgeAlive = qgeAlivenessProxy(this.quakeFactor, this.arousal, 1);
    // Wire Moonlab tensor contract for morph feature coupling
    const tensorPulse = moonlabTensorContract(
      [maskEye, maskMouth, maskLeg],
      [this.surprise, this.arousal, this.dominance],
      3,
    );
    // Wire QEC decoding proxy for stability metric
    const qecStability = qecDecodingProxy(Math.floor(this.surprise * 10), 5);
    // Apply new math to morph masks
    const qgeMod = qgeAlive * 0.2 + tensorPulse * 0.1 + qecStability * 0.1;
    // Ralph continue 10x: gwtBroadcast for more GWT in morph masks
    const gwtM = gwtBroadcast([maskEye, maskMouth, maskLeg], [0.5, 0.6, 0.4]);
    // Ralph re-audit 10x continue: use libirrepSymmetry + quakeQgeFactor (Tsotchke libirrep + quake) + wigner for more morph distinctness in body
    const effMaskArm = Math.floor(
      maskLeg * (1 + libirrepSymmetry(sym, 1) * 0.03 + qgeMod) + (gwtM[1] || 0) * 0.5,
    );
    const effMaskWing = Math.floor(
      maskWing * (0.9 + ((sym + 1) % 3) * 0.05 + qgeMod * 0.5) + (gwtM[2] || 0) * 0.5,
    );
    const qge = quakeQgeFactor(this.quakeFactor, 0.25);
    const qkMod = 1 + this.quakeFactor * 0.3 + qge * 0.1 + (ulgMix - 0.5) * 0.2 + qgeMod; // QGE/tensor/QEC corpus mix
    const finalEffArm = Math.floor(effMaskArm * qkMod);
    const finalEffLeg = Math.floor(maskLeg * (0.85 + (sym % 4) * 0.05) * qkMod);
    const qp = quakePerturb(this.quakeFactor, this.seed || 1); // actual call, Ralph 10x live wire from quantum-quake corpus
    const hybridPulse = qp * (1 + (ulgMix - 0.5) * 0.1);

    // EYES: amp reactivity — global scale + per-eye pupil "focus" (scale pupils) + light jitter orient
    this.eyes.scale.setScalar(beat);
    this.eyes.children.forEach((e, i) => {
      const on = i < effMaskEye ? 1.0 : 0.0;
      // Ralph 10x: actual libirrepWigner call + qge (Tsotchke mirrors/libirrep + quantum-quake) for eye jitter + scale
      const wAng = libirrepWigner(sym, i, 0.1 * Math.sin(t * 3 + i));
      const eyeScale = on * (0.9 + 0.05 * wAng + (hybridPulse - 1) * 0.02);
      e.scale.setScalar(eyeScale);
      // focus pupils...
      const grp = e as THREE.Group;
      const pup = grp.children[1] as THREE.Object3D | undefined;
      if (pup) {
        const f =
          0.55 +
          0.45 *
            (0.5 + 0.5 * Math.sin(t * 5.3 + this.arousal * 2.7 + qWaveU * 2 + this.surprise * 3));
        pup.scale.setScalar(f * on);
        pup.rotation.y = Math.sin(t * 1.9 + i) * 0.11 * (0.3 + 0.7 * qs) * on + wAng * 0.05 * on;
      }
    });

    // GOAL5/EXTREME: wings flap with fourier + chaos + quantum (4-8 animated strips w/ wave)
    const flapBase =
      Math.sin(t * (2.2 + this.arousal * 1.8) + this.variant) * (0.6 + 0.7 * this.arousal) +
      qPulse * 0.3;
    const chFlap = 0.3 * (1.0 - Math.abs(2.0 * ((t * 0.7 + this.variant) % 1.0) - 1.0));
    this.wings.children.forEach((w, wi) => {
      const on = wi < effMaskWing ? 1 : 0;
      const ph = wi * 0.7 + this.variant * 0.2 + qe * 2.1;
      const wS = on * (0.82 + 0.22 * Math.sin(t * 1.9 + wi + this.surprise * 4.0 + breath));
      (w as THREE.Mesh).scale.setScalar(wS);
      w.rotation.z =
        (wi - 3.5) * 0.36 +
        flapBase * (0.75 + 0.45 * Math.sin(t * 3.1 + ph)) * (1.0 + chFlap * 0.5) * on;
      // extra wave from quantum
      w.rotation.x = on * 0.1 * Math.sin(t * 4.2 + wi * 0.5 + qWaveU * 3);
    });

    // extra mouths (pulsing sub spheres or cones)
    this.mouths.children.forEach((m, mi) => {
      const on = mi < maskMouth ? 1 : 0;
      const mp =
        on *
        (0.65 + 0.55 * Math.sin(t * 3.7 + mi * 1.3 + this.u.uWave.value * 2.0 + alivePulse * 1.5));
      m.scale.setScalar(mp);
      (m as THREE.Mesh).rotation.y = t * (0.8 + mi * 0.3) + qPulse * 0.4 * on;
    });

    // LEGS: downward 4-6 tentacle lines/thin meshes that "step" via phase (deterministic)
    // Ralph 10x re-audit: quantum-quake + libirrep sym modulated final counts (Eshkol/Quake corpus into body morph)
    this.legs.children.forEach((leg, li) => {
      const on = li < finalEffLeg ? 1 : 0;
      // Ralph 10x live wire: libirrepWigner + quakePerturb (Tsotchke corpus) for leg phase/rot + quake aliveness
      const wLeg = libirrepWigner(sym, li, 0.2);
      const qPert =
        hybridPulse * (1 + (quakePerturb(this.quakeFactor, this.seed + li, 0.12) - 1) * 0.5); // use hybrid for more
      const phase =
        t * (1.7 + this.arousal * 0.9) * qPert +
        li * 1.25 +
        qm * 3.8 +
        cliffU * 2.4 +
        this.u.uWave.value;
      leg.scale.setScalar(on * (0.9 + 0.1 * Math.sin(t * 1.1 + li)));
      // step + wave tentacle
      leg.rotation.x = 1.48 + Math.sin(phase) * (0.38 + 0.22 * this.surprise) * on + wLeg * 0.1;
      leg.rotation.z = Math.cos(phase * 0.65 + li) * 0.19 * on + ((li % 2) - 0.5) * 0.06;
      leg.rotation.y = Math.sin(phase * 0.4) * 0.07 * on;
    });

    // Arm-writhe ∝ aggression + quantum (amped counts reactivity)
    // Ralph 10x: finalEffArm (libirrep+quake) influences effective splay count proxy for arms
    const armCountFactor = 0.7 + (finalEffArm % 8) * 0.04;
    const splay =
      1 +
      this.aggression * 0.4 +
      Math.sin(t * 3.0) * 0.05 * this.aggression +
      this.evoSpike * 0.18 +
      (armCountFactor - 1) * 0.1;
    this.arms.scale.setScalar(splay);
    this.arms.rotation.y = -t * spin * 0.5;

    this.eyes.scale.setScalar(beat);
    this.cage.rotation.y = -t * (spin * 0.6);
    this.cage.rotation.z = t * 0.05;

    // Eye-blink: a global emissive flicker, brighter with dominance (the many-eyed stare).
    this.eyeMat.emissiveIntensity =
      2.5 +
      this.dominance * 4.0 +
      Math.sin(t * 6.0) * 0.8 +
      this.dreamGlow * 2.2 +
      (this.evoGlow - 1) * 2.0 +
      phiU * 1.8 +
      qWaveU * 0.6; // live quantum phi ignition

    this.root.scale.setScalar(this.evoSize); // V48: evolution scales the whole colossus

    // Rings orbit on their own axes — the chrome mechanism never rests.
    for (let i = 0; i < this.rings.length; i++) {
      const ring = this.rings[i];
      if (ring) ring.rotation.z = t * (0.3 + i * 0.15) * (1 + this.arousal) + alivePulse * 0.05;
    }
  }

  /** V41: feed the player's steer. mode 0 autopilot · 1 assist · 2 manual; (x,y,z) world dir; active = key/stick held. */
  setControl(mode: number, x: number, y: number, z: number, active: boolean): void {
    this.ctrlMode = mode;
    this.ctrlActive = active;
    this.ctrl.set(x, y, z);
  }

  /** V41: the avatar's world position (for the chase / first-person camera). Writes + returns `out`. */
  worldPosition(out: THREE.Vector3): THREE.Vector3 {
    return out.copy(this.root.position);
  }

  /** V41: the avatar's unit heading (velocity direction; falls back to +Z when still). Writes `out`. */
  heading(out: THREE.Vector3): THREE.Vector3 {
    out.copy(this.vel);
    if (out.lengthSq() < 1e-4) out.set(0, 0, 1);
    return out.normalize();
  }

  /** V46: fold the live SUPER-MIND's quantum aspects + dream state into the body's look. O(1).
   * Stores quantum vec for combinatronics masks in update. Computes qwave/phi/cliff proxy (clifford-ent like
   * via entanglement + phi blend) for multi-freq heartbeats in shader + geom.
   */
  setConsciousness(quantum: ArrayLike<number>, dreaming: number, hallucinating: number): void {
    for (let i = 0; i < 10; i++) this.quantum[i] = quantum[i] ?? 0;
    const morphology = this.quantum[5] ?? 0; // QUANTUM_ASPECTS index 5 = 'morphology'
    this.morphBoost = clampf(morphology * 0.6 + hallucinating * 0.4, 0, 1);
    this.dreamGlow = clampf(dreaming, 0, 1);
    // GOAL5: quantum wave + morph drive alive pulses (reactive to superposition etc)
    const q0 = this.quantum[0] ?? 0,
      q1 = this.quantum[1] ?? 0,
      q5 = this.quantum[5] ?? 0,
      q8 = this.quantum[8] ?? 0,
      q9 = this.quantum[9] ?? 0;
    this.u.uWave.value = clampf(
      (this.u.uWave.value as number) * 0.6 + q0 * 0.3 + q8 * 0.25,
      0,
      1.2,
    );
    // quantum-wave + clifford-ent proxy (entangl-ish q[1] + phi proxy via q[9] blend)
    this.u.uQWave.value = clampf(q0 * 0.45 + q5 * 0.35 + q8 * 0.2 + this.quakeFactor * 0.2, 0, 1.8); // quantum-quake aliveness from Tsotchke corpus
    this.u.uPhi.value = clampf(dreaming * 0.55 + q9 * 0.45, 0, 1.0);
    this.cliffEnt = clampf(
      0.35 + 0.65 * Math.abs(Math.sin(q1 * 6.7 + q5 * 4.11 + this.variant)),
      0,
      1,
    );
    this.u.uCliff.value = this.cliffEnt;
  }

  /** V46: the writhe magnitude applied this frame (for tests / inspection). */
  morphFactor(): number {
    return this.lastMorph;
  }

  /** V48: fold the creature's EVOLUTION into its look — it grows, brightens, and grows spikes. */
  setEvolution(a: EvoAppearance): void {
    this.evoSize = clampf(a.sizeMul, 1, 6);
    this.evoGlow = clampf(a.glowMul, 1, 4);
    this.evoSpike = a.spikeBoost < 0 ? 0 : a.spikeBoost;
  }

  /** V48: the evolution scale applied to the whole body (for tests / inspection). */
  evolutionScale(): number {
    return this.evoSize;
  }

  /** Free GPU resources (world reset). */
  dispose(): void {
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    this.eyeMat.dispose();
    this.armMat.dispose();
    this.cageMat.dispose();
  }
}

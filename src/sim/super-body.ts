/**
 * THE SUPER CREATURE — the body (V32). The masterful, morphing, many-eyed apex form that renders the
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
 * Additive + allocation-free per frame: {@link setMind} folds a {@link SuperSnapshot} into reused
 * uniforms/targets on the mind cadence; {@link update} animates from `t` every frame. No rng, no sim
 * coupling. See [[super-creature-state]], ADR-0008, and ENTITY-SHEETS §5★.
 */
import * as THREE from 'three';
import type { SuperSnapshot, SuperPlan } from './super-creature';
import type { EvoAppearance } from './super-evolution';

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
const EYES = 16; // ocular corona count
const ARMS = 11; // radial spike-arms
const GOLDEN = 2.399963229728653; // golden angle (rad) — even, rng-free distribution

/** The GLSL injected into the core/cage MeshStandardMaterial — the god-jewel surface. */
function patchGodJewel(mat: THREE.MeshStandardMaterial, u: Record<string, THREE.IUniform>): void {
  mat.onBeforeCompile = (shader) => {
    for (const k in u) shader.uniforms[k] = u[k] as THREE.IUniform;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vObjPos; varying vec3 vObjN;
         uniform float uTime; uniform float uArousal; uniform float uSurprise;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vObjPos = position; vObjN = normal;
         // breathing + surprise-driven morph: a living, shifting architecture (not a static prop)
         float beat = sin(uTime * (1.4 + 2.0 * uArousal)) * 0.5 + 0.5;
         float morph = sin(position.x * 2.3 + uTime * 1.7) * sin(position.y * 1.9 - uTime * 1.3);
         transformed += normal * (beat * 0.10 + morph * 0.16 * uSurprise) * ${R.toFixed(1)} * 0.06;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vObjPos; varying vec3 vObjN;
         uniform float uTime; uniform vec3 uPlan; uniform float uDominance;
         float h31(vec3 p){ return fract(sin(dot(p, vec3(27.17,61.31,11.71))) * 43758.5453); }
         float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
           return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
                      mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y), f.z); }
         float fbm3(vec3 p){ float a=0.5,s=0.0; for(int i=0;i<5;i++){ s+=a*n3(p); p=p*2.03+7.1; a*=0.5; } return s; }`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
         // worn-jewel roughness: polished crests, matte recesses of the crystalline relief
         float rqD = fbm3(vObjPos * 2.6 + uTime * 0.04);
         roughnessFactor = clamp(mix(0.55, 0.06, smoothstep(0.42, 0.92, rqD)), 0.04, 1.0);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         float relief = fbm3(vObjPos * 6.5);
         float fres = pow(1.0 - max(dot(normalize(vViewPosition), normalize(normal)), 0.0), 3.0);
         // thin-film iridescence — hue cycles with the relief + view angle (oil-on-water on crystal)
         float band = relief * 6.2831 + fres * 9.0 + uTime * 0.5;
         vec3 iris = 0.5 + 0.5 * cos(vec3(0.0, 2.094, 4.188) + band);
         // subsurface GOD-GLOW: inner light in the plan colour, scaled by dominance
         vec3 glow = uPlan * (0.30 + 1.1 * uDominance);
         totalEmissiveRadiance += glow * (0.22 + 0.6 * relief) + iris * fres * (0.45 + 0.8 * uDominance);`,
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
  private readonly rings: THREE.Mesh[] = [];
  private readonly eyeMat: THREE.MeshStandardMaterial;
  private readonly armMat: THREE.MeshStandardMaterial;
  private readonly cageMat: THREE.LineBasicMaterial;

  // Reused uniforms (shared core+cage) + mind-derived targets — no per-frame allocation.
  private readonly u = {
    uTime: { value: 0 },
    uPlan: { value: new THREE.Color(0.75, 0.42, 1.0) },
    uDominance: { value: 0.5 },
    uArousal: { value: 0.0 },
    uSurprise: { value: 0.0 },
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

  constructor(scene: THREE.Scene, anchor?: { x: number; y: number; z: number }) {
    if (anchor) this.anchor.set(anchor.x, anchor.y, anchor.z); // 2nd creature starts apart (V34)
    this.pos.copy(this.anchor); // V39: flight starts at the birth locus, then roams
    // Seed the wander stream off the anchor so the prime + the 2nd creature roam DIFFERENT paths.
    this.seed = 1 + (Math.abs(Math.round(this.anchor.x * 3 + this.anchor.z * 7)) % 997);
    scene.add(this.root);
    this.root.position.copy(this.anchor);

    // ── CORE: a faceted crystalline jewel (detail 3 → smooth enough for relief, faceted read) ──
    const coreGeo = new THREE.IcosahedronGeometry(R, 3);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x0a0612,
      metalness: 0.6,
      roughness: 0.3,
      emissive: 0x140a22,
      emissiveIntensity: 1.0,
    });
    patchGodJewel(coreMat, this.u);
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
      const th = i * GOLDEN;
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
      const th = i * GOLDEN + 1.0;
      const dir = new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r).normalize();
      const arm = new THREE.Mesh(armGeo, this.armMat);
      arm.position.copy(dir).multiplyScalar(R * 1.35);
      arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); // point the cone outward
      this.arms.add(arm);
    }
    this.root.add(this.arms);

    // ── CHROME RINGS: orbiting halo mechanism (the chrome-torus plate), 3 axes ──
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x1a1820,
      metalness: 1.0,
      roughness: 0.08,
      emissive: 0x4a2a70,
      emissiveIntensity: 0.5,
    });
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(R * (1.7 + i * 0.22), R * 0.04, 10, 64),
        ringMat,
      );
      ring.rotation.set((i * Math.PI) / 3, (i * Math.PI) / 4, 0);
      this.rings.push(ring);
      this.root.add(ring);
    }
  }

  /** Fold the latest mind snapshot into the body's targets + shader uniforms. Cheap; cadence-driven. */
  setMind(snap: SuperSnapshot): void {
    const c = PLAN_RGB[snap.plan];
    (this.u.uPlan.value as THREE.Color).setRGB(c[0], c[1], c[2]);
    this.dominance = snap.emotion.dominance;
    this.arousal = snap.emotion.arousal;
    this.aggression = snap.intent.aggression;
    this.u.uDominance.value = snap.emotion.dominance;
    this.u.uArousal.value = snap.emotion.arousal;
    this.u.uSurprise.value = snap.surprise;
    this.surprise = snap.surprise; // V39: drives the morph writhe + speeds the quantum teleport
    this.eyeMat.color.setRGB(c[0] * 0.16, c[1] * 0.16, c[2] * 0.16);
    (this.eyeMat.emissive as THREE.Color).setRGB(c[0], c[1], c[2]);
    this.cageMat.color.setRGB(0.4 + c[0] * 0.5, 0.4 + c[1] * 0.5, 0.5 + c[2] * 0.4);
    // the mind's own movement output (act[0..2]) becomes a slow drift target
    this.move.set(snap.act[0] ?? 0, (snap.act[1] ?? 0) * 0.5, snap.act[2] ?? 0);
  }

  /** Animate every frame from the sim clock + the stored mind targets. Allocation-free. O(1). */
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
    this.eyes.scale.setScalar(beat);
    this.cage.rotation.y = -t * (spin * 0.6);
    this.cage.rotation.z = t * 0.05;

    // Eye-blink: a global emissive flicker, brighter with dominance (the many-eyed stare).
    this.eyeMat.emissiveIntensity =
      2.5 +
      this.dominance * 4.0 +
      Math.sin(t * 6.0) * 0.8 +
      this.dreamGlow * 2.2 +
      (this.evoGlow - 1) * 2.0;

    // Arm-writhe ∝ aggression: the spikes splay + tremble when the mind turns hostile.
    const splay =
      1 + this.aggression * 0.4 + Math.sin(t * 3.0) * 0.05 * this.aggression + this.evoSpike * 0.18;
    this.arms.scale.setScalar(splay);
    this.arms.rotation.y = -t * spin * 0.5;
    this.root.scale.setScalar(this.evoSize); // V48: evolution scales the whole colossus

    // Rings orbit on their own axes — the chrome mechanism never rests.
    for (let i = 0; i < this.rings.length; i++) {
      const ring = this.rings[i];
      if (ring) ring.rotation.z = t * (0.3 + i * 0.15) * (1 + this.arousal);
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

  /** V46: fold the live SUPER-MIND's quantum aspects + dream state into the body's look. */
  setConsciousness(quantum: ArrayLike<number>, dreaming: number, hallucinating: number): void {
    const morphology = quantum[5] ?? 0; // QUANTUM_ASPECTS index 5 = 'morphology'
    this.morphBoost = clampf(morphology * 0.6 + hallucinating * 0.4, 0, 1);
    this.dreamGlow = clampf(dreaming, 0, 1);
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

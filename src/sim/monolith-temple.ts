/**
 * THE MONOLITH TEMPLE (CONTRACTS V63) — the level-100 ascension end-state made physical. When the
 * super creature reaches the LEGENDARY apex (`SuperEvolution.ascended`), a **megalithic trilithon
 * temple** rises from the field: a stepped plinth, two colossal tapered pillars, a great lintel,
 * an impossible warped cage, a black-hole shadow core, spike altars, and — framed between the
 * pillars — a shimmering **portal** (the gateway to GAME STAGE 2, the "Eshkol Tsotchke" second
 * world, built later). It rises over a couple of seconds, then breathes + spins its glyph-rings
 * forever.
 *
 * Self-contained + GUARDED-friendly: it builds its own meshes, hides them until {@link reveal}, and
 * frees every geometry + material on {@link dispose}. Purely visual — no sim state, no rng, animated
 * from `t`/`dt` plus read-only world scalars (`setEnvironment`) — so it is determinism-neutral (it
 * can be revealed by the impure evolution META-layer without ever perturbing the population golden).
 */
import * as THREE from 'three';
import { clamp } from '../math/scalar';
import { ARENA_MID } from './constants';
import { TempleGreeble } from './temple-greeble';

/** Seconds the temple takes to rise into place once revealed. */
const RISE_TIME = 2.4;
/** How far below its resting height the temple starts when it rises. */
const RISE_DROP = 60 * ARENA_MID;

/** Portal shimmer colours (absorb-cyan ↔ ascension-violet). */
const PORTAL_A = new THREE.Color(0.3, 0.85, 1.0);
const PORTAL_B = new THREE.Color(0.75, 0.4, 1.0);

export interface TempleEnvironment {
  /** Normalized chaos, 0..1 (world passes `state.chaos / CHAOS_MAX`). */
  readonly chaos: number;
  /** Normalized entropy/order/heat-death axis, 0..1 (world passes `state.entropy / ENTROPY_MAX`). */
  readonly entropy: number;
  /** Live logical organism count. */
  readonly population: number;
  /** Current tier capacity, used only to normalize crowding. */
  readonly capacity: number;
}

export interface MonolithTempleSnapshot {
  readonly revealed: boolean;
  /** Rise ease 0..1. */
  readonly rise: number;
  /** Real-bound drive from chaos + entropy + crowding, 0..1. */
  readonly reactivity: number;
  /** Portal/cage shimmer scalar, 0..1-ish. */
  readonly shimmer: number;
  /** Shadow-core intensity scalar, 0..1-ish. */
  readonly shadow: number;
  /** Warped-cage displacement amplitude in world units. */
  readonly cageWarp: number;
  /** Population / capacity, guarded and clamped. */
  readonly crowding: number;
  /** Number of direct children in the temple rig. */
  readonly visualNodes: number;
}

export class MonolithTemple {
  private readonly scene: THREE.Scene;
  private readonly group = new THREE.Group();
  /** Abomination-architecture detail shell: mirror-symmetric greebled towers + data-rain strips. */
  private readonly greeble: TempleGreeble;
  private readonly geos: THREE.BufferGeometry[] = [];
  private readonly mats: THREE.Material[] = [];
  private readonly portalMat: THREE.ShaderMaterial;
  private readonly haloMat: THREE.MeshBasicMaterial;
  private readonly shadowMat: THREE.MeshBasicMaterial;
  private readonly singularityMat: THREE.MeshBasicMaterial;
  private readonly cageMat: THREE.LineBasicMaterial;
  private readonly rings: THREE.Mesh[] = [];
  private readonly shards: THREE.Mesh[] = [];
  private readonly greebles: THREE.Mesh[] = [];
  private readonly cage: THREE.LineSegments;
  private readonly cageGeo: THREE.BufferGeometry;
  private readonly cageBase: Float32Array;
  private readonly shadowCore: THREE.Mesh;
  private readonly singularityRing: THREE.Mesh;
  private readonly portalColor = new THREE.Color();
  private _revealed = false;
  private age = 0;
  private chaos = 0;
  private entropy = 0;
  private crowding = 0;
  private rise = 0;
  private reactivity = 0;
  private shimmer = 0;
  private shadow = 0;
  private cageWarp = 0;
  /** Resting Y the temple settles at (set on reveal). */
  private restY = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    const U = ARENA_MID;

    const raymarchMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uResolution: {
          value: new THREE.Vector2(
            typeof window === 'undefined' ? 1920 : window.innerWidth,
            typeof window === 'undefined' ? 1080 : window.innerHeight,
          ),
        },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vWorldPos;

        mat2 rot(float a) {
            float s = sin(a), c = cos(a);
            return mat2(c, -s, s, c);
        }

        float sdBox(vec3 p, vec3 b) {
            vec3 q = abs(p) - b;
            return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
        }

        float map(vec3 p) {
            // Localize to the temple center. The bounds box is at y=25
            vec3 q = p - vec3(0.0, 15.0, 0.0);
            
            // Base bounding volume
            float baseStructure = sdBox(q, vec3(22.0, 22.0, 16.0));

            // Kaleidoscopic Iterated Function System (KIFS)
            vec3 z = q;
            float s = 1.0;
            for(int i=0; i<5; i++) {
                z = abs(z) - vec3(4.0, 5.0, 4.0) / s;
                z.xy *= rot(0.3 + uTime * 0.1);
                z.xz *= rot(0.15 - uTime * 0.08);
                float k = 1.35;
                z *= k;
                s *= k;
            }
            float fractal = sdBox(z, vec3(2.5, 8.0, 2.5)) / s;

            // Subtractive greebles
            float detailedStructure = max(baseStructure, -fractal);
            
            // Additive neural/cybernetic veins
            float additiveFractal = sdBox(z, vec3(0.2, 15.0, 0.2)) / s;
            
            return min(detailedStructure, max(baseStructure - 1.5, additiveFractal));
        }

        vec3 calcNormal(vec3 p) {
            const vec2 e = vec2(0.05, 0.0);
            return normalize(vec3(
                map(p + e.xyy) - map(p - e.xyy),
                map(p + e.yxy) - map(p - e.yxy),
                map(p + e.yyx) - map(p - e.yyx)
            ));
        }

        void main() {
            vec3 ro = cameraPosition;
            vec3 rd = normalize(vWorldPos - ro);
            
            float t = 0.0;
            float maxD = 150.0;
            float d = 0.0;
            vec3 p = ro;
            
            // Raymarching loop (optimized maxSteps for performance)
            for(int i=0; i<60; i++) {
                p = ro + rd * t;
                d = map(p);
                if(d < 0.01 || t > maxD) break;
                t += d;
            }

            if(t > maxD) {
                discard; // Let the background show through holes in the fractal
            }

            vec3 n = calcNormal(p);
            
            // Alien metallic lighting
            vec3 lightDir = normalize(vec3(0.5, 1.0, 0.2));
            float diff = max(dot(n, lightDir), 0.0);
            float amb = 0.1 + 0.1 * n.y;
            vec3 col = vec3(0.04, 0.05, 0.08) * amb + vec3(0.15, 0.2, 0.25) * diff;

            // Deep crimson and cyan bioluminescence mapping
            float bio = sin(p.y * 0.4 + uTime) * cos(p.x * 0.4) * sin(p.z * 0.4);
            if(bio > 0.7) {
                col += vec3(0.8, 0.1, 0.3) * (bio - 0.7) * 4.0;
            }
            float bio2 = cos(p.y * 0.3 - uTime) * sin(p.x * 0.3 + uTime) * cos(p.z * 0.3);
            if(bio2 > 0.8) {
                col += vec3(0.1, 0.8, 0.9) * (bio2 - 0.8) * 5.0;
            }

            gl_FragColor = vec4(col, 1.0);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });

    this.mats.push(raymarchMat);
    // Bounding box scaled roughly to the previous temple's U size
    const boundsGeo = new THREE.BoxGeometry(50 * U, 50 * U, 36 * U);
    this.geos.push(boundsGeo);
    const boundsMesh = new THREE.Mesh(boundsGeo, raymarchMat);
    boundsMesh.position.set(0, 25 * U, 0);
    boundsMesh.frustumCulled = false;
    this.group.add(boundsMesh);

    // Reference-image architectural mass: suspended circuit-ribs and vertical light pylons around
    // the raymarched core. These are deterministic physical meshes, so the temple reads as built
    // alien infrastructure instead of only a shader volume.
    const greebleGeo = new THREE.BoxGeometry(1.1 * U, 12 * U, 0.42 * U, 2, 8, 1);
    this.geos.push(greebleGeo);
    const greebleMat = new THREE.MeshBasicMaterial({
      color: 0x8fdcff,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.mats.push(greebleMat);
    for (let i = 0; i < 28; i++) {
      const side = i % 4;
      const row = (i / 4) | 0;
      const span = 21 * U + ((i * 7) % 5) * U;
      const offset = (-3 + row) * 4.2 * U;
      const g = new THREE.Mesh(greebleGeo, greebleMat);
      if (side === 0) g.position.set(-span, 10 * U + row * 3.2 * U, offset);
      else if (side === 1) g.position.set(span, 10 * U + row * 3.2 * U, -offset);
      else if (side === 2) g.position.set(offset, 10 * U + row * 3.2 * U, -span);
      else g.position.set(-offset, 10 * U + row * 3.2 * U, span);
      g.rotation.y = side * (Math.PI / 2) + ((i * 13) % 9) * 0.035;
      g.scale.y = 0.55 + ((i * 5) % 11) * 0.07;
      g.frustumCulled = false;
      this.group.add(g);
      this.greebles.push(g);
    }

    // The PORTAL — a glowing disc framed by a bright ring, between the pillars.
    const portalY = 7.2 * U + 17 * U;
    this.shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    this.mats.push(this.shadowMat);
    this.shadowCore = new THREE.Mesh(new THREE.SphereGeometry(5.6 * U, 24, 16), this.shadowMat);
    this.geos.push(this.shadowCore.geometry);
    this.shadowCore.position.set(0, portalY, -0.4 * U);
    this.shadowCore.frustumCulled = false;
    this.group.add(this.shadowCore);

    this.singularityMat = new THREE.MeshBasicMaterial({
      color: 0x08000f,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.mats.push(this.singularityMat);
    const singularityGeo = new THREE.TorusGeometry(6.4 * U, 0.55 * U, 10, 72);
    this.geos.push(singularityGeo);
    this.singularityRing = new THREE.Mesh(singularityGeo, this.singularityMat);
    this.singularityRing.position.set(0, portalY, -0.3 * U);
    this.singularityRing.frustumCulled = false;
    this.group.add(this.singularityRing);

    const discGeo = new THREE.CircleGeometry(7.5 * U, 96);
    this.geos.push(discGeo);
    // V109: hyper-graphic wormhole portal shader — swirling vortex, event-horizon ring, chromatic spill.
    this.portalMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uColor: { value: new THREE.Vector3(PORTAL_A.r, PORTAL_A.g, PORTAL_A.b) },
        uReactivity: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        uniform vec3 uColor;
        uniform float uReactivity;
        varying vec2 vUv;
        void main() {
          vec2 c = vUv - 0.5;
          float r = length(c);
          float a = atan(c.y, c.x);
          // Wormhole spiral: twist angle with depth falloff.
          float spiral = sin(a * 5.0 - uTime * 3.0 + r * 14.0) * 0.5 + 0.5;
          float tunnel = smoothstep(0.48, 0.0, r);
          float horizon = smoothstep(0.12, 0.0, r);
          float edge = smoothstep(0.5, 0.42, r) * smoothstep(0.34, 0.42, r);
          float swirl = spiral * tunnel * (0.7 + 0.6 * uReactivity);
          vec3 core = vec3(0.0, 0.02, 0.05) * horizon * 4.0;
          vec3 rim = uColor * (swirl + edge * 1.4) * (1.0 + uReactivity);
          // Chromatic aberration near the spin center.
          vec3 chroma = vec3(
            0.5 + 0.5 * sin(a * 3.0 - uTime * 2.1),
            0.5 + 0.5 * sin(a * 3.0 - uTime * 2.1 + 2.094),
            0.5 + 0.5 * sin(a * 3.0 - uTime * 2.1 + 4.188)
          ) * tunnel * 0.35 * uReactivity;
          float alpha = clamp(tunnel * (0.45 + uReactivity * 0.35) + horizon * 0.6 + edge * 0.5, 0.0, 1.0) * uOpacity;
          gl_FragColor = vec4(core + rim + chroma, alpha);
        }
      `,
    });
    this.mats.push(this.portalMat);
    const disc = new THREE.Mesh(discGeo, this.portalMat);
    disc.position.set(0, portalY, 0);
    disc.frustumCulled = false;
    this.group.add(disc);

    const ringGeo = new THREE.TorusGeometry(7.8 * U, 0.7 * U, 12, 60);
    this.geos.push(ringGeo);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xbfe9ff,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.mats.push(ringMat);
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(0, portalY, 0);
    ring.frustumCulled = false;
    this.group.add(ring);
    this.rings.push(ring);

    // Two counter-rotating glyph-rings around the portal (the gateway "spins up").
    for (let i = 0; i < 2; i++) {
      const gg = new THREE.TorusGeometry((10 + i * 2.4) * U, 0.28 * U, 8, 50);
      this.geos.push(gg);
      const gm = new THREE.MeshBasicMaterial({
        color: i === 0 ? 0x8fdcff : 0xc79bff,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.mats.push(gm);
      const gr = new THREE.Mesh(gg, gm);
      gr.position.set(0, portalY, 0);
      gr.rotation.x = i === 0 ? 0.5 : -0.5;
      gr.frustumCulled = false;
      this.group.add(gr);
      this.rings.push(gr);
    }

    // A soft outer halo so the whole gateway glows.
    const haloGeo = new THREE.SphereGeometry(13 * U, 20, 20);
    this.geos.push(haloGeo);
    this.haloMat = new THREE.MeshBasicMaterial({
      color: 0x6fb8ff,
      transparent: true,
      opacity: 0.0,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.mats.push(this.haloMat);
    const halo = new THREE.Mesh(haloGeo, this.haloMat);
    halo.position.set(0, portalY, 0);
    halo.frustumCulled = false;
    this.group.add(halo);

    // Impossible cage: several skewed rings cross-linked at non-neighboring phases. Per-frame warp
    // makes it react like a mathematical abomination without hand-written GLSL.
    this.cageGeo = this.buildCageGeo();
    this.geos.push(this.cageGeo);
    this.cageBase = new Float32Array(
      (this.cageGeo.getAttribute('position') as THREE.BufferAttribute).array as ArrayLike<number>,
    );
    this.cageMat = new THREE.LineBasicMaterial({
      color: 0xa600ff,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.mats.push(this.cageMat);
    this.cage = new THREE.LineSegments(this.cageGeo, this.cageMat);
    this.cage.frustumCulled = false;
    this.group.add(this.cage);

    // Wrap the bare trilithon in the colossal greebled megastructure + data-rain curtain.
    this.greeble = new TempleGreeble(this.group, ARENA_MID);

    this.group.visible = false;
    this.scene.add(this.group);
  }

  /** Whether the temple has risen. */
  get revealed(): boolean {
    return this._revealed;
  }

  /** Feed read-only world state into the visual temple. Draws no rng and writes no sim state. */
  setEnvironment(env: TempleEnvironment): void {
    this.chaos = norm01(env.chaos);
    this.entropy = norm01(env.entropy);
    const cap = finitePositive(env.capacity);
    this.crowding = cap > 0 ? clamp(finitePositive(env.population) / cap, 0, 1) : 0;
  }

  /**
   * Raise the temple at `(x, y, z)` (idempotent — calling again just repositions). `silent` skips
   * the rise animation (used on boot when restoring an already-ascended creature so it's just THERE).
   */
  reveal(x: number, y: number, z: number, silent = false): void {
    this.restY = y;
    this.group.position.set(x, silent ? y : y - RISE_DROP, z);
    this.group.visible = true;
    this._revealed = true;
    if (silent) this.age = RISE_TIME;
  }

  /** Build the fixed line mesh for the impossible cage. */
  private buildCageGeo(): THREE.BufferGeometry {
    const U = ARENA_MID;
    const layers = 4;
    const seg = 18;
    const segments = layers * seg + (layers - 1) * seg;
    const arr = new Float32Array(segments * 6);
    let o = 0;
    const point = (layer: number, i: number, out: THREE.Vector3): void => {
      const th = (Math.PI * 2 * i) / seg + layer * 0.23;
      const rx = (24 - layer * 3.3) * U;
      const rz = (15 + layer * 2.2) * U;
      const y = (13 + layer * 8.2) * U;
      out.set(Math.cos(th) * rx, y, Math.sin(th) * rz);
    };
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const push = (): void => {
      arr[o++] = a.x;
      arr[o++] = a.y;
      arr[o++] = a.z;
      arr[o++] = b.x;
      arr[o++] = b.y;
      arr[o++] = b.z;
    };
    for (let layer = 0; layer < layers; layer++) {
      for (let i = 0; i < seg; i++) {
        point(layer, i, a);
        point(layer, (i + 1) % seg, b);
        push();
      }
    }
    for (let layer = 0; layer < layers - 1; layer++) {
      for (let i = 0; i < seg; i++) {
        point(layer, i, a);
        point(layer + 1, (i * 5 + 3) % seg, b);
        push();
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return g;
  }

  /**
   * Animate the gateway: ease it into place over {@link RISE_TIME}, then breathe the portal, cycle
   * its colour, and spin the glyph-rings. No-op while hidden. Pure `t`/`dt` math (no rng). O(1).
   */
  update(dt: number, t: number): void {
    if (!this._revealed) return;
    const safeDt = Number.isFinite(dt) && dt > 0 ? dt : 0;
    const safeT = Number.isFinite(t) ? t : 0;
    this.age += safeDt;
    const rise = this.age < RISE_TIME ? this.age / RISE_TIME : 1;
    const ease = 1 - (1 - rise) * (1 - rise); // ease-out
    this.rise = ease;
    this.reactivity = clamp(this.chaos * 0.45 + this.entropy * 0.25 + this.crowding * 0.3, 0, 1);
    this.group.position.y = this.restY - RISE_DROP * (1 - ease);

    const pulse = 0.5 + Math.sin(safeT * (1.6 + this.chaos * 1.2)) * 0.5;
    const flicker = 0.5 + Math.sin(safeT * 7.7) * Math.sin(safeT * 2.3) * 0.5;
    this.shimmer = ease * (0.2 + 0.8 * (0.55 * pulse + 0.45 * this.reactivity));
    this.shadow = ease * (0.12 + 0.88 * (0.4 * this.entropy + 0.35 * this.chaos + 0.25 * flicker));
    this.cageWarp = ARENA_MID * ease * (0.7 + 5.6 * this.reactivity);
    this.portalColor.copy(PORTAL_A).lerp(PORTAL_B, pulse);
    const u = this.portalMat.uniforms;
    (u.uColor!.value as THREE.Vector3).set(
      this.portalColor.r,
      this.portalColor.g,
      this.portalColor.b,
    );
    (u.uOpacity!.value as number) = (0.28 + pulse * 0.26 + this.reactivity * 0.22) * ease;
    (u.uTime!.value as number) = safeT;
    (u.uReactivity!.value as number) = this.reactivity;
    this.haloMat.opacity = (0.08 + pulse * 0.1 + this.reactivity * 0.18) * ease;
    this.shadowMat.opacity = Math.min(0.85, 0.22 + this.shadow * 0.55);
    this.shadowCore.scale.setScalar(0.75 + ease * 0.2 + this.shadow * 0.38);
    this.singularityMat.opacity = (0.18 + this.shimmer * 0.46) * ease;
    this.singularityMat.color.setHSL(0.77 + this.entropy * 0.08, 0.95, 0.18 + this.chaos * 0.22);
    this.singularityRing.rotation.z = -safeT * (0.32 + this.reactivity * 0.9);
    this.singularityRing.rotation.x = Math.sin(safeT * 0.31) * 0.35;
    this.singularityRing.scale.setScalar(0.84 + this.shadow * 0.35);
    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      if (!r) continue;
      r.rotation.z += (i % 2 === 0 ? 0.012 : -0.018) * (0.5 + pulse + this.reactivity);
      const m = r.material as THREE.MeshBasicMaterial;
      m.opacity = (0.4 + pulse * 0.22 + this.reactivity * 0.28) * ease;
    }
    for (let i = 0; i < this.greebles.length; i++) {
      const g = this.greebles[i]!;
      const breathe = 1 + Math.sin(safeT * 1.1 + i * 0.37) * this.reactivity * 0.12;
      g.scale.x = 0.8 + this.entropy * 0.35 + breathe * 0.08;
      g.scale.z = 0.8 + this.chaos * 0.42;
      g.rotation.x = Math.sin(safeT * 0.19 + i) * this.chaos * 0.08;
      g.rotation.z = Math.cos(safeT * 0.23 + i) * this.entropy * 0.08;
      (g.material as THREE.MeshBasicMaterial).opacity = (0.16 + this.shimmer * 0.32) * ease;
    }
    if (this.shards && this.shards.length > 0) {
      for (let i = 0; i < this.shards.length; i++) {
        const sh = this.shards[i];
        if (!sh) continue;
        const s = 1 + this.shimmer * 0.22 + Math.sin(safeT * 1.4 + i) * this.reactivity * 0.12;
        sh.scale.set(0.78 + this.entropy * 0.24, s, 0.78 + this.chaos * 0.3);
        sh.rotation.y = safeT * (0.05 + this.chaos * 0.1) + i;
      }
    }
    this.warpCage(safeT, ease);
    this.greeble.update(safeT, this.reactivity, this.chaos);
  }

  /** Warp the impossible cage in-place; fixed vertex count, no allocations. */
  private warpCage(t: number, ease: number): void {
    const pos = this.cageGeo.getAttribute('position') as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const base = this.cageBase;
    const amp = this.cageWarp;
    // V63: Update time uniforms for the Abomination Temple shaders
    const mat0 = this.mats[0];
    const uniforms = (mat0 as THREE.Material | undefined)?.userData?.uniforms as
      | { uTime?: THREE.IUniform<number> }
      | undefined;
    if (uniforms?.uTime) uniforms.uTime.value = t;

    for (let i = 0; i < arr.length; i += 3) {
      const bx = base[i] ?? 0;
      const by = base[i + 1] ?? 0;
      const bz = base[i + 2] ?? 0;
      const wave =
        Math.sin(bx * 0.024 + t * (0.9 + this.chaos)) +
        Math.sin(bz * 0.031 - t * (0.7 + this.entropy)) +
        0.5 * Math.sin((bx + by + bz) * 0.012 + t * 1.9);
      const squeeze = 1 + ease * this.reactivity * 0.075 * wave;
      arr[i] = bx * squeeze;
      arr[i + 1] = by + wave * amp;
      arr[i + 2] = bz * (1 - ease * this.reactivity * 0.055 * wave);
    }
    pos.needsUpdate = true;
    this.cage.rotation.y = t * (0.02 + this.chaos * 0.08);
    this.cage.rotation.x = Math.sin(t * 0.13) * (0.08 + this.entropy * 0.18);
    this.cageMat.opacity = (0.12 + this.shimmer * 0.36) * ease;
    this.cageMat.color.setHSL(0.78 + this.chaos * 0.16, 1, 0.45 + this.shimmer * 0.2);
  }

  /** Read-only debug/test snapshot of the visual state. */
  snapshot(): MonolithTempleSnapshot {
    return {
      revealed: this._revealed,
      rise: this.rise,
      reactivity: this.reactivity,
      shimmer: this.shimmer,
      shadow: this.shadow,
      cageWarp: this.cageWarp,
      crowding: this.crowding,
      visualNodes: this.group.children.length,
    };
  }

  /** Remove + free all GPU resources. */
  dispose(): void {
    this.greeble.dispose();
    this.scene.remove(this.group);
    for (const g of this.geos) g.dispose();
    for (const m of this.mats) m.dispose();
  }
}

function norm01(v: number): number {
  return Number.isFinite(v) ? clamp(v, 0, 1) : 0;
}

function finitePositive(v: number): number {
  return Number.isFinite(v) && v > 0 ? v : 0;
}

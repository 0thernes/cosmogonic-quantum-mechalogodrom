/**
 * THE MONOLITH MEGALITH (CONTRACTS V63 → redesigned V123) — the level-100 ascension end-state made
 * physical. When the super creature reaches the LEGENDARY apex (`SuperEvolution.ascended`), a
 * **black crystal megalith caging a newborn star** rises from the field.
 *
 * ─── ART DIRECTION (redesign) ────────────────────────────────────────────────────────────────────
 * Rebuilt from six reference images (see docs/MONOLITH-MEGALITH-ART-DIRECTION.md). The prior temple
 * was HOT + HELLISH — a "nightmare wormhole" of blood, acid, and screaming souls in crimson/cyan.
 * The references are its exact inverse: austere, sublime, near-MONOCHROME — a faceted crystal
 * monolith on a black void, holding a brilliant WHITE singularity whose light shatters outward
 * through the facets as PRISMATIC (spectral) rays. So the whole megalith is recoloured from
 * hot→cold and re-architected into named, image-mapped subsystems, every one backed by real math and
 * driven by a real world signal:
 *
 *   1. CRYSTAL CORE   (img1 kaleidoscope-cube / img3 caged-star) — a raymarched KIFS-faceted diamond
 *      shell around a white incandescent core. Ignition (chaos) brightens the caged star; dispersion
 *      (entropy) spreads its light into spectral fringes on the facet rims.
 *   2. RAY-BURST      (img1/2/3 light explosion)   — an instanced radial starburst of light shards
 *      emanating from the core; its glow blooms with ignition.
 *   3. BOX LATTICE    (img2/4 nested wireframe cosmos) — the "impossible cage" reborn as concentric
 *      wireframe cubes + radial struts, a box-lattice to infinity that breathes with reactivity.
 *   4. ORBIT SHELL    (img2/3/4 suspended primitives) — instanced dark spheres + wireframe cubes on a
 *      Fibonacci sphere, slowly orbiting the core (a Dyson-shell of geometric primitives).
 *   5. MOTE HALO      (img3 orbiting spark-sphere)  — an additive spherical swarm of white light-motes
 *      whose radius pulses with shimmer.
 *   6. PRISMATIC APERTURE (img1 central triangle)   — the portal to GAME STAGE 2, now a clean faceted
 *      white aperture with spectral edges (the caged star's "face"), NOT a blood wormhole.
 *   7. STANDING STONES (img5 brutalist maze / megalith ring) — a ring of black obelisk megaliths that
 *      frame the crystal and kindle with reactivity.
 *   8. CORAL GROWTH   (img5 fractal life in the grid) — a deterministic L-system dendrite climbing the
 *      plinth; its extent is a DIRECT readout of population/crowding (real coupling, not decoration).
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

/** Seconds the megalith takes to rise into place once revealed. */
const RISE_TIME = 2.4;
/** How far below its resting height the megalith starts when it rises. */
const RISE_DROP = 60 * ARENA_MID;
/** World-space height of the caged star / crystal centre above the megalith's base. */
const CORE_Y = 24 * ARENA_MID;

/** Prismatic aperture shimmer colours (ice-white ↔ pale spectral violet) — the austere new palette. */
const PORTAL_A = new THREE.Color(0.72, 0.86, 1.0);
const PORTAL_B = new THREE.Color(0.86, 0.8, 1.0);

/** Golden angle — Fibonacci-sphere / spiral spacing for suspended primitives + motes. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Deterministic positional hash → [0,1). No bitwise, no rng, no Date.now (mirrors FloatingMonoliths). */
function hash(n: number): number {
  const s = Math.sin(n * 41.17 + 13.91) * 24634.6345;
  return s - Math.floor(s);
}

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
  /** Aperture/lattice shimmer scalar, 0..1-ish. */
  readonly shimmer: number;
  /** Shadow-core intensity scalar, 0..1-ish. */
  readonly shadow: number;
  /** Box-lattice displacement amplitude in world units. */
  readonly cageWarp: number;
  /** Population / capacity, guarded and clamped. */
  readonly crowding: number;
  /** Caged-star brightness (chaos-bound), 0..1 — the "ignition" of the newborn star. */
  readonly ignition: number;
  /** Spectral spread of the crystal's refracted light (entropy-bound), 0..1. */
  readonly dispersion: number;
  /** Fraction of the coral dendrite that has colonized the plinth (crowding-bound), 0..1. */
  readonly coralExtent: number;
  /** Number of direct children in the megalith rig. */
  readonly visualNodes: number;
}

/** Suspended-primitive orbit counts (instanced — cheap). */
const ORBIT_CUBES = 96;
const ORBIT_SPHERES = 84;
/** Radial light-shard count for the ray-burst. */
const RAY_SHARDS = 220;
/** Light-mote count for the orbiting spark-halo. */
const MOTE_COUNT = 720;
/** Standing-stone megalith ring size (direct children — also guarantees visualNodes ≥ 25). */
const STONES = 18;
/** Coral dendrite node cap; visible count scales with crowding. */
const CORAL_CAP = 300;

export class MonolithTemple {
  private readonly scene: THREE.Scene;
  private readonly group = new THREE.Group();
  /** Abomination-architecture detail shell: mirror-symmetric greebled towers + data-rain strips. */
  private readonly greeble: TempleGreeble;
  private readonly geos: THREE.BufferGeometry[] = [];
  private readonly mats: THREE.Material[] = [];
  private readonly instancedMeshes: THREE.InstancedMesh[] = [];
  /** The raymarched crystal core's shader material — carries uTime + uResolution (see the regression test). */
  private readonly crystalMat: THREE.ShaderMaterial;
  /** Ray-burst additive material (shared by all radial shards). */
  private readonly burstMat: THREE.MeshBasicMaterial;
  private readonly rayBurst: THREE.InstancedMesh;
  private readonly portalMat: THREE.ShaderMaterial;
  private readonly haloMat: THREE.MeshBasicMaterial;
  private readonly shadowMat: THREE.MeshBasicMaterial;
  private readonly singularityMat: THREE.MeshBasicMaterial;
  private readonly cageMat: THREE.LineBasicMaterial;
  private readonly moteMat: THREE.PointsMaterial;
  private readonly coralMat: THREE.MeshBasicMaterial;
  private readonly stoneMat: THREE.MeshStandardMaterial;
  private readonly orbitGroup = new THREE.Group();
  private readonly orbitCubeMat: THREE.MeshBasicMaterial;
  private readonly orbitSphereMat: THREE.MeshStandardMaterial;
  private readonly rings: THREE.Mesh[] = [];
  private readonly stones: THREE.Mesh[] = [];
  private readonly cage: THREE.LineSegments;
  private readonly cageGeo: THREE.BufferGeometry;
  private readonly cageBase: Float32Array;
  private readonly shadowCore: THREE.Mesh;
  private readonly singularityRing: THREE.Mesh;
  private readonly motes: THREE.Points;
  private readonly coral: THREE.InstancedMesh;
  private readonly portalColor = new THREE.Color();
  private readonly centerVec = new THREE.Vector3();
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
  private ignition = 0;
  private dispersion = 0;
  private coralExtent = 0;
  /** Resting Y the megalith settles at (set on reveal). */
  private restY = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    const U = ARENA_MID;

    // ── 1. CRYSTAL CORE — raymarched KIFS-faceted diamond caging a white singularity. ──
    // The map() SDF works in WORLD space relative to `uCenter`, which update() locks to the mesh's
    // live world position — so the crystal stays welded to the megalith as it rises (the prior temple
    // subtracted a fixed offset and only lined up at the origin).
    this.crystalMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uResolution: {
          value: new THREE.Vector2(
            typeof window === 'undefined' ? 1920 : window.innerWidth,
            typeof window === 'undefined' ? 1080 : window.innerHeight,
          ),
        },
        uCenter: { value: new THREE.Vector3(0, CORE_Y, 0) },
        uIgnition: { value: 0 },
        uDispersion: { value: 0 },
        uReactivity: { value: 0 },
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
        uniform vec3 uCenter;
        uniform float uIgnition;   // caged-star brightness (chaos)
        uniform float uDispersion; // spectral spread (entropy)
        uniform float uReactivity;
        varying vec3 vWorldPos;

        mat2 rot(float a){ float s=sin(a), c=cos(a); return mat2(c,-s,s,c); }

        float sdBox(vec3 p, vec3 b){
          vec3 q = abs(p) - b;
          return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
        }
        float sdOcta(vec3 p, float s){ p = abs(p); return (p.x+p.y+p.z - s) * 0.57735027; }

        // Faceted crystal: an octahedral diamond truncated into a cube, with kaleidoscopic KIFS
        // facets carved into it. Returns the shell distance. Real iterated-function-system geometry.
        float mapCrystal(vec3 p){
          vec3 q = p - uCenter;
          q.xz *= rot(uTime * 0.08);
          q.xy *= rot(uTime * 0.05);
          float R = 24.0;
          float gem = sdOcta(q, R);
          gem = max(gem, sdBox(q, vec3(R * 0.6)));      // truncate the octahedron into a crystal cube
          vec3 z = q; float s = 1.0;
          for(int i=0;i<4;i++){
            z = abs(z) - vec3(6.0,7.0,6.0) / s;
            z.xy *= rot(0.3 + uTime * 0.06);
            z.xz *= rot(0.15);
            float k = 1.34; z *= k; s *= k;
          }
          float facets = sdBox(z, vec3(2.4, 9.0, 2.4)) / s;
          return max(gem, -facets);                     // carve the kaleidoscope into the gem
        }

        vec3 calcNormal(vec3 p){
          const vec2 e = vec2(0.06, 0.0);
          return normalize(vec3(
            mapCrystal(p+e.xyy) - mapCrystal(p-e.xyy),
            mapCrystal(p+e.yxy) - mapCrystal(p-e.yxy),
            mapCrystal(p+e.yyx) - mapCrystal(p-e.yyx)
          ));
        }

        void main(){
          vec3 ro = cameraPosition;
          vec3 rd = normalize(vWorldPos - ro);

          float t = 0.0, maxD = 320.0;
          float coreMin = 1e9;                          // closest approach to the caged star
          vec3 p = ro;
          bool hit = false;
          for(int i=0;i<72;i++){
            p = ro + rd * t;
            float d = mapCrystal(p);
            coreMin = min(coreMin, length(p - uCenter));
            if(d < 0.02){ hit = true; break; }
            if(t > maxD) break;
            t += d;
          }

          // The caged star always blooms — a soft white volumetric glow through the facets, so even
          // where the ray misses the shell the newborn light bleeds through. Ignition (chaos) drives it.
          float star = exp(-coreMin * 0.14) * (0.35 + 2.6 * uIgnition);

          if(!hit){
            if(star < 0.02) discard;                     // let the background / ray-burst show through
            vec3 spectral = mix(vec3(1.0), vec3(0.6,0.8,1.0), uDispersion);
            gl_FragColor = vec4(vec3(star) * spectral, clamp(star, 0.0, 1.0));
            return;
          }

          vec3 n = calcNormal(p);
          vec3 v = -rd;
          float fres = pow(clamp(1.0 - max(dot(n, v), 0.0), 0.0, 1.0), 3.0);

          // Black glass body; the facets read only as a faint cold metal + a bright fresnel rim.
          vec3 body = vec3(0.015, 0.02, 0.03) + vec3(0.05,0.06,0.08) * max(n.y, 0.0);

          // PRISMATIC dispersion: split the rim into R/G/B by an entropy-scaled angular offset so the
          // facet edges fringe into spectrum (Newton's prism, cheap 3-tap chromatic split).
          float disp = 0.15 + uDispersion * 0.9;
          float rimR = pow(clamp(1.0 - max(dot(n, v + vec3(disp,0.0,0.0)), 0.0), 0.0, 1.0), 3.0);
          float rimG = fres;
          float rimB = pow(clamp(1.0 - max(dot(n, v - vec3(disp,0.0,0.0)), 0.0), 0.0, 1.0), 3.0);
          vec3 rim = vec3(rimR, rimG, rimB) * (0.9 + 1.6 * uReactivity);

          vec3 col = body + rim + vec3(star);
          float alpha = clamp(0.35 + fres * 0.6 + star, 0.0, 1.0);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.mats.push(this.crystalMat);
    const boundsGeo = new THREE.BoxGeometry(56 * U, 56 * U, 56 * U);
    this.geos.push(boundsGeo);
    const boundsMesh = new THREE.Mesh(boundsGeo, this.crystalMat);
    boundsMesh.position.set(0, CORE_Y, 0);
    boundsMesh.frustumCulled = false;
    this.group.add(boundsMesh);

    // ── 2. RAY-BURST — an instanced radial starburst of light shards from the caged star. ──
    // Fixed outward-pointing matrices (deterministic Fibonacci sphere); update() drives only the
    // shared additive opacity + a slow spin, so per-frame cost is O(1).
    const shardGeo = new THREE.ConeGeometry(0.5 * U, 1, 4, 1, true);
    // Cone points +Y; shift so its base sits at the core and it spears outward.
    shardGeo.translate(0, 0.5, 0);
    this.geos.push(shardGeo);
    this.burstMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    this.mats.push(this.burstMat);
    this.rayBurst = new THREE.InstancedMesh(shardGeo, this.burstMat, RAY_SHARDS);
    this.rayBurst.frustumCulled = false;
    this.rayBurst.position.set(0, CORE_Y, 0);
    {
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const up = new THREE.Vector3(0, 1, 0);
      const dir = new THREE.Vector3();
      const scl = new THREE.Vector3();
      const origin = new THREE.Vector3(0, 0, 0);
      for (let i = 0; i < RAY_SHARDS; i++) {
        const y = 1 - (i / (RAY_SHARDS - 1)) * 2; // -1..1
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const th = i * GOLDEN_ANGLE;
        dir.set(Math.cos(th) * r, y, Math.sin(th) * r).normalize();
        q.setFromUnitVectors(up, dir);
        const len = (14 + hash(i * 3 + 1) * 30) * U; // varied shard reach
        scl.set(0.4 + hash(i * 5 + 2) * 0.9, len, 0.4 + hash(i * 7 + 3) * 0.9);
        m.compose(origin, q, scl);
        this.rayBurst.setMatrixAt(i, m);
      }
      this.rayBurst.instanceMatrix.needsUpdate = true;
    }
    this.group.add(this.rayBurst);
    this.instancedMeshes.push(this.rayBurst);

    // ── 3. BOX LATTICE — the "impossible cage" reborn as nested wireframe cubes + radial struts. ──
    this.cageGeo = this.buildCageGeo();
    this.geos.push(this.cageGeo);
    this.cageBase = new Float32Array(
      (this.cageGeo.getAttribute('position') as THREE.BufferAttribute).array as ArrayLike<number>,
    );
    this.cageMat = new THREE.LineBasicMaterial({
      color: 0x9fb8ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.mats.push(this.cageMat);
    this.cage = new THREE.LineSegments(this.cageGeo, this.cageMat);
    this.cage.frustumCulled = false;
    this.group.add(this.cage);

    // ── 4. ORBIT SHELL — suspended dark spheres + wireframe cubes on a Fibonacci sphere. ──
    this.orbitCubeMat = new THREE.MeshBasicMaterial({
      color: 0x2a3550,
      wireframe: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.orbitSphereMat = new THREE.MeshStandardMaterial({
      color: 0x090b12,
      roughness: 0.35,
      metalness: 0.8,
      emissive: 0x0a1024,
      emissiveIntensity: 0.0,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.mats.push(this.orbitCubeMat, this.orbitSphereMat);
    const orbCubeGeo = new THREE.BoxGeometry(1, 1, 1);
    const orbSphereGeo = new THREE.IcosahedronGeometry(1, 1);
    this.geos.push(orbCubeGeo, orbSphereGeo);
    const orbCubes = new THREE.InstancedMesh(orbCubeGeo, this.orbitCubeMat, ORBIT_CUBES);
    const orbSpheres = new THREE.InstancedMesh(orbSphereGeo, this.orbitSphereMat, ORBIT_SPHERES);
    orbCubes.frustumCulled = false;
    orbSpheres.frustumCulled = false;
    this.fillShell(orbCubes, ORBIT_CUBES, 20, 34, 101);
    this.fillShell(orbSpheres, ORBIT_SPHERES, 22, 33, 211);
    this.orbitGroup.position.set(0, CORE_Y, 0);
    this.orbitGroup.add(orbCubes);
    this.orbitGroup.add(orbSpheres);
    this.group.add(this.orbitGroup);
    this.instancedMeshes.push(orbCubes, orbSpheres);

    // ── 5. MOTE HALO — an additive spherical swarm of white light-motes (img3 spark-sphere). ──
    {
      const arr = new Float32Array(MOTE_COUNT * 3);
      for (let i = 0; i < MOTE_COUNT; i++) {
        const y = 1 - (i / (MOTE_COUNT - 1)) * 2;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const th = i * GOLDEN_ANGLE;
        const rad = (13 + hash(i * 9 + 5) * 4) * U;
        arr[i * 3] = Math.cos(th) * r * rad;
        arr[i * 3 + 1] = CORE_Y + y * rad;
        arr[i * 3 + 2] = Math.sin(th) * r * rad;
      }
      const moteGeo = new THREE.BufferGeometry();
      moteGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      this.geos.push(moteGeo);
      this.moteMat = new THREE.PointsMaterial({
        color: 0xdfebff,
        size: 0.6 * U,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      });
      this.mats.push(this.moteMat);
      this.motes = new THREE.Points(moteGeo, this.moteMat);
      this.motes.frustumCulled = false;
      this.group.add(this.motes);
    }

    // ── 6. PRISMATIC APERTURE — the Stage-2 portal as a clean faceted white aperture. ──
    const portalY = CORE_Y;
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
      color: 0x0a1430,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.mats.push(this.singularityMat);
    const singularityGeo = new THREE.TorusGeometry(6.4 * U, 0.5 * U, 10, 72);
    this.geos.push(singularityGeo);
    this.singularityRing = new THREE.Mesh(singularityGeo, this.singularityMat);
    this.singularityRing.position.set(0, portalY, -0.3 * U);
    this.singularityRing.frustumCulled = false;
    this.group.add(this.singularityRing);

    const discGeo = new THREE.CircleGeometry(7.5 * U, 128);
    this.geos.push(discGeo);
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
        uDispersion: { value: 0 },
        uEquiTex: { value: null }, // optional equirect "view through the aperture"
        uHasEquiTex: { value: 0 }, // 0 until the equirect actually loads (the asset can 404 / be absent)
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
        uniform float uDispersion;
        uniform sampler2D uEquiTex;
        uniform float uHasEquiTex;
        varying vec2 vUv;

        // Clean prismatic genesis aperture: a kaleidoscopic white iris with spectral edges — the caged
        // star's face, and the gateway to the second world. Austere, bright-on-black (NOT a blood hell).
        void main() {
          vec2 c = vUv - 0.5;
          float r = length(c);
          float a = atan(c.y, c.x);

          // 6-fold kaleidoscopic fold of the angle → a faceted crystalline iris.
          float k = 6.0;
          float af = abs(mod(a, 6.2831853 / k) - 3.1415927 / k);
          float facet = cos(af);

          // Bright white throat that opens up, ringed by concentric light shells.
          float throat = smoothstep(0.5, 0.0, r);
          float shells = 0.5 + 0.5 * sin(r * 40.0 - uTime * 3.0 + facet * 6.0);
          float iris = throat * (0.4 + 0.6 * shells) * (0.8 + facet * 0.6);

          // PRISMATIC edge: split the rim into spectrum by a dispersion-scaled radial offset.
          float d = 0.02 + uDispersion * 0.06;
          float edgeR = smoothstep(0.5, 0.34, r + d) * smoothstep(0.28 - d, 0.44, r);
          float edgeG = smoothstep(0.5, 0.34, r)     * smoothstep(0.28, 0.44, r);
          float edgeB = smoothstep(0.5, 0.34, r - d) * smoothstep(0.28 + d, 0.44, r);
          vec3 spectrum = vec3(edgeR, edgeG, edgeB) * (0.9 + uReactivity * 1.2);

          vec3 col = uColor * iris + spectrum;
          // Optional equirect glimpse of the next world, gated so an absent/1x1 texture never leaks in.
          vec2 equiUv = vec2(a / 6.2831853 + 0.5, 1.0 - r * 2.0);
          vec3 view = uHasEquiTex > 0.5
            ? texture2D(uEquiTex, equiUv).rgb * throat * 1.5
            : vec3(0.0);
          col += view;

          float alpha = clamp(iris * (0.5 + uReactivity * 0.5) + max(max(edgeR,edgeG),edgeB), 0.0, 1.0) * uOpacity;
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
    this.mats.push(this.portalMat);
    const disc = new THREE.Mesh(discGeo, this.portalMat);
    disc.position.set(0, portalY, 0);
    disc.frustumCulled = false;
    this.group.add(disc);

    if (typeof document !== 'undefined') {
      const equiLoader = new THREE.TextureLoader();
      equiLoader.load('/textures/pantheon_equirect_refs_atlas.png', (tex) => {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        if (this.portalMat.uniforms.uEquiTex && this.portalMat.uniforms.uHasEquiTex) {
          this.portalMat.uniforms.uEquiTex.value = tex;
          this.portalMat.uniforms.uHasEquiTex.value = 1; // only fires on real load success (not a 404)
        }
      });
    }

    const ringGeo = new THREE.TorusGeometry(7.8 * U, 0.6 * U, 12, 60);
    this.geos.push(ringGeo);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xdfeaff,
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

    // Two counter-rotating glyph-rings around the aperture (the gateway "spins up").
    for (let i = 0; i < 2; i++) {
      const gg = new THREE.TorusGeometry((10 + i * 2.4) * U, 0.24 * U, 8, 50);
      this.geos.push(gg);
      const gm = new THREE.MeshBasicMaterial({
        color: i === 0 ? 0xbfe0ff : 0xd8c7ff,
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

    // A soft outer halo so the whole gateway glows cold-white.
    const haloGeo = new THREE.SphereGeometry(13 * U, 20, 20);
    this.geos.push(haloGeo);
    this.haloMat = new THREE.MeshBasicMaterial({
      color: 0x9fc4ff,
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

    // ── 7. STANDING STONES — a ring of black obelisk megaliths framing the crystal. ──
    // These are DIRECT children of the group (also the reason visualNodes ≥ 25 by construction).
    const stoneGeo = new THREE.CylinderGeometry(1.2 * U, 2.2 * U, 22 * U, 5, 1);
    this.geos.push(stoneGeo);
    this.stoneMat = new THREE.MeshStandardMaterial({
      color: 0x090a11,
      roughness: 0.85,
      metalness: 0.35,
      emissive: 0x161d33,
      emissiveIntensity: 0.25,
    });
    this.mats.push(this.stoneMat);
    for (let i = 0; i < STONES; i++) {
      const th = i * GOLDEN_ANGLE + hash(i * 5 + 1) * 0.4;
      const rad = (30 + hash(i * 3 + 2) * 8) * U;
      const st = new THREE.Mesh(stoneGeo, this.stoneMat);
      st.position.set(Math.cos(th) * rad, (7 + hash(i * 7 + 3) * 6) * U, Math.sin(th) * rad);
      st.rotation.y = hash(i * 11 + 4) * Math.PI * 2;
      st.scale.y = 0.7 + hash(i * 13 + 5) * 0.9;
      st.frustumCulled = false;
      this.group.add(st);
      this.stones.push(st);
    }

    // ── 8. CORAL GROWTH — a deterministic L-system dendrite whose extent reads population/crowding. ──
    this.coralMat = new THREE.MeshBasicMaterial({
      color: 0xeef4ff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    this.mats.push(this.coralMat);
    const coralNodeGeo = new THREE.OctahedronGeometry(0.55 * U, 0);
    this.geos.push(coralNodeGeo);
    this.coral = new THREE.InstancedMesh(coralNodeGeo, this.coralMat, CORAL_CAP);
    this.coral.frustumCulled = false;
    this.buildCoral(this.coral);
    this.coral.count = 0; // nothing colonized until crowding rises
    this.group.add(this.coral);
    this.instancedMeshes.push(this.coral);

    // Wrap the crystal in the colossal greebled megastructure + data-rain curtain.
    this.greeble = new TempleGreeble(this.group, ARENA_MID);

    this.group.visible = false;
    this.scene.add(this.group);
  }

  /** Whether the megalith has risen. */
  get revealed(): boolean {
    return this._revealed;
  }

  /** Feed read-only world state into the visual megalith. Draws no rng and writes no sim state. */
  setEnvironment(env: TempleEnvironment): void {
    this.chaos = norm01(env.chaos);
    this.entropy = norm01(env.entropy);
    const cap = finitePositive(env.capacity);
    this.crowding = cap > 0 ? clamp(finitePositive(env.population) / cap, 0, 1) : 0;
  }

  /**
   * Raise the megalith at `(x, y, z)` (idempotent — calling again just repositions). `silent` skips
   * the rise animation (used on boot when restoring an already-ascended creature so it's just THERE).
   */
  reveal(x: number, y: number, z: number, silent = false): void {
    this.restY = y;
    this.group.position.set(x, silent ? y : y - RISE_DROP, z);
    this.group.visible = true;
    this._revealed = true;
    if (silent) this.age = RISE_TIME;
  }

  /** Build the nested wireframe box-lattice (concentric cubes + radial struts) centred at CORE_Y. */
  private buildCageGeo(): THREE.BufferGeometry {
    const U = ARENA_MID;
    const shells = 4;
    // Unit-cube corners + 12 edges.
    const C: ReadonlyArray<readonly [number, number, number]> = [
      [-1, -1, -1],
      [1, -1, -1],
      [1, 1, -1],
      [-1, 1, -1],
      [-1, -1, 1],
      [1, -1, 1],
      [1, 1, 1],
      [-1, 1, 1],
    ];
    const E: ReadonlyArray<readonly [number, number]> = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ];
    const scaleAt = (s: number): number => (8 + s * 7) * U;
    const segCount = shells * E.length + (shells - 1) * C.length;
    const arr = new Float32Array(segCount * 6);
    let o = 0;
    const line = (ax: number, ay: number, az: number, bx: number, by: number, bz: number): void => {
      arr[o++] = ax;
      arr[o++] = ay + CORE_Y;
      arr[o++] = az;
      arr[o++] = bx;
      arr[o++] = by + CORE_Y;
      arr[o++] = bz;
    };
    for (let s = 0; s < shells; s++) {
      const sc = scaleAt(s);
      for (const [i, j] of E) {
        const a = C[i]!;
        const b = C[j]!;
        line(a[0] * sc, a[1] * sc, a[2] * sc, b[0] * sc, b[1] * sc, b[2] * sc);
      }
    }
    for (let s = 0; s < shells - 1; s++) {
      const s0 = scaleAt(s);
      const s1 = scaleAt(s + 1);
      for (const c of C) {
        line(c[0] * s0, c[1] * s0, c[2] * s0, c[0] * s1, c[1] * s1, c[2] * s1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return g;
  }

  /** Scatter an instanced mesh across a Fibonacci sphere shell centred on the core (local space). */
  private fillShell(
    mesh: THREE.InstancedMesh,
    count: number,
    rMin: number,
    rMax: number,
    salt: number,
  ): void {
    const U = ARENA_MID;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = i * GOLDEN_ANGLE;
      const rad = (rMin + hash(i * 3 + salt) * (rMax - rMin)) * U;
      pos.set(Math.cos(th) * r * rad, y * rad, Math.sin(th) * r * rad);
      const size = (0.7 + hash(i * 7 + salt + 1) * 2.4) * U;
      scl.setScalar(size);
      e.set(hash(i + salt) * 6.28, hash(i * 2 + salt) * 6.28, hash(i * 4 + salt) * 6.28);
      q.setFromEuler(e);
      m.compose(pos, q, scl);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  /** Build the deterministic coral dendrite; nodes are ordered base-first so `.count` grows outward. */
  private buildCoral(mesh: THREE.InstancedMesh): void {
    const U = ARENA_MID;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    let n = 0;
    // A handful of seeds around the plinth base; each grows an upward branching filament. Generation
    // order (ring by ring) keeps early instances near the base so revealing more reads as GROWTH.
    const seeds = 6;
    const perSeed = Math.floor(CORAL_CAP / seeds);
    for (let ring = 0; ring < perSeed && n < CORAL_CAP; ring++) {
      for (let s = 0; s < seeds && n < CORAL_CAP; s++) {
        const th0 = (s / seeds) * Math.PI * 2 + hash(s * 7 + 1) * 0.5;
        const baseR = (26 + hash(s * 3 + 2) * 6) * U;
        // Climb + spiral outward as the ring index rises; jitter deterministically per node.
        const climb = ring * 0.7 * U;
        const spiral = th0 + ring * 0.22 + (hash(n * 5 + 3) - 0.5) * 0.3;
        const rr = baseR + ring * 0.5 * U + (hash(n * 9 + 4) - 0.5) * 2 * U;
        pos.set(Math.cos(spiral) * rr, 1.5 * U + climb, Math.sin(spiral) * rr);
        const size = 0.6 + hash(n * 11 + 5) * 0.7;
        scl.setScalar(size);
        m.compose(pos, q, scl);
        mesh.setMatrixAt(n, m);
        n++;
      }
    }
    // Fill any remainder (rounding) so every instance has a finite matrix.
    for (; n < CORAL_CAP; n++) {
      pos.set(0, 1.5 * U, 0);
      scl.setScalar(0.001);
      m.compose(pos, q, scl);
      mesh.setMatrixAt(n, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Animate the megalith: ease it into place over {@link RISE_TIME}, then ignite the caged star,
   * bloom the ray-burst, breathe the box-lattice, orbit the shell, pulse the mote halo, grow the
   * coral with crowding, and spin the aperture glyph-rings. No-op while hidden. Pure `t`/`dt` math
   * (no rng). Hot path O(1); only the lattice warp iterates the (small, fixed) cage vertex buffer.
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
    this.ignition = clamp(ease * (0.18 + 0.82 * this.chaos), 0, 1);
    this.dispersion = clamp(this.entropy, 0, 1);
    this.coralExtent = clamp(ease * this.crowding, 0, 1);

    // ── CRYSTAL CORE — lock the SDF centre to the mesh's live world position + drive ignition. ──
    this.centerVec.set(
      this.group.position.x,
      this.group.position.y + CORE_Y,
      this.group.position.z,
    );
    (this.crystalMat.uniforms.uCenter!.value as THREE.Vector3).copy(this.centerVec);
    this.crystalMat.uniforms.uTime!.value = safeT;
    this.crystalMat.uniforms.uIgnition!.value = this.ignition;
    this.crystalMat.uniforms.uDispersion!.value = this.dispersion;
    this.crystalMat.uniforms.uReactivity!.value = this.reactivity;

    // ── RAY-BURST — bloom the shard glow with ignition; the whole starburst spins slowly. ──
    this.burstMat.opacity = clamp((0.05 + 0.55 * this.ignition + 0.2 * pulse) * ease, 0, 1);
    this.rayBurst.rotation.y = safeT * (0.04 + this.chaos * 0.12);
    this.rayBurst.rotation.x = Math.sin(safeT * 0.17) * 0.25;

    // ── PRISMATIC APERTURE — colour-cycle + open with reactivity. ──
    this.portalColor.copy(PORTAL_A).lerp(PORTAL_B, pulse);
    const u = this.portalMat.uniforms;
    (u.uColor!.value as THREE.Vector3).set(
      this.portalColor.r,
      this.portalColor.g,
      this.portalColor.b,
    );
    (u.uOpacity!.value as number) = (0.34 + pulse * 0.22 + this.reactivity * 0.28) * ease;
    (u.uTime!.value as number) = safeT;
    (u.uReactivity!.value as number) = this.reactivity;
    (u.uDispersion!.value as number) = this.dispersion;

    this.haloMat.opacity = (0.08 + pulse * 0.1 + this.reactivity * 0.18) * ease;
    this.shadowMat.opacity = Math.min(0.94, 0.34 + this.shadow * 0.58);
    this.shadowCore.scale.setScalar(0.88 + ease * 0.28 + this.shadow * 0.44);
    this.singularityMat.opacity = (0.24 + this.shimmer * 0.5) * ease;
    this.singularityMat.color.setHSL(0.6 + this.dispersion * 0.06, 0.85, 0.4 + this.ignition * 0.3);
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

    // ── ORBIT SHELL — slow precession; fade in with the rise; kindle the sphere emissive. ──
    this.orbitGroup.rotation.y = safeT * (0.03 + this.chaos * 0.05);
    this.orbitGroup.rotation.x = Math.sin(safeT * 0.11) * 0.12;
    this.orbitCubeMat.opacity = (0.1 + this.shimmer * 0.35) * ease;
    this.orbitSphereMat.opacity = (0.35 + this.shimmer * 0.4) * ease;
    this.orbitSphereMat.emissiveIntensity = 0.15 + this.ignition * 0.7;

    // ── MOTE HALO — the spark-sphere breathes with shimmer. ──
    this.moteMat.opacity = (0.15 + this.shimmer * 0.6) * ease;
    this.moteMat.size = (0.4 + this.shimmer * 0.6) * ARENA_MID;
    this.motes.rotation.y = -safeT * (0.05 + this.reactivity * 0.1);

    // ── STANDING STONES — kindle with reactivity; subtle sway. ──
    for (let i = 0; i < this.stones.length; i++) {
      const st = this.stones[i]!;
      st.rotation.z = Math.sin(safeT * 0.2 + i) * this.reactivity * 0.05;
    }
    this.stoneMat.emissiveIntensity = 0.2 + this.reactivity * 0.8;

    // ── CORAL GROWTH — reveal more of the dendrite as population/crowding climbs (real coupling). ──
    this.coral.count = Math.max(0, Math.min(CORAL_CAP, Math.floor(this.coralExtent * CORAL_CAP)));
    this.coralMat.opacity = 0.5 + this.shimmer * 0.4;

    this.warpCage(safeT, ease);
    this.greeble.update(safeT, this.reactivity, this.chaos);
  }

  /** Warp the box-lattice in-place; fixed vertex count, no allocations. */
  private warpCage(t: number, ease: number): void {
    const pos = this.cageGeo.getAttribute('position') as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const base = this.cageBase;
    const amp = this.cageWarp;
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
    this.cageMat.color.setHSL(0.58 + this.dispersion * 0.14, 0.7, 0.55 + this.shimmer * 0.2);
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
      ignition: this.ignition,
      dispersion: this.dispersion,
      coralExtent: this.coralExtent,
      visualNodes: this.group.children.length,
    };
  }

  /** Remove + free all GPU resources. */
  dispose(): void {
    this.greeble.dispose();
    this.scene.remove(this.group);
    for (const mesh of this.instancedMeshes) mesh.dispose();
    for (const g of this.geos) g.dispose();
    for (const m of this.mats) m.dispose();
  }
}

/** Preferred name for the redesigned end-state; `MonolithTemple` is kept for the existing wiring/tests. */
export const MonolithMegalith = MonolithTemple;

function norm01(v: number): number {
  return Number.isFinite(v) ? clamp(v, 0, 1) : 0;
}

function finitePositive(v: number): number {
  return Number.isFinite(v) && v > 0 ? v : 0;
}

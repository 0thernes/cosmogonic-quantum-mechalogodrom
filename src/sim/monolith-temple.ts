/**
 * THE MONOLITH MEGALITH (CONTRACTS V63 → rebuilt V124) — the level-100 ascension end-state made
 * physical. When the super creature reaches the LEGENDARY apex (`SuperEvolution.ascended`), a
 * **recursive cube caged in a voxel lattice** rises from the field.
 *
 * ─── ENGINEERING / ARCHITECTURE (rebuild, geometry-first) ───────────────────────────────────────
 * Cut from six reference images (see docs/MONOLITH-MEGALITH-ART-DIRECTION.md). The images are NOT a
 * colour scheme — they are a GEOMETRY. Their shared structural vocabulary is exactly two atomic
 * primitives, **CUBE + SPHERE**, composed into a **wireframe voxel LATTICE**, a **radial line-burst**
 * from a point-source, a **woven geodesic shell**, an **orthogonal maze**, and a **black void throat**.
 * So the megalith is built entirely from that vocabulary, in strict MONOCHROME (black / white /
 * silver — zero hue):
 *
 *   1. MENGER CORE     (img1 cube-lens / img2,4 nested cubes) — a RAYMARCHED recursive-cube fractal
 *      (Menger sponge): a cube carved with cubic cavities, self-similar, caging a white point whose
 *      light bleeds out through the holes. Ignition (chaos) brightens the caged point.
 *   2. VOXEL LATTICE   (img2 infinite cubic grid) — nested wireframe cube shells + radial struts + an
 *      inner cell-grid: the cubic spacetime the megalith lives inside. Breathes with reactivity.
 *   3. RAY-BURST       (img1 warp explosion)       — thousands of DEAD-STRAIGHT radial light filaments
 *      (line segments, not cones) firing from the core point; glow blooms with ignition.
 *   4. GEODESIC SHELL  (img3 cube-in-woven-sphere)  — great-circle arcs woven into a sphere caging the
 *      core cube; a cube inside a sphere of light-thread. Breathes with shimmer.
 *   5. SUSPENDED PRIMITIVES (img2,4 cubes + spheres) — instanced dark solid cubes + tessellated
 *      wireframe spheres floating in the lattice cells; slowly precessing.
 *   6. STARFIELD       (img2 star-dust in the grid) — a point field seeded through the lattice volume.
 *   7. MAZE PLINTH     (img5 orthogonal labyrinth)  — a ring of axis-aligned cubic BLOCKS at the base
 *      (also why visualNodes ≥ 25); kindle with reactivity.
 *   8. VOID THROAT     (img5 black sink + filament web) — a black void with a thin bright rim and a
 *      fan of filament-web lines: the gateway to GAME STAGE 2, an absence, not a glowing disc.
 *   9. CORAL DENDRITE  (img5 growth colonizing the grid) — a deterministic dendrite of tiny cubes
 *      threading the maze toward the void; its extent is a DIRECT readout of population/crowding.
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
/** World-space height of the caged point / cube centre above the megalith's base. */
const CORE_Y = 24 * ARENA_MID;

/** Golden angle — Fibonacci-sphere / spiral spacing for suspended primitives, filaments + motes. */
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
  /** Shell/lattice shimmer scalar, 0..1-ish. */
  readonly shimmer: number;
  /** Void-throat intensity scalar, 0..1-ish. */
  readonly shadow: number;
  /** Voxel-lattice displacement amplitude in world units. */
  readonly cageWarp: number;
  /** Population / capacity, guarded and clamped. */
  readonly crowding: number;
  /** Caged-point brightness (chaos-bound), 0..1 — the "ignition" of the newborn light. */
  readonly ignition: number;
  /** Radial spread of the burst / edge sharpness (entropy-bound), 0..1. */
  readonly dispersion: number;
  /** Fraction of the coral dendrite that has colonized the maze (crowding-bound), 0..1. */
  readonly coralExtent: number;
  /** Number of direct children in the megalith rig. */
  readonly visualNodes: number;
}

/** Suspended-primitive counts (instanced — cheap). */
const SUSP_CUBES = 110;
const SUSP_SPHERES = 90;
/** Radial light-filament count for the ray-burst. */
const RAY_LINES = 320;
/** Great-circle count for the woven geodesic shell. */
const SHELL_CIRCLES = 16;
const SHELL_SEG = 44;
/** Star-dust point count seeded through the lattice volume. */
const STAR_COUNT = 900;
/** Maze-block count (direct children — also guarantees visualNodes ≥ 25). */
const MAZE_BLOCKS = 24;
/** Coral dendrite node cap; visible count scales with crowding. */
const CORAL_CAP = 300;
/** Filament-web line count fanning from the void throat. */
const WEB_LINES = 72;

export class MonolithTemple {
  private readonly scene: THREE.Scene;
  private readonly group = new THREE.Group();
  /** Abomination-architecture detail shell: the brutalist cube base (img4). */
  private readonly greeble: TempleGreeble;
  private readonly geos: THREE.BufferGeometry[] = [];
  private readonly mats: THREE.Material[] = [];
  private readonly instancedMeshes: THREE.InstancedMesh[] = [];
  /** The raymarched Menger core's shader material — carries uTime + uResolution (see the regression test). */
  private readonly coreMat: THREE.ShaderMaterial;
  /** Radial ray-burst line material (shared). */
  private readonly burstMat: THREE.LineBasicMaterial;
  private readonly burst: THREE.LineSegments;
  private readonly latticeMat: THREE.LineBasicMaterial;
  private readonly lattice: THREE.LineSegments;
  private readonly latticeGeo: THREE.BufferGeometry;
  private readonly latticeBase: Float32Array;
  private readonly shellMat: THREE.LineBasicMaterial;
  private readonly shell: THREE.LineSegments;
  private readonly starMat: THREE.PointsMaterial;
  private readonly stars: THREE.Points;
  private readonly orbitGroup = new THREE.Group();
  private readonly suspCubeMat: THREE.MeshStandardMaterial;
  private readonly suspSphereMat: THREE.MeshBasicMaterial;
  private readonly voidMat: THREE.MeshBasicMaterial;
  private readonly voidCore: THREE.Mesh;
  private readonly rimMat: THREE.MeshBasicMaterial;
  private readonly rim: THREE.Mesh;
  private readonly webMat: THREE.LineBasicMaterial;
  private readonly web: THREE.LineSegments;
  private readonly mazeMat: THREE.MeshStandardMaterial;
  private readonly mazeBlocks: THREE.Mesh[] = [];
  private readonly coralMat: THREE.MeshBasicMaterial;
  private readonly coral: THREE.InstancedMesh;
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

    // ── 1. MENGER CORE — a raymarched recursive-cube fractal caging a white point. ──
    // The SDF works in WORLD space relative to `uCenter`, which update() locks to the mesh's live
    // world position, so the cube stays welded to the megalith as it rises.
    this.coreMat = new THREE.ShaderMaterial({
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
        uniform float uIgnition;   // caged-point brightness (chaos)
        uniform float uDispersion; // edge sharpness / spectral whisper (entropy)
        uniform float uReactivity;
        varying vec3 vWorldPos;

        mat2 rot(float a){ float s=sin(a), c=cos(a); return mat2(c,-s,s,c); }

        float sdBox(vec3 p, vec3 b){
          vec3 d = abs(p) - b;
          return min(max(d.x,max(d.y,d.z)),0.0) + length(max(d,0.0));
        }

        // MENGER SPONGE (Iñigo Quílez): a cube recursively carved with cubic cavities — the exact
        // nested-cube / faceted-cube geometry of the reference images, done as a real SDF fractal.
        float mapCore(vec3 p){
          vec3 q = (p - uCenter) / 26.0;
          q.xz *= rot(uTime * 0.06);
          q.xy *= rot(uTime * 0.045);
          float d = sdBox(q, vec3(1.0));
          float s = 1.0;
          for(int m=0; m<4; m++){
            vec3 a = mod(q * s, 2.0) - 1.0;
            s *= 3.0;
            vec3 r = abs(1.0 - 3.0 * abs(a));
            float da = max(r.x, r.y);
            float db = max(r.y, r.z);
            float dc = max(r.z, r.x);
            float c = (min(da, min(db, dc)) - 1.0) / s;
            d = max(d, c);
          }
          return d * 26.0;
        }

        vec3 calcNormal(vec3 p){
          const vec2 e = vec2(0.08, 0.0);
          return normalize(vec3(
            mapCore(p+e.xyy) - mapCore(p-e.xyy),
            mapCore(p+e.yxy) - mapCore(p-e.yxy),
            mapCore(p+e.yyx) - mapCore(p-e.yyx)
          ));
        }

        void main(){
          vec3 ro = cameraPosition;
          vec3 rd = normalize(vWorldPos - ro);

          float t = 0.0, maxD = 360.0;
          float coreMin = 1e9;                          // closest approach to the caged point
          vec3 p = ro;
          bool hit = false;
          for(int i=0;i<96;i++){
            p = ro + rd * t;
            float d = mapCore(p);
            coreMin = min(coreMin, length(p - uCenter));
            if(d < 0.02){ hit = true; break; }
            if(t > maxD) break;
            t += d;
          }

          // The caged point always bleeds through the cubic cavities — a white volumetric glow.
          float star = exp(-coreMin * 0.16) * (0.3 + 2.8 * uIgnition);

          if(!hit){
            if(star < 0.02) discard;                     // let the burst / background show through
            gl_FragColor = vec4(vec3(star), clamp(star, 0.0, 1.0));
            return;
          }

          vec3 n = calcNormal(p);
          vec3 v = -rd;
          float fres = pow(clamp(1.0 - max(dot(n, v), 0.0), 0.0, 1.0), 3.0);

          // MONOCHROME: near-black cube body, read only by a white fresnel rim + ambient occlusion of
          // the recursion depth. A razor-thin, near-symmetric chromatic split at the very edge is the
          // only concession to the prism (kept white-ish; NO neon).
          float ao = clamp(mapCore(p + n * 4.0) / 4.0, 0.0, 1.0);
          vec3 body = vec3(0.02) + vec3(0.06) * ao;
          float chroma = uDispersion * 0.35;
          float rimR = pow(clamp(1.0 - max(dot(n, v + vec3(chroma, 0.0, 0.0)), 0.0), 0.0, 1.0), 3.0);
          float rimB = pow(clamp(1.0 - max(dot(n, v - vec3(chroma, 0.0, 0.0)), 0.0), 0.0, 1.0), 3.0);
          vec3 rim = vec3(rimR, fres, rimB) * (0.85 + 1.4 * uReactivity);

          vec3 col = body + rim + vec3(star);
          float alpha = clamp(0.4 + fres * 0.55 + star, 0.0, 1.0);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.mats.push(this.coreMat);
    const boundsGeo = new THREE.BoxGeometry(60 * U, 60 * U, 60 * U);
    this.geos.push(boundsGeo);
    const boundsMesh = new THREE.Mesh(boundsGeo, this.coreMat);
    boundsMesh.position.set(0, CORE_Y, 0);
    boundsMesh.frustumCulled = false;
    this.group.add(boundsMesh);

    // ── 2. VOXEL LATTICE — nested wireframe cube shells + struts + inner cell-grid. ──
    this.latticeGeo = this.buildLatticeGeo();
    this.geos.push(this.latticeGeo);
    this.latticeBase = new Float32Array(
      (this.latticeGeo.getAttribute('position') as THREE.BufferAttribute)
        .array as ArrayLike<number>,
    );
    this.latticeMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.mats.push(this.latticeMat);
    this.lattice = new THREE.LineSegments(this.latticeGeo, this.latticeMat);
    this.lattice.frustumCulled = false;
    this.group.add(this.lattice);

    // ── 3. RAY-BURST — dead-straight radial light filaments from the core point (img1). ──
    {
      const arr = new Float32Array(RAY_LINES * 6);
      for (let i = 0; i < RAY_LINES; i++) {
        const y = 1 - (i / (RAY_LINES - 1)) * 2;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const th = i * GOLDEN_ANGLE;
        const dx = Math.cos(th) * r;
        const dy = y;
        const dz = Math.sin(th) * r;
        const len = (16 + hash(i * 3 + 1) * 46) * U;
        const inner = 2 * U; // start just outside the point
        arr[i * 6] = dx * inner;
        arr[i * 6 + 1] = CORE_Y + dy * inner;
        arr[i * 6 + 2] = dz * inner;
        arr[i * 6 + 3] = dx * len;
        arr[i * 6 + 4] = CORE_Y + dy * len;
        arr[i * 6 + 5] = dz * len;
      }
      const burstGeo = new THREE.BufferGeometry();
      burstGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      this.geos.push(burstGeo);
      this.burstMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.mats.push(this.burstMat);
      this.burst = new THREE.LineSegments(burstGeo, this.burstMat);
      this.burst.frustumCulled = false;
      this.group.add(this.burst);
    }

    // ── 4. GEODESIC SHELL — great-circle arcs woven into a sphere caging the cube (img3). ──
    {
      const pts: number[] = [];
      const rad = 15 * U;
      const u = new THREE.Vector3();
      const w = new THREE.Vector3();
      const axis = new THREE.Vector3();
      const a = new THREE.Vector3();
      const b = new THREE.Vector3();
      for (let c = 0; c < SHELL_CIRCLES; c++) {
        // A deterministic great-circle: pick an axis, build an orthonormal basis (u, w) spanning it.
        axis.set(hash(c * 7 + 1) - 0.5, hash(c * 7 + 2) - 0.5, hash(c * 7 + 3) - 0.5).normalize();
        u.set(axis.z, 0, -axis.x);
        if (u.lengthSq() < 1e-4) u.set(0, 1, 0);
        u.normalize();
        w.copy(axis).cross(u).normalize();
        for (let sIdx = 0; sIdx < SHELL_SEG; sIdx++) {
          const t0 = (sIdx / SHELL_SEG) * Math.PI * 2;
          const t1 = ((sIdx + 1) / SHELL_SEG) * Math.PI * 2;
          a.copy(u)
            .multiplyScalar(Math.cos(t0) * rad)
            .addScaledVector(w, Math.sin(t0) * rad);
          b.copy(u)
            .multiplyScalar(Math.cos(t1) * rad)
            .addScaledVector(w, Math.sin(t1) * rad);
          pts.push(a.x, CORE_Y + a.y, a.z, b.x, CORE_Y + b.y, b.z);
        }
      }
      const shellGeo = new THREE.BufferGeometry();
      shellGeo.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(pts), 3));
      this.geos.push(shellGeo);
      this.shellMat = new THREE.LineBasicMaterial({
        color: 0xcfcfcf,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.mats.push(this.shellMat);
      this.shell = new THREE.LineSegments(shellGeo, this.shellMat);
      this.shell.position.set(0, CORE_Y, 0); // rotate/scale about the core
      this.shell.frustumCulled = false;
      // geometry is authored in world-y; recentre so the group transform + local scale act about CORE_Y
      shellGeo.translate(0, -CORE_Y, 0);
      this.group.add(this.shell);
    }

    // ── 5. SUSPENDED PRIMITIVES — dark solid cubes + tessellated wireframe spheres (img2, img4). ──
    this.suspCubeMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 0.4,
      metalness: 0.6,
      emissive: 0x000000,
      emissiveIntensity: 0.0,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.suspSphereMat = new THREE.MeshBasicMaterial({
      color: 0x8a8a8a,
      wireframe: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.mats.push(this.suspCubeMat, this.suspSphereMat);
    const suspCubeGeo = new THREE.BoxGeometry(1, 1, 1);
    const suspSphereGeo = new THREE.IcosahedronGeometry(1, 2); // tessellated "gridded" sphere
    this.geos.push(suspCubeGeo, suspSphereGeo);
    const suspCubes = new THREE.InstancedMesh(suspCubeGeo, this.suspCubeMat, SUSP_CUBES);
    const suspSpheres = new THREE.InstancedMesh(suspSphereGeo, this.suspSphereMat, SUSP_SPHERES);
    suspCubes.frustumCulled = false;
    suspSpheres.frustumCulled = false;
    this.fillShell(suspCubes, SUSP_CUBES, 18, 40, 101, true);
    this.fillShell(suspSpheres, SUSP_SPHERES, 20, 42, 211, false);
    this.orbitGroup.position.set(0, CORE_Y, 0);
    this.orbitGroup.add(suspCubes);
    this.orbitGroup.add(suspSpheres);
    this.group.add(this.orbitGroup);
    this.instancedMeshes.push(suspCubes, suspSpheres);

    // ── 6. STARFIELD — star-dust seeded through the lattice volume (img2). ──
    {
      const arr = new Float32Array(STAR_COUNT * 3);
      for (let i = 0; i < STAR_COUNT; i++) {
        arr[i * 3] = (hash(i * 3 + 11) - 0.5) * 96 * U;
        arr[i * 3 + 1] = CORE_Y + (hash(i * 3 + 12) - 0.5) * 96 * U;
        arr[i * 3 + 2] = (hash(i * 3 + 13) - 0.5) * 96 * U;
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      this.geos.push(starGeo);
      this.starMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.4 * U,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      });
      this.mats.push(this.starMat);
      this.stars = new THREE.Points(starGeo, this.starMat);
      this.stars.frustumCulled = false;
      this.group.add(this.stars);
    }

    // ── 8. VOID THROAT — a black void with a thin bright rim + a fan of filament-web lines (img5). ──
    // (Built before the maze so the maze blocks are the last direct children, but order is irrelevant.)
    const voidY = CORE_Y;
    this.voidMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    this.mats.push(this.voidMat);
    const voidGeo = new THREE.SphereGeometry(5.5 * U, 32, 20);
    this.geos.push(voidGeo);
    this.voidCore = new THREE.Mesh(voidGeo, this.voidMat);
    this.voidCore.position.set(0, voidY, -0.5 * U);
    this.voidCore.frustumCulled = false;
    this.group.add(this.voidCore);

    this.rimMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.mats.push(this.rimMat);
    const rimGeo = new THREE.TorusGeometry(6.2 * U, 0.16 * U, 8, 96);
    this.geos.push(rimGeo);
    this.rim = new THREE.Mesh(rimGeo, this.rimMat);
    this.rim.position.set(0, voidY, -0.3 * U);
    this.rim.frustumCulled = false;
    this.group.add(this.rim);

    {
      const arr = new Float32Array(WEB_LINES * 6);
      for (let i = 0; i < WEB_LINES; i++) {
        const th = i * GOLDEN_ANGLE;
        const r0 = 6.2 * U;
        const r1 = (7 + hash(i * 5 + 1) * 20) * U;
        const el = (hash(i * 7 + 2) - 0.5) * 1.2; // slight vertical fan
        arr[i * 6] = Math.cos(th) * r0;
        arr[i * 6 + 1] = voidY + Math.sin(th) * r0 * 0.4;
        arr[i * 6 + 2] = -0.3 * U;
        arr[i * 6 + 3] = Math.cos(th) * r1;
        arr[i * 6 + 4] = voidY + Math.sin(th) * r1 * 0.4 + el * r1 * 0.3;
        arr[i * 6 + 5] = -0.3 * U - hash(i * 9 + 3) * 6 * U;
      }
      const webGeo = new THREE.BufferGeometry();
      webGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      this.geos.push(webGeo);
      this.webMat = new THREE.LineBasicMaterial({
        color: 0x9a9a9a,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.mats.push(this.webMat);
      this.web = new THREE.LineSegments(webGeo, this.webMat);
      this.web.frustumCulled = false;
      this.group.add(this.web);
    }

    // ── 7. MAZE PLINTH — a ring of axis-aligned cubic blocks (img5); direct children ⇒ nodes ≥ 25. ──
    const mazeGeo = new THREE.BoxGeometry(1, 1, 1);
    this.geos.push(mazeGeo);
    this.mazeMat = new THREE.MeshStandardMaterial({
      color: 0xdedede,
      roughness: 0.9,
      metalness: 0.05,
      emissive: 0x0a0a0a,
      emissiveIntensity: 0.2,
    });
    this.mats.push(this.mazeMat);
    for (let i = 0; i < MAZE_BLOCKS; i++) {
      const th = (i / MAZE_BLOCKS) * Math.PI * 2 + hash(i * 5 + 1) * 0.15;
      const rad = (26 + hash(i * 3 + 2) * 12) * U;
      const bw = (3 + hash(i * 7 + 3) * 4) * U;
      const bd = (3 + hash(i * 11 + 4) * 4) * U;
      const bh = (6 + hash(i * 13 + 5) * 18) * U;
      const blk = new THREE.Mesh(mazeGeo, this.mazeMat);
      blk.position.set(Math.cos(th) * rad, bh / 2, Math.sin(th) * rad);
      blk.scale.set(bw, bh, bd); // axis-aligned — orthogonal maze, no tilt
      blk.frustumCulled = false;
      this.group.add(blk);
      this.mazeBlocks.push(blk);
    }

    // ── 9. CORAL DENDRITE — tiny cubes threading the maze toward the void; extent = crowding. ──
    this.coralMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    this.mats.push(this.coralMat);
    const coralGeo = new THREE.BoxGeometry(0.6 * U, 0.6 * U, 0.6 * U); // cubic vocabulary
    this.geos.push(coralGeo);
    this.coral = new THREE.InstancedMesh(coralGeo, this.coralMat, CORAL_CAP);
    this.coral.frustumCulled = false;
    this.buildCoral(this.coral);
    this.coral.count = 0; // nothing colonized until crowding rises
    this.group.add(this.coral);
    this.instancedMeshes.push(this.coral);

    // The brutalist cube base (img4 megastructure), recoloured pure grey.
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

  /** Build the voxel lattice: nested wireframe cube shells + radial struts + an inner cell-grid. */
  private buildLatticeGeo(): THREE.BufferGeometry {
    const U = ARENA_MID;
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
    const pts: number[] = [];
    const line = (ax: number, ay: number, az: number, bx: number, by: number, bz: number): void => {
      pts.push(ax, ay + CORE_Y, az, bx, by + CORE_Y, bz);
    };
    // Nested cube shells.
    const shells = 5;
    const scaleAt = (s: number): number => (7 + s * 6) * U;
    for (let s = 0; s < shells; s++) {
      const sc = scaleAt(s);
      for (const [i, j] of E) {
        const a = C[i]!;
        const b = C[j]!;
        line(a[0] * sc, a[1] * sc, a[2] * sc, b[0] * sc, b[1] * sc, b[2] * sc);
      }
    }
    // Radial struts connecting shell corners outward.
    for (let s = 0; s < shells - 1; s++) {
      const s0 = scaleAt(s);
      const s1 = scaleAt(s + 1);
      for (const c of C) {
        line(c[0] * s0, c[1] * s0, c[2] * s0, c[0] * s1, c[1] * s1, c[2] * s1);
      }
    }
    // Inner cell-grid (voxel cells) inside shell 0 — the cubic spacetime reading of img2.
    const g = 4;
    const half = scaleAt(0);
    const step = (2 * half) / g;
    for (let a = 0; a <= g; a++) {
      for (let b = 0; b <= g; b++) {
        const pa = -half + a * step;
        const pb = -half + b * step;
        line(pa, pb, -half, pa, pb, half); // z-runs
        line(pa, -half, pb, pa, half, pb); // y-runs
        line(-half, pa, pb, half, pa, pb); // x-runs
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(pts), 3));
    return geo;
  }

  /** Scatter an instanced mesh across a Fibonacci sphere shell centred on the core (local space). */
  private fillShell(
    mesh: THREE.InstancedMesh,
    count: number,
    rMin: number,
    rMax: number,
    salt: number,
    axisAligned: boolean,
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
      const size = (0.9 + hash(i * 7 + salt + 1) * 3.2) * U;
      scl.setScalar(size);
      if (axisAligned) {
        // Cubes read the cubic lattice — keep them axis-aligned (only 90° yaw steps).
        e.set(0, (Math.floor(hash(i * 2 + salt) * 4) * Math.PI) / 2, 0);
      } else {
        e.set(hash(i + salt) * 6.28, hash(i * 2 + salt) * 6.28, hash(i * 4 + salt) * 6.28);
      }
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
    // Seeds around the maze ring; each grows a branching filament that CLIMBS + threads toward the
    // void at the centre. Generation order (ring by ring) keeps early instances near the base.
    const seeds = 6;
    const perSeed = Math.floor(CORAL_CAP / seeds);
    for (let ring = 0; ring < perSeed && n < CORAL_CAP; ring++) {
      for (let s = 0; s < seeds && n < CORAL_CAP; s++) {
        const th0 = (s / seeds) * Math.PI * 2 + hash(s * 7 + 1) * 0.4;
        const baseR = (28 + hash(s * 3 + 2) * 8) * U;
        const frac = ring / perSeed; // 0 at base ring → 1 near the void
        const rr = baseR * (1 - frac * 0.7) + (hash(n * 9 + 4) - 0.5) * 2 * U; // spiral inward
        const spiral = th0 + ring * 0.24 + (hash(n * 5 + 3) - 0.5) * 0.3;
        const climb = frac * 14 * U;
        pos.set(Math.cos(spiral) * rr, 1.5 * U + climb, Math.sin(spiral) * rr);
        const size = 0.7 + hash(n * 11 + 5) * 0.8;
        scl.setScalar(size);
        m.compose(pos, q, scl);
        mesh.setMatrixAt(n, m);
        n++;
      }
    }
    for (; n < CORAL_CAP; n++) {
      pos.set(0, 1.5 * U, 0);
      scl.setScalar(0.001);
      m.compose(pos, q, scl);
      mesh.setMatrixAt(n, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Animate the megalith: ease it into place over {@link RISE_TIME}, then ignite the caged point,
   * bloom the ray-burst, breathe the lattice + shell, precess the suspended primitives, grow the
   * coral with crowding, and open the void. No-op while hidden. Pure `t`/`dt` math (no rng). Hot path
   * O(1); only the lattice warp iterates the (small, fixed) lattice vertex buffer.
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

    // ── MENGER CORE — lock the SDF centre to the mesh's live world position + drive ignition. ──
    this.centerVec.set(
      this.group.position.x,
      this.group.position.y + CORE_Y,
      this.group.position.z,
    );
    (this.coreMat.uniforms.uCenter!.value as THREE.Vector3).copy(this.centerVec);
    this.coreMat.uniforms.uTime!.value = safeT;
    this.coreMat.uniforms.uIgnition!.value = this.ignition;
    this.coreMat.uniforms.uDispersion!.value = this.dispersion;
    this.coreMat.uniforms.uReactivity!.value = this.reactivity;

    // ── RAY-BURST — bloom the filament glow with ignition; the whole burst spins slowly. ──
    this.burstMat.opacity = clamp((0.04 + 0.6 * this.ignition + 0.18 * pulse) * ease, 0, 1);
    this.burst.rotation.y = safeT * (0.03 + this.chaos * 0.1);
    this.burst.rotation.x = Math.sin(safeT * 0.15) * 0.2;

    // ── GEODESIC SHELL — breathe radius with shimmer; slow counter-rotation. ──
    this.shellMat.opacity = (0.12 + this.shimmer * 0.5) * ease;
    this.shell.scale.setScalar(0.9 + this.shimmer * 0.2);
    this.shell.rotation.y = -safeT * (0.05 + this.reactivity * 0.12);
    this.shell.rotation.z = safeT * 0.03;

    // ── VOXEL LATTICE — breathe with reactivity (warp) + fade in with the rise. ──
    this.warpLattice(safeT, ease);

    // ── SUSPENDED PRIMITIVES — slow precession; fade in; the cubes catch a faint light. ──
    this.orbitGroup.rotation.y = safeT * (0.025 + this.chaos * 0.04);
    this.orbitGroup.rotation.x = Math.sin(safeT * 0.09) * 0.1;
    this.suspCubeMat.opacity = (0.55 + this.shimmer * 0.3) * ease;
    this.suspCubeMat.emissiveIntensity = 0.05 + this.ignition * 0.35;
    this.suspSphereMat.opacity = (0.12 + this.shimmer * 0.3) * ease;

    // ── STARFIELD — twinkle with shimmer; drift slowly. ──
    this.starMat.opacity = (0.2 + this.shimmer * 0.5) * ease;
    this.stars.rotation.y = safeT * 0.006;

    // ── VOID THROAT — open the sink + thin bright rim + fan the filament web. ──
    this.voidMat.opacity = Math.min(0.96, 0.4 + this.shadow * 0.56);
    this.voidCore.scale.setScalar(0.85 + ease * 0.3 + this.shadow * 0.4);
    this.rimMat.opacity = (0.35 + this.shimmer * 0.5) * ease;
    this.rim.rotation.z = safeT * (0.2 + this.reactivity * 0.6);
    this.web.rotation.z = -safeT * (0.04 + this.reactivity * 0.08);
    this.webMat.opacity = (0.08 + this.shimmer * 0.32) * ease;

    // ── MAZE PLINTH — kindle with reactivity. ──
    this.mazeMat.emissiveIntensity = 0.12 + this.reactivity * 0.5;

    // ── CORAL DENDRITE — reveal more as population/crowding climbs (real coupling). ──
    this.coral.count = Math.max(0, Math.min(CORAL_CAP, Math.floor(this.coralExtent * CORAL_CAP)));
    this.coralMat.opacity = 0.5 + this.shimmer * 0.4;

    this.greeble.update(safeT, this.reactivity, this.chaos);
  }

  /** Warp the voxel lattice in-place; fixed vertex count, no allocations. */
  private warpLattice(t: number, ease: number): void {
    const pos = this.latticeGeo.getAttribute('position') as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const base = this.latticeBase;
    const amp = this.cageWarp;
    for (let i = 0; i < arr.length; i += 3) {
      const bx = base[i] ?? 0;
      const by = base[i + 1] ?? 0;
      const bz = base[i + 2] ?? 0;
      const wave =
        Math.sin(bx * 0.024 + t * (0.9 + this.chaos)) +
        Math.sin(bz * 0.031 - t * (0.7 + this.entropy)) +
        0.5 * Math.sin((bx + by + bz) * 0.012 + t * 1.9);
      const squeeze = 1 + ease * this.reactivity * 0.06 * wave;
      arr[i] = bx * squeeze;
      arr[i + 1] = by + wave * amp * 0.5;
      arr[i + 2] = bz * (1 - ease * this.reactivity * 0.045 * wave);
    }
    pos.needsUpdate = true;
    this.lattice.rotation.y = t * (0.015 + this.chaos * 0.05);
    this.latticeMat.opacity = (0.14 + this.shimmer * 0.32) * ease;
    // Monochrome: brightness tracks shimmer, never hue.
    const g = 0.55 + this.shimmer * 0.35;
    this.latticeMat.color.setRGB(g, g, g);
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

/** Preferred name for the rebuilt end-state; `MonolithTemple` is kept for the existing wiring/tests. */
export const MonolithMegalith = MonolithTemple;

function norm01(v: number): number {
  return Number.isFinite(v) ? clamp(v, 0, 1) : 0;
}

function finitePositive(v: number): number {
  return Number.isFinite(v) && v > 0 ? v : 0;
}

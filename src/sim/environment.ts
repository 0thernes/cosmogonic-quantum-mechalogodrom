import * as THREE from 'three';
import type { Rng } from '../math/rng';
import { TAU, clamp, lerp } from '../math/scalar';
import type { SimContext, SimState } from '../types';
import {
  ARENA,
  ARENA_MID,
  ARENA_Y,
  DIORAMA_CONFIG,
  GROUND_EXTENT,
  MONOLITH_CONFIG,
  PIPE_LINKS,
} from './constants';

const sin = Math.sin;
const cos = Math.cos;
const abs = Math.abs;
const PI = Math.PI;
/** Non-negative floor for chaos-driven intensity/opacity waves (also seals NaN → 0). O(1). */
const nn = (v: number): number => (v > 0 ? v : 0);

// ── BRUTALISM: concrete targets + base colours (module consts → zero per-frame allocation). The
//    rig + ground are lerped from these bases toward concrete by the 0..1 factor, so the f=0 path
//    early-returns and leaves the animated cosmos byte-identical. ──
const BRUTAL_GROUND = new THREE.Color(0x3a3a3e);
const BRUTAL_GROUND_EMISSIVE = new THREE.Color(0x141416);
const BRUTAL_LIGHT = new THREE.Color(0x9a9aa0); // cold overcast grey for the whole light rig
const GROUND_BASE = new THREE.Color(0x080812);
const GROUND_BASE_EMISSIVE = new THREE.Color(0x040410);
const AMBIENT_BASE = new THREE.Color(0x0a0a22);
const SUN_BASE = new THREE.Color(0xffeedd);
const LIGHT_BASE: readonly THREE.Color[] = [
  0xff0066, 0x00ffcc, 0xffaa00, 0x4488ff, 0xff2200, 0x8800ff,
].map((h) => new THREE.Color(h));

/**
 * Light-unit conversion gain for the r128 → r0.184 lighting migration.
 *
 * The legacy monolith was authored under three r128, whose lights used the old
 * non-physical intensity unit. three r0.184 interprets light intensity in
 * (roughly) physical units, leaving the colored point-light rig 80–320× dimmer
 * than the legacy reference once `WebGLRenderer.useLegacyLights` was removed.
 * Rather than retune every light by hand, we fold the whole correction into one
 * calibrated gain so the rig stays legacy-faithful and tunable from a single
 * place.
 *
 * - Ambient + directional (sun): multiply legacy intensity by `LEGACY_LIGHT_GAIN`.
 * - PointLights: multiply legacy intensity by `POINT_LIGHT_GAIN`
 *   (= `LEGACY_LIGHT_GAIN * 0.5`) AND set `decay = 0`, since the legacy
 *   distance-attenuation model used no physical inverse-square falloff. The
 *   half factor restores the legacy brightness balance between the broad
 *   ambient/sun fill and the punchier colored point sources.
 *
 * Every per-frame intensity write (the animated waves) is scaled by the same
 * gain so the waves keep their legacy SHAPE at the new unit scale.
 */
export const LEGACY_LIGHT_GAIN = PI;

/**
 * PointLight-specific gain — see {@link LEGACY_LIGHT_GAIN}. Imported by every
 * module that owns PointLights (shoggoths, puppet-masters) so the whole rig
 * calibrates from the single `LEGACY_LIGHT_GAIN` knob.
 */
export const POINT_LIGHT_GAIN = LEGACY_LIGHT_GAIN * 0.5;

/** Halo ring orbiting a monolith; `axis` picks the rotation axis (legacy `ra`). */
interface HaloRing {
  mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  /** Rotation speed (legacy `rs` = 0.3 + ri * 0.2). */
  speed: number;
  /** 0 → rotate X, 1 → rotate Y, anything else → rotate Z. */
  axis: number;
}

/** Animated parts of one monolith (legacy `mGr` child userData). */
interface MonolithRig {
  /** Crown PointLight hovering at h + 2 (legacy `bc`). */
  crown: THREE.PointLight;
  hue: number;
  rings: HaloRing[];
}

/** One orbiting mini inside a diorama dome (legacy `mg` child userData). */
interface MiniOrbiter {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  /** Orbit angle, advanced each frame by `s * dt` (legacy `o`). */
  o: number;
  /** Orbit/wobble speed (legacy `s`). */
  s: number;
  /** Orbit radius (legacy `a`). */
  a: number;
  /** Base Y the bob oscillates around (legacy `bY`). */
  bY: number;
}

/** Animated parts of one diorama (legacy `dios[]` userData). */
interface DioramaRig {
  group: THREE.Group;
  hue: number;
  /** Slow Y-spin rate (legacy `rs` = 0.05 + rng() * 0.12). */
  spin: number;
  glow: THREE.PointLight;
  minis: MiniOrbiter[];
}

/** One data packet riding a pipeline curve (legacy `pkts[]`). */
interface PacketRig {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  /** Curve parameter 0..1. */
  t: number;
  /** Parameter speed (legacy `spd` = 0.06 + rng() * 0.1). */
  spd: number;
}

/** One pipeline: translucent tube + its packets (legacy `pipes[]`). */
interface PipeRig {
  tube: THREE.Mesh<THREE.TubeGeometry, THREE.MeshStandardMaterial>;
  curve: THREE.CatmullRomCurve3;
  packets: PacketRig[];
}

/** Pick the mini-orbiter geometry by index (legacy geometry array, line 411). */
function miniGeometry(pick: number, sz: number): THREE.BufferGeometry {
  switch (pick) {
    case 0:
      return new THREE.IcosahedronGeometry(sz, 0);
    case 1:
      return new THREE.OctahedronGeometry(sz, 0);
    case 2:
      return new THREE.TetrahedronGeometry(sz, 0);
    default:
      return new THREE.SphereGeometry(sz, 4, 3);
  }
}

/**
 * Build one monolith (legacy mkMono, lines 386-399): slab + edge lines +
 * 4 leaning beams, a kind-specific topper (spire/obelisk/arch/ring), 3
 * animated halo rings and a crown PointLight. Group sits at (x, -2, z).
 */
function buildMonolith(
  parent: THREE.Group,
  x: number,
  z: number,
  h: number,
  w: number,
  d: number,
  hue: number,
  kind: 'spire' | 'obelisk' | 'arch' | 'ring',
  shadows: boolean,
): MonolithRig {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(hue, 0.25, 0.07),
    emissive: new THREE.Color().setHSL(hue, 0.7, 0.03),
    emissiveIntensity: 0.6,
    metalness: 0.95,
    roughness: 0.12,
    transparent: true,
    opacity: 0.82,
  });

  const slab = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  slab.position.y = h / 2;
  slab.castShadow = shadows;
  g.add(slab);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(slab.geometry),
    new THREE.LineBasicMaterial({
      color: new THREE.Color().setHSL(hue, 0.85, 0.45),
      transparent: true,
      opacity: 0.35,
    }),
  );
  edges.position.copy(slab.position);
  g.add(edges);

  for (let bi = 0; bi < 4; bi++) {
    const ba = (bi / 4) * TAU;
    const beamMat = mat.clone();
    beamMat.emissiveIntensity = 0.3;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, h * 0.6, 4), beamMat);
    beam.position.set(cos(ba) * w * 1.5, h * 0.3, sin(ba) * d * 1.5);
    beam.rotation.z = cos(ba) * 0.4;
    beam.rotation.x = -sin(ba) * 0.4;
    g.add(beam);
  }

  if (kind === 'spire') {
    for (let si = 0; si < 6; si++) {
      const segMat = mat.clone();
      segMat.emissiveIntensity = 0.4 + si * 0.3;
      const seg = new THREE.Mesh(
        new THREE.BoxGeometry(w * (1 - si * 0.12), h * 0.18, d * (1 - si * 0.12)),
        segMat,
      );
      seg.position.y = h + si * h * 0.17;
      seg.rotation.y = si * 0.25;
      g.add(seg);
    }
  }
  if (kind === 'obelisk') {
    const tipMat = mat.clone();
    tipMat.emissiveIntensity = 1.2;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(w * 0.6, h * 0.3, 4), tipMat);
    tip.position.y = h + h * 0.15;
    tip.rotation.y = PI / 4;
    g.add(tip);
    const collarMat = mat.clone();
    collarMat.emissiveIntensity = 0.8;
    const collar = new THREE.Mesh(new THREE.TorusGeometry(w, w * 0.15, 6, 16), collarMat);
    collar.position.y = h * 0.7;
    collar.rotation.x = PI / 2;
    g.add(collar);
  }
  if (kind === 'arch') {
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(w * 3, h * 0.12, d), mat.clone());
    bridge.position.y = h * 0.85;
    g.add(bridge);
    const slab2 = slab.clone();
    slab2.position.x = w * 2;
    g.add(slab2);
    const keyMat = mat.clone();
    keyMat.emissiveIntensity = 1.5;
    const keystone = new THREE.Mesh(new THREE.OctahedronGeometry(w * 0.5, 0), keyMat);
    keystone.position.set(w, h * 0.92, 0);
    g.add(keystone);
  }
  if (kind === 'ring') {
    const outerMat = mat.clone();
    outerMat.emissiveIntensity = 1.5;
    const outer = new THREE.Mesh(new THREE.TorusGeometry(w * 1.5, w * 0.12, 8, 24), outerMat);
    outer.position.y = h * 0.8;
    outer.rotation.x = PI / 2;
    g.add(outer);
    const innerMat = mat.clone();
    innerMat.emissiveIntensity = 1.0;
    const inner = new THREE.Mesh(new THREE.TorusGeometry(w * 0.8, w * 0.08, 6, 16), innerMat);
    inner.position.y = h * 0.5;
    inner.rotation.x = PI / 2;
    g.add(inner);
  }

  const rings: HaloRing[] = [];
  for (let ri = 0; ri < 3; ri++) {
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(w * 0.8 + ri * 1.2, w * 0.9 + ri * 1.2, 32),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL((hue + ri * 0.1) % 1, 0.8, 0.35),
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
      }),
    );
    halo.position.y = h * 0.3 + ri * h * 0.25;
    g.add(halo);
    rings.push({ mesh: halo, speed: 0.3 + ri * 0.2, axis: ri });
  }

  const crown = new THREE.PointLight(
    new THREE.Color().setHSL(hue, 0.9, 0.5),
    2.5 * POINT_LIGHT_GAIN,
    20 * ARENA_Y, // legacy 20 — crowns sit twice as high under V3.1
  );
  crown.decay = 0; // legacy r128 falloff model — see LEGACY_LIGHT_GAIN
  crown.position.y = h + 2;
  g.add(crown);

  g.position.set(x, -2, z);
  parent.add(g);
  return { crown, hue, rings };
}

/**
 * Build one diorama (legacy mkDio, lines 405-415): glass dome, metallic base,
 * glowing equator torus, 12 orbiting minis and an interior glow light.
 * rng call order matches the legacy stream exactly.
 */
function buildDiorama(
  scene: THREE.Scene,
  rng: Rng,
  x: number,
  y: number,
  z: number,
  r: number,
  hue: number,
): DioramaRig {
  const g = new THREE.Group();
  g.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(r, 20, 14, 0, TAU, 0, PI * 0.55),
      new THREE.MeshStandardMaterial({
        color: 0x88bbff,
        transparent: true,
        opacity: 0.06,
        side: THREE.DoubleSide,
        metalness: 0.3,
        roughness: 0.1,
      }),
    ),
  );
  g.add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(r * 1.1, r * 0.9, r * 0.12, 20),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(hue, 0.4, 0.08),
        metalness: 0.8,
        roughness: 0.3,
        emissive: new THREE.Color().setHSL(hue, 0.6, 0.04),
        emissiveIntensity: 0.8,
      }),
    ),
  );
  const equator = new THREE.Mesh(
    new THREE.TorusGeometry(r * 1.05, r * 0.025, 6, 40),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(hue, 0.9, 0.45),
      transparent: true,
      opacity: 0.4,
    }),
  );
  equator.rotation.x = PI / 2;
  g.add(equator);

  const minisGroup = new THREE.Group();
  const minis: MiniOrbiter[] = [];
  for (let mi = 0; mi < 12; mi++) {
    const sz = r * (0.02 + rng() * 0.05);
    const mesh = new THREE.Mesh(
      miniGeometry(mi % 4, sz),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(hue + rng() * 0.3, 0.7, 0.4 + rng() * 0.3),
        emissive: new THREE.Color().setHSL(hue + rng() * 0.2, 0.8, 0.25),
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.5 + rng() * 0.5,
      }),
    );
    const ma = rng() * TAU;
    const mb = rng() * PI * 0.4;
    const mr = rng() * r * 0.55;
    mesh.position.set(cos(ma) * cos(mb) * mr, sin(mb) * mr * 0.8 + r * 0.3, sin(ma) * cos(mb) * mr);
    minis.push({
      mesh,
      o: ma,
      s: 0.3 + rng() * 1.5,
      a: r * (0.1 + rng() * 0.3),
      bY: mesh.position.y,
    });
    minisGroup.add(mesh);
  }
  g.add(minisGroup);

  const glow = new THREE.PointLight(
    new THREE.Color().setHSL(hue, 0.8, 0.5),
    1.8 * POINT_LIGHT_GAIN,
    r * 2,
    0, // legacy r128 falloff model — see LEGACY_LIGHT_GAIN
  );
  glow.position.y = r * 0.3;
  g.add(glow);

  g.position.set(x, y, z);
  scene.add(g);
  return { group: g, hue, spin: 0.05 + rng() * 0.12, glow, minis };
}

/**
 * Build one pipeline (legacy mkPipe, lines 420-425): a CatmullRom tube arcing
 * between two monolith mid-heights plus 3-6 octahedron packets riding it.
 */
function buildPipe(
  group: THREE.Group,
  rng: Rng,
  sx: number,
  sy: number,
  sz: number,
  ex: number,
  ey: number,
  ez: number,
  col: THREE.Color,
): PipeRig {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(sx, sy, sz),
    new THREE.Vector3(
      lerp(sx, ex, 0.3),
      Math.max(sy, ey) + (10 + rng() * 14) * ARENA_Y,
      lerp(sz, ez, 0.3),
    ),
    new THREE.Vector3(
      lerp(sx, ex, 0.7),
      Math.max(sy, ey) + (8 + rng() * 12) * ARENA_Y,
      lerp(sz, ez, 0.7),
    ),
    new THREE.Vector3(ex, ey, ez),
  ]);
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 32, 0.14 + rng() * 0.18, 5, false),
    new THREE.MeshStandardMaterial({
      color: col,
      emissive: col,
      emissiveIntensity: 0.25,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    }),
  );
  group.add(tube);

  const packets: PacketRig[] = [];
  const count = 3 + Math.floor(rng() * 4);
  for (let pi = 0; pi < count; pi++) {
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.15 + rng() * 0.1, 0),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.75 }),
    );
    group.add(mesh);
    // Legacy seeded t = pi/4, which exceeds 1 for the 5th/6th packet and only
    // worked because legacy wrapped before sampling — wrap at init instead so
    // t is always a valid curve parameter.
    packets.push({ mesh, t: (pi / 4) % 1, spd: 0.06 + rng() * 0.1 });
  }
  return { tube, curve, packets };
}

/**
 * The static world and its ambient animation: ambient + sun + 6 point lights,
 * 16 monoliths, 8 dioramas, data pipelines, displaced ground plane, grid
 * helper, starfield sphere and 6 nebula planes (legacy lines 369-464 build,
 * 840-852 animate, 675-682 sector naming).
 *
 * All randomness flows through `ctx.rng` (contract rule 7); build order
 * matches the legacy script so the seeded stream lines up: monoliths (no rng)
 * → dioramas → pipelines → ground/grid (no rng) → stars → nebulae.
 */
export class EnvironmentSystem {
  private readonly state: SimState;
  /** Fixed 6-light rig (legacy `lts`); tuple type keeps index access non-optional. */
  private readonly lts: readonly [
    THREE.PointLight,
    THREE.PointLight,
    THREE.PointLight,
    THREE.PointLight,
    THREE.PointLight,
    THREE.PointLight,
  ];
  private readonly monoliths: MonolithRig[] = [];
  private readonly dioramas: DioramaRig[] = [];
  private readonly pipes: PipeRig[] = [];
  /** Ground material handle for the V2 reaction-diffusion emissiveMap coupling. */
  private readonly groundMaterial: THREE.MeshStandardMaterial;
  /** Ambient + key (sun) lights — captured so BRUTALISM can desaturate/dim them per frame. */
  private readonly ambient: THREE.AmbientLight;
  private readonly sun: THREE.DirectionalLight;
  /** Audio bass band 0..1 (CONTRACTS V2 coupling); 0 = silent ⇒ output identical to v1. */
  private audioBass = 0;

  /** Builds the whole environment into `ctx.scene`. One-time cost, never disposed. */
  constructor(ctx: SimContext) {
    this.state = ctx.state;
    const { scene, quality, rng } = ctx;

    // ── Lighting (legacy 369-382; intensities × LEGACY_LIGHT_GAIN for r0.184 units;
    //    rig spread/ranges × ARENA_MID so the core glow covers the 5× floor) ──
    this.ambient = new THREE.AmbientLight(0x0a0a22, 0.55 * LEGACY_LIGHT_GAIN);
    scene.add(this.ambient);
    const sun = new THREE.DirectionalLight(0xffeedd, 0.65 * LEGACY_LIGHT_GAIN);
    sun.position.set(35 * ARENA_MID, 65 * ARENA_Y, 25 * ARENA_MID);
    sun.castShadow = quality.shadows;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -70 * ARENA;
    sun.shadow.camera.right = 70 * ARENA;
    sun.shadow.camera.top = 70 * ARENA;
    sun.shadow.camera.bottom = -70 * ARENA;
    this.sun = sun;
    scene.add(sun);
    // Legacy intensities × POINT_LIGHT_GAIN, decay 0 (legacy r128 falloff model).
    this.lts = [
      new THREE.PointLight(0xff0066, 3 * POINT_LIGHT_GAIN, 70 * ARENA_MID, 0),
      new THREE.PointLight(0x00ffcc, 2.5 * POINT_LIGHT_GAIN, 55 * ARENA_MID, 0),
      new THREE.PointLight(0xffaa00, 3 * POINT_LIGHT_GAIN, 45 * ARENA_MID, 0),
      new THREE.PointLight(0x4488ff, 5 * POINT_LIGHT_GAIN, 40 * ARENA_MID, 0),
      new THREE.PointLight(0xff2200, 2 * POINT_LIGHT_GAIN, 35 * ARENA_MID, 0),
      new THREE.PointLight(0x8800ff, 2 * POINT_LIGHT_GAIN, 40 * ARENA_MID, 0),
    ];
    this.lts[0].position.set(-25 * ARENA_MID, 18 * ARENA_Y, -25 * ARENA_MID);
    this.lts[1].position.set(18 * ARENA_MID, 10 * ARENA_Y, 18 * ARENA_MID);
    this.lts[2].position.set(0, -5, 0);
    this.lts[3].position.set(0, 6 * ARENA_Y, 0);
    this.lts[4].position.set(10 * ARENA_MID, 14 * ARENA_Y, -10 * ARENA_MID);
    this.lts[5].position.set(-12 * ARENA_MID, 22 * ARENA_Y, 12 * ARENA_MID);
    for (const l of this.lts) scene.add(l);

    // ── Monoliths (legacy 384-401) ──
    const monolithGroup = new THREE.Group();
    scene.add(monolithGroup);
    for (const [x, z, h, w, d, hue, kind] of MONOLITH_CONFIG) {
      this.monoliths.push(buildMonolith(monolithGroup, x, z, h, w, d, hue, kind, quality.shadows));
    }

    // ── Dioramas (legacy 403-416) ──
    for (const [x, y, z, r, hue] of DIORAMA_CONFIG) {
      this.dioramas.push(buildDiorama(scene, rng, x, y, z, r, hue));
    }

    // ── Data pipelines (legacy 418-431) ──
    const pipeGroup = new THREE.Group();
    scene.add(pipeGroup);
    for (const [ai, bi] of PIPE_LINKS) {
      const ca = MONOLITH_CONFIG[ai];
      const cb = MONOLITH_CONFIG[bi];
      if (!ca || !cb) continue; // legacy guard: skip links pointing at missing monoliths
      this.pipes.push(
        buildPipe(
          pipeGroup,
          rng,
          ca[0],
          ca[2] * 0.5,
          ca[1],
          cb[0],
          cb[2] * 0.5,
          cb[1],
          new THREE.Color().setHSL(lerp(ca[5], cb[5], 0.5), 0.8, 0.45),
        ),
      );
    }

    // ── Ground + grid (legacy 449-456; V3.1: 240→1200 edge, SAME 60×60 segments —
    //    displacement frequencies ÷ ARENA so the dunes stretch instead of alias,
    //    amplitude × ARENA_Y so the swell still reads at distance) ──
    const groundGeo = new THREE.PlaneGeometry(GROUND_EXTENT, GROUND_EXTENT, 60, 60);
    const groundPos = groundGeo.getAttribute('position');
    for (let i = 0; i < groundPos.count; i++) {
      const gx = groundPos.getX(i);
      const gy = groundPos.getY(i);
      groundPos.setZ(
        i,
        sin((gx * 0.06) / ARENA) * cos((gy * 0.05) / ARENA) * 4 * ARENA_Y +
          sin((gx * 0.2 + gy * 0.15) / ARENA) * ARENA_Y -
          3,
      );
    }
    groundGeo.computeVertexNormals();
    this.groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x080812,
      roughness: 0.95,
      metalness: 0.1,
      emissive: 0x040410,
      emissiveIntensity: 0.3,
    });
    const ground = new THREE.Mesh(groundGeo, this.groundMaterial);
    ground.rotation.x = -PI / 2;
    ground.position.y = -10;
    ground.receiveShadow = quality.shadows;
    scene.add(ground);
    const grid = new THREE.GridHelper(GROUND_EXTENT, 50 * 2, 0x0a1530, 0x060d20);
    grid.position.y = -9.5;
    grid.material.transparent = true;
    grid.material.opacity = 0.22;
    scene.add(grid);

    // ── Starfield (legacy 457-463; count from quality, Known Bug-free) ──
    const starCount = quality.starCount;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    const c = new THREE.Color();
    for (let i = 0; i < starCount; i++) {
      // Legacy shell 100..340 × 3 — outside the arena rim, inside CAMERA_FAR.
      const sr = (100 + rng() * 240) * 3;
      const sa = rng() * TAU;
      const sb = (rng() - 0.5) * PI;
      starPos[i * 3] = cos(sb) * cos(sa) * sr;
      starPos[i * 3 + 1] = sin(sb) * sr;
      starPos[i * 3 + 2] = cos(sb) * sin(sa) * sr;
      c.setHSL(0.5 + rng() * 0.25, 0.3 + rng() * 0.4, 0.4 + rng() * 0.6);
      starCol[i * 3] = c.r;
      starCol[i * 3 + 1] = c.g;
      starCol[i * 3 + 2] = c.b;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    scene.add(
      new THREE.Points(
        starGeo,
        new THREE.PointsMaterial({
          size: 0.35 * 3, // shells ×3 ⇒ size ×3 keeps the apparent star scale
          vertexColors: true,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
        }),
      ),
    );

    // ── Nebula planes (legacy 464; sizes/positions × ARENA_MID/ARENA_Y) ──
    for (let i = 0; i < 6; i++) {
      const nebula = new THREE.Mesh(
        new THREE.PlaneGeometry((100 + rng() * 80) * ARENA_MID, (50 + rng() * 40) * ARENA_MID),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(rng(), 0.4, 0.06),
          transparent: true,
          opacity: 0.03 + rng() * 0.03,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      nebula.position.set(
        (rng() - 0.5) * 130 * ARENA_MID,
        (15 + rng() * 70) * ARENA_Y,
        ((rng() - 0.5) * 130 - 50) * ARENA_MID,
      );
      nebula.rotation.set(rng() * PI, rng() * PI, rng() * PI);
      scene.add(nebula);
    }
  }

  /**
   * Per-frame ambient animation (legacy 840-852): pipeline packets + tube
   * pulse, monolith halo spin + crown flicker, diorama rotation + mini orbits
   * + glow, and the 6-light intensity waves (incl. lts[3] hue cycle and
   * lts[5] slow orbit). The chaos multiplier is legacy `cMul()` =
   * `min(chaos / 2, 3)`. All light waves are scaled by `POINT_LIGHT_GAIN`
   * (r0.184 unit migration) and the six rig waves additionally by the audio
   * bass shimmer `(1 + bass * 0.35)` — see {@link setAudioBass}.
   *
   * Allocation-free: `getPointAt` writes into the packet's own position
   * vector (Known Bug 12 fix). O(p·k + m·r + d·12) — all constant-bounded by
   * the config tables (~21 pipes × ≤6 packets, 16 monoliths × 3 halos,
   * 8 dioramas × 12 minis), so effectively O(1) per frame.
   */
  update(dt: number, t: number): void {
    const cm = Math.min(this.state.chaos / 2, 3);

    // Pipelines (legacy 841)
    for (const pipe of this.pipes) {
      for (const pkt of pipe.packets) {
        pkt.t = (pkt.t + pkt.spd * dt + 1) % 1; // +1 keeps the wrap positive under any dt
        pipe.curve.getPointAt(pkt.t, pkt.mesh.position);
        pkt.mesh.rotation.x += dt * 3;
        pkt.mesh.rotation.y += dt * 2;
        pkt.mesh.material.opacity = 0.4 + sin(t * 5 + pkt.t * TAU) * 0.3;
      }
      // nn() floors the chaos-driven waves at 0: at max chaos (cm = 3) these sinusoids dip
      // negative, which makes a PointLight SUBTRACT radiance (unphysical dark halos read as a
      // bug) and emissive/opacity go negative. Physical plausibility wins over bit-parity with
      // the legacy r128 waveform here — the tuned-constant decision on record (Master File III).
      pipe.tube.material.opacity = nn(0.1 + sin(t * 2) * 0.05 * cm);
      pipe.tube.material.emissiveIntensity = nn(0.2 + sin(t * 3) * 0.15 * cm);
    }

    // Monoliths (legacy 844; wave × POINT_LIGHT_GAIN keeps the legacy shape at r0.184 units)
    for (const mono of this.monoliths) {
      mono.crown.intensity = nn(2 + sin(t * 2 + mono.hue * 10) * 2 * cm) * POINT_LIGHT_GAIN;
      for (const ring of mono.rings) {
        if (ring.axis === 0) ring.mesh.rotation.x = t * ring.speed;
        else if (ring.axis === 1) ring.mesh.rotation.y = t * ring.speed;
        else ring.mesh.rotation.z = t * ring.speed;
      }
    }

    // Dioramas (legacy 847)
    for (const dio of this.dioramas) {
      dio.group.rotation.y += dio.spin * dt * 0.2;
      dio.group.position.y += sin(t * 0.3 + dio.hue * 20) * 0.004;
      for (const mini of dio.minis) {
        mini.o += mini.s * dt;
        mini.mesh.position.x = cos(mini.o) * mini.a;
        mini.mesh.position.y = mini.bY + sin(t * mini.s + mini.o) * 0.3;
        mini.mesh.position.z = sin(mini.o) * mini.a;
        mini.mesh.rotation.x += dt * mini.s;
        mini.mesh.rotation.y += dt * mini.s * 0.7;
      }
      dio.glow.intensity = nn(1.5 + sin(t * 2 + dio.hue * 10) * cm) * POINT_LIGHT_GAIN;
    }

    // Light waves (legacy 850-852; legacy wave × POINT_LIGHT_GAIN × audio-bass shimmer).
    // bass = 0 ⇒ shimmer factor 1 ⇒ identical to v1 (CONTRACTS V2: multiplier ≤ 0.35).
    const lg = POINT_LIGHT_GAIN * (1 + this.audioBass * 0.35);
    const lts = this.lts;
    lts[0].intensity = nn(2 + sin(t * 1.5) * 1.5 * cm) * lg;
    lts[1].intensity = nn(2 + cos(t * 1.2) * cm) * lg;
    lts[2].intensity = (2 + sin(t * 2.3) * 1.5) * lg; // cm-free wave, never negative
    lts[3].intensity = nn(4 + sin(t * 4) * 2 * cm) * lg;
    lts[3].color.setHSL((t * 0.1) % 1, 0.8, 0.5);
    lts[4].intensity = nn(1 + sin(t * 3) * cm * 2) * lg;
    lts[5].intensity = nn(1.5 + cos(t * 1.8) * cm) * lg;
    lts[5].position.x = sin(t * 0.2) * 18 * ARENA_MID;
    lts[5].position.z = cos(t * 0.2) * 18 * ARENA_MID;
  }

  /**
   * Audio coupling (CONTRACTS V2): store the current bass band, clamped to
   * 0..1. Inside `update()` it multiplies the six rig-light intensity waves by
   * `(1 + bass * 0.35)` — at 0 (silence / audio uninitialized) the lighting is
   * exactly the legacy waveform. Allocation-free; O(1). World calls this per
   * frame with `AudioAnalysis.update().bass` before `environment.update`.
   */
  setAudioBass(b: number): void {
    this.audioBass = clamp(b, 0, 1);
  }

  /**
   * BRUTALISM: crossfade the ground + the entire light rig toward a raw, overcast concrete look —
   * matte grey ground, the glow killed, and the lurid six-light rig + ambient/sun desaturated and
   * dimmed to cold concrete light. `f` is the 0..1 brutalism factor (smoothed by the world). The
   * f=0 path early-returns so the animated cosmos is byte-identical when off. Allocation-free
   * (module-const targets + in-place lerp); called every frame AFTER {@link update}, so the rig's
   * intensity scaling rides this frame's already-animated values without compounding. O(1).
   */
  applyBrutalism(f: number): void {
    if (f <= 0) return; // OFF — leave the animated rig + ground untouched (byte-identical)
    const g = f > 1 ? 1 : f;
    // Ground: static material → lerp from its known base toward poured concrete (no compounding).
    this.groundMaterial.color.copy(GROUND_BASE).lerp(BRUTAL_GROUND, g);
    this.groundMaterial.emissive.copy(GROUND_BASE_EMISSIVE).lerp(BRUTAL_GROUND_EMISSIVE, g);
    this.groundMaterial.roughness = lerp(0.95, 1.0, g);
    this.groundMaterial.metalness = lerp(0.1, 0.0, g);
    this.groundMaterial.emissiveIntensity = lerp(0.3, 0.06, g);
    // Ambient + sun: static lights → colour from base toward grey, intensity dimmed from base.
    this.ambient.color.copy(AMBIENT_BASE).lerp(BRUTAL_LIGHT, g);
    this.ambient.intensity = lerp(0.55 * LEGACY_LIGHT_GAIN, 0.34 * LEGACY_LIGHT_GAIN, g);
    this.sun.color.copy(SUN_BASE).lerp(BRUTAL_LIGHT, g);
    this.sun.intensity = lerp(0.65 * LEGACY_LIGHT_GAIN, 0.42 * LEGACY_LIGHT_GAIN, g);
    // The lurid six-light rig: colour from each base toward grey (clean, no rainbow), intensity
    // scaled down from this frame's already-animated value (update() reset it first → no compound).
    for (let i = 0; i < this.lts.length; i++) {
      const l = this.lts[i];
      if (!l) continue;
      l.color.copy(LIGHT_BASE[i] ?? BRUTAL_LIGHT).lerp(BRUTAL_LIGHT, g);
      l.intensity *= 1 - 0.7 * g;
    }
  }

  /**
   * Attach the reaction-diffusion U-field texture as the ground material's
   * emissiveMap (CONTRACTS V2 amendment). The emissiveIntensity coupling lifts
   * the ground glow from its build value (0.3) to 0.85 so the field's dark
   * living veins read against the void — with the uniform white texture an
   * unperturbed field produces, the ground stays visually close to v1.
   * (0.3 was rejected: veins invisible; 1.5 was rejected: washes out the grid
   * helper.) `needsUpdate` is set once because adding a map to an
   * already-compiled material requires a shader recompile. O(1), call once.
   */
  attachGroundEmissiveMap(tex: THREE.Texture): void {
    this.groundMaterial.emissiveMap = tex;
    this.groundMaterial.emissiveIntensity = 0.85;
    this.groundMaterial.needsUpdate = true;
  }

  /**
   * Named sector for a world position — same rectangle tests and precedence
   * as legacy 675-682, rectangles × ARENA (heights × ARENA_Y) to track the
   * scaled monolith/diorama layout. Pure and allocation-free; O(1).
   */
  sectorAt(pos: THREE.Vector3): string {
    if (abs(pos.z + 65 * ARENA) < 22 * ARENA && abs(pos.x) < 22 * ARENA) return 'SPIRE DISTRICT';
    if (pos.y > 28 * ARENA_Y) return 'DIORAMA BELT';
    if (abs(pos.x) > 45 * ARENA) return 'OUTER RING';
    if (pos.z > 18 * ARENA) return 'GENESIS FIELD';
    if (abs(pos.z + 35 * ARENA) < 18 * ARENA) return 'MONOLITH ARRAY';
    return 'NEXUS PRIME';
  }
}

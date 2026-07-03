/**
 * TEMPLE GREEBLE — the abomination-architecture detail shell for the Monolith Temple.
 *
 * The bare trilithon (plinth + 2 pillars + lintel) read as a clean civic gate — "1980s". This wraps
 * it in a COLOSSAL, mirror-symmetric, recursively-greebled megastructure: stepped ziggurat towers
 * framing the gate (left/right mirror, front kept open so the portal still reads), every face
 * encrusted with thousands of small panels (the "64k hyper-poly" detail done as instances, not real
 * triangles), and a curtain of vertical DATA-RAIN light-strips that stream downward and brighten
 * with the world's chaos — the look of the owner's CHAOS-MULTIOMNI / data-cliff references.
 *
 * RENDER BUDGET: two InstancedMeshes. (1) `greeble` — one BoxGeometry, ~150 macro masses + up to
 * ~7000 micro panels, lit MeshStandardMaterial with per-instance albedo (instanceColor) → reads as a
 * detailed stone megacity for ~1 draw call. (2) `strips` — one thin BoxGeometry, ~1100 vertical bars
 * with a custom ShaderMaterial that scrolls a falling bright head (the data-rain) — GPU-animated, so
 * the per-frame CPU cost is O(1) (uniform writes). Transforms are written ONCE at construction.
 *
 * DETERMINISM (ADR 0004): placement + per-instance params come from a pure positional hash — ZERO
 * rng draws, no Date.now — boot-stream-neutral (it is built into the temple's own group, which the
 * impure ascension META-layer reveals without ever perturbing the population golden). Visual only.
 *
 * REACTIVITY (defensible, not decoration): the data-rain speed + glow and the greeble emissive are a
 * monotone readout of the temple's `reactivity` (chaos + entropy + crowding). Pin chaos/entropy to 0
 * and the megastructure goes cold and the rain idles; agitate the world and it floods with light.
 *
 * @see src/sim/monolith-temple.ts (the host it attaches to)
 */
import * as THREE from 'three';

/** Mirror-symmetric tower anchors on the RIGHT (x>0); each is mirrored to the left. Front (low/neg z)
 *  is left open so the portal between the pillars still reads. Units are in ARENA_MID (U). */
const TOWERS: ReadonlyArray<readonly [number, number, number, number]> = [
  // [x, z, heightU, footU]
  [14, 3, 50, 5.5],
  [22, 11, 64, 6.5],
  [31, 23, 82, 7.5],
  [20, 31, 72, 6.0],
  [10, 37, 58, 5.0],
  [35, 7, 46, 6.0],
  [28, 39, 68, 6.5],
  [16, 46, 60, 5.5],
];

const MICRO_CAP = 7000;
const STRIP_CAP = 1100;

/** Deterministic positional hash → [0,1). No bitwise, no rng. */
function hash(n: number): number {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

interface MacroBox {
  readonly cx: number;
  readonly cy: number;
  readonly cz: number;
  readonly w: number;
  readonly h: number;
  readonly d: number;
}

const strip_vert = /* glsl */ `
  attribute vec2 aRain;   // x: phase, y: base speed
  attribute vec3 aColor;
  varying float vUp;
  varying vec3 vColor;
  varying vec2 vRain;
  void main() {
    vUp = position.y + 0.5;      // unit box local y (-0.5..0.5) -> 0..1 up the strip
    vColor = aColor;
    vRain = aRain;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

const strip_frag = /* glsl */ `
  uniform float uTime;
  uniform float uChaos;
  uniform float uReact;
  varying float vUp;
  varying vec3 vColor;
  varying vec2 vRain;
  void main() {
    float speed = vRain.y * (0.5 + 1.6 * uChaos);
    // A sharp bright head scrolling DOWN the strip (rising uTime -> phase const at lower vUp).
    float m = fract(vUp * 2.0 + uTime * speed + vRain.x);
    float streak = pow(m, 5.0);
    float ambient = 0.05 + 0.12 * uReact;
    float intensity = ambient + streak * (0.65 + 0.7 * uChaos);
    gl_FragColor = vec4(vColor * intensity, clamp(intensity, 0.0, 1.0));
  }
`;

/**
 * The greeble shell. Construct with the temple's group + its U scale; `update` each frame with the
 * temple's reactivity/chaos; `dispose` frees both meshes.
 */
export class TempleGreeble {
  readonly greeble: THREE.InstancedMesh;
  readonly strips: THREE.InstancedMesh;
  private readonly greebleMat: THREE.MeshStandardMaterial;
  private readonly stripMat: THREE.ShaderMaterial;
  private readonly parent: THREE.Object3D;
  /** Live counts after the capped placement passes. */
  readonly greebleCount: number;
  readonly stripCount: number;

  constructor(parent: THREE.Object3D, u: number) {
    this.parent = parent;

    // ── 1. Build the macro silhouette: mirror-symmetric stepped ziggurat towers. ──
    const macros: MacroBox[] = [];
    let towerIdx = 0;
    for (const [tx, tz, hU, footU] of TOWERS) {
      for (const sign of [1, -1] as const) {
        const baseX = sign * tx * u;
        const baseZ = tz * u;
        const totalH = hU * u;
        const foot = footU * u;
        const steps = 5 + Math.floor(hash(towerIdx * 3 + 1) * 4); // 5..8 stepped layers
        const layerH = totalH / steps;
        for (let k = 0; k < steps; k++) {
          const taper = 1 - (k / steps) * 0.62;
          const jx = (hash(towerIdx * 31 + k * 7 + 2) - 0.5) * foot * 0.25;
          const jz = (hash(towerIdx * 31 + k * 7 + 5) - 0.5) * foot * 0.25;
          macros.push({
            cx: baseX + jx,
            cy: (k + 0.5) * layerH,
            cz: baseZ + jz,
            w: foot * taper * (0.85 + hash(towerIdx * 17 + k) * 0.3),
            h: layerH * 1.04, // slight overlap so steps read as one mass
            d: foot * taper * (0.85 + hash(towerIdx * 19 + k) * 0.3),
          });
        }
        towerIdx++;
      }
    }
    const macroCount = macros.length;

    // ── 2. Fill instance buffers: macro masses + hashed micro panels (capped). ──
    const greebleTotal = macroCount + MICRO_CAP;
    const geoBox = new THREE.BoxGeometry(1, 1, 1);
    this.greebleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, // modulated per-instance via instanceColor
      roughness: 0.72,
      metalness: 0.35,
      emissive: 0x0a0e1a,
      emissiveIntensity: 0.3,
    });
    this.greeble = new THREE.InstancedMesh(geoBox, this.greebleMat, greebleTotal);
    this.greeble.frustumCulled = false;

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    const col = new THREE.Color();
    let gi = 0;

    // Macro masses — dark blue-grey brutalist stone.
    for (const b of macros) {
      pos.set(b.cx, b.cy, b.cz);
      scl.set(b.w, b.h, b.d);
      m.compose(pos, q, scl); // q identity — axis-aligned masses
      this.greeble.setMatrixAt(gi, m);
      const lit = 0.18 + hash(gi * 7 + 3) * 0.12;
      col.setHSL(0.6 + hash(gi) * 0.06, 0.25, lit);
      this.greeble.setColorAt(gi, col);
      gi++;
    }

    // Micro panels — hashed onto macro faces, the recursive "hyper-poly" detail.
    for (let i = 0; i < MICRO_CAP; i++) {
      const b = macros[Math.floor(hash(i * 1.7 + 11) * macroCount) % macroCount]!;
      const face = Math.floor(hash(i * 2.3 + 19) * 4); // 0:+x 1:-x 2:+z 3:-z
      const pd = (0.22 + hash(i * 5 + 7) * 0.9) * u; // protrusion depth
      const pw = (0.5 + hash(i * 6 + 13) * 2.0) * u;
      const ph = (0.5 + hash(i * 9 + 17) * 2.4) * u;
      const uOff = hash(i * 3 + 23) - 0.5;
      const vOff = hash(i * 4 + 29) - 0.5;
      if (face === 0) {
        pos.set(b.cx + b.w / 2 + pd / 2, b.cy + vOff * b.h * 0.9, b.cz + uOff * b.d * 0.9);
        scl.set(pd, ph, pw);
      } else if (face === 1) {
        pos.set(b.cx - b.w / 2 - pd / 2, b.cy + vOff * b.h * 0.9, b.cz + uOff * b.d * 0.9);
        scl.set(pd, ph, pw);
      } else if (face === 2) {
        pos.set(b.cx + uOff * b.w * 0.9, b.cy + vOff * b.h * 0.9, b.cz + b.d / 2 + pd / 2);
        scl.set(pw, ph, pd);
      } else {
        pos.set(b.cx + uOff * b.w * 0.9, b.cy + vOff * b.h * 0.9, b.cz - b.d / 2 - pd / 2);
        scl.set(pw, ph, pd);
      }
      e.set((hash(i + 1) - 0.5) * 0.1, 0, (hash(i + 2) - 0.5) * 0.1);
      q.setFromEuler(e);
      m.compose(pos, q, scl);
      this.greeble.setMatrixAt(gi, m);
      // Mostly cold stone; a rare panel catches a pale SPECTRAL glint (hashed) — the austere key
      // (redesign V123: the megalith is black-crystal-and-prismatic, no poisonous neon).
      const accent = hash(i * 11 + 31) > 0.93;
      if (accent) col.setHSL(0.58 + hash(i) * 0.1, 0.4, 0.68);
      else col.setHSL(0.62 + hash(i * 2) * 0.06, 0.16, 0.13 + hash(i * 3) * 0.14);
      this.greeble.setColorAt(gi, col);
      q.identity();
      gi++;
    }
    this.greebleCount = gi;
    this.greeble.instanceMatrix.needsUpdate = true;
    if (this.greeble.instanceColor) this.greeble.instanceColor.needsUpdate = true;
    parent.add(this.greeble);

    // ── 3. Data-rain light-strips on outward tower faces. ──
    const stripGeo = new THREE.BoxGeometry(1, 1, 1);
    this.stripMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uChaos: { value: 0 },
        uReact: { value: 0 },
      },
      vertexShader: strip_vert,
      fragmentShader: strip_frag,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.strips = new THREE.InstancedMesh(stripGeo, this.stripMat, STRIP_CAP);
    this.strips.frustumCulled = false;
    const rain = new Float32Array(STRIP_CAP * 2);
    const scol = new Float32Array(STRIP_CAP * 3);
    let si = 0;
    for (let i = 0; i < STRIP_CAP; i++) {
      const b = macros[Math.floor(hash(i * 1.3 + 41) * macroCount) % macroCount]!;
      // outward face = the X-face pointing away from temple centre (the visible curtain).
      const outX = b.cx >= 0 ? 1 : -1;
      const onX = hash(i * 2.7 + 47) > 0.5;
      const barH = b.h * (0.5 + hash(i * 3.1 + 53) * 0.5);
      const thick = (0.12 + hash(i * 4.2 + 59) * 0.18) * u;
      if (onX) {
        pos.set(
          b.cx + outX * (b.w / 2 + thick),
          b.cy + (hash(i * 5 + 61) - 0.5) * (b.h - barH),
          b.cz + (hash(i * 6 + 67) - 0.5) * b.d * 0.85,
        );
        scl.set(thick, barH, thick);
      } else {
        pos.set(
          b.cx + (hash(i * 7 + 71) - 0.5) * b.w * 0.85,
          b.cy + (hash(i * 8 + 73) - 0.5) * (b.h - barH),
          b.cz + (b.cz >= 0 ? 1 : -1) * (b.d / 2 + thick),
        );
        scl.set(thick, barH, thick);
      }
      m.compose(pos, q, scl);
      this.strips.setMatrixAt(si, m);
      rain[si * 2] = hash(i * 9 + 79); // phase
      rain[si * 2 + 1] = 0.4 + hash(i * 10 + 83) * 1.3; // speed
      // Cold prismatic palette: ice-white / steel / a pale violet whisper (hashed) — the redesign's
      // austere data-rain (was neon cyan/magenta/amber; the megalith reads black-crystal + spectrum now).
      const hsh = hash(i * 11 + 89);
      const hue = hsh < 0.55 ? 0.58 : hsh < 0.85 ? 0.62 : 0.74;
      col.setHSL(hue, hsh < 0.85 ? 0.25 : 0.5, 0.72);
      scol[si * 3] = col.r;
      scol[si * 3 + 1] = col.g;
      scol[si * 3 + 2] = col.b;
      si++;
    }
    stripGeo.setAttribute('aRain', new THREE.InstancedBufferAttribute(rain, 2));
    stripGeo.setAttribute('aColor', new THREE.InstancedBufferAttribute(scol, 3));
    this.stripCount = si;
    this.strips.instanceMatrix.needsUpdate = true;
    parent.add(this.strips);
  }

  /** Drive the data-rain + greeble glow from the temple's reactivity/chaos. O(1). */
  update(t: number, reactivity: number, chaos: number): void {
    const c = chaos < 0 ? 0 : chaos > 1 ? 1 : chaos;
    const r = reactivity < 0 ? 0 : reactivity > 1 ? 1 : reactivity;
    const u = this.stripMat.uniforms;
    u['uTime']!.value = t;
    u['uChaos']!.value = c;
    u['uReact']!.value = r;
    this.greebleMat.emissiveIntensity = 0.22 + r * 0.7;
  }

  /** Free both meshes' geometry + material and detach from the temple group. */
  dispose(): void {
    this.greeble.geometry.dispose();
    this.greebleMat.dispose();
    this.parent.remove(this.greeble);
    this.greeble.dispose();
    this.strips.geometry.dispose();
    this.stripMat.dispose();
    this.parent.remove(this.strips);
    this.strips.dispose();
  }
}

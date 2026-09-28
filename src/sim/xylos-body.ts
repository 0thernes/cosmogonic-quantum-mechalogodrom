/**
 * Xylos is an aperture surrounded by six unequal, folded Möbius membranes. Its 48 luminous foci
 * and 192 directed paths are the live sparse mind, not a decorative substitute graph. Membrane
 * width follows specialist activation; violet/cyan paths encode inhibition/excitation; amber
 * marks the attended specialist. Geometry is entirely procedural and owns no textures or lights.
 */
import * as THREE from 'three';
import { ARENA_MID, PLATFORM_FLOOR } from './constants';
import type { XylosView } from './xylos-mind';

/** Shared mapping from the mind's normalized position to the near-core habitat in world units. */
export const XYLOS_WORLD_RADIUS = 120 * ARENA_MID * 0.75;
/** Fixed GPU submission budget: membranes, hem filaments, axons, and glowing foci. */
export const XYLOS_BODY_DRAW_CALLS = 4;
/** Maximum triangles in the single indexed, double-sided membrane mesh. */
export const XYLOS_BODY_TRIANGLES = 6 * 64 * 4 * 2;

const FOCI = 48;
const EDGES = 192;
const PETALS = 6;
const SEGMENTS = 64;
const WIDTH_SEGMENTS = 4;
const STRIDE = WIDTH_SEGMENTS + 1;
const PETAL_VERTICES = (SEGMENTS + 1) * STRIDE;
const EDGE_SEGMENTS = 4;
const TAU = Math.PI * 2;

const MEMBRANE_VERTEX = /* glsl */ `
  attribute vec3 color;
  varying vec3 vColor;
  varying vec3 vView;
  varying vec2 vUv;
  void main() {
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    vView = -view.xyz;
    vColor = color;
    vUv = uv;
    gl_Position = projectionMatrix * view;
  }
`;
const MEMBRANE_FRAGMENT = /* glsl */ `
  uniform float uPhase;
  uniform float uError;
  uniform float uCoherence;
  varying vec3 vColor;
  varying vec3 vView;
  varying vec2 vUv;
  void main() {
    vec3 n = normalize(cross(dFdx(vView), dFdy(vView)));
    float rim = pow(1.0 - abs(dot(n, normalize(vView))), 2.0);
    float rib = pow(0.5 + 0.5 * sin(vUv.x * 213.0 + vUv.y * 8.0 + uPhase), 13.0);
    float seam = pow(abs(vUv.y * 2.0 - 1.0), 10.0);
    vec3 nacre = 0.5 + 0.5 * cos(vec3(0.3, 2.4, 4.5) + vUv.x * 9.0 + rim * 4.0);
    vec3 glow = vColor * (0.34 + rim * 1.45 + rib * (0.15 + uError * 0.6));
    glow += nacre * (0.10 + 0.22 * uCoherence) + vColor * seam * 0.65;
    gl_FragColor = vec4(glow, 0.30 + 0.32 * rim + 0.18 * seam);
  }
`;
const FOCUS_VERTEX = /* glsl */ `
  attribute vec3 color;
  attribute float radiance;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * view;
    gl_PointSize = clamp((14.0 + radiance * 16.0) * 180.0 / max(10.0, -view.z), 2.0, 46.0);
  }
`;
const FOCUS_FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    float core = exp(-r * r * 32.0);
    float halo = pow(1.0 - r, 3.0);
    gl_FragColor = vec4(vColor * (0.65 + core * 1.8), core + halo * 0.7);
  }
`;

/**
 * Read-only presentation of one Xylos mind. Owns four fixed draw calls and all their GPU resources.
 * CPU cost is O(6 × 64 × 5 + 192 × 4 + 48), with no allocations or simulation writes in update().
 */
export class XylosBody {
  /** Root in the shared scene; camera focus reads its actual position. */
  readonly group = new THREE.Group();
  /** Conservative framing radius, including the largest folded petal. */
  readonly viewRadius = 64;
  /** Borrowed geometry for inspection; buffers have a fixed capacity for the body's entire life. */
  readonly membraneGeometry = new THREE.BufferGeometry();
  /** Actual sparse neural paths, with four line segments per incoming edge. */
  readonly connectomeGeometry = new THREE.BufferGeometry();
  /** The 48 actual neural foci mapped from Poincaré-disk coordinates around the central aperture. */
  readonly focusGeometry = new THREE.BufferGeometry();

  private readonly membranePositions = new Float32Array(PETALS * PETAL_VERTICES * 3);
  private readonly membraneColors = new Float32Array(PETALS * PETAL_VERTICES * 3);
  private readonly hems = new Float32Array(PETALS * SEGMENTS * 3 * 6);
  private readonly hemColors = new Float32Array(PETALS * SEGMENTS * 3 * 6);
  private readonly hemGeometry = new THREE.BufferGeometry();
  private readonly axons = new Float32Array(EDGES * EDGE_SEGMENTS * 6);
  private readonly axonColors = new Float32Array(EDGES * EDGE_SEGMENTS * 6);
  private readonly foci = new Float32Array(FOCI * 3);
  private readonly focusColors = new Float32Array(FOCI * 3);
  private readonly radiance = new Float32Array(FOCI);
  private readonly focusAngles = new Float64Array(FOCI);
  private readonly focusRadii = new Float64Array(FOCI);
  private readonly tint = new THREE.Color();
  private readonly membraneMaterial: THREE.ShaderMaterial;
  private readonly lineMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.86,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  private readonly axonMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  private readonly focusMaterial: THREE.ShaderMaterial;
  private disposed = false;

  constructor(scene: THREE.Scene) {
    this.group.name = 'XYLOS — autonomous manifold';
    const uvs = new Float32Array(PETALS * PETAL_VERTICES * 2);
    const indices = new Uint16Array(XYLOS_BODY_TRIANGLES * 3);
    let index = 0;
    for (let p = 0; p < PETALS; p++) {
      for (let j = 0; j <= SEGMENTS; j++) {
        for (let k = 0; k <= WIDTH_SEGMENTS; k++) {
          const v = p * PETAL_VERTICES + j * STRIDE + k;
          uvs[v * 2] = j / SEGMENTS;
          uvs[v * 2 + 1] = k / WIDTH_SEGMENTS;
          if (j === SEGMENTS || k === WIDTH_SEGMENTS) continue;
          indices[index++] = v;
          indices[index++] = v + STRIDE;
          indices[index++] = v + 1;
          indices[index++] = v + 1;
          indices[index++] = v + STRIDE;
          indices[index++] = v + STRIDE + 1;
        }
      }
    }
    this.membraneGeometry.setIndex(new THREE.BufferAttribute(indices, 1));
    this.membraneGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    this.bindDynamic(this.membraneGeometry, 'position', this.membranePositions, 3);
    this.bindDynamic(this.membraneGeometry, 'color', this.membraneColors, 3);
    this.bindDynamic(this.hemGeometry, 'position', this.hems, 3);
    this.bindDynamic(this.hemGeometry, 'color', this.hemColors, 3);
    this.bindDynamic(this.connectomeGeometry, 'position', this.axons, 3);
    this.bindDynamic(this.connectomeGeometry, 'color', this.axonColors, 3);
    this.bindDynamic(this.focusGeometry, 'position', this.foci, 3);
    this.bindDynamic(this.focusGeometry, 'color', this.focusColors, 3);
    this.bindDynamic(this.focusGeometry, 'radiance', this.radiance, 1);
    this.membraneMaterial = new THREE.ShaderMaterial({
      vertexShader: MEMBRANE_VERTEX,
      fragmentShader: MEMBRANE_FRAGMENT,
      uniforms: { uPhase: { value: 0 }, uError: { value: 0 }, uCoherence: { value: 0 } },
      side: THREE.DoubleSide,
      forceSinglePass: true,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    this.focusMaterial = new THREE.ShaderMaterial({
      vertexShader: FOCUS_VERTEX,
      fragmentShader: FOCUS_FRAGMENT,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const membrane = new THREE.Mesh(this.membraneGeometry, this.membraneMaterial);
    membrane.name = 'Xylos folded Möbius membranes';
    const hem = new THREE.LineSegments(this.hemGeometry, this.lineMaterial);
    hem.name = 'Xylos phase filaments';
    const axons = new THREE.LineSegments(this.connectomeGeometry, this.axonMaterial);
    axons.name = 'Xylos actual sparse connectome';
    const foci = new THREE.Points(this.focusGeometry, this.focusMaterial);
    foci.name = 'Xylos actual neural foci';
    // Fixed conservative bounds avoid a per-frame bounding-sphere pass and retain ordinary culling.
    for (const geometry of [
      this.membraneGeometry,
      this.hemGeometry,
      this.connectomeGeometry,
      this.focusGeometry,
    ]) {
      geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), this.viewRadius);
    }
    this.group.add(membrane, hem, axons, foci);
    scene.add(this.group);
  }

  private bindDynamic(
    geometry: THREE.BufferGeometry,
    name: string,
    data: Float32Array,
    size: number,
  ): void {
    geometry.setAttribute(
      name,
      new THREE.BufferAttribute(data, size).setUsage(THREE.DynamicDrawUsage),
    );
  }

  /** Update fixed presentation buffers from a validated mind view. O(vertices + edges + foci). */
  update(view: Readonly<XylosView>, elapsed: number): void {
    if (this.disposed) return;
    if (!Number.isFinite(elapsed)) throw new RangeError('Xylos presentation time must be finite');
    // Wrap presentation phase before trig: long sessions retain precision without accumulating state.
    const time = elapsed % (TAU * 240);
    this.group.position.set(
      view.x * XYLOS_WORLD_RADIUS,
      PLATFORM_FLOOR + 70 + view.energy * 8,
      view.z * XYLOS_WORLD_RADIUS,
    );
    this.group.rotation.y = view.phase * 0.045;
    this.group.rotation.z = view.valence * 0.07;
    this.updateMembranes(view, time);
    this.updateConnectome(view);
    // Uniforms are constructed above and never removed; updates do not allocate.
    this.membraneMaterial.uniforms['uPhase']!.value = view.phase + time * 0.35;
    this.membraneMaterial.uniforms['uError']!.value = view.predictionError;
    this.membraneMaterial.uniforms['uCoherence']!.value = view.coherence;
    this.membraneGeometry.attributes['position']!.needsUpdate = true;
    this.membraneGeometry.attributes['color']!.needsUpdate = true;
    this.hemGeometry.attributes['position']!.needsUpdate = true;
    this.hemGeometry.attributes['color']!.needsUpdate = true;
    this.connectomeGeometry.attributes['position']!.needsUpdate = true;
    this.connectomeGeometry.attributes['color']!.needsUpdate = true;
    this.focusGeometry.attributes['position']!.needsUpdate = true;
    this.focusGeometry.attributes['color']!.needsUpdate = true;
    this.focusGeometry.attributes['radiance']!.needsUpdate = true;
  }

  /** O(6 × 65 × 5). Open Möbius bands: ((R+v cos(u/2)) cos u, ..., v sin(u/2)). */
  private updateMembranes(view: Readonly<XylosView>, time: number): void {
    for (let p = 0; p < PETALS; p++) {
      const engaged = p === view.attention;
      const broadcast = Math.abs(view.workspace[p] ?? 0);
      const tilt = 0.28 + p * 0.44 + view.coherence * 0.14;
      const ct = Math.cos(tilt);
      const st = Math.sin(tilt);
      const yaw = p * 2.399963 + view.phase * (p % 2 === 0 ? 0.05 : -0.04);
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const radius = 22 + p * 2.4;
      for (let j = 0; j <= SEGMENTS; j++) {
        const progress = j / SEGMENTS;
        const u = progress * 5.65 + p * 0.24;
        const activity = Math.abs(
          view.activity[p * 8 + Math.min(7, Math.floor(progress * 8))] ?? 0,
        );
        const width =
          (3.2 + activity * 5.5 + broadcast * 3) *
          (0.08 + 0.92 * Math.pow(Math.sin(progress * Math.PI), 0.65));
        const fold = Math.sin(u * 3 + view.phase) * view.predictionError * 1.8;
        const flutter = Math.sin(u * 4 + time * 0.6 + p) * (0.2 + view.pulse * 0.35);
        const cu = Math.cos(u);
        const su = Math.sin(u);
        const halfCos = Math.cos(u * 0.5);
        const halfSin = Math.sin(u * 0.5);
        this.tint.setHSL(engaged ? 0.085 : 0.49 + p * 0.041, 0.86, 0.39 + activity * 0.18);
        for (let k = 0; k <= WIDTH_SEGMENTS; k++) {
          const cross = (k / WIDTH_SEGMENTS - 0.5) * 2 * width;
          const mx = (radius + cross * halfCos) * cu;
          const my = (radius + cross * halfCos) * su * (0.67 + p * 0.035);
          const mz = cross * halfSin + fold + flutter;
          const ry = my * ct - mz * st;
          const rz = my * st + mz * ct;
          const offset = (p * PETAL_VERTICES + j * STRIDE + k) * 3;
          this.membranePositions[offset] = mx * cy + rz * sy;
          this.membranePositions[offset + 1] = ry + (p - 2.5) * 1.9;
          this.membranePositions[offset + 2] = -mx * sy + rz * cy;
          this.membraneColors[offset] = this.tint.r;
          this.membraneColors[offset + 1] = this.tint.g;
          this.membraneColors[offset + 2] = this.tint.b;
        }
      }
    }
    // Each ribbon has two luminous hems and one central phase filament. They reuse exact vertices.
    let line = 0;
    for (let p = 0; p < PETALS; p++) {
      for (let j = 0; j < SEGMENTS; j++) {
        for (let hem = 0; hem < 3; hem++) {
          const cross = hem * 2;
          const a = (p * PETAL_VERTICES + j * STRIDE + cross) * 3;
          const b = a + STRIDE * 3;
          for (let axis = 0; axis < 3; axis++) {
            this.hems[line + axis] = this.membranePositions[a + axis] ?? 0;
            this.hems[line + 3 + axis] = this.membranePositions[b + axis] ?? 0;
            this.hemColors[line + axis] = (this.membraneColors[a + axis] ?? 0) * 1.45;
            this.hemColors[line + 3 + axis] = (this.membraneColors[b + axis] ?? 0) * 1.45;
          }
          line += 6;
        }
      }
    }
  }

  /** O(48 + 192 × 4). Map disk coordinates onto an annulus; curved axons preserve its empty centre. */
  private updateConnectome(view: Readonly<XylosView>): void {
    for (let i = 0; i < FOCI; i++) {
      const x = view.coordinates[i * 2] ?? 0;
      const z = view.coordinates[i * 2 + 1] ?? 0;
      const angle = Math.atan2(z, x);
      const radius = 18 + 20 * Math.min(1, Math.hypot(x, z));
      const activity = Math.abs(view.activity[i] ?? 0);
      const specialist = Math.floor(i / 8);
      this.focusAngles[i] = angle;
      this.focusRadii[i] = radius;
      this.foci[i * 3] = Math.cos(angle) * radius;
      this.foci[i * 3 + 1] =
        Math.sin(angle * 2 + view.phase * 0.15) * (5 + activity * 11) + (specialist - 2.5) * 1.1;
      this.foci[i * 3 + 2] = Math.sin(angle) * radius;
      this.radiance[i] = activity;
      this.tint.setHSL(
        specialist === view.attention ? 0.085 : 0.51 + specialist * 0.035,
        0.92,
        0.6,
      );
      this.focusColors[i * 3] = this.tint.r;
      this.focusColors[i * 3 + 1] = this.tint.g;
      this.focusColors[i * 3 + 2] = this.tint.b;
    }
    for (let e = 0; e < EDGES; e++) {
      const source = view.sources[e] ?? 0;
      const target = Math.floor(e / 4);
      const sourceAngle = this.focusAngles[source] ?? 0;
      let delta = (this.focusAngles[target] ?? 0) - sourceAngle;
      if (delta > Math.PI) delta -= TAU;
      if (delta < -Math.PI) delta += TAU;
      const r0 = this.focusRadii[source] ?? 18;
      const r1 = this.focusRadii[target] ?? 18;
      const y0 = this.foci[source * 3 + 1] ?? 0;
      const y1 = this.foci[target * 3 + 1] ?? 0;
      const weight = view.weights[e] ?? 0;
      const strength = Math.min(1, Math.abs(weight));
      const activation = Math.abs(view.activity[source] ?? 0);
      this.tint.setHSL(weight >= 0 ? 0.5 : 0.77, 0.82, 0.16 + strength * 0.25 + activation * 0.16);
      for (let s = 0; s < EDGE_SEGMENTS; s++) {
        const offset = (e * EDGE_SEGMENTS + s) * 6;
        for (let end = 0; end < 2; end++) {
          const u = (s + end) / EDGE_SEGMENTS;
          const angle = sourceAngle + delta * u;
          const radius = r0 + (r1 - r0) * u;
          const p = offset + end * 3;
          this.axons[p] = Math.cos(angle) * radius;
          this.axons[p + 1] = y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * weight * 4;
          this.axons[p + 2] = Math.sin(angle) * radius;
          this.axonColors[p] = this.tint.r;
          this.axonColors[p + 1] = this.tint.g;
          this.axonColors[p + 2] = this.tint.b;
        }
      }
    }
  }

  /** Free each owned GPU resource once, detach the scene root, and make subsequent updates inert. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.group.removeFromParent();
    this.group.clear();
    this.membraneGeometry.dispose();
    this.hemGeometry.dispose();
    this.connectomeGeometry.dispose();
    this.focusGeometry.dispose();
    this.membraneMaterial.dispose();
    this.lineMaterial.dispose();
    this.axonMaterial.dispose();
    this.focusMaterial.dispose();
  }
}

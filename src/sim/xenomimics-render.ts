/**
 * XENOMIMIC RENDERER — ten indexed, instanced ground-horror morphs.
 *
 * Five visual grammars (porous Möbius web, radial machine, shard bloom, wire tesseract, and
 * lattice orb) are crossed with five counter-variants. The published population's species remains
 * the draw-batch key; its independent mimic/anti role drives shader chirality and body proportions.
 *
 * BOUNDS: exactly ten opaque InstancedMesh draws, no companion FX draw, no per-body Object3D, and no
 * steady-frame allocation. Four preallocated vec4 lanes preserve life, weighted-fulcrum physics,
 * pair-mind state, and environment/superposition state. Every geometry remains indexed.
 */
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import type { RenderMode } from './constants';
import {
  XENOMIMIC_MAX,
  XENOMIMIC_SPECIES,
  type Xenomimic,
  type XenomimicPopulation,
} from './xenomimics';

/**
 * Xenomimic-exclusive BRUTAL skins — deliberately NOT Archon godform styles and NOT entity freakshow.
 * Rare alien grammar: psionic void metal, ichor glass, rift carapace, neural mirror, antimatter hull.
 */
export const XENOMIMIC_BRUTAL_STYLES = [
  {
    name: 'PSIONIC-VOID',
    glyph: '◉',
    title: 'black-hole flesh with violet event-rim',
    metalness: 0.95,
    roughness: 0.08,
    emissive: [0.08, 0.02, 0.22] as const,
    emissiveIntensity: 2.4,
    hueBias: 0.72,
    deform: 1.55,
    sat: 0.85,
    light: 0.18,
    motion: 0.55,
  },
  {
    name: 'ICHOR-GLASS',
    glyph: '◈',
    title: 'translucent bile-crystal with inner veins',
    metalness: 0.15,
    roughness: 0.05,
    emissive: [0.12, 0.55, 0.08] as const,
    emissiveIntensity: 3.1,
    hueBias: 0.32,
    deform: 1.25,
    sat: 0.92,
    light: 0.42,
    motion: 1.35,
    transparent: true,
    opacity: 0.78,
  },
  {
    name: 'RIFT-CARAPACE',
    glyph: '▣',
    title: 'fractured shell plates that crawl against themselves',
    metalness: 0.55,
    roughness: 0.72,
    emissive: [0.55, 0.08, 0.02] as const,
    emissiveIntensity: 1.6,
    hueBias: 0.04,
    deform: 1.9,
    sat: 0.78,
    light: 0.24,
    motion: 1.8,
  },
  {
    name: 'NEURAL-MIRROR',
    glyph: '◎',
    title: 'chrome thought-membrane with pulse seams',
    metalness: 1,
    roughness: 0.02,
    emissive: [0.02, 0.35, 0.55] as const,
    emissiveIntensity: 2.8,
    hueBias: 0.55,
    deform: 0.85,
    sat: 0.55,
    light: 0.55,
    motion: 0.9,
  },
  {
    name: 'ANTIMATTER-HULL',
    glyph: '✦',
    title: 'inverted luminosity — dark cores, white rims',
    metalness: 0.4,
    roughness: 0.35,
    emissive: [0.9, 0.95, 1.0] as const,
    emissiveIntensity: 1.9,
    hueBias: 0.88,
    deform: 2.2,
    sat: 0.35,
    light: 0.12,
    motion: 2.1,
  },
] as const;

/** RENDER-mode skins unique to Xenomimics (grammar ≠ entity RENDER_MODE_FX). */
const XENOMIMIC_RENDER_SKINS: Record<
  RenderMode,
  {
    metalness: number;
    roughness: number;
    emissiveBoost: number;
    hueBias: number;
    sat: number;
    light: number;
    motion: number;
    wireframe: boolean;
    opacity: number;
    transparent: boolean;
  }
> = {
  solid: {
    metalness: 0.68,
    roughness: 0.2,
    emissiveBoost: 1.15,
    hueBias: 0,
    sat: 0.68,
    light: 0.28,
    motion: 1,
    wireframe: false,
    opacity: 1,
    transparent: false,
  },
  wire: {
    metalness: 0.05,
    roughness: 0.75,
    emissiveBoost: 4.8,
    hueBias: 0.12,
    sat: 1,
    light: 0.48,
    motion: 1.85,
    wireframe: true,
    opacity: 1,
    transparent: false,
  },
  ghost: {
    metalness: 0.02,
    roughness: 0.95,
    emissiveBoost: 2.6,
    hueBias: 0.68,
    sat: 0.55,
    light: 0.58,
    motion: 0.55,
    wireframe: false,
    opacity: 0.32,
    transparent: true,
  },
  neon: {
    metalness: 0.08,
    roughness: 0.28,
    emissiveBoost: 6.5,
    hueBias: 0.22,
    sat: 1,
    light: 0.55,
    motion: 1.45,
    wireframe: false,
    opacity: 1,
    transparent: false,
  },
  chrome: {
    metalness: 1,
    roughness: 0.04,
    emissiveBoost: 0.7,
    hueBias: 0.48,
    sat: 0.25,
    light: 0.55,
    motion: 0.8,
    wireframe: false,
    opacity: 1,
    transparent: false,
  },
  hologram: {
    metalness: 0.12,
    roughness: 0.2,
    emissiveBoost: 3.2,
    hueBias: 0.58,
    sat: 0.7,
    light: 0.5,
    motion: 1.15,
    wireframe: false,
    opacity: 0.48,
    transparent: true,
  },
  iridescent: {
    metalness: 0.75,
    roughness: 0.18,
    emissiveBoost: 2.4,
    hueBias: 0.42,
    sat: 0.88,
    light: 0.45,
    motion: 1.3,
    wireframe: false,
    opacity: 1,
    transparent: false,
  },
  plasma: {
    metalness: 0.2,
    roughness: 0.4,
    emissiveBoost: 5.2,
    hueBias: 0.85,
    sat: 0.95,
    light: 0.5,
    motion: 1.7,
    wireframe: false,
    opacity: 0.92,
    transparent: true,
  },
  obsidian: {
    metalness: 0.9,
    roughness: 0.12,
    emissiveBoost: 1.1,
    hueBias: 0.78,
    sat: 0.25,
    light: 0.12,
    motion: 0.7,
    wireframe: false,
    opacity: 1,
    transparent: false,
  },
  prismatic: {
    metalness: 0.55,
    roughness: 0.22,
    emissiveBoost: 3.6,
    hueBias: 0.15,
    sat: 0.95,
    light: 0.48,
    motion: 1.55,
    wireframe: false,
    opacity: 1,
    transparent: false,
  },
};

export const XENOMIMIC_CORE_DRAW_CALLS = XENOMIMIC_SPECIES;
export const XENOMIMIC_FX_DRAW_CALLS = 0;
export const XENOMIMIC_DRAW_CALL_BUDGET = 10;
export const XENOMIMIC_TRIANGLE_BUDGET_AT_CAP = 800_000;
export const XENOMIMIC_MAX_TRIANGLES_PER_BODY = XENOMIMIC_TRIANGLE_BUDGET_AT_CAP / XENOMIMIC_MAX;
export const XENOMIMIC_BODY_SCALE = 2.2;

const LANE_COMPONENTS = 4;
const COLOR_COMPONENTS = 3;
const MATRIX_COMPONENTS = 16;
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const MATRIX = new THREE.Matrix4();
const QUATERNION = new THREE.Quaternion();
const EULER = new THREE.Euler(0, 0, 0, 'YXZ');
const POSITION = new THREE.Vector3();
const SCALE = new THREE.Vector3();
const COLOR = new THREE.Color();

export interface XenomimicRenderEnvironment {
  chaos: number;
  entropy: number;
  weather: number;
  proximity: number;
  /** Optional aggregate pair fields supplied by a telemetry cadence, never sampled here. */
  coherence?: number;
  integration?: number;
  twinTension?: number;
}

export interface XenomimicRenderStats {
  coreDrawCalls: number;
  fxDrawCalls: number;
  livingInstances: number;
  uploadedInstances: number;
}

interface InstanceLanes {
  life: Float32Array;
  body: Float32Array;
  mind: Float32Array;
  environment: Float32Array;
  lifeAttribute: THREE.InstancedBufferAttribute;
  bodyAttribute: THREE.InstancedBufferAttribute;
  mindAttribute: THREE.InstancedBufferAttribute;
  environmentAttribute: THREE.InstancedBufferAttribute;
}

const ZERO_ENVIRONMENT: Readonly<XenomimicRenderEnvironment> = Object.freeze({
  chaos: 0,
  entropy: 0,
  weather: 0,
  proximity: 1,
  coherence: 0,
  integration: 0,
  twinTension: 0,
});

const SPECIES_HUES = [0.015, 0.09, 0.96, 0.57, 0.35, 0.515, 0.59, 0.46, 0.07, 0.85] as const;

function clamp01(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value >= 1 ? 1 : value;
}

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

/** Ensure every recipe part has an index without expanding it to a flat triangle stream. */
function ensureIndexed(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  if (geometry.index) return geometry;
  const indexed = mergeVertices(geometry, 1e-7);
  geometry.dispose();
  return indexed;
}

function mergeIndexed(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const indexed = parts.map(ensureIndexed);
  const merged = mergeGeometries(indexed, false);
  for (const part of indexed) part.dispose();
  if (!merged) throw new Error('Unable to merge indexed Xenomimic geometry');
  const result = ensureIndexed(merged);
  result.computeVertexNormals();
  result.computeBoundingBox();
  result.computeBoundingSphere();
  return result;
}

function ring(
  radius: number,
  tube: number,
  rotationX: number,
  rotationY: number,
  radialSegments = 4,
  tubularSegments = 12,
): THREE.BufferGeometry {
  const geometry = new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments);
  geometry.rotateX(rotationX);
  geometry.rotateY(rotationY);
  return geometry;
}

function strutBetween(a: THREE.Vector3, b: THREE.Vector3, width: number): THREE.BufferGeometry {
  const direction = new THREE.Vector3().subVectors(b, a);
  const length = Math.max(0.001, direction.length());
  direction.multiplyScalar(1 / length);
  const midpoint = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(Y_AXIS, direction);
  const geometry = new THREE.BoxGeometry(width, length, width);
  geometry.applyQuaternion(quaternion);
  geometry.translate(midpoint.x, midpoint.y, midpoint.z);
  return geometry;
}

function buildPorousMobius(counter: boolean): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const knot = new THREE.TorusKnotGeometry(
    counter ? 0.4 : 0.43,
    counter ? 0.07 : 0.075,
    36,
    5,
    counter ? 3 : 2,
    counter ? 5 : 3,
  );
  knot.rotateX(counter ? -0.62 : 0.48);
  parts.push(knot);
  for (let i = 0; i < 3; i++) {
    const polarity = counter ? -1 : 1;
    parts.push(
      ring(
        0.48 + i * 0.1,
        0.034 + i * 0.005,
        Math.PI / 2 + polarity * i * 0.37,
        polarity * (0.26 + i * 0.51),
        4,
        10 + i * 2,
      ),
    );
  }
  const core = new THREE.OctahedronGeometry(counter ? 0.21 : 0.24, 0);
  core.scale(counter ? 0.62 : 1, counter ? 1.25 : 0.85, counter ? 1.18 : 1);
  parts.push(core);
  return mergeIndexed(parts);
}

function buildRadialMachine(counter: boolean): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [new THREE.IcosahedronGeometry(counter ? 0.25 : 0.29, 0)];
  const spokes = counter ? 10 : 8;
  for (let i = 0; i < spokes; i++) {
    const angle = (i / spokes) * Math.PI * 2 + (counter ? Math.PI / spokes : 0);
    const arm = new THREE.BoxGeometry(0.07, 0.68 + (i % 3) * 0.08, 0.08);
    arm.translate(0, 0.34, 0);
    arm.rotateZ(angle * (counter ? -1 : 1));
    arm.rotateX(counter ? 0.48 : -0.34);
    parts.push(arm);
    const node = new THREE.OctahedronGeometry(0.09 + (i % 2) * 0.025, 0);
    const radius = counter ? 0.57 - (i % 2) * 0.08 : 0.53 + (i % 2) * 0.06;
    node.translate(Math.cos(angle) * radius, counter ? -0.08 : 0.12, Math.sin(angle) * radius);
    parts.push(node);
  }
  parts.push(ring(0.43, 0.045, Math.PI / 2, counter ? -0.4 : 0.25, 4, 12));
  parts.push(ring(0.61, 0.035, counter ? 0.35 : 1.1, counter ? 0.9 : -0.55, 4, 14));
  if (counter) parts.push(ring(0.34, 0.028, 1.3, -0.7, 4, 10));
  return mergeIndexed(parts);
}

function buildShardBloom(counter: boolean): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const shardCount = counter ? 13 : 11;
  for (let i = 0; i < shardCount; i++) {
    const angle = (i / shardCount) * Math.PI * 2;
    const height = 0.66 + (i % 4) * 0.13;
    const shard = new THREE.ConeGeometry(0.075 + (i % 3) * 0.018, height, 4);
    shard.translate(0, height * 0.5, 0);
    shard.rotateZ((counter ? -1 : 1) * angle);
    shard.rotateX(counter ? -0.72 + (i % 2) * 0.2 : 0.48 + (i % 3) * 0.12);
    const radius = counter ? 0.18 + (i % 3) * 0.05 : 0.3 + (i % 2) * 0.08;
    shard.translate(Math.cos(angle) * radius, counter ? -0.12 : 0.08, Math.sin(angle) * radius);
    parts.push(shard);
  }
  const core = counter
    ? new THREE.DodecahedronGeometry(0.3, 0)
    : new THREE.IcosahedronGeometry(0.28, 0);
  core.scale(counter ? 1.1 : 0.9, counter ? 0.58 : 1.05, counter ? 1.1 : 0.9);
  parts.push(core);
  return mergeIndexed(parts);
}

function projectTesseractVertex(mask: number, counter: boolean): THREE.Vector3 {
  const x = (mask & 1) === 0 ? -1 : 1;
  const y = (mask & 2) === 0 ? -1 : 1;
  const z = (mask & 4) === 0 ? -1 : 1;
  const w = (mask & 8) === 0 ? -1 : 1;
  const projection = 0.42 / (1.72 - w * (counter ? -0.38 : 0.38));
  return new THREE.Vector3(
    (x + (counter ? -w : w) * 0.36) * projection,
    (y + w * (counter ? -0.28 : 0.28)) * projection,
    (z + (counter ? x : -x) * w * 0.2) * projection,
  );
}

function buildWireTesseract(counter: boolean): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const vertices = Array.from({ length: 16 }, (_, mask) => projectTesseractVertex(mask, counter));
  for (let mask = 0; mask < 16; mask++) {
    const node = new THREE.OctahedronGeometry(counter ? 0.045 : 0.05, 0);
    node.translate(vertices[mask]!.x, vertices[mask]!.y, vertices[mask]!.z);
    parts.push(node);
    for (let axis = 0; axis < 4; axis++) {
      const neighbor = mask ^ (1 << axis);
      if (mask < neighbor)
        parts.push(strutBetween(vertices[mask]!, vertices[neighbor]!, counter ? 0.035 : 0.04));
    }
  }
  const heart = counter
    ? new THREE.TetrahedronGeometry(0.18, 0)
    : new THREE.OctahedronGeometry(0.17, 0);
  heart.rotateY(counter ? Math.PI / 4 : 0);
  parts.push(heart);
  return mergeIndexed(parts);
}

function buildLatticeOrb(counter: boolean): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const core = counter
    ? new THREE.DodecahedronGeometry(0.29, 0)
    : new THREE.IcosahedronGeometry(0.31, 0);
  core.scale(counter ? 1.2 : 0.9, counter ? 0.72 : 1.1, counter ? 0.82 : 0.9);
  parts.push(core);
  parts.push(ring(0.45, 0.032, Math.PI / 2, counter ? 0.55 : 0.1, 4, 12));
  parts.push(ring(0.52, 0.03, counter ? -0.88 : 0.72, counter ? -0.35 : 0.9, 4, 14));
  parts.push(ring(0.58, 0.026, counter ? 0.4 : -0.6, counter ? 1.2 : -0.45, 4, 16));
  const nodes = counter ? 7 : 6;
  for (let i = 0; i < nodes; i++) {
    const angle = (i / nodes) * Math.PI * 2 + (counter ? 0.35 : 0);
    const node = new THREE.OctahedronGeometry(0.075 + (i % 2) * 0.018, 0);
    node.translate(
      Math.cos(angle) * (counter ? 0.49 : 0.55),
      Math.sin(angle * (counter ? 3 : 2)) * 0.23,
      Math.sin(angle) * (counter ? 0.56 : 0.48),
    );
    parts.push(node);
  }
  return mergeIndexed(parts);
}

function buildSpecies(species: number): THREE.BufferGeometry {
  const family = species % 5;
  const counter = species >= 5;
  const geometry =
    family === 0
      ? buildPorousMobius(counter)
      : family === 1
        ? buildRadialMachine(counter)
        : family === 2
          ? buildShardBloom(counter)
          : family === 3
            ? buildWireTesseract(counter)
            : buildLatticeOrb(counter);
  geometry.name = `xenomimic-${family}-${counter ? 'counter' : 'prime'}`;
  geometry.userData['xenomimicSpecies'] = species;
  geometry.userData['xenomimicFamily'] = family;
  geometry.userData['xenomimicCounterVariant'] = counter;
  return geometry;
}

/** Public construction hook for visual/performance contract tests. Caller owns the geometries. */
export function buildXenomimicGeometries(): THREE.BufferGeometry[] {
  return Array.from({ length: XENOMIMIC_SPECIES }, (_, species) => buildSpecies(species));
}

function patchXenomimicMaterial(material: THREE.MeshStandardMaterial): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms['uXenomimicTime'] = material.userData[
      'uXenomimicTime'
    ] as THREE.IUniform<number>;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute vec4 xenomimicLife;        // phase, activity, energy, mimic/anti polarity
attribute vec4 xenomimicBody;        // published leanX, leanZ, landing flex, hop dynamics
attribute vec4 xenomimicMind;        // shimmer, integration, coherence, twin tension
attribute vec4 xenomimicEnvironment; // ground contact, teleport flash, species, global drive
uniform float uXenomimicTime;
varying vec4 vXenomimicLife;
varying vec4 vXenomimicBody;
varying vec4 vXenomimicMind;
varying vec4 vXenomimicEnvironment;
varying vec3 vXenomimicObjectPosition;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vXenomimicLife = xenomimicLife;
vXenomimicBody = xenomimicBody;
vXenomimicMind = xenomimicMind;
vXenomimicEnvironment = xenomimicEnvironment;
vXenomimicObjectPosition = position;
float xKind = floor(xenomimicEnvironment.z + 0.5);
float xFamily = mod(xKind, 5.0);
float xRoleAnti = step(xenomimicLife.w, -0.5);
float xSpeciesCounter = step(4.5, xKind);
float xChirality = mix(1.0, -1.0, xRoleAnti) * mix(1.0, -1.0, xSpeciesCounter);
float xPhase = xenomimicLife.x + uXenomimicTime * (0.75 + xenomimicLife.y * 2.4 + xenomimicMind.x * 0.6);
float xRoot = smoothstep(-0.42, 0.72, position.y);
float xNeural = clamp(xenomimicLife.y * 0.3 + xenomimicMind.x * 0.25 + xenomimicMind.y * 0.2 + xenomimicMind.z * 0.25, 0.0, 1.0);
float xContact = xenomimicEnvironment.x;
float xFlash = xenomimicEnvironment.y;
float xFlex = xenomimicBody.z;
if (xFamily < 0.5) {
  float a = xChirality * (0.22 + xNeural * 0.38) * sin(xPhase + position.y * 3.4);
  mat2 r = mat2(cos(a), -sin(a), sin(a), cos(a));
  transformed.xz = r * transformed.xz;
  transformed += normal * sin(xPhase * 1.7 + length(position) * 9.0) * (0.025 + xNeural * 0.055);
} else if (xFamily < 1.5) {
  float a = xChirality * (xPhase * 0.32 + position.y * 0.9);
  mat2 r = mat2(cos(a), -sin(a), sin(a), cos(a));
  transformed.xz = r * transformed.xz;
  transformed.y += sin(atan(position.z, position.x) * 8.0 + xPhase * 3.0) * (0.025 + xContact * 0.045);
} else if (xFamily < 2.5) {
  float direction = mix(1.0, -0.65, xSpeciesCounter);
  transformed += normal * direction * (0.035 + xFlex * 0.12 + xFlash * 0.18) * xRoot;
  transformed.xz *= 1.0 + direction * sin(xPhase * 2.1 + position.y * 5.0) * 0.055;
} else if (xFamily < 3.5) {
  float fold = sin(xPhase + position.y * 4.0 + position.x * 2.0) * (0.045 + xNeural * 0.08);
  transformed.x += fold * xChirality * sign(position.z + 0.0001);
  transformed.z -= fold * sign(position.x + 0.0001);
  transformed.y += abs(fold) * xFlash * 0.8;
} else {
  float radial = 1.0 + sin(xPhase * 1.4 + length(position) * 11.0) * (0.035 + xenomimicMind.z * 0.05);
  transformed *= radial;
  transformed += normal * xChirality * sin(xPhase * 3.1 + position.x * 8.0) * xFlex * 0.055;
}
transformed.y *= 1.0 - xFlex * xContact * 0.1;
transformed.x += sin(xPhase + position.y * 3.0) * xenomimicBody.w * 0.025 * xRoot;
transformed += normal * xFlash * (0.04 + 0.05 * sin(xPhase * 7.0));`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uXenomimicTime;
varying vec4 vXenomimicLife;
varying vec4 vXenomimicBody;
varying vec4 vXenomimicMind;
varying vec4 vXenomimicEnvironment;
varying vec3 vXenomimicObjectPosition;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
float xKind = floor(vXenomimicEnvironment.z + 0.5);
float xRoleAnti = step(vXenomimicLife.w, -0.5);
float xPhase = vXenomimicLife.x + uXenomimicTime * (1.2 + vXenomimicLife.y * 3.1);
float xFresnel = pow(1.0 - max(dot(normalize(vViewPosition), normalize(normal)), 0.0), 2.4);
float xBand = xPhase + dot(vXenomimicObjectPosition, vec3(9.7, 13.1, 7.3)) + xKind * 1.37;
vec3 xFilm = 0.5 + 0.5 * cos(vec3(0.0, 2.094, 4.188) + xBand);
float xNeural = clamp(vXenomimicLife.y * 0.3 + vXenomimicMind.x * 0.25 + vXenomimicMind.y * 0.2 + vXenomimicMind.z * 0.25, 0.0, 1.0);
float xShimmer = 0.5 + 0.5 * sin(xBand * (1.0 + vXenomimicMind.x * 0.7));
float xSpark = pow(max(0.0, sin(xBand * 4.7 + uXenomimicTime * 7.0)), 30.0);
float xFlash = vXenomimicEnvironment.y;
vec3 xPole = mix(xFilm, xFilm.brg * vec3(0.42, 0.78, 1.15), xRoleAnti);
vec3 xGlow = xPole * (
  0.08 + xFresnel * (0.28 + xNeural * 0.55) +
  xShimmer * (0.05 + vXenomimicLife.z * 0.08) +
  xSpark * (0.18 + vXenomimicLife.y * 0.5 + xFlash * 1.2)
);
xGlow += xPole * vXenomimicEnvironment.w * (0.06 + 0.14 * xFresnel);
xGlow = xGlow / (1.0 + xGlow * 0.55);
totalEmissiveRadiance += xGlow;
diffuseColor.rgb = mix(diffuseColor.rgb, xPole * diffuseColor.rgb, 0.12 + xShimmer * 0.08);`,
      );
  };
  material.customProgramCacheKey = () => 'xenomimic-indexed-shared-v1';
}

function makeLane(): { data: Float32Array; attribute: THREE.InstancedBufferAttribute } {
  const data = new Float32Array(XENOMIMIC_MAX * LANE_COMPONENTS);
  const attribute = new THREE.InstancedBufferAttribute(data, LANE_COMPONENTS);
  attribute.setUsage(THREE.DynamicDrawUsage);
  return { data, attribute };
}

export class XenomimicRenderer {
  private readonly geometries: THREE.BufferGeometry[];
  private readonly meshes: THREE.InstancedMesh[] = [];
  private readonly lanes: InstanceLanes[] = [];
  private readonly matrixArrays: Float32Array[] = [];
  private readonly colorArrays: Float32Array[] = [];
  private readonly counts = new Uint16Array(XENOMIMIC_SPECIES);
  private readonly timeUniform: THREE.IUniform<number> = { value: 0 };
  private readonly material: THREE.MeshStandardMaterial;
  private readonly stats: XenomimicRenderStats = {
    coreDrawCalls: XENOMIMIC_CORE_DRAW_CALLS,
    fxDrawCalls: XENOMIMIC_FX_DRAW_CALLS,
    livingInstances: 0,
    uploadedInstances: 0,
  };
  private environmentDrive = 0;
  private environmentCoherence = 0;
  private environmentIntegration = 0;
  private environmentTwinTension = 0;
  private renderMode: RenderMode = 'solid';
  /** -1 = off; 0..4 = {@link XENOMIMIC_BRUTAL_STYLES}. */
  private brutalStyleIdx = -1;
  private morphWave = 0;
  private morphSeed = 0;
  private hueBias = 0;
  private satMul = 0.68;
  private lightBase = 0.28;
  private motionMul = 1;
  private disposed = false;

  /** Stable callback: XenomimicPopulation.forEach invokes this without creating a per-frame closure. */
  private readonly writeCreature = (creature: Xenomimic): void => {
    const species = Math.min(
      XENOMIMIC_SPECIES - 1,
      Math.max(0, Math.trunc(finite(creature.species))),
    );
    const slot = this.counts[species] ?? 0;
    if (slot >= XENOMIMIC_MAX) return;
    this.counts[species] = slot + 1;

    const polarity = creature.role === 1 ? -1 : 1;
    const vx = finite(creature.vx);
    const vz = finite(creature.vz);
    const speed = Math.hypot(vx, vz);
    const activity = clamp01(speed / 22);
    const energy = clamp01(creature.energy);
    const phase = finite(creature.gaitPhase);
    const pitch = finite(creature.leanX);
    const roll = finite(creature.leanZ);
    const heading = finite(creature.heading, speed > 1e-5 ? Math.atan2(vx, vz) : phase);
    const hopY = Math.max(0, finite(creature.hopY));
    const hopV = finite(creature.hopV);
    const angularEnergy = clamp01(
      Math.hypot(finite(creature.leanVX), finite(creature.leanVZ)) * 0.15,
    );
    const flex = clamp01(hopY * 0.18 + Math.abs(hopV) * 0.045 + angularEnergy * 0.24);
    const contact = hopY <= 0.02 ? 1 : clamp01(1 - hopY * 0.5);
    const teleportFlash = clamp01((finite(creature.teleportCd) - 2.05) / 0.45);
    const shimmer = clamp01(creature.shimmer);
    const verticalDynamics = Math.max(-1, Math.min(1, hopV * 0.12));
    const motion = this.motionMul;
    const scale =
      XENOMIMIC_BODY_SCALE *
      (0.82 + energy * 0.24 + activity * 0.08 + shimmer * 0.06) *
      (1 + this.morphWave * 0.06 * Math.sin(this.morphSeed * 0.7 + creature.pairId));

    POSITION.set(finite(creature.x), finite(creature.y), finite(creature.z));
    // Psionic twin bond — no visual tether; body thrills with shimmer only.
    EULER.set(
      pitch * (0.85 + motion * 0.15),
      heading + shimmer * 0.12 * polarity * motion,
      roll * (0.85 + motion * 0.15),
      'YXZ',
    );
    QUATERNION.setFromEuler(EULER);
    // Preserve positive weighted-ragdoll scaling: InstancedMesh does not support negative scale.
    SCALE.set(
      scale * (polarity < 0 ? 0.9 : 1.1),
      scale * (0.9 + contact * 0.08 - flex * 0.05 * motion),
      scale * (polarity < 0 ? 1.1 : 0.9),
    );
    MATRIX.compose(POSITION, QUATERNION, SCALE);
    MATRIX.toArray(this.matrixArrays[species]!, slot * MATRIX_COMPONENTS);

    const offset = slot * LANE_COMPONENTS;
    const lanes = this.lanes[species]!;
    lanes.life[offset] = phase;
    lanes.life[offset + 1] = activity;
    lanes.life[offset + 2] = energy;
    lanes.life[offset + 3] = polarity;
    lanes.body[offset] = pitch;
    lanes.body[offset + 1] = roll;
    lanes.body[offset + 2] = flex * motion;
    lanes.body[offset + 3] = verticalDynamics * motion;
    lanes.mind[offset] = shimmer;
    lanes.mind[offset + 1] = this.environmentIntegration;
    lanes.mind[offset + 2] = Math.max(shimmer, this.environmentCoherence);
    lanes.mind[offset + 3] = this.environmentTwinTension;
    lanes.environment[offset] = contact;
    lanes.environment[offset + 1] = teleportFlash;
    lanes.environment[offset + 2] = species;
    lanes.environment[offset + 3] = clamp01(
      this.environmentDrive + angularEnergy * 0.16 + flex * 0.08,
    );

    let hue =
      (SPECIES_HUES[species]! +
        this.hueBias +
        (polarity < 0 ? 0.49 : 0) +
        shimmer * 0.06 +
        activity * 0.025 +
        this.morphWave * 0.08) %
      1;
    if (hue < 0) hue += 1;
    COLOR.setHSL(
      hue,
      clamp01(this.satMul + activity * 0.24),
      clamp01(this.lightBase + energy * 0.13 + teleportFlash * 0.09 + this.morphWave * 0.12),
    );
    COLOR.toArray(this.colorArrays[species]!, slot * COLOR_COMPONENTS);
  };

  constructor(scene: THREE.Scene) {
    this.geometries = buildXenomimicGeometries();
    this.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.42, 0.18, 0.12),
      emissive: new THREE.Color(0.11, 0.025, 0.018),
      emissiveIntensity: 1.15,
      metalness: 0.68,
      roughness: 0.2,
      vertexColors: true,
      transparent: false,
      opacity: 1,
      depthTest: true,
      depthWrite: true,
      side: THREE.FrontSide,
    });
    this.material.name = 'xenomimic-opaque-neural-metal';
    this.material.userData['uXenomimicTime'] = this.timeUniform;
    patchXenomimicMaterial(this.material);

    for (let species = 0; species < XENOMIMIC_SPECIES; species++) {
      const life = makeLane();
      const body = makeLane();
      const mind = makeLane();
      const environment = makeLane();
      const geometry = this.geometries[species]!;
      geometry.setAttribute('xenomimicLife', life.attribute);
      geometry.setAttribute('xenomimicBody', body.attribute);
      geometry.setAttribute('xenomimicMind', mind.attribute);
      geometry.setAttribute('xenomimicEnvironment', environment.attribute);

      const mesh = new THREE.InstancedMesh(geometry, this.material, XENOMIMIC_MAX);
      mesh.name = `xenomimic-species-${species}`;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(
        new Float32Array(XENOMIMIC_MAX * COLOR_COMPONENTS),
        COLOR_COMPONENTS,
      );
      mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      scene.add(mesh);

      this.meshes.push(mesh);
      this.lanes.push({
        life: life.data,
        body: body.data,
        mind: mind.data,
        environment: environment.data,
        lifeAttribute: life.attribute,
        bodyAttribute: body.attribute,
        mindAttribute: mind.attribute,
        environmentAttribute: environment.attribute,
      });
      this.matrixArrays.push(mesh.instanceMatrix.array as Float32Array);
      this.colorArrays.push(mesh.instanceColor.array as Float32Array);
    }
  }

  /** RENDER button — unique xenomimic grammar (not entity FX, not Archon jewel). */
  setRenderMode(mode: RenderMode): void {
    if (this.disposed) return;
    this.renderMode = mode;
    this.applyCompositeSkin();
  }

  /**
   * BRUTAL button — {@link XENOMIMIC_BRUTAL_STYLES} (or off). Not Archon godform, not entity freakshow.
   * @param styleIdx -1 off, else 0..length-1
   */
  setBrutalStyle(styleIdx: number): void {
    if (this.disposed) return;
    if (!Number.isFinite(styleIdx) || styleIdx < 0) this.brutalStyleIdx = -1;
    else this.brutalStyleIdx = Math.min(XENOMIMIC_BRUTAL_STYLES.length - 1, Math.floor(styleIdx));
    this.applyCompositeSkin();
  }

  /** Alien shudder envelope on BRUTAL press. */
  setMorphWave(wave: number, seed = 0): void {
    if (this.disposed) return;
    this.morphWave = clamp01(wave);
    this.morphSeed = seed | 0;
  }

  get brutalStyleName(): string {
    if (this.brutalStyleIdx < 0) return 'off';
    return XENOMIMIC_BRUTAL_STYLES[this.brutalStyleIdx]?.name ?? 'off';
  }

  /** Allocation-free mirror of the published object population into fixed GPU buffers. */
  sync(
    population: XenomimicPopulation,
    time: number,
    environment: Readonly<XenomimicRenderEnvironment> = ZERO_ENVIRONMENT,
  ): void {
    if (this.disposed) return;
    this.counts.fill(0);
    this.timeUniform.value = finite(time);
    if (this.morphWave > 0) this.morphWave = Math.max(0, this.morphWave - 0.008);
    const chaos = clamp01(environment.chaos);
    const entropy = clamp01(environment.entropy);
    const weather = clamp01(environment.weather);
    const proximity = clamp01(environment.proximity);
    this.environmentDrive = clamp01(
      chaos * 0.34 + entropy * 0.28 + weather * 0.2 + proximity * 0.18,
    );
    this.environmentCoherence = clamp01(environment.coherence ?? 0);
    this.environmentIntegration = clamp01(environment.integration ?? 0);
    this.environmentTwinTension = clamp01(environment.twinTension ?? 0);

    population.forEach(this.writeCreature);

    let living = 0;
    for (let species = 0; species < XENOMIMIC_SPECIES; species++) {
      const count = this.counts[species] ?? 0;
      const mesh = this.meshes[species]!;
      mesh.count = count;
      living += count;
      if (count === 0) continue;
      this.markRange(mesh.instanceMatrix, count * MATRIX_COMPONENTS);
      this.markRange(mesh.instanceColor!, count * COLOR_COMPONENTS);
      const lanes = this.lanes[species]!;
      this.markRange(lanes.lifeAttribute, count * LANE_COMPONENTS);
      this.markRange(lanes.bodyAttribute, count * LANE_COMPONENTS);
      this.markRange(lanes.mindAttribute, count * LANE_COMPONENTS);
      this.markRange(lanes.environmentAttribute, count * LANE_COMPONENTS);
    }
    this.stats.livingInstances = living;
    this.stats.uploadedInstances = living;
  }

  /** Stable diagnostic object; consume immediately and do not mutate. */
  getStats(): Readonly<XenomimicRenderStats> {
    return this.stats;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const mesh of this.meshes) {
      mesh.removeFromParent();
      mesh.dispose();
    }
    for (const geometry of this.geometries) geometry.dispose();
    this.material.dispose();
  }

  private markRange(attribute: THREE.BufferAttribute, count: number): void {
    attribute.clearUpdateRanges();
    attribute.addUpdateRange(0, count);
    attribute.needsUpdate = true;
  }

  private applyCompositeSkin(): void {
    const render = XENOMIMIC_RENDER_SKINS[this.renderMode] ?? XENOMIMIC_RENDER_SKINS.solid;
    const brutal = this.brutalStyleIdx >= 0 ? XENOMIMIC_BRUTAL_STYLES[this.brutalStyleIdx] : null;

    if (brutal) {
      this.material.metalness = brutal.metalness;
      this.material.roughness = brutal.roughness;
      this.material.color.setHSL(
        brutal.hueBias,
        Math.min(1, brutal.sat + 0.15),
        brutal.light + 0.08,
      );
      this.material.emissive.setRGB(brutal.emissive[0], brutal.emissive[1], brutal.emissive[2]);
      this.material.emissiveIntensity = brutal.emissiveIntensity * 1.35;
      this.material.wireframe = false;
      const transparent = 'transparent' in brutal && brutal.transparent === true;
      this.material.transparent = transparent;
      this.material.opacity = transparent && 'opacity' in brutal ? (brutal.opacity as number) : 1;
      this.material.depthWrite = !transparent;
      this.hueBias = brutal.hueBias;
      this.satMul = brutal.sat;
      this.lightBase = brutal.light;
      this.motionMul = brutal.motion * 1.2;
    } else {
      this.material.metalness = render.metalness;
      this.material.roughness = render.roughness;
      this.material.color.setHSL(render.hueBias || 0.02, render.sat, render.light);
      this.material.emissive.setRGB(0.11, 0.025, 0.018);
      this.material.emissiveIntensity = render.emissiveBoost;
      this.material.wireframe = render.wireframe;
      this.material.transparent = render.transparent;
      this.material.opacity = render.opacity;
      this.material.depthWrite = !render.transparent;
      this.hueBias = render.hueBias;
      this.satMul = render.sat;
      this.lightBase = render.light;
      this.motionMul = render.motion;
    }
    this.material.needsUpdate = true;
  }
}

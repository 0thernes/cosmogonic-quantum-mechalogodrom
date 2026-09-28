import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import {
  XylosBody,
  XYLOS_BODY_DRAW_CALLS,
  XYLOS_BODY_TRIANGLES,
  XYLOS_WORLD_RADIUS,
} from '../src/sim/xylos-body';
import type { XylosView } from '../src/sim/xylos-mind';

function fixture(): XylosView {
  const activity = new Float32Array(48);
  const coordinates = new Float32Array(96);
  const sources = new Uint16Array(192);
  const weights = new Float32Array(192);
  for (let i = 0; i < 48; i++) {
    const angle = (i / 48) * Math.PI * 2;
    coordinates[i * 2] = Math.cos(angle) * 0.6;
    coordinates[i * 2 + 1] = Math.sin(angle) * 0.6;
    activity[i] = Math.sin(angle) * 0.7;
    for (let edge = 0; edge < 4; edge++) {
      sources[i * 4 + edge] = (i + edge + 1) % 48;
      weights[i * 4 + edge] = edge % 2 === 0 ? 0.55 : -0.4;
    }
  }
  return {
    tick: 0,
    x: 0.2,
    z: -0.3,
    phase: 0.4,
    coherence: 0.5,
    predictionError: 0.2,
    confidence: 0.7,
    energy: 0.8,
    valence: -0.2,
    pulse: 0.4,
    attention: 2,
    workspaceWinner: 1,
    workspace: new Float32Array([0.1, 0.8, 0.3, -0.3, 0.2, 0.1]),
    activity,
    coordinates,
    sources,
    weights,
    rewires: 0,
    admitted: new Int8Array([1, 2]),
    quality: new Float32Array(6),
    action: 0,
    modelError: 0,
    attentionError: 0,
    prediction: new Float32Array(6).fill(0.5),
    reliability: new Float32Array(6).fill(0.5),
  };
}

describe('Xylos embodied manifold rendering', () => {
  test('one visible, bounded creature owns four draws and the real 48-focus / 192-edge graph', () => {
    const scene = new THREE.Scene();
    const body = new XylosBody(scene);
    const view = fixture();
    body.update(view, 0);
    expect(scene.children).toEqual([body.group]);
    expect(body.group.children.length).toBe(XYLOS_BODY_DRAW_CALLS);
    expect(body.group.position.x).toBe(view.x * XYLOS_WORLD_RADIUS);
    expect(body.group.position.z).toBe(view.z * XYLOS_WORLD_RADIUS);
    expect(body.focusGeometry.getAttribute('position').count).toBe(48);
    expect(body.connectomeGeometry.getAttribute('position').count).toBe(192 * 4 * 2);
    expect(body.membraneGeometry.getIndex()?.count).toBe(XYLOS_BODY_TRIANGLES * 3);
    expect(XYLOS_BODY_TRIANGLES).toBeLessThan(4000);
    expect(body.group.children.some((child) => child instanceof THREE.Light)).toBe(false);
    const membraneMesh = body.group.children[0];
    expect(membraneMesh).toBeInstanceOf(THREE.Mesh);
    if (membraneMesh instanceof THREE.Mesh && !Array.isArray(membraneMesh.material)) {
      // Transparent DoubleSide otherwise silently spends two draws for one mesh in Three.js.
      expect(membraneMesh.material.forceSinglePass).toBe(true);
    }
    const pos = body.membraneGeometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      expect(Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i))).toBeLessThan(body.viewRadius);
    }
    body.dispose();
  });

  test('activation and workspace deform the body even when presentation time is held fixed', () => {
    const body = new XylosBody(new THREE.Scene());
    const view = fixture();
    body.update(view, 8);
    const membrane = body.membraneGeometry.getAttribute('position');
    const original = Array.from(membrane.array);
    const coordinates = Array.from(view.coordinates);
    const inputs = Array.from(view.activity);
    const excited: XylosView = {
      ...view,
      activity: new Float32Array(48).fill(0.95),
      workspace: new Float32Array(6).fill(0.85),
      predictionError: 0.95,
    };
    body.update(excited, 8);
    expect(Array.from(membrane.array)).not.toEqual(original);
    expect(Array.from(view.coordinates)).toEqual(coordinates);
    expect(Array.from(view.activity)).toEqual(inputs);
    const again = Array.from(membrane.array);
    body.update(excited, 8);
    expect(Array.from(membrane.array)).toEqual(again);
    body.dispose();
  });

  test('actual sparse edge sources drive endpoints and weights drive the visible path', () => {
    const body = new XylosBody(new THREE.Scene());
    const view = fixture();
    body.update(view, 1);
    const axons = body.connectomeGeometry.getAttribute('position');
    const foci = body.focusGeometry.getAttribute('position');
    const source = view.sources[0] ?? 0;
    expect(axons.getX(0)).toBeCloseTo(foci.getX(source), 5);
    expect(axons.getY(0)).toBeCloseTo(foci.getY(source), 5);
    expect(axons.getZ(0)).toBeCloseTo(foci.getZ(source), 5);
    expect(axons.getX(7)).toBeCloseTo(foci.getX(0), 5);
    expect(axons.getY(7)).toBeCloseTo(foci.getY(0), 5);
    expect(axons.getZ(7)).toBeCloseTo(foci.getZ(0), 5);
    const before = Array.from(axons.array).slice(0, 24);
    const sources = new Uint16Array(view.sources);
    const weights = new Float32Array(view.weights);
    sources[0] = 24;
    weights[0] = -0.8;
    body.update({ ...view, sources, weights }, 1);
    expect(axons.getX(0)).toBeCloseTo(foci.getX(24), 5);
    expect(Array.from(axons.array).slice(0, 24)).not.toEqual(before);
    // The graph wraps around an aperture, rather than drawing diameters through a false solid core.
    for (let i = 0; i < axons.count; i++) {
      expect(Math.hypot(axons.getX(i), axons.getZ(i))).toBeGreaterThanOrEqual(17.99);
    }
    body.dispose();
  });

  test('long-running presentation retains the same finite fixed-capacity buffers', () => {
    const body = new XylosBody(new THREE.Scene());
    const view = fixture();
    const buffers = [body.membraneGeometry, body.connectomeGeometry, body.focusGeometry].map(
      (geometry) => geometry.getAttribute('position').array,
    );
    for (let i = 0; i < 240; i++) {
      body.update(
        {
          ...view,
          phase: (i * 0.073) % (Math.PI * 2),
          coherence: (i % 41) / 40,
          predictionError: (i % 31) / 30,
          attention: i % 6,
        },
        1e9 + i / 60,
      );
    }
    const geometries = [body.membraneGeometry, body.connectomeGeometry, body.focusGeometry];
    for (let i = 0; i < geometries.length; i++) {
      const array = geometries[i]?.getAttribute('position').array;
      expect(array).toBe(buffers[i]);
      expect(Array.from(array ?? []).every(Number.isFinite)).toBe(true);
    }
    expect(body.group.children.length).toBe(4);
    const before = Array.from(buffers[0] ?? []);
    expect(() => body.update(view, Number.NaN)).toThrow('must be finite');
    expect(Array.from(buffers[0] ?? [])).toEqual(before);
    body.dispose();
  });

  test('dispose releases all geometry/materials exactly once and prevents further mutation', () => {
    const scene = new THREE.Scene();
    const body = new XylosBody(scene);
    body.update(fixture(), 0);
    let geometryDisposals = 0;
    let materialDisposals = 0;
    for (const child of body.group.children) {
      if (
        child instanceof THREE.Mesh ||
        child instanceof THREE.LineSegments ||
        child instanceof THREE.Points
      ) {
        child.geometry.addEventListener('dispose', () => geometryDisposals++);
        const material = child.material;
        if (!Array.isArray(material)) {
          material.addEventListener('dispose', () => materialDisposals++);
        }
      }
    }
    const positions = body.membraneGeometry.getAttribute('position').array;
    const before = Array.from(positions);
    body.dispose();
    body.dispose();
    body.update({ ...fixture(), predictionError: 1 }, 100);
    expect(geometryDisposals).toBe(4);
    expect(materialDisposals).toBe(4);
    expect(scene.children.length).toBe(0);
    expect(body.group.children.length).toBe(0);
    expect(Array.from(positions)).toEqual(before);
  });
});

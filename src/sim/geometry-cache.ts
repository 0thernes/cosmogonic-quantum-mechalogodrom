/**
 * Shared geometry cache — port of legacy `GF`/`cachedGeos` (lines 230-274).
 *
 * Every entity mesh borrows a geometry from this cache; geometries are built
 * once at boot and NEVER disposed (materials are per-entity and are disposed,
 * see EntityManager.dispose). Morphotype `i` maps to geometry `i % cache.length`.
 */
import * as THREE from 'three';

const { sin, cos } = Math;

/** Module-level scratch — deform factories run once at boot, no per-frame use. */
const vScratch = new THREE.Vector3();
const nScratch = new THREE.Vector3();

/**
 * The 40 geometry factories in legacy order (lines 232-271): 3 spheres,
 * 3 icosahedra, 3 octahedra, 3 tetrahedra, 2 dodecahedra, 3 tori, 6 torus
 * knots, 5 cylinders, 4 cones, 5 boxes, and 3 vertex-deformed organics.
 */
const FACTORIES: ReadonlyArray<() => THREE.BufferGeometry> = [
  () => new THREE.SphereGeometry(1, 8, 6),
  () => new THREE.SphereGeometry(1, 5, 4),
  () => new THREE.SphereGeometry(1, 12, 8),
  () => new THREE.IcosahedronGeometry(1, 0),
  () => new THREE.IcosahedronGeometry(1, 1),
  () => new THREE.IcosahedronGeometry(1, 2),
  () => new THREE.OctahedronGeometry(1, 0),
  () => new THREE.OctahedronGeometry(1, 1),
  () => new THREE.OctahedronGeometry(1, 2),
  () => new THREE.TetrahedronGeometry(1, 0),
  () => new THREE.TetrahedronGeometry(1, 1),
  () => new THREE.TetrahedronGeometry(1, 2),
  () => new THREE.DodecahedronGeometry(1, 0),
  () => new THREE.DodecahedronGeometry(1, 1),
  () => new THREE.TorusGeometry(1, 0.35, 8, 14),
  () => new THREE.TorusGeometry(1, 0.2, 10, 18),
  () => new THREE.TorusGeometry(1, 0.5, 6, 10),
  () => new THREE.TorusKnotGeometry(1, 0.2, 48, 6, 2, 3),
  () => new THREE.TorusKnotGeometry(1, 0.3, 32, 5, 3, 2),
  () => new THREE.TorusKnotGeometry(1, 0.15, 64, 4, 2, 5),
  () => new THREE.TorusKnotGeometry(1, 0.25, 40, 6, 3, 4),
  () => new THREE.TorusKnotGeometry(1, 0.1, 80, 3, 5, 3),
  () => new THREE.TorusKnotGeometry(1, 0.35, 24, 8, 1, 2),
  () => new THREE.CylinderGeometry(1, 1, 0.3, 6),
  () => new THREE.CylinderGeometry(0.2, 1, 2, 5),
  () => new THREE.CylinderGeometry(1, 0.2, 2, 4),
  () => new THREE.CylinderGeometry(1, 1, 1.5, 3),
  () => new THREE.CylinderGeometry(0.5, 0.5, 3, 8),
  () => new THREE.ConeGeometry(1, 2, 5),
  () => new THREE.ConeGeometry(1, 1.5, 3),
  () => new THREE.ConeGeometry(0.5, 3, 6),
  () => new THREE.ConeGeometry(1, 1, 8),
  () => new THREE.BoxGeometry(1, 1, 1),
  () => new THREE.BoxGeometry(2, 0.3, 0.5),
  () => new THREE.BoxGeometry(0.4, 2, 0.4),
  () => new THREE.BoxGeometry(1, 0.5, 2),
  () => new THREE.BoxGeometry(1.5, 0.8, 0.6),
  // Deformed organic 1 (legacy line 269): rippled sphere.
  () => {
    const g = new THREE.SphereGeometry(1, 6, 5);
    const p = g.getAttribute('position');
    for (let ii = 0; ii < p.count; ii++) {
      p.setY(ii, p.getY(ii) + sin(p.getY(ii) * 4) * 0.3);
    }
    g.computeVertexNormals();
    return g;
  },
  // Deformed organic 2 (legacy line 270): noise-extruded icosahedron.
  () => {
    const g = new THREE.IcosahedronGeometry(1, 1);
    const p = g.getAttribute('position');
    for (let ii = 0; ii < p.count; ii++) {
      vScratch.set(p.getX(ii), p.getY(ii), p.getZ(ii));
      nScratch.copy(vScratch).normalize();
      vScratch.add(nScratch.multiplyScalar(sin(vScratch.x * 3) * cos(vScratch.z * 2) * 0.2));
      p.setXYZ(ii, vScratch.x, vScratch.y, vScratch.z);
    }
    g.computeVertexNormals();
    return g;
  },
  // Deformed organic 3 (legacy line 271): bulged dodecahedron.
  () => {
    const g = new THREE.DodecahedronGeometry(1, 0);
    const p = g.getAttribute('position');
    for (let ii = 0; ii < p.count; ii++) {
      const yy = p.getY(ii);
      p.setX(ii, p.getX(ii) * (1 + sin(yy * 5) * 0.2));
      p.setZ(ii, p.getZ(ii) * (1 + cos(yy * 3) * 0.15));
    }
    g.computeVertexNormals();
    return g;
  },
];

/**
 * Builds the 40 shared BufferGeometries (legacy lines 230-274). Call once at
 * boot; the returned geometries are shared across all entities and must never
 * be disposed. A factory failure falls back to a low-poly sphere, exactly as
 * the legacy try/catch did (line 274). O(total vertex count), boot-time only.
 */
export function createGeometryCache(): THREE.BufferGeometry[] {
  const geos: THREE.BufferGeometry[] = [];
  for (const factory of FACTORIES) {
    try {
      geos.push(factory());
    } catch {
      geos.push(new THREE.SphereGeometry(1, 6, 4));
    }
  }
  return geos;
}

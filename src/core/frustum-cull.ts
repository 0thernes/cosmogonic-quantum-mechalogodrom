/**
 * Frustum culling for off-screen entities.
 * This is an INVISIBLE optimization - it doesn't affect visual quality,
 * only reduces rendering work for entities that are off-screen.
 */
import * as THREE from 'three';

/**
 * Check if a sphere is within the camera frustum.
 * Returns true if the sphere is visible, false if it's off-screen.
 */
export function isSphereInFrustum(
  camera: THREE.Camera,
  center: THREE.Vector3,
  radius: number,
): boolean {
  // Get camera frustum planes
  const frustum = new THREE.Frustum();
  const projScreenMatrix = new THREE.Matrix4();
  projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(projScreenMatrix);

  // Test sphere against frustum
  return frustum.intersectsSphere(new THREE.Sphere(center, radius));
}

/**
 * Check if a point is within the camera frustum.
 * Returns true if the point is visible, false if it's off-screen.
 */
export function isPointInFrustum(camera: THREE.Camera, point: THREE.Vector3): boolean {
  return isSphereInFrustum(camera, point, 0);
}

/**
 * Batch frustum culling for multiple entities.
 * Returns an array of indices for entities that are visible.
 * This is more efficient than checking each entity individually.
 */
export function cullEntities(
  camera: THREE.Camera,
  positions: Float32Array,
  radii: Float32Array,
  maxDistance: number,
): number[] {
  const visible: number[] = [];
  const frustum = new THREE.Frustum();
  const projScreenMatrix = new THREE.Matrix4();
  projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(projScreenMatrix);

  const tempSphere = new THREE.Sphere();
  const tempVec = new THREE.Vector3();

  for (let i = 0; i < positions.length / 3; i++) {
    const idx = i * 3;
    const x = positions[idx];
    const y = positions[idx + 1];
    const z = positions[idx + 2];
    if (x === undefined || y === undefined || z === undefined) continue;

    tempVec.set(x, y, z);

    // Skip if beyond max render distance
    if (tempVec.distanceTo(camera.position) > maxDistance) {
      continue;
    }

    const radius = radii[i];
    if (radius === undefined) continue;

    tempSphere.center.copy(tempVec);
    tempSphere.radius = radius;

    if (frustum.intersectsSphere(tempSphere)) {
      visible.push(i);
    }
  }

  return visible;
}

/**
 * Simple distance-based culling for entities.
 * Returns true if the entity is within the max render distance.
 */
export function isWithinRenderDistance(
  camera: THREE.Camera,
  position: THREE.Vector3,
  maxDistance: number,
): boolean {
  return position.distanceTo(camera.position) <= maxDistance;
}

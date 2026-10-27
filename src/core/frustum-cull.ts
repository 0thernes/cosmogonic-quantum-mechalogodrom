/**
 * Frustum culling for off-screen entities.
 * This is an INVISIBLE optimization - it doesn't affect visual quality,
 * only reduces rendering work for entities that are off-screen.
 */
import * as THREE from 'three';

const singleFrustum = new THREE.Frustum();
const singleProjScreenMatrix = new THREE.Matrix4();
const singleSphere = new THREE.Sphere();

/**
 * Check if a sphere is within the camera frustum.
 * Returns true if the sphere is visible, false if it's off-screen.
 */
export function isSphereInFrustum(
  camera: THREE.Camera,
  center: THREE.Vector3,
  radius: number,
): boolean {
  singleProjScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  singleFrustum.setFromProjectionMatrix(singleProjScreenMatrix);
  singleSphere.set(center, radius);

  return singleFrustum.intersectsSphere(singleSphere);
}

/**
 * Check if a point is within the camera frustum.
 * Returns true if the point is visible, false if it's off-screen.
 */
export function isPointInFrustum(camera: THREE.Camera, point: THREE.Vector3): boolean {
  return isSphereInFrustum(camera, point, 0);
}

const batchFrustum = new THREE.Frustum();
const batchProjScreenMatrix = new THREE.Matrix4();
const batchTempSphere = new THREE.Sphere();
const batchTempVec = new THREE.Vector3();

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
  if (maxDistance < 0) return visible;

  batchProjScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  batchFrustum.setFromProjectionMatrix(batchProjScreenMatrix);

  const maxDistanceSq = maxDistance * maxDistance;

  for (let i = 0; i < positions.length / 3; i++) {
    const idx = i * 3;
    const x = positions[idx];
    const y = positions[idx + 1];
    const z = positions[idx + 2];
    if (x === undefined || y === undefined || z === undefined) continue;

    batchTempVec.set(x, y, z);

    // Skip if beyond max render distance
    if (batchTempVec.distanceToSquared(camera.position) > maxDistanceSq) {
      continue;
    }

    const radius = radii[i];
    if (radius === undefined) continue;

    batchTempSphere.center.copy(batchTempVec);
    batchTempSphere.radius = radius;

    if (batchFrustum.intersectsSphere(batchTempSphere)) {
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
  return (
    maxDistance >= 0 && position.distanceToSquared(camera.position) <= maxDistance * maxDistance
  );
}

/**
 * Legacy xenomimic tether destruction — the enforcement half of the tether law (owner 2026-07-13:
 * bipolar twins are PSIONIC, never physically wired). Older builds / partial HMR can leave twin
 * cord LineSegments in the scene; this sweep names them, detaches them, and frees their GPU
 * resources. Extracted from the world so the predicate and the dispose path are behaviorally
 * testable against planted scene objects, not just source-string pinned.
 */
import * as THREE from 'three';

const LEGACY_EXACT_NAMES = new Set([
  'xenomimiccausalconnectome',
  'xeno-mimic-causal-connectome',
  'xenomimic-connectome',
  'xenoconnectome',
]);

/** Case-insensitive name predicate for legacy xenomimic tether/cord/bond line objects. */
export function isLegacyXenomimicTetherName(rawName: string): boolean {
  const name = (rawName || '').toLowerCase();
  if (!name) return false;
  if (LEGACY_EXACT_NAMES.has(name)) return true;
  const looksXeno = name.includes('xeno') || name.includes('mimic');
  const looksTether =
    name.includes('connectome') ||
    name.includes('tether') ||
    name.includes('causal') ||
    name.includes('twin') ||
    name.includes('cord') ||
    name.includes('bond') ||
    name.includes('link');
  return looksXeno && looksTether;
}

/**
 * Sweep `root` for legacy-named LINE primitives (never meshes — the live instanced xenomimic
 * bodies share the same name stems) and destroy each: detach from its parent, dispose its
 * geometry, and dispose its material(s). Returns how many were destroyed.
 */
export function purgeLegacyXenomimicTethers(root: THREE.Object3D): number {
  const doomed: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (!isLegacyXenomimicTetherName(obj.name)) return;
    if (
      obj instanceof THREE.LineSegments ||
      obj instanceof THREE.Line ||
      obj instanceof THREE.LineLoop
    ) {
      doomed.push(obj);
    }
  });
  for (let i = 0; i < doomed.length; i++) {
    const obj = doomed[i]!;
    obj.removeFromParent();
    const line = obj as THREE.LineSegments;
    line.geometry?.dispose();
    const mat = line.material;
    if (Array.isArray(mat)) {
      for (let m = 0; m < mat.length; m++) mat[m]?.dispose();
    } else {
      mat?.dispose();
    }
  }
  return doomed.length;
}

/**
 * World visual-style tables (audit #6: extracted from world.ts). Module constants, no per-frame alloc.
 */
import * as THREE from 'three';
import { HABITAT_XZ_SCALE } from './sim/constants';

/**
 * BRUTALISM: cool overcast concrete fog the cosmos fades into (module consts → no per-frame alloc).
 * Built via setRGB(…, LinearSRGBColorSpace) — NOT `new THREE.Color(0x4a4a52)`. This is a module-level
 * constant, so it is constructed at import-eval time, BEFORE main.ts's body runs
 * `THREE.ColorManagement.enabled = false` (ES modules evaluate imports before the importer's body). A
 * bare hex would therefore be sRGB→linear converted to ~0x111116 (near-black, ~4× too dark), making
 * BRUTALISM fade the cosmos to black instead of concrete grey. setRGB into the linear working space is
 * a no-op conversion regardless of the flag, matching the raw-hex convention every runtime-built scene
 * color already follows (the renderer runs ColorManagement-off + LinearSRGBColorSpace output).
 */
export const BRUTAL_FOG = new THREE.Color().setRGB(
  0x4a / 255,
  0x4a / 255,
  0x52 / 255,
  THREE.LinearSRGBColorSpace,
);
export const BRUTAL_FOG_DENSITY = 0.0011 / HABITAT_XZ_SCALE;

/** V57: singularity kind → telemetry display name (the chaos chooser cycles SINGULARITY_KINDS). */
export const SINGULARITY_LABEL: Record<string, string> = {
  blackhole: 'BLACK HOLE',
  whitehole: 'WHITE HOLE',
  greyhole: 'GREY HOLE',
  strangestar: 'STRANGE STAR',
  entropy: 'ENTROPY FIELD',
};

export const BRUTAL_STYLES = [
  { name: 'BRUTALISM', glyph: '▦', title: 'poured concrete monolith skin' },
  { name: 'NOUVEAUNESS', glyph: '❧', title: 'organic art-nouveau tendril skin' },
  { name: 'ROCOCOGOLOGY', glyph: '✾', title: 'ornate pearl-gold overload skin' },
  { name: 'COSMICMORPHISM', glyph: '☄', title: 'cosmic metamaterial nebula skin' },
  { name: 'REPRESSIONISM', glyph: '▣', title: 'suppressed monochrome pressure skin' },
] as const;

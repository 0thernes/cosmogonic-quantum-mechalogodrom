/** Band-limited four-octave detail base; 600 ground segments resolve its 5.35-sample wavelength. */
export const TERRAIN_DETAIL_BASE_FREQUENCY = 0.035;
export const TERRAIN_DETAIL_LACUNARITY = 2.03;

/**
 * CPU counterpart of the living-ground displacement. It shares the octave constants with the GLSL
 * and exists for geometric contact verification; the runtime terrain and flora remain GPU-driven.
 */
export function terrainDisplacementAt(
  x: number,
  z: number,
  terrainTime: number,
  terrainChaos: number,
  terrainEntropy: number,
  terrainWindX: number,
  terrainWindZ: number,
): number {
  const heatDeath = Math.max(0, Math.min(1, terrainEntropy));
  const liveAmp = 1 - 0.72 * heatDeath;
  const wave =
    Math.sin(x * 0.035 + terrainTime * (0.25 + terrainChaos * 0.35) + terrainWindX * 0.15) *
    Math.cos(z * 0.031 - terrainTime * (0.22 + terrainChaos * 0.28) + terrainWindZ * 0.15);
  const tectonic =
    Math.sin((x + z) * 0.011 + terrainTime * 0.11) * Math.cos((x - z) * 0.009 - terrainTime * 0.13);
  const cellular =
    Math.sin(x * 0.071 + Math.sin(z * 0.019 + terrainTime * 0.2) * 2) *
    Math.sin(z * 0.067 - Math.cos(x * 0.017 - terrainTime * 0.17) * 2);
  const ridge = Math.pow(Math.abs(cellular), 1.6) * Math.sign(cellular);
  let detail = 0;
  let amp = 1;
  let freq = TERRAIN_DETAIL_BASE_FREQUENCY;
  for (let i = 0; i < 4; i++) {
    detail +=
      amp *
      Math.sin(x * freq + terrainTime * 0.13 * (i + 1) + terrainWindX * 0.05) *
      Math.cos(z * freq * 0.87 - terrainTime * 0.11 * (i + 1) + terrainWindZ * 0.05);
    amp *= 0.5;
    freq *= TERRAIN_DETAIL_LACUNARITY;
  }
  const ripple = Math.sin(x * 0.23 + z * 0.19 + terrainTime * 0.55) * 0.5 + 0.5;
  return (
    (wave * (2.2 + terrainChaos * 6.2) +
      tectonic * (1 + terrainChaos * 4.6) +
      ridge * (1.5 + terrainChaos * 3.4) +
      detail * (1.2 + terrainChaos * 2) +
      ripple * (0.4 + terrainChaos * 0.8)) *
    liveAmp
  );
}

/**
 * One GLSL implementation of the living-ground displacement shared by the ground mesh and every
 * planted instance. The band-limited detail plus 600-segment mesh keeps the rendered triangles
 * within the plants' intentional 0.5-unit root seating depth.
 */
export const TERRAIN_DEFORMATION_GLSL = /* glsl */ `
float cqmTerrainDisplacement(
  vec3 worldPos,
  float terrainTime,
  float terrainChaos,
  float terrainEntropy,
  vec2 terrainWind
) {
  float heatDeath = clamp(terrainEntropy, 0.0, 1.0);
  float liveAmp = 1.0 - 0.72 * heatDeath;
  float wave =
    sin(worldPos.x * 0.035 + terrainTime * (0.25 + terrainChaos * 0.35) + terrainWind.x * 0.15) *
    cos(worldPos.z * 0.031 - terrainTime * (0.22 + terrainChaos * 0.28) + terrainWind.y * 0.15);
  float tectonic =
    sin((worldPos.x + worldPos.z) * 0.011 + terrainTime * 0.11) *
    cos((worldPos.x - worldPos.z) * 0.009 - terrainTime * 0.13);
  float cellular =
    sin(worldPos.x * 0.071 + sin(worldPos.z * 0.019 + terrainTime * 0.2) * 2.0) *
    sin(worldPos.z * 0.067 - cos(worldPos.x * 0.017 - terrainTime * 0.17) * 2.0);
  float ridge = pow(abs(cellular), 1.6) * sign(cellular);
  float detail = 0.0;
  float amp = 1.0;
  float freq = ${TERRAIN_DETAIL_BASE_FREQUENCY};
  for (int i = 0; i < 4; i++) {
    detail += amp *
      sin(worldPos.x * freq + terrainTime * 0.13 * float(i + 1) + terrainWind.x * 0.05) *
      cos(worldPos.z * freq * 0.87 - terrainTime * 0.11 * float(i + 1) + terrainWind.y * 0.05);
    amp *= 0.5;
    freq *= ${TERRAIN_DETAIL_LACUNARITY};
  }
  float ripple =
    sin(worldPos.x * 0.23 + worldPos.z * 0.19 + terrainTime * 0.55) * 0.5 + 0.5;
  return (
    wave * (2.2 + terrainChaos * 6.2) +
    tectonic * (1.0 + terrainChaos * 4.6) +
    ridge * (1.5 + terrainChaos * 3.4) +
    detail * (1.2 + terrainChaos * 2.0) +
    ripple * (0.4 + terrainChaos * 0.8)
  ) * liveAmp;
}
`;

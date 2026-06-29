/**
 * Dynamic visual benchmark shaders (25 × 25-point mega-report suite).
 * Each entry is injected into titan obelisk materials via {@link applyVizBenchmarks}.
 * Patterns: gauge · palette · arc · radar · heatmap · cascade · network · matrix · lattice · landscape.
 */
import type { MeshStandardMaterial } from 'three';

/** GLSL helper: normalized fragment UV from gl_FragCoord. */
const UV = `
  float rx = resolution.x > 0.0 ? resolution.x : 1.0;
  float ry = resolution.y > 0.0 ? resolution.y : 1.0;
  vec2 uv = fragCoord / vec2(rx, ry);
`;

/** 25 distinct benchmark fragment bodies (mainImageN). */
export const VIZ_BENCHMARKS_GLSL: string[] = [
  // 1 — Entropy gauge (radial needle)
  `
  uniform float u_entropy;
  void mainImage1(out vec4 fragColor, in vec2 fragCoord, vec2 resolution) {
    ${UV}
    vec2 c = uv - vec2(0.5, 0.15);
    float r = length(c);
    float ang = atan(c.y, c.x);
    float ring = smoothstep(0.38, 0.36, r) * smoothstep(0.28, 0.30, r);
    float needle = smoothstep(0.04, 0.0, abs(ang - mix(-2.2, 2.2, 1.0 - u_entropy))) * smoothstep(0.35, 0.0, r);
    fragColor = vec4(vec3(0.9, 0.75, 0.2) * (ring + needle * 1.5), 1.0);
  }`,
  // 2 — Spectrum palette strip
  `
  void mainImage2(out vec4 fragColor, in vec2 fragCoord, vec2 resolution) {
    ${UV}
    float band = step(0.35, uv.y) * step(uv.y, 0.65);
    vec3 col = 0.5 + 0.5 * cos(6.28318 * (uv.x + vec3(0.0, 0.33, 0.67)));
    fragColor = vec4(col * band + vec3(0.05) * (1.0 - band), 1.0);
  }`,
  // 3 — Semi-circle arc (morphospace slice)
  `
  void mainImage3(out vec4 fragColor, in vec2 fragCoord, vec2 resolution) {
    ${UV}
    vec2 c = uv - vec2(0.5, 0.0);
    float r = length(c);
    float arc = smoothstep(0.48, 0.46, r) * smoothstep(0.36, 0.38, r) * step(0.0, c.y);
    fragColor = vec4(vec3(0.4, 0.85, 1.0) * arc, 1.0);
  }`,
  // 4 — QGT manifold ripples
  `
  void mainImage4(out vec4 fragColor, in vec2 fragCoord, vec2 resolution) {
    ${UV}
    float w = sin(uv.x * 24.0) * sin(uv.y * 18.0);
    vec3 col = 0.5 + 0.5 * cos(vec3(0.0, 2.0, 4.0) + w * 4.0 + uv.xyx * 6.0);
    fragColor = vec4(col * (0.35 + 0.65 * abs(w)), 1.0);
  }`,
  // 5 — Economic flow bands
  `
  void mainImage5(out vec4 fragColor, in vec2 fragCoord, vec2 resolution) {
    ${UV}
    float flow = fract(uv.x * 5.0 - uv.y * 2.0);
    vec3 gold = vec3(0.95, 0.78, 0.2);
    vec3 silver = vec3(0.75, 0.8, 0.95);
    fragColor = vec4(mix(silver, gold, smoothstep(0.45, 0.55, flow)), 1.0);
  }`,
  // 6 — GWT ignition cascade (vertical bars)
  `
  void mainImage6(out vec4 fragColor, in vec2 fragCoord, vec2 resolution) {
    ${UV}
    float bar = step(0.5, fract(uv.x * 8.0));
    float h = 0.2 + 0.8 * abs(sin(uv.x * 40.0 + uv.y * 3.0));
    float lit = bar * step(1.0 - h, uv.y);
    fragColor = vec4(vec3(0.2, 0.9, 0.85) * lit, 1.0);
  }`,
  // 7 — Reaction-diffusion spots
  `
  void mainImage7(out vec4 fragColor, in vec2 fragCoord, vec2 resolution) {
    ${UV}
    float u = 0.5 + 0.5 * sin(uv.x * 31.0) * cos(uv.y * 29.0);
    float v = 0.5 + 0.5 * cos(uv.x * 27.0 + 1.3) * sin(uv.y * 33.0);
    fragColor = vec4(vec3(0.15, u, v * 0.8), 1.0);
  }`,
  // 8 — Spatial hash grid
  `
  void mainImage8(out vec4 fragColor, in vec2 fragCoord, vec2 resolution) {
    ${UV}
    vec2 g = fract(uv * 12.0);
    float grid = step(0.92, g.x) + step(0.92, g.y);
    float fill = 0.15 + 0.1 * sin(floor(uv.x * 12.0) + floor(uv.y * 12.0));
    fragColor = vec4(vec3(0.2, 0.55, 0.95) * (fill + grid * 0.5), 1.0);
  }`,
  // 9 — Connectome radar spokes
  `
  void mainImage9(out vec4 fragColor, in vec2 fragCoord, vec2 resolution) {
    ${UV}
    vec2 c = uv - 0.5;
    float ang = atan(c.y, c.x);
    float spokes = abs(sin(ang * 12.0));
    float r = length(c);
    float ring = smoothstep(0.48, 0.45, r) * smoothstep(0.08, 0.12, r);
    fragColor = vec4(vec3(0.3, 0.95, 0.7) * ring * (0.4 + 0.6 * spokes), 1.0);
  }`,
  // 10 — SuperMind waterfall (horizontal tiers)
  `
  void mainImage10(out vec4 fragColor, in vec2 fragCoord, vec2 resolution) {
    ${UV}
    float tier = floor(uv.y * 10.0);
    vec3 col = 0.5 + 0.5 * cos(vec3(0.0, 0.4, 0.8) + tier * 0.35);
    float w = smoothstep(0.48, 0.42, abs(fract(uv.x * 5.0 + tier * 0.1) - 0.5));
    fragColor = vec4(col * (0.25 + 0.75 * w), 1.0);
  }`,
  // 11 — AD tape bars
  `
  void mainImage11(out vec4 fragColor, in vec2 fragCoord, vec2 resolution) {
    ${UV}
    float i = floor(uv.y * 25.0);
    float w = 0.15 + 0.85 * fract(sin(i * 12.9898) * 43758.5453);
    float bar = step(uv.x, w) * step(0.05, uv.y) * step(uv.y, 0.95);
    vec3 col = mix(vec3(0.2, 0.5, 1.0), vec3(1.0, 0.4, 0.6), i / 24.0);
    fragColor = vec4(col * bar, 1.0);
  }`,
  // 12 — Determinism check grid (5×5)
  `
  void mainImage12(out vec4 fragColor, in vec2 fragCoord, vec2 resolution) {
    ${UV}
    vec2 cell = floor(uv * 5.0);
    float hash = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
    vec3 green = vec3(0.2, 0.95, 0.45);
    vec3 red = vec3(0.95, 0.25, 0.2);
    fragColor = vec4(mix(red, green, step(0.15, hash)), 1.0);
  }`,
  // 13 — Render pipeline segments
  `
  void mainImage13(out vec4 fragColor, in vec2 fragCoord, vec2 resolution) {
    ${UV}
    float seg = floor(uv.x * 8.0);
    vec3 col = 0.5 + 0.5 * cos(vec3(0.2, 0.5, 0.9) + seg * 0.7);
    float edge = smoothstep(0.02, 0.0, abs(fract(uv.x * 8.0) - 0.5) - 0.48);
    fragColor = vec4(col * edge, 1.0);
  }`,
  // 14 — Biologics health bars
  `
  void mainImage14(out vec4 fragColor, in vec2 fragCoord, vec2 resolution) {
    ${UV}
    float col = floor(uv.x * 5.0);
    float row = floor(uv.y * 5.0);
    float health = fract(sin(col * 7.1 + row * 13.7) * 43758.5453);
    float bar = step(col / 5.0 + 0.02, uv.x) * step(uv.x, col / 5.0 + 0.02 + health / 5.0);
    bar *= step(abs(uv.y - (row + 0.5) / 5.0), 0.035);
    fragColor = vec4(mix(vec3(0.9, 0.2, 0.2), vec3(0.2, 0.95, 0.5), health) * bar, 1.0);
  }`,
  // 15 — Archon network nodes
  `
  void mainImage15(out vec4 fragColor, in vec2 fragCoord, vec2 resolution) {
    ${UV}
    vec2 p = uv * 5.0;
    vec2 id = floor(p);
    vec2 f = fract(p) - 0.5;
    float d = length(f);
    float node = smoothstep(0.35, 0.2, d);
    float link = smoothstep(0.08, 0.04, abs(f.x)) * smoothstep(0.15, 0.05, abs(f.y));
    fragColor = vec4(vec3(0.85, 0.65, 1.0) * (node + link * 0.4), 1.0);
  }`,
  // 16 — Emergence 5×5 matrix
  `
  void mainImage16(out vec4 fragColor, in vec2 fragCoord, vec2 resolution) {
    ${UV}
    vec2 cell = floor(uv * 5.0);
    float v = fract(sin(dot(cell, vec2(41.0, 17.0))) * 9821.0);
    vec3 cold = vec3(0.1, 0.15, 0.35);
    vec3 hot = vec3(1.0, 0.55, 0.1);
    fragColor = vec4(mix(cold, hot, v), 1.0);
  }`,
  // 17 — Clifford binary lattice
  `
  void mainImage17(out vec4 fragColor, in vec2 fragCoord, vec2 resolution) {
    ${UV}
    vec2 g = floor(uv * 16.0);
    float bit = step(0.5, fract(sin(dot(g, vec2(127.1, 311.7))) * 43758.5453));
    fragColor = vec4(mix(vec3(0.05), vec3(0.2, 0.95, 0.85), bit), 1.0);
  }`,
  // 18 — Genome fitness landscape
  `
  void mainImage18(out vec4 fragColor, in vec2 fragCoord, vec2 resolution) {
    ${UV}
    float h = 0.5 + 0.5 * sin(uv.x * 9.0) * cos(uv.y * 11.0);
    vec3 low = vec3(0.15, 0.25, 0.55);
    vec3 high = vec3(0.95, 0.85, 0.25);
    fragColor = vec4(mix(low, high, h), 1.0);
  }`,
  // 19 — Audio coupling waves
  `
  void mainImage19(out vec4 fragColor, in vec2 fragCoord, vec2 resolution) {
    ${UV}
    float bass = sin(uv.x * 6.28318 * 2.0) * 0.5 + 0.5;
    float treble = sin(uv.y * 40.0 + uv.x * 10.0) * 0.5 + 0.5;
    fragColor = vec4(vec3(0.9 * bass, 0.5 * treble, 0.95), 1.0);
  }`,
  // 20 — Security shield grid
  `
  void mainImage20(out vec4 fragColor, in vec2 fragCoord, vec2 resolution) {
    ${UV}
    vec2 cell = floor(uv * 5.0);
    float ok = step(0.08, fract(sin(dot(cell, vec2(19.0, 53.0))) * 9512.0));
    vec3 green = vec3(0.25, 0.95, 0.55);
    vec3 yellow = vec3(0.95, 0.85, 0.2);
    fragColor = vec4(mix(yellow, green, ok), 1.0);
  }`,
  // 21 — Frame budget pie wedge
  `
  void mainImage21(out vec4 fragColor, in vec2 fragCoord, vec2 resolution) {
    ${UV}
    vec2 c = uv - 0.5;
    float ang = atan(c.y, c.x);
    float seg = floor((ang + 3.14159) / 6.28318 * 8.0);
    vec3 col = 0.5 + 0.5 * cos(vec3(0.0, 0.35, 0.7) + seg * 0.9);
    float r = length(c);
    float pie = smoothstep(0.48, 0.45, r) * smoothstep(0.05, 0.1, r);
    fragColor = vec4(col * pie, 1.0);
  }`,
  // 22 — Tsotchke wiring depth bars
  `
  void mainImage22(out vec4 fragColor, in vec2 fragCoord, vec2 resolution) {
    ${UV}
    float row = floor(uv.y * 10.0);
    float depth = 0.2 + 0.8 * fract(row * 0.17 + 0.31);
    float bar = step(uv.x, depth) * step(0.08, uv.y) * step(uv.y, 0.92);
    vec3 col = mix(vec3(0.3), vec3(0.95, 0.75, 0.2), depth);
    fragColor = vec4(col * bar, 1.0);
  }`,
  // 23 — Faculty coupling heatmap
  `
  void mainImage23(out vec4 fragColor, in vec2 fragCoord, vec2 resolution) {
    ${UV}
    vec2 cell = floor(uv * 5.0);
    float v = 0.5 + 0.5 * sin(cell.x * 1.7 + cell.y * 2.3);
    vec3 low = vec3(0.15, 0.1, 0.35);
    vec3 hi = vec3(0.2, 0.95, 0.45);
    fragColor = vec4(mix(low, hi, v), 1.0);
  }`,
  // 24 — Open-endedness timeline
  `
  void mainImage24(out vec4 fragColor, in vec2 fragCoord, vec2 resolution) {
    ${UV}
    float t = uv.x;
    float novelty = 0.5 + 0.4 * sin(t * 20.0) + 0.1 * sin(t * 53.0);
    float line = smoothstep(0.015, 0.0, abs(uv.y - novelty));
    fragColor = vec4(vec3(0.3, 0.85, 0.95) * line + vec3(0.05, 0.08, 0.12) * 0.5, 1.0);
  }`,
  // 25 — CI/CD status lights (5×5)
  `
  void mainImage25(out vec4 fragColor, in vec2 fragCoord, vec2 resolution) {
    ${UV}
    vec2 cell = floor(uv * 5.0);
    vec2 f = fract(uv * 5.0) - 0.5;
    float d = length(f);
    float ok = step(0.5, fract(sin(dot(cell, vec2(23.0, 71.0))) * 8341.0));
    vec3 green = vec3(0.2, 0.95, 0.4);
    vec3 red = vec3(0.95, 0.25, 0.2);
    float dot = smoothstep(0.22, 0.15, d);
    fragColor = vec4(mix(red, green, ok) * dot, 1.0);
  }`,
];

/** Benchmark count (mega-report suite). */
export const VIZ_BENCHMARK_COUNT = VIZ_BENCHMARKS_GLSL.length;

interface VizShaderMaterial extends MeshStandardMaterial {
  userData: { vizBenchIndex?: number };
}

/** Inject benchmark `index` (0..24) GLSL into a mesh material's fragment pass. */
export function applyVizBenchmarks(material: VizShaderMaterial, index: number): void {
  const bench = ((index % VIZ_BENCHMARK_COUNT) + VIZ_BENCHMARK_COUNT) % VIZ_BENCHMARK_COUNT;
  material.userData.vizBenchIndex = bench;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.u_entropy = { value: 0.35 };
    const shaderCode = VIZ_BENCHMARKS_GLSL[bench] ?? '';
    const fn = bench + 1;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      '#include <color_fragment>\n' +
        `// Visual benchmark ${fn}/25\n${shaderCode}\n` +
        'vec4 benchCol = vec4(0.0);\n' +
        `mainImage${fn}(benchCol, gl_FragCoord.xy, vec2(800.0, 600.0));\n` +
        'diffuseColor = mix(diffuseColor, benchCol, 0.42);\n',
    );
  };
}

export const VIZ_BENCHMARKS_GLSL = [
  // 1: Gauge (Entropy minimization)
  `
  uniform float u_entropy;
  void mainImage1(out vec4 fragColor, in vec2 fragCoord, vec2 resolution) {
    float rx = resolution.x > 0.0 ? resolution.x : 1.0;
    float ry = resolution.y > 0.0 ? resolution.y : 1.0;
    vec2 uv = fragCoord / vec2(rx, ry);
    float r = length(uv - vec2(0.5, 0.0));
    float angle = atan(uv.y, uv.x - 0.5);
    float gauge = step(r, 0.4) - step(r, 0.35);
    float val = 1.0 - u_entropy; // minimize entropy
    float needle = step(abs(angle - val * 3.1415), 0.05) * step(r, 0.38);
    fragColor = vec4(vec3(0.9, 0.8, 0.2) * (gauge + needle), 1.0);
  }
  `,
  // 2: Color Palette Benchmark
  `
  void mainImage2(out vec4 fragColor, in vec2 fragCoord, vec2 resolution) {
    float rx = resolution.x > 0.0 ? resolution.x : 1.0;
    float ry = resolution.y > 0.0 ? resolution.y : 1.0;
    vec2 uv = fragCoord / vec2(rx, ry);
    fragColor = vec4(mix(vec3(1.0), vec3(0.9, 0.8, 0.2), uv.x), 1.0);
  }
  `,
  // 3: Shape Minimalist Semi-circle
  `
  void mainImage3(out vec4 fragColor, in vec2 fragCoord, vec2 resolution) {
    float rx = resolution.x > 0.0 ? resolution.x : 1.0;
    float ry = resolution.y > 0.0 ? resolution.y : 1.0;
    vec2 uv = fragCoord / vec2(rx, ry);
    float r = length(uv - vec2(0.5, 0.0));
    fragColor = vec4(vec3(1.0) * (step(r, 0.5) - step(r, 0.4)) * step(0.0, uv.y), 1.0);
  }
  `,
];

for (let i = 4; i <= 25; i++) {
  VIZ_BENCHMARKS_GLSL.push(`
  void mainImage${i}(out vec4 fragColor, in vec2 fragCoord, vec2 resolution) {
    float rx = resolution.x > 0.0 ? resolution.x : 1.0;
    float ry = resolution.y > 0.0 ? resolution.y : 1.0;
    fragColor = vec4(fract(fragCoord.x * ${i}.0 / rx), fract(fragCoord.y * ${i}.0 / ry), 0.5, 1.0);
  }
  `);
}

export function applyVizBenchmarks(material: any, index: number) {
  // Binds the specific shader into the visualization material
  material.onBeforeCompile = (shader: any) => {
    shader.uniforms.u_entropy = { value: 0.0 };

    // Inject the specific shader code
    const shaderCode = VIZ_BENCHMARKS_GLSL[index] ?? '';

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      '#include <color_fragment>\n' +
        '// Injected Visual Benchmark ' +
        (index + 1) +
        '\n' +
        shaderCode +
        '\n' +
        'vec4 benchCol = vec4(0.0);\n' +
        'mainImage' +
        (index + 1) +
        '(benchCol, gl_FragCoord.xy, vec2(800.0, 600.0));\n' +
        'diffuseColor = mix(diffuseColor, benchCol, 0.4);\n',
    );
  };
}

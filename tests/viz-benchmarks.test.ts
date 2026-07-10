/**
 * Visual-benchmark shader injection (viz3d holographic analytics panel).
 *
 * `applyVizBenchmarks` injects a shadertoy-style `void mainImageN(...) {...}` body into a
 * MeshStandardMaterial's fragment pass. GLSL forbids NESTED function definitions, so the definition
 * MUST land at global scope and only the CALL inside `main()`. A regression once injected the whole
 * thing after `#include <color_fragment>` (which is inside `main()`), raising `'{' : syntax error` so
 * the benchmark material failed to compile (caught by a headless WebGL render check, invisible to the
 * scene-graph unit tests). This pins the structural contract that keeps the shader compilable.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { applyVizBenchmarks, VIZ_BENCHMARK_COUNT } from '../src/sim/viz-benchmarks';

/** Minimal stand-in for the three.js `shader` object passed to onBeforeCompile. */
function fakeShader(): {
  uniforms: Record<string, unknown>;
  vertexShader: string;
  fragmentShader: string;
} {
  return {
    uniforms: {},
    vertexShader: 'void main() {}',
    fragmentShader: [
      '#include <common>',
      'void main() {',
      '  vec4 diffuseColor = vec4(1.0);',
      '  #include <color_fragment>',
      '  gl_FragColor = diffuseColor;',
      '}',
    ].join('\n'),
  };
}

describe('applyVizBenchmarks — GLSL injection structure (compilable)', () => {
  test('the function DEFINITION lands at global scope (before main), the CALL inside main', () => {
    for (let i = 0; i < VIZ_BENCHMARK_COUNT; i++) {
      const mat = new THREE.MeshStandardMaterial() as THREE.MeshStandardMaterial & {
        userData: { vizBenchIndex?: number };
      };
      applyVizBenchmarks(mat, i);
      expect(typeof mat.onBeforeCompile).toBe('function');
      const shader = fakeShader();
      // three.js calls this at compile time; invoke it ourselves with the fake shader.
      (mat.onBeforeCompile as (s: typeof shader) => void)(shader);

      const fn = i + 1;
      const src = shader.fragmentShader;
      const defIdx = src.indexOf(`void mainImage${fn}(`);
      const mainIdx = src.indexOf('void main()');
      const callIdx = src.indexOf(`mainImage${fn}(benchCol`);
      const colorFragIdx = src.indexOf('#include <color_fragment>');

      // The definition exists and is GLOBAL — strictly before `void main()` (no nested function defs).
      expect(defIdx).toBeGreaterThanOrEqual(0);
      expect(mainIdx).toBeGreaterThanOrEqual(0);
      expect(defIdx).toBeLessThan(mainIdx);
      // The call exists and is INSIDE main — after the color_fragment include.
      expect(callIdx).toBeGreaterThan(colorFragIdx);
      // The custom uniform the bodies read is declared at global scope (before main), not left dangling.
      const uIdx = src.indexOf('uniform float u_entropy;');
      expect(uIdx).toBeGreaterThanOrEqual(0);
      expect(uIdx).toBeLessThan(mainIdx);
      expect(src.match(/uniform float u_entropy;/g)).toHaveLength(1);
      // The uniform value is registered for three to upload.
      expect(shader.uniforms.u_entropy).toBeDefined();
    }
  });

  test('index wraps modulo the benchmark count (defensive against out-of-range)', () => {
    const mat = new THREE.MeshStandardMaterial() as THREE.MeshStandardMaterial & {
      userData: { vizBenchIndex?: number };
    };
    applyVizBenchmarks(mat, VIZ_BENCHMARK_COUNT + 3);
    expect(mat.userData.vizBenchIndex).toBe(3);
    applyVizBenchmarks(mat, -1);
    expect(mat.userData.vizBenchIndex).toBe(VIZ_BENCHMARK_COUNT - 1);
  });
});

import * as THREE from 'three';

const vertexShader = `
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  vNormal = normalize(normalMatrix * normal);
  vViewPosition = cameraPosition - worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const fragmentShader = `
uniform float uTime;
uniform float uPower;
uniform float uWarp;
uniform float uDrive;
uniform float uHue;
uniform float uPulse;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n = mix(
    mix(
      mix(hash(i + vec3(0.0, 0.0, 0.0)), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
      mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x),
      f.y
    ),
    mix(
      mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
      mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x),
      f.y
    ),
    f.z
  );
  return n;
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  vec3 normal = normalize(vNormal);
  vec3 view = normalize(vViewPosition);
  float fresnel = pow(1.0 - abs(dot(view, normal)), 3.0);

  vec3 sampleP = normal * 2.0 + vec3(uTime * 0.13, uTime * 0.09, uTime * 0.07);
  float n0 = fbm(sampleP);
  float n1 = fbm(sampleP * 1.7 + vec3(5.2, 1.3, 3.7));
  float n2 = fbm(sampleP * 0.6 - vec3(2.1, 4.4, 1.9));

  float theta = acos(clamp(normal.y, -1.0, 1.0));
  float phi = atan(normal.x, normal.z);

  float band = sin(theta * 9.0 + uTime * 1.7 + n0 * 2.0) * sin(phi * 7.0 - uTime * 1.1 + n1 * 2.0);
  float pole = exp(-abs(theta) * 3.5) + exp(-abs(theta - 3.14159) * 3.5);
  float swirl = sin(phi * 12.0 + theta * 4.0 + uTime * 0.7 + n2 * 3.0);

  float darkHue = fract(uHue + n0 * 0.25 + band * 0.08 + uTime * 0.02);
  float sat = 0.55 + 0.35 * n1 + 0.2 * uDrive;
  float lit = 0.04 + 0.12 * n0 + 0.1 * fresnel + 0.08 * uDrive;
  vec3 coreColor = hsv2rgb(vec3(darkHue, clamp(sat, 0.0, 1.0), clamp(lit, 0.0, 1.0)));

  vec3 voidColor = vec3(0.0, 0.0, 0.0);
  vec3 jetColor = hsv2rgb(vec3(fract(uHue + 0.55 + swirl * 0.1), 0.9, 0.35));
  vec3 shockColor = hsv2rgb(vec3(fract(uHue + 0.25 + band * 0.15), 0.8, 0.5));

  vec3 color = mix(voidColor, coreColor, 0.6 + 0.4 * n0);
  color = mix(color, jetColor, pole * (0.5 + 0.5 * uDrive));
  color = mix(color, shockColor, fresnel * (0.45 + 0.55 * uDrive));
  color += swirl * 0.04 * vec3(0.4, 0.7, 1.0);
  color += band * 0.03 * vec3(1.0, 0.3, 0.6);

  float pulse = 1.0 + 0.3 * sin(uTime * 3.0 + n0 * 5.0) * uPulse;
  color *= pulse;
  color += vec3(0.08, 0.02, 0.1) * uPower * 0.0002;
  color += vec3(0.05, 0.08, 0.12) * uWarp * 0.3;

  gl_FragColor = vec4(color, 1.0);
}
`;

export interface MechalogodromDarkStarUniforms {
  uTime: number;
  uPower: number;
  uWarp: number;
  uDrive: number;
  uHue: number;
  uPulse: number;
}

export function createMechalogodromDarkStarMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPower: { value: 0 },
      uWarp: { value: 0 },
      uDrive: { value: 0 },
      uHue: { value: 0.78 },
      uPulse: { value: 0 },
    },
    vertexShader,
    fragmentShader,
    side: THREE.FrontSide,
  });
}

export function updateDarkStarUniforms(
  material: THREE.ShaderMaterial,
  t: number,
  power: number,
  warp: number,
  drive: number,
  pulse: number,
): void {
  material.uniforms['uTime']!.value = t;
  material.uniforms['uPower']!.value = power;
  material.uniforms['uWarp']!.value = warp;
  material.uniforms['uDrive']!.value = drive;
  material.uniforms['uPulse']!.value = pulse;
  material.uniforms['uHue']!.value = (0.78 + t * 0.03) % 1;
}

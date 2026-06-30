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
  return mix(
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

// Quaternion-like rotation of a vector around an axis.
vec3 qrot(vec3 v, vec3 axis, float angle) {
  vec3 a = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  return v * c + cross(a, v) * s + a * dot(a, v) * (1.0 - c);
}

// IFS/Kleinian-inspired fold that smears the sphere into a non-Euclidean surface.
vec3 foldSphere(vec3 p, float t) {
  p = abs(p);
  float fold = 1.0 / (dot(p, p) + 0.12);
  return p * fold - vec3(0.55 + 0.15 * sin(t));
}

// Spherical-harmonic-inspired banding (not literal SH, but the same oscillatory family).
float shBand(vec3 n, float t) {
  float y1 = sin(n.y * 3.0 + t * 0.9) * cos(n.x * 2.0 - t * 0.6);
  float y2 = sin(n.z * 4.0 + t * 1.2) * sin(n.x * 3.0 + t * 0.7);
  float y3 = cos(n.y * 5.0 - t * 0.8) * sin(n.z * 2.0 + t * 1.1);
  return y1 * 0.5 + y2 * 0.3 + y3 * 0.2;
}

void main() {
  vec3 normal = normalize(vNormal);
  vec3 view = normalize(vViewPosition);
  float fresnel = pow(1.0 - abs(dot(view, normal)), 3.0);

  float t = uTime;
  float pwr = uPower * 0.00015;
  float wrp = uWarp;
  float drv = uDrive;

  // Rotate the noise domain with three independent quaternion spins (P5/implicit aesthetic).
  vec3 n1 = qrot(normal, vec3(0.7, 0.3, 0.5), t * 0.31);
  vec3 n2 = qrot(normal, vec3(-0.4, 0.8, 0.2), t * 0.23);
  vec3 n3 = qrot(normal, vec3(0.2, -0.6, 0.9), t * 0.17);

  // Folded / implicit-field sample points for unearthly distortion.
  vec3 fp = normal * 2.5 + vec3(t * 0.18, t * 0.13, t * 0.09);
  vec3 f1 = foldSphere(fp + 0.1 * sin(t * 0.3), t * 0.07);
  vec3 f2 = foldSphere(fp * 1.3 + vec3(1.2, -0.7, 0.3), t * 0.09);

  float n0 = fbm(n1 * 2.0 + f1 * 0.35);
  float n1n = fbm(n2 * 1.7 + f2 * 0.35 + vec3(5.2, 1.3, 3.7));
  float n2n = fbm(n3 * 0.6 - vec3(2.1, 4.4, 1.9));

  float sh = shBand(normal, t);

  float theta = acos(clamp(normal.y, -1.0, 1.0));
  float phi = atan(normal.x, normal.z);

  float band = sin(theta * 11.0 + t * 2.1 + n0 * 2.5) * sin(phi * 9.0 - t * 1.4 + n1n * 2.5);
  float pole = exp(-abs(theta) * 3.2) + exp(-abs(theta - 3.14159) * 3.2);
  float swirl = sin(phi * 14.0 + theta * 5.0 + t * 1.1 + n2n * 3.5);

  // Dark star core: the center is true black, but the limb explodes with color.
  float centerDark = smoothstep(0.55, 0.0, fresnel + 0.15 * n0);
  float darkHue = fract(uHue + n0 * 0.38 + band * 0.14 + sh * 0.1 + t * 0.04);
  float sat = 0.72 + 0.28 * n1n + 0.25 * drv;
  float lit = 0.05 + 0.16 * n0 + 0.14 * fresnel + 0.14 * drv + 0.1 * wrp;
  vec3 coreColor = hsv2rgb(vec3(darkHue, clamp(sat, 0.0, 1.0), clamp(lit, 0.0, 1.0)));

  // Jet streams: plasma rivers at the poles.
  float jetMask = smoothstep(0.25, 0.85, pole + 0.45 * sh);
  vec3 jetColor = hsv2rgb(vec3(fract(uHue + 0.52 + swirl * 0.18 + n2n * 0.12), 0.92, 0.48));
  jetColor = mix(jetColor, hsv2rgb(vec3(fract(uHue + 0.82), 0.85, 0.35)), 0.5 + 0.5 * sin(t * 3.7));

  // Shock fronts: gold-crimson aurora at the limb.
  float shockMask = smoothstep(0.12, 0.75, fresnel + band * 0.25 + 0.15 * wrp);
  vec3 shockColor = hsv2rgb(vec3(fract(uHue + 0.22 + band * 0.22 + sh * 0.12), 0.88, 0.58));

  // Quantum foam: micro-structural green-purple flicker (only an AI would love this palette).
  float foam = fbm(normal * 9.0 + vec3(t * 0.7)) * fbm(normal * 15.0 - vec3(t * 0.4));
  vec3 foamColor = hsv2rgb(vec3(fract(uHue + 0.38 + foam * 0.25), 0.78, 0.28));

  // Composite: black core -> colored limb -> jets/shocks/foam.
  vec3 color = mix(vec3(0.0), coreColor, 0.5 + 0.5 * n0 + 0.35 * drv);
  color = mix(color, jetColor, jetMask * (0.45 + 0.55 * drv));
  color = mix(color, shockColor, shockMask * (0.55 + 0.45 * drv));
  color += foamColor * foam * (0.18 + 0.28 * drv + 0.22 * wrp);
  color *= 1.0 - centerDark * 0.7; // deepen the true core

  // Chromatic aberration / glitch spills at the limb.
  float aberration = fresnel * (0.6 + 0.4 * drv) * (0.35 + 0.65 * sin(t * 5.0));
  color.r += aberration * 0.35;
  color.b -= aberration * 0.18;
  color.g += aberration * 0.12 * sin(t * 2.3);

  // Pulse and power/warp glows.
  float pulse = 1.0 + 0.4 * sin(t * 4.0 + n0 * 6.0) * uPulse;
  color *= pulse;
  color += vec3(0.14, 0.05, 0.18) * pwr * drv;
  color += vec3(0.1, 0.16, 0.22) * wrp * 0.45;
  color += vec3(0.05, 0.08, 0.12) * sh * (0.2 + 0.3 * drv);

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

import * as THREE from 'three';

const TAU = Math.PI * 2;

interface SatelliteSeed {
  readonly a: number;
  readonly r0: number;
  readonly r1: number;
  readonly r2: number;
  readonly freqTheta: number;
  readonly freqPhi: number;
  readonly freqWobble: number;
  readonly phiOffset: number;
  readonly tilt: number;
  readonly hue: number;
  readonly size: number;
  readonly spin: number;
}

export class MechalogodromSatellites {
  readonly mesh: THREE.InstancedMesh;
  private readonly seeds: SatelliteSeed[];
  private readonly p = new THREE.Vector3();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly s = new THREE.Vector3();
  private readonly m = new THREE.Matrix4();
  private readonly c = new THREE.Color();
  private readonly count: number;

  constructor(parent: THREE.Object3D, count: number, coreRadius: number) {
    this.count = count;
    const geo = new THREE.TorusKnotGeometry(1.2, 0.35, 128, 32, 3, 7);

    const vertexShader = `
      varying vec2 vUv;
      varying vec3 vPos;
      varying vec3 vNormal;
      varying vec3 vColor;
      attribute vec3 instanceColor;
      uniform float uTime;

      void main() {
        vUv = uv;
        vColor = instanceColor;

        // Multi-layered displacement: each artifact is a writhing, non-uniform knot.
        vec3 displaced = position;
        float w1 = sin(position.x * 6.0 + uTime * 1.7) * cos(position.y * 6.0 - uTime * 1.3) * 0.35;
        float w2 = sin(position.z * 9.0 + uTime * 2.1) * cos(position.x * 7.0 + uTime * 0.9) * 0.22;
        float w3 = sin(position.y * 11.0 + position.x * 5.0 - uTime * 1.5) * 0.15;
        displaced += normal * (w1 + w2 + w3);

        vPos = displaced;
        vNormal = normalize(normalMatrix * mat3(instanceMatrix) * normal);

        vec4 mvPosition = instanceMatrix * vec4(displaced, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      varying vec2 vUv;
      varying vec3 vPos;
      varying vec3 vNormal;
      varying vec3 vColor;
      uniform float uTime;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }

      void main() {
        // Kleinian/IFS-style surface folding for the dark-star body.
        vec3 p = vPos * 1.8;
        for(int i = 0; i < 4; i++) {
          p = abs(p) / dot(p, p) - vec3(0.4 + 0.05 * sin(uTime * 0.5 + float(i)));
        }
        float d = length(p);

        vec3 n = normalize(vNormal);
        vec3 v = normalize(-vPos);
        float fresnel = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.5);

        // Base color from the instance hue, then plasma bands.
        vec3 baseColor = mix(vec3(0.02, 0.0, 0.05), vColor, 0.7);
        vec3 starFire = baseColor * (sin(d * 8.0 - uTime * 4.0) * 0.5 + 0.5);
        starFire += vColor * fresnel * 0.9;

        // Bioluminescent ridges.
        float ridges = sin(vPos.y * 18.0 + uTime * 3.0) * sin(vPos.x * 14.0 - uTime * 2.0);
        ridges = smoothstep(0.2, 0.9, ridges);
        vec3 ridgeColor = vColor * 1.4 + vec3(0.1, 0.25, 0.35);
        starFire = mix(starFire, ridgeColor, ridges * 0.45);

        // Glitch sparks.
        float n0 = noise(vUv * 40.0 + uTime * 6.0);
        float n1 = noise(vUv * 60.0 - uTime * 4.0);
        float spark = step(0.94, n0) * step(0.85, n1);
        vec3 glitch = vec3(0.3, 0.85, 1.0) * spark;
        glitch += vec3(1.0, 0.2, 0.5) * step(0.96, n1) * (0.5 + 0.5 * sin(uTime * 8.0));

        // Chromatic spill at the rim.
        vec3 aberration = vec3(0.25, 0.08, -0.12) * fresnel * (0.5 + 0.5 * sin(uTime * 5.0));

        vec3 finalColor = starFire + glitch + aberration;
        // Darken the center: a tiny black heart inside each artifact.
        finalColor *= smoothstep(0.15, 0.85, length(vPos));

        gl_FragColor = vec4(finalColor, 0.95);
      }
    `;

    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: { uTime: { value: 0 } },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, count);
    this.mesh.frustumCulled = false;
    const golden = Math.PI * (3 - Math.sqrt(5));
    this.seeds = [];
    for (let i = 0; i < count; i++) {
      const g = i * golden;
      const rNorm = ((i * 7) % 100) / 100;
      this.seeds.push({
        a: (i / count) * TAU,
        r0: coreRadius * (0.42 + 0.45 * rNorm),
        r1: coreRadius * (0.08 + (0.22 * ((i * 13) % 100)) / 100),
        r2: coreRadius * (0.04 + (0.08 * ((i * 31) % 100)) / 100),
        freqTheta: 0.12 + ((i * 3) % 10) * 0.04,
        freqPhi: 0.08 + ((i * 5) % 10) * 0.05,
        freqWobble: 0.2 + ((i * 2) % 10) * 0.07,
        phiOffset: g * 0.7,
        tilt: ((i * 11) % 10) * 0.4,
        hue: ((i * 37) % 360) / 360,
        size: 0.45 + (((i * 19) % 100) / 100) * 1.2,
        spin: 1.5 + ((i * 23) % 10) * 0.8,
      });
    }
    parent.add(this.mesh);
  }

  update(t: number, power: number, warp: number, drive: number): void {
    const st = t * 9.0; // slow orbital manifold; shader still supplies surface motion
    if (this.mesh.material instanceof THREE.ShaderMaterial) {
      const uTime = this.mesh.material.uniforms.uTime;
      if (uTime) uTime.value = t * 8.0;
    }

    const pScale = 1 + drive * 0.6 + Math.min(power * 0.0002, 1.5);
    const wScale = 1 + warp * 0.5;
    for (let i = 0; i < this.count; i++) {
      const sd = this.seeds[i]!;
      // Base spherical orbit.
      const th = sd.a + st * sd.freqTheta;
      const ph = sd.phiOffset + st * sd.freqPhi;
      const wb = Math.sin(st * sd.freqWobble + i);
      // Lissajous/chaotic radial breathe: the swarm is alive, not clockwork.
      const r =
        sd.r0 +
        sd.r1 * Math.sin(th * 3.0 + st * 1.2) +
        sd.r2 * wb +
        sd.r2 * 0.5 * Math.cos(ph * 2.7 + st * 0.7);
      const x = Math.cos(th) * Math.cos(ph) * r;
      const y = Math.sin(ph) * r + Math.sin(th * 2.0 + st) * sd.r1 * 0.6;
      const z = Math.sin(th) * Math.cos(ph) * r;
      this.p.set(x, y, z);
      // Strange-attractor-like wander: each satellite follows its own local manifold.
      const strangeX = Math.sin(th * 2.7 + st * 0.9) * Math.cos(ph * 1.3) * sd.r2 * 2.2;
      const strangeY = Math.cos(ph * 1.9 - st * 0.6) * Math.sin(th * 0.8) * sd.r2 * 2.2;
      const strangeZ = Math.sin(th * 1.3 + ph * 2.1 + st * 0.5) * sd.r2 * 2.2;
      this.p.x += strangeX * wScale;
      this.p.y += strangeY * wScale;
      this.p.z += strangeZ * wScale;
      // Gyroscopic tumble with precession.
      this.e.set(
        st * sd.spin + sd.tilt + Math.sin(st * 0.3 + i) * 0.8,
        st * sd.spin * 0.7 + ph + Math.cos(st * 0.4 + i) * 0.6,
        st * sd.spin * 0.4 + th + Math.sin(st * 0.5 + i * 1.1) * 0.7,
      );
      this.q.setFromEuler(this.e);
      // Non-uniform "grown" scales: shards, lenses, writhing knots.
      const baseSize = sd.size * pScale;
      const sx = baseSize * (1.0 + 0.4 * Math.sin(st * 0.8 + i) + 0.2 * drive);
      const sy = baseSize * (1.0 + 0.4 * Math.cos(st * 1.1 + i * 1.3));
      const sz = baseSize * (1.0 + 0.4 * Math.sin(st * 0.6 + i * 0.7));
      this.s.set(sx, sy, sz);
      this.m.compose(this.p, this.q, this.s);
      this.mesh.setMatrixAt(i, this.m);
      const hue = (sd.hue + 0.08 * st + 0.15 * drive + 0.08 * wb) % 1;
      const lit = 0.42 + 0.35 * drive + 0.25 * Math.sin(st + i);
      this.c.setHSL(hue < 0 ? hue + 1 : hue, 0.92, Math.min(lit, 0.95));
      this.mesh.setColorAt(i, this.c);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.removeFromParent();
  }
}

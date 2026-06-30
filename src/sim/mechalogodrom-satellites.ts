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
      varying vec3 vColor;
      attribute vec3 instanceColor;
      uniform float uTime;

      void main() {
        vUv = uv;
        vPos = position;
        vColor = instanceColor;
        
        // Crazy localized vertex displacement
        vec3 displaced = position;
        float warp = sin(position.x * 5.0 + uTime) * cos(position.y * 5.0 - uTime) * 0.2;
        displaced += normal * warp;
        
        vec4 mvPosition = instanceMatrix * vec4(displaced, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      varying vec2 vUv;
      varying vec3 vPos;
      varying vec3 vColor;
      uniform float uTime;

      void main() {
        // Insane geometric fractal math for the 'dark star' effect
        vec3 p = vPos * 1.5;
        for(int i=0; i<4; i++) {
            p = abs(p) / dot(p, p) - vec3(0.4);
        }
        float d = length(p);
        
        // Core dark star look: black holes and glitching neon
        vec3 baseColor = mix(vec3(0.02, 0.0, 0.05), vColor, 0.6);
        vec3 starFire = baseColor * (sin(d * 8.0 - uTime * 3.0) * 0.5 + 0.5);
        
        // Glitch artifacts
        float noise = fract(sin(dot(vPos.xy, vec2(12.9898, 78.233)) + uTime) * 43758.5453);
        vec3 glitch = vec3(0.2, 0.8, 1.0) * step(0.95, noise);
        
        vec3 finalColor = starFire + glitch;
        // Dark center
        finalColor *= smoothstep(0.2, 1.0, length(vPos));

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
    const st = t * 25.0; // MASSIVE SPEED INCREASE
    if (this.mesh.material instanceof THREE.ShaderMaterial) {
      const uTime = this.mesh.material.uniforms.uTime;
      if (uTime) uTime.value = t * 15.0;
    }

    const pScale = 1 + drive * 0.4 + power * 0.0001;
    const wScale = 1 + warp * 0.3;
    for (let i = 0; i < this.count; i++) {
      const sd = this.seeds[i]!;
      const th = sd.a + st * sd.freqTheta;
      const ph = sd.phiOffset + st * sd.freqPhi;
      const wb = Math.sin(st * sd.freqWobble + i);
      const r = sd.r0 + sd.r1 * Math.sin(th * 3 + st) + sd.r2 * wb;
      const x = Math.cos(th) * Math.cos(ph) * r;
      const y = Math.sin(ph) * r + Math.sin(th * 2 + st) * sd.r1 * 0.4;
      const z = Math.sin(th) * Math.cos(ph) * r;
      this.p.set(x, y, z);
      const strangeX = Math.sin(th * 2.7 + st * 0.6) * sd.r2 * 1.5;
      const strangeY = Math.cos(ph * 1.9 - st * 0.4) * sd.r2 * 1.5;
      const strangeZ = Math.sin(th * 1.3 + ph * 2.1) * sd.r2 * 1.5;
      this.p.x += strangeX * wScale;
      this.p.y += strangeY * wScale;
      this.p.z += strangeZ * wScale;
      this.e.set(st * sd.spin + sd.tilt, st * sd.spin * 0.7 + ph, st * sd.spin * 0.4 + th);
      this.q.setFromEuler(this.e);
      const baseSize = sd.size * pScale;
      this.s.set(
        baseSize * (1 + 0.3 * Math.sin(st + i)),
        baseSize * (1 + 0.3 * Math.cos(st + i * 1.3)),
        baseSize * (1 + 0.3 * Math.sin(st * 0.7 + i * 0.7)),
      );
      this.m.compose(this.p, this.q, this.s);
      this.mesh.setMatrixAt(i, this.m);
      const hue = (sd.hue + 0.05 * st + 0.1 * drive + 0.05 * wb) % 1;
      const lit = 0.5 + 0.3 * drive + 0.2 * Math.sin(st + i);
      this.c.setHSL(hue < 0 ? hue + 1 : hue, 1.0, Math.min(lit, 1.0));
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

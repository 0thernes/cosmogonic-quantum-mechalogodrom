/**
 * ALPHABET PANTHEON RENDER (V-ABC) — brings the 100 Greek+Latin archetypes to life in the dome.
 *
 * {@link ALPHABET_ROSTER} (alphabet-pantheon.ts) is 100 deterministic, genuinely-differentiated
 * super-creature archetypes (24 greek-upper + 24 greek-lower + 26 latin-upper + 26 latin-lower) —
 * but it was DATA ONLY: nothing drew them. This renderer hangs all 100 across the upper sky-dome
 * as distinct glowing bodies, each one's **shape, colour, size, and motion read straight from its
 * archetype bias** so the alphabet pantheon is visibly differentiated, not a recolour:
 *
 *  - SHAPE by UNIQUE exterior kind (10): each letter's solid body matches its own
 *    {@link glyphExteriorSignature} topology (cube · shard · dodeca · ring · knot · orb · slab ·
 *    icosa · pillar · portal), then per-letter NON-UNIFORM scale + hue + wander make the 100 read
 *    as 100 distinct silhouettes. One {@link THREE.InstancedMesh} per non-empty kind ⇒ ≤ 10 draw
 *    calls for all 100 (not 100 meshes).
 *  - COLOUR = HSL(bias.hue, 0.6 + 0.35·quantum, 0.45 + 0.2·generative) per instance (instanceColor).
 *  - SIZE   = empowerment + order + generative mix (the "bigger gods loom larger" read).
 *  - MOTION = each body bobs / spins / pulses on its OWN seed-derived frequency + phase
 *    (so the 100 never lockstep), spin-rate scaled by its chaos bias, pulse by its curiosity.
 *
 * DETERMINISM (ADR 0004): draws **zero** rng — every placement, frequency, phase, colour and
 * scale is a pure function of the archetype's fixed fields (index, seed, bias) + the elapsed `t`
 * it is handed. Boot-stream-neutral (cannot perturb `ctx.rng`); same seed ⇒ identical dome. It
 * reads one reactive world scalar (`setChaos`) one-way to quicken the whole swarm under chaos.
 *
 * ROBUSTNESS: additive {@link THREE.MeshBasicMaterial} (unlit → glows, needs no scene light) with
 * per-instance colour; NO hand-written GLSL, so it degrades to "faint", never "broken". The
 * per-frame work is 100 matrix composes — fixed, population-independent, allocation-free (module
 * scratch only).
 */
import * as THREE from 'three';
import { clamp } from '../math/scalar';
import { ARENA_RADIUS, GROUND_EXTENT } from './constants';
import { ALPHABET_ROSTER, type AlphabetArchetype } from './alphabet-pantheon';
import {
  ApexExteriorAbomination,
  attachGlyphWireHalos,
  GlyphAccentMotes,
  GlyphFilamentBurst,
  GlyphSporeAura,
  syncGlyphWireHalos,
} from './creature-exterior-layers';
import { CREATURE_EXTERIOR_TIME_SCALE } from './creature-exterior-phenomena';
import {
  disposeGlyphGeometryCache,
  glyphBodyGeometry,
  glyphGeoBucketKey,
} from './glyph-exterior-geometry';
import {
  GLYPH_PALETTE_IDS,
  glyphExteriorPalette,
  type GlyphExteriorPalette,
} from './glyph-exterior-palette';
import {
  glyphExteriorSignature,
  glyphWanderOffset,
  type GlyphExteriorSignature,
} from './glyph-exterior-signature';
import type { TsotchkeQuantumPulse } from './tsotchke-facade';

/** Dome shell radius the pantheon hangs on; pulled inward so godforms read as beings, not far stars. */
const DOME_R = ARENA_RADIUS * 0.72;

/** USER: godforms roam the FULL SQUARE PLATFORM (the visible ground, GROUND_EXTENT) — out to the edge —
 *  and up to the MECHALOGODROM height, never outside the square and never above the mechalogodrom.
 *  Invisible walls only at the platform bounds (square, per-axis — NOT a circle). */
const ARENA_HALF = (GROUND_EXTENT / 2) * 0.9; // ~540 — square platform half-extent (just inside the edge)
const ARENA_CEIL = 240; // vertical ceiling — up to the mechalogodrom (ALTITUDE 252), never above it
const ARENA_FLOOR = 6; // never below the ground plane
const PANTHEON_REF_ATLAS_URL = '/textures/pantheon_equirect_refs_atlas.png';

function createPantheonFallbackAtlas(): THREE.DataTexture {
  // Deterministic tiny fallback for Bun/headless tests; browser swaps in the generated atlas.
  // RGBA, 4 bytes/texel (alpha=255): DataTexture defaults to RGBAFormat, and THREE.RGBFormat is a
  // deprecated 3-byte format slated for removal — once it's gone the constant reads back undefined,
  // DataTexture silently falls back to RGBAFormat, and a 15-byte (5x3) buffer is then read as 5x4=20
  // bytes and runs past the end. Match the default explicitly: 5 texels x RGBA = 20 bytes.
  const data = new Uint8Array([
    32, 93, 116, 255, 196, 198, 188, 255, 236, 74, 39, 255, 186, 207, 218, 255, 48, 72, 74, 255,
  ]);
  const tex = new THREE.DataTexture(data, 5, 1, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/** Module scratch — reused every frame so the hot path allocates nothing. */
const M = new THREE.Matrix4();
const Q = new THREE.Quaternion();
const E = new THREE.Euler();
const P = new THREE.Vector3();
const S = new THREE.Vector3();
const C = new THREE.Color();
const WANDER = { x: 0, y: 0, z: 0 };

/** Per-instance animation constants, derived from the archetype with NO rng. */
interface Body {
  /** Anchor position on the dome (fixed). */
  readonly ax: number;
  readonly ay: number;
  readonly az: number;
  readonly baseScale: number;
  readonly freq: number; // bob/pulse frequency (rad/s)
  readonly phase: number; // per-body phase offset
  readonly spin: number; // spin rate (rad/s), scaled by chaos bias
  readonly pulse: number; // pulse depth (from curiosity bias)
  readonly hue: number;
  readonly sat: number;
  readonly light: number;
  /** Global archetype index (0–99) for brain-activity lookup. */
  readonly gIdx: number;
  /** Unique physical-outside signature (deterministic per letter). */
  readonly sig: GlyphExteriorSignature;
  /** Image-ref colour identity (5 palette families × per-letter jitter). */
  readonly pal: GlyphExteriorPalette;
  readonly geoKey: string;
  readonly poolSlot: number;
}

export class AlphabetPantheonRender {
  private readonly group = new THREE.Group();
  private readonly meshes: THREE.InstancedMesh[] = [];
  /** Per pool: the bodies it draws, in instance-slot order. */
  private readonly bodies: Body[][] = [];
  private readonly mat: THREE.ShaderMaterial;
  /** #101 — APEX ABOMINATION capstone (ς): warped dimensional horror above the 100-letter pantheon. */
  private readonly apexGroup = new THREE.Group();
  private readonly apexCore: THREE.Mesh;
  private readonly apexHalo: THREE.Mesh;
  private readonly apexSpikes: THREE.Mesh;
  /** V104: additional alien geometry — warped inner core + dimensional shell. */
  private readonly apexInner: THREE.Mesh;
  private readonly apexShell: THREE.Mesh;
  private chaos = 0;
  /** Per-creature brain activity (0..1) from GlyphBrainBatch — drives visual pulse intensity. */
  private brainActivity: Float32Array | null = null;
  /** Per-creature novelty (0..1) — drives shimmer/hue shift. */
  private brainNovelty: Float32Array | null = null;
  /** Per-creature valence (−1..1) — drives hue rotation direction. */
  private brainValence: Float32Array | null = null;
  /** Motor outputs from GlyphBrainBatch (visual-only locomotion). */
  private readonly motorX = new Float32Array(100);
  private readonly motorY = new Float32Array(100);
  private readonly motorZ = new Float32Array(100);
  /** Per-topology body pools (one InstancedMesh per occupied exterior kind). */
  private readonly wireHalos: THREE.InstancedMesh[] = [];
  /** Stellated micro-mote accent — one unique accent per glyph (gIdx 0..99). */
  private readonly glyphAccents: GlyphAccentMotes;
  /** Energy filament needles + spore halos (image-ref iteration 4). */
  private readonly glyphFilaments: GlyphFilamentBurst;
  private readonly glyphSpores: GlyphSporeAura;
  private readonly apexExterior: ApexExteriorAbomination;
  private refAtlas: THREE.Texture;
  private disposed = false;
  private tsotchkePulse: TsotchkeQuantumPulse = {
    cliffordEnt: 0,
    qgtVolume: 0,
    rngEntropy: 0,
    quakeAliveness: 0,
    adGradient: 0,
  };
  private apexTranscendence = 0;
  private apexVitality = 0;
  private localT = 0;

  constructor(scene: THREE.Scene) {
    this.refAtlas = createPantheonFallbackAtlas();
    const pantheonVert = `
      attribute float refBand;
      varying vec2 vUv;
      varying vec3 vPos;
      varying vec3 vColor;
      varying vec3 vNormal;
      varying float vRefBand;
      uniform float uTime;

      // Noise function for vertex displacement
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

      void main() {
        vUv = uv;
        vColor = instanceColor;
        vNormal = normal;
        vRefBand = refBand;

        // USER: structured multi-frequency BREATHING (like the god-jewel's layered beat) — reads as alive
        // + mathematical, not a formless swell or a spasm. Gentle amplitude so the shapely solid survives.
        vec3 displaced = position;
        float beat = 0.4 + 0.3 * sin(uTime * 0.8) + 0.2 * sin(uTime * 1.6 + position.z * 0.5) + 0.1 * sin(uTime * 3.1 + position.x * 0.8);
        float pulse = 0.07 * beat * sin(uTime * 0.5 + position.y * 2.0);
        displaced += normal * pulse;
        
        vPos = displaced;

        vec4 mvPosition = instanceMatrix * vec4(displaced, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * mvPosition;
      }
    `;

    const pantheonFrag = `
      varying vec2 vUv;
      varying vec3 vPos;
      varying vec3 vColor;
      varying vec3 vNormal;
      varying float vRefBand;
      uniform float uTime;
      uniform sampler2D uRefAtlas;

      // USER: give the pantheons SUPER-CREATURE-class skin — rich, structured, mathematical, unique per
      // kind — instead of a flat blob. Value-noise fBm (engraved relief) + per-archetype crystalline facet
      // ridges + thin-film iridescence on crests/rim + subsurface groove glow, over the reference-atlas skin.
      float hash3(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
      float vnoise(vec3 p){
        vec3 i = floor(p); vec3 f = fract(p); f = f*f*(3.0-2.0*f);
        float a=hash3(i), b=hash3(i+vec3(1.,0.,0.)), c=hash3(i+vec3(0.,1.,0.)), d=hash3(i+vec3(1.,1.,0.));
        float e=hash3(i+vec3(0.,0.,1.)), g=hash3(i+vec3(1.,0.,1.)), h=hash3(i+vec3(0.,1.,1.)), q=hash3(i+vec3(1.,1.,1.));
        return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y), mix(mix(e,g,f.x),mix(h,q,f.x),f.y), f.z);
      }
      float fbm(vec3 p){ float amp=0.5, sum=0.0; for(int i=0;i<4;i++){ sum+=amp*vnoise(p); p*=2.03; amp*=0.5; } return sum; }

      void main() {
        vec3 color = vColor;
        vec3 n = normalize(vNormal);
        float fres = pow(1.0 - max(dot(n, vec3(0.0,0.0,1.0)), 0.0), 4.0);

        // Per-archetype crystalline FACETS — sharp abs(sin) ridge network, frequency keyed to the palette
        // band so each pantheon KIND carries a distinct mathematical signature (a rare/unique structure).
        float kf = 5.0 + vRefBand * 3.0;
        float facet = abs(sin(vPos.x*kf)) * abs(sin(vPos.y*(kf*0.8))) * abs(sin(vPos.z*(kf*1.2)));
        facet = pow(facet, 0.35); // sharpen into crisp creases

        // fBm RELIEF engraving — multi-octave detail carved into the surface (structured, not smooth).
        float relief  = fbm(vPos * 2.6 + vec3(0.0, uTime*0.05, 0.0));
        float relief2 = fbm(vPos * 6.1 - uTime*0.03);

        // Marbled-agate striation, modulated by the relief for organic layering.
        float bands = sin(vPos.y*6.0 + relief*4.0 + uTime*0.5)*0.5 + sin(vPos.x*4.0 + relief2*3.0)*0.3 + sin(vPos.z*5.0)*0.2;
        bands = smoothstep(0.1, 0.9, bands);

        // THIN-FILM IRIDESCENCE — phase drifts with relief + fresnel + uTime + per-archetype offset.
        float irPhase = relief*2.4 + fres*3.0 + uTime*0.35 + vRefBand*1.3;
        vec3 iris = 0.5 + 0.5*cos(6.2831853*(vec3(1.0,0.85,0.7)*irPhase + vec3(0.0,0.33,0.67)));

        // Build the skin: dark body → coloured striation, faceted crests lifted, iridescent rim/crests.
        vec3 body = mix(color*0.22, color*1.15 + vec3(0.25,0.1,0.2), bands);
        body += color * facet * 0.4;                                 // crystalline crest highlight
        body = mix(body, body + iris*0.5, fres*0.6 + facet*0.25);    // iridescence on crests + rim

        // SUBSURFACE warm glow deep in the grooves (inverse fresnel × low relief) — translucent depth.
        float groove = (1.0 - fres) * (1.0 - relief);
        body += vec3(0.5, 0.22, 0.12) * groove * 0.28;

        // Reference-image skin (the 5 owner refs) blended in — keeps the art-direction tie.
        float band = clamp(floor(vRefBand + 0.5), 0.0, 4.0);
        vec2 refUv = vec2((band + fract(vUv.x*1.65 + uTime*0.018)) / 5.0, fract(vUv.y*0.85 + uTime*0.011));
        vec3 refSkin = texture2D(uRefAtlas, refUv).rgb;
        vec3 finalColor = mix(body, refSkin*(0.5 + fres*0.7) + color*0.3, 0.34);

        // Rim shimmer + deepened crevices for silhouette contrast (structured, rim-lit read).
        finalColor += iris * fres * 0.35 * (0.6 + 0.4*sin(uTime*1.2 + vPos.z*3.0));
        float crevice = smoothstep(0.0, 0.4, length(vPos));
        finalColor *= crevice * 0.82;

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    this.mat = new THREE.ShaderMaterial({
      vertexShader: pantheonVert,
      fragmentShader: pantheonFrag,
      uniforms: { uTime: { value: 0 }, uRefAtlas: { value: this.refAtlas } },
      transparent: false,
      blending: THREE.NormalBlending,
      depthWrite: true,
    });

    if (typeof document !== 'undefined') {
      new THREE.TextureLoader().load(PANTHEON_REF_ATLAS_URL, (tex) => {
        if (this.disposed) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        const old = this.refAtlas;
        this.refAtlas = tex;
        this.mat.uniforms.uRefAtlas!.value = tex;
        old.dispose();
      });
    }

    // First pass: bucket archetypes by unique wild-geometry key (≈100 distinct silhouettes).
    const bucketMap = new Map<string, AlphabetArchetype[]>();
    for (const a of ALPHABET_ROSTER) {
      const sig = glyphExteriorSignature(a);
      const key = glyphGeoBucketKey(a, sig);
      const list = bucketMap.get(key);
      if (list) list.push(a);
      else bucketMap.set(key, [a]);
    }

    const golden = Math.PI * (3 - Math.sqrt(5));
    const n = ALPHABET_ROSTER.length; // 100

    // One InstancedMesh per unique geometry bucket — parametric insanity per letter seed.
    for (const [, members] of bucketMap) {
      const sample = members[0]!;
      const sampleSig = glyphExteriorSignature(sample);
      const geo = glyphBodyGeometry(sample, sampleSig);
      const mesh = new THREE.InstancedMesh(geo, this.mat, members.length);
      mesh.frustumCulled = false;
      const list: Body[] = [];
      const refBands = new Float32Array(members.length);
      for (let s = 0; s < members.length; s++) {
        const a = members[s]!;
        const b = a.bias;
        const i = a.index;
        const y = 0.12 + (i / (n - 1)) * 0.86;
        // USER #10: spread anchors across the FULL box arena (25%..100% of the land radius, ground..
        // monolith height) instead of a narrow overhead hemisphere, so godforms fill the whole diorama.
        const ringR = (0.25 + 0.75 * ((i * 0.61803) % 1)) * ARENA_HALF;
        const th = golden * i;
        const ax = Math.cos(th) * ringR;
        const az = Math.sin(th) * ringR;
        const ay = ARENA_FLOOR + y * (ARENA_CEIL - ARENA_FLOOR);
        const baseScale =
          (6 + 14 * (0.5 * b.empowerment + 0.3 * b.order + 0.2 * b.generative)) * 1.55;
        const freq = 0.07 + ((a.seed % 600) / 600) * 0.22;
        const phase = ((a.seed >>> 7) % 6283) / 1000;
        const spin = 0.045 + b.chaos * 0.22;
        const pulse = 0.09 + b.curiosity * 0.22;
        const sig = glyphExteriorSignature(a);
        const pal = glyphExteriorPalette(a);
        refBands[s] = GLYPH_PALETTE_IDS.indexOf(pal.id);
        const geoKey = glyphGeoBucketKey(a, sig);
        list.push({
          ax,
          ay,
          az,
          baseScale,
          freq,
          phase,
          spin,
          pulse,
          hue: pal.bodyHue,
          sat: pal.bodySat,
          light: pal.bodyLit,
          gIdx: i,
          sig,
          pal,
          geoKey,
          poolSlot: s,
        });

        C.setHSL(pal.bodyHue, pal.bodySat, pal.bodyLit);
        mesh.setColorAt(s, C);
        P.set(ax, ay, az);
        Q.identity();
        S.setScalar(baseScale);
        M.compose(P, Q, S);
        mesh.setMatrixAt(s, M);
      }
      mesh.geometry.setAttribute('refBand', new THREE.InstancedBufferAttribute(refBands, 1));
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      this.group.add(mesh);
      this.meshes.push(mesh);
      this.bodies.push(list);
    }

    this.wireHalos.push(...attachGlyphWireHalos(this.group, this.meshes));
    this.setWireHalosVisible(false); // USER #10: skins only — wire halos for VISION·wire debug
    this.glyphAccents = new GlyphAccentMotes(this.group, 100);
    this.glyphFilaments = new GlyphFilamentBurst(this.group, 100);
    this.glyphSpores = new GlyphSporeAura(this.group, 100);

    // #101 APEX ABOMINATION — physical exterior: tesseract cage + nebula + filaments.
    const apexVert = `
      varying vec2 vUv;
      varying vec3 vPos;
      varying vec3 vNormal;
      varying vec3 vViewPos;
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
        vUv = uv;
        vNormal = normal;

        // Tesseract / cage-like spatial warping: the apex is a folding 4D shadow.
        vec3 displaced = position;
        float t = uTime;
        float n1 = noise(position.xy * 1.5 + t * 0.2);
        float n2 = noise(position.yz * 1.5 - t * 0.15);
        float warp = sin(position.x * 8.0 + t * 3.0) * cos(position.y * 8.0 - t * 2.0) * 0.25;
        float cage = sin(position.x * 5.0 + position.y * 5.0 + position.z * 5.0 + t * 1.5) * 0.18;
        displaced += normal * (warp + cage + (n1 + n2) * 0.25);

        vPos = displaced;
        vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
        vViewPos = mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const apexFrag = `
      varying vec2 vUv;
      varying vec3 vPos;
      varying vec3 vNormal;
      varying vec3 vViewPos;
      uniform float uTime;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }

      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }

      void main() {
        float t = uTime;

        // Deep lava flow with multiple frequencies.
        float flow1 = sin(vPos.y * 15.0 + t * 4.0) * sin(vPos.x * 15.0 - t * 3.0);
        float flow2 = cos(vPos.z * 12.0 + t * 2.5) * sin(vPos.x * 10.0 + t * 2.0);
        vec3 lavaA = vec3(0.9, 0.0, 0.25);
        vec3 lavaB = vec3(1.0, 0.55, 0.0);
        vec3 lavaC = vec3(0.6, 0.0, 0.45);
        vec3 lavaColor = mix(mix(lavaA, lavaB, flow1 * 0.5 + 0.5), lavaC, flow2 * 0.3 + 0.3);

        // Deflectixive oil-spill fresnel rim.
        vec3 n = normalize(vNormal);
        vec3 v = normalize(-vViewPos);
        float fresnel = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.5);
        vec3 oil = hsv2rgb(vec3(fract(t * 0.04 + vPos.z * 0.2), 0.85, 0.55)) * fresnel;

        // Noise grain shimmer.
        float n0 = noise(vUv * 40.0 + t * 3.0);
        float n1 = noise(vUv * 60.0 - t * 2.0);
        vec3 shimmer = vec3(0.4, 0.8, 1.0) * (n0 + n1) * 0.5;

        // Spark cataracts / waste products.
        float spark = step(0.95, n0) * step(0.88, n1);
        float spark2 = step(0.97, fract(n1 * t * 8.0));
        vec3 sparks = vec3(1.0, 0.9, 0.7) * spark + vec3(1.0, 0.2, 0.5) * spark2;

        // Dark dimensional cracks.
        float crack = smoothstep(0.35, 0.0, sin(vPos.x * 25.0 + t) * cos(vPos.y * 25.0 - t * 1.3));

        // USER: THIS is the "101st apex still white" — the lava core summed (lava + oil + bright-blue
        // shimmer + white sparks), ADDITIVE at 0.96 alpha, on a mesh scaled 22× → a blinding white/yellow
        // blob. Keep the coloured lava, but cut the whitest terms (shimmer/sparks) and scale the whole
        // additive output + alpha down HARD → a rich coloured core, not a white sear.
        vec3 finalColor = lavaColor + oil * 0.6 + shimmer * 0.3 + sparks * 0.4;
        finalColor *= 1.0 - crack * 0.45;

        gl_FragColor = vec4(finalColor * 0.5, 0.55);
      }
    `;

    const apexMat = new THREE.ShaderMaterial({
      vertexShader: apexVert,
      fragmentShader: apexFrag,
      uniforms: { uTime: { value: 0 } },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Fallbacks for secondary elements. USER: the 101st APEX ABOMINATION was a blinding WHITE blob — its
    // 4 big additive layers summed white. Opacities cut hard (per-frame colours also darkened below) so it
    // reads as a COLOURED, dynamic structure, not a white sear.
    const apexHaloMat = new THREE.MeshBasicMaterial({
      color: 0x6a00ff,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const spikeMat = new THREE.MeshBasicMaterial({
      color: 0x00ffd5,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Hyper-detailed geometries for the Apex
    this.apexCore = new THREE.Mesh(new THREE.TorusKnotGeometry(1.4, 0.42, 512, 64, 2, 5), apexMat);
    this.apexHalo = new THREE.Mesh(new THREE.IcosahedronGeometry(2.8, 8), apexHaloMat);
    this.apexSpikes = new THREE.Mesh(new THREE.OctahedronGeometry(1.9, 4), spikeMat);
    // V104: additional alien geometry — warped inner core + dimensional shell
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xff00aa,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const shellMat = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      wireframe: true,
    });
    this.apexInner = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 0), innerMat);
    this.apexShell = new THREE.Mesh(new THREE.TetrahedronGeometry(3.8, 0), shellMat);
    this.apexGroup.position.set(0, DOME_R * 0.88, 0);
    this.apexGroup.add(
      this.apexShell,
      this.apexHalo,
      this.apexSpikes,
      this.apexCore,
      this.apexInner,
    );
    this.group.add(this.apexGroup);
    this.apexExterior = new ApexExteriorAbomination(this.apexGroup);

    scene.add(this.group);
  }

  /** Tsotchke corpus pulse — drives exterior hue/quantum rim (read-only). */
  setTsotchkePulse(pulse: TsotchkeQuantumPulse): void {
    this.tsotchkePulse = pulse;
  }

  /** Apex ς mind projection for exterior intensity. */
  setApexExterior(transcendence: number, vitality: number): void {
    this.apexTranscendence = clamp(transcendence, 0, 1);
    this.apexVitality = clamp(vitality, 0, 1);
  }

  /** Reactive coupling: feed world chaos (0..1) to quicken the whole swarm. Read-only projection. */
  setChaos(c: number): void {
    this.chaos = clamp(c, 0, 1);
  }

  /**
   * Feed per-creature brain activity from {@link GlyphBrainBatch} to modulate visual appearance.
   * Activity drives pulse intensity, novelty drives hue shimmer, valence drives hue rotation.
   * Visual-only — does not affect world state.
   */
  setBrainActivity(activity: Float32Array, novelty: Float32Array, valence: Float32Array): void {
    this.brainActivity = activity;
    this.brainNovelty = novelty;
    this.brainValence = valence;
  }

  /**
   * Feed glyph-brain motor outputs for visual-only travel/orbit (no world physics).
   * Each snapshot's motor vec4 drives horizontal drift + vertical bob amplitude.
   */
  setBrainMotors(motors: ReadonlyArray<{ motor: Float32Array }>): void {
    const n = Math.min(motors.length, 100);
    for (let i = 0; i < n; i++) {
      const m = motors[i]!.motor;
      this.motorX[i] = m[0] ?? 0;
      this.motorY[i] = m[1] ?? 0;
      this.motorZ[i] = m[2] ?? 0;
    }
  }

  /** Toggle diagnostic wire halos (solid skins are the default; wire mode only). */
  setWireHalosVisible(show: boolean): void {
    for (const h of this.wireHalos) h.visible = show;
  }

  /** Bob / spin / pulse every body on its own cadence. Pure trig, allocation-free, no rng. */
  update(t: number, dt?: number): void {
    // V111: slow pantheon travel to creature-scale motion; they should read as living bodies.
    const scaledDt = dt !== undefined ? dt * 0.22 : undefined;
    const clock = scaledDt === undefined ? t * 0.22 : (this.localT += Math.max(0, scaledDt));
    if (dt !== undefined && dt <= 0) return; // frozen when paused
    if (this.mat instanceof THREE.ShaderMaterial) {
      const uTime = this.mat.uniforms.uTime;
      if (uTime) uTime.value = clock;
    }
    // V109: pantheon is stately — slower base drift, but still quickens with chaos and apex presence.
    // Reduced by another 50% as requested so they can be easily inspected.
    const slowT = clock * CREATURE_EXTERIOR_TIME_SCALE * 0.275;
    const quick = 0.5 + 0.6 * this.chaos + 0.25 * this.apexTranscendence + 0.15 * this.apexVitality;
    // Containment (user #10): each godform may drift only a little from its dome anchor, and never
    // below the ground plane. Because every anchor already lies inside the dome shell, a bounded
    // tether GUARANTEES no godform ever leaves the dome or sinks underneath it — and the small cap
    // also reads as slow, inspectable, creature-scale motion instead of fast cross-dome travel.
    for (let pool = 0; pool < this.meshes.length; pool++) {
      const mesh = this.meshes[pool]!;
      const halo = this.wireHalos[pool];
      const list = this.bodies[pool]!;
      for (let s = 0; s < list.length; s++) {
        const b = list[s]!;
        const ph =
          slowT * b.freq * quick * (1 + (this.brainActivity?.[b.gIdx] ?? 0) * 0.35) + b.phase;
        const ba = this.brainActivity?.[b.gIdx] ?? 0;
        const bn = this.brainNovelty?.[b.gIdx] ?? 0;
        const bv = this.brainValence?.[b.gIdx] ?? 0;
        const brainPulse = 1 + ba * 0.95 + bn * 0.35;
        const mx = this.motorX[b.gIdx] ?? 0;
        const my = this.motorY[b.gIdx] ?? 0;
        const mz = this.motorZ[b.gIdx] ?? 0;
        // USER: the pantheons were "stuck in a bubble doing a loop". ROOT CAUSE: their travel was slowed to
        // ~6% (the 0.22× travel scale × 0.275 slowT "inspectability" cuts), so a full roam orbited only
        // every ~5 MINUTES. Now they TRAVEL like the entities/NHI — each crosses the whole ±ARENA_HALF
        // platform in ~20-25s along a non-repeating Lissajous, and its GlyphBRAIN motor output (mx/my/mz)
        // STEERS the waypoint (goal-seeking locomotion, not decoration) — so where it goes is driven by its
        // mind. The stately body spin/pulse still uses the slowed slowT below. Pure trig of (clock, brain,
        // phase, gIdx) — no rng. The hard clamp further down keeps each on the platform + below the mecha.
        // USER: the last pass made them travel TOO FAST/choppy — slow it right down for a GRACEFUL, fluid
        // glide (~half speed, crossing the platform in ~35-45s), while the rich body dynamism below spins/
        // corkscrews/vibrates them. Travel is a smooth curved Lissajous, brain-steered.
        const rt = clock * 2.0; // gentler locomotion clock (was 4.545)
        const roamDrift = rt * (0.18 + 0.09 * this.chaos) + b.phase * 1.7;
        const roamRad = 210 + (b.gIdx % 7) * 48; // 210..498 — sweeps to the platform rim
        // Curved travel: a slow secondary drift bends the path so it never reads as a plain circle.
        const bend = Math.sin(rt * 0.11 + b.phase * 0.7) * 0.55;
        const aTx = Math.cos(roamDrift + bend) * roamRad + mx * 300; // brain motor STEERS the travel goal (±300)
        const aTz = Math.sin(roamDrift * 1.21 + b.phase - bend) * roamRad + mz * 300;
        const aTy = 120 + Math.sin(roamDrift * 0.63) * 92 + my * 70; // roams the full 6..240 column
        const wander = glyphWanderOffset(WANDER, ph, b.sig, mx, my, mz, this.chaos, ba);
        P.set(aTx + wander.x, aTy + wander.y, aTz + wander.z);

        // USER #10 (corrected V115): tether every godform to ITS OWN dome anchor so it can never
        // leave the shell. The prior ring-clamp forced horiz into a fixed outer ring, which
        // shoved the inner/upper anchors (horiz as low as ~0.2·DOME_R) OUTWARD onto that ring —
        // flinging them past the dome sphere — and let y sink to -20 (under the ground). Bounding
        // the displacement from the anchor keeps them contained AND slow/inspectable.
        // USER: clamp to the SQUARE platform box — per-axis horizontal to the platform edge (ARENA_HALF)
        // and vertical ground..mechalogodrom-height (ARENA_FLOOR..ARENA_CEIL). Per-axis (not radial) so
        // godforms fill the whole SQUARE platform out to its edges/corners, never outside it and never
        // above the mechalogodrom.
        if (P.y < ARENA_FLOOR) P.y = ARENA_FLOOR;
        else if (P.y > ARENA_CEIL) P.y = ARENA_CEIL;
        if (P.x > ARENA_HALF) P.x = ARENA_HALF;
        else if (P.x < -ARENA_HALF) P.x = -ARENA_HALF;
        if (P.z > ARENA_HALF) P.z = ARENA_HALF;
        else if (P.z < -ARENA_HALF) P.z = -ARENA_HALF;
        // USER: ENDLESS DYNAMISM — each godform corkscrews on all 3 axes (per-body rate + direction),
        // tumbles/curves/inverts, and vibrates, driven by its brain + rhythm. Not a gentle bob. Pure trig.
        const cork = slowT * (0.55 + (b.gIdx % 5) * 0.22) * quick; // continuous corkscrew, per-body tempo
        const cdir = b.gIdx % 2 === 0 ? 1 : -1; // half spin CW, half CCW
        const vib = Math.sin(ph * 9.0 + b.gIdx) * 0.05 * (0.5 + ba); // high-freq vibration
        E.set(
          cork * cdir + Math.sin(ph * 0.42 + mx + b.sig.rotBias) * (0.6 + ba * 0.6) + vib,
          slowT * b.spin * quick * (1 + ba * 0.62) + b.phase + mz * 0.36 + cork * 0.7,
          -cork * (b.gIdx % 3 === 0 ? 0.5 : cdir * 0.4) +
            Math.cos(ph * 0.38 + mz + b.sig.rotBias * 0.5) * (0.55 + bn * 0.6) +
            vib,
        );
        Q.setFromEuler(E);
        const warpSpike = ba > 0.72 && Math.sin(ph * 7.0 + b.sig.rotBias) > 0.55 ? 1.22 : 1;
        // Richer MORPH — anisotropic non-uniform pulse per axis (each axis breathes on its own beat) so
        // the body visibly mutates/warps, not just uniformly scales.
        const sx =
          b.sig.scaleX * (1 + b.pulse * Math.sin(ph * 1.2) * brainPulse * 0.26) * warpSpike;
        const sy = b.sig.scaleY * (1 + b.pulse * Math.sin(ph * 1.4 + 2.1) * brainPulse * 0.26);
        const sz =
          (b.sig.scaleZ * (1 + b.pulse * Math.cos(ph * 1.1 + 4.2) * brainPulse * 0.26)) / warpSpike;
        S.set(b.baseScale * sx, b.baseScale * sy, b.baseScale * sz);
        M.compose(P, Q, S);
        mesh.setMatrixAt(s, M);
        const hueShift =
          Math.sin(ph * 0.22) * 0.14 +
          slowT * 0.0012 * b.spin +
          bn * 0.18 * bv +
          b.sig.hueOffset * 0.5 +
          this.apexTranscendence * 0.06 * Math.sin(ph * 0.11 + b.gIdx * 0.1);
        const hue = (b.pal.bodyHue + hueShift + b.pal.diagramHue * bn * 0.26) % 1;
        const litBoost = ba * 0.32 + bn * 0.18 + b.pal.filamentLit * 0.22 * ba + this.chaos * 0.08;
        const lit = b.pal.bodyLit + 0.18 * Math.sin(ph * 1.8) + litBoost;
        C.setHSL(
          hue < 0 ? hue + 1 : hue,
          Math.min(1, b.pal.bodySat + bn * 0.1),
          clamp(lit, 0.22, 0.62),
        );
        mesh.setColorAt(s, C);
        this.glyphAccents.setAt(b.gIdx, M, b.sig, ba, clock);
        this.glyphFilaments.setAt(b.gIdx, M, b.pal.filamentHue, b.sig, ba, clock);
        this.glyphSpores.setAt(b.gIdx, M, b.pal.sporeHue, b.sig, ba, clock);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      this.glyphAccents.finish();
      this.glyphFilaments.finish();
      this.glyphSpores.finish();
      if (halo) syncGlyphWireHalos(mesh, halo, this.brainActivity, list);
    }
    const w =
      1 +
      0.9 * this.chaos +
      0.45 * this.apexTranscendence +
      0.28 * this.apexVitality +
      0.25 * this.tsotchkePulse.quakeAliveness;
    // USER: the apex BODY was glacially slow (rotation ~minutes) — it should be VERY MOBILE. ~26× faster
    // so its core/halo/spikes spin + pulse lively (its travel roams separately below).
    const ph = slowT * 2.4 * w;
    // USER: the 101st apex was PINNED near centre (a tiny ~70u wobble) → "stuck in a bubble". Now it ROAMS
    // the full ±ARENA_HALF platform like the other creatures, at near real sim time (not the 6% slowdown)
    // so it visibly TRAVELS, hard-clamped to the platform + below the mechalogodrom. Pure trig — no rng.
    const rtA = clock * 4.545; // ≈ real sim seconds
    const roamDriftA = rtA * 0.22 + this.tsotchkePulse.qgtVolume * 2.0;
    const roamRadA = 260 + 130 * Math.sin(rtA * 0.045); // 130..390 from centre
    let apX = Math.cos(roamDriftA) * roamRadA;
    let apY = 132 + Math.sin(roamDriftA * 0.63) * 82; // ~50..214 of the column
    let apZ = Math.sin(roamDriftA * 1.19) * roamRadA;
    if (apX > ARENA_HALF) apX = ARENA_HALF;
    else if (apX < -ARENA_HALF) apX = -ARENA_HALF;
    if (apZ > ARENA_HALF) apZ = ARENA_HALF;
    else if (apZ < -ARENA_HALF) apZ = -ARENA_HALF;
    if (apY > ARENA_CEIL) apY = ARENA_CEIL;
    else if (apY < ARENA_FLOOR) apY = ARENA_FLOOR;
    this.apexGroup.position.set(apX, apY, apZ);
    this.apexCore.rotation.set(ph * 0.45, ph * 0.32, ph * 0.58);
    this.apexHalo.rotation.set(-ph * 0.22, ph * 0.38, ph * 0.16);
    this.apexSpikes.rotation.set(ph * 0.72, -ph * 0.48, ph * 0.28);
    this.apexInner.rotation.set(ph * 0.95, -ph * 0.65, ph * 1.1);
    if (this.apexCore.material instanceof THREE.ShaderMaterial) {
      const uTime = this.apexCore.material.uniforms.uTime;
      if (uTime) uTime.value = clock;
    }
    this.apexInner.scale.setScalar(10 * (1 + 0.22 * Math.sin(ph * 4.5)));
    this.apexShell.rotation.set(-ph * 0.14, ph * 0.24, -ph * 0.1);
    this.apexShell.scale.setScalar(20 * (1 + 0.1 * Math.cos(ph * 2.2)));
    C.setHSL((0.88 + Math.sin(ph * 1.5) * 0.12) % 1, 1, 0.34); // USER: darker (was 0.5) — less white sum
    (this.apexInner.material as THREE.MeshBasicMaterial).color.copy(C);
    C.setHSL((0.58 + Math.cos(ph * 0.8) * 0.15) % 1, 0.9, 0.32);
    (this.apexShell.material as THREE.MeshBasicMaterial).color.copy(C);
    const pulse = 1 + 0.22 * Math.sin(ph * 3.7) + 0.08 * Math.sin(ph * 11.3);
    this.apexCore.scale.setScalar(22 * pulse);
    this.apexHalo.scale.setScalar(14 * (1 + 0.12 * Math.sin(ph * 2.9)));
    this.apexSpikes.scale.setScalar(18 * (1 + 0.15 * Math.cos(ph * 5.1)));
    C.setHSL((0.92 + Math.sin(ph * 0.7) * 0.08) % 1, 1, 0.52);
    // apexCore is now a ShaderMaterial so we don't copy color directly
    C.setHSL((0.72 + Math.cos(ph * 0.5) * 0.12) % 1, 1, 0.34);
    (this.apexHalo.material as THREE.MeshBasicMaterial).color.copy(C);
    C.setHSL((0.55 + Math.sin(ph * 1.2) * 0.15) % 1, 0.92, 0.3);
    (this.apexSpikes.material as THREE.MeshBasicMaterial).color.copy(C);
    this.apexExterior.update(clock, this.apexTranscendence, this.apexVitality, this.tsotchkePulse);
  }

  /** Total letter archetypes rendered (100). Apex #101 is a separate capstone mesh. */
  get count(): number {
    let n = 0;
    for (const l of this.bodies) n += l.length;
    return n;
  }

  /** The APEX ABOMINATION capstone (#101) is present above the 100-letter pantheon. */
  get hasApexCapstone(): boolean {
    return true;
  }

  /** Free every pool geometry + the shared material (HMR / world-reset safe). */
  dispose(): void {
    this.disposed = true;
    for (const m of this.meshes) {
      m.geometry.dispose();
      m.dispose();
    }
    this.mat.dispose();
    this.refAtlas.dispose();
    this.apexCore.geometry.dispose();
    this.apexHalo.geometry.dispose();
    this.apexSpikes.geometry.dispose();
    this.apexInner.geometry.dispose();
    this.apexShell.geometry.dispose();
    (this.apexCore.material as THREE.Material).dispose();
    (this.apexHalo.material as THREE.Material).dispose();
    (this.apexSpikes.material as THREE.Material).dispose();
    (this.apexInner.material as THREE.Material).dispose();
    (this.apexShell.material as THREE.Material).dispose();
    for (const h of this.wireHalos) {
      h.geometry.dispose();
      (h.material as THREE.Material).dispose();
    }
    this.glyphAccents.dispose();
    this.glyphFilaments.dispose();
    this.glyphSpores.dispose();
    this.apexExterior.dispose();
    disposeGlyphGeometryCache();
    this.group.removeFromParent();
  }
}

// Embedded GLSL for the native reliquary raymarcher. Kept as raw-string literals so
// the executable is self-contained (no runtime shader files to locate). GLSL 3.30 core.
#pragma once

// Fullscreen triangle generated from gl_VertexID — no VBO needed.
inline const char* kVertexSrc = R"GLSL(
#version 330 core
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
)GLSL";

// The reliquary: a ray-marched plate of ornate NHI specimens on the void. Every
// surface is pure SDF math carved with fBm filigree; lit with soft shadows, AO,
// amber subsurface translucency, and thin-film iridescence. Real f(p, view, time).
inline const char* kFragmentSrc = R"GLSL(
#version 330 core
out vec4 FragColor;
in vec2 vUv;

uniform vec2  uResolution;
uniform float uTime;
uniform vec3  uCamPos;
uniform vec3  uCamTarget;
uniform float uFov;       // vertical fov, radians
uniform float uBass;      // 0..1 audio-reactive pulse (host-driven; 0 if silent)
uniform float uHero;      // >0.5 = single hero specimen, else the full plate

const float PI  = 3.14159265359;
const float TAU = 6.28318530718;
const int   MARCH_STEPS = 160;
const float MAX_DIST = 60.0;
const float SURF_EPS = 0.0006;

// ── hash / value noise / fbm ──────────────────────────────────────────────────
float hash11(float p){ p = fract(p*0.1031); p *= p+33.33; p *= p+p; return fract(p); }
float hash13(vec3 p){
  p = fract(p*0.1031); p += dot(p, p.yzx+33.33); return fract((p.x+p.y)*p.z);
}
vec3 hash33(vec3 p){
  p = vec3(dot(p,vec3(127.1,311.7,74.7)), dot(p,vec3(269.5,183.3,246.1)), dot(p,vec3(113.5,271.9,124.6)));
  return fract(sin(p)*43758.5453);
}
float vnoise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hash13(i+vec3(0,0,0)),hash13(i+vec3(1,0,0)),f.x),
                 mix(hash13(i+vec3(0,1,0)),hash13(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash13(i+vec3(0,0,1)),hash13(i+vec3(1,0,1)),f.x),
                 mix(hash13(i+vec3(0,1,1)),hash13(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p){
  float a=0.5, s=0.0; mat3 m = mat3(0.0,0.8,0.6,-0.8,0.36,-0.48,-0.6,-0.48,0.64);
  for(int i=0;i<4;i++){ s += a*vnoise(p); p = m*p*2.02; a*=0.5; } return s;
}

mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }

// ── SDF primitives ────────────────────────────────────────────────────────────
float sdSphere(vec3 p, float r){ return length(p)-r; }
float sdTorus(vec3 p, vec2 t){ vec2 q=vec2(length(p.xz)-t.x,p.y); return length(q)-t.y; }
float sdBox(vec3 p, vec3 b){ vec3 q=abs(p)-b; return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0); }
float sdOcta(vec3 p, float s){ p=abs(p); return (p.x+p.y+p.z-s)*0.57735027; }
float sdCappedCyl(vec3 p, float h, float r){
  vec2 d = abs(vec2(length(p.xz),p.y)) - vec2(r,h);
  return min(max(d.x,d.y),0.0)+length(max(d,0.0));
}
float smin(float a, float b, float k){ float h=clamp(0.5+0.5*(b-a)/k,0.0,1.0); return mix(b,a,h)-k*h*(1.0-h); }

// ── specimen SDFs (id 0..6) — each carved with fBm relief ─────────────────────
// Returns distance; sets `gAlbedo`, `gRough`, `gTrans` via globals at shading time.
float specimen(vec3 p, int id, float t){
  float d;
  if(id==0){
    // URCHIN: sphere bristling with radial spikes via spherical-angle modulation.
    float r = length(p);
    vec3 n = p/max(r,1e-4);
    float th = acos(clamp(n.y,-1.0,1.0));
    float ph = atan(n.z,n.x);
    float spikes = pow(0.5+0.5*cos(ph*14.0)*sin(th*12.0), 6.0);
    d = r - (0.55 + spikes*0.42);
    d -= (fbm(p*8.0)-0.5)*0.03;
  } else if(id==1){
    // OMEGA RING: a torus opened into an Ω by carving a wedge + two feet.
    vec3 q=p; q.xy=rot(0.0)*q.xy;
    float ring = sdTorus(q, vec2(0.6,0.16));
    float wedge = sdBox(q-vec3(0.0,-0.7,0.0), vec3(0.22,0.35,0.4));
    float feet = min(sdSphere(q-vec3(-0.55,-0.6,0.0),0.16), sdSphere(q-vec3(0.55,-0.6,0.0),0.16));
    d = max(ring, -wedge);
    d = min(d, feet);
    d -= (fbm(p*7.0+t*0.05)-0.5)*0.02;
  } else if(id==2){
    // RIBBED DISC: a flattened torus engraved with strong angular ribs.
    float disc = sdTorus(p.xzy, vec2(0.55,0.22));
    float ang = atan(p.z,p.x);
    disc -= 0.05*pow(0.5+0.5*cos(ang*22.0),2.0);
    d = disc - (fbm(p*9.0)-0.5)*0.025;
  } else if(id==3){
    // SPINDLE: a bipyramid (two octahedra) stretched on Y, fbm-roughened.
    vec3 q=p; q.y*=0.6;
    d = sdOcta(q, 0.85)*1.0;
    d -= (fbm(p*7.0)-0.5)*0.05;
  } else if(id==4){
    // STAR: intersected stretched boxes forming a six-point star, beveled.
    float a = sdBox(p, vec3(0.9,0.16,0.16));
    vec3 q1=p; q1.xz=rot(PI/3.0)*q1.xz; float b=sdBox(q1, vec3(0.9,0.16,0.16));
    vec3 q2=p; q2.xz=rot(-PI/3.0)*q2.xz; float c=sdBox(q2, vec3(0.9,0.16,0.16));
    d = min(a,min(b,c));
    d = smin(d, sdSphere(p,0.3), 0.15);
    d -= (fbm(p*8.0)-0.5)*0.02;
  } else if(id==5){
    // PEARL: a near-smooth marble sphere with faint veined relief.
    d = sdSphere(p,0.78);
    d -= (fbm(p*4.0)-0.5)*0.06;
    d -= (fbm(p*16.0)-0.5)*0.01;
  } else {
    // DIATOM LATTICE: a rounded box drilled with a repeating hole grid (shell).
    float shell = abs(sdBox(p, vec3(0.7))) - 0.04;
    vec3 g = abs(fract(p*3.0)-0.5);
    float holes = (min(min(g.x,g.y),g.z))/3.0 - 0.06;
    d = max(shell, -holes);
    d -= (fbm(p*10.0)-0.5)*0.015;
  }
  return d;
}

// Per-cell variety for the plate. cell -> id/rot/scale/phase.
struct Cell { int id; float scl; float rotY; float hue; float phase; };
Cell cellInfo(vec2 c){
  vec3 h = hash33(vec3(c, 7.3));
  Cell o;
  o.id   = int(floor(h.x*7.0));
  o.scl  = 0.75 + h.y*0.5;
  o.rotY = h.z*TAU;
  o.hue  = fract(h.x*3.0 + h.z*0.5);
  o.phase= h.y*TAU;
  return o;
}

// Globals carrying the shaded specimen's material to the lighting stage.
vec3  gAlbedo; float gRough; float gTrans;

float map(vec3 p){
  if(uHero > 0.5){
    // Single hero specimen, slowly rotating, centred at origin.
    vec3 q = p;
    q.xz = rot(uTime*0.3) * q.xz;
    int id = int(mod(floor(uTime/6.0), 7.0));
    return specimen(q/1.6, id, uTime)*1.6;
  }
  // PLATE: domain-repeat on the XZ plane, one specimen per cell, floating at y≈0.
  const float CELL = 2.4;
  vec2 cid = round(p.xz / CELL);
  vec2 cc  = cid * CELL;
  Cell info = cellInfo(cid);
  vec3 q = p - vec3(cc.x, sin(uTime*0.6 + info.phase)*0.12, cc.y);
  q.xz = rot(info.rotY + uTime*0.15) * q.xz;
  q.xy = rot(sin(uTime*0.2 + info.phase)*0.25) * q.xy;
  float s = info.scl * (1.0 + 0.05*uBass);
  return specimen(q/s, info.id, uTime) * s;
}

// Material for the point p (re-derives the cell so colours match the plate).
void materialAt(vec3 p){
  float hue; int id;
  if(uHero > 0.5){ id = int(mod(floor(uTime/6.0),7.0)); hue = fract(uTime*0.03); }
  else { const float CELL=2.4; vec2 cid=round(p.xz/CELL); Cell info=cellInfo(cid); hue=info.hue; id=info.id; }
  // Palette: amber / pearl / violet / cyan jewels keyed off the cell hue.
  vec3 a = 0.5 + 0.5*cos(TAU*(hue + vec3(0.0,0.12,0.30)) + vec3(0.0,0.6,1.1));
  a = mix(a, vec3(0.95,0.78,0.5), 0.25);            // bias warm/amber
  if(id==5) a = mix(vec3(0.92,0.9,0.95), a, 0.25);  // pearl reads pale
  gAlbedo = a;
  gRough  = (id==5) ? 0.18 : 0.32;                  // pearls glossier
  gTrans  = (id==0||id==5||id==6) ? 0.9 : 0.55;     // urchin/pearl/lattice translucent
}

vec3 calcNormal(vec3 p){
  const vec2 e = vec2(1.0,-1.0)*0.0007;
  return normalize(e.xyy*map(p+e.xyy) + e.yyx*map(p+e.yyx) + e.yxy*map(p+e.yxy) + e.xxx*map(p+e.xxx));
}

float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k){
  float res=1.0, t=mint;
  for(int i=0;i<48;i++){
    float h = map(ro + rd*t);
    if(h<0.0008) return 0.0;
    res = min(res, k*h/t);
    t += clamp(h, 0.01, 0.5);
    if(t>maxt) break;
  }
  return clamp(res, 0.0, 1.0);
}

float calcAO(vec3 p, vec3 n){
  float occ=0.0, sca=1.0;
  for(int i=0;i<5;i++){
    float hr = 0.01 + 0.14*float(i)/4.0;
    float dd = map(p + n*hr);
    occ += (hr-dd)*sca; sca*=0.7;
  }
  return clamp(1.0 - 2.5*occ, 0.0, 1.0);
}

// Thickness estimate for subsurface: march a short way along -normal into the body.
float thickness(vec3 p, vec3 n){
  float t=0.02, acc=0.0;
  for(int i=0;i<6;i++){ acc += max(0.0,-map(p - n*t)); t += 0.06; }
  return clamp(acc*1.5, 0.0, 1.0);
}

// GGX specular (compact).
float specGGX(vec3 n, vec3 v, vec3 l, float rough){
  vec3 h = normalize(v+l);
  float a = rough*rough;
  float nh = max(dot(n,h),0.0);
  float d = a*a / (PI*pow(nh*nh*(a*a-1.0)+1.0, 2.0)+1e-5);
  float nl = max(dot(n,l),0.0), nv=max(dot(n,v),0.0);
  float k = a*0.5;
  float gv = nv/(nv*(1.0-k)+k), gl = nl/(nl*(1.0-k)+k);
  return d*gv*gl;
}

vec3 aces(vec3 x){
  const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14;
  return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0);
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*uResolution) / uResolution.y;

  // Camera basis.
  vec3 ro = uCamPos;
  vec3 fwd = normalize(uCamTarget - ro);
  vec3 rgt = normalize(cross(vec3(0,1,0), fwd));
  vec3 up  = cross(fwd, rgt);
  float f = 1.0 / tan(uFov*0.5);
  vec3 rd = normalize(uv.x*rgt + uv.y*up + f*fwd);

  // March.
  float t=0.0; bool hit=false; vec3 p=ro;
  for(int i=0;i<MARCH_STEPS;i++){
    p = ro + rd*t;
    float d = map(p);
    if(d < SURF_EPS*t + SURF_EPS){ hit=true; break; }
    t += d*0.85;
    if(t > MAX_DIST) break;
  }

  // Void background: deep indigo with a faint amber crown + drifting star dust.
  vec3 col;
  {
    float h = 0.5 + 0.5*rd.y;
    vec3 voidc = vec3(0.012,0.018,0.045);
    vec3 crown = vec3(0.20,0.12,0.05);
    col = mix(voidc, crown, smoothstep(0.55,1.0,h));
    float star = step(0.9995, hash13(floor(rd*900.0)));
    col += vec3(star)*0.6;
  }

  if(hit){
    vec3 n = calcNormal(p);
    materialAt(p);
    vec3 v = -rd;

    // Carved micro-relief perturbs the normal (filigree the lights rake).
    float rel = fbm(p*22.0);
    vec3 grad = vec3(fbm(p*22.0+vec3(0.04,0,0))-rel, fbm(p*22.0+vec3(0,0.04,0))-rel, fbm(p*22.0+vec3(0,0,0.04))-rel)/0.04;
    n = normalize(n - (grad - dot(grad,n)*n)*0.12);

    // Three coloured key lights echoing the plate palette.
    vec3 L1 = normalize(vec3( 0.7, 0.8, 0.5)); vec3 C1 = vec3(1.0,0.86,0.62)*1.5; // amber key
    vec3 L2 = normalize(vec3(-0.6, 0.3,-0.7)); vec3 C2 = vec3(0.35,0.7,0.95)*0.9;  // cyan fill
    vec3 L3 = normalize(vec3( 0.1,-0.6, 0.8)); vec3 C3 = vec3(0.9,0.35,0.75)*0.7;  // magenta rim

    float ao = calcAO(p,n);
    vec3 lit = vec3(0.0);
    #define LIGHT(L,C) { float nl=max(dot(n,L),0.0); float sh=softShadow(p+n*0.01,L,0.02,8.0,16.0); \
        lit += gAlbedo*C*nl*sh + C*specGGX(n,v,L,gRough)*sh*1.2; }
    LIGHT(L1,C1) LIGHT(L2,C2) LIGHT(L3,C3)
    lit *= ao;

    // Ambient hemispheric fill.
    lit += gAlbedo * mix(vec3(0.03,0.04,0.07), vec3(0.10,0.09,0.07), 0.5+0.5*n.y) * ao;

    // Amber subsurface translucency from the thin shell + grooves.
    float th = thickness(p,n);
    float back = pow(clamp(dot(v,-L1)*0.5+0.5,0.0,1.0), 2.0);
    lit += gAlbedo*vec3(1.7,1.0,0.55) * (1.0-th) * back * gTrans * (0.35 + 0.4*uBass);

    // Fresnel rim + thin-film interference riding it.
    float fres = pow(1.0 - max(dot(n,v),0.0), 4.0);
    vec3 film = 0.5 + 0.5*cos(TAU*(vec3(1.0,0.85,0.7)*fres*2.0 + vec3(0.0,0.18,0.36) + rel*1.4 + uTime*0.05));
    lit += film * fres * 0.6;
    lit += vec3(0.9,0.95,1.0) * pow(fres,1.5) * 0.25;

    // Distance fade into the void.
    col = mix(col, lit, exp(-t*0.012));
  }

  // Grade: ACES tonemap, gentle vignette, fine grain.
  col = aces(col*1.15);
  float vig = smoothstep(1.25, 0.3, length(uv));
  col *= mix(0.65, 1.0, vig);
  col += (hash13(vec3(gl_FragCoord.xy, uTime))-0.5)*0.02;
  col = pow(max(col,0.0), vec3(0.4545)); // linear -> sRGB
  FragColor = vec4(col, 1.0);
}
)GLSL";

// GLSL for the liquid-chrome hero. Raw WebGL2, one fullscreen triangle.
window.CHROME_VERT = `#version 300 es
void main(){
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

window.CHROME_FRAG = `#version 300 es
precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform vec4  uS[6];
uniform vec2  uMouse;
uniform vec3  uRipP;
uniform float uRipT;
uniform float uKick;
uniform int   uSteps;
out vec4 fragColor;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float smin(float a, float b, float k){
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}

float map(vec3 p){
  float d = 1e5;
  for (int i = 0; i < 6; i++) d = smin(d, length(p - uS[i].xyz) - uS[i].w, 0.85);
  float t = uTime;
  d += sin(p.x * 3.1 + t) * sin(p.y * 2.7 + t * 1.3) * sin(p.z * 3.3 + t * 0.7) * 0.035;
  // cursor ripple
  float mr = length(p.xy - uMouse);
  d += sin(mr * 9.0 - t * 5.0) * 0.012 * exp(-mr * 1.6);
  // click ripple
  float rr = length(p - uRipP);
  d += sin(rr * 7.0 - uRipT * 9.0) * 0.06 * uKick * exp(-rr * 0.45);
  return d;
}

vec3 nor(vec3 p){
  const vec2 e = vec2(1.0, -1.0) * 0.0015;
  return normalize(e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) +
                   e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx));
}

// Procedural photo studio
vec3 env(vec3 d){
  float az = atan(d.x, d.z);
  float el = asin(clamp(d.y, -1.0, 1.0));
  vec3 col = mix(vec3(0.010, 0.013, 0.030), vec3(0.030, 0.042, 0.085), smoothstep(-0.2, 0.9, el));

  // window grid of hard softboxes, behind the camera
  float wa = az * 2.6, we = el * 6.0;
  float pane = smoothstep(0.06, 0.1, fract(wa)) * smoothstep(0.94, 0.9, fract(wa)) *
               smoothstep(0.08, 0.12, fract(we)) * smoothstep(0.92, 0.88, fract(we));
  float win = smoothstep(1.25, 1.1, abs(az)) * smoothstep(0.08, 0.14, el) * smoothstep(0.62, 0.55, el);
  col += vec3(0.95, 0.97, 1.0) * pane * win * 1.6;

  // overhead softbox
  col += vec3(1.0) * smoothstep(1.05, 1.2, el) * 1.8;

  // warm gold strip (left) and cool blue strip (right)
  float band = smoothstep(-0.5, -0.1, el) * smoothstep(1.0, 0.6, el);
  col += vec3(1.0, 0.76, 0.42) * smoothstep(0.09, 0.0, abs(az + 1.75)) * band * 1.5;
  col += vec3(0.35, 0.6, 1.0)  * smoothstep(0.07, 0.0, abs(az - 1.85)) * band * 1.2;

  // sharp horizon
  col += vec3(0.7, 0.72, 0.8) * smoothstep(0.012, 0.0, abs(el)) * 0.9;

  // striped glossy floor
  if (el < 0.0){
    vec2 f = d.xz / max(-d.y, 0.02);
    float stripe = smoothstep(0.75, 1.0, sin(f.x * 2.2));
    col = vec3(0.012, 0.013, 0.018) + vec3(0.09, 0.09, 0.1) * stripe * exp(-length(f) * 0.12);
  }
  return col;
}

vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }

void main(){
  vec2 uv = (2.0 * gl_FragCoord.xy - uRes) / uRes.y;
  vec3 ro = vec3(0.0, 0.0, 6.0);
  vec3 rd = normalize(vec3(uv, -1.8));

  float t = 0.0, minD = 1e5;
  bool hit = false;
  for (int i = 0; i < 60; i++){
    if (i >= uSteps) break;
    float d = map(ro + rd * t);
    minD = min(minD, d);
    if (d < 0.0015){ hit = true; break; }
    t += d * 0.9;
    if (t > 14.0) break;
  }

  vec3 col;
  if (hit){
    vec3 p = ro + rd * t;
    vec3 n = nor(p);
    n = normalize(n + (vec3(hash(p.xy * 50.0), hash(p.yz * 50.0), hash(p.zx * 50.0)) - 0.5) * 0.008);
    vec3 r = reflect(rd, n);
    col.r = env(normalize(r + n * 0.026)).r;
    col.g = env(r).g;
    col.b = env(normalize(r - n * 0.026)).b;
    float fr = pow(1.0 - max(dot(n, -rd), 0.0), 4.0);
    vec3 tint = mix(vec3(0.93, 0.93, 0.96), vec3(0.96, 0.84, 0.64), clamp(fr * 0.9 + 0.08, 0.0, 1.0));
    col *= tint * (0.85 + fr * 1.3);
    float ao = clamp(map(p + n * 0.4) / 0.4, 0.0, 1.0);
    col *= 0.35 + 0.65 * ao;
  } else {
    col = env(rd) * 0.18 + vec3(0.9, 0.8, 0.6) * exp(-max(minD, 0.0) * 3.0) * 0.12;
  }

  col = aces(col * 1.15);
  col = pow(col, vec3(1.0 / 2.2));
  col += (hash(gl_FragCoord.xy + fract(uTime) * 100.0) - 0.5) * 0.035;
  fragColor = vec4(col, 1.0);
}`;

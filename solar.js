// Interactive 3D solar system for the "Solar System 3D" project card.
// Three.js is loaded lazily, only when the card comes near the viewport.
const host = document.getElementById('solar');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (host) {
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); boot().catch((err) => console.warn('Solar system failed to load', err)); }
  }, { rootMargin: '400px 0px' });
  io.observe(host);
}

async function boot() {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

  const canvas = document.createElement('canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Interaktives 3D-Modell des Sonnensystems: Sonne und acht Planeten auf ihren Umlaufbahnen');
  canvas.tabIndex = 0;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch { return; } // keep the static image
  // inline sizing so a stale stylesheet can never cause a resize feedback loop
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  host.prepend(canvas);
  host.classList.add('is-3d');
  let visible = true, raf = 0, last = performance.now(), simTime = 0, idleFrames = 0;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020205);
  const camera = new THREE.PerspectiveCamera(40, 4 / 3, 0.1, 500);
  camera.position.set(0, 15, 42);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableZoom = false; // wheel keeps scrolling the page; zoom via buttons
  controls.minDistance = 10;
  controls.maxDistance = 80;
  controls.autoRotate = !reduced;
  controls.autoRotateSpeed = 0.35;

  /* ---------- Helpers ---------- */
  const canvasTex = (w, h, paint) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    paint(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  const bands = (colors, turb = 0.15) => canvasTex(256, 128, (g, w, h) => {
    for (let y = 0; y < h; y++) {
      const k = (y / h) * colors.length * 2.3 + Math.sin(y * 0.35) * turb * 4;
      g.fillStyle = colors[Math.floor(Math.abs(k)) % colors.length];
      g.fillRect(0, y, w, 1);
    }
    g.globalAlpha = 0.12;
    for (let i = 0; i < 400; i++) { g.fillStyle = rand() > 0.5 ? '#fff' : '#000'; g.fillRect(rand() * w, rand() * h, 6 + rand() * 18, 1); }
  });

  const speckle = (base, spots, n = 900, size = 6) => canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      g.globalAlpha = 0.15 + rand() * 0.35;
      g.fillStyle = spots[Math.floor(rand() * spots.length)];
      g.beginPath(); g.arc(rand() * w, rand() * h, 1 + rand() * size, 0, Math.PI * 2); g.fill();
    }
  });

  const earthTex = canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#1d4f91'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      g.fillStyle = rand() > 0.3 ? '#3f7a3a' : '#a08a5a';
      g.beginPath();
      const cx = rand() * w, cy = 18 + rand() * (h - 36);
      for (let a = 0; a < Math.PI * 2; a += 0.5) {
        const r = 5 + rand() * 14;
        g.lineTo(cx + Math.cos(a) * r * 1.4, cy + Math.sin(a) * r);
      }
      g.fill();
    }
    g.fillStyle = '#eef3f7'; g.fillRect(0, 0, w, 7); g.fillRect(0, h - 7, w, 7);
    g.globalAlpha = 0.35;
    for (let i = 0; i < 60; i++) { g.fillStyle = '#fff'; g.fillRect(rand() * w, rand() * h, 10 + rand() * 30, 2); }
  });

  /* ---------- Sun ---------- */
  const sunMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec3 vP; varying vec3 vN; varying vec3 vV;
      void main(){
        vP = position; vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uTime; varying vec3 vP; varying vec3 vN; varying vec3 vV;
      float h(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float n3(vec3 p){
        vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(mix(h(i), h(i+vec3(1,0,0)), f.x), mix(h(i+vec3(0,1,0)), h(i+vec3(1,1,0)), f.x), f.y),
                   mix(mix(h(i+vec3(0,0,1)), h(i+vec3(1,0,1)), f.x), mix(h(i+vec3(0,1,1)), h(i+vec3(1,1,1)), f.x), f.y), f.z);
      }
      float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * n3(p); p *= 2.03; a *= 0.5; } return s; }
      void main(){
        vec3 p = normalize(vP) * 2.4;
        float t = uTime * 0.08;
        float n = fbm(p + vec3(t, -t * 0.6, t * 0.4) + fbm(p * 1.7 - t) * 0.9);
        vec3 col = mix(vec3(0.75, 0.16, 0.02), vec3(1.0, 0.62, 0.12), smoothstep(0.25, 0.7, n));
        col = mix(col, vec3(1.0, 0.93, 0.7), smoothstep(0.62, 0.85, n));
        float mu = max(dot(vN, vV), 0.0);
        col *= 0.55 + 0.6 * pow(mu, 0.45); // limb darkening
        gl_FragColor = vec4(col * 1.25, 1.0);
      }`,
  });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(3, 64, 48), sunMat);
  sun.userData.name = 'Sonne';
  scene.add(sun);

  const glowTex = canvasTex(256, 256, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, 'rgba(255,190,90,0.9)'); r.addColorStop(0.25, 'rgba(255,120,30,0.35)');
    r.addColorStop(0.6, 'rgba(255,80,10,0.08)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, w);
  });
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  glow.scale.setScalar(17);
  scene.add(glow);

  scene.add(new THREE.PointLight(0xfff1dd, 3.2, 0, 0));
  scene.add(new THREE.AmbientLight(0x404a66, 0.25));

  /* ---------- Planets (distances and sizes not to scale) ---------- */
  const PLANETS = [
    { name: 'Merkur',  r: 0.28, d: 4.8,  p: 0.88,  tex: speckle('#8c8580', ['#5c5652', '#b3aca6']) },
    { name: 'Venus',   r: 0.48, d: 6.4,  p: 2.25,  tex: bands(['#d9b77a', '#e8cc94', '#c9a165'], 0.3) },
    { name: 'Erde',    r: 0.52, d: 8.2,  p: 3.65,  tex: earthTex },
    { name: 'Mars',    r: 0.36, d: 10,   p: 6.87,  tex: speckle('#b5532d', ['#7a2f17', '#d9814f', '#5e2412']) },
    { name: 'Jupiter', r: 1.35, d: 13.6, p: 43.3,  tex: bands(['#d8c7a8', '#b3865a', '#efe2c8', '#9c6b45', '#e4d2b3']) },
    { name: 'Saturn',  r: 1.1,  d: 17.6, p: 107.6, tex: bands(['#e3d2a3', '#cdb27a', '#eee0b9', '#bfa06a']), ring: true },
    { name: 'Uranus',  r: 0.78, d: 21,   p: 306.9, tex: bands(['#a6dde3', '#9bd3da', '#b6e6ea'], 0.05), tilt: 1.7 },
    { name: 'Neptun',  r: 0.76, d: 23.8, p: 601.9, tex: bands(['#3f63d6', '#4a72e0', '#3557c2'], 0.1) },
  ];

  const pickables = [sun];
  const orbitMat = new THREE.LineBasicMaterial({ color: 0x8a8577, transparent: true, opacity: 0.22 });
  const planets = PLANETS.map((cfg, i) => {
    const pivot = new THREE.Object3D();
    pivot.rotation.y = rand() * Math.PI * 2;
    scene.add(pivot);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(cfg.r, 40, 28), new THREE.MeshStandardMaterial({ map: cfg.tex, roughness: 0.9, metalness: 0 }));
    mesh.position.x = cfg.d;
    mesh.rotation.z = cfg.tilt ? cfg.tilt : 0.3 * (i % 2 ? 1 : -0.6);
    mesh.userData.name = cfg.name;
    pivot.add(mesh);
    pickables.push(mesh);

    if (cfg.ring) {
      const ringTex = canvasTex(256, 8, (g, w, h) => {
        for (let x = 0; x < w; x++) {
          const a = 0.25 + 0.55 * Math.abs(Math.sin(x * 0.11) * Math.sin(x * 0.037));
          g.fillStyle = `rgba(222,203,160,${x < 20 ? 0 : a})`; g.fillRect(x, 0, 1, h);
        }
      });
      const rg = new THREE.RingGeometry(cfg.r * 1.35, cfg.r * 2.3, 96, 1);
      const pos = rg.attributes.position, uv = rg.attributes.uv, v = new THREE.Vector3();
      for (let k = 0; k < pos.count; k++) {
        v.fromBufferAttribute(pos, k);
        uv.setXY(k, (v.length() - cfg.r * 1.35) / (cfg.r * 0.95), 0.5);
      }
      const ring = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ map: ringTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 1 }));
      ring.rotation.x = -Math.PI / 2 + 0.45;
      mesh.add(ring);
    }

    const pts = [];
    for (let a = 0; a <= 128; a++) pts.push(new THREE.Vector3(Math.cos(a / 128 * Math.PI * 2) * cfg.d, 0, Math.sin(a / 128 * Math.PI * 2) * cfg.d));
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), orbitMat));

    return { pivot, mesh, speed: (Math.PI * 2) / cfg.p * 0.35 };
  });

  // Moon
  const moonPivot = new THREE.Object3D();
  planets[2].mesh.add(moonPivot);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 14), new THREE.MeshStandardMaterial({ color: 0xbdb8b0, roughness: 1 }));
  moon.position.x = 0.95; moon.userData.name = 'Mond';
  moonPivot.add(moon); pickables.push(moon);

  /* ---------- Stars + Milky Way band ---------- */
  const N = 2600, sp = new Float32Array(N * 3), sc = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const band = i < N * 0.45;
    const u = rand() * 2 - 1, th = rand() * Math.PI * 2;
    let y = band ? (rand() - 0.5) * 0.25 : u;
    const s = Math.sqrt(1 - y * y), R = 160;
    sp.set([Math.cos(th) * s * R, y * R, Math.sin(th) * s * R], i * 3);
    const b = 0.45 + rand() * 0.55, tint = rand();
    sc.set([b * (tint > 0.85 ? 1 : 0.85), b * 0.9, b * (tint < 0.2 ? 1 : 0.85)], i * 3);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  sg.setAttribute('color', new THREE.BufferAttribute(sc, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.7, vertexColors: true, sizeAttenuation: true, depthWrite: false }));
  stars.rotation.z = 0.5;
  scene.add(stars);

  /* ---------- UI: speed, pause, zoom, hover label ---------- */
  const SPEEDS = [1, 5, 0];
  let speedIdx = 0;
  const speedBtn = host.querySelector('[data-solar="speed"]');
  const setSpeed = (i) => {
    speedIdx = i;
    speedBtn.textContent = SPEEDS[i] === 0 ? 'Pause' : `${SPEEDS[i]}×`;
    speedBtn.setAttribute('aria-label', `Geschwindigkeit: ${speedBtn.textContent}. Klicken zum Wechseln`);
    wake();
  };
  speedBtn.addEventListener('click', () => setSpeed((speedIdx + 1) % SPEEDS.length));

  let targetDist = camera.position.length();
  const zoom = (f) => { targetDist = THREE.MathUtils.clamp(targetDist * f, controls.minDistance, controls.maxDistance); wake(); };
  host.querySelector('[data-solar="in"]').addEventListener('click', () => zoom(0.8));
  host.querySelector('[data-solar="out"]').addEventListener('click', () => zoom(1.25));

  canvas.addEventListener('keydown', (e) => {
    if (e.key === '1') setSpeed(0);
    else if (e.key === '2') setSpeed(1);
    else if (e.key === ' ') { e.preventDefault(); setSpeed(speedIdx === 2 ? 0 : 2); }
    else if (e.key === '+' || e.key === '=') zoom(0.8);
    else if (e.key === '-') zoom(1.25);
  });

  const label = host.querySelector('.solar-label');
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let hovered = null;
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    hovered = hit ? hit.object : null;
    if (hovered) {
      label.textContent = hovered.userData.name;
      label.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top - 10}px)`;
      label.hidden = false;
      canvas.style.cursor = 'pointer';
    } else { label.hidden = true; canvas.style.cursor = 'grab'; }
    wake();
  });
  canvas.addEventListener('pointerleave', () => { label.hidden = true; hovered = null; });
  controls.addEventListener('start', () => { host.classList.add('touched'); wake(); });

  /* ---------- Sizing + loop ---------- */
  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 1 ? 52 : 40;
    camera.updateProjectionMatrix();
    wake();
  };
  new ResizeObserver(resize).observe(host);
  resize();

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); }).observe(host);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });

  function wake() { idleFrames = 0; if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }

  function tick(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const k = reduced ? 0 : SPEEDS[speedIdx];
    simTime += dt * k;
    planets.forEach((p) => { p.pivot.rotation.y += p.speed * dt * k; p.mesh.rotation.y += dt * 0.6 * k; });
    moonPivot.rotation.y += dt * 1.8 * k;
    sunMat.uniforms.uTime.value = reduced ? 3 : simTime + now / 4000;

    const dist = camera.position.length();
    if (Math.abs(dist - targetDist) > 0.01) camera.position.setLength(dist + (targetDist - dist) * Math.min(1, dt * 8));
    controls.update();
    renderer.render(scene, camera);

    // In reduced-motion mode only render while something changes
    if (reduced) { if (++idleFrames > 30) return; }
    raf = requestAnimationFrame(tick);
  }
  wake();
}

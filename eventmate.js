// 3D version of the Eventmate logo: a hand holding a calendar with a star, plus extruded wordmark.
// Tilts toward the pointer, can be dragged, and a click/tap fires confetti.
const host = document.getElementById('eventmate3d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (host) {
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); boot().catch((err) => console.warn('Eventmate 3D failed to load', err)); }
  }, { rootMargin: '400px 0px' });
  io.observe(host);
}

async function boot() {
  const THREE = await import('three');
  const [{ RoundedBoxGeometry }, { RoomEnvironment }, { FontLoader }, { TextGeometry }] = await Promise.all([
    import('three/addons/geometries/RoundedBoxGeometry.js'),
    import('three/addons/environments/RoomEnvironment.js'),
    import('three/addons/loaders/FontLoader.js'),
    import('three/addons/geometries/TextGeometry.js'),
  ]);
  // Clash Display Semibold (ITF Free Font License), reduced to the glyphs of "Eventmate" — the site's display face
  const font = await new FontLoader().loadAsync(new URL('assets/eventmate-font.json?v=2', document.baseURI).href);

  const canvas = document.createElement('canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', '3D-Logo von Eventmate: eine Hand hält einen Kalender mit Stern');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch { return; }
  // inline sizing so a stale stylesheet can never cause a resize feedback loop
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  host.prepend(canvas);
  host.classList.add('is-3d');
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  let visible = true, raf = 0, last = performance.now(), time = 0, idle = 0;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(32, 4 / 3, 0.1, 100);
  camera.position.set(0, 0.3, 13);

  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-3, 5, 6);
  scene.add(key, new THREE.AmbientLight(0x9fb4ff, 0.35));

  /* ---------- Materials ---------- */
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf6f7fb, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15 });
  const softWhite = new THREE.MeshPhysicalMaterial({ color: 0xdfe5f2, roughness: 0.45, clearcoat: 0.6 });
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xe6c27a, metalness: 1, roughness: 0.22 });
  const dayMat = new THREE.MeshStandardMaterial({ color: 0x9aa9cc, roughness: 0.6 });
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xcfd3dc, metalness: 1, roughness: 0.15 });

  const root = new THREE.Group();
  scene.add(root);
  const icon = new THREE.Group();
  root.add(icon);

  /* ---------- Hand ---------- */
  const palm = new THREE.Shape();
  palm.moveTo(-1.1, -0.34);
  palm.lineTo(0.95, -0.34);
  palm.quadraticCurveTo(1.5, -0.32, 1.42, 0.02);
  palm.quadraticCurveTo(1.38, 0.16, 1.22, 0.1);
  palm.quadraticCurveTo(0.95, 0.0, 0.45, 0.02);
  palm.lineTo(-0.15, 0.06);
  palm.quadraticCurveTo(-0.55, 0.3, -0.78, 0.12);
  palm.lineTo(-1.1, 0.12);
  palm.closePath();
  const hand = new THREE.Mesh(new THREE.ExtrudeGeometry(palm, {
    depth: 0.55, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 4, curveSegments: 24,
  }), white);
  hand.geometry.translate(0, 0, -0.275);
  const cuff = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.62, 0.75, 4, 0.08), softWhite);
  cuff.position.set(-1.4, -0.11, 0);
  const handGroup = new THREE.Group();
  handGroup.add(hand, cuff);
  handGroup.position.set(0, -1.1, 0);
  handGroup.scale.set(1.1, 1.45, 1.1);
  icon.add(handGroup);

  /* ---------- Calendar ---------- */
  const cal = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.7, 1.55, 0.36, 5, 0.12), white);
  const header = new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.42, 0.4, 5, 0.12), softWhite);
  header.position.y = 0.58;
  cal.add(body, header);
  [-0.45, 0.45].forEach((x) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.045, 12, 32, Math.PI * 1.25), chrome);
    ring.rotation.set(0, Math.PI / 2, Math.PI * 0.12);
    ring.position.set(x, 0.86, 0);
    cal.add(ring);
  });
  // day tiles
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
    if (r === 0 && (c === 1 || c === 2)) continue; // leave room for the star
    const d = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.2, 0.06, 2, 0.03), dayMat);
    d.position.set(-0.54 + c * 0.36, 0.08 - r * 0.42, 0.19);
    cal.add(d);
  }
  // star
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 0.13 : 0.3;
    i ? starShape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : starShape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const star = new THREE.Mesh(new THREE.ExtrudeGeometry(starShape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 3 }), gold);
  star.geometry.center();
  star.position.set(0, 0.06, 0.32);
  cal.add(star);
  cal.position.set(0.15, 0.32, 0);
  icon.add(cal);

  /* ---------- Wordmark ---------- */
  const textGeo = new TextGeometry('Eventmate', {
    font, size: 1.12, depth: 0.32, curveSegments: 14,
    bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.02, bevelSegments: 4,
  });
  textGeo.computeBoundingBox();
  const text = new THREE.Mesh(textGeo, white);
  const tb = textGeo.boundingBox;
  text.position.set(1.85, -(tb.max.y + tb.min.y) / 2 + 0.05, -0.16);
  root.add(text);

  // center the whole logo horizontally
  const box = new THREE.Box3().setFromObject(root);
  const cx = (box.max.x + box.min.x) / 2;
  root.children.forEach((c) => (c.position.x -= cx));
  const logoWidth = box.max.x - box.min.x;

  /* ---------- Confetti ---------- */
  const COUNT = 140;
  const confGeo = new THREE.PlaneGeometry(0.26, 0.15);
  const confMat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.5, metalness: 0.2 });
  const confetti = new THREE.InstancedMesh(confGeo, confMat, COUNT);
  confetti.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  confetti.frustumCulled = false; // bounds change every frame
  const palette = [0xe6d3a8, 0xffffff, 0xff7a59, 0x7fb2ff, 0xffd166, 0xc084fc].map((c) => new THREE.Color(c));
  const parts = Array.from({ length: COUNT }, (_, i) => {
    confetti.setColorAt(i, palette[i % palette.length]);
    return { p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), life: 0 };
  });
  const tmp = new THREE.Object3D();
  const hideAll = () => { tmp.position.set(0, -99, 0); tmp.scale.setScalar(0); tmp.updateMatrix(); for (let i = 0; i < COUNT; i++) confetti.setMatrixAt(i, tmp.matrix); confetti.instanceMatrix.needsUpdate = true; };
  hideAll();
  scene.add(confetti);
  let confettiActive = 0;

  const burst = () => {
    if (reduced) return;
    const origin = new THREE.Vector3();
    star.getWorldPosition(origin);
    parts.forEach((q) => {
      q.p.copy(origin);
      const a = Math.random() * Math.PI * 2, s = 3 + Math.random() * 4;
      q.v.set(Math.cos(a) * s * 0.9, 3 + Math.random() * 3.5, Math.sin(a) * s * 0.4 + 1);
      q.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      q.w.set(Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5);
      q.life = 1.6 + Math.random() * 0.8;
    });
    confettiActive = 2.4;
    starSpin = 14;
    pop = 1;
    host.classList.add('touched');
    wake();
  };

  /* ---------- Interaction ---------- */
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  let drag = null, dragRot = 0, dragVel = 0, starSpin = 0, pop = 0, moved = false;

  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1, ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    tilt.ty = nx * 0.35; tilt.tx = ny * 0.22;
    if (drag) {
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 3) moved = true;
      dragVel = dx * 0.012; dragRot += dragVel; drag.x = e.clientX;
    }
    wake();
  });
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX }; moved = false; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointerup', () => { if (!moved) burst(); drag = null; });
  canvas.addEventListener('pointerleave', () => { tilt.tx = tilt.ty = 0; });
  host.querySelector('[data-em="confetti"]').addEventListener('click', burst);

  /* ---------- Size + loop ---------- */
  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // fit the logo width with some margin
    const fitDist = (logoWidth * 1.16) / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / camera.aspect;
    camera.position.z = Math.max(9, fitDist);
    camera.updateProjectionMatrix();
    wake();
  };
  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); }).observe(host);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });

  function wake() { idle = 0; if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }

  function tick(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const m = reduced ? 0 : 1;
    time += dt * m;

    // tilt + drag spin with inertia, springing back to front
    tilt.x += (tilt.tx - tilt.x) * Math.min(1, dt * 5);
    tilt.y += (tilt.ty - tilt.y) * Math.min(1, dt * 5);
    if (!drag) { dragVel *= Math.pow(0.02, dt); dragRot += dragVel; dragRot += (0 - dragRot) * Math.min(1, dt * 1.6); }
    root.rotation.set(tilt.x * m + Math.sin(time * 0.6) * 0.04, tilt.y + dragRot + Math.sin(time * 0.4) * 0.08 * m, 0);

    // calendar floats above the hand, star spins
    pop *= Math.pow(0.05, dt);
    cal.position.y = 0.32 + Math.sin(time * 1.6) * 0.08 + pop * 0.35;
    cal.rotation.z = Math.sin(time * 1.1) * 0.04;
    starSpin *= Math.pow(0.15, dt);
    star.rotation.y += dt * (0.8 * m + starSpin);

    if (confettiActive > 0) {
      confettiActive -= dt;
      parts.forEach((q, i) => {
        q.life -= dt;
        q.v.y -= 5 * dt; q.v.multiplyScalar(Math.pow(0.3, dt));
        q.p.addScaledVector(q.v, dt);
        q.r.x += q.w.x * dt; q.r.y += q.w.y * dt; q.r.z += q.w.z * dt;
        tmp.position.copy(q.p); tmp.rotation.copy(q.r);
        tmp.scale.setScalar(q.life > 0 ? Math.min(1, q.life * 2) : 0);
        tmp.updateMatrix(); confetti.setMatrixAt(i, tmp.matrix);
      });
      confetti.instanceMatrix.needsUpdate = true;
      if (confettiActive <= 0) hideAll();
    }

    renderer.render(scene, camera);
    if (reduced && ++idle > 40 && confettiActive <= 0) return;
    raf = requestAnimationFrame(tick);
  }
  resize();
  wake();
}

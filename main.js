(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  /* ---------- Entrance + reveals ---------- */
  requestAnimationFrame(() => document.body.classList.add('is-loaded'));

  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const sibs = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
      el.style.transitionDelay = `${Math.max(0, sibs.indexOf(el)) * 120}ms`;
      el.classList.add('in');
      el.addEventListener('transitionend', () => (el.style.transitionDelay = ''), { once: true });
      revealIO.unobserve(el);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach((el) => revealIO.observe(el));

  /* ---------- Count-up stats ---------- */
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target, end = +el.dataset.count;
      countIO.unobserve(el);
      if (reduced) return;
      const t0 = performance.now();
      const tick = (now) => {
        const k = Math.min(1, (now - t0) / 1400);
        el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(tick);
      };
      el.textContent = '0';
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach((el) => countIO.observe(el));

  /* ---------- Liquid chrome WebGL2 ---------- */
  const canvas = document.getElementById('chrome');
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) { root.classList.add('no-webgl'); return; }

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, window.CHROME_VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, window.CHROME_FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (err) {
    console.warn('Chrome shader failed, using fallback.', err);
    root.classList.add('no-webgl');
    return;
  }
  gl.useProgram(prog);
  gl.bindVertexArray(gl.createVertexArray());
  const U = {};
  ['uRes', 'uTime', 'uS', 'uMouse', 'uRipP', 'uRipT', 'uKick', 'uSteps'].forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));

  const mobile = () => innerWidth < 768;
  let scale = mobile() ? 0.5 : 0.8;
  const dprCap = mobile() ? 1.5 : 1.75;

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, dprCap);
    const w = Math.max(1, Math.round(innerWidth * dpr * scale));
    const h = Math.max(1, Math.round(innerHeight * dpr * scale));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
  };
  addEventListener('resize', resize);
  resize();

  // world-space half-height at z=0: camera z=6, focal 1.8
  const HALF = 6 / 1.8;
  const toWorld = (cx, cy) => [((2 * cx - innerWidth) / innerHeight) * HALF, ((innerHeight - 2 * cy) / innerHeight) * HALF];

  const RADII = [1.1, 0.86, 0.78, 0.66, 0.56, 0.46];
  const spheres = new Float32Array(24);
  const mouse = { x: 1.6, y: 0.2, tx: 1.6, ty: 0.2, active: false };
  const chase = [1.6, 0.2];
  let kick = 0, ripT = 10, ripP = [0, 0, 0];

  const center = () => (mobile() ? [0, 0.55] : [1.45, 0.15]);

  addEventListener('pointermove', (e) => {
    const [x, y] = toWorld(e.clientX, e.clientY);
    mouse.tx = x; mouse.ty = y; mouse.active = true;
  }, { passive: true });

  const hero = document.querySelector('.hero');
  hero.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a,button')) return;
    const [x, y] = toWorld(e.clientX, e.clientY);
    kick = 1; ripT = 0; ripP = [x, y, 0.4];
    if (reduced) draw(lastT);
  });

  const scrollProgress = () => Math.min(1, Math.max(0, scrollY / (innerHeight * 0.9)));
  const ease = (x) => 1 - Math.pow(1 - x, 3);

  let lastT = 0;
  function layout(t, dt) {
    const [cx, cy] = center();
    const orbit = mobile() ? 0.72 : 1;
    const s = ease(scrollProgress());
    const spread = (0.78 + 0.22 * Math.sin(0.42 * t)) * (1 + 1.1 * kick) * (1 - 0.8 * s);

    // cursor follower, clamped to 2.7 units around the center
    const k = 1 - Math.pow(0.0009, dt);
    let tx = mouse.active ? mouse.tx : cx + Math.cos(t * 0.3) * 1.2;
    let ty = mouse.active ? mouse.ty : cy + Math.sin(t * 0.4) * 0.8;
    const dx = tx - cx, dy = ty - cy, dl = Math.hypot(dx, dy);
    if (dl > 2.7) { tx = cx + (dx / dl) * 2.7; ty = cy + (dy / dl) * 2.7; }
    chase[0] += (tx - chase[0]) * k;
    chase[1] += (ty - chase[1]) * k;

    for (let i = 0; i < 6; i++) {
      const a = t * (0.32 + 0.07 * i) + i * 1.7;
      let x = cx + Math.cos(a) * 1.5 * spread * orbit;
      let y = cy + Math.sin(a * 1.3 + i) * 1.05 * spread * orbit;
      let z = Math.sin(a * 0.7 + i * 2.1) * 0.8 * spread;
      let r = RADII[i];
      if (i === 0) { x = cx + (x - cx) * 0.35; y = cy + (y - cy) * 0.35; r *= 1 + 0.9 * s; }
      if (i === 3) { x = chase[0] * (1 - s) + cx * s; y = chase[1] * (1 - s) + cy * s; z = 0.3; }
      if (i === 1 || i === 4) { const p = 0.28 * (1 - s); x += (chase[0] - x) * p; y += (chase[1] - y) * p; }
      spheres.set([x, y, z, r], i * 4);
    }
  }

  function draw(t) {
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uTime, t);
    gl.uniform4fv(U.uS, spheres);
    gl.uniform2f(U.uMouse, chase[0], chase[1]);
    gl.uniform3f(U.uRipP, ripP[0], ripP[1], ripP[2]);
    gl.uniform1f(U.uRipT, ripT);
    gl.uniform1f(U.uKick, kick);
    gl.uniform1i(U.uSteps, mobile() ? 34 : 60);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // Fade canvas out once the hero is scrolled past
  const updateOpacity = () => {
    const o = 1 - Math.min(1, Math.max(0, (scrollY - innerHeight * 0.9) / (innerHeight * 0.9)));
    canvas.style.opacity = o.toFixed(3);
    return o;
  };

  if (reduced) {
    layout(4, 0.016); draw(4);
    addEventListener('resize', () => { layout(4, 0.016); draw(4); });
    addEventListener('scroll', updateOpacity, { passive: true });
    updateOpacity();
    return;
  }

  let running = true, raf = 0, prev = performance.now(), frames = 0, acc = 0, time = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    if (updateOpacity() <= 0.001) return; // off-screen: skip GPU work
    time += dt;
    kick *= Math.pow(0.02, dt);
    ripT += dt;
    layout(time, dt);
    draw(time);
    lastT = time;

    // adaptive resolution from a 30-frame average
    acc += dt; frames++;
    if (frames === 30) {
      const avg = acc / 30;
      const next = avg > 0.02 ? Math.max(0.42, scale - 0.08) : avg < 0.0145 ? Math.min(1, scale + 0.04) : scale;
      if (next !== scale) { scale = next; resize(); }
      frames = 0; acc = 0;
    }
  }
  const start = () => { if (!running) { running = true; prev = performance.now(); raf = requestAnimationFrame(frame); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  raf = requestAnimationFrame(frame);
})();

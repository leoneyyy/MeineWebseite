// 3D portrait: depth-based parallax (depth map estimated with Depth Anything V2)
// plus a subtle perspective tilt of the frame. Raw WebGL, no libraries.
(() => {
  const fig = document.getElementById('portrait3d');
  if (!fig) return;
  const img = fig.querySelector('img');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); init(); }
  }, { rootMargin: '300px 0px' });
  io.observe(fig);

  const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

  async function init() {
    let photo, depth;
    try { [photo, depth] = await Promise.all([load(img.currentSrc || img.src), load(fig.dataset.depth)]); }
    catch { return; }

    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;inset:3px;width:calc(100% - 6px);height:calc(100% - 6px);display:block;border-radius:25px';
    const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
    if (!gl) return;

    const vs = `attribute vec2 p; varying vec2 v; void main(){ v = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }`;
    const fs = `precision mediump float;
      uniform sampler2D uImg, uDepth; uniform vec2 uOff; uniform vec4 uCrop; varying vec2 v;
      void main(){
        vec2 uv = uCrop.xy + v * uCrop.zw;
        vec2 p = uv;
        for (int i = 0; i < 5; i++) { float d = texture2D(uDepth, p).r; p = uv + uOff * (d - .42); }
        gl_FragColor = texture2D(uImg, clamp(p, vec2(.001), vec2(.999)));
      }`;
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const tex = (image, unit) => {
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    };
    tex(photo, 0); tex(depth, 1);
    gl.uniform1i(gl.getUniformLocation(prog, 'uImg'), 0);
    gl.uniform1i(gl.getUniformLocation(prog, 'uDepth'), 1);
    const uOff = gl.getUniformLocation(prog, 'uOff');
    const uCrop = gl.getUniformLocation(prog, 'uCrop');

    fig.appendChild(canvas);
    fig.classList.add('is-3d');

    // object-fit: cover with object-position 50% 42%, zoomed 6% so parallax never reveals edges
    const resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      const box = w / h, im = photo.width / photo.height, zoom = 0.94;
      let sx = 1, sy = 1;
      if (box > im) sy = im / box; else sx = box / im;
      sx *= zoom; sy *= zoom;
      gl.uniform4f(uCrop, (1 - sx) * 0.5, (1 - sy) * 0.42, sx, sy);
      draw();
    };

    const s = { x: 0, y: 0, tx: 0, ty: 0, active: false };
    const draw = () => {
      gl.uniform2f(uOff, -s.x * 0.032, -s.y * 0.026);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      fig.style.transform = `perspective(1000px) rotateY(${s.x * 7}deg) rotateX(${-s.y * 6}deg)`;
    };

    if (reduced) { new ResizeObserver(resize).observe(canvas); return; }

    // pointer anywhere near the section steers the view; idle = slow drift
    const section = fig.closest('section') || document.body;
    section.addEventListener('pointermove', (e) => {
      const r = fig.getBoundingClientRect();
      s.tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * 0.9)));
      s.ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height * 0.9)));
      s.active = true;
    }, { passive: true });
    section.addEventListener('pointerleave', () => { s.active = false; });

    let visible = true, raf = 0, last = performance.now(), t = 0;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }).observe(fig);
    function tick(now) {
      raf = 0;
      if (!visible || document.hidden) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      if (!s.active) { s.tx = Math.sin(t * 0.55) * 0.55; s.ty = Math.sin(t * 0.37) * 0.3; }
      const k = 1 - Math.pow(0.002, dt);
      s.x += (s.tx - s.x) * k; s.y += (s.ty - s.y) * k;
      draw();
      raf = requestAnimationFrame(tick);
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); } });
    new ResizeObserver(resize).observe(canvas);
    raf = requestAnimationFrame(tick);
  }
})();

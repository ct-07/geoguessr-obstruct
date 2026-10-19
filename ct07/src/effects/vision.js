/* ct-07 Obstruct — VISION effects (masks that limit what you can see) */
(function () {
  'use strict';
  const CT = globalThis.CT07;
  const { defineEffect: def, util: U } = CT;

  const center = (ctx) => [ctx.w / 2, ctx.h / 2];
  const setMask = (el, val) => { el.style.maskImage = val; el.style.webkitMaskImage = val; };

  /* ── flashlight ── */
  def({
    id: 'flashlight',
    mount(ctx) {
      const d = ctx.div('position:absolute;inset:0');
      let fx = -1, fy = -1, power = 1, dip = 0;
      return {
        frame(dt) {
          const p = ctx.p;
          const [cx, cy] = center(ctx);
          const tx = ctx.mouse.inside ? ctx.mouse.x : cx, ty = ctx.mouse.inside ? ctx.mouse.y : cy;
          if (fx < 0) { fx = tx; fy = ty; }
          const k = Math.min(1, dt * 16);
          fx += (tx - fx) * k;
          fy += (ty - fy) * k;
          if (p.flicker) {
            if (dip <= 0 && Math.random() < dt * 0.6) dip = U.rand(0.08, 0.9);
            if (dip > 0) { dip -= dt; power = Math.random() < 0.5 ? U.rand(0, 0.35) : U.rand(0.5, 1); } else power += (1 - power) * Math.min(1, dt * 6);
          } else power = 1;
          const a = p.dark / 100;
          const r = p.radius * (0.75 + 0.25 * power);
          const inner = r * (1 - p.softness / 100);
          d.style.background = `radial-gradient(circle at ${fx.toFixed(1)}px ${fy.toFixed(1)}px,` +
            `rgba(255,236,190,${(0.06 * power).toFixed(3)}) 0,rgba(0,0,0,${(a * (1 - power)).toFixed(3)}) ${inner.toFixed(1)}px,rgba(0,0,0,${a}) ${r.toFixed(1)}px)`;
        },
      };
    },
  });

  /* ── tunnel vision ── */
  def({
    id: 'tunnel',
    mount(ctx) {
      const d = ctx.div('position:absolute;inset:0');
      return {
        frame() {
          const r = (ctx.p.radius / 100) * Math.min(ctx.w, ctx.h);
          const inner = r * (1 - ctx.p.softness / 100);
          d.style.background = `radial-gradient(circle at 50% 50%,transparent 0,transparent ${inner}px,rgba(0,0,0,.985) ${r}px)`;
        },
      };
    },
  });

  /* ── canvas mask helper: black sheet with soft holes, redrawn on resize/update ── */
  function maskEffect(id, drawHoles, decorate) {
    def({
      id,
      mount(ctx) {
        const c = ctx.canvas(1);
        const draw = () => {
          c.fit();
          const g = c.g, W = c.W, H = c.H;
          g.globalCompositeOperation = 'source-over';
          g.filter = 'none';
          g.clearRect(0, 0, W, H);
          g.fillStyle = 'rgba(2,2,3,.99)';
          g.fillRect(0, 0, W, H);
          g.globalCompositeOperation = 'destination-out';
          drawHoles(g, W, H, ctx.p);
          g.globalCompositeOperation = 'source-over';
          g.filter = 'none';
          if (decorate) decorate(g, W, H, ctx.p);
        };
        draw();
        return { resize: draw, update: draw };
      },
    });
  }

  const softCircle = (g, x, y, r, soft = 0.08) => {
    const grd = g.createRadialGradient(x, y, r * (1 - soft), x, y, r);
    grd.addColorStop(0, 'rgba(0,0,0,1)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  };

  /* ── binoculars ── */
  const binoR = (W, H, p) => (p.size / 100) * Math.min(W, H) * 1.15;
  maskEffect('binoculars', (g, W, H, p) => {
    const r = binoR(W, H, p);
    softCircle(g, W / 2 - r * 0.78, H / 2, r);
    softCircle(g, W / 2 + r * 0.78, H / 2, r);
  }, (g, W, H, p) => {
    if (!p.reticle) return;
    const r = binoR(W, H, p), cx = W / 2, cy = H / 2;
    g.strokeStyle = 'rgba(0,0,0,.75)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(cx - r * 1.6, cy); g.lineTo(cx + r * 1.6, cy);
    g.moveTo(cx, cy - r * 0.9); g.lineTo(cx, cy + r * 0.9);
    for (let i = -8; i <= 8; i++) {
      const L = i % 4 === 0 ? 12 : 6;
      g.moveTo(cx + i * r * 0.18, cy - L); g.lineTo(cx + i * r * 0.18, cy + L);
      if (Math.abs(i) <= 4) { g.moveTo(cx - L, cy + i * r * 0.18); g.lineTo(cx + L, cy + i * r * 0.18); }
    }
    g.stroke();
    g.font = '600 11px Consolas, monospace';
    g.fillStyle = 'rgba(0,0,0,.7)';
    g.fillText('ct-07  8×42', cx + 8, cy - 8);
  });

  /* ── keyhole ── */
  maskEffect('keyhole', (g, W, H, p) => {
    const s = (p.size / 100) * H, cx = W / 2, cy = H / 2;
    g.filter = 'blur(5px)';
    g.fillStyle = '#000';
    g.beginPath();
    g.arc(cx, cy - s * 0.18, s * 0.26, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(cx - s * 0.1, cy - s * 0.1);
    g.lineTo(cx + s * 0.1, cy - s * 0.1);
    g.lineTo(cx + s * 0.22, cy + s * 0.55);
    g.lineTo(cx - s * 0.22, cy + s * 0.55);
    g.closePath();
    g.fill();
  }, (g, W, H) => {
    // wood-grain on the door around the hole
    g.globalCompositeOperation = 'source-atop';
    for (let y = 0; y < H; y += 6) {
      g.fillStyle = `rgba(${40 + Math.sin(y * 0.05) * 12},${24 + Math.sin(y * 0.03) * 6},12,.5)`;
      g.fillRect(0, y, W, 3);
    }
  });

  /* ── the slit ── */
  def({
    id: 'slit',
    mount(ctx) {
      const d = ctx.div('position:absolute;inset:0');
      let phase = Math.random() * 10;
      return {
        frame(dt) {
          const p = ctx.p;
          if (p.scan) phase += dt * p.speed * 0.12;
          const s = p.size / 100;
          const c = p.scan ? 0.5 + (0.5 - s / 2) * Math.sin(phase) : 0.5;
          const a = (c - s / 2) * 100, b = (c + s / 2) * 100, soft = 0.6;
          const dir = p.dir === 'v' ? 'to right' : 'to bottom';
          d.style.background = `linear-gradient(${dir},#030303 0,#030303 ${a - soft}%,transparent ${a + soft}%,transparent ${b - soft}%,#030303 ${b + soft}%,#030303 100%)`;
        },
      };
    },
  });

  /* ── venetian blinds ── */
  def({
    id: 'blinds',
    mount(ctx) {
      const d = ctx.div('position:absolute;inset:-60%');
      let spin = 0;
      return {
        frame(dt) {
          const p = ctx.p;
          if (p.rotate) spin += dt * 6;
          const P = Math.max(6, ctx.h / p.slats), A = P * (1 - p.open / 100);
          d.style.background = `repeating-linear-gradient(180deg,#15161a 0,#4a4c52 ${(A * 0.35).toFixed(1)}px,#2a2b30 ${(A * 0.8).toFixed(1)}px,#0c0c0e ${A.toFixed(1)}px,transparent ${A.toFixed(1)}px,transparent ${P.toFixed(1)}px)`;
          d.style.transform = `rotate(${(p.angle + spin).toFixed(2)}deg)`;
        },
      };
    },
  });

  /* ── missing tiles ── */
  def({
    id: 'mosaic',
    css: '.tile{background:#0b0b0e;box-shadow:inset 0 0 0 1px rgba(255,255,255,.05);transition:opacity .35s ease}',
    mount(ctx) {
      const grid = ctx.div('position:absolute;inset:0;display:grid');
      let tiles = [], key = '', timer = 0;
      const build = () => {
        const cols = ctx.p.grid, rows = Math.max(2, Math.round(cols * (ctx.h / Math.max(1, ctx.w))));
        const k = cols + 'x' + rows;
        if (k === key) return;
        key = k;
        grid.innerHTML = '';
        grid.style.gridTemplateColumns = `repeat(${cols},1fr)`;
        grid.style.gridTemplateRows = `repeat(${rows},1fr)`;
        tiles = Array.from({ length: cols * rows }, () => U.el('div', '', grid, 'tile'));
        shuffle();
      };
      const shuffle = () => {
        const cover = ctx.p.coverage / 100;
        const idx = tiles.map((_, i) => i).sort(() => Math.random() - 0.5);
        const n = Math.round(tiles.length * cover);
        idx.forEach((ti, j) => (tiles[ti].style.opacity = j < n ? '1' : '0'));
      };
      build();
      return {
        update() { key = ''; build(); },
        resize: build,
        round: shuffle,
        frame(dt) {
          if (!ctx.p.shuffle) return;
          timer += dt;
          if (timer >= ctx.p.shuffle) { timer = 0; shuffle(); }
        },
      };
    },
  });

  /* ── wandering window ── */
  def({
    id: 'wanderer',
    mount(ctx) {
      const win = ctx.div('position:absolute;border-radius:10px;box-shadow:0 0 0 300vmax rgba(4,4,6,.985),inset 0 0 0 2px rgba(255,255,255,.25),inset 0 0 30px rgba(0,0,0,.6)');
      let x = Math.random() * 200, y = Math.random() * 200, vx = 1, vy = 0.7;
      const a = Math.random() * Math.PI * 2;
      vx = Math.cos(a); vy = Math.sin(a);
      return {
        frame(dt) {
          const ww = (ctx.p.size / 100) * ctx.w, wh = ww * 0.62;
          const sp = ctx.p.speed;
          x += vx * sp * dt; y += vy * sp * dt;
          if (x < 0) { x = 0; vx = Math.abs(vx); }
          if (y < 0) { y = 0; vy = Math.abs(vy); }
          if (x + ww > ctx.w) { x = Math.max(0, ctx.w - ww); vx = -Math.abs(vx); }
          if (y + wh > ctx.h) { y = Math.max(0, ctx.h - wh); vy = -Math.abs(vy); }
          Object.assign(win.style, { left: x + 'px', top: y + 'px', width: ww + 'px', height: wh + 'px' });
        },
      };
    },
  });

  /* ── closing walls (brick) ── */
  let brickTile = null;
  function bricks() {
    if (brickTile) return brickTile;
    const c = document.createElement('canvas');
    c.width = 120; c.height = 60;
    const g = c.getContext('2d');
    g.fillStyle = '#2a1510';
    g.fillRect(0, 0, 120, 60);
    const brick = (x, y, w) => {
      g.fillStyle = `hsl(${U.rand(6, 16)},${U.rand(45, 60)}%,${U.rand(24, 34)}%)`;
      g.fillRect(x + 2, y + 2, w - 4, 26);
      g.fillStyle = 'rgba(255,255,255,.06)';
      g.fillRect(x + 2, y + 2, w - 4, 4);
    };
    brick(0, 0, 60); brick(60, 0, 60);
    brick(-30, 30, 60); brick(30, 30, 60); brick(90, 30, 60);
    return (brickTile = c);
  }
  def({
    id: 'closing',
    mount(ctx) {
      const wall = ctx.div('position:absolute;inset:0');
      U.patternLayer(wall, bricks(), '', false);
      U.el('div', 'position:absolute;inset:0;box-shadow:inset 0 0 120px rgba(0,0,0,.8)', wall);
      return {
        frame() {
          const t = U.clamp(ctx.roundTime() / ctx.p.duration, 0, 1);
          const rMax = Math.hypot(ctx.w, ctx.h) / 2 + 30;
          const rMin = (ctx.p.min / 100) * Math.min(ctx.w, ctx.h);
          const r = U.lerp(rMax, rMin, Math.pow(t, 0.85));
          setMask(wall, `radial-gradient(circle at 50% 50%,transparent 0,transparent ${Math.max(0, r - 24)}px,#000 ${r}px)`);
          wall.style.filter = t > 0.85 ? `brightness(${1 + 0.4 * Math.sin(ctx.now * 10)})` : '';
        },
      };
    },
  });

  /* ── steamy window ── */
  def({
    id: 'steamy',
    mount(ctx) {
      const S = 0.5;
      const c = ctx.canvas(S, 'opacity:.94');
      const FOG = '214,222,228';
      let lx = null, ly = null, acc = 0;
      const fill = (a) => {
        c.g.globalCompositeOperation = 'source-over';
        c.g.fillStyle = `rgba(${FOG},${a})`;
        c.g.fillRect(0, 0, c.W, c.H);
      };
      const stamp = (x, y, r) => {
        const g = c.g;
        const grd = g.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, 'rgba(0,0,0,.9)');
        grd.addColorStop(0.6, 'rgba(0,0,0,.6)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd;
        g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      };
      const reset = () => {
        c.fit();
        fill(1);
        c.g.globalCompositeOperation = 'destination-out';
        c.g.font = `italic 700 ${Math.round(c.H * 0.09)}px "Segoe Print","Bradley Hand","Comic Sans MS",cursive`;
        c.g.textAlign = 'center';
        c.g.fillStyle = 'rgba(0,0,0,.85)';
        c.g.fillText('wipe me  ↔', c.W / 2, c.H / 2);
        c.g.font = `700 ${Math.round(c.H * 0.035)}px Consolas,monospace`;
        c.g.fillText('ct-07', c.W / 2, c.H / 2 + c.H * 0.08);
      };
      reset();
      return {
        resize: reset,
        frame(dt) {
          acc += dt * (ctx.p.refog / 100) * 0.22;
          if (acc > 0.02) { fill(acc); acc = 0; }
          if (!ctx.mouse.inside) { lx = null; return; }
          const x = ctx.mouse.x * S, y = ctx.mouse.y * S, r = (ctx.p.brush / 2) * S;
          c.g.globalCompositeOperation = 'destination-out';
          if (lx === null) stamp(x, y, r);
          else {
            const d = Math.hypot(x - lx, y - ly), n = Math.ceil(d / (r * 0.3));
            for (let i = 1; i <= n; i++) stamp(lx + ((x - lx) * i) / n, ly + ((y - ly) * i) / n, r);
          }
          lx = x; ly = y;
        },
      };
    },
  });

  /* ── scratch card ── */
  def({
    id: 'scratch',
    mount(ctx) {
      const S = 0.5;
      const c = ctx.canvas(S);
      let lx = null, ly = null;
      const paint = () => {
        c.fit();
        const g = c.g, W = c.W, H = c.H;
        g.globalCompositeOperation = 'source-over';
        const grd = g.createLinearGradient(0, 0, W, H);
        grd.addColorStop(0, '#b9bcc2'); grd.addColorStop(0.35, '#e3e5e8'); grd.addColorStop(0.5, '#9ea2a9');
        grd.addColorStop(0.7, '#d9dbdf'); grd.addColorStop(1, '#a3a7ad');
        g.fillStyle = grd;
        g.fillRect(0, 0, W, H);
        for (let i = 0; i < W * H * 0.004; i++) {
          g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.5)' : 'rgba(80,80,90,.25)';
          g.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5);
        }
        g.save();
        g.translate(W / 2, H / 2);
        g.rotate(-0.35);
        g.fillStyle = 'rgba(90,92,100,.35)';
        g.font = `800 ${Math.round(H * 0.035)}px system-ui,Segoe UI,sans-serif`;
        g.textAlign = 'center';
        for (let y = -H; y < H; y += H * 0.09)
          for (let x = -W; x < W; x += W * 0.36) g.fillText('ct-07 · SCRATCH TO REVEAL', x + (y / (H * 0.09)) * 40, y);
        g.restore();
      };
      paint();
      return {
        resize: paint,
        round: paint,
        frame() {
          if (!ctx.mouse.down || !ctx.mouse.inside) { lx = null; return; }
          const g = c.g, x = ctx.mouse.x * S, y = ctx.mouse.y * S;
          g.globalCompositeOperation = 'destination-out';
          g.lineCap = g.lineJoin = 'round';
          g.lineWidth = ctx.p.brush * S;
          g.beginPath();
          g.moveTo(lx === null ? x : lx, ly === null ? y : ly);
          g.lineTo(x + 0.01, y);
          g.stroke();
          lx = x; ly = y;
        },
      };
    },
  });

  /* ── redacted ── */
  def({
    id: 'censor',
    css: `.bar{position:absolute;background:#050505;color:#f2f2f2;display:flex;align-items:center;justify-content:center;overflow:hidden;
      font:800 13px/1 ui-monospace,Consolas,monospace;letter-spacing:.35em;box-shadow:0 2px 8px rgba(0,0,0,.4)}`,
    mount(ctx) {
      let bars = [], timer = 0;
      const layout = () => {
        const n = ctx.p.count;
        while (bars.length < n) { const b = ctx.div('', 'bar'); b.textContent = 'REDACTED'; bars.push(b); }
        while (bars.length > n) bars.pop().remove();
        for (const b of bars) {
          const w = (ctx.p.size / 100) * ctx.w * U.rand(0.7, 1.4), h = Math.max(22, ctx.h * U.rand(0.05, 0.11));
          Object.assign(b.style, { width: w + 'px', height: h + 'px', left: U.rand(-0.05, 1) * (ctx.w - w * 0.5) + 'px', top: U.rand(0, 1) * (ctx.h - h) + 'px', transform: `rotate(${U.rand(-4, 4)}deg)` });
        }
      };
      layout();
      return {
        update: layout, resize: layout, round: layout,
        frame(dt) { timer += dt; if (timer >= ctx.p.every) { timer = 0; layout(); } },
      };
    },
  });

  /* ── glimpse ── */
  def({
    id: 'glimpse',
    mount(ctx) {
      const d = ctx.div('position:absolute;inset:0;background:#030303;transition:opacity .07s linear;display:flex;align-items:flex-end;justify-content:center');
      const hint = U.el('div', 'margin-bottom:22px;font:700 13px/1 ui-monospace,Consolas,monospace;color:rgba(216,255,92,.6);letter-spacing:.1em', d);
      let t = 0;
      return {
        round() { t = 0; },
        frame(dt) {
          t += dt;
          const cyc = Math.max(ctx.p.every, ctx.p.show + 0.2);
          const ph = t % cyc;
          const vis = ph < ctx.p.show;
          d.style.opacity = vis ? '0' : '1';
          hint.textContent = vis ? '' : '👁 ' + Math.ceil(cyc - ph);
        },
      };
    },
  });

  /* ── heavy eyelids ── */
  def({
    id: 'blink',
    mount(ctx) {
      const lid = 'position:absolute;left:-15%;right:-15%;height:62%;background:linear-gradient(#0d0a09,#1a1210 85%,#2a1c18);';
      const top = ctx.div(lid + 'top:0;border-radius:0 0 50% 50%/0 0 38% 38%;box-shadow:0 10px 40px 12px rgba(0,0,0,.7)');
      const bot = ctx.div(lid + 'bottom:0;border-radius:50% 50% 0 0/38% 38% 0 0;box-shadow:0 -10px 40px 12px rgba(0,0,0,.7);background:linear-gradient(#2a1c18,#1a1210 15%,#0d0a09)');
      let next = ctx.p.every, ph = 'open', pt = 0, c = 0, again = false;
      return {
        frame(dt) {
          const p = ctx.p;
          pt += dt;
          if (ph === 'open') {
            next -= dt;
            c = 0.04 + 0.03 * Math.sin(ctx.now * 1.3);
            if (next <= 0) { ph = 'closing'; pt = 0; }
          } else if (ph === 'closing') {
            c = Math.min(1, pt / 0.13);
            if (pt >= 0.13) { ph = 'closed'; pt = 0; }
          } else if (ph === 'closed') {
            c = 1;
            if (pt >= (again ? 0.08 : p.closed)) { ph = 'opening'; pt = 0; }
          } else if (ph === 'opening') {
            c = 1 - Math.min(1, pt / 0.22);
            if (pt >= 0.22) {
              ph = 'open'; pt = 0;
              again = !again && Math.random() < 0.2;
              next = again ? 0.15 : p.every * U.rand(0.65, 1.35);
            }
          }
          top.style.transform = `translateY(${(-100 + c * 82).toFixed(2)}%)`;
          bot.style.transform = `translateY(${(100 - c * 82).toFixed(2)}%)`;
        },
      };
    },
  });

  /* ── flash round ── */
  def({
    id: 'flashround',
    css: `.fr-chip{position:absolute;top:44px;left:50%;transform:translateX(-50%);font:800 15px/1 ui-monospace,Consolas,monospace;color:#0c0d10;background:#d8ff5c;padding:6px 12px;border-radius:8px}
      .fr-black{position:absolute;inset:0;background:#040405;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;opacity:0;transition:opacity .45s ease;color:#fff;text-align:center}
      .fr-black b{font:900 34px/1 system-ui,Segoe UI,sans-serif;letter-spacing:.06em}
      .fr-black span{font:600 14px/1.3 system-ui,sans-serif;color:#9aa0aa}
      .fr-black small{font:700 11px/1 ui-monospace,Consolas,monospace;color:#d8ff5c;letter-spacing:.2em;margin-top:8px}`,
    mount(ctx) {
      const black = ctx.div('', 'fr-black');
      black.innerHTML = '<b>VISION EXPIRED</b><span>Trust your gut and make a guess.</span><small>ct-07 · FLASH ROUND</small>';
      const chip = ctx.div('', 'fr-chip');
      return {
        frame() {
          const left = ctx.p.seconds - ctx.roundTime();
          black.style.opacity = left <= 0 ? '1' : '0';
          chip.style.display = ctx.p.countdown && left > 0 ? '' : 'none';
          chip.textContent = '👁 ' + Math.max(0, left).toFixed(1) + 's';
          chip.style.background = left < 3 ? '#ff5c5c' : '#d8ff5c';
        },
      };
    },
  });

  /* ── low battery ── */
  def({
    id: 'lowbattery',
    css: `.bat{position:absolute;top:14px;left:16px;display:flex;align-items:center;gap:8px;font:800 13px/1 ui-monospace,Consolas,monospace;color:#fff;text-shadow:0 1px 3px #000}
      .bat i{display:block;width:34px;height:16px;border:2px solid #fff;border-radius:4px;position:relative;padding:2px;box-sizing:border-box}
      .bat i::after{content:"";position:absolute;right:-6px;top:3px;width:3px;height:6px;background:#fff;border-radius:0 2px 2px 0}
      .bat em{display:block;height:100%;background:#7dff7a;border-radius:1px}
      .bat.low{animation:ct-low 1s steps(2) infinite}.bat.low em{background:#ff4d4d}
      @keyframes ct-low{50%{opacity:.3}}
      .plug{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font:700 16px/1.4 system-ui,sans-serif;color:#777;text-align:center}`,
    mount(ctx) {
      const dark = ctx.div('position:absolute;inset:0;background:#000');
      const plug = ctx.div('display:none', 'plug');
      plug.innerHTML = '🔌<br>Please connect a charger';
      const bat = ctx.div('', 'bat');
      bat.innerHTML = '<i><em></em></i><span></span>';
      const em = bat.querySelector('em'), pct = bat.querySelector('span');
      let frac = 0;
      return {
        filter: () => `saturate(${(1 - 0.7 * frac).toFixed(2)})`,
        frame() {
          frac = U.clamp(ctx.roundTime() / ctx.p.drain, 0, 1);
          dark.style.opacity = (Math.pow(frac, 1.25) * 0.985).toFixed(3);
          const left = Math.round((1 - frac) * 100);
          em.style.width = left + '%';
          pct.textContent = left + '%';
          bat.classList.toggle('low', left <= 20);
          plug.style.display = left <= 0 ? '' : 'none';
        },
      };
    },
  });

  /* ── tiny tv ── */
  def({
    id: 'tinytv',
    css: `.tv{position:absolute;box-sizing:border-box;border-style:solid;border-color:#2a2b30;border-radius:22px;
      box-shadow:0 0 0 300vmax #121316,inset 0 0 40px rgba(0,0,0,.75),0 20px 60px rgba(0,0,0,.6)}
      .tv.noframe{border-width:0!important;border-radius:4px}
      .tv b{position:absolute;left:50%;bottom:-0.85em;transform:translateX(-50%);font:800 12px/1 ui-monospace,Consolas,monospace;color:#8b8f99;letter-spacing:.2em}
      .tv.noframe b{display:none}
      .ant{position:absolute;width:3px;background:#3a3b40;border-radius:2px;transform-origin:50% 100%}`,
    mount(ctx) {
      const tv = ctx.div('', 'tv');
      U.el('b', '', tv).textContent = 'ct-07';
      const a1 = ctx.div('', 'ant'), a2 = ctx.div('', 'ant');
      return {
        transform: () => `scale(${(ctx.p.scale / 100).toFixed(3)})`,
        frame() {
          const s = ctx.p.scale / 100, sw = ctx.w * s, sh = ctx.h * s;
          const B = ctx.p.frame ? Math.max(10, sw * 0.045) : 0;
          Object.assign(tv.style, { left: (ctx.w - sw) / 2 - B + 'px', top: (ctx.h - sh) / 2 - B + 'px', width: sw + 2 * B + 'px', height: sh + 2 * B + 'px', borderWidth: B + 'px' });
          tv.style.fontSize = Math.max(10, B * 0.8) + 'px';
          tv.classList.toggle('noframe', !ctx.p.frame);
          const topY = (ctx.h - sh) / 2 - B, L = Math.min(sh * 0.45, topY - 4);
          for (const [a, rot] of [[a1, -28], [a2, 24]]) {
            a.style.display = ctx.p.frame && L > 10 ? '' : 'none';
            Object.assign(a.style, { left: ctx.w / 2 + 'px', top: topY - L + 'px', height: L + 'px', transform: `rotate(${rot}deg)` });
          }
        },
      };
    },
  });
})();

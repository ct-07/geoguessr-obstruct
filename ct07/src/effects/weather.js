/* ct-07 Obstruct — WEATHER & MESS effects (things on, or in front of, the screen) */
(function () {
  'use strict';
  const CT = globalThis.CT07;
  const { defineEffect: def, util: U } = CT;

  /* ── windshield rain + wipers ── */
  def({
    id: 'rain',
    mount(ctx) {
      const c = ctx.canvas(0.75);
      let drops = [], wiper = null, wiperT = 0, angle = Math.PI;
      const spawn = (W, H) => {
        const big = Math.random() < 0.12;
        drops.push({ x: Math.random() * W, y: Math.random() * H, r: big ? U.rand(5, 11) : U.rand(1.2, 4.5), vy: 0, slide: big && Math.random() < 0.6, age: 0 });
      };
      return {
        resize: () => c.fit(),
        filter: () => `blur(${(0.3 + ctx.p.intensity / 160).toFixed(2)}px)`,
        frame(dt) {
          c.fit();
          const g = c.g, W = c.W, H = c.H, p = ctx.p;
          const rate = (p.intensity / 100) * 140;
          for (let n = rate * dt + Math.random(); n >= 1; n--) spawn(W, H);
          if (drops.length > 900) drops.splice(0, drops.length - 900);
          // wipers
          if (p.wiper > 0) {
            wiperT += dt;
            if (!wiper && wiperT >= p.wiper) { wiper = { t: 0 }; wiperT = 0; }
          }
          const px = W / 2, py = H * 1.08, len = Math.hypot(W / 2, H) * 1.02;
          let prevAngle = angle;
          if (wiper) {
            wiper.t += dt / 1.1;
            const k = wiper.t < 0.5 ? wiper.t * 2 : 2 - wiper.t * 2; // there and back
            angle = Math.PI - Math.PI * (0.5 - 0.5 * Math.cos(Math.PI * U.clamp(k, 0, 1)));
            if (wiper.t >= 1) { wiper = null; angle = Math.PI; }
            const lo = Math.min(prevAngle, angle) - 0.03, hi = Math.max(prevAngle, angle) + 0.03;
            drops = drops.filter((d) => {
              const a = Math.atan2(py - d.y, d.x - px);
              return !(a >= lo && a <= hi && Math.hypot(d.x - px, d.y - py) < len);
            });
          }
          g.clearRect(0, 0, W, H);
          for (const d of drops) {
            d.age += dt;
            if (d.slide) {
              d.vy = Math.min(80, d.vy + dt * 40);
              d.y += d.vy * dt;
              d.x += Math.sin(d.y * 0.05) * 0.2;
              if (Math.random() < dt * 3) drops.push({ x: d.x + U.rand(-1, 1), y: d.y - d.r, r: d.r * 0.3, vy: 0, slide: false, age: 0 });
            }
            const grd = g.createRadialGradient(d.x - d.r * 0.3, d.y - d.r * 0.35, d.r * 0.1, d.x, d.y, d.r);
            grd.addColorStop(0, 'rgba(255,255,255,.55)');
            grd.addColorStop(0.35, 'rgba(200,215,230,.18)');
            grd.addColorStop(0.85, 'rgba(20,30,40,.28)');
            grd.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = grd;
            g.beginPath();
            g.ellipse(d.x, d.y, d.r, d.r * (d.slide ? 1.25 : 1), 0, 0, 7);
            g.fill();
          }
          drops = drops.filter((d) => d.y < H + 20 && d.age < 40);
          if (wiper) {
            g.save();
            g.translate(px, py);
            g.rotate(-angle);
            g.fillStyle = '#121214';
            g.fillRect(0, -7, len, 14);
            g.fillStyle = '#2b2b30';
            g.fillRect(len * 0.25, -3, len * 0.75, 6);
            g.restore();
          }
        },
      };
    },
  });

  /* ── blizzard ── */
  def({
    id: 'snow',
    mount(ctx) {
      const white = ctx.div('position:absolute;inset:0;background:#f4f7fb');
      const frost = ctx.div('position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 50%,rgba(240,246,255,.75) 100%)');
      const c = ctx.canvas(1);
      let flakes = [];
      const make = (W, H, top) => ({ x: Math.random() * W, y: top ? -10 : Math.random() * H, r: Math.pow(Math.random(), 2.2) * 4 + 0.7, s: Math.random() * 6.28, z: U.rand(0.4, 1.4) });
      return {
        resize: () => c.fit(),
        frame(dt, t) {
          c.fit();
          const g = c.g, W = c.W, H = c.H, p = ctx.p;
          const want = Math.round((p.density / 100) * 700);
          while (flakes.length < want) flakes.push(make(W, H, false));
          if (flakes.length > want) flakes.length = want;
          const gust = 0.5 + 0.5 * Math.sin(t * 0.4) * Math.sin(t * 0.23 + 1);
          const wind = (p.wind / 100) * 260 * (0.5 + gust);
          white.style.opacity = ((p.whiteout / 100) * (0.35 + 0.65 * gust) * 0.85).toFixed(3);
          frost.style.opacity = (0.4 + p.density / 200).toFixed(2);
          g.clearRect(0, 0, W, H);
          g.fillStyle = 'rgba(255,255,255,.9)';
          g.beginPath();
          for (const f of flakes) {
            f.y += (40 + f.r * 30) * f.z * dt;
            f.x += (wind * f.z + Math.sin(t * 1.5 + f.s) * 20) * dt;
            if (f.y > H + 6) { Object.assign(f, make(W, H, true)); }
            if (f.x > W + 6) f.x = -6;
            else if (f.x < -6) f.x = W + 6;
            g.moveTo(f.x + f.r * f.z, f.y);
            g.arc(f.x, f.y, f.r * f.z, 0, 6.283);
          }
          g.fill();
        },
      };
    },
  });

  /* ── pea soup fog ── */
  def({
    id: 'fog',
    mount(ctx) {
      const base = ctx.div('position:absolute;inset:0;background:rgb(196,202,208)');
      const c = ctx.canvas(0.35);
      // pre-rendered fog puff sprite
      const sp = document.createElement('canvas');
      sp.width = sp.height = 256;
      const sg = sp.getContext('2d');
      const grd = sg.createRadialGradient(128, 128, 0, 128, 128, 128);
      grd.addColorStop(0, 'rgba(225,229,233,.85)');
      grd.addColorStop(0.5, 'rgba(215,220,225,.4)');
      grd.addColorStop(1, 'rgba(210,215,220,0)');
      sg.fillStyle = grd;
      sg.fillRect(0, 0, 256, 256);
      let puffs = [];
      return {
        resize: () => c.fit(),
        frame(dt) {
          c.fit();
          const g = c.g, W = c.W, H = c.H, p = ctx.p;
          const want = Math.round(8 + p.density * 0.35);
          while (puffs.length < want) puffs.push({ x: Math.random() * W * 1.4 - W * 0.2, y: Math.random() * H, s: U.rand(0.5, 1.6) * Math.max(W, H) * 0.55, v: U.rand(0.4, 1.2), a: U.rand(0.35, 0.9) });
          if (puffs.length > want) puffs.length = want;
          base.style.opacity = (p.density / 100) * 0.6;
          g.clearRect(0, 0, W, H);
          for (const f of puffs) {
            f.x += f.v * (p.speed / 100) * 30 * dt;
            if (f.x - f.s / 2 > W) f.x = -f.s / 2;
            g.globalAlpha = f.a * (0.3 + p.density / 140);
            g.drawImage(sp, f.x - f.s / 2, f.y - f.s / 2, f.s, f.s);
          }
          g.globalAlpha = 1;
        },
      };
    },
  });

  /* ── mud splatter ── */
  function splatSVG(color) {
    const pts = [];
    const n = U.randi(9, 15);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, r = U.rand(30, 48) * (Math.random() < 0.25 ? 1.35 : 1);
      pts.push([50 + Math.cos(a) * r, 50 + Math.sin(a) * r]);
    }
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < n; i++) {
      const p0 = pts[i], p1 = pts[(i + 1) % n];
      d += ` Q${p0[0]},${p0[1]} ${(p0[0] + p1[0]) / 2},${(p0[1] + p1[1]) / 2}`;
    }
    let drops = '';
    for (let i = 0; i < U.randi(4, 9); i++) {
      const a = Math.random() * 6.28, r = U.rand(52, 78);
      drops += `<circle cx="${50 + Math.cos(a) * r}" cy="${50 + Math.sin(a) * r}" r="${U.rand(2, 7)}"/>`;
    }
    return `<svg viewBox="-30 -30 160 160" width="100%" height="100%" style="overflow:visible"><g fill="${color}">${'<path d="' + d + 'Z"/>'}${drops}</g>
      <ellipse cx="38" cy="36" rx="12" ry="6" fill="rgba(255,255,255,.12)" transform="rotate(-30 38 36)"/></svg>`;
  }
  def({
    id: 'mud',
    css: `.splat{position:absolute;transition:opacity .25s ease,transform .25s ease;animation:ct-splat .18s ease-out}
      @keyframes ct-splat{from{transform:scale(.3)}}`,
    mount(ctx) {
      let splats = [], timer = 0;
      const add = () => {
        if (splats.length >= ctx.p.max) return;
        const s = U.rand(0.12, 0.3) * Math.min(ctx.w, ctx.h);
        const el = ctx.div(`left:${U.rand(-0.05, 0.95) * ctx.w - s / 2}px;top:${U.rand(-0.05, 0.95) * ctx.h - s / 2}px;width:${s}px;height:${s}px;rotate:${U.rand(0, 360)}deg`, 'splat');
        el.innerHTML = splatSVG(U.pick(['#4a3220', '#5b3d22', '#3b2a1b', '#6a4a2a']));
        const sp = { el, wipes: 0 };
        if (ctx.p.wipe) {
          el.classList.add('click');
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            sp.wipes++;
            el.style.opacity = String(1 - sp.wipes / 3);
            el.style.transform = `translateX(${sp.wipes * 12}px) scaleX(${1 + sp.wipes * 0.15})`;
            if (sp.wipes >= 3) { splats = splats.filter((x) => x !== sp); setTimeout(() => el.remove(), 260); }
          });
        }
        splats.push(sp);
      };
      return {
        round() { for (const s of splats) s.el.remove(); splats = []; },
        frame(dt) {
          timer += dt;
          if (timer >= ctx.p.every) { timer = 0; add(); }
          while (splats.length > ctx.p.max) splats.shift().el.remove();
        },
      };
    },
  });

  /* ── cracked screen ── */
  def({
    id: 'cracked',
    mount(ctx) {
      const c = ctx.canvas(1);
      let impacts = [];
      const seed = () => { impacts = Array.from({ length: ctx.p.impacts }, () => ({ x: U.rand(0.1, 0.9), y: U.rand(0.1, 0.9), s: Math.random() * 1e9 })); };
      const draw = () => {
        c.fit();
        const g = c.g, W = c.W, H = c.H;
        g.clearRect(0, 0, W, H);
        for (const imp of impacts) {
          let s = imp.s;
          const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
          const ix = imp.x * W, iy = imp.y * H, R = Math.max(W, H) * (0.35 + rnd() * 0.5);
          const rays = 9 + Math.floor(rnd() * 8);
          const ends = [];
          const line = (pts, wid, col) => {
            g.strokeStyle = col; g.lineWidth = wid;
            g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
            for (const q of pts) g.lineTo(q[0], q[1]);
            g.stroke();
          };
          for (let i = 0; i < rays; i++) {
            const a0 = (i / rays) * Math.PI * 2 + rnd() * 0.4;
            const pts = [[ix, iy]];
            let a = a0, x = ix, y = iy, len = R * (0.4 + rnd() * 0.6);
            const segs = 8 + Math.floor(rnd() * 8);
            for (let k = 0; k < segs; k++) {
              a += (rnd() - 0.5) * 0.5;
              x += Math.cos(a) * (len / segs); y += Math.sin(a) * (len / segs);
              pts.push([x, y]);
              if (rnd() < 0.18) { // branch
                const b = [[x, y]]; let ba = a + (rnd() < 0.5 ? 0.7 : -0.7), bx = x, by = y;
                for (let j = 0; j < 4; j++) { ba += (rnd() - 0.5) * 0.6; bx += Math.cos(ba) * len * 0.06; by += Math.sin(ba) * len * 0.06; b.push([bx, by]); }
                line(b, 1, 'rgba(255,255,255,.55)');
              }
            }
            ends.push(pts);
            line(pts.map((q) => [q[0] + 1, q[1] + 1]), 2, 'rgba(0,0,0,.35)');
            line(pts, 1.3, 'rgba(255,255,255,.75)');
          }
          // concentric spider-web rings connecting the rays
          for (const ring of [0.08, 0.17, 0.3]) {
            g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 0.9;
            g.beginPath();
            ends.forEach((pts, i) => {
              const q = pts[Math.min(pts.length - 1, Math.floor(pts.length * ring * 2.4))];
              const jitter = (rnd() - 0.5) * 6;
              if (i === 0) g.moveTo(q[0] + jitter, q[1] + jitter); else g.lineTo(q[0] + jitter, q[1] + jitter);
            });
            g.closePath(); g.stroke();
          }
          const grd = g.createRadialGradient(ix, iy, 0, ix, iy, 40);
          grd.addColorStop(0, 'rgba(255,255,255,.65)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = grd; g.beginPath(); g.arc(ix, iy, 40, 0, 7); g.fill();
        }
      };
      seed(); draw();
      return {
        resize: draw,
        update() { seed(); draw(); },
        round() { if (ctx.p.perRound) { seed(); draw(); } },
      };
    },
  });

  /* ── greasy fingerprints (backdrop blur) ── */
  def({
    id: 'greasy',
    css: `.print{position:absolute;border-radius:46% 46% 50% 50%/58% 58% 42% 42%;
      background:repeating-radial-gradient(ellipse at 50% 60%,rgba(255,255,255,.13) 0 1.6px,rgba(255,255,255,0) 1.6px 4.2px);
      -webkit-mask-image:radial-gradient(ellipse at center,#000 45%,transparent 72%);mask-image:radial-gradient(ellipse at center,#000 45%,transparent 72%)}`,
    mount(ctx) {
      let prints = [];
      const layout = () => {
        for (const p of prints) p.remove();
        prints = [];
        for (let i = 0; i < ctx.p.count; i++) {
          const s = U.rand(0.08, 0.17) * Math.min(ctx.w, ctx.h) * 1.4;
          const el = ctx.div(`left:${Math.random() * (ctx.w - s * 0.7)}px;top:${Math.random() * (ctx.h - s)}px;width:${s * 0.72}px;height:${s}px;transform:rotate(${U.rand(-60, 60)}deg)`, 'print');
          prints.push(el);
        }
        restyle();
      };
      const restyle = () => {
        const bf = `blur(${ctx.p.blur}px) brightness(1.08) saturate(.85)`;
        for (const el of prints) { el.style.backdropFilter = bf; el.style.webkitBackdropFilter = bf; }
      };
      layout();
      let lastCount = ctx.p.count;
      return {
        update() { if (ctx.p.count !== lastCount) { lastCount = ctx.p.count; layout(); } else restyle(); },
        resize: layout,
        round: layout,
      };
    },
  });

  /* ── infestation ── */
  def({
    id: 'bugs',
    css: `.bug{position:absolute;left:0;top:0;line-height:1;user-select:none;filter:drop-shadow(0 3px 3px rgba(0,0,0,.45));will-change:transform}
      .bug.dead{transition:opacity 1.2s ease;opacity:0}`,
    mount(ctx) {
      const KINDS = ['🕷️', '🪳', '🐜', '🪲', '🦟', '🐛', '🐞', '🦗'];
      let bugs = [];
      const spawn = (edge) => {
        const el = ctx.div('', 'bug click');
        el.textContent = U.pick(KINDS);
        const b = { el, x: Math.random() * ctx.w, y: Math.random() * ctx.h, a: Math.random() * 6.28, pause: 0, dead: false };
        if (edge) { if (Math.random() < 0.5) b.x = Math.random() < 0.5 ? -30 : ctx.w + 30; else b.y = Math.random() < 0.5 ? -30 : ctx.h + 30; b.a = Math.atan2(ctx.h / 2 - b.y, ctx.w / 2 - b.x); }
        el.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          if (b.dead) return;
          b.dead = true;
          el.textContent = '💥';
          el.classList.add('dead');
          setTimeout(() => { el.remove(); bugs = bugs.filter((x) => x !== b); }, 1300);
        });
        bugs.push(b);
      };
      return {
        frame(dt) {
          const p = ctx.p;
          const alive = bugs.filter((b) => !b.dead);
          if (alive.length < p.count && Math.random() < dt * 3) spawn(bugs.length > 0);
          if (alive.length > p.count) { const b = alive[0]; b.el.remove(); bugs = bugs.filter((x) => x !== b); }
          for (const b of bugs) {
            b.el.style.fontSize = p.size + 'px';
            if (b.dead) continue;
            if (b.pause > 0) b.pause -= dt;
            else {
              b.a += U.rand(-3, 3) * dt;
              b.x += Math.cos(b.a) * p.speed * dt;
              b.y += Math.sin(b.a) * p.speed * dt;
              if (Math.random() < dt * 0.4) b.pause = U.rand(0.3, 2);
              const m = 60;
              if (b.x < -m || b.x > ctx.w + m || b.y < -m || b.y > ctx.h + m) b.a = Math.atan2(ctx.h / 2 - b.y, ctx.w / 2 - b.x) + U.rand(-0.6, 0.6);
            }
            const wig = b.pause > 0 ? 0 : Math.sin(ctx.now * 25 + b.x) * 6;
            b.el.style.transform = `translate(${b.x - p.size / 2}px,${b.y - p.size / 2}px) rotate(${((b.a * 180) / Math.PI + 90 + wig).toFixed(1)}deg)`;
          }
        },
      };
    },
  });

  /* ── sticky notes ── */
  const NOTES = [
    'is that a bollard??', 'check the plates!', "it's Brazil.\nit's always Brazil.", 'follow the sun ☀️', 'never trust\nthe car meta',
    'left side driving?', 'look for poles', 'ct-07 says: guess Poland', 'is the grass\ntoo green?', 'remember\nbuy milk', 'Cyrillic → panic',
    'zoom on signs\n(oh wait)', 'Google car shadow?', "don't spawn\nin a tunnel", 'SNOW = Russia?', 'red dirt = Australia\nor Brazil or...',
    'trust the vibes', 'if lost: Kenya', 'dashed lines\ncolour?', 'stop staring\nat this note', '— Callum T.',
  ];
  def({
    id: 'stickies',
    css: `.note{position:absolute;padding:16px 14px;box-sizing:border-box;white-space:pre-line;color:#2a2410;
      font:700 17px/1.25 "Segoe Print","Bradley Hand","Comic Sans MS",cursive;box-shadow:0 10px 18px rgba(0,0,0,.35),inset 0 -14px 20px rgba(0,0,0,.05);
      transition:transform .5s cubic-bezier(.5,-0.4,.7,1),opacity .5s ease;animation:ct-stick .3s ease-out}
      .note::before{content:"";position:absolute;left:0;right:0;top:0;height:22px;background:rgba(0,0,0,.06)}
      @keyframes ct-stick{from{transform:scale(1.4) rotate(0);opacity:0}}`,
    mount(ctx) {
      let notes = [], cooldown = 0;
      const COLORS = ['#fff27a', '#ffd1e8', '#bdf3ff', '#c8ffb0', '#ffd59a'];
      const add = () => {
        const s = ctx.p.size * U.rand(0.9, 1.15);
        const rot = U.rand(-9, 9);
        const el = ctx.div(`left:${U.rand(0.02, 0.98) * (ctx.w - s)}px;top:${U.rand(0.02, 0.98) * (ctx.h - s)}px;width:${s}px;height:${s}px;background:${U.pick(COLORS)};transform:rotate(${rot}deg);font-size:${s / 9}px`, 'note click');
        el.textContent = U.pick(NOTES);
        el.title = 'Click to peel off';
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          el.style.transform = `translateY(${ctx.h}px) rotate(${rot + U.rand(-90, 90)}deg)`;
          el.style.opacity = '0';
          notes = notes.filter((n) => n !== el);
          cooldown = 3;
          setTimeout(() => el.remove(), 600);
        });
        notes.push(el);
      };
      return {
        frame(dt) {
          cooldown -= dt;
          if (notes.length < ctx.p.count && cooldown <= 0) { add(); cooldown = 0.35; }
          while (notes.length > ctx.p.count) notes.shift().remove();
        },
      };
    },
  });

  /* ── pop-up ads ── */
  const ADS = [
    ['🚗 HOT GOOGLE CARS IN YOUR AREA', 'Lonely Street View cars are waiting to meet you. Click now!', 'Meet them'],
    ['🎉 CONGRATULATIONS!!!', 'You are the 1,000,000th visitor to Kenya. Claim your free snorkel.', 'CLAIM'],
    ['⚠️ WARNING', 'Your PC has (47) unidentified bollards. Scan now?', 'Scan'],
    ['📈 Doctors HATE him', 'Local man learns every Russian licence plate with ONE weird trick.', 'Learn more'],
    ['🧭 DOWNLOAD MORE SUN', 'Find north instantly. 100% legit, 0% shadows.', 'Download'],
    ['🔥 ct-07 PREMIUM', 'Now with 30% more obstruction. A Callum Telfer production.', 'Upgrade'],
    ['💰 Make $$$ from home', 'Guess Brazil every round. Win 50% of the time. Guaranteed*', 'Start'],
    ['🦘 Singles near Australia', 'They drive on the left. Just like you could.', 'Swipe'],
    ['📦 Your parcel is waiting', 'We tried to deliver to: 0.000, 0.000 (null island).', 'Track'],
    ['🎰 SPIN TO WIN', 'Win a free trip to a random location. You will be told nothing.', 'Spin'],
    ['🖥️ RAM DOWNLOAD', 'Download 16GB of Rift-speed RAM. Load panoramas 400% faster.', 'Get RAM'],
    ['🪧 Is it Poland?', 'Take this 2-question quiz. Q1: Is it Poland?', 'Begin'],
  ];
  def({
    id: 'ads',
    css: `.ad{position:absolute;width:300px;background:#c3c3c3;border:2px solid;border-color:#fff #404040 #404040 #fff;box-shadow:3px 3px 0 rgba(0,0,0,.35);
      font:12px/1.35 Tahoma,"MS Sans Serif",Verdana,sans-serif;color:#000;animation:ct-pop .18s ease-out;pointer-events:auto;user-select:none}
      @keyframes ct-pop{from{transform:scale(.6);opacity:0}}
      .ad .bar{display:flex;align-items:center;gap:6px;background:linear-gradient(90deg,#00087b,#1084d0);color:#fff;font-weight:700;padding:3px 3px 3px 6px;cursor:move}
      .ad .bar span{flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
      .ad .x{width:18px;height:16px;background:#c3c3c3;border:2px solid;border-color:#fff #404040 #404040 #fff;color:#000;font:900 11px/10px Tahoma,sans-serif;padding:0;cursor:pointer}
      .ad .x.fake{position:absolute;right:10px;bottom:10px;width:12px;height:12px;font-size:8px;line-height:6px;opacity:.7}
      .ad .body{padding:14px 14px 12px;display:flex;flex-direction:column;gap:12px}
      .ad .body p{margin:0;font-size:13px}
      .ad .btns{display:flex;gap:8px;justify-content:center}
      .ad .btns button{min-width:84px;padding:4px 10px;background:#c3c3c3;border:2px solid;border-color:#fff #404040 #404040 #fff;font:12px Tahoma,sans-serif;cursor:pointer}
      .ad .btns button.go{font-weight:700;animation:ct-blinkbtn .6s steps(2) infinite}
      @keyframes ct-blinkbtn{50%{background:#ffef5c}}
      .ad .foot{font-size:10px;color:#555;text-align:center}`,
    mount(ctx) {
      let ads = [], timer = ctx.p.every * 0.5;
      const close = (el) => { ads = ads.filter((a) => a !== el); el.remove(); };
      const add = (x, y) => {
        if (ads.length >= ctx.p.max) return;
        const [title, text, cta] = U.pick(ADS);
        const el = ctx.div('', 'ad');
        el.innerHTML = `<div class="bar"><span></span><button class="x" title="Close">✕</button></div>
          <div class="body"><p></p><div class="btns"><button class="go"></button><button class="no">No thanks</button></div><div class="foot">ct-07 AdNet™ · Callum Telfer</div></div>`;
        el.querySelector('.bar span').textContent = title;
        el.querySelector('p').textContent = text;
        el.querySelector('.go').textContent = cta;
        const w = 300, h = 170;
        el.style.left = (x ?? U.rand(0, Math.max(1, ctx.w - w))) + 'px';
        el.style.top = (y ?? U.rand(0, Math.max(1, ctx.h - h))) + 'px';
        el.style.transform = `scale(${U.rand(0.9, 1.15)})`;
        const sneaky = ctx.p.sneaky && Math.random() < 0.35;
        const realX = el.querySelector('.x');
        if (sneaky) {
          // the top-right X spawns more ads; the real close is the tiny one in the corner
          realX.addEventListener('click', (e) => { e.stopPropagation(); add(); add(); });
          const fake = U.el('button', '', el, 'x fake');
          fake.textContent = '✕';
          fake.addEventListener('click', (e) => { e.stopPropagation(); close(el); });
        } else realX.addEventListener('click', (e) => { e.stopPropagation(); close(el); });
        el.querySelector('.go').addEventListener('click', (e) => { e.stopPropagation(); add(); });
        el.querySelector('.no').addEventListener('click', (e) => {
          e.stopPropagation();
          if (Math.random() < 0.4) { e.target.textContent = 'Are you sure?'; return; }
          close(el);
        });
        // draggable by its title bar
        const bar = el.querySelector('.bar');
        bar.addEventListener('pointerdown', (e) => {
          if (e.target.closest('button')) return;
          e.stopPropagation();
          const sx = e.clientX - el.offsetLeft, sy = e.clientY - el.offsetTop;
          bar.setPointerCapture(e.pointerId);
          const mv = (ev) => { el.style.left = ev.clientX - sx + 'px'; el.style.top = ev.clientY - sy + 'px'; };
          const up = () => { bar.removeEventListener('pointermove', mv); bar.removeEventListener('pointerup', up); };
          bar.addEventListener('pointermove', mv);
          bar.addEventListener('pointerup', up);
        });
        el.addEventListener('pointerdown', (e) => e.stopPropagation());
        ads.push(el);
      };
      return {
        frame(dt) {
          timer += dt;
          if (timer >= ctx.p.every) { timer = 0; add(); }
          while (ads.length > ctx.p.max) close(ads[0]);
        },
      };
    },
  });

  /* ── DVD logo ── */
  const dvdSVG = (hue) => `<svg viewBox="0 0 200 110" width="100%" height="100%"><g fill="hsl(${hue},95%,60%)">
      <text x="100" y="62" text-anchor="middle" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="64" font-style="italic" letter-spacing="-3">ct-07</text>
      <ellipse cx="100" cy="88" rx="78" ry="14"/></g>
      <text x="100" y="93" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="11" letter-spacing="2.5" fill="#000">CALLUM TELFER</text></svg>`;
  def({
    id: 'dvd',
    mount(ctx) {
      let logos = [];
      return {
        frame(dt) {
          const p = ctx.p;
          while (logos.length < p.count) {
            const el = ctx.div('position:absolute;left:0;top:0;filter:drop-shadow(0 4px 10px rgba(0,0,0,.5))');
            const hue = U.randi(0, 359);
            el.innerHTML = dvdSVG(hue);
            const a = U.rand(0.3, 1.2);
            logos.push({ el, x: U.rand(0, ctx.w * 0.6), y: U.rand(0, ctx.h * 0.6), vx: Math.cos(a), vy: Math.sin(a), hue });
          }
          while (logos.length > p.count) logos.pop().el.remove();
          const w = p.size, h = w * 0.55;
          for (const L of logos) {
            L.x += L.vx * p.speed * dt; L.y += L.vy * p.speed * dt;
            let hx = false, hy = false;
            if (L.x <= 0) { L.x = 0; L.vx = Math.abs(L.vx); hx = true; }
            if (L.x + w >= ctx.w) { L.x = ctx.w - w; L.vx = -Math.abs(L.vx); hx = true; }
            if (L.y <= 0) { L.y = 0; L.vy = Math.abs(L.vy); hy = true; }
            if (L.y + h >= ctx.h) { L.y = ctx.h - h; L.vy = -Math.abs(L.vy); hy = true; }
            if (hx || hy) { L.hue = (L.hue + U.randi(60, 200)) % 360; L.el.innerHTML = dvdSVG(L.hue); }
            if (hx && hy) ctx.toast('📀 IT HIT THE CORNER!');
            L.el.style.width = w + 'px';
            L.el.style.height = h + 'px';
            L.el.style.transform = `translate(${L.x}px,${L.y}px)`;
          }
        },
      };
    },
  });

  /* ── emoji storm ── */
  const EMOJI = {
    mix: ['😂', '🔥', '💯', '🤡', '👀', '🎉', '💀', '🥴', '😎', '🙈', '⭐', '💩'],
    food: ['🍕', '🍔', '🌮', '🍩', '🍣', '🥐', '🍉', '🧀', '🥨', '🍟', '🌭', '🍦'],
    animals: ['🐸', '🐧', '🦆', '🐙', '🦘', '🐨', '🐄', '🦒', '🐒', '🦩', '🐢', '🦔'],
    geo: ['🗺️', '🧭', '🚗', '📸', '🪧', '🌍', '🏔️', '🛣️', '🚏', '🏝️', '🌵', '🗿'],
  };
  def({
    id: 'emoji',
    mount(ctx) {
      const c = ctx.canvas(1);
      const sprites = {};
      const sprite = (e, s) => {
        const k = e + s;
        if (sprites[k]) return sprites[k];
        const cv = document.createElement('canvas');
        cv.width = cv.height = Math.ceil(s * 1.3);
        const g = cv.getContext('2d');
        g.font = `${s}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(e, cv.width / 2, cv.height / 2 + s * 0.05);
        return (sprites[k] = cv);
      };
      let items = [];
      return {
        resize: () => c.fit(),
        update() { for (const k in sprites) delete sprites[k]; items = []; },
        frame(dt, t) {
          c.fit();
          const g = c.g, W = c.W, H = c.H, p = ctx.p, set = EMOJI[p.set] || EMOJI.mix;
          const want = Math.round(p.density * 0.6);
          if (items.length < want && Math.random() < dt * want * 0.6) {
            items.push({ e: U.pick(set), x: Math.random() * W, y: -p.size, v: U.rand(60, 200), r: Math.random() * 6.28, vr: U.rand(-2, 2), s: U.rand(0.7, 1.3), sw: Math.random() * 6.28 });
          }
          g.clearRect(0, 0, W, H);
          items = items.filter((it) => it.y < H + p.size * 1.5);
          if (items.length > want * 1.5) items.length = Math.ceil(want * 1.5);
          for (const it of items) {
            it.y += it.v * dt;
            it.x += Math.sin(t * 1.2 + it.sw) * 30 * dt;
            it.r += it.vr * dt;
            const sp = sprite(it.e, Math.round(p.size * it.s));
            g.save();
            g.translate(it.x, it.y);
            g.rotate(it.r);
            g.drawImage(sp, -sp.width / 2, -sp.height / 2);
            g.restore();
          }
        },
      };
    },
  });

  /* ── lava lamp ── */
  def({
    id: 'lava',
    mount(ctx) {
      const c = ctx.canvas(0.25, 'filter:blur(18px) saturate(1.4)');
      let blobs = [];
      const HUES = [330, 15, 45, 280, 190, 120];
      return {
        resize: () => c.fit(),
        frame(dt, t) {
          c.fit();
          const g = c.g, W = c.W, H = c.H, p = ctx.p;
          while (blobs.length < p.blobs) blobs.push({ x: Math.random(), y: Math.random(), r: U.rand(0.08, 0.2), h: U.pick(HUES), ph: Math.random() * 6.28, sp: U.rand(0.05, 0.16) });
          if (blobs.length > p.blobs) blobs.length = p.blobs;
          c.cv.style.opacity = p.opacity / 100;
          g.clearRect(0, 0, W, H);
          for (const b of blobs) {
            const x = (b.x + 0.35 * Math.sin(t * b.sp + b.ph)) * W;
            const y = (0.5 + 0.55 * Math.sin(t * b.sp * 0.7 + b.ph * 2)) * H;
            const r = b.r * Math.min(W, H) * 2 * (1 + 0.15 * Math.sin(t * 0.8 + b.ph));
            g.fillStyle = `hsl(${(b.h + t * 6) % 360},95%,58%)`;
            g.beginPath();
            g.ellipse(x, y, r, r * (0.8 + 0.3 * Math.sin(t + b.ph)), Math.sin(t * 0.3 + b.ph), 0, 7);
            g.fill();
          }
        },
      };
    },
  });

  /* ── buffering ── */
  def({
    id: 'buffering',
    css: `.buf{position:absolute;inset:0;background:rgba(0,0,0,.55);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;
      color:#fff;font:600 15px/1 system-ui,Segoe UI,sans-serif;opacity:0;transition:opacity .2s ease}
      .buf i{width:58px;height:58px;border-radius:50%;border:6px solid rgba(255,255,255,.18);border-top-color:#fff;animation:ct-spin .8s linear infinite}
      .buf small{font:700 10px/1 ui-monospace,Consolas,monospace;color:#9aa0aa;letter-spacing:.18em}
      @keyframes ct-spin{to{transform:rotate(360deg)}}`,
    mount(ctx) {
      const box = ctx.div('', 'buf');
      box.innerHTML = '<i></i><span></span><small>ct-07 BROADBAND · CALLUM TELFER ISP</small>';
      const label = box.querySelector('span');
      let t = 0, on = 0, len = 0, pct = 0;
      return {
        filter: () => (on > 0 ? 'blur(10px) saturate(.6)' : ''),
        frame(dt) {
          t += dt;
          if (on <= 0 && t >= ctx.p.every) { t = 0; on = len = ctx.p.duration * U.rand(0.6, 1.4); pct = U.randi(3, 40); }
          if (on > 0) {
            on -= dt;
            pct = Math.min(99, pct + dt * U.rand(0, 40));
            label.textContent = `Buffering… ${Math.floor(pct)}%`;
          }
          box.style.opacity = on > 0 ? '1' : '0';
        },
      };
    },
  });
})();

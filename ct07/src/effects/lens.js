/* ct-07 Obstruct — LENS effects (colour / clarity filters) */
(function () {
  'use strict';
  const CT = globalThis.CT07;
  const { defineEffect: def, util: U } = CT;
  const SRGB = 'color-interpolation-filters="sRGB"';

  // Effect whose whole job is one SVG filter rebuilt from params.
  function svgEffect(id, build, extra) {
    def(Object.assign({
      id,
      mount(ctx) {
        const f = ctx.svgFilter();
        f.set(build(ctx.p, ctx));
        const self = {
          update(p) { f.set(build(p, ctx)); },
          filter: () => f.url,
          destroy: () => f.remove(),
        };
        return extra ? extra(ctx, self, f) : self;
      },
    }));
  }

  /* ── simple CSS filters ── */
  def({ id: 'blur', filter: (p) => `blur(${p.amount}px)` });
  def({ id: 'noir', filter: (p) => `grayscale(${p.amount}%) contrast(${p.contrast}%)` });
  def({ id: 'negative', filter: (p) => `invert(${p.amount}%)` });
  def({ id: 'acid', filter: (p, ctx) => `hue-rotate(${Math.round((ctx.now * p.speed) % 360)}deg) saturate(${p.saturation}%)` });

  /* ── 8-bit pixelation (flood/tile/dilate trick) ── */
  svgEffect('pixelate', (p) => {
    const s = Math.max(2, Math.round(p.size));
    const h = Math.floor(s / 2);
    return `<filter id="%ID%" x="0" y="0" width="1" height="1" ${SRGB}>
      <feFlood x="${h - 1}" y="${h - 1}" width="2" height="2"/>
      <feComposite width="${s}" height="${s}"/>
      <feTile result="a"/>
      <feComposite in="SourceGraphic" in2="a" operator="in"/>
      <feMorphology operator="dilate" radius="${h}"/>
    </filter>`;
  });

  /* ── posterize ── */
  svgEffect('posterize', (p) => {
    const L = Math.max(2, Math.round(p.levels));
    const t = Array.from({ length: L }, (_, i) => (i / (L - 1)).toFixed(3)).join(' ');
    return `<filter id="%ID%" ${SRGB}><feComponentTransfer>
      <feFuncR type="discrete" tableValues="${t}"/><feFuncG type="discrete" tableValues="${t}"/><feFuncB type="discrete" tableValues="${t}"/>
    </feComponentTransfer></filter>`;
  });

  /* ── colour-vision deficiency ── */
  const CVD = {
    protan: '0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0',
    deutan: '0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0',
    tritan: '0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0',
    achro: '0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0',
  };
  svgEffect('colorblind', (p) => `<filter id="%ID%" ${SRGB}><feColorMatrix type="matrix" values="${CVD[p.type] || CVD.deutan}"/></filter>`);

  /* ── sketchbook edge detection ── */
  svgEffect('sketch', (p) => {
    const s = p.strength;
    const edges = (src) => `<feConvolveMatrix in="${src}" order="3" kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1" preserveAlpha="true" result="e"/>
      <feComponentTransfer in="e" result="E"><feFuncR type="linear" slope="${s}"/><feFuncG type="linear" slope="${s}"/><feFuncB type="linear" slope="${s}"/></feComponentTransfer>`;
    if (p.style === 'neon') {
      return `<filter id="%ID%" ${SRGB}>${edges('SourceGraphic')}
        <feColorMatrix in="E" type="saturate" values="3" result="N"/>
        <feGaussianBlur in="N" stdDeviation="3" result="G"/>
        <feMerge><feMergeNode in="G"/><feMergeNode in="N"/></feMerge></filter>`;
    }
    const grey = '<feColorMatrix in="SourceGraphic" type="saturate" values="0" result="g"/>';
    if (p.style === 'blueprint') {
      return `<filter id="%ID%" ${SRGB}>${grey}${edges('g')}
        <feColorMatrix in="E" type="matrix" values="0.85 0 0 0 0.06  0.8 0 0 0 0.24  0.45 0 0 0 0.55  0 0 0 0 1"/></filter>`;
    }
    return `<filter id="%ID%" ${SRGB}>${grey}${edges('g')}
      <feColorMatrix in="E" type="matrix" values="-0.95 0 0 0 0.98  -0.95 0 0 0 0.95  -0.95 0 0 0 0.88  0 0 0 0 1"/></filter>`;
  });

  /* ── chromatic aberration ── */
  svgEffect('chroma', (p) => `<filter id="%ID%" x="-5%" y="-2%" width="110%" height="104%" ${SRGB}>
      <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r"/>
      <feOffset in="r" dx="${-p.offset}" dy="0" result="ro"/>
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g"/>
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b"/>
      <feOffset in="b" dx="${p.offset}" dy="0" result="bo"/>
      <feBlend in="ro" in2="g" mode="screen" result="rg"/>
      <feBlend in="rg" in2="bo" mode="screen"/>
    </filter>`,
  (ctx, self, f) => {
    self.frame = (dt, t) => {
      if (!ctx.p.wobble || !f.node) return;
      const d = ctx.p.offset * (0.55 + 0.45 * Math.sin(t * 1.7)) ;
      const dy = ctx.p.offset * 0.35 * Math.sin(t * 1.1);
      const offs = f.node.querySelectorAll('feOffset');
      offs[0].setAttribute('dx', (-d).toFixed(1)); offs[0].setAttribute('dy', dy.toFixed(1));
      offs[1].setAttribute('dx', d.toFixed(1)); offs[1].setAttribute('dy', (-dy).toFixed(1));
    };
    return self;
  });

  /* ── thermal camera ── */
  const HUD_CSS = `
    .hud{position:absolute;inset:0;font:600 12px/1.3 ui-monospace,Consolas,monospace;letter-spacing:.06em}
    .hud .tl,.hud .tr,.hud .bl,.hud .br{position:absolute;padding:14px 18px}
    .hud .tl{top:0;left:0}.hud .tr{top:0;right:0;text-align:right}.hud .bl{bottom:0;left:0}.hud .br{bottom:0;right:0;text-align:right}
    .hud svg{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);overflow:visible}
    .rec{animation:ct-rec 1s steps(2) infinite}@keyframes ct-rec{50%{opacity:0}}
  `;
  svgEffect('thermal', () => `<filter id="%ID%" ${SRGB}>
      <feColorMatrix type="matrix" values="0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0 0 0 1 0"/>
      <feGaussianBlur stdDeviation="1.2"/>
      <feComponentTransfer>
        <feFuncR type="table" tableValues="0 0.18 0.55 0.92 1 1"/>
        <feFuncG type="table" tableValues="0 0 0.05 0.35 0.78 1"/>
        <feFuncB type="table" tableValues="0.12 0.5 0.62 0.18 0.04 0.85"/>
      </feComponentTransfer></filter>`,
  (ctx, self) => {
    ctx.css(HUD_CSS);
    const hud = ctx.div('color:#fff;text-shadow:0 0 4px #000', 'hud');
    hud.innerHTML = `
      <div class="tl">ct-07 FLIR<br>WHT-HOT · x1.0</div>
      <div class="tr"><span class="rec">● </span>REC<br><span class="clock"></span></div>
      <div class="bl">CALLUM TELFER OPTICS<br>NUC OK</div>
      <div class="br"><span class="temp">--.-</span>°C<br>SPOT</div>
      <svg width="120" height="120" viewBox="-60 -60 120 120" fill="none" stroke="#fff" stroke-width="1.5">
        <path d="M-60 0h40M20 0h40M0-60v40M0 20v40"/><circle r="6"/>
        <path d="M-40-40h12M-40-40v12M40-40h-12M40-40v12M-40 40h12M-40 40v-12M40 40h-12M40 40v-12"/>
      </svg>`;
    const temp = hud.querySelector('.temp'), clock = hud.querySelector('.clock');
    let acc = 0, base = U.rand(14, 31);
    self.frame = (dt) => {
      hud.style.display = ctx.p.hud ? '' : 'none';
      acc += dt;
      if (acc > 0.25) {
        acc = 0;
        base += U.rand(-0.4, 0.4);
        temp.textContent = base.toFixed(1);
        clock.textContent = new Date().toTimeString().slice(0, 8);
      }
    };
    return self;
  });

  /* ── night vision ── */
  svgEffect('nightvision', () => `<filter id="%ID%" ${SRGB}>
      <feColorMatrix type="matrix" values="0.05 0.1 0.02 0 0  0.35 0.75 0.15 0 0.04  0.05 0.1 0.02 0 0  0 0 0 1 0"/>
      <feComponentTransfer><feFuncG type="gamma" amplitude="1.15" exponent="0.8"/><feFuncR type="gamma" amplitude="1.3" exponent="0.8"/><feFuncB type="gamma" amplitude="1.3" exponent="0.8"/></feComponentTransfer>
    </filter>`,
  (ctx, self) => {
    ctx.css(HUD_CSS);
    const grain = U.patternLayer(ctx.layer, U.noiseTile('grey'), 'filter:sepia(1) hue-rotate(55deg) saturate(4) brightness(.85)');
    ctx.div('position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.28) 0 1px,transparent 1px 3px)');
    ctx.div('position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 45%,rgba(0,10,0,.75) 85%,#000 100%)');
    const hud = ctx.div('color:#7dff7a;text-shadow:0 0 6px rgba(80,255,80,.8)', 'hud');
    hud.innerHTML = `<div class="tl">NV-07 GEN III<br>GAIN AUTO</div><div class="tr"><span class="rec">●</span> REC<br><span class="clock"></span></div><div class="bl">ct-07 · CALLUM TELFER</div><div class="br">IR ON<br>BAT ▮▮▮▯</div>`;
    const clock = hud.querySelector('.clock');
    self.frame = () => {
      grain.style.opacity = (ctx.p.noise / 100) * 0.3;
      grain.style.transform = `translate(${U.rand(-25, 25)}%,${U.rand(-25, 25)}%)`;
      hud.style.display = ctx.p.hud ? '' : 'none';
      clock.textContent = new Date().toTimeString().slice(0, 8);
    };
    return self;
  });

  /* ── sun glare ── */
  def({
    id: 'glare',
    mount(ctx) {
      const sun = ctx.div('position:absolute;width:150vmax;height:150vmax;border-radius:50%;margin:-75vmax 0 0 -75vmax;' +
        'background:radial-gradient(circle,rgba(255,255,245,1) 0,rgba(255,250,225,.85) 4%,rgba(255,240,200,.45) 12%,rgba(255,230,180,.12) 28%,rgba(255,220,170,0) 45%)');
      const colors = ['rgba(120,255,200,.18)', 'rgba(255,160,90,.2)', 'rgba(140,170,255,.16)', 'rgba(255,255,255,.14)', 'rgba(255,120,200,.14)'];
      const flares = [0.45, 0.8, 1.25, 1.55, 2.0].map((k, i) => ({
        k, el: ctx.div(`position:absolute;border-radius:50%;background:radial-gradient(circle,${colors[i]} 0,${colors[i]} 55%,transparent 72%);`),
        r: [60, 24, 110, 40, 160][i],
      }));
      const seed = Math.random() * 100;
      return {
        filter() {
          const i = ctx.p.intensity / 100;
          return `brightness(${(1 + 0.4 * i).toFixed(2)}) contrast(${(1 - 0.3 * i).toFixed(2)}) saturate(${(1 - 0.25 * i).toFixed(2)})`;
        },
        frame(dt, t) {
          const i = ctx.p.intensity / 100;
          const T = t * 0.05 + seed;
          const x = ctx.w * (0.5 + 0.42 * Math.sin(T * 1.3)), y = ctx.h * (0.3 + 0.22 * Math.sin(T * 0.9 + 1));
          sun.style.transform = `translate(${x}px,${y}px) scale(${0.5 + i * 0.7})`;
          sun.style.opacity = (0.55 + 0.45 * i).toFixed(2);
          const cx = ctx.w / 2, cy = ctx.h / 2;
          for (const f of flares) {
            const fx = x + (cx - x) * f.k, fy = y + (cy - y) * f.k, r = f.r * (0.6 + i);
            Object.assign(f.el.style, { left: fx - r + 'px', top: fy - r + 'px', width: 2 * r + 'px', height: 2 * r + 'px', opacity: i });
          }
        },
      };
    },
  });

  /* ── old film ── */
  def({
    id: 'oldfilm',
    mount(ctx) {
      const grain = U.patternLayer(ctx.layer, U.noiseTile('grey'));
      const c = ctx.canvas(0.5);
      ctx.div('position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 40%,rgba(40,25,10,.55) 80%,rgba(10,5,0,.92) 100%)');
      let flick = 0, wx = 0, wy = 0, scratches = [], acc = 0;
      return {
        filter: () => `sepia(.85) contrast(1.15) brightness(${(0.93 + flick).toFixed(3)})`,
        transform: () => `translate(${wx.toFixed(2)}px,${wy.toFixed(2)}px)`,
        resize: () => c.fit(),
        frame(dt) {
          flick = U.rand(-0.07, 0.05);
          wx = U.lerp(wx, U.rand(-1.6, 1.6), 0.3);
          wy = U.lerp(wy, U.rand(-2.2, 2.2), 0.3);
          grain.style.opacity = (ctx.p.grain / 100) * 0.3;
          grain.style.transform = `translate(${U.rand(-25, 25)}%,${U.rand(-25, 25)}%)`;
          acc += dt;
          if (acc < 1 / 24) return; // 24fps film
          acc = 0;
          c.fit();
          const g = c.g, W = c.W, H = c.H;
          g.clearRect(0, 0, W, H);
          if (!ctx.p.scratches) return;
          if (Math.random() < 0.15) scratches.push({ x: Math.random() * W, life: U.randi(3, 18), a: U.rand(0.25, 0.7), w: U.rand(0.5, 1.5), drift: U.rand(-0.6, 0.6) });
          scratches = scratches.filter((s) => s.life-- > 0);
          for (const s of scratches) {
            s.x += s.drift;
            g.strokeStyle = `rgba(30,20,10,${s.a})`;
            g.lineWidth = s.w;
            g.beginPath();
            g.moveTo(s.x, 0);
            g.lineTo(s.x + U.rand(-2, 2), H);
            g.stroke();
          }
          const specks = U.randi(2, 9);
          for (let i = 0; i < specks; i++) {
            g.fillStyle = Math.random() < 0.8 ? 'rgba(20,12,5,.75)' : 'rgba(255,245,220,.6)';
            g.beginPath();
            g.arc(Math.random() * W, Math.random() * H, U.rand(0.5, 2.6), 0, 7);
            g.fill();
          }
          if (Math.random() < 0.12) { // hair
            g.strokeStyle = 'rgba(15,10,5,.7)';
            g.lineWidth = 0.8;
            const x = Math.random() * W, y = Math.random() * H;
            g.beginPath();
            g.moveTo(x, y);
            g.bezierCurveTo(x + U.rand(-30, 30), y + U.rand(-30, 30), x + U.rand(-30, 30), y + U.rand(-30, 30), x + U.rand(-40, 40), y + U.rand(-40, 40));
            g.stroke();
          }
        },
      };
    },
  });

  /* ── CRT monitor ── */
  def({
    id: 'crt',
    mount(ctx) {
      const lines = ctx.div('position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.9) 0 1px,transparent 1px 3px)');
      ctx.div('position:absolute;inset:0;opacity:.5;background:repeating-linear-gradient(90deg,rgba(255,0,0,.12) 0 1px,rgba(0,255,0,.1) 1px 2px,rgba(0,0,255,.12) 2px 3px)');
      const bar = ctx.div('position:absolute;left:0;right:0;height:22%;background:linear-gradient(transparent,rgba(255,255,255,.07) 50%,transparent)');
      const flash = ctx.div('position:absolute;inset:0;background:#fff;opacity:0');
      ctx.div('position:absolute;inset:0;border-radius:3.5%/6%;box-shadow:0 0 0 80px #050505,inset 0 0 90px 25px rgba(0,0,0,.85),inset 0 0 12px 4px rgba(0,0,0,.9)');
      let y = 0;
      return {
        filter: () => 'contrast(1.25) saturate(1.3) brightness(1.08) blur(0.5px)',
        frame(dt) {
          lines.style.opacity = (ctx.p.lines / 100) * 0.55;
          y = (y + dt * 0.12) % 1.3;
          bar.style.top = ((y - 0.2) * 100).toFixed(2) + '%';
          flash.style.opacity = ctx.p.flicker ? U.rand(0, 0.035).toFixed(3) : 0;
        },
      };
    },
  });

  /* ── bad signal / TV static ── */
  def({
    id: 'static',
    mount(ctx) {
      ctx.css(`.nosig{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font:700 28px/1 ui-monospace,Consolas,monospace;color:#fff;
        background:#1530c8;padding:10px 22px;letter-spacing:.12em;display:none;box-shadow:0 0 0 3px #fff}`);
      const noise = U.patternLayer(ctx.layer, U.noiseTile('grey', 160));
      const roll = ctx.div('position:absolute;left:0;right:0;height:9%;background:rgba(0,0,0,.55);display:none');
      const sig = ctx.div('', 'nosig');
      sig.textContent = 'NO SIGNAL';
      let next = U.rand(3, 9), drop = 0, dropLen = 0, tear = 0;
      return {
        transform: () => (tear ? `translateX(${tear.toFixed(1)}px) skewX(${(tear * 0.08).toFixed(2)}deg)` : ''),
        frame(dt) {
          next -= dt;
          if (ctx.p.dropouts && next <= 0 && drop <= 0) {
            dropLen = drop = U.rand(0.25, 1.4);
            next = U.rand(4, 12);
          }
          const dropping = drop > 0;
          if (dropping) drop -= dt;
          const base = ctx.p.opacity / 100;
          noise.style.opacity = dropping ? Math.min(0.97, base + 0.6) : base;
          noise.style.transform = `translate(${U.rand(-25, 25)}%,${U.rand(-25, 25)}%)`;
          tear = dropping ? U.rand(-40, 40) : Math.random() < 0.01 ? U.rand(-12, 12) : 0;
          roll.style.display = dropping ? '' : 'none';
          if (dropping) roll.style.top = ((1 - drop / dropLen) * 110 - 10).toFixed(1) + '%';
          sig.style.display = dropping && dropLen > 0.9 ? '' : 'none';
        },
      };
    },
  });
})();

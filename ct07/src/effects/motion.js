/* ct-07 Obstruct — MOTION effects (transforms on the panorama) */
(function () {
  'use strict';
  const CT = globalThis.CT07;
  const { defineEffect: def, util: U } = CT;

  def({ id: 'mirror', transform: () => 'scaleX(-1)' });
  def({ id: 'upsidedown', transform: () => 'rotate(180deg)' });
  def({ id: 'zoom', transform: (p) => `scale(${(p.zoom / 100).toFixed(2)})` });

  // Scale needed for a rotated w×h rect to still cover the w×h viewport.
  const cover = (w, h, deg) => {
    const a = (deg * Math.PI) / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
    return Math.max((w * c + h * s) / w, (w * s + h * c) / h);
  };

  def({
    id: 'spin',
    mount(ctx) {
      let a = 0;
      return {
        frame(dt) { a = (a + ctx.p.speed * dt) % 360; },
        transform: () => `rotate(${a.toFixed(2)}deg)` + (ctx.p.fill ? ` scale(${cover(ctx.w || 1, ctx.h || 1, a).toFixed(3)})` : ''),
      };
    },
  });

  def({
    id: 'drunk',
    mount(ctx) {
      const s = Math.random() * 100;
      let T = 0;
      return {
        frame(dt) { T += dt; },
        transform() {
          const i = ctx.p.intensity / 50, t = T + s;
          const rot = Math.sin(t * 0.7) * 2.6 * i + Math.sin(t * 1.9) * 0.6 * i;
          const tx = Math.sin(t * 0.43) * 24 * i, ty = Math.cos(t * 0.31) * 14 * i;
          return `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${(1.06 + 0.04 * i).toFixed(3)})`;
        },
        filter() {
          const i = ctx.p.intensity / 50, t = T + s;
          const b = Math.max(0, Math.sin(t * 0.9) * Math.sin(t * 0.37)) * 3.5 * i;
          return b > 0.05 ? `blur(${b.toFixed(2)}px)` : '';
        },
      };
    },
  });

  def({
    id: 'quake',
    mount(ctx) {
      let x = 0, y = 0, r = 0, shock = 0, next = U.rand(4, 10);
      return {
        frame(dt) {
          next -= dt;
          if (ctx.p.aftershocks && next <= 0) { shock = U.rand(1.2, 2.6); next = U.rand(6, 15); }
          shock = Math.max(0, shock - dt);
          const i = (ctx.p.intensity / 100) * (1 + Math.min(1, shock) * 3.5);
          const k = 0.45;
          x += (U.rand(-14, 14) * i - x) * k;
          y += (U.rand(-10, 10) * i - y) * k;
          r += (U.rand(-1, 1) * i - r) * k;
        },
        transform: () => `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${r.toFixed(2)}deg) scale(${(1.03 + ctx.p.intensity / 1500).toFixed(3)})`,
      };
    },
  });

  def({
    id: 'seasick',
    mount(ctx) {
      let T = Math.random() * 50;
      return {
        frame(dt) { T += dt; },
        transform() {
          const i = ctx.p.intensity / 50;
          const rx = Math.sin(T * 0.8) * 7 * i, ry = Math.sin(T * 0.53 + 1) * 9 * i, rz = Math.sin(T * 0.61) * 3 * i;
          return `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) translateY(${(Math.sin(T * 0.8) * 12 * i).toFixed(1)}px) scale(${(1.12 + 0.06 * i).toFixed(3)})`;
        },
      };
    },
  });

  def({
    id: 'funhouse',
    mount(ctx) {
      let T = 0;
      return {
        frame(dt) { T += dt * (0.4 + (ctx.p.speed / 100) * 3); },
        transform() {
          const i = ctx.p.intensity / 100;
          const sx = 1 + Math.sin(T) * 0.45 * i, sy = 1 - Math.sin(T) * 0.32 * i;
          return `scale(${sx.toFixed(3)},${sy.toFixed(3)}) skew(${(Math.sin(T * 0.7) * 14 * i).toFixed(2)}deg,${(Math.cos(T * 0.53) * 6 * i).toFixed(2)}deg)`;
        },
      };
    },
  });
})();

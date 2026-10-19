/* ct-07 Obstruct — CHAOS meta effects (they switch other effects on for you) */
(function () {
  'use strict';
  const CT = globalThis.CT07;
  const { defineEffect: def, registry: REG } = CT;

  const names = (ids) => ids.map((id) => REG.byId[id].icon + ' ' + REG.byId[id].name).join(' + ');

  function roll(ctx, n) {
    const picks = REG.randomPick(n, ctx.engine.activeIds());
    for (const id of picks) ctx.engine.addTemp(id, ctx.id);
    return picks;
  }

  def({
    id: 'roulette',
    mount(ctx) {
      let t = 0;
      const spin = () => {
        ctx.engine.removeTempFrom(ctx.id);
        const picks = roll(ctx, ctx.p.count);
        if (picks.length) ctx.toast('🎰 ' + names(picks));
      };
      spin();
      return {
        frame(dt) { t += dt; if (t >= ctx.p.every) { t = 0; spin(); } },
        destroy: () => ctx.engine.removeTempFrom(ctx.id),
      };
    },
  });

  def({
    id: 'mystery',
    mount(ctx) {
      const deal = () => {
        ctx.engine.removeTempFrom(ctx.id);
        const picks = roll(ctx, ctx.p.count);
        ctx.toast(ctx.p.reveal ? '🎁 Mystery: ' + names(picks) : '🎁 Mystery loadout armed…');
      };
      deal();
      return { round: deal, destroy: () => ctx.engine.removeTempFrom(ctx.id) };
    },
  });

  def({
    id: 'escalation',
    mount(ctx) {
      let t = 0, stacked = 0;
      const reset = () => { ctx.engine.removeTempFrom(ctx.id); t = 0; stacked = 0; };
      return {
        round: reset,
        frame(dt) {
          t += dt;
          if (t < ctx.p.every || stacked >= ctx.p.max) return;
          t = 0;
          const picks = roll(ctx, 1);
          if (picks.length) { stacked++; ctx.toast('📈 Level ' + stacked + ': ' + names(picks)); }
        },
        destroy: reset,
      };
    },
  });
})();

/* ct-07 Obstruct — HUD effects (page CSS on GeoGuessr's own UI) */
(function () {
  'use strict';
  const CT = globalThis.CT07;
  const { defineEffect: def } = CT;

  def({
    id: 'nocompass',
    pageCSS: () => '[class*="compass"],[data-qa="compass"]{visibility:hidden!important}',
  });

  def({
    id: 'mapfog',
    pageCSS: (p) => {
      const f = `blur(${p.blur}px)${p.grey ? ' grayscale(1)' : ''}`;
      return `[class*="guess-map"] .gm-style,[class*="guessMap"] .gm-style,[data-qa="guess-map"] .gm-style{filter:${f}!important}`;
    },
  });
})();

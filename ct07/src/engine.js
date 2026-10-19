/* ct-07 Obstruct — content engine
 * Finds the Street View panorama, puts an overlay layer next to it, and runs every
 * active effect: CSS filters + transforms on the panorama, DOM/canvas on the overlay.
 */
(function () {
  'use strict';
  const CT = (globalThis.CT07 = globalThis.CT07 || {});
  const REG = CT.registry;
  const impls = (CT.impls = {});
  CT.defineEffect = (def) => (impls[def.id] = def);

  const GUESS_MAP_SEL = '[class*="guess-map"], [class*="guessMap"], [data-qa="guess-map"], [class*="result-map"], [class*="resultMap"]';
  const HUD_SEL = GUESS_MAP_SEL + ', [class*="compass"], [data-qa="round-number"], [class*="game-status"], [class*="status_inner"]';
  const PANO_FALLBACK_SEL = '[data-qa="panorama"], [class*="game-panorama_panorama"], [class*="panorama_panorama"], [class*="game_panorama"], .game-layout__panorama, [class*="panorama-canvas"]';
  const ROUND_SEL = '[data-qa="round-number"], [class*="round-number"], [class*="roundNumber"], [class*="round_number"]';

  let settings = null;
  const temp = new Map(); // effect id -> source meta id (roulette etc.)
  const instances = new Map(); // id -> { def, inst, layer, ctx, pkey }
  let target = null; // panorama container (filter lives here)
  let spinEl = null; // element that receives transforms (Google's .gm-style)
  let host = null, shadow = null, stack = null, uiLayer = null, badge = null, toastBox = null;
  let svgRoot = null, globalStyle = null;
  const size = { w: 0, h: 0, left: 0, top: 0 };
  const mouse = { cx: -1, cy: -1, x: -1, y: -1, down: false, seen: false, inside: false };
  const round = { start: performance.now(), key: '', lastReset: 0 };
  const applied = { filter: null, transform: null, overflow: null, css: null };
  let lastScan = 0;
  let now = performance.now();

  /* ───────────────────────── utilities ───────────────────────── */
  const U = (CT.util = {
    rand: (a, b) => a + Math.random() * (b - a),
    randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    el(tag, style, parent, cls) {
      const e = document.createElement(tag);
      if (style) e.style.cssText = style;
      if (cls) e.className = cls;
      if (parent) parent.appendChild(e);
      return e;
    },
    // Add CSS to a shadow root or document. Constructable sheets are CSSOM, so a strict page
    // CSP can't block them; fall back to a <style> element where they're unavailable.
    addCSS(root, css) {
      try {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(css);
        root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
        return sheet;
      } catch (e) {
        const st = document.createElement('style');
        st.textContent = css;
        (root.head || root).appendChild(st);
        return null;
      }
    },
    _noise: {},
    // Tileable noise texture canvas. mode: 'grey' | 'mono'
    noiseTile(mode = 'grey', sz = 192) {
      const key = mode + sz;
      if (U._noise[key]) return U._noise[key];
      const c = document.createElement('canvas');
      c.width = c.height = sz;
      const g = c.getContext('2d');
      const img = g.createImageData(sz, sz);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = mode === 'mono' ? (v > 127 ? 255 : 0) : v;
        img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      return (U._noise[key] = c);
    },
    // A canvas filled with a repeating tile. Textures are painted on canvases rather than
    // data: URLs so GeoGuessr's Content-Security-Policy can never block them.
    // over=true makes it 200% size (inset -50%) so it can be jittered with transforms.
    patternLayer(parent, tile, css = '', over = true, scale = over ? 2 : 1) {
      const cv = U.el('canvas', `position:absolute;${over ? 'left:-50%;top:-50%;width:200%;height:200%' : 'inset:0;width:100%;height:100%'};${css}`, parent);
      const paint = () => {
        const W = Math.ceil((innerWidth * (over ? 2 : 1)) / scale), H = Math.ceil((innerHeight * (over ? 2 : 1)) / scale);
        if (cv.width === W && cv.height === H) return;
        cv.width = W;
        cv.height = H;
        const g = cv.getContext('2d');
        g.fillStyle = g.createPattern(tile, 'repeat');
        g.fillRect(0, 0, W, H);
      };
      paint();
      cv.repaint = paint;
      return cv;
    },
  });

  /* ───────────────────────── SVG filter defs ───────────────────────── */
  let svgSeq = 0;
  function svgDef(markup) {
    if (!svgRoot || !svgRoot.isConnected) {
      svgRoot = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgRoot.setAttribute('width', '0');
      svgRoot.setAttribute('height', '0');
      svgRoot.setAttribute('aria-hidden', 'true');
      svgRoot.setAttribute('data-ct07', '');
      svgRoot.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
      svgRoot.innerHTML = '<defs></defs>';
      (document.body || document.documentElement).appendChild(svgRoot);
    }
    const id = 'ct07-f' + ++svgSeq;
    const wrap = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    wrap.innerHTML = markup.replace('%ID%', id);
    const f = wrap.firstElementChild;
    svgRoot.firstElementChild.appendChild(f);
    return { id, node: f, url: 'url(#' + id + ')', remove: () => f.remove() };
  }
  // Swappable SVG filter: call .set(markup) whenever params change; returns current url.
  function svgFilter() {
    let cur = null, lastMarkup = '';
    return {
      set(markup) {
        if (markup === lastMarkup && cur) return cur.url;
        if (cur) cur.remove();
        cur = svgDef(markup);
        lastMarkup = markup;
        return cur.url;
      },
      get url() { return cur ? cur.url : ''; },
      get node() { return cur ? cur.node : null; },
      remove() { if (cur) cur.remove(); cur = null; lastMarkup = ''; },
    };
  }
  CT.svgFilter = svgFilter;

  /* ───────────────────────── panorama discovery ───────────────────────── */
  function visibleRect(el) {
    if (!el || !el.isConnected) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 200 || r.height < 150) return null;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return null;
    return r;
  }

  function findPanorama() {
    const cands = new Set();
    document.querySelectorAll('.widget-scene-canvas, .widget-scene').forEach((c) => {
      const g = c.closest('.gm-style');
      if (g) cands.add(g);
    });
    let best = null, bestA = 0;
    const consider = (el) => {
      if (el.closest(GUESS_MAP_SEL) || (host && host.contains(el))) return;
      const r = visibleRect(el);
      if (!r) return;
      const a = r.width * r.height;
      if (a > bestA) { best = el; bestA = a; }
    };
    cands.forEach(consider);
    if (!best) document.querySelectorAll(PANO_FALLBACK_SEL).forEach(consider);
    if (!best) return null;

    const gm = best.classList.contains('gm-style') ? best : best.querySelector('.gm-style') || best.firstElementChild || best;
    // Climb single-child wrappers of identical size so the filter covers the whole pano,
    // but never swallow HUD, guess map or our own layer.
    let el = best;
    for (let i = 0; i < 4; i++) {
      const p = el.parentElement;
      if (!p || p === document.body || p === document.documentElement) break;
      if (host && p.contains(host)) break;
      const kids = [...p.children].filter((k) => k !== host && k.tagName !== 'SCRIPT' && k.tagName !== 'STYLE');
      if (kids.length !== 1) break;
      if (p.querySelector(HUD_SEL)) break;
      const a = p.getBoundingClientRect(), b = el.getBoundingClientRect();
      if (Math.abs(a.width - b.width) > 2 || Math.abs(a.height - b.height) > 2) break;
      el = p;
    }
    // Make sure transforms go to a descendant so the target can clip them.
    if (el === gm) {
      const inner = gm.firstElementChild;
      return { target: el, spin: inner || el };
    }
    return { target: el, spin: gm };
  }

  /* ───────────────────────── overlay host ───────────────────────── */
  const HOST_CSS = `
    :host{all:initial}
    .stack,.fx,.ui{position:absolute;inset:0;pointer-events:none;overflow:hidden}
    .fx>*{box-sizing:border-box}
    canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
    .click{pointer-events:auto;cursor:pointer}
    .ct-badge{position:absolute;top:10px;left:50%;transform:translateX(-50%);display:flex;gap:6px;align-items:center;
      font:600 11px/1 ui-monospace,SFMono-Regular,Consolas,monospace;color:#d8ff5c;background:rgba(12,13,16,.72);
      border:1px solid rgba(216,255,92,.35);border-radius:999px;padding:5px 10px;letter-spacing:.04em;white-space:nowrap;
      backdrop-filter:blur(4px);max-width:80%;overflow:hidden;text-overflow:ellipsis}
    .ct-badge b{color:#fff;font-weight:700}
    .ct-badge i{font-style:normal;color:#9aa0aa;overflow:hidden;text-overflow:ellipsis}
    .ct-toasts{position:absolute;top:42px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:6px}
    .ct-toast{font:700 14px/1.2 system-ui,Segoe UI,sans-serif;color:#0d0e10;background:#d8ff5c;padding:8px 14px;border-radius:10px;
      box-shadow:0 6px 24px rgba(0,0,0,.45);animation:ct-toast 2.6s ease forwards;white-space:nowrap}
    @keyframes ct-toast{0%{opacity:0;transform:translateY(-8px) scale(.96)}8%{opacity:1;transform:none}85%{opacity:1}100%{opacity:0;transform:translateY(-6px)}}
  `;

  function buildHost() {
    host = document.createElement('div');
    host.setAttribute('data-ct07-layer', '');
    shadow = host.attachShadow({ mode: 'open' });
    U.addCSS(shadow, HOST_CSS);
    stack = U.el('div', '', shadow, 'stack');
    uiLayer = U.el('div', 'z-index:100000', shadow, 'ui');
    badge = U.el('div', 'display:none', uiLayer, 'ct-badge');
    toastBox = U.el('div', '', uiLayer, 'ct-toasts');
    effectStyles.clear();
  }

  const effectStyles = new Set();
  function addEffectCSS(id, css) {
    if (effectStyles.has(id) || !shadow) return;
    effectStyles.add(id);
    U.addCSS(shadow, css);
  }

  function placeHost() {
    if (!host || !target) return;
    const parent = target.parentElement;
    if (!parent) return;
    if (host.parentElement !== parent || host.previousElementSibling !== target) {
      parent.insertBefore(host, target.nextSibling);
    }
    const cs = getComputedStyle(target);
    const z = cs.zIndex === 'auto' ? '0' : cs.zIndex;
    let css;
    if (cs.position === 'fixed') {
      const r = target.getBoundingClientRect();
      css = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;`;
    } else {
      css = `position:absolute;left:${target.offsetLeft}px;top:${target.offsetTop}px;width:${target.offsetWidth}px;height:${target.offsetHeight}px;`;
    }
    css += `z-index:${z};isolation:isolate;pointer-events:none;overflow:hidden;margin:0;padding:0;border:0;display:block;contain:layout`;
    if (host.style.cssText !== css) host.style.cssText = css;
    const r = host.getBoundingClientRect();
    const changed = Math.round(r.width) !== size.w || Math.round(r.height) !== size.h;
    size.w = Math.round(r.width);
    size.h = Math.round(r.height);
    size.left = r.left;
    size.top = r.top;
    if (changed) for (const it of instances.values()) it.inst && it.inst.resize && safe(() => it.inst.resize(size.w, size.h), it);
  }

  /* ───────────────────────── round tracking ───────────────────────── */
  function newRound(reason) {
    const t = performance.now();
    if (t - round.lastReset < 1500) { round.start = t; return; }
    round.start = t;
    round.lastReset = t;
    for (const it of instances.values()) it.inst && it.inst.round && safe(() => it.inst.round(reason), it);
  }
  function checkRound() {
    const el = document.querySelector(ROUND_SEL);
    const key = location.pathname + '|' + (el ? el.textContent.trim() : '');
    if (key !== round.key) {
      const first = !round.key;
      round.key = key;
      if (!first) newRound('round-change');
    }
  }

  /* ───────────────────────── effect lifecycle ───────────────────────── */
  function safe(fn, it) {
    try { return fn(); } catch (e) {
      console.warn('[ct-07] effect error', it && it.def && it.def.id, e);
    }
  }

  function makeCtx(id, def, layer) {
    const ctx = {
      id,
      layer,
      p: REG.paramsFor(settings, id),
      get w() { return size.w; },
      get h() { return size.h; },
      mouse,
      get now() { return now / 1000; },
      mountedAt: performance.now(),
      // Seconds into the round — or since this effect was switched on, if that was later.
      roundTime: () => (now - Math.max(round.start, ctx.mountedAt)) / 1000,
      toast,
      css: (css) => addEffectCSS(id, css),
      svgFilter,
      div: (style, cls) => U.el('div', style, layer, cls),
      // Canvas that tracks the overlay size. scale < 1 renders at lower resolution.
      canvas(scale = 1, style = '') {
        const cv = U.el('canvas', style, layer);
        const g = cv.getContext('2d');
        const fit = () => {
          const W = Math.max(1, Math.round(size.w * scale)), H = Math.max(1, Math.round(size.h * scale));
          if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; return true; }
          return false;
        };
        fit();
        return { cv, g, fit, get W() { return cv.width; }, get H() { return cv.height; }, scale };
      },
      engine: { addTemp, removeTempFrom, activeIds, pool: poolIds },
    };
    return ctx;
  }

  function mountEffect(id, order) {
    const def = impls[id];
    if (!def) return;
    const layer = U.el('div', `z-index:${order + 1}`, stack, 'fx');
    layer.dataset.fx = id;
    const it = { def, layer, ctx: null, inst: null, pkey: '' };
    it.ctx = makeCtx(id, def, layer);
    it.pkey = JSON.stringify(it.ctx.p);
    if (def.css) addEffectCSS(id, def.css);
    if (def.mount) it.inst = safe(() => def.mount(it.ctx), it) || null;
    instances.set(id, it);
  }

  function unmountEffect(id) {
    const it = instances.get(id);
    if (!it) return;
    if (it.inst && it.inst.destroy) safe(() => it.inst.destroy(), it);
    it.layer.remove();
    instances.delete(id);
    if (CT.impls[id] && CT.impls[id].meta) removeTempFrom(id);
  }

  function unmountAll() {
    for (const id of [...instances.keys()]) unmountEffect(id);
  }

  function activeIds() {
    if (!settings || !settings.master) return [];
    const ids = new Set();
    for (const [id, on] of Object.entries(settings.enabled)) if (on && REG.byId[id]) ids.add(id);
    for (const id of temp.keys()) ids.add(id);
    return REG.features.map((f) => f.id).filter((id) => ids.has(id));
  }

  function poolIds() {
    const busy = new Set(activeIds());
    return REG.features.filter((f) => !f.meta && !f.noRandom && !busy.has(f.id)).map((f) => f.id);
  }

  function addTemp(id, source) {
    if (!REG.byId[id] || (settings.enabled[id] && !temp.has(id))) return false;
    temp.set(id, source);
    lastScan = 0;
    return true;
  }
  function removeTempFrom(source) {
    for (const [id, src] of [...temp]) if (src === source) { temp.delete(id); lastScan = 0; }
  }

  function reconcile() {
    const want = target ? activeIds() : [];
    const wantSet = new Set(want);
    for (const id of [...instances.keys()]) if (!wantSet.has(id)) unmountEffect(id);
    want.forEach((id, i) => {
      if (!instances.has(id)) mountEffect(id, i);
      const it = instances.get(id);
      if (!it) return;
      it.layer.style.zIndex = String(i + 1);
      const p = REG.paramsFor(settings, id);
      const k = JSON.stringify(p);
      if (k !== it.pkey) {
        it.pkey = k;
        it.ctx.p = p;
        if (it.inst && it.inst.update) safe(() => it.inst.update(p), it);
      }
    });
    renderBadge(want);
  }

  /* ───────────────────────── badge + toasts ───────────────────────── */
  let badgeKey = '';
  function renderBadge(ids) {
    if (!badge) return;
    const show = settings && settings.ui.badge && ids.length > 0;
    // A meta effect can keep its picks secret (Mystery Loadout with "Announce picks" off).
    const temps = ids.filter((id) => temp.has(id) && REG.paramsFor(settings, temp.get(id)).reveal !== false);
    const key = show + '|' + ids.join(',') + '|' + temps.join(',');
    if (key === badgeKey) return;
    badgeKey = key;
    badge.style.display = show ? 'flex' : 'none';
    if (!show) return;
    const n = ids.filter((id) => !temp.has(id)).length;
    const secret = ids.length - n - temps.length;
    const tNames = temps.map((id) => REG.byId[id].icon + ' ' + REG.byId[id].name).join(' · ');
    badge.innerHTML = '';
    U.el('span', '', badge).textContent = 'ct-07';
    U.el('b', '', badge).textContent = n + ' on';
    if (tNames) U.el('i', '', badge).textContent = tNames;
    if (secret > 0) U.el('i', '', badge).textContent = '+ ' + secret + ' secret';
  }

  function toast(msg) {
    if (!toastBox) return;
    const t = U.el('div', '', toastBox, 'ct-toast');
    t.textContent = msg;
    setTimeout(() => t.remove(), 2700);
    while (toastBox.children.length > 3) toastBox.firstElementChild.remove();
  }

  /* ───────────────────────── panorama styling ───────────────────────── */
  function setStyle(el, prop, val, key) {
    if (applied[key] === val && el === applied[key + 'El']) return;
    const prevEl = applied[key + 'El'];
    if (prevEl && prevEl !== el) prevEl.style.removeProperty(prop);
    applied[key] = val;
    applied[key + 'El'] = el;
    if (!el) return;
    if (val) el.style.setProperty(prop, val, 'important');
    else el.style.removeProperty(prop);
  }

  function composeAndApply() {
    const filters = [], transforms = [], css = [];
    for (const [id, it] of instances) {
      const { def, inst, ctx } = it;
      const f = inst && inst.filter ? safe(() => inst.filter(), it) : def.filter ? safe(() => def.filter(ctx.p, ctx), it) : '';
      if (f) filters.push(f);
      const t = inst && inst.transform ? safe(() => inst.transform(), it) : def.transform ? safe(() => def.transform(ctx.p, ctx), it) : '';
      if (t) transforms.push(t);
      const c = def.pageCSS ? safe(() => def.pageCSS(ctx.p), it) : '';
      if (c) css.push(c);
    }
    setStyle(target, 'filter', filters.join(' '), 'filter');
    setStyle(spinEl, 'transform', transforms.join(' '), 'transform');
    if (spinEl && transforms.length) spinEl.style.setProperty('transform-origin', '50% 50%', 'important');
    else if (spinEl) spinEl.style.removeProperty('transform-origin');
    setStyle(target, 'overflow', transforms.length && spinEl !== target ? 'hidden' : '', 'overflow');
    const cssText = css.join('\n');
    if (cssText !== applied.css) {
      applied.css = cssText;
      if (!globalStyle) globalStyle = U.addCSS(document, '') || 'fallback';
      if (globalStyle !== 'fallback') globalStyle.replaceSync(cssText);
      else {
        let st = document.querySelector('style[data-ct07]');
        if (!st) {
          st = document.createElement('style');
          st.setAttribute('data-ct07', '');
          (document.head || document.documentElement).appendChild(st);
        }
        st.textContent = cssText;
      }
    }
  }

  function clearPanoStyles() {
    setStyle(null, 'filter', '', 'filter');
    setStyle(null, 'transform', '', 'transform');
    setStyle(null, 'overflow', '', 'overflow');
    if (spinEl) spinEl.style.removeProperty('transform-origin');
  }

  /* ───────────────────────── main loop ───────────────────────── */
  function scan() {
    const found = findPanorama();
    const t = found && found.target;
    if (t !== target) {
      unmountAll();
      clearPanoStyles();
      if (host) host.remove();
      host = null;
      const hadTarget = !!target;
      target = t || null;
      spinEl = found ? found.spin : null;
      if (target) {
        buildHost();
        placeHost();
        if (!hadTarget) newRound('pano-appeared');
      } else {
        temp.clear();
      }
    } else if (found && found.spin !== spinEl) {
      setStyle(null, 'transform', '', 'transform');
      spinEl = found.spin;
    }
    if (target) placeHost();
    checkRound();
  }

  let last = performance.now();
  function frame(t) {
    requestAnimationFrame(frame);
    now = t;
    const dt = Math.min(0.1, (t - last) / 1000);
    last = t;
    if (!settings) return;
    if (t - lastScan > 400) {
      lastScan = t;
      safe(scan);
      reconcile();
    }
    if (!target || !host) {
      if (applied.css) composeAndApply();
      return;
    }
    mouse.x = mouse.cx - size.left;
    mouse.y = mouse.cy - size.top;
    mouse.inside = mouse.seen && mouse.x >= 0 && mouse.y >= 0 && mouse.x <= size.w && mouse.y <= size.h;
    for (const it of instances.values()) {
      if (it.inst && it.inst.frame) safe(() => it.inst.frame(dt, t / 1000), it);
    }
    composeAndApply();
  }

  /* ───────────────────────── public API ───────────────────────── */
  CT.engine = {
    start(initial) {
      settings = initial;
      const opt = { capture: true, passive: true };
      window.addEventListener('pointermove', (e) => { mouse.cx = e.clientX; mouse.cy = e.clientY; mouse.seen = true; }, opt);
      window.addEventListener('pointerdown', (e) => { mouse.down = true; mouse.cx = e.clientX; mouse.cy = e.clientY; mouse.seen = true; }, opt);
      window.addEventListener('pointerup', () => (mouse.down = false), opt);
      window.addEventListener('blur', () => (mouse.down = false));
      window.addEventListener('resize', () => (lastScan = 0));
      requestAnimationFrame(frame);
    },
    setSettings(s) {
      settings = s;
      lastScan = 0;
    },
    toast,
    hasPanorama: () => !!target,
    newRound: () => newRound('manual'),
  };
})();

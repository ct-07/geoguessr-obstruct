/* ct-07 Obstruct — content bootstrap: engine, in-game panel, launcher, hotkeys */
(function () {
  'use strict';
  const CT = globalThis.CT07;
  if (CT.booted) return;
  CT.booted = true;
  const { store, registry: REG } = CT;
  let state = null;

  /* ── in-game panel + launcher (isolated in a shadow root) ── */
  let uiHost = null, uiRoot = null, launcher = null, floatBox = null, panelOpen = false, panelBuilt = false;
  const pos = { left: 64, top: 70 };

  function ensureUI() {
    if (uiHost && uiHost.isConnected) return;
    uiHost = document.createElement('div');
    uiHost.setAttribute('data-ct07-ui', '');
    uiHost.style.cssText = 'all:initial;position:fixed;z-index:2147483647;left:0;top:0;width:0;height:0';
    uiRoot = uiHost.attachShadow({ mode: 'open' });
    const cssURL = chrome.runtime.getURL('src/ui.css');
    const root = uiRoot;
    fetch(cssURL)
      .then((r) => r.text())
      .then((css) => CT.util.addCSS(root, css))
      .catch(() => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cssURL;
        root.appendChild(link);
      });
    launcher = document.createElement('button');
    launcher.className = 'ct-launch';
    launcher.title = 'ct-07 Obstruct (Alt+Shift+O)';
    launcher.innerHTML = 'ct<br>07<span class="n" hidden></span>';
    launcher.addEventListener('click', () => togglePanel());
    uiRoot.appendChild(launcher);
    floatBox = document.createElement('div');
    floatBox.className = 'ct-float';
    floatBox.hidden = true;
    uiRoot.appendChild(floatBox);
    document.documentElement.appendChild(uiHost);
    panelBuilt = false;
    // Keep GeoGuessr's keyboard shortcuts from firing while typing in our panel.
    for (const type of ['keydown', 'keyup', 'keypress']) {
      floatBox.addEventListener(type, (e) => { if (!CT.hotkey.capturing) e.stopPropagation(); });
    }
  }

  async function togglePanel(force) {
    ensureUI();
    panelOpen = force === undefined ? !panelOpen : force;
    floatBox.hidden = !panelOpen;
    if (panelOpen && !panelBuilt) {
      panelBuilt = true;
      const { panel } = await CT.mountPanel(floatBox, { mode: 'inpage', onClose: () => togglePanel(false) });
      makeDraggable(panel.querySelector('.ct-head'));
    }
    placeFloat();
    refreshLauncher();
  }

  function placeFloat() {
    if (!floatBox) return;
    pos.left = Math.max(4, Math.min(window.innerWidth - 120, pos.left));
    pos.top = Math.max(4, Math.min(window.innerHeight - 60, pos.top));
    floatBox.style.left = pos.left + 'px';
    floatBox.style.top = pos.top + 'px';
  }

  function makeDraggable(handle) {
    if (!handle) return;
    handle.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, input, label')) return;
      const sx = e.clientX - pos.left, sy = e.clientY - pos.top;
      handle.setPointerCapture(e.pointerId);
      const move = (ev) => { pos.left = ev.clientX - sx; pos.top = ev.clientY - sy; placeFloat(); };
      const up = () => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
    });
  }

  function refreshLauncher() {
    if (!launcher || !state) return;
    launcher.hidden = !state.ui.launcher || panelOpen;
    const n = Object.keys(state.enabled).length;
    const badge = launcher.querySelector('.n');
    badge.hidden = !n || !state.master;
    badge.textContent = n;
  }

  /* ── settings mutations from hotkeys / commands ── */
  function mutate(fn, msg) {
    fn(state);
    store.save(state, true);
    CT.engine.setSettings(state);
    refreshLauncher();
    if (msg) CT.engine.toast(typeof msg === 'function' ? msg() : msg);
  }

  const activeNames = () => REG.features.filter((f) => state.enabled[f.id]).map((f) => f.icon + ' ' + f.name).join(' + ');

  function runCommand(cmd) {
    if (!state) return;
    if (cmd === 'toggle-master') mutate((s) => (s.master = !s.master), () => (state.master ? '▶ ct-07 effects ON' : '⏸ ct-07 effects paused'));
    else if (cmd === 'toggle-panel') togglePanel();
    else if (cmd === 'randomize') mutate(store.ops.randomize, () => '🎲 ' + activeNames());
    else if (cmd === 'clear-all') mutate(store.ops.clear, '🧹 All effects off');
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'ct07-command') runCommand(msg.cmd);
  });

  // Per-effect hotkeys set in the panel.
  window.addEventListener('keydown', (e) => {
    if (!state || CT.hotkey.capturing || e.repeat) return;
    const t = e.composedPath()[0];
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    const combo = CT.hotkey.fromEvent(e);
    if (!combo) return;
    const id = Object.keys(state.hotkeys).find((k) => state.hotkeys[k] === combo);
    if (!id || !REG.byId[id]) return;
    e.preventDefault();
    e.stopPropagation();
    const f = REG.byId[id];
    mutate((s) => store.ops.toggle(s, id), () => f.icon + ' ' + f.name + (state.enabled[id] ? ' ON' : ' off'));
  }, true);

  window.addEventListener('resize', placeFloat);

  /* ── boot ── */
  store.load().then((s) => {
    state = s;
    CT.engine.start(state);
    ensureUI();
    refreshLauncher();
    store.onChange((ns) => {
      state = ns;
      CT.engine.setSettings(ns);
      refreshLauncher();
    });
  });
  // React may wipe nodes it doesn't own; re-attach our UI if that happens.
  setInterval(() => {
    if (state && uiHost && !uiHost.isConnected) {
      const wasOpen = panelOpen;
      uiHost = null;
      ensureUI();
      refreshLauncher();
      if (wasOpen) { panelOpen = false; togglePanel(true); }
    }
  }, 2000);
})();

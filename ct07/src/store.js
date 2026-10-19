/* ct-07 Obstruct — settings store (chrome.storage.local, one key) */
(function () {
  'use strict';
  const CT = (globalThis.CT07 = globalThis.CT07 || {});
  const KEY = 'ct07';
  const api = globalThis.chrome && chrome.storage && chrome.storage.local;

  function defaults() {
    return {
      v: 1,
      master: true,
      enabled: {},
      params: {},
      hotkeys: {},
      loadouts: [],
      ui: { badge: true, launcher: true, open: {} },
    };
  }

  function normalize(s) {
    const d = defaults();
    s = s && typeof s === 'object' ? s : {};
    return {
      v: 1,
      master: s.master !== false,
      enabled: Object.assign({}, s.enabled),
      params: Object.assign({}, s.params),
      hotkeys: Object.assign({}, s.hotkeys),
      loadouts: Array.isArray(s.loadouts) ? s.loadouts : [],
      ui: Object.assign(d.ui, s.ui),
    };
  }

  function load() {
    return new Promise((resolve) => {
      if (!api) return resolve(defaults());
      api.get(KEY, (res) => resolve(normalize(res && res[KEY])));
    });
  }

  let pending = null;
  let timer = 0;
  // Debounced so slider drags don't hammer storage.
  function save(state, immediate) {
    pending = normalize(state);
    clearTimeout(timer);
    const flush = () => {
      const s = pending;
      pending = null;
      if (api && s) api.set({ [KEY]: s });
    };
    if (immediate) flush();
    else timer = setTimeout(flush, 60);
  }

  function onChange(cb) {
    if (!(globalThis.chrome && chrome.storage && chrome.storage.onChanged)) return;
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[KEY]) cb(normalize(changes[KEY].newValue));
    });
  }

  // Shared mutations so popup / in-page panel / hotkeys behave identically.
  const ops = {
    toggle(s, id, on) {
      const want = on === undefined ? !s.enabled[id] : !!on;
      if (want) s.enabled[id] = true;
      else delete s.enabled[id];
      return s;
    },
    clear(s) {
      s.enabled = {};
      return s;
    },
    randomize(s) {
      const n = 2 + Math.floor(Math.random() * 2);
      s.enabled = {};
      for (const id of CT.registry.randomPick(n)) s.enabled[id] = true;
      s.master = true;
      return s;
    },
    applyLoadout(s, lo) {
      s.enabled = {};
      for (const id of lo.enabled) if (CT.registry.byId[id]) s.enabled[id] = true;
      for (const [id, p] of Object.entries(lo.params || {})) s.params[id] = Object.assign({}, s.params[id], p);
      s.master = true;
      return s;
    },
    setParam(s, id, key, val) {
      s.params[id] = Object.assign({}, s.params[id], { [key]: val });
      return s;
    },
    resetParams(s, id) {
      delete s.params[id];
      return s;
    },
    saveLoadout(s, name) {
      const enabled = Object.keys(s.enabled).filter((id) => s.enabled[id]);
      const params = {};
      for (const id of enabled) if (s.params[id]) params[id] = Object.assign({}, s.params[id]);
      s.loadouts.push({ id: 'u' + Date.now().toString(36), icon: '⭐', name, enabled, params, custom: true });
      return s;
    },
    deleteLoadout(s, id) {
      s.loadouts = s.loadouts.filter((l) => l.id !== id);
      return s;
    },
  };

  CT.store = { KEY, defaults, normalize, load, save, onChange, ops };
})();

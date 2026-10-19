/* ct-07 Obstruct — control panel UI (used by the toolbar popup and the in-game panel) */
(function () {
  'use strict';
  const CT = (globalThis.CT07 = globalThis.CT07 || {});
  const REG = CT.registry;
  const store = CT.store;

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'text') el.textContent = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) el.append(kid);
    return el;
  }

  /* ── hotkeys ── */
  const MOD_CODES = /^(Shift|Control|Alt|Meta|OS)(Left|Right)?$/;
  CT.hotkey = {
    fromEvent(e) {
      if (MOD_CODES.test(e.code) || !e.code) return null;
      const fkey = /^F\d+$/.test(e.code);
      if (!fkey && !(e.altKey || e.ctrlKey || e.metaKey)) return null;
      return [e.ctrlKey && 'Ctrl', e.altKey && 'Alt', e.shiftKey && 'Shift', e.metaKey && 'Meta', e.code].filter(Boolean).join('+');
    },
    label: (s) => (s || '').replace(/Key([A-Z])/, '$1').replace(/Digit(\d)/, '$1').replace(/Numpad(\d)/, 'Num$1'),
    matches(e, s) { return !!s && CT.hotkey.fromEvent(e) === s; },
    capturing: false,
  };

  const fmt = (v, p) => {
    const n = Number(v);
    return (p.step < 1 ? n.toFixed(1) : String(Math.round(n))) + (p.unit || '');
  };

  CT.mountPanel = async function mountPanel(root, opts = {}) {
    const inpage = opts.mode === 'inpage';
    let state = await store.load();
    const refs = { rows: {}, cats: {} };
    let query = '';

    const commit = (fn, immediate) => {
      fn(state);
      store.save(state, immediate);
      sync();
    };
    store.onChange((s) => {
      state = s;
      sync();
    });

    /* ── header ── */
    const master = h('input', { type: 'checkbox', onchange: (e) => commit((s) => (s.master = e.target.checked), true) });
    const head = h('header', { class: 'ct-head' },
      h('div', { class: 'ct-logo' },
        h('span', { class: 'ct-mark' }, 'ct', h('em', {}, '-'), '07'),
        h('div', {}, h('div', { class: 'ct-name', text: 'OBSTRUCT' }), h('div', { class: 'ct-by', text: 'by Callum Telfer' }))),
      h('label', { class: 'ct-switch big', title: 'Master switch' }, master, h('span', { class: 'ct-sw' })),
      inpage ? h('button', { class: 'ct-icon-btn', title: 'Close panel', onclick: () => opts.onClose && opts.onClose() }, '✕') : null);

    /* ── action bar ── */
    const statusN = h('b', {}, '0');
    const bar = h('div', { class: 'ct-bar' },
      h('button', { class: 'ct-btn primary', title: 'Roll a random combo', onclick: () => commit(store.ops.randomize, true) }, '🎲 Randomise'),
      h('button', { class: 'ct-btn', onclick: () => commit(store.ops.clear, true) }, 'Clear all'),
      h('div', { class: 'ct-status' }, statusN, ' active'));
    const activeChips = h('div', { class: 'ct-active' });

    /* ── loadouts ── */
    const loChips = h('div', { class: 'ct-chips' });
    // Inline naming row (prompt() is unreliable inside extension popups).
    const nameInput = h('input', { type: 'text', maxlength: '28', placeholder: 'Name this loadout' });
    const doSave = () => {
      const name = nameInput.value.trim();
      if (!name) return nameInput.focus();
      commit((s) => store.ops.saveLoadout(s, name), true);
      nameInput.value = '';
      nameRow.hidden = true;
    };
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSave();
      if (e.key === 'Escape') nameRow.hidden = true;
    });
    const nameRow = h('div', { class: 'ct-name-row', hidden: true }, nameInput, h('button', { class: 'ct-btn tiny', onclick: doSave }, 'Save'));
    const saveBtn = h('button', {
      class: 'ct-link', onclick: () => {
        if (!Object.keys(state.enabled).length) return flash(saveBtn, 'Turn something on first');
        nameRow.hidden = !nameRow.hidden;
        if (!nameRow.hidden) nameInput.focus();
      },
    }, '+ Save current');
    const moreBtn = h('button', { class: 'ct-link muted', onclick: () => commit((s) => (s.ui.allLoadouts = !s.ui.allLoadouts), true) });
    const loSec = h('section', { class: 'ct-sec' }, h('div', { class: 'ct-sec-h' }, h('span', { text: 'Loadouts' }), h('div', { class: 'ct-sec-acts' }, moreBtn, saveBtn)), nameRow, loChips);

    /* ── search ── */
    const search = h('input', {
      type: 'search', placeholder: `Search ${REG.features.length} handicaps…`, oninput: (e) => {
        query = e.target.value.trim().toLowerCase();
        filter();
      },
    });

    /* ── feature list ── */
    const list = h('div', { class: 'ct-list' });
    for (const cat of REG.categories) {
      const feats = REG.features.filter((f) => f.cat === cat.id);
      const count = h('span', { class: 'ct-cat-n' });
      const body = h('div', { class: 'ct-cat-body' });
      const sec = h('section', { class: 'ct-cat' },
        h('button', {
          class: 'ct-cat-h', onclick: () => commit((s) => (s.ui.open[cat.id] = !s.ui.open[cat.id]), true),
        }, h('span', { class: 'ct-cat-ico', text: cat.icon }), h('span', { class: 'ct-cat-t' }, h('b', { text: cat.name }), h('small', { text: cat.blurb })), count, h('i', { class: 'ct-chev' })),
        body);
      refs.cats[cat.id] = { sec, body, count, feats };
      for (const f of feats) body.append(buildRow(f));
      list.append(sec);
    }

    function buildRow(f) {
      const cb = h('input', { type: 'checkbox', onchange: (e) => commit((s) => store.ops.toggle(s, f.id, e.target.checked), true) });
      const hk = h('span', { class: 'ct-hk' });
      const optsBox = h('div', { class: 'ct-opts', hidden: true });
      const gear = h('button', { class: 'ct-icon-btn gear', title: 'Settings', onclick: () => { optsBox.hidden = !optsBox.hidden; row.classList.toggle('open', !optsBox.hidden); } }, '⚙');
      const row = h('div', { class: 'ct-row', 'data-id': f.id },
        h('div', { class: 'ct-row-top' },
          h('button', { class: 'ct-row-main', title: 'Toggle ' + f.name, onclick: () => commit((s) => store.ops.toggle(s, f.id), true) },
            h('span', { class: 'ct-ico', text: f.icon }),
            h('span', { class: 'ct-txt' }, h('b', { text: f.name }), h('small', { text: f.desc }))),
          hk, gear,
          h('label', { class: 'ct-switch' }, cb, h('span', { class: 'ct-sw' }))),
        optsBox);
      const controls = {};
      for (const p of f.params) {
        if (p.type === 'range') {
          const out = h('output', {});
          const inp = h('input', {
            type: 'range', min: p.min, max: p.max, step: p.step, oninput: (e) => {
              out.textContent = fmt(e.target.value, p);
              commit((s) => store.ops.setParam(s, f.id, p.key, Number(e.target.value)));
            },
          });
          controls[p.key] = { sync: (v) => { if (!inp.matches(':focus')) inp.value = v; out.textContent = fmt(v, p); } };
          optsBox.append(h('div', { class: 'ct-opt' }, h('div', { class: 'ct-opt-l' }, h('span', { text: p.label }), out), inp));
        } else if (p.type === 'select') {
          const seg = h('div', { class: 'ct-seg' });
          const btns = p.options.map(([val, lab]) => {
            const b = h('button', { onclick: () => commit((s) => store.ops.setParam(s, f.id, p.key, val), true) }, lab);
            seg.append(b);
            return [val, b];
          });
          controls[p.key] = { sync: (v) => btns.forEach(([val, b]) => b.classList.toggle('on', val === v)) };
          optsBox.append(h('div', { class: 'ct-opt' }, h('div', { class: 'ct-opt-l' }, h('span', { text: p.label })), seg));
        } else if (p.type === 'toggle') {
          const t = h('input', { type: 'checkbox', onchange: (e) => commit((s) => store.ops.setParam(s, f.id, p.key, e.target.checked), true) });
          controls[p.key] = { sync: (v) => (t.checked = !!v) };
          optsBox.append(h('label', { class: 'ct-opt inline' }, h('span', { text: p.label }), h('span', { class: 'ct-switch small' }, t, h('span', { class: 'ct-sw' }))));
        }
      }
      // hotkey binder
      const hkBtn = h('button', { class: 'ct-btn tiny' });
      let listening = false;
      const stopListening = () => {
        listening = false;
        CT.hotkey.capturing = false;
        window.removeEventListener('keydown', onKey, true);
        sync();
      };
      const onKey = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.code === 'Escape') return stopListening();
        if (e.code === 'Backspace' || e.code === 'Delete') {
          commit((s) => delete s.hotkeys[f.id], true);
          return stopListening();
        }
        const combo = CT.hotkey.fromEvent(e);
        if (!combo) return;
        commit((s) => {
          for (const k of Object.keys(s.hotkeys)) if (s.hotkeys[k] === combo) delete s.hotkeys[k];
          s.hotkeys[f.id] = combo;
        }, true);
        stopListening();
      };
      hkBtn.addEventListener('click', () => {
        if (listening) return stopListening();
        listening = true;
        CT.hotkey.capturing = true;
        hkBtn.textContent = 'Press keys… (Esc cancel, ⌫ clear)';
        hkBtn.classList.add('listening');
        window.addEventListener('keydown', onKey, true);
      });
      optsBox.append(h('div', { class: 'ct-opt inline' }, h('span', { text: 'Hotkey' }), hkBtn));
      if (f.pairs && f.pairs.length) {
        optsBox.append(h('div', { class: 'ct-pairs' }, h('span', { text: 'Pairs well with' }),
          f.pairs.filter((id) => REG.byId[id]).map((id) => h('button', {
            class: 'ct-chip small', title: 'Turn on ' + REG.byId[id].name,
            onclick: () => commit((s) => { store.ops.toggle(s, f.id, true); store.ops.toggle(s, id, true); }, true),
          }, '+ ' + REG.byId[id].icon + ' ' + REG.byId[id].name))));
      }
      if (f.params.length) optsBox.append(h('button', { class: 'ct-link', onclick: () => commit((s) => store.ops.resetParams(s, f.id), true) }, 'Reset to defaults'));
      refs.rows[f.id] = { row, cb, hk, hkBtn, controls, f, isListening: () => listening };
      return row;
    }

    /* ── footer settings ── */
    const setToggle = (key, label) => {
      const t = h('input', { type: 'checkbox', onchange: (e) => commit((s) => (s.ui[key] = e.target.checked), true) });
      refs['ui_' + key] = t;
      return h('label', { class: 'ct-opt inline' }, h('span', { text: label }), h('span', { class: 'ct-switch small' }, t, h('span', { class: 'ct-sw' })));
    };
    const isExt = !!(globalThis.chrome && chrome.tabs && chrome.tabs.create);
    const foot = h('footer', { class: 'ct-foot' },
      setToggle('badge', 'Show in-game status badge'),
      setToggle('launcher', 'Show ct-07 launcher button in game'),
      h('div', { class: 'ct-keys' },
        h('div', {}, h('kbd', { text: 'Alt+Shift+X' }), ' master on/off'),
        h('div', {}, h('kbd', { text: 'Alt+Shift+O' }), ' in-game panel'),
        h('div', {}, h('kbd', { text: 'Alt+Shift+R' }), ' randomise'),
        h('div', {}, h('kbd', { text: 'Alt+Shift+C' }), ' clear all'),
        isExt ? h('button', { class: 'ct-link', onclick: () => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }) }, 'Change shortcuts →') : null),
      h('div', { class: 'ct-sign' }, h('span', { class: 'ct-mark small' }, 'ct', h('em', {}, '-'), '07'), ` · Callum Telfer · v${REG.version}`));

    const scroller = h('div', { class: 'ct-scroll' }, bar, activeChips, loSec, h('div', { class: 'ct-search' }, search), list, foot);
    const panel = h('div', { class: 'ct' + (inpage ? ' inpage' : ' popup') }, head, scroller);
    root.innerHTML = '';
    root.append(panel);

    function flash(el, msg) {
      const old = el.textContent;
      el.textContent = msg;
      setTimeout(() => (el.textContent = old), 1400);
    }

    function filter() {
      for (const [cid, c] of Object.entries(refs.cats)) {
        let any = false;
        for (const f of c.feats) {
          const hit = !query || (f.name + ' ' + f.desc + ' ' + f.id).toLowerCase().includes(query);
          refs.rows[f.id].row.hidden = !hit;
          any = any || hit;
        }
        c.sec.hidden = !any;
        c.sec.classList.toggle('open', query ? any : !!state.ui.open[cid]);
      }
    }

    function sync() {
      master.checked = state.master;
      panel.classList.toggle('off', !state.master);
      const on = REG.features.filter((f) => state.enabled[f.id]);
      statusN.textContent = on.length;
      activeChips.innerHTML = '';
      for (const f of on) {
        activeChips.append(h('button', { class: 'ct-chip on', title: 'Turn off', onclick: () => commit((s) => store.ops.toggle(s, f.id, false), true) }, f.icon + ' ' + f.name + ' ✕'));
      }
      activeChips.hidden = on.length === 0;

      loChips.innerHTML = '';
      loChips.classList.toggle('clamped', !state.ui.allLoadouts);
      moreBtn.textContent = state.ui.allLoadouts ? 'Less ▴' : 'All ▾';
      for (const lo of [...REG.loadouts, ...state.loadouts]) {
        const enabledKey = Object.keys(state.enabled).sort().join(',');
        const isOn = lo.enabled.slice().sort().join(',') === enabledKey;
        const chip = h('button', {
          class: 'ct-chip' + (isOn ? ' on' : '') + (lo.custom ? ' custom' : ''),
          title: lo.enabled.map((id) => (REG.byId[id] ? REG.byId[id].name : id)).join(' + '),
          onclick: () => commit((s) => (isOn ? store.ops.clear(s) : store.ops.applyLoadout(s, lo)), true),
        }, (lo.icon || '⭐') + ' ' + lo.name);
        if (lo.custom) {
          chip.append(h('span', {
            class: 'ct-x', title: 'Delete loadout', onclick: (e) => { e.stopPropagation(); commit((s) => store.ops.deleteLoadout(s, lo.id), true); },
          }, '✕'));
        }
        loChips.append(chip);
      }

      for (const [id, r] of Object.entries(refs.rows)) {
        const isOn = !!state.enabled[id];
        r.cb.checked = isOn;
        r.row.classList.toggle('on', isOn);
        const p = REG.paramsFor(state, id);
        for (const [k, c] of Object.entries(r.controls)) c.sync(p[k]);
        const combo = state.hotkeys[id];
        r.hk.textContent = combo ? CT.hotkey.label(combo) : '';
        r.hk.hidden = !combo;
        if (!r.isListening()) {
          r.hkBtn.textContent = combo ? CT.hotkey.label(combo) : 'Set hotkey';
          r.hkBtn.classList.remove('listening');
        }
      }
      for (const c of Object.values(refs.cats)) {
        const n = c.feats.filter((f) => state.enabled[f.id]).length;
        c.count.textContent = n ? `${n}/${c.feats.length}` : String(c.feats.length);
        c.count.classList.toggle('lit', n > 0);
      }
      refs.ui_badge.checked = !!state.ui.badge;
      refs.ui_launcher.checked = !!state.ui.launcher;
      filter();
    }

    sync();
    return { panel, refresh: sync };
  };
})();

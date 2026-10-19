/* ct-07 Obstruct — feature registry (shared by popup, in-page panel and engine)
 * Callum Telfer · ct-07
 */
(function () {
  'use strict';
  const CT = (globalThis.CT07 = globalThis.CT07 || {});

  const range = (key, label, min, max, step, def, unit = '') => ({ type: 'range', key, label, min, max, step, def, unit });
  const select = (key, label, options, def) => ({ type: 'select', key, label, options, def });
  const toggle = (key, label, def) => ({ type: 'toggle', key, label, def });

  const categories = [
    { id: 'lens', name: 'Lens', icon: '🕶️', blurb: 'Filters that mess with colour and clarity' },
    { id: 'vision', name: 'Vision', icon: '👁️', blurb: 'Masks that limit what you can see' },
    { id: 'mess', name: 'Weather & Mess', icon: '🌧️', blurb: 'Stuff on the screen, falling or crawling' },
    { id: 'motion', name: 'Motion', icon: '🌀', blurb: 'The panorama refuses to sit still' },
    { id: 'hud', name: 'HUD', icon: '🧭', blurb: 'Take away the helpers' },
    { id: 'chaos', name: 'Chaos', icon: '🎰', blurb: 'Let ct-07 pick for you' },
  ];

  // group: random picks never combine two effects from the same group
  // pairs: suggested companions shown in the UI
  const features = [
    // ───────────── LENS ─────────────
    { id: 'blur', cat: 'lens', icon: '👓', name: 'Smudged Glasses', desc: 'Everything goes soft-focus.', group: 'blur',
      params: [range('amount', 'Blur', 1, 25, 1, 6, 'px')], pairs: ['greasy', 'rain'] },
    { id: 'noir', cat: 'lens', icon: '🎞️', name: 'Film Noir', desc: 'Black and white, high contrast. Good luck with plate colours.', group: 'colour',
      params: [range('amount', 'Greyscale', 10, 100, 5, 100, '%'), range('contrast', 'Contrast', 100, 250, 5, 140, '%')], pairs: ['oldfilm', 'blink'] },
    { id: 'negative', cat: 'lens', icon: '🔄', name: 'Negative', desc: 'Inverted colours. Blue skies become orange.', group: 'colour',
      params: [range('amount', 'Invert', 50, 100, 5, 100, '%')], pairs: ['static', 'flashlight'] },
    { id: 'pixelate', cat: 'lens', icon: '👾', name: '8-Bit', desc: 'Chunky pixels. Signs become abstract art.', group: 'pixel',
      params: [range('size', 'Block size', 4, 48, 2, 12, 'px')], pairs: ['crt', 'chroma'] },
    { id: 'posterize', cat: 'lens', icon: '🎨', name: 'Posterize', desc: 'Crushes colours down to a handful of flat tones.', group: 'colour',
      params: [range('levels', 'Levels', 2, 8, 1, 3)], pairs: ['pixelate', 'sketch'] },
    { id: 'colorblind', cat: 'lens', icon: '🚦', name: 'Colour Blind', desc: 'Simulates colour-vision deficiencies.', group: 'colour',
      params: [select('type', 'Type', [['protan', 'Protanopia'], ['deutan', 'Deuteranopia'], ['tritan', 'Tritanopia'], ['achro', 'Monochrome']], 'deutan')], pairs: ['blur'] },
    { id: 'thermal', cat: 'lens', icon: '🔥', name: 'Thermal Cam', desc: 'FLIR-style heat palette with a targeting HUD.', group: 'colour',
      params: [toggle('hud', 'Show HUD', true)], pairs: ['binoculars', 'quake'] },
    { id: 'nightvision', cat: 'lens', icon: '🌙', name: 'Night Vision', desc: 'Grainy green goggles.', group: 'colour',
      params: [range('noise', 'Grain', 0, 100, 5, 40, '%'), toggle('hud', 'Show HUD', true)], pairs: ['flashlight', 'binoculars'] },
    { id: 'sketch', cat: 'lens', icon: '✏️', name: 'Sketchbook', desc: 'Edge detection only — the world as a drawing.', group: 'colour',
      params: [select('style', 'Style', [['pencil', 'Pencil'], ['blueprint', 'Blueprint'], ['neon', 'Neon']], 'pencil'), range('strength', 'Line strength', 1, 8, 1, 3)], pairs: ['mosaic', 'stickies'] },
    { id: 'chroma', cat: 'lens', icon: '🌈', name: 'Chromatic Split', desc: 'Red and blue channels drift apart.', group: 'pixel',
      params: [range('offset', 'Offset', 2, 40, 1, 8, 'px'), toggle('wobble', 'Wobble', true)], pairs: ['crt', 'drunk'] },
    { id: 'acid', cat: 'lens', icon: '🍄', name: 'Acid Trip', desc: 'Hue cycles endlessly. Is that grass or sky?', group: 'colour',
      params: [range('speed', 'Speed', 10, 360, 10, 60, '°/s'), range('saturation', 'Saturation', 100, 400, 10, 200, '%')], pairs: ['funhouse', 'lava'] },
    { id: 'glare', cat: 'lens', icon: '☀️', name: 'Sun Glare', desc: 'A blinding sun drifts across with lens flares.', group: 'light',
      params: [range('intensity', 'Intensity', 10, 100, 5, 60, '%')], pairs: ['steamy', 'rain'] },
    { id: 'oldfilm', cat: 'lens', icon: '📽️', name: 'Old Film', desc: 'Sepia, grain, scratches, flicker and gate weave.', group: 'colour',
      params: [range('grain', 'Grain', 0, 100, 5, 50, '%'), toggle('scratches', 'Scratches & dust', true)], pairs: ['noir', 'blink'] },
    { id: 'crt', cat: 'lens', icon: '📺', name: 'CRT Monitor', desc: 'Scanlines, rolling bar, curved bezel.', group: 'screen',
      params: [range('lines', 'Scanlines', 10, 100, 5, 55, '%'), toggle('flicker', 'Flicker', true)], pairs: ['pixelate', 'static'] },
    { id: 'static', cat: 'lens', icon: '📡', name: 'Bad Signal', desc: 'TV static with random signal dropouts.', group: 'screen',
      params: [range('opacity', 'Static', 5, 90, 5, 30, '%'), toggle('dropouts', 'Dropouts', true)], pairs: ['crt', 'negative'] },

    // ───────────── VISION ─────────────
    { id: 'flashlight', cat: 'vision', icon: '🔦', name: 'Flashlight', desc: 'Pitch dark. A torch follows your mouse.', group: 'mask',
      params: [range('radius', 'Radius', 40, 500, 10, 170, 'px'), range('softness', 'Softness', 0, 100, 5, 40, '%'), range('dark', 'Darkness', 50, 100, 1, 98, '%'), toggle('flicker', 'Dying batteries', false)], pairs: ['nightvision', 'static'] },
    { id: 'tunnel', cat: 'vision', icon: '🕳️', name: 'Tunnel Vision', desc: 'Only the centre of the screen survives.', group: 'mask',
      params: [range('radius', 'Radius', 5, 60, 1, 22, '%'), range('softness', 'Softness', 0, 100, 5, 35, '%')], pairs: ['drunk', 'zoom'] },
    { id: 'binoculars', cat: 'vision', icon: '🔭', name: 'Binoculars', desc: 'Two circles and a reticle.', group: 'mask',
      params: [range('size', 'Size', 10, 45, 1, 24, '%'), toggle('reticle', 'Reticle', true)], pairs: ['thermal', 'zoom'] },
    { id: 'keyhole', cat: 'vision', icon: '🗝️', name: 'Keyhole', desc: 'Peeking through a door.', group: 'mask',
      params: [range('size', 'Size', 20, 100, 5, 55, '%')], pairs: ['noir', 'seasick'] },
    { id: 'slit', cat: 'vision', icon: '➖', name: 'The Slit', desc: 'A thin band of visibility, optionally scanning.', group: 'mask',
      params: [select('dir', 'Orientation', [['h', 'Horizontal'], ['v', 'Vertical']], 'h'), range('size', 'Thickness', 2, 40, 1, 12, '%'), toggle('scan', 'Scan', true), range('speed', 'Scan speed', 1, 20, 1, 5)], pairs: ['spin', 'oldfilm'] },
    { id: 'blinds', cat: 'vision', icon: '🪟', name: 'Venetian Blinds', desc: 'Peer between the slats.', group: 'stripes',
      params: [range('slats', 'Slats', 4, 40, 1, 14), range('open', 'Openness', 5, 90, 5, 35, '%'), range('angle', 'Angle', 0, 90, 5, 0, '°'), toggle('rotate', 'Slowly rotate', false)], pairs: ['glare', 'noir'] },
    { id: 'mosaic', cat: 'vision', icon: '🧩', name: 'Missing Tiles', desc: 'A grid of blacked-out tiles that reshuffles.', group: 'mask',
      params: [range('grid', 'Grid', 3, 20, 1, 8), range('coverage', 'Coverage', 10, 95, 5, 60, '%'), range('shuffle', 'Reshuffle every', 0, 30, 1, 6, 's')], pairs: ['sketch', 'pixelate'] },
    { id: 'wanderer', cat: 'vision', icon: '📦', name: 'Wandering Window', desc: 'A small window bounces around like a screensaver.', group: 'mask',
      params: [range('size', 'Size', 10, 60, 1, 28, '%'), range('speed', 'Speed', 20, 500, 10, 140, 'px/s')], pairs: ['zoom', 'noir'] },
    { id: 'closing', cat: 'vision', icon: '🧱', name: 'Closing Walls', desc: 'Vision shrinks every second of the round.', group: 'mask',
      params: [range('duration', 'Time to close', 10, 300, 5, 60, 's'), range('min', 'Final radius', 0, 30, 1, 5, '%')], pairs: ['quake', 'lowbattery'] },
    { id: 'steamy', cat: 'vision', icon: '💨', name: 'Steamy Window', desc: 'Fogged glass. Wipe it with your mouse; it fogs back up.', group: 'mask',
      params: [range('brush', 'Wipe size', 20, 200, 5, 70, 'px'), range('refog', 'Refog speed', 0, 100, 5, 30, '%')], pairs: ['rain', 'snow'] },
    { id: 'scratch', cat: 'vision', icon: '🪙', name: 'Scratch Card', desc: 'Hold the mouse and drag to scratch the view free. Resets each round.', group: 'mask', noRandom: true,
      params: [range('brush', 'Coin size', 10, 120, 5, 40, 'px')], pairs: ['spin', 'mirror'] },
    { id: 'censor', cat: 'vision', icon: '⬛', name: 'Redacted', desc: 'Censor bars that jump around the screen.', group: 'blocks',
      params: [range('count', 'Bars', 1, 20, 1, 6), range('size', 'Bar size', 5, 40, 1, 18, '%'), range('every', 'Move every', 1, 20, 1, 4, 's')], pairs: ['stickies', 'ads'] },
    { id: 'glimpse', cat: 'vision', icon: '⚡', name: 'Glimpse', desc: 'Darkness, with brief flashes of vision.', group: 'blackout',
      params: [range('show', 'Visible for', 0.2, 5, 0.1, 1, 's'), range('every', 'Every', 2, 30, 1, 6, 's')], pairs: ['quake', 'mirror'] },
    { id: 'blink', cat: 'vision', icon: '😴', name: 'Heavy Eyelids', desc: 'Your eyes keep closing.', group: 'blackout',
      params: [range('every', 'Blink every', 1, 20, 0.5, 5, 's'), range('closed', 'Eyes closed for', 0.1, 3, 0.1, 0.6, 's')], pairs: ['drunk', 'noir'] },
    { id: 'flashround', cat: 'vision', icon: '⏱️', name: 'Flash Round', desc: 'Only the first few seconds of each round are visible.', group: 'blackout', noRandom: true,
      params: [range('seconds', 'Vision lasts', 1, 60, 1, 10, 's'), toggle('countdown', 'Show countdown', true)], pairs: ['tunnel', 'pixelate'] },
    { id: 'lowbattery', cat: 'vision', icon: '🪫', name: 'Low Battery', desc: 'The screen dims to black as the round goes on.', group: 'blackout',
      params: [range('drain', 'Drains in', 10, 300, 5, 90, 's')], pairs: ['closing', 'static'] },
    { id: 'tinytv', cat: 'vision', icon: '📟', name: 'Tiny TV', desc: 'The world shrinks into a little telly.', group: 'scale',
      params: [range('scale', 'Screen size', 15, 80, 1, 38, '%'), toggle('frame', 'TV frame', true)], pairs: ['crt', 'static'] },

    // ───────────── WEATHER & MESS ─────────────
    { id: 'rain', cat: 'mess', icon: '🌧️', name: 'Windshield Rain', desc: 'Rain on glass. Wipers sweep it away now and then.', group: 'weather',
      params: [range('intensity', 'Intensity', 5, 100, 5, 50, '%'), range('wiper', 'Wiper every', 0, 30, 1, 7, 's')], pairs: ['fog', 'steamy'] },
    { id: 'snow', cat: 'mess', icon: '❄️', name: 'Blizzard', desc: 'Driving snow and white-out gusts.', group: 'weather',
      params: [range('density', 'Density', 10, 100, 5, 55, '%'), range('wind', 'Wind', -100, 100, 5, 25), range('whiteout', 'White-out', 0, 80, 5, 25, '%')], pairs: ['steamy', 'fog'] },
    { id: 'fog', cat: 'mess', icon: '🌫️', name: 'Pea Soup Fog', desc: 'Thick drifting fog banks.', group: 'fog',
      params: [range('density', 'Density', 10, 100, 5, 55, '%'), range('speed', 'Drift', 0, 100, 5, 30, '%')], pairs: ['rain', 'flashlight'] },
    { id: 'mud', cat: 'mess', icon: '🟤', name: 'Mud Splatter', desc: 'Splats land on the screen. Click them to wipe.', group: 'splat',
      params: [range('every', 'Splat every', 1, 20, 1, 4, 's'), range('max', 'Max splats', 1, 40, 1, 14), toggle('wipe', 'Click to wipe', true)], pairs: ['cracked', 'rain'] },
    { id: 'cracked', cat: 'mess', icon: '💥', name: 'Cracked Screen', desc: 'You dropped your phone.', group: 'cracks',
      params: [range('impacts', 'Impacts', 1, 8, 1, 2), toggle('perRound', 'New cracks each round', true)], pairs: ['mud', 'static'] },
    { id: 'greasy', cat: 'mess', icon: '🖐️', name: 'Greasy Fingerprints', desc: 'Smudgy prints that blur whatever is beneath them.', group: 'splat',
      params: [range('count', 'Prints', 1, 30, 1, 9), range('blur', 'Smudge', 2, 20, 1, 7, 'px')], pairs: ['blur', 'cracked'] },
    { id: 'bugs', cat: 'mess', icon: '🕷️', name: 'Infestation', desc: 'Creepy crawlies wander the screen. Click to squish.', group: 'critters',
      params: [range('count', 'Bugs', 1, 60, 1, 12), range('size', 'Size', 16, 120, 2, 44, 'px'), range('speed', 'Speed', 10, 300, 10, 70, 'px/s')], pairs: ['cracked', 'flashlight'] },
    { id: 'stickies', cat: 'mess', icon: '🗒️', name: 'Sticky Notes', desc: 'Unhelpful advice stuck to your monitor. Click to peel.', group: 'blocks',
      params: [range('count', 'Notes', 1, 20, 1, 5), range('size', 'Size', 80, 260, 10, 150, 'px')], pairs: ['ads', 'censor'] },
    { id: 'ads', cat: 'mess', icon: '🪧', name: 'Pop-up Ads', desc: 'It is 2003 and your PC has 47 toolbars.', group: 'popups',
      params: [range('every', 'New ad every', 2, 30, 1, 7, 's'), range('max', 'Max ads', 1, 15, 1, 6), toggle('sneaky', 'Sneaky fake close buttons', true)], pairs: ['buffering', 'stickies'] },
    { id: 'dvd', cat: 'mess', icon: '💿', name: 'DVD Logo', desc: 'The ct-07 logo bounces around. Will it hit the corner?', group: 'bouncer',
      params: [range('size', 'Size', 60, 500, 10, 220, 'px'), range('speed', 'Speed', 50, 800, 10, 180, 'px/s'), range('count', 'Logos', 1, 6, 1, 1)], pairs: ['crt', 'tinytv'] },
    { id: 'emoji', cat: 'mess', icon: '🌪️', name: 'Emoji Storm', desc: 'It is raining emoji.', group: 'weather',
      params: [range('density', 'Density', 5, 100, 5, 35, '%'), range('size', 'Size', 16, 120, 4, 46, 'px'), select('set', 'Set', [['mix', 'Mixed'], ['food', 'Food'], ['animals', 'Animals'], ['geo', 'Geo-jokes']], 'mix')], pairs: ['acid', 'funhouse'] },
    { id: 'lava', cat: 'mess', icon: '🫧', name: 'Lava Lamp', desc: 'Huge groovy blobs float over everything.', group: 'blobs',
      params: [range('blobs', 'Blobs', 2, 14, 1, 6), range('opacity', 'Opacity', 20, 100, 5, 55, '%')], pairs: ['acid', 'funhouse'] },
    { id: 'buffering', cat: 'mess', icon: '⏳', name: 'Buffering…', desc: 'Your internet keeps dropping out.', group: 'popups',
      params: [range('every', 'Every', 3, 30, 1, 10, 's'), range('duration', 'Lasts', 0.5, 10, 0.5, 3, 's')], pairs: ['ads', 'pixelate'] },

    // ───────────── MOTION ─────────────
    { id: 'mirror', cat: 'motion', icon: '🪞', name: 'Mirror World', desc: 'Flipped horizontally. Drive on the other side! (controls get weird)', group: 'flipx',
      params: [], pairs: ['upsidedown', 'scratch'] },
    { id: 'upsidedown', cat: 'motion', icon: '🙃', name: 'Upside Down', desc: 'Australia mode, everywhere.', group: 'flipy',
      params: [], pairs: ['mirror', 'fog'] },
    { id: 'spin', cat: 'motion', icon: '🎠', name: 'Merry-go-round', desc: 'The view slowly rotates.', group: 'rotate',
      params: [range('speed', 'Speed', 1, 90, 1, 10, '°/s'), toggle('fill', 'Fill corners', true)], pairs: ['slit', 'tunnel'] },
    { id: 'drunk', cat: 'motion', icon: '🍺', name: 'Drunk', desc: 'Swaying, drifting and blurring in and out.', group: 'rotate',
      params: [range('intensity', 'Intensity', 5, 100, 5, 50, '%')], pairs: ['blink', 'chroma'] },
    { id: 'quake', cat: 'motion', icon: '🫨', name: 'Earthquake', desc: 'Constant tremors with big aftershocks.', group: 'shake',
      params: [range('intensity', 'Intensity', 5, 100, 5, 35, '%'), toggle('aftershocks', 'Aftershocks', true)], pairs: ['closing', 'cracked'] },
    { id: 'seasick', cat: 'motion', icon: '🚢', name: 'Seasick', desc: 'Rocking like a boat in a swell.', group: 'tilt',
      params: [range('intensity', 'Intensity', 5, 100, 5, 50, '%')], pairs: ['keyhole', 'rain'] },
    { id: 'zoom', cat: 'motion', icon: '🔍', name: 'Magnifier', desc: 'Permanently zoomed in. Less context.', group: 'scale',
      params: [range('zoom', 'Zoom', 110, 400, 10, 200, '%')], pairs: ['wanderer', 'binoculars'] },
    { id: 'funhouse', cat: 'motion', icon: '🎪', name: 'Funhouse Mirror', desc: 'Stretches and squashes on a loop.', group: 'tilt',
      params: [range('intensity', 'Intensity', 5, 100, 5, 45, '%'), range('speed', 'Speed', 5, 100, 5, 30, '%')], pairs: ['acid', 'lava'] },

    // ───────────── HUD ─────────────
    { id: 'nocompass', cat: 'hud', icon: '🧭', name: 'No Compass', desc: 'Hides the compass. Which way is north?', noRandom: true,
      params: [], pairs: ['spin', 'mirror'] },
    { id: 'mapfog', cat: 'hud', icon: '🗺️', name: 'Foggy Guess Map', desc: 'Blurs the guess map. Clicks still land where you click.', noRandom: true,
      params: [range('blur', 'Blur', 1, 10, 0.5, 2.5, 'px'), toggle('grey', 'Greyscale', false)], pairs: ['nocompass'] },

    // ───────────── CHAOS ─────────────
    { id: 'roulette', cat: 'chaos', icon: '🎰', name: 'Effect Roulette', desc: 'Swaps in random effects every few seconds.', meta: true, noRandom: true,
      params: [range('every', 'Spin every', 3, 60, 1, 15, 's'), range('count', 'Effects at once', 1, 3, 1, 1)], pairs: [] },
    { id: 'mystery', cat: 'chaos', icon: '🎁', name: 'Mystery Loadout', desc: 'A secret random combo each round.', meta: true, noRandom: true,
      params: [range('count', 'Effects per round', 1, 4, 1, 2), toggle('reveal', 'Announce picks', true)], pairs: [] },
    { id: 'escalation', cat: 'chaos', icon: '📈', name: 'Escalation', desc: 'Starts clean. Adds another effect every few seconds.', meta: true, noRandom: true,
      params: [range('every', 'Add one every', 5, 60, 1, 15, 's'), range('max', 'Max stacked', 1, 6, 1, 4)], pairs: [] },
  ];

  const loadouts = [
    { id: 'night-patrol', icon: '🌙', name: 'Night Patrol', enabled: ['nightvision', 'flashlight'], params: { flashlight: { radius: 230, dark: 96 } } },
    { id: 'monsoon', icon: '🌧️', name: 'Monsoon Commute', enabled: ['rain', 'fog', 'steamy'], params: { fog: { density: 35 }, steamy: { refog: 15 } } },
    { id: 'morning-after', icon: '🍺', name: 'The Morning After', enabled: ['drunk', 'blink', 'blur'], params: { blur: { amount: 2 }, blink: { every: 4 } } },
    { id: 'dialup', icon: '📞', name: 'Dial-up 2003', enabled: ['ads', 'buffering', 'pixelate'], params: { pixelate: { size: 8 } } },
    { id: 'arcade', icon: '🕹️', name: 'Arcade Cabinet', enabled: ['crt', 'chroma', 'pixelate'], params: { chroma: { offset: 4 }, pixelate: { size: 6 } } },
    { id: 'spy', icon: '🕵️', name: 'Spy Thriller', enabled: ['binoculars', 'thermal'], params: {} },
    { id: 'silent-movie', icon: '🎩', name: 'Silent Movie', enabled: ['oldfilm', 'noir', 'blink'], params: { blink: { every: 8, closed: 0.3 } } },
    { id: 'haunted', icon: '👻', name: 'Haunted House', enabled: ['flashlight', 'static', 'noir'], params: { flashlight: { flicker: true }, static: { opacity: 15 } } },
    { id: 'antarctica', icon: '🐧', name: 'Antarctic Expedition', enabled: ['snow', 'steamy', 'glare'], params: { snow: { whiteout: 40 }, glare: { intensity: 35 } } },
    { id: 'carnival', icon: '🎪', name: 'Carnival', enabled: ['funhouse', 'acid', 'lava'], params: { lava: { opacity: 45 } } },
    { id: 'pest-control', icon: '🪳', name: 'Pest Control', enabled: ['bugs', 'mud', 'cracked'], params: {} },
    { id: 'bureaucracy', icon: '🗂️', name: 'Bureaucracy', enabled: ['censor', 'stickies', 'ads'], params: { ads: { every: 12 } } },
    { id: 'speedrun', icon: '⏱️', name: 'Speedrun', enabled: ['flashround', 'tunnel'], params: { flashround: { seconds: 8 }, tunnel: { radius: 30 } } },
    { id: 'blindfold', icon: '🙈', name: 'Nearly Blindfolded', enabled: ['glimpse', 'pixelate', 'nocompass'], params: { glimpse: { show: 0.6, every: 5 } } },
    { id: 'total-chaos', icon: '☢️', name: 'Total Chaos', enabled: ['roulette', 'escalation'], params: { roulette: { every: 10 } } },
  ];

  const byId = Object.fromEntries(features.map((f) => [f.id, f]));

  function defaultParams(id) {
    const f = byId[id];
    const out = {};
    if (f) for (const p of f.params) out[p.key] = p.def;
    return out;
  }

  function paramsFor(state, id) {
    return Object.assign(defaultParams(id), (state && state.params && state.params[id]) || {});
  }

  // Random combo of `n` non-meta effects with no two from the same group.
  function randomPick(n, exclude = []) {
    const ex = new Set(exclude);
    const usedGroups = new Set(exclude.map((id) => byId[id] && byId[id].group).filter(Boolean));
    const pool = features.filter((f) => !f.meta && !f.noRandom && !ex.has(f.id));
    const out = [];
    while (out.length < n && pool.length) {
      const i = Math.floor(Math.random() * pool.length);
      const f = pool.splice(i, 1)[0];
      if (f.group && usedGroups.has(f.group)) continue;
      if (f.group) usedGroups.add(f.group);
      out.push(f.id);
    }
    return out;
  }

  CT.registry = { categories, features, byId, loadouts, defaultParams, paramsFor, randomPick, version: '1.0.0' };
})();

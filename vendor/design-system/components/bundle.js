/* @ds-bundle: {"format":4,"namespace":"Nilecrz","components":[{"name":"Icon"},{"name":"Button"},{"name":"Badge"},{"name":"Rating"},{"name":"SectionHeading"},{"name":"Scene"},{"name":"VesselArt"},{"name":"NavBar"},{"name":"Hero"},{"name":"CruiseSearch"},{"name":"Stepper"},{"name":"TextField"},{"name":"CruiseCard"},{"name":"VesselTypeCard"},{"name":"VesselCompare"},{"name":"PriceAnatomy"},{"name":"AmenityGrid"},{"name":"ExperienceCard"},{"name":"ItineraryTimeline"},{"name":"CabinPicker"},{"name":"BookingSummary"},{"name":"Gallery"}]} */
(function () {
  var R = window.React;
  var e = R.createElement, useState = R.useState, useEffect = R.useEffect, useRef = R.useRef, useMemo = R.useMemo, useCallback = R.useCallback, Fragment = R.Fragment;
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }
  function uid() { var id = R.useId ? R.useId() : ''; return 'nc' + String(id).replace(/[^a-zA-Z0-9]/g, ''); }
  function money(n, cur) { return (cur || 'US$') + Math.round(n).toLocaleString('en-US'); }

  /* ------------------------------------------------------------------ Icon */
  var P = function (d) { return ['path', { d: d }]; };
  var C = function (x, y, r, f) { return ['circle', { cx: x, cy: y, r: r, fill: f ? 'currentColor' : undefined }]; };
  var ICONS = {
    'arrow-right': [P('M4 12h16M14 6l6 6-6 6')],
    'arrow-up-right': [P('M7 17L17 7M8 7h9v9')],
    'chevron-down': [P('M6 9l6 6 6-6')],
    'chevron-left': [P('M15 6l-6 6 6 6')],
    'chevron-right': [P('M9 6l6 6-6 6')],
    calendar: [['rect', { x: 3, y: 5, width: 18, height: 16, rx: 1 }], P('M3 10h18M8 3v4M16 3v4')],
    users: [C(9, 8, 3.5), P('M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M15.5 4.8a3.3 3.3 0 0 1 0 6.4M17.5 14.8c2 .7 3.4 2.4 4 5.2')],
    pin: [P('M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z'), C(12, 9.5, 2.5)],
    heart: [P('M12 20s-7.5-4.6-9.2-9.3C1.7 7.4 3.9 4.5 7 4.5c2 0 3.7 1.1 5 3 1.3-1.9 3-3 5-3 3.1 0 5.3 2.9 4.2 6.2C19.5 15.4 12 20 12 20z')],
    star: [P('M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z')],
    plus: [P('M12 5v14M5 12h14')],
    minus: [P('M5 12h14')],
    check: [P('M4.5 12.5l5 5L19.5 7')],
    close: [P('M6 6l12 12M18 6L6 18')],
    menu: [P('M4 7h16M4 12h16M4 17h16')],
    play: [P('M8 5.5v13l10.5-6.5z')],
    pause: [P('M8 5v14M16 5v14')],
    info: [C(12, 12, 9), P('M12 11v6M12 7.5v.01')],
    clock: [C(12, 12, 9), P('M12 7v5l3 2')],
    route: [C(6, 19, 2), C(18, 5, 2), P('M6 17V9a3 3 0 0 1 3-3h4M18 7v8a3 3 0 0 1-3 3h-4')],
    ruler: [P('M3 16.5L16.5 3 21 7.5 7.5 21zM7 12.5l2 2M10 9.5l2 2M13 6.5l2 2')],
    plane: [P('M10.5 21l1.5-5.5-6 1.5-1.5-1.5 7-4V5.5a1.5 1.5 0 0 1 3 0v6l7 4-1.5 1.5-6-1.5 1.5 5.5')],
    /* propulsion */
    sail: [P('M12 3v15M12 4c4 3 6.5 7.5 7 12h-7M12 7c-2.5 2.5-4 5.5-4.5 9H12M3 18h18l-2.5 3h-13z')],
    engine: [C(12, 12, 2), P('M12 10c-1-3-.5-6 1.6-7 1.4 2.1.4 5-1.6 7zM13.8 13.1c3.1.4 5.4 2.3 5.2 4.6-2.4.4-4.6-1.8-5.2-4.6zM10.3 13.1c-2.3 2-5.3 2.6-6.9.9 1.2-2.2 4.3-2.4 6.9-.9z')],
    steam: [P('M9 21v-9h6v9M7 21h10M8.5 12h7'), C(11, 7.5, 1.8), C(14.5, 5, 2.2), C(18.5, 3.5, 1.4)],
    anchor: [C(12, 5, 2), P('M12 7v14M8 11h8M4.5 14c.5 4 3.5 7 7.5 7s7-3 7.5-7')],
    compass: [C(12, 12, 9), P('M15.5 8.5l-2 5-5 2 2-5z')],
    /* amenities */
    pool: [P('M8 14V6a2 2 0 0 1 2-2M15 14V6a2 2 0 0 1 2-2M8 8h7M8 11h7M3 17c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1M3 21c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1')],
    sundeck: [C(7, 6, 2.5), P('M3 19l3-6h9l4-5M6 13v6M15 13v6')],
    spa: [P('M12 20c-3.5 0-7-2.5-8-6 3 0 6 1.5 8 6zM12 20c3.5 0 7-2.5 8-6-3 0-6 1.5-8 6zM12 20c-2-2.5-3-5.5-3-8 1.1-2.1 1.9-3.5 3-5 1.1 1.5 1.9 2.9 3 5 0 2.5-1 5.5-3 8z')],
    wifi: [P('M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0'), C(12, 19.2, 1.1, true)],
    ac: [P('M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5')],
    balcony: [P('M6 11V4h12v7M12 4v7M3 11h18M3 21h18M5 11v10M9.5 11v10M14.5 11v10M19 11v10')],
    bath: [P('M3 12h18v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5zM6 12V5.5A2.5 2.5 0 0 1 10.5 4M7 19l-1 2M17 19l1 2')],
    restaurant: [P('M7 3v18M4.5 3v5a2.5 2.5 0 0 0 5 0V3M17 21V3c-2 1-3 3.5-3 7h3')],
    bar: [P('M5 4h14l-7 8zM12 12v8M8 20h8M8 7h8')],
    wine: [P('M8 3h8c0 5-1.5 8-4 8s-4-3-4-8zM12 11v9M8.5 20h7')],
    gym: [P('M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11')],
    egyptologist: [P('M12 11c-2.2-1.6-3.5-3.5-3.5-5.2a3.5 3.5 0 0 1 7 0c0 1.7-1.3 3.6-3.5 5.2zM6 11.5h12M12 11v10')],
    butler: [P('M3 18h18M5 18a7 7 0 0 1 14 0M12 9V7M10.5 7h3')],
    library: [P('M4 19.5V5a1.5 1.5 0 0 1 1.5-1.5H20v15H5.5A1.5 1.5 0 0 0 4 20a1.5 1.5 0 0 0 1.5 1.5H20M8 7.5h8')],
    accessible: [C(12, 4.5, 1.8), P('M12 7.5v6h5l2 5M8.2 10.8a6 6 0 1 0 8.3 7.7')],
    bed: [C(6.5, 11.5, 1.8), P('M3 19V6M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-7v6')],
    temple: [P('M3 21h18M4.5 21l2-14h4l.5 14M13 21l.5-14h4l2 14M6.5 7h4M13.5 7h4M11 11h2')],
    sunrise: [P('M3 18h18M7 18a5 5 0 0 1 10 0M12 5v3M4.9 10.1l2.1 2.1M19.1 10.1L17 12.2M7 21h10')],
    music: [P('M9 18V5l11-2v13'), C(6.5, 18, 2.5), C(17.5, 16, 2.5)],
    quiet: [P('M4 9.5h3.5L12 6v12l-4.5-3.5H4zM16 9.5c1 .8 1.5 1.6 1.5 2.5s-.5 1.7-1.5 2.5')]
  };
  function Icon(props) {
    var spec = ICONS[props.name] || ICONS.info;
    var label = props.label;
    return e('svg', { className: cx('nc-icon', props.className), viewBox: '0 0 24 24', width: props.size, height: props.size, style: props.size ? { fontSize: props.size } : undefined, 'aria-hidden': label ? undefined : 'true', role: label ? 'img' : undefined, 'aria-label': label, focusable: 'false' },
      spec.map(function (s, i) { return e(s[0], Object.assign({ key: i }, s[1])); }));
  }
  Icon.names = Object.keys(ICONS);

  /* ---------------------------------------------------------------- Button */
  function Button(props) {
    var variant = props.variant || 'outline', size = props.size || 'md';
    var rest = Object.assign({}, props);
    ['variant', 'size', 'icon', 'onMedia', 'block', 'href', 'children', 'className'].forEach(function (k) { delete rest[k]; });
    var iconEl = props.icon ? e(Icon, { name: props.icon, className: props.icon === 'arrow-right' ? 'is-arrow' : props.icon === 'arrow-up-right' ? 'is-out' : null }) : null;
    var cls = cx('nc-btn', 'nc-btn-' + variant, size !== 'md' && 'nc-btn-' + size, props.onMedia && 'is-media', props.block && 'nc-btn-block', props.className);
    if (props.href) return e('a', Object.assign({ className: cls, href: props.href }, rest), props.children, iconEl);
    return e('button', Object.assign({ type: 'button', className: cls }, rest), props.children, iconEl);
  }

  /* ----------------------------------------------------------- Badge, Rating */
  function Badge(props) {
    return e('span', { className: cx('nc-badge', props.tone && props.tone !== 'neutral' && 'nc-badge-' + props.tone) }, props.icon ? e(Icon, { name: props.icon }) : null, props.children);
  }
  function Rating(props) {
    var v = props.value || 0, out = [];
    for (var i = 1; i <= 5; i++) out.push(e(Icon, { key: i, name: 'star', className: v >= i - 0.25 ? 'is-filled' : null }));
    return e('span', { className: 'nc-rating' }, e('span', { className: 'nc-rating-stars', role: 'img', 'aria-label': v + ' out of 5' }, out), e('b', null, v.toFixed(1)), props.count != null ? e('span', null, '(' + props.count + ' reviews)') : null);
  }

  /* -------------------------------------------------------- SectionHeading */
  function Ornament() { return e('span', { className: 'nc-ornament', 'aria-hidden': 'true' }, e('i')); }
  function SectionHeading(props) {
    var align = props.align || 'center';
    return e('header', { className: cx('nc-sh', align === 'center' && 'is-center') },
      props.eyebrow ? e('p', { className: 'nc-eyebrow' }, props.eyebrow) : null,
      e(props.as || 'h2', { className: 'nc-sh-title' }, props.title),
      props.ornament === false ? null : e(Ornament),
      props.intro ? e('p', { className: 'nc-sh-intro' }, props.intro) : null);
  }

  /* -------------------------------------------------------------- VesselArt */
  // Side profiles drawn on a 240×120 grid; waterline at y=96.
  function range(a, b, s) { var r = []; for (var x = a; x <= b; x += s) r.push(x); return r; }
  function vesselShapes(type, col) {
    var body = col.body, win = col.win, sail = col.sail, smoke = col.smoke || col.sail;
    var s = [];
    var R2 = function (x, y, w, h, f, k) { s.push(e('rect', { key: k || 'r' + s.length, x: x, y: y, width: w, height: h, fill: f })); };
    var Pp = function (d, f, extra) { s.push(e('path', Object.assign({ key: 'p' + s.length, d: d, fill: f }, extra || {}))); };
    if (type === 'motor') {
      Pp('M6 82H236L222 104H20Z', body);
      R2(16, 66, 206, 16, body); R2(26, 50, 186, 16, body); R2(40, 36, 150, 14, body); R2(176, 27, 22, 9, body);
      R2(66, 24, 96, 3, body); R2(70, 27, 2, 9, body); R2(156, 27, 2, 9, body); R2(112, 27, 2, 9, body);
      range(24, 212, 10).forEach(function (x) { R2(x, 71, 6, 6, win); });
      range(34, 202, 10).forEach(function (x) { R2(x, 54, 6, 6, win); });
      range(48, 182, 12).forEach(function (x) { R2(x, 40, 7, 5, win); });
      R2(180, 29, 14, 4, win);
    } else if (type === 'sail') {
      Pp('M2 80H238Q230 98 206 102H34Q12 98 2 80Z', body);
      R2(38, 64, 154, 16, body);
      range(46, 182, 14).forEach(function (x) { R2(x, 68, 8, 8, win); });
      R2(50, 56, 112, 3, body); R2(54, 59, 2, 5, body); R2(156, 59, 2, 5, body); R2(104, 59, 2, 5, body);
      Pp('M236 64L150 4L200 66Z', sail, { className: 'nc-sail' });
      Pp('M120 58L70 18L96 60Z', sail, { className: 'nc-sail' });
      Pp('M238 66L146 0', 'none', { stroke: body, strokeWidth: 2 });
      Pp('M122 60L67 15', 'none', { stroke: body, strokeWidth: 1.6 });
      R2(197, 10, 2.6, 70, body); R2(93, 24, 2.2, 42, body);
    } else if (type === 'steam') {
      Pp('M4 82H236L226 104H16Z', body);
      R2(14, 64, 214, 18, body); R2(30, 48, 172, 16, body); R2(150, 36, 38, 12, body);
      range(98, 220, 11).forEach(function (x) { R2(x, 69, 6, 8, win); });
      range(22, 40, 11).forEach(function (x) { R2(x, 69, 6, 8, win); });
      range(38, 194, 11).forEach(function (x) { R2(x, 52, 6, 7, win); });
      R2(156, 39, 26, 4, win);
      Pp('M46 84A24 24 0 0 1 94 84Z', body);
      Pp('M54 84A16 16 0 0 1 86 84M70 84V68M70 84L59 73M70 84L81 73', 'none', { stroke: win, strokeWidth: 1.5 });
      R2(112, 12, 10, 36, body); R2(110, 9, 14, 4, sail);
      [[118, 2, 5, 0], [130, -6, 7, 1.2], [146, -12, 9, 2.4]].forEach(function (p, i) {
        s.push(e('circle', { key: 'sm' + i, className: 'nc-puff', cx: p[0], cy: p[1], r: p[2], fill: smoke, style: { animationDelay: p[3] + 's' } }));
      });
    } else { // felucca
      Pp('M70 86H200Q190 100 168 102H96Q78 98 70 86Z', body);
      Pp('M196 84L118 8L132 82Z', sail, { className: 'nc-sail' });
      Pp('M198 88L114 4', 'none', { stroke: body, strokeWidth: 2 });
      R2(131, 30, 2.2, 56, body);
    }
    return s;
  }
  function VesselArt(props) {
    var type = props.type || 'sail';
    var col = props.colors || { body: 'currentColor', win: 'var(--surface-raised)', sail: 'var(--brass-300)', smoke: 'var(--line)' };
    var title = props.title || ({ motor: 'Motor cruise ship', sail: 'Sailing dahabiya', steam: 'Paddle steamer', felucca: 'Felucca' })[type];
    return e('svg', { className: cx('nc-vessel', 'is-' + type, props.className), viewBox: '0 -20 240 140', role: 'img', 'aria-label': title, x: props.x, y: props.y, width: props.width, height: props.height, preserveAspectRatio: 'xMidYMax meet' },
      vesselShapes(type, col),
      props.waterline === false ? null : e('path', { d: 'M0 104H240', stroke: col.line || 'var(--line)', strokeWidth: 1 }));
  }

  /* ------------------------------------------------------------------ Scene */
  var SKY = {
    night: { sky: ['--nile-950', '--nile-800', '--nile-600'], sun: '--sand-100', sx: 620, sy: 110, sr: 16, hills: '--nile-950', water: ['--nile-800', '--nile-950'], sil: '--nile-950', glow: '--brass-300', stars: true },
    dusk: { sky: ['--nile-800', '--dusk-500', '--dusk-300'], sun: '--dusk-300', sx: 540, sy: 296, sr: 44, hills: '--nile-800', water: ['--dusk-500', '--nile-800'], sil: '--nile-950', glow: '--brass-300' },
    dawn: { sky: ['--nile-300', '--sand-200', '--dusk-300'], sun: '--sand-100', sx: 250, sy: 286, sr: 30, hills: '--nile-600', water: ['--nile-300', '--nile-600'], sil: '--nile-800', glow: '--sand-100' },
    day: { sky: ['--nile-600', '--nile-300', '--sand-100'], sun: '--sand-100', sx: 640, sy: 90, sr: 24, hills: '--brass-300', water: ['--nile-600', '--nile-800'], sil: '--nile-800', glow: '--sand-100' }
  };
  var STARS = (function () { var s = [], seed = 7; for (var i = 0; i < 46; i++) { seed = (seed * 9301 + 49297) % 233280; var a = seed / 233280; seed = (seed * 9301 + 49297) % 233280; var b = seed / 233280; s.push([Math.round(a * 800), Math.round(b * 230), (i % 5 === 0 ? 1.6 : 0.9), (i % 7) * 0.5]); } return s; })();
  var FRONDS = [[40, 6, 18, -12], [-40, 8, -18, -12], [30, -12, 14, -20], [-28, -14, -12, -22], [24, 18, 16, -2], [-22, 20, -12, -2]];
  function palm(key, x, base, h, color) {
    var tx = x + 4, ty = base - h;
    var d = 'M' + x + ' ' + base + 'Q' + (x + 8) + ' ' + (base - h / 2) + ' ' + tx + ' ' + ty;
    var fr = FRONDS.map(function (f) { return 'M' + tx + ' ' + ty + 'Q' + (tx + f[2]) + ' ' + (ty + f[3]) + ' ' + (tx + f[0]) + ' ' + (ty + f[1]); }).join('');
    return e('g', { key: key, stroke: color, fill: 'none', strokeLinecap: 'round' }, e('path', { d: d, strokeWidth: 5 }), e('path', { d: fr, strokeWidth: 3.5 }));
  }
  function Scene(props) {
    var t = SKY[props.time] || SKY.dusk, id = uid(), ref = useRef(null);
    var v = function (n) { return 'var(' + n + ')'; };
    var vessel = props.vessel === undefined ? 'sail' : props.vessel;
    var onMove = props.parallax ? function (ev) {
      var r = ref.current.getBoundingClientRect();
      ref.current.style.setProperty('--px', (((ev.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      ref.current.style.setProperty('--py', (((ev.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    } : undefined;
    var sil = v(t.sil), glow = v(t.glow);
    var boatCol = { body: sil, win: glow, sail: props.time === 'night' ? v('--nile-600') : v('--sand-100'), smoke: v('--sand-200'), line: 'none' };
    var glints = [];
    for (var i = 0; i < 9; i++) { var w = Math.max(10, t.sr * 2.4 - i * 9); glints.push(e('rect', { key: i, className: 'glint', x: t.sx - w / 2 + (i % 2 ? 6 : -6), y: 314 + i * 18, width: w, height: 2.5, rx: 1.25, fill: v(t.sun), style: { animationDelay: (i * 0.35) + 's' } })); }
    return e('div', { className: cx('nc-scene', props.className), ref: ref, onPointerMove: onMove, role: props.label ? 'img' : undefined, 'aria-label': props.label, 'aria-hidden': props.label ? undefined : 'true' },
      e('svg', { viewBox: '0 0 800 500', preserveAspectRatio: 'xMidYMid slice' },
        e('defs', null,
          e('linearGradient', { id: id + 's', x1: 0, y1: 0, x2: 0, y2: 1 }, e('stop', { offset: 0, style: { stopColor: v(t.sky[0]) } }), e('stop', { offset: 0.6, style: { stopColor: v(t.sky[1]) } }), e('stop', { offset: 1, style: { stopColor: v(t.sky[2]) } })),
          e('linearGradient', { id: id + 'w', x1: 0, y1: 0, x2: 0, y2: 1 }, e('stop', { offset: 0, style: { stopColor: v(t.water[0]) } }), e('stop', { offset: 1, style: { stopColor: v(t.water[1]) } }))),
        e('rect', { width: 800, height: 310, fill: 'url(#' + id + 's)' }),
        t.stars ? e('g', null, STARS.map(function (s, k) { return e('circle', { key: k, className: 'star', cx: s[0], cy: s[1], r: s[2], fill: v('--sand-100'), style: { animationDelay: s[3] + 's' } }); })) : null,
        e('circle', { cx: t.sx, cy: t.sy, r: t.sr, fill: v(t.sun) }),
        e('g', { className: 'l-far' },
          e('path', { d: 'M-40 302V248Q40 238 120 246L200 234Q300 222 380 238L470 230Q560 220 650 236L840 226V302Z', fill: v(t.hills), opacity: 0.55 }),
          props.temple === false ? null : e('g', { fill: sil, opacity: 0.9 },
            e('path', { d: 'M110 304L118 246H160L164 304ZM170 304L174 246H216L224 304Z' }), e('rect', { x: 160, y: 262, width: 14, height: 5 }))),
        e('rect', { y: 300, width: 800, height: 200, fill: 'url(#' + id + 'w)' }),
        e('path', { d: 'M-40 300H840V310Q600 304 400 312T-40 308Z', fill: sil }),
        e('g', null, glints),
        vessel ? e('g', { className: 'l-mid' }, e('g', { className: 'drift' },
          e('g', { opacity: 0.22, transform: 'translate(0 704) scale(1 -1)' }, e('g', { transform: 'translate(300 240) scale(1.1)' }, vesselShapes(vessel, boatCol))),
          e('g', { className: 'boat' }, e('g', { transform: 'translate(300 240) scale(1.1)' }, vesselShapes(vessel, boatCol))))) : null,
        e('g', { className: 'l-near' },
          palm('a', 30, 330, 170, sil), palm('b', 78, 330, 128, sil), palm('c', 712, 330, 140, sil), palm('d', 760, 334, 186, sil),
          e('path', { d: 'M-40 330Q120 318 240 332T520 336T840 326V340H-40Z', fill: sil }))));
  }

  /* ----------------------------------------------------------------- Media */
  function Media(props) {
    return e('div', { className: cx('nc-media', props.className), style: props.style },
      props.image ? e('img', { src: props.image, alt: props.alt || '', loading: 'lazy' }) : e(Scene, { time: props.time, vessel: props.vessel, temple: props.temple, label: props.alt }));
  }

  /* ---------------------------------------------------------------- NavBar */
  function NavBar(props) {
    var links = props.links || ['Cruises', 'Vessels', 'Why prices differ', 'Itineraries', 'Journal', 'Contact'];
    var _a = useState(props.active != null ? props.active : 0), active = _a[0], setActive = _a[1];
    var _l = useState(props.lang || 'EN'), lang = _l[0], setLang = _l[1];
    var _o = useState(false), open = _o[0], setOpen = _o[1];
    var _i = useState({ left: 0, width: 0 }), ink = _i[0], setInk = _i[1];
    var listRef = useRef(null);
    var measure = useCallback(function () {
      var ul = listRef.current; if (!ul) return; var a = ul.querySelectorAll('a')[active]; if (!a) return;
      var ur = ul.getBoundingClientRect(), r = a.getBoundingClientRect(); setInk({ left: r.left - ur.left, width: r.width });
    }, [active]);
    useEffect(function () { measure(); var t = setTimeout(measure, 400); window.addEventListener('resize', measure); return function () { clearTimeout(t); window.removeEventListener('resize', measure); }; }, [measure]);
    return e('nav', { className: cx('nc-nav', props.overMedia ? 'is-media' : 'is-solid', open && 'is-open'), 'aria-label': 'Main' },
      e('div', { className: 'nc-nav-top' },
        e('button', { className: 'nc-nav-burger nc-focus', 'aria-expanded': open, 'aria-label': 'Menu', onClick: function () { setOpen(!open); } }, e(Icon, { name: open ? 'close' : 'menu' })),
        e('div', { className: 'nc-nav-lang', role: 'group', 'aria-label': 'Language' }, ['EN', 'ES', '日本語'].map(function (l) { return e('button', { key: l, className: 'nc-focus', 'aria-pressed': lang === l, onClick: function () { setLang(l); props.onLanguage && props.onLanguage(l); } }, l); })),
        e('a', { className: 'nc-wordmark nc-focus', href: '#', 'aria-label': (props.brand || 'nilecrz') + ' home' }, e('b', null, props.brand || 'nilecrz'), e('small', null, props.tagline || 'Nile cruises, explained')),
        e('div', { className: 'nc-nav-end' }, e(Button, { variant: 'outline', size: 'sm', onMedia: props.overMedia }, props.cta || 'Plan my cruise'))),
      e('ul', { className: 'nc-nav-links', ref: listRef },
        links.map(function (l, i) { return e('li', { key: l }, e('a', { href: '#', className: 'nc-focus', 'aria-current': i === active ? 'page' : undefined, onClick: function (ev) { ev.preventDefault(); setActive(i); setOpen(false); props.onNavigate && props.onNavigate(i); } }, l)); }),
        e('span', { className: 'nc-nav-ink', style: { left: ink.left, width: ink.width }, 'aria-hidden': 'true' })));
  }

  /* ------------------------------------------------------------------ Hero */
  function Hero(props) {
    return e('section', { className: 'nc-hero', style: props.height ? { minHeight: props.height } : undefined },
      e('div', { className: 'nc-hero-media' }, props.image ? e('img', { src: props.image, alt: '', style: { width: '100%', height: '100%', objectFit: 'cover' } }) : e(Scene, { time: props.time || 'dusk', vessel: props.vessel, parallax: true })),
      props.nav || null,
      e('div', { className: 'nc-hero-body' },
        props.eyebrow ? e('p', { className: 'nc-eyebrow' }, props.eyebrow) : null,
        e('h1', { className: 'nc-hero-title' }, props.title),
        props.subtitle ? e('p', { className: 'nc-hero-sub' }, props.subtitle) : null,
        props.action || null),
      props.children ? e('div', { className: 'nc-hero-slot' }, props.children) : null);
  }

  /* --------------------------------------------------------------- Stepper */
  function Stepper(props) {
    var min = props.min != null ? props.min : 0, max = props.max != null ? props.max : 10;
    var _v = useState(props.defaultValue != null ? props.defaultValue : min), inner = _v[0], setInner = _v[1];
    var value = props.value != null ? props.value : inner;
    var _b = useState(0), bump = _b[0], setBump = _b[1];
    var set = function (n) { n = Math.max(min, Math.min(max, n)); if (n === value) return; setInner(n); setBump(bump + 1); props.onChange && props.onChange(n); };
    return e('span', { className: 'nc-stepper', role: 'group', 'aria-label': props.label },
      e('button', { type: 'button', className: 'nc-iconbtn', disabled: value <= min, 'aria-label': 'Fewer ' + (props.label || ''), onClick: function () { set(value - 1); } }, e(Icon, { name: 'minus' })),
      e('output', { key: bump, className: bump ? 'bump' : null, 'aria-live': 'polite' }, value),
      e('button', { type: 'button', className: 'nc-iconbtn', disabled: value >= max, 'aria-label': 'More ' + (props.label || ''), onClick: function () { set(value + 1); } }, e(Icon, { name: 'plus' })));
  }

  /* ------------------------------------------------------------- TextField */
  function TextField(props) {
    var _f = useState(false), focus = _f[0], setFocus = _f[1];
    var _v = useState(props.defaultValue || ''), val = _v[0], setVal = _v[1];
    var id = uid();
    var tag = props.multiline ? 'textarea' : 'input';
    return e('label', { className: cx('nc-tf', (focus || val) && 'is-up', focus && 'is-focus', props.error && 'is-error'), htmlFor: id },
      e('span', { className: 'nc-tf-label' }, props.label),
      e(tag, { id: id, type: props.multiline ? undefined : (props.type || 'text'), rows: props.multiline ? 3 : undefined, value: val, 'aria-invalid': props.error ? 'true' : undefined, 'aria-describedby': (props.hint || props.error) ? id + 'h' : undefined,
        onFocus: function () { setFocus(true); }, onBlur: function () { setFocus(false); }, onChange: function (ev) { setVal(ev.target.value); props.onChange && props.onChange(ev.target.value); } }),
      e('span', { className: 'nc-tf-bar' }),
      (props.error || props.hint) ? e('span', { className: 'nc-tf-hint', id: id + 'h' }, props.error || props.hint) : null);
  }

  /* ---------------------------------------------------------- CruiseSearch */
  var DEFAULT_ROUTES = [
    { label: 'Luxor to Aswan', sub: '4 nights · Esna, Edfu, Kom Ombo', days: [1, 5] },
    { label: 'Aswan to Luxor', sub: '3 nights · the classic downstream', days: [5] },
    { label: 'Luxor & back', sub: '7 nights · the full round trip', days: [6] },
    { label: 'Lake Nasser', sub: '4 nights · Abu Simbel by water', days: [1] }
  ];
  var DEFAULT_VESSELS = [
    { label: 'Any vessel', sub: 'Show everything that sails', icon: 'compass' },
    { label: 'Sailing dahabiya', sub: '8–24 guests · moved by wind', icon: 'sail' },
    { label: 'Motor cruise ship', sub: '60–160 guests · pools and spas', icon: 'engine' },
    { label: 'Paddle steamer', sub: 'Restored period vessels', icon: 'steam' }
  ];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function fmtDate(d) { return d ? d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear() : 'Any date'; }
  function Calendar(props) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var _m = useState(props.value ? new Date(props.value.getFullYear(), props.value.getMonth(), 1) : new Date(today.getFullYear(), today.getMonth(), 1)), month = _m[0], setMonth = _m[1];
    var first = (month.getDay() + 6) % 7, days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    var cells = [];
    for (var b = 0; b < first; b++) cells.push(e('span', { key: 'b' + b }));
    for (var d = 1; d <= days; d++) {
      (function (d) {
        var date = new Date(month.getFullYear(), month.getMonth(), d);
        var sail = props.days.indexOf(date.getDay()) > -1, past = date < today;
        var sel = props.value && date.getTime() === props.value.getTime();
        cells.push(e('button', { key: d, type: 'button', className: cx('nc-day nc-focus', sail && 'is-sail'), disabled: !sail || past, 'aria-pressed': sel ? 'true' : 'false', 'aria-label': fmtDate(date) + (sail ? ', sailing day' : ''), onClick: function () { props.onPick(date); } }, d));
      })(d);
    }
    var canPrev = month > new Date(today.getFullYear(), today.getMonth(), 1);
    return e('div', { className: 'nc-cal' },
      e('div', { className: 'nc-cal-head' },
        e('button', { type: 'button', className: 'nc-iconbtn', disabled: !canPrev, 'aria-label': 'Previous month', onClick: function () { setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1)); } }, e(Icon, { name: 'chevron-left' })),
        e('b', { 'aria-live': 'polite' }, MONTHS[month.getMonth()] + ' ' + month.getFullYear()),
        e('button', { type: 'button', className: 'nc-iconbtn', 'aria-label': 'Next month', onClick: function () { setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1)); } }, e(Icon, { name: 'chevron-right' }))),
      e('div', { className: 'nc-cal-grid' }, ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(function (x, i) { return e('span', { key: 'h' + i, className: 'nc-cal-dow' }, x); }), cells),
      e('div', { className: 'nc-cal-foot' }, e('i'), 'Departure days for this route'));
  }
  function CruiseSearch(props) {
    var routes = props.routes || DEFAULT_ROUTES, vessels = props.vessels || DEFAULT_VESSELS;
    var _o = useState(null), open = _o[0], setOpen = _o[1];
    var _r = useState(0), route = _r[0], setRoute = _r[1];
    var _v = useState(props.defaultVessel || 0), vessel = _v[0], setVessel = _v[1];
    var _d = useState(null), date = _d[0], setDate = _d[1];
    var _ad = useState(2), adults = _ad[0], setAdults = _ad[1];
    var _ch = useState(0), kids = _ch[0], setKids = _ch[1];
    var _res = useState(null), result = _res[0], setResult = _res[1];
    var ref = useRef(null);
    useEffect(function () {
      function off(ev) { if (ref.current && !ref.current.contains(ev.target)) setOpen(null); }
      function esc(ev) { if (ev.key === 'Escape') setOpen(null); }
      document.addEventListener('mousedown', off); document.addEventListener('keydown', esc);
      return function () { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', esc); };
    }, []);
    var toggle = function (k) { setOpen(open === k ? null : k); };
    var field = function (k, label, value, icon, pop, left) {
      return e('div', { style: { position: 'relative', display: 'grid' }, key: k },
        e('button', { type: 'button', className: 'nc-field nc-focus', 'aria-expanded': open === k, 'aria-haspopup': 'dialog', onClick: function () { toggle(k); } },
          e('span', { className: 'nc-field-label' }, label),
          e('span', { className: 'nc-field-value' }, e(Icon, { name: icon }), e('span', null, value), e(Icon, { name: 'chevron-down', className: 'is-chev' }))),
        open === k ? e('div', { className: 'nc-pop', role: 'dialog', 'aria-label': label, style: left ? { left: left } : { left: 0 } }, pop) : null);
    };
    var list = function (items, cur, pick) {
      return e('div', { role: 'listbox' }, items.map(function (it, i) {
        return e('button', { key: i, type: 'button', role: 'option', className: 'nc-opt nc-focus', 'aria-selected': i === cur, onClick: function () { pick(i); setOpen(null); setResult(null); } },
          e('span', null, it.icon ? e(Icon, { name: it.icon, className: null }) : null, it.icon ? ' ' : null, it.label), e('small', null, it.sub), i === cur ? e(Icon, { name: 'check' }) : null);
      }));
    };
    var go = function () {
      var n = ((route * 7 + vessel * 5 + (date ? date.getDate() : 3) + adults) % 19) + 4;
      setResult(n); setOpen(null);
      props.onSearch && props.onSearch({ route: routes[route], vessel: vessels[vessel], date: date, adults: adults, children: kids });
    };
    var guests = adults + kids;
    return e('div', { className: cx('nc-search', !props.onMedia && 'on-surface'), ref: ref, role: 'search' },
      field('route', 'Route', routes[route].label, 'route', list(routes, route, setRoute)),
      field('vessel', 'Vessel', vessels[vessel].label, vessels[vessel].icon || 'compass', list(vessels, vessel, setVessel)),
      field('date', 'Departure', fmtDate(date), 'calendar', e(Calendar, { days: routes[route].days, value: date, onPick: function (d) { setDate(d); setOpen(null); setResult(null); } })),
      field('guests', 'Guests', guests + (guests === 1 ? ' guest' : ' guests'), 'users', e('div', null,
        e('div', { className: 'nc-steprow' }, e('span', null, 'Adults', e('small', null, '12 and over')), e(Stepper, { label: 'adults', min: 1, max: 8, value: adults, onChange: setAdults })),
        e('div', { className: 'nc-steprow' }, e('span', null, 'Children', e('small', null, 'Under 12, sharing a cabin')), e(Stepper, { label: 'children', min: 0, max: 4, value: kids, onChange: setKids }))), 'auto'),
      e(Button, { variant: 'primary', size: 'lg', className: 'nc-search-go', onClick: go, icon: 'arrow-right' }, props.cta || 'Check availability'),
      result != null ? e('p', { className: 'nc-search-note', role: 'status' }, e(Icon, { name: 'check' }), result + ' departures match · ' + vessels[vessel].label.toLowerCase() + ', ' + routes[route].label) : null);
  }

  /* ------------------------------------------------------------ CruiseCard */
  var VESSEL_META = { sail: { label: 'Sailing dahabiya', icon: 'sail' }, motor: { label: 'Motor cruise ship', icon: 'engine' }, steam: { label: 'Paddle steamer', icon: 'steam' }, felucca: { label: 'Felucca', icon: 'sail' } };
  var AMENITY_LABEL = { pool: 'Pool', sundeck: 'Sun deck', spa: 'Spa', wifi: 'Wi-Fi', ac: 'Air conditioning', balcony: 'Private balcony', bath: 'Bathtub', restaurant: 'Restaurant', bar: 'Bar', wine: 'Wine pairing', gym: 'Gym', egyptologist: 'Private Egyptologist', butler: 'Butler service', library: 'Library', accessible: 'Step-free access', bed: 'King bed', music: 'Evening music', quiet: 'No engine noise', anchor: 'Private moorings' };
  function CruiseCard(props) {
    var _s = useState(!!props.saved), saved = _s[0], setSaved = _s[1];
    var _c = useState(!!props.compared), cmp = _c[0], setCmp = _c[1];
    var vm = VESSEL_META[props.vessel || 'sail'];
    var id = uid();
    return e('article', { className: 'nc-card', 'aria-labelledby': id },
      e('div', { style: { position: 'relative', overflow: 'hidden' } },
        e(Media, { image: props.image, time: props.time || 'dusk', vessel: props.vessel || 'sail', alt: props.imageAlt }),
        props.badges ? e('div', { className: 'nc-card-badges' }, props.badges.map(function (b, i) { return e(Badge, { key: i, tone: b.tone || 'media', icon: b.icon }, b.label); })) : null,
        e('button', { type: 'button', className: 'nc-save', 'aria-pressed': saved, 'aria-label': (saved ? 'Remove ' : 'Save ') + props.name, onClick: function () { setSaved(!saved); props.onSave && props.onSave(!saved); } }, e(Icon, { name: 'heart' }))),
      e('div', { className: 'nc-card-body' },
        e('p', { className: 'nc-eyebrow', style: { display: 'flex', gap: 8, alignItems: 'center' } }, e(Icon, { name: vm.icon }), vm.label),
        e('h3', { className: 'nc-card-title', id: id }, props.name),
        props.route ? e('ol', { className: 'nc-route', 'aria-label': 'Route' }, props.route.map(function (r) { return e('li', { key: r }, r); })) : null,
        e('div', { className: 'nc-card-meta' },
          props.nights ? e('span', null, e(Icon, { name: 'clock' }), props.nights + ' nights') : null,
          props.guests ? e('span', null, e(Icon, { name: 'users' }), props.guests + ' guests max') : null,
          props.rating ? e(Rating, { value: props.rating, count: props.reviews }) : null),
        props.amenities ? e('ul', { className: 'nc-amen-row', 'aria-label': 'On board' }, props.amenities.map(function (a) { return e('li', { key: a, title: AMENITY_LABEL[a] || a }, e(Icon, { name: a, label: AMENITY_LABEL[a] || a })); })) : null,
        e('div', { className: 'nc-card-foot' },
          e('div', { className: 'nc-price' }, e('small', null, 'From, per person'), e('b', null, money(props.price || 0, props.currency))),
          e('label', { className: 'nc-compare' }, e('input', { type: 'checkbox', checked: cmp, onChange: function () { setCmp(!cmp); props.onCompare && props.onCompare(!cmp); } }), 'Compare'))));
  }

  /* -------------------------------------------------------- VesselTypeCard */
  var VESSELS = {
    motor: { name: 'Motor cruise ship', short: 'The floating hotel', line: 'Four or five decks, a pool on the roof and a full programme. Engines cover the classic route fast, often sailing by night.', facts: [['users', '60–160 guests'], ['clock', '3–4 nights'], ['pool', 'Pool, spa, gym']],
      guests: '60–160', cabins: '30–80', power: 'Twin diesel engines', pace: 'Covers Luxor–Aswan in 3–4 nights, part of it after dark', mooring: 'Often rafted up to six ships abreast at Esna, Edfu and Kom Ombo', sound: 'Engine hum, busy decks, evening entertainment', days: 'Early temple starts with large groups, afternoons by the pool', price: 'US$600–3,500 pp',
      meters: { Intimacy: 1, Quiet: 2, 'Free itinerary': 1, Facilities: 5, Heritage: 1 } },
    sail: { name: 'Sailing dahabiya', short: 'The private sailing house', line: 'A low two-masted boat moved by the wind, carrying 8 to 24 guests. It moors at islands and villages the big ships cannot reach.', facts: [['users', '8–24 guests'], ['clock', '5–7 nights'], ['quiet', 'No engine noise']],
      guests: '8–24', cabins: '4–12', power: 'Two lateen sails; a tug helps on windless days', pace: 'Sails by day, 5–7 nights between Esna and Aswan', mooring: 'Private riverbank and island moorings, El Kab, Gebel Silsila', sound: 'Wind, water and birdsong', days: 'Unhurried mornings, lunch under sail, sites before the coaches', price: 'US$2,000–9,000 pp',
      meters: { Intimacy: 5, Quiet: 5, 'Free itinerary': 5, Facilities: 2, Heritage: 4 } },
    steam: { name: 'Paddle steamer', short: 'The period piece', line: 'A restored vessel from the age of Cook\'s tours, with a turning paddle wheel, brass fittings and cabins that feel like the 1920s.', facts: [['users', '40–60 guests'], ['clock', '4–5 nights'], ['library', 'Period interiors']],
      guests: '40–60', cabins: '20–30', power: 'Paddle wheel (steam heritage; most now run on diesel)', pace: '4–5 nights at an old-fashioned speed', mooring: 'Own berths, with few ships alongside', sound: 'A steady paddle beat, wood and brass', days: 'Lectures, afternoon tea and a sense of history', price: 'US$3,000–7,500 pp',
      meters: { Intimacy: 3, Quiet: 3, 'Free itinerary': 3, Facilities: 3, Heritage: 5 } }
  };
  function VesselTypeCard(props) {
    var v = VESSELS[props.type || 'sail'];
    return e('article', { className: 'nc-vtype' },
      e('div', { className: 'nc-vtype-art' }, e(VesselArt, { type: props.type || 'sail' })),
      e('div', { className: 'nc-vtype-body' },
        e('p', { className: 'nc-eyebrow' }, props.eyebrow || v.short),
        e('h3', { className: 'nc-vtype-title' }, props.title || v.name),
        e('p', { className: 'nc-vtype-line' }, props.description || v.line),
        e('ul', { className: 'nc-vtype-facts' }, (props.facts || v.facts).map(function (f) { return e('li', { key: f[1] }, e(Icon, { name: f[0] }), f[1]); })),
        e(Button, { variant: 'link', icon: 'arrow-right', href: props.href || '#' }, props.cta || 'How it feels on board')));
  }

  /* --------------------------------------------------------- VesselCompare */
  var ROWS = [['users', 'Guests', 'guests'], ['bed', 'Cabins', 'cabins'], ['compass', 'Propulsion', 'power'], ['clock', 'Pace', 'pace'], ['anchor', 'Where it moors', 'mooring'], ['quiet', 'What you hear', 'sound'], ['sunrise', 'Your days', 'days'], ['ruler', 'Typical price', 'price']];
  function Meter(props) {
    var cells = [];
    for (var i = 1; i <= 5; i++) cells.push(e('i', { key: i, className: i <= props.value ? 'on' : null, style: { transitionDelay: (i * 40) + 'ms' } }));
    return e('div', { className: 'nc-meter' }, e('span', null, props.label), e('span', { className: 'nc-meter-cells', role: 'meter', 'aria-valuemin': 0, 'aria-valuemax': 5, 'aria-valuenow': props.value, 'aria-label': props.label }, cells), e('b', null, props.value + '/5'));
  }
  function VesselCompare(props) {
    var types = props.types || ['sail', 'motor', 'steam'];
    var _t = useState(props.defaultType || types[0]), cur = _t[0], setCur = _t[1];
    var _m = useState(false), all = _m[0], setAll = _m[1];
    var v = VESSELS[cur];
    var onKey = function (ev) {
      var i = types.indexOf(cur);
      if (ev.key === 'ArrowRight') { setCur(types[(i + 1) % types.length]); ev.preventDefault(); }
      if (ev.key === 'ArrowLeft') { setCur(types[(i - 1 + types.length) % types.length]); ev.preventDefault(); }
    };
    return e('section', { className: 'nc-vc' },
      e('div', { className: 'nc-vc-bar' },
        e('div', { className: 'nc-tabs', role: 'tablist', 'aria-label': 'Vessel type', onKeyDown: onKey }, types.map(function (t) {
          return e('button', { key: t, role: 'tab', type: 'button', className: 'nc-tab nc-focus', 'aria-selected': !all && t === cur, tabIndex: t === cur ? 0 : -1, onClick: function () { setCur(t); setAll(false); } }, e(Icon, { name: VESSEL_META[t].icon }), VESSELS[t].name);
        })),
        e(Button, { variant: all ? 'primary' : 'ghost', size: 'sm', 'aria-pressed': all, onClick: function () { setAll(!all); } }, all ? 'Show one at a time' : 'Compare all three')),
      all ? e('div', { className: 'nc-vc-table', role: 'table' },
        e('div', { role: 'row', className: 'nc-vc-tr is-head' }, e('span', { role: 'columnheader' }), types.map(function (t) { return e('span', { key: t, role: 'columnheader' }, e(VesselArt, { type: t, className: 'nc-vc-mini' }), VESSELS[t].name); })),
        ROWS.map(function (r) { return e('div', { role: 'row', key: r[2], className: 'nc-vc-tr' }, e('span', { role: 'rowheader' }, e(Icon, { name: r[0] }), r[1]), types.map(function (t) { return e('span', { key: t, role: 'cell' }, VESSELS[t][r[2]]); })); }))
      : e('div', { className: 'nc-vc-one', role: 'tabpanel', key: cur },
        e('div', { className: 'nc-vc-stage' }, e(VesselArt, { type: cur }), e('p', { className: 'nc-vc-short' }, v.short)),
        e('div', { className: 'nc-vc-info' },
          e('h3', { className: 'nc-vc-title' }, v.name),
          e('p', { className: 'nc-vc-line' }, v.line),
          e('div', { className: 'nc-meters' }, Object.keys(v.meters).map(function (k) { return e(Meter, { key: k, label: k, value: v.meters[k] }); })),
          e('dl', { className: 'nc-vc-dl' }, ROWS.map(function (r) { return e(Fragment, { key: r[2] }, e('dt', null, e(Icon, { name: r[0] }), r[1]), e('dd', null, v[r[2]])); })))));
  }

  /* ---------------------------------------------------------- PriceAnatomy */
  var FACTORS = [
    { id: 'vessel', label: 'Who shares the boat', icon: 'users', options: [
      { label: '140-guest motor ship', v: 640, why: 'Fuel, crew and hull are split 140 ways, so each share is small.' },
      { label: '60-guest boutique ship', v: 1500, why: 'Fewer guests carry the same running costs, and there are more crew per guest.' },
      { label: '12-guest dahabiya', v: 2900, why: 'Twelve guests carry a whole boat and around twenty crew.' }] },
    { id: 'cabin', label: 'Cabin size', icon: 'ruler', options: [
      { label: 'Standard, 18 m²', v: 0, why: 'A window onto the river, twin beds and a shower.' },
      { label: 'Suite, 32 m²', v: 900, why: 'A sitting area, a bathtub and often a French balcony.' },
      { label: 'Royal suite, 60 m²', v: 2400, why: 'A private terrace on the water and a butler.' }] },
    { id: 'guide', label: 'Sightseeing', icon: 'egyptologist', options: [
      { label: 'Shared guide, groups of 40', v: 160, why: 'Temples at peak hour, following a paddle above the crowd.' },
      { label: 'Egyptologist, groups of 12', v: 480, why: 'A qualified Egyptologist, and time to ask questions.' },
      { label: 'Private Egyptologist', v: 1100, why: 'Your own scholar, timed slots and sites before the coaches arrive.' }] },
    { id: 'dining', label: 'Dining & drinks', icon: 'restaurant', options: [
      { label: 'Buffet, drinks extra', v: 0, why: 'Hotel-style buffets, and the bar bill adds up.' },
      { label: 'À la carte, soft drinks', v: 300, why: 'Plated dinners, with tea, coffee and soft drinks included.' },
      { label: 'Chef\'s menus & paired wine', v: 750, why: 'Market menus cooked for a dozen guests, with Egyptian and imported wines.' }] },
    { id: 'mooring', label: 'Where you moor', icon: 'anchor', options: [
      { label: 'Rafted six abreast', v: 0, why: 'Your balcony looks into the next ship\'s cabin.' },
      { label: 'Private riverbank', v: 450, why: 'Nothing on the river around you but palms and fishing boats.' }] },
    { id: 'logistics', label: 'Flights & transfers', icon: 'plane', options: [
      { label: 'Make your own way', v: 0, why: 'You book the flight to Luxor and the taxi yourself.' },
      { label: 'Flights & private transfers', v: 400, why: 'Cairo flights, meet-and-assist and private cars are included.' }] }
  ];
  var PRESETS = { low: [0, 0, 0, 0, 0, 0], high: [2, 2, 2, 2, 1, 1] };
  function useCountUp(target) {
    var _v = useState(target), val = _v[0], setVal = _v[1];
    var fromRef = useRef(target);
    useEffect(function () {
      var from = fromRef.current, start = null, raf;
      function step(ts) { if (!start) start = ts; var p = Math.min(1, (ts - start) / 700); var k = 1 - Math.pow(1 - p, 3); var n = from + (target - from) * k; setVal(n); fromRef.current = n; if (p < 1) raf = requestAnimationFrame(step); }
      raf = requestAnimationFrame(step); return function () { cancelAnimationFrame(raf); };
    }, [target]);
    return val;
  }
  function PriceAnatomy(props) {
    var factors = props.factors || FACTORS;
    var _s = useState(props.defaultPreset === 'high' ? PRESETS.high.slice() : PRESETS.low.slice()), pick = _s[0], setPick = _s[1];
    var _f = useState(null), focus = _f[0], setFocus = _f[1];
    var total = factors.reduce(function (a, f, i) { return a + f.options[pick[i]].v; }, 0);
    var max = factors.reduce(function (a, f) { return a + Math.max.apply(null, f.options.map(function (o) { return o.v; })); }, 0);
    var shown = useCountUp(total);
    var preset = PRESETS.low.every(function (x, i) { return pick[i] === x; }) ? 'low' : PRESETS.high.every(function (x, i) { return pick[i] === x; }) ? 'high' : null;
    var set = function (fi, oi) { var n = pick.slice(); n[fi] = oi; setPick(n); setFocus(fi); };
    return e('section', { className: 'nc-pa' },
      e('div', { className: 'nc-pa-head' },
        e('div', null,
          e('p', { className: 'nc-eyebrow' }, props.eyebrow || 'Both are licensed five-star'),
          e('div', { className: 'nc-pa-total', 'aria-live': 'polite' }, e('b', null, money(shown, props.currency)), e('span', null, 'per person, 4–5 nights')),
          e('p', { className: 'nc-pa-note' }, props.note || 'A five-star licence confirms that the facilities exist. It does not measure how many people share them, who guides you or where you moor.')),
        e('div', { className: 'nc-pa-presets', role: 'group', 'aria-label': 'Examples' },
          e(Button, { variant: 'outline', size: 'sm', 'aria-pressed': preset === 'low', onClick: function () { setPick(PRESETS.low.slice()); setFocus(null); } }, 'The US$800 five-star'),
          e(Button, { variant: 'outline', size: 'sm', 'aria-pressed': preset === 'high', onClick: function () { setPick(PRESETS.high.slice()); setFocus(null); } }, 'The US$8,000 five-star'))),
      e('div', { className: 'nc-pa-bar', role: 'img', 'aria-label': 'Price build-up: ' + factors.map(function (f, i) { return f.label + ' ' + money(f.options[pick[i]].v, props.currency); }).join(', ') },
        factors.map(function (f, i) { var w = (f.options[pick[i]].v / max) * 100; return e('span', { key: f.id, className: cx('nc-pa-seg', 'seg-' + i, focus === i && 'is-focus'), style: { width: w + '%' }, title: f.label + ': ' + money(f.options[pick[i]].v, props.currency) }); })),
      e('ol', { className: 'nc-pa-rows' }, factors.map(function (f, fi) {
        var o = f.options[pick[fi]];
        return e('li', { key: f.id, className: cx('nc-pa-row', focus === fi && 'is-focus') },
          e('div', { className: 'nc-pa-label' }, e('i', { className: 'nc-pa-key seg-' + fi, 'aria-hidden': 'true' }), e(Icon, { name: f.icon }), e('span', null, f.label)),
          e('div', { className: 'nc-chips', role: 'radiogroup', 'aria-label': f.label }, f.options.map(function (opt, oi) {
            return e('button', { key: oi, type: 'button', role: 'radio', 'aria-checked': pick[fi] === oi, className: 'nc-chip nc-focus', onClick: function () { set(fi, oi); } }, opt.label);
          })),
          e('b', { className: 'nc-pa-amt' }, '+' + money(o.v, props.currency)),
          e('p', { className: 'nc-pa-why', key: pick[fi] }, o.why));
      })),
      e('p', { className: 'nc-pa-foot' }, e(Icon, { name: 'info' }), props.footnote || 'Illustrative figures for a Luxor–Aswan sailing in high season. Live prices come from each vessel\'s rate sheet.'));
  }

  /* ------------------------------------------------------------ AmenityGrid */
  var STATUS = { included: { label: 'Included', tone: 'success', icon: 'check' }, request: { label: 'On request', tone: 'accent', icon: 'plus' }, none: { label: 'Not aboard', tone: 'neutral', icon: 'minus' } };
  function AmenityGrid(props) {
    var items = props.items || [];
    var _f = useState('all'), filter = _f[0], setFilter = _f[1];
    var counts = { all: items.length }; items.forEach(function (it) { counts[it.status || 'included'] = (counts[it.status || 'included'] || 0) + 1; });
    var shown = items.filter(function (it) { return filter === 'all' || (it.status || 'included') === filter; });
    return e('section', { className: 'nc-amen' },
      props.filters === false ? null : e('div', { className: 'nc-chips', role: 'radiogroup', 'aria-label': 'Filter amenities' }, ['all', 'included', 'request', 'none'].filter(function (k) { return counts[k]; }).map(function (k) {
        return e('button', { key: k, type: 'button', role: 'radio', 'aria-checked': filter === k, className: 'nc-chip nc-focus', onClick: function () { setFilter(k); } }, (k === 'all' ? 'All' : STATUS[k].label) + ' · ' + counts[k]);
      })),
      e('ul', { className: 'nc-amen-grid', style: props.columns ? { gridTemplateColumns: 'repeat(' + props.columns + ', minmax(0, 1fr))' } : undefined }, shown.map(function (it) {
        var st = STATUS[it.status || 'included'];
        return e('li', { key: it.icon + it.label, className: cx('nc-amen-tile', 'is-' + (it.status || 'included')), tabIndex: 0 },
          e('span', { className: 'nc-amen-ico' }, e(Icon, { name: it.icon })),
          e('b', null, it.label || AMENITY_LABEL[it.icon]),
          e('span', { className: 'nc-amen-st' }, e(Icon, { name: st.icon }), st.label),
          it.note ? e('span', { className: 'nc-amen-note' }, it.note) : null);
      })));
  }

  /* --------------------------------------------------------- ExperienceCard */
  function ExperienceCard(props) {
    return e('article', { className: 'nc-exp' },
      e(Media, { image: props.image, time: props.time || 'day', vessel: props.vessel === undefined ? 'felucca' : props.vessel, temple: props.temple, alt: props.imageAlt }),
      e('h3', { className: 'nc-exp-title' }, props.title),
      e('p', null, props.children || props.description),
      e(Button, { variant: 'outline', size: 'sm', href: props.href }, props.cta || 'See details'));
  }

  /* ------------------------------------------------------ ItineraryTimeline */
  var DEFAULT_STOPS = [
    { day: 1, place: 'Luxor', title: 'Karnak by late light', body: 'Board at noon, then walk the hypostyle hall as the coaches leave.', tags: ['Karnak', 'Luxor Temple'] },
    { day: 2, place: 'Esna', title: 'Through the Esna lock', body: 'Khnum\'s temple, its ceiling colours recently restored, then the lock at dusk.', tags: ['Temple of Khnum'] },
    { day: 3, place: 'El Kab', title: 'Tombs few people see', body: 'Rock-cut tombs of the early New Kingdom, reached only from small boats.', tags: ['Tomb of Ahmose', 'Private mooring'] },
    { day: 4, place: 'Edfu', title: 'Horus, complete', body: 'The best-preserved temple in Egypt, visited at opening time.', tags: ['Temple of Horus'] },
    { day: 5, place: 'Kom Ombo', title: 'Two gods, one temple', body: 'Sobek and Haroeris share a double sanctuary above the river bend.', tags: ['Crocodile Museum'] },
    { day: 6, place: 'Aswan', title: 'Granite and feluccas', body: 'Philae by boat, tea at the Old Cataract, a last sail around Elephantine.', tags: ['Philae', 'Elephantine'] }
  ];
  function ItineraryTimeline(props) {
    var stops = props.stops || DEFAULT_STOPS;
    var _i = useState(0), cur = _i[0], setCur = _i[1];
    var _p = useState(false), playing = _p[0], setPlaying = _p[1];
    var pathRef = useRef(null);
    var _l = useState(1000), len = _l[0], setLen = _l[1];
    useEffect(function () { if (pathRef.current) setLen(pathRef.current.getTotalLength()); }, []);
    useEffect(function () {
      if (!playing) return;
      var t = setInterval(function () { setCur(function (c) { if (c >= stops.length - 1) { setPlaying(false); return c; } return c + 1; }); }, 2400);
      return function () { clearInterval(t); };
    }, [playing, stops.length]);
    var pts = stops.map(function (s, i) { var x = 4 + (92 * i) / (stops.length - 1); var y = 50 + Math.sin(i * 1.3) * 22; return [x, y]; });
    var d = pts.map(function (p, i) { if (!i) return 'M' + p[0] * 10 + ' ' + p[1] * 1.8; var q = pts[i - 1]; var mx = (q[0] + p[0]) * 5; return 'C' + mx + ' ' + q[1] * 1.8 + ' ' + mx + ' ' + p[1] * 1.8 + ' ' + p[0] * 10 + ' ' + p[1] * 1.8; }).join('');
    var frac = cur / (stops.length - 1);
    var onKey = function (ev) { if (ev.key === 'ArrowRight') { setCur(Math.min(stops.length - 1, cur + 1)); ev.preventDefault(); } if (ev.key === 'ArrowLeft') { setCur(Math.max(0, cur - 1)); ev.preventDefault(); } };
    var s = stops[cur];
    return e('section', { className: 'nc-itin' },
      e('div', { className: 'nc-itin-map', role: 'tablist', 'aria-label': 'Itinerary', onKeyDown: onKey },
        e('svg', { viewBox: '0 0 1000 180', preserveAspectRatio: 'none', 'aria-hidden': 'true' },
          e('path', { className: 'nc-itin-river', d: d }),
          e('path', { className: 'nc-itin-path', d: d, ref: pathRef }),
          e('path', { className: 'nc-itin-done', d: d, style: { strokeDasharray: len, strokeDashoffset: len * (1 - frac) } })),
        stops.map(function (st, i) {
          return e('button', { key: i, type: 'button', role: 'tab', 'aria-selected': i === cur, tabIndex: i === cur ? 0 : -1, className: cx('nc-stop', i < cur && 'is-past', pts[i][1] > 50 && 'is-up'), style: { left: pts[i][0] + '%', top: pts[i][1] + '%' }, onClick: function () { setCur(i); setPlaying(false); } },
            e('span', { className: 'nc-stop-dot' }), e('span', { className: 'nc-stop-name' }, st.place));
        }),
        e('div', { className: 'nc-itin-boat', style: { left: pts[cur][0] + '%', top: pts[cur][1] + '%' }, 'aria-hidden': 'true' }, e(VesselArt, { type: props.vessel || 'sail', waterline: false }))),
      e('div', { className: 'nc-itin-panel', role: 'tabpanel' },
        e('div', { className: 'nc-itin-day' }, e('small', null, 'Day'), String(s.day).padStart(2, '0')),
        e('div', { key: cur, className: 'nc-itin-anim' },
          e('p', { className: 'nc-eyebrow' }, s.place),
          e('h3', null, s.title), e('p', null, s.body),
          s.tags ? e('ul', null, s.tags.map(function (t) { return e('li', { key: t }, e(Badge, { tone: 'accent' }, t)); })) : null),
        e('div', { className: 'nc-itin-ctrl' },
          e('button', { type: 'button', className: 'nc-iconbtn', 'aria-label': 'Previous day', disabled: cur === 0, onClick: function () { setCur(cur - 1); setPlaying(false); } }, e(Icon, { name: 'chevron-left' })),
          e('button', { type: 'button', className: 'nc-iconbtn', 'aria-label': playing ? 'Pause voyage' : 'Play the voyage', onClick: function () { if (!playing && cur === stops.length - 1) setCur(0); setPlaying(!playing); } }, e(Icon, { name: playing ? 'pause' : 'play' })),
          e('button', { type: 'button', className: 'nc-iconbtn', 'aria-label': 'Next day', disabled: cur === stops.length - 1, onClick: function () { setCur(cur + 1); setPlaying(false); } }, e(Icon, { name: 'chevron-right' })))));
  }

  /* ------------------------------------------------------------ CabinPicker */
  function CabinPlan(props) {
    var k = props.kind || 0;
    return e('svg', { className: 'nc-cabin-plan', viewBox: '0 0 72 56', 'aria-hidden': 'true', fill: 'none', stroke: 'currentColor', strokeWidth: 1.2 },
      e('rect', { x: 1, y: 1, width: k === 2 ? 70 : k === 1 ? 56 : 40, height: 54 }),
      e('rect', { x: 6, y: 8, width: 18, height: 22 }), e('path', { d: 'M6 13h18' }),
      k >= 1 ? e('rect', { x: 30, y: 36, width: 20, height: 10 }) : null,
      k === 2 ? e('path', { d: 'M58 1v54M58 10h13M58 20h13M58 30h13M58 40h13' }) : null,
      e('path', { d: 'M1 44h8M' + (k === 2 ? 58 : k === 1 ? 57 : 41) + ' 6v44', strokeDasharray: '2 2' }));
  }
  var DEFAULT_CABINS = [
    { name: 'Nile-view cabin', size: '18 m²', deck: 'Main deck', bed: 'Twin or king', price: 1240 },
    { name: 'Junior suite', size: '32 m²', deck: 'Upper deck', bed: 'King, bathtub', price: 1890, left: 2 },
    { name: 'Royal suite', size: '60 m²', deck: 'Sun deck', bed: 'Private terrace', price: 3400, soldOut: true }
  ];
  function CabinPicker(props) {
    var cabins = props.cabins || DEFAULT_CABINS;
    var _v = useState(props.defaultValue || 0), val = _v[0], setVal = _v[1];
    var name = uid();
    return e('fieldset', { className: 'nc-cabins' },
      e('legend', { className: 'nc-sr' }, props.legend || 'Choose a cabin'),
      cabins.map(function (c, i) {
        return e('label', { key: i, className: cx('nc-cabin', val === i && 'is-on', c.soldOut && 'is-off') },
          e('input', { type: 'radio', name: name, checked: val === i, disabled: c.soldOut, onChange: function () { setVal(i); props.onChange && props.onChange(c, i); } }),
          e(CabinPlan, { kind: Math.min(i, 2) }),
          e('div', null, e('h4', null, c.name), e('div', { className: 'nc-cabin-meta' }, e('span', null, c.size), e('span', null, c.deck), e('span', null, c.bed)),
            c.soldOut ? e('div', { style: { marginTop: 8 } }, e(Badge, { tone: 'danger', icon: 'close' }, 'Sold out')) : c.left ? e('div', { style: { marginTop: 8 } }, e(Badge, { tone: 'accent' }, 'Only ' + c.left + ' left')) : null),
          e('div', { className: 'nc-cabin-end' }, e('span', { className: 'nc-radio', 'aria-hidden': 'true' }), e('b', null, money(c.price, props.currency)), e('small', null, 'per person')));
      }));
  }

  /* -------------------------------------------------------- BookingSummary */
  function BookingSummary(props) {
    var pp = props.pricePerPerson || 1890, nights = props.nights || 4;
    var _g = useState(2), guests = _g[0], setGuests = _g[1];
    var _t = useState(true), tips = _t[0], setTips = _t[1];
    var _f = useState(false), flights = _f[0], setFlights = _f[1];
    var _s = useState(false), sent = _s[0], setSent = _s[1];
    var fare = pp * guests, fees = 85 * guests, tip = tips ? 60 * guests : 0, fl = flights ? 290 * guests : 0;
    var total = fare + fees + tip + fl, shown = useCountUp(total);
    if (sent) return e('aside', { className: 'nc-book' }, e('div', { className: 'nc-book-sent', role: 'status' }, e(Icon, { name: 'check' }), e('h3', { className: 'nc-card-title' }, 'Request received'), e('p', { style: { margin: 0, color: 'var(--ink-muted)' } }, 'A cruise specialist will confirm availability within 24 hours. Nothing has been charged.'), e(Button, { variant: 'outline', size: 'sm', onClick: function () { setSent(false); } }, 'Back to summary')));
    return e('aside', { className: 'nc-book', 'aria-label': 'Booking summary' },
      e('div', { className: 'nc-book-head' }, e('div', null, e('p', { className: 'nc-eyebrow' }, props.vesselName || 'Dahabiya Meroe'), e('div', { className: 'nc-card-title', style: { fontSize: 22 } }, props.cabinName || 'Junior suite')), e(Badge, { tone: 'accent' }, nights + ' nights')),
      e('div', { className: 'nc-steprow', style: { padding: 0 } }, e('span', null, 'Guests', e('small', null, props.departure || 'Departs 12 Feb 2027')), e(Stepper, { label: 'guests', min: 1, max: 4, value: guests, onChange: setGuests })),
      e('div', { className: 'nc-book-rows' },
        e('div', { className: 'nc-book-row' }, e('span', null, money(pp) + ' × ' + guests), e('span', null, money(fare))),
        e('div', { className: 'nc-book-row' }, e('span', null, 'Temple entries & port fees'), e('span', null, money(fees))),
        tips ? e('div', { className: 'nc-book-row' }, e('span', null, 'Crew gratuities'), e('span', null, money(tip))) : null,
        flights ? e('div', { className: 'nc-book-row' }, e('span', null, 'Cairo flights & transfers'), e('span', null, money(fl))) : null),
      e('label', { className: 'nc-toggle' }, e('span', null, 'Include crew gratuities', e('small', null, 'Shared among the crew, paid once')), e('input', { type: 'checkbox', checked: tips, onChange: function () { setTips(!tips); } })),
      e('label', { className: 'nc-toggle' }, e('span', null, 'Add flights from Cairo', e('small', null, 'Return, with private transfers')), e('input', { type: 'checkbox', checked: flights, onChange: function () { setFlights(!flights); } })),
      e('div', { className: 'nc-book-total' }, e('span', null, 'Total'), e('b', { 'aria-live': 'polite' }, money(shown))),
      e(Button, { variant: 'primary', size: 'lg', block: true, icon: 'arrow-right', onClick: function () { setSent(true); } }, 'Request to book'),
      e('p', { className: 'nc-book-note' }, e(Icon, { name: 'check' }), 'No payment today · free cancellation for 14 days'));
  }

  /* ---------------------------------------------------------------- Gallery */
  function Gallery(props) {
    var items = props.items || [];
    var track = useRef(null);
    var _a = useState(0), active = _a[0], setActive = _a[1];
    var _p = useState(0), prog = _p[0], setProg = _p[1];
    var update = useCallback(function () {
      var el = track.current; if (!el) return;
      var mid = el.scrollLeft + el.clientWidth / 2, best = 0, bd = 1e9;
      Array.prototype.forEach.call(el.children, function (c, i) {
        var cm = c.offsetLeft + c.offsetWidth / 2, off = (cm - mid) / el.clientWidth;
        c.style.transform = 'rotateY(' + (-off * 18).toFixed(2) + 'deg) scale(' + (1 - Math.min(Math.abs(off) * 0.12, 0.12)).toFixed(3) + ')';
        if (Math.abs(cm - mid) < bd) { bd = Math.abs(cm - mid); best = i; }
      });
      setActive(best);
      var max = el.scrollWidth - el.clientWidth; setProg(max > 0 ? el.scrollLeft / max : 0);
    }, []);
    useEffect(function () { update(); window.addEventListener('resize', update); return function () { window.removeEventListener('resize', update); }; }, [update]);
    var go = function (dir) { var el = track.current; var c = el.children[Math.max(0, Math.min(items.length - 1, active + dir))]; if (c) el.scrollTo({ left: c.offsetLeft - (el.clientWidth - c.offsetWidth) / 2, behavior: 'smooth' }); };
    return e('section', { className: 'nc-gal', 'aria-roledescription': 'carousel', 'aria-label': props.label || 'Gallery' },
      e('div', { className: 'nc-gal-track', ref: track, onScroll: update, tabIndex: 0, onKeyDown: function (ev) { if (ev.key === 'ArrowRight') { go(1); ev.preventDefault(); } if (ev.key === 'ArrowLeft') { go(-1); ev.preventDefault(); } } },
        items.map(function (it, i) { return e('figure', { key: i, className: 'nc-gal-item', 'aria-label': (i + 1) + ' of ' + items.length }, e(Media, { image: it.image, time: it.time, vessel: it.vessel, temple: it.temple, alt: it.alt || it.caption }), e('figcaption', null, e('b', null, it.caption), e('span', null, it.meta))); })),
      e('div', { className: 'nc-gal-bar' },
        e('span', { className: 'nc-gal-count', 'aria-live': 'polite' }, String(active + 1).padStart(2, '0') + ' / ' + String(items.length).padStart(2, '0')),
        e('div', { className: 'nc-gal-progress', 'aria-hidden': 'true' }, e('i', { style: { width: (100 / Math.max(items.length, 1)) + '%', left: (prog * (100 - 100 / Math.max(items.length, 1))) + '%' } })),
        e('button', { type: 'button', className: 'nc-iconbtn', 'aria-label': 'Previous image', disabled: active === 0, onClick: function () { go(-1); } }, e(Icon, { name: 'chevron-left' })),
        e('button', { type: 'button', className: 'nc-iconbtn', 'aria-label': 'Next image', disabled: active === items.length - 1, onClick: function () { go(1); } }, e(Icon, { name: 'chevron-right' }))));
  }

  var api = { Icon: Icon, Button: Button, Badge: Badge, Rating: Rating, SectionHeading: SectionHeading, Scene: Scene, VesselArt: VesselArt, NavBar: NavBar, Hero: Hero, CruiseSearch: CruiseSearch, Stepper: Stepper, TextField: TextField, CruiseCard: CruiseCard, VesselTypeCard: VesselTypeCard, VesselCompare: VesselCompare, PriceAnatomy: PriceAnatomy, AmenityGrid: AmenityGrid, ExperienceCard: ExperienceCard, ItineraryTimeline: ItineraryTimeline, CabinPicker: CabinPicker, BookingSummary: BookingSummary, Gallery: Gallery, Media: Media, data: { vessels: VESSELS, priceFactors: FACTORS, amenityLabels: AMENITY_LABEL, icons: Object.keys(ICONS) } };
  window.Nilecrz = Object.assign(window.Nilecrz || {}, api);
})();

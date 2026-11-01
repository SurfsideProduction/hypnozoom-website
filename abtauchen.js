/* Abtauchen – Browser-Version von Subzoom (Reise nach innen). Nur Deutsch. Nichts wird gespeichert oder übermittelt. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (x, a, b) { return Math.min(b, Math.max(a, x)); };
  var smooth = function (p) { return p * p * (3 - 2 * p); };
  var now = function () { return performance.now() / 1000; };
  var TAU = Math.PI * 2;

  var stage = $('reise');
  if (!stage) return;

  /* ---------- Nebel-Hintergrund (Canvas, 24 Bilder/s, nur Verläufe) ---------- */
  var fog = $('azFog'), fctx = fog.getContext('2d');
  var BLOBS = [
    [[160, 196, 223], 0.25, 0.30, 0.18, 0.12, 0.62, 9.5, 0.0],
    [[149, 184, 149], 0.75, 0.35, 0.15, 0.14, 0.55, 8.0, 1.7],
    [[194, 211, 205], 0.50, 0.75, 0.20, 0.10, 0.60, 10.0, 3.1],
    [[217, 203, 227], 0.20, 0.80, 0.12, 0.12, 0.45, 8.5, 4.4],
    [[232, 220, 203], 0.85, 0.80, 0.10, 0.10, 0.42, 7.5, 5.6]
  ];
  function sizeFog() {
    var w = stage.clientWidth || 1, h = stage.clientHeight || 1;
    var s = Math.min(1, 560 / Math.max(w, h));
    fog.width = Math.max(2, Math.round(w * s));
    fog.height = Math.max(2, Math.round(h * s));
  }
  function drawFog(t) {
    var w = fog.width, h = fog.height;
    var g = fctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#4F7389'); g.addColorStop(1, '#5F8670');
    fctx.fillStyle = g; fctx.fillRect(0, 0, w, h);
    var big = Math.max(w, h);
    for (var i = 0; i < BLOBS.length; i++) {
      var b = BLOBS[i], om = TAU / b[6], ph = b[7];
      var x = w * (b[1] + b[3] * Math.sin(om * t + ph));
      var y = h * (b[2] + b[4] * Math.cos(om * t * 0.8 + ph));
      var r = big * b[5] * (1 + 0.08 * Math.sin(om * t + ph));
      var c = b[0].join(',');
      var rg = fctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, 'rgba(' + c + ',0.62)'); rg.addColorStop(1, 'rgba(' + c + ',0)');
      fctx.fillStyle = rg; fctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
  }
  var lastFog = 0, fogVisible = true;
  function fogLoop(ts) {
    requestAnimationFrame(fogLoop);
    if (document.hidden || !fogVisible) return;
    if (ts - lastFog < 41) return;
    lastFog = ts;
    drawFog(reduce ? 3 : ts / 1000);
  }
  sizeFog(); drawFog(3);
  if (window.ResizeObserver) new ResizeObserver(function () { sizeFog(); drawFog(3); }).observe(stage);
  else window.addEventListener('resize', function () { sizeFog(); drawFog(3); });
  if (window.IntersectionObserver) new IntersectionObserver(function (e) { fogVisible = e[0].isIntersecting; }).observe(stage);
  requestAnimationFrame(fogLoop);

  /* ---------- Zustand ---------- */
  var S = { phase: 'intro', minutes: 10, custom: false, wake: true, start: 0, doneAt: null, token: 0, fadeStarted: false, finishShown: false, menuVisible: false, hideTimer: 0 };
  var CYCLE = 19, INH = 4, HOLD = 7, EXH = 8, GUIDED = 4;
  var CLOSED_START = (GUIDED + 1) * CYCLE; // 95 s

  function ease(p) { return smooth(clamp(p, 0, 1)); }
  function breath(el) {
    var c = Math.max(0, el) % CYCLE, amp = 0.10;
    if (c < INH) return { label: 'Einatmen durch die Nase', rem: Math.ceil(INH - c), scale: 1 + amp * ease(c / INH) };
    if (c < INH + HOLD) return { label: 'Atem anhalten', rem: Math.ceil(INH + HOLD - c), scale: 1 + amp };
    return { label: 'Hörbar ausatmen durch den Mund', rem: Math.ceil(CYCLE - c), scale: 1 + amp - amp * ease((c - INH - HOLD) / EXH) };
  }
  function eyes(el) { var n = el / CYCLE; return n < GUIDED ? 'guided' : (n < GUIDED + 1 ? 'prompt' : 'closed'); }
  function fract(x) { return x - Math.floor(x); }
  function shimmer(t) {
    if (t < 0) return 0;
    var slot = 6.5, k0 = Math.floor(t / slot), best = 0;
    for (var k = Math.max(0, k0 - 1); k <= k0; k++) {
      var h1 = fract(Math.sin(k * 12.9898) * 43758.5453);
      var h2 = fract(Math.sin(k * 78.233) * 12345.6789);
      var h3 = fract(Math.sin(k * 39.346) * 24634.6345);
      var st = k * slot + h1 * 2.5, dur = 2 + 2 * h2, amp = 0.08 + 0.10 * h3;
      var x = (t - st) / dur;
      if (x > 0 && x < 1) { var sv = Math.sin(Math.PI * x); best = Math.max(best, amp * sv * sv); }
    }
    return best;
  }
  var WARM = [[1.00, 0.60, 0.24], [0.91, 0.35, 0.54], [0.75, 0.22, 0.17]];
  function warmColor(t) {
    var u = Math.max(0, t) / 45, i = Math.floor(u) % 3, f = smooth(u - Math.floor(u));
    var a = WARM[i], b = WARM[(i + 1) % 3];
    return 'rgb(' + Math.round(255 * (a[0] + (b[0] - a[0]) * f)) + ',' + Math.round(255 * (a[1] + (b[1] - a[1]) * f)) + ',' + Math.round(255 * (a[2] + (b[2] - a[2]) * f)) + ')';
  }
  function duration() { return S.minutes * 60; }
  function fadeLength() { return Math.min(240, 0.7 * Math.max(0, duration() - CLOSED_START)); }
  function darkness(el) {
    var fl = fadeLength(); if (fl <= 0) return 0;
    var delay = Math.max(0, Math.min(90, duration() - CLOSED_START - fl));
    return smooth(clamp((el - CLOSED_START - delay) / fl, 0, 1));
  }
  function wishKey(h) { return h >= 5 && h < 11 ? 'wish_morning' : (h >= 11 && h < 17 ? 'wish_day' : (h >= 17 && h < 22 ? 'wish_evening' : 'wish_night')); }
  var WISH = {
    wish_morning: 'Ich wünsche dir einen guten Start in den Tag.',
    wish_day: 'Ich wünsche dir einen guten Rest des Tages.',
    wish_evening: 'Ich wünsche dir einen ruhigen Abend.',
    wish_night: 'Ich wünsche dir eine ruhige Nacht.'
  };

  /* ---------- Klang (Web Audio) ---------- */
  var BLURB = {
    off: 'Nur Nebel und Atem, kein Ton. Wenn dir gerade jeder Klang zu viel ist.',
    pink: 'Gleichmässiges Rauschen, wie Regen oder Blätter im Wind. Viele nutzen es zum Einschlafen.',
    brown: 'Tief und dumpf, wie ein ferner Wasserfall. Deckt Umgebungslärm zu, wenn die Gedanken kreisen.',
    binaural: 'Links und rechts leicht verschiedene Töne (nur mit Kopfhörern), dazu leises Rauschen.',
    submarine: 'Leise blubberndes Wasser und ab und zu ein sanftes Sonar-Piepsen, wie im Innern eines U-Boots.',
    forest: 'Leichter Wind in einem Blätterwald, sanft an- und abschwellend.'
  };
  var BAND = {
    alpha: { hz: 10, blurb: 'Alpha: Beat bei 10 Hz, oft für ruhige Wachheit gewählt.' },
    theta: { hz: 6, blurb: 'Theta: Beat bei 6 Hz, oft zum Wegdämmern gewählt.' }
  };
  var AC = window.AudioContext || window.webkitAudioContext;
  var Snd = {
    ctx: null, master: null, mode: 'off', band: 'alpha', playing: true, volume: 0.5,
    fading: false, token: 0, nodes: [], timers: [], buffers: {}, pending: {}, noise: {}, failed: false,
    ensure: function () {
      if (!AC) { this.failed = true; return false; }
      if (!this.ctx) {
        try {
          this.ctx = new AC();
          var comp = this.ctx.createDynamicsCompressor();
          comp.threshold.value = -3; comp.knee.value = 0; comp.ratio.value = 20; comp.attack.value = 0.003; comp.release.value = 0.1;
          this.master = this.ctx.createGain(); this.master.gain.value = 0;
          this.master.connect(comp); comp.connect(this.ctx.destination);
          try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
        } catch (e) { this.failed = true; this.ctx = null; return false; }
      }
      if (this.ctx.state !== 'running') { try { this.ctx.resume(); } catch (e) {} }
      return true;
    },
    audible: function () { return this.playing && this.mode !== 'off'; },
    targetGain: function () { return (this.audible() && !this.fading) ? this.volume * this.volume * 0.8 : 0; },
    ramp: function (v, tau) { if (this.master) { var t = this.ctx.currentTime; this.master.gain.cancelScheduledValues(t); this.master.gain.setTargetAtTime(v, t, tau); } },
    updateGain: function () { if (this.ctx && !this.fading) this.ramp(this.targetGain(), 0.15); },
    select: function (m) { this.mode = m; this.refresh(); },
    setBand: function (b) { this.band = b; this.refresh(); },
    togglePlay: function () { this.playing = !this.playing; this.refresh(); },
    refresh: function () {
      var me = this, t = ++this.token;
      if (this.audible() && !this.ensure()) { ui.load('Dein Browser kann den Klang leider nicht abspielen.'); return; }
      if (!this.ctx) return;
      this.ramp(0, 0.08);
      setTimeout(function () {
        if (me.token !== t) return;
        me.teardown();
        if (me.audible()) {
          me.build(t);
          me.ramp(me.targetGain(), 0.15);
        }
      }, 400);
    },
    teardown: function () {
      this.timers.forEach(function (x) { clearTimeout(x); clearInterval(x); });
      this.timers = [];
      this.nodes.forEach(function (n) { try { n.stop(); } catch (e) {} try { n.disconnect(); } catch (e) {} });
      this.nodes = [];
    },
    out: function (gain) { var g = this.ctx.createGain(); g.gain.value = gain; g.connect(this.master); this.nodes.push(g); return g; },
    makeNoise: function (kind) {
      if (this.noise[kind]) return this.noise[kind];
      var sr = this.ctx.sampleRate, N = Math.round(sr * 12), F = Math.round(sr * 1.2), M = N + F, x = new Float32Array(M);
      var seed = 0x1234ABCD;
      function white() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed | 0) / 2147483647; }
      if (kind === 'pink') {
        var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (var i = 0; i < M; i++) {
          var w = white();
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.96900 * b2 + w * 0.1538520;
          b3 = 0.86650 * b3 + w * 0.3104856; b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
          x[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
        }
      } else {
        var br = 0;
        for (var j = 0; j < M; j++) { br = (br + 0.02 * white()) / 1.02; x[j] = br * 3.0; }
      }
      var buf = this.ctx.createBuffer(1, N, sr), o = buf.getChannelData(0);
      for (var k = 0; k < N; k++) {
        if (k < F) { var p = k / F; o[k] = x[k] * Math.sin(p * Math.PI / 2) + x[N + k] * Math.cos(p * Math.PI / 2); }
        else o[k] = x[k];
      }
      this.noise[kind] = buf; return buf;
    },
    loop: function (buf, gain, isStillValid) {
      var me = this, ctx = this.ctx, D = buf.duration, X = Math.min(2, D / 4), N = 64, fi = new Float32Array(N), fo = new Float32Array(N);
      for (var i = 0; i < N; i++) { var p = i / (N - 1); fi[i] = Math.sin(p * Math.PI / 2); fo[i] = Math.cos(p * Math.PI / 2); }
      var out = this.out(gain), next = ctx.currentTime + 0.05, first = true;
      function queue() {
        if (!isStillValid()) return;
        var s = ctx.createBufferSource(); s.buffer = buf;
        var g = ctx.createGain(); s.connect(g); g.connect(out);
        var t0 = next;
        if (first) g.gain.setValueAtTime(1, t0);
        else { g.gain.setValueAtTime(0, t0); g.gain.setValueCurveAtTime(fi, t0, X); }
        g.gain.setValueCurveAtTime(fo, t0 + D - X, X);
        s.start(t0); s.stop(t0 + D + 0.1);
        me.nodes.push(s);
        first = false; next = t0 + D - X;
      }
      queue();
      this.timers.push(setInterval(function () { if (ctx.currentTime > next - 8) queue(); }, 1000));
    },
    load: function (name) {
      var me = this;
      if (this.buffers[name]) return Promise.resolve(this.buffers[name]);
      if (this.pending[name]) return this.pending[name];
      var p = fetch('audio/' + name + '.mp3').then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); })
        .then(function (ab) { return new Promise(function (res, rej) { var q = me.ctx.decodeAudioData(ab, res, rej); if (q && q.catch) q.catch(rej); }); })
        .then(function (b) { me.buffers[name] = b; delete me.pending[name]; return b; });
      p.catch(function () { delete me.pending[name]; });
      this.pending[name] = p; return p;
    },
    build: function (t) {
      var me = this, ctx = this.ctx, m = this.mode, valid = function () { return me.token === t && me.mode === m && me.audible(); };
      if (m === 'pink' || m === 'brown') {
        var s = ctx.createBufferSource(); s.buffer = this.makeNoise(m); s.loop = true; s.connect(this.out(1)); s.start(); this.nodes.push(s);
      } else if (m === 'binaural') {
        var merger = ctx.createChannelMerger(2); merger.connect(this.out(1)); this.nodes.push(merger);
        var beat = BAND[this.band].hz;
        [[200, 0], [200 + beat, 1]].forEach(function (a) {
          var o = ctx.createOscillator(); o.frequency.value = a[0]; var g = ctx.createGain(); g.gain.value = 0.18;
          o.connect(g); g.connect(merger, 0, a[1]); o.start(); me.nodes.push(o, g);
        });
        var bed = ctx.createBufferSource(); bed.buffer = this.makeNoise('pink'); bed.loop = true;
        var bg = ctx.createGain(); bg.gain.value = 0.45; bed.connect(bg); bg.connect(merger, 0, 0); bg.connect(merger, 0, 1); bed.start(); this.nodes.push(bed, bg);
      } else if (m === 'submarine' || m === 'forest') {
        ui.load('Klang wird geladen …');
        var file = m === 'submarine' ? 'uboot_blubber' : 'wald_wind';
        var need = m === 'submarine' ? [this.load(file), this.load('uboot_sonar')] : [this.load(file)];
        Promise.all(need).then(function (bufs) {
          if (!valid()) return;
          ui.load('');
          me.loop(bufs[0], 1.8, valid);
          if (m === 'submarine') {
            var ping = function (delay) {
              me.timers.push(setTimeout(function () {
                if (!valid()) return;
                var s = ctx.createBufferSource(); s.buffer = bufs[1]; var g = ctx.createGain(); g.gain.value = 0.8;
                s.connect(g); g.connect(me.master); s.start(); me.nodes.push(s);
                ping((12 + 14 * Math.random()) * 1000);
              }, delay));
            };
            ping(5000);
          }
        }).catch(function () { if (valid()) ui.load('Der Klang konnte nicht geladen werden. Bitte versuche es nochmals oder wähle einen anderen.'); });
      }
    },
    fadeOutSlowly: function (secs) {
      var me = this, t = ++this.token;
      this.fading = true;
      if (this.ctx) this.ramp(0, secs / 5);
      setTimeout(function () {
        if (me.token !== t) return;
        me.fading = false; me.mode = 'off'; me.teardown(); ui.syncSound();
      }, (secs + 3) * 1000);
    },
    resetFade: function () { if (this.fading) { this.fading = false; this.refresh(); } },
    stopAll: function () { this.fading = false; this.playing = false; this.refresh(); },
    resumeIfSelected: function () { if (!this.playing) { this.playing = true; this.refresh(); } },

    /* Zurückholen: Signal + Stimme, auf der Audio-Uhr geplant */
    voiceCache: {},
    prepareVoices: function () {
      if (!this.ensure()) return;
      var keys = ['surface', 'back', 'eyes', 'wish_morning', 'wish_day', 'wish_evening', 'wish_night'];
      var me = this;
      keys.forEach(function (k) { me.load('voice_' + k).catch(function () {}); });
    },
    chime: function () {
      var ctx = this.ctx; if (!ctx) return;
      var t0 = ctx.currentTime + 0.05, notes = [329.63, 392.0, 440.0, 523.25, 587.33], me = this;
      var bus = ctx.createGain(); bus.gain.value = 0.7; bus.connect(ctx.destination);
      notes.forEach(function (f, k) {
        var t = t0 + k * 0.9;
        [[f, 1], [f * 2, 0.25]].forEach(function (p) {
          var o = ctx.createOscillator(); o.frequency.value = p[0];
          var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.18 * p[1], t + 0.15);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
          o.connect(g); g.connect(bus); o.start(t); o.stop(t + 4.1);
        });
      });
    },
    voice: function (key, delay) {
      var ctx = this.ctx, b = this.buffers['voice_' + key];
      if (!ctx || !b) return;
      var s = ctx.createBufferSource(); s.buffer = b;
      var g = ctx.createGain(); g.gain.value = 0.9; s.connect(g); g.connect(ctx.destination);
      s.start(ctx.currentTime + delay);
      this.voiceNodes.push(s);
    },
    voiceNodes: [],
    guide: function (surfacing, key) {
      this.cancelGuide();
      this.chime();
      this.voice(surfacing ? 'surface' : 'back', 3.0);
      this.voice('eyes', 11.5);
      this.voice(key, 23.5);
    },
    cancelGuide: function () { this.voiceNodes.forEach(function (n) { try { n.stop(); } catch (e) {} }); this.voiceNodes = []; }
  };

  /* ---------- Oberfläche: Einstieg, Einstellungen ---------- */
  var ui = {
    load: function (txt) { $('azLoad').textContent = txt || ''; },
    syncSound: function () {
      document.querySelectorAll('[data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === Snd.mode)); });
      document.querySelectorAll('[data-band]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-band') === Snd.band)); });
      var bin = Snd.mode === 'binaural';
      $('azBands').hidden = !bin; $('azBandHint').hidden = !bin;
      $('azVol').hidden = Snd.mode === 'off';
      $('azBlurb').textContent = BLURB[Snd.mode] + (bin ? ' ' + BAND[Snd.band].blurb : '');
      $('azPlay').setAttribute('aria-label', Snd.playing ? 'Pause' : 'Abspielen');
      $('azPlayIc').innerHTML = Snd.playing ? '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>' : '<path d="M7 4l13 8-13 8z"/>';
      if (Snd.mode === 'off') ui.load('');
    },
    syncTime: function () {
      document.querySelectorAll('[data-min]').forEach(function (b) { b.setAttribute('aria-pressed', String(!S.custom && +b.getAttribute('data-min') === S.minutes)); });
      $('azCustomBtn').setAttribute('aria-pressed', String(S.custom));
      $('azCustom').hidden = !S.custom;
      $('azMinOut').textContent = S.minutes + ' min';
    }
  };

  // Geschichte einblenden
  var lines = Array.prototype.slice.call(document.querySelectorAll('#azLines p'));
  var revealTimers = [];
  function revealAll() {
    revealTimers.forEach(clearTimeout); revealTimers = [];
    lines.forEach(function (p) { p.classList.add('on'); });
    $('azWeiter').disabled = false;
  }
  if (reduce) revealAll();
  else {
    lines.forEach(function (p, i) { revealTimers.push(setTimeout(function () { p.classList.add('on'); }, 800 + i * 2600)); });
    revealTimers.push(setTimeout(function () { $('azWeiter').disabled = false; }, 800 + (lines.length - 1) * 2600 + 1200));
  }
  $('azLines').addEventListener('click', revealAll);

  $('azWeiter').addEventListener('click', function () {
    S.phase = 'setup';
    $('azIntro').hidden = true;
    var su = $('azSetup'); su.hidden = false; su.classList.add('az-fadein');
    try { stage.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); } catch (e) {}
    ui.syncTime(); ui.syncSound();
  });

  document.querySelectorAll('[data-min]').forEach(function (b) {
    b.addEventListener('click', function () { S.custom = false; S.minutes = +b.getAttribute('data-min'); ui.syncTime(); });
  });
  $('azCustomBtn').addEventListener('click', function () { S.custom = true; ui.syncTime(); });
  $('azMinus').addEventListener('click', function () { S.minutes = Math.max(3, S.minutes - 1); ui.syncTime(); });
  $('azPlus').addEventListener('click', function () { S.minutes = Math.min(120, S.minutes + 1); ui.syncTime(); });
  $('azWake').addEventListener('change', function (e) { S.wake = e.target.checked; });

  document.querySelectorAll('[data-mode]').forEach(function (b) {
    b.addEventListener('click', function () { Snd.ensure(); Snd.select(b.getAttribute('data-mode')); ui.syncSound(); poke(); });
  });
  document.querySelectorAll('[data-band]').forEach(function (b) {
    b.addEventListener('click', function () { Snd.setBand(b.getAttribute('data-band')); ui.syncSound(); poke(); });
  });
  $('azPlay').addEventListener('click', function () { Snd.ensure(); Snd.togglePlay(); ui.syncSound(); poke(); });
  $('azVolume').addEventListener('input', function (e) { Snd.volume = +e.target.value; Snd.updateGain(); poke(); });

  /* ---------- Sitzung ---------- */
  var sess = $('azSess'), msg = $('azMsg'), mainEl = $('azMain'), promptEl = $('azPrompt'), numEl = $('azNum'), subEl = $('azSubTxt');
  var veil = $('azVeil'), ring = $('azRing'), dark = $('azDark'), menu = $('azMenu'), count = $('azCount');
  var wakeLock = null, frameId = 0, tickId = 0, lastFrame = 0, shown = { main: '', num: '' };

  function setMain(txt, small) {
    if (shown.main === txt) return;
    shown.main = txt; mainEl.textContent = txt;
    mainEl.classList.toggle('small', !!small);
    mainEl.classList.remove('az-fadein'); void mainEl.offsetWidth; mainEl.classList.add('az-fadein');
  }
  function setNum(txt) { if (shown.num !== txt) { shown.num = txt; numEl.textContent = txt; } }

  function frame(ts) {
    frameId = requestAnimationFrame(frame);
    if (ts - lastFrame < 30) return;
    lastFrame = ts;
    var t = now(), el = t - S.start, done = S.doneAt !== null, since = done ? t - S.doneAt : 0;
    var phase = eyes(el), bs = breath(el);
    var s = (reduce || done) ? 1 : bs.scale;
    var closedT = el - CLOSED_START, ramp = clamp(closedT / 3, 0, 1);
    var wave = 0.5 + 0.5 * Math.sin(TAU * closedT / 10 - Math.PI / 2);
    var vb = (phase !== 'closed' || done) ? 0 : ramp * (0.10 + 0.38 * wave);
    var glint = (!done && phase === 'closed') ? shimmer(closedT) * ramp : 0;
    veil.style.background = warmColor(closedT);
    veil.style.opacity = vb + glint;
    var closeFade = smooth(clamp((since - 47) / 5, 0, 1));
    var dk = done ? (S.wake ? Math.max(1 - smooth(clamp(since / 30, 0, 1)), closeFade) : 1) : darkness(el);
    dark.style.opacity = dk;
    ring.style.transform = 'scale(' + (1 + (s - 1) * 2.5) + ')';
    ring.classList.toggle('off', phase === 'closed' || done);
    msg.style.transform = 'scale(' + s + ')';
    msg.classList.toggle('hide', (done && !S.wake) || (!done && phase === 'closed'));

    if (done) {
      var stage_ = since < 11 ? 0 : (since < 23 ? 1 : (since < 35 ? 2 : 3));
      var h = new Date(S.doneAtWall).getHours();
      var txt = stage_ === 0 ? (S.surfacing ? 'Wir tauchen langsam auf.' : 'Wir kommen langsam zurück.')
        : (stage_ === 1 ? 'Öffne die Augen, wenn du magst.' : WISH[wishKey(h)]);
      promptEl.hidden = true; mainEl.hidden = false; setMain(txt, true); setNum('');
      subEl.hidden = stage_ !== 3;
    } else if (phase === 'prompt') {
      var c = el - GUIDED * CYCLE;
      mainEl.hidden = true; promptEl.hidden = false; subEl.hidden = true;
      $('azP2').style.opacity = smooth(clamp((c - 9) / 1.2, 0, 1));
      $('azP3').style.opacity = smooth(clamp((c - 10.5) / 1.2, 0, 1));
      numEl.style.opacity = c >= CYCLE - 5 ? 1 : 0;
      setNum(String(Math.max(1, Math.ceil(CYCLE - c))));
    } else {
      promptEl.hidden = true; mainEl.hidden = false; subEl.hidden = true;
      numEl.style.opacity = 1;
      if (phase === 'guided') { setMain(bs.label, false); setNum(String(bs.rem)); }
    }
    if (S.menuVisible) {
      var left = done ? 0 : Math.max(0, Math.ceil(duration() - el));
      count.textContent = 'noch ' + Math.floor(left / 60) + ':' + ('0' + (left % 60)).slice(-2);
      count.hidden = done;
    }
  }

  function tick() {
    if (S.phase === 'running') {
      var el = now() - S.start, d = duration();
      if (!S.fadeStarted && el >= d - 60) { S.fadeStarted = true; Snd.fadeOutSlowly(Math.min(60, d)); }
      if (el >= d) finishSession();
    } else if (S.phase === 'done') {
      var since = now() - S.doneAt;
      if (since > 52 && !S.finishShown) {
        S.finishShown = true; releaseWake(); $('azFinish').hidden = false;
      }
    }
  }

  function requestWake() {
    try { if (navigator.wakeLock && !wakeLock) navigator.wakeLock.request('screen').then(function (l) { wakeLock = l; l.addEventListener('release', function () { wakeLock = null; }); }).catch(function () {}); } catch (e) {}
  }
  function releaseWake() { try { if (wakeLock) { wakeLock.release(); wakeLock = null; } } catch (e) {} }
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && (S.phase === 'running' || (S.phase === 'done' && !S.finishShown && S.wake))) requestWake();
  });

  function fsAvailable() { return !!(stage.requestFullscreen || stage.webkitRequestFullscreen); }
  function enterFs() {
    try {
      var p = stage.requestFullscreen ? stage.requestFullscreen({ navigationUI: 'hide' }) : (stage.webkitRequestFullscreen && stage.webkitRequestFullscreen());
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }
  function exitFs() {
    try {
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
      else if (document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (e) {}
  }
  function inFs() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }

  function showMenu(v) {
    S.menuVisible = v;
    menu.classList.toggle('hidden', !v);
    sess.classList.toggle('az-menu-open', v);
    $('azFs').hidden = !(v && fsAvailable());
    $('azFs').textContent = inFs() ? 'Vollbild beenden' : 'Vollbild';
  }
  function poke() {
    if (S.phase !== 'running' && S.phase !== 'done') return;
    showMenu(true);
    clearTimeout(S.hideTimer);
    S.hideTimer = setTimeout(function () { showMenu(false); }, 6000);
  }
  sess.addEventListener('click', function (e) {
    if (e.target.closest('#azMenu') || e.target.closest('#azFinish') || e.target.closest('#azFs')) return;
    if (S.menuVisible) { clearTimeout(S.hideTimer); showMenu(false); } else poke();
  });
  menu.addEventListener('click', function (e) { if (e.target.closest('#azCloseBtn')) return; poke(); });
  $('azCloseBtn').addEventListener('click', function () { clearTimeout(S.hideTimer); showMenu(false); });
  $('azFs').addEventListener('click', function () { if (inFs()) exitFs(); else enterFs(); setTimeout(function () { showMenu(true); }, 150); });

  function lockScroll(on) { document.documentElement.style.overflow = on ? 'hidden' : ''; document.body.style.overflow = on ? 'hidden' : ''; }

  function begin() {
    Snd.ensure();
    Snd.prepareVoices();
    S.token++;
    S.start = now(); S.doneAt = null; S.phase = 'running'; S.fadeStarted = false; S.finishShown = false;
    Snd.cancelGuide(); Snd.resetFade(); Snd.resumeIfSelected(); ui.syncSound();
    $('azMenuSlot').appendChild($('azSnd'));
    $('azEnd').hidden = false;
    $('azFinish').hidden = true;
    shown = { main: '', num: '' };
    stage.classList.add('live'); lockScroll(true);
    enterFs(); requestWake();
    showMenu(false);
    cancelAnimationFrame(frameId); clearInterval(tickId);
    frameId = requestAnimationFrame(frame); tickId = setInterval(tick, 250);
    sizeFog();
  }

  function finishSession() {
    S.phase = 'done'; S.doneAt = now(); S.doneAtWall = Date.now();
    S.surfacing = Snd.mode === 'submarine';
    if (S.wake) {
      Snd.ensure();
      Snd.guide(S.surfacing, wishKey(new Date().getHours()));
    } else {
      releaseWake();
    }
    showMenu(false);
  }

  function endSession() {
    S.token++; S.phase = 'setup';
    clearInterval(tickId); cancelAnimationFrame(frameId); clearTimeout(S.hideTimer);
    Snd.cancelGuide(); Snd.stopAll();
    releaseWake(); exitFs();
    stage.classList.remove('live'); lockScroll(false);
    $('azSndSlot').appendChild($('azSnd'));
    $('azEnd').hidden = true;
    showMenu(false);
    ui.syncSound();
    sizeFog();
    try { stage.scrollIntoView({ block: 'start' }); } catch (e) {}
  }

  $('azBegin').addEventListener('click', begin);
  $('azEndBtn').addEventListener('click', endSession);
  $('azFinish').addEventListener('click', endSession);
  document.addEventListener('fullscreenchange', function () { if (S.menuVisible) showMenu(true); });

  ui.syncSound(); ui.syncTime();
})();

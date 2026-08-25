/*!
 * Frequency Generator - UI and application state
 * Copyright (c) Quantum Billing. MIT License.
 */
(function (global, document) {
  'use strict';

  var STATE_VERSION = 1;

  var WAVES = ['sine', 'square', 'sawtooth', 'triangle'];

  var NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  var engine = new global.AudioEngine();
  var store = global.FreqStore;

  function t(key, params) { return global.I18N.t(key, params); }

  var state = null;
  var cards = {};           // id -> {el, refs}
  var seq = 0;              // id counter
  var saveTimer = null;
  var scopeMode = 'wave';
  var pendingResume = [];   // ids that were playing when the tab last closed

  var els = {};

  /* ------------------------------------------------------------------ *
   * helpers
   * ------------------------------------------------------------------ */

  function $(id) { return document.getElementById(id); }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function nextId() {
    seq += 1;
    return 'g' + seq;
  }

  function maxFreq() { return engine.maxFrequency(); }

  /* Frequency <-> slider mapping.
     f(x) = 10^(x * k) - 1 with k = log10(maxFreq + 1).
     The "+1 / -1" keeps f(0) exactly 0 Hz (DC) while everything above it is
     logarithmic, so the bottom of the travel is not a useless dead zone the
     way a linear 0-48000 slider would be. */
  function sliderToFreq(slider) {
    var k = Math.log(maxFreq() + 1) / Math.LN10;
    var hz = Math.pow(10, (slider / 1000) * k) - 1;
    return roundFreq(hz);
  }

  function freqToSlider(hz) {
    var k = Math.log(maxFreq() + 1) / Math.LN10;
    var x = (Math.log(clamp(hz, 0, maxFreq()) + 1) / Math.LN10) / k;
    return clamp(x * 1000, 0, 1000);
  }

  function roundFreq(hz) {
    if (hz < 10) return Math.round(hz * 100) / 100;
    if (hz < 1000) return Math.round(hz * 10) / 10;
    return Math.round(hz);
  }

  function formatFreq(hz) {
    if (hz >= 1000) return (hz / 1000).toFixed(hz >= 10000 ? 2 : 3) + ' kHz';
    if (hz >= 10) return hz.toFixed(1) + ' Hz';
    return hz.toFixed(2) + ' Hz';
  }

  /** Returns a key, not a label: the label depends on the current language. */
  function bandOf(hz) {
    if (hz <= 0) return 'dc';
    if (hz < 20) return 'infrasound';
    if (hz < 20000) return 'audible';
    return 'ultrasonic';
  }

  function setBand(el, hz) {
    var key = bandOf(hz);
    el.textContent = t('band.' + key);
    el.setAttribute('data-band', key);
  }

  function noteOf(hz) {
    if (hz < 16 || hz > 20000) return '';
    var semitones = Math.round(12 * (Math.log(hz / 440) / Math.LN2));
    var index = ((semitones + 9) % 12 + 12) % 12;
    var octave = 4 + Math.floor((semitones + 9) / 12);
    var exact = 440 * Math.pow(2, semitones / 12);
    var cents = Math.round(1200 * (Math.log(hz / exact) / Math.LN2));
    var sign = cents > 0 ? '+' : '';
    return NOTE_NAMES[index] + octave + (cents === 0 ? '' : ' ' + sign + cents + '¢');
  }

  function fillSlider(input) {
    var min = parseFloat(input.min) || 0;
    var max = parseFloat(input.max);
    var pct = ((parseFloat(input.value) - min) / (max - min)) * 100;
    input.style.setProperty('--fill', pct + '%');
  }

  /* ------------------------------------------------------------------ *
   * state
   * ------------------------------------------------------------------ */

  function defaultGenerator(overrides) {
    var gen = {
      id: nextId(),
      name: t('gen.default', { n: Object.keys(cards).length + 1 }),
      freq: 440,
      wave: 'sine',
      volume: 0.5,
      pan: 0,
      playing: false
    };
    if (overrides) {
      for (var key in overrides) {
        if (Object.prototype.hasOwnProperty.call(overrides, key)) gen[key] = overrides[key];
      }
    }
    return gen;
  }

  function defaultState() {
    return {
      v: STATE_VERSION,
      master: { volume: 0.8 },
      generators: [
        { id: nextId(), name: t('gen.default', { n: 1 }), freq: 440, wave: 'sine', volume: 0.5, pan: 0, playing: false }
      ]
    };
  }

  /** Accept anything, return something safe to render. */
  function sanitize(raw) {
    if (!raw || typeof raw !== 'object') return defaultState();

    var master = (raw.master && typeof raw.master === 'object') ? raw.master : {};
    var list = Array.isArray(raw.generators) ? raw.generators : [];

    var generators = [];
    for (var i = 0; i < list.length && i < 32; i++) {
      var g = list[i];
      if (!g || typeof g !== 'object') continue;
      var freq = Number(g.freq);
      var volume = Number(g.volume);
      var pan = Number(g.pan);
      generators.push({
        id: nextId(),
        name: typeof g.name === 'string' && g.name.trim() ? g.name.slice(0, 28) : t('gen.default', { n: i + 1 }),
        freq: isFinite(freq) ? clamp(freq, 0, maxFreq()) : 440,
        wave: WAVES.indexOf(g.wave) >= 0 ? g.wave : 'sine',
        volume: isFinite(volume) ? clamp(volume, 0, 1) : 0.5,
        pan: isFinite(pan) ? clamp(pan, -1, 1) : 0,
        playing: g.playing === true
      });
    }
    if (!generators.length) generators = defaultState().generators;

    var mv = Number(master.volume);
    return {
      v: STATE_VERSION,
      master: { volume: isFinite(mv) ? clamp(mv, 0, 1) : 0.8 },
      generators: generators
    };
  }

  function snapshot() {
    var generators = [];
    for (var i = 0; i < state.generators.length; i++) {
      var g = state.generators[i];
      generators.push({
        name: g.name, freq: g.freq, wave: g.wave,
        volume: g.volume, pan: g.pan, playing: g.playing
      });
    }
    return { v: STATE_VERSION, master: { volume: state.master.volume }, generators: generators };
  }

  function scheduleSave() {
    if (saveTimer) global.clearTimeout(saveTimer);
    saveTimer = global.setTimeout(function () {
      saveTimer = null;
      store.saveSession(snapshot());
    }, 250);
  }

  function findGenerator(id) {
    for (var i = 0; i < state.generators.length; i++) {
      if (state.generators[i].id === id) return state.generators[i];
    }
    return null;
  }

  /* ------------------------------------------------------------------ *
   * audio wiring
   * ------------------------------------------------------------------ */

  function syncVoice(gen) {
    var voice = engine.voice(gen.id);
    voice.setWaveform(gen.wave);
    voice.setFrequency(gen.freq);
    voice.setVolume(gen.volume);
    voice.setPan(gen.pan);
    return voice;
  }

  function playGenerator(gen) {
    try {
      engine.resume();
      syncVoice(gen).start();
      gen.playing = true;
      hideNotice();
    } catch (err) {
      showNotice(err && err.message ? err.message : t('notice.audioFailed'));
      gen.playing = false;
    }
    updateCard(gen);
    updateStats();
    scheduleSave();
  }

  function stopGenerator(gen) {
    engine.voice(gen.id).stop();
    gen.playing = false;
    updateCard(gen);
    updateStats();
    scheduleSave();
  }

  function playAll() {
    for (var i = 0; i < state.generators.length; i++) playGenerator(state.generators[i]);
  }

  function stopAll() {
    for (var i = 0; i < state.generators.length; i++) stopGenerator(state.generators[i]);
  }

  function soloGenerator(gen) {
    for (var i = 0; i < state.generators.length; i++) {
      var other = state.generators[i];
      if (other.id === gen.id) { playGenerator(other); } else { stopGenerator(other); }
    }
  }

  /* ------------------------------------------------------------------ *
   * cards
   * ------------------------------------------------------------------ */

  function buildCard(gen) {
    var frag = els.template.content.cloneNode(true);
    var el = frag.querySelector('.gen');
    global.I18N.apply(el);   // the template's own labels

    var refs = {
      el: el,
      name: el.querySelector('.gen-name'),
      freqSlider: el.querySelector('.js-freq-slider'),
      freqInput: el.querySelector('.js-freq-input'),
      freqReadout: el.querySelector('.js-freq-readout'),
      band: el.querySelector('.js-band'),
      max: el.querySelector('.js-max'),
      vol: el.querySelector('.js-vol'),
      volReadout: el.querySelector('.js-vol-readout'),
      pan: el.querySelector('.js-pan'),
      panReadout: el.querySelector('.js-pan-readout'),
      waves: el.querySelector('.js-waves'),
      preview: el.querySelector('.js-preview'),
      waveDesc: el.querySelector('.js-wave-desc'),
      play: el.querySelector('.js-play'),
      solo: el.querySelector('.js-solo'),
      note: el.querySelector('.js-note')
    };

    refs.freqInput.max = String(maxFreq());
    refs.max.textContent = formatFreq(maxFreq());

    refs.name.addEventListener('input', function () {
      gen.name = refs.name.value;
      scheduleSave();
    });

    refs.freqSlider.addEventListener('input', function () {
      setFrequency(gen, sliderToFreq(parseFloat(refs.freqSlider.value)), 'slider');
    });

    refs.freqInput.addEventListener('input', function () {
      var value = parseFloat(refs.freqInput.value);
      if (!isFinite(value)) return;
      setFrequency(gen, clamp(value, 0, maxFreq()), 'input');
    });
    refs.freqInput.addEventListener('blur', function () {
      refs.freqInput.value = String(gen.freq);
    });

    var nudges = el.querySelectorAll('.js-nudge');
    for (var i = 0; i < nudges.length; i++) {
      nudges[i].addEventListener('click', function (event) {
        var delta = parseFloat(event.currentTarget.getAttribute('data-delta'));
        setFrequency(gen, clamp(roundFreq(gen.freq + delta), 0, maxFreq()), 'nudge');
      });
    }

    refs.vol.addEventListener('input', function () {
      gen.volume = parseInt(refs.vol.value, 10) / 100;
      engine.voice(gen.id).setVolume(gen.volume);
      refs.volReadout.textContent = Math.round(gen.volume * 100) + '%';
      fillSlider(refs.vol);
      scheduleSave();
    });

    refs.pan.addEventListener('input', function () {
      gen.pan = parseInt(refs.pan.value, 10) / 100;
      engine.voice(gen.id).setPan(gen.pan);
      refs.panReadout.textContent = panLabel(gen.pan);
      fillSlider(refs.pan);
      scheduleSave();
    });

    refs.waves.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('[data-wave]') : null;
      if (!button) return;
      gen.wave = button.getAttribute('data-wave');
      engine.voice(gen.id).setWaveform(gen.wave);
      updateCard(gen);
      scheduleSave();
    });

    refs.play.addEventListener('click', function () {
      if (gen.playing) { stopGenerator(gen); } else { playGenerator(gen); }
    });

    refs.solo.addEventListener('click', function () {
      soloGenerator(gen);
    });

    el.querySelector('.js-duplicate').addEventListener('click', function () {
      addGenerator({
        name: t('gen.copy', { name: gen.name }).slice(0, 28),
        freq: gen.freq, wave: gen.wave, volume: gen.volume, pan: gen.pan
      });
    });

    el.querySelector('.js-remove').addEventListener('click', function () {
      removeGenerator(gen);
    });

    cards[gen.id] = refs;
    els.grid.appendChild(el);
    updateCard(gen);
  }

  function setFrequency(gen, hz, source) {
    gen.freq = hz;
    engine.voice(gen.id).setFrequency(hz);

    var refs = cards[gen.id];
    if (!refs) return;
    refs.freqReadout.textContent = formatFreq(hz);
    setBand(refs.band, hz);
    refs.note.textContent = noteOf(hz);
    if (source !== 'input') refs.freqInput.value = String(hz);
    if (source !== 'slider') {
      refs.freqSlider.value = String(freqToSlider(hz));
      fillSlider(refs.freqSlider);
    } else {
      fillSlider(refs.freqSlider);
    }
    scheduleSave();
  }

  function panLabel(pan) {
    var pct = Math.round(pan * 100);
    if (pct === 0) return t('pan.center');
    return t(pct < 0 ? 'pan.left' : 'pan.right', { pct: Math.abs(pct) });
  }

  function updateCard(gen) {
    var refs = cards[gen.id];
    if (!refs) return;

    if (document.activeElement !== refs.name) refs.name.value = gen.name;
    refs.freqReadout.textContent = formatFreq(gen.freq);
    setBand(refs.band, gen.freq);
    refs.note.textContent = noteOf(gen.freq);

    if (document.activeElement !== refs.freqInput) refs.freqInput.value = String(gen.freq);
    refs.freqSlider.value = String(freqToSlider(gen.freq));
    refs.vol.value = String(Math.round(gen.volume * 100));
    refs.pan.value = String(Math.round(gen.pan * 100));
    refs.volReadout.textContent = Math.round(gen.volume * 100) + '%';
    refs.panReadout.textContent = panLabel(gen.pan);
    fillSlider(refs.freqSlider);
    fillSlider(refs.vol);
    fillSlider(refs.pan);

    var buttons = refs.waves.querySelectorAll('[data-wave]');
    for (var i = 0; i < buttons.length; i++) {
      var on = buttons[i].getAttribute('data-wave') === gen.wave;
      buttons[i].classList.toggle('is-active', on);
      buttons[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }

    refs.waveDesc.textContent = t('wave.desc.' + gen.wave);
    drawPreview(refs.preview, gen.wave);

    refs.el.classList.toggle('is-playing', gen.playing);
    refs.play.innerHTML = '<span class="ico" aria-hidden="true">'
      + (gen.playing ? '&#9632;' : '&#9654;') + '</span> ';
    refs.play.appendChild(document.createTextNode(t(gen.playing ? 'gen.stop' : 'gen.play')));
    refs.solo.classList.toggle('is-on', gen.playing && engine.activeCount() === 1);
  }

  function addGenerator(overrides) {
    if (state.generators.length >= 32) {
      showNotice(t('notice.limit'));
      return;
    }
    var gen = defaultGenerator(overrides);
    state.generators.push(gen);
    buildCard(gen);
    scheduleSave();
    updateStats();
  }

  function removeGenerator(gen) {
    engine.removeVoice(gen.id);
    var refs = cards[gen.id];
    if (refs && refs.el.parentNode) refs.el.parentNode.removeChild(refs.el);
    delete cards[gen.id];
    for (var i = 0; i < state.generators.length; i++) {
      if (state.generators[i].id === gen.id) { state.generators.splice(i, 1); break; }
    }
    if (!state.generators.length) addGenerator({ name: 'Generator 1' });
    scheduleSave();
    updateStats();
  }

  function rebuild() {
    /* Drop every voice, not just stop it: loading a preset replaces the
       generator list wholesale, so the old ids are gone for good. */
    engine.eachVoice(function (voice, id) { engine.removeVoice(id); });
    els.grid.innerHTML = '';
    cards = {};
    for (var i = 0; i < state.generators.length; i++) buildCard(state.generators[i]);
    els.masterVol.value = String(Math.round(state.master.volume * 100));
    els.masterVolOut.textContent = Math.round(state.master.volume * 100) + '%';
    fillSlider(els.masterVol);
    engine.setMasterVolume(state.master.volume);
    updateStats();
  }

  /* ------------------------------------------------------------------ *
   * waveform preview
   * ------------------------------------------------------------------ */

  function waveSample(type, phase) {
    switch (type) {
      case 'square': return phase < 0.5 ? 1 : -1;
      case 'sawtooth': return 2 * phase - 1;
      case 'triangle': return phase < 0.5 ? (4 * phase - 1) : (3 - 4 * phase);
      default: return Math.sin(phase * Math.PI * 2);
    }
  }

  function sizeCanvas(canvas) {
    var dpr = global.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    var width = Math.max(1, Math.round(rect.width * dpr));
    var height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    return { w: canvas.width, h: canvas.height, dpr: dpr };
  }

  function drawPreview(canvas, type) {
    var size = sizeCanvas(canvas);
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, size.w, size.h);
    ctx.lineWidth = Math.max(1.5, 2 * size.dpr);
    ctx.strokeStyle = '#a9adb4';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    var mid = size.h / 2;
    var amp = size.h * 0.36;
    for (var x = 0; x <= size.w; x++) {
      var phase = (x / size.w) * 1.25 % 1;
      var y = mid - waveSample(type, phase) * amp;
      if (x === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
    }
    ctx.stroke();
  }

  /* ------------------------------------------------------------------ *
   * scope / spectrum
   * ------------------------------------------------------------------ */

  var timeData = null;
  var freqData = null;

  function drawGrid(ctx, w, h) {
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (var i = 1; i < 4; i++) {
      var x = (w / 4) * i;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
  }

  function drawIdle(ctx, w, h) {
    var gen = state.generators[0];
    var type = gen ? gen.wave : 'sine';
    ctx.strokeStyle = 'rgba(169,173,180,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var x = 0; x <= w; x++) {
      var phase = ((x / w) * 3) % 1;
      var y = h / 2 - waveSample(type, phase) * h * 0.3;
      if (x === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
    }
    ctx.stroke();
  }

  function drawScope() {
    var canvas = els.scope;
    var size = sizeCanvas(canvas);
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, size.w, size.h);
    drawGrid(ctx, size.w, size.h);

    if (!engine.analyser || engine.activeCount() === 0) {
      drawIdle(ctx, size.w, size.h);
      return;
    }

    var analyser = engine.analyser;

    if (scopeMode === 'spectrum') {
      if (!freqData || freqData.length !== analyser.frequencyBinCount) {
        freqData = new Uint8Array(analyser.frequencyBinCount);
      }
      analyser.getByteFrequencyData(freqData);

      var nyquist = engine.sampleRate() / 2;
      var bars = Math.min(180, Math.floor(size.w / (4 * size.dpr)));
      var barW = size.w / bars;
      var minHz = 10;
      ctx.fillStyle = '#29d17c';
      for (var b = 0; b < bars; b++) {
        /* Log-spaced buckets: a linear x axis would squash everything
           audible into the leftmost 40% of the display. */
        var lo = minHz * Math.pow(nyquist / minHz, b / bars);
        var hi = minHz * Math.pow(nyquist / minHz, (b + 1) / bars);
        var loBin = Math.floor((lo / nyquist) * freqData.length);
        var hiBin = Math.max(loBin + 1, Math.ceil((hi / nyquist) * freqData.length));
        var peak = 0;
        for (var k = loBin; k < hiBin && k < freqData.length; k++) {
          if (freqData[k] > peak) peak = freqData[k];
        }
        var barH = (peak / 255) * size.h * 0.92;
        ctx.fillRect(b * barW + 1, size.h - barH, Math.max(1, barW - 2), barH);
      }
      return;
    }

    if (!timeData || timeData.length !== analyser.fftSize) {
      timeData = new Uint8Array(analyser.fftSize);
    }
    analyser.getByteTimeDomainData(timeData);

    ctx.strokeStyle = '#29d17c';
    ctx.lineWidth = Math.max(1.5, 2 * size.dpr);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    var step = size.w / timeData.length;
    for (var i = 0; i < timeData.length; i++) {
      var v = (timeData[i] - 128) / 128;
      var y = size.h / 2 - v * size.h * 0.44;
      var px = i * step;
      if (i === 0) { ctx.moveTo(px, y); } else { ctx.lineTo(px, y); }
    }
    ctx.stroke();
  }

  function loop() {
    drawScope();
    global.requestAnimationFrame(loop);
  }

  /* ------------------------------------------------------------------ *
   * presets
   * ------------------------------------------------------------------ */

  function refreshPresetList(selectName) {
    var presets = store.loadPresets();
    var names = Object.keys(presets).sort();
    els.presetList.innerHTML = '';

    if (!names.length) {
      var empty = document.createElement('option');
      empty.value = '';
      empty.textContent = t('presets.none');
      els.presetList.appendChild(empty);
      els.presetList.disabled = true;
      return;
    }

    els.presetList.disabled = false;
    for (var i = 0; i < names.length; i++) {
      var option = document.createElement('option');
      option.value = names[i];
      option.textContent = names[i];
      els.presetList.appendChild(option);
    }
    if (selectName && presets[selectName]) els.presetList.value = selectName;
  }

  function savePreset() {
    var name = (els.presetName.value || '').trim();
    if (!name) { showNotice(t('notice.presetName')); els.presetName.focus(); return; }

    var presets = store.loadPresets();
    if (presets[name] && !global.confirm(t('confirm.overwrite', { name: name }))) return;

    presets[name] = snapshot();
    if (!store.savePresets(presets)) {
      showNotice(t('notice.presetStorage'));
      return;
    }
    els.presetName.value = '';
    refreshPresetList(name);
    hideNotice();
  }

  function loadPreset() {
    var name = els.presetList.value;
    if (!name) return;
    var presets = store.loadPresets();
    if (!presets[name]) return;
    applyState(sanitize(presets[name]));
  }

  function deletePreset() {
    var name = els.presetList.value;
    if (!name) return;
    if (!global.confirm(t('confirm.deletePreset', { name: name }))) return;
    var presets = store.loadPresets();
    delete presets[name];
    store.savePresets(presets);
    refreshPresetList();
  }

  function applyState(next) {
    var wasPlaying = [];
    for (var i = 0; i < next.generators.length; i++) {
      if (next.generators[i].playing) wasPlaying.push(next.generators[i]);
      next.generators[i].playing = false;
    }
    state = next;
    rebuild();
    for (var j = 0; j < wasPlaying.length; j++) playGenerator(wasPlaying[j]);
    scheduleSave();
  }

  function exportJSON() {
    var payload = {
      app: 'quantum-billing-frequency-generator',
      version: STATE_VERSION,
      exported: new Date().toISOString(),
      session: snapshot(),
      presets: store.loadPresets()
    };
    var blob = new global.Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = global.URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'frequency-generator-settings.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    global.setTimeout(function () { global.URL.revokeObjectURL(url); }, 1000);
  }

  function importJSON(file) {
    var reader = new global.FileReader();
    reader.onload = function () {
      var data;
      try {
        data = JSON.parse(String(reader.result));
      } catch (err) {
        showNotice(t('notice.badJson'));
        return;
      }
      if (data && data.presets && typeof data.presets === 'object') {
        var presets = store.loadPresets();
        for (var name in data.presets) {
          if (Object.prototype.hasOwnProperty.call(data.presets, name)) {
            presets[name] = sanitize(data.presets[name]);
          }
        }
        store.savePresets(presets);
        refreshPresetList();
      }
      var session = data && data.session ? data.session : data;
      applyState(sanitize(session));
      hideNotice();
    };
    reader.onerror = function () { showNotice(t('notice.unreadable')); };
    reader.readAsText(file);
  }

  function resetAll() {
    if (!global.confirm(t('confirm.reset'))) return;
    engine.stopAll();
    store.clearAll();
    seq = 0;
    state = defaultState();
    rebuild();
    refreshPresetList();
    hideNotice();
  }

  /* ------------------------------------------------------------------ *
   * chrome
   * ------------------------------------------------------------------ */

  function showNotice(message) {
    els.notice.textContent = message;
    els.notice.hidden = false;
  }

  function hideNotice() {
    els.notice.hidden = true;
  }

  function setLanguage(lang) {
    global.I18N.set(lang);
  }

  /** Re-render everything the dictionary touches that is not a static label. */
  function refreshTexts() {
    var buttons = document.querySelectorAll('[data-lang]');
    for (var b = 0; b < buttons.length; b++) {
      buttons[b].classList.toggle('is-active', buttons[b].getAttribute('data-lang') === global.I18N.current());
    }

    var chips = document.querySelectorAll('.deter-chip');
    for (var c = 0; c < chips.length; c++) {
      var out = chips[c].querySelector('.deter-freq');
      if (out) out.textContent = formatFreq(parseFloat(chips[c].getAttribute('data-freq')));
    }

    els.footerCopy.textContent = t('footer.copy', { year: new Date().getFullYear() });
    if (pendingResume.length) {
      els.resumeText.textContent = t('resume.text', { count: pendingResume.length });
    }

    for (var i = 0; i < state.generators.length; i++) updateCard(state.generators[i]);

    var selected = els.presetList.value;
    refreshPresetList(selected);
    updateStats();
  }

  function updateStats() {
    els.statActive.textContent = String(engine.activeCount());
    els.statRate.textContent = engine.ctx ? (engine.sampleRate() / 1000).toFixed(1) + ' kHz' : t('stats.idle');
    els.statMax.textContent = formatFreq(maxFreq());
  }

  function bindChrome() {
    var langButtons = document.querySelectorAll('[data-lang]');
    for (var l = 0; l < langButtons.length; l++) {
      langButtons[l].addEventListener('click', function (event) {
        setLanguage(event.currentTarget.getAttribute('data-lang'));
      });
    }

    var deterChips = document.querySelectorAll('[data-freq]');
    for (var d = 0; d < deterChips.length; d++) {
      /* Add the generator but do not start it: a 25 kHz tone you cannot hear
         is not something to begin playing on a single tap. */
      deterChips[d].addEventListener('click', function (event) {
        var chip = event.currentTarget;
        addGenerator({
          name: t(chip.getAttribute('data-name')),
          freq: clamp(parseFloat(chip.getAttribute('data-freq')), 0, maxFreq()),
          /* Sine, not square: at these frequencies the harmonics of a square
             are past the Nyquist limit and buy nothing but heat. */
          wave: 'sine',
          volume: 0.6
        });
        var last = els.grid.lastElementChild;
        if (last && last.scrollIntoView) last.scrollIntoView({ block: 'nearest' });
      });
    }

    els.playAll.addEventListener('click', playAll);
    els.stopAll.addEventListener('click', stopAll);
    els.add.addEventListener('click', function () { addGenerator(); });

    els.masterVol.addEventListener('input', function () {
      state.master.volume = parseInt(els.masterVol.value, 10) / 100;
      engine.setMasterVolume(state.master.volume);
      els.masterVolOut.textContent = Math.round(state.master.volume * 100) + '%';
      fillSlider(els.masterVol);
      scheduleSave();
    });

    var modeButtons = document.querySelectorAll('[data-scope-mode]');
    for (var i = 0; i < modeButtons.length; i++) {
      modeButtons[i].addEventListener('click', function (event) {
        scopeMode = event.currentTarget.getAttribute('data-scope-mode');
        for (var j = 0; j < modeButtons.length; j++) {
          modeButtons[j].classList.toggle('is-active', modeButtons[j] === event.currentTarget);
        }
      });
    }

    els.savePreset.addEventListener('click', savePreset);
    els.loadPreset.addEventListener('click', loadPreset);
    els.deletePreset.addEventListener('click', deletePreset);
    els.export.addEventListener('click', exportJSON);
    els.import.addEventListener('click', function () { els.importFile.click(); });
    els.importFile.addEventListener('change', function () {
      if (els.importFile.files && els.importFile.files[0]) importJSON(els.importFile.files[0]);
      els.importFile.value = '';
    });
    els.reset.addEventListener('click', resetAll);

    els.resume.addEventListener('click', function () {
      for (var k = 0; k < pendingResume.length; k++) {
        var gen = findGenerator(pendingResume[k]);
        if (gen) playGenerator(gen);
      }
      pendingResume = [];
      els.resumeBar.hidden = true;
    });

    els.dismissResume.addEventListener('click', function () {
      pendingResume = [];
      els.resumeBar.hidden = true;
      scheduleSave();
    });

    document.addEventListener('keydown', function (event) {
      var tag = event.target && event.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault();
        if (engine.activeCount() > 0) { stopAll(); } else { playAll(); }
      }
    });

    /* Persist immediately when the tab goes away - mobile browsers often kill
       pages without firing anything else. */
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') store.saveSession(snapshot());
    });
    global.addEventListener('pagehide', function () { store.saveSession(snapshot()); });

    global.addEventListener('resize', function () {
      for (var id in cards) {
        if (Object.prototype.hasOwnProperty.call(cards, id)) {
          var gen = findGenerator(id);
          if (gen) drawPreview(cards[id].preview, gen.wave);
        }
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * boot
   * ------------------------------------------------------------------ */

  function init() {
    els = {
      grid: $('generators'),
      template: $('genTemplate'),
      scope: $('scope'),
      playAll: $('btnPlayAll'),
      stopAll: $('btnStopAll'),
      add: $('btnAdd'),
      masterVol: $('masterVol'),
      masterVolOut: $('masterVolOut'),
      statActive: $('statActive'),
      statRate: $('statRate'),
      statMax: $('statMax'),
      presetName: $('presetName'),
      presetList: $('presetList'),
      savePreset: $('btnSavePreset'),
      loadPreset: $('btnLoadPreset'),
      deletePreset: $('btnDeletePreset'),
      export: $('btnExport'),
      import: $('btnImport'),
      importFile: $('importFile'),
      reset: $('btnReset'),
      notice: $('audioNotice'),
      resumeBar: $('resumeBar'),
      resumeText: $('resumeText'),
      resume: $('btnResume'),
      dismissResume: $('btnDismissResume'),
      footerCopy: $('footerCopy')
    };

    /* Language first: default generator names and every label below depend
       on it. Not persisted here - reading a stored choice is not a choice. */
    global.I18N.set(global.I18N.detect(), { persist: false });
    global.I18N.onChange(refreshTexts);

    if (!engine.isSupported()) {
      showNotice(t('notice.noAudio'));
    } else {
      try {
        /* Created up front (suspended until a gesture) so the real sample rate
           and Nyquist limit are known before the first slider is drawn. */
        engine.init();
      } catch (err) {
        showNotice(err && err.message ? err.message : t('notice.audioInit'));
      }
    }

    var saved = store.loadSession();
    state = saved ? sanitize(saved) : defaultState();

    if (!store.isAvailable()) {
      showNotice(t('notice.storageBlocked'));
    }

    /* Autoplay is not permitted without a gesture, so anything that was
       running last time is offered as a one-tap resume instead. */
    for (var i = 0; i < state.generators.length; i++) {
      if (state.generators[i].playing) {
        pendingResume.push(state.generators[i].id);
        state.generators[i].playing = false;
      }
    }

    bindChrome();
    rebuild();
    refreshPresetList();

    if (pendingResume.length) {
      els.resumeText.textContent = t('resume.text', { count: pendingResume.length });
      els.resumeBar.hidden = false;
    }

    refreshTexts();
    loop();
    registerServiceWorker();
  }

  /* install.js needs a way to say something in the page's own notice strip. */
  global.FreqGen = { notice: function (message) { showNotice(message); } };

  /* Offline support. Only over https (or localhost) - browsers refuse to
     register a worker on file:// or plain http, and that is not an error
     worth showing anyone. */
  function registerServiceWorker() {
    if (!('serviceWorker' in global.navigator)) return;
    var host = global.location.hostname;
    var secure = global.location.protocol === 'https:' || host === 'localhost' || host === '127.0.0.1';
    if (!secure) return;
    global.navigator.serviceWorker.register('./sw.js').catch(function () { /* offline mode is optional */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window, document);

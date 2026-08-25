/*!
 * Frequency Generator - Web Audio engine
 * Copyright (c) Quantum Billing. MIT License.
 *
 * One AudioContext, one master bus, N independent voices. Each voice is an
 * OscillatorNode -> GainNode -> StereoPannerNode chain, and voices are started
 * and stopped independently so any subset can sound at once.
 */
(function (global) {
  'use strict';

  /* Ask for the highest rate we can get: the top playable frequency is the
     Nyquist limit (sampleRate / 2), so 96 kHz buys real ultrasonic headroom.
     Devices that refuse simply fall through to their native rate. */
  var PREFERRED_RATES = [96000, 88200, 48000];

  /* Short gain ramps instead of hard starts/stops: a step change in amplitude
     is a click, and clicks are broadband energy through the speaker. */
  var RAMP = 0.02;

  function clamp(value, min, max) {
    return value < min ? min : (value > max ? max : value);
  }

  function Voice(engine, id) {
    this.engine = engine;
    this.id = id;
    this.osc = null;
    this.gain = null;
    this.panner = null;
    this.playing = false;
    this.frequency = 440;
    this.waveform = 'sine';
    this.volume = 0.5;
    this.pan = 0;
  }

  Voice.prototype._now = function () {
    return this.engine.ctx.currentTime;
  };

  Voice.prototype.start = function () {
    if (this.playing) return;
    var ctx = this.engine.init();
    var now = ctx.currentTime;

    this.gain = ctx.createGain();
    this.gain.gain.setValueAtTime(0, now);
    this.gain.gain.linearRampToValueAtTime(this.volume, now + RAMP);

    if (typeof ctx.createStereoPanner === 'function') {
      this.panner = ctx.createStereoPanner();
      this.panner.pan.setValueAtTime(clamp(this.pan, -1, 1), now);
      this.gain.connect(this.panner);
      this.panner.connect(this.engine.master);
    } else {
      /* Older Safari: no StereoPanner. Mono is better than silence. */
      this.panner = null;
      this.gain.connect(this.engine.master);
    }

    this.osc = ctx.createOscillator();
    this.osc.type = this.waveform;
    this.osc.frequency.setValueAtTime(this.clampFreq(this.frequency), now);
    this.osc.connect(this.gain);
    this.osc.start(now);

    this.playing = true;
    this.engine._notify();
  };

  Voice.prototype.stop = function () {
    if (!this.playing) return;
    var now = this._now();
    var osc = this.osc;
    var gain = this.gain;
    var panner = this.panner;

    this.playing = false;
    this.osc = null;
    this.gain = null;
    this.panner = null;

    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + RAMP);
      osc.stop(now + RAMP + 0.01);
    } catch (err) {
      try { osc.stop(); } catch (err2) { /* already stopped */ }
    }

    /* Detach once the tail has run so the nodes can be collected. */
    global.setTimeout(function () {
      try { osc.disconnect(); } catch (e) { /* ignore */ }
      try { gain.disconnect(); } catch (e) { /* ignore */ }
      if (panner) { try { panner.disconnect(); } catch (e) { /* ignore */ } }
    }, (RAMP + 0.1) * 1000);

    this.engine._notify();
  };

  Voice.prototype.toggle = function () {
    if (this.playing) { this.stop(); } else { this.start(); }
  };

  Voice.prototype.clampFreq = function (hz) {
    return clamp(hz, 0, this.engine.maxFrequency());
  };

  Voice.prototype.setFrequency = function (hz) {
    this.frequency = hz;
    if (this.osc) {
      /* Glide rather than jump: stepping the frequency of a running
         oscillator mid-cycle is audible as a tick. */
      var now = this._now();
      this.osc.frequency.cancelScheduledValues(now);
      this.osc.frequency.setValueAtTime(this.osc.frequency.value, now);
      this.osc.frequency.linearRampToValueAtTime(this.clampFreq(hz), now + 0.03);
    }
  };

  Voice.prototype.setWaveform = function (type) {
    this.waveform = type;
    if (this.osc) this.osc.type = type;
  };

  Voice.prototype.setVolume = function (value) {
    this.volume = clamp(value, 0, 1);
    if (this.gain) {
      var now = this._now();
      this.gain.gain.cancelScheduledValues(now);
      this.gain.gain.setValueAtTime(this.gain.gain.value, now);
      this.gain.gain.linearRampToValueAtTime(this.volume, now + RAMP);
    }
  };

  Voice.prototype.setPan = function (value) {
    this.pan = clamp(value, -1, 1);
    if (this.panner) {
      this.panner.pan.setTargetAtTime(this.pan, this._now(), 0.01);
    }
  };

  function AudioEngine() {
    this.ctx = null;
    this.master = null;
    this.analyser = null;
    this.voices = {};
    this.masterVolume = 0.8;
    this.onChange = null;
    this.lastError = null;
  }

  AudioEngine.prototype.isSupported = function () {
    return !!(global.AudioContext || global.webkitAudioContext);
  };

  AudioEngine.prototype.init = function () {
    if (this.ctx) return this.ctx;

    var Ctor = global.AudioContext || global.webkitAudioContext;
    if (!Ctor) {
      this.lastError = 'This browser does not support the Web Audio API.';
      throw new Error(this.lastError);
    }

    for (var i = 0; i < PREFERRED_RATES.length && !this.ctx; i++) {
      try {
        this.ctx = new Ctor({ sampleRate: PREFERRED_RATES[i], latencyHint: 'interactive' });
      } catch (err) {
        this.ctx = null;
      }
    }
    if (!this.ctx) this.ctx = new Ctor();

    this.master = this.ctx.createGain();
    this.master.gain.value = this.masterVolume;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.75;

    this.master.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    return this.ctx;
  };

  /** Browsers require a user gesture before audio may sound. */
  AudioEngine.prototype.resume = function () {
    var ctx = this.init();
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      return ctx.resume();
    }
    return global.Promise ? global.Promise.resolve() : null;
  };

  AudioEngine.prototype.sampleRate = function () {
    return this.ctx ? this.ctx.sampleRate : 48000;
  };

  /** Nyquist limit, minus a hair so we never sit exactly on it. */
  AudioEngine.prototype.maxFrequency = function () {
    return Math.floor(this.sampleRate() / 2) - 1;
  };

  AudioEngine.prototype.voice = function (id) {
    if (!this.voices[id]) this.voices[id] = new Voice(this, id);
    return this.voices[id];
  };

  AudioEngine.prototype.removeVoice = function (id) {
    var voice = this.voices[id];
    if (!voice) return;
    voice.stop();
    delete this.voices[id];
  };

  AudioEngine.prototype.eachVoice = function (fn) {
    var ids = Object.keys(this.voices);
    for (var i = 0; i < ids.length; i++) fn(this.voices[ids[i]], ids[i]);
  };

  AudioEngine.prototype.stopAll = function () {
    this.eachVoice(function (voice) { voice.stop(); });
  };

  AudioEngine.prototype.activeCount = function () {
    var count = 0;
    this.eachVoice(function (voice) { if (voice.playing) count++; });
    return count;
  };

  AudioEngine.prototype.setMasterVolume = function (value) {
    this.masterVolume = clamp(value, 0, 1);
    if (this.master) {
      var now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(this.masterVolume, now + RAMP);
    }
  };

  AudioEngine.prototype._notify = function () {
    if (typeof this.onChange === 'function') this.onChange(this);
  };

  global.AudioEngine = AudioEngine;
})(window);

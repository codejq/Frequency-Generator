/*!
 * Frequency Generator - browser storage layer
 * Copyright (c) Quantum Billing. MIT License.
 *
 * Everything lives in localStorage on the user's own device. Nothing is sent
 * anywhere. Every access is guarded because private-browsing modes and
 * "block site data" settings make localStorage throw rather than return null.
 */
(function (global) {
  'use strict';

  var SESSION_KEY = 'qb.freqgen.session.v1';
  var PRESETS_KEY = 'qb.freqgen.presets.v1';
  var PREFS_KEY = 'qb.freqgen.prefs.v1';

  function available() {
    try {
      var probe = '__qb_probe__';
      global.localStorage.setItem(probe, '1');
      global.localStorage.removeItem(probe);
      return true;
    } catch (err) {
      return false;
    }
  }

  var ok = available();

  function readJSON(key, fallback) {
    if (!ok) return fallback;
    try {
      var raw = global.localStorage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed === null || parsed === undefined ? fallback : parsed;
    } catch (err) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    if (!ok) return false;
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }

  function remove(key) {
    if (!ok) return;
    try { global.localStorage.removeItem(key); } catch (err) { /* ignore */ }
  }

  global.FreqStore = {
    isAvailable: function () { return ok; },

    loadSession: function () { return readJSON(SESSION_KEY, null); },
    saveSession: function (state) { return writeJSON(SESSION_KEY, state); },
    clearSession: function () { remove(SESSION_KEY); },

    /** @returns {Object.<string, Object>} preset name -> snapshot */
    loadPresets: function () {
      var presets = readJSON(PRESETS_KEY, {});
      return (presets && typeof presets === 'object' && !Array.isArray(presets)) ? presets : {};
    },
    savePresets: function (presets) { return writeJSON(PRESETS_KEY, presets); },

    /* Small single-value preferences (language, install prompt state) share
       one key, so they survive a preset reset and stay out of the session. */
    getPref: function (name, fallback) {
      var prefs = readJSON(PREFS_KEY, {});
      return Object.prototype.hasOwnProperty.call(prefs, name) ? prefs[name] : fallback;
    },
    setPref: function (name, value) {
      var prefs = readJSON(PREFS_KEY, {});
      prefs[name] = value;
      return writeJSON(PREFS_KEY, prefs);
    },

    clearAll: function () { remove(SESSION_KEY); remove(PRESETS_KEY); }
  };
})(window);

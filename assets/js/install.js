/*!
 * Frequency Generator - "add to home screen" support
 * Copyright (c) Quantum Billing. MIT License.
 *
 * No page can install itself. What a browser offers is beforeinstallprompt:
 * it tells the page that this site qualifies (manifest + service worker +
 * https), the page asks the person, and one tap hands off to the browser's
 * own install dialog. That is as close to automatic as the platform allows,
 * and deliberately so.
 *
 * iOS has no such event at all, so there it becomes a short instruction.
 */
(function (global, document) {
  'use strict';

  var SNOOZE_DAYS = 14;
  var deferred = null;
  var els = {};

  function isStandalone() {
    if (global.navigator.standalone === true) return true;
    return !!(global.matchMedia && global.matchMedia('(display-mode: standalone)').matches);
  }

  function isIOS() {
    var ua = global.navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua)) return true;
    /* iPadOS 13+ reports itself as a Mac; the touch points give it away. */
    return /Macintosh/.test(ua) && global.navigator.maxTouchPoints > 1;
  }

  function snoozed() {
    var until = global.FreqStore.getPref('installSnoozedUntil', 0);
    return typeof until === 'number' && Date.now() < until;
  }

  function snooze() {
    global.FreqStore.setPref('installSnoozedUntil', Date.now() + SNOOZE_DAYS * 86400000);
  }

  function show(mode) {
    if (!els.bar) return;
    els.bar.hidden = false;
    els.bar.setAttribute('data-mode', mode);
    /* On iOS there is nothing to click, only something to read. */
    els.install.hidden = (mode === 'ios');
    els.body.setAttribute('data-i18n', mode === 'ios' ? 'install.ios' : 'install.body');
    global.I18N.apply(els.bar);
  }

  function hide() {
    if (els.bar) els.bar.hidden = true;
  }

  function init() {
    els = {
      bar: document.getElementById('installBar'),
      body: document.getElementById('installBody'),
      install: document.getElementById('btnInstall'),
      dismiss: document.getElementById('btnInstallDismiss')
    };
    if (!els.bar) return;

    if (isStandalone()) return;   // already on the home screen

    els.install.addEventListener('click', function () {
      if (!deferred) return;
      deferred.prompt();
      deferred.userChoice.then(function (choice) {
        if (choice && choice.outcome !== 'accepted') snooze();
        deferred = null;
        hide();
      });
    });

    els.dismiss.addEventListener('click', function () {
      snooze();
      hide();
    });

    global.addEventListener('beforeinstallprompt', function (event) {
      /* Hold on to it: without preventDefault Chrome shows its own mini
         infobar, and the event cannot be replayed later. */
      event.preventDefault();
      deferred = event;
      if (!snoozed()) show('prompt');
    });

    global.addEventListener('appinstalled', function () {
      deferred = null;
      hide();
      if (global.FreqGen && global.FreqGen.notice) global.FreqGen.notice(global.I18N.t('install.done'));
    });

    if (isIOS() && !snoozed()) show('ios');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window, document);

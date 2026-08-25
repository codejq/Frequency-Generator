/*!
 * Frequency Generator - service worker
 * Copyright (c) Quantum Billing. MIT License.
 *
 * Network-first with a cache fallback: the app keeps working offline, but a
 * fresh deploy on GitHub Pages is never masked by a stale cached copy.
 */
var CACHE = 'freqgen-v2';

var ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/styles.css',
  './assets/js/storage.js',
  './assets/js/i18n.js',
  './assets/js/audio-engine.js',
  './assets/js/app.js',
  './assets/js/install.js',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        return key === CACHE ? null : caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request).then(function (response) {
      var copy = response.clone();
      caches.open(CACHE).then(function (cache) { cache.put(request, copy); });
      return response;
    }).catch(function () {
      return caches.match(request).then(function (hit) {
        return hit || caches.match('./index.html');
      });
    })
  );
});

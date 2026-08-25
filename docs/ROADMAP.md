# Roadmap

## Phase 1 — Web (done)

Static, dependency-free web app deployed to GitHub Pages. Multiple simultaneous
oscillators, 0 Hz to the Nyquist limit, presets and session memory in
`localStorage`, installable as a PWA.

## Phase 2 — Android and iOS

The goal is one codebase, not three. The app is deliberately framework-free and
uses only Web Audio, `localStorage` and Canvas — all of which a WebView provides
— so the native shells wrap what already exists rather than reimplementing it.

### Recommended approach: Capacitor

```bash
npm init -y
npm i @capacitor/core @capacitor/cli
npx cap init "Frequency Generator" com.quantumbilling.freqgen --web-dir=.
npm i @capacitor/android @capacitor/ios
npx cap add android
npx cap add ios
npx cap sync
```

The repository root is already a valid `webDir`: no build output to point at.

### What needs attention in the native shells

| Area | Why it matters | Action |
|---|---|---|
| Background audio | A tone should keep sounding when the screen locks. | Android: foreground service + `FOREGROUND_SERVICE_MEDIA_PLAYBACK`. iOS: `UIBackgroundModes: audio` and an `AVAudioSession` in the `.playback` category. |
| Audio session category | iOS defaults route WebView audio to the silent switch. | Set `.playback` at launch so the ring/silent switch does not mute output. |
| Sample rate | The ultrasonic ceiling is the device's Nyquist limit. | Request the highest hardware rate available; surface the real ceiling in the UI (already done for web). |
| Persistence | `localStorage` in a WebView can be cleared by the OS under storage pressure. | Mirror the session into `@capacitor/preferences`; the storage layer is a single module (`assets/js/storage.js`) with one interface to swap. |
| Wake lock | Screen sleep should not interrupt a running test. | `@capacitor-community/keep-awake` while any generator is playing. |
| Store metadata | Play Store and App Store listings. | Reuse the icons in `assets/icons/`; generate the full density set with `@capacitor/assets`. |
| Safety copy | Store review asks about audio that can damage hearing. | The in-app safety panel already covers it; mirror it in the listing. |
| Localisation | The app is already English + Arabic with RTL. | Declare `ar` in the store listings and in `Info.plist` / `resources`; the WebView inherits the page's own `dir` handling, so nothing in the UI needs porting. |
| Store necessity | The PWA install already gives most people a home-screen app. | Worth confirming the native shells add something real — background audio and a higher hardware sample rate are the two that do. |

### Alternative

If the native shells later need genuinely native DSP (sample-accurate sweeps,
multi-channel output, measurement-grade timing), the Web Audio graph in
`assets/js/audio-engine.js` maps cleanly onto `AudioTrack`/`Oboe` on Android and
`AVAudioEngine` on iOS. The engine module is isolated from the UI precisely so
this stays possible.

## Ideas beyond phase 2

- Frequency sweeps (linear and logarithmic, with a duration).
- White, pink and brown noise sources alongside the oscillators.
- Amplitude modulation and binaural offsets between the left and right channels.
- WAV export of the current setup.
- Shareable setups encoded in the URL hash.

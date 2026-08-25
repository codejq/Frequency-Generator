# Frequency Generator

A browser-based signal generator: several independent oscillators at once, from
**0 Hz up to the ultrasonic limit of your audio hardware**, with everything you
set up remembered in your own browser.

Built and open-sourced by **Quantum Billing** under the MIT License.

**▶ Live app: https://quantum-billing.github.io/frequency-generator/**

> Replace that URL, and the `Source on GitHub` link in `index.html`, with your
> real organisation and repository name once the repo is pushed.

---

## Features

| | |
|---|---|
| **Multiple generators** | Add as many oscillator widgets as you need (up to 32). Play one, play a few, or play all of them together. |
| **Per-generator controls** | Frequency, waveform, volume and stereo balance, all independent. |
| **Wide range** | 0 Hz (DC) through infrasound, the full audible band, and ultrasonic content up to the Nyquist limit — 24 kHz at a 48 kHz sample rate, up to ~48 kHz where the browser grants a 96 kHz context. |
| **Four waveforms** | Sine, square, sawtooth, triangle. |
| **Solo / Play all / Stop all** | One tap to isolate a tone or to sound the whole set. Space bar toggles everything. |
| **Live visualiser** | Oscilloscope and log-scaled spectrum view of the actual output. |
| **Note readout** | Shows the nearest musical note and the cent offset, for tuning work. |
| **Presets** | Save named setups, reload them later, delete what you no longer need. |
| **Automatic session memory** | Your current setup is saved as you change it and restored on your next visit. Anything that was playing is offered as a one-tap resume. |
| **Import / export** | Move your session and presets between browsers and devices as a JSON file. |
| **Mobile first** | Responsive down to small phone screens, with touch-sized controls. |
| **Offline** | Installable as a PWA; a service worker keeps it working with no connection. |
| **Private** | No accounts, no analytics, no network calls. All state lives in `localStorage` on your device. |

## Uses

Speaker and headphone testing, hearing range checks, tuning instruments,
calibrating measurement equipment, generating beat frequencies from two close
tones, room-mode and resonance hunting, ultrasonic transducer testing.

## Run it

No build step, no dependencies. Any static file server works:

```bash
git clone https://github.com/quantum-billing/frequency-generator.git
cd frequency-generator

python -m http.server 8080     # or: npx serve .
# open http://localhost:8080
```

Opening `index.html` straight from the filesystem works too, except that the
service worker (offline mode) will not register on `file://`.

## Deploying your own copy

The repository ships with a GitHub Actions workflow that publishes the site on
every push to `main`.

1. Push this repository to GitHub.
2. Go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main` (or run the *Deploy to GitHub Pages* workflow manually).

The site is served from the repository root, so `https://<owner>.github.io/<repo>/`.
Every path in the app is relative, which is what makes a project-subdirectory
Pages URL work without configuration.

### Workflows

| Workflow | Trigger | Does |
|---|---|---|
| `.github/workflows/ci.yml` | pull requests, non-`main` pushes | Runs the static checks. |
| `.github/workflows/deploy-pages.yml` | push to `main`, manual | Runs the checks, then deploys to Pages. |

## Checks

```bash
node scripts/verify.mjs
```

Verifies that every script parses, the manifest is valid JSON, every path
referenced by `index.html` and precached by the service worker exists, and the
licence is present. A broken relative path is the failure that looks fine
locally and 404s on Pages, so it is worth catching in CI.

## Project layout

```
index.html                    markup and the generator card template
manifest.webmanifest          PWA metadata
sw.js                         service worker (network-first, cache fallback)
assets/css/styles.css         all styling
assets/js/storage.js          localStorage wrapper, guarded for private mode
assets/js/audio-engine.js     Web Audio: context, master bus, per-voice chains
assets/js/app.js              state, UI, presets, visualiser
scripts/verify.mjs            static checks used by CI
docs/ROADMAP.md               phase 2: Android and iOS
```

Plain ES5-compatible JavaScript, no framework, no bundler. The whole app is a
handful of files you can read in one sitting — deliberately, since it has to be
straightforward to wrap in a mobile shell later.

## How it works

Each generator owns one `OscillatorNode → GainNode → StereoPannerNode` chain
feeding a shared master gain and analyser. Voices start and stop independently,
which is what makes arbitrary subsets play together.

Two details worth knowing:

- **Gain ramps, not switches.** Starting or stopping at full amplitude is a
  step change, and a step change is an audible click carrying broadband energy.
  Every start, stop and volume change ramps over ~20 ms; frequency changes glide
  over ~30 ms.
- **The frequency slider is logarithmic.** It maps to `10^(x·k) − 1`, so 0 Hz
  sits exactly at the bottom of the travel while the audible decades still get
  usable resolution. A linear 0–48000 slider would put everything below 1 kHz in
  the first 2% of its travel.

The top frequency is the Nyquist limit — half the sample rate. The app asks for
a 96 kHz context first and falls back to whatever the device gives it; the
actual rate and ceiling are shown under the visualiser.

## Safety

Sustained tones can damage hearing and equipment. Start quiet. Ultrasonic
content is inaudible but still real energy through your tweeters, and it is easy
to leave something running loud that you cannot hear.

## Roadmap

Phase 1 (this repository) is the web app. Phase 2 wraps the same codebase as
native Android and iOS apps — see [docs/ROADMAP.md](docs/ROADMAP.md).

## Contributing

Issues and pull requests are welcome. Keep it dependency-free, keep it working
on a phone, and make sure `node scripts/verify.mjs` passes.

## Licence

MIT — see [LICENSE](LICENSE). Copyright © 2026 Quantum Billing.

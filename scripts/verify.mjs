#!/usr/bin/env node
/**
 * Static checks for the frequency generator.
 *
 * There is no build step and no runtime dependency, so CI's job is simply to
 * prove that every script parses, every JSON file is valid, and every path the
 * page references actually exists in the repo. A broken relative path is the
 * one failure mode that looks fine locally and 404s on GitHub Pages.
 */
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const checks = [];

function ok(label) { checks.push(`  ok   ${label}`); }
function fail(label) { problems.push(label); checks.push(`  FAIL ${label}`); }

/* 1. every JavaScript file parses */
const scripts = [
  'assets/js/storage.js',
  'assets/js/i18n.js',
  'assets/js/audio-engine.js',
  'assets/js/app.js',
  'assets/js/install.js',
  'sw.js'
];
for (const file of scripts) {
  const path = join(root, file);
  if (!existsSync(path)) { fail(`${file} is missing`); continue; }
  try {
    execFileSync(process.execPath, ['--check', path], { stdio: 'pipe' });
    ok(`${file} parses`);
  } catch (err) {
    fail(`${file} has a syntax error:\n${err.stderr?.toString() ?? err.message}`);
  }
}

/* 2. JSON files are valid */
for (const file of ['manifest.webmanifest']) {
  const path = join(root, file);
  if (!existsSync(path)) { fail(`${file} is missing`); continue; }
  try {
    JSON.parse(readFileSync(path, 'utf8'));
    ok(`${file} is valid JSON`);
  } catch (err) {
    fail(`${file} is not valid JSON: ${err.message}`);
  }
}

/* 3. every local path referenced by index.html exists */
const html = readFileSync(join(root, 'index.html'), 'utf8');
const refs = [...html.matchAll(/(?:href|src)="(\.\/[^"]+)"/g)].map((m) => m[1]);
for (const ref of new Set(refs)) {
  /* hreflang alternates are query strings on this same page, not files. */
  if (ref.includes('?')) { ok(`index.html -> ${ref} (same page)`); continue; }
  const path = join(root, ref.replace(/^\.\//, ''));
  if (existsSync(path)) { ok(`index.html -> ${ref}`); } else { fail(`index.html references a missing file: ${ref}`); }
}

/* 4. every file the service worker precaches exists */
const sw = readFileSync(join(root, 'sw.js'), 'utf8');
const assetBlock = sw.match(/var ASSETS = \[([\s\S]*?)\];/);
if (!assetBlock) {
  fail('sw.js: could not find the ASSETS precache list');
} else {
  const paths = [...assetBlock[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((p) => p !== './');
  for (const p of paths) {
    const path = join(root, p.replace(/^\.\//, ''));
    if (existsSync(path)) { ok(`sw.js precache -> ${p}`); } else { fail(`sw.js precaches a missing file: ${p}`); }
  }
}

/* 5. every element the app looks up actually exists in the markup.
      A renamed id or class is a runtime TypeError that no parser catches. */
const app = readFileSync(join(root, 'assets/js/app.js'), 'utf8');

const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
const usedIds = new Set([...app.matchAll(/\$\('([^']+)'\)/g)].map((m) => m[1]));
for (const id of usedIds) {
  if (htmlIds.has(id)) { ok(`#${id} exists`); } else { fail(`app.js looks up #${id}, which is not in index.html`); }
}

const htmlClasses = new Set([...html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)));
const usedClasses = new Set([...app.matchAll(/querySelector(?:All)?\('\.([a-z0-9-]+)'\)/gi)].map((m) => m[1]));
for (const cls of usedClasses) {
  if (htmlClasses.has(cls)) { ok(`.${cls} exists`); } else { fail(`app.js queries .${cls}, which is not in index.html`); }
}

const usedAttrs = new Set([...app.matchAll(/querySelector(?:All)?\('\[([a-z-]+)\]'\)/gi)].map((m) => m[1]));
for (const attr of usedAttrs) {
  if (html.includes(`${attr}=`)) { ok(`[${attr}] exists`); } else { fail(`app.js queries [${attr}], which is not in index.html`); }
}

/* 6. the two dictionaries agree, and every key the page asks for exists.
      A missing Arabic key falls back to English silently at runtime, which is
      exactly the kind of gap nobody notices until a user reports it. */
const i18n = readFileSync(join(root, 'assets/js/i18n.js'), 'utf8');

function keysOf(lang) {
  const block = i18n.match(new RegExp(`DICT\\.${lang} = \\{([\\s\\S]*?)\\n  \\};`));
  if (!block) return null;
  return new Set([...block[1].matchAll(/^\s*'([^']+)':/gm)].map((m) => m[1]));
}

const en = keysOf('en');
const ar = keysOf('ar');

if (!en || !ar) {
  fail('i18n.js: could not read one of the dictionaries');
} else {
  const missingAr = [...en].filter((k) => !ar.has(k));
  const extraAr = [...ar].filter((k) => !en.has(k));
  if (missingAr.length) { fail(`Arabic is missing ${missingAr.length} key(s): ${missingAr.join(', ')}`); }
  else { ok(`Arabic covers all ${en.size} English keys`); }
  if (extraAr.length) { fail(`Arabic has key(s) English does not: ${extraAr.join(', ')}`); }

  /* Keys referenced from the markup and from app.js must actually exist. */
  const htmlKeys = new Set([
    ...[...html.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/data-i18n-attr="([^"]+)"/g)].flatMap((m) =>
      m[1].split(';').map((pair) => pair.split(':')[1]).filter(Boolean).map((k) => k.trim())),
    ...[...html.matchAll(/data-name="([^"]+)"/g)].map((m) => m[1])
  ]);
  const jsKeys = new Set([...app.matchAll(/\bt\('([^']+)'/g)].map((m) => m[1]));

  let unknown = 0;
  for (const key of new Set([...htmlKeys, ...jsKeys])) {
    if (key.endsWith('.')) {
      /* t('band.' + key) - the literal is a prefix, so require the family. */
      const family = [...en].filter((k) => k.startsWith(key));
      if (!family.length) { fail(`no translation keys under the prefix "${key}"`); unknown++; }
      continue;
    }
    if (!en.has(key)) { fail(`translation key used but not defined: ${key}`); unknown++; }
  }
  if (!unknown) ok(`all ${htmlKeys.size + jsKeys.size} referenced translation keys are defined`);

  /* The enumerations behind those prefixes, spelled out so a missing one
     cannot hide behind a satisfied prefix. */
  const required = [
    'band.dc', 'band.infrasound', 'band.audible', 'band.ultrasonic',
    'wave.desc.sine', 'wave.desc.square', 'wave.desc.sawtooth', 'wave.desc.triangle',
    'wave.sine', 'wave.square', 'wave.sawtooth', 'wave.triangle'
  ];
  const absent = required.filter((k) => !en.has(k) || !ar.has(k));
  if (absent.length) { fail(`missing enumerated key(s): ${absent.join(', ')}`); }
  else { ok(`all ${required.length} band and waveform keys present in both languages`); }
}

/* 7. images the README embeds exist - a broken image renders as alt text on
      the repository page and is easy not to notice. */
const readme = readFileSync(join(root, 'README.md'), 'utf8');
const images = [...readme.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[1]);
for (const img of images) {
  if (/^https?:/.test(img)) continue;
  if (existsSync(join(root, img))) { ok(`README image -> ${img}`); } else { fail(`README embeds a missing image: ${img}`); }
}

/* 8. the licence is present and says MIT */
const license = existsSync(join(root, 'LICENSE')) ? readFileSync(join(root, 'LICENSE'), 'utf8') : '';
if (license.includes('MIT License')) { ok('LICENSE is MIT'); } else { fail('LICENSE is missing or is not the MIT licence'); }

console.log(checks.join('\n'));

if (problems.length) {
  console.error(`\n${problems.length} problem(s) found.`);
  process.exit(1);
}
console.log(`\nAll ${checks.length} checks passed.`);

#!/usr/bin/env node
/**
 * scripts/smoke-bundle.mjs
 *
 * Fast pre-ship smoke test for the Android JS bundle.
 *
 * WHY THIS EXISTS
 * ---------------
 * On 2026-09-03 the app shipped a preview APK that could not launch at all --
 * every cold start landed on Expo Router's "Unmatched Route" screen. Nothing
 * caught it: tsc passed, the bundle built, EAS reported success, and the APK
 * installed cleanly. The failure only appeared when a human tapped the icon.
 *
 * The cause was `experiments.baseUrl: "/app"` in app.json. It was added for the
 * web export's nginx subpath on the assumption it was web-only. It is not:
 * babel-preset-expo inlines it as process.env.EXPO_BASE_URL with no platform
 * check, and expo-router's stripBaseUrl() reads that on every route lookup on
 * every platform. The literal "/app" was compiled straight into the Android
 * bundle.
 *
 * This script asserts the two things that would have caught it in seconds:
 *   1. the resolved Expo config does NOT carry experiments.baseUrl for native
 *   2. the compiled Android bundle contains no baked base-path literal
 *
 * It also asserts the reverse (web export DOES still get baseUrl), so that a
 * future "cleanup" that deletes app.config.js fails loudly here instead of
 * silently breaking the web deploy months later.
 *
 * Run locally:   npm run smoke
 * Run in CI:     see .github/workflows/ci.yml
 */

import { execFileSync } from 'node:child_process';
import { existsSync, statSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(ROOT, '.smoke');
const BUNDLE = path.join(OUT_DIR, 'index.android.bundle');

/** Minimum plausible size for a real RN bundle. A near-empty file means the
 *  build silently produced nothing rather than failing. */
const MIN_BUNDLE_BYTES = 1_000_000;

/** Route paths that must survive into the bundle. `/appointments/create` is the
 *  screen the "Book" quick action opens -- the one users reported as broken. */
const REQUIRED_ROUTE_MARKERS = ['appointments/create', 'telemedicine', 'queue'];

/** Android notification channel ids the backend sends on.
 *
 *  Android 8+ DISCARDS a notification addressed to a channel the app has not
 *  created, and does so silently: no error reaches the app, the backend logs
 *  "accepted by Expo", and the Expo receipt still reads "delivered to FCM".
 *  Before 2026-09-06 the app created only "queue-alerts", so notifications on
 *  the other three vanished with every upstream signal green.
 *
 *  These must match the `channelId:` arguments passed to
 *  ExpoPushService::sendToUser in the backend. If the server gains a channel
 *  and this list does not, those notifications disappear silently again. */
const REQUIRED_NOTIFICATION_CHANNELS = [
  'queue-alerts',
  'default',
  'telemedicine-calls',
  'follow-up-reminders',
];

const failures = [];
const notes = [];

function fail(msg) {
  failures.push(msg);
  console.error(`  FAIL  ${msg}`);
}

function pass(msg) {
  console.log(`  ok    ${msg}`);
}

function note(msg) {
  notes.push(msg);
  console.log(`  note  ${msg}`);
}

/** Resolve the Expo config exactly as the build toolchain would. */
function resolveExpoConfig(env) {
  const raw = execFileSync(
    'npx',
    ['expo', 'config', '--json', '--type', 'public'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      shell: true,
      maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  // `expo config` prints dotenv notices before the JSON; take from the first {.
  const start = raw.indexOf('{');
  if (start === -1) {
    throw new Error(`expo config produced no JSON. Output:\n${raw.slice(0, 500)}`);
  }
  return JSON.parse(raw.slice(start));
}

// ---------------------------------------------------------------------------
// 1. Config gating -- the root cause check
// ---------------------------------------------------------------------------

console.log('\nConfig gating');

let nativeConfig;
try {
  // Deliberately blank EXPO_BASE_URL: this is how EAS invokes native builds.
  nativeConfig = resolveExpoConfig({ EXPO_BASE_URL: '' });

  const nativeBaseUrl = nativeConfig?.experiments?.baseUrl;

  if (nativeBaseUrl) {
    fail(
      `experiments.baseUrl is "${nativeBaseUrl}" for a NATIVE build. ` +
        'It must be unset. babel-preset-expo inlines this into the Android ' +
        'bundle with no platform check, which breaks Expo Router cold start.\n' +
        '     Likely causes, in order: app.config.js was deleted or its gating\n' +
        '     was changed; or EXPO_BASE_URL is set in the native build env\n' +
        '     (check eas.json). Note that experiments.baseUrl sitting in\n' +
        '     app.json alone is NOT enough to trigger this -- app.config.js\n' +
        '     strips it -- so suspect the config file itself first.'
    );
  } else {
    pass('native build resolves with no experiments.baseUrl');
  }
} catch (error) {
  fail(`could not resolve the native Expo config: ${error.message}`);
}

try {
  // The other direction: the web export must still be able to opt in, or the
  // nginx subpath deploy silently breaks.
  const webConfig = resolveExpoConfig({ EXPO_BASE_URL: '/app' });
  const webBaseUrl = webConfig?.experiments?.baseUrl;

  if (webBaseUrl === '/app') {
    pass('web export still opts in via EXPO_BASE_URL=/app');
  } else {
    fail(
      `EXPO_BASE_URL=/app resolved to experiments.baseUrl=${JSON.stringify(webBaseUrl)}, ` +
        'expected "/app". app.config.js is meant to forward this. If it was ' +
        'deleted, the web deploy under /app will 404 on every route.'
    );
  }
} catch (error) {
  fail(`could not resolve the web Expo config: ${error.message}`);
}

// ---------------------------------------------------------------------------
// 2. Bundle assertions
// ---------------------------------------------------------------------------

console.log('\nAndroid bundle');

const passedBundle = process.argv.find((a) => a.startsWith('--bundle='));
let bundlePath = passedBundle ? passedBundle.split('=')[1] : null;

if (!bundlePath) {
  console.log('  ...  building android bundle (no --bundle= given)');
  try {
    rmSync(OUT_DIR, { recursive: true, force: true });
    mkdirSync(OUT_DIR, { recursive: true });

    execFileSync(
      'npx',
      [
        'expo',
        'export:embed',
        '--platform',
        'android',
        '--dev',
        'false',
        '--entry-file',
        'node_modules/expo-router/entry.js',
        '--bundle-output',
        BUNDLE,
        '--assets-dest',
        path.join(OUT_DIR, 'assets'),
      ],
      {
        cwd: ROOT,
        shell: true,
        stdio: 'inherit',
        // Match how EAS builds native: no base URL in the environment.
        env: { ...process.env, EXPO_BASE_URL: '' },
      }
    );
    bundlePath = BUNDLE;
  } catch (error) {
    fail(`android bundle failed to build: ${error.message}`);
  }
}

if (bundlePath && existsSync(bundlePath)) {
  const bytes = statSync(bundlePath).size;

  if (bytes < MIN_BUNDLE_BYTES) {
    fail(
      `bundle is only ${bytes} bytes (expected > ${MIN_BUNDLE_BYTES}). ` +
        'A tiny bundle usually means the build produced nothing rather than erroring.'
    );
  } else {
    pass(`bundle built, ${(bytes / 1_048_576).toFixed(1)} MB`);
  }

  const source = readFileSync(bundlePath, 'utf8');

  // The exact regression: a base path compiled into the routing code.
  // stripBaseUrl's parameter default is where "/app" landed last time.
  const bakedBaseUrl = source.match(/arguments\[1\][^;]{0,60}:\s*"(\/[^"]+)"/);
  if (bakedBaseUrl) {
    fail(
      `a base path "${bakedBaseUrl[1]}" is compiled into the bundle's route ` +
        'handling. This is the 2026-09-03 cold-start failure. Check that ' +
        'experiments.baseUrl is not set for native builds.'
    );
  } else {
    pass('no base path baked into route handling');
  }

  // Asset paths should not be rebased either.
  if (source.includes('"httpServerLocation": "/app/')) {
    fail('asset httpServerLocation entries are prefixed "/app/" -- baseUrl leaked into assets.');
  } else {
    pass('asset paths not rebased');
  }

  const missingChannels = REQUIRED_NOTIFICATION_CHANNELS.filter(
    (c) => !source.includes(`"${c}"`) && !source.includes(`'${c}'`)
  );
  if (missingChannels.length > 0) {
    fail(
      `notification channel ids missing from the bundle: ${missingChannels.join(', ')}. ` +
        'Android silently discards notifications sent to a channel the app never ' +
        'created, so this failure is invisible at runtime -- the backend, Expo and ' +
        'the FCM receipt all still report success.'
    );
  } else {
    pass(`all ${REQUIRED_NOTIFICATION_CHANNELS.length} notification channels present`);
  }

  const missingRoutes = REQUIRED_ROUTE_MARKERS.filter((r) => !source.includes(r));
  if (missingRoutes.length > 0) {
    fail(
      `expected route markers missing from the bundle: ${missingRoutes.join(', ')}. ` +
        'A route that vanishes from the bundle is a screen users cannot reach.'
    );
  } else {
    pass(`route markers present (${REQUIRED_ROUTE_MARKERS.join(', ')})`);
  }
} else if (bundlePath) {
  fail(`bundle not found at ${bundlePath}`);
}

// ---------------------------------------------------------------------------

console.log('');

if (failures.length > 0) {
  console.error(`SMOKE TEST FAILED -- ${failures.length} problem(s):\n`);
  failures.forEach((f, i) => console.error(`  ${i + 1}. ${f}\n`));
  console.error(
    'These checks exist because each of them shipped to a real device once ' +
      'while every other signal reported success.\n'
  );
  process.exit(1);
}

console.log(`Smoke test passed.${notes.length ? ` ${notes.length} note(s).` : ''}\n`);
process.exit(0);

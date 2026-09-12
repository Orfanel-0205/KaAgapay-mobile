#!/usr/bin/env node
//
// scripts/check-push-credentials.mjs
//
// Fails the build when the Firebase config needed for push notifications is
// missing, so that a build without it is impossible rather than merely broken.
//
// WHY THIS EXISTS
// ---------------
// Verified on 2026-09-06: a build with no google-services.json SUCCEEDS and
// produces an installable APK whose push notifications can never work.
//
// The two cases differ, and the dangerous one is the common one:
//
//   android/ already generated, file missing
//     -> android/app/build.gradle applies "com.google.gms.google-services"
//        unconditionally, and that plugin fails the Gradle build. Loud. Fine.
//
//   fresh clone or `expo prebuild --clean`, file missing        <-- THE PROBLEM
//     -> app.json does not declare android.googleServicesFile, so prebuild
//        generates an android/ with no google-services.json AND without the
//        plugin. Gradle has nothing to complain about. The build succeeds,
//        the APK installs, the app opens, a push token is even requested --
//        and no notification can ever be delivered to it.
//
// That second case is not hypothetical: it is what CI does on every run. The
// APK boot test builds exactly that way and has passed repeatedly, which is
// the proof that nothing in the toolchain objects.
//
// This is the same failure shape as everything else found this week: every
// signal reports success while the feature is dead. The fix is to make the
// silent case loud.
//
// WHERE IT RUNS
//   - `eas-build-pre-install` in package.json, so every EAS build checks first
//   - `npm run check:push-credentials` for a local check before building
//
// It deliberately does NOT run in GitHub Actions. CI builds are never shipped
// and never receive notifications; failing them for a credential CI is not
// allowed to have would be noise. See docs/OPERATIONS.md in the backend repo.

import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import googleServicesPath from './google-services-path.cjs';

const ROOT = process.cwd();

// Where to look is decided by scripts/google-services-path.cjs, the same module
// app.config.js uses, so this check and the build config cannot disagree. In
// priority order: the path EAS gives the GOOGLE_SERVICES_JSON file variable on
// its workers, then the project root (local builds), then android/app (an
// already-generated native project). Until 2026-09-12 this script looked only
// at the last two, so an EAS build from a fresh clone -- variable set
// correctly, no local copy -- would have been stopped here.
const CANDIDATES = googleServicesPath.googleServicesCandidates(ROOT);

const problems = [];

function fail(msg) {
  problems.push(msg);
}

// --- locate ------------------------------------------------------------------

const envCandidate = CANDIDATES.find((c) => c.fromEnv);

if (envCandidate && !existsSync(envCandidate.file)) {
  // Set but pointing at nothing: an EAS misconfiguration. Fail even if a local
  // copy exists, rather than quietly building with a different file.
  fail(
    `GOOGLE_SERVICES_JSON is set, but no file exists at:\n      ${envCandidate.file}\n\n` +
      '    Check the EAS environment variable with: eas env:list <environment>'
  );
}

const found = CANDIDATES.filter((c) => existsSync(c.file)).map((c) => ({
  rel: c.label,
  abs: c.file,
}));

if (found.length === 0 && !envCandidate) {
  fail(
    'google-services.json was not found in any location:\n' +
      CANDIDATES.map((c) => `      - ${c.label}`).join('\n') +
      '\n\n' +
      '    This file is a credential and is deliberately gitignored, so a fresh\n' +
      '    clone will not have it. On EAS it comes from the GOOGLE_SERVICES_JSON\n' +
      '    file variable. Locally, obtain it from the Firebase console for project\n' +
      '    kaagapay-1406b (Project settings -> Your apps -> Android) and place it at\n' +
      '    the repository root. Never commit it.'
  );
} else {
  // --- validate every copy we found ------------------------------------------

  // The android package the app actually ships as. Read from app.json rather
  // than hardcoded, so a package rename is caught instead of silently passing.
  let expectedPackage = null;

  try {
    const appJson = JSON.parse(readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    expectedPackage = (appJson.expo ?? appJson)?.android?.package ?? null;
  } catch {
    fail('could not read android.package from app.json to cross-check against.');
  }

  for (const { rel, abs } of found) {

    if (statSync(abs).size === 0) {
      fail(`${rel} exists but is EMPTY (0 bytes).`);
      continue;
    }

    let parsed;

    try {
      parsed = JSON.parse(readFileSync(abs, 'utf8'));
    } catch (error) {
      fail(`${rel} is not valid JSON: ${error.message}`);
      continue;
    }

    const projectId = parsed?.project_info?.project_id;

    if (!projectId) {
      fail(`${rel} has no project_info.project_id -- it is not a Firebase config file.`);
      continue;
    }

    const clients = Array.isArray(parsed.client) ? parsed.client : [];

    if (clients.length === 0) {
      fail(`${rel} contains no "client" entries, so no Android app is configured in it.`);
      continue;
    }

    const packages = clients
      .map((c) => c?.client_info?.android_client_info?.package_name)
      .filter(Boolean);

    if (expectedPackage && !packages.includes(expectedPackage)) {
      // This is the quiet killer: a valid file for the WRONG app. FCM registers
      // against the package in the file, so a mismatch means tokens are issued
      // for an app that is not this one.
      fail(
        `${rel} does not cover this app's package.\n` +
          `      app.json android.package : ${expectedPackage}\n` +
          `      packages in the file     : ${packages.join(', ') || '(none)'}`
      );
      continue;
    }

    console.log(
      `  ok    ${rel} (project ${projectId}${
        expectedPackage ? `, package ${expectedPackage}` : ''
      })`
    );
  }
}

// --- report ------------------------------------------------------------------

console.log('');

if (problems.length > 0) {
  console.error('PUSH CREDENTIAL CHECK FAILED\n');

  problems.forEach((p, i) => console.error(`  ${i + 1}. ${p}\n`));

  console.error(
    '  Building without this file produces an APK that installs, opens, and\n' +
      '  silently cannot receive any push notification. Refusing to continue.\n'
  );

  process.exit(1);
}

console.log('Push credentials present and consistent with app.json.');

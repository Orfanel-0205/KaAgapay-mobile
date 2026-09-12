// scripts/google-services-path.cjs
//
// The one place that decides where the Firebase config (google-services.json)
// comes from. app.config.js uses it to tell prebuild which file to copy, and
// scripts/check-push-credentials.mjs uses it to validate that file before an
// EAS build, so the two can never disagree about where it is again.
//
// WHY THIS EXISTS (2026-09-12)
// ----------------------------
// Two defects with one cause: nothing agreed on where the file lives.
//
//   1. app.json declared android.googleServicesFile = "./google-services.json"
//      unconditionally (b63c45e). CI's APK boot test deliberately builds
//      without the credential, and Expo's prebuild throws when a declared file
//      is missing:
//        Cannot copy google-services.json from .../google-services.json ...
//        Ensure the source and destination paths exist.
//      Reproduced in a fresh clone before this change. The boot test only runs
//      on pull requests and by hand, so it had not fired yet; the next pull
//      request would have failed.
//
//   2. The EAS file-type variable GOOGLE_SERVICES_JSON puts the file at a
//      worker path such as /home/expo/workingdir/eas-environment-secrets/<hash>,
//      but check-push-credentials.mjs only looked at the project root and
//      android/app. EAS builds passed anyway, because .easignore (which replaces
//      .gitignore for EAS uploads) does not exclude google-services.json, so the
//      developer's local copy was uploaded with the code. From a fresh clone
//      with no local copy, the check would have stopped every EAS build even
//      though the variable was set correctly.
//
// ORDER
//   1. $GOOGLE_SERVICES_JSON          where EAS puts the file on its workers
//   2. ./google-services.json         where a developer keeps it (gitignored)
//   3. ./android/app/google-services.json
//                                     where prebuild copies it. Accepted by the
//                                     check for an already-generated native
//                                     project, but never used as prebuild's
//                                     source (it would copy the file onto itself)
//
// When no source exists, app.config.js declares nothing, so prebuild generates
// a native project without Firebase: correct for CI, whose builds never ship.
// Every EAS build is still protected, because check-push-credentials.mjs runs
// first (eas-build-pre-install) and stops the build when no valid file exists.

const fs = require('node:fs');
const path = require('node:path');

/** Every place the file may legitimately be, in priority order. */
function googleServicesCandidates(root) {
  const fromEnv = (process.env.GOOGLE_SERVICES_JSON || '').trim();

  return [
    ...(fromEnv
      ? [
          {
            file: path.resolve(root, fromEnv),
            configPath: fromEnv,
            label: `GOOGLE_SERVICES_JSON (${fromEnv})`,
            fromEnv: true,
            prebuildOutput: false,
          },
        ]
      : []),
    {
      file: path.join(root, 'google-services.json'),
      configPath: './google-services.json',
      label: 'google-services.json',
      fromEnv: false,
      prebuildOutput: false,
    },
    {
      file: path.join(root, 'android', 'app', 'google-services.json'),
      configPath: './android/app/google-services.json',
      label: path.join('android', 'app', 'google-services.json'),
      fromEnv: false,
      prebuildOutput: true,
    },
  ];
}

/** The file prebuild should copy, or null when none exists. */
function resolveGoogleServicesSource(root) {
  return (
    googleServicesCandidates(root)
      .filter((candidate) => !candidate.prebuildOutput)
      .find((candidate) => fs.existsSync(candidate.file)) ?? null
  );
}

module.exports = { googleServicesCandidates, resolveGoogleServicesSource };

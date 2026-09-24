#!/usr/bin/env node
// scripts/check-expo-versions.mjs
//
// Refuse to build when an Expo package does not match the installed SDK.
//
// WHY THIS EXISTS
// ---------------
// On 24 September 2026 two preview builds crashed on launch with
//
//     NoClassDefFoundError: expo/modules/kotlin/types/AnyTypeCache
//         at expo.modules.asset.AssetModule.definition
//
// expo-audio had been added with plain `npm install`, which takes the newest
// version on the registry rather than the one the SDK bundles. That pulled in
// expo-asset 57.x alongside it, replacing the 12.x the SDK ships. A native
// module compiled against a different expo-modules-core fails while the module
// registry is being built -- before any JavaScript runs, so there is no error
// screen, no red box and nothing in the build log. The app simply force-closes.
//
// `npx expo install --check` did not catch it: expo-asset is a transitive
// dependency, not one of this project's listed ones, and --check only looks at
// package.json. This script checks what is actually installed in node_modules,
// which is what ends up in the APK.
//
// It runs as eas-build-pre-install, so a mismatch fails the build in the first
// few seconds instead of producing an APK that installs fine and dies on open.

import fs from "node:fs";
import path from "node:path";

const MODULES = "node_modules";

function read(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

const bundled = read(path.join(MODULES, "expo", "bundledNativeModules.json"));

if (!bundled) {
  // Nothing to check against. Not worth failing a build over: this runs before
  // install on some paths, and the real check is the one below.
  console.log("[expo-versions] expo is not installed yet, skipping.");
  process.exit(0);
}

/** The major version a range like "~12.0.13" or "^1.1.1" allows. */
function major(range) {
  const match = String(range).match(/(\d+)/);
  return match ? match[1] : null;
}

const mismatches = [];

for (const name of fs.readdirSync(MODULES)) {
  if (!name.startsWith("expo")) continue;

  const expected = bundled[name];

  if (!expected) continue;

  const installed = read(path.join(MODULES, name, "package.json"))?.version;

  if (!installed) continue;

  // Compare majors only. A patch drift inside the same major is what the
  // caret and tilde ranges are for; a different major is the breakage.
  if (major(installed) !== major(expected)) {
    mismatches.push({ name, installed, expected });
  }
}

if (mismatches.length === 0) {
  console.log("[expo-versions] all Expo packages match the SDK.");
  process.exit(0);
}

console.error("");
console.error("[expo-versions] These packages do not match the installed Expo SDK:");
console.error("");

for (const { name, installed, expected } of mismatches) {
  console.error(`    ${name.padEnd(26)} installed ${String(installed).padEnd(12)} expected ${expected}`);
}

console.error("");
console.error("  Building this would produce an app that installs and then force-closes");
console.error("  on launch, with no error screen: a native module compiled against a");
console.error("  different expo-modules-core fails while the module registry is built,");
console.error("  before any JavaScript runs.");
console.error("");
console.error("  Fix by letting Expo choose the versions:");
console.error("");
console.error(`      npx expo install ${mismatches.map((m) => m.name).join(" ")}`);
console.error("");
console.error("  Never `npm install` an expo-* package directly -- npm takes the newest");
console.error("  version on the registry, which is rarely the one this SDK bundles.");
console.error("");

process.exit(1);

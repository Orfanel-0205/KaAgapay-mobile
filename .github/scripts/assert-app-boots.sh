#!/usr/bin/env bash
#
# .github/scripts/assert-app-boots.sh
#
# Installs the release APK on the running emulator, launches it, and asserts it
# reaches a real screen. Called by .github/workflows/apk-boot-test.yml inside
# reactivecircus/android-emulator-runner (the emulator is already booted).
#
# This exists because on 2026-09-03 an APK shipped that installed fine and
# launched straight into Expo Router's "Unmatched Route" screen. Every
# automated signal was green. Only a human tapping the icon found it.
#
# Kept as a standalone script rather than inline YAML so it can be read,
# reviewed, and run by hand against a local emulator:
#     bash .github/scripts/assert-app-boots.sh

set -uo pipefail

PACKAGE="com.pogi133.kaagapay"
APK="android/app/build/outputs/apk/release/app-release.apk"
ARTIFACTS="boot-artifacts"

# How long to let the app settle before inspecting it. Expo Router resolves its
# initial route after the JS bundle loads, so checking too early would see a
# splash screen and pass regardless of whether routing works.
SETTLE_SECONDS=25

mkdir -p "$ARTIFACTS"

fail() {
  echo ""
  echo "APK BOOT TEST FAILED: $1"
  echo ""
  echo "Diagnostics saved to $ARTIFACTS/ and uploaded as a workflow artifact."
  exit 1
}

echo "--- APK"
[ -f "$APK" ] || fail "no APK at $APK -- the gradle build did not produce one."
ls -la "$APK"

echo ""
echo "--- Installing"
adb install -r "$APK" || fail "adb install failed."

# Clear any prior logcat so what we capture belongs to this launch only.
adb logcat -c || true

echo ""
echo "--- Launching"
# Launch via the default launcher intent rather than a hardcoded activity name,
# so this keeps working if the activity is ever renamed.
adb shell monkey -p "$PACKAGE" -c android.intent.category.LAUNCHER 1 \
  || fail "could not launch $PACKAGE."

echo "Waiting ${SETTLE_SECONDS}s for the JS bundle to load and routing to resolve..."
sleep "$SETTLE_SECONDS"

# --- Collect evidence before asserting, so failures are diagnosable ----------

adb logcat -d > "$ARTIFACTS/logcat.txt" 2>&1 || true
adb shell dumpsys activity activities > "$ARTIFACTS/activities.txt" 2>&1 || true
adb exec-out screencap -p > "$ARTIFACTS/screen.png" 2>/dev/null || true

# uiautomator dumps the on-screen view hierarchy as XML, including visible text.
# This is what lets us assert on what the user would actually see.
UI_XML="$ARTIFACTS/ui.xml"
adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1 || true
adb pull /sdcard/ui.xml "$UI_XML" >/dev/null 2>&1 || true

# --- Assertion 1: the app did not crash -------------------------------------

echo ""
echo "--- Assertion 1: app is running in the foreground"

if ! adb shell pidof "$PACKAGE" >/dev/null 2>&1; then
  echo "--- last 80 logcat lines ---"
  tail -n 80 "$ARTIFACTS/logcat.txt" || true
  fail "the app process is not running -- it crashed or exited on launch."
fi

if ! grep -q "$PACKAGE" "$ARTIFACTS/activities.txt" 2>/dev/null; then
  fail "$PACKAGE is not among the running activities."
fi

echo "ok: $PACKAGE is running"

# A fatal JS exception can leave the process alive while showing a red error
# screen, so check the log explicitly too.
if grep -qE "FATAL EXCEPTION|AndroidRuntime: FATAL" "$ARTIFACTS/logcat.txt" 2>/dev/null; then
  echo "--- fatal exception context ---"
  grep -B5 -A25 -E "FATAL EXCEPTION|AndroidRuntime: FATAL" "$ARTIFACTS/logcat.txt" | head -60
  fail "a fatal exception was logged during launch."
fi

echo "ok: no fatal exception in logcat"

# --- Assertion 2: not the Unmatched Route screen ----------------------------

echo ""
echo "--- Assertion 2: did not land on Expo Router's Unmatched Route screen"

[ -s "$UI_XML" ] || fail "could not capture the UI hierarchy -- cannot tell what is on screen."

if grep -qi "unmatched" "$UI_XML"; then
  echo "--- visible text on screen ---"
  grep -oE 'text="[^"]*"' "$UI_XML" | sed 's/^/  /' | head -30
  fail "the app launched onto an 'Unmatched Route' screen. This is the 2026-09-03 regression: a route the app navigates to does not resolve. Check experiments.baseUrl is not set for native builds (see app.config.js)."
fi

echo "ok: no 'Unmatched' text on screen"

# --- Assertion 3: not a React Native error screen ---------------------------
#
# ADDED AFTER A FALSE PASS. On this test's first real run it reported success
# while the app was actually showing React Native's red-box error screen -- the
# APK had no embedded JS bundle, so it could not start. The old checks all
# passed anyway: the process stays alive on a red box, RN catches the failure so
# nothing logs FATAL EXCEPTION, the word "Unmatched" is absent, and a rendered
# Java stack trace easily clears a "has some text" threshold.
#
# A test that green-lights a broken app is worse than no test. These markers are
# what that screen actually contained.

echo ""
echo "--- Assertion 3: not a React Native error screen"

if grep -qiE 'text="[^"]*(loadJSBundleFromAssets|Unable to load script|Could not connect to development server|ReactInstance|com\.facebook\.react|\.kt"|\.java")' "$UI_XML"; then
  echo "--- visible text on screen ---"
  grep -oE 'text="[^"]*"' "$UI_XML" | sed 's/^/  /' | head -25
  fail "the app is showing React Native's error screen, not the app. Stack-trace text is on screen. Most likely the APK has no embedded JS bundle -- a debug build does not embed one (no bundleInDebug), so this must be a RELEASE build."
fi

echo "ok: no React Native error-screen markers"

# --- Assertion 4: the expected first screen actually rendered ---------------

echo ""
echo "--- Assertion 4: the expected first screen rendered"

TEXT_NODES=$(grep -oE 'text="[^"]+"' "$UI_XML" | grep -vE 'text=""' | wc -l)
echo "visible text nodes: $TEXT_NODES"

# HARD failure, deliberately. This was informational on the first run, which is
# precisely why a broken app passed: without requiring a KNOWN screen, "reached
# a real screen" degrades into "rendered some text", and a stack trace is text.
#
# A fresh install is unauthenticated, so app/index.tsx redirects to
# (auth)/login. If the first screen is ever changed on purpose, update these
# markers -- do not delete the check.
if ! grep -qiE 'text="[^"]*(password|login|mag-login)[^"]*"' "$UI_XML"; then
  echo "--- what was actually on screen ---"
  grep -oE 'text="[^"]*"' "$UI_XML" | sed 's/^/  /' | head -25
  fail "the login screen did not render. Expected a fresh install to land on (auth)/login via app/index.tsx. If the first screen changed deliberately, update the markers in this script."
fi

echo "ok: login screen rendered ($TEXT_NODES text elements)"

echo ""
echo "APK BOOT TEST PASSED -- the app installs, launches, and reaches the login screen."
exit 0

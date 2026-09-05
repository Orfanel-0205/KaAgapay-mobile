#!/usr/bin/env bash
#
# .github/scripts/assert-app-boots.sh
#
# Installs the debug APK on the running emulator, launches it, and asserts it
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
APK="android/app/build/outputs/apk/debug/app-debug.apk"
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

# --- Assertion 3: a real screen actually rendered ---------------------------

echo ""
echo "--- Assertion 3: a real screen rendered"

TEXT_NODES=$(grep -oE 'text="[^"]+"' "$UI_XML" | grep -vE 'text=""' | wc -l)
echo "visible text nodes: $TEXT_NODES"

# A splash screen or blank/error view yields almost nothing. A real screen has
# labels, buttons and inputs. Threshold is deliberately low to avoid flaking on
# a slow emulator while still catching a blank render.
if [ "$TEXT_NODES" -lt 3 ]; then
  echo "--- what was on screen ---"
  grep -oE 'text="[^"]*"' "$UI_XML" | sed 's/^/  /' | head -20
  fail "only $TEXT_NODES text elements rendered -- the app is showing a blank or splash screen, not a usable one."
fi

echo "ok: $TEXT_NODES text elements rendered"

# Informational, not a hard failure. A fresh install is unauthenticated and
# should land on the login screen, but making this fatal would break CI for any
# legitimate change to the first screen. If the first screen is intentionally
# changed, update this marker rather than deleting the check.
echo ""
echo "--- Informational: expected first screen"
if grep -qiE 'text="[^"]*(password|login|mag-login)[^"]*"' "$UI_XML"; then
  echo "ok: login screen markers present (expected for a fresh install)"
else
  echo "note: no login markers found. Visible text was:"
  grep -oE 'text="[^"]+"' "$UI_XML" | sed 's/^/  /' | head -15
  echo "note: not failing on this -- but confirm this is the screen you expect."
fi

echo ""
echo "APK BOOT TEST PASSED -- the app installs, launches, and reaches a real screen."
exit 0

// app.config.js
//
// Wraps app.json to make `experiments.baseUrl` a WEB-ONLY setting.
//
// -----------------------------------------------------------------------------
// INCIDENT: app.json previously set experiments.baseUrl: "/app" globally
// (commit 6fe621d, "match nginx deployment path"), on the assumption that it
// only affects web export. That assumption was never checked against a native
// build and was wrong: it broke cold launch on Android entirely
// ("Unmatched Route" at kaagapay:///) until this file replaced it.
//
// TRACED, not assumed:
//   - babel-preset-expo unconditionally does
//       inlines['process.env.EXPO_BASE_URL'] = baseUrl
//     right next to its Platform.OS inliner, with NO platform check.
//   - expo-router's stripBaseUrl() defaults to that same
//     process.env.EXPO_BASE_URL and runs on every path lookup, on every
//     platform, including native.
//   - exportEmbedAsync.js -- the exact script EAS Build's Gradle/Xcode step
//     runs to produce the native release JS bundle -- calls
//     getMetroDirectBundleOptionsForExpoConfig(), which reads
//     exp.experiments.baseUrl with no platform argument at all.
//   - CONFIRMED empirically: bundling this project with
//     `expo export:embed --platform android` while app.json held
//     experiments.baseUrl: "/app" produced a real Android bundle containing
//     the compiled default `arguments[1] !== undefined ? arguments[1] : "/app"`
//     inside stripBaseUrl -- "/app" baked directly into the code every
//     Android device runs. There is no framework-level gate; this feature is
//     genuinely global unless something scopes it, which is what this file
//     now does. (Expo's own exportEmbedAsync.js carries a matching admission
//     for assets: "this may need to be adjusted in the future if want to
//     support baseUrl on native platforms".)
//
// FIX: baseUrl is now read from the EXPO_BASE_URL environment variable at
// config-eval time, not hardcoded in the static config. EAS native builds
// (and `expo start`, `expo run:android`, `expo run:ios`) never set that
// variable, so `experiments` is omitted entirely for them -- back to the
// pre-incident, always-safe state. Only an explicit web export sets it:
//
//     EXPO_BASE_URL=/app npx expo export --platform web
//
// This is Expo's own documented invocation for hosting a static export under
// a subpath (e.g. GitHub Pages), so the web deploy step does not need any new
// custom flag -- just this one existing, standard environment variable, now
// actually scoped to the build it is meant for.
//
// This file is a thin overlay: app.json remains the source of truth for every
// other key. Do not add `experiments.baseUrl` back to app.json -- that is
// exactly the regression this file exists to prevent.

const appJson = require('./app.json');

module.exports = ({ config }) => {
  const base = config ?? appJson.expo;

  const baseUrl = (process.env.EXPO_BASE_URL || '').trim();

  if (!baseUrl) {
    // Native builds, `expo start`, Expo Go: no baseUrl, matching the
    // pre-incident config. This is the default for every path that does not
    // explicitly opt in.
    //
    // Strip ONLY baseUrl, never the whole `experiments` block. An earlier
    // version of this file dropped every experiment flag here, which would
    // have silently disabled any future native-safe experiment (typedRoutes,
    // reactCompiler, ...) the moment someone added one -- the same kind of
    // invisible failure this file exists to prevent.
    const { baseUrl: _dropped, ...keptExperiments } = base.experiments ?? {};

    return Object.keys(keptExperiments).length > 0
      ? { ...base, experiments: keptExperiments }
      : (({ experiments: _removed, ...rest }) => rest)(base);
  }

  // Explicit web export only.
  return {
    ...base,
    experiments: {
      ...base.experiments,
      baseUrl,
    },
  };
};

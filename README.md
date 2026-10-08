# Ka-Agapay — resident mobile app

The Android app residents of Malasiqui use: sign up and verify their ID, book
appointments, take a queue ticket and follow it live, request a telemedicine
consultation and join the video call, see their records and e-prescriptions,
register for RHU events, get reminders and notifications, and ask the
assistant (text, photo or voice).

It talks to the Ka-Agapay backend at `/api/v1` (repository `PROMAIN-BE`,
folder `ka-agapay-backend`). RHU staff use the web admin instead.

## Stack

Expo SDK 54 · React Native 0.81 · expo-router · TypeScript · NativeWind ·
zustand · axios · Jest (jest-expo). Built and signed with EAS.

## Running it on your computer

Requirements: Node 20+, an Android phone with Expo Go (or an emulator), and the
backend running locally (see its README).

```bash
npm install
EXPO_PUBLIC_API_URL=http://<your-computer's-LAN-IP>:8000 npx expo start
```

The phone must reach your computer, so use its LAN address, not `localhost`.
Expo Go is enough for most screens; push notifications need a real build.

## Tests

```bash
npm test             # Jest, 38 tests as of October 2026
npx tsc --noEmit     # type check
```

## Builds

```bash
npm run build:preview       # installable APK for testing (EAS, ~15 min)
npm run build:production    # app bundle (AAB) for the Play Store
npm run submit:production   # upload the latest production build to Play
```

The API address for each build is set in `eas.json` (`EXPO_PUBLIC_API_URL`,
in all three profiles) and baked into the app. **Changing the domain means
updating all three and building again** — phones keep calling the old address
until residents install the new version, so keep the old address working for a
while.

**Push notifications need Android's Firebase file**, `google-services.json`,
which is a credential and is not in Git. EAS gets it from the file-type
environment variable `GOOGLE_SERVICES_JSON`; a local build reads
`./google-services.json`. Every EAS build first runs
`scripts/check-push-credentials.mjs` and stops if the file is missing, empty,
or for another app — without it an APK builds fine and can never receive a
notification. Details: the header of `app.config.js`, and the backend's
`docs/OPERATIONS.md` §11.

The account that owns the EAS project and its signing key is set in
`app.json` (`owner`). Transfer it to the LGU before handover; the signing key
must be kept, or the Play Store will refuse updates.

## Before the first Play Store release

- **Decide the package name.** It is `com.pogi133.kaagapay` in `app.json` and it
  can never change once published. Changing it also needs a matching Firebase
  Android app and `google-services.json`.
- **In-app account deletion** is required by Google Play for apps with accounts.
- **Data safety form**: answers drafted in `docs/play-data-safety.md`.
- **Version**: raise `version` in `app.json` for each release.

## Where things are

```
app/               screens, by route (expo-router): (auth), (tabs), queue, events, records, …
screens/           larger screens used by routes (sign-in, forgot password, …)
Components/        shared components (DuckOverlay for error screens, …)
features/          self-contained areas (telemedicine, …)
services/api/      one file per API area; client.ts adds the token and handles errors
store/             signed-in session (useAuthStore + authStorage), language
hooks/             auth, biometrics, push notifications, read-aloud, …
constants/i18n.ts  English / Tagalog / Pangasinan strings
__tests__/         Jest
```

## Conventions worth knowing

- **The sign-in token lives in SecureStore** (the phone's keystore), the rest of
  the session in AsyncStorage (`store/authStorage.ts`). Never log the token or any
  part of it — release builds keep `console.log`.
- `android.allowBackup` is off, so app data is not copied to Google backups.
- **The server decides who may see what.** A screen hiding something is
  courtesy; the backend enforces it.
- **Time** is shown in Philippine time.
- **Comments explain why.** Most non-obvious code says what went wrong before it
  existed. Keep that up.

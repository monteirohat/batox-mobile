# Publishing on Google Play

What the Play Console asks for, and the answers for BatoX. The app's package is
`io.github.monteirohat.batox`.

## 1. Build and upload

The production profile in [eas.json](../eas.json) builds an Android App Bundle (`.aab`), signed
by EAS with the app's upload key. The version code is kept by EAS (`appVersionSource: remote`)
and goes up by one on each build; the version name is `version` in [app.json](../app.json).

```bash
npx eas-cli@latest build --platform android --profile production
```

The first bundle has to be uploaded by hand, in the Play Console (Test and release > Testing >
Closed testing > Create new release), since Google only takes uploads through the API once the app
exists. Later ones can go up with:

```bash
npx eas-cli@latest submit --platform android --profile production
```

which needs a Google service account key; see
[Expo's guide](https://docs.expo.dev/submit/android/).

## 2. Closed test first

A personal developer account created after November 13, 2023 has to run a **closed test with at
least 12 testers who stay opted in for 14 days in a row** before it can ask for production access
([Google's rule](https://support.google.com/googleplay/android-developer/answer/14151465)). Add
the testers' Google accounts to a list, share the opt-in link, and let the 14 days run while the
rest of this page gets done. Then Dashboard > Apply for production.

## 3. Store listing

- **App name**: BatoX
- **Short description** (80 characters at most):
  `Install BatoX on your Batocera console and manage it from your phone.`
- **Full description**: start from the README's [What it does](../README.md#what-it-does); say
  near the top that the app needs a console running Batocera on the same network, and that BatoX
  isn't affiliated with the Batocera project.
- **App icon**: 512 × 512 PNG, from `assets/images/icon.png` (1024 × 1024) scaled down.
- **Feature graphic**: 1024 × 500, the wordmark over the sunset (the welcome screen's look).
- **Phone screenshots**: at least 2 (up to 8), 1080 × 2400 from the emulator: welcome, a
  console's home, Games, a game, Consoles, Batocera settings.
- **Category**: Tools. **Contact email**: required, shown publicly.
- **Privacy policy**: https://github.com/monteirohat/batox-mobile/blob/main/PRIVACY.md

## 4. App content

- **App access**: *All or some functionality is restricted*. The reviewers have no Batocera
  console, so explain it and give them a way to see the app work:

  > BatoX manages a Batocera game console on the user's own network, so every screen after the
  > welcome needs one. Without a console, "Install BatoX on a console" and "I already have BatoX"
  > show their forms and say why they can't connect. A video of the app connected to a console:
  > <link to an unlisted video>.

  The video (two or three minutes: connect, the home, Games, Play on the TV, a setting) is the
  part that avoids a rejection for "app doesn't work".
- **Ads**: no.
- **Content rating**: the questionnaire, category Utility; no violence, user content shared with
  others, or purchases. The result is Everyone / PEGI 3.
- **Target audience**: 18 and over (it manages a device and its files; not designed for children).
- **Data safety**:
  - Does the app collect or share user data? **No.** Google counts data as collected when it is
    sent off the device to the developer or a third party. The app sends data only to the user's
    own console, and talks to GitHub only to list BatoX's releases, without any user data.
  - Is data encrypted in transit? Answered only when something is collected; nothing is.
  - Can users ask for their data to be deleted? Nothing is kept off the phone; forgetting a
    console in the app, or uninstalling it, removes what the phone keeps.
- **Government app, financial features, health, news**: no.

## 5. Permissions

The bundle asks only for `INTERNET`, `ACCESS_NETWORK_STATE` and `VIBRATE`, plus a permission of
its own that Android adds for dynamic receivers. Permissions that libraries bring in but the app
doesn't use are blocked in `app.json` (`android.blockedPermissions`): drawing over other apps,
fingerprint and biometrics, and external storage (the file picker needs none).

Plain HTTP is allowed (`usesCleartextTraffic`), since BatoX's API on the console has no TLS; the
console is on the user's own network.

## 6. Before each release

1. `npm run typecheck`, `npm run lint`, `npm test`, `npm run doctor`.
2. A release build on the emulator against a real console (`npx expo prebuild -p android --clean`,
   then `./gradlew :app:assembleRelease` in `android/`, and install
   `android/app/build/outputs/apk/release/app-release.apk`).
3. `version` in app.json and package.json, and the CHANGELOG's section for it.

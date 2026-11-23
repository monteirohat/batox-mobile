# Publishing on Google Play

What the Play Console asks for, and the answers for BatoX. The app is published by **Algore
Tecnologia**, from its organization account; its package is `br.com.algore.batox`, and the EAS
project belongs to the `algore-tecnologia` Expo organization (`owner` in app.json).

## 1. Build and upload

The production profile in [eas.json](../eas.json) builds an Android App Bundle (`.aab`), signed
by EAS with the app's upload key. The version code is kept by EAS (`appVersionSource: remote`)
and goes up by one on each build; the version name is `version` in [app.json](../app.json).

```bash
npx eas-cli@latest build --platform android --profile production
```

The first bundle has to be uploaded by hand, in the Play Console (Test and release > Testing >
Internal testing > Create new release), since Google only takes uploads through the API once the app
exists. Later ones can go up with:

```bash
npx eas-cli@latest submit --platform android --profile production
```

which needs a Google service account key; see
[Expo's guide](https://docs.expo.dev/submit/android/).

## 2. Testing

Organization accounts don't need the closed test of 12 testers for 14 days, which applies only to
personal accounts created after November 13, 2023
([Google's rule](https://support.google.com/googleplay/android-developer/answer/14151465)). Still,
send the first bundle to **Internal testing** (Test and release > Testing > Internal testing, up
to 100 testers, available in minutes), install it from the Play Store on a real phone, and check
it against a console. Then promote the same release to **Production**.

## 3. Store listing

The images are in [store/android/](../store/android/): `icon-512.png`, `feature-graphic.jpg`
(both drawn by `python3 tools/render-store.py`) and six phone screenshots, 1080 × 2160. The
screenshots come from the release build on the emulator with its screen set to 2:1 (Play takes no
more than 2:1) and a clean status bar:

```bash
adb shell wm size 1080x2160
adb shell settings put global sysui_demo_allowed 1
adb shell am broadcast -a com.android.systemui.demo -e command enter
adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 1000
adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false
adb exec-out screencap -p > store/android/2-home.png    # one per screen
adb shell am broadcast -a com.android.systemui.demo -e command exit && adb shell wm size reset
```

**Keep other companies' marks out of the images and the text.** The screenshots leave out Games,
Consoles and Extensions on purpose: they show console makers' logos, commercial games' names and
covers, and Apple's names. Play rejects apps for third-party trademarks in the listing, and is
strict with anything that looks like it hands out games. Say what the app does with the user's
own console and games, and name Batocera only to say what it works with.

- **App name**: `BatoX`
- **Short description** (80 characters at most):
  `Install BatoX on your Batocera console and manage it from your phone.`
- **Full description**:

  ```
  BatoX is the companion app for BatoX, the free web panel for Batocera retro gaming consoles.
  It needs a console running Batocera on the same Wi-Fi network as your phone.

  INSTALL AND UPDATE
  Install BatoX on your console straight from your phone: type its address and SSH login, check
  the console, pick a version, and the app does the rest. The console downloads the release
  itself and checks it before installing. Updating keeps your token and settings.

  YOUR CONSOLE AT A GLANCE
  The console's model and versions, temperature, memory, storage and uptime, the game being
  played, and Reboot and Shut down.

  EVERYTHING FROM THE WEB PANEL
  - Browse your games by system, see their details, and start one on the TV.
  - Upload your own game files and music from the phone.
  - Send a message to the TV, even during a game.
  - Start a play timer that closes the game, turns the console off, or just shows the time.
  - Restart EmulationStation, reload the game lists, and edit its settings.
  - Choose the screens and the sound output.
  - Change any Batocera setting, with the right control for each one.
  - Manage extensions from the official catalog, read the logs, and see the API access.

  PRIVATE BY DESIGN
  No account, no ads, no analytics. The app talks only to your consoles, on your own network.
  Your access token is kept in the phone's secure storage.

  BatoX is open source (MIT) and is not affiliated with or endorsed by the Batocera project.
  BatoX doesn't include or provide any games: use only games you own the rights to.
  ```

- **App icon**: `store/android/icon-512.png`.
- **Feature graphic**: `store/android/feature-graphic.jpg`.
- **Phone screenshots**: `store/android/1-welcome.png` to `6-batocera.png`, in that order.
- **Category**: Tools. **Tags**: the closest to "remote control" and "device management".
- **Contact email**: info@algore.com.br (shown publicly). **Website**:
  https://github.com/monteirohat/BatoX
- **Privacy policy**: https://github.com/monteirohat/batox-mobile/blob/main/PRIVACY.md

## 4. App content

- **App access**: *All or some functionality is restricted*. The reviewers have no Batocera
  console, so explain it and give them a way to see the app work:

  > BatoX manages a Batocera game console on the user's own network, so every screen after the
  > welcome needs one. Without a console, "Install BatoX on a console" and "I already have BatoX"
  > show their forms and say why they can't connect. A video of the app connected to a console:
  > https://www.youtube.com/watch?v=zLaTp0-zb3c

  The video (two or three minutes: connect, the home, a message on the TV, the timer, a setting)
  is the part that avoids a rejection for "app doesn't work". It is on the Algore Tecnologia
  YouTube channel, unlisted, and keeps commercial games' names and covers out. It was recorded on
  a phone with `adb shell screenrecord`, with Android's demo mode for a clean status bar.
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

# Publishing on the App Store

What App Store Connect asks for, and the answers for BatoX. As on Google Play
([google-play.md](google-play.md)), the app is published by **Algore Tecnologia**, its bundle ID is
`br.com.algore.batox`, and the EAS project belongs to the `algore-tecnologia` Expo organization.

## 1. The Apple Developer account

Enroll **Algore Tecnologia** as an organization in the
[Apple Developer Program](https://developer.apple.com/programs/enroll/) (yearly fee). Apple asks
for:

- an Apple Account with two-factor authentication, of someone who can sign for the company;
- the company's legal name and its **D-U-N-S number**, exactly as D&B has them;
- a website on the company's domain (algore.com.br) and a work email on it.

Apple checks the company, sometimes with a phone call, which takes a few days. The seller name on
the App Store is the legal name from D-U-N-S.

## 2. Build and upload

iOS builds run on EAS, like Android's: EAS keeps the signing certificate and the provisioning
profile, and builds with Apple's current SDK, the only one the App Store takes. The build number is kept by EAS
(`appVersionSource: remote`) and goes up by one on each build; the version is `version` in
[app.json](../app.json), the same as on Android.

The first production build has to be run in a terminal by someone with the Apple Account, since it
signs in to Apple: EAS registers the bundle ID and makes the distribution certificate and the
provisioning profile, and keeps them.

```bash
npx eas-cli@latest build --platform ios --profile production
```

Then create the app in [App Store Connect](https://appstoreconnect.apple.com) (Apps > + > New App):
platform **iOS**, name **BatoX**, primary language **English (U.S.)**, bundle ID
`br.com.algore.batox`, SKU `batox-mobile`, full access. The name has to be free on the whole App
Store; if Apple says it is taken, use `BatoX Console Manager`.

Upload the build to TestFlight:

```bash
npx eas-cli@latest submit --platform ios --profile production --latest
```

It asks for the app's ID in App Store Connect (App Information > Apple ID, a number); put it in
[eas.json](../eas.json) under `submit.production.ios.ascAppId` so later submits don't ask. An App
Store Connect API key (Users and Access > Integrations, role App Manager) lets EAS submit without
the Apple Account's password.

## 3. Testing

Test the release build on the iOS simulator first, with no Apple account:

```bash
npx eas-cli@latest build --platform ios --profile preview-simulator
```

and install the `.app` from the downloaded archive (Xcode 27 replaced the Simulator app with
DeviceHub; `simctl` works either way):

```bash
xcrun simctl install booted BatoX.app && xcrun simctl launch booted br.com.algore.batox
```

The simulator reaches the console on the Mac's network, but it doesn't ask for the local network
permission like a phone. [AXe](https://github.com/cameroncooke/AXe) taps and types on it from the
terminal (`axe describe-ui`, `axe tap --label …`, `axe type …`).

Checked on the iPhone 18 Pro Max simulator (iOS 27.2) against the Raspberry Pi 4: connecting with
a token, and updating BatoX from v1.10.0-dev to v1.10.0 over SSH, which runs the Swift TCP module.

Then, with the build in TestFlight, add yourself under **Internal Testing** (up to 100 people of
the team; no review by Apple), install **TestFlight** on an iPhone and check against a console:

- the **local network** prompt comes up on the first connection, and connecting works after
  **Allow**; with **Don't Allow**, connecting fails with the "didn't answer" or "couldn't reach"
  message, which doesn't yet point to iOS Settings > BatoX > Local Network, where it is turned back
  on (worth adding if it confuses);
- installing BatoX over SSH, the home, a message on the TV, the timer, uploading a file from
  Files, a setting.

## 4. Export compliance (encryption)

The app has its own SSH client (`src/ssh/`, on the @noble libraries), so it implements standard
encryption itself instead of using only Apple's. Apple's rule
([Complying with encryption export regulations](https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations)):
`ITSAppUsesNonExemptEncryption` is `YES` unless the app uses no encryption or only exempt forms.
`app.json` sets it (`ios.config.usesNonExemptEncryption: true`).

In App Store Connect, the build then asks a few questions before it can be tested or submitted.
The answer that fits is **standard encryption algorithms, instead of or in addition to the
encryption within Apple's operating system** (not proprietary ones). Per Apple's
[table](https://developer.apple.com/help/app-store-connect/reference/export-compliance-documentation-for-encryption),
that needs **no US documents**, only the **French encryption declaration**, and only when the app
is on the App Store in France.

**Decision for the first release: leave France out** of the app's availability (Pricing and
Availability), and answer that the app won't be on the App Store in France. France can be added
later, once the declaration is filed with the French cybersecurity agency (ANSSI) and uploaded to
App Store Connect.

## 5. App information

**Keep other companies' marks out of the images and the text**, as on Google Play: no console
makers' logos, no commercial games' names or covers, no Apple names in the screenshots. Name
Batocera only to say what the app works with. Apple also turns down descriptions that name other
platforms, so the text doesn't mention Android.

- **Name** (30 characters at most): `BatoX`
- **Subtitle** (30): `Manage your Batocera console`
- **Category**: Utilities; secondary: Entertainment.
- **Promotional text** (170, can change without a review):
  `Install BatoX on your Batocera console from your phone, then run it from the couch: games, messages on the TV, play timers and every setting.`
- **Description**: the full description in [google-play.md](google-play.md), section 3, as is.
- **Keywords** (100, comma separated, no spaces):
  `batocera,retro,retrogaming,console,emulation,remote,control,manager,panel,arcade,tv,timer`
- **Support URL**: https://github.com/monteirohat/batox-mobile/issues
- **Marketing URL**: https://github.com/monteirohat/BatoX
- **Privacy policy URL**: https://github.com/monteirohat/batox-mobile/blob/main/PRIVACY.md
- **Copyright**: `2026 Algore Tecnologia`
- **Price**: free. **Availability**: every country but France (section 4).

## 6. Screenshots

The app is for iPhone only (`supportsTablet: false`): iPads run it as an iPhone app, so the
listing needs no iPad screenshots, and since iOS 27 an iPad app has to work in windows of any size.
An app released for iPad can't drop it later; adding it later is allowed.

App Store Connect needs the **6.9" iPhone** set and scales it for the smaller iPhones. They are in
[store/ios/](../store/ios/), 1320 × 2868, the same six screens as on Google Play, in the same
order. They were taken on the **iPhone 18 Pro Max** simulator, with a console on the menu (no game
running, so no game's name or picture shows):

```bash
xcrun simctl io booted screenshot shot.png
ffmpeg -i shot.png -pix_fmt rgb24 store/ios/2-home.png    # App Store Connect refuses an alpha channel
```

`simctl status_bar … override` doesn't take on the iOS 27.2 simulator, so the status bar shows the
real time; Apple doesn't require a clean one.

## 7. App Privacy

**Data collection: no, the app doesn't collect data.** Apple counts data as collected when it
leaves the device to the developer or a third party; the app sends data only to the user's own
console, and asks GitHub only for BatoX's list of releases, with no user data
([PRIVACY.md](../PRIVACY.md)). The label shows **Data Not Collected**.

## 8. Age rating

No to every question (violence, mature themes, gambling, contests, user-generated content,
messaging between users, web browsing, advertising, in-app purchases); the app has no parental
controls or age checks of its own. The result is **4+**.

## 9. App Review

The reviewers have no Batocera console, and a rejection for "the app doesn't work" (guideline 2.1)
is the main risk. Fill **App Review Information** with:

- **Sign-in required**: no.
- **Contact**: a person at Algore Tecnologia, phone and info@algore.com.br.
- **Notes**:

  > BatoX manages a Batocera game console on the user's own home network: Batocera is a free,
  > open-source operating system for retro gaming that runs on single-board computers and PCs.
  > Every screen after the welcome needs such a console on the same Wi-Fi network. Without one,
  > "Install BatoX on a console" and "I already have BatoX" show their forms and explain why they
  > can't connect. The app has no account, ads or purchases, and doesn't include or provide any
  > games. A video of the app connected to a console (connecting, the home screen, a message on
  > the TV, the play timer, a setting): https://www.youtube.com/watch?v=zLaTp0-zb3c
  >
  > The local network permission is used to connect to the console; the app uses its own SSH
  > client (standard algorithms) only to install its companion service on the user's console.

- **Attachment**: optional; the same video can be uploaded as a file.

If Apple still asks to try it, the answer is a demo mode with a simulated console; it doesn't exist
yet.

## 10. Before each release

1. `npm run typecheck`, `npm run lint`, `npm test`, `npm run doctor`.
2. The `preview-simulator` build on the simulator against a real console, and TestFlight on an
   iPhone for anything that touches the network or SSH.
3. `version` in app.json and package.json, and the CHANGELOG's section for it.
4. **What's New in This Version** in App Store Connect: the CHANGELOG's section, in short.

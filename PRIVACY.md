# Privacy policy

BatoX for iOS and Android ("the app") manages a Batocera console on your own network. This page
says what the app keeps, what it sends and where. It applies to the app published as **BatoX** by
**Algore Tecnologia** on Google Play and the App Store, package `br.com.algore.batox`.

**In short:** the app has no account, no analytics, no ads and no server of its own. Algore
Tecnologia receives nothing from it.

## What the app keeps on your phone

- **Your consoles**: each one's address, its BatoX access token, its name, the BatoX version it
  runs and its SSH host key fingerprint. They are kept in the phone's secure storage (Keychain on
  iOS, Keystore-backed storage on Android) until you forget the console in the app or uninstall
  the app.
- **A cache of images** read from your consoles (game covers, system logos), so screens open
  faster. The system may clear it at any time.

The **SSH password** you type to install BatoX is used for that installation only. It is never
saved.

## Where the app connects

- **Your consoles**, on your local network: BatoX's API (HTTP) and, while installing or updating
  BatoX, SSH. What you see and change in the app (games, settings, files you upload, messages to
  the TV) goes only to the console you chose.
- **GitHub** (`api.github.com`), to list BatoX's releases when you install or update BatoX.
  GitHub receives the request like any visit, including your phone's IP address
  ([GitHub's privacy statement](https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement)).
  The console then downloads the release from GitHub itself.
- **A game library you add yourself**: its address is sent to your console, which reads it. The
  phone doesn't contact it.

Nothing is sent to Algore Tecnologia or to any other party.

## Files the app reads

When you upload games or music, or install a theme, the app reads only the files you pick in the
system's file picker, and sends them to your console. It doesn't read other files.

## Children

The app isn't directed at children and doesn't knowingly collect anything from anyone.

## Changes and contact

Changes to this policy are published on this page, with the date below. Questions about privacy:
Algore Tecnologia, [info@algore.com.br](mailto:info@algore.com.br), or
[open an issue](https://github.com/monteirohat/batox-mobile/issues).

Last updated: 2026-11-23.

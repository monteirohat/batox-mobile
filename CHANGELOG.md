# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- The Expo app (SDK 58, Expo Router, TypeScript) for iOS and Android, dark only.
- BatoX's look: the web panel's tokens (colors, Inter in three weights, square corners), the
  sunset backdrop, buttons with the white frame on the main one.
- App icon (the pink B), Android adaptive and monochrome icons, and a splash screen with the
  wordmark that stays until the fonts are loaded.
- The welcome screen, with the two ways in: install BatoX on a console, or connect to one that
  already runs it. Both lead to screens that say what comes next.
- Plain HTTP to the local network allowed (Android cleartext traffic, iOS local networking), for
  BatoX's API on the console.
- CI: type-check, lint and expo-doctor on every push.
- An SSH client in TypeScript (`src/ssh/`), on the @noble cryptography: curve25519-sha256, Ed25519
  and ECDSA P-256 host keys, AES-CTR with HMAC-SHA-256, strict key exchange, password and
  keyboard-interactive sign-in, and commands run with their stdout, stderr and exit code. Tested
  against Batocera's Dropbear.
- A native TCP module (`modules/batox-tcp`): `java.net.Socket` on Android, `Network.framework` on
  iOS. The app now runs in a development build instead of Expo Go.
- The installer's first step: the console's address and SSH login, then "Check console" shows its
  model, Batocera version, processor, the BatoX it runs and its SSH host key, with the same
  checks and messages as the BatoX Installer.
- Unit tests (`npm test`) and a smoke test against a real console (`tools/ssh-smoke.ts`).
- Installing and updating BatoX: pick a version (the latest by default, or one of the last twelve),
  then the steps as the BatoX Installer runs them, each shown as it goes, with the download's
  progress. The console downloads the release from GitHub itself and checks its SHA-256 sums; an
  existing config.json is kept, and a MyMine install is moved to BatoX. The install refuses a
  console whose SSH host key changed since it was checked.
- The result: BatoX's address with Open BatoX, and its access token with Copy token. The console
  and its token are kept in the phone's secure storage for the next screens.
- EAS Build profiles (`eas.json`): development (a dev client), development-simulator (iOS
  simulator), preview and production.
- A smoke test of the install steps against a real console (`tools/install-smoke.ts`).

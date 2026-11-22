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

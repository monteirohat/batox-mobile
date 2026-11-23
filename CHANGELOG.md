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
- Connect to a console that already runs BatoX: its address (`batocera.local`, an IP, with or without
  a port or `http://`) and access token, checked against BatoX before they are kept.
- The home screen lists the consoles this phone knows. A console opens on its state, from BatoX's
  API: online or not, BatoX and Batocera versions, temperature, memory, free storage, time on, and
  the game being played, refreshed every 15 seconds and by pulling down. From there: Open BatoX,
  change a refused token, or forget the console (it stays installed).
- Finishing an install opens the new console's screen.
- Send a message to the TV (`POST /messages/notify`): the console's state first (on the menu, or
  the game being played), quick messages, then position, time on screen and title when the
  screen overlay is there, and the messages sent from the app.
- The play timer (`/timer`): duration (presets or minutes), what happens at zero, the corner of
  the TV and the title; while it runs, its countdown, +5 and +15 minutes, and Cancel. The
  console's screen shows the time left.
- Close the running game from the console's screen (`POST /now-playing/quit`), after a warning
  that unsaved progress is lost.
- Games: the systems that have games (`/consoles`), a system's games with a search that ignores
  case and accents (`/roms/system/{system}`), and a game's page (`/roms/{id}/details`): its cover,
  description, publisher, genre, players, rating, times played and play time. Play on the TV
  (`/roms/{id}/launch`) opens it on the console; when another game runs, the app asks before
  replacing it.
- Upload games (`POST /roms`): the system (searched among all of Batocera's), an optional language,
  replace or keep files with the same name, then the system's file picker; the files go one at a
  time with their progress, and those the system doesn't take or that are already on the console
  are skipped with the reason.
- Music (`/music`): the tracks by folder, uploading to the main folder or a system's, and deleting
  a track.
- The console's home follows the web panel's dashboard: the console over the sunset with its
  versions, Reboot and Shut down; the game being played with its cover, Details and Close game;
  temperature, memory, storage and uptime with bars in green, yellow and red; and the BatoX service.
- A side menu for the console's features (Home, Games, Upload games, Music, Messages, Timer), with
  Open BatoX in the browser and Switch console. The features left the home screen.
- The app opens on the console it used last. Switch console lists the saved consoles, to open
  another, add one, install BatoX on one, or forget one.
- Extensions (`/extensions`): the installed ones with On and Off, their state (running since,
  restarts, why it last stopped), Update, Restart and Remove; each one's settings, with the control
  its manifest asks for (text, number, on/off, a choice, a range with − and +), saved together
  with a restart, and its log. The catalog's extensions show what they may do and ask before
  installing.
- Logs: BatoX's activity and errors (`/logs`) and EmulationStation's log, newest first, 100, 200 or
  1000 lines, refreshed by pulling down.
- Uploaded files keep their real names, spaces and accents included: the app sends the name as
  `filename*=UTF-8''...` (RFC 5987), since React Native's FormData sends it percent-encoded.
- EmulationStation (`/emulationstation`): reload the game lists, restart, stop and start it; its
  settings (es_settings.cfg) with a search, true and false for the bool ones, a field for the
  others, a new setting by name and type, and a choice to restart EmulationStation when saving;
  install a theme from a .zip (activate it, only restart, or nothing); its log, 100, 200 or 1000
  lines, and Clear log.
- Video (`/video`): the screens now (main, second or off), the main screen (Automatic or one of
  them) and the second screen (On or Off), saved for the next start, with Restart now.
- Audio (`/audio`): the sound outputs with their kind, screen and the one playing, Automatic, Play
  a test sound, and Use the main screen's output when the sound comes out of another.
- The side menu draws the web panel's icons (the puzzle piece for Extensions), with
  react-native-svg: a new native module, so a new development build is needed.

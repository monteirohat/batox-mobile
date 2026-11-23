# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0] - 2026-11-23

The first version for the stores, published by Algore Tecnologia. The app's ID is now
`br.com.algore.batox` on Android and iOS (it was `io.github.monteirohat.batox` during
development, so a development build installs as another app).

### Security

- The app remembers each console's SSH host key and checks it on every install and update: a
  console that answers with another key gets no password until the new key is trusted, with both
  keys shown. The key is shown on the console's card, and whether the phone saw it before.
- A downloaded file that isn't in the release's SHA256SUMS stops the install, instead of going in
  unchecked.
- Android permissions the app doesn't use are blocked: drawing over other apps, fingerprint and
  biometrics, and external storage.

### Added

- A privacy policy ([PRIVACY.md](PRIVACY.md)) and the Google Play steps
  ([docs/google-play.md](docs/google-play.md)), with the listing's texts.
- The Play listing's images in `store/android/`: the 512 icon and the feature graphic (drawn by
  `tools/render-store.py`) and six phone screenshots.
- The EAS project, in the `algore-tecnologia` Expo organization.
- Library downloads can be cancelled (and leaving the screen cancels them); BatoX stops the one in
  progress.
- An upload that stalls for a minute, or whose answer doesn't come within two minutes of the last
  byte, stops with the reason instead of waiting forever.
- An address the phone doesn't know opens a screen that says so, with Choose a console, instead of
  screens that never finish loading.
- A failure to read the saved consoles no longer lets a change write over them; forgetting a
  console, or keeping one after an install, says when it fails.

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
- Consoles (`/consoles`): every system Batocera can emulate as a card with its logo
  (`/consoles/{name}/logo`) drawn in white, its name, maker and year, games, favorites and type;
  search, type (consoles, handhelds, arcade, computers, other), order (name, manufacturer, release
  year, most games) and only those with games. A system's screen shows its details and
  EmulationStation's statistics, its ROM folder and accepted files, with Show games and Upload
  games (which opens with the system chosen).
- Logos are whitened with SVG filters; those that come on a dark or gray plate lose it first, with
  batox-theme's lists (newer than the web panel's: Odyssey2 and PrBoom were white blocks there).
  Logos load one at a time and are kept while the app runs.
- Games is the web panel's Games screen: every game in one list, with a search, a system, Sync
  library (with what it added, moved, removed, and the duplicates) and Upload games, which stay at
  the top while the games scroll; Show games on
  a system's screen opens it on that system. A game's page has Delete game. The list reads the
  console again after an upload or a deletion.
- Choosing a system (Upload games, Music) is the web panel's select: every Batocera system A to Z,
  as "Full name (folder)" with its games, in a list with a search, instead of the twelve systems
  with games. Upload games remembers the last system chosen on each console.
- Scrolling screens span the whole width (`src/theme/page.ts`): the scroll bar sits at the screen's
  edge instead of inside the side margin, which made the screen look like a smaller box.
- Batocera settings (`/batocera/settings`): the categories, general and per game system, with their
  keys; each key with its control (On and Off, a list, a range, a number, text, a password with
  Show, a link to the Audio or Video screen); lists of more than six choices open a full screen
  list with a search; a search over every key; keys that aren't set can be hidden; Add a key.
- Library (`/library`): the address of library.json (Save, Forget), the library's games with their
  covers, a search, a system, all or only those not on the console, select and download one at a
  time with each game's state, and Replace for a file with the same name.
- Access: the API address and token (Show, Copy token), Test the connection, Change the token, Open
  BatoX in the browser, and the API's routes (`/about`).

# batox-mobile

BatoX for iOS and Android: install [BatoX](https://github.com/monteirohat/BatoX) on your Batocera
console and manage it from your phone. Built with Expo (React Native).

> **Status:** early work. The app installs and updates BatoX on a console, connects to one that
> already runs it, shows how each console is doing, and brings BatoX's features over one by one:
> the games (and playing one on the TV), uploading games and music, messages on the TV, the play
> timer and closing the running game so far. It isn't in the App Store or Google Play yet.

## What it does

1. **Install BatoX** on a Batocera console, as the
   [BatoX Installer](https://github.com/monteirohat/BatoX_Installer) does on a computer: type the
   console's address and SSH login, check the console, pick a version (the latest is chosen).
   The console downloads the release from GitHub and checks its SHA-256 sums, then the app
   installs the service, starts it, waits for it to answer, and shows the address and the access
   token. The token is kept in the phone's secure storage (Keychain, Android Keystore). Updating
   and reinstalling keep the console's token, settings and catalog.

2. **Connect** to a console that already runs BatoX, with its address and access token. The app
   checks both (BatoX answers, the token is taken) before keeping them.
3. **A console's home**, as the web panel's dashboard: the console over the sunset (its model, BatoX
   and Batocera versions, Reboot and Shut down), the game being played with its cover, and
   temperature, memory, storage and uptime, each with a bar that turns yellow then red. The app
   opens on the console it used last; a side menu holds the console's features, Open BatoX in the
   browser, and Switch console (open another, add one, install BatoX on one, or forget one).

4. **Games**: the systems with games, then a system's games with a search (it ignores case and
   accents), then a game: its cover and what EmulationStation scraped (description, publisher,
   genre, players, rating, times played), and **Play on the TV**. When another game is running,
   the app asks before closing it.
5. **Upload games** from the phone: choose the system (a search over Batocera's systems), pick
   files with the system's file picker, and they go one at a time to its folder, each with its
   progress. Files the system doesn't take, and games already on the console, are skipped with
   the reason.
6. **Music**: the menus' background music, by folder (main, or a system's); upload tracks the same
   way, or delete one.
7. **Send a message** to the TV, even during a game: quick messages, and where, how long and
   under which title it shows, as on the web panel's Messages screen.
8. **Play timer**: a countdown on the TV, then BatoX closes the game, turns the console off or only
   shows that the time is up; add 5 or 15 minutes, or cancel it.
9. **Close the game** that is running, from the console's screen.

## What comes next

1. **More of BatoX's features**, bringing BatoX's features over one by one through its
   [API](https://github.com/monteirohat/BatoX/blob/main/docs/api.md): the console's status, messages
   on the TV, the play timer, what's playing, the game list, uploads and settings.

## Look

The same as BatoX's web panel and the [batox-theme](https://github.com/monteirohat/batox-theme):
flat dark indigo surfaces over a sunset picture, white type in Inter, one white frame on the main
action, square corners. The tokens are in [src/theme/tokens.ts](src/theme/tokens.ts); a screen
names a token and never writes a color, a size or a font itself.

## How it talks to the console

Installing goes over SSH, and the app carries its own small SSH client in TypeScript
([src/ssh/](src/ssh/)): React Native has no SSH, and the native libraries for it are old or hard to
build. It speaks a modern set that every current OpenSSH and Dropbear (Batocera's SSH server)
offer, on the audited [@noble](https://paulmillr.com/noble/) cryptography: curve25519-sha256 key
exchange, Ed25519 and ECDSA P-256 host keys, AES-CTR with HMAC-SHA-256, password sign-in, and
commands with their output and exit code. It also guards against the Terrapin attack (strict key
exchange).

Under it, a small native module ([modules/batox-tcp/](modules/batox-tcp/)) opens the TCP
connection with the system's own API: `java.net.Socket` on Android, `Network.framework` on iOS.

## Development

Needs Node 22 or newer. Expo's own guidance for this project is in [AGENTS.md](AGENTS.md).

```bash
npm install
npx expo run:android # builds the app with its native module and opens it on an emulator or phone
npx expo run:ios     # the same for iOS (needs Xcode 16.1 or newer)
npm start            # the dev server alone, once the app is installed
npm run typecheck
npm run lint
npm test             # unit tests of the SSH client's building blocks
npm run doctor       # expo-doctor: dependency and config checks

CONSOLE=192.168.0.10 npx tsx tools/ssh-smoke.ts       # the SSH client against a real console, from a computer
CONSOLE=192.168.0.10 npx tsx tools/install-smoke.ts   # the install steps against a real console (reinstalls BatoX)
```

The app has native code of its own (the TCP module), so it runs in a development build, not in
Expo Go. On a Mac whose default Java doesn't run, point `JAVA_HOME` at Android Studio's
(`/Applications/Android Studio.app/Contents/jbr/Contents/Home`).

### Builds with EAS

iOS builds run on Expo's servers ([EAS Build](https://docs.expo.dev/build/introduction/)), with the
profiles in [eas.json](eas.json). Once, sign in and link the project (this adds its EAS id to
`app.json`):

```bash
npx eas-cli@latest login
npx eas-cli@latest init
```

Then:

```bash
npx eas-cli@latest build --profile development-simulator --platform ios   # for the iOS simulator; no Apple account needed
npx eas-cli@latest build --profile development --platform android         # an APK to install on an Android phone
npx eas-cli@latest build --profile development --platform ios             # for an iPhone: needs the Apple Developer Program,
                                                                          # and the phone registered with `eas device:create`
```

A development build loads the JavaScript from `npm start` on the computer, on the same network.

- Screens are in `src/app/` (Expo Router: one file per screen); components in `src/components/`.
- Add packages with `npx expo install <package>`, so their versions match the Expo SDK.
- The `ios/` and `android/` folders are generated and not kept in git; native settings go in
  `app.json`.
- The images in `assets/images/` (icon, splash, wordmark, backdrop) are drawn from the BatoX
  Installer's icon, the web panel's wordmark and the theme's sunset scene by
  `python3 tools/render-assets.py`, which reads those repositories from the same folder as this
  one and needs Google Chrome.

## License

[MIT](LICENSE). BatoX is an independent project, not affiliated with or endorsed by the Batocera
project.

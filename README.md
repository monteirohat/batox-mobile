# batox-mobile

BatoX for iOS and Android: install [BatoX](https://github.com/monteirohat/BatoX) on your Batocera
console and manage it from your phone. Built with Expo (React Native).

> **Status:** early work. The app has its look, its splash screen and its own SSH client: it already
> reaches a console and checks it, as the BatoX Installer's first step does. Choosing a version,
> installing and connecting to BatoX come next. It isn't in the App Store or Google Play yet.

## What it will do

1. **Install BatoX** on a Batocera console, as the
   [BatoX Installer](https://github.com/monteirohat/BatoX_Installer) does on a computer: type the
   console's address, sign in with its SSH login, pick a version. The console downloads BatoX from
   GitHub and installs it; the app shows the address and keeps the access token.
2. **Connect** to a console that already runs BatoX, with its address and token.
3. **Manage it**, bringing BatoX's features over one by one through its
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

CONSOLE=192.168.0.10 npx tsx tools/ssh-smoke.ts   # the SSH client against a real console, from a computer
```

The app has native code of its own (the TCP module), so it runs in a development build, not in
Expo Go. On a Mac whose default Java doesn't run, point `JAVA_HOME` at Android Studio's
(`/Applications/Android Studio.app/Contents/jbr/Contents/Home`).

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

# batox-mobile

BatoX for iOS and Android: install [BatoX](https://github.com/monteirohat/BatoX) on your Batocera
console and manage it from your phone. Built with Expo (React Native).

> **Status:** early work. The app has its look, its splash screen and its first screens; installing
> over SSH and connecting to BatoX come next. It isn't in the App Store or Google Play yet.

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

## Development

Needs Node 22 or newer. Expo's own guidance for this project is in [AGENTS.md](AGENTS.md).

```bash
npm install
npm start            # Expo dev server: scan the QR code with Expo Go, or press i / a for a simulator
npm run typecheck
npm run lint
npm run doctor       # expo-doctor: dependency and config checks
```

- Screens are in `src/app/` (Expo Router: one file per screen); components in `src/components/`.
- Add packages with `npx expo install <package>`, so their versions match the Expo SDK.
- The `ios/` and `android/` folders are generated and not kept in git; native settings go in
  `app.json`.
- The images in `assets/images/` (icon, splash, wordmark, backdrop) are drawn from the BatoX
  Installer's icon, the web panel's wordmark and the theme's sunset scene by
  `python3 tools/render-assets.py`, which reads those repositories from the same folder as this
  one and needs Google Chrome.

Installing over SSH will need a native module, so from then on the app runs in a development build
(`npx expo run:ios` or `npx expo run:android`) instead of Expo Go.

## License

[MIT](LICENSE). BatoX is an independent project, not affiliated with or endorsed by the Batocera
project.

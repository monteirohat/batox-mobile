This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## BatoX

This app is BatoX's mobile companion. Related projects, side by side in the same workspace:

- `BatoX`: the web app and API that run on the console. Its API is documented in `docs/api.md`
  (token in `Authorization: Bearer <token>`; plain HTTP on the local network).
- `BatoX_Installer`: the desktop installer. `src/main/installer.ts` holds the SSH steps that this
  app repeats (inspect the console, install the service, start it, read the token); here the
  console downloads the release itself instead of the computer uploading it.
- `batox-theme`: the look's source, in `docs/STYLE.md`.

SSH: the app has its own client in `src/ssh/` (TypeScript on @noble crypto) over the native TCP
module in `modules/batox-tcp/` (Kotlin and Swift, no third-party libraries). Test protocol changes
against a real console with `tools/ssh-smoke.ts` before building the app.

Rules for this repository:

- Use the tokens in `src/theme/tokens.ts`; never write a color, size or font in a screen.
- The app is dark only (`userInterfaceStyle: "dark"`): flat surfaces, square corners, no shadows.
- The images in `assets/images/` are drawn by `tools/render-assets.py` from the other projects'
  sources; regenerate them with it rather than editing them by hand.

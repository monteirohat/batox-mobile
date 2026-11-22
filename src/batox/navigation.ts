import { router } from 'expo-router';

import { consoleId } from './consoles';

// Opens a console as the only screen: going back from it leaves the app instead of returning to the
// list, the installer or another console
export function openConsole(console: { host: string; port: number }): void {
  if (router.canDismiss()) router.dismissAll();
  router.replace({ pathname: '/console/[id]', params: { id: consoleId(console) } });
}

// Back to the welcome, when the phone no longer knows any console
export function openWelcome(): void {
  if (router.canDismiss()) router.dismissAll();
  router.replace('/');
}

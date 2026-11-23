// The app is locked upright ("orientation": "portrait" in app.json), which makes Android infer that
// it needs a screen that can be held upright. Google Play then hides it from devices that only run
// sideways (some Chromebooks, desktops, XR headsets). This says the feature is optional: the app
// still opens upright wherever it can.
const { withAndroidManifest } = require('expo/config-plugins');

const FEATURE = 'android.hardware.screen.portrait';

module.exports = function withOptionalPortrait(config) {
  return withAndroidManifest(config, (c) => {
    const manifest = c.modResults.manifest;
    const features = (manifest['uses-feature'] ??= []);
    const existing = features.find((f) => f.$['android:name'] === FEATURE);
    if (existing) existing.$['android:required'] = 'false';
    else features.push({ $: { 'android:name': FEATURE, 'android:required': 'false' } });
    return c;
  });
};

import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { HostKeyChangedError, inspectConsole, type ConsoleInfo } from '@/batox/console';
import { knownHostKey, saveConsole } from '@/batox/consoles';
import { openConsole } from '@/batox/navigation';
import { listReleases, type Release } from '@/batox/github';
import { STEPS, install, type InstallResult } from '@/batox/install';
import { Backdrop } from '@/components/backdrop';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Plate } from '@/components/plate';
import { Steps, applyProgress, type StepView } from '@/components/steps';
import { openNativeSocket } from '@/ssh/native-socket';
import { page } from '@/theme/page';
import { colors, fonts, space, type } from '@/theme/tokens';

type Phase = 'setup' | 'installing' | 'done' | 'failed';

const freshSteps = (): StepView[] => STEPS.map((s) => ({ ...s, state: 'pending' }));

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

// Installs or updates BatoX: the console and its SSH login, the version, then the steps, as the
// BatoX Installer does on a computer
export default function Install() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [host, setHost] = useState('batocera.local');
  const [username, setUsername] = useState('root');
  const [password, setPassword] = useState('linux');
  const [checking, setChecking] = useState(false);
  const [info, setInfo] = useState<ConsoleInfo | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  // The console answered with another SSH key than the one saved for its address
  const [keyChange, setKeyChange] = useState<HostKeyChangedError | null>(null);
  // Whether the key seen is the one this phone already had
  const [keyKnown, setKeyKnown] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [releases, setReleases] = useState<Release[] | null>(null);
  const [releasesError, setReleasesError] = useState<string | null>(null);
  const [release, setRelease] = useState<Release | null>(null);
  const [choosing, setChoosing] = useState(false);

  const [steps, setSteps] = useState<StepView[]>(freshSteps);
  const [result, setResult] = useState<InstallResult | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const fetchReleases = () =>
    listReleases()
      .then((list) => {
        setReleases(list);
        setRelease((current) => current ?? list.find((r) => !r.prerelease) ?? list[0] ?? null);
      })
      .catch((e: Error) => setReleasesError(e.message));
  useEffect(() => {
    fetchReleases();
  }, []);
  const retryReleases = () => {
    setReleasesError(null);
    fetchReleases();
  };

  const target = { host, username, password };

  // The password goes only to a console with the key this phone saw before, if it saw one;
  // trusted is a new key the user accepted
  const check = async (trusted?: string) => {
    setChecking(true);
    setCheckError(null);
    setKeyChange(null);
    setInfo(null);
    try {
      const known = trusted ?? (await knownHostKey(host));
      setInfo(await inspectConsole(target, openNativeSocket, known));
      setKeyKnown(Boolean(known) && !trusted);
    } catch (e) {
      if (e instanceof HostKeyChangedError) setKeyChange(e);
      else setCheckError(e instanceof Error ? e.message : String(e));
    } finally {
      setChecking(false);
    }
  };

  const start = async () => {
    if (!info || !release) return;
    setPhase('installing');
    setSteps(freshSteps());
    setInstallError(null);
    setSaveError(null);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const done = await install({
        target,
        release,
        openSocket: openNativeSocket,
        hostKey: info.hostKey,
        signal: controller.signal,
        report: (p) => setSteps((current) => applyProgress(current, p)),
      });
      if (done.token) {
        await saveConsole({ host: done.host, port: done.port, token: done.token, name: info.model || done.host, version: done.version, hostKey: info.hostKey }).catch((e: unknown) =>
          setSaveError(`This phone couldn't keep the console (${e instanceof Error ? e.message : String(e)}). Copy the token and connect with it.`),
        );
      }
      setResult(done);
      setPhase('done');
    } catch (e) {
      setInstallError(e instanceof Error ? e.message : String(e));
      setPhase('failed');
    } finally {
      abort.current = null;
    }
  };

  const copyToken = async () => {
    if (!result?.token) return;
    await Clipboard.setStringAsync(result.token);
    setCopied(true);
  };

  const action = !release
    ? null
    : info?.installedVersion === release.tag
      ? { label: `Reinstall ${release.tag}`, hint: 'This version is already installed. Reinstalling keeps your token, settings and catalog.' }
      : info?.installedVersion
        ? { label: `Update to ${release.tag}`, hint: `Replaces ${info.installedVersion}. Your token, settings and catalog are kept.` }
        : { label: `Install ${release.tag}`, hint: 'The console downloads BatoX from GitHub, so it needs an internet connection.' };

  if (phase === 'installing' || phase === 'failed') {
    return (
      <Backdrop>
        <ScrollView style={page.scroller} contentContainerStyle={[styles.scroll, page.content]}>
          <Plate label={phase === 'failed' ? 'Installation stopped' : `Installing ${release?.tag ?? ''}`}>
            <Steps steps={steps} />
          </Plate>
          {phase === 'failed' && installError ? (
            <Plate tone="error">
              <Text style={[type.body, styles.strong]}>{installError}</Text>
            </Plate>
          ) : null}
          <View style={styles.actions}>
            {phase === 'installing' ? (
              <Button label="Cancel" onPress={() => abort.current?.abort()} />
            ) : (
              <>
                <Button primary label="Try again" onPress={start} />
                <Button label="Back" onPress={() => setPhase('setup')} />
              </>
            )}
          </View>
        </ScrollView>
      </Backdrop>
    );
  }

  if (phase === 'done' && result) {
    const updated = result.updatedFrom && result.updatedFrom !== result.version;
    return (
      <Backdrop>
        <ScrollView style={page.scroller} contentContainerStyle={[styles.scroll, page.content]}>
          <Plate>
            <Text style={styles.check}>✓</Text>
            <Text style={type.title}>{updated ? `BatoX was updated to ${result.version}` : `BatoX ${result.version} is installed`}</Text>
            <Text style={type.body}>{result.console.model || result.host} is ready. Open BatoX from any browser on your network.</Text>
          </Plate>
          <Plate label="Address">
            <Text style={styles.mono}>{result.url}</Text>
            <Button primary label="Open BatoX" onPress={() => Linking.openURL(result.url)} />
          </Plate>
          <Plate label="API token">
            <Text style={styles.mono} selectable>
              {result.token ?? 'Set in config.json on the console'}
            </Text>
            <Button label={copied ? 'Copied' : 'Copy token'} onPress={copyToken} disabled={!result.token} />
            {result.token && !saveError ? <Text style={styles.note}>Kept on this phone, in its secure storage.</Text> : null}
            {saveError ? <Text style={[type.body, styles.strong]}>{saveError}</Text> : null}
          </Plate>
          <View style={styles.actions}>
            <Button label="Done" onPress={() => (result.token && !saveError ? openConsole(result) : router.back())} />
          </View>
        </ScrollView>
      </Backdrop>
    );
  }

  return (
    <Backdrop>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={page.scroller} contentContainerStyle={[styles.scroll, page.content]} keyboardShouldPersistTaps="handled">
          <Plate>
            <Text style={type.title}>Your console</Text>
            <Text style={type.body}>Find its address on the console in Main menu &gt; Network settings.</Text>
            <Field label="Batocera address" value={host} onChangeText={setHost} placeholder="batocera.local or 192.168.0.10" keyboardType="url" editable={!checking} />
            <Field label="SSH user" value={username} onChangeText={setUsername} editable={!checking} />
            <Field label="SSH password" value={password} onChangeText={setPassword} secureTextEntry editable={!checking} />
            <Button primary={!info} label={checking ? 'Checking…' : info ? 'Check again' : 'Check console'} onPress={() => void check()} disabled={checking || !host.trim()} />
            {checking ? <ActivityIndicator color={colors.ink} /> : null}
          </Plate>

          {checkError ? (
            <Plate label="Couldn't check the console" tone="error">
              <Text style={[type.body, styles.strong]}>{checkError}</Text>
            </Plate>
          ) : null}

          {keyChange ? (
            <Plate label="The console's SSH key changed" tone="error">
              <Text style={[type.body, styles.strong]}>
                {host.trim()} answered with another SSH key than the one this phone saw before, so the password wasn&apos;t sent.
              </Text>
              <Text style={type.body}>
                This is expected after Batocera is reinstalled or the console is replaced. If neither happened, another machine may be answering at this address: don&apos;t go on.
              </Text>
              <Text style={styles.key}>Before: {keyChange.known}</Text>
              <Text style={styles.key}>Now: {keyChange.seen}</Text>
              <Button label="Trust the new key and check again" onPress={() => void check(keyChange.seen)} />
            </Plate>
          ) : null}

          {info ? (
            <Plate label="Console">
              <Text style={styles.name}>{info.model || info.host}</Text>
              <Text style={type.body}>
                Batocera {info.batoceraVersion.split(' ')[0]}, {info.arch === 'arm64' ? 'ARM 64-bit' : 'x86 64-bit'}
              </Text>
              <Text style={[styles.badge, info.installedVersion ? styles.installed : styles.notInstalled]}>
                {info.installedVersion ? `BatoX ${info.installedVersion} installed` : 'BatoX not installed'}
              </Text>
              <Text style={styles.key}>
                SSH key {info.hostKey}
                {keyKnown ? ', the one this phone saw before' : ', seen for the first time by this phone'}
              </Text>
            </Plate>
          ) : null}

          {info ? (
            <Plate label="Version">
              {releasesError ? (
                <>
                  <Text style={[type.body, styles.strong]}>{releasesError}</Text>
                  <Button label="Try again" onPress={retryReleases} />
                </>
              ) : !releases ? (
                <ActivityIndicator color={colors.ink} />
              ) : (
                <>
                  <Text style={styles.name}>{release?.tag ?? '—'}</Text>
                  <Text style={type.body}>
                    {release === releases.find((r) => !r.prerelease) ? 'Latest release' : release?.prerelease ? 'Pre-release' : 'Release'}
                    {release?.publishedAt ? `, ${formatDate(release.publishedAt)}` : ''}
                  </Text>
                  <Pressable onPress={() => setChoosing((v) => !v)} accessibilityRole="button">
                    <Text style={styles.link}>{choosing ? 'Done choosing' : 'Choose another version'}</Text>
                  </Pressable>
                  {choosing
                    ? releases.slice(0, 12).map((r) => (
                        <Pressable
                          key={r.tag}
                          onPress={() => {
                            setRelease(r);
                            setChoosing(false);
                          }}
                          style={[styles.option, r.tag === release?.tag && styles.optionSelected]}>
                          <Text style={styles.optionText}>{r.tag}</Text>
                          <Text style={styles.optionDate}>{r.prerelease ? 'Pre-release' : formatDate(r.publishedAt)}</Text>
                        </Pressable>
                      ))
                    : null}
                </>
              )}
            </Plate>
          ) : null}

          {info && action ? (
            <View style={styles.actions}>
              <Button primary label={action.label} onPress={start} />
              <Text style={[styles.note, styles.center]}>{action.hint}</Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingTop: 72, paddingBottom: space.xl, gap: 5 },
  strong: { color: colors.ink },
  name: { fontFamily: fonts.light, fontSize: 24, color: colors.ink },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, fontFamily: fonts.regular, fontSize: 14 },
  installed: { color: colors.ok, backgroundColor: 'rgba(77, 217, 139, 0.16)' },
  notInstalled: { color: colors.ink2, backgroundColor: colors.surface2 },
  link: { fontFamily: fonts.regular, fontSize: 15, color: colors.link },
  option: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.surface2 },
  optionSelected: { backgroundColor: colors.selected, borderWidth: 2, borderColor: colors.frame },
  optionText: { fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
  optionDate: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink2 },
  actions: { gap: space.s, marginTop: space.m },
  note: { fontFamily: fonts.regular, fontSize: 13, color: colors.ink2 },
  center: { textAlign: 'center' },
  check: { fontFamily: fonts.light, fontSize: 40, color: colors.ok },
  key: { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 12, lineHeight: 17, color: colors.ink2 },
  mono: { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 15, color: colors.ink },
});

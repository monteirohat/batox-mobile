import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { getBatoceraSettings, getSystems, setBatoceraSetting, type BatoceraSettings } from './api';
import type { SavedConsole } from './consoles';

// Systems' full names, for the per-system categories, read once per console
const names = new Map<string, Record<string, string>>();

// batocera.conf, read each time the screen comes into view, and a save that updates it in place
export function useBatocera(saved: SavedConsole | null | undefined) {
  const where = saved ? `${saved.host}:${saved.port}` : '';
  const [data, setData] = useState<BatoceraSettings | null>(null);
  const [systems, setSystems] = useState<Record<string, string>>(() => names.get(where) ?? {});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!saved) return;
    try {
      const known = names.get(where);
      const [conf, list] = await Promise.all([getBatoceraSettings(saved), known ? Promise.resolve(null) : getSystems(saved).catch(() => [])]);
      if (list) {
        const map = Object.fromEntries(list.map((s) => [s.name, s.fullName || s.name]));
        names.set(where, map);
        setSystems(map);
      }
      setData(conf);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [saved, where]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const save = useCallback(
    async (key: string, value: string): Promise<boolean> => {
      if (!saved) return false;
      try {
        await setBatoceraSetting(saved, key, value);
        let found = false;
        setData((d) => {
          if (!d) return d;
          const categories = d.categories.map((c) => ({
            ...c,
            settings: c.settings.map((s) => {
              if (s.key !== key) return s;
              found = true;
              return { ...s, value, active: true };
            }),
          }));
          return { ...d, categories };
        });
        // A new key: read the file again to place it in its category
        if (!found) await load();
        return true;
      } catch (e) {
        Alert.alert(`Couldn't save ${key}`, e instanceof Error ? e.message : String(e));
        await load();
        return false;
      }
    },
    [saved, load],
  );

  return { data, systems, error, load, save };
}

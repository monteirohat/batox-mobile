import { useEffect, useState } from 'react';

import { getConsole, type SavedConsole } from './consoles';

// The saved console a screen works on: undefined while it loads, null when the phone doesn't know it
export function useSavedConsole(id: string): SavedConsole | null | undefined {
  const [saved, setSaved] = useState<SavedConsole | null | undefined>(undefined);
  useEffect(() => {
    getConsole(id).then(setSaved);
  }, [id]);
  return saved;
}

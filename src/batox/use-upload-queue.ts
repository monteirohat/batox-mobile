import { useCallback, useRef, useState } from 'react';

import type { Endpoint } from './api';
import { uploadFile, type LocalFile } from './upload';

export type QueueState = 'waiting' | 'uploading' | 'done' | 'skipped' | 'error';

export type QueueItem = LocalFile & {
  key: string;
  // Where it goes ("/roms?system=gba"); none for a file refused before sending
  path?: string;
  state: QueueState;
  percent?: number;
  message?: string;
};

let counter = 0;

// Files to upload, sent one at a time, each with its state. Adding files starts the queue.
export function useUploadQueue(endpoint: Endpoint | null | undefined, onUploaded?: () => void) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const queue = useRef<QueueItem[]>([]);
  const running = useRef(false);
  const abort = useRef<AbortController | null>(null);

  const update = useCallback((key: string, change: Partial<QueueItem>) => {
    queue.current = queue.current.map((item) => (item.key === key ? { ...item, ...change } : item));
    setItems(queue.current);
  }, []);

  const run = useCallback(async () => {
    if (running.current || !endpoint) return;
    running.current = true;
    let uploaded = 0;
    try {
      for (;;) {
        const next = queue.current.find((item) => item.state === 'waiting');
        if (!next || !next.path) break;
        update(next.key, { state: 'uploading', percent: 0 });
        abort.current = new AbortController();
        try {
          await uploadFile(endpoint, next.path, next, (sent, total) => update(next.key, { percent: Math.round((sent / total) * 100) }), abort.current.signal);
          update(next.key, { state: 'done', percent: 100, message: 'Sent' });
          uploaded++;
        } catch (e) {
          const status = (e as { status?: number }).status;
          update(next.key, { state: status === 409 ? 'skipped' : 'error', message: e instanceof Error ? e.message : String(e) });
          if (abort.current.signal.aborted) {
            for (const item of queue.current) if (item.state === 'waiting') update(item.key, { state: 'skipped', message: 'Cancelled.' });
          }
        }
      }
    } finally {
      running.current = false;
      abort.current = null;
      if (uploaded > 0) onUploaded?.();
    }
  }, [endpoint, update, onUploaded]);

  // Adds files: each with the path it goes to, or refused with a reason
  const add = useCallback(
    (files: (LocalFile & { path?: string; refused?: string })[]) => {
      const added: QueueItem[] = files.map((f) => ({
        ...f,
        key: `${++counter}`,
        state: f.refused ? 'skipped' : 'waiting',
        message: f.refused,
      }));
      queue.current = [...queue.current, ...added];
      setItems(queue.current);
      void run();
    },
    [run],
  );

  const cancel = useCallback(() => abort.current?.abort(), []);

  const clear = useCallback(() => {
    queue.current = queue.current.filter((item) => item.state === 'waiting' || item.state === 'uploading');
    setItems(queue.current);
  }, []);

  const busy = items.some((item) => item.state === 'waiting' || item.state === 'uploading');
  return { items, add, cancel, clear, busy };
}

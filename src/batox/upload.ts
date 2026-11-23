// Uploads a file to BatoX (multipart, in the "file" field) with its progress. XMLHttpRequest, since
// fetch in React Native doesn't report upload progress. The file is read from its URI by the
// platform's networking, so a large ROM isn't loaded into JavaScript.

import { urlHost } from './address';
import { ApiError, type Endpoint } from './api';

export type LocalFile = { uri: string; name: string; size?: number; mimeType?: string };

// A file name as an RFC 5987 extended value: percent-encoded UTF-8 with only attr-chars left as
// they are. encodeURIComponent leaves ! ' ( ) * as they are; they must be encoded too.
export function encodeExtValue(name: string): string {
  return encodeURIComponent(name).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

type Part = { name?: string; fieldName: string; headers: Record<string, string> };

// React Native's FormData writes a file's name as filename="<percent-encoded>", which servers keep
// literally ("Golden%20Sun.gba"); Android's HTTP stack can't take raw UTF-8 in a header either.
// This one sends filename*=UTF-8''... (RFC 5987, RFC 7578), which BatoX (Go's mime package)
// decodes to the real name, accents and all.
class NamedFormData extends FormData {
  getParts(): Part[] {
    const parts = (FormData.prototype as unknown as { getParts(this: FormData): Part[] }).getParts.call(this);
    return parts.map((part) =>
      typeof part.name === 'string'
        ? { ...part, headers: { ...part.headers, 'content-disposition': `form-data; name="${part.fieldName}"; filename*=UTF-8''${encodeExtValue(part.name)}` } }
        : part,
    );
  }
}

const STALL_MS = 60_000;
const ANSWER_MS = 120_000;

export function uploadFile<T>(
  endpoint: Endpoint,
  path: string,
  file: LocalFile,
  onProgress: (sent: number, total: number) => void,
  signal?: AbortSignal,
): Promise<T> {
  const where = `${urlHost(endpoint.host)}:${endpoint.port}`;
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    // Gives up when nothing moves for a while: no bytes leave the phone, or BatoX doesn't answer
    // once the whole file is there (it may still be checking or unpacking it)
    let stalled = '';
    let timer: ReturnType<typeof setTimeout> | undefined;
    const watch = (ms: number, why: string) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        stalled = why;
        xhr.abort();
      }, ms);
    };
    const settle = () => clearTimeout(timer);
    xhr.open('POST', `http://${where}/api/v1${path}`);
    if (endpoint.token) xhr.setRequestHeader('Authorization', `Bearer ${endpoint.token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded, event.total);
      // React Native reports the upload's progress but not always its end: the last byte counts as it
      if (event.lengthComputable && event.loaded >= event.total) waitAnswer();
      else watch(STALL_MS, `The upload stopped: nothing reached BatoX at ${where} for ${STALL_MS / 1000} seconds.`);
    };
    const waitAnswer = () => watch(ANSWER_MS, `The file was sent, but BatoX at ${where} didn't answer within ${ANSWER_MS / 60000} minutes.`);
    xhr.upload.onload = waitAnswer;
    xhr.onload = () => {
      settle();
      let body: { error?: string } | undefined;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // not JSON
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as T);
        return;
      }
      const reason = body?.error ? String(body.error) : '';
      reject(
        new ApiError(
          xhr.status === 401
            ? 'BatoX refused the token.'
            : xhr.status === 413
              ? 'The file is larger than BatoX accepts (maxUploadMB in its config.json).'
              : reason
                ? reason.charAt(0).toUpperCase() + reason.slice(1)
                : `BatoX returned an error (HTTP ${xhr.status}).`,
          xhr.status,
        ),
      );
    };
    xhr.onerror = () => {
      settle();
      reject(new ApiError(`Couldn't reach BatoX at ${where}.`));
    };
    xhr.onabort = () => {
      settle();
      reject(new ApiError(stalled || 'Cancelled.'));
    };
    if (signal?.aborted) {
      reject(new ApiError('Cancelled.'));
      return;
    }
    signal?.addEventListener('abort', () => xhr.abort());
    watch(STALL_MS, `The upload didn't start: BatoX at ${where} took nothing for ${STALL_MS / 1000} seconds.`);

    const form = new NamedFormData();
    // React Native's FormData takes a file as { uri, name, type }
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' } as unknown as Blob);
    xhr.send(form);
  });
}

// Whether a file name ends with one of the extensions (".gba", ".zip"...), ignoring case
export function hasExtension(name: string, extensions: string[]): boolean {
  const n = name.toLowerCase();
  return extensions.some((e) => n.length > e.length && n.endsWith(e.toLowerCase()));
}

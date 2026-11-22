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
    xhr.open('POST', `http://${where}/api/v1${path}`);
    if (endpoint.token) xhr.setRequestHeader('Authorization', `Bearer ${endpoint.token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded, event.total);
    };
    xhr.onload = () => {
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
    xhr.onerror = () => reject(new ApiError(`Couldn't reach BatoX at ${where}.`));
    xhr.onabort = () => reject(new ApiError('Cancelled.'));
    signal?.addEventListener('abort', () => xhr.abort());

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

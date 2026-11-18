import type { Asset, Component, Page, Project, SiteSettings } from '@vystara/core';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', 'x-vystara': '1' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Fout ${res.status}`);
  return data as T;
}

export const api = {
  get: <T>(url: string) => req<T>('GET', url),
  post: <T>(url: string, body?: unknown) => req<T>('POST', url, body ?? {}),
  put: <T>(url: string, body: unknown) => req<T>('PUT', url, body),
  patch: <T>(url: string, body: unknown) => req<T>('PATCH', url, body),
  del: <T>(url: string) => req<T>('DELETE', url),
};

export interface Bootstrap {
  site: SiteSettings;
  pages: (Page & { sort: number })[];
  projects: Project[];
  components: Component[];
  assets: Asset[];
}

const CHUNK = 32 * 1024 * 1024; // ruim onder de 100 MB-limiet van Cloudflare

/** Uploadt in stukken; `onProgress` krijgt 0..1. */
export async function uploadFile(file: File, onProgress?: (p: number) => void): Promise<Asset> {
  const { uploadId } = await api.post<{ uploadId: string }>('/api/uploads');
  for (let offset = 0; offset < file.size || offset === 0; offset += CHUNK) {
    const res = await fetch(`/api/uploads/${uploadId}`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'x-vystara': '1', 'content-type': 'application/octet-stream' },
      body: file.slice(offset, offset + CHUNK),
    });
    if (!res.ok) throw new ApiError(res.status, (await res.json().catch(() => ({}))).error ?? 'Upload mislukt');
    onProgress?.(Math.min(1, (offset + CHUNK) / Math.max(1, file.size)));
    if (file.size === 0) break;
  }
  return api.post<Asset>(`/api/uploads/${uploadId}/complete`, { name: file.name });
}

// Preconfigured storage helpers for Manus WebDev templates
// Uses the Biz-provided storage proxy (Authorization: Bearer <token>)
// Local fallback: when the Forge storage proxy is not configured, files are
// written to ./uploads and served by the express static route at /uploads.

import { ENV } from './_core/env';
import { promises as fs } from 'fs';
import path from 'path';

// Local-disk storage is used whenever the Forge storage proxy URL/key is absent.
const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

function useLocalStorage(): boolean {
  // Only the Manus Forge proxy provides a storage endpoint. When the Forge URL
  // is unset or repurposed for another provider (e.g. Gemini for the LLM),
  // fall back to local disk.
  return !(ENV.forgeApiUrl || "").includes("manus");
}

async function localPut(
  relKey: string,
  data: Buffer | Uint8Array | string
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const dest = path.resolve(LOCAL_UPLOAD_DIR, key);
  // Defense in depth: never write outside the uploads root.
  if (dest !== LOCAL_UPLOAD_DIR && !dest.startsWith(LOCAL_UPLOAD_DIR + path.sep)) {
    throw new Error("Invalid storage key (path traversal blocked)");
  }
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const buffer =
    typeof data === 'string' ? Buffer.from(data) : Buffer.from(data as Uint8Array);
  await fs.writeFile(dest, buffer);
  return { key, url: `/uploads/${key}` };
}

type StorageConfig = { baseUrl: string; apiKey: string };

function getStorageConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Storage download URL failed (${response.status}): ${message}`);
  }
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  // Drop leading slashes, backslashes, and any "." / ".." segments so a
  // user-supplied filename can't traverse out of the storage root.
  return relKey
    .replace(/\\/g, "/")
    .split("/")
    .filter(seg => seg && seg !== "." && seg !== "..")
    .join("/");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  if (useLocalStorage()) {
    return localPut(relKey, data);
  }
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  if (useLocalStorage()) {
    const key = normalizeKey(relKey);
    return { key, url: `/uploads/${key}` };
  }
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey),
  };
}

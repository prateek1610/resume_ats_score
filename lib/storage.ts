type StoredObject = {
  body: ReadableStream;
  httpEtag: string;
  httpMetadata?: { contentType?: string };
};

type ResumeBucket = {
  put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }): Promise<unknown>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
};

export async function getResumeBucket() {
  const { env } = await import("cloudflare:workers");
  const bucket = (env as unknown as { BUCKET?: ResumeBucket }).BUCKET;
  if (!bucket) throw new Error("Resume storage is unavailable.");
  return bucket;
}

export async function ownerStoragePrefix(email: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email.toLowerCase()));
  return [...new Uint8Array(digest)].slice(0, 12).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

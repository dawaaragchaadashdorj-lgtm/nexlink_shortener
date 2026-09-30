import { createHash, timingSafeEqual } from "node:crypto";

export function publicOrigin(request: Request) {
  return new URL(process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL || request.url).origin;
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === publicOrigin(request);
}

export function canCreateLink(request: Request) {
  const expected = process.env.CREATE_ACCESS_TOKEN;
  if (!expected) return process.env.NODE_ENV !== "production";
  const supplied = request.headers.get("authorization") || "";
  const hash = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(hash(supplied), hash("Bearer " + expected));
}

// Global bounds for this single-instance deployment; no spoofable IP header is trusted.
const attempts = new Map<string, { count: number; resetsAt: number }>();
export function allowAttempt(key: string, limit: number, now = Date.now()) {
  for (const [name, value] of attempts) if (value.resetsAt <= now) attempts.delete(name);
  let entry = attempts.get(key);
  if (!entry) {
    if (attempts.size >= 4096) return false;
    entry = { count: 0, resetsAt: now + 60_000 };
    attempts.set(key, entry);
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

export async function readLimitedBody(request: Request, maxBytes: number) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally {
    reader.releaseLock();
  }
}

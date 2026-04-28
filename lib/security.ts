import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

export function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function signValue(value: string, secret: string) {
  const sig = createHmac("sha256", secret).update(value).digest("hex");
  return `${value}.${sig}`;
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("hex");
}

export function secureEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

export function verifySignedValue(raw: string, secret: string): { valid: true; value: string } | { valid: false } {
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) {
    return { valid: false };
  }
  const value = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(value).digest("hex");
  if (!secureEqual(sig, expected)) {
    return { valid: false };
  }
  return { valid: true, value };
}

export function createDownloadToken(path: string, expires: number, secret: string) {
  return createHmac("sha256", secret).update(`${path}:${expires}`).digest("hex");
}

export function verifyDownloadToken(path: string, expires: number, token: string, secret: string) {
  if (!Number.isFinite(expires) || expires < Date.now()) {
    return false;
  }
  const expected = createDownloadToken(path, expires, secret);
  return secureEqual(expected, token);
}

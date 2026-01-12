export const AUTH_COOKIE_NAME = "chalo_auth";

// Access env vars via functions to ensure they're read at runtime,
// not captured at build time (critical for Edge Runtime in middleware).
function getAuthUsername() {
  return process.env.AUTH_USERNAME;
}
function getAuthPassword() {
  return process.env.AUTH_PASSWORD;
}
function getAuthSecret() {
  return process.env.AUTH_SECRET;
}

const encoder = new TextEncoder();

function toBase64(bytes: ArrayBuffer) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  const view = new Uint8Array(bytes);
  for (let i = 0; i < view.length; i += 1) {
    binary += String.fromCharCode(view[i]);
  }
  return btoa(binary);
}

function base64UrlEncode(bytes: ArrayBuffer) {
  return toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlEncodeString(value: string) {
  return base64UrlEncode(encoder.encode(value).buffer);
}

async function hmacSha256(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return base64UrlEncode(signature);
}

export function isAuthEnabled() {
  return Boolean(getAuthUsername() && getAuthPassword() && getAuthSecret());
}

export async function verifyCredentials(username: string, password: string) {
  return isAuthEnabled() && username === getAuthUsername() && password === getAuthPassword();
}

export async function createAuthCookie(username: string) {
  if (!isAuthEnabled()) {
    throw new Error("Auth is not configured.");
  }
  const payload = base64UrlEncodeString(username);
  const signature = await hmacSha256(getAuthSecret() as string, payload);
  return `${payload}.${signature}`;
}

export async function verifyAuthCookie(value: string | undefined | null) {
  if (!isAuthEnabled() || !value) {
    return false;
  }

  const separatorIndex = value.indexOf(".");
  if (separatorIndex === -1) {
    return false;
  }

  const payload = value.slice(0, separatorIndex);
  const signature = value.slice(separatorIndex + 1);
  if (!payload || !signature) {
    return false;
  }

  const expected = await hmacSha256(getAuthSecret() as string, payload);
  return expected === signature;
}

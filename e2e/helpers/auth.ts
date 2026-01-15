import fs from "node:fs/promises";
import path from "node:path";
import { expect, type Page } from "playwright/test";

type E2ECreds = { username: string; password: string };

async function readEnvLocalCreds(): Promise<E2ECreds | null> {
  const envPath = path.join(process.cwd(), ".env.local");
  let raw: string;
  try {
    raw = await fs.readFile(envPath, "utf8");
  } catch {
    return null;
  }

  let username: string | null = null;
  let password: string | null = null;

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key === "AUTH_USERNAME") username = value;
    if (key === "AUTH_PASSWORD") password = value;
  }

  if (!username || !password) return null;
  return { username, password };
}

async function getCreds(): Promise<E2ECreds | null> {
  const username = process.env.E2E_AUTH_USERNAME ?? process.env.AUTH_USERNAME;
  const password = process.env.E2E_AUTH_PASSWORD ?? process.env.AUTH_PASSWORD;
  if (username && password) return { username, password };
  return readEnvLocalCreds();
}

export async function gotoAuthed(page: Page, appPath: string) {
  await page.goto(appPath, { waitUntil: "networkidle" });
  if (!page.url().includes("/login")) return;

  const creds = await getCreds();
  if (!creds) {
    throw new Error(
      "Auth is enabled but credentials were not found. Set E2E_AUTH_USERNAME/E2E_AUTH_PASSWORD or ensure .env.local contains AUTH_USERNAME/AUTH_PASSWORD.",
    );
  }

  await page.locator("#username").fill(creds.username);
  await page.locator("#password").fill(creds.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);

  // Some auth flows may drop the `next` param; explicitly navigate back to the
  // intended destination after the cookie is set.
  await page.goto(appPath, { waitUntil: "networkidle" });
  await expect(page).not.toHaveURL(/\/login/);
}

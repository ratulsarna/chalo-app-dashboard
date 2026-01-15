import { expect, test } from "playwright/test";
import { gotoAuthed } from "./helpers/auth";

function failOnHydrationMismatch(message: string) {
  if (message.includes("hydrated but some attributes of the server rendered HTML didn't match")) {
    throw new Error(`Hydration mismatch detected: ${message}`);
  }
  if (message.includes("Hydration failed because the initial UI does not match what was rendered on the server")) {
    throw new Error(`Hydration failed: ${message}`);
  }
}

test("docs home renders overview + features", async ({ page }) => {
  page.on("console", (msg) => failOnHydrationMismatch(msg.text()));

  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoAuthed(page, "/docs");

  await expect(page.getByRole("heading", { name: "Docs" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Features" })).toBeVisible();

  // A stable, known overview entry from the snapshot.
  await expect(page.getByRole("link", { name: "Tech Stack" }).first()).toBeVisible();

  // Sidebar content shouldn't be clipped under the overlay scrollbar.
  const sidebar = page.locator("aside").first();
  const badge = page.locator('aside [data-slot="badge"]').first();
  await expect(sidebar).toBeVisible();
  await expect(badge).toBeVisible();
  const sidebarBox = await sidebar.boundingBox();
  const badgeBox = await badge.boundingBox();
  expect(sidebarBox).not.toBeNull();
  expect(badgeBox).not.toBeNull();
  if (sidebarBox && badgeBox) {
    expect(badgeBox.x + badgeBox.width).toBeLessThanOrEqual(sidebarBox.x + sidebarBox.width - 2);
  }
});

test("overview doc renders markdown and TOC", async ({ page }) => {
  page.on("console", (msg) => failOnHydrationMismatch(msg.text()));

  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoAuthed(page, "/docs/overview/tech-stack");

  await expect(page.getByRole("heading", { name: "Tech Stack", exact: true }).first()).toBeVisible();
  await expect(page.getByText("On this page")).toBeVisible();
  await expect(page.getByRole("link", { name: "Core Technologies", exact: true })).toBeVisible();
});

test("feature HLD renders Mermaid diagrams", async ({ page }) => {
  page.on("console", (msg) => failOnHydrationMismatch(msg.text()));

  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoAuthed(page, "/docs/features/help/hld");

  await expect(page.getByRole("heading", { name: "Help — High-Level Design", exact: true })).toBeVisible();

  // Mermaid renders into an SVG; look for a graph structure element.
  const svg = page.locator('svg[id^="mmd-"]').first();
  await expect(svg).toBeVisible({ timeout: 30_000 });

  const style = (await svg.getAttribute("style")) ?? "";
  expect(style).toContain("max-width: none");
});

test("missing feature doc shows placeholder and available pages", async ({ page }) => {
  page.on("console", (msg) => failOnHydrationMismatch(msg.text()));

  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoAuthed(page, "/docs/features/mticket/components");

  await expect(page.getByText("This page isn’t written yet.")).toBeVisible();
  await expect(page.getByRole("link", { name: "High-level design", exact: true })).toBeVisible();
});

test("docs markdown styles: inline code + tables", async ({ page }) => {
  page.on("console", (msg) => failOnHydrationMismatch(msg.text()));

  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoAuthed(page, "/docs/overview/conventions");

  // Inline code should not render with typography's injected backticks.
  const inlineCode = page.locator("article code", { hasText: "FetchXxxUseCase" }).first();
  await expect(inlineCode).toBeVisible();

  const pseudo = await inlineCode.evaluate((el) => {
    const before = getComputedStyle(el, "::before").content;
    const after = getComputedStyle(el, "::after").content;
    return { before, after };
  });
  for (const value of [pseudo.before, pseudo.after]) {
    expect(["none", '""']).toContain(value);
  }

  // Tables should have padding so columns are readable (not squished plain text).
  const th = page.locator("article table thead th").first();
  await expect(th).toBeVisible();
  const paddingLeft = await th.evaluate((el) => getComputedStyle(el).paddingLeft);
  expect(paddingLeft).not.toBe("0px");
});

import { expect, test, type Page } from "playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

async function getScrollTop(page: Page) {
  return page.evaluate(() => {
    const el = document.scrollingElement;
    return el ? el.scrollTop : window.scrollY;
  });
}

test("wheel-zoom on inline diagram does not scroll page", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/analytics/flows/payment`, { waitUntil: "networkidle" });

  // Ensure the page can scroll so we can detect scroll chaining.
  await page.evaluate(() => window.scrollTo(0, 350));
  const before = await getScrollTop(page);

  const viewer = page.getByRole("application", { name: "Diagram viewer" }).first();
  const box = await viewer.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.move((box?.x ?? 0) + 100, (box?.y ?? 0) + 100);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(200);

  const after = await getScrollTop(page);
  expect(after).toBe(before);
});

test("wheel-zoom on expanded diagram does not scroll page", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/analytics/flows/payment`, { waitUntil: "networkidle" });

  await page.evaluate(() => window.scrollTo(0, 350));
  await page.getByRole("button", { name: "Expand" }).first().click();
  const dialog = page.getByRole("dialog").first();
  await expect(dialog).toBeVisible();
  const before = await getScrollTop(page);

  const expandedViewer = dialog.getByRole("application", { name: "Diagram viewer" }).first();
  const box = await expandedViewer.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.move((box?.x ?? 0) + 120, (box?.y ?? 0) + 120);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(200);

  const after = await getScrollTop(page);
  expect(after).toBe(before);
});

test("clicking a green node opens event sheet (best-effort)", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/analytics/flows/payment`, { waitUntil: "networkidle" });

  const viewer = page.getByRole("application", { name: "Diagram viewer" }).first();
  await expect(viewer).toBeVisible();

  // Click the first "event" node (green convention).
  const firstEventNode = viewer.locator("svg g.node.analytics-event-node").first();
  await expect(firstEventNode).toBeVisible();
  await firstEventNode.click({ force: true });

  await expect(page).toHaveURL(/\\?(.+&)?tab=events/);
  await expect(page.getByRole("button", { name: "Copy event name" }).first()).toBeVisible();
});

test("diagram selector switches diagrams", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/analytics/flows/search`, { waitUntil: "networkidle" });

  // Open selector dropdown.
  const selector = page.getByRole("button", { name: "Select diagram" }).first();
  await selector.click();

  const option = page.getByRole("menuitemradio", { name: /Stop-Based Trip Planner/i }).first();
  await expect(option).toBeVisible();
  await option.click();

  // The selector should now reflect the chosen diagram.
  await expect(page.locator('button[aria-label="Select diagram"]').first()).toContainText(/Stop-Based Trip Planner/i);
});

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
  await firstEventNode.scrollIntoViewIfNeeded();
  await firstEventNode.click();

  await expect(page).toHaveURL(/\/analytics\/flows\/payment(\?|$)/);
  expect(page.url()).not.toContain("/analytics/events");
  expect(page.url()).not.toContain("tab=events");

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

test("expand button stays within viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/analytics/flows/payment`, { waitUntil: "networkidle" });

  const expand = page.getByRole("button", { name: "Expand" }).first();
  await expect(expand).toBeVisible();

  const selector = page.getByRole("button", { name: "Select diagram" }).first();
  await expect(selector).toBeVisible();

  const box = await expand.boundingBox();
  expect(box).not.toBeNull();

  const selectorBox = await selector.boundingBox();
  expect(selectorBox).not.toBeNull();

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  const w = viewport?.width ?? 0;

  // Ensure the button isn't clipped or pushed outside the viewport (common regression when the selector grows).
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(w);

  // Ensure the expand button stays aligned with the selector row.
  expect(Math.abs((box?.y ?? 0) - (selectorBox?.y ?? 0))).toBeLessThanOrEqual(2);

  // Switch to a short selector label (visual key) and re-check alignment.
  await selector.click();
  await page.getByRole("menuitemradio", { name: /^Visual key/i }).first().click();
  await page.waitForTimeout(150);

  const expandBox2 = await expand.boundingBox();
  const selectorBox2 = await selector.boundingBox();
  expect(expandBox2).not.toBeNull();
  expect(selectorBox2).not.toBeNull();
  expect(Math.abs((expandBox2?.y ?? 0) - (selectorBox2?.y ?? 0))).toBeLessThanOrEqual(2);
});

test("global search returns event name matches for short queries", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/analytics/flows/payment`, { waitUntil: "networkidle" });

  await page.getByRole("button", { name: /Search flows and events/i }).click();

  const input = page.locator('[data-slot="command-input"]').first();
  await expect(input).toBeVisible();
  await input.fill("checkout");

  await expect(page.getByRole("group", { name: "Events" })).toBeVisible();
  await expect(page.getByRole("option", { name: /checkout post payment screen opened/i }).first()).toBeVisible();
});

test("zoom buttons and drag-pan update transform", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/analytics/flows/payment`, { waitUntil: "networkidle" });

  const viewer = page.getByRole("application", { name: "Diagram viewer" }).first();
  const host = viewer.locator('div[data-diagram-host="1"]').first();

  const before = await host.evaluate((el) => (el as HTMLElement).style.transform);

  await page.getByRole("button", { name: "Zoom in" }).first().click();
  await page.waitForTimeout(100);
  const afterZoom = await host.evaluate((el) => (el as HTMLElement).style.transform);
  expect(afterZoom).not.toBe(before);

  const box = await viewer.boundingBox();
  expect(box).not.toBeNull();
  const startX = (box?.x ?? 0) + (box?.width ?? 0) * 0.35;
  const startY = (box?.y ?? 0) + (box?.height ?? 0) * 0.6;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 140, startY + 60);
  await page.mouse.up();

  await page.waitForTimeout(100);
  const afterPan = await host.evaluate((el) => (el as HTMLElement).style.transform);
  expect(afterPan).not.toBe(afterZoom);
});

test("fit-to-screen does not over-zoom out (authentication flow)", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto(`${BASE_URL}/analytics/flows/authentication`, { waitUntil: "networkidle" });

  const viewer = page.getByRole("application", { name: "Diagram viewer" }).first();
  await expect(viewer).toBeVisible();

  await page.getByRole("button", { name: "Fit to screen" }).first().click();
  await page.waitForTimeout(150);

  const metrics = await viewer.evaluate((el) => {
    const container = el.getBoundingClientRect();
    const nodes = Array.from(el.querySelectorAll<SVGGraphicsElement>("svg g.node"));
    if (nodes.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of nodes) {
      const r = node.getBoundingClientRect();
      minX = Math.min(minX, r.left);
      minY = Math.min(minY, r.top);
      maxX = Math.max(maxX, r.right);
      maxY = Math.max(maxY, r.bottom);
    }

    const width = Math.max(0, maxX - minX);
    const height = Math.max(0, maxY - minY);
    const centerX = minX + width / 2;
    const centerY = minY + height / 2;

    return {
      width,
      height,
      centerX,
      centerY,
      containerLeft: container.left,
      containerTop: container.top,
      containerWidth: container.width,
      containerHeight: container.height,
      containerCenterX: container.left + container.width / 2,
      containerCenterY: container.top + container.height / 2,
    };
  });

  expect(metrics).not.toBeNull();
  const ratioW = (metrics?.width ?? 0) / (metrics?.containerWidth ?? 1);
  const ratioH = (metrics?.height ?? 0) / (metrics?.containerHeight ?? 1);

  // After "fit", the node cluster should not be tiny; either width or height should take up
  // a meaningful portion of the viewport.
  expect(Math.max(ratioW, ratioH)).toBeGreaterThan(0.22);

  // The fit should roughly center the node cluster (avoid top-anchored / off-screen fits).
  expect(Math.abs((metrics?.centerX ?? 0) - (metrics?.containerCenterX ?? 0))).toBeLessThan(
    (metrics?.containerWidth ?? 0) * 0.35,
  );
  expect(Math.abs((metrics?.centerY ?? 0) - (metrics?.containerCenterY ?? 0))).toBeLessThan(
    (metrics?.containerHeight ?? 0) * 0.4,
  );
});

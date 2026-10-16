import { test, expect, type Page } from "@playwright/test";

// Offline proof: prime twice (service worker takes control on the second
// load), kill the network, navigate again. Saved cards and passes must
// still open. Production build only, never the live site.
async function prime(page: Page, url: string) {
  await page.goto(url);
  await page.evaluate(() => navigator.serviceWorker?.ready.then(() => true).catch(() => false));
  await page.goto(url);
}

test("saved card opens with no network", async ({ page, context }) => {
  await prime(page, "/c/2-bedroom-flat-lekki-demo1");
  await expect(page.getByText(/fresh /i).first()).toBeVisible();
  await context.setOffline(true);
  await page.goto("/c/2-bedroom-flat-lekki-demo1");
  await expect(page.getByText(/fresh /i).first()).toBeVisible({ timeout: 15000 });
});

test("unknown pass explains itself with no network", async ({ page, context }) => {
  await prime(page, "/b/no-such-pass-xyz");
  await expect(page.getByText(/can't find this pass/i)).toBeVisible();
  await context.setOffline(true);
  await page.goto("/b/no-such-pass-xyz");
  await expect(page.getByText(/can't find this pass/i)).toBeVisible({ timeout: 15000 });
});

test("booking refuses honestly with no network", async ({ page, context }) => {
  // Use the gwarinpa card which has open slots — the form renders.
  await prime(page, "/c/3-bedroom-apartment-gwarinpa-demo1");
  await expect(page.getByRole("button", { name: /book my free viewing/i })).toBeVisible();
  await context.setOffline(true);
  await page.getByRole("button", { name: /book my free viewing/i }).click({ timeout: 15000 });
  await expect(page.getByText(/you're offline/i).first()).toBeVisible({ timeout: 15000 });
});

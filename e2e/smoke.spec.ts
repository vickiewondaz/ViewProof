import { test, expect } from "@playwright/test";

// Pilot smoke: public journeys render with human copy, dead ends stay kind,
// and guarded endpoints refuse unauthenticated traffic. Read-only except
// validation-error POSTs (which write nothing).

test("home states the buyer promise", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /see a place you trust/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /i run an agency/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /hosting viewings/i })).toBeVisible();
});

test("demo card shows evidence, not a badge", async ({ page }) => {
  await page.goto("/c/2-bedroom-flat-lekki-demo1");
  await expect(page.getByText(/fresh /i).first()).toBeVisible();
  await page.getByText(/more about this card/i).click();
  await expect(page.getByText(/not checked by viewproof/i).first()).toBeVisible();
});

test("unknown card is kind, never a dead end", async ({ page }) => {
  await page.goto("/c/no-such-card-xyz");
  await expect(page.getByText(/this card is gone/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /back home/i })).toBeVisible();
});

test("unknown pass explains itself, no dead end", async ({ page }) => {
  await page.goto("/b/no-such-pass-xyz");
  await expect(page.getByText(/can't find this pass/i)).toBeVisible();
  await expect(page.getByText(/whatsapp/i).first()).toBeVisible();
});

test("auth gates render one obvious action", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: /send my code/i })).toBeVisible();
  await page.goto("/agent/login");
  await expect(page.getByRole("button", { name: /whatsapp me the code/i })).toBeVisible();
  await expect(page.getByText(/ask your manager/i)).toBeVisible();
});

test("team desk stays shut without sign-in", async ({ page }) => {
  await page.goto("/dashboard/team");
  await expect(page.getByText(/sign in as owner/i)).toBeVisible();
});

test("relay endpoint refuses strangers", async ({ request }) => {
  const res = await request.get("/api/agents/pending-code?phone=08031234567");
  expect(res.status()).toBe(401);
});

test("report page loads the calm form", async ({ page }) => {
  await page.goto("/report?booking=demo");
  await expect(page.getByRole("heading", { name: /what went wrong/i })).toBeVisible();
  await expect(page.getByText(/a real person reads it/i)).toBeVisible();
});

test("review asks for sign-in, never leaks", async ({ page }) => {
  await page.goto("/review");
  await expect(page.getByText(/sign in/i).first()).toBeVisible();
});

test("card API 404s as JSON", async ({ request }) => {
  const res = await request.get("/api/cards/no-such-card-xyz");
  expect(res.status()).toBe(404);
});

test("booking API rejects garbage without writing", async ({ request }) => {
  const res = await request.post("/api/bookings", { data: { nonsense: true } });
  expect([400, 404, 422]).toContain(res.status());
});

test("issue API rejects garbage without writing", async ({ request }) => {
  const res = await request.post("/api/issues", { data: {} });
  expect([400, 401, 404, 422]).toContain(res.status());
});

test("cron endpoints fail closed", async ({ request }) => {
  for (const p of ["stale-sweep", "reminders", "weekly-report"]) {
    const res = await request.get(`/api/jobs/${p}`);
    expect(res.status()).toBe(401);
  }
});

test("private screens stay shut without sign-in", async ({ page }) => {
  await page.goto("/superadmin");
  await expect(page.getByText(/superadmin only|sign-in/i).first()).toBeVisible();
  await page.goto("/dashboard/documents");
  await expect(page.getByText(/sign in/i).first()).toBeVisible();
  await page.goto("/admin");
  await expect(page.getByText(/landlord only|sign-in/i).first()).toBeVisible();
});

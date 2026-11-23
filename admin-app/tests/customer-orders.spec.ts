import { expect, test, type Page } from "@playwright/test";
import { e2eCredentials, logIn } from "./e2e-login";

const ordersPath = "/dashboard/orders";
const customer = e2eCredentials("USER");

async function findDownload(page: Page, name: string) {
  const download = page.getByRole("button", { name, exact: true }).first();
  const older = page.getByRole("button", { name: "Load older orders" });
  await expect(download.or(older).or(page.getByRole("heading", { name: "No orders yet" })).first())
    .toBeVisible();
  const items = page.getByRole("listitem");

  while (!(await download.isVisible()) && (await older.isVisible())) {
    const previousCount = await items.count();
    await older.click();
    await expect.poll(async () =>
      (await items.count()) > previousCount || !(await older.isVisible())
    ).toBe(true);
    await expect(page.getByRole("button", { name: "Retry loading older orders" })).toHaveCount(0);
  }

  await expect(download, "The E2E customer needs a completed order with this document.").toBeVisible();
  return download;
}

test("signed-out visitors cannot access customer order history", async ({ page }) => {
  await page.goto(ordersPath);
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(page.getByRole("button", { name: /Download (sales receipt|ownership certificate)/ }))
    .toHaveCount(0);
});

test.describe("authenticated customer", () => {
  test.skip(!customer, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD.");

  test("can view order history and is blocked from admin orders", async ({ page }) => {
    if (!customer) return;
    await logIn(page, customer);
    await page.goto(ordersPath);
    await expect(page).toHaveURL(/\/dashboard\/orders$/);
    await expect(page.getByRole("heading", { level: 1, name: "Orders" })).toBeVisible();

    await page.goto("/admin/orders");
    await expect(page).toHaveURL(/\/dashboard\?error=insufficient_permissions$/);
  });

  for (const document of [
    { name: "Download sales receipt", bucket: "njet-order-receipts" },
    { name: "Download ownership certificate", bucket: "njet-order-certificates" },
  ]) {
    test(`downloads a private PDF via ${document.name.toLowerCase()}`, async ({ page, request }) => {
      if (!customer) return;
      await logIn(page, customer);
      await page.goto(ordersPath);
      const button = await findDownload(page, document.name);
      const [download] = await Promise.all([page.waitForEvent("download"), button.click()]);
      const url = new URL(download.url());
      expect(url.pathname).toContain(`/storage/v1/object/sign/${document.bucket}/`);
      expect(Boolean(url.searchParams.get("token"))).toBe(true);
      expect(await download.failure()).toBeNull();
      expect(download.suggestedFilename()).toMatch(/\.pdf$/i);

      // Use the isolated, signed-out request fixture to check the storage boundary.
      const unsigned = new URL(url);
      unsigned.search = "";
      const denied = await request.get(unsigned.toString(), { maxRedirects: 0 });
      expect([400, 401, 403, 404]).toContain(denied.status());
    });
  }
});

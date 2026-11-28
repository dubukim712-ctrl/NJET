import { expect, test } from "@playwright/test";
import { e2eCredentials, logIn } from "./e2e-login";

const ordersPath = "/orders";
const customer = e2eCredentials("USER");
const unknownOrder = "00000000-0000-4000-8000-000000000001";

test("signed-out visitors cannot access order history or receipt routes", async ({ page }) => {
  for (const path of [ordersPath, `${ordersPath}/${unknownOrder}/receipt`, `/admin/orders/${unknownOrder}/receipt`]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
  }
});

test.describe("authenticated customer", () => {
  test.skip(!customer, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD.");

  test("can view order history and is blocked from admin orders", async ({ page }) => {
    if (!customer) return;
    await logIn(page, customer);
    await page.goto(ordersPath);
    await expect(page.getByRole("heading", { level: 1, name: "Orders" })).toBeVisible();
    await page.goto(`/admin/orders/${unknownOrder}/receipt`);
    await expect(page).not.toHaveURL(/\/admin\/orders\/.*\/receipt$/);
  });

  test("views a completed order’s printable receipt", async ({ page }) => {
    if (!customer) return;
    await logIn(page, customer);
    await page.goto(ordersPath);
    const receipt = page.getByRole("link", { name: "View / Print Receipt", exact: true }).first();
    const older = page.getByRole("button", { name: "Load older orders" });
    await expect(receipt.or(older).or(page.getByRole("heading", { name: "No orders yet" })).first()).toBeVisible();
    while (!(await receipt.isVisible()) && (await older.isVisible())) {
      const count = await page.getByRole("listitem").count();
      await older.click();
      await expect.poll(async () => (await page.getByRole("listitem").count()) > count || !(await older.isVisible())).toBe(true);
    }
    await expect(receipt, "The E2E customer needs a completed order.").toBeVisible();
    await receipt.click();
    await expect(page.getByRole("heading", { name: "Sales Receipt", exact: true })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    await page.emulateMedia({ media: "print" });
    await expect(page.getByRole("button", { name: "Print Receipt" })).toBeHidden();
    await expect(page.getByRole("table")).toBeVisible();
  });
});

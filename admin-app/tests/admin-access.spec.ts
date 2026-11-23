import { expect, test } from "@playwright/test";
import { e2eCredentials, logIn } from "./e2e-login";

const admin = e2eCredentials("ADMIN");

test("admin can access the dashboard and protected orders page", async ({ page }) => {
  test.skip(!admin, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD.");
  if (!admin) return;

  await logIn(page, admin);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/\/admin\/orders$/);
  await expect(page.getByRole("heading", { level: 1, name: "Orders" })).toBeVisible();
});

import { expect, test } from "@playwright/test";

test("home heading and navigation links work", async ({ page }) => {
  await page.goto("http://localhost:3000");

  await expect(
    page.getByRole("heading", { level: 1, name: "Take the long way home." }),
  ).toBeVisible();

  const navigation = page.getByRole("navigation", {
    name: "Storefront navigation",
  });

  await navigation.getByRole("link", { name: "Shop" }).click();
  await expect(page).toHaveURL("http://localhost:3000/shop");
  await expect(
    page.getByRole("heading", { level: 1, name: "Shop the NJET collection" }),
  ).toBeVisible();

  await navigation.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL("http://localhost:3000/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Take the long way home." }),
  ).toBeVisible();
});

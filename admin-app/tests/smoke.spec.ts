import { expect, test } from "@playwright/test";

test("home heading and navigation links work", async ({ page }) => {
  await page.goto("http://localhost:3000");

  await expect(
    page.getByRole("heading", { level: 1, name: "Ebikes for Daily Commute, School, Family & Negosyo" }),
  ).toBeVisible();

  const navigation = page.getByRole("navigation", {
    name: "Storefront navigation",
  });

  await navigation.getByRole("link", { name: "Catalog" }).click();
  await expect(page).toHaveURL("http://localhost:3000/catalog");
  await expect(
    page.getByRole("heading", { level: 1, name: "Shop the NJET collection" }),
  ).toBeVisible();

  await navigation.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL("http://localhost:3000/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Ebikes for Daily Commute, School, Family & Negosyo" }),
  ).toBeVisible();
});

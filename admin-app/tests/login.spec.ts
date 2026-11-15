import { expect, test } from "@playwright/test";

test("invalid login displays an error", async ({ page }) => {
  await page.goto("http://localhost:3000/login");
  await page.getByRole("textbox", { name: "Email" }).fill("wrong@example.com");
  await page.getByRole("textbox", { name: "Password" }).fill("wrongpassword");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: "Invalid email or password." }),
  ).toBeVisible();
});

test("valid login shows the authenticated state", async ({ page }) => {
  const email = process.env.PLAYWRIGHT_LOGIN_EMAIL;
  const password = process.env.PLAYWRIGHT_LOGIN_PASSWORD;

  if (!email || !password) {
    test.skip(
      true,
      "Set PLAYWRIGHT_LOGIN_EMAIL and PLAYWRIGHT_LOGIN_PASSWORD to run this test.",
    );
    return;
  }

  await page.goto("http://localhost:3000/login");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  await expect(
    page.getByRole("button", { name: "Open user menu" }),
  ).toBeVisible();
});

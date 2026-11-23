import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("invalid login displays an error", async ({ page }) => {
  await page.goto("http://localhost:3000/login");
  await page.getByRole("textbox", { name: "Email" }).fill("wrong@example.com");
  await page.getByRole("textbox", { name: "Password" }).fill(randomUUID());
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: "Invalid email or password." }),
  ).toBeVisible();
});

import { expect, type Page } from "@playwright/test";

export function e2eCredentials(role: "USER" | "ADMIN" | "STAFF" | "WRONG_STAFF" | "OTHER_USER") {
  const email = process.env[`E2E_${role}_EMAIL`]?.trim();
  const password = process.env[`E2E_${role}_PASSWORD`];
  return email && password?.trim() ? { email, password } : null;
}

export async function logIn(
  page: Page,
  credentials: NonNullable<ReturnType<typeof e2eCredentials>>,
) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill(credentials.email);
  await page.getByLabel("Password", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  await expect(page.getByRole("button", { name: "Open user menu" })).toBeVisible();
}

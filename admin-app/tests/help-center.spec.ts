import { expect, test, type Page } from '@playwright/test';
import { e2eCredentials, logIn } from './e2e-login';

async function checkHelpCenter(page: Page, path: string) {
  const errors: string[] = [];
  const recordError = (error: Error) => { errors.push(error.message); };
  page.on('pageerror', recordError);

  try {
    const response = await page.goto(path);
    expect(response?.ok()).toBe(true);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole('heading', { name: 'Help Center', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open live support chat' })).toHaveAttribute('href', '/chat');
    await expect(page.getByRole('link', { name: 'View my orders' })).toHaveAttribute('href', '/orders');

    const search = page.getByRole('searchbox', { name: 'Search help guides' });
    await search.fill('recovery code');
    const guide = page.getByText('How do I start or recover a support chat?', { exact: true });
    await expect(guide).toBeVisible();
    await expect(page.getByText('How do I verify my phone number?', { exact: true })).toHaveCount(0);
    await page.locator('summary').filter({ hasText: 'How do I start or recover a support chat?' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText(/For Email, enter the six-digit Recovery code/)).toBeVisible();

    await search.fill('no such guide');
    await expect(page.getByRole('heading', { name: 'No matching guides' })).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(search).toHaveValue('');
    await page.getByRole('combobox', { name: 'Help category' }).click();
    await page.getByRole('option', { name: 'SMS Verification & Valid IDs' }).click();
    await expect(page.getByText('How do I verify my phone number?', { exact: true })).toBeVisible();
    await expect(guide).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    page.off('pageerror', recordError);
  }
}

test('guest Help Center is searchable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await checkHelpCenter(page, '/help');
  await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Help Center' })).toHaveAttribute('href', '/help');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('customer dashboard Help Center is searchable', async ({ page }) => {
  const credentials = e2eCredentials('USER');
  test.skip(!credentials, 'E2E_USER credentials are required for the dashboard Help Center');
  await logIn(page, credentials!);
  await checkHelpCenter(page, '/help');
});

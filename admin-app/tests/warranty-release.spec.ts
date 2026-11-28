import { expect, test, type Browser } from '@playwright/test';
import { e2eCredentials, logIn } from './e2e-login';

async function signedIn(browser: Browser, baseURL: string, role: Parameters<typeof e2eCredentials>[0]) {
  const credentials = e2eCredentials(role);
  if (!credentials) throw new Error(`Missing credentials for ${role}`);
  const page = await browser.newPage({ baseURL, timezoneId: "Asia/Manila" });
  await logIn(page, credentials);
  return page;
}

test('disposable release warranty lifecycle and access boundaries', async ({ browser, request, baseURL }) => {
  test.skip(process.env.E2E_RELEASE !== '1', 'Requires the disposable Supabase release fixture.');
  test.setTimeout(120_000);
  if (!baseURL) throw new Error('Release verification needs a browser base URL.');
  const appointmentId = process.env.E2E_RELEASE_APPOINTMENT_ID;
  const customerId = process.env.E2E_RELEASE_CUSTOMER_ID;
  const appointments = '/admin/appointments?q=SVC-CI-RELEASE';
  const crm = '/admin/crm/' + customerId;
  const details = '/appointments/' + appointmentId;
  const downloadPath = details + '/exchange-record';

  const wrongBranch = await signedIn(browser, baseURL, 'WRONG_STAFF');
  await wrongBranch.goto(crm);
  await expect(wrongBranch.getByText('404', { exact: true })).toBeVisible();
  await wrongBranch.goto(appointments);
  await expect(wrongBranch.getByText(/No appointments (need attention|match these filters)/)).toBeVisible();
  await expect(wrongBranch.locator('summary').filter({ hasText: 'SVC-CI-RELEASE' })).toHaveCount(0);
  await wrongBranch.close();

  const admin = await signedIn(browser, baseURL, 'ADMIN');
  expect((await admin.goto(crm))?.ok()).toBe(true);
  await expect(admin.getByRole('heading', { name: 'Release Customer' })).toBeVisible();
  await admin.close();

  const staff = await signedIn(browser, baseURL, 'STAFF');
  expect((await staff.goto(crm))?.ok()).toBe(true);
  await expect(staff.getByRole('heading', { name: 'Release Customer' })).toBeVisible();
  await staff.goto(appointments);
  await staff.locator('summary').filter({ hasText: 'SVC-CI-RELEASE' }).click();
  await staff.getByRole('textbox', { name: /Confirm original serial/i }).fill('CI-ORIGINAL');
  await staff.getByRole('textbox', { name: 'Returned condition' }).fill('Damaged during normal operation');
  await staff.getByRole('button', { name: 'Receive original unit' }).click();

  async function reserve() {
    await staff.getByRole('combobox', { name: 'Available replacement serial' }).click();
    await staff.getByRole('option', { name: /CI-REPLACEMENT/ }).click();
    await staff.getByRole('button', { name: 'Reserve replacement' }).click();
    await expect(staff.getByRole('button', { name: 'Complete handover' })).toBeVisible();
  }
  await reserve();
  await staff.getByRole('button', { name: 'Release reservation' }).click();
  await staff.getByRole('dialog').getByRole('button', { name: 'Release reservation' }).click();
  await reserve();

  const today = new Intl.DateTimeFormat('en-PH', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila',
  }).format(new Date());
  await staff.getByRole('button', { name: /Actual replacement handover date/ }).click();
  await staff.getByRole('gridcell', { name: today, exact: true }).click();
  await staff.getByRole('button', { name: 'Complete handover' }).click();
  await staff.getByRole('dialog').getByRole('button', { name: 'Complete handover' }).click();
  await expect(staff.getByText(/Replacement handed over\. The original unit/)).toBeVisible();

  await staff.goto('/admin/products');
  await staff.getByRole('tab', { name: 'Non-sellable stock' }).click();
  const returned = staff.locator('article').filter({ hasText: 'CI-ORIGINAL' });
  await returned.getByRole('button', { name: 'Update return' }).click();
  await returned.getByRole('combobox', { name: 'Return reason' }).click();
  await staff.getByRole('option', { name: 'Damaged', exact: true }).click();
  await returned.getByRole('combobox', { name: 'Disposition' }).click();
  await staff.getByRole('option', { name: 'Returned to supplier' }).click();
  await returned.getByRole('button', { name: 'Save return update' }).click();
  await expect(returned.getByText('Returned to supplier', { exact: true })).toBeVisible();

  const owner = await signedIn(browser, baseURL, 'USER');
  await owner.goto(details);
  const link = owner.getByRole('link', { name: 'Download exchange record' });
  await expect(link).toBeVisible();
  const downloaded = owner.waitForEvent('download');
  await link.click();
  expect((await downloaded).suggestedFilename()).toContain('warranty-exchange-');
  const authorized = await owner.request.get(downloadPath);
  expect(authorized.status()).toBe(200);
  expect(await authorized.text()).toContain('CI-REPLACEMENT');

  await owner.close();

  const other = await signedIn(browser, baseURL, 'OTHER_USER');
  expect((await other.request.get(downloadPath)).status()).toBe(404);
  await other.close();
  await staff.close();
  const guest = await request.get(downloadPath, { maxRedirects: 0 });
  expect([302, 303, 307, 308]).toContain(guest.status());
  expect(guest.headers().location).toContain('/login');
});

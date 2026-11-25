import { expect, test } from '@playwright/test';
import { e2eCredentials, logIn } from './e2e-login';

const bookingPath = '/dashboard/appointments/new';
const customer = e2eCredentials('USER');
const admin = e2eCredentials('ADMIN');
const appointmentId = process.env.E2E_WARRANTY_APPOINTMENT_ID?.trim();
const appointmentReference = process.env.E2E_WARRANTY_APPOINTMENT_REFERENCE?.trim();
const standardReference = process.env.E2E_STANDARD_APPOINTMENT_REFERENCE?.trim();
const orderNumber = process.env.E2E_WARRANTY_ORDER_NUMBER?.trim();
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

test('signed-out shoppers must sign in to book a service appointment', async ({ page }) => {
  await page.goto(bookingPath);
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  expect(new URL(page.url()).searchParams.get('redirect')).toBe(bookingPath);
});

test('a customer can book a regular service without a warranty choice on mobile', async ({ page }) => {
  test.skip(!customer, 'Set E2E_USER_EMAIL and E2E_USER_PASSWORD.');
  if (!customer) return;
  await page.setViewportSize({ width: 375, height: 812 });
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await logIn(page, customer);
  await page.goto(bookingPath);
  await expect(page.getByRole('heading', { name: 'Book an e-bike service' })).toBeVisible();
  const serviceType = page.getByRole('combobox', { name: 'Service type', exact: true });
  await serviceType.click();
  await expect(page.getByRole('option', { name: 'Maintenance', exact: true })).toBeVisible();
  await expect(page.getByRole('option', { name: /warranty|check if my issue is covered/i })).toHaveCount(0);
  await page.getByRole('option', { name: 'Repair', exact: true }).click();
  await expect(serviceType).toHaveText('Repair');
  await expect(page.getByRole('textbox', { name: 'Product / E-bike name' })).toBeEditable();
  await expect(page.getByRole('textbox', { name: 'Serial number (optional)' })).toBeEditable();
  await expect(page.getByText('Warranty rules and fees', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Send appointment request' })).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('staff can start a warranty review from a normal inspected appointment', async ({ page }) => {
  test.skip(!admin || !standardReference, 'Set E2E_STANDARD_APPOINTMENT_REFERENCE to an eligible appointment without a warranty case.');
  if (!admin || !standardReference) return;
  await logIn(page, admin);
  await page.goto('/admin/appointments?' + new URLSearchParams({ q: standardReference }));
  const appointment = page.locator('details').filter({ has: page.locator('summary').filter({ hasText: standardReference }) });
  await appointment.locator('summary').click();
  await expect(appointment.getByRole('button', { name: 'Start warranty review' })).toBeVisible();
});

test('a customer can view their saved assessment', async ({ page }) => {
  test.skip(!customer || !appointmentId || !uuid.test(appointmentId),
    'Set E2E_WARRANTY_APPOINTMENT_ID to an existing assessment owned by the E2E customer.');
  if (!customer || !appointmentId) return;
  await logIn(page, customer);
  await page.goto('/dashboard/appointments/' + appointmentId);
  await expect(page.getByRole('heading', { name: 'Warranty assessment' })).toBeVisible();
  await expect(page.getByText('Request submitted', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Record decision' })).toHaveCount(0);
  await page.goto('/dashboard/appointments/submitted?' + new URLSearchParams({ appointmentId }));
  await expect(page.getByRole('heading', { name: 'Appointment request submitted' })).toBeVisible();
});

test('staff can open the assessment from the appointment queue', async ({ page }) => {
  test.skip(!admin || !appointmentReference, 'Set E2E_WARRANTY_APPOINTMENT_REFERENCE to an existing assessment reference.');
  if (!admin || !appointmentReference) return;
  await logIn(page, admin);
  await page.goto('/admin/appointments?' + new URLSearchParams({ q: appointmentReference }));
  const appointment = page.locator('summary').filter({ hasText: appointmentReference });
  await expect(appointment.getByText('Warranty assessment', { exact: true })).toBeVisible();
  await appointment.click();
  await expect(page.getByRole('heading', { name: 'Warranty assessment' })).toBeVisible();
});

test('staff can open the warranty handover panel for a completed e-bike order', async ({ page }) => {
  test.skip(!admin || !orderNumber, 'Set E2E_WARRANTY_ORDER_NUMBER to a completed serialized e-bike order.');
  if (!admin || !orderNumber) return;
  await logIn(page, admin);
  await page.goto('/admin/orders?' + new URLSearchParams({ view: 'all', q: orderNumber }));
  const order = page.locator('article').filter({ has: page.getByRole('heading', { name: orderNumber, exact: true }) });
  await order.getByRole('button', { name: 'View details', exact: true }).click();
  await order.getByRole('button', { name: 'Warranty handovers', exact: true }).click();
  await expect(order.getByRole('button', { name: 'Hide warranty handovers' })).toBeVisible();
  await expect(order.getByRole('combobox', { name: 'Purchased bike' })
    .or(order.getByText(/\d wheels \/ /)).first()).toBeVisible();
  await expect(order.getByText(/Could not load handovers|No serialized bikes/)).toHaveCount(0);
});

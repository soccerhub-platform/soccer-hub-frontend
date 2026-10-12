import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';

test('dispatcher live: sections and all-time API without business writes', async ({ page }) => {
  test.setTimeout(120_000);
  const account = process.env.E2E_DISPATCHER_EMAIL && process.env.E2E_DISPATCHER_PASSWORD
    ? { email: process.env.E2E_DISPATCHER_EMAIL, password: process.env.E2E_DISPATCHER_PASSWORD }
    : existsSync('.local-qa/dispatcher.json')
      ? JSON.parse(readFileSync('.local-qa/dispatcher.json', 'utf8'))
      : undefined;
  test.skip(!account, 'Requires local QA dispatcher credentials');
  const errors: string[] = [];
  const failures: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400 && response.url().includes('/api/')) {
      failures.push(`${response.status()} ${new URL(response.url()).pathname}`);
    }
  });
  await page.goto('/login');
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Пароль', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(/\/dispatcher\//);
  for (const section of ['dashboard', 'leads', 'students', 'contracts', 'payments', 'tasks', 'trial-trainings', 'debts', 'capacity', 'reports', 'employees', 'clubs', 'profile']) {
    await page.goto(`/dispatcher/${section}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading').first(), section).toBeVisible();
    expect.soft(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), `${section}: page overflow`).toBe(false);
  }
  const token = await page.evaluate(() => JSON.parse(localStorage.getItem('football-crm:user')!).accessToken);
  for (const endpoint of ['/dispatcher/operations/reports', '/dispatcher/operations/trials', '/dispatcher/company/payments?sort=AMOUNT']) {
    const response = await page.request.get(`/api${endpoint}`, { headers: { Authorization: `Bearer ${token}` } });
    expect.soft(response.status(), `all-time ${endpoint}`).toBe(200);
  }
  expect(errors, 'JavaScript errors').toEqual([]);
  expect(failures, 'API errors').toEqual([]);
});

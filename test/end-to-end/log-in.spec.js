import { test } from './Fixtures/trinocular-fixtures.js';
import { expect } from '@playwright/test';

test.describe('Authentication process', () => {
  test('User can log in', async ({ authenticatedPage }) => {
    await expect(authenticatedPage).toHaveURL('http://localhost:8080/repos');
  });

  test('User can log out', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.getByRole('link', { name: 'Logout' }).click();

    await expect(page).toHaveURL(new RegExp('^http://localhost:8080/.*keycloak.*$'));
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page.getByRole('heading', { name: 'Trinocular' })).toBeDefined();
    await expect(page.getByRole('main').getByRole('link', { name: 'Login' })).toBeDefined();
  });
});

test.describe('Protected routes should not be accessible without authentication', () => {
  test('/repos', async ({ page }) => {
    await page.goto('http://localhost:8080/repos');

    await expect(page.getByRole('heading', { name: 'Trinocular' })).toBeDefined();
    await expect(page.getByRole('main').getByRole('link', { name: 'Login' })).toBeDefined();
  });

  test('/repos/new', async ({ page }) => {
    await page.goto('http://localhost:8080/repos/new');

    await expect(page.getByRole('heading', { name: 'Trinocular' })).toBeDefined();
    await expect(page.getByRole('main').getByRole('link', { name: 'Login' })).toBeDefined();
  });

  test('/dashboard/:uuid/settings', async ({ page }) => {
    await page.goto('http://localhost:8080/dashboard/72c61773-3709-47fd-a603-eb977abe2813/settings');

    await expect(page.getByRole('heading', { name: 'Trinocular' })).toBeDefined();
    await expect(page.getByRole('main').getByRole('link', { name: 'Login' })).toBeDefined();
  });

  test('/wait/:uuid', async ({ page }) => {
    await page.goto('http://localhost:8080/wait/6800cf97-c16c-4cd6-baf4-5c0e8b9fab78');

    await expect(page.getByRole('heading', { name: 'Trinocular' })).toBeDefined();
    await expect(page.getByRole('main').getByRole('link', { name: 'Login' })).toBeDefined();
  });
});

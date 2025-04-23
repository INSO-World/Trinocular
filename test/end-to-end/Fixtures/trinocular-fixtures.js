import { test as base } from '@playwright/test';
import { expect } from '@playwright/test';

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('http://localhost:8080/');

    await page.getByRole('main').getByRole('link', { name: 'Login' }).click();

    await page.getByLabel('Username or email').fill('tri_user');

    await page.getByLabel('Username or email').press('Tab');

    await page.getByLabel('Password', { exact: true }).fill('tri_user');

    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL('http://localhost:8080/repos');

    await use(page);
  }
});

import { test as base } from './Fixtures/trinocular-fixtures.js';
import { expect } from '@playwright/test';

const test = base.extend({
  newRepoPage: async ({ authenticatedPage }, use) => {
    const page = authenticatedPage;
    await page.getByRole('link', { name: 'New' }).click();
    await use(page);
  }
});

test.describe('Setting page is accessible', () => {
  test('User can access /repos/new', async ({ authenticatedPage }) => {
    authenticatedPage.getByRole('link', { name: 'New' }).click();
    await expect(authenticatedPage).toHaveURL('http://localhost:8080/repos/new');
  });
});

test.describe.serial('New Repo successful dataflows', () => {
  test.setTimeout(300000);
  test.afterEach('Remove added repo', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('http://localhost:8080/repos');

    page.on('dialog', async dialog => {
      console.log(`Dialog message: ${dialog.message()}`);
      await dialog.accept();
    });

    const activeSection = await page.getByText('Active').first();
    await activeSection.getByRole('link').nth(1).click();
    await expect(page).toHaveURL(/.*\/settings/);
    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page).toHaveURL(/.*\/repos/);
  });

  test('User creates repo without name', async ({ newRepoPage }) => {
    const page = newRepoPage;

    await page.getByLabel('URL').click();
    await page.getByLabel('URL').fill('https://reset.inso-world.com/repo/archive/23ws-ase-pr-inso-03');
    await page.getByLabel('Auth Token').click();
    await page.getByLabel('Auth Token').fill(process.env.PAT);
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByRole('heading', { name: 'Importing Repository 23ws-ase' })).toBeVisible();
    await expect(page.locator('#status-container')).toBeVisible();

    const dashboardUrlPattern = /\/dashboard\/[a-f0-9\-]+$/;
    await page.waitForURL(dashboardUrlPattern, { timeout: 120000 });
  });

  test('User creates repo with name', async ({ newRepoPage }) => {
    const page = newRepoPage;

    await page.getByLabel('Name').click();
    await page.getByLabel('Name').fill('TestName');
    await page.getByLabel('URL').click();
    await page.getByLabel('URL').fill('https://reset.inso-world.com/repo/archive/23ws-ase-pr-inso-03');
    await page.getByLabel('Auth Token').click();
    await page.getByLabel('Auth Token').fill(process.env.PAT);
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByRole('heading', { name: 'Importing Repository TestName' })).toBeVisible();
    await expect(page.locator('#status-container')).toBeVisible();

    const dashboardUrlPattern = /\/dashboard\/[a-f0-9\-]+$/;
    await page.waitForURL(dashboardUrlPattern, { timeout: 120000 });
  });
});


// test('User creates repo with wrong url', async ({ page }) => {
//   await page.goto('http://localhost:8080/dashboard/72c61773-3709-47fd-a603-eb977abe2813/settings');
//
//   await expect(page.getByRole('heading', { name: 'Trinocular' })).toBeDefined();
//   await expect(page.getByRole('main').getByRole('link', { name: 'Login' })).toBeDefined();
// });
//
// test('User creates repo with wrong auth token', async ({ page }) => {
//   await page.goto('http://localhost:8080/wait/6800cf97-c16c-4cd6-baf4-5c0e8b9fab78');
//
//   await expect(page.getByRole('heading', { name: 'Trinocular' })).toBeDefined();
//   await expect(page.getByRole('main').getByRole('link', { name: 'Login' })).toBeDefined();
// });

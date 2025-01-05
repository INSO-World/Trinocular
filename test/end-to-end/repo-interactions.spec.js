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

test.describe('New Repo unsuccessful dataflows', () => {

  test('User creates Repo with already existing URL', async ({ newRepoPage }) => {
    const page = newRepoPage;

    // Add first repo and wait for it to finish
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

    // Add second repo with same URL
    await page.goto('http://localhost:8080/repos/new');
    await page.getByLabel('URL').click();
    await page.getByLabel('URL').fill('https://reset.inso-world.com/repo/archive/23ws-ase-pr-inso-03');
    await page.getByLabel('Auth Token').click();
    await page.getByLabel('Auth Token').fill(process.env.PAT);
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByText('Could not submit new')).toContainText('Duplicate repository URL');

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

  test('User creates Repo with wrong URL', async ({ newRepoPage }) => {
    const page = newRepoPage;

    await page.getByLabel('Name').click();
    await page.getByLabel('Name').fill('TestName');
    await page.getByLabel('URL').click();
    await page.getByLabel('URL').fill('https://reset.inso-world.com/23ws-ase-pr-inso-03');
    await page.getByLabel('Auth Token').click();
    await page.getByLabel('Auth Token').fill(process.env.PAT);
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByText('Could not submit new')).toContainText('Invalid URL');
  });

  test('User creates Repo with invalid Token', async ({ newRepoPage }) => {
    const page = newRepoPage;

    await page.getByLabel('Name').click();
    await page.getByLabel('Name').fill('TestName');
    await page.getByLabel('URL').click();
    await page.getByLabel('URL').fill('https://reset.inso-world.com/repo/archive/23ws-ase-pr-inso-03');
    await page.getByLabel('Auth Token').click();
    await page.getByLabel('Auth Token').fill('Not really a token');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByText('Could not submit new')).toContainText('Invalid token');
  });
});


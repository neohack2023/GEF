import { expect, test } from '@playwright/test';

function watchForBrowserErrors(page) {
  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  return { pageErrors, consoleErrors };
}

test('GEF boots and keeps the sandbox recoverable', async ({ page }) => {
  const browserErrors = watchForBrowserErrors(page);

  await page.goto('/');

  await expect(page.locator('#status-bar')).toContainText('STABLE ENGINE ACTIVE');
  await expect(page.locator('#main-canvas-2d')).toBeVisible();
  await expect(page.locator('#sandbox-canvas')).toBeVisible();
  await expect(page.locator('#feedback-buffer')).toBeAttached();
  await expect(page.locator('#composite-canvas')).toBeAttached();
  await expect(page.locator('#pipeline-summary')).toContainText('module slots');

  await page.locator('#tab-autopilot').click();
  await expect(page.locator('#view-autopilot')).toHaveClass(/active/);
  await expect(page.locator('#provider-mode')).toBeVisible();
  await expect(page.locator('#provider-preview-suggestion-btn')).toBeDisabled();

  await page.locator('#tab-library').click();
  await expect(page.locator('#view-library')).toHaveClass(/active/);
  await expect(page.locator('#dataset-count')).toBeVisible();

  await page.locator('#tab-studio').click();
  await expect(page.locator('#view-studio')).toHaveClass(/active/);

  await page.locator('#sandbox-toggle').check();
  await expect(page.locator('#status-bar')).toContainText('SANDBOX RUNTIME ACTIVE');
  await expect(page.locator('#panic-btn')).toBeVisible();

  await page.locator('#panic-btn').click();
  await expect(page.locator('#sandbox-toggle')).not.toBeChecked();
  await expect(page.locator('#status-bar')).toContainText('Sandbox panic reset complete.');

  expect(browserErrors.pageErrors).toEqual([]);
  expect(browserErrors.consoleErrors).toEqual([]);
});

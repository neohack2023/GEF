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

test('validated Local SLM suggestion can be previewed in sandbox only', async ({ page }) => {
  const browserErrors = watchForBrowserErrors(page);
  let generateRequestSeen = false;

  await page.route('http://localhost:11434/api/generate', async (route) => {
    generateRequestSeen = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        model: 'llama3.2:3b',
        response: JSON.stringify({
          schemaName: 'gef-module-suggestion',
          schemaVersion: 1,
          moduleId: 'spectralGrid',
          stage: 'OVERLAY',
          confidence: 0.87,
          reason: 'The prompt asks for structured motion, so the curated grid overlay fits.'
        })
      })
    });
  });

  await page.goto('/');
  await expect(page.locator('#status-bar')).toContainText('STABLE ENGINE ACTIVE');

  await page.locator('#evo-stage').selectOption('OVERLAY');
  await page.locator('#tab-autopilot').click();
  await page.locator('#autopilot-seeds').fill('Build a sharp audio-reactive grid that rides the beat without changing main runtime.');

  await page.locator('#provider-mode').selectOption('local-slm');
  await page.locator('#provider-endpoint').fill('http://localhost:11434');
  await page.locator('#provider-model').fill('llama3.2:3b');
  await page.locator('#provider-save-btn').click();

  const previewButton = page.locator('#provider-preview-suggestion-btn');
  await expect(previewButton).toBeDisabled();

  await page.locator('#provider-suggest-module-btn').click();

  await expect(page.locator('#local-slm-output')).toContainText('Validated suggestion: Spectral Grid');
  await expect(page.locator('#local-slm-output')).toContainText('Use Preview Suggestion');
  await expect(previewButton).toBeEnabled();
  expect(generateRequestSeen).toBe(true);

  await previewButton.click();

  await expect(page.locator('#sandbox-toggle')).toBeChecked();
  await expect(page.locator('#status-bar')).toContainText('SANDBOX RUNTIME ACTIVE');
  await expect(page.locator('#promote-sandbox-btn')).toBeVisible();
  await expect(page.locator('#discard-sandbox-btn')).toBeVisible();
  await expect(page.locator('#module-stack-container')).toContainText('SANDBOX');
  await expect(page.locator('#module-stack-container')).toContainText('Spectral Grid');
  await expect(page.locator('#local-slm-output')).toContainText('Promotion still requires the normal Promote Sandbox action.');
  await expect(page.locator('#local-slm-output')).toContainText('No generated code was executed.');

  expect(browserErrors.pageErrors).toEqual([]);
  expect(browserErrors.consoleErrors).toEqual([]);
});

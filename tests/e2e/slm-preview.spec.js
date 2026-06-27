import { expect, test } from '@playwright/test';

const OLLAMA_MOCK_HEADERS = {
  'access-control-allow-origin': 'http://127.0.0.1:4173',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '600'
};

function watchForBrowserErrors(page) {
  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  return { pageErrors, consoleErrors };
}

test('validated Local SLM suggestion can use local defaults and preview in sandbox only', async ({ page }) => {
  const browserErrors = watchForBrowserErrors(page);
  let generateRequestSeen = false;
  let tagsRequestSeen = false;

  await page.route('http://localhost:11434/api/tags', async (route) => {
    tagsRequestSeen = true;
    await route.fulfill({
      status: 200,
      headers: {
        ...OLLAMA_MOCK_HEADERS,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        models: [
          { name: 'llama3.2:3b' },
          { name: 'qwen2.5-coder:3b' }
        ]
      })
    });
  });

  await page.route('http://localhost:11434/api/generate', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: OLLAMA_MOCK_HEADERS
      });
      return;
    }

    const requestBody = route.request().postDataJSON();
    generateRequestSeen = requestBody.model === 'llama3.2:3b';
    await route.fulfill({
      status: 200,
      headers: {
        ...OLLAMA_MOCK_HEADERS,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: requestBody.model,
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
  await expect(page.locator('#provider-endpoint')).toHaveValue('http://localhost:11434');
  await expect(page.locator('#provider-model')).toHaveValue('llama3.2:3b');
  await expect(page.locator('#provider-credential-ref')).toHaveValue('local-only');

  const modelStatus = page.locator('#local-slm-model-status');
  await expect(modelStatus).toContainText('llama3.2:3b');
  await expect(modelStatus).toContainText('qwen2.5-coder:3b');
  await expect(modelStatus).toContainText('qwen2.5-coder:7b');
  await expect(modelStatus).toContainText('Light helper');
  await expect(modelStatus).toContainText('Code Foundry');
  await expect(modelStatus).toContainText('Heavier code repair');

  await page.locator('#provider-local-task').selectOption('code-foundry');
  await expect(page.locator('#provider-model')).toHaveValue('qwen2.5-coder:3b');
  await page.locator('#provider-local-task').selectOption('module-suggestion');
  await expect(page.locator('#provider-model')).toHaveValue('llama3.2:3b');

  await page.locator('#provider-test-ollama-btn').click();
  await expect(modelStatus).toContainText('Ollama reachable');
  await expect(modelStatus).toContainText('missing optional');
  expect(tagsRequestSeen).toBe(true);

  const previewButton = page.locator('#provider-preview-suggestion-btn');
  await expect(previewButton).toBeHidden();

  await page.locator('#provider-run-local-slm-btn').click();

  await expect(page.locator('#local-slm-output')).toContainText('Validated suggestion from llama3.2:3b: Spectral Grid');
  await expect(page.locator('#local-slm-output')).toContainText('Preview Suggestion is now available');
  await expect(previewButton).toBeVisible();
  await expect(previewButton).toBeEnabled();
  expect(generateRequestSeen).toBe(true);

  await previewButton.click();

  await expect(page.locator('#local-slm-output')).toContainText('Promotion still requires the normal Promote Sandbox action.');
  await expect(page.locator('#local-slm-output')).toContainText('No generated code was executed.');

  await page.locator('#tab-studio').click();
  await expect(page.locator('#view-studio')).toHaveClass(/active/);
  await expect(page.locator('#sandbox-toggle')).toBeChecked();
  await expect(page.locator('#status-bar')).toContainText('SANDBOX RUNTIME ACTIVE');
  await expect(page.locator('#promote-sandbox-btn')).toBeVisible();
  await expect(page.locator('#discard-sandbox-btn')).toBeVisible();
  await expect(page.locator('#module-stack-container')).toContainText('SANDBOX');
  await expect(page.locator('#module-stack-container')).toContainText('Spectral Grid');

  expect(browserErrors.pageErrors).toEqual([]);
  expect(browserErrors.consoleErrors).toEqual([]);
});

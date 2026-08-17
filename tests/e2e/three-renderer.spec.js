import { expect, test } from '@playwright/test';

test('curated 3D preview uses WebGL2 fallback and panic returns to Canvas2D', async ({ page }) => {
  await page.goto('/');
  await page.locator('#three-backend').selectOption('webgl2');
  await page.locator('#preview-three-btn').click();

  await expect(page.locator('#three-status')).toContainText('WEBGL2');
  await expect(page.locator('#three-status')).toHaveAttribute('data-state', 'active');
  await expect(page.locator('#three-d-canvas')).toBeVisible();
  await expect(page.locator('#three-d-canvas')).toHaveAttribute('data-backend', 'webgl2');
  await expect(page.locator('#three-d-canvas')).toHaveAttribute('data-module-id', 'bassTunnel3d');
  await expect(page.locator('#sandbox-toggle')).toBeChecked();
  await expect(page.locator('#promote-sandbox-btn')).toBeHidden();
  await expect(page.locator('#discard-sandbox-btn')).toBeVisible();

  const status = await page.evaluate(() => globalThis.GEF_3D_RUNTIME.getStatus());
  expect(status).toMatchObject({ active: true, backend: 'webgl2', moduleId: 'bassTunnel3d' });

  await page.locator('#panic-btn').click();
  await expect(page.locator('#three-d-canvas')).toBeHidden();
  await expect(page.locator('#sandbox-toggle')).not.toBeChecked();
  await expect(page.locator('#status-bar')).toContainText('Sandbox panic reset complete.');
  expect(await page.evaluate(() => globalThis.GEF_3D_RUNTIME.getStatus())).toMatchObject({
    active: false,
    backend: null,
    moduleId: null
  });
});

test('missing GPU APIs fail closed without disturbing the stable renderer', async ({ page }) => {
  await page.addInitScript(() => {
    const originalGetContext = globalThis.HTMLCanvasElement.prototype.getContext;
    globalThis.HTMLCanvasElement.prototype.getContext = function getContext(type, ...args) {
      if (type === 'webgpu' || type === 'webgl2') return null;
      return originalGetContext.call(this, type, ...args);
    };
    Object.defineProperty(globalThis.navigator, 'gpu', { configurable: true, value: undefined });
  });

  await page.goto('/');
  await page.locator('#preview-three-btn').click();

  await expect(page.locator('#three-status')).toHaveAttribute('data-state', 'error');
  await expect(page.locator('#three-status')).toContainText('3D unavailable');
  await expect(page.locator('#three-d-canvas')).toBeHidden();
  await expect(page.locator('#sandbox-toggle')).not.toBeChecked();
  await expect(page.locator('#main-canvas-2d')).toBeVisible();
  await expect(page.locator('#status-bar')).toContainText('3D preview unavailable');
});

test('WebGL2 context loss restores Canvas2D and synchronizes sandbox controls', async ({ page }) => {
  await page.goto('/');
  await page.locator('#three-backend').selectOption('webgl2');
  await page.locator('#preview-three-btn').click();
  await expect(page.locator('#three-status')).toHaveAttribute('data-state', 'active');

  await page.locator('#three-d-canvas').evaluate((canvas) => {
    canvas.dispatchEvent(new globalThis.Event('webglcontextlost', { cancelable: true }));
  });

  await expect(page.locator('#three-d-canvas')).toBeHidden();
  await expect(page.locator('#sandbox-toggle')).not.toBeChecked();
  await expect(page.locator('#three-status')).toHaveAttribute('data-state', 'error');
  await expect(page.locator('#three-status')).toContainText('Canvas2D restored');
  await expect(page.locator('#status-bar')).toContainText('3D renderer stopped');
});

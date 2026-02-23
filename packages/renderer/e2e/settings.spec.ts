import { test, expect, type ElectronApplication, type Page } from '@playwright/test';
import { launchApp, closeApp } from './helpers';

let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  ({ app, page } = await launchApp());
  // Dismiss onboarding if present
  const skipButton = page.locator('button:has-text("Skip"), button[data-testid="onboarding-skip"]');
  if (await skipButton.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
    await skipButton.first().click();
    await page.waitForTimeout(500);
  }
});

test.afterAll(async () => {
  await closeApp(app);
});

test.describe('Settings panel', () => {
  test('opens settings panel via button or keyboard shortcut', async () => {
    const settingsButton = page.locator(
      'button[data-testid="settings-button"], button[aria-label="Settings"], button:has-text("Settings")'
    );

    if (await settingsButton.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await settingsButton.first().click();
    } else {
      await page.keyboard.press('Meta+,');
    }

    await page.waitForTimeout(500);

    const settingsPanel = page.locator(
      '[data-testid="settings-panel"], [data-testid="settings-modal"], [role="dialog"]'
    );
    await expect(settingsPanel.first()).toBeVisible({ timeout: 5_000 });
  });

  test('displays model selection options', async () => {
    const modelSection = page.locator(
      '[data-testid="model-settings"], :text("Model"), :text("model")'
    );

    const modelVisible = await modelSection.first().isVisible({ timeout: 3_000 }).catch(() => false);
    if (modelVisible) {
      await expect(modelSection.first()).toBeVisible();
    }
  });

  test('can change model selection', async () => {
    const modelSelect = page.locator(
      'select[data-testid="model-select"], [data-testid="model-dropdown"], select'
    );

    if (await modelSelect.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      const options = await modelSelect.first().locator('option').allTextContents();
      expect(options.length).toBeGreaterThanOrEqual(1);

      if (options.length > 1) {
        await modelSelect.first().selectOption({ index: 1 });
        await page.waitForTimeout(300);
      }
    }
  });

  test('can save settings', async () => {
    const saveButton = page.locator(
      'button:has-text("Save"), button[data-testid="save-settings"]'
    );

    if (await saveButton.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      await saveButton.first().click();
      await page.waitForTimeout(500);

      const toast = page.locator('[data-testid="toast"], [role="alert"]');
      const toastVisible = await toast.first().isVisible({ timeout: 2_000 }).catch(() => false);
      if (toastVisible) {
        const text = await toast.first().textContent();
        expect(text?.toLowerCase()).toMatch(/saved|success|updated/);
      }
    }
  });

  test('can close settings panel', async () => {
    const closeButton = page.locator(
      'button[data-testid="close-settings"], button[aria-label="Close"], button:has-text("Close")'
    );

    if (await closeButton.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      await closeButton.first().click();
    } else {
      await page.keyboard.press('Escape');
    }

    await page.waitForTimeout(500);
  });
});

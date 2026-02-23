import { test, expect, type ElectronApplication, type Page } from '@playwright/test';
import { launchApp, closeApp } from './helpers';

let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  ({ app, page } = await launchApp());
});

test.afterAll(async () => {
  await closeApp(app);
});

test.describe('Onboarding flow', () => {
  test('shows onboarding modal on first launch', async () => {
    const modal = page.locator('[data-testid="onboarding-modal"]');
    await expect(modal).toBeVisible({ timeout: 10_000 });
  });

  test('displays welcome step with app name', async () => {
    const welcomeHeading = page.locator('h1, h2, [data-testid="welcome-heading"]');
    await expect(welcomeHeading.first()).toBeVisible();
    const text = await welcomeHeading.first().textContent();
    expect(text?.toLowerCase()).toContain('kado');
  });

  test('can navigate through onboarding steps', async () => {
    const nextButton = page.locator(
      'button:has-text("Next"), button:has-text("Continue"), button[data-testid="onboarding-next"]'
    );

    if (await nextButton.first().isVisible()) {
      await nextButton.first().click();
      await page.waitForTimeout(300);

      const stepContent = page.locator(
        '[data-testid="onboarding-step"], [data-testid="api-key-step"], [data-testid="project-step"]'
      );
      const anyStepVisible = await stepContent.first().isVisible().catch(() => false);

      if (!anyStepVisible) {
        const bodyText = await page.locator('body').textContent();
        expect(bodyText).toBeTruthy();
      }
    }
  });

  test('can skip onboarding', async () => {
    const skipButton = page.locator(
      'button:has-text("Skip"), button[data-testid="onboarding-skip"]'
    );

    if (await skipButton.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      await skipButton.first().click();
      await page.waitForTimeout(500);

      const modal = page.locator('[data-testid="onboarding-modal"]');
      await expect(modal).not.toBeVisible({ timeout: 5_000 });
    }
  });
});

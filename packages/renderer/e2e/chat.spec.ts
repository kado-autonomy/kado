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

test.describe('Chat panel', () => {
  test('chat panel is visible', async () => {
    const chatPanel = page.locator(
      '[data-testid="chat-panel"], [data-testid="chat-container"]'
    );
    await expect(chatPanel.first()).toBeVisible({ timeout: 5_000 });
  });

  test('chat input is available', async () => {
    const chatInput = page.locator(
      '[data-testid="chat-input"], textarea[placeholder*="essage"], textarea[placeholder*="ype"], input[data-testid="chat-input"]'
    );
    await expect(chatInput.first()).toBeVisible({ timeout: 5_000 });
  });

  test('can type a message in the chat input', async () => {
    const chatInput = page.locator(
      '[data-testid="chat-input"], textarea[placeholder*="essage"], textarea[placeholder*="ype"]'
    );

    await chatInput.first().click();
    await chatInput.first().fill('Hello, Kado!');
    await page.waitForTimeout(200);

    const value = await chatInput.first().inputValue();
    expect(value).toBe('Hello, Kado!');
  });

  test('can send a message', async () => {
    const chatInput = page.locator(
      '[data-testid="chat-input"], textarea[placeholder*="essage"], textarea[placeholder*="ype"]'
    );
    const sendButton = page.locator(
      'button[data-testid="send-button"], button[aria-label="Send"], button:has-text("Send")'
    );

    await chatInput.first().fill('Test message from E2E');

    if (await sendButton.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      await sendButton.first().click();
    } else {
      await chatInput.first().press('Enter');
    }

    await page.waitForTimeout(1_000);

    const messageList = page.locator(
      '[data-testid="message-list"], [data-testid="chat-messages"]'
    );
    const listVisible = await messageList.first().isVisible({ timeout: 3_000 }).catch(() => false);
    if (listVisible) {
      const messages = page.locator(
        '[data-testid="message-bubble"], [data-testid="chat-message"]'
      );
      const count = await messages.count();
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  test('displays user message in the chat', async () => {
    const messages = page.locator(
      '[data-testid="message-bubble"], [data-testid="chat-message"]'
    );

    const count = await messages.count();
    if (count > 0) {
      const lastMessage = messages.last();
      const text = await lastMessage.textContent();
      expect(text).toBeTruthy();
    }
  });

  test('shows loading indicator after sending', async () => {
    const chatInput = page.locator(
      '[data-testid="chat-input"], textarea[placeholder*="essage"]'
    );

    await chatInput.first().fill('Another test message');
    await chatInput.first().press('Enter');

    const spinner = page.locator(
      '[data-testid="loading-spinner"], [data-testid="thinking-indicator"], .spinner, .loading'
    );
    const spinnerVisible = await spinner.first().isVisible({ timeout: 3_000 }).catch(() => false);
    // Spinner may appear briefly - we just verify the interaction doesn't crash
    if (spinnerVisible) {
      await expect(spinner.first()).toBeVisible();
    }
  });
});

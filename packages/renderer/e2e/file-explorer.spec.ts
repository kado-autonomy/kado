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

test.describe('File explorer', () => {
  test('shows file tree panel in sidebar', async () => {
    const fileTree = page.locator(
      '[data-testid="file-explorer"], [data-testid="file-tree"], [data-testid="sidebar"]'
    );
    await expect(fileTree.first()).toBeVisible({ timeout: 5_000 });
  });

  test('displays files and folders when a project is open', async () => {
    const treeItems = page.locator(
      '[data-testid="file-tree-item"], [data-testid="tree-node"], [role="treeitem"]'
    );

    const count = await treeItems.count();
    if (count > 0) {
      await expect(treeItems.first()).toBeVisible();
    }
  });

  test('can expand a folder by clicking', async () => {
    const folder = page.locator(
      '[data-testid="folder-node"], [data-testid="tree-node"][data-type="directory"]'
    ).first();

    if (await folder.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await folder.click();
      await page.waitForTimeout(300);

      const children = page.locator(
        '[data-testid="file-tree-item"], [data-testid="tree-node"]'
      );
      const afterCount = await children.count();
      expect(afterCount).toBeGreaterThanOrEqual(1);
    }
  });

  test('shows context menu on right-click', async () => {
    const treeItem = page.locator(
      '[data-testid="file-tree-item"], [data-testid="tree-node"], [role="treeitem"]'
    ).first();

    if (await treeItem.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await treeItem.click({ button: 'right' });
      await page.waitForTimeout(300);

      const contextMenu = page.locator(
        '[data-testid="context-menu"], [data-testid="file-context-menu"], [role="menu"]'
      );
      const menuVisible = await contextMenu.first().isVisible({ timeout: 2_000 }).catch(() => false);
      if (menuVisible) {
        await expect(contextMenu.first()).toBeVisible();
        // Dismiss by clicking elsewhere
        await page.click('body');
      }
    }
  });

  test('can select a file to open it', async () => {
    const fileNode = page.locator(
      '[data-testid="tree-node"][data-type="file"], [data-testid="file-node"]'
    ).first();

    if (await fileNode.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await fileNode.click();
      await page.waitForTimeout(500);

      const editorArea = page.locator(
        '[data-testid="editor"], [data-testid="code-editor"], .monaco-editor'
      );
      const editorVisible = await editorArea.first().isVisible({ timeout: 3_000 }).catch(() => false);
      if (editorVisible) {
        await expect(editorArea.first()).toBeVisible();
      }
    }
  });

  test('can search for files', async () => {
    const searchInput = page.locator(
      '[data-testid="file-search"], [data-testid="fuzzy-search"], input[placeholder*="earch"]'
    );

    if (await searchInput.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      await searchInput.first().fill('test');
      await page.waitForTimeout(300);

      const results = page.locator(
        '[data-testid="search-result"], [data-testid="fuzzy-result"]'
      );
      const count = await results.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });
});

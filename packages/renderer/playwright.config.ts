import { defineConfig } from '@playwright/test';
import path from 'path';

const electronAppPath = path.resolve(__dirname, '../desktop');

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'electron',
      use: {
        // Playwright Electron testing uses _electron.launch() directly in test files,
        // so browser-level config is minimal here. The electron app path and launch
        // args are specified per-test for flexibility.
      },
    },
  ],
  // The Electron app entry point for reference in tests
  metadata: {
    electronAppPath,
    mainScript: path.join(electronAppPath, 'dist', 'main.js'),
  },
});

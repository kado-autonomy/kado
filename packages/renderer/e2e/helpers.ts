import { _electron, type ElectronApplication, type Page } from '@playwright/test';
import path from 'path';

const DESKTOP_PATH = path.resolve(__dirname, '../../desktop');
const MAIN_SCRIPT = path.join(DESKTOP_PATH, 'dist', 'main.js');

export async function launchApp(): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await _electron.launch({
    args: [MAIN_SCRIPT],
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  });

  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  return { app, page };
}

export async function closeApp(app: ElectronApplication): Promise<void> {
  await app.close();
}

import { app, BrowserWindow, nativeImage } from "electron";
import * as path from "path";
import * as fs from "fs/promises";

const WINDOW_STATE_FILE = path.join(app.getPath("userData"), "window-state.json");

interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
}

const DEFAULT_STATE: WindowState = {
  width: 1400,
  height: 900,
};

async function loadWindowState(): Promise<WindowState> {
  try {
    const data = await fs.readFile(WINDOW_STATE_FILE, "utf-8");
    const parsed = JSON.parse(data) as Partial<WindowState>;
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return DEFAULT_STATE;
  }
}

async function saveWindowState(window: BrowserWindow): Promise<void> {
  const bounds = window.getBounds();
  const state: WindowState = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  };
  await fs.writeFile(WINDOW_STATE_FILE, JSON.stringify(state, null, 2));
}

export async function createMainWindow(): Promise<BrowserWindow> {
  const state = await loadWindowState();

  const preloadPath = path.join(__dirname, "preload.js");

  const iconPath = path.join(__dirname, "..", "build", "icon.png");
  const icon = nativeImage.createFromPath(iconPath);

  const window = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    minWidth: 800,
    minHeight: 600,
    icon: icon.isEmpty() ? undefined : icon,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.on("close", () => {
    saveWindowState(window).catch(() => {});
  });

  return window;
}

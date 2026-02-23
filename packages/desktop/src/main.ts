import { app, BrowserWindow, nativeImage, session } from "electron";
import * as path from "path";
import { setupIpcHandlers } from "./ipc";
import { createMainWindow } from "./window";
import { initOrchestrator } from "./orchestrator-init";

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

function createWindow(): void {
  createMainWindow().then((window) => {
    mainWindow = window;

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const csp = isDev
        ? "default-src 'self'; script-src 'self' 'unsafe-inline' http://localhost:*; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss: http://localhost:*; img-src 'self' data: http://localhost:*; worker-src 'self' blob:"
        : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss:; worker-src 'self' blob:";
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [csp],
        },
      });
    });

    if (isDev) {
      mainWindow.loadURL("http://localhost:5173");
      mainWindow.webContents.openDevTools();
    } else {
      mainWindow.loadFile(path.join(__dirname, "index.html"));
    }

    initOrchestrator(mainWindow).catch((err) => {
      console.error("[kado] Orchestrator initialization failed:", err);
    });

    mainWindow.on("closed", () => {
      mainWindow = null;
    });
  });
}

app.whenReady().then(() => {
  if (process.platform === "darwin") {
    const iconPath = path.join(__dirname, "..", "build", "icon.png");
    const icon = nativeImage.createFromPath(iconPath);
    if (!icon.isEmpty()) {
      app.dock.setIcon(icon);
    }
  }

  setupIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

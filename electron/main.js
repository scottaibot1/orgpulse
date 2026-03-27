const { app, BrowserWindow, shell, Menu } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");

// URL of the deployed Vercel app — replace with your production URL
const APP_URL = process.env.APP_URL || "https://orgpulse.vercel.app";

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, "../public/icons/icon-512.png"),
    show: false,
  });

  mainWindow.loadURL(APP_URL);

  // Show once ready to avoid flash
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Open external links in the default browser, not in the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function buildMenu() {
  const template = [
    ...(process.platform === "darwin"
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [process.platform === "darwin" ? { role: "close" } : { role: "quit" }],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  createWindow();
  buildMenu();

  // Check for updates after startup (production only)
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Auto-updater events
autoUpdater.on("update-available", () => {
  const { dialog } = require("electron");
  dialog.showMessageBox({
    type: "info",
    title: "Update available",
    message: "A new version of OrgPulse is available. It will be downloaded in the background.",
  });
});

autoUpdater.on("update-downloaded", () => {
  const { dialog } = require("electron");
  dialog
    .showMessageBox({
      type: "info",
      title: "Update ready",
      message: "Update downloaded. OrgPulse will restart to apply the update.",
      buttons: ["Restart now", "Later"],
    })
    .then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
});

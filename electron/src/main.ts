import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import { bootstrap } from "../../backend/dist/main";

const SECRET_KEY = "giga-super-secret-key";

let win: BrowserWindow | null = null;
let apiPort: number;
let isQuitting = false;
let nestApp: any;

const licensePath = path.join(app.getPath("userData"), "license.json");

function verifyToken(token: string): {
  valid: boolean;
  reason?: string;
  expiresAt?: string;
} {
  try {
    const [payloadBase64, signature] = token.split(".");
    if (!payloadBase64 || !signature) {
      return { valid: false, reason: "Invalid token format." };
    }

    const expectedSignature = crypto
      .createHmac("sha256", SECRET_KEY)
      .update(payloadBase64)
      .digest("hex");

    if (signature !== expectedSignature) {
      return { valid: false, reason: "Invalid license key signature." };
    }

    const payloadJson = Buffer.from(payloadBase64, "base64").toString("utf8");
    const payload = JSON.parse(payloadJson);

    const expiresAt = new Date(payload.expiresAt);
    const now = new Date();

    if (isNaN(expiresAt.getTime())) {
      return { valid: false, reason: "Invalid expiration date in token." };
    }

    if (now > expiresAt) {
      return {
        valid: false,
        reason: "License key has expired.",
        expiresAt: payload.expiresAt,
      };
    }

    return { valid: true, expiresAt: payload.expiresAt };
  } catch {
    return { valid: false, reason: "Failed to parse token." };
  }
}

function isLicenseValid(): boolean {
  if (!fs.existsSync(licensePath)) return false;
  try {
    const data = JSON.parse(fs.readFileSync(licensePath, "utf8"));
    return verifyToken(data.key || "").valid;
  } catch {
    return false;
  }
}

function loadActivationScreen(win: BrowserWindow, errorMessage = "") {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>App Activation</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; height: 100vh; margin: 0; align-items: center; justify-content: center; }
          .card { background: #1e293b; padding: 2.5rem; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 400px; text-align: center; border: 1px solid #334155; }
          h2 { margin-top: 0; color: #38bdf8; font-size: 1.5rem; }
          p { font-size: 0.9rem; color: #94a3b8; margin-bottom: 1.5rem; }
          input { width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #fff; box-sizing: border-box; margin-bottom: 1rem; font-family: monospace; font-size: 0.85rem; word-break: break-all; }
          button { width: 100%; padding: 0.75rem; border-radius: 6px; border: none; background: #0284c7; color: white; font-weight: bold; cursor: pointer; transition: background 0.2s; }
          button:hover { background: #0369a1; }
          .error { color: #f87171; font-size: 0.85rem; margin-top: 1rem; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>License Required</h2>
          <p>Please enter your trial license key to continue using the application.</p>
          <input type="text" id="key" placeholder="Paste license key here..." />
          <button id="btn" onclick="submitKey()">Activate</button>
          <div id="error" class="error">${errorMessage}</div>
        </div>
        <script>
          function submitKey() {
            const key = document.getElementById("key").value.trim();
            if (!key) return;
            if (window.electronAPI && window.electronAPI.submitLicense) {
              window.electronAPI.submitLicense(key);
            } else {
              document.getElementById("error").innerText = "Preload bridge not loaded.";
            }
          }
        </script>
      </body>
    </html>
  `;

  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

async function bootMainApp() {
  process.env.DB_PATH = path.join(app.getPath("userData"), "lms.db");

  const { app: nest, port } = await bootstrap(0);
  nestApp = nest;
  apiPort = port;

  ipcMain.handle("get-api-port", () => apiPort);

  const isDev = !app.isPackaged;
  if (win) {
    if (isDev) {
      win.loadURL("http://localhost:5173");
    } else {
      win.loadFile(path.join(app.getAppPath(), "frontend/dist/index.html"));
    }
  }
}

async function handleLicenseSubmission(key: string) {
  const result = verifyToken(key);
  if (result.valid) {
    fs.writeFileSync(licensePath, JSON.stringify({ key }, null, 2), "utf8");
    await bootMainApp();
  } else {
    if (win) {
      loadActivationScreen(win, result.reason || "Invalid license key.");
    }
  }
}

app.whenReady().then(() => {
  const isDev = !app.isPackaged;
  const preloadPath = isDev
    ? path.join(__dirname, "preload.js")
    : path.join(app.getAppPath(), "electron/dist/preload.js");

  win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath,
    },
  });

  if (isLicenseValid()) {
    bootMainApp();
  } else {
    loadActivationScreen(win);
  }

  ipcMain.on("submit-license-key", async (_event, key: string) => {
    handleLicenseSubmission(key);
  });
});

app.on("before-quit", async (event) => {
  if (isQuitting || !nestApp) return;

  event.preventDefault();
  isQuitting = true;

  try {
    await nestApp.close();
  } finally {
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

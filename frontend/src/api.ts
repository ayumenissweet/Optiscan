let currentApiBase =
  import.meta.env.VITE_API_BASE || "http://localhost:3000/api";
let isInitialized = false;

export async function initApi(): Promise<string> {
  if (isInitialized) return currentApiBase;

  if (typeof window !== "undefined" && window.electronAPI?.getApiPort) {
    try {
      const port = await window.electronAPI.getApiPort();
      currentApiBase = `http://localhost:${port}/api`;
    } catch (err) {
      console.error("[Electron] Failed to fetch API port:", err);
    }
  }

  isInitialized = true;
  return currentApiBase;
}

export function getApiBase(): string {
  return currentApiBase;
}

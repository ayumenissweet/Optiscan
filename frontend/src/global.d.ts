export {};

declare global {
  interface Window {
    electronAPI?: {
      getApiPort: () => Promise<number>;
    };
  }
}

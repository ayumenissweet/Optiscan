import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

export default defineConfig({
  base: "./",
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  build: {
    target: "chrome108",
    cssTarget: "chrome108",
    sourcemap: true,
  },
});
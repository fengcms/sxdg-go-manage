// 开发代理遵循本项目接口合同，附件与 API 共享源。

import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api/v1": { target: `http://127.0.0.1:${process.env.SERVER_PORT || 8080}` },
      "/uploads": { target: `http://127.0.0.1:${process.env.SERVER_PORT || 8080}` },
    },
  },
  test: { environment: "jsdom", include: ["src/**/*.test.{ts,tsx}"], restoreMocks: true },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@hrms/shared": path.resolve(__dirname, "./src/shared")
    }
  },
  server: {
    port: 5173,
    proxy: {
      "/auth": {
        target: "http://localhost:4000",
        changeOrigin: true
      },
      "/employees": {
        target: "http://localhost:4000",
        changeOrigin: true
      },
      "/attendance": {
        target: "http://localhost:4000",
        changeOrigin: true
      },
      "/leave-requests": {
        target: "http://localhost:4000",
        changeOrigin: true
      },
      "/payroll": {
        target: "http://localhost:4000",
        changeOrigin: true
      }
    }
  }
});

import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { createApiMiddleware } from "./server/api.mjs";

function campusApiPlugin(): Plugin {
  return {
    name: "campusos-api",
    configureServer(server) {
      server.middlewares.use(createApiMiddleware());
    },
    configurePreviewServer(server) {
      server.middlewares.use(createApiMiddleware());
    }
  };
}

export default defineConfig({
  plugins: [react(), campusApiPlugin()],
  server: {
    port: 5173
  },
  preview: {
    port: 4173
  }
});

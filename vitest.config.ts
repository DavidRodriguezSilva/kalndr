import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // El dominio es logica pura y determinista: corre en Node, sin navegador.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});

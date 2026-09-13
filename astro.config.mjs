// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwind from "@tailwindcss/vite";

/**
 * El origen y el prefijo de ruta viven en variables de entorno para que mudar
 * el sitio de `usuario.github.io/kalndr` a un dominio propio sea un cambio de
 * configuracion, no una reescritura: todas las URL absolutas del sitio
 * (canonical, sitemap, JSON-LD, API) se derivan de aqui.
 *
 *   SITE_URL=https://kalndr.co BASE_PATH=/ pnpm build
 */
const site = process.env.SITE_URL ?? "https://DavidRodriguezSilva.github.io";
const base = process.env.BASE_PATH ?? "/kalndr";

export default defineConfig({
  site,
  base,
  trailingSlash: "always",
  build: {
    // Una carpeta por ruta (`/2026/index.html`) para que las URL no lleven
    // extension y GitHub Pages las sirva tal cual.
    format: "directory",
  },
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwind()],
  },
});

// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import AstroPWA from "@vite-pwa/astro";
import tailwind from "@tailwindcss/vite";

/**
 * El origen y el prefijo de ruta viven en variables de entorno para que mudar
 * el sitio de `usuario.github.io/kalndr` a un dominio propio sea un cambio de
 * configuracion, no una reescritura: todas las URL absolutas del sitio
 * (canonical, sitemap, JSON-LD, API) se derivan de aqui.
 *
 *   SITE_URL=https://kalndr.co BASE_PATH=/ pnpm build
 */
const site = process.env.SITE_URL ?? "https://davidrodriguezsilva.github.io";
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
  integrations: [
    react(),
    sitemap(),
    /**
     * Instalable y offline.
     *
     * No es adorno: el calculo entero vive en el navegador, asi que una vez
     * cargada la aplicacion responde sin red —que es justo la situacion en la
     * que alguien mira si el lunes es festivo, de pie y con mala senal. Lo
     * unico que necesita conexion es estrenar un anio que no se haya visto.
     */
    AstroPWA({
      registerType: "autoUpdate",
      base,
      scope: base,
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "KALNDR — Festivos de Colombia",
        short_name: "KALNDR",
        description: "Los festivos de Colombia, claros y calculados.",
        lang: "es-CO",
        theme_color: "#14171d",
        background_color: "#14171d",
        display: "standalone",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Se precachean las paginas y lo que hace falta para pintarlas. Las
        // imagenes para compartir no: nadie las mira desde el sitio, y son
        // casi un megabyte que no tiene por que vivir en el telefono.
        globPatterns: ["**/*.{html,css,js,svg,woff2,txt,ico}"],
        globIgnores: ["**/og/**", "**/api/v1/**"],
        navigateFallback: `${base}/`,
        runtimeCaching: [
          {
            // La API se sirve de cache y se refresca por detras: el dato de un
            // anio no cambia, y cuando cambia una ley se republica el sitio.
            urlPattern: /\/api\/v1\/.*\.(json|ics)$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "kalndr-api",
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: "CacheFirst",
            options: {
              cacheName: "kalndr-fuentes",
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  vite: {
    plugins: [tailwind()],
  },
});

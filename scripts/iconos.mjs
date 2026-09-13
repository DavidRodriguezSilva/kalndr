/**
 * Genera los iconos de la aplicación a partir de la marca.
 *
 * Se corre a mano (`pnpm iconos`) y la salida se versiona: son archivos que
 * cambian una vez al año, y generarlos en cada build obligaría a arrastrar un
 * renderizador nativo al despliegue para nada.
 *
 * Las imágenes para compartir en redes sí se generan en el build, porque hay
 * una por página y dependen del contenido: ver `src/pages/og/`.
 */
import { writeFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";
import { faviconSvg, iconoAppSvg } from "../src/seo/marca.ts";

const TAMANOS = [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
];

await writeFile("public/favicon.svg", `${faviconSvg()}\n`);
console.log("public/favicon.svg");

for (const [nombre, lado] of TAMANOS) {
  const png = new Resvg(iconoAppSvg(lado), { fitTo: { mode: "width", value: lado } })
    .render()
    .asPng();
  await writeFile(`public/${nombre}`, png);
  console.log(`public/${nombre} (${lado}×${lado})`);
}

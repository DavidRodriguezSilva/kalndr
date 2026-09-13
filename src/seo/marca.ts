/**
 * La marca, en un solo sitio.
 *
 * Un cuadrado redondeado, una línea y un punto: un calendario con un día
 * marcado. No hay anillas, ni número, ni degradado — a 16 píxeles en una
 * pestaña nada de eso sobrevive, y ese es el tamaño en que más se va a ver.
 *
 * El mismo trazo sirve para el favicon, para los iconos de la aplicación y
 * para la cabecera; de ahí que viva aquí y no repetido en cada uno.
 */

export const TINTA = "#14171d";
export const AMBAR = "#e8b14b";

/** El trazo, sin color propio: hereda `currentColor` de quien lo use. */
export function trazoMarca(grosor = 2): string {
  return `<rect x="3" y="4" width="18" height="17" rx="4.5" fill="none" stroke="currentColor" stroke-width="${grosor}"/><path d="M3.6 9.6h16.8" stroke="currentColor" stroke-width="${grosor}" stroke-linecap="round"/><circle cx="16" cy="15.6" r="2.1" fill="currentColor"/>`;
}

/** Favicon: fondo transparente, trazo ámbar. Se ve igual en pestaña clara u oscura. */
export function faviconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" color="${AMBAR}">${trazoMarca(2.1)}</svg>`;
}

/** Icono de aplicación: cuadrado lleno, para lanzadores y pantalla de inicio. */
export function iconoAppSvg(lado: number): string {
  const radio = Math.round(lado * 0.22);
  const margen = lado * 0.2;
  const interior = lado - margen * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 ${lado} ${lado}">
  <rect width="${lado}" height="${lado}" rx="${radio}" fill="${TINTA}"/>
  <svg x="${margen}" y="${margen}" width="${interior}" height="${interior}" viewBox="0 0 24 24" fill="none" color="${AMBAR}">${trazoMarca(2.2)}</svg>
</svg>`;
}

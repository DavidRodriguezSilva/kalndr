/**
 * Identidad del sitio en un solo lugar.
 *
 * Todo lo que se publica hacia afuera —titulo, descripcion, URL canonica,
 * JSON-LD, sitemap, API— sale de aqui. Mudar el sitio a un dominio propio es
 * cambiar `SITE_URL` en el entorno, no buscar cadenas por el repositorio.
 */
export const SITIO = {
  nombre: "KALNDR",
  /** Lo que el sitio hace, en una linea. Va en la home y en la API. */
  lema: "Los festivos de Colombia, claros y calculados.",
  descripcion:
    "Calendario de los festivos de Colombia: fechas exactas, qué se traslada al lunes por la Ley Emiliani, cuántos días de descanso quedan y cuándo cae el próximo puente.",
  idioma: "es-CO",
  pais: "CO",
  zona: "America/Bogota",
  autor: "DarkForest",
  repositorio: "https://github.com/DavidRodriguezSilva/kalndr",
} as const;

/** Origen absoluto del sitio, sin barra final. */
export const ORIGEN: string = (
  import.meta.env.SITE ?? "https://DavidRodriguezSilva.github.io"
).replace(/\/$/, "");

/** Prefijo de ruta, siempre con barra final: `/kalndr/` o `/`. */
export const BASE: string = import.meta.env.BASE_URL.endsWith("/")
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

/** Ruta interna -> ruta servible, con el prefijo de despliegue aplicado. */
export function ruta(camino: string): string {
  return `${BASE}${camino.replace(/^\//, "")}`;
}

/** Ruta interna -> URL absoluta. La que va en canonical, sitemap y JSON-LD. */
export function url(camino: string): string {
  return `${ORIGEN}${ruta(camino)}`;
}

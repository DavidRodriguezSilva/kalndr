import { AMBAR, TINTA, trazoMarca } from "./marca";

/**
 * La imagen que se ve cuando alguien pega una URL del sitio en WhatsApp,
 * Twitter, LinkedIn o Slack.
 *
 * Se dibuja como SVG y se rasteriza en el build: una por página, con el dato
 * concreto de esa página. Pegar el enlace del 17 de agosto tiene que mostrar
 * "La Asunción de la Virgen · lunes 17 de agosto", no un logo genérico —
 * porque en una conversación de WhatsApp esa tarjeta *es* la respuesta, y
 * muchas veces nadie llega a abrir el enlace.
 *
 * El texto se compone con fuentes del sistema (DejaVu está en cualquier
 * Ubuntu, incluido el runner de CI), así que las medidas van holgadas: si la
 * fuente real es un poco más ancha, no se sale.
 */
export interface Tarjeta {
  /** Línea pequeña de arriba: la sección o la fecha. */
  readonly etiqueta: string;
  /** El titular. Se parte en dos líneas si hace falta. */
  readonly titulo: string;
  /** Una línea de apoyo debajo. */
  readonly pie: string;
  /** Color de acento; por defecto el ámbar de la marca. */
  readonly acento?: string;
}

const ANCHO = 1200;
const ALTO = 630;
const MARGEN = 80;
const UTIL = ANCHO - MARGEN * 2;

/**
 * Ancho medio de un caracter, en fracciones del tamanio de fuente, para
 * DejaVu Sans. No es una medida exacta —no hay como medir texto sin
 * rasterizar— pero es conservadora, y de eso se trata: la tarjeta se corta si
 * el texto se pasa, y un titular un poco mas pequenio de lo necesario no lo
 * nota nadie.
 */
const ANCHO_NEGRITA = 0.63;
const ANCHO_NORMAL = 0.56;

function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Reparte el texto en lineas que quepan en `maxCaracteres`. */
function enLineas(texto: string, maxCaracteres: number): string[] {
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of texto.split(" ")) {
    const tentativa = actual ? `${actual} ${palabra}` : palabra;
    if (tentativa.length > maxCaracteres && actual) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = tentativa;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

/**
 * Busca el tamanio mas grande con el que el titular cabe en dos lineas.
 * Bajar de tamanio es preferible a cortar con puntos suspensivos: el nombre
 * del festivo es justo lo que la tarjeta tiene que comunicar.
 */
function ajustarTitulo(texto: string): { lineas: string[]; tamano: number } {
  for (const tamano of [96, 84, 72, 62, 54, 46]) {
    const presupuesto = Math.floor(UTIL / (tamano * ANCHO_NEGRITA));
    const lineas = enLineas(texto, presupuesto);
    if (lineas.length <= 2 && lineas.every((l) => l.length <= presupuesto)) {
      return { lineas, tamano };
    }
  }
  return { lineas: enLineas(texto, 30).slice(0, 2), tamano: 46 };
}

/** El tamanio mas grande con el que una linea suelta cabe de una sola pieza. */
function ajustarLinea(texto: string, maximo: number, minimo: number): number {
  const cabe = Math.floor(UTIL / (texto.length * ANCHO_NORMAL));
  return Math.max(minimo, Math.min(maximo, cabe));
}

export function tarjetaSvg({ etiqueta, titulo, pie, acento = AMBAR }: Tarjeta): string {
  const { lineas, tamano } = ajustarTitulo(titulo);
  // Con dos lineas el titular ocupa mas alto: el pie baja para que la "q" de
  // la segunda linea no roce la fecha.
  const primeraY = lineas.length > 1 ? 286 : 332;
  const pieY = lineas.length > 1 ? 478 : 452;
  const tamanoEtiqueta = ajustarLinea(etiqueta, 30, 20);
  const tamanoPie = ajustarLinea(pie, 34, 22);

  const titulares = lineas
    .map(
      (linea, i) =>
        `<text x="${MARGEN}" y="${primeraY + i * (tamano + 14)}" font-family="DejaVu Sans, Ubuntu, sans-serif" font-size="${tamano}" font-weight="bold" fill="#f4f5f7">${escapar(linea)}</text>`
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">
  <rect width="${ANCHO}" height="${ALTO}" fill="${TINTA}"/>
  <rect x="0" y="0" width="14" height="${ALTO}" fill="${acento}"/>

  <svg x="${MARGEN}" y="72" width="56" height="56" viewBox="0 0 24 24" fill="none" color="${acento}">${trazoMarca(2.2)}</svg>
  <text x="${MARGEN + 72}" y="112" font-family="DejaVu Sans Mono, monospace" font-size="34" font-weight="bold" letter-spacing="4" fill="#f4f5f7">KALNDR</text>

  <text x="${MARGEN}" y="212" font-family="DejaVu Sans, sans-serif" font-size="${tamanoEtiqueta}" letter-spacing="2" fill="${acento}">${escapar(etiqueta.toUpperCase())}</text>
  ${titulares}
  <text x="${MARGEN}" y="${pieY}" font-family="DejaVu Sans, sans-serif" font-size="${tamanoPie}" fill="#9ca3af">${escapar(pie)}</text>

  <rect x="${MARGEN}" y="524" width="${UTIL}" height="1" fill="#2f3440"/>
  <text x="${MARGEN}" y="576" font-family="DejaVu Sans, sans-serif" font-size="26" fill="#6b7280">Festivos de Colombia \u00b7 calculados, no copiados</text>
</svg>`;
}

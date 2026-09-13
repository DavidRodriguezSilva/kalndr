import type { Festivo } from "@/domain/tipos";
import { SITIO, url } from "./sitio";

/**
 * Datos estructurados.
 *
 * Sirven a dos lectores a la vez. Al buscador, para entender que la pagina
 * responde una pregunta de fechas. Y al agente o modelo que llega a leerla,
 * para extraer las fechas sin tener que interpretar el HTML — que es, cada vez
 * mas, quien realmente consulta esto.
 */

export function sitioWeb() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITIO.nombre,
    alternateName: "KALNDR — Festivos de Colombia",
    url: url("/"),
    description: SITIO.descripcion,
    inLanguage: SITIO.idioma,
    publisher: { "@type": "Organization", name: SITIO.autor, url: SITIO.repositorio },
  };
}

/** Un festivo como evento fechado, con su traslado explicado si lo hubo. */
export function eventoFestivo(festivo: Festivo) {
  return {
    "@type": "Event",
    name: festivo.nombre,
    startDate: festivo.fecha,
    endDate: festivo.fecha,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: { "@type": "Country", name: "Colombia" },
    description: festivo.trasladado
      ? `Se celebra el ${festivo.fechaOriginal}, y por la Ley Emiliani el descanso se traslada al lunes ${festivo.fecha}.`
      : `Festivo nacional en Colombia el ${festivo.fecha}.`,
  };
}

export function listaFestivos(anio: number, festivos: readonly Festivo[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Festivos de Colombia ${anio}`,
    numberOfItems: festivos.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: festivos.map((f, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: eventoFestivo(f),
    })),
  };
}

/**
 * Preguntas frecuentes. No es relleno de SEO: son las preguntas con las que la
 * gente llega, y responderlas en la pagina es la razon por la que se queda.
 */
export function preguntas(pares: readonly { pregunta: string; respuesta: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: pares.map(({ pregunta, respuesta }) => ({
      "@type": "Question",
      name: pregunta,
      acceptedAnswer: { "@type": "Answer", text: respuesta },
    })),
  };
}

export function migaDePan(pasos: readonly { nombre: string; camino: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: pasos.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.nombre,
      item: url(p.camino),
    })),
  };
}

/** El conjunto de datos que la API expone, declarado como tal. */
export function conjuntoDeDatos() {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Festivos de Colombia",
    description:
      "Fechas de los festivos nacionales de Colombia calculadas a partir de la Ley 51 de 1983, la Ley 2578 de 2026 y el cómputo del Domingo de Pascua.",
    license: "https://opensource.org/licenses/MIT",
    creator: { "@type": "Organization", name: SITIO.autor },
    isAccessibleForFree: true,
    distribution: [
      {
        "@type": "DataDownload",
        encodingFormat: "application/json",
        contentUrl: url("/api/v1/festivos/2026.json"),
      },
    ],
  };
}

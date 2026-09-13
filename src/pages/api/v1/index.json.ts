import type { APIRoute } from "astro";
import { SITIO, url } from "@/seo/sitio";
import { ANIO_MAXIMO_CALCULABLE, ANIO_REGIMEN_ACTUAL, anioActual } from "@/domain/festivos";
import { CAPAS } from "@/domain/capas";

/**
 * Documento de descubrimiento: la puerta de entrada para un agente.
 *
 * Un modelo que llega a este sitio no deberia tener que adivinar rutas. Este
 * archivo dice que hay, como se llama, en que rango vive y bajo que licencia
 * se puede usar. Es el equivalente para maquinas de la pagina de inicio.
 */
export const GET: APIRoute = () => {
  const cuerpo = {
    nombre: SITIO.nombre,
    descripcion: SITIO.descripcion,
    version: "1",
    pais: "CO",
    idioma: SITIO.idioma,
    zonaHoraria: SITIO.zona,
    licencia: "MIT",
    repositorio: SITIO.repositorio,
    anioActual: anioActual(),
    rangoDisponible: { desde: ANIO_REGIMEN_ACTUAL, hasta: ANIO_MAXIMO_CALCULABLE },
    endpoints: [
      {
        ruta: url("/api/v1/festivos/{anio}.json"),
        descripcion: "Festivos nacionales del año, con traslados explicados.",
        ejemplo: url(`/api/v1/festivos/${anioActual()}.json`),
      },
      {
        ruta: url("/api/v1/festivos/{anio}.ics"),
        descripcion: "El mismo año como calendario iCalendar, suscribible.",
        ejemplo: url(`/api/v1/festivos/${anioActual()}.ics`),
      },
      {
        ruta: url("/api/v1/proximo.json"),
        descripcion: "El próximo festivo a partir de hoy, con los días que faltan.",
      },
    ],
    capas: CAPAS.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      descripcion: c.descripcion,
      porDefecto: c.porDefecto,
    })),
    notas: [
      "Las fechas se calculan con la Ley 51 de 1983 (traslado al lunes) y la Ley 2578 de 2026 (Virgen del Rosario de Chiquinquirá, desde 2026).",
      "Los años anteriores a 1984 se calculan con la ley vigente hoy y no reflejan lo que el país descansó entonces.",
      "Dos celebraciones pueden caer el mismo día; en esos años hay más festivos que días de descanso.",
    ],
  };

  return new Response(JSON.stringify(cuerpo, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
    },
  });
};

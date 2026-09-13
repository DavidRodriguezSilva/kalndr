import type { APIRoute } from "astro";
import {
  ANIO_REGIMEN_ACTUAL,
  calcularFestivos,
  coincidencias,
  diasNoLaborables,
} from "@/domain/festivos";
import { formatoLargo, nombreDia } from "@/domain/fechas";
import { url } from "@/seo/sitio";
import { ANIOS_API } from "@/lib/rangos";

/**
 * La misma informacion que ve una persona, servida como datos.
 *
 * Un agente que quiera responder "cuando es el proximo festivo en Colombia" no
 * deberia tener que raspar HTML. Esto es un archivo JSON estatico, generado en
 * el build, servido por GitHub Pages: sin servidor, sin limite de peticiones,
 * sin llave de API.
 *
 * Cada respuesta se explica a si misma. Trae el nombre del dia y la fecha en
 * palabras ya resueltos —porque quien consume esto suele estar componiendo una
 * frase en espaniol— y dice por que una fecha se movio.
 */
export function getStaticPaths() {
  return ANIOS_API.map((anio) => ({ params: { anio: String(anio) } }));
}

export const GET: APIRoute = ({ params }) => {
  const anio = Number(params.anio);
  const festivos = calcularFestivos(anio);
  const dias = diasNoLaborables(anio);
  const juntos = coincidencias(anio);

  const cuerpo = {
    $schema: url("/api/v1/esquema.json"),
    pais: "CO",
    anio,
    zonaHoraria: "America/Bogota",
    totalFestivos: festivos.length,
    totalDiasNoLaborables: dias.length,
    ...(juntos.length > 0
      ? {
          nota: `Dos celebraciones comparten fecha, así que ${anio} tiene ${festivos.length} festivos pero solo ${dias.length} días de descanso.`,
          coincidencias: juntos.map((grupo) => ({
            fecha: grupo[0]!.fecha,
            celebraciones: grupo.map((f) => f.nombre),
          })),
        }
      : {}),
    ...(anio < ANIO_REGIMEN_ACTUAL
      ? {
          advertencia:
            "Este año es anterior a la entrada en vigencia de la Ley 51 de 1983. Las fechas se calculan con la ley de hoy, no con la que regía entonces.",
        }
      : {}),
    festivos: festivos.map((f) => ({
      fecha: f.fecha,
      diaSemana: nombreDia(f.fecha),
      fechaLarga: formatoLargo(f.fecha),
      nombre: f.nombre,
      slug: f.slug,
      clase: f.clase,
      regla: f.regla,
      trasladado: f.trasladado,
      ...(f.fechaOriginal ? { fechaOriginal: f.fechaOriginal } : {}),
      ...(f.trasladado
        ? {
            explicacion: `Se celebra el ${formatoLargo(f.fechaOriginal!)}, y la Ley Emiliani traslada el descanso al lunes siguiente.`,
          }
        : {}),
    })),
    fuente: url(`/festivos/${anio}/`),
    licencia: "MIT",
  };

  return new Response(JSON.stringify(cuerpo, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
    },
  });
};

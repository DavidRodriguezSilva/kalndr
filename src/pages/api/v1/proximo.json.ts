import type { APIRoute } from "astro";
import { anioActual, calcularFestivos } from "@/domain/festivos";
import { diasEntre, formatoLargo, nombreDia } from "@/domain/fechas";
import { url } from "@/seo/sitio";

/**
 * El proximo festivo.
 *
 * Se calcula en el build, asi que "hoy" es el dia en que se publico el sitio.
 * La respuesta lo dice sin rodeos en `calculadoEl` y trae el anio completo
 * para que quien la consuma pueda recalcular contra su propio reloj en vez de
 * confiar en el nuestro. Fingir que un archivo estatico sabe la fecha de hoy
 * seria mentir a quien mas necesita precision.
 */
export const GET: APIRoute = () => {
  const anio = anioActual();
  const hoy = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const candidatos = [...calcularFestivos(anio), ...calcularFestivos(anio + 1)];
  const proximo = candidatos.find((f) => f.fecha >= hoy)!;

  const cuerpo = {
    calculadoEl: hoy,
    advertencia:
      "Este archivo es estático: se generó el día del despliegue. Para una respuesta exacta, compara con tu propia fecha usando el listado del año.",
    proximo: {
      fecha: proximo.fecha,
      diaSemana: nombreDia(proximo.fecha),
      fechaLarga: formatoLargo(proximo.fecha),
      nombre: proximo.nombre,
      slug: proximo.slug,
      diasFaltantes: diasEntre(hoy, proximo.fecha),
      trasladado: proximo.trasladado,
    },
    anioCompleto: url(`/api/v1/festivos/${anio}.json`),
  };

  return new Response(JSON.stringify(cuerpo, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
    },
  });
};

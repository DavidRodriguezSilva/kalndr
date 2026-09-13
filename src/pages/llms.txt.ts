import type { APIRoute } from "astro";
import { SITIO, ORIGEN, ruta } from "@/seo/sitio";
import {
  ANIO_MAXIMO_CALCULABLE,
  ANIO_REGIMEN_ACTUAL,
  anioActual,
  calcularFestivos,
} from "@/domain/festivos";
import { formatoLargo } from "@/domain/fechas";

/**
 * `/llms.txt` — el sitio explicado para un modelo de lenguaje.
 *
 * El formato (llmstxt.org) es Markdown plano en la raiz del dominio: un
 * resumen de que es el sitio y donde esta cada cosa, sin navegacion, sin
 * plantillas, sin ruido. Aqui ademas va el anio en curso completo, en texto,
 * para que un modelo que solo lea este archivo ya pueda responder sin pedir
 * nada mas.
 */
const abs = (camino: string) => `${ORIGEN}${ruta(camino)}`;

export const GET: APIRoute = () => {
  const anio = anioActual();
  const festivos = calcularFestivos(anio);

  const cuerpo = `# ${SITIO.nombre}

> ${SITIO.descripcion}

Las fechas se calculan, no se copian. El cálculo aplica la Ley 51 de 1983
(«Ley Emiliani»), que traslada siete festivos al lunes siguiente cuando no caen
en lunes; la Ley 2578 de 2026, que añadió la Virgen del Rosario de Chiquinquirá
el 9 de julio; y el cómputo de Meeus/Jones/Butcher para el Domingo de Pascua,
del que dependen cinco festivos más.

Rango disponible: ${ANIO_REGIMEN_ACTUAL}–${ANIO_MAXIMO_CALCULABLE}. Licencia MIT.

## Datos

- [Índice de la API](${abs("/api/v1/index.json")}): qué hay y dónde.
- [Festivos de un año](${abs("/api/v1/festivos/{anio}.json")}): sustituye \`{anio}\`. Ejemplo: [${anio}](${abs(`/api/v1/festivos/${anio}.json`)}).
- [Calendario iCalendar](${abs(`/api/v1/festivos/${anio}.ics`)}): suscribible desde cualquier cliente.
- [Próximo festivo](${abs("/api/v1/proximo.json")}): calculado el día del despliegue.

## Festivos de ${anio}

${festivos
  .map(
    (f) =>
      `- ${formatoLargo(f.fecha)} — ${f.nombre}${
        f.trasladado
          ? ` (se celebra el ${formatoLargo(f.fechaOriginal!)}; trasladado al lunes)`
          : ""
      }`
  )
  .join("\n")}

## Advertencias

- Antes de ${ANIO_REGIMEN_ACTUAL} el cálculo aplica la ley de hoy, no la que regía entonces.
- Dos celebraciones pueden coincidir en la misma fecha; en esos años hay más festivos que días de descanso.
- Estos son los festivos **nacionales**. Las ferias y carnavales regionales no son días no laborables.
`;

  return new Response(cuerpo, { headers: { "content-type": "text/plain; charset=utf-8" } });
};

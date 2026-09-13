import type { APIRoute } from "astro";
import { calcularFestivos } from "@/domain/festivos";
import { sumarDias } from "@/domain/fechas";
import { SITIO, url } from "@/seo/sitio";
import { ANIOS_API } from "@/lib/rangos";

/**
 * El anio como calendario iCalendar.
 *
 * Es la forma mas util que puede tomar este dato: en vez de mirar una pagina,
 * el usuario se suscribe una vez y los festivos aparecen dentro de su propio
 * calendario. Tambien es lo que un asistente necesita para agendar algo sin
 * pisar un festivo.
 */
export function getStaticPaths() {
  return ANIOS_API.map((anio) => ({ params: { anio: String(anio) } }));
}

const sinSaltos = (texto: string) => texto.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
const compacta = (fecha: string) => fecha.replace(/-/g, "");

export const GET: APIRoute = ({ params }) => {
  const anio = Number(params.anio);
  const festivos = calcularFestivos(anio);

  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${SITIO.autor}//${SITIO.nombre}//ES`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${sinSaltos(`Festivos de Colombia ${anio}`)}`,
    `X-WR-TIMEZONE:${SITIO.zona}`,
    ...festivos.flatMap((f) => [
      "BEGIN:VEVENT",
      `UID:${f.slug}-${anio}@kalndr`,
      `DTSTAMP:${compacta(f.fecha)}T000000Z`,
      // Evento de dia completo: DTEND es exclusivo, va al dia siguiente.
      `DTSTART;VALUE=DATE:${compacta(f.fecha)}`,
      `DTEND;VALUE=DATE:${compacta(sumarDias(f.fecha, 1))}`,
      `SUMMARY:${sinSaltos(f.nombre)}`,
      `DESCRIPTION:${sinSaltos(
        f.trasladado
          ? `Se celebra el ${f.fechaOriginal}; el descanso se traslada al lunes por la Ley Emiliani.`
          : "Festivo nacional en Colombia."
      )}`,
      `URL:${url(`/festivos/${anio}/`)}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];

  // iCalendar exige CRLF; un salto de linea suelto rompe el parseo en algunos
  // clientes de escritorio.
  return new Response(`${lineas.join("\r\n")}\r\n`, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "access-control-allow-origin": "*",
    },
  });
};

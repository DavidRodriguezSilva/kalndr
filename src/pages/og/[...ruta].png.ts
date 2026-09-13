import type { APIRoute } from "astro";
import { Resvg } from "@resvg/resvg-js";
import { SITIO } from "@/seo/sitio";
import { tarjetaSvg, type Tarjeta } from "@/seo/tarjeta";
import { anioActual, calcularFestivos, diasNoLaborables } from "@/domain/festivos";
import { formatoLargo, nombreMes } from "@/domain/fechas";
import { EVENTOS, entradaDeEvento } from "@/domain/eventos";
import { ANIOS_PAGINA } from "@/lib/rangos";

/**
 * Una imagen para compartir por cada página que se puede compartir.
 *
 * Se generan todas en el build, así que GitHub Pages sirve PNG estáticos y no
 * hace falta ningún servicio de imágenes.
 */
export function getStaticPaths() {
  const anio = anioActual();
  const festivos = calcularFestivos(anio);
  const dias = diasNoLaborables(anio);

  const inicio: { params: { ruta: string }; props: Tarjeta } = {
    params: { ruta: "inicio" },
    props: {
      etiqueta: `Colombia · ${anio}`,
      titulo: `${festivos.length} festivos, ${dias.length} días de descanso`,
      pie: SITIO.lema,
    },
  };

  const anios = ANIOS_PAGINA.map((a) => {
    const lista = calcularFestivos(a);
    const puentes = lista.filter((f) => new Date(`${f.fecha}T00:00:00Z`).getUTCDay() === 1);
    return {
      params: { ruta: `festivos/${a}` },
      props: {
        etiqueta: `Festivos ${a}`,
        titulo: `${lista.length} festivos en Colombia`,
        pie: `${puentes.length} caen en lunes y hacen puente`,
      } satisfies Tarjeta,
    };
  });

  /** «14 – 17 de febrero de 2026» en vez de repetir el mes y el año dos veces. */
  const comoRango = (inicio: string, fin: string) => {
    if (inicio === fin) return formatoLargo(inicio);
    const mismoMes = inicio.slice(0, 7) === fin.slice(0, 7);
    if (mismoMes) {
      return `${Number(inicio.slice(8))} – ${Number(fin.slice(8))} de ${nombreMes(inicio)} de ${inicio.slice(0, 4)}`;
    }
    return `${Number(inicio.slice(8))} de ${nombreMes(inicio)} – ${Number(fin.slice(8))} de ${nombreMes(fin)} de ${fin.slice(0, 4)}`;
  };

  const festividades = EVENTOS.map((evento) => {
    const entrada = entradaDeEvento(evento, anio);
    return {
      params: { ruta: `festividades/${evento.id}` },
      props: {
        etiqueta: evento.lugar,
        titulo: evento.titulo,
        pie: entrada ? comoRango(entrada.inicio, entrada.fin) : evento.descripcion,
        acento: "#5fb8c4",
      } satisfies Tarjeta,
    };
  });

  return [inicio, ...anios, ...festividades];
}

export const GET: APIRoute = ({ props }) => {
  const png = new Resvg(tarjetaSvg(props as Tarjeta), {
    fitTo: { mode: "width", value: 1200 },
    font: { loadSystemFonts: true, defaultFontFamily: "DejaVu Sans" },
  })
    .render()
    .asPng();

  return new Response(new Uint8Array(png), {
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
};

import type { Anio, FechaISO } from "./tipos";
import { resolver, type Regla } from "./reglas";
import datos from "@/data/temas.json";

/**
 * Temas de temporada.
 *
 * Un calendario que se ve igual el 24 de diciembre que un martes de marzo
 * desperdicia lo único que sabe de verdad: en qué momento del año está el
 * visitante. Así que la apariencia cambia sola —Carnaval, Semana Santa,
 * diciembre, lluvias, seco— y el usuario que entra dos veces al año nota que
 * el sitio estaba al tanto.
 *
 * Cada tema declara *cuándo* rige con las mismas reglas de recurrencia que
 * usan las fiestas (`reglas.ts`): no hay un segundo motor de fechas, y por
 * eso un tema atado a la Pascua se mueve solo cada año.
 *
 * El tema no aporta color propio: sobreescribe tokens que ya existen en
 * `styles/tokens.css`, desde `styles/temas/<id>.css`. Si ningún tema aplica,
 * manda el contrato base, que es un tema válido y no un caso degenerado.
 */
export interface Tema {
  /** Va en `data-tema` y da nombre al archivo CSS. */
  readonly id: string;
  readonly nombre: string;
  readonly descripcion: string;
  /** Gana el más alto cuando dos temas se solapan. */
  readonly prioridad: number;
  /** Uno o varios periodos; las lluvias son dos, no uno. */
  readonly reglas: readonly Regla[];
}

export const TEMAS: readonly Tema[] = datos as readonly Tema[];

function cubre(tema: Tema, fecha: FechaISO, anio: Anio): boolean {
  return tema.reglas.some((regla) => {
    const periodo = resolver(regla, anio);
    return periodo !== undefined && fecha >= periodo.inicio && fecha <= periodo.fin;
  });
}

/**
 * El tema que rige una fecha, o `undefined` si manda el contrato base.
 *
 * Mira también el año anterior porque hay periodos que cruzan el fin de año:
 * el 3 de enero pertenece a la temporada de diciembre que arrancó el 1 de
 * diciembre del año pasado.
 */
export function temaActivo(fecha: FechaISO): Tema | undefined {
  const anio = Number(fecha.slice(0, 4));
  return TEMAS.filter((t) => cubre(t, fecha, anio) || cubre(t, fecha, anio - 1)).sort(
    (a, b) => b.prioridad - a.prioridad || a.id.localeCompare(b.id)
  )[0];
}

/**
 * Los periodos de cada tema para un año, resueltos a fechas concretas.
 *
 * Es lo que se inyecta en la página para que el navegador pueda recalcular el
 * tema con la fecha real del visitante sin tener que enviarle el motor de
 * reglas entero.
 */
export function calendarioDeTemas(
  anio: Anio
): readonly { id: string; inicio: FechaISO; fin: FechaISO; prioridad: number }[] {
  return TEMAS.flatMap((tema) =>
    tema.reglas
      .map((regla) => resolver(regla, anio))
      .filter((p): p is NonNullable<typeof p> => p !== undefined)
      .map((p) => ({ id: tema.id, inicio: p.inicio, fin: p.fin, prioridad: tema.prioridad }))
  ).sort((a, b) => a.inicio.localeCompare(b.inicio));
}

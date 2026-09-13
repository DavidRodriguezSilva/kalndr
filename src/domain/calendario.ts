import type { Anio, EntradaCalendario, FechaISO } from "./tipos";
import { CAPAS, CAPAS_POR_DEFECTO } from "./capas";
import { diaSemana, diasEntre } from "./fechas";

/**
 * Composicion del calendario a partir de las capas encendidas.
 *
 * Con `activas` vacio el resultado es una lista vacia: el calendario plano,
 * solo los dias del mes. Es una vista deliberada, no un caso degenerado.
 */
export function calendario(
  anio: Anio,
  activas: readonly string[] = CAPAS_POR_DEFECTO
): EntradaCalendario[] {
  return CAPAS.filter((c) => activas.includes(c.id))
    .flatMap((c) => c.entradas(anio))
    .sort((a, b) => a.inicio.localeCompare(b.inicio) || a.nombre.localeCompare(b.nombre));
}

/**
 * La siguiente entrada a partir de una fecha dada, inclusive.
 *
 * Mira tambien el anio siguiente: preguntar el 28 de diciembre cual es el
 * proximo festivo tiene que responder el 1 de enero, no "no hay".
 */
export function proxima(
  desde: FechaISO,
  activas: readonly string[] = CAPAS_POR_DEFECTO
): EntradaCalendario | undefined {
  const anio = Number(desde.slice(0, 4));
  return [...calendario(anio, activas), ...calendario(anio + 1, activas)].find(
    (e) => e.fin >= desde
  );
}

/**
 * Puentes: un festivo en lunes convierte el fin de semana en tres dias
 * seguidos de descanso. Es de las preguntas mas frecuentes del anio y merece
 * su propia respuesta en vez de dejarsela al usuario contando con los dedos.
 */
export function puentes(anio: Anio): EntradaCalendario[] {
  return calendario(anio, ["festivos"]).filter((e) => diaSemana(e.inicio) === 1);
}

/** Dias que faltan de `hoy` a la entrada. Negativo si ya paso. */
export function diasHasta(hoy: FechaISO, entrada: EntradaCalendario): number {
  return diasEntre(hoy, entrada.inicio);
}

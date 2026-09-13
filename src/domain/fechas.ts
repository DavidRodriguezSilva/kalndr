/**
 * Aritmetica de fechas civiles, sin zona horaria.
 *
 * Todo el sitio habla en cadenas `YYYY-MM-DD`. Convertirlas a `Date` local
 * introduce el desfase de zona (UTC-5 en Colombia) y mueve fechas un dia
 * completo, asi que aqui se usa siempre el calendario UTC como aritmetica
 * pura: un `Date` construido con `Date.UTC` es un contador de dias, no un
 * instante en el tiempo de nadie.
 */
import type { FechaISO } from "./tipos";

const MS_POR_DIA = 86_400_000;

/** `2026-08-17` -> `Date` UTC de ese dia a medianoche. */
export function aDate(fecha: FechaISO): Date {
  const [anio, mes, dia] = fecha.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(anio, mes - 1, dia));
}

/** `Date` UTC -> `2026-08-17`. */
export function aISO(fecha: Date): FechaISO {
  return fecha.toISOString().slice(0, 10);
}

/** Dia de la semana: 0 domingo … 6 sabado. */
export function diaSemana(fecha: FechaISO): number {
  return aDate(fecha).getUTCDay();
}

export function sumarDias(fecha: FechaISO, dias: number): FechaISO {
  return aISO(new Date(aDate(fecha).getTime() + dias * MS_POR_DIA));
}

/** Dias completos de `desde` a `hasta`; negativo si `hasta` es anterior. */
export function diasEntre(desde: FechaISO, hasta: FechaISO): number {
  return Math.round((aDate(hasta).getTime() - aDate(desde).getTime()) / MS_POR_DIA);
}

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const;

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

export function nombreDia(fecha: FechaISO): string {
  return DIAS[diaSemana(fecha)]!;
}

export function nombreMes(fecha: FechaISO): string {
  return MESES[aDate(fecha).getUTCMonth()]!;
}

/** `lunes 17 de agosto de 2026` — la forma en que se lee en las paginas. */
export function formatoLargo(fecha: FechaISO): string {
  const d = aDate(fecha);
  return `${nombreDia(fecha)} ${d.getUTCDate()} de ${nombreMes(fecha)} de ${d.getUTCFullYear()}`;
}

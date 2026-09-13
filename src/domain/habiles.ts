import type { Anio, FechaISO } from "./tipos";
import { aDate, diaSemana, sumarDias } from "./fechas";
import { calcularFestivos } from "./festivos";

/**
 * Dias habiles y convenciones de conteo. Port del mismo modulo C#
 * (`DiasExtensions`), con una diferencia de implementacion: alli cada paso del
 * bucle recalculaba los festivos del anio; aqui se memorizan por anio, porque
 * el sitio los pide en bucles largos (calcular a 90 dias habiles recorre mas
 * de cuatro meses).
 *
 * Esto no es relleno: "cuantos dias habiles hay entre dos fechas" y "que fecha
 * cae a N dias habiles" son consultas de alta intencion que ningun calendario
 * de festivos responde bien, y son exactamente lo que un agente necesita
 * poder pedir por API.
 */

const cache = new Map<Anio, ReadonlySet<FechaISO>>();

function festivosDe(anio: Anio): ReadonlySet<FechaISO> {
  let set = cache.get(anio);
  if (!set) {
    set = new Set(calcularFestivos(anio).map((f) => f.fecha));
    cache.set(anio, set);
  }
  return set;
}

export function esFinDeSemana(fecha: FechaISO): boolean {
  const d = diaSemana(fecha);
  return d === 0 || d === 6;
}

export function esFestivoNacional(fecha: FechaISO): boolean {
  return festivosDe(Number(fecha.slice(0, 4))).has(fecha);
}

/** Ni fin de semana ni festivo nacional. */
export function esDiaHabil(fecha: FechaISO): boolean {
  return !esFinDeSemana(fecha) && !esFestivoNacional(fecha);
}

/**
 * La fecha que resulta de desplazar `cantidad` dias habiles desde `fecha`.
 * La fecha de partida no se cuenta, caiga o no en dia habil.
 */
export function desplazarDiasHabiles(
  fecha: FechaISO,
  cantidad: number,
  haciaAdelante = true
): FechaISO {
  if (cantidad < 0) throw new RangeError("cantidad de dias habiles no puede ser negativa");
  let actual = fecha;
  let contados = 0;
  while (contados < cantidad) {
    actual = sumarDias(actual, haciaAdelante ? 1 : -1);
    if (esDiaHabil(actual)) contados += 1;
  }
  return actual;
}

/** Dias habiles en el intervalo `[desde, hasta]`, ambos extremos incluidos. */
export function contarDiasHabiles(desde: FechaISO, hasta: FechaISO): number {
  if (desde > hasta) return 0;
  let total = 0;
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) {
    if (esDiaHabil(f)) total += 1;
  }
  return total;
}

function esUltimoDiaDeFebrero(fecha: Date): boolean {
  return (
    fecha.getUTCMonth() === 1 &&
    fecha.getUTCDate() === new Date(Date.UTC(fecha.getUTCFullYear(), 2, 0)).getUTCDate()
  );
}

/**
 * Dias entre dos fechas segun la convencion 30/360 (cada mes vale 30 dias y
 * cada anio 360). Es la base de los calculos de intereses y plazos
 * financieros en Colombia, y es la razon por la que un calendario de festivos
 * termina siendo util en contabilidad. Devuelve 0 si el orden esta invertido.
 */
export function calcular360Dias(desde: FechaISO, hasta: FechaISO): number {
  if (desde > hasta) return 0;

  const inicio = aDate(desde);
  const fin = aDate(hasta);

  const anioInicio = inicio.getUTCFullYear();
  const mesInicio = inicio.getUTCMonth() + 1;
  let diaInicio = inicio.getUTCDate();

  const anioFin = fin.getUTCFullYear();
  const mesFin = fin.getUTCMonth() + 1;
  let diaFin = fin.getUTCDate();

  if (diaInicio === 31 || esUltimoDiaDeFebrero(inicio)) diaInicio = 30;
  if (diaFin === 31 && diaInicio === 30) diaFin = 30;

  return (anioFin - anioInicio) * 360 + (mesFin - mesInicio) * 30 + (diaFin - diaInicio);
}

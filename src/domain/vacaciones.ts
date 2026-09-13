import type { Anio, FechaISO, Festivo } from "./tipos";
import { diasEntre, sumarDias } from "./fechas";
import { calcularFestivos } from "./festivos";
import { esDiaHabil } from "./habiles";

/**
 * Oportunidades de vacaciones.
 *
 * La pregunta que nadie responde bien: "tengo cinco dias de vacaciones,
 * cuando los pido para descansar mas". Un calendario de festivos la deja a
 * ojo, y a ojo se pierde: en junio de 2026, pedir cuatro dias entre Corpus
 * Christi y el Sagrado Corazon da diez dias seguidos de descanso, y eso no se
 * ve mirando una tabla.
 *
 * El calculo es exhaustivo, no heuristico. Para cada bloque contiguo de dias
 * habiles que se podria pedir, se mira hasta donde se estira el descanso
 * hacia atras y hacia adelante pegandose a fines de semana y festivos, y se
 * queda con los tramos mas largos. Un anio son unos pocos miles de
 * combinaciones: cabe entero en el navegador sin que se note.
 */
export interface Oportunidad {
  /** Los dias habiles que hay que pedir. */
  readonly pedir: readonly FechaISO[];
  /** Primer dia de descanso del tramo, ya contando el fin de semana previo. */
  readonly inicio: FechaISO;
  /** Ultimo dia de descanso. */
  readonly fin: FechaISO;
  /** Dias seguidos sin trabajar, de `inicio` a `fin`. */
  readonly diasLibres: number;
  /** Cuantos dias de vacaciones cuesta. */
  readonly diasPedidos: number;
  /** Dias libres por cada dia pedido. Es la medida de si vale la pena. */
  readonly rendimiento: number;
  /** Festivos que caen dentro del tramo, que son los que hacen el truco. */
  readonly festivos: readonly Festivo[];
}

/** Ventana maxima de dias seguidos que tiene sentido buscar. */
const MAXIMO_TRAMO = 25;

/**
 * Las mejores oportunidades del anio para un presupuesto de dias.
 *
 * Devuelve tramos que cuestan `presupuesto` dias o menos, ordenados por dias
 * libres. Se incluyen los mas baratos a proposito: si pidiendo cuatro dias se
 * consiguen diez, saberlo importa aunque el presupuesto fuera cinco.
 *
 * @param anio         Anio en el que buscar.
 * @param presupuesto  Dias de vacaciones disponibles.
 * @param limite       Cuantas oportunidades devolver.
 */
export function oportunidades(anio: Anio, presupuesto: number, limite = 8): Oportunidad[] {
  return todas(anio, presupuesto)
    .sort(
      (x, y) =>
        y.diasLibres - x.diasLibres ||
        x.diasPedidos - y.diasPedidos ||
        x.inicio.localeCompare(y.inicio)
    )
    .slice(0, limite);
}

/**
 * Todos los tramos que caben en el presupuesto, sin ordenar ni recortar.
 *
 * Existe aparte porque `repartir` necesita el conjunto completo: recortarlo
 * antes por dias libres dejaria fuera justo los tramos baratos y rentables,
 * que son los que permiten repartir el anio en varios puentes.
 */
function todas(anio: Anio, presupuesto: number): Oportunidad[] {
  if (presupuesto < 1) return [];

  const festivosDelAnio = [...calcularFestivos(anio), ...calcularFestivos(anio + 1)];
  const libre = (fecha: FechaISO) => !esDiaHabil(fecha);

  const primero = `${anio}-01-01`;
  const ultimo = `${anio}-12-31`;

  /** Clave del tramo -> mejor version encontrada. */
  const mejores = new Map<string, Oportunidad>();

  for (let a = primero; a <= ultimo; a = sumarDias(a, 1)) {
    if (libre(a)) continue; // pedir un dia que ya es libre seria regalarlo

    const pedidos: FechaISO[] = [];

    for (let b = a; diasEntre(a, b) < MAXIMO_TRAMO; b = sumarDias(b, 1)) {
      if (!libre(b)) pedidos.push(b);
      if (pedidos.length > presupuesto) break;
      if (libre(b)) continue; // el bloque pedido termina en dia habil

      // El descanso se estira solo hacia los lados mientras haya fin de
      // semana o festivo pegado: eso es justo lo que hace rendir los dias.
      let inicio = a;
      while (libre(sumarDias(inicio, -1))) inicio = sumarDias(inicio, -1);
      let fin = b;
      while (libre(sumarDias(fin, 1))) fin = sumarDias(fin, 1);

      const diasLibres = diasEntre(inicio, fin) + 1;
      const diasPedidos = pedidos.length;

      // Un tramo que no gana nada sobre el fin de semana normal no es una
      // oportunidad, es simplemente pedir vacaciones.
      if (diasLibres <= diasPedidos + 2) continue;

      const clave = `${inicio}|${fin}`;
      const previa = mejores.get(clave);
      if (previa && previa.diasPedidos <= diasPedidos) continue;

      mejores.set(clave, {
        pedir: [...pedidos],
        inicio,
        fin,
        diasLibres,
        diasPedidos,
        rendimiento: diasLibres / diasPedidos,
        festivos: festivosDelAnio.filter((f) => f.fecha >= inicio && f.fecha <= fin),
      });
    }
  }

  return [...mejores.values()];
}

/**
 * Reparte el presupuesto en varios tramos que no se pisen.
 *
 * Quien tiene quince dias no quiere una sola respuesta de quince: quiere
 * saber como repartirlos en el anio. Se escogen tramos por rendimiento,
 * descartando los que se solapen con uno ya elegido, hasta agotar el
 * presupuesto.
 */
export function repartir(anio: Anio, presupuesto: number): Oportunidad[] {
  const candidatas = todas(anio, presupuesto).sort(
    (x, y) => y.rendimiento - x.rendimiento || y.diasLibres - x.diasLibres
  );

  const plan: Oportunidad[] = [];
  let restante = presupuesto;

  for (const opcion of candidatas) {
    if (opcion.diasPedidos > restante) continue;
    if (plan.some((p) => opcion.inicio <= p.fin && p.inicio <= opcion.fin)) continue;
    plan.push(opcion);
    restante -= opcion.diasPedidos;
    if (restante === 0) break;
  }

  return plan.sort((x, y) => x.inicio.localeCompare(y.inicio));
}

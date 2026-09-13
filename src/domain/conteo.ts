import type { Anio, FechaISO, Festivo } from "./tipos";
import { diasEntre, sumarDias } from "./fechas";
import { ANIO_MAXIMO_CALCULABLE, ANIO_MINIMO_CALCULABLE, calcularFestivos } from "./festivos";
import { calcular360Dias, contarDiasHabiles, esFinDeSemana } from "./habiles";

/**
 * Contar dias entre dos fechas.
 *
 * Parece trivial y no lo es: casi toda discusion sobre "cuantos dias hay
 * entre el 1 y el 8" es en realidad una discusion sobre si se cuentan los dos
 * extremos o solo la diferencia. Las calculadoras que hay dan un numero sin
 * decir cual de los dos esta dando, y por eso no se les puede creer.
 *
 * Aqui se devuelven los dos, cada uno con su nombre, y ademas las dos
 * convenciones con las que se cuenta plata en Colombia: base 365 —los dias
 * que de verdad pasaron— y base 360, donde todo mes vale 30 y todo anio 360.
 * Esa segunda es la que usan los bancos para intereses y plazos, y la razon
 * por la que un calendario de festivos termina siendo util en contabilidad.
 */
export interface Conteo {
  readonly desde: FechaISO;
  readonly hasta: FechaISO;
  /** Dias transcurridos: `hasta` menos `desde`. El 1 al 8 de enero son 7. */
  readonly diferencia: number;
  /** Contando los dos extremos. El 1 al 8 de enero son 8. */
  readonly inclusivos: number;
  /** Base 30/360: todo mes vale 30 y todo anio 360. Diferencia, no inclusivo. */
  readonly dias360: number;
  /** Habiles: ni sabado, ni domingo, ni festivo. Cuenta los dos extremos. */
  readonly habiles: number;
  /** Dias de fin de semana en el rango, contando los dos extremos. */
  readonly finesDeSemana: number;
  /** Festivos nacionales que caen dentro del rango, en orden. */
  readonly festivos: readonly Festivo[];
  /** Semanas completas y dias sueltos, para leerlo en voz alta. */
  readonly semanas: number;
  readonly diasSueltos: number;
}

/** Por que un par de fechas no se puede contar. */
export type MotivoInvalido =
  "vacio" | "formato" | "inexistente" | "fuera-de-rango" | "orden" | "demasiado-largo";

export interface Invalido {
  readonly motivo: MotivoInvalido;
  /** Explicacion en una linea, lista para mostrar. */
  readonly mensaje: string;
  /** Cual de los dos campos tiene el problema, si aplica a uno solo. */
  readonly campo?: "desde" | "hasta";
}

/**
 * Tope de anios que se pueden contar de una vez.
 *
 * No es una limitacion tecnica —contar dia a dia un siglo tarda
 * milisegundos— sino de sentido: un rango de mas de un siglo casi siempre es
 * una fecha mal tecleada, y decirlo ayuda mas que devolver 40.000.
 */
const MAXIMO_ANIOS = 100;

const FORMATO = /^\d{4}-\d{2}-\d{2}$/;

/** `true` si la cadena es una fecha que existe de verdad: el 31 de febrero no. */
export function fechaExiste(fecha: string): boolean {
  if (!FORMATO.test(fecha)) return false;
  const [anio, mes, dia] = fecha.split("-").map(Number) as [number, number, number];
  if (mes < 1 || mes > 12 || dia < 1) return false;
  return dia <= new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/**
 * Revisa el par de fechas y explica el problema, si lo hay.
 *
 * Devuelve `undefined` cuando se puede contar. El mensaje va escrito para
 * mostrarse tal cual: quien se equivoca tecleando necesita saber que
 * corregir, no que "la entrada es invalida".
 */
export function revisar(desde: string, hasta: string): Invalido | undefined {
  if (!desde || !hasta) {
    return { motivo: "vacio", mensaje: "Faltan las dos fechas para poder contar." };
  }

  for (const [campo, valor] of [
    ["desde", desde],
    ["hasta", hasta],
  ] as const) {
    if (!FORMATO.test(valor)) {
      return {
        motivo: "formato",
        campo,
        mensaje: `La fecha ${campo === "desde" ? "inicial" : "final"} va en formato AAAA-MM-DD, como 2026-08-17.`,
      };
    }
    if (!fechaExiste(valor)) {
      return {
        motivo: "inexistente",
        campo,
        mensaje: `El ${valor} no existe en el calendario.`,
      };
    }
    const anio = Number(valor.slice(0, 4));
    if (anio < ANIO_MINIMO_CALCULABLE || anio > ANIO_MAXIMO_CALCULABLE) {
      return {
        motivo: "fuera-de-rango",
        campo,
        mensaje: `Solo se puede contar entre ${ANIO_MINIMO_CALCULABLE} y ${ANIO_MAXIMO_CALCULABLE}.`,
      };
    }
  }

  if (desde > hasta) {
    return {
      motivo: "orden",
      mensaje: "La fecha final es anterior a la inicial. Intercámbialas.",
    };
  }

  if (diasEntre(desde, hasta) > MAXIMO_ANIOS * 366) {
    return {
      motivo: "demasiado-largo",
      mensaje: `El rango pasa de ${MAXIMO_ANIOS} años. Revisa si alguna fecha quedó mal escrita.`,
    };
  }

  return undefined;
}

/** Los festivos nacionales dentro del rango, extremos incluidos. */
function festivosEntre(desde: FechaISO, hasta: FechaISO): readonly Festivo[] {
  const primero = Number(desde.slice(0, 4));
  const ultimo = Number(hasta.slice(0, 4));
  const dentro: Festivo[] = [];
  for (let anio: Anio = primero; anio <= ultimo; anio += 1) {
    for (const f of calcularFestivos(anio)) {
      if (f.fecha >= desde && f.fecha <= hasta) dentro.push(f);
    }
  }
  return dentro;
}

/**
 * Cuenta los dias entre dos fechas de todas las formas en que se cuentan.
 *
 * Asume un rango ya revisado con `revisar`. Es una funcion pura: corre igual
 * en un test de Node, en el build y en el navegador del visitante.
 */
export function contar(desde: FechaISO, hasta: FechaISO): Conteo {
  const diferencia = diasEntre(desde, hasta);
  const inclusivos = diferencia + 1;

  let finesDeSemana = 0;
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) {
    if (esFinDeSemana(f)) finesDeSemana += 1;
  }

  return {
    desde,
    hasta,
    diferencia,
    inclusivos,
    dias360: calcular360Dias(desde, hasta),
    habiles: contarDiasHabiles(desde, hasta),
    finesDeSemana,
    festivos: festivosEntre(desde, hasta),
    semanas: Math.floor(diferencia / 7),
    diasSueltos: diferencia % 7,
  };
}

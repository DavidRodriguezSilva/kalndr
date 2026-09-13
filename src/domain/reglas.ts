import type { Anio, FechaISO } from "./tipos";
import { aISO, sumarDias } from "./fechas";
import { domingoPascua } from "./festivos";

/**
 * Reglas de recurrencia — el formato con el que se mantienen las fiestas, los
 * eventos y las temporadas.
 *
 * Una fiesta casi nunca tiene fecha fija. El Carnaval de Barranquilla cae 51
 * dias antes de la Pascua; la Feria de las Flores empieza el primer sabado de
 * agosto; la Feria de Cali va del 25 al 30 de diciembre, esa si fija; una
 * carrera puede no tener patron y anunciarse anio por anio. Guardar la fecha
 * ya calculada obligaria a editar cada archivo cada diciembre — y ese es
 * exactamente el trabajo manual que hace que un calendario se quede viejo y
 * pierda la confianza de quien lo consulta.
 *
 * Por eso el archivo declara *como* se calcula la fecha, una sola vez, y el
 * sitio la resuelve para cualquier anio.
 */
export type Regla =
  /** Un dia fijo del calendario, opcionalmente con duracion: 20 de julio. */
  | { readonly tipo: "fija"; readonly mes: number; readonly dia: number; readonly dias?: number }
  /** Un rango entre dos fechas fijas: del 25 al 30 de diciembre. */
  | {
      readonly tipo: "rango";
      readonly desde: { readonly mes: number; readonly dia: number };
      readonly hasta: { readonly mes: number; readonly dia: number };
    }
  /** Desplazamiento en dias desde el Domingo de Pascua: Carnaval, -51 a -47. */
  | { readonly tipo: "pascua"; readonly desde: number; readonly hasta: number }
  /**
   * El n-esimo dia de semana de un mes: "primer sabado de agosto".
   * `ocurrencia` negativa cuenta desde el final: -1 es el ultimo.
   * `diaSemana` va de 0 (domingo) a 6 (sabado).
   */
  | {
      readonly tipo: "ordinal";
      readonly mes: number;
      readonly diaSemana: number;
      readonly ocurrencia: number;
      readonly dias?: number;
    }
  /**
   * Sin patron: fechas declaradas anio por anio. Es la salida honesta para un
   * concierto o una carrera cuya fecha se anuncia y ya. Un anio sin entrada
   * simplemente no aparece en el calendario, que es mejor que inventarlo.
   */
  | {
      readonly tipo: "fechas";
      readonly porAnio: Readonly<
        Record<string, { readonly desde: FechaISO; readonly hasta?: FechaISO }>
      >;
    };

export interface Periodo {
  readonly inicio: FechaISO;
  readonly fin: FechaISO;
}

function fija(anio: Anio, mes: number, dia: number): FechaISO {
  return aISO(new Date(Date.UTC(anio, mes - 1, dia)));
}

/** El n-esimo `diaSemana` del mes; `ocurrencia` negativa cuenta desde el final. */
function ordinal(anio: Anio, mes: number, diaSemana: number, ocurrencia: number): FechaISO {
  if (ocurrencia > 0) {
    const primero = new Date(Date.UTC(anio, mes - 1, 1));
    const desplazamiento = (diaSemana - primero.getUTCDay() + 7) % 7;
    return aISO(new Date(Date.UTC(anio, mes - 1, 1 + desplazamiento + (ocurrencia - 1) * 7)));
  }
  const ultimo = new Date(Date.UTC(anio, mes, 0));
  const desplazamiento = (ultimo.getUTCDay() - diaSemana + 7) % 7;
  return aISO(
    new Date(Date.UTC(anio, mes - 1, ultimo.getUTCDate() - desplazamiento + (ocurrencia + 1) * 7))
  );
}

/**
 * Resuelve una regla al periodo concreto de un anio.
 *
 * Devuelve `undefined` cuando la regla no aplica a ese anio — el caso de una
 * regla `fechas` sin entrada, o de un dia ordinal que el mes no alcanza a
 * tener (un quinto lunes que no existe).
 */
export function resolver(regla: Regla, anio: Anio): Periodo | undefined {
  switch (regla.tipo) {
    case "fija": {
      const inicio = fija(anio, regla.mes, regla.dia);
      return { inicio, fin: sumarDias(inicio, (regla.dias ?? 1) - 1) };
    }
    case "rango": {
      const inicio = fija(anio, regla.desde.mes, regla.desde.dia);
      let fin = fija(anio, regla.hasta.mes, regla.hasta.dia);
      // Un rango que cruza el fin de anio (28 dic - 2 ene) termina el
      // siguiente, no antes de empezar.
      if (fin < inicio) fin = fija(anio + 1, regla.hasta.mes, regla.hasta.dia);
      return { inicio, fin };
    }
    case "pascua": {
      const pascua = domingoPascua(anio);
      return { inicio: sumarDias(pascua, regla.desde), fin: sumarDias(pascua, regla.hasta) };
    }
    case "ordinal": {
      const inicio = ordinal(anio, regla.mes, regla.diaSemana, regla.ocurrencia);
      // Un quinto dia de semana que el mes no tiene se sale a otro mes.
      if (Number(inicio.slice(5, 7)) !== regla.mes) return undefined;
      return { inicio, fin: sumarDias(inicio, (regla.dias ?? 1) - 1) };
    }
    case "fechas": {
      const declarado = regla.porAnio[String(anio)];
      if (!declarado) return undefined;
      return { inicio: declarado.desde, fin: declarado.hasta ?? declarado.desde };
    }
  }
}

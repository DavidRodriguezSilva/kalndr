/**
 * Tipos del calendario. Este modulo no depende de nada: ni de Astro, ni de
 * React, ni del DOM. Es el unico lugar donde se define que es una entrada de
 * calendario, y lo comparten por igual la UI para personas y la API para
 * agentes — asi ninguna de las dos puede describir el mundo de forma distinta
 * a la otra.
 */

/** Fecha civil colombiana en formato `YYYY-MM-DD`. Nunca lleva hora ni zona. */
export type FechaISO = string;

/** Anio de cuatro digitos. */
export type Anio = number;

/**
 * Como se determina la fecha de un festivo.
 *
 * - `fijo`: cae siempre en la misma fecha del calendario.
 * - `trasladable`: fecha fija que la Ley 51 de 1983 (Ley Emiliani) corre al
 *   lunes siguiente cuando no cae en lunes.
 * - `pascua`: se cuenta en dias desde el Domingo de Resurreccion y se celebra
 *   ese mismo dia (Jueves y Viernes Santo).
 * - `pascua-trasladable`: se cuenta desde Pascua y ademas se corre al lunes
 *   siguiente (Ascension, Corpus Christi, Sagrado Corazon).
 */
export type ReglaFestivo = "fijo" | "trasladable" | "pascua" | "pascua-trasladable";

/** Origen de la celebracion, util para filtrar y para explicarle al usuario. */
export type ClaseFestivo = "civil" | "religioso";

/**
 * Un dia festivo de caracter nacional: no laborable en todo el pais.
 *
 * `fechaOriginal` solo aparece cuando la Ley Emiliani movio el festivo; es lo
 * que permite responder en la UI "el 15 de agosto es sabado, se celebra el
 * lunes 17" en vez de mostrar una fecha sin explicacion.
 */
export interface Festivo {
  /** Fecha en que efectivamente no se trabaja. */
  readonly fecha: FechaISO;
  /** Fecha de la celebracion antes del traslado, si hubo traslado. */
  readonly fechaOriginal?: FechaISO;
  /** `true` cuando `fecha` difiere de `fechaOriginal`. */
  readonly trasladado: boolean;
  /** Nombre oficial, en espaniol, con tildes. */
  readonly nombre: string;
  /** Identificador estable entre anios: `independencia`, `sagrado-corazon`. */
  readonly slug: string;
  readonly clase: ClaseFestivo;
  readonly regla: ReglaFestivo;
  /**
   * Una frase sobre que se celebra. Es lo que se lee en la agenda, y la razon
   * por la que alguien se queda en la pagina en vez de salir con la fecha y
   * ya.
   */
  readonly descripcion: string;
  /** Donde se lee el resto. Aqui no se escribe un articulo que nadie va a leer. */
  readonly wikipedia: string;
}

/**
 * Punto de extension del calendario.
 *
 * Un festivo no es lo unico que le importa a quien consulta estas fechas:
 * tambien hay festividades sin caracter laboral (Carnaval de Barranquilla,
 * Feria de Cali), eventos y carreras con fecha propia, y temporadas que duran
 * semanas (vacaciones escolares, temporada alta de viaje). Todo eso entra al
 * calendario como `EntradaCalendario`, sin tocar el modulo de festivos.
 */
export type TipoEntrada = "festivo" | "festividad" | "evento" | "temporada";

/** Alcance geografico: `nacional` o el codigo DANE / nombre de la region. */
export type Alcance = "nacional" | { readonly departamento: string; readonly ciudad?: string };

export interface EntradaCalendario {
  readonly tipo: TipoEntrada;
  readonly slug: string;
  readonly nombre: string;
  /** Primer dia. Para una entrada de un solo dia, igual a `fin`. */
  readonly inicio: FechaISO;
  readonly fin: FechaISO;
  readonly alcance: Alcance;
  /** Resumen de una o dos frases. Es lo que leen tanto la tarjeta como la API. */
  readonly resumen?: string;
  /** Ruta interna a la ficha ampliada, si existe: `/festividades/carnaval/`. */
  readonly ficha?: string;
  /** Fuente externa citable (sitio oficial, decreto, ley). */
  readonly fuente?: { readonly nombre: string; readonly url: string };
  /** El festivo original, cuando `tipo` es `festivo`. */
  readonly festivo?: Festivo;
}

/**
 * Una fuente aporta entradas para un anio. Registrar una fuente nueva
 * (festividades, carreras, temporadas de viaje) es todo lo que hace falta para
 * que aparezcan en la UI, en el sitemap y en la API: ver `fuentes.ts`.
 */
export interface FuenteCalendario {
  readonly id: string;
  readonly nombre: string;
  readonly tipo: TipoEntrada;
  entradas(anio: Anio): readonly EntradaCalendario[];
}

import type { Anio, ClaseFestivo, FechaISO, Festivo, ReglaFestivo } from "./tipos";
import { aISO, sumarDias } from "./fechas";

/**
 * Festivos nacionales de Colombia.
 *
 * Port directo del algoritmo de produccion en C# (`DiasExtensions`): mismo
 * computo de Pascua (Meeus/Jones/Butcher), mismos desplazamientos desde el
 * Domingo de Resurreccion (+43 Ascension, +64 Corpus, +71 Sagrado Corazon, que
 * ya caen en lunes por construccion) y mismo "proximo lunes" para los
 * trasladables de la Ley 51 de 1983 (Ley Emiliani). Lo unico que se anade aqui
 * es el nombre, el slug y la clasificacion de cada festivo — datos que el C#
 * no necesitaba y el sitio si.
 *
 * Este modulo es la unica fuente de verdad de las fechas: paginas, JSON-LD,
 * sitemap, API para agentes y calendario .ics se derivan todos de aqui.
 *
 * Toda la aritmetica es sobre cadenas `YYYY-MM-DD` en calendario civil
 * colombiano. Nada de `Date` local: una hora de desfase de zona (UTC-5) mueve
 * un festivo un dia entero y el sitio completo miente.
 */

/**
 * Rangos, que son tres cosas distintas y conviene no confundir:
 *
 * - `ANIO_MINIMO_CALCULABLE` / `ANIO_MAXIMO_CALCULABLE`: hasta donde la
 *   aritmetica es valida. El piso es 1583, el primer anio completo del
 *   calendario gregoriano —el que ISO 8601 usa— y por tanto el primero en que
 *   el computo de Pascua significa algo. El techo es 2099, donde se corta el
 *   horizonte util del sitio.
 * - `ANIO_REGIMEN_ACTUAL`: desde cuando lo calculado describe la ley vigente.
 *   La Ley 51 de 1983 (Emiliani) empezo a regir en 1984; antes de ese anio el
 *   algoritmo devuelve fechas correctas segun *hoy*, no segun lo que el pais
 *   descanso entonces. Es un anacronismo declarado, no un error.
 * - La ventana destacada del sitio: `aniosDestacados()`, mas abajo.
 */
export const ANIO_MINIMO_CALCULABLE = 1583;
export const ANIO_MAXIMO_CALCULABLE = 2099;
export const ANIO_REGIMEN_ACTUAL = 1984;

/** Cuantos anios a cada lado del actual se publican como pagina y como API. */
export const VENTANA_DESTACADA = 5;

/**
 * La Ley 2578 del 1 de junio de 2026 anadio la Virgen del Rosario de
 * Chiquinquira (9 de julio, trasladable) como festivo nacional. Antes de ese
 * anio el pais tiene 18 festivos; desde ese anio, 19.
 */
export const ANIO_CHIQUINQUIRA = 2026;

/** Cuantos festivos nacionales tiene el anio dado. */
export function totalFestivos(anio: Anio): number {
  return anio >= ANIO_CHIQUINQUIRA ? 19 : 18;
}

interface Definicion {
  readonly slug: string;
  readonly nombre: string;
  readonly clase: ClaseFestivo;
  readonly regla: ReglaFestivo;
  /** Mes y dia para `fijo` y `trasladable`. */
  readonly mes?: number;
  readonly dia?: number;
  /** Dias desde el Domingo de Pascua para `pascua` y `pascua-trasladable`. */
  readonly offsetPascua?: number;
  /** Primer anio en que rige, si no ha existido siempre. */
  readonly desde?: Anio;
  readonly descripcion: string;
  readonly wikipedia: string;
}

/** Prefijo de los enlaces; todos apuntan a la Wikipedia en espaniol. */
const WIKI = "https://es.wikipedia.org/wiki/";

/**
 * Catalogo de los festivos nacionales. El orden de esta lista no importa: la
 * salida se ordena por fecha.
 */
const CATALOGO: readonly Definicion[] = [
  // Fijos
  {
    slug: "ano-nuevo",
    nombre: "Año Nuevo",
    clase: "civil",
    regla: "fijo",
    mes: 1,
    dia: 1,
    descripcion: "Arranca el año y medio país sigue en casa de la abuela, acabando lo de anoche.",
    wikipedia: WIKI + "Año_Nuevo",
  },
  {
    slug: "dia-del-trabajo",
    nombre: "Día del Trabajo",
    clase: "civil",
    regla: "fijo",
    mes: 5,
    dia: 1,
    descripcion: "El día del trabajador. Marchas en las calles de casi todas las capitales.",
    wikipedia: WIKI + "Día_Internacional_de_los_Trabajadores",
  },
  {
    slug: "independencia",
    nombre: "Día de la Independencia",
    clase: "civil",
    regla: "fijo",
    mes: 7,
    dia: 20,
    descripcion: "El grito del 20 de julio de 1810, con el florero de Llorente de excusa.",
    wikipedia: WIKI + "Independencia_de_Colombia",
  },
  {
    slug: "batalla-de-boyaca",
    nombre: "Batalla de Boyacá",
    clase: "civil",
    regla: "fijo",
    mes: 8,
    dia: 7,
    descripcion:
      "La batalla que selló la independencia en 1819, en el puente sobre el río Teatinos.",
    wikipedia: WIKI + "Batalla_de_Boyacá",
  },
  {
    slug: "inmaculada-concepcion",
    nombre: "La Inmaculada Concepción",
    clase: "religioso",
    regla: "fijo",
    mes: 12,
    dia: 8,
    descripcion:
      "La noche de las velitas: el país entero prende faroles en la puerta y arranca la Navidad.",
    wikipedia: WIKI + "Inmaculada_Concepción",
  },
  {
    slug: "navidad",
    nombre: "Navidad",
    clase: "religioso",
    regla: "fijo",
    mes: 12,
    dia: 25,
    descripcion: "Navidad. Natilla, buñuelo y la novena que se acabó demasiado rápido.",
    wikipedia: WIKI + "Navidad",
  },

  // Moviles atados a la Pascua, en su dia (no se trasladan)
  {
    slug: "jueves-santo",
    nombre: "Jueves Santo",
    clase: "religioso",
    regla: "pascua",
    offsetPascua: -3,
    descripcion: "Empieza el triduo: la Última Cena y el lavatorio de los pies.",
    wikipedia: WIKI + "Jueves_Santo",
  },
  {
    slug: "viernes-santo",
    nombre: "Viernes Santo",
    clase: "religioso",
    regla: "pascua",
    offsetPascua: -2,
    descripcion: "El día de la crucifixión. Procesiones, silencio y nada de carne.",
    wikipedia: WIKI + "Viernes_Santo",
  },

  // Moviles atados a la Pascua y ya trasladados al lunes por construccion
  {
    slug: "ascension",
    nombre: "Ascensión del Señor",
    clase: "religioso",
    regla: "pascua-trasladable",
    offsetPascua: 43,
    descripcion: "Cuarenta días después de la Pascua, la subida al cielo.",
    wikipedia: WIKI + "Ascensión_de_Jesús",
  },
  {
    slug: "corpus-christi",
    nombre: "Corpus Christi",
    clase: "religioso",
    regla: "pascua-trasladable",
    offsetPascua: 64,
    descripcion:
      "La fiesta de la eucaristía; en varios pueblos se hacen alfombras de flores en la calle.",
    wikipedia: WIKI + "Corpus_Christi",
  },
  {
    slug: "sagrado-corazon",
    nombre: "Sagrado Corazón de Jesús",
    clase: "religioso",
    regla: "pascua-trasladable",
    offsetPascua: 71,
    descripcion: "Devoción al corazón de Cristo. Colombia fue consagrada a él en 1902.",
    wikipedia: WIKI + "Sagrado_Corazón_de_Jesús",
  },

  // Trasladables al lunes siguiente (Ley 51 de 1983)
  {
    slug: "reyes-magos",
    nombre: "Día de los Reyes Magos",
    clase: "religioso",
    regla: "trasladable",
    mes: 1,
    dia: 6,
    descripcion: "Los Reyes llegan al pesebre y con eso se cierra la Navidad.",
    wikipedia: WIKI + "Epifanía",
  },
  {
    slug: "san-jose",
    nombre: "Día de San José",
    clase: "religioso",
    regla: "trasladable",
    mes: 3,
    dia: 19,
    descripcion: "El día del padre de Jesús, patrono de los carpinteros y de la buena muerte.",
    wikipedia: WIKI + "José_de_Nazaret",
  },
  {
    slug: "san-pedro-y-san-pablo",
    nombre: "San Pedro y San Pablo",
    clase: "religioso",
    regla: "trasladable",
    mes: 6,
    dia: 29,
    descripcion: "Los dos apóstoles fundadores. En el Huila la fiesta se baila en sanjuanero.",
    wikipedia: WIKI + "Pedro_(apóstol)",
  },
  {
    slug: "chiquinquira",
    nombre: "Virgen del Rosario de Chiquinquirá",
    clase: "religioso",
    regla: "trasladable",
    mes: 7,
    dia: 9,
    desde: ANIO_CHIQUINQUIRA,
    descripcion: "La patrona de Colombia, en Boyacá. Festivo nuevo: lo añadió la Ley 2578 de 2026.",
    wikipedia: WIKI + "Nuestra_Señora_del_Rosario_de_Chiquinquirá",
  },
  {
    slug: "asuncion",
    nombre: "La Asunción de la Virgen",
    clase: "religioso",
    regla: "trasladable",
    mes: 8,
    dia: 15,
    descripcion: "La Virgen sube al cielo. En Medellín cae en plena Feria de las Flores.",
    wikipedia: WIKI + "Asunción_de_María",
  },
  {
    slug: "dia-de-la-raza",
    nombre: "Día de la Raza",
    clase: "civil",
    regla: "trasladable",
    mes: 10,
    dia: 12,
    descripcion: "La llegada de Colón en 1492. Hoy se discute más de lo que se celebra.",
    wikipedia: WIKI + "Día_de_la_Raza",
  },
  {
    slug: "todos-los-santos",
    nombre: "Todos los Santos",
    clase: "religioso",
    regla: "trasladable",
    mes: 11,
    dia: 1,
    descripcion: "El día de todos los santos; la víspera es la del disfraz.",
    wikipedia: WIKI + "Día_de_Todos_los_Santos",
  },
  {
    slug: "independencia-de-cartagena",
    nombre: "Independencia de Cartagena",
    clase: "civil",
    regla: "trasladable",
    mes: 11,
    dia: 11,
    descripcion:
      "Cartagena se declaró independiente en 1811 y lo celebra con las Fiestas de Independencia.",
    wikipedia: WIKI + "Independencia_de_Cartagena",
  },
];

/**
 * Domingo de Pascua por el algoritmo de Meeus/Jones/Butcher (calendario
 * gregoriano). Aritmetica entera pura, valida para cualquier anio gregoriano.
 */
export function domingoPascua(anio: Anio): FechaISO {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return aISO(new Date(Date.UTC(anio, mes - 1, dia)));
}

/** El lunes de esa semana o el siguiente; devuelve la misma fecha si ya es lunes. */
export function proximoLunes(fecha: FechaISO): FechaISO {
  const dia = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  return dia === 1 ? fecha : sumarDias(fecha, (8 - dia) % 7);
}

function fechaFija(anio: Anio, mes: number, dia: number): FechaISO {
  return aISO(new Date(Date.UTC(anio, mes - 1, dia)));
}

/**
 * Los festivos nacionales del anio, ordenados por fecha ascendente.
 *
 * Funcion pura: mismo anio, misma salida, sin leer reloj ni red.
 */
export function calcularFestivos(anio: Anio): readonly Festivo[] {
  if (!esAnioCalculable(anio)) {
    throw new RangeError(
      `año fuera de rango: ${anio} (calculable entre ${ANIO_MINIMO_CALCULABLE} y ${ANIO_MAXIMO_CALCULABLE})`
    );
  }
  const pascua = domingoPascua(anio);

  const festivos = CATALOGO.filter((d) => d.desde === undefined || anio >= d.desde).map((d) => {
    const original: FechaISO =
      d.offsetPascua !== undefined
        ? sumarDias(pascua, d.offsetPascua)
        : fechaFija(anio, d.mes!, d.dia!);

    // `pascua-trasladable` ya viene en lunes por construccion del offset; el
    // traslado de la Ley Emiliani solo se aplica a las fechas fijas.
    const fecha = d.regla === "trasladable" ? proximoLunes(original) : original;
    const trasladado = fecha !== original;

    return {
      fecha,
      ...(trasladado ? { fechaOriginal: original } : {}),
      trasladado,
      nombre: d.nombre,
      slug: d.slug,
      clase: d.clase,
      regla: d.regla,
      descripcion: d.descripcion,
      wikipedia: d.wikipedia,
    } satisfies Festivo;
  });

  return festivos.sort((x, y) => x.fecha.localeCompare(y.fecha));
}

/**
 * Dias de descanso efectivos del anio: fechas distintas, sin repetir.
 *
 * No siempre coincide con el numero de festivos. Cuando el 29 de junio cae en
 * domingo, San Pedro y San Pablo se traslada al lunes 30 y choca con el
 * Sagrado Corazon, que ya estaba ahi: dos celebraciones, un solo dia libre.
 * Pasa en 2025 y 2030 dentro del rango publicado. Es la diferencia entre
 * "19 festivos" y "18 dias sin trabajar", y decirla bien es la clase de
 * detalle que otros calendarios se saltan.
 */
export function diasNoLaborables(anio: Anio): readonly FechaISO[] {
  return [...new Set(calcularFestivos(anio).map((f) => f.fecha))];
}

/** Celebraciones que comparten fecha, agrupadas. Vacio en un anio normal. */
export function coincidencias(anio: Anio): readonly (readonly Festivo[])[] {
  const porFecha = new Map<FechaISO, Festivo[]>();
  for (const f of calcularFestivos(anio)) {
    porFecha.set(f.fecha, [...(porFecha.get(f.fecha) ?? []), f]);
  }
  return [...porFecha.values()].filter((grupo) => grupo.length > 1);
}

/** `true` si la fecha dada es festivo nacional. */
export function esFestivo(fecha: FechaISO): boolean {
  const anio = Number(fecha.slice(0, 4));
  return calcularFestivos(anio).some((f) => f.fecha === fecha);
}

/**
 * El anio "actual" desde el punto de vista del sitio.
 *
 * Se puede fijar con `ANIO_ACTUAL` en el entorno para que un build sea
 * reproducible (y para poder probar el cambio de anio sin viajar en el
 * tiempo); si no esta, se toma del reloj en zona de Bogota, no del reloj del
 * runner de CI, que corre en UTC y el 31 de diciembre estaria un anio
 * adelantado.
 */
export function anioActual(): Anio {
  const fijado = typeof process !== "undefined" ? process.env?.ANIO_ACTUAL : undefined;
  if (fijado) return Number(fijado);
  const bogota = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
  }).format(new Date());
  return Number(bogota);
}

/**
 * La ventana destacada: cinco anios hacia atras y cinco hacia adelante.
 *
 * Son los anios que se prerenderizan como paginas con contenido propio y los
 * que llevan navegacion y prioridad en el sitemap. Fuera de esa ventana el
 * calendario sigue siendo calculable hasta 2099 —la funcion es pura y corre
 * igual en el navegador que en el build— pero no se publica una pagina por
 * anio: 500 paginas casi identicas no ayudan a nadie y Google las lee como
 * contenido de relleno.
 */
export function aniosDestacados(referencia: Anio = anioActual()): readonly Anio[] {
  const anios: Anio[] = [];
  for (let a = referencia - VENTANA_DESTACADA; a <= referencia + VENTANA_DESTACADA; a += 1) {
    anios.push(a);
  }
  return anios;
}

/** `true` si el anio esta dentro de lo que el algoritmo puede calcular. */
export function esAnioCalculable(anio: Anio): boolean {
  return Number.isInteger(anio) && anio >= ANIO_MINIMO_CALCULABLE && anio <= ANIO_MAXIMO_CALCULABLE;
}

import type { Anio, EntradaCalendario, TipoEntrada } from "./tipos";
import { resolver, type Regla } from "./reglas";
import datos from "@/data/eventos.json";

/**
 * Fiestas, eventos, carreras y temporadas: una sola hoja.
 *
 * Todo vive en `src/data/eventos.json`, un arreglo donde cada entrada tiene
 * exactamente la misma forma. Un archivo por festividad con su articulo
 * propio seria mas "correcto" y nadie lo mantendria: para lo que hay que
 * decir de una fiesta —que es, donde, cuando cae y dos advertencias— una
 * fila alcanza, y el que quiera mas se va a Wikipedia.
 *
 * Anadir una fiesta es anadir un objeto a ese archivo. Nada mas.
 */
export interface Evento {
  /** Identificador estable; forma la URL y no cambia entre anios. */
  readonly id: string;
  readonly titulo: string;
  readonly capa: string;
  /** Una o dos frases, en voz de aqui. Es todo lo que se escribe. */
  readonly descripcion: string;
  /** Ciudad y departamento, o "Nacional". */
  readonly lugar: string;
  readonly regla: Regla;
  /**
   * Que tan firme es la fecha. Una fiesta puede tener fecha exacta, una
   * estimada que se confirma cada anio, o estar por confirmar. Decirlo es
   * mejor que fingir precision: quien va a comprar un tiquete necesita saber
   * si ya puede reservar.
   */
  readonly precision: "exacta" | "estimada" | "por-confirmar";
  /**
   * Donde se lee el resto. Aqui no se escribe un articulo que nadie va a leer.
   * Vacio cuando no hay articulo —una temporada escolar no lo tiene— y
   * entonces la ficha simplemente no ofrece el enlace, en vez de mandar a
   * alguien a una pagina que no responde nada.
   */
  readonly wikipedia: string;
  readonly curiosidades: readonly string[];
  readonly anotaciones: readonly string[];
  /** Primer y ultimo anio en que aplica, si no es indefinida. */
  readonly desde?: number;
  readonly hasta?: number;
}

export const EVENTOS: readonly Evento[] = datos as readonly Evento[];

const TIPO_POR_CAPA: Record<string, TipoEntrada> = {
  fiestas: "festividad",
  eventos: "evento",
  carreras: "evento",
  temporadas: "temporada",
};

/** El evento resuelto a las fechas de un anio concreto, si aplica ese anio. */
export function entradaDeEvento(evento: Evento, anio: Anio): EntradaCalendario | undefined {
  if (evento.desde !== undefined && anio < evento.desde) return undefined;
  if (evento.hasta !== undefined && anio > evento.hasta) return undefined;

  const periodo = resolver(evento.regla, anio);
  if (!periodo) return undefined;

  return {
    tipo: TIPO_POR_CAPA[evento.capa] ?? "evento",
    capa: evento.capa,
    slug: evento.id,
    nombre: evento.titulo,
    inicio: periodo.inicio,
    fin: periodo.fin,
    alcance: evento.lugar === "Nacional" ? "nacional" : { departamento: evento.lugar },
    resumen: evento.descripcion,
    ficha: `/festividades/${evento.id}/`,
    ...(evento.wikipedia ? { fuente: { nombre: "Wikipedia", url: evento.wikipedia } } : {}),
  };
}

/** Los eventos de una capa, ya resueltos y ordenados, para el anio dado. */
export function eventosDeCapa(capa: string, anio: Anio): EntradaCalendario[] {
  return EVENTOS.filter((e) => e.capa === capa)
    .map((e) => entradaDeEvento(e, anio))
    .filter((e): e is EntradaCalendario => e !== undefined)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
}

/** Las capas que la hoja alimenta hoy, en el orden en que aparecen. */
export function capasConEventos(): readonly string[] {
  return [...new Set(EVENTOS.map((e) => e.capa))];
}

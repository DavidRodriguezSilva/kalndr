import type { Anio, EntradaCalendario, TipoEntrada } from "./tipos";
import { calcularFestivos } from "./festivos";
import { capasConEventos, eventosDeCapa } from "./eventos";

/**
 * Capas del calendario.
 *
 * El calendario no es una lista: es una pila de capas que el usuario enciende
 * y apaga. Festivos nacionales, fiestas y carnavales, eventos y carreras,
 * temporadas de viaje y vacaciones. Apagarlas todas deja el calendario plano
 * —solo los dias del mes— y esa tambien es una vista valida: quien solo
 * quiere ver agosto sin ruido tiene derecho a verlo.
 *
 * Una capa nueva es un objeto en `CAPAS`. Nada mas. Ni la UI, ni el sitemap,
 * ni la API para agentes necesitan cambiar: todos recorren este arreglo.
 *
 * Reglas para una capa nueva:
 *   - `entradas(anio)` es pura y determinista. Los datos viven versionados en
 *     `src/data/`, no en una API externa consultada en tiempo de build.
 *   - `slug` estable entre anios: es lo que forma la URL de la ficha.
 *   - Si la entrada afirma algo verificable (una fecha oficial, un decreto),
 *     lleva `fuente` con nombre y URL. Eso es lo que hace la pagina citable, y
 *     lo que un agente necesita para confiar en el dato en vez de repetirlo.
 */
export interface Capa {
  /** Identificador estable; viaja en la URL como `?capas=festivos,fiestas`. */
  readonly id: string;
  readonly nombre: string;
  /** Una linea que explica que aporta la capa, visible en el conmutador. */
  readonly descripcion: string;
  readonly tipo: TipoEntrada;
  /**
   * Token de color con el que se pinta la capa. Cada una tiene el suyo: en un
   * calendario con cinco capas encendidas, el color es lo unico que permite
   * saber de un vistazo que es cada marca. Ver `styles/tokens.css`.
   */
  readonly token: "festivo" | "fiesta" | "evento" | "carrera" | "temporada";
  /** Si arranca encendida en la primera visita. */
  readonly porDefecto: boolean;
  entradas(anio: Anio): readonly EntradaCalendario[];
}

const festivosNacionales: Capa = {
  id: "festivos",
  nombre: "Festivos nacionales",
  descripcion: "Los días en que no se trabaja en todo el país.",
  tipo: "festivo",
  token: "festivo",
  porDefecto: true,
  entradas(anio) {
    return calcularFestivos(anio).map((festivo) => ({
      tipo: "festivo" as const,
      capa: "festivos",
      slug: festivo.slug,
      nombre: festivo.nombre,
      inicio: festivo.fecha,
      fin: festivo.fecha,
      alcance: "nacional" as const,
      resumen: festivo.descripcion,
      fuente: { nombre: "Wikipedia", url: festivo.wikipedia },
      festivo,
    }));
  },
};

/**
 * Capas que alimenta la hoja de eventos (`src/data/eventos.json`). Solo se
 * crea la capa que tiene al menos una entrada: el conmutador no ofrece una
 * casilla que no enciende nada.
 */
const DE_CONTENIDO: Record<string, Omit<Capa, "entradas">> = {
  fiestas: {
    id: "fiestas",
    nombre: "Fiestas y carnavales",
    descripcion: "Carnavales y ferias regionales. No son festivos: se trabaja igual.",
    tipo: "festividad",
    token: "fiesta",
    porDefecto: false,
  },
  eventos: {
    id: "eventos",
    nombre: "Eventos",
    descripcion: "Conciertos, ferias y fechas señaladas con día propio.",
    tipo: "evento",
    token: "evento",
    porDefecto: false,
  },
  carreras: {
    id: "carreras",
    nombre: "Carreras",
    descripcion: "Maratones y competencias, con su fecha de inscripción.",
    tipo: "evento",
    token: "carrera",
    porDefecto: false,
  },
  temporadas: {
    id: "temporadas",
    nombre: "Temporadas",
    descripcion: "Vacaciones, temporada alta de viaje y periodos largos.",
    tipo: "temporada",
    token: "temporada",
    porDefecto: false,
  },
};

/**
 * Todas las capas del calendario: los festivos, que se calculan, y las que
 * salen de la hoja de eventos. Anadir una capa nueva es anadir sus metadatos
 * arriba y filas con esa `capa` en el JSON.
 */
export const CAPAS: readonly Capa[] = [
  festivosNacionales,
  ...capasConEventos()
    .filter((id) => id in DE_CONTENIDO)
    .map((id) => ({
      ...DE_CONTENIDO[id]!,
      entradas: (anio: Anio) => eventosDeCapa(id, anio),
    })),
];

/** Las capas que arrancan encendidas. */
export const CAPAS_POR_DEFECTO: readonly string[] = CAPAS.filter((c) => c.porDefecto).map(
  (c) => c.id
);

export function capa(id: string): Capa | undefined {
  return CAPAS.find((c) => c.id === id);
}

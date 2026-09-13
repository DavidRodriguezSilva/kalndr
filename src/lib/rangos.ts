import { ANIO_MAXIMO_CALCULABLE, ANIO_REGIMEN_ACTUAL, aniosDestacados } from "@/domain/festivos";

/**
 * Que se prerenderiza y que no.
 *
 * Paginas HTML: solo la ventana destacada, cinco anios a cada lado del actual.
 * Publicar 116 paginas casi identicas para anios que nadie consulta no le
 * sirve a un lector y un buscador lo lee como contenido de relleno.
 *
 * API JSON: el rango completo desde que rige la Ley 51 de 1983 hasta 2099. Un
 * archivo JSON de dos kilobytes no compite por posicionamiento ni diluye
 * nada; solo esta ahi cuando alguien —o algo— lo pide. Son dos publicos con
 * criterios distintos, y no hay razon para atarlos al mismo rango.
 */
export const ANIOS_PAGINA: readonly number[] = aniosDestacados();

export const ANIOS_API: readonly number[] = Array.from(
  { length: ANIO_MAXIMO_CALCULABLE - ANIO_REGIMEN_ACTUAL + 1 },
  (_, i) => ANIO_REGIMEN_ACTUAL + i
);

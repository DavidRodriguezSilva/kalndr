import { describe, expect, it } from "vitest";
import { EVENTOS, entradaDeEvento, eventosDeCapa } from "./eventos";
import { resolver } from "./reglas";

/**
 * La hoja de eventos no pasa por un compilador, así que su validación vive
 * aquí: si una fila está mal escrita, el test falla y CI no la publica. Es el
 * precio de tener un solo archivo fácil de editar, y es barato.
 */
const CAPAS_VALIDAS = ["fiestas", "eventos", "carreras", "temporadas"];
const PRECISIONES = ["exacta", "estimada", "por-confirmar"];

describe("hoja de eventos", () => {
  it("no está vacía", () => {
    expect(EVENTOS.length).toBeGreaterThan(0);
  });

  it("todas las filas tienen la misma estructura", () => {
    const forma = (e: object) => Object.keys(e).sort().join(",");
    const primera = forma(EVENTOS[0]!);
    for (const e of EVENTOS) expect(forma(e), e.id).toBe(primera);
  });

  it("los id son únicos", () => {
    const ids = EVENTOS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(EVENTOS.map((e) => [e.id, e] as const))("%s está bien formada", (_id, e) => {
    expect(e.titulo.length).toBeGreaterThan(2);
    expect(e.descripcion.length).toBeGreaterThan(20);
    expect(e.descripcion.length).toBeLessThan(220);
    expect(CAPAS_VALIDAS).toContain(e.capa);
    expect(PRECISIONES).toContain(e.precision);
    expect(e.lugar.length).toBeGreaterThan(2);
    // Puede ir vacío: una temporada escolar no tiene artículo. Lo que no
    // puede es apuntar a cualquier parte.
    if (e.wikipedia) expect(e.wikipedia).toMatch(/^https:\/\/[a-z]{2}\.wikipedia\.org\//);
    expect(Array.isArray(e.curiosidades)).toBe(true);
    expect(Array.isArray(e.anotaciones)).toBe(true);
  });

  it.each(EVENTOS.map((e) => [e.id, e] as const))(
    "%s resuelve a un periodo coherente en 2026",
    (_id, e) => {
      const periodo = resolver(e.regla, 2026);
      expect(periodo, "la regla no resuelve").toBeDefined();
      expect(periodo!.fin >= periodo!.inicio, "termina antes de empezar").toBe(true);
    }
  );

  it("resuelve el Carnaval de Barranquilla de 2026 al rango correcto", () => {
    const carnaval = EVENTOS.find((e) => e.id === "carnaval-de-barranquilla")!;
    expect(entradaDeEvento(carnaval, 2026)).toMatchObject({
      inicio: "2026-02-14",
      fin: "2026-02-17",
      nombre: "Carnaval de Barranquilla",
    });
  });

  it("agrupa por capa y devuelve ordenado", () => {
    const fiestas = eventosDeCapa("fiestas", 2026);
    expect(fiestas.length).toBeGreaterThan(1);
    expect(fiestas.map((f) => f.inicio)).toEqual([...fiestas.map((f) => f.inicio)].sort());
  });

  it("cada capa declarada tiene al menos una fila", () => {
    for (const capa of CAPAS_VALIDAS) {
      expect(eventosDeCapa(capa, 2026).length, capa).toBeGreaterThan(0);
    }
  });

  it("una capa que no existe no devuelve nada", () => {
    expect(eventosDeCapa("procesiones-marcianas", 2026)).toEqual([]);
  });

  it("las fiestas no pisan la capa de festivos", () => {
    for (const e of EVENTOS) expect(e.capa).not.toBe("festivos");
  });
});

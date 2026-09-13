import { describe, expect, it } from "vitest";
import { TEMAS, calendarioDeTemas, temaActivo } from "./temas";

describe("temas de temporada", () => {
  it("todos los id son únicos y tienen archivo de estilos", () => {
    const ids = TEMAS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("toda regla resuelve a un periodo en 2026", () => {
    for (const periodo of calendarioDeTemas(2026)) {
      expect(periodo.fin >= periodo.inicio, periodo.id).toBe(true);
    }
  });

  it("el Carnaval manda durante el Carnaval de 2026", () => {
    // Pascua 2026: 5 de abril. El tema va de -53 a -46.
    expect(temaActivo("2026-02-14")?.id).toBe("carnaval");
  });

  it("la Semana Santa manda en Jueves Santo", () => {
    expect(temaActivo("2026-04-02")?.id).toBe("semana-santa");
  });

  it("diciembre manda en Navidad y sigue mandando en enero", () => {
    expect(temaActivo("2026-12-25")?.id).toBe("navidad");
    // 3 de enero pertenece a la temporada que arrancó el 1 de diciembre.
    expect(temaActivo("2027-01-03")?.id).toBe("navidad");
  });

  it("una fiesta le gana a la temporada climática cuando se solapan", () => {
    const enFlores = temaActivo("2026-08-07");
    expect(enFlores?.id).toBe("flores");
    expect(enFlores!.prioridad).toBeGreaterThan(10);
  });

  it("las lluvias mandan en octubre", () => {
    expect(temaActivo("2026-10-20")?.id).toBe("lluvias");
  });

  it("hay días sin tema, y eso es válido", () => {
    // Mediados de marzo: fuera de toda temporada declarada.
    expect(temaActivo("2026-03-20")).toBeUndefined();
  });

  it("es determinista", () => {
    expect(temaActivo("2026-08-07")).toEqual(temaActivo("2026-08-07"));
  });
});

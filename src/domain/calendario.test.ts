import { describe, expect, it } from "vitest";
import { calendario, diasHasta, proxima, puentes } from "./calendario";
import { CAPAS_POR_DEFECTO } from "./capas";

describe("capas", () => {
  it("con la capa de festivos encendida trae las 19 entradas de 2026", () => {
    expect(calendario(2026, ["festivos"])).toHaveLength(19);
  });

  it("sin capas encendidas el calendario queda plano", () => {
    expect(calendario(2026, [])).toEqual([]);
  });

  it("ignora una capa que no existe", () => {
    expect(calendario(2026, ["carnavales-marcianos"])).toEqual([]);
  });

  it("la capa de festivos viene encendida por defecto", () => {
    expect(CAPAS_POR_DEFECTO).toContain("festivos");
    expect(calendario(2026)).toHaveLength(19);
  });

  it("devuelve las entradas ordenadas por fecha", () => {
    const fechas = calendario(2026).map((e) => e.inicio);
    expect([...fechas].sort()).toEqual(fechas);
  });
});

describe("proxima", () => {
  it("encuentra el festivo del mismo día", () => {
    expect(proxima("2026-08-17")?.inicio).toBe("2026-08-17");
  });

  it("salta al siguiente cuando el día no es festivo", () => {
    expect(proxima("2026-08-18")?.inicio).toBe("2026-10-12");
  });

  it("cruza el fin de año en vez de quedarse sin respuesta", () => {
    expect(proxima("2026-12-26")?.inicio).toBe("2027-01-01");
  });
});

describe("puentes", () => {
  it("solo cuenta los festivos que caen en lunes", () => {
    const lunes = puentes(2026);
    expect(lunes.length).toBeGreaterThan(0);
    for (const p of lunes) expect(new Date(`${p.inicio}T00:00:00Z`).getUTCDay()).toBe(1);
  });
});

describe("diasHasta", () => {
  it("cuenta hacia adelante y hacia atrás", () => {
    const asuncion = calendario(2026).find((e) => e.slug === "asuncion")!;
    expect(diasHasta("2026-08-10", asuncion)).toBe(7);
    expect(diasHasta("2026-08-18", asuncion)).toBe(-1);
  });
});

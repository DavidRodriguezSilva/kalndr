import { describe, expect, it } from "vitest";
import { resolver, type Regla } from "./reglas";

describe("regla fija", () => {
  it("resuelve un solo día", () => {
    const r: Regla = { tipo: "fija", mes: 7, dia: 20 };
    expect(resolver(r, 2026)).toEqual({ inicio: "2026-07-20", fin: "2026-07-20" });
  });

  it("extiende la duración declarada", () => {
    const r: Regla = { tipo: "fija", mes: 1, dia: 1, dias: 3 };
    expect(resolver(r, 2026)).toEqual({ inicio: "2026-01-01", fin: "2026-01-03" });
  });
});

describe("regla rango", () => {
  it("resuelve la Feria de Cali", () => {
    const r: Regla = { tipo: "rango", desde: { mes: 12, dia: 25 }, hasta: { mes: 12, dia: 30 } };
    expect(resolver(r, 2026)).toEqual({ inicio: "2026-12-25", fin: "2026-12-30" });
  });

  it("cruza el fin de año sin terminar antes de empezar", () => {
    const r: Regla = { tipo: "rango", desde: { mes: 12, dia: 28 }, hasta: { mes: 1, dia: 2 } };
    expect(resolver(r, 2026)).toEqual({ inicio: "2026-12-28", fin: "2027-01-02" });
  });
});

describe("regla pascua", () => {
  it("resuelve el Carnaval de Barranquilla de 2026", () => {
    // Pascua 2026: domingo 5 de abril; Miércoles de Ceniza, el 18 de febrero.
    // El carnaval va del sábado anterior (-50) al martes (-47).
    const r: Regla = { tipo: "pascua", desde: -50, hasta: -47 };
    expect(resolver(r, 2026)).toEqual({ inicio: "2026-02-14", fin: "2026-02-17" });
  });
});

describe("regla ordinal", () => {
  it("encuentra el primer sábado de agosto de 2026", () => {
    const r: Regla = { tipo: "ordinal", mes: 8, diaSemana: 6, ocurrencia: 1 };
    expect(resolver(r, 2026)?.inicio).toBe("2026-08-01");
  });

  it("encuentra el tercer lunes de octubre de 2026", () => {
    const r: Regla = { tipo: "ordinal", mes: 10, diaSemana: 1, ocurrencia: 3 };
    expect(resolver(r, 2026)?.inicio).toBe("2026-10-19");
  });

  it("cuenta desde el final con ocurrencia negativa", () => {
    const r: Regla = { tipo: "ordinal", mes: 8, diaSemana: 0, ocurrencia: -1 };
    expect(resolver(r, 2026)?.inicio).toBe("2026-08-30");
  });

  it("devuelve undefined si el mes no alcanza esa ocurrencia", () => {
    const r: Regla = { tipo: "ordinal", mes: 2, diaSemana: 1, ocurrencia: 5 };
    expect(resolver(r, 2026)).toBeUndefined();
  });
});

describe("regla fechas", () => {
  const r: Regla = {
    tipo: "fechas",
    porAnio: { "2026": { desde: "2026-09-12", hasta: "2026-09-13" } },
  };

  it("usa la fecha declarada para ese año", () => {
    expect(resolver(r, 2026)).toEqual({ inicio: "2026-09-12", fin: "2026-09-13" });
  });

  it("no inventa el año que no está declarado", () => {
    expect(resolver(r, 2027)).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import {
  calcular360Dias,
  contarDiasHabiles,
  desplazarDiasHabiles,
  esDiaHabil,
  esFinDeSemana,
} from "./habiles";

describe("esFinDeSemana", () => {
  it("distingue sábado y domingo del resto", () => {
    expect(esFinDeSemana("2026-08-15")).toBe(true); // sabado
    expect(esFinDeSemana("2026-08-16")).toBe(true); // domingo
    expect(esFinDeSemana("2026-08-17")).toBe(false); // lunes
  });
});

describe("esDiaHabil", () => {
  it("excluye festivos entre semana", () => {
    expect(esDiaHabil("2026-08-17")).toBe(false); // lunes festivo (Asuncion)
    expect(esDiaHabil("2026-08-18")).toBe(true); // martes comun
  });
});

describe("desplazarDiasHabiles", () => {
  it("salta el fin de semana y el festivo del lunes", () => {
    // Viernes 14 de agosto de 2026; el lunes 17 es festivo.
    expect(desplazarDiasHabiles("2026-08-14", 1)).toBe("2026-08-18");
  });

  it("cuenta hacia atrás", () => {
    expect(desplazarDiasHabiles("2026-08-18", 1, false)).toBe("2026-08-14");
  });

  it("no cuenta la fecha de partida", () => {
    expect(desplazarDiasHabiles("2026-08-18", 0)).toBe("2026-08-18");
  });

  it("rechaza cantidades negativas", () => {
    expect(() => desplazarDiasHabiles("2026-08-18", -1)).toThrow(RangeError);
  });
});

describe("contarDiasHabiles", () => {
  it("cuenta ambos extremos incluidos", () => {
    // Lun 10 a vie 14 de agosto de 2026: cinco dias habiles.
    expect(contarDiasHabiles("2026-08-10", "2026-08-14")).toBe(5);
  });

  it("descuenta el festivo de la semana", () => {
    // Lun 17 (festivo) a vie 21: cuatro habiles.
    expect(contarDiasHabiles("2026-08-17", "2026-08-21")).toBe(4);
  });

  it("devuelve 0 si el orden está invertido", () => {
    expect(contarDiasHabiles("2026-08-21", "2026-08-17")).toBe(0);
  });
});

describe("calcular360Dias", () => {
  it("da 360 para un año exacto", () => {
    expect(calcular360Dias("2026-01-01", "2027-01-01")).toBe(360);
  });

  it("da 30 para un mes exacto", () => {
    expect(calcular360Dias("2026-01-15", "2026-02-15")).toBe(30);
  });

  it("trata el 31 como 30", () => {
    expect(calcular360Dias("2026-01-31", "2026-02-28")).toBe(28);
  });

  it("devuelve 0 si el orden está invertido", () => {
    expect(calcular360Dias("2026-02-01", "2026-01-01")).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import {
  ANIO_CHIQUINQUIRA,
  ANIO_MAXIMO_CALCULABLE,
  ANIO_MINIMO_CALCULABLE,
  aniosDestacados,
  calcularFestivos,
  coincidencias,
  diasNoLaborables,
  domingoPascua,
  esFestivo,
  proximoLunes,
  totalFestivos,
} from "./festivos";
import { diaSemana } from "./fechas";

/**
 * Contrato del algoritmo de festivos. 2026 esta verificado a mano: Pascua cae
 * el domingo 5 de abril, y los trasladables se corren al lunes siguiente
 * cuando no caen en lunes (Ley 51 de 1983).
 */
const FESTIVOS_2026 = [
  ["2026-01-01", "Año Nuevo", false],
  ["2026-01-12", "Día de los Reyes Magos", true],
  ["2026-03-23", "Día de San José", true],
  ["2026-04-02", "Jueves Santo", false],
  ["2026-04-03", "Viernes Santo", false],
  ["2026-05-01", "Día del Trabajo", false],
  ["2026-05-18", "Ascensión del Señor", false],
  ["2026-06-08", "Corpus Christi", false],
  ["2026-06-15", "Sagrado Corazón de Jesús", false],
  ["2026-06-29", "San Pedro y San Pablo", false],
  ["2026-07-13", "Virgen del Rosario de Chiquinquirá", true],
  ["2026-07-20", "Día de la Independencia", false],
  ["2026-08-07", "Batalla de Boyacá", false],
  ["2026-08-17", "La Asunción de la Virgen", true],
  ["2026-10-12", "Día de la Raza", false],
  ["2026-11-02", "Todos los Santos", true],
  ["2026-11-16", "Independencia de Cartagena", true],
  ["2026-12-08", "La Inmaculada Concepción", false],
  ["2026-12-25", "Navidad", false],
] as const;

describe("domingoPascua", () => {
  it.each([
    [2024, "2024-03-31"],
    [2025, "2025-04-20"],
    [2026, "2026-04-05"],
    [2027, "2027-03-28"],
    [2030, "2030-04-21"],
  ])("Pascua de %i es el %s", (anio, esperado) => {
    expect(domingoPascua(anio)).toBe(esperado);
  });
});

describe("proximoLunes", () => {
  it("deja quieto un lunes", () => {
    expect(proximoLunes("2026-10-12")).toBe("2026-10-12");
  });

  it("corre el resto de la semana al lunes siguiente", () => {
    expect(proximoLunes("2026-01-06")).toBe("2026-01-12"); // martes
    expect(proximoLunes("2026-08-15")).toBe("2026-08-17"); // sabado
    expect(proximoLunes("2026-11-01")).toBe("2026-11-02"); // domingo
  });
});

describe("calcularFestivos", () => {
  it("devuelve las fechas de 2026, en orden", () => {
    expect(calcularFestivos(2026).map((f) => f.fecha)).toEqual(
      FESTIVOS_2026.map(([fecha]) => fecha)
    );
  });

  it("devuelve los nombres de 2026, en orden", () => {
    expect(calcularFestivos(2026).map((f) => f.nombre)).toEqual(
      FESTIVOS_2026.map(([, nombre]) => nombre)
    );
  });

  it("marca como trasladados exactamente los que movio la Ley Emiliani", () => {
    expect(calcularFestivos(2026).map((f) => f.trasladado)).toEqual(
      FESTIVOS_2026.map(([, , movido]) => movido)
    );
  });

  it("da fechaOriginal si y solo si hubo traslado", () => {
    for (const f of calcularFestivos(2026)) {
      if (f.trasladado) {
        expect(f.fechaOriginal).toBeDefined();
        expect(f.fechaOriginal).not.toBe(f.fecha);
      } else {
        expect(f.fechaOriginal).toBeUndefined();
      }
    }
  });

  it("todo festivo trasladado cae en lunes", () => {
    for (const f of calcularFestivos(2026)) {
      if (f.trasladado) expect(diaSemana(f.fecha)).toBe(1);
    }
  });

  it("Ascensión, Corpus y Sagrado Corazón caen en lunes por construcción", () => {
    for (const anio of [2024, 2025, 2026, 2030]) {
      const moviles = calcularFestivos(anio).filter((f) => f.regla === "pascua-trasladable");
      expect(moviles).toHaveLength(3);
      for (const f of moviles) expect(diaSemana(f.fecha)).toBe(1);
    }
  });

  it.each([2020, 2024, 2025, 2026, 2027, 2030, 2035])("tiene el total correcto en %i", (anio) => {
    expect(calcularFestivos(anio)).toHaveLength(totalFestivos(anio));
  });

  it("añade Chiquinquirá solo desde la Ley 2578 de 2026", () => {
    const tiene = (anio: number) => calcularFestivos(anio).some((f) => f.slug === "chiquinquira");
    expect(tiene(ANIO_CHIQUINQUIRA - 1)).toBe(false);
    expect(tiene(ANIO_CHIQUINQUIRA)).toBe(true);
    expect(totalFestivos(ANIO_CHIQUINQUIRA - 1)).toBe(18);
    expect(totalFestivos(ANIO_CHIQUINQUIRA)).toBe(19);
  });

  it("es pura: dos llamadas con el mismo año dan lo mismo", () => {
    expect(calcularFestivos(2027)).toEqual(calcularFestivos(2027));
  });

  it("usa slugs estables entre años", () => {
    const slugs = (anio: number) => [...calcularFestivos(anio).map((f) => f.slug)].sort();
    expect(slugs(2026)).toEqual(slugs(2031));
  });

  it("permite que dos celebraciones compartan fecha, sin duplicar slugs", () => {
    for (let anio = 2020; anio <= 2035; anio += 1) {
      const slugs = calcularFestivos(anio).map((f) => f.slug);
      expect(new Set(slugs).size, `año ${anio}`).toBe(slugs.length);
    }
  });

  it("cuenta un día menos de descanso cuando dos festivos coinciden", () => {
    // El 29 de junio cae en domingo: San Pedro y San Pablo se corre al lunes
    // 30 y se encuentra con el Sagrado Corazón, que ya estaba ahí.
    expect(coincidencias(2025).map((g) => g.map((f) => f.slug))).toEqual([
      ["sagrado-corazon", "san-pedro-y-san-pablo"],
    ]);
    expect(calcularFestivos(2025)).toHaveLength(18);
    expect(diasNoLaborables(2025)).toHaveLength(17);
  });

  it("no hay coincidencias en un año normal", () => {
    expect(coincidencias(2026)).toEqual([]);
    expect(diasNoLaborables(2026)).toHaveLength(19);
  });

  it("mantiene todas las fechas dentro del año pedido", () => {
    for (let anio = 2020; anio <= 2035; anio += 1) {
      for (const f of calcularFestivos(anio)) {
        expect(f.fecha.slice(0, 4), `año ${anio}`).toBe(String(anio));
      }
    }
  });
});

describe("esFestivo", () => {
  it("reconoce un festivo y rechaza el día siguiente", () => {
    expect(esFestivo("2026-08-17")).toBe(true);
    expect(esFestivo("2026-08-18")).toBe(false);
  });
});

describe("rango de años", () => {
  it("calcula en los extremos del calendario gregoriano y hasta 2099", () => {
    expect(() => calcularFestivos(ANIO_MINIMO_CALCULABLE)).not.toThrow();
    expect(() => calcularFestivos(ANIO_MAXIMO_CALCULABLE)).not.toThrow();
  });

  it("rechaza lo que queda fuera", () => {
    expect(() => calcularFestivos(ANIO_MINIMO_CALCULABLE - 1)).toThrow(RangeError);
    expect(() => calcularFestivos(ANIO_MAXIMO_CALCULABLE + 1)).toThrow(RangeError);
    expect(() => calcularFestivos(2026.5)).toThrow(RangeError);
  });

  it("sostiene los invariantes en todo el rango calculable, no solo en la ventana", () => {
    for (const anio of [1583, 1700, 1900, 1984, 2000, 2050, 2099]) {
      const festivos = calcularFestivos(anio);
      expect(festivos, `año ${anio}`).toHaveLength(totalFestivos(anio));
      for (const f of festivos) {
        expect(f.fecha.slice(0, 4), `año ${anio}`).toBe(String(anio));
        if (f.trasladado) expect(diaSemana(f.fecha), `año ${anio}`).toBe(1);
      }
    }
  });

  it("la ventana destacada son cinco años a cada lado del de referencia", () => {
    expect(aniosDestacados(2026)).toEqual([
      2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031,
    ]);
  });
});

describe("descripción y enlace", () => {
  it("todo festivo se explica en una frase y enlaza a Wikipedia", () => {
    for (const f of calcularFestivos(2026)) {
      expect(f.descripcion.length, f.slug).toBeGreaterThan(25);
      expect(f.descripcion.length, f.slug).toBeLessThan(180);
      expect(f.wikipedia, f.slug).toMatch(/^https:\/\/es\.wikipedia\.org\/wiki\/.+/);
    }
  });

  it("no hay dos festivos con la misma descripción", () => {
    const textos = calcularFestivos(2026).map((f) => f.descripcion);
    expect(new Set(textos).size).toBe(textos.length);
  });
});

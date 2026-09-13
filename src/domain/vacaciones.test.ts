import { describe, expect, it } from "vitest";
import { oportunidades, repartir } from "./vacaciones";
import { esDiaHabil } from "./habiles";
import { diasEntre, sumarDias } from "./fechas";

describe("oportunidades", () => {
  it("sin días de vacaciones no hay nada que ofrecer", () => {
    expect(oportunidades(2026, 0)).toEqual([]);
  });

  it("nunca propone pedir un día que ya es libre", () => {
    for (const o of oportunidades(2026, 5, 30)) {
      for (const dia of o.pedir) expect(esDiaHabil(dia), dia).toBe(true);
    }
  });

  it("nunca pide más días de los que hay", () => {
    for (const presupuesto of [1, 3, 5, 10]) {
      for (const o of oportunidades(2026, presupuesto, 30)) {
        expect(o.diasPedidos).toBeLessThanOrEqual(presupuesto);
        expect(o.pedir).toHaveLength(o.diasPedidos);
      }
    }
  });

  it("el tramo está estirado al máximo por los dos lados", () => {
    // El tramo puede empezar en día hábil —el que se pide— pero nunca puede
    // quedar un día libre pegado por fuera: eso sería descanso regalado.
    for (const o of oportunidades(2026, 5, 30)) {
      expect(esDiaHabil(sumarDias(o.inicio, -1)), `antes de ${o.inicio}`).toBe(true);
      expect(esDiaHabil(sumarDias(o.fin, 1)), `después de ${o.fin}`).toBe(true);
    }
  });

  it("los días libres cuadran con las fechas del tramo", () => {
    for (const o of oportunidades(2026, 5, 30)) {
      expect(o.diasLibres).toBe(diasEntre(o.inicio, o.fin) + 1);
      expect(o.rendimiento).toBeCloseTo(o.diasLibres / o.diasPedidos);
    }
  });

  it("siempre rinde: más días libres que pedidos", () => {
    for (const o of oportunidades(2026, 5, 30)) {
      expect(o.diasLibres).toBeGreaterThan(o.diasPedidos);
    }
  });

  it("viene ordenado por días libres", () => {
    const libres = oportunidades(2026, 5).map((o) => o.diasLibres);
    expect(libres).toEqual([...libres].sort((a, b) => b - a));
  });

  it("encuentra el puente de junio de 2026: cuatro días por diez", () => {
    // Corpus Christi cae el lunes 8 y el Sagrado Corazón el lunes 15.
    // Pidiendo del martes 9 al viernes 12 se encadenan del sábado 6 al
    // lunes 15.
    const junio = oportunidades(2026, 4, 50).find((o) => o.inicio === "2026-06-06");
    expect(junio).toBeDefined();
    expect(junio!.fin).toBe("2026-06-15");
    expect(junio!.diasLibres).toBe(10);
    expect(junio!.diasPedidos).toBe(4);
    expect(junio!.pedir).toEqual(["2026-06-09", "2026-06-10", "2026-06-11", "2026-06-12"]);
  });

  it("encuentra la Semana Santa de 2026: tres días por nueve", () => {
    // Jueves y Viernes Santo caen el 2 y 3 de abril.
    const santa = oportunidades(2026, 3, 50).find((o) => o.inicio === "2026-03-28");
    expect(santa).toBeDefined();
    expect(santa!.fin).toBe("2026-04-05");
    expect(santa!.diasLibres).toBe(9);
    expect(santa!.diasPedidos).toBe(3);
  });

  it("con más presupuesto nunca empeora la mejor opción", () => {
    const conTres = oportunidades(2026, 3)[0]!.diasLibres;
    const conCinco = oportunidades(2026, 5)[0]!.diasLibres;
    expect(conCinco).toBeGreaterThanOrEqual(conTres);
  });

  it("es determinista", () => {
    expect(oportunidades(2026, 5)).toEqual(oportunidades(2026, 5));
  });
});

describe("repartir", () => {
  it("no se pasa del presupuesto", () => {
    for (const presupuesto of [3, 5, 10, 15]) {
      const plan = repartir(2026, presupuesto);
      const gastado = plan.reduce((s, o) => s + o.diasPedidos, 0);
      expect(gastado).toBeLessThanOrEqual(presupuesto);
    }
  });

  it("los tramos no se pisan entre sí", () => {
    const plan = repartir(2026, 15);
    for (let i = 1; i < plan.length; i += 1) {
      expect(plan[i]!.inicio > plan[i - 1]!.fin, `${plan[i - 1]!.fin} → ${plan[i]!.inicio}`).toBe(
        true
      );
    }
  });

  it("viene en orden cronológico", () => {
    const inicios = repartir(2026, 15).map((o) => o.inicio);
    expect(inicios).toEqual([...inicios].sort());
  });

  it("con quince días reparte en varios tramos, no en uno solo", () => {
    expect(repartir(2026, 15).length).toBeGreaterThan(1);
  });
});

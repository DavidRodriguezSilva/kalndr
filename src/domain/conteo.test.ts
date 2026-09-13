import { describe, expect, it } from "vitest";
import { contar, fechaExiste, revisar } from "./conteo";

describe("fechaExiste", () => {
  it("acepta fechas reales", () => {
    expect(fechaExiste("2026-08-17")).toBe(true);
    expect(fechaExiste("2028-02-29")).toBe(true); // bisiesto
  });

  it("rechaza las que no existen", () => {
    expect(fechaExiste("2026-02-30")).toBe(false);
    expect(fechaExiste("2026-13-01")).toBe(false);
    expect(fechaExiste("2026-00-10")).toBe(false);
    expect(fechaExiste("2026-04-31")).toBe(false);
    expect(fechaExiste("2027-02-29")).toBe(false); // no bisiesto
  });

  it("rechaza lo que no tiene forma de fecha", () => {
    expect(fechaExiste("17/08/2026")).toBe(false);
    expect(fechaExiste("2026-8-17")).toBe(false);
    expect(fechaExiste("")).toBe(false);
  });
});

describe("revisar", () => {
  it("deja pasar un rango correcto", () => {
    expect(revisar("2026-01-01", "2026-12-31")).toBeUndefined();
  });

  it("pide las dos fechas", () => {
    expect(revisar("", "2026-12-31")?.motivo).toBe("vacio");
    expect(revisar("2026-01-01", "")?.motivo).toBe("vacio");
  });

  it("señala el campo con el formato malo", () => {
    const malo = revisar("01/01/2026", "2026-12-31");
    expect(malo?.motivo).toBe("formato");
    expect(malo?.campo).toBe("desde");
  });

  it("avisa cuando la fecha no existe", () => {
    expect(revisar("2026-02-30", "2026-12-31")?.motivo).toBe("inexistente");
  });

  it("avisa cuando el orden está invertido", () => {
    expect(revisar("2026-12-31", "2026-01-01")?.motivo).toBe("orden");
  });

  it("rechaza años fuera de lo calculable", () => {
    expect(revisar("1500-01-01", "2026-01-01")?.motivo).toBe("fuera-de-rango");
    expect(revisar("2026-01-01", "2200-01-01")?.motivo).toBe("fuera-de-rango");
  });

  it("desconfía de un rango de siglos", () => {
    expect(revisar("1900-01-01", "2099-01-01")?.motivo).toBe("demasiado-largo");
  });

  it("todo mensaje se puede mostrar tal cual", () => {
    for (const par of [
      ["", ""],
      ["x", "2026-01-01"],
      ["2026-02-30", "2026-03-01"],
      ["2026-12-31", "2026-01-01"],
    ] as const) {
      const malo = revisar(par[0], par[1])!;
      expect(malo.mensaje.length).toBeGreaterThan(15);
      expect(malo.mensaje.endsWith(".")).toBe(true);
    }
  });
});

describe("contar", () => {
  it("distingue la diferencia de los días inclusivos", () => {
    const c = contar("2026-01-01", "2026-01-08");
    expect(c.diferencia).toBe(7);
    expect(c.inclusivos).toBe(8);
  });

  it("un solo día es cero de diferencia y uno inclusivo", () => {
    const c = contar("2026-08-17", "2026-08-17");
    expect(c.diferencia).toBe(0);
    expect(c.inclusivos).toBe(1);
  });

  it("cuenta el año completo en las dos bases", () => {
    const c = contar("2026-01-01", "2026-12-31");
    expect(c.diferencia).toBe(364);
    // Rareza conocida de la convención 30/360: el día 31 solo se trata como
    // 30 si el día inicial también lo es, así que del 1 de enero al 31 de
    // diciembre dan 360 clavados aunque falte un día de calendario.
    expect(c.dias360).toBe(360);
  });

  it("da 360 justos para un año de base comercial", () => {
    expect(contar("2026-01-01", "2027-01-01").dias360).toBe(360);
  });

  it("descuenta fines de semana y festivos de los días hábiles", () => {
    // Lunes 17 (festivo, La Asunción) a viernes 21 de agosto de 2026.
    const c = contar("2026-08-17", "2026-08-21");
    expect(c.inclusivos).toBe(5);
    expect(c.habiles).toBe(4);
    expect(c.finesDeSemana).toBe(0);
    expect(c.festivos.map((f) => f.slug)).toEqual(["asuncion"]);
  });

  it("cuenta los fines de semana de una semana corrida", () => {
    // Lunes 10 a domingo 16 de agosto de 2026.
    const c = contar("2026-08-10", "2026-08-16");
    expect(c.inclusivos).toBe(7);
    expect(c.finesDeSemana).toBe(2);
    expect(c.habiles).toBe(5);
  });

  it("encuentra los festivos aunque el rango cruce el año", () => {
    const c = contar("2026-12-20", "2027-01-10");
    expect(c.festivos.map((f) => f.fecha)).toEqual(["2026-12-25", "2027-01-01"]);
  });

  it("reparte en semanas y días sueltos", () => {
    const c = contar("2026-01-01", "2026-01-18");
    expect(c.diferencia).toBe(17);
    expect(c.semanas).toBe(2);
    expect(c.diasSueltos).toBe(3);
  });

  it("cuadra: hábiles más fines de semana más festivos entre semana", () => {
    const c = contar("2026-01-01", "2026-12-31");
    const festivosEntreSemana = c.festivos.filter(
      (f) => ![0, 6].includes(new Date(`${f.fecha}T00:00:00Z`).getUTCDay())
    ).length;
    expect(c.habiles + c.finesDeSemana + festivosEntreSemana).toBe(c.inclusivos);
  });

  it("es determinista", () => {
    expect(contar("2026-03-01", "2026-09-30")).toEqual(contar("2026-03-01", "2026-09-30"));
  });
});

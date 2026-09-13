import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Selector de fecha.
 *
 * Primitiva propia, no la de shadcn/ui. Dos razones. La primera es que el
 * calendario de shadcn monta `react-day-picker` —una dependencia entera— y
 * aqui hacia falta justo lo contrario: el sitio compite en consultas que se
 * hacen desde el telefono y cada kilobyte se justifica. La segunda es que el
 * recorrido que hace falta —dias, y de ahi a meses, y de ahi a anios— no es
 * el de shadcn sino el del selector nativo del navegador, que en esquema
 * oscuro ni siquiera deja ver su propio icono.
 *
 * El campo acepta escritura directa en formato ISO (`AAAA-MM-DD`), que es el
 * formato en el que la aplicacion entera habla, y el boton de al lado abre el
 * calendario para quien prefiera senalar.
 */
interface Props {
  id?: string;
  /** Fecha en `YYYY-MM-DD`. Puede venir incompleta mientras se escribe. */
  valor: string;
  onCambio: (valor: string) => void;
  etiqueta: string;
  anioMinimo?: number;
  anioMaximo?: number;
  invalido?: boolean;
}

type Nivel = "dias" | "meses" | "anios";

const DIAS_SEMANA = ["l", "m", "m", "j", "v", "s", "d"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGOS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const iso = (anio: number, mes: number, dia: number) =>
  `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

/** Lunes en la posicion 0, que es como se lee un calendario aqui. */
const columna = (fecha: string) => (new Date(`${fecha}T00:00:00Z`).getUTCDay() + 6) % 7;

export function SelectorFecha({
  id,
  valor,
  onCambio,
  etiqueta,
  anioMinimo = 1583,
  anioMaximo = 2099,
  invalido = false,
}: Props) {
  const generado = useId();
  const campoId = id ?? generado;

  const [abierto, setAbierto] = useState(false);
  const [nivel, setNivel] = useState<Nivel>("dias");
  const [anio, setAnio] = useState(() => Number(valor.slice(0, 4)) || new Date().getFullYear());
  const [mes, setMes] = useState(() => Number(valor.slice(5, 7)) || 1);
  const caja = useRef<HTMLDivElement>(null);

  // Al abrir, el calendario se para donde apunte el campo: si alguien escribio
  // una fecha y luego abre el selector, esperaria verla, no volver a hoy.
  useEffect(() => {
    if (!abierto) return;
    const a = Number(valor.slice(0, 4));
    const m = Number(valor.slice(5, 7));
    if (a >= anioMinimo && a <= anioMaximo) setAnio(a);
    if (m >= 1 && m <= 12) setMes(m);
    setNivel("dias");
  }, [abierto, valor, anioMinimo, anioMaximo]);

  useEffect(() => {
    if (!abierto) return;
    function fuera(e: MouseEvent) {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    }
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  function escoger(dia: number) {
    onCambio(iso(anio, mes, dia));
    setAbierto(false);
  }

  const totalDias = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const primerDia = iso(anio, mes, 1);
  const decada = Math.floor(anio / 12) * 12;

  return (
    <div ref={caja} className="relative">
      <label htmlFor={campoId} className="block text-sm font-medium">
        {etiqueta}
      </label>

      <div className="mt-2 flex">
        <input
          id={campoId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          placeholder="AAAA-MM-DD"
          value={valor}
          onChange={(e) => onCambio(e.target.value.trim())}
          aria-invalid={invalido}
          className={cn(
            "h-12 w-full min-w-0 rounded-l-md border border-r-0 bg-card px-3 font-mono text-base tabular-nums",
            invalido ? "border-destructive" : "border-border"
          )}
        />
        <button
          type="button"
          onClick={() => setAbierto((a) => !a)}
          aria-expanded={abierto}
          aria-label={`Abrir calendario para ${etiqueta.toLowerCase()}`}
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-r-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            invalido ? "border-destructive" : "border-border"
          )}
        >
          <CalendarDays size={18} aria-hidden />
        </button>
      </div>

      {abierto && (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-[19rem] rounded-lg border border-border bg-popover p-3 shadow-lg">
          {/* Cabecera: el titulo es el que sube de nivel. */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setNivel(nivel === "dias" ? "meses" : "anios")}
              disabled={nivel === "anios"}
              className="rounded-md px-2 py-1.5 text-sm font-semibold capitalize transition-colors hover:bg-muted disabled:pointer-events-none"
            >
              {nivel === "dias" && `${MESES_LARGOS[mes - 1]} ${anio}`}
              {nivel === "meses" && anio}
              {nivel === "anios" && `${decada} – ${decada + 11}`}
            </button>

            <div className="flex gap-1">
              <button
                type="button"
                aria-label="Anterior"
                onClick={() => {
                  if (nivel === "dias") {
                    if (mes === 1) {
                      setMes(12);
                      setAnio(anio - 1);
                    } else setMes(mes - 1);
                  } else if (nivel === "meses") setAnio(anio - 1);
                  else setAnio(Math.max(anioMinimo, anio - 12));
                }}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft size={15} aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Siguiente"
                onClick={() => {
                  if (nivel === "dias") {
                    if (mes === 12) {
                      setMes(1);
                      setAnio(anio + 1);
                    } else setMes(mes + 1);
                  } else if (nivel === "meses") setAnio(anio + 1);
                  else setAnio(Math.min(anioMaximo, anio + 12));
                }}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronRight size={15} aria-hidden />
              </button>
            </div>
          </div>

          {nivel === "dias" && (
            <>
              <div className="mt-3 grid grid-cols-7 gap-0.5 text-center text-[10px] uppercase text-muted-foreground">
                {DIAS_SEMANA.map((d, i) => (
                  <span key={`${d}-${i}`} className="py-1">
                    {d}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: columna(primerDia) }, (_, i) => (
                  <span key={`hueco-${i}`} aria-hidden />
                ))}
                {Array.from({ length: totalDias }, (_, i) => i + 1).map((dia) => {
                  const fecha = iso(anio, mes, dia);
                  return (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => escoger(dia)}
                      aria-pressed={fecha === valor}
                      className={cn(
                        "flex aspect-square items-center justify-center rounded-md font-mono text-sm transition-colors",
                        fecha === valor
                          ? "bg-primary font-semibold text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      {dia}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {nivel === "meses" && (
            <div className="mt-3 grid grid-cols-4 gap-1">
              {MESES.map((nombre, i) => (
                <button
                  key={nombre}
                  type="button"
                  onClick={() => {
                    setMes(i + 1);
                    setNivel("dias");
                  }}
                  aria-pressed={i + 1 === mes}
                  className={cn(
                    "rounded-md py-2.5 text-sm transition-colors",
                    i + 1 === mes ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  {nombre}
                </button>
              ))}
            </div>
          )}

          {nivel === "anios" && (
            <div className="mt-3 grid grid-cols-4 gap-1">
              {Array.from({ length: 12 }, (_, i) => decada + i)
                .filter((a) => a >= anioMinimo && a <= anioMaximo)
                .map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => {
                      setAnio(a);
                      setNivel("meses");
                    }}
                    aria-pressed={a === anio}
                    className={cn(
                      "rounded-md py-2.5 font-mono text-sm transition-colors",
                      a === anio ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    )}
                  >
                    {a}
                  </button>
                ))}
            </div>
          )}

          <div className="mt-3 flex justify-between border-t border-border pt-2.5 text-sm">
            <button
              type="button"
              onClick={() => {
                onCambio("");
                setAbierto(false);
              }}
              className="rounded-md px-2 py-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              Borrar
            </button>
            <button
              type="button"
              onClick={() => {
                const ahora = new Intl.DateTimeFormat("en-CA", {
                  timeZone: "America/Bogota",
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                }).format(new Date());
                onCambio(ahora);
                setAbierto(false);
              }}
              className="rounded-md px-2 py-1 text-primary transition-colors hover:underline"
            >
              Hoy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

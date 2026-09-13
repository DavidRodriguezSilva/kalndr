import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, RotateCcw } from "lucide-react";
import { calendario } from "@/domain/calendario";
import { CAPAS, CAPAS_POR_DEFECTO } from "@/domain/capas";
import { anioActual } from "@/domain/festivos";
import { formatoLargo, nombreMes } from "@/domain/fechas";
import type { EntradaCalendario } from "@/domain/tipos";
import { cn } from "@/lib/cn";

/**
 * El calendario y su agenda.
 *
 * Dos vistas de lo mismo, lado a lado: la rejilla del mes para ver la forma
 * —donde caen los puentes, que semana esta cargada— y la agenda para leer el
 * detalle. Escoger un dia en la rejilla mueve la agenda a ese dia y lo abre;
 * el resto de la agenda se queda compacto, con el nombre y la fecha nada mas.
 *
 * Todo se calcula en el navegador porque el dominio es TypeScript puro y
 * viaja entero en unos pocos kilobytes: cambiar de anio no recarga la pagina
 * ni pide nada a la red. El servidor pinta el mismo HTML para que el buscador
 * —y quien llegue sin JavaScript— vea el calendario completo.
 */
interface Props {
  /** Anio que se muestra al abrir. */
  anioInicial: number;
  /** Fecha de hoy en Bogota, `YYYY-MM-DD`, calculada en el build. */
  hoy: string;
}

const DIAS_SEMANA = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

/** Dia de la semana con el lunes en la posicion 0, que es como se lee aqui. */
function columnaDe(fecha: string): number {
  return (new Date(`${fecha}T00:00:00Z`).getUTCDay() + 6) % 7;
}

function diasDelMes(anio: number, mes: number): string[] {
  const total = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const mm = String(mes).padStart(2, "0");
  return Array.from({ length: total }, (_, i) => `${anio}-${mm}-${String(i + 1).padStart(2, "0")}`);
}

function tokenDeCapa(tipo: EntradaCalendario["tipo"]): string {
  return tipo === "festivo" ? "bg-festivo" : "bg-fiesta";
}

export default function Calendario({ anioInicial, hoy }: Props) {
  const [anio, setAnio] = useState(anioInicial);
  const [mes, setMes] = useState(() => Number(hoy.slice(5, 7)));
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [capas, setCapas] = useState<readonly string[]>(CAPAS_POR_DEFECTO);
  const listaRef = useRef<HTMLUListElement>(null);

  // El HTML llega con la fecha del build. Si el visitante abre la pagina otro
  // dia, se corrige despues de hidratar —nunca durante el primer render, que
  // rompe la coincidencia con lo que pinto el servidor.
  const [hoyReal, setHoyReal] = useState(hoy);
  useEffect(() => {
    const real = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    if (real !== hoy) {
      setHoyReal(real);
      if (anio === anioActual()) setMes(Number(real.slice(5, 7)));
    }
  }, [hoy, anio]);

  const entradas = useMemo(() => calendario(anio, capas), [anio, capas]);

  /** Las entradas que cubren cada dia; una temporada cubre muchos. */
  const porDia = useMemo(() => {
    const mapa = new Map<string, EntradaCalendario[]>();
    for (const dia of diasDelMes(anio, mes)) {
      const encima = entradas.filter((e) => e.inicio <= dia && dia <= e.fin);
      if (encima.length > 0) mapa.set(dia, encima);
    }
    return mapa;
  }, [entradas, anio, mes]);

  const dias = diasDelMes(anio, mes);
  const huecos = dias[0] ? columnaDe(dias[0]) : 0;

  const alternarCapa = (id: string) =>
    setCapas((activas) =>
      activas.includes(id) ? activas.filter((x) => x !== id) : [...activas, id]
    );

  /** Al escoger un dia, la agenda se mueve hasta el y lo abre. */
  function escoger(dia: string) {
    const cubre = entradas.find((e) => e.inicio <= dia && dia <= e.fin);
    setSeleccionado(cubre ? cubre.inicio : dia);
  }

  useEffect(() => {
    if (!seleccionado || !listaRef.current) return;
    const fila = listaRef.current.querySelector(`[data-inicio="${seleccionado}"]`);
    fila?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [seleccionado]);

  function moverMes(paso: number) {
    const siguiente = mes + paso;
    if (siguiente < 1) {
      setAnio(anio - 1);
      setMes(12);
    } else if (siguiente > 12) {
      setAnio(anio + 1);
      setMes(1);
    } else {
      setMes(siguiente);
    }
  }

  const esteMes = hoyReal.slice(0, 7) === `${anio}-${String(mes).padStart(2, "0")}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
      {/* ── Rejilla del mes ────────────────────────────────────────────── */}
      <section aria-label="Calendario del mes">
        <div className="flex flex-wrap items-center gap-2">
          {CAPAS.map((capa) => {
            const activa = capas.includes(capa.id);
            return (
              <button
                key={capa.id}
                type="button"
                onClick={() => alternarCapa(capa.id)}
                aria-pressed={activa}
                title={capa.descripcion}
                className={cn(
                  "flex min-h-9 items-center gap-2 rounded-full border px-3.5 text-sm transition-colors",
                  activa
                    ? "border-transparent bg-muted text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full transition-colors",
                    activa
                      ? capa.tipo === "festivo"
                        ? "bg-festivo"
                        : "bg-fiesta"
                      : "bg-muted-foreground/40"
                  )}
                />
                {capa.nombre}
              </button>
            );
          })}
          {capas.length > 0 && (
            <button
              type="button"
              onClick={() => setCapas([])}
              className="flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
              title="Apagar todas las capas y dejar el calendario plano"
            >
              <RotateCcw size={14} aria-hidden />
              Plano
            </button>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold capitalize tracking-tight">
            {nombreMes(dias[0]!)} <span className="font-mono text-muted-foreground">{anio}</span>
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => moverMes(-1)}
              aria-label="Mes anterior"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft size={18} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => moverMes(1)}
              aria-label="Mes siguiente"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronRight size={18} aria-hidden />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs uppercase tracking-wide text-muted-foreground">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: huecos }, (_, i) => (
            <div key={`hueco-${i}`} aria-hidden />
          ))}

          {dias.map((dia) => {
            const encima = porDia.get(dia) ?? [];
            const esFestivo = encima.some((e) => e.tipo === "festivo");
            const esHoy = dia === hoyReal;
            const activo = seleccionado === dia || encima.some((e) => e.inicio === seleccionado);

            return (
              <button
                key={dia}
                type="button"
                onClick={() => escoger(dia)}
                aria-pressed={activo}
                aria-label={`${formatoLargo(dia)}${encima.length ? `: ${encima.map((e) => e.nombre).join(", ")}` : ""}`}
                className={cn(
                  "relative flex aspect-square min-h-11 flex-col items-center justify-center rounded-md border text-sm transition-colors",
                  esFestivo
                    ? "border-festivo/40 bg-festivo-muted/40 font-semibold text-foreground"
                    : encima.length > 0
                      ? "border-fiesta/30 text-foreground"
                      : "border-transparent text-muted-foreground hover:bg-muted",
                  esHoy && "ring-2 ring-hoy ring-offset-2 ring-offset-background",
                  activo && "border-ring bg-muted"
                )}
              >
                <span className="font-mono">{Number(dia.slice(8))}</span>

                {encima.length > 0 && (
                  <span className="absolute bottom-1.5 flex gap-0.5">
                    {encima.slice(0, 3).map((e) => (
                      <span
                        key={e.slug}
                        className={cn("h-1 w-1 rounded-full", tokenDeCapa(e.tipo))}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {!esteMes && (
          <button
            type="button"
            onClick={() => {
              setAnio(anioActual());
              setMes(Number(hoyReal.slice(5, 7)));
              setSeleccionado(null);
            }}
            className="mt-4 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-festivo hover:underline"
          >
            Volver a hoy
          </button>
        )}
      </section>

      {/* ── Agenda ─────────────────────────────────────────────────────── */}
      <section
        aria-label={`Agenda de ${anio}`}
        className="flex max-h-[70vh] min-h-0 flex-col rounded-lg border border-border bg-card lg:sticky lg:top-6"
      >
        <div className="flex items-baseline justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Agenda {anio}</h2>
          <span className="font-mono text-xs text-muted-foreground">
            {entradas.length} {entradas.length === 1 ? "entrada" : "entradas"}
          </span>
        </div>

        {entradas.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Calendario plano. Enciende una capa para ver qué pasa este año.
          </p>
        ) : (
          <ul ref={listaRef} className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
            {entradas.map((entrada) => {
              const abierta = entrada.inicio === seleccionado;
              const pasada = entrada.fin < hoyReal;
              const rango = entrada.inicio !== entrada.fin;

              return (
                <li key={`${entrada.slug}-${entrada.inicio}`} data-inicio={entrada.inicio}>
                  <button
                    type="button"
                    onClick={() => setSeleccionado(abierta ? null : entrada.inicio)}
                    aria-expanded={abierta}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                      abierta && "bg-muted/60",
                      pasada && !abierta && "opacity-50"
                    )}
                  >
                    <span className="w-11 shrink-0 text-center">
                      <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {nombreMes(entrada.inicio).slice(0, 3)}
                      </span>
                      <span
                        className={cn(
                          "block font-mono text-lg font-semibold leading-tight",
                          entrada.tipo === "festivo" ? "text-festivo" : "text-fiesta"
                        )}
                      >
                        {Number(entrada.inicio.slice(8))}
                      </span>
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{entrada.nombre}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {rango
                          ? `hasta el ${Number(entrada.fin.slice(8))} de ${nombreMes(entrada.fin)}`
                          : formatoLargo(entrada.inicio).split(" ").slice(0, 1)}
                        {entrada.festivo?.trasladado && " · trasladado al lunes"}
                      </span>
                    </span>
                  </button>

                  {abierta && (
                    <div className="px-4 pb-4 pl-[4.25rem]">
                      {entrada.resumen && (
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {entrada.resumen}
                        </p>
                      )}

                      {entrada.festivo?.trasladado && (
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                          Se celebra el {formatoLargo(entrada.festivo.fechaOriginal!)}; la Ley
                          Emiliani corre el descanso al lunes siguiente.
                        </p>
                      )}

                      {entrada.fuente && (
                        <a
                          href={entrada.fuente.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-1.5 text-sm text-festivo underline-offset-4 hover:underline"
                        >
                          Ver más detalles
                          <ExternalLink size={13} aria-hidden />
                        </a>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

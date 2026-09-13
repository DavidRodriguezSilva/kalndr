import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { calendario } from "@/domain/calendario";
import { CAPAS, CAPAS_POR_DEFECTO } from "@/domain/capas";
import { anioActual } from "@/domain/festivos";
import { formatoLargo, nombreMes } from "@/domain/fechas";
import type { EntradaCalendario } from "@/domain/tipos";
import { cn } from "@/lib/cn";

/**
 * El calendario y su agenda.
 *
 * Dos vistas de lo mismo, al mismo ancho: la rejilla para ver la forma del
 * mes —donde caen los puentes, que semana esta cargada— y la agenda para leer
 * el detalle. Escoger un dia mueve la agenda hasta el y lo abre; el resto se
 * queda compacto.
 *
 * La agenda arranca centrada en hoy, con un separador rojo que marca el
 * limite entre lo que ya paso y lo que viene. Abrir un calendario y que lo
 * primero que se vea sea el 1 de enero, en septiembre, no le sirve a nadie.
 *
 * Todo se calcula en el navegador porque el dominio es TypeScript puro y
 * viaja en unos pocos kilobytes: cambiar de anio no recarga la pagina ni pide
 * nada a la red. El servidor pinta el mismo HTML para que el buscador —y
 * quien llegue sin JavaScript— vea el calendario completo.
 */
interface Props {
  /** Anio que se muestra al abrir. */
  anioInicial: number;
  /** Anios que ofrece el selector. */
  anios: readonly number[];
  /** Fecha de hoy en Bogota, `YYYY-MM-DD`, calculada en el build. */
  hoy: string;
}

type Vista = "mes" | "anio";

const DIAS_SEMANA = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
const LLAVE_CAPAS = "kalndr-capas";

/**
 * Un color por capa. Con cinco capas encendidas a la vez, el color es lo
 * unico que permite saber de un vistazo que es cada marca del calendario.
 *
 * Las clases van escritas enteras y no compuestas en tiempo de ejecucion,
 * porque Tailwind lee el codigo fuente para decidir que CSS generar: una
 * clase armada con plantillas no existiria en la hoja final.
 */
const COLOR = {
  festivo: {
    punto: "bg-festivo",
    texto: "text-festivo",
    celda: "border-festivo/40 bg-festivo-muted/40",
    solido: "bg-festivo text-festivo-foreground",
  },
  fiesta: {
    punto: "bg-fiesta",
    texto: "text-fiesta",
    celda: "border-fiesta/40 bg-fiesta-muted/30",
    solido: "bg-fiesta text-fiesta-foreground",
  },
  evento: {
    punto: "bg-evento",
    texto: "text-evento",
    celda: "border-evento/40 bg-evento-muted/30",
    solido: "bg-evento text-background",
  },
  carrera: {
    punto: "bg-carrera",
    texto: "text-carrera",
    celda: "border-carrera/40 bg-carrera-muted/30",
    solido: "bg-carrera text-background",
  },
  temporada: {
    punto: "bg-temporada",
    texto: "text-temporada",
    celda: "border-temporada/40 bg-temporada-muted/30",
    solido: "bg-temporada text-background",
  },
} as const;

type Token = keyof typeof COLOR;

const TOKEN_POR_CAPA = new Map<string, Token>(CAPAS.map((c) => [c.id, c.token]));

const colorDe = (capa: string) => COLOR[TOKEN_POR_CAPA.get(capa) ?? "fiesta"];

/** Dia de la semana con el lunes en la posicion 0, que es como se lee aqui. */
function columnaDe(fecha: string): number {
  return (new Date(`${fecha}T00:00:00Z`).getUTCDay() + 6) % 7;
}

function diasDelMes(anio: number, mes: number): string[] {
  const total = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const mm = String(mes).padStart(2, "0");
  return Array.from({ length: total }, (_, i) => `${anio}-${mm}-${String(i + 1).padStart(2, "0")}`);
}

export default function Calendario({ anioInicial, anios, hoy }: Props) {
  const [anio, setAnio] = useState(anioInicial);
  const [mes, setMes] = useState(() => Number(hoy.slice(5, 7)));
  const [vista, setVista] = useState<Vista>("mes");
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [capas, setCapas] = useState<readonly string[]>(CAPAS_POR_DEFECTO);
  const [hoyReal, setHoyReal] = useState(hoy);

  const listaRef = useRef<HTMLUListElement>(null);
  const hoyRef = useRef<HTMLLIElement>(null);
  const capasLeidas = useRef(false);
  const centrado = useRef(false);

  // El HTML llega con la fecha del build. Si el visitante abre la pagina otro
  // dia, se corrige despues de hidratar —nunca durante el primer render, que
  // rompe la coincidencia con lo que pinto el servidor.
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
    // Solo al montar: despues manda lo que el visitante navegue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Las capas encendidas se recuerdan entre paginas y entre visitas. Se leen
  // despues de hidratar por la misma razon que la fecha.
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(LLAVE_CAPAS);
      if (guardado) {
        const ids: unknown = JSON.parse(guardado);
        if (Array.isArray(ids)) {
          setCapas(ids.filter((id) => CAPAS.some((c) => c.id === id)));
        }
      }
    } catch {
      /* almacenamiento bloqueado: se usan las de por defecto */
    }
    capasLeidas.current = true;
  }, []);

  useEffect(() => {
    if (!capasLeidas.current) return;
    try {
      localStorage.setItem(LLAVE_CAPAS, JSON.stringify(capas));
    } catch {
      /* nada que hacer: la sesion sigue funcionando sin recordar */
    }
  }, [capas]);

  const entradas = useMemo(() => calendario(anio, capas), [anio, capas]);

  /** Las entradas que cubren cada dia del mes; una temporada cubre muchos. */
  const porDia = useMemo(() => {
    const mapa = new Map<string, EntradaCalendario[]>();
    for (const e of entradas) {
      for (const dia of diasDelMes(anio, mes)) {
        if (e.inicio <= dia && dia <= e.fin) mapa.set(dia, [...(mapa.get(dia) ?? []), e]);
      }
    }
    return mapa;
  }, [entradas, anio, mes]);

  /** Los dias marcados de todo el anio, para la vista de almanaque. */
  const marcadosDelAnio = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const e of entradas) {
      let dia = e.inicio;
      while (dia <= e.fin) {
        // El festivo manda sobre cualquier otra capa en el mismo dia: es el
        // dato por el que la gente abre esta pagina.
        if (e.tipo === "festivo" || !mapa.has(dia)) mapa.set(dia, e.capa);
        const siguiente = new Date(`${dia}T00:00:00Z`);
        siguiente.setUTCDate(siguiente.getUTCDate() + 1);
        dia = siguiente.toISOString().slice(0, 10);
      }
    }
    return mapa;
  }, [entradas]);

  const escoger = useCallback(
    (dia: string) => {
      const cubre = entradas.find((e) => e.inicio <= dia && dia <= e.fin);
      setSeleccionado(cubre ? cubre.inicio : dia);
      setMes(Number(dia.slice(5, 7)));
      setVista("mes");
    },
    [entradas]
  );

  // La tarjeta del proximo festivo vive en otra isla y no comparte estado con
  // esta: se avisan por un evento del documento.
  useEffect(() => {
    function alPedirFecha(evento: Event) {
      const fecha = (evento as CustomEvent<{ fecha: string }>).detail?.fecha;
      if (!fecha) return;
      setAnio(Number(fecha.slice(0, 4)));
      escoger(fecha);
      listaRef.current?.closest("section")?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    document.addEventListener("kalndr:ir-a-fecha", alPedirFecha);
    return () => document.removeEventListener("kalndr:ir-a-fecha", alPedirFecha);
  }, [escoger]);

  /** Al escoger un dia, la agenda se mueve hasta el y lo abre. */
  useEffect(() => {
    if (!seleccionado || !listaRef.current) return;
    const fila = listaRef.current.querySelector(`[data-inicio="${seleccionado}"]`);
    fila?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [seleccionado]);

  /** Al abrir, la agenda se centra en hoy en vez de empezar en enero. */
  useEffect(() => {
    if (centrado.current || !hoyRef.current) return;
    hoyRef.current.scrollIntoView({ block: "center" });
    centrado.current = true;
  }, [entradas]);

  const alternarCapa = (id: string) =>
    setCapas((activas) =>
      activas.includes(id) ? activas.filter((x) => x !== id) : [...activas, id]
    );

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

  const dias = diasDelMes(anio, mes);
  const esteMes = hoyReal.slice(0, 7) === `${anio}-${String(mes).padStart(2, "0")}`;
  const hoyEsteAnio = hoyReal.slice(0, 4) === String(anio);

  /** Donde va el separador de hoy: antes de la primera entrada que no ha pasado. */
  const indiceHoy = hoyEsteAnio ? entradas.findIndex((e) => e.fin >= hoyReal) : -1;
  const hoyAlFinal = hoyEsteAnio && indiceHoy === -1;

  return (
    <div>
      {/* ── Capas ──────────────────────────────────────────────────────── */}
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
                  activa ? COLOR[capa.token].punto : "bg-muted-foreground/40"
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

      <p className="mt-2.5 text-sm text-muted-foreground">
        Enciende una capa para sumar sus fechas al calendario y a la agenda. Apágalas todas y queda
        el almanaque limpio.
      </p>

      {/* ── Año ────────────────────────────────────────────────────────── */}
      <div className="mt-5 flex flex-wrap gap-1.5">
        {anios.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => {
              setAnio(a);
              setSeleccionado(null);
              centrado.current = false;
            }}
            aria-pressed={a === anio}
            className={cn(
              "rounded-md border px-3 py-1.5 font-mono text-sm transition-colors",
              a === anio
                ? "border-festivo bg-festivo-muted/30 text-festivo"
                : "border-border text-muted-foreground hover:border-ring hover:text-foreground"
            )}
          >
            {a}
          </button>
        ))}
      </div>

      {/* ── Calendario y agenda, al mismo ancho ────────────────────────── */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section aria-label="Calendario">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold capitalize tracking-tight">
              {vista === "mes" ? (
                <>
                  {nombreMes(dias[0]!)}{" "}
                  <span className="font-mono text-muted-foreground">{anio}</span>
                </>
              ) : (
                <span className="font-mono">{anio}</span>
              )}
            </h2>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setVista(vista === "mes" ? "anio" : "mes")}
                aria-pressed={vista === "anio"}
                title={vista === "mes" ? "Ver los doce meses" : "Volver a un mes"}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {vista === "mes" ? (
                  <CalendarRange size={18} aria-hidden />
                ) : (
                  <CalendarDays size={18} aria-hidden />
                )}
              </button>

              {vista === "mes" && (
                <>
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
                </>
              )}
            </div>
          </div>

          {vista === "mes" ? (
            <>
              <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs uppercase tracking-wide text-muted-foreground">
                {DIAS_SEMANA.map((d) => (
                  <div key={d} className="py-2">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: columnaDe(dias[0]!) }, (_, i) => (
                  <div key={`hueco-${i}`} aria-hidden />
                ))}

                {dias.map((dia) => {
                  const encima = porDia.get(dia) ?? [];
                  const principal = encima.find((e) => e.tipo === "festivo") ?? encima[0];
                  const esHoy = dia === hoyReal;
                  const activo =
                    seleccionado === dia || encima.some((e) => e.inicio === seleccionado);

                  return (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => escoger(dia)}
                      aria-pressed={activo}
                      aria-label={`${formatoLargo(dia)}${encima.length ? `: ${encima.map((e) => e.nombre).join(", ")}` : ""}`}
                      className={cn(
                        "relative flex aspect-square min-h-11 flex-col items-center justify-center rounded-md border text-sm transition-colors",
                        principal
                          ? cn(colorDe(principal.capa).celda, "font-semibold text-foreground")
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
                              className={cn("h-1 w-1 rounded-full", colorDe(e.capa).punto)}
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
            </>
          ) : (
            /* ── Almanaque: los doce meses de un vistazo ─────────────── */
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const diasMes = diasDelMes(anio, m);
                return (
                  <div key={m}>
                    <button
                      type="button"
                      onClick={() => {
                        setMes(m);
                        setVista("mes");
                      }}
                      className="mb-1.5 text-sm font-semibold capitalize transition-colors hover:text-festivo"
                    >
                      {nombreMes(diasMes[0]!)}
                    </button>
                    <div className="grid grid-cols-7 gap-px">
                      {Array.from({ length: columnaDe(diasMes[0]!) }, (_, i) => (
                        <div key={`h-${m}-${i}`} aria-hidden />
                      ))}
                      {diasMes.map((dia) => {
                        const marca = marcadosDelAnio.get(dia);
                        const esHoy = dia === hoyReal;
                        return (
                          <button
                            key={dia}
                            type="button"
                            onClick={() => escoger(dia)}
                            title={formatoLargo(dia)}
                            className={cn(
                              "flex aspect-square items-center justify-center rounded-[3px] font-mono text-[10px] transition-colors",
                              marca
                                ? colorDe(marca).solido
                                : "text-muted-foreground hover:bg-muted",
                              esHoy && "ring-1 ring-hoy"
                            )}
                          >
                            {Number(dia.slice(8))}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Agenda ───────────────────────────────────────────────────── */}
        <section
          aria-label={`Agenda de ${anio}`}
          className="flex max-h-[70vh] min-h-0 flex-col rounded-lg border border-border bg-card"
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
              {entradas.map((entrada, i) => {
                const abierta = entrada.inicio === seleccionado;
                const pasada = entrada.fin < hoyReal;
                const rango = entrada.inicio !== entrada.fin;

                return (
                  <li key={`${entrada.slug}-${entrada.inicio}`} data-inicio={entrada.inicio}>
                    {i === indiceHoy && <SeparadorHoy hoy={hoyReal} ref={hoyRef} />}

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
                            colorDe(entrada.capa).texto
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
                            : formatoLargo(entrada.inicio).split(" ")[0]}
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

              {hoyAlFinal && (
                <li>
                  <SeparadorHoy hoy={hoyReal} ref={hoyRef} />
                </li>
              )}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/**
 * La linea de hoy.
 *
 * Marca donde termina lo que ya paso y empieza lo que viene, y es el punto en
 * el que la agenda se centra al abrir. Sin ella, una lista de diecinueve
 * fechas no dice en que parte del anio esta uno.
 */
function SeparadorHoy({ hoy, ref }: { hoy: string; ref?: React.Ref<HTMLLIElement> }) {
  return (
    <div ref={ref as React.Ref<HTMLDivElement>} className="flex items-center gap-2 px-4 py-2">
      <span className="h-2 w-2 shrink-0 rounded-full bg-hoy" />
      <span className="text-xs font-medium text-hoy">hoy · {formatoLargo(hoy)}</span>
      <span className="h-px flex-1 bg-hoy/40" />
    </div>
  );
}

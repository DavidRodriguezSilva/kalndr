import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Briefcase, ExternalLink, RotateCcw, Search } from "lucide-react";
import { calendario } from "@/domain/calendario";
import { CAPAS, CAPAS_POR_DEFECTO } from "@/domain/capas";
import { anioActual } from "@/domain/festivos";
import { esDiaHabil } from "@/domain/habiles";
import { formatoLargo, nombreMes } from "@/domain/fechas";
import type { EntradaCalendario } from "@/domain/tipos";
import { cn } from "@/lib/cn";

/**
 * El almanaque del anio y su agenda.
 *
 * Los doce meses a la izquierda, como un calendario de pared, y la agenda a
 * la derecha. La vista de un solo mes se descarto: obligaba a navegar para
 * ver algo que cabe entero en pantalla, y lo que la gente quiere saber —donde
 * caen los puentes este anio— se lee de un vistazo o no se lee.
 *
 * Escoger un dia lleva la agenda hasta el y lo abre. La agenda arranca
 * centrada en hoy, con un separador que marca donde termina lo que ya paso.
 *
 * Todo se calcula en el navegador porque el dominio es TypeScript puro y
 * viaja en unos pocos kilobytes: cambiar de anio no recarga la pagina ni pide
 * nada a la red. El servidor pinta el mismo HTML para que el buscador —y
 * quien llegue sin JavaScript— vea el calendario completo.
 */
interface Props {
  /** Anio que se muestra al abrir. */
  anioInicial: number;
  /** Extremos del selector de anios. */
  anioMinimo: number;
  anioMaximo: number;
  /** Fecha de hoy en Bogota, `YYYY-MM-DD`, calculada en el build. */
  hoy: string;
}

const DIAS_SEMANA = ["l", "m", "m", "j", "v", "s", "d"];
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
    solido: "bg-festivo text-festivo-foreground",
  },
  fiesta: { punto: "bg-fiesta", texto: "text-fiesta", solido: "bg-fiesta text-fiesta-foreground" },
  evento: { punto: "bg-evento", texto: "text-evento", solido: "bg-evento text-background" },
  carrera: { punto: "bg-carrera", texto: "text-carrera", solido: "bg-carrera text-background" },
  temporada: {
    punto: "bg-temporada",
    texto: "text-temporada",
    solido: "bg-temporada text-background",
  },
} as const;

const TOKEN_POR_CAPA = new Map(CAPAS.map((c) => [c.id, c.token]));
const colorDe = (capa: string) => COLOR[TOKEN_POR_CAPA.get(capa) ?? "fiesta"];

/** Sin tildes y en minusculas, para que "san jose" encuentre "San José". */
const plano = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/** Dia de la semana con el lunes en la posicion 0, que es como se lee aqui. */
const columna = (fecha: string) => (new Date(`${fecha}T00:00:00Z`).getUTCDay() + 6) % 7;

function diasDelMes(anio: number, mes: number): string[] {
  const total = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const mm = String(mes).padStart(2, "0");
  return Array.from({ length: total }, (_, i) => `${anio}-${mm}-${String(i + 1).padStart(2, "0")}`);
}

export default function Calendario({ anioInicial, anioMinimo, anioMaximo, hoy }: Props) {
  const [anio, setAnio] = useState(anioInicial);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [capas, setCapas] = useState<readonly string[]>(CAPAS_POR_DEFECTO);
  const [hoyReal, setHoyReal] = useState(hoy);
  const [busqueda, setBusqueda] = useState("");
  const [soloHabiles, setSoloHabiles] = useState(false);

  const listaRef = useRef<HTMLUListElement>(null);
  const hoyRef = useRef<HTMLDivElement>(null);
  const anioActivoRef = useRef<HTMLButtonElement>(null);
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
    if (real !== hoy) setHoyReal(real);
  }, [hoy]);

  // Las capas encendidas se recuerdan entre paginas y entre visitas.
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(LLAVE_CAPAS);
      if (guardado) {
        const ids: unknown = JSON.parse(guardado);
        if (Array.isArray(ids)) setCapas(ids.filter((id) => CAPAS.some((c) => c.id === id)));
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

  /** La agenda se filtra; el almanaque sigue mostrando el anio completo. */
  const visibles = useMemo(() => {
    const aguja = plano(busqueda.trim());
    if (!aguja) return entradas;
    return entradas.filter(
      (e) => plano(e.nombre).includes(aguja) || plano(e.resumen ?? "").includes(aguja)
    );
  }, [entradas, busqueda]);

  /** Dias habiles por mes, para cuando se mira el calendario como laboral. */
  const habilesPorMes = useMemo(() => {
    if (!soloHabiles) return null;
    return Array.from(
      { length: 12 },
      (_, i) => diasDelMes(anio, i + 1).filter((d) => esDiaHabil(d)).length
    );
  }, [anio, soloHabiles]);

  /** La capa que pinta cada dia del anio. El festivo manda sobre las demas. */
  const marcados = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const e of entradas) {
      let dia = e.inicio;
      while (dia <= e.fin) {
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
      if (!cubre) {
        // Sin entrada ese dia, la agenda al menos se para en lo mas cercano.
        const siguiente = entradas.find((e) => e.inicio >= dia);
        listaRef.current
          ?.querySelector(`[data-inicio="${siguiente?.inicio}"]`)
          ?.scrollIntoView({ block: "center", behavior: "smooth" });
      }
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
    listaRef.current
      .querySelector(`[data-inicio="${seleccionado}"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [seleccionado]);

  /** Al abrir, la agenda se centra en hoy en vez de empezar en enero. */
  useEffect(() => {
    if (centrado.current || !hoyRef.current) return;
    hoyRef.current.scrollIntoView({ block: "center" });
    centrado.current = true;
  }, [entradas]);

  /** Y la tira de anios se centra en el anio que se esta viendo. */
  useEffect(() => {
    anioActivoRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [anio]);

  const alternarCapa = (id: string) =>
    setCapas((activas) =>
      activas.includes(id) ? activas.filter((x) => x !== id) : [...activas, id]
    );

  const hoyEsteAnio = hoyReal.slice(0, 4) === String(anio);
  const indiceHoy = hoyEsteAnio ? visibles.findIndex((e) => e.fin >= hoyReal) : -1;
  const hoyAlFinal = hoyEsteAnio && indiceHoy === -1;
  const anios = Array.from({ length: anioMaximo - anioMinimo + 1 }, (_, i) => anioMinimo + i);

  return (
    <div>
      {/* ── Capas ──────────────────────────────────────────────────────── */}
      <p className="text-sm text-muted-foreground">
        Enciende una capa para sumar sus fechas al calendario y a la agenda. Apágalas todas y queda
        el almanaque limpio.
      </p>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
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

        {/* No es una capa sino una lente: no anade fechas, cambia como se
            leen las que ya hay. Por eso va separado de las pastillas. */}
        <button
          type="button"
          onClick={() => setSoloHabiles((v) => !v)}
          aria-pressed={soloHabiles}
          title="Apagar fines de semana y festivos para ver el calendario laboral"
          className={cn(
            "ml-auto flex min-h-9 items-center gap-2 rounded-full border px-3.5 text-sm transition-colors",
            soloHabiles
              ? "border-transparent bg-muted text-foreground"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <Briefcase size={14} aria-hidden />
          Días hábiles
        </button>
      </div>

      {/* ── Años ───────────────────────────────────────────────────────── */}
      <div
        className="mt-5 flex gap-1.5 overflow-x-auto pb-2"
        role="group"
        aria-label="Año del calendario"
      >
        {anios.map((a) => (
          <button
            key={a}
            ref={a === anio ? anioActivoRef : undefined}
            type="button"
            onClick={() => {
              setAnio(a);
              setSeleccionado(null);
              centrado.current = false;
            }}
            aria-pressed={a === anio}
            className={cn(
              "shrink-0 rounded-md border px-3 py-1.5 font-mono text-sm transition-colors",
              a === anio
                ? "border-primary bg-primary/15 text-primary"
                : a === anioActual()
                  ? "border-border text-foreground hover:border-ring"
                  : "border-border text-muted-foreground hover:border-ring hover:text-foreground"
            )}
          >
            {a}
          </button>
        ))}
      </div>

      {/* ── Almanaque y agenda, al mismo ancho ─────────────────────────── */}
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <section aria-label={`Almanaque de ${anio}`}>
          <div className="grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-3">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
              const dias = diasDelMes(anio, m);
              return (
                <div key={m}>
                  <p className="mb-1.5 flex items-baseline justify-between gap-1 text-sm font-semibold capitalize">
                    {nombreMes(dias[0]!)}
                    {habilesPorMes && (
                      <span className="font-mono text-[11px] font-normal text-muted-foreground">
                        {habilesPorMes[m - 1]} hábiles
                      </span>
                    )}
                  </p>

                  <div
                    className="grid grid-cols-7 gap-px text-center text-[9px] uppercase text-muted-foreground/70"
                    aria-hidden
                  >
                    {DIAS_SEMANA.map((d, i) => (
                      <span key={`${m}-${d}-${i}`}>{d}</span>
                    ))}
                  </div>

                  <div className="mt-0.5 grid grid-cols-7 gap-px">
                    {Array.from({ length: columna(dias[0]!) }, (_, i) => (
                      <span key={`h-${m}-${i}`} aria-hidden />
                    ))}
                    {dias.map((dia) => {
                      const marca = marcados.get(dia);
                      const esHoy = dia === hoyReal;
                      const activo =
                        seleccionado !== null &&
                        entradas.some(
                          (e) => e.inicio === seleccionado && e.inicio <= dia && dia <= e.fin
                        );
                      return (
                        <button
                          key={dia}
                          type="button"
                          onClick={() => escoger(dia)}
                          title={formatoLargo(dia)}
                          aria-pressed={activo}
                          className={cn(
                            "flex aspect-square items-center justify-center rounded-[3px] font-mono text-[11px] transition-colors",
                            marca ? colorDe(marca).solido : "text-muted-foreground hover:bg-muted",
                            soloHabiles && !esDiaHabil(dia) && "opacity-30",
                            esHoy && "ring-2 ring-hoy",
                            activo && "ring-2 ring-ring"
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

          {!hoyEsteAnio && (
            <button
              type="button"
              onClick={() => {
                setAnio(anioActual());
                setSeleccionado(null);
                centrado.current = false;
              }}
              className="mt-5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
            >
              Volver a {anioActual()}
            </button>
          )}
        </section>

        {/* ── Agenda ───────────────────────────────────────────────────── */}
        <section
          aria-label={`Agenda de ${anio}`}
          className="flex max-h-[36rem] min-h-0 flex-col rounded-lg border border-border bg-card"
        >
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">Agenda {anio}</h2>
              <span className="font-mono text-xs text-muted-foreground">
                {busqueda.trim() ? `${visibles.length} de ${entradas.length}` : entradas.length}{" "}
                {entradas.length === 1 ? "entrada" : "entradas"}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-2 border-b border-transparent pb-0.5 focus-within:border-ring">
              <Search size={14} aria-hidden className="shrink-0 text-muted-foreground" />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar en la agenda"
                aria-label={`Buscar en la agenda de ${anio}`}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {visibles.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              {busqueda.trim()
                ? `Nada en ${anio} que coincida con «${busqueda.trim()}».`
                : "Calendario plano. Enciende una capa para ver qué pasa este año."}
            </p>
          ) : (
            <ul ref={listaRef} className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
              {visibles.map((entrada, i) => {
                const abierta = entrada.inicio === seleccionado;
                const pasada = entrada.fin < hoyReal;
                const rango = entrada.inicio !== entrada.fin;

                return (
                  <li key={`${entrada.slug}-${entrada.inicio}`} data-inicio={entrada.inicio}>
                    {i === indiceHoy && <SeparadorHoy hoy={hoyReal} marcaRef={hoyRef} />}

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
                            className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
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
                  <SeparadorHoy hoy={hoyReal} marcaRef={hoyRef} />
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
 * el que la agenda se centra al abrir. Sin ella, una lista de veinte fechas
 * no dice en que parte del anio esta uno.
 */
function SeparadorHoy({ hoy, marcaRef }: { hoy: string; marcaRef: React.Ref<HTMLDivElement> }) {
  return (
    <div ref={marcaRef} className="flex items-center gap-2 px-4 py-2">
      <span className="h-2 w-2 shrink-0 rounded-full bg-hoy" />
      <span className="text-xs font-medium text-hoy">hoy · {formatoLargo(hoy)}</span>
      <span className="h-px flex-1 bg-hoy/40" />
    </div>
  );
}

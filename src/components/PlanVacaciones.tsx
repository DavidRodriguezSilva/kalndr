import { useMemo, useState } from "react";
import { CalendarCheck, Minus, Plus, Sparkles } from "lucide-react";
import { oportunidades, repartir, type Oportunidad } from "@/domain/vacaciones";
import { nombreDia, nombreMes } from "@/domain/fechas";
import { cn } from "@/lib/cn";

/**
 * Buscador de oportunidades de vacaciones.
 *
 * La pregunta que nadie responde bien: "tengo cinco dias, cuando los pido
 * para descansar mas". El calculo entero corre en el navegador, asi que mover
 * el numero de dias recalcula el anio completo sin pedir nada a la red.
 *
 * Se muestran dos cosas distintas a proposito. El plan reparte el
 * presupuesto en varios tramos del anio, que es lo que de verdad hace alguien
 * con quince dias. Las ventanas sueltas ordenan por descanso, que es lo que
 * sirve cuando solo se quiere pedir una vez.
 */
interface Props {
  anioInicial: number;
  /** Anios que ofrece el selector. */
  anios: readonly number[];
}

const MINIMO = 1;
const MAXIMO = 20;

/** `sáb 6 – lun 15 de junio` o `sáb 28 mar – dom 5 abr`. */
function rango(inicio: string, fin: string): string {
  const dia = (f: string) => Number(f.slice(8));
  const abrev = (f: string) => nombreDia(f).slice(0, 3);
  if (inicio.slice(0, 7) === fin.slice(0, 7)) {
    return `${abrev(inicio)} ${dia(inicio)} – ${abrev(fin)} ${dia(fin)} de ${nombreMes(inicio)}`;
  }
  return `${abrev(inicio)} ${dia(inicio)} ${nombreMes(inicio).slice(0, 3)} – ${abrev(fin)} ${dia(fin)} ${nombreMes(fin).slice(0, 3)}`;
}

function Tarjeta({ o, destacada = false }: { o: Oportunidad; destacada?: boolean }) {
  return (
    <article
      className={cn(
        "rounded-lg border p-5",
        destacada ? "border-primary/40 bg-primary/5" : "border-border"
      )}
    >
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-3xl font-bold tracking-tight text-primary">
          {o.diasLibres}
        </span>
        <span className="text-sm text-muted-foreground">días libres pidiendo {o.diasPedidos}</span>
      </div>

      <p className="mt-2 text-sm font-medium capitalize">{rango(o.inicio, o.fin)}</p>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">Pide:</span>{" "}
        {o.pedir.map((d) => `${nombreDia(d).slice(0, 3)} ${Number(d.slice(8))}`).join(", ")}
      </p>

      {o.festivos.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {o.festivos.map((f) => (
            <li
              key={f.fecha}
              className="rounded-full bg-festivo-muted/40 px-2.5 py-1 text-xs text-foreground"
            >
              {f.nombre}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default function PlanVacaciones({ anioInicial, anios }: Props) {
  const [dias, setDias] = useState(5);
  const [anio, setAnio] = useState(anioInicial);

  const plan = useMemo(() => repartir(anio, dias), [anio, dias]);
  const mejores = useMemo(() => oportunidades(anio, dias, 6), [anio, dias]);

  const libresDelPlan = plan.reduce((s, o) => s + o.diasLibres, 0);
  const gastadosDelPlan = plan.reduce((s, o) => s + o.diasPedidos, 0);

  return (
    <div>
      {/* ── Controles ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <label htmlFor="dias" className="block text-sm font-medium">
            Días de vacaciones que tienes
          </label>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDias((d) => Math.max(MINIMO, d - 1))}
              disabled={dias <= MINIMO}
              aria-label="Un día menos"
              className="flex h-12 w-12 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
            >
              <Minus size={18} aria-hidden />
            </button>
            <input
              id="dias"
              type="number"
              min={MINIMO}
              max={MAXIMO}
              value={dias}
              onChange={(e) =>
                setDias(Math.min(MAXIMO, Math.max(MINIMO, Number(e.target.value) || MINIMO)))
              }
              className="h-12 w-20 rounded-md border border-border bg-card text-center font-mono text-xl tabular-nums"
            />
            <button
              type="button"
              onClick={() => setDias((d) => Math.min(MAXIMO, d + 1))}
              disabled={dias >= MAXIMO}
              aria-label="Un día más"
              className="flex h-12 w-12 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
            >
              <Plus size={18} aria-hidden />
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="anio" className="block text-sm font-medium">
            Año
          </label>
          <select
            id="anio"
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            className="mt-2 h-12 rounded-md border border-border bg-card px-3 font-mono text-base"
          >
            {anios.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── El plan del año ────────────────────────────────────────────── */}
      <section className="mt-12" aria-labelledby="plan">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="plan" className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Sparkles size={20} aria-hidden className="text-primary" />
            Cómo repartirlos
          </h2>
          {plan.length > 0 && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{libresDelPlan} días libres</span>{" "}
              gastando {gastadosDelPlan} de tus {dias}
            </p>
          )}
        </div>

        {plan.length === 0 ? (
          <p className="mt-4 text-muted-foreground">
            Con {dias} {dias === 1 ? "día" : "días"} no hay ningún puente que rinda en {anio}.
            Prueba con uno más.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plan.map((o) => (
              <Tarjeta key={o.inicio} o={o} destacada />
            ))}
          </div>
        )}
      </section>

      {/* ── Las mejores ventanas ───────────────────────────────────────── */}
      <section className="mt-14" aria-labelledby="ventanas">
        <h2 id="ventanas" className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <CalendarCheck size={20} aria-hidden className="text-muted-foreground" />
          Si solo vas a pedir una vez
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Los tramos más largos que puedes armar con {dias} {dias === 1 ? "día" : "días"} o menos,
          de mayor a menor descanso.
        </p>

        {mejores.length === 0 ? (
          <p className="mt-4 text-muted-foreground">Nada que proponer con ese presupuesto.</p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mejores.map((o) => (
              <Tarjeta key={`${o.inicio}-${o.diasPedidos}`} o={o} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

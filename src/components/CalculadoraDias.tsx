import { useMemo, useState } from "react";
import { AlertCircle, ArrowRight } from "lucide-react";
import { contar, revisar } from "@/domain/conteo";
import { ANIO_MAXIMO_CALCULABLE, ANIO_MINIMO_CALCULABLE } from "@/domain/festivos";
import { SelectorFecha } from "@/ui/primitives/selector-fecha";
import { formatoLargo, sumarDias } from "@/domain/fechas";
import { cn } from "@/lib/cn";

/**
 * Calculadora de dias entre dos fechas.
 *
 * Dos campos y un resultado. No hay boton de calcular: en cuanto las dos
 * fechas son validas aparece la respuesta, y si alguna no lo es aparece una
 * linea debajo diciendo que corregir. Un boton solo anadiria un clic entre la
 * pregunta y la respuesta.
 *
 * La base la elige el usuario porque en Colombia se cuenta de dos maneras:
 * 365, los dias que de verdad pasaron, y 360, donde todo mes vale 30 —que es
 * como los bancos calculan intereses y plazos.
 *
 * Lo que de verdad distingue este calculo del de cualquier otra pagina es que
 * los dias habiles descuentan los festivos nacionales de verdad, con la Ley
 * Emiliani aplicada, y que ademas se dice cuales fueron.
 */
interface Props {
  /** Fecha de hoy en Bogota, para los valores iniciales. */
  hoy: string;
}

type Base = "365" | "360";

function Dato({
  valor,
  etiqueta,
  nota,
  destacado = false,
}: {
  valor: string | number;
  etiqueta: string;
  nota?: string;
  destacado?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        destacado ? "border-festivo/40 bg-festivo-muted/20" : "border-border"
      )}
    >
      <p
        className={cn(
          "font-mono font-bold tracking-tight",
          destacado ? "text-4xl text-festivo" : "text-2xl"
        )}
      >
        {valor}
      </p>
      <p className="mt-1 text-sm font-medium">{etiqueta}</p>
      {nota && <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{nota}</p>}
    </div>
  );
}

export default function CalculadoraDias({ hoy }: Props) {
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(() => sumarDias(hoy, 30));
  const [base, setBase] = useState<Base>("365");

  const problema = useMemo(() => revisar(desde, hasta), [desde, hasta]);
  const conteo = useMemo(() => (problema ? null : contar(desde, hasta)), [problema, desde, hasta]);

  const campoMalo = (campo: "desde" | "hasta") => problema?.campo === campo;

  return (
    <div>
      {/* ── Entradas ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <SelectorFecha
            id="desde"
            etiqueta="Fecha inicial"
            valor={desde}
            onCambio={setDesde}
            invalido={campoMalo("desde")}
            anioMinimo={ANIO_MINIMO_CALCULABLE}
            anioMaximo={ANIO_MAXIMO_CALCULABLE}
          />
        </div>

        <ArrowRight
          size={20}
          aria-hidden
          className="hidden shrink-0 self-end pb-3.5 text-muted-foreground sm:block"
        />

        <div className="flex-1">
          <SelectorFecha
            id="hasta"
            etiqueta="Fecha final"
            valor={hasta}
            onCambio={setHasta}
            invalido={campoMalo("hasta")}
            anioMinimo={ANIO_MINIMO_CALCULABLE}
            anioMaximo={ANIO_MAXIMO_CALCULABLE}
          />
        </div>

        <fieldset className="shrink-0">
          <legend className="mb-2 text-sm font-medium">Base</legend>
          <div className="flex h-12 overflow-hidden rounded-md border border-border">
            {(["365", "360"] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBase(b)}
                aria-pressed={base === b}
                className={cn(
                  "px-5 font-mono text-sm transition-colors",
                  base === b
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {b}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {/* ── La alerta chiquita ─────────────────────────────────────────── */}
      <p
        role="status"
        aria-live="polite"
        className={cn(
          "mt-3 flex items-center gap-2 text-sm",
          problema ? "text-destructive" : "sr-only"
        )}
      >
        {problema && (
          <>
            <AlertCircle size={15} aria-hidden className="shrink-0" />
            {problema.mensaje}
          </>
        )}
      </p>

      {/* ── Resultado ──────────────────────────────────────────────────── */}
      {conteo && (
        <div className="mt-8">
          <p className="text-sm text-muted-foreground">
            De {formatoLargo(conteo.desde)} a {formatoLargo(conteo.hasta)}
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Dato
              destacado
              valor={base === "365" ? conteo.diferencia : conteo.dias360}
              etiqueta={base === "365" ? "días" : "días base 360"}
              nota={
                base === "365"
                  ? `${conteo.inclusivos} contando los dos extremos`
                  : "todo mes vale 30, todo año 360"
              }
            />
            <Dato
              valor={conteo.habiles}
              etiqueta="días hábiles"
              nota="sin fines de semana ni festivos"
            />
            <Dato
              valor={conteo.finesDeSemana}
              etiqueta="días de fin de semana"
              nota={`${conteo.semanas} semanas y ${conteo.diasSueltos} días`}
            />
            <Dato
              valor={conteo.festivos.length}
              etiqueta={conteo.festivos.length === 1 ? "festivo" : "festivos"}
              nota="festivos nacionales en el rango"
            />
          </div>

          {conteo.festivos.length > 0 && (
            <details className="mt-6 rounded-lg border border-border">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
                Qué festivos cayeron en el rango
              </summary>
              <ul className="divide-y divide-border border-t border-border">
                {conteo.festivos.map((f) => (
                  <li
                    key={`${f.slug}-${f.fecha}`}
                    className="flex items-baseline gap-3 px-4 py-2.5 text-sm"
                  >
                    <span className="w-24 shrink-0 font-mono text-xs text-festivo">{f.fecha}</span>
                    <span className="flex-1">{f.nombre}</span>
                    {f.trasladado && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        trasladado al lunes
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

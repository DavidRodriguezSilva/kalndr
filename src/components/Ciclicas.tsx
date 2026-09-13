import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { diasEntre, formatoLargo } from "@/domain/fechas";
import ciclicas from "@/data/ciclicas.json";

/**
 * Cuenta regresiva a las fechas que vuelven cada cuatro anios.
 *
 * No son festivos ni le dan a nadie el dia libre, pero son las fechas que la
 * gente lleva en la cabeza —el Mundial, los Olimpicos, los Nacionales— y un
 * calendario que sabe contar dias deberia poder decir cuantos faltan.
 *
 * La cuenta se corrige con el reloj del visitante despues de hidratar, por la
 * misma razon que el resto del sitio: el HTML se genero el dia del despliegue.
 */
interface Cita {
  readonly id: string;
  readonly titulo: string;
  readonly edicion: string;
  readonly sede: string;
  readonly inicio: string;
  readonly fin: string;
  readonly precision: string;
  readonly wikipedia: string;
}

interface Props {
  /** Fecha de hoy en Bogota, del build. */
  hoy: string;
  /** Cuantas mostrar. */
  cuantas?: number;
}

const CITAS = ciclicas as readonly Cita[];

export default function Ciclicas({ hoy, cuantas = 4 }: Props) {
  const [hoyReal, setHoyReal] = useState(hoy);

  useEffect(() => {
    const real = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    if (real !== hoy) setHoyReal(real);
  }, [hoy]);

  const proximas = CITAS.filter((c) => c.fin >= hoyReal)
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
    .slice(0, cuantas);

  if (proximas.length === 0) return null;

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {proximas.map((cita) => {
        const faltan = diasEntre(hoyReal, cita.inicio);
        const enCurso = faltan <= 0;
        return (
          <li key={cita.id} className="rounded-lg border border-border p-4">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
              <Timer size={13} aria-hidden />
              {cita.edicion}
            </p>

            <p className="mt-2 text-sm font-semibold">{cita.titulo}</p>

            <p className="mt-1.5 font-mono text-2xl font-bold text-primary">
              {enCurso ? "en curso" : faltan.toLocaleString("es-CO")}
              {!enCurso && (
                <span className="ml-1.5 font-sans text-xs font-normal text-muted-foreground">
                  días
                </span>
              )}
            </p>

            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {cita.sede}
              <br />
              <span className="capitalize">{formatoLargo(cita.inicio)}</span>
              {cita.precision === "estimada" && " (fecha estimada)"}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

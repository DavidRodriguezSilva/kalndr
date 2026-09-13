import { useEffect, useState } from "react";
import { CalendarClock, PartyPopper } from "lucide-react";
import { calcularFestivos } from "@/domain/festivos";
import { diasEntre, formatoLargo, nombreDia } from "@/domain/fechas";
import type { Festivo } from "@/domain/tipos";
import { cn } from "@/lib/cn";

/**
 * Cuenta regresiva al proximo festivo.
 *
 * El sitio es estatico: el HTML se genera el dia del despliegue, y una cuenta
 * regresiva escrita en ese HTML envejece mal —al mes siguiente estaria
 * mintiendo—. Como el algoritmo es TypeScript puro y sin dependencias, viaja
 * al navegador y se recalcula con el reloj del visitante.
 *
 * El servidor pinta la respuesta del dia del build para que el buscador y
 * quien llegue sin JavaScript vean algo cierto; esta isla la corrige en la
 * primera pintura si el dia ya cambio. Es la mejor version de ambos mundos:
 * indexable como HTML, exacta como aplicacion.
 */
interface Props {
  /** Fecha del build, en `YYYY-MM-DD`, para que el servidor pinte lo mismo. */
  fechaBuild: string;
}

function hoyEnBogota(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function proximoDesde(hoy: string): Festivo {
  const anio = Number(hoy.slice(0, 4));
  return [...calcularFestivos(anio), ...calcularFestivos(anio + 1)].find((f) => f.fecha >= hoy)!;
}

function comoSeDice(dias: number): string {
  if (dias === 0) return "Es hoy";
  if (dias === 1) return "Es mañana";
  return `Faltan ${dias} días`;
}

export default function ProximoFestivo({ fechaBuild }: Props) {
  const [hoy, setHoy] = useState(fechaBuild);

  // Se corrige despues de hidratar, no durante: cambiar el estado en el primer
  // render rompe la coincidencia con el HTML del servidor.
  useEffect(() => {
    const real = hoyEnBogota();
    if (real !== hoy) setHoy(real);
  }, [hoy]);

  const festivo = proximoDesde(hoy);
  const dias = diasEntre(hoy, festivo.fecha);
  const esHoy = dias === 0;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-6 sm:p-8",
        esHoy && "border-festivo/50 bg-festivo-muted/20"
      )}
    >
      <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {esHoy ? <PartyPopper size={16} aria-hidden /> : <CalendarClock size={16} aria-hidden />}
        Próximo festivo
      </p>

      <p className="mt-3 text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
        {festivo.nombre}
      </p>

      <p className="mt-2 text-lg text-muted-foreground">
        <time dateTime={festivo.fecha}>{formatoLargo(festivo.fecha)}</time>
      </p>

      <p className="mt-4 text-2xl font-bold text-festivo">{comoSeDice(dias)}</p>

      {festivo.trasladado && (
        <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
          Se celebra el {formatoLargo(festivo.fechaOriginal!)}, un{" "}
          {nombreDia(festivo.fechaOriginal!)}. La Ley Emiliani traslada el descanso al lunes
          siguiente.
        </p>
      )}
    </div>
  );
}

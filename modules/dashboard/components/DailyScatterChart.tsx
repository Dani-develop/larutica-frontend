"use client";

import { usePreferences } from "@/lib/preferences/Preferences";
import { localeFor } from "@/lib/preferences/format";

type DailyScatterChartProps = {
  points: { day: string; count: number }[];
  title?: string;
  emptyMessage?: string;
  format?: (value: number) => string;
  /** Encabezado de la columna de valores en la tabla accesible. */
  valueLabel?: string;
  /** Fuerza ticks enteros (conteos), p. ej. 0, 2, 4 en lugar de 0, 2,5, 5. */
  integer?: boolean;
};

/** Redondea hacia arriba a 1, 2, 5 × 10^n para que el eje Y tenga cifras limpias. */
function niceCeiling(value: number) {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(value, 1)));
  const step = [1, 2, 5, 10].find((factor) => value <= factor * magnitude) ?? 10;
  return step * magnitude;
}

export function DailyScatterChart({
  points,
  title = "Ingresos cobrados por día",
  emptyMessage = "No hay ingresos cobrados en este período.",
  format = String,
  valueLabel = "Monto",
  integer = false,
}: DailyScatterChartProps) {
  const { t, language } = usePreferences();
  const date = new Intl.DateTimeFormat(localeFor(language), {
    timeZone: "America/Costa_Rica", day: "numeric", month: "short", year: "numeric",
  });
  const label = (day: string) => date.format(new Date(day + "T12:00:00-06:00"));
  const withRevenue = points.filter((point) => point.count > 0);

  if (withRevenue.length === 0) {
    return <p role="status" className="py-8 text-center text-sm text-muted-foreground">{t(emptyMessage)}</p>;
  }

  const peak = Math.max(...withRevenue.map((point) => point.count));
  const rounded = niceCeiling(peak);
  const ceiling = integer ? Math.max(2, Math.ceil(rounded / 2) * 2) : rounded;
  const ticks = [ceiling, ceiling / 2, 0];
  const column = (index: number) => ((index + 0.5) / points.length) * 100;
  const showDay = (index: number) => index === 0 || index === points.length - 1 || (index + 1) % 5 === 0;

  return <figure aria-label={t(title)}>
    <div aria-hidden="true" className="flex gap-2 pb-2 pt-6">
      <div className="relative h-48 w-24 shrink-0">
        {ticks.map((tick) => <span
          key={tick}
          className="absolute right-0 -translate-y-1/2 text-xs tabular-nums text-muted-foreground"
          style={{ top: `${(1 - tick / ceiling) * 100}%` }}
        >{format(tick)}</span>)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative h-48 border-b border-l">
          {ticks.slice(0, -1).map((tick) => <div
            key={tick}
            className="absolute inset-x-0 border-t border-dashed"
            style={{ top: `${(1 - tick / ceiling) * 100}%` }}
          />)}
          {points.map((point, index) => point.count > 0 ? <div
            key={point.day}
            className="absolute bottom-0 -translate-x-1/2"
            style={{ left: `${column(index)}%`, height: `${(point.count / ceiling) * 100}%` }}
            title={label(point.day) + ": " + format(point.count)}
          >
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-primary/30" />
            <div className="absolute left-1/2 top-0 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary shadow-sm" />
            <span className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap text-xs font-medium tabular-nums">{format(point.count)}</span>
          </div> : null)}
        </div>
        <div className="relative mt-1 h-4">
          {points.map((point, index) => showDay(index) ? <span
            key={point.day}
            className="absolute -translate-x-1/2 text-xs tabular-nums text-muted-foreground"
            style={{ left: `${column(index)}%` }}
          >{Number(point.day.slice(-2))}</span> : null)}
        </div>
      </div>
    </div>
    <figcaption className="mt-2 text-xs text-muted-foreground">
      {label(points[0].day) + " – " + label(points[points.length - 1].day)} · {t("America/Costa_Rica")}
    </figcaption>
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-ring">{t("Ver datos de la gráfica")}</summary>
      <table className="mt-2 w-full text-left">
        <caption className="sr-only">{t(title)}</caption>
        <thead><tr><th scope="col">{t("Fecha")}</th><th scope="col">{t(valueLabel)}</th></tr></thead>
        <tbody>{withRevenue.map((point) => <tr key={point.day}>
          <th scope="row" className="font-normal">{label(point.day)}</th><td>{format(point.count)}</td>
        </tr>)}</tbody>
      </table>
    </details>
  </figure>;
}

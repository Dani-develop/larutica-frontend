"use client";

import { usePreferences } from "@/lib/preferences/Preferences";
import { localeFor } from "@/lib/preferences/format";

export function ReservationsBarChart({ bars }: { bars: { day: string; count: number }[] }) {
  const { t, language } = usePreferences();
  const maximum = Math.max(1, ...bars.map(bar => bar.count));
  const date = new Intl.DateTimeFormat(localeFor(language), {
    timeZone: "America/Costa_Rica", day: "numeric", month: "short", year: "numeric",
  });
  const label = (day: string) => date.format(new Date(day + "T12:00:00-06:00"));

  if (!bars.some(bar => bar.count > 0)) {
    return <p role="status" className="py-8 text-center text-sm text-muted-foreground">{t("No hay reservas registradas en este período.")}</p>;
  }

  return <figure aria-label={t("Reservas por fecha de creación")}>
    <div aria-hidden="true" className="overflow-x-auto pb-2">
      <div className="flex h-40 min-w-[30rem] items-end gap-1 border-b pt-4">
        {bars.map(bar => <div key={bar.day} className="flex h-full min-w-0 flex-1 flex-col justify-end text-center" title={label(bar.day) + ": " + bar.count}>
          <span className="text-xs tabular-nums">{bar.count}</span>
          <div className="mx-auto w-full max-w-8 rounded-t bg-primary" style={{ height: `${bar.count / maximum * 80}%` }} />
          <span className="mt-1 text-xs text-muted-foreground">{Number(bar.day.slice(-2))}</span>
        </div>)}
      </div>
    </div>
    <figcaption className="mt-2 text-xs text-muted-foreground">{bars.length > 0 ? label(bars[0].day) + " – " + label(bars[bars.length - 1].day) : ""} · {t("America/Costa_Rica")}</figcaption>
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-ring">{t("Ver datos de la gráfica")}</summary>
      <table className="mt-2 w-full text-left">
        <caption className="sr-only">{t("Reservas por fecha de creación")}</caption>
        <thead><tr><th scope="col">{t("Fecha")}</th><th scope="col">{t("Reservas")}</th></tr></thead>
        <tbody>{bars.map(bar => <tr key={bar.day}><th scope="row" className="font-normal">{label(bar.day)}</th><td>{bar.count}</td></tr>)}</tbody>
      </table>
    </details>
  </figure>;
}

"use client";

import { Download, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeading, SectionHeading } from "@/components/ui/page-heading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePreferences } from "@/lib/preferences/Preferences";
import { useAuth } from "@/modules/auth/context/AuthContext";
import { money } from "@/modules/booking/types";
import { CommissionDialog, SettlementDialog } from "./AgencyDialogs";
import {
  getAdminPayments,
  getAgencyBalances,
  getSettlements,
  type AdminPaymentRow,
  type AgencyBalance,
  type Settlement,
  type SettlementInput,
} from "./admin-payments.service";
import { downloadCsv, toCsv } from "./csv";

const STATUS_LABELS: Record<string, string> = {
  paid: "Pagado",
  refunded: "Reembolsado",
  pending: "Pendiente",
  failed: "Fallido",
  canceled: "Cancelado",
  expired: "Expirado",
};

// Costa Rica no usa horario de verano: UTC−6 todo el año.
const startOfDay = (date: string) => (date ? `${date}T00:00:00-06:00` : undefined);
const startOfNextDay = (date: string) => {
  if (!date) return undefined;
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return `${next.toISOString().slice(0, 10)}T00:00:00-06:00`;
};

type Dialogs = { settle?: { agency: AgencyBalance; kind: SettlementInput["kind"] }; commission?: AgencyBalance };

export function AdminPayments() {
  const { t, dateLabel } = usePreferences();
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const [balances, setBalances] = useState<AgencyBalance[]>([]);
  const [payments, setPayments] = useState<AdminPaymentRow[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [agencyId, setAgencyId] = useState("");
  const [status, setStatus] = useState("paid");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dialogs, setDialogs] = useState<Dialogs>({});
  const detailRef = useRef<HTMLElement>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [nextBalances, nextPayments, nextSettlements] = await Promise.all([
        getAgencyBalances(),
        getAdminPayments({ agencyId, status, from: startOfDay(from), to: startOfNextDay(to) }),
        getSettlements(agencyId || undefined),
      ]);
      setBalances(nextBalances); setPayments(nextPayments); setSettlements(nextSettlements);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos cargar los pagos.");
    } finally { setLoading(false); }
  }, [agencyId, status, from, to]);

  useEffect(() => { if (isAdmin) queueMicrotask(() => { void load(); }); }, [isAdmin, load]);

  const totals = useMemo(() => balances.reduce((sum, row) => ({
    net: sum.net + row.net, commission: sum.commission + row.commission,
    refunded: sum.refunded + row.refunded, balance: sum.balance + row.balance, gross: sum.gross + row.gross,
  }), { net: 0, commission: 0, refunded: 0, balance: 0, gross: 0 }), [balances]);

  function exportPayments() {
    downloadCsv(`pagos-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(
      ["Fecha", "Agencia", "Experiencia", "Viajero", "Correo", "Personas", "Estado", "Cobrado USD", "Reembolsado USD", "Comisión %", "Reserva"],
      payments.map((row) => [row.paidAt ?? row.createdAt, row.agencyName, row.publicationTitle, row.passengerName, row.passengerEmail,
        row.numberOfPeople, STATUS_LABELS[row.status] ?? row.status, row.amount, row.refundedAmount, row.commissionRate, row.reservationId]),
    ));
  }

  if (!isAdmin) {
    return <div className="mx-auto max-w-7xl"><PageHeading title={t("Pagos y liquidaciones")} description={t("Solo los administradores pueden ver esta sección.")} /></div>;
  }

  const summary: Array<[string, number, string]> = [
    [t("Cobrado (neto de reembolsos)"), totals.net, t("Total que entró por reservas, descontando devoluciones.")],
    [t("Comisión de LaRutica"), totals.commission, t("Lo que LaRutica retiene según la comisión de cada agencia.")],
    [t("Reembolsado"), totals.refunded, t("Dinero devuelto a viajeros.")],
    [t("Por pagar a agencias"), totals.balance, t("Saldo pendiente de liquidar a las agencias.")],
  ];

  return <div className="mx-auto max-w-7xl space-y-8">
    <PageHeading
      eyebrow={<p className="mb-2 text-sm font-medium text-primary"><Link href="/dashboard" className="hover:underline">{t("Dashboard")}</Link><span className="text-muted-foreground"> / {t("Pagos")}</span></p>}
      title={t("Pagos y liquidaciones")}
      description={t("Revisa lo cobrado por cada agencia, registra lo que le entregas y ajusta diferencias.")}
      actions={<Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="size-4" aria-hidden="true" />{t("Actualizar")}</Button>}
    />
    {error ? <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm font-medium text-destructive">{t(error)}</p> : null}

    <section aria-label={t("Resumen")} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {summary.map(([label, value, help]) => <Card key={label} className="shadow-xs">
        <CardHeader><CardDescription>{label}</CardDescription><CardTitle className="text-2xl">{loading ? "…" : money(value)}</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">{help}</p></CardContent>
      </Card>)}
    </section>

    <section aria-labelledby="balances-title" className="space-y-3">
      <SectionHeading id="balances-title" title={t("Saldo por agencia")} description={t("Corresponde = cobrado − reembolsos − comisión. Saldo = corresponde + ajustes − pagos entregados.")} />
      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>{t("Agencia")}</TableHead><TableHead className="text-right">{t("Comisión")}</TableHead><TableHead className="text-right">{t("Pagos")}</TableHead>
            <TableHead className="text-right">{t("Cobrado")}</TableHead><TableHead className="text-right">{t("Reembolsado")}</TableHead><TableHead className="text-right">{t("Corresponde")}</TableHead>
            <TableHead className="text-right">{t("Ajustes")}</TableHead><TableHead className="text-right">{t("Entregado")}</TableHead><TableHead className="text-right">{t("Saldo")}</TableHead><TableHead>{t("Acciones")}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {balances.length === 0 ? <TableRow><TableCell colSpan={10} className="py-8 text-center text-muted-foreground">{loading ? t("Cargando…") : t("Todavía no hay cobros registrados.")}</TableCell></TableRow> : null}
            {balances.map((row) => <TableRow key={row.agencyId}>
              <TableCell className="font-medium">{row.agencyName}</TableCell>
              <TableCell className="text-right">{row.commissionRate}%</TableCell>
              <TableCell className="text-right">{row.paymentsCount}</TableCell>
              <TableCell className="text-right">{money(row.gross)}</TableCell>
              <TableCell className="text-right">{money(row.refunded)}</TableCell>
              <TableCell className="text-right">{money(row.owed)}</TableCell>
              <TableCell className="text-right">{money(row.adjustments)}</TableCell>
              <TableCell className="text-right">{money(row.payouts)}</TableCell>
              <TableCell className="text-right font-semibold">{money(row.balance)}</TableCell>
              <TableCell><div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={row.balance <= 0} onClick={() => setDialogs({ settle: { agency: row, kind: "PAYOUT" } })}>{t("Registrar pago")}</Button>
                <Button size="sm" variant="outline" onClick={() => setDialogs({ settle: { agency: row, kind: "ADJUSTMENT" } })}>{t("Ajuste")}</Button>
                <Button size="sm" variant="outline" onClick={() => setDialogs({ commission: row })}>{t("Comisión")}</Button>
                <Button size="sm" variant="ghost" onClick={() => { setAgencyId(row.agencyId); detailRef.current?.scrollIntoView({ behavior: "smooth" }); }}>{t("Ver pagos")}</Button>
              </div></TableCell>
            </TableRow>)}
          </TableBody>
        </Table>
      </div>
    </section>

    <section ref={detailRef} aria-labelledby="payments-title" className="space-y-3 scroll-mt-20">
      <SectionHeading id="payments-title" title={t("Detalle de pagos")} description={t("Quién pagó, cuánto y por qué experiencia.")}
        actions={<Button variant="outline" onClick={exportPayments} disabled={payments.length === 0}><Download className="size-4" aria-hidden="true" />{t("Exportar CSV")}</Button>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-2">
          <Label htmlFor="filter-agency">{t("Agencia")}</Label>
          <Select value={agencyId || "all"} onValueChange={(value) => setAgencyId(value === "all" ? "" : value)}>
            <SelectTrigger id="filter-agency" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">{t("Todas las agencias")}</SelectItem>
              {balances.map((row) => <SelectItem key={row.agencyId} value={row.agencyId}>{row.agencyName}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="filter-status">{t("Estado")}</Label>
          <Select value={status || "all"} onValueChange={(value) => setStatus(value === "all" ? "" : value)}>
            <SelectTrigger id="filter-status" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">{t("Todos los estados")}</SelectItem>
              {Object.entries(STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{t(label)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid gap-2"><Label htmlFor="filter-from">{t("Desde")}</Label><Input id="filter-from" type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} /></div>
        <div className="grid gap-2"><Label htmlFor="filter-to">{t("Hasta")}</Label><Input id="filter-to" type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} /></div>
      </div>
      <p className="text-sm text-muted-foreground" role="status">{payments.length} {t("pagos")}{payments.length >= 500 ? ` · ${t("Se muestran los 500 más recientes; usa los filtros para acotar.")}` : ""}</p>
      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>{t("Fecha")}</TableHead><TableHead>{t("Agencia")}</TableHead><TableHead>{t("Experiencia")}</TableHead><TableHead>{t("Viajero")}</TableHead>
            <TableHead className="text-right">{t("Personas")}</TableHead><TableHead>{t("Estado")}</TableHead><TableHead className="text-right">{t("Cobrado")}</TableHead><TableHead className="text-right">{t("Reembolsado")}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {payments.length === 0 ? <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">{loading ? t("Cargando…") : t("No hay pagos con estos filtros.")}</TableCell></TableRow> : null}
            {payments.map((row) => <TableRow key={row.paymentId}>
              <TableCell>{dateLabel(row.paidAt ?? row.createdAt)}</TableCell>
              <TableCell>{row.agencyName}</TableCell>
              <TableCell>{row.publicationTitle}<span className="block text-xs text-muted-foreground">{t("Salida")}: {dateLabel(row.departureStartAt)}</span></TableCell>
              <TableCell>{row.passengerName}<span className="block text-xs text-muted-foreground">{row.passengerEmail}</span></TableCell>
              <TableCell className="text-right">{row.numberOfPeople}</TableCell>
              <TableCell><Badge variant={row.status === "paid" ? "default" : row.status === "refunded" ? "secondary" : "outline"}>{t(STATUS_LABELS[row.status] ?? row.status)}</Badge></TableCell>
              <TableCell className="text-right">{money(row.amount)}</TableCell>
              <TableCell className="text-right">{row.refundedAmount ? money(row.refundedAmount) : "—"}</TableCell>
            </TableRow>)}
          </TableBody>
        </Table>
      </div>
    </section>

    <section aria-labelledby="settlements-title" className="space-y-3">
      <SectionHeading id="settlements-title" title={t("Pagos entregados y ajustes")} description={agencyId ? t("Movimientos de la agencia seleccionada.") : t("Movimientos de todas las agencias.")} />
      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>{t("Fecha")}</TableHead><TableHead>{t("Agencia")}</TableHead><TableHead>{t("Tipo")}</TableHead><TableHead className="text-right">{t("Monto")}</TableHead>
            <TableHead>{t("Método")}</TableHead><TableHead>{t("Referencia")}</TableHead><TableHead>{t("Nota")}</TableHead><TableHead>{t("Registró")}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {settlements.length === 0 ? <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">{loading ? t("Cargando…") : t("Todavía no hay movimientos.")}</TableCell></TableRow> : null}
            {settlements.map((row) => <TableRow key={row.id}>
              <TableCell>{row.occurredOn}</TableCell><TableCell>{row.agencyName}</TableCell>
              <TableCell><Badge variant={row.kind === "PAYOUT" ? "default" : "outline"}>{row.kind === "PAYOUT" ? t("Pago") : t("Ajuste")}</Badge></TableCell>
              <TableCell className="text-right">{money(row.amount)}</TableCell>
              <TableCell>{row.method ?? "—"}</TableCell><TableCell>{row.reference ?? "—"}</TableCell><TableCell className="max-w-xs whitespace-normal">{row.notes ?? "—"}</TableCell><TableCell>{row.createdBy ?? "—"}</TableCell>
            </TableRow>)}
          </TableBody>
        </Table>
      </div>
    </section>

    <SettlementDialog agency={dialogs.settle?.agency ?? null} initialKind={dialogs.settle?.kind ?? "PAYOUT"} onClose={() => setDialogs({})} onSaved={() => { setDialogs({}); void load(); }} />
    <CommissionDialog agency={dialogs.commission ?? null} onClose={() => setDialogs({})} onSaved={() => { setDialogs({}); void load(); }} />
  </div>;
}

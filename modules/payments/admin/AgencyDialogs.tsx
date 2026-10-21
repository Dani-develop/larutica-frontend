"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { usePreferences } from "@/lib/preferences/Preferences";
import { money } from "@/modules/booking/types";
import { patchAgencyCommission, postSettlement, type AgencyBalance, type SettlementInput } from "./admin-payments.service";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Costa_Rica" }).format(new Date());

type DialogProps = {
  agency: AgencyBalance | null;
  onClose: () => void;
  onSaved: () => void;
};

export function SettlementDialog({ agency, initialKind, onClose, onSaved }: DialogProps & { initialKind: SettlementInput["kind"] }) {
  const { t } = usePreferences();
  return <Dialog open={!!agency} onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent>
      {agency ? <SettlementForm key={`${agency.agencyId}:${initialKind}`} agency={agency} initialKind={initialKind} onClose={onClose} onSaved={onSaved} t={t} /> : null}
    </DialogContent>
  </Dialog>;
}

function SettlementForm({ agency, initialKind, onClose, onSaved, t }: {
  agency: AgencyBalance; initialKind: SettlementInput["kind"]; onClose: () => void; onSaved: () => void; t: (text: string) => string;
}) {
  const [kind, setKind] = useState<SettlementInput["kind"]>(initialKind);
  const [amount, setAmount] = useState(initialKind === "PAYOUT" && agency.balance > 0 ? agency.balance.toFixed(2) : "");
  const [occurredOn, setOccurredOn] = useState(today());
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = Number(amount);
    if (!amount.trim() || !Number.isFinite(value) || value === 0) { setError("Indica un monto válido."); return; }
    setBusy(true); setError("");
    try {
      await postSettlement({ agencyId: agency.agencyId, kind, amount: value, occurredOn, method, reference, notes });
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos guardar el movimiento.");
    } finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="grid gap-4">
    <div>
      <DialogTitle>{kind === "PAYOUT" ? t("Registrar pago a la agencia") : t("Registrar ajuste")}</DialogTitle>
      <DialogDescription>{agency.agencyName} · {t("Saldo pendiente:")} {money(agency.balance)}</DialogDescription>
    </div>
    <div className="grid gap-2">
      <Label htmlFor="settlement-kind">{t("Tipo de movimiento")}</Label>
      <Select value={kind} onValueChange={(value) => setKind(value as SettlementInput["kind"])}>
        <SelectTrigger id="settlement-kind" className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="PAYOUT">{t("Pago entregado a la agencia")}</SelectItem>
          <SelectItem value="ADJUSTMENT">{t("Ajuste (corrige lo que se le debe)")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div className="grid gap-2">
      <Label htmlFor="settlement-amount">{kind === "PAYOUT" ? t("Monto pagado (USD)") : t("Monto del ajuste (USD)")}</Label>
      <Input id="settlement-amount" inputMode="decimal" type="number" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required aria-describedby="settlement-amount-help" />
      <p id="settlement-amount-help" className="text-sm text-muted-foreground">
        {kind === "PAYOUT" ? t("No puede superar el saldo pendiente.") : t("Positivo aumenta lo que se le debe a la agencia; negativo lo reduce.")}
      </p>
    </div>
    <div className="grid gap-2">
      <Label htmlFor="settlement-date">{t("Fecha")}</Label>
      <Input id="settlement-date" type="date" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} required />
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor="settlement-method">{t("Método (opcional)")}</Label>
        <Input id="settlement-method" value={method} maxLength={60} placeholder="SINPE, transferencia…" onChange={(event) => setMethod(event.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="settlement-reference">{t("Referencia (opcional)")}</Label>
        <Input id="settlement-reference" value={reference} maxLength={120} onChange={(event) => setReference(event.target.value)} />
      </div>
    </div>
    <div className="grid gap-2">
      <Label htmlFor="settlement-notes">{kind === "ADJUSTMENT" ? t("Motivo del ajuste") : t("Nota (opcional)")}</Label>
      <Textarea id="settlement-notes" value={notes} maxLength={500} required={kind === "ADJUSTMENT"} onChange={(event) => setNotes(event.target.value)} />
    </div>
    {error ? <p role="alert" className="text-sm font-medium text-destructive">{t(error)}</p> : null}
    <p className="text-sm text-muted-foreground">{t("Los movimientos no se pueden borrar: si te equivocas, registra un ajuste.")}</p>
    <div className="flex flex-wrap justify-end gap-2">
      <Button type="button" variant="outline" disabled={busy} onClick={onClose}>{t("Cancelar")}</Button>
      <Button type="submit" disabled={busy}>{busy ? t("Guardando…") : t("Guardar movimiento")}</Button>
    </div>
  </form>;
}

export function CommissionDialog({ agency, onClose, onSaved }: DialogProps) {
  const { t } = usePreferences();
  return <Dialog open={!!agency} onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent>
      {agency ? <CommissionForm key={agency.agencyId} agency={agency} onClose={onClose} onSaved={onSaved} t={t} /> : null}
    </DialogContent>
  </Dialog>;
}

function CommissionForm({ agency, onClose, onSaved, t }: { agency: AgencyBalance; onClose: () => void; onSaved: () => void; t: (text: string) => string }) {
  const [rate, setRate] = useState(String(agency.commissionRate));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = Number(rate);
    if (!rate.trim() || !Number.isFinite(value) || value < 0 || value > 100) { setError("La comisión debe estar entre 0 y 100."); return; }
    setBusy(true); setError("");
    try {
      await patchAgencyCommission(agency.agencyId, value);
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos guardar la comisión.");
    } finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="grid gap-4">
    <div>
      <DialogTitle>{t("Comisión de LaRutica")}</DialogTitle>
      <DialogDescription>{agency.agencyName}</DialogDescription>
    </div>
    <div className="grid gap-2">
      <Label htmlFor="commission-rate">{t("Porcentaje que retiene LaRutica (%)")}</Label>
      <Input id="commission-rate" type="number" inputMode="decimal" min="0" max="100" step="0.01" value={rate} onChange={(event) => setRate(event.target.value)} required aria-describedby="commission-help" />
      <p id="commission-help" className="text-sm text-muted-foreground">{t("Se aplica solo a los cobros que se creen desde ahora. Los cobros anteriores conservan la comisión con la que se cobraron.")}</p>
    </div>
    {error ? <p role="alert" className="text-sm font-medium text-destructive">{t(error)}</p> : null}
    <div className="flex flex-wrap justify-end gap-2">
      <Button type="button" variant="outline" disabled={busy} onClick={onClose}>{t("Cancelar")}</Button>
      <Button type="submit" disabled={busy}>{busy ? t("Guardando…") : t("Guardar comisión")}</Button>
    </div>
  </form>;
}

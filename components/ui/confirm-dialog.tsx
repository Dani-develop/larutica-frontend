"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { usePreferences } from "@/lib/preferences/Preferences";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  pendingLabel?: string;
  cancelLabel?: string;
  /** Botón de confirmación en rojo. Por defecto `true`; usar `false` para acciones no destructivas. */
  destructive?: boolean;
  /**
   * Acción a ejecutar. Si devuelve una promesa, el diálogo queda abierto y bloqueado hasta que termine.
   * Si lanza un error, el mensaje se muestra dentro del diálogo (sustituye a `window.alert`) y se puede reintentar.
   */
  onConfirm: () => void | Promise<void>;
};

/** Confirmación modal sobre `Dialog`. Sustituye a `window.confirm` y `window.alert`. */
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pendingLabel,
  cancelLabel,
  destructive = true,
  onConfirm,
}: ConfirmDialogProps) {
  const { t } = usePreferences();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (pending) return;
    if (!next) setError(null);
    onOpenChange(next);
  }

  async function handleConfirm() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (confirmError) {
      setError(confirmError instanceof Error && confirmError.message ? confirmError.message : t("No se pudo completar la acción."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        aria-busy={pending}
        onOpenAutoFocus={(event) => {
          // El foco inicial va a «Cancelar»: una pulsación accidental de Enter no ejecuta la acción.
          event.preventDefault();
          (event.currentTarget as HTMLElement).querySelector<HTMLElement>("[data-confirm-cancel]")?.focus();
        }}
      >
        <DialogTitle>{title}</DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={pending} data-confirm-cancel onClick={() => handleOpenChange(false)}>
            {cancelLabel ?? t("Cancelar")}
          </Button>
          <Button type="button" variant={destructive ? "destructive" : "default"} disabled={pending} onClick={() => void handleConfirm()}>
            {pending ? (pendingLabel ?? t("Procesando...")) : (confirmLabel ?? t("Confirmar"))}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { ConfirmDialog };
export type { ConfirmDialogProps };

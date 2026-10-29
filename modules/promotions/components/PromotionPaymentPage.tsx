"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useDashboardRole } from "@/components/dashboard/dashboard-role-context";
import { DashboardSectionPage } from "@/components/dashboard/DashboardSectionPage";
import { PageHeading } from "@/components/ui/page-heading";
import { dateFormatter } from "@/lib/preferences/format";
import { usePreferences } from "@/lib/preferences/Preferences";
import { OnvoPaymentForm } from "@/modules/payments/components/OnvoPaymentForm";
import { confirmPromotionPayment, startPromotionPayment } from "@/modules/payments/services/payment.service";
import { usePublications } from "@/modules/publications/hooks/usePublications";
import { isPromotionActive } from "@/lib/promotions/window";

export function PromotionPaymentPage({ publicationId }: { publicationId: string }) {
  const { role } = useDashboardRole();
  if (role !== "Agencia") {
    return (
      <DashboardSectionPage
        title="Promociones"
        description="Consulta y gestiona servicios destacados."
      />
    );
  }
  return <PromotionCheckout publicationId={publicationId} />;
}

function PromotionCheckout({ publicationId }: { publicationId: string }) {
  const { t, language } = usePreferences();
  const { publications, loading, error, reload } = usePublications();
  const formatDate = dateFormatter(language);
  const [paid, setPaid] = useState(false);
  const publication = publications.find((item) => item.id === publicationId);
  const active = publication?.promotedUntil && isPromotionActive(publication.promotedUntil, Date.now());
  const start = useCallback(() => startPromotionPayment(publicationId), [publicationId]);
  const confirm = useCallback(
    (paymentIntentId: string) => confirmPromotionPayment(publicationId, paymentIntentId),
    [publicationId],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeading
        title={t("Pagar promoción")}
        description={t("12 USD por 7 días. La promoción cubre todas las fechas de salida de esta publicación.")}
        eyebrow={
          <p className="mb-2 text-sm font-medium text-primary">
            <Link href="/dashboard/promotions" className="hover:underline">{t("Promociones")}</Link>
            <span className="text-muted-foreground"> / {publication?.title ?? t("Publicación")}</span>
          </p>
        }
      />
      {loading ? <p className="text-sm text-muted-foreground">{t("Cargando publicaciones...")}</p> : null}
      {error ? <p className="text-sm text-destructive" role="alert">{t(error)}</p> : null}
      {!loading && !publication ? <p className="text-sm text-muted-foreground">{t("La publicación no existe.")}</p> : null}
      {publication && publication.status !== "APPROVED" && !paid ? (
        <p className="text-sm text-muted-foreground">{t("Solo puedes promocionar una publicación aprobada.")}</p>
      ) : null}
      {publication && active && !paid ? (
        <p className="text-sm font-medium">{t("Esta publicación ya está promocionada.")} {t("Promocionada hasta")} {formatDate(publication.promotedUntil!)}</p>
      ) : null}
      {paid ? (
        <p className="text-sm font-medium" role="status">{t("Pago aceptado. Tu publicación queda promocionada por 7 días.")}</p>
      ) : null}
      {publication && publication.status === "APPROVED" && !active && !paid ? (
        <OnvoPaymentForm
          startKey={publicationId}
          start={start}
          confirm={confirm}
          onPaid={() => { setPaid(true); void reload(); }}
        />
      ) : null}
      <p>
        <Link href="/dashboard/promotions" className="text-sm font-medium text-primary hover:underline">{t("Volver a promociones")}</Link>
      </p>
    </div>
  );
}
